import { GS } from "../core/state";
import { P } from "../config/params";
import { ctx } from "./canvas";
import type { Plat } from "../core/types";

// ---------------------------------------------------------------------------
// SKIN PAINT — how a skin marks the plain tiles you've stood on, in place of the usual
// mint. only plain, visited, non-fork tiles: special tiles and forks keep their colours,
// because those carry information. a tile's paint animates in from q.vt, its first
// landing; q.lt is the latest landing. none of it uses red (the walker).
// ---------------------------------------------------------------------------
type ToScreen = (v: number) => number;

function box(x: number, y: number, w: number, h: number, r: number){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
// 1 → 0 over the first quarter second after the first landing
function fresh(q: Plat){ return q.vt===undefined ? 0 : Math.max(0, 1-(GS.gt-q.vt)/0.25); }
// a fixed number in [0,1) per tile, so tiles don't all twinkle in step
function hash(q: Plat){ var n=Math.sin(q.gx*127.1+q.gy*311.7)*43758.5453; return n-Math.floor(n); }

// RAINBOW: the colour follows height, so your route becomes a ribbon. it sweeps from
// yellow-green through blue to magenta and back every 24 rows, clear of the fork orange.
export function rainbowHue(gy: number){ return 75+240*(0.5-0.5*Math.cos(gy*Math.PI*2/24)); }

const CYAN="110,230,255";      // Robot's wires
const NEON="255,92,225";       // Shades
const STAR="225,232,255";      // Galaxy

/** Paints visited tile q for the skin's paint style. X is its centre, Y its top, on screen. */
export function paintTile(style: string, q: Plat, X: number, Y: number){
  var w=P.platW, h=P.platH, x=X-w/2, f=fresh(q), k=hash(q), t=GS.gt;
  switch(style){
    case "rainbow": {
      var hue=rainbowHue(q.gy);
      ctx.fillStyle="hsla("+hue+",80%,"+(58+30*f)+"%,.93)"; box(x,Y,w,h,4); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,.28)"; box(x+3,Y+1.5,w-6,Math.max(1.5,h*0.22),1.5); ctx.fill();
      break;
    }
    case "circuit": {          // ROBOT: a pad with a chip, two contacts and a blinking LED
      ctx.fillStyle="#15253a"; box(x,Y,w,h,3); ctx.fill();
      ctx.strokeStyle="rgba("+CYAN+","+(0.75+0.25*f)+")"; ctx.lineWidth=1.5+2*f; box(x,Y,w,h,3); ctx.stroke();
      ctx.fillStyle="#0b1422"; ctx.fillRect(X-w*0.16,Y+h*0.22,w*0.32,h*0.56);
      ctx.fillStyle="rgba("+CYAN+",.85)"; ctx.fillRect(x+4,Y+h/2-1.5,3,3); ctx.fillRect(x+w-7,Y+h/2-1.5,3,3);
      var led=((t*0.7+k*3)%3)<0.15 || f>0;
      ctx.fillStyle=led ? "rgba(140,255,190,.95)" : "rgba(70,120,100,.7)";
      ctx.fillRect(X-1.5,Y+h/2-1.5,3,3);
      break;
    }
    case "neon": {             // SHADES: a dark tile with a glowing neon edge that flickers on
      var on = f>0 ? (Math.sin(t*90)>-0.2 ? 1 : 0.25) : 1;
      ctx.fillStyle="rgba(20,16,34,.92)"; box(x,Y,w,h,4); ctx.fill();
      ctx.strokeStyle="rgba("+NEON+","+(0.22*on)+")"; ctx.lineWidth=6; box(x,Y,w,h,4); ctx.stroke();
      ctx.strokeStyle="rgba("+NEON+","+(0.95*on)+")"; ctx.lineWidth=1.6; box(x,Y,w,h,4); ctx.stroke();
      break;
    }
    case "splat": {            // GRAPE: a juice splat on the grey tile, with drips that grow
      ctx.fillStyle="rgba(120,136,170,.55)"; box(x,Y,w,h,4); ctx.fill();
      var grow=1-f, cw=w*0.36*(0.55+0.45*grow);
      ctx.fillStyle="rgba(154,107,255,.95)";
      ctx.beginPath(); ctx.ellipse(X+(k-0.5)*6,Y+h*0.5,cw,h*0.5,0,0,6.3); ctx.fill();
      for(var d=0;d<3;d++){                          // spatter around it
        var a=k*6.3+d*2.1, rx=X+Math.cos(a)*(cw+4), ry=Y+h*0.5+Math.sin(a)*h*0.45;
        ctx.beginPath(); ctx.arc(rx,ry,1.6*grow,0,6.3); ctx.fill();
      }
      var age=q.vt===undefined ? 9 : t-q.vt;          // drips run down over ~1.5 s, then hang
      for(var dr=0;dr<2;dr++){
        var dx=X+(dr ? 0.22 : -0.14)*w+(k-0.5)*8, len=Math.min(1,age/1.5)*(5+((k*7+dr*3)%1)*7);
        ctx.fillRect(dx-1.2,Y+h-1,2.4,len);
        ctx.beginPath(); ctx.arc(dx,Y+h-1+len,2,0,6.3); ctx.fill();
      }
      break;
    }
    case "footprints": {       // GHOST: barely marked, plus a glowing print that fades after you leave
      ctx.fillStyle="rgba(165,185,225,.5)"; box(x,Y,w,h,4); ctx.fill();
      var since=q.lt===undefined ? 9 : t-q.lt, fade=Math.max(0,1-since/2.5);
      if(fade>0){
        ctx.fillStyle="rgba(214,228,255,"+(0.85*fade)+")";
        box(X-9,Y+h*0.25,7,h*0.5,2); ctx.fill(); box(X+2,Y+h*0.25,7,h*0.5,2); ctx.fill();
      }
      break;
    }
    case "gold": {             // GOLD: solid gold, with a shine that sweeps across now and then
      var g=ctx.createLinearGradient(x,Y,x,Y+h);
      g.addColorStop(0,"#ffe58f"); g.addColorStop(0.6,"#e8b53c"); g.addColorStop(1,"#a8771c");
      ctx.fillStyle=g; box(x,Y,w,h,4); ctx.fill();
      var sp=((t*0.45+k)%2.2)/2.2*(w+30)-15;            // one sweep per ~2 s, offset per tile
      ctx.save(); box(x,Y,w,h,4); ctx.clip();
      ctx.fillStyle="rgba(255,255,255,"+(0.5+0.4*f)+")";
      ctx.beginPath(); ctx.moveTo(x+sp,Y); ctx.lineTo(x+sp+6,Y); ctx.lineTo(x+sp+2,Y+h); ctx.lineTo(x+sp-4,Y+h); ctx.fill();
      ctx.restore();
      if(f>0){ ctx.strokeStyle="rgba(255,240,180,"+f+")"; ctx.lineWidth=2.5; box(x-2,Y-2,w+4,h+4,5); ctx.stroke(); }
      break;
    }
    case "constellation": {    // GALAXY: night-sky tiles, each holding one star of your constellation
      ctx.fillStyle="rgba(29,33,96,.95)"; box(x,Y,w,h,4); ctx.fill();
      ctx.strokeStyle="rgba(150,170,255,.55)"; ctx.lineWidth=1; box(x,Y,w,h,4); ctx.stroke();
      for(var s=0;s<3;s++){                           // a little dust
        ctx.fillStyle="rgba("+STAR+","+(0.25+0.3*Math.abs(Math.sin(t*1.7+k*9+s)))+")";
        ctx.fillRect(x+6+((k*97+s*31)%1)*(w-12),Y+2+((k*53+s*17)%1)*(h-4),1.2,1.2);
      }
      star(X,Y+h/2,2.6+3*f+0.6*Math.sin(t*3+k*6));
      break;
    }
    case "crystal": {          // DIAMOND: ice-clear facets with a glint that flashes across
      var cg=ctx.createLinearGradient(x,Y,x+w,Y+h);
      cg.addColorStop(0,"rgba(240,253,255,.95)"); cg.addColorStop(1,"rgba(120,200,235,.9)");
      ctx.fillStyle=cg; box(x,Y,w,h,3); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.8)"; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x+w*0.18,Y); ctx.lineTo(x+w*0.34,Y+h); ctx.moveTo(x+w*0.5,Y); ctx.lineTo(x+w*0.34,Y+h);
      ctx.moveTo(x+w*0.5,Y); ctx.lineTo(x+w*0.68,Y+h); ctx.moveTo(x+w*0.84,Y); ctx.lineTo(x+w*0.68,Y+h);
      ctx.stroke();
      var gl=Math.max(0,Math.sin(t*2.2+k*20));
      if(gl>0.9 || f>0){ var r=3+5*Math.max(f,(gl-0.9)*10); sparkle(x+w*(0.2+0.6*k),Y+h*0.35,r); }
      break;
    }
  }
}
// a four-pointed glint
function sparkle(x: number, y: number, r: number){
  ctx.fillStyle="rgba(255,255,255,.95)";
  ctx.beginPath(); ctx.moveTo(x,y-r); ctx.lineTo(x+r*0.22,y); ctx.lineTo(x,y+r); ctx.lineTo(x-r*0.22,y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-r,y); ctx.lineTo(x,y+r*0.22); ctx.lineTo(x+r,y); ctx.lineTo(x,y-r*0.22); ctx.closePath(); ctx.fill();
}
function star(x: number, y: number, r: number){
  ctx.fillStyle="rgba("+STAR+",.25)"; ctx.beginPath(); ctx.arc(x,y,r*1.8,0,6.3); ctx.fill();
  sparkle(x,y,r*1.4);
}

