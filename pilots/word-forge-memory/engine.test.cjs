const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {Game,reward,capFor}=require('./engine.js');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../curriculum-data.js'),'utf8'),sandbox);
const course=JSON.parse(JSON.stringify(sandbox.window.ENGLISH_BASIC_COURSE)),plans=require('./plans.json');
const make=(random=()=>.37)=>new Game(course,plans,null,random);
test('Caps follow first five stages and plateau at six; exponential awards match proposal',()=>{
 assert.deepEqual([1,2,3,4,5,6,10].map(l=>capFor(1,l)),[1,3,4,5,6,6,6]);
 assert.equal(capFor(5,10),6);assert.deepEqual([1,2,3,4,5,6].map(reward),[10,25,47,78,122,183]);
});
test('Deferring earns nothing, respects ceiling, and seals a single random outcome',()=>{
 const g=make();g.start(1,5);
 for(let i=0;i<6;i++){assert(g.defer());assert.equal(g.run.score,0);assert(g.run.pending.length<=g.cap);}
 assert.equal(g.run.phase,'drawing');assert.equal(g.defer(),false);
 const snapshot=g.snapshot(),chosen=g.run.challenge.index;
 const restored=new Game(course,plans,snapshot,()=>.99);restored.finishDraw();
 assert.equal(restored.run.challenge.index,chosen);assert.equal(restored.run.challenge.prize,183);
 assert(restored.answer(restored.run.challenge.plan.correct));assert.equal(restored.run.score,183);
 assert.equal(restored.answer(restored.run.challenge.plan.correct),false);assert.equal(restored.run.score,183);
 assert.equal(restored.run.passed.length,1);assert.equal(restored.run.queue.length,5);
});
test('Stopping early samples deferred cards only and preserves the currently displayed word',()=>{
 const g=make();g.start(1,2);g.defer();const cursor=g.run.cursor;
 g.challengeNow();assert.equal(g.run.challenge.index,0);assert.equal(g.run.cursor,cursor);
 g.answer(g.run.challenge.plan.correct);g.next();assert.equal(g.run.cursor,1);assert.equal(g.run.phase,'learn');
});
test('Each pool position can be selected uniformly; random source maps to equal-sized intervals',()=>{
 const counts=Array(6).fill(0);
 for(let i=0;i<600;i++){const g=make(()=>(i+.5)/600);g.start(1,5);for(let j=0;j<6;j++)g.defer();counts[g.run.challenge.index]++;}
 assert.deepEqual(counts,[100,100,100,100,100,100]);
});
test('Wrong answers use the preannounced loss, never bank points or a negative balance',()=>{
 const g=make();g.start(1,3);g.s.bank=200;g.run.score=100;
 for(let i=0;i<4;i++)g.defer();g.finishDraw();assert.equal(g.run.challenge.loss,39);
 g.answer(g.run.challenge.options.find(x=>x!==g.run.challenge.plan.correct));assert.equal(g.run.score,61);assert.equal(g.s.bank,200);
 const h=make();h.start(1,5);h.run.score=7;for(let i=0;i<6;i++)h.defer();h.finishDraw();assert.equal(h.run.challenge.loss,7);
 h.answer(h.run.challenge.options.find(x=>x!==h.run.challenge.plan.correct));assert.equal(h.run.score,0);
});
test('Introductory stage has no fake lottery and no penalty',()=>{
 const g=make();g.start();g.run.score=50;g.defer();assert.equal(g.run.phase,'challenge');assert.equal(g.run.challenge.loss,0);
});
test('OUGH deferral stops at canonical sound-family boundaries',()=>{
 const g=make();g.start(4,1);g.defer();g.defer();assert.equal(g.run.phase,'learn');g.defer();
 assert.equal(g.run.phase,'drawing');assert.equal(g.run.challenge.pool.length,3);
 assert.deepEqual(g.run.challenge.pool.map(i=>g.items[i].word),['rough','tough','enough']);
});
test('Hinting removes reward and independent credit; no student answer is persisted',()=>{
 const g=make();g.start(1,2);g.defer();g.defer();g.challengeNow();g.finishDraw();g.hint();
 const option=g.run.challenge.plan.correct;g.answer(option);
 assert.equal(g.run.score,0);assert.equal(g.run.passed.length,0);assert.equal(g.stat(g.run.challenge.index).correct,0);
 assert(!('answer' in g.run.feedback));assert(!('selected' in g.run.challenge));assert.equal(g.run.queue.length,2);
});
test('Correction waits for two different other responses',()=>{
 const g=make();g.start();g.challengeNow();g.answer(g.run.challenge.options.find(x=>x!==g.run.challenge.plan.correct));
 g.next();assert.equal(g.run.phase,'learn');assert.equal(g.run.cursor,1);
 g.challengeNow();g.answer(g.run.challenge.plan.correct);g.next();assert.equal(g.run.phase,'learn');
 g.challengeNow();g.answer(g.run.challenge.plan.correct);g.next();assert.equal(g.run.phase,'challenge');assert.equal(g.run.challenge.index,0);
});
test('All 750 canonical items retain the correct grapheme and four distinct options',()=>{
 const g=make();let count=0;
 for(let level=1;level<=5;level++)for(let lesson=1;lesson<=10;lesson++){
  g.start(level,lesson);assert.equal(g.items.length,15);
  for(let i=0;i<15;i++){
   const p=g.plan(i);assert.equal(g.items[i].word.toLowerCase().slice(p.start,p.start+p.length),p.correct);
   if(level===1)assert.equal(p.kind,'letter');
   if(level===4&&lesson===1)assert.equal(p.correct,'ough');
   g.makeChallenge(i,'review',[],10,0);assert.equal(new Set(g.run.challenge.options).size,4);assert(g.run.challenge.options.includes(p.correct));count++;
  }
 }
 assert.equal(count,750);
});
test('100 full runs cover every word, survive hints/errors/reloads, and settle bank once',()=>{
 let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let trial=0;trial<100;trial++){
  let g=make(random);g.start(Math.floor(trial/20)+1,trial%10+1);const challenged=new Map();let steps=0;
  while(g.run.phase!=='summary'&&steps++<500){
   if(g.run.phase==='learn'){if(random()<.75)g.defer();else g.challengeNow();}
   else if(g.run.phase==='drawing'){g=new Game(course,plans,g.snapshot(),random);g.finishDraw();}
   else if(g.run.phase==='challenge'){
    const c=g.run.challenge,n=challenged.get(c.index)||0;challenged.set(c.index,n+1);
    if(n===0&&c.index%7===0){g.hint();g.answer(c.plan.correct);}
    else if(n===0&&c.index%5===0)g.answer(c.options.find(x=>x!==c.plan.correct));
    else g.answer(c.plan.correct);
   }else g.next();
   assert(g.run.score>=0);assert(g.run.pending.length<=g.cap);
  }
  assert.equal(g.run.phase,'summary',`run ${trial} stalled`);assert.equal(g.run.passed.length,15);assert.equal(g.run.queue.length,0);
  assert.equal(challenged.size,15);const bank=g.s.bank;g.finish();assert.equal(g.s.bank,bank);
 }
});
test('Standalone artifact is isolated and embeds no network, analytics, main-site URLs or progress API',()=>{
 const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
 assert(!/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/.test(html));
 assert(!/EBR_PROGRESS|englishfornoar\.co\.il|analytics\.js|\.\.\//.test(html));
 assert(!/<(?:script|link)[^>]*(?:src|href)=["']https?:/.test(html));
 const storageReads=[...html.matchAll(/localStorage\.(getItem|setItem)\(([^,)]+)/g)];
 assert(storageReads.length===2);assert(storageReads.every(m=>m[2]==='KEY'));
 assert(html.includes("const KEY='efn:wf-memory:pilot:v1'"));assert(html.includes('noindex,nofollow'));
});
