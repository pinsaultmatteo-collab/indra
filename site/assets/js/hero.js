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
    { key: 'metaux', label: 'Métaux', short: 'Métaux', pct: 75.6, color: [0.72, 0.78, 0.82] },
    { key: 'polymeres', label: 'Polymères', short: 'Polym.', pct: 14.3, color: [0.63, 0.75, 0.22] },
    { key: 'elastomeres', label: 'Élastomères', short: 'Élast.', pct: 4.2, color: [0.36, 0.4, 0.42] },
    { key: 'fluides', label: 'Fluides', short: 'Fluides', pct: 2.3, color: [0.94, 0.63, 0.19] },
    { key: 'verre', label: 'Verres', short: 'Verres', pct: 2.1, color: [0.5, 0.83, 0.91] },
    { key: 'autres', label: 'Naturels & autres', short: 'Autres', pct: 1.4, color: [0.62, 0.6, 0.5] }
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

  // Rééquilibrage des catégories vers la composition réelle (n'affecte que les couleurs à l'explosion)
  function rebalance(pts) {
    const total = pts.length; const target = CATS.map(c => Math.round(total * c.pct / 100));
    const count = CATS.map(() => 0); pts.forEach(p => count[p.cat]++);
    for (let c = 1; c < CATS.length; c++) {
      let diff = count[c] - target[c]; let tries = 0;
      while (diff !== 0 && tries++ < total * 6) {
        const p = pts[Math.floor(Math.random() * total)];
        if (diff > 0 && p.cat === c) { p.cat = 0; diff--; }
        else if (diff < 0 && p.cat === 0) { p.cat = c; diff++; }
      }
    }
  }

  // Nuage de points à partir d'une photo détourée : chaque pixel opaque devient une particule
  // qui garde sa couleur au repos. Les familles de matières sont déduites de la position et de la teinte.
  function buildFromImage(img, N, cfg) {
    cfg = Object.assign({ wheels: [{ u: 0.32, v: 0.70, r: 0.11 }, { u: 0.045, v: 0.53, r: 0.085 }], windowMaxV: 0.48, windowU: [0.16, 0.7], bumperMinV: 0.6, lightsU: null, greyRed: false }, cfg || {});
    const W = 420, H = Math.round(W * img.naturalHeight / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    let minx = W, maxx = 0, miny = H, maxy = 0, count = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 110) { count++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    if (count < 500) throw new Error('image sans pixels opaques');
    const bw = maxx - minx + 1, bh = maxy - miny + 1; const keep = Math.min(1, N / count); const scale = 4.5 / bw;
    // repères en fractions de la boîte englobante (vue trois quarts avant) : roues avant et arrière
    const wheels = cfg.wheels;
    const pts = [];
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] <= 110 || Math.random() > keep) continue;
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255; const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
      const u = (x - minx) / bw, v = (y - miny) / bh;
      const inWheel = wheels.some(w => Math.hypot((u - w.u) * bw, (v - w.v) * bh) < w.r * bw);
      let cat = 0;
      if (inWheel && lum < 0.42) cat = 2;                                                            // pneus
      else if (lum < 0.36 && v < cfg.windowMaxV && u > cfg.windowU[0] && u < cfg.windowU[1]) cat = 4; // vitrages
      else if (cfg.lightsU && lum > 0.82 && u > cfg.lightsU[0] && u < cfg.lightsU[1] && v > 0.4 && v < 0.62) cat = 4; // optiques
      else if (!inWheel && (v > cfg.bumperMinV || (lum < 0.3 && v >= cfg.windowMaxV))) cat = 1;     // bouclier, bas de caisse, grilles
      const px = (x - (minx + bw / 2)) * scale, py = ((miny + bh / 2) - y) * scale;
      const z = (lum - 0.5) * 0.45 + rnd(-0.05, 0.05);
      let R = r, G = gg, B = b;
      if (cfg.greyRed && r > gg * 1.12 && r > b * 1.12) { const l = Math.min(1, lum * 1.2 + 0.14); R = l * 0.86; G = l * 0.92; B = l * 0.98; } // carrosserie rouge → nuances de gris acier
      pts.push({ x: px, y: py, z, cat, size: rnd(0.85, 1.25), tone: 0, rgb: [Math.min(1, R * 1.08), Math.min(1, G * 1.08), Math.min(1, B * 1.08)] });
    }
    rebalance(pts);
    return pts;
  }

  INDRA.initHero = function (wrap, opts) {
    opts = Object.assign({ image: null, cfg: null }, opts || {});
    if (!wrap || typeof THREE === 'undefined') return null;
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { canvas.remove(); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.0, 8.4);
    const group = new THREE.Group(); scene.add(group);
    const grid = new THREE.GridHelper(30, 60, 0x2a3530, 0x1a221d);
    grid.material.transparent = true; grid.material.opacity = 0; scene.add(grid);

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uProgress: { value: 0 }, uAlpha: { value: 1 } },
      vertexShader: `
        attribute float aSize; attribute float aSeed; attribute vec3 aColor2;
        uniform float uTime; uniform float uPix; uniform float uProgress;
        varying vec3 vColor; varying float vA;
        void main(){
          vColor = mix(color, aColor2, smoothstep(0.12, 0.6, uProgress));
          vec3 p = position;
          // au repos : flottement lent et organique (dérive individuelle + houle traversant la carrosserie)
          float rest = 1.0 - smoothstep(0.0, 0.5, uProgress);
          float ph = aSeed * 6.2831;
          p.x += rest * (sin(uTime*0.9 + ph) * 0.028 + sin(uTime*0.35 + position.y*2.0) * 0.02);
          p.y += rest * (cos(uTime*1.1 + ph*1.7) * 0.028 + sin(uTime*0.5 + position.x*1.3) * 0.022)
               + (1.0 - rest) * sin(uTime*1.3 + aSeed*40.0) * 0.012;
          p.z += rest * sin(uTime*0.8 + ph*2.3) * 0.06;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          float s = aSize * (1.0 + uProgress*0.35);
          gl_PointSize = s * uPix * (26.0 / -mv.z);
          vA = 0.55 + 0.45*sin(uTime*2.0 + aSeed*80.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uAlpha;
        varying vec3 vColor; varying float vA;
        void main(){
          vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
          if(d>0.5) discard;
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vColor, a * uAlpha * (0.55 + 0.45*vA));
        }`
    });

    // État de la scène
    const N = opts.image ? (window.innerWidth < 800 ? 8000 : 19000) : (window.innerWidth < 800 ? 6500 : 12500);
    const S = { built: false, mode: 'model', pts: [], car: null, tgt: null, geo: null, stagger: [] };
    let progress = 0, target = 0, exit = 0, exitTarget = 0, mouseX = 0, mouseY = 0, isMobile = false, lastNow = 0;
    const EXIT_DIST = 11; // distance de fuite des colonnes vers la gauche (unités scène)
    const hooks = { onFrame: null };
    // Mise en scène : au repos, le véhicule occupe l'espace libre en haut à droite ;
    // au défilement, les colonnes viennent se recentrer à l'écran.
    const POSE = {
      desktop: { rest: { x: 0.35, y: 1.2, s: 1.12 }, exploded: { x: 0, y: 0.95, s: 1 } },
      mobile: { rest: { x: 0, y: 1.35, s: 1 }, exploded: { x: 0, y: 0.2, s: 0.72 } } // colonnes recentrées sous le titre, étiquettes au-dessus
    };

    function build(pts, mode) {
      S.mode = mode; S.pts = pts;
      const n = pts.length;
      const car = new Float32Array(n * 3), col = new Float32Array(n * 3), col2 = new Float32Array(n * 3);
      const size = new Float32Array(n), seed = new Float32Array(n);
      pts.forEach((p, i) => {
        car[i * 3] = p.x; car[i * 3 + 1] = mode === 'image' ? p.y : p.y - 0.75; car[i * 3 + 2] = p.z;
        const c = CATS[p.cat].color; const tone = p.tone ? 1.22 : 1;
        col2[i * 3] = Math.min(1, c[0] * tone); col2[i * 3 + 1] = Math.min(1, c[1] * tone); col2[i * 3 + 2] = Math.min(1, c[2] * tone);
        if (p.rgb) { col[i * 3] = p.rgb[0]; col[i * 3 + 1] = p.rgb[1]; col[i * 3 + 2] = p.rgb[2]; }
        else { col[i * 3] = col2[i * 3]; col[i * 3 + 1] = col2[i * 3 + 1]; col[i * 3 + 2] = col2[i * 3 + 2]; }
        size[i] = p.size * (p.cat === 0 || mode === 'image' ? 1 : 1.15); seed[i] = Math.random();
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(car), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aColor2', new THREE.BufferAttribute(col2, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      group.add(new THREE.Points(geo, mat));
      mat.uniforms.uAlpha.value = mode === 'image' ? 0.95 : 1;
      S.car = car; S.geo = geo; S.tgt = buildTargets(pts); S.stagger = pts.map(p => (p.x + 2.4) / 4.8);
      S.cat = Uint8Array.from(pts.map(p => p.cat)); S.seed = seed; S.xoff = new Float32Array(CATS.length); S.kexit = new Float32Array(CATS.length);
      api.heights = S.tgt.heights; api.x0 = S.tgt.x0; api.colW = S.tgt.colW; api.gap = S.tgt.gap; api.ready = true;
      S.built = true;
    }
    if (opts.image) {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => { try { build(buildFromImage(img, N, opts.cfg), 'image'); } catch (e) { build(buildCar(N), 'model'); } };
      img.onerror = () => build(buildCar(N), 'model');
      img.src = opts.image;
    } else build(buildCar(N), 'model');

    // Champ de particules ambiant : réparti sur tout l'écran et en profondeur au repos,
    // quelques particules floues au premier plan ; il s'efface quand la voiture se déconstruit.
    const AN = window.innerWidth < 800 ? 1100 : 2900;
    const aU = new Float32Array(AN), aV = new Float32Array(AN), aZ = new Float32Array(AN);
    const aPos = new Float32Array(AN * 3), aCol = new Float32Array(AN * 3), aSz = new Float32Array(AN), aSd = new Float32Array(AN);
    const PAL = [[0.62, 0.68, 0.72], [0.63, 0.75, 0.22], [0.5, 0.83, 0.91], [0.94, 0.63, 0.19]];
    for (let i = 0; i < AN; i++) {
      aU[i] = rnd(-1.08, 1.08); aV[i] = rnd(-1.08, 1.08);
      const near = Math.random() < 0.1; aZ[i] = near ? rnd(2.6, 5.4) : rnd(-12, 2.4);
      const r = Math.random(); const c = r < 0.66 ? PAL[0] : r < 0.9 ? PAL[1] : r < 0.96 ? PAL[2] : PAL[3];
      aCol[i * 3] = c[0]; aCol[i * 3 + 1] = c[1]; aCol[i * 3 + 2] = c[2];
      aSz[i] = near ? rnd(2.4, 4.6) : rnd(0.7, 1.8); aSd[i] = Math.random();
    }
    const aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
    aGeo.setAttribute('color', new THREE.BufferAttribute(aCol, 3));
    aGeo.setAttribute('aSize', new THREE.BufferAttribute(aSz, 1));
    aGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSd, 1));
    const aMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uFade: { value: 1 }, uMouse: { value: new THREE.Vector2() } },
      vertexShader: `
        attribute float aSize; attribute float aSeed;
        uniform float uTime; uniform float uPix; uniform vec2 uMouse;
        varying vec3 vColor; varying float vA; varying float vSoft;
        void main(){
          vColor = color;
          vec3 p = position;
          float ph = aSeed * 6.2831;
          float depth = clamp((p.z + 12.0) / 17.5, 0.0, 1.0);
          p.x += sin(uTime*0.11 + ph) * 0.34 + sin(uTime*0.23 + ph*2.1) * 0.12;
          p.y += cos(uTime*0.09 + ph*1.3) * 0.28 + sin(uTime*0.17 + ph*0.7) * 0.1;
          p.xy += uMouse * (0.12 + depth * 0.85);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * uPix * (22.0 / -mv.z);
          vA = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed) + aSeed * 50.0);
          vSoft = smoothstep(2.2, 5.0, position.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uFade;
        varying vec3 vColor; varying float vA; varying float vSoft;
        void main(){
          vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
          if(d > 0.5) discard;
          float a = mix(smoothstep(0.5, 0.05, d), smoothstep(0.5, 0.0, d) * 0.32, vSoft);
          gl_FragColor = vec4(vColor, a * uFade * (0.22 + 0.42 * vA));
        }`
    });
    scene.add(new THREE.Points(aGeo, aMat));
    const amb = { mx: 0, my: 0 };
    function layoutAmbient() { // positions recalculées pour couvrir tout le cadre, quel que soit le ratio
      const tanH = Math.tan(camera.fov * Math.PI / 360);
      for (let i = 0; i < AN; i++) {
        const hh = tanH * (camera.position.z - aZ[i]);
        aPos[i * 3] = aU[i] * hh * camera.aspect; aPos[i * 3 + 1] = camera.position.y + aV[i] * hh; aPos[i * 3 + 2] = aZ[i];
      }
      aGeo.attributes.position.needsUpdate = true;
    }

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      isMobile = w < 800; camera.position.z = isMobile ? 15.5 : 8.4;
      // au repos, le véhicule est centré en arrière-plan du texte ; un peu plus petit sur les écrans peu hauts
      POSE.desktop.rest.s = h < 760 ? 0.95 : 1.12;
      layoutAmbient();
    }
    window.addEventListener('resize', resize); resize();
    window.addEventListener('mousemove', e => { mouseX = (e.clientX / innerWidth - 0.5); mouseY = (e.clientY / innerHeight - 0.5); }, { passive: true });
    let visible = true;
    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(wrap);

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) { lastNow = now; return; }
      lastNow = now;
      const t = now * 0.001;
      progress += (target - progress) * 0.08;
      if (Math.abs(target - progress) < 0.0005) progress = target;
      exit += (exitTarget - exit) * 0.1;
      if (Math.abs(exitTarget - exit) < 0.0005) exit = exitTarget;
      const e = ease(progress);
      // sortie : chaque colonne quitte l'écran vers la gauche avec un léger décalage (de gauche à droite)
      if (S.built) for (let c = 0; c < CATS.length; c++) { const k = Math.min(1, Math.max(0, exit * 1.6 - c * 0.11)); const ke = k * k * (3 - 2 * k); S.kexit[c] = ke; S.xoff[c] = -ke * ke * EXIT_DIST; }
      mat.uniforms.uTime.value = t; mat.uniforms.uProgress.value = progress;
      // particules ambiantes : dérive lente, parallaxe souris, effacement progressif à la déconstruction
      aMat.uniforms.uTime.value = reduced ? 0 : t;
      aMat.uniforms.uFade.value = 1 - 0.88 * Math.min(1, progress / 0.45);
      amb.mx += (mouseX * 0.7 - amb.mx) * 0.05; amb.my += (-mouseY * 0.5 - amb.my) * 0.05;
      aMat.uniforms.uMouse.value.set(amb.mx, amb.my);

      if (S.built) {
        const p = S.geo.attributes.position.array, car = S.car, tgt = S.tgt.arr, n = S.pts.length, exiting = exit > 0.0005;
        for (let i = 0; i < n; i++) {
          const local = Math.min(1, Math.max(0, (progress * 1.5 - S.stagger[i] * 0.5)));
          const k = ease(local);
          const arc = Math.sin(k * Math.PI) * 0.9;
          let x = car[i * 3] + (tgt[i * 3] - car[i * 3]) * k;
          let y = car[i * 3 + 1] + (tgt[i * 3 + 1] - car[i * 3 + 1]) * k + arc;
          if (exiting) { // fuite vers la gauche : vitesse propre à chaque particule (traînées) et dispersion verticale en vol
            const c = S.cat[i], sd = S.seed[i], ke = S.kexit[c];
            x += S.xoff[c] * (1 + (sd - 0.5) * 0.45);
            y += (sd - 0.5) * 0.9 * ke * (1 - ke) * 4 * (0.5 + sd * 0.5);
          }
          p[i * 3] = x; p[i * 3 + 1] = y;
          p[i * 3 + 2] = car[i * 3 + 2] + (tgt[i * 3 + 2] - car[i * 3 + 2]) * k;
        }
        S.geo.attributes.position.needsUpdate = true;
      }

      // Léger balancement au repos (la photo est un plan en relief), aucune rotation cumulée.
      const sway = reduced ? 0 : Math.sin(t * 0.5) * 0.05;
      group.rotation.y = (sway + mouseX * 0.16) * (1 - e);
      group.rotation.x = (Math.cos(t * 0.37) * 0.02 + mouseY * 0.06) * (1 - e);

      const pose = isMobile ? POSE.mobile : POSE.desktop;
      group.position.x = pose.rest.x + (pose.exploded.x - pose.rest.x) * e;
      group.position.y = pose.rest.y + (pose.exploded.y - pose.rest.y) * e;
      const s = pose.rest.s + (pose.exploded.s - pose.rest.s) * e;
      group.scale.setScalar(s);
      grid.position.y = group.position.y + BASE_Y * s - 0.03;
      grid.material.opacity = 0.45 * e * (1 - exit);
      // au repos la voiture est un décor derrière le texte : intensité réduite, pleine à la déconstruction
      mat.uniforms.uAlpha.value = (S.mode === 'image' ? 0.95 : 1) * (isMobile ? 0.85 : 0.5 + 0.5 * e);

      group.updateMatrixWorld();
      if (hooks.onFrame) hooks.onFrame(progress, exit);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    const api = {
      ready: false,
      setProgress(v) { target = Math.min(1, Math.max(0, v)); },
      setExit(v) { exitTarget = Math.min(1, Math.max(0, v)); },
      get progress() { return progress; },
      get exit() { return exit; },
      get debug() { return { target, exitTarget, visible, built: S.built, mode: S.mode, n: S.pts.length }; },
      colOffset(i) { return S.xoff ? S.xoff[i] : 0; },
      colExit(i) { return S.kexit ? S.kexit[i] : 0; },
      heights: null, x0: 0, colW: 0, gap: 0, camera, group, hooks,
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
    // sur mobile : le pourcentage se pose juste au-dessus de sa barre, le nom (abrégé) sous la base
    const names = CATS.map(c => { const el = document.createElement('div'); el.className = 'compo__name'; el.textContent = c.short; compoEl.appendChild(el); return el; });
    const mobile = () => window.innerWidth < 700;
    const place = () => {
      if (!api.ready) return;
      const mob = mobile();
      labels.forEach((el, i) => {
        const cx = api.x0 + i * (api.colW + api.gap) + api.colOffset(i);
        if (mob) {
          const top = api.project(cx, BASE_Y + api.heights[i] + 0.16, 0.32);
          el.style.left = top.x + '%'; el.style.top = top.y + '%';
          const base = api.project(cx, BASE_Y - 0.1, 0.32);
          names[i].style.left = base.x + '%'; names[i].style.top = base.y + '%';
        } else {
          const pr = api.project(cx, BASE_Y - 0.12, 0.32);
          el.style.left = pr.x + '%'; el.style.top = pr.y + '%';
        }
        const ke = api.colExit(i); el.style.opacity = ke > 0.001 ? String(Math.max(0, 1 - ke * 1.6)) : '';
      });
    };
    api.hooks.onFrame = (progress, exit) => { if (progress > 0.4 || exit > 0) place(); };
    if (reduced || !window.gsap || !window.ScrollTrigger) { api.setProgress(0); return; }
    ScrollTrigger.create({
      trigger: pinEl, start: 'top top', end: '+=160%', pin: true, scrub: 0.4, anticipatePin: 1, refreshPriority: 10,
      onUpdate: self => {
        const P = self.progress;
        api.setProgress(P); api.setExit(0); // pas de phase de sortie : les colonnes restent en place
        compoEl.classList.toggle('is-on', P > 0.62);
        pinEl.classList.toggle('is-exploded', P > 0.25);
      }
    });
  };
})();
