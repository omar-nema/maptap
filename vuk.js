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
  const LAST_SPAWN = 41500;
  const FADE_AT = 40000;   // audio fade starts
  const END_AT = 45000;    // hard end
  const DROP_AT = 28000;   // the song picks up — so do we
  const SPAWN_EVERY = 1250, SPAWN_FAST = 700;
  const APPROACH = 1600, APPROACH_FAST = 1150;

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
    let fx = 40, fy = 120, fvx = 7, fvy = 5.4, frot = 0;
    function flyFace() {
      if (finished) return;
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
    timers.push(setTimeout(() => title.classList.remove("hidden"), TITLE_AT));
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
    function spawnCircle(approach) {
      if (finished) return;
      total++;
      const W = overlay.clientWidth, H = overlay.clientHeight;
      const x = W * (0.14 + Math.random() * 0.72);
      const y = H * (0.2 + Math.random() * 0.55);
      const el = document.createElement("div");
      el.className = "vuk-circle";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.innerHTML = `<div class="vuk-ring"></div><span>${((total - 1) % 4) + 1}</span>`;
      el.querySelector(".vuk-ring").style.animationDuration = `${approach}ms`;
      field.appendChild(el);

      const hitTime = performance.now() + approach;
      let judged = false;

      function judge(label, ok) {
        if (judged) return;
        judged = true;
        combo = ok ? combo + 1 : 0;
        if (ok) hits++;
        comboEl.textContent = combo >= 2 ? `${combo}x` : "";
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

    // cruise until the drop, then faster rings, denser spawns, doubles
    for (let t = GAME_AT; t < DROP_AT; t += SPAWN_EVERY) {
      timers.push(setTimeout(() => spawnCircle(APPROACH), t));
    }
    let n = 0;
    for (let t = DROP_AT; t <= LAST_SPAWN; t += SPAWN_FAST) {
      timers.push(setTimeout(() => spawnCircle(APPROACH_FAST), t));
      if (++n % 4 === 0) timers.push(setTimeout(() => spawnCircle(APPROACH_FAST), t + 200));
    }

    // ---- fade out and end ----
    timers.push(setTimeout(() => {
      const fadeTick = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - 0.022);
        if (audio.volume <= 0) clearInterval(fadeTick);
      }, 100);
      timers.push(fadeTick);
    }, FADE_AT));
    timers.push(setTimeout(finish, END_AT));
  };
})();
