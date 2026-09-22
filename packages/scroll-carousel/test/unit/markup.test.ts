import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseStyle, baseVars, responsiveCss, templateLabels } from '../../src/markup.ts';

test('plain values become custom properties, numbers for lengths become px', () => {
  assert.deepEqual(baseVars({ perView: 3, gap: 12, offsetBefore: '1rem', snap: 'proximity', group: 'page' }), {
    '--sc-per-view': '3',
    '--sc-gap': '12px',
    '--sc-offset-before': '1rem',
    '--sc-snap': 'proximity',
    '--sc-group': 'page',
  });
});

test('centred sets its switch; controls only when hidden', () => {
  assert.deepEqual(baseVars({ centered: true, align: 'center' }), { '--sc-align': 'center', '--sc-centered': '1' });
  assert.deepEqual(baseVars({ controls: true }), {});
  assert.deepEqual(baseVars({ controls: false }), { '--sc-controls': 'none' });
});

test('responsive values: 0 is the base, the rest become container queries in order', () => {
  const props = { perView: { 0: 2, 900: 4, 600: 3 }, group: { 0: 2, 600: 3, 900: 4 }, controls: { 0: false, 600: true } };
  assert.deepEqual(baseVars(props), { '--sc-per-view': '2', '--sc-group': '2', '--sc-controls': 'none' });
  assert.equal(
    responsiveCss('x1', props),
    '@container sc (min-width:600px){[data-sc-id="x1"]>*{--sc-per-view:3;--sc-group:3;--sc-controls:initial}}' +
      '@container sc (min-width:900px){[data-sc-id="x1"]>*{--sc-per-view:4;--sc-group:4}}',
  );
});

test('nothing responsive, no CSS', () => {
  assert.equal(responsiveCss('x', { perView: 3, gap: 8 }), '');
});

test('baseStyle for templating languages', () => {
  assert.equal(baseStyle({ perView: 2.3, gap: 12 }), '--sc-per-view:2.3;--sc-gap:12px');
});

test('label templates', () => {
  const labels = templateLabels({ page: 'Slide {n} of {count}', status: 'Showing {first} to {last} of {count}' });
  assert.equal(labels.page!(2, 5), 'Slide 2 of 5');
  assert.equal(labels.status!(3, 6, 12), 'Showing 3 to 6 of 12');
  assert.deepEqual(Object.keys(templateLabels({})), []);
});

test('a separate template for a single visible slide', () => {
  const labels = templateLabels({ status: 'Items {first} to {last} of {count}', statusSingle: 'Item {first} of {count}' });
  assert.equal(labels.status!(2, 2, 6), 'Item 2 of 6');
  assert.equal(labels.status!(2, 4, 6), 'Items 2 to 4 of 6');
  assert.equal(templateLabels({ statusSingle: 'Item {first} of {count}' }).status!(3, 3, 6), 'Item 3 of 6');
});
