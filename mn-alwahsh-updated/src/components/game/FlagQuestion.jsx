import { motion } from 'framer-motion';

export default function FlagQuestion({ question, answered, isCorrect, selectedAnswer, onAnswer, onClose }) {
  return (
    <div className="space-y-5">
      {/* Giant flag emoji */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex flex-col items-center gap-2 py-4"
      >
        <span style={{ fontSize: '130px', lineHeight: 1 }}>{question.flag_emoji}</span>
        <p className="text-muted-foreground font-tajawal text-sm">ما اسم الدولة التي يمثلها هذا العلم؟</p>
      </motion.div>

      {/* ABCD Options */}
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(question.options).map(([key, value]) => {
          const isSelected = selectedAnswer === key;
          const isCorrectAnswer = question.correct === key;
          let btnClass = 'bg-secondary hover:bg-secondary/80 text-foreground border border-border hover:border-primary/40 cursor-pointer';

          if (answered) {
            if (isCorrectAnswer) {
              btnClass = 'bg-green-600/30 border-2 border-green-400 text-green-300 animate-correct-pulse cursor-not-allowed';
            } else if (isSelected) {
              btnClass = 'bg-red-600/30 border-2 border-red-400 text-red-300 animate-wrong-shake cursor-not-allowed';
            } else {
              btnClass = 'bg-secondary/40 text-muted-foreground border border-border opacity-50 cursor-not-allowed';
            }
          }

          return (
            <motion.button
              key={key}
              whileHover={!answered ? { scale: 1.01 } : {}}
              whileTap={!answered ? { scale: 0.99 } : {}}
              onClick={() => !answered && onAnswer(key)}
              disabled={answered}
              className={`w-full rounded-xl px-5 py-4 text-right font-cairo text-base md:text-lg transition-all duration-200 ${btnClass}`}
            >
              <span className="font-bold ml-3 text-primary">{key}.</span>
              {value}
            </motion.button>
          );
        })}
      </div>

      {/* Result */}
      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 text-center ${isCorrect ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}
        >
          <p className={`text-2xl font-cairo font-black mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? '🎉 إجابة صحيحة!' : '❌ إجابة خاطئة'}
          </p>
          <p className="text-foreground font-cairo font-bold text-lg">{question.explanation}</p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl py-3 bg-primary text-primary-foreground font-cairo font-bold hover:bg-primary/90 transition-colors"
          >
            متابعة
          </button>
        </motion.div>
      )}
    </div>
  );
}