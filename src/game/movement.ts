import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { P } from "../config/params";
import { gapCell } from "./airLesson";
import { syncPad } from "../ui/pad";
import { isHole, key, neighbour } from "../world/grid";
import type { Intent, Plat, Target } from "../core/types";

// MOVEMENT — what each button does from where you stand: jumps, drops, back-hops, air jumps,
// the input buffer and the two-button prototype scheme.
export const held: Record<string, boolean>={"-1":false,"1":false}; export const consumed: Record<string, boolean>={"-1":false,"1":false};



// a platform exactly `span` diagonal steps away (2 when launched by a spring)
export function targetOf(cur: Plat | null, dir: number, up: boolean, span: number){
  if(!cur) return null;
  return GS.pmap[key(cur.x+dir*span*P.stepX, cur.y+(up?1:-1)*span*P.stepY)]||null;
}
// a missing tile in the middle of the stairs is a hole — jumping into it is allowed,
// it's on you to air-jump across. an empty cell that was never part of the path
// (the cliff at a turn) is not, and that button stays off.
function holeAt(cur: Plat, dir: number, up: boolean): Target | null{
  var gx=cur.gx+dir, gy=cur.gy+(up?1:-1);
  return isHole(gx,gy) ? {hole:true, x:gx*P.stepX, y:gy*P.stepY} : null;
}
// back-hop: an up press that points away from the stairs (empty space, not a gap)
// arcs high over the platform below and lands two steps back down the staircase.
function backTarget(cur: Plat, dir: number): Target | null{
  var gx=cur.gx+2*dir, gy=cur.gy-2, t=GS.pmap[gx+","+gy];
  if(!t && !isHole(gx,gy)) return null;         // nothing back there: a real cliff
  return {back:true, plat:t||null, hole:!t, x:gx*P.stepX, y:gy*P.stepY};
}
export function avail(cur: Plat | null, dir: number, up: boolean): Target | null{
  if(!cur) return null;
  if(cur.rat && !up) return null;               // ratchet tiles refuse to let you down
  if(cur.dn && up) return null;                 // down-only tiles refuse to let you up
  var r=(GS.pl.boost ? targetOf(cur,dir,up,2) : null) || targetOf(cur,dir,up,1)
        || holeAt(cur,dir,up);
  if(r) return r;
  if(up && P.backflip && !cur.rat) return backTarget(cur,dir);   // ratchet: no descending
  return null;
}

// a free arc from wherever the cube is to an arbitrary platform — used by the air jump
function arcTo(tx: number, ty: number){
  var g=P.grav, dx=tx-GS.pl.x, dy=ty-GS.pl.y;
  var clear=P.stepY*Math.max(0.35,P.apex-1);
  var v0=Math.sqrt(2*g*(Math.max(dy,0)+clear));
  var t=(v0+Math.sqrt(Math.max(0.0001,v0*v0-2*g*dy)))/g;
  GS.pl.vy=v0; GS.pl.vx=dx/t; GS.pl.sq=1;
}

function backHop(it: Intent){
  var src=GS.pl.p!, g=P.grav;
  GS.pl.tgx=src.gx+2*it.dir; GS.pl.tgy=src.gy-2;
  GS.pl.ldx=it.dir; GS.pl.ldy=-1; GS.pl.lbtn=it.dir+","+it.up;   // the line runs down, not up
  var v0=Math.sqrt(2*g*P.stepY*P.apex), dy=-2*P.stepY;    // a full up-jump's height
  var t=(v0+Math.sqrt(v0*v0-2*g*dy))/g;
  GS.pl.vy=v0; GS.pl.vx=it.dir*2*P.stepX/t; GS.pl.ground=false; GS.pl.p=null; GS.pl.sq=1;
  GS.pl.boost=0; GS.lastIntent=it; GS.buf=null; GS.pl.gapTo=null;
  sfx("back");
}

