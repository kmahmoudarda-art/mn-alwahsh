// Motion + colour tokens for solo mode. One place, so nothing in the page
// uses raw numbers.
export const springs = {
  snappy: { type: 'spring', stiffness: 420, damping: 30 },
  gentle: { type: 'spring', stiffness: 260, damping: 26 },
  pop: { type: 'spring', stiffness: 380, damping: 16 },
};
export const duration = { fast: 0.15, normal: 0.3, slow: 0.6 };
export const ease = [0.22, 1, 0.36, 1];
export const STAGGER = 0.06; // 0.05–0.10 keeps lists from feeling mechanical

export const TIER = {
  200: { name: 'سهل', color: '#46C98B', glow: 'rgba(70,201,139,0.20)' },
  400: { name: 'متوسط', color: '#F2A93B', glow: 'rgba(242,169,59,0.20)' },
  600: { name: 'صعب', color: '#E5333A', glow: 'rgba(229,51,58,0.26)' },
};
