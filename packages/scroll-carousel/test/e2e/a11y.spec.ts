import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ready } from './helpers.ts';

// Axe results do not depend on the engine; one is enough.
test.skip(({ browserName }) => browserName != 'chromium');

const examples = ['hero', 'bestsellers', 'phone', 'guides', 'chips', 'dates', 'few', 'fewClamped'];
const patterns = ['teasers', 'products', 'stage', 'gallery', 'belt'];

for (const script of [true, false]) {
  test(`axe finds no violations in any example, script ${script ? 'attached' : 'detached'}`, async ({ page }) => {
    await page.goto(script ? '/scroll-carousel/' : '/scroll-carousel/?nojs');
    if (script) await ready(page);
    for (const name of [...examples, ...patterns]) {
      const selector = `[data-case="${name}"], [data-wire="${name}"]`;
      const results = await new AxeBuilder({ page }).include(selector).analyze();
      expect(results.violations.map((v) => `${name}: ${v.id} (${v.nodes.length})`)).toEqual([]);
    }
  });
}
