import { expect, test, type Page } from '@playwright/test';

// Built by scripts/fixtures.mjs: the same product row rendered on the server by each adapter.
const fixtures = [
  { name: 'React', url: '/scroll-carousel/fixtures/react.html' },
  { name: 'Preact', url: '/scroll-carousel/fixtures/preact.html' },
  { name: 'Astro', url: '/scroll-carousel/fixtures/astro/' },
];

/** Attributes and children the core manages; everything else must match the server markup. */
const normalize = (page: Page, html: string) =>
  page.evaluate((html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    const managed = [
      'data-sc-ready',
      'data-sc-overflow',
      'data-sc-start',
      'data-sc-end',
      'data-sc-drag',
      'data-sc-snap-off',
      'aria-disabled',
      'tabindex',
    ];
    for (const element of template.content.querySelectorAll('*'))
      for (const name of managed) element.removeAttribute(name);
    for (const element of template.content.querySelectorAll('[data-sc-dots], [data-sc-status]'))
      element.replaceChildren();
    return template.innerHTML;
  }, html);

for (const { name, url } of fixtures) {
  test.describe(`${name} adapter`, () => {
    test('hydrates the server markup unchanged, without a jump or a layout shift', async ({ page, browserName }) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) problems.push(message.text());
      });
      page.on('pageerror', (error) => problems.push(error.message));
      await page.addInitScript(() => {
        // Before any deferred or module script: the server markup and the start position.
        document.addEventListener('readystatechange', () => {
          if (document.readyState != 'interactive') return;
          const w = window as any;
          w.__before = document.querySelector('.sc')!.outerHTML;
          w.__startLeft = document.querySelector('[data-sc-track]')!.scrollLeft;
        });
      });
      // Hold the scripts back, so the server markup is painted before anything hydrates or attaches.
      await page.route(/(-client\.js|_astro\/.*\.js)$/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
      });
      await page.goto(url);
      await page.waitForSelector('.sc[data-sc-ready]');
      await page.waitForTimeout(300);

      const result = await page.evaluate(() => {
        const w = window as any;
        const root = document.querySelector<HTMLElement>('.sc')!;
        return {
          before: w.__before as string,
          after: root.outerHTML,
          startLeft: w.__startLeft as number,
          left: root.querySelector('[data-sc-track]')!.scrollLeft,
          hydrationErrors: w.__hydrationErrors ?? [],
          dots: [...root.querySelectorAll('.sc-dot')].map((dot) => dot.getAttribute('aria-label')),
        };
      });

      expect(problems).toEqual([]);
      expect(result.hydrationErrors).toEqual([]);
      expect(await normalize(page, result.after)).toBe(await normalize(page, result.before));
      // Positioned on the sixth item by the inline snippet while parsing; the script keeps it.
      expect(result.startLeft).toBeGreaterThan(0);
      expect(Math.abs(result.left - result.startLeft)).toBeLessThanOrEqual(1);
      expect(result.dots[0]).toMatch(/^Page 1 of \d$/);

      if (browserName == 'chromium') {
        const shift = await page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              let total = 0;
              new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as any[]) if (!entry.hadRecentInput) total += entry.value;
              }).observe({ type: 'layout-shift', buffered: true });
              setTimeout(() => resolve(total), 300);
            }),
        );
        expect(shift).toBe(0);
      }
    });

    test('the arrows work after hydration', async ({ page }) => {
      await page.goto(url);
      await page.waitForSelector('.sc[data-sc-ready]');
      const track = page.locator('[data-sc-track]');
      const before = await track.evaluate((element) => element.scrollLeft);
      await page.click('.sc-next');
      await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before + 50);
      await expect(page.locator('.sc-prev')).toHaveAttribute('aria-disabled', 'false');
    });
  });
}
