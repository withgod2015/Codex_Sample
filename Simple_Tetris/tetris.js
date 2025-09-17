const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 24;

const TETROMINO_TYPES = [
    { name: 'I', color: '#00f0f0', matrix: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ] },
    { name: 'J', color: '#0060d5', matrix: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ] },
    { name: 'L', color: '#ff9f1c', matrix: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ] },
    { name: 'O', color: '#f4d35e', matrix: [
        [1, 1],
        [1, 1]
    ] },
    { name: 'S', color: '#21bf73', matrix: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ] },
    { name: 'T', color: '#9c1de7', matrix: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ] },
    { name: 'Z', color: '#ff4d6d', matrix: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ] }
];

const canvas = document.getElementById('board');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const messageElement = document.getElementById('message');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const state = {
    board: createMatrix(ROWS, COLS),
    pieceMatrix: null,
    pieceColor: '#ffffff',
    position: { x: 0, y: 0 },
    nextQueue: [],
    score: 0,
    lines: 0,
    level: 1,
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0,
    running: false,
    gameOver: false
};

function createMatrix(rows, cols) {
    return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
}

function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createBag() {
    return shuffle(TETROMINO_TYPES);
}

function addMessage(text) {
    messageElement.textContent = text;
}

function updateScoreboard() {
    scoreElement.textContent = state.score;
    linesElement.textContent = state.lines;
    levelElement.textContent = state.level;
}

function resetBoard() {
    for (let y = 0; y < ROWS; y += 1) {
        state.board[y].fill(0);
    }
}

function spawnPiece() {
    if (state.nextQueue.length <= 3) {
        state.nextQueue.push(...createBag());
    }
    const data = state.nextQueue.shift();
    state.pieceMatrix = cloneMatrix(data.matrix);
    state.pieceColor = data.color;
    state.position.y = 0;
    state.position.x = Math.floor(COLS / 2) - Math.ceil(state.pieceMatrix[0].length / 2);

    if (collide(state.board, state.pieceMatrix, state.position)) {
        state.pieceMatrix = null;
        state.gameOver = true;
        state.running = false;
        addMessage('Game over! Press Start to try again.');
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause';
        drawNextPreview(true);
        return;
    }
    drawNextPreview();
}

function draw() {
    drawBoard();
    if (state.pieceMatrix) {
        drawPiece(state.pieceMatrix, state.position, state.pieceColor);
    }
}

function drawBoard() {
    context.fillStyle = '#0d1117';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
            const cell = state.board[y][x];
            if (cell) {
                drawBlock(context, x, y, cell);
            }
        }
    }
    context.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x <= COLS; x += 1) {
        context.beginPath();
        context.moveTo(x * BLOCK_SIZE, 0);
        context.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        context.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
        context.beginPath();
        context.moveTo(0, y * BLOCK_SIZE);
        context.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
        context.stroke();
    }
}

function drawPiece(matrix, offset, color) {
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (matrix[y][x]) {
                drawBlock(context, x + offset.x, y + offset.y, color);
            }
        }
    }
}

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawNextPreview(clearOnly = false) {
    nextContext.fillStyle = '#0d1117';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (clearOnly || !state.nextQueue.length) {
        return;
    }
    const next = state.nextQueue[0];
    const matrix = next.matrix;
    const offsetX = Math.floor((4 - matrix[0].length) / 2);
    const offsetY = Math.floor((4 - matrix.length) / 2);

    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (matrix[y][x]) {
                nextContext.fillStyle = next.color;
                nextContext.fillRect((x + offsetX) * NEXT_BLOCK_SIZE, (y + offsetY) * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                nextContext.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                nextContext.strokeRect((x + offsetX) * NEXT_BLOCK_SIZE, (y + offsetY) * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
            }
        }
    }
}

function collide(board, matrix, pos) {
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (!matrix[y][x]) {
                continue;
            }
            const newX = x + pos.x;
            const newY = y + pos.y;
            if (newX < 0 || newX >= COLS || newY >= ROWS) {
                return true;
            }
            if (newY < 0) {
                continue;
            }
            if (board[newY][newX]) {
                return true;
            }
        }
    }
    return false;
}

function merge(board, matrix, pos, color) {
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (matrix[y][x] && y + pos.y >= 0) {
                board[y + pos.y][x + pos.x] = color;
            }
        }
    }
}

function sweepLines() {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (state.board[y].every((cell) => cell)) {
            state.board.splice(y, 1);
            state.board.unshift(new Array(COLS).fill(0));
            cleared += 1;
            y += 1;
        }
    }
    if (cleared > 0) {
        state.lines += cleared;
        const points = [0, 40, 100, 300, 1200][cleared] || 0;
        state.score += points * state.level;
        state.level = Math.floor(state.lines / 10) + 1;
        state.dropInterval = Math.max(120, 1000 - (state.level - 1) * 80);
        updateScoreboard();
    }
}

