/* Classic Skee Ball - Beta Working Version */

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const resetBtn = document.getElementById("resetBtn");
const modeStandardBtn = document.getElementById("modeStandard");
const modeDeluxeBtn = document.getElementById("modeDeluxe");
const modeLabel = document.getElementById("modeLabel");
const ballCountEl = document.getElementById("ballCount");
const digitsWrap = document.getElementById("digits");

/* ---------- Canvas Scaling ---------- */
let dpr = Math.max(1, window.devicePixelRatio || 1);
function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
}
window.addEventListener("resize", resize);
resize();

/* ---------- Config ---------- */
const ROUND_BALLS = 9;

const MODES = {
  standard: {
    label: "Standard",
    outcomes: [
      { score: 10, w: 38 },
      { score: 20, w: 30 },
      { score: 30, w: 18 },
      { score: 40, w: 10 },
      { score: 50, w: 4 },
    ],
  },
  deluxe: {
    label: "Deluxe",
    outcomes: [
      { score: 10, w: 34 },
      { score: 20, w: 28 },
      { score: 30, w: 18 },
      { score: 40, w: 10 },
      { score: 50, w: 5 },
      { score: 100, w: 5 },
    ],
  }
};

let mode = "standard";

/* ---------- State ---------- */
let totalScore = 0;
let displayedScore = 0;
let ballsUsed = 0;
let isAnimatingScore = false;
let lastAward = null;

const ball = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  active: false,
};

/* ---------- Lane Geometry ---------- */
function laneRect() {
  const w = canvas.width;
  const h = canvas.height;
  const m = w * 0.12;
  return { x: m, w: w - 2 * m, h };
}

/* ---------- Ball Reset ---------- */
function resetBallToStart() {
  const lr = laneRect();
  ball.x = lr.x + lr.w / 2;
  ball.y = canvas.height - 60 * dpr;
  ball.vx = 0;
  ball.vy = 0;
  ball.active = false;
}

/* ---------- Scoreboard ---------- */
const DIGITS = 4;
const digitEls = [];

function pad4(n) {
  return String(Math.max(0, Math.min(9999, n))).padStart(4, "0");
}

function initScoreboard() {
  digitsWrap.innerHTML = "";
  digitEls.length = 0;
  const s = pad4(displayedScore);

  for (let i = 0; i < DIGITS; i++) {
    const el = document.createElement("div");
    el.className = "digit";
    el.textContent = s[i];
    digitEls.push(el);
    digitsWrap.appendChild(el);
  }
}
initScoreboard();

function updateScoreboardInstant(score) {
  const s = pad4(score);
  digitEls.forEach((el, i) => {
    el.textContent = s[i];
  });
  displayedScore = score;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function cascadeAdd(points) {
  isAnimatingScore = true;
  const start = totalScore;
  const end = Math.min(9999, start + points);

  for (let v = start + 1; v <= end; v++) {
    updateScoreboardInstant(v);
    await sleep(12);
  }

  await sleep(60);
  totalScore = end;
  isAnimatingScore = false;
}

/* ---------- Placeholder Scoring ---------- */
function weightedPick(outcomes) {
  const total = outcomes.reduce((a, o) => a + o.w, 0);
  let r = Math.random() * total;
  for (const o of outcomes) {
    r -= o.w;
    if (r <= 0) return o.score;
  }
  return outcomes[outcomes.length - 1].score;
}

async function awardPlaceholderScore() {
  const pts = weightedPick(MODES[mode].outcomes);
  lastAward = { pts, t: performance.now() };
  await cascadeAdd(pts);
}

/* ---------- Round Flow ---------- */
function updateBallCount() {
  const n = Math.min(ROUND_BALLS, ballsUsed + 1);
  ballCountEl.textContent =
    ballsUsed >= ROUND_BALLS ? "ROUND OVER" : `BALL ${n} OF ${ROUND_BALLS}`;
}

async function consumeBall() {
  ballsUsed++;
  updateBallCount();

  await awardPlaceholderScore();

  if (ballsUsed >= ROUND_BALLS) return;
  resetBallToStart();
}

function resetRound() {
  totalScore = 0;
  displayedScore = 0;
  ballsUsed = 0;
  lastAward = null;
  updateBallCount();
  initScoreboard();
  resetBallToStart();
}

resetRound();

/* ---------- Controls (Forgiving Flick) ---------- */
let pointerStart = null;

canvas.addEventListener("pointerdown", e => {
  const rect = canvas.getBoundingClientRect();
  pointerStart = {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
    t: performance.now()
  };
});

canvas.addEventListener("pointerup", async e => {
  if (!pointerStart || isAnimatingScore || ballsUsed >= ROUND_BALLS) return;

  const rect = canvas.getBoundingClientRect();
  const end = {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
    t: performance.now()
  };

  const dx = end.x - pointerStart.x;
  const dy = pointerStart.y - end.y;

  if (dy < 20 * dpr) return;

  const power = Math.min(1, dy / (300 * dpr));
  const aim = dx * 0.002;

  ball.vx = aim * 12 * dpr;
  ball.vy = -power * 18 * dpr;
  ball.active = true;

  pointerStart = null;
});

/* ---------- Update & Draw ---------- */
function update() {
  if (!ball.active) return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  ball.vx *= 0.995;
  ball.vy *= 0.995;

  if (ball.y < 120 * dpr) {
    ball.active = false;
    consumeBall();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const lr = laneRect();

  ctx.fillStyle = "#2a1b14";
  ctx.fillRect(lr.x, 0, lr.w, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 16 * dpr, 0, Math.PI * 2);
  ctx.fill();

  if (lastAward) {
    const age = performance.now() - lastAward.t;
    if (age < 800) {
      ctx.globalAlpha = 1 - age / 800;
      ctx.font = `${24 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`+${lastAward.pts}`, canvas.width / 2, canvas.height * 0.4);
      ctx.globalAlpha = 1;
    }
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

/* ---------- Mode ---------- */
function setMode(next) {
  mode = next;
  modeLabel.textContent = MODES[mode].label;
  modeStandardBtn.classList.toggle("active", mode === "standard");
  modeDeluxeBtn.classList.toggle("active", mode === "deluxe");
}

modeStandardBtn.onclick = () => setMode("standard");
modeDeluxeBtn.onclick = () => setMode("deluxe");

resetBtn.onclick = resetRound;

setMode("standard");
