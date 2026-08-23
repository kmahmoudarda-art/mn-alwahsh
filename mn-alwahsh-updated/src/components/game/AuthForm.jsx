import { useState } from 'react';
import { signIn, signUp } from '../../utils/authClient';

const REMEMBER_EMAIL_KEY = 'mn_alwahsh_v3_remembered_email'; // v3_ prefix survives the startup localStorage wipe

function getRememberedEmail() {
  try { return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''; } catch { return ''; }
}

// Compact email/password form — used both as the main login gate (Game.jsx)
// and inline inside the premium-category unlock prompt (CategoryPicker.jsx).
// Not a full account-management screen (no password reset, no profile) —
// just enough to tie a purchase/game to a person.
//
// "Remember me" only remembers the EMAIL (for prefill next time) — it does
// NOT store the password anywhere in this app's own storage, since a raw
// password sitting in localStorage is a real security risk (readable by
// any XSS, unlike a browser's own encrypted password manager). The
// autoComplete attributes below are what let the browser's built-in
// password manager offer to save/fill the password securely instead.
export default function AuthForm({ onSignedIn }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState(getRememberedEmail());
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const trimmedEmail = email.trim();
      if (mode === 'signin') {
        await signIn(trimmedEmail, password);
      } else {
        const result = await signUp(trimmedEmail, password);
        if (result.needsEmailConfirmation) {
          setConfirmSent(true);
          setBusy(false);
          return;
        }
      }
      try {
        if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {}
      onSignedIn();
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <p className="font-tajawal text-sm text-center" style={{ color: '#FFE4E4' }}>
        تم إرسال رابط تأكيد إلى بريدك الإلكتروني — افتحه ثم عد لتسجيل الدخول.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} dir="rtl" className="space-y-2 text-right">
      <input
        type="email"
        required
        autoComplete="email"
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
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm font-tajawal"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFE4E4' }}
      />
      <label className="flex items-center gap-2 font-tajawal text-xs py-1 cursor-pointer" style={{ color: '#FF9999' }}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          style={{ accentColor: '#CC0000' }}
        />
        تذكرني
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
