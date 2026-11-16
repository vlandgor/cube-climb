import { GS } from "../core/state";
import { P } from "../config/params";
import type { Plat } from "../core/types";

// GRID — platforms live on a fixed lattice. lookups, holes (cells that must stay empty)
// and the spacing rules that keep two obstacles from ever sitting side by side.
// teaching: which mechanics this run has already shown the player once

export function key(x: number, y: number){return Math.round(x/P.stepX)+","+Math.round(y/P.stepY);}
export function deathY(){return GS.maxY - P.fallSteps*P.stepY;}

export function addPlat(x: number, y: number, dir: number): Plat{
  var k=key(x,y);
  if(GS.pmap[k]) return GS.pmap[k];
  var p: Plat={x:x,y:y,gx:Math.round(x/P.stepX),gy:Math.round(y/P.stepY),dir:dir,v:false};
  GS.plats.push(p); GS.pmap[k]=p; return p;
}
export function neighbour(cur: Plat | null | undefined, dx: number, dy: number){
  if(!cur) return null;
  return GS.pmap[key(cur.x+dx*P.stepX, cur.y+dy*P.stepY)] || null;
}
export function waysUp(cur: Plat){
  return (neighbour(cur,-1,1)?1:0)+(neighbour(cur,1,1)?1:0);
}

// a hole is a cell deliberately emptied — a gap built into the stairs, a collapsed
// tile or a cleared lift shaft.
// nothing ever grows back into one, and no two holes may be diagonal neighbours,
// so there is always a solid platform between any two gaps.
export const DIAG=[[-1,1],[1,1],[-1,-1],[1,-1]];
export function isHole(gx: number, gy: number){ return GS.holes[gx+","+gy]===true; }
// a down-only tile can't be climbed past, only skipped with an air jump — so for
// spacing it counts as a gap: never two such obstacles diagonally adjacent.
export function adjHole(gx: number, gy: number){
  for(var i=0;i<4;i++){
    var nx=gx+DIAG[i][0], ny=gy+DIAG[i][1];
    if(isHole(nx,ny)) return true;
    var t=GS.pmap[nx+","+ny];
    if(t && (t.dn || t.spk)) return true;
  }
  return false;
}
export function makeHole(q: Plat){
  GS.holes[q.gx+","+q.gy]=true;
  for(var i=0;i<4;i++){                 // neighbours may no longer be obstacles
    var t=GS.pmap[(q.gx+DIAG[i][0])+","+(q.gy+DIAG[i][1])];
    if(!t) continue;
    if(t.dn) t.dn=0;
    if(t.spk) t.spk=0;
    if(t.frag){
      t.frag=0; t.hits=0;
      if(t.fuse!==undefined){ t.fuse=undefined; var f=GS.fuses.indexOf(t); if(f>=0) GS.fuses.splice(f,1); }
    }
  }
}
export function fragOK(p: Plat){
  for(var i=0;i<4;i++){
    var gx=p.gx+DIAG[i][0], gy=p.gy+DIAG[i][1];
    if(isHole(gx,gy)) return false;
    var t=GS.pmap[gx+","+gy];
    if(t && (t.frag || t.dn || t.spk)) return false;
  }
  return true;
}
export function dnOK(p: Plat){
  for(var i=0;i<4;i++){
    var gx=p.gx+DIAG[i][0], gy=p.gy+DIAG[i][1];
    if(isHole(gx,gy)) return false;
    var t=GS.pmap[gx+","+gy];
    if(t && (t.frag || t.dn || t.spk || t.eseed)) return false;
  }
  return true;
}
// any gap or blocker diagonally next to this cell? a lift counts: its stops turn into gaps
export function nearObstacle(gx: number, gy: number){
  for(var i=0;i<4;i++){
    var nx=gx+DIAG[i][0], ny=gy+DIAG[i][1];
    if(isHole(nx,ny)) return true;
    var t=GS.pmap[nx+","+ny];
    if(t && (t.frag || t.dn || t.spk || t.eseed)) return true;
  }
  return false;
}
// hollow out the column between the lift and its landings, so the shaft is a real
// empty corridor and arriving reads naturally. gaps are fine now: you can air-jump.
export function isTipPlat(t: Plat){
  for(var i=0;i<GS.tips.length;i++) if(GS.tips[i].plat===t) return true;
  return false;
}
export function removePlat(t: Plat){
  var kk=key(t.x,t.y);
  if(GS.pmap[kk]===t) delete GS.pmap[kk];
  var pi=GS.plats.indexOf(t); if(pi>=0) GS.plats.splice(pi,1);
  makeHole(t);
}
