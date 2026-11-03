// Generate snapshot of questions for testing using module files
// Run with: node tests/generate-snapshot.js

const { DM, Q, setSeed } = require('./load.js');
const fs = require('fs');
const path = require('path');

// Generate snapshot: 300 questions per domain per tier (1-3)
setSeed(12345);

const snapshot = { version: 1, seed: 12345, questions: [] };

for (let di = 0; di < DM.length; di++) {
  for (let tier = 1; tier <= 3; tier++) {
    for (let i = 0; i < 300; i++) {
      const q = Q(di, tier);
      snapshot.questions.push({
        domain: di,
        tier,
        q: q.q,
        opts: q.opts,
        a: q.a,
        exp: q.exp
      });
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
console.log(`Generated snapshot with ${snapshot.questions.length} questions`);
console.log('Saved to tests/snapshot.json');