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
  await click(button('התחלת הדגמת מגע וצליל'));
  fail=true;await click(button('נגיעה באריח והשמעת הצליל'));assert.equal(document.getElementById('audio-error').hidden,false);assert.ok(button('נגיעה באריח והשמעת הצליל'));
  fail=false;await click(button('נגיעה באריח והשמעת הצליל'));await click(button('השהיה'));await end();assert.ok(button('חזרה לפעילות'));await click(button('חזרה לפעילות'));assert.ok(button('נגיעה באריח והשמעת הצליל'));
  for(let i=0;i<2;i++){await click(button('נגיעה באריח והשמעת הצליל'));await end();}
  for(const target of ['m','s','a','t']){
    if(button('נגיעה באריח והשמעת הצליל')){await click(button('נגיעה באריח והשמעת הצליל'));await end();}
    const options=[...document.querySelectorAll('#choices button')];assert.ok(options.every(b=>b.disabled));
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
  assert.ok(button('הפעלת המכונה'));assert.equal(document.querySelectorAll('.connection.on').length,4);assert.equal(document.querySelectorAll('#choices button').length,0);
  await click(button('הפעלת המכונה'));await click(button('הפחתת תנועה'));assert.ok(document.body.classList.contains('reduced'));assert.equal(document.querySelectorAll('button:not([aria-label])').length,0);
  assert.equal(dom.window.localStorage.length,0);dom.window.close();
});
