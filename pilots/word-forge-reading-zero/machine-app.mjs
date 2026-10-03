import {MachineSession,letters} from './session-controller.mjs';
import {AudioPlayer} from './audio-player.mjs';
const $=id=>document.getElementById(id);
const shapes={sound:'M11 5L5 10H2V18H5L11 23ZM16 8Q24 14 16 20M15 12Q18 14 15 16',next:'M8 4L20 14L8 24',help:'M7 5Q2 10 8 15L18 25L23 20L13 10Q16 3 10 2L11 7L7 9Z',pause:'M8 4V24M20 4V24',play:'M8 4L23 14L8 24Z',motion:'M3 9H17M3 15H12M15 4L25 14L15 24',check:'M3 14L10 21L25 5',retry:'M6 7Q24 0 24 15Q24 26 8 24M6 2V10H14',power:'M14 2V14M7 6Q-1 13 6 22Q14 30 23 22Q30 13 21 6'};
function icon(name){return `<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><path d="${shapes[name]}"/></svg>`;}
let session,player,epoch=0,busy=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function button(host,label,name,act,cls='',disabled=false){const b=document.createElement('button');b.setAttribute('aria-label',label);b.title=label;b.className=cls;b.disabled=disabled;b.innerHTML=icon(name);b.addEventListener('click',act);host.append(b);return b;}
function clearAudio(){epoch++;busy=false;player.stop();}
async function play(id,after=()=>{}){
  const token=++epoch;busy=true;$('audio-error').hidden=true;render();
  const ok=await player.play(id);if(token!==epoch)return;
  busy=false;if(ok){session.heardAudio(id);after();}render();
}
function action(fn){clearAudio();fn();render();}
function render(){
  const phase=session.phase;document.body.classList.toggle('paused',phase==='PAUSED');document.body.classList.toggle('reduced',reduced);
  $('machine').classList.toggle('running',phase==='COMPLETE');$('machine').setAttribute('aria-label',`מכונה: ${session.connections} מתוך ארבעה חיבורים מותקנים`);
  $('connections').innerHTML=Array.from({length:4},(_,i)=>`<circle class="connection ${i<session.connections?'on':''}" cx="${40+i*60}" cy="${i%2?115:75}" r="13"/>`).join('');
  $('dots').innerHTML=Array.from({length:4},(_,i)=>`<span class="dot ${i<session.connections?'on':''}"></span>`).join('');
  $('pause').innerHTML=icon(phase==='PAUSED'?'play':'pause');$('pause').setAttribute('aria-label',phase==='PAUSED'?'חזרה לפעילות':'השהיה');
  $('motion').innerHTML=icon('motion');$('motion').setAttribute('aria-pressed',String(reduced));
  const prompt=$('prompt'),choices=$('choices'),actions=$('actions');prompt.replaceChildren();choices.replaceChildren();actions.replaceChildren();
  $('signal').className='signal';$('signal').textContent='';
  if(phase==='READY')button(prompt,'התחלת הדגמת מגע וצליל','play',()=>action(()=>session.start()),'primary demo');
  if(phase==='TEACH'){
    const id=session.teachingItem();const tile=button(prompt,'נגיעה באריח והשמעת הצליל','sound',()=>play(id,()=>session.teachHeard(id)),'target demo',busy);
    tile.innerHTML=`<span aria-hidden="true">${letters[id]}</span> ${icon('sound')}`;
    const rail=document.createElement('div');rail.className='rail';rail.innerHTML='<span id="audio-progress"></span>';actions.append(rail);
  }
  if(['PROMPT','SUPPORT','ERROR'].includes(phase)){
    const task=session.task;const auditory=task.family==='sound_to_letter';const visual=task.family==='visual_match';
    if(auditory)button(prompt,'השמעת צליל השאלה','sound',()=>play(task.itemId),'target',busy||phase==='ERROR');
    else {const text=document.createElement('span');text.textContent=letters[task.itemId];text.setAttribute('aria-hidden','true');prompt.append(text);}
    const supported=phase==='SUPPORT';
    if(phase==='ERROR'){
      $('signal').textContent='↶';$('signal').classList.add('error');
      button(actions,'הדגמת תיקון וניסיון נוסף','retry',()=>{action(()=>session.correction());play(task.itemId);},'primary');
    }else{
      for(const [i,id] of task.options.entries()){
        const label=(auditory||visual)?`האות ${letters[id]}`:`השמעת אפשרות ${i+1}`;
        const b=button(choices,label,'sound',()=>{
          if(auditory||visual)action(()=>session.choose(id));
          else {session.optionAudio(id);play(id,()=>session.choose(id));}
        },session.selected===id?'selected':'',busy||(auditory&&!session.heard.has(task.itemId)));
        b.dataset.option=id;
        if(auditory||visual)b.textContent=letters[id];else b.innerHTML=icon('sound');
        if(supported&&id===task.itemId){b.style.borderColor='#efc97b';b.setAttribute('aria-label',label+' — הדגמת הפתרון');}
      }
      if(!auditory&&!visual)button(actions,'אישור בחירת הצליל','check',()=>action(()=>session.confirm()),'primary',busy||!session.selected);
      button(actions,supported?'השמעת העזרה שוב':'עזרה והדגמת הפתרון','help',()=>{if(!supported)session.help();play(task.itemId);},'hint',busy);
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
    button(actions,'המשך לחיבור הבא','next',()=>action(()=>session.next()),'primary');
  }
  if(phase==='COMPLETE'){
    $('signal').textContent='✓';button(prompt,'הפעלת המכונה','power',()=>{
      $('machine').classList.remove('running');requestAnimationFrame(()=>$('machine').classList.add('running'));
    },'primary');
  }
  if(phase==='PAUSED')button(prompt,'חזרה לפעילות','play',()=>action(()=>session.resume()),'primary');
  if(phase==='STOPPED')$('signal').textContent='□';
  // Rendering is synchronous; preserve keyboard access after every transition.
  if(!busy)queueMicrotask(()=>{if(document.activeElement===document.body)(actions.querySelector('button:not(:disabled)')||prompt.querySelector('button:not(:disabled)')||choices.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});});
}
async function init(){
  const response=await fetch('./learning-model.spec.json');if(!response.ok)throw Error('spec');session=new MachineSession(await response.json());
  player=new AudioPlayer({onProgress:p=>{const rail=$('audio-progress');if(rail)rail.style.width=`${p*100}%`;},onError:()=>{$('audio-error').hidden=false;}});
  $('pause').onclick=()=>action(()=>session.phase==='PAUSED'?session.resume():session.pause());
  $('motion').onclick=()=>{reduced=!reduced;render();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearAudio();session.pause();render();}});
  window.addEventListener('pagehide',()=>{clearAudio();});render();
}
init().catch(()=>{$('signal').textContent='לא ניתן לטעון את הפעילות. רעננו כדי לנסות שוב.';});
