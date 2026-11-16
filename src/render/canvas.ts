import { GS } from "../core/state";

// the game canvas. sized to its container in CSS pixels, backed at up to 2x for sharpness.
const cv=document.getElementById("cv") as HTMLCanvasElement;
export const ctx=cv.getContext("2d") as CanvasRenderingContext2D; let DPR=1;

export function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  var r=(cv.parentNode as HTMLElement).getBoundingClientRect();
  GS.W=r.width; GS.H=r.height;
  cv.width=GS.W*DPR; cv.height=GS.H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
export function initCanvas(){
    window.addEventListener("resize",resize);
}
