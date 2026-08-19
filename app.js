(()=>{
const course=window.ENGLISH_BASIC_COURSE;
const modes=[
 ['cards','כרטיסיות'],['listen','שמיעה'],['read','קריאה'],['transfer','מילים חדשות'],
 ['sentences','משפטים'],['text','טקסט'],['check','בדיקת שליטה']
];
const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const params=new URLSearchParams(location.search);
let level=Math.min(5,Math.max(1,Number(params.get('level'))||1));
let lesson=Math.min(10,Math.max(1,Number(params.get('lesson'))||1));
let mode=modes.some(x=>x[0]===params.get('mode'))?params.get('mode'):'cards';
let runId=0,cardIndex=0,touchX=null;
const levelSelect=$('#levelSelect'),lessonSelect=$('#lessonSelect'),modeNav=$('#modeNav');

function current(){return course.levels[level-1].lessons[lesson-1]}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function setURL(){history.replaceState(null,'',`lesson.html?level=${level}&lesson=${lesson}&mode=${mode}`)}
function progressKey(){return `ebr-v1-l${level}-u${lesson}`}
function getProgress(){try{return JSON.parse(localStorage.getItem(progressKey()))||{}}catch{return {}}}
function saveProgress(patch){const p={...getProgress(),...patch};localStorage.setItem(progressKey(),JSON.stringify(p));updateProgress()}
function updateProgress(){const p=getProgress();const done=['cards','listen','read','transfer','sentences','text','check'].filter(k=>p[k]).length;$('#progressChip').textContent=`${done}/7 שלבים נוסו`}
function voice(){const v=speechSynthesis.getVoices();return v.find(x=>x.lang==='en-US')||v.find(x=>x.lang.startsWith('en'))||null}
function speak(text,rate=.8,id=runId){return new Promise(resolve=>{if(id!==runId)return resolve();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=rate;const v=voice();if(v)u.voice=v;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)})}
function stopSpeech(){runId++;speechSynthesis.cancel()}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}

function setupSelectors(){
 levelSelect.innerHTML=course.levels.map(l=>`<option value="${l.id}">רמה ${l.id}</option>`).join('');
 lessonSelect.innerHTML=Array.from({length:10},(_,i)=>`<option value="${i+1}">שיעור ${i+1}</option>`).join('');
 levelSelect.value=level;lessonSelect.value=lesson;
 levelSelect.onchange=()=>{level=Number(levelSelect.value);lesson=1;lessonSelect.value=1;cardIndex=0;renderAll()};
 lessonSelect.onchange=()=>{lesson=Number(lessonSelect.value);cardIndex=0;renderAll()};
 modeNav.innerHTML=modes.map(([id,label])=>`<button class="mode-btn" data-mode="${id}">${label}</button>`).join('');
 modeNav.onclick=e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode)};
}
function setMode(next){stopSpeech();mode=next;setURL();document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));document.querySelectorAll('.mode-panel').forEach(p=>p.classList.remove('active'));$('#'+mode+'Panel').classList.add('active');renderMode()}
function renderAll(){stopSpeech();setURL();levelSelect.value=level;lessonSelect.value=lesson;const lev=course.levels[level-1],u=current();document.title=`רמה ${level} · שיעור ${lesson} – Basic English Reading`;$('#lessonHeading').textContent=`רמה ${level} · שיעור ${lesson}`;$('#lessonFocus').textContent=`${lev.name} — ${u.focus}`;updateProgress();setMode(mode)}
function lessonMove(delta){let l=level,u=lesson+delta;if(u>10){if(l<5){l++;u=1}else u=10}if(u<1){if(l>1){l--;u=10}else u=1}level=l;lesson=u;cardIndex=0;renderAll()}

function renderMode(){
 const renderers={cards:renderCards,listen:renderListen,read:()=>renderSelfRead(false),transfer:()=>renderSelfRead(true),sentences:renderSentences,text:renderText,check:renderCheck};
 renderers[mode]();
}

