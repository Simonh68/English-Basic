import {RecordedLearning} from './recorded-learning.mjs';
import {Rewards} from './rewards.mjs';
import {mappings, assets} from './learning-content.mjs';
export const letters = Object.freeze(Object.fromEntries(mappings.map((id,i)=>[id,['m','s','a','t'][i]])));
// Four construction steps are product progress, never a learning gate.
export class MachineSession {
  constructor(spec,{random=Math.random,clock,snapshot}={}) {
    this.spec=spec;this.clock=clock;this.engine=new RecordedLearning(spec,{clock}); this.random=random;this.rewards=new Rewards();this.round=1;
    this.phase='READY'; this.connections=0; this.index=0; this.taughtIndex=0;
    this.task=null; this.encounter=null; this.heard=new Set(); this.selected=null;
    this.supportedErrors=0; this.reviewed=new Set(); this.practiceCount=0; this.lastEvent=null;this.previous=null;
    if(snapshot)this.restore(snapshot);
  }
  start(){if(this.phase!=='READY')return false; this.phase='TEACH';return true;}
  teachingItem(){return mappings[this.taughtIndex];}
  teachHeard(id){if(this.phase!=='TEACH'||id!==this.teachingItem())return false;
    this.engine.completeTeachingBlock(`intro:${id}`,id,{learnerActed:true});
    this.taughtIndex++;
    // m and s are introduced separately before any controlled two-choice task.
    if(this.taughtIndex<2)return true;
    if(this.taughtIndex<=this.index)this.phase='TEACH'; else this.open(mappings[this.index],'sound_to_letter');
    return true;
  }
  open(item,family='sound_to_letter',review=false){
    const task=this.engine.availableActivities().find(t=>t.itemId===item&&t.family===family);
    if(!task)throw Error('Unavailable controlled activity');
    const taught=this.engine.inspect().taught;
    const distractor=taught.find(id=>id!==item);
    let options=[item,distractor];if(this.random()<.5)options.reverse();
    this.task={...task,options,review};this.encounter=this.engine.begin(task.id,{optionCount:2,optionItemIds:options}).encounterId;
    this.supportedErrors=0;this.phase='PROMPT';this.heard.clear();this.selected=null;this.lastEvent=null;
  }
  heardAudio(id){if(!['PROMPT','SUPPORT'].includes(this.phase))return false;this.heard.add(id);return true;}
  optionAudio(id){if(!['PROMPT','SUPPORT'].includes(this.phase)||!this.task.options.includes(id))return false;
    this.engine.playOption(this.encounter,id);return true;}
  help(){if(this.phase!=='PROMPT')return false;this.engine.support(this.encounter,'hint');this.phase='SUPPORT';return true;}
  choose(id){if(!['PROMPT','SUPPORT'].includes(this.phase)||!this.task.options.includes(id))return false;
    if(this.task.family==='sound_to_letter'&&!this.heard.has(this.task.itemId))return false;
    if(this.task.family==='letter_to_sound'&&!this.task.options.every(x=>this.heard.has(x)))return false;
    if(this.task.family==='letter_to_sound'){this.selected=id;return true;}return this.resolve(id);}
  confirm(){if(!this.selected)return false;return this.resolve(this.selected);}
  resolve(id){if(!['PROMPT','SUPPORT'].includes(this.phase))return false;
    this.lastEvent=this.engine.respond(this.encounter,id===this.task.itemId);
    if(this.lastEvent.correct){this.rewards.settle(this.lastEvent);if(!this.task.review){this.connections++;this.index++;}
      else {this.practiceCount++;if(this.lastEvent.independent)this.reviewed.add(this.task.itemId);}
      this.phase='SUCCESS';this.rewardWordShown();
    }else{this.engine.support(this.encounter,'correction');if(!this.lastEvent.first)this.supportedErrors++;this.phase=this.supportedErrors>=3?'REST':'ERROR';this.selected=null;}
    return true;
  }
  familiar(){if(this.phase!=='REST')return false;const {itemId,review}=this.task;this.engine.abandon(this.encounter);this.open(itemId,'visual_match',review);return true;}
  correction(){if(this.phase!=='ERROR')return false;this.phase='SUPPORT';return true;}
  next(){if(this.phase!=='SUCCESS')return false;
    if(this.connections<4){if(this.taughtIndex<=this.index){this.phase='TEACH';return true;}
      this.open(mappings[this.index],this.round%2===0?'letter_to_sound':'sound_to_letter');return true;}
    // Delayed correction uses a different direction. Three intervening outcomes
    // are required; filler practice cannot create extra machine connections.
    const state=this.engine.inspect();const debt=state.review.find(r=>!this.reviewed.has(r.itemId));
    if(!debt||this.practiceCount>=8){this.phase='COMPLETE';return true;}
    const other=state.responses.filter(r=>r.id>debt.after&&r.itemId!==debt.itemId).length;
    const item=other>=3?debt.itemId:mappings.filter(x=>x!==debt.itemId)[this.practiceCount%3];
    this.open(item,'letter_to_sound',true);return true;
  }
  rewardWordAvailable(){return this.connections===4&&['SUCCESS','COMPLETE','FINISHED'].includes(this.phase);}
  rewardWordShown(){if(!this.rewardWordAvailable()||this.engine.inspect().exposure['RZ-W-MAT']?.written)return false;this.engine.expose('RZ-W-MAT','written');return true;}
  rewardAudioAllowed(id){
    if(this.phase==='SUCCESS'&&id===this.task.itemId)return true;
    return this.rewardWordAvailable()&&['RZ-W-MAT','RZ-G-M','RZ-G-A-AE','RZ-G-T'].includes(id);
  }
  rewardHeard(id){if(!this.rewardAudioAllowed(id))return false;if(!this.engine.inspect().exposure[id]?.audio)this.engine.expose(id,'audio');return true;}
  pause(){if(this.phase==='PAUSED')return false;this.previous=this.phase;this.phase='PAUSED';return true;}
  resume(){if(this.phase!=='PAUSED')return false;this.phase=this.previous;return true;}
  dispose(){if(this.engine.inspect().pending)this.engine.abandon(this.encounter);this.phase='STOPPED';}
  buyPart(id){return this.phase==='COMPLETE'&&this.rewards.buy(id);}
  continueRound(){if(this.phase!=='COMPLETE')return false;this.engine.newSession();this.round++;this.connections=0;this.index=0;this.practiceCount=0;this.reviewed.clear();this.lastEvent=null;this.open(mappings[0],this.round%2===0?'letter_to_sound':'sound_to_letter');return true;}
  finish(){if(this.phase!=='COMPLETE')return false;this.phase='FINISHED';return true;}
  reopen(){if(this.phase!=='FINISHED')return false;this.phase='COMPLETE';return true;}
  snapshot(){return {version:1,learning:this.engine.snapshot(),rewards:this.rewards.snapshot(),session:{phase:this.phase,previous:this.previous,connections:this.connections,index:this.index,taughtIndex:this.taughtIndex,task:this.task,encounter:this.encounter,supportedErrors:this.supportedErrors,reviewed:[...this.reviewed],practiceCount:this.practiceCount,round:this.round,lastEvent:this.lastEvent}};}
  restore(saved){
    const fail=()=>{throw Error('Invalid saved pilot');};
    if(!saved||Object.keys(saved).sort().join(',')!=='learning,rewards,session,version'||saved.version!==1)fail();
    const phases=['READY','TEACH','PROMPT','SUPPORT','ERROR','REST','SUCCESS','COMPLETE','PAUSED','STOPPED','FINISHED'];
    const s=saved.session;
    const expected=['phase','previous','connections','index','taughtIndex','task','encounter','supportedErrors','reviewed','practiceCount','round','lastEvent'];
    if(!s||Object.keys(s).sort().join(',')!==expected.sort().join(',')||!phases.includes(s.phase)||(s.previous!==null&&!phases.includes(s.previous)))fail();
    for(const key of ['connections','index','taughtIndex','supportedErrors','practiceCount','round'])if(!Number.isSafeInteger(s[key])||s[key]<0)fail();
    if(s.connections>4||s.index!==s.connections||s.taughtIndex>4||s.round<1||!Array.isArray(s.reviewed)||s.reviewed.some(id=>!mappings.includes(id)))fail();
    const engine=new RecordedLearning(this.spec,{clock:this.clock,journal:saved.learning});const state=engine.inspect();
    if(state.taught.length!==s.taughtIndex)fail();
    if(s.task){const canonical=engine.availableActivities().find(t=>t.id===s.task.id);if(!canonical||JSON.stringify(canonical)!==JSON.stringify(Object.fromEntries(Object.entries(s.task).filter(([k])=>!['options','review'].includes(k))))||typeof s.task.review!=='boolean'||!Array.isArray(s.task.options)||s.task.options.length!==2||new Set(s.task.options).size!==2||!s.task.options.includes(s.task.itemId)||s.task.options.some(id=>!state.taught.includes(id)))fail();}
    const active=s.phase==='PAUSED'?s.previous:s.phase;
    if(active==='PAUSED'||!active||(active==='TEACH'&&s.taughtIndex>=4)||(active==='READY'&&(s.taughtIndex||s.connections))||(['COMPLETE','FINISHED'].includes(active)&&s.connections!==4))fail();
    if(['PROMPT','SUPPORT','ERROR','REST'].includes(active)){if(!state.pending||state.pending.id!==s.encounter||state.pending.task.id!==s.task?.id||JSON.stringify(state.pending.options)!==JSON.stringify(s.task.options))fail();}
    else if(state.pending)fail();
    if(s.lastEvent&&JSON.stringify(state.outcomes.at(-1))!==JSON.stringify(s.lastEvent))fail();
    const rewards=new Rewards(saved.rewards);
    for(const [id,amount] of Object.entries(rewards.state.settled)){const event=state.outcomes.find(e=>e.id===Number(id)&&e.correct);if(!event||amount!==(event.skill&&event.first&&event.independent?2:1))fail();}
    const completed=state.outcomes.filter(e=>e.correct);if(completed.some(e=>!Object.hasOwn(rewards.state.settled,e.id)))fail();
    Object.assign(this,s);this.engine=engine;this.rewards=rewards;this.reviewed=new Set(s.reviewed);this.heard=new Set();this.selected=null;
    // No automatic audio after reload. Pending support and option order persist.
  }
  audioPath(id){return assets[id];}
}
