# PLAN-LABIRIN-V3: Rencana Pengembangan "Labirin Penguasa TKA"

Dokumen ini untuk **AI agent yang bekerja di komputer lokal** (OpenCode). Kerjakan **tahap demi tahap, berurutan**. Jangan lompat tahap. Setiap tahap punya **Tugas**, **Selesai jika** (kriteria penerimaan), dan **Commit**.

---

## 0. Konteks singkat

- Game labirin 2D untuk melatih siswa SD menghadapi TKA Matematika. Murni **HTML + JS + CSS**, tanpa build, tanpa framework, di-host di GitHub Pages.
- File sekarang: `index.html`, `style.css`, `script.js` (±25 KB, kode ringkas satu baris-per-fungsi).
- Pemain 🧒 berjalan dari kiri-atas ke 🏁. Ada **6 gerbang** (satu per kompetensi: Bilangan, Pecahan & Perbandingan, Geometri, Pengukuran, Data, Penalaran). Tiap pintu butuh **3 soal benar beruntun**. Di finish ada **ujian akhir 12 soal**.

### Hasil analisis kode lama (sudah diukur, bukan tebakan)

| Temuan | Data |
|---|---|
| Jalur terpendek start→finish terlalu pendek | rata-rata **20** (Level 1), **25** (L2), **31** (L3) langkah, padahal peta 81 / 121 / 169 sel |
| Penyebab | `loop:.12` membuka terlalu banyak dinding, finish selalu di sudut |
| Gerbang terlalu rapat | tiap ±3–5 langkah ada gerbang |
| Pintu per gerbang | rata-rata 4,3 / 5,1 / 5,9 pintu, semuanya topik & tingkat sama, jadi memilih pintu tidak berarti |
| Pintu lain di gerbang yang sudah lulus | tetap minta 3 soal lagi tanpa hadiah (menghukum penjelajahan) |
| Bug opsi `Pilihan 1` | muncul di soal "Rina membawa uang Rp…" (Penalaran, generator ke-4) ±8% dari soal jenis itu |
| Pengecoh negatif (`-1`, `-2`) | di soal "Hasil dari … adalah" (Bilangan, generator ke-1), ±1%. Siswa SD belum belajar bilangan negatif |
| Soal statis berulang | Geometri generator ke-5 dan Pengukuran generator ke-4 hanya 5 soal tetap |
| Progres tidak tersimpan | tidak ada `localStorage`; semua level terbuka dari awal; skor tidak dipakai |
| Swipe | 1 geseran = 1 sel (melelahkan) |
| Jaminan "semua jalur lewat pintu" | **benar & sudah terverifikasi** (0 dari 1.500 labirin punya jalur tanpa pintu). **Jangan rusak.** |

### Lokasi kode lama di `script.js` (nomor baris kira-kira)

- 8–14 `mk()` pembuat pilihan jawaban
- 18–119 `DM` bank soal (6 domain, 26 generator)
- 121 `Q()` pemilih soal
- 125–135 `gen()` generator labirin
- 137–140 `LV` konfigurasi level
- 143–160 `bfs()`, `start()` (termasuk pembuatan gerbang)
- 166–193 `draw()`
- 197–252 alur game: `move`, `enter`, `nextQ`, `answer`, `startExam`, `rapor`
- 253–267 menu & input (keyboard, tombol layar, swipe)
- **Finish di-hardcode** di 3 tempat: `start()` (`dist[lv.h-1][lv.w-1]`), `enter()` (`px==lv.w-1&&py==lv.h-1`), `draw()` (badge 🏁 di `S-cs/2,Hh-cs/2`)

---

## 1. Aturan main untuk agent (WAJIB)

