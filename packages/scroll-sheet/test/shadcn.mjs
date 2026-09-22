// What scripts/shadcn-smoke.mjs checks for this package's blocks in the fresh shadcn project:
// every sheet attaches, the size picker opens at its snap point and closes on Escape, the filter
// is a drawer from the end edge at desktop width, and the contact form's buttons submit
// method="dialog" (Base UI buttons default to type="button").
export async function check(page) {
  await page.waitForFunction(() => document.querySelectorAll('dialog.ss[data-ss-ready]').length == 7, null, {
    timeout: 15000,
  });
  const problems = [];
  const openState = (text) =>
    page.evaluate((text) => {
      const trigger = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
      const dialog = document.getElementById(trigger.getAttribute('commandfor'));
      const panel = dialog.querySelector('.ss-panel').getBoundingClientRect();
      return {
        open: dialog.open,
        top: Math.round(panel.top),
        right: Math.round(panel.right),
        // The dialog ends at the scrollbar gutter the locked page keeps (Linux, Windows).
        width: Math.round(dialog.getBoundingClientRect().width),
        height: innerHeight,
      };
    }, text);

  await page.getByRole('button', { name: /Choose a size/ }).click();
  await page.waitForTimeout(900);
  const sizes = await openState('Choose a size');
  if (!sizes.open) problems.push('the size picker did not open');
  else if (Math.abs(sizes.height - sizes.top - sizes.height / 2) > 4)
    problems.push(`the size picker opened at ${sizes.top}px, not at its 50dvh snap point`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  if ((await openState('Choose a size')).open) problems.push('Escape did not close the size picker');

  await page.getByRole('button', { name: /^Filter/ }).click();
  await page.waitForTimeout(900);
  const filter = await openState('Filter');
  if (!filter.open || filter.right != filter.width)
    problems.push('the filter is not a drawer from the end edge at 1280px');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);

  await page.getByRole('button', { name: 'Write to us' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.waitForTimeout(600);
  const contact = await page.evaluate(() => {
    const trigger = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Write to us'));
    const dialog = document.getElementById(trigger.getAttribute('commandfor'));
    return { open: dialog.open, returnValue: dialog.returnValue };
  });
  if (contact.open || contact.returnValue != 'cancel')
    problems.push(`the contact form's Cancel did not close it with its value (${JSON.stringify(contact)})`);

  return { report: { sizes, filter, contact }, problems };
}
