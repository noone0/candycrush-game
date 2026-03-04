/**
 * CANDY CRUSH RETRO — game.js
 * Vanilla JS IIFE module. No external dependencies.
 * Match-3 game with pixel-art retro style.
 */
(function() {
  'use strict';

  // ═══════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════
  const GRID_SIZE = 8;
  const CANDY_TYPES = 6;
  const CANDY_EMOJIS = ['', '🍒', '🍊', '🍋', '🍏', '🫐', '🍇'];
  const MATCH_SCORES = { 3: 30, 4: 60, 5: 100 };
  const ANIM_DURATION = {
    SWAP: 220,
    BURST: 320,
    FALL: 280,
    INVALID: 350,
  };

  // ═══════════════════════════════════════════
  // GAME STATE
  // ═══════════════════════════════════════════
  const state = {
    board: [],
    score: 0,
    moves: 0,
    level: 1,
    highScore: 0,
    selected: null,
    animating: false,
    cascade: 0,
    target: 500,
  };

  // ═══════════════════════════════════════════
  // DOM REFS
  // ═══════════════════════════════════════════
  const $ = id => document.getElementById(id);
  const boardEl = $('board');
  const scoreEl = $('score-display');
  const movesEl = $('moves-display');
  const levelEl = $('level-display');
  const highEl  = $('high-score-display');
  const targetEl = $('target-display');
  const progressBar = $('progress-bar');

  // ═══════════════════════════════════════════
  // LEVEL CONFIG
  // ═══════════════════════════════════════════
  function getLevelConfig(level) {
    return {
      target: level * 500,
      moves: Math.max(10, 22 - level * 2),
    };
  }

  // ═══════════════════════════════════════════
  // BOARD GENERATION
  // ═══════════════════════════════════════════
  function randomCandy() {
    return Math.floor(Math.random() * CANDY_TYPES) + 1;
  }

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

  // ═══════════════════════════════════════════
  // MATCH DETECTION
  // ═══════════════════════════════════════════
  function detectMatches(board) {
    const toRemove = new Set();

    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      let run = 1;
      for (let c = 1; c <= GRID_SIZE; c++) {
        if (c < GRID_SIZE && board[r][c] !== 0 && board[r][c] === board[r][c-1]) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = c - run; k < c; k++) toRemove.add(`${r},${k}`);
          }
          run = 1;
        }
      }
    }

    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      let run = 1;
      for (let r = 1; r <= GRID_SIZE; r++) {
        if (r < GRID_SIZE && board[r][c] !== 0 && board[r][c] === board[r-1][c]) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = r - run; k < r; k++) toRemove.add(`${k},${c}`);
          }
          run = 1;
        }
      }
    }

    return toRemove;
  }

  // ═══════════════════════════════════════════
  // SCORING
  // ═══════════════════════════════════════════
  function calcMatchScore(size, cascade) {
    const base = size >= 5 ? 100 : size === 4 ? 60 : 30;
    const cascadeBonus = Math.max(1, cascade);
    return base * cascadeBonus;
  }

  function scoreMatches(matches) {
    // Group matches into runs for accurate scoring
    // Each contiguous run counted separately
    const cells = [...matches].map(k => k.split(',').map(Number));
    // Simple: score per-match-cell roughly
    // Better: count distinct runs
    const runs = countRuns(state.board, matches);
    let total = 0;
    for (const run of runs) {
      total += calcMatchScore(run, state.cascade);
    }
    return total;
  }

  function countRuns(board, matches) {
    // Count horizontal and vertical runs
    const marked = {};
    for (const k of matches) marked[k] = true;
    const runs = [];

    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      let run = 0;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (marked[`${r},${c}`]) { run++; }
        else {
          if (run >= 3) runs.push(run);
          run = 0;
        }
      }
      if (run >= 3) runs.push(run);
    }

    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      let run = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (marked[`${r},${c}`]) { run++; }
        else {
          if (run >= 3) runs.push(run);
          run = 0;
        }
      }
      if (run >= 3) runs.push(run);
    }

    return runs.length > 0 ? runs : [matches.size];
  }

  // ═══════════════════════════════════════════
  // GRAVITY & FILL
  // ═══════════════════════════════════════════
  function applyGravity(board) {
    for (let c = 0; c < GRID_SIZE; c++) {
      // Collect non-zero cells bottom-up
      const column = [];
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (board[r][c] !== 0) column.push(board[r][c]);
      }
      // Fill from bottom
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        board[r][c] = column.shift() || 0;
      }
    }
    return board;
  }

  function fillBoard(board) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === 0) {
          board[r][c] = randomCandy();
        }
      }
    }
    return board;
  }

  // ═══════════════════════════════════════════
  // SWAP VALIDATION
  // ═══════════════════════════════════════════
  function isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  function wouldCreateMatch(board, r1, c1, r2, c2) {
    // Simulate swap
    const copy = board.map(row => [...row]);
    [copy[r1][c1], copy[r2][c2]] = [copy[r2][c2], copy[r1][c1]];
    return detectMatches(copy).size > 0;
  }

  // ═══════════════════════════════════════════
  // DOM RENDERING
  // ═══════════════════════════════════════════
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const type = state.board[r][c];
        if (type > 0) {
          const candy = document.createElement('div');
          candy.className = `candy candy-${type}`;
          candy.textContent = CANDY_EMOJIS[type];
          cell.appendChild(candy);
        }

        cell.addEventListener('click', onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  function getCell(r, c) {
    return boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  function updateHUD() {
    scoreEl.textContent = state.score;
    movesEl.textContent = state.moves;
    levelEl.textContent = state.level;
    highEl.textContent  = state.highScore;
    targetEl.textContent = state.target;
    const pct = Math.min(100, (state.score / state.target) * 100);
    progressBar.style.width = pct + '%';

    // Flash moves when low
    movesEl.style.color = state.moves <= 5 ? '#FF4444' : 'var(--gold)';
  }

  // ═══════════════════════════════════════════
  // SCORE POPUP
  // ═══════════════════════════════════════════
  function showScorePopup(r, c, pts) {
    const cell = getCell(r, c);
    if (!cell) return;
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + pts;
    popup.style.left = cell.offsetLeft + cell.offsetWidth / 2 - 20 + 'px';
    popup.style.top  = cell.offsetTop  + 'px';
    document.getElementById('board-container').appendChild(popup);
    setTimeout(() => popup.remove(), 850);
  }

  // ═══════════════════════════════════════════
  // CELL CLICK / SWAP LOGIC
  // ═══════════════════════════════════════════
  function onCellClick(e) {
    if (state.animating) return;
    const cell = e.currentTarget;
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);

    if (state.board[r][c] === 0) return;

    if (!state.selected) {
      // Select
      state.selected = { r, c };
      cell.classList.add('selected');
    } else {
      const { r: sr, c: sc } = state.selected;

      // Deselect previous
      const prevCell = getCell(sr, sc);
      if (prevCell) prevCell.classList.remove('selected');

      if (sr === r && sc === c) {
        // Clicked same — deselect
        state.selected = null;
        return;
      }

      if (isAdjacent(sr, sc, r, c)) {
        state.selected = null;
        attemptSwap(sr, sc, r, c);
      } else {
        // Select new cell instead
        state.selected = { r, c };
        cell.classList.add('selected');
      }
    }
  }

  function attemptSwap(r1, c1, r2, c2) {
    if (!wouldCreateMatch(state.board, r1, c1, r2, c2)) {
      // Invalid swap - shake both cells
      animateInvalid(r1, c1, r2, c2);
      return;
    }

    state.animating = true;
    state.moves--;
    updateHUD();

    // Animate swap
    const dir = getSwapDirection(r1, c1, r2, c2);
    const cell1 = getCell(r1, c1);
    const cell2 = getCell(r2, c2);

    if (cell1) cell1.classList.add(`anim-swap-${dir.a}`);
    if (cell2) cell2.classList.add(`anim-swap-${dir.b}`);

    setTimeout(() => {
      if (cell1) cell1.classList.remove(`anim-swap-${dir.a}`);
      if (cell2) cell2.classList.remove(`anim-swap-${dir.b}`);

      // Apply swap to board
      [state.board[r1][c1], state.board[r2][c2]] = [state.board[r2][c2], state.board[r1][c1]];

      state.cascade = 1;
      processMatches();
    }, ANIM_DURATION.SWAP);
  }

  function getSwapDirection(r1, c1, r2, c2) {
    if (c2 > c1) return { a: 'right', b: 'left' };
    if (c2 < c1) return { a: 'left',  b: 'right' };
    if (r2 > r1) return { a: 'down',  b: 'up' };
    return { a: 'up', b: 'down' };
  }

  function animateInvalid(r1, c1, r2, c2) {
    [getCell(r1, c1), getCell(r2, c2)].forEach(cell => {
      if (!cell) return;
      cell.classList.add('anim-shake');
      setTimeout(() => cell.classList.remove('anim-shake'), ANIM_DURATION.INVALID);
    });
  }

  // ═══════════════════════════════════════════
  // MATCH PROCESSING LOOP
  // ═══════════════════════════════════════════
  async function processMatches() {
    const matches = detectMatches(state.board);
    if (matches.size === 0) {
      state.animating = false;
      renderBoard();
      updateHUD();
      checkGameState();
      return;
    }

    // Score
    const pts = scoreMatches(matches);
    state.score += pts;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem('candyCrushHighScore', state.highScore);
    }

    // Show score popup (first matched cell)
    const firstMatch = [...matches][0].split(',').map(Number);
    showScorePopup(firstMatch[0], firstMatch[1], pts);

    // Cascade flash
    if (state.cascade > 1) {
      document.getElementById('board-container').classList.add('cascade');
      setTimeout(() => document.getElementById('board-container').classList.remove('cascade'), 350);
    }

    updateHUD();

    // Animate burst
    for (const key of matches) {
      const [r, c] = key.split(',').map(Number);
      const cell = getCell(r, c);
      if (cell) {
        const candy = cell.querySelector('.candy');
        if (candy) candy.classList.add('anim-burst');
      }
    }

    await sleep(ANIM_DURATION.BURST);

    // Remove matched cells from board
    for (const key of matches) {
      const [r, c] = key.split(',').map(Number);
      state.board[r][c] = 0;
    }

    // Gravity + fill
    applyGravity(state.board);
    fillBoard(state.board);

    // Re-render with fall animation
    renderBoard();
    boardEl.querySelectorAll('.cell').forEach(cell => {
      const candy = cell.querySelector('.candy');
      if (candy) candy.classList.add('anim-fall');
    });

    await sleep(ANIM_DURATION.FALL);

    // Check for cascades
    state.cascade++;
    processMatches();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════
  // GAME STATE CHECKS
  // ═══════════════════════════════════════════
  function checkGameState() {
    if (state.score >= state.target) {
      showLevelComplete();
    } else if (state.moves <= 0) {
      showGameOver();
    }
  }

  // ═══════════════════════════════════════════
  // OVERLAYS
  // ═══════════════════════════════════════════
  function showLevelComplete() {
    $('level-complete-score').textContent = `SCORE: ${state.score} / ${state.target}\nLEVEL ${state.level} CLEARED!`;
    $('level-complete-overlay').style.display = 'flex';
  }

  function showGameOver() {
    $('game-over-score').textContent = `SCORE: ${state.score}\nBEST: ${state.highScore}`;
    $('game-over-overlay').style.display = 'flex';
  }

  function hideOverlays() {
    ['level-complete-overlay', 'game-over-overlay', 'menu-overlay'].forEach(id => {
      $(id).style.display = 'none';
    });
  }

  // ═══════════════════════════════════════════
  // GAME INIT / RESTART
  // ═══════════════════════════════════════════
  function initLevel(level) {
    const cfg = getLevelConfig(level);
    state.level    = level;
    state.target   = cfg.target;
    state.moves    = cfg.moves;
    state.score    = 0;
    state.selected = null;
    state.animating = false;
    state.cascade   = 0;
    state.board     = generateBoard();
    renderBoard();
    updateHUD();
  }

  function startGame(level) {
    hideOverlays();
    initLevel(level);
  }

  function nextLevel() {
    hideOverlays();
    initLevel(state.level + 1);
  }

  function restartCurrentLevel() {
    hideOverlays();
    initLevel(state.level);
  }

  function goToMenu() {
    hideOverlays();
    $('menu-high-score').textContent = state.highScore;
    $('menu-overlay').style.display = 'flex';
  }

  // ═══════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════
  $('start-btn').addEventListener('click', () => startGame(1));
  $('next-level-btn').addEventListener('click', nextLevel);
  $('retry-btn').addEventListener('click', restartCurrentLevel);
  $('menu-btn').addEventListener('click', goToMenu);
  $('restart-btn').addEventListener('click', restartCurrentLevel);

  // ═══════════════════════════════════════════
  // BOOTSTRAP
  // ═══════════════════════════════════════════
  function boot() {
    // Load high score
    const saved = localStorage.getItem('candyCrushHighScore');
    if (saved) {
      state.highScore = parseInt(saved) || 0;
    }
    $('menu-high-score').textContent = state.highScore;
    $('high-score-display').textContent = state.highScore;

    // Show menu
    $('menu-overlay').style.display = 'flex';
  }

  boot();

})();
