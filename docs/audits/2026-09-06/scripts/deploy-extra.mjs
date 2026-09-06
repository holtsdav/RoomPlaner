import fs from 'node:fs/promises';
const url = 'http://localhost:8789/dev/RoomPlaner/__login';
const tests = [];
for (const [name, headers, body] of [
  [
    'wrong-content',
    { Origin: 'http://localhost:8789', 'Content-Type': 'application/json' },
    '{}',
  ],
  [
    'oversized',
    {
      Origin: 'http://localhost:8789',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    'password=' + 'x'.repeat(2050),
  ],
  [
    'null-origin',
    { Origin: 'null', 'Content-Type': 'application/x-www-form-urlencoded' },
    'password=x',
  ],
]) {
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body,
    redirect: 'manual',
  });
  tests.push({ name, status: r.status });
}
await fs.writeFile(
  '/tmp/roomplanner-release-evidence/deploy-extra.json',
  JSON.stringify(tests, null, 2),
);
console.log(tests);
