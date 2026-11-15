# Cube Climb

A fast 2D endless climber by Playcebo Games. Climb a branching staircase with four
diagonal buttons, air-jump over gaps and hazards, and see how high you can get.

The whole game is a single self-contained HTML file. No engine and no build step for
the game itself: graphics and audio are drawn and synthesised in code.

## Repository layout

| Path | What it is |
|---|---|
| `web/index.html` | The game. Open it in a browser to play. |
| `docs/` | Design documents. `game-design-v0.2.md` predates most features and is due an update. |

## Running it

Open `web/index.html` in any modern browser. On a desktop, the keys are
Q ↖ · E ↗ · A ↙ · D ↘, Esc pauses, and R restarts.

## Android

The game is wrapped for Android with [Capacitor](https://capacitorjs.com). `android/` is
the native project; `capacitor.config.json` holds the app ID (`com.playcebo.cubeclimb`)
and name.

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
| `web/index.html` → `ADS.rewardedId`, and set `ADS.testing` to `false` | your **rewarded ad unit** ID (`ca-app-pub-…/…`) |

Every build reports which kind it contains ("TEST ads" or "real ad unit") in the
run's APK check.

In AdMob → Apps → this app → App settings, turn **high-engagement ads off**. With it
on, rewarded ads can run up to 60 seconds before the reward; off, the cap is 30.

## Tuning

Settings → Tuning panel shows a ⚙ button during play with every gameplay parameter:
progression, tile chances, creatures, camera and physics.
