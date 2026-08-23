// Detects whether the site is currently running inside the Android app
// (a Trusted Web Activity wrapping mnalwahsh.com) rather than a normal
// mobile/desktop browser.
//
// Why this matters: Google Play's Payments policy forbids apps from
// leading users to any payment method other than Google Play Billing —
// including just linking out to a website checkout. Since the Android
// app is a TWA showing this exact site, the Ziina unlock buttons that are
// perfectly fine on the open web would be a policy violation the moment
// they're reachable inside the app. See CategoryPicker.jsx's unlock modal,
// which checks this before showing them.
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
