// tests/browser-load.test.js
// Memuat file persis seperti browser: <script> klasik berurutan dalam SATU scope global.
// (load.js menggabung & membuang baris const, jadi tidak bisa menangkap bentrok deklarasi.)
// Menangkap: "Identifier 'x' has already been declared", ReferenceError saat load/init.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.env.LABIRIN_ROOT || path.join(__dirname, '..');
const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);

// Elemen/DOM palsu: objek "serba bisa" supaya game.js bisa dijalankan tanpa browser
const stub = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === 'then' ? undefined : stub()),
  set: () => true,
  apply: () => stub()
});
const listeners = {};
const sandbox = {
  console, Math, Set, Map, JSON, Date, Promise, setTimeout, clearTimeout, performance: { now: () => Date.now() },
  document: { querySelector: stub, querySelectorAll: () => [], getElementById: stub, body: stub(), documentElement: stub(),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); } },
  localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } },
  navigator: {}, getComputedStyle: stub, requestAnimationFrame: () => 0, devicePixelRatio: 1
};
sandbox.window = sandbox;
sandbox.addEventListener = () => {};
sandbox.matchMedia = () => ({ matches: false });
vm.createContext(sandbox);

let failed = 0;
for (const s of scripts) {
  try {
    vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), sandbox, { filename: s });
    console.log('  ✓ memuat ' + s);
  } catch (e) {
    failed++;
    console.log('  ✗ ' + s + ' -> ' + e.name + ': ' + e.message);
  }
}
if (!failed) {
  try { (listeners.DOMContentLoaded || []).forEach(fn => fn()); console.log('  ✓ init() / menu() berjalan'); }
  catch (e) { failed++; console.log('  ✗ init() -> ' + e.name + ': ' + e.message); }
}
console.log(`\n=== Results: ${scripts.length - failed} passed, ${failed} failed ===`);
if (failed) process.exit(1);
