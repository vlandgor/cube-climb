import "./ui/styles/global.css";
import { GS } from "./core/state";
import { initAudio } from "./audio/audio";
import { P } from "./config/params";
import { applyTuning, endRun, goMenu } from "./game/run";
import { step } from "./game/sim";
import { initKeyboard } from "./input/keyboard";
import { ADS, adsInit } from "./platform/ads";
import { initNative } from "./platform/native";
import { initCanvas, resize } from "./render/canvas";
import { draw } from "./render/draw";
import { $ } from "./ui/dom";
import { initMenus } from "./ui/menus";
import { initPad, syncPad } from "./ui/pad";
import { drawLogo } from "./ui/skins";
import { initTuning } from "./ui/tuning";
import { save } from "./storage/save";
import { detect, setLocale } from "./i18n";

// boot: wire every input and screen, then run the frame loop. simulation steps at a fixed
// 1/240 s; drawing happens once per animation frame.
let last=0; let acc=0;
function loop(ts: number){
  if(!last) last=ts;
  var raw=Math.min(0.05,(ts-last)/1000); last=ts;
  GS.now+=raw; GS.fdt=raw;
  if(GS.buf && GS.now-GS.buf.t > P.buffer/1000){ GS.buf=null; syncPad(); }
  if(GS.offerOn && !ADS.showing){                   // revive window drains (frozen during an ad)
    var left=Math.max(0,(GS.offerUntil-GS.now)/(P.reviveWindow/1000));
    $("revBar").style.width=(left*100)+"%";
    if(left<=0) endRun();
  }
  acc+=raw*P.speed;
  var n=0;
  while(acc>1/240 && n++<120){ step(1/240); acc-=1/240; }
  draw();
  if(GS.state==="menu") drawLogo();
  requestAnimationFrame(loop);
}

initAudio(); initCanvas(); initPad(); initKeyboard(); initMenus(); initNative(); initTuning();
resize(); applyTuning();
// the language decides every menu string, so it is loaded before the first screen shows
setLocale(save.lang||detect()).then(function(){
  goMenu(); requestAnimationFrame(loop);
  adsInit();                             // app only: consent, then preload the revive ad
});
