/* Synthetic React DOM/API integration; no production account or writes. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { JSDOM } = require(process.env.JSDOM_MODULE || 'jsdom');
const { build } = require(process.env.ESBUILD_MODULE || 'esbuild');
const root = path.resolve(__dirname, '..'), requireFE = Module.createRequire(path.join(root, 'package.json'));

test('bell loads, merges realtime, reads and routes without blocking navigation on read failures', async () => {
 const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/home'});
 for(const key of ['window','document','HTMLElement','Event','CustomEvent']) global[key]=dom.window[key];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=requireFE('react'), {act}=React, {createRoot}=requireFE('react-dom/client');
 const {MemoryRouter,useLocation}=requireFE('react-router-dom');
 const base={message:'Thông báo thử nghiệm',createdAt:'2026-11-24T10:00:00Z',read:false,readAt:null};
 let items=[{...base,id:'accepted',type:'CANDIDATE_ACCEPTED',title:'Được chấp nhận',referenceId:'match-1',actionUrl:'/matches/match-1/payment'},
   {...base,id:'connected',type:'CONNECTION_SUCCEEDED',title:'Kết nối thành công',referenceId:'match-2',actionUrl:'https://example.invalid/unsafe'}];
 let releaseFirst, first=true, failRead=false, failLoad=false, currentPath, markCalls=0;
 const listeners=new Set();let refreshCount=0;
 global.bellTestApi={
  async get(url) {assert.equal(url,'/notifications'); if(failLoad)throw Error('offline');if(first){first=false;await new Promise(resolve=>{releaseFirst=resolve;});}return {data:{result:{content:items}}};},
  async post(url) {markCalls++;if(failRead)throw Error('offline');if(url==='/notifications/read-all'){items=items.map(i=>({...i,read:true}));return {data:{result:{unreadCount:0}}};}
   const id=url.split('/')[2];items=items.map(i=>i.id===id?{...i,read:true}:i);return {data:{result:items.find(i=>i.id===id)}};}
 };
 const output=await build({stdin:{contents:`export {default as Bell} from './src/features/notifications/components/NotificationBell'; export {NotificationContext} from './src/context/NotificationContext';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'},plugins:[{name:'synthetic-api',setup(b){b.onResolve({filter:/(?:^|\/)config\/axios$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default globalThis.bellTestApi;'}));}}]});
 const compiled=new Module(path.join(root,'bell-fixture.cjs'));compiled.filename=path.join(root,'bell-fixture.cjs');compiled.paths=Module._nodeModulePaths(root);compiled._compile(output.outputFiles[0].text,compiled.filename);
 const {Bell,NotificationContext}=compiled.exports;
 function Probe(){currentPath=useLocation().pathname;return null;}
 const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
 const refresh=async()=>{refreshCount++;};
 const value={unreadCount:2,subscribeNotifications:subscribe,refreshUnreadCount:refresh};
 const renderer=createRoot(document.getElementById('root'));
 const click=async text=>{const node=[...document.querySelectorAll('button')].find(n=>n.textContent.includes(text));assert.ok(node,text);await act(async()=>node.click());};
 const open=async()=>{await act(async()=>document.querySelector('.hf-bell-trigger').click());};
 try{
  await act(async()=>renderer.render(React.createElement(MemoryRouter,{initialEntries:['/home']},React.createElement(NotificationContext.Provider,{value},React.createElement(Bell),React.createElement(Probe)))));
  assert.equal(document.querySelector('.hf-bell-count').textContent,'2');
  await open();assert.match(document.body.textContent,/Đang tải/);
  const incoming={...base,id:'new',type:'RATING_RECEIVED',title:'Đánh giá mới',referenceId:null,actionUrl:'/profile',createdAt:'2026-11-24T11:00:00Z'};
  await act(async()=>{for(const listener of listeners)listener(incoming);releaseFirst();});
  assert.equal(document.querySelectorAll('.hf-bell-item').length,3);
  await click('Được chấp nhận');assert.equal(currentPath,'/matches/match-1/payment');assert.equal(markCalls,1);assert.ok(refreshCount>0);
  assert.equal(document.querySelector('.hf-bell-panel'),null);
  await open();failRead=true;await click('Kết nối thành công');assert.equal(currentPath,'/messages/match/match-2');assert.equal(markCalls,2);
  failRead=false;await open();await click('Đọc tất cả');assert.ok([...document.querySelectorAll('.hf-bell-item')].every(e=>!e.classList.contains('hf-bell-unread')));
  await act(async()=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(document.querySelector('.hf-bell-panel'),null);assert.equal(document.activeElement,document.querySelector('.hf-bell-trigger'));
  await open();await act(async()=>document.body.dispatchEvent(new Event('pointerdown',{bubbles:true})));assert.equal(document.querySelector('.hf-bell-panel'),null);
  failLoad=true;await open();assert.match(document.body.textContent,/Chưa tải được/);failLoad=false;await click('Thử lại');assert.equal(document.querySelector('[role="alert"]'),null);
 }finally{await act(async()=>renderer.unmount());dom.window.close();delete global.bellTestApi;}
});

test('admin saves matching policy explicitly and bypassed onboarding goes to the intended page', async () => {
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/admin/settings'});
 for(const key of ['window','document','HTMLElement','HTMLInputElement','Event'])global[key]=dom.window[key];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=requireFE('react'),{act}=React,{createRoot}=requireFE('react-dom/client');
 const {MemoryRouter,useLocation,Routes,Route}=requireFE('react-router-dom');let currentPath;
 let settings={consumerFee:10000,providerFee:5000,minTopUp:10000,maxTopUp:5000000,topUpEnabled:true,paymentWindowMinutes:1440,ratingDelayMinutes:360,matchingRequirementsEnabled:true};
 const writes=[];
 global.bellTestApi={
  async get(url){return {data:{result:url==='/admin/settings'?settings:url==='/identity/eligibility'?{eligible:true,matchingRequirementsEnabled:false,profileComplete:false,identityVerified:false,identityStatus:'NOT_SUBMITTED',missingRequirements:['CCCD'],selfieVerified:false,documentConfirmed:false}:{verification:{status:'NOT_SUBMITTED'}}}};},
  async patch(url,body){writes.push({url,body});settings={...settings,...body};return {data:{result:settings}};}
 };
 const output=await build({stdin:{contents:`export {default as Management} from './src/features/management/pages/ManagementPage'; export {default as MatchingSettings} from './src/features/management/pages/MatchingSettingsPage'; export {default as Onboarding} from './src/features/identity/pages/IdentityOnboardingPage';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,define:{'import.meta.env':'{}'},external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'},plugins:[{name:'synthetic-api',setup(b){b.onResolve({filter:/(?:^|\/)config\/axios$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default globalThis.bellTestApi;'}));}}]});
 const compiled=new Module(path.join(root,'policy-fixture.cjs'));compiled.filename=path.join(root,'policy-fixture.cjs');compiled.paths=Module._nodeModulePaths(root);compiled._compile(output.outputFiles[0].text,compiled.filename);
 const {Management,MatchingSettings,Onboarding}=compiled.exports;const renderer=createRoot(document.getElementById('root'));
 function Probe(){currentPath=useLocation().pathname;return null;}
 try{
  await act(async()=>renderer.render(React.createElement(MemoryRouter,{key:'admin',initialEntries:['/admin/settings']},React.createElement(Management,{panel:'settings'}))));
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});
  assert.equal(document.querySelector('[aria-label="Bắt buộc hồ sơ và xác thực khi matching"]'),null);
  await act(async()=>renderer.render(React.createElement(MemoryRouter,{key:'matching',initialEntries:['/admin/matching-settings']},React.createElement(MatchingSettings))));
  const toggle=()=>document.querySelector('[aria-label="Bắt buộc hồ sơ và xác thực khi matching"]');
  assert.equal(toggle().checked,true);await act(async()=>toggle().click());assert.equal(writes.length,0);
  await act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.deepEqual(writes,[{url:'/admin/settings/matching',body:{matchingRequirementsEnabled:false}}]);
  assert.equal(toggle().checked,false);assert.match(document.body.textContent,/Phí kết nối vẫn áp dụng/);
  await act(async()=>renderer.render(React.createElement(MemoryRouter,{key:'onboarding',initialEntries:['/onboarding?next=%2Fdiscover']},React.createElement(Routes,null,React.createElement(Route,{path:'/onboarding',element:React.createElement(Onboarding)}),React.createElement(Route,{path:'/discover',element:React.createElement('p',null,'Discover')})),React.createElement(Probe))));
  assert.equal(currentPath,'/discover');
 }finally{await act(async()=>renderer.unmount());dom.window.close();delete global.bellTestApi;}
});
