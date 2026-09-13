# From TWA to native WebView — what changed and what you need to do

## What I found (Phase 1)

- **App**: من الوحش, package name (never changes) `com.mnalwahsh.twa`
- **Old build**: a Trusted Web Activity (TWA) made by PWABuilder — versionCode
  `5`, versionName `1.0.0.7`, loading Chrome inside the app instead of a real
  in-app browser. That's exactly why Google flags it as a "thin wrapper."
- **Website**: https://mnalwahsh.com (you confirmed this — it wasn't in any
  project file)
- **Colors/branding**: dark red theme `#CC0000` on near-black `#050000`,
  taken from the site's `manifest.json`
- **Real feature the app uses**: Google Play Billing for 71 in-app products
  (game categories) — everything else is a plain web app (email/password
  login via Supabase, no camera/file upload/location).

## The one conflict I flagged before starting (billing)

Your purchases used to work through a Chrome-only trick (the Digital Goods
API), which only exists inside a TWA. A plain WebView doesn't have it. You
told me to fix this with the proper native solution, so I did:

- The new app includes Google's real **Play Billing Library** (Kotlin code
  in `android/app/src/main/java/com/mnalwahsh/twa/AndroidBillingBridge.kt`).
- It's exposed to your website as `window.AndroidBilling` — a small
  JavaScript bridge injected by the app.
- I updated `mn-alwahsh-updated/src/utils/playBillingClient.js` and
  `platform.js` on the website side so the exact same purchase buttons you
  already have keep working, just talking to the native bridge instead of
  the old Digital Goods API. No changes needed to `verify-play-purchase.js`
  or any of your 71 product IDs — the purchase token format is identical.

**You need to redeploy the website** (Netlify auto-deploys from this repo,
so pushing this branch — or merging it — is enough) so the updated
`playBillingClient.js` goes live before testers use the new Android app.

## Why I can't hand you a finished, signed file directly

I did all of Phases 1, 2, 4, and 5 here: read the old APK, decided this is a
from-scratch conversion (nothing from the TWA survives anyway), wrote a
complete WebView Android project, and kept your package name/versioning
correct. But this cloud workspace's internet access is locked down and
can't reach Google's Android SDK servers, so I'm not able to run the actual
compile step from here. **You'll need to build it — on your own computer,**
which the original plan already expected you might have to set up (Phase 3).
I've made this as close to one-command as possible.

Everything below is exact copy-paste steps.

## Phase 3 — Install the build tools (one-time)

You need a Java JDK (17+) and the Android SDK. The easiest way to get both
is Android Studio.

**Recommended: Android Studio** (includes JDK + Android SDK, one installer)

1. Go to https://developer.android.com/studio and download the installer
   for your operating system.
2. **Windows**: run the downloaded `.exe`, click through the installer with
   default options.
   **Mac**: open the downloaded `.dmg`, drag Android Studio into
   Applications, then launch it.
3. On first launch, choose the "Standard" setup — it downloads the Android
   SDK automatically (this can take 10–20 minutes).
4. When it's done, close the welcome screen.

You now have everything needed — no command line required for this part.

*(If you'd rather not install all of Android Studio: install Temurin JDK 17
from https://adoptium.net, then the Android "command-line tools" package
from https://developer.android.com/studio#command-tools, then run
`sdkmanager --licenses` and `sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"`.
This is more steps and easier to get wrong, so Android Studio is the
recommended path unless you have a reason to avoid it.)**

## Getting the project onto your computer

1. Pull this branch (`claude/twa-webview-conversion-ctgi0v`) from GitHub onto
   your computer — either `git clone`/`git pull`, or download it as a ZIP
   from GitHub and unzip it.
2. You should now have, in the same top-level folder:
   - `android/` — the new Android project
   - `mn-alwahsh-updated/` — your website source (unchanged except the two
     billing-related files above)
   - `signing.keystore` — your existing Play signing key (already placed at
     the repo root by me)

