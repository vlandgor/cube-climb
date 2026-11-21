import { save } from "../storage/save";
import { IS_DEV } from "../platform/dev";

// ---------------------------------------------------------------------------
// SKINS — cosmetic only: a skin changes how the climb looks and sounds, never how it
// plays. unlocked by reaching a height in a single run. none use the walker's red or
// the faller's cream, so a cube is never misread at speed.
// ---------------------------------------------------------------------------
export interface Skin {
  id: string;           // also its name key: skin.<id>
  req: number;          // height to reach in one run to unlock it
  trail?: string;       // afterimage while airborne: ghost | stars | rainbow
  burst: string;        // particles on landing (render/burst.ts)
  paint?: string;       // how plain tiles you've stood on look (render/paint.ts)
  voice?: string;       // movement sounds and a music voice (audio/audio.ts)
  squish?: number;      // how much the cube squashes on landing and stretches in the air (0.28 normal)
}
export const SKINS: Skin[]=[
  {id:"classic", req:0,    burst:"dust"},
  {id:"shades",  req:25,   paint:"neon", voice:"lofi", burst:"ring"},
  {id:"grape",   req:50,   paint:"splat", voice:"bloop", squish:0.5, burst:"drops"},
  {id:"ghost",   req:100,  trail:"ghost", paint:"footprints", voice:"airy", burst:"wisps"},
  {id:"robot",   req:150,  paint:"circuit", voice:"chip", burst:"bits"},
  {id:"gold",    req:250,  paint:"gold", voice:"coin", burst:"coins"},
  {id:"galaxy",  req:400,  trail:"stars", paint:"constellation", voice:"chime", burst:"stars"},
  {id:"rainbow", req:600,  trail:"rainbow", paint:"rainbow", voice:"bell", burst:"confetti"},
  {id:"diamond", req:1000, paint:"crystal", voice:"glass", burst:"shards"}
];
function skinById(id: string){ for(var i=0;i<SKINS.length;i++) if(SKINS[i].id===id) return SKINS[i]; return SKINS[0]; }
// the dev channel (Cube Climb Dev) opens every skin for testing. it doesn't touch the save,
// so height unlocks and their toasts still fire as they would for a player
export function unlocked(s: Skin){ return IS_DEV || s.req===0 || !!(save.unl && save.unl[s.id]); }
export function curSkin(){ var s=skinById(save.skin||"classic"); return unlocked(s)?s:SKINS[0]; }

