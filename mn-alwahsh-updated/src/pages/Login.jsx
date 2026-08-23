import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import AuthForm from '../components/game/AuthForm';
import { getCurrentUser, signOut } from '../utils/authClient';

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());

  const handleSignedIn = () => {
    setUser(getCurrentUser());
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" style={{ background: '#0a0000' }}>
      {/* Same background treatment as SetupScreen */}
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

      <button
        onClick={() => navigate('/')}
        className="fixed top-4 right-4 z-10 flex items-center gap-1 font-cairo text-sm"
        style={{ color: '#FF9999' }}
      >
        <ArrowRight className="w-4 h-4" />
        رجوع للعبة
      </button>

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
            تسجيل الدخول
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
          {user ? (
            <div className="text-center space-y-4">
              <p className="font-tajawal text-sm" style={{ color: '#FFE4E4' }}>
                مسجّل الدخول باسم
              </p>
              <p className="font-cairo font-bold" style={{ color: '#FFD700' }}>
                {user.email}
              </p>
              <button
                onClick={handleSignOut}
                className="w-full font-cairo font-bold rounded-xl py-3"
                style={{ background: 'rgba(80,0,0,0.6)', border: '1px solid #CC0000', color: '#FFE4E4' }}
              >
                تسجيل الخروج
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full font-cairo text-sm py-2"
                style={{ color: '#FF9999' }}
              >
                رجوع للعبة
              </button>
            </div>
          ) : (
            <AuthForm onSignedIn={handleSignedIn} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