function renderCards(){
 const u=current(),panel=$('#cardsPanel');
 const cards=[
  `<article class="study-card cover"><span class="eyebrow">רמה ${level} · שיעור ${lesson}</span><h2>${esc(u.focus)}</h2><p>עשר מילים לתרגול קריאה ואיות. אפשר לעבור בכל עת לשיעור או לרמה אחרים.</p><div class="cover-actions"><button class="secondary" data-lesson="-1">השיעור הקודם</button><button class="primary" data-card-start>מתחילים</button><button class="secondary" data-lesson="1">השיעור הבא</button></div></article>`,
  ...u.words.map(([w,h])=>`<article class="study-card"><div class="word" lang="en">${esc(w)}</div><div class="translation">${esc(h)}</div><div class="letters" aria-label="${esc(w)}">${[...w].map(x=>`<span class="letter">${esc(x.toUpperCase())}</span>`).join('')}</div><div class="card-status" role="status"></div></article>`),
  `<article class="study-card finish"><span class="eyebrow">הכרטיסיות הושלמו</span><h2>מצוין</h2><p>אפשר להמשיך לתרגול, לחזור על הכרטיסיות, או לעבור ישירות לשיעור הבא.</p><div class="cover-actions"><button class="secondary" data-card-reset>חזרה על הכרטיסיות</button><button class="primary" data-mode-jump="listen">מעבר לתרגול</button><button class="secondary" data-lesson="1">השיעור הבא</button></div></article>`
 ];
 panel.innerHTML=`<div class="card-stage"><div class="card-track">${cards.join('')}</div><button class="card-arrow card-prev" aria-label="הכרטיס הקודם">‹</button><button class="card-arrow card-next" aria-label="הכרטיס הבא">›</button><div class="card-dots">${cards.map((_,i)=>`<button class="card-dot" data-card="${i}" aria-label="כרטיס ${i+1}"></button>`).join('')}</div></div>`;
 const stage=panel.querySelector('.card-stage');
 stage.addEventListener('pointerdown',e=>touchX=e.clientX);
 stage.addEventListener('pointerup',e=>{if(touchX===null)return;const d=e.clientX-touchX;touchX=null;if(Math.abs(d)>45)goCard(cardIndex+(d<0?1:-1))});
 panel.querySelector('.card-prev').onclick=()=>goCard(cardIndex-1);
 panel.querySelector('.card-next').onclick=()=>goCard(cardIndex+1);
 panel.onclick=e=>{const dot=e.target.closest('[data-card]'),move=e.target.closest('[data-lesson]'),jump=e.target.closest('[data-mode-jump]');if(dot)goCard(Number(dot.dataset.card));if(move)lessonMove(Number(move.dataset.lesson));if(jump)setMode(jump.dataset.mode);if(e.target.closest('[data-card-start]'))goCard(1);if(e.target.closest('[data-card-reset]'))goCard(0)};
 goCard(cardIndex,false);
}
function goCard(i,read=true){
 const u=current(),total=u.words.length+2;cardIndex=Math.max(0,Math.min(total-1,i));stopSpeech();
 const panel=$('#cardsPanel'),track=panel.querySelector('.card-track');if(!track)return;
 track.style.transform=`translateX(-${cardIndex*100}%)`;
 panel.querySelectorAll('.card-dot').forEach((d,j)=>d.classList.toggle('active',j===cardIndex));
 panel.querySelector('.card-prev').disabled=cardIndex===0;panel.querySelector('.card-next').disabled=cardIndex===total-1;
 panel.querySelectorAll('.word').forEach(x=>x.classList.remove('done'));panel.querySelectorAll('.letter').forEach(x=>x.classList.remove('active'));
 if(cardIndex===total-1)saveProgress({cards:true});
 if(read&&cardIndex>0&&cardIndex<total-1)readWordCard(cardIndex-1);
}
async function readWordCard(wordIndex){
 const id=runId,u=current(),[word]=u.words[wordIndex],card=$('#cardsPanel').querySelectorAll('.study-card')[wordIndex+1],status=card.querySelector('.card-status'),letters=[...card.querySelectorAll('.letter')],wordEl=card.querySelector('.word');
 status.textContent='ממתינים…';await sleep(900);if(id!==runId)return;status.textContent='המילה';await speak(word,.8,id);if(id!==runId)return;status.textContent='איות';
 for(let i=0;i<word.length;i++){if(id!==runId)return;letters.forEach(x=>x.classList.remove('active'));letters[i]?.classList.add('active');await speak(word[i].toUpperCase(),1,id);await sleep(120)}
 if(id!==runId)return;letters.forEach(x=>x.classList.remove('active'));status.textContent='ושוב: המילה';await speak(word,.8,id);if(id!==runId)return;wordEl.classList.add('done');status.textContent='אפשר להמשיך';
}