function rotateMatrix(matrix, dir) {
    const result = createMatrix(matrix[0].length, matrix.length);
    for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
            if (dir > 0) {
                result[x][matrix.length - 1 - y] = matrix[y][x];
            } else {
                result[matrix[0].length - 1 - x][y] = matrix[y][x];
            }
        }
    }
    return result;
}

function tryRotate(dir) {
    if (!state.pieceMatrix) {
        return;
    }
    const rotated = rotateMatrix(state.pieceMatrix, dir);
    const originalX = state.position.x;
    const offsets = [0, 1, -1, 2, -2];
    for (const offset of offsets) {
        state.position.x = originalX + offset;
        if (!collide(state.board, rotated, state.position)) {
            state.pieceMatrix = rotated;
            return;
        }
    }
    state.position.x = originalX;
}

function playerDrop() {
    if (!state.pieceMatrix) {
        return;
    }
    state.position.y += 1;
    if (collide(state.board, state.pieceMatrix, state.position)) {
        state.position.y -= 1;
        lockPiece();
    } else {
        state.score += 1;
        updateScoreboard();
    }
    state.dropCounter = 0;
}

function hardDrop() {
    if (!state.pieceMatrix) {
        return;
    }
    let distance = 0;
    while (!collide(state.board, state.pieceMatrix, { x: state.position.x, y: state.position.y + 1 })) {
        state.position.y += 1;
        distance += 1;
    }
    if (distance > 0) {
        state.score += distance * 2;
        updateScoreboard();
    }
    lockPiece();
    state.dropCounter = 0;
}

function lockPiece() {
    merge(state.board, state.pieceMatrix, state.position, state.pieceColor);
    sweepLines();
    state.position.y = 0;
    state.position.x = 0;
    spawnPiece();
}

function playerMove(dir) {
    if (!state.pieceMatrix) {
        return;
    }
    state.position.x += dir;
    if (collide(state.board, state.pieceMatrix, state.position)) {
        state.position.x -= dir;
    }
}

function update(time = 0) {
    if (state.lastTime === 0) {
        state.lastTime = time;
    }
    const delta = time - state.lastTime;
    state.lastTime = time;

    if (state.running && !state.gameOver) {
        state.dropCounter += delta;
        if (state.dropCounter > state.dropInterval) {
            playerDrop();
        }
    }

    draw();
    requestAnimationFrame(update);
}

function startNewGame() {
    resetBoard();
    state.nextQueue = [];
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropInterval = 1000;
    state.dropCounter = 0;
    state.lastTime = 0;
    state.gameOver = false;
    state.pieceMatrix = null;
    updateScoreboard();
    addMessage('Go!');
    spawnPiece();
    state.running = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    startBtn.textContent = 'Restart';
}

function resetToIdle() {
    resetBoard();
    state.pieceMatrix = null;
    state.nextQueue = [];
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropInterval = 1000;
    state.dropCounter = 0;
    state.lastTime = 0;
    state.running = false;
    state.gameOver = false;
    updateScoreboard();
    addMessage('Press Start to play!');
    draw();
    drawNextPreview(true);
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    startBtn.textContent = 'Start';
}

function togglePause() {
    if (state.gameOver || !state.pieceMatrix) {
        return;
    }
    state.running = !state.running;
    state.dropCounter = 0;
    state.lastTime = 0;
    if (state.running) {
        addMessage('Game resumed.');
        pauseBtn.textContent = 'Pause';
    } else {
        addMessage('Paused.');
        pauseBtn.textContent = 'Resume';
    }
}

startBtn.addEventListener('click', () => {
    startNewGame();
});

pauseBtn.addEventListener('click', () => {
    togglePause();
});

resetBtn.addEventListener('click', () => {
    resetToIdle();
});

document.addEventListener('keydown', (event) => {
    const { code } = event;
    if (code === 'KeyP') {
        event.preventDefault();
        togglePause();
        return;
    }
    if (!state.running || state.gameOver) {
        return;
    }
    switch (code) {
        case 'ArrowLeft':
            event.preventDefault();
            playerMove(-1);
            break;
        case 'ArrowRight':
            event.preventDefault();
            playerMove(1);
            break;
        case 'ArrowDown':
            event.preventDefault();
            playerDrop();
            break;
        case 'ArrowUp':
            event.preventDefault();
            tryRotate(1);
            break;
        case 'Space':
        case 'Spacebar':
            event.preventDefault();
            hardDrop();
            break;
        default:
            break;
    }
});

resetToIdle();
requestAnimationFrame(update);
