import {MachineSession,letters} from './session-controller.mjs';
import {AudioPlayer} from './audio-player.mjs';
import {PilotStorage,STORAGE_KEY} from './storage.mjs';
import {parts} from './rewards.mjs';
const $=id=>document.getElementById(id);
const shapes={sound:'M11 5L5 10H2V18H5L11 23ZM16 8Q24 14 16 20M15 12Q18 14 15 16',next:'M8 4L20 14L8 24',help:'M7 5Q2 10 8 15L18 25L23 20L13 10Q16 3 10 2L11 7L7 9Z',pause:'M8 4V24M20 4V24',play:'M8 4L23 14L8 24Z',motion:'M3 9H17M3 15H12M15 4L25 14L15 24',check:'M3 14L10 21L25 5',retry:'M6 7Q24 0 24 15Q24 26 8 24M6 2V10H14',finish:'M6 6H22V22H6ZM10 10H18V18H10Z',power:'M14 2V14M7 6Q-1 13 6 22Q14 30 23 22Q30 13 21 6'};
function icon(name){return `<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><path d="${shapes[name]}"/></svg>`;}
let storage,spec,resetConfirm=false,teachReady=null;let session,player,epoch=0,busy=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function button(host,label,name,act,cls='',disabled=false){const b=document.createElement('button');b.setAttribute('aria-label',label);b.title=label;b.className=cls;b.disabled=disabled;b.innerHTML=icon(name);b.addEventListener('click',act);host.append(b);return b;}
function canAct(){storage.current();if(storage.problem==='conflict'){clearAudio();render();return false;}return true;}
function persist(){storage.save({machine:session.snapshot(),prefs:{reduced}});}
function clearAudio(){epoch++;busy=false;player.stop();}
async function play(id,after=()=>{}){
  if(!canAct())return;persist();const token=++epoch;busy=true;$('audio-error').hidden=true;render();
  const ok=await player.play(id);if(token!==epoch)return;
  busy=false;if(ok&&canAct()){session.heardAudio(id);after();persist();}render();
}
function action(fn){if(!canAct())return;clearAudio();fn();persist();render();}
function render(){
  const phase=session.phase;document.body.classList.toggle('paused',phase==='PAUSED');document.body.classList.toggle('reduced',reduced);
  $('machine').classList.toggle('running',phase==='COMPLETE');$('machine').classList.toggle('paddle',session.rewards.state.part==='paddle');
  document.querySelector('.rotor').innerHTML=session.rewards.state.part==='paddle'?'<path d="M280 61L307 35" stroke="#f4d181" stroke-width="10" stroke-linecap="round"/><circle cx="309" cy="32" r="12" fill="#f4d181"/><circle cx="280" cy="61" r="10" class="hub"/>':'<circle cx="280" cy="61" r="35" class="rim"/><path d="M280 32V90M251 61H309M260 41L300 81M260 81L300 41" class="spokes"/><circle cx="280" cy="61" r="9" class="hub"/>';
  const bank=$('bank');bank.replaceChildren();const coin=document.createElement('span');coin.className='coin';coin.textContent=String(session.rewards.state.coins);bank.append(coin);bank.setAttribute('aria-label',`בנק המטבעות: ${session.rewards.state.coins}`);$('machine').setAttribute('aria-label',`מכונה: ${session.connections} מתוך ארבעה חיבורים מותקנים`);
  $('connections').innerHTML=Array.from({length:4},(_,i)=>`<circle class="connection ${i<session.connections?'on':''}" cx="${40+i*60}" cy="${i%2?115:75}" r="13"/>`).join('');
  $('dots').innerHTML=Array.from({length:4},(_,i)=>`<span class="dot ${i<session.connections?'on':''}"></span>`).join('');
  $('pause').innerHTML=icon(phase==='PAUSED'?'play':'pause');$('pause').setAttribute('aria-label',phase==='PAUSED'?'חזרה לפעילות':'השהיה');
  $('motion').innerHTML=icon('motion');$('motion').setAttribute('aria-pressed',String(reduced));
  const prompt=$('prompt'),choices=$('choices'),actions=$('actions');prompt.replaceChildren();choices.replaceChildren();actions.replaceChildren();
  $('signal').className='signal';$('signal').textContent='';
  if(phase==='READY'){
    $('signal').textContent='☟';
    const start=button(prompt,'התחלת הדגמת מגע וצליל','play',()=>{action(()=>session.start());play(session.teachingItem(),()=>{teachReady=session.teachingItem();});},'primary target demo');
    start.innerHTML='<span aria-hidden="true">m</span> '+icon('sound')+'<small>התחלה</small>';
  }
  if(phase==='TEACH'){
    const id=session.teachingItem();const ready=teachReady===id;
    $('signal').textContent=busy?'♫':ready?'✓':'☟';
    const tile=button(prompt,'נגיעה באריח והשמעת הצליל','sound',()=>play(id,()=>{teachReady=id;}),'target '+(busy?'listening':'demo'),busy);
    tile.innerHTML=`<span aria-hidden="true">${letters[id]}</span> ${icon('sound')}`;
    const rail=document.createElement('div');rail.className='rail';rail.innerHTML='<span id="audio-progress"></span>';actions.append(rail);
    if(ready&&!busy){actions.replaceChildren();const next=button(actions,'המשך להדגמה הבאה','next',()=>action(()=>{teachReady=null;session.teachHeard(id);}), 'primary advance demo');next.insertAdjacentHTML('beforeend','<small>המשך</small>');}
  }
  if(['PROMPT','SUPPORT','ERROR'].includes(phase)){
    const task=session.task;const auditory=task.family==='sound_to_letter';const visual=task.family==='visual_match';
    if(auditory){const heard=session.heard.has(task.itemId);$('signal').textContent=busy?'♫':heard?'👇':'☟';button(prompt,'השמעת צליל השאלה','sound',()=>play(task.itemId),'target '+(busy?'listening':heard?'':'primary demo'),busy||phase==='ERROR');}
    else {const text=document.createElement('span');text.textContent=letters[task.itemId];text.setAttribute('aria-hidden','true');prompt.append(text);}
    const supported=phase==='SUPPORT';
    if(phase==='ERROR'){
      $('signal').textContent='↶';$('signal').classList.add('error');
      button(actions,'הדגמת תיקון וניסיון נוסף','retry',()=>{action(()=>session.correction());play(task.itemId);},'primary');
    }else{
      for(const [i,id] of task.options.entries()){
        if(auditory&&!session.heard.has(task.itemId))continue;
        const label=(auditory||visual)?`האות ${letters[id]}`:`השמעת אפשרות ${i+1}`;
        const b=button(choices,label,'sound',()=>{
          if(auditory||visual)action(()=>session.choose(id));
          else {if(!canAct())return;session.optionAudio(id);persist();play(id,()=>session.choose(id));}
        },session.selected===id?'selected':'',busy||(auditory&&!session.heard.has(task.itemId)));
        b.dataset.option=id;
        if(auditory||visual)b.textContent=letters[id];else b.innerHTML=icon('sound');
        if(supported&&id===task.itemId){b.style.borderColor='#efc97b';b.setAttribute('aria-label',label+' — הדגמת הפתרון');}
      }
      if(!auditory&&!visual)button(actions,'אישור בחירת הצליל','check',()=>action(()=>session.confirm()),'primary',busy||!session.selected);
      button(actions,supported?'השמעת העזרה שוב':'עזרה והדגמת הפתרון','help',()=>{if(!canAct())return;if(!supported)session.help();persist();play(task.itemId);},'hint',busy);
      if(supported)$('signal').textContent='◇';
    }
  }
  if(phase==='REST'){
    $('signal').textContent='↶';
    button(prompt,'פעילות התאמת צורות מוכרת','play',()=>action(()=>session.familiar()),'primary');
    button(actions,'סיום הפעילות','pause',()=>action(()=>session.dispose()));
  }
  if(phase==='SUCCESS'){
    $('signal').textContent='✓';$('signal').classList.add('success');
    const text=document.createElement('span');text.textContent=letters[session.task.itemId];prompt.append(text);
    const next=button(actions,'המשך לחיבור הבא','next',()=>action(()=>session.next()),'primary advance demo');next.insertAdjacentHTML('beforeend','<small>המשך</small>');
  }
  if(phase==='COMPLETE'){
    $('signal').textContent='✓';button(prompt,'הפעלת המכונה','power',()=>{
      $('machine').classList.remove('running');requestAnimationFrame(()=>$('machine').classList.add('running'));
    },'primary');
    const shop=document.createElement('div');shop.className='parts';choices.append(shop);
    for(const part of parts){const owned=session.rewards.state.owned.includes(part.id);const b=button(shop,`${part.id==='fan'?'מניפה':'זרוע מקפיצה'} — ${owned?'בבעלותך':'4 מטבעות'}`,part.id==='fan'?'motion':'retry',()=>action(()=>session.buyPart(part.id)),session.rewards.state.part===part.id?'selected':'',!owned&&session.rewards.state.coins<part.price);b.dataset.part=part.id;b.innerHTML=part.id==='fan'?'<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11"/><path d="M14 3V25M3 14H25M6 6L22 22M6 22L22 6"/></svg>':'<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23L21 8"/><circle cx="22" cy="6" r="4"/><circle cx="5" cy="23" r="3"/></svg>';b.insertAdjacentHTML('beforeend',`<small>${owned?'✓':'● ● ● ●'}</small>`);}
    button(actions,'המשך למכונה נוספת','next',()=>action(()=>session.continueRound()),'decision');
    button(actions,'סיום ושמירת ההתקדמות','finish',()=>action(()=>session.finish()),'decision');
  }
  if(phase==='FINISHED')button(actions,'חזרה לסדנה','play',()=>action(()=>session.reopen()),'primary');
  if(phase==='PAUSED')button(prompt,'חזרה לפעילות','play',()=>action(()=>session.resume()),'primary');
  if(phase==='STOPPED')$('signal').textContent='□';
  const warning=$('storage-warning'),recovery=$('recovery');recovery.replaceChildren();warning.hidden=!storage.problem;
  warning.textContent=storage.problem==='conflict'?'ההתקדמות השתנתה בלשונית אחרת. טענו את העותק האחרון.':storage.problem==='invalid'?'השמירה לא נקראה. אפשר לשחק זמנית; העותק הקודם נשמר.':storage.problem==='unavailable'?'השמירה אינה זמינה. ההתקדמות כרגע זמנית.':'';
  if(storage.problem==='conflict'){for(const b of document.querySelectorAll('button'))b.disabled=true;button(recovery,'טעינת ההתקדמות האחרונה','retry',()=>window.location.reload(),'primary');}
  if(storage.problem==='invalid')button(recovery,resetConfirm?'אישור איפוס שמירת הפיילוט בלבד':'התחלה מחדש — איפוס שמירת הפיילוט',resetConfirm?'check':'retry',()=>{if(!resetConfirm){resetConfirm=true;render();return;}if(storage.reset()){session=new MachineSession(spec);resetConfirm=false;persist();render();}});
  document.querySelector('footer span').textContent=storage.problem?'התקדמות זמנית / שמירה לא זמינה':'התקדמות נשמרת במכשיר';
  // Rendering is synchronous; preserve keyboard access after every transition.
  if(!busy)queueMicrotask(()=>{if(document.activeElement===document.body)(actions.querySelector('button:not(:disabled)')||prompt.querySelector('button:not(:disabled)')||choices.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});});
}
async function init(){
  const response=await fetch('./learning-model.spec.json');if(!response.ok)throw Error('spec');spec=await response.json();let local;try{local=window.localStorage;}catch{local={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');},removeItem(){throw Error('unavailable');}};}storage=new PilotStorage(local);const saved=storage.load();
  try{if(saved&&(Object.keys(saved).sort().join(',')!=='machine,prefs'||typeof saved.prefs?.reduced!=='boolean'))throw Error('prefs');session=new MachineSession(spec,{snapshot:saved?.machine});if(saved)reduced=saved.prefs.reduced;}catch{storage.invalidate();session=new MachineSession(spec);}
  player=new AudioPlayer({onProgress:p=>{const rail=$('audio-progress');if(rail)rail.style.width=`${p*100}%`;},onError:()=>{$('audio-error').hidden=false;}});
  $('pause').onclick=()=>action(()=>session.phase==='PAUSED'?session.resume():session.pause());
  $('motion').onclick=()=>action(()=>{reduced=!reduced;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearAudio();session.pause();persist();render();}});
  window.addEventListener('pagehide',()=>{clearAudio();persist();});window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null){storage.current();clearAudio();render();}});if(!saved)persist();render();
}
init().catch(()=>{$('signal').textContent='לא ניתן לטעון את הפעילות. רעננו כדי לנסות שוב.';});
