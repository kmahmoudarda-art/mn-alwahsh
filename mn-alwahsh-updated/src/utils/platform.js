// Detects whether the site is currently running inside the Android app
// (a native WebView wrapping mnalwahsh.com) rather than a normal
// mobile/desktop browser.
//
// Why this matters: purchasing only happens through Google Play Billing
// (see playBillingClient.js), which is only reachable from inside the
// packaged Android app — a normal browser tab has no bridge to Play
// Billing. CategoryPicker.jsx's unlock modal checks this (plus
// isPlayBillingAvailable()) to decide whether to show real buy buttons or
// point the visitor at the Play Store listing instead.
//
// The Android app injects window.AndroidBilling (see MainActivity's
// JavaScript bridge) as soon as a page loads, so its presence is a
// reliable signal we're inside the packaged app. document.referrer
// starting with "android-app://" is kept as a fallback for the older TWA
// build, in case that referrer ever shows up again.
export function isRunningInAndroidApp() {
  if (typeof window !== 'undefined' && typeof window.AndroidBilling !== 'undefined') {
    return true;
  }
  try {
    return document.referrer.startsWith('android-app://');
  } catch {
    return false;
  }
}

// Same idea as isRunningInAndroidApp(), for the iOS WKWebView wrapper.
// MainViewController.swift injects window.WebkitBilling as soon as a page
// loads (see storeKitBillingClient.js), so its presence is a reliable
// signal we're inside the packaged iOS app rather than Mobile Safari.
export function isRunningInIOSApp() {
  return typeof window !== 'undefined' && typeof window.WebkitBilling !== 'undefined';
}

// Best-effort "this device is an iPhone/iPad" check, used only to decide
// which app-store badge to show a web visitor who is NOT inside either
// native app (isRunningInAndroidApp() / isRunningInIOSApp() both false) —
// never used for anything security- or purchase-related.
export function isLikelyIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as "MacIntel" in the UA but exposes touch support,
  // unlike real Macs.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}
