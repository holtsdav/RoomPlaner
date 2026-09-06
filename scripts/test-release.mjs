import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { testDevelopmentGate } from './test-deployment.mjs';

async function run(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  const [code] = await once(child, 'exit');
  if (code !== 0)
    throw new Error(`${command} ${args.join(' ')} failed (${code})`);
}
for (const target of ['production', 'develop']) {
  await run('npm', ['run', `build:${target}`]);
  const state = await mkdtemp(join(tmpdir(), 'roomplanner-release-'));
  const testPassword = crypto.randomUUID();
  const vars = 'dist/server/.dev.vars';
  if (target === 'develop')
    await writeFile(vars, `DEV_PASSWORD=${testPassword}\n`, { mode: 0o600 });
  const server = spawn(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'dev',
      '--config',
      'dist/server/wrangler.json',
      '--port',
      '8791',
      '--persist-to',
      state,
    ],
    {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_WRITE_LOGS: 'false',
      },
    },
  );
  let serverLog = '';
  server.stdout.on('data', (data) => {
    serverLog += data;
  });
  server.stderr.on('data', (data) => {
    serverLog += data;
  });
  const origin = 'http://localhost:8791';
  const base = target === 'develop' ? '/dev/RoomPlaner' : '/RoomPlaner';
  try {
    let response;
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        response = await fetch(origin + base);
        if (response.status === (target === 'develop' ? 401 : 200)) break;
      } catch {
        /* Starting workerd. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(
      response?.status,
      target === 'develop' ? 401 : 200,
      'Worker did not start',
    );
    const cookie =
      target === 'develop'
        ? await testDevelopmentGate(origin, testPassword)
        : '';
    const html = await fetch(origin + base, { headers: { Cookie: cookie } });
    assert.equal(html.status, 200);
    assert.equal(html.headers.get('x-frame-options'), 'DENY');
    assert.equal(html.headers.get('x-content-type-options'), 'nosniff');
    const csp = html.headers.get('content-security-policy');
    assert.match(csp, /script-src 'self' 'nonce-[a-z0-9]+'/);
    assert.match(csp, /frame-ancestors 'none'/);
    const body = await html.text();
    const nonce = csp.match(/'nonce-([^']+)'/)[1];
    assert.ok(
      [...body.matchAll(/<script\b[^>]*>/g)].every(([tag]) =>
        tag.includes(`nonce="${nonce}"`),
      ),
      'SSR scripts need matching nonces',
    );
    await run('npm', ['run', 'test:browser'], {
      TEST_ORIGIN: origin,
      TEST_BASE_PATH: base,
      TEST_COOKIE: cookie,
    });
    console.log(
      `PASS: ${target} compiled Worker and desktop/mobile browser regressions`,
    );
  } catch (error) {
    console.error(serverLog.replaceAll(testPassword, '[local test password]'));
    throw error;
  } finally {
    try {
      if (server.pid) process.kill(-server.pid, 'SIGTERM');
    } catch {
      /* Already stopped. */
    }
    await rm(vars, { force: true });
    await rm(state, { recursive: true, force: true });
  }
}
