import { GS } from "../core/state";
import { AU, sfx } from "../audio/audio";
import { endRun, goMenu, pauseRun, resumeRun } from "../game/run";
import { ADS } from "./ads";

// ---- inside the Android / iOS app (Capacitor). in a plain browser this does nothing.
// the hardware back button steps back one screen; on the main menu it leaves the app.
function onBack(){
  if(ADS.showing) return;                          // the ad handles its own back button
  if(GS.state==="play") return pauseRun();
  if(GS.state==="paused") return resumeRun();
  if(GS.offerOn) return endRun();
  if(GS.state==="dead") return goMenu();
  if(GS.curScreen && GS.curScreen!=="sMenu") return goMenu();
  var App=window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if(App) App.exitApp();
}
export function initNative(){
  (function(){
    var App=window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if(!App || !App.addListener) return;
    App.addListener("backButton", function(){ sfx("click"); onBack(); });
    App.addListener("pause", function(){ pauseRun(); if(AU.ctx) AU.ctx.suspend(); });
    App.addListener("resume", function(){ if(AU.ctx) AU.ctx.resume(); });
  })();
}
