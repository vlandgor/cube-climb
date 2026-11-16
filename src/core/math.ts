// small numeric helpers
export function rnd(a: number, b: number){return a+Math.floor(Math.random()*(b-a+1));}
export function mix(a: number, b: number, t: number){ return a+(b-a)*t; }
export function smooth01(t: number){ t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }
