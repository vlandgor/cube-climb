import { GS } from "../core/state";
import { P } from "../config/params";
import { ctx } from "./canvas";
import type { Plat } from "../core/types";

// ---------------------------------------------------------------------------
// SKIN PAINT — how a skin marks the plain tiles you've stood on, in place of the usual
// mint. only plain, visited, non-fork tiles: special tiles and forks keep their colours,
// because those carry information. a tile's paint animates in from q.vt, its first landing.
// ---------------------------------------------------------------------------
type ToScreen = (v: number) => number;

function box(x: number, y: number, w: number, h: number, r: number){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
// 0 → 1 over the first quarter second after the first landing
function fresh(q: Plat){ return q.vt===undefined ? 0 : Math.max(0, 1-(GS.gt-q.vt)/0.25); }

// RAINBOW: the colour follows height, so your route becomes a ribbon. it sweeps from
// yellow-green through blue to magenta and back every 24 rows: never red (the walker)
// and kept clear of the fork orange.
export function rainbowHue(gy: number){ return 75+240*(0.5-0.5*Math.cos(gy*Math.PI*2/24)); }

// ROBOT: each tile is a circuit pad, wired to the one you landed on before it.
const CYAN="110,230,255";

/** Paints visited tile q for the skin's paint style. X is its centre, Y its top, on screen. */
export function paintTile(style: string, q: Plat, X: number, Y: number){
  var w=P.platW, h=P.platH, x=X-w/2, f=fresh(q);
  if(style==="rainbow"){
    var hue=rainbowHue(q.gy);
    ctx.fillStyle="hsla("+hue+",80%,"+(58+30*f)+"%,.93)"; box(x,Y,w,h,4); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.28)"; box(x+3,Y+1.5,w-6,Math.max(1.5,h*0.22),1.5); ctx.fill();
  }else if(style==="circuit"){
    ctx.fillStyle="#15253a"; box(x,Y,w,h,3); ctx.fill();
    ctx.strokeStyle="rgba("+CYAN+","+(0.75+0.25*f)+")"; ctx.lineWidth=1.5+2*f; box(x,Y,w,h,3); ctx.stroke();
    // a chip in the middle and a contact on each end; the LED blinks now and then
    ctx.fillStyle="#0b1422"; ctx.fillRect(X-w*0.16,Y+h*0.22,w*0.32,h*0.56);
    ctx.fillStyle="rgba("+CYAN+",.85)"; ctx.fillRect(x+4,Y+h/2-1.5,3,3); ctx.fillRect(x+w-7,Y+h/2-1.5,3,3);
    var led=((GS.gt*0.7+q.gx*0.37+q.gy*0.61)%3)<0.15 || f>0;
    ctx.fillStyle=led ? "rgba(140,255,190,.95)" : "rgba(70,120,100,.7)";
    ctx.fillRect(X-1.5,Y+h/2-1.5,3,3);
  }
}

// the trace between two consecutive pads: across, up or down, across. long hops (falls,
// rides) start a new wire instead of drawing one across the screen.
function linked(a: Plat, b: Plat){ return Math.abs(a.gx-b.gx)<=2 && Math.abs(a.gy-b.gy)<=2 && a!==b; }
function wire(a: Plat, b: Plat, sx: ToScreen, sy: ToScreen): number[]{
  var ay=sy(a.y)+P.platH/2, by=sy(b.y)+P.platH/2, ax=sx(a.x), bx=sx(b.x), mx=(ax+bx)/2;
  return [ax,ay, mx,ay, mx,by, bx,by];
}
function pointOn(pts: number[], t: number){
  var len=0, segs: number[]=[];
  for(var i=0;i<pts.length-2;i+=2){ var d=Math.hypot(pts[i+2]-pts[i],pts[i+3]-pts[i+1]); segs.push(d); len+=d; }
  var at=t*len;
  for(var j=0;j<segs.length;j++){
    if(at<=segs[j] || j===segs.length-1){ var k=segs[j] ? at/segs[j] : 0;
      return [pts[j*2]+(pts[j*2+2]-pts[j*2])*k, pts[j*2+1]+(pts[j*2+3]-pts[j*2+1])*k]; }
    at-=segs[j];
  }
  return [pts[0],pts[1]];
}

/** Robot only: the wires along your path, drawn under the tiles, with data pulsing up the newest ones. */
export function drawTraces(sx: ToScreen, sy: ToScreen){
  var path=GS.path; if(path.length<2) return;
  ctx.lineWidth=2; ctx.lineJoin="round";
  ctx.strokeStyle="rgba("+CYAN+",.32)";
  ctx.beginPath();
  for(var i=1;i<path.length;i++){
    var a=path[i-1], b=path[i]; if(!linked(a,b)) continue;
    var Y=sy(b.y); if(Y<-GS.H || Y>2*GS.H) continue;
    var p=wire(a,b,sx,sy);
    ctx.moveTo(p[0],p[1]); ctx.lineTo(p[2],p[3]); ctx.lineTo(p[4],p[5]); ctx.lineTo(p[6],p[7]);
  }
  ctx.stroke();
  // a pulse runs from older to newer along the last few wires, once per 0.9 s
  var n=Math.min(6, path.length-1), t=(GS.gt/0.9)%1, seg=Math.floor(t*n), k=t*n-seg;
  var A=path[path.length-1-n+seg], B=path[path.length-n+seg];
  if(A && B && linked(A,B)){
    var pt=pointOn(wire(A,B,sx,sy), k);
    ctx.fillStyle="rgba(200,250,255,.95)"; ctx.fillRect(pt[0]-2,pt[1]-2,4,4);
    ctx.fillStyle="rgba("+CYAN+",.25)"; ctx.fillRect(pt[0]-4,pt[1]-4,8,8);
  }
}
