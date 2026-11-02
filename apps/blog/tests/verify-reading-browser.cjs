'use strict';

// Real Chromium/CDP checks. Start the isolated fixture HTTP server separately.
// Node 22 WebSocket is used; no browser automation dependency is installed.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const { spawn } = require('child_process');
const out = path.resolve(process.argv[2] || '');
if (!process.argv[2] || fs.existsSync(out)) throw new Error('Provide a NEW evidence directory');
fs.mkdirSync(out, { recursive: true });
const audit = process.argv.includes('--audit');
const base = process.env.READING_BASE_URL || 'http://127.0.0.1:4000';
const report = { start: new Date().toISOString(), audit, matrix: [], pjax: [], errors: [], warnings: [], httpErrors: [], failedRequests: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = url => new Promise((resolve, reject) => http.get(url, r => {
  let text = ''; r.on('data', x => text += x); r.on('end', () => resolve(JSON.parse(text)));
}).on('error', reject));
let ws, browser, sequence = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 30000);
    pending.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function wait(expression, timeout = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(100); }
  throw Error('Wait timeout: ' + expression);
}
async function navigate(route) {
  await send('Page.navigate', { url: base + route });
  await wait("document.readyState==='complete'&&!!window.Settings&&!!window.pjax&&!!document.querySelector('.post-content')");
  await evaluate("document.documentElement.style.scrollBehavior='auto'");
  await sleep(500);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(600);
  await wait(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===hit||e.contains(hit);})()`);
  const p = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...p });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, ...p });
  await sleep(300);
}
async function screenshot(name) {
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.data, 'base64'));
}
const snapshot = `(()=>{
 const content=document.querySelector('.post-content'),card=document.querySelector('.post-content-card');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const cs=e=>getComputedStyle(e);
 const colors={};for(const [name,selector]of Object.entries({title:'.post-title-custom',body:'.post-content',inline:'.post-content p code',quote:'.post-content blockquote',table:'.post-content>table th',toc:'#toc-body a',code:'.post-content figure.highlight .code pre',comment:'.post-content figure.highlight .comment',math:'.post-content .katex'})){const e=document.querySelector(selector);if(e)colors[name]={color:cs(e).color,background:cs(e).backgroundColor};}
 const codes=[...content.querySelectorAll('figure.highlight')].map(e=>({box:rect(e),client:e.clientWidth,scroll:e.scrollWidth,overflow:cs(e).overflowX,headers:e.parentElement.querySelectorAll('.code-block-header').length,buttons:e.parentElement.querySelectorAll('.code-copy-btn').length,highlight:e.querySelectorAll('.keyword,.string,.number,.built_in').length}));
 const img=content.querySelector('img');
 return {route:location.pathname,viewport:innerWidth,mode:document.documentElement.classList.contains('dark')?'dark':'light',hue:cs(document.documentElement).getPropertyValue('--hue').trim(),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,content:rect(content),card:rect(card),title:rect(document.querySelector('.post-title-custom')),titleScroll:document.querySelector('.post-title-custom').scrollWidth,colors,codes,math:{count:content.querySelectorAll('.katex').length,errors:content.querySelectorAll('.katex-error').length,annotations:[...content.querySelectorAll('annotation')].map(e=>e.textContent),display:[...content.querySelectorAll('.katex-display')].map(e=>({client:e.clientWidth,scroll:e.scrollWidth,overflow:cs(e).overflowX}))},image:img?{box:rect(img),width:img.naturalWidth,height:img.naturalHeight,loaded:img.complete,lightbox:img.hasAttribute('data-fancybox')}:null,toc:{count:document.querySelectorAll('#toc-body .toc-item').length,headings:content.querySelectorAll('h1,h2,h3,h4,h5,h6').length,visible:!!document.querySelector('#toc-body')?.getClientRects().length,mobile:document.querySelectorAll('.site-mobile-toc').length,mobileVisible:!!document.querySelector('.site-mobile-toc')?.getClientRects().length,activeObservers:(window.__readingObservers||[]).filter(o=>o.active).length},wrappers:content.querySelectorAll('.code-block-wrapper').length};
})()`;
async function copyCheck() {
  const route = await evaluate('location.pathname');
  const fixturePath = route.includes('hello-firefly') ? path.join(__dirname, '../source/_posts/hello-firefly.md')
    : path.join(__dirname, 'fixtures', route.includes('reading-b') ? 'reading-b.md' : 'reading-a.md');
  const fixture = fs.readFileSync(fixturePath, 'utf8');
  const expected = fixture.match(/```(?:javascript|python)\n([\s\S]*?)```/)[1];
  const writesBefore = await evaluate('window.__readingClipboardWrites || 0');
  await click('.post-content .code-copy-btn');
  const actual = await evaluate('navigator.clipboard.readText()');
  const writes = await evaluate('window.__readingClipboardWrites') - writesBefore;
  if (!audit) assert.equal(writes, 1, 'Exactly one real clipboard write per click');
  if (!audit) assert.equal(actual, expected, 'Clipboard must contain exact code, not gutter numbers');
  return { expected, actual, matches: actual === expected, writes };
}
async function lightboxCheck() {
  await click('.post-content img');
  await sleep(500);
  const containers = await evaluate("document.querySelectorAll('.fancybox__container').length");
  const opened = containers > 0;
  if (opened) {
    const label = await evaluate("innerWidth+'-'+(document.documentElement.classList.contains('dark')?'dark':'light')+'-lightbox'");
    if (!fs.existsSync(path.join(out, label + '.png'))) await screenshot(label);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(500);
  }
  const closed = await evaluate("!document.querySelector('.fancybox__container')");
  if (!audit) assert(opened && closed && containers === 1, 'One real Fancybox opens and Escape closes it');
  return { opened, closed, containers };
}
async function contrastCheck(hover = false) {
  return evaluate(`(()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
    const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
    const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const result={};
    const selectors=${hover ? "{link:'.post-content p a[href^=https]'}" : "{title:'.post-title-custom',body:'.post-content',inline:'.post-content p code',quote:'.post-content blockquote',table:'.post-content>table th',toc:'#toc-body a',code:'.post-content figure.highlight .code pre',gutter:'.post-content figure.highlight .gutter pre',math:'.post-content .katex',link:'.post-content p a[href^=https]',keyword:'.post-content figure.highlight .keyword',string:'.post-content figure.highlight .string'}"};
    for(const[k,selector]of Object.entries(selectors)){
      const e=document.querySelector(selector);if(!e)continue;const layers=[];for(let n=e;n;n=n.parentElement){const c=rgb(getComputedStyle(n).backgroundColor);layers.push(c);if(c[3]===255)break;}
      let bg=[255,255,255];for(const c of layers.reverse()){const a=c[3]/255;bg=bg.map((v,i)=>Math.round(c[i]*a+v*(1-a)));}
      const fg=rgb(getComputedStyle(e).color),a=lum(fg),b=lum(bg);result[k]={fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    }return result;
  })()`);
}
async function tocCheck(width) {
  const selector = width < 1024 ? '.site-mobile-toc .toc-item:last-child a' : '#toc-body .toc-item:last-child a';
  if (width < 1024) await click('.site-mobile-toc > summary');
  const id = await evaluate(`decodeURIComponent(document.querySelector(${JSON.stringify(selector)}).getAttribute('href').slice(1))`);
  await click(selector);
  await wait(`(()=>{const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();return r.top>=60&&r.top<200;})()`);
  await sleep(1000);
  const result = await evaluate(`({hash:decodeURIComponent(location.hash.slice(1)),top:document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top,active:[...document.querySelectorAll('#toc-body .toc-item.active a')].map(e=>decodeURIComponent(e.getAttribute('href').slice(1)))})`);
  report.lastTocCheck = result;
  assert.equal(result.hash, id); assert(result.active.includes(id), 'TOC tracks the scrolled heading');
  return result;
}
const a = '/2026/10/29/reading-a/', b = '/2026/10/28/reading-b/';
(async () => { try {
  const log = fs.openSync(path.join(out, 'chromium.log'), 'w');
  report.flags = ['--headless', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--no-first-run', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + path.join(out, 'profile'), '--enable-experimental-web-platform-features', 'about:blank'];
  browser = spawn('chromium-browser', report.flags, { stdio: ['ignore', log, 'pipe'] });
  let stderr = '', port;
  browser.stderr.on('data', x => { stderr += x; fs.writeSync(log, x); });
  for (let i = 0; i < 150; i++) { const m = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/); if (m) { port = m[1]; break; } if (browser.exitCode !== null) throw Error('Chromium exited'); await sleep(100); }
  assert(port); report.browser = await get('http://127.0.0.1:' + port + '/json/version');
  const pages = await get('http://127.0.0.1:' + port + '/json/list');
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } return; }
    const p = m.params || {};
    if (m.method === 'Runtime.exceptionThrown') report.errors.push(p.exceptionDetails);
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(p.type)) report[p.type === 'error' ? 'errors' : 'warnings'].push(p.args.map(a => a.value ?? a.description));
    if (m.method === 'Network.responseReceived' && p.response.status >= 400) report.httpErrors.push({ url: p.response.url, status: p.response.status });
    if (m.method === 'Network.loadingFailed') report.failedRequests.push(p);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__readingObservers=[];
    const NativeObserver=window.IntersectionObserver;
    window.IntersectionObserver=class extends NativeObserver {
      constructor(callback,options){super(callback,options);if(options?.rootMargin?.startsWith('-80px 0px ')){this.record={active:true};window.__readingObservers.push(this.record);}}
      disconnect(){super.disconnect();if(this.record)this.record.active=false;}
    };
    window.__readingClipboardWrites=0;
    if(navigator.clipboard){const write=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=function(text){window.__readingClipboardWrites++;return write(text);};}
  ` });
  await send('Browser.grantPermissions', { origin: base, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  if (process.argv.includes('--smoke')) {
    report.smoke = [];
    for (const width of [1440, 390]) for (const mode of ['light', 'dark']) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 });
      for (const route of ['/', '/2026/10/30/hello-firefly/', '/archives/', '/categories/']) {
        await send('Page.navigate', { url: base + route });
        await wait("document.readyState==='complete'&&!!window.Settings&&!!window.pjax");
        if (!report.initialStorage) report.initialStorage = await evaluate('Object.fromEntries(Object.entries(localStorage))');
        await evaluate(`document.documentElement.style.scrollBehavior='auto';Settings.setTheme('${mode}')`); await sleep(500);
        const state = await evaluate("({route:location.pathname,width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,styles:document.querySelectorAll('link[data-site-reading]').length,scripts:document.querySelectorAll('script[data-site-reading]').length,visual:document.querySelectorAll('link[data-site-visual]').length})");
        assert.equal(state.overflow, 0); assert.equal(state.styles, 1); assert.equal(state.scripts, 1); assert.equal(state.visual, 1);
        if (route.includes('hello-firefly')) { state.copy = await copyCheck(); await screenshot(width + '-' + mode + '-real-post'); }
        report.smoke.push({ mode, ...state });
      }
    }
    const { createHash } = require('crypto');
    report.loadedAssets = {};
    for (const asset of ['css/site-article-reading.css', 'js/site-article-reading.js', 'css/site-anime-engineering.css']) {
      const content = await evaluate(`fetch('/'+${JSON.stringify(asset)}).then(r=>r.text())`);
      const hash = createHash('sha256').update(content).digest('hex');
      assert.equal(hash, createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../source', asset))).digest('hex'));
      report.loadedAssets[asset] = hash;
    }
    assert.equal(report.errors.length, 0); assert.equal(report.httpErrors.length, 0);
    console.log('PASS: 16 real-site smoke states, real post clipboard, unique assets and response hashes');
    return;
  }
  for (const width of [1440, 390]) for (const mode of ['light', 'dark']) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate(a);
    if (!report.initialStorage) report.initialStorage = await evaluate('Object.fromEntries(Object.entries(localStorage))');
    report.oklch = await evaluate("CSS.supports('color','oklch(.65 .18 290)')");
    await evaluate(`Settings.setTheme('${mode}');Settings.setHue(290)`); await sleep(500);
    await evaluate('document.fonts.ready.then(()=>true)');
    await evaluate("window.scrollTo({top:0,behavior:'instant'})");
    await screenshot(width + '-' + mode + '-banner');
    const state = await evaluate(snapshot);
    state.banner = await evaluate("(()=>{const e=document.querySelector('.post-meta-title'),r=e.getBoundingClientRect();return {top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,client:e.clientWidth,scroll:e.scrollWidth};})()");
    state.copy = await copyCheck();
    state.lightbox = await lightboxCheck();
    state.contrast = await contrastCheck();
    const linkCenter = await evaluate("(()=>{const e=document.querySelector('.post-content p a[href^=https]');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...linkCenter }); await sleep(400);
    state.linkHoverContrast = await contrastCheck(true);
    if (!audit) {
      for (const pair of [...Object.values(state.contrast), ...Object.values(state.linkHoverContrast)]) assert(pair.ratio >= 4.5, JSON.stringify(pair));
      assert.notDeepEqual(state.linkHoverContrast.link.fg, state.contrast.link.fg, 'Real link hover changes color');
    }
    if (!audit) state.tocNavigation = await tocCheck(width);
    // Scroll the longest code/formula locally and prove that their offsets move.
    state.scroll = await evaluate(`(()=>{const code=document.querySelector('figure.highlight'),math=[...document.querySelectorAll('.katex-display')].sort((a,b)=>b.scrollWidth-a.scrollWidth)[0];const test=e=>{if(!e)return null;e.scrollLeft=100;return {client:e.clientWidth,scroll:e.scrollWidth,left:e.scrollLeft};};return {code:test(code),math:test(math)};})()`);
    await evaluate("window.scrollTo({top:document.querySelector('.post-content-card').offsetTop,behavior:'instant'})"); await sleep(200); await screenshot(width + '-' + mode + '-article');
    await evaluate("document.querySelector('figure.highlight').scrollLeft=0;document.querySelector('figure.highlight').scrollIntoView({block:'center',behavior:'instant'})"); await screenshot(width + '-' + mode + '-code');
    if (state.math.count) {
      await evaluate("document.querySelector('.katex-display').scrollIntoView({block:'center',behavior:'instant'})"); await screenshot(width + '-' + mode + '-math');
    }
    await evaluate("document.querySelector('.post-content img').scrollIntoView({block:'center',behavior:'instant'})"); await screenshot(width + '-' + mode + '-media');
    if (!audit) {
      assert.equal(state.overflow, 0); assert.equal(state.toc.count, state.toc.headings);
      assert(state.banner.scroll <= state.banner.client + 1, 'Banner title wraps instead of clipping');
      assert(state.titleScroll <= state.title.width + 1, 'Article title wraps instead of clipping');
      assert.equal(state.toc.activeObservers, 1);
      assert(state.toc.visible || state.toc.mobileVisible);
      assert.equal(state.math.count, 6); assert.equal(state.math.errors, 0);
      assert(state.math.annotations.some(t => t.includes('\\\\')), 'Matrix row separator preserved through Markdown');
      assert(state.image.loaded && state.image.width === 2000 && state.image.height === 900);
      assert(state.image.box.width <= state.content.width + 1);
      assert(Math.abs(state.image.box.width / state.image.box.height - 2000 / 900) < .02);
      assert(state.codes.every(c => c.headers === 1 && c.buttons === 1));
      assert(state.codes[0].highlight > 0);
      assert(state.scroll.code.left > 0, 'Long code independently scrolls');
      if (width === 390) assert(state.scroll.math.left > 0, 'Long formula independently scrolls');
    }
    report.matrix.push(state);
    console.log(audit ? 'AUDIT' : 'PASS', width, mode, 'overflow', state.overflow, 'copy', state.copy.matches, 'math', state.math.count, 'TOC visible', state.toc.visible || state.toc.mobileVisible);
  }
  if (process.argv.includes('--matrix-only')) return;
  // Actual PJAX anchor clicks: context marker must survive; do not navigate() here.
  for (const width of [1440, 390]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390 });
  await navigate(a);
  await evaluate("window.__readingMarker='retained';window.__readingPjax=0;document.addEventListener('pjax:complete',()=>window.__readingPjax++)");
  for (const mode of ['light', 'dark']) {
    await evaluate(`Settings.setTheme('${mode}');Settings.setHue(240)`);
    for (const route of [b, a, b, a]) {
      const count = await evaluate('window.__readingPjax');
      await click(`.post-content a[href="${route}"]`);
      await wait(`location.pathname===${JSON.stringify(route)}&&window.__readingPjax>${count}`); await sleep(1200);
      await evaluate("document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,behavior:'instant'})");
      const state = await evaluate(snapshot);
      state.copy = await copyCheck(); state.lightbox = await lightboxCheck();
      assert.equal(await evaluate('window.__readingMarker'), 'retained');
      if (!audit) {
        assert.equal(state.overflow, 0); assert.equal(state.hue, '240'); assert.equal(state.mode, mode);
        assert.equal(state.toc.count, state.toc.headings);
        assert.equal(state.toc.activeObservers, 1);
        assert.equal(state.toc.mobile, 1);
        assert.equal(state.wrappers, route === a ? 2 : 1);
        assert.equal(state.math.count, route === a ? 6 : 2);
        assert.equal(state.math.errors, 0);
        assert(state.codes.every(c => c.headers === 1 && c.buttons === 1));
      }
      report.pjax.push(state);
    }
  }
  }
  // Homepage -> article must work without the reading adapter being loaded anew.
  await send('Page.navigate', { url: base + '/' });
  await wait("document.readyState==='complete'&&!!window.pjax&&!!window.Settings");
  await evaluate("document.documentElement.style.scrollBehavior='auto';Settings.setTheme('dark');Settings.setHue(353);window.__homeMarker='retained';window.__readingPjax=0;document.addEventListener('pjax:complete',()=>window.__readingPjax++)");
  await click(`.post-card-title a[href="${a}"]`);
  await wait("location.pathname==='/2026/10/29/reading-a/'&&window.__readingPjax>0"); await sleep(1200);
  report.homeToArticle = await evaluate(snapshot);
  if (!audit) {
    assert.equal(await evaluate('window.__homeMarker'), 'retained');
    assert.equal(report.homeToArticle.math.count, 6);
    assert.equal(report.homeToArticle.toc.activeObservers, 1);
    assert.equal(report.homeToArticle.hue, '353');
    assert.equal(report.homeToArticle.mode, 'dark');
    assert.equal(report.errors.length, 0); assert.equal(report.httpErrors.length, 0);
  }
} catch (e) { report.fatal = e.stack; console.error(e); process.exitCode = 1;
} finally {
  if (ws?.readyState === 1) {
    try {
      if (report.initialStorage) {
        await evaluate(`(()=>{const initial=${JSON.stringify(report.initialStorage)};for(const key of Object.keys(localStorage))if(!(key in initial))localStorage.removeItem(key);for(const[k,v]of Object.entries(initial))localStorage.setItem(k,v);})()`);
        report.finalStorage = await evaluate('Object.fromEntries(Object.entries(localStorage))');
      }
      ws.send(JSON.stringify({ id: ++sequence, method: 'Browser.close' })); await sleep(300); ws.close();
    } catch (e) { report.cleanupError = String(e); }
  }
  if (browser?.exitCode === null) browser.kill('SIGTERM');
  report.end = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
} })();
