// The finale: submit the last round and instead of awards — blackout,
// the Vuk Vuk face flies around, "VUK VUK", then an Elite Beat
// Agents-style tap game over the first 45s of the song, fading out
// into the final score. Music + face are local-only assets; if they
// are missing (e.g. on the public site) we skip straight to awards.
(function () {
  const AUDIO_SRC = "assets/vukvuk.mp3";
  const FACE_SRC = "assets/vuk-face.jpg";
  const TITLE_AT = 1200;   // "VUK VUK" appears
  const GAME_AT = 4000;    // first circle
  const FADE_AT = 42000;   // audio fades over the final seconds
  const END_AT = 45000;    // hard end
  const DROP_AT = 28000;   // the song picks up — so do we
  // Measured from the track itself: 150 BPM, first beat at 367ms.
  // Every circle's ring LANDS on a beat.
  const BEAT = 400, BEAT0 = 367;
  const LAST_HIT = 42600;
  const APPROACH = 4 * BEAT, APPROACH_FAST = 3 * BEAT;
  const nextBeat = (ms) => BEAT0 + Math.ceil((ms - BEAT0) / BEAT) * BEAT;

  window.startVukVuk = function (onDone) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const audio = new Audio(AUDIO_SRC);
    audio.preload = "auto";

    let finished = false;
    let overlay = null;
    const timers = [];
    let rafId = null;

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      if (rafId) cancelAnimationFrame(rafId);
      try { audio.pause(); } catch (e) {}
      if (overlay) {
        overlay.classList.add("vuk-leaving");
        setTimeout(() => overlay.remove(), 650);
      }
      onDone();
    }

    // No song, no show — skip straight to awards.
    audio.addEventListener("error", finish);
    const playAttempt = audio.play();
    if (playAttempt && playAttempt.catch) playAttempt.catch(() => finish());

    // ---- overlay ----
    overlay = document.createElement("div");
    overlay.id = "vuk";
    overlay.innerHTML = `
      <img class="vuk-face" src="${FACE_SRC}" alt="">
      <h1 class="vuk-title hidden">VUK&nbsp;VUK</h1>
      <p class="vuk-audio-hint hidden">turn audio on \u{1F50A}</p>
      <p class="vuk-instruction hidden">Line up the circles</p>
      <div class="vuk-field"></div>
      <div class="vuk-combo" aria-live="polite"></div>
      <button class="vuk-skip">skip</button>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector(".vuk-skip").addEventListener("click", finish);

    const face = overlay.querySelector(".vuk-face");
    const title = overlay.querySelector(".vuk-title");
    const field = overlay.querySelector(".vuk-field");
    const comboEl = overlay.querySelector(".vuk-combo");

    // ---- flying face (DVD-logo chaos with spin) ----
    let exploding = false;
    let fx = 40, fy = 120, fvx = 7, fvy = 5.4, frot = 0;
    function flyFace() {
      if (finished || exploding) return;
      const fw = face.clientWidth || 120, fh = face.clientHeight || 172;
      const W = overlay.clientWidth, H = overlay.clientHeight;
      fx += fvx; fy += fvy; frot += 3.2;
      if (fx < 0 || fx > W - fw) { fvx *= -1; fx = Math.max(0, Math.min(fx, W - fw)); }
      if (fy < 0 || fy > H - fh) { fvy *= -1; fy = Math.max(0, Math.min(fy, H - fh)); }
      face.style.transform = `translate(${fx}px, ${fy}px) rotate(${frot}deg)`;
      rafId = requestAnimationFrame(flyFace);
    }
    if (!reduce) rafId = requestAnimationFrame(flyFace);
    else face.style.transform = "translate(30px, 90px)";

    // ---- timeline ----
    const audioHint = overlay.querySelector(".vuk-audio-hint");
    timers.push(setTimeout(() => {
      title.classList.remove("hidden");
      audioHint.classList.remove("hidden");
    }, TITLE_AT));
    timers.push(setTimeout(() => audioHint.classList.add("vuk-fade"), TITLE_AT + 2000));
    timers.push(setTimeout(() => audioHint.remove(), TITLE_AT + 3000));
    const instruction = overlay.querySelector(".vuk-instruction");
    timers.push(setTimeout(() => {
      title.classList.add("hidden");
      face.classList.add("vuk-face-dim"); // fade back for gameplay
      instruction.classList.remove("hidden");
    }, GAME_AT - 200));
    timers.push(setTimeout(() => instruction.classList.add("vuk-fade"), GAME_AT + 4800));
    timers.push(setTimeout(() => instruction.remove(), GAME_AT + 5900));

    // ---- EBA-style circles ----
    let hits = 0, total = 0, combo = 0;
    const active = []; // live circles, so new ones keep their distance
    function spawnCircle(approach) {
      if (finished) return;
      total++;
      const W = overlay.clientWidth, H = overlay.clientHeight;
      // pick the candidate furthest from live circles; accept early if clear
      let x, y, bestD = -1;
      for (let i = 0; i < 14; i++) {
        const cx = W * (0.14 + Math.random() * 0.72);
        const cy = H * (0.2 + Math.random() * 0.55);
        let dmin = Infinity;
        for (const a of active) dmin = Math.min(dmin, Math.hypot(cx - a.x, cy - a.y));
        if (dmin > bestD) { bestD = dmin; x = cx; y = cy; }
        if (dmin >= 130) break;
      }
      const pos = { x, y };
      active.push(pos);
      const el = document.createElement("div");
      el.className = "vuk-circle";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.innerHTML = `<div class="vuk-ring"></div>`;
      el.querySelector(".vuk-ring").style.animationDuration = `${approach}ms`;
      field.appendChild(el);

      const hitTime = performance.now() + approach;
      let judged = false;

      function judge(label, ok) {
        if (judged) return;
        judged = true;
        active.splice(active.indexOf(pos), 1);
        combo = ok ? combo + 1 : 0;
        if (ok) hits++;
        comboEl.textContent = combo >= 2 ? `${combo}x` : "";
        if (ok) {
          const rip = document.createElement("div");
          rip.className = "vuk-ripple";
          rip.style.left = el.style.left;
          rip.style.top = el.style.top;
          field.appendChild(rip);
          setTimeout(() => rip.remove(), 560);
        }
        const splash = document.createElement("div");
        splash.className = `vuk-splash ${ok ? "ok" : "bad"}`;
        splash.textContent = label;
        splash.style.left = el.style.left;
        splash.style.top = el.style.top;
        field.appendChild(splash);
        setTimeout(() => splash.remove(), 600);
        el.remove();
      }

      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const d = Math.abs(performance.now() - hitTime);
        if (d <= 150) judge("PERFECT", true);
        else if (d <= 320) judge("GOOD", true);
        else judge("EARLY", false);
      });
      timers.push(setTimeout(() => judge("✗", false), approach + 320));
    }

    // schedule by LANDING time, quantized to the beat grid:
    // cruise = a hit every 3 beats; after the drop every 2 beats, with
    // every 4th hit followed by a double on the beat between.
    // Anchored to the moment the audio actually starts, so the grid
    // stays glued to the song.
    let timelineArmed = false;
    function armTimeline() {
      if (timelineArmed || finished) return;
      timelineArmed = true;
      const scheduleHit = (hitT, approach) =>
        timers.push(setTimeout(() => spawnCircle(approach), hitT - approach));
      for (let h = nextBeat(GAME_AT + APPROACH); h < DROP_AT; h += 3 * BEAT) {
        scheduleHit(h, APPROACH);
      }
      let n = 0;
      for (let h = nextBeat(DROP_AT); h <= LAST_HIT; h += 2 * BEAT) {
        scheduleHit(h, APPROACH_FAST);
        if (++n % 4 === 0 && h + BEAT <= LAST_HIT) scheduleHit(h + BEAT, APPROACH_FAST);
      }
      timers.push(setTimeout(() => {
        // ~4s fade: silent right as the shards fly
        const fadeTick = setInterval(() => {
          audio.volume = Math.max(0, audio.volume - 0.025);
          if (audio.volume <= 0) clearInterval(fadeTick);
        }, 100);
        timers.push(fadeTick);
      }, FADE_AT));
      timers.push(setTimeout(explodeFinale, END_AT));
    }
    audio.addEventListener("playing", armTimeline, { once: true });
    timers.push(setTimeout(armTimeline, 2000)); // safety net

    // the face takes center stage and explodes, then the score
    function explodeFinale() {
      if (finished || exploding) return;
      exploding = true;
      field.innerHTML = "";
      comboEl.textContent = "";
      face.classList.remove("vuk-face-dim");
      const W = overlay.clientWidth, H = overlay.clientHeight;
      const cx = W / 2 - (face.clientWidth || 120) / 2;
      const cy = H / 2 - (face.clientHeight || 172) / 2;
      face.style.transition = "transform 0.85s cubic-bezier(0.3, 0.7, 0.3, 1)";
      face.style.transform = `translate(${cx}px, ${cy}px) rotate(${frot + 360}deg) scale(1.9)`;
      timers.push(setTimeout(() => {
        face.style.transition = "transform 0.18s ease-in, opacity 0.18s ease-in";
        face.style.transform = `translate(${cx}px, ${cy}px) rotate(${frot + 400}deg) scale(3.4)`;
        face.style.opacity = "0";
        const colors = ["#e8332a", "#ffd94d", "#ffffff", "#2447d6", "#e78fb3"];
        for (let i = 0; i < 26; i++) {
          const p = document.createElement("div");
          p.className = "vuk-shard";
          p.style.background = colors[i % colors.length];
          p.style.left = `${W / 2}px`;
          p.style.top = `${H / 2}px`;
          overlay.appendChild(p);
          const ang = (i / 26) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 130 + Math.random() * Math.max(W, H) * 0.5;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            p.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) rotate(${Math.random() * 720 - 360}deg)`;
            p.style.opacity = "0";
          }));
        }
        timers.push(setTimeout(finish, 950));
      }, 950));
    }
  };

  // ?vuk in the URL jumps straight to the finale (tap first — browsers
  // refuse to start audio without a user gesture).
  if (new URLSearchParams(location.search).has("vuk")) {
    document.getElementById("intro")?.remove();
    const gate = document.createElement("div");
    gate.id = "vuk-gate";
    gate.innerHTML = "<span>tap to vuk</span>";
    document.body.appendChild(gate);
    gate.addEventListener("pointerdown", () => {
      gate.remove();
      window.startVukVuk(window.showAwards);
    }, { once: true });
  }
})();
