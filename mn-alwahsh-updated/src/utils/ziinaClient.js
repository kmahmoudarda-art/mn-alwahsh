// Starts a real Ziina payment for one of the three unlock options in
// CategoryPicker.jsx. Calls the create-ziina-payment Netlify function
// (server-side — never expose the Ziina access token in the browser),
// then navigates the whole page to Ziina's hosted checkout.
//
// NOTE for local development: `npm run dev` (plain Vite) does NOT run
// Netlify Functions — /.netlify/functions/* will 404. Use `netlify dev`
// (Netlify CLI) instead to test this locally, or test against the actual
// deployed site.
import { getCurrentUser } from './authClient';

export async function startZiinaCheckout({ kind, category }) {
  const user = getCurrentUser();
  if (!user?.id) throw new Error('not-signed-in');

  const res = await fetch('/.netlify/functions/create-ziina-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, category, userId: user.id }),
  });
  if (!res.ok) throw new Error('create-payment-failed');
  const { redirect_url } = await res.json();
  if (!redirect_url) throw new Error('no-redirect-url');

  window.location.href = redirect_url; // full navigation — Ziina's hosted page, not part of the SPA
}
