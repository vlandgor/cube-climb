import { GS } from "../core/state";
import { $ } from "./dom";
import type { Params } from "../config/params";
import { P } from "../config/params";
import { beginRun, reset } from "../game/run";
import { save, writeSave } from "../storage/save";
import { syncPad } from "./pad";
import { key } from "../world/grid";

// TUNING PANEL — every slider and switch is bound to a field of P and applies live.
// spacing changes rescale the structure in place — the run is never thrown away
function rescale(osx: number, osy: number){
  var rx=P.stepX/osx, ry=P.stepY/osy, i;
  GS.pmap={};
  for(i=0;i<GS.plats.length;i++){
    var q=GS.plats[i];
    q.x=q.gx*P.stepX; q.y=q.gy*P.stepY;
    if(!(GS.ride && GS.ride.lift===q)) GS.pmap[key(q.x,q.y)]=q;   // a lift in transit holds no cell
    q.ec=undefined;
  }
  GS.pl.x*=rx; GS.pl.y*=ry; GS.maxY*=ry; GS.camX*=rx; GS.camY*=ry;
  if(GS.pl.ground && GS.pl.p){ GS.pl.x=GS.pl.p.x; GS.pl.y=GS.pl.p.y; }
  if(GS.ride){ GS.ride.from*=ry; GS.ride.to*=ry; }
  GS.foes=[]; GS.critters=[];                          // in-flight creatures don't survive a rescale
  for(i=0;i<GS.debris.length;i++){ GS.debris[i].x*=rx; GS.debris[i].y*=ry; }
  syncPad();
}
export function initTuning(){
  function bind(id: string, pk: keyof Params, out?: string | null, fmt?: ((v: any) => string) | null, restart?: boolean, re?: boolean){
    // a control edits one field of P; checkboxes hold booleans, sliders numbers
    var T=P as Record<keyof Params, number | boolean>;
    var el=$<HTMLInputElement>(id), o=out?$(out):null;
    if(el.type==="checkbox"){ el.checked=T[pk] as boolean;
      el.addEventListener("change",function(){T[pk]=el.checked; if(re) reset(); syncPad();});
      return;
    }
    el.value=String(T[pk]);
    var show=function(){ if(o) o.textContent=fmt?fmt(T[pk]):String(T[pk]); };
    el.addEventListener("input",function(){
      var old=T[pk] as number;
      T[pk]=parseFloat(el.value); show();
      if(P.segMax<P.segMin){P.segMax=P.segMin;$<HTMLInputElement>("pSegB").value=String(P.segMax);}
      if(restart) rescale(pk==="stepX"?old:P.stepX, pk==="stepY"?old:P.stepY);
    });
    show();
}
bind("pFork","forkChance","oFork",function(v){return Math.round(v*100)+"%";});
bind("pTips","maxTips","oTips");
bind("pClear","clear","oClear");
bind("pNoDE","noDeadEnd"); bind("pJunc","junc");
bind("pFrag","fragile"); bind("pFragF","fragForks");
bind("pFragC","fragChance","oFragC",function(v){return Math.round(v*100)+"%";});
bind("pBreak","breakMs","oBreak",function(v){return v+"ms";});
bind("pElev","elev");
bind("pElevC","elevChance","oElevC",function(v){return Math.round(v*100)+"%";});
bind("pElevD","elevMs","oElevD",function(v){return v+"ms";});
bind("pElevK","elevCool","oElevK",function(v){return v+"ms";});
bind("pSpr","spring"); bind("pRat","ratchet");
bind("pSprC","springChance","oSprC",function(v){return Math.round(v*100)+"%";});
bind("pRatC","ratchetChance","oRatC",function(v){return Math.round(v*100)+"%";});
bind("pDn","downOnly");
var pct=function(v: number){return Math.round(v*100)+"%";};
bind("pTeach","teach"); bind("pWave","waves");
bind("pPace","pace","oPace",function(v){return (+v).toFixed(2)+"×";});
bind("pWaveA","waveAmp","oWaveA",pct); bind("pWaveP","wavePeriod","oWaveP");
bind("pGap","gaps"); bind("pGapC","gapChance","oGapC",pct);
bind("sGap","gapStart","oSGap"); bind("pGapM","gapMax","oGapM",pct);
bind("sFrag","fragStart","oSFrag"); bind("sSpr","sprStart","oSSpr"); bind("sCrit","critStart","oSCrit");
bind("sRat","ratStart","oSRat"); bind("sSpk","spkStart","oSSpk"); bind("sDn","dnStart","oSDn");
bind("sElev","elevStart","oSElev"); bind("sFoe","foeStart","oSFoe");
bind("pElevP","elevPeak","oElevP",function(v){return (v*100).toFixed(1)+"%";});
var ms=function(v: number){return v+"ms";};
bind("pFoe","foes");
bind("pCrit","crit"); bind("pCritC","critChance","oCritC",pct);
bind("pCritG","critGap","oCritG",function(v){return (v/1000).toFixed(1)+"s";});
bind("pCritS","critSit","oCritS",ms);
bind("pFoeC","foeChance","oFoeC",pct); bind("pFoeM","foeMax","oFoeM",pct);
bind("pFoeT","foeTrig","oFoeT"); bind("pFoeW","foeTele","oFoeW",ms); bind("pFoeP","foeHop","oFoeP",ms);
bind("pFragM","fragMax","oFragM",pct); bind("pSpkM","spikeMax","oSpkM",pct);
bind("pDnM","downMax","oDnM",pct); bind("pRatM","ratchetMax","oRatM",pct);
bind("pSprM","springMin","oSprM",pct);
bind("pSpk","spikes");
bind("pSpkC","spikeChance","oSpkC",function(v){return Math.round(v*100)+"%";});
bind("pSpkL","spikeLinger","oSpkL",function(v){return v+"ms";});
bind("pDnC","downChance","oDnC",function(v){return Math.round(v*100)+"%";});
bind("pDJ","dj"); bind("pDJn","djMax","oDJn"); bind("pBack2","backflip");
$("djReset").addEventListener("click",function(){
  delete save.djDone; writeSave(); this.textContent="Hint will show at the next gap";
});
bind("pFour","four");
bind("pBuf","buffer","oBuf",function(v){return v+"ms";});
bind("pVoid","ignoreVoid"); bind("pDim","dim"); bind("pPrev","preview");
bind("pRel","onRelease"); bind("pMod","useMod"); bind("pCons","consume"); bind("pAir","air");
bind("pGrav","grav","oGrav",function(v){return Math.round(v/100)/10+"k";});
bind("pSpd","speed","oSpd",function(v){return v.toFixed(2)+"×";});
bind("pApex","apex","oApex",function(v){return v.toFixed(1)+"×";});
bind("pBack","back","oBack",function(v){return v.toFixed(2);});
bind("pAuto","auto"); bind("pSnap","snap"); bind("pLine","showLine");
bind("pDelay","autoDelay","oDelay",function(v){return v+"ms";});
bind("pSX","stepX","oSX",null,true); bind("pSY","stepY","oSY",null,true);
bind("pPW","platW","oPW");
bind("pSegA","segMin","oSegA"); bind("pSegB","segMax","oSegB");
bind("pElevM","elevMin","oElevM");
$("restart").addEventListener("click",function(){ beginRun(); });
bind("pFall","fallSteps","oFall");
bind("pFallMin","fallMin","oFallMin");
bind("pFallFull","fallFull","oFallFull");
bind("pCam","camLerp","oCam",function(v){return v.toFixed(2);});
bind("pLook","look","oLook",function(v){return v.toFixed(2);});
bind("pBoxY","boxY","oBoxY",function(v){return v.toFixed(2);});
bind("pBoxX","boxX","oBoxX",function(v){return v.toFixed(2);});
bind("pPos","camPos","oPos",function(v){return v.toFixed(2);});
bind("pCols","viewCols","oCols",function(v){return v?(+v).toFixed(1):"off";});
bind("pCamX","camX");
}
