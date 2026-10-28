/* Synthetic notification UI checks. Build FE first, then run with Playwright
 * available via NODE_PATH or PLAYWRIGHT_MODULE; optional CHROMIUM_PATH. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..'),port=Number(process.env.TEST_PORT||4180),base=`http://127.0.0.1:${port}`;
const types=['JOB_INTEREST_RECEIVED','CANDIDATE_ACCEPTED','CANDIDATE_REJECTED','PAYMENT_RECEIVED','CONNECTION_SUCCEEDED','CHAT_MESSAGE_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED','IDENTITY_REVIEWED','SKILL_REVIEWED','RATING_RECEIVED','FUTURE_NOTIFICATION'];
const items=types.map((type,i)=>({id:`notice-${i}`,type,title:`Thông báo mẫu ${i}`,message:'Nội dung thông báo để kiểm tra biểu tượng và phân biệt từng loại trên điện thoại.',referenceId:null,actionUrl:null,read:i===11,readAt:i===11?new Date().toISOString():null,createdAt:new Date(Date.now()-i*60000).toISOString()}));
(async()=>{
 const server=spawn(process.execPath,[path.join(root,'FE/node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:path.join(root,'FE'),stdio:['ignore','pipe','pipe']});let browser;
 try {
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Preview timeout')),15000);server.stdout.on('data',v=>{if(String(v).includes('Local:')){clearTimeout(t);resolve();}});server.on('exit',c=>{clearTimeout(t);reject(Error('Preview exited '+c));});});
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote']}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const user={id:'00000000-0000-0000-0000-000000000001',role:'USER',fullName:'Synthetic User',currentMode:'CONSUMER',active:true};
  await context.addInitScript(u=>{localStorage.setItem('authUser',JSON.stringify(u));localStorage.setItem('accessToken','synthetic-test-token');localStorage.setItem('refreshToken','synthetic-test-refresh');},user);
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url()),api=u.pathname.slice('/api/v1'.length);let result;
   if(u.pathname.startsWith('/api/v1/')){
    if(api==='/users/me')result=user;
    else if(api==='/notifications')result={content:items,page:0,size:50,totalElements:items.length,totalPages:1,first:true,last:true};
    else if(api==='/notifications/read-all'){items.forEach(n=>n.read=true);result={unreadCount:0};}
    else if(/^\/notifications\/notice-\d+\/read$/.test(api)){result=items.find(n=>api.includes(n.id+'/'));result.read=true;result.readAt=new Date().toISOString();}
    else if(api.includes('unread'))result={unreadCount:items.filter(n=>!n.read).length};
    else result=[];
    return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({code:200,result})});
   }
   if(u.origin===base)return route.continue();return route.abort();
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/notifications');const rows=page.locator('[data-notification-type]');await rows.last().waitFor();assert.equal(await rows.count(),12);
  const presentations=await rows.evaluateAll(nodes=>nodes.map(node=>{
   const box=node.querySelector(':scope > span'),svg=box.querySelector('svg');return {type:node.dataset.notificationType,icon:svg.innerHTML,color:getComputedStyle(box).color,bg:getComputedStyle(box).backgroundColor,label:node.querySelector('div > span.inline-flex')?.textContent};
  }));
  assert.equal(new Set(presentations.slice(0,11).map(x=>x.icon)).size,11);assert.equal(new Set(presentations.slice(0,11).map(x=>x.bg)).size,11);assert.ok(presentations.every(x=>x.label));
  assert.equal(presentations[11].label,'Thông báo');console.log('PASS all 11 notification types have distinct icons/colors; unknown type has fallback');
  const first=rows.first(),iconBefore=await first.locator(':scope > span > svg').innerHTML();
  await first.click();await page.waitForFunction(()=>document.querySelector('[data-notification-type="JOB_INTEREST_RECEIVED"]').textContent.includes('Đã đọc'));
  assert.equal(await first.locator(':scope > span > svg').innerHTML(),iconBefore);console.log('PASS marking one notification read preserves its type icon');
  await page.getByRole('button',{name:'Đọc tất cả',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('[data-notification-type]')].every(n=>n.textContent.includes('Đã đọc')));
  assert.equal(await page.getByRole('button',{name:'Đọc tất cả',exact:true}).isDisabled(),true);console.log('PASS read-all behavior remains intact');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Horizontal overflow');
   const sizes=await rows.evaluateAll(nodes=>nodes.map(n=>{const r=n.querySelector(':scope > span').getBoundingClientRect();return {width:r.width,height:r.height};}));assert.ok(sizes.every(x=>x.width===44&&x.height===44));
  }
  if(process.env.SCREENSHOT_DIR){await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'notifications-mobile.png'),fullPage:true});}
  assert.deepEqual(errors,[]);console.log('PASS desktop/mobile layout, readable labels and stable icon size');await context.close();
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
