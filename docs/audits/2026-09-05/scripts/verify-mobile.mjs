import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out =
  process.env.AUDIT_OUTPUT ||
  new URL('../mobile-followup/', import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const errors = [],
  results = {};
async function init(options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
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
    };
    const p = q.p.createStarterPlan();
    p.id = crypto.randomUUID();
    p.objects = [
      {
        ...p.objects[0],
        id: 'test-square',
        name: 'Square',
        shape: 'rectangle',
        blueprint: undefined,
        blueprintProfile: undefined,
        widthMm: 1000,
        depthMm: 1000,
        positionMm: { x: 2400, y: 1800 },
      },
    ];
    p.groups = [];
    q.s.getState().openRoom(p);
  });
  await page.waitForTimeout(300);
  return { context, page };
}
const model = (page) =>
  page.evaluate(() => ({
    x: Konva.stages[0].x(),
    y: Konva.stages[0].y(),
    objects: q.s.getState().document.objects,
    selected: q.s.getState().selectedIds,
  }));
const objectPoint = (page) =>
  page.evaluate(() => {
    const s = Konva.stages[0],
      n = s.findOne('#test-square'),
      r = s.container().getBoundingClientRect(),
      p = n.getAbsolutePosition();
    return { x: r.x + p.x, y: r.y + p.y };
  });
