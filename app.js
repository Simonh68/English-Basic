(()=>{
const course=window.ENGLISH_BASIC_COURSE,progressApi=window.EBR_PROGRESS,learningLoop=window.EBR_LEARNING_LOOP;
const modes=[
 ['cards','כרטיסיות'],['listen','שמיעה'],['read','קריאה'],['transfer','מילים חדשות'],
 ['sentences','משפטים'],['text','טקסט'],['check','בדיקת שליטה']
];
const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const params=new URLSearchParams(location.search);
let level=Math.min(5,Math.max(1,Number(params.get('level'))||1));
let lesson=Math.min(10,Math.max(1,Number(params.get('lesson'))||1));
let mode=modes.some(x=>x[0]===params.get('mode'))?params.get('mode'):'cards';
let runId=0,cardIndex=0,touchX=null,activityProgress=null;
const levelSelect=$('#levelSelect'),lessonSelect=$('#lessonSelect'),modeNav=$('#modeNav');

function current(){return course.levels[level-1].lessons[lesson-1]}
function wordForgeHref(){return `word-forge/?level=${level}&lesson=${lesson}`}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function setURL(){history.replaceState(null,'',`lesson.html?level=${level}&lesson=${lesson}&mode=${mode}`)}
function progressKey(){return `ebr-v1-l${level}-u${lesson}`}
function getProgress(){try{return JSON.parse(localStorage.getItem(progressKey()))||{}}catch{return {}}}
function saveProgress(patch){
 const before=getProgress(),p={...before,...patch};localStorage.setItem(progressKey(),JSON.stringify(p));
 const completed=progressApi.STAGES.find(stage=>patch[stage]===true);
 if(completed)progressApi.recordPractice(completed,{firstTime:!before[completed]});
 else if(Object.prototype.hasOwnProperty.call(patch,'score'))progressApi.recordPractice('check',{firstTime:false});
 updateProgress();
}
function updateProgress(){
 const p=getProgress(),done=progressApi.STAGES.filter(k=>p[k]).length,profile=progressApi.getProfile();
 const chip=$('#progressChip');
 if(activityProgress){
  const {label,current,total}=activityProgress;
  chip.textContent=`${label} ${current}/${total}`;
  chip.setAttribute('aria-label',`${label}: ${current} מתוך ${total}`);
 }else{
  chip.textContent=`התקדמות ${done}/7`;
  chip.setAttribute('aria-label',`${done} מתוך 7 שלבי תרגול הושלמו`);
 }
 const summary=$('#profileStats'),xp=$('#profileXP'),streak=$('#profileStreak');
 if(xp)xp.textContent=`${profile.xp} XP`;
 if(streak)streak.textContent=`${profile.streak} ${profile.streak===1?'יום':'ימים'}`;
 if(summary)summary.setAttribute('aria-label',`${profile.xp} נקודות, ${profile.streak} ${profile.streak===1?'יום רצף':'ימי רצף'}`);
}
function setActivityProgress(label,current,total){
 activityProgress={label,current:Math.max(0,Math.min(total,current)),total};
 updateProgress();
}
function voice(){const v=speechSynthesis.getVoices();return v.find(x=>x.lang==='en-US')||v.find(x=>x.lang.startsWith('en'))||null}
function speak(text,rate=.8,id=runId){return new Promise(resolve=>{if(id!==runId)return resolve();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=rate;const v=voice();if(v)u.voice=v;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)})}
function stopSpeech(){runId++;speechSynthesis.cancel()}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function initialLoopQueue(items,prefix){return items.map((_,itemId)=>({key:`${prefix}-new-${itemId}`,itemId,encounter:'new',cycle:0}))}
function loopLabel(encounter){if(encounter==='new')return 'ניסיון ראשון';if(encounter==='retry')return 'תיקון פעיל';if(encounter==='review')return 'חזרה מרווחת';return 'חיזוק ביניים'}
function loopWaiting(queue){return new Set(queue.filter(entry=>entry.encounter==='retry'||entry.encounter==='review').map(entry=>entry.itemId)).size}
function loopFiller(itemCount,current,answered,prefix,index){
 let itemId=(current.itemId+answered+index+1)%itemCount;
 if(itemCount>1&&itemId===current.itemId)itemId=(itemId+1)%itemCount;
 return{key:`${prefix}-bridge-${answered}-${index}-${itemId}`,itemId,encounter:'bridge',cycle:0};
}
function advanceLoop(queue,isCorrect,answered,itemCount,prefix){
 const currentEntry=queue[0],rest=queue.slice(1),filler=index=>loopFiller(itemCount,currentEntry,answered,prefix,index);
 let nextQueue=rest,outcome='bridge',masteredItemId=null;
 if(!isCorrect){
  const retry={...currentEntry,key:`${prefix}-retry-${currentEntry.itemId}-${answered}`,encounter:currentEntry.encounter==='bridge'?'bridge':'retry',cycle:currentEntry.cycle+1};
  nextQueue=learningLoop.scheduleAfterError(rest,retry,filler);outcome='error';
 }else if(currentEntry.encounter==='new'||currentEntry.encounter==='retry'){
  const review={...currentEntry,key:`${prefix}-review-${currentEntry.itemId}-${answered}`,encounter:'review',cycle:currentEntry.cycle+1};
  nextQueue=learningLoop.scheduleAfterSuccess(rest,review,currentEntry.itemId+currentEntry.cycle+answered,filler);outcome='review';
 }else if(currentEntry.encounter==='review'){
  masteredItemId=currentEntry.itemId;outcome='mastered';
 }
 return{queue:nextQueue,outcome,masteredItemId};
}
function focusSoon(element){if(element)window.setTimeout(()=>element.focus(),40)}
function loopNextMessage(outcome){
 if(outcome==='error')return `הפריט יחזור אחרי ${learningLoop.ERROR_GAP} שאלות אחרות.`;
 if(outcome==='review')return `נבדוק אותו שוב אחרי ${learningLoop.SUCCESS_GAP_MIN}–${learningLoop.SUCCESS_GAP_MAX} שאלות.`;
 if(outcome==='mastered')return 'הצלחתם גם בחזרה — הפריט הושלם.';
 return 'חיזוק קצר הושלם.';
}

function setupSelectors(){
 levelSelect.innerHTML=course.levels.map(l=>`<option value="${l.id}">רמה ${l.id}</option>`).join('');
 lessonSelect.innerHTML=Array.from({length:10},(_,i)=>`<option value="${i+1}">שיעור ${i+1}</option>`).join('');
 levelSelect.value=level;lessonSelect.value=lesson;
 levelSelect.onchange=()=>{level=Number(levelSelect.value);lesson=1;lessonSelect.value=1;cardIndex=0;renderAll()};
 lessonSelect.onchange=()=>{lesson=Number(lessonSelect.value);cardIndex=0;renderAll()};
 modeNav.innerHTML=modes.map(([id,label],index)=>`<button class="mode-btn" type="button" data-mode="${id}" aria-pressed="false" aria-label="שלב ${index+1} מתוך ${modes.length}: ${label}">${label}</button>`).join('');
 modeNav.onclick=e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode)};
}
function setMode(next){
 stopSpeech();activityProgress=null;mode=next;setURL();let activeButton=null;document.querySelectorAll('.mode-btn').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));if(active){b.setAttribute('aria-current','step');activeButton=b}else b.removeAttribute('aria-current')});document.querySelectorAll('.mode-panel').forEach(p=>p.classList.remove('active'));$('#'+mode+'Panel').classList.add('active');renderMode();updateProgress();
 if(activeButton&&matchMedia('(max-width:700px)').matches)requestAnimationFrame(()=>activeButton.scrollIntoView({block:'nearest',inline:'center'}));
 progressApi.setLastLocation({href:`lesson.html?level=${level}&lesson=${lesson}&mode=${mode}`,label:`רמה ${level} · שיעור ${lesson}`});
}
function renderAll(){stopSpeech();activityProgress=null;setURL();document.body.dataset.level=level;levelSelect.value=level;lessonSelect.value=lesson;const lev=course.levels[level-1],u=current();document.title=`רמה ${level} · שיעור ${lesson} – Basic English Reading`;$('#lessonHeading').textContent=`רמה ${level} · שיעור ${lesson}`;$('#lessonFocus').textContent=`${lev.name} — ${u.focus}`;updateProgress();setMode(mode)}
function lessonMove(delta){let l=level,u=lesson+delta;if(u>10){if(l<5){l++;u=1}else u=10}if(u<1){if(l>1){l--;u=10}else u=1}level=l;lesson=u;cardIndex=0;renderAll()}

