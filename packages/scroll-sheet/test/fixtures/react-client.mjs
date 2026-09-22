import { createElement, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as adapter from '../../dist/react.js';
import { App } from './app.mjs';

hydrateRoot(document.getElementById('app'), createElement(App, { h: createElement, adapter, useState }), {
  onRecoverableError: (error) => (window.__hydrationErrors ||= []).push(String(error)),
});
