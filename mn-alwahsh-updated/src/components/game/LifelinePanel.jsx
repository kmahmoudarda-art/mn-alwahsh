import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const LIFELINES = [
  { id: 'callFriend', label: 'احذف اجابة 🗑️', desc: 'احذف إجابة خاطئة من الخيارات', phase: 'after' },
  { id: 'trap', label: 'دبل يا كبير 💰', desc: 'إجابة صح = خصم من الخصم', phase: 'before' },
  { id: 'twoAnswers', label: 'جاوب جوابين ✌️', desc: 'اختر إجابتين', phase: 'after' },
];

export default function LifelinePanel({
  teamLifelines,
  currentTeam,
  phase,
  onUseLifeline,
  disabled,
}) {
  const usedLifelines = teamLifelines[currentTeam] || {};

  return (
    <div className="flex flex-wrap justify-center gap-2 px-4" dir="rtl">
      <span className="w-full text-center text-xs font-tajawal text-muted-foreground mb-1">
        وسائل المساعدة — الفريق {currentTeam}
      </span>
      {LIFELINES.map((ll) => {
        const isUsed = usedLifelines[ll.id];
        const isAvailablePhase = ll.phase === phase;
        const canUse = !isUsed && isAvailablePhase && !disabled;

        return (
          <motion.div key={ll.id} whileHover={canUse ? { scale: 1.05 } : {}}>
            <Button
              variant={isUsed ? 'ghost' : canUse ? 'default' : 'outline'}
              size="sm"
              disabled={!canUse}
              onClick={() => onUseLifeline(ll.id)}
              className={`font-cairo text-xs md:text-sm h-auto py-2 px-3 ${
                isUsed
                  ? 'opacity-30 line-through'
                  : canUse
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'opacity-50'
              }`}
              title={ll.desc}
            >
              {ll.label}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

export { LIFELINES };