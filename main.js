/* Classic Skee Ball - Beta (classic scoring, drop into holes, misses return)
   Scoreboard upgrade: split-flap flip digits + cascade
*/

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
  standard: { label: "Standard" },
  deluxe: { label: "Deluxe" }
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

  // animation states
  state: "idle", // idle | up | drop | return
  t: 0,
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  baseR: 16,
  drawR: 16,
  hopped: false
};

/* ---------- Lane Geometry ---------- */
function laneRect() {
  const w = canvas.width;
  const h = canvas.height;
  const m = w * 0.12;
  return { x: m, w: w - 2 * m, h };
}

function boardGeom() {
  const lr = laneRect();
  const boardY = 90 * dpr;
  const boardH = 150 * dpr;
  const cx = lr.x + lr.w / 2;
  const cy = boardY + boardH * 0.55;
  return { boardY, boardH, cx, cy };
}

function ringsConfig() {
  return [
    { score: 10, r: 120 * dpr },
    { score: 20, r: 98 * dpr },
    { score: 30, r: 76 * dpr },
    { score: 40, r: 54 * dpr },
    { score: 50, r: 34 * dpr }
  ];
}

function deluxeHundredsConfig() {
  return [
    { score: 100, ox: -66 * dpr, oy: -98 * dpr, r: 18 * dpr },
    { score: 100, ox:  66 * dpr, oy: -98 * dpr, r: 18 * dpr }
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
  ball.state = "idle";
  ball.t = 0;
  ball.hopped = false;
  ball.drawR = ball.baseR;
}

/* ---------- Scoreboard (split-flap flip digits + cascade) ---------- */
const DIGITS = 4;
const digitEls = [];

function pad4(n) {
  return String(Math.max(0, Math.min(9999, Math.floor(n)))).padStart(4, "0");
}

function makeDigit(initialChar) {
  const digit = document.createElement("div");
  digit.className = "digit";
  digit.dataset.value = initialChar;

  const topHalf = document.createElement("div");
  topHalf.className = "half topHalf";

  const bottomHalf = document.createElement("div");
  bottomHalf.className = "half bottomHalf";

  const flipTop = document.createElement("div");
  flipTop.className = "flipTop";

  const flipBottom = document.createElement("div");
  flipBottom.className = "flipBottom";

  // full-height glyph inside each window
  const g1 = document.createElement("span");
  g1.className = "glyph";
  g1.textContent = initialChar;

  const g2 = document.createElement("span");
  g2.className = "glyph";
  g2.textContent = initialChar;

  const g3 = document.createElement("span");
  g3.className = "glyph";
  g3.textContent = initialChar;

  const g4 = document.createElement("span");
  g4.className = "glyph";
  g4.textContent = initialChar;

  topHalf.appendChild(g1);
  bottomHalf.appendChild(g2);
  flipTop.appendChild(g3);
  flipBottom.appendChild(g4);

  digit.appendChild(topHalf);
  digit.appendChild(bottomHalf);
  digit.appendChild(flipTop);
  digit.appendChild(flipBottom);

  digit._parts = { topHalf, bottomHalf, flipTop, flipBottom };
  return digit;
}

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

function flipDigit(idx, fromChar, toChar) {
  const el = digitEls[idx];
  if (!el) return;

  // prevent animation pileups during fast cascades
  if (el.classList.contains("flipping")) return;

  const { topHalf, bottomHalf, flipTop, flipBottom } = el._parts;

  topHalf.querySelector(".glyph").textContent = fromChar;
bottomHalf.querySelector(".glyph").textContent = fromChar;

flipTop.querySelector(".glyph").textContent = fromChar;
flipBottom.querySelector(".glyph").textContent = toChar;

  el.classList.add("flipping");

  setTimeout(() => {
    topHalf.querySelector(".glyph").textContent = toChar;
bottomHalf.querySelector(".glyph").textContent = toChar;
  }, 140);

  setTimeout(() => {
    el.classList.remove("flipping");
    el.dataset.value = toChar;
    flipTop.querySelector(".glyph").textContent = toChar;
flipBottom.querySelector(".glyph").textContent = toChar;
  }, 140 + 140 + 16);
}

function updateScoreboardTo(targetScore) {
  const from = pad4(displayedScore);
  const to = pad4(targetScore);

  for (let i = 0; i < DIGITS; i++) {
    if (from[i] !== to[i]) flipDigit(i, from[i], to[i]);
  }
  displayedScore = targetScore;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function cascadeAdd(points) {
  isAnimatingScore = true;
  const start = totalScore;
  const end = Math.min(9999, start + points);

  for (let v = start + 1; v <= end; v++) {
    const prev = pad4(v - 1);
    const next = pad4(v);

    // add a little extra delay on rollovers for mechanical feel
    let rollover = false;
    for (let i = 0; i < 4; i++) {
      if (prev[i] === "9" && next[i] === "0") rollover = true;
    }

    updateScoreboardTo(v);
    await sleep(14 + (rollover ? 6 : 0));
  }

  await sleep(60);
  totalScore = end;
  isAnimatingScore = false;
}

/* ---------- Round Flow ---------- */
function updateBallCount() {
  const n = Math.min(ROUND_BALLS, ballsUsed + 1);
  ballCountEl.textContent =
    ballsUsed >= ROUND_BALLS ? "ROUND OVER" : `BALL ${n} OF ${ROUND_BALLS}`;
}

async function consumeBallAndAward(points) {
  ballsUsed++;
  updateBallCount();

  if (points > 0) {
    lastAward = { pts: points, t: performance.now() };
    await cascadeAdd(points);
  } else {
    lastAward = null;
  }

  if (ballsUsed >= ROUND_BALLS) return;
  resetBallToStart();
}

function resetRound() {
  totalScore = 0;
  displayedScore = 0;
  ballsUsed = 0;
  lastAward = null;
  updateBallCount();
  initScoreboard();     // rebuild split-flap DOM to 0000
  resetBallToStart();
}
resetRound();

/* ---------- Input (forgiving flick anywhere on lane) ---------- */
let pointerStart = null;

canvas.addEventListener("pointerdown", e => {
  if (isAnimatingScore) return;
  if (ballsUsed >= ROUND_BALLS) return;
  if (ball.state !== "idle") return;

  const rect = canvas.getBoundingClientRect();
  pointerStart = {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
    t: performance.now()
  };
});

canvas.addEventListener("pointerup", e => {
  if (!pointerStart) return;
  if (isAnimatingScore) return;
  if (ballsUsed >= ROUND_BALLS) return;
  if (ball.state !== "idle") return;

  const rect = canvas.getBoundingClientRect();
  const end = {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
    t: performance.now()
  };

  const dx = end.x - pointerStart.x;
  const forward = pointerStart.y - end.y;

  pointerStart = null;

  if (forward < 18 * dpr) return;

  const power = Math.min(1, forward / (330 * dpr));
  const aim = dx * 0.0022;

  // launch
  resetBallToStart();
  ball.vx = aim * 12 * dpr;
  ball.vy = -power * 22 * dpr;
  ball.active = true;
  ball.state = "up";
  ball.hopped = false;
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

/* ---------- Scoring logic at board ---------- */
function resolveBoardHit() {
  const { cx, cy } = boardGeom();
  const dx = ball.x - cx;
  const dy = ball.y - cy;

  // First check Deluxe 100 pockets
  if (mode === "deluxe") {
    const pockets = deluxeHundredsConfig();
    for (const p of pockets) {
      const px = cx + p.ox;
      const py = cy + p.oy;
      const ddx = ball.x - px;
      const ddy = ball.y - py;
      const dist = Math.hypot(ddx, ddy);
      if (dist <= p.r) {
        return { points: 100, holeX: px, holeY: py };
      }
    }
  }

  // Then check rings (smallest ring wins)
  const rings = ringsConfig();
  const distCenter = Math.hypot(dx, dy);

  // 50 pocket is inside smallest ring
  if (distCenter <= rings[rings.length - 1].r) {
    return { points: 50, holeX: cx, holeY: cy };
  }
  if (distCenter <= rings[3].r) return { points: 40, holeX: cx, holeY: cy };
  if (distCenter <= rings[2].r) return { points: 30, holeX: cx, holeY: cy };
  if (distCenter <= rings[1].r) return { points: 20, holeX: cx, holeY: cy };
  if (distCenter <= rings[0].r) return { points: 10, holeX: cx, holeY: cy };

  // miss
  return { points: 0, holeX: null, holeY: null };
}

/* ---------- Physics update ---------- */
function update() {
  if (!ball.active) return;

  const lr = laneRect();

  // lane walls
  const railInset = 22 * dpr;
  const left = lr.x + railInset;
  const right = lr.x + lr.w - railInset;

  if (ball.state === "up" || ball.state === "return") {
    // movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // friction
    ball.vx *= 0.993;
    ball.vy *= 0.993;

    // slight gravity for settling
    ball.vy += 0.010 * dpr;

    // rails bounce
    if (ball.x < left) {
      ball.x = left;
      ball.vx *= -0.55;
    }
    if (ball.x > right) {
      ball.x = right;
      ball.vx *= -0.55;
    }

    // jump point
    const jumpY = canvas.height * 0.52;
    if (!ball.hopped && ball.state === "up" && ball.y < jumpY) {
      ball.hopped = true;
      ball.vy -= 2.6 * dpr;
      ball.vx *= 0.92;
    }

    const { boardY } = boardGeom();
    const triggerY = boardY + 18 * dpr;

    // If we reach the board while going up, score or miss
    if (ball.state === "up" && ball.y <= triggerY) {
      const res = resolveBoardHit();

      if (res.points > 0) {
        // drop animation into the hole
        ball.state = "drop";
        ball.t = 0;
        ball.startX = ball.x;
        ball.startY = ball.y;
        ball.targetX = res.holeX;
        ball.targetY = res.holeY;
        ball._pendingPoints = res.points;

        // stop physics while dropping
        ball.vx = 0;
        ball.vy = 0;
      } else {
        // board miss, return down the lane
        ball.state = "return";
        ball.vy = Math.abs(ball.vy) * 0.55 + 6.5 * dpr;
        ball.vx *= 0.45;
      }
    }

    // complete miss at ramp, ball never gets near the board, it returns and counts as a 0
    if (ball.state === "up") {
      const jumpY2 = canvas.height * 0.52;
      if (ball.hopped === false && ball.vy > 0 && ball.y > jumpY2 + 30 * dpr) {
        ball.state = "return";
        ball.vy = Math.abs(ball.vy) * 0.55 + 6.5 * dpr;
        ball.vx *= 0.45;
      }
    }

    // return finished when it reaches the bottom zone
    if (ball.state === "return" && ball.y >= canvas.height - 60 * dpr) {
      ball.active = false;
      consumeBallAndAward(0);
    }

    // safety
    if (ball.y > canvas.height + 180 * dpr) {
      ball.active = false;
      consumeBallAndAward(0);
    }
  }

  if (ball.state === "drop") {
    // animate into hole
    ball.t += 1;

    const duration = 22; // frames
    const p = Math.min(1, ball.t / duration);

    const ease = 1 - Math.pow(1 - p, 3);

    ball.x = ball.startX + (ball.targetX - ball.startX) * ease;
    ball.y = ball.startY + (ball.targetY - ball.startY) * ease;

    // shrink as it drops
    ball.drawR = ball.baseR * (1 - 0.65 * ease);

    if (p >= 1) {
      ball.active = false;
      ball.drawR = ball.baseR;
      const pts = ball._pendingPoints || 0;
      ball._pendingPoints = 0;
      consumeBallAndAward(pts);
    }
  }
}

/* ---------- Drawing ---------- */
function drawRails(lr) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(lr.x - 10 * dpr, 0, 10 * dpr, canvas.height);
  ctx.fillRect(lr.x + lr.w, 0, 10 * dpr, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(lr.x, 0, 4 * dpr, canvas.height);
  ctx.fillRect(lr.x + lr.w - 4 * dpr, 0, 4 * dpr, canvas.height);
}

function drawJumpPoint(lr) {
  const y = canvas.height * 0.52;

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(lr.x, y - 10 * dpr, lr.w, 20 * dpr);

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(lr.x, y);
  ctx.lineTo(lr.x + lr.w, y);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = `${Math.floor(12 * dpr)}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("JUMP", lr.x + lr.w / 2, y - 14 * dpr);
}

function drawBoardAndHoles(lr) {
  const { boardY, boardH, cx, cy } = boardGeom();

  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fillRect(lr.x + lr.w * 0.06, boardY, lr.w * 0.88, boardH);

  ctx.save();
  ctx.translate(cx, cy);

  const rings = ringsConfig();
  for (const ring of rings) {
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 6 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r - 3 * dpr, 0, Math.PI * 2);
    ctx.stroke();
  }

  // center hole
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(0, 0, rings[rings.length - 1].r - 6 * dpr, 0, Math.PI * 2);
  ctx.fill();

  // deluxe 100 holes
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

  // labels
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `${Math.floor(14 * dpr)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const ring of rings) ctx.fillText(String(ring.score), 0, -ring.r + 16 * dpr);

  if (mode === "deluxe") {
    ctx.font = `${Math.floor(12 * dpr)}px system-ui`;
    ctx.fillText("100", -66 * dpr, -98 * dpr);
    ctx.fillText("100",  66 * dpr, -98 * dpr);
  }

  ctx.restore();
}

function drawBall() {
  const r = (ball.state === "drop") ? ball.drawR : ball.baseR;

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
  ctx.arc(ball.x, ball.y, r * dpr, 0, Math.PI * 2);
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

  // plank lines
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

  // draw ball when active or idle
  if (ball.state !== "idle" || (ball.state === "idle" && ballsUsed < ROUND_BALLS)) {
    drawBall();
  }

  drawAwardPop();

  if (ball.state === "idle" && ballsUsed < ROUND_BALLS && !isAnimatingScore) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${Math.floor(14 * dpr)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Flick up the lane to roll", canvas.width / 2, canvas.height - 24 * dpr);
  }
}

/* ---------- Loop ---------- */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resetBallToStart();
loop();
