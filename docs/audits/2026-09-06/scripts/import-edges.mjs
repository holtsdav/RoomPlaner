import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out = process.env.AUDIT_OUTPUT || '/tmp/roomplanner-release-evidence';
const b = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AUDIT_BROWSER ||
    '/Applications/Helium.app/Contents/MacOS/Helium',
});
const p = await b.newPage();
await p.goto(process.env.AUDIT_SOURCE_URL || 'http://localhost:3011');
await p.waitForSelector('canvas');
const r = await p.evaluate(async () => {
  const m = await import('/features/editor/domain/plan-document.ts');
  const f = await import('/features/editor/domain/room-files.ts');
  const r = {};
  const base = m.createStarterPlan();
  r.vertexPerformance = [];
  for (const n of [1000, 5000, 10000]) {
    const d = {
      ...base,
      room: {
        ...base.room,
        boundary: Array.from({ length: n }, (_, i) => ({
          x: Math.round(1e7 * Math.cos((i * 2 * Math.PI) / n)),
          y: Math.round(1e7 * Math.sin((i * 2 * Math.PI) / n)),
        })),
      },
    };
    const txt = JSON.stringify(d),
      start = performance.now();
    try {
      f.parseRoomFile(txt);
      r.vertexPerformance.push({
        vertices: n,
        bytes: txt.length,
        ms: performance.now() - start,
        accepted: true,
      });
    } catch (e) {
      r.vertexPerformance.push({
        vertices: n,
        ms: performance.now() - start,
        error: e.message.slice(0, 100),
      });
    }
  }
  return r;
});
await fs.writeFile(`${out}/import-edges.json`, JSON.stringify(r, null, 2));
console.log(r);
await b.close();
