import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const r = [];
for (const [width, height] of [
  [320, 568],
  [844, 390],
  [390, 350],
  [640, 450],
]) {
  const c = await b.newContext({
    viewport: { width, height },
    hasTouch: true,
    isMobile: true,
  });
  const p = await c.newPage();
  p.setDefaultTimeout(5000);
  await p.goto(
    process.env.AUDIT_PRODUCTION_URL || 'http://localhost:8788/RoomPlaner',
  );
  await p.waitForSelector('canvas');
  await p.getByRole('button', { name: 'Settings', exact: true }).tap();
  const geometry = await p.getByRole('dialog').evaluate((d) => ({
    rect: d.getBoundingClientRect().toJSON(),
    scrollHeight: d.scrollHeight,
    clientHeight: d.clientHeight,
    overflow: getComputedStyle(d).overflowY,
    buttons: [...d.querySelectorAll('button')].map((b) => ({
      text: b.innerText,
      aria: b.getAttribute('aria-label'),
      rect: b.getBoundingClientRect().toJSON(),
    })),
  }));
  await p.screenshot({ path: `${out}/settings-${width}x${height}.png` });
  r.push({ width, height, geometry });
}
await fs.writeFile(`${out}/layout-edges.json`, JSON.stringify(r, null, 2));
console.log(
  JSON.stringify(
    r.map((x) => ({
      width: x.width,
      height: x.height,
      rect: x.geometry.rect,
      overflow: x.geometry.overflow,
    })),
    null,
    2,
  ),
);
await b.close();
