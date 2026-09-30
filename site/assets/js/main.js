/* =====================================================================
   INDRA — core interactions : layout, menu, smooth scroll, reveals,
   counters, cursor, parallax, gauges, timeline drag, accordions
   ===================================================================== */
(function () {
  'use strict';
  window.INDRA = window.INDRA || {};
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  INDRA.ARROW = ARROW;

  /* ---------------- Navigation model ---------------- */
  const NAV = [
    { href: 'assureurs.html', label: 'Assureurs', audience: true },
    { href: 'constructeurs.html', label: 'Constructeurs', audience: true },
    { href: 'reseau.html', label: 'Le réseau' },
    { href: 'innovation.html', label: 'Innovation & R&D' },
    { href: 'aureca.html', label: 'AURECA' },
    { href: 'a-propos.html', label: 'À propos' }
  ];
  const MENU_PRIMARY = [
    ['index.html', 'Accueil'],
    ['assureurs.html', 'Assureurs'],
    ['constructeurs.html', 'Constructeurs'],
    ['reseau.html', 'Le réseau'],
    ['sites-industriels.html', 'Nos sites industriels'],
    ['pieces-reemploi.html', 'Pièces de réemploi'],
    ['innovation.html', 'Innovation & R&D'],
    ['aureca.html', 'AURECA formation'],
    ['a-propos.html', 'À propos'],
    ['actualites.html', 'Actualités & presse']
  ];
  // Page courante, tolérante aux URL propres (/assureurs) comme aux fichiers (/assureurs.html)
  const page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  const isCurrent = href => href.replace(/\.html$/, '') === page;

  function renderHeader() {
    const links = NAV.map(n => `<a href="${n.href}" class="${n.audience ? 'is-audience' : ''} ${isCurrent(n.href) ? 'is-active' : ''}">${n.label}</a>`).join('');
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <nav class="nav" aria-label="Navigation principale">
        <a class="nav__logo" href="index.html" aria-label="INDRA Automobile Recycling — accueil"><img src="assets/img/logo-indra-white.svg" alt="INDRA Automobile Recycling" width="212" height="90"></a>
        <div class="nav__links">${links}</div>
        <div class="nav__right">
          <a href="contact.html" class="btn btn--sm nav__cta-desktop">Prendre rendez-vous ${ARROW}</a>
          <button class="burger" aria-expanded="false" aria-controls="menu"><span class="burger__label">Menu</span><span class="burger__icon"><span></span><span></span><span></span></span></button>
        </div>
      </nav>`;
    const menu = document.createElement('div');
    menu.className = 'menu-overlay grid-bg';
    menu.id = 'menu';
    menu.innerHTML = `
      <div class="menu-inner">
        <ul class="menu-primary">
          ${MENU_PRIMARY.map((m, i) => `<li style="--i:${i}"><a href="${m[0]}"><span class="idx">${String(i + 1).padStart(2, '0')}</span>${m[1]}</a></li>`).join('')}
        </ul>
        <div class="menu-secondary">
          <div>
            <h4>Vous êtes</h4>
            <div class="menu-audiences">
              <a href="assureurs.html">Assureur ${ARROW}</a>
              <a href="constructeurs.html">Constructeur ${ARROW}</a>
              <a href="reseau.html#rejoindre">Centre VHU ${ARROW}</a>
              <a href="pieces-reemploi.html">Réparateur ${ARROW}</a>
              <a href="contact.html#collectivites">Collectivité / SDIS ${ARROW}</a>
              <a href="particuliers.html">Particulier ${ARROW}</a>
            </div>
          </div>
          <div>
            <h4>Accès directs</h4>
            <a href="contact.html">Contact & rendez-vous grands comptes</a>
            <a href="https://sira.indra.fr" target="_blank" rel="noopener">SIRA — réseaux assurance</a>
            <a href="https://www.goodbye-car.com" target="_blank" rel="noopener">Goodbye Car — particuliers</a>
            <a href="https://www.opisto.fr" target="_blank" rel="noopener">Opisto — pièces de réemploi</a>
            <a href="aureca.html#catalogue">Catalogue de formations AURECA</a>
            <a href="a-propos.html#carrieres">Carrières</a>
          </div>
          <div class="ticker-line">Siège · Vaulx-Milieu (38) · contact@indra.fr</div>
        </div>
      </div>`;
    document.body.prepend(menu);
    document.body.prepend(header);

    const burger = $('.burger', header);
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
      burger.querySelector('.burger__label').textContent = open ? 'Fermer' : 'Menu';
      if (INDRA.lenis) open ? INDRA.lenis.stop() : INDRA.lenis.start();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click(); });

    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
      lastY = y;
      const tt = $('.to-top'); if (tt) tt.classList.toggle('is-on', y > 900);
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  function renderFooter() {
    const f = document.createElement('footer');
    f.className = 'footer';
    f.innerHTML = `
      <div class="container">
        <div class="footer__top">
          <div class="footer__brand">
            <img src="assets/img/logo-indra-white.svg" alt="INDRA Automobile Recycling">
            <p>Le 1<sup>er</sup> réseau français du recyclage automobile depuis 1985. Industriel, tête de réseau, bureau d'études et organisme de formation.</p>
          </div>
          <div><h4>Vous êtes</h4><ul>
            <li><a href="assureurs.html">Assureur</a></li><li><a href="constructeurs.html">Constructeur</a></li><li><a href="reseau.html#rejoindre">Centre VHU</a></li><li><a href="pieces-reemploi.html">Réparateur, carrossier</a></li><li><a href="contact.html#collectivites">Collectivité, SDIS</a></li><li><a href="particuliers.html">Particulier</a></li></ul></div>
          <div><h4>INDRA</h4><ul>
            <li><a href="reseau.html">Le réseau</a></li><li><a href="sites-industriels.html">Nos sites industriels</a></li><li><a href="pieces-reemploi.html">Pièces de réemploi</a></li><li><a href="innovation.html">Innovation & R&D</a></li><li><a href="aureca.html">AURECA formation</a></li></ul></div>
          <div><h4>Groupe</h4><ul>
            <li><a href="a-propos.html">À propos · 40 ans</a></li><li><a href="a-propos.html#gouvernance">Gouvernance</a></li><li><a href="a-propos.html#rse">Engagements & certifications</a></li><li><a href="a-propos.html#carrieres">Carrières</a></li><li><a href="actualites.html">Actualités & presse</a></li></ul></div>
          <div><h4>Outils</h4><ul>
            <li><a href="https://sira.indra.fr" target="_blank" rel="noopener">SIRA</a></li><li><a href="https://www.opisto.fr" target="_blank" rel="noopener">Opisto</a></li><li><a href="https://www.goodbye-car.com" target="_blank" rel="noopener">Goodbye Car</a></li><li><a href="https://reseau.goodbye-car.com/cvhu" target="_blank" rel="noopener">Portail CVHU</a></li><li><a href="contact.html">Contact</a></li></ul></div>
        </div>
        <div class="footer__tfin">
          <img src="assets/img/logos/tfin.png" alt="The Future Is NEUTRAL">
          <span>INDRA Automobile Recycling est une entreprise de <b>The Future Is NEUTRAL</b>, l'écosystème d'économie circulaire automobile de Renault Group et Suez.</span>
        </div>
        <div class="footer__bottom">
          <span>© ${new Date().getFullYear()} INDRA SAS · ZAC Business Airport, 80 av. Condorcet, 38090 Vaulx-Milieu · RCS Vienne 400 641 296</span>
          <span><a href="#">Mentions légales</a> · <a href="#">Données personnelles</a> · <a href="https://www.linkedin.com/company/indra-sas" target="_blank" rel="noopener">LinkedIn</a></span>
          <span class="footer__credit">Visuel d'accueil : Renault Clio III, photo <a href="https://commons.wikimedia.org/wiki/File:Renault_Clio_3_-_Phase_2_2009_-_Rot_-_1.5dci.png" target="_blank" rel="noopener">Daddi09</a>, <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.fr" target="_blank" rel="noopener">CC BY-SA 3.0</a>, via Wikimedia Commons, détourée</span>
        </div>
      </div>
      <div class="footer__big" aria-hidden="true">INDRA</div>
      <button class="to-top" aria-label="Retour en haut"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>`;
    document.body.append(f);
    $('.to-top', f).addEventListener('click', () => INDRA.lenis ? INDRA.lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------------- Preloader ---------------- */
  function preloader() {
    if (reduced || sessionStorage.getItem('indra-loaded')) { document.body.classList.add('is-ready'); return; }
    const p = document.createElement('div');
    p.className = 'preloader';
    p.innerHTML = `<div><img class="preloader__mark" src="assets/img/logo-indra-white.svg" alt=""><div class="preloader__bar"><span></span></div></div>`;
    document.body.append(p);
    if (INDRA.lenis) INDRA.lenis.stop();
    setTimeout(() => { p.classList.add('is-done'); document.body.classList.add('is-ready'); if (INDRA.lenis) INDRA.lenis.start(); sessionStorage.setItem('indra-loaded', '1'); setTimeout(() => p.remove(), 1200); }, 1500);
  }

  /* ---------------- Smooth scroll ---------------- */
  function smooth() {
    if (reduced || typeof Lenis === 'undefined') return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
    INDRA.lenis = lenis;
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // anchor links
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href') === '#') return;
      const el = document.querySelector(a.getAttribute('href'));
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -80 }); }
    });
    if (location.hash) { const el = document.querySelector(location.hash); if (el) setTimeout(() => lenis.scrollTo(el, { offset: -80, immediate: true }), 100); }
  }

  /* ---------------- Text splitting ---------------- */
  function splitWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.append(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = tok; w.append(inner); frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && !child.classList.contains('w')) walk(child);
      });
    };
    walk(el);
    $$('.w', el).forEach((w, i) => w.style.setProperty('--i', i));
  }
  function splitLines(el) {
    if (el.dataset.split) return; el.dataset.split = '1';
    const html = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = html.map((h, i) => `<span class="line"><span style="--i:${i}">${h}</span></span>`).join('');
  }

  /* ---------------- Reveals ---------------- */
  function reveals() {
    $$('.split-words').forEach(splitWords);
    $$('.reveal-lines').forEach(splitLines);
    const targets = $$('[data-reveal], .split-words, .reveal-lines, .draw-line, .gauge, .bars, .matter-grid');
    if (reduced) { targets.forEach(t => t.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach(t => io.observe(t));
    // stagger helper: children of [data-stagger]
    $$('[data-stagger]').forEach(p => { Array.from(p.children).forEach((c, i) => { if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', ''); c.style.setProperty('--d', (i * (parseFloat(p.dataset.stagger) || 0.08)) + 's'); io.observe(c); }); });
  }

  /* ---------------- Counters ---------------- */
  function counters() {
    const fmt = (n, dec) => {
      const s = n.toFixed(dec);
      const [int, d] = s.split('.');
      return int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d ? ',' + d : '');
    };
    const els = $$('[data-count]');
    const run = el => {
      const end = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.dec || '0', 10);
      const prefix = el.dataset.prefix || ''; const suffix = el.dataset.suffix || '';
      const dur = parseFloat(el.dataset.dur || '2.2') * 1000; const t0 = performance.now();
      const tick = t => {
        const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 4);
        el.textContent = prefix + fmt(end * e, dec) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (reduced) { els.forEach(el => { el.textContent = (el.dataset.prefix || '') + fmt(parseFloat(el.dataset.count), parseInt(el.dataset.dec || '0', 10)) + (el.dataset.suffix || ''); }); return; }
    const io = new IntersectionObserver(en => en.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  /* ---------------- Statement word lighting (scroll) ---------------- */
  function statements() {
    const els = $$('.statement');
    if (!els.length) return;
    els.forEach(splitWords);
    els.forEach(el => $$('.w', el).forEach(w => { if (/\*$/.test(w.textContent)) { w.classList.add('is-key'); w.firstChild.textContent = w.textContent.replace(/\*$/, ''); } }));
    if (reduced) { els.forEach(el => $$('.w', el).forEach(w => w.classList.add('is-lit'))); return; }
    const update = () => {
      els.forEach(el => {
        const r = el.getBoundingClientRect(); const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (r.height + vh * 0.25)));
        const ws = $$('.w', el); const n = Math.floor(p * ws.length * 1.15);
        ws.forEach((w, i) => w.classList.toggle('is-lit', i < n));
      });
    };
    window.addEventListener('scroll', update, { passive: true }); update();
  }

  /* ---------------- Parallax ---------------- */
  function parallax() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    $$('[data-parallax]').forEach(el => {
      const img = el.querySelector('img'); if (!img) return;
      const amt = parseFloat(el.dataset.parallax) || 14;
      gsap.fromTo(img, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.page-hero__bg img').forEach(img => {
      gsap.to(img, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: img.closest('.page-hero'), start: 'top top', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------- Cursor + magnetic ---------------- */
  function cursor() {
    if (window.matchMedia('(hover: none)').matches || reduced) return;
    const c = document.createElement('div'); c.className = 'cursor'; c.innerHTML = '<div class="cursor__ring"></div><div class="cursor__dot"></div>';
    document.body.append(c);
    const ring = $('.cursor__ring', c), dot = $('.cursor__dot', c);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    const loop = () => { rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('a, button, .map-pt, .tl-track, [data-cursor]');
      document.body.classList.toggle('cursor-hover', !!t && !t.classList.contains('tl-track'));
      document.body.classList.toggle('cursor-drag', !!t && (t.classList.contains('tl-track') || t.dataset.cursor === 'drag'));
    });
  }

  /* ---------------- Timelines (drag) ---------------- */
  function timelines() {
    $$('.tl-track').forEach(track => {
      let down = false, sx = 0, sl = 0;
      track.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sl = track.scrollLeft; track.classList.add('is-dragging'); });
      window.addEventListener('pointerup', () => { down = false; track.classList.remove('is-dragging'); });
      track.addEventListener('pointermove', e => { if (!down) return; track.scrollLeft = sl - (e.clientX - sx); });
      const wrap = track.closest('.tl-wrap') || track.parentElement;
      $$('.tl-nav button', wrap).forEach(b => b.addEventListener('click', () => { track.scrollBy({ left: (b.dataset.dir === 'prev' ? -1 : 1) * 360, behavior: 'smooth' }); }));
    });
  }

  /* ---------------- Accordions ---------------- */
  function accordions() {
    $$('.acc__item').forEach(item => {
      const btn = $('.acc__btn', item), body = $('.acc__body', item);
      btn.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
        btn.setAttribute('aria-expanded', open);
      });
    });
    $$('.acc__item.is-open .acc__body').forEach(b => b.style.maxHeight = b.scrollHeight + 'px');
  }

  /* ---------------- Switch tabs ---------------- */
  function switches() {
    $$('[data-switch]').forEach(sw => {
      const btns = $$('button', sw); const group = sw.dataset.switch;
      btns.forEach(b => b.addEventListener('click', () => {
        btns.forEach(x => x.classList.remove('is-on')); b.classList.add('is-on');
        $$(`[data-panel-group="${group}"]`).forEach(p => { p.hidden = p.dataset.panel !== b.dataset.target; });
      }));
    });
  }

  /* ---------------- Forms (demo) ---------------- */
  function forms() {
    $$('form[data-demo]').forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      const old = btn.innerHTML; btn.innerHTML = 'Demande envoyée ✓'; btn.disabled = true;
      setTimeout(() => { btn.innerHTML = old; btn.disabled = false; f.reset(); }, 3200);
    }));
  }

  /* ---------------- Marquee duplication ---------------- */
  function marquees() { $$('.marquee__track').forEach(t => { t.innerHTML += t.innerHTML; }); }

  /* ---------------- Process (5 étapes) ---------------- */
  function processSection() {
    const proc = $('.process'); if (!proc) return;
    const steps = $$('.step', proc); const bars = $$('.process__progress span', proc); const label = $('.process__progress b', proc);
    const svg = $('.process__viz svg', proc);
    const setStep = (i, frac) => {
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      bars.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : k === i ? frac : 0));
      if (label) label.textContent = `Étape ${String(i + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
      if (svg) svg.setAttribute('data-step', i);
    };
    setStep(0, 0);
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    ScrollTrigger.create({
      trigger: proc, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => { const p = self.progress * steps.length; const i = Math.min(steps.length - 1, Math.floor(p)); setStep(i, p - i); }
    });
  }

  /* ---------------- Init ---------------- */
  function init() {
    renderHeader(); renderFooter(); marquees();
    smooth(); preloader(); reveals(); counters(); statements(); parallax(); timelines(); accordions(); switches(); forms(); processSection();
    document.dispatchEvent(new CustomEvent('indra:ready'));
  }
  // Les scripts sont chargés en defer : DOMContentLoaded n'est émis qu'après leur exécution (hero.js, map.js…).
  if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);
})();
