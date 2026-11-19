import { GS } from "../core/state";
import { P } from "../config/params";
import { rnd } from "../core/math";
import { markTurn } from "../entities/walker";
import { sched } from "./difficulty";
import { addPlat, adjHole, deathY, dnOK, fallAt, fragOK, isHole, isTipPlat, key, nearObstacle, removePlat, waysUp } from "./grid";
import { clearShaft } from "./tiles";
import type { Plat, Tip } from "../core/types";
import type { Params } from "../config/params";

// GENERATION — the climb is a graph of growing branches (tips). segments, forks, merges,
// gaps in the stairs, and which special tile each new platform becomes.
// GAPS: a tile left out of a straight run of stairs. the jump into it is allowed (see
// holeAt); an air jump carries you to the next tile. only a plain mid-staircase tile can
// become a gap — never a fork, a reunion or a turn — and never next to another gap or
// blocker, so one air jump always clears it.
function gapOK(j: Plat){
  if(j.v || j===GS.pl.p || j.turn || j.merge || isTipPlat(j)) return false;
  if(j.frag || j.spr || j.rat || j.dn || j.spk || j.eseed) return false;
  if(GS.pmap[j.gx+","+j.gy]!==j) return false;
  return !nearObstacle(j.gx,j.gy);
}
// the first gap teaches the air jump, so missing it mustn't end the run. replay the real
// jump arc from the tile before the gap and fall on past it: it has to land on solid
// ground below, well above the death line. tiles below are already built (the lowest
// tip always grows first). a fragile tile, a lift or spikes don't count as a catch.
function catchesFall(src: Plat, dir: number, gap: Plat){
  var g=P.grav, S=P.stepY, v0=Math.sqrt(2*g*S*P.apex);
  var tt=(v0+Math.sqrt(Math.max(0,v0*v0-2*g*S)))/g;
  var x=src.x, y=src.y, vx=dir*P.stepX/tt, vy=v0, dt=1/240;
  var floor=src.y-(fallAt(src.gy)-2)*P.stepY;
  while(y>floor){
    var py=y; vy-=g*dt; x+=vx*dt; y+=vy*dt;
    if(vy>=0) continue;
    for(var i=0;i<GS.plats.length;i++){
      var q=GS.plats[i];
      if(q===gap || q.y>py+1 || q.y<y-1 || GS.pmap[q.gx+","+q.gy]!==q) continue;
      if(py>=q.y-0.5 && y<=q.y && Math.abs(x-q.x)<=P.platW*0.5+2)
        return (q.y<gap.y && !q.frag && !q.eseed && !q.spk && !q.dn) ? q : null;
    }
  }
  return null;
}
// called once the branch has stepped past j in the same direction, so j is known to be
// a straight-through tile and not a turn.
function tryGap(t: Tip, j: Plat, dir: number){
  if(!P.gaps || !P.dj) return;                  // without the air jump a gap can't be crossed
  if(j.gy < P.gapStart*P.pace || j.y <= P.stepY*3) return;
  var prev=GS.pmap[(j.gx-dir)+","+(j.gy-1)];
  if(!prev || !gapOK(j)) return;
  if(P.teach && !t.gapTaught){
    if(!catchesFall(prev,dir,j)) return;        // not a safe spot: try further up
    t.gapTaught=true;
  }else if(Math.random() >= sched(j.gy,P.gapStart,P.gapFull,P.gapChance,P.gapMax,1)) return;
  removePlat(j);
}

// a cell is blocked if some OTHER branch already occupies this column nearby.
// a branch's own recent trail is exempt, so the natural zigzag (which always
// doubles back two rows above itself) still works.
function blocked(x: number, y: number, trail: Plat[]){
  for(var k=1;k<=P.clear;k++){
    var a=GS.pmap[key(x,y+k*P.stepY)], b=GS.pmap[key(x,y-k*P.stepY)];
    if(a && trail.indexOf(a)<0) return true;
    if(b && trail.indexOf(b)<0) return true;
  }
  return false;
}
function remember(t: Tip, p: Plat){
  t.trail.push(p);
  var lim=P.segMax*3+8;
  while(t.trail.length>lim) t.trail.shift();
}

