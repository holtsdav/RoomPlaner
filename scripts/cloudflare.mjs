import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [action, target] = process.argv.slice(2);
if (
  !['build', 'deploy'].includes(action) ||
  !['production', 'develop'].includes(target)
) {
  throw new Error(
    'Usage: node scripts/cloudflare.mjs <build|deploy> <production|develop>',
  );
}
const env = {
  ...process.env,
  ROOMPLANER_DEPLOY: '1',
  APP_BASE_PATH: target === 'develop' ? '/dev/RoomPlanner' : '/RoomPlanner',
  CLOUDFLARE_ENV: target === 'develop' ? 'develop' : '',
};
if (action === 'deploy') {
  // Vite already resolved the environment in this generated config. Reapplying
  // it makes Wrangler append the environment to the Worker name a second time.
  delete env.CLOUDFLARE_ENV;
  const built = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
  const expected = target === 'develop' ? 'roomplaner-develop' : 'roomplaner';
  if (built.name !== expected)
    throw new Error(`Build ${target} before deploying; found ${built.name}.`);
}
const args =
  action === 'build'
    ? ['vinext', 'build']
    : ['wrangler', 'deploy', '--config', 'dist/server/wrangler.json'];
const result = spawnSync('npx', args, { env, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
