import { expect, test } from '@playwright/test';
import { PAGE } from './helpers.ts';

// The page as it ships before any script runs: the browser opens and closes sheets on its own.
test.use({ javaScriptEnabled: false });

const isOpen = (page: import('@playwright/test').Page, id: string) =>
  page.locator(`#${id}`).evaluate((dialog: HTMLDialogElement) => dialog.open);

// Playwright's stability check waits on animation frames it cannot see with scripts off, so these
// clicks go to the element's position, like a real one.
async function press(page: import('@playwright/test').Page, selector: string) {
  const box = (await page.locator(selector).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('buttons open and close sheets, Escape closes them, the page stays where it was', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('#stores').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => Math.round(scrollY));
  await page.locator('[commandfor="store-sheet"][command="show-modal"]').click();
  expect(await isOpen(page, 'store-sheet')).toBe(true);
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
  // Without script it opens at its full height or at one of its snap points; its header shows
  // once the enter transition is over.
  await page.waitForTimeout(500);
  const header = await page.locator('#store-sheet .ss-header').boundingBox();
  const height = page.viewportSize()!.height;
  expect(header!.y).toBeGreaterThanOrEqual(0);
  expect(header!.y + header!.height).toBeLessThan(height);
  await press(page, '#store-sheet .ss-close');
  expect(await isOpen(page, 'store-sheet')).toBe(false);

  await page.locator('[commandfor="contact-sheet"][command="show-modal"]').click();
  expect(await isOpen(page, 'contact-sheet')).toBe(true);
  await page.keyboard.press('Escape');
  expect(await isOpen(page, 'contact-sheet')).toBe(false);
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
});

test('without script a sheet cannot be dragged away completely', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('#sizes .tile-btn').first().click();
  const dialog = page.locator('#size-sheet');
  // Scroll the dialog to its far end; some of the panel stays in view.
  await dialog.evaluate((d) => d.scrollTo({ top: -d.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(400);
  const panel = await page.locator('#size-sheet .ss-panel').boundingBox();
  expect(panel!.y).toBeLessThan(page.viewportSize()!.height - 40);
  expect(await isOpen(page, 'size-sheet')).toBe(true);
});

test('while a sheet slides out, it keeps its direction instead of jumping to the other end', async ({ page }) => {
  await page.goto(PAGE);
  for (const [id, trigger] of [
    ['filter-sheet', '[commandfor="filter-sheet"][command="show-modal"]'],
    ['size-sheet', '#sizes .tile-btn'],
  ]) {
    await page.locator(trigger).first().scrollIntoViewIfNeeded();
    await page.locator(trigger).first().click();
    await page.waitForTimeout(500);
    const direction = (dialog: HTMLDialogElement) => getComputedStyle(dialog).flexDirection;
    const open = await page.locator(`#${id}`).evaluate(direction);
    await press(page, `#${id} .ss-close`);
    expect(await isOpen(page, id)).toBe(false);
    expect(await page.locator(`#${id}`).evaluate(direction), id).toBe(open);
    await page.waitForTimeout(500);
  }
});
