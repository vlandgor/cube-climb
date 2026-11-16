import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { P } from "../config/params";
import type { Critter } from "../core/types";

// ---------------------------------------------------------------------------
// NEUTRAL — the faller. drops out of the sky onto a tile just ahead of you, stares,
// then hops off and away. it exists to make you flinch, never to kill: bump into
// it and it gets knocked off the tile instead.
// ---------------------------------------------------------------------------
export function maybeCritter(){
  if(!P.crit || GS.critters.length || GS.foes.length || GS.gt<GS.critNext) return;
  if(!GS.pl.p || GS.pl.p.gy<P.critStart*P.pace || !GS.lastIntent.up) return;   // climbing, unlocked
  var cc = (P.teach && !GS.taught.crit) ? 1 : P.critChance;     // first one comes right away
  if(Math.random()>=cc) return;
  var d=GS.lastIntent.dir, target=null;
  for(var k=2;k<=3 && !target;k++){
    var t=GS.pmap[(GS.pl.p.gx+d*k)+","+(GS.pl.p.gy+k)];
    if(t && !t.eseed && !t.spk) target=t;
  }
  if(!target) return;
  GS.critters.push({x:target.x, y:target.y+GS.H*0.95, vx:0, vy:0, st:"fall", land:target,
                 rot:0, vr:0, sq:0, t:0});
  GS.critNext=GS.gt+P.critGap/1000;
  sfx("whistle");
}
function knock(c: Critter, away: number){
  c.st="gone"; c.vx=away*P.stepX*3.2; c.vy=P.stepY*7; c.vr=away*9; c.land=null;
}
export function updateCritters(dt: number){
  var s=Math.min(P.platW*0.5,26);
  for(var i=GS.critters.length-1;i>=0;i--){
    var c=GS.critters[i];
    if(c.sq>0) c.sq-=dt*5;
    if(c.st==="fall"){
      c.vy-=P.grav*dt; c.y+=c.vy*dt;
      var L=c.land;
      if(L && GS.pmap[L.gx+","+L.gy]===L && c.y<=L.y){        // thump
        c.y=L.y; c.vy=0; c.st="sit"; c.t=P.critSit/1000; c.sq=1.3; sfx("thump");
        GS.puffs.push({x:c.x,y:c.y,r:0,life:0.28,col:"235,222,190"});
      }
    }else if(c.st==="sit"){
      c.t-=dt;
      if(c.land && GS.pmap[c.land.gx+","+c.land.gy]!==c.land){ c.st="fall"; c.land=null; }
      else if(c.t<=0) knock(c, c.x>=GS.pl.x ? 1 : -1);        // wanders off, away from you
    }else{                                                  // tumbling away
      c.vy-=P.grav*0.75*dt; c.y+=c.vy*dt; c.x+=c.vx*dt; c.rot+=c.vr*dt;
    }
    if(c.y < GS.pl.y-GS.H*1.2){ GS.critters.splice(i,1); continue; }
    // harmless contact: you bump it off its perch
    if(c.st!=="gone" && Math.abs(c.x-GS.pl.x)<s*0.85 && GS.pl.y<c.y+s*0.9 && c.y<GS.pl.y+s*0.9){
      knock(c, c.x>=GS.pl.x ? 1 : -1); sfx("squeak");
    }
  }
}
