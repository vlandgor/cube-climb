import { GS } from "../core/state";

// ---------------------------------------------------------------------------
// DEV CHANNEL — the build on GitHub Pages that the "Cube Climb Dev" app loads. The
// "Dev web build" workflow builds it with VITE_CHANNEL=dev and VITE_COMMIT=<sha>.
// Every other build (the Play app, npm run dev) leaves IS_DEV false and this does nothing.
// ---------------------------------------------------------------------------
export const IS_DEV = import.meta.env.VITE_CHANNEL === "dev";
const COMMIT = String(import.meta.env.VITE_COMMIT || "local").slice(0, 7);

// a cold start always fetches the newest page. this covers the other case: the app was in
// the background and is brought back while a newer build is live.
function checkForUpdate(){
  fetch("./version.json", { cache: "no-store" })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(v: { commit?: string } | null){
      if(!v || !v.commit || v.commit.slice(0, 7) === COMMIT) return;
      if(GS.state !== "menu") return;          // never drop a run; the next resume checks again
      location.reload();
    })
    .catch(function(){});                      // offline: keep playing this build
}

export function initDev(){
  if(!IS_DEV) return;
  // which commit is running, on the main menu only
  var tag = document.createElement("div");
  tag.textContent = "DEV · " + COMMIT;
  tag.style.cssText = "position:absolute;left:0;right:0;bottom:calc(10px + env(safe-area-inset-bottom));"
    + "text-align:center;font:11px ui-monospace,monospace;opacity:.45;pointer-events:none";
  var menu = document.getElementById("sMenu");
  if(menu) menu.appendChild(tag);

  var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if(App && App.addListener) App.addListener("resume", checkForUpdate);
}
