import {setupComplexDemo} from './complex-demo.mjs';
import {MachineSession,letters} from './session-controller.mjs';
import {AudioPlayer} from './audio-player.mjs';
import {PilotStorage,STORAGE_KEY} from './storage.mjs';
import {parts} from './rewards.mjs';
const $=id=>document.getElementById(id);
const shapes={sound:'M11 5L5 10H2V18H5L11 23ZM16 8Q24 14 16 20M15 12Q18 14 15 16',next:'M8 4L20 14L8 24',help:'M7 5Q2 10 8 15L18 25L23 20L13 10Q16 3 10 2L11 7L7 9Z',pause:'M8 4V24M20 4V24',play:'M8 4L23 14L8 24Z',motion:'M3 9H17M3 15H12M15 4L25 14L15 24',check:'M3 14L10 21L25 5',retry:'M6 7Q24 0 24 15Q24 26 8 24M6 2V10H14',finish:'M6 6H22V22H6ZM10 10H18V18H10Z',power:'M14 2V14M7 6Q-1 13 6 22Q14 30 23 22Q30 13 21 6'};
function icon(name){return `<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><path d="${shapes[name]}"/></svg>`;}
let storage,spec,resetConfirm=false,teachReady=null,goalReady=false;let session,player,epoch=0,busy=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function button(host,label,name,act,cls='',disabled=false){const b=document.createElement('button');b.setAttribute('aria-label',label);b.title=label;b.className=cls;b.disabled=disabled;b.innerHTML=icon(name);b.addEventListener('click',act);host.append(b);return b;}
// Meaning is taught in a reward demonstration, never inferred from a tap.
function matPicture(){return `<svg class="mat-picture" viewBox="0 0 300 145" role="img" aria-label="שטיחון ארוג עם פסים וגדילים"><rect x="16" y="7" width="268" height="128" rx="18" fill="#203d4a"/><path d="M48 115L242 115L268 39L72 39Z" fill="#be8942"/><path d="M61 101L232 101L249 50L80 50Z" fill="#f1cb7f"/><path d="M74 89L238 89M79 76L242 76M83 63L246 63" stroke="#3f8e81" stroke-width="7"/><path d="M48 115L43 127M62 115L57 127M76 115L71 127M90 115L85 127M104 115L99 127M118 115L113 127M132 115L127 127M146 115L141 127M160 115L155 127M174 115L169 127M188 115L183 127M202 115L197 127M216 115L211 127M230 115L225 127M72 39L76 28M86 39L90 28M100 39L104 28M114 39L118 28M128 39L132 28M142 39L146 28M156 39L160 28M170 39L174 28M184 39L188 28M198 39L202 28M212 39L216 28M226 39L230 28M240 39L244 28M254 39L258 28" stroke="#f1cb7f" stroke-width="4" stroke-linecap="round"/></svg>`;}
function satPicture(){return `<svg class="mat-picture sat-picture" viewBox="0 0 300 145" role="img" aria-label="לפני ואחרי: אדם עמד, ואחר כך ישב על כיסא"><rect x="4" y="7" width="126" height="128" rx="18" fill="#203d4a"/><rect x="170" y="7" width="126" height="128" rx="18" fill="#203d4a"/><g stroke="#f1cb7f" stroke-width="7" stroke-linecap="round" fill="none"><path d="M88 53V88H62M65 88V118M88 88V118M263 53V88H222M225 88V118M263 88V118"/></g><g stroke="#75e2c5" stroke-width="9" stroke-linecap="round" fill="none"><circle cx="44" cy="31" r="11" fill="#75e2c5"/><path d="M44 51V82M44 60L62 69M44 82L32 116M44 82L55 116"/><circle cx="237" cy="39" r="11" fill="#75e2c5"/><path d="M237 59V80H214V111H205M237 68L213 69"/></g><path d="M139 70H158M151 62L159 70L151 78" fill="none" stroke="#f1cb7f" stroke-width="4" stroke-linecap="round"/></svg>`;}
function goalPicture(){return session.wordGoal().text==='sat'?satPicture():matPicture();}
function listenGoal(){if(!session.goalAudioAllowed())return;goalReady=false;play(session.wordGoal().id,()=>{session.goalHeard();goalReady=true;});}
function rewardPlay(id){if(session.rewardAudioAllowed(id))play(id,()=>session.rewardHeard(id));}
function rewardCard(host){
  const card=document.createElement('div');card.className='word-reward';const goal=session.wordGoal();card.innerHTML=goalPicture()+`<div class="meaning" lang="he" dir="rtl">${goal.meaning}</div>`;host.append(card);
  const word=button(card,`השמעת המילה ${goal.text} — ${goal.meaning}`,'sound',()=>rewardPlay(goal.id),'primary word-audio demo '+(busy?'listening':''),busy);
  word.innerHTML=`<span lang="en" dir="ltr">${goal.text}</span> `+icon('sound')+'<small dir="rtl">השמעת המילה</small>';
  const sounds=document.createElement('div');sounds.className='word-sounds';card.append(sounds);
  for(const id of goal.parts){const b=button(sounds,`השמעת צליל ${letters[id]} במילה ${goal.text}`,'sound',()=>rewardPlay(id),'',busy);b.innerHTML=`<span>${letters[id]}</span> ${icon('sound')}`;}
}
function renderWordGoal(phase){
  const goal=$('word-goal');goal.replaceChildren();goal.hidden=['PAUSED','STOPPED'].includes(phase);
  if(goal.hidden)return;
  const slots=document.createElement('div');slots.className='word-slots';slots.dir='ltr';slots.setAttribute('aria-label','בונים מילה מצלילים');
  for(const [i,id] of session.wordGoal().parts.entries()){const earned=session.connections>=['RZ-G-M','RZ-G-S','RZ-G-A-AE','RZ-G-T'].indexOf(id)+1;const tile=document.createElement('span');tile.className=earned?'earned':'';tile.textContent=earned&&['TEACH','SUCCESS','COMPLETE','FINISHED'].includes(phase)?letters[id]:'·';slots.append(tile);}
  const caption=document.createElement('span');caption.className='goal-caption';caption.innerHTML=goalPicture()+'<small>בונים מילה</small>';if(session.goalAudioAllowed()){const replay=button(goal,'השמעת מילת היעד בלי כתיב','sound',listenGoal,'goal-replay',busy);replay.insertAdjacentHTML('beforeend','<small>המטרה</small>');}goal.append(caption,slots);
}
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
  const phase=session.phase;renderWordGoal(phase);document.body.classList.toggle('word-built',session.rewardWordAvailable());document.body.classList.toggle('paused',phase==='PAUSED');document.body.classList.toggle('reduced',reduced);
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
    $('signal').textContent=busy?'♫':goalReady?'✓':'☟';
    const picture=document.createElement('div');picture.className='goal-preview';picture.innerHTML=goalPicture()+`<div class="meaning" dir="rtl">${session.wordGoal().meaning}</div>`;prompt.append(picture);
    const hear=button(prompt,'התחלת הדגמת מגע וצליל','sound',listenGoal,'primary target demo',busy);hear.innerHTML=icon('sound')+'<small>הקשיבו למילה</small>';
    if(goalReady&&!busy){const start=button(actions,'בניית המילה ששמעת','next',()=>{action(()=>session.start());if(session.phase==='TEACH')play(session.teachingItem(),()=>{teachReady=session.teachingItem();});},'primary advance demo');start.insertAdjacentHTML('beforeend','<small>בואו נבנה</small>');}
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
    $('signal').textContent=session.rewardWordAvailable()?'✓ בנית מילה!':'✓ חיבור נוסף!';$('signal').classList.add('success');
    if(session.rewardWordAvailable())rewardCard(prompt);
    else {const id=session.task.itemId;const tile=button(prompt,`השמעת הצליל שהצלחת לחבר: ${letters[id]}`,'sound',()=>rewardPlay(id),'target',busy);tile.innerHTML=`<span>${letters[id]}</span> ${icon('sound')}`;}
    const prize=document.createElement('span');prize.className='earned-prize';prize.textContent=`+${session.rewards.state.settled[session.lastEvent.id]} ●`;prize.setAttribute('aria-label','מטבעות שקיבלת על החיבור');prompt.append(prize);
    const next=button(actions,'המשך לחיבור הבא','next',()=>action(()=>session.next()),'primary advance demo',busy);next.insertAdjacentHTML('beforeend','<small>המשך</small>');
  }
  if(phase==='COMPLETE'){
    $('signal').textContent='✓ בנית מילה!';rewardCard(prompt);button(actions,'הפעלת המכונה','power',()=>{
      $('machine').classList.remove('running');requestAnimationFrame(()=>$('machine').classList.add('running'));
    },'decision').insertAdjacentHTML('beforeend','<small>המכונה</small>');
    const shop=document.createElement('div');shop.className='parts';choices.append(shop);
    for(const part of parts){const owned=session.rewards.state.owned.includes(part.id);const b=button(shop,`${part.id==='fan'?'מניפה':'זרוע מקפיצה'} — ${owned?'בבעלותך':'4 מטבעות'}`,part.id==='fan'?'motion':'retry',()=>action(()=>session.buyPart(part.id)),session.rewards.state.part===part.id?'selected':'',!owned&&session.rewards.state.coins<part.price);b.dataset.part=part.id;b.innerHTML=part.id==='fan'?'<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11"/><path d="M14 3V25M3 14H25M6 6L22 22M6 22L22 6"/></svg>':'<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23L21 8"/><circle cx="22" cy="6" r="4"/><circle cx="5" cy="23" r="3"/></svg>';b.insertAdjacentHTML('beforeend',`<small>${owned?'✓':'● ● ● ●'}</small>`);}
    button(actions,'המשך למכונה נוספת','next',()=>action(()=>{goalReady=false;session.continueRound();}),'decision').insertAdjacentHTML('beforeend','<small>עוד סבב</small>');
    button(actions,'סיום ושמירת ההתקדמות','finish',()=>action(()=>session.finish()),'decision').insertAdjacentHTML('beforeend','<small>סיום</small>');
  }
  if(phase==='FINISHED'){rewardCard(prompt);button(actions,'חזרה לסדנה','play',()=>action(()=>session.reopen()),'primary');}
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
  window.addEventListener('pagehide',()=>{clearAudio();persist();});window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null){storage.current();clearAudio();render();}});if(session.rewardWordShown()||!saved)persist();render();
  setupComplexDemo({beforeOpen:()=>{clearAudio();session.pause();persist();},afterClose:()=>render()});
}
init().catch(()=>{$('signal').textContent='לא ניתן לטעון את הפעילות. רעננו כדי לנסות שוב.';});
