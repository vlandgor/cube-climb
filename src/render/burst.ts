import { GS } from "../core/state";
import { ctx } from "./canvas";

// ---------------------------------------------------------------------------
// LANDING BURSTS — each skin's little puff of particles when you land. one burst per
// real landing (sim.ts), never while standing. every particle's path is worked out from
// its age, so nothing needs stepping: a burst is just where and when it started.
// ---------------------------------------------------------------------------
export interface Burst { kind: string; x: number; y: number; t0: number; seed: number; }

const LIFE: Record<string, number>={
  dust:0.32, ring:0.3, drops:0.42, wisps:0.7, bits:0.38, coins:0.55, stars:0.7, confetti:0.75, shards:0.4,
};

export function spawnBurst(kind: string, x: number, y: number){
  if(!LIFE[kind]) return;
  GS.bursts.push({kind:kind, x:x, y:y, t0:GS.gt, seed:Math.random()*1000});
  if(GS.bursts.length>12) GS.bursts.shift();
}

// a fixed random number per particle i of a burst
function rnd(b: Burst, i: number){ var n=Math.sin(b.seed+i*12.9898)*43758.5453; return n-Math.floor(n); }
function sparkle(x: number, y: number, r: number){
  ctx.beginPath(); ctx.moveTo(x,y-r); ctx.lineTo(x+r*0.25,y); ctx.lineTo(x,y+r); ctx.lineTo(x-r*0.25,y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-r,y); ctx.lineTo(x,y+r*0.25); ctx.lineTo(x+r,y); ctx.lineTo(x,y-r*0.25); ctx.closePath(); ctx.fill();
}

/** Draws the live bursts. X and Y are the landing spot on screen (screen y grows downward). */
export function drawBursts(sx: (v: number) => number, sy: (v: number) => number){
  for(var bi=GS.bursts.length-1;bi>=0;bi--){
    var b=GS.bursts[bi], age=GS.gt-b.t0, life=LIFE[b.kind];
    if(age>life || age<0){ GS.bursts.splice(bi,1); continue; }
    var u=age/life, fade=1-u, X=sx(b.x), Y=sy(b.y), i: number, a: number, d: number;
    ctx.save();
    switch(b.kind){
      case "dust":       // Classic: two soft puffs sliding out from under the cube
        for(i=0;i<2;i++){
          d=(i?1:-1)*(6+26*Math.sqrt(u));
          ctx.fillStyle="rgba(170,190,225,"+(0.45*fade)+")";
          ctx.beginPath(); ctx.arc(X+d,Y-2-4*u,3+4*u,0,6.3); ctx.fill();
        }
        break;
      case "ring":       // Shades: a neon ring flattening out across the tile
        ctx.strokeStyle="rgba(255,92,225,"+(0.9*fade)+")"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.ellipse(X,Y,8+30*u,3+6*u,0,0,6.3); ctx.stroke();
        ctx.strokeStyle="rgba(255,92,225,"+(0.25*fade)+")"; ctx.lineWidth=6; ctx.stroke();
        break;
      case "drops":      // Grape: juice splashing up in short arcs to both sides
        ctx.fillStyle="rgba(154,107,255,"+fade+")";
        for(i=0;i<6;i++){
          var side=i%2 ? 1 : -1, vx=side*(40+70*rnd(b,i)), vy=110+90*rnd(b,i+9);
          ctx.beginPath(); ctx.arc(X+vx*age, Y-(vy*age-520*age*age), 2.2*(1-0.4*u), 0, 6.3); ctx.fill();
        }
        break;
      case "wisps":      // Ghost: pale wisps curling upward and thinning out
        for(i=0;i<3;i++){
          var wx=X+(i-1)*12+Math.sin(age*7+i*2)*5, wy=Y-6-50*u-i*3;
          ctx.fillStyle="rgba(214,228,255,"+(0.35*fade)+")";
          ctx.beginPath(); ctx.ellipse(wx,wy,3+3*u,6+4*u,0,0,6.3); ctx.fill();
        }
        break;
      case "bits":       // Robot: pixels shooting out sideways along the tile, blinking off
        for(i=0;i<8;i++){
          d=(i%2 ? 1 : -1)*(10+(30+30*rnd(b,i))*(1-Math.pow(1-u,3)));
          if(((age*30+i)|0)%4===0) continue;         // blink
          ctx.fillStyle=i%3 ? "rgba(110,230,255,"+fade+")" : "rgba(140,255,190,"+fade+")";
          ctx.fillRect(X+d-1.5, Y-3-(rnd(b,i+5)*10)*u-1.5, 3, 3);
        }
        break;
      case "coins":      // Gold: two coins hop up, spinning, and vanish at the top
        for(i=0;i<2;i++){
          var cx=X+(i?1:-1)*(8+14*u), cy=Y-8-(170*age-300*age*age), spin=Math.abs(Math.cos(age*18+i*1.3));
          ctx.fillStyle="rgba(255,214,96,"+fade+")";
          ctx.beginPath(); ctx.ellipse(cx,cy,5*spin+0.8,5,0,0,6.3); ctx.fill();
          ctx.fillStyle="rgba(255,245,200,"+(0.9*fade)+")";
          ctx.beginPath(); ctx.ellipse(cx-1.2*spin,cy-1.2,1.8*spin+0.3,2,0,0,6.3); ctx.fill();
        }
        break;
      case "stars":      // Galaxy: little stars drifting up and out, twinkling
        for(i=0;i<5;i++){
          a=Math.PI*(0.15+0.7*rnd(b,i)); d=10+40*Math.sqrt(u)*(0.6+0.4*rnd(b,i+3));
          var tw=0.5+0.5*Math.sin(age*20+i*2);
          ctx.fillStyle="rgba(225,232,255,"+(fade*(0.5+0.5*tw))+")";
          sparkle(X+Math.cos(a)*d, Y-6-Math.sin(a)*d, 2+2*tw);
        }
        break;
      case "confetti":   // Rainbow: confetti thrown up, then fluttering slowly down
        for(i=0;i<8;i++){
          var hue=75+240*rnd(b,i), fx=X+(rnd(b,i+2)-0.5)*70*Math.sqrt(u)+Math.sin(age*9+i)*3;
          var fy=Y-8-(150*age-200*age*age)*(0.7+0.3*rnd(b,i+4));
          ctx.fillStyle="hsla("+hue+",85%,62%,"+fade+")";
          ctx.save(); ctx.translate(fx,fy); ctx.rotate(age*8+i); ctx.fillRect(-2.5,-1.2,5,2.4); ctx.restore();
        }
        break;
      case "shards":     // Diamond: a flash, then crystal slivers flying outward and spinning
        if(u<0.3){ ctx.fillStyle="rgba(255,255,255,"+(1-u/0.3)+")"; sparkle(X,Y-6,10*(1-u/0.3)+4); }
        for(i=0;i<6;i++){
          a=Math.PI*(i/5)+rnd(b,i)*0.4; d=8+45*(1-Math.pow(1-u,2));
          ctx.fillStyle=i%2 ? "rgba(240,253,255,"+fade+")" : "rgba(150,215,240,"+fade+")";
          ctx.save(); ctx.translate(X+Math.cos(a)*d, Y-4-Math.sin(a)*d*0.6); ctx.rotate(age*10+i);
          ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(2,2); ctx.lineTo(-2,2); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        break;
    }
    ctx.restore();
  }
}
