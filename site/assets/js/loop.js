/* =====================================================================
   INDRA — La boucle The Future Is NEUTRAL en 3D (Three.js r128)
   Anneau orbital porté par cinq entités, flux de particules dans le sens
   de la boucle, noyau filaire au centre, étiquettes HTML projetées.
   ===================================================================== */
(function () {
  'use strict';
  window.INDRA = window.INDRA || {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;

  const NODES = [
    { name: 'INDRA', sub: 'Collecte · dépollution · démantèlement', indra: true },
    { name: 'The Remakers', sub: 'Remanufacturing' },
    { name: 'GAIA', sub: 'Matières · batteries' },
    { name: 'Boone Comenor', sub: 'Métaux · 47 sites' },
    { name: 'Renault Group', sub: 'Éco-conception · véhicules neufs' }
  ];

  function dotTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  }

  INDRA.initLoop = function (wrap) {
    if (!wrap || typeof THREE === 'undefined') return null;
    const canvas = document.createElement('canvas'); wrap.prepend(canvas);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { canvas.remove(); return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 3.4, 8.9); camera.lookAt(0, -0.15, 0);
    const tex = dotTexture();
    const root = new THREE.Group(); scene.add(root);
    const R = 2.25;

    // anneau principal + anneau externe pointillé
    root.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 220), new THREE.MeshBasicMaterial({ color: 0x4a555c, transparent: true, opacity: 0.9 }))).rotation.x = Math.PI / 2;
    const outerPts = []; for (let i = 0; i <= 220; i++) { const a = i / 220 * TAU; outerPts.push(new THREE.Vector3(Math.cos(a) * R * 1.22, 0, Math.sin(a) * R * 1.22)); }
    const outer = new THREE.Line(new THREE.BufferGeometry().setFromPoints(outerPts), new THREE.LineDashedMaterial({ color: 0x3a444b, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.8 }));
    outer.computeLineDistances(); root.add(outer);

    // nœuds + rayons vers le centre
    const nodeObjs = NODES.map((n, i) => {
      const a = Math.PI / 2 + i * TAU / NODES.length; // INDRA devant (côté caméra)
      const pos = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
      const g = new THREE.Group(); g.position.copy(pos); root.add(g);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(n.indra ? 0.17 : 0.1, 24, 24), new THREE.MeshBasicMaterial({ color: n.indra ? 0xa0bf38 : 0xd5dde2 }));
      g.add(sphere);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: n.indra ? 0xa0bf38 : 0x9fb0ba, transparent: true, opacity: n.indra ? 0.9 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(n.indra ? 1.3 : 0.7); g.add(glow);
      const spoke = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos.clone().multiplyScalar(0.62)]), new THREE.LineBasicMaterial({ color: n.indra ? 0xa0bf38 : 0x6b767e, transparent: true, opacity: n.indra ? 0.5 : 0.22 }));
      root.add(spoke);
      if (n.indra) { const halo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.33, 48), new THREE.MeshBasicMaterial({ color: 0xa0bf38, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); halo.rotation.x = Math.PI / 2; g.add(halo); g.userData.halo = halo; }
      return { def: n, group: g, glow, pos };
    });

    // noyau filaire (écosystème) : icosaèdre + noyau interne
    const core = new THREE.Group(); root.add(core);
    core.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.95, 1)), new THREE.LineBasicMaterial({ color: 0x7f8a92, transparent: true, opacity: 0.55 })));
    core.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.55, 0)), new THREE.LineBasicMaterial({ color: 0xa0bf38, transparent: true, opacity: 0.7 })));
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xa0bf38, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); coreGlow.scale.setScalar(2.4); core.add(coreGlow);

    // flux de particules le long de l'anneau (sens de la boucle) + flux radiaux INDRA → centre
    const NP = 420; const ang = new Float32Array(NP), spd = new Float32Array(NP), rad = new Float32Array(NP);
    const pPos = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) { ang[i] = Math.random() * TAU; spd[i] = 0.12 + Math.random() * 0.22; rad[i] = R + (Math.random() - 0.5) * 0.08; }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const flow = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: tex, color: 0xc9e45c, size: 0.11, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    root.add(flow);
    const NR = 90; const rT = new Float32Array(NR), rNode = new Uint8Array(NR); const rPos = new Float32Array(NR * 3);
    for (let i = 0; i < NR; i++) { rT[i] = Math.random(); rNode[i] = Math.floor(Math.random() * NODES.length); }
    const rGeo = new THREE.BufferGeometry(); rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    root.add(new THREE.Points(rGeo, new THREE.PointsMaterial({ map: tex, color: 0xb4bec5, size: 0.07, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));

    // étiquettes HTML projetées
    const labels = nodeObjs.map(o => {
      const el = document.createElement('div'); el.className = 'loop-label' + (o.def.indra ? ' is-indra' : '');
      el.innerHTML = `<b>${o.def.name}</b><span>${o.def.sub}</span>`; wrap.appendChild(el); return el;
    });
    const v = new THREE.Vector3();
    function placeLabels() {
      nodeObjs.forEach((o, i) => {
        o.group.getWorldPosition(v); v.y += o.def.indra ? 0.46 : 0.34; v.project(camera);
        const el = labels[i]; const depth = (v.z + 1) / 2; // 0 proche → 1 lointain
        el.style.left = (v.x + 1) / 2 * 100 + '%'; el.style.top = (1 - v.y) / 2 * 100 + '%';
        el.style.opacity = String(Math.min(1, 1.12 - depth * 0.42)); el.style.transform = `translate(-50%, -100%) scale(${1.06 - depth * 0.18})`;
        el.style.zIndex = String(Math.round((1 - depth) * 10));
      });
    }

    let mx = 0, my = 0, t0 = 0, visible = true;
    wrap.addEventListener('mousemove', e => { const r = wrap.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });
    wrap.addEventListener('mouseleave', () => { mx = 0; my = 0; });
    new IntersectionObserver(en => visible = en[0].isIntersecting).observe(wrap);
    function resize() { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    addEventListener('resize', resize); resize();

    let rot = 0, last = 0;
    function frame(now) {
      requestAnimationFrame(frame); if (!visible) { last = now; return; }
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now; const t = now * 0.001;
      if (!reduced) rot += dt * 0.09;
      root.rotation.y = rot + mx * 0.6; root.rotation.x = my * 0.18;
      core.rotation.y = -t * 0.25; core.rotation.x = t * 0.12; coreGlow.material.opacity = 0.3 + 0.1 * Math.sin(t * 1.6);
      // particules sur l'anneau
      for (let i = 0; i < NP; i++) { if (!reduced) ang[i] -= dt * spd[i]; pPos[i * 3] = Math.cos(ang[i]) * rad[i]; pPos[i * 3 + 1] = Math.sin(t * 2 + i) * 0.02; pPos[i * 3 + 2] = Math.sin(ang[i]) * rad[i]; }
      pGeo.attributes.position.needsUpdate = true;
      // particules radiales : des nœuds vers le noyau
      for (let i = 0; i < NR; i++) { if (!reduced) { rT[i] += dt * 0.28; if (rT[i] > 1) { rT[i] = 0; rNode[i] = Math.floor(Math.random() * NODES.length); } } const p = nodeObjs[rNode[i]].pos; const k = 1 - rT[i]; rPos[i * 3] = p.x * k * 0.92; rPos[i * 3 + 1] = Math.sin(rT[i] * Math.PI) * 0.35; rPos[i * 3 + 2] = p.z * k * 0.92; }
      rGeo.attributes.position.needsUpdate = true;
      // pulsations
      nodeObjs.forEach((o, i) => { const s = (o.def.indra ? 1.3 : 0.7) * (1 + 0.12 * Math.sin(t * 2.2 + i)); o.glow.scale.setScalar(s); if (o.group.userData.halo) { const h = o.group.userData.halo; const k = (t * 0.6) % 1; h.scale.setScalar(1 + k * 1.6); h.material.opacity = 0.8 * (1 - k); } });
      root.updateMatrixWorld(); placeLabels();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
    return { root };
  };
})();
