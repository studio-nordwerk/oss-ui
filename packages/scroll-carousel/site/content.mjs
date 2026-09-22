// Fictional storefront content and the markup helpers that render it. All names are made up.

export const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const euro = (value) => `€${value.toFixed(2)}`;

export const icons = {
  kettle:
    '<path d="M32 46c0-6 8-10 18-10s18 4 18 10v28a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6z"/><path d="M34 58 16 38" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M68 48c10 0 12 6 12 12s-4 12-12 12" fill="none" stroke="currentColor" stroke-width="5"/><rect x="44" y="29" width="12" height="6" rx="3"/>',
  grinder:
    '<rect x="37" y="38" width="26" height="44" rx="5"/><rect x="34" y="32" width="32" height="8" rx="3"/><path d="M50 32V22h22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="74" cy="22" r="5"/>',
  mug: '<path d="M26 36h40v28a14 14 0 0 1-14 14H40a14 14 0 0 1-14-14z"/><path d="M66 44h5a9 9 0 0 1 0 18h-5" fill="none" stroke="currentColor" stroke-width="5"/>',
  bag: '<path d="M33 20h34l5 12v46a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V32z"/><rect x="38" y="46" width="24" height="16" rx="3" fill="#fff" opacity=".55"/>',
  filter: '<path d="M24 32h52L60 72H40z"/><rect x="34" y="72" width="32" height="6" rx="3"/>',
  carafe: '<path d="M40 20h20v14l10 16v28a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4V50l10-16z"/>',
  scale:
    '<rect x="18" y="58" width="64" height="14" rx="4"/><rect x="28" y="50" width="44" height="7" rx="3"/><rect x="42" y="62" width="16" height="6" rx="1.5" fill="#fff" opacity=".6"/>',
  canister: '<rect x="32" y="36" width="36" height="44" rx="6"/><rect x="29" y="28" width="42" height="9" rx="3"/>',
  frother:
    '<rect x="44" y="18" width="12" height="36" rx="5"/><path d="M50 54v16" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="76" r="7" fill="none" stroke="currentColor" stroke-width="3"/>',
  bottle: '<path d="M43 18h14v12l7 10v38a4 4 0 0 1-4 4H40a4 4 0 0 1-4-4V40l7-10z"/>',
  cups: '<path d="M18 48h24v14a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z"/><path d="M54 48h24v14a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z"/><rect x="14" y="74" width="32" height="4" rx="2"/><rect x="50" y="74" width="32" height="4" rx="2"/>',
};

export const products = [
  { brand: 'Harlow & Pine', name: 'Gooseneck kettle, 0.9 l', price: 64, rating: 4.6, reviews: 212, badge: 'Bestseller', icon: 'kettle', tint: '#e6dccf' },
  { brand: 'Ostmark', name: 'Hand grinder with conical steel burrs and 40 grind settings', price: 89, was: 109, rating: 4.8, reviews: 1043, icon: 'grinder', tint: '#d9e2e6' },
  { brand: 'Fjordware', name: 'Stoneware mug, 350 ml', price: 18.5, rating: 4.7, reviews: 96, badge: 'New', icon: 'mug', tint: '#ecd9d2' },
  { brand: 'Kiln Coffee Co.', name: 'Espresso roast, whole beans, 1 kg', price: 27.9, rating: 4.5, reviews: 2310, icon: 'bag', tint: '#e3d9c6' },
  { brand: 'Ostmark', name: 'Paper filters, size 02, 100 pieces', price: 5.9, rating: 4.4, reviews: 388, icon: 'filter', tint: '#ece6d8' },
  { brand: 'Harlow & Pine', name: 'Glass carafe, 600 ml', price: 32, rating: 4.3, reviews: 57, icon: 'carafe', tint: '#d8e4df' },
  { brand: 'Tarekit', name: 'Brewing scale with timer, 0.1 g steps', price: 39, was: 49, rating: 4.6, reviews: 640, icon: 'scale', tint: '#dcdfe8' },
  { brand: 'Fjordware', name: 'Airtight bean canister, 500 g', price: 24, rating: 4.7, reviews: 175, icon: 'canister', tint: '#e2e6d6' },
  { brand: 'Tarekit', name: 'Handheld milk frother', price: 45, rating: 4.1, reviews: 83, icon: 'frother', tint: '#e8dfe8' },
  { brand: 'Kiln Coffee Co.', name: 'Decaf filter roast, 250 g', price: 9.4, rating: 4.6, reviews: 412, badge: 'New', icon: 'bag', tint: '#dfe6e0' },
  { brand: 'Harlow & Pine', name: 'Cold brew bottle, 1 l', price: 29, rating: 4.2, reviews: 120, icon: 'bottle', tint: '#d6e1ea' },
  { brand: 'Fjordware', name: 'Espresso cups, set of 2', price: 22, rating: 4.9, reviews: 64, icon: 'cups', tint: '#eadbd2' },
];

