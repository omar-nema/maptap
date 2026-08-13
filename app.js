// ---------------------------------------------------------------
// EDIT ME: the rounds, played in order.
//   type "map"  → { prompt, answer: [lat, lng], name, memory }
//   type "date" → { prompt, answerDate: "YYYY-MM-DD", name, memory }
// Coords: right-click a spot on Google Maps to copy them.
// name / memory are optional — leave "" to hide them on the reveal.
// ---------------------------------------------------------------
const SPOTS = [
  {
    type: "map",
    prompt: "Where did we have our first date?",
    answer: [40.7170168, -73.9499813],
    name: "Night of Joy",
    memory:
      "You were wearing a dress, I was wearing a short sleeve button up. We started by talking about midsommar, you were super cute and a lil shy.",
  },
  {
    type: "map",
    prompt: "Where were we on our third date?",
    answer: [40.7049167, -73.9279056],
    name: "Bunna Cafe",
    memory: "",
  },
  {
    type: "map",
    prompt: "Where did we watch our first movie together?",
    answer: [40.7159722, -73.962575],
    name: "Nitehawk Cinema",
    memory: "We watched Teenage Mutant Ninja Turtles.",
  },
  {
    type: "date",
    prompt: "When did we see Ramy together?",
    answerDate: "2023-12-08",
    name: "",
    memory: "",
  },
  {
    type: "date",
    prompt: "When was our first szechuan food together?",
    answerDate: "2024-02-29",
    name: "Antidote",
    memory: "",
  },
];

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

// Label-free tiles: geography without any names to hint from.
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  subdomains: "abcd",
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

let round = 0;
let guessMarker = null;
let revealLayers = [];
let locked = false;

function startRound(i) {
  const spot = SPOTS[i];
  document.getElementById("round-label").textContent = `Round ${i + 1} of ${SPOTS.length}`;
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
  showResult(verdict, `Your guess was ${formatDistance(miles)} away`, spot.name, spot.memory);

  // keep both pins clear of the result card, whatever its height
  map.flyToBounds(L.latLngBounds([guess, answer]), {
    duration: 0.9,
    maxZoom: 15,
    paddingTopLeft: [40, 70],
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
  showResult(verdict, detail, nameLine, spot.memory);
}

function showResult(verdict, detail, name, memory) {
  document.getElementById("result-eyebrow").textContent = verdict.eyebrow;
  document.getElementById("result-headline").textContent = verdict.headline;
  document.getElementById("result-distance").textContent = detail;

  const memoryBlock = document.querySelector(".memory");
  document.getElementById("memory-name").textContent = name;
  document.getElementById("memory-text").textContent = memory;
  memoryBlock.classList.toggle("hidden", !name && !memory);

  nextBtn.textContent = round + 1 < SPOTS.length ? "Next memory" : "Play again";
  promptCard.classList.add("hidden");
  resultCard.classList.remove("hidden");
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
