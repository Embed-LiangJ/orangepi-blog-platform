'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require('jsdom'),ejs=require('ejs'),moment=require('moment-timezone');
const root=path.resolve(__dirname,'..'),viewPath='_partials/header/navigation.ejs';
const original=fs.readFileSync(path.join(root,'themes/firefly/layout',viewPath),'utf8');
const script=fs.readFileSync(path.join(root,'scripts/site-nav-active.js'),'utf8');
const is=require('../node_modules/hexo/dist/plugins/helper/is');
function adapt(content=original){
  let hook,calls=0,data={_content:content,marker:'preserve'};
  vm.runInNewContext(script,{require,hexo:{extend:{filter:{register(type,fn,priority){
    assert.equal(type,'before_generate');assert.equal(priority,5);hook=fn;
  }}}}});
  const ctx={theme:{getView(name){assert.equal(name,viewPath);return data?{data}:null;},
    setView(name,next){assert.equal(name,viewPath);calls++;data=next;}}};
  return {run:()=>hook.call(ctx),get content(){return data._content;},get calls(){return calls;},get data(){return data;}};
}
function active(template,page,base='/'){
  const ctx={page};
  const html=ejs.render(template,{theme:{nav:{},pages:{dynamic:false}},config:{title:'Review'},page,
    __:x=>x,url_for:p=>base+p.replace(/^\//,''),is_home:()=>is.home.call(ctx),is_archive:()=>is.archive.call(ctx)});
  const dom=new JSDOM(html);
  try{return [...dom.window.document.querySelectorAll('#navbar-menu .navbar-link.active')].map(a=>a.getAttribute('href'));}
  finally{dom.window.close();}
}
// Exercise the real generator/paginator contract, including yearly/monthly pages.
class Query{
  constructor(items){this.items=items;this.length=items.length;}
  sort(){return this;}
  slice(a,b){return this.items.slice(a,b);}
  forEach(fn){this.items.forEach(fn);}
}
const rows=[{date:moment.utc('2026-10-30')},{date:moment.utc('2026-10-29')}];
const routes=require('hexo-generator-archive/lib/generator').call({
  config:{archive_dir:'archives',archive_generator:{order_by:'-date',per_page:1,yearly:true,monthly:true}},
  model:()=>({Query})
},{posts:new Query(rows)});
const patched=adapt();patched.run();patched.run();assert.equal(patched.calls,1);assert.equal(patched.data.marker,'preserve');
assert.equal(patched.content.replace("<%= is_archive() ? ' active' : '' %>","<%= page.layout === 'archive' ? ' active' : '' %>"),original);
assert(routes.some(r=>r.path==='archives/page/2/index.html')||routes.some(r=>r.path==='archives/page/2/'));
for(const route of routes){
  assert.equal(route.data.archive,true);assert.equal(route.data.layout,undefined);
  assert.deepEqual(route.layout,['archive','index']);
  assert.deepEqual(active(original,route.data),[],'Reproduce missing native active');
  for(const base of ['/','/blog/'])assert.deepEqual(active(patched.content,route.data,base),[base+'archives']);
}
console.log('PASS: actual archive generator flags reproduce defect; archive/year/month/pagination use is_archive, root/subpath');
for(const [page,expected]of [[{__index:true},'/'],[{layout:'categories'},'/categories'],[{layout:'category'},'/categories'],
  [{layout:'tags'},'/tags'],[{layout:'tag'},'/tags'],[{layout:'post'},null],[{path:'archives-not-real/index.html'},null]]){
  assert.deepEqual(active(patched.content,page),expected?[expected]:[]);
  assert.deepEqual(active(patched.content,page),active(original,page),'Other navigation unchanged');
}
console.log('PASS: home/categories/category/tags/tag/post and unrelated paths unchanged; exactly one current link');
for(const content of [original+'\nunknown',original+original,patched.content+'\nunknown']){
  const t=adapt(content);assert.throws(t.run,/navigation changed/);assert.equal(t.calls,0);
}
const missing=adapt(null);assert.throws(missing.run,/Missing Firefly/);assert.equal(missing.calls,0);
console.log('PASS: single-view exact delta, repeated generation, metadata preservation and fail-closed template guard');
