import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const b = await chromium.launch({
  headless: true,
  executablePath: process.env.AUDIT_BROWSER,
});
const ctx = await b.newContext();
const page = await ctx.newPage();
const init = async (page) => {
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
    window.repo =
      await import('/features/editor/persistence/local-plan-repository.ts');
  });
};
await init(page);
await page.evaluate(() => {
  const objects = c.libraryCategories
    .flatMap((cat) => cat.presets)
    .map((o, i) =>
      c.objectFromPreset(o, 'audit-' + i, {
        x: 3000 + (i % 10) * 5000,
        y: 3000 + Math.floor(i / 10) * 5000,
      }),
    );
  s.getState().openRoom({
    ...p.createStarterPlan(),
    id: 'canvas-matrix',
    objects,
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
await page.waitForFunction(
  () => Konva.stages[0].find('#audit-183').length === 1,
);
const canvas = await page.evaluate(() => {
  const stage = Konva.stages[0];
  const rows = [];
  for (const scale of [0.04, 0.12, 0.8]) {
    stage.scale({ x: scale, y: scale });
    stage.draw();
    for (const o of s.getState().document.objects) {
      const g = stage.findOne('#' + o.id);
      const body = g.children[0];
      const r = body.getClientRect({ skipStroke: true, skipShadow: true });
      rows.push({
        name: o.name,
        scale,
        rotation: g.rotation(),
        renderedWidthMm: r.width / scale,
        renderedDepthMm: r.height / scale,
        widthMm: o.widthMm,
        depthMm: o.depthMm,
      });
    }
  }
  return rows;
});
await fs.writeFile(
  (process.env.AUDIT_OUTPUT || './audit-results') + '/canvas.json',
  JSON.stringify(canvas, null, 2),
);
const mismatches = canvas.filter((row) => {
  const angle = (row.rotation * Math.PI) / 180;
  const width =
    Math.abs(Math.cos(angle)) * row.widthMm +
    Math.abs(Math.sin(angle)) * row.depthMm;
  const depth =
    Math.abs(Math.sin(angle)) * row.widthMm +
    Math.abs(Math.cos(angle)) * row.depthMm;
  return (
    Math.abs(row.renderedWidthMm - width) > Math.max(0.01, width * 0.03) ||
    Math.abs(row.renderedDepthMm - depth) > Math.max(0.01, depth * 0.03)
  );
});
if (mismatches.length) throw new Error(JSON.stringify(mismatches));
console.log({ canvasChecks: canvas.length, mismatches: mismatches.length });
await b.close();
