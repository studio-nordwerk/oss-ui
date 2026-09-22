import { h, hydrate } from 'preact';
import { Carousel } from '../../dist/preact.js';
import { App } from './app.mjs';

hydrate(h(App, { h, Carousel }), document.getElementById('app'));
