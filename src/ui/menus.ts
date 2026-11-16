import { GS } from "../core/state";
import { AU, sfx } from "../audio/audio";
import { applyTuning, beginRun, endRun, goMenu, openHow, openSettings, pauseRun, resumeRun, startRun } from "../game/run";
import { adMob, onReviveTap } from "../platform/ads";
import { resize } from "../render/canvas";
import { save, writeSave } from "../storage/save";
import { $ } from "./dom";
import { openSkins } from "./skins";

// MENUS — button wiring for every screen, settings toggles, and pausing when hidden.
export function initMenus(){
  $("gear").addEventListener("click",function(){
    $("panel").classList.toggle("on"); resize();
  });

  // menu wiring
  function tap(id: string, fn: () => void){ $(id).addEventListener("click",function(e){ e.preventDefault(); sfx("click"); fn(); }); }
  tap("bPlay", startRun);
  tap("bHow", function(){ openHow("menu"); });
  tap("bSkins", openSkins);
  tap("bSkinsBack", goMenu);
  tap("bHowOk", function(){
    save.seenHow=1; writeSave();
    if(GS.howReturn==="play") beginRun(); else goMenu();
  });
  tap("bSet", openSettings);
  tap("bSetBack", goMenu);
  $("optTune").addEventListener("change",function(this: HTMLInputElement){ save.tuning=this.checked?1:0; writeSave(); applyTuning(); });
  $("optSfx").addEventListener("change",function(this: HTMLInputElement){ save.sfx=this.checked?1:0; writeSave(); sfx("click"); });
  $("optMus").addEventListener("change",function(this: HTMLInputElement){ save.music=this.checked?1:0; writeSave(); });
  tap("bResetBest", function(){                 // two taps, so it can't happen by accident
    var b=$("bResetBest");
    if(!b.classList.contains("arm")){ b.classList.add("arm"); b.textContent="Tap again"; return; }
    save.best=0; writeSave(); GS.best=0;
    b.classList.remove("arm"); b.textContent="Done"; $("setBest").textContent="none yet";
  });
  tap("pauseBtn", function(){ if(GS.state==="play") pauseRun(); });
  tap("bResume", resumeRun);
  tap("bRestart", startRun);
  tap("bMenu1", goMenu);
  tap("bAgain", startRun);
  tap("bMenu2", goMenu);
  tap("bRevive", onReviveTap);
  tap("bAdPrivacy", function(){ var A=adMob(); if(A) A.showPrivacyOptionsForm().catch(function(){}); });
  tap("bNoRev", function(){ if(GS.offerOn) endRun(); });
  // leaving the app mid-run pauses it
  document.addEventListener("visibilitychange",function(){
    if(document.hidden){ pauseRun(); if(AU.ctx) AU.ctx.suspend(); }
    else if(AU.ctx) AU.ctx.resume();                  // silence in your pocket, back on return
  });
}
