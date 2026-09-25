// What scripts/shadcn-smoke.mjs checks for this package's blocks in the fresh shadcn project:
// every sheet attaches, the size picker opens at its snap point and closes on Escape, the filter
// is a drawer from the end edge at desktop width, and the contact form's buttons submit
// method="dialog" (Base UI buttons default to type="button"). The drop-in drawer: a bottom drawer
// that closes on Escape, snap points with the page receding, a drawer from the right that a swipe from
// the right edge opens too, and one that Escape does not close.
export async function check(page) {
  await page.waitForFunction(() => document.querySelectorAll('dialog.ss[data-ss-ready]').length == 11, null, {
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

  const press = async (name) => {
    await page.getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(900);
  };
  await press('Daily goal');
  const goal = await openState('Daily goal');
  if (!goal.open || Math.abs(goal.height - goal.top - 0) < 100)
    problems.push('the drawer did not open from the bottom');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  if ((await openState('Daily goal')).open) problems.push('Escape did not close the drawer');

  await press('Route details');
  const route = await openState('Route details');
  const ground = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  if (!route.open || Math.abs(route.height - route.top - route.height * 0.4) > 4)
    problems.push(`the route drawer opened at ${route.top}px, not at its 0.4 snap point`);
  if (ground != 'rgb(0, 0, 0)') problems.push('shouldScaleBackground did not make the page recede');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);

  await press('Settings');
  const settings = await openState('Settings');
  if (!settings.open || settings.right != settings.width)
    problems.push('direction="right" is not a drawer from the right');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);

  // The swipe area at the right edge opens the settings drawer with a swipe to the left.
  const edge = await page.evaluate(() => {
    const box = document.querySelector('[data-slot="drawer-swipe-area"]').getBoundingClientRect();
    return box.left + box.width / 2;
  });
  await page.mouse.move(edge, 450);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(edge - i * 30, 450);
  await page.mouse.up();
  await page.waitForTimeout(900);
  const swiped = await openState('Settings');
  if (!swiped.open || swiped.right != swiped.width)
    problems.push('a swipe from the right edge did not open the settings drawer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);

  await press('Terms');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const terms = (await openState('Terms')).open;
  if (!terms) problems.push('dismissible={false} still closed on Escape');
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await page.waitForTimeout(900);
  if ((await openState('Terms')).open) problems.push('DrawerClose did not close the drawer that is not dismissible');

  return { report: { sizes, filter, contact, goal, route, settings }, problems };
}
