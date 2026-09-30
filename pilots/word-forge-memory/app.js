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
  let demo=!stored?.game&&!prefs.guideSeen?{step:1,wrong:[]}:null, repair=null;
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
    if(!prefs.sound||document.hidden||paused||document.querySelector('dialog[open]')||(!demo&&(game.run.phase==='drawing'||game.run.phase==='summary')))return;
    cancelSpeech();const token=speechGeneration;
    if(!EFN_SPEECH.supported){speechStatus('אין קול זמין במכשיר. אפשר להמשיך לשחק ללא שמע.');return;}
    const word=demo?'cat':game.items[index]?.word;if(!word)return;
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
    return `<div class="hud"><div class="score"><span class="score-icon" aria-hidden="true">◈</span><div><span class="metric-label">נקודות בשלב</span><strong class="metric-value" id="scoreValue">${number(r.score)}</strong><span class="bank">בבנק: ${number(game.s.bank)}</span></div></div><div class="learning"><div class="learning-label">מילים שהצלחנו <b>${r.passed.length} / ${game.items.length}</b></div><div class="progress" role="progressbar" aria-label="מילים שנענו נכון" aria-valuemin="0" aria-valuemax="${game.items.length}" aria-valuenow="${r.passed.length}"><i style="width:${r.passed.length/game.items.length*100}%"></i></div><span class="bank">${spaced} מילים הצליחו שוב אחרי הפסקה</span></div></div>`;
  }
  function notices(){
    return (!storageOK?'<p class="toast" role="status">השמירה המקומית אינה זמינה. אפשר לשחק, אך סגירה או רענון עלולים למחוק את ההתקדמות.</p>':'')+
      (game.run.missesInRow>=2&&game.run.phase==='learn'?'<p class="toast">ניקח רגע לזכור: אפשר להאזין שוב ולבחור רצף קצר יותר.</p>':'');
  }
  function coach(title,text,icon='✦'){
    return `<div class="coach"><span class="coach-icon" aria-hidden="true">${icon}</span><div><strong>${title}</strong><p>${text}</p></div></div>`;
  }
  function demoView(){
    const step=demo.step;
    return `<section class="arena demo"><div class="arena-top"><span class="mode">ננסה ביחד</span><span class="sequence">${step} מתוך 3 · בלי נקודות</span></div>
      ${coach(step===1?'רואים מילה וזוכרים':step===2?'איזו אות נעלמה?':'הצלחתם! ככה משחקים',step===1?'עוד רגע נסתיר אות אחת. אפשר להקשיב לפני שמנסים.':step===2?'נוגעים באות שמתאימה לרווח. אפשר לנסות כמה שרוצים.':'במשחק נלמד עוד מילים. אם קשה, אפשר לבקש עזרה.')}
      <div class="word-surface"><span class="demo-picture" aria-hidden="true">🐈</span><h1 class="word" lang="en">${step===2?'c<span class="missing">_</span>t':'c<span class="resolved">a</span>t'}</h1><p class="translation">חתול</p>${soundButton(0)}</div>
      ${step===2?`<div class="choices" role="group" aria-label="איזו אות חסרה במילה cat">${['o','a','i','e'].map(x=>`<button class="choice${demo.wrong.length&&x==='a'?' gentle-cue':''}" data-demo-answer="${x}" ${demo.wrong.includes(x)?'disabled':''} lang="en">${x}</button>`).join('')}</div><p class="practice-note" role="status">${demo.wrong.length?'עוד ניסיון! במילה cat האות a נמצאת באמצע.':'אין מה למהר. כל ניסיון עוזר ללמוד.'}</p>`:`<div class="feedback-actions"><button class="action primary" data-demo="${step===1?'hide':'exit'}"><strong>${step===1?'זכרתי. בואו ננסה!':'מתחילים לשחק'}</strong></button></div>`}
      ${step===3?'':`<button class="text-button" data-demo="${step===2?'show':'exit'}">${step===2?'להציץ שוב במילה':'כבר מכירים? ישר למשחק'}</button>`}</section>`;
  }
  function learn(){
    const r=game.run,item=game.items[r.cursor],risk=game.risk(),n=r.pending.length;
    const tutorial=game.cap===1, currentPrize=n?risk.prize:10, nextPrize=MemoryForge.reward(n+1);
    const nextLoss=tutorial?0:Math.min(r.score,Math.ceil(nextPrize/2)),lift=nextPrize-currentPrize;
    const willDraw=n+1===game.cap||r.cursor+1===game.items.length||game.atSoundFamilyEnd(r.cursor+1);
    const tip=tutorial?coach('קודם מכירים את המילה','כשמוכנים, נסתיר חלק ממנה וננסה להשלים. מותר לטעות — בשלב הזה לא יורדות נקודות.'):
      n?coach('עוד מילה, או שננסה עכשיו?',`כבר שמרנו ${n} ${n===1?'מילה':'מילים'}. אפשר להוסיף את המילה שעל המסך, או לנסות לזכור אחת מהמילים ששמרנו.`):
      coach('עכשיו אפשר לזכור כמה מילים','אפשר לנסות את המילה הזאת, או לשמור אותה ולהמשיך. יותר מילים בזיכרון — פרס אפשרי גדול יותר.');
    return `${tip}<section class="arena"><div class="arena-top"><span class="mode">מכירים מילה</span><span class="sequence">${r.cursor+1} מתוך ${game.items.length}</span></div>
      <div class="word-surface"><p class="case-pair" lang="en" dir="ltr">${esc(item.word.toUpperCase())}</p><h1 class="word" lang="en">${esc(item.word.toLowerCase())}</h1><p class="translation">${esc(item.translation)}</p>${soundButton(r.cursor)}</div>
      <div class="risk-tray">${tutorial?'':`<div class="tray-top"><p>מילים ששמרנו <b>${n} / ${game.cap}</b></p><span class="sequence">כל קלף הוא מילה</span></div>${cards(n,game.cap)}`}
      <div class="actions${tutorial?' single-action':''}"><button class="action primary" data-action="test"><strong>${tutorial?'זכרתי. בואו ננסה!':n?'לנסות את המילים ששמרנו':'לנסות עכשיו'}</strong><span>${n?`מילה אחת מתוך ${n} · אפשר לזכות ב־${currentPrize}`:'את המילה שעל המסך · 10 נקודות'}</span>${n?`<small>${risk.loss?`בטעות: עד ${risk.loss}− נקודות`:'בלי הפחתת נקודות כרגע'}</small>`:''}</button>
      ${tutorial?'':`<button class="action secondary defer-action" data-action="defer"><strong>${n?'להוסיף גם את המילה הזאת':'לשמור ולראות עוד מילה'}</strong><span>${willDraw?'ואז תיבחר מילה לשאלה':'השאלה תחכה — עוברים למילה הבאה'}</span><em>${lift>0?`+${lift} לפרס האפשרי`:'פותחים אפשרות לפרס גדול יותר'}</em><small>פרס אפשרי: ${nextPrize}${nextLoss?` · בטעות: עד ${nextLoss}−`:''}</small></button>`}</div>
      ${n?'<p class="microcopy">„לנסות” בודק רק את הקלפים. המילה שעל המסך תחכה לנו.</p>':tutorial?'<p class="microcopy">אין שעון. אפשר להסתכל ולהקשיב שוב.</p>':'<p class="microcopy">אפשר לנסות אחרי כל מילה. הנקודות מגיעות רק אחרי תשובה נכונה.</p>'}</div></section>`;
  }
  function drawing(){
    const c=game.run.challenge;
    return `<section class="arena"><div class="arena-top"><span class="mode">${c.pool.length} מילים. שאלה אחת.</span><span class="sequence">בחירה אקראית</span></div><div class="word-surface drawing"><h1>איזו מילה תיבחר?</h1><p>הפרס של הרצף</p><div class="draw-prize">+${c.prize}</div></div><div class="risk-tray">${cards(c.pool.length,c.pool.length,drawFrame)}<p class="microcopy">לכל מילה ברצף סיכוי שווה.</p></div></section>`;
  }
  function challenge(){
    const c=game.run.challenge,item=game.items[c.index],review=['review','spacing'].includes(c.origin);
    return `<section class="arena"><div class="arena-top"><span class="mode">${review?'מילה שכבר פגשנו':c.origin==='risk'?'מה זוכרים מהקלפים?':'בואו ננסה'}</span><span class="sequence">${review?'ללא הפחתת נקודות':'ללא הגבלת זמן'}</span></div>
      <div class="word-surface"><p class="eyebrow">${c.plan.kind==='chunk'?'נוגעים באותיות שחסרות במילה':'נוגעים באות שחסרה במילה'}</p><h1 class="word" lang="en" aria-label="${c.hinted?'המילה המלאה':'השלימו את החסר'}">${masked(c.index,c.hinted)}</h1><p class="translation">${esc(item.translation)}</p>${soundButton(c.index)}</div>
      <div class="choices" role="group" aria-label="בחרו את ההשלמה">${c.options.map(o=>`<button class="choice" data-answer="${esc(o)}" lang="en" aria-label="${c.plan.kind==='chunk'?'הצירוף':'האות'} ${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="challenge-footer">${!c.hinted?'<button class="hint" data-action="hint">עזרה? מציצים במילה<span>ללא נקודות הפעם</span></button>':'<span class="microcopy">עכשיו נוגעים במה שהיה חסר. ננסה שוב בלי עזרה בהמשך.</span>'}</div>
      <div class="challenge-terms"><span>נכון <b dir="ltr">+${c.prize}</b></span><span>בטעות <b dir="ltr">${c.loss?`−${c.loss}`:'0'}</b></span>${c.origin==='risk'?`<span>רצף של ${c.pool.length}</span>`:''}</div></section>`;
  }
  function feedback(){
    const f=game.run.feedback,item=game.items[f.index],practice=!f.independent;
    const fixing=repair?.index===f.index;
    const title=fixing?(repair.done?'יפה! השלמנו יחד.':'עכשיו ננסה יחד'):f.hinted?'לומדים עם עזרה':f.correct?'נכון! הצלחתם לזכור':'לא הפעם. נלמד מזה יחד';
    const note=fixing?'תרגול קצר בלי לשנות את הנקודות. המילה תחזור גם בהמשך.':practice?'החלק המודגש הוא מה שהיה חסר. אפשר לנסות אותו שוב, בלי להפסיד עוד נקודות.':f.poolCount>1?'קיבלנו את הפרס! נחזור גם למילים האחרות ששמרנו.':'עוד מילה הצליחה! ממשיכים בקצב שלכם.';
    return `<section class="arena"><div class="arena-top"><span class="mode">${practice?'מותר לטעות. בשביל זה מתרגלים.':'כל ניסיון מקדם'}</span><span class="sequence">${game.run.streak>=3?`${game.run.streak} הצלחות ברצף`:''}</span></div>
      <div class="word-surface"><div class="result-sign${practice?' miss':''}" aria-hidden="true">${practice&&!repair?.done?'↺':'✓'}</div><h1 class="result-label">${title}</h1><p class="word" lang="en">${masked(f.index,true)}</p><p class="translation">${esc(item.translation)}</p>${!fixing?`<div class="result-delta${f.delta<0?' negative':''}">${f.delta>0?'+':''}${f.delta} <span style="font-size:16px">נקודות</span></div>`:''}<p class="result-note">${note}</p></div>
      ${fixing&&!repair.done?`<div class="repair-panel"><p class="repair-word" dir="ltr" lang="en">${masked(f.index)}</p><p class="microcopy">נוגעים בחלק המודגש במילה למעלה</p><div class="choices" role="group" aria-label="תרגול התיקון ללא נקודות">${game.run.challenge.options.map(o=>`<button class="choice" data-repair-answer="${esc(o)}" ${repair.wrong.includes(o)?'disabled':''} lang="en">${esc(o)}</button>`).join('')}</div><p class="practice-note" role="status">${repair.wrong.length?'עוד ניסיון. אפשר להיעזר במילה שלמעלה.':''}</p></div>`:''}
      <div class="feedback-actions">${practice&&!fixing?'<button class="action primary" data-action="repair"><strong>ננסה שוב יחד</strong><span>בלי להפסיד נקודות</span></button>':''}<button class="action ${practice&&(!fixing||!repair.done)?'secondary':'primary'}" data-action="next"><strong>${practice&&(!fixing||!repair.done)?'להמשיך בינתיים':'ממשיכים'}</strong></button>${soundButton(f.index)}</div></section>`;
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
    $('.route').hidden=Boolean(demo);$('#stages').disabled=Boolean(demo);
    $('#stages').textContent=`רמה ${game.s.level} · שלב ${game.s.lesson}`;
    $('#focusText').textContent=ENGLISH_BASIC_COURSE.levels[game.s.level-1].lessons[game.s.lesson-1].focus;
    $('#capLabel').textContent=`עד ${game.cap} ${game.cap===1?'מילה':'מילים'} ברצף`;
    const views={learn,drawing,challenge,feedback,summary};
    $('#main').innerHTML=notices()+(demo?'':hud())+(paused?'<div class="pause-strip">המשחק ממתין לכם.<button data-action="resume">ממשיכים</button></div>':'')+(demo?demoView():views[r.phase]())+
      (!demo&&r.phase!=='summary'?`<div class="side-info"><button class="text-button" data-action="demo">איך משחקים? ננסה ביחד</button><strong>${r.queue.length?`${r.queue.length} מילים נחזור לתרגל`:'אפשר להקשיב ולנסות שוב'}</strong></div>`:'');
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
    if(game.run.phase==='drawing'&&!demo)beginDraw();
    else if(game.run.phase==='learn'&&!paused){
      const id=`${game.key}:${game.run.cursor}:${game.run.rounds}`;
      if(id!==lastSpoken){lastSpoken=id;sayWord(game.run.cursor);}
    }
  }
  function openDialog(el){stopMotion();stopAudio();el.showModal();el.querySelector('[data-close]')?.focus();}
  function closeDialog(el){el.close();if(game.run.phase==='drawing'&&!demo){render();beginDraw();}}
  function showStages(){
    stageTarget=null;$('#stageConfirm').hidden=true;$('#stageOptions').hidden=false;
    $('#stageOptions').innerHTML=ENGLISH_BASIC_COURSE.levels.map((level,l)=>`<h3 class="level-label">רמה ${l+1} · ${esc(level.name)}</h3><div class="level-grid">${level.lessons.map((lesson,i)=>`<button data-stage="${l+1}-${i+1}" class="${game.s.completed.includes(`${l+1}-${i+1}`)?'complete ':''}${game.s.level===l+1&&game.s.lesson===i+1?'current':''}" aria-label="רמה ${l+1}, שלב ${i+1}: ${esc(lesson.focus)}. תקרת רצף ${MemoryForge.capFor(l+1,i+1)}">${i+1}</button>`).join('')}</div>`).join('');
    openDialog($('#stageDialog'));
  }
  $('#main').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.speak!==undefined){if(!prefs.sound){prefs.sound=true;render();}sayWord(Number(b.dataset.speak),true);return;}
    const old=game.run.phase,action=b.dataset.action;
    if(action==='resume'){paused=false;render();if(game.run.phase==='drawing'&&!demo)beginDraw();return;}
    if(paused)return;
    stopMotion();cancelSpeech();
    if(b.dataset.demo||b.dataset.demoAnswer!==undefined){
      if(!demo)return;
      if(b.dataset.demo==='exit'){demo=null;prefs.guideSeen=true;render(true);if(game.run.phase==='drawing')beginDraw();return;}
      if(b.dataset.demo==='hide')demo.step=2;
      if(b.dataset.demo==='show'){demo.step=1;demo.wrong=[];}
      if(b.dataset.demoAnswer!==undefined){if(b.dataset.demoAnswer==='a'){demo.step=3;tone([523,659]);}else demo.wrong.push(b.dataset.demoAnswer);}
      render(true);$('#announce').textContent=demo.step===3?'הצלחתם! עכשיו אפשר להתחיל לשחק.':demo.wrong.length?'עוד ניסיון. במילה cat האות a נמצאת באמצע.':'';return;
    }
    if(action==='demo'){demo={step:1,wrong:[]};render(true);return;}
    if(action==='repair'){repair={index:game.run.feedback.index,done:false,wrong:[]};render(true);return;}
    if(b.dataset.repairAnswer!==undefined){
      if(!repair||game.run.phase!=='feedback')return;
      if(b.dataset.repairAnswer===game.run.challenge.plan.correct){repair.done=true;tone([523,659]);}
      else repair.wrong.push(b.dataset.repairAnswer);
      render(true);$('#announce').textContent=repair.done?'יפה! השלמנו יחד.':'ננסה שוב בעזרת המילה שלמעלה.';return;
    }
    if(demo)return;
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
  $('#demoStart').addEventListener('click',()=>{$('#helpDialog').close();stopMotion();stopAudio();demo={step:1,wrong:[]};render(true);});
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
    if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||paused||demo)return;
    if(game.run.phase==='challenge'&&/^[1-4]$/.test(e.key)){
      const b=$('#main').querySelectorAll('[data-answer]')[Number(e.key)-1];if(b){e.preventDefault();b.click();}
    }
  });
  if(game.run.phase==='drawing')paused=true;
  render();
})();
