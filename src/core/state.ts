import type {
  Buffered, Critter, Debris, Foe, GameState, Intent, Plat, Player, Puff, Ride, Tip, TrailPoint,
} from "./types";

// marks a field that starts empty and is filled by reset() before the first frame reads it.
// the value really is undefined until then, exactly as in the original single-file build.
const later = <T>() => undefined as unknown as T;

/**
 * Run-time state shared between modules. Anything only one module touches lives in that
 * module instead. Tuning parameters are in config/params (P).
 */
export const GS = {
  // viewport, in CSS pixels
  W: 0,
  H: 0,

  // the structure
  plats: later<Plat[]>(),
  pmap: later<Record<string, Plat>>(),     // "gx,gy" -> platform
  tips: later<Tip[]>(),
  holes: later<Record<string, boolean>>(), // cells that must stay empty
  turns: [] as Plat[],                     // staircase reversals a walker can use
  fuses: [] as Plat[],                     // fragile tiles about to collapse
  clearQ: [] as Plat[],                    // elevator shafts waiting to be hollowed out

  // the player and the run
  pl: later<Player>(),
  best: later<number>(),
  maxY: later<number>(),
  state: later<GameState>(),
  autoT: later<number>(),
  flash: later<number>(),
  lastIntent: later<Intent>(),
  lastPressed: 1,
  buf: null as Buffered | null,
  reject: 0,
  ride: null as Ride | null,
  lastLift: null as Plat | null,
  taught: {} as Record<string, number>,    // mechanics this run has introduced
  runUnlocks: [] as string[],

  // clocks: real seconds since boot, and simulated seconds this run
  now: 0,
  gt: 0,
  fdt: 1 / 60,                             // the last frame's real duration

  // creatures and effects
  foes: [] as Foe[],
  critters: [] as Critter[],
  critNext: 0,
  debris: [] as Debris[],
  puffs: [] as Puff[],
  trail: [] as TrailPoint[],

  // revive offer
  revivesLeft: 0,
  reviveGrace: 0,
  offerUntil: 0,
  offerOn: false,
  deathWhy: "fell",                         // fell | caught | spiked (death.* keys)

  // menus
  curScreen: null as string | null,
  howReturn: "menu",
  hintBtn: null as string | null,          // pad button glowing for the air-jump lesson

  // camera
  camY: 0,
  camX: 0,
};