1. **Tetap static.** Tanpa npm package untuk runtime, tanpa bundler, tanpa framework, tanpa CDN. Game harus bisa dibuka dengan klik dua kali `index.html` (`file://`). Karena itu **pakai `<script>` klasik, bukan ES module**.
2. **Bahasa UI: Bahasa Indonesia**, ramah anak SD (kalimat pendek, emoji boleh).
3. **Jangan ubah rumus soal** yang sudah benar. Kalau menambah soal, tambahkan, jangan mengganti.
4. **Jangan hilangkan fitur lama**: 3 benar beruntun per pintu, nyawa ❤️, ujian akhir 12 soal, rapor per kompetensi, mode gelap, kontrol keyboard/tombol/swipe, jaminan semua jalur lewat pintu.
5. **File logika murni** (`util.js`, `questions.js`, `maze.js`) **dilarang menyentuh `document`, `window`, `localStorage`**. Supaya bisa dites di Node.
6. **Semua angka penyeimbang** (jumlah nyawa, harga power-up, dll.) taruh di satu objek `CONFIG`, jangan tersebar.
7. Tulis kode **mudah dibaca** (nama jelas, bukan satu-baris ringkas). Komentar singkat dalam Bahasa Indonesia.
8. **Satu tahap = satu commit** (atau lebih), pesan commit jelas. Jalankan `node tests/run.js` sebelum commit. Jangan lanjut kalau tes gagal.
9. Kalau ada keputusan yang tidak tertulis di sini, ambil opsi paling sederhana yang tidak melanggar aturan 1–8, lalu catat di `CATATAN-AGENT.md`.
10. Uji manual di ukuran layar HP (±375 px, Chrome DevTools device mode) dan desktop (≥1200 px) setiap akhir tahap.

---

## 2. Struktur file target

```
Labirin/
├─ index.html
├─ style.css
├─ js/
│  ├─ util.js        (rng, shuf, gcd, format angka; TANPA DOM)
│  ├─ questions.js   (mk, DM, Q; TANPA DOM)
│  ├─ maze.js        (gen, bfs, analisis gerbang, item; TANPA DOM)
│  ├─ storage.js     (localStorage aman; Tahap 5)
│  ├─ audio.js       (WebAudio; Tahap 6)
│  └─ game.js        (state, alur, draw, input, UI)
├─ tests/
│  ├─ load.js        (memuat file logika ke satu vm context)
│  ├─ questions.test.js
│  ├─ maze.test.js
│  └─ run.js
├─ PLAN-LABIRIN-V3.md
└─ CATATAN-AGENT.md
```

Urutan `<script>` di `index.html`: `util.js` → `questions.js` → `maze.js` → `storage.js` → `audio.js` → `game.js`.

---

## TAHAP 0: Refactor aman + jaring pengaman tes

**Tujuan:** pecah `script.js` tanpa mengubah perilaku, dan buat tes otomatis.

**Tugas**
1. Buat cabang git: `git checkout -b v3`.
2. Di `script.js` lama, ganti semua `Math.random()` menjadi `rand()`. Definisikan di atas:
   ```js
   let _rand = Math.random;
   const rand = () => _rand();
   function setSeed(seed){ // mulberry32
     let a = seed >>> 0;
     _rand = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
       t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
   }
   function clearSeed(){ _rand = Math.random; }
   ```
3. **Snapshot sebelum refactor:** dengan `setSeed(12345)`, hasilkan 300 soal per domain per tingkat (1–3) dan simpan ke `tests/snapshot.json` (field: `q`, `opts`, `a`). Pakai script Node sementara yang memuat bagian logika dari `script.js` lama (gantikan baris 1 dengan stub `$`, potong sebelum bagian DOM; ini sudah terbukti bisa).
4. Pecah kode ke struktur file di atas. **Salin generator persis**, hanya perindah format (satu pernyataan per baris). Jangan ubah isi rumus.
5. Buat `tests/load.js`: baca `util.js`, `questions.js`, `maze.js`, gabungkan, jalankan di satu `vm.createContext`, kembalikan objek ekspor (`DM`, `Q`, `mk`, `gen`, `bfs`, `setSeed`, dst.).
6. Buat tes snapshot: dengan seed yang sama, hasil harus **identik** dengan `snapshot.json`.
7. Buat `tests/run.js` yang menjalankan semua `*.test.js` dan keluar dengan kode ≠ 0 jika ada yang gagal. Tanpa library tes (pakai `assert` bawaan Node).
8. Tambah `.gitignore` berisi `node_modules/` dan `graphify-out/`.

