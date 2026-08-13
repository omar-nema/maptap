// ---------------------------------------------------------------
// The rounds live base64-encoded below so the answers and memories
// aren't sitting in plain text on a public page. Decoded shape:
//   type "map"  → { prompt, answer: [lat, lng], name, memory }
//   type "date" → { prompt, answerDate: "YYYY-MM-DD", name, memory }
// name / memory are optional — "" hides them on the reveal.
//
// To edit or add rounds: decode SPOTS_ENCODED, change the array, and
// re-encode with  btoa(JSON.stringify(spots))  — then paste back below.
// ---------------------------------------------------------------
const SPOTS_ENCODED =
  "W3sidHlwZSI6Im1hcCIsInByb21wdCI6IldoZXJlIGRpZCB3ZSBoYXZlIG91ciBmaXJzdCBkYXRlPyIsImFuc3dlciI6WzQwLjcxNzAxNjgsLTczLjk0OTk4MTNdLCJuYW1lIjoiTmlnaHQgb2YgSm95IiwibWVtb3J5IjoiWW91IHdlcmUgd2VhcmluZyBhIGRyZXNzLCBJIHdhcyB3ZWFyaW5nIGEgc2hvcnQgc2xlZXZlIGJ1dHRvbiB1cC4gV2Ugc3RhcnRlZCBieSB0YWxraW5nIGFib3V0IG1pZHNvbW1hciwgeW91IHdlcmUgc3VwZXIgY3V0ZSBhbmQgYSBsaWwgc2h5LiJ9LHsidHlwZSI6Im1hcCIsInByb21wdCI6IldoZXJlIHdlcmUgd2Ugb24gb3VyIHRoaXJkIGRhdGU/IiwiYW5zd2VyIjpbNDAuNzA0OTE2NywtNzMuOTI3OTA1Nl0sIm5hbWUiOiJCdW5uYSBDYWZlIiwibWVtb3J5IjoiIn0seyJ0eXBlIjoibWFwIiwicHJvbXB0IjoiV2hlcmUgZGlkIHdlIHdhdGNoIG91ciBmaXJzdCBtb3ZpZSB0b2dldGhlcj8iLCJhbnN3ZXIiOls0MC43MTU5NzIyLC03My45NjI1NzVdLCJuYW1lIjoiTml0ZWhhd2sgQ2luZW1hIiwibWVtb3J5IjoiV2Ugd2F0Y2hlZCBUZWVuYWdlIE11dGFudCBOaW5qYSBUdXJ0bGVzLiJ9LHsidHlwZSI6Im1hcCIsInByb21wdCI6IldoZXJlIGRpZCB3ZSBnZXQgb3VyIGZpcnN0IHRhdHRvb3M/IiwiYW5zd2VyIjpbNDAuNzAwNzc0MSwtNzMuOTAyMDA5OV0sIm5hbWUiOiJOaWNvJ3MgcGxhY2UiLCJtZW1vcnkiOiI5NDAgT25kZXJkb25rIEF2ZSwgUmlkZ2V3b29kLiJ9LHsidHlwZSI6Im1hcCIsInByb21wdCI6IldoZXJlIGRpZCB3ZSBkaXNjdXNzIGdldHRpbmcgcGllcmNpbmdzPyIsImFuc3dlciI6WzQwLjcwNDE0MjQsLTczLjkzMzE1OTZdLCJuYW1lIjoiRXl2YWwiLCJtZW1vcnkiOiIifSx7InR5cGUiOiJtYXAiLCJzY29wZSI6IndvcmxkIiwicHJvbXB0IjoiV2hlcmUgaXMgTWFyeWFtJ3MgIzEgU3BvdGlmeSBhcnRpc3Qgb2YgMjAyMyBmcm9tPyIsImFuc3dlciI6WzE4LjQ2NTUsLTY2LjEwNTddLCJuYW1lIjoiUHVlcnRvIFJpY28iLCJtZW1vcnkiOiJCYWQgQnVubnkuIn0seyJ0eXBlIjoibWFwIiwic2NvcGUiOiJ1cyIsInByb21wdCI6IldoZXJlIGlzIE9tYXIncyAjMSBTcG90aWZ5IGFydGlzdCBvZiAyMDIzIGZyb20/IiwiYW5zd2VyIjpbMzQuMDUyMiwtMTE4LjI0MzddLCJuYW1lIjoiTG9zIEFuZ2VsZXMiLCJtZW1vcnkiOiIifSx7InR5cGUiOiJkYXRlIiwicHJvbXB0IjoiV2hlbiBkaWQgd2Ugc2VlIFJhbXkgdG9nZXRoZXI/Iiwic3VidGV4dCI6IkFuZCB5b3UgdGhvdWdodCB0aGlzIHdhcyBqdXN0IGEgbWFwIPCfmIgiLCJhbnN3ZXJEYXRlIjoiMjAyMy0xMi0wOCIsIm5hbWUiOiIiLCJtZW1vcnkiOiIifSx7InR5cGUiOiJkYXRlIiwicHJvbXB0IjoiV2hlbiB3YXMgb3VyIGZpcnN0IHN6ZWNodWFuIGZvb2QgdG9nZXRoZXI/IiwiYW5zd2VyRGF0ZSI6IjIwMjQtMDItMjkiLCJuYW1lIjoiQW50aWRvdGUiLCJtZW1vcnkiOiIifV0=";

