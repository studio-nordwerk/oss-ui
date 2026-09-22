import { expect, test } from '@playwright/test';
import { PAGE, dragAway, events, focusedText, openWith, ready, recordEvents, settled, state } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  await ready(page);
  await recordEvents(page);
});

const tileButton = (page: import('@playwright/test').Page, n = 2) => page.locator('#sizes .tile-btn').nth(n - 1);

test.describe('bottom sheet', () => {
  test('opens at its marked snap point, expands and moves between snap points', async ({ page }) => {
    const opened = await openWith(page, tileButton(page), 'size-sheet');
    expect(opened.snapPoints.length).toBe(2);
    expect(opened.snap).toBe(0);
    expect(opened.expanded).toBe(false);
    // The visible part is the marker's 50dvh.
    expect(Math.abs(opened.viewport.height - opened.panel.top - opened.viewport.height / 2)).toBeLessThan(3);

    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      getSheet(document.getElementById('size-sheet')).snapTo('full');
    });
    const full = await settled(page, 'size-sheet');
    expect(full.snap).toBe(1);
    expect(full.expanded).toBe(true);
    expect(full.panel.bottom).toBe(full.viewport.height);
    expect(await events(page)).toEqual(['open size-sheet 0', 'snap size-sheet 0', 'snap size-sheet 1']);
  });

  test('keeps the page where it was while open and after closing, without position: fixed', async ({ page }) => {
    await page.evaluate(() => document.querySelector('#stores')!.scrollIntoView());
    const before = await page.evaluate(() => Math.round(scrollY));
    expect(before).toBeGreaterThan(500);
    const open = await openWith(page, page.locator('[commandfor="store-sheet"][command="show-modal"]'), 'store-sheet');
    expect(open.scrollY).toBe(before);
    const positions = await page.evaluate(() => [
      getComputedStyle(document.body).position,
      getComputedStyle(document.documentElement).overflowY,
    ]);
    expect(positions).toEqual(['static', 'hidden']);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'store-sheet')).open).toBe(false);
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(before);
  });

  test('moves focus in, closes on Escape and returns focus to the trigger', async ({ page }) => {
    await tileButton(page, 3).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(true);
    expect(await page.evaluate(() => !!document.activeElement?.closest('#size-sheet'))).toBe(true);
    await settled(page, 'size-sheet');
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
    expect(await page.evaluate(() => document.activeElement == document.querySelectorAll('#sizes .tile-btn')[2])).toBe(
      true,
    );
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual(['close size-sheet escape']);
  });

  test('keeps Tab inside the open sheet', async ({ page, browserName }) => {
    test.skip(
      browserName == 'webkit',
      'WebKit moves Tab only between form fields unless the user turns on full keyboard access',
    );
    await openWith(page, tileButton(page), 'size-sheet');
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('#size-sheet') || document.activeElement == document.body,
        ),
      ).toBe(true);
    }
  });

  test('a click on the dimmed area closes it and reaches nothing underneath', async ({ page }) => {
    await openWith(page, tileButton(page), 'size-sheet');
    await page.evaluate(() => {
      const w = window as any;
      w.__pageClicks = 0;
      document.addEventListener(
        'click',
        (event) => {
          if (!(event.target as Element).closest('dialog')) w.__pageClicks++;
        },
        true,
      );
    });
    // Above the panel, on a spot where a page button would be.
    await page.mouse.click(40, 40);
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
    expect(await page.evaluate(() => (window as any).__pageClicks)).toBe(0);
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual(['close size-sheet backdrop']);
  });

  test('a press on the panel that ends on the dimmed area does not close it', async ({ page }) => {
    const open = await openWith(page, tileButton(page), 'size-sheet');
    await page.mouse.move(open.panel.left + 60, open.panel.top + 60);
    await page.mouse.down();
    await page.mouse.move(20, 20);
    await page.mouse.up();
    await page.waitForTimeout(400);
    expect((await state(page, 'size-sheet')).open).toBe(true);
  });

  test('dragged away it closes; a cancelled close snaps back', async ({ page }) => {
    await openWith(page, tileButton(page), 'size-sheet');
    await page.evaluate(() => {
      document
        .getElementById('size-sheet')!
        .addEventListener('ss:requestclose', (event) => event.preventDefault(), { once: true });
    });
    await dragAway(page, 'size-sheet');
    const back = await settled(page, 'size-sheet');
    expect(back.open).toBe(true);
    expect(back.snap).toBe(0);
    await dragAway(page, 'size-sheet');
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual(['close size-sheet swipe']);
  });

  test('nested sheets stack and return focus step by step', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openWith(page, tileButton(page), 'size-sheet');
    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      getSheet(document.getElementById('size-sheet')).snapTo('full', { instant: true });
    });
    await settled(page, 'size-sheet');
    await page.locator('#size-sheet .text-btn').focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page, 'guide-sheet')).open).toBe(true);
    await settled(page, 'guide-sheet');
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'guide-sheet')).open).toBe(false);
    expect((await state(page, 'size-sheet')).open).toBe(true);
    expect(await focusedText(page)).toBe('Size guide');
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
    expect(await focusedText(page)).toBe('Choose size');
    expect(errors).toEqual([]);
  });

  test('sits above any z-index on the page', async ({ page }) => {
    await page.evaluate(() => {
      const top = document.createElement('div');
      top.style.cssText = 'position:fixed;inset:auto 0 0 0;height:50vh;z-index:2147483647;background:red';
      top.id = 'highest';
      document.body.append(top);
    });
    const open = await openWith(page, tileButton(page), 'size-sheet');
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)!.closest('dialog')?.id ?? 'page', {
      x: open.panel.left + 40,
      y: open.viewport.height - 30,
    });
    expect(hit).toBe('size-sheet');
  });
});

