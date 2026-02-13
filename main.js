/* Classic Skee Ball - Beta Working Version (with rails, jump point, holes) */

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
  dpr = Math.max(1, window.devicePixelRatio || 1);
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
  r: 16,          // in CSS pixels, applied with dpr in draw
  vx: 0,
  vy: 0,
  active: false,
  hopped: false,  // used to avoid repeated hop impulses
};

/* ---------- Lane Geometry ---------- */
function laneRect() {
  const w = canvas.width;
  const h = canvas.height;
  const m = w * 0.12; // side margin
  return { x: m, w: w - 2 * m, h };
}

/* Target board geometry */
function boardGeom() {
  const lr = laneRect();
  const boardY = 90 * dpr;           // top board area start
  const boardH = 150 * dpr;
  const cx = lr.x + lr.w / 2;
  const cy = boardY + boardH * 0.55;
  return { boardY, boardH, cx, cy };
}

function ringsConfig() {
  // Radii in px * dpr, tuned to look good at most sizes
  return [
    { score: 10, r: 120 * dpr },
    { score: 20, r: 98 * dpr },
    { score: 30, r: 76 * dpr },
    { score: 40, r: 54 * dpr },
    { score: 50, r: 34 * dpr },
  ];
}

function deluxeHundredsConfig() {
  // small 100 pockets near the top corners of the board ring area
  return [
    { score: 100, ox: -66 * dpr, oy: -98 * dpr, r: 18 * dpr },
    { score: 100, ox:  66 * dpr, oy: -98 * dpr, r: 18 * dpr },
  ];
}

/* ---------- Ball Reset ---------- */
function resetBallToStart() {
  const lr = laneRect();
  ball.x = lr.x + lr.w / 2;
  ball.y = canvas.height - 70 * dpr;
  ball.vx = 0;
  ball.vy = 0;
  ball.active = false;
  ball.hopped = false;
}

/* ---------- Scoreboard ---------- */
const DIGITS = 4;
const digitEls = [];

function pad4(n) {
  return String(Math.max(0, Math.min(9999, Math.floor(n)))).padStart(4, "0");
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
  digitEls.forEach((el, i) => (el.textContent = s[i]));
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
  if (isAnimatingScore || ballsUsed >= ROUND_BALLS) return;

  const rect = canvas.getBoundingClientRect();
  pointerStart = {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
    t: performance.now()
  };
});

canvas.addEventListener("pointerup", e => {
  if (!pointerStart || isAnimatingScore || ballsUsed >= ROUND_BALLS) return;

  const rect = canvas.getBoundingClientRect();
  const end = {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
    t: performance.now()
  };

  const dx = end.x - pointerStart.x;
  const forward = pointerStart.y - end.y;

  // needs forward flick
  if (forward < 20 * dpr) {
    pointerStart = null;
    return;
  }

  // power curve (distance based for now)
  const power = Math.min(1, forward / (320 * dpr));
  const aim = dx * 0.0022;

  resetBallToStart();

  // initial roll
  ball.vx = aim * 12 * dpr;
  ball.vy = -power * 20 * dpr;
  ball.active = true;

  pointerStart = null;
});

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

/* ---------- Physics ---------- */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function update() {
  if (!ball.active) return;

  const lr = laneRect();

  // simple movement
  ball.x += ball.vx;
  ball.y += ball.vy;

  // friction
  ball.vx *= 0.993;
  ball.vy *= 0.993;

  // a tiny "gravity" so it settles (still mostly a top down feel)
  ball.vy += 0.01 * dpr;

  // rails (physics walls)
  const railInset = 22 * dpr;
  const left = lr.x + railInset;
  const right = lr.x + lr.w - railInset;

  if (ball.x < left) {
    ball.x = left;
    ball.vx *= -0.55;
  }
  if (ball.x > right) {
    ball.x = right;
    ball.vx *= -0.55;
  }

  // jump point (ramp hop)
  // when crossing this line going upward, give a small extra kick
  const jumpY = canvas.height * 0.52;
  if (!ball.hopped && ball.y < jumpY) {
    ball.hopped = true;
    // hop impulse
    ball.vy -= 2.6 * dpr;
    // tighten aim a tiny bit during hop so it feels like the lane guides it
    ball.vx *= 0.92;
  }

  // backboard trigger (placeholder scoring for now)
  const { boardY } = boardGeom();
  const triggerY = boardY + 16 * dpr;

  if (ball.y <= triggerY) {
    ball.active = false;
    consumeBall();
  }

  // if ball drifts off bottom (rare)
  if (ball.y > canvas.height + 140 * dpr) {
    ball.active = false;
    resetBallToStart();
  }
}

