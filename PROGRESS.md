# Labirin Penguasa TKA - Progress Report

## Project Overview
Game labirin 2D untuk melatih siswa SD menghadapi TKA Matematika. Murni **HTML + JS + CSS**, tanpa build, tanpa framework, di-host di GitHub Pages.

## Current Status: Phase 6 Complete (of 7 Phases)

---

## Phase 0: Refactor + Test Infrastructure ✅
**Commit:** `1f36b55`, `adf995f`

### Changes:
- **Pecah `script.js`** → 6 modul terpisah di `js/`:
  - `util.js` - RNG, shuffle, gcd/lcm, format angka
  - `questions.js` - Bank soal (DM), `mk()`, `Q()`, `parseNilai()`, `generateDistractors()`
  - `maze.js` - Generator labirin (`gen`, `bfs`, `ek`, `LV`, `generateMazeWithMinPath`, `createGates`, `findFurthestCell`)
  - `storage.js` - Wrapper localStorage aman (untuk Phase 5)
  - `audio.js` - WebAudio sintetis (untuk Phase 6)
  - `game.js` - Logika utama game (DENGAN DOM)

- **RNG Seedable** (mulberry32): `setSeed()`, `clearSeed()`, `rand()` - menggantikan `Math.random()`

- **Perbaiki `mk()`**:
  - `parseNilai()` & `generateDistractors()` untuk pengecoh format sama (Rp, satuan, pecahan, jam)
  - Hapus opsi negatif & "Pilihan N", fallback jadi "Opsi A/B/C"
  - Fix `const` → `let` untuk destructuring assignment

- **Test Infrastructure**:
  - `tests/load.js` - Load modul di Node VM
  - `tests/generate-snapshot.js` - Generate 5400 soal baseline
  - `tests/questions.test.js` - Snapshot consistency + 100k quality check
  - `tests/maze.test.js` - Maze generation verification
  - `tests/run.js` - Test runner

- **Window exports** untuk semua modul agar bisa dipakai di browser

### Test Results:
```
✓ 5400 questions match snapshot
✓ 100k random calls: tanpa exception, 4 opsi unik, tidak negatif, tidak "Pilihan N", tidak NaN
```

---

## Phase 1: Perbaikan Kualitas Soal ✅
**Commit:** `adf995f`

### Changes:
- **Semua domain minimal 8 generator** (sebelumnya 3-6):
  - **Bilangan (8)**: +4 generator (prima, faktorisasi, pecahan campuran↔desimal)
  - **Pecahan & Perbandingan (8)**: +2 generator (persen↔pecahan)
  - **Geometri (8)**: ganti 5 statis jadi generator 12 butir, +3 generator (komposit, tabung/kerucut, sudut jam variasi)
  - **Pengukuran (8)**: ganti 4 statis jadi generator 10 butir, +4 generator (luas, kecepatan m/detik, suhu Reamur, waktu)
  - **Data (8)**: +5 generator (diagram batang, rata-rata gabungan, peluang, rata-rata tertimbang, outlier)
  - **Penalaran (8)**: +4 generator (jika-maka, pola gambar, perbandingan kuantitatif, deduksi)

- Setiap butir statis diganti generator, tetap punya `exp` (penjelasan)
- Semua soal punya 4 opsi unik, tidak negatif, tidak "Pilihan N", tidak NaN

---

## Phase 3: Isi Peta (Koin, Peti, Power-Up) ✅
**Commit:** `TBD`

### Changes:
- **`placeItems()`** in `maze.js` - places coins (🪙) and chests (🎁) in dead-end cells
  - Coins placed in random dead ends (not start/finish, not on doors)
  - Chests placed in furthest dead ends from start
  - No overlap between coins, chests, or doors
