import { GS } from "../core/state";
import { musOn, sfx, sfxOn } from "../audio/audio";
import { P } from "../config/params";
import { rnd } from "../core/math";
import { consumed, held } from "./movement";
import { ADS, adMob, adsPreload } from "../platform/ads";
import { resize } from "../render/canvas";
import { allBest, save } from "../storage/save";
import { $, show } from "../ui/dom";
import { syncPad } from "../ui/pad";
import { grow, newTip } from "../world/generate";
import { addPlat, waysUp } from "../world/grid";
import type { Plat } from "../core/types";

// ---------------------------------------------------------------------------
// MENUS & RUN FLOW. states: "menu" → "play" ⇄ "paused" → "dead" → "play" | "menu".
// the world keeps drawing behind every menu; it only simulates while playing.
// ---------------------------------------------------------------------------
export function reset(){
  GS.plats=[]; GS.pmap={}; GS.tips=[]; GS.holes={};
  var root=addPlat(0,0,1); root.v=true;
  GS.tips.push(newTip(root, 1, rnd(P.segMin,P.segMax), [root]));
  GS.pl={x:0,y:0,vx:0,vy:0,ground:true,p:root,sq:0,boost:0,djLeft:P.dj?P.djMax:0};
  GS.best=0; GS.maxY=0; GS.autoT=-1; GS.flash=0; GS.buf=null; GS.reject=0;
  GS.gt=0; GS.fuses=[]; GS.debris=[]; GS.puffs=[]; GS.clearQ=[]; GS.ride=null; GS.lastLift=null;
  GS.turns=[]; GS.foes=[]; GS.critters=[]; GS.critNext=0; GS.taught={};
  GS.lastIntent={dir:1,up:true};
  held["-1"]=held["1"]=false; consumed["-1"]=consumed["1"]=false;
  forks=[]; lastSafe=root; GS.offerOn=false; GS.reviveGrace=0;
  grow(); syncPad();
  GS.camY=GS.pl.y; GS.camX=0;                     // a new world starts with the camera on the cube
}
export function goMenu(){
  reset(); GS.state="menu";
  $("menuBest").innerHTML = save.best ? "Best <b>"+save.best+"</b> steps" : "Climb as high as you can";
  show("sMenu");
}
export function startRun(){
  if(!save.seenHow){ GS.howReturn="play"; show("sHow"); return; }   // first ever run: controls first
  beginRun();
}
export function beginRun(){
  reset(); runPrevBest=save.best||0; GS.revivesLeft=P.reviveMax; GS.reviveGrace=0;
  GS.runUnlocks=[]; GS.trail=[];
  adsPreload();                          // have the revive ad ready before it's needed
  GS.state="play"; show(null);
}

// ---- revive: one per run, offered for a short window after you die. later this is
// where an ad goes; for now it's free. you come back on the last fork you passed.
let runPrevBest=0;
let forks: Plat[]=[]; let lastSafe: Plat | null=null;
function safeGround(q: Plat | null): q is Plat{
  return !!q && GS.pmap[q.gx+","+q.gy]===q && !q.frag && !q.spk && !q.dn && !q.eseed && !q.stops;
}
export function noteLanding(q: Plat){                       // remember where you could safely come back
  if(!safeGround(q)) return;
  lastSafe=q;
  if(waysUp(q)>1 && forks[forks.length-1]!==q){ forks.push(q); if(forks.length>8) forks.shift(); }
}
function revivePoint(){
  for(var i=forks.length-1;i>=0;i--) if(safeGround(forks[i])) return forks[i];   // last fork
  if(safeGround(lastSafe)) return lastSafe;                                      // last safe tile
  var bestQ=null;                                                                // nearest safe below
  for(var j=0;j<GS.plats.length;j++){ var q=GS.plats[j];
    if(safeGround(q) && q.y<=GS.maxY && (!bestQ || q.y>bestQ.y)) bestQ=q; }
  return bestQ || GS.plats[0];
}
export function offerRevive(){
  GS.offerOn=true; GS.offerUntil=GS.now+P.reviveWindow/1000;
  $("revWhy").textContent=GS.deathWhy;
  $("revInfo").innerHTML="You reached <b>"+GS.best+"</b> steps";
  $("revLabel").textContent = (adMob() && ADS.ready) ? "\u25B6 Watch ad to revive" : "Revive";
  show("sRevive");
}
export function doRevive(){
  if(!GS.offerOn || GS.revivesLeft<=0) return;
  GS.offerOn=false; GS.revivesLeft--;
  var q=revivePoint();
  GS.foes=[]; GS.critters=[]; GS.ride=null; GS.buf=null; GS.flash=0;
  GS.pl.x=q.x; GS.pl.y=q.y; GS.pl.vx=0; GS.pl.vy=0; GS.pl.ground=true; GS.pl.p=q; GS.pl.sq=1.2;
  GS.pl.boost=0; GS.pl.djLeft=P.dj?P.djMax:0;
  GS.maxY=q.y;                                   // the death line restarts from here
  GS.camY=q.y; GS.camX=q.x;                         // no long pan back down
  GS.reviveGrace=GS.gt+P.reviveGrace/1000;
  GS.puffs.push({x:q.x,y:q.y,r:0,life:0.32,col:"90,209,168"});
  GS.state="play"; show(null); syncPad(); sfx("revive");
}
export function endRun(){                            // the run is really over: results
  GS.offerOn=false;
  var isNew = GS.best>runPrevBest && GS.best>0;
  $("overWhy").textContent=GS.deathWhy;
  $("overH").textContent=String(GS.best);
  $("overBest").innerHTML = isNew ? '<span class="badge">New best</span>'
                                  : '<span class="bestline">Best <b>'+(save.best||0)+'</b></span>';
  $("overUnlock").textContent = GS.runUnlocks.length ? "New skin"+(GS.runUnlocks.length>1?"s":"")+": "+GS.runUnlocks.join(", ") : "";
  show("sOver"); if(isNew) sfx("best");
}
export function pauseRun(){
  if(GS.state!=="play") return;
  GS.state="paused";
  $("pauseInfo").innerHTML="Height <b>"+Math.max(0,Math.round(GS.pl.y/P.stepY))+"</b> · best <b>"+allBest()+"</b>";
  show("sPause");
}
export function resumeRun(){ if(GS.state!=="paused") return; GS.state="play"; show(null); }

export function openHow(back: string){ GS.howReturn=back; show("sHow"); }
export function openSettings(){
  $<HTMLInputElement>("optTune").checked=!!save.tuning;
  $<HTMLInputElement>("optSfx").checked=sfxOn(); $<HTMLInputElement>("optMus").checked=musOn();
  $("setBest").textContent = save.best ? save.best+" steps" : "none yet";
  $("bResetBest").textContent="Reset"; $("bResetBest").classList.remove("arm");
  show("sSet");
}
export function applyTuning(){
  $("gear").classList.toggle("show", !!save.tuning);
  if(!save.tuning) $("panel").classList.remove("on");
  resize();
}