function renderListen(){
 const panel=$('#listenPanel'),u=current();let index=0,correct=0,order=shuffle(u.words).slice(0,10);
 panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>זיהוי שמיעתי</h2><p>שומעים ובוחרים את המילה הנכונה</p></div><div class="task-card"><button class="listen-button" aria-label="השמעת המילה">▶</button><div class="choices"></div><div class="feedback"></div><div class="counter"></div></div></div>`;
 const play=()=>{stopSpeech();const id=runId;speak(order[index][0],.8,id)};panel.querySelector('.listen-button').onclick=play;
 function show(){if(index>=order.length){panel.querySelector('.task-card').innerHTML=`<div class="task-head"><h2>${correct}/${order.length}</h2><p>התרגול הסתיים</p><button class="primary" data-restart>תרגול נוסף</button></div>`;saveProgress({listen:true});panel.querySelector('[data-restart]').onclick=renderListen;return}
  const answer=order[index][0],pool=shuffle([order[index],...shuffle(u.words.filter(x=>x[0]!==answer)).slice(0,3)]);
  panel.querySelector('.choices').innerHTML=pool.map(([w])=>`<button class="choice">${esc(w)}</button>`).join('');panel.querySelector('.feedback').textContent='';panel.querySelector('.counter').textContent=`${index+1} מתוך ${order.length}`;
  panel.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{panel.querySelectorAll('.choice').forEach(x=>x.disabled=true);if(b.textContent===answer){b.classList.add('correct');correct++;panel.querySelector('.feedback').textContent='נכון'}else{b.classList.add('wrong');[...panel.querySelectorAll('.choice')].find(x=>x.textContent===answer)?.classList.add('correct');panel.querySelector('.feedback').textContent='ננסה שוב בהמשך'}setTimeout(()=>{index++;show();play()},850)});setTimeout(play,300)}
 show();
}

function renderSelfRead(isTransfer){
 const panel=$(isTransfer?'#transferPanel':'#readPanel'),items=shuffle(isTransfer?current().transfer:current().words);let index=0,good=0;
 panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>${isTransfer?'מילים חדשות':'קריאה עצמאית'}</h2><p>${isTransfer?'אותו דפוס במילים שלא היו בכרטיסיות':'קוראים לפני שלוחצים על בדיקה'}</p></div><div class="task-card"><div class="big-read"></div><div class="reveal"></div><div class="self-actions"><button class="secondary" data-reveal>בדיקה והשמעה</button></div><div class="counter"></div></div></div>`;
 function show(){if(index>=items.length){panel.querySelector('.task-card').innerHTML=`<div class="task-head"><h2>${good}/${items.length}</h2><p>דיווח הקריאה הושלם</p><button class="primary" data-restart>סבב נוסף</button></div>`;saveProgress({[isTransfer?'transfer':'read']:true});panel.querySelector('[data-restart]').onclick=()=>renderSelfRead(isTransfer);return}
  const [w]=items[index];panel.querySelector('.big-read').textContent=w;panel.querySelector('.reveal').textContent='';panel.querySelector('.self-actions').innerHTML='<button class="secondary" data-reveal>בדיקה והשמעה</button>';panel.querySelector('.counter').textContent=`${index+1} מתוך ${items.length}`;
  panel.querySelector('[data-reveal]').onclick=()=>{const [word,he]=items[index];panel.querySelector('.reveal').textContent=he;speak(word,.8);panel.querySelector('.self-actions').innerHTML='<button class="good" data-good>קראתי נכון</button><button class="again" data-again>צריך עוד תרגול</button>';panel.querySelector('[data-good]').onclick=()=>{good++;index++;show()};panel.querySelector('[data-again]').onclick=()=>{index++;show()}};
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
 const panel=$('#checkPanel'),u=current(),items=shuffle([...shuffle(u.words).slice(0,5),...u.transfer]);let index=0,accurate=0;
 panel.innerHTML=`<div class="panel-pad"><div class="task-head"><h2>בדיקת שליטה</h2><p>חמש מילים מוכרות וחמש מילות העברה</p></div><div class="task-card"><div class="big-read"></div><div class="reveal"></div><div class="self-actions"></div><div class="counter"></div></div></div>`;
 function show(){if(index>=items.length){const pct=Math.round(accurate/items.length*100),pass=pct>=80;panel.querySelector('.task-card').innerHTML=`<div class="mastery-grid"><div class="metric"><strong>${accurate}/${items.length}</strong>דיוק</div><div class="metric"><strong>${pct}%</strong>קריאה</div><div class="metric"><strong>${pass?'עבר':'לתרגל'}</strong>יעד 80%</div></div><div class="mastery-result ${pass?'pass':''}">${pass?'הושג יעד הקריאה במילים. מומלץ לבדוק שוב בעוד כמה ימים.':'מומלץ לחזור לכרטיסיות ולמילות ההעברה.'}</div><div class="cover-actions"><button class="secondary" data-retry>בדיקה חוזרת</button><button class="primary" data-next-lesson>לשיעור הבא</button></div><p class="free-note">הבדיקה אינה נועלת רמות או שיעורים.</p>`;saveProgress({check:pass,score:pct,date:new Date().toISOString()});panel.querySelector('[data-retry]').onclick=renderCheck;panel.querySelector('[data-next-lesson]').onclick=()=>lessonMove(1);return}
  const [w,h]=items[index];panel.querySelector('.big-read').textContent=w;panel.querySelector('.reveal').textContent='';panel.querySelector('.self-actions').innerHTML='<button class="secondary" data-check-reveal>בדיקה</button>';panel.querySelector('.counter').textContent=`${index+1} מתוך ${items.length}`;panel.querySelector('[data-check-reveal]').onclick=()=>{panel.querySelector('.reveal').textContent=h;speak(w,.8);panel.querySelector('.self-actions').innerHTML='<button class="good" data-check-good>נכון</button><button class="again" data-check-again>לא נכון</button>';panel.querySelector('[data-check-good]').onclick=()=>{accurate++;index++;show()};panel.querySelector('[data-check-again]').onclick=()=>{index++;show()}};
 }
 show();
}

window.addEventListener('beforeunload',stopSpeech);document.addEventListener('keydown',e=>{if(mode==='cards'&&e.key==='ArrowLeft')goCard(cardIndex-1);if(mode==='cards'&&e.key==='ArrowRight')goCard(cardIndex+1)});speechSynthesis.getVoices();setupSelectors();renderAll();
})();
