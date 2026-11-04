/* ==========================================================================
   Granja San José — script.js
   Todo el movimiento de la página. Cada bloque es independiente: si uno falla,
   los demás siguen y el contenido siempre queda visible.
   ========================================================================== */
(() => {
  'use strict';

  /* ───────────────────────── CONFIGURACIÓN ─────────────────────────
     WhatsApp del negocio: 10 dígitos, sin +52 y sin espacios.
     (Número de «Información» del flyer del cliente.)
     Si queda vacío, el botón flotante y el envío del formulario se ocultan solos. */
  const WHATSAPP_NUMERO = '6391117809';
  const NOMBRE_NEGOCIO = 'Granja San José';
  const MENSAJE_BASE = 'Hola, vi la página de Granja San José y quiero información de fechas.';

  /* ───────────────────────── Utilidades ───────────────────────── */
  const raiz = document.documentElement;
  raiz.classList.add('js-ok');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const suave = (t) => t * t * (3 - 2 * t);
  const seguro = (fn) => { try { fn(); } catch (e) { /* un bloque roto no tumba al resto */ } };
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hayPuntero = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ───────────────────────── WhatsApp ───────────────────────── */
  const digitos = String(WHATSAPP_NUMERO).replace(/\D/g, '');
  let numeroWa = '';
  if (digitos.length === 10) numeroWa = '52' + digitos;
  else if (digitos.length === 12 && digitos.startsWith('52')) numeroWa = digitos;
  else if (digitos.length === 13 && digitos.startsWith('521')) numeroWa = '52' + digitos.slice(3);
  const hayWa = numeroWa.length === 12;

  const urlWa = (texto) => (hayWa ? 'https://wa.me/' + numeroWa + '?text=' + encodeURIComponent(texto) : '#contacto');

  if (!hayWa) raiz.classList.add('sin-wa');
  $$('.js-wa').forEach((a) => {
    if (!hayWa) return;
    a.href = urlWa(a.dataset.msg || MENSAJE_BASE);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  /* ───────────────────────── Estado compartido ───────────────────────── */
  let campoHero = null, campoRec = null, campoContacto = null;
  let ultimaT = -1, ultimoMomento = -1;

  /* ───────────────────────── Cargador ───────────────────────── */
  const cargador = $('#cargador');
  const pct = $('#carg-pct');
  const DUR_CARGA = reducir ? 300 : 1500;
  const t0 = performance.now();

  function contarPct(ahora) {
    const t = clamp((ahora - t0) / DUR_CARGA);
    if (pct) pct.textContent = String(Math.round(suave(t) * 100));
    if (t < 1) requestAnimationFrame(contarPct);
  }
  requestAnimationFrame(contarPct);

  let terminado = false;
  function terminarCarga() {
    if (terminado) return;
    terminado = true;
    raiz.classList.add('listo');
    if (cargador) {
      cargador.classList.add('fuera');
      setTimeout(() => { cargador.hidden = true; }, 700);
    }
    seguro(iniciarCampos);
    seguro(() => animarDibujos());
    seguro(bucles);
    seguro(iniciarHeroSlides);
    onScroll();
  }
  setTimeout(terminarCarga, DUR_CARGA + 80);

  /* ───────────────────────── Revelado al hacer scroll ───────────────────────── */
  seguro(() => {
    const items = $$('.reveal, .reveal-clip');
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  });

  /* ───────────────────────── Dibujos SVG con anime.js ───────────────────────── */
  const dibujados = new WeakSet();
  function dibujar(svg) {
    if (dibujados.has(svg)) return;
    dibujados.add(svg);
    svg.classList.add('in');
    if (!window.anime || reducir) return;
    const trazos = $$('path, circle, line, polyline, ellipse', svg).filter((n) => typeof n.getTotalLength === 'function' && n.getAttribute('fill') !== 'currentColor' && !n.classList.contains('flota'));
    if (!trazos.length) return;
    window.anime({
      targets: trazos,
      strokeDashoffset: [window.anime.setDashoffset, 0],
      easing: 'easeInOutSine',
      duration: 1500,
      delay: (el, i) => i * 130
    });
  }
  function animarDibujos() {
    if (!('IntersectionObserver' in window)) { $$('.dibujo, .dibujar').forEach((s) => s.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { dibujar(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.45 });
    $$('.dibujo, .dibujar').forEach((s) => io.observe(s));
  }

  /* Movimientos que nunca se detienen (anime.js) */
  function bucles() {
    if (!window.anime || reducir) return;
    window.anime({ targets: '.flota', translateY: [-9, 9], translateX: [-4, 4], direction: 'alternate', loop: true, easing: 'easeInOutSine', duration: 3200, delay: window.anime.stagger(420) });
    window.anime({ targets: '.tile-ico', translateY: [-3, 3], direction: 'alternate', loop: true, easing: 'easeInOutSine', duration: 2600, delay: window.anime.stagger(300) });
    window.anime({ targets: '.punto', scale: [1, 1.35], direction: 'alternate', loop: true, easing: 'easeInOutQuad', duration: 1100 });
  }

  /* ───────────────────────── Cabecera, menú y enlace activo ───────────────────────── */
  const cabecera = $('#cabecera');
  const btnMenu = $('#hamburguesa');
  const menu = $('#menu-movil');

  function cerrarMenu() {
    raiz.classList.remove('menu-abierto');
    if (btnMenu) { btnMenu.setAttribute('aria-expanded', 'false'); btnMenu.setAttribute('aria-label', 'Abrir menú'); }
    if (menu) menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function abrirMenu() {
    raiz.classList.add('menu-abierto');
    btnMenu.setAttribute('aria-expanded', 'true');
    btnMenu.setAttribute('aria-label', 'Cerrar menú');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  if (btnMenu && menu) {
    btnMenu.addEventListener('click', () => (raiz.classList.contains('menu-abierto') ? cerrarMenu() : abrirMenu()));
    $$('a', menu).forEach((a) => a.addEventListener('click', cerrarMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });
    seguro(() => window.matchMedia('(min-width: 960px)').addEventListener('change', (m) => { if (m.matches) cerrarMenu(); }));
  }

  seguro(() => {
    if (!('IntersectionObserver' in window)) return;
    const enlaces = $$('.nav-principal a');
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        enlaces.forEach((a) => a.classList.toggle('act', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['jardin', 'celebraciones', 'recorrido', 'galeria', 'reservar'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  });

  /* ───────────────────────── Palabras que se encienden ───────────────────────── */
  let palabras = [];
  seguro(() => {
    const p = $('[data-palabras]');
    if (!p) return;
    const texto = p.textContent.trim().replace(/\s+/g, ' ');
    // El texto completo queda para lectores de pantalla; las palabras sueltas son solo visuales
    p.innerHTML = '<span class="sr-only">' + texto + '</span>' + texto.split(' ').map((w) => '<span class="pal" aria-hidden="true">' + w + '</span>').join(' ');
    palabras = $$('.pal', p);
  });

  /* ───────────────────────── Sello giratorio: ajusta el texto al círculo ───────────────────────── */
  function ajustarSello() {
    const txt = $('.sello-texto');
    const tp = $('.sello-texto textPath');
    if (!txt || !tp || !tp.getComputedTextLength) return;
    const circ = 2 * Math.PI * 168;
    for (let i = 0; i < 3; i++) {
      const largo = tp.getComputedTextLength();
      if (!largo) return;
      const fs = parseFloat(getComputedStyle(txt).fontSize) || 15;
      txt.style.fontSize = (fs * (circ - 4) / largo).toFixed(2) + 'px';
    }
  }
  window.addEventListener('load', () => seguro(ajustarSello));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => seguro(ajustarSello));

  /* ───────────────────────── Guirnalda de focos del hero ───────────────────────── */
  function construirGuirnalda() {
    const svg = $('#guirnalda');
    if (!svg) return;
    const w = Math.max(320, Math.round(svg.getBoundingClientRect().width || window.innerWidth));
    const h = 118;
    const tramos = w < 560 ? 3 : w < 1000 ? 4 : 6;
    const tw = w / tramos;
    let cuerda = '', focos = '';
    for (let s = 0; s < tramos; s++) {
      const x0 = s * tw, x1 = x0 + tw, xm = x0 + tw / 2;
      const caida = 22 + (s % 2) * 12;
      const y0 = 4, cy = y0 + caida * 2;
      cuerda += 'M' + x0.toFixed(1) + ' ' + y0 + 'Q' + xm.toFixed(1) + ' ' + cy + ' ' + x1.toFixed(1) + ' ' + y0;
      const nf = Math.max(4, Math.round(tw / 52));
      for (let k = 1; k < nf; k++) {
        const t = k / nf, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * xm + t * t * x1;
        const y = u * u * y0 + 2 * u * t * cy + t * t * y0;
        const largo = 7 + ((k * 7 + s * 3) % 4);
        const fy = y + largo + 4;
        const ret = (Math.random() * 3.4).toFixed(2);
        focos += '<line class="hilo" x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + (y + largo).toFixed(1) + '"/>'
          + '<circle class="halo" cx="' + x.toFixed(1) + '" cy="' + fy.toFixed(1) + '" r="15" style="animation-delay:-' + ret + 's"/>'
          + '<circle class="foco" cx="' + x.toFixed(1) + '" cy="' + fy.toFixed(1) + '" r="4.2" style="animation-delay:-' + ret + 's"/>';
      }
    }
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '<defs><radialGradient id="g-foco"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".9"/><stop offset=".4" stop-color="#ffc766" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>'
      + '<path class="cuerda" d="' + cuerda + '"/>' + focos;
  }
  seguro(construirGuirnalda);

  /* ───────────────────────── Campos de partículas (canvas) ─────────────────────────
     Luces bokeh doradas y pétalos de rosa. Se pausan cuando no están a la vista. */
  const PETALOS = ['#f6b38e', '#e8782e', '#e36a5d', '#f9dcc8', '#f2a36b', '#d9a441'];
  class Campo {
    constructor(canvas, cfg) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.cfg = Object.assign({ n: 46, rgb: '255,205,120', petalos: 0, repeler: false, tam: 1 }, cfg);
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      this.w = 0; this.h = 0; this.t = 0; this.visible = false; this.corriendo = false;
      this.factor = 1;
      this.mouse = { x: -999, y: -999 };
      this.sprite = this.crearSprite();
      this.p = []; this.pet = [];
      this.medir();
      this.sembrar();
      if (window.ResizeObserver) new ResizeObserver(() => { this.medir(); this.sembrar(); this.dibujar(0); }).observe(canvas);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; if (this.visible) this.iniciar(); }, { threshold: 0 }).observe(canvas);
      } else { this.visible = true; this.iniciar(); }
      if (this.cfg.repeler && hayPuntero) {
        const zona = canvas.closest('[data-zona]') || canvas.parentElement;
        zona.addEventListener('pointermove', (e) => {
          const r = this.c.getBoundingClientRect();
          this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
        }, { passive: true });
        zona.addEventListener('pointerleave', () => { this.mouse.x = -999; this.mouse.y = -999; });
      }
      document.addEventListener('visibilitychange', () => { if (!document.hidden && this.visible) this.iniciar(); });
    }
    crearSprite() {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const x = s.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(' + this.cfg.rgb + ',1)');
      g.addColorStop(0.25, 'rgba(' + this.cfg.rgb + ',.55)');
      g.addColorStop(1, 'rgba(' + this.cfg.rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return s;
    }
    medir() {
      const r = this.c.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    sembrar() {
      const area = clamp((this.w * this.h) / (1100 * 800), 0.45, 1.2);
      const n = Math.round(this.cfg.n * area);
      this.p = Array.from({ length: n }, () => ({
        x: Math.random() * this.w, y: Math.random() * this.h,
        r: (3 + Math.random() * 7) * this.cfg.tam, vy: -(0.08 + Math.random() * 0.3), vx: (Math.random() - 0.5) * 0.18,
        f: Math.random() * 6.28, v: 0.6 + Math.random() * 1.4
      }));
      const np = this.cfg.petalos ? Math.round(this.cfg.petalos * area) : 0;
      this.pet = Array.from({ length: np }, () => ({
        x: Math.random() * this.w, y: Math.random() * this.h,
        r: 5 + Math.random() * 6, vy: 0.28 + Math.random() * 0.55, vx: (Math.random() - 0.5) * 0.25,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04, sw: 0.5 + Math.random() * 0.9, f: Math.random() * 6.28,
        c: PETALOS[Math.floor(Math.random() * PETALOS.length)]
      }));
    }
    iniciar() {
      if (this.corriendo || reducir) return;
      this.corriendo = true;
      let ultimo = performance.now();
      const paso = (ahora) => {
        if (!this.visible || document.hidden) { this.corriendo = false; return; }
        const dt = Math.min(48, ahora - ultimo); ultimo = ahora;
        this.dibujar(dt);
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }
    dibujar(dt) {
      const ctx = this.ctx;
      const k = dt / 16;
      this.t += dt / 1000;
      ctx.clearRect(0, 0, this.w, this.h);

      // Pétalos de rosa que caen girando
      if (this.pet.length) {
        ctx.globalCompositeOperation = 'source-over';
        for (const q of this.pet) {
          q.y += q.vy * k;
          q.x += (q.vx + Math.sin(this.t * q.sw + q.f) * 0.55) * k;
          q.rot += q.vr * k;
          if (q.y > this.h + 24) { q.y = -24; q.x = Math.random() * this.w; }
          if (q.x < -24) q.x = this.w + 24; else if (q.x > this.w + 24) q.x = -24;
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.rot);
          ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.sin(this.t * q.sw * 1.3 + q.f)));
          ctx.globalAlpha = 0.72;
          ctx.fillStyle = q.c;
          ctx.beginPath();
          ctx.moveTo(0, -q.r);
          ctx.quadraticCurveTo(q.r * 0.95, -q.r * 0.2, 0, q.r);
          ctx.quadraticCurveTo(-q.r * 0.95, -q.r * 0.2, 0, -q.r);
          ctx.fill();
          ctx.restore();
        }
      }

      // Luces bokeh
      if (this.factor > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        const rep = this.cfg.repeler && this.mouse.x > -900;
        for (const q of this.p) {
          q.x += q.vx + Math.sin(this.t * 0.6 + q.f) * 0.22 * k;
          q.y += q.vy * k;
          if (rep) {
            const dx = q.x - this.mouse.x, dy = q.y - this.mouse.y, d2 = dx * dx + dy * dy;
            if (d2 < 14000) { const d = Math.sqrt(d2) || 1, f = (1 - d / 118) * 2.4; q.x += (dx / d) * f; q.y += (dy / d) * f; }
          }
          if (q.y < -20) { q.y = this.h + 20; q.x = Math.random() * this.w; }
          if (q.x < -20) q.x = this.w + 20; else if (q.x > this.w + 20) q.x = -20;
          ctx.globalAlpha = (0.2 + 0.8 * (0.5 + 0.5 * Math.sin(this.t * q.v + q.f))) * this.factor;
          const d = q.r * 2.6;
          ctx.drawImage(this.sprite, q.x - d / 2, q.y - d / 2, d, d);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function iniciarCampos() {
    const ch = $('#canvas-hero'), cr = $('#canvas-rec'), cc = $('#canvas-contacto');
    if (ch) campoHero = new Campo(ch, { n: 50, petalos: 16, repeler: true });
    if (cr) { campoRec = new Campo(cr, { n: 44, rgb: '255,226,150' }); campoRec.factor = 0.2; }
    if (cc) campoContacto = new Campo(cc, { n: 44, rgb: '255,190,110', petalos: 8 });
    // Con movimiento reducido solo se pinta un cuadro fijo
    if (reducir) [campoHero, campoRec, campoContacto].forEach((c) => { if (c) c.dibujar(0); });
  }

  /* ───────────────────────── Hero: fotos que se funden solas ───────────────────────── */
  const hero = $('#inicio');
  let slideActual = 0, slideTimer = null;
  const DUR_SLIDE = 6500;
  function irSlide(n) {
    const slides = $$('.slide', hero);
    const barras = $$('#hero-barras button');
    if (!slides.length) return;
    slideActual = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-on', i === slideActual));
    barras.forEach((b, i) => {
      b.classList.remove('act');
      if (i === slideActual) { void b.offsetWidth; b.classList.add('act'); }
    });
    const leyenda = $('#hero-leyenda'), contador = $('#hero-contador');
    if (leyenda) leyenda.textContent = slides[slideActual].dataset.leyenda || '';
    if (contador) contador.textContent = '0' + (slideActual + 1);
  }
  function programarSlide() {
    clearTimeout(slideTimer);
    if (reducir) return;
    slideTimer = setTimeout(() => {
      const r = hero.getBoundingClientRect();
      if (!document.hidden && r.bottom > 0) irSlide(slideActual + 1);
      programarSlide();
    }, DUR_SLIDE);
  }
  function iniciarHeroSlides() {
    if (!hero) return;
    $$('#hero-barras button').forEach((b, i) => b.addEventListener('click', () => { irSlide(i); programarSlide(); }));
    irSlide(0);
    programarSlide();
  }

  /* ───────────────────────── Celebraciones: paneles que se expanden solos ───────────────────────── */
  seguro(() => {
    const lista = $('#celebra-lista');
    if (!lista) return;
    const items = $$('.celebra-item', lista);
    let actual = 0, pausaTimer = null, hoverTimer = null;
    const activar = (i) => {
      actual = i;
      items.forEach((it, k) => {
        const on = k === i;
        it.classList.toggle('is-activo', on);
        const tab = $('.celebra-tab', it);
        if (tab) tab.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    };
    const pausar = (ms) => {
      lista.classList.add('pausa');
      clearTimeout(pausaTimer);
      pausaTimer = setTimeout(() => lista.classList.remove('pausa'), ms);
    };
    items.forEach((it, k) => {
      it.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        if (k !== actual) activar(k);
        pausar(12000);
      });
      if (hayPuntero) {
        it.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { if (k !== actual) activar(k); }, 140); });
        it.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
      }
    });
    if (hayPuntero) {
      lista.addEventListener('mouseenter', () => { clearTimeout(pausaTimer); lista.classList.add('pausa'); });
      lista.addEventListener('mouseleave', () => lista.classList.remove('pausa'));
    }
    // Cuando termina la barra de progreso del panel activo, pasa al siguiente (siempre iterando)
    if (!reducir) {
      lista.addEventListener('animationend', (e) => {
        if (e.animationName === 'llenar' && e.target.closest && e.target.closest('.celebra-barra')) activar((actual + 1) % items.length);
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => lista.classList.toggle('en-vista', es[0].isIntersecting), { threshold: 0.35 }).observe(lista);
    } else lista.classList.add('en-vista');
  });

  /* ───────────────────────── Recorrido: de la tarde a la noche ───────────────────────── */
  const rec = $('#recorrido');
  const recMarco = rec ? $('.rec-marco', rec) : null;
  const recCapas = rec ? $$('.rec-capa', rec) : [];
  const recMomentos = rec ? $$('.rec-momento', rec) : [];
  const recSegs = rec ? $$('.rec-segmentos li', rec) : [];

  // [r, g, b, alfa] del velo de color: tarde, atardecer, noche
  const TINTES = [[255, 238, 200, 0.04], [233, 112, 40, 0.22], [14, 10, 36, 0.42]];
  const BRILLO = [1.02, 0.96, 0.9];
  const SATURA = [1.02, 1.14, 1.06];
  let IX0 = 5, IY0 = 11, IR0 = 220;
  function medirRec() {
    const ancho = window.innerWidth;
    IX0 = ancho < 720 ? 5 : 12; IY0 = ancho < 720 ? 11 : 14; IR0 = ancho < 720 ? 220 : 520;
  }
  medirRec();

  function actualizarRec(vh) {
    if (!rec || !recMarco) return;
    const r = rec.getBoundingClientRect();
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
    const total = Math.max(1, r.height - vh);
    const p = clamp(-r.top / total);
    const FASE = 0.16; // primera parte del recorrido: la imagen "se abre" a pantalla completa
    const e = suave(clamp(p / FASE));
    recMarco.style.setProperty('--ix', lerp(IX0, 0, e).toFixed(2) + '%');
    recMarco.style.setProperty('--iy', lerp(IY0, 0, e).toFixed(2) + '%');
    recMarco.style.setProperty('--ir', lerp(IR0, 0, e).toFixed(1) + 'px');
    recMarco.style.setProperty('--tit', (1 - suave(clamp((e - 0.3) / 0.5))).toFixed(3));
    recMarco.style.setProperty('--tits', lerp(1, 1.12, e).toFixed(3));
    recMarco.style.setProperty('--pan', suave(clamp((p - FASE * 0.75) / 0.08)).toFixed(3));

    const t = clamp((p - FASE) / (1 - FASE - 0.04));
    if (Math.abs(t - ultimaT) < 0.0004) return;
    ultimaT = t;

    // Fundido entre las tres fotos con pausas para que cada una "respire"
    const seg = Math.min(1, Math.floor(t * 2));
    const f = suave(clamp((t * 2 - seg - 0.22) / 0.56));
    recCapas.forEach((c, i) => {
      let o = 0;
      if (i === seg) o = 1 - f; else if (i === seg + 1) o = f;
      c.style.opacity = o.toFixed(3);
    });
    const A = TINTES[seg], B = TINTES[seg + 1];
    const s = rec.style;
    s.setProperty('--tinte', 'rgba(' + [0, 1, 2].map((k) => Math.round(lerp(A[k], B[k], f))).join(',') + ',' + lerp(A[3], B[3], f).toFixed(3) + ')');
    s.setProperty('--bri', lerp(BRILLO[seg], BRILLO[seg + 1], f).toFixed(3));
    s.setProperty('--sat', lerp(SATURA[seg], SATURA[seg + 1], f).toFixed(3));
    if (campoRec) campoRec.factor = clamp(lerp(0.15, 1, clamp(t * 1.5)));

    const idx = t < 0.25 ? 0 : t < 0.75 ? 1 : 2;
    if (idx !== ultimoMomento) {
      ultimoMomento = idx;
      recMomentos.forEach((m, i) => m.classList.toggle('is-activo', i === idx));
      recSegs.forEach((li, i) => li.classList.toggle('act', i === idx));
    }
    const llenos = [clamp(t / 0.25), clamp((t - 0.25) / 0.5), clamp((t - 0.75) / 0.25)];
    recSegs.forEach((li, i) => li.firstElementChild.style.setProperty('--f', llenos[i].toFixed(3)));
  }

  /* ───────────────────────── Galería: carrusel horizontal pegajoso ───────────────────────── */
  const gal = $('#galeria');
  const galLista = gal ? $('#gal-lista', gal) : null;
  const galItems = galLista ? $$('.gal-item', galLista) : [];
  let extraGal = 0;
  function medirGal() {
    if (!gal || !galLista) return;
    galLista.style.transform = 'none';
    extraGal = Math.max(0, galLista.scrollWidth - window.innerWidth);
    gal.style.setProperty('--gal-alto', Math.round(window.innerHeight + extraGal * 1.1) + 'px');
  }
  function actualizarGal(vh, vw) {
    if (!gal || !galLista) return;
    const r = gal.getBoundingClientRect();
    if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) return;
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    galLista.style.transform = 'translate3d(' + (-p * extraGal).toFixed(1) + 'px,0,0)';
    gal.style.setProperty('--pp', p.toFixed(3));
    const centro = vw / 2;
    galItems.forEach((it) => {
      const b = it.getBoundingClientRect();
      const d = clamp((b.left + b.width / 2 - centro) / (vw * 0.7), -1, 1);
      it.style.setProperty('--gx', (-d).toFixed(3));
    });
  }

  /* Visor de fotos (lightbox) */
  seguro(() => {
    const lb = $('#lightbox');
    if (!lb || !galLista) return;
    const lbImg = $('#lb-img'), lbCap = $('#lb-cap');
    const botones = $$('.gal-boton', galLista);
    const fotos = botones.map((b) => {
      const img = $('img', b);
      const cap = $('.gal-cap', b);
      const nodo = cap && cap.lastChild;
      return { src: img.getAttribute('src'), alt: img.alt, cap: nodo ? nodo.textContent.trim() : '' };
    });
    let idx = 0, opener = null;
    const mostrar = (i) => {
      idx = (i + fotos.length) % fotos.length;
      lbImg.src = fotos[idx].src;
      lbImg.alt = fotos[idx].alt;
      lbCap.textContent = fotos[idx].cap;
    };
    const abrir = (i, boton) => {
      opener = boton;
      mostrar(i);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
    };
    const cerrar = () => {
      if (typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
      document.body.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    };
    botones.forEach((b, i) => b.addEventListener('click', () => abrir(i, b)));
    $('.lb-cerrar', lb).addEventListener('click', cerrar);
    $('.lb-prev', lb).addEventListener('click', () => mostrar(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => mostrar(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) cerrar(); });
    lb.addEventListener('close', () => { document.body.style.overflow = ''; });
    document.addEventListener('keydown', (e) => {
      if (!lb.hasAttribute('open')) return;
      if (e.key === 'ArrowLeft') mostrar(idx - 1);
      else if (e.key === 'ArrowRight') mostrar(idx + 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) mostrar(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  });

  /* ───────────────────────── Cómo reservar ───────────────────────── */
  const como = $('#reservar');
  const pasosLista = como ? $('.pasos', como) : null;
  const pasos = pasosLista ? $$('.paso', pasosLista) : [];
  function actualizarComo(vh) {
    if (!como || !pasosLista) return;
    const r = como.getBoundingClientRect();
    if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) return;
    const rl = pasosLista.getBoundingClientRect();
    const p = clamp((vh * 0.62 - rl.top) / Math.max(1, rl.height));
    pasosLista.style.setProperty('--p', p.toFixed(3));
    pasos.forEach((s) => s.classList.toggle('on', s.getBoundingClientRect().top + 24 < vh * 0.64));
  }

  /* ───────────────────────── Parallax suave de los arcos ───────────────────────── */
  const parEls = $$('[data-par]');
  function actualizarPar(vh) {
    if (reducir) return;
    parEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--ty', (c * (parseFloat(el.dataset.par) || 0)).toFixed(1) + 'px');
      el.style.setProperty('--ay', (c * -22).toFixed(1) + 'px');
    });
  }

  /* ───────────────────────── Hero: parallax con scroll y con el puntero ───────────────────────── */
  let objX = 0, objY = 0, curX = 0, curY = 0, animandoHero = false;
  function actualizarHero() {
    if (!hero) return;
    const r = hero.getBoundingClientRect();
    if (r.bottom < 0) return;
    const hs = clamp(-r.top / r.height);
    hero.style.setProperty('--hs', hs.toFixed(4));
    hero.style.setProperty('--hc', clamp(1 - hs * 1.6).toFixed(3));
  }
  if (hero && hayPuntero && !reducir) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      objX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      objY = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!animandoHero) { animandoHero = true; requestAnimationFrame(suavizarHero); }
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { objX = 0; objY = 0; if (!animandoHero) { animandoHero = true; requestAnimationFrame(suavizarHero); } });
  }
  function suavizarHero() {
    curX += (objX - curX) * 0.07; curY += (objY - curY) * 0.07;
    hero.style.setProperty('--mx', curX.toFixed(4));
    hero.style.setProperty('--my', curY.toFixed(4));
    if (Math.abs(objX - curX) > 0.002 || Math.abs(objY - curY) > 0.002) requestAnimationFrame(suavizarHero);
    else animandoHero = false;
  }

  /* ───────────────────────── Bucle de scroll ───────────────────────── */
  const barra = $('.progreso');
  let pendiente = false;
  function onScroll() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(cuadro);
  }
  function cuadro() {
    pendiente = false;
    const vh = window.innerHeight, vw = window.innerWidth;
    const y = window.scrollY || window.pageYOffset;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    if (barra) barra.style.setProperty('--sp', clamp(y / max).toFixed(4));
    if (cabecera) cabecera.classList.toggle('es-solida', y > 40);

    seguro(actualizarHero);
    seguro(() => {
      // Las palabras del manifiesto se encienden al pasar por la pantalla
      const frase = $('.jardin-frase');
      if (!frase || !palabras.length) return;
      const r = frase.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const inicio = vh * 0.88, fin = vh * 0.3;
      const p = clamp((inicio - r.top) / (inicio - fin + r.height * 0.55));
      const n = Math.round(p * palabras.length);
      palabras.forEach((w, i) => w.classList.toggle('on', i < n));
    });
    seguro(() => actualizarPar(vh));
    seguro(() => actualizarRec(vh));
    seguro(() => actualizarGal(vh, vw));
    seguro(() => actualizarComo(vh));
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  let rsz = null, anchoPrevio = window.innerWidth;
  window.addEventListener('resize', () => {
    // En móvil la barra de direcciones dispara "resize" al hacer scroll: solo remedimos si cambió el ancho
    if (window.innerWidth === anchoPrevio) { onScroll(); return; }
    anchoPrevio = window.innerWidth;
    medirRec(); medirGal(); ultimaT = -1; onScroll();
    clearTimeout(rsz);
    rsz = setTimeout(() => seguro(construirGuirnalda), 200);
  });
  window.addEventListener('load', () => { medirGal(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medirGal(); onScroll(); });

  /* ───────────────────────── Interacción: inclinación 3D, botones magnéticos, brillo ───────────────────────── */
  if (hayPuntero && !reducir) {
    seguro(() => {
      $$('[data-tilt]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
          el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
          el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
          el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
        });
        el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
      });
    });
    seguro(() => {
      $$('[data-magnet]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) * 0.22, y = (e.clientY - (r.top + r.height / 2)) * 0.32;
          el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
        });
        el.addEventListener('pointerleave', () => { el.style.translate = '0px 0px'; });
      });
    });
    seguro(() => {
      const brillo = $('.resplandor');
      if (!brillo) return;
      let bx = 0, by = 0, tx = 0, ty = 0, vivo = false;
      window.addEventListener('pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
        if (!vivo) { vivo = true; bx = tx; by = ty; brillo.classList.add('vivo'); requestAnimationFrame(seguir); }
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => brillo.classList.remove('vivo'));
      document.documentElement.addEventListener('mouseenter', () => { if (vivo) brillo.classList.add('vivo'); });
      function seguir() {
        bx += (tx - bx) * 0.12; by += (ty - by) * 0.12;
        brillo.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
        requestAnimationFrame(seguir);
      }
    });
  }

  /* ───────────────────────── Formulario → WhatsApp ───────────────────────── */
  const form = $('#form-contacto');
  const vista = $('#vista-mensaje');
  function armarMensaje() {
    if (!form) return MENSAJE_BASE;
    const nombre = form.nombre.value.trim();
    const evento = form.evento.value;
    const fecha = form.fecha.value.trim();
    const invitados = form.invitados.value.trim();
    const detalle = form.mensaje.value.trim();
    let m = (nombre ? 'Hola, soy ' + nombre + '. Les' : 'Hola, les') + ' escribo desde la página de ' + NOMBRE_NEGOCIO + '.';
    m += '\nMe gustaría información para ' + evento + '.';
    if (fecha) m += '\nFecha tentativa: ' + fecha + '.';
    if (invitados) m += '\nInvitados aproximados: ' + invitados + '.';
    if (detalle) m += '\n' + detalle;
    return m;
  }
  function actualizarVista() {
    if (!vista) return;
    vista.textContent = armarMensaje();
    vista.classList.add('pulso');
    setTimeout(() => vista.classList.remove('pulso'), 180);
  }
  if (form) {
    if (vista) vista.textContent = armarMensaje();
    ['input', 'change'].forEach((ev) => form.addEventListener(ev, actualizarVista));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = form.nombre.closest('.campo');
      const error = $('.error', campo);
      if (!form.nombre.value.trim()) {
        campo.classList.add('malo');
        error.textContent = 'Dinos tu nombre para saber con quién platicamos.';
        form.nombre.focus();
        return;
      }
      campo.classList.remove('malo');
      error.textContent = '';
      if (!hayWa) return;
      const url = urlWa(armarMensaje());
      const ventana = window.open(url, '_blank', 'noopener');
      if (!ventana) window.location.href = url;
    });
    form.nombre.addEventListener('input', () => {
      const campo = form.nombre.closest('.campo');
      campo.classList.remove('malo');
      $('.error', campo).textContent = '';
    });
  }

  /* ───────────────────────── Detalles ───────────────────────── */
  const anio = $('#anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  medirGal();
  onScroll();
})();
