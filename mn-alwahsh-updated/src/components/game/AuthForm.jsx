import { useState, useEffect } from 'react';
import { signIn, signUp } from '../../utils/authClient';

// Compact email/password form — used inline inside the unlock prompt in
// CategoryPicker.jsx, and as the main entry form in GameNameScreen.jsx.
// Not a full account-management screen (no password reset, no profile) —
// just enough to tie a purchase / session to a person.
//
// "Remember me" stores the email+password in localStorage in plain text
// so the form can prefill itself next visit. That's a deliberate tradeoff
// for a casual trivia app with no sensitive data behind the account — do
// not reuse this pattern for anything that needs real security.
const REMEMBER_KEY = 'mn_alwahsh_remember_me';

function loadRemembered() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function AuthForm({ onSignedIn }) {
  const remembered = loadRemembered();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState(remembered?.email || '');
  const [password, setPassword] = useState(remembered?.password || '');
  const [rememberMe, setRememberMe] = useState(!!remembered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (remembered) setMode('signin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistRememberedIfNeeded = (finalEmail, finalPassword) => {
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: finalEmail, password: finalPassword }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const trimmedEmail = email.trim();
    try {
      if (mode === 'signin') {
        await signIn(trimmedEmail, password);
        persistRememberedIfNeeded(trimmedEmail, password);
        onSignedIn();
      } else {
        // Signup should be enough on its own — no "check your email" dead
        // end. If the Supabase project doesn't return a session right away
        // (e.g. "Confirm email" is still on in Auth settings), fall back to
        // signing in immediately with the same credentials.
        const result = await signUp(trimmedEmail, password);
        if (result.needsEmailConfirmation) {
          try {
            await signIn(trimmedEmail, password);
          } catch {
            throw new Error('فعّل "Confirm email = off" في إعدادات Supabase Auth للسماح بالدخول مباشرة بعد التسجيل');
          }
        }
        persistRememberedIfNeeded(trimmedEmail, password);
        onSignedIn();
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} dir="rtl" className="space-y-2 text-right">
      <p className="font-tajawal text-xs mb-2" style={{ color: '#FF9999' }}>
        سجّل الدخول أو أنشئ حساب — نفس الحساب يعمل على الموقع والتطبيق
      </p>
      <input
        type="email"
        required
        placeholder="البريد الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm font-tajawal"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFE4E4' }}
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm font-tajawal"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFE4E4' }}
      />
      <label className="flex items-center gap-2 justify-end font-tajawal text-xs" style={{ color: '#FFCCCC' }}>
        تذكر البريد وكلمة المرور
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          style={{ accentColor: '#CC0000', width: 14, height: 14 }}
        />
      </label>
      {error && (
        <p className="font-tajawal text-xs" style={{ color: '#FF6666' }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full font-cairo font-bold rounded-xl py-2.5 disabled:opacity-50"
        style={{ background: '#FFD700', color: '#2a0000' }}
      >
        {busy ? '...' : mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
      </button>
      <button
        type="button"
        onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); }}
        className="w-full font-tajawal text-xs py-1"
        style={{ color: '#FF9999' }}
      >
        {mode === 'signin' ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب؟ تسجيل الدخول'}
      </button>
    </form>
  );
}
