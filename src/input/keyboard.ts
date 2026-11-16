import { GS } from "../core/state";
import { P } from "../config/params";
import { act, down2, up2 } from "../game/movement";
import { endRun, pauseRun, resumeRun, startRun } from "../game/run";
import { onReviveTap } from "../platform/ads";

// KEYBOARD — desktop controls: Q ↖ · E ↗ · A ↙ · D ↘, Esc pauses, Enter confirms, R restarts.
export function initKeyboard(){
  window.addEventListener("keydown",function(e){
    if(e.repeat) return;
    var k=e.key.toLowerCase();
    if(P.four){
      if(k==="q"||k==="arrowleft"){act({dir:-1,up:true});e.preventDefault();}
      if(k==="e"||k==="arrowright"){act({dir:1,up:true});e.preventDefault();}
      if(k==="a"){act({dir:-1,up:false});e.preventDefault();}
      if(k==="d"){act({dir:1,up:false});e.preventDefault();}
    }else{
      if(k==="arrowleft"||k==="a"){down2(-1);e.preventDefault();}
      if(k==="arrowright"||k==="d"){down2(1);e.preventDefault();}
    }
    if(k==="escape"){ if(GS.offerOn) endRun(); else if(GS.state==="play") pauseRun(); else if(GS.state==="paused") resumeRun(); }
    if(k==="enter"){ if(GS.offerOn) onReviveTap(); else if(GS.state==="menu"||GS.state==="dead") startRun(); else if(GS.state==="paused") resumeRun(); }
    if(k==="r" && (GS.state==="play"||GS.state==="paused"||GS.state==="dead")) startRun();
  });
  window.addEventListener("keyup",function(e){
    if(P.four) return;
    var k=e.key.toLowerCase();
    if(k==="arrowleft"||k==="a"){up2(-1);e.preventDefault();}
    if(k==="arrowright"||k==="d"){up2(1);e.preventDefault();}
  });
}
