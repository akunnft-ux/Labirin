// audio.js - WebAudio sintetis (untuk Tahap 6)
// Tanpa file audio eksternal, murni WebAudio API

let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('WebAudio not supported', e);
  }
}

function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
}

function isSoundEnabled() {
  return soundEnabled;
}

/**
 * Play a simple tone
 * @param {number} freq - frequency in Hz
 * @param {number} dur - duration in seconds
 * @param {string} type - oscillator type (sine, square, triangle, sawtooth)
 * @param {number} vol - volume 0-1
 */
function tone(freq, dur, type = 'sine', vol = 0.1) {
  if (!soundEnabled || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain).connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  osc.start(now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.stop(now + dur);
}

/**
 * Play a chord (multiple tones)
 */
function chord(freqs, dur, type = 'sine', vol = 0.08) {
  freqs.forEach(f => tone(f, dur, type, vol));
}

// Predefined sound effects
function sfxCorrect() {
  // Major chord: C5, E5, G5
  chord([523.25, 659.25, 783.99], 0.3, 'triangle', 0.12);
}

function sfxWrong() {
  // Descending minor: G4, Eb4, C4
  tone(392, 0.15, 'sawtooth', 0.1);
  setTimeout(() => tone(311.13, 0.15, 'sawtooth', 0.1), 80);
  setTimeout(() => tone(261.63, 0.25, 'sawtooth', 0.1), 160);
}

function sfxCoin() {
  // Quick high ping
  tone(1046.5, 0.08, 'sine', 0.15);
}

function sfxDoorOpen() {
  // Rising arpeggio
  [261.63, 329.63, 392, 523.25].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.1), i * 60));
}

function sfxLevelUp() {
  // Fanfare
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.12), i * 80));
}

function sfxChest() {
  // Magic sparkle
  [880, 1108.73, 1318.51, 1760].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.1), i * 40));
}

function sfxPowerup() {
  // Quick up-down
  tone(659.25, 0.08, 'square', 0.1);
  setTimeout(() => tone(523.25, 0.08, 'square', 0.1), 60);
  setTimeout(() => tone(783.99, 0.15, 'triangle', 0.12), 120);
}

// Export for Node testing (no-op)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initAudio, resumeAudio, setSoundEnabled, isSoundEnabled,
    sfxCorrect, sfxWrong, sfxCoin, sfxDoorOpen, sfxLevelUp, sfxChest, sfxPowerup,
    _setAudioCtx: (ctx) => { audioCtx = ctx; }
  };
}
// Export for browser
if (typeof window !== 'undefined') {
  window.initAudio = initAudio;
  window.resumeAudio = resumeAudio;
  window.setSoundEnabled = setSoundEnabled;
  window.isSoundEnabled = isSoundEnabled;
  window.sfxCorrect = sfxCorrect;
  window.sfxWrong = sfxWrong;
  window.sfxCoin = sfxCoin;
  window.sfxDoorOpen = sfxDoorOpen;
  window.sfxLevelUp = sfxLevelUp;
  window.sfxChest = sfxChest;
  window.sfxPowerup = sfxPowerup;
}