import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { handleAuthRedirect } from '@/utils/authClient'

// Block pull-to-refresh on all screens (home, setup, game).
// Must be a non-passive listener registered before React mounts —
// React's synthetic onTouchMove is passive and cannot call preventDefault().
(function blockPullToRefresh() {
  let startY = 0;
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && window.scrollY === 0) e.preventDefault();
  }, { passive: false });
})();

// Pick up the access token from an email-confirmation redirect (if any)
// BEFORE the app renders, so any component reading getCurrentUser() on
// its very first render already sees the person as signed in.
handleAuthRedirect().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
});
