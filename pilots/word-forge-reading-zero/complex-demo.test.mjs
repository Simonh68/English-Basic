import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {setupComplexDemo} from './complex-demo.mjs';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
test('thought supported demo: hidden goal, real completion gate, groups, meaning, cancellation, no storage',()=>{
 const dom=new JSDOM('<main id="app"><div id="word-goal"></div></main>',{url:'https://example.test'});Object.assign(globalThis,{window:dom.window,document:dom.window.document});let voices=[],utterance,opened=0,closed=0;const synth={getVoices:()=>voices,cancel(){},speak(u){utterance=u;}};class U{constructor(text){this.text=text;}}
 const demo=setupComplexDemo({synth,Utterance:U,beforeOpen:()=>opened++,afterClose:()=>closed++});const b=label=>document.querySelector(`button[aria-label="${label}"]`);demo.open();assert.equal(opened,1);assert.equal(document.querySelector('.complex-demo').textContent.includes('thought'),false);assert.equal(b('בניית המילה המורכבת'),null);
 b('השמעת המטרה בלי כתיב').click();assert.match(document.querySelector('[role=alert]').textContent,/קול אנגלי/);assert.equal(b('בניית המילה המורכבת'),null);
 voices=[{lang:'en-US',name:'English'}];b('השמעת המטרה בלי כתיב').click();assert.equal(utterance.text,'thought');assert.equal(utterance.lang,'en-US');assert.equal(b('בניית המילה המורכבת'),null);utterance.onerror();assert.equal(b('בניית המילה המורכבת'),null);
 b('השמעת המטרה בלי כתיב').click();const cancelled=utterance;demo.close();cancelled.onend();demo.open();assert.equal(b('בניית המילה המורכבת'),null);
 b('השמעת המטרה בלי כתיב').click();utterance.onend();b('בניית המילה המורכבת').click();b('קבוצת אותיות t').click();assert.equal(document.querySelector('.group-target').textContent,'th');
 for(const g of ['th','ough','t'])b('קבוצת אותיות '+g).click();assert.ok(b('אדם חושב'));b('אדם ישן').click();assert.equal(b('השמעת המילה thought'),null);b('אדם חושב').click();assert.ok(b('השמעת המילה thought'));b('השמעת המילה thought').click();assert.equal(utterance.text,'thought');utterance.onend();
 assert.equal(dom.window.localStorage.length,0);b('הדגמה חוזרת').click();assert.equal(b('בניית המילה המורכבת'),null);demo.close();assert.equal(closed,2);assert.equal(document.getElementById('app').hidden,false);dom.window.close();
});
