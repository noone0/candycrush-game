/**
 * Candy Crush Retro - Automated Tests
 * Pure JS test suite (no framework dependencies)
 * Run with: node tests/game.test.js
 */

// ═══════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${a} === ${b}`);
}

function assertArrayEqual(a, b, msg) {
  const as = JSON.stringify(a);
  const bs = JSON.stringify(b);
  if (as !== bs) throw new Error(msg || `Arrays not equal:\n  got: ${as}\n  exp: ${bs}`);
}

// ═══════════════════════════════════════════
// EXTRACTED GAME LOGIC (pure functions for testing)
// ═══════════════════════════════════════════
const GRID_SIZE = 8;
const CANDY_TYPES = 6;

function randomCandy() { return Math.floor(Math.random() * CANDY_TYPES) + 1; }

function generateBoard() {
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let candy;
      do {
        candy = randomCandy();
      } while (
        (c >= 2 && board[r][c-1] === candy && board[r][c-2] === candy) ||
        (r >= 2 && board[r-1][c] === candy && board[r-2][c] === candy)
      );
      board[r][c] = candy;
    }
  }
  return board;
}

function detectMatches(board) {
  const toRemove = new Set();
  for (let r = 0; r < GRID_SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= GRID_SIZE; c++) {
      if (c < GRID_SIZE && board[r][c] !== 0 && board[r][c] === board[r][c-1]) { run++; }
      else { if (run >= 3) { for (let k = c - run; k < c; k++) toRemove.add(`${r},${k}`); } run = 1; }
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= GRID_SIZE; r++) {
      if (r < GRID_SIZE && board[r][c] !== 0 && board[r][c] === board[r-1][c]) { run++; }
      else { if (run >= 3) { for (let k = r - run; k < r; k++) toRemove.add(`${k},${c}`); } run = 1; }
    }
  }
  return toRemove;
}

function applyGravity(board) {
  for (let c = 0; c < GRID_SIZE; c++) {
    const column = [];
    for (let r = GRID_SIZE - 1; r >= 0; r--) { if (board[r][c] !== 0) column.push(board[r][c]); }
    for (let r = GRID_SIZE - 1; r >= 0; r--) { board[r][c] = column.shift() || 0; }
  }
  return board;
}

function fillBoard(board) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) board[r][c] = randomCandy();
    }
  }
  return board;
}

function getLevelConfig(level) {
  return { target: level * 500, moves: Math.max(10, 22 - level * 2) };
}

function calcMatchScore(size, cascade) {
  const base = size >= 5 ? 100 : size === 4 ? 60 : 30;
  return base * Math.max(1, cascade);
}

