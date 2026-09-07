import { test as base, expect } from '@playwright/test';

// Custom local browsers can terminate when a context closes. Launch one per
// test in that mode; CI uses Playwright's managed browser and normal fixtures.
export const test = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? base.extend({
      context: async ({ playwright, browserName }, runTest, info) => {
        const options = info.project.use;
        const browser = await playwright[browserName].launch(
          options.launchOptions,
        );
        const context = await browser.newContext({
          baseURL: options.baseURL,
          storageState: options.storageState,
          viewport: options.viewport,
          deviceScaleFactor: options.deviceScaleFactor,
          isMobile: options.isMobile,
          hasTouch: options.hasTouch,
          userAgent: options.userAgent,
        });
        try {
          await runTest(context);
        } finally {
          await browser.close();
        }
      },
    })
  : base;
export { expect };
