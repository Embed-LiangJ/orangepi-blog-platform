'use strict';

// Real Hexo post rendering plus registry failure injection. All writes stay in
// a new OS temporary tree; it is deliberately retained (no cleanup/deletion).
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert/strict');
const { createRequire } = require('module');
const Hexo = require('hexo');
const Filter = require('hexo/dist/extend/filter');
const nativeFactory = require('hexo/dist/plugins/filter/before_post_render/backtick_code_block');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const key = Symbol.for('site.emptyFenceCompat.v1');
const entry = path.join(root, 'scripts/site-empty-fence-compat.js');
const entryText = fs.readFileSync(entry, 'utf8');
const localRequire = createRequire(entry);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orangepi-empty-fence-'));
const report = { start: new Date().toISOString(), temp, cases: [], faults: [] };

function fingerprint() {
  const hash = crypto.createHash('sha256');
  function visit(file) {
    if (!fs.existsSync(file)) return;
    hash.update(path.relative(root, file));
    if (fs.lstatSync(file).isDirectory()) fs.readdirSync(file).sort().forEach(name => visit(path.join(file, name)));
    else hash.update(fs.readFileSync(file));
  }
  for (const name of ['source', 'public', 'db.json', '_config.yml', '_config.firefly.yml', 'scripts', 'lib']) visit(path.join(root, name));
  return hash.digest('hex');
}
const before = fingerprint();

function prepare(label, nativeOnly) {
  const base = path.join(temp, label);
  fs.mkdirSync(base);
  for (const name of ['_config.yml', '_config.firefly.yml', 'package.json']) fs.copyFileSync(path.join(root, name), path.join(base, name));
  for (const name of ['source', 'scripts', 'scaffolds', 'lib']) {
    fs.cpSync(path.join(root, name), path.join(base, name), {
      recursive: true,
      filter: file => !nativeOnly || path.basename(file) !== 'site-empty-fence-compat.js'
    });
  }
  fs.mkdirSync(path.join(base, 'themes'));
  fs.symlinkSync(path.join(root, 'themes/firefly'), path.join(base, 'themes/firefly'));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(base, 'node_modules'));
  return new Hexo(base, { silent: true });
}
function shape(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const result = {
    headings: Array.from(doc.querySelectorAll('h1,h2,h3')).map(e => e.textContent),
    figures: doc.querySelectorAll('figure.highlight').length,
    code: Array.from(doc.querySelectorAll('td.code pre,pre>code')).map(e => {
      const clone = e.cloneNode(true);
      clone.querySelectorAll('br').forEach(br => br.replaceWith(doc.createTextNode('\n')));
      return clone.textContent;
    })
  };
  dom.window.close();
  return result;
}
async function render(hexo, markdown) {
  return (await hexo.post.render('case.md', { source: 'case.md', engine: 'md', content: markdown })).content;
}
function loadEntry(hexo, requireFn = localRequire) {
  vm.runInNewContext(entryText, { hexo, require: requireFn }, { filename: entry });
}
function equalChain(filters, expected) {
  const list = filters.list('before_post_render');
  assert.equal(list.length, expected.length);
  list.forEach((fn, i) => { assert.equal(fn, expected[i].fn); assert.equal(fn.priority, expected[i].priority); });
}

async function faultTests(reference) {
  const cases = [
    'version', 'source-fingerprint', 'function-fingerprint', 'duplicate-native',
    'preexisting-order', 'compat-load', 'register-before', 'register-after', 'replacement-order',
    'unregister-after', 'restore-failure', 'unrelated-order'
  ];
  for (const mode of cases) {
    const filters = new Filter();
    const h = { version: mode === 'version' ? '9.0.0' : '8.1.2', config: reference.config,
      extend: { filter: filters, highlight: reference.extend.highlight } };
    const native = nativeFactory(h);
    const other = function otherFilter() {};
    const last = function lastFilter() {};
    if (mode === 'preexisting-order') filters.register('before_post_render', other, 10);
    filters.register('before_post_render', mode === 'function-fingerprint' ? function backtickCodeBlock() {} : native, 10);
    if (mode !== 'preexisting-order') filters.register('before_post_render', other, 10);
    filters.register('before_post_render', last, 20);
    if (mode === 'duplicate-native') filters.register('before_post_render', nativeFactory(h), 10);
    const snapshot = filters.list('before_post_render').map(fn => ({ fn, priority: fn.priority }));
    const register = filters.register, unregister = filters.unregister;
    let registrations = 0, unregistrations = 0;
    filters.register = function(type, fn, priority) {
      if (type !== 'before_post_render') return register.call(this, type, fn, priority);
      registrations++;
      if (mode === 'restore-failure' || mode === 'register-before' && registrations === 1) throw Error('injected register failure');
      const result = register.call(this, type, fn, mode === 'replacement-order' && registrations === 1 ? 30 : priority);
      if (mode === 'register-after' && registrations === 1) throw Error('injected failure after register');
      if (mode === 'unrelated-order' && registrations === 1) this.list(type).reverse(); // injector only, not product recovery
      return result;
    };
    filters.unregister = function(type, fn) {
      const result = unregister.call(this, type, fn);
      if (type === 'before_post_render' && ++unregistrations === 1 && mode === 'unregister-after') throw Error('injected unregister failure');
      return result;
    };
    const mockedRequire = name => {
      if (mode === 'compat-load' && name === '../lib/compat/hexo-8.1.2-backtick.cjs') throw Error('injected compatibility load failure');
      if (mode === 'source-fingerprint' && name === 'fs') return { ...fs, readFileSync: () => Buffer.from('changed core') };
      return localRequire(name);
    };
    mockedRequire.resolve = localRequire.resolve;
    loadEntry(h, mockedRequire);
    await assert.rejects(filters.exec('after_init', null, { context: h }), /installation failed|RESTORE_FAILED/);
    assert.equal(h[key].phase, 'failed');
    const fatal = mode === 'restore-failure' || mode === 'unrelated-order';
    if (!fatal) { equalChain(filters, snapshot); assert.equal(h[key].restored, true); }
    else { assert.equal(h[key].restored, false); assert.match(h[key].error.message, /RESTORE_FAILED/); }
    // The failure gate runs before any later generation hook.
    let generated = false;
    filters.register('before_generate', () => { generated = true; }, 10);
    await assert.rejects(filters.exec('before_generate', null, { context: h }));
    assert.equal(generated, false);
    // Recovery never modifies priorities/identities of unrelated filters.
    assert.equal(other.priority, 10); assert.equal(last.priority, 20);
    report.faults.push({ mode, status: 'PASS', restored: h[key].restored, fatalTermination: true });
  }
}

