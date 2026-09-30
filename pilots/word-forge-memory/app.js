(() => {
  'use strict';
  const KEY='efn:wf-memory:pilot:v1';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>Number(n).toLocaleString('en-US');
  let stored=null, storageOK=true;
  try { stored=JSON.parse(localStorage.getItem(KEY)||'null'); } catch { storageOK=false; }
  const prefs={sound:stored?.prefs?.sound!==false,reduced:Boolean(stored?.prefs?.reduced),guideSeen:Boolean(stored?.prefs?.guideSeen)};
  let game;
  try { game=new MemoryForge.Game(ENGLISH_BASIC_COURSE,MEMORY_PLANS,stored?.game); }
  catch { game=new MemoryForge.Game(ENGLISH_BASIC_COURSE,MEMORY_PLANS); }
  if(!game.run)game.start(1,1);
  let timer=0, generation=0, speechGeneration=0, audio=null, oscillators=new Set(), paused=false, drawFrame=-1, lastSpoken='', stageTarget=null;
  let repair=null;
  const reduced=()=>prefs.reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colours=[['#75efbe','117,239,190'],['#e8e282','232,226,130'],['#ffcf68','255,207,104'],['#ffaa5e','255,170,94'],['#ff865c','255,134,92'],['#ff706e','255,112,110'],['#ff5e78','255,94,120']];
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify({prefs,game:game.snapshot()}));storageOK=true;}catch{storageOK=false;}
  }
  function stopAudio(){
    cancelSpeech();
    for(const o of oscillators)try{o.stop();}catch{}
    oscillators.clear();
    if(audio?.state==='running')audio.suspend().catch(()=>{});
  }
  function cancelSpeech(){speechGeneration++;EFN_SPEECH.cancel();}
  function speechStatus(message=''){
    $('#speechStatus').innerHTML=message?icon('mute')+`<span class="sr-only">${esc(message)}</span>`:'';$('#speechStatus').hidden=!message;
  }
  function stopMotion(){generation++;clearTimeout(timer);timer=0;drawFrame=-1;}
  function tone(notes=[440],duration=.10){
    if(!prefs.sound||document.hidden||paused)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      audio ||= new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
      notes.forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hz;
        const when=audio.currentTime+i*(duration+.025);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(.07,when+.008);g.gain.exponentialRampToValueAtTime(.0001,when+duration);
        o.connect(g);g.connect(audio.destination);oscillators.add(o);o.onended=()=>{oscillators.delete(o);o.disconnect();g.disconnect();};o.start(when);o.stop(when+duration+.02);});
    }catch{}
  }
  async function sayWord(index=game.run.challenge?.index??game.run.cursor,manual=false){
    if(!prefs.sound||document.hidden||paused||document.querySelector('dialog[open]')||(game.run.phase==='drawing'||game.run.phase==='summary'))return;
    cancelSpeech();const token=speechGeneration;
    if(!EFN_SPEECH.supported){speechStatus('אין קול זמין במכשיר. אפשר להמשיך לשחק ללא שמע.');return;}
    const word=game.items[index]?.word;if(!word)return;
    if(manual)EFN_SPEECH.prime();
    let result;
    try{result=await EFN_SPEECH.speak(word,{language:'en-US',rate:.8});}
    catch{result={ok:false,reason:'exception'};}
    if(token!==speechGeneration||document.hidden||paused)return;
    if(result.ok)speechStatus();
    else if(result.reason!=='cancelled')speechStatus('השמע לא הופעל. נסו שוב את כפתור ההשמעה או המשיכו ללא שמע.');
  }
  function icon(name,extra=''){
    const paths={play:'M9 5l11 7-11 7z',next:'M5 12h14M13 5l7 7-7 7',check:'M5 12l4 4L19 6',close:'M6 6l12 12M18 6L6 18',repeat:'M19 8a8 8 0 1 0 1 7M19 3v5h-5',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',sound:'M3 9h4l5-5v16l-5-5H3z M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',mute:'M3 9h4l5-5v16l-5-5H3z M17 9l5 6M22 9l-5 6',dice:'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01',shield:'M12 2l8 4v7c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',cards:'M7 6h13v15H7z M4 17H2V2h13v2 M11 13h5M13.5 10.5v5',lock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',grid:'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',flag:'M5 22V3M5 3h14l-3 5 3 5H5',warn:'M12 3L2 21h20z M12 9v5M12 17h.01'};
    return `<svg class="glyph ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.play}"/></svg>`;
  }
  function coins(value=10,pile=true){
    const count=pile?Math.min(9,Math.max(1,Math.ceil(value/16))):1;
    return `<span class="coin-pile${pile?'':' mini'}" aria-hidden="true">${Array.from({length:count},(_,i)=>`<i class="coin" style="--i:${i};--x:${(i%3)*18};--y:${Math.floor(i/3)*9}">★</i>`).join('')}</span>`;
  }
  function soundButton(index){return `<button class="word-sound" data-speak="${index}" aria-label="${prefs.sound?'לשמוע את המילה':'הפעלת שמע והשמעת המילה'}">${icon('sound')}</button>`;}
  function masked(index,resolve=false){
    const word=game.items[index].word.toLowerCase(),p=game.run.challenge?.plan||game.plan(index);
    return esc(word.slice(0,p.start))+`<span class="${resolve?'resolved':'missing'}">${resolve?esc(p.correct):'_'.repeat(p.length)}</span>`+esc(word.slice(p.start+p.length));
  }
  function cards(count,cap,selected=-1){
    return `<div class="cards" aria-label="${count} מילים ברצף מתוך ${cap}">${Array.from({length:cap},(_,i)=>`<span class="memory-card${i<count?' filled':''}${i===selected?' active':''}" data-card="${i}" aria-hidden="true">${i<count?'◆':i===count?'+':'·'}</span>`).join('')}</div>`;
  }
  function hud(){
    const r=game.run;
    return `<div class="hud"><div class="score" aria-label="${r.score} נקודות בשלב">${coins(10,false)}<strong id="scoreValue">${number(r.score)}</strong><span class="bank" aria-label="${game.s.bank} נקודות מוגנות משלבים שהושלמו">${icon('lock')} ${number(game.s.bank)}</span></div><div class="learning" role="progressbar" aria-label="מילים שנענו נכון" aria-valuemin="0" aria-valuemax="${game.items.length}" aria-valuenow="${r.passed.length}"><span class="progress-dots" aria-hidden="true">${game.items.map((_,i)=>`<i class="${r.passed.includes(i)?'done':''}"></i>`).join('')}</span><b>${r.passed.length}<small>/${game.items.length}</small></b></div></div>`;
  }
  function notices(){return !storageOK?`<p class="toast" role="status">${icon('warn')}<span class="sr-only">השמירה המקומית אינה זמינה. אפשר לשחק, אך סגירה או רענון עלולים למחוק את ההתקדמות.</span></p>`:'';}
  function terms(prize,loss){return `<span class="payoff" aria-hidden="true"><span class="win">✓ <b>+${prize}</b></span><span class="loss">× <b>${loss?'−'+loss:'0'}</b></span></span>`;}
  function learn(){
    const r=game.run,item=game.items[r.cursor],risk=game.risk(),n=r.pending.length;
    const tutorial=game.cap===1,currentPrize=n?risk.prize:10,nextPrize=MemoryForge.reward(n+1);
    const nextLoss=tutorial?0:Math.min(r.score,Math.ceil(nextPrize/2)),lift=nextPrize-currentPrize;
    const willDraw=n+1===game.cap||r.cursor+1===game.items.length||game.atSoundFamilyEnd(r.cursor+1);
    const testLabel=n?`לנסות מילה מתוך ${n} המילים ששמרתם. פרס אפשרי ${currentPrize}; הפחתה בטעות ${risk.loss}. המילה שעל המסך תחכה.`:'לנסות את המילה שעל המסך. תשובה נכונה: 10 נקודות; טעות: ללא הפחתה.';
    const deferLabel=`להוסיף את המילה שעל המסך לרצף. ${willDraw?'שאלה מתחילה עכשיו':'ממשיכים למילה הבאה'}. פרס אפשרי ${nextPrize}; הפחתה בטעות ${nextLoss}.${!n&&!willDraw?' שמירת מילה נוספת בהמשך תאפשר פרס של 25.':''}`;
    return `<section class="arena"><div class="arena-top"><span class="mode" aria-label="מכירים את המילה">${icon('eye')}</span><span class="sequence">${r.cursor+1}<small>/${game.items.length}</small></span></div>
      <div class="word-surface"><p class="case-pair" lang="en" dir="ltr">${esc(item.word.toUpperCase())}</p><h1 class="word" lang="en">${esc(item.word.toLowerCase())}</h1><p class="translation">${esc(item.translation)}</p>${soundButton(r.cursor)}</div>
      <div class="risk-tray">${tutorial?'':cards(n,game.cap)}
      <div class="actions${tutorial?' single-action':''}"><button class="action cash-action" data-action="test" aria-label="${testLabel}"><span class="action-symbol">${icon(tutorial||risk.loss?'play':'shield')}</span>${coins(currentPrize)}<strong class="reward" dir="ltr">+${currentPrize}</strong>${terms(currentPrize,n?risk.loss:0)}<span class="action-path" aria-hidden="true">${n?icon('cards'):icon('eye')}${icon('next')}${icon('check')}</span></button>
      ${tutorial?'':`<button class="action risk-action defer-action" data-action="defer" aria-label="${deferLabel}"><span class="action-symbol">${icon('dice')}</span>${coins(nextPrize)}<strong class="reward" dir="ltr">${nextPrize}${!n&&!willDraw?`<span class="future-prize">→${MemoryForge.reward(2)}</span>`:''}</strong>${lift>0?`<span class="prize-lift" aria-label="תוספת של ${lift} לפרס האפשרי">+${lift}</span>`:''}${terms(nextPrize,nextLoss)}<span class="action-path" aria-hidden="true">${icon('cards')}<b>+</b>${icon('next')}${icon(willDraw?'dice':'eye')}</span></button>`}</div></div></section>`;
  }
  function drawing(){
    const c=game.run.challenge;
    return `<section class="arena drawing"><div class="word-surface"><span class="draw-dice">${icon('dice')}</span>${coins(c.prize)}<div class="draw-prize" dir="ltr">+${c.prize}</div>${terms(c.prize,c.loss)}</div><div class="risk-tray">${cards(c.pool.length,c.pool.length,drawFrame)}</div></section>`;
  }
  function challenge(){
    const c=game.run.challenge,item=game.items[c.index],review=['review','spacing'].includes(c.origin);
    return `<section class="arena"><div class="arena-top"><span class="mode" aria-label="${review?'חיזוק זיכרון':'השלימו את המילה'}">${icon(review?'repeat':c.origin==='risk'?'dice':'play')}</span>${terms(c.prize,c.loss)}</div>
      <div class="word-surface"><h1 class="word" lang="en" aria-label="${c.hinted?'המילה המלאה':'השלימו את החסר'}">${masked(c.index,c.hinted)}</h1><p class="translation">${esc(item.translation)}</p>${soundButton(c.index)}</div>
      <div class="tap-cue" aria-hidden="true">👇</div><div class="choices" role="group" aria-label="בחרו את ההשלמה">${c.options.map(o=>`<button class="choice" data-answer="${esc(o)}" lang="en" aria-label="${c.plan.kind==='chunk'?'הצירוף':'האות'} ${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="challenge-footer">${!c.hinted?`<button class="hint" data-action="hint" aria-label="הצגת המילה לעזרה; התרגול יהיה ללא נקודות">${icon('eye')}${coins(0,false)}<b>0</b></button>`:`<span class="assisted" aria-label="המילה מוצגת לעזרה; ללא נקודות">${icon('eye')} ${coins(0,false)} 0</span>`}</div></section>`;
  }
  function feedback(){
    const f=game.run.feedback,item=game.items[f.index],practice=!f.independent,fixing=repair?.index===f.index;
    return `<section class="arena feedback ${practice?'retry':'success'}"><div class="word-surface"><div class="result-sign${practice?' miss':''}" aria-label="${fixing&&repair.done?'התרגול הושלם':practice?'תרגול נוסף':'תשובה נכונה'}">${icon(practice&&!repair?.done?'repeat':'check')}</div><h1 class="word" lang="en">${masked(f.index,true)}</h1><p class="translation">${esc(item.translation)}</p>${!fixing?`<div class="result-delta${f.delta<0?' negative':''}" aria-label="שינוי של ${f.delta} נקודות">${coins(Math.abs(f.delta))}<b dir="ltr">${f.delta>0?'+':''}${f.delta}</b></div>`:''}</div>
      ${fixing&&!repair.done?`<div class="repair-panel"><p class="repair-word" dir="ltr" lang="en">${masked(f.index)}</p><div class="choices" role="group" aria-label="תרגול התיקון ללא נקודות">${game.run.challenge.options.map(o=>`<button class="choice" data-repair-answer="${esc(o)}" ${repair.wrong.includes(o)?'disabled':''} lang="en">${esc(o)}</button>`).join('')}</div></div>`:''}
      <div class="feedback-actions">${practice&&!fixing?`<button class="action repair-action" data-action="repair" aria-label="לנסות את התיקון שוב, בלי שינוי בנקודות">${icon('repeat')}${coins(0,false)}<b>0</b></button>`:''}<button class="action ${practice&&(!fixing||!repair.done)?'secondary':'primary'}" data-action="next" aria-label="ממשיכים למילה הבאה">${icon('next')}</button>${soundButton(f.index)}</div></section>`;
  }
  function summary(){
    const r=game.run,last=game.s.level===5&&game.s.lesson===10;
    return `<section class="arena summary"><div class="word-surface"><span class="trophy" aria-hidden="true">🏆</span><div class="summary-count" aria-label="${r.passed.length} מילים נענו נכון">${icon('check')} ${r.passed.length}/${game.items.length}</div><div class="result-delta">${coins(r.score)}<b>+${number(r.score)}</b></div></div><div class="feedback-actions"><button class="action primary" data-action="${last?'stages':'nextStage'}" aria-label="${last?'בחירת שלב':'לשלב הבא'}">${icon(last?'grid':'next')}</button><button class="action secondary" data-action="replay" aria-label="לשחק שוב בשלב הזה">${icon('repeat')}</button></div></section>`;
  }
  function render(focus=false){
    save();
    const r=game.run,n=r.challenge?.origin==='risk'?r.challenge.pool.length:r.pending.length;
    const [hex,rgb]=colours[Math.min(6,n)];
    document.documentElement.style.setProperty('--heat',hex);document.documentElement.style.setProperty('--hot-rgb',rgb);
    document.body.classList.toggle('reduced',prefs.reduced);
    $('#sound').setAttribute('aria-pressed',String(prefs.sound));$('#sound').setAttribute('aria-label',prefs.sound?'כיבוי שמע':'הפעלת שמע');$('#sound').innerHTML=icon(prefs.sound?'sound':'mute');
    $('#motion').checked=prefs.reduced;
    $('#stages').innerHTML=icon('grid')+`<b>${(game.s.level-1)*10+game.s.lesson}</b>`;$('#stages').setAttribute('aria-label',`בחירת שלב. רמה ${game.s.level}, שלב ${game.s.lesson}`);
    $('#focusText').textContent=ENGLISH_BASIC_COURSE.levels[game.s.level-1].lessons[game.s.lesson-1].focus;
    $('#capLabel').innerHTML=icon('cards')+`<b>${game.cap}</b>`;$('#capLabel').setAttribute('aria-label',`עד ${game.cap} מילים ברצף`);
    const views={learn,drawing,challenge,feedback,summary};
    $('#main').innerHTML=notices()+hud()+(paused?`<div class="pause-strip"><button data-action="resume" aria-label="המשך המשחק">${icon('play')}</button></div>`:'')+views[r.phase]();
    if(paused)$('#main').querySelectorAll('button:not([data-action="resume"])').forEach(b=>b.disabled=true);
    if(focus){
      $('#main').focus({preventScroll:true});
      if($('#main').getBoundingClientRect().top<0)$('#main').scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  function announce(){
    const r=game.run;
    if(r.phase==='feedback')$('#announce').textContent=`${r.feedback.correct?'נכון':'הפעם לא'}. ${r.feedback.delta} נקודות. ${game.items[r.feedback.index].word}`;
    else if(r.phase==='drawing')$('#announce').textContent=`בוחרים מילה אחת מתוך ${r.challenge.pool.length}. פרס ${r.challenge.prize} נקודות.`;
    else if(r.phase==='challenge')$('#announce').textContent='השלימו את המילה. אין הגבלת זמן.';
  }
  function beginDraw(){
    stopMotion();
    if(game.run.phase!=='drawing'||paused||document.hidden)return;
    const token=generation,c=game.run.challenge,n=c.pool.length,chosen=c.pool.indexOf(c.index);
    if(reduced()){game.finishDraw();render(true);announce();return;}
    let step=0;
    const total=n+7;
    function frame(){
      if(token!==generation||paused||document.hidden)return;
      drawFrame=step===total-1?chosen:step%n;
      document.querySelectorAll('[data-card]').forEach(el=>el.classList.toggle('active',Number(el.dataset.card)===drawFrame));
      tone([350+drawFrame*65],.04);step++;
      if(step>=total){timer=setTimeout(()=>{if(token!==generation||paused||document.hidden)return;game.finishDraw();render(true);announce();},270);}
      else timer=setTimeout(frame,step>total-4?135:65);
    }
    timer=setTimeout(frame,180);
  }
  function afterAction(oldPhase){
    render(oldPhase!==game.run.phase||game.run.phase==='learn');announce();
    if(game.run.phase==='drawing')beginDraw();
    else if(game.run.phase==='learn'&&!paused){
      const id=`${game.key}:${game.run.cursor}:${game.run.rounds}`;
      if(id!==lastSpoken){lastSpoken=id;sayWord(game.run.cursor);}
    }
  }
  function openDialog(el){stopMotion();stopAudio();el.showModal();el.querySelector('[data-close]')?.focus();}
  function closeDialog(el){el.close();if(game.run.phase==='drawing'){render();beginDraw();}}
  function showStages(){
    stageTarget=null;$('#stageConfirm').hidden=true;$('#stageOptions').hidden=false;
    $('#stageOptions').innerHTML=ENGLISH_BASIC_COURSE.levels.map((level,l)=>`<h3 class="level-label" aria-label="רמה ${l+1}: ${esc(level.name)}">${'◆'.repeat(l+1)}</h3><div class="level-grid">${level.lessons.map((lesson,i)=>`<button data-stage="${l+1}-${i+1}" class="${game.s.completed.includes(`${l+1}-${i+1}`)?'complete ':''}${game.s.level===l+1&&game.s.lesson===i+1?'current':''}" aria-label="רמה ${l+1}, שלב ${i+1}: ${esc(lesson.focus)}. תקרת רצף ${MemoryForge.capFor(l+1,i+1)}">${i+1}</button>`).join('')}</div>`).join('');
    openDialog($('#stageDialog'));
  }
  $('#main').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.speak!==undefined){if(!prefs.sound){prefs.sound=true;render();}sayWord(Number(b.dataset.speak),true);return;}
    const old=game.run.phase,action=b.dataset.action;
    if(action==='resume'){paused=false;render();if(game.run.phase==='drawing')beginDraw();return;}
    if(paused)return;
    stopMotion();cancelSpeech();
    if(action==='repair'){repair={index:game.run.feedback.index,done:false,wrong:[]};render(true);return;}
    if(b.dataset.repairAnswer!==undefined){
      if(!repair||game.run.phase!=='feedback')return;
      if(b.dataset.repairAnswer===game.run.challenge.plan.correct){repair.done=true;tone([523,659]);}
      else repair.wrong.push(b.dataset.repairAnswer);
      render(true);$('#announce').textContent=repair.done?'יפה! השלמנו יחד.':'ננסה שוב בעזרת המילה שלמעלה.';return;
    }
    if(b.dataset.answer!==undefined){
      if(game.answer(b.dataset.answer)){tone(game.run.feedback.correct?[523,659,784]:[330,262],.11);afterAction(old);}return;
    }
    if(action==='defer'){if(game.defer())tone([360+game.run.pending.length*75],.075);}
    else if(action==='test')game.challengeNow();
    else if(action==='next'){repair=null;game.next();}
    else if(action==='hint')game.hint();
    else if(action==='nextStage'){const l=game.s.level,s=game.s.lesson;game.start(s===10?l+1:l,s===10?1:s+1);}
    else if(action==='replay')game.start(game.s.level,game.s.lesson);
    else if(action==='stages'){showStages();return;}
    afterAction(old);
  });
  $('#sound').addEventListener('click',()=>{prefs.sound=!prefs.sound;stopAudio();speechStatus();render();if(prefs.sound)sayWord(undefined,true);});
  $('#help').addEventListener('click',()=>openDialog($('#helpDialog')));
  $('#stages').addEventListener('click',showStages);
  $('#motion').addEventListener('change',e=>{prefs.reduced=e.target.checked;render();});
  for(const d of document.querySelectorAll('dialog')){
    d.querySelector('[data-close]').addEventListener('click',()=>closeDialog(d));
    d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);});
  }
  function changeStage(l,s){stopMotion();stopAudio();repair=null;game.start(l,s);paused=false;stageTarget=null;$('#stageDialog').close();render(true);}
  $('#stageOptions').addEventListener('click',e=>{
    const b=e.target.closest('[data-stage]');if(!b)return;const [l,s]=b.dataset.stage.split('-').map(Number);
    if(l===game.s.level&&s===game.s.lesson){closeDialog($('#stageDialog'));return;}
    if(game.run.phase!=='summary'&&(game.run.cursor>0||game.run.phase!=='learn')){
      stageTarget=[l,s];$('#stageOptions').hidden=true;$('#stageConfirm').hidden=false;
      $('#stageConfirmText').innerHTML=`${coins(10,false)} <b dir="ltr">${number(game.run.score)} → 0</b>`;$('#stageConfirmText').setAttribute('aria-label',`מעבר שלב מאפס את ${game.run.score} נקודות השלב הנוכחי. נקודות משלבים שהושלמו נשמרות.`);
      $('#keepStage').focus();return;
    }
    changeStage(l,s);
  });
  $('#keepStage').addEventListener('click',()=>{stageTarget=null;closeDialog($('#stageDialog'));});
  $('#changeStage').addEventListener('click',()=>{if(stageTarget)changeStage(...stageTarget);});
  function pause(){stopMotion();stopAudio();paused=true;save();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else render();});
  window.addEventListener('pagehide',pause);document.addEventListener('freeze',pause);
  window.addEventListener('pageshow',e=>{if(e.persisted){paused=true;render();}});
  document.addEventListener('keydown',e=>{
    if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||paused)return;
    if(game.run.phase==='challenge'&&/^[1-4]$/.test(e.key)){
      const b=$('#main').querySelectorAll('[data-answer]')[Number(e.key)-1];if(b){e.preventDefault();b.click();}
    }
  });
  if(game.run.phase==='drawing')paused=true;
  render();
})();
