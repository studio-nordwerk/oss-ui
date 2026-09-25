import { expect, test, type Page } from '@playwright/test';
import { PAGE, dragAway, ready, settled, state } from './helpers.ts';

/** Adds a sheet with the given attributes to the page and attaches the core to it. */
const addSheet = (page: Page, id: string, attributes: string) =>
  page.evaluate(
    async ({ id, attributes }) => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<dialog class="ss" id="${id}" aria-label="${id}" ${attributes}><div class="ss-panel">
          <i class="ss-snap" style="--ss-at: 30dvh"></i>
          <div class="ss-body"><p>Content</p><button type="button">Inside</button></div>
          <button type="button" commandfor="${id}" command="close">Close</button>
        </div><div class="ss-rest"></div></dialog>`,
      );
      const { attach } = await import(new URL('lib/index.js', document.baseURI).href);
      const sheet = attach(document.getElementById(id));
      const reasons: string[] = ((window as any).__reasons ??= []);
      sheet.dialog.addEventListener('ss:close', (event: CustomEvent) => reasons.push(`${id} ${event.detail.reason}`));
    },
    { id, attributes },
  );

const open = async (page: Page, id: string) => {
  await page.evaluate(async (id) => {
    const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
    getSheet(document.getElementById(id)).open();
  }, id);
  return settled(page, id);
};

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
});

test('a top sheet comes from the top edge and closes when dragged up', async ({ page }) => {
  await addSheet(page, 'top-sheet', 'data-ss="top"');
  const opened = await open(page, 'top-sheet');
  expect(opened.open).toBe(true);
  expect(opened.panel.top).toBe(0);
  await dragAway(page, 'top-sheet');
  await expect.poll(async () => (await state(page, 'top-sheet')).open).toBe(false);
  expect(await page.evaluate(() => (window as any).__reasons)).toEqual(['top-sheet swipe']);
});

test('a non-modal sheet leaves the page usable, does not lock it and closes on Escape', async ({ page }) => {
  await addSheet(page, 'loose-sheet', 'data-ss-modal="false"');
  await open(page, 'loose-sheet');
  const outside = await page.evaluate(() => {
    const dialog = document.getElementById('loose-sheet') as HTMLDialogElement;
    // A point above the panel: the page, not the dialog, receives it.
    const panel = dialog.querySelector('.ss-panel')!.getBoundingClientRect();
    const hit = document.elementFromPoint(innerWidth / 2, Math.max(1, panel.top - 20));
    return {
      modal: dialog.matches(':modal'),
      hitsDialog: !!hit?.closest('#loose-sheet'),
      locked: getComputedStyle(document.documentElement).overflow == 'hidden',
    };
  });
  expect(outside).toEqual({ modal: false, hitsDialog: false, locked: false });
  await page.locator('#loose-sheet button', { hasText: 'Inside' }).focus();
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page, 'loose-sheet')).open).toBe(false);
});

test('a sheet that is not dismissible ignores Escape, taps outside and dragging; its button closes it', async ({
  page,
}) => {
  await addSheet(page, 'kept-sheet', 'data-ss-dismissible="false"');
  await open(page, 'kept-sheet');
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await dragAway(page, 'kept-sheet');
  await page.waitForTimeout(600);
  const kept = await settled(page, 'kept-sheet');
  expect(kept.open).toBe(true);
  expect(kept.snap).toBeGreaterThanOrEqual(0);
  await page.locator('#kept-sheet button', { hasText: 'Close' }).click();
  await expect.poll(async () => (await state(page, 'kept-sheet')).open).toBe(false);
  expect(await page.evaluate(() => (window as any).__reasons)).toEqual(['kept-sheet button']);
});

test('a sheet under a nested one is marked covered until it is on top again', async ({ page }) => {
  await addSheet(page, 'lower-sheet', '');
  await addSheet(page, 'upper-sheet', '');
  await open(page, 'lower-sheet');
  await open(page, 'upper-sheet');
  const covered = () =>
    page.evaluate(() =>
      ['lower-sheet', 'upper-sheet'].map((id) => document.getElementById(id)!.hasAttribute('data-ss-covered')),
    );
  expect(await covered()).toEqual([true, false]);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page, 'upper-sheet')).open).toBe(false);
  expect(await covered()).toEqual([false, false]);
});

test('sequential snap points stop a fast swipe at each one', async ({ page }) => {
  await addSheet(page, 'steps-sheet', 'data-ss-sequential');
  const stop = await page.evaluate(
    () => getComputedStyle(document.querySelector('#steps-sheet .ss-snap')!).scrollSnapStop,
  );
  expect(stop).toBe('always');
});
