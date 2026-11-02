'use strict';

// Integration tests run ONLY in a fresh temporary Hexo project, never in root.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const { spawnSync } = require('child_process');
const { JSDOM } = require('jsdom');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '..');
function fingerprint(base) {
  const hash = crypto.createHash('sha256');
  function visit(file) {
    if (!fs.existsSync(file)) return;
    hash.update(path.relative(root, file));
    if (fs.lstatSync(file).isDirectory()) fs.readdirSync(file).sort().forEach(n => visit(path.join(file, n)));
    else hash.update(fs.readFileSync(file));
  }
  for (const name of ['source', 'public', 'db.json', '_config.yml', '_config.firefly.yml']) visit(path.join(base, name));
  return hash.digest('hex');
}
const before = fingerprint(root);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'orangepi-beijing-test-'));
const cases = [
  ['0030', '2026-10-31T00:30:00+08:00'],
  ['1200', '2026-10-31T12:00:00+08:00'],
  ['2330', '2026-10-31T23:30:00+08:00'],
  ['month', '2026-11-01T00:30:07+08:00'],
  ['year', '2027-01-01T00:30:09+08:00']
];
function command(args, tz = 'Etc/UTC') {
  const result = spawnSync('npm', ['run', ...args], { cwd: temp,
    env: { ...process.env, TZ: tz }, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /(?:ERROR|FATAL)/.test(result.stdout + result.stderr)) {
    throw new Error(String(result.error || '') + result.stdout + result.stderr);
  }
}
const documentCache = new Map();
function readDocument(file) {
  if (documentCache.has(file)) return documentCache.get(file);
  const dom = new JSDOM(fs.readFileSync(path.join(temp, 'public', file), 'utf8'));
  const doc = dom.window.document.cloneNode(true);
  dom.window.close();
  documentCache.set(file, doc);
  return doc;
}
function verify(label) {
  documentCache.clear();
  const posts = JSON.parse(fs.readFileSync(path.join(temp, 'db.json'))).models.Post;
  const home = readDocument('index.html');
  const archive = readDocument('archives/index.html');
  for (const [suffix, iso] of cases) {
    const slug = `beijing-boundary-${suffix}`;
    const day = iso.slice(0, 10), route = '/' + day.replaceAll('-', '/') + '/' + slug + '/';
    const display = iso.slice(0, 19).replace('T', ' ') + ' UTC+08:00';
    const post = posts.find(p => p.slug === slug);
    assert.equal(post.date, new Date(iso).toISOString());
    assert.equal(post.updated, new Date('2027-01-02T21:45:12+08:00').toISOString());
    const card = Array.from(home.querySelectorAll('.post-card-item')).find(c => c.querySelector(`a[href="${route}"]`));
    assert(card, `Missing Beijing permalink ${route}`);
    assert(card.querySelector('time').textContent.includes(display));
    assert.equal(card.querySelector('time').getAttribute('datetime'), iso);
    const detail = readDocument(route.slice(1) + 'index.html');
    assert.equal(detail.querySelector('time[pubdate]').textContent.trim(), display);
    assert.equal(detail.querySelector('time[pubdate]').getAttribute('datetime'), iso);
    assert(detail.body.textContent.includes('2027-01-02 21:45'));
    for (const doc of [archive, readDocument(`archives/${day.slice(0, 4)}/${day.slice(5, 7)}/index.html`)]) {
      const item = Array.from(doc.querySelectorAll('.archive-timeline-item')).find(c => c.querySelector(`a[href="${route}"]`));
      assert(item, `Wrong archive membership for ${iso}`);
      assert.equal(item.querySelector('time').textContent, display);
      assert.equal(item.querySelector('time').getAttribute('datetime'), iso);
    }
    for (const file of ['categories/时间回归/index.html', 'tags/时间回归/index.html']) {
      const doc = readDocument(file);
      assert(doc.querySelector(`a[href="${route}"]`));
      assert(doc.body.textContent.includes(display));
    }
    console.log(`PASS ${label}: ${iso}; instant/home/detail/updated/archive/category/tag/datetime/permalink`);
  }
  // A track's text must not break out of its data carrier. No audio is requested.
  assert(!home.querySelector('script[data-review-injection]'));
  const carrier = Array.from(home.querySelectorAll('script')).find(s => s.textContent.trim().startsWith('window.__LOCAL_PLAYLIST ='));
  assert(carrier);
  const sandbox = { window: {} };
  require('vm').runInNewContext(carrier.textContent, sandbox, { timeout: 1000 });
  assert.equal(sandbox.window.__LOCAL_PLAYLIST[0].name, '</script><script data-review-injection="true"></script>');
  assert(!home.querySelector('script[src*="meting@"],meting-js'));
  assert(home.querySelector('#nav-music-btn'));
  assert(home.querySelector('script[src*="aplayer@1"]'));
}
try {
  for (const name of ['scripts', 'source', 'scaffolds', 'lib']) fs.cpSync(path.join(root, name), path.join(temp, name), { recursive: true });
  for (const name of ['package.json', '_config.yml', '_config.firefly.yml']) fs.copyFileSync(path.join(root, name), path.join(temp, name));
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(temp, 'themes'));
  fs.symlinkSync(path.join(root, 'themes/firefly'), path.join(temp, 'themes/firefly'), 'dir');
  for (const [suffix, iso] of cases) {
    fs.writeFileSync(path.join(temp, 'source/_posts', `beijing-boundary-${suffix}.md`),
      `---\ntitle: 时间回归 ${suffix}\ndate: ${iso}\nupdated: 2027-01-02T21:45:12+08:00\ncategories: [时间回归]\ntags: [时间回归]\ncomments: false\ncopyright: false\n---\n\n隔离工程中的测试数据。\n`, { flag: 'wx' });
  }
  const themePath = path.join(temp, '_config.firefly.yml');
  const theme = yaml.load(fs.readFileSync(themePath, 'utf8'));
  theme.music.local.playlist = [{ name: '</script><script data-review-injection="true"></script>', artist: 'test fixture', url: '/music/test-fixture.mp3' }];
  fs.writeFileSync(themePath, yaml.dump(theme));
  for (const tz of ['Etc/UTC', 'America/New_York']) {
    command(['clean'], tz); command(['generate'], tz); verify(tz);
    command(['generate'], tz); verify(tz + ' cached');
  }
  console.log('PASS: unsafe playlist text stays data; Meting absent; APlayer/music navigation retained');
  for (const layout of ['post', 'draft', 'page']) {
    const name = `scaffold-review-${layout}`;
    const result = spawnSync(process.execPath, [path.join(root, 'node_modules/hexo/bin/hexo'), 'new', layout, name], {
      cwd: temp, env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8', timeout: 30000
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const relative = layout === 'post' ? `_posts/${name}.md` : layout === 'draft' ? `_drafts/${name}.md` : `${name}/index.md`;
    const content = fs.readFileSync(path.join(temp, 'source', relative), 'utf8');
    const header = yaml.load(require('hexo-front-matter').split(content).data, { schema: yaml.JSON_SCHEMA });
    assert.match(header.date, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/);
    assert.equal(header.updated, header.date);
    assert(Math.abs(Date.parse(header.date) - Date.now()) < 60000, 'Scaffold must preserve the creation instant');
  }
  console.log('PASS: actual hexo new post/draft/page emits explicit Beijing date+updated in a New York process');
  const missingUpdated = path.join(temp, 'source/_posts/missing-updated-review.md');
  fs.writeFileSync(missingUpdated, '---\ntitle: missing updated fixture\ndate: 2026-11-02T12:30:00+08:00\n---\nfixture');
  command(['generate']);
  const fallback = JSON.parse(fs.readFileSync(path.join(temp, 'db.json'))).models.Post.find(p => p.slug === 'missing-updated-review');
  assert.equal(fallback.updated, fallback.date);
  console.log('PASS: missing updated follows explicit updated_option=date');
  const invalid = path.join(temp, 'source/_posts/invalid-date-review.md');
  fs.writeFileSync(invalid, '---\ntitle: invalid fixture\ndate: 2026-02-30T00:30:00+08:00\n---\ninvalid');
  const rejected = spawnSync(process.execPath, [path.join(root, 'node_modules/hexo/bin/hexo'), 'generate'], {
    cwd: temp, env: { ...process.env, TZ: 'Etc/UTC' }, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024
  });
  assert.equal(rejected.status, 2, String(rejected.error || '') + rejected.stdout + rejected.stderr);
  assert.match(rejected.stdout + rejected.stderr, /invalid date/);
  console.log('PASS: actual isolated build rejects impossible date with exit 2');
} finally {
  fs.rmSync(temp, { recursive: true, force: true }); // Only this mkdtemp-owned directory.
  assert.equal(fingerprint(root), before, 'Formal source/public/db/config changed by isolated tests');
  console.log('PASS: formal source/public/db/config unchanged; temporary workspace removed');
}
