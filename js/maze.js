// maze.js - Generator labirin dan analisis (tanpa DOM)
// Menggunakan util.js: rnd, pick, shuf

// rnd, pick, shuf tersedia global dari util.js (window.*). Jangan deklarasi ulang
// dengan const di sini: bentrok dengan questions.js di scope global browser.

const DIR = {
  N: [0, -1, 'S'],
  S: [0, 1, 'N'],
  E: [1, 0, 'W'],
  W: [-1, 0, 'E']
};

/**
 * Generate maze using randomized DFS
 * @param {number} w - width
 * @param {number} h - height
 * @param {number} loop - loop factor (0-1)
 * @returns {Array} 2D array of cells
 */
function gen(w, h, loop) {
  const cells = [...Array(h)].map(() => [...Array(w)].map(() => ({ N: 1, E: 1, S: 1, W: 1, v: 0 })));
  const stack = [[0, 0]];
  cells[0][0].v = 1;

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const neighbors = Object.keys(DIR).filter(k => {
      const target = cells[y + DIR[k][1]]?.[x + DIR[k][0]];
      return target && !target.v;
    });
    if (!neighbors.length) { stack.pop(); continue; }
    const k = pick(neighbors);
    const nx = x + DIR[k][0], ny = y + DIR[k][1];
    cells[y][x][k] = 0;
    cells[ny][nx][DIR[k][2]] = 0;
    cells[ny][nx].v = 1;
    stack.push([nx, ny]);
  }

  // Add loops
  let extra = Math.round(w * h * loop);
  while (extra > 0) {
    const x = rnd(0, w - 1), y = rnd(0, h - 1);
    const k = pick(['E', 'S']);
    const target = cells[y + DIR[k][1]]?.[x + DIR[k][0]];
    if (target && cells[y][x][k]) {
      cells[y][x][k] = 0;
      target[DIR[k][2]] = 0;
      extra--;
    }
  }
  return cells;
}

/**
 * BFS to find distances from start
 * @param {Array} cells - maze cells
 * @returns {Array} 2D array of distances
 */
function bfs(cells) {
  const h = cells.length, w = cells[0].length;
  const dist = cells.map(r => r.map(() => -1));
  dist[0][0] = 0;
  const queue = [[0, 0]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const k in DIR) {
      if (cells[y][x][k]) continue;
      const nx = x + DIR[k][0], ny = y + DIR[k][1];
      if (dist[ny][nx] < 0) {
        dist[ny][nx] = dist[y][x] + 1;
        queue.push([nx, ny]);
      }
    }
  }
  return dist;
}

/**
 * Find the furthest cell from start (for finish position)
 * @param {Array} dist - BFS distance array
 * @returns {Object} {x, y, distance}
 */
function findFurthestCell(dist) {
  let maxDist = -1, fx = -1, fy = -1;
  for (let y = 0; y < dist.length; y++) {
    for (let x = 0; x < dist[0].length; x++) {
      if (dist[y][x] > maxDist) {
        maxDist = dist[y][x];
        fx = x; fy = y;
      }
    }
  }
  return { x: fx, y: fy, distance: maxDist };
}

/**
 * Create door key from position and direction
 */
function ek(x, y, d) {
  return d === 'N' ? `${x},${y - 1},S` : d === 'W' ? `${x - 1},${y},E` : `${x},${y},${d}`;
}

/**
 * Generate maze with guaranteed minimum path length and proper finish position
 * @param {Object} lv - level config with w, h, loop, minPath
 * @returns {Object} { cells, finish: {x,y}, dist, L }
 */
function generateMazeWithMinPath(lv) {
  const maxAttempts = 200;
  let bestCells = null, bestDist = null, bestFinish = null, bestL = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cells = gen(lv.w, lv.h, lv.loop);
    const dist = bfs(cells);
    const finish = findFurthestCell(dist);
    const L = finish.distance;

    if (L >= lv.minPath) {
      return { cells, finish, dist, L };
    }
    if (L > bestL) {
      bestL = L;
      bestCells = cells;
      bestDist = dist;
      bestFinish = finish;
    }
  }

  // If no maze meets minPath, use best attempt
  console.warn(`Maze minPath not met after ${maxAttempts} attempts, using best L=${bestL}`);
  return { cells: bestCells, finish: bestFinish, dist: bestDist, L: bestL };
}

/**
 * Create gates with proper spacing
 * @param {Object} params - { dist, finish, L, lv, DM }
 * @returns {Object} { gates, doorG }
 */
