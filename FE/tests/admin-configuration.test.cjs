/* Real page + global error popup, isolated synthetic identity APIs. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const {build}=require(process.env.ESBUILD_MODULE||'esbuild');
const root=path.resolve(__dirname,'..'),req=Module.createRequire(path.join(root,'package.json'));

test('successful backfill is closeable status, partial progress is informational, actual failure still opens error popup',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/admin/identities'});
 for(const k of ['window','document','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLDialogElement','MutationObserver','Event','CustomEvent','localStorage'])global[k]=dom.window[k];
 HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=req('react'),{act}=React,{createRoot}=req('react-dom/client'),{MemoryRouter}=req('react-router-dom');
 let outcome={processed:4,remaining:0,needsReview:[]},fail=false,calls=0;
 global.adminConfigApi={
  async get(){return {data:{result:{content:[],page:0,size:10,totalElements:0,totalPages:0,last:true,first:true}}};},
  async post(url){assert.equal(url,'/admin/identity-registry/backfill');calls++;if(fail)throw {isAxiosError:true,response:{status:429,data:{code:42944,message:'Face busy'}}};return {data:{result:outcome}};}
 };
 const built=await build({stdin:{contents:`export {default as Page} from './src/features/management/pages/IdentityReviewPage'; export {default as ErrorPopup} from './src/components/feedback/ErrorPopup'; export {AuthContext} from './src/context/AuthContext';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,define:{'import.meta.env':'{}'},external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(?:^|\/)config\/axios$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default globalThis.adminConfigApi;'}));}}]});
 const mod=new Module(path.join(root,'admin-config-fixture.cjs'));mod.filename=path.join(root,'admin-config-fixture.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(built.outputFiles[0].text,mod.filename);
 const {Page,ErrorPopup,AuthContext}=mod.exports,renderer=createRoot(document.getElementById('root'));
 const settle=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,70));});};
 const backfill=async()=>{await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lập chỉ mục')).click());await settle();};
 try{
  await act(async()=>renderer.render(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{user:{id:'admin-fixture',role:'ADMIN'}}},React.createElement(Page),React.createElement(ErrorPopup,{blocked:false})))));
  await settle();await backfill();
  assert.equal(calls,1);assert.match(document.querySelector('.hf-user-notice-success').textContent,/4 hồ sơ.*Không còn/);
  assert.equal(document.querySelector('.hf-user-notice-success').getAttribute('role'),'status');assert.equal(document.querySelector('[data-error-popup]'),null);
  await act(async()=>document.querySelector('.hf-user-notice-success button').click());assert.equal(document.querySelector('.hf-user-notice-success'),null);
  outcome={processed:2,remaining:1,needsReview:['synthetic-user']};await backfill();
  assert.match(document.querySelector('.hf-user-notice-info').textContent,/Cần kiểm tra ảnh cũ/);assert.equal(document.querySelector('[data-error-popup]'),null);
  fail=true;await backfill();assert.equal(document.querySelector('.hf-user-notice-info'),null);assert.ok(document.querySelector('[data-error-popup]'));
  assert.match(document.querySelector('[data-error-popup]').textContent,/chờ một lát|thử lại/i);
 }finally{await act(async()=>renderer.unmount());dom.window.close();delete global.adminConfigApi;}
});
