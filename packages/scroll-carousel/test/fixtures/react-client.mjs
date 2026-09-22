import { createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Carousel } from '../../dist/react.js';
import { App } from './app.mjs';

hydrateRoot(document.getElementById('app'), createElement(App, { h: createElement, Carousel }), {
  onRecoverableError: (error) => (window.__hydrationErrors ||= []).push(String(error)),
});