export const heroes = [
  { title: 'Autumn roasts are in', text: 'Four single origins, roasted this week and shipped within two days.', cta: 'Shop the roasts', href: '/c/autumn-roasts', icon: 'bag', bg: '#1e3a30', fg: '#f4f1e8', tint: '#a9c7a4' },
  { title: 'Free shipping from €40', text: 'On every order to Germany, Austria and the Netherlands.', cta: 'See delivery options', href: '/help/delivery', icon: 'canister', bg: '#1f2f52', fg: '#f1f4fb', tint: '#9fb5e0' },
  { title: 'Hand grinders, 20% off', text: 'Every burr grinder in the range, until Sunday night.', cta: 'Shop grinders', href: '/c/grinders', icon: 'grinder', bg: '#43264a', fg: '#f8f0f8', tint: '#d3a6d6' },
  { title: 'Pour-over class on Saturday', text: '10:00 in our Hamburg store. Six places left, beans included.', cta: 'Book a place', href: '/events/pour-over', icon: 'kettle', bg: '#553a10', fg: '#fbf3e3', tint: '#e0b867' },
  { title: 'Gift cards from €15', text: 'Delivered by email within minutes, valid for three years.', cta: 'Buy a gift card', href: '/gift-cards', icon: 'mug', bg: '#2a2d2c', fg: '#f2f3f2', tint: '#c9ccc9' },
];

export const guides = [
  { title: 'Dial in a hand grinder', text: 'Start coarse, taste, then go finer in small steps.', read: 6, icon: 'grinder', tint: '#d9e2e6' },
  { title: 'Why water matters more than beans', text: 'Hardness, temperature and what a filter jug changes.', read: 8, icon: 'carafe', tint: '#d8e4df' },
  { title: 'Pour-over in five steps', text: 'Bloom, pour, wait, pour again, and when to stop.', read: 4, icon: 'kettle', tint: '#e6dccf' },
  { title: 'Storing beans: what actually helps', text: 'Air, light and heat, ranked by how much they matter.', read: 5, icon: 'canister', tint: '#e2e6d6' },
  { title: 'Milk texture without a steam wand', text: 'A frother, a jar and the right temperature.', read: 7, icon: 'frother', tint: '#e8dfe8' },
  { title: 'Cold brew that keeps for a week', text: 'Ratio, grind and a clean bottle.', read: 5, icon: 'bottle', tint: '#d6e1ea' },
  { title: 'Descaling: how often, with what', text: 'Citric acid, vinegar or a descaler, and why it matters.', read: 3, icon: 'kettle', tint: '#ece6d8' },
];

export const categories = [
  ['All coffee', 214], ['Espresso', 86], ['Filter', 71], ['Decaf', 12], ['Single origin', 58], ['Blends', 27],
  ['Kettles', 19], ['Hand grinders', 23], ['Electric grinders', 31], ['Scales', 14], ['Filters and papers', 42],
  ['Mugs', 64], ['Cups and saucers', 38], ['Storage', 22], ['Cleaning', 17], ['Gift cards', 6], ['Sale', 48],
];

// --- Markup helpers --------------------------------------------------------------------------

