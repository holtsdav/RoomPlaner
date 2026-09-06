import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const namespace =
  process.env.TEST_BASE_PATH === '/RoomPlaner'
    ? 'room-planner'
    : process.env.TEST_BASE_PATH === '/dev/RoomPlaner'
      ? 'room-planner-develop'
      : 'room-planner-local';
async function savedPlans(page: Page) {
  return page.evaluate(async (name) => {
    return await new Promise<
      {
        id: string;
        room: { name: string; boundary: { x: number; y: number }[] };
        objects: { widthMm: number }[];
        groups: unknown[];
      }[]
    >((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const records = db.transaction('plans').objectStore('plans').getAll();
        records.onsuccess = () => {
          resolve(records.result);
          db.close();
        };
        records.onerror = () => {
          reject(records.error);
          db.close();
        };
      };
    });
  }, namespace);
}
async function openPlan(page: Page) {
  await page.goto('./');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeEnabled();
}
async function roomMenu(page: Page) {
  await page.getByRole('button', { name: /Room menu for/ }).click();
}
async function rename(page: Page, name: string) {
  await roomMenu(page);
  await page
    .getByRole('menuitem', { name: 'Rename room', exact: true })
    .click();
  await page.getByLabel('Room name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
}
async function setup(page: Page) {
  await roomMenu(page);
  await page
    .getByRole('menuitem', { name: 'Edit dimensions', exact: true })
    .click();
}
async function placed(page: Page, mobile: boolean) {
  if (mobile)
    await page
      .getByRole('button', { name: 'Open object library', exact: true })
      .tap();
  const summary = page
    .locator('summary:visible')
    .filter({ hasText: 'Placed in room' });
  if (mobile) await summary.tap();
  else await summary.click();
}

test('hydrates the real app, persists the starter, and supports JSON and PNG export', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openPlan(page);
  await expect.poll(async () => (await savedPlans(page)).length).toBe(1);
  await rename(page, 'Release verification');
  await expect
    .poll(async () => (await savedPlans(page))[0].room.name)
    .toBe('Release verification');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Room menu for Release verification' }),
  ).toBeVisible();
  for (const format of ['JSON data', 'PNG image']) {
    await roomMenu(page);
    await page
      .getByRole('menuitem', { name: 'Export room', exact: true })
      .click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(format) }).click();
    expect((await download).suggestedFilename()).toMatch(
      format === 'JSON data' ? /\.roomplan\.json$/ : /\.png$/,
    );
  }
  expect(errors).toEqual([]);
});

test('keeps text undo inside a rename field', async ({ page }) => {
  await openPlan(page);
  await rename(page, 'Text history');
  await roomMenu(page);
  await page
    .getByRole('menuitem', { name: 'Rename room', exact: true })
    .click();
  const field = page.getByLabel('Room name', { exact: true });
  await field.press('End');
  await field.pressSequentially(' draft');
  await field.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect(field).not.toHaveValue('Text history draft');
  await page
    .getByRole('button', { name: 'Close', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Room menu for Text history' }),
  ).toBeVisible();
});

test('edits outline corners through DOM controls and explains invalid numeric input', async ({
  page,
}) => {
  await openPlan(page);
  await setup(page);
  await page.getByText('Edit room corners', { exact: true }).click();
  await page.getByLabel('Corner', { exact: true }).selectOption('1');
  const x = page.getByRole('textbox', { name: 'Corner X in centimetres' });
  await x.fill('490');
  await x.press('Enter');
  await page
    .getByRole('button', { name: 'Add corner after this', exact: true })
    .click();
  await expect(
    page.getByLabel('Corner', { exact: true }).locator('option'),
  ).toHaveCount(5);
  await page
    .getByRole('button', { name: 'Remove corner', exact: true })
    .click();
  await expect(
    page.getByLabel('Corner', { exact: true }).locator('option'),
  ).toHaveCount(4);
  const wall = page.getByRole('textbox', {
    name: 'Wall thickness in centimetres',
  });
  await wall.fill('12,5');
  await wall.press('Enter');
  await expect(wall).toHaveValue('12.5');
  await wall.fill('twelve');
  await wall.press('Tab');
  await expect(wall).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText(/Enter a valid number/)).toBeVisible();
  await wall.focus();
  await wall.press('Escape');
  await expect(wall).not.toHaveAttribute('aria-invalid', 'true');
});

test('settings remain scrollable within a short landscape viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 667, height: 320 });
  await openPlan(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const box = await dialog.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(320);
  const close = dialog
    .getByRole('button', { name: 'Close', exact: true })
    .last();
  await close.scrollIntoViewIfNeeded();
  await close.click();
  await expect(dialog).toHaveCount(0);
});