test.describe('presentations', () => {
  test('the filter is a drawer from the end edge on wide screens and a bottom sheet on phones', async ({ page }) => {
    const wide = await openWith(
      page,
      page.locator('[commandfor="filter-sheet"][command="show-modal"]'),
      'filter-sheet',
    );
    expect(wide.panel.right).toBe(wide.viewport.width);
    expect(wide.panel.top).toBe(0);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'filter-sheet')).open).toBe(false);
    await page.setViewportSize({ width: 390, height: 844 });
    const narrow = await openWith(
      page,
      page.locator('[commandfor="filter-sheet"][command="show-modal"]'),
      'filter-sheet',
    );
    expect(narrow.panel.bottom).toBe(narrow.viewport.height);
    expect(narrow.panel.left).toBe(0);
    expect(narrow.panel.right).toBe(390);
  });

  test('drawers close when dragged towards their edge, left to right and right to left', async ({ page }) => {
    for (const dir of ['ltr', 'rtl']) {
      await page.goto(`${PAGE}?dir=${dir}`);
      await ready(page);
      await recordEvents(page);
      const menu = await openWith(page, page.locator('[commandfor="menu-sheet"][command="show-modal"]'), 'menu-sheet');
      if (dir == 'ltr') expect(menu.panel.left).toBe(0);
      else expect(menu.panel.right).toBe(menu.viewport.width);
      await dragAway(page, 'menu-sheet');
      await expect.poll(async () => (await state(page, 'menu-sheet')).open).toBe(false);
      expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual(['close menu-sheet swipe']);
    }
  });

  test('replace closes the open sheet before opening another', async ({ page }) => {
    await openWith(page, tileButton(page), 'size-sheet');
    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      getSheet(document.getElementById('cart-sheet')).open();
    });
    await settled(page, 'cart-sheet');
    expect((await state(page, 'size-sheet')).open).toBe(false);
    expect((await state(page, 'cart-sheet')).open).toBe(true);
    expect(await events(page)).toContain('close size-sheet replaced');
  });

  test('a form with method="dialog" closes the dialog with its return value', async ({ page }) => {
    await openWith(page, page.locator('[commandfor="contact-sheet"][command="show-modal"]'), 'contact-sheet');
    await page.locator('#contact-sheet button[value="cancel"]').click();
    await expect.poll(async () => (await state(page, 'contact-sheet')).open).toBe(false);
    await expect(page.locator('[data-readout="contact"]')).toContainText('native (cancel)');
  });
});

test.describe('history plugin', () => {
  test('back closes the top sheet and keeps the page and its address', async ({ page }) => {
    await page.evaluate(() => (location.hash = 'list'));
    const before = await page.evaluate(() => location.href);
    await openWith(page, tileButton(page), 'size-sheet');
    await page.goBack();
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
    expect(await page.evaluate(() => location.href)).toBe(before);
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual(['close size-sheet history']);
  });

  test('a sheet closed by its button removes its history entry', async ({ page }) => {
    const length = await page.evaluate(() => history.length);
    await openWith(page, tileButton(page), 'size-sheet');
    expect(await page.evaluate(() => history.length)).toBe(length + 1);
    await page.locator('#size-sheet .ss-close').click();
    await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
    // The entry was stepped back over; going back now leaves the page's own entry list.
    await expect.poll(() => page.evaluate(() => (history.state?.ssSheets ?? []).length)).toBe(0);
  });
});

test('closeTop closes the most recent sheet and reports whether one was open', async ({ page }) => {
  expect(
    await page.evaluate(async () => (await import(new URL('lib/index.js', document.baseURI).href)).closeTop()),
  ).toBe(false);
  await openWith(page, tileButton(page), 'size-sheet');
  expect(
    await page.evaluate(async () => (await import(new URL('lib/index.js', document.baseURI).href)).closeTop()),
  ).toBe(true);
  await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
});

