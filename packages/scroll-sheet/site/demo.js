// Site wiring: attaches every sheet, shows its state and drives the settings bar. Everything the
// sheets do is in the package; this file only reports it.
import { attach, getSheet } from './lib/index.js';
import { history } from './lib/history.js';
import { keyboard } from './lib/keyboard.js';
import { drag } from './lib/drag.js';
import { attach as attachCarousel } from './carousel/index.js';
import { say } from './frame.js';

const params = new URLSearchParams(location.search);
const dialogs = [...document.querySelectorAll('dialog.ss')];
const settings = { script: !params.has('nojs'), history: params.get('history') !== 'off' };
const last = {};

const caseOf = (dialog) => dialog.closest('.case')?.id;

function mount(dialog) {
  getSheet(dialog)?.destroy();
  const plugins = [...(settings.history ? [history()] : []), keyboard(), drag()];
  attach(dialog, { plugins });
}

function show(id) {
  const out = document.querySelector(`[data-readout="${id}"]`);
  if (!out) return;
  const dialog = document.querySelector(`.case#${id} dialog.ss`);
  const sheet = dialog && getSheet(dialog);
  if (!sheet) {
    out.innerHTML = '<span>JavaScript off: the browser opens and closes the sheet on its own</span>';
    return;
  }
  const state = sheet.state;
  const info = last[id] ?? {};
  const snap = state.open
    ? state.snap == state.snapPoints.length - 1
      ? 'full'
      : `${state.snap + 1} of ${state.snapPoints.length}`
    : '–';
  out.innerHTML = [
    `<span${state.open ? ' class="is-on"' : ''}>open <b>${state.open}</b></span>`,
    `<span>snap <b>${snap}</b></span>`,
    `<span>closed by <b>${info.reason ?? '–'}</b></span>`,
    `<span>page kept at <b>${info.kept ?? '–'}</b></span>`,
  ].join('');
}

for (const dialog of dialogs) {
  const id = caseOf(dialog);
  let openedAt = 0;
  dialog.addEventListener('ss:open', () => {
    openedAt = Math.round(scrollY);
    last[id] = { ...last[id], kept: `${openedAt} px` };
    show(id);
  });
  dialog.addEventListener('ss:snap', () => show(id));
  dialog.addEventListener('ss:close', (event) => {
    const returned = dialog.returnValue ? ` (${dialog.returnValue})` : '';
    const now = Math.round(scrollY);
    last[id] = {
      reason: `${event.detail.reason}${returned}`,
      kept: now == openedAt ? `${now} px` : `moved ${openedAt} → ${now}`,
    };
    dialog.returnValue = '';
    show(id);
  });
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-demo-link]')) {
    event.preventDefault();
    say('Only an example: this link goes nowhere');
  }
});

// --- Settings bar -----------------------------------------------------------------------------

document.querySelector('.bench-bar').addEventListener('change', (event) => {
  const { name, value } = event.target;
  const next = new URL(location.href);
  if (name == 'script') {
    if (value == 'off') next.searchParams.set('nojs', '');
    else next.searchParams.delete('nojs');
    location.href = next;
  } else if (name == 'history') {
    settings.history = value == 'on';
    if (settings.script) dialogs.forEach(mount);
  } else if (name == 'dir') {
    document.documentElement.dir = value;
    if (value == 'rtl') next.searchParams.set('dir', 'rtl');
    else next.searchParams.delete('dir');
    history_.replaceState(history_.state, '', next);
  }
});
const history_ = window.history;

// --- Start ------------------------------------------------------------------------------------

if (params.get('dir') === 'rtl') document.querySelector('input[name="dir"][value="rtl"]').checked = true;
if (!settings.history) document.querySelector('input[name="history"][value="off"]').checked = true;
if (!settings.script) document.querySelector('input[name="script"][value="off"]').checked = true;
else dialogs.forEach(mount);
for (const section of document.querySelectorAll('.case[id]')) show(section.id);

// The lightbox holds a scroll-carousel, opened at the image whose thumbnail was pressed.
const lightbox = document.getElementById('lightbox-sheet');
if (settings.script && lightbox) {
  const carousel = attachCarousel(lightbox.querySelector('.sc'), {
    labels: {
      page: (n, count) => `Shade ${n} of ${count}`,
      status: (first, last, count) => `Shade ${first} of ${count}`,
    },
  });
  lightbox.addEventListener('ss:open', (event) => {
    const index = Number(event.detail.invoker?.dataset.slide ?? 0);
    // Measured while the dialog was closed: measure again now that it shows, then jump.
    carousel.update();
    carousel.slideTo(index, { instant: true });
  });
}

// The shadcn preview is a page of its own in an iframe (same origin): it takes the height of its
// content, so nothing scrolls inside it.
const preview = document.querySelector('iframe.preview');
preview?.addEventListener('load', () => {
  const page = preview.contentDocument?.documentElement;
  if (!page) return;
  const fit = () => (preview.style.height = `${page.scrollHeight}px`);
  new ResizeObserver(fit).observe(page);
  fit();
});
