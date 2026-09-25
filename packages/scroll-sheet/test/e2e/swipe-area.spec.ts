import { expect, test, type Page } from '@playwright/test';
import { PAGE, ready, settled, state } from './helpers.ts';

/** A sheet with the swipe area plugin; the plugin adds its strip at the sheet's edge. */
const addSheet = (page: Page, id: string, presentation: string) =>
  page.evaluate(
    async ({ id, presentation }) => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<dialog class="ss" id="${id}" aria-label="${id}" data-ss="${presentation}"><div class="ss-panel">
          <i class="ss-snap" style="--ss-at: 40dvh"></i><div class="ss-body" style="block-size: 90dvh"><p>Content</p></div>
        </div><div class="ss-rest"></div></dialog>`,
      );
      const base = document.baseURI;
      const { attach } = await import(new URL('lib/index.js', base).href);
      const { swipeArea } = await import(new URL('lib/swipe-area.js', base).href);
      attach(document.getElementById(id), { plugins: [swipeArea()] });
    },
    { id, presentation },
  );

const strip = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('[data-ss-edge]')!;
    const r = box.getBoundingClientRect();
    return { edge: box.dataset.ssEdge, x: r.x, y: r.y, width: r.width, height: r.height };
  });

/** A mouse swipe from (x, y) by (dx, dy) in steps, with a pause before letting go when slow. */
const swipe = async (page: Page, [x, y]: [number, number], [dx, dy]: [number, number], slow: boolean) => {
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = slow ? 20 : 4;
  for (let i = 1; i <= steps; i++) await page.mouse.move(x + (dx * i) / steps, y + (dy * i) / steps);
  if (slow) await page.waitForTimeout(150);
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  await ready(page);
});

test('a slow swipe up from the bottom edge opens the sheet at the snap point it ends near', async ({ page }) => {
  await addSheet(page, 'edge-sheet', 'bottom');
  const area = await strip(page);
  expect(area).toMatchObject({ edge: 'bottom', x: 0, width: 390 });
  expect(Math.round(area.y + area.height)).toBe(844);
  await swipe(page, [195, area.y + area.height / 2], [0, -330], true);
  const opened = await settled(page, 'edge-sheet');
  expect(opened.open).toBe(true);
  // Ended about 330px up: nearer 40dvh (338px) than the full height.
  expect(opened.snap).toBe(0);
});

test('a short swipe that is let go at once closes the sheet again', async ({ page }) => {
  await addSheet(page, 'edge-sheet', 'bottom');
  const area = await strip(page);
  await swipe(page, [195, area.y + area.height / 2], [0, -40], true);
  await expect.poll(async () => (await state(page, 'edge-sheet')).open).toBe(false);
});

test('a swipe along the edge does not open the sheet', async ({ page }) => {
  await addSheet(page, 'edge-sheet', 'bottom');
  const area = await strip(page);
  await swipe(page, [60, area.y + area.height / 2], [250, -10], false);
  await page.waitForTimeout(300);
  expect((await state(page, 'edge-sheet')).open).toBe(false);
});

test('an end drawer gets its strip at the right edge and opens with a swipe to the left', async ({ page }) => {
  await addSheet(page, 'edge-drawer', 'end');
  const area = await strip(page);
  expect(area).toMatchObject({ edge: 'right', y: 0, height: 844 });
  await swipe(page, [area.x + area.width / 2, 400], [-320, 0], false);
  const opened = await settled(page, 'edge-drawer');
  expect(opened.open).toBe(true);
  expect(opened.panel.right).toBe(opened.viewport.width);
});

test('the centred dialog gets no strip', async ({ page }) => {
  await addSheet(page, 'edge-dialog', 'center');
  expect((await strip(page)).edge).toBe('none');
});
