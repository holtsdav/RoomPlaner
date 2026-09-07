import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || './audit-results';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUDIT_BROWSER,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.AUDIT_URL || 'http://localhost:3000');
await page.waitForSelector('canvas');
await page.evaluate(async () => {
  window.audit = {
    c: await import('/features/editor/domain/catalog.ts'),
    p: await import('/features/editor/domain/plan-document.ts'),
    b: await import('/features/editor/domain/office-blueprints.ts'),
    cmd: await import('/features/editor/domain/commands.ts'),
    w: await import('/features/editor/domain/wall-attachment.ts'),
    s: await import('/features/editor/domain/selection.ts'),
    store: (
      await import(
        performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .find((n) => n.includes('/features/editor/state/planner-store.ts'))
      )
    ).usePlannerStore,
  };
});
const geometry = await page.evaluate(() => {
  const { c, p, b, s } = window.audit;
  const all = c.libraryCategories.flatMap((cat) =>
    cat.presets.map((p) => ({ ...p, library: cat.name })),
  );
  const rows = [];
  const failures = [];
  let count = 0;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.append(svg);
  for (const preset of all) {
    const obj = c.objectFromPreset(preset, preset.id, { x: 1000, y: 1000 });
    const valid = p.planObjectSchema.safeParse(obj).success;
    let nativeBounds = null;
    let maxScaleError = 0;
    for (const [width, depth] of [
      [preset.widthMm, preset.depthMm],
      [1, 1],
      [1, 10000],
      [10000, 1],
      [10000, 10000],
    ]) {
      for (const scale of [0.04, 0.12, 0.8]) {
        const group = document.createElementNS(svg.namespaceURI, 'g');
        svg.append(group);
        if (preset.blueprint) {
          for (const part of b.officeBlueprint(
            preset.blueprint,
            width * scale,
            depth * scale,
            preset.blueprintProfile,
          )) {
            const path = document.createElementNS(svg.namespaceURI, 'path');
            path.setAttribute('d', part.d);
            group.append(path);
          }
        } else {
          const rect = document.createElementNS(svg.namespaceURI, 'rect');
          rect.setAttribute('x', (-width * scale) / 2);
          rect.setAttribute('y', (-depth * scale) / 2);
          rect.setAttribute('width', width * scale);
          rect.setAttribute('height', depth * scale);
          group.append(rect);
        }
        const r = group.getBBox();
        const bounds = {
          x: r.x / scale,
          y: r.y / scale,
          width: r.width / scale,
          depth: r.height / scale,
        };
        count++;
        if (
          !Number.isFinite(bounds.x + bounds.y + bounds.width + bounds.depth) ||
          bounds.x < -width / 2 - 0.1 ||
          bounds.y < -depth / 2 - 0.1 ||
          bounds.x + bounds.width > width / 2 + 0.1 ||
          bounds.y + bounds.depth > depth / 2 + 0.1
        )
          failures.push({ name: preset.name, width, depth, scale, bounds });
        if (width === preset.widthMm && depth === preset.depthMm) {
          if (!nativeBounds) nativeBounds = bounds;
          else
            maxScaleError = Math.max(
              maxScaleError,
              ...Object.keys(bounds).map((k) =>
                Math.abs(nativeBounds[k] - bounds[k]),
              ),
            );
        }
        group.remove();
      }
    }
    let rotationsPass = true;
    for (const rotationDeg of [0, 45, 90, 135, 180, 270, 359, -90]) {
      const a = s.getObjectSelectionBounds({ ...obj, rotationDeg });
      const rad = (rotationDeg * Math.PI) / 180;
      const ew =
        Math.abs(Math.cos(rad)) * obj.widthMm +
        Math.abs(Math.sin(rad)) * obj.depthMm;
      if (Math.abs(a.maxX - a.minX - ew) > 1e-7) rotationsPass = false;
    }
    const serial = p.planObjectSchema.parse(JSON.parse(JSON.stringify(obj)));
    rows.push({
      id: preset.id,
      name: preset.name,
      library: preset.library,
      blueprint: preset.blueprint,
      widthMm: preset.widthMm,
      depthMm: preset.depthMm,
      heightMm: preset.heightMm ?? null,
      metric: [
        p.formatMeasurement(obj.widthMm, 'm'),
        p.formatMeasurement(obj.depthMm, 'm'),
      ],
      imperial: [
        p.formatMeasurement(obj.widthMm, 'ft-in'),
        p.formatMeasurement(obj.depthMm, 'ft-in'),
      ],
      valid,
      serialDimensionsPass:
        serial.widthMm === obj.widthMm &&
        serial.depthMm === obj.depthMm &&
        serial.heightMm === obj.heightMm,
      rotationsPass,
      nativeBounds,
      maxScaleError,
      profile: preset.blueprintProfile,
    });
  }
  svg.remove();
  return { count, rows, failures };
});
await fs.writeFile(out + '/dimensions.json', JSON.stringify(geometry, null, 2));
console.log(
  'geometry',
  geometry.count,
  geometry.rows.length,
  'failures',
  geometry.failures.length,
);
await page.screenshot({ path: out + '/desktop.png' });
const ax = async (label) => {
  const result = await new AxeBuilder({ page }).analyze();
  await fs.writeFile(
    out + '/axe-' + label + '.json',
    JSON.stringify(result.violations, null, 2),
  );
  console.log(
    'axe',
    label,
    result.violations.map((x) => [x.id, x.nodes.length]),
  );
};
await ax('desktop');
const state = await page.evaluate(() => {
  const { c, p, w, store } = window.audit;
  const base = p.createStarterPlan();
  const room = {
    ...base.room,
    boundary: [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ],
  };
  const tv = c.objectCatalog.find((x) => x.name === 'Wall-mounted TV · 100″');
  const before = c.objectFromPreset(tv, 'tv', { x: 0, y: 0 });
  const after = w.attachWindow(before, room);
  const panel = c.objectCatalog.find((x) => x.blueprint === 'acoustic-panel');
  const panelAtCorner = w.attachWindow(
    c.objectFromPreset(panel, 'panel', { x: 0, y: 0 }),
    base.room,
  );
  const result = {
    tvBefore: before.widthMm,
    tvAfter: after.widthMm,
    tvProfile: after.blueprintProfile,
    panelAtCorner,
    formatSmall: [1, 3, 10, 13, 127, 313].map((n) => [
      n,
      p.formatMeasurement(n, 'ft-in'),
    ]),
  };
  store.setState({
    document: {
      ...base,
      objects: [
        c.objectFromPreset(c.basicShapeCatalog[1], 'tri', { x: 1000, y: 1000 }),
        c.objectFromPreset(c.basicShapeCatalog[0], 'square', {
          x: 2500,
          y: 1000,
        }),
      ],
    },
    past: [],
    future: [],
    selectedIds: ['tri', 'square'],
    editStart: null,
  });
  store.getState().mirrorSelection('horizontal');
  result.horizontalMirror = store.getState().document.objects;
  store.setState({
    document: base,
    past: [],
    future: [],
    selectedIds: [],
    editStart: null,
  });
  store.getState().selectCorner(0);
  store.getState().moveCorner(0, { x: 123, y: 177 });
  result.exactCorner = store.getState().document.room.boundary[0];
  store.setState({
    document: base,
    past: [],
    future: [],
    selectedIds: [],
    editStart: null,
  });
  store.getState().addPreset(panel);
  return result;
});
await fs.writeFile(out + '/logic.json', JSON.stringify(state, null, 2));
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByText('Imperial', { exact: true }).click();
await page.getByRole('button', { name: 'Close', exact: true }).last().click();
await page.waitForTimeout(250);
await page.screenshot({ path: out + '/imperial-mounting.png' });
console.log(
  'imperial fields',
  await page
    .locator('.planner-object-toolbar input')
    .evaluateAll((es) =>
      es.map((e) => [e.getAttribute('aria-label'), e.value]),
    ),
);
await ax('selected');
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: out + '/mobile-selected.png' });
await ax('mobile');
console.log(
  'mobileToolbar',
  await page.locator('[role=toolbar]').boundingBox(),
);
await page.setViewportSize({ width: 320, height: 568 });
await page.screenshot({ path: out + '/small-phone-selected.png' });
console.log('smallToolbar', await page.locator('[role=toolbar]').boundingBox());
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => {
  const { store, p } = window.audit;
  store.setState({
    document: p.createStarterPlan(),
    selectedIds: [],
    past: [],
    future: [],
  });
});
await page.getByRole('button', { name: 'Collapse object library' }).click();
console.log(
  'collapsedFocusable',
  await page.locator('aside input').evaluate((e) => ({
    tabIndex: e.tabIndex,
    rect: e.getBoundingClientRect().toJSON(),
    inert: !!e.closest('[inert]'),
  })),
);
const perf = await page.evaluate(async () => {
  const { c, p, store } = window.audit;
  const rows = [];
  const chair = c.objectCatalog.find((x) => x.blueprint === 'ergonomic-chair');
  for (const n of [10, 100, 500]) {
    const objects = Array.from({ length: n }, (_, i) =>
      c.objectFromPreset(chair, 'chair-' + i, {
        x: 400 + (i % 12) * 750,
        y: 400 + Math.floor(i / 12) * 750,
      }),
    );
    store.setState({
      document: { ...p.createStarterPlan(), objects },
      selectedIds: [],
      past: [],
      future: [],
      editStart: null,
    });
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    const durations = [];
    for (let i = 0; i < 8; i++) {
      const t = performance.now();
      store.getState().selectObject('chair-' + i);
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      durations.push(performance.now() - t);
    }
    rows.push({
      objects: n,
      samplesMs: durations,
      meanMs: durations.reduce((a, b) => a + b) / durations.length,
      domNodes: document.querySelectorAll('*').length,
      konvaNodes: window.Konva.stages[0].find('Shape').length,
    });
  }
  return rows;
});
await fs.writeFile(out + '/performance.json', JSON.stringify(perf, null, 2));
console.log('perf', perf);
await fs.writeFile(out + '/errors.json', JSON.stringify(errors));
await browser.close();
