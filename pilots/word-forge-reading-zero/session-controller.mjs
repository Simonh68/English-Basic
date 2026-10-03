import {LearningEngine} from './learning-engine.mjs';
import {mappings, assets} from './learning-content.mjs';
export const letters = Object.freeze(Object.fromEntries(mappings.map((id,i)=>[id,['m','s','a','t'][i]])));
// Four construction steps are product progress, never a learning gate.
export class MachineSession {
  constructor(spec,{random=Math.random,clock}={}) {
    this.engine=new LearningEngine(spec,{clock}); this.random=random;
    this.phase='READY'; this.connections=0; this.index=0; this.taughtIndex=0;
    this.task=null; this.encounter=null; this.heard=new Set(); this.selected=null;
    this.supportedErrors=0; this.reviewed=new Set(); this.practiceCount=0; this.lastEvent=null;
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
    if(this.lastEvent.correct){if(!this.task.review){this.connections++;this.index++;}
      else {this.practiceCount++;if(this.lastEvent.independent)this.reviewed.add(this.task.itemId);}
      this.phase='SUCCESS';
    }else{this.engine.support(this.encounter,'correction');if(!this.lastEvent.first)this.supportedErrors++;this.phase=this.supportedErrors>=3?'REST':'ERROR';this.selected=null;}
    return true;
  }
  familiar(){if(this.phase!=='REST')return false;const {itemId,review}=this.task;this.engine.abandon(this.encounter);this.open(itemId,'visual_match',review);return true;}
  correction(){if(this.phase!=='ERROR')return false;this.phase='SUPPORT';return true;}
  next(){if(this.phase!=='SUCCESS')return false;
    if(this.connections<4){if(this.taughtIndex<=this.index){this.phase='TEACH';return true;}
      this.open(mappings[this.index]);return true;}
    // Delayed correction uses a different direction. Three intervening outcomes
    // are required; filler practice cannot create extra machine connections.
    const state=this.engine.inspect();const debt=state.review.find(r=>!this.reviewed.has(r.itemId));
    if(!debt||this.practiceCount>=8){this.phase='COMPLETE';return true;}
    const other=state.responses.filter(r=>r.id>debt.after&&r.itemId!==debt.itemId).length;
    const item=other>=3?debt.itemId:mappings.filter(x=>x!==debt.itemId)[this.practiceCount%3];
    this.open(item,'letter_to_sound',true);return true;
  }
  pause(){if(this.phase==='PAUSED')return false;this.previous=this.phase;this.phase='PAUSED';return true;}
  resume(){if(this.phase!=='PAUSED')return false;this.phase=this.previous;return true;}
  dispose(){if(this.engine.inspect().pending)this.engine.abandon(this.encounter);this.phase='STOPPED';}
  audioPath(id){return assets[id];}
}
