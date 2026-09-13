# من الوحش — Android app (native WebView)

This is a plain Android WebView app that loads https://mnalwahsh.com, replacing
the old Trusted Web Activity (TWA) build. See `../ANDROID_HANDOFF.md` at the
repo root for the full explanation, build steps, and testing checklist.

Quick reference:

- Package name (`applicationId`): `com.mnalwahsh.twa` — unchanged from the old app.
- versionCode: 6 (was 5) · versionName: 1.0.0.8 (was 1.0.0.7)
- Signing key: same `signing.keystore` as before, expected at the repo root
  (one level above this `android/` folder).

## One-time setup

1. Copy `keystore.properties.example` to `keystore.properties` in this folder
   and fill in the real store/key passwords. This file is gitignored — never
   commit it.
2. Make sure `signing.keystore` sits at the repo root (`../signing.keystore`
   relative to this file), or update the `storeFile` path in
   `keystore.properties` if you put it elsewhere.

## Build

```bash
cd android
./gradlew assembleRelease      # signed APK, for installing on your phone
./gradlew bundleRelease        # signed AAB, for uploading to Google Play
```

Output files:
- `app/build/outputs/apk/release/app-release.apk`
- `app/build/outputs/bundle/release/app-release.aab`

If `keystore.properties` is missing, the release build type is left
unsigned so the project still opens/builds in Android Studio — you'll get
an unsigned APK/AAB you can't upload until you add real signing.
