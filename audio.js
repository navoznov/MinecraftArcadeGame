const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playPew() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.start(now);
  osc.stop(now + 0.22);
}

function playSquish() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playPipeEnter() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setValueAtTime(0.15, now + 0.5);
  gain.gain.linearRampToValueAtTime(0, now + 0.6);
  osc.start(now);
  osc.stop(now + 0.6);
}

function playGameOver() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [
    { freq: 440, t: 0.00 },
    { freq: 330, t: 0.28 },
    { freq: 220, t: 0.56 },
  ];
  for (const { freq, t } of notes) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const at = audioCtx.currentTime + t;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, at + 0.22);
    gain.gain.setValueAtTime(0.18, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
    osc.start(at);
    osc.stop(at + 0.22);
  }
}

function playPickaxeHit() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
  gain.gain.setValueAtTime(0.30, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playSwordSwing() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
  gain.gain.setValueAtTime(0.20, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playEatApple() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const notes = [[523, 0], [659, 0.10], [784, 0.20], [1047, 0.30]];
  for (const [freq, t] of notes) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const at = audioCtx.currentTime + t;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.20);
    osc.start(at);
    osc.stop(at + 0.20);
  }
}

// [freq Hz (0=rest), duration s]  — Super Mario Bros. Ground Theme, 200 BPM
const MARIO_MELODY = [
  // Intro
  [659,.15],[0,.15],[659,.15],[0,.15],[659,.15],[0,.15],[523,.15],[659,.30],
  [784,.60],[0,.30],[392,.60],
  // Section A
  [523,.45],[392,.30],[0,.30],[330,.45],[0,.15],
  [440,.30],[0,.15],[494,.30],[0,.15],[466,.30],[440,.30],
  [392,.10],[659,.10],[784,.10],[880,.30],[698,.15],[784,.15],
  [659,.30],[523,.15],[587,.15],[494,.45],[0,.15],
  // Section A repeat
  [523,.45],[392,.30],[0,.30],[330,.45],[0,.15],
  [440,.30],[0,.15],[494,.30],[0,.15],[466,.30],[440,.30],
  [392,.10],[659,.10],[784,.10],[880,.30],[698,.15],[784,.15],
  [659,.30],[523,.15],[587,.15],[494,.45],[0,.15],
  // Section B
  [784,.15],[0,.30],[698,.15],[0,.15],[659,.15],[0,.30],
  [554,.15],[587,.15],[0,.15],[523,.15],[0,.15],
  [330,.15],[392,.15],[0,.15],[440,.15],[0,.15],[494,.15],[0,.30],
  // Section A final
  [523,.45],[392,.30],[0,.30],[330,.45],[0,.15],
  [440,.30],[0,.15],[494,.30],[0,.15],[466,.30],[440,.30],
  [392,.10],[659,.10],[784,.10],[880,.30],[698,.15],[784,.15],
  [659,.30],[523,.15],[587,.15],[494,.45],[0,.30],
];

let bgMusicActive = false;
let bgMusicTimeout = null;
let bgMusicGain = null;

function scheduleBgMusicLoop() {
  if (!bgMusicActive) return;
  bgMusicGain = audioCtx.createGain();
  bgMusicGain.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime + 0.05;
  let t = t0;
  for (const [freq, dur] of MARIO_MELODY) {
    if (freq > 0) {
      const osc = audioCtx.createOscillator();
      const g   = audioCtx.createGain();
      osc.connect(g);
      g.connect(bgMusicGain);
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.06, t);
      g.gain.setValueAtTime(0.06, t + dur * 0.82);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  }
  bgMusicTimeout = setTimeout(scheduleBgMusicLoop, (t - t0) * 1000);
}

function startBgMusic() {
  if (bgMusicActive || bgMusicMuted) return;
  audioCtx.resume();
  bgMusicActive = true;
  scheduleBgMusicLoop();
}

function stopBgMusic() {
  bgMusicActive = false;
  clearTimeout(bgMusicTimeout);
  bgMusicTimeout = null;
  if (bgMusicGain) {
    bgMusicGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bgMusicGain = null;
  }
}
