// What scripts/shadcn-smoke.mjs checks for this package's blocks in the fresh shadcn project:
// every carousel attaches, and the product row's controls work.
export async function check(page) {
  await page.waitForFunction(() => document.querySelectorAll('.sc[data-sc-ready]').length == 5, null, { timeout: 15000 });
  const row = page.locator('[aria-label="Bestsellers"]');
  await row.scrollIntoViewIfNeeded();
  await row.locator('[data-slot=scroll-carousel-next]').click();
  await page.waitForTimeout(1200);
  const report = await page.evaluate(() => ({
    rowScrolled: Math.abs(document.querySelector('[aria-label="Bestsellers"] [data-sc-track]').scrollLeft),
    dots: document.querySelectorAll('[aria-label="Bestsellers"] [data-slot=scroll-carousel-dots] button').length,
    playLabel: document.querySelector('[data-slot=scroll-carousel-play]')?.getAttribute('aria-label'),
  }));
  const problems = [];
  if (report.rowScrolled < 100) problems.push(`next did not scroll the product row (${report.rowScrolled}px)`);
  if (report.dots < 2) problems.push(`product row has ${report.dots} dots`);
  if (!report.playLabel) problems.push('the play button has no label');
  return { report, problems };
}
