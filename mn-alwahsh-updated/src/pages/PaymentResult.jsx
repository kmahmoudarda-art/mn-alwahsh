import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getValidSession } from '../utils/authClient';

// Ziina redirects here after checkout (see success_url/cancel_url/failure_url
// in netlify/functions/create-ziina-payment.js). This page's only job is to
// confirm the payment server-side (never trust the redirect alone — anyone
// could land on this URL without paying) and then send the player back into
// the game with the right thing unlocked.
export default function PaymentResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState('checking'); // checking | success | failed | cancelled

  useEffect(() => {
    const status = params.get('status');

    if (status === 'cancelled') { setState('cancelled'); return; }
    if (status === 'failed') { setState('failed'); return; }

    const intentId = params.get('intent');
    const kind = params.get('kind');
    const category = params.get('category');
    const uid = params.get('uid');

    if (!intentId || !kind || !uid) { setState('failed'); return; }

    (async () => {
      try {
        const session = kind === 'trial' ? null : await getValidSession();
        const res = await fetch('/.netlify/functions/confirm-ziina-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intentId, kind, category, userId: uid,
            accessToken: session?.access_token,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) { setState('failed'); return; }

        if (kind === 'trial' && data.trial) {
          try { sessionStorage.setItem('mn_alwahsh_pending_trial', data.trial); } catch {}
        }
        setState('success');
      } catch {
        setState('failed');
      }
    })();
  }, [params]);

  const messages = {
    checking: { emoji: '⏳', title: 'جاري التحقق من الدفع...', text: '' },
    success: { emoji: '✅', title: 'تم الدفع بنجاح!', text: 'يمكنك الآن العودة إلى اللعبة.' },
    failed: { emoji: '❌', title: 'تعذّرت عملية الدفع', text: 'لم يتم خصم أي مبلغ. حاول مرة أخرى.' },
    cancelled: { emoji: '↩️', title: 'تم إلغاء عملية الدفع', text: 'لم يتم خصم أي مبلغ.' },
  };
  const m = messages[state];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#050000', padding: 24,
    }}>
      <div dir="rtl" style={{
        maxWidth: 360, width: '100%', textAlign: 'center',
        background: 'linear-gradient(135deg, #2a0000, #140000)',
        border: '1.5px solid #FFD700', borderRadius: 16, padding: 28,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{m.emoji}</div>
        <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 18, color: '#FFE4E4', margin: '0 0 8px' }}>
          {m.title}
        </h2>
        {m.text && (
          <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#FF9999', margin: '0 0 20px' }}>
            {m.text}
          </p>
        )}
        {state !== 'checking' && (
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: '#FFD700', color: '#2a0000', fontFamily: 'var(--font-cairo)',
              fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}
          >
            العودة إلى اللعبة
          </button>
        )}
      </div>
    </div>
  );
}
