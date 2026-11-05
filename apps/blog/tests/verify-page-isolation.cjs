'use strict';
// Read-only actual HTML/Hexo Page database checks; never generate or clean.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { JSDOM } = require('jsdom');
const { inspectPageDOM } = require('./page-isolation-contract.cjs');
const publicDir = path.resolve(process.argv[2] || path.join(__dirname, '../public'));
const fixture = process.argv.includes('--fixture');
const routes = ['/', '/research-projects/', '/about/', '/archives/', '/categories/', '/tags/', '/categories/技术测试/', '/tags/Hexo/', '/2026/10/30/hello-firefly/', '/dynamic/'];
if (fixture) routes.push('/categories/隔离测试/', '/tags/IsolationOther/');
const results = [];
for (const route of routes) {
  const filename = path.join(publicDir, route, 'index.html');
  const dom = new JSDOM(fs.readFileSync(filename, 'utf8'));
  try {
    const result = inspectPageDOM(dom.window.document, route);
    if (route === '/categories/技术测试/' || route === '/tags/Hexo/') assert.deepEqual(result.postTitles, ['Firefly 主题初始化测试']);
    if (route === '/categories/隔离测试/' || route === '/tags/IsolationOther/') assert.deepEqual(result.postTitles, ['ISOLATION_OTHER_FIXTURE']);
    if (route === '/archives/' || route === '/') assert.equal(result.postTitles.length, fixture ? 2 : 1);
    if (fixture && route === '/') assert(result.dynamicWidgets > 0, 'original homepage dynamic region must render with a real fixture item');
    if (route === '/dynamic/') assert.equal(result.dynamicCount, fixture ? '1' : '0');
    results.push(result);
  } finally { dom.window.close(); }
}
const db = JSON.parse(fs.readFileSync(path.join(publicDir, '../db.json'), 'utf8'));
for (const type of ['research-projects', 'about']) {
  const page = db.models.Page.find(p => p.source === type + '/index.md');
  assert(page, 'must be native Page model, not Post or custom generator');
  assert.equal(page.layout, 'site-page'); assert.equal(page.type, type); assert.equal(page.path, type + '/index.html');
  assert(!db.models.Post.some(p => p.source === type + '/index.md'));
}
assert.equal(db.models.Post.length, fixture ? 2 : 1);
// Reverse guards: even CSS-hidden mixed prose/post lists must FAIL.
for (const mutation of ['<div hidden><h2>个人介绍</h2></div>', '<div class="post-list" style="display:none">wrong blog body</div>']) {
  const dom = new JSDOM(fs.readFileSync(path.join(publicDir, 'research-projects/index.html'), 'utf8'));
  try { dom.window.document.querySelector('#main-content').insertAdjacentHTML('beforeend', mutation); assert.throws(() => inspectPageDOM(dom.window.document, '/research-projects/'), /mixed|leaked/); }
  finally { dom.window.close(); }
}
console.log(JSON.stringify({ status: 'PASS', scope: fixture ? 'isolated counterexample fixture' : 'development preview, real content only', pages: results, nativePageModels: 2, hiddenContaminationReverseChecks: 2 }, null, 2));
