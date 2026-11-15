// Draws the shareable result picture (1080×1080 PNG) for a finished or ended
// solo run: the level reached, the score, the mode, and the progress track.
// No link or personal data on it.
import { TOTAL_LEVELS, baseScore, finalScore, modeMultiplier, ALL_CATEGORIES_MULT } from '../../utils/soloEngine';
import { TIER } from './soloMotion';

const W = 1080;
const H = 1080;

// The level to show: all 90 when finished, otherwise the level the run ended on.
export function levelReached(run) {
  return run.finished ? TOTAL_LEVELS : run.level + 1;
}

export function shareText(run) {
  return run.finished
    ? `🎯 أنهيت كل المراحل الـ${TOTAL_LEVELS} في تحدّي «من الوحش»`
    : `🎯 وصلت إلى المرحلة ${levelReached(run)} من ${TOTAL_LEVELS} في تحدّي «من الوحش»`;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export async function renderResultCard(run) {
  try {
    await Promise.all([document.fonts.load('900 64px Cairo'), document.fonts.load('700 40px Cairo')]);
  } catch { /* fall back to the system font */ }

  const level = levelReached(run);
  const tierPts = level <= 30 ? 200 : level <= 60 ? 400 : 600;
  const color = TIER[tierPts].color;
  const score = run.finished ? finalScore(run) : baseScore(run);
  const family = "Cairo, 'Segoe UI', Tahoma, sans-serif";

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.direction = 'rtl';
  g.textAlign = 'center';

  // background + tier glow
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1d060a'); bg.addColorStop(1, '#050000');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 40, 20, W / 2, 40, 760);
  glow.addColorStop(0, `${color}59`); glow.addColorStop(1, `${color}00`);
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(196,22,28,0.55)'; g.lineWidth = 6;
  roundRect(g, 28, 28, W - 56, H - 56, 36); g.stroke();

  // title
  g.shadowColor = 'rgba(229,30,40,0.8)'; g.shadowBlur = 36;
  g.fillStyle = '#FF3B3B'; g.font = `900 104px ${family}`;
  g.fillText('من الوحش', W / 2, 170);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,233,233,0.8)'; g.font = `700 46px ${family}`;
  g.fillText('التحدّي الفردي', W / 2, 238);

  // level
  g.fillStyle = 'rgba(255,233,233,0.85)'; g.font = `700 60px ${family}`;
  g.fillText(run.finished ? 'أنهيت' : 'وصلت إلى المرحلة', W / 2, 372);
  g.shadowColor = color; g.shadowBlur = 40;
  g.fillStyle = color; g.font = `900 250px ${family}`;
  g.fillText(String(level), W / 2, 600);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,233,233,0.75)'; g.font = `700 54px ${family}`;
  g.fillText(`من ${TOTAL_LEVELS} مرحلة`, W / 2, 672);

  // progress track (RTL: it fills from the right) with the three tiers
  const x0 = 150, x1 = 930, ty = 730, th = 26, seg = (x1 - x0) / 3;
  const done = Math.min(1, level / TOTAL_LEVELS);
  [200, 400, 600].forEach((pts, i) => {
    const right = x1 - i * seg, left = right - seg;
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(left + (i < 2 ? 2 : 0), ty, seg - (i < 2 ? 2 : 0), th);
    const frac = Math.max(0, Math.min(1, (done * 3) - i));
    g.fillStyle = TIER[pts].color;
    g.fillRect(right - frac * seg, ty, frac * seg, th);
  });
  const mx = x1 - done * (x1 - x0);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(mx, ty + th / 2, 22, 0, Math.PI * 2); g.fill();
  g.strokeStyle = color; g.lineWidth = 8; g.stroke();

  // score
  g.fillStyle = '#FFD700'; g.shadowColor = 'rgba(255,215,0,0.5)'; g.shadowBlur = 24;
  g.font = `900 112px ${family}`;
  g.fillText(`${score.toLocaleString('en')} نقطة`, W / 2, 900);
  g.shadowBlur = 0;

  // mode + result chip
  g.font = `700 44px ${family}`;
  if (run.finished) {
    g.fillStyle = '#46C98B';
    g.fillText('أنهيت التحدّي كاملاً 🏆', W / 2, 980);
  } else if (modeMultiplier(run) > 1) {
    g.fillStyle = '#FFD700';
    g.fillText(`كل الفئات (مضاعف النقاط ${ALL_CATEGORIES_MULT})`, W / 2, 980);
  }

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
