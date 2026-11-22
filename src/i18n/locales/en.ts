// English: the source of truth. Every other locale must have exactly these keys
// (the type checker and tests/i18n.test.ts both enforce it).
//
// Rules for translators:
// - keep {n} / {name} placeholders and <b>…</b> tags exactly as they are
// - keep the arrows ↖ ↗ ↙ ↘ — they are the button labels
// - plural messages are objects keyed by CLDR plural category (one, few, many, other…);
//   give every category your language uses
export const en = {
  // HUD
  "hud.height": "height",
  "hud.best": "best",
  "hud.danger": "danger",
  "pad.none": "void",

  // main menu
  "menu.play": "Play",
  "menu.skins": "Skins",
  "menu.how": "How to play",
  "menu.settings": "Settings",
  "menu.best": { one: "Best <b>{n}</b> step", other: "Best <b>{n}</b> steps" },
  "menu.first": "Climb as high as you can",

  // how to play
  "how.title": "How to play",
  "how.climb": "Climb a step up-left or up-right",
  "how.drop": "Drop a step down-left or down-right",
  "how.air": "<b>Tap again mid-air</b> to air jump one more step. Use it to skip gaps and dangers",
  "how.back": "Up, away from the stairs, hops you <b>back two steps</b> down",
  "how.fall": "Falling is fine. Falling <b>past the red line</b> ends the run",
  "how.hint": "New tiles and creatures appear as you climb. Each one shows up on its own first, so you can learn it.",
  "how.ok": "Got it",

  // settings
  "set.title": "Settings",
  "set.sfx": "Sound effects",
  "set.music": "Music",
  "set.musicSub": "follows the danger as you climb",
  "set.lang": "Language",
  "set.langAuto": "Device language",
  "set.tuning": "Tuning panel",
  "set.tuningSub": "shows the ⚙ button during play",
  "set.privacy": "Ad privacy choices",
  "set.privacySub": "change how ads use your data",
  "set.open": "Open",
  "set.policy": "Privacy policy",
  "set.terms": "Terms of use",
  "set.best": "Best height",
  "set.bestSteps": { one: "{n} step", other: "{n} steps" },
  "set.bestNone": "none yet",
  "set.reset": "Reset",
  "set.resetArm": "Tap again",
  "set.resetDone": "Done",
  "common.back": "Back",

  // pause
  "pause.title": "Paused",
  "pause.info": "Height <b>{h}</b> · best <b>{b}</b>",
  "pause.resume": "Resume",
  "pause.restart": "Restart",
  "common.menu": "Main menu",

  // skins
  "skins.title": "Skins",
  "skins.count": "<b>{n}</b> of {total} unlocked",
  "skins.selected": "Selected",
  "skins.wear": "Tap to wear",
  "skins.reach": "Reach {n}",
  "skins.unknown": "???",
  "skin.classic": "Classic",
  "skin.shades": "Shades",
  "skin.grape": "Grape",
  "skin.ghost": "Ghost",
  "skin.robot": "Robot",
  "skin.gold": "Gold",
  "skin.galaxy": "Galaxy",
  "skin.rainbow": "Rainbow",
  "skin.diamond": "Diamond",

  // death, revive, results
  "death.fell": "Fell",
  "death.caught": "Caught",
  "death.spiked": "Spiked",
  "revive.title": "Keep climbing?",
  "revive.info": { one: "You reached <b>{n}</b> step", other: "You reached <b>{n}</b> steps" },
  "revive.free": "Revive",
  "revive.ad": "▶ Watch ad to revive",
  "revive.no": "No thanks",
  "revive.hint": "You'll be back on the last fork you passed.",
  "over.unit": { one: "step", other: "steps" },
  "over.newBest": "New best",
  "over.best": "Best <b>{n}</b>",
  "over.newSkins": { one: "New skin: {names}", other: "New skins: {names}" },
  "over.again": "Again",

  // toasts
  "toast.skin": "New skin unlocked: <b>{name}</b>",
  "toast.airJump": "Nice! <b>Double jump</b> learned",

  // the air-jump lesson, drawn on the canvas (plain text: no tags)
  "lesson.title": "DOUBLE JUMP",
  "lesson.sub": "{a} then {a} again mid-air",
  "lesson.again": "TAP {a} AGAIN!",
} as const;
