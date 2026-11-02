'use strict';
// Existing real Hexo output only; new profile/evidence, loopback server, no build/clean.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {spawn}=require('child_process');
const out=path.resolve(process.argv[2]||''),site=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3]||fs.existsSync(out))throw Error('Usage: node verify-nav-browser.cjs <NEW evidence dir> <existing public> [--expect-broken]');
fs.mkdirSync(out,{recursive:true});
const broken=process.argv.includes('--expect-broken'),report={status:'RUNNING',expectedBroken:broken,states:[],interactionLimits:[],errors:[],httpErrors:[],failedRequests:[]};
let server,browser,ws,base,seq=0;const pending=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression){for(let i=0;i<300;i++){if(await evaluate(expression))return;await sleep(100);}throw Error('Wait timeout '+expression);}
async function click(selector){
 await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await sleep(600);
 const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);if(!(e===hit||e.contains(hit)))throw Error('Link not hittable: '+${JSON.stringify(selector)}+' hit '+hit?.outerHTML.slice(0,180)+' rect '+JSON.stringify({x,y,width:r.width,height:r.height,viewport:innerWidth,scroll:scrollY}));return {x,y};})()`);
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...point});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...point});
}
async function openMenu(){
 if(await evaluate("document.getElementById('navbar').classList.contains('mobile-nav')&&!document.querySelector('#navbar-menu .navbar-links.open')")){
  const rect=await evaluate("(()=>{const r=document.getElementById('mobile-menu-toggle').getBoundingClientRect();return {x:r.x,right:r.right,width:innerWidth};})()");
  if(rect.x<0||rect.right>rect.width){
   report.interactionLimits.push({route:await evaluate('location.pathname'),...rect,method:'DOM click: existing native toggle outside simulated viewport; not physical touch acceptance'});
   await evaluate("document.getElementById('mobile-menu-toggle').click()");
  }else await click('#mobile-menu-toggle');
  await sleep(400);
 }
}
const expected=route=>route==='/'?'/':route.replace(/\/$/,'');
async function state(width,mode,route,kind){
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-3,y:700});
 await openMenu();await sleep(450);
 const s=await evaluate(`(()=>{const links=[...document.querySelectorAll('#navbar-menu .navbar-link')];const active=links.filter(a=>a.classList.contains('active'));
 const probe=document.createElement('span');probe.style.background='var(--site-accent-soft)';document.body.append(probe);const token=getComputedStyle(probe).backgroundColor;probe.remove();
 return {route:location.pathname,active:active.map(a=>a.getAttribute('href')),links:links.map(a=>({href:a.getAttribute('href'),active:a.classList.contains('active'),bg:getComputedStyle(a).backgroundColor})),background:active.map(a=>getComputedStyle(a).backgroundColor),token,visible:active.every(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.height>0&&r.x>=0&&r.right<=innerWidth+1;}),mode:document.documentElement.classList.contains('dark')?'dark':'light',hue:Settings.getHue(),marker:window.__navMarker||null};})()`);
 assert.equal(s.route,route);assert.equal(s.mode,mode);assert.equal(s.hue,290);
 const target=broken&&route==='/archives/'?[]:[expected(route)];assert.deepEqual(s.active,target);
 if(target.length){assert(s.visible);assert.deepEqual(s.background,[s.token]);assert.notEqual(s.token,'rgba(0, 0, 0, 0)');}
 report.states.push({width,mode,kind,...s});
 if(route==='/archives/'&&kind==='direct'){
  const image=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,`${width}-${mode}-archives.png`),Buffer.from(image.data,'base64'));
 }
}
async function navigate(route,mode){await send('Page.navigate',{url:base+route});await wait("document.readyState==='complete'&&!!window.pjax&&!!window.Settings");await evaluate(`Settings.setTheme('${mode}');Settings.setHue(290)`);await sleep(600);}
async function pjax(route){
 await openMenu();const before=await evaluate('__navPjax');
 await click(`#navbar-menu a[href="${expected(route)}"]`);
 await wait(`location.pathname===${JSON.stringify(route)}&&__navPjax>${before}`);
 assert.equal(await evaluate('__navMarker'),'retained');await sleep(350);
}
async function main(){
 server=http.createServer((req,res)=>{let file;try{
  const url=new URL(req.url,'http://localhost');file=path.resolve(site,'.'+decodeURIComponent(url.pathname));
  if(file!==site&&!file.startsWith(site+path.sep)){res.writeHead(403);res.end();return;}
  if(fs.statSync(file).isDirectory()){
   if(!url.pathname.endsWith('/')){res.writeHead(301,{Location:url.pathname+'/'+url.search});res.end();return;}
   file=path.join(file,'index.html');
  }
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 const log=fs.openSync(path.join(out,'chromium.log'),'wx');let stderr='';
 report.flags=['--headless','--disable-gpu','--disable-dev-shm-usage','--disable-extensions','--no-first-run','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+path.join(out,'profile'),'--enable-experimental-web-platform-features','about:blank'];
 browser=spawn('chromium-browser',report.flags,{stdio:['ignore',log,'pipe']});browser.stderr.on('data',x=>{stderr+=x;fs.writeSync(log,x);});
 let port;for(let i=0;i<150;i++){const m=stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);if(m){port=m[1];break;}if(browser.exitCode!==null)throw Error('Browser exited');await sleep(100);}assert(port);
 report.browser=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}return;}
  if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.errors.push(m.params.args.map(a=>a.value||a.description));
  if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.httpErrors.push({url:m.params.response.url,status:m.params.response.status});
  if(m.method==='Network.loadingFailed')report.failedRequests.push(m.params);
 };
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 for(const width of [1440,390])for(const mode of ['light','dark']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:900,deviceScaleFactor:1,mobile:width===390});
  for(const route of ['/','/archives/','/categories/','/tags/']){await navigate(route,mode);await state(width,mode,route,'direct');}
  await navigate('/',mode);await evaluate("window.__navMarker='retained';window.__navPjax=0;document.addEventListener('pjax:complete',()=>__navPjax++)");
  for(const route of ['/archives/','/','/archives/','/categories/','/archives/','/tags/','/archives/','/']){await pjax(route);await state(width,mode,route,'pjax');}
  for(const [direction,route]of [['back','/archives/'],['forward','/']]){
   const before=await evaluate('__navPjax');await evaluate(`history.${direction}()`);
   await wait(`location.pathname===${JSON.stringify(route)}&&__navPjax>${before}`);assert.equal(await evaluate('__navMarker'),'retained');
   await state(width,mode,route,direction);
  }
 }
 assert.equal(report.errors.length,0);assert.equal(report.httpErrors.length,0);report.status='PASS';
}
main().catch(error=>{report.status='FAIL';report.fatal=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
 if(ws?.readyState===1){try{ws.send(JSON.stringify({id:++seq,method:'Browser.close'}));await sleep(300);ws.close();}catch{}}
 if(browser?.exitCode===null)browser.kill('SIGTERM');if(server)await new Promise(r=>server.close(r));
 for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Test ended'));}pending.clear();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(report.status,'navigation states',report.states.length);
});
