(function () {
  const D3 = { src: 'https://unpkg.com/d3@7.9.0/dist/d3.min.js', integrity: 'sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i' };
  const TOPO = { src: 'https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js', integrity: 'sha384-Ukv1p/xTma6P4/2bY5KzWBw+ydSpXmhCMtyciIQVDJ1RmOxtCYNMF1uXT9T63H67' };

  function loadScript(spec) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${spec.src}"]`);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = spec.src;
      s.integrity = spec.integrity;
      s.crossOrigin = 'anonymous';
      s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); });
      s.addEventListener('error', reject);
      document.head.appendChild(s);
    });
  }

  const CITIES = [
    ['Москва', 55.75, 37.62, 1], ['Санкт-Петербург', 59.94, 30.31, 1],
    ['Ростов-на-Дону', 47.23, 39.72, 1], ['Краснодар', 45.04, 38.98, 1],
    ['Новороссийск', 44.72, 37.77, 0], ['Волгоград', 48.71, 44.51, 0],
    ['Воронеж', 51.67, 39.18, 0], ['Нижний Новгород', 56.33, 44.0, 1],
    ['Казань', 55.79, 49.11, 1], ['Самара', 53.2, 50.15, 0],
    ['Уфа', 54.74, 55.97, 0], ['Пермь', 58.01, 56.25, 0],
    ['Екатеринбург', 56.84, 60.61, 1], ['Челябинск', 55.16, 61.4, 0],
    ['Тюмень', 57.15, 65.53, 0], ['Омск', 54.99, 73.37, 0],
    ['Новосибирск', 55.03, 82.92, 1], ['Красноярск', 56.01, 92.87, 1],
    ['Иркутск', 52.29, 104.3, 0], ['Чита', 52.03, 113.5, 0],
    ['Хабаровск', 48.48, 135.08, 1], ['Владивосток', 43.12, 131.89, 1],
    ['Якутск', 62.03, 129.73, 0], ['Мурманск', 68.97, 33.08, 0],
    ['Архангельск', 64.54, 40.54, 0], ['Сургут', 61.25, 73.42, 0],
    ['Махачкала', 42.98, 47.5, 0], ['Ставрополь', 45.04, 41.97, 0],
    ['Калининград', 54.71, 20.51, 0], ['Симферополь', 44.95, 34.1, 0],
    ['Барнаул', 53.35, 83.78, 0], ['Кемерово', 55.35, 86.09, 0],
    ['Оренбург', 51.77, 55.1, 0], ['Саратов', 51.53, 46.03, 0],
    ['Ижевск', 56.85, 53.2, 0], ['Киров', 58.6, 49.66, 0],
    ['Улан-Удэ', 51.83, 107.58, 0], ['Благовещенск', 50.29, 127.53, 0],
    ['Южно-Сахалинск', 46.96, 142.73, 0], ['Петропавловск-Камчатский', 53.02, 158.65, 0],
    ['Норильск', 69.35, 88.2, 0]
  ];

  const LABELLED = ['Москва', 'Санкт-Петербург', 'Краснодар', 'Екатеринбург', 'Новосибирск', 'Красноярск', 'Владивосток'];

  class RussiaMap extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this._render();
      this._ro = new ResizeObserver(() => this._draw());
      this._ro.observe(this);
    }
    disconnectedCallback() { if (this._ro) this._ro.disconnect(); }

    async _render() {
      try {
        await loadScript(D3);
        await loadScript(TOPO);
        const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(r => r.json());
        const all = topojson.feature(topo, topo.objects.countries).features;
        this._russia = all.find(f => f.properties && f.properties.name === 'Russia');
        this._others = all.filter(f => f !== this._russia);
        this._draw();
      } catch (e) {
        this.innerHTML = '<div style="padding:24px;font:14px Inter,sans-serif;opacity:.6">Карта недоступна</div>';
      }
    }

    _draw() {
      if (!this._russia) return;
      const w = this.clientWidth || 900;
      const h = Math.max(280, Math.round(w * 0.44));
      const accent = getComputedStyle(this).getPropertyValue('--color-accent').trim() || '#9184d9';
      const land = 'rgba(233,233,237,0.07)';
      const edge = 'rgba(233,233,237,0.22)';

      const projection = d3.geoConicEqualArea()
        .parallels([50, 70]).rotate([-100, 0])
        .fitExtent([[16, 16], [w - 16, h - 16]], this._russia);
      const path = d3.geoPath(projection);

      const svg = d3.select(this).selectAll('svg').data([0]).join('svg')
        .attr('width', w).attr('height', h)
        .attr('viewBox', `0 0 ${w} ${h}`)
        .style('display', 'block').style('overflow', 'hidden');
      svg.selectAll('*').remove();

      svg.append('g').selectAll('path').data(this._others).join('path')
        .attr('d', path).attr('fill', 'rgba(233,233,237,0.03)')
        .attr('stroke', 'rgba(233,233,237,0.06)').attr('stroke-width', 0.6);

      svg.append('path').datum(this._russia)
        .attr('d', path).attr('fill', land)
        .attr('stroke', edge).attr('stroke-width', 1);

      const g = svg.append('g');
      const placed = [];
      const hits = (a) => placed.some(b => !(a.x2 < b.x1 - 4 || a.x1 > b.x2 + 4 || a.y2 < b.y1 - 2 || a.y1 > b.y2 + 2));
      CITIES.forEach(([name, lat, lng, major]) => {
        const p = projection([lng, lat]);
        if (!p) return;
        const [x, y] = p;
        if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return;
        if (major) {
          g.append('circle').attr('cx', x).attr('cy', y).attr('r', 9)
            .attr('fill', accent).attr('opacity', 0.14);
        }
        g.append('circle').attr('cx', x).attr('cy', y).attr('r', major ? 3.4 : 2.2)
          .attr('fill', major ? accent : 'rgba(233,233,237,0.55)');
        if (major && w > 380 && LABELLED.indexOf(name) !== -1) {
          const tw = name.length * 5.9;
          const flip = x + 8 + tw > w - 6;
          const x1 = flip ? x - 8 - tw : x + 8;
          let dy = null;
          for (const off of [0, -14, 14]) {
            const b = { x1: x1, x2: x1 + tw, y1: y + off - 6, y2: y + off + 6 };
            if (!hits(b) && b.x1 > 2 && b.y1 > 2 && b.y2 < h - 2) { placed.push(b); dy = off; break; }
          }
          if (dy !== null) {
            g.append('text').attr('x', flip ? x - 8 : x + 8).attr('y', y + dy + 3.5)
              .attr('text-anchor', flip ? 'end' : 'start')
              .attr('font-family', 'Inter, sans-serif').attr('font-size', 11)
              .attr('fill', 'rgba(233,233,237,0.72)').text(name);
          }
        }
      });
    }
  }

  if (!customElements.get('russia-map')) customElements.define('russia-map', RussiaMap);
})();
