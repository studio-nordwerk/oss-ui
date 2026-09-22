import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAGE, openWith, ready } from './helpers.ts';

// Axe results do not depend on the engine; one is enough.
test.skip(({ browserName }) => browserName != 'chromium');

for (const script of [true, false]) {
  test(`axe finds no violations on the page, script ${script ? 'attached' : 'detached'}`, async ({ page }) => {
    await page.goto(script ? PAGE : `${PAGE}?nojs`);
    if (script) await ready(page);
    const results = await new AxeBuilder({ page }).include('main').analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}

for (const [trigger, id] of [
  ['#sizes .tile-btn', 'size-sheet'],
  ['[commandfor="filter-sheet"][command="show-modal"]', 'filter-sheet'],
  ['[commandfor="menu-sheet"][command="show-modal"]', 'menu-sheet'],
  ['[commandfor="contact-sheet"][command="show-modal"]', 'contact-sheet'],
  ['[commandfor="lightbox-sheet"][command="show-modal"]', 'lightbox-sheet'],
]) {
  test(`axe finds no violations in the open ${id}`, async ({ page }) => {
    await page.goto(PAGE);
    await ready(page);
    await openWith(page, page.locator(trigger).first(), id);
    const results = await new AxeBuilder({ page }).include(`#${id}`).analyze();
    expect(results.violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
    // One named modal dialog, nothing else claims to be one.
    const dialog = await page.locator(`#${id}`).evaluate((d) => ({
      modal: d.matches(':modal'),
      name: d.getAttribute('aria-label') ?? document.getElementById(d.getAttribute('aria-labelledby')!)?.textContent,
      nested: d.querySelectorAll('[role="dialog"]').length,
    }));
    expect(dialog.modal).toBe(true);
    expect(dialog.name).toBeTruthy();
    expect(dialog.nested).toBe(0);
  });
}
