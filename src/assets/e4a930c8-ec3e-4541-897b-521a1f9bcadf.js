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

  // Города поставок: [название, широта, долгота, крупный, округ].
  // Какие округа показывать, задаёт атрибут regions="ЦФО,ЮФО" на элементе
  // (подставляется из CONFIG.regions в template.html); по умолчанию — все.
  const CITIES = [
    ['Москва', 55.75, 37.62, 1, 'ЦФО'], ['Тверь', 56.86, 35.91, 0, 'ЦФО'],
    ['Ярославль', 57.63, 39.87, 0, 'ЦФО'], ['Кострома', 57.77, 40.93, 0, 'ЦФО'],
    ['Иваново', 57.0, 40.97, 0, 'ЦФО'], ['Владимир', 56.13, 40.41, 0, 'ЦФО'],
    ['Рязань', 54.63, 39.74, 0, 'ЦФО'], ['Тула', 54.19, 37.62, 0, 'ЦФО'],
    ['Калуга', 54.51, 36.26, 0, 'ЦФО'], ['Смоленск', 54.78, 32.05, 0, 'ЦФО'],
    ['Брянск', 53.24, 34.36, 0, 'ЦФО'], ['Орёл', 52.97, 36.07, 0, 'ЦФО'],
    ['Курск', 51.73, 36.19, 0, 'ЦФО'], ['Белгород', 50.6, 36.59, 0, 'ЦФО'],
    ['Липецк', 52.61, 39.6, 0, 'ЦФО'], ['Воронеж', 51.67, 39.18, 1, 'ЦФО'],
    ['Тамбов', 52.72, 41.45, 0, 'ЦФО'],
    ['Ростов-на-Дону', 47.23, 39.72, 1, 'ЮФО'], ['Таганрог', 47.21, 38.94, 0, 'ЮФО'],
    ['Краснодар', 45.04, 38.98, 1, 'ЮФО'], ['Новороссийск', 44.72, 37.77, 0, 'ЮФО'],
    ['Сочи', 43.6, 39.73, 0, 'ЮФО'], ['Волгоград', 48.71, 44.51, 1, 'ЮФО'],
    ['Астрахань', 46.35, 48.04, 0, 'ЮФО'], ['Элиста', 46.31, 44.27, 0, 'ЮФО'],
    ['Симферополь', 44.95, 34.1, 0, 'ЮФО'], ['Севастополь', 44.62, 33.52, 0, 'ЮФО'],
    ['Санкт-Петербург', 59.94, 30.31, 1, 'СЗФО'], ['Нижний Новгород', 56.33, 44.0, 1, 'ПФО'],
    ['Казань', 55.79, 49.11, 1, 'ПФО'], ['Самара', 53.2, 50.15, 0, 'ПФО'],
    ['Саратов', 51.53, 46.03, 0, 'ПФО'], ['Пенза', 53.2, 45.0, 0, 'ПФО'],
    ['Ставрополь', 45.04, 41.97, 0, 'СКФО'], ['Махачкала', 42.98, 47.5, 0, 'СКФО'],
    ['Екатеринбург', 56.84, 60.61, 1, 'УФО'], ['Новосибирск', 55.03, 82.92, 1, 'СФО'],
    ['Красноярск', 56.01, 92.87, 1, 'СФО'], ['Хабаровск', 48.48, 135.08, 1, 'ДФО'],
    ['Владивосток', 43.12, 131.89, 1, 'ДФО']
  ];

  const LABELLED = ['Москва', 'Воронеж', 'Ростов-на-Дону', 'Краснодар', 'Волгоград', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Красноярск', 'Владивосток'];

  // Рамка кадра для европейской части (ЦФО+ЮФО): [долгота, широта].
  // Внешнее кольцо по часовой стрелке — иначе d3 считает полигон «всем миром кроме рамки».
  const EUROPE_FRAME = { type: 'Polygon', coordinates: [[[29, 43], [29, 59.5], [50.5, 59.5], [50.5, 43], [29, 43]]] };

  class RussiaMap extends HTMLElement {
    static get observedAttributes() { return ['regions']; }
    attributeChangedCallback() { if (this._mounted) this._draw(); }
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

    _regions() {
      const a = (this.getAttribute('regions') || '').split(',').map(x => x.trim()).filter(Boolean);
      return a.length ? a : null;
    }

    _draw() {
      if (!this._russia) return;
      const regions = this._regions();
      const cities = regions ? CITIES.filter(c => regions.indexOf(c[4]) !== -1) : CITIES;
      // Если показываем только европейские округа — кадрируем карту по ним, а не по всей России.
      const europeOnly = regions && regions.every(r => ['ЦФО', 'ЮФО', 'СЗФО', 'ПФО', 'СКФО'].indexOf(r) !== -1);
      const w = this.clientWidth || 900;
      const h = Math.max(280, Math.round(w * (europeOnly ? 0.62 : 0.44)));
      const accent = getComputedStyle(this).getPropertyValue('--color-accent').trim() || '#9184d9';
      const land = 'rgba(233,233,237,0.07)';
      const edge = 'rgba(233,233,237,0.22)';

      const projection = europeOnly
        ? d3.geoConicEqualArea().parallels([45, 57]).rotate([-40, 0])
            .fitExtent([[16, 16], [w - 16, h - 16]], EUROPE_FRAME)
        : d3.geoConicEqualArea().parallels([50, 70]).rotate([-100, 0])
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
      cities.forEach(([name, lat, lng, major]) => {
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