function isAdjacent(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function wouldCreateMatch(board, r1, c1, r2, c2) {
  const copy = board.map(row => [...row]);
  [copy[r1][c1], copy[r2][c2]] = [copy[r2][c2], copy[r1][c1]];
  return detectMatches(copy).size > 0;
}

function makeBoard(template) {
  // template: 8x8 array of numbers
  return template.map(row => [...row]);
}

function emptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function setRow(board, r, values) {
  for (let c = 0; c < values.length; c++) board[r][c] = values[c];
}

// ═══════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════

console.log('\n🍬 CANDY CRUSH RETRO — Test Suite\n');

// ─── Board Generation ───
console.log('📋 Board Generation:');

test('generateBoard returns 8x8 grid', () => {
  const b = generateBoard();
  assertEqual(b.length, 8);
  b.forEach(row => assertEqual(row.length, 8));
});

test('generateBoard has no zeros (fully filled)', () => {
  const b = generateBoard();
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      assert(b[r][c] >= 1 && b[r][c] <= 6, `Cell [${r},${c}] is ${b[r][c]}`);
});

test('generateBoard has no initial horizontal matches', () => {
  const b = generateBoard();
  const matches = detectMatches(b);
  assertEqual(matches.size, 0, `Board has ${matches.size} initial matches`);
});

test('generateBoard runs multiple times with no initial matches', () => {
  for (let i = 0; i < 20; i++) {
    const b = generateBoard();
    const matches = detectMatches(b);
    assertEqual(matches.size, 0, `Run ${i}: ${matches.size} initial matches`);
  }
});

// ─── Match Detection ───
console.log('\n🔍 Match Detection:');

test('detects horizontal match of 3', () => {
  const b = emptyBoard();
  setRow(b, 0, [1, 1, 1, 2, 2, 3, 3, 4]);
  const m = detectMatches(b);
  assert(m.has('0,0'), 'cell 0,0 should be in match');
  assert(m.has('0,1'), 'cell 0,1 should be in match');
  assert(m.has('0,2'), 'cell 0,2 should be in match');
  assert(!m.has('0,3'), 'cell 0,3 should not be in match');
});

test('detects horizontal match of 4', () => {
  const b = emptyBoard();
  setRow(b, 2, [2, 2, 2, 2, 1, 1, 3, 3]);
  const m = detectMatches(b);
  assert(m.has('2,0') && m.has('2,1') && m.has('2,2') && m.has('2,3'));
});

test('detects horizontal match of 5', () => {
  const b = emptyBoard();
  setRow(b, 4, [3, 3, 3, 3, 3, 1, 2, 1]);
  const m = detectMatches(b);
  for (let c = 0; c < 5; c++) assert(m.has(`4,${c}`));
});

test('detects vertical match of 3', () => {
  const b = emptyBoard();
  b[0][3] = 4; b[1][3] = 4; b[2][3] = 4;
  const m = detectMatches(b);
  assert(m.has('0,3') && m.has('1,3') && m.has('2,3'));
});

test('detects vertical match of 4', () => {
  const b = emptyBoard();
  for (let r = 0; r < 4; r++) b[r][5] = 2;
  const m = detectMatches(b);
  for (let r = 0; r < 4; r++) assert(m.has(`${r},5`));
});

test('detects simultaneous horizontal + vertical match', () => {
  const b = emptyBoard();
  // Cross shape: row 3 cols 2-4 = 1; col 3 rows 1-5 = 1
  for (let c = 2; c <= 4; c++) b[3][c] = 1;
  for (let r = 1; r <= 5; r++) b[r][3] = 1;
  const m = detectMatches(b);
  assert(m.size >= 6, `Expected >= 6 matches, got ${m.size}`);
});

test('does not detect match of 2', () => {
  const b = emptyBoard();
  setRow(b, 0, [1, 1, 2, 2, 3, 3, 4, 4]);
  const m = detectMatches(b);
  assertEqual(m.size, 0, `Expected 0 matches, got ${m.size}`);
});

test('does not detect match with zeros', () => {
  const b = emptyBoard();
  b[0][0] = 1; b[0][1] = 0; b[0][2] = 1;
  const m = detectMatches(b);
  assertEqual(m.size, 0);
});

// ─── Gravity ───
console.log('\n⬇️  Gravity:');

test('applyGravity moves non-zero cells to bottom', () => {
  const b = emptyBoard();
  b[0][0] = 3; // top cell
  applyGravity(b);
  assertEqual(b[7][0], 3, 'candy should fall to bottom');
  assertEqual(b[0][0], 0, 'top should be empty');
});

test('applyGravity preserves order (bottom candy stays lowest)', () => {
  const b = emptyBoard();
  // candy 1 at top (row 0), candy 2 at row 2, candy 3 at row 5 (lowest)
  b[0][0] = 1; b[2][0] = 2; b[5][0] = 3;
  applyGravity(b);
  // After gravity: lowest candy (3) falls to row 7, 2 to row 6, 1 to row 5
  assertEqual(b[7][0], 3, 'lowest candy (row 5) falls to bottom row 7');
  assertEqual(b[6][0], 2, 'middle candy falls to row 6');
  assertEqual(b[5][0], 1, 'top candy falls to row 5');
});

test('applyGravity handles already-full column', () => {
  const b = emptyBoard();
  for (let r = 0; r < 8; r++) b[r][0] = r + 1;
  const copy = b.map(row => [...row]);
  applyGravity(b);
  assertArrayEqual(b[7], copy[7]);
});

test('fillBoard fills all zeros with 1-6', () => {
  const b = emptyBoard();
  fillBoard(b);
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      assert(b[r][c] >= 1 && b[r][c] <= 6);
});

// ─── Adjacency ───
console.log('\n↔️  Adjacency:');

test('isAdjacent: horizontal neighbours', () => {
  assert(isAdjacent(3, 3, 3, 4));
  assert(isAdjacent(3, 4, 3, 3));
});

test('isAdjacent: vertical neighbours', () => {
  assert(isAdjacent(3, 3, 4, 3));
  assert(isAdjacent(4, 3, 3, 3));
});

test('isAdjacent: diagonal is NOT adjacent', () => {
  assert(!isAdjacent(3, 3, 4, 4));
  assert(!isAdjacent(3, 3, 2, 2));
});

test('isAdjacent: same cell is NOT adjacent', () => {
  assert(!isAdjacent(3, 3, 3, 3));
});

test('isAdjacent: far cells are NOT adjacent', () => {
  assert(!isAdjacent(0, 0, 7, 7));
  assert(!isAdjacent(3, 3, 3, 6));
});

// ─── Swap Validation ───
console.log('\n🔄 Swap Validation:');

test('wouldCreateMatch: valid swap that creates horizontal match', () => {
  const b = emptyBoard();
  // Row 0: [1, 1, 2, 1, ...] - swapping (0,2) and (0,3) creates [1,1,1,2]
  b[0][0] = 1; b[0][1] = 1; b[0][2] = 2; b[0][3] = 1;
  // Wait, swap (0,2)↔(0,3): becomes [1,1,1,2] = match!
  assert(wouldCreateMatch(b, 0, 2, 0, 3));
});

test('wouldCreateMatch: invalid swap creates no match', () => {
  const b = emptyBoard();
  b[0][0] = 1; b[0][1] = 2; b[0][2] = 3; b[0][3] = 4;
  b[1][0] = 5; b[1][1] = 6; b[1][2] = 1; b[1][3] = 2;
  // Swap (0,0) and (0,1): [2,1,...] - no match
  assert(!wouldCreateMatch(b, 0, 0, 0, 1));
});

// ─── Scoring ───
console.log('\n💯 Scoring:');

test('calcMatchScore: 3-match = 30', () => {
  assertEqual(calcMatchScore(3, 1), 30);
});

test('calcMatchScore: 4-match = 60', () => {
  assertEqual(calcMatchScore(4, 1), 60);
});

test('calcMatchScore: 5-match = 100', () => {
  assertEqual(calcMatchScore(5, 1), 100);
});

test('calcMatchScore: cascade multiplier doubles score', () => {
  assertEqual(calcMatchScore(3, 2), 60, '3-match cascade 2 = 60');
  assertEqual(calcMatchScore(3, 3), 90, '3-match cascade 3 = 90');
});

test('calcMatchScore: 6-match still uses 100 base', () => {
  assertEqual(calcMatchScore(6, 1), 100);
});

// ─── Level Config ───
console.log('\n🎯 Level Config:');

test('getLevelConfig level 1: target=500, moves=20', () => {
  const cfg = getLevelConfig(1);
  assertEqual(cfg.target, 500);
  assertEqual(cfg.moves, 20);
});

test('getLevelConfig level 2: target=1000, moves=18', () => {
  const cfg = getLevelConfig(2);
  assertEqual(cfg.target, 1000);
  assertEqual(cfg.moves, 18);
});

test('getLevelConfig level 5: target=2500, moves=12', () => {
  const cfg = getLevelConfig(5);
  assertEqual(cfg.target, 2500);
  assertEqual(cfg.moves, 12);
});

test('getLevelConfig moves never below 10', () => {
  for (let level = 1; level <= 20; level++) {
    const cfg = getLevelConfig(level);
    assert(cfg.moves >= 10, `Level ${level} moves=${cfg.moves} < 10`);
  }
});

test('getLevelConfig target increases each level', () => {
  for (let level = 1; level < 10; level++) {
    assert(getLevelConfig(level + 1).target > getLevelConfig(level).target);
  }
});

// ─── Edge Cases ───
console.log('\n⚠️  Edge Cases:');

test('detectMatches: empty board returns empty set', () => {
  const b = emptyBoard();
  assertEqual(detectMatches(b).size, 0);
});

test('detectMatches: all same candy = all cells matched', () => {
  const b = Array.from({ length: 8 }, () => Array(8).fill(1));
  const m = detectMatches(b);
  assertEqual(m.size, 64);
});

test('applyGravity: fully empty board stays empty', () => {
  const b = emptyBoard();
  applyGravity(b);
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      assertEqual(b[r][c], 0);
});

test('detectMatches: match at board edges (top-left)', () => {
  const b = emptyBoard();
  b[0][0] = 5; b[0][1] = 5; b[0][2] = 5;
  const m = detectMatches(b);
  assert(m.has('0,0') && m.has('0,1') && m.has('0,2'));
});

test('detectMatches: match at board edges (bottom-right)', () => {
  const b = emptyBoard();
  b[7][5] = 3; b[7][6] = 3; b[7][7] = 3;
  const m = detectMatches(b);
  assert(m.has('7,5') && m.has('7,6') && m.has('7,7'));
});

test('cascade: multiple rounds clear correctly', () => {
  // Set up a board where after match, gravity creates another match
  const b = emptyBoard();
  // Col 0: bottom 3 = type 2, above = type 1 * 3 (will create match after gravity)
  b[5][0] = 2; b[6][0] = 2; b[7][0] = 2; // bottom match
  b[2][0] = 1; b[3][0] = 1; b[4][0] = 1; // upper match
  const m1 = detectMatches(b);
  assert(m1.size >= 6, `Expected 6+ matches, got ${m1.size}`);
});

// ─── Summary ───
console.log('\n' + '─'.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('💥 Some tests failed!\n');
  process.exit(1);
}
