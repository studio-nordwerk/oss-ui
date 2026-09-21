import { expect, test } from '@playwright/test';
import { call, changes, ready, settled, state } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.mouse.move(2, 2);
});

test.describe('product row paged by group', () => {
  test('arrows move one group and fire one change event per settled move', async ({ page }) => {
    const row = page.locator('[data-case=bestsellers]');
    expect(await state(page, 'bestsellers')).toMatchObject({ pageCount: 3, isBeginning: true, index: 0 });
    await row.scrollIntoViewIfNeeded();
    await row.locator('.sc-next').click();
    expect(await settled(page, 'bestsellers')).toMatchObject({ page: 1, index: 4 });
    expect(await changes(page, 'bestsellers')).toBe(1);

    // Two clicks while the first move is still in flight: the second counts on from its target,
    // and the row settles once. Both in one task, so the timing does not depend on the machine.
    await row.locator('.sc-dot').first().click();
    await settled(page, 'bestsellers');
    await row.locator('.sc-next').evaluate((next: HTMLElement) => {
      next.click();
      next.click();
    });
    expect(await settled(page, 'bestsellers')).toMatchObject({ page: 2, isEnd: true, index: 8 });
    expect(await changes(page, 'bestsellers')).toBe(3);
  });

  test('rewind fades back to the start', async ({ page }) => {
    const row = page.locator('[data-case=bestsellers]');
    await call(page, 'bestsellers', 'goToPage', 2, { instant: true });
    await settled(page, 'bestsellers');
    await expect(row.locator('.sc-next')).toHaveAttribute('aria-disabled', 'false');
    await row.locator('.sc-next').click();
    expect(await settled(page, 'bestsellers')).toMatchObject({ page: 0, isBeginning: true, left: 0 });
    await expect(row.locator('[data-sc-track]')).not.toHaveAttribute('data-sc-fading');
  });

  test('without rewind the next arrow is disabled at the end', async ({ page }) => {
    await page.locator('input[name=rewind][value=off]').check({ force: true });
    await call(page, 'bestsellers', 'goToPage', 2, { instant: true });
    await settled(page, 'bestsellers');
    const next = page.locator('[data-case=bestsellers] .sc-next');
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await next.click({ force: true });
    expect(await settled(page, 'bestsellers')).toMatchObject({ isEnd: true });
  });

  test('keyboard on the focused row, and the live region', async ({ page }) => {
    const track = page.locator('[data-case=bestsellers] [data-sc-track]');
    await track.focus();
    await page.keyboard.press('ArrowRight');
    expect(await settled(page, 'bestsellers')).toMatchObject({ page: 1 });
    await page.keyboard.press('End');
    expect(await settled(page, 'bestsellers')).toMatchObject({ isEnd: true });
    await page.keyboard.press('Home');
    expect(await settled(page, 'bestsellers')).toMatchObject({ isBeginning: true });
    await expect(page.locator('[data-case=bestsellers] [data-sc-status]')).toHaveText('Items 1 to 4 of 12');
  });

  test('slideTo shows the page that contains the slide', async ({ page }) => {
    await page.fill('#api-index', '6');
    await page.click('[data-api=bestsellers] button[type=submit]');
    expect(await settled(page, 'bestsellers')).toMatchObject({ page: 1, index: 4 });
  });

  test('a product added at the front keeps the view in place', async ({ page }) => {
    await call(page, 'bestsellers', 'goToPage', 1, { instant: true });
    await settled(page, 'bestsellers');
    const probe = () =>
      page.evaluate(() => {
        const slide = [...document.querySelectorAll('[data-case=bestsellers] .card-name')].find((name) => name.textContent == 'Espresso roast, whole beans, 1 kg')!;
        return Math.round(slide.getBoundingClientRect().left);
      });
    const before = await probe();
    await page.click('[data-act=prepend]');
    expect(await settled(page, 'bestsellers')).toMatchObject({ index: 5, pageCount: 4 });
    expect(Math.abs((await probe()) - before)).toBeLessThanOrEqual(1);
    await page.click('[data-act=remove]');
    expect(await settled(page, 'bestsellers')).toMatchObject({ pageCount: 4 });
  });

  test('resizing follows the container queries', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    expect(await settled(page, 'bestsellers')).toMatchObject({ pageCount: 4 });
    await page.setViewportSize({ width: 420, height: 900 });
    expect(await settled(page, 'bestsellers')).toMatchObject({ pageCount: 6 });
  });
});

test.describe('mouse drag', () => {
  test('moves a page, swallows the click, restores snapping', async ({ page }) => {
    const row = page.locator('[data-case=bestsellers]');
    await row.scrollIntoViewIfNeeded();
    await page.evaluate(() => (document.querySelector('.toast')!.textContent = ''));
    const box = (await row.locator('[data-sc-track]').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + 120);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * 0.6 - i * 30, box.y + 120);
    await page.mouse.up();
    expect(await settled(page, 'bestsellers')).toMatchObject({ page: 1 });
    await expect(page.locator('.toast')).toHaveText('');
    await expect(row.locator('[data-sc-track]')).not.toHaveAttribute('data-sc-dragging');
    // A plain click still reaches the link.
    await row.locator('.card-name a').nth(5).click();
    await expect(page.locator('.toast')).toContainText('Link followed');
  });
});

