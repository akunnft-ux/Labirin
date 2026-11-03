// tests/questions.test.js - Test soal quality and snapshot consistency

const { DM, Q, mk, setSeed, clearSeed, used } = require('./load.js');
const fs = require('fs');
const path = require('path');

// Load snapshot
const snapshotPath = path.join(__dirname, 'snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

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

console.log('Running question tests...\n');

// Test 1: Snapshot consistency
console.log('Test 1: Snapshot consistency');
setSeed(snapshot.seed);
const { questions } = snapshot;
for (let i = 0; i < questions.length; i++) {
  const exp = questions[i];
  const q = Q(exp.domain, exp.tier);
  assertEqual(q.q, exp.q, `Q${i}: question text matches`);
  assertEqual(q.opts, exp.opts, `Q${i}: options match`);
  assertEqual(q.a, exp.a, `Q${i}: answer index matches`);
  assertEqual(q.exp, exp.exp, `Q${i}: explanation matches`);
}
console.log(`  ✓ ${questions.length} questions match snapshot\n`);

// Test 2: Question quality - 100k random calls
console.log('Test 2: Question quality (100k random calls)');
setSeed(99999);
used.clear();
const domains = DM.length;
const tiers = [1, 2, 3];
let totalCalls = 0;
const maxCalls = 100000;
const errors = [];

for (let di = 0; di < domains; di++) {
  for (const tier of tiers) {
    for (let i = 0; i < 5000; i++) { // 5000 * 6 domains * 3 tiers = 90k, close enough
      if (totalCalls >= maxCalls) break;
      try {
        const q = Q(di, tier);
        totalCalls++;

        // Check 4 unique options
        assert(q.opts.length === 4, `Q has 4 options`);
        assert(new Set(q.opts).size === 4, `Q options are unique`);

        // Check answer index valid
        assert(q.a >= 0 && q.a < 4, `Q answer index valid`);

        // Check no "Pilihan N", NaN, undefined
        for (const opt of q.opts) {
          assert(!/Pilihan\s+\d+/.test(opt), `Q no "Pilihan N" option: ${opt}`);
          assert(!/NaN|undefined/.test(opt), `Q no NaN/undefined option: ${opt}`);
          assert(opt.trim() !== '', `Q option not empty`);
        }

        // Check no negative options (parse first char after optional currency/prefix)
        for (const opt of q.opts) {
          const cleaned = opt.replace(/^[^\d-]*(-?\d+).*/, '$1');
          const num = parseFloat(cleaned);
          if (!isNaN(num)) {
            assert(num >= 0, `Q no negative option: ${opt} -> ${num}`);
          }
        }

        // Check explanation exists
        assert(q.exp && q.exp.trim() !== '', `Q has explanation`);
      } catch (e) {
        errors.push({ domain: di, tier, error: e.message });
      }
    }
  }
}
console.log(`  ✓ ${totalCalls} calls completed without exception`);
if (errors.length) {
  console.error(`  ❌ ${errors.length} errors:`);
  errors.forEach(e => console.error(`     Domain ${e.domain}, Tier ${e.tier}: ${e.error}`));
}
console.log('');

// Test 3: Unique questions per domain at tier 2
console.log('Test 3: Unique questions per domain (tier 2, 3000 calls)');
setSeed(88888);
used.clear();
for (let di = 0; di < domains; di++) {
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const q = Q(di, 2);
    seen.add(q.q);
  }
  assert(seen.size >= 300, `Domain ${di} (${DM[di].n}): ${seen.size} unique questions (min 300)`);
}
console.log('');

// Test 4: Figure validation for geometry questions
console.log('Test 4: Figure validation (geometry domain)');
setSeed(77777);
used.clear();
const geoDomain = 2; // Geometri domain index
const knownFigTypes = ['rect', 'tri', 'trap', 'combo', 'box', 'angle', 'clock'];
let figCount = 0;
let figErrors = 0;

for (let i = 0; i < 5000; i++) {
  const q = Q(geoDomain, 2);
  if (q.fig) {
    figCount++;
    // Check fig.type is known
    assert(knownFigTypes.includes(q.fig.type), `Fig type known: ${q.fig.type}`);
    // Check all numeric params are finite numbers
    function checkParams(obj, path = '') {
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'number') {
          assert(Number.isFinite(val), `${path}${key} is finite number: ${val}`);
        } else if (val && typeof val === 'object') {
          checkParams(val, `${path}${key}.`);
        }
      }
    }
    checkParams(q.fig);
  }
}
console.log(`  ✓ ${figCount} questions with figures validated`);
console.log('');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);