// every tunable in the game. the tuning panel (ui/tuning) edits these live.
export const P={
  stepX:64, stepY:44, platW:56, platH:11,
  segMin:5, segMax:10, forkChance:0.45, maxTips:3, junc:true, noDeadEnd:false, clear:2,
  merge:true, mergeMin:20, mergeMax:45, mergeMinAge:12, mergeRange:16,  // branches rejoin
  fragile:true, breakMs:170, fragForks:false,
  elev:true, elevMs:420, elevMin:5, elevMax:16, elevCool:1600,
  spring:true, ratchet:true, downOnly:true,
  spikes:true, spikeLinger:600,
  gaps:true,                       // tiles missing from the stairs: air-jump across
  crit:true, critGap:9000, critSit:1400,
  foes:true, foeTrig:10, foeTele:800, foeHop:450,
  revive:true, reviveMax:1, reviveWindow:5000, reviveGrace:2000,

  // ---- progression: each mechanic unlocks at a height (steps), appears once on its
  // own to teach it, then fades in from its intro chance to its peak chance.
  //            unlock      peak by      intro chance      peak chance
  gapStart:8,    gapFull:300,   gapChance:0.01,    gapMax:0.12,     // first one is a lesson
  fragStart:12,  fragFull:220,  fragChance:0.04,   fragMax:0.16,
  sprStart:22,   sprFull:200,   springChance:0.08, springMin:0.03,   // helper: thins out
  critStart:30,                 critChance:0.08,                     // harmless scare
  ratStart:40,   ratFull:250,   ratchetChance:0.03,ratchetMax:0.09,
  spkStart:55,   spkFull:280,   spikeChance:0.03,  spikeMax:0.14,
  dnStart:70,    dnFull:300,    downChance:0.025,  downMax:0.10,
  elevStart:85,  elevFull:300,  elevChance:0.02,   elevPeak:0.035,
  foeStart:100,  foeFull:350,   foeChance:0.15,    foeMax:0.5,       // per eligible turn
  pace:1,          // scales every unlock/peak height: <1 faster onboarding, >1 slower
  teach:true,      // guarantee each mechanic's first appearance right at its unlock
  waves:true, waveAmp:0.45, wavePeriod:70, waveFrom:80,   // calm stretches between hard ones
  dj:true, djMax:1, backflip:true,
  apex:1.8, back:0.45, grav:7200, speed:1.25,
  four:true, buffer:140, ignoreVoid:true, dim:true, preview:true,
  onRelease:false, useMod:true, consume:true, air:false,
  auto:false, autoDelay:60, snap:true,
  // the death line trails your best height. it starts fallSteps below and tightens to
  // fallMin by fallFull steps (scaled by pace), so the climb gets less forgiving.
  fallSteps:12, fallMin:8, fallFull:400, showLine:true,
  camLerp:0.12, look:0.07, camX:true, camPos:0.8, boxX:0.08, boxY:0.11, viewCols:6.6
};
export type Params = typeof P;
