import { motion } from 'framer-motion';
import AuthForm from './AuthForm';

// Shown instead of the old "type a game name" screen — signing in now
// identifies the player instead of a typed name, and reuses the same
// account for unlocking premium categories.
export default function LoginGate({ onSignedIn }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" style={{ background: '#0a0000' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'url(/bg-setup.jpeg)',
        backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0,
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 0 }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)', zIndex: 0,
      }} />
      <style>{`
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 10px rgba(204,0,0,0.8), 0 0 30px rgba(139,0,0,0.5); }
          50%       { text-shadow: 0 0 20px rgba(255,0,0,1), 0 0 60px rgba(204,0,0,0.8); }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="text-center mb-8">
          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-5xl md:text-6xl font-cairo font-black mb-2 tracking-tight"
            style={{ color: '#CC0000', animation: 'titleGlow 2.5s ease-in-out infinite' }}
          >
            من الوحش
          </motion.h1>
          <p className="text-base font-tajawal" style={{ color: '#FF6666', textShadow: '0 0 6px rgba(204,0,0,0.5)' }}>
            سجّل الدخول للبدء
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(139,0,0,0.15), rgba(74,0,0,0.25))',
            border: '1px solid #8B0000',
            boxShadow: '0 0 15px rgba(139,0,0,0.2)',
          }}
        >
          <AuthForm onSignedIn={onSignedIn} />
        </motion.div>
      </motion.div>
    </div>
  );
}