**Selesai jika:** game berjalan sama persis seperti sebelumnya di browser; `node tests/run.js` hijau (termasuk snapshot).
**Commit:** `refactor: pecah script.js, tambah rng bisa di-seed dan tes snapshot`

---

## TAHAP 1: Perbaikan kualitas soal

**Tujuan:** hilangkan bug opsi dan perbanyak variasi soal.

**Tugas**
1. **Perbaiki `mk()`** (di `questions.js`):
   - Hasil harus selalu **tepat 4 opsi unik**, termasuk jawaban benar.
   - Buat fungsi `parseNilai(str)` yang mengerti format Indonesia: awalan `Rp`, titik sebagai pemisah ribuan (`16.000` = 16000), koma sebagai desimal (`1,5` = 1.5), satuan di belakang (`cm²`, `km`, `menit`), pecahan `a/b`, dan jam `07.30`.
   - Fallback pengecoh (jika pengecoh dari generator kurang): hasilkan angka dekat jawaban benar **dengan format yang sama** (awalan/satuan/pemisah ribuan dipertahankan). Pecahan: ubah pembilang atau penyebut ±1. Jam: ±5/10/15 menit.
   - **Dilarang keras** menghasilkan teks `Pilihan N`, `NaN`, atau `undefined`. Jika tetap tidak bisa membuat 4 opsi unik, lempar `Error` (agar tes menangkapnya), jangan diam-diam membuat opsi sampah.
   - **Buang pengecoh bernilai negatif** (setelah di-parse < 0) kecuali jawaban benarnya sendiri negatif (tidak ada saat ini).
2. **Ganti soal statis dengan generator** (tambah, jangan hapus yang lama):
   - Geometri: tambah ≥ 7 soal sifat bangun (jumlah sisi/titik sudut/rusuk, simetri putar & lipat, jenis segitiga & segi empat, jaring-jaring) sehingga total ≥ 12 butir, dikelompokkan per tingkat (1–3).
   - Pengukuran: tambah ≥ 7 soal estimasi/pemilihan satuan, konversi luas/volume sederhana, dan perbandingan satuan, total ≥ 12 butir.
   - Tiap butir statis harus punya `exp` (pembahasan) satu kalimat.
3. Tiap domain minimal **8 generator**. Tambah generator baru bergaya TKA di domain yang masih kurang, mis. Data (diagram batang dalam teks, rata-rata gabungan), Penalaran (logika "jika–maka", pola gambar bergeser), Bilangan (pecahan campuran ↔ desimal, bilangan prima/faktor). Semua harus punya `exp`.
4. Perbaiki `Q()`: kalau soal sudah dipakai (`used`), coba sampai 30 kali; jika tetap kembar, boleh pakai, tapi jangan crash.
5. Tulis `tests/questions.test.js`:
   - 100.000 pemanggilan acak (semua domain × tingkat 1–3 × generator) tanpa exception.
   - Setiap soal: 4 opsi unik; indeks `a` valid; tidak ada opsi yang cocok `/Pilihan|NaN|undefined/`; tidak ada opsi yang diawali `-`; opsi berisi teks tidak kosong; `exp` tidak kosong.
   - Untuk tiap domain, minimal 300 soal unik dari 3.000 pemanggilan di tingkat 2.

**Selesai jika:** semua tes di atas hijau; tidak ada lagi "Pilihan 1" ataupun opsi negatif; tiap domain ≥ 8 generator.
**Commit:** `fix(soal): mk() aman, buang pengecoh negatif, perbanyak generator`

---

## TAHAP 2: Labirin sungguhan + gerbang yang bermakna

**Tujuan:** labirin panjang & berliku, gerbang tersebar, pilihan pintu berarti.

