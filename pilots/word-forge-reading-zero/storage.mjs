export const STORAGE_KEY='efn:wf-reading-zero:pilot:v1';
export class PilotStorage {
  constructor(storage){this.storage=storage;this.raw=null;this.problem=null;this.blocked=false;this.revision=0;}
  load(){try{this.raw=this.storage.getItem(STORAGE_KEY);}catch{this.problem='unavailable';return null;}
    try{if(this.raw===null)return null;
      if(this.raw.length>2000000)throw Error('large');const saved=JSON.parse(this.raw);
      if(!saved||saved.schemaVersion!==1||Object.keys(saved).sort().join(',')!=='revision,schemaVersion,snapshot'||!Number.isSafeInteger(saved.revision)||saved.revision<1)throw Error('schema');
      this.revision=saved.revision;return saved.snapshot;
    }catch{this.problem='invalid';this.blocked=true;return null;}}
  invalidate(){this.problem='invalid';this.blocked=true;}
  current(){try{if(this.blocked)return false;if(this.storage.getItem(STORAGE_KEY)!==this.raw){this.problem='conflict';this.blocked=true;return false;}return true;}
    catch{this.problem='unavailable';return true;}}
  save(snapshot){if(this.blocked)return false;if(!this.current())return false;
    try{const raw=JSON.stringify({schemaVersion:1,revision:this.revision+1,snapshot});this.storage.setItem(STORAGE_KEY,raw);this.raw=raw;this.revision++;this.problem=null;return true;}
    catch{this.problem='unavailable';return false;}}
  // Only explicit UI reset may replace an unreadable saved pilot. No legacy keys.
  reset(){try{this.storage.removeItem(STORAGE_KEY);this.raw=null;this.revision=0;this.blocked=false;this.problem=null;return true;}catch{this.problem='unavailable';return false;}}
}
