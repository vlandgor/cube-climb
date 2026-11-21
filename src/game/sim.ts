import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { P } from "../config/params";
import { maybeCritter, updateCritters } from "../entities/faller";
import { trySpawn, updateFoes } from "../entities/walker";
import { learnedAirJump } from "./airLesson";
import { exec, held, resolve } from "./movement";
import { endRun, noteLanding, offerRevive } from "./run";
import { curSkin } from "../render/skins";
import { save, writeSave } from "../storage/save";
import { syncPad } from "../ui/pad";
import { checkUnlocks } from "../ui/skins";
import { grow } from "../world/generate";
import { DIAG, deathY, neighbour } from "../world/grid";
import { breakPlat, touchFragile, tryRide } from "../world/tiles";

// SIMULATION — one fixed step of the world: physics, landings, hazards, creatures, death.
export function step(dt: number){
  if(GS.state!=="play") return;
  var py=GS.pl.y;
  GS.pl.vy-=P.grav*dt;
  GS.pl.x+=GS.pl.vx*dt; GS.pl.y+=GS.pl.vy*dt;
  if(GS.pl.sq>0) GS.pl.sq-=dt*7;
  if(GS.reject>0) GS.reject-=dt;
  GS.gt+=dt;

  for(var f=GS.fuses.length-1;f>=0;f--){
    if(GS.gt>=GS.fuses[f].fuse!){ breakPlat(GS.fuses[f]); GS.fuses.splice(f,1); }
  }
  trySpawn();
  updateFoes(dt);
  updateCritters(dt);
  if(GS.state!=="play") return;
  if(GS.ride){
    GS.ride.t += dt/GS.ride.dur;
    if(GS.ride.t>=1){
      var lift=GS.ride.lift; GS.lastLift=lift;
      lift.gy=GS.ride.toGy; lift.y=lift.gy*P.stepY;    // the lift parks at its new stop
      GS.pmap[lift.gx+","+lift.gy]=lift;
      lift.rcool=GS.gt+P.elevCool/1000;                 // a free jump before it moves again
      sfx("liftDing");
      GS.ride=null;
      GS.pl.x=lift.x; GS.pl.y=lift.y; GS.pl.p=lift; GS.pl.ground=true; GS.pl.vx=0; GS.pl.vy=0; GS.pl.sq=1.1;
      GS.pl.boost=0; GS.pl.djLeft = P.dj ? P.djMax : 0;
      if(GS.pl.y>GS.maxY) GS.maxY=GS.pl.y;
      while(GS.pl.y<deathY()+P.stepY) GS.maxY-=P.stepY;  // a ride down never drops you under the line
      var hh=Math.round(GS.pl.y/P.stepY); if(hh>GS.best){ GS.best=hh; checkUnlocks(); }
      if(P.auto) GS.autoT=P.autoDelay/1000;
      syncPad();
    }else{
      var ez = GS.ride.t<0.5 ? 2*GS.ride.t*GS.ride.t : 1-Math.pow(-2*GS.ride.t+2,2)/2;
      GS.pl.y = GS.ride.from + (GS.ride.to-GS.ride.from)*ez;
    }
    grow();
    return;
  }

  for(var pu=GS.puffs.length-1;pu>=0;pu--){
    GS.puffs[pu].r+=P.stepX*2.6*dt; GS.puffs[pu].life-=dt;
    if(GS.puffs[pu].life<=0) GS.puffs.splice(pu,1);
  }
  for(var e=GS.debris.length-1;e>=0;e--){
    var b=GS.debris[e];
    b.vy-=P.grav*0.45*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.rot+=b.vr*dt; b.life-=dt;
    if(b.life<=0) GS.debris.splice(e,1);
  }

  if(GS.pl.vy<0){
    for(var i=GS.plats.length-1;i>=0;i--){
      var q=GS.plats[i];
      if(q.y>py+40 || q.y<GS.pl.y-240) continue;           // cheap window
      if(py>=q.y-0.5 && GS.pl.y<=q.y && Math.abs(GS.pl.x-q.x)<=P.platW*0.5+2){
        GS.pl.y=q.y; GS.pl.vy=0; GS.pl.vx=0; GS.pl.ground=true; GS.pl.p=q; GS.pl.sq=1.2;
        if(!q.v) q.vt=GS.gt;
        q.v=true;
        if(GS.path[GS.path.length-1]!==q){ GS.path.push(q); if(GS.path.length>300) GS.path.shift(); }
        if(P.snap) GS.pl.x=q.x;
        if(q.spk && GS.gt<q.spUntil!){ die("spiked"); return; }
        if(GS.pl.y>GS.maxY) GS.maxY=GS.pl.y;
        var h=Math.round(GS.pl.y/P.stepY); if(h>GS.best){ GS.best=h; checkUnlocks(); }
        var sk=curSkin();
        if(sk.land) for(var spk2=0;spk2<6;spk2++){                // gold & diamond: sparkle on landing
          var an=Math.PI*(0.15+0.7*Math.random());
          GS.debris.push({x:GS.pl.x,y:GS.pl.y+2,w:3.5,vx:Math.cos(an)*P.stepX*(Math.random()<0.5?-1.6:1.6),
                       vy:Math.sin(an)*P.stepY*3.5,rot:0,vr:6,life:0.35,col:sk.land});
        }
        GS.pl.boost = q.spr ? 1 : 0;
        sfx(q.spr ? "charge" : "land");
        noteLanding(q);
        if(GS.pl.gapTo===q.gx+","+q.gy) learnedAirJump();
        GS.pl.gapTo=null;
        GS.pl.djLeft = P.dj ? P.djMax : 0;
        touchFragile(q);
        tryRide(q);                       // an elevator always rides; it outranks a buffered tap
        if(!GS.ride && GS.buf){
          if(GS.now-GS.buf.t <= P.buffer/1000){
            exec(GS.buf.two ? resolve(GS.buf.dir, held[String(-GS.buf.dir)]) : {dir:GS.buf.dir,up:GS.buf.up});
          } else GS.buf=null;
        }
        if(!GS.ride && GS.pl.ground && P.auto) GS.autoT=P.autoDelay/1000;
        if(!GS.ride && GS.pl.ground) maybeCritter();
        syncPad();
        break;
      }
    }
  }
  if(GS.pl.ground && P.auto && GS.autoT>=0){
    GS.autoT-=dt;
    if(GS.autoT<0){
      var d=GS.lastIntent.dir;
      if(P.four){
        if(!neighbour(GS.pl.p,d,1) && neighbour(GS.pl.p,-d,1)) d=-d;
        exec({dir:d,up:true});
      }else exec(resolve(d,held[String(-d)]));
    }
  }
  // spikes rise while you stand next to them, and linger long enough to cover the
  // jump onto them — so the only ways in are skipping over or arriving from afar
  if(GS.pl.ground && GS.pl.p){
    for(var sd=0;sd<4;sd++){
      var st=GS.pmap[(GS.pl.p.gx+DIAG[sd][0])+","+(GS.pl.p.gy+DIAG[sd][1])];
      if(st && st.spk){
        if(GS.gt>=st.spUntil!) sfx("spike");               // only as they spring up, not every frame
        st.spUntil=GS.gt+P.spikeLinger/1000;
      }
    }
  }
  grow();
  if(GS.pl.y < deathY()) die();
}

export function die(reason?: string){
  if(GS.state!=="play") return;
  GS.state="dead"; GS.flash=1; GS.buf=null;
  sfx("death");
  GS.deathWhy=reason||"fell";
  if(GS.best>(save.best||0)){ save.best=GS.best; writeSave(); }   // saved now, celebrated at the end
  setTimeout(function(){                                  // let the death land first
    if(GS.state!=="dead") return;
    if(GS.revivesLeft>0 && P.revive) offerRevive(); else endRun();
  }, 550);
}
