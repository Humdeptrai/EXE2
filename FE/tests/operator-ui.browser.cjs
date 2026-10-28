/* Local browser regressions with synthetic API fixtures only.
 * Install Playwright separately, then run with NODE_PATH pointing to that install:
 *   node FE/tests/operator-ui.browser.cjs
 * Optional: PLAYWRIGHT_MODULE, CHROMIUM_PATH, TEST_PORT.
 * Starts/stops the Vite preview; run `npm run build --prefix FE` first.
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const port = Number(process.env.TEST_PORT || 4173);
const base = `http://127.0.0.1:${port}`;
const user = { id:'00000000-0000-0000-0000-000000000001',fullName:'Synthetic Admin',role:'ADMIN',currentMode:'CONSUMER',active:true };
(async()=>{
  const server=spawn(process.execPath,[path.join(root,'FE/node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:path.join(root,'FE'),stdio:['ignore','pipe','pipe']});
  let browser;
  try {
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preview did not start')),15000);server.stdout.on('data',b=>{if(String(b).includes('Local:')){clearTimeout(timer);resolve();}});server.on('exit',code=>{clearTimeout(timer);reject(Error('Preview exited '+code));});});
    browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote']}:{})});
    const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
    const requests=[];
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.pathname.startsWith('/api/v1/')){
        const api=u.pathname.slice('/api/v1'.length);requests.push({api,size:u.searchParams.get('size'),page:u.searchParams.get('page')});
        let result;
        if(api==='/users/me')result=user;
        else if(api==='/notifications/unread-count')result={unreadCount:0};
        else if(api==='/admin/presence')result={onlineUsers:3,observedAt:new Date().toISOString()};
        else if(api.endsWith('/analytics'))result={month:'2026-10',users:37,jobs:0,matches:0,reports:0,pendingReports:0,pendingIdentities:0,hiddenJobs:0,grossFees:0,refunds:0,netFees:0,topups:0,walletLiability:0,feeTransactions:0,monthFees:0,monthRefunds:0,monthNetFees:0,monthTopups:0,daily:[{date:"2026-10-01",fees:0,refunds:0,topups:0}],reportStatuses:[],jobStatuses:[]};
        else {
          const size=Number(u.searchParams.get('size')||20),page=Number(u.searchParams.get('page')||0),total=api==='/admin/users'?37:0;
          result={content:Array.from({length:Math.max(0,Math.min(size,total-page*size))},(_,i)=>({id:`synthetic-${page*size+i}`,fullName:`Fixture ${page*size+i}`,email:'fixture@example.invalid',role:'USER',active:true,balance:0})),page,size,totalElements:total,totalPages:Math.ceil(total/size),first:page===0,last:(page+1)*size>=total};
        }
        return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({code:200,result})});
      }
      if(u.origin===base)return route.continue();
      return route.abort();
    });
    const page=await context.newPage();
    page.on("pageerror",e=>console.error("BROWSER_ERROR",e.message));
    await page.goto(base);
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:900});
      const cue=page.locator('.hf-scroll-cue span');await cue.waitFor();
      const box=await cue.boundingBox();assert.ok(box);assert.ok(Math.abs(box.width-box.height)<.1,`Arrow not circular at ${width}`);
      const shape=await cue.evaluate(e=>({radius:getComputedStyle(e).borderRadius,svg:e.querySelectorAll('svg').length}));
      assert.equal(shape.radius,'50%');assert.equal(shape.svg,1);
    }
    console.log('PASS landing arrow remains circular at 1440/390/320 px');
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(u=>{localStorage.setItem('authUser',JSON.stringify(u));localStorage.setItem('accessToken','synthetic-browser-test-token');localStorage.setItem('refreshToken','synthetic-refresh');},user);
    await page.goto(base+'/admin/users?page=3&size=5&search=fixture');
    const select=page.getByLabel('Số mục mỗi trang');await select.waitFor();
    assert.deepEqual(await select.locator('option').allTextContents(),['5','10','15','30','50']);
    for(const size of [10,15,30,50,5]){
      await page.waitForFunction(()=>!document.querySelector('[aria-label="Số mục mỗi trang"]')?.disabled);
      const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/admin/users')&&new URL(r.url()).searchParams.get('size')===String(size));
      await select.selectOption(String(size));await response;
      const url=new URL(page.url());assert.equal(url.searchParams.get('size'),String(size));assert.equal(url.searchParams.get('page'),null);assert.equal(url.searchParams.get('search'),'fixture');
    }
    console.log('PASS all page sizes reach API and reset page while preserving search');
    await page.goto(base+'/admin/users?size=999');await select.waitFor();assert.equal(await select.inputValue(),'10');
    for(const section of ['jobs','matches','topups','ledger','audit','reports','skills']){
      await page.goto(base+'/admin/'+section);const size=page.getByLabel('Số mục mỗi trang');await size.waitFor();assert.equal(await size.inputValue(),'10');
      await page.waitForFunction(()=>!document.querySelector('[aria-label="Số mục mỗi trang"]')?.disabled);
      await size.selectOption('15');await page.waitForFunction(()=>!document.querySelector('[aria-label="Số mục mỗi trang"]')?.disabled);
    }
    await page.goto(base+'/admin/identities');await page.getByLabel('Số mục mỗi trang').first().waitFor();
    const selectors=page.getByLabel('Số mục mỗi trang');assert.equal(await selectors.count(),2);
    await selectors.first().selectOption('30');assert.equal(new URL(page.url()).searchParams.get('appeal-size'),'30');
    await page.waitForFunction(()=>!document.querySelectorAll('[aria-label="Số mục mỗi trang"]')[1]?.disabled);
    await selectors.nth(1).selectOption('15');assert.equal(new URL(page.url()).searchParams.get('size'),'15');assert.equal(new URL(page.url()).searchParams.get('appeal-size'),'30');
    console.log('PASS operator pages and independent identity/appeal pagination');
    await page.goto(base+'/admin');await page.locator('.op-kpi').filter({hasText:'Đang online'}).waitFor();
    const online=page.locator('.op-kpi').filter({hasText:'Đang online'});
    await page.waitForFunction(()=>[...document.querySelectorAll('.op-kpi')].some(e=>e.textContent.includes('Đang online')&&e.querySelector('strong')?.textContent==='3'));
    assert.equal(await online.locator('strong').innerText(),'3');assert.equal(await page.locator('.op-kpi').filter({hasText:'Tổng tài khoản'}).locator('strong').innerText(),'37');
    console.log('PASS dashboard shows total accounts and online snapshot');
    await page.waitForTimeout(31000);
    assert.ok(requests.filter(r=>r.api==='/admin/presence').length>=2,'Online snapshot did not refresh');
    console.log('PASS online snapshot refreshes automatically');
    await context.close();
  } finally {if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
