import {assets} from './learning-content.mjs';
export class AudioPlayer {
  constructor({create=path=>new Audio(path),onProgress=()=>{},onError=()=>{}}={}){this.create=create;this.onProgress=onProgress;this.onError=onError;this.serial=0;this.current=null;this.cancel=null;}
  stop(){this.serial++;this.cancel?.();this.cancel=null;if(this.current){this.current.pause();this.current.removeAttribute('src');this.current.load();this.current=null;}this.onProgress(0);}
  play(id){if(!assets[id])return Promise.resolve(false);this.stop();const token=this.serial;const audio=this.create(assets[id]);this.current=audio;
    return new Promise(resolve=>{
      let settled=false;const timer=setTimeout(()=>finish(false),15000);
      const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(token!==this.serial){resolve(false);return;}this.current=null;this.cancel=null;this.onProgress(0);if(!ok){audio.pause();this.onError();}resolve(ok);};
      audio.onended=()=>finish(true);audio.onerror=()=>finish(false);
      audio.ontimeupdate=()=>{if(token===this.serial&&audio.duration)this.onProgress(audio.currentTime/audio.duration);};
      // Cancellation also settles the caller, so stale completion never teaches.
      const cancel=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve(false);};this.cancel=cancel;
      // Browsers fire pause immediately before ended at a natural endpoint.
      // That is successful listening, not user cancellation.
      audio.onpause=()=>{if(!audio.ended)cancel();};
      // Sustain the accepted /m/ and /s/ without changing their pitch or bytes.
      // Stop consonant /t/ and whole words always retain their original speed.
      audio.preservesPitch=true;
      audio.playbackRate=id==='RZ-G-M'?.25:id==='RZ-G-S'?.5:1;
      Promise.resolve(audio.play()).catch(()=>finish(false));
    });
  }
}
