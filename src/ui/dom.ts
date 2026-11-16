import { GS } from "../core/state";

// DOM helpers: element lookup and the one-screen-at-a-time menu overlay.
export function $<T extends HTMLElement = HTMLElement>(id: string): T{ return document.getElementById(id) as T; }

export function show(id: string | null){
  GS.curScreen=id||null;
  var ss=document.querySelectorAll(".screen");
  for(var i=0;i<ss.length;i++) ss[i].classList.toggle("on", ss[i].id===id);
  $("ui").classList.toggle("on", !!id);
}
