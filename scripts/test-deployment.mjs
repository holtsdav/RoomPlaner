import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN ?? 'http://localhost:8787';
const testPassword = process.env.TEST_PASSWORD;
assert.ok(testPassword, 'Set TEST_PASSWORD to the local Worker password');
const base = '/dev/RoomPlaner';
const url = `${origin}${base}`;
const get = (path = '', cookie = '') =>
  fetch(url + path, { headers: { Cookie: cookie }, redirect: 'manual' });
const login = (password, ip = '192.0.2.1', requestOrigin = origin) =>
  fetch(`${url}/__login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Origin: requestOrigin,
      'Content-Type': 'application/x-www-form-urlencoded',
      'CF-Connecting-IP': ip,
    },
    body: new URLSearchParams({ password }),
  });
const loginResponse = await get();
assert.equal(loginResponse.status, 401);
// no-referrer makes native form POSTs send Origin: null in browsers.
assert.equal(loginResponse.headers.get('referrer-policy'), 'same-origin');
assert.equal((await get('/planner')).status, 401);
assert.equal((await get('/assets/not-real.js')).status, 401);
assert.equal((await get('', '__Secure-roomplaner-dev=forged')).status, 401);
assert.equal(
  (await login('wrong', undefined, 'https://evil.example')).status,
  403,
);
assert.equal((await login('wrong')).status, 401);
const signedIn = await login(testPassword);
assert.equal(signedIn.status, 303);
const cookieHeader = signedIn.headers.get('set-cookie');
assert.match(cookieHeader, /HttpOnly; Secure; SameSite=Strict/);
const cookie = cookieHeader.split(';')[0];
const home = await get('', cookie);
assert.equal(home.status, 200);
assert.equal(home.headers.get('cache-control'), 'private, no-store');
const html = await home.text();
const assets = [
  ...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css|woff2))"/g),
].map((match) => match[1]);
assert.ok(assets.length > 0, 'page must reference built assets');
for (const path of assets) {
  assert.ok(path.startsWith(base + '/'), `asset escaped base path: ${path}`);
  const asset = await fetch(origin + path, {
    headers: { Cookie: cookie },
    redirect: 'manual',
  });
  assert.equal(asset.status, 200, path);
  assert.notEqual(
    asset.headers.get('content-type')?.split(';')[0],
    'text/html',
    path,
  );
  assert.equal(
    (await fetch(origin + path)).status,
    401,
    `asset bypass: ${path}`,
  );
}
const planner = await get('/planner', cookie);
assert.equal(planner.status, 307);
assert.equal(planner.headers.get('location'), base + '/');
assert.equal((await fetch(origin + base + 'Other')).status, 404);
for (let i = 0; i < 3; i++) assert.equal((await login('wrong')).status, 401);
assert.equal((await login(testPassword)).status, 429);
for (let i = 0; i < 5; i++)
  assert.equal((await login('wrong', '192.0.2.2')).status, 401);
assert.equal((await login(testPassword, '192.0.2.3')).status, 429);
assert.equal(
  (await get('', cookie)).status,
  200,
  'existing sessions survive login throttling',
);
console.log(
  'PASS: authentication, CSRF, private assets, base paths, sessions, per-IP and global throttling',
);