function renderMode(){
 const renderers={cards:renderCards,listen:renderListen,read:()=>renderSelfRead(false),transfer:()=>renderSelfRead(true),sentences:renderSentences,text:renderText,check:renderCheck};
 renderers[mode]();
}

function renderCards(){
 const u=current(),panel=$('#cardsPanel');
 const cards=[
  `<article class="study-card cover"><span class="eyebrow">רמה ${level} · שיעור ${lesson}</span><h2>${esc(u.focus)}</h2><p>עשר מילים לתרגול קריאה ואיות. אפשר לעבור בכל עת לשיעור או לרמה אחרים.</p><div class="cover-actions cover-actions--lesson"><button class="primary" data-card-start>מתחילים בכרטיסיות</button><button class="secondary" type="button" data-word-forge aria-label="פתיחת Word Forge למילים של השיעור"><span aria-hidden="true">▶</span> <span lang="en">WORD FORGE</span></button><button class="secondary" data-lesson="-1">השיעור הקודם</button><button class="secondary" data-lesson="1">השיעור הבא</button></div></article>`,
  ...u.words.map(([w,h])=>`<article class="study-card"><div class="word" lang="en">${esc(w)}</div><div class="translation">${esc(h)}</div><div class="letters" aria-label="${esc(w)}">${[...w].map(x=>`<span class="letter">${esc(x.toUpperCase())}</span>`).join('')}</div><div class="card-status" role="status"></div></article>`),
  `<article class="study-card finish"><span class="eyebrow">הכרטיסיות הושלמו</span><h2>מצוין</h2><p>אפשר להמשיך לתרגול, לחזור על הכרטיסיות, או לנסות משחק קצר על אותן מילים ודפוסים.</p><div class="cover-actions cover-actions--lesson"><button class="primary" type="button" data-word-forge aria-label="פתיחת Word Forge למילים של השיעור"><span aria-hidden="true">▶</span> <span lang="en">WORD FORGE</span></button><button class="secondary" type="button" data-mode-jump="listen">לתרגול שמיעה</button><button class="secondary" type="button" data-card-reset>חזרה על הכרטיסיות</button><button class="secondary" type="button" data-lesson="1">השיעור הבא</button></div></article>`
 ];
 panel.innerHTML=`<div class="card-stage"><div class="card-track">${cards.join('')}</div><button class="card-arrow card-prev" aria-label="הכרטיס הקודם">&#x2039;</button><button class="card-arrow card-next" aria-label="הכרטיס הבא">&#x203A;</button><div class="card-dots">${cards.map((_,i)=>`<button class="card-dot" data-card="${i}" aria-label="כרטיס ${i+1}"></button>`).join('')}</div><div class="card-position"><span class="card-count" aria-live="polite"></span><span class="card-progress" aria-hidden="true"><span></span></span></div></div>`;
 const stage=panel.querySelector('.card-stage');
 let swipeX=null,swipeY=null;
 const finishSwipe=(x,y)=>{if(swipeX===null)return;const dx=x-swipeX,dy=y-swipeY;swipeX=swipeY=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2)goCard(cardIndex+(dx<0?1:-1))};
 stage.addEventListener('touchstart',e=>{const t=e.changedTouches[0];swipeX=t.clientX;swipeY=t.clientY},{passive:true});
 stage.addEventListener('touchend',e=>{const t=e.changedTouches[0];finishSwipe(t.clientX,t.clientY)},{passive:true});
 stage.addEventListener('touchcancel',()=>{swipeX=swipeY=null},{passive:true});
 stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){swipeX=e.clientX;swipeY=e.clientY}});
 stage.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')finishSwipe(e.clientX,e.clientY)});
 panel.querySelector('.card-prev').onclick=()=>goCard(cardIndex-1);
 panel.querySelector('.card-next').onclick=()=>goCard(cardIndex+1);
 panel.onclick=e=>{const dot=e.target.closest('[data-card]'),move=e.target.closest('[data-lesson]'),jump=e.target.closest('[data-mode-jump]');if(dot)goCard(Number(dot.dataset.card));if(move)lessonMove(Number(move.dataset.lesson));if(jump)setMode(jump.dataset.mode);if(e.target.closest('[data-word-forge]'))location.href=wordForgeHref();if(e.target.closest('[data-game-mode]'))location.href=window.ENGLISH_BASIC_WORDS.makeGameHref(level,lesson);if(e.target.closest('[data-card-start]'))goCard(1);if(e.target.closest('[data-card-reset]'))goCard(0)};
 goCard(cardIndex,false);
}
function goCard(i,read=true){
 const u=current(),total=u.words.length+2;cardIndex=Math.max(0,Math.min(total-1,i));stopSpeech();
 const panel=$('#cardsPanel'),track=panel.querySelector('.card-track');if(!track)return;
 track.style.transform=`translateX(-${cardIndex*100}%)`;
 const stage=panel.querySelector('.card-stage'),count=panel.querySelector('.card-count'),bar=panel.querySelector('.card-progress span');
 stage.dataset.position=cardIndex===0?'cover':cardIndex===total-1?'finish':'card';
 if(count)count.textContent=cardIndex===0?'פתיחה':cardIndex===total-1?'סיום':`${cardIndex} מתוך ${u.words.length}`;
 if(bar)bar.style.width=`${Math.max(0,Math.min(100,cardIndex/(total-1)*100))}%`;
 panel.querySelectorAll('.card-dot').forEach((d,j)=>{const active=j===cardIndex;d.classList.toggle('active',active);if(active)d.setAttribute('aria-current','true');else d.removeAttribute('aria-current')});
 panel.querySelector('.card-prev').disabled=cardIndex===0;panel.querySelector('.card-next').disabled=cardIndex===total-1;
 panel.querySelectorAll('.word').forEach(x=>x.classList.remove('done'));panel.querySelectorAll('.letter').forEach(x=>x.classList.remove('active'));
 if(cardIndex===total-1){activityProgress=null;saveProgress({cards:true})}
 else setActivityProgress('כרטיסיות',cardIndex,u.words.length);
 if(read&&cardIndex>0&&cardIndex<total-1)readWordCard(cardIndex-1);
}
async function readWordCard(wordIndex){
 const id=runId,u=current(),[word]=u.words[wordIndex],card=$('#cardsPanel').querySelectorAll('.study-card')[wordIndex+1],status=card.querySelector('.card-status'),letters=[...card.querySelectorAll('.letter')],wordEl=card.querySelector('.word');
 status.textContent='ממתינים…';await sleep(900);if(id!==runId)return;status.textContent='המילה';await speak(word,.8,id);if(id!==runId)return;status.textContent='איות';
 for(let i=0;i<word.length;i++){if(id!==runId)return;letters.forEach(x=>x.classList.remove('active'));letters[i]?.classList.add('active');await speak(word[i].toUpperCase(),1,id);await sleep(120)}
 if(id!==runId)return;letters.forEach(x=>x.classList.remove('active'));status.textContent='ושוב: המילה';await speak(word,.8,id);if(id!==runId)return;wordEl.classList.add('done');status.textContent='אפשר להמשיך';
}

