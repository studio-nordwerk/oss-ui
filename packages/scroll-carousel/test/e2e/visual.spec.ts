import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ready } from './helpers.ts';

// Screenshots differ between operating systems and engines, so baselines are kept for Chromium
// per platform (test/e2e/__screenshots__/<platform>). Where none exist, the tests are skipped;
// create them with: UPDATE_VISUAL=1 pnpm test:e2e --project=chromium visual --update-snapshots
test.skip(({ browserName }) => browserName != 'chromium', 'baselines are kept for Chromium only');
test.skip(!existsSync(join(import.meta.dirname, '__screenshots__', process.platform)) && !process.env.UPDATE_VISUAL, `no baselines for ${process.platform}`);

const names = ['hero', 'bestsellers', 'phone', 'guides', 'chips', 'dates', 'few', 'fewClamped', 'teasers', 'products', 'stage', 'gallery', 'belt'];

for (const width of [390, 768, 1280]) {
  test(`every example at ${width} px`, async ({ page }) => {
    // Reduced motion: autoplay starts stopped and nothing animates.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // The web font is optional and may or may not arrive in time; the fallback is deterministic.
    await page.route('**/fonts/*.woff2', (route) => route.abort());
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/scroll-carousel/');
    await ready(page);
    await page.mouse.move(0, 0);
    for (const name of names) {
      const selector = `[data-case="${name}"], [data-wire="${name}"]`;
      // Show only this example, so its position does not depend on text elsewhere on the page:
      // sub-pixel offsets from prose above would otherwise change the rounded screenshot size.
      const isolate = await page.addStyleTag({
        content: `.intro, .bench-bar, .case-head, .readout, .api, .code, .closing, .pattern > h3, .pattern > p, .wf-table-wrap { display: none !important; }
          main > section:not(:has(${selector})), .pattern:not(:has(${selector})) { display: none !important; }`,
      });
      await page.waitForTimeout(100);
      await expect(page.locator(selector)).toHaveScreenshot(`${name}-${width}.png`);
      await isolate.evaluate((style) => style.remove());
    }
  });
}
