// The "unlock this premium category" prompt, usable from any screen.
//
// It uses exactly the same purchase paths as CategoryPicker's own prompt —
// the same products (playProducts.js), the same Play Billing / StoreKit
// bridges, the same prices and the same four actions (this category, all
// categories, one-game trial, restore on iOS) — so nothing new has to be set
// up in Google Play / App Store Connect. Purchases are verified server-side
// as before (verify-play-purchase.js); this component only starts them.
//
// onChanged(event) fires after anything that can change what the player owns:
//   { type: 'single' | 'all' | 'trial' | 'restore' | 'signin', category }
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import AuthForm from './AuthForm';
import { getPremiumPriceLabel, ALL_CATEGORIES_PRICE, TRIAL_PRICE_ANDROID } from '../../utils/premiumConfig';
import { isSignedIn, getValidSession } from '../../utils/authClient';
import { getSkuForCategory, ALL_CATEGORIES_SKU, TRIAL_SKU } from '../../utils/playProducts';
import { getAppStoreCategoryName } from '../../utils/appStoreCategoryNames';
import { isPlayBillingAvailable, buyAndGrant } from '../../utils/playBillingClient';
import { isStoreKitBillingAvailable, buyAndGrantWithStoreKit, restoreStoreKitPurchases, getStoreKitProductDetails } from '../../utils/storeKitBillingClient';
import { isRunningInAndroidApp, isRunningInIOSApp, isLikelyIOSDevice } from '../../utils/platform';
import { displayName } from '../../utils/categoryIcons';

// Same wording rules as CategoryPicker: no raw error text for a cancelled sheet.
const purchaseErrorReason = (err) => {
  const msg = String(err?.message || err || '');
  if (msg === 'canceled' || msg === 'USER_CANCELED') return null;
  try {
    const data = JSON.parse(msg);
    return String(data.detail || data.error || msg).slice(0, 120);
  } catch {
    return msg.slice(0, 120);
  }
};