### 2A. Generator labirin
1. Di `CONFIG`/`LV` tambah field per level: `minPath` (panjang jalur terpendek minimal) dan turunkan `loop` jadi **0.04**.
2. **Finish = sel terjauh dari start** menurut BFS (bukan sudut). Simpan sebagai `maze.finish = {x,y}`. Hapus semua hardcode `lv.w-1`/`lv.h-1` (3 tempat di atas), pakai `maze.finish`.
3. **Regenerasi** labirin sampai panjang jalur terpendek `L >= minPath` (maksimal 200 percobaan; jika gagal, pakai yang terbaik).
4. **Kalibrasi `minPath`** (lakukan sebagai script Node, catat hasilnya di `CATATAN-AGENT.md`): untuk tiap level, buat 500 labirin dengan `loop=0.04`, hitung median `L`, lalu set `minPath ≈ median` (supaya rata-rata ≈ 2 percobaan). Sasaran kasar: L1 ≥ 35, L2 ≥ 50, L3 ≥ 70. Jika median jauh di bawah itu, naikkan ukuran peta atau turunkan `loop` lagi.
5. Letak gerbang tetap berdasarkan irisan jarak BFS: `D_k = round(L*k/7)`, `k=1..6`. **Tambahan:** selisih `D` antar gerbang berurutan minimal 4. Jika tidak terpenuhi, regenerasi.

### 2B. Perilaku gerbang
6. **Lulus satu pintu = seluruh gerbang terbuka.** Saat `passed[g]` pertama kali menjadi `true`, masukkan **semua** kunci pintu gerbang itu ke `opened`. Tidak ada lagi pertanyaan di pintu gerbang itu.
7. **Pilihan risiko-hadiah per pintu.** Untuk gerbang dengan ≥ 2 pintu, beri tiap pintu label tetap (acak saat labirin dibuat, pastikan minimal satu `mudah` dan satu `sulit`):
   - `mudah` 🙂: tingkat soal = tingkat dasar level − 1 (minimal 1). Hadiah koin kecil.
   - `sulit` 🔥: tingkat soal = tingkat dasar + 1 (maksimal 3). Hadiah koin besar dan skor ×2.
   - Gerbang dengan 1 pintu: tanpa label, tingkat normal.
   - Gambar label di pintu (🙂/🔥 kecil di pojok emoji pintu).
8. Aturan yang **tidak berubah**: 3 benar beruntun; salah = nyawa −1 dan ulang dari soal 1; lulus gerbang pertama kali = +1 nyawa (maks 5).

### 2C. Tes (`tests/maze.test.js`)
Untuk tiap level, 300 labirin:
- Tidak ada jalur start→finish yang menghindari pintu (BFS dengan semua sisi pintu diblokir harus **tidak** mencapai finish).
- `finish` adalah sel dengan jarak BFS maksimum.
- `L >= minPath` (atau tercatat sebagai "gagal regenerasi" < 2% kasus).
- Enam gerbang punya `D` berbeda dan selisih ≥ 4.
- Tiap gerbang punya ≥ 1 pintu.
- Gerbang ≥ 2 pintu: ada label `mudah` dan `sulit`.

**Selesai jika:** tes hijau; di browser, jalur terpendek terasa jauh lebih panjang; setelah lulus satu pintu, pintu lain di gerbang itu terbuka tanpa soal.
**Commit:** `feat(maze): labirin panjang, finish terjauh, gerbang terbuka sekali lulus, pintu mudah/sulit`

---

## TAHAP 3: Isi peta (koin, peti, power-up)

**Tujuan:** memberi alasan menjelajah jalan buntu.

**Tugas**
1. Di `maze.js` tambah `placeItems(maze, lv)`:
   - Cari semua sel **jalan buntu** (hanya 1 sisi terbuka) yang bukan start/finish.
   - Taruh **koin 🪙** (nilai 1) di sejumlah jalan buntu (`lv.coins`, mis. 6 / 8 / 10).
   - Taruh **peti 🎁** di `lv.chests` jalan buntu terjauh dari start (mis. 1 / 2 / 2).
   - Satu sel maksimal satu item. Item tidak boleh di sel pintu.
