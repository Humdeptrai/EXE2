/* Color-only dark theme regression checks. Build FE first, then run with Playwright
 * available via NODE_PATH or PLAYWRIGHT_MODULE; optional CHROMIUM_PATH. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const postcss=require('../node_modules/postcss');
const root=path.resolve(__dirname,'../..'),port=Number(process.env.TEST_PORT||4180),base=`http://127.0.0.1:${port}`;
const types=['JOB_INTEREST_RECEIVED','CANDIDATE_ACCEPTED','CANDIDATE_REJECTED','PAYMENT_RECEIVED','CONNECTION_SUCCEEDED','CHAT_MESSAGE_RECEIVED','REPORT_RESOLVED','REPORT_REJECTED','IDENTITY_REVIEWED','SKILL_REVIEWED','RATING_RECEIVED','FUTURE_NOTIFICATION'];
const items=types.map((type,i)=>({id:`notice-${i}`,type,title:`Thông báo mẫu ${i}`,message:'Nội dung thông báo để kiểm tra biểu tượng và phân biệt từng loại trên điện thoại.',referenceId:null,actionUrl:null,read:i===11,readAt:i===11?new Date().toISOString():null,createdAt:new Date(Date.now()-i*60000).toISOString()}));
const generated=postcss.parse(fs.readFileSync(path.join(root,'FE/src/theme/dark.generated.css'),'utf8'));
generated.walkDecls(d=>assert.match(d.prop,/^(color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|(?:box|text)-shadow|fill|stroke|accent-color|--[\w-]+)$/,'Theme contains a layout declaration'));
console.log('PASS generated dark layer contains only color declarations');
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
    else if(api==='/admin/users')result={content:[{id:'fixture-1',fullName:'Synthetic account',email:'test@example.invalid',role:'USER',active:true,balance:0}],page:0,size:10,totalElements:1,totalPages:1,first:true,last:true};
    else if(api.includes('unread'))result={unreadCount:items.filter(n=>!n.read).length};
    else result=[];
    return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({code:200,result})});
   }
   if(u.origin===base)return route.continue();return route.abort();
  });
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});
  await page.goto(base+'/notifications');await page.locator('[data-notification-type]').last().waitFor();
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  async function geometry(selector){return page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [n.tagName,...['x','y','width','height'].map(k=>Math.round(r[k]*100)/100)];}));}
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>{localStorage.setItem('handsfree-theme','light');window.dispatchEvent(new StorageEvent('storage',{key:'handsfree-theme'}));});
    await page.getByRole('button',{name:'Mở menu tài khoản',exact:true}).click();
    const before=await geometry('.hf-app-header,.hf-main,.hf-sidebar,.hf-bottomnav,.hf-main :is(h1,section,button,article)');
    const bgBefore=await page.locator('.hf-app').evaluate(e=>getComputedStyle(e).backgroundColor);
    await page.getByRole('button',{name:'Chuyển sang giao diện tối',exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    assert.equal(await page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true}).getAttribute('aria-pressed'),'true');
    assert.deepEqual(await geometry('.hf-app-header,.hf-main,.hf-sidebar,.hf-bottomnav,.hf-main :is(h1,section,button,article)'),before,`User geometry changed at ${width}`);
    assert.notEqual(await page.locator('.hf-app').evaluate(e=>getComputedStyle(e).backgroundColor),bgBefore);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.keyboard.press('Escape');
  }
  console.log('PASS user dark mode changes colors only at desktop/tablet/390/320 px');
  await page.reload();await page.locator('[data-notification-type]').last().waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  const other=await context.newPage();await other.goto(base+'/notifications');await other.locator('[data-notification-type]').last().waitFor();
  await page.getByRole('button',{name:'Mở menu tài khoản',exact:true}).click();await page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true}).click();
  await other.waitForFunction(()=>document.documentElement.dataset.theme==='light');await other.close();
  console.log('PASS preference survives reload and synchronizes across tabs');
  await page.evaluate(()=>{const u=JSON.parse(localStorage.getItem('authUser'));u.role='ADMIN';localStorage.setItem('authUser',JSON.stringify(u));});
  // Route fixtures read the role from this object for /users/me.
  user.role='ADMIN';
  await page.goto(base+'/admin/users');await page.locator('.op-table tbody tr').first().waitFor();
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});
    const slot=await page.locator('.hf-theme-role-button').evaluate(button=>{const bounds=n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};const actual=bounds(button),original=document.createElement('span');original.className='op-role-badge';original.textContent='ADMIN';button.replaceWith(original);const expected=bounds(original);original.replaceWith(button);return {actual,expected};});
    assert.deepEqual(slot.actual,slot.expected,'Theme switch changed original role badge geometry');
    if(await page.locator('html').getAttribute('data-theme')==='dark')await page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true}).click();
    const before=await geometry('.op-topbar,.op-sidebar,.op-content,.op-table,.op-table :is(th,td),.op-pagination');
    await page.getByRole('button',{name:'Chuyển sang giao diện tối',exact:true}).click();
    assert.deepEqual(await geometry('.op-topbar,.op-sidebar,.op-content,.op-table,.op-table :is(th,td),.op-pagination'),before,`Admin geometry changed at ${width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.getByRole('button',{name:'Chi tiết',exact:true}).first().click();await page.getByRole('dialog').waitFor();
  const modalColor=await page.getByRole('dialog').evaluate(e=>getComputedStyle(e).backgroundColor);assert.notEqual(modalColor,'rgb(255, 255, 255)');
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'dark-admin-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Đóng',exact:true}).click();
  console.log('PASS admin table/modal dark colors and unchanged geometry at all four widths');
  user.role='USER';
  await page.goto(base+'/notifications');await page.locator('[data-notification-type]').last().waitFor();
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'dark-notifications-mobile.png'),fullPage:true});
  await page.evaluate(()=>{localStorage.removeItem('handsfree-theme');window.dispatchEvent(new StorageEvent('storage',{key:'handsfree-theme'}));});
  await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  console.log('PASS system preference followed when no explicit choice is saved');
  assert.deepEqual(errors,[]);await context.close();
  const blocked=await browser.newContext({colorScheme:'dark',serviceWorkers:'block'});
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Blocked')};Storage.prototype.setItem=()=>{throw Error('Blocked')};});
  await blocked.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const p=await blocked.newPage();await p.goto(base);assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await blocked.close();
  console.log('PASS theme bootstrap applies dark preference with unavailable storage');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
