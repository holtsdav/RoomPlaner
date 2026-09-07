import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || './audit-results';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.AUDIT_BROWSER,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(process.env.AUDIT_URL || 'http://localhost:3000');
  await page.waitForSelector('canvas');
  const results = await page.evaluate(async () => {
    const s = (
      await import(
        performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .find((n) => n.includes('/features/editor/state/planner-store.ts'))
      )
    ).usePlannerStore;
    const c = await import('/features/editor/domain/catalog.ts');
    const p = await import('/features/editor/domain/plan-document.ts');
    const rows = [];
    const base = p.createStarterPlan();
    base.id = 'all-fields';
    const frame = () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    for (const units of ['m', 'ft-in'])
      for (const preset of c.libraryCategories.flatMap(
        (category) => category.presets ?? [],
      )) {
        const object = c.objectFromPreset(preset, 'measured-object', {
          x: 2400,
          y: 1800,
        });
        s.getState().openRoom({ ...base, units, objects: [object] });
        s.getState().selectObject(object.id);
        await frame();
        const metadata = document.querySelector(
          'details[data-object-metadata]',
        );
        if (metadata && !metadata.open) {
          metadata.open = true;
          await frame();
        }
        const placed = s.getState().document.objects[0];
        const factor = units === 'm' ? 10 : 25.4;
        const field = (prefix) =>
          Number.parseFloat(
            document.querySelector(`[aria-label^="${prefix}"]`).value,
          ) * factor;
        const comparisons = [
          ['width', field('Object width in'), placed.widthMm],
          ['depth', field('Object depth in'), placed.depthMm],
          ['height', field('Object height in'), placed.heightMm ?? 0],
        ];
        if (placed.blueprintProfile?.mountingHeightMm !== undefined)
          comparisons.push([
            'elevation',
            field('Mounting height above floor in'),
            placed.blueprintProfile.mountingHeightMm,
          ]);
        for (const [fieldName, displayedMm, storedMm] of comparisons)
          rows.push({
            preset: preset.name,
            units,
            field: fieldName,
            displayedMm,
            storedMm,
            pass: Math.abs(displayedMm - storedMm) <= 0.13,
          });
      }
    // Legacy generic objects also retain their physical envelope after extreme resizing.
    const legacy = [];
    for (const shape of ['rectangle', 'ellipse', 'triangle', 'polygon'])
      for (const [widthMm, depthMm] of [
        [1, 1],
        [1, 10000],
        [10000, 1],
        [127, 900],
      ]) {
        const object = {
          ...base.objects[0],
          id: 'legacy-shape',
          shape,
          widthMm,
          depthMm,
          rotationDeg: 0,
        };
        s.getState().openRoom({ ...base, objects: [object] });
        await frame();
        const group = Konva.stages[0].findOne('#legacy-shape');
        const rect = group.children[0].getClientRect({
          skipStroke: true,
          skipShadow: true,
          relativeTo: group,
        });
        legacy.push({
          shape,
          widthMm,
          depthMm,
          rect,
          pass:
            Math.abs(rect.width - widthMm) <= 0.01 &&
            Math.abs(rect.height - depthMm) <= 0.01,
        });
      }
    return { rows, legacy };
  });
  await fs.writeFile(
    out + '/measurement-fields.json',
    JSON.stringify(results, null, 2),
  );
  assert.deepEqual(
    results.rows.filter((row) => !row.pass),
    [],
  );
  assert.deepEqual(
    results.legacy.filter((row) => !row.pass),
    [],
  );
  console.log({
    fieldChecks: results.rows.length,
    legacyChecks: results.legacy.length,
    failures: 0,
  });
} finally {
  await browser.close();
}
