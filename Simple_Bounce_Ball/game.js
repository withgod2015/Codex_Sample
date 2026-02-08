const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

const world = {
  gravity: 0.55,
  friction: 0.86,
  jumpStrength: -12,
  tile: 72,
  width: canvas.width,
  height: canvas.height
};

const levelPlatforms = [
  { x: 0, y: 528, w: 504, h: 60 },
  { x: 360, y: 396, w: 144, h: 60 },
  { x: 360, y: 264, w: 144, h: 60 },
  { x: 360, y: 132, w: 360, h: 60 },
  { x: 72, y: 132, w: 144, h: 60 }
];

const star = {
  x: 120,
  y: 72,
  radius: 22,
  collected: false
};

const ball = {
  x: 450,
  y: 120,
  radius: 20,
  vx: 0,
  vy: 0,
  color: '#c026d3',
  grounded: false
};

const state = {
  running: true,
  score: 0,
  message: 'READY'
};

const keys = {
  left: false,
  right: false,
  jumpQueued: false
};

function resetGame() {
  ball.x = 450;
  ball.y = 120;
  ball.vx = 0;
  ball.vy = 0;
  ball.grounded = false;
  star.collected = false;
  state.running = true;
  state.score = 0;
  state.message = 'READY';
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  statusEl.textContent = state.message;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function handleInput() {
  if (keys.left) {
    ball.vx -= 0.6;
  }
  if (keys.right) {
    ball.vx += 0.6;
  }
  if (keys.jumpQueued && ball.grounded) {
    ball.vy = world.jumpStrength;
    ball.grounded = false;
    keys.jumpQueued = false;
  }
}

function applyPhysics() {
  ball.vy += world.gravity;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= world.friction;

  ball.x = clamp(ball.x, ball.radius, world.width - ball.radius);
  if (ball.y + ball.radius > world.height) {
    ball.y = world.height - ball.radius;
    ball.vy = 0;
    ball.grounded = true;
  }
}

function resolvePlatformCollision(platform) {
  const nearestX = clamp(ball.x, platform.x, platform.x + platform.w);
  const nearestY = clamp(ball.y, platform.y, platform.y + platform.h);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  const distance = Math.hypot(dx, dy);

  if (distance < ball.radius) {
    const overlap = ball.radius - distance;
    if (Math.abs(dx) > Math.abs(dy)) {
      ball.x += dx > 0 ? overlap : -overlap;
      ball.vx = 0;
    } else {
      ball.y += dy > 0 ? overlap : -overlap;
      ball.vy = 0;
      if (dy < 0) {
        ball.grounded = true;
      }
    }
  }
}

function checkStar() {
  if (star.collected) {
    return;
  }
  const dx = ball.x - star.x;
  const dy = ball.y - star.y;
  const distance = Math.hypot(dx, dy);
  if (distance < ball.radius + star.radius) {
    star.collected = true;
    state.score = 1;
    state.message = 'VICTORY!';
    state.running = false;
    updateHud();
  }
}

function update() {
  if (!state.running) {
    return;
  }
  ball.grounded = false;
  handleInput();
  applyPhysics();
  levelPlatforms.forEach(resolvePlatformCollision);
  checkStar();
  if (!state.running) {
    return;
  }
  if (ball.y - ball.radius > world.height + 200) {
    state.message = 'GAME OVER';
    state.running = false;
  }
  updateHud();
}

function drawBackground() {
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = world.tile; x < world.width; x += world.tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = world.tile; y < world.height; y += world.tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function drawPlatforms() {
  levelPlatforms.forEach((platform) => {
    ctx.fillStyle = '#8c6a49';
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = '#8fd36c';
    ctx.fillRect(platform.x, platform.y, platform.w, 14);
    ctx.strokeStyle = '#2f2619';
    ctx.lineWidth = 3;
    ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
  });
}

function drawStar() {
  if (star.collected) {
    return;
  }
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    ctx.lineTo(
      Math.cos(((18 + i * 72) * Math.PI) / 180) * star.radius,
      -Math.sin(((18 + i * 72) * Math.PI) / 180) * star.radius
    );
    ctx.lineTo(
      Math.cos(((54 + i * 72) * Math.PI) / 180) * (star.radius / 2),
      -Math.sin(((54 + i * 72) * Math.PI) / 180) * (star.radius / 2)
    );
  }
  ctx.closePath();
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = ball.color;
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#701a75';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawMessage() {
  if (state.running) {
    return;
  }
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, world.width / 2, world.height / 2);
  ctx.font = '20px "Noto Sans KR", sans-serif';
  ctx.fillText('다시 시작 버튼을 눌러주세요.', world.width / 2, world.height / 2 + 40);
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground();
  drawPlatforms();
  drawStar();
  drawBall();
  drawMessage();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowLeft') {
    keys.left = true;
  }
  if (event.code === 'ArrowRight') {
    keys.right = true;
  }
  if (event.code === 'Space') {
    keys.jumpQueued = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft') {
    keys.left = false;
  }
  if (event.code === 'ArrowRight') {
    keys.right = false;
  }
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

resetGame();
requestAnimationFrame(loop);
