import { expect, test } from '@playwright/test';
import { PAGE, openWith, ready, settled } from './helpers.ts';

const TRIGGER = '[commandfor="details-sheet"][command="show-modal"]';

const page_ = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return {
      scale: body.scale,
      origin: parseFloat(body.transformOrigin.split(' ')[1]),
      ground: getComputedStyle(document.documentElement).backgroundColor,
      scrollY: Math.round(scrollY),
    };
  });

test('a sheet with depth makes the page recede towards the top of the screen, and back', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await page.locator(TRIGGER).scrollIntoViewIfNeeded();
  const before = await page_(page);
  await openWith(page, page.locator(TRIGGER), 'details-sheet');
  await settled(page, 'details-sheet');
  const open = await page_(page);
  expect(Number(open.scale)).toBeLessThan(1);
  expect(Number(open.scale)).toBeGreaterThan(0.85);
  // Shrinks around the top of the screen, not the top of the document.
  expect(Math.round(open.origin)).toBe(before.scrollY);
  expect(open.ground).toBe('rgb(0, 0, 0)');

  await page.keyboard.press('Escape');
  await expect(page.locator('#details-sheet')).not.toHaveAttribute('open');
  const closed = await page_(page);
  expect(closed.scale).toBe('none');
  expect(closed.ground).toBe(before.ground);
  expect(closed.scrollY).toBe(before.scrollY);
});

test('a sheet without depth leaves the page as it is', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await openWith(page, page.locator('[commandfor="contact-sheet"][command="show-modal"]'), 'contact-sheet');
  expect((await page_(page)).scale).toBe('none');
});

test('in a cascade layer the ground still wins over a background utility on <html>', async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  // The layered build, as Tailwind users import it, and a utility like bg-white on the root.
  await page.evaluate(async () => {
    const link = document.querySelector('link[href="lib/depth.css"]')!;
    const layered = document.createElement('link');
    layered.rel = 'stylesheet';
    layered.href = 'lib/depth.layer.css';
    await new Promise((loaded) => {
      layered.onload = loaded;
      link.replaceWith(layered);
    });
    const utilities = document.createElement('style');
    utilities.textContent = '@layer utilities { .bg-white { background-color: #fff } }';
    document.head.append(utilities);
    document.documentElement.classList.add('bg-white');
  });
  await openWith(page, page.locator(TRIGGER), 'details-sheet');
  expect((await page_(page)).ground).toBe('rgb(0, 0, 0)');
});