// the structure is a graph: each tip grows its own segment and may fork in two
// branches that split a while ago steer back toward each other until they meet on one
// tile. the merge frees a branch slot, so a fresh fork can appear further up — which keeps
// forks coming at every height instead of stopping once the branch cap is reached.
export function newTip(plat: Plat, dir: number, seg: number, trail: Plat[]): Tip{
  // gapTaught: this branch has had its first, safe gap. forks inherit it, so whichever
  // branch you take, the first gap you meet can't kill you.
  return {plat:plat, dir:dir, segLeft:seg, trail:trail, age:0, mate:null,
          mergeAt:rnd(P.mergeMin,P.mergeMax), gapTaught:false};
}
function findMate(t: Tip){
  if(!P.merge || GS.tips.length<2) return null;
  if(t.mate){
    if(GS.tips.indexOf(t.mate)>=0 && t.mate.plat.gx!==t.plat.gx) return t.mate;
    t.mate=null;
  }
  if(t.age<t.mergeAt) return null;                       // not apart long enough yet
  var best=null, bd=1e9;
  for(var i=0;i<GS.tips.length;i++){
    var u=GS.tips[i]; if(u===t || u.mate) continue;
    if(u.age<P.mergeMinAge) continue;                     // never swallow a fresh fork
    if(Math.abs(u.plat.gy-t.plat.gy)>4) continue;
    var dx=Math.abs(u.plat.gx-t.plat.gx);
    if(dx===0 || dx>P.mergeRange) continue;
    if(dx<bd){ bd=dx; best=u; }
  }
  if(best){ t.mate=best; best.mate=t; }                   // both steer, so they actually meet
  return best;
}

function extend(t: Tip){
  var fy=t.plat.y+P.stepY, j=t.plat, dir0=t.dir;
  var mate=findMate(t), tr = mate ? t.trail.concat(mate.trail) : t.trail;
  if(mate){                                               // heading for the reunion
    t.dir = mate.plat.gx>j.gx ? 1 : -1;
    if(t.segLeft<1) t.segLeft=1;
  }else if(t.segLeft<=0){
    if(GS.tips.length < P.maxTips && Math.random() < P.forkChance){
      var lx=j.x-P.stepX, rx=j.x+P.stepX;
      if(!GS.pmap[key(lx,fy)] && !GS.pmap[key(rx,fy)] &&
         !isHole(j.gx-1,j.gy+1) && !isHole(j.gx+1,j.gy+1) &&
         !blocked(lx,fy,t.trail) && !blocked(rx,fy,t.trail)){
        GS.tips.splice(GS.tips.indexOf(t),1);
        if(!P.fragForks){ j.frag=0; j.hits=0; }   // a junction that collapses kills both routes
        j.spk=0; j.dn=0; j.eseed=0;                // forks are revive points: always safe ground
        for(var s=-1;s<=1;s+=2){
          var c=addPlat(j.x+s*P.stepX, fy, s);
          var nt=newTip(c, s, rnd(P.segMin,P.segMax)-1, t.trail.slice());
          nt.gapTaught=t.gapTaught;
          remember(nt,c); GS.tips.push(nt);
        }
        return;
      }
    }
    t.dir=-t.dir; t.segLeft=rnd(P.segMin,P.segMax);
  }
  var nx=j.x+t.dir*P.stepX;
  // another branch in the way, or a hole we must never fill back in: turn.
  // (a branch steering toward its mate may approach the mate's own platforms.)
  if(blocked(nx,fy,tr) || isHole(j.gx+t.dir,j.gy+1)){
    var ox=j.x-t.dir*P.stepX;
    if(!blocked(ox,fy,tr) && !isHole(j.gx-t.dir,j.gy+1)){
      t.dir=-t.dir; nx=ox; t.segLeft=rnd(P.segMin,P.segMax);
    }else if(isHole(j.gx+t.dir,j.gy+1)){
      if(GS.tips.length>1){ GS.tips.splice(GS.tips.indexOf(t),1); }
      return;                                 // both ways closed: this branch ends here
    }
  }
  if(t.dir!==dir0) markTurn(j,dir0);        // the staircase reverses here
  t.segLeft--;
  var existed=!!GS.pmap[key(nx,fy)];
  var p=addPlat(nx,fy,t.dir);
  if(existed && GS.tips.length>1){                           // merged into another branch
    p.frag=0; p.spk=0; p.dn=0; p.eseed=0; p.merge=1;      // a reunion tile is safe ground
    for(var mi=0;mi<GS.tips.length;mi++){
      var u=GS.tips[mi];
      if(u.mate===t) u.mate=null;
      if(u.plat===p){ u.age=0; u.mate=null; u.mergeAt=rnd(P.mergeMin,P.mergeMax); }
    }
    GS.tips.splice(GS.tips.indexOf(t),1); return;
  }
  t.plat=p; remember(t,p); t.age++;
  if(!existed && t.dir===dir0) tryGap(t,j,dir0);   // j sits mid-staircase: maybe leave it out
  if(!existed && p.y>P.stepY*3){
    // a mechanic that has just unlocked gets its lesson first: placed once, on its own.
    // after that every type follows its own curve. the spacing rules still forbid two
    // obstacles side by side, so every density stays beatable.
    var gy=p.gy, lesson=null, lessonAt=1e9;
    if(P.teach){
      for(var li=0;li<LESSONS.length;li++){
        var L=LESSONS[li], st=(P[L[1]] as number)*P.pace;
        if(!GS.taught[L[0]] && P[L[2]] && gy>=st && st<lessonAt){ lesson=L[0]; lessonAt=st; }
      }
    }
    if(lesson){ if(place(p,lesson)) GS.taught[lesson]=1; }
    else{
      var r=Math.random(), cum=0, kind=null;
      if(P.fragile){ cum+=sched(gy,P.fragStart,P.fragFull,P.fragChance,P.fragMax,1); if(r<cum) kind="frag"; }
      if(!kind && P.elev){ cum+=sched(gy,P.elevStart,P.elevFull,P.elevChance,P.elevPeak,1); if(r<cum) kind="elev"; }
      if(!kind && P.spring){ cum+=sched(gy,P.sprStart,P.sprFull,P.springChance,P.springMin,0); if(r<cum) kind="spr"; }
      if(!kind && P.ratchet){ cum+=sched(gy,P.ratStart,P.ratFull,P.ratchetChance,P.ratchetMax,1); if(r<cum) kind="rat"; }
      if(!kind && P.downOnly){ cum+=sched(gy,P.dnStart,P.dnFull,P.downChance,P.downMax,1); if(r<cum) kind="dn"; }
      if(!kind && P.spikes){ cum+=sched(gy,P.spkStart,P.spkFull,P.spikeChance,P.spikeMax,1); if(r<cum) kind="spk"; }
      if(kind) place(p,kind);
    }
  }
}

