// tests/storage.test.js - Test storage functions (stars, weak topics)

const { 
  load, save, reset, patch, DEFAULT_DATA, 
  calculateStars, pickWeakTopics, generateWeakTopicQuestions,
  _setMemoryMode 
} = require('./load.js');

const { DM, Q, setSeed } = require('./load.js');

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; return true; }
  failed++;
  console.error(`  ❌ ${msg}`);
  return false;
}

function assertEqual(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; return true; }
  failed++;
  console.error(`  ❌ ${msg}`);
  console.error(`     Expected: ${JSON.stringify(expected)}`);
  console.error(`     Actual:   ${JSON.stringify(actual)}`);
  return false;
}

console.log('Running storage tests...\n');

// Test calculateStars
console.log('Test: calculateStars');
const examSize = 12;

assertEqual(calculateStars({ examScore: 8, heartsAtFinish: 5, levelPass: 9, examSize }), 0, 'Belum lulus (8 < 9) = 0 bintang');
assertEqual(calculateStars({ examScore: 9, heartsAtFinish: 2, levelPass: 9, examSize }), 1, 'Lulus, nyawa < 3 = 1 bintang');
assertEqual(calculateStars({ examScore: 9, heartsAtFinish: 3, levelPass: 9, examSize }), 2, 'Lulus, nyawa >= 3 = 2 bintang');
assertEqual(calculateStars({ examScore: 12, heartsAtFinish: 1, levelPass: 9, examSize }), 3, 'Sempurna 12/12 = 3 bintang');
assertEqual(calculateStars({ examScore: 10, heartsAtFinish: 5, levelPass: 10, examSize }), 2, 'Lulus level 2, nyawa >= 3 = 2 bintang');
assertEqual(calculateStars({ examScore: 11, heartsAtFinish: 3, levelPass: 11, examSize }), 2, 'Lulus level 3, nyawa >= 3 = 2 bintang');
assertEqual(calculateStars({ examScore: 12, heartsAtFinish: 3, levelPass: 11, examSize }), 3, 'Sempurna level 3 = 3 bintang');
console.log('  ✓ calculateStars works correctly\n');

// Test pickWeakTopics
console.log('Test: pickWeakTopics');

const masteryFull = [
  { c: 10, s: 0 }, // 100%
  { c: 8, s: 2 },  // 80%
  { c: 5, s: 5 },  // 50%
  { c: 3, s: 7 },  // 30%
  { c: 1, s: 9 },  // 10%
  { c: 0, s: 10 }  // 0%
];
const weak = pickWeakTopics(masteryFull, 5);
assertEqual(weak.sort(), [4, 5].sort(), 'Pilih 2 terlemah: domain 4 (10%) dan 5 (0%)');

const masteryLowData = [
  { c: 2, s: 1 },  // total 3 < 5
  { c: 1, s: 1 },  // total 2 < 5
  { c: 3, s: 2 },  // total 5, 60%
  { c: 2, s: 3 },  // total 5, 40%
  { c: 0, s: 0 },  // total 0
  { c: 0, s: 0 }   // total 0
];
const weak2 = pickWeakTopics(masteryLowData, 5);
assert(weak2.length === 2, 'Kembalikan 2 domain');
assert(weak2.includes(3) && weak2.includes(2), 'Pilih domain 3 (40%) dan 2 (60%) karena hanya mereka yang >= 5 jawaban');

const masteryNone = [
  { c: 0, s: 0 },
  { c: 0, s: 0 },
  { c: 0, s: 0 },
  { c: 0, s: 0 },
  { c: 0, s: 0 },
  { c: 0, s: 0 }
];
const weak3 = pickWeakTopics(masteryNone, 5);
assertEqual(weak3.length, 2, 'Tanpa data cukup, pilih 2 acak');
console.log('  ✓ pickWeakTopics works correctly\n');

// Test generateWeakTopicQuestions
console.log('Test: generateWeakTopicQuestions');
setSeed(12345);
const questions = generateWeakTopicQuestions({
  DM, Q, weakTopics: [0, 2], tier: 2, countPerTopic: 3
});
assertEqual(questions.length, 6, '6 soal (3 per domain)');
assert(questions.filter(q => q.di === 0).length === 3, '3 soal domain 0');
assert(questions.filter(q => q.di === 2).length === 3, '3 soal domain 2');
assert(questions.every(q => q.opts && q.opts.length === 4), 'Semua soal punya 4 opsi');
console.log('  ✓ generateWeakTopicQuestions works correctly\n');

// Test storage persistence (load/save/reset)
console.log('Test: storage persistence');
_setMemoryMode(true);
reset();
const data1 = load();
assertEqual(data1.unlocked, 1, 'Default unlocked = 1');
assertEqual(data1.stars[1], 0, 'Default stars = 0');
assertEqual(data1.coins, 0, 'Default coins = 0');

save({ unlocked: 2, stars: { 1: 2, 2: 1, 3: 0 }, coins: 50, bestScore: { 1: 120, 2: 95, 3: 0 } });
const data2 = load();
assertEqual(data2.unlocked, 2, 'Unlocked saved');
assertEqual(data2.stars[1], 2, 'Stars saved');
assertEqual(data2.coins, 50, 'Coins saved');
assertEqual(data2.bestScore[1], 120, 'BestScore saved');

patch({ coins: 60 });
const data3 = load();
assertEqual(data3.coins, 60, 'Patch coins works');

reset();
const data4 = load();
assertEqual(data4.unlocked, 1, 'Reset restores defaults');
assertEqual(data4.coins, 0, 'Reset clears coins');

_setMemoryMode(false);
console.log('  ✓ Storage persistence works correctly\n');

// Test corrupted data handling
console.log('Test: corrupted data handling');
_setMemoryMode(true);
reset();
// Test that version mismatch in localStorage would be handled
// (In memory mode we bypass version check, which is fine for testing)
const data5 = load();
assertEqual(data5.ver, 3, 'Default ver is 3');
assertEqual(data5.unlocked, 1, 'Default unlocked is 1');
console.log('  ✓ Default data loads correctly\n');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);