const SPOTS = JSON.parse(decodeURIComponent(escape(atob(SPOTS_ENCODED))));

// Per-scope map views and scoring curves ([miles, points] anchors,
// linear in between). Rounds default to "nyc"; wider scopes grade
// proportionally more generously.
const SCOPES = {
  nyc: {
    center: [40.7328, -73.986], zoom: 13, minZoom: 11,
    bounds: [[40.49, -74.28], [40.93, -73.68]],
    curve: [[0.5, 100], [1, 80], [2, 50], [3.5, 0]],
  },
  us: {
    center: [39.5, -97.5], zoom: 4, minZoom: 3,
    bounds: [[10, -150], [60, -50]],
    curve: [[50, 100], [200, 80], [600, 50], [1500, 0]],
  },
  world: {
    center: [25, -40], zoom: 2, minZoom: 1,
    bounds: [[-85, -180], [85, 180]],
    curve: [[250, 100], [1000, 80], [3000, 50], [7000, 0]],
  },
};

// Verdict headline is drawn at random from the tier the points land in.
const PHRASES = {
  high: [
    "Good lord on ice skates that's good",
    "Ay mami",
    "Claro si si",
    "Oh no you didn't",
    "You know ball",
    "Okay Jalen Brunson",
  ],
  mid: ["Warm... but wander closer."],
  low: [
    "Sick to my stomach fam",
    "Good lord on ice skates (derogatory)",
    "Cover your eyes children",
    "That's the best you can do",
    "It's okay you haven't had your matcha yet",
    "Mitchell Robinson misses another at the line",
  ],
};

function pickHeadline(points) {
  const tier = points >= 80 ? "high" : points >= 50 ? "mid" : "low";
  const list = PHRASES[tier];
  return list[Math.floor(Math.random() * list.length)];
}

// ---- map setup (scope applied per round) ----
const map = L.map("map", {
  center: SCOPES.nyc.center,
  zoom: SCOPES.nyc.zoom,
  minZoom: SCOPES.nyc.minZoom,
  maxZoom: 17,
  maxBounds: L.latLngBounds(SCOPES.nyc.bounds),
  maxBoundsViscosity: 1.0,
  zoomControl: false,
  attributionControl: true,
});

L.control.zoom({ position: "bottomright" }).addTo(map);

// Stamen Watercolor via Stadia Maps: painterly and naturally label-free.
// Keyless on localhost; the live domain is whitelisted in the Stadia account.
L.tileLayer("https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg", {
  attribution:
    '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen Design</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxNativeZoom: 16,
  maxZoom: 20,
}).addTo(map);

const heartIcon = L.divIcon({ className: "", html: '<div class="heart-pin">❤️</div>', iconSize: [30, 30], iconAnchor: [15, 27] });
const starIcon = L.divIcon({ className: "", html: '<div class="star-pin">⭐</div>', iconSize: [30, 30], iconAnchor: [15, 27] });

// ---- game state ----
const promptCard = document.getElementById("prompt-card");
const resultCard = document.getElementById("result-card");
const confirmBtn = document.getElementById("confirm-btn");
const nextBtn = document.getElementById("next-btn");
const dateInput = document.getElementById("date-input");
const tapHint = document.getElementById("tap-hint");

// ---- score meter ----
const scoreValueEl = document.getElementById("score-value");
const scoreFillEl = document.getElementById("score-fill");
const scorePopEl = document.getElementById("score-pop");
const roundScoreNumEl = document.getElementById("round-score-num");
const MAX_SCORE = SPOTS.length * 100;
document.getElementById("score-max").textContent = `/ ${MAX_SCORE}`;

let round = 0;
let guessMarker = null;
let revealLayers = [];
let locked = false;
let totalScore = 0;
let scoreRaf = null;

