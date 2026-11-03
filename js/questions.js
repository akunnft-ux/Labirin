// questions.js - Bank soal dan generator soal (tanpa DOM)
// Menggunakan util.js: rnd, pick, shuf, gcd, lcm, fr, num, rp, hh

// Pastikan util sudah dimuat (di browser via <script>, di Node via require)
const U = (typeof module !== 'undefined' && module.exports) ? require('./util.js') : window;
const { rnd, pick, shuf, gcd, lcm, fr, num, rp, hh } = U;

/**
 * Parse nilai dari string format Indonesia
 * Mendukung: Rp, titik ribuan, koma desimal, satuan (cm, kg, dll), pecahan a/b, jam HH.MM
 * @returns {Object} { value: number, prefix: string, suffix: string, type: 'number'|'fraction'|'time' }
 */
function parseNilai(str) {
  const s = String(str).trim();
  // Jam HH.MM
  if (/^\d{1,2}\.\d{2}$/.test(s)) {
    const [h, m] = s.split('.').map(Number);
    return { value: h * 60 + m, prefix: '', suffix: '', type: 'time', raw: s };
  }
  // Pecahan a/b
  if (s.includes('/') && !s.includes(' ')) {
    const [p, q] = s.split('/').map(x => parseFloat(x.replace(',', '.')));
    if (!isNaN(p) && !isNaN(q) && q !== 0) {
      return { value: p / q, prefix: '', suffix: '', type: 'fraction', raw: s, num: p, den: q };
    }
  }
  // Angka dengan prefix/suffix (Rp, satuan, dll)
  const match = s.match(/^([^\d\-]*)(-?[\d.,]+)([^\d]*)$/);
  if (match) {
    const [, prefix, numStr, suffix] = match;
    const val = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
    return { value: val, prefix, suffix, type: 'number', raw: s };
  }
  // Fallback: coba parse angka saja
  const numOnly = parseFloat(s.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
  if (!isNaN(numOnly)) {
    return { value: numOnly, prefix: '', suffix: '', type: 'number', raw: s };
  }
  return { value: NaN, prefix: '', suffix: '', type: 'text', raw: s };
}

/**
 * Format nilai kembali ke string dengan prefix/suffix
 */
function formatNilai(parsed, val) {
  if (parsed.type === 'time') {
    const h = Math.floor(val / 60) % 24;
    const m = Math.round(val % 60);
    return String(h).padStart(2, '0') + '.' + String(m).padStart(2, '0');
  }
  if (parsed.type === 'fraction') {
    // Untuk pecahan, kembalikan sebagai pecahan sederhana jika memungkinkan
    // Di sini kita kembalikan desimal dengan format Indonesia
    return String(val).replace('.', ',');
  }
  // Format angka dengan pemisah ribuan Indonesia
  const numStr = Math.round(val * 10) / 10; // 1 desimal max
  const formatted = String(numStr).replace('.', ',');
  // Tambahkan pemisah ribuan untuk angka >= 1000
  const parts = formatted.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parsed.prefix + parts.join(',') + parsed.suffix;
}

/**
 * Menghasilkan pengecoh yang mirip jawaban benar (format sama, nilai dekat)
 */
function generateDistractors(parsed, correctVal, count, existing) {
  // Untuk jawaban teks (Ya/Tidak/Mungkin), tidak generate pengecoh numerik
  if (parsed.type === 'text' || isNaN(correctVal)) {
    return [];
  }
  const result = [];
  const isInt = Number.isInteger(correctVal);
  const step = parsed.type === 'time' ? 5 : (isInt ? 1 : 0.1);
  const magnitude = Math.max(1, Math.abs(correctVal));
  const range = Math.max(step * 5, magnitude * 0.3);
  let attempts = 0;
  const maxAttempts = count * 20;

  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    let candidate;
    if (parsed.type === 'fraction') {
      const delta = pick([-1, 1]);
      if (rnd(0, 1) === 0) {
        candidate = (parsed.num + delta) / parsed.den;
      } else {
        candidate = parsed.num / (parsed.den + delta);
      }
    } else if (parsed.type === 'time') {
      candidate = correctVal + pick([-15, -10, -5, 5, 10, 15, 20, 30]);
    } else {
      candidate = correctVal + pick([-1, 1]) * (step * rnd(1, 5));
    }
    if (candidate < 0) continue;
    const formatted = formatNilai(parsed, candidate);
    if (!existing.has(formatted) && !result.includes(formatted)) {
      result.push(formatted);
    }
  }
  return result;
}

/**
 * Membuat soal dengan 4 opsi jawaban
 * @param {string} q - Pertanyaan
 * @param {string|number} ans - Jawaban benar
 * @param {Array} wr - Array pengecoh dari generator
 * @param {string} exp - Penjelasan
 * @param {Object} [fig] - Objek deskripsi gambar (opsional): {type, ...params}
 * @returns {Object} {q, opts, a, exp, fig?}
 */
function mk(q, ans, wr, exp, fig) {
  const parsed = parseNilai(ans);
  const correctVal = parsed.value;
  const correctStr = parsed.raw;
  const existing = new Set([correctStr]);

  // Tambahkan pengecoh dari generator yang valid
  for (const w of shuf(wr)) {
    const s = String(w).trim();
    if (!s) continue;
    const wp = parseNilai(s);
    // Buang pengecoh negatif (kecuali jawaban benar sendiri negatif)
    if (wp.value < 0 && correctVal >= 0) continue;
    if (!existing.has(s)) {
      existing.add(s);
      if (existing.size === 4) break;
    }
  }

  // Jika masih kurang, generate pengecoh yang formatnya sama
  if (existing.size < 4) {
    const needed = 4 - existing.size;
    const distractors = generateDistractors(parsed, correctVal, needed * 3, existing);
    for (const d of distractors) {
      existing.add(d);
      if (existing.size === 4) break;
    }
  }

  // Fallback terakhir: untuk jawaban teks, generate opsi generik; untuk angka, angka dekat
  let k = 1;
  while (existing.size < 4) {
    let candidate;
    if (isNaN(correctVal) || parsed.type === 'text') {
      candidate = 'Opsi ' + String.fromCharCode(64 + k); // Opsi A, Opsi B, ...
    } else {
      candidate = correctVal + k;
    }
    const s = String(candidate);
    if (!existing.has(s)) existing.add(s);
    k++;
  }

  const opts = shuf([...existing]);
  const result = { q, opts, a: opts.indexOf(correctStr), exp };
  if (fig) result.fig = fig;
  return result;
}

/* ===== BANK SOAL: 6 kompetensi sesuai kisi-kisi TKA Matematika SD =====
   Setiap generator menerima tingkat t = 1..3 (makin besar makin sulit).
   Tambah generator baru di array g. */
