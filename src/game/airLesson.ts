import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { P } from "../config/params";
import { HUD_CLEAR, zoom } from "../render/camera";
import { ctx } from "../render/canvas";
import { rr } from "../render/draw";
import { save, writeSave } from "../storage/save";
import { toast } from "../ui/skins";
import { isHole } from "../world/grid";
import type { Plat } from "../core/types";

// ---- the air-jump lesson. until you've cleared a gap with an air jump once (remembered
// for good), reaching a gap shows a ghost doing the move and a prompt; flying into one
// says "tap again". any gap counts: built, collapsed or a lift shaft.

export interface Hint {
  air: boolean;        // mid-flight: "tap again" rather than the ghost demo
  dir: number;
  from?: Plat;         // the tile the ghost jumps from (on the ground only)
  to: Plat;            // where the air jump lands
  btn: string;         // the pad button to glow, "dir,up"
}

export function gapCell(gx: number, gy: number){ return isHole(gx,gy) && !GS.pmap[gx+","+gy]; }   // a parked lift fills it
export function djHint(): Hint | null {
  if(!P.teach || !P.dj || save.djDone || GS.state!=="play" || GS.ride) return null;
  if(GS.pl.ground && GS.pl.p){
    var c=GS.pl.p;
    if(GS.pl.boost || c.dn) return null;             // a spring jumps it for you; down-only can't
    for(var d=-1;d<=1;d+=2){
      var to=GS.pmap[(c.gx+2*d)+","+(c.gy+2)];
      if(to && gapCell(c.gx+d,c.gy+1)) return {air:false, dir:d, from:c, to:to, btn:d+",true"};
    }
    return null;
  }
  if(GS.pl.djLeft>0 && GS.pl.tgx!==undefined && gapCell(GS.pl.tgx,GS.pl.tgy!)){
    var nx=GS.pmap[(GS.pl.tgx+GS.pl.ldx!)+","+(GS.pl.tgy!+GS.pl.ldy!)];
    if(nx) return {air:true, dir:GS.pl.ldx!, to:nx, btn:GS.pl.lbtn!};
  }
  return null;
}
// where the demo ghost is, t seconds into its loop: a wait, the jump, an air jump at the
// top of the arc (the same arcs the real cube flies), a landing beat, then again.
interface GhostPose { x: number; y: number; alpha: number; puff: number; px?: number; py?: number; }
const G_WAIT=0.45; const G_REST=0.55;
export function ghostAt(h: Hint, t: number){
  var g=P.grav, S=P.stepY, a=h.from!;
  var v0=Math.sqrt(2*g*S*P.apex), T1=(v0+Math.sqrt(Math.max(0,v0*v0-2*g*S)))/g;
  var vx=h.dir*P.stepX/T1, ta=v0/g;
  var xa=a.x+vx*ta, ya=a.y+v0*ta-0.5*g*ta*ta;
  var dx=h.to.x-xa, dy=h.to.y-ya, clear=S*Math.max(0.35,P.apex-1);
  var v2=Math.sqrt(2*g*(Math.max(dy,0)+clear)), T2=(v2+Math.sqrt(Math.max(0.0001,v2*v2-2*g*dy)))/g;
  var loop=G_WAIT+ta+T2+G_REST, u=t%loop, r: GhostPose={x:a.x,y:a.y,alpha:1,puff:-1};
  if(u<G_WAIT){ r.alpha=u/G_WAIT; return r; }
  u-=G_WAIT;
  if(u<ta){ r.x=a.x+vx*u; r.y=a.y+v0*u-0.5*g*u*u; return r; }
  u-=ta; r.puff=u; r.px=xa; r.py=ya;
  if(u<T2){ r.x=xa+dx/T2*u; r.y=ya+v2*u-0.5*g*u*u; return r; }
  u-=T2; r.x=h.to.x; r.y=h.to.y; r.alpha=1-u/G_REST; return r;
}
// a small amber pill over the landing tile (or over the cube, mid-air), pulsing
export function drawHint(h: Hint){
  var z=zoom(), a=h.air?GS.pl:h.to;
  var X=GS.W*0.5+(a.x-GS.camX)*z, Y=GS.H*P.camPos-(a.y-GS.camY)*z-(h.air?60:84);   // clear of the ghost landing
  X=Math.max(100,Math.min(GS.W-100,X)); Y=Math.max(HUD_CLEAR+18,Y);
  var arrow=h.btn.charAt(0)==="-"?"↖":"↗";
  var main=h.air?"TAP "+arrow+" AGAIN!":"DOUBLE JUMP", sub=h.air?"":arrow+" then "+arrow+" again mid-air";
  var k=0.5+0.5*Math.sin(GS.gt*(h.air?14:7));
  ctx.save(); ctx.translate(X,Y); ctx.scale(1+0.06*k,1+0.06*k);
  ctx.font="800 "+(h.air?17:15)+"px system-ui,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  var tw=ctx.measureText(main).width+24, th=h.air?32:28;
  ctx.shadowColor="rgba(255,190,90,"+(0.35+0.4*k)+")"; ctx.shadowBlur=14;
  ctx.fillStyle="#ffbe5a"; rr(-tw/2,-th/2,tw,th,th/2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle="#1a1206"; ctx.fillText(main,0,1);
  if(sub){
    ctx.font="600 12px system-ui,sans-serif"; ctx.fillStyle="rgba(255,236,200,.92)";
    ctx.fillText(sub,0,th/2+12);
  }
  ctx.restore();
}
export function learnedAirJump(){
  if(save.djDone) return;
  save.djDone=1; writeSave();
  toast("Nice! <b>Double jump</b> learned"); sfx("unlock");
}
