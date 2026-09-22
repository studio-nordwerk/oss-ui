import { test } from 'vite-plus/test';
import assert from 'node:assert/strict';
import { buildPages, closest, pageOf, pageStarts, snapPositions, visibleRange, type Geometry } from '../../src/math.ts';

/** A row of equal slides: `count` slides of `size` px with `gap` between, in a `port` px view. */
function row({
  count,
  size,
  gap = 0,
  port,
  before = 0,
  after = 0,
  align = 'start' as Geometry['align'],
  centeredEdge = 0,
}: {
  count: number;
  size: number;
  gap?: number;
  port: number;
  before?: number;
  after?: number;
  align?: Geometry['align'];
  centeredEdge?: number;
}): Geometry {
  const starts = Array.from({ length: count }, (_, i) => before + centeredEdge + i * (size + gap));
  const contentEnd = starts[count - 1] + size + after + centeredEdge;
  return {
    starts,
    sizes: Array(count).fill(size),
    port,
    padStart: before,
    padEnd: after,
    max: Math.max(0, contentEnd - port),
    align,
  };
}

/** A row of slides with the given widths. */
function widths(list: number[], { gap = 0, port }: { gap?: number; port: number }): Geometry {
  const starts: number[] = [];
  let x = 0;
  for (const width of list) {
    starts.push(x);
    x += width + gap;
  }
  const end = x - gap;
  return { starts, sizes: list, port, padStart: 0, padEnd: 0, max: Math.max(0, end - port), align: 'start' };
}

const pagesOf = (geo: Geometry, group: number | 'page', anchor = 0) =>
  buildPages(geo, snapPositions(geo), group, anchor);

test('closest picks the nearest value and the earliest on a tie', () => {
  assert.equal(closest([0, 100, 200], 140), 1);
  assert.equal(closest([0, 100, 200], 150), 1);
  assert.equal(closest([0, 300, 300, 300], 300), 1);
  assert.equal(closest([0, 100], -50), 0);
});

test('start alignment: slide starts, clamped to the scroll range', () => {
  // 10 slides of 100 px with 10 px gaps in a 430 px view: 4 per view.
  const geo = row({ count: 10, size: 100, gap: 10, port: 430 });
  assert.equal(geo.max, 1090 - 430);
  const snaps = snapPositions(geo);
  assert.deepEqual(snaps.slice(0, 4), [0, 110, 220, 330]);
  assert.deepEqual(snaps.slice(6), [660, 660, 660, 660]);
});

test('offsets: snapped slides line up after the leading offset', () => {
  const geo = row({ count: 6, size: 100, gap: 10, port: 332, before: 16, after: 16 });
  const snaps = snapPositions(geo);
  assert.equal(snaps[0], 0);
  assert.equal(snaps[1], 110);
  assert.equal(snaps[5], geo.max);
});

test('center alignment with centred padding reaches the first and last slide', () => {
  // 1.5 per view: slide 200 px in a 300 px view, 50 px padding on both ends.
  const geo = row({ count: 5, size: 200, gap: 0, port: 300, align: 'center', centeredEdge: 50 });
  const snaps = snapPositions(geo);
  assert.deepEqual(snaps, [0, 200, 400, 600, 800]);
  assert.equal(geo.max, 800);
});

test('center alignment without padding clamps the ends', () => {
  const geo = row({ count: 5, size: 200, gap: 0, port: 300, align: 'center' });
  const snaps = snapPositions(geo);
  assert.equal(snaps[0], 0);
  assert.equal(snaps[1], 150);
  assert.equal(snaps[4], geo.max);
});

test('end alignment', () => {
  const geo = row({ count: 4, size: 100, gap: 0, port: 250, align: 'end' });
  assert.deepEqual(snapPositions(geo), [0, 0, 50, 150]);
});

test('group of 1: one page per distinct position', () => {
  const geo = row({ count: 10, size: 100, gap: 10, port: 430 });
  const pages = pagesOf(geo, 1);
  assert.equal(pages.length, 7); // 10 - 4 + 1, the count a dot per slide shows
  assert.deepEqual(pages.at(-1), { pos: geo.max, first: 6 });
});

