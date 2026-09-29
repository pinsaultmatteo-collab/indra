/* =====================================================================
   INDRA — Hero 3D : un véhicule hors d'usage en nuage de points qui se
   déconstruit, à la molette, en ses 6 familles de matières.
   Three.js r128 (global THREE). Fallback : rien (le hero reste lisible).
   ===================================================================== */
(function () {
  'use strict';
  window.INDRA = window.INDRA || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    [[-1.35, 0.97], [-1.02, 1.24], [-0.55, 1.36], [-0.5, 0.98]],         // pare-brise arrière
    [[-0.44, 0.98], [-0.42, 1.38], [0.28, 1.38], [0.3, 0.98]],            // vitres latérales
    [[0.36, 0.98], [0.4, 1.36], [0.95, 1.3], [1.42, 1.02]]                // pare-brise avant
  ];
  const WHEELS = [[-1.4, 0.34, 0.34], [1.4, 0.34, 0.34]]; // x, y, r

  function inPoly(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  function buildCar(N) {
    const pts = []; // {x,y,z, cat}
    const half = 0.92;
    let guard = 0;
    while (pts.length < N * 0.86 && guard++ < N * 40) {
      const x = rnd(-2.32, 2.32), y = rnd(0.14, 1.48);
      if (!inPoly([x, y], BODY)) continue;
      // exclure les passages de roue
      let skip = false;
      for (const [wx, wy, wr] of WHEELS) if (Math.hypot(x - wx, y - wy) < wr + 0.05) skip = true;
      if (skip) continue;
      const roof = y > 0.95;
      const w = roof ? half * (0.78 - (y - 0.95) * 0.35) : half;
      // coque : points en surface plutôt qu'en volume (silhouette lisible)
      const shell = Math.random() < 0.7;
      const z = shell ? (Math.random() < 0.5 ? -w : w) * rnd(0.86, 1) : rnd(-w, w);
      let cat = 0;
      if (roof && WINDOWS.some(p => inPoly([x, y], p)) && Math.abs(z) > w * 0.7) cat = 4; // verre
      else if (Math.abs(x) > 1.95 && y < 0.8) cat = 1; // pare-chocs
      else if (!shell && y < 0.9 && Math.abs(x) < 1.0) cat = Math.random() < 0.6 ? 1 : 0; // habitacle : plastiques
      else if (!shell && x > 1.1 && y < 0.85) cat = Math.random() < 0.45 ? 3 : 0; // compartiment moteur : fluides
      else if (!shell && Math.random() < 0.1) cat = 5;
      pts.push({ x, y, z, cat });
    }
    // roues : élastomères (pneu) + métal (jante)
    const perWheel = Math.floor(N * 0.07);
    for (const [wx, wy, wr] of WHEELS) for (const side of [-1, 1]) for (let i = 0; i < perWheel / 2; i++) {
      const a = rnd(0, Math.PI * 2); const tyre = Math.random() < 0.6;
      const r = tyre ? rnd(wr * 0.74, wr) : rnd(wr * 0.2, wr * 0.7);
      pts.push({ x: wx + Math.cos(a) * r, y: wy + Math.sin(a) * r, z: side * (half - 0.06) + rnd(-0.05, 0.05), cat: tyre ? 2 : 0 });
    }
    // équilibrage aux pourcentages réels
    const total = pts.length; const target = CATS.map(c => Math.round(total * c.pct / 100));
    const count = CATS.map(() => 0); pts.forEach(p => count[p.cat]++);
    // surplus -> métaux ; déficit -> pris parmi les métaux internes
    for (let c = 1; c < CATS.length; c++) {
      let diff = count[c] - target[c];
      for (let i = 0; i < pts.length && diff > 0; i++) if (pts[i].cat === c && Math.random() < 0.5) { pts[i].cat = 0; diff--; }
      for (let i = 0; i < pts.length && diff < 0; i++) if (pts[i].cat === 0 && Math.random() < 0.15) { pts[i].cat = c; diff++; }
    }
    return pts;
  }

  function buildTargets(pts) {
    // Colonnes proportionnelles : largeur fixe, hauteur ∝ %
    const n = CATS.length; const gap = 0.34; const colW = 0.62; const totalW = n * colW + (n - 1) * gap;
    const x0 = -totalW / 2 + colW / 2; const maxH = 3.0; const scale = maxH / CATS[0].pct;
    const heights = CATS.map(c => Math.max(0.22, c.pct * scale));
    const out = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      const c = p.cat; const h = heights[c]; const cx = x0 + c * (colW + gap);
      // remplir un pavé cx±colW/2, y∈[-1.4, -1.4+h], z∈±0.3
      const u = Math.random(), v = Math.random(), w = Math.random();
      const edge = Math.random() < 0.35;
      out[i * 3] = cx + (edge ? (u < 0.5 ? -1 : 1) * colW / 2 * rnd(0.9, 1) : rnd(-colW / 2, colW / 2));
      out[i * 3 + 1] = -1.45 + h * (edge ? v : Math.pow(v, 0.9));
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
    const cat = new Float32Array(pts.length);
    pts.forEach((p, i) => {
      const c = CATS[p.cat].color; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      size[i] = rnd(0.7, 1.6) * (p.cat === 0 ? 1 : 1.25); seed[i] = Math.random(); cat[i] = p.cat;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aCat', new THREE.BufferAttribute(cat, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uProgress: { value: 0 }, uMix: { value: 0 } },
      vertexShader: `
        attribute float aSize; attribute float aSeed; attribute float aCat;
        uniform float uTime; uniform float uPix; uniform float uProgress;
        varying vec3 vColor; varying float vA;
        void main(){
          vColor = color;
          vec3 p = position;
          float fl = sin(uTime*1.3 + aSeed*40.0)*0.012;
          p.y += fl;
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

    // sol : grille fine
    const grid = new THREE.GridHelper(30, 60, 0x2a3530, 0x1a221d);
    grid.position.y = -1.5; grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);

    // lignes de contour du profil (accent)
    const outline = new THREE.BufferGeometry().setFromPoints(BODY.concat([BODY[0]]).map(([x, y]) => new THREE.Vector3(x, y - 0.75, 0.95)));
    const outlineL = new THREE.Line(outline, new THREE.LineBasicMaterial({ color: 0xa0bf38, transparent: true, opacity: 0.25 }));
    const outlineR = outlineL.clone(); outlineR.position.z = -1.9;
    group.add(outlineL, outlineR);

    let progress = 0, target = 0, t = 0, mouseX = 0, mouseY = 0, isMobile = false;
    const stagger = pts.map(p => (p.x + 2.4) / 4.8); // vague de gauche à droite
    const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      isMobile = w < 800; camera.position.z = isMobile ? 15.5 : 8.4; group.position.y = isMobile ? 1.35 : 0;
    }
    window.addEventListener('resize', resize); resize();
    window.addEventListener('mousemove', e => { mouseX = (e.clientX / innerWidth - 0.5); mouseY = (e.clientY / innerHeight - 0.5); }, { passive: true });

    let visible = true;
    new IntersectionObserver(en => { visible = en[0].isIntersecting; }).observe(wrap);

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible) return;
      t = now * 0.001;
      progress += (target - progress) * 0.08;
      mat.uniforms.uTime.value = t; mat.uniforms.uProgress.value = progress;
      const p = geo.attributes.position.array;
      for (let i = 0; i < pts.length; i++) {
        const local = Math.min(1, Math.max(0, (progress * 1.5 - stagger[i] * 0.5)));
        const k = ease(local);
        const arc = Math.sin(k * Math.PI) * 0.9; // trajectoire en arche
        p[i * 3] = car[i * 3] + (tgt.arr[i * 3] - car[i * 3]) * k;
        p[i * 3 + 1] = car[i * 3 + 1] + (tgt.arr[i * 3 + 1] - car[i * 3 + 1]) * k + arc;
        p[i * 3 + 2] = car[i * 3 + 2] + (tgt.arr[i * 3 + 2] - car[i * 3 + 2]) * k;
      }
      geo.attributes.position.needsUpdate = true;
      const idle = reduced ? 0 : t * 0.12;
      group.rotation.y = (1 - progress) * (idle + 0.35) + progress * 0.0 + mouseX * 0.25;
      group.rotation.x = 0.06 + mouseY * 0.08;
      if (isMobile) { const sc = 1 - progress * 0.3; group.scale.setScalar(sc); group.position.y = 1.35 + progress * 1.1; }
      outlineL.material.opacity = 0.25 * (1 - progress);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    const api = {
      setProgress(v) { target = Math.min(1, Math.max(0, v)); },
      heights: tgt.heights, x0: tgt.x0, colW: tgt.colW, gap: tgt.gap, camera, group,
      project(x, y, z) { // -> % coordinates in wrap
        const v = new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld).project(camera);
        return { x: (v.x + 1) / 2 * 100, y: (1 - v.y) / 2 * 100 };
      }
    };
    return api;
  };

  /* Liaison scroll : pin du hero + labels de composition */
  INDRA.bindHeroScroll = function (api, pinEl, compoEl) {
    if (!api) return;
    const labels = CATS.map((c, i) => {
      const el = document.createElement('div'); el.className = 'compo__label';
      el.innerHTML = `<i></i><div class="num">${c.pct.toString().replace('.', ',')}<small> %</small></div><p>${c.label}</p>`;
      compoEl.appendChild(el); return el;
    });
    const place = () => {
      api.group.updateMatrixWorld();
      labels.forEach((el, i) => {
        const cx = api.x0 + i * (api.colW + api.gap);
        // étiquettes sous la base des colonnes (axe des x), jamais dans le titre
        const pr = api.project(cx, -1.45 - 0.22, 0.35);
        el.style.left = pr.x + '%'; el.style.top = Math.min(79, pr.y) + '%';
      });
    };
    window.addEventListener('resize', place);
    if (reduced || !window.gsap || !window.ScrollTrigger) { api.setProgress(0); return; }
    ScrollTrigger.create({
      trigger: pinEl, start: 'top top', end: '+=160%', pin: true, scrub: 0.4, anticipatePin: 1, refreshPriority: 10,
      onUpdate: self => {
        api.setProgress(self.progress);
        compoEl.classList.toggle('is-on', self.progress > 0.62);
        pinEl.classList.toggle('is-exploded', self.progress > 0.25);
        if (self.progress > 0.5) place();
      }
    });
    setTimeout(place, 600);
  };
})();
