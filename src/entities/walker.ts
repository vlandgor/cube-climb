import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { P } from "../config/params";
import { die } from "../game/sim";
import { onScreen } from "../render/camera";
import { sched } from "../world/difficulty";
import { waysUp } from "../world/grid";
import type { Foe, Plat } from "../core/types";

// ---------------------------------------------------------------------------
// ENEMY — the walker. lives at a plain turn of the staircase. when you climb close,
// it appears two steps up the new staircase (B2) and hops down through the turn,
// tile by tile — B2, B1, the turn, A1, A2 — toward you, then vanishes in a puff.
// touching it ends the run; backing off and waiting it out keeps you safe.
// ---------------------------------------------------------------------------
export function markTurn(j: Plat, d: number){
  j.turn=d;                                   // d: the direction the old staircase climbed
  if(j.gy>4) GS.turns.push(j);                   // the walker's own unlock height gates spawning
}
function turnCells(T: Plat){
  var d=T.turn!;
  return {
    A2:GS.pmap[(T.gx-2*d)+","+(T.gy-2)], B2:GS.pmap[(T.gx-2*d)+","+(T.gy+2)],
    A1:GS.pmap[(T.gx-d)+","+(T.gy-1)],   B1:GS.pmap[(T.gx-d)+","+(T.gy+1)],
    hollow:(T.gx-2*d)+","+T.gy
  };
}
// is the player climbing the old staircase toward this turn, k steps below it?
function stepsBelow(T: Plat){
  var c=GS.pl.p; if(!c) return -1;
  var k=T.gy-c.gy;
  return (c.gx===T.gx-k*T.turn!) ? k : -1;
}
function onPath(t: Plat | undefined){ return t && !t.eseed && GS.pmap[t.gx+","+t.gy]===t; }
export function trySpawn(){
  if(!P.foes || !GS.pl.ground || !GS.pl.p) return;
  if(GS.gt<GS.reviveGrace) return;                                   // just revived: breathing room
  for(var i=GS.turns.length-1;i>=0;i--){
    var T=GS.turns[i];
    if(T.gy < GS.pl.p.gy){ GS.turns.splice(i,1); continue; }      // already behind us
    if(T.foeDone) continue;
    var k=stepsBelow(T);
    if(k<0 || k>P.foeTrig) continue;                          // not on this staircase / far
    if(k<4){ T.foeDone=1; continue; }                         // too close to back off: skip
    var c=turnCells(T);
    // start two steps up the new staircase if you can see that tile, otherwise one
    // step up (a 4-tile walk instead of 5). never somewhere you can't see.
    var path=null;
    if(c.B2 && onScreen(c.B2)) path=[c.B2,c.B1,T,c.A1,c.A2];
    else if(c.B1 && onScreen(c.B1)) path=[c.B1,T,c.A1,c.A2];
    if(!path) continue;                                       // wait until you can see it
    T.foeDone=1;                                              // one roll per turn
    if(T.gy < P.foeStart*P.pace) continue;                    // not unlocked yet
    var fc = (P.teach && !GS.taught.foe) ? 1                     // its lesson: the first chance
           : sched(T.gy,P.foeStart,P.foeFull,P.foeChance,P.foeMax,1);
    if(Math.random() >= fc) continue;
    if(waysUp(T)!==1) continue;                               // a fork, not a plain turn
    var ok=true;
    for(var p2=0;p2<path.length;p2++) if(!onPath(path[p2])) ok=false;
    if(!ok) continue;
    GS.foes.push({x:path[0].x, y:path[0].y, st:"tele", t:P.foeTele/1000, path:path, at:0, idx:0, k:k});
    GS.taught.foe=1;
    sfx("alarm");
  }
}
function foeArc(f: Foe, x1: number, y1: number, dur: number, apex: number){
  f.ax0=f.x; f.ay0=f.y; f.ax1=x1; f.ay1=y1; f.at=0; f.ad=dur; f.ap=apex; f.st="air";
}
// poof: a ring and a scatter of red sparks, then it's gone and the path is safe
function poof(f: Foe){
  sfx("poof");
  GS.puffs.push({x:f.x,y:f.y+P.stepY*0.2,r:0,life:0.32,col:"255,90,100"});
  for(var k=0;k<10;k++){
    var a=Math.random()*Math.PI*2, sp=P.stepX*(1.2+Math.random()*1.6);
    GS.debris.push({x:f.x,y:f.y+P.stepY*0.25,w:6,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp+P.stepY*2,
                 rot:0,vr:(Math.random()-0.5)*14,life:0.45,col:"216,52,74"});
  }
}
export function updateFoes(dt: number){
  var s=Math.min(P.platW*0.5,26);
  for(var i=GS.foes.length-1;i>=0;i--){
    var f=GS.foes[i], gone=false;
    if(f.st==="tele"){                       // warning flash on its perch
      f.t-=dt;
      if(f.t<=0){ f.st="rest"; f.t=P.foeHop/1000; }        // a beat before the first hop
    }else if(f.st==="air"){
      f.at+=dt; var u=Math.min(1,f.at/f.ad!);
      f.x=f.ax0!+(f.ax1!-f.ax0!)*u;
      f.y=f.ay0!+(f.ay1!-f.ay0!)*u + f.ap!*4*u*(1-u);
      if(u>=1){ f.st="rest"; f.t=P.foeHop/1000; }
    }else if(f.st==="rest"){
      f.t-=dt;
      if(f.t<=0){
        if(f.idx>=f.path.length-1){ gone=true; }          // walked the whole way: poof
        else{
          var nxt=f.path[f.idx+1];
          if(!onPath(nxt)) gone=true;                     // a tile it needed is gone: poof
          else{ f.idx++; foeArc(f,nxt.x,nxt.y,0.2,P.stepY*0.45); sfx("foeHop"); }
        }
      }
    }
    if(gone){ poof(f); GS.foes.splice(i,1); continue; }
    // contact: two cubes overlapping (a little forgiving at the edges)
    if(f.st!=="tele" && GS.state==="play" && GS.gt>=GS.reviveGrace){
      var dx=Math.abs(f.x-GS.pl.x);
      if(dx < s*0.78 && GS.pl.y < f.y+s*0.85 && f.y < GS.pl.y+s*0.85){ die("caught"); return; }
    }
  }
}
