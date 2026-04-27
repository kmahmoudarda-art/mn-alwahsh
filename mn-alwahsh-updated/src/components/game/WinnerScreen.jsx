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
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
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
          <Trophy className="w-24 h-24 text-primary mx-auto mb-6" />
        </motion.div>

        {isTie ? (
          <h1 className="text-5xl md:text-6xl font-cairo font-black text-primary mb-4">تعادل!</h1>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl font-cairo font-black text-primary mb-2">
              🏆 الفائز 🏆
            </h1>
            <h2 className="text-5xl md:text-6xl font-cairo font-black text-foreground mb-4">
              {winner.name}
            </h2>
          </>
        )}

        <div className="flex justify-center gap-8 my-8">
          <ScoreCard name={team1.name} score={team1.score} isWinner={!isTie && winner === team1} />
          <div className="text-primary font-cairo font-bold text-3xl self-center">VS</div>
          <ScoreCard name={team2.name} score={team2.score} isWinner={!isTie && winner === team2} />
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onPlayAgain}
            className="text-xl font-cairo font-bold px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-3"
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
      className={`rounded-2xl px-6 py-4 ${
        isWinner
          ? 'bg-primary/20 border-2 border-primary'
          : 'bg-card border border-border'
      }`}
    >
      <p className="text-sm font-tajawal text-muted-foreground">{name}</p>
      <p className={`text-4xl font-cairo font-black ${isWinner ? 'text-primary' : 'text-foreground/70'}`}>
        {score}
      </p>
    </motion.div>
  );
}