test('selects separate objects without a modifier and groups them', async ({
  page,
}, info) => {
  const mobile = info.project.name === 'mobile';
  await openPlan(page);
  await placed(page, mobile);
  const action = async (name: string) => {
    const button = page.getByRole('button', { name, exact: true });
    if (mobile) await button.tap();
    else await button.click();
  };
  await action('Select multiple');
  const sofa = page.getByRole('button', { name: /Three-seat sofa/ });
  const table = page.getByRole('button', { name: /Round table/ });
  if (mobile) {
    await sofa.tap();
    await table.tap();
  } else {
    await sofa.click();
    await table.click();
  }
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
  await action('Done selecting');
  if (mobile) {
    await page.waitForTimeout(300);
    await page
      .getByRole('button', { name: 'Edit selected objects', exact: true })
      .tap();
  }
  await action('Group selected objects');
  await expect
    .poll(async () => (await savedPlans(page))[0].groups.length)
    .toBe(1);
});

test('survives complete storage denial and retains recoverable edits after eight seconds', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await openPlan(page);
  await expect(
    page.getByRole('button', { name: 'Export backup', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(8200);
  await expect(
    page.getByRole('button', { name: 'Export backup', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await page
    .getByRole('button', { name: /Local save unavailable · Recovery options/ })
    .filter({ visible: true })
    .click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export backup', exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/json$/);
});

test('preference denial does not misreport a completed IndexedDB save', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    }),
  );
  await openPlan(page);
  await rename(page, 'Preferences denied');
  await expect
    .poll(async () => (await savedPlans(page))[0].room.name)
    .toBe('Preferences denied');
  await expect(
    page
      .getByText('Saved on this device', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
});

test('preserves both versions of a competing-tab edit', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await openPlan(page);
  await expect.poll(async () => (await savedPlans(page)).length).toBe(1);
  const second = await context.newPage();
  await openPlan(second);
  await rename(page, 'First tab');
  await expect
    .poll(async () => (await savedPlans(page))[0].room.name)
    .toBe('First tab');
  await rename(second, 'Second tab');
  await expect(
    second.getByText(/This room changed in another tab/),
  ).toBeVisible();
  await second.waitForTimeout(30_100);
  await expect(
    second.getByRole('button', { name: 'Save a copy', exact: true }),
  ).toBeVisible();
  await second
    .getByRole('button', { name: 'Save a copy', exact: true })
    .click();
  await expect
    .poll(async () => (await savedPlans(second)).map((p) => p.room.name).sort())
    .toEqual(['First tab', 'Second tab (copy)']);
});

test('rejects an oversized import and imports a valid backup as an independent copy', async ({
  page,
}) => {
  await openPlan(page);
  await expect.poll(async () => (await savedPlans(page)).length).toBe(1);
  const original = (await savedPlans(page))[0];
  const input = page.getByLabel('Import room files');
  await input.setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByText(/Import failed. Limits:/)).toBeVisible();
  expect((await savedPlans(page)).length).toBe(1);
  await input.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await expect.poll(async () => (await savedPlans(page)).length).toBe(2);
  expect(
    (await savedPlans(page)).some(
      (plan) =>
        plan.id === original.id && plan.room.name === original.room.name,
    ),
  ).toBe(true);
});

test('does not read or modify the other deployment database', async ({
  page,
}) => {
  await openPlan(page);
  const other =
    namespace === 'room-planner' ? 'room-planner-develop' : 'room-planner';
  const checkOther = async (write: boolean) =>
    page.evaluate(
      async ({ name, write }) =>
        await new Promise((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = () =>
            request.result.createObjectStore('plans', { keyPath: 'id' });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(
              'plans',
              write ? 'readwrite' : 'readonly',
            );
            const store = tx.objectStore('plans');
            const op = write
              ? store.put({
                  id: 'preserved-other-environment',
                  name: 'Keep me',
                })
              : store.get('preserved-other-environment');
            op.onsuccess = () => {
              const result = op.result;
              tx.oncomplete = () => {
                db.close();
                resolve(result);
              };
            };
            op.onerror = () => reject(op.error);
          };
        }),
      { name: other, write },
    );
  await checkOther(true);
  await rename(page, 'Isolated edits');
  await expect
    .poll(async () => (await savedPlans(page))[0].room.name)
    .toBe('Isolated edits');
  expect(await checkOther(false)).toEqual({
    id: 'preserved-other-environment',
    name: 'Keep me',
  });
});
