// tests/load.js - Load logic modules into a single VM context for testing

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Read all logic modules
let utilCode = fs.readFileSync(path.join(__dirname, '../js/util.js'), 'utf-8');
let questionsCode = fs.readFileSync(path.join(__dirname, '../js/questions.js'), 'utf-8');
let mazeCode = fs.readFileSync(path.join(__dirname, '../js/maze.js'), 'utf-8');
let storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf-8');
let audioCode = fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf-8');

// Strip module boilerplate (require/exports) and U destructuring for combined context
function stripModuleBoilerplate(code, moduleName) {
  // Remove: const U = (typeof module !== 'undefined' && module.exports) ? require('./util.js') : window;
  // Remove: const { rnd, pick, shuf, gcd, lcm, fr, num, rp, hh } = U;
  // Remove: const { rnd, pick, shuf } = U;
  // Remove: if (typeof module !== 'undefined' && module.exports) { module.exports = ... }
  return code
    .replace(/const U = \(typeof module !== 'undefined' && module\.exports\) \? require\(['"]\.\/util\.js['"]\) : window;/, '')
    .replace(/const \{[^}]+\} = U;/g, '')
    .replace(/if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?module\.exports = \{[\s\S]*?\}\}/, '');
}

questionsCode = stripModuleBoilerplate(questionsCode, 'questions');
mazeCode = stripModuleBoilerplate(mazeCode, 'maze');
storageCode = stripModuleBoilerplate(storageCode, 'storage');
audioCode = stripModuleBoilerplate(audioCode, 'audio');

// Create context with minimal globals
const context = {
  console,
  Math,
  Set,
  Map,
  Array,
  Object,
  String,
  Number,
  parseFloat,
  parseInt,
  isNaN,
  Infinity,
  NaN,
  undefined,
  window: {},
  document: {
    querySelector: () => ({}),
    getElementById: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  navigator: { vibrate: () => {} },
  matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  localStorage: {
    _store: {},
    getItem(key) { return this._store[key] || null; },
    setItem(key, val) { this._store[key] = String(val); },
    removeItem(key) { delete this._store[key]; },
    clear() { this._store = {}; }
  },
  sessionStorage: {},
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  HTMLElement: class {},
  HTMLCanvasElement: class {},
  CanvasRenderingContext2D: class {},
  Image: class {},
  AudioContext: class {},
  webkitAudioContext: class {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Promise,
  JSON,
  Error,
  RegExp,
  Date,
  Symbol,
  Reflect,
  Proxy,
  WeakMap,
  WeakSet,
  ArrayBuffer,
  DataView,
  Int8Array,
  Uint8Array,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  BigInt64Array,
  BigUint64Array
};

// Combine all modules
const combinedCode = `
${utilCode}
// Make util functions global for other modules
const rand = util.rand, setSeed = util.setSeed, clearSeed = util.clearSeed;
const rnd = util.rnd, pick = util.pick, shuf = util.shuf;
const gcd = util.gcd, lcm = util.lcm, fr = util.fr, num = util.num, rp = util.rp, hh = util.hh;
${questionsCode}
${mazeCode}
${storageCode}
${audioCode}

// Export all for testing
this.exports = {
  // util
  rand: util.rand,
  setSeed: util.setSeed,
  clearSeed: util.clearSeed,
  rnd: util.rnd,
  pick: util.pick,
  shuf: util.shuf,
  gcd: util.gcd,
  lcm: util.lcm,
  fr: util.fr,
  num: util.num,
  rp: util.rp,
  hh: util.hh,
  // questions
  DM: DM,
  Q: Q,
  mk: mk,
  used: used,
  // maze
  DIR: DIR,
  gen: gen,
  bfs: bfs,
  ek: ek,
  LV: LV,
  findFurthestCell: findFurthestCell,
  generateMazeWithMinPath: generateMazeWithMinPath,
  createGates: createGates,
  placeItems: placeItems,
  // storage
  load: load,
  save: save,
  reset: reset,
  patch: patch,
  DEFAULT_DATA: DEFAULT_DATA,
  calculateStars: calculateStars,
  pickWeakTopics: pickWeakTopics,
  generateWeakTopicQuestions: generateWeakTopicQuestions,
  _setMemoryMode: _setMemoryMode,
  // audio (no-op in Node)
  initAudio: initAudio,
  resumeAudio: resumeAudio,
  setSoundEnabled: setSoundEnabled,
  isSoundEnabled: isSoundEnabled,
  sfxCorrect: sfxCorrect,
  sfxWrong: sfxWrong,
  sfxCoin: sfxCoin,
  sfxDoorOpen: sfxDoorOpen,
  sfxLevelUp: sfxLevelUp,
  sfxChest: sfxChest,
  sfxPowerup: sfxPowerup
};
`;

vm.createContext(context);
const script = new vm.Script(combinedCode, { filename: 'combined.js' });
script.runInContext(context);

module.exports = context.exports;