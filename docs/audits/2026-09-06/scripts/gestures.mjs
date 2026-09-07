import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const c = await b.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const p = await c.newPage();
await p.goto(process.env.AUDIT_SOURCE_URL || 'http://localhost:3011');
await p.waitForSelector('canvas');
await p.waitForTimeout(300);
const cdp = await c.newCDPSession(p);
const state = () =>
  p.evaluate(() => ({
    x: Konva.stages[0].x(),
    y: Konva.stages[0].y(),
    scale: Konva.stages[0].scaleX(),
    objects: Konva.stages[0]
      .find('.touch-object')
      .map((n) => ({ id: n.id(), x: n.x(), y: n.y() })),
  }));
const gesture = async (start, end) => {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: start,
  });
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: start.map((v, j) => ({
        ...v,
        x: v.x + ((end[j].x - v.x) * i) / 6,
        y: v.y + ((end[j].y - v.y) * i) / 6,
      })),
    });
    await p.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await p.waitForTimeout(80);
};
const r = {};
r.panBefore = await state();
await gesture([{ x: 30, y: 240, id: 1 }], [{ x: 70, y: 280, id: 1 }]);
r.panAfter = await state();
const obj = await p.evaluate(() => {
  const s = Konva.stages[0],
    o = s.findOne('#sofa-1'),
    v = o.getAbsolutePosition(),
    r = s.container().getBoundingClientRect();
  return { x: r.x + v.x, y: r.y + v.y };
});
await gesture([{ ...obj, id: 1 }], [{ x: obj.x + 30, y: obj.y + 30, id: 1 }]);
r.dragAfter = await state();
await gesture(
  [
    { x: 90, y: 550, id: 1 },
    { x: 250, y: 550, id: 2 },
  ],
  [
    { x: 60, y: 550, id: 1 },
    { x: 280, y: 550, id: 2 },
  ],
);
r.pinchAfter = await state();
r.errors = [];
await fs.writeFile(`${out}/gestures.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
await b.close();