const DM = [
  { n: 'Bilangan', s: 'Bilangan', e: '🔢', c: '#e5484d', g: [
    t => {
      let a = rnd(2, 8 * t), b = rnd(2, 9), c = rnd(2, 9), d = rnd(2, 9), e = rnd(2, 5);
      let s, r;
      if (t === 1) {
        s = `${a} + ${b} × ${c}`;
        r = a + b * c;
      } else if (t === 2) {
        // Ensure positive: (a+b)*c > d
        const sum = a + b;
        const prod = sum * c;
        if (prod <= d) { d = prod - 1; if (d < 2) d = 2; }
        s = `(${a} + ${b}) × ${c} − ${d}`;
        r = prod - d;
      } else {
        // Tier 3: a*e/e + b*c - d = a + b*c - d, ensure positive
        const base = a + b * c;
        if (base <= d) { d = base - 1; if (d < 2) d = 2; }
        s = `${a * e} ÷ ${e} + ${b} × ${c} − ${d}`;
        r = base - d;
      }
      return mk(`Hasil dari ${s} adalah ...`, r, [r + d, r - c, r + 10, r - 10, (a + b) * c],
        `Kerjakan tanda kurung, kali, dan bagi dulu, baru tambah dan kurang: ${r}.`);
    },
    t => {
      const P = [4, 6, 8, 9, 10, 12, 15, 18];
      const a = pick(P), b = pick(P.filter(x => x !== a)), k = rnd(0, t > 1 ? 2 : 1);
      if (k === 0) return mk(`KPK dari ${a} dan ${b} adalah ...`, lcm(a, b),
        [a * b, gcd(a, b), lcm(a, b) * 2, a + b],
        `Kelipatan persekutuan terkecil ${a} dan ${b} adalah ${lcm(a, b)}.`);
      if (k === 1) return mk(`FPB dari ${a * t} dan ${b * t} adalah ...`, gcd(a * t, b * t),
        [lcm(a * t, b * t), gcd(a * t, b * t) * 2, gcd(a * t, b * t) + 1, Math.abs(a - b) * t],
        `Faktor persekutuan terbesar ${a * t} dan ${b * t} adalah ${gcd(a * t, b * t)}.`);
      return mk(`Lampu merah menyala tiap ${a} detik dan lampu biru tiap ${b} detik. Keduanya menyala bersama pada detik ke-0. Keduanya menyala bersama lagi pada detik ke-...`, lcm(a, b),
        [a * b, gcd(a, b), a + b, lcm(a, b) + a],
        `Dicari KPK ${a} dan ${b} = ${lcm(a, b)}.`);
    },
    t => {
      const n = rnd(1200, 9800 * t + 1000), u = t === 1 ? 10 : t === 2 ? 100 : 1000;
      const r = Math.round(n / u) * u;
      const nm = u === 10 ? 'puluhan' : u === 100 ? 'ratusan' : 'ribuan';
      return mk(`Bilangan ${num(n)} dibulatkan ke ${nm} terdekat menjadi ...`, num(r),
        [num(Math.floor(n / u) * u), num(Math.ceil(n / u) * u), num(r + u), num(r - u)],
        `Lihat angka di kanan tempat pembulatan: jika 5 atau lebih, bulatkan ke atas.`);
    },
    t => {
      const a = rnd(3, 6 + 3 * t), b = rnd(6, 12), T = a * b;
      const c = pick([a, b, 2, 3, 4, 5, 6, 8, 9, 10, 12].filter(x => T % x === 0 && x < T));
      const r = T / c;
      return mk(`Ibu membeli ${a} kantong jeruk, tiap kantong berisi ${b} buah. Semua jeruk dibagi rata ke ${c} keranjang. Banyak jeruk di tiap keranjang adalah ...`, r,
        [T, a + b + c, r + c, r - 1],
        `Total = ${a} × ${b} = ${T}; ${T} ÷ ${c} = ${r}.`);
    },
    // NEW: Bilangan prima dan faktorisasi
    t => {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
      const p = pick(primes.slice(0, 5 + t * 3));
      const k = rnd(2, 3 + t);
      const n = p * k;
      return mk(`Faktorisasi prima dari ${n} adalah ...`, `${p} × ${k}`,
        [`${p} + ${k}`, `${p * (k + 1)}`, `${p + k}`, `${p * (k - 1)}`],
        `${n} = ${p} × ${k}. ${p} adalah bilangan prima.`);
    },
    // NEW: Pecahan campuran ke desimal
    t => {
      const w = rnd(1, 3 + t), d = pick([2, 4, 5, 8, 10]), n = rnd(1, d - 1);
      const val = w + n / d;
      const str = val.toString().replace('.', ',');
      return mk(`Bentuk desimal dari ${w} ${n}/${d} adalah ...`, str,
        [`${w},${n + d}`, `${w},${d - n}`, `${w + n},${d}`, `${w},${n * 2}`],
        `${w} ${n}/${d} = ${w} + ${n} ÷ ${d} = ${w} + ${(n/d).toFixed(2).replace('.', ',')} = ${str}.`);
    },
    // NEW: Desimal ke pecahan campuran
    t => {
      const w = rnd(1, 4), d = pick([2, 4, 5, 8, 10]), n = rnd(1, d - 1);
      const val = w + n / d;
      const str = `${w} ${n}/${d}`;
      return mk(`Bentuk pecahan campuran dari ${val.toString().replace('.', ',')} adalah ...`, str,
        [`${w} ${n + 1}/${d}`, `${w + 1} ${n}/${d}`, `${w} ${d - n}/${d}`, `${w - 1} ${n}/${d}`],
        `${val} = ${w} + ${n}/${d} = ${w} ${n}/${d}.`);
    },
    // NEW: Bilangan prima
    t => {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
      const p = pick(primes.slice(0, 6 + t * 3));
      const nonPrimes = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30];
      const opts = shuf([p, ...shuf(nonPrimes).slice(0, 3)]);
      return mk(`Mana bilangan prima di antara berikut?`, String(p),
        opts.filter(x => x !== p).slice(0, 3),
        `${p} hanya habis dibagi 1 dan ${p} sendiri.`);
    }
  ]},
  { n: 'Pecahan & Perbandingan', s: 'Pecahan', e: '➗', c: '#8e4ec6', g: [
    t => {
      const d = pick([2, 3, 4, 5, 6, 8]), n = rnd(1, d - 1), k = rnd(2, 3 + t);
      const r = `${n * k}/${d * k}`;
      return mk(`Pecahan yang senilai dengan ${n}/${d} adalah ...`, r,
        [`${n + k}/${d + k}`, `${n * k}/${d + k}`, `${n + k}/${d * k}`],
        `Kalikan pembilang dan penyebut dengan bilangan yang sama (${k}): ${r}.`);
    },
    t => {
      const D = [2, 3, 4, 5, 6, 8, 10, 12], L = [];
      while (L.length < 4) {
        const q = pick(D), p = rnd(1, q - 1), v = p / q;
        if (!L.some(x => Math.abs(x.v - v) < 1e-9)) L.push({ v, s: `${p}/${q}` });
      }
      const big = rnd(0, 1);
      const s = [...L].sort((a, b) => big ? b.v - a.v : a.v - b.v);
      return mk(`Pecahan yang paling ${big ? 'besar' : 'kecil'} di antara pilihan ini adalah ...`, s[0].s,
        L.filter(x => x !== s[0]).map(x => x.s),
        `Samakan penyebut atau ubah ke desimal: ${s[0].s} ≈ ${s[0].v.toFixed(2).replace('.', ',')}.`);
    },
    t => {
      let [b, d] = pick([[2, 4], [3, 6], [4, 8], [2, 3], [3, 4], [4, 6]].slice(0, 2 + t));
      let a = rnd(1, b - 1), c = rnd(1, d - 1);
      const L = lcm(b, d);
      let x = a * L / b, y = c * L / d;
      const sub = t > 1 && rnd(0, 1);
      if (sub && x < y) { [a, b, c, d] = [c, d, a, b]; [x, y] = [y, x]; }
      if (x === y) { /* sub stays false */ }
      const n = sub ? x - y : x + y;
      return mk(`${a}/${b} ${sub ? '−' : '+'} ${c}/${d} = ...`, fr(n, L),
        [fr(a + c, b + d), fr(a + c, L), fr(n + 1, L), fr(Math.abs(x - y) || 1, L)],
        `Samakan penyebut jadi ${L}: ${x}/${L} ${sub ? '−' : '+'} ${y}/${L} = ${fr(n, L)}.`);
    },
    t => {
      const a = rnd(1, 4), b = a + rnd(1, 4), k = rnd(3, 9 + 3 * t), tot = k * (a + b);
      const [A, B] = shuf(['Ani', 'Budi', 'Citra', 'Dedi']), n = pick(['kelereng', 'kue', 'stiker']);
      return mk(`Perbandingan ${n} ${A} dan ${B} adalah ${a} : ${b}. Jumlah ${n} mereka ${tot}. Banyak ${n} ${B} adalah ...`, b * k,
        [a * k, tot - k, b * k + k, Math.round(tot / 2)],
        `1 bagian = ${tot} ÷ ${a + b} = ${k}. ${B}: ${b} × ${k} = ${b * k}.`);
    },
    t => {
      const S = pick([100000, 200000, 500000, 1000000]);
      const x = rnd(2, 9) * t + 1;
      const km = x * S / 100000;
      return mk(`Pada peta berskala 1 : ${num(S)}, jarak dua kota pada peta ${x} cm. Jarak sebenarnya ... km.`, km,
        [km * 10, km + 5, km * 100, km + x],
        `${x} × ${num(S)} = ${num(x * S)} cm = ${km} km (1 km = 100.000 cm).`);
    },
    t => {
      const p = pick([10, 20, 25, 30, 40, 50]);
      const h = rnd(2, 20) * 5000;
      const d = h * p / 100;
      const r = h - d;
      return mk(`Sebuah tas harganya ${rp(h)}. Dalam promo ada diskon ${p}%. Harga yang harus dibayar ...`, rp(r),
        [rp(d), rp(h + d), rp(r + h / 10), rp(r - 5000)],
        `Diskon = ${p}% × ${rp(h)} = ${rp(d)}. Bayar = ${rp(h)} − ${rp(d)} = ${rp(r)}.`);
    },
    // NEW: Pecahan ke persen
    t => {
      const d = pick([4, 5, 8, 10, 20, 25]), n = rnd(1, d - 1);
      const pct = (n * 100) / d;
      const str = Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1).replace('.', ',')}%`;
      return mk(`Pecahan ${n}/${d} jika diubah ke persen menjadi ...`, str,
        [`${Math.round(pct * 10) / 10}%`, `${Math.round(pct + 5)}%`, `${Math.max(1, Math.round(pct - 5))}%`, `${100 - Math.round(pct)}%`],
        `${n}/${d} = ${n} ÷ ${d} × 100% = ${str}.`);
    },
    // NEW: Persen ke pecahan
    t => {
      const pct = pick([10, 20, 25, 40, 50, 60, 75, 80]);
      const d = 100 / gcd(pct, 100);
      const n = pct / gcd(pct, 100);
      const str = `${n}/${d}`;
      return mk(`Persentase ${pct}% jika diubah ke pecahan paling sederhana adalah ...`, str,
        [`${pct}/100`, `${n * 2}/${d * 2}`, `${n + 1}/${d}`, `${n}/${d + 1}`],
        `${pct}% = ${pct}/100 = ${n}/${d} (dibagi ${gcd(pct, 100)}).`);
    }
  ]},
{ n: 'Geometri', s: 'Geometri', e: '📐', c: '#2b8a3e', g: [
    t => {
      const p = rnd(5, 9 + 3 * t), l = rnd(3, p - 1), L = p * l;
      return t === 1 ? mk(`Persegi panjang berukuran ${p} cm × ${l} cm. Kelilingnya ... cm.`, 2 * (p + l),
        [p * l, p + l, 2 * p + l, 2 * (p + l) + 2],
        `Keliling = 2 × (${p} + ${l}) = ${2 * (p + l)} cm.`,
        { type: 'rect', p, l, labelP: 'p', labelL: 'l' })
        : mk(`Luas sebuah persegi panjang ${L} cm² dan panjangnya ${p} cm. Kelilingnya ... cm.`, 2 * (p + l),
          [L, p + l, 2 * p + l, 2 * (p + l) + 4],
          `Lebar = ${L} ÷ ${p} = ${l} cm. Keliling = 2 × (${p} + ${l}) = ${2 * (p + l)} cm.`,
          { type: 'rect', p, l, labelP: 'p', labelL: 'l' });
    },
    t => {
      const a = rnd(2, 6) * 2, b = a + rnd(1, 3) * 2, h = rnd(3, 9), s = rnd(2, 6) * 2;
      const A = [
        [`Segitiga memiliki alas ${a} cm dan tinggi ${h} cm. Luasnya ... cm².`, a * h / 2, `½ × ${a} × ${h}`, { type: 'tri', a, h, labelA: 'a', labelH: 'h' }],
        [`Trapesium memiliki sisi sejajar ${a} cm dan ${b} cm, tinggi ${h} cm. Luasnya ... cm².`, (a + b) * h / 2, `½ × (${a} + ${b}) × ${h}`, { type: 'trap', a, b, h, labelA: 'a', labelB: 'b', labelH: 'h' }],
        [`Sebuah bangun terdiri atas persegi bersisi ${s} cm dengan segitiga di atasnya (alas ${s} cm, tinggi ${h} cm). Luas seluruh bangun ... cm².`, s * s + s * h / 2, `Persegi ${s * s} + segitiga ½ × ${s} × ${h}`, { type: 'combo', s, h, labelS: 's', labelH: 'h' }]
      ][t - 1];
      return mk(A[0], A[1], [A[1] * 2, A[1] + h, A[1] - 2, a * h], `${A[2]} = ${A[1]} cm².`, A[3]);
    },
    t => {
      const s = rnd(3, 6), p = rnd(4, 9), l = rnd(3, 6), h = rnd(2, 7);
      if (t === 1) return mk(`Volume kubus dengan rusuk ${s} cm adalah ... cm³.`, s ** 3,
        [s * s, 6 * s * s, 3 * s, s ** 3 + s], `Volume = ${s}³ = ${s ** 3} cm³.`,
        { type: 'box', p: s, l: s, t: s, labelP: 's', labelL: 's', labelT: 's' });
      if (t === 2) return mk(`Balok berukuran ${p} cm × ${l} cm × ${h} cm. Volumenya ... cm³.`, p * l * h,
        [2 * (p * l + p * h + l * h), p + l + h, p * l, p * l * h + p], `Volume = ${p} × ${l} × ${h} = ${p * l * h} cm³.`,
        { type: 'box', p, l, t: h, labelP: 'p', labelL: 'l', labelT: 't' });
      return mk(`Bak berbentuk balok beralas ${p * 2} cm × ${l * 2} cm. Bak penuh berisi air ${p * l * 4 * h} cm³. Tinggi bak ... cm.`, h,
        [h * 2, h + 2, p * l * h, Math.max(1, h - 1)], `Tinggi = ${p * l * 4 * h} ÷ ${p * l * 4} = ${h} cm.`,
        { type: 'box', p: p * 2, l: l * 2, t: h, labelP: 'p', labelL: 'l', labelT: 't' });
    },
    t => {
      const x = rnd(2, 16) * 5, y = rnd(3, 15) * 5, j = pick([2, 3, 4, 5, 7, 8, 10]);
      const aj = Math.min(30 * j, 360 - 30 * j);
      const A = [
        [`Dua sudut saling berpelurus. Satu sudutnya ${x}°. Sudut yang lain ... °.`, 180 - x, 'Sudut berpelurus berjumlah 180°.'],
        [`Dua sudut sebuah segitiga ${x}° dan ${y}°. Sudut ketiga ... °.`, 180 - x - y, 'Jumlah sudut dalam segitiga 180°.'],
        [`Besar sudut terkecil antara jarum jam dan jarum menit pada pukul ${j}.00 adalah ... °.`, aj, 'Tiap jam = 30°.']
      ][t - 1];
      let fig = null;
      if (t === 1) fig = { type: 'angle', angle: x, label: `${x}°`, supplement: true };
      else if (t === 2) fig = { type: 'angle', angle1: x, angle2: y, label1: `${x}°`, label2: `${y}°` };
      else fig = { type: 'clock', hour: j, minute: 0 };
      return mk(A[0], A[1], [A[1] + 10, A[1] - 10, A[1] + 30, x], `${A[2]} Jawaban: ${A[1]}°.`, fig);
    },
    // REPLACED static with generators for sifat bangun datar/ruang
    t => {
      const shapes = [
        { q: 'Bangun datar yang memiliki 4 sumbu simetri lipat adalah ...', a: 'persegi', w: ['persegi panjang', 'belah ketupat', 'jajar genjang'], e: 'Persegi punya 4 sumbu simetri.' },
        { q: 'Banyak rusuk pada kubus adalah ...', a: '12', w: ['6', '8', '10'], e: 'Kubus: 12 rusuk, 6 sisi, 8 titik sudut.' },
        { q: 'Banyak titik sudut pada balok adalah ...', a: '8', w: ['6', '12', '4'], e: 'Balok punya 8 titik sudut.' },
        { q: 'Segitiga yang ketiga sisinya sama panjang disebut segitiga ...', a: 'sama sisi', w: ['sama kaki', 'siku-siku', 'sembarang'], e: 'Sama sisi: semua sisi sama panjang.' },
        { q: 'Jaring-jaring dari 6 persegi sama besar dapat dilipat menjadi ...', a: 'kubus', w: ['balok', 'limas', 'prisma segitiga'], e: '6 persegi sama besar membentuk kubus.' },
        { q: 'Bangun datar yang memiliki simetri putar orde 4 adalah ...', a: 'persegi', w: ['persegi panjang', 'lingkaran', 'jajar genjang'], e: 'Persegi simetris putar 90°, 180°, 270°, 360°.' },
        { q: 'Banyak sisi pada prisma segitiga adalah ...', a: '5', w: ['4', '6', '8'], e: 'Prisma segitiga: 2 segitiga + 3 persegi = 5 sisi.' },
        { q: 'Banyak rusuk pada limas segi empat adalah ...', a: '8', w: ['6', '10', '12'], e: 'Limas segi empat: 4 rusuk alas + 4 rusuk tegak = 8.' },
        { q: 'Jumlah sudut dalam segi delapan adalah ...', a: '1080', w: ['720', '900', '1260'], e: '(8-2) × 180° = 1080°.' },
        { q: 'Bangun ruang yang memiliki 1 titik puncak dan alas lingkaran adalah ...', a: 'kerucut', w: ['tabung', 'bola', 'limas'], e: 'Kerucut: 1 titik puncak, 1 alas lingkaran.' },
        { q: 'Banyak diagonal ruang pada kubus adalah ...', a: '4', w: ['2', '6', '8'], e: 'Kubus punya 4 diagonal ruang (menghubungkan titik sudut berlawanan).' },
        { q: 'Segitiga yang memiliki 2 sisi sama panjang disebut segitiga ...', a: 'sama kaki', w: ['sama sisi', 'siku-siku', 'sembarang'], e: 'Sama kaki: 2 sisi sama panjang, 2 sudut sama besar.' }
      ];
      const pool = shapes.slice(0, 5 + t * 2);
      const { q, a, w, e } = pick(pool);
      return mk(q, a, w, e);
    },
    // NEW: Luas bangun komposit
    t => {
      const a = rnd(4, 8) * 2, b = rnd(3, 6) * 2, h = rnd(3, 8);
      const luas = a * b + a * h / 2;
      return mk(`Bangun terdiri dari persegi panjang ${a}×${b} dan segitiga di atasnya (alas ${a}, tinggi ${h}). Luas total ... cm².`, luas,
        [a * b, a * b + a * h, a * b + h, a * b + a * h / 4],
        `Persegi panjang: ${a}×${b}=${a*b}. Segitiga: ½×${a}×${h}=${a*h/2}. Total: ${a*b}+${a*h/2}=${luas}.`,
        { type: 'combo', s: a, h, labelS: 's', labelH: 'h' });
    },
    // NEW: Volume tabung/kerucut
    t => {
      const r = pick([7, 14, 21]), h = rnd(5, 15);
      const useCone = rnd(0, 1);
      if (useCone) {
        const v = Math.round(Math.PI * r * r * h / 3);
        return mk(`Volume kerucut dengan jari-jari ${r} cm dan tinggi ${h} cm adalah ... cm³. (π=22/7)`, v,
          [v * 3, v * 2, v / 3, Math.round(Math.PI * r * r * h)],
          `Volume kerucut = ⅓ × π × r² × t = ⅓ × 22/7 × ${r}² × ${h} = ${v}.`,
          { type: 'box', p: r * 2, l: r * 2, t: h, labelP: 'r', labelL: 'r', labelT: 't', isCone: true });
      } else {
        const v = Math.round(Math.PI * r * r * h);
        return mk(`Volume tabung dengan jari-jari ${r} cm dan tinggi ${h} cm adalah ... cm³. (π=22/7)`, v,
          [Math.round(v / 2), Math.round(v * 2), Math.round(Math.PI * r * h), Math.round(Math.PI * r * r)],
          `Volume tabung = π × r² × t = 22/7 × ${r}² × ${h} = ${v}.`,
          { type: 'box', p: r * 2, l: r * 2, t: h, labelP: 'r', labelL: 'r', labelT: 't', isCylinder: true });
      }
    },
    // NEW: Sudut jarum jam variasi
    t => {
      const h = rnd(1, 11), m = pick([0, 15, 30, 45]);
      const hourAngle = 30 * h + 0.5 * m;
      const minAngle = 6 * m;
      let diff = Math.abs(hourAngle - minAngle);
      diff = Math.min(diff, 360 - diff);
      return mk(`Sudut terkecil antara jarum jam pada pukul ${h}:${String(m).padStart(2, '0')} adalah ... °.`, Math.round(diff),
        [Math.round(diff) + 15, Math.round(diff) - 15, 180 - Math.round(diff), 90],
        `Jam: ${h}×30+${m}×0.5=${hourAngle}°. Menit: ${m}×6=${minAngle}°. Selisih: ${Math.round(diff)}°.`,
        { type: 'clock', hour: h, minute: m });
    }
  ]},
  { n: 'Pengukuran', s: 'Ukur', e: '⏱️', c: '#e08a00', g: [
    t => {
      const s = rnd(6, 16) * 60 + pick([0, 5, 10, 15, 20, 30, 45]);
      const dm = pick([25, 35, 50, 75, 95]);
      const n = rnd(2, 3);
      const f = d => d < 60 ? `${d} menit` : `${Math.floor(d / 60)} jam` + (d % 60 ? ` ${d % 60} menit` : '');
      const e = s + n * dm;
      if (t === 1) return mk(`Dina berangkat pukul ${hh(s)}. Perjalanan ${dm} menit. Dina sampai pukul ...`, hh(s + dm),
        [hh(s + dm + 10), hh(s + dm - 10), hh(s + dm + 20)], `${hh(s)} + ${dm} menit = ${hh(s + dm)}.`);
      if (t === 2) return mk(`Film dimulai pukul ${hh(s)} dan selesai pukul ${hh(s + dm)}. Lama film itu ...`, f(dm),
        [f(dm + 10), f(dm - 10), f(dm + 25)], `${hh(s + dm)} − ${hh(s)} = ${f(dm)}.`);
      return mk(`Les dimulai pukul ${hh(s)}. Ada ${n} pelajaran, tiap pelajaran ${dm} menit, tanpa istirahat. Les selesai pukul ...`, hh(e),
        [hh(e + dm), hh(e - 10), hh(s + dm + 10)], `${n} × ${dm} = ${n * dm} menit. ${hh(s)} + ${n * dm} menit = ${hh(e)}.`);
    },
    t => {
      const U = [['km', 'm', 1000], ['m', 'cm', 100], ['kg', 'gram', 1000], ['liter', 'mL', 1000], ['ton', 'kg', 1000], ['jam', 'menit', 60]];
      const [a, b, f] = pick(U);
      const v = t === 1 ? rnd(2, 9) : pick([1.5, 2.5, 3.5, 0.5, 4.2, 6.8]);
      const r = Math.round(v * f);
      const vs = String(v).replace('.', ',');
      return mk(`${vs} ${a} = ... ${b}`, num(r),
        [num(r * 10), num(Math.round(r / 10)), num(r + f), num(r + f / 2)],
        `1 ${a} = ${f} ${b}, jadi ${vs} × ${f} = ${num(r)}.`);
    },
    t => {
      const v = pick([30, 40, 45, 60, 80]), h = rnd(2, 5);
      const s0 = rnd(6, 9) * 60 + pick([0, 30]);
      if (t === 1) return mk(`Mobil melaju ${v} km/jam selama ${h} jam. Jarak yang ditempuh ... km.`, v * h,
        [v + h, v * h + v, v * h - v, v * h * 2], `Jarak = ${v} × ${h} = ${v * h} km.`);
      if (t === 2) return mk(`Jarak kota A ke B ${v * h} km. Motor melaju ${v} km/jam. Lama perjalanan ... jam.`, h,
        [h + 1, h - 1, v, h * 2], `Waktu = ${v * h} ÷ ${v} = ${h} jam.`);
      return mk(`Budi naik motor dari pukul ${hh(s0)} dengan kecepatan ${v} km/jam menuju kota sejauh ${v * h} km. Budi tiba pukul ...`, hh(s0 + h * 60),
        [hh(s0 + h * 60 + 30), hh(s0 + (h + 1) * 60), hh(s0 + (h - 1) * 60)],
        `Waktu = ${v * h} ÷ ${v} = ${h} jam. ${hh(s0)} + ${h} jam = ${hh(s0 + h * 60)}.`);
    },
    // REPLACED static with generators for estimasi & pemilihan satuan
    t => {
      const items = [
        { q: 'Tinggi pintu rumah sekitar ...', a: '2 m', w: ['2 cm', '20 cm', '200 m'], e: 'Pintu rumah kira-kira 2 meter tinggi.' },
        { q: 'Berat seekor ayam dewasa sekitar ...', a: '2 kg', w: ['2 g', '20 kg', '200 kg'], e: 'Ayam dewasa kira-kira 2 kilogram.' },
        { q: 'Isi satu gelas air sekitar ...', a: '250 mL', w: ['250 L', '25 L', '2,5 mL'], e: 'Gelas standar kira-kira 250 mL.' },
        { q: 'Lama menggosok gigi yang wajar sekitar ...', a: '3 menit', w: ['3 jam', '30 menit', '3 detik'], e: 'Dokter gigi sarankan 2-3 menit.' },
        { q: 'Panjang pensil baru sekitar ...', a: '17 cm', w: ['17 m', '1,7 mm', '170 cm'], e: 'Pensil standar kira-kira 17-19 cm.' },
        { q: 'Berat satu buah apel sekitar ...', a: '150 g', w: ['15 g', '1,5 kg', '150 kg'], e: 'Apel sedang kira-kira 150 gram.' },
        { q: 'Ketinggian meja belajar standar sekitar ...', a: '75 cm', w: ['7,5 m', '75 m', '7,5 cm'], e: 'Meja anak SD kira-kira 70-75 cm.' },
        { q: 'Isi satu botol minum kecil sekitar ...', a: '350 mL', w: ['35 mL', '3,5 L', '35 L'], e: 'Botol minum anak sekolah kira-kira 350 mL.' },
        { q: 'Jarak rumah ke sekolah (dekat) sekitar ...', a: '500 m', w: ['50 m', '5 km', '50 km'], e: 'Jarak jalan kaki 5-10 menit ≈ 500 m.' },
        { q: 'Lama tidur anak SD per malam seharusnya ...', a: '10 jam', w: ['10 menit', '10 detik', '1 jam'], e: 'Anak usia sekolah butuh tidur 9-11 jam.' }
      ];
      const pool = items.slice(0, 5 + t * 2);
      const { q, a, w, e } = pick(pool);
      return mk(q, a, w, e);
    },
    // NEW: Konversi luas (m², cm², km², ha)
    t => {
      const U = [
        ['m²', 'cm²', 10000],
        ['ha', 'm²', 10000],
        ['km²', 'ha', 100],
        ['ha', 'cm²', 100000000]
      ];
      const [a, b, f] = pick(U);
      const v = t === 1 ? rnd(2, 9) : pick([0.5, 1.5, 2.5, 3.5]);
      const r = Math.round(v * f);
      const vs = String(v).replace('.', ',');
      return mk(`${vs} ${a} = ... ${b}`, num(r),
        [num(r * 10), num(Math.round(r / 10)), num(r + f), num(r + f / 2)],
        `1 ${a} = ${f} ${b}, jadi ${vs} × ${f} = ${num(r)}.`);
    },
    // NEW: Kecepatan rata-rata (km/jam, m/detik)
    t => {
      const d = pick([100, 200, 300, 400, 500]), t2 = pick([2, 4, 5, 8, 10]);
      const v1 = d / t2;
      const v2 = Math.round(v1 * 1000 / 3600);
      const useMs = rnd(0, 1);
      if (useMs) {
        return mk(`Mobil menempuh ${d} km dalam ${t2} jam. Kecepatan rata-rata ... m/detik.`, v2,
          [v2 + 5, v2 - 5, v2 * 2, Math.round(v1)],
          `${d} km = ${d * 1000} m. ${t2} jam = ${t2 * 3600} detik. Kecepatan = ${d * 1000} ÷ ${t2 * 3600} ≈ ${v2} m/detik.`);
      } else {
        return mk(`Motor melaju ${v1} km/jam. Kecepatan tersebut setara dengan ... m/detik.`, v2,
          [v2 + 10, v2 - 10, Math.round(v1 / 2), v2 * 3],
          `${v1} km/jam = ${v1} × 1000 ÷ 3600 ≈ ${v2} m/detik.`);
      }
    },
    // NEW: Suhu (Celcius, Fahrenheit, Reamur) - hanya Celcius & Reamur untuk SD
    t => {
      const c = rnd(0, 40); // Non-negative for SD
      const r = Math.round(c * 4 / 5);
      return mk(`Suhu ${c}°C jika diukur dengan termometer Reamur adalah ... °R.`, `${r}°R`,
        [`${r + 8}°R`, `${r - 8}°R`, `${c}°R`, `${Math.round(c * 9 / 5 + 32)}°R`],
        `°R = ⁴/₅ × °C. ${c} × ⁴/₅ = ${r}°R.`);
    },
    // NEW: Waktu (konversi jam-menit-detik)
    t => {
      const h = rnd(1, 5), m = rnd(10, 55), s = rnd(10, 55);
      const totalSec = h * 3600 + m * 60 + s;
      const useHours = rnd(0, 1);
      if (useHours) {
        const target = `${h} jam ${m} menit ${s} detik`;
        return mk(`${target} = ... detik.`, num(totalSec),
          [num(totalSec + 60), num(totalSec - 60), num(totalSec + 3600), num(h * 3600)],
          `${h} jam = ${h * 3600} dtk. ${m} menit = ${m * 60} dtk. Total = ${totalSec} detik.`);
      } else {
        const totalMin = h * 60 + m;
        return mk(`${h} jam ${m} menit = ... menit.`, num(totalMin),
          [num(totalMin + 10), num(totalMin - 10), num(h * 60), num((h + 1) * 60)],
          `${h} jam = ${h * 60} menit. + ${m} menit = ${totalMin} menit.`);
      }
    }
  ]},
  { n: 'Data', s: 'Data', e: '📊', c: '#0d7fd1', g: [
    t => {
      const it = shuf([['🍎', 'apel'], ['🍌', 'pisang'], ['🍊', 'jeruk'], ['🍇', 'anggur']]).slice(0, 3);
      const u = t === 1 ? 2 : pick([5, 10, 20]);
      const n = shuf([2, 3, 4, 5, 6, 7]).slice(0, 3);
      const h = `Piktogram penjualan buah (1 gambar = ${u} kg):\n` + it.map((x, i) => `${x[1]}: ${x[0].repeat(n[i])}`).join('\n');
      const r = rnd(0, 2);
      const S = n.reduce((a, b) => a + b);
      const mx = Math.max(...n), mn = Math.min(...n);
      if (r === 0) return mk(`${h}\nJumlah seluruh buah yang terjual ... kg.`, S * u,
        [S, S * u + u, (S - 1) * u, mx * u], `${S} gambar × ${u} kg = ${S * u} kg.`);
      if (r === 1) return mk(`${h}\nSelisih penjualan buah terbanyak dan tersedikit ... kg.`, (mx - mn) * u,
        [mx - mn, (mx + mn) * u, mx * u, (mx - mn + 1) * u], `Selisih ${mx} − ${mn} = ${mx - mn} gambar; × ${u} = ${(mx - mn) * u} kg.`);
      const w = it[n.indexOf(mx)][1];
      return mk(`${h}\nBuah yang paling banyak terjual adalah ...`, w,
        it.map(x => x[1]).filter(x => x !== w).concat(['semua sama banyak']),
        `Gambar terbanyak: ${w}.`);
    },
    t => {
      const V = [5, 6, 7, 8, 9, 10].slice(0, 3 + t);
      const c = V.map(() => rnd(2, 9));
      const k = V[rnd(1, V.length - 2)];
      const r = V.reduce((s, v, i) => s + (v >= k ? c[i] : 0), 0);
      const tot = c.reduce((a, b) => a + b);
      return mk(`Tabel nilai ulangan:\n${V.map((v, i) => `Nilai ${v}: ${c[i]} siswa`).join('\n')}\nBanyak siswa yang mendapat nilai ${k} atau lebih ...`, r,
        [tot, r + c[0], r - 1, tot - c[V.indexOf(k)]], `Jumlahkan siswa dengan nilai ${k} ke atas: ${r} siswa.`);
    },
    t => {
      const k = t === 1 ? 3 : 8;
      const m = t === 1 ? rnd(10, 20) : rnd(6, 9) * 10;
      const x = [0, 0, 0, 0].map(() => m + rnd(-k, k));
      const sx = x.reduce((a, b) => a + b);
      const f = m * 5 - sx;
      const r = rnd(0, 2);
      if (r === 0) return mk(`Rata-rata dari data ${shuf([...x, f]).join(', ')} adalah ...`, m,
        [m + 1, m - 1, m + k, f], `Jumlah data = ${m * 5}; dibagi 5 = ${m}.`);
      if (r === 1) return mk(`Rata-rata 5 nilai adalah ${m}. Empat nilai di antaranya: ${x.join(', ')}. Nilai kelima adalah ...`, f,
        [m, f + k, f - 1, m * 5], `Jumlah semua = 5 × ${m} = ${m * 5}. Nilai kelima = ${m * 5} − ${sx} = ${f}.`);
      const md = rnd(3, 9);
      const o = shuf([1, 2, 4, 5, 6, 7, 8, 9, 10].filter(v => v !== md)).slice(0, 4);
      const L = shuf([md, md, md, ...o]);
      const s = [...L].sort((a, b) => a - b);
      const q = t < 3;
      return mk(`Data: ${L.join(', ')}. ${q ? 'Modus' : 'Median'} data tersebut adalah ...`, q ? md : s[3],
        q ? [s[3], o[0], s[0]] : [md, s[2], s[4], s[6]],
        q ? `Modus = nilai yang paling sering muncul: ${md}.` : `Urutkan: ${s.join(', ')}. Median = nilai tengah = ${s[3]}.`);
    },
    // NEW: Diagram batang (teks)
    t => {
      const items = shuf(['Apel', 'Pisang', 'Jeruk', 'Anggur', 'Mangga', 'Pepaya']).slice(0, 4);
      const vals = items.map(() => rnd(5, 20) * 5);
      const maxVal = Math.max(...vals);
      const maxIdx = vals.indexOf(maxVal);
      const h = `Diagram batang penjualan:\n` + items.map((x, i) => `${x}: ${'█'.repeat(vals[i] / 5)} (${vals[i]})`).join('\n');
      return mk(`${h}\nBuah dengan penjualan tertinggi adalah ...`, items[maxIdx],
        items.filter((_, i) => i !== maxIdx),
        `Batang tertinggi: ${items[maxIdx]} (${maxVal}).`);
    },
    // NEW: Rata-rata gabungan (dua kelompok)
    t => {
      const n1 = rnd(5, 15), m1 = rnd(60, 90);
      const n2 = rnd(5, 15), m2 = rnd(60, 90);
      const combined = Math.round((n1 * m1 + n2 * m2) / (n1 + n2));
      return mk(`Kelompok A: ${n1} orang, rata-rata ${m1}. Kelompok B: ${n2} orang, rata-rata ${m2}. Rata-rata gabungan ...`, combined,
        [Math.round((m1 + m2) / 2), m1, m2, Math.round((n1 * m1 + n2 * m2) / (n1 + n2) + 5)],
        `Total nilai A = ${n1} × ${m1} = ${n1 * m1}. B = ${n2} × ${m2} = ${n2 * m2}. Gabungan = (${n1 * m1} + ${n2 * m2}) ÷ ${n1 + n2} = ${combined}.`);
    },
    // NEW: Peluang sederhana (koin, dadu, spinner)
    t => {
      const type = pick(['koin', 'dadu', 'spinner']);
      if (type === 'koin') {
        const n = rnd(2, 4);
        const p = 1 / Math.pow(2, n);
        return mk(`Peluang mendapatkan ${n} kali 'angka' berturut-turut saat melempar koin adalah ...`, `1/${Math.pow(2, n)}`,
          [`1/${n * 2}`, `1/${n + 2}`, `1/${Math.pow(2, n - 1)}`, `1/${Math.pow(2, n + 1)}`],
          `Setiap lempar: ½. ${n} kali: (½)${'^'.repeat(n)} = 1/${Math.pow(2, n)}.`);
      } else if (type === 'dadu') {
        const target = pick([1, 2, 3, 4, 5, 6]);
        return mk(`Peluang muncul angka ${target} pada lemparan satu dadu adalah ...`, '1/6',
          ['1/3', '1/2', '1/12', '1/36'],
          'Dadu 6 sisi sama, peluang tiap angka = 1/6.');
      } else {
        const parts = pick([4, 5, 6, 8, 10]);
        return mk(`Spinner dibagi ${parts} bagian sama. Peluang berhenti di bagian merah (1 bagian) ...`, `1/${parts}`,
          [`1/${parts - 1}`, `1/${parts + 1}`, `2/${parts}`, `1/${parts * 2}`],
          `${parts} bagian sama, 1 merah: peluang = 1/${parts}.`);
      }
    },
    // NEW: Rata-rata tertimbang
    t => {
      const n1 = rnd(3, 8), w1 = rnd(2, 5), v1 = rnd(60, 90);
      const n2 = rnd(3, 8), w2 = rnd(2, 5), v2 = rnd(60, 90);
      const avg = Math.round((n1 * w1 * v1 + n2 * w2 * v2) / (n1 * w1 + n2 * w2));
      return mk(`Kelas A: ${n1} siswa, bobot ${w1}, rata-rata ${v1}. Kelas B: ${n2} siswa, bobot ${w2}, rata-rata ${v2}. Rata-rata tertimbang ...`, avg,
        [Math.round((v1 + v2) / 2), v1, v2, avg + 5],
        `Terbobot: (${n1}×${w1}×${v1} + ${n2}×${w2}×${v2}) ÷ (${n1}×${w1} + ${n2}×${w2}) = ${avg}.`);
    },
    // NEW: Data pencilan (outlier)
    t => {
      const base = rnd(10, 20);
      const data = [base, base + 1, base - 1, base + 2, base - 2, base + 15]; // 1 outlier
      const mean = Math.round(data.reduce((a, b) => a + b) / data.length);
      return mk(`Data: ${data.join(', ')}. Nilai yang mencolok (pencilan) adalah ...`, String(base + 15),
        [String(base), String(base + 1), String(base - 1), String(base + 2)],
        `Nilai ${base + 15} jauh berbeda dari yang lain (${base}±2). Disebut pencilan/outlier.`);
    }
  ]},
  { n: 'Penalaran', s: 'Nalar', e: '🧠', c: '#d6409f', g: [
    t => {
      const s = rnd(1, 6), st = rnd(2, 5), e = rnd(1, 3), k = rnd(2, 3);
      const L = [s];
      for (let i = 0; i < 5; i++) L.push(t === 1 ? L[i] + st : t === 2 ? L[i] + st + e * i : (i % 2 ? L[i] * k : L[i] + st));
      const a = L[4];
      const ex = [`Selisih selalu ${st}.`, `Selisih tiap suku bertambah ${e}.`, `Berselang-seling: tambah ${st}, lalu kali ${k}.`][t - 1];
      return mk(`Lengkapi pola bilangan: ${L.slice(0, 4).join(', ')}, ...`, a,
        [a + 1, a - 1, a + st, L[3] + st + e], `${ex} Suku berikutnya: ${a}.`);
    },
    t => {
      const E = ['🍎', '🍌', '🍇', '⭐', '🔷', '🐱'];
      const s = shuf(E).slice(0, 3);
      const pt = pick([[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1, 2], [0, 0, 1, 1, 2]].slice(0, t + 2));
      const f = i => s[pt[i % pt.length]];
      const n = pt.length * 2 + rnd(1, 2);
      const a = [];
      for (let i = 0; i < n; i++) a.push(f(i));
      const r = f(n);
      return mk(`Gambar apa yang muncul berikutnya?\n${a.join(' ')} ❓`, r,
        s.filter(x => x !== r).concat(E.filter(x => !s.includes(x))),
        'Temukan kelompok gambar yang berulang, lalu lanjutkan.');
    },
    t => {
      const n = shuf(['Andi', 'Bella', 'Cindy', 'Dodi', 'Eka']).slice(0, t < 3 ? 3 : 4);
      const st = shuf(n.slice(1).map((x, i) => rnd(0, 1) ? `${n[i]} lebih tinggi dari ${x}` : `${x} lebih pendek dari ${n[i]}`));
      const i = t < 3 ? pick([0, n.length - 1]) : pick([0, 1, n.length - 1]);
      const lb = i === 0 ? 'paling tinggi' : i === n.length - 1 ? 'paling pendek' : 'tertinggi kedua';
      return mk(`${st.join('. ')}.\nSiapa yang ${lb}?`, n[i],
        n.filter((_, j) => j !== i).concat(['Tidak bisa ditentukan']).slice(0, 3),
        `Urutan dari tertinggi: ${n.join(', ')}.`);
    },
    t => {
      const x = rnd(3, 9), k = rnd(2, 4), T = x * (k + 1);
      const a = rnd(15, 40), b = rnd(5, a - 2), n = rnd(2, 5);
      const p = rnd(2, 9) * 1000, q = rnd(1, 5) * 500, rest = rnd(1, 9) * 1000;
      const M = n * p + q + rest;
      const A = [
        () => mk(`Rina membawa ${rp(M)}. Ia membeli ${n} buku @${rp(p)} dan sebuah pensil ${rp(q)}. Sisa uang Rina ...`, rp(rest),
          [rp(M - n * p), rp(M - q), rp(rest + q), rp(n * p + q)],
          `Belanja = ${n} × ${rp(p)} + ${rp(q)} = ${rp(n * p + q)}. Sisa = ${rp(M)} − ${rp(n * p + q)} = ${rp(rest)}.`),
        () => mk(`Umur ayah ${k} kali umur Dina. Jumlah umur mereka ${T} tahun. Umur Dina ... tahun.`, x,
          [x * k, Math.round(T / 2), T - k, x + k], `${k + 1} bagian = ${T}, 1 bagian = ${x}. Umur Dina ${x}.`),
        () => mk(`Jumlah dua bilangan ${a + b} dan selisihnya ${a - b}. Bilangan yang lebih besar adalah ...`, a,
          [b, a + b, a - b, a + 2], `Besar = (jumlah + selisih) ÷ 2 = (${a + b} + ${a - b}) ÷ 2 = ${a}.`)
      ];
      return A[rnd(0, Math.min(2, t))]();
    },
    // NEW: Logika "jika-maka" (kondisional)
    t => {
      const names = shuf(['Ani', 'Budi', 'Citra', 'Dedi', 'Eka']).slice(0, 3);
      const condType = rnd(0, 2);
      let cond, explanation;
      if (condType === 0) {
        cond = `Jika ${names[0]} pergi, maka ${names[1]} ikut.`;
        explanation = `${names[1]} ikut karena ${names[0]} pergi.`;
      } else if (condType === 1) {
        cond = `Jika ${names[0]} tidak pergi, maka ${names[1]} tetap pergi.`;
        explanation = `${names[1]} tetap pergi meski ${names[0]} tidak pergi.`;
      } else {
        cond = `${names[0]} pergi hanya jika ${names[1]} pergi.`;
        explanation = `${names[0]} pergi → ${names[1]} pasti pergi (hanya jika).`;
      }
      const scenario = rnd(0, 1);
      if (scenario === 0) {
        return mk(`${cond}\nDiketahui ${names[0]} pergi. Siapa yang pasti ikut pergi?`, names[1],
          [names[2], 'Tidak bisa ditentukan', 'Keduanya tidak pergi'],
          explanation);
      } else {
        return mk(`${cond}\nDiketahui ${names[1]} tidak pergi. Siapa yang pasti tidak pergi?`, names[0],
          [names[2], 'Tidak bisa ditentukan', 'Keduanya pergi'],
          `Kontraposisi: ${names[1]} tidak pergi → ${names[0]} tidak pergi.`);
      }
    },
    // NEW: Pola gambar bergeser (rotasi, translasi)
    t => {
      const shapes = ['▲', '■', '●', '★', '◆'];
      const s = shuf(shapes).slice(0, 3);
      const ops = ['rotate', 'flip', 'shift'];
      const op = pick(ops);
      let seq = [], next = '';
      if (op === 'rotate') {
        seq = [s[0], s[1], s[2], s[0], s[1]];
        next = s[2];
      } else if (op === 'flip') {
        seq = [s[0], s[1], s[0], s[1], s[0]];
        next = s[1];
      } else {
        seq = [s[0], s[1], s[2], s[0], s[1]];
        next = s[2];
      }
      return mk(`Pola: ${seq.slice(0, 4).join(' → ')} → ...\nMana yang melengkapi pola?`, next,
        s.filter(x => x !== next).concat(shapes.filter(x => !s.includes(x))).slice(0, 3),
        `Pola ${op === 'rotate' ? 'berputar' : op === 'flip' ? 'bolak-balik' : 'bergeser'}: ${next} berikutnya.`);
    },
    // NEW: Perbandingan kuantitatif (lebih dari, kurang dari)
    t => {
      const names = shuf(['Ani', 'Budi', 'Citra', 'Dedi', 'Eka']).slice(0, 3);
      const a = rnd(10, 50), b = rnd(10, 50), c = rnd(10, 50);
      const statements = [
        `${names[0]} punya ${a} kelereng. ${names[1]} punya ${b} kelereng lebih dari ${names[0]}. ${names[2]} punya ${c} kelereng kurang dari ${names[1]}.`,
        `Tinggi ${names[0]} ${a} cm. ${names[1]} ${b} cm lebih tinggi dari ${names[0]}. ${names[2]} ${c} cm lebih pendek dari ${names[1]}.`
      ];
      const st = pick(statements);
      const n1 = a, n2 = a + b, n3 = a + b - c;
      const max = Math.max(n1, n2, n3);
      const who = max === n1 ? names[0] : max === n2 ? names[1] : names[2];
      return mk(`${st}\nSiapa yang paling banyak/tinggi?`, who,
        names.filter(x => x !== who).concat(['Semua sama']),
        `${names[0]}: ${n1}, ${names[1]}: ${n2}, ${names[2]}: ${n3}. Terbesar: ${who} (${max}).`);
    },
    // NEW: Deduksi sederhana (semua, beberapa, tidak)
    t => {
      const categories = ['buah', 'hewan', 'warna', 'bentuk'];
      const cat = pick(categories);
      const items = cat === 'buah' ? ['apel', 'pisang', 'jeruk', 'mangga'] :
                    cat === 'hewan' ? ['kucing', 'anjing', 'burung', 'ikan'] :
                    cat === 'warna' ? ['merah', 'biru', 'hijau', 'kuning'] :
                    ['segitiga', 'persegi', 'lingkaran', 'oval'];
      const all = shuf(items); // Use all 4 items
      const some = shuf(all).slice(0, 2);
      const rule = pick([
        `Semua ${cat} di kotak berwarna merah.`,
        `Beberapa ${cat} di kotak berwarna biru.`,
        `Tidak ada ${cat} di kotak berwarna hijau.`
      ]);
      const q = pick([
        `Apakah ${all[0]} pasti di kotak merah?`,
        `Apakah ${all[3]} mungkin di kotak biru?`, // all[3] exists now
        `Apakah ${all[0]} tidak mungkin di kotak hijau?`
      ]);
      const ans = q.includes('tidak mungkin') ? 'Ya' : q.includes('pasti') ? 'Ya' : 'Mungkin';
      const opts = ['Ya', 'Tidak', 'Mungkin'].filter(x => x !== ans).slice(0, 3);
      return mk(`${rule}\n${q}`, ans, opts, rule);
    }
  ]}
];

let used = new Set();

function Q(di, t) {
  let q;
  for (let i = 0; i < 12; i++) {
    q = pick(DM[di].g)(t);
    if (!used.has(q.q)) break;
  }
  used.add(q.q);
  return q;
}

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DM, Q, mk, used, parseNilai, formatNilai, generateDistractors };
}
// Export for browser
if (typeof window !== 'undefined') {
  window.DM = DM;
  window.Q = Q;
  window.mk = mk;
  window.used = used;
  window.parseNilai = parseNilai;
  window.formatNilai = formatNilai;
  window.generateDistractors = generateDistractors;
}