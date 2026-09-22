// Wiring of the Swiper page: attaches the five wireframe carousels with the options their tables
// name. With ?nojs they stay native scrollers, as on the main page.
import { attach } from './lib/index.js';
import { drag } from './lib/drag.js';
import { autoplay } from './lib/autoplay.js';

const OPTIONS = {
  stage: () => ({ rewind: true, plugins: [autoplay({ delay: 5000 })] }),
  gallery: () => ({
    labels: {
      page: (n, count) => `Image ${n} of ${count}`,
      status: (first, last, count) => `Image ${first} of ${count}`,
    },
  }),
  teasers: () => ({ group: 3 }),
  products: () => ({ group: 'page' }),
};

if (!new URLSearchParams(location.search).has('nojs')) {
  for (const root of document.querySelectorAll('[data-wire]')) {
    const options = OPTIONS[root.dataset.wire]?.() ?? {};
    attach(root, { ...options, plugins: [...(options.plugins ?? []), drag()] });
  }
}
