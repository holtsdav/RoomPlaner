import { createServer } from '/Users/holtsdav/Documents/Dev/RoomPlaner/node_modules/vite/dist/node/index.js';
import react from '/Users/holtsdav/Documents/Dev/RoomPlaner/node_modules/@vitejs/plugin-react/dist/index.js';
import tailwindcss from '/Users/holtsdav/Documents/Dev/RoomPlaner/node_modules/@tailwindcss/postcss/dist/index.mjs';
const root = '/Users/holtsdav/Documents/Dev/RoomPlaner';
const server = await createServer({
  root,
  configFile: false,
  resolve: { alias: { '@': root } },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    react(),
    {
      name: 'audit-harness',
      configureServer(s) {
        s.middlewares.use(async (req, res, next) => {
          if (req.url !== '/') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            await s.transformIndexHtml(
              '/',
              `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room Planner audit harness</title></head><body><div id="root"></div><script type="module" src="/audit-entry.jsx"></script></body></html>`,
            ),
          );
        });
      },
      resolveId(id) {
        if (id === '/audit-entry.jsx') return id;
      },
      load(id) {
        if (id === '/audit-entry.jsx')
          return `import React from 'react';import {createRoot} from 'react-dom/client';import {PlannerWorkspace} from '/features/editor/ui/planner-workspace.tsx';import '/app/globals.css';createRoot(document.getElementById('root')).render(<PlannerWorkspace/>);`;
      },
    },
  ],
  server: { port: 3011, strictPort: true },
});
await server.listen();
console.log('Audit source harness on 3011');