function renderListen(){
 const panel=$('#listenPanel'),items=shuffle(current().words).slice(0,10),prefix=`listen-${level}-${lesson}`;
 let queue=initialLoopQueue(items,prefix),answered=0,correctFirst=0,finished=false;
 const mastered=new Set(),hadError=new Set();
 panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>זיהוי שמיעתי</h2><p>שומעים, בוחרים ומוכיחים שוב אחרי מרווח</p></div><div class="loop-dashboard" aria-label="מצב תרגול השמיעה"><div><span>הושלמו</span><strong data-loop-mastered>0 / ${items.length}</strong></div><div><span>ממתינות לחזרה</span><strong data-loop-waiting>0</strong></div><div><span>שאלות שנענו</span><strong data-loop-answered>0</strong></div></div><div class="task-card loop-task"><div class="loop-question-top"><span class="loop-encounter"></span><small class="loop-rule">טעות חוזרת אחרי 2 · הצלחה אחרי 4–6</small></div><button class="listen-button" aria-label="השמעת המילה באנגלית">▶</button><div class="choices" role="group" aria-label="אפשרויות תשובה"></div><div class="feedback loop-feedback" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"></div><div class="counter"></div></div></div>`;
 function dashboard(){panel.querySelector('[data-loop-mastered]').textContent=`${mastered.size} / ${items.length}`;panel.querySelector('[data-loop-waiting]').textContent=loopWaiting(queue);panel.querySelector('[data-loop-answered]').textContent=answered}
 function play(){const entry=queue[0];if(!entry||mastered.size===items.length)return;stopSpeech();const id=runId;speak(items[entry.itemId][0],.8,id)}
 function complete(){
  if(finished)return;finished=true;activityProgress=null;saveProgress({listen:true});
  const corrected=[...mastered].filter(itemId=>hadError.has(itemId)).length;
  panel.querySelector('.loop-task').innerHTML=`<div class="loop-summary" role="status" aria-live="polite"><span class="loop-summary-mark" aria-hidden="true">✓</span><h2>כל המילים הושלמו</h2><p>לא רק זיהיתם את המילים — עניתם עליהן נכון גם בחזרה מרווחת.</p><div class="mastery-grid"><div class="metric"><strong>${correctFirst}/${items.length}</strong>נכון בניסיון הראשון</div><div class="metric"><strong>${corrected}</strong>תוקנו בעזרת הלולאה</div><div class="metric"><strong>${answered}</strong>שאלות בסך הכול</div></div><button class="primary" data-restart>תרגול נוסף</button></div>`;
  panel.querySelector('[data-restart]').onclick=renderListen;
 }
 function show(){
  if(mastered.size===items.length){complete();return}
  const entry=queue[0],[answer,meaning]=items[entry.itemId];
  setActivityProgress('שמיעה',mastered.size,items.length);dashboard();
  panel.querySelector('.loop-encounter').textContent=loopLabel(entry.encounter);
  const distractors=shuffle(items.filter(item=>item[0]!==answer)).slice(0,3),pool=shuffle([[answer,meaning],...distractors]);
  const choices=panel.querySelector('.choices'),feedback=panel.querySelector('.loop-feedback');
  choices.innerHTML=pool.map(([word])=>`<button class="choice" type="button" lang="en" dir="ltr">${esc(word)}</button>`).join('');
  feedback.className='feedback loop-feedback';feedback.innerHTML='';
  panel.querySelector('.counter').textContent=`${mastered.size} מתוך ${items.length} הושלמו · ${loopLabel(entry.encounter)}`;
  panel.querySelector('.listen-button').onclick=play;
  panel.querySelectorAll('.choice').forEach(button=>button.onclick=()=>{
   const isCorrect=button.textContent===answer;answered++;
   if(entry.encounter==='new'&&isCorrect)correctFirst++;
   if(!isCorrect&&entry.encounter!=='bridge')hadError.add(entry.itemId);
   panel.querySelectorAll('.choice').forEach(choice=>choice.disabled=true);
   button.classList.add(isCorrect?'correct':'wrong');
   if(!isCorrect)[...panel.querySelectorAll('.choice')].find(choice=>choice.textContent===answer)?.classList.add('correct');
   const result=advanceLoop(queue,isCorrect,answered,items.length,prefix);queue=result.queue;
   if(result.masteredItemId!==null)mastered.add(result.masteredItemId);
   dashboard();
   feedback.className=`feedback loop-feedback ${isCorrect?'success':'coach'}`;
   feedback.innerHTML=`<div><strong>${isCorrect?'נכון — עכשיו נקבע מתי לבדוק שוב':'עוד לא — הנה התיקון לפני הניסיון הבא'}</strong><p><span lang="en" dir="ltr">${esc(answer)}</span> — ${esc(meaning)}</p><small>${loopNextMessage(result.outcome)}</small></div><button class="primary" type="button" data-loop-next>${result.outcome==='mastered'?'סיום המילה והמשך':'המשך לתור'}</button>`;
   focusSoon(feedback);feedback.querySelector('[data-loop-next]').onclick=show;
  });
  window.setTimeout(play,300);
 }
 show();
}

