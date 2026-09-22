import { expect, test, type Page } from '@playwright/test';

// Built by scripts/fixtures.mjs: the same sheets rendered on the server by each adapter.
const fixtures = [
  { name: 'React', url: '/scroll-sheet/fixtures/react.html', controlled: true },
  { name: 'Preact', url: '/scroll-sheet/fixtures/preact.html', controlled: true },
  { name: 'Astro', url: '/scroll-sheet/fixtures/astro/', controlled: false },
];

/** Attributes the core manages; everything else must match the server markup. */
const normalize = (page: Page, html: string) =>
  page.evaluate((html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const element of template.content.querySelectorAll('*'))
      for (const name of ['data-ss-ready', 'data-ss-expanded', 'data-ss-closing', 'open', 'style'])
        if (name != 'style' || element.tagName == 'DIALOG') element.removeAttribute(name);
    return template.innerHTML;
  }, html);

/** Where the fixture sheet's panel is, what has focus and whether it is expanded. */
const where = (page: Page) =>
  page.evaluate(() => {
    const dialog = document.getElementById('fixture-sheet')!;
    const focused = document.activeElement;
    return {
      top: Math.round(dialog.querySelector('.ss-panel')!.getBoundingClientRect().top),
      height: innerHeight,
      focused: focused ? `${focused.tagName} ${focused.getAttribute('aria-label') ?? focused.textContent}` : '',
      expanded: dialog.hasAttribute('data-ss-expanded'),
    };
  });

const sheetOpen = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((dialog: HTMLDialogElement) => dialog.open && dialog.matches(':modal'));

// Holds the adapter scripts back, so the server markup is live before anything hydrates.
const holdScripts = (page: Page, until: Promise<unknown>) =>
  page.route(/(-client\.js|_astro\/.*\.js)$/, async (route) => {
    await until;
    await route.continue();
  });

for (const { name, url, controlled } of fixtures) {
  test.describe(`${name} adapter`, () => {
    test('hydrates the server markup unchanged and without errors', async ({ page }) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) problems.push(message.text());
      });
      page.on('pageerror', (error) => problems.push(error.message));
      await page.addInitScript(() => {
        document.addEventListener('readystatechange', () => {
          if (document.readyState == 'interactive')
            (window as any).__before = document.querySelector('dialog.ss')!.outerHTML;
        });
      });
      await page.goto(url);
      await page.waitForSelector('dialog.ss[data-ss-ready]', { state: 'attached' });
      await page.waitForTimeout(200);
      const result = await page.evaluate(() => ({
        before: (window as any).__before as string,
        after: document.querySelector('dialog.ss')!.outerHTML,
        hydrationErrors: (window as any).__hydrationErrors ?? [],
      }));
      expect(problems).toEqual([]);
      expect(result.hydrationErrors).toEqual([]);
      expect(await normalize(page, result.after)).toBe(await normalize(page, result.before));
    });

    test('a sheet opened before hydration is taken over where it is', async ({ page }) => {
      let release = () => {};
      const released = new Promise<void>((resolve) => (release = resolve));
      await holdScripts(page, released);
      // Module scripts hold back DOMContentLoaded and load; wait only for the markup.
      await page.goto(url, { waitUntil: 'commit' });
      await page.waitForSelector('#open-fixture');
      // commandfor works without any script: the browser opens the dialog itself.
      await page.locator('#open-fixture').click();
      expect(await sheetOpen(page, 'fixture-sheet')).toBe(true);
      // Drag it down to its 50dvh snap point, still before any script runs.
      await page.waitForTimeout(500);
      await page.locator('#fixture-sheet').evaluate((dialog) => {
        const top = dialog.querySelector('.ss-panel')!.getBoundingClientRect().top;
        dialog.scrollBy({ top: -(innerHeight / 2 - top), behavior: 'instant' });
      });
      await page.waitForTimeout(300);
      const before = await where(page);
      expect(Math.abs(before.top - before.height / 2)).toBeLessThan(4);
      release();
      await page.waitForSelector('#fixture-sheet[data-ss-ready]', { state: 'attached' });
      await page.waitForTimeout(400);
      expect(await sheetOpen(page, 'fixture-sheet')).toBe(true);
      const after = await where(page);
      expect(Math.abs(after.top - before.top)).toBeLessThan(3);
      expect(after.focused).toBe(before.focused);
      expect(after.expanded).toBe(false);
      // Now the script's close path runs: the close button slides it out and reports it.
      const close = (await page.locator('#fixture-sheet .ss-close').boundingBox())!;
      await page.mouse.click(close.x + close.width / 2, close.y + close.height / 2);
      await expect.poll(() => sheetOpen(page, 'fixture-sheet')).toBe(false);
      if (controlled) {
        expect(await page.evaluate(() => (window as any).__changes)).toEqual([
          'uncontrolled true open',
          'uncontrolled false button',
        ]);
      }
    });

    if (controlled) {
      test('a controlled sheet reports user closes and closes when its prop turns false', async ({ page }) => {
        await page.goto(url);
        await page.waitForSelector('#controlled-sheet[data-ss-ready]', { state: 'attached' });
        await page.locator('#open-controlled').click();
        await expect.poll(() => sheetOpen(page, 'controlled-sheet')).toBe(true);
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await expect.poll(() => sheetOpen(page, 'controlled-sheet')).toBe(false);
        expect(await page.evaluate(() => (window as any).__changes)).toEqual([
          'controlled true open',
          'controlled false escape',
        ]);
      });

      test('a controlled sheet follows a quick false → true of its prop', async ({ page }) => {
        await page.goto(url);
        await page.waitForSelector('#controlled-sheet[data-ss-ready]', { state: 'attached' });
        await page.locator('#open-controlled').click();
        await expect.poll(() => sheetOpen(page, 'controlled-sheet')).toBe(true);
        await page.waitForTimeout(400);
        await page.locator('#flip-controlled').click();
        await page.waitForTimeout(1000);
        expect(await sheetOpen(page, 'controlled-sheet')).toBe(true);
      });

      test('the owner of a controlled sheet can refuse a close, and a form close is undone', async ({ page }) => {
        await page.goto(url);
        await page.waitForSelector('#controlled-sheet[data-ss-ready]', { state: 'attached' });
        await page.locator('#open-controlled').click();
        await expect.poll(() => sheetOpen(page, 'controlled-sheet')).toBe(true);
        await page.waitForTimeout(400);
        await page.evaluate(() => ((window as any).__refuse = true));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
        expect(await sheetOpen(page, 'controlled-sheet')).toBe(true);
        // A form with method="dialog" closes the dialog natively; the prop still says open.
        await page.locator('#submit-controlled').click();
        await page.waitForTimeout(800);
        expect(await sheetOpen(page, 'controlled-sheet')).toBe(true);
        const changes: string[] = await page.evaluate(() => (window as any).__changes);
        expect(changes.slice(0, 2)).toEqual(['controlled true open', 'controlled false escape']);
        expect(changes[2]).toMatch(/^controlled false /);
      });

      test('a sheet held closed by its prop does not stay open when a trigger opens it', async ({ page }) => {
        await page.goto(url);
        await page.waitForSelector('#closed-sheet[data-ss-ready]', { state: 'attached' });
        await page.locator('#open-closed').click();
        await page.waitForTimeout(1000);
        expect(await sheetOpen(page, 'closed-sheet')).toBe(false);
        expect(await page.evaluate(() => (window as any).__changes)).toEqual(['closed true open']);
      });
    }
  });
}
