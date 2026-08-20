/* ==========================================================================
 *  BIZZAPPS CITY  ·  interactive 3D portfolio  (three.js r128)
 *  A neon metropolis where every building is one business application.
 *  All content comes from src/data.js  (window.SHOWCASE).
 * ========================================================================== */
(function () {
  "use strict";

  const DATA = window.SHOWCASE;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- tiny deterministic PRNG so a given app always looks the same ---- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }
  const rand = (seed, a, b) => a + hash(seed) * (b - a);

  const districtById = {};
  DATA.districts.forEach((d) => (districtById[d.id] = d));

  /* ---------- DOM ---------- */
  const $ = (s) => document.querySelector(s);
  const canvas = $("#scene");
  const tagEl = $("#tag");
  const panel = $("#panel");

  /* =====================================================================
   *  WebGL support gate
   * =================================================================== */
  function webglOK() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  if (!webglOK()) { $("#nowebgl").classList.add("show"); return; }

  /* =====================================================================
   *  three.js core
   * =================================================================== */
  let scene, camera, renderer, composer, bloom, controls;
  let W = window.innerWidth, H = window.innerHeight;
  const clock = new THREE.Clock();
  const buildings = [];
  const flows = [];
  const texCache = {};

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null, selected = null, districtFilter = null;

  const BG = 0x05070f;

  // camera choreography
  let camTween = null;              // {fromP,toP,fromT,toT,t,dur,onDone}
  let defaultCamPos, defaultTarget, introStartPos;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.0075);

  camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 3000);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio = renderer.setPixelRatio || function () {};
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.maxPolarAngle = 1.45;          // stay above the ground
  controls.minPolarAngle = 0.15;
  controls.enablePan = false;
  controls.autoRotate = !REDUCED;
  controls.autoRotateSpeed = 0.28;

  /* ---- lights (dim; the city lights itself) ---- */
  scene.add(new THREE.HemisphereLight(0x2a4a80, 0x05070d, 0.55));
  const dir = new THREE.DirectionalLight(0x89b7ff, 0.45);
  dir.position.set(60, 120, 40);
  scene.add(dir);

  /* =====================================================================
   *  Ground + grid
   * =================================================================== */
  function buildGround() {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ color: 0x04060c, roughness: 1, metalness: 0 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.05;
    scene.add(plane);

    const grid = new THREE.GridHelper(1400, 140, 0x123246, 0x0c1c2b);
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    scene.add(grid);
  }

  /* =====================================================================
   *  Window emissive texture for a building facade
   * =================================================================== */
  function windowTexture(seedId, hex) {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#05070d";
    g.fillRect(0, 0, 64, 128);
    const cols = 6, rows = 12, mx = 7, my = 6;
    const cw = (64 - mx * 2) / cols, ch = (128 - my * 2) / rows;
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        n++;
        const lit = hash(seedId + ":" + n) < 0.5;
        if (!lit) { g.fillStyle = "rgba(120,150,200,0.05)"; }
        else {
          const a = 0.55 + hash(seedId + "a" + n) * 0.45;
          g.fillStyle = hexA(hex, a);
        }
        g.fillRect(mx + col * cw + 1, my + r * ch + 1, cw - 2, ch - 2);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(2) + ")";
  }

  /* =====================================================================
   *  Build the city
   * =================================================================== */
  function buildCity() {
    // group projects by district so neighbourhoods cluster together
    const order = DATA.districts.map((d) => d.id);
    const list = DATA.projects.slice().sort(
      (a, b) => order.indexOf(a.district) - order.indexOf(b.district)
    );

    const n = list.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const SP = 17;
    const offX = ((cols - 1) * SP) / 2;
    const offZ = ((rows - 1) * SP) / 2;

    list.forEach((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const jx = (hash(p.id + "x") - 0.5) * 4.5;
      const jz = (hash(p.id + "z") - 0.5) * 4.5;
      const x = col * SP - offX + jx;
      const z = row * SP - offZ + jz;

      const w = rand(p.id + "w", 6, 8.5);
      const d = rand(p.id + "d", 6, 8.5);
      const h = 5 + (p.impact / 100) * 40;

      const dCol = districtById[p.district].color;
      const colObj = new THREE.Color(dCol);

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // body
      const tex = windowTexture(p.id, dCol);
      tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(2, Math.round(h / 5)));
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x090d18, roughness: 0.5, metalness: 0.35,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
      body.position.y = h / 2;
      body.userData.idx = buildings.length;
      group.add(body);

      // glowing edges
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(body.geometry),
        new THREE.LineBasicMaterial({ color: colObj, transparent: true, opacity: 0.5 })
      );
      edges.position.copy(body.position);
      group.add(edges);

      // rooftop crown
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.42, 0.45, d * 0.42),
        new THREE.MeshBasicMaterial({ color: colObj, transparent: true, opacity: 1 })
      );
      crown.position.y = h + 0.22;
      group.add(crown);

      // beacon sprite (kept in the district colour, not blown to white)
      const beacon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowSprite(), color: colObj, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75,
      }));
      beacon.scale.set(2.2, 2.2, 1);
      beacon.position.y = h + 1.4;
      group.add(beacon);

      scene.add(group);

      buildings.push({
        idx: buildings.length, data: p, group, body, edges, crown, beacon,
        color: colObj, height: h, baseEm: 0.9,
        top: new THREE.Vector3(x, h + 3, z),
        center: new THREE.Vector3(x, h * 0.5, z),
      });
    });

    // city radius for camera framing
    const rad = Math.max(offX, offZ) + SP;
    defaultTarget = new THREE.Vector3(0, 9, 0);
    defaultCamPos = new THREE.Vector3(rad * 1.15, rad * 0.52, rad * 1.4);
    introStartPos = new THREE.Vector3(rad * 0.15, rad * 3.2, rad * 0.35);
  }

  /* radial glow sprite (shared) */
  let _glow = null;
  function glowSprite() {
    if (_glow) return _glow;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,0.85)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    _glow = new THREE.CanvasTexture(c);
    return _glow;
  }

  /* =====================================================================
   *  Data-flow arcs between apps
   * =================================================================== */
  function buildFlows() {
    let links = DATA.flows && DATA.flows.length ? DATA.flows.slice() : [];
    if (!links.length) {
      // auto: connect platform (data district) apps to everything else
      const hubs = buildings.filter((b) => b.data.district === "data");
      hubs.forEach((hub) => buildings.forEach((b) => {
        if (b !== hub) links.push([hub.data.id, b.data.id]);
      }));
    }
    const byId = {};
    buildings.forEach((b) => (byId[b.data.id] = b));

    links.forEach((pair) => {
      const a = byId[pair[0]], b = byId[pair[1]];
      if (!a || !b) return;
      const start = a.top.clone();
      const end = b.top.clone();
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.y += start.distanceTo(end) * 0.35 + 6;
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

      // faint guide line
      const pts = curve.getPoints(46);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: a.color, transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      scene.add(line);

      // travelling pulses
      const pulses = [];
      const count = 2;
      for (let k = 0; k < count; k++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowSprite(), color: a.color, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
        }));
        s.scale.set(2.2, 2.2, 1);
        scene.add(s);
        pulses.push({ sprite: s, offset: k / count });
      }

      flows.push({
        curve, line, pulses,
        aId: a.data.id, bId: b.data.id,
        speed: 0.06 + hash(pair.join("") ) * 0.05,
      });
    });
  }

  /* =====================================================================
   *  Ambient star field
   * =================================================================== */
  let starField;
  function buildStars() {
    const N = 1400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 300 + Math.random() * 500;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.5;
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r * 0.9 + 20;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starField = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x9fc4ff, size: 1.4, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(starField);
  }

  /* =====================================================================
   *  Post-processing (bloom)
   * =================================================================== */
  function buildComposer() {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.5, 0.2);
    composer.addPass(bloom);
  }

  /* =====================================================================
   *  Visual state resolver — one place decides how every building looks
   * =================================================================== */
  function applyStates() {
    buildings.forEach((b) => {
      let em = b.baseEm, edge = 0.5, beacon = 0.9;

      if (districtFilter && b.data.district !== districtFilter) { em = 0.1; edge = 0.06; beacon = 0.15; }

      if (selected !== null) {
        if (b.idx === selected) { em = 1.8; edge = 1.0; beacon = 1.0; }
        else { em *= 0.42; edge *= 0.5; beacon *= 0.4; }
      } else if (hovered !== null && b.idx === hovered) {
        em = 1.35; edge = 0.9; beacon = 1.0;
      }

      b.body.material.emissiveIntensity = em;
      b.edges.material.opacity = edge;
      b.beacon.material.opacity = beacon;
      b.crown.material.opacity = Math.min(1, beacon + 0.1);
    });

    // flows follow the selection / filter
    flows.forEach((f) => {
      let lit = 1;
      if (selected !== null) {
        const sel = buildings[selected].data.id;
        lit = (f.aId === sel || f.bId === sel) ? 1 : 0.12;
      } else if (districtFilter) {
        const da = districtById[byIdDistrict(f.aId)];
        const db = districtById[byIdDistrict(f.bId)];
        lit = (da.id === districtFilter || db.id === districtFilter) ? 1 : 0.12;
      }
      f.line.material.opacity = 0.16 * lit;
      f.pulses.forEach((p) => (p.sprite.material.opacity = 0.95 * lit));
    });
  }
  function byIdDistrict(id) {
    const b = buildings.find((x) => x.data.id === id);
    return b ? b.data.district : "data";
  }

  /* =====================================================================
   *  Camera moves
   * =================================================================== */
  function moveCamera(toP, toT, dur, onDone) {
    if (REDUCED) {
      camera.position.copy(toP); controls.target.copy(toT); controls.update();
      if (onDone) onDone(); return;
    }
    controls.enabled = false;
    camTween = { fromP: camera.position.clone(), toP: toP.clone(),
      fromT: controls.target.clone(), toT: toT.clone(), t: 0, dur, onDone };
  }
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function updateCamTween(dt) {
    if (!camTween) return;
    camTween.t = Math.min(1, camTween.t + dt / camTween.dur);
    const e = easeInOut(camTween.t);
    camera.position.lerpVectors(camTween.fromP, camTween.toP, e);
    controls.target.lerpVectors(camTween.fromT, camTween.toT, e);
    controls.update();
    if (camTween.t >= 1) {
      const done = camTween.onDone; camTween = null;
      controls.enabled = true;
      if (done) done();
    }
  }

  /* =====================================================================
   *  Selection + panel
   * =================================================================== */
  function selectBuilding(idx) {
    selected = idx;
    controls.autoRotate = false;
    applyStates();
    hideTag();

    const b = buildings[idx];
    // frame the building: back off along current view direction, lifted
    const target = b.center.clone();
    const away = new THREE.Vector3().subVectors(camera.position, target).setY(0);
    if (away.lengthSq() < 1) away.set(1, 0, 1);
    away.normalize();
    const dist = 26 + b.height * 0.9;
    const camPos = target.clone()
      .add(away.multiplyScalar(dist))
      .add(new THREE.Vector3(0, b.height * 0.7 + 12, 0));
    moveCamera(camPos, b.center.clone().setY(b.height * 0.45), 1.1);

    fillPanel(b.data);
    panel.classList.add("open");
  }

  function fillPanel(p) {
    const dist = districtById[p.district];
    panel.querySelector(".p-district").innerHTML =
      '<span class="dot" style="color:' + dist.color + '"></span>' + dist.name;
    panel.querySelector(".p-district").style.color = dist.color;
    panel.querySelector("h2").textContent = p.name;
    panel.querySelector(".p-client").textContent = p.client;
    panel.querySelector(".p-year").textContent = p.year || "";
    panel.querySelector(".p-summary").textContent = p.summary;

    // metrics
    const mWrap = panel.querySelector(".p-metrics");
    mWrap.innerHTML = "";
    p.metrics.forEach((m) => {
      const cell = document.createElement("div");
      cell.className = "p-metric";
      const val = document.createElement("div");
      const neg = m.value < 0;
      val.className = "mv " + (neg ? "neg" : "pos");
      const lbl = document.createElement("div");
      lbl.className = "ml"; lbl.textContent = m.label;
      cell.appendChild(val); cell.appendChild(lbl);
      mWrap.appendChild(cell);
      countUp(val, m.value, m.suffix || "");
    });

    // features
    const cWrap = panel.querySelector(".p-chips");
    cWrap.innerHTML = "";
    (p.features || []).forEach((f) => {
      const chip = document.createElement("span");
      chip.className = "p-chip"; chip.textContent = f;
      cWrap.appendChild(chip);
    });

    // connections
    const connected = [];
    flows.forEach((f) => {
      if (f.aId === p.id) connected.push(f.bId);
      if (f.bId === p.id) connected.push(f.aId);
    });
    const lWrap = panel.querySelector(".p-links");
    const lSection = panel.querySelector(".p-links-section");
    lWrap.innerHTML = "";
    const uniq = [...new Set(connected)];
    if (uniq.length) {
      lSection.style.display = "";
      uniq.forEach((id) => {
        const b = buildings.find((x) => x.data.id === id);
        if (!b) return;
        const btn = document.createElement("button");
        btn.className = "p-link";
        btn.innerHTML = '<span class="arrow">&rarr;</span>' + b.data.name;
        btn.addEventListener("click", () => selectBuilding(b.idx));
        lWrap.appendChild(btn);
      });
    } else {
      lSection.style.display = "none";
    }
  }

  function closePanel() {
    panel.classList.remove("open");
    selected = null;
    districtFilter = null;
    document.querySelectorAll(".dchip").forEach((c) => c.classList.remove("active", "dim"));
    applyStates();
    controls.autoRotate = !REDUCED;
    moveCamera(defaultCamPos, defaultTarget, 1.2);
  }

  /* number count-up */
  function countUp(el, to, suffix) {
    const s = String(to);
    const dot = s.indexOf(".");
    const dec = dot < 0 ? 0 : s.length - dot - 1;
    const fmt = (v) => {
      const neg = v < 0;
      let out = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return (neg ? "-" : "") + out;
    };
    const render = (v) => { el.innerHTML = fmt(v) + '<span class="suf">' + suffix + "</span>"; };
    if (REDUCED) { render(to); return; }
    const dur = 900, t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      render(to * e);
      if (t < 1) requestAnimationFrame(step);
      else render(to);
    }
    requestAnimationFrame(step);
  }

  /* =====================================================================
   *  Pointer interaction (hover + click, drag-aware)
   * =================================================================== */
  let downX = 0, downY = 0, downT = 0, moved = false;

  function setPointer(e) {
    pointer.x = (e.clientX / W) * 2 - 1;
    pointer.y = -(e.clientY / H) * 2 + 1;
  }
  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(buildings.map((b) => b.body), false);
    return hits.length ? hits[0].object.userData.idx : null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    downX = e.clientX; downY = e.clientY; downT = performance.now(); moved = false;
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", (e) => {
    setPointer(e);
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;

    if (camTween) return;
    const idx = pick();
    if (idx !== hovered) {
      hovered = idx;
      canvas.classList.toggle("hovering", idx !== null);
      applyStates();
    }
    if (idx !== null && idx !== selected) showTag(buildings[idx]);
    else hideTag();
  });
  window.addEventListener("pointerup", () => {
    canvas.classList.remove("dragging");
  });
  canvas.addEventListener("click", (e) => {
    if (moved || performance.now() - downT > 350) return; // was a drag
    setPointer(e);
    const idx = pick();
    if (idx !== null) selectBuilding(idx);
  });

  function showTag(b) {
    const v = b.top.clone().project(camera);
    if (v.z > 1) { hideTag(); return; }
    tagEl.style.left = (v.x * 0.5 + 0.5) * W + "px";
    tagEl.style.top = (-v.y * 0.5 + 0.5) * H + "px";
    tagEl.innerHTML = b.data.name + '<span class="tclient">' + b.data.client + "</span>";
    tagEl.classList.add("show");
  }
  function hideTag() { tagEl.classList.remove("show"); }

  /* =====================================================================
   *  Build the interface chrome from data
   * =================================================================== */
  function buildChrome() {
    // brand
    $("#brand .name").firstChild.textContent = DATA.brand.name;

    // aggregate stats -> HUD + intro
    const statHTML = (s) =>
      '<div class="n tnum">' + s.value.toLocaleString("en-US") +
      '<span class="suf">' + (s.suffix || "") + '</span></div>' +
      '<div class="l">' + s.label + "</div>";
    const hud = $("#hud");
    DATA.aggregate.forEach((s) => {
      const el = document.createElement("div"); el.className = "stat"; el.innerHTML = statHTML(s);
      hud.appendChild(el);
    });
    const iStats = $("#intro .intro-stats");
    DATA.aggregate.forEach((s) => {
      const el = document.createElement("div"); el.className = "s";
      el.innerHTML =
        '<div class="n tnum">' + s.value.toLocaleString("en-US") +
        '<span class="suf">' + (s.suffix || "") + "</span></div><div class=\"l\">" + s.label + "</div>";
      iStats.appendChild(el);
    });

    // legend / district chips
    const legend = $("#legend");
    DATA.districts.forEach((d) => {
      const chip = document.createElement("div");
      chip.className = "dchip";
      chip.innerHTML = '<span class="dot" style="color:' + d.color + '"></span>' + d.name;
      chip.addEventListener("click", () => toggleDistrict(d.id, chip));
      legend.appendChild(chip);
    });
  }

  function toggleDistrict(id, chip) {
    if (selected !== null) closePanelSoft();
    const chips = document.querySelectorAll(".dchip");
    if (districtFilter === id) {
      districtFilter = null;
      chips.forEach((c) => c.classList.remove("active", "dim"));
    } else {
      districtFilter = id;
      chips.forEach((c) => { c.classList.remove("active"); c.classList.add("dim"); });
      chip.classList.add("active"); chip.classList.remove("dim");
    }
    applyStates();
  }
  function closePanelSoft() {
    panel.classList.remove("open");
    selected = null;
    controls.autoRotate = !REDUCED;
  }

  /* =====================================================================
   *  Animation loop
   * =================================================================== */
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    updateCamTween(dt);

    // flow pulses
    if (!REDUCED) {
      flows.forEach((f) => {
        f.pulses.forEach((p) => {
          const u = (t * f.speed + p.offset) % 1;
          f.curve.getPointAt(u, p.sprite.position);
          const fade = Math.sin(u * Math.PI);          // dim at the ends
          p.sprite.material.opacity = (0.25 + 0.7 * fade) *
            (f.line.material.opacity / 0.16);
        });
      });
      // gentle beacon pulse
      buildings.forEach((b, i) => {
        const s = 3 + Math.sin(t * 2 + i) * 0.5;
        b.beacon.scale.set(s, s, 1);
      });
      if (starField) starField.rotation.y += dt * 0.01;
    }

    // keep hover tag glued to its building while orbiting
    if (hovered !== null && selected === null && !camTween) showTag(buildings[hovered]);

    controls.update();
    composer.render();
  }

  /* =====================================================================
   *  Resize
   * =================================================================== */
  function onResize() {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    composer.setSize(W, H);
    bloom.setSize(W, H);
  }
  window.addEventListener("resize", onResize);

  /* =====================================================================
   *  Intro sequence
   * =================================================================== */
  function reveal() {
    ["#brand", "#hud", "#legend", "#hint", "#reset"].forEach((s) => $(s).classList.add("in"));
  }

  function enterCity() {
    const intro = $("#intro");
    intro.classList.add("gone");
    setTimeout(() => (intro.style.display = "none"), 900);

    // fly in from high above down to the resting overview
    camera.position.copy(introStartPos);
    controls.target.copy(defaultTarget);
    controls.update();
    if (REDUCED) {
      camera.position.copy(defaultCamPos); controls.update(); reveal();
    } else {
      moveCamera(defaultCamPos, defaultTarget, 3.4, reveal);
    }
  }

  /* =====================================================================
   *  Boot
   * =================================================================== */
  function boot() {
    buildGround();
    buildCity();
    buildFlows();
    buildStars();
    buildComposer();
    buildChrome();
    applyStates();

    // park camera on the intro vantage until the user enters
    camera.position.copy(introStartPos);
    controls.target.copy(defaultTarget);
    controls.update();

    // wire controls
    $("#enter").addEventListener("click", enterCity);
    $("#panel .p-close").addEventListener("click", closePanel);
    $("#reset").addEventListener("click", closePanel);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

    // fill the intro progress bar, then let them in
    const bar = $("#intro .bar span");
    let prog = 0;
    const tick = setInterval(() => {
      prog = Math.min(100, prog + 12 + Math.random() * 20);
      bar.style.width = prog + "%";
      if (prog >= 100) {
        clearInterval(tick);
        $("#intro .loading").textContent = "Ready";
        $("#enter").style.display = "";
      }
    }, 120);

    animate();

    // small public API — handy for driving the demo from a remote/clicker,
    // embedding, or automated checks.
    window.BizzappsCity = {
      enter: enterCity,
      reset: closePanel,
      count: () => buildings.length,
      select: (ref) => {
        const b = typeof ref === "number" ? buildings[ref]
          : buildings.find((x) => x.data.id === ref);
        if (b) selectBuilding(b.idx);
      },
      district: (id) => {
        const chip = [...document.querySelectorAll(".dchip")]
          .find((c) => c.textContent.includes(districtById[id] ? districtById[id].name : "__"));
        if (chip) toggleDistrict(id, chip);
      },
      screenOf: (idx) => {
        const v = buildings[idx].center.clone().project(camera);
        return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: v.z > 1 };
      },
    };
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