// Points out of 100 from a scope's [miles, points] anchor curve.
function geoScore(miles, curve) {
  if (miles <= curve[0][0]) return 100;
  for (let i = 1; i < curve.length; i++) {
    const [d0, p0] = curve[i - 1];
    const [d1, p1] = curve[i];
    if (miles <= d1) return Math.round(p0 + ((miles - d0) / (d1 - d0)) * (p1 - p0));
  }
  return 0;
}

// Dates by how many months off: within 1 month = 100, 3 months = 80,
// 6 months = 50 — a clean -10 points per month past the first, to 0.
function dateScore(daysOff) {
  const months = daysOff / 30;
  const p = months <= 1 ? 100 : 100 - (months - 1) * 10;
  return Math.max(0, Math.round(p));
}

function resetScore() {
  totalScore = 0;
  if (scoreRaf) cancelAnimationFrame(scoreRaf);
  scoreValueEl.textContent = "0";
  scoreFillEl.style.transform = "scaleX(0)";
}

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Count total (prev -> new) and the round chip (0 -> points) off one eased clock.
function animateScore(prevTotal, newTotal, roundPoints) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  scorePopEl.textContent = `+${roundPoints}`;
  scorePopEl.classList.remove("show");
  scoreValueEl.classList.remove("bump");
  void scorePopEl.offsetWidth; // restart the CSS animations
  scorePopEl.classList.add("show");
  scoreValueEl.classList.add("bump");

  if (scoreRaf) cancelAnimationFrame(scoreRaf);
  const dur = reduce ? 0 : 950;
  const start = performance.now();

  function frame(now) {
    const t = dur ? Math.min((now - start) / dur, 1) : 1;
    const e = easeOutExpo(t);
    const total = prevTotal + (newTotal - prevTotal) * e;
    scoreValueEl.textContent = Math.round(total);
    roundScoreNumEl.textContent = Math.round(roundPoints * e);
    scoreFillEl.style.transform = `scaleX(${(total / MAX_SCORE).toFixed(4)})`;
    if (t < 1) scoreRaf = requestAnimationFrame(frame);
  }
  scoreRaf = requestAnimationFrame(frame);
}

function startRound(i) {
  const spot = SPOTS[i];
  if (i === 0) resetScore(); // fresh game (also the initial load)
  document.getElementById("round-label").textContent = `Round ${i + 1} / ${SPOTS.length}`;
  document.getElementById("prompt-text").textContent = spot.prompt;
  const subtextEl = document.getElementById("prompt-subtext");
  subtextEl.textContent = spot.subtext || "";
  subtextEl.classList.toggle("hidden", !spot.subtext);
  confirmBtn.disabled = true;
  locked = false;

  if (guessMarker) { map.removeLayer(guessMarker); guessMarker = null; }
  revealLayers.forEach((l) => map.removeLayer(l));
  revealLayers = [];

  if (spot.type === "date") {
    tapHint.textContent = "Pick the date, then lock it in.";
    dateInput.classList.remove("hidden");
    dateInput.value = "";
  } else {
    tapHint.textContent = "Tap the map to drop your guess.";
    dateInput.classList.add("hidden");
  }

  resultCard.classList.add("hidden");
  promptCard.classList.remove("hidden");

  const scope = SCOPES[spot.scope || "nyc"];
  map.setMinZoom(scope.minZoom);
  map.setMaxBounds(L.latLngBounds(scope.bounds));
  map.flyTo(scope.center, scope.zoom, { duration: 0.8 });
}

map.on("click", (e) => {
  if (locked || SPOTS[round].type !== "map") return;
  if (guessMarker) {
    guessMarker.setLatLng(e.latlng);
  } else {
    guessMarker = L.marker(e.latlng, { icon: heartIcon }).addTo(map);
  }
  tapHint.textContent = "Tap again to move it, or lock it in.";
  confirmBtn.disabled = false;
});

dateInput.addEventListener("input", () => {
  confirmBtn.disabled = !dateInput.value;
});

confirmBtn.addEventListener("click", () => {
  if (locked) return;
  const spot = SPOTS[round];
  if (spot.type === "date") {
    if (!dateInput.value) return;
    locked = true;
    revealDate(spot);
  } else {
    if (!guessMarker) return;
    locked = true;
    revealMap(spot);
  }
});

