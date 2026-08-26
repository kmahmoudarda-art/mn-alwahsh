// Detects whether the site is currently running inside the Android app
// (a Trusted Web Activity wrapping mnalwahsh.com) rather than a normal
// mobile/desktop browser.
//
// Why this matters: purchasing only happens through Google Play Billing
// (see playBillingClient.js), which is only reachable from inside the
// packaged Android app — a normal browser tab has no Digital Goods API to
// talk to Play with. CategoryPicker.jsx's unlock modal checks this (plus
// isPlayBillingAvailable()) to decide whether to show real buy buttons or
// point the visitor at the Play Store listing instead.
//
// TWAs launched via Bubblewrap/PWABuilder set document.referrer to
// "android-app://<package-id>" — that's the standard, documented way to
// tell a TWA apart from a regular browser tab. A real browser's referrer
// is either empty or a normal https:// URL, never android-app://.
export function isRunningInAndroidApp() {
  try {
    return document.referrer.startsWith('android-app://');
  } catch {
    return false;
  }
}
