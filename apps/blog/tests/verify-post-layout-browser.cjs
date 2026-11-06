'use strict';
// Focused desktop CDP checks against an existing site. Isolated browser storage;
// no build, screenshots, server mutation, or synthetic DOM-click fallback.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { spawn } = require('child_process');
const out = path.resolve(process.argv[2] || '');
const base = (process.argv[3] || '').replace(/\/$/, '');
const diagnose = process.argv[4] === '--expect-broken';
assert(process.argv[2] && /^http:\/\/(127\.0\.0\.1(?::\d+)?|192\.168\.31\.171)$/.test(base) && !fs.existsSync(out),
  'Usage: node verify-post-layout-browser.cjs <NEW output> <loopback/LAN site URL> [--expect-broken]');
fs.mkdirSync(out, { recursive: true });
const report = { status: 'RUNNING', base, diagnose, states: [], comparisons: [], errors: [], httpErrors: [] };
let browser, ws, seq = 0, stderr = '', seedId;
const pending = new Map(), sleep = ms => new Promise(r => setTimeout(r, ms));
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 20000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 250; i++) { if (await evaluate(expression)) return; await sleep(100); }
  throw Error('Wait timeout: ' + expression);
}
async function ready() {
  await wait("document.readyState==='complete' && window.Settings?.initialized && window.PostLayoutManager?.initialized");
  if (!await evaluate('!!window.pjax')) { const e = Error('PJAX CDN unavailable'); e.blocked = true; throw e; }
  await evaluate('document.fonts.ready.then(()=>true)'); await sleep(300);
}
async function click(selector) {
  const p = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control: '+${JSON.stringify(selector)});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!(r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&(hit===e||e.contains(hit))))throw Error('Control not hittable: '+${JSON.stringify(selector)});return {x,y};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...p });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...p });
}
async function pjax(route) {
  const n = await evaluate('__layoutPjax');
  await click(`#navbar-menu a[href="${route}"]`);
  await wait(`location.pathname===${JSON.stringify(route)} && __layoutPjax>${n}`);
  assert.equal(await evaluate('__layoutMarker'), 'retained', 'Full navigation substituted for PJAX');
  await sleep(500);
}
async function snapshot(kind, theme, seed, expected) {
  const s = await evaluate(`(()=>{const main=document.querySelector('#main-content'),list=main.querySelector('.post-list'),card=list?.querySelector('.post-card-item'),style=list&&getComputedStyle(list);return {path:location.pathname,theme:document.documentElement.dataset.theme,stored:localStorage.getItem('postListLayout'),getter:Settings.getPostListLayout(),layout:main.dataset.layout,mode:list?.dataset.mode,mainClass:main.className,listClass:list?.className,display:style?.display,columns:style?.gridTemplateColumns,direction:style?.flexDirection,mainWidth:main.getBoundingClientRect().width,listWidth:list?.getBoundingClientRect().width,cardWidth:card?.getBoundingClientRect().width,buttons:[...document.querySelectorAll('.layout-buttons button.active')].map(e=>e.dataset.layout),css:[...document.querySelectorAll('link[rel=stylesheet]')].map(e=>e.href)};})()`);
  report.states.push({ kind, themeCase: theme, seed, expected, ...s });
  if (!diagnose) {
    assert.equal(s.theme, theme); assert.equal(s.layout, expected); assert.equal(s.mode, expected); assert.equal(s.getter, expected);
    assert.equal(s.display, expected === 'list' ? 'flex' : 'grid');
    assert.deepEqual(s.buttons, [expected]);
    if (expected === 'list') assert(Math.abs(s.cardWidth - s.listWidth) <= 1, JSON.stringify(s));
    else assert(s.cardWidth < s.listWidth * 0.75, 'Grid mode was forced into a full-width list');
  }
  fs.writeFileSync(path.join(out, 'progress.json'), JSON.stringify({ states: report.states.length, last: kind }));
  return s;
}
async function reload() {
  await evaluate('window.__layoutOldDocument=true'); await send('Page.reload', { ignoreCache: false });
  await wait('!window.__layoutOldDocument'); await ready();
}
async function selectLayout(layout) {
  await click('.display-settings-toggle'); await sleep(250);
  await click('.settings-tab-btn[data-tab="appearance"]'); await sleep(150);
  await click(`.layout-buttons button[data-layout="${layout}"]`); await sleep(200);
  await click('.display-settings-toggle'); await sleep(250);
}
async function main() {
  const flags = ['--headless', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--no-first-run',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + path.join(out, 'profile'),
    '--enable-experimental-web-platform-features', 'about:blank'];
  browser = spawn('chromium-browser', flags, { stdio: ['ignore', 'ignore', 'pipe'] });
  browser.stderr.on('data', data => { stderr = (stderr + data).slice(-10000); });
  let port;
  for (let i = 0; i < 150; i++) { const m = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/); if (m) { port = m[1]; break; } if (browser.exitCode !== null) throw Error('Chromium exited'); await sleep(100); }
  assert(port, 'No DevTools endpoint');
  report.browser = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } return; }
    if (m.method === 'Runtime.exceptionThrown') report.errors.push(m.params.exceptionDetails);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) report.httpErrors.push({ url: m.params.response.url, status: m.params.response.status });
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  for (const theme of ['light', 'dark']) for (const seed of [null, 'grid']) {
    if (seedId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seedId });
    const key = 'layout-test-' + theme + '-' + seed;
    const source = `if(!sessionStorage.getItem(${JSON.stringify(key)})){localStorage.setItem('theme',${JSON.stringify(theme)});${seed ? "localStorage.setItem('postListLayout','grid');" : "localStorage.removeItem('postListLayout');"}sessionStorage.setItem(${JSON.stringify(key)},'yes');}`;
    seedId = (await send('Page.addScriptToEvaluateOnNewDocument', { source })).identifier;
    await send('Page.navigate', { url: base + '/' }); await ready();
    const expected = seed || 'list';
    const first = await snapshot('direct', theme, seed, expected);
    await evaluate("window.__layoutMarker='retained';window.__layoutPjax=0;document.addEventListener('pjax:complete',()=>__layoutPjax++)");
    await pjax('/'); const again = await snapshot('home-click', theme, seed, expected);
    report.comparisons.push({ theme, seed, firstWidth: first.cardWidth, homeClickWidth: again.cardWidth, firstMode: first.layout, homeClickMode: again.layout, same: first.layout === again.layout && Math.abs(first.cardWidth - again.cardWidth) <= 1 });
    if (!diagnose) assert(report.comparisons.at(-1).same, 'Direct/PJAX layout mismatch');
    await pjax('/about/');
    assert.equal(await evaluate("document.querySelector('[data-site-page]')?.dataset.sitePage"), 'about');
    assert.equal(await evaluate("!!document.querySelector('#main-content .post-list')"), false);
    await pjax('/'); await snapshot('about-to-home', theme, seed, expected);
    let n = await evaluate('__layoutPjax'); await evaluate('history.back()'); await wait(`location.pathname==='/about/' && __layoutPjax>${n}`);
    n = await evaluate('__layoutPjax'); await evaluate('history.forward()'); await wait(`location.pathname==='/' && __layoutPjax>${n}`); await sleep(500);
    await snapshot('history-forward-home', theme, seed, expected);
    await reload(); await snapshot('refresh', theme, seed, expected);
    await evaluate("window.__layoutMarker='retained';window.__layoutPjax=0;document.addEventListener('pjax:complete',()=>__layoutPjax++)");
    await pjax('/about/');
    n = await evaluate('__layoutPjax'); await evaluate('history.back()'); await wait(`location.pathname==='/' && __layoutPjax>${n}`); await sleep(500);
    await snapshot('history-back-home', theme, seed, expected);
    if (!diagnose && seed === null) {
      await selectLayout('grid'); await snapshot('user-grid', theme, seed, 'grid');
      await reload(); await snapshot('saved-grid-refresh', theme, seed, 'grid');
      await evaluate("window.__layoutMarker='retained';window.__layoutPjax=0;document.addEventListener('pjax:complete',()=>__layoutPjax++)");
      await pjax('/about/'); await pjax('/'); await snapshot('saved-grid-pjax', theme, seed, 'grid');
      await selectLayout('list'); await snapshot('user-list', theme, seed, 'list');
      await reload(); await snapshot('saved-list-refresh', theme, seed, 'list');
    }
  }
  assert.equal(report.errors.length, 0); assert.equal(report.httpErrors.length, 0);
  if (diagnose) { assert(report.comparisons.some(s => !s.same), 'Expected defect not reproduced'); report.status = 'EXPECTED_BUG_REPRODUCED'; }
  else report.status = 'PASS';
}
main().catch(error => { report.status = error.blocked ? 'BLOCKED' : 'FAIL'; report.fatal = error.stack; console.error(error); process.exitCode = error.blocked ? 2 : 1; }).finally(async () => {
  if (ws?.readyState === 1) { try { ws.send(JSON.stringify({ id: ++seq, method: 'Browser.close' })); await sleep(300); ws.close(); } catch {} }
  if (browser?.exitCode === null) browser.kill('SIGTERM');
  for (const p of pending.values()) { clearTimeout(p.timer); p.reject(Error('Test ended')); }
  report.browserStderr = report.status === 'FAIL' ? stderr : undefined;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(report.status, 'home layout states:', report.states.length, 'direct/PJAX comparisons:', report.comparisons.length);
});
