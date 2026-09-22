import { h, hydrate } from 'preact';
import { useState } from 'preact/hooks';
import * as adapter from '../../dist/preact.js';
import { App } from './app.mjs';

hydrate(h(App, { h, adapter, useState }), document.getElementById('app'));
