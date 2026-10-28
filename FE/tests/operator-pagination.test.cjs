/* Run with `node --test FE/tests/operator-pagination.test.cjs`.
 * Transpile the pure TS module with an esbuild installation (ESBUILD_MODULE).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { transformSync } = require(process.env.ESBUILD_MODULE || 'esbuild');
const fs = require('node:fs');
const code=transformSync(fs.readFileSync(path.join(__dirname,'../src/utils/operatorPagination.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
const moduleObject={exports:{}};new Function('module','exports',code)(moduleObject,moduleObject.exports);
const { readOperatorPage }=moduleObject.exports;
function fixture(total,legacy=false) {
  const calls=[];
  return {calls,fetch:async(page,size)=>{
    calls.push({page,size});const stride=legacy?20:size;
    return {content:Array.from({length:Math.max(0,Math.min(stride,total-page*stride))},(_,i)=>({id:page*stride+i})),page,size:stride,totalElements:total,totalPages:Math.ceil(total/stride),first:page===0,last:(page+1)*stride>=total};
  }};
}
for(const legacy of [false,true])for(const size of [5,10,15,30,50,100])test(`23 accounts, size ${size}, ${legacy?'legacy batches of 20':'native server'}`,async()=>{
  const source=fixture(23,legacy),all=[];const count=Math.ceil(23/size);
  for(let page=0;page<count;page++){
    const before=source.calls.length;const result=await readOperatorPage(source.fetch,page,size);
    assert.equal(result.content.length,Math.min(size,23-page*size));assert.equal(result.totalPages,count);
    assert.equal(result.size,size);assert.equal(result.page,page);assert.equal(result.first,page===0);assert.equal(result.last,page===count-1);
    assert.deepEqual(result.content.map(x=>x.id),Array.from({length:result.content.length},(_,i)=>page*size+i));
    all.push(...result.content.map(x=>x.id));if(!legacy)assert.equal(source.calls.length-before,1);
  }
  assert.deepEqual(all,Array.from({length:23},(_,i)=>i));
});
test('15-per-page selection correctly crosses legacy 20-row boundaries',async()=>{
  const source=fixture(87,true);const r=await readOperatorPage(source.fetch,1,15);
  assert.deepEqual(r.content.map(x=>x.id),Array.from({length:15},(_,i)=>15+i));
});
test('100-per-page selection can assemble five legacy batches',async()=>{
  const source=fixture(213,true);const r=await readOperatorPage(source.fetch,1,100);
  assert.deepEqual(r.content.map(x=>x.id),Array.from({length:100},(_,i)=>100+i));assert.equal(r.totalPages,3);
});
test('empty lists have no next page',async()=>{
  const r=await readOperatorPage(fixture(0,true).fetch,0,5);assert.deepEqual(r.content,[]);assert.equal(r.last,true);assert.equal(r.totalPages,0);
});
test('out-of-range pages cannot show unrelated records',async()=>{
  const r=await readOperatorPage(fixture(23,true).fetch,99,5);assert.deepEqual(r.content,[]);assert.equal(r.last,true);
});
test('cancelled/network requests propagate instead of showing a partial page',async()=>{
  const source=fixture(23,true);const failure=new Error('cancelled');
  await assert.rejects(readOperatorPage(async(p,s)=>{if(p===1)throw failure;return source.fetch(p,s);},0,30),e=>e===failure);
});
test('invalid sizes and invalid server metadata are rejected',async()=>{
  await assert.rejects(readOperatorPage(fixture(23).fetch,0,999));
  await assert.rejects(readOperatorPage(async()=>({...await fixture(23).fetch(0,20),size:0}),0,5));
});
function clientService(get,session=()=> 'synthetic-session') {
  const code=transformSync(fs.readFileSync(path.join(__dirname,'../src/services/operatorPageService.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
  const output={exports:{}};
  const requireFake=name=>{
    if(name==='axios')return {isAxiosError:e=>e?.isAxiosError===true,CanceledError:class extends Error{}};
    if(name==='../config/axios')return {get};
    if(name==='./tokenService')return {tokenService:{getSessionId:session}};
    if(name==='../utils/operatorPagination')return moduleObject.exports;
    throw Error('Unexpected test import '+name);
  };
  new Function('require','module','exports',code)(requireFake,output,output.exports);
  return output.exports.getOperatorPage;
}
test('shared HTTP adapter preserves filters and abort signal on legacy follow-up requests',async()=>{
  const source=fixture(23,true),signal=new AbortController().signal;
  const load=clientService(async(url,config)=>{
    assert.equal(url,'/admin/users');assert.equal(config.params.search,'fixture');assert.equal(config.params.state,'USER');assert.equal(config.signal,signal);
    return {data:{result:await source.fetch(config.params.page,config.params.size)}};
  });
  const r=await load('/admin/users',{page:4,size:5,search:'fixture',state:'USER'},signal);
  assert.deepEqual(r.content.map(x=>x.id),[20,21,22]);assert.equal(r.totalPages,5);
});
test('100-row adapter supports the previous server that rejects 100 but accepts 50',async()=>{
  const source=fixture(123),calls=[];
  const load=clientService(async(url,config)=>{
    calls.push(config.params.size);
    if(config.params.size===100)throw {isAxiosError:true,response:{status:400}};
    return {data:{result:await source.fetch(config.params.page,config.params.size)}};
  });
  const r=await load('/admin/users',{page:0,size:100});assert.equal(r.content.length,100);assert.equal(r.totalPages,2);assert.ok(calls.includes(50));
});
test('account changes cancel follow-up page requests',async()=>{
  let session='first';const source=fixture(23,true);
  const load=clientService(async(url,config)=>{const result=await source.fetch(config.params.page,config.params.size);session='second';return {data:{result}};},()=>session);
  await assert.rejects(load('/admin/users',{page:0,size:30}),/Authentication session changed/);
});
test('adapter never suppresses authentication errors',async()=>{
  const error={isAxiosError:true,response:{status:401}};let calls=0;
  const load=clientService(async()=>{calls++;throw error;});
  await assert.rejects(load('/admin/users',{page:0,size:100}),e=>e===error);assert.equal(calls,1);
});
