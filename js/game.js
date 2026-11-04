// game.js - Logika utama game (DENGAN DOM)
// Menggunakan: util.js, questions.js, maze.js, storage.js, audio.js

// Global state
let lv, cells, doorG, gates, opened, passed, seen, px, py, hearts, score, rep, ses, cur, answered = false, busy = true, xr, xq;
let animating = false, animStart = 0, animFrom = { x: 0, y: 0 }, animTo = { x: 0, y: 0 }, animDuration = 120;
let tapTarget = null;
let autoMovePath = null, autoMoveIndex = 0, autoMoveTimer = null; // dipakai setupInput() DAN autoMoveStep()
let reducedMotion = false;
let coins = 0;
let items = { coins: new Set(), chests: new Set() };
let powerupState = { fiftyUsed: false, swapUsed: false, pathHintActive: false, pathHintEnd: 0 };
let examMode = false;
  let examTimeLeft = 0;
  let examStartTime = 0;
  let examTimeLeftDisplay = null;
  let onAnswer = null; // handler jawaban khusus (peti, latihan lemah); null = answer() biasa

// DOM elements
const $ = s => document.querySelector(s);
const cv = $('#cv'), wrap = $('#wrap'), ov = $('#ov'), ovc = $('#ovc');
// Catatan: semua <script> klasik berbagi satu scope global, jadi nama dari
// util/questions/maze/storage/audio (rnd, DM, Q, mk, used, DIR, gen, bfs, ek, LV,
// calculateStars, sfx*, dst.) sudah bisa dipakai langsung. JANGAN di-destructure
// ulang dengan const/let di sini: itu memicu SyntaxError "already been declared".
// Hanya alias bernama beda yang dibuat di bawah ini.
const storageLoad = window.load, storageSave = window.save,
  storageReset = window.reset, storagePatch = window.patch;

// Config
const CONFIG = {
  hearts: 5,
  streakNeeded: 3,
  examSize: 12,
  gateCount: 6,
  minGateGap: 4,
  loop: 0.04,
  timer: false,
  levels: {
    1: { name: 'Latihan', w: 9, h: 9, fog: 0, tiers: [1, 1, 2], pass: 9, coins: 6, chests: 1, minPath: 35 },
    2: { name: 'TKA Standar', w: 11, h: 11, fog: 3, tiers: [1, 2, 3], pass: 10, coins: 8, chests: 2, minPath: 50 },
    3: { name: 'Master TKA', w: 13, h: 13, fog: 2, tiers: [2, 3, 3], pass: 11, coins: 10, chests: 2, minPath: 70 }
  },
  reward: { doorEasy: 1, doorNormal: 2, doorHard: 3, chest: 5, coin: 1 },
  price: { fifty: 3, swap: 3, path: 5 },
  pathHintMs: 4000,
  moveMs: 120
};

// Initialize
function init() {
  // Check reduced motion
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Load storage
  const saved = storageLoad();
  // Apply saved settings
  setSoundEnabled(saved.settings.sound);

  // Initialize audio on first interaction
  document.body.addEventListener('click', () => {
    initAudio();
    resumeAudio();
  }, { once: true });

  // Event listeners
  setupInput();
  window.addEventListener('resize', debounce(draw, 100));

  // Show menu
  menu();
  draw();
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ===== INPUT HANDLING =====
function setupInput() {
  // D-pad buttons
  document.querySelectorAll('#pad button').forEach(b => {
    b.addEventListener('click', () => move(b.dataset.d));
  });

  // Tombol suara: delegasi, karena hud() membuat ulang isi #hud
  $('#hud').addEventListener('click', e => { if (e.target.closest('#sound-toggle')) toggleSound(); });

  // Keyboard
  window.addEventListener('keydown', e => {
    const map = { ArrowUp: 'N', w: 'N', ArrowDown: 'S', s: 'S', ArrowLeft: 'W', a: 'W', ArrowRight: 'E', d: 'E' };
    const d = map[e.key];
    if (d) { e.preventDefault(); move(d); return; }
    if (!ov.classList.contains('off') && !answered && /^[1-4]$/.test(e.key) && ovc.querySelector('.opts')) {
      (onAnswer || answer)(+e.key - 1);
    } else if (e.key === 'Enter' && $('#nx')) {
      $('#nx').click();
    }
  });

  // Touch swipe (1 cell)
  let touchStart = null;
  cv.addEventListener('touchstart', e => { touchStart = e.touches[0]; }, { passive: true });
  cv.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.clientX;
    const dy = t.clientY - touchStart.clientY;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'));
  });

  // Tap-to-move with BFS pathfinding
  cv.addEventListener('click', e => {
    // Ignore clicks when overlay is visible (questions, menu, etc.)
    if (!ov.classList.contains('off')) return;
    if (busy || !lv) return;
    
    // Get canvas-relative coordinates
    const rect = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * lv.w);
    const y = Math.floor((e.clientY - rect.top) / rect.height * lv.h);
    
    if (x < 0 || x >= lv.w || y < 0 || y >= lv.h) return;
    if (x === px && y === py) return;
    
    // Cancel any existing auto-move
    if (autoMovePath) {
      autoMovePath = null;
      autoMoveIndex = 0;
      if (autoMoveTimer) { clearTimeout(autoMoveTimer); autoMoveTimer = null; }
      return;
    }
    
    // Find path using BFS (treat locked doors as walls)
    const path = findPathTo(px, py, x, y);
    if (!path || path.length <= 1) return;
    
    autoMovePath = path;
    autoMoveIndex = 1; // Start from next cell (0 is current)
    autoMoveStep();
  });

  // Prevent clicks on overlay background from falling through to canvas
  ov.addEventListener('click', e => {
    // Only handle clicks directly on the overlay background (not the card)
    if (e.target === ov) {
      e.stopPropagation();
    }
  });

  // Overlay clicks (answers, level buttons)
  ovc.addEventListener('click', e => {
    const btn = e.target.closest('.opts button');
    if (btn) (onAnswer || answer)(+btn.dataset.i);
    const lvlBtn = e.target.closest('[data-l]');
    if (lvlBtn) start(+lvlBtn.dataset.l);
    const powerBtn = e.target.closest('[data-power]');
    if (powerBtn) usePowerup(powerBtn.dataset.power);
  });
}

// ===== MAZE & GAME STATE =====
function start(level) {
  onAnswer = null;
  // Check if level is unlocked
  const saved = storageLoad();
  if (level > saved.unlocked) return;

  lv = CONFIG.levels[level];
  // Generate maze with guaranteed minimum path length
  const mazeResult = generateMazeWithMinPath(lv);
  cells = mazeResult.cells;
  const finish = mazeResult.finish;
  const dist = mazeResult.dist;
  const L = mazeResult.L;

  // Store finish position for later use
  lv.finishX = finish.x;
  lv.finishY = finish.y;

  // Create gates with proper spacing and difficulty labels
  const gateResult = createGates({ dist, L, lv, DM });
  gates = gateResult.gates;
  doorG = gateResult.doorG;

  // Place items (coins and chests) in dead ends
  const itemResult = placeItems(cells, dist, lv, doorG);
  items = itemResult;

  opened = new Set();
  passed = [];
  seen = cells.map(r => r.map(() => 0));

  // Initialize passed array
  for (let i = 0; i < gates.length; i++) passed.push(false);

  hearts = CONFIG.hearts;
  score = 0;
  coins = saved.coins || 0; // Load saved coins
  rep = DM.map(() => ({ c: 0, s: 0 }));
  used.clear();
  px = py = 0;
  powerupState = { fiftyUsed: false, swapUsed: false, pathHintActive: false, pathHintEnd: 0 };
  examMode = false;
  reveal();
  busy = false;
  hide();
  hud();
  draw();
}

function reveal() {
  const r = lv.fog;
  for (let y = 0; y < lv.h; y++) {
    for (let x = 0; x < lv.w; x++) {
      if (!r || Math.max(Math.abs(x - px), Math.abs(y - py)) <= r) seen[y][x] = 1;
    }
  }
}

