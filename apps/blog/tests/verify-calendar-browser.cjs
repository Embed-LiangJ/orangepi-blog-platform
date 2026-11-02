'use strict';
// Real Hexo + Chromium/CDP. Test timers live in Node only. No EventTarget
// interception, injected init counters, cache clearing or production API patch.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {spawn}=require('child_process');
const {createHash}=require('crypto');
const out=path.resolve(process.argv[2]||'');
if(!process.argv[2]||fs.existsSync(out))throw Error('Provide a NEW evidence directory on a filesystem with space');
fs.mkdirSync(out,{recursive:true});
const control=process.argv.includes('--control');
const report={start:new Date().toISOString(),control,status:'RUNNING',samples:[],errors:[],requestsFailed:[],checks:[],blocked:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser,ws,server,sequence=0,pauseHandler=null,fetchHandler=null;
const pending=new Map();
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression,limit=40000){const start=Date.now();while(Date.now()-start<limit){if(await evaluate(expression))return;await sleep(100);}throw Error('Wait timeout '+expression);}
const article='/2026/10/29/reading-a/';let base,publicDir,nativeInline,nativeInits=0;
async function navigate(route){await send('Page.navigate',{url:base+route});await wait("document.readyState==='complete'&&!!window.SiteCalendarLifecycle&&!!window.pjax");await sleep(400);}
async function pjax(route){
 const before=await evaluate('SiteCalendarLifecycle.stats().completes');
 const selector=route==='/'?'a[href="/"]':'.post-card-title a[href="'+route+'"]';
 await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing real navigation anchor');e.click();})()`);
 await wait(`location.pathname===${JSON.stringify(route)}&&SiteCalendarLifecycle.stats().completes>${before}`);
 assert.equal(await evaluate('window.__calendarContext'),'retained','PJAX retained the window');
 await sleep(250);
}
async function domListeners(expression){
 const group='calendar-listeners';const target=await send('Runtime.evaluate',{expression,objectGroup:group});
 const result=await send('DOMDebugger.getEventListeners',{objectId:target.result.objectId});
 const rows=result.listeners.map(l=>({type:l.type,once:l.once,capture:l.useCapture,name:(l.handler?.description||l.originalHandler?.description||'').split('\n')[0],scriptId:l.scriptId,line:l.lineNumber}));
 for(const l of result.listeners)for(const obj of [l.handler,l.originalHandler])if(obj?.objectId)await send('Runtime.releaseObject',{objectId:obj.objectId});
 await send('Runtime.releaseObjectGroup',{objectGroup:group});return rows;
}
async function metrics(){return {dom:await send('Memory.getDOMCounters'),heap:await send('Runtime.getHeapUsage')};}
async function sample(width,round){
 await sleep(2500);const before=await metrics();await send('HeapProfiler.collectGarbage');await sleep(300);const after=await metrics();
 const state=await evaluate('SiteCalendarLifecycle.stats()');const row={width,round,before,after,state};
 if(!control){
  row.document=await domListeners('document');row.window=await domListeners('window');row.root=await domListeners("document.querySelector('.calendar-widget')");
  const dispatch=row.document.filter(l=>l.type==='pjax:complete'&&l.name.includes('onCalendarComplete'));
  assert.equal(dispatch.length,1);assert(![...row.document,...row.window].some(l=>l.name.includes('initCalendar')));
  const coverage=await send('Profiler.takePreciseCoverage');let delta=0;
  for(const script of coverage.result)for(const f of script.functions)if(f.functionName==='initCalendar')delta+=f.ranges[0].count;
  nativeInits+=delta;row.nativeInitDelta=delta;row.nativeInits=nativeInits;
  assert.equal(nativeInits,round+1,'Actual native initCalendar calls from precise coverage');
 }
 assert.equal(state.installs,1);assert.equal(state.mounts,round+1);assert.equal(state.unmounts,round);assert(state.mounted&&state.scopeActive&&state.cleanupActive);
 report.samples.push(row);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(report,null,2));
 console.log('PASS sample',width,round,'mount',state.mounts,'unmount',state.unmounts,'Documents',before.dom.documents,'->',after.dom.documents);
}
async function ownership(capture){
 // Pause only the public stats method to inspect its actual lexical state.
 // No debug API is added to production and no strong old-DOM handle is kept.
 const fn=await send('Runtime.evaluate',{expression:'SiteCalendarLifecycle.stats',objectGroup:'calendar-ownership'});
 const bp=await send('Debugger.setBreakpointOnFunctionCall',{objectId:fn.result.objectId});
 let resolve,reject;const paused=new Promise((a,b)=>{resolve=a;reject=b;});
 pauseHandler=async p=>{try{
  const expression=`(()=>{${capture?"window.__calendarWeak={root:new WeakRef(root),scope:new WeakRef(scope),cleanup:new WeakRef(cleanup)};":''}return {root:root!==null,scope:scope!==null,cleanup:cleanup!==null};})()`;
  const r=await send('Debugger.evaluateOnCallFrame',{callFrameId:p.callFrames[0].callFrameId,expression,returnByValue:true});
  if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));await send('Debugger.resume');resolve(r.result.value);
 }catch(e){try{await send('Debugger.resume');}catch{}reject(e);}};
 try{const [,state]=await Promise.all([evaluate('SiteCalendarLifecycle.stats()'),paused]);return state;}
 finally{pauseHandler=null;await send('Debugger.removeBreakpoint',{breakpointId:bp.breakpointId});await send('Runtime.releaseObjectGroup',{objectGroup:'calendar-ownership'});}
}
async function extras(){
 await send('Debugger.enable');
 const captured=await ownership(true);assert(captured.root&&captured.scope&&captured.cleanup);
 await pjax(article);const released=await ownership(false);assert.deepEqual(released,{root:false,scope:false,cleanup:false});
 await sleep(2500);await send('HeapProfiler.collectGarbage');await sleep(300);
 const weak=await evaluate('Object.fromEntries(Object.entries(__calendarWeak).map(([k,v])=>[k,!!v.deref()]))');
 assert(!weak.scope&&!weak.cleanup,'Disposed scope/cleanup must not stay rooted by the controller');
 report.checks.push({name:'actual private ownership after unmount',captured,released,weak,note:'Old root GC is recorded, not required: unrelated Chromium MQL retainers are not masked.'});
 await send('Debugger.disable');
 await pjax('/');
 const before=await evaluate('SiteCalendarLifecycle.stats().mounts');
 await evaluate(`(()=>{document.dispatchEvent(new Event('pjax:complete'));document.dispatchEvent(new Event('pjax:complete'));window.eval(${JSON.stringify(nativeInline)});const s=document.createElement('script');s.src=document.querySelector('script[data-site-calendar-lifecycle]').src;document.head.appendChild(s);})()`);
 await sleep(400);assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounts'),before);
 report.checks.push({name:'duplicate complete and controller script',status:'PASS'});
 // Exercise original controls; .click() is real browser DOM dispatch, not a
 // claim of visible/mobile physical pointer interaction (mobile sidebar hides).
 const ui=await evaluate(`(()=>{const d=document,id=x=>d.getElementById(x),start=id('current-month-display').textContent;
 id('next-month-btn').click();const next=id('current-month-display').textContent;id('prev-month-btn').click();const prev=id('current-month-display').textContent;
 id('current-month-display').click();const months=id('month-view-container').querySelectorAll('[data-month]').length;
 id('current-month-display').click();const years=id('year-view-container').querySelectorAll('[data-year]').length;
 const post=new Date(window.__allPostMetaCache[0].published);const year=id('year-view-container').querySelector('[data-year="'+post.getFullYear()+'"]');if(!year)throw Error('Missing post year');year.click();id('month-view-container').querySelector('[data-month="'+post.getMonth()+'"]').click();
 const dates=d.querySelectorAll('.calendar-day[data-has-post="true"]');if(!dates.length)throw Error('Missing post date');dates[0].click();const postLinks=d.querySelectorAll('#calendar-posts-list a').length,selected=d.querySelectorAll('.calendar-day-selected').length;
 id('reset-month-btn').click();const reset=id('current-month-display').textContent;
 return {start,next,prev,months,years,reset,today:d.querySelectorAll('.today-highlight').length,postLinks,selected};})()`);
 assert.notEqual(ui.start,ui.next);assert.equal(ui.start,ui.prev);assert.equal(ui.start,ui.reset);assert.equal(ui.months,12);assert(ui.years>0);assert.equal(ui.today,1);assert(ui.postLinks>0);assert.equal(ui.selected,1);
 report.checks.push({name:'native month/year/today/day post controls',...ui});
 // Full article startup has no factory. Its first PJAX home installs exactly once.
 await navigate(article);await evaluate("window.__calendarContext='retained'");assert.equal(await evaluate('SiteCalendarLifecycle.hasFactory()'),false);
 await pjax('/');assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounts'),1);
 report.checks.push({name:'full article first -> first PJAX home',status:'PASS'});
 await pjax('/2026/10/28/reading-b/');assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounted'),false);
 report.checks.push({name:'second no-calendar article',status:'PASS'});
}
async function delayedJSON(){
 // Forward real fetch + JSON parsing, then hold only delivery of the first
 // calendar result. Deliberately ignore abort AFTER parsing to model a late task.
 await navigate(article);await evaluate("window.__calendarContext='retained'");
 await evaluate(`(()=>{const fetchNative=window.fetch.bind(window);window.__calendarHeld=null;window.__calendarSignals=[];
 window.fetch=async function(url,options){if(!String(url).includes('/api/allPostMeta.json'))return fetchNative(url,options);
 __calendarSignals.push(options.signal);const r=await fetchNative(url,options);if(__calendarSignals.length!==1)return r;
 return {json:async function(){await r.json();return new Promise(resolve=>{window.__calendarHeld=()=>resolve([{id:'STALE',title:'STALE',published:new Date().toISOString(),path:'/stale/'}]);});}};};})()`);
 await pjax('/');await wait('typeof __calendarHeld===\'function\'');
 await pjax(article);assert.equal(await evaluate('__calendarSignals[0].aborted'),true);
 await pjax('/');await wait('Array.isArray(window.__allPostMetaCache)');
 const before=await evaluate('JSON.stringify(__allPostMetaCache)');await evaluate('__calendarHeld()');await sleep(300);
 assert.equal(await evaluate('JSON.stringify(__allPostMetaCache)'),before);assert(!before.includes('STALE'));
 report.checks.push({name:'real fetch/JSON with held stale delivery after abort',status:'PASS'});
}
async function delayedFetch(){
 const held=[];fetchHandler=p=>{held.push(p);};
 await send('Fetch.enable',{patterns:[{urlPattern:'*/api/allPostMeta.json*',requestStage:'Request'}]});
 await navigate('/');await evaluate("window.__calendarContext='retained'");
 for(let i=0;i<100&&!held.length;i++)await sleep(100);assert.equal(held.length,1);
 await pjax(article);assert.equal(await evaluate('SiteCalendarLifecycle.stats().scopeActive'),false);
 await pjax('/');for(let i=0;i<100&&held.length<2;i++)await sleep(100);assert.equal(held.length,2);
 const data=[{id:'NEW',title:'B1 current test response',published:new Date().toISOString(),path:article}];
 await send('Fetch.fulfillRequest',{requestId:held[1].requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});
 await wait('window.__allPostMetaCache?.[0]?.id===\'NEW\'');
 let oldOutcome;try{await send('Fetch.fulfillRequest',{requestId:held[0].requestId,responseCode:200,body:Buffer.from('[{"id":"STALE"}]').toString('base64')});oldOutcome='late response accepted by CDP';}catch(e){oldOutcome=String(e);}
 await sleep(300);assert.equal(await evaluate('__allPostMetaCache[0].id'),'NEW');
 await send('Fetch.disable');fetchHandler=null;
 report.checks.push({name:'held network fetch aborted; late response cannot poison current cache',status:'PASS',oldOutcome});
}
async function navigationFailures(){
 await navigate('/');await evaluate("window.__calendarContext='retained';window.__calendarOriginalRoot=document.querySelector('.calendar-widget')");
 const held=[];fetchHandler=p=>held.push(p);
 await send('Fetch.enable',{patterns:[{urlPattern:'*'+article+'*',resourceType:'XHR',requestStage:'Request'}]});
 const initial=await evaluate('SiteCalendarLifecycle.stats()');
 async function hold(){const count=held.length;await evaluate(`pjax.loadUrl(${JSON.stringify(base+article)})`);for(let i=0;i<100&&held.length===count;i++)await sleep(100);assert.equal(held.length,count+1);assert.equal(await evaluate('document.querySelector(\'.calendar-widget\')===__calendarOriginalRoot'),true);assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounts'),initial.mounts);return held[held.length-1];}
 try{
  await hold();await evaluate('pjax.abortRequest(pjax.request)');await sleep(300);
  assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounted'),true);assert.equal(await evaluate('SiteCalendarLifecycle.stats().unmounts'),initial.unmounts);
  report.checks.push({name:'actual canceled PJAX XHR leaves displayed root mounted',status:'PASS'});
  const failed=await hold(),complete=await evaluate('SiteCalendarLifecycle.stats().completes');
  await send('Fetch.failRequest',{requestId:failed.requestId,errorReason:'Failed'});await wait('SiteCalendarLifecycle.stats().completes>'+complete);
  assert.equal(await evaluate('window.__calendarContext'),'retained');assert.equal(await evaluate('document.querySelector(\'.calendar-widget\')===__calendarOriginalRoot'),true);assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounts'),initial.mounts);
  report.checks.push({name:'actual failed PJAX XHR and complete do not reinitialize same root',status:'PASS'});
  const rapid=await hold();await evaluate(`pjax.loadUrl(${JSON.stringify(base+'/2026/10/28/reading-b/')})`);
  await wait("location.pathname==='/2026/10/28/reading-b/'&&!SiteCalendarLifecycle.stats().mounted");
  assert.equal(await evaluate('window.__calendarContext'),'retained');assert.equal(await evaluate('SiteCalendarLifecycle.stats().unmounts'),initial.unmounts+1);
  let stale;try{await send('Fetch.continueRequest',{requestId:rapid.requestId});stale='continued';}catch(e){stale=String(e);}
  await send('Fetch.disable');fetchHandler=null;await pjax('/');assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounts'),initial.mounts+1);
  await evaluate('delete window.__calendarOriginalRoot');report.checks.push({name:'rapid overlapping real PJAX XHRs abort first; last route wins',status:'PASS',stale});
 }finally{await send('Fetch.disable');fetchHandler=null;}
}
async function historyAndBFCache(){
 await navigate('/');await evaluate("window.__calendarContext='retained';window.__bfMarker='original';window.__bfShows=[];addEventListener('pageshow',e=>__bfShows.push(e.persisted))");
 await pjax(article);await pjax('/');
 await evaluate('history.back()');await wait(`location.pathname===${JSON.stringify(article)}`);await wait('!SiteCalendarLifecycle.stats().mounted');
 await evaluate('history.forward()');await wait("location.pathname==='/'&&SiteCalendarLifecycle.stats().mounted");
 report.checks.push({name:'PJAX history back/forward',status:'PASS'});
 const history=await send('Page.getNavigationHistory');const entry=history.entries[history.currentIndex].id;
 await navigate('/categories/');await send('Page.navigateToHistoryEntry',{entryId:entry});
 await wait("document.readyState==='complete'&&!!window.SiteCalendarLifecycle");
 const state=await evaluate('({marker:window.__bfMarker||null,shows:window.__bfShows||[],stats:SiteCalendarLifecycle.stats()})');
 if(state.marker==='original'&&state.shows.includes(true)){assert(state.stats.mounted);report.checks.push({name:'real BFCache persisted restoration',status:'PASS',state});}
 else report.blocked.push({name:'real BFCache persisted restoration',reason:'Browser did not demonstrate a persisted return; synthetic page events are unit coverage only',state});
}
async function main(){
 let siteArg=process.argv.indexOf('--public');
 if(siteArg>=0)publicDir=path.resolve(process.argv[siteArg+1]);
 else{
  const Hexo=require('hexo'),init=Hexo.prototype.init,call=Hexo.prototype.call;report.hexo={};
  Hexo.prototype.init=async function(...args){const value=await init.apply(this,args);report.hexo.a1={phase:this[Symbol.for('site.emptyFenceCompat.v1')]?.phase,filters:this.extend.filter.list('before_post_render').map(f=>({name:f.name,priority:f.priority}))};return value;};
  Hexo.prototype.call=async function(...args){const value=await call.apply(this,args);if(args[0]==='generate'){report.hexo.a1.executions=this[Symbol.for('site.emptyFenceCompat.v1')]?.executions;report.hexo.views=Object.fromEntries(['_partials/head.ejs','_partials/widgets/calendar.ejs'].map(n=>[n,createHash('sha256').update(this.theme.getView(n).data._content).digest('hex')]));}return value;};
  try{publicDir=await require('./build-reading-fixture.cjs')(path.join(out,'site'));}finally{Hexo.prototype.init=init;Hexo.prototype.call=call;}
  assert.equal(report.hexo.a1.phase,'ready');assert(report.hexo.a1.executions>0);
 }
 const html=fs.readFileSync(path.join(publicDir,'index.html'),'utf8');
 const parsed=new (require('jsdom').JSDOM)(html);
 const inlines=[...parsed.window.document.scripts].filter(s=>s.textContent.includes('window.SiteCalendarLifecycle.install'));
 assert.equal(inlines.length,1);nativeInline=inlines[0].textContent;parsed.window.close();
 assert.equal((html.match(/data-site-calendar-lifecycle/g)||[]).length,1);
 assert(!/addEventListener\(["'](?:pjax:complete|swup:contentReplaced)["'], initCalendar/.test(html));
 assert(html.indexOf('data-site-calendar-lifecycle')<html.indexOf('function initCalendar'));
 const script=fs.readFileSync(path.join(publicDir,'js/site-calendar-lifecycle.js'));const version=createHash('sha256').update(script).digest('hex').slice(0,12);assert(html.includes('?v='+version));
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let relative;try{relative=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}let file=path.resolve(publicDir,'.'+relative);if(!file.startsWith(publicDir+path.sep)&&file!==publicDir){res.writeHead(403);res.end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const body=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;report.base=base;
 const log=fs.openSync(path.join(out,'chromium.log'),'wx');
 report.flags=['--headless','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--no-first-run','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+path.join(out,'profile'),'--enable-experimental-web-platform-features','about:blank'];
 browser=spawn('chromium-browser',report.flags,{stdio:['ignore',log,'pipe']});let stderr='',port;browser.stderr.on('data',x=>{stderr+=x;fs.writeSync(log,x);});
 for(let i=0;i<150;i++){const m=stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){port=m[1];break;}if(browser.exitCode!==null)throw Error('Chromium exited');await sleep(100);}assert(port);
 report.browser=await (await fetch('http://127.0.0.1:'+port+'/json/version')).json();const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}return;}
  if(m.method==='Debugger.paused'&&pauseHandler)pauseHandler(m.params);
  if(m.method==='Fetch.requestPaused'&&fetchHandler)fetchHandler(m.params);
  if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.errors.push(m.params.args.map(a=>a.value||a.description));
  if(m.method==='Network.loadingFailed')report.requestsFailed.push(m.params);
 };
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('HeapProfiler.enable');
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:900,deviceScaleFactor:1,mobile:width===390});
  if(!control){await send('Profiler.enable');await send('Profiler.startPreciseCoverage',{callCount:true,detailed:true});}nativeInits=0;
  await navigate('/');await wait("document.querySelectorAll('#calendar-grid .calendar-day').length>20");await evaluate("window.__calendarContext='retained'");await sample(width,0);
  for(let round=1;round<=20;round++){await pjax(article);assert.equal(await evaluate('SiteCalendarLifecycle.stats().mounted'),false);await pjax('/');if([1,5,10,20].includes(round))await sample(width,round);}
  if(!control){await send('Profiler.stopPreciseCoverage');await send('Profiler.disable');}
 }
 if(!control){
  await extras();await delayedJSON();await delayedFetch();await navigationFailures();await historyAndBFCache();
 }
 assert.equal(report.errors.length,0);report.status=report.blocked.length?'BLOCKED':'PASS';
}
main().catch(e=>{report.status='FAIL';report.fatal=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
 if(ws?.readyState===1){try{ws.send(JSON.stringify({id:++sequence,method:'Browser.close'}));await sleep(300);ws.close();}catch{}}
 if(browser?.exitCode===null)browser.kill('SIGTERM');if(server)await new Promise(r=>server.close(r));
 for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Browser test ended'));}pending.clear();
 report.end=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.log(report.status,'samples',report.samples.length,'checks',report.checks.length,'evidence',out);
});