test.describe('lifecycle', () => {
  // Without the history plugin, so only the core's own ordering is under test.
  test.beforeEach(async ({ page }) => {
    await page.goto(`${PAGE}?history=off`);
    await ready(page);
    await recordEvents(page);
  });
  const storeTrigger = (page: import('@playwright/test').Page) =>
    page.locator('[commandfor="store-sheet"][command="show-modal"]');

  test('open() during an animated close keeps the sheet open', async ({ page }) => {
    await openWith(page, storeTrigger(page), 'store-sheet');
    const closed = await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      const sheet = getSheet(document.getElementById('store-sheet'));
      const closing = sheet.requestClose();
      sheet.open();
      return closing;
    });
    expect(closed).toBe(false);
    await page.waitForTimeout(800);
    expect((await settled(page, 'store-sheet')).open).toBe(true);
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual([]);
  });

  test('an immediate close ends an animated one, and a later opening stays open', async ({ page }) => {
    await openWith(page, storeTrigger(page), 'store-sheet');
    const closed = await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      const sheet = getSheet(document.getElementById('store-sheet'));
      const closing = sheet.requestClose();
      sheet.close();
      const result = await closing;
      sheet.open();
      return result;
    });
    expect(closed).toBe(true);
    await page.waitForTimeout(800);
    expect((await settled(page, 'store-sheet')).open).toBe(true);
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual(['close store-sheet api']);
  });

  test('reopened in the same task as a close, the sheet stays usable', async ({ page }) => {
    await openWith(page, storeTrigger(page), 'store-sheet');
    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      const sheet = getSheet(document.getElementById('store-sheet'));
      void sheet.requestClose();
      sheet.close();
      sheet.open();
    });
    expect((await settled(page, 'store-sheet')).open).toBe(true);
    const closed = await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      const result = getSheet(document.getElementById('store-sheet')).requestClose();
      return Promise.race([result, new Promise((resolve) => setTimeout(() => resolve('stuck'), 3000))]);
    });
    expect(closed).toBe(true);
    expect((await events(page)).filter((e) => e.startsWith('close'))).toEqual([
      'close store-sheet api',
      'close store-sheet api',
    ]);
  });

  test('focus the app moves elsewhere right after a close stays there', async ({ page }) => {
    await openWith(page, storeTrigger(page), 'store-sheet');
    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      getSheet(document.getElementById('store-sheet')).close();
      document.querySelector<HTMLElement>('#sizes .tile-btn')!.focus();
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.activeElement == document.querySelector('#sizes .tile-btn'))).toBe(true);
  });

  test('a page too short to scroll gets no scrollbar gutter while a sheet is open', async ({ page }) => {
    const gutter = () => page.evaluate(() => document.documentElement.style.getPropertyValue('--ss-gutter'));
    await page.evaluate(() => {
      document.body.append(document.getElementById('store-sheet')!);
      const style = document.createElement('style');
      style.textContent = 'body > :not(dialog, script, style) { display: none !important; }';
      document.head.append(style);
    });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      getSheet(document.getElementById('store-sheet')).open();
    });
    await settled(page, 'store-sheet');
    expect(await gutter()).toBe('auto');
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'store-sheet')).open).toBe(false);
    expect(await gutter()).toBe('');
  });

  test('requestClose() resolves after ss:close, so opening right after it works', async ({ page }) => {
    await openWith(page, storeTrigger(page), 'store-sheet');
    const seen = await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      const sheet = getSheet(document.getElementById('store-sheet'));
      await sheet.requestClose();
      const seen = [...(window as any).__events];
      sheet.open();
      return seen;
    });
    expect(seen.at(-1)).toBe('close store-sheet api');
    expect((await settled(page, 'store-sheet')).open).toBe(true);
  });

  test('destroy() takes an open sheet off the stack', async ({ page }) => {
    await openWith(page, storeTrigger(page), 'store-sheet');
    const result = await page.evaluate(async () => {
      const lib = await import(new URL('lib/index.js', document.baseURI).href);
      const dialog = document.getElementById('store-sheet') as HTMLDialogElement;
      lib.getSheet(dialog).destroy();
      return {
        top: lib.topSheet() ?? null,
        closedOne: lib.closeTop(),
        ready: dialog.hasAttribute('data-ss-ready'),
      };
    });
    expect(result).toEqual({ top: null, closedOne: false, ready: false });
  });

  test('focus goes back to the invoker given to open(), not to what had focus before', async ({ page }) => {
    await tileButton(page, 1).focus();
    await page.evaluate(async () => {
      const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
      const invoker = document.querySelectorAll<HTMLElement>('#sizes .tile-btn')[2];
      getSheet(document.getElementById('store-sheet')).open({ invoker });
    });
    await settled(page, 'store-sheet');
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await state(page, 'store-sheet')).open).toBe(false);
    expect(await page.evaluate(() => document.activeElement == document.querySelectorAll('#sizes .tile-btn')[2])).toBe(
      true,
    );
  });

  test('crossing a breakpoint while open keeps the expanded state right', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // The store finder rests at 32dvh on phones; here it also becomes a drawer on wide screens.
    await page.evaluate(() => document.getElementById('store-sheet')!.setAttribute('data-ss', 'bottom md:end'));
    const partial = await openWith(page, storeTrigger(page), 'store-sheet');
    expect(partial.snap).toBe(0);
    expect(partial.expanded).toBe(false);
    await page.setViewportSize({ width: 1280, height: 800 });
    const drawer = await settled(page, 'store-sheet');
    expect(drawer.panel.right).toBe(1280);
    expect(drawer.expanded).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    // Back on the phone it shows in full, as the drawer did.
    const back = await settled(page, 'store-sheet');
    expect(back.panel.bottom).toBe(844);
    expect(back.snap).toBe(back.snapPoints.length - 1);
    expect(back.expanded).toBe(true);
  });

  test('a centred dialog scrolls long content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await openWith(page, page.locator('[commandfor="contact-sheet"][command="show-modal"]'), 'contact-sheet');
    const scrolled = await page.evaluate(() => {
      const body = document.querySelector<HTMLElement>('#contact-sheet .ss-body')!;
      body.append(
        ...Array.from({ length: 30 }, (_, i) =>
          Object.assign(document.createElement('p'), { textContent: `Line ${i}` }),
        ),
      );
      body.scrollTop = 200;
      return { overflow: getComputedStyle(body).overflowY, top: body.scrollTop };
    });
    expect(scrolled.overflow).toBe('auto');
    expect(scrolled.top).toBeGreaterThan(0);
  });
});

