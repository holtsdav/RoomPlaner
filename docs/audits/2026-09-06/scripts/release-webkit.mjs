import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const results = [];
for (const engine of ['webkit']) {
  let browser;
  try {
    browser = await (engine === 'chromium' ? chromium : webkit).launch({
      headless: true,
      ...(engine === 'chromium'
        ? {
            executablePath:
              process.env.AUDIT_BROWSER ||
              '/Applications/Helium.app/Contents/MacOS/Helium',
          }
        : {
            executablePath:
              '/Users/holtsdav/Library/Caches/ms-playwright/webkit-2336/pw_run.sh',
          }),
    });
  } catch (e) {
    results.push({ engine, launchError: e.message });
    await fs.writeFile(
      `${out}/release-webkit.json`,
      JSON.stringify(results, null, 2),
    );
    continue;
  }
  for (const [width, height, touch] of [
    [1440, 900, false],
    [390, 844, true],
    [320, 568, true],
    [844, 390, true],
    [768, 1024, true],
  ]) {
    const r = {
      engine,
      width,
      height,
      touch,
      errors: [],
      requests: [],
      checks: [],
    };
    const ctx = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const p = await ctx.newPage();
    p.setDefaultTimeout(7000);
    p.on('pageerror', (e) => r.errors.push(e.message));
    p.on('response', (res) => {
      if (res.status() >= 400)
        r.requests.push({ status: res.status(), url: res.url() });
    });
    try {
      await p.goto(
        process.env.AUDIT_PRODUCTION_URL || 'http://localhost:8788/RoomPlaner',
      );
      await p.waitForSelector('canvas');
      await p
        .getByRole('main')
        .filter({ has: p.locator('canvas') })
        .waitFor();
      await p.waitForTimeout(300);
      r.initial = await p.locator('body').innerText();
      r.overflow = await p.evaluate(() => ({
        window: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      await p.screenshot({ path: `${out}/${engine}-${width}-initial.png` });
      r.axe = (await new AxeBuilder({ page: p }).analyze()).violations.map(
        (v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        }),
      );
      if (width < 1024)
        await p
          .getByRole('button', { name: 'Open object library', exact: true })
          [touch ? 'tap' : 'click']();
      await p
        .locator('summary:visible')
        .filter({ hasText: 'Placed in room' })
        [touch ? 'tap' : 'click']();
      await p
        .getByRole('button', { name: /Three-seat sofa/ })
        [touch ? 'tap' : 'click']();
      if (touch)
        await p
          .getByRole('button', { name: 'Edit selected objects' })
          [touch ? 'tap' : 'click']();
      r.selected = await p.locator('body').innerText();
      r.selectedAxe = (
        await new AxeBuilder({ page: p }).analyze()
      ).violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      }));
      await p.screenshot({ path: `${out}/${engine}-${width}-selected.png` });
      r.fields = await p.locator('input').evaluateAll((es) =>
        es
          .filter((e) => e.getBoundingClientRect().width)
          .map((e) => ({
            label: e.getAttribute('aria-label'),
            id: e.id,
            value: e.value,
            rect: e.getBoundingClientRect().toJSON(),
          })),
      );
      if (touch)
        await p
          .getByRole('button', { name: 'Close', exact: true })
          [touch ? 'tap' : 'click']();
      await p
        .getByRole('button', { name: /Room menu for/ })
        [touch ? 'tap' : 'click']();
      await p
        .getByRole('menuitem', { name: 'Export room', exact: true })
        [touch ? 'tap' : 'click']();
      const download = p.waitForEvent('download');
      await p
        .getByRole('button', { name: /JSON data/ })
        [touch ? 'tap' : 'click']();
      const d = await download;
      await d.saveAs(`${out}/${engine}-${width}.roomplan.json`);
      r.checks.push('JSON export');
      await p
        .getByRole('button', { name: /Room menu for/ })
        [touch ? 'tap' : 'click']();
      await p
        .getByRole('menuitem', { name: 'Export room', exact: true })
        [touch ? 'tap' : 'click']();
      const pngDownload = p.waitForEvent('download');
      await p
        .getByRole('button', { name: /PNG image/ })
        [touch ? 'tap' : 'click']();
      const png = await pngDownload;
      await png.saveAs(`${out}/${engine}-${width}-export.png`);
      r.checks.push('PNG export');
      await p
        .getByRole('button', { name: /Room menu for/ })
        [touch ? 'tap' : 'click']();
      await p
        .getByRole('menuitem', { name: 'Edit dimensions', exact: true })
        [touch ? 'tap' : 'click']();
      await p
        .getByRole('textbox', { name: 'Room width in centimetres' })
        .fill('500');
      await p
        .getByRole('textbox', { name: 'Room width in centimetres' })
        .press('Enter');
      await p
        .getByRole('button', { name: 'Close', exact: true })
        .first()
        [touch ? 'tap' : 'click']();
      await p.waitForTimeout(700);
      await p.reload();
      await p.waitForSelector('canvas');
      r.persistedSummary = await p
        .locator('#room-plan-canvas-summary')
        .innerText();
      r.checks.push('resize and reload');
    } catch (e) {
      r.failure = e.message;
      await p
        .screenshot({ path: `${out}/${engine}-${width}-failure.png` })
        .catch(() => {});
    }
    results.push(r);
    await fs.writeFile(
      `${out}/release-webkit.json`,
      JSON.stringify(results, null, 2),
    );
  }
  await browser.close();
}
console.log(
  JSON.stringify(
    results.map(
      ({ engine, width, failure, checks, errors, axe, selectedAxe }) => ({
        engine,
        width,
        failure,
        checks,
        errors,
        axe,
        selectedAxe,
      }),
    ),
    null,
    2,
  ),
);
