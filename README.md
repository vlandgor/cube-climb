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
| `src/platform/` | Capacitor glue: AdMob rewarded ads, the Android back button, app pause/resume, the dev channel. |
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

### Cube Climb Dev

A second app for testing on a phone. It's named **Cube Climb Dev**
(`com.playcebo.cubeclimb.dev`), so it installs alongside the real app and can't be
confused with it. Instead of the bundled game it loads the newest build from
**https://vlandgor.github.io/cube-climb/**:

- Every push to `main` redeploys that page (`.github/workflows/dev-web.yml`). The next
  time the app opens, it runs the new commit; no reinstall needed. If it was only in the
  background, it reloads on resume when a newer build is live, but only on the main menu,
  never mid-run.
- The main menu shows `DEV · <commit>`, so you can see which build is running.
- Test ads only: Google's sample AdMob app ID (`android/app/src/dev/res/values/strings.xml`)
  and test rewarded unit (`ADS.rewardedId` picks it when `VITE_CHANNEL=dev`).
- Offline, it shows a small "Retry" page instead of the game.
- Its saves are separate from the real app's.

**Install it** from the fixed link
<https://github.com/vlandgor/cube-climb/releases/download/dev/cube-climb-dev.apk>. The
*Android build* workflow rebuilds it on every push to `main` and publishes it to the `dev`
pre-release. You only need a new APK when the native side changes (plugins, permissions,
icons, `MainActivity`). It's signed with the upload key once the signing secrets are set,
so a new dev APK installs over the old one.

How it's built: the `dev` build type in `android/app/build.gradle` sets the name and ID,
and `tools/dev-shell.mjs` writes its Capacitor config (the `server.url`) and offline page
into `android/app/src/dev/assets/` after `cap sync`. Locally: `npm run android:dev`;
`DEV_URL=http://<your-ip>:5173/ npm run android:dev` points it at your `npm run dev`
server instead.

**One-time setup:** Settings → Pages → Build and deployment → Source: **GitHub Actions**.

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

## Icon, splash and store art

All of it is drawn in code in `tools/icons/art.py` and rendered by
`python3 tools/icons/make.py` (needs `rsvg-convert` and Pillow):

- Android adaptive launcher icon (background, foreground and a monochrome layer for
  Android 13 themed icons), plus legacy square and round icons for older launchers
- the splash: Android 12+ uses the icon on the game's background colour; older versions
  use `drawable*/splash.png`
- `store/icon-512.png` and `store/feature-graphic-1024x500.png` for the Play listing
- `public/icon.svg`, the web favicon

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

The build uses Cube Climb's own AdMob IDs:

| Where | What |
|---|---|
| `android/app/src/main/res/values/strings.xml` → `admob_app_id` | AdMob **app** ID `ca-app-pub-8265696902451604~7998740981` |
| `src/platform/ads.ts` → `ADS.rewardedId` | **Revive** rewarded unit `ca-app-pub-8265696902451604/5048484873` |

**Never tap live ads on your own builds**: AdMob treats it as invalid traffic. Test on
**Cube Climb Dev**, which always uses Google's test ads, or register your phones as test
devices (AdMob → Settings → Test devices).

Every build reports which kind it contains ("TEST ads" or "real ad unit") in the
run's APK check.

In AdMob → Apps → this app → App settings, turn **high-engagement ads off**. With it
on, rewarded ads can run up to 60 seconds before the reward; off, the cap is 30.

## Tuning

Settings → Tuning panel shows a ⚙ button during play with every gameplay parameter:
progression, tile chances, creatures, camera and physics.
