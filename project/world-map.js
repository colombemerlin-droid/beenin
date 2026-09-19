// <world-map logged="Portugal,Japan"> — Natural Earth geometry via d3-geo + topojson.
// d3 and topojson are loaded by the host page (pinned integrity tags).
(function () {
  if (window.customElements.get('world-map')) return;

  const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const ALIAS = {
    'United States': 'United States of America',
    'UK': 'United Kingdom',
    'Czechia': 'Czech Republic',
    'Ivory Coast': "Côte d'Ivoire",
    'Bosnia': 'Bosnia and Herz.',
    'Dominican Rep.': 'Dominican Republic'
  };

  let featuresPromise = null;

  function libsReady() {
    return new Promise(resolve => {
      const tick = () => (window.d3 && window.topojson ? resolve() : setTimeout(tick, 30));
      tick();
    });
  }

  function getFeatures() {
    if (!featuresPromise) {
      featuresPromise = libsReady()
        .then(() => fetch(ATLAS))
        .then(r => r.json())
        .then(topo => window.topojson.feature(topo, topo.objects.countries).features);
    }
    return featuresPromise;
  }

  class WorldMap extends HTMLElement {
    static get observedAttributes() { return ['logged', 'fill', 'empty', 'hairline']; }

    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.width = '100%';
      this.style.height = '100%';

      this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this._svg.setAttribute('width', '100%');
      this._svg.setAttribute('height', '100%');
      this._svg.style.display = 'block';
      this._svg.style.overflow = 'visible';
      this.appendChild(this._svg);

      this._prev = null;
      this._ro = new ResizeObserver(() => this._draw());
      this._ro.observe(this);
      getFeatures().then(f => { this._features = f; this._draw(); });
    }

    disconnectedCallback() { if (this._ro) this._ro.disconnect(); }
    attributeChangedCallback() { this._paint(); }

    _loggedSet() {
      const raw = (this.getAttribute('logged') || '').split(',').map(s => s.trim()).filter(Boolean);
      return new Set(raw.map(n => ALIAS[n] || n));
    }

    _draw() {
      if (!this._features || !window.d3) return;
      const w = this.clientWidth, h = this.clientHeight;
      if (!w || !h) return;
      if (this._w === w && this._h === h && this._paths) { this._paint(); return; }
      this._w = w; this._h = h;

      const NS = 'http://www.w3.org/2000/svg';
      const d3 = window.d3;
      const hair = this.getAttribute('hairline') || '#DAD0C2';
      const sphere = { type: 'Sphere' };
      const proj = d3.geoNaturalEarth1().fitExtent([[5, 5], [w - 5, h - 5]], sphere);
      const geo = d3.geoPath(proj);
      this._geo = geo;

      this._svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      this._svg.innerHTML = '';

      const outline = document.createElementNS(NS, 'path');
      outline.setAttribute('d', geo(sphere));
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', hair);
      outline.setAttribute('stroke-width', '1');
      this._svg.appendChild(outline);

      this._paths = [];
      this._features.forEach(f => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', geo(f) || '');
        p.setAttribute('stroke', hair);
        p.setAttribute('stroke-width', '0.5');
        p.style.transition = 'fill 480ms cubic-bezier(0.22,1,0.36,1)';
        p.dataset.name = (f.properties && f.properties.name) || '';
        p._feature = f;
        this._svg.appendChild(p);
        this._paths.push(p);
      });

      this._ripples = document.createElementNS(NS, 'g');
      this._svg.appendChild(this._ripples);
      this._paint();
    }

    _ripple(feature, color) {
      if (!this._geo || !this._ripples) return;
      let c;
      try { c = this._geo.centroid(feature); } catch (e) { return; }
      if (!c || isNaN(c[0])) return;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('cx', c[0]);
      el.setAttribute('cy', c[1]);
      el.setAttribute('r', '2');
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-width', '2');
      this._ripples.appendChild(el);
      const anim = el.animate(
        [{ r: 2, opacity: 0.65, strokeWidth: 2 }, { r: 34, opacity: 0, strokeWidth: 0.5 }],
        { duration: 520, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      );
      anim.onfinish = () => el.remove();
    }

    _paint() {
      if (!this._paths) return;
      const on = this._loggedSet();
      const fill = this.getAttribute('fill') || '#E2725B';
      const empty = this.getAttribute('empty') || '#E8E1D7';
      const first = this._prev === null;
      this._paths.forEach(p => {
        const lit = on.has(p.dataset.name);
        p.setAttribute('fill', lit ? fill : empty);
        if (lit && !first && this._prev && !this._prev.has(p.dataset.name)) this._ripple(p._feature, fill);
      });
      this._prev = on;
    }
  }

  window.customElements.define('world-map', WorldMap);
})();
