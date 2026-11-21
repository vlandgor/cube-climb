// The game's data shapes. Flags on tiles are 0/1 numbers, as the original code wrote them.

export type GameState = "menu" | "play" | "paused" | "dead";

/** A platform on the grid. One object per cell; the special-tile flags are mutually exclusive. */
export interface Plat {
  x: number; y: number;          // world position (gx*stepX, gy*stepY)
  gx: number; gy: number;        // grid cell
  dir: number;                   // direction the staircase was climbing when it was laid
  v: boolean;                    // visited
  vt?: number;                   // when it was first landed on: skin paint animates in from here
  lt?: number;                   // when it was last landed on (the Ghost skin's footprints fade from here)

  frag?: number; hits?: number; fuse?: number;          // fragile: cracks, then collapses
  spr?: number;                                          // spring: next jump spans two steps
  rat?: number;                                          // ratchet: up only
  dn?: number;                                           // down only
  spk?: number; spUntil?: number; spA?: number;          // spikes: raised until spUntil, eased spA
  eseed?: number; ec?: boolean; ect?: number; ecl?: number;   // elevator candidate + shaft check cache
  stops?: number[]; rcool?: number;                      // elevator: its three stop rows, cooldown
  turn?: number; merge?: number; foeDone?: number;       // structure markers
  _t?: boolean;                                          // scratch flag used while pruning
}

/** Where a press would take you: a platform, a gap to air-jump into, or a back-hop landing. */
export interface Target {
  x: number; y: number;
  hole?: boolean; back?: boolean;
  plat?: Plat | null;
  spk?: number; spUntil?: number;
}

export interface Player {
  x: number; y: number; vx: number; vy: number;
  ground: boolean;
  p: Plat | null;                // the platform stood on
  sq: number;                    // squash amount
  boost: number;                 // charged by a spring
  djLeft: number;                // air jumps left this flight
  tgx?: number; tgy?: number;    // grid cell this flight is headed for
  ldx?: number; ldy?: number;    // its line, for continuing an air jump
  lbtn?: string;                 // the button that started it, "dir,up"
  gapTo?: string | null;         // set when an air jump is clearing a gap (the lesson)
}

/** A growing end of the structure. */
export interface Tip {
  plat: Plat; dir: number; segLeft: number;
  trail: Plat[];                 // own recent platforms, exempt from branch separation
  age: number; mate: Tip | null; mergeAt: number;
  gapTaught: boolean;
}

export interface Intent { dir: number; up: boolean; plat?: Plat | null; }
export interface Buffered { dir: number; up: boolean; t: number; two: boolean; }

export interface Foe {
  x: number; y: number;
  st: "tele" | "rest" | "air";
  t: number; path: Plat[]; at: number; idx: number; k: number;
  ax0?: number; ay0?: number; ax1?: number; ay1?: number; ad?: number; ap?: number;
}

export interface Critter {
  x: number; y: number; vx: number; vy: number;
  st: "fall" | "sit" | "gone";
  land: Plat | null; rot: number; vr: number; sq: number; t: number;
}

export interface Puff { x: number; y: number; r: number; life: number; col?: string; }
export interface Debris { x: number; y: number; w: number; vx: number; vy: number; rot: number; vr: number; life: number; col?: string; }
export interface Ride { lift: Plat; toGy: number; from: number; to: number; t: number; dur: number; }
export interface TrailPoint { x: number; y: number; t: number; }

/** What localStorage keeps between sessions. */
export interface Save {
  best?: number;
  skin?: string;
  unl?: Record<string, number>;
  seenHow?: number;
  tuning?: number;
  sfx?: number;
  music?: number;
  djDone?: number;
  lang?: string;        // chosen language code; absent = follow the device
}
