# Cloudflare deployment

The repositories remain separate. `holtsdav/holtsdav.com` builds Astro on its
existing Cloudflare Pages project. `holtsdav/RoomPlanner` builds React/Vinext into
two Workers. Path routes take precedence over Pages for RoomPlaner only.

| Git branch | Worker               | URL                                    | Build command              | Deploy command              |
| ---------- | -------------------- | -------------------------------------- | -------------------------- | --------------------------- |
| `main`     | `roomplaner`         | `https://holtsdav.com/RoomPlanner`     | `npm run build:production` | `npm run deploy:production` |
| `develop`  | `roomplaner-develop` | `https://holtsdav.com/dev/RoomPlanner` | `npm run build:develop`    | `npm run deploy:develop`    |

The former `/RoomPlaner` and `/dev/RoomPlaner` paths permanently redirect to
their corrected equivalents, preserving subpaths and query strings.

In Cloudflare Workers Builds, connect each Worker to the **RoomPlanner** repository
and select its corresponding production branch from the table. Disable
non-production branch builds for both Workers. Use the repository root, `NODE_VERSION=24.18.0`, and
`SKIP_DEPENDENCY_INSTALL=true`. Prefix each build command with
`npm ci --no-audit --fund=false &&`. The npm lockfile remains authoritative;
the build uses the npm bundled with Node instead of asking Cloudflare to
bootstrap a separately pinned npm version. The build/deploy commands set the base path and environment
explicitly, so the two applications do not share asset URLs. GitHub CI continues
to validate both branches. Pushes automatically trigger the connected Worker.

## Development password

Cloudflare dashboard → Workers & Pages → **roomplaner-develop** → Settings →
**Variables and Secrets** → Add → Type **Secret** → Name **DEV_PASSWORD**.
Enter your chosen password and deploy the change. Keep the value out of Git,
Wrangler configuration, and build variables. A missing secret returns HTTP 503
and blocks access. Changing it invalidates existing sessions on their next request.

The gate runs before every application and asset request. Sessions are random,
stored server-side as hashes, expire after eight hours, and use an HttpOnly,
Secure, SameSite=Strict cookie scoped to `/dev/RoomPlanner`. Login POSTs require a
matching Origin and a bounded form body. Development responses prohibit caching
and indexing. Worker and version preview URLs are disabled in configuration.

A SQLite Durable Object coordinates all password attempts for this shared gate.
It allows five attempts per IP and ten total across all IPs during a rolling
15-minute window. Successful attempts count too. Blocked requests do not verify
passwords. This also means an attacker can temporarily block new logins; existing
sessions continue working. Throttling reduces guessing, but cannot make a short
test password strong: replace the temporary value with a long, unique password.

## Local verification

`npm run dev` retains the normal development experience at `/`.

For the deployed development configuration:

1. Run `npm run build:develop`.
2. Create an ignored `dist/server/.dev.vars` with `DEV_PASSWORD` set to a local
   test value. This generated directory is removed by subsequent builds.
3. Run `npx wrangler dev --config dist/server/wrangler.json --port 8787`.
4. Run `node scripts/test-deployment.mjs` with `TEST_PASSWORD` set to that test
   value. The smoke test exercises login, CSRF rejection, private assets, base
   paths, forged cookies, and both login limits. It intentionally exhausts the
   local attempt budget; use fresh local state or wait 15 minutes before rerunning.

Production uses `npm run build:production` followed by `npm run deploy:production`.
Always build the matching environment immediately before deploying. Never run the
production deploy command against an existing development build or vice versa.

## Storage isolation and browser verification

The consumer path retains the existing `room-planner` IndexedDB database and
preference keys. `/dev/RoomPlanner` uses `room-planner-develop`; local editing at `/`
uses `room-planner-local`. Development does not import, migrate, or delete the
consumer database. These names prevent accidental mixing; they are not a security
boundary between scripts on the same origin. Separate origins would provide that
boundary. Export JSON from the old environment to transfer rooms deliberately.

`npm run dev` uses Vinext's Node RSC development server when there are no local
Cloudflare storage bindings. This avoids the Worker dev middleware intercepting
CSS and browser-module requests. Actual Worker behavior is verified separately.

Run `npx playwright install chromium`, then `npm run test:browser` for the local
app and `npm run test:release` for both compiled deployments. The release command
builds each target, starts isolated local Workers on port 8791, checks authentication
and security headers, and runs desktop/mobile regressions. Its temporary development
password and Durable Object state are removed afterward. It does not deploy.
`PLAYWRIGHT_EXECUTABLE_PATH` may select a locally installed Chromium executable.

CI requires unit tests, formatting, lint, type checking, the local browser suite,
both compiled Worker suites, and the production dependency audit. HTML responses
use a per-response script nonce, prohibit framing and caching, and restrict sources;
static assets keep their normal caching policy. SSR hydration and PNG/JSON export
are exercised with that policy enabled.