2. **Mengambil koin:** otomatis saat berjalan ke sel itu, `coins += 1`, bunyi kecil (Tahap 6).
3. **Peti:** muncul 1 soal bonus tingkat sedang. Benar = `+5` koin dan `+20` skor. Salah = tidak ada hukuman (tanpa kurang nyawa), tampilkan pembahasan. Peti hilang setelah dibuka.
4. **Hadiah pintu:** mudah +1 koin, normal +2, sulit +3 (sekali per gerbang, saat gerbang pertama kali lulus).
5. **HUD:** tambah 🪙 jumlah koin.
6. **Power-up** (tombol kecil di bawah D-pad, aktif saat tidak ada overlay soal). Di jendela soal, tombol "50:50" dan "Ganti soal" muncul di dalam kartu soal.
   - **50:50** (3 koin): hilangkan 2 opsi salah di soal yang sedang tampil. Sekali per soal.
   - **Ganti soal** (3 koin): ganti dengan soal baru di domain & tingkat yang sama. **Progres 3-benar-beruntun tidak berubah**, soal pengganti tidak dihitung salah. Sekali per soal.
   - **Lihat jalur** (5 koin): gambar garis jalur terpendek dari posisi pemain ke finish selama 4 detik (abaikan pintu).
   - Tombol nonaktif jika koin kurang. Ada teks harga di tombol.
   - Power-up **dinonaktifkan di ujian akhir** (agar murni simulasi).
7. Gambar item di `draw()` **sebelum** lapisan kabut (sehingga tersembunyi di area kabut). Item `🪙`/`🎁` ukuran ±0,5 sel.
8. Semua harga & jumlah ada di `CONFIG`.

**Tes tambahan:** item tidak tumpang tindih; semua item berada di sel yang terjangkau; jumlah item sesuai config (atau kurang dari itu hanya bila jalan buntu tak cukup).

**Selesai jika:** koin dan peti muncul di jalan buntu, bisa diambil, dan harga power-up berfungsi; ujian akhir tanpa power-up.
**Commit:** `feat: koin, peti bonus, power-up 50:50, ganti soal, lihat jalur`

---

## TAHAP 4: Visual soal (gambar bangun)

**Tujuan:** soal geometri/data dilengkapi gambar, lebih mirip soal ujian sungguhan.

**Tugas**
1. Perluas `mk(q, ans, wr, exp, fig)` dengan parameter opsional `fig` (objek deskripsi gambar, murni data, tanpa DOM). Soal yang dikembalikan membawa `fig`.
2. Di `game.js` buat `drawFigure(canvas, fig)` yang menggambar di `<canvas class="fig">` kecil (lebar ±260 px, skala `devicePixelRatio`) di dalam kartu soal, di atas teks soal. Warna dari CSS variable agar mendukung mode gelap.
3. Jenis `fig` yang wajib ada:
   - `rect`: persegi panjang dengan label sisi (`p`, `l`).
   - `tri`: segitiga dengan alas dan tinggi (garis putus-putus tinggi, tanda siku).
   - `trap`: trapesium dengan dua sisi sejajar dan tinggi.
   - `combo`: persegi dengan segitiga di atasnya.
   - `box`: balok/kubus sederhana (proyeksi miring) dengan label p, l, t.
   - `angle`: dua garis dengan busur sudut berlabel (untuk sudut berpelurus / segitiga).
   - `clock`: jam analog dengan jam tertentu (untuk soal sudut jarum jam).
4. Pasang `fig` ke generator yang sudah ada: Geometri (keliling, luas, volume, sudut), dan sudut jarum jam. Teks soal **tetap lengkap** (gambar hanya pelengkap), agar tetap bisa dikerjakan tanpa gambar.
5. Tambah tes: setiap soal yang punya `fig` memiliki `fig.type` yang dikenal dan semua angka label berupa bilangan terbatas (bukan `NaN`).
6. Jaga ukuran: gambar tidak boleh membuat kartu soal lebih tinggi dari layar; kartu sudah `max-height:92vh; overflow:auto`.

**Selesai jika:** soal geometri tampil dengan gambar yang benar di HP dan desktop, mode terang & gelap.
**Commit:** `feat(soal): gambar bangun di soal geometri`

---

## TAHAP 5: Progres tersimpan, level terkunci, bintang

**Tujuan:** alasan untuk kembali bermain.

