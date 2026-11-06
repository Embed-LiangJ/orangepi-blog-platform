'use strict';
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const { createHash } = require('crypto');
const root = path.resolve(__dirname, '..');
const nativePath = path.join(root, 'themes/firefly/source/js/ui/post-layout.js');
const native = fs.readFileSync(nativePath, 'utf8');
const settings = fs.readFileSync(path.join(root, 'themes/firefly/source/js/core/settings.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'source/js/site-post-layout.js'), 'utf8');
const main = '<main class="post-list-container" data-layout="list"><div class="post-list" data-mode="list"><article class="post-card-item">real layout contract</article></div></main>';
function page(width, pref, patched) {
  const dom = new JSDOM('<html class="dark"><body>' + main + '<div class="layout-buttons"><button data-layout="list"></button><button data-layout="grid"></button></div></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
  const w = dom.window;
  w.innerWidth = width;
  w.matchMedia = () => ({ matches: true, addEventListener() {} });
  w.localStorage.setItem('theme', 'dark'); w.localStorage.setItem('hue', '290');
  if (pref) w.localStorage.setItem('postListLayout', pref);
  w.eval(settings); w.eval(native);
  if (patched) w.eval(adapter);
  w.Settings.init(); w.PostLayoutManager.init();
  return dom;
}
function mode(w, expected) {
  assert.equal(w.document.querySelector('main').dataset.layout, expected);
  assert.equal(w.document.querySelector('.post-list').dataset.mode, expected);
  assert.equal(w.Settings.getPostListLayout(), expected);
  assert.deepEqual([...w.document.querySelectorAll('.layout-buttons button.active')].map(e => e.dataset.layout), [expected]);
}
// Reverse checks: unchanged upstream really reproduces both defects.
{
  const dom = page(1920, 'grid', false), w = dom.window;
  mode(w, 'grid'); w.document.querySelector('main').outerHTML = main; w.PostLayoutManager.init();
  assert.throws(() => mode(w, 'grid'), /list.*grid/s); dom.window.close();
  const mobile = page(390, null, false);
  assert.equal(mobile.window.localStorage.getItem('postListLayout'), 'grid'); mobile.window.close();
}
let cases = 0;
for (const width of [1920, 390]) for (const pref of [null, 'list', 'grid']) {
  const dom = page(width, pref, true), w = dom.window, expected = pref || 'list';
  const init = w.PostLayoutManager.init; w.eval(adapter); assert.equal(w.PostLayoutManager.init, init, 'adapter loaded twice');
  mode(w, expected);
  for (let i = 0; i < 3; i++) { w.document.querySelector('main').outerHTML = main; w.PostLayoutManager.init(); mode(w, expected); }
  w.Settings.setPostListLayout('grid'); mode(w, 'grid');
  w.document.querySelector('main').outerHTML = main; w.PostLayoutManager.init(); mode(w, 'grid');
  w.Settings.setPostListLayout('list'); mode(w, 'list');
  w.document.querySelector('main').outerHTML = '<main class="site-static-page"><article data-site-page="about">待补充</article></main>';
  const about = w.document.querySelector('main').outerHTML;
  w.PostLayoutManager.init(); assert.equal(w.document.querySelector('main').outerHTML, about);
  assert.equal(w.localStorage.getItem('theme'), 'dark'); assert.equal(w.localStorage.getItem('hue'), '290');
  assert(w.document.documentElement.classList.contains('dark')); dom.window.close(); cases++;
}
// In-memory injection is uniquely anchored, content-versioned and fail-closed.
const partial = fs.readFileSync(path.join(root, 'themes/firefly/layout/_partials/scripts.ejs'), 'utf8');
const hook = fs.readFileSync(path.join(root, 'scripts/site-post-layout.js'), 'utf8');
function loadGate(content, incompatible = false) {
  let callback, writes = 0;
  const view = { data: { _content: content } };
  const context = {
    theme_dir: path.join(root, 'themes/firefly'), source_dir: path.join(root, 'source'),
    theme: { getView: () => view, setView: (_name, data) => { view.data = data; writes++; } }
  };
  vm.runInNewContext(hook, { require: name => name === 'fs' ? { readFileSync(p) {
    const data = fs.readFileSync(p);
    return incompatible && p === nativePath ? Buffer.concat([data, Buffer.from('// drift')]) : data;
  } } : require(name), hexo: { extend: { filter: { register(name, fn, priority) {
    assert.equal(name, 'before_generate'); assert.equal(priority, 3); callback = fn;
  } } } } });
  return { run: () => callback.call(context), view, writes: () => writes };
}
const gate = loadGate(partial); gate.run(); gate.run(); assert.equal(gate.writes(), 1);
const version = createHash('sha256').update(adapter).digest('hex').slice(0, 12);
const line = `<script src="<%= url_for('/js/site-post-layout.js') %>?v=${version}"></script>`;
assert.equal(gate.view.data._content.replace('\n' + line, ''), partial);
assert.throws(() => loadGate(partial, true).run(), /post layout changed/);
assert.throws(() => loadGate(partial.replace('/js/ui/post-layout.js', '/js/ui/unknown.js')).run(), /anchor changed/);
assert.throws(() => loadGate(partial + '\n/js/site-post-layout.js?v=conflict').run(), /Conflicting/);
console.log(`PASS: ${cases} native integration cases; 2 upstream reverse checks; injection version/idempotence/3 rejection guards; dark/hue/Page isolation unchanged`);