- **Coin collection** - auto-collect when stepping on coin cell (+1 🪙, +1 ⭐, sound)
- **Chest bonus** - opens 1 medium-difficulty question, correct = +5 🪙 +20 ⭐, wrong = no penalty, shows explanation
- **Power-ups** (disabled in exam mode):
  - **50:50** (3 🪙) - hides 2 wrong options in current question
  - **Ganti soal** (3 🪙) - swaps to new question same domain/tier, streak preserved
  - **Lihat jalur** (5 🪙) - shows shortest path to finish for 4 seconds
- **HUD** - added coin counter (🪙)
- **CONFIG updated** - all rewards/prices centralized
- **Items rendered before fog** - hidden in unexplored areas
- **Visual** - path hint drawn as dotted yellow line

### Test Results:
- 100 iterations per level: No coin/chest overlap ✓, No items on doors ✓, All items in dead ends ✓
- Average coins: L1≈4.7/6, L2≈6.9/8, L3≈9.6/10 (limited by available dead ends)
- Average chests: L1=1/1, L2=2/2, L3=2/2
- All maze tests pass: minPath ✓, gate gaps ✓, easy/hard labels ✓
- All question tests pass: snapshot ✓, 100k quality ✓

---

## Phase 4: Visual Soal (Gambar Bangun Geometri) ✅
**Commit:** `TBD`

### Changes:
- **Extended `mk()`** in `questions.js` with optional `fig` parameter for figure descriptions
- **Added `drawFigure(ctx, fig, width, height, color, textColor, dpr)`** in `game.js` supporting 7 figure types:
  - `rect`: Persegi panjang dengan label sisi (p, l)
  - `tri`: Segitiga dengan alas & tinggi (garis putus-putus, tanda siku)
  - `trap`: Trapesium dengan dua sisi sejajar & tinggi
  - `combo`: Persegi + segitiga di atasnya (bangun komposit)
  - `box`: Balok/kubus proyeksi isometrik (label p, l, t)
  - `angle`: Busur sudut dengan dua garis (sudut berpelurus, segitiga)
  - `clock`: Jam analog (sudut jarum jam)
- **Attached `fig` to all geometry generators** (keliling, luas, volume, sudut, jam)
- **Canvas rendering** in question overlay: auto-sized, respects `devicePixelRatio`, uses CSS variables for dark/light mode
- **Responsive**: Max width 260px, doesn't overflow card (`max-height:92vh; overflow:auto`)
- **Test validation**: 4,476 geometry questions with figures validated (type known, all numeric params finite)

### Test Results:
- All existing tests pass: snapshot ✓, 100k quality ✓, unique questions ✓
- New figure validation: 4,476 figures checked ✓
- All maze tests pass: minPath ✓, gate gaps ✓, item placement ✓

---

## Phase 5: Progres Tersimpan, Level Terkunci, Bintang, Mastery, Latihan Topik Lemah ✅
**Commit:** `TBD`

### Changes:
- **`storage.js`** - Added pure functions for progress tracking:
  - `calculateStars({examScore, heartsAtFinish, levelPass, examSize})` - Returns 0-3 stars
  - `pickWeakTopics(mastery, minAnswers=5)` - Picks 2 weakest domains (min 5 answers each)
  - `generateWeakTopicQuestions({DM, Q, weakTopics, tier, countPerTopic=5})` - Generates 10 mixed questions
  - Robust localStorage wrapper with memory fallback, version check, and merge defaults
- **`game.js`** - Full progress integration:
  - **Level lock/unlock**: Level 2 unlocks after passing Level 1 exam, Level 3 after Level 2
  - **Stars per level**: ★ pass exam; ★★ pass + hearts≥3 at finish; ★★★ perfect 12/12
  - **Mastery tracking**: 6 domain bars in menu showing % correct (labirin + ujian)
  - **Coins persistence**: Coins saved across levels and sessions
  - **Latihan Topik Lemah**: 10 soal (5 per 2 weakest domains), no hearts/power-ups, +1 🪙 per correct (max 10)
  - **Reset Progres**: Two-step confirmation dialog, clears all data
  - **Menu updates**: Shows 🔒 for locked levels, stars (★★★), mastery bars with percentages
