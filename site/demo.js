// Site wiring: attaches every example, shows its state and drives the settings bar.
import { attach, getCarousel } from './lib/index.js';
import { drag } from './lib/drag.js';
import { autoplay } from './lib/autoplay.js';

const main = document.querySelector('main');
const settings = { drag: true, rewind: 'fade', script: true };
const changes = {};

const rewind = () => (settings.rewind === 'off' ? false : settings.rewind);
const dayName = (slide) => slide?.querySelector('.day')?.getAttribute('aria-label') ?? '';

/** Options per example; everything about layout lives in the CSS. */
const OPTIONS = {
  hero: () => ({
    rewind: rewind(),
    plugins: [autoplay({ delay: 5000 })],
    labels: { page: (n, count) => `Slide ${n} of ${count}`, status: (first, last, count) => `Slide ${first} of ${count}` },
  }),
  bestsellers: () => ({ rewind: rewind() }),
  guides: () => ({
    rewind: rewind(),
    labels: { page: (n, count) => `Guide ${n} of ${count}`, status: (first, last, count) => `Guide ${first} of ${count}` },
  }),
  dates: () => ({
    labels: { status: (first, last, count, slides) => `Showing ${dayName(slides[first - 1])} to ${dayName(slides[last - 1])}` },
  }),
  stage: () => ({ rewind: true, plugins: [autoplay({ delay: 5000 })] }),
  gallery: () => ({ labels: { page: (n, count) => `Image ${n} of ${count}`, status: (first, last, count) => `Image ${first} of ${count}` } }),
  teasers: () => ({ group: 3 }),
  products: () => ({ group: 'page' }),
};

const roots = [...document.querySelectorAll('[data-case], [data-wire]')];
const nameOf = (root) => root.dataset.case || root.dataset.wire;

function mount(root) {
  getCarousel(root)?.destroy();
  const options = OPTIONS[nameOf(root)]?.() ?? {};
  const plugins = [...(options.plugins ?? []), ...(settings.drag ? [drag()] : [])];
  attach(root, { ...options, plugins });
  show(root);
}

function unmount(root) {
  getCarousel(root)?.destroy();
  show(root);
}

function show(root) {
  const out = document.querySelector(`[data-readout="${nameOf(root)}"]`);
  if (!out) return;
  const carousel = getCarousel(root);
  if (!carousel) {
    out.innerHTML = '<span>Script detached: native scrolling only</span>';
    return;
  }
  const s = carousel.state;
  const flag = (on, name) => `<span${on ? ' class="is-on"' : ''}>${name} <b>${on}</b></span>`;
  out.innerHTML = [
    `<span>index <b>${s.index}</b></span>`,
    `<span>page <b>${s.page + 1}</b> of <b>${s.pageCount}</b></span>`,
    flag(s.isBeginning, 'isBeginning'),
    flag(s.isEnd, 'isEnd'),
    `<span>change events <b>${changes[nameOf(root)] ?? 0}</b></span>`,
  ].join('');
}

for (const root of roots) {
  root.addEventListener('sc:change', () => {
    changes[nameOf(root)] = (changes[nameOf(root)] ?? 0) + 1;
    show(root);
  });
}

// --- Settings bar -----------------------------------------------------------------------------

const store = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the choice just is not remembered.
    }
  },
};

const preset = document.getElementById('preset');
function applyPreset(value) {
  document.documentElement.dataset.preset = value;
  preset.value = value;
  // Control sizes can change with the style; measure again.
  requestAnimationFrame(() => roots.forEach((root) => getCarousel(root)?.update()));
}
preset.addEventListener('change', () => {
  applyPreset(preset.value);
  store.set('sc-preset', preset.value);
});
applyPreset(store.get('sc-preset') || 'neutral');

document.querySelector('.bench-bar').addEventListener('change', (event) => {
  const { name, value } = event.target;
  if (name === 'dir') {
    main.dir = value;
    for (const root of roots) {
      getCarousel(root)?.update();
      show(root);
    }
  } else if (name === 'drag') {
    settings.drag = value === 'on';
    if (settings.script) roots.forEach(mount);
  } else if (name === 'rewind') {
    settings.rewind = value;
    if (settings.script) roots.forEach(mount);
  } else if (name === 'script') {
    settings.script = value === 'on';
    roots.forEach(settings.script ? mount : unmount);
  }
});

document.getElementById('scrollend').textContent = 'onscrollend' in window ? 'native' : 'timer fallback';

const cls = document.getElementById('cls');
if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
  let total = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value;
    cls.textContent = total.toFixed(3);
  }).observe({ type: 'layout-shift', buffered: true });
} else {
  cls.textContent = 'not measurable here';
}

