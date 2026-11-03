// tests/run.js - Jalankan semua tes
// Tiap file tes dijalankan sebagai proses terpisah, karena masing-masing memanggil
// process.exit() di akhir (kalau di-require, tes pertama mematikan seluruh runner).
const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  ['Questions Test', 'questions.test.js'],
  ['Maze Test', 'maze.test.js'],
  ['Storage Test', 'storage.test.js'],
  ['Browser Load Test', 'browser-load.test.js']
];

console.log('Running all tests...');
const results = suites.map(([name, file]) => {
  console.log(`\n========== ${name} ==========`);
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  const ok = r.status === 0;
  console.log(ok ? `✅ ${name} PASSED` : `❌ ${name} FAILED (exit ${r.status})`);
  return ok;
});

const passed = results.filter(Boolean).length;
console.log(`\n========== SUMMARY ==========`);
console.log(`${passed}/${results.length} test suites passed`);
if (passed === results.length) { console.log('🎉 All tests passed!'); process.exit(0); }
console.log('💥 Some tests failed!');
process.exit(1);
