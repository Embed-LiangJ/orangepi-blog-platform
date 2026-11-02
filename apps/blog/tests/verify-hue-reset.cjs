'use strict';

// Unit/build registration checks; actual colors and button clicks need Chromium.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const loader = read('scripts/site-hue-reset.js');
const adapter = read('source/js/site-hue-reset.js');
const originalPartial = read('themes/firefly/layout/_partials/scripts.ejs');
let partial = originalPartial;
let hook;
vm.runInNewContext(loader, { hexo: { extend: { filter: {
  register(name, fn) { assert.equal(name, 'before_generate'); hook = fn; }
} } } });
const context = { theme: {
  getView() { return { data: { _content: partial } }; },
  setView(name, data) { assert.equal(name, '_partials/scripts.ejs'); partial = data._content; }
} };
hook.call(context);
hook.call(context);
assert.equal((partial.match(/url_for\('\/js\/site-hue-reset.js'\)/g) || []).length, 1);
assert(partial.indexOf("url_for('/js/site-hue-reset.js')") > partial.indexOf("url_for('/js/ui/display-settings.js')"));
assert.equal(partial.replace('\n<script src="<%= url_for(\'/js/site-hue-reset.js\') %>"></script>', ''), originalPartial);
partial = 'upstream changed';
assert.throws(() => hook.call(context), /Firefly display settings script changed/);
console.log('PASS: one root-aware adapter after native settings; in-memory partial only; upstream guard');

for (const configured of [290, 240]) {
  const dom = new JSDOM(`<!doctype html><html style="--configHue:${configured};--hue:29"><body>
    <div id="display-settings-panel"><input class="hue-slider" type="range" max="360"></div>
    </body></html>`, { url: 'https://example.invalid/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('themes/firefly/source/js/core/settings.js'));
  w.eval(read('themes/firefly/source/js/ui/display-settings.js'));
  w.DisplaySettings.panel = w.document.getElementById('display-settings-panel');
  const preferences = { theme: 'dark', postListLayout: 'grid', cardBorderEnabled: 'false',
    cardFollowHueEnabled: 'true', wallpaperMode: 'overlay', overlayOpacity: '0.35',
    overlayBlur: '7', overlayCardOpacity: '0.65', sakuraEnabled: 'false', arbitrary: 'keep' };
  for (const [k, v] of Object.entries(preferences)) w.localStorage.setItem(k, v);
  w.eval(adapter);
  const installed = w.DisplaySettings.resetSection;
  w.eval(adapter);
  assert.equal(w.DisplaySettings.resetSection, installed, 'Repeated load must be idempotent');
  for (const hue of [29, 161, 240, 353]) {
    w.Settings.setHue(hue);
    const events = [];
    const listener = e => events.push(e.detail.hue);
    w.document.addEventListener('huechange', listener);
    w.DisplaySettings.resetSection('theme');
    w.document.removeEventListener('huechange', listener);
    assert.deepEqual(events, [configured], 'No transient native 165 event');
    assert.equal(w.Settings.getHue(), configured);
    assert.equal(w.localStorage.getItem('hue'), String(configured));
    assert.equal(w.document.documentElement.style.getPropertyValue('--hue'), String(configured));
    assert.equal(w.document.querySelector('.hue-slider').value, String(configured));
    for (const [k, v] of Object.entries(preferences)) assert.equal(w.localStorage.getItem(k), v, k);
  }
  w.document.documentElement.style.setProperty('--configHue', 'invalid');
  assert.throws(() => w.DisplaySettings.resetSection('theme'), /invalid Firefly/);
  assert.equal(w.Settings.getHue(), configured, 'Invalid config must not fall back to 165');
  w.DisplaySettings.resetSection('layout');
  assert.equal(w.Settings.getPostListLayout(), 'list', 'Non-theme reset delegates to native');
  dom.window.close();
}
console.log('PASS: config-derived defaults 290/240, four starting hues, one event, slider/storage/CSS agreement');
console.log('PASS: unrelated preferences intact; repeated loading safe; invalid config fails closed; layout reset unchanged');
console.log('NOTE: JSDOM/unit checks only; real rendered color and click/reload matrix required separately');
