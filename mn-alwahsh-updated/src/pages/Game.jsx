import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut } from 'lucide-react';

import { AnimatePresence } from 'framer-motion';
import { generateQuestion, resetQuestionCache, prefetchWikipedia, pregenerateAllTiles } from '../utils/questionGenerator';
import { saveSession, loadSession, clearSession } from '../utils/sessionStore';
import { sounds } from '../utils/soundEffects';
import SetupScreen from '../components/game/SetupScreen';
import ScoreBar from '../components/game/ScoreBar';
import GameBoard from '../components/game/GameBoard';
import QuestionModal from '../components/game/QuestionModal';
import WinnerScreen from '../components/game/WinnerScreen';
import SpecialCards from '../components/game/SpecialCards';
import GameNameScreen from '../components/game/GameNameScreen';
import LuckyDoublePopup from '../components/game/LuckyDoublePopup';

const TOTAL_TILES = 36;
const POINT_VALUES = [200, 400, 600];

export default function Game() {
  const [gameName, setGameName] = useState(null);

  const [gamePhase, setGamePhase] = useState('setup');
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState({ 1: { name: '', score: 0, scoreKey: 0 }, 2: { name: '', score: 0, scoreKey: 0 } });
  const [currentTeam, setCurrentTeam] = useState(1);
  const [answeredTiles, setAnsweredTiles] = useState(new Set());
  const [teamLifelines, setTeamLifelines] = useState({ 1: {}, 2: {} });
  const [readyTiles, setReadyTiles] = useState(new Set());

  // Question modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState('lifeline-before');
  const [currentTile, setCurrentTile] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [activeLifeline, setActiveLifeline] = useState(null);
  const [friendHint, setFriendHint] = useState(null);
  const [friendHintLoading, setFriendHintLoading] = useState(false);
  const [restTarget, setRestTarget] = useState(null);
  const [twoAnswersMode, setTwoAnswersMode] = useState(false);
  const [firstWrongAnswer, setFirstWrongAnswer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [stealMode, setStealMode] = useState(false);
  const [usedLucky, setUsedLucky] = useState({ 1: false, 2: false });
  const [usedQuickTimer, setUsedQuickTimer] = useState({ 1: false, 2: false });
  const [usedPassToOther, setUsedPassToOther] = useState({ 1: false, 2: false });
  const [quickTimerActiveFor, setQuickTimerActiveFor] = useState(null);
  const timerRef = useRef(null);
  const usedAnswersRef = useRef({});

  // Lucky Double state
  const [luckyCell, setLuckyCell] = useState(() => {
    try { const s = sessionStorage.getItem('luckyCell'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [luckyDoubleActive, setLuckyDoubleActive] = useState(false); // true when current tile is lucky for losing team
  const [showLuckyPopup, setShowLuckyPopup] = useState(false);
  const [luckyUsed, setLuckyUsed] = useState(false);

  const startTimer = useCallback((seconds) => {
    setTimerSeconds(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimerSeconds(null);
  }, []);



  // When timer hits 0 in normal mode, switch to steal mode
  useEffect(() => {
    if (timerSeconds === 0 && !stealMode && modalOpen && !answered) {
      setStealMode(true);
      startTimer(10);
    }
  }, [timerSeconds, stealMode, modalOpen, answered, startTimer]);

  // When steal timer hits 0, auto-close
  useEffect(() => {
    if (timerSeconds === 0 && stealMode && modalOpen && !answered) {
      stopTimer();
      setTimeout(() => {
        setCurrentTile(prev => {
          if (prev) {
            const tileKey = `${prev.colIndex}-${prev.rowIndex}`;
            setAnsweredTiles(p => new Set([...p, tileKey]));
          }
          return prev;
        });
        setCurrentTeam(p => (p === 1 ? 2 : 1));
        setModalOpen(false);
        setStealMode(false);
      }, 800);
    }
  }, [timerSeconds, stealMode, modalOpen, answered, stopTimer]);

  // Activate lucky double when 5 cells remain
  useEffect(() => {
    if (luckyUsed || luckyCell || gamePhase !== 'playing') return;
    const remaining = TOTAL_TILES - answeredTiles.size;
    if (remaining !== 5) return;
    // Identify losing team
    const t1 = teams[1].score, t2 = teams[2].score;
    if (t1 === t2) return; // tied — no lucky double
    const losingTeamNum = t1 < t2 ? 1 : 2;
    // Find unanswered cells
    const unanswered = [];
    for (let col = 0; col < categories.length; col++) {
      for (let row = 0; row < 6; row++) {
        const key = `${col}-${row}`;
        if (!answeredTiles.has(key)) unanswered.push({ col, row });
      }
    }
    if (!unanswered.length) return;
    const picked = unanswered[Math.floor(Math.random() * unanswered.length)];
    const cell = { col: picked.col, row: picked.row, losingTeam: losingTeamNum };
    setLuckyCell(cell);
    try { sessionStorage.setItem('luckyCell', JSON.stringify(cell)); } catch {}
    console.log('[LuckyDouble] Assigned lucky cell:', cell);
  }, [answeredTiles.size, gamePhase]);

  // Early game-end: impossible to win for the losing team
  useEffect(() => {
    if (gamePhase !== 'playing' || categories.length === 0) return;
    const s1 = teams[1].score, s2 = teams[2].score;
    if (s1 === s2) return; // tied — no early end
    const leaderTeam = s1 > s2 ? 1 : 2;
    const loserTeam  = leaderTeam === 1 ? 2 : 1;
    const deficit    = teams[leaderTeam].score - teams[loserTeam].score;

    // Sum all remaining tile points (row determines value: 0-1→200, 2-3→400, 4-5→600)
    let remainingPoints = 0;
    for (let col = 0; col < categories.length; col++) {
      for (let row = 0; row < 6; row++) {
        if (!answeredTiles.has(`${col}-${row}`)) {
          remainingPoints += POINT_VALUES[Math.floor(row / 2)];
        }
      }
    }
    if (remainingPoints === 0) return; // board done — normal handler finishes it

    // Max luck-card bonus for loser (positive doubleLuck max = 400)
    const maxLuckCardBonus = usedLucky[loserTeam] ? 0 : 400;

    // Max lucky-double bonus: doubles one tile (max extra = 600)
    const maxLuckyDoubleBonus = luckyUsed ? 0
      : luckyCell !== null ? (luckyCell.losingTeam === loserTeam ? 600 : 0)
      : 600; // not yet assigned — could still go to loserTeam

    const maxPossible = remainingPoints + maxLuckCardBonus + maxLuckyDoubleBonus;

    if (maxPossible < deficit) {
      setGamePhase('finished');
    }
  }, [teams, answeredTiles, usedLucky, luckyCell, luckyUsed, gamePhase, categories]);

  // Persist game state on meaningful changes
  useEffect(() => {
    if (!gameName || gamePhase !== 'playing') return;
    saveSession(gameName, {
      gamePhase,
      categories,
      teams,
      currentTeam,
      answeredTiles: Array.from(answeredTiles),
      teamLifelines,
      usedLucky,
      usedQuickTimer,
    });
  }, [gameName, gamePhase, categories, teams, currentTeam, answeredTiles, teamLifelines, usedLucky, usedQuickTimer]);

  // Pre-generate all questions silently in background
  const startPregeneration = useCallback((allCategories) => {
    setReadyTiles(new Set());
    prefetchWikipedia(allCategories).then(() => {
      pregenerateAllTiles(allCategories, POINT_VALUES, (cat, pts) => {
        const colIdx = allCategories.indexOf(cat);
        const ptIdx = POINT_VALUES.indexOf(pts);
        if (colIdx !== -1 && ptIdx !== -1) {
          // Each point value covers 2 display rows: ptIdx*2 and ptIdx*2+1
          setReadyTiles(prev => new Set([
            ...prev,
            `${colIdx}-${ptIdx * 2}`,
            `${colIdx}-${ptIdx * 2 + 1}`,
          ]));
        }
      });
    });
  }, []);

  const handleStartGame = useCallback((setup) => {
    const allCategories = [...setup.team1.categories, ...setup.team2.categories];
    setCategories(allCategories);
    setTeams({
      1: { name: setup.team1.name, score: 0, scoreKey: 0 },
      2: { name: setup.team2.name, score: 0, scoreKey: 0 },
    });
    setCurrentTeam(1);
    setAnsweredTiles(new Set());
    setTeamLifelines({ 1: {}, 2: {} });
    setUsedLucky({ 1: false, 2: false });
    setUsedQuickTimer({ 1: false, 2: false });
    setQuickTimerActiveFor(null);
    usedAnswersRef.current = {};
    setGamePhase('playing');
    startPregeneration(allCategories);
  }, [startPregeneration]);

  const getQuestion = useCallback(async (category, points) => {
    const prevAnswers = usedAnswersRef.current[category] || [];
    const res = await generateQuestion(category, points, prevAnswers);
    if (res?.correct && res?.options?.[res.correct]) {
      usedAnswersRef.current[category] = [
        ...(usedAnswersRef.current[category] || []),
        res.options[res.correct],
      ];
    }
    return res;
  }, []);

  const generateFriendHint = useCallback(async (question, correct) => {
    // Return a wrong answer key to eliminate
    const wrongKeys = Object.keys(question.options || {}).filter(k => k !== correct);
    const keyToEliminate = wrongKeys[Math.floor(Math.random() * wrongKeys.length)];
    return keyToEliminate;
  }, []);

  const handleTileClick = useCallback((colIndex, rowIndex, category, points) => {
    sounds.tileClick();
    // Reset viewport zoom immediately before modal renders
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no');
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setCurrentTile({ colIndex, rowIndex, category, points });
    setCurrentQuestion(null);
    setAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(false);
    setActiveLifeline(null);
    setFriendHint(null);
    setFriendHintLoading(false);
    setRestTarget(null);
    setTwoAnswersMode(false);
    setFirstWrongAnswer(null);
    setLoading(false);
    setModalPhase('lifeline-before');
    setStealMode(false);
    stopTimer();

    // Check if this is the lucky cell for the losing team
    const isLucky = !luckyUsed && luckyCell &&
      luckyCell.col === colIndex && luckyCell.row === rowIndex &&
      luckyCell.losingTeam === currentTeam;
    setLuckyDoubleActive(isLucky);

    if (isLucky) {
      // Show popup first, then open modal after 4s
      setShowLuckyPopup(true);
      setTimeout(() => {
        setShowLuckyPopup(false);
        sounds.modalOpen();
        setModalOpen(true);
      }, 4000);
    } else {
      sounds.modalOpen();
      setModalOpen(true);
    }
  }, [stopTimer, luckyCell, luckyUsed, currentTeam]);

  const loadQuestion = useCallback(async () => {
    if (!currentTile) return;
    setLoading(true);
    setModalPhase('loading');
    const q = await getQuestion(currentTile.category, currentTile.points);
    setLoading(false);
    if (!q) {
      // No questions in bank for this category — skip tile without giving points
      const tileKey = `${currentTile.colIndex}-${currentTile.rowIndex}`;
      setAnsweredTiles(prev => new Set([...prev, tileKey]));
      setCurrentTeam(prev => (prev === 1 ? 2 : 1));
      setModalOpen(false);
      setModalPhase('lifeline-before');
      return;
    }
    setCurrentQuestion(q);
    setModalPhase('question');
    const timerDuration = quickTimerActiveFor !== null ? 15 : 30;
    setQuickTimerActiveFor(null);
    // If استريح lifeline was used, immediately enter steal mode so the other team answers
    setActiveLifeline(prev => {
      if (prev === 'rest') {
        setStealMode(true);
        startTimer(timerDuration);
      } else {
        startTimer(timerDuration);
      }
      return prev;
    });
  }, [currentTile, getQuestion, startTimer, quickTimerActiveFor]);

  const handleUseLifeline = useCallback((lifelineId) => {
    setTeamLifelines(prev => ({
      ...prev,
      [currentTeam]: { ...prev[currentTeam], [lifelineId]: true },
    }));
    setActiveLifeline(lifelineId);

    if (lifelineId === 'callFriend') {
      if (currentQuestion) {
        setFriendHintLoading(true);
        generateFriendHint(currentQuestion, currentQuestion.correct).then(hint => {
          setFriendHint(hint);
          setFriendHintLoading(false);
        });
      }
    } else if (lifelineId === 'twoAnswers') {
      setTwoAnswersMode(true);
    }
  }, [currentTeam, currentQuestion, generateFriendHint]);

  const handleRestSubmit = useCallback((playerName) => {
    setRestTarget(playerName);
  }, []);

  const handleAnswer = useCallback((key) => {
    if (!currentQuestion || !currentTile) return;

    const correct = key === currentQuestion.correct;

    if (twoAnswersMode && !correct && !firstWrongAnswer) {
      setFirstWrongAnswer(key);
      return;
    }

    if (!correct && !stealMode) {
      stopTimer();
      setFirstWrongAnswer(key);
      setStealMode(true);
      startTimer(10);
      return;
    }

    stopTimer();
    setSelectedAnswer(key);
    setIsCorrect(correct);
    setAnswered(true);

    if (correct) {
      sounds.correct();
    } else {
      sounds.wrong();
    }

    const rawPts = currentTile.points;
    const scoringTeam = stealMode ? (currentTeam === 1 ? 2 : 1) : currentTeam;
    // Apply lucky double only when the losing team (non-steal) answers correctly
    const isLuckyScore = luckyDoubleActive && !stealMode && correct;
    const pts = isLuckyScore ? rawPts * 2 : rawPts;

    if (isLuckyScore) {
      setLuckyUsed(true);
      setLuckyCell(null);
      try { sessionStorage.removeItem('luckyCell'); } catch {}
    }

    if (correct) {
      setTeams(prev => ({
        ...prev,
        [scoringTeam]: {
          ...prev[scoringTeam],
          score: prev[scoringTeam].score + pts,
          scoreKey: prev[scoringTeam].scoreKey + 1,
        },
      }));

      if (activeLifeline === 'trap' && !stealMode) {
        const opponent = currentTeam === 1 ? 2 : 1;
        setTeams(prev => ({
          ...prev,
          [opponent]: {
            ...prev[opponent],
            score: prev[opponent].score - rawPts,
            scoreKey: prev[opponent].scoreKey + 1,
          },
        }));
      }
    }
  }, [currentQuestion, currentTile, currentTeam, activeLifeline, twoAnswersMode, firstWrongAnswer, stealMode, stopTimer, startTimer, luckyDoubleActive]);

  const handleLuckyResult = useCallback((teamNum, delta) => {
    sounds.lucky();
    setUsedLucky(prev => ({ ...prev, [teamNum]: true }));
    const opponent = teamNum === 1 ? 2 : 1;
    if (delta > 0) {
      // steal from opponent
      setTeams(prev => ({
        ...prev,
        [teamNum]: { ...prev[teamNum], score: prev[teamNum].score + delta, scoreKey: prev[teamNum].scoreKey + 1 },
        [opponent]: { ...prev[opponent], score: prev[opponent].score - delta, scoreKey: prev[opponent].scoreKey + 1 },
      }));
    } else {
      // lose points to opponent
      const loss = Math.abs(delta);
      setTeams(prev => ({
        ...prev,
        [teamNum]: { ...prev[teamNum], score: prev[teamNum].score - loss, scoreKey: prev[teamNum].scoreKey + 1 },
        [opponent]: { ...prev[opponent], score: prev[opponent].score + loss, scoreKey: prev[opponent].scoreKey + 1 },
      }));
    }
  }, []);

  const handleQuickTimer = useCallback((teamNum) => {
    setUsedQuickTimer(prev => ({ ...prev, [teamNum]: true }));
    setQuickTimerActiveFor(teamNum);
  }, []);

  const handleAdjustScore = useCallback((teamNum, delta) => {
    setTeams(prev => ({
      ...prev,
      [teamNum]: {
        ...prev[teamNum],
        score: prev[teamNum].score + delta,
        scoreKey: prev[teamNum].scoreKey + 1,
      },
    }));
  }, []);

  const handlePassToOther = useCallback(() => {
    setUsedPassToOther(prev => ({ ...prev, [currentTeam]: true }));
    stopTimer();
    setStealMode(true);
    startTimer(10);
  }, [stopTimer, startTimer, currentTeam]);

  const handleCloseModal = useCallback(() => {
    if (modalPhase === 'lifeline-before') {
      loadQuestion();
      return;
    }

    if (!answered && modalPhase === 'question') {
      // Close button pressed before answering - reset tile and return question
      stopTimer();
      setModalOpen(false);
      setStealMode(false);
      setModalPhase('lifeline-before');
      return;
    }

    stopTimer();
    if (currentTile) {
      const tileKey = `${currentTile.colIndex}-${currentTile.rowIndex}`;
      setAnsweredTiles(prev => new Set([...prev, tileKey]));
    }

    setCurrentTeam(prev => (prev === 1 ? 2 : 1));
    setStealMode(false);
    setModalOpen(false);

    if (answeredTiles.size + 1 >= TOTAL_TILES) {
      setGamePhase('finished');
    }
  }, [modalPhase, answered, currentTile, answeredTiles, loadQuestion, stopTimer]);

  const handlePlayAgain = useCallback(() => {
    resetQuestionCache();
    usedAnswersRef.current = {};
    if (gameName) clearSession(gameName);
    try { sessionStorage.removeItem('luckyCell'); } catch {}
    setLuckyCell(null);
    setLuckyUsed(false);
    setLuckyDoubleActive(false);
    setShowLuckyPopup(false);
    setGameName(null);
    setReadyTiles(new Set());
    setGamePhase('setup');
    setCategories([]);
    setTeams({ 1: { name: '', score: 0, scoreKey: 0 }, 2: { name: '', score: 0, scoreKey: 0 } });
    setCurrentTeam(1);
    setAnsweredTiles(new Set());
    setTeamLifelines({ 1: {}, 2: {} });
    setUsedLucky({ 1: false, 2: false });
    setUsedQuickTimer({ 1: false, 2: false });
    setUsedPassToOther({ 1: false, 2: false });
    setQuickTimerActiveFor(null);
  }, [gameName]);



  // Zoom state
  const [zoom, setZoom] = useState(1);

  // Pull-to-refresh
  const pullStartY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    // Block swipe-back gesture (horizontal swipe from edge)
    const touch = e.touches[0];
    if (touch.clientX < 30 || touch.clientX > window.innerWidth - 30) {
      e.preventDefault();
    }
    if (window.scrollY === 0) pullStartY.current = touch.clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (pullStartY.current === null) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0) {
      e.preventDefault();
      setPulling(true);
      setPullProgress(Math.min(delta, PULL_THRESHOLD));
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (pullProgress >= PULL_THRESHOLD) {
      handlePlayAgain();
    }
    pullStartY.current = null;
    setPulling(false);
    setPullProgress(0);
  }, [pullProgress, handlePlayAgain]);

  const handleEnterGameName = useCallback(async (name) => {
    setGameName(name);
    const existing = await loadSession(name);
    if (existing?.gamePhase) {
      setGamePhase(existing.gamePhase);
      if (existing.categories) setCategories(existing.categories);
      if (existing.teams) setTeams(existing.teams);
      if (existing.currentTeam) setCurrentTeam(existing.currentTeam);
      if (existing.answeredTiles) setAnsweredTiles(new Set(existing.answeredTiles));
      if (existing.teamLifelines) setTeamLifelines(existing.teamLifelines);
      if (existing.usedLucky) setUsedLucky(existing.usedLucky);
      if (existing.usedQuickTimer) setUsedQuickTimer(existing.usedQuickTimer);
      if (existing.gamePhase === 'playing' && existing.categories?.length > 0) {
        startPregeneration(existing.categories);
      }
    }
  }, [startPregeneration]);

  if (!gameName) {
    return <GameNameScreen onEnter={handleEnterGameName} />;
  }

  if (gamePhase === 'setup') {
    return <SetupScreen onStartGame={handleStartGame} />;
  }

  if (gamePhase === 'finished') {
    return (
      <WinnerScreen
        team1={teams[1]}
        team2={teams[2]}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#050000' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Full-screen horror image background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: '#050000', zIndex: 0 }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'url(/bg-game-horror.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'rgba(0,0,0,0.45)',
        zIndex: 0,
      }} />

      {/* ── Subtle horror atmosphere ── */}
      <style>{`
        @keyframes skullFloat {
          0%,100% { transform: translateY(0) rotate(-4deg); opacity:0.18; }
          50%      { transform: translateY(-10px) rotate(4deg); opacity:0.28; }
        }
        @keyframes fogPulse {
          0%,100% { opacity: 0.12; }
          50%      { opacity: 0.22; }
        }
      `}</style>

      {/* ── Fixed side score columns ── */}
      {(() => {
        const s1 = teams[1].score, s2 = teams[2].score;
        const tied = s1 === s2;
        const color1 = tied ? '#ffffff' : s1 > s2 ? '#22c55e' : '#ef4444';
        const color2 = tied ? '#ffffff' : s2 > s1 ? '#22c55e' : '#ef4444';
        const border1 = tied ? 'rgba(255,255,255,0.15)' : s1 > s2 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';
        const border2 = tied ? 'rgba(255,255,255,0.15)' : s2 > s1 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';
        const colStyle = (color, border) => ({
          position: 'fixed', top: 0, bottom: 0, width: 52,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'rgba(0,0,0,0.55)', borderWidth: 0,
          borderStyle: 'solid', borderColor: border,
          zIndex: 15, pointerEvents: 'none', backdropFilter: 'blur(4px)',
        });
        const nameStyle = {
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 12,
          color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
          maxHeight: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        };
        const scoreStyle = (color) => ({
          fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 22,
          color, textShadow: `0 0 10px ${color}88`, lineHeight: 1, textAlign: 'center',
        });
        return (
          <>
            {/* Right edge — Team 1 */}
            <div style={{ ...colStyle(color1, border1), right: 0, borderLeftWidth: 2 }}>
              <span style={nameStyle}>{teams[1].name}</span>
              <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <span style={scoreStyle(color1)}>{s1}</span>
              {s1 > s2 && !tied && <span style={{ fontSize: 16 }}>🏆</span>}
            </div>
            {/* Left edge — Team 2 */}
            <div style={{ ...colStyle(color2, border2), left: 0, borderRightWidth: 2 }}>
              <span style={{ ...nameStyle, writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>{teams[2].name}</span>
              <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <span style={scoreStyle(color2)}>{s2}</span>
              {s2 > s1 && !tied && <span style={{ fontSize: 16 }}>🏆</span>}
            </div>
          </>
        );
      })()}

      {/* Floating skull decorations */}
      <div className="fixed pointer-events-none select-none" style={{ left: '8%', top: '28%', fontSize: 36, animation: 'skullFloat 5s ease-in-out infinite', zIndex: 2 }}>💀</div>
      <div className="fixed pointer-events-none select-none" style={{ right: '8%', top: '38%', fontSize: 30, animation: 'skullFloat 6s ease-in-out infinite 1.2s', zIndex: 2 }}>💀</div>

      {/* Dark bottom fog */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{
        height: '20vh',
        background: 'linear-gradient(to top, rgba(60,0,0,0.25) 0%, transparent 100%)',
        animation: 'fogPulse 5s ease-in-out infinite',
        zIndex: 2,
      }} />

      {pulling && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all"
          style={{ height: pullProgress, background: 'rgba(139,0,0,0.2)' }}>
          <span className="font-cairo text-sm" style={{ color: '#FF6666' }}>
            {pullProgress >= PULL_THRESHOLD ? '↑ أفلت للإعادة' : '↓ اسحب للإعادة'}
          </span>
        </div>
      )}

      {showLuckyPopup && <LuckyDoublePopup teamName={luckyCell ? teams[luckyCell.losingTeam]?.name : ''} />}

      <ScoreBar team1={teams[1]} team2={teams[2]} currentTeam={currentTeam} onAdjust={handleAdjustScore} onBack={handlePlayAgain} />

      <SpecialCards
        team1={teams[1]}
        team2={teams[2]}
        currentTeam={currentTeam}
        usedLucky={usedLucky}
        usedQuickTimer={usedQuickTimer}
        onLuckyResult={handleLuckyResult}
        onQuickTimer={handleQuickTimer}
      />

      {/* Zoom controls */}
      <div
        className="flex items-center justify-center gap-3 py-2"
        style={{ transform: `scale(${1 / zoom})`, position: 'relative', zIndex: 5 }}
      >
        <button
          onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(139,0,0,0.3)', color: '#FF6666', border: '1px solid #4a0000' }}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <input
          type="range" min="0.5" max="1.5" step="0.05" value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-32 accent-primary"
        />
        <button
          onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(139,0,0,0.3)', color: '#FF6666', border: '1px solid #4a0000' }}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-cairo w-10 text-center" style={{ color: '#FF6666' }}>{Math.round(zoom * 100)}%</span>
      </div>

      <div
        className="flex-1 py-4 overflow-auto relative"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', zIndex: 5 }}
      >
        <GameBoard
          categories={categories}
          answeredTiles={answeredTiles}
          onTileClick={handleTileClick}
          teamNames={[teams[1].name, teams[2].name]}
          readyTiles={readyTiles}
        />
      </div>

      {/* Modal rendered via portal to document.body to escape the zoom transform stacking context */}
      {modalOpen && createPortal(
        <AnimatePresence>
          <QuestionModal
            question={currentQuestion}
            loading={loading}
            category={currentTile?.category}
            points={currentTile?.points}
            currentTeam={currentTeam}
            teamNames={[teams[1].name, teams[2].name]}
            stealMode={stealMode}
            onPassToOther={handlePassToOther}
            timerSeconds={timerSeconds}
            teamLifelines={teamLifelines}
            activeLifeline={activeLifeline}
            friendHint={friendHint}
            friendHintLoading={friendHintLoading}
            restTarget={restTarget}
            onAnswer={handleAnswer}
            onUseLifeline={handleUseLifeline}
            onRestSubmit={handleRestSubmit}
            onClose={handleCloseModal}
            answered={answered}
            selectedAnswer={selectedAnswer}
            isCorrect={isCorrect}
            twoAnswersMode={twoAnswersMode}
            firstWrongAnswer={firstWrongAnswer}
            luckyDoubleActive={luckyDoubleActive}
            passToOtherUsed={usedPassToOther[currentTeam]}
            onQuestionSwapped={(newQ) => setCurrentQuestion(newQ)}
            onResetTimer={() => startTimer(30)}
          />
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}