test('--ss-* tokens set on an ancestor reach the sheet', async ({ page }) => {
  await page.evaluate(() => document.body.style.setProperty('--ss-bg', 'rgb(1, 2, 3)'));
  await openWith(page, tileButton(page), 'size-sheet');
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('#size-sheet .ss-panel')!).backgroundColor),
  ).toBe('rgb(1, 2, 3)');
});

test('closing a sheet after the app navigated on does not undo the navigation', async ({ page }) => {
  await openWith(page, tileButton(page), 'size-sheet');
  // A router that copies history.state into its own entry.
  await page.evaluate(() => history.pushState({ ...history.state }, '', '#next'));
  await page.locator('#size-sheet .ss-close').click();
  await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => location.hash)).toBe('#next');
});

test('with the history plugin, a sheet reopened right after closing stays open', async ({ page }) => {
  await openWith(page, tileButton(page), 'size-sheet');
  await page.evaluate(async () => {
    const { getSheet } = await import(new URL('lib/index.js', document.baseURI).href);
    const sheet = getSheet(document.getElementById('size-sheet'));
    await sheet.requestClose();
    sheet.open();
  });
  await page.waitForTimeout(600);
  expect((await settled(page, 'size-sheet')).open).toBe(true);
  // Its entry is there again: back closes it.
  await page.goBack();
  await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
});

test('closing a sheet keeps the page where it is now, also on the second round', async ({ page }) => {
  const trigger = page.locator('[commandfor="store-sheet"][command="show-modal"]');
  const round = async (by: number) => {
    await page.evaluate((by) => scrollBy(0, by), by);
    const before = await page.evaluate(() => Math.round(scrollY));
    await openWith(page, trigger, 'store-sheet');
    await page.locator('#store-sheet .ss-close').click();
    await expect.poll(async () => (await state(page, 'store-sheet')).open).toBe(false);
    await page.waitForTimeout(500);
    return [before, await page.evaluate(() => Math.round(scrollY))];
  };
  await page.evaluate(() => document.querySelector('#stores')!.scrollIntoView());
  const [first, afterFirst] = await round(0);
  expect(afterFirst).toBe(first);
  // The page moved between the two sheets: stepping back must not restore the first position.
  const [second, afterSecond] = await round(-300);
  expect(second).not.toBe(first);
  expect(afterSecond).toBe(second);
});

test('the page entry restores scroll as before once no sheet entry is above it', async ({ page }) => {
  await openWith(page, tileButton(page), 'size-sheet');
  await page.locator('#size-sheet .ss-close').click();
  await expect.poll(async () => (await state(page, 'size-sheet')).open).toBe(false);
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe('auto');
});