function renderSelfRead(isTransfer){
 const panel=$(isTransfer?'#transferPanel':'#readPanel'),items=shuffle(isTransfer?current().transfer:current().words),stage=isTransfer?'transfer':'read',label=isTransfer?'מילים חדשות':'קריאה',prefix=`${stage}-${level}-${lesson}`;
 let queue=initialLoopQueue(items,prefix),answered=0,correctFirst=0,finished=false;
 const mastered=new Set(),hadError=new Set();
 panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>${isTransfer?'מילים חדשות':'קריאה עצמאית'}</h2><p>${isTransfer?'אותו דפוס במילים שלא היו בכרטיסיות — עם חזרה בזמן הנכון':'קוראים לבד, בודקים ואז חוזרים שוב אחרי מרווח'}</p></div><div class="loop-dashboard" aria-label="מצב תרגול הקריאה"><div><span>הושלמו</span><strong data-loop-mastered>0 / ${items.length}</strong></div><div><span>ממתינות לחזרה</span><strong data-loop-waiting>0</strong></div><div><span>ניסיונות</span><strong data-loop-answered>0</strong></div></div><div class="task-card loop-task"><div class="loop-question-top"><span class="loop-encounter"></span><small class="loop-rule">טעות חוזרת אחרי 2 · הצלחה אחרי 4–6</small></div><div class="big-read" lang="en" dir="ltr" tabindex="-1"></div><div class="reveal"></div><div class="self-actions"></div><div class="feedback loop-feedback" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"></div><div class="counter"></div></div></div>`;
 function dashboard(){panel.querySelector('[data-loop-mastered]').textContent=`${mastered.size} / ${items.length}`;panel.querySelector('[data-loop-waiting]').textContent=loopWaiting(queue);panel.querySelector('[data-loop-answered]').textContent=answered}
 function complete(){
  if(finished)return;finished=true;activityProgress=null;saveProgress({[stage]:true});
  const corrected=[...mastered].filter(itemId=>hadError.has(itemId)).length;
  panel.querySelector('.loop-task').innerHTML=`<div class="loop-summary" role="status" aria-live="polite"><span class="loop-summary-mark" aria-hidden="true">✓</span><h2>הקריאה הושלמה</h2><p>כל מילה נקראה בהצלחה גם לאחר מרווח, ולא נעלמה מן התור אחרי סימון אחד.</p><div class="mastery-grid"><div class="metric"><strong>${correctFirst}/${items.length}</strong>נקראו מיד</div><div class="metric"><strong>${corrected}</strong>חזרו לתיקון</div><div class="metric"><strong>${answered}</strong>ניסיונות בסך הכול</div></div><button class="primary" data-restart>סבב נוסף</button></div>`;
  panel.querySelector('[data-restart]').onclick=()=>renderSelfRead(isTransfer);
 }
 function show(){
  if(mastered.size===items.length){complete();return}
  const entry=queue[0],[word,meaning]=items[entry.itemId],bigRead=panel.querySelector('.big-read'),reveal=panel.querySelector('.reveal'),actions=panel.querySelector('.self-actions'),feedback=panel.querySelector('.loop-feedback');
  setActivityProgress(label,mastered.size,items.length);dashboard();
  panel.querySelector('.loop-encounter').textContent=loopLabel(entry.encounter);bigRead.textContent=word;reveal.textContent='';
  actions.innerHTML='<button class="secondary" type="button" data-reveal>בדיקה והשמעה</button>';
  feedback.className='feedback loop-feedback';feedback.innerHTML='';panel.querySelector('.counter').textContent=`${mastered.size} מתוך ${items.length} הושלמו · ${loopLabel(entry.encounter)}`;
  focusSoon(bigRead);
  actions.querySelector('[data-reveal]').onclick=()=>{
   reveal.textContent=meaning;speak(word,.8);actions.innerHTML='<button class="good" type="button" data-good>קראתי נכון</button><button class="again" type="button" data-again>צריך עוד תרגול</button>';
   function report(isCorrect){
    answered++;if(entry.encounter==='new'&&isCorrect)correctFirst++;if(!isCorrect&&entry.encounter!=='bridge')hadError.add(entry.itemId);
    actions.querySelectorAll('button').forEach(button=>button.disabled=true);
    const result=advanceLoop(queue,isCorrect,answered,items.length,prefix);queue=result.queue;if(result.masteredItemId!==null)mastered.add(result.masteredItemId);dashboard();
    feedback.className=`feedback loop-feedback ${isCorrect?'success':'coach'}`;
    feedback.innerHTML=`<div><strong>${isCorrect?'יופי — הקריאה סומנה כנכונה':'זה בדיוק הזמן לבקש עוד תרגול'}</strong><p><span lang="en" dir="ltr">${esc(word)}</span> — ${esc(meaning)}</p><small>${loopNextMessage(result.outcome)}</small></div><button class="primary" type="button" data-loop-next>${result.outcome==='mastered'?'סיום המילה והמשך':'המשך לתור'}</button>`;
    focusSoon(feedback);feedback.querySelector('[data-loop-next]').onclick=show;
   }
   actions.querySelector('[data-good]').onclick=()=>report(true);actions.querySelector('[data-again]').onclick=()=>report(false);
  };
 }
 show();
}

