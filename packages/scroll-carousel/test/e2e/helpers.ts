import { expect, type Page } from '@playwright/test';

export const ready = (page: Page) =>
  page.waitForFunction(
    () =>
      document.querySelectorAll('.sc[data-sc-ready]').length ==
      document.querySelectorAll('[data-case], [data-wire]').length,
  );

/** The carousel state of an example, plus its physical scroll position. */
export const state = (page: Page, name: string) =>
  page.evaluate(async (name) => {
    const { getCarousel } = await import('/scroll-carousel/lib/index.js');
    const root = document.querySelector<HTMLElement>(`[data-case="${name}"], [data-wire="${name}"]`)!;
    const carousel = getCarousel(root)!;
    return { ...carousel.state, left: Math.round(carousel.track.scrollLeft) };
  }, name);

/** Waits until the example has come to rest, then returns its state. */
export async function settled(page: Page, name: string) {
  let previous = '';
  await expect
    .poll(
      async () => {
        const current = JSON.stringify(await state(page, name));
        const stable = current == previous;
        previous = current;
        return stable;
      },
      { intervals: [250], timeout: 8000 },
    )
    .toBe(true);
  return state(page, name);
}

export const changes = (page: Page, name: string) =>
  page.evaluate(
    (name) => Number(document.querySelector(`[data-readout="${name}"]`)!.textContent!.match(/change events (\d+)/)![1]),
    name,
  );

export const call = (page: Page, name: string, method: string, ...args: unknown[]) =>
  page.evaluate(
    async ({ name, method, args }) => {
      const { getCarousel } = await import('/scroll-carousel/lib/index.js');
      const root = document.querySelector<HTMLElement>(`[data-case="${name}"], [data-wire="${name}"]`)!;
      (getCarousel(root) as any)[method](...args);
    },
    { name, method, args },
  );