//            type    unlock key   on/off key
const LESSONS: [string, keyof Params, keyof Params][]=[["frag","fragStart","fragile"], ["spr","sprStart","spring"],
             ["rat","ratStart","ratchet"],   ["spk","spkStart","spikes"],
             ["dn","dnStart","downOnly"],    ["elev","elevStart","elev"]];
// turn a fresh platform into `kind` if the spacing rules allow it here
function place(p: Plat, kind: string){
  if(kind==="frag"){ if(!fragOK(p)) return false; p.frag=1; p.hits=0; }
  else if(kind==="elev"){ if(adjHole(p.gx,p.gy)) return false; p.eseed=1; }  // its home cell becomes a gap
  else if(kind==="spr") p.spr=1;
  else if(kind==="rat") p.rat=1;
  else if(kind==="dn"){ if(!dnOK(p)) return false; p.dn=1; }
  else if(kind==="spk"){ if(!dnOK(p)) return false; p.spk=1; p.spUntil=-1; p.spA=0; }
  return true;
}

export function grow(){
  while(GS.clearQ.length) clearShaft(GS.clearQ.pop()!);
  var guard=0;
  while(guard++<800){
    var t=null;
    for(var i=0;i<GS.tips.length;i++){
      if(GS.tips[i].plat.y < GS.pl.y+1800 && (!t || GS.tips[i].plat.y < t.plat.y)) t=GS.tips[i];
    }
    if(!t) break;
    extend(t);
  }
  if(GS.tips.length>1){
    var keep=[];
    for(var i2=0;i2<GS.tips.length;i2++)
      if(GS.tips[i2].plat.y > deathY()) keep.push(GS.tips[i2]);
    if(keep.length) GS.tips=keep;
  }
  // safety net: if we are somehow standing on a dead end, open a way up
  if(P.noDeadEnd && GS.pl && GS.pl.ground && GS.pl.p && waysUp(GS.pl.p)===0){
    var d=Math.random()<0.5?-1:1;
    if(isHole(GS.pl.p.gx+d,GS.pl.p.gy+1)) d=-d;
    if(!isHole(GS.pl.p.gx+d,GS.pl.p.gy+1)){
      var np=addPlat(GS.pl.p.x+d*P.stepX, GS.pl.p.y+P.stepY, d);
      var st=newTip(np, d, rnd(P.segMin,P.segMax)-1, [GS.pl.p,np]);
      st.gapTaught=true; GS.tips.push(st);
    }
  }
  // drop platforms far below the death line (never one a tip or the player needs)
  if(GS.plats.length>300){
    var floor=deathY()-900, kept=[], k2, q;
    for(k2=0;k2<GS.plats.length;k2++){
      q=GS.plats[k2]; q._t=false;
    }
    for(k2=0;k2<GS.tips.length;k2++) GS.tips[k2].plat._t=true;
    for(k2=0;k2<GS.plats.length;k2++){
      q=GS.plats[k2];
      if(q.y<floor && q!==GS.pl.p && !q._t) delete GS.pmap[key(q.x,q.y)];
      else kept.push(q);
    }
    GS.plats=kept;
    var fgy=Math.round(floor/P.stepY);          // forget holes that are long gone
    for(var hk in GS.holes){
      if(parseInt(hk.split(",")[1],10)<fgy) delete GS.holes[hk];
    }
  }
}
