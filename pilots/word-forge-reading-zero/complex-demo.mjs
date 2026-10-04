import {glyph,assemblyPicture,worldPicture,rewardTrail} from './build-world.mjs';
import {AudioPlayer} from './audio-player.mjs';
// Supported demonstration; world cosmetics only, no engine events/mastery/coins.
export function setupComplexDemo({beforeOpen,afterClose,host=document.body,world,onWorld,createAudio=path=>new Audio(path)}={}){
  const app=document.getElementById('app');
  const launch=document.createElement('button');launch.className='complex-launch';launch.innerHTML=glyph('puzzle');launch.setAttribute('aria-label','פתיחת הדגמת מילה מורכבת');if(app.querySelector('.tools'))app.querySelector('.tools').append(launch);else app.insertBefore(launch,document.getElementById('word-goal')); 
  const panel=document.createElement('section');panel.className='complex-demo';panel.hidden=true;panel.setAttribute('aria-label','הדגמת מילה מורכבת');host.append(panel);
  let phase='GOAL',index=0,heard=false,busy=false,error='',serial=0,buildId=null;
  const groups=['th','ough','t'];
  const scene=kind=>`<svg viewBox="0 0 300 160" role="img" aria-label="${kind==='think'?'אדם חושב איך להתאים חלק לפאזל':kind==='sleep'?'אדם ישן במיטה':'אדם אוכל תפוח'}"><rect x="5" y="5" width="290" height="150" rx="20" fill="#203d4a"/><circle cx=" seventy" cy="75" r="23" fill="#75e2c5"/><path d="M70 98V139M70 111L42 134M70 111L105 124" stroke="#75e2c5" stroke-width="12" stroke-linecap="round"/>${kind==='think'?'<path d="M141 18H267Q281 18 281 35V81Q281 98 265 98H144Q127 98 127 81V35Q127 18 141 18Z" fill="#fff2cf"/><circle cx="113" cy="103" r="8" fill="#fff2cf"/><circle cx="99" cy="115" r="5" fill="#fff2cf"/><path d="M146 40H159Q157 31 165 31Q173 31 171 40H183V53Q192 51 192 59Q192 67 183 65V78H146Z" fill="#d99b47" stroke="#b97834" stroke-width="2"/><rect x="222" y="34" width="44" height="49" rx="7" fill="#6ccdad"/><path d="M222 48H232Q230 40 237 40Q244 40 242 48H252V60Q260 58 260 65Q260 72 252 70V81H222Z" fill="#203d4a"/><path d="M195 58H214M207 51L214 58L207 65" stroke="#203d4a" stroke-width="3" fill="none"/>':kind==='sleep'?'<path d="M102 105H265V137H102Z" fill="#f1cb7f"/><text x="180" y="65" fill="#fff2cf" font-size="35">Z z</text>':'<circle cx="134" cy="104" r="19" fill="#ed8878"/><path d="M133 86L140 74" stroke="#75e2c5" stroke-width="6"/>'}</svg>`.replace('cx=" seventy"','cx="70"');
  const audio=new AudioPlayer({paths:{THOUGHT:'audio/complex-word/thought.wav'},create:createAudio});
  function stop(){serial++;busy=false;audio.stop();}
  function control(label,text,fn,disabled=false){const b=document.createElement('button');b.setAttribute('aria-label',label);b.innerHTML=text;b.disabled=disabled;b.onclick=fn;if(label==='השמעת המטרה בלי כתיב'||label==='בניית המילה המורכבת'){b.classList.add('primary');if(!heard&&!busy)b.classList.add('demo');}panel.append(b);return b;}
  async function speak(){
    if(busy)return;stop();const token=serial;busy=true;error='';render();
    const ok=await audio.play('THOUGHT');if(token!==serial)return;
    busy=false;if(ok)heard=true;else error='השמע לא הושלם. לחצו על הרמקול לנסות שוב.';render();
  }
  function render(){
    panel.dataset.stage=phase;panel.replaceChildren();const steps=document.createElement('div');steps.className='build-steps';steps.dir='ltr';steps.setAttribute('aria-label','לשמוע, לבנות, להתאים משמעות, לאסוף');const active=['GOAL','BUILD','MEANING','DONE'].indexOf(phase);steps.innerHTML=['sound','build','check','map'].map((name,i)=>`<span class="${i===active?'current':i<active?'complete':''}">${glyph(name)}</span>${i<3?glyph('next'):''}`).join('');panel.append(steps);const heading=document.createElement('h1');heading.innerHTML=glyph(phase==='DONE'?'check':'puzzle');panel.append(heading);
    const picture=document.createElement('div');picture.className='complex-scene';picture.innerHTML=scene('think');panel.append(picture);
    const machine=document.createElement('div');machine.className='complex-machine';machine.innerHTML=assemblyPicture(phase==='DONE'?4:index);panel.append(machine);
    if(phase!=='GOAL'){
      const slots=document.createElement('div');slots.className='complex-slots';slots.dir='ltr';slots.setAttribute('aria-label','שלוש קבוצות אותיות');
      groups.forEach((g,i)=>{const s=document.createElement('span');s.textContent=i<index||phase==='DONE'?g:phase==='BUILD'&&i===index?g:'·';s.className=i===index&&phase==='BUILD'?'group-target':'';slots.append(s);});panel.append(slots);
    }
    const speaker=control(phase==='DONE'?'השמעת המילה thought':'השמעת המטרה בלי כתיב',(phase==='DONE'?'<span lang="en" dir="ltr">thought</span> ':'')+glyph('sound'),speak,busy);speaker.classList.toggle('primary',phase==='DONE'||(phase==='GOAL'&&!heard));speaker.classList.toggle('listening',busy);
    if(phase==='GOAL'&&heard&&!busy)control('בניית המילה המורכבת',glyph('build')+glyph('next'),()=>{phase='BUILD';render();});
    if(phase==='BUILD'){
      const choices=document.createElement('div');choices.className='complex-choices';choices.dir='ltr';panel.append(choices);
      ['ough','t','th'].forEach(g=>{const b=document.createElement('button');b.textContent=g;b.setAttribute('aria-label',`קבוצת אותיות ${g}`);b.disabled=busy;b.onclick=()=>{if(g!==groups[index]){error='↶';render();return;}error='';index++;if(index===3)phase='MEANING';render();};choices.append(b);});
    }
    if(phase==='MEANING'){
      const q=document.createElement('div');q.className='meaning-cue';q.innerHTML=glyph('check');q.setAttribute('aria-label','בחרו את התמונה המתאימה למילה');panel.append(q);
      const choices=document.createElement('div');choices.className='complex-meanings';panel.append(choices);
      ['sleep','think','eat'].forEach(kind=>{const b=document.createElement('button');b.innerHTML=scene(kind);b.setAttribute('aria-label',kind==='think'?'אדם חושב':kind==='sleep'?'אדם ישן':'אדם אוכל');b.disabled=busy;b.onclick=()=>{if(kind==='think'){phase='DONE';error='';world?.award(buildId,'thought');}else error='↶';render();};choices.append(b);});
    }
    if(phase==='DONE'){control('הפעלת המכונה המורכבת',glyph('power'),()=>{panel.querySelector('.assembly').classList.toggle('running');});if(world){const owned=document.createElement('button');owned.className='world-preview';owned.setAttribute('aria-label','המכונה שלך בסדנה');owned.innerHTML=worldPicture(world,true)+glyph('map')+rewardTrail(world);owned.onclick=()=>{close();onWorld?.();};panel.append(owned);}control('הדגמה חוזרת',glyph('build')+glyph('next'),()=>{stop();phase='GOAL';index=0;heard=false;error='';buildId=world?.startComplex();render();},false).classList.add('primary','demo');}
    if(error){const msg=document.createElement('p');msg.setAttribute('role','alert');msg.setAttribute('aria-label',error);msg.innerHTML=glyph('retry')+glyph('sound');panel.append(msg);}
    control('חזרה לסדנה',glyph('back'),close);
    const credit=document.createElement('small');credit.className='audio-credit';credit.innerHTML='<a href="https://commons.wikimedia.org/wiki/File:En-us-thought.ogg" target="_blank" rel="noopener">Audio: Dvortygirl</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a> · WAV conversion';panel.append(credit);
    panel.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  function close(){stop();panel.hidden=true;app.hidden=false;afterClose?.();launch.focus({preventScroll:true});}
  launch.onclick=()=>{beforeOpen?.();stop();phase='GOAL';index=0;heard=false;error='';buildId=world?.startComplex();app.hidden=true;panel.hidden=false;render();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!panel.hidden){stop();error='הפעילות הושהתה. לחצו על הרמקול כדי להמשיך.';render();}});
  window.addEventListener('pagehide',stop);
  return {open:()=>launch.click(),close};
}
