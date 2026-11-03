// storage.js - Wrapper localStorage aman (untuk Tahap 5)
// Tanpa DOM, bisa diuji di Node dengan mock

const STORAGE_KEY = 'labirin.v3';
const DEFAULT_DATA = {
  ver: 3,
  unlocked: 1,
  stars: { 1: 0, 2: 0, 3: 0 },
  bestScore: { 1: 0, 2: 0, 3: 0 },
  mastery: Array(6).fill(null).map(() => ({ c: 0, s: 0 })),
  coins: 0,
  settings: { sound: true, vibrate: true, timer: false },
  daily: { date: '', done: false }
};

let memoryStore = { ...DEFAULT_DATA };
let useMemory = false;

function isAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

function load() {
  if (useMemory) return { ...memoryStore };
  if (!isAvailable()) { useMemory = true; return { ...memoryStore }; }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const data = JSON.parse(raw);
    if (data.ver !== DEFAULT_DATA.ver) return { ...DEFAULT_DATA };
    // Merge with defaults to handle missing fields
    return { ...DEFAULT_DATA, ...data, settings: { ...DEFAULT_DATA.settings, ...data.settings }, stars: { ...DEFAULT_DATA.stars, ...data.stars }, bestScore: { ...DEFAULT_DATA.bestScore, ...data.bestScore } };
  } catch (e) {
    useMemory = true;
    return { ...DEFAULT_DATA };
  }
}

function save(data) {
  if (useMemory) { memoryStore = { ...memoryStore, ...data }; return true; }
  if (!isAvailable()) { useMemory = true; memoryStore = { ...memoryStore, ...data }; return true; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    useMemory = true;
    memoryStore = { ...memoryStore, ...data };
    return true;
  }
}

function reset() {
  if (useMemory) { memoryStore = { ...DEFAULT_DATA }; return; }
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}

function patch(updates) {
  const data = load();
  save({ ...data, ...updates });
}

/**
 * Hitung bintang untuk level berdasarkan hasil ujian
 * @param {Object} params - { examScore: number, heartsAtFinish: number, levelPass: number, examSize: number }
 * @returns {number} 0-3 bintang
 */
function calculateStars({ examScore, heartsAtFinish, levelPass, examSize }) {
  if (examScore < levelPass) return 0;
  let stars = 1; // Lulus ujian
  if (heartsAtFinish >= 3) stars = 2; // Nyawa >= 3
  if (examScore === examSize) stars = 3; // Sempurna 12/12
  return stars;
}

/**
 * Pilih 2 domain terlemah untuk Latihan Topik Lemah
 * @param {Array} mastery - Array 6 domain [{c, s}, ...]
 * @param {number} minAnswers - Minimal jawaban tercatat per domain (default 5)
 * @returns {Array} Indeks 2 domain terlemah
 */
function pickWeakTopics(mastery, minAnswers = 5) {
  const withStats = mastery
    .map((m, i) => ({ i, total: m.c + m.s, correct: m.c }))
    .filter(m => m.total >= minAnswers);
  
  if (withStats.length < 2) {
    // Belum cukup data, pilih acak 2 domain
    const all = [0, 1, 2, 3, 4, 5];
    return all.sort(() => Math.random() - 0.5).slice(0, 2);
  }
  
  // Urutkan by akurasi terendah
  withStats.sort((a, b) => (a.correct / a.total) - (b.correct / b.total));
  return [withStats[0].i, withStats[1].i];
}

/**
 * Generate soal untuk Latihan Topik Lemah
 * @param {Object} params - { DM, Q, weakTopics: [di1, di2], tier, countPerTopic }
 * @returns {Array} Array soal [{q, opts, a, exp, di}, ...]
 */
function generateWeakTopicQuestions({ DM, Q, weakTopics, tier, countPerTopic = 5 }) {
  const questions = [];
  for (const di of weakTopics) {
    for (let i = 0; i < countPerTopic; i++) {
      const q = Q(di, tier);
      q.di = di;
      questions.push(q);
    }
  }
  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}

// For testing: allow switching to memory mode
function _setMemoryMode(v) { useMemory = v; }

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    load, save, reset, patch, 
    DEFAULT_DATA, STORAGE_KEY, 
    _setMemoryMode,
    calculateStars,
    pickWeakTopics,
    generateWeakTopicQuestions
  };
}
// Export for browser
if (typeof window !== 'undefined') {
  window.load = load;
  window.save = save;
  window.reset = reset;
  window.patch = patch;
  window.DEFAULT_DATA = DEFAULT_DATA;
  window.STORAGE_KEY = STORAGE_KEY;
  window.calculateStars = calculateStars;
  window.pickWeakTopics = pickWeakTopics;
  window.generateWeakTopicQuestions = generateWeakTopicQuestions;
  window._setMemoryMode = _setMemoryMode;
}