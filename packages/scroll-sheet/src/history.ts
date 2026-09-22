/*
 * History plugin: the back button (Android) and the back swipe (iOS) close the top sheet instead of
 * leaving the page.
 *
 * Each open sheet adds one history entry for the same URL. The entry carries, in history.state,
 * the tokens of the sheets open at that point (`ssSheets`) and the token of the sheet that pushed it
 * (`ssEntry`). Policy:
 * - Back to an entry without a sheet's token closes that sheet ('history' reason).
 * - A sheet closed any other way steps back over its entry, but only while that exact entry is the
 *   current one: same `ssEntry`, same URL, and, where the Navigation API exists, the same entry key.
 *   After the app navigated on, the entry stays and is neutralised when reached.
 * - Forward onto an entry of a sheet that is already closed does not reopen it: the entry is
 *   rewritten without the stale tokens (replaceState), so the next back behaves normally.
 * - If an `ss:requestclose` listener cancels a close from history, the entry is pushed again.
 * - A sheet opened while such a step back is still under way pushes its entry after it arrived.
 * - The entry below a sheet's entry does not restore its scroll position (scrollRestoration
 *   'manual') until it is reached again, then gets its own mode back (`ssMode`): Safari on iOS
 *   restores the position it saved the first time the entry was left, so a second sheet opened
 *   further down the page would jump the page back up when it closes.
 * Chrome on Android closes a modal dialog on the back gesture by itself; that arrives as a normal
 * close and the plugin then removes the entry.
 */
import type { Plugin } from './index.ts';

const KEY = 'ssSheets';
const ENTRY = 'ssEntry';
const MODE = 'ssMode';
/** Tokens of the sheets that are open now, across all sheets using the plugin. */
const live = new Set<string>();
let listening = false;
/** Settles when a step back over a closed sheet's entry has arrived. */
let stepping: Promise<void> | null = null;
const stepBack = () => {
  stepping = new Promise((resolve) => {
    const arrived = () => {
      stepping = null;
      resolve();
    };
    window.addEventListener('popstate', arrived, { once: true });
  });
  window.history.back();
};

type NavigationLike = { currentEntry?: { key?: string } | null };
const navigation = (): NavigationLike | undefined => (window as unknown as { navigation?: NavigationLike }).navigation;

// This module's export is called history, so the browser's is always window.history here.
const state = () => window.history.state as Record<string, unknown> | null;
const tokens = (): string[] => {
  const list = state()?.[KEY];
  return Array.isArray(list) ? list : [];
};
const write = (list: string[], push: string | null) => {
  const next = { ...state(), [KEY]: list, [ENTRY]: push ?? state()?.[ENTRY] };
  if (!push) return window.history.replaceState(next, '');
  const mode = window.history.scrollRestoration;
  window.history.replaceState({ ...state(), [MODE]: mode }, '');
  window.history.scrollRestoration = 'manual';
  window.history.pushState({ ...next, [MODE]: undefined }, '');
  window.history.scrollRestoration = mode;
};

function neutralise() {
  // Runs after the browser's own scroll restoration for this step.
  const mode = state()?.[MODE] as ScrollRestoration | undefined;
  if (mode) window.history.scrollRestoration = mode;
  const list = tokens();
  const kept = list.filter((token) => live.has(token));
  if (kept.length != list.length) write(kept, null);
}

export function history(): Plugin {
  return (sheet) => {
    const { dialog } = sheet;
    let token = '';
    let entry: { url: string; key?: string } | null = null;
    const push = () => {
      write([...tokens(), token], token);
      entry = { url: location.href, key: navigation()?.currentEntry?.key };
    };
    const ours = () =>
      !!entry &&
      state()?.[ENTRY] == token &&
      location.href == entry.url &&
      (entry.key == undefined || navigation()?.currentEntry?.key == entry.key);
    const onOpen = () => {
      const mine = (token = Math.random().toString(36).slice(2));
      live.add(token);
      if (stepping) void stepping.then(() => token == mine && push());
      else push();
    };
    const onClose = (event: Event) => {
      const own = ours();
      live.delete(token);
      token = '';
      entry = null;
      if ((event as CustomEvent).detail.reason != 'history' && own) stepBack();
    };
    const onPop = () => {
      // No entry yet: the sheet waits for a step back to arrive before it pushes its own.
      if (token && entry && !tokens().includes(token)) {
        void sheet.requestClose('history').then((closed) => closed || push());
      }
    };
    dialog.addEventListener('ss:open', onOpen);
    dialog.addEventListener('ss:close', onClose);
    window.addEventListener('popstate', onPop);
    if (!listening) {
      listening = true;
      // After every sheet had its say about this entry, drop tokens of sheets that are gone.
      window.addEventListener('popstate', () => setTimeout(neutralise));
    }
    return () => {
      dialog.removeEventListener('ss:open', onOpen);
      dialog.removeEventListener('ss:close', onClose);
      window.removeEventListener('popstate', onPop);
      live.delete(token);
      // A push still waiting for a step back must not happen after this.
      token = '';
    };
  };
}