// --- Storefront behaviour ---------------------------------------------------------------------

const toast = document.querySelector('.toast');
let toastTimer = 0;
function say(text) {
  toast.textContent = text;
  toast.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 1800);
}

document.addEventListener('click', (event) => {
  const wish = event.target.closest('.wish');
  if (wish) {
    const on = wish.getAttribute('aria-pressed') !== 'true';
    wish.setAttribute('aria-pressed', String(on));
    say(on ? 'Saved to your wish list' : 'Removed from your wish list');
    return;
  }
  const day = event.target.closest('.day');
  if (day && !day.disabled) {
    for (const other of document.querySelectorAll('.day[aria-pressed="true"]')) other.setAttribute('aria-pressed', 'false');
    day.setAttribute('aria-pressed', 'true');
    document.querySelector('.pickup-choice').textContent = `Pick-up on ${day.getAttribute('aria-label').replace(', today', '')}`;
    return;
  }
  // Storefront links go nowhere here; the toast proves a click arrived (or did not, after a drag).
  const link = event.target.closest('a[href^="/"]');
  if (link) {
    event.preventDefault();
    say(`Link followed: ${link.textContent.trim().replace(/\s+/g, ' ')}`);
  }
});

// --- API panels -------------------------------------------------------------------------------

const bestsellers = document.querySelector('[data-case="bestsellers"]');
const bestsellerTrack = bestsellers.querySelector('[data-sc-track]');
let added = 0;
function sampleProduct() {
  const item = bestsellerTrack.firstElementChild.cloneNode(true);
  added += 1;
  const name = `Sample product ${added}`;
  const link = item.querySelector('.card-name a');
  link.textContent = name;
  link.setAttribute('href', `/p/sample-${added}`);
  item.querySelector('.card-brand').textContent = 'Added after attach';
  item.querySelector('.badge')?.remove();
  item.querySelector('.wish').setAttribute('aria-label', `Save to wish list: ${name}`);
  return item;
}

const bestsellerApi = document.querySelector('[data-api="bestsellers"]');
bestsellerApi.addEventListener('submit', (event) => {
  event.preventDefault();
  getCarousel(bestsellers)?.slideTo(Number(bestsellerApi.elements.index.value));
});
bestsellerApi.addEventListener('click', (event) => {
  const act = event.target.closest('[data-act]')?.dataset.act;
  if (act === 'append') bestsellerTrack.append(sampleProduct());
  if (act === 'prepend') bestsellerTrack.prepend(sampleProduct());
  if (act === 'remove' && bestsellerTrack.children.length > 1) bestsellerTrack.lastElementChild.remove();
});

const dateTrack = document.querySelector('[data-case="dates"] [data-sc-track]');
const DAY = 86400000;
function dayItem(time) {
  const date = new Date(time);
  const closed = date.getUTCDay() === 0;
  const format = (locale, options) => date.toLocaleDateString(locale, { timeZone: 'UTC', ...options });
  const item = document.createElement('li');
  item.dataset.date = date.toISOString().slice(0, 10);
  item.innerHTML =
    `<button class="day" type="button" aria-pressed="false"${closed ? ' disabled' : ''}` +
    ` aria-label="${format('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${closed ? ', closed' : ''}">` +
    `<span class="day-name">${format('en-GB', { weekday: 'short' })}</span>` +
    `<span class="day-num">${date.getUTCDate()}</span>` +
    `<span class="day-month">${format('en-US', { month: 'short' })}</span></button>`;
  return item;
}
document.querySelector('[data-api="dates"]').addEventListener('click', (event) => {
  const act = event.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  const edge = act === 'earlier' ? dateTrack.firstElementChild : dateTrack.lastElementChild;
  const base = Date.parse(`${edge.dataset.date}T00:00:00Z`);
  const week = Array.from({ length: 7 }, (_, i) => dayItem(base + (act === 'earlier' ? i - 7 : i + 1) * DAY));
  if (act === 'earlier') dateTrack.prepend(...week);
  else dateTrack.append(...week);
});

const phone = document.querySelector('[data-case="phone"]');
document.querySelector('[data-snap-choice]').addEventListener('change', (event) => {
  phone.querySelector('[data-sc-track]').style.setProperty('--sc-snap', event.target.value);
  getCarousel(phone)?.update();
});

// --- Start ------------------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
if (params.get('dir') === 'rtl') document.querySelector('input[name="dir"][value="rtl"]').checked = true;
if (params.has('nojs')) {
  settings.script = false;
  document.querySelector('input[name="script"][value="off"]').checked = true;
  roots.forEach(unmount);
} else {
  roots.forEach(mount);
}
