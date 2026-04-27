import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CategoryPicker from './CategoryPicker';

export default function SetupScreen({ onStartGame }) {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team1Categories, setTeam1Categories] = useState([]);
  const [team2Categories, setTeam2Categories] = useState([]);

  const toggleCategory = (team, name) => {
    const setter = team === 1 ? setTeam1Categories : setTeam2Categories;
    const current = team === 1 ? team1Categories : team2Categories;
    if (current.includes(name)) {
      setter(current.filter(c => c !== name));
    } else if (current.length < 3) {
      setter([...current, name]);
    }
  };

  const isValid = team1Name.trim() && team2Name.trim() &&
    team1Categories.length === 3 && team2Categories.length === 3;

  const handleStart = () => {
    if (!isValid) return;
    onStartGame({
      team1: { name: team1Name.trim(), categories: team1Categories },
      team2: { name: team2Name.trim(), categories: team2Categories },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-10">
          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-6xl md:text-8xl font-cairo font-black text-primary mb-2 tracking-tight"
          >
            من الوحش
          </motion.h1>
          <p className="text-muted-foreground text-lg font-tajawal">لعبة المعرفة والتحدي</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TeamSetupCard
            teamNumber={1}
            teamName={team1Name}
            onNameChange={setTeam1Name}
            categories={team1Categories}
            onToggle={(name) => toggleCategory(1, name)}
            color="from-blue-600/20 to-blue-900/20"
            borderColor="border-blue-500/30"
          />
          <TeamSetupCard
            teamNumber={2}
            teamName={team2Name}
            onNameChange={setTeam2Name}
            categories={team2Categories}
            onToggle={(name) => toggleCategory(2, name)}
            color="from-red-600/20 to-red-900/20"
            borderColor="border-red-500/30"
          />
        </div>

        <motion.div
          className="flex justify-center"
          whileHover={{ scale: isValid ? 1.02 : 1 }}
          whileTap={{ scale: isValid ? 0.98 : 1 }}
        >
          <Button
            onClick={handleStart}
            disabled={!isValid}
            className="text-xl font-cairo font-bold px-12 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-3 disabled:opacity-40"
            size="lg"
          >
            <Play className="w-6 h-6" />
            ابدأ اللعبة
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function TeamSetupCard({ teamNumber, teamName, onNameChange, categories, onToggle, color, borderColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: teamNumber === 1 ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + teamNumber * 0.1 }}
      className={`bg-gradient-to-b ${color} border ${borderColor} rounded-2xl p-4 backdrop-blur-sm`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-cairo font-bold text-foreground">الفريق {teamNumber}</h2>
      </div>

      <Input
        placeholder={`اسم الفريق ${teamNumber}`}
        value={teamName}
        onChange={(e) => onNameChange(e.target.value)}
        className="mb-3 bg-background/50 border-border text-foreground font-cairo text-base h-12 placeholder:text-muted-foreground"
      />

      <p className="text-xs font-tajawal text-muted-foreground mb-2">
        اختر ٣ فئات ({categories.length}/3)
      </p>
      <CategoryPicker selected={categories} onToggle={onToggle} max={3} />
    </motion.div>
  );
}