/* ---------- Drawing ---------- */
function drawRails(lr) {
  // rails shadows
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(lr.x - 10 * dpr, 0, 10 * dpr, canvas.height);
  ctx.fillRect(lr.x + lr.w, 0, 10 * dpr, canvas.height);

  // inner rail highlights
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(lr.x, 0, 4 * dpr, canvas.height);
  ctx.fillRect(lr.x + lr.w - 4 * dpr, 0, 4 * dpr, canvas.height);
}

function drawJumpPoint(lr) {
  const y = canvas.height * 0.52;

  // ramp band
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(lr.x, y - 10 * dpr, lr.w, 20 * dpr);

  // ramp line
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(lr.x, y);
  ctx.lineTo(lr.x + lr.w, y);
  ctx.stroke();

  // tiny label
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = `${Math.floor(12 * dpr)}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("JUMP", lr.x + lr.w / 2, y - 14 * dpr);
}

function drawBoardAndHoles(lr) {
  const { boardY, boardH, cx, cy } = boardGeom();

  // board plate
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(lr.x + lr.w * 0.06, boardY, lr.w * 0.88, boardH);

  // ring outlines
  ctx.save();
  ctx.translate(cx, cy);

  const rings = ringsConfig();
  for (const ring of rings) {
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.stroke();

    // hole lip shading (gives it a "hole" look)
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 6 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r - 3 * dpr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // center pocket (50) filled darker to read as hole
  const centerR = rings[rings.length - 1].r;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(0, 0, centerR - 6 * dpr, 0, Math.PI * 2);
  ctx.fill();

  // Deluxe 100 pockets
  if (mode === "deluxe") {
    const hundreds = deluxeHundredsConfig();
    for (const p of hundreds) {
      ctx.fillStyle = "rgba(0,0,0,0.50)";
      ctx.beginPath();
      ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(p.ox, p.oy, p.r + 2 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // simple labels
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `${Math.floor(14 * dpr)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // label positions near top of each ring
  for (const ring of rings) {
    ctx.fillText(String(ring.score), 0, -ring.r + 16 * dpr);
  }
  if (mode === "deluxe") {
    ctx.font = `${Math.floor(12 * dpr)}px system-ui`;
    ctx.fillText("100", -66 * dpr, -98 * dpr);
    ctx.fillText("100",  66 * dpr, -98 * dpr);
  }

  ctx.restore();
}

function drawBall() {
  // resting ball if inactive and round not over
  if (!ball.active && ballsUsed < ROUND_BALLS) {
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.beginPath();
    ctx.ellipse(ball.x + 6 * dpr, ball.y + 10 * dpr, 18 * dpr, 8 * dpr, 0, 0, Math.PI * 2);
    ctx.fill();

    // ball
    const rg = ctx.createRadialGradient(ball.x - 6 * dpr, ball.y - 8 * dpr, 2 * dpr, ball.x, ball.y, 22 * dpr);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(1, "#cfc7bf");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 16 * dpr, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (!ball.active) return;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(ball.x + 6 * dpr, ball.y + 10 * dpr, 18 * dpr, 8 * dpr, 0, 0, Math.PI * 2);
  ctx.fill();

  // ball
  const rg = ctx.createRadialGradient(ball.x - 6 * dpr, ball.y - 8 * dpr, 2 * dpr, ball.x, ball.y, 22 * dpr);
  rg.addColorStop(0, "#ffffff");
  rg.addColorStop(1, "#cfc7bf");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 16 * dpr, 0, Math.PI * 2);
  ctx.fill();
}

function drawAwardPop() {
  if (!lastAward) return;
  const age = performance.now() - lastAward.t;
  if (age > 900) return;

  const a = 1 - age / 900;
  ctx.globalAlpha = Math.max(0, a);
  ctx.fillStyle = "rgba(255,200,120,0.95)";
  ctx.font = `${Math.floor(22 * dpr)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${lastAward.pts}`, canvas.width / 2, canvas.height * 0.42 - (age * 0.03 * dpr));
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const lr = laneRect();

  // wood lane
  const lg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  lg.addColorStop(0, "#2a1b14");
  lg.addColorStop(1, "#1a1210");
  ctx.fillStyle = lg;
  ctx.fillRect(lr.x, 0, lr.w, canvas.height);

  // subtle plank lines
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2 * dpr;
  for (let i = 0; i < 10; i++) {
    const y = (canvas.height * i) / 10;
    ctx.beginPath();
    ctx.moveTo(lr.x, y);
    ctx.lineTo(lr.x + lr.w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawRails(lr);
  drawJumpPoint(lr);
  drawBoardAndHoles(lr);
  drawBall();
  drawAwardPop();
}

/* ---------- Loop ---------- */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
resetBallToStart();
loop();
