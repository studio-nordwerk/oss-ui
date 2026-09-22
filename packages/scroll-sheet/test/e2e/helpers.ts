import { expect, type Locator, type Page } from '@playwright/test';

export const PAGE = '/scroll-sheet/';

/** Waits until the script has attached to every sheet on the page; tracks which sheets scroll. */
export async function ready(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('dialog.ss')].every((d) => d.hasAttribute('data-ss-ready')),
  );
  await page.evaluate(() => {
    const scrolling = ((window as any).__scrolling = new Set<string>());
    for (const dialog of document.querySelectorAll('dialog.ss')) {
      dialog.addEventListener('scroll', () => scrolling.add(dialog.id));
      dialog.addEventListener('scrollend', () => scrolling.delete(dialog.id));
    }
  });
}

/** A sheet's state, its panel's box and the page's scroll position. */
export const state = (page: Page, id: string) =>
  page.evaluate(async (id) => {
    const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
    const dialog = document.getElementById(id) as HTMLDialogElement;
    const box = dialog.querySelector('.ss-panel')!.getBoundingClientRect();
    return {
      ...getSheet(dialog)!.state,
      panel: {
        top: Math.round(box.top),
        bottom: Math.round(box.bottom),
        left: Math.round(box.left),
        right: Math.round(box.right),
      },
      // The width the dialog gets: it ends at the scrollbar gutter the locked page keeps where
      // scrollbars take space (Linux, Windows).
      viewport: {
        width: Math.round(dialog.open ? dialog.getBoundingClientRect().width : innerWidth),
        height: innerHeight,
      },
      scrollY: Math.round(scrollY),
      expanded: dialog.hasAttribute('data-ss-expanded'),
      // Between a scroll and its scrollend (WebKitGTK pauses smooth scrolls without any event). Only
      // while open: WebKit sends a scroll but no scrollend for the reset right before close().
      scrolling: dialog.open && !!(window as any).__scrolling?.has(id),
    };
  }, id);

/** Waits until a sheet has come to rest (opening, snapping or closing), then returns its state. */
export async function settled(page: Page, id: string) {
  let previous = '';
  await expect
    .poll(
      async () => {
        const now = await state(page, id);
        const current = JSON.stringify(now);
        // An open sheet with snap points but at none of them is still on its way (WebKitGTK does
        // not animate smooth scrolling: it jumps after a pause without any scroll event).
        const moving = now.scrolling || (now.open && now.snapPoints.length > 0 && now.snap < 0);
        const stable = current == previous && !moving;
        previous = current;
        return stable;
      },
      { intervals: [200], timeout: 8000 },
    )
    .toBe(true);
  return state(page, id);
}

/** Records every ss:* event of every sheet in window.__events as "type id detail". */
export const recordEvents = (page: Page) =>
  page.evaluate(() => {
    const w = window as any;
    w.__events = [];
    for (const dialog of document.querySelectorAll('dialog.ss'))
      for (const type of ['open', 'close', 'snap', 'requestclose'])
        dialog.addEventListener(`ss:${type}`, (event) => {
          const detail = (event as CustomEvent).detail;
          w.__events.push(`${type} ${dialog.id} ${detail.reason ?? detail.snap ?? ''}`.trim());
        });
  });

export const events = (page: Page): Promise<string[]> => page.evaluate(() => (window as any).__events);

/** Clicks a trigger and waits for the sheet to rest open. */
export async function openWith(page: Page, trigger: Locator, id: string) {
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect.poll(async () => (await state(page, id)).open).toBe(true);
  return settled(page, id);
}

/** Scrolls a sheet the way a finished drag would: to its closed end. */
export const dragAway = (page: Page, id: string) =>
  page.evaluate((id) => {
    const dialog = document.getElementById(id)!;
    const start = getComputedStyle(dialog).getPropertyValue('--_ready-rest-order').trim() == '0';
    const rtl = getComputedStyle(dialog).direction == 'rtl';
    // Bottom sheets and end drawers close at scroll offset 0; start drawers at the far end.
    if (!start) dialog.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    else dialog.scrollTo({ left: (rtl ? -1 : 1) * dialog.scrollWidth, behavior: 'instant' });
  }, id);

export const focusedText = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return !el || el == document.body ? 'body' : (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
  });
