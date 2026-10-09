// Neon Snake — demo game bundled with AI Game Studio
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const GRID = 20;
const CELL = canvas.width / GRID;

let snake, dir, nextDir, food, score, best, dead, tick, speed;
best = Number(localStorage.getItem('neonSnakeBest') || 0);
document.getElementById('best').textContent = best;

function resetGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  dead = false;
  tick = 0;
  speed = 7;
  placeFood();
  document.getElementById('over').style.display = 'none';
  document.getElementById('score').textContent = '0';
}

function placeFood() {
  do {
    food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
}

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((k === 'arrowup' || k === 'w') && dir.y === 0) nextDir = { x: 0, y: -1 };
  else if ((k === 'arrowdown' || k === 's') && dir.y === 0) nextDir = { x: 0, y: 1 };
  else if ((k === 'arrowleft' || k === 'a') && dir.x === 0) nextDir = { x: -1, y: 0 };
  else if ((k === 'arrowright' || k === 'd') && dir.x === 0) nextDir = { x: 1, y: 0 };
  if (k === ' ' && dead) resetGame();
});

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID || snake.some((s) => s.x === head.x && s.y === head.y)) {
    dead = true;
    if (score > best) { best = score; localStorage.setItem('neonSnakeBest', best); document.getElementById('best').textContent = best; }
    document.getElementById('finalscore').textContent = 'Score: ' + score;
    document.getElementById('over').style.display = 'flex';
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    document.getElementById('score').textContent = score;
    speed = Math.min(16, speed + 0.35);
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // grid glow
  ctx.strokeStyle = 'rgba(201,168,76,.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  // food pulse
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
  ctx.shadowColor = '#f87171'; ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = '#f87171';
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.32 * pulse + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // snake
  snake.forEach((s, i) => {
    const t = i / Math.max(1, snake.length - 1);
    ctx.fillStyle = i === 0 ? '#e8c97a' : `rgba(201,168,76,${0.95 - t * 0.6})`;
    ctx.shadowColor = '#c9a84c'; ctx.shadowBlur = i === 0 ? 16 : 6;
    const pad = i === 0 ? 1.5 : 2.5;
    roundRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 4);
  });
  ctx.shadowBlur = 0;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function loop() {
  if (!dead) {
    tick++;
    if (tick >= Math.max(3, Math.round(60 / speed))) { tick = 0; step(); }
  }
  draw();
  requestAnimationFrame(loop);
}

resetGame();
loop();
