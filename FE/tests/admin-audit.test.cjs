const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const {build}=require(process.env.ESBUILD_MODULE||'esbuild');
const root=path.resolve(__dirname,'..'),req=Module.createRequire(path.join(root,'package.json'));
test('audit list and drawer show actor name, email, explicit user ID and readable details',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/admin/audit'});
 for(const k of ['window','document','HTMLElement','HTMLInputElement','HTMLSelectElement','Event','CustomEvent','localStorage'])global[k]=dom.window[k];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=req('react'),{act}=React,{createRoot}=req('react-dom/client'),{MemoryRouter}=req('react-router-dom');
 const actor='5c49040f-8a2d-45d1-ae52-59eab217dcde';
 global.auditApi={async get(){return {data:{result:{content:[{id:'record-1',actorId:actor,actorName:'Nguyễn Admin',actorEmail:'admin@example.test',action:'MATCHING_REQUIREMENTS_SETTINGS',detail:'Đã tắt yêu cầu hồ sơ và xác thực. Phí kết nối vẫn áp dụng.',occurredAt:'2026-11-25T00:00:00Z'}],page:0,size:10,totalElements:1,totalPages:1,last:true,first:true}}};}};
 const built=await build({stdin:{contents:`export {default as Page} from './src/features/management/pages/ManagementPage';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,define:{'import.meta.env':'{}'},external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(?:^|\/)config\/axios$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default globalThis.auditApi;'}));}}]});
 const mod=new Module(path.join(root,'audit-fixture.cjs'));mod.filename=path.join(root,'audit-fixture.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(built.outputFiles[0].text,mod.filename);
 const renderer=createRoot(document.getElementById('root'));
 try{
  await act(async()=>renderer.render(React.createElement(MemoryRouter,null,React.createElement(mod.exports.Page,{panel:'audit'}))));
  await act(async()=>new Promise(resolve=>setTimeout(resolve,60)));
  assert.match(document.querySelector('tbody').textContent,/Nguyễn Admin/);assert.match(document.querySelector('tbody').textContent,/admin@example.test/);
  assert.equal([...document.querySelectorAll('option')].some(o=>o.value==='IDENTITY_IMAGE_VIEW'),false);
  await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Chi tiết').click());
  const drawer=document.querySelector('[role=dialog]');
  const entries=[...drawer.querySelectorAll('dl > div')];
  assert.equal(entries.find(e=>e.querySelector('dt').textContent==='ID tài khoản người thực hiện').querySelector('dd').textContent,actor);
  assert.equal(entries.find(e=>e.querySelector('dt').textContent==='Email người thực hiện').querySelector('dd').textContent,'admin@example.test');
  assert.match(drawer.textContent,/Phí kết nối vẫn áp dụng/);assert.doesNotMatch(drawer.textContent,/enabled=false/);
 }finally{await act(async()=>renderer.unmount());dom.window.close();delete global.auditApi;}
});
