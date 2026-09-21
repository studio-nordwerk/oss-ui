import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ready } from './helpers.ts';

// Screenshots differ between operating systems and engines, so baselines are kept for Chromium
// per platform (test/e2e/__screenshots__/<platform>). Where none exist, the tests are skipped;
// create them with: UPDATE_VISUAL=1 pnpm test:e2e --project=chromium visual --update-snapshots
test.skip(({ browserName }) => browserName != 'chromium', 'baselines are kept for Chromium only');
test.skip(!existsSync(`test/e2e/__screenshots__/${process.platform}`) && !process.env.UPDATE_VISUAL, `no baselines for ${process.platform}`);

const names = ['hero', 'bestsellers', 'phone', 'guides', 'chips', 'dates', 'few', 'fewClamped', 'teasers', 'products', 'stage', 'gallery', 'belt'];

for (const width of [390, 768, 1280]) {
  test(`every example at ${width} px`, async ({ page }) => {
    // Reduced motion: autoplay starts stopped and nothing animates.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await ready(page);
    await page.mouse.move(0, 0);
    for (const name of names) {
      const root = page.locator(`[data-case="${name}"], [data-wire="${name}"]`);
      await expect(root).toHaveScreenshot(`${name}-${width}.png`);
    }
  });
}
