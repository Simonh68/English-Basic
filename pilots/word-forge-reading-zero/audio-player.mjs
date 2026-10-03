import {assets} from './learning-content.mjs';
export class AudioPlayer {
  constructor({create=path=>new Audio(path),onProgress=()=>{},onError=()=>{}}={}){this.create=create;this.onProgress=onProgress;this.onError=onError;this.serial=0;this.current=null;}
  stop(){this.serial++;if(this.current){this.current.pause();this.current.removeAttribute('src');this.current.load();this.current=null;}this.onProgress(0);}
  play(id){if(!assets[id])return Promise.resolve(false);this.stop();const token=this.serial;const audio=this.create(assets[id]);this.current=audio;
    return new Promise(resolve=>{
      const finish=ok=>{if(token!==this.serial){resolve(false);return;}this.current=null;this.onProgress(0);if(!ok)this.onError();resolve(ok);};
      audio.onended=()=>finish(true);audio.onerror=()=>finish(false);
      audio.ontimeupdate=()=>{if(token===this.serial&&audio.duration)this.onProgress(audio.currentTime/audio.duration);};
      // Cancellation also settles the caller, so stale completion never teaches.
      const cancel=()=>{resolve(false);};
      audio.onpause=cancel;
      Promise.resolve(audio.play()).catch(()=>finish(false));
    });
  }
}
