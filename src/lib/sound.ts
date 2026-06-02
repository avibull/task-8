/** Web Audio sound generation — no audio files needed. */
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

export const ensureAudioReady = () => {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
};

/** A single short clean "ding". */
export const playDing = () => {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(660, t + 0.18);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.4);
};

/** Urgent triple chime — sharper, louder. */
export const playChime = () => {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  [0, 0.12, 0.24].forEach((offset, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(1320 - i * 100, t + offset);
    g.gain.setValueAtTime(0.0001, t + offset);
    g.gain.exponentialRampToValueAtTime(0.4, t + offset + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.15);
    o.connect(g).connect(c.destination);
    o.start(t + offset);
    o.stop(t + offset + 0.18);
  });
};
