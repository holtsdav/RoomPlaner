import { defineConfig, devices } from '@playwright/test';
const origin = process.env.TEST_ORIGIN ?? 'http://localhost:3001';
const base = process.env.TEST_BASE_PATH ?? '';
const cookie = process.env.TEST_COOKIE;
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  outputDir: `test-results/${base.includes('/dev/') ? 'develop' : base ? 'production' : 'local'}`,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: origin + base + '/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
    ...(cookie
      ? {
          storageState: {
            cookies: [
              {
                name: cookie.split('=')[0],
                value: cookie.slice(cookie.indexOf('=') + 1),
                domain: new URL(origin).hostname,
                path: base,
                httpOnly: true,
                secure: true,
                sameSite: 'Strict' as const,
                expires: -1,
              },
            ],
            origins: [],
          },
        }
      : {}),
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: process.env.TEST_ORIGIN
    ? undefined
    : {
        command: 'npm run dev -- --port 3001',
        url: origin,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
