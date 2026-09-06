import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || './audit-results';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUDIT_BROWSER,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  hasTouch: true,
});
const errors = [];
const results = {};
const init = async (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.AUDIT_URL || 'http://localhost:3000');
  await page.waitForSelector('canvas');
  await page.evaluate(async () => {
    const mod = async (path) =>
      import(
        performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .find((n) => n.includes(path)) || path
      );
    window.q = {
      s: (await mod('/features/editor/state/planner-store.ts')).usePlannerStore,
      p: await mod('/features/editor/domain/plan-document.ts'),
      c: await mod('/features/editor/domain/catalog.ts'),
      repo: await mod('/features/editor/persistence/local-plan-repository.ts'),
      save: await mod('/features/editor/ui/use-local-plan.ts'),
      png: await mod('/features/editor/ui/room-image-export.ts'),
    };
  });
};
try {
  const page = await context.newPage();
  await init(page);
  await page.evaluate(async () => {
    const p = q.p.createStarterPlan();
    p.id = 'ui-fixes';
    p.objects = p.objects.map((o) => ({ ...o, widthMm: 127 }));
    q.s.getState().openRoom(p);
    await q.save.flushLocalPlan();
    q.s.getState().selectObjects(p.objects.map((o) => o.id));
  });
  await page.getByRole('button', { name: 'Object color', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Green', exact: true }).click();
  assert.deepEqual(
    await page.evaluate(() =>
      q.s.getState().document.objects.map((o) => o.color),
    ),
    ['#86efac', '#86efac'],
  );
  const scale = page.getByRole('textbox', {
    name: 'Selection scale percentage',
  });
  await scale.fill('1');
  await scale.press('Enter');
  assert.deepEqual(
    await page.evaluate(() =>
      q.s.getState().document.objects.map((o) => o.widthMm),
    ),
    [1, 1],
  );
  await page
    .getByRole('button', { name: 'Reset selection scale', exact: true })
    .click();
  assert.deepEqual(
    await page.evaluate(() =>
      q.s.getState().document.objects.map((o) => o.widthMm),
    ),
    [127, 127],
  );
  results.absoluteScaleReset = true;
  await page
    .getByRole('button', { name: 'Group selected objects', exact: true })
    .click();
  await page.getByRole('button', { name: 'Object color', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Purple', exact: true }).click();
  assert.deepEqual(
    await page.evaluate(() =>
      q.s.getState().document.objects.map((o) => o.color),
    ),
    ['#c4b5fd', '#c4b5fd'],
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.deepEqual(
    await page.evaluate(() =>
      q.s.getState().document.objects.map((o) => o.color),
    ),
    ['#86efac', '#86efac'],
  );
  results.groupColorUndo = true;
  await page.evaluate(() => {
    const state = q.s.getState();
    q.s.setState({
      document: {
        ...state.document,
        objects: state.document.objects.map((o, i) => ({
          ...o,
          locked: i === 0,
        })),
      },
    });
    q.s.getState().selectObjects(state.document.objects.map((o) => o.id));
  });
  await page.getByRole('button', { name: 'Object color', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Rose', exact: true }).click();
  assert.deepEqual(
    await page.evaluate(() =>
      q.s.getState().document.objects.map((o) => o.color),
    ),
    ['#86efac', '#fda4af'],
  );
  results.lockedColorsPreserved = true;
  await page.evaluate(() => {
    q.s.getState().openRoom({ ...q.p.createStarterPlan(), id: 'tv-ui' });
  });
  await page.locator('summary').filter({ hasText: 'Living Room' }).click();
  await page
    .getByRole('button', { name: 'Choose TV with Stand', exact: true })
    .waitFor({ state: 'visible' });
  assert.equal(
    await page
      .getByRole('button', { name: 'Choose TV with Stand', exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Choose Wall-mounted TV', exact: true })
      .count(),
    1,
  );
  await page
    .getByRole('button', { name: 'Choose Wall-mounted TV', exact: true })
    .click();
  await page.getByRole('menuitem').first().waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('menuitem').count(), 9);
  await page.getByRole('menuitem').first().click();
  const tv = await page.evaluate(() => q.s.getState().document.objects.at(-1));
  assert.equal(tv.blueprintProfile.mounting, 'wall');
  results.separateTvFamilies = true;
  await page.getByRole('button', { name: 'Object color', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Blue', exact: true }).click();
  await page.evaluate(async () => {
    await q.save.flushLocalPlan();
  });
  assert.equal(
    await page.evaluate(
      async () => (await q.repo.loadLocalPlan()).objects.at(-1).color,
    ),
    '#93c5fd',
  );
  results.colorPersistence = true;
  const png = await page.evaluate(() =>
    q.png
      .renderRoomImage(q.s.getState().document, {
        dimensions: true,
        grid: true,
      })
      .toDataURL(),
  );
  await fs.writeFile(
    out + '/colored-export.png',
    Buffer.from(png.split(',')[1], 'base64'),
  );
  assert.notEqual(
    png,
    await page.evaluate(() =>
      q.png
        .renderRoomImage(q.s.getState().document, {
          dimensions: false,
          grid: false,
        })
        .toDataURL(),
    ),
  );
  results.exportOptions = true;
  await page.evaluate(() =>
    q.s.getState().updateSelectedObject({ positionMm: { x: 20000, y: 20000 } }),
  );
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    const bounds = await page.locator('[role=toolbar]').boundingBox();
    assert(
      bounds.x >= 0 &&
        bounds.y >= 0 &&
        bounds.x + bounds.width <= viewport.width + 1 &&
        bounds.y + bounds.height <= viewport.height,
    );
    await page.screenshot({ path: out + `/verified-${viewport.width}.png` });
  }
  results.toolbarAllViewports = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Pan canvas', exact: true }).click();
  const before = await page.evaluate(() => ({
    x: Konva.stages[0].x(),
    y: Konva.stages[0].y(),
    selected: q.s.getState().selectedIds,
  }));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 180, y: 650 }],
  });
  for (let i = 1; i <= 5; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 180 + i * 10, y: 650 - i * 8 }],
    });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  const after = await page.evaluate(() => ({
    x: Konva.stages[0].x(),
    y: Konva.stages[0].y(),
    selected: q.s.getState().selectedIds,
  }));
  assert.notEqual(after.x, before.x);
  assert.deepEqual(after.selected, before.selected);
  results.touchPan = true;
  // Two independent application tabs, using the same browser storage.
  await page.evaluate(async () => {
    q.s
      .getState()
      .openRoom({ ...q.p.createStarterPlan(), id: 'conflict-fixes' });
    await q.save.flushLocalPlan();
  });
  const second = await context.newPage();
  await init(second);
  await page.evaluate(async () => {
    q.s.getState().renameRoom('Tab A latest');
    await q.save.flushLocalPlan();
  });
  const conflict = await second.evaluate(async () => {
    q.s.getState().selectObject('sofa-1');
    q.s.getState().nudgeSelection({ x: 50, y: 0 });
    try {
      await q.save.flushLocalPlan();
      return false;
    } catch {
      return true;
    }
  });
  assert.equal(conflict, true);
  assert.equal(
    await page.evaluate(async () => (await q.repo.loadLocalPlan()).room.name),
    'Tab A latest',
  );
  await second
    .getByRole('button', { name: 'Save a copy', exact: true })
    .click();
  await second.waitForFunction(
    () =>
      q.s.getState().saveStatus === 'saved' &&
      q.s.getState().document.id !== 'conflict-fixes',
  );
  assert.equal(
    await second.evaluate(
      () => q.s.getState().document.objects[0].positionMm.x,
    ),
    1500,
  );
  results.conflictAndCopyRecovery = true;
  await second.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('room-planner');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('plans', 'readwrite');
        tx.objectStore('plans').put({
          id: 'broken-fixture',
          updatedAt: '9999',
          room: {},
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  const healthy = await second.evaluate(async () =>
    (await q.repo.listLocalPlans()).map((p) => p.id),
  );
  assert(healthy.includes('conflict-fixes'));
  results.corruptRecordIsolation = true;
  // A malformed successor rolls back deletion; a stale tab cannot resurrect a deleted room.
  const retained = await second.evaluate(async () => {
    const id = q.s.getState().document.id;
    try {
      await q.repo.deleteAndActivateLocalPlan(id, 'broken-fixture');
      return false;
    } catch {
      return (await q.repo.listLocalPlans()).some((p) => p.id === id);
    }
  });
  assert.equal(retained, true);
  const deletedId = await second.evaluate(() => {
    q.deletedDocument = q.s.getState().document;
    return q.deletedDocument.id;
  });
  const roomName = await second.evaluate(
    () => q.s.getState().document.room.name,
  );
  await second
    .getByRole('button', { name: `Room menu for ${roomName}`, exact: true })
    .click();
  await second
    .getByRole('menuitem', { name: 'Delete room', exact: true })
    .click();
  await second
    .getByRole('button', { name: 'Delete room', exact: true })
    .click();
  await second.waitForFunction(
    (id) => q.s.getState().document.id !== id,
    deletedId,
  );
  assert.equal(
    await second.evaluate(
      async (id) => (await q.repo.listLocalPlans()).some((p) => p.id === id),
      deletedId,
    ),
    false,
  );
  results.atomicDeleteWithCorruptRecord = true;
  assert.equal(
    await second.evaluate(async () => {
      try {
        await q.repo.saveLocalPlan(q.deletedDocument);
        return false;
      } catch {
        return true;
      }
    }),
    true,
  );
  assert.equal(
    await second.evaluate(
      async (id) => (await q.repo.listLocalPlans()).some((p) => p.id === id),
      deletedId,
    ),
    false,
  );
  results.delayedSaveCannotResurrectDeletion = true;
  results.errors = errors;
  assert.deepEqual(errors, []);
  await fs.writeFile(
    out + '/verified-fixes.json',
    JSON.stringify(results, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