export default function UnlockPrompt({ category, onClose, onChanged }) {
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  const [restoreMessage, setRestoreMessage] = useState(null);
  const [storePrices, setStorePrices] = useState({});
  const [, bump] = useState(0); // re-render after signing in

  const showStorePrices = isRunningInIOSApp() && isStoreKitBillingAvailable();
  const nativeBillingReady = (isRunningInAndroidApp() && isPlayBillingAvailable()) || (isRunningInIOSApp() && isStoreKitBillingAvailable());
  const sku = getSkuForCategory(category);

  useEffect(() => {
    if (!showStorePrices) return undefined;
    const skus = [sku, ALL_CATEGORIES_SKU, TRIAL_SKU].filter(Boolean);
    let cancelled = false;
    getStoreKitProductDetails(skus).then((details) => {
      if (cancelled) return;
      const prices = {};
      for (const d of details || []) prices[d.itemId] = d.price;
      setStorePrices((prev) => ({ ...prev, ...prices }));
    });
    return () => { cancelled = true; };
  }, [sku, showStorePrices]);

  // Apple's own price on iOS (blank until StoreKit answers), AED reference elsewhere.
  const priceSuffix = (s, fallbackLabel) => {
    if (!showStorePrices) return ` — ${fallbackLabel}`;
    return storePrices[s] ? ` — ${storePrices[s]}` : '';
  };

  const withSession = async (fn) => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      const session = await getValidSession();
      if (!session?.access_token || !session?.user?.id) {
        setUnlockError('يجب تسجيل الدخول أولاً');
        return;
      }
      await fn(session);
    } catch (err) {
      console.error('[UnlockPrompt] purchase failed:', err);
      const reason = purchaseErrorReason(err);
      if (reason === null) return; // cancelled the store sheet — not an error
      setUnlockError(`تعذر إتمام عملية الشراء — حاول مرة أخرى (${reason})`);
    } finally {
      setUnlocking(false);
    }
  };

  const buyNative = (args) => (isRunningInAndroidApp() ? buyAndGrant(args) : buyAndGrantWithStoreKit(args));

  const handleUnlock = () => withSession(async (session) => {
    if (!sku) { setUnlockError('هذه الفئة غير متاحة للشراء حالياً'); return; }
    await buyNative({ sku, userId: session.user.id, accessToken: session.access_token });
    onChanged?.({ type: 'single', category });
  });

  const handleUnlockAll = () => withSession(async (session) => {
    await buyNative({ sku: ALL_CATEGORIES_SKU, userId: session.user.id, accessToken: session.access_token });
    onChanged?.({ type: 'all', category });
  });

  // One-game-only unlock: nothing is written to Supabase; the caller keeps it
  // for the current run only.
  const handleTrial = () => withSession(async (session) => {
    await buyNative({ sku: TRIAL_SKU, userId: session.user.id, accessToken: session.access_token, trialCategory: category });
    onChanged?.({ type: 'trial', category });
  });

  const handleRestore = async () => {
    setRestoreMessage(null);
    setUnlocking(true);
    try {
      const session = await getValidSession();
      if (!session?.access_token || !session?.user?.id) { setRestoreMessage('يجب تسجيل الدخول أولاً'); return; }
      const { ok, restored } = await restoreStoreKitPurchases({ userId: session.user.id, accessToken: session.access_token });
      if (!ok) { setRestoreMessage('تعذّرت استعادة المشتريات — حاول مرة أخرى'); return; }
      onChanged?.({ type: 'restore', category });
      setRestoreMessage(restored.length ? `تمت استعادة ${restored.length} من مشترياتك` : 'لا توجد مشتريات سابقة على هذا الحساب');
    } catch (err) {
      console.error('[UnlockPrompt] restore failed:', err);
      setRestoreMessage('تعذّرت استعادة المشتريات — حاول مرة أخرى');
    } finally {
      setUnlocking(false);
    }
  };

  const gold = { background: '#FFD700', color: '#2a0000' };
  const goldGhost = { background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.4)' };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}
    >
      <motion.div
        role="dialog" aria-modal="true"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{ width: '100%', maxWidth: 340, maxHeight: '100%', overflowY: 'auto', background: 'linear-gradient(135deg, #2a0000, #140000)', border: '1.5px solid #FFD700', borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 0 30px rgba(255,215,0,0.25)' }}
      >
        <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: '#FFD700' }} />
        <h3 className="font-cairo font-bold text-lg mb-1" style={{ color: '#FFE4E4' }}>{displayName(category)}</h3>
        <p className="font-tajawal text-sm mb-1" style={{ color: '#FF9999' }}>
          فئة مميزة{priceSuffix(sku, getPremiumPriceLabel(category))}
        </p>
        {getAppStoreCategoryName(sku) && (
          <p className="font-tajawal text-xs mb-3" style={{ color: 'rgba(255,153,153,0.55)' }}>{getAppStoreCategoryName(sku)}</p>
        )}

        {isSignedIn() ? (
          <>
            {unlockError && <p className="font-tajawal text-xs mb-2" style={{ color: '#FF6666' }}>{unlockError}</p>}
            {nativeBillingReady ? (
              <>
                <button onClick={handleUnlock} disabled={unlocking} className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50" style={gold}>
                  {unlocking ? '...' : `فتح هذه الفئة${priceSuffix(sku, getPremiumPriceLabel(category))}`}
                </button>
                <button onClick={handleUnlockAll} disabled={unlocking} className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#2a0000' }}>
                  {unlocking ? '...' : `فتح جميع الفئات${priceSuffix(ALL_CATEGORIES_SKU, `${ALL_CATEGORIES_PRICE} AED`)}`}
                </button>
                <button onClick={handleTrial} disabled={unlocking} className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50" style={goldGhost}>
                  {`جرّبها لهذه اللعبة فقط${priceSuffix(TRIAL_SKU, `${TRIAL_PRICE_ANDROID} AED`)}`}
                </button>
                <p className="font-tajawal text-xs mb-2" style={{ color: 'rgba(255,150,150,0.7)' }}>
                  التجربة تفتح الفئة لهذه الجولة فقط، وتُقفل مرة أخرى بعدها
                </p>
                <p className="font-tajawal text-center" style={{ fontSize: 10, color: 'rgba(255,228,228,0.4)', marginTop: -4, marginBottom: 8 }}>
                  {getAppStoreCategoryName(TRIAL_SKU)}
                </p>
                {isRunningInIOSApp() && (
                  <>
                    <button onClick={handleRestore} disabled={unlocking} className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50" style={goldGhost}>
                      {unlocking ? '...' : 'استعادة المشتريات السابقة'}
                    </button>
                    {restoreMessage && <p className="font-tajawal text-xs mb-2" style={{ color: '#FFD700' }}>{restoreMessage}</p>}
                  </>
                )}
              </>
            ) : (
              // Payment only happens inside the native apps; the open web is pointed at the store.
              <>
                <p className="font-tajawal text-sm mb-3" style={{ color: 'rgba(255,150,150,0.85)' }}>
                  {isLikelyIOSDevice() ? 'الشراء متاح فقط عبر تطبيق App Store' : 'الشراء متاح فقط عبر تطبيق Google Play'}
                </p>
                <a
                  href={isLikelyIOSDevice() ? 'https://apps.apple.com/app/id6814543685' : 'https://play.google.com/store/apps/details?id=com.mnalwahsh.twa'}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full inline-block font-cairo font-bold rounded-xl py-3 mb-2" style={gold}
                >
                  {isLikelyIOSDevice() ? 'حمّل التطبيق من App Store' : 'حمّل التطبيق من Google Play'}
                </a>
              </>
            )}
            <button onClick={onClose} className="w-full font-cairo text-sm py-2" style={{ color: '#FF9999' }}>إلغاء</button>
          </>
        ) : (
          <>
            <AuthForm onSignedIn={() => { bump(n => n + 1); onChanged?.({ type: 'signin', category }); }} />
            <button onClick={onClose} className="w-full font-cairo text-sm py-2 mt-2" style={{ color: '#FF9999' }}>إلغاء</button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