// ===== MOVEMENT =====
function move(dir) {
  if (busy || !lv || cells[py][px][dir]) return;
  const nx = px + DIR[dir][0], ny = py + DIR[dir][1];
  const key = ek(px, py, dir);
  if (doorG.has(key) && !opened.has(key)) {
    ses = { m: 'd', k: key, gi: doorG.get(key), step: 0, nx, ny };
    nextQ();
    return;
  }
  enter(nx, ny);
}

function enter(nx, ny) {
  if (reducedMotion) {
    px = nx; py = ny;
    reveal();
    draw();
  } else {
    // Animate
    animating = true;
    animStart = performance.now();
    animFrom = { x: px, y: py };
    animTo = { x: nx, y: ny };
    px = nx; py = ny; // Update logical position immediately
    reveal();
    animateMove();
  }

  // Check for coin collection
  const coinKey = `${px},${py}`;
  if (items.coins.has(coinKey)) {
    items.coins.delete(coinKey);
    coins += 1;
    score += CONFIG.reward.coin;
    sfxCoin();
  }

  // Check for chest interaction
  const chestKey = `${px},${py}`;
  if (items.chests.has(chestKey)) {
    items.chests.delete(chestKey);
    openChest();
    return; // Chest opens overlay, movement handled there
  }

  // Check if reached finish (dynamic position)
  if (px === lv.finishX && py === lv.finishY) startExam();
}

/**
 * Find path from (sx, sy) to (tx, ty) using BFS
 * Treats locked doors as walls
 * @returns {Array<{x,y}>} Path including start, or null if no path
 */
