import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.RZ_DOM_MODULE||'jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
test('local DOM preview: full loop, error/help/retry, semantic button activation, audio failure and pause',async()=>{
  const dom=new JSDOM(readFileSync(new URL('./index.html',import.meta.url),'utf8'),{url:'http://localhost/pilots/word-forge-reading-zero/'});
  const audios=[];let fail=false;
  class Audio {constructor(path){this.path=path;this.duration=1;audios.push(this);}play(){if(fail)return Promise.reject(Error('audio unavailable'));return Promise.resolve();}pause(){this.onpause?.();}removeAttribute(){}load(){}}
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,Audio,matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>fn(),fetch:async()=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL('./learning-model.spec.json',import.meta.url)))})});
  await import('./machine-app.mjs');await tick();
  const button=label=>document.querySelector(`button[aria-label="${label}"]`);
  const click=async b=>{assert.ok(b);assert.equal(b.disabled,false);b.click();await tick();};
  const end=async()=>{audios.at(-1).onended();await tick();};
  assert.equal(document.querySelector('.word-audio'),null);assert.equal(document.querySelector('#word-goal').textContent.includes('mat'),false);
  fail=true;await click(button('התחלת הדגמת מגע וצליל'));assert.equal(button('בניית המילה ששמעת'),null);fail=false;
  await click(button('התחלת הדגמת מגע וצליל'));assert.equal(audios.at(-1).path,'audio/whole-word-candidates/mat.wav');assert.equal(button('בניית המילה ששמעת'),null);await end();assert.equal(document.querySelector('.word-audio'),null);await click(button('בניית המילה ששמעת'));

  assert.equal(button('המשך להדגמה הבאה'),null);await click(button('השהיה'));await click(button('חזרה לפעילות'));
  fail=true;await click(button('נגיעה באריח והשמעת הצליל'));assert.equal(document.getElementById('audio-error').hidden,false);assert.ok(button('נגיעה באריח והשמעת הצליל'));
  fail=false;await click(button('נגיעה באריח והשמעת הצליל'));await click(button('השהיה'));await end();assert.ok(button('חזרה לפעילות'));await click(button('חזרה לפעילות'));assert.ok(button('נגיעה באריח והשמעת הצליל'));
  for(let i=0;i<2;i++){await click(button('נגיעה באריח והשמעת הצליל'));assert.equal(button('המשך להדגמה הבאה'),null);await end();assert.ok(button('נגיעה באריח והשמעת הצליל'));await click(button('המשך להדגמה הבאה'));}
  for(const target of ['m','s','a','t']){
    if(button('נגיעה באריח והשמעת הצליל')){await click(button('נגיעה באריח והשמעת הצליל'));await end();await click(button('המשך להדגמה הבאה'));}
    const options=[...document.querySelectorAll('#choices button')];assert.equal(options.length,0);
    await click(button('השמעת צליל השאלה'));await end();
    if(target==='m'){await click([...document.querySelectorAll('#choices button')].find(b=>b.textContent==='s'));assert.ok(button('הדגמת תיקון וניסיון נוסף'));await click(button('הדגמת תיקון וניסיון נוסף'));await end();}
    await click([...document.querySelectorAll('#choices button')].find(b=>b.textContent===target));assert.equal(document.querySelectorAll('.connection.on').length,['m','s','a','t'].indexOf(target)+1);
    await click(button('המשך לחיבור הבא'));
  }
  // Different direction independent review, two anonymous audio options and commit.
  const opts=[...document.querySelectorAll('#choices button')];assert.equal(opts.length,2);assert.ok(opts.every(b=>!b.textContent.trim()));
  for(let i=1;i<=2;i++){await click(button(`השמעת אפשרות ${i}`));await end();}
  const target=opts.find(b=>b.dataset.option==='RZ-G-M');await click(document.querySelector(`button[data-option="${target.dataset.option}"]`));await end();
  await click(button('אישור בחירת הצליל'));await click(button('המשך לחיבור הבא'));
  assert.ok(button('הפעלת המכונה'));assert.equal(document.querySelectorAll('.connection.on').length,4);assert.equal(document.querySelectorAll('#choices button[data-part]').length,2);
  assert.ok(document.querySelector('svg[aria-label="שטיחון ארוג עם פסים וגדילים"]'));assert.equal(document.querySelector('.meaning').textContent,'שטיחון');
  const coins=()=>JSON.parse(dom.window.localStorage.getItem('efn:wf-reading-zero:pilot:v1')).snapshot.machine.rewards.coins;const prior=coins();
  await click(button('השמעת המילה mat — שטיחון'));assert.equal(audios.at(-1).path,'audio/whole-word-candidates/mat.wav');assert.equal(audios.at(-1).playbackRate,1);await end();
  for(const letter of ['m','a','t']){await click(button(`השמעת צליל ${letter} במילה mat`));await end();}
  assert.equal(coins(),prior);await click(button('השמעת המילה mat — שטיחון'));await click(button('השהיה'));await end();await click(button('חזרה לפעילות'));assert.ok(button('השמעת המילה mat — שטיחון'));assert.equal(coins(),prior);

  await click(button('הפעלת המכונה'));await click(button('הפחתת תנועה'));assert.ok(document.body.classList.contains('reduced'));assert.equal(document.querySelectorAll('button:not([aria-label])').length,0);
  await click(button('המשך למכונה נוספת'));assert.equal(document.querySelector('.word-audio'),null);assert.equal(document.querySelector('.goal-preview .meaning').textContent,'ישב');assert.ok(document.querySelector('.sat-picture'));
  await click(button('התחלת הדגמת מגע וצליל'));assert.equal(audios.at(-1).path,'audio/whole-word-candidates/sat.wav');await end();await click(button('בניית המילה ששמעת'));
  for(const id of ['RZ-G-M','RZ-G-S','RZ-G-A-AE','RZ-G-T']){assert.equal(button('השמעת מילת היעד בלי כתיב'),null);assert.equal(document.querySelector('.word-audio'),null);for(let i=1;i<=2;i++){await click(button(`השמעת אפשרות ${i}`));await end();}await click(document.querySelector(`button[data-option="${id}"]`));await end();await click(button('אישור בחירת הצליל'));await click(button('המשך לחיבור הבא'));}
  assert.ok(button('השמעת המילה sat — ישב'));await click(button('השמעת המילה sat — ישב'));assert.equal(audios.at(-1).path,'audio/whole-word-candidates/sat.wav');await end();
  assert.equal(dom.window.localStorage.length,2);assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('efn:wf-reading-zero:world:v1')).claims,[{id:'basic:1',word:'mat'},{id:'basic:2',word:'sat'}]);assert.ok(dom.window.localStorage.getItem('efn:wf-reading-zero:pilot:v1'));dom.window.close();
});
