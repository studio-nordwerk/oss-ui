// One small app for the React and Preact fixtures: a product row that opens on the sixth item.
// `h` is the framework's createElement, `Carousel` the adapter under test.
export const items = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

export const App = ({ h, Carousel }) =>
  h(
    'main',
    { style: { maxWidth: '900px', margin: '0 auto', padding: '16px', fontFamily: 'system-ui, sans-serif' } },
    h('h1', null, 'Fixture'),
    h(
      Carousel,
      {
        as: 'ul',
        label: 'Fixture items',
        perView: { 0: 2, 600: 3, 800: 4 },
        group: 'page',
        gap: 12,
        initial: 5,
        labels: { prev: 'Previous items', next: 'Next items' },
      },
      items.map((item) =>
        h(
          'div',
          {
            key: item.id,
            className: 'item',
            style: { height: '160px', background: '#e8ebe8', display: 'grid', placeItems: 'center' },
          },
          item.name,
        ),
      ),
    ),
    h('p', null, 'Below the carousel.'),
  );
