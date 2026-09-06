import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || './audit-results';
const b = await chromium.launch({
  headless: true,
  executablePath: process.env.AUDIT_BROWSER,
});
const context = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(5000);
await page.goto(process.env.AUDIT_URL || 'http://localhost:3000');
await page.waitForSelector('canvas');
await page.evaluate(async () => {
  window.s = (
    await import(
      performance
        .getEntriesByType('resource')
        .map((r) => r.name)
        .find((n) => n.includes('/features/editor/state/planner-store.ts'))
    )
  ).usePlannerStore;
  window.c = await import('/features/editor/domain/catalog.ts');
  window.p = await import('/features/editor/domain/plan-document.ts');
});
const observations = {};
// Exercise real DOM input/undo/cancel, not only domain helpers.
await page.evaluate(() => {
  const a = c.objectFromPreset(c.basicShapeCatalog[2], 'test-rect', {
    x: 2400,
    y: 1800,
  });
  s.getState().openRoom({ ...p.createStarterPlan(), objects: [a] });
  s.getState().selectObject(a.id);
});
const width = page.getByRole('textbox', {
  name: 'Object width in cm',
  exact: true,
});
await width.fill('123.4');
await width.press('Enter');
observations.width = await page.evaluate(
  () => s.getState().document.objects[0].widthMm,
);
await page.getByRole('button', { name: 'Undo', exact: true }).click();
observations.undoWidth = await page.evaluate(
  () => s.getState().document.objects[0].widthMm,
);
await page.evaluate(() => s.getState().selectObject('test-rect'));
await width.fill('200');
await width.press('Escape');
observations.cancelWidth = await page.evaluate(
  () => s.getState().document.objects[0].widthMm,
);
await width.fill('-5');
await width.press('Enter');
observations.invalidWidth = await page.evaluate(
  () => s.getState().document.objects[0].widthMm,
);
await width.fill('12,5');
await width.press('Enter');
observations.commaInput = await width.inputValue();
// Persistent stale name in controlled room settings dialog.
await page.evaluate(() => s.getState().renameRoom('Audit renamed room'));
await page
  .getByRole('button', { name: 'Room menu for Audit renamed room' })
  .click();
await page.getByRole('menuitem', { name: 'Edit dimensions' }).click();
observations.roomNameInput = await page
  .getByLabel('Room name', { exact: true })
  .inputValue();
await page.getByRole('button', { name: 'Close', exact: true }).last().click();
// Selection toolbar outside viewport for an off-canvas object.
await page.evaluate(() => {
  s.getState().selectObject('test-rect');
  s.getState().updateSelectedObject({ positionMm: { x: 2400, y: 20000 } });
});
observations.offscreenToolbar = await page
  .locator('[role=toolbar]')
  .boundingBox();
await page.screenshot({ path: out + '/offscreen-toolbar.png' });
// Huge valid room cannot fit at clamped minimum scale.
await page.evaluate(() => {
  s.getState().openRoom({
    ...p.createStarterPlan(),
    id: 'huge-room',
    objects: [],
    room: {
      ...p.createStarterPlan().room,
      boundary: [
        { x: 0, y: 0 },
        { x: 100000, y: 0 },
        { x: 100000, y: 100000 },
        { x: 0, y: 100000 },
      ],
    },
  });
});
await page.getByRole('button', { name: 'Fit room to view' }).click();
observations.largeRoom = await page.evaluate(() => ({
  scale: Konva.stages[0].scaleX(),
  canvas: Konva.stages[0].size(),
  bounds: s.getState().document.room.boundary,
}));
// Library focus after complete collapse animation.
await page.getByRole('button', { name: 'Collapse object library' }).click();
await page.waitForTimeout(300);
observations.collapsed = await page.locator('aside').evaluate((e) => ({
  width: e.getBoundingClientRect().width,
  childrenFocusable: e.querySelectorAll('button,input,summary').length,
  inert: e.inert,
}));
await page.locator('aside input').focus();
observations.hiddenFocus = await page.evaluate(() => ({
  name: document.activeElement.getAttribute('aria-label'),
  rect: document.activeElement.getBoundingClientRect().toJSON(),
}));
// Unit alias accepted by schema switches unexpectedly through canvas setting.
await page.evaluate(() =>
  s.getState().openRoom({ ...p.createStarterPlan(), units: 'in' }),
);
await page.getByRole('button', { name: 'Hide grid', exact: true }).click();
observations.importedInUnits = await page.evaluate(
  () => s.getState().document.units,
);
// Cumulative scale rounding.
observations.scaleDrift = await page.evaluate(() => {
  const a = c.objectFromPreset(c.basicShapeCatalog[0], 'a', {
    x: 1000,
    y: 1000,
  });
  a.widthMm = 127;
  const d = {
    ...p.createStarterPlan(),
    objects: [a, { ...a, id: 'b', positionMm: { x: 2000, y: 1000 } }],
  };
  s.getState().openRoom(d);
  s.getState().selectObjects(['a', 'b']);
  s.getState().scaleSelection(0.01);
  s.getState().scaleSelection(100);
  return s.getState().document.objects.map((x) => x.widthMm);
});
// Direct persistence round trip and corruption isolation.
observations.persistence = await page.evaluate(async () => {
  const repo =
    await import('/features/editor/persistence/local-plan-repository.ts');
  const a = { ...p.createStarterPlan(), id: 'valid-audit-room' };
  await repo.saveLocalPlan(a);
  const db = await new Promise((resolve, reject) => {
    const r = indexedDB.open('room-planner');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('plans', 'readwrite');
    tx.objectStore('plans').put({
      id: 'invalid-audit-room',
      updatedAt: '9999',
      objects: [],
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  let failed = false;
  try {
    await repo.listLocalPlans();
  } catch {
    failed = true;
  }
  return {
    validRoundTrip: (await repo.loadLocalPlan()).id,
    listBlockedByOneCorruptRecord: failed,
  };
});
await fs.writeFile(out + '/edges.json', JSON.stringify(observations, null, 2));
console.log(observations);
await b.close();
