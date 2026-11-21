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
import { LOCALES, locale, t } from "../i18n";
import type { Key } from "../i18n/format";

// ---------------------------------------------------------------------------
// MENUS & RUN FLOW. states: "menu" → "play" ⇄ "paused" → "dead" → "play" | "menu".
// the world keeps drawing behind every menu; it only simulates while playing.
// ---------------------------------------------------------------------------
export function reset(){
  GS.plats=[]; GS.pmap={}; GS.tips=[]; GS.holes={};
  var root=addPlat(0,0,1); root.v=true; GS.path=[root];
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
  $("menuBest").innerHTML = save.best ? t("menu.best",{n:save.best}) : t("menu.first");
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
  $("revWhy").textContent=t(("death."+GS.deathWhy) as Key);
  $("revInfo").innerHTML=t("revive.info",{n:GS.best});
  $("revLabel").textContent = (adMob() && ADS.ready) ? t("revive.ad") : t("revive.free");
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
  $("overWhy").textContent=t(("death."+GS.deathWhy) as Key);
  $("overH").textContent=String(GS.best);
  $("overUnit").textContent=t("over.unit",{n:GS.best});
  $("overBest").innerHTML = isNew ? '<span class="badge">'+t("over.newBest")+'</span>'
                                  : '<span class="bestline">'+t("over.best",{n:save.best||0})+'</span>';
  var names=GS.runUnlocks.map(function(id){ return t(("skin."+id) as Key); });
  $("overUnlock").textContent = names.length
    ? t("over.newSkins",{n:names.length, names:new Intl.ListFormat(locale()).format(names)}) : "";
  show("sOver"); if(isNew) sfx("best");
}
export function pauseRun(){
  if(GS.state!=="play") return;
  GS.state="paused";
  $("pauseInfo").innerHTML=t("pause.info",{h:Math.max(0,Math.round(GS.pl.y/P.stepY)), b:allBest()});
  show("sPause");
}
export function resumeRun(){ if(GS.state!=="paused") return; GS.state="play"; show(null); }

export function openHow(back: string){ GS.howReturn=back; show("sHow"); }
export function openSettings(){
  $<HTMLInputElement>("optTune").checked=!!save.tuning;
  $<HTMLInputElement>("optSfx").checked=sfxOn(); $<HTMLInputElement>("optMus").checked=musOn();
  $("setBest").textContent = save.best ? t("set.bestSteps",{n:save.best}) : t("set.bestNone");
  $("bResetBest").textContent=t("set.reset"); $("bResetBest").classList.remove("arm");
  // language picker: "device language" first, then every language in its own name
  var sel=$<HTMLSelectElement>("optLang");
  sel.innerHTML="";
  sel.add(new Option(t("set.langAuto"),""));
  for(var i=0;i<LOCALES.length;i++) sel.add(new Option(LOCALES[i].name,LOCALES[i].code));
  sel.value=save.lang||"";
  show("sSet");
}
export function applyTuning(){
  $("gear").classList.toggle("show", !!save.tuning);
  if(!save.tuning) $("panel").classList.remove("on");
  resize();
}
