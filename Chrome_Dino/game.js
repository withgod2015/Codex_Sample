(() => {
    const gameEl = document.getElementById('game');
    const dinoEl = document.getElementById('dino');
    const groundEl = document.getElementById('ground');
    const obstacleContainer = document.getElementById('obstacle-container');
    const cloudContainer = document.getElementById('cloud-container');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    const messageEl = document.getElementById('message');

    const GRAVITY = 2200; // px/s^2
    const JUMP_STRENGTH = 820; // px/s
    const START_SPEED = 420;
    const MAX_SPEED = 780;
    const SPEED_INCREMENT = 0.08;

    let lastTimestamp = 0;
    let groundOffset = 0;
    let speed = START_SPEED;
    let spawnTimer = 0;
    let cloudTimer = 0;
    let score = 0;
    let highScore = Number(localStorage.getItem('chrome-dino-high-score') || '0');

    const dinoState = {
        y: 0,
        velocity: 0,
        jumping: false,
        alive: true,
        started: false
    };

    const obstacles = new Set();
    const clouds = new Set();

    function formatScore(value) {
        return value.toString().padStart(5, '0');
    }

    function updateScoreboard() {
        scoreEl.textContent = formatScore(Math.floor(score));
        const displayHigh = Math.max(Math.floor(highScore), Math.floor(score));
        highScoreEl.textContent = `HI ${formatScore(displayHigh)}`;
    }

    function showMessage(text) {
        messageEl.innerHTML = `<p>${text}</p>`;
        messageEl.classList.add('show');
    }

    function hideMessage() {
        messageEl.classList.remove('show');
    }

    function resetGame() {
        dinoState.y = 0;
        dinoState.velocity = 0;
        dinoState.jumping = false;
        dinoState.alive = true;
        dinoState.started = false;
        speed = START_SPEED;
        score = 0;
        groundOffset = 0;
        spawnTimer = 0;
        cloudTimer = 0;
        obstacles.forEach(el => el.remove());
        clouds.forEach(el => el.remove());
        obstacles.clear();
        clouds.clear();
        dinoEl.style.transform = 'translateY(0)';
        dinoEl.classList.remove('dead');
        dinoEl.classList.remove('running');
        dinoEl.classList.remove('ducking');
        hideMessage();
        updateScoreboard();
    }

    function startGame() {
        if (!dinoState.started) {
            dinoState.started = true;
            hideMessage();
            dinoEl.classList.add('running');
        }
    }

    function gameOver() {
        if (!dinoState.alive) return;
        dinoState.alive = false;
        dinoEl.classList.remove('running');
        showMessage('게임 오버! 다시 시작하려면 R 키를 누르세요.');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('chrome-dino-high-score', Math.floor(highScore));
        }
        updateScoreboard();
    }

    function spawnObstacle() {
        const obstacle = document.createElement('div');
        obstacle.className = 'obstacle';
        obstacle.style.right = '-50px';
        obstacleContainer.appendChild(obstacle);
        obstacles.add(obstacle);
    }

    function spawnCloud() {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.top = `${20 + Math.random() * 60}px`;
        cloud.style.opacity = (0.5 + Math.random() * 0.3).toFixed(2);
        cloud.dataset.speedFactor = (0.4 + Math.random() * 0.3).toFixed(2);
        cloud.style.right = '-80px';
        cloudContainer.appendChild(cloud);
        clouds.add(cloud);
    }

    function handleJump() {
        if (!dinoState.alive) return;
        startGame();
        if (!dinoState.jumping) {
            dinoState.velocity = JUMP_STRENGTH;
            dinoState.jumping = true;
            dinoEl.classList.remove('ducking');
        }
    }

    function handleDuck(down) {
        if (!dinoState.alive || dinoState.jumping) return;
        if (down) {
            dinoEl.classList.add('ducking');
        } else {
            dinoEl.classList.remove('ducking');
        }
    }

    function updateDino(delta) {
        dinoState.velocity -= GRAVITY * delta;
        dinoState.y += dinoState.velocity * delta;

        if (dinoState.y <= 0) {
            dinoState.y = 0;
            dinoState.velocity = 0;
            dinoState.jumping = false;
        }

        dinoEl.style.transform = `translateY(${-dinoState.y}px)`;
    }

    function updateGround(delta) {
        groundOffset += speed * delta;
        const loopWidth = gameEl.clientWidth || 720;
        groundEl.style.transform = `translateX(${-groundOffset % loopWidth}px)`;
    }

    function updateObstacles(delta) {
        spawnTimer -= delta;
        if (spawnTimer <= 0) {
            spawnObstacle();
            const baseInterval = Math.max(0.5, 1.4 - speed / 600);
            const variance = 0.7 + Math.random() * 0.8;
            spawnTimer = baseInterval * variance;
        }

        obstacles.forEach(obstacle => {
            const current = parseFloat(obstacle.style.right) || 0;
            const next = current + speed * delta;
            obstacle.style.right = `${next}px`;

            if (next > gameEl.clientWidth + 60) {
                obstacles.delete(obstacle);
                obstacle.remove();
            }
        });
    }

    function updateClouds(delta) {
        cloudTimer -= delta;
        if (cloudTimer <= 0) {
            spawnCloud();
            cloudTimer = 2 + Math.random() * 3;
        }

        clouds.forEach(cloud => {
            const factor = Number(cloud.dataset.speedFactor || '0.5');
            const current = parseFloat(cloud.style.right) || 0;
            const next = current + speed * delta * factor;
            cloud.style.right = `${next}px`;
            if (next > gameEl.clientWidth + 80) {
                clouds.delete(cloud);
                cloud.remove();
            }
        });
    }

    function rectsOverlap(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    function checkCollisions() {
        const dinoRect = dinoEl.getBoundingClientRect();
        obstacles.forEach(obstacle => {
            const rect = obstacle.getBoundingClientRect();
            if (rectsOverlap(dinoRect, rect)) {
                gameOver();
            }
        });
    }

    function updateScore(delta) {
        score += delta * speed * 0.1;
        updateScoreboard();
    }

    function tick(timestamp) {
        if (!lastTimestamp) {
            lastTimestamp = timestamp;
        }
        const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.025);
        lastTimestamp = timestamp;

        if (dinoState.alive && dinoState.started) {
            speed = Math.min(MAX_SPEED, speed + SPEED_INCREMENT);
            updateDino(delta);
            updateGround(delta);
            updateObstacles(delta);
            updateClouds(delta);
            updateScore(delta);
            checkCollisions();
        }

        requestAnimationFrame(tick);
    }

    document.addEventListener('keydown', event => {
        if (event.repeat) return;
        if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
            event.preventDefault();
            handleJump();
        } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
            event.preventDefault();
            handleDuck(true);
        } else if (event.code === 'KeyR') {
            event.preventDefault();
            resetGame();
        }
    });

    document.addEventListener('keyup', event => {
        if (['ArrowDown', 'KeyS'].includes(event.code)) {
            handleDuck(false);
        }
    });

    window.addEventListener('focus', () => {
        lastTimestamp = performance.now();
    });

    updateScoreboard();
    showMessage('스페이스바 또는 ↑ 키로 점프하세요. 다시 시작하려면 R 키를 누르세요.');
    requestAnimationFrame(tick);
})();

