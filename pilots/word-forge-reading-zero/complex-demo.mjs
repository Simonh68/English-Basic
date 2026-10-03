// Supported demonstration only. No engine events, mastery, coins or storage.
export function setupComplexDemo({beforeOpen,afterClose,host=document.body,synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance}={}){
  const app=document.getElementById('app');
  const launch=document.createElement('button');launch.className='complex-launch';launch.textContent='🧩 מילה מורכבת';launch.setAttribute('aria-label','פתיחת הדגמת מילה מורכבת');app.insertBefore(launch,document.getElementById('word-goal')); 
  const panel=document.createElement('section');panel.className='complex-demo';panel.hidden=true;panel.setAttribute('aria-label','הדגמת מילה מורכבת');host.append(panel);
  let phase='GOAL',index=0,heard=false,busy=false,error='',serial=0,timer,current;
  const groups=['th','ough','t'];
  const scene=kind=>`<svg viewBox="0 0 300 160" role="img" aria-label="${kind==='think'?'אדם חושב איך להתאים חלק לפאזל':kind==='sleep'?'אדם ישן במיטה':'אדם אוכל תפוח'}"><rect x="5" y="5" width="290" height="150" rx="20" fill="#203d4a"/><circle cx=" seventy" cy="75" r="23" fill="#75e2c5"/><path d="M70 98V139M70 111L42 134M70 111L105 124" stroke="#75e2c5" stroke-width="12" stroke-linecap="round"/>${kind==='think'?'<path d="M141 18H267Q281 18 281 35V81Q281 98 265 98H144Q127 98 127 81V35Q127 18 141 18Z" fill="#fff2cf"/><circle cx="113" cy="103" r="8" fill="#fff2cf"/><circle cx="99" cy="115" r="5" fill="#fff2cf"/><path d="M155 40H191V73H155ZM211 40H247V73H211Z" fill="#b68442"/><path d="M182 51H202M196 45L202 51L196 57" stroke="#203d4a" stroke-width="3" fill="none"/>':kind==='sleep'?'<path d="M102 105H265V137H102Z" fill="#f1cb7f"/><text x="180" y="65" fill="#fff2cf" font-size="35">Z z</text>':'<circle cx="134" cy="104" r="19" fill="#ed8878"/><path d="M133 86L140 74" stroke="#75e2c5" stroke-width="6"/>'}</svg>`.replace('cx=" seventy"','cx="70"');
  function stop(){serial++;clearTimeout(timer);busy=false;current=null;synth?.cancel();}
  function control(label,text,fn,disabled=false){const b=document.createElement('button');b.setAttribute('aria-label',label);b.innerHTML=text;b.disabled=disabled;b.onclick=fn;panel.append(b);return b;}
  function voice(){return synth?.getVoices().find(v=>/^en-US\b/i.test(v.lang))||synth?.getVoices().find(v=>/^en\b/i.test(v.lang));}
  function speak(){
    if(busy)return;const chosen=voice();if(!chosen||!Utterance){error='אין כרגע קול אנגלי במכשיר. אפשר לנסות שוב או לחזור לסדנה.';render();return;}
    stop();const token=serial;busy=true;error='';render();const u=new Utterance('thought');current=u;u.lang=chosen.lang;u.voice=chosen;u.rate=.8;
    const finish=ok=>{if(token!==serial)return;clearTimeout(timer);busy=false;current=null;if(ok)heard=true;else error='השמע לא הושלם. לחצו על הרמקול לנסות שוב.';render();};
    u.onend=()=>finish(true);u.onerror=()=>finish(false);timer=setTimeout(()=>{stop();error='השמע לא הושלם. נסו שוב.';render();},15000);
    try{synth.speak(u);}catch{finish(false);}
  }
  function render(){
    panel.replaceChildren();const heading=document.createElement('h1');heading.textContent=phase==='DONE'?'✓ בנית מילה!':'🧩 מילה מורכבת';panel.append(heading);
    const picture=document.createElement('div');picture.className='complex-scene';picture.innerHTML=scene('think');panel.append(picture);
    const caption=document.createElement('p');caption.dir='rtl';caption.textContent='חשב — הוא חשב איך להתאים את החלק.';panel.append(caption);
    if(phase!=='GOAL'){
      const slots=document.createElement('div');slots.className='complex-slots';slots.dir='ltr';slots.setAttribute('aria-label','שלוש קבוצות אותיות');
      groups.forEach((g,i)=>{const s=document.createElement('span');s.textContent=i<index||phase==='DONE'?g:phase==='BUILD'&&i===index?g:'·';s.className=i===index&&phase==='BUILD'?'group-target':'';slots.append(s);});panel.append(slots);
    }
    control(phase==='DONE'?'השמעת המילה thought':'השמעת המטרה בלי כתיב',`🔊 <small>${busy?'מקשיבים…':phase==='DONE'?'thought — השמעת המילה':'הקשיבו למילה'}</small>`,speak,busy);
    if(phase==='GOAL'&&heard&&!busy)control('בניית המילה המורכבת','🧩 <small>בואו נבנה</small>',()=>{phase='BUILD';render();});
    if(phase==='BUILD'){
      const choices=document.createElement('div');choices.className='complex-choices';choices.dir='ltr';panel.append(choices);
      ['ough','t','th'].forEach(g=>{const b=document.createElement('button');b.textContent=g;b.setAttribute('aria-label',`קבוצת אותיות ${g}`);b.disabled=busy;b.onclick=()=>{if(g!==groups[index]){error='↶';render();return;}error='';index++;if(index===3)phase='MEANING';render();};choices.append(b);});
    }
    if(phase==='MEANING'){
      const q=document.createElement('p');q.textContent='מי חשב?';panel.append(q);
      const choices=document.createElement('div');choices.className='complex-meanings';panel.append(choices);
      ['sleep','think','eat'].forEach(kind=>{const b=document.createElement('button');b.innerHTML=scene(kind);b.setAttribute('aria-label',kind==='think'?'אדם חושב':kind==='sleep'?'אדם ישן':'אדם אוכל');b.disabled=busy;b.onclick=()=>{if(kind==='think'){phase='DONE';error='';}else error='↶';render();};choices.append(b);});
    }
    if(phase==='DONE')control('הדגמה חוזרת','↶ <small>שוב</small>',()=>{stop();phase='GOAL';index=0;heard=false;error='';render();});
    if(error){const msg=document.createElement('p');msg.setAttribute('role','alert');msg.textContent=error;panel.append(msg);}
    control('חזרה לסדנה','← <small>חזרה לסדנה</small>',close);
    panel.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  function close(){stop();panel.hidden=true;app.hidden=false;afterClose?.();launch.focus({preventScroll:true});}
  launch.onclick=()=>{beforeOpen?.();stop();phase='GOAL';index=0;heard=false;error='';app.hidden=true;panel.hidden=false;render();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!panel.hidden){stop();error='הפעילות הושהתה. לחצו על הרמקול כדי להמשיך.';render();}});
  window.addEventListener('pagehide',stop);
  return {open:()=>launch.click(),close};
}