**Tugas**
1. `storage.js`: bungkus `localStorage` dengan `try/catch` (harus tetap jalan jika diblokir; pakai memori sebagai cadangan). Satu kunci: `labirin.v3`. Skema:
   ```json
   { "ver": 3,
     "unlocked": 1,
     "stars": {"1":0,"2":0,"3":0},
     "bestScore": {"1":0,"2":0,"3":0},
     "mastery": [ {"c":0,"s":0}, ... 6 domain ],
     "coins": 0,
     "settings": {"sound": true, "vibrate": true, "timer": false},
     "daily": {"date": "", "done": false} }
   ```
   Data rusak atau versi beda: abaikan & mulai bersih (jangan crash).
2. **Level terkunci:** Level 2 terbuka setelah lulus ujian Level 1; Level 3 setelah Level 2. Kartu level di menu menampilkan 🔒 / bintang.
3. **Bintang per level:** ★ lulus ujian; ★★ lulus dan nyawa ≥ 3 saat sampai finish; ★★★ lulus dengan skor ujian 12/12. Simpan yang tertinggi.
4. **Mastery:** setiap jawaban (labirin & ujian) menambah `mastery[domain].c` atau `.s`. Tampilkan di menu utama "Kompetensi kamu" (6 batang kemajuan kecil, persentase benar).
5. **Mode "Latihan Topik Lemah"** (tombol di menu): ambil 2 domain dengan akurasi terendah (minimal 5 jawaban tercatat; jika belum cukup, pilih acak), sesi **10 soal** (5 per domain, tingkat dari level tertinggi yang terbuka). Tanpa nyawa dan power-up. Hadiah: +1 koin per jawaban benar (maks 10). Akhir sesi tampilkan ringkasan.
6. Koin dibawa antar level (disimpan), tapi power-up tetap hanya dipakai di labirin.
7. Tombol kecil "Reset progres" di menu dengan konfirmasi dua langkah.

**Tes (logika murni, taruh fungsi hitung bintang & pemilih domain lemah di file tanpa DOM):** bintang dihitung benar untuk semua kombinasi; pemilih domain lemah benar pada data contoh; data rusak tidak membuat crash.

**Selesai jika:** reload halaman tidak menghapus progres; level terkunci/terbuka sesuai aturan; Latihan Topik Lemah bekerja.
**Commit:** `feat: simpan progres, level terkunci, bintang, mastery, latihan topik lemah`

---

## TAHAP 6: Rasa permainan (juice) dan kontrol HP

**Tujuan:** game terasa hidup dan nyaman di layar sentuh.

**Tugas**
1. **Gerak halus:** posisi karakter dianimasikan antar sel (±120 ms, `requestAnimationFrame`). Hanya render ulang saat ada animasi/perubahan. Hormati `prefers-reduced-motion` (animasi dimatikan).
2. **Ketuk untuk jalan (tap-to-move):** mengetuk sel di canvas menghitung jalur BFS (abaikan pintu terkunci sebagai rintangan), karakter berjalan otomatis dan **berhenti tepat sebelum pintu terkunci** (lalu soal muncul). Ketukan baru membatalkan jalan otomatis. Pertahankan swipe 1 sel dan D-pad.
3. **Suara** (`audio.js`, WebAudio sintetis, tanpa file audio): bunyi benar, salah, ambil koin, pintu terbuka, lulus. Tombol 🔊/🔇 di HUD. AudioContext dibuat setelah interaksi pertama pengguna. Simpan di `settings.sound`.
4. **Getar:** `navigator.vibrate` pendek untuk salah (jika tersedia dan `settings.vibrate`).
5. **Konfeti** sederhana di canvas overlay saat lulus ujian (±1,5 detik, matikan jika reduced-motion).
6. **Umpan balik jawaban:** animasi kecil pada tombol benar/salah, angka `+10` melayang di HUD.
7. **Fokus & aksesibilitas:** overlay soal memindahkan fokus ke kartu; tombol punya `aria-label`; kontras warna cukup di mode terang & gelap.
8. **Performa:** tidak ada kebocoran listener; `resize` di-debounce.

