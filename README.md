# Cube Climb

A fast 2D endless climber by Playcebo Games. Climb a branching staircase with four
diagonal buttons, air-jump over gaps and hazards, and see how high you can get.

Written in TypeScript and built with Vite. No engine: graphics are drawn on a 2D canvas
and audio is synthesised with Web Audio, all in code.

## Running it

Needs Node 22.

```
npm ci
npm run dev        # local server with hot reload
npm run build      # strict type-check, then a production build into dist/
npm run preview    # serve the production build
```

On a desktop, the keys are Q ↖ · E ↗ · A ↙ · D ↘, Esc pauses, and R restarts.

## Repository layout

| Path | What it is |
|---|---|
| `index.html` | The page: canvas, HUD, pad, tuning panel and menu screens. |
| `src/main.ts` | Boot and the frame loop (fixed 1/240 s simulation steps, one draw per frame). |
| `src/config/params.ts` | `P`, every tunable. The tuning panel edits it live. |
| `src/core/` | Shared run state (`GS`), data types, math helpers. |
| `src/world/` | The grid, structure generation, difficulty curves, special tiles. |
| `src/entities/` | The walker (enemy) and the faller (harmless). |
| `src/game/` | Movement and input rules, the simulation step, run flow and revive, the air-jump lesson. |
| `src/render/` | Canvas setup, camera, skins, drawing a frame. |
| `src/ui/` | Menus, pad buttons, skins screen, tuning panel, styles. |
| `src/audio/` | Synthesised sound effects and music. |
| `src/platform/` | Capacitor glue: AdMob rewarded ads, the Android back button, app pause/resume. |
| `src/storage/` | The save (best height, skins, settings) in localStorage. |
| `docs/` | Design documents. `game-design-v0.2.md` predates most features and is due an update. |

## Android

The game is wrapped for Android with [Capacitor](https://capacitorjs.com). `android/` is
the native project; `capacitor.config.json` holds the app ID (`com.playcebo.cubeclimb`)
and name. Capacitor ships the Vite build in `dist/`, so run `npm run build` before
`npx cap sync` (the `sync` and `android:*` scripts do this for you).

**Builds run on GitHub.** Every push and pull request runs the *Android build* workflow
(`.github/workflows/android.yml`). Download the results from the run's **Artifacts**:

- `cube-climb-debug-…`: a debug APK you can install straight onto a phone.
- `cube-climb-release-…`: a signed AAB for Google Play, plus a signed APK. This
  appears only once the signing secrets below are set.

To build a specific version, open **Actions → Android build → Run workflow** and enter a
version name. The version code goes up automatically with every run, as Play requires.

**Release signing.** Add these under *Settings → Secrets and variables → Actions*:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | your upload keystore, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

The keystore never goes in the repository; `.gitignore` blocks it.

**Building locally** needs Node 22 and JDK 21: `npm ci`, then `npm run android:debug`.

## Languages

15 languages: English, Spanish, French, German, Italian, Portuguese (Brazil), Polish,
Turkish, Ukrainian, Russian, Arabic (right-to-left), Hindi, Japanese, Korean and
Simplified Chinese. The game follows the device language; Settings → Language overrides it.

- Strings live in `src/i18n/locales/`. `en.ts` is the source of truth; every other file
  must have the same keys, and `npm test` checks that each keeps the `{placeholders}`
  and `<b>` tags and has every plural form its language needs.
- Page text is marked `data-i18n="key"`; code calls `t("key", { n })`.
- English ships in the main bundle; each other language is a ~1.5 KB chunk loaded on demand.
- To add a language: copy `en.ts`, translate, add it to `LOCALES` in `src/i18n/index.ts`.

The tuning panel is a developer tool and stays in English.

## Releasing

Builds are named after the game and version: `cube-climb-<version>-<code>-release.aab`
(upload this one to Play), `…-release.apk` and `…-debug.apk`. The version name comes from
`package.json` (or the *Run workflow* input) and the code from the run number.

## Ads

The Revive button shows an AdMob **rewarded ad** inside the app (plugin
`@capacitor-community/admob`). Tapping Revive is the opt-in. The revive timer freezes
while the ad plays. Closing it early returns you to the revive screen. If no ad is
available, the revive is free. In a browser there are no ads.

On first launch the app asks for ad consent where the law requires it (Google's UMP), and
Settings then shows **Ad privacy choices**.

**The build currently uses Google's public test IDs**, which always show a "Test Ad" and
earn nothing. Before releasing, replace both with your own from the AdMob console:

| Where | What |
|---|---|
| `android/app/src/main/res/values/strings.xml` → `admob_app_id` | your AdMob **app** ID (`ca-app-pub-…~…`) |
| `src/platform/ads.ts` → `ADS.rewardedId`, and set `ADS.testing` to `false` | your **rewarded ad unit** ID (`ca-app-pub-…/…`) |

Every build reports which kind it contains ("TEST ads" or "real ad unit") in the
run's APK check.

In AdMob → Apps → this app → App settings, turn **high-engagement ads off**. With it
on, rewarded ads can run up to 60 seconds before the reward; off, the cap is 30.

## Tuning

Settings → Tuning panel shows a ⚙ button during play with every gameplay parameter:
progression, tile chances, creatures, camera and physics.
