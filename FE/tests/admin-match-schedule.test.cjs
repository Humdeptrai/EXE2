const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const {build}=require(process.env.ESBUILD_MODULE||'esbuild');
const root=path.resolve(__dirname,'..'),req=Module.createRequire(path.join(root,'package.json'));
test('admin reschedules all matchings, allows past dates, validates interval, handles conflict and locks duplicate submits',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/admin/matches'});
 for(const k of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','Event','CustomEvent'])global[k]=dom.window[k];
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=req('react'),{act}=React,{createRoot}=req('react-dom/client');
 let version='2026-01-01T00:00:00Z',reads=0,calls=[],saved=0,resolvePatch;
 global.scheduleApi={async get(){reads++;return {data:{result:{matchId:'m1',jobId:'j1',title:'Synthetic job',startAt:'2026-01-01T08:00:00',endAt:'2026-01-02T08:00:00',updatedAt:version,matchingCount:2,timeZone:'Asia/Ho_Chi_Minh'}}};},patch(url,data){calls.push({url,data});return new Promise(resolve=>{resolvePatch=resolve;});}};
 const built=await build({stdin:{contents:`export {default as Form} from './src/features/management/components/AdminMatchScheduleForm';`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,define:{'import.meta.env':'{}'},external:['react','react-dom','react-router-dom'],loader:{'.css':'empty'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(?:^|\/)config\/axios$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default globalThis.scheduleApi;'}));}}]});
 const mod=new Module(path.join(root,'schedule-fixture.cjs'));mod.filename=path.join(root,'schedule-fixture.cjs');mod.paths=Module._nodeModulePaths(root);mod._compile(built.outputFiles[0].text,mod.filename);
 const renderer=createRoot(document.getElementById('root'));
 const change=async(el,value)=>act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});
 const submit=async()=>act(async()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 try {
  await act(async()=>renderer.render(React.createElement(mod.exports.Form,{matchId:'m1',onClose(){},onSaved(){saved++;}})));
  assert.match(document.body.textContent,/toàn bộ 2 matching/);
  const [start,end]=document.querySelectorAll('input');
  assert.equal(start.hasAttribute('min'),false);
  await change(start,'2025-12-01T08:00');await change(end,'2025-12-01T08:00');await change(document.querySelector('textarea'),' Correct dates ');
  await submit();assert.equal(calls.length,0);assert.match(document.body.textContent,/kết thúc sau/);
  await change(end,'2025-12-02T08:00');await submit();await submit();
  assert.equal(calls.length,1);assert.equal(calls[0].url,'/admin/matches/m1/schedule');
  assert.equal(calls[0].data.expectedUpdatedAt,version);assert.equal(calls[0].data.reason,'Correct dates');
  assert.match(calls[0].data.startAt,/^2025-12-01/);assert.equal(document.querySelector('fieldset').disabled,true);
  await act(async()=>resolvePatch({data:{}}));assert.equal(saved,1);
  global.scheduleApi.patch=async()=>{throw {isAxiosError:true,response:{status:409,data:{code:40935}}};};
  await submit();assert.match(document.body.textContent,/Lịch công việc đã thay đổi/);
  version='2026-01-02T00:00:00Z';await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Tải lại lịch').click());
  assert.equal(reads,2);assert.equal(document.querySelector('textarea').value,'');
  assert.equal(document.querySelector('fieldset').disabled,false);
 } finally {await act(async()=>renderer.unmount());dom.window.close();delete global.scheduleApi;}
});
