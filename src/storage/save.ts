import { GS } from "../core/state";
import type { Save } from "../core/types";

// ---------------------------------------------------------------------------
// SAVE — best height, unlocked skins and settings, kept in localStorage.
// ---------------------------------------------------------------------------
const SAVE_KEY="cubeClimb.v1"; export const save: Save=loadSave();
function loadSave(): Save{
  try{ var s=JSON.parse(localStorage.getItem(SAVE_KEY)||"{}"); return (s&&typeof s==="object")?s:{}; }
  catch(e){ return {}; }                // storage can be blocked or empty: play on without it
}
export function writeSave(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }catch(e){} }
export function allBest(){ return Math.max(save.best||0, GS.best||0); }
