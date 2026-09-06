import { DurableObject } from 'cloudflare:workers';
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';

const WINDOW = 15 * 60 * 1000;
const SESSION = 8 * 60 * 60 * 1000;
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const digest = (value: string) => createHash('sha256').update(value).digest();

// One coordinator for this shared password, so rotating IPs or datacenters
// cannot reset the account-wide attempt limit. No app traffic is stored here.
export class LoginGuard extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS attempts (ip TEXT, expires INTEGER);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, password TEXT, expires INTEGER);
    `);
  }

  login(ip: string, supplied: string, password: string) {
    const sql = this.ctx.storage.sql;
    const now = Date.now();
    sql.exec('DELETE FROM attempts WHERE expires <= ?', now);
    sql.exec('DELETE FROM sessions WHERE expires <= ?', now);
    const total = sql
      .exec<{ count: number }>('SELECT count(*) AS count FROM attempts')
      .one().count;
    const personal = sql
      .exec<{ count: number }>(
        'SELECT count(*) AS count FROM attempts WHERE ip = ?',
        ip,
      )
      .one().count;
    if (total >= 10 || personal >= 5) return { status: 429, token: '' };
    // Synchronous storage reserves each attempt before verification, including
    // concurrent requests. A successful login also consumes an attempt.
    sql.exec('INSERT INTO attempts VALUES (?, ?)', ip, now + WINDOW);
    if (!timingSafeEqual(digest(supplied), digest(password)))
      return { status: 401, token: '' };
    const token = hex(randomBytes(32));
    sql.exec(
      'INSERT INTO sessions VALUES (?, ?, ?)',
      hex(digest(token)),
      hex(digest(password)),
      now + SESSION,
    );
    return { status: 200, token };
  }

  valid(token: string, password: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    return (
      this.ctx.storage.sql
        .exec(
          'SELECT token FROM sessions WHERE token = ? AND password = ? AND expires > ?',
          hex(digest(token)),
          hex(digest(password)),
          Date.now(),
        )
        .toArray().length === 1
    );
  }
}
