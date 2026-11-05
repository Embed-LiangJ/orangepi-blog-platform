'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require('jsdom'),ejs=require('ejs'),moment=require('moment-timezone');
const root=path.resolve(__dirname,'..'),viewPath='_partials/header/navigation.ejs';
const original=fs.readFileSync(path.join(root,'themes/firefly/layout',viewPath),'utf8');
const script=fs.readFileSync(path.join(root,'scripts/site-nav-active.js'),'utf8');
const client=fs.readFileSync(path.join(root,'source/js/site-navigation.js'),'utf8');
const native=fs.readFileSync(path.join(root,'themes/firefly/source/js/ui/scroll.js'),'utf8');
const homeOriginal=fs.readFileSync(path.join(root,'themes/firefly/layout/index.ejs'),'utf8');
const homeScript=fs.readFileSync(path.join(root,'scripts/site-home-sections.js'),'utf8');
function adaptHome(content=homeOriginal){
 let hook,calls=0;const views={'index.ejs':{_content:content,marker:'home'}};
 vm.runInNewContext(homeScript,{require,hexo:{extend:{filter:{register(type,fn,priority){assert.equal(type,'before_generate');assert.equal(priority,6);hook=fn;}}}}});
 return {run(){hook.call({theme:{getView:name=>views[name]?{data:views[name]}:null,setView(name,next){views[name]=next;calls++;}}});},get content(){return views['index.ejs']._content;},get page(){return views['site-page.ejs']._content;},get calls(){return calls;}};
}
const home=adaptHome();home.run();home.run();assert.equal(home.calls,2);
function renderHome(current=1){return ejs.render(home.content,{theme:{sidebar:{position:'none'}},page:{__index:true,current,posts:{length:0}},partial:()=>'',__:x=>x,is_home:()=>true,url_for:p=>p});}
for(const current of [1,2]){const d=new JSDOM(renderHome(current));assert.equal(d.window.document.querySelectorAll('.site-home-card').length,current===1?2:0);d.window.close();}
for(const c of [homeOriginal+'unknown',homeOriginal+homeOriginal]){const t=adaptHome(c);assert.throws(()=>t.run(),/index changed/);assert.equal(t.calls,0);}
assert.throws(()=>adaptHome(null).run(),/Missing Firefly index/);
assert(!home.content.includes('教育经历'));assert(!home.content.includes('实验记录'));assert(!home.page.includes('page.posts'));assert(!home.page.includes('post-card'));
for(const type of ['about','research-projects']){const html=ejs.render(home.page,{theme:{sidebar:{position:'none'}},page:{title:type,type,content:'<h2>ONLY_THIS_PAGE</h2>'},partial:()=>'',__:x=>x});const d=new JSDOM(html);assert.equal(d.window.document.querySelector('[data-site-page]').dataset.sitePage,type);assert(!d.window.document.querySelector('.post-list'));d.window.close();}
console.log('PASS: guarded index + independent Page shell, first-page entries only, no inherited post loop');
const is=require('../node_modules/hexo/dist/plugins/helper/is');
function adapt(content=original,base='/'){
  let hook,calls=0,data={_content:content,marker:'preserve'};const assets=[];
  vm.runInNewContext(script,{require,hexo:{source_dir:path.join(root,'source'),config:{root:base,url:'https://example.invalid'+base},extend:{
    filter:{register(type,fn,priority){assert.equal(type,'before_generate');assert.equal(priority,5);hook=fn;}},
    injector:{register(where,html){assets.push({where,html});}}
  }}});
  const ctx={theme:{getView(name){assert.equal(name,viewPath);return data?{data}:null;},
    setView(name,next){assert.equal(name,viewPath);calls++;data=next;}}};
  return {run:()=>hook.call(ctx),get content(){return data._content;},get calls(){return calls;},get data(){return data;},assets};
}
function render(template,page={},base='/'){
  const ctx={page};
  return '<!doctype html><html><body>'+ejs.render(template,{theme:{nav:{},pages:{dynamic:true,friends:{enable:false}}},config:{title:'Review'},page,
    __:x=>({home:'首页',archive:'归档',categories:'分类',tags:'标签'}[x]||x),url_for:p=>base+p.replace(/^\//,''),
    is_home:()=>is.home.call(ctx),is_archive:()=>is.archive.call(ctx),is_post:()=>is.post.call(ctx),is_category:()=>is.category.call(ctx),is_tag:()=>is.tag.call(ctx)})+'</body></html>';
}
function state(template,page,base='/'){
  const dom=new JSDOM(render(template,page,base));const d=dom.window.document;
  try{return {
    labels:[...d.querySelectorAll('.navbar-links > li > .navbar-link .navbar-link-content > span:last-child, .navbar-links > li > details > summary .navbar-link-content > span:last-child')].map(e=>e.textContent),
    top:[...d.querySelectorAll('.navbar-links > li > a.active')].map(e=>e.getAttribute('href')),
    blog:!!d.querySelector('summary.active'),child:[...d.querySelectorAll('.site-nav-sub-link.active')].map(e=>e.getAttribute('href')),
    children:[...d.querySelectorAll('.site-nav-sub-link')].map(e=>e.textContent.replace(/archive|folder|sell/g,'').trim()),
    fake:d.querySelectorAll('a[href*="/#"],a[href="#"]').length,
    destinations:[...d.querySelectorAll('a[href$="/research-projects/"],a[href$="/about/"]')].map(e=>e.getAttribute('href')),
    aria:d.querySelectorAll('.site-nav-sub-link.active[aria-current="location"]').length
  };}finally{dom.window.close();}
}
class Query{constructor(items){this.items=items;this.length=items.length;}sort(){return this;}slice(a,b){return this.items.slice(a,b);}forEach(fn){this.items.forEach(fn);}}
const rows=[{date:moment.utc('2026-10-30')},{date:moment.utc('2026-10-29')}];
const routes=require('hexo-generator-archive/lib/generator').call({config:{archive_dir:'archives',archive_generator:{order_by:'-date',per_page:1,yearly:true,monthly:true}},model:()=>({Query})},{posts:new Query(rows)});
const a=adapt();a.run();a.run();assert.equal(a.calls,1);assert.equal(a.data.marker,'preserve');
assert(routes.some(r=>r.path==='archives/page/2/index.html')||routes.some(r=>r.path==='archives/page/2/'));
for(const route of routes){
  assert.equal(route.data.archive,true);assert.equal(route.data.layout,undefined);assert.deepEqual(route.layout,['archive','index']);
  const old=new JSDOM(render(original,route.data));assert.equal(old.window.document.querySelectorAll('.navbar-link.active').length,0);old.window.close();
  for(const base of ['/','/blog/']){const s=state(a.content,route.data,base);assert(s.blog);assert.deepEqual(s.child,[base+'archives']);assert.equal(s.aria,1);}
}
console.log('PASS: real generator archive/year/month/pagination flags still use is_archive, root/subpath');
for(const base of ['/','/blog/'])for(const [page,top,blog,child] of [
 [{__index:true},[''],false,[]],[{layout:'categories'},[],true,['categories']],[{layout:'category'},[],true,['categories']],
 [{layout:'tags'},[],true,['tags']],[{layout:'tag'},[],true,['tags']],
 [{category:'技术测试'},[],true,['categories']],[{tag:'Hexo'},[],true,['tags']],[{__post:true,layout:'post',path:'dynamic-report/index.html'},[],true,['archives']],
 [{layout:'site-page',type:'research-projects'},['research-projects/'],false,[]],[{layout:'site-page',type:'about'},['about/'],false,[]],
 [{__post:true,layout:'post',type:'about',path:'about/index.html'},[],true,['archives']],
 [{layout:'dynamic',path:'dynamic/index.html'},['dynamic'],false,[]],[{path:'archives-not-real/index.html'},[],false,[]]
]){
 const s=state(a.content,page,base);assert.deepEqual(s.labels,['首页','技术博客','科研与项目','生活动态','关于我']);assert.deepEqual(s.destinations,[base+'research-projects/',base+'about/']);assert.deepEqual(s.children,['全部文章','分类','标签']);assert.equal(s.fake,0);
 assert.deepEqual(s.top,top.map(p=>base+p));assert.equal(s.blog,blog);assert.deepEqual(s.child,child.map(p=>base+p));
}
console.log('PASS: five primary entries, native Page URLs/active, root/subpath and no hash destinations');
for(const content of [original+'\nunknown',original+original,a.content+'\nunknown']){const t=adapt(content);assert.throws(t.run,/navigation changed/);assert.equal(t.calls,0);}
const missing=adapt(null);assert.throws(missing.run,/Missing Firefly/);assert.equal(missing.calls,0);
for(const base of ['/','/blog/']){const t=adapt(original,base);assert.deepEqual(t.assets.map(x=>x.where),['head_end','body_end']);const assets=new JSDOM(t.assets.map(x=>x.html).join(''));const href=assets.window.document.querySelector('link').getAttribute('href'),src=assets.window.document.querySelector('script').getAttribute('src');assert(href.startsWith(base+'css/site-navigation.css?v='));assert(src.startsWith(base+'js/site-navigation.js?v='));assert([href,src].every(x=>/\?v=[0-9a-f]{12}$/.test(x)));assets.window.close();}
console.log('PASS: metadata/idempotence/full-template fail-closed guard and content-versioned root/subpath assets');
async function runtime(width){
 const dom=new JSDOM(render(a.content,{__index:true}).replace('</body>',renderHome()+'</body>'),{runScripts:'outside-only',pretendToBeVisual:true,url:'https://example.invalid/'});const w=dom.window,d=w.document;
 Object.defineProperty(w,'innerWidth',{value:width,writable:true});
 for(const [selector,key,value] of [['.navbar-inner','offsetWidth',1400],['.navbar-brand','offsetWidth',220],['.navbar-actions','offsetWidth',220],['.navbar-links','scrollWidth',300]])Object.defineProperty(d.querySelector(selector),key,{value});
 w.eval(native);w.ScrollManager.init();const counts={},add=d.addEventListener.bind(d);d.addEventListener=(name,fn,opts)=>{counts[name]=(counts[name]||0)+1;return add(name,fn,opts);};
 w.eval(client);const once={...counts};w.eval(client);assert.deepEqual(counts,once,'no duplicate global delegates');
 await new Promise(resolve=>w.setTimeout(resolve,0));
 const g=d.querySelector('[data-site-nav]'),summary=g.querySelector('summary'),hamburger=d.getElementById('mobile-menu-toggle');
 const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
 if(width<=768){click(hamburger);assert.equal(hamburger.getAttribute('aria-expanded'),'true');}
 click(summary);assert(g.open);assert.equal(summary.getAttribute('aria-expanded'),'true');
 if(width<=768)assert.equal(hamburger.getAttribute('aria-expanded'),'true','summary does not close hamburger');
 let intercepted;add('click',event=>{if(event.target.closest('a')){intercepted=event.defaultPrevented;event.preventDefault();}},true);
 click(g.querySelector('a'));assert.equal(intercepted,false,'ordinary link is not intercepted');assert(!g.open);assert.equal(hamburger.getAttribute('aria-expanded'),'false');
 if(width>768){
  g.dispatchEvent(new w.MouseEvent('pointerover',{bubbles:true}));assert(g.open);g.dispatchEvent(new w.MouseEvent('pointerout',{bubbles:true}));assert(!g.open);
 }else{click(hamburger);}
 click(summary);assert(g.open);summary.focus();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!g.open);assert.equal(d.activeElement,width<=768?hamburger:summary);
 for(const event of ['pjax:send','pjax:complete','pagehide','pageshow','resize']){
  if(width<=768)click(hamburger);click(summary);assert(g.open);
  (event.startsWith('pjax')?d:w).dispatchEvent(new w.Event(event));assert(!g.open);assert.equal(summary.getAttribute('aria-expanded'),'false');assert.equal(hamburger.getAttribute('aria-expanded'),'false');
 }
 const replacement=new JSDOM(render(a.content,{layout:'tags'}));d.getElementById('navbar-menu').outerHTML=replacement.window.document.getElementById('navbar-menu').outerHTML;replacement.window.close();
 w.history.replaceState({},'', '/tags/');d.dispatchEvent(new w.Event('pjax:complete'));const current=d.querySelector('summary');click(current);assert(d.querySelector('[data-site-nav]').open,'delegate handles replacement DOM without rebind');
 d.body.style.overflow='hidden';w.ScrollManager.closeMobileMenu();d.body.style.overflow='hidden';d.querySelector('[data-site-nav]').open=false;w.dispatchEvent(new w.Event('pageshow'));assert.equal(d.body.style.overflow,'hidden','unrelated popup scroll lock untouched');
 const pageNav=new JSDOM(render(a.content,{layout:'site-page',type:'about'}));d.getElementById('navbar-menu').outerHTML=pageNav.window.document.getElementById('navbar-menu').outerHTML;pageNav.window.close();w.history.replaceState({},'', '/about/');d.dispatchEvent(new w.Event('pjax:complete'));
 assert.equal(d.querySelector('.navbar-links>li>a.active').getAttribute('href'),'/about/');assert.equal(d.querySelector('.navbar-links>li>a.active').getAttribute('aria-current'),'page');
 const input=d.createElement('input');d.body.append(input);input.focus();w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await new Promise(resolve=>w.setTimeout(resolve,50));assert.equal(d.activeElement,input,'no fragment focus/scroll override on persisted restore');
 dom.window.close();
}
(async()=>{await runtime(1440);await runtime(390);console.log('PASS: native hamburger/child close, desktop hover, click/Escape, PJAX replacement, pagehide/pageshow/resize, one-time delegates (JSDOM, not physical mobile)');})().catch(e=>{console.error(e);process.exitCode=1;});
