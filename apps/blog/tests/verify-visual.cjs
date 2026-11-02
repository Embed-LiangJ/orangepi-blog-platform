'use strict';

// Static/build-API checks only; actual CSS rendering needs a real browser.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createHash } = require('crypto');
const { JSDOM } = require('jsdom');
const Injector = require('hexo/dist/extend/injector');
const root = path.resolve(__dirname, '..');
const asset = 'css/site-anime-engineering.css';
const css = fs.readFileSync(path.join(root, 'source', asset), 'utf8');
const script = fs.readFileSync(path.join(root, 'scripts/site-visual-style.js'), 'utf8');
const digest = createHash('sha256').update(css).digest('hex').slice(0, 12);

for (const base of ['/', '/blog/']) {
  const injector = new Injector();
  const context = { require, hexo: {
    source_dir: path.join(root, 'source'),
    config: { root: base, url: 'https://example.invalid' + base },
    extend: { injector }
  } };
  // Re-evaluation must not register duplicate links for identical content.
  vm.runInNewContext(`(function() { ${script}\n})()`, context);
  vm.runInNewContext(`(function() { ${script}\n})()`, context);
  const html = injector.exec('<!doctype html><html><head><link rel="stylesheet" href="/theme.css"></head><body></body></html>');
  const dom = new JSDOM(html);
  const links = dom.window.document.querySelectorAll('link[data-site-visual]');
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute('href'), `${base}${asset}?v=${digest}`);
  assert.equal(dom.window.document.head.lastElementChild, links[0]);
  dom.window.close();
}
console.log('PASS: one content-versioned head-end CSS link; root and subpath URLs');

const dom = new JSDOM('<!doctype html><style></style>');
dom.window.document.querySelector('style').textContent = css;
const rules = Array.from(dom.window.document.styleSheets[0].cssRules);
assert(rules.length > 10, 'CSS must parse');
const tokens = { light: {}, dark: {} };
for (const rule of rules) {
  const targets = rule.selectorText === ':root, :root.dark' ? [tokens.light, tokens.dark]
    : rule.selectorText === ':root' ? [tokens.light] : rule.selectorText === ':root.dark' ? [tokens.dark] : [];
  for (const target of targets) for (let i = 0; i < rule.style.length; i++) {
    const name = rule.style[i];
    target[name] = rule.style.getPropertyValue(name).trim();
  }
}
assert(css.includes('html:root.dark body:not(.card-follow-theme-hue)'), 'Must outrank the native dark body token override');
const badge = rules.find(rule => rule.selectorText === '.categories-widget .category-count');
assert(badge, 'Use one readable badge mapping in both modes');
for (const [property, token] of [
  ['color', '--site-accent-text'], ['background', '--site-accent-soft']
]) {
  assert.equal(badge.style.getPropertyValue(property), `var(${token})`);
  assert.equal(badge.style.getPropertyPriority(property), 'important');
}
const dynamic = rules.find(rule => rule.conditionText === '(color: oklch(0.65 0.18 290))');
assert(dynamic, 'Keep dynamic accents behind a real OKLCH feature query');
for (const selector of [':root', ':root.dark']) {
  const rule = Array.from(dynamic.cssRules).find(rule => rule.selectorText === selector);
  assert(rule.style.getPropertyValue('--site-accent-hue').includes('var(--hue, 290)'));
  for (const token of ['--site-accent', '--site-accent-hover', '--site-accent-active',
    '--site-accent-soft', '--site-accent-soft-strong', '--site-accent-border', '--site-accent-text']) {
    assert(rule.style.getPropertyValue(token).includes('var(--site-accent-hue)'));
  }
  for (const token of ['--page-bg', '--card-bg', '--text-primary', '--line-divider']) {
    assert.equal(rule.style.getPropertyValue(token), '', 'Dynamic accents must not recolor neutral foundations');
  }
}
assert.equal(tokens.light['--primary'], 'var(--site-accent)');
assert.equal(tokens.dark['--primary'], 'var(--site-accent)', 'Do not fall back to native dark hue formulas');
assert.equal(tokens.dark['--md-sys-color-surface-variant'], 'var(--site-accent-soft)');
assert.equal(tokens.light['--md-sys-color-primary-container'], 'var(--site-accent-soft)');
assert.equal(tokens.light['--md-sys-color-on-primary-container'], 'var(--site-accent-text)');
assert.equal(tokens.light['--page-bg'], '#f1f4fa');
assert.equal(tokens.dark['--page-bg'], '#20212b');
dom.window.close();
assert.equal((css.match(/!important/g) || []).length, 7, 'Limit important overrides to native important rules and the inline More link');
const more = rules.find(rule => rule.selectorText === '.content-nav-bar .content-nav-more');
assert.equal(more.style.getPropertyValue('background'), 'var(--site-accent-soft)');
assert.equal(more.style.getPropertyValue('color'), 'var(--site-accent-text)');
assert(!/@import|@font-face|filter\s*:|backdrop-filter\s*:/.test(css));
// Layout changes are allowed only inside the reviewed archive scope.
function* styleRules(list) {
  for (const rule of list) {
    if (rule.style) yield rule;
    if (rule.cssRules) yield* styleRules(rule.cssRules);
  }
}
for (const rule of styleRules(rules)) {
  for (const property of ['display', 'position', 'width', 'height', 'min-width',
    'max-width', 'grid-template-columns', 'grid-template-areas', 'grid-area',
    'top', 'flex-wrap', 'margin-left']) {
    if (rule.style.getPropertyValue(property)) {
      assert(rule.selectorText.split(',').every(selector => selector.trim().startsWith('.archive-container ')),
        `Layout override outside archive: ${rule.selectorText} / ${property}`);
    }
  }
}
const archiveGrid = rules.find(rule => rule.selectorText === '.archive-container .archive-timeline-item');
assert.equal(archiveGrid.style.getPropertyValue('display'), 'grid');
assert.equal(archiveGrid.style.getPropertyValue('grid-template-columns'), 'fit-content(30%) minmax(0, 1fr)');
const mobile = rules.find(rule => rule.conditionText === '(max-width: 768px)');
const mobileGrid = Array.from(mobile.cssRules).find(rule => rule.selectorText === archiveGrid.selectorText);
assert.equal(mobileGrid.style.getPropertyValue('grid-template-columns'), 'minmax(0, 1fr)');
assert.equal(mobileGrid.style.getPropertyValue('grid-template-areas'), '"date" "title" "category" "tags"');
console.log('PASS: stylesheet parses; no new fonts or image filters; layout changes restricted to archive; 7 documented important exceptions');
console.log('PASS: archive desktop/mobile grid declarations (static assertions; real overlap checks are browser-only)');
console.log('PASS: unified badge/accent mappings, OKLCH feature query, stable neutral foundations (static only)');

