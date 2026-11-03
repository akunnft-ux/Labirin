// tests/maze.test.js - Test maze generation and gate placement

const { DIR, gen, bfs, ek, LV, generateMazeWithMinPath, createGates, findFurthestCell, placeItems } = require('./load.js');

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; return true; }
  failed++;
  console.error(`  ❌ ${msg}`);
  return false;
}

function assertEqual(actual, expected, msg) {
  const ok = actual === expected;
  if (ok) { passed++; return true; }
  failed++;
  console.error(`  ❌ ${msg}`);
  console.error(`     Expected: ${expected}`);
  console.error(`     Actual:   ${actual}`);
  return false;
}

console.log('Running maze tests...\n');

// Test each level
for (const level of [1, 2, 3]) {
  const config = LV[level];
  console.log(`Level ${level}: ${config.n} (${config.w}x${config.h})`);

  let minPathFail = 0;
  let gateGapFail = 0;
  let noGateDoors = 0;
  let finishNotFurthest = 0;
  let gateDiffMissing = 0;

  for (let iter = 0; iter < 300; iter++) {
    const mazeResult = generateMazeWithMinPath(config);
    const cells = mazeResult.cells;
    const finish = mazeResult.finish;
    const dist = mazeResult.dist;
    const L = mazeResult.L;

    // 1. Finish should be at furthest cell from start (not necessarily corner)
    // Use findFurthestCell to verify
    const trueFinish = findFurthestCell(dist);
    if (finish.x !== trueFinish.x || finish.y !== trueFinish.y) {
      finishNotFurthest++;
    }

    // 2. Path length should meet minPath (allow some failures due to max attempts)
    if (L < config.minPath) {
      minPathFail++;
    }

    // 3. Test gate placement logic using createGates
    const gateResult = createGates({ dist, L, lv: config, DM: [{g:[]},{g:[]},{g:[]},{g:[]},{g:[]},{g:[]}] });
    const gates = gateResult.gates;

    // Check each gate has at least 1 door
    for (const g of gates) {
      if (g.keys.length === 0) noGateDoors++;
    }

    // Check gate D values are different and gap >= 4
    const Ds = gates.map(g => g.D);
    for (let i = 1; i < Ds.length; i++) {
      if (Ds[i] === Ds[i-1]) gateGapFail++;
      if (Ds[i] - Ds[i-1] < 4) gateGapFail++;
    }

    // Check difficulty labels for gates with >=2 doors
    for (const g of gates) {
      if (g.keys.length >= 2) {
        const diffs = g.keys.map(k => gateResult.doorG.get(k + ':diff'));
        const hasEasy = diffs.includes('easy');
        const hasHard = diffs.includes('hard');
        if (!hasEasy || !hasHard) gateDiffMissing++;
      }
    }
  }

  console.log(`  Iterations: 300`);
  console.log(`  Finish not furthest (bug): ${finishNotFurthest}`);
  console.log(`  MinPath violations: ${minPathFail}`);
  console.log(`  Gates with no doors: ${noGateDoors}`);
  console.log(`  Gate gap violations: ${gateGapFail}`);
  console.log(`  Missing easy/hard labels: ${gateDiffMissing}`);
  console.log('');
}

// Test item placement (Phase 3)
let itemPassed = 0, itemFailed = 0;

function assertItem(cond, msg) {
  if (cond) { itemPassed++; return true; }
  itemFailed++;
  console.error(`  ❌ ${msg}`);
  return false;
}

console.log('Testing item placement...\n');

for (const level of [1, 2, 3]) {
  const config = LV[level];
  console.log(`Level ${level}: ${config.n} (${config.w}x${config.h})`);

  let totalCoins = 0, totalChests = 0;
  let overlapCount = 0;
  let doorOverlapCount = 0;
  let unreachableCount = 0;

  for (let iter = 0; iter < 100; iter++) {
    const mazeResult = generateMazeWithMinPath(config);
    const cells = mazeResult.cells;
    const finish = mazeResult.finish;
    const dist = mazeResult.dist;
    const L = mazeResult.L;

    config.finishX = finish.x;
    config.finishY = finish.y;

    const gateResult = createGates({ dist, L, lv: config, DM: [{g:[]},{g:[]},{g:[]},{g:[]},{g:[]},{g:[]}] });
    const doorG = gateResult.doorG;

    const itemResult = placeItems(cells, dist, config, doorG);
    const coins = itemResult.coins;
    const chests = itemResult.chests;

    totalCoins += coins.size;
    totalChests += chests.size;

    // Check no overlap between coins and chests
    for (const c of coins) {
      if (chests.has(c)) overlapCount++;
    }

    // Check no items on doors
    for (const c of coins) {
      const [x, y] = c.split(',').map(Number);
      for (const d of ['N', 'E', 'S', 'W']) {
        if (!cells[y][x][d]) {
          const key = ek(x, y, d);
          if (doorG.has(key)) doorOverlapCount++;
        }
      }
    }
    for (const c of chests) {
      const [x, y] = c.split(',').map(Number);
      for (const d of ['N', 'E', 'S', 'W']) {
        if (!cells[y][x][d]) {
          const key = ek(x, y, d);
          if (doorG.has(key)) doorOverlapCount++;
        }
      }
    }

    // Check all items are in dead ends (only 1 open side)
    for (const c of [...coins, ...chests]) {
      const [x, y] = c.split(',').map(Number);
      let openSides = 0;
      for (const d of ['N', 'E', 'S', 'W']) {
        if (!cells[y][x][d]) openSides++;
      }
      if (openSides !== 1) unreachableCount++;
    }
  }

  const avgCoins = (totalCoins / 100).toFixed(1);
  const avgChests = (totalChests / 100).toFixed(1);

  console.log(`  Average coins: ${avgCoins} (target: ${config.coins})`);
  console.log(`  Average chests: ${avgChests} (target: ${config.chests})`);
  console.log(`  Coin/Chest overlaps: ${overlapCount}`);
  console.log(`  Item-on-door overlaps: ${doorOverlapCount}`);
  console.log(`  Items not in dead ends: ${unreachableCount}`);
  console.log('');

  assertItem(overlapCount === 0, `Level ${level}: No coin/chest overlap`);
  assertItem(doorOverlapCount === 0, `Level ${level}: No items on doors`);
  assertItem(unreachableCount === 0, `Level ${level}: All items in dead ends`);
}

passed += itemPassed;
failed += itemFailed;

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);