async function swipe(context, page, point) {
  const c = await context.newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point],
  });
  for (let i = 1; i <= 6; i++)
    await c.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x + i * 8, y: point.y + i * 5 }],
    });
  await c.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await c.detach();
  await page.waitForTimeout(100);
}
try {
  const { context, page } = await init({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  assert.equal(
    await page
      .getByRole('button', { name: 'Pan canvas', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  const before = await model(page);
  await swipe(context, page, await objectPoint(page));
  const after = await model(page);
  assert.notEqual(after.x, before.x);
  assert.deepEqual(after.objects, before.objects);
  assert.deepEqual(after.selected, before.selected);
  results.touchOverObjectPansWithoutMoving = true;
  const point = await objectPoint(page);
  await page.touchscreen.tap(point.x, point.y);
  await page.locator('.planner-object-compact').waitFor();
  assert.deepEqual((await model(page)).selected, ['test-square']);
  const bar = await page.locator('.planner-object-compact').boundingBox();
  assert(bar.height <= 68);
  assert.equal(
    await page
      .getByRole('textbox', { name: 'Object width in cm', exact: true })
      .count(),
    0,
  );
  results.compactHeight = bar.height;
  await page.screenshot({ path: out + '/phone-compact.png' });
  await page
    .getByRole('button', { name: 'Edit selected objects', exact: true })
    .tap();
  await page
    .getByRole('textbox', { name: 'Object width in cm', exact: true })
    .fill('120');
  await page
    .getByRole('textbox', { name: 'Object width in cm', exact: true })
    .press('Enter');
  assert.equal((await model(page)).objects[0].widthMm, 1200);
  await page.getByRole('button', { name: 'Object color', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Green', exact: true }).tap();
  assert.equal((await model(page)).objects[0].color, '#86efac');
  await page.getByRole('menuitem').first().waitFor({ state: 'hidden' });
  await page.screenshot({ path: out + '/phone-editor.png' });
  await page.getByRole('button', { name: 'Close', exact: true }).tap();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Pan canvas', exact: true }).tap();
  assert.equal(
    await page
      .getByRole('button', { name: 'Pan canvas', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  );
  const editBefore = await model(page);
  await swipe(context, page, await objectPoint(page));
  const editAfter = await model(page);
  assert.equal(editAfter.x, editBefore.x);
  assert.notDeepEqual(
    editAfter.objects[0].positionMm,
    editBefore.objects[0].positionMm,
  );
  results.touchEditModeMovesObjects = true;
  await page.evaluate(() => {
    const s = q.s.getState();
    s.duplicateSelection();
    q.s
      .getState()
      .selectObjects(q.s.getState().document.objects.map((o) => o.id));
  });
  await page
    .getByRole('button', { name: 'Edit selected objects', exact: true })
    .tap();
  await page.getByRole('button', { name: 'Object color', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Purple', exact: true }).tap();
  assert((await model(page)).objects.every((o) => o.color === '#c4b5fd'));
  await page
    .getByRole('button', { name: 'Group selected objects', exact: true })
    .tap();
  await page.getByRole('button', { name: 'Object color', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Rose', exact: true }).tap();
  assert((await model(page)).objects.every((o) => o.color === '#fda4af'));
  results.touchMultiAndGroupColors = true;
  await page.getByRole('button', { name: 'Close', exact: true }).tap();
  await page.waitForTimeout(300);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    const b = await page.locator('.planner-object-compact').boundingBox();
    assert(
      b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.width <= viewport.width &&
        b.y + b.height <= viewport.height,
    );
    await page
      .getByRole('button', { name: 'Edit selected objects', exact: true })
      .tap();
    await page.waitForTimeout(250);
    const sheet = await page.getByRole('dialog').boundingBox();
    assert(sheet.y >= 0 && sheet.y + sheet.height <= viewport.height + 1);
    assert.equal(
      await page
        .getByRole('dialog')
        .evaluate((el) => el.scrollWidth > el.clientWidth),
      false,
    );
    await page.screenshot({ path: out + `/touch-sheet-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Close', exact: true }).tap();
    await page.waitForTimeout(300);
  }
  results.touchBothOrientationsAnd320 = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => q.s.getState().clearSelection());
  await page
    .getByRole('button', { name: 'How room measurements work', exact: true })
    .tap();
  await page
    .getByText('Inside bounds: 468 cm × 348 cm', { exact: true })
    .waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: out + '/room-measurements.png' });
  results.insideRoomExplanation = true;

  const desktop = await init({
    viewport: { width: 390, height: 844 },
    hasTouch: false,
  });
  const d = desktop.page;
  assert.equal(
    await d
      .getByRole('button', { name: 'Pan canvas', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  );
  const db = await model(d),
    dp = await objectPoint(d);
  await d.mouse.move(dp.x, dp.y);
  await d.mouse.down();
  await d.mouse.move(dp.x + 40, dp.y + 20, { steps: 6 });
  await d.mouse.up();
  const da = await model(d);
  assert.equal(da.x, db.x);
  assert.notDeepEqual(da.objects[0].positionMm, db.objects[0].positionMm);
  assert.equal(await d.locator('.planner-object-compact').count(), 0);
  await d
    .getByRole('textbox', { name: 'Object width in cm', exact: true })
    .waitFor();
  results.portraitMouseStillEdits = true;
  await d.screenshot({ path: out + '/portrait-mouse.png' });
  await d.setViewportSize({ width: 1440, height: 900 });
  await d.evaluate(() => q.s.getState().clearSelection());
  await d.locator('summary').filter({ hasText: 'Home Cinema' }).click();

  await d
    .getByRole('button', { name: /Add Apple HomePod \(2nd generation\)/ })
    .click();
  const pod = (await model(d)).objects.at(-1);
  assert.deepEqual([pod.widthMm, pod.depthMm, pod.heightMm], [142, 142, 168]);
  await d.getByRole('button', { name: /Add Apple HomePod mini/ }).click();
  const mini = (await model(d)).objects.at(-1);
  assert.deepEqual([mini.widthMm, mini.depthMm, mini.heightMm], [98, 98, 84]);
  results.homepodLibraryAndSize = true;
  results.homepodCanvasBounds = await d.evaluate(() =>
    q.s
      .getState()
      .document.objects.filter((o) => o.blueprint === 'homepod')
      .map((o) => {
        const g = Konva.stages[0].findOne('#' + o.id);
        return {
          name: o.name,
          rect: g.children[0].getClientRect({
            skipStroke: true,
            skipShadow: true,
            relativeTo: g,
          }),
          width: o.widthMm,
          depth: o.depthMm,
        };
      }),
  );
  for (const b of results.homepodCanvasBounds) {
    assert(Math.abs(b.rect.width - b.width) < 0.001);
    assert(Math.abs(b.rect.height - b.depth) < 0.001);
  }

  const hybrid = await init({
    viewport: { width: 1100, height: 800 },
    hasTouch: true,
  });
  const h = hybrid.page;
  const hb = await model(h),
    hp = await objectPoint(h);
  await h.mouse.move(hp.x, hp.y);
  await h.mouse.down();
  await h.mouse.move(hp.x + 32, hp.y + 24, { steps: 6 });
  await h.mouse.up();
  assert.equal((await model(h)).x, hb.x);
  assert.notDeepEqual(
    (await model(h)).objects[0].positionMm,
    hb.objects[0].positionMm,
  );
  const ht = await model(h);
  await swipe(hybrid.context, h, await objectPoint(h));
  assert.notEqual((await model(h)).x, ht.x);
  assert.deepEqual((await model(h)).objects, ht.objects);
  results.hybridSwitchesPerPointer = true;
  assert.deepEqual(errors, []);
  results.errors = errors;
  await fs.writeFile(
    out + '/verification.json',
    JSON.stringify(results, null, 2),
  );
  console.log(results);
} catch (e) {
  console.error(results);
  throw e;
} finally {
  await browser.close();
}
