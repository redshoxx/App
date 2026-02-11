const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const statusEl = document.getElementById('status');

const state = {
  board: createBoard(),
  current: null,
  score: 0,
  level: 1,
  lines: 0,
  running: false,
  paused: false,
  dropMs: 800,
  last: 0,
  acc: 0,
};

const COLORS = {
  I: '#44d9e6',
  O: '#f4d35e',
  T: '#b388eb',
  S: '#66d17a',
  Z: '#ff6b6b',
  J: '#5d8be8',
  L: '#f2a65a',
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randType() {
  const keys = Object.keys(SHAPES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function spawn() {
  const type = randType();
  const matrix = SHAPES[type].map((row) => [...row]);
  const x = Math.floor((COLS - matrix[0].length) / 2);
  const y = -1;
  return { type, matrix, x, y };
}

function collide(piece, offX = 0, offY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const nx = piece.x + x + offX;
      const ny = piece.y + y + offY;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && state.board[ny][nx]) return true;
    }
  }
  return false;
}

function rotate(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x][h - 1 - y] = matrix[y][x];
    }
  }
  return out;
}

function merge() {
  const { matrix, x: px, y: py, type } = state.current;
  matrix.forEach((row, y) => {
    row.forEach((v, x) => {
      if (!v) return;
      const by = py + y;
      if (by >= 0) state.board[by][px + x] = type;
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (state.board[y].every(Boolean)) {
      state.board.splice(y, 1);
      state.board.unshift(Array(COLS).fill(null));
      cleared++;
      y++;
    }
  }
  if (!cleared) return;

  state.lines += cleared;
  state.score += [0, 100, 300, 500, 800][cleared] * state.level;
  state.level = Math.floor(state.lines / 10) + 1;
  state.dropMs = Math.max(110, 800 - (state.level - 1) * 60);
  updateUi();
}

function move(dx) {
  if (!state.running || state.paused) return;
  if (!collide(state.current, dx, 0)) state.current.x += dx;
}

function softDrop() {
  if (!state.running || state.paused) return;
  stepDown();
}

function hardDrop() {
  if (!state.running || state.paused) return;
  while (!collide(state.current, 0, 1)) state.current.y++;
  lockPiece();
}

function turn() {
  if (!state.running || state.paused) return;
  const next = rotate(state.current.matrix);
  if (!collide(state.current, 0, 0, next)) {
    state.current.matrix = next;
    return;
  }
  if (!collide(state.current, -1, 0, next)) {
    state.current.x--;
    state.current.matrix = next;
    return;
  }
  if (!collide(state.current, 1, 0, next)) {
    state.current.x++;
    state.current.matrix = next;
  }
}

function stepDown() {
  if (!collide(state.current, 0, 1)) {
    state.current.y++;
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  state.current = spawn();
  if (collide(state.current, 0, 0)) {
    state.running = false;
    statusEl.textContent = 'Game Over – Neu starten!';
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = state.board[y][x];
      if (t) drawCell(x, y, COLORS[t]);
      else {
        ctx.fillStyle = '#0f1628';
        ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
      }
    }
  }

  if (state.current) {
    state.current.matrix.forEach((row, y) => {
      row.forEach((v, x) => {
        if (!v) return;
        const py = state.current.y + y;
        if (py >= 0) drawCell(state.current.x + x, py, COLORS[state.current.type]);
      });
    });
  }
}

function updateUi() {
  scoreEl.textContent = state.score;
  levelEl.textContent = state.level;
  linesEl.textContent = state.lines;
}

function resetGame() {
  state.board = createBoard();
  state.current = spawn();
  state.score = 0;
  state.level = 1;
  state.lines = 0;
  state.running = false;
  state.paused = false;
  state.dropMs = 800;
  state.acc = 0;
  updateUi();
  statusEl.textContent = 'Tippe auf Start.';
  render();
}

function startGame() {
  if (!state.current) state.current = spawn();
  state.running = true;
  state.paused = false;
  statusEl.textContent = 'Läuft…';
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  statusEl.textContent = state.paused ? 'Pausiert' : 'Läuft…';
}

function frame(ts) {
  const dt = ts - state.last;
  state.last = ts;

  if (state.running && !state.paused) {
    state.acc += dt;
    if (state.acc >= state.dropMs) {
      state.acc = 0;
      stepDown();
    }
  }

  render();
  requestAnimationFrame(frame);
}

function bindControls() {
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('resetBtn').addEventListener('click', resetGame);

  document.querySelectorAll('.ctrl').forEach((btn) => {
    const run = () => {
      const action = btn.dataset.action;
      if (action === 'left') move(-1);
      if (action === 'right') move(1);
      if (action === 'rotate') turn();
      if (action === 'softDrop') softDrop();
      if (action === 'hardDrop') hardDrop();
    };
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      run();
    }, { passive: false });
    btn.addEventListener('click', run);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowUp') turn();
    if (e.key === 'ArrowDown') softDrop();
    if (e.key === ' ') {
      e.preventDefault();
      hardDrop();
    }
    if (e.key.toLowerCase() === 'p') togglePause();
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
}

bindControls();
resetGame();
requestAnimationFrame(frame);
