import { P } from "../config/params";
import { mix, smooth01 } from "../core/math";

// DIFFICULTY — how likely each mechanic is at a given height, and the calm/hard waves.
// tension comes in waves: hazards swell and ease every wavePeriod steps, so the climb
// has breathers. nothing waves during the teaching stretch at the bottom.
function calm(gy: number){
  if(!P.waves || gy<P.waveFrom*P.pace) return 1;
  return 1-P.waveAmp*(0.5+0.5*Math.sin(2*Math.PI*(gy-P.waveFrom*P.pace)/P.wavePeriod));
}
// a mechanic's chance at a height: 0 before it unlocks, then easing from its intro
// chance to its peak. hazards also follow the waves; helpers don't.
export function sched(gy: number, start: number, full: number, base: number, peak: number, hazard: number){
  var st=start*P.pace, fu=Math.max(st+1,full*P.pace);
  if(gy<st) return 0;
  var c=mix(base,peak,smooth01((gy-st)/(fu-st)));
  return hazard ? c*calm(gy) : c;
}
// overall intensity for the HUD: rises over the first ~350 steps, rides the waves
export function danger(gy: number){ return smooth01(gy/(350*P.pace))*calm(gy); }
