import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { P } from "../config/params";
import { syncPad } from "../ui/pad";
import { adjHole, isTipPlat, key, makeHole, removePlat } from "./grid";
import type { Plat } from "../core/types";

// SPECIAL TILES — fragile tiles collapsing, and elevators: shaft checks, hollowing, rides.
// fragile tile: first landing cracks it, second lights a short fuse and it collapses
export function breakPlat(q: Plat){
  var k=key(q.x,q.y);
  if(GS.pmap[k]===q) delete GS.pmap[k];
  var i=GS.plats.indexOf(q); if(i>=0) GS.plats.splice(i,1);
  makeHole(q);                     // gone for good; nothing regrows here
  sfx("crumble");
  for(i=0;i<2;i++){
    GS.debris.push({x:q.x+(i?1:-1)*P.platW*0.25, y:q.y, w:P.platW*0.5,
                 vx:(i?1:-1)*(30+Math.random()*40), vy:-20-Math.random()*40,
                 rot:0, vr:(i?1:-1)*(1.5+Math.random()*2), life:0.7});
  }
  if(GS.pl.p===q){ GS.pl.p=null; GS.pl.ground=false; GS.pl.vy=-10; }
  syncPad();
}
export function touchFragile(q: Plat){
  if(!q.frag) return;
  q.hits=(q.hits||0)+1;
  if(q.hits===1) sfx("crack");
  if(q.hits>=2 && q.fuse===undefined){
    q.fuse=GS.gt+P.breakMs/1000;
    GS.fuses.push(q);
    sfx("creak");
  }
}

// elevator: a tile that sits in a real shaft — the structure already has a platform
// far above AND far below it in the same column. which way it goes is decided on
// landing, so the player cannot know before committing.
function shaft(q: Plat, dir: number){
  for(var k=1;k<=P.elevMax;k++){
    var t=GS.pmap[key(q.x, q.y+dir*k*P.stepY)];
    if(!t) continue;
    if(t.eseed) return null;        // another lift on this path: the shaft is not clear
    if(k>=P.elevMin) return t;      // first landing far enough away
  }
  return null;
}
// hollow out the whole column, landings included. the lift itself becomes the
// platform at whichever stop it parks on, so it has three stops: bottom, home, top.
export function clearShaft(q: Plat){
  var top=shaft(q,1), bot=shaft(q,-1), gy, t;
  if(!top || !bot) return;
  // every stop becomes a gap whenever the lift is elsewhere. if one would sit next to
  // an existing gap, a single air jump couldn't cross — so this tile isn't a lift.
  if(adjHole(q.gx,top.gy) || adjHole(q.gx,bot.gy) || adjHole(q.gx,q.gy)){
    q.eseed=0; q.ec=false; return;
  }
  q.stops=[bot.gy, q.gy, top.gy];
  for(gy=bot.gy+1; gy<top.gy; gy++){             // everything in between
    if(gy===q.gy) continue;
    t=GS.pmap[q.gx+","+gy];
    if(!t || t===GS.pl.p || t.eseed || isTipPlat(t)) continue;
    if(adjHole(q.gx,gy)) continue;               // would make two gaps in a row
    removePlat(t);
  }
  if(top!==GS.pl.p && !isTipPlat(top)) removePlat(top); else makeHole(top);
  if(bot!==GS.pl.p && !isTipPlat(bot)) removePlat(bot); else makeHole(bot);
  makeHole(q);              // home cell: never regrown, and its neighbours can't break
}
export function isElev(q: Plat){
  if(!P.elev || !q.eseed) return false;
  if(q.stops) return true;                       // confirmed and built
  if(q.ec===undefined || GS.gt>q.ect!){
    q.ec = !!(shaft(q,1) && shaft(q,-1));
    q.ect = GS.gt+0.4;
    if(q.ec && !q.ecl){ q.ecl=1; GS.clearQ.push(q); }   // deferred: never mutate mid-draw
  }
  return q.ec;
}
export function cooling(q: Plat){ return q.rcool!==undefined && GS.gt<q.rcool; }
export function tryRide(q: Plat){
  if(GS.ride || !q.stops || !isElev(q) || cooling(q)) return;
  var opts=[], i;
  for(i=0;i<3;i++) if(q.stops[i]!==q.gy) opts.push(q.stops[i]);
  var gy=opts[(Math.random()*opts.length)|0];   // which way is unknown until now
  var rows=Math.abs(gy-q.gy);
  var kk=q.gx+","+q.gy;
  if(GS.pmap[kk]===q) delete GS.pmap[kk];              // in transit: occupies no cell
  GS.ride={lift:q, toGy:gy, from:q.y, to:gy*P.stepY, t:0, dur:(P.elevMs/1000)*(rows/5)};
  sfx("liftGo", gy>q.gy, GS.ride.dur/P.speed);          // the whir rises or falls with the ride
  GS.pl.vx=0; GS.pl.vy=0; GS.pl.ground=true; GS.pl.p=null; GS.buf=null;
  syncPad();
}
