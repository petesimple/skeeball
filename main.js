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
let ballsUsed = 0;

let isThrowing = false;
let isAnimatingScore = false;

let lastAward = null; // ✅ FIXED LOCATION

const ball = {
  x: 0,
  y: 0,
  r: 16,
  vx: 0,
  vy: 0,
  active: false,
};

/* ---------- Flip scoreboard ---------- */
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

function flipDigit(idx, fromChar, toChar) {
  const el = digitEls[idx];
  if (el.classList.contains("flipping")) return;

  el._parts.topHalf.textContent = fromChar;
  el._parts.bottomHalf.textContent = fromChar;

  el._parts.flipTop.textContent = fromChar;
  el._parts.flipBottom.textContent = toChar;

  el.classList.add("flipping");

  setTimeout(() => {
    el._parts.topHalf.textContent = toChar;
    el._parts.bottomHalf.textContent = toChar;
  }, 140);

  setTimeout(() => {
    el.classList.remove("flipping");
    el.dataset.value = toChar;
  }, 292);
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
  return new Promise(res => setTimeout(res, ms));
}

async function cascadeAdd(points) {
  isAnimatingScore = true;

  const start = totalScore;
  const end = Math.min(9999, start + points);

  for (let v = start + 1; v <= end; v++) {
    const prev = pad4(v - 1);
    const next = pad4(v);

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
  lastAward = { pts, t: performance.now() };
  await cascadeAdd(pts);
}

/* ---------- Round Flow ---------- */
function resetRound() {
  totalScore = 0;
  displayedScore = 0;
  ballsUsed = 0;
  lastAward = null; // now safe
  updateBallCount();
  initScoreboard();
  resetBallToStart();
}

function updateBallCount() {
  const n = Math.min(ROUND_BALLS, ballsUsed + 1);
  ballCountEl.textContent =
    ballsUsed >= ROUND_BALLS ? "ROUND OVER" : `BALL ${n} OF ${ROUND_BALLS}`;
}

resetRound();