function findPathTo(sx, sy, tx, ty) {
  if (!lv || !cells) return null;
  
  const dist = bfs(cells);
  const h = lv.h, w = lv.w;
  
  // Check if target is reachable
  if (dist[ty][tx] < 0) return null;
  
  // Check if there's a locked door blocking the path
  // We'll reconstruct path and check for locked doors
  const path = [];
  let cx = tx, cy = ty;
  
  while (cx !== sx || cy !== sy) {
    path.unshift({ x: cx, y: cy });
    const d = dist[cy][cx];
    let found = false;
    for (const k in DIR) {
      if (cells[cy][cx][k]) continue;
      const nx = cx + DIR[k][0], ny = cy + DIR[k][1];
      if (dist[ny][nx] === d - 1) {
        // Check if this edge has a locked door
        const key = ek(nx, ny, DIR[k][2]); // reverse direction
        if (doorG.has(key) && !opened.has(key)) {
          // Locked door blocks path - stop before it
          return path.length > 0 ? path : null;
        }
        cx = nx; cy = ny;
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  path.unshift({ x: sx, y: sy });
  return path;
}

/**
 * Execute next step of auto-move
 */
function autoMoveStep() {
  if (!autoMovePath || autoMoveIndex >= autoMovePath.length) {
    autoMovePath = null;
    autoMoveIndex = 0;
    return;
  }
  
  const next = autoMovePath[autoMoveIndex];
  const dir = getDirection(px, py, next.x, next.y);
  if (!dir) {
    autoMovePath = null;
    autoMoveIndex = 0;
    return;
  }
  
  // Check if next step hits a locked door
  const key = ek(px, py, dir);
  if (doorG.has(key) && !opened.has(key)) {
    // Stop before locked door - question will appear
    move(dir);
    autoMovePath = null;
    autoMoveIndex = 0;
    return;
  }
  
  move(dir);
  autoMoveIndex++;
  
  // Schedule next step after animation completes
  autoMoveTimer = setTimeout(() => {
    if (autoMovePath && !busy) {
      autoMoveStep();
    }
  }, CONFIG.moveMs + 50);
}

/**
 * Get direction from (x1,y1) to (x2,y2) - assumes adjacent cells
 */
function getDirection(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 1 && dy === 0) return 'E';
  if (dx === -1 && dy === 0) return 'W';
  if (dx === 0 && dy === 1) return 'S';
  if (dx === 0 && dy === -1) return 'N';
  return null;
}

function animateMove() {
  if (!animating) return;
  const elapsed = performance.now() - animStart;
  const progress = Math.min(elapsed / CONFIG.moveMs, 1);
  // Just redraw during animation
  draw();
  if (progress < 1) {
    requestAnimationFrame(animateMove);
  } else {
    animating = false;
    draw();
  }
  
  // Update confetti animation
  updateConfetti();
}

/**
 * Confetti animation loop
 */
function animateConfetti() {
  if (!confettiActive) return;
  updateConfetti();
  draw();
  requestAnimationFrame(animateConfetti);
}

/**
 * Show floating score animation (e.g., +10)
 */
let floatingScores = [];
function showFloatingScore(text, color) {
  floatingScores.push({
    text,
    color,
    x: cv.width / 2,
    y: cv.height / 2,
    life: 1.0,
    startTime: performance.now()
  });
}

/**
 * Draw floating score animations
 */
function drawFloatingScores(ctx) {
  if (floatingScores.length === 0) return;
  const now = performance.now();
  const remaining = [];
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const fs of floatingScores) {
    const elapsed = (now - fs.startTime) / 1000; // seconds
    if (elapsed > 1.5) continue; // 1.5 second lifetime
    fs.life = 1 - elapsed / 1.5;
    ctx.globalAlpha = fs.life;
    ctx.fillStyle = fs.color;
    const yOffset = -elapsed * 60; // Move up
    ctx.fillText(fs.text, fs.x, fs.y + yOffset);
    remaining.push(fs);
  }
  ctx.globalAlpha = 1;
  floatingScores = remaining;
}

/**
 * Confetti animation for exam pass
 */
let confetti = [];
let confettiActive = false;
function startConfetti() {
  if (reducedMotion) return;
  confettiActive = true;
  confetti = [];
  const colors = ['#e5484d', '#22a06b', '#4f7cff', '#e08a00', '#8e4ec6', '#d6409f'];
  for (let i = 0; i < 60; i++) {
    confetti.push({
      x: Math.random() * cv.width,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }
  animateConfetti();
}

function updateConfetti() {
  if (!confettiActive) return;
  let active = false;
  for (const c of confetti) {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.15; // gravity
    c.rotation += c.rotSpeed;
    if (c.y < cv.height + 50) active = true;
  }
  if (!active) confettiActive = false;
}

function drawConfetti(ctx) {
  if (!confettiActive) return;
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    ctx.fillStyle = c.color;
    if (c.shape === 'rect') {
      ctx.fillRect(-c.size/2, -c.size/2, c.size, c.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, c.size/2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ===== QUESTION FLOW =====
function nextQ() {
  busy = true;
  answered = false;
  onAnswer = null;
  powerupState.fiftyUsed = false;
  powerupState.swapUsed = false;
  let di, t;
  if (ses.m === 'd') {
    // Boss gate (gate 6) has different question flow: 5 mixed questions
    if (ses.gi === 5 && gates[ses.gi].boss) {
      // Boss mode: 5 soal campur dari semua domain, tingkat tertinggi
      if (ses.step < 5) {
        // Generate random question from random domain at highest tier
        const dom = rnd(0, 5);
        t = 3; // highest tier
        di = dom;
        // Make sure we don't repeat the same question immediately
        let attempts = 0;
        while (used.has(Q(di, t).q) && attempts < 10) {
          di = rnd(0, 5);
          attempts++;
        }
        if (attempts >= 10) used.clear();
        cur = Q(di, t);
        cur.di = di;
      } else {
        // Boss gate passed - open all doors
        const g = ses.gi;
        if (!passed[g]) {
          passed[g] = true;
          hearts = Math.min(5, hearts + 1);
          score += 50;
          // Open all doors in this gate
          for (const key of gates[g].keys) {
            opened.add(key);
          }
          const domName = DM[gates[g].dom].e;
          msg += ` 👑 Boss Gerbang Terbuka! Semua pintu terbuka (+1 nyawa).`;
        } else {
          opened.add(ses.k);
          msg += ' 🔓 Pintu terbuka!';
        }
        btn = 'Lanjut';
        const { nx, ny } = ses;
        fn = () => { hide(); busy = false; enter(nx, ny); };
        return;
      }
    } else {
      di = gates[ses.gi].dom;
      // Tier dasar untuk langkah gerbang ini (jangan `let t` lagi: itu menutupi `t` luar)
      t = lv.tiers[ses.step];
      // Adjust tier based on door difficulty
      const diffKey = ses.k + ':diff';
      const diff = doorG.get(diffKey);
      if (diff === 'easy') t = Math.max(1, t - 1);
      else if (diff === 'hard') t = Math.min(3, t + 1);
    }
  } else {
    [di, t] = xq[ses.i];
  }
  cur = Q(di, t);
  cur.di = di;
  const d = DM[di];
  const head = ses.m === 'd'
    ? `Pintu ${d.e} ${d.n} · ${'●'.repeat(ses.step)}${'○'.repeat(3 - ses.step)} (harus 3 benar beruntun)`
    : `Ujian Akhir · soal ${ses.i + 1}/12 · ${d.e} ${d.n}`;

  // Timer for exam mode
  let timerHtml = '';
  if (examMode && CONFIG.timer) {
    const timeLeft = Math.max(0, examTimeLeft - (performance.now() - examStartTime) / 1000);
    const minutes = Math.max(0, Math.floor(timeLeft / 60));
    const seconds = Math.max(0, Math.round(timeLeft % 60));
    timerHtml = `<div class="timer-bar" style="width:100%;height:8px;background:var(--muted);margin-bottom:6px;overflow:hidden"><div style="width:100%;height:100%;background:var(--bad);transition:width .5s"></div></div>
      <span style="font-size:.8rem;color:var(--muted)">Waktu: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}</span>`;
    examTimeLeftDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  // Power-up buttons (only in maze, not in exam)
  let powerupHtml = '';
  if (ses.m === 'd' && !examMode) {
    powerupHtml = `<div class="powerups" style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
      <button class="go" data-power="fifty" ${coins < CONFIG.price.fifty ? 'disabled' : ''}>50:50 (${CONFIG.price.fifty}🪙)</button>
      <button class="go" data-power="swap" ${coins < CONFIG.price.swap ? 'disabled' : ''}>Ganti (${CONFIG.price.swap}🪙)</button>
      <button class="go" data-power="path" ${coins < CONFIG.price.path ? 'disabled' : ''}>Jalur (${CONFIG.price.path}🪙)</button>
    </div>`;
  }

  show(`<div class="tag" style="color:${d.c}">${head}</div>
        ${cur.fig ? `<canvas class="fig" width="260" height="200" style="max-width:100%;height:auto;margin:0 auto 8px;display:block;"></canvas>` : ''}
        <div class="q">${cur.q}</div>
        <div class="opts">${cur.opts.map((o, i) => `<button data-i="${i}"><b>${'ABCD'[i]}.</b> ${o}</button>`).join('')}</div>
        ${timerHtml}
        ${powerupHtml}
        <div id="fb"></div>`);

  // Start timer if in exam mode
  if (examMode && CONFIG.timer && ses.m !== 'd') {
    examStartTime = performance.now();
    examTimeLeft = 90; // 90 seconds per question
    startExamTimer();
  }

  // Start timer if in exam mode
  if (examMode && CONFIG.timer) {
    examStartTime = performance.now();
    examTimeLeft = 90; // 90 seconds per question
    examTimeLeftDisplay = document.createElement('span');
    examTimeLeftDisplay.style.fontSize = '.8rem';
    examTimeLeftDisplay.style.color = 'var(--muted)';
    // Insert after the timer HTML was added above
    const timerSpan = ovc.querySelector('.timer-bar + span');
    if (timerSpan) {
      ovc.insertBefore(examTimeLeftDisplay, timerSpan.nextSibling);
    }
    startExamTimer();
  } else if (examMode && CONFIG.timer) {
    // Update display if already running
    const minutes = Math.max(0, Math.floor(examTimeLeft / 60));
    const seconds = Math.max(0, Math.round(examTimeLeft % 60));
    examTimeLeftDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  // Draw figure if present
  if (cur.fig) {
    setTimeout(() => {
      const canvas = ovc.querySelector('.fig');
      if (canvas) {
        const dpr = devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const css = getComputedStyle(document.documentElement);
        const color = css.getPropertyValue('--ink').trim() || '#000';
        const textColor = css.getPropertyValue('--ink').trim() || '#000';
        drawFigure(ctx, cur.fig, rect.width, rect.height, color, textColor, dpr);
      }
    }, 0);
  }
}

function answer(i) {
  if (answered) return;
  answered = true;

  const buttons = ovc.querySelectorAll('.opts button');
  const ok = i === cur.a;
  const r = rep[cur.di];

  buttons[cur.a].classList.add('ok');
  if (!ok) buttons[i].classList.add('bad');
  ok ? r.c++ : r.s++;

  let msg = ok ? '✅ <b>Benar!</b>' : `❌ <b>Belum tepat.</b> Jawaban benar: <b>${cur.opts[cur.a]}</b>.`;
  let btn, fn;

  if (ses.m === 'x') {
    if (ok) xr[cur.di]++;
    ses.i++;
    btn = ses.i < 12 ? 'Soal berikutnya' : 'Lihat hasil ujian';
    fn = ses.i < 12 ? nextQ : rapor;
  } else if (ok) {
    // Boss gate (gate 6) needs 5 correct out of 5, normal gate needs 3 correct out of 3
    if (ses.gi === 5 && gates[ses.gi].boss) {
      ses.stepBoss = (ses.stepBoss || 0) + 1;
      score += 10;
      if (ses.stepBoss < 5) {
        btn = `Soal ${ses.stepBoss + 1}/5`;
        fn = nextQ;
        msg += ` Tinggal ${5 - ses.stepBoss} soal lagi.`;
      } else {
        // Boss gate passed - open all doors
        const g = ses.gi;
        if (!passed[g]) {
          passed[g] = true;
          hearts = Math.min(5, hearts + 1);
          score += 50;
          // Open all doors in this gate
          for (const key of gates[g].keys) {
            opened.add(key);
          }
          msg += ` 👑 Boss Gerbang Terbuka! Semua pintu terbuka (+1 nyawa).`;
        } else {
          // Gate already passed, just open this door
          opened.add(ses.k);
          msg += ' 🔓 Pintu terbuka!';
        }
        btn = 'Lanjut';
        const { nx, ny } = ses;
        fn = () => { hide(); busy = false; enter(nx, ny); };
      }
    } else {
      ses.step++;
      score += 10;
      if (ses.step < 3) {
        btn = 'Soal berikutnya';
        fn = nextQ;
        msg += ` Tinggal ${3 - ses.step} soal lagi.`;
      } else {
        // Open ALL doors in this gate (not just the one door)
        const g = ses.gi;
        if (!passed[g]) {
          passed[g] = true;
          hearts = Math.min(5, hearts + 1);
          score += 30;
          // Open all doors in this gate
          for (const key of gates[g].keys) {
            opened.add(key);
          }
          msg += ` 🔓 Gerbang <b>${DM[gates[g].dom].n}</b> lulus! Semua pintu terbuka (+1 nyawa).`;
        } else {
          // Gate already passed, just open this door
          opened.add(ses.k);
          msg += ' 🔓 Pintu terbuka!';
        }
        btn = 'Lanjut';
        const { nx, ny } = ses;
        fn = () => { hide(); busy = false; enter(nx, ny); };
      }
    }
  } else {
    hearts--;
    msg += ' Nyawa −1. Pintu mengulang dari soal 1.';
    ses = null;
    btn = hearts > 0 ? 'Tutup' : 'Main lagi';
    fn = () => { if (hearts > 0) { hide(); busy = false; } else menu('Nyawa habis 💔'); };
  }

  // Sound & vibration
  if (ok) { 
    sfxCorrect(); 
    showFloatingScore('+10', 'var(--ok)');
  } else { 
    sfxWrong(); 
    // Vibrate on wrong answer
    const saved = storageLoad();
    if (saved.settings.vibrate && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  hud();
  draw();

  $('#fb').innerHTML = `${msg}<br>💡 ${cur.exp}<button class="go" id="nx">${btn}</button>`;
  $('#nx').onclick = fn;
}

function startExam() {
  busy = true;
  examMode = true;
  examTimeLeft = 90;
  examStartTime = performance.now();
  xr = DM.map(() => 0);
  xq = [];
  for (let r = 1; r <= 2; r++) shuf([0, 1, 2, 3, 4, 5]).forEach(d => xq.push([d, lv.tiers[r]]));
  ses = { m: 'x', i: 0 };
  show(`<h2>🏁 Gerbang Ujian Akhir</h2>
        <p>Simulasi TKA: <b>12 soal</b> (2 soal tiap kompetensi). Kamu lulus jika benar minimal <b>${lv.pass}/12</b>. Jika belum lulus, kamu mengulang dengan soal baru.</p>
        <p style="font-size:0.85rem;opacity:0.7">⚠️ Power-up dinonaktifkan di ujian akhir</p>
        <p>⏱️ 90 detik per soal</p>
        <button class="go" id="nx">Mulai ujian</button>`);
  $('#nx').onclick = nextQ;
}

function rapor() {
  const tot = xr.reduce((a, b) => a + b);
  const ok = tot >= lv.pass;
  const rows = DM.map((d, i) => {
    const r = rep[i];
    return `<div class="rw"><span>${d.e} ${d.n}</span><span>Ujian ${xr[i]}/2 · Labirin ${r.c}/${r.c + r.s}</span></div>`;
  }).join('');
  const weak = DM.filter((d, i) => xr[i] < 2).map(d => d.n);
  if (!ok) { hearts--; hud(); }
  const over = !ok && hearts <= 0;

  const saved = storageLoad();
    const level = Object.keys(CONFIG.levels).find(k => CONFIG.levels[k] === lv);
    const levelNum = parseInt(level);
    
    // Calculate stars
    const starsEarned = calculateStars({ examScore: tot, heartsAtFinish: hearts, levelPass: lv.pass, examSize: CONFIG.examSize });
    const currentStars = saved.stars[levelNum] || 0;
    if (starsEarned > currentStars) {
      saved.stars[levelNum] = starsEarned;
    }
    
    // Update best score
    if (tot > (saved.bestScore[levelNum] || 0)) {
      saved.bestScore[levelNum] = tot;
    }
    
    // Unlock next level
    if (levelNum < 3 && saved.unlocked < levelNum + 1) {
      saved.unlocked = levelNum + 1;
    }
    
    // Update mastery (merge with existing)
    saved.mastery = saved.mastery.map((m, i) => ({
      c: m.c + rep[i].c,
      s: m.s + rep[i].s
    }));
    
    // Save coins (always, even if failed)
    saved.coins = coins;
    
    storageSave(saved);
    // Start confetti celebration (only if passed)
    if (ok) {
      startConfetti();
      sfxLevelUp();
    }

  show(`<h2>${ok ? '🎓 LULUS Simulasi TKA!' : '📋 Belum lulus'}</h2>
        <p style="text-align:center;font-size:1.3rem;margin:4px"><b>${tot}/12</b> benar (minimal ${lv.pass})</p>
        ${rows}
        <p>${weak.length ? `Perlu diulang: <b>${weak.join(', ')}</b>.` : 'Semua kompetensi aman. Hebat!'}${ok ? '' : ' Nyawa −1.'}</p>
        <p style="text-align:center;margin:8px 0">
          <button class="go" id="copy-rapor">📋 Salin ringkasan</button>
        </p>
        ${ok ? lvBtns() : `<button class="go" id="nx">${over ? 'Main lagi' : 'Ulangi ujian (soal baru)'}</button>`}`);
  if (!ok) $('#nx').onclick = () => over ? menu('Nyawa habis 💔') : startExam();
}

// ===== CHEST & POWER-UPS =====

function openChest() {
  // Chest gives a bonus question (medium difficulty from any domain)
  const di = rnd(0, 5);
  const t = 2; // medium tier
  cur = Q(di, t);
  cur.di = di;
  const d = DM[di];
  show(`<div class="tag" style="color:${d.c}">🎁 Peti Bonus · ${d.e} ${d.n} (tingkat sedang)</div>
        <div class="q">${cur.q}</div>
        <div class="opts">${cur.opts.map((o, i) => `<button data-i="${i}"><b>${'ABCD'[i]}.</b> ${o}</button>`).join('')}</div>
        <div id="fb"></div>`);
  busy = true;
  answered = false;

  // Override the next button to handle chest reward
  const handleChestAnswer = (i) => {
    if (answered) return;
    answered = true;

    const buttons = ovc.querySelectorAll('.opts button');
    const ok = i === cur.a;
    const r = rep[cur.di];

    buttons[cur.a].classList.add('ok');
    if (!ok) buttons[i].classList.add('bad');
    ok ? r.c++ : r.s++;

    let msg = ok ? '✅ <b>Benar!</b>' : `❌ <b>Belum tepat.</b> Jawaban benar: <b>${cur.opts[cur.a]}</b>.`;

    if (ok) {
      coins += CONFIG.reward.chest;
      score += 20;
      msg += ` +${CONFIG.reward.chest} 🪙 +20 ⭐`;
      sfxChest();
    } else {
      sfxWrong();
    }

    hud();
    draw();

    $('#fb').innerHTML = `${msg}<br>💡 ${cur.exp}<button class="go" id="nx">Lanjut</button>`;
    $('#nx').onclick = () => { onAnswer = null; hide(); busy = false; draw(); };
  };

  // Jawaban peti ditangani handler ini, BUKAN answer() (logika pintu)
  onAnswer = handleChestAnswer;
}

function usePowerup(type) {
  if (examMode) return; // Power-ups disabled in exam

  if (type === 'fifty') {
    if (coins < CONFIG.price.fifty || powerupState.fiftyUsed || !cur) return;
    coins -= CONFIG.price.fifty;
    powerupState.fiftyUsed = true;
    applyFiftyFifty();
    sfxPowerup();
  } else if (type === 'swap') {
    if (coins < CONFIG.price.swap || powerupState.swapUsed || !cur) return;
    coins -= CONFIG.price.swap;
    powerupState.swapUsed = true;
    swapQuestion();
    sfxPowerup();
  } else if (type === 'path') {
    if (coins < CONFIG.price.path || powerupState.pathHintActive || !lv) return;
    coins -= CONFIG.price.path;
    powerupState.pathHintActive = true;
    powerupState.pathHintEnd = performance.now() + CONFIG.pathHintMs;
    sfxPowerup();
  }
  hud();
  draw();
}

function applyFiftyFifty() {
  if (!cur) return;
  const buttons = ovc.querySelectorAll('.opts button');
  let hidden = 0;
  for (let i = 0; i < buttons.length && hidden < 2; i++) {
    if (i !== cur.a && !buttons[i].classList.contains('hidden')) {
      buttons[i].classList.add('hidden');
      buttons[i].disabled = true;
      hidden++;
    }
  }
}

function swapQuestion() {
  if (!cur || !ses || ses.m !== 'd') return;
  const di = gates[ses.gi].dom;
  const t = lv.tiers[ses.step];
  const oldQ = cur.q;
  let curNew = Q(di, t);
  // Ensure different question
  if (curNew.q === oldQ) curNew = Q(di, t);
  cur = curNew;
  cur.di = di;
  powerupState.fiftyUsed = false; // Reset 50:50 for new question
  const d = DM[di];
  const head = `Pintu ${d.e} ${d.n} · ${'●'.repeat(ses.step)}${'○'.repeat(3 - ses.step)} (harus 3 benar beruntun)`;
  const figHtml = cur.fig ? `<canvas class="fig" width="260" height="200" style="max-width:100%;height:auto;margin:0 auto 8px;display:block;"></canvas>` : '';
  const powerupHtml = ses.m === 'd' && !examMode
    ? `<div class="powerups" style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
       <button class="go" data-power="fifty" ${coins < CONFIG.price.fifty ? 'disabled' : ''}>50:50 (${CONFIG.price.fifty}🪙)</button>
       <button class="go" data-power="swap" ${coins < CONFIG.price.swap ? 'disabled' : ''}>Ganti (${CONFIG.price.swap}🪙)</button>
       <button class="go" data-power="path" ${coins < CONFIG.price.path ? 'disabled' : ''}>Jalur (${CONFIG.price.path}🪙)</button>
     </div>` : '';
  show(`<div class="tag" style="color:${d.c}">${head}</div>
        ${figHtml}
        <div class="q">${cur.q}</div>
        <div class="opts">${cur.opts.map((o, i) => `<button data-i="${i}"><b>${'ABCD'[i]}.</b> ${o}</button>`).join('')}</div>
        ${powerupHtml}
        <div id="fb"></div>`);
  answered = false;
}

const lvBtns = () => {
  const saved = storageLoad();
  return `<div class="lv">${[1, 2, 3].map(l => {
    const cfg = CONFIG.levels[l];
    const unlocked = l <= saved.unlocked;
    const stars = saved.stars[l] || 0;
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const lockIcon = unlocked ? '' : '🔒 ';
    const disabled = unlocked ? '' : 'disabled';
    const title = unlocked ? '' : ' title="Terkunci - lulus level sebelumnya untuk membuka"';
    return `<button class="go" data-l="${l}" ${disabled}${title}>${lockIcon}${['🟢', '🟡', '🔴'][l - 1]} ${cfg.name} (${cfg.w}×${cfg.h}${cfg.fog ? ', berkabut' : ''}) · lulus ${cfg.pass}/12 ${starStr}</button>`;
  }).join('')}</div>`;
};

function menu(title) {
  busy = true;
  onAnswer = null;
  if (typeof title !== 'string') title = undefined; // cegah event klik jadi judul
  const saved = storageLoad();
  
  // Daily mission: seed based on today's date
  const today = new Date().toISOString().split('T')[0];
  const dailyEl = document.getElementById('daily-mission');
  if (dailyEl) {
    const saved = storageLoad();
    const dailyDone = saved.daily.date === today && saved.daily.done;
    dailyEl.style.display = 'none';
    if (!dailyDone) {
      dailyEl.style.display = 'block';
      dailyEl.innerHTML = `<h3>🎯 Misi Harian</h3>
            <p>Seed hari ini: ${today}</p>
            <button class="go" id="start-daily">Mulai Misi</button>`;
      setTimeout(() => {
        document.getElementById('start-daily').onclick = startDailyMission;
      }, 0);
    }
  }

  // Build mastery display
  const masteryHtml = saved.mastery.map((m, i) => {
    const d = DM[i];
    const total = m.c + m.s;
    const pct = total > 0 ? Math.round((m.c / total) * 100) : 0;
    const barWidth = Math.max(5, pct);
    return `<div class="mastery-bar" style="--c:${d.c}"><span>${d.e} ${d.s}</span><div class="bar"><div class="fill" style="width:${barWidth}%"></div></div><span>${pct}%</span></div>`;
  }).join('');

  show(`<h2>${title || '🚪 Labirin Penguasa TKA'}</h2>
        <p>Cari jalan dari 🧒 ke 🏁. Labirin punya <b>6 gerbang kompetensi</b> (bilangan, pecahan & perbandingan, geometri, pengukuran, data, penalaran). <b>Semua jalur</b> melewati pintu di tiap gerbang.</p>
        <p>Tiap pintu: <b>3 soal benar beruntun</b>. Salah = nyawa −1 dan ulang dari soal 1. Di finish ada <b>ujian akhir 12 soal</b>.</p>
        <div id="daily-mission" style="margin:12px 0;text-align:left"></div>
        ${lvBtns()}
        <div class="menu-extras">
          <h3>📊 Kompetensi kamu</h3>
          <div class="mastery-container">${masteryHtml}</div>
          <label style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer">
            <input type="checkbox" id="timer-toggle" ${saved.settings.timer ? 'checked' : ''} style="margin:0;width:18px;height:18px">
            <span style="font-size:.8rem">Timer ujian 90s</span>
          </label>
          <button class="go" id="weak-practice" style="margin-top:8px">🎯 Latihan Topik Lemah</button>
          <button class="go" id="reset-progress" style="margin-top:8px;background:#e5484d">🗑️ Reset Progres</button>
        </div>`);
  
  // Attach event listeners for new buttons
  setTimeout(() => {
    const weakBtn = document.getElementById('weak-practice');
    if (weakBtn) weakBtn.onclick = startWeakPractice;
    const resetBtn = document.getElementById('reset-progress');
    if (resetBtn) resetBtn.onclick = confirmResetProgress;
    const timerToggle = document.getElementById('timer-toggle');
    if (timerToggle) {
      timerToggle.onclick = () => {
        const enabled = !timerToggle.checked;
        storagePatch({ settings: { ...saved.settings, timer: enabled } });
        hud();
      };
    }
    const copyRaporBtn = document.getElementById('copy-rapor');
    if (copyRaporBtn) {
      copyRaporBtn.onclick = () => {
        const tot = xr.reduce((a, b) => a + b);
        const ok = tot >= lv.pass;
        const weak = DM.filter((d, i) => xr[i] < 2).map(d => d.n);
        const summary = `Labirin Penguasa TKA - Rapor Akhir\n`
                      + `Level: ${Object.keys(CONFIG.levels).find(k => CONFIG.levels[k] === lv) || 'unknown'}\n`
                      + `Skor: ${tot}/12 (minimal ${lv.pass} lulus)\n`
                      + `Status: ${ok ? 'LULUS' : 'Belum lulus'}\n`
                      + `Kompetensi:\n`;
        const saved = storageLoad();
        const masteryHtml = saved.mastery.map((m, i) => {
          const d = DM[i];
          const total = m.c + m.s;
          const pct = total > 0 ? Math.round((m.c / total) * 100) : 0;
          return `- ${d.e} ${d.n}: ${m.c} benar/${total} (${pct}%)`;
        }).join('\n');
        const text = summary + masteryHtml + `\n${weak.length ? 'Topik lemah: ' + weak.join(', ') : 'Semua aman'}\nKoin: ${coins}`;
        navigator.clipboard.writeText(text).then(() => {
          copyRaporBtn.textContent = '✅ Disalin!';
          setTimeout(() => { copyRaporBtn.textContent = '📋 Salin ringkasan'; }, 2000);
        });
      };
    }
  }, 0);
}

// ===== LATIHAN TOPIK LEMAH =====
function startWeakPractice() {
  const saved = storageLoad();
  const unlockedLevel = saved.unlocked;
  const tier = CONFIG.levels[unlockedLevel].tiers[2]; // Highest tier for unlocked level
  
  // Pick 2 weakest topics
  const weakTopics = pickWeakTopics(saved.mastery, 5);
  
  // Generate 10 questions (5 per topic)
  const questions = generateWeakTopicQuestions({ DM, Q, weakTopics, tier, countPerTopic: 5 });
  
  // Weak practice state
  let wpIndex = 0;
  let wpCorrect = 0;
  const wpCoins = 0;
  let wpAnswered = false;
  
  function showWpQuestion() {
    if (wpIndex >= questions.length) {
      // Session complete
      const earnedCoins = wpCorrect; // 1 koin per benar, max 10
      storagePatch({ coins: saved.coins + earnedCoins });
      show(`<h2>🎯 Latihan Topik Lemah Selesai</h2>
            <p>Benar: <b>${wpCorrect}/${questions.length}</b></p>
            <p>Koin didapat: <b>+${earnedCoins} 🪙</b></p>
            <p>Topik: ${DM[weakTopics[0]].n} & ${DM[weakTopics[1]].n}</p>
            <button class="go" id="nx">Kembali ke Menu</button>`);
      onAnswer = null;
      $('#nx').onclick = () => menu();
      return;
    }
    
    const q = questions[wpIndex];
    const d = DM[q.di];
    wpAnswered = false;
    show(`<div class="tag" style="color:${d.c}">🎯 Latihan Topik Lemah · ${wpIndex + 1}/10 · ${d.e} ${d.n}</div>
          <div class="q">${q.q}</div>
          <div class="opts">${q.opts.map((o, i) => `<button data-i="${i}"><b>${'ABCD'[i]}.</b> ${o}</button>`).join('')}</div>
          <div id="fb"></div>`);
    
    answered = false;
    onAnswer = i => handleWpAnswer(i, q);
  }
  
  function handleWpAnswer(i, q) {
    if (wpAnswered) return;
    wpAnswered = true;
    answered = true;
    
    const buttons = ovc.querySelectorAll('.opts button');
    const ok = i === q.a;
    
    buttons[q.a].classList.add('ok');
    if (!ok) buttons[i].classList.add('bad');
    
    if (ok) wpCorrect++;
    
    let msg = ok ? '✅ <b>Benar!</b>' : `❌ <b>Belum tepat.</b> Jawaban benar: <b>${q.opts[q.a]}</b>.`;
    msg += `<br>💡 ${q.exp}`;
    
    $('#fb').innerHTML = `${msg}<button class="go" id="nx">Soal berikutnya</button>`;
    $('#nx').onclick = () => {
      wpIndex++;
      showWpQuestion();
    };
    
    // Tambahkan hasil jawaban ini ke mastery tersimpan (merge, bukan timpa)
    const saved = storageLoad();
    const m = saved.mastery[q.di];
    saved.mastery[q.di] = { c: m.c + (ok ? 1 : 0), s: m.s + (ok ? 0 : 1) };
    storageSave(saved);
  }
  
  // Hide menu and start
  hide();
  busy = true;
  showWpQuestion();
}

// ===== RESET PROGRES =====
function confirmResetProgress() {
  show(`<h2>⚠️ Reset Progres?</h2>
        <p>Semua data akan dihapus:<br>
        - Level terkunci/bintang<br>
        - Koin & skor<br>
        - Mastery kompetensi<br>
        - Pengaturan suara/getar</p>
        <p>Tindakan ini <b>tidak bisa dibatalkan</b>.</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
          <button class="go" id="confirm-reset" style="background:#e5484d">Ya, hapus semua</button>
          <button class="go" id="cancel-reset">Batal</button>
        </div>`);
  
  setTimeout(() => {
    document.getElementById('confirm-reset').onclick = doResetProgress;
    document.getElementById('cancel-reset').onclick = () => menu();
  }, 0);
}

function doResetProgress() {
  storageReset();
  menu('Progres direset. Selamat bermain!');
}

/** Timer untuk ujian akhir */
function startExamTimer() {
  examTimeLeftDisplay = document.createElement('span');
  examTimeLeftDisplay.style.position = 'absolute';
  examTimeLeftDisplay.style.top = '100px';
  examTimeLeftDisplay.style.right = '10px';
  examTimeLeftDisplay.style.fontSize = '.8rem';
  examTimeLeftDisplay.style.color = 'var(--muted)';
  ovc.appendChild(examTimeLeftDisplay);
  updateExamTimer();
}

/** Update tampilan timer ujian */
function updateExamTimer() {
  if (examTimeLeft > 0) {
    const minutes = Math.floor(examTimeLeft / 60);
    const seconds = examTimeLeft % 60;
    examTimeLeftDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    examTimeLeft--;
    setTimeout(updateExamTimer, 1000);
  } else {
    // Waktu habis - jawab salah
    examTimeLeftDisplay.textContent = '0:00';
    if (!answered) {
      answered = true;
      // Handle time out as wrong answer
      const buttons = ovc.querySelectorAll('.opts button');
      buttons[cur.a].classList.add('bad');
      rep[cur.di].s++;
      hearts--;
      score -= 10;
      sfxWrong();
      showFloatingScore('+0 (waktu habis)', 'var(--bad)');
      
      const msg = `⏰ Waktu habis! Jawaban benar: <b>${cur.opts[cur.a]}</b>.`;
      $('#fb').innerHTML = `${msg}<br>💡 ${cur.exp}<button class="go" id="nx">Soal berikutnya</button>`;
      $('#nx').onclick = () => {
        onAnswer = null;
        hide();
        busy = false;
        nextQ();
      };
    }
  }
}

/** Simple hash for daily mission seed */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return hash;
}

/** Start daily mission with date-based seed */
function startDailyMission() {
  const today = new Date().toISOString().split('T')[0];
  setSeed(hashCode(today));
  clearSeed();
  const saved = storageLoad();
  saved.coins = (saved.coins || 0) + 10;
  saved.daily = { date: today, done: true };
  storageSave(saved);
  menu(`✅ Misi Harian Selesai! +10 🪙. Koin total: ${saved.coins}.`);
}

// ===== UI HELPERS =====
function show(html) { ovc.innerHTML = html; ov.classList.remove('off'); }
function hide() { ov.classList.add('off'); }

function hud() {
  const saved = storageLoad();
  const soundIcon = isSoundEnabled() ? '🔊' : '🔇';
  $('#hud').innerHTML = `<span>${'❤️'.repeat(Math.max(0, hearts)) || '💔'}</span><span>🚪 ${passed.filter(Boolean).length}/6</span><span>⭐ ${score}</span><span>🪙 ${coins}</span><button class="hud-btn" id="sound-toggle" aria-label="${isSoundEnabled() ? 'Matikan suara' : 'Nyalakan suara'}">${soundIcon}</button>`;
  $('#comp').innerHTML = gates.map((g, i) => {
    const d = DM[g.dom];
    return `<span class="chip${passed[i] ? ' on' : ''}" style="--c:${d.c}">${i + 1}. ${d.e} ${d.s}${passed[i] ? ' ✓' : ''}</span>`;
  }).join('');
  
}

function toggleSound() {
  const enabled = !isSoundEnabled();
  setSoundEnabled(enabled);
  storagePatch({ settings: { ...storageLoad().settings, sound: enabled } });
  hud();
}

// Draw shortest path hint from player to finish
function drawPathHint(g, cs) {
  const dist = bfs(cells);
  // Reconstruct path from player to finish
  const path = [];
  let cx = px, cy = py;
  const fx = lv.finishX, fy = lv.finishY;

  if (dist[cy][cx] < 0 || dist[fy][fx] < 0) return;

  // Walk backwards from finish to player
  let tx = fx, ty = fy;
  while (tx !== cx || ty !== cy) {
    path.unshift({ x: tx, y: ty });
    const d = dist[ty][tx];
    for (const k in DIR) {
      if (cells[ty][tx][k]) continue;
      const nx = tx + DIR[k][0], ny = ty + DIR[k][1];
      if (dist[ny][nx] === d - 1) {
        tx = nx; ty = ny;
        break;
      }
    }
  }
  path.unshift({ x: cx, y: cy });

  // Draw path as dotted line
  g.strokeStyle = '#ffd54a';
  g.lineWidth = Math.max(2, cs * 0.1);
  g.setLineDash([cs * 0.3, cs * 0.3]);
  g.globalAlpha = 0.8;
  g.beginPath();
  g.moveTo(path[0].x * cs + cs / 2, path[0].y * cs + cs / 2);
  for (let i = 1; i < path.length; i++) {
    g.lineTo(path[i].x * cs + cs / 2, path[i].y * cs + cs / 2);
  }
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;
}

// ===== FIGURE DRAWING (for questions) =====
/**
 * Draw geometric figure on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} fig - Figure description {type, ...params}
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} color - Stroke color (CSS variable)
 * @param {string} textColor - Text color (CSS variable)
 * @param {number} dpr - Device pixel ratio
 */
function drawFigure(ctx, fig, width, height, color, textColor, dpr) {
  if (!fig || !fig.type) return;

  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) * 0.38; // Base scale factor

  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(2, 2 * dpr);
  ctx.strokeStyle = color;
  ctx.fillStyle = textColor;
  ctx.font = `${Math.max(12, 14 * dpr)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  switch (fig.type) {
    case 'rect': { // Persegi panjang
      const p = fig.p || 10, l = fig.l || 6;
      const aspect = p / l;
      let w = scale, h = scale / aspect;
      if (h > scale) { h = scale; w = scale * aspect; }
      const hw = w / 2, hh = h / 2;
      ctx.strokeRect(-hw, -hh, w, h);
      // Label sisi p (horizontal)
      ctx.fillText(fig.labelP || 'p', 0, -hh - 10 * dpr);
      ctx.beginPath();
      ctx.moveTo(-hw, -hh - 5 * dpr); ctx.lineTo(-hw, -hh - 15 * dpr);
      ctx.moveTo(hw, -hh - 5 * dpr); ctx.lineTo(hw, -hh - 15 * dpr);
      ctx.stroke();
      // Label sisi l (vertikal)
      ctx.save();
      ctx.translate(hw + 15 * dpr, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(fig.labelL || 'l', 0, 0);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(hw + 5 * dpr, -hh); ctx.lineTo(hw + 15 * dpr, -hh);
      ctx.moveTo(hw + 5 * dpr, hh); ctx.lineTo(hw + 15 * dpr, hh);
      ctx.stroke();
      break;
    }
    case 'tri': { // Segitiga (sama kaki, alas horizontal)
      const a = fig.a || 10, h = fig.h || 8;
      const aspect = a / h;
      let w = scale, hDraw = scale / aspect;
      if (hDraw > scale) { hDraw = scale; w = scale * aspect; }
      const hw = w / 2, hh = hDraw / 2;
      ctx.beginPath();
      ctx.moveTo(0, -hh); // Puncak atas
      ctx.lineTo(-hw, hh); // Kiri bawah
      ctx.lineTo(hw, hh); // Kanan bawah
      ctx.closePath();
      ctx.stroke();
      // Garis tinggi (putus-putus)
      ctx.setLineDash([5 * dpr, 5 * dpr]);
      ctx.beginPath();
      ctx.moveTo(0, -hh); ctx.lineTo(0, hh);
      ctx.stroke();
      ctx.setLineDash([]);
      // Tanda siku di tengah bawah
      const sq = 6 * dpr;
      ctx.strokeRect(-sq / 2, hh - sq / 2, sq, sq);
      // Label
      ctx.fillText(fig.labelA || 'a', 0, hh + 18 * dpr);
      ctx.fillText(fig.labelH || 'h', 10 * dpr, 0);
      break;
    }
    case 'trap': { // Trapesium (sisi sejajar horizontal)
      const a = fig.a || 12, b = fig.b || 8, h = fig.h || 6;
      const aspect = Math.max(a, b) / h;
      let w = scale, hDraw = scale / aspect;
      if (hDraw > scale) { hDraw = scale; w = scale * aspect; }
      const hw1 = (w * a / Math.max(a, b)) / 2;
      const hw2 = (w * b / Math.max(a, b)) / 2;
      const hh = hDraw / 2;
      ctx.beginPath();
      ctx.moveTo(-hw1, -hh); ctx.lineTo(hw1, -hh); // Atas (a)
      ctx.lineTo(hw2, hh); // Kanan bawah
      ctx.lineTo(-hw2, hh); // Kiri bawah (b)
      ctx.closePath();
      ctx.stroke();
      // Garis tinggi
      ctx.setLineDash([5 * dpr, 5 * dpr]);
      ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(0, hh); ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillText(fig.labelA || 'a', 0, -hh - 12 * dpr);
      ctx.fillText(fig.labelB || 'b', 0, hh + 20 * dpr);
      ctx.fillText(fig.labelH || 'h', Math.max(hw1, hw2) + 12 * dpr, 0);
      break;
    }
    case 'combo': { // Persegi + segitiga di atas (rumah)
      const s = fig.s || 8, h = fig.h || 6;
      const totalH = s + h;
      const aspect = s / totalH;
      let w = scale, hDraw = scale / aspect;
      if (hDraw > scale) { hDraw = scale; w = scale * aspect; }
      const unit = hDraw / totalH;
      const sqSize = s * unit;
      const triH = h * unit;
      const hw = sqSize / 2;
      // Persegi
      ctx.strokeRect(-hw, triH - hw, sqSize, sqSize);
      // Segitiga di atas
      ctx.beginPath();
      ctx.moveTo(0, triH - hw - triH); // Puncak
      ctx.lineTo(-hw, triH - hw); // Kiri
      ctx.lineTo(hw, triH - hw); // Kanan
      ctx.closePath();
      ctx.stroke();
      // Label
      ctx.fillText(fig.labelS || 's', 0, triH - hw - triH - 10 * dpr);
      ctx.fillText(fig.labelH || 'h', hw + 12 * dpr, triH - hw - triH / 2);
      break;
    }
    case 'box': { // Balok/kubus (proyeksi isometrik sederhana)
      const p = fig.p || 8, l = fig.l || 6, t = fig.t || 5;
      const offsetX = scale * 0.35;
      const offsetY = scale * 0.2;
      const w = scale * 0.7, h = scale * 0.5, d = scale * 0.35;
      // Face depan
      ctx.strokeRect(-w/2, -h/2, w, h);
      // Face atas
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2);
      ctx.lineTo(-w/2 + offsetX, -h/2 - offsetY);
      ctx.lineTo(w/2 + offsetX, -h/2 - offsetY);
      ctx.lineTo(w/2, -h/2);
      ctx.closePath();
      ctx.stroke();
      // Face samping
      ctx.beginPath();
      ctx.moveTo(w/2, -h/2);
      ctx.lineTo(w/2 + offsetX, -h/2 - offsetY);
      ctx.lineTo(w/2 + offsetX, h/2 - offsetY);
      ctx.lineTo(w/2, h/2);
      ctx.closePath();
      ctx.stroke();
      // Garis tersembunyi (putus-putus)
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(-w/2, h/2);
      ctx.lineTo(-w/2 + offsetX, h/2 - offsetY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-w/2 + offsetX, -h/2 - offsetY);
      ctx.lineTo(-w/2 + offsetX, h/2 - offsetY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      if (fig.isCylinder || fig.isCone) {
        ctx.fillText(fig.labelP || 'r', 0, h/2 + 15 * dpr);
        ctx.fillText(fig.labelT || 't', w/2 + offsetX + 10 * dpr, 0);
      } else {
        ctx.fillText(fig.labelP || 'p', 0, h/2 + 15 * dpr);
        ctx.fillText(fig.labelL || 'l', w/2 + offsetX + 10 * dpr, -h/2 - offsetY - 5 * dpr);
        ctx.fillText(fig.labelT || 't', w/2 + offsetX + 10 * dpr, h/2 - offsetY + 5 * dpr);
      }
      break;
    }
    case 'angle': { // Sudut (busur + dua garis)
      const angle = fig.angle || 60;
      const angle1 = fig.angle1 || 60;
      const angle2 = fig.angle2 || 60;
      const r = scale * 0.35;
      // Garis 1 (horizontal ke kanan)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 1.5, 0);
      ctx.stroke();
      // Garis 2
      let aRad;
      if (fig.supplement) {
        aRad = (180 - angle) * Math.PI / 180;
      } else if (fig.angle1 !== undefined && fig.angle2 !== undefined) {
        // Dua sudut segitiga - gambar sudut pertama
        aRad = angle1 * Math.PI / 180;
      } else {
        aRad = angle * Math.PI / 180;
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 1.5 * Math.cos(aRad), -r * 1.5 * Math.sin(aRad));
      ctx.stroke();
      // Busur sudut
      ctx.beginPath();
      ctx.arc(0, 0, r, -aRad, 0);
      ctx.stroke();
      // Label sudut
      const labelR = r * 0.6;
      const labelAngle = -aRad / 2;
      ctx.fillText(fig.label || `${angle}°`, labelR * Math.cos(labelAngle), labelR * Math.sin(labelAngle));
      if (fig.label1) {
        ctx.fillText(fig.label1, r * 1.7, 0);
      }
      if (fig.label2) {
        ctx.fillText(fig.label2, r * 1.7 * Math.cos(aRad), -r * 1.7 * Math.sin(aRad));
      }
      break;
    }
    case 'clock': { // Jam analog
      const hour = fig.hour || 3;
      const minute = fig.minute || 0;
      const r = scale * 0.45;
      // Lingkaran jam
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.stroke();
      // Tanda jam (12 titik)
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 - Math.PI / 2;
        const r1 = r * 0.85;
        const r2 = r * 0.95;
        ctx.beginPath();
        ctx.moveTo(r1 * Math.cos(a), r1 * Math.sin(a));
        ctx.lineTo(r2 * Math.cos(a), r2 * Math.sin(a));
        ctx.stroke();
      }
      // Jarum jam
      const hourAngle = (hour % 12 + minute / 60) * Math.PI / 6 - Math.PI / 2;
      const hourLen = r * 0.5;
      ctx.lineWidth = Math.max(3, 3 * dpr);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(hourLen * Math.cos(hourAngle), hourLen * Math.sin(hourAngle));
      ctx.stroke();
      // Jarum menit
      const minAngle = minute * Math.PI / 30 - Math.PI / 2;
      const minLen = r * 0.75;
      ctx.lineWidth = Math.max(2, 2 * dpr);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(minLen * Math.cos(minAngle), minLen * Math.sin(minAngle));
      ctx.stroke();
      // Tengah
      ctx.beginPath();
      ctx.arc(0, 0, 3 * dpr, 0, 2 * Math.PI);
      ctx.fill();
      ctx.lineWidth = Math.max(2, 2 * dpr);
      break;
    }
  }

  ctx.restore();
}

// ===== DRAWING =====
function draw() {
  if (!lv) return;

  const wide = matchMedia('(min-width:860px)').matches;
  // Safely get element heights
  function getHeight(sel) {
    const el = $(sel);
    return el ? el.offsetHeight + 8 : 0;
  }
  const side = ['h1', '#hud', '#comp', '#pad', '.hint'].reduce((a, s) => a + (wide && s !== 'h1' ? 0 : getHeight(s)), 0);
  const avail = Math.min(wrap?.clientWidth || 320, Math.max(220, innerHeight - side - 36), wide ? 720 : 620);
  const cs = Math.floor(avail / lv.w);
  const S = cs * lv.w, Hh = cs * lv.h;
  const r = devicePixelRatio || 1;

  cv.width = S * r; cv.height = Hh * r;
  cv.style.width = S + 'px'; cv.style.height = Hh + 'px';

  const g = cv.getContext('2d');
  g.setTransform(r, 0, 0, r, 0, 0);

  const css = getComputedStyle(document.documentElement);
  const col = n => css.getPropertyValue(n).trim();

  // Floor
  g.fillStyle = col('--floor'); g.fillRect(0, 0, S, Hh);
  g.fillStyle = '#22a06b66'; g.fillRect(0, 0, cs, cs); // Start

  // Walls
  g.strokeStyle = col('--wall');
  g.lineWidth = Math.max(3, cs * 0.08);
  g.lineCap = 'round';
  g.beginPath();
  for (let y = 0; y < lv.h; y++) {
    for (let x = 0; x < lv.w; x++) {
      const c = cells[y][x], X = x * cs, Y = y * cs;
      if (c.N) { g.moveTo(X, Y); g.lineTo(X + cs, Y); }
      if (c.S) { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); }
      if (c.W) { g.moveTo(X, Y); g.lineTo(X, Y + cs); }
      if (c.E) { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); }
    }
  }
  g.stroke();

  // Doors
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [k, gi] of doorG) {
    // Skip difficulty marker entries
    if (k.endsWith(':diff')) continue;
    const [x, y, d] = k.split(','), X = +x * cs, Y = +y * cs;
    const op = opened.has(k), dm = DM[gates[gi].dom];
    // Get difficulty label
    const diffKey = k + ':diff';
    const diff = doorG.get(diffKey); // 'easy', 'hard', 'normal', or undefined
    let x1, y1, x2, y2;
    if (d === 'E') { x1 = x2 = X + cs; y1 = Y + cs * 0.1; y2 = Y + cs * 0.9; }
    else { y1 = y2 = Y + cs; x1 = X + cs * 0.1; x2 = X + cs * 0.9; }
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.strokeStyle = op ? col('--ok') : dm.c;
    g.lineWidth = op ? 3 : cs * 0.22;
    g.setLineDash(op ? [4, 4] : []);
    g.stroke(); g.setLineDash([]);
    if (!op) {
      g.font = `${cs * 0.36}px system-ui,"Segoe UI Emoji",sans-serif`;
      g.fillText(dm.e, (x1 + x2) / 2, (y1 + y2) / 2);
      // Draw difficulty label
      if (diff === 'easy') {
        g.font = `${cs * 0.28}px system-ui,"Segoe UI Emoji",sans-serif`;
        g.fillText('🙂', (x1 + x2) / 2 + cs * 0.25, (y1 + y2) / 2 - cs * 0.15);
      } else if (diff === 'hard') {
        g.font = `${cs * 0.28}px system-ui,"Segoe UI Emoji",sans-serif`;
        g.fillText('🔥', (x1 + x2) / 2 + cs * 0.25, (y1 + y2) / 2 - cs * 0.15);
      }
    }
  }

  // Items (coins and chests) - drawn before fog so they're hidden in unexplored areas
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${cs * 0.5}px system-ui,"Segoe UI Emoji",sans-serif`;
  for (const key of items.coins) {
    const [x, y] = key.split(',').map(Number);
    if (seen[y][x]) {
      g.fillText('🪙', x * cs + cs / 2, y * cs + cs / 2 + cs * 0.1);
    }
  }
  for (const key of items.chests) {
    const [x, y] = key.split(',').map(Number);
    if (seen[y][x]) {
      g.fillText('🎁', x * cs + cs / 2, y * cs + cs / 2 + cs * 0.1);
    }
  }

  // Path hint (shortest path from player to finish)
  if (powerupState.pathHintActive && performance.now() < powerupState.pathHintEnd) {
    drawPathHint(g, cs);
  } else if (powerupState.pathHintActive) {
    powerupState.pathHintActive = false;
  }

  // Fog
  g.fillStyle = '#141b33'; g.globalAlpha = 0.93;
  for (let y = 0; y < lv.h; y++) {
    for (let x = 0; x < lv.w; x++) {
      if (!seen[y][x]) g.fillRect(x * cs, y * cs, cs, cs);
    }
  }
  g.globalAlpha = 1;

  // Player & Finish badges
  const badge = (cx, cy, f, s, e) => {
    g.save(); g.shadowColor = '#0006'; g.shadowBlur = cs * 0.15;
    g.beginPath(); g.arc(cx, cy, cs * 0.4, 0, 7); g.fillStyle = f; g.fill(); g.restore();
    g.lineWidth = Math.max(2, cs * 0.06); g.strokeStyle = s; g.stroke();
    g.font = `${cs * 0.55}px system-ui,"Segoe UI Emoji",sans-serif`; g.fillStyle = '#000';
    g.fillText(e, cx, cy + cs * 0.03);
  };

  // Calculate player position (animated if moving)
  let drawPx = px, drawPy = py;
  if (animating && animStart) {
    const elapsed = performance.now() - animStart;
    const progress = Math.min(elapsed / CONFIG.moveMs, 1);
    drawPx = animFrom.x + (animTo.x - animFrom.x) * progress;
    drawPy = animFrom.y + (animTo.y - animFrom.y) * progress;
  }

  // Finish badge at dynamic position
  const finishCx = lv.finishX * cs + cs / 2;
  const finishCy = lv.finishY * cs + cs / 2;
  badge(finishCx, finishCy, '#ffffff', '#e5484d', '🏁');
  badge(drawPx * cs + cs / 2, drawPy * cs + cs / 2, '#ffd54a', '#7a4b00', '🧒');

  // Draw floating scores (+10, etc.)
  drawFloatingScores(g);
  
  // Draw confetti
  drawConfetti(g);
  
  // Continue confetti animation loop
  if (confettiActive) {
    requestAnimationFrame(() => {
      updateConfetti();
      draw();
    });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);