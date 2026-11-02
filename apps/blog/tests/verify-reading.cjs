'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
(async () => {
  for (const base of ['/', '/blog/']) {
    let filter;
    const hexo = { source_dir: path.join(root, 'source'), config: { root: base, url: 'https://example.invalid' + base },
      extend: { filter: { register(name, fn) { assert.equal(name, 'after_render:html'); filter = fn; } } } };
    vm.runInNewContext(read('scripts/site-article-reading.js'), { require, hexo });
    const original = '<!doctype html><html><head></head><body><main>text</main></body></html>';
    const html = filter.call(hexo, filter.call(hexo, original));
    const dom = new JSDOM(html);
    assert.equal(dom.window.document.querySelectorAll('link[data-site-reading]').length, 1);
    assert.equal(dom.window.document.querySelectorAll('script[data-site-reading]').length, 1);
    assert(dom.window.document.querySelector('link[data-site-reading]').getAttribute('href').startsWith(base + 'css/'));
    assert(dom.window.document.querySelector('script[data-site-reading]').getAttribute('src').startsWith(base + 'js/'));
    assert.equal(filter.call(hexo, '<p>partial</p>'), '<p>partial</p>');
    dom.window.close();
  }
  const dom = new JSDOM('<!doctype html><div class="post-content"><div class="code-block-wrapper"><button class="code-copy-btn">copy</button><figure><table><tr><td class="gutter"><pre>123</pre></td><td class="code"><pre><span class="line">const x = &quot;中文 &lt;tag&gt; &amp; 123&quot;;</span><br><span class="line">console.log(x);</span><br></pre></td></tr></table></figure></div></div>', { url: 'https://example.invalid/', runScripts: 'outside-only' });
  const w = dom.window, calls = [];
  w.navigator.clipboard = { writeText: async text => calls.push(text) };
  let nativeCalls = 0;
  w.document.querySelector('button').addEventListener('click', () => nativeCalls++);
  w.eval(read('source/js/site-article-reading.js'));
  w.eval(read('source/js/site-article-reading.js'));
  w.document.querySelector('button').click();
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(calls, ['const x = "中文 <tag> & 123";\nconsole.log(x);\n']);
  assert.equal(nativeCalls, 0);
  assert.equal(w.document.querySelector('button').getAttribute('aria-label'), '复制成功');
  w.navigator.clipboard.writeText = async () => { throw Error('permission denied'); };
  w.document.querySelector('button').click();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(w.document.querySelector('button').getAttribute('aria-label'), '复制失败，请手动选择代码');
  dom.window.close();
  const tocDom = new JSDOM('<!doctype html><div id="toc-body"></div><article class="post-container"><div class="post-content-card"><div class="post-content"><h2 id="safe">&lt;tag&gt; 中文</h2><h3>Second</h3></div></div></article>', { url: 'https://example.invalid/', runScripts: 'outside-only' });
  const t = tocDom.window, observers = [];
  t.IntersectionObserver = class {
    constructor() { this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const mathRoots = [];
  t.renderMathInElement = element => mathRoots.push(element);
  t.eval(read('themes/firefly/source/js/ui/toc.js'));
  t.eval(read('source/js/site-article-reading.js'));
  t.renderMathInElement(t.document.body, {});
  assert.equal(mathRoots[0], t.document.querySelector('.post-content'));
  t.TOC.init(); t.TOC.init(); t.TOC.init();
  assert.equal(observers.filter(o => !o.disconnected).length, 1);
  assert.equal(t.document.querySelectorAll('.site-mobile-toc').length, 1);
  assert.equal(t.document.querySelectorAll('#toc-body .toc-item').length, 2);
  assert.equal(t.document.querySelector('#toc-body a').textContent, '<tag> 中文');
  assert.equal(t.document.querySelector('#toc-body tag'), null);
  t.document.querySelector('.post-content').innerHTML = '<h2 id="new">New article</h2>';
  t.TOC.init();
  assert.equal(t.document.querySelector('#toc-body').textContent, 'New article');
  assert.equal(t.document.querySelectorAll('.site-mobile-toc').length, 1);
  assert.equal(observers.filter(o => !o.disconnected).length, 1);
  t.document.querySelector('.post-container').remove();
  t.renderMathInElement(t.document.body, {});
  assert.equal(mathRoots.length, 1, 'Homepage/footer excerpts must not be math-rendered');
  tocDom.window.close();

  let mathHook;
  vm.runInNewContext(read('scripts/site-reading-math.js'), { require, hexo: { extend: { filter: {
    register(name, fn) { assert.equal(name, 'marked:extensions'); mathHook = fn; }
  } } } });
  const extensions = [];
  mathHook.call({ theme: { config: { math: { engine: 'katex' } } } }, extensions);
  const { Marked } = require('marked');
  const marked = new Marked({ extensions });
  const tex = String.raw`$$
A=\begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}
$$`;
  const rendered = new JSDOM(marked.parse(tex + '\n\n`$not_math$`\n\n' + String.raw`Text $x_i+y_j$ and \(a_1+b_2\).`));
  assert.equal(rendered.window.document.querySelector('.site-math-source').textContent, tex);
  assert.equal(rendered.window.document.querySelector('code').textContent, '$not_math$');
  assert.equal(rendered.window.document.querySelectorAll('.site-math-source').length, 3);
  assert.equal(rendered.window.document.querySelector('.site-math-source em'), null);
  rendered.window.close();
  console.log('PASS: TOC text safety, one mobile view, one active observer across repeated native init (JSDOM/observer stub)');
  console.log('PASS: Marked preserves matrix delimiters/backslashes/underscores; code ignored (real parser, not visual math)');
  console.log('PASS: reading assets once, root/subpath, full documents only (static/build API)');
  console.log('PASS: exact code/newlines/special characters, no gutter, one copy handler, error feedback (JSDOM/clipboard stub)');
})().catch(e => { console.error(e); process.exitCode = 1; });
