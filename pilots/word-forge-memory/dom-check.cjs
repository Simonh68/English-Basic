// DOM interaction tests; these do not assert visual layout or real speech.
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const KEY='efn:wf-memory:pilot:v1';
function launch(saved=null,deny=false){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://local-pilot.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,beforeParse(w){
  w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true});
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  if(saved)w.localStorage.setItem(KEY,saved);
  w.localStorage.setItem('existing-production-progress','unchanged');
  if(deny)w.Storage.prototype.setItem=function(){throw Error('storage unavailable');};
 }});
 const doc=dom.window.document;
 doc.querySelector('[data-demo="exit"]')?.click();
 return {dom,doc,errors,click(sel){const node=doc.querySelector(sel);assert(node,'Missing '+sel);node.click();},state(){return JSON.parse(dom.window.localStorage.getItem(KEY)).game;},answer(){const c=this.state().run.challenge;this.click(`[data-answer="${c.plan.correct}"]`);}};
}
let app=launch();assert.deepEqual(app.errors,[]);assert.equal(app.doc.querySelector('.word').textContent,'book');
app.click('#sound');app.click('[data-action="test"]');assert.equal(app.doc.querySelectorAll('.choice').length,4);app.answer();assert.equal(app.state().run.score,10);
app.click('[data-action="next"]');app.click('#stages');assert.equal(app.doc.querySelectorAll('[data-stage]').length,50);
app.click('[data-stage="1-5"]');app.click('#changeStage');for(let i=0;i<5;i++)app.click('[data-action="defer"]');
assert.equal(app.state().run.score,0);assert.equal(app.doc.querySelectorAll('.memory-card.filled').length,5);
assert(app.doc.querySelector('.defer-action').textContent.includes('+61'));
app.click('[data-action="defer"]');assert.equal(app.state().run.phase,'challenge');
const saved=app.dom.window.localStorage.getItem(KEY),selection=app.state().run.challenge.index;app.dom.window.close();app=launch(saved);
assert.equal(app.state().run.challenge.index,selection);app.answer();assert.equal(app.state().run.score,183);
app.click('[data-action="next"]');assert.equal(app.state().run.challenge.origin,'review');
app.click('[data-action="hint"]');app.answer();assert.equal(app.state().run.score,183);
let count=0;
while(app.state().run.phase!=='summary'&&count++<200){
 const phase=app.state().run.phase;
 if(phase==='learn')app.click('[data-action="defer"]');
 else if(phase==='challenge')app.answer();
 else if(phase==='feedback')app.click('[data-action="next"]');
 else throw Error('Unexpected '+phase);
}
assert(count<200);assert.equal(app.state().run.passed.length,15);const bank=app.state().bank;
const finished=app.dom.window.localStorage.getItem(KEY);app.dom.window.close();app=launch(finished);assert.equal(app.state().bank,bank);
app.click('[data-action="nextStage"]');assert.equal(app.state().lesson,6);assert.equal(app.state().run.score,0);
app.click('#help');assert(app.doc.querySelector('#helpDialog').open);app.click('#helpDialog [data-close]');
assert(!app.doc.querySelector('#helpDialog').open);
app.dom.window.dispatchEvent(new app.dom.window.Event('pagehide'));app.dom.window.document.dispatchEvent(new app.dom.window.Event('visibilitychange'));
assert(app.doc.querySelector('[data-action="resume"]'));app.click('[data-action="resume"]');
assert.equal(app.dom.window.localStorage.getItem('existing-production-progress'),'unchanged');assert.deepEqual(app.errors,[]);app.dom.window.close();
const blocked=launch(null,true);assert(blocked.doc.querySelector('#main .toast').textContent.includes('אינה זמינה'));blocked.click('[data-action="test"]');assert.equal(blocked.doc.querySelectorAll('.choice').length,4);assert.deepEqual(blocked.errors,[]);blocked.dom.window.close();
const bad=launch('{bad');assert.equal(bad.doc.querySelector('.word').textContent,'book');assert.deepEqual(bad.errors,[]);bad.dom.window.close();
console.log(JSON.stringify({result:'passed',method:'jsdom; not visual browser QA',actions:count,checks:['introduction','50-stage selector','six-word cap','skip encouragement','unchanged score while skipping','saved random choice','score settlement','unselected-word review','hint excludes points','full 15-word completion','next stage','help dialog','pause/resume','production storage isolation','storage denied warning','corrupt storage recovery','no script errors']}));
