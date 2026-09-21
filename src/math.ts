/*
 * Pure positioning maths, no DOM. Positions are logical: 0 is the inline start of the scroll
 * content and values grow towards the end, so the same maths serves both text directions.
 */

export type Align = 'start' | 'center' | 'end';
export type Group = number | 'page';

export interface Geometry {
  /** Start of each slide in scroll-content coordinates, px. */
  starts: number[];
  /** Inline size of each slide, px. */
  sizes: number[];
  /** Width of the scrollport, px. */
  port: number;
  /** Scroll padding at the start and the end, px. */
  padStart: number;
  padEnd: number;
  /** Largest scroll position, px. */
  max: number;
  align: Align;
}

export interface Page {
  /** Scroll position of the page. */
  pos: number;
  /** Index of the first slide of the page. */
  first: number;
}

/** Two positions closer than this, in px, are the same place. */
export const EPS = 2;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Index of the value closest to `target`; the earliest one wins a tie. */
export const closest = (values: number[], target: number): number => {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - target) < Math.abs(values[best] - target) - 0.5) best = i;
  }
  return best;
};

/** The scroll position at which each slide is aligned, clamped to the scroll range. */
export const snapPositions = ({ starts, sizes, port, padStart, padEnd, max, align }: Geometry): number[] =>
  starts.map((start, i) =>
    clamp(
      align === 'center'
        ? start + sizes[i] / 2 - padStart - (port - padStart - padEnd) / 2
        : align === 'end'
          ? start + sizes[i] - port + padEnd
          : start - padStart,
      0,
      max,
    ),
  );

/**
 * The first slide of every page. Pages are counted outwards from `anchor` (the initial slide),
 * so the initial slide always starts a page and the first page may be shorter than the rest.
 * `group` is a number of slides, or 'page' for as many whole slides as fit in the view.
 */
export const pageStarts = (geo: Geometry, snaps: number[], group: Group, anchor: number): number[] => {
  const count = snaps.length;
  const firsts = new Set([0, anchor]);
  if (group === 'page') {
    // Slides from..last are fully visible when the view is scrolled to slide `from`.
    const fits = (from: number, last: number) =>
      geo.starts[last] + geo.sizes[last] <= snaps[from] + geo.port - geo.padEnd + EPS;
    for (let i = anchor; i < count && snaps[i] < geo.max - EPS; ) {
      let next = i + 1;
      while (next < count && fits(i, next)) next++;
      if (next >= count) break;
      firsts.add((i = next));
    }
    for (let i = anchor; i > 0; ) {
      let first = i - 1;
      while (first > 0 && fits(first - 1, i - 1)) first--;
      firsts.add((i = first));
    }
  } else {
    for (let i = anchor % group; i < count; i += group) firsts.add(i);
  }
  return [...firsts].filter((i) => i >= 0 && i < count).sort((a, b) => a - b);
};

/**
 * Pages at distinct positions, always ending at the end of the scroll range. A page's `first` is
 * the earliest slide aligned at its position, which is also the index reported there: at the
 * clamped end that is the first slide of the last full view, not the start of the last group.
 */
export const buildPages = (geo: Geometry, snaps: number[], group: Group, anchor: number): Page[] => {
  const pages: Page[] = [];
  const add = (pos: number) => {
    const first = snaps.findIndex((snap) => snap >= pos - EPS);
    pages.push({ pos, first: first < 0 ? snaps.length - 1 : first });
  };
  for (const start of pageStarts(geo, snaps, group, anchor)) {
    if (!pages.length || snaps[start] > pages[pages.length - 1].pos + EPS) add(snaps[start]);
  }
  if (pages.length && pages[pages.length - 1].pos < geo.max - EPS) add(geo.max);
  return pages;
};

/** The page that contains slide `index`. */
export const pageOf = (pages: Page[], index: number): number => {
  let page = 0;
  pages.forEach((candidate, i) => {
    if (candidate.first <= index) page = i;
  });
  return page;
};

/** First and last slide that are at least half visible at `pos`, or [-1, -1]. */
export const visibleRange = (pos: number, { starts, sizes, port }: Geometry): [number, number] => {
  let first = -1;
  let last = -1;
  starts.forEach((start, i) => {
    if (Math.min(start + sizes[i], pos + port) - Math.max(start, pos) >= sizes[i] / 2 - 0.5) {
      if (first < 0) first = i;
      last = i;
    }
  });
  return [first, last];
};
