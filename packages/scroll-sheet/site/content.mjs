// Fictional content for the examples: products, sizes, brands, stores, a bag. Nothing here
// describes a real shop.
import { esc } from '../../../site/frame.mjs';

export { esc };

export const sizes = [
  ['30 ml', '19.95'],
  ['50 ml', '29.95'],
  ['75 ml', '39.95'],
  ['100 ml', '49.95'],
  ['150 ml', '64.95'],
];

export const brands = [
  'Alder & Ash',
  'Bramble',
  'Cinder Lane',
  'Dune Studio',
  'Elm Hollow',
  'Fernweh',
  'Grove No. 7',
  'Harbour Mist',
  'Isle Botanics',
  'Juniper Row',
  'Kestrel',
  'Linden Works',
  'Moss & Stone',
  'Nordlicht',
  'Oak Parlour',
  'Pale Tide',
  'Quill Garden',
  'Rowan Apothecary',
  'Saltmarsh',
  'Thistle & Co.',
];

export const categories = ['New in', 'Skin care', 'Fragrance', 'Make-up', 'Hair', 'Body', 'Gifts', 'Sale'];

export const stores = [
  ['Harbour Street 12', 'Lindholm', '0.4 km', 'Open until 20:00'],
  ['Market Square 3', 'Lindholm', '1.2 km', 'Open until 19:00'],
  ['Station Arcade', 'Westerby', '3.8 km', 'Open until 21:00'],
  ['Mill Lane 40', 'Westerby', '4.1 km', 'Closed today'],
  ['Riverside Mall', 'Osterfeld', '7.5 km', 'Open until 20:00'],
  ['Old Town 8', 'Osterfeld', '8.0 km', 'Open until 18:30'],
];

export const bag = [
  ['Rose Water Mist', 'Harbour Mist · 100 ml', '24.95'],
  ['Night Repair Cream', 'Isle Botanics · 50 ml', '39.00'],
  ['Cedar Hand Balm', 'Alder & Ash · 75 ml', '12.50'],
];

export const shades = ['Dune', 'Clay', 'Rosewood', 'Ember', 'Moss', 'Slate'];

/** A product tile whose button opens the size sheet. */
export const tile = (index) => `<li class="tile">
            <div class="tile-img" style="--hue: ${(index * 47) % 360}"></div>
            <p class="tile-name">Sample product ${index + 1}</p>
            <p class="tile-price">${(18.95 + index * 4).toFixed(2)} €</p>
            <button class="nw-btn nw-btn-line tile-btn" type="button" commandfor="size-sheet" command="show-modal">Choose size</button>
          </li>`;

export const closeButton = (sheet) =>
  `<button class="ss-close" type="button" commandfor="${sheet}" command="close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