(async () => {
  const native = prepare('native', true), fixed = prepare('compat', false);
  let originalChain;
  fixed.extend.filter.register('after_init', function inspectNativeChain() {
    originalChain = this.extend.filter.list('before_post_render').map(fn => ({ fn, priority: fn.priority }));
  }, 99);
  try {
    await native.init(); await fixed.init();
    assert.equal(fixed[key].phase, 'ready');
    assert.equal(fixed.extend.filter.list('before_post_render').filter(fn => fn === fixed[key].native).length, 0);
    assert.equal(fixed.extend.filter.list('before_post_render').filter(fn => fn === fixed[key].replacement).length, 1);
    equalChain(fixed.extend.filter, originalChain.map(item => item.fn === fixed[key].native
      ? { fn: fixed[key].replacement, priority: 9 } : item));
    report.registry = originalChain.map(item => ({ name: item.fn.name, priority: item.priority, sha256: sha(item.fn.toString()) }));
    const installed = fixed.extend.filter.list('before_post_render').slice();
    loadEntry(fixed);
    await fixed.execFilter('after_init', null, { context: fixed });
    assert.deepEqual(fixed.extend.filter.list('before_post_render'), installed);
    // init loads config.theme_config; load performs Hexo's normal merge into
    // theme.config before post rendering/generation. Do not stub math config.
    await native.load(); await fixed.load();
    assert.equal(native.theme.config.math.engine, 'katex');
    assert.equal(fixed.theme.config.math.engine, 'katex');

    const normal = [
      ['plain-Markdown', '# 中文 title\n\nA **bold** paragraph, [link](https://example.invalid/) and `inline_code`.\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n'],
      ['no-fence-special', 'Text <span>HTML &amp; Unicode 中文</span>.\n\n    indented_code\n'],
      ['C-tabs-special', '```c\n#include <stdio.h>\nint main(void) {\n\t    printf("中文 <tag> & \\\"quote\\\"\\n");  \n\n    return 0;\n}\n```\n\n# after\n'],
      ['MATLAB-tabs-special', '```matlab\nfunction y = f(x)\n\t    y = x.^2;  \n\n    disp(\'中文 <tag> & "quote"\');\nend\n```\n\n# after\n'],
      ['no-language', '```\nplain <tag> & text\n```\n'],
      ['tilde', '~~~matlab\nx = 1;\n~~~\n'],
      ['list', '- item\n\n  ```c\n  int x = 1;\n  ```\n\n- next\n'],
      ['quote', '> ```c\n> int x = 1;\n> ```\n\n# after\n'],
      ['CRLF', '```c\r\nx\r\n```\r\n\r\n# after\r\n'],
      ['CRLF-empty', '```c\r\n```\r\n\r\n# after\r\n\r\n```c\r\nx\r\n```\r\n'],
      ['single-empty', '```c\n```\n'],
      ['empty-heading-only', '```matlab\n```\n\n# after\n'],
      ['blank-content', '```c\n\n```\n\n# after\n\n```c\nx\n```\n'],
      ['long-fence-inner-backticks', '````text\n```literal```\n````\n'],
      ['comment', '<!--\n```c\nx\n```\n-->\n\n# after\n'],
      ['options', '```c caption https://example.invalid link line_number:false first_line:3 mark:1,2\nint x;\n```\n'],
      ['disabled-highlight', '```c highlight:false\nx\n```\n'],
      ['literal-math', '```c\nprintf("$x_i$ \\\\[a_1\\\\]");\n```\n\nText $x_i^2+\\frac{a}{b}$\n\n$$\nA=\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}\n$$\n']
    ];
    for (const [name, markdown] of normal) {
      const count = fixed[key].executions;
      const oldHtml = await render(native, markdown), newHtml = await render(fixed, markdown);
      assert.equal(newHtml, oldHtml, name + ': normal HTML must be byte-identical');
      assert.equal(fixed[key].executions - count, 1, name + ': exactly one filter execution');
      assert.equal(shape(newHtml).headings.join(','), shape(oldHtml).headings.join(','));
      if (name === 'C-tabs-special' || name === 'MATLAB-tabs-special') {
        const expected = markdown.match(/```[^\n]*\n([\s\S]*?)```/)[1];
        assert.equal(shape(newHtml).code[0], expected);
        // Execute the existing copy adapter against REAL Hexo output. Clipboard
        // here is a unit stub; actual browser clipboard is a separate check.
        const dom = new JSDOM('<div class="post-content"><div class="code-block-wrapper"><button class="code-copy-btn">copy</button>' + newHtml + '</div></div>', { runScripts: 'outside-only', url: 'https://example.invalid/' });
        const calls = [];
        dom.window.navigator.clipboard = { writeText: async text => calls.push(text) };
        dom.window.eval(fs.readFileSync(path.join(root, 'source/js/site-article-reading.js'), 'utf8'));
        dom.window.document.querySelector('button').click();
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.deepEqual(calls, [expected]);
        dom.window.close();
      }
      if (name === 'literal-math') {
        const dom = new JSDOM(newHtml);
        assert.equal(dom.window.document.querySelectorAll('.site-math-source').length, 2);
        assert.equal(dom.window.document.querySelectorAll('figure .site-math-source').length, 0);
        assert(dom.window.document.querySelector('.code pre').textContent.includes('$x_i$'));
        assert(dom.window.document.querySelectorAll('.site-math-source')[1].textContent.includes('\\\\'));
        dom.window.close();
      }
      report.cases.push({ name, status: 'PASS', differential: 'byte-identical', htmlSha256: sha(newHtml) });
    }
    const broken = [
      ['empty-C-followed', '```c\n```\n\n# after\n\n```c\nx\n```\n', 2],
      ['empty-MATLAB-followed', '```matlab\n```\n\n# after\n\n```matlab\nx\n```\n', 2],
      ['consecutive-empty', '```c\n```\n\n```matlab\n```\n\n```text\nok\n```\n\n# after\n', 3],
      ['empty-tilde', '~~~c\n~~~\n\n# after\n\n~~~c\nx\n~~~\n', 2],
      ['empty-quote', '> ```c\n> ```\n>\n> # after\n>\n> ```c\n> x\n> ```\n', 2],
      ['empty-list', '- item\n\n  ```c\n  ```\n\n  # after\n\n  ```c\n  x\n  ```\n', 2]
    ];
    for (const [name, markdown, figures] of broken) {
      const count = fixed[key].executions;
      const oldHtml = await render(native, markdown), newHtml = await render(fixed, markdown);
      assert.notEqual(newHtml, oldHtml, name);
      assert.equal(shape(newHtml).figures, figures, name);
      assert.deepEqual(shape(newHtml).headings, ['after'], name);
      assert.equal(fixed[key].executions - count, 1);
      report.cases.push({ name, status: 'PASS', differential: 'intended empty-fence correction', oldHtml, newHtml });
    }
    // Preserve every other upstream byte: provenance and one-character fix.
    const upstream = fs.readFileSync(require.resolve('hexo/dist/plugins/filter/before_post_render/backtick_code_block'), 'utf8');
    const copy = fs.readFileSync(path.join(root, 'lib/compat/hexo-8.1.2-backtick.cjs'), 'utf8');
    const body = copy.slice(copy.indexOf('"use strict";'));
    assert.equal(body, upstream.replace('((?:[\\s\\S]*?\\n)?)', '((?:[\\s\\S]*?\\n)??)').replace('//# sourceMappingURL=backtick_code_block.js.map\n', ''));
    assert.equal(fs.readFileSync(path.join(root, 'lib/compat/hexo-8.1.2.LICENSE'), 'utf8'), fs.readFileSync(require.resolve('hexo/LICENSE'), 'utf8'));
    await faultTests(native);
    console.log('PASS: real Hexo pipeline, 18 unchanged inputs, 6 targeted fixes, exact copy stub and math/code isolation');
    console.log('PASS: one execution, one registration, same relative order, provenance and 12 failure-injection scenarios');
  } finally {
    await native.exit(); await fixed.exit();
    assert.equal(fingerprint(), before, 'Formal project changed by isolated test');
    report.end = new Date().toISOString();
    fs.writeFileSync(path.join(temp, 'report.json'), JSON.stringify(report, null, 2));
    console.log('Evidence (retained, not deleted): ' + path.join(temp, 'report.json'));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
