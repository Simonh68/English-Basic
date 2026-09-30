(() => {
  'use strict';
  const KEY='efn:wf-memory:pilot:v1';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>Number(n).toLocaleString('en-US');
  let stored=null, storageOK=true;
  try { stored=JSON.parse(localStorage.getItem(KEY)||'null'); } catch { storageOK=false; }
  const prefs={sound:stored?.prefs?.sound!==false,reduced:Boolean(stored?.prefs?.reduced)};
  let game;
  try { game=new MemoryForge.Game(ENGLISH_BASIC_COURSE,MEMORY_PLANS,stored?.game); }
  catch { game=new MemoryForge.Game(ENGLISH_BASIC_COURSE,MEMORY_PLANS); }
  if(!game.run)game.start(1,1);
  let timer=0, generation=0, speechGeneration=0, audio=null, oscillators=new Set(), paused=false, drawFrame=-1, lastSpoken='', stageTarget=null;
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
    $('#speechStatus').textContent=message;$('#speechStatus').hidden=!message;
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
    if(!prefs.sound||document.hidden||paused||document.querySelector('dialog[open]')||game.run.phase==='drawing'||game.run.phase==='summary')return;
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
  function soundButton(index){return `<button class="word-sound" data-speak="${index}"><span class="equalizer" aria-hidden="true"><i></i><i></i><i></i></span>${prefs.sound?'לשמוע את המילה':'הפעלת שמע'}</button>`;}
  function masked(index,resolve=false){
    const word=game.items[index].word.toLowerCase(),p=game.run.challenge?.plan||game.plan(index);
    return esc(word.slice(0,p.start))+`<span class="${resolve?'resolved':'missing'}">${resolve?esc(p.correct):'_'.repeat(p.length)}</span>`+esc(word.slice(p.start+p.length));
  }
  function cards(count,cap,selected=-1){
    return `<div class="cards" aria-label="${count} מילים ברצף מתוך ${cap}">${Array.from({length:cap},(_,i)=>`<span class="memory-card${i<count?' filled':''}${i===selected?' active':''}" data-card="${i}" aria-hidden="true">${i<count?i+1:'·'}</span>`).join('')}</div>`;
  }
  function hud(){
    const r=game.run,spaced=game.items.filter((_,i)=>game.stat(i).spaced).length;
    return `<div class="hud"><div class="score"><span class="score-icon" aria-hidden="true">◈</span><div><span class="metric-label">נקודות בשלב</span><strong class="metric-value" id="scoreValue">${number(r.score)}</strong><span class="bank">נשמרו משלבים שהושלמו: ${number(game.s.bank)}</span></div></div><div class="learning"><div class="learning-label">מילים שנענו נכון <b>${r.passed.length} / ${game.items.length}</b></div><div class="progress" role="progressbar" aria-label="מילים שנענו נכון" aria-valuemin="0" aria-valuemax="${game.items.length}" aria-valuenow="${r.passed.length}"><i style="width:${r.passed.length/game.items.length*100}%"></i></div><span class="bank">${spaced} עם שתי הצלחות מרווחות</span></div></div>`;
  }
  function notices(){
    return (!storageOK?'<p class="toast" role="status">השמירה המקומית אינה זמינה. אפשר לשחק, אך סגירה או רענון עלולים למחוק את ההתקדמות.</p>':'')+
      (game.run.missesInRow>=2&&game.run.phase==='learn'?'<p class="toast">ניקח רגע לזכור: אפשר להאזין שוב ולבחור רצף קצר יותר.</p>':'');
  }
  function learn(){
    const r=game.run,item=game.items[r.cursor],risk=game.risk(),n=r.pending.length;
    const currentPrize=n?risk.prize:10,currentLoss=n?risk.loss:0;
    const nextPrize=MemoryForge.reward(n+1),tutorial=game.s.level===1&&game.s.lesson===1;
    const nextLoss=tutorial?0:Math.min(r.score,Math.ceil(nextPrize/2));
    const lift=nextPrize-currentPrize;
    return `<section class="arena"><div class="arena-top"><span class="mode">${item.kind==='transfer'?'מיישמים במילה חדשה':'לומדים ושומרים בזיכרון'}</span><span class="sequence">מילה ${r.cursor+1} / ${game.items.length}</span></div>
      <div class="word-surface"><p class="eyebrow">מסתכלים. מקשיבים. זוכרים.</p><p class="case-pair" lang="en" dir="ltr">${esc(item.word.toUpperCase())}</p><h1 class="word" lang="en">${esc(item.word.toLowerCase())}</h1><p class="translation">${esc(item.translation)}</p>${soundButton(r.cursor)}</div>
      <div class="risk-tray"><div class="tray-top"><p>הרצף שלכם <b>${n} / ${game.cap}</b></p><span class="multiplier">${n?`×${(1.25**(n-1)).toFixed(2)}`:'READY'}</span></div>${cards(n,game.cap)}
      <div class="odds"><span>נכון <strong dir="ltr">+${currentPrize}</strong></span><span class="lose">בטעות <strong dir="ltr">${currentLoss?`−${currentLoss}`:'0'}</strong></span></div>
      <div class="actions"><button class="action primary" data-action="test"><strong>${n?'לאתגר את הרצף':'לבחינה עכשיו'}</strong><span>${n?`מילה אחת מתוך ${n} ששמרתם`:'מילה אחת · 10 נקודות'}</span></button>
      <button class="action secondary defer-action" data-action="defer"><strong>${n?'לשמור עוד מילה':'לשמור לרצף'}</strong><span>${n+1===game.cap||r.cursor+1===game.items.length||game.atSoundFamilyEnd(r.cursor+1)?'ואז לאתגר':'ולהמשיך למילה הבאה'} · פרס אפשרי ${nextPrize}</span>${lift>0?`<em>+${lift} לפרס האפשרי</em>`:!tutorial?'<em>פותחים אפשרות לבונוס גדול יותר</em>':''}</button></div>
      <p class="microcopy">${n?`המילה שעל המסך מצטרפת רק בלחיצה על „לשמור עוד מילה”.` : tutorial?'שלב היכרות: שומרים מילה אחת ונבחנים. אין הפחתת נקודות.':'הנקודות מתקבלות אחרי תשובה נכונה. אפשר לעצור בכל רצף.'}</p>
      ${n&&!tutorial?`<p class="microcopy">אחרי שמירה נוספת: פרס ${nextPrize} · בטעות יורדות עד ${nextLoss}</p>`:''}</div></section>`;
  }
  function drawing(){
    const c=game.run.challenge;
    return `<section class="arena"><div class="arena-top"><span class="mode">${c.pool.length} מילים. שאלה אחת.</span><span class="sequence">בחירה אקראית</span></div><div class="word-surface drawing"><h1>איזו מילה תיבחר?</h1><p>הפרס של הרצף</p><div class="draw-prize">+${c.prize}</div></div><div class="risk-tray">${cards(c.pool.length,c.pool.length,drawFrame)}<p class="microcopy">לכל מילה ברצף סיכוי שווה.</p></div></section>`;
  }
  function challenge(){
    const c=game.run.challenge,item=game.items[c.index],review=['review','spacing'].includes(c.origin);
    return `<section class="arena"><div class="arena-top"><span class="mode">${review?'חיזוק זיכרון':c.origin==='risk'?'האתגר שלכם':'בחינה קצרה'}</span><span class="sequence">${review?'ללא הפחתת נקודות':'ללא הגבלת זמן'}</span></div>
      <div class="word-surface"><p class="eyebrow">${c.plan.kind==='chunk'?'איזה צירוף חסר?':'איזו אות חסרה?'}</p><h1 class="word" lang="en" aria-label="${c.hinted?'המילה המלאה':'השלימו את החסר'}">${masked(c.index,c.hinted)}</h1><p class="translation">${esc(item.translation)}</p>${soundButton(c.index)}</div>
      <div class="choices" role="group" aria-label="בחרו את ההשלמה">${c.options.map(o=>`<button class="choice" data-answer="${esc(o)}" lang="en" aria-label="${c.plan.kind==='chunk'?'הצירוף':'האות'} ${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="challenge-footer">${!c.hinted?'<button class="hint" data-action="hint">הצגת המילה · תרגול ללא נקודות</button>':'<span class="microcopy">המילה מוצגת לעזרה. נחזור אליה בהמשך.</span>'}</div>
      <div class="challenge-terms"><span>נכון <b dir="ltr">+${c.prize}</b></span><span>בטעות <b dir="ltr">${c.loss?`−${c.loss}`:'0'}</b></span>${c.origin==='risk'?`<span>רצף של ${c.pool.length}</span>`:''}</div></section>`;
  }
  function feedback(){
    const f=game.run.feedback,item=game.items[f.index];
    const title=f.hinted?'מתרגלים ביחד':f.correct?(f.poolCount>=4?'רצף גדול. זיכרון חזק!':f.origin==='review'?'זכרתם גם את המילה הזאת!':'נכון! המילה אצלכם.'):'מסתכלים על ההשלמה';
    let note=f.hinted?'קיבלתם עזרה. המילה תחזור בהמשך לבדיקה עצמאית.':f.correct?(f.firstSpaced?'זו הצלחה שנייה אחרי מילים אחרות. הזיכרון מתחזק.':f.poolCount>1?'הפרס התקבל. יתר המילים יחזרו בהמשך לחיזוק.':'בחירה טובה. ממשיכים בקצב שלכם.'):'האות או הצירוף הנכונים מודגשים. המילה תחזור אחרי מילים אחרות.';
    return `<section class="arena"><div class="arena-top"><span class="mode">${f.correct?'הצלחה':'לומדים מהתיקון'}</span><span class="sequence">${game.run.streak>=3?`${game.run.streak} הצלחות ברצף`:''}</span></div><div class="word-surface"><div class="result-sign${!f.correct||f.hinted?' miss':''}" aria-hidden="true">${f.hinted?'↺':f.correct?'✓':'↺'}</div><p class="result-label">${title}</p><h1 class="word" lang="en">${masked(f.index,true)}</h1><p class="translation">${esc(item.translation)}</p><div class="result-delta${f.delta<0?' negative':''}">${f.delta>0?'+':''}${f.delta} <span style="font-size:16px">נקודות</span></div><p class="result-note">${note}</p></div><div class="feedback-actions"><button class="action primary" data-action="next"><strong>ממשיכים</strong></button>${soundButton(f.index)}</div></section>`;
  }
  function summary(){
    const r=game.run,spaced=game.items.filter((_,i)=>game.stat(i).spaced).length;
    const last=game.s.level===5&&game.s.lesson===10;
    return `<section class="arena"><div class="arena-top"><span class="mode">השלב הושלם</span><span class="sequence">${game.items.length} מילים נבדקו</span></div><div class="word-surface"><div class="result-sign" aria-hidden="true">✓</div><h1 class="word" style="font-size:clamp(2rem,6vw,3rem)">זוכרים ומתקדמים</h1><p class="translation">הנקודות שלכם נשמרו.</p></div><div class="summary-numbers"><div><b>${number(r.score)}</b><span>נקודות בשלב</span></div><div><b>${r.passed.length}/${game.items.length}</b><span>נענו נכון ללא עזרה</span></div><div><b>${spaced}</b><span>שתי הצלחות מרווחות</span></div></div><div class="summary-actions"><div class="actions"><button class="action primary" data-action="${last?'stages':'nextStage'}"><strong>${last?'לבחירת שלב':'לשלב הבא'}</strong><span>${last?'ממשיכים לתרגל':'אתגר חדש מחכה'}</span></button><button class="action secondary" data-action="replay"><strong>לחזק שוב</strong><span>אותן מילים · שליפה נוספת</span></button></div><p class="microcopy">השלמת שלב מעידה על הצלחה בתרגול הזה. חזרה בהמשך עוזרת לבדוק מה נשמר בזיכרון.</p></div></section>`;
  }
  function render(focus=false){
    save();
    const r=game.run,n=r.challenge?.origin==='risk'?r.challenge.pool.length:r.pending.length;
    const [hex,rgb]=colours[Math.min(6,n)];
    document.documentElement.style.setProperty('--heat',hex);document.documentElement.style.setProperty('--hot-rgb',rgb);
    document.body.classList.toggle('reduced',prefs.reduced);
    $('#sound').setAttribute('aria-pressed',String(prefs.sound));$('#sound').setAttribute('aria-label',prefs.sound?'כיבוי שמע':'הפעלת שמע');$('#sound').textContent=prefs.sound?'♪':'♩';
    $('#motion').checked=prefs.reduced;
    $('#stages').textContent=`רמה ${game.s.level} · שלב ${game.s.lesson}`;
    $('#focusText').textContent=ENGLISH_BASIC_COURSE.levels[game.s.level-1].lessons[game.s.lesson-1].focus;
    $('#capLabel').textContent=`עד ${game.cap} ${game.cap===1?'מילה':'מילים'} ברצף`;
    const views={learn,drawing,challenge,feedback,summary};
    $('#main').innerHTML=notices()+hud()+(paused?'<div class="pause-strip">המשחק ממתין לכם.<button data-action="resume">ממשיכים</button></div>':'')+views[r.phase]()+
      (r.phase!=='summary'?`<div class="side-info"><span>לתלמידה ולתלמיד: הבחירה בידיים שלכם</span><strong>${r.queue.length?`${r.queue.length} מילים ממתינות לחיזוק`:'כל מילה מקבלת הזדמנות'}</strong></div>`:'');
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
    $('#stageOptions').innerHTML=ENGLISH_BASIC_COURSE.levels.map((level,l)=>`<h3 class="level-label">רמה ${l+1} · ${esc(level.name)}</h3><div class="level-grid">${level.lessons.map((lesson,i)=>`<button data-stage="${l+1}-${i+1}" class="${game.s.completed.includes(`${l+1}-${i+1}`)?'complete ':''}${game.s.level===l+1&&game.s.lesson===i+1?'current':''}" aria-label="רמה ${l+1}, שלב ${i+1}: ${esc(lesson.focus)}. תקרת רצף ${MemoryForge.capFor(l+1,i+1)}">${i+1}</button>`).join('')}</div>`).join('');
    openDialog($('#stageDialog'));
  }
  $('#main').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.speak!==undefined){if(!prefs.sound){prefs.sound=true;render();}sayWord(Number(b.dataset.speak),true);return;}
    const old=game.run.phase,action=b.dataset.action;
    if(action==='resume'){paused=false;render();if(game.run.phase==='drawing')beginDraw();return;}
    if(paused)return;
    stopMotion();cancelSpeech();
    if(b.dataset.answer!==undefined){
      if(game.answer(b.dataset.answer)){tone(game.run.feedback.correct?[523,659,784]:[330,262],.11);afterAction(old);}return;
    }
    if(action==='defer'){if(game.defer())tone([360+game.run.pending.length*75],.075);}
    else if(action==='test')game.challengeNow();
    else if(action==='next')game.next();
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
  function changeStage(l,s){stopMotion();stopAudio();game.start(l,s);paused=false;stageTarget=null;$('#stageDialog').close();render(true);}
  $('#stageOptions').addEventListener('click',e=>{
    const b=e.target.closest('[data-stage]');if(!b)return;const [l,s]=b.dataset.stage.split('-').map(Number);
    if(l===game.s.level&&s===game.s.lesson){closeDialog($('#stageDialog'));return;}
    if(game.run.phase!=='summary'&&(game.run.cursor>0||game.run.phase!=='learn')){
      stageTarget=[l,s];$('#stageOptions').hidden=true;$('#stageConfirm').hidden=false;
      $('#stageConfirmText').textContent=`לעבור לרמה ${l}, שלב ${s}? הרצף הנוכחי ו־${number(game.run.score)} נקודות השלב יתחילו מחדש. נקודות משלבים שהושלמו נשמרות.`;
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
