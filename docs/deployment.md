# Cloudflare deployment

The repositories remain separate. `holtsdav/holtsdav.com` builds Astro on its
existing Cloudflare Pages project. `holtsdav/RoomPlaner` builds React/Vinext into
two Workers. Path routes take precedence over Pages for RoomPlaner only.

| Git branch | Worker               | URL                                   | Build command              | Deploy command              |
| ---------- | -------------------- | ------------------------------------- | -------------------------- | --------------------------- |
| `main`     | `roomplaner`         | `https://holtsdav.com/RoomPlaner`     | `npm run build:production` | `npm run deploy:production` |
| `develop`  | `roomplaner-develop` | `https://holtsdav.com/dev/RoomPlaner` | `npm run build:develop`    | `npm run deploy:develop`    |

In Cloudflare Workers Builds, connect each Worker to the **RoomPlaner** repository
and select its corresponding production branch from the table. Disable
non-production branch builds for both Workers. Use the repository root and Node
version from `.nvmrc`. The build/deploy commands set the base path and environment
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
Secure, SameSite=Strict cookie scoped to `/dev/RoomPlaner`. Login POSTs require a
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