function renderSentences(){
 const panel=$('#sentencesPanel'),u=current();panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>קריאה במשפטים</h2><p>קוראים בקול, ואז מאזינים לבדיקה</p></div><div class="sentence-list">${u.sentences.map((s,i)=>`<div class="sentence-row"><div class="sentence-en">${esc(s)}</div><button class="speak-mini" data-sentence="${i}" aria-label="השמעת המשפט">▶</button></div>`).join('')}</div><div class="passage-actions"><button class="good" data-sentence-done>סיימתי לקרוא</button></div></div>`;panel.onclick=e=>{const b=e.target.closest('[data-sentence]');if(b)speak(u.sentences[Number(b.dataset.sentence)],.8);if(e.target.closest('[data-sentence-done]'))saveProgress({sentences:true})};
}
function renderText(){
 const panel=$('#textPanel'),u=current(),parts=u.passage.match(/[^.!?]+[.!?]+/g)||[u.passage];panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>טקסט קצר</h2><p>קוראים ברצף ומאזינים רק כשצריך</p></div><div class="passage">${esc(u.passage)}</div><div class="passage-actions"><button class="secondary" data-play-text>השמעת הטקסט</button><button class="good" data-text-done>סיימתי לקרוא</button></div></div>`;panel.onclick=async e=>{if(e.target.closest('[data-play-text]')){stopSpeech();const id=runId;for(const s of parts){if(id!==runId)return;await speak(s.trim(),.8,id);await sleep(250)}}if(e.target.closest('[data-text-done]'))saveProgress({text:true})};
}

