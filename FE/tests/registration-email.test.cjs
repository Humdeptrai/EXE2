const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const {build}=require(process.env.ESBUILD_MODULE||'esbuild');
const root=path.resolve(__dirname,'..'),req=Module.createRequire(path.join(root,'package.json'));
test('email-only registration follows admin OTP policy, binds code to email, handles stale policy and mail failures',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/register'});
 for(const k of ['window','document','HTMLElement','HTMLInputElement','Event','CustomEvent','localStorage'])global[k]=dom.window[k];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=req('react'),{act}=React,{createRoot}=req('react-dom/client'),{MemoryRouter}=req('react-router-dom');
 let required=false,failPolicy=false,failMail=false,sent=[],registered=[],adminSaves=[];
 global.registrationApi={
  async get(url){if(url==='/auth/register/policy'){if(failPolicy)throw new Error('offline');return {data:{result:{emailOtpRequired:required}}};}return {data:{result:{registrationEmailOtpEnabled:required}}};},
  async post(url,data){assert.equal(url,'/auth/register/email-otp');if(failMail)throw {isAxiosError:true,response:{status:503,data:{code:50381}}};sent.push(data);return {data:{result:{resendAfterSeconds:60}}};},
  async patch(url,data){assert.equal(url,'/admin/settings/registration-email');adminSaves.push(data);required=data.registrationEmailOtpEnabled;return {data:{result:{registrationEmailOtpEnabled:required}}};}
 };
 const built=await build({stdin:{contents:`export {default as Register} from './src/features/auth/pages/RegisterPage';export {default as Settings} from './src/features/management/pages/RegistrationSettingsPage';export {AuthContext} from './src/context/AuthContext';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,define:{'import.meta.env':'{}'},external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'},plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/(?:^|\/)config\/axios$/},()=>({path:'api',namespace:'fixture'}));
 b.onResolve({filter:/GoogleAuthButton$/},()=>({path:'google',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='api'?'export default globalThis.registrationApi;':'export function GoogleAuthButton(){return null;}'}));
 }}]});
 const mod=new Module(path.join(root,'registration-fixture.cjs'));mod.filename=path.join(root,'registration-fixture.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(built.outputFiles[0].text,mod.filename);
 const renderer=createRoot(document.getElementById('root'));
 let sequence=0;
 const render=async(page)=>act(async()=>renderer.render(React.createElement(MemoryRouter,null,React.createElement(mod.exports.AuthContext.Provider,{value:{register:async data=>{registered.push(data);},loginWithGoogle:async()=>{}}},React.createElement(mod.exports[page],{key:++sequence})))));
 const input=async(id,value)=>act(async()=>{const el=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});
 const click=async(text)=>act(async()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();});
 const submit=async()=>act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 const fill=async(email)=>{await input('fullName','Synthetic person');await input('identifier',email);await input('password','Password123');await input('confirmPassword','Password123');await act(async()=>document.querySelector('input[type=checkbox]').click());};
 try{
  await render('Register');assert.equal(document.querySelector('label[for=identifier]').textContent,'Email');assert.equal(document.getElementById('identifier').type,'email');assert.equal(document.getElementById('emailOtp'),null);
  await fill('0912345678');await submit();assert.equal(registered.length,0);assert.match(document.body.textContent,/email hợp lệ/);
  await input('identifier','fake@example.test');await submit();assert.equal(registered.length,1);assert.equal(registered[0].emailOtp,undefined);assert.equal(sent.length,0);
  required=true;await render('Register');await fill('Real@Example.test');assert.ok(document.getElementById('emailOtp'));
  await submit();assert.equal(registered.length,1);assert.match(document.body.textContent,/bấm Gửi mã OTP/);
  await click('Gửi mã OTP');assert.deepEqual(sent,[{email:'real@example.test'}]);assert.match(document.body.textContent,/10 phút/);
  assert.equal([...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Gửi lại sau')).disabled,true);
  await input('emailOtp','123456');await submit();assert.equal(registered.length,2);assert.equal(registered[1].emailOtp,'123456');
  await input('identifier','other@example.test');assert.equal(document.getElementById('emailOtp').value,'');await submit();assert.equal(registered.length,2);
  failMail=true;await click('Gửi mã OTP');assert.match(document.body.textContent,/Chưa gửi được mã xác thực/);assert.equal(registered.length,2);failMail=false;
  required=false;await render('Register');await fill('stale@example.test');required=true;await submit();assert.equal(registered.length,2);assert.ok(document.getElementById('emailOtp'));
  required=false;await submit();assert.equal(registered.length,3);assert.equal(registered[2].emailOtp,undefined);assert.equal(document.getElementById('emailOtp'),null);
  failPolicy=true;await render('Register');assert.equal(document.querySelector('button[type=submit]').disabled,true);assert.match(document.body.textContent,/Không tải được/);
  failPolicy=false;await click('Tải lại điều kiện đăng ký');assert.equal(document.querySelector('button[type=submit]').disabled,false);
  await render('Settings');const toggle=document.querySelector('input[type=checkbox]');assert.equal(toggle.checked,false);assert.equal(document.querySelector('form button').disabled,true);
  await act(async()=>toggle.click());assert.equal(adminSaves.length,0);await submit();assert.deepEqual(adminSaves,[{registrationEmailOtpEnabled:true}]);assert.ok(document.querySelector('.hf-user-notice-success'));
 }finally{await act(async()=>renderer.unmount());dom.window.close();delete global.registrationApi;}
});
