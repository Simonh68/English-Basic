import {LearningEngine} from './learning-engine.mjs';
// Replay only engine operations, never a chosen answer or an inferred mastery.
const operations=['newSession','completeTeachingBlock','expose','begin','playOption','support','respond','abandon'];
export class RecordedLearning {
  constructor(spec,{clock=()=>Date.now(),journal=[]}={}){
    this.clock=clock;this.time=null;this.journal=[];
    this.engine=new LearningEngine(spec,{clock:()=>this.time??this.clock()});
    if(!Array.isArray(journal)||journal.length>20000)throw Error('Invalid learning journal');
    for(const event of journal){
      if(!event||Object.keys(event).sort().join(',')!=='args,method,time'||!operations.includes(event.method)||!Array.isArray(event.args)||event.args.length>3||!Number.isFinite(event.time)||event.time<0)throw Error('Invalid learning operation');
      this.time=event.time;this.engine[event.method](...structuredClone(event.args));this.journal.push(structuredClone(event));
    }
    this.time=null;
  }
  inspect(){return this.engine.inspect();}
  report(...args){return this.engine.report(...args);}
  availableActivities(){return this.engine.availableActivities();}
  nextPractice(){return this.engine.nextPractice();}
  snapshot(){return structuredClone(this.journal);}
}
for(const method of operations)RecordedLearning.prototype[method]=function(...args){
  const time=this.clock();this.time=time;
  try{const result=this.engine[method](...args);this.journal.push({method,args:structuredClone(args),time});return result;}
  finally{this.time=null;}
};
