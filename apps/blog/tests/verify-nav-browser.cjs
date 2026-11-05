'use strict';
// Navigation-only CDP regression. No screenshots, build, clean, or DOM-click fallback.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {spawn}=require('child_process'),{createHash}=require('crypto');
const {inspectPageDOM}=require('./page-isolation-contract.cjs');
const routes=['/','/archives/','/research-projects/','/about/','/categories/','/tags/','/categories/技术测试/','/tags/Hexo/','/2026/10/30/hello-firefly/','/dynamic/'];
const out=path.resolve(process.argv[2]||''),site=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3]||fs.existsSync(out)||process.argv.length!==4)throw Error('Usage: node verify-nav-browser.cjs <NEW evidence dir> <existing public> (legacy --expect-broken belongs to the Stage 3.4 Git version)');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const p of ['index.html','archives/index.html','categories/index.html','tags/index.html','dynamic/index.html','research-projects/index.html','about/index.html','js/site-navigation.js','css/site-navigation.css'])assert(fs.existsSync(path.join(site,p)),p);
fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',input:{public:fs.realpathSync(site),harnessSha256:sha(__filename),contractSha256:sha(path.join(__dirname,'page-isolation-contract.cjs')),homeSha256:sha(path.join(site,'index.html')),clientSha256:sha(path.join(site,'js/site-navigation.js')),cssSha256:sha(path.join(site,'css/site-navigation.css'))},states:[],interactions:[],errors:[],httpErrors:[]};
let server,browser,ws,base,seq=0,stderr='';const pending=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function progress(){fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({status:'RUNNING',states:report.states.length,interactions:report.interactions.length,last:report.states.at(-1)&&{width:report.states.at(-1).width,mode:report.states.at(-1).mode,route:report.states.at(-1).route}}));}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},20000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression){for(let i=0;i<200;i++){if(await evaluate(expression))return;await sleep(100);}throw Error('Wait timeout '+expression);}
async function point(selector){return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!(r.width>0&&r.height>0&&r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight&&(e===hit||e.contains(hit))))throw Error('Control not physically hittable: '+${JSON.stringify(selector)}+' '+JSON.stringify({x,y,width:r.width,height:r.height,viewport:innerWidth,hit:hit?.tagName}));return {x,y};})()`);}
async function move(selector){await send('Input.dispatchMouseEvent',{type:'mouseMoved',...await point(selector)});await sleep(100);}
async function click(selector){const p=await point(selector);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...p});await sleep(120);}
async function escape(){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(100);}
async function openOuter(){if(await evaluate("document.getElementById('navbar').classList.contains('mobile-nav')&&!document.querySelector('#navbar-menu>.navbar-links.open')")){await click('#mobile-menu-toggle');await wait("document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')==='true'");}}
async function openGroup(){await openOuter();if(!await evaluate("document.querySelector('[data-site-nav]').open")){await move('summary.site-nav-trigger');if(!await evaluate("document.querySelector('[data-site-nav]').open"))await click('summary.site-nav-trigger');}await wait("document.querySelector('[data-site-nav]').open&&document.querySelector('summary').getAttribute('aria-expanded')==='true'");}
function expected(route){if(['/research-projects/','/about/'].includes(route))return {top:[route],blog:false,child:[]};if(route==='/')return {top:['/'],blog:false,child:[]};if(route==='/dynamic/')return {top:['/dynamic'],blog:false,child:[]};return {top:[],blog:true,child:[route.startsWith('/categories')?'/categories':route.startsWith('/tags')?'/tags':'/archives']};}
async function state(width,mode,route,kind){
 await openGroup();await sleep(150);
 // Fragment jumps change navbar scroll state; wait for the existing color transition.
 await wait("(()=>{const p=document.createElement('span');p.style.background='var(--site-accent-soft)';document.body.append(p);const token=getComputedStyle(p).backgroundColor;p.remove();return [...document.querySelectorAll('#navbar-menu .active')].every(e=>getComputedStyle(e).backgroundColor===token);})()");
 const content=await evaluate(`(${inspectPageDOM.toString()})(document,${JSON.stringify(route)})`);
 const s=await evaluate(`(()=>{const d=document,g=d.querySelector('[data-site-nav]'),r=e=>{const a=e.getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height};};const top=[...d.querySelectorAll('#navbar-menu>.navbar-links>li>a.active')].map(a=>a.getAttribute('href'));const child=[...d.querySelectorAll('.site-nav-sub-link.active')].map(a=>a.getAttribute('href'));const probe=d.createElement('span');probe.style.background='var(--site-accent-soft)';d.body.append(probe);const token=getComputedStyle(probe).backgroundColor;probe.remove();return {route:decodeURI(location.pathname)+location.hash,top,child,blog:!!d.querySelector('summary.active'),labels:[...d.querySelectorAll('.navbar-links>li>.navbar-link .navbar-link-content>span:last-child,.navbar-links>li>details>summary .navbar-link-content>span:last-child')].map(e=>e.textContent.trim()),scrollWidth:d.documentElement.scrollWidth,viewport:innerWidth,actions:r(d.querySelector('.navbar-actions')),summary:r(d.querySelector('summary')),submenu:r(d.querySelector('.site-nav-submenu')),links:[...d.querySelectorAll('.site-nav-sub-link')].map(r),mobile:d.getElementById('navbar').classList.contains('mobile-nav'),mode:d.documentElement.classList.contains('dark')?'dark':'light',activeBackgrounds:[...d.querySelectorAll('#navbar-menu .active')].map(e=>getComputedStyle(e).backgroundColor),token};})()`);
 assert.equal(s.route,route);assert.equal(s.mode,mode);const target=expected(route);assert.deepEqual(s.top,target.top);assert.equal(s.blog,target.blog);assert.deepEqual(s.child,target.child);assert.deepEqual(s.labels,['首页','技术博客','科研与项目','生活动态','关于我']);assert(s.scrollWidth<=s.viewport+1,JSON.stringify(s));
 for(const rect of [s.actions,s.summary,s.submenu,...s.links])assert(rect.width>0&&rect.left>=-1&&rect.right<=s.viewport+1,JSON.stringify(s));
 assert.notEqual(s.token,'rgba(0, 0, 0, 0)');assert(s.activeBackgrounds.every(x=>x===s.token));
 report.states.push({width,mode,kind,content,...s});progress();await escape();
}
async function navigate(route,mode){await send('Page.navigate',{url:base+route});await wait("document.readyState==='complete'&&window.__siteNavigationV1&&!!window.ScrollManager?.initialized&&!!window.Settings");
 if(!await evaluate('!!window.pjax')){const e=Error('PJAX CDN unavailable: cannot claim navigation continuity');e.blocked=true;throw e;}
 await evaluate(`Settings.setTheme(${JSON.stringify(mode)});Settings.setHue(290)`);await sleep(250);
}
async function pjax(route){
 let selector;
 if(['/archives/','/categories/','/tags/'].includes(route)){await openGroup();selector=`#navbar-menu a[href="${route.replace(/\/$/,'')}"]`;}
 else if(['/','/research-projects/','/about/','/dynamic/'].includes(route)){await openOuter();selector=`#navbar-menu a[href="${route==='/dynamic/'?'/dynamic':route}"]`;}
 else {const scope=route.startsWith('/categories/')?'.categories-grid':route.startsWith('/tags/')?'.tags-cloud-list':'.archive-card';selector=`#main-content ${scope} a[href="${encodeURI(route)}"]`;await evaluate(`document.activeElement?.blur();document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await sleep(650);}
 await evaluate("document.addEventListener('click',e=>{window.__lastNavTestClick={tag:e.target.tagName,href:e.target.closest('a')?.getAttribute('href'),scrollY};},{once:true,capture:true})");
 const before=await evaluate('__navPjax');await click(selector);await wait(`decodeURI(location.pathname)+location.hash===${JSON.stringify(route)}&&__navPjax>${before}`);assert.equal(await evaluate('__navMarker'),'retained');await wait("document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')==='false'&&!document.querySelector('[data-site-nav]').open");
}
async function interactions(width,mode){
 await navigate('/',mode);await openGroup();await click('summary.site-nav-trigger');assert.equal(await evaluate("document.querySelector('[data-site-nav]').open"),false);await click('summary.site-nav-trigger');assert.equal(await evaluate("document.querySelector('[data-site-nav]').open"),true);
 await click('#theme-toggle');assert.equal(await evaluate("document.querySelector('[data-site-nav]').open"),false);await escape();
 await openGroup();await escape();assert.equal(await evaluate("document.querySelector('[data-site-nav]').open"),false);
 if(await evaluate("document.getElementById('navbar').classList.contains('mobile-nav')")){
  await openOuter();await click('summary.site-nav-trigger');await click('#mobile-menu-toggle');assert.equal(await evaluate("document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')"),'false');
  await openOuter();await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:600});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:10,y:600});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:10,y:600});await wait("document.getElementById('mobile-menu-toggle').getAttribute('aria-expanded')==='false'");
 }else{
  // The previous Escape intentionally focuses summary; isolate hover from keyboard focus.
  await evaluate("document.getElementById('theme-toggle').focus()");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-2,y:600});await move('summary.site-nav-trigger');assert(await evaluate("document.querySelector('[data-site-nav]').open"));await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-2,y:600});await wait("!document.querySelector('[data-site-nav]').open");
 }
 // Native keyboard activation, not a synthetic DOM click; focus setup is explicit.
 await openOuter();await evaluate("document.querySelector('summary.site-nav-trigger').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await wait("document.querySelector('[data-site-nav]').open");await escape();report.interactions.push({width,mode,clickToggle:true,outsideClose:true,escape:true,keyboard:true,realMouse:true});
}
async function main(){
 server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');let file=path.resolve(site,'.'+decodeURIComponent(u.pathname));if(file!==site&&!file.startsWith(site+path.sep)){res.writeHead(403);res.end();return;}if(fs.statSync(file).isDirectory()){if(!u.pathname.endsWith('/')){res.writeHead(301,{Location:u.pathname+'/'+u.search});res.end();return;}file=path.join(file,'index.html');}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;report.base=base;
 report.flags=['--headless','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--no-first-run','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+path.join(out,'profile'),'--enable-experimental-web-platform-features','about:blank'];
 browser=spawn('chromium-browser',report.flags,{stdio:['ignore','ignore','pipe']});browser.stderr.on('data',data=>{stderr=(stderr+data).slice(-12000);});let port;for(let i=0;i<150;i++){const m=stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){port=m[1];break;}if(browser.exitCode!==null)throw Error('Chromium exited');await sleep(100);}assert(port,'No DevTools endpoint');
 report.browser=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const item=pending.get(m.id);if(item){clearTimeout(item.timer);pending.delete(m.id);m.error?item.reject(Error(JSON.stringify(m.error))):item.resolve(m.result);}return;}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.httpErrors.push({url:m.params.response.url,status:m.params.response.status});};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 const matrix=process.env.NAV_TEST_MATRIX?JSON.parse(process.env.NAV_TEST_MATRIX):[[1440,'light'],[390,'dark']];
 report.matrix=matrix;report.scope=process.env.NAV_TEST_MATRIX?'explicit subset':'full navigation matrix';
 for(const [width,mode] of matrix){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width<=390?844:900,deviceScaleFactor:1,mobile:false});await interactions(width,mode);
  for(const route of routes){await navigate(route,mode);await state(width,mode,route,'direct');}
  await navigate('/',mode);await evaluate("window.__navMarker='retained';window.__navPjax=0;document.addEventListener('pjax:complete',()=>__navPjax++)");
  for(const route of ['/research-projects/','/about/','/archives/','/2026/10/30/hello-firefly/','/categories/','/categories/技术测试/','/tags/','/tags/Hexo/','/dynamic/','/']){await pjax(route);await state(width,mode,route,'pjax');}
  for(const [direction,route] of [['back','/dynamic/'],['forward','/']]){const before=await evaluate('__navPjax');await evaluate(`history.${direction}()`);await wait(`location.pathname===${JSON.stringify(route)}&&document.readyState==='complete'&&__navPjax>${before}`);await sleep(400);await state(width,mode,route,direction);}
  await evaluate("window.__reloadOldDocument=true");await send('Page.reload',{ignoreCache:false});await wait("document.readyState==='complete'&&window.__siteNavigationV1&&!!window.ScrollManager?.initialized&&!window.__reloadOldDocument");await sleep(250);await state(width,mode,'/','refresh');
  await navigate('/archives/',mode);await evaluate("window.__navMarker='retained';window.__navPjax=0;document.addEventListener('pjax:complete',()=>__navPjax++)");
  await pjax('/research-projects/');await state(width,mode,'/research-projects/','page-pjax');await pjax('/about/');await state(width,mode,'/about/','page-pjax');
  for(const [direction,route] of [['back','/research-projects/'],['forward','/about/']]){const before=await evaluate('__navPjax');await evaluate(`history.${direction}()`);await wait(`decodeURI(location.pathname)===${JSON.stringify(route)}&&__navPjax>${before}`);await sleep(250);await state(width,mode,route,'page-'+direction);}
  for(const route of ['/research-projects/','/about/']){await navigate(route,mode);await evaluate("window.__reloadOldDocument=true");await send('Page.reload',{ignoreCache:false});await wait("document.readyState==='complete'&&window.__siteNavigationV1&&!!window.ScrollManager?.initialized&&!window.__reloadOldDocument");await sleep(250);await state(width,mode,route,'page-refresh');}
  console.log('Completed navigation matrix',width,mode,'states',report.states.length);
 }
 assert.equal(report.errors.length,0);assert.equal(report.httpErrors.length,0);report.status='PASS';
}
main().catch(async error=>{report.status=error.blocked?'BLOCKED':'FAIL';report.fatal=error.stack;report.browserStderr=stderr;try{report.failureState=await evaluate("({route:location.pathname,lastClick:window.__lastNavTestClick,active:document.activeElement?.outerHTML.slice(0,200),open:document.querySelector('[data-site-nav]')?.open,expanded:document.querySelector('summary')?.getAttribute('aria-expanded'),mobile:document.getElementById('navbar')?.className,colors:[...document.querySelectorAll('#navbar-menu .active')].map(e=>({label:e.textContent,bg:getComputedStyle(e).backgroundColor}))})");}catch{}console.error(error);process.exitCode=error.blocked?2:1;}).finally(async()=>{
 if(ws?.readyState===1){try{ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await sleep(300);ws.close();}catch{}}
 if(browser?.exitCode===null)browser.kill('SIGTERM');if(server)await new Promise(resolve=>server.close(resolve));for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('Test ended'));}pending.clear();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(report.status,'navigation states',report.states.length,'interaction matrices',report.interactions.length);
});
