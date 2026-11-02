'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const assert = require('assert/strict');
const { JSDOM } = require('jsdom');
const ejs = require('ejs');
const root = path.resolve(__dirname, '..');
const controller = fs.readFileSync(path.join(root, 'source/js/site-calendar-lifecycle.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'scripts/site-calendar-lifecycle.js'), 'utf8');
const names = ['_partials/head.ejs', '_partials/widgets/calendar.ejs'];
const raw = Object.fromEntries(names.map(n => [n, fs.readFileSync(path.join(root, 'themes/firefly/layout', n), 'utf8')]));
function context() {
  const views = Object.fromEntries(names.map(n => [n, { data: { _content: raw[n], marker: n } }]));
  let hook;
  const calls = [];
  const ctx = { version: '8.1.2', source_dir: path.join(root, 'source'),
    extend: { filter: { register(type, fn, priority) {
      assert.equal(type, 'before_generate'); assert.equal(priority, 4); hook = fn;
    } } },
    theme: { getView: n => views[n], setView(n, data) { calls.push(n); views[n] = { data }; } } };
  vm.runInNewContext(adapter, { hexo: ctx, require, console });
  return { ctx, views, calls, run: () => hook.call(ctx) };
}
function rendered() {
  const test = context(); test.run();
  const html = ejs.render(test.views[names[1]].data._content, {
    __: key => ({ calendar_year: '年' }[key] || key), config: { language: 'zh-CN' }, url_for: p => p
  });
  const parsed = new JSDOM(html);
  const markup = parsed.window.document.querySelector('.calendar-widget').outerHTML;
  const script = parsed.window.document.querySelector('script').textContent;
  parsed.window.close();
  return { markup, script };
}
const report = { tests: [], status: 'RUNNING' };
async function test(name, body) { await body(); report.tests.push({ name, status: 'PASS' }); console.log('PASS', name); }
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function runtime(options = {}) {
  const fixture = rendered();
  const dom = new JSDOM('<!doctype html><body>' + (options.empty ? '' : fixture.markup) + '</body>', { runScripts: 'outside-only', url: 'http://calendar.invalid/' });
  const w = dom.window, errors = [], requests = [];
  Object.defineProperty(w.document, 'readyState', { configurable: true, value: 'complete' });
  w.console.error = (...args) => errors.push(args.map(String));
  w.fetch = (url, init) => { const d = deferred(); requests.push({ ...d, url, signal: init.signal }); return d.promise; };
  if (options.cache) w.__allPostMetaCache = options.cache;
  const native = fixture.script.replace('  function initCalendar() {', '  function initCalendar() {\n    window.__actualCalendarInit = (window.__actualCalendarInit || 0) + 1;');
  w.eval(controller);
  if (!options.noFactory) w.eval(native);
  const event = name => w.document.dispatchEvent(new w.Event(name));
  const replace = (present = true) => {
    w.document.querySelector('.calendar-widget')?.remove();
    if (present) w.document.body.insertAdjacentHTML('beforeend', fixture.markup);
    event('pjax:complete');
  };
  return { dom, w, errors, requests, event, replace, native, fixture,
    stats: () => w.SiteCalendarLifecycle.stats() };
}
// Shared by the real install path and an isolated exception-swallowing fault.
function verifyMountFailure(r, install) {
  const scopes=[];let fail=true,disposed=0;
  assert.throws(()=>install({mount(node,scope){scopes.push(scope);if(fail){fail=false;throw Error('mount-test');}return()=>{disposed++;};},unmount(){}}),
    { name:'Error', message:'mount-test' });
  assert(!r.stats().mounted&&!r.stats().scopeActive&&!r.stats().cleanupActive);
  assert.equal(scopes.length,1);assert(scopes[0].signal.aborted);assert.equal(scopes[0].isCurrent(),false);
  r.event('pjax:complete');assert(r.stats().mounted&&r.stats().scopeActive&&r.stats().cleanupActive);
  assert.equal(scopes.length,2);assert.equal(scopes[1].isCurrent(),true);assert.equal(scopes[0].isCurrent(),false);
  r.replace(false);assert(!r.stats().mounted&&!r.stats().scopeActive&&!r.stats().cleanupActive);
  assert.equal(disposed,1);assert(scopes[1].signal.aborted);
}
async function main() {
  await test('memory views: exact anchors, two targets, sync head/version/subpath, repeated generate', () => {
    const t = context(); t.run(); assert.deepEqual(t.calls, names);
    const output = names.map(n => t.views[n].data._content);
    t.run(); assert.equal(t.calls.length, 2); assert.deepEqual(names.map(n => t.views[n].data._content), output);
    for (const n of names) assert.equal(t.views[n].data.marker, n);
    const tag = output[0].split('\n').filter(line => line.startsWith('<script data-site-calendar-lifecycle '));
    assert.equal(tag.length, 1); assert(!/\b(?:defer|async)\b/.test(tag[0]));
    assert(tag[0].includes("url_for('/js/site-calendar-lifecycle.js')")); assert(/\?v=[0-9a-f]{12}/.test(tag[0]));
    assert(ejs.render(tag[0], { url_for: p => '/sub' + p }).includes('/sub/js/site-calendar-lifecycle.js'));
    assert(!output[1].includes('document.addEventListener')); assert(!output[1].includes('window.initCalendar'));
    t.views[names[0]] = { data: { _content: raw[names[0]] } }; t.run(); assert.equal(t.calls.length, 3);
  });
  await test('unknown/duplicate anchors, mixed edits and version mismatch: zero setView', () => {
    for (const name of names) for (const text of [raw[name]+'\nunknown', raw[name]+raw[name]]) {
      const t=context(); t.views[name].data._content=text; assert.throws(t.run,/Review/); assert.equal(t.calls.length,0);
    }
    const t=context(); t.ctx.version='9'; assert.throws(t.run,/version/); assert.equal(t.calls.length,0);
    const u=context(); u.run(); u.views[names[1]].data._content+='unknown'; assert.throws(u.run,/Review/); assert.equal(u.calls.length,2);
  });
  await test('setView failure restores both originals; restoration failure rejects', () => {
    for (const always of [false,true]) {
      const t=context(); const set=t.ctx.theme.setView; let attempts=0;
      t.ctx.theme.setView=(n,data)=>{ attempts++; set(n,data); if (attempts===2 || always&&attempts>2) throw Error('injected'); };
      assert.throws(t.run, always?/restoration failed/:/originals restored/);
      if (!always) for (const n of names) assert.equal(t.views[n].data._content,raw[n]);
    }
  });
  await test('factory singleton, repeated scripts/events, native init, no-calendar and article-first', () => {
    const r=runtime({ empty:true }); try {
      assert.equal(r.stats().mounts,0); const api=r.w.SiteCalendarLifecycle;
      r.w.eval(controller); assert.equal(r.w.SiteCalendarLifecycle,api); r.w.eval(r.native);
      r.replace(); assert.equal(r.w.__actualCalendarInit,1);
      for (let i=0;i<5;i++){r.event('pjax:complete');r.event('DOMContentLoaded');r.w.eval(r.native);}
      assert.equal(r.stats().installs,1); assert.equal(r.stats().mounts,1); assert.equal(r.w.__actualCalendarInit,1);
      r.replace(false); assert.equal(r.stats().unmounts,1); assert(!r.stats().mounted&&!r.stats().scopeActive&&!r.stats().cleanupActive);
      r.replace(); assert.equal(r.w.__actualCalendarInit,2);
    } finally {r.dom.window.close();}
  });
  await test('loading document mounts once at DOMContentLoaded', () => {
    const r=runtime({noFactory:true}); try {
      Object.defineProperty(r.w.document,'readyState',{value:'loading',configurable:true});
      r.w.eval(r.native); assert.equal(r.stats().mounts,0);r.event('DOMContentLoaded');r.event('DOMContentLoaded');assert.equal(r.w.__actualCalendarInit,1);
    }finally{r.dom.window.close();}
  });
  await test('native controls and identity-owned DOM0 cleanup preserve foreign listeners', () => {
    const now=new Date(); const stamp=new Date(now.getFullYear(),now.getMonth(),2,12).toISOString();
    const r=runtime({cache:[{id:1,title:'calendar-test',published:stamp,path:'/article/'}]}); try {
      const d=r.w.document, q=id=>d.getElementById(id), original=q('current-month-display').textContent;
      q('next-month-btn').click();assert.notEqual(q('current-month-display').textContent,original);
      r.event('pjax:complete');assert.notEqual(q('current-month-display').textContent,original);
      q('prev-month-btn').click();assert.equal(q('current-month-display').textContent,original);
      q('current-month-display').click();assert.equal(q('month-view-container').querySelectorAll('[data-month]').length,12);
      q('current-month-display').click();assert.equal(q('year-view-container').querySelectorAll('[data-year]').length,1);
      q('year-view-container').querySelector('[data-year]').click();q('month-view-container').querySelector('[data-month="'+now.getMonth()+'"]').click();
      q('calendar-grid').querySelector('[data-has-post="true"]').click();assert.equal(q('calendar-posts-list').querySelector('a').textContent.includes('calendar-test'),true);
      q('next-month-btn').click();q('reset-month-btn').click();assert.equal(q('current-month-display').textContent,original);
      assert.equal(d.querySelectorAll('.today-highlight').length,1);
      const nodes=['prev-month-btn','next-month-btn','reset-month-btn','current-month-display'].map(q);
      let foreign=0; const handler=()=>foreign++;nodes[0].onclick=handler;nodes[1].addEventListener('click',handler);
      r.replace(false);assert.equal(nodes[0].onclick,handler);for(const node of nodes.slice(1))assert.equal(node.onclick,null);
      nodes[1].click();assert.equal(foreign,1);
    }finally{r.dom.window.close();}
  });
  for (const phase of ['fetch','json']) await test('AbortController and stale '+phase+' cannot commit state/cache/DOM',async()=>{
    const r=runtime();try{
      const old=r.requests[0], json=deferred();let parsed=0;
      if(phase==='json'){old.resolve({json:()=>{parsed++;return json.promise;}});await tick();assert.equal(parsed,1);}
      r.replace(false);assert(old.signal.aborted);r.replace();assert.equal(r.requests.length,2);
      r.requests[1].resolve({json:async()=>[]});await tick();const html=r.w.document.querySelector('.calendar-widget').innerHTML;
      if(phase==='fetch')old.resolve({json:()=>{parsed++;return Promise.resolve([{title:'STALE'}]);}});else json.resolve([{title:'STALE'}]);
      await tick();assert.equal(JSON.stringify(r.w.__allPostMetaCache),'[]');assert.equal(r.w.document.querySelector('.calendar-widget').innerHTML,html);
      assert.equal(parsed,phase==='fetch'?0:1);assert.equal(r.errors.length,0);
    }finally{r.dom.window.close();}
  });
  await test('current real error preserved; AbortError/stale failures quiet; no retry',async()=>{
    for(const mode of ['current','abort','stale']){
      const r=runtime();try{if(mode==='stale')r.replace(false);const err=Error('test-error');if(mode==='abort')err.name='AbortError';r.requests[0].reject(err);await tick();assert.equal(r.errors.length,mode==='current'?1:0);assert.equal(r.requests.length,1);}finally{r.dom.window.close();}
    }
  });
  await test('mount/cleanup errors release state and recover; scope never captures a prior root',()=>{
    const r=runtime({noFactory:true});try{
      verifyMountFailure(r,api=>r.w.SiteCalendarLifecycle.install(api));
    }finally{r.dom.window.close();}
    const s=runtime({noFactory:true});try{
      const scopes=[];let unmounts=0;s.w.SiteCalendarLifecycle.install({mount(n,scope){scopes.push(scope);return()=>{throw Error('cleanup-test');};},unmount(){unmounts++;}});
      const errors=[];s.w.addEventListener('error',e=>{errors.push(e.message);e.preventDefault();});
      s.w.dispatchEvent(new s.w.PageTransitionEvent('pagehide'));assert.equal(unmounts,1);assert.equal(scopes[0].isCurrent(),false);assert(scopes[0].signal.aborted);assert(!s.stats().mounted&&!s.stats().cleanupActive);
      s.w.dispatchEvent(new s.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(s.stats().mounts,2);assert.equal(scopes[1].isCurrent(),true);assert.equal(scopes[0].isCurrent(),false);assert.equal(errors.length,1);
    }finally{s.dom.window.close();}
  });
  await test('swallowed install exception fails the same mount-error regression assertion',()=>{
    const r=runtime({noFactory:true});try{
      let swallowed=false;
      // Test-local wrapper only: do not replace the frozen production API.
      const install=api=>{try{r.w.SiteCalendarLifecycle.install(api);}catch(error){
        assert.equal(error.message,'mount-test');swallowed=true;
      }};
      assert.throws(()=>verifyMountFailure(r,install),error=>{
        assert(error instanceof assert.AssertionError);
        assert.equal(error.code,'ERR_ASSERTION');
        assert.match(error.message,/Missing expected exception/);
        return true;
      });
      assert.equal(swallowed,true,'The injected path must actually swallow the mount error');
    }finally{r.dom.window.close();}
  });
  await test('AbortController construction failure leaves no half-mounted root; next event recovers',()=>{
    const r=runtime({noFactory:true});try{
      assert.throws(()=>r.w.SiteCalendarLifecycle.install({mount:3}),/Invalid calendar factory/);
      const Native=r.w.AbortController;r.w.AbortController=function(){throw Error('scope-construction');};
      assert.throws(()=>r.w.SiteCalendarLifecycle.install({mount(){return()=>{};}}),/scope-construction/);
      assert.equal(r.stats().mounts,0);assert(!r.stats().mounted&&!r.stats().scopeActive);
      r.w.AbortController=Native;r.event('pjax:complete');assert.equal(r.stats().mounts,1);assert(r.stats().mounted);
      r.replace(false);assert(!r.stats().cleanupActive);
    }finally{r.dom.window.close();}
  });
  await test('pagehide suspends, duplicate complete stays unmounted, persisted restore once; DOM contract rejects',()=>{
    const r=runtime();try{
      r.w.dispatchEvent(new r.w.PageTransitionEvent('pagehide'));r.event('pjax:complete');assert.equal(r.stats().mounts,1);
      r.w.dispatchEvent(new r.w.PageTransitionEvent('pageshow',{persisted:false}));assert(!r.stats().mounted);
      r.w.dispatchEvent(new r.w.PageTransitionEvent('pageshow',{persisted:true}));r.w.dispatchEvent(new r.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(r.stats().mounts,2);
      const errors=[];r.w.addEventListener('error',e=>{errors.push(e.message);e.preventDefault();});r.w.document.body.insertAdjacentHTML('beforeend',r.fixture.markup);r.event('pjax:complete');assert.equal(errors.length,1);assert(!r.stats().mounted);
    }finally{r.dom.window.close();}
  });
  report.status='PASS';
}
module.exports = { context, rendered };
if(require.main===module){main().catch(e=>{report.status='FAIL';report.error=e.stack;console.error(e);process.exitCode=1;}).finally(()=>{if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2),{flag:'wx'});});}