**Selesai jika:** di HP, ketuk sel tujuan membuat karakter berjalan sendiri dan berhenti di pintu; suara bisa dimatikan dan pengaturannya tersimpan; tidak ada error di console.
**Commit:** `feat(ux): animasi gerak, tap-to-move, suara, getar, konfeti`

---

## TAHAP 7: Tantangan tambahan

**Tugas (urut, boleh dihentikan jika waktu habis; setiap butir independen)**
1. **Misi Harian:** tombol di menu. Seed = tanggal lokal (`YYYY-MM-DD`) → `setSeed(hash(tanggal))` untuk labirin & urutan soal, sehingga semua anak mendapat labirin yang sama hari itu. Selesai sekali per hari (`daily` di storage). Hadiah +10 koin. Setelah labirin dibuat, **panggil `clearSeed()`** agar sesi lain kembali acak.
2. **Mode Waktu untuk ujian akhir** (opsional, toggle di menu, `settings.timer`): 90 detik per soal, bilah waktu di atas soal; habis waktu = salah. Default mati.
3. **Boss di gerbang terakhir:** pintu gerbang ke-6 meminta **5 soal campur** (semua domain, tingkat tertinggi level) dengan syarat ≥ 4 benar; salah di bawah syarat = nyawa −1 dan ulang. Beri tanda 👑 pada pintu.
4. **Rapor akhir** dapat disalin: tombol "Salin ringkasan" yang menyalin teks (level, skor ujian, kompetensi lemah) untuk dikirim ke guru/orang tua.

**Selesai jika:** butir yang dikerjakan lolos tes manual dan `node tests/run.js` hijau.
**Commit:** satu per butir.

---

## 3. Konfigurasi awal yang disarankan (`CONFIG`)

```js
const CONFIG = {
  hearts: 5,
  streakNeeded: 3,
  examSize: 12,
  gateCount: 6,
  minGateGap: 4,
  loop: 0.04,
  levels: {
    1: { name: 'Latihan',     w: 9,  h: 9,  fog: 0, tiers: [1,1,2], pass: 9,  coins: 6,  chests: 1, minPath: null /* hasil kalibrasi */ },
    2: { name: 'TKA Standar', w: 11, h: 11, fog: 3, tiers: [1,2,3], pass: 10, coins: 8,  chests: 2, minPath: null },
    3: { name: 'Master TKA',  w: 13, h: 13, fog: 2, tiers: [2,3,3], pass: 11, coins: 10, chests: 2, minPath: null }
  },
  reward: { doorEasy: 1, doorNormal: 2, doorHard: 3, chest: 5, coin: 1 },
  price:  { fifty: 3, swap: 3, path: 5 },
  pathHintMs: 4000,
  moveMs: 120
};
```

---

## 4. Daftar periksa akhir

- [ ] `node tests/run.js` hijau (snapshot, soal, labirin, item, bintang)
- [ ] Tidak ada error/warning di console (Chrome) saat bermain satu level penuh
- [ ] Main satu level penuh di HP (375 px) dan desktop; kontrol keyboard, D-pad, swipe, ketuk-untuk-jalan semua berfungsi
- [ ] Mode terang & gelap terbaca jelas
- [ ] Reload tidak menghapus progres; "Reset progres" bekerja
- [ ] Tidak ada opsi `Pilihan N`, `NaN`, atau angka negatif di soal mana pun
- [ ] Semua jalur start→finish tetap melewati pintu (tes labirin hijau)
- [ ] `index.html` bisa dibuka lewat `file://` dan lewat GitHub Pages
- [ ] `CATATAN-AGENT.md` berisi: hasil kalibrasi `minPath`, keputusan yang diambil sendiri, dan hal yang belum selesai

## 5. Hal yang JANGAN dilakukan

- Jangan menambah dependensi, framework, atau CDN.
- Jangan menaruh logika soal/labirin di file yang menyentuh DOM.
- Jangan mengubah jawaban/rumus soal lama tanpa tes yang membuktikan benar.
- Jangan mematikan jaminan "semua jalur lewat pintu" demi membuat labirin terasa lebih bebas.
- Jangan menyimpan data pribadi anak (nama, dsb.). Progres hanya angka di `localStorage` perangkat.
