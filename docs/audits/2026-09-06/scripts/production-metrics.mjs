import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const p = await b.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await p.addInitScript(() => {
  window.metrics = { lcp: null, cls: 0, longTasks: [] };
  new PerformanceObserver((l) => {
    for (const x of l.getEntries()) metrics.lcp = x.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const x of l.getEntries())
      if (!x.hadRecentInput) metrics.cls += x.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const x of l.getEntries())
      metrics.longTasks.push({ start: x.startTime, duration: x.duration });
  }).observe({ type: 'longtask', buffered: true });
});
await p.goto(
  process.env.AUDIT_PRODUCTION_URL || 'http://localhost:8788/RoomPlaner',
);
await p.waitForSelector('canvas');
await p.waitForTimeout(1500);
const r = await p.evaluate(() => ({
  userAgent: navigator.userAgent,
  ...metrics,
  paint: performance
    .getEntriesByType('paint')
    .map((x) => ({ name: x.name, start: x.startTime })),
  resources: performance.getEntriesByType('resource').map((r) => ({
    url: r.name,
    bytes: r.decodedBodySize,
    transfer: r.transferSize,
  })),
  navigation: performance.getEntriesByType('navigation').map((n) => ({
    ttfb: n.responseStart,
    domInteractive: n.domInteractive,
    load: n.loadEventEnd,
  })),
}));
r.note =
  'Single unthrottled cold browser context against local production Worker. Not field Core Web Vitals or physical mobile CPU.';
await fs.writeFile(
  `${out}/production-metrics.json`,
  JSON.stringify(r, null, 2),
);
console.log({
  lcp: r.lcp,
  cls: r.cls,
  paint: r.paint,
  resources: r.resources.length,
  longTasks: r.longTasks,
});
await b.close();
