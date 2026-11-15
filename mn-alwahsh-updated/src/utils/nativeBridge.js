// Talks to the Android app's window.AndroidSolo bridge (app version 1.0.0.12+).
// In a normal browser, on iOS, or on an older app build the bridge doesn't
// exist, so every function here is a harmless no-op / returns false.
const bridge = () => (typeof window !== 'undefined' ? window.AndroidSolo : undefined);

// Block screenshots, screen recording and the recents thumbnail while the solo game is open.
export function setScreenSecure(on) {
  try {
    const b = bridge();
    if (b && typeof b.setSecure === 'function') b.setSecure(!!on);
  } catch { /* the page keeps working without it */ }
}

export function canNativeShare() {
  const b = bridge();
  return !!b && typeof b.shareImage === 'function';
}

// Opens Android's share sheet with the picture and the text. Resolves true if the app took it.
export async function nativeShareImage(blob, text) {
  try {
    const b = bridge();
    if (!b || typeof b.shareImage !== 'function') return false;
    const base64 = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    return !!b.shareImage(base64, text);
  } catch {
    return false;
  }
}
