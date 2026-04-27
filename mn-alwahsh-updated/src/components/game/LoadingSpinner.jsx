import { motion } from 'framer-motion';

const messages = [
  "جاري البحث في ويكيبيديا... 🔍",
  "نسألها الموسوعة... 📚",
  "Searching the knowledge base... 🌐",
  "جاري التفكير... 🤔",
  "نجهّز السؤال... 📝",
];

export default function LoadingSpinner() {
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-4 py-12"
    >
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
      </div>
      <p className="text-xl font-cairo text-primary font-bold">{msg}</p>
    </motion.div>
  );
}