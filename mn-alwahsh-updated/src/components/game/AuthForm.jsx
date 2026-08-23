import { useState } from 'react';
import { signIn, signUp } from '../../utils/authClient';

// Compact email/password form — used inline inside the unlock prompt in
// CategoryPicker.jsx. Not a full account-management screen (no password
// reset, no profile) — just enough to tie a purchase to a person.
export default function AuthForm({ onSignedIn }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        onSignedIn();
      } else {
        const result = await signUp(email.trim(), password);
        if (result.needsEmailConfirmation) {
          setConfirmSent(true);
        } else {
          onSignedIn();
        }
      }
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
      <p className="font-tajawal text-xs mb-2" style={{ color: '#FF9999' }}>
        سجّل الدخول لفتح الفئات المميزة — نفس الحساب يعمل على الموقع والتطبيق
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