function renderCheck(){
 const panel=$('#checkPanel'),u=current(),items=shuffle([...shuffle(u.words).slice(0,5),...u.transfer]),prefix=`check-${level}-${lesson}`;
 let queue=initialLoopQueue(items,prefix),answered=0,correctFirst=0,finished=false;
 const mastered=new Set(),hadError=new Set();
 panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>בדיקת שליטה</h2><p>הציון נקבע בניסיון הראשון; טעויות מקבלות תיקון וחזרה אמיתית</p></div><div class="loop-dashboard" aria-label="מצב בדיקת השליטה"><div><span>הושלמו</span><strong data-loop-mastered>0 / ${items.length}</strong></div><div><span>ממתינות לחזרה</span><strong data-loop-waiting>0</strong></div><div><span>ניסיונות</span><strong data-loop-answered>0</strong></div></div><div class="task-card loop-task"><div class="loop-question-top"><span class="loop-encounter"></span><small class="loop-rule">טעות חוזרת אחרי 2 · הצלחה אחרי 4–6</small></div><div class="big-read" lang="en" dir="ltr" tabindex="-1"></div><div class="reveal"></div><div class="self-actions"></div><div class="feedback loop-feedback" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"></div><div class="counter"></div></div></div>`;
 function dashboard(){panel.querySelector('[data-loop-mastered]').textContent=`${mastered.size} / ${items.length}`;panel.querySelector('[data-loop-waiting]').textContent=loopWaiting(queue);panel.querySelector('[data-loop-answered]').textContent=answered}
 function complete(){
  if(finished)return;finished=true;const pct=Math.round(correctFirst/items.length*100),pass=pct>=80,corrected=[...mastered].filter(itemId=>hadError.has(itemId)).length;
  activityProgress=null;saveProgress({check:pass,score:pct,date:new Date().toISOString()});
  panel.querySelector('.loop-task').innerHTML=`<div class="loop-summary" role="status" aria-live="polite"><span class="loop-summary-mark" aria-hidden="true">✓</span><h2>בדיקת השליטה הושלמה</h2><p>כל הפריטים הגיעו להצלחה בחזרה. הציון נשאר מבוסס על הניסיון הראשון כדי לשקף שליטה עצמאית.</p><div class="mastery-grid"><div class="metric"><strong>${correctFirst}/${items.length}</strong>דיוק ראשון</div><div class="metric"><strong>${pct}%</strong>ציון התחלתי</div><div class="metric"><strong>${corrected}</strong>תוקנו בלולאה</div></div><div class="mastery-result ${pass?'pass':''}">${pass?'הושג יעד 80%. מומלץ לבדוק שוב בעוד כמה ימים.':'עדיין לא הושג יעד 80%, אך כל הטעויות קיבלו תיקון וחזרה.'}</div><div class="cover-actions"><button class="secondary" data-retry>בדיקה חוזרת</button><button class="primary" data-next-lesson>לשיעור הבא</button></div><p class="free-note">הבדיקה אינה נועלת רמות או שיעורים.</p></div>`;
  panel.querySelector('[data-retry]').onclick=renderCheck;panel.querySelector('[data-next-lesson]').onclick=()=>lessonMove(1);
 }
 function show(){
  if(mastered.size===items.length){complete();return}
  const entry=queue[0],[word,meaning]=items[entry.itemId],bigRead=panel.querySelector('.big-read'),reveal=panel.querySelector('.reveal'),actions=panel.querySelector('.self-actions'),feedback=panel.querySelector('.loop-feedback');
  setActivityProgress('בדיקת שליטה',mastered.size,items.length);dashboard();panel.querySelector('.loop-encounter').textContent=loopLabel(entry.encounter);
  bigRead.textContent=word;reveal.textContent='';actions.innerHTML='<button class="secondary" type="button" data-check-reveal>בדיקה והשמעה</button>';feedback.className='feedback loop-feedback';feedback.innerHTML='';panel.querySelector('.counter').textContent=`${mastered.size} מתוך ${items.length} הושלמו · ${loopLabel(entry.encounter)}`;focusSoon(bigRead);
  actions.querySelector('[data-check-reveal]').onclick=()=>{
   reveal.textContent=meaning;speak(word,.8);actions.innerHTML='<button class="good" type="button" data-check-good>קראתי נכון</button><button class="again" type="button" data-check-again>צריך עוד תרגול</button>';
   function report(isCorrect){
    answered++;if(entry.encounter==='new'&&isCorrect)correctFirst++;if(!isCorrect&&entry.encounter!=='bridge')hadError.add(entry.itemId);actions.querySelectorAll('button').forEach(button=>button.disabled=true);
    const result=advanceLoop(queue,isCorrect,answered,items.length,prefix);queue=result.queue;if(result.masteredItemId!==null)mastered.add(result.masteredItemId);dashboard();
    feedback.className=`feedback loop-feedback ${isCorrect?'success':'coach'}`;feedback.innerHTML=`<div><strong>${isCorrect?'נרשם כנכון — עכשיו נוודא שהקריאה נשמרה':'נרשם לתיקון — הטעות לא נעלמת מן התרגול'}</strong><p><span lang="en" dir="ltr">${esc(word)}</span> — ${esc(meaning)}</p><small>${loopNextMessage(result.outcome)}</small></div><button class="primary" type="button" data-loop-next>${result.outcome==='mastered'?'סיום הפריט והמשך':'המשך לתור'}</button>`;
    focusSoon(feedback);feedback.querySelector('[data-loop-next]').onclick=show;
   }
   actions.querySelector('[data-check-good]').onclick=()=>report(true);actions.querySelector('[data-check-again]').onclick=()=>report(false);
  };
 }
 show();
}

window.addEventListener('ebr:progress',event=>{
 updateProgress();
 const gained=event.detail?.xpGained||0,live=$('#xpLive');
 if(gained>0&&live){live.textContent=`+${gained} XP`;live.classList.remove('show');void live.offsetWidth;live.classList.add('show');setTimeout(()=>live.classList.remove('show'),1800)}
});
window.addEventListener('beforeunload',stopSpeech);document.addEventListener('keydown',e=>{if(mode==='cards'&&e.key==='ArrowLeft')goCard(cardIndex-1);if(mode==='cards'&&e.key==='ArrowRight')goCard(cardIndex+1)});speechSynthesis.getVoices();setupSelectors();renderAll();
})();
