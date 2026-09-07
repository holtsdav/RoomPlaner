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
async function page(init) {
  const c = await b.newContext();
  if (init) await c.addInitScript(init);
  const p = await c.newPage();
  p.setDefaultTimeout(7000);
  return p;
}
const denied = await page(() => {
  Object.defineProperty(window, 'localStorage', {
    get() {
      throw new DOMException('Storage blocked', 'SecurityError');
    },
  });
});
r.storageDenied = { errors: [] };
denied.on('pageerror', (e) => r.storageDenied.errors.push(e.message));
await denied.goto(
  process.env.AUDIT_PRODUCTION_URL || 'http://localhost:8788/RoomPlaner',
);
await denied.waitForTimeout(1500);
r.storageDenied.canvas = await denied.locator('canvas').count();
r.storageDenied.body = await denied.locator('body').innerText();
await denied.screenshot({ path: `${out}/storage-denied.png` });
const p = await page();
await p.goto(process.env.AUDIT_SOURCE_URL || 'http://localhost:3011');
await p.waitForSelector('canvas');
await p.evaluate(async () => {
  window.a = {
    s: (await import('/features/editor/state/planner-store.ts'))
      .usePlannerStore,
    p: await import('/features/editor/domain/plan-document.ts'),
    repo: await import('/features/editor/persistence/local-plan-repository.ts'),
    cmd: await import('/features/editor/domain/commands.ts'),
    m: await import('/features/editor/domain/room-measurements.ts'),
    place: await import('/features/editor/domain/placement.ts'),
  };
});
r.schema = await p.evaluate(() => {
  const { p, m } = a;
  const base = p.createStarterPlan();
  return {
    huge: p.planDocumentSchema.safeParse({
      ...base,
      room: {
        ...base.room,
        boundary: [
          { x: 0, y: 0 },
          { x: 1e12, y: 0 },
          { x: 1e12, y: 3600 },
          { x: 0, y: 3600 },
        ],
      },
    }).success,
    collapsedInside: p.planDocumentSchema.safeParse({
      ...base,
      room: { ...base.room, wallThicknessMm: 10000 },
    }).success,
    collapsedBounds: m.insideRoomBounds({
      ...base.room,
      wallThicknessMm: 10000,
    }),
    longNames: p.planDocumentSchema.safeParse({
      ...base,
      name: 'x'.repeat(1000000),
    }).success,
  };
});
r.exactFit = await p.evaluate(() => {
  const { p, place } = a;
  const d = p.createStarterPlan();
  d.room.boundary = [
    { x: 0, y: 0 },
    { x: 2120, y: 0 },
    { x: 2120, y: 2120 },
    { x: 0, y: 2120 },
  ];
  return {
    roomInside: 2000,
    objectWidth: 2000,
    position: place.findPresetPosition(d, {
      ...d.objects[0],
      widthMm: 2000,
      depthMm: 1000,
    }),
  };
});
await p.evaluate(() => {
  a.s.getState().selectObject('sofa-1');
  a.s.getState().nudgeSelection({ x: 50, y: 0 });
});
await p.getByRole('button', { name: /Room menu for/ }).click();
await p.getByRole('menuitem', { name: 'Rename room', exact: true }).click();
await p
  .getByRole('textbox', { name: 'Room name', exact: true })
  .fill('Draft renamed room');
r.undoBefore = await p.evaluate(() => ({
  x: a.s.getState().document.objects[0].positionMm.x,
  past: a.s.getState().past.length,
}));
await p.keyboard.press('Meta+z');
r.undoAfter = await p.evaluate(() => ({
  x: a.s.getState().document.objects[0].positionMm.x,
  past: a.s.getState().past.length,
  text: document.querySelector('#rename-room')?.value,
}));
await p.keyboard.press('Escape');
await p.evaluate(() =>
  a.s.setState({
    saveStatus: 'error',
    saveError: 'Synthetic storage conflict: preserve edits',
  }),
);
r.errorInitially = await p
  .getByRole('button', { name: 'Save a copy', exact: true })
  .count();
await p.waitForTimeout(8300);
r.errorAfter8s = {
  buttons: await p
    .getByRole('button', { name: 'Save a copy', exact: true })
    .count(),
  status: await p.evaluate(() => a.s.getState().saveStatus),
};
r.notPersistedFresh = await p.evaluate(async () => {
  const d = a.p.createStarterPlan();
  d.id = 'fresh-observation';
  const req = indexedDB.open('room-planner');
  const db = await new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  const tx = db.transaction('plans');
  return await new Promise((res) => {
    const x = tx.objectStore('plans').get('local-plan');
    x.onsuccess = () => res(!!x.result);
  });
});
await fs.writeFile(`${out}/adversarial.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
await b.close();
