/*
 * Helpers for rendering carousel markup on the server, used by the adapters and usable from any
 * JavaScript templating. Nothing here touches the DOM.
 */

/**
 * A value, or values by minimum container width in px, e.g. { 0: 2, 600: 3, 900: 4 }.
 * Widths are container widths: the carousel root is the query container.
 */
export type Responsive<T> = T | Record<number, T>;

export interface LayoutProps {
  /** Slides per view; fractions show part of the next slide. */
  perView?: Responsive<number>;
  /** A fixed slide size such as '18rem', or 'auto' for the content width. Wins over perView. */
  slideSize?: Responsive<string>;
  /** Numbers are px. */
  gap?: Responsive<number | string>;
  offsetBefore?: Responsive<number | string>;
  offsetAfter?: Responsive<number | string>;
  snap?: Responsive<'mandatory' | 'proximity' | 'none'>;
  align?: Responsive<'start' | 'center'>;
  /** Pad both ends so the first and last slide can reach the centre. Needs perView. */
  centered?: boolean;
  /** Slides per step of next and previous. */
  group?: Responsive<number | 'page'>;
  /** false hides arrows, dots and the play button, e.g. for free mode on small containers. */
  controls?: Responsive<boolean>;
}

const PROPERTIES: Record<string, string> = {
  perView: 'per-view',
  slideSize: 'slide-size',
  gap: 'gap',
  offsetBefore: 'offset-before',
  offsetAfter: 'offset-after',
  snap: 'snap',
  align: 'align',
  group: 'group',
  controls: 'controls',
};

const LENGTHS = new Set(['gap', 'offsetBefore', 'offsetAfter']);

function value(key: string, raw: unknown): string {
  // `initial` makes a custom property invalid, so var() falls back to the default again.
  if (key == 'controls') return raw ? 'initial' : 'none';
  // Values end up inside a <style> element; no markup may get through.
  return typeof raw == 'number' && LENGTHS.has(key) ? `${raw}px` : String(raw).replace(/[<>]/g, '');
}

const isResponsive = (raw: unknown): raw is Record<number, unknown> => typeof raw == 'object' && raw != null;

/** Custom properties for the root's style attribute: plain values and the 0 breakpoint. */
export function baseVars(props: LayoutProps): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, name] of Object.entries(PROPERTIES)) {
    const raw = props[key as keyof LayoutProps];
    const base = isResponsive(raw) ? raw[0] : raw;
    if (base !== undefined && !(key == 'controls' && base)) vars[`--sc-${name}`] = value(key, base);
  }
  if (props.centered) vars['--sc-centered'] = '1';
  return vars;
}

/** The same as a CSS declaration string, for templating languages. */
export const baseStyle = (props: LayoutProps): string =>
  Object.entries(baseVars(props))
    .map(([name, val]) => `${name}:${val}`)
    .join(';');

/**
 * Container-query rules for responsive values, scoped to [data-sc-id="id"]. Empty when nothing
 * is responsive. Render it in a <style> element inside the root.
 */
export function responsiveCss(id: string, props: LayoutProps): string {
  const rules = new Map<number, string[]>();
  for (const [key, name] of Object.entries(PROPERTIES)) {
    const raw = props[key as keyof LayoutProps];
    if (!isResponsive(raw)) continue;
    for (const [width, val] of Object.entries(raw)) {
      if (+width <= 0) continue;
      if (!rules.has(+width)) rules.set(+width, []);
      rules.get(+width)!.push(`--sc-${name}:${value(key, val)}`);
    }
  }
  return [...rules]
    .sort(([a], [b]) => a - b)
    // On every child of the root: the track takes the layout values, the controls --sc-controls.
    .map(([width, decls]) => `@container sc (min-width:${width}px){[data-sc-id="${id}"]>*{${decls.join(';')}}}`)
    .join('');
}

/**
 * Inline script to render immediately after a carousel that opens on a later slide. It sets the
 * start position before the first paint, so a deferred or module script finds it in place.
 * Start alignment only. It expects the root as its previous sibling.
 */
export const PRE_POSITION =
  "(function(r){var t=r.querySelector('[data-sc-track]'),s=t&&t.querySelector('[data-sc-initial]'),f=t&&t.firstElementChild;" +
  "if(!s||s==f)return;var a=s.getBoundingClientRect(),b=f.getBoundingClientRect();" +
  "t.scrollLeft=getComputedStyle(t).direction=='rtl'?a.right-b.right:a.left-b.left})(document.currentScript.previousElementSibling)";

/**
 * Label templates such as 'Slide {n} of {count}' turned into label functions. `statusSingle`
 * is used when only one slide is visible, e.g. 'Item {first} of {count}' next to a `status` of
 * 'Items {first} to {last} of {count}'.
 */
export function templateLabels(templates: { page?: string; status?: string; statusSingle?: string } = {}) {
  const fill = (template: string, values: Record<string, number>) =>
    template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
  const status = templates.status || templates.statusSingle;
  return {
    ...(templates.page && { page: (n: number, count: number) => fill(templates.page!, { n, count }) }),
    ...(status && {
      status: (first: number, last: number, count: number) =>
        fill(first == last && templates.statusSingle ? templates.statusSingle : status, { first, last, count }),
    }),
  };
}
