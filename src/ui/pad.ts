import { GS } from "../core/state";
import { $ } from "./dom";
import { P } from "../config/params";
import { act, avail, down2, held, up2 } from "../game/movement";
import { neighbour } from "../world/grid";

// PAD — the on-screen buttons: availability, dimming, buffer and lesson highlights.
export function syncPad(){
  $("pad4").classList.toggle("hide",!P.four);
  $("pad2").classList.toggle("hide",P.four);
  var cur=GS.pl&&GS.pl.p;
  var b4=document.querySelectorAll<HTMLElement>("#pad4 button");
  for(var i=0;i<b4.length;i++){
    var el=b4[i], d=+el.getAttribute("data-d")!, u=+(el.getAttribute("data-u")!)===1;
    var has = cur ? !!avail(cur,d,u) : true;       // airborne: every button is live
    var hit=el.classList.contains("hit");
    el.className = (P.dim && !has ? "off " : "") + (hit?"hit ":"") +
      (GS.buf && GS.buf.dir===d && GS.buf.up===u ? "buf " : "") + (GS.hintBtn===d+","+u ? "hint" : "");
    el.querySelector("i")!.textContent = cur ? (has?"":"void") : "";
  }
  var L=$("bL"), R=$("bR");
  var cls=function(me: number,other: number){
    if(GS.buf && GS.buf.dir===me) return "buf";
    if(held[String(me)]) return (held[String(other)]&&GS.lastPressed===other)?"mod":"hit";
    return "";
  };
  L.className=cls(-1,1); R.className=cls(1,-1);
  var lab=function(d: number,mod: boolean){
    if(!cur) return "";
    var u=neighbour(cur,d,1), dn=neighbour(cur,d,-1);
    if(mod&&P.useMod) return dn?"↘ down":"void";
    return u?"↗ up":(dn?"↘ down":"void");
  };
  L.querySelector("i")!.textContent=lab(-1,held["1"]);
  R.querySelector("i")!.textContent=lab(1,held["-1"]);
}
export function initPad(){
  var b4=document.querySelectorAll<HTMLElement>("#pad4 button");
  for(var i=0;i<b4.length;i++)(function(el: HTMLElement){
    var d=+el.getAttribute("data-d")!, u=+(el.getAttribute("data-u")!)===1;
    el.addEventListener("pointerdown",function(e){
      e.preventDefault();
      if(GS.state!=="play") return;
      el.classList.add("hit");
      act({dir:d,up:u});
    });
    var off=function(){el.classList.remove("hit");syncPad();};
    el.addEventListener("pointerup",off);
    el.addEventListener("pointercancel",off);
    el.addEventListener("pointerleave",off);
    el.addEventListener("contextmenu",function(e){e.preventDefault();});
  })(b4[i]);

  function hook2(el: HTMLElement, dir: number){
    el.addEventListener("pointerdown",function(e){e.preventDefault();down2(dir);});
    el.addEventListener("pointerup",function(e){e.preventDefault();up2(dir);});
    el.addEventListener("pointercancel",function(){up2(dir);});
    el.addEventListener("contextmenu",function(e){e.preventDefault();});
}
hook2($("bL"),-1);
hook2($("bR"),1);
}