test('group of 4: the last page is shorter than a full group', () => {
  const geo = row({ count: 10, size: 100, gap: 10, port: 430 });
  const pages = pagesOf(geo, 4);
  assert.deepEqual(
    pages.map((page) => page.first),
    [0, 4, 6],
  );
  assert.deepEqual(
    pages.map((page) => page.pos),
    [0, 440, 660],
  );
  // Matches the common formula ceil((n - perView) / group) + 1.
  assert.equal(pages.length, Math.ceil((10 - 4) / 4) + 1);
});

test('group exactly filling the row', () => {
  const geo = row({ count: 12, size: 100, gap: 10, port: 430 });
  assert.deepEqual(
    pagesOf(geo, 4).map((page) => page.first),
    [0, 4, 8],
  );
});

test('group larger than the slide count gives two pages', () => {
  const geo = row({ count: 6, size: 100, gap: 10, port: 430 });
  assert.deepEqual(
    pagesOf(geo, 8).map((page) => page.first),
    [0, 2],
  );
});

test('no overflow: a single page', () => {
  const geo = row({ count: 2, size: 100, gap: 10, port: 430 });
  assert.equal(geo.max, 0);
  assert.deepEqual(pagesOf(geo, 1), [{ pos: 0, first: 0 }]);
  assert.deepEqual(pagesOf(geo, 'page'), [{ pos: 0, first: 0 }]);
});

test('no slides: no pages, whatever the anchor', () => {
  const geo = widths([], { port: 300 });
  assert.deepEqual(pagesOf(geo, 1), []);
  assert.deepEqual(pagesOf(geo, 'page', -1), []);
  assert.deepEqual(pagesOf(geo, 3, 5), []);
});

test('page groups with auto widths take as many whole slides as fit', () => {
  // Widths of chips; 8 px gaps; 300 px view.
  const geo = widths([80, 120, 60, 140, 90, 70, 110, 100], { gap: 8, port: 300 });
  const pages = pagesOf(geo, 'page');
  // From 0: 80+8+120+8+60 = 276 fits, the fourth (ends at 424) does not.
  assert.equal(pages[0].first, 0);
  assert.equal(pages[1].first, 3);
  assert.equal(pages.at(-1)!.pos, geo.max);
  // Every slide is fully visible on some page.
  const snaps = snapPositions(geo);
  geo.starts.forEach((start, i) => {
    const page = pages[pageOf(pages, i)];
    assert.ok(
      start >= page.pos - 2 && start + geo.sizes[i] <= page.pos + geo.port + 2,
      `slide ${i} visible on its page`,
    );
    assert.ok(snaps[i] >= 0);
  });
});

test('pages are counted from the anchor in both directions', () => {
  // 41 days of 70 px with 6 px gaps, 7 per view.
  const geo = row({ count: 41, size: 70, gap: 6, port: 7 * 76 - 6 });
  const firsts = pageStarts(geo, snapPositions(geo), 7, 20);
  assert.deepEqual(firsts, [0, 6, 13, 20, 27, 34]);
  const pages = pagesOf(geo, 'page', 20);
  assert.deepEqual(
    pages.map((page) => page.first),
    [0, 6, 13, 20, 27, 34],
  );
  assert.equal(pageOf(pages, 20), 3);
});

test('an anchor near the end merges into the last page', () => {
  const geo = row({ count: 10, size: 100, gap: 10, port: 430 });
  const pages = pagesOf(geo, 4, 8);
  assert.deepEqual(
    pages.map((page) => page.first),
    [0, 4, 6],
  );
  assert.equal(pageOf(pages, 8), 2);
});

test('pageOf finds the page that contains a slide', () => {
  const pages = [
    { pos: 0, first: 0 },
    { pos: 440, first: 4 },
    { pos: 660, first: 6 },
  ];
  assert.equal(pageOf(pages, 0), 0);
  assert.equal(pageOf(pages, 3), 0);
  assert.equal(pageOf(pages, 5), 1);
  assert.equal(pageOf(pages, 9), 2);
});

test('visibleRange: slides at least half visible', () => {
  const geo = row({ count: 10, size: 100, gap: 10, port: 430 });
  assert.deepEqual(visibleRange(0, geo), [0, 3]);
  assert.deepEqual(visibleRange(440, geo), [4, 7]);
  assert.deepEqual(visibleRange(55, geo), [1, 3]);
  assert.deepEqual(visibleRange(geo.max, geo), [6, 9]);
});