function revealMap(spot) {
  const guess = guessMarker.getLatLng();
  const answer = L.latLng(spot.answer);
  const miles = guess.distanceTo(answer) / 1609.344;

  // reveal: real spot + dashed line + floating distance label
  const answerMarker = L.marker(answer, { icon: starIcon }).addTo(map);
  const line = L.polyline([guess, answer], {
    color: "#c9364d",
    weight: 2.5,
    dashArray: "6 8",
    opacity: 0.85,
  }).addTo(map);
  const mid = L.latLng((guess.lat + answer.lat) / 2, (guess.lng + answer.lng) / 2);
  const label = L.tooltip({ permanent: true, direction: "top", className: "distance-label", offset: [0, -4] })
    .setLatLng(mid)
    .setContent(formatDistance(miles));
  label.addTo(map);
  revealLayers = [answerMarker, line, label];

  const scope = SCOPES[spot.scope || "nyc"];
  showResult(`Your guess was ${formatDistance(miles)} away`, spot.name, spot.memory, geoScore(miles, scope.curve));

  // keep both pins clear of the score bar (top) and the result card (bottom)
  map.flyToBounds(L.latLngBounds([guess, answer]), {
    duration: 0.9,
    maxZoom: 15,
    paddingTopLeft: [40, 96],
    paddingBottomRight: [40, resultCard.offsetHeight + 76],
  });
}

function revealDate(spot) {
  const guessed = new Date(dateInput.value + "T00:00:00Z");
  const actual = new Date(spot.answerDate + "T00:00:00Z");
  const daysOff = Math.round(Math.abs(guessed - actual) / 86400000);

  const detail =
    daysOff === 0
      ? `${formatDate(actual)} — you nailed it`
      : `You guessed ${formatDate(guessed)} — off by ${daysOff} ${daysOff === 1 ? "day" : "days"}`;
  const nameLine = [spot.name, formatDate(actual)].filter(Boolean).join(" · ");
  showResult(detail, nameLine, spot.memory, dateScore(daysOff));
}

function showResult(detail, name, memory, points) {
  document.getElementById("result-headline").textContent = pickHeadline(points);
  document.getElementById("result-distance").textContent = detail;
  roundScoreNumEl.textContent = "0";

  const verdictCard = document.getElementById("verdict-card");
  verdictCard.classList.remove("tier-high", "tier-mid", "tier-low");
  verdictCard.classList.add(points >= 80 ? "tier-high" : points >= 50 ? "tier-mid" : "tier-low");

  const memoryBlock = document.querySelector(".memory");
  document.getElementById("memory-name").textContent = name;
  document.getElementById("memory-text").textContent = memory;
  memoryBlock.classList.toggle("hidden", !name && !memory);

  nextBtn.textContent = round + 1 < SPOTS.length ? "Next memory" : "See your award";
  promptCard.classList.add("hidden");
  resultCard.classList.remove("hidden");

  // let the card settle, then run the meter up
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prev = totalScore;
  totalScore += points;
  setTimeout(() => animateScore(prev, totalScore, points), reduce ? 0 : 260);
}

nextBtn.addEventListener("click", () => {
  if (round + 1 < SPOTS.length) {
    round++;
    startRound(round);
  } else {
    showAwards();
  }
});

// ---- awards ----
const awardsEl = document.getElementById("awards");
let confettiRaf = null;

function showAwards() {
  resultCard.classList.add("hidden");
  document.getElementById("award-score-num").textContent = totalScore;
  document.getElementById("award-score-max").textContent = MAX_SCORE;

  // Tiers scale with the round count: 80% = the old 400/500, 60% = 300/500.
  const pct = totalScore / MAX_SCORE;
  const headline =
    pct >= 0.8 ? "Master Mapper" :
    pct >= 0.6 ? "Passable, but you may need to go to graduate school in geography" :
    "Good thing you have a day job because you ain't doing so well on this";
  document.getElementById("award-headline").textContent = headline;

  const top = pct >= 0.8;
  document.getElementById("award-badge").classList.toggle("hidden", !top);
  document.getElementById("award-hamster").classList.toggle("hidden", !top);

  awardsEl.classList.remove("hidden");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (top && !reduce) startConfetti();
}

document.getElementById("replay-btn").addEventListener("click", () => {
  stopConfetti();
  awardsEl.classList.add("hidden");
  round = 0;
  startRound(0);
});

function startConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const COLORS = ["#c9364d", "#2f5539", "#9a7b4f", "#e0687c", "#f3d9dd"];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 1.6 + Math.random() * 2.6,
    vx: -0.8 + Math.random() * 1.6,
    rot: Math.random() * Math.PI,
    vr: -0.08 + Math.random() * 0.16,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.y += p.vy; p.x += p.vx; p.rot += p.vr;
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    confettiRaf = requestAnimationFrame(frame);
  }
  confettiRaf = requestAnimationFrame(frame);
}

function stopConfetti() {
  if (confettiRaf) cancelAnimationFrame(confettiRaf);
  confettiRaf = null;
}

function formatDistance(miles) {
  if (miles < 0.19) return `${Math.round(miles * 5280)} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles).toLocaleString()} mi`;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
}

startRound(0);
