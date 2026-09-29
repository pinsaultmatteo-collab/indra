/* =====================================================================
   INDRA — Vue éclatée 3D d'un pack batterie lithium-ion (Three.js r128)
   Illustre la mise en sécurité, l'extraction des modules et le transport
   ADR. Progression pilotée au scroll (GSAP ScrollTrigger) ou au survol.
   ===================================================================== */
(function () {
  'use strict';
  window.INDRA = window.INDRA || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  INDRA.initBattery = function (wrap, opts) {
    if (!wrap || typeof THREE === 'undefined') return null;
    opts = Object.assign({ trigger: null }, opts || {});
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { canvas.remove(); return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(7.5, 6.2, 9.5); camera.lookAt(0, 0.6, 0);

    scene.add(new THREE.HemisphereLight(0xdfe8ee, 0x0a0d0b, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(6, 10, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xa0bf38, 0.6); rim.position.set(-8, 4, -6); scene.add(rim);

    const steel = new THREE.MeshStandardMaterial({ color: 0x47525a, metalness: 0.75, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b2226, metalness: 0.6, roughness: 0.5 });
    const cellMat = new THREE.MeshStandardMaterial({ color: 0x7d8992, metalness: 0.8, roughness: 0.3 });
    const green = new THREE.LineBasicMaterial({ color: 0xa0bf38, transparent: true, opacity: 0.9 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xf0a030, emissive: 0x552800, metalness: 0.2, roughness: 0.5 });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x7fd3e8, transparent: true, opacity: 0.12, metalness: 0.1, roughness: 0.2, side: THREE.DoubleSide });

    const root = new THREE.Group(); scene.add(root);
    const edges = (geo, m) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), m || green);

    // plateau
    const trayG = new THREE.BoxGeometry(7.2, 0.26, 4.4);
    const tray = new THREE.Mesh(trayG, dark); tray.position.y = -0.13; root.add(tray); root.add(edges(trayG, new THREE.LineBasicMaterial({ color: 0x6b767e, transparent: true, opacity: 0.5 }))).position.y = -0.13;
    // couvercle
    const coverG = new THREE.BoxGeometry(7.2, 0.14, 4.4);
    const cover = new THREE.Group(); const coverM = new THREE.Mesh(coverG, cyan); cover.add(coverM); cover.add(edges(coverG)); cover.position.y = 1.02; root.add(cover);

    // modules
    const modules = []; const cols = 4, rows = 2; const mw = 1.55, md = 1.9, mh = 0.78;
    const cellG = new THREE.BoxGeometry(0.11, mh - 0.1, md - 0.2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, md), steel); shell.material = steel.clone(); shell.material.transparent = true; shell.material.opacity = 0.35; g.add(shell);
      g.add(edges(new THREE.BoxGeometry(mw, mh, md)));
      for (let k = 0; k < 12; k++) { const cell = new THREE.Mesh(cellG, cellMat); cell.position.x = -mw / 2 + 0.12 + k * ((mw - 0.24) / 11); g.add(cell); }
      // bornes
      const term = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), orange); term.position.set(-mw / 2 + 0.25, mh / 2 + 0.04, -md / 2 + 0.25); g.add(term);
      const term2 = term.clone(); term2.position.set(mw / 2 - 0.25, mh / 2 + 0.04, -md / 2 + 0.25); g.add(term2);
      const x = -((cols - 1) / 2) * (mw + 0.18) + c * (mw + 0.18); const z = -((rows - 1) / 2) * (md + 0.22) + r * (md + 0.22);
      g.position.set(x, mh / 2 + 0.02, z); g.userData.base = g.position.clone(); g.userData.i = r * cols + c; root.add(g); modules.push(g);
    }
    // connecteur HV (service plug) + faisceau orange
    const plug = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), orange); plug.position.set(3.0, 1.15, 1.6); root.add(plug);
    const wireCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(3.0, 1.0, 1.6), new THREE.Vector3(1.5, 1.05, 1.9), new THREE.Vector3(-1.5, 1.05, 1.9), new THREE.Vector3(-3.2, 1.0, 1.4)]);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 40, 0.045, 8, false), orange); root.add(wire);
    // grille sol
    const grid = new THREE.GridHelper(20, 40, 0x232b26, 0x171d19); grid.position.y = -0.3; scene.add(grid);

    let progress = 0, target = 0, hoverT = 0, mx = 0;
    function resize() { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();
    wrap.addEventListener('mousemove', e => { const r = wrap.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; });
    let visible = true; new IntersectionObserver(en => visible = en[0].isIntersecting).observe(wrap);

    function frame(now) {
      requestAnimationFrame(frame); if (!visible) return;
      const t = now * 0.001;
      progress += (Math.max(target, hoverT) - progress) * 0.07;
      const e = progress < 0.5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      cover.position.y = 1.02 + e * 3.4; coverM.material.opacity = 0.12 * (1 - e * 0.5);
      modules.forEach(m => {
        const i = m.userData.i; const lift = 0.9 + (i % 4) * 0.55 + Math.floor(i / 4) * 0.3;
        const local = Math.min(1, Math.max(0, (e * 1.4 - (i % 4) * 0.08)));
        m.position.y = m.userData.base.y + local * lift;
        m.position.x = m.userData.base.x * (1 + local * 0.22); m.position.z = m.userData.base.z * (1 + local * 0.35);
        m.rotation.z = local * (i % 2 ? 0.06 : -0.06);
      });
      plug.position.y = 1.15 + e * 4.6; wire.material.opacity = 1; wire.visible = e < 0.55;
      root.rotation.y = (reduced ? 0 : t * 0.16) + mx * 0.5;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);

    if (!reduced && window.gsap && window.ScrollTrigger && opts.trigger) {
      ScrollTrigger.create({ trigger: opts.trigger, start: 'top 70%', end: 'bottom 45%', scrub: 0.6, onUpdate: s => { target = s.progress; } });
    } else { target = 0.6; }
    wrap.addEventListener('mouseenter', () => hoverT = 0.85); wrap.addEventListener('mouseleave', () => hoverT = 0);
    return { setProgress: v => target = v };
  };
})();