- **`style.css`** - Added `.mastery-bar`, `.menu-extras`, `.lv button[disabled]` styles

### Test Results:
- Storage tests: 27 passed (calculateStars, pickWeakTopics, generateWeakTopicQuestions, persistence, corrupted data)
- All existing tests pass: questions (1.7M+), maze (9), storage (27)
- Stars: 0 (fail) → 1 (pass, hearts<3) → 2 (pass, hearts≥3) → 3 (perfect 12/12) ✓
- Weak topics: Correctly picks lowest accuracy domains, falls back to random if <5 answers ✓
- Level unlock: Sequential unlock after exam pass ✓
- Coins persist across reload ✓

---

## Phase 6: UX/Juice (Animasi Gerak, Tap-to-Move, Suara, Getar, Konfeti) ✅
**Commit:** `TBD`

### Changes:
- **Smooth movement animation**: `requestAnimationFrame` dengan durasi 120ms, respects `prefers-reduced-motion`
- **Tap-to-move dengan BFS pathfinding**: 
  - Klik/tap sel target → hitung jalur BFS (pintu terkunci = dinding)
  - Karakter berjalan otomatis sel-sel berikutnya
  - Berhenti tepat sebelum pintu terkunci → soal muncul
  - Tap baru membatalkan auto-move
- **Sound effects** (WebAudio sintetis via `audio.js`):
  - Benar (major chord), Salah (descending minor), Koin (ping), Pintu terbuka (arpeggio), Lulus (fanfare), Peti (sparkle), Power-up (quick up-down)
  - Tombol 🔊/🔇 di HUD, persist di `settings.sound`
  - AudioContext dibuat setelah interaksi pertama
- **Getar (haptic)**: `navigator.vibrate(50ms)` untuk jawaban salah, respect `settings.vibrate`
- **Konfeti** saat lulus ujian: 60 partikel, 1.5 detik, gravitasi, rotasi, matikan jika `reduced-motion`
- **Umpan balik jawaban**: 
  - Floating `+10` hijau melayang ke atas (1.5s fade)
  - Button scale animation (ok: 1.02x, bad: 1.02x, normal: 0.98x)
- **Aksesibilitas**: 
  - Focus ring 3px solid primary pada semua elemen interaktif
  - `aria-label` pada tombol suara
  - Kontras warna memadai mode terang/gelap
  - `prefers-reduced-motion` dimatikan semua animasi
- **Performa**: Listener sekali pakai (`{once:true}`), `resize` di-debounce 100ms

### Test Results:
- All existing tests pass: questions (1.7M+), maze (9), storage (27)
- Manual verification: tap-to-move works on mobile viewport, sound toggle persists, confetti shows on exam pass, vibration triggers on wrong answer

---
```
Labirin/
├── index.html
├── style.css
├── js/
│   ├── util.js          # RNG, shuffle, gcd/lcm, format
│   ├── questions.js     # Bank soal, mk(), Q(), parseNilai
│   ├── maze.js          # Labirin, BFS, gerbang
│   ├── storage.js       # localStorage wrapper (Phase 5)
│   ├── audio.js         # WebAudio (Phase 6)
│   └── game.js          # Game logic (DOM)
├── tests/
│   ├── load.js          # Module loader for Node
│   ├── generate-snapshot.js
│   ├── questions.test.js
│   ├── maze.test.js
│   └── run.js
├── snapshot.json        # 5400 questions baseline
├── PROGRESS.md          # This file
└── report.md            # Original development plan (7 phases)
```

---

## Key Design Decisions