// ---- lines along your path, drawn under the tiles: Robot's wires and Galaxy's constellation.
// long hops (falls, rides) start a new line instead of drawing one across the screen.
function linked(a: Plat, b: Plat){ return Math.abs(a.gx-b.gx)<=2 && Math.abs(a.gy-b.gy)<=2 && a!==b; }
// Robot's wire between two pads: across, up or down, across
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

/** The lines along your path for the skins that have them (circuit, constellation). */
export function drawPath(style: string, sx: ToScreen, sy: ToScreen){
  var path=GS.path; if(path.length<2) return;
  if(style!=="circuit" && style!=="constellation") return;
  var circuit=style==="circuit";
  ctx.lineWidth=circuit ? 2 : 1.2; ctx.lineJoin="round";
  ctx.strokeStyle=circuit ? "rgba("+CYAN+",.32)" : "rgba("+STAR+",.4)";
  ctx.beginPath();
  for(var i=1;i<path.length;i++){
    var a=path[i-1], b=path[i]; if(!linked(a,b)) continue;
    var Y=sy(b.y); if(Y<-GS.H || Y>2*GS.H) continue;
    if(circuit){
      var p=wire(a,b,sx,sy);
      ctx.moveTo(p[0],p[1]); ctx.lineTo(p[2],p[3]); ctx.lineTo(p[4],p[5]); ctx.lineTo(p[6],p[7]);
    }else{                                         // star to star, straight
      ctx.moveTo(sx(a.x),sy(a.y)+P.platH/2); ctx.lineTo(sx(b.x),Y+P.platH/2);
    }
  }
  ctx.stroke();
  if(!circuit) return;
  // Robot: a pulse runs from older to newer along the last few wires, once per 0.9 s
  var n=Math.min(6, path.length-1), t=(GS.gt/0.9)%1, seg=Math.floor(t*n), k=t*n-seg;
  var A=path[path.length-1-n+seg], B=path[path.length-n+seg];
  if(A && B && linked(A,B)){
    var pt=pointOn(wire(A,B,sx,sy), k);
    ctx.fillStyle="rgba(200,250,255,.95)"; ctx.fillRect(pt[0]-2,pt[1]-2,4,4);
    ctx.fillStyle="rgba("+CYAN+",.25)"; ctx.fillRect(pt[0]-4,pt[1]-4,8,8);
  }
}