export const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${Object.entries(icons)
  .filter(([, body]) => body)
  .map(([id, body]) => `<symbol id="i-${id}" viewBox="0 0 100 100" fill="currentColor">${body}</symbol>`)
  .join('')}</defs></svg>`;

export const pic = (icon, cls) => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#i-${icon}"></use></svg>`;
export const chevron = (dir) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 6 6 6-6 6'}"/></svg>`;
const heart = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';

export const arrows = (what) =>
  `<button class="sc-nav sc-prev" type="button" data-sc-prev aria-label="Previous ${what}">${chevron('prev')}</button>` +
  `<button class="sc-nav sc-next" type="button" data-sc-next aria-label="Next ${what}">${chevron('next')}</button>`;
export const status = '<p class="sc-status" data-sc-status aria-live="polite"></p>';

export function card(p) {
  const off = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
  const badge = off
    ? `<span class="badge badge--sale">−${off}%</span>`
    : p.badge
      ? `<span class="badge">${esc(p.badge)}</span>`
      : '';
  const price = off
    ? `<s><span class="visually-hidden">Was </span>${euro(p.was)}</s><span class="sale"><span class="visually-hidden">now </span>${euro(p.price)}</span>`
    : `<span>${euro(p.price)}</span>`;
  return `<li class="product">
  <article class="card">
    <div class="card-media" style="--tint:${p.tint}">${pic(p.icon, 'card-pic')}${badge}</div>
    <button class="wish" type="button" aria-pressed="false" aria-label="Save to wish list: ${esc(p.name)}">${heart}</button>
    <p class="card-brand">${esc(p.brand)}</p>
    <p class="card-name"><a href="/p/${slug(p.name)}">${esc(p.name)}</a></p>
    <p class="card-rating"><span class="stars" style="--rating:${p.rating}" aria-hidden="true"></span><span class="visually-hidden">Rated ${p.rating} out of 5 from </span>${p.reviews.toLocaleString('en-GB')} reviews</p>
    <p class="card-price">${price}</p>
  </article>
</li>`;
}

export function heroSlide(h, i) {
  return `<div class="hero-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${heroes.length}" style="--hero-bg:${h.bg};--hero-fg:${h.fg};--hero-tint:${h.tint}">
  <div class="hero-copy">
    <h3 class="hero-title">${esc(h.title)}</h3>
    <p class="hero-text">${esc(h.text)}</p>
    <a class="hero-cta" href="${h.href}">${esc(h.cta)}</a>
  </div>
  <div class="hero-art" aria-hidden="true">${pic(h.icon, '')}</div>
</div>`;
}

export function guide(g) {
  return `<li class="guide"><a href="/journal/${slug(g.title)}">
  <div class="guide-media" style="--tint:${g.tint}">${pic(g.icon, '')}</div>
  <p class="guide-title">${esc(g.title)}</p>
  <p class="guide-text">${esc(g.text)} ${g.read} min read.</p>
</a></li>`;
}

// 1 September to 11 October 2026; today is Monday 21 September, index 20.
const DAY = 86400000;
const TODAY = Date.UTC(2026, 8, 21);
function day(time) {
  const date = new Date(time);
  const fmt = (options) => date.toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });
  const closed = date.getUTCDay() === 0;
  const today = time === TODAY;
  const label = `${fmt({ weekday: 'long', day: 'numeric', month: 'long' })}${today ? ', today' : ''}${closed ? ', closed' : ''}`;
  return `<li data-date="${date.toISOString().slice(0, 10)}"${today ? ' data-sc-initial' : ''}><button class="day${today ? ' is-today' : ''}" type="button" aria-pressed="${today}"${closed ? ' disabled' : ''} aria-label="${label}"><span class="day-name">${fmt({ weekday: 'short' })}</span><span class="day-num">${date.getUTCDate()}</span><span class="day-month">${short(date)}</span></button></li>`;
}
const short = (date) => date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
export const days = Array.from({ length: 41 }, (_, i) => day(Date.UTC(2026, 8, 1) + i * DAY)).join('\n');

