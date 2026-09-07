import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const r = {};
const c = await b.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
async function init() {
  const p = await c.newPage();
  await p.goto(process.env.AUDIT_SOURCE_URL || 'http://localhost:3011');
  await p.waitForSelector('canvas');
  await p.evaluate(async () => {
    window.q = {
      s: (await import('/features/editor/state/planner-store.ts'))
        .usePlannerStore,
      p: await import('/features/editor/domain/plan-document.ts'),
      repo: await import('/features/editor/persistence/local-plan-repository.ts'),
      local: await import('/features/editor/ui/use-local-plan.ts'),
      k: { default: window.Konva },
    };
  });
  return p;
}
const p = await init();
r.fresh = await p.evaluate(async () => ({
  status: q.s.getState().saveStatus,
  rooms: (await q.repo.listLocalPlans()).length,
}));
await p.getByRole('button', { name: 'Open object library', exact: true }).tap();
await p.locator('summary:visible').filter({ hasText: 'Placed in room' }).tap();
await p.getByRole('button', { name: /Three-seat sofa/ }).tap();
await p.getByRole('button', { name: 'Open object library', exact: true }).tap();
await p.locator('summary:visible').filter({ hasText: 'Placed in room' }).tap();
await p.getByRole('button', { name: /Round table/ }).tap();
r.touchSelection = await p.evaluate(() => q.s.getState().selectedIds);
const cdp = await c.newCDPSession(p);
const loc = await p.locator('#planner-canvas').boundingBox();
const point = { x: loc.x + 20, y: loc.y + 130 };
const panBefore = await p.evaluate(() => ({
  x: q.k.default.stages[0].x(),
  y: q.k.default.stages[0].y(),
}));
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ ...point, id: 1 }],
});
for (let i = 1; i <= 5; i++)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: point.x + (40 * i) / 5, y: point.y + (70 * i) / 5, id: 1 },
    ],
  });
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchEnd',
  touchPoints: [],
});
r.pan = {
  before: panBefore,
  after: await p.evaluate(() => ({
    x: q.k.default.stages[0].x(),
    y: q.k.default.stages[0].y(),
  })),
};
await p.evaluate(async () => {
  q.s.getState().selectObject('sofa-1');
  q.s.getState().nudgeSelection({ x: 50, y: 0 });
  await q.local.flushLocalPlan();
});
const p2 = await init();
await p.evaluate(async () => {
  q.s.getState().nudgeSelection({ x: 50, y: 0 });
  await q.local.flushLocalPlan();
});
await p2.evaluate(async () => {
  q.s.getState().selectObject('sofa-1');
  q.s.getState().nudgeSelection({ x: 0, y: 50 });
  try {
    await q.local.flushLocalPlan();
  } catch {}
});
r.conflictBefore = {
  buttons: await p2
    .getByRole('button', { name: 'Save a copy', exact: true })
    .count(),
  state: await p2.evaluate(() => ({
    status: q.s.getState().saveStatus,
    error: q.s.getState().saveError,
  })),
};
await p2.waitForTimeout(8500);
r.conflictAfter = {
  buttons: await p2
    .getByRole('button', { name: 'Save a copy', exact: true })
    .count(),
  state: await p2.evaluate(() => ({
    status: q.s.getState().saveStatus,
    error: q.s.getState().saveError,
  })),
};
await p2.screenshot({ path: `${out}/conflict-after-timeout.png` });
// Refreshing the room menu observes revisions without replacing either tab's unsaved document.
r.persisted = await p.evaluate(async () => ({
  rooms: (await q.repo.listLocalPlans()).map((d) => ({
    id: d.id,
    x: d.objects[0].positionMm.x,
    y: d.objects[0].positionMm.y,
  })),
}));
await fs.writeFile(`${out}/persistence-touch.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
await b.close();