test.describe('date strip', () => {
  test('opens on today without moving, and pages from today', async ({ page }) => {
    expect(await state(page, 'dates')).toMatchObject({ index: 20, page: 3, pageCount: 6 });
    const dates = page.locator('[data-case=dates]');
    await dates.scrollIntoViewIfNeeded();
    await dates.locator('.sc-next').click();
    expect(await settled(page, 'dates')).toMatchObject({ index: 27 });
  });

  test('a week added before the first day keeps today in place', async ({ page }) => {
    const today = () => page.evaluate(() => Math.round(document.querySelector('[data-case=dates] [data-sc-initial]')!.getBoundingClientRect().left));
    await page.locator('[data-case=dates]').scrollIntoViewIfNeeded();
    const before = await today();
    await page.click('[data-act=earlier]');
    expect(await settled(page, 'dates')).toMatchObject({ index: 27, pageCount: 7 });
    expect(Math.abs((await today()) - before)).toBeLessThanOrEqual(1);
  });
});

test('right to left', async ({ page }) => {
  await page.goto('/?dir=rtl');
  await ready(page);
  expect(await state(page, 'dates')).toMatchObject({ index: 20, page: 3 });
  expect((await state(page, 'dates')).left).toBeLessThan(0);
  const row = page.locator('[data-case=bestsellers]');
  await row.scrollIntoViewIfNeeded();
  expect(await settled(page, 'bestsellers')).toMatchObject({ isBeginning: true, left: 0 });
  await row.locator('.sc-next').click();
  const moved = await settled(page, 'bestsellers');
  expect(moved.page).toBe(1);
  expect(moved.left).toBeLessThan(0);
  await row.locator('[data-sc-track]').focus();
  await page.keyboard.press('ArrowLeft');
  expect(await settled(page, 'bestsellers')).toMatchObject({ page: 2 });
});

test('the page never scrolls sideways', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    const { scrollWidth, clientWidth } = await page.evaluate(() => {
      const { scrollWidth, clientWidth } = document.scrollingElement!;
      return { scrollWidth, clientWidth };
    });
    expect(scrollWidth, `at ${width} px`).toBe(clientWidth);
  }
});

test('several carousels on one page are independent', async ({ page }) => {
  await call(page, 'guides', 'goToPage', 3, { instant: true });
  expect(await settled(page, 'guides')).toMatchObject({ page: 3 });
  expect(await state(page, 'bestsellers')).toMatchObject({ page: 0 });
  expect(await state(page, 'chips')).toMatchObject({ page: 0 });
});

test('too few slides: no controls, no tab stop', async ({ page }) => {
  const few = page.locator('[data-case=few]');
  await expect(few.locator('.sc-nav').first()).toBeHidden();
  await expect(few.locator('.sc-dots')).toHaveCSS('visibility', 'hidden');
  await expect(few.locator('[data-sc-track]')).toHaveAttribute('tabindex', '-1');
});

test.describe('autoplay', () => {
  test('moves after the delay, pauses on hover, stops with the button', async ({ page }) => {
    // Autoplay pauses while the hero is off-screen, so bring it into view, pointer beside it.
    await page.locator('[data-case=hero]').scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);
    await expect.poll(async () => (await state(page, 'hero')).index, { timeout: 9000 }).toBe(1);
    await expect(page.locator('[data-case=hero] [data-sc-status]')).toHaveText('');
    await page.hover('[data-case=hero] .hero-slide >> nth=1');
    await page.waitForTimeout(5600);
    expect((await state(page, 'hero')).index).toBe(1);
    await page.click('[data-case=hero] .sc-play');
    await expect(page.locator('[data-case=hero]')).not.toHaveAttribute('data-sc-playing');
  });

  test('keyboard focus entering the hero stops it', async ({ page }) => {
    await expect(page.locator('[data-case=hero]')).toHaveAttribute('data-sc-playing');
    await page.locator('[data-case=hero] [data-sc-track]').focus();
    await expect(page.locator('[data-case=hero]')).not.toHaveAttribute('data-sc-playing');
  });
});

test('without the script every row still scrolls and no control is shown', async ({ page }) => {
  await page.goto('/?nojs');
  await page.waitForTimeout(300);
  const baseline = await page.evaluate(() => ({
    controls: [...document.querySelectorAll('.sc-nav, .sc-play')].filter((b) => {
      const style = getComputedStyle(b);
      return style.display != 'none' && style.visibility != 'hidden';
    }).length,
    dots: [...document.querySelectorAll('.sc-dots')].filter((d) => getComputedStyle(d).visibility != 'hidden').length,
    scrollable: [...document.querySelectorAll('[data-sc-track]')].filter((t) => t.scrollWidth > t.clientWidth).length,
    tracks: document.querySelectorAll('[data-sc-track]').length,
  }));
  expect(baseline).toEqual({ controls: 0, dots: 0, scrollable: baseline.tracks - 2, tracks: 13 });
});

test('attaching causes no layout shift, even when the script arrives late', async ({ page, browserName }) => {
  test.skip(browserName != 'chromium', 'layout shift is only reported by Chromium');
  // Hold the script back, so the page is painted before anything attaches, as on a real network.
  await page.route('**/demo.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto('/');
  await ready(page);
  const shift = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) if (!entry.hadRecentInput) total += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 500);
      }),
  );
  expect(shift).toBe(0);
});