function jump(it: Intent, span?: number){
  span=span||1;
  var src=GS.pl.p;
  if(src){ GS.pl.tgx=src.gx+it.dir*span; GS.pl.tgy=src.gy+(it.up?span:-span); }
  GS.pl.ldx=it.dir; GS.pl.ldy=it.up?1:-1; GS.pl.lbtn=it.dir+","+it.up;
  var g=P.grav, S=span*P.stepY, dy=it.up?S:-S, v0, t;
  if(it.up){
    v0=Math.sqrt(2*g*S*P.apex);
    t=(v0+Math.sqrt(Math.max(0,v0*v0-2*g*dy)))/g;
  }else{
    v0=Math.sqrt(2*g*S*P.apex)*P.back;
    t=(v0+Math.sqrt(v0*v0-2*g*dy))/g;
  }
  GS.pl.vy=v0; GS.pl.vx=it.dir*span*P.stepX/t; GS.pl.ground=false; GS.pl.p=null; GS.pl.sq=1;
  GS.pl.boost=0; GS.lastIntent=it; GS.buf=null; GS.pl.gapTo=null;
  sfx(span>1 ? "launch" : it.up ? "jump" : "drop");
}

export function act(it: Intent, fromTwo?: boolean){
  if(GS.ride) return;                       // the ride is committed
  if(GS.state!=="play") return;             // menus own the input until a run starts
  if(!GS.pl.ground){
    // air jump: push the landing one more step from where this jump was headed
    // always fires, platform or not: aim at the grid cell either way, so an air
    // jump into open space is a real (risky) move rather than a refused one
    if(P.dj && GS.pl.djLeft>0 && GS.pl.tgx!==undefined){
      // same button again: keep going along the line you're flying (so a back-hop
      // continues down the stairs). a different button bends the jump that way.
      var stx=it.dir, sty=it.up?1:-1, btn=it.dir+","+it.up;
      if(GS.pl.lbtn===btn){ stx=GS.pl.ldx!; sty=GS.pl.ldy!; }
      var ng=GS.pl.tgx+stx, nh=GS.pl.tgy!+sty;
      GS.pl.gapTo = gapCell(GS.pl.tgx,GS.pl.tgy!) ? ng+","+nh : null;   // clearing a gap? (the lesson)
      GS.pl.ldx=stx; GS.pl.ldy=sty; GS.pl.lbtn=btn;
      GS.pl.djLeft--; GS.pl.tgx=ng; GS.pl.tgy=nh;
      GS.puffs.push({x:GS.pl.x,y:GS.pl.y,r:0,life:0.32}); sfx("air");
      arcTo(ng*P.stepX, nh*P.stepY);
      GS.lastIntent=it; GS.buf=null; syncPad();
      return;
    }
    if(!P.four && P.air) GS.pl.vx = it.dir*Math.abs(GS.pl.vx||P.stepX*3);
    if(P.buffer>0) GS.buf={dir:it.dir,up:it.up,t:GS.now,two:!!fromTwo};
    syncPad();
    return;
  }
  exec(it);
}
export function exec(it: Intent){
  var cur=GS.pl.p;
  if(!cur) return false;
  var a = avail(cur,it.dir,it.up);              // only cliffs and ratchet-downs refuse
  if(!a && P.ignoreVoid){ GS.reject=0.2; GS.buf=null; syncPad(); sfx("reject"); return false; }
  if(a && a.back){ backHop(it); syncPad(); return true; }
  var span = (GS.pl.boost && targetOf(cur,it.dir,it.up,2)) ? 2 : 1;
  jump(it,span); syncPad(); return true;
}

export function resolve(dir: number, mod: boolean): Intent{
  var up=neighbour(GS.pl.p,dir,1), dn=neighbour(GS.pl.p,dir,-1);
  if(mod && P.useMod) return {dir:dir,up:false,plat:dn};
  if(up) return {dir:dir,up:true,plat:up};
  return {dir:dir,up:false,plat:dn};
}
function fire2(dir: number){
  if(GS.pl.ground) act(resolve(dir, held[String(-dir)]));
  else act({dir:dir,up:true},true);          // resolved properly on landing
  if(P.consume && held[String(-dir)]) consumed[String(-dir)]=true;
}
export function down2(dir: number){
  if(GS.state!=="play") return;
  held[String(dir)]=true; consumed[String(dir)]=false; GS.lastPressed=dir;
  if(!P.onRelease) fire2(dir);
  syncPad();
}
export function up2(dir: number){
  var k=String(dir);
  if(!held[k]){ syncPad(); return; }
  held[k]=false;
  if(P.onRelease && !consumed[k]) fire2(dir);
  consumed[k]=false;
  syncPad();
}
