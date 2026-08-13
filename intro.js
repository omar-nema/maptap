// Intro: a globe wrapped in our photo. Spin it, zoom it, then Start
// Journey explodes it into shards and reveals the game underneath.
(function () {
  const overlay = document.getElementById("intro");
  const canvas = document.getElementById("globe-canvas");
  const startBtn = document.getElementById("start-btn");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!window.THREE || !window.WebGLRenderingContext) {
    overlay.remove(); // no WebGL — go straight to the game
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 3.2);

  scene.add(new THREE.AmbientLight(0xfff6ea, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(2, 1.5, 2.5);
  scene.add(sun);

  const texture = new THREE.TextureLoader().load("assets/us.jpg", () => {
    overlay.classList.add("ready");
  });

  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0 });
  const RADIUS = 1.15;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 96, 64), material);
  globe.rotation.y = Math.PI; // photo center (the two of us) faces the camera first
  scene.add(globe);

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.zoomSpeed = 0.6;

  // Distance at which the whole globe fits with breathing room,
  // whatever the viewport aspect (narrow phones included).
  function fitDistance() {
    const tan = Math.tan((camera.fov / 2) * (Math.PI / 180));
    const limit = tan * Math.min(camera.aspect, 1);
    return RADIUS / (0.67 * limit);
  }

  let userZoomed = false;
  canvas.addEventListener("wheel", () => { userZoomed = true; }, { passive: true });
  canvas.addEventListener("touchstart", (e) => { if (e.touches.length > 1) userZoomed = true; }, { passive: true });

  function resize() {
    const w = overlay.clientWidth, h = overlay.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fit = fitDistance();
    controls.minDistance = fit * 0.55;
    controls.maxDistance = fit * 1.9;
    if (!userZoomed) {
      const dir = camera.position.clone().normalize();
      camera.position.copy(dir.multiplyScalar(fit));
    }
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- explosion state ----
  let exploding = null; // { t0, positions, base, dirs, spins }
  let done = false;

  function buildShards() {
    // swap in a chunkier sphere so the shards read as pieces
    const geo = new THREE.SphereGeometry(RADIUS, 40, 28).toNonIndexed();
    const pos = geo.attributes.position;
    const base = pos.array.slice();
    const faceCount = pos.count / 3;
    const dirs = new Float32Array(faceCount * 3);
    const spins = new Float32Array(faceCount);
    const c = new THREE.Vector3();
    for (let f = 0; f < faceCount; f++) {
      c.set(0, 0, 0);
      for (let v = 0; v < 3; v++) {
        c.x += base[(f * 3 + v) * 3];
        c.y += base[(f * 3 + v) * 3 + 1];
        c.z += base[(f * 3 + v) * 3 + 2];
      }
      c.divideScalar(3).normalize();
      dirs[f * 3] = c.x; dirs[f * 3 + 1] = c.y; dirs[f * 3 + 2] = c.z;
      spins[f] = 1.4 + Math.random() * 2.6;
    }
    globe.geometry.dispose();
    globe.geometry = geo;
    material.transparent = true;
    return { t0: performance.now(), positions: pos, base, dirs, spins };
  }

  function stepExplosion(now) {
    const DURATION = 950;
    const p = Math.min((now - exploding.t0) / DURATION, 1);
    const e = p * p * (3 - 2 * p); // smoothstep
    const fly = e * e * 3.6;

    const { positions, base, dirs, spins } = exploding;
    const arr = positions.array;
    const faceCount = positions.count / 3;
    for (let f = 0; f < faceCount; f++) {
      const dx = dirs[f * 3] * fly * spins[f];
      const dy = dirs[f * 3 + 1] * fly * spins[f];
      const dz = dirs[f * 3 + 2] * fly * spins[f];
      // shrink each shard toward its centroid as it flies
      let cx = 0, cy = 0, cz = 0;
      for (let v = 0; v < 3; v++) {
        cx += base[(f * 3 + v) * 3];
        cy += base[(f * 3 + v) * 3 + 1];
        cz += base[(f * 3 + v) * 3 + 2];
      }
      cx /= 3; cy /= 3; cz /= 3;
      const shrink = 1 - e * 0.85;
      for (let v = 0; v < 3; v++) {
        const i = (f * 3 + v) * 3;
        arr[i] = cx + (base[i] - cx) * shrink + dx;
        arr[i + 1] = cy + (base[i + 1] - cy) * shrink + dy;
        arr[i + 2] = cz + (base[i + 2] - cz) * shrink + dz;
      }
    }
    positions.needsUpdate = true;
    globe.rotation.y += 0.012;
    material.opacity = 1 - e;
    camera.position.z += (2.15 - camera.position.z) * 0.04;
    if (p >= 1) finish();
  }

  function finish() {
    if (done) return;
    done = true;
    overlay.classList.add("leaving");
    setTimeout(() => {
      overlay.remove();
      renderer.dispose();
    }, 550);
  }

  startBtn.addEventListener("click", () => {
    if (exploding || done) return;
    startBtn.disabled = true;
    overlay.classList.add("started");
    if (reduceMotion) { finish(); return; }
    controls.autoRotate = false;
    controls.enabled = false;
    exploding = buildShards();
  });

  function loop(now) {
    if (done) return;
    if (exploding) stepExplosion(now);
    else controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
