/* =====================================================================
   INDRA — Hero 3D : un véhicule hors d'usage en nuage de points qui se
   déconstruit, au défilement, en ses 6 familles de matières.
   Three.js r128 (global THREE). Fallback : rien (le hero reste lisible).
   ===================================================================== */
(function () {
  'use strict';
  window.INDRA = window.INDRA || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  // Composition massique d'un véhicule récent (analyse Re-source, indra.fr)
  const CATS = [
    { key: 'metaux', label: 'Métaux', pct: 75.6, color: [0.72, 0.78, 0.82] },
    { key: 'polymeres', label: 'Polymères', pct: 14.3, color: [0.63, 0.75, 0.22] },
    { key: 'elastomeres', label: 'Élastomères', pct: 4.2, color: [0.36, 0.4, 0.42] },
    { key: 'fluides', label: 'Fluides', pct: 2.3, color: [0.94, 0.63, 0.19] },
    { key: 'verre', label: 'Verres', pct: 2.1, color: [0.5, 0.83, 0.91] },
    { key: 'autres', label: 'Naturels & autres', pct: 1.4, color: [0.62, 0.6, 0.5] }
  ];

  // Profil latéral d'une berline compacte (x : -2.3 → 2.3 ; y : 0 → 1.45)
  const BODY = [
    [-2.25, 0.32], [-2.3, 0.55], [-2.28, 0.78], [-2.15, 0.88], [-1.75, 0.92], [-1.45, 0.96],
    [-1.05, 1.28], [-0.7, 1.42], [-0.1, 1.46], [0.55, 1.44], [1.0, 1.36], [1.35, 1.2],
    [1.6, 1.0], [1.95, 0.88], [2.25, 0.8], [2.3, 0.6], [2.28, 0.34], [2.1, 0.28],
    [1.9, 0.26], [1.72, 0.27], [1.62, 0.2], [1.2, 0.18], [1.02, 0.27],
    [-0.98, 0.27], [-1.16, 0.18], [-1.62, 0.2], [-1.72, 0.27], [-2.05, 0.27]
  ];
  const WINDOWS = [
    [[-1.35, 0.97], [-1.02, 1.24], [-0.55, 1.36], [-0.5, 0.98]],
    [[-0.44, 0.98], [-0.42, 1.38], [0.28, 1.38], [0.3, 0.98]],
    [[0.36, 0.98], [0.4, 1.36], [0.95, 1.3], [1.42, 1.02]]
  ];
  const WHEELS = [[-1.4, 0.34, 0.34], [1.4, 0.34, 0.34]]; // x, y, r
  const BASE_Y = -1.45; // ligne de base des colonnes (repère du groupe)

  function inPoly(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

  // Échantillonnage uniforme le long du périmètre d'un polygone
  function perimeterSamples(poly, count) {
    const segs = []; let total = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a, b, L, c: total }); total += L;
    }
    const out = [];
    for (let k = 0; k < count; k++) {
      const d = Math.random() * total; let sg = segs[segs.length - 1];
      for (const g of segs) if (d >= g.c && d < g.c + g.L) { sg = g; break; }
      const t = (d - sg.c) / sg.L; out.push([sg.a[0] + (sg.b[0] - sg.a[0]) * t, sg.a[1] + (sg.b[1] - sg.a[1]) * t]);
    }
    return out;
  }
  // Bornes du profil : y min/max pour un x donné, x min/max pour un y donné
  function yRange(x) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < BODY.length; i++) {
      const a = BODY[i], b = BODY[(i + 1) % BODY.length];
      if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const y = a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
    return [lo, hi];
  }
  function xRange(y) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < BODY.length; i++) {
      const a = BODY[i], b = BODY[(i + 1) % BODY.length];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const x = a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]); lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    return [lo, hi];
  }

  // Construction du véhicule : surfaces + arêtes + roues + habitacle.
  // Chaque point : position, catégorie de matière, taille, ton (1 = arête accentuée).
  function buildCar(N) {
    const pts = [];
    const half = 0.92;
    // demi-largeur de la caisse selon la hauteur (section arrondie, pavillon plus étroit)
    const zmax = y => y < 0.95 ? half * (0.96 + 0.04 * Math.min(1, Math.max(0, (y - 0.14) / 0.81))) : half * (1 - Math.min(1, (y - 0.95) / 0.51) * 0.3);
    const push = (x, y, z, cat, size, tone) => pts.push({ x, y, z, cat, size, tone: tone || 0 });
    const inWindow = (x, y) => WINDOWS.some(w => inPoly([x, y], w));
    const nearWheel = (x, y, m) => WHEELS.some(([wx, wy, wr]) => Math.hypot(x - wx, y - wy) < wr + m);
    const side = () => (Math.random() < 0.5 ? -1 : 1);
    let n, guard;

    // 1. Flancs : tôle (métaux), vitrages clairsemés (verre), bas de caisse et boucliers (polymères)
    n = Math.round(N * 0.30); guard = 0;
    while (n > 0 && guard++ < N * 60) {
      const x = rnd(-2.3, 2.3), y = rnd(0.14, 1.47);
      if (!inPoly([x, y], BODY) || nearWheel(x, y, 0.08)) continue;
      const glass = inWindow(x, y);
      if (glass && Math.random() < 0.62) continue;
      const z = side() * zmax(y) * rnd(0.985, 1);
      const cat = glass ? 4 : (y < 0.36 || (Math.abs(x) > 1.95 && y < 0.8)) ? 1 : 0;
      push(x, y, z, cat, glass ? rnd(0.6, 0.9) : rnd(0.5, 0.9)); n--;
    }
    // 2. Surface supérieure : capot, pare-brise, pavillon, lunette, malle (galbée sur les bords)
    n = Math.round(N * 0.19); guard = 0;
    while (n > 0 && guard++ < N * 60) {
      const x = rnd(-2.28, 2.28); const hi = yRange(x)[1]; if (!isFinite(hi)) continue;
      const zm = zmax(hi); const z = rnd(-zm, zm) * 0.97; const y = hi - 0.07 * Math.pow(Math.abs(z) / zm, 3);
      const glass = (x > 1.0 && x < 1.6) || (x > -1.45 && x < -1.05);
      if (glass && Math.random() < 0.55) continue;
      push(x, y, z, glass ? 4 : 0, rnd(0.5, 0.85)); n--;
    }
    // 3. Faces avant et arrière : calandre, hayon, pare-chocs (polymères)
    n = Math.round(N * 0.07); guard = 0;
    while (n > 0 && guard++ < N * 60) {
      const y = rnd(0.28, 0.9); const [lo, hi] = xRange(y); if (!isFinite(hi)) continue;
      const front = Math.random() < 0.5; const zm = zmax(y); const z = rnd(-zm, zm) * 0.96;
      const x = (front ? hi : lo) - (front ? 1 : -1) * 0.06 * Math.pow(Math.abs(z) / zm, 3);
      push(x, y, z, y < 0.62 ? 1 : 0, rnd(0.55, 0.9)); n--;
    }
    // 4. Arêtes accentuées : silhouette, encadrements de vitres
    perimeterSamples(BODY, Math.round(N * 0.10)).forEach(([x, y]) => push(x, y, side() * (zmax(y) + 0.012), 0, rnd(1.3, 1.9), 1));
    WINDOWS.forEach(w => perimeterSamples(w, Math.round(N * 0.018)).forEach(([x, y]) => push(x, y, side() * (zmax(y) + 0.012), 0, rnd(1.2, 1.7), 1)));
    // passages de roue, lignes de portes, ceinture de caisse
    WHEELS.forEach(([wx, wy, wr]) => { for (let k = 0; k < N * 0.012; k++) { const a = rnd(0.12, 0.88) * Math.PI; const x = wx + Math.cos(a) * (wr + 0.1), y = wy + Math.sin(a) * (wr + 0.1); push(x, y, side() * (zmax(y) + 0.012), 0, rnd(1.2, 1.7), 1); } });
    [1.42, 0.3, -0.95].forEach(x => { for (let k = 0; k < N * 0.004; k++) { const y = rnd(0.3, 0.955); push(x, y, side() * (zmax(y) + 0.012), 0, rnd(1.1, 1.5), 1); } });
    for (let k = 0; k < N * 0.006; k++) { const x = rnd(-1.42, 1.42); push(x, 0.955, side() * (zmax(0.955) + 0.012), 0, rnd(1.0, 1.4), 1); }
    // 5. Roues : bande de roulement (élastomères), flanc, jante à cinq branches et moyeu (métal)
    WHEELS.forEach(([wx, wy, wr]) => [-1, 1].forEach(sd => {
      const zc = sd * (half - 0.05);
      for (let k = 0; k < N * 0.014; k++) { const a = rnd(0, TAU); const r = rnd(wr * 0.8, wr); push(wx + Math.cos(a) * r, wy + Math.sin(a) * r, zc + sd * rnd(-0.14, 0.02), 2, rnd(0.8, 1.2)); }
      for (let k = 0; k < N * 0.004; k++) { const a = rnd(0, TAU); const r = rnd(wr * 0.16, wr * 0.26); push(wx + Math.cos(a) * r, wy + Math.sin(a) * r, zc, 0, rnd(0.9, 1.3), 1); }
      for (let sp = 0; sp < 5; sp++) for (let k = 0; k < N * 0.0025; k++) { const a = sp * TAU / 5 + rnd(-0.08, 0.08); const r = rnd(wr * 0.26, wr * 0.78); push(wx + Math.cos(a) * r, wy + Math.sin(a) * r, zc, 0, rnd(0.9, 1.3), 1); }
    }));
    // 6. Habitacle et compartiment moteur : fluides (moteur) et matières naturelles (sièges)
    for (let k = 0; k < N * 0.023; k++) push(rnd(1.15, 2.0), rnd(0.36, 0.82), rnd(-0.55, 0.55), 3, rnd(0.7, 1.1));
    for (let k = 0; k < N * 0.015; k++) { const s2 = side(); const seat = Math.random() < 0.5 ? rnd(-0.85, -0.4) : rnd(0.05, 0.5); push(seat, rnd(0.36, 0.92), s2 * rnd(0.25, 0.58), 5, rnd(0.7, 1.0)); }
    // 7. Optiques avant et arrière
    for (let k = 0; k < N * 0.008; k++) { const front = Math.random() < 0.5; const x = front ? rnd(2.05, 2.26) : rnd(-2.26, -2.05); const y = rnd(0.7, 0.86); const zm = zmax(y); push(x, y, side() * rnd(zm * 0.6, zm), 4, rnd(1.0, 1.4), 1); }
    return pts;
  }

  function buildTargets(pts) {
    // Colonnes proportionnelles, centrées sur x = 0 : largeur fixe, hauteur ∝ %
    const n = CATS.length; const gap = 0.5; const colW = 0.62; const totalW = n * colW + (n - 1) * gap;
    const x0 = -totalW / 2 + colW / 2; const maxH = 2.5; const scale = maxH / CATS[0].pct;
    const heights = CATS.map(c => Math.max(0.22, c.pct * scale));
    const out = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      const c = p.cat; const h = heights[c]; const cx = x0 + c * (colW + gap);
      const u = Math.random(), v = Math.random(), w = Math.random();
      const edge = Math.random() < 0.35;
      out[i * 3] = cx + (edge ? (u < 0.5 ? -1 : 1) * colW / 2 * rnd(0.9, 1) : rnd(-colW / 2, colW / 2));
      out[i * 3 + 1] = BASE_Y + h * (edge ? v : Math.pow(v, 0.9));
      out[i * 3 + 2] = (edge ? rnd(-0.3, 0.3) : (w < 0.5 ? -0.3 : 0.3) * rnd(0.85, 1));
    });
    return { arr: out, heights, x0, colW, gap };
  }

  INDRA.initHero = function (wrap) {
    if (!wrap || typeof THREE === 'undefined') return null;
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { canvas.remove(); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.0, 8.4);

    const N = (window.innerWidth < 800 ? 6500 : 12500);
    const pts = buildCar(N);
    const car = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { car[i * 3] = p.x; car[i * 3 + 1] = p.y - 0.75; car[i * 3 + 2] = p.z; });
    const tgt = buildTargets(pts);
    const pos = new Float32Array(car);
    const col = new Float32Array(pts.length * 3);
    const size = new Float32Array(pts.length);
    const seed = new Float32Array(pts.length);
    pts.forEach((p, i) => {
      const c = CATS[p.cat].color; const tone = p.tone ? 1.22 : 1; // arêtes plus lumineuses
      col[i * 3] = Math.min(1, c[0] * tone); col[i * 3 + 1] = Math.min(1, c[1] * tone); col[i * 3 + 2] = Math.min(1, c[2] * tone);
      size[i] = p.size * (p.cat === 0 ? 1 : 1.15); seed[i] = Math.random();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uProgress: { value: 0 } },
      vertexShader: `
        attribute float aSize; attribute float aSeed;
        uniform float uTime; uniform float uPix; uniform float uProgress;
        varying vec3 vColor; varying float vA;
        void main(){
          vColor = color;
          vec3 p = position;
          p.y += sin(uTime*1.3 + aSeed*40.0)*0.012;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          float s = aSize * (1.0 + uProgress*0.35);
          gl_PointSize = s * uPix * (26.0 / -mv.z);
          vA = 0.55 + 0.45*sin(uTime*2.0 + aSeed*80.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vA;
        void main(){
          vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
          if(d>0.5) discard;
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vColor, a * (0.55 + 0.45*vA));
        }`
    });
    const cloud = new THREE.Points(geo, mat);
    const group = new THREE.Group(); group.add(cloud); scene.add(group);

    // sol : grille fine, alignée sur la base des colonnes une fois éclaté
    const grid = new THREE.GridHelper(30, 60, 0x2a3530, 0x1a221d);
    grid.material.transparent = true; grid.material.opacity = 0; scene.add(grid);

    // lignes de contour du profil (accent)
    const outline = new THREE.BufferGeometry().setFromPoints(BODY.concat([BODY[0]]).map(([x, y]) => new THREE.Vector3(x, y - 0.75, 0.95)));
    const outlineL = new THREE.Line(outline, new THREE.LineBasicMaterial({ color: 0xa0bf38, transparent: true, opacity: 0.25 }));
    const outlineR = outlineL.clone(); outlineR.position.z = -1.9;
    group.add(outlineL, outlineR);

    // État : progression (0 = voiture, 1 = colonnes), rotation cumulée, souris
    // Mise en scène : au repos, la voiture occupe l'espace libre en haut à droite ;
    // au défilement, les colonnes viennent se recentrer à l'écran.
    const POSE = {
      desktop: { rest: { x: 2.25, y: 1.6, s: 0.85 }, exploded: { x: 0, y: 0.95, s: 1 } },
      mobile: { rest: { x: 0, y: 1.35, s: 1 }, exploded: { x: 0, y: 2.45, s: 0.7 } }
    };
    let progress = 0, target = 0, mouseX = 0, mouseY = 0, isMobile = false, rotY = 0.35, lastNow = 0;
    const stagger = pts.map(p => (p.x + 2.4) / 4.8); // vague de gauche à droite
    const hooks = { onFrame: null };

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      isMobile = w < 800; camera.position.z = isMobile ? 15.5 : 8.4;
      // au repos, la voiture reste entièrement visible à droite quel que soit le ratio de l'écran
      const halfW = Math.tan(camera.fov * Math.PI / 360) * camera.position.z * camera.aspect;
      POSE.desktop.rest.x = Math.max(0.6, Math.min(2.25, halfW - 2.15));
    }
    window.addEventListener('resize', resize); resize();
    window.addEventListener('mousemove', e => { mouseX = (e.clientX / innerWidth - 0.5); mouseY = (e.clientY / innerHeight - 0.5); }, { passive: true });

    let visible = true;
    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(wrap);

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) { lastNow = now; return; }
      const dt = Math.min(0.05, lastNow ? (now - lastNow) / 1000 : 0.016); lastNow = now;
      const t = now * 0.001;
      progress += (target - progress) * 0.08;
      if (Math.abs(target - progress) < 0.0005) progress = target;
      const e = ease(progress);
      mat.uniforms.uTime.value = t; mat.uniforms.uProgress.value = progress;

      // positions des points : voiture → colonnes, en vague, avec trajectoire en arche
      const p = geo.attributes.position.array;
      for (let i = 0; i < pts.length; i++) {
        const local = Math.min(1, Math.max(0, (progress * 1.5 - stagger[i] * 0.5)));
        const k = ease(local);
        const arc = Math.sin(k * Math.PI) * 0.9;
        p[i * 3] = car[i * 3] + (tgt.arr[i * 3] - car[i * 3]) * k;
        p[i * 3 + 1] = car[i * 3 + 1] + (tgt.arr[i * 3 + 1] - car[i * 3 + 1]) * k + arc;
        p[i * 3 + 2] = car[i * 3 + 2] + (tgt.arr[i * 3 + 2] - car[i * 3 + 2]) * k;
      }
      geo.attributes.position.needsUpdate = true;

      // rotation : lente au repos, puis se cale de face (tour complet le plus proche) une fois éclaté.
      // L'angle est cumulé image par image, jamais dérivé du temps absolu : pas de déroulé intempestif.
      if (!reduced) rotY += dt * 0.14 * (1 - progress);
      const nearest = Math.round(rotY / TAU) * TAU;
      rotY += (nearest - rotY) * Math.min(1, progress * 0.12);
      group.rotation.y = rotY + mouseX * 0.25 * (1 - 0.7 * e);
      group.rotation.x = 0.06 + mouseY * 0.08 * (1 - e);

      // mise en scène (position / échelle) selon la progression
      const pose = isMobile ? POSE.mobile : POSE.desktop;
      group.position.x = pose.rest.x + (pose.exploded.x - pose.rest.x) * e;
      group.position.y = pose.rest.y + (pose.exploded.y - pose.rest.y) * e;
      const s = pose.rest.s + (pose.exploded.s - pose.rest.s) * e;
      group.scale.setScalar(s);
      grid.position.y = group.position.y + BASE_Y * s - 0.03;
      grid.material.opacity = 0.45 * e;
      outlineL.material.opacity = 0.25 * (1 - progress);

      group.updateMatrixWorld();
      if (hooks.onFrame) hooks.onFrame(progress);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    const api = {
      setProgress(v) { target = Math.min(1, Math.max(0, v)); },
      get progress() { return progress; },
      heights: tgt.heights, x0: tgt.x0, colW: tgt.colW, gap: tgt.gap, camera, group, hooks,
      project(x, y, z) { // repère du groupe -> % du conteneur
        const v = new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld).project(camera);
        return { x: (v.x + 1) / 2 * 100, y: (1 - v.y) / 2 * 100 };
      }
    };
    return api;
  };

  /* Liaison scroll : pin du hero + étiquettes de composition (sous chaque colonne) */
  INDRA.bindHeroScroll = function (api, pinEl, compoEl) {
    if (!api) return;
    const labels = CATS.map(c => {
      const el = document.createElement('div'); el.className = 'compo__label';
      el.innerHTML = `<i></i><div class="num">${c.pct.toString().replace('.', ',')}<small> %</small></div><p>${c.label}</p>`;
      compoEl.appendChild(el); return el;
    });
    const mobile = () => window.innerWidth < 700;
    const place = () => {
      if (mobile()) return; // sur mobile, la légende est une grille statique (CSS)
      labels.forEach((el, i) => {
        const cx = api.x0 + i * (api.colW + api.gap);
        const pr = api.project(cx, BASE_Y - 0.12, 0.32);
        el.style.left = pr.x + '%'; el.style.top = pr.y + '%';
      });
    };
    // repositionnement à chaque image tant que la scène bouge ou que la légende est visible
    api.hooks.onFrame = progress => { if (progress > 0.4) place(); };
    if (reduced || !window.gsap || !window.ScrollTrigger) { api.setProgress(0); return; }
    ScrollTrigger.create({
      trigger: pinEl, start: 'top top', end: '+=160%', pin: true, scrub: 0.4, anticipatePin: 1, refreshPriority: 10,
      onUpdate: self => {
        api.setProgress(self.progress);
        compoEl.classList.toggle('is-on', self.progress > 0.62);
        pinEl.classList.toggle('is-exploded', self.progress > 0.25);
      }
    });
  };
})();
