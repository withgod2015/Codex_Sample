const canvas = document.getElementById("board");
const context = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const restartBtn = document.getElementById("restart");

const CELL = 20;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;

context.scale(CELL, CELL);

const TYPES = ["I", "J", "L", "O", "S", "T", "Z"];
const COLORS = {
  I: "#00f0f0",
  J: "#0000f0",
  L: "#f0a000",
  O: "#f0f000",
  S: "#00f000",
  T: "#a000f0",
  Z: "#f00000"
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ]
};

function createMatrix(width, height) {
  const matrix = [];
  for (let y = 0; y < height; y += 1) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  const index = TYPES.indexOf(type) + 1;
  return SHAPES[type].map(row => row.map(cell => (cell ? index : 0)));
}

function merge(board, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function collide(board, player) {
  const { matrix, pos } = player;
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (matrix[y][x] === 0) {
        continue;
      }
      const boardRow = board[y + pos.y];
      if (!boardRow || boardRow[x + pos.x] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function rotate(matrix, direction) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < y; x += 1) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (direction > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function sweep(board, player) {
  let rowCount = 0;
  outer: for (let y = board.length - 1; y >= 0; y -= 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === 0) {
        continue outer;
      }
    }
    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    rowCount += 1;
    y += 1;
  }

  if (rowCount > 0) {
    player.lines += rowCount;
    const lineScores = [0, 40, 100, 300, 1200];
    player.score += lineScores[rowCount] * player.level;
    if (player.lines >= player.level * 10) {
      player.level += 1;
      dropInterval = Math.max(120, dropInterval - 80);
    }
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) {
        return;
      }
      const colorKey = TYPES[value - 1];
      context.fillStyle = COLORS[colorKey];
      context.fillRect(x + offset.x, y + offset.y, 1, 1);
      context.strokeStyle = "#111";
      context.lineWidth = 0.05;
      context.strokeRect(x + offset.x, y + offset.y, 1, 1);
    });
  });
}

function drawBoard(board) {
  context.fillStyle = "#1d1d1d";
  context.fillRect(0, 0, COLS, ROWS);
  drawMatrix(board, { x: 0, y: 0 });
}

function updateScoreboard(player) {
  scoreEl.textContent = player.score;
  linesEl.textContent = player.lines;
  levelEl.textContent = player.level;
}

const board = createMatrix(COLS, ROWS);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  type: "",
  score: 0,
  lines: 0,
  level: 1
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationFrameId = null;

function randomPieceKey() {
  return TYPES[Math.floor(Math.random() * TYPES.length)];
}

function playerReset() {
  player.type = randomPieceKey();
  player.matrix = createPiece(player.type);
  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);

  if (collide(board, player)) {
    board.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = 1000;
  }
  updateScoreboard(player);
}

function playerDrop() {
  player.pos.y += 1;
  if (collide(board, player)) {
    player.pos.y -= 1;
    merge(board, player);
    sweep(board, player);
    playerReset();
  }
  dropCounter = 0;
  updateScoreboard(player);
}

function hardDrop() {
  do {
    player.pos.y += 1;
  } while (!collide(board, player));
  player.pos.y -= 1;
  merge(board, player);
  sweep(board, player);
  playerReset();
  dropCounter = 0;
  updateScoreboard(player);
}

function playerMove(offset) {
  player.pos.x += offset;
  if (collide(board, player)) {
    player.pos.x -= offset;
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(board, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    playerDrop();
  }

  drawBoard(board);
  drawMatrix(player.matrix, player.pos);

  animationFrameId = requestAnimationFrame(update);
}

function resetGame() {
  board.forEach(row => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  dropInterval = 1000;
  playerReset();
  updateScoreboard(player);
}

document.addEventListener("keydown", event => {
  switch (event.code) {
    case "ArrowLeft":
      playerMove(-1);
      break;
    case "ArrowRight":
      playerMove(1);
      break;
    case "ArrowDown":
      playerDrop();
      break;
    case "ArrowUp":
      playerRotate(1);
      break;
    case "Space":
      hardDrop();
      break;
    default:
      return;
  }
  event.preventDefault();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

playerReset();
updateScoreboard(player);
update();
