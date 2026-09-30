// DOM-only regressions. This is not evidence of rendered layout or audible TTS.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
function launch(t,{guide=false,saved=null}={}){
  const dom=new JSDOM(html,{url:'https://pilot.invalid/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
    if(saved)w.localStorage.setItem('efn:wf-memory:pilot:v1',saved);
    w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true});
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  }});
  t.after(()=>dom.window.close());
  const w=dom.window,d=w.document;
  const click=s=>{assert(d.querySelector(s),'Missing '+s);d.querySelector(s).click();};
  const state=()=>JSON.parse(w.localStorage.getItem('efn:wf-memory:pilot:v1')).game;
  if(!guide)d.querySelector('[data-demo="exit"]')?.click();
  return {w,d,click,state};
}
test('choosing the current stage preserves the open question and earned points',t=>{
  const a=launch(t);a.click('#sound');a.click('[data-action="test"]');
  a.click(`[data-answer="${a.state().run.challenge.plan.correct}"]`);
  const before=a.state();a.click('#stages');a.click('[data-stage="1-1"]');
  assert.deepEqual(a.state(),before);assert.equal(a.d.querySelector('#stageDialog').open,false);
});
test('stage change requires a second action, cancel preserves progress',t=>{
  const a=launch(t);a.click('#sound');a.click('[data-action="test"]');const before=a.state();
  a.click('#stages');a.click('[data-stage="1-5"]');
  assert.equal(a.d.querySelector('#stageConfirm').hidden,false);assert.deepEqual(a.state(),before);
  assert.equal(a.d.activeElement.id,'keepStage');a.click('#keepStage');assert.deepEqual(a.state(),before);
  a.click('#stages');a.click('[data-stage="1-5"]');a.click('#changeStage');
  assert.equal(a.state().lesson,5);assert.equal(a.state().run.cursor,0);
});
test('unavailable speech gives visible feedback and does not interrupt answers',t=>{
  const a=launch(t);a.click('[data-speak]');
  assert.equal(a.d.querySelector('#speechStatus').hidden,false);
  assert.match(a.d.querySelector('#speechStatus').textContent,/אין קול/);
  a.click('[data-action="test"]');assert.equal(a.state().run.phase,'challenge');
  a.click('#sound');assert.equal(a.d.querySelector('#speechStatus').hidden,true);
});
test('repeated speech cancels older requests; stale failures cannot overwrite a successful retry',async t=>{
  const a=launch(t);const calls=[];let cancelled=0;
  a.w.EFN_SPEECH={supported:true,prime(){},cancel(){cancelled++;},speak(text,options){return new Promise(resolve=>calls.push({text,options,resolve}));}};
  a.click('[data-speak]');a.click('[data-speak]');assert.equal(cancelled,2);
  assert.equal(calls[0].text,'book');assert.equal(calls[0].options.language,'en-US');
  calls[1].resolve({ok:true});await new Promise(setImmediate);calls[0].resolve({ok:false,reason:'timeout'});await new Promise(setImmediate);
  assert.equal(a.d.querySelector('#speechStatus').hidden,true);
});
test('speech rejection is visible; pagehide cancels speech and requires explicit resume',async t=>{
  const a=launch(t);let resolve,cancels=0;
  a.w.EFN_SPEECH={supported:true,prime(){},cancel(){cancels++;},speak(){return Promise.reject(Error('unavailable'));}};
  a.click('[data-speak]');await new Promise(setImmediate);assert.equal(a.d.querySelector('#speechStatus').hidden,false);
  a.w.EFN_SPEECH={supported:true,prime(){},cancel(){cancels++;},speak(){return new Promise(r=>resolve=r);}};
  a.click('[data-speak]');a.w.dispatchEvent(new a.w.Event('pagehide'));
  resolve({ok:true});await new Promise(setImmediate);
  a.d.dispatchEvent(new a.w.Event('visibilitychange'));assert(a.d.querySelector('[data-action="resume"]'));
  assert(a.d.querySelector('[data-action="test"]').disabled);assert(cancels>=3);
  a.click('[data-action="resume"]');assert.equal(a.d.querySelector('[data-action="test"]').disabled,false);
});
test('defer brings new content back into view when the old actions were scrolled down',t=>{
  const a=launch(t);a.click('#sound');a.click('#stages');a.click('[data-stage="1-5"]');
  let scrolls=0;const main=a.d.querySelector('#main');main.getBoundingClientRect=()=>({top:-240});
  main.scrollIntoView=()=>scrolls++;a.click('[data-action="defer"]');
  assert.equal(a.state().run.cursor,1);assert.equal(scrolls,1);assert.equal(a.d.activeElement,main);
});
test('guided example permits wrong attempts and replay without changing game progress',t=>{
  const a=launch(t,{guide:true}),before=a.state();
  assert.equal(a.d.querySelector('.word').textContent,'cat');
  a.click('[data-demo="hide"]');a.click('[data-demo-answer="o"]');
  assert(a.d.querySelector('[data-demo-answer="o"]').disabled);
  assert.match(a.d.querySelector('.practice-note').textContent,/עוד ניסיון/);
  assert.deepEqual(a.state(),before);
  a.click('[data-demo="show"]');a.click('[data-demo="hide"]');a.click('[data-demo-answer="a"]');
  assert.match(a.d.querySelector('.coach strong').textContent,/הצלחתם/);
  assert.deepEqual(a.state(),before);a.click('[data-demo="exit"]');
  assert.equal(a.d.querySelector('.word').textContent,'book');
  assert.equal(a.d.querySelectorAll('#main .actions .action').length,1);
  assert.deepEqual(a.state(),before);
  const saved=a.w.localStorage.getItem('efn:wf-memory:pilot:v1');
  const b=launch(t,{guide:true,saved});assert(!b.d.querySelector('.demo'));assert.deepEqual(b.state(),before);
});
test('reopening the demo preserves an in-progress challenge and speaks the example word',async t=>{
  const a=launch(t);a.click('[data-action="test"]');const before=a.state();
  a.click('#help');a.click('#demoStart');
  const spoken=[];a.w.EFN_SPEECH={supported:true,prime(){},cancel(){},async speak(w){spoken.push(w);return {ok:true};}};
  a.click('[data-speak]');await new Promise(setImmediate);assert.deepEqual(spoken,['cat']);
  a.click('[data-demo="exit"]');assert.deepEqual(a.state(),before);
  assert.equal(a.d.querySelectorAll('[data-answer]').length,4);
});
test('guided correction never settles points again or counts as independent recall',t=>{
  const a=launch(t);a.click('[data-action="test"]');const c=a.state().run.challenge;
  const wrong=c.options.find(o=>o!==c.plan.correct);a.click(`[data-answer="${wrong}"]`);
  const before=a.state();assert(before.run.queue.includes(c.index));assert(!before.run.passed.includes(c.index));
  a.click('[data-action="repair"]');a.click(`[data-repair-answer="${wrong}"]`);
  assert(a.d.querySelector(`[data-repair-answer="${wrong}"]`).disabled);assert.deepEqual(a.state(),before);
  a.click(`[data-repair-answer="${c.plan.correct}"]`);assert.match(a.d.querySelector('.result-label').textContent,/השלמנו יחד/);
  assert.deepEqual(a.state(),before);
  const b=launch(t,{saved:a.w.localStorage.getItem('efn:wf-memory:pilot:v1')});
  assert.equal(b.state().run.phase,'feedback');assert.deepEqual(b.state(),before);
  a.click('[data-action="next"]');assert.equal(a.state().run.phase,'learn');assert(a.state().run.queue.includes(c.index));
});
test('hint-assisted success offers guided correction and keeps later independent review',t=>{
  const a=launch(t);a.click('[data-action="test"]');a.click('[data-action="hint"]');
  const c=a.state().run.challenge;a.click(`[data-answer="${c.plan.correct}"]`);
  assert(a.d.querySelector('[data-action="repair"]'));assert.equal(a.state().run.score,0);
  a.click('[data-action="repair"]');a.click(`[data-repair-answer="${c.plan.correct}"]`);
  assert.equal(a.state().run.score,0);assert.equal(a.state().run.passed.length,0);assert(a.state().run.queue.includes(c.index));
});
test('later stages explain whether current word joins pool and show added prize',t=>{
  const a=launch(t);a.click('#stages');a.click('[data-stage="1-2"]');
  assert.equal(a.d.querySelectorAll('#main .actions .action').length,2);a.click('[data-action="defer"]');
  assert.equal(a.state().run.pending.length,1);
  assert.match(a.d.querySelector('[data-action="test"]').textContent,/מתוך 1/);
  assert.match(a.d.querySelector('[data-action="defer"]').textContent,/\+15 לפרס האפשרי/);
  assert.match(a.d.querySelector('.microcopy').textContent,/המילה שעל המסך תחכה/);
});
