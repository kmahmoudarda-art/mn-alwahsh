// Asks the Android app to block screenshots / screen recording / the recents
// thumbnail while a screen is open (FLAG_SECURE, via the AndroidScreen bridge
// added in app version 1.0.0.12). It does nothing in a normal browser or on an
// older app build: a web page cannot stop screenshots by itself, and iOS has
// no way to block them.
export function setScreenSecure(on) {
  try {
    if (typeof window !== 'undefined' && window.AndroidScreen && typeof window.AndroidScreen.setSecure === 'function') {
      window.AndroidScreen.setSecure(!!on);
    }
  } catch { /* the page keeps working without it */ }
}
