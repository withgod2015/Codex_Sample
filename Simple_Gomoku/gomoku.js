const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const modeSelect = document.getElementById("mode");
const restartButton = document.getElementById("restart");
const turnLabel = document.getElementById("turn");
const messageLabel = document.getElementById("message");

const boardSize = 15;
const padding = 30;
const cellSize = (canvas.width - padding * 2) / (boardSize - 1);

const State = {
  EMPTY: 0,
  BLACK: 1,
  WHITE: 2,
};

let board = [];
let currentPlayer = State.BLACK;
let gameOver = false;
let isComputerTurn = false;

const directions = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

function initBoard() {
  board = Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => State.EMPTY)
  );
  currentPlayer = State.BLACK;
  gameOver = false;
  isComputerTurn = false;
  messageLabel.textContent = "";
  updateTurnLabel();
  drawBoard();
}

function updateTurnLabel() {
  const playerText = currentPlayer === State.BLACK ? "흑돌" : "백돌";
  turnLabel.textContent = `현재 차례: ${playerText}`;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#4d3f2d";
  ctx.lineWidth = 1.2;

  for (let i = 0; i < boardSize; i += 1) {
    const pos = padding + cellSize * i;
    ctx.beginPath();
    ctx.moveTo(padding, pos);
    ctx.lineTo(canvas.width - padding, pos);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pos, padding);
    ctx.lineTo(pos, canvas.height - padding);
    ctx.stroke();
  }

  drawStones();
}

function drawStones() {
  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const value = board[y][x];
      if (value === State.EMPTY) continue;
      const centerX = padding + cellSize * x;
      const centerY = padding + cellSize * y;
      const radius = cellSize * 0.42;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = value === State.BLACK ? "#111" : "#fafafa";
      ctx.fill();

      if (value === State.WHITE) {
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

function getBoardPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const gridX = Math.round((x - padding) / cellSize);
  const gridY = Math.round((y - padding) / cellSize);

  if (gridX < 0 || gridX >= boardSize || gridY < 0 || gridY >= boardSize) {
    return null;
  }

  const snappedX = padding + gridX * cellSize;
  const snappedY = padding + gridY * cellSize;
  const distance = Math.hypot(x - snappedX, y - snappedY);

  if (distance > cellSize * 0.45) {
    return null;
  }

  return { x: gridX, y: gridY };
}

function handleMove(x, y) {
  if (gameOver || board[y][x] !== State.EMPTY) return;
  board[y][x] = currentPlayer;
  drawBoard();

  if (checkWin(x, y, currentPlayer)) {
    finishGame(currentPlayer);
    return;
  }

  if (isBoardFull()) {
    finishGame(null);
    return;
  }

  currentPlayer = currentPlayer === State.BLACK ? State.WHITE : State.BLACK;
  updateTurnLabel();

  if (modeSelect.value === "ai" && currentPlayer === State.WHITE) {
    isComputerTurn = true;
    setTimeout(() => {
      const move = findComputerMove();
      if (move) {
        handleMove(move.x, move.y);
      }
      isComputerTurn = false;
    }, 350);
  }
}

function finishGame(winner) {
  gameOver = true;
  if (winner === State.BLACK) {
    messageLabel.textContent = "흑돌 승리!";
  } else if (winner === State.WHITE) {
    messageLabel.textContent = "백돌 승리!";
  } else {
    messageLabel.textContent = "무승부입니다.";
  }
}

function isBoardFull() {
  return board.every((row) => row.every((cell) => cell !== State.EMPTY));
}

function checkWin(x, y, player) {
  return directions.some(([dx, dy]) => {
    let count = 1;
    count += countInDirection(x, y, dx, dy, player);
    count += countInDirection(x, y, -dx, -dy, player);
    return count >= 5;
  });
}

function countInDirection(x, y, dx, dy, player) {
  let count = 0;
  let cx = x + dx;
  let cy = y + dy;
  while (cx >= 0 && cx < boardSize && cy >= 0 && cy < boardSize) {
    if (board[cy][cx] !== player) break;
    count += 1;
    cx += dx;
    cy += dy;
  }
  return count;
}

function findComputerMove() {
  const candidates = gatherCandidates();
  let bestMove = null;
  let bestScore = -Infinity;

  candidates.forEach(({ x, y }) => {
    const score = evaluateMove(x, y, State.WHITE) +
      evaluateMove(x, y, State.BLACK) * 0.85 +
      Math.random() * 0.1;
    if (score > bestScore) {
      bestScore = score;
      bestMove = { x, y };
    }
  });

  return bestMove;
}

function gatherCandidates() {
  const moves = [];
  const hasStone = board.some((row) => row.some((cell) => cell !== State.EMPTY));

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (board[y][x] !== State.EMPTY) continue;
      if (!hasStone || hasNeighbor(x, y)) {
        moves.push({ x, y });
      }
    }
  }

  if (moves.length === 0) {
    return [{ x: Math.floor(boardSize / 2), y: Math.floor(boardSize / 2) }];
  }

  return moves;
}

function hasNeighbor(x, y) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
        if (board[ny][nx] !== State.EMPTY) return true;
      }
    }
  }
  return false;
}

function evaluateMove(x, y, player) {
  let score = 0;
  directions.forEach(([dx, dy]) => {
    const line = buildLine(x, y, dx, dy, player);
    score += scoreLine(line);
  });
  return score;
}

function buildLine(x, y, dx, dy, player) {
  const line = [player];
  let cx = x + dx;
  let cy = y + dy;
  while (cx >= 0 && cx < boardSize && cy >= 0 && cy < boardSize) {
    line.push(board[cy][cx]);
    cx += dx;
    cy += dy;
  }

  cx = x - dx;
  cy = y - dy;
  while (cx >= 0 && cx < boardSize && cy >= 0 && cy < boardSize) {
    line.unshift(board[cy][cx]);
    cx -= dx;
    cy -= dy;
  }

  return line;
}

function scoreLine(line) {
  const patterns = {
    five: 100000,
    openFour: 5000,
    four: 1000,
    openThree: 400,
    three: 120,
    two: 30,
  };

  let score = 0;
  const str = line.map((cell) => (cell === State.EMPTY ? "0" : cell)).join("");
  const playerValue = line.find((cell) => cell !== State.EMPTY);
  if (!playerValue) return 0;

  const p = String(playerValue);

  if (str.includes(`${p}${p}${p}${p}${p}`)) score += patterns.five;
  if (str.includes(`0${p}${p}${p}${p}0`)) score += patterns.openFour;
  if (str.includes(`${p}${p}${p}${p}0`) || str.includes(`0${p}${p}${p}${p}`)) {
    score += patterns.four;
  }
  if (str.includes(`0${p}${p}${p}0`)) score += patterns.openThree;
  if (str.includes(`${p}${p}${p}0`) || str.includes(`0${p}${p}${p}`)) score += patterns.three;
  if (str.includes(`0${p}${p}0`)) score += patterns.two;

  return score;
}

canvas.addEventListener("click", (event) => {
  if (isComputerTurn || gameOver) return;
  const position = getBoardPosition(event);
  if (!position) return;
  handleMove(position.x, position.y);
});

modeSelect.addEventListener("change", () => {
  initBoard();
});

restartButton.addEventListener("click", () => {
  initBoard();
});

initBoard();