1. **Static files only** - No build, no framework, no CDN. Runs via `file://` or GitHub Pages
2. **Pure logic modules** - `util.js`, `questions.js`, `maze.js`, `storage.js`, `audio.js` have NO DOM dependencies, testable in Node
3. **Centralized CONFIG** - All balancing numbers in `CONFIG` object in `game.js`
4. **Indonesian UI** - Bahasa Indonesia, ramah anak SD (emoji, kalimat pendek)
5. **Snapshot testing** - 5400 questions baseline ensures no regression

---

## Remaining Phases (from report.md)

| Phase | Focus | Status |
|-------|-------|--------|
| **3** | Isi peta (koin, peti, power-up 50:50, ganti soal, lihat jalur) | ✅ Done |
| **4** | Visual soal (gambar bangun geometri di canvas) | ✅ Done |
| **5** | Progres tersimpan, level terkunci, bintang, mastery, latihan topik lemah | ✅ Done |
| **6** | UX/Juice (animasi gerak, tap-to-move, suara, getar, konfeti) | ✅ Done |
| **7** | Tambahan (misi harian, timer ujian, boss gerbang 6, salin rapor) | ⏳ Next |

---

## How to Continue

### Run Tests
```bash
cd Labirin/tests
node run.js
```

### Run Game Locally
```bash
cd Labirin
# Open index.html directly in browser, or serve:
npx serve .
```

### Key Files to Modify Next (Phase 7)
1. **`js/game.js`** - Add daily mission (date-based seed), exam timer (90s/soal), boss gate 6 (5 mixed questions, ≥4 benar), copy rapor button
2. **`js/storage.js`** - Add `daily` field handling (date, done), `settings.timer`
3. **`js/questions.js`** - Add boss gate generator (5 soal campur all domain, tier tertinggi)
4. **`style.css`** - Add timer bar styling, boss gate crown indicator

### Important Constants (in `js/game.js` CONFIG)
```javascript
const CONFIG = {
  hearts: 5,
  streakNeeded: 3,
  examSize: 12,
  loop: 0.04,

### Important Constants (in `js/game.js` CONFIG)
```javascript
const CONFIG = {
  hearts: 5,
  streakNeeded: 3,
  examSize: 12,
  loop: 0.04,
  levels: {
    1: { w: 9, h: 9, minPath: 35, coins: 6, chests: 1 },
    2: { w: 11, h: 11, minPath: 50, coins: 8, chests: 2 },
    3: { w: 13, h: 13, minPath: 70, coins: 10, chests: 2 }
  },
  reward: { doorEasy: 1, doorNormal: 2, doorHard: 3, chest: 5, coin: 1 },
  price: { fifty: 3, swap: 3, path: 5 },
  pathHintMs: 4000,
  moveMs: 120
};
```

---

## Git History
```
3034bd8 - Phase 2: Labirin sungguhan + gerbang bermakna
adf995f - Phase 1: Perbaikan kualitas soal
1f36b55 - Phase 0: Refactor + test infrastructure
```

---

## Notes for Next Agent

1. **JANGAN ubah rumus soal** yang sudah benar (Phase 1). Tambah generator baru di array `g` di `questions.js`.
2. **JANGAN hilangkan fitur lama**: 3 benar beruntun, nyawa ❤️, ujian akhir 12 soal, rapor, mode gelap, kontrol keyboard/tombol/swipe, jaminan semua jalur lewat pintu.
3. **Logika murni** (`util.js`, `questions.js`, `maze.js`, `storage.js`, `audio.js`) **dilarang menyentuh DOM**. Supaya bisa dites di Node.
4. **Semua angka penyeimbang** taruh di `CONFIG` di `game.js`.
5. **Tulis kode mudah dibaca** (nama jelas, bukan satu-baris ringkas). Komentar singkat Bahasa Indonesia.
6. **Satu tahap = satu commit**, pesan commit jelas. Jalankan `node tests/run.js` sebelum commit.
7. Uji manual di HP (375px, Chrome DevTools) dan desktop (≥1200px) setiap akhir tahap.

---

*Generated: Phase 6 Complete - Ready for Phase 7*