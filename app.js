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
  "W3sidHlwZSI6Im1hcCIsInByb21wdCI6IldoZXJlIGRpZCB3ZSBoYXZlIG91ciBmaXJzdCBkYXRlPyIsImFuc3dlciI6WzQwLjcxNzAxNjgsLTczLjk0OTk4MTNdLCJuYW1lIjoiTmlnaHQgb2YgSm95IiwibWVtb3J5IjoiWW91IHdlcmUgd2VhcmluZyBhIGRyZXNzLCBJIHdhcyB3ZWFyaW5nIGEgc2hvcnQgc2xlZXZlIGJ1dHRvbiB1cC4gV2Ugc3RhcnRlZCBieSB0YWxraW5nIGFib3V0IG1pZHNvbW1hciwgeW91IHdlcmUgc3VwZXIgY3V0ZSBhbmQgYSBsaWwgc2h5LiJ9LHsidHlwZSI6Im1hcCIsInByb21wdCI6IldoZXJlIHdlcmUgd2Ugb24gb3VyIHRoaXJkIGRhdGU/IiwiYW5zd2VyIjpbNDAuNzA0OTE2NywtNzMuOTI3OTA1Nl0sIm5hbWUiOiJCdW5uYSBDYWZlIiwibWVtb3J5IjoiIn0seyJ0eXBlIjoibWFwIiwicHJvbXB0IjoiV2hlcmUgZGlkIHdlIHdhdGNoIG91ciBmaXJzdCBtb3ZpZSB0b2dldGhlcj8iLCJhbnN3ZXIiOls0MC43MTU5NzIyLC03My45NjI1NzVdLCJuYW1lIjoiTml0ZWhhd2sgQ2luZW1hIiwibWVtb3J5IjoiV2Ugd2F0Y2hlZCBUZWVuYWdlIE11dGFudCBOaW5qYSBUdXJ0bGVzLiJ9LHsidHlwZSI6ImRhdGUiLCJwcm9tcHQiOiJXaGVuIGRpZCB3ZSBzZWUgUmFteSB0b2dldGhlcj8iLCJhbnN3ZXJEYXRlIjoiMjAyMy0xMi0wOCIsIm5hbWUiOiIiLCJtZW1vcnkiOiIifSx7InR5cGUiOiJkYXRlIiwicHJvbXB0IjoiV2hlbiB3YXMgb3VyIGZpcnN0IHN6ZWNodWFuIGZvb2QgdG9nZXRoZXI/IiwiYW5zd2VyRGF0ZSI6IjIwMjQtMDItMjkiLCJuYW1lIjoiQW50aWRvdGUiLCJtZW1vcnkiOiIifV0=";

const SPOTS = JSON.parse(decodeURIComponent(escape(atob(SPOTS_ENCODED))));

// Verdicts by how close the guess landed.
const MAP_VERDICTS = [
  { under: 0.1, headline: "You know us by heart.", eyebrow: "Perfect" },
  { under: 0.5, headline: "So close I can feel it.", eyebrow: "Almost" },
  { under: 2, headline: "Warm... but wander closer.", eyebrow: "Not quite" },
  { under: Infinity, headline: "Wrong borough of my heart!", eyebrow: "Way off" },
];

const DATE_VERDICTS = [
  { under: 1, headline: "Right on the day. How?!", eyebrow: "Perfect" },
  { under: 8, headline: "Off by a whisper.", eyebrow: "So close" },
  { under: 31, headline: "Right season, wrong week.", eyebrow: "Almost" },
  { under: 91, headline: "Getting warmer...", eyebrow: "Not quite" },
  { under: Infinity, headline: "We clearly need a rewatch.", eyebrow: "Way off" },
];

// ---- map setup: NYC only, no place names ----
const NYC_CENTER = [40.7328, -73.986];
const NYC_BOUNDS = L.latLngBounds([40.49, -74.28], [40.93, -73.68]);

const map = L.map("map", {
  center: NYC_CENTER,
  zoom: 13,
  minZoom: 11,
  maxZoom: 17,
  maxBounds: NYC_BOUNDS,
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

// Points per round, out of 100. Anchored to the distances you gave:
// 0.5 mi = 100, 1 mi = 80, 2 mi = 50, fading to 0 by 3.5 mi.
function geoScore(miles) {
  let p;
  if (miles <= 0.5) p = 100;
  else if (miles <= 1) p = 100 - ((miles - 0.5) / 0.5) * 20;
  else if (miles <= 2) p = 80 - (miles - 1) * 30;
  else if (miles <= 3.5) p = 50 - ((miles - 2) / 1.5) * 50;
  else p = 0;
  return Math.max(0, Math.round(p));
}

// Same shape for dates: exact = 100, 7 days = 80, 30 days = 50, 0 by 90 days.
function dateScore(daysOff) {
  let p;
  if (daysOff <= 0) p = 100;
  else if (daysOff <= 7) p = 100 - (daysOff / 7) * 20;
  else if (daysOff <= 30) p = 80 - ((daysOff - 7) / 23) * 30;
  else if (daysOff <= 90) p = 50 - ((daysOff - 30) / 60) * 50;
  else p = 0;
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
  map.flyTo(NYC_CENTER, 13, { duration: 0.8 });
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

  const verdict = MAP_VERDICTS.find((v) => miles < v.under);
  showResult(verdict, `Your guess was ${formatDistance(miles)} away`, spot.name, spot.memory, geoScore(miles));

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

  const verdict = DATE_VERDICTS.find((v) => daysOff < v.under);
  const detail =
    daysOff === 0
      ? `${formatDate(actual)} — you nailed it`
      : `You guessed ${formatDate(guessed)} — off by ${daysOff} ${daysOff === 1 ? "day" : "days"}`;
  const nameLine = [spot.name, formatDate(actual)].filter(Boolean).join(" · ");
  showResult(verdict, detail, nameLine, spot.memory, dateScore(daysOff));
}

function showResult(verdict, detail, name, memory, points) {
  document.getElementById("result-eyebrow").textContent = verdict.eyebrow;
  document.getElementById("result-headline").textContent = verdict.headline;
  document.getElementById("result-distance").textContent = detail;
  roundScoreNumEl.textContent = "0";

  const memoryBlock = document.querySelector(".memory");
  document.getElementById("memory-name").textContent = name;
  document.getElementById("memory-text").textContent = memory;
  memoryBlock.classList.toggle("hidden", !name && !memory);

  nextBtn.textContent = round + 1 < SPOTS.length ? "Next memory" : "Play again";
  promptCard.classList.add("hidden");
  resultCard.classList.remove("hidden");

  // let the card settle, then run the meter up
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prev = totalScore;
  totalScore += points;
  setTimeout(() => animateScore(prev, totalScore, points), reduce ? 0 : 260);
}

nextBtn.addEventListener("click", () => {
  round = (round + 1) % SPOTS.length;
  startRound(round);
});

function formatDistance(miles) {
  if (miles < 0.19) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
}

startRound(0);
