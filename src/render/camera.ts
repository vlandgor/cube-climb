import { GS } from "../core/state";
import { P } from "../config/params";
import type { Plat } from "../core/types";

// CAMERA — zoom for narrow screens and the on-screen test the walker uses.
// is this tile on screen, clear of the HUD? the walker only appears where you can see it.
export const HUD_CLEAR=84;
// narrow screens zoom out until at least viewCols tiles fit across. wide screens stay 1:1.
export function zoom(){
  if(!P.viewCols) return 1;
  return Math.min(1, GS.W/(P.viewCols*P.stepX));
}
export function onScreen(t: Plat){
  var z=zoom(), Y=GS.H*P.camPos-(t.y-GS.camY)*z, X=GS.W*0.5+(t.x-GS.camX)*z;
  return Y>=HUD_CLEAR && Y<=GS.H-30 && X>=24 && X<=GS.W-24;
}