function createGates({ dist, L, lv, DM }) {
  const doorG = new Map();
  const gates = [];
  const order = shuf([0, 1, 2, 3, 4, 5]);

  for (let k = 1; k <= 6; k++) {
    const D = Math.round(L * k / 7);
    const g = { dom: order[k - 1], D, keys: [] };
    for (let y = 0; y < lv.h; y++) {
      for (let x = 0; x < lv.w; x++) {
        for (const d of ['E', 'S']) {
          if (dist[y][x][d]) continue;
          const ny = y + DIR[d][1], nx = x + DIR[d][0];
          // Bounds check
          if (ny < 0 || ny >= lv.h || nx < 0 || nx >= lv.w) continue;
          const a = dist[y][x], b = dist[ny][nx];
          if (Math.min(a, b) === D && Math.abs(a - b) === 1) {
            const key = `${x},${y},${d}`;
            doorG.set(key, k - 1);
            g.keys.push(key);
          }
        }
      }
    }
    gates.push(g);
  }

  // Assign difficulty labels to doors (easy/hard) for gates with >=2 doors
  for (const g of gates) {
    if (g.keys.length >= 2) {
      // Shuffle and assign: first = easy, last = hard, middle = normal
      const shuffled = shuf([...g.keys]);
      for (let i = 0; i < shuffled.length; i++) {
        const key = shuffled[i];
        if (i === 0) doorG.set(key + ':diff', 'easy');
        else if (i === shuffled.length - 1) doorG.set(key + ':diff', 'hard');
        else doorG.set(key + ':diff', 'normal');
      }
    } else if (g.keys.length === 1) {
      doorG.set(g.keys[0] + ':diff', 'normal');
    }
  }

  return { gates, doorG };
}

// Level configurations
const LV = {
  1: { n: 'Latihan', w: 9, h: 9, loop: 0.04, fog: 0, tiers: [1, 1, 2], pass: 9, minPath: 35, coins: 6, chests: 1 },
  2: { n: 'TKA Standar', w: 11, h: 11, loop: 0.04, fog: 3, tiers: [1, 2, 3], pass: 10, minPath: 50, coins: 8, chests: 2 },
  3: { n: 'Master TKA', w: 13, h: 13, loop: 0.04, fog: 2, tiers: [2, 3, 3], pass: 11, minPath: 70, coins: 10, chests: 2 }
};

// Export for Node testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DIR, gen, bfs, ek, LV, findFurthestCell, generateMazeWithMinPath, createGates, placeItems };
}
/**
 * Place items (coins and chests) in dead-end cells
 * @param {Array} cells - maze cells
 * @param {Object} dist - BFS distance array from start
 * @param {Object} lv - level config with coins, chests, finishX, finishY
 * @param {Map} doorG - door gates map (to avoid placing items on doors)
 * @returns {Object} { coins: Set<key>, chests: Set<key> }
 */
function placeItems(cells, dist, lv, doorG) {
  const w = lv.w, h = lv.h;
  const deadEnds = [];

  // Find all dead-end cells (only 1 open side)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Skip start and finish
      if ((x === 0 && y === 0) || (x === lv.finishX && y === lv.finishY)) continue;

      const cell = cells[y][x];
      let openSides = 0;
      for (const d of ['N', 'E', 'S', 'W']) {
        if (!cell[d]) openSides++;
      }
      if (openSides === 1) {
        // Check if this cell has a door
        let hasDoor = false;
        for (const d of ['N', 'E', 'S', 'W']) {
          if (!cell[d]) {
            const key = ek(x, y, d);
            if (doorG.has(key)) { hasDoor = true; break; }
          }
        }
        if (!hasDoor) {
          deadEnds.push({ x, y, dist: dist[y][x] });
        }
      }
    }
  }

  // Sort dead ends by distance from start (furthest first)
  deadEnds.sort((a, b) => b.dist - a.dist);

  const coins = new Set();
  const chests = new Set();

  // Place chests in furthest dead ends
  const chestCount = Math.min(lv.chests, deadEnds.length);
  for (let i = 0; i < chestCount; i++) {
    const pos = deadEnds[i];
    chests.add(`${pos.x},${pos.y}`);
  }

  // Place coins in remaining dead ends (not chests)
  const remaining = deadEnds.filter(p => !chests.has(`${p.x},${p.y}`));
  const coinCount = Math.min(lv.coins, remaining.length);
  for (let i = 0; i < coinCount; i++) {
    const pos = remaining[i];
    coins.add(`${pos.x},${pos.y}`);
  }

  return { coins, chests };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.DIR = DIR;
  window.gen = gen;
  window.bfs = bfs;
  window.ek = ek;
  window.LV = LV;
  window.findFurthestCell = findFurthestCell;
  window.generateMazeWithMinPath = generateMazeWithMinPath;
  window.createGates = createGates;
  window.placeItems = placeItems;
}