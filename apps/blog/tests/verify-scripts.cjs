'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { JSDOM } = require('jsdom');
const moment = require('moment-timezone');
const root = path.resolve(__dirname, '..');
const filters = [];
new Function('hexo', 'require', fs.readFileSync(path.join(root, 'scripts/beijing-time.js'), 'utf8'))({
  extend: { tag: { register() {} }, filter: { register(type, fn, priority) { filters.push({ type, fn, priority }); } } }
}, require);
const zone = filters.find(f => f.type === 'post_permalink').fn;
const post = { title: 'test', slug: 'test', custom: 'kept', date: moment.utc('2026-12-31T16:30:00Z'), categories: [] };
const original = post.date.toISOString();
assert(Object.keys(zone(post)).includes('custom'), 'Custom permalink fields must remain own enumerable properties');
assert.equal(zone(post).date.format('YYYY-MM-DD'), '2027-01-01');
assert.equal(post.date.toISOString(), original);
const corePermalink = require('../node_modules/hexo/dist/plugins/filter/post_permalink');
assert.equal(corePermalink.call({ config: { permalink: ':custom/', default_category: 'uncategorized' } }, zone(post)), 'kept/');
console.log('PASS: permalink fields retained and original Moment unchanged');
const normalize = filters.find(f => f.type === 'before_generate' && f.priority === 0).fn;
for (const bad of ['2026-02-30T00:30:00+08:00', '2026-10-31 00:30:00']) {
  assert.throws(() => normalize.call({ config: { timezone: 'Asia/Shanghai' }, model() {
    return { forEach(fn) { fn({ source: 'invalid-unit-fixture.md', raw: `---\ndate: ${bad}\n---\nx`, update() {} }); } };
  } }), /invalid date|must be ISO/);
}
console.log('PASS: date validator rejects impossible dates and missing explicit offsets (unit test)');

const policyFilters = [], policyHelpers = {};
new Function('hexo', 'require', fs.readFileSync(path.join(root, 'scripts/site-render-policy.js'), 'utf8'))({
  extend: { helper: { register(name, fn) { policyHelpers[name] = fn; } },
    filter: { register(type, fn) { policyFilters.push({ type, fn }); } } }
}, require);
const validateMusic = policyFilters.find(f => f.type === 'before_generate').fn;
for (const url of ['https://example.invalid/audio.mp3', '/home/orangepi/音乐/a.mp3', '/music/../a.mp3', '/music/"unsafe.mp3']) {
  assert.throws(() => validateMusic.call({ theme: { config: { music: { mode: 'local', local: {
    playlist: [{ name: 'unit fixture', artist: 'test', url }]
  } } } } }), /must be an encoded/);
}
const encoded = policyHelpers.site_music_json({ name: '</script><script>test</script>' });
assert(!encoded.includes('<')); assert.equal(JSON.parse(encoded).name, '</script><script>test</script>');
console.log('PASS: unsafe/external/filesystem music URLs rejected and safe JSON preserves text');

// Program/DOM simulation only: APlayer is a stub, no audio files or requests.
const dom = new JSDOM('<!doctype html><button id="nav-music-btn"></button><div class="music-widget"><div class="site-local-player"></div><div class="site-local-player"></div></div>', { runScripts: 'outside-only' });
const w = dom.window, d = w.document;
let created = 0, destroyed = 0, toggles = 0, lastOptions;
function Stub(options) {
  lastOptions = options;
  created++; this.container = options.container; this.audio = { currentTime: 0, paused: true };
  this.list = { index: 0, switch() {} }; this.volume = function() {};
  this.toggle = () => { toggles++; }; this.destroy = () => { destroyed++; };
}
const code = fs.readFileSync(path.join(root, 'source/js/site-local-music.js'), 'utf8');
w.__LOCAL_PLAYLIST = [];
w.eval(code); d.dispatchEvent(new w.Event('DOMContentLoaded'));
assert(d.querySelector('.site-local-player').textContent.includes('本地歌单为空'));
w.__LOCAL_PLAYLIST = [{ name: '<test fixture>', artist: 'test only', url: '/music/test-fixture.mp3' }];
d.dispatchEvent(new w.Event('pjax:complete')); assert.equal(created, 0, 'Missing CDN must be safe');
w.__SITE_LOCAL_MUSIC_OPTIONS = { volume: 0.3 };
w.APlayer = Stub; d.dispatchEvent(new w.Event('pjax:complete'));
assert.equal(created, 1, 'Desktop/mobile copies must share one active player');
assert.equal(lastOptions.volume, 0.3);
assert.equal(lastOptions.audio[0].name, '&lt;test fixture&gt;');
w.eval(code); d.dispatchEvent(new w.Event('pjax:complete')); assert.equal(created, 1);
assert.equal(w.aplayers.length, 1);
d.querySelector('.music-widget').remove(); d.dispatchEvent(new w.Event('pjax:complete'));
assert.equal(destroyed, 1); assert.equal(w.aplayers.length, 0); assert.equal(w.__aplayer, null);
const widget = d.createElement('div'); widget.className = 'music-widget'; widget.innerHTML = '<div class="site-local-player"></div>'; d.body.append(widget);
d.dispatchEvent(new w.Event('pjax:complete')); assert.equal(created, 2); assert.equal(w.aplayers.length, 1);
w.__aplayer.toggle(); assert.equal(toggles, 1);
w.dispatchEvent(new w.Event('pagehide')); assert.equal(destroyed, 2);
console.log('PASS: empty/missing-CDN/repeated-load/PJAX removal+return/single-instance/pagehide lifecycle (stub, no playback)');
dom.window.close();

// Review correction: exercise the real public init path, not its internal method.
const themeDom = new JSDOM('<!doctype html><button id="mobile-menu-toggle"></button><button id="nav-music-btn"></button>', { runScripts: 'outside-only' });
let clicks = 0;
themeDom.window.__aplayer = { toggle() { clicks++; } };
themeDom.window.eval(fs.readFileSync(path.join(root, 'themes/firefly/source/js/ui/scroll.js'), 'utf8'));
themeDom.window.ScrollManager.init(); themeDom.window.ScrollManager.init();
themeDom.window.document.getElementById('nav-music-btn').click();
assert.equal(clicks, 1, 'Actual ScrollManager.init has an initialized guard');
console.log('PASS: existing theme ScrollManager.init is idempotent; prior normal-PJAX duplicate-binding claim withdrawn');
themeDom.window.close();
