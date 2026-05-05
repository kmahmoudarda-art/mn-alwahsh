import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export default function WinnerScreen({ team1, team2, onPlayAgain }) {
  const winner = team1.score > team2.score ? team1 : team2.score > team1.score ? team2 : null;
  const isTie = team1.score === team2.score;

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#CC0000', '#8B0000', '#FF0000', '#FF6666'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#CC0000', '#8B0000', '#FF0000', '#FF6666'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: '#0a0000' }}
    >
      <style>{`
        @keyframes winnerPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(204,0,0,0.5), 0 0 40px rgba(139,0,0,0.3); }
          50%       { box-shadow: 0 0 40px rgba(255,0,0,0.8), 0 0 80px rgba(204,0,0,0.5); }
        }
        @keyframes trophyGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(204,0,0,0.7)); }
          50%       { filter: drop-shadow(0 0 20px rgba(255,0,0,1)); }
        }
        @keyframes titleShine {
          0%, 100% { text-shadow: 0 0 10px rgba(204,0,0,0.8); }
          50%       { text-shadow: 0 0 30px rgba(255,0,0,1), 0 0 60px rgba(204,0,0,0.6); }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="text-center max-w-lg w-full"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          <Trophy
            className="w-24 h-24 mx-auto mb-6"
            style={{ color: '#CC0000', animation: 'trophyGlow 2s ease-in-out infinite' }}
          />
        </motion.div>

        {isTie ? (
          <h1
            className="text-5xl md:text-6xl font-cairo font-black mb-4"
            style={{ color: '#CC0000', animation: 'titleShine 2s ease-in-out infinite' }}
          >
            تعادل!
          </h1>
        ) : (
          <>
            <h1
              className="text-4xl md:text-5xl font-cairo font-black mb-2"
              style={{ color: '#CC0000', animation: 'titleShine 2s ease-in-out infinite' }}
            >
              🏆 الفائز 🏆
            </h1>
            <h2
              className="text-5xl md:text-6xl font-cairo font-black mb-4"
              style={{ color: '#FFE4E4', textShadow: '0 0 15px rgba(204,0,0,0.5)' }}
            >
              {winner.name}
            </h2>
          </>
        )}

        <div className="flex justify-center gap-8 my-8">
          <ScoreCard name={team1.name} score={team1.score} isWinner={!isTie && winner === team1} />
          <div
            className="font-cairo font-bold text-3xl self-center"
            style={{ color: '#CC0000', textShadow: '0 0 10px rgba(204,0,0,0.7)' }}
          >
            VS
          </div>
          <ScoreCard name={team2.name} score={team2.score} isWinner={!isTie && winner === team2} />
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onPlayAgain}
            className="text-xl font-cairo font-bold px-10 py-6 rounded-xl gap-3 transition-all"
            style={{
              background: 'linear-gradient(135deg, #8B0000, #4a0000)',
              color: '#FFE4E4',
              border: '1px solid #CC0000',
              boxShadow: '0 0 20px rgba(139,0,0,0.6)',
            }}
            size="lg"
          >
            <RotateCcw className="w-6 h-6" />
            العب مرة ثانية
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ScoreCard({ name, score, isWinner }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl px-6 py-4"
      style={
        isWinner
          ? {
              background: 'linear-gradient(135deg, rgba(139,0,0,0.4), rgba(74,0,0,0.6))',
              border: '2px solid #CC0000',
              animation: 'winnerPulse 1.5s ease-in-out infinite',
            }
          : {
              background: '#1a0000',
              border: '1px solid #4a0000',
            }
      }
    >
      <p className="text-sm font-tajawal" style={{ color: '#FF6666' }}>{name}</p>
      <p
        className="text-4xl font-cairo font-black"
        style={{ color: isWinner ? '#FFE4E4' : 'rgba(255,200,200,0.5)', textShadow: isWinner ? '0 0 10px rgba(204,0,0,0.5)' : 'none' }}
      >
        {score}
      </p>
    </motion.div>
  );
}