## One-time signing setup

Google requires every update to be signed with the same key as before —
that's why I kept `signing.keystore` in place rather than making a new one.

1. In the `android/` folder, copy `keystore.properties.example` to a new
   file named `keystore.properties` (same folder).
2. Open `keystore.properties` in a text editor and fill in:
   ```
   storeFile=../../signing.keystore
   storePassword=<your keystore password>
   keyAlias=my-key-alias
   keyPassword=<your key password>
   ```
   The alias `my-key-alias` is what's stored inside your keystore file — you
   should only need to supply the two passwords. **Never send me these
   passwords or paste them anywhere in this chat** — this file stays on your
   computer only (it's already excluded from git).
3. If you don't remember these passwords: if this app uses **Play App
   Signing** (the default for apps uploaded since ~2021), you can still get
   back into your Play Console listing even without the original upload-key
   password, via Play Console → your app → **Test and release → App
   integrity → Request upload key reset**. Ask me if you want help with
   that flow instead.

## Phase 6 — Build both files

Open a terminal (Mac: Terminal app; Windows: press Win, type
"Command Prompt" or use the terminal built into Android Studio via
View → Tool Windows → Terminal) and run:

**Mac/Linux:**
```bash
cd path/to/mn-alwahsh/android
chmod +x gradlew
./gradlew assembleRelease bundleRelease
```

**Windows:**
```cmd
cd path\to\mn-alwahsh\android
gradlew.bat assembleRelease bundleRelease
```

The first run downloads Gradle and the Android build dependencies, so it
can take several minutes. When it finishes you'll have:

- **APK** (for testing on your phone):
  `android/app/build/outputs/apk/release/app-release.apk`
- **AAB** (for the Play Store upload):
  `android/app/build/outputs/bundle/release/app-release.aab`

If a build error mentions signing, double check `keystore.properties` — a
typo'd password is the most common cause.

## Phase 7 — Test the APK before uploading anything

1. Copy `app-release.apk` to your phone (email it to yourself, use a USB
   cable, or Google Drive — anything that gets the file onto the phone).
2. On the phone, tap the file. If prompted, allow "install from this
   source" for whichever app you opened it with (Files, Gmail, etc.) — this
   is a normal one-time permission for installing an app outside the Play
   Store.
3. Open the app and check:
   - The site loads full-screen, no browser address bar.
   - Navigating around the game and pressing the phone's back button steps
     back through pages, and only exits the app once there's nowhere left
     to go back to.
   - Turn on airplane mode and reload — you should see the red/black
     offline screen with a retry button, never a blank white page.
   - Pull down from the top of a page — it should show a refresh spinner.
   - Try a real purchase using a **Play Console license tester account**
     (Play Console → Setup → License testing) so it doesn't charge real
     money — confirm a category unlocks.

## Confirming nothing regressed

- **Package name**: unchanged — still `com.mnalwahsh.twa`.
- **versionCode**: 5 → **6** (one higher, as required for a Play update).
- **versionName**: 1.0.0.7 → 1.0.0.8.
- **No TWA code remains**: this project has no `androidbrowserhelper`
  dependency, no `DelegationService`, no `LauncherActivity`/TWA setup, no
  Chrome Custom Tabs launcher for the main content (Custom Tabs is only used
  for the one case your app's rules call for: opening a link to a *different*
  website in the phone's browser, per your own Phase 4 instructions).

## Final checklist — publishing the update

1. Go to https://play.google.com/console and open your **existing**
   من الوحش app listing (not a new one).
2. Go to your closed testing track (Testing → your track name).
3. Click **Create new release**.
4. Upload `app-release.aab`.
5. Fill in release notes (e.g. "Rebuilt as a native app for a better
   experience"), then **Save**, then **Review release**, then **Roll out**.
6. Your existing testers get this as an automatic update, and your 14-day
   testing clock keeps running uninterrupted since it's the same app +
   package name.
