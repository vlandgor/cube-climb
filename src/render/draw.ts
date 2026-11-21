import { GS } from "../core/state";
import { $ } from "../ui/dom";
import { P } from "../config/params";
import { djHint, drawHint, ghostAt } from "../game/airLesson";
import { avail, held, resolve, targetOf } from "../game/movement";
import { zoom } from "./camera";
import { ctx } from "./canvas";
import { curSkin, paintCube } from "./skins";
import { drawTraces, paintTile } from "./paint";
import { allBest } from "../storage/save";
import { syncPad } from "../ui/pad";
import { danger } from "../world/difficulty";
import { deathY, waysUp } from "../world/grid";
import { cooling, isElev } from "../world/tiles";
import type { Plat } from "../core/types";

// DRAW — the camera window and every frame of the world, then the HUD numbers.
let ghostFrom: Plat | null | undefined=null;
let ghostT0=0;
let trailAt=0;
export function draw(){
  // camera window: the cube may move freely inside a box at the centre of frame.
  // the camera only moves when the cube would leave it, and then only by enough to
  // keep it on the edge — so a jump arc that fits inside the box moves nothing.
  var z=zoom();                                  // box sizes stay the same share of the screen
  var halfH=GS.H*P.boxY/z, halfW=GS.W*P.boxX/z;
  var dy=GS.pl.y-GS.camY, tgtY=GS.camY;
  if(dy>halfH) tgtY=GS.pl.y-halfH;
  else if(dy<-halfH) tgtY=GS.pl.y+halfH;

  var falling = !GS.pl.ground && !GS.ride && GS.pl.vy<0;
  if(falling) tgtY -= Math.min(GS.H*0.3/z, -GS.pl.vy*P.look);

  var tgtX=GS.camX, dx=GS.pl.x-GS.camX;
  if(!P.camX) tgtX=0;
  else if(dx>halfW) tgtX=GS.pl.x-halfW;
  else if(dx<-halfW) tgtX=GS.pl.x+halfW;

  var k = 1-Math.pow(1-P.camLerp, GS.fdt*60);       // damping, frame-rate independent
  GS.camY+=(tgtY-GS.camY)*k; GS.camX+=(tgtX-GS.camX)*k;
  var sx=function(x: number){return GS.W*0.5+(x-GS.camX);},
      sy=function(y: number){return GS.H*P.camPos-(y-GS.camY);};

  var g=ctx.createLinearGradient(0,0,0,GS.H);
  g.addColorStop(0,"#121a2b"); g.addColorStop(1,"#0a0d13");
  ctx.fillStyle=g; ctx.fillRect(0,0,GS.W,GS.H);

  // the world is drawn zoomed around the cube's framing point; the HUD is not
  ctx.save();
  ctx.translate(GS.W*0.5,GS.H*P.camPos); ctx.scale(z,z); ctx.translate(-GS.W*0.5,-GS.H*P.camPos);

  ctx.strokeStyle="rgba(255,255,255,.035)"; ctx.lineWidth=1;
  var gs=P.stepY*5, y0=Math.floor((GS.camY-2*GS.H)/gs)*gs;
  for(var yy=y0; yy<GS.camY+2*GS.H; yy+=gs){
    var Y=sy(yy); ctx.beginPath(); ctx.moveTo(-GS.W,Y); ctx.lineTo(2*GS.W,Y); ctx.stroke();
  }

  if(P.showLine){
    var dl=sy(deathY());
    if(dl>-20&&dl<GS.H+20){
      ctx.strokeStyle="rgba(255,107,107,.55)"; ctx.setLineDash([8,7]); ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-GS.W,dl); ctx.lineTo(2*GS.W,dl); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  var sk=curSkin();
  if(sk.paint==="circuit") drawTraces(sx,sy);      // the wires go under the tiles

  for(var i=0;i<GS.plats.length;i++){
    var q=GS.plats[i];
    var isLift = GS.ride && GS.ride.lift===q;
    var Y=sy(isLift?GS.pl.y:q.y), X=sx(q.x);
    if(Y<-GS.H||Y>2*GS.H||X<-GS.W||X>2*GS.W) continue;
    var fork = P.junc && waysUp(q)>1;
    var elev=isElev(q);
    if(elev){
      ctx.fillStyle = isLift ? "rgba(240,140,220,.98)"
                   : (cooling(q) ? "rgba(150,96,136,.6)" : "rgba(214,107,190,.9)");
    }else if(q.spr){
      ctx.fillStyle = q.v?"rgba(164,222,96,.95)":"rgba(140,196,82,.75)";
    }else if(q.rat){
      ctx.fillStyle = q.v?"rgba(96,200,210,.92)":"rgba(80,168,178,.7)";
    }else if(q.dn){
      ctx.fillStyle = q.v?"rgba(150,118,240,.92)":"rgba(126,98,206,.72)";
    }else if(q.spk){
      ctx.fillStyle = "rgba(150,160,178,.9)";
    }else if(q.frag){
      var blink = q.fuse!==undefined && Math.sin(GS.gt*55)>0;
      ctx.fillStyle = blink ? "rgba(255,210,190,.95)"
                   : (q.hits!>=1 ? "rgba(214,124,94,.95)" : "rgba(201,166,122,.85)");
    }else{
      ctx.fillStyle = fork ? (q.v?"rgba(255,177,75,.95)":"rgba(255,177,75,.6)")
                           : (q.v?"rgba(90,209,168,.9)":"rgba(120,136,170,.55)");
    }
    var plain = !elev && !q.spr && !q.rat && !q.dn && !q.spk && !q.frag;
    if(sk.paint && plain && q.v && !fork) paintTile(sk.paint,q,X,Y);   // the skin's own paint
    else { rr(X-P.platW/2,Y,P.platW,P.platH,4); ctx.fill(); }
    if(q.frag && q.hits!>=1){                       // crack across the tile
      ctx.strokeStyle="rgba(40,20,14,.8)"; ctx.lineWidth=1.6;
      ctx.beginPath();
      ctx.moveTo(X-P.platW*0.26,Y);
      ctx.lineTo(X-P.platW*0.08,Y+P.platH*0.62);
      ctx.lineTo(X+P.platW*0.10,Y+P.platH*0.28);
      ctx.lineTo(X+P.platW*0.28,Y+P.platH);
      ctx.stroke();
    }
    if(q.frag && fork){ ctx.strokeStyle="rgba(255,177,75,.9)"; ctx.lineWidth=1.5;
      rr(X-P.platW/2,Y,P.platW,P.platH,4); ctx.stroke(); }
    if(q.spk){                        // spikes: ease up/down, red-tipped when deadly
      var up2 = GS.gt<q.spUntil! ? 1 : 0;
      q.spA = q.spA! + (up2-q.spA!)*Math.min(1, GS.fdt*(up2?22:9));
      var n5=5, sw=P.platW/n5, sh=2+q.spA*P.platH*1.5;
      ctx.fillStyle = q.spA>0.5 ? "rgba(240,96,96,.95)" : "rgba(70,78,92,.95)";
      for(var si=0;si<n5;si++){
        var bx=X-P.platW/2+si*sw;
        ctx.beginPath();
        ctx.moveTo(bx+1,Y); ctx.lineTo(bx+sw/2,Y-sh); ctx.lineTo(bx+sw-1,Y);
        ctx.closePath(); ctx.fill();
      }
    }
    if(q.spr || q.rat || q.dn){       // spring: double chevron. ratchet / down-only: arrow + bar
      ctx.fillStyle="rgba(10,24,20,.72)";
      var ay=Y+P.platH*0.5, ah2=P.platH*0.3, aw2=P.platH*0.46;
      var arrow=function(cx: number,cy2: number,dir: number){
        ctx.beginPath(); ctx.moveTo(cx,cy2-dir*ah2);
        ctx.lineTo(cx-aw2,cy2+dir*ah2*0.7); ctx.lineTo(cx+aw2,cy2+dir*ah2*0.7);
        ctx.closePath(); ctx.fill();
      };
      if(q.spr){ arrow(X-aw2*1.7,ay,1); arrow(X+aw2*1.7,ay,1); }
      else if(q.rat){ arrow(X,ay-P.platH*0.12,1); ctx.fillRect(X-aw2*1.5,ay+P.platH*0.26,aw2*3,1.6); }
      else { arrow(X,ay+P.platH*0.12,-1); ctx.fillRect(X-aw2*1.5,ay-P.platH*0.36,aw2*3,1.6); }
    }
    if(elev){                                    // chevrons: both ways, or the one it chose
      var up = isLift ? (GS.ride!.to>GS.ride!.from) : null;
      ctx.fillStyle="rgba(28,8,24,.8)";
      var cy=Y+P.platH*0.5, ah=P.platH*0.34, aw=P.platH*0.5;
      var tri=function(cx: number,dir: number){
        ctx.beginPath();
        ctx.moveTo(cx,cy-dir*ah); ctx.lineTo(cx-aw,cy+dir*ah*0.7); ctx.lineTo(cx+aw,cy+dir*ah*0.7);
        ctx.closePath(); ctx.fill();
      };
      if(up===null){ tri(X-aw*1.6,1); tri(X+aw*1.6,-1); }
      else tri(X, up?1:-1);
    }
    if(q===GS.pl.p){ ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=1.5;
      rr(X-P.platW/2,Y,P.platW,P.platH,4); ctx.stroke(); }
  }

  if(P.preview && GS.pl.ground && GS.state==="play"){
    if(P.four){
      var ds=[[-1,1],[1,1],[-1,0],[1,0]];
      for(var k=0;k<4;k++){
        var kd=ds[k][0], ku=ds[k][1]===1;
        var q2=avail(GS.pl.p,kd,ku);
        if(!q2) continue;
        var far = GS.pl.boost && q2===targetOf(GS.pl.p,kd,ku,2);
        ctx.strokeStyle = (q2.spk && GS.gt<q2.spUntil!) ? "rgba(240,96,96,.85)"
                        : q2.back ? "rgba(255,206,120,.6)"
                        : q2.hole ? "rgba(255,140,120,.55)"
                        : far ? "rgba(164,222,96,.8)"
                        : (ku ? "rgba(90,209,168,.45)" : "rgba(154,107,255,.45)");
        ctx.lineWidth = far?2.5:2;
        if(q2.hole) ctx.setLineDash([5,4]);           // a gap: you'll need the air jump
        rr(sx(q2.x)-P.platW/2-2,sy(q2.y)-2,P.platW+4,P.platH+4,5); ctx.stroke();
        ctx.setLineDash([]);
      }
    }else if(held["-1"]||held["1"]){
      var d2=held[String(GS.lastPressed)]?GS.lastPressed:(held["-1"]?-1:1);
      var it=resolve(d2,held[String(-d2)]);
      var tx=GS.pl.p!.x+d2*P.stepX, ty=GS.pl.p!.y+(it.up?P.stepY:-P.stepY);
      if(it.plat){ tx=it.plat.x; ty=it.plat.y; }
      ctx.strokeStyle = it.plat ? (it.up?"rgba(90,209,168,.95)":"rgba(154,107,255,.95)")
                                : "rgba(255,107,107,.9)";
      ctx.lineWidth=2.5; ctx.setLineDash(it.plat?[]:[5,4]);
      rr(sx(tx)-P.platW/2-3,sy(ty)-3,P.platW+6,P.platH+6,6); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  for(var e2=0;e2<GS.debris.length;e2++){
    var b=GS.debris[e2];
    ctx.save();
    ctx.globalAlpha=Math.max(0,Math.min(1,b.life/0.5));
    ctx.translate(sx(b.x),sy(b.y)); ctx.rotate(b.rot);
    ctx.fillStyle = b.col ? "rgba("+b.col+",.95)" : "rgba(201,166,122,.9)";
    rr(-b.w/2,0,b.w,b.col?b.w:P.platH,b.col?1.5:3); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;

  // enemies: a crimson cube with a slit visor. on its perch it flashes a warning first.
  var fs=Math.min(P.platW*0.5,26);
  for(var fi=0;fi<GS.foes.length;fi++){
    var fo=GS.foes[fi], FX=sx(fo.x), FY=sy(fo.y);
    if(fo.st==="tele"){
      var pulse=0.5+0.5*Math.sin(GS.gt*38);
      ctx.strokeStyle="rgba(255,80,80,"+(0.35+0.6*pulse)+")"; ctx.lineWidth=3;
      rr(FX-fs/2-5,FY-fs-5,fs+10,fs+10,8); ctx.stroke();
      ctx.fillStyle="rgba(255,90,90,.95)"; ctx.font="bold 15px system-ui,sans-serif";
      ctx.textAlign="center"; ctx.fillText("!",FX,FY-fs-10);
      ctx.globalAlpha=0.55+0.45*pulse;
    }
    ctx.fillStyle="rgba(0,0,0,.3)";
    ctx.beginPath(); ctx.ellipse(FX,FY+3,fs*0.5,3.5,0,0,6.3); ctx.fill();
    ctx.fillStyle="#d8344a"; rr(FX-fs/2,FY-fs,fs,fs,5); ctx.fill();
    ctx.fillStyle="rgba(20,4,8,.85)";                         // visor
    rr(FX-fs/2+4,FY-fs*0.68,fs-8,fs*0.2,2); ctx.fill();
    ctx.fillStyle="#ffd2d8";                                   // eyes, looking your way
    var look2 = GS.pl.x<fo.x ? -1 : 1;
    ctx.fillRect(FX-fs*0.22+look2*2,FY-fs*0.64,3,3);
    ctx.fillRect(FX+fs*0.12+look2*2,FY-fs*0.64,3,3);
    ctx.globalAlpha=1;
  }

  // the faller: cream cube, wide round eyes. a streak while it drops, a squash on landing.
  for(var ci=0;ci<GS.critters.length;ci++){
    var cr=GS.critters[ci], CX=sx(cr.x), CY=sy(cr.y), csq=Math.max(0,cr.sq);
    var cw=fs*(1+0.25*csq), ch=fs*(1-0.25*csq);
    if(cr.st==="fall" && cr.vy<-200){
      var grd=ctx.createLinearGradient(0,CY-fs-90,0,CY-fs);
      grd.addColorStop(0,"rgba(235,222,190,0)"); grd.addColorStop(1,"rgba(235,222,190,.35)");
      ctx.fillStyle=grd; ctx.fillRect(CX-fs*0.35,CY-fs-90,fs*0.7,90);
    }
    ctx.save(); ctx.translate(CX,CY-ch/2); ctx.rotate(cr.rot);
    if(cr.st!=="gone"){ ctx.fillStyle="rgba(0,0,0,.25)";
      ctx.beginPath(); ctx.ellipse(0,ch/2+3,cw*0.5,3,0,0,6.3); ctx.fill(); }
    ctx.fillStyle="#ebdcb6"; rr(-cw/2,-ch/2,cw,ch,6); ctx.fill();
    var lk = cr.st==="sit" ? (GS.pl.x<cr.x?-1.5:1.5) : 0;      // it watches you while it sits
    var blink = cr.st==="sit" && (GS.gt%1.7)<0.12;
    ctx.fillStyle="#3a3226";
    if(blink){ ctx.fillRect(-cw*0.28+lk,-ch*0.12,6,1.6); ctx.fillRect(cw*0.08+lk,-ch*0.12,6,1.6); }
    else{
      ctx.beginPath(); ctx.arc(-cw*0.2+lk,-ch*0.1,3.2,0,6.3); ctx.fill();
      ctx.beginPath(); ctx.arc(cw*0.2+lk,-ch*0.1,3.2,0,6.3); ctx.fill();
    }
    if(cr.st==="gone"){ ctx.fillRect(-3,ch*0.12,6,4); }      // a little 'o' of surprise
    ctx.restore();
  }

  for(var pz=0;pz<GS.puffs.length;pz++){
    var pf=GS.puffs[pz];
    ctx.strokeStyle="rgba("+(pf.col||"140,190,255")+","+Math.max(0,pf.life/0.32*0.55)+")";
    ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.ellipse(sx(pf.x),sy(pf.y)-6,pf.r,pf.r*0.45,0,0,6.3); ctx.stroke();
  }

  // the air-jump lesson: which button glows, and a ghost doing the move from your tile
  var hint=djHint(), hb=hint?hint.btn:null;
  if(hb!==GS.hintBtn){ GS.hintBtn=hb; syncPad(); }
  if(hint && !hint.air){
    if(ghostFrom!==hint.from){ ghostFrom=hint.from; ghostT0=GS.gt; }
    var gs=Math.min(P.platW*0.5,26), gp=ghostAt(hint,GS.gt-ghostT0);
    if(gp.puff>=0 && gp.puff<0.32){                // the tap: same ring as a real air jump
      ctx.strokeStyle="rgba(255,190,90,"+(0.8*(1-gp.puff/0.32))+")"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.ellipse(sx(gp.px!),sy(gp.py!)-6,P.stepX*2.6*gp.puff,P.stepX*1.17*gp.puff,0,0,6.3); ctx.stroke();
    }
    ctx.globalAlpha=0.7*Math.max(0,Math.min(1,gp.alpha));
    paintCube(ctx,"ghost",sx(gp.x),sy(gp.y),gs,gs,GS.gt,hint.dir);
    ctx.globalAlpha=1;
  }else ghostFrom=null;

  var s=Math.min(P.platW*0.5,26), sq=Math.max(0,GS.pl.sq);
  var w=s*(1+0.28*sq), h=s*(1-0.28*sq);
  var shake = GS.reject>0 ? Math.sin(GS.reject*90)*5 : 0;
  var X=sx(GS.pl.x)+shake, Y=sy(GS.pl.y);

  // skin trails: afterimages, stars or rainbow, laid down while airborne
  if(sk.trail){
    if(!GS.pl.ground && GS.state==="play" && GS.gt-(trailAt||0)>0.03){ GS.trail.push({x:GS.pl.x,y:GS.pl.y,t:GS.gt}); trailAt=GS.gt; }
    while(GS.trail.length && GS.gt-GS.trail[0].t>0.32) GS.trail.shift();
    for(var ti=0;ti<GS.trail.length;ti++){
      var tp=GS.trail[ti], age=(GS.gt-tp.t)/0.32, TX=sx(tp.x), TY=sy(tp.y);
      if(sk.trail==="ghost"){ ctx.globalAlpha=0.28*(1-age); paintCube(ctx,"ghost",TX,TY,w,h,GS.gt,0); }
      else if(sk.trail==="stars"){ ctx.globalAlpha=1-age; ctx.fillStyle="rgba(210,220,255,.95)";
        ctx.fillRect(TX-w*0.3+((ti*7)%5)*2,TY-h*0.6+((ti*11)%7)*2,2,2); }
      else{ ctx.globalAlpha=0.7*(1-age); ctx.fillStyle="hsl("+(45+270*(0.5-0.5*Math.cos(tp.t*0.9+ti*0.35)))+",85%,62%)";
        rr(TX-w*0.22,TY-h*0.62,w*0.44,h*0.44,3); ctx.fill(); }
    }
    ctx.globalAlpha=1;
  }

  ctx.fillStyle="rgba(0,0,0,.3)";
  ctx.beginPath(); ctx.ellipse(sx(GS.pl.x),Y+3,w*0.5,3.5,0,0,6.3); ctx.fill();
  if(GS.gt<GS.reviveGrace && GS.state==="play") ctx.globalAlpha = (GS.gt*12)%2<1 ? 0.35 : 1;   // grace blink
  var lookDir = GS.pl.vx>1 ? 1 : GS.pl.vx<-1 ? -1 : (GS.lastIntent ? GS.lastIntent.dir : 0);
  paintCube(ctx, sk.id, X, Y, w, h, GS.gt, lookDir);
  if(GS.state==="dead"){ ctx.fillStyle="rgba(255,90,90,.6)"; rr(X-w/2,Y-h,w,h,5); ctx.fill(); }
  if(GS.pl.boost){                                  // charged by a spring
    ctx.strokeStyle="rgba(164,222,96,.95)"; ctx.lineWidth=2.5;
    rr(X-w/2-3,Y-h-3,w+6,h+6,7); ctx.stroke();
  }
  ctx.globalAlpha=1;

  ctx.restore();                                 // back to screen space
  if(hint) drawHint(hint);
  if(GS.flash>0){ ctx.fillStyle="rgba(255,107,107,"+(GS.flash*0.3)+")"; ctx.fillRect(0,0,GS.W,GS.H); GS.flash-=0.03; }

  $("hH")!.textContent=String(Math.max(0,Math.round(GS.pl.y/P.stepY)));
  $("hB")!.textContent=String(allBest());      // all-time best, live
  var dz=danger(Math.max(0,Math.round(GS.pl.y/P.stepY)));
  var hp=$("hP")!;
  hp.textContent=Math.round(dz*100)+"%";
  hp.style.color = dz>0.66 ? "#ff6b6b" : dz>0.33 ? "#ffb14b" : "";
}
export function rr(x: number, y: number, w: number, h: number, r: number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
