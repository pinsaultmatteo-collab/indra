/* =====================================================================
   INDRA — Carte interactive du réseau (SVG) : centres agréés, 96
   départements, 5 DROM en encarts, recherche, sites détenus, types de
   centres issus de la plateforme SIRA (experts électriques, réseau
   assureur, réseau assistance) avec filtres.
   Données : assets/data/france.js (FRANCE_DEPTS), assets/data/reseau.js
   Champ « k » d'un centre : e = expert électrique, a = réseau assureur,
   s = réseau assistance, i = site INDRA, h = habilitation électrique B2XL
   ===================================================================== */
(function () {
  'use strict';
  window.INDRA = window.INDRA || {};
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 9 sites de déconstruction détenus
  const OWN = [
    { n: 'A7 Auto Pièces', v: 'Seyssuel', d: '38', lat: 45.556, lng: 4.846 },
    { n: 'Site industriel de Pruniers-en-Sologne', v: 'Pruniers-en-Sologne', d: '41', lat: 47.318, lng: 1.663 },
    { n: 'Cars Pièces Express', v: 'Auxerre', d: '89', lat: 47.798, lng: 3.573 },
    { n: 'Re-source Industries 47', v: 'Allez-et-Cazeneuve', d: '47', lat: 44.386, lng: 0.664 },
    { n: 'ACCIAUTO', v: 'Valence-d\'Agen', d: '82', lat: 44.108, lng: 0.891 },
    { n: 'ADCO (Auto&Co / Moto&Co)', v: 'Chambray-lès-Tours', d: '37', lat: 47.336, lng: 0.706 },
    { n: 'SMAP', v: 'Saint-Marcel', d: '71', lat: 46.774, lng: 4.897 },
    { n: 'TDA', v: 'Tournus', d: '71', lat: 46.563, lng: 4.906 },
    { n: 'Re-source Industries 17', v: 'Cabariot', d: '17', lat: 45.948, lng: -0.842 }
  ];
  const HQ = { n: 'Siège INDRA', v: 'Vaulx-Milieu', d: '38', lat: 45.618, lng: 5.184 };
  const K = Math.cos(46.5 * Math.PI / 180);
  const proj = (lng, lat) => [(lng + 5.5) * K * 60, (51.3 - lat) * 60];
  const DROM = { '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte' };
  INDRA.OWN_SITES = OWN;

  // Types de centres filtrables (libellés repris de la plateforme SIRA)
  const TYPES = [
    { key: null, label: 'Tous les centres', swatch: 'all' },
    { key: 'e', label: 'Centres experts électriques', swatch: 'ev' },
    { key: 'a', label: 'Réseau assureur', swatch: 'ins' },
    { key: 's', label: 'Réseau assistance', swatch: 'ast' },
    { key: 'i', label: 'Sites INDRA', swatch: 'own' }
  ];
  const BADGES = { e: 'Centre expert électrique', a: 'Réseau assureur', s: 'Réseau assistance', i: 'Site INDRA', h: 'Habilitation électrique B2XL' };
  INDRA.CENTRE_TYPES = TYPES;

  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  const has = (c, f) => (c.k || '').indexOf(f) !== -1;

  INDRA.initMap = function (container, opts) {
    opts = Object.assign({ compact: false, interactive: true, ownSites: true }, opts || {});
    const depts = window.FRANCE_DEPTS || []; const centres = window.INDRA_CENTRES || [];
    if (!container || !depts.length) return;
    const svg = el('svg', { viewBox: opts.compact ? '20 0 620 590' : '0 0 640 600', class: 'map-svg', role: 'img', 'aria-label': 'Carte des centres du réseau INDRA' });
    const gD = el('g', { class: 'map-depts' }, svg); const gI = el('g', { class: 'map-insets' }, svg);
    const gH = el('g', { class: 'map-halos' }, svg); const gP = el('g', { class: 'map-pts' }, svg);
    const gE = el('g', { class: 'map-pts map-pts--ev' }, svg); const gS = el('g', { class: 'map-sites' }, svg);
    const byDept = {};
    depts.forEach(d => { const p = el('path', { d: d.d, class: 'map-dept', 'data-code': d.c }, gD); byDept[d.c] = p; p.appendChild(document.createElementNS(NS, 'title')).textContent = `${d.n} (${d.c})`; });

    // encarts DROM
    const insets = {}; const keys = Object.keys(DROM); const bx = 24, by = 470, bw = 74, bh = 60;
    keys.forEach((k, i) => {
      const gx = i < 3 ? bx + (i % 3) * (bw + 8) : bx + (i - 3) * (bw + 8); const gy = i < 3 ? by : by + bh + 8;
      el('rect', { x: gx, y: gy, width: bw, height: bh, class: 'map-inset' }, gI);
      const t = el('text', { x: gx + 6, y: gy + bh - 6, class: 'map-inset-label' }, gI); t.textContent = DROM[k].toUpperCase();
      insets[k] = { x: gx, y: gy, w: bw, h: bh, i: 0 };
    });
    if (opts.compact) { gI.style.display = 'none'; }

    // points : centres classiques, puis centres experts électriques au-dessus (point jaune + anneau)
    const pts = [];
    centres.forEach((c, idx) => {
      let x = c.x, y = c.y;
      if (c.d.length === 3 && insets[c.d]) { const b = insets[c.d]; b.i++; x = b.x + 14 + (b.i * 13) % (b.w - 28); y = b.y + 14 + Math.floor((b.i * 13) / (b.w - 28)) * 12; if (opts.compact) return; }
      const ev = has(c, 'e');
      const base = opts.compact ? 2.2 : 2.6; const r = ev ? base * 1.45 : base;
      const parent = ev ? gE : gP;
      const ring = ev ? el('circle', { cx: x, cy: y, r: r + 2.6, class: 'map-ev-ring' }, parent) : null;
      const p = el('circle', { cx: x, cy: y, r, class: 'map-pt' + (ev ? ' is-ev' : ''), 'data-i': idx, 'data-d': c.d, tabindex: opts.interactive ? 0 : -1 }, parent);
      pts.push({ el: p, ring, c, x, y, r });
    });
    // sites détenus + siège
    if (opts.ownSites) {
      OWN.forEach(s => { const [x, y] = proj(s.lng, s.lat); const g = el('g', { transform: `translate(${x} ${y})`, class: 'map-site-g' }, gS); el('rect', { x: -4.5, y: -4.5, width: 9, height: 9, transform: 'rotate(45)', class: 'map-site' }, g); g.appendChild(document.createElementNS(NS, 'title')).textContent = `${s.n} — ${s.v} (${s.d}) · site détenu`; });
      const [hx, hy] = proj(HQ.lng, HQ.lat); const h = el('g', { transform: `translate(${hx} ${hy})` }, gS);
      el('circle', { r: 7, fill: 'none', stroke: '#a0bf38', 'stroke-width': 1, 'stroke-dasharray': '2 2' }, h); el('circle', { r: 2.2, fill: '#a0bf38' }, h);
      h.appendChild(document.createElementNS(NS, 'title')).textContent = 'Siège INDRA — Vaulx-Milieu (38)';
    }
    container.appendChild(svg);

    // révélation en vague (de l'Isère vers l'extérieur)
    const [ox, oy] = proj(HQ.lng, HQ.lat);
    const reveal = () => {
      pts.forEach(p => { const d = Math.hypot(p.x - ox, p.y - oy); setTimeout(() => { p.el.classList.add('is-in'); if (p.ring) p.ring.classList.add('is-in'); }, reduced ? 0 : 120 + d * 2.1 + Math.random() * 90); });
      if (!reduced) setTimeout(() => { for (let i = 0; i < 6; i++) { const p = pts[Math.floor(Math.random() * pts.length)]; if (!p) continue; const h = el('circle', { cx: p.x, cy: p.y, r: 3, class: 'map-halo is-on' }, gH); h.style.animationDelay = (i * 0.4) + 's'; } }, 1800);
    };
    const io = new IntersectionObserver(en => { if (en[0].isIntersecting) { reveal(); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(container);

    if (!opts.interactive) return { svg };

    // tooltip
    const tip = document.createElement('div'); tip.className = 'map-tooltip'; container.appendChild(tip);
    const show = (p) => {
      const c = p.c;
      const badges = 'easih'.split('').filter(f => has(c, f)).map(f => `<i class="map-badge map-badge--${f}">${BADGES[f]}</i>`).join('');
      tip.innerHTML = `<b>${c.n}</b>${c.a ? `<span>${c.a}</span>` : ''}<span>${c.cp} ${c.v}</span>${c.t ? `<span>${c.t}</span>` : ''}<em>Centre VHU agréé · réseau INDRA</em>${badges ? `<div class="map-badges">${badges}</div>` : ''}`;
      const r = container.getBoundingClientRect(); const pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y; const s = pt.matrixTransform(svg.getScreenCTM());
      tip.style.left = (s.x - r.left) + 'px'; tip.style.top = (s.y - r.top) + 'px'; tip.classList.add('is-on');
    };
    const hide = () => tip.classList.remove('is-on');
    pts.forEach(p => { p.el.addEventListener('mouseenter', () => show(p)); p.el.addEventListener('focus', () => show(p)); p.el.addEventListener('mouseleave', hide); p.el.addEventListener('blur', hide); });

    // état : filtre de type + recherche
    let filter = null, query = '';
    const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const inFilter = c => !filter || has(c, filter);
    const inQuery = c => !query || norm(c.v).includes(query) || c.cp.startsWith(query) || norm(c.n).includes(query) || c.d === query.toUpperCase();
    const setDim = (p, dim) => { p.el.classList.toggle('is-dim', dim); if (p.ring) p.ring.classList.toggle('is-dim', dim); };
    const apply = () => {
      const active = !!(filter || query);
      pts.forEach(p => setDim(p, active && !(inFilter(p.c) && inQuery(p.c))));
      svg.classList.toggle('is-filtered', !!filter);
      svg.setAttribute('data-filter', filter || '');
      gS.classList.toggle('is-dim', !!filter && filter !== 'i');
      gS.classList.toggle('is-hi', filter === 'i');
    };
    gD.addEventListener('mouseover', e => { if (filter || query) return; const t = e.target.closest('.map-dept'); if (!t) return; const code = t.dataset.code; pts.forEach(p => setDim(p, p.c.d !== code)); });
    gD.addEventListener('mouseleave', () => { if (!filter && !query) pts.forEach(p => setDim(p, false)); });

    // panneau : recherche, filtres par type, liste de résultats
    const panel = opts.panel ? document.querySelector(opts.panel) : null;
    if (panel) {
      const input = panel.querySelector('input'); const results = panel.querySelector('.map-results'); const count = panel.querySelector('.map-count');
      const filtersEl = panel.querySelector('.map-filters');
      const countOf = key => key === 'i' ? OWN.length : key ? centres.filter(c => has(c, key)).length : centres.length;
      if (filtersEl) {
        filtersEl.innerHTML = TYPES.map(t => `<button type="button" class="map-filter${t.key === null ? ' is-on' : ''}" data-key="${t.key || ''}" aria-pressed="${t.key === null}"><i class="map-swatch map-swatch--${t.swatch}"></i><span>${t.label}</span><b>${countOf(t.key)}</b></button>`).join('');
        filtersEl.addEventListener('click', e => {
          const b = e.target.closest('.map-filter'); if (!b) return;
          const key = b.dataset.key || null;
          filter = (key === filter) ? null : key; // un second clic sur un filtre actif revient à « Tous »
          filtersEl.querySelectorAll('.map-filter').forEach(x => { const on = (x.dataset.key || null) === filter; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
          render();
        });
      }
      const row = (c, i) => `<div class="map-result" data-i="${i}"><div><b>${has(c, 'e') ? '<i class="map-dot map-dot--ev" title="Centre expert électrique"></i>' : ''}${c.n}</b><span>${c.a ? c.a + ', ' : ''}${c.cp} ${c.v}</span></div><em>${c.d}</em></div>`;
      const render = () => {
        query = norm(input.value.trim());
        const codes = new Set();
        Object.values(byDept).forEach(p => p.classList.remove('is-active'));
        let html = '', n = 0;
        if (filter === 'i' && !query) {
          html = OWN.map(s => `<div class="map-result"><div><b>${s.n}</b><span>${s.v}</span></div><em>${s.d}</em></div>`).join(''); n = OWN.length;
          OWN.forEach(s => codes.add(s.d));
        } else if (filter || query) {
          const list = centres.filter(c => inFilter(c) && inQuery(c)); n = list.length;
          list.forEach(c => codes.add(c.d));
          html = list.slice(0, 80).map(c => row(c, centres.indexOf(c))).join('') || '<div class="map-result"><span>Aucun centre pour cette recherche. Essayez une ville, un code postal ou un numéro de département.</span></div>';
        }
        if (query) codes.forEach(code => byDept[code] && byDept[code].classList.add('is-active'));
        results.innerHTML = html;
        results.classList.toggle('is-empty', !html);
        apply();
        if (count) {
          const t = TYPES.find(x => x.key === filter);
          count.innerHTML = (filter || query)
            ? `<b>${n}</b> ${filter === 'i' && !query ? 'sites détenus' : (n > 1 ? 'centres' : 'centre')}${filter ? ` · ${t.label.toLowerCase()}` : ''}${query ? ' · recherche' : ''}`
            : `<b>${centres.length}</b> centres agréés · <b>${Object.keys(byDept).length}</b> départements · <b>5</b> DROM`;
        }
      };
      input.addEventListener('input', render); render();
      const findPt = r => r && r.dataset.i ? pts.find(x => x.c === centres[r.dataset.i]) : null;
      results.addEventListener('mouseover', e => { const p = findPt(e.target.closest('.map-result')); if (p) { show(p); p.el.setAttribute('r', p.r * 1.9); } });
      results.addEventListener('mouseout', e => { const p = findPt(e.target.closest('.map-result')); if (p) { hide(); p.el.setAttribute('r', p.r); } });
    }
    return { svg, pts };
  };
})();
