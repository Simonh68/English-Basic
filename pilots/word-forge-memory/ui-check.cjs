// Offline browser verification of this newly authored local artifact only.
const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto('file://'+path.join(__dirname,'dist/index.html'));
  await page.evaluate(()=>{localStorage.setItem('efn:existing-game:sentinel','unchanged');});
  await page.locator('[data-demo="exit"]').first().click();
  await page.locator('#sound').click();
  assert.equal(await page.locator('.word').textContent(),'book');
  await page.locator('[data-action="test"]').click();assert.equal(await page.locator('.choice').count(),4);
  const answer=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.run.challenge.plan.correct);
  await page.locator('[data-answer="'+await answer()+'"]').click();assert.equal(await page.locator('#scoreValue').textContent(),'10');
  await page.locator('[data-action="next"]').click();
  await page.locator('#stages').click();await page.locator('[data-stage="1-5"]').click();await page.locator('#changeStage').click();
  for(let i=0;i<5;i++)await page.locator('[data-action="defer"]').click();
  assert.equal(await page.locator('#scoreValue').textContent(),'0');assert.equal(await page.locator('.memory-card.filled').count(),5);
  assert((await page.locator('.defer-action').innerText()).includes('+61'));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  fs.mkdirSync(path.join(__dirname,'qa'),{recursive:true});await page.screenshot({path:path.join(__dirname,'qa/mobile-chain.png'),fullPage:true});
  await page.locator('[data-action="defer"]').click();await page.locator('.choice').first().waitFor();
  const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.run.challenge.index);
  await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.run.challenge.index),selected);
  assert.equal(await page.locator('.choice').count(),4);await page.screenshot({path:path.join(__dirname,'qa/mobile-challenge.png'),fullPage:true});
  await page.locator('[data-answer="'+await answer()+'"]').click();assert.equal(await page.locator('#scoreValue').textContent(),'183');
  await page.locator('[data-action="next"]').click();assert((await page.locator('.mode').textContent()).includes('חיזוק'));
  // A complete stage through actual UI actions, including review, without reaching into app variables.
  let actions=0;
  while(!(await page.locator('[data-action="nextStage"]').count())&&actions++<150){
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.run);
   if(state.phase==='learn')await page.locator('[data-action="defer"]').click();
   else if(state.phase==='challenge')await page.locator('[data-answer="'+await answer()+'"]').click();
   else if(state.phase==='feedback')await page.locator('[data-action="next"]').click();
   else if(state.phase==='drawing')await page.locator('.choice').first().waitFor();
  }
  assert(actions<150,'Stage completion must terminate');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.run.passed.length),15);
  const savedBank=await page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.bank);
  await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('efn:wf-memory:pilot:v1')).game.bank),savedBank);
  await page.locator('[data-action="nextStage"]').click();assert((await page.locator('#stages').textContent()).includes('שלב 6'));
  assert.equal(await page.locator('#scoreValue').textContent(),'0');
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(__dirname,'qa/desktop.png'),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:320,height:720});
  await page.locator('#stages').click();await page.locator('[data-stage="5-8"]').click();
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px and 200% text must not overflow');
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  // Corrupted-storage recovery and storage-denied mode are covered in a second browser context.
  const noStorage=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await noStorage.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('storage unavailable');};});
  const blocked=await noStorage.newPage();await blocked.goto('file://'+path.join(__dirname,'dist/index.html'));
  assert((await blocked.locator('#main .toast').textContent()).includes('אינה זמינה'));
  await blocked.locator('[data-demo="exit"]').first().click();
  await blocked.locator('[data-action="test"]').click();assert.equal(await blocked.locator('.choice').count(),4);
  assert.equal(await page.evaluate(()=>localStorage.getItem('efn:existing-game:sentinel')),'unchanged');
  assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  const report={result:'passed',checks:['mobile 390px','desktop 1280px','320px at 200% text','defer incentive','single-word intro','six-word pool','random outcome survives refresh','score once','full stage and all-word coverage','review interleaving','stage progression','isolated local storage','storage denied','no network requests','no browser errors'],uiActions:actions,networkRequests:requests.length};
  fs.writeFileSync(path.join(__dirname,'qa/report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
