// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check_studio.cjs http://127.0.0.1:3100
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2];
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base||''))throw Error('Supply a loopback browser URL');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let dispatched=0;page.on('request',request=>{if(request.url().endsWith('/api/playground'))dispatched++});
  await page.goto(base);await page.getByRole('button',{name:/Product catalog/}).waitFor({timeout:120000});await page.getByRole('button',{name:/Product catalog/}).click();
  // The map owns the screen by default; one right-hand panel opens on demand
  // and its two tabs share that column.
  const showConsole=async()=>{await page.locator('.side-tabs button',{hasText:'Console'}).click()};
  const showInspect=async()=>{await page.locator('.side-tabs button',{hasText:'Inspect'}).click()};
  await page.getByRole('button',{name:'Console',exact:true}).click();
  await page.getByRole('heading',{name:'Product catalog',exact:true}).waitFor({timeout:120000});
  async function run(identity,status){
   await page.getByLabel('Request identity').selectOption(identity);
   const result=page.waitForResponse(r=>r.url().endsWith('/api/playground')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Run this operation',exact:true}).click();
   const body=await (await result).json();assert.equal(body.status,status);return body;
  }
  await run('missing',403);
  await page.getByText('Events live',{exact:true}).waitFor({timeout:15000});
  await run('reader',200);
  const replay=page.getByRole('button',{name:'Replay',exact:true});await replay.click();
  await page.getByRole('button',{name:'Next step',exact:true}).click();
  await page.locator('.node-next[aria-pressed="true"]').waitFor();
  const before=dispatched;await page.waitForTimeout(700);assert.equal(dispatched,before,'Replay dispatched another request');
  await page.getByRole('button',{name:'Return to live'}).click();
  await page.locator('.node-gateway').click();
  await showInspect();
  const inspector=page.locator('.desktop-inspector');
  await inspector.getByRole('tab',{name:'Source',exact:true}).click();
  await inspector.locator('.code-line[data-highlight="true"]').first().waitFor();
  const selected=await inspector.locator('.source-view select').first().inputValue();
  await page.waitForTimeout(4500);
  assert.equal(await inspector.locator('.source-view select').first().inputValue(),selected);
  assert.equal(await inspector.getByRole('tab',{name:'Source',exact:true}).getAttribute('aria-selected'),'true');
  await inspector.getByRole('tab',{name:'Source',exact:true}).press('ArrowRight');
  assert.equal(await inspector.getByRole('tab',{name:'Rendered YAML'}).getAttribute('aria-selected'),'true');
  await inspector.getByRole('tab',{name:'Explain',exact:true}).click();
  await showConsole();
  fs.mkdirSync('.local/learning-checks',{recursive:true});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'.local/learning-checks/desktop.png',fullPage:true});
  await page.getByRole('button',{name:/Order history/}).first().click();await run('reader',403);
  await page.getByRole('button',{name:/Product queries/}).first().click();
  await page.getByRole('button',{name:'Budget filter',exact:true}).click();await run('reader',200);
  await page.getByRole('button',{name:/Shipping quotes/}).first().click();await run('admin',200);
  // Concurrent background work must preserve the selected request.
  const selection=await page.locator('.run-history .selected small').innerText();
  const count=dispatched;await page.getByRole('button',{name:'Run all services'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.run-history button').length>=9);
  await page.waitForTimeout(1500);assert.ok(dispatched>=count+5);
  assert.equal(await page.locator('.run-history .selected small').innerText(),selection);
  // Exercise retention with explicit fixture responses, without flooding the mesh.
  await page.route('**/api/playground',async route=>{const request=route.request().postDataJSON();await route.fulfill({json:{service:request.service,operation:request.operation,requestId:request.requestId,status:200,latencyMs:0,body:{fixture:true}}})});
  for(let i=0;i<11;i++){
   await page.getByRole('button',{name:'Run all services'}).click();
   await page.waitForFunction(()=>!document.querySelector('.response-section .text-button')?.disabled);
  }
  assert.equal(await page.locator('.run-history>button').count(),50,'Notebook retention is not bounded');
  await page.unroute('**/api/playground');
  await showConsole();
  // Sending opens as its own left column, and hiding a service takes it out of
  // both the map and the list of things you can send.
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.locator('.send-panel').waitFor();
  assert.ok(await page.locator('.send-panel .launch-chip',{hasText:'inventory'}).count()>0,'Send panel offers no inventory trigger');
  await page.getByRole('button',{name:'Hide inventory'}).click();
  assert.equal(await page.locator('.send-panel .launch-chip',{hasText:'inventory'}).count(),0,'Hidden service is still offered');
  assert.equal(await page.locator('.mesh-world [aria-label^="Inspect INVENTORY"]').count(),0,'Hidden service is still drawn');
  await page.getByRole('button',{name:'Show all',exact:true}).click();
  await page.locator('.mesh-world [aria-label^="Inspect INVENTORY"]').waitFor();
  await page.getByRole('button',{name:'Hide send'}).click();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('tab',{name:'journey',exact:true}).click();
  assert.ok(await page.locator('.journey-panel').isVisible());
  await page.getByRole('tab',{name:'explain',exact:true}).first().click();
  assert.ok(await page.locator('.mobile-inspector').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal page overflow');
  await page.screenshot({path:'.local/learning-checks/mobile.png',fullPage:true});
  await page.getByRole('tab',{name:'request',exact:true}).first().click();
  assert.ok(await page.getByLabel('Request identity').isVisible());
  assert.deepEqual(errors,[],'Browser runtime errors');
  console.log('PASS studio: all protocols, observer separation, replay without dispatch, inspector persistence, keyboard tabs, concurrent selection, send sidebar, service visibility, mobile layout');
 }finally{await browser.close()}
})().catch(error=>{console.error(error.stack);process.exitCode=1});