export function rrc(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
// paint a skinned cube. (X,Y) is the bottom centre, t is time for anything animated,
// lk is -1/0/1 for which way the eyes look
export function paintCube(c: CanvasRenderingContext2D, id: string, X: number, Y: number, w: number, h: number, t: number, lk?: number){
  var x=X-w/2, y=Y-h, r=Math.min(5,w*0.2), s=w/26, i;
  lk=lk||0;
  function eyes(col: string, pupil: string){
    c.fillStyle=col;
    c.beginPath(); c.arc(X-w*0.2,y+h*0.42,3.3*s,0,6.3); c.arc(X+w*0.2,y+h*0.42,3.3*s,0,6.3); c.fill();
    if(pupil){ c.fillStyle=pupil;
      c.beginPath(); c.arc(X-w*0.2+lk!*1.4*s,y+h*0.43,1.7*s,0,6.3); c.arc(X+w*0.2+lk!*1.4*s,y+h*0.43,1.7*s,0,6.3); c.fill(); }
  }
  function stripe(a: number){ c.fillStyle="rgba(255,255,255,"+a+")"; rrc(c,x+3*s,y+3*s,w-6*s,3*s,2*s); c.fill(); }
  switch(id){
    case "shades":
      c.fillStyle="#4b8bff"; rrc(c,x,y,w,h,r); c.fill(); stripe(0.75);
      c.fillStyle="#0d1018"; rrc(c,x+3*s,y+h*0.34,w-6*s,h*0.22,2.5*s); c.fill();
      c.fillStyle="rgba(255,255,255,.55)"; c.fillRect(x+6*s,y+h*0.37,3*s,1.6*s); c.fillRect(X+3*s,y+h*0.37,3*s,1.6*s);
      break;
    case "grape":
      c.fillStyle="#7a5cff"; rrc(c,x,y,w,h,r); c.fill(); stripe(0.3);
      eyes("#fff","#1a1440");
      break;
    case "ghost":
      c.fillStyle="rgba(214,228,255,.82)"; rrc(c,x,y,w,h,r); c.fill();
      c.fillStyle="#24304a";
      c.beginPath(); c.ellipse(X-w*0.2+lk*s,y+h*0.42,2.4*s,3.4*s,0,0,6.3); c.ellipse(X+w*0.2+lk*s,y+h*0.42,2.4*s,3.4*s,0,0,6.3); c.fill();
      c.beginPath(); c.ellipse(X,y+h*0.72,2.2*s,1.8*s,0,0,6.3); c.fill();
      break;
    case "robot":
      c.strokeStyle="#9aa8c4"; c.lineWidth=1.6*s;
      c.beginPath(); c.moveTo(X,y); c.lineTo(X,y-6*s); c.stroke();
      c.fillStyle="#ffd75a"; c.beginPath(); c.arc(X,y-7*s,2.2*s,0,6.3); c.fill();
      c.fillStyle="#6f82a8"; rrc(c,x,y,w,h,r*0.6); c.fill();
      c.fillStyle="#2a3550"; rrc(c,x+3*s,y+h*0.32,w-6*s,h*0.24,2*s); c.fill();
      var blink=(t%2.4)<0.12;
      c.fillStyle="rgba(120,240,255,"+(blink?0.25:0.95)+")";
      c.fillRect(x+5*s+lk*2*s,y+h*0.4,w-10*s,2.2*s);
      c.fillStyle="#56688c"; c.fillRect(x+4*s,y+h*0.72,w-8*s,1.6*s);
      break;
    case "gold":
      var g=c.createLinearGradient(x,y,x+w,y+h); g.addColorStop(0,"#ffe58f"); g.addColorStop(0.55,"#e8b53c"); g.addColorStop(1,"#a8771c");
      c.fillStyle=g; rrc(c,x,y,w,h,r); c.fill();
      c.save(); rrc(c,x,y,w,h,r); c.clip();
      var sp=((t*0.7)%1.6-0.3)*w*1.6;
      c.fillStyle="rgba(255,255,255,.55)";
      c.beginPath(); c.moveTo(x+sp,y); c.lineTo(x+sp+5*s,y); c.lineTo(x+sp-h*0.6+5*s,y+h); c.lineTo(x+sp-h*0.6,y+h); c.fill();
      c.restore();
      c.strokeStyle="rgba(120,80,10,.6)"; c.lineWidth=1.2*s; rrc(c,x,y,w,h,r); c.stroke();
      break;
    case "galaxy":
      c.fillStyle="#1d2160"; rrc(c,x,y,w,h,r); c.fill();
      for(i=0;i<7;i++){
        var sx2=x+((i*37)%23+2)/26*w, sy2=y+((i*53)%22+2)/26*h, tw=0.4+0.6*Math.abs(Math.sin(t*2+i*1.7));
        c.fillStyle="rgba(230,235,255,"+tw+")"; c.fillRect(sx2,sy2,1.6*s,1.6*s);
      }
      c.strokeStyle="rgba(150,170,255,.9)"; c.lineWidth=1.5*s; rrc(c,x,y,w,h,r); c.stroke();
      break;
    case "rainbow":
      // sweeps yellow → green → blue → magenta and back, never through red (the walker)
      c.fillStyle="hsl("+(45+270*(0.5-0.5*Math.cos(t*0.9)))+",85%,60%)"; rrc(c,x,y,w,h,r); c.fill(); stripe(0.7);
      break;
    case "diamond":
      var dg=c.createLinearGradient(x,y,x+w,y+h); dg.addColorStop(0,"#f2fdff"); dg.addColorStop(1,"#7fcff0");
      c.fillStyle=dg; rrc(c,x,y,w,h,r); c.fill();
      c.strokeStyle="rgba(255,255,255,.75)"; c.lineWidth=1*s;
      c.beginPath(); c.moveTo(x,y); c.lineTo(X,y+h*0.45); c.lineTo(x+w,y);
      c.moveTo(x,y+h); c.lineTo(X,y+h*0.45); c.lineTo(x+w,y+h); c.stroke();
      var tw2=Math.max(0,Math.sin(t*3));
      c.fillStyle="rgba(255,255,255,"+tw2+")"; c.fillRect(x+w*0.72,y+h*0.18,2*s,2*s);
      break;
    default:                                            // classic
      c.fillStyle="#4b8bff"; rrc(c,x,y,w,h,r); c.fill(); stripe(0.75);
  }
}
