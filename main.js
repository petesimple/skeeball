/* Classic Skee Ball - beta
   - Forgiving flick controls
   - Placeholder scoring at backboard
   - Mechanical flip scoreboard (4 digits) with full cascade
   - Standard / Deluxe modes
*/

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const resetBtn = document.getElementById("resetBtn");
const modeStandardBtn = document.getElementById("modeStandard");
const modeDeluxeBtn = document.getElementById("modeDeluxe");
const modeLabel = document.getElementById("modeLabel");
const ballCountEl = document.getElementById("ballCount");
const digitsWrap = document.getElementById("digits");

/* ---------- Canvas scaling ---------- */
let dpr = Math.max(1, window.devicePixelRatio || 1);
function resize() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
}
window.addEventListener("resize", resize);
resize();

/* ---------- Game config ---------- */
const ROUND_BALLS = 9;

const MODES = {
  standard: {
    label: "Standard",
    // Weighted placeholder outcomes
    // More 10/20, fewer 40/50
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
    // Adds rare 100 pockets
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
let ballsUsed = 0;

let isThrowing = false;
let isAnimatingScore = false;

const ball = {
  x: 0,
  y: 0,
  r: 16,
  vx: 0,
  vy: 0,
  active: false,
};

function laneRect() {
  const w = canvas.width;
  const h = canvas.height;
  // lane margins
  const m = Math.floor(w * 0.12);
  return { x: m, y: 0, w: w - 2 * m, h };
}

/* ---------- Flip scoreboard component ---------- */
const DIGITS = 4;
let displayedScore = 0;

function pad4(n) {
  n = Math.max(0, Math.min(9999, Math.floor(n)));
  return String(n).padStart(4, "0");
}

function makeDigit(initialChar) {
  const digit = document.createElement("div");
  digit.className = "digit";
  digit.dataset.value = initialChar;

  const topHalf = document.createElement("div");
  topHalf.className = "half topHalf";
  topHalf.textContent = initialChar;

  const bottomHalf = document.createElement("div");
  bottomHalf.className = "half bottomHalf";
  bottomHalf.textContent = initialChar;

  const flipTop = document.createElement("div");
  flipTop.className = "flipTop";
  flipTop.textContent = initialChar;

  const flipBottom = document.createElement("div");
  flipBottom.className = "flipBottom";
  flipBottom.textContent = initialChar;

  digit.appendChild(topHalf);
  digit.appendChild(bottomHalf);
  digit.appendChild(flipTop);
  digit.appendChild(flipBottom);

  digit._parts = { topHalf, bottomHalf, flipTop, flipBottom };
  return digit;
}

const digitEls = [];
function initScoreboard() {
  digitsWrap.innerHTML = "";
  digitEls.length = 0;
  const s = pad4(displayedScore);
  for (let i = 0; i < DIGITS; i++) {
    const el = makeDigit(s[i]);
    digitEls.push(el);
    digitsWrap.appendChild(el);
  }
}
initScoreboard();

function setDigitInstant(idx, char) {
  const el = digitEls[idx];
  el.dataset.value = char;
  el._parts.topHalf.textContent = char;
  el._parts.bottomHalf.textContent = char;
  el._parts.flipTop.textContent = char;
  el._parts.flipBottom.textContent = char;
}

function flipDigit(idx, fromChar, toChar) {
  const el = digitEls[idx];
  if (el.classList.contains("flipping")) return;

  // Setup halves
  el._parts.topHalf.textContent = fromChar;
  el._parts.bottomHalf.textContent = fromChar;

  el._parts.flipTop.textContent = fromChar;
  el._parts.flipBottom.textContent = toChar;

  el.classList.add("flipping");

  // Midway swap to new value after top flips
  setTimeout(() => {
    el._parts.topHalf.textContent = toChar;
    el._parts.bottomHalf.textContent = toChar;
  }, 140);

  // Cleanup after bottom flips
  setTimeout(() => {
    el.classList.remove("flipping");
    el.dataset.value = toChar;
    el._parts.flipTop.textContent = toChar;
    el._parts.flipBottom.textContent = toChar;
  }, 140 + 140 + 12);
}

function updateScoreboardTo(targetScore) {
  const from = pad4(displayedScore);
  const to = pad4(targetScore);
  for (let i = 0; i < DIGITS; i++) {
    const a = from[i];
    const b = to[i];
    if (a !== b) flipDigit(i, a, b);
  }
  displayedScore = targetScore;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function cascadeAdd(points) {
  // Full cascade: increment 1 point at a time
  // Slight extra delay on rollovers to feel mechanical.
  isAnimatingScore = true;

  const start = totalScore;
  const end = Math.min(9999, start + points);

  for (let v = start + 1; v <= end; v++) {
    const prev = pad4(v - 1);
    const next = pad4(v);

    // detect rollover (any digit 9 -> 0)
    let rollover = false;
    for (let i = 0; i < 4; i++) {
      if (prev[i] === "9" && next[i] === "0") rollover = true;
    }

    updateScoreboardTo(v);

    // base speed + extra for rollovers
    await sleep(14 + (rollover ? 6 : 0));
  }

  await sleep(60);
  totalScore = end;
  isAnimatingScore = false;
}

/* ---------- Placeholder scoring ---------- */
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

  // Simple pop message on lane (drawn)
  lastAward = { pts, t: performance.now() };

  // Animate scoreboard cascade
  await cascadeAdd(pts);
}

/* ---------- Ball / round flow ---------- */
function resetBallToStart() {
  const lr = laneRect();
  ball.x = lr.x + lr.w / 2;
  ball.y = canvas.height - 70 * dpr;
  ball.vx = 0;
  ball.vy = 0;
  ball.active = false;
}

function resetRound() {
  totalScore = 0;
  displayedScore = 0;
  ballsUsed = 0;
  updateBallCount();
  initScoreboard();
  resetBallToStart();
  lastAward = null;
}
resetRound();

function updateBallCount() {
  const n = Math.min(ROUND_BALLS, ballsUsed + 1);
  ballCountEl.textContent = (ballsUsed >= ROUND_BALLS)
    ? `ROUND OVER`
    : `BALL ${n} OF ${ROUND_BALLS}`;
}

async function consumeBallAndScore() {
  if (isAnimatingScore) return;

  ballsUsed++;
  updateBallCount();

  await awardPlaceholderScore();

  if (ballsUsed >= ROUND_BALLS) {
    // round done
    ball.active = false;
    isThrowing = false;
    return;
  }

  resetBallToStart();
}

/* ---------- Input handling (forgiving) ---------- */
let pointerActive = false;
let startPt = null;
let lastPt = null;
let lastTime = 0;

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * dpr;
  const y = (e.clientY - rect.top) * dpr;
  return { x, y };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function inLowerLane(y) {
  // forgiving: lower 65% of screen
  return y > canvas.height * 0.35;
}

function canStartThrowAt(pos) {
  if (ballsUsed >= ROUND_BALLS) return false;
  if (isAnimatingScore) return false;
  if (!inLowerLane(pos.y)) return false;
  return true;
}

function beginPointer(pos, t) {
  if (!canStartThrowAt(pos)) return;
  pointerActive = true;
  startPt = pos;
  lastPt = pos;
  lastTime = t;
  isThrowing = true;
}

function movePointer(pos, t) {
  if (!pointerActive) return;
  lastPt = pos;
  lastTime = t;
}

function endPointer(pos, t) {
  if (!pointerActive) return;
  pointerActive = false;

  // Determine flick vector based on start->end and velocity
  const dx = (pos.x - startPt.x);
  const dy = (pos.y - startPt.y);

  // We want "up the lane" = negative dy (screen coords)
  const forward = -dy;

  // If they didn't flick forward enough, ignore
  if (forward < 18 * dpr) {
    isThrowing = false;
    return;
  }

  // Time-based velocity contribution (avoid division by zero)
  const dt = Math.max(16, t - (lastTime || t));
  // Distance based, plus some speed feel
  const speed = forward / dt; // px per ms

  // Angle from horizontal drift, clamped
  // dx positive = aim right
  const aim = clamp(dx / (220 * dpr), -0.9, 0.9);

  // Power from forward distance + speed
  let power = (forward / (420 * dpr)) + (speed * 0.9);
  power = clamp(power, 0.25, 1.0);

  launchBall(aim, power);
}

function launchBall(aim, power) {
  if (ball.active || isAnimatingScore) return;

  resetBallToStart();

  const baseSpeed = 14.5 * dpr; // tune feel
  const s = baseSpeed * (0.6 + 0.85 * power);

  // Forward is up screen: negative y
  ball.vy = -s;
  ball.vx = s * aim * 0.55;

  ball.active = true;
}

/* Pointer events */
canvas.addEventListener("pointerdown", (e) => {
  const pos = getPointerPos(e);
  beginPointer(pos, performance.now());
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!pointerActive) return;
  movePointer(getPointerPos(e), performance.now());
});

canvas.addEventListener("pointerup", (e) => {
  endPointer(getPointerPos(e), performance.now());
});

canvas.addEventListener("pointercancel", (e) => {
  pointerActive = false;
  isThrowing = false;
});

/* ---------- Mode toggle ---------- */
function setMode(next) {
  mode = next;
  modeLabel.textContent = MODES[mode].label;

  modeStandardBtn.classList.toggle("active", mode === "standard");
  modeDeluxeBtn.classList.toggle("active", mode === "deluxe");
}

modeStandardBtn.addEventListener("click", () => setMode("standard"));
modeDeluxeBtn.addEventListener("click", () => setMode("deluxe"));

/* ---------- Reset ---------- */
resetBtn.addEventListener("click", () => resetRound());

/* ---------- Rendering ---------- */
let lastAward = null;

function drawLane() {
  const { x, w } = laneRect();
  const h = canvas.height;

  // background
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // vignette
  const g = ctx.createRadialGradient(canvas.width/2, canvas.height*0.15, 10, canvas.width/2, canvas.height*0.2, canvas.width*0.85);
  g.addColorStop(0, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // lane wood gradient
  const lg = ctx.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, "#2a1b14");
  lg.addColorStop(1, "#1a1210");
  ctx.fillStyle = lg;
  ctx.fillRect(x, 0, w, h);

  // lane rails
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 10*dpr, 0, 10*dpr, h);
  ctx.fillRect(x + w, 0, 10*dpr, h);

  // subtle planks
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2*dpr;
  for (let i = 0; i < 12; i++) {
    const yy = (h * i) / 12;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // target board hint
  const boardY = 80 * dpr;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x + w*0.08, boardY, w*0.84, 120*dpr);

  // rings (just visual for now)
  const cx = x + w/2;
  const cy = boardY + 78*dpr;

  const rings = [
    { r: 120*dpr, a: "10" },
    { r: 98*dpr, a: "20" },
    { r: 76*dpr, a: "30" },
    { r: 54*dpr, a: "40" },
    { r: 34*dpr, a: "50" },
  ];

  ctx.save();
  ctx.translate(cx, cy);

  for (let i = 0; i < rings.length; i++) {
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3*dpr;
    ctx.beginPath();
    ctx.arc(0, 0, rings[i].r, 0, Math.PI*2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = `${Math.floor(14*dpr)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rings[i].a, 0, -rings[i].r + 16*dpr);
  }

  if (mode === "deluxe") {
    // show two tiny 100 pockets
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(-62*dpr, -96*dpr, 18*dpr, 0, Math.PI*2);
    ctx.arc( 62*dpr, -96*dpr, 18*dpr, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.font = `${Math.floor(12*dpr)}px system-ui`;
    ctx.fillText("100", -62*dpr, -96*dpr);
    ctx.fillText("100",  62*dpr, -96*dpr);
  }

  ctx.restore();

  // instruction overlay while idle
  if (!ball.active && ballsUsed < ROUND_BALLS && !isAnimatingScore) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${Math.floor(14*dpr)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Flick up the lane to roll", canvas.width/2, canvas.height - 24*dpr);
  }
}

function drawBall() {
  if (!ball.active && ballsUsed < ROUND_BALLS) {
    // draw resting ball
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(6*dpr, 10*dpr, 18*dpr, 8*dpr, 0, 0, Math.PI*2);
    ctx.fill();

    const rg = ctx.createRadialGradient(-6*dpr, -8*dpr, 2*dpr, 0, 0, 22*dpr);
    rg.addColorStop(0, "#f7f3ef");
    rg.addColorStop(1, "#cfc7bf");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, 0, 16*dpr, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (!ball.active) return;

  ctx.save();
  ctx.translate(ball.x, ball.y);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath();
  ctx.ellipse(6*dpr, 10*dpr, 18*dpr, 8*dpr, 0, 0, Math.PI*2);
  ctx.fill();

  // ball
  const rg = ctx.createRadialGradient(-6*dpr, -8*dpr, 2*dpr, 0, 0, 22*dpr);
  rg.addColorStop(0, "#ffffff");
  rg.addColorStop(1, "#cfc7bf");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, 16*dpr, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawAwardPop() {
  if (!lastAward) return;
  const age = performance.now() - lastAward.t;
  if (age > 900) return;

  const a = 1 - age / 900;
  ctx.globalAlpha = Math.max(0, a);

  ctx.fillStyle = "rgba(255,200,120,0.95)";
  ctx.font = `${Math.floor(22*dpr)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${lastAward.pts}`, canvas.width/2, canvas.height*0.42 - (age * 0.03 * dpr));

  ctx.globalAlpha = 1;
}

/* ---------- Physics update ---------- */
function update(dt) {
  if (!ball.active) return;

  // simple friction + gravity-ish (tiny)
  const friction = 0.995;
  ball.vx *= friction;
  ball.vy *= friction;

  // small "gravity" downward to keep it grounded visually
  ball.vy += 0.004 * dt * dpr;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // lane walls
  const lr = laneRect();
  const left = lr.x + 22*dpr;
  const right = lr.x + lr.w - 22*dpr;

  if (ball.x < left) { ball.x = left; ball.vx *= -0.55; }
  if (ball.x > right) { ball.x = right; ball.vx *= -0.55; }

  // backboard trigger (placeholder scoring)
  const backY = 130 * dpr;
  if (ball.y <= backY) {
    ball.active = false;
    // award points and consume ball
    consumeBallAndScore();
  }

  // if ball rolls off bottom (rare), reset
  if (ball.y > canvas.height + 120*dpr) {
    ball.active = false;
    isThrowing = false;
    resetBallToStart();
  }
}

/* ---------- Loop ---------- */
let prev = performance.now();
function frame(now) {
  const dt = Math.min(40, now - prev);
  prev = now;

  update(dt);
  drawLane();
  drawBall();
  drawAwardPop();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* init */
setMode("standard");
resetBallToStart();
