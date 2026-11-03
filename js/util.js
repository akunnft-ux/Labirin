// util.js - Fungsi utilitas murni (tanpa DOM)
// RNG, shuffle, gcd/lcm, format angka

const util = (function () {
  let _rand = Math.random;
  const rand = () => _rand();

  function setSeed(seed) {
    let a = seed >>> 0;
    _rand = () => {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clearSeed() { _rand = Math.random; }

  function rnd(a, b) { return Math.floor(rand() * (b - a + 1)) + a; }
  function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
  function shuf(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }
  function fr(n, d) {
    const g = gcd(n, d);
    n /= g; d /= g;
    return d === 1 ? `${n}` : `${n}/${d}`;
  }
  function num(x) { return x.toLocaleString('id-ID'); }
  function rp(x) { return 'Rp' + num(x); }
  function hh(x) {
    return String(Math.floor(x / 60) % 24).padStart(2, '0') + '.' + String(x % 60).padStart(2, '0');
  }

  return { rand, setSeed, clearSeed, rnd, pick, shuf, gcd, lcm, fr, num, rp, hh };
})();

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = util;
}
// Export for browser
if (typeof window !== 'undefined') {
  window.rand = util.rand;
  window.setSeed = util.setSeed;
  window.clearSeed = util.clearSeed;
  window.rnd = util.rnd;
  window.pick = util.pick;
  window.shuf = util.shuf;
  window.gcd = util.gcd;
  window.lcm = util.lcm;
  window.fr = util.fr;
  window.num = util.num;
  window.rp = util.rp;
  window.hh = util.hh;
}