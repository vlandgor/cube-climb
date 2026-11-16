import { GS } from "../core/state";
import { sfx } from "../audio/audio";
import { SKINS, curSkin, paintCube, rrc, unlocked } from "../render/skins";
import { save, writeSave } from "../storage/save";
import { $, show } from "./dom";
import { t } from "../i18n";
import type { Key } from "../i18n/format";

// SKINS UI — unlock toasts, the skins grid and the animated menu logo.
function skinName(id: string){ return t(("skin."+id) as Key); }

// unlocks happen mid-run the moment you pass the height
let toastT: ReturnType<typeof setTimeout> | null=null;
export function toast(html: string){
  var el=$("toast"); el.innerHTML=html; el.classList.add("on");
  clearTimeout(toastT!); toastT=setTimeout(function(){ el.classList.remove("on"); },2400);
}
export function checkUnlocks(){
  save.unl=save.unl||{};
  for(var i=0;i<SKINS.length;i++){
    var s=SKINS[i];
    if(s.req>0 && GS.best>=s.req && !save.unl[s.id]){
      save.unl[s.id]=1; writeSave(); GS.runUnlocks.push(s.id);
      toast(t("toast.skin",{name:skinName(s.id)})); sfx("unlock");
    }
  }
}
export function openSkins(){
  var grid=$("skinGrid"), n=0, cur=curSkin();
  grid.innerHTML="";
  SKINS.forEach(function(s){
    var open=unlocked(s); if(open) n++;
    var b=document.createElement("button");
    b.className="skincard"+(s===cur?" sel":"")+(open?"":" locked");
    var cv=document.createElement("canvas"), dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=56*dpr; cv.height=56*dpr;
    var c=cv.getContext("2d")!; c.scale(dpr,dpr);
    if(open) paintCube(c,s.id,28,48,30,30,0.6,0);
    else{ c.fillStyle="#252c3d"; rrc(c,13,18,30,30,6); c.fill();
      c.fillStyle="#5b6680"; c.font="bold 15px system-ui,sans-serif"; c.textAlign="center"; c.fillText("?",28,39); }
    b.appendChild(cv);
    var nm=document.createElement("div"); nm.textContent=open?skinName(s.id):t("skins.unknown"); b.appendChild(nm);
    var sub=document.createElement("small");
    sub.textContent = s===cur ? t("skins.selected") : open ? t("skins.wear") : t("skins.reach",{n:s.req});
    b.appendChild(sub);
    b.addEventListener("click",function(e){ e.preventDefault(); if(!open){ sfx("reject"); return; }
      save.skin=s.id; writeSave(); sfx("click"); openSkins(); });
    grid.appendChild(b);
  });
  $("skinsInfo").innerHTML=t("skins.count",{n:n, total:SKINS.length});
  show("sSkins");
}
// the menu's logo is the cube you're wearing, bobbing over a landing tile
export function drawLogo(){
  var cv=$<HTMLCanvasElement>("logoCv"); if(!cv || !cv.getContext) return;
  var c=cv.getContext("2d"); if(!c) return;
  c.setTransform(2,0,0,2,0,0); c.clearRect(0,0,120,104);
  var t=GS.now, b=Math.abs(Math.sin(t*2.1)), y=78-b*26, sq=Math.max(0,1-b*5)*0.25;
  var w=40*(1+sq), h=40*(1-sq);
  c.fillStyle="rgba(90,209,168,.9)"; rrc(c,30,82,60,10,5); c.fill();
  c.fillStyle="rgba(0,0,0,"+(0.28-b*0.15)+")"; c.beginPath(); c.ellipse(60,82,22-b*8,3,0,0,6.3); c.fill();
  paintCube(c,curSkin().id,60,y+2,w,h,t,0);
}