function luminance(hex) {
  const rgb = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function ratio(a, b) {
  const pair = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (pair[0] + 0.05) / (pair[1] + 0.05);
}
for (const mode of ['light', 'dark']) {
  const colors = { ...tokens.light, ...(mode === 'dark' ? tokens.dark : {}) };
  function resolve(token, depth = 0) {
    assert(depth < 16, 'No cyclic accent aliases');
    const value = colors[token];
    const alias = value && value.match(/^var\((--[\w-]+)\)$/);
    return alias ? resolve(alias[1], depth + 1) : value;
  }
  assert(ratio(resolve('--site-accent-on-fill'), resolve('--site-accent-fill')) >= 4.5);
  for (const [front, back] of [
    ['--text-primary', '--card-bg'], ['--text-secondary', '--card-bg'],
    ['--text-tertiary', '--page-bg'], ['--primary', '--card-bg'],
    ['--primary', '--page-bg'], ['--primary', '--btn-plain-bg-hover'],
    ['--md-sys-color-on-primary-container', '--md-sys-color-primary-container'],
    ['--md-sys-color-on-surface-variant', '--md-sys-color-surface-variant']
  ]) {
    const fg = resolve(front), bg = resolve(back);
    assert(/^#[0-9a-f]{6}$/i.test(fg) && /^#[0-9a-f]{6}$/i.test(bg));
    const value = ratio(fg, bg);
    assert(value >= 4.5, `${mode} ${front} on ${back}: ${value.toFixed(2)} < 4.5`);
    console.log(`PASS contrast ${mode}: ${front} on ${back} = ${value.toFixed(2)}:1`);
  }
}
console.log('NOTE: above ratios cover HEX fallback tokens; dynamic OKLCH colors and interactions require the real browser matrix');
