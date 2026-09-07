import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const p = await b.newPage();
await p.goto(process.env.AUDIT_SOURCE_URL || 'http://localhost:3011');
await p.waitForSelector('canvas');
const r = await p.evaluate(async () => {
  const m = await import('/features/editor/domain/plan-document.ts'),
    store = (await import('/features/editor/state/planner-store.ts'))
      .usePlannerStore,
    files = await import('/features/editor/domain/room-files.ts'),
    place = await import('/features/editor/domain/placement.ts');
  window.store = store;
  const d = m.createStarterPlan();
  let start = performance.now();
  const n = 30000;
  const txt = JSON.stringify({
    ...d,
    room: {
      ...d.room,
      boundary: Array.from({ length: n }, (_, i) => ({
        x: Math.round(1e7 * Math.cos((i * 2 * Math.PI) / n)),
        y: Math.round(1e7 * Math.sin((i * 2 * Math.PI) / n)),
      })),
    },
  });
  start = performance.now();
  const valid = files.parseRoomFile(txt);
  const parsed = {
    vertices: n,
    bytes: txt.length,
    ms: performance.now() - start,
    accepted: valid.length === 1,
  };
  return {
    parse: parsed,
    rotatableFit: {
      roomInside: '1000 x 2000',
      preset: '1500 x 800',
      result: place.findPresetPosition(
        {
          ...d,
          room: {
            ...d.room,
            boundary: [
              { x: 0, y: 0 },
              { x: 1120, y: 0 },
              { x: 1120, y: 2120 },
              { x: 0, y: 2120 },
            ],
          },
        },
        { ...d.objects[0], widthMm: 1500, depthMm: 800 },
      ),
    },
  };
});
await p.evaluate(() => store.getState().selectObject('sofa-1'));
await p.waitForTimeout(200);
const input = p.getByRole('textbox', {
  name: 'Object width in cm',
  exact: true,
});
if (await input.isVisible()) {
  await input.fill('1,5');
  r.commaDuring = {
    aria: await input.getAttribute('aria-invalid'),
    value: await input.inputValue(),
  };
  await input.press('Enter');
  r.commaAfter = {
    value: await input.inputValue(),
    width: await p.evaluate(() => store.getState().document.objects[0].widthMm),
  };
}
await fs.writeFile(`${out}/final-probes.json`, JSON.stringify(r, null, 2));
console.log(r);
await b.close();
