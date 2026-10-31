import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import * as api from '../dist/esm/index.js';

async function setup(t, props = {}) {
  const dom = new JSDOM('<div id="mount"></div>');
  const saved = new Map();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const root = createRoot(document.getElementById('mount'));
  let unmounted = false;
  const unmount = async () => {
    if (!unmounted) {
      await act(() => root.unmount());
      unmounted = true;
    }
  };
  const render = async (extra = {}) =>
    act(() =>
      root.render(
        React.createElement(api.PrintLayout, {
          ...props,
          ...extra,
          children: React.createElement(
            api.PrintPage,
            { header: 'Heading', footer: 'Footer' },
            'Content',
          ),
        }),
      ),
    );
  t.after(async () => {
    await unmount();
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await render();
  return { dom, render, unmount };
}

test('ESM and CommonJS match and import is server-safe', () => {
  assert.deepEqual(
    Object.keys(createRequire(import.meta.url)('../dist/cjs/index.js')).sort(),
    Object.keys(api).sort(),
  );
  assert.throws(() => api.printDocument(), /browser window/);
});

test('paper dimensions are independent copies and landscape swaps axes', () => {
  assert.deepEqual(api.getPageDimensions(), { width: 210, height: 297 });
  assert.deepEqual(api.getPageDimensions('Letter', 'landscape'), { width: 279.4, height: 215.9 });
  assert.equal(api.getPageDimensions('Legal').height, 355.6);
  assert.equal(api.getPageDimensions('A5').width, 148);
  const copy = api.getPageDimensions();
  copy.width = 0;
  assert.equal(api.getPageDimensions().width, 210);
  assert.throws(() => api.getPageDimensions('__proto__'), RangeError);
  assert.throws(() => api.getPageDimensions('A4', 'diagonal'), RangeError);
});

test('normalizes margins with independent per-edge defaults and validates', () => {
  assert.deepEqual(api.normalizeMargins(10), { top: 10, right: 10, bottom: 10, left: 10 });
  assert.deepEqual(api.normalizeMargins({ left: 0 }), { top: 16, right: 16, bottom: 16, left: 0 });
  assert.throws(() => api.normalizeMargins(-1), RangeError);
  assert.throws(() => api.normalizeMargins({ top: Infinity }), RangeError);
});

test('rejects margins that consume the page and renders server markup safely', () => {
  assert.throws(
    () => renderToString(React.createElement(api.PrintLayout, { margins: 200 }, 'content')),
    RangeError,
  );
  const html = renderToString(
    React.createElement(api.PrintPage, { header: '<script>', footer: 'End' }, 'Text'),
  );
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('lp-print-content'));
});

test('preview renders paper variables, explicit page content, and validated print rule', async (t) => {
  await setup(t, { size: 'Letter', orientation: 'landscape', margins: { top: 8 } });
  const root = document.querySelector('.lp-print-layout');
  assert.equal(root.style.getPropertyValue('--print-width'), '279.4mm');
  assert.equal(root.style.getPropertyValue('--print-top'), '8mm');
  assert.ok(root.classList.contains('lp-print-preview'));
  assert.ok(root.querySelector('style').textContent.includes('@page { size: 279.4mm 215.9mm'));
  assert.equal(root.querySelector('header').textContent, 'Heading');
  assert.equal(root.querySelector('footer').textContent, 'Footer');
});

test('callbacks update without stale listeners and are removed on unmount', async (t) => {
  const calls = [];
  const { dom, render, unmount } = await setup(t, {
    onBeforePrint: () => calls.push('before'),
    onAfterPrint: () => calls.push('after'),
  });
  dom.window.dispatchEvent(new dom.window.Event('beforeprint'));
  dom.window.dispatchEvent(new dom.window.Event('afterprint'));
  await render({ onBeforePrint: () => calls.push('new') });
  dom.window.dispatchEvent(new dom.window.Event('beforeprint'));
  await unmount();
  dom.window.dispatchEvent(new dom.window.Event('beforeprint'));
  dom.window.dispatchEvent(new dom.window.Event('afterprint'));
  assert.deepEqual(calls, ['before', 'after', 'new']);
});

test('print helper calls the provided window exactly once', () => {
  let calls = 0;
  api.printDocument({
    print() {
      calls++;
    },
  });
  assert.equal(calls, 1);
  assert.throws(() => api.printDocument({}), /browser window/);
});
