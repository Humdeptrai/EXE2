const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const {build}=require(process.env.ESBUILD_MODULE||'esbuild');
const root=path.resolve(__dirname,'..'),req=Module.createRequire(path.join(root,'package.json'));
test('identity outcome displays specific reason, distinct style/icon, rejection and replacement status',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/profile'});
 for(const k of ['window','document','HTMLElement','HTMLInputElement','Event','CustomEvent','localStorage'])global[k]=dom.window[k];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=req('react'),{act}=React,{createRoot}=req('react-dom/client'),{MemoryRouter}=req('react-router-dom');
 const built=await build({stdin:{contents:`export {default as Notice} from './src/features/identity/components/IdentityOutcomeNotice';export {notificationPresentation} from './src/features/notifications/utils/notificationPresentation';export {notificationDestination} from './src/features/notifications/utils/notificationDestination';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,define:{'import.meta.env':'{}'},external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'}});
 const mod=new Module(path.join(root,'identity-outcome-fixture.cjs'));mod.filename=path.join(root,'identity-outcome-fixture.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(built.outputFiles[0].text,mod.filename);
 const renderer=createRoot(document.getElementById('root'));const styles=new Set(),icons=new Set();
 const cases=[['REVIEW_REQUIRED','Trùng số CCCD với hồ sơ đã có.','Trùng CCCD','IDENTITY_DUPLICATE_DOCUMENT'],['REVIEW_REQUIRED','Trùng khuôn mặt với hồ sơ đã có.','Trùng khuôn mặt','IDENTITY_DUPLICATE_FACE'],['REVIEW_REQUIRED','Trùng số CCCD và trùng khuôn mặt với hồ sơ đã có.','Trùng CCCD và khuôn mặt','IDENTITY_DUPLICATE_BOTH'],['ERROR','Dịch vụ chưa sẵn sàng.','Cần bổ sung xác minh','IDENTITY_ACTION_REQUIRED'],['REJECTED','Ảnh mặt sau bị mờ.','Hồ sơ bị từ chối','IDENTITY_REJECTED'],['VERIFIED','Đã duyệt hồ sơ.','Xác minh thành công','IDENTITY_APPROVED']];
 try{
  for(const [status,reason,title,type]of cases){
   await act(async()=>renderer.render(React.createElement(MemoryRouter,null,React.createElement(mod.exports.Notice,{outcome:{status,reason}}))));
   assert.equal(document.querySelector('h3').textContent,title);assert.ok(document.body.textContent.includes(reason));
   assert.equal(document.querySelector('[data-identity-outcome]').getAttribute('role'),status==='VERIFIED'?'status':'alert');
   const presentation=mod.exports.notificationPresentation(type);styles.add(presentation.iconClass);icons.add(presentation.icon);
   assert.equal(mod.exports.notificationDestination({type}),'/profile?identity=1');
   if(status!=='VERIFIED')assert.ok(document.querySelector('a[href="/face-comparison"]'));
  }
  assert.equal(styles.size,6);assert.equal(icons.size,6);
  await act(async()=>renderer.render(React.createElement(MemoryRouter,null,React.createElement(mod.exports.Notice,{outcome:{status:'REJECTED',reason:'Không khớp'},previousVerified:true}))));
  assert.match(document.body.textContent,/Hồ sơ đã xác minh trước đó vẫn được giữ nguyên/);
 }finally{await act(async()=>renderer.unmount());dom.window.close();}
});
