import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const sections = [
  {
    emoji: '🎯',
    title: 'الهدف',
    text: 'فريقان يتنافسان على تجميع أكبر قدر من النقاط عبر الإجابة على أسئلة من فئات مختلفة. الفريق الذي يجمع أكثر النقاط في نهاية اللعبة يفوز!',
  },
  {
    emoji: '🏁',
    title: 'بداية اللعبة',
    text: 'كل فريق يختار اسمه و٣ فئات من الأسئلة التي يريد اللعب بها. الفئات الست المختارة (٣ لكل فريق) تشكّل لوحة اللعبة.',
  },
  {
    emoji: '🎲',
    title: 'اللوحة والنقاط',
    text: 'اللوحة تحتوي على ٦ فئات × ٦ خلايا. كل فئة تحتوي على ٣ مستويات نقاط: ٢٠٠ و٤٠٠ و٦٠٠. الفريق الذي دوره يختار خلية ويجيب على سؤالها.',
  },
  {
    emoji: '⏱️',
    title: 'الوقت والسرقة',
    text: 'عند ظهور السؤال يبدأ عداد ٣٠ ثانية. إذا لم يجب الفريق بشكل صحيح أو انتهى الوقت، ينتقل السؤال للفريق الآخر الذي يملك ١٠ ثوانٍ لسرقة النقاط!',
  },
  {
    emoji: '💡',
    title: 'وسائل المساعدة',
    text: [
      '🗑️ احذف إجابة — يحذف خياراً خاطئاً من الأجوبة.',
      '✌️ جاوب جوابين — يمكنك اختيار إجابتين.',
      '💰 دبل يا كبير — إذا أجبت صح، يُخصم من الخصم نفس النقاط. تُستخدم قبل رؤية السؤال.',
    ],
  },
  {
    emoji: '🔄',
    title: 'تغيير السؤال',
    text: 'يمكنك تغيير السؤال المكرر أو الذي تعرفه بالضغط على "تغيير سؤال مكرر" — بدون حد!',
  },
  {
    emoji: '🌟',
    title: 'النقطة المضاعفة',
    text: 'عندما تتبقى ٥ خلايا في اللعبة، يتم اختيار خلية عشوائية سرية للفريق المتأخر. إذا أجاب عليها صح، تُضاعف نقاطها! فرصة الفريق المتأخر للعودة.',
  },
  {
    emoji: '🃏',
    title: 'البطاقات الخاصة',
    text: 'كل فريق يملك بطاقة "حظ مضاعف" وبطاقة "ضغط الوقت". بطاقة الحظ تسرق أو تخسر نقاطاً بشكل عشوائي. بطاقة الضغط تخفض وقت الفريق الآخر لـ١٥ ثانية.',
  },
  {
    emoji: '🏆',
    title: 'الفوز',
    text: 'بعد الإجابة على جميع الخلايا الـ٣٦، يُعلن الفائز بناءً على النقاط. في حال التعادل يفوز الفريق الأكثر إثارةً! 😄',
  },
];

export default function InstructionManual({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-cairo font-black text-xl text-primary">📖 كيف تلعب "من الوحش"؟</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {sections.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-muted/50 rounded-xl p-4"
            >
              <h3 className="font-cairo font-bold text-base text-foreground mb-1">
                {s.emoji} {s.title}
              </h3>
              {Array.isArray(s.text) ? (
                <ul className="space-y-1">
                  {s.text.map((line, j) => (
                    <li key={j} className="font-tajawal text-sm text-muted-foreground">{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="font-tajawal text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-cairo font-bold text-base hover:bg-primary/90 transition-colors"
          >
            فهمت، هيا نلعب! 🎮
          </button>
        </div>
      </motion.div>
    </div>
  );
}