/* ============================================================================
 * BOD Dashboard - Growth vs profitability (quadrant) tab
 * Every comparable mature outlet is one bubble: x = like-for-like growth of the dashboard period vs the same months a year
 * earlier (sales or transactions, as chosen in the top bar), y = estimated PAT margin over the period (PAT / sales, where
 * PAT = PSH x working hours per outlet-month), bubble size = sales of the period. Outlets with no like-for-like base
 * (new outlets, or older ones without a full prior-year window) cannot have a growth rate; they are listed, not plotted.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN;
  if (!S.quadSplit) S.quadSplit = 'zero';
  if (S.quadCls === undefined) S.quadCls = null;

  var Q = {
    pg: { t: 'Profitable \u00b7 growing', col: '#0f7a55', pill: 'jg', bg: 'rgba(15,122,85,.07)', d: 'PAT above zero, growth at or above the split' },
    pd: { t: 'Profitable \u00b7 declining', col: '#d98a12', pill: 'js', bg: 'rgba(217,138,18,.08)', d: 'PAT above zero, growth below the split' },
    lg: { t: 'Loss-making \u00b7 growing', col: '#e0838c', pill: 'jx', bg: 'rgba(181,48,59,.06)', d: 'PAT at or below zero, growth at or above the split' },
    ld: { t: 'Loss-making \u00b7 declining', col: '#b5303b', pill: 'jl', bg: 'rgba(181,48,59,.09)', d: 'PAT at or below zero, growth below the split' },
    np: { t: 'Not plotted', col: '#a9b4c2', pill: 'jf', bg: '', d: 'No like-for-like growth (new outlet, no full prior-year base) or no PAT data' }
  };
  var ORDER = ['pg', 'pd', 'lg', 'ld', 'np'];

  function pill(k) { return '<span class="gv ' + Q[k].pill + '">' + Q[k].t + '</span>'; }
  function sgnP(v) { return isN(v) ? (v > 0 ? '+' : v < 0 ? '\u2212' : '') + F.p(Math.abs(v), 1) : '\u2013'; }

  B.tabs.quad = {
    render: function (ctx, view) {
      var P = ctx.P, rows = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      if (!rows.length) { view.innerHTML = '<div class="note warn">No trading outlets in this selection.</div>'; return; }
      var rateName = ctx.rateName;

      /* company like-for-like growth of the outlets in view (used for the optional split) */
      var sc = 0, sb = 0;
      ctx.lfl.forEach(function (r) { sc += S.rate === 'tx' ? r.txCur : r.revCur; sb += S.rate === 'tx' ? r.txBase : r.revBase; });
      var coG = sb > 0 ? sc / sb - 1 : NaN;
      var split = S.quadSplit === 'co' && isN(coG) ? coG : 0;

      var recs = rows.map(function (r) {
        var x = r.cat === 'lfl' ? r.rate : NaN, y = r.A.patMargin, plot = isN(x) && isN(y);
        var k = !plot ? 'np' : (r.A.pat > 0 ? (x >= split ? 'pg' : 'pd') : (x >= split ? 'lg' : 'ld'));
        return { r: r, o: r.o, ol: r.ol, x: x, y: y, k: k, rev: r.A.rev, pat: r.A.pat, psh: r.A.psh,
          why: plot ? '' : (r.cat === 'new' ? 'New outlet \u00b7 month ' + r.age : r.cat === 'nc' ? r.reason : !isN(y) ? 'No PSH / working-hours data' : r.reason) };
      });
      var cnt = {}, pat = {}; ORDER.forEach(function (k) { cnt[k] = 0; pat[k] = 0; });
      recs.forEach(function (x) { cnt[x.k]++; pat[x.k] += x.pat || 0; });
      var plotted = recs.filter(function (x) { return x.k !== 'np'; });

      /* ---------- controls, banner, cards ---------- */
      var seg = function (id, items, cur) { return '<div class="seg" id="' + id + '">' + items.map(function (x) { return '<button data-v="' + x[0] + '"' + (cur === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>'; };
      var ctl = '<div class="geoctl">' + seg('quadSplit', [['zero', 'Split growth at 0%'], ['co', 'Split at company like-for-like growth' + (isN(coG) ? ' (' + sgnP(coG) + ')' : '')]], S.quadSplit) +
        '<span class="geoleg">' + ['pg', 'pd', 'lg', 'ld'].map(function (k) { return '<span class="gv ' + Q[k].pill + '">' + Q[k].t + '</span>'; }).join('') + '</span></div>';
      var banner = '<div class="note"><b>Growth versus profitability, every outlet.</b> Right = faster ' + rateName + ' growth (' + esc(P.tag) + ' vs ' + esc(P.baseTag) + ', same months, like-for-like), up = higher estimated PAT margin over ' + esc(P.tag) + '. ' +
        '<b>PAT margin</b> = PAT \u00f7 sales, PAT = PSH \u00d7 working hours per outlet-month (management estimate, no other cost deducted). Bubble size = sales of the period. Outlets sitting top-right are the model; top-left are profitable but shrinking (protect or fix the traffic); bottom-right are loss-making but growing (watch for the turn, see the Profitability tab); bottom-left are loss-making and shrinking. ' +
        'The period and filters in the top bar apply; change the year or period there to see how outlets move between quadrants. Click a bubble or a table row for the outlet detail.</div>';
      var plotN = plotted.length;
      var cards = '<div class="lv" id="quadLv" style="grid-template-columns:repeat(5,1fr)">' + ORDER.map(function (k) {
        return '<button class="lc' + (S.quadCls === k ? ' on' : '') + '" data-cls="' + k + '" style="--c:' + Q[k].col + '"><div class="l">' + Q[k].t.toUpperCase() + '</div><div class="d">' + Q[k].d + '</div>' +
          '<div class="big">' + cnt[k] + '<small>outlets' + (k !== 'np' && plotN ? ' \u00b7 ' + F.p(cnt[k] / plotN, 0) : '') + '</small></div><div class="f"><b>' + F.m(pat[k], 1) + '</b><span>PAT Rp m, ' + esc(P.tag) + '</span></div></button>';
      }).join('') + '</div>';

      /* ---------- chart card ---------- */
      var nNew = recs.filter(function (x) { return x.r.cat === 'new'; }).length, nNc = recs.filter(function (x) { return x.r.cat === 'nc'; }).length;
      var chartCard = '<div class="card" style="margin-top:12px"><h4>Revenue growth versus profitability</h4><div class="ks">' + plotN + ' comparable mature outlets \u00b7 ' + rateName + ' growth ' + esc(P.tag) + ' vs ' + esc(P.baseTag) + ' \u00b7 bubble size reflects sales \u00b7 click to inspect' +
        (cnt.np ? ' \u00b7 not plotted: ' + nNew + ' new, ' + nNc + ' without a full prior-year base' + (cnt.np - nNew - nNc > 0 ? ', ' + (cnt.np - nNew - nNc) + ' without PAT data' : '') : '') + '</div>' +
        (plotN ? '<div class="ch" style="height:520px"><canvas id="quadC"></canvas></div>' : '<div class="note warn" style="margin-top:10px">No outlet has a like-for-like growth rate in ' + esc(P.tag) + ': the workbook has no full prior-year base for this period (history starts Jul 2024). Pick FY2026, a 2026 quarter or month, or Running 12 months in the top bar. The table below still lists every outlet with its PAT.</div>') + '</div>';

      /* ---------- table ---------- */
      var cols = [
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'ct', label: 'Kota', left: true, get: function (w) { return w.ol.city || ''; }, fmt: function (w) { return esc(w.ol.city || '\u2013'); } },
        { k: 'q', label: 'Quadrant', left: true, get: function (w) { return ORDER.indexOf(w.k); }, fmt: function (w) { return pill(w.k) + (w.why ? '<small style="display:block;color:var(--mute);white-space:normal">' + esc(w.why) + '</small>' : ''); } },
        { k: 'x', label: 'Growth', sub: rateName + ' \u00b7 ' + esc(P.tag), get: function (w) { return w.x; }, fmt: function (w) { return sgnP(w.x); }, tdc: function (w) { return F.cls(w.x); } },
        { k: 'y', label: 'PAT margin', sub: 'of sales', get: function (w) { return w.y; }, fmt: function (w) { return F.p(w.y, 2); }, tdc: function (w) { return F.cls(w.y); } },
        { k: 'pat', th: 'pt', cls: 'pt', label: 'PAT', sub: 'Rp m', get: function (w) { return w.pat; }, fmt: function (w) { return '<b>' + F.m(w.pat, 1) + '</b>'; }, tdc: function (w) { return F.cls(w.pat); } },
        { k: 'psh', label: 'PSH', sub: 'Rp/hr', get: function (w) { return w.psh; }, fmt: function (w) { return F.n(w.psh); }, tdc: function (w) { return F.cls(w.psh); } },
        { k: 'rev', label: 'Sales', sub: 'Rp m', get: function (w) { return w.rev; }, fmt: function (w) { return F.m(w.rev, 1); } },
        { k: 'dx', label: 'Distance to split', sub: 'growth, pts', get: function (w) { return isN(w.x) ? (w.x - split) * 100 : NaN; }, fmt: function (w) { return isN(w.x) ? ((w.x - split) * 100 >= 0 ? '+' : '\u2212') + Math.abs((w.x - split) * 100).toFixed(1) : '\u2013'; } }
      ];
      var list = recs.filter(function (x) { return !S.quadCls || x.k === S.quadCls; });
      var tbl = B.table('tbl-quad', list, cols, { defSort: 'pat', defDir: 1, limit: 500 });
      var tw = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlets by quadrant</h3><p>' + list.length + ' outlets' + (S.quadCls ? ' \u00b7 ' + esc(Q[S.quadCls].t) : '') + ' \u00b7 sortable \u00b7 select a quadrant card to filter \u00b7 click a row for the outlet detail</p></div>' +
        '<div style="display:flex;gap:8px;align-items:center">' + B.searchBox() + '<button class="btn" id="expQuad"><i class="fas fa-download"></i> Export</button></div></div>' + tbl.html + '</div>';

      view.innerHTML = banner + ctl + cards + chartCard + tw;

      /* ---------- wiring ---------- */
      tbl.bind(view); B.bindSearch(view);
      view.querySelectorAll('#quadSplit button').forEach(function (b) { b.onclick = function () { S.quadSplit = b.dataset.v; B.render(); }; });
      view.querySelectorAll('#quadLv .lc').forEach(function (el) { el.onclick = function () { var v = el.dataset.cls; S.quadCls = S.quadCls === v ? null : v; S.sort = null; B.render(); }; });
      view.querySelector('#expQuad').onclick = function () {
        B.csv('bod-growth-vs-profitability.csv', ['Code', 'Outlet', 'Type', 'Area manager', 'Province', 'Kota', 'Quadrant', 'Note', 'Growth (' + rateName + ')', 'PAT margin', 'PAT', 'PSH', 'Sales', 'Period', 'Growth split'],
          tbl.all.map(function (w) { return [w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.prov, w.ol.city, Q[w.k].t, w.why, isN(w.x) ? w.x.toFixed(4) : '', isN(w.y) ? w.y.toFixed(4) : '', Math.round(w.pat || 0), isN(w.psh) ? Math.round(w.psh) : '', Math.round(w.rev || 0), P.tag + ' vs ' + P.baseTag, split.toFixed(4)]; }));
      };

      /* ---------- chart ---------- */
      if (!plotN) return;
      var xs = plotted.map(function (x) { return x.x * 100; }), ys = plotted.map(function (x) { return x.y * 100; });
      var pct = function (arr, q) { var a = arr.slice().sort(function (u, v) { return u - v; }); var i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
      var nice = function (lo, hi, step) { return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]; };
      var sx = split * 100;
      // axes follow the 2nd-98th percentile so a few extreme outlets do not squash the rest; outliers are pinned to the edge
      var xr = nice(Math.min(pct(xs, 0.02), sx) - 2, Math.max(pct(xs, 0.98), sx) + 2, 10);
      var yr = nice(Math.min(pct(ys, 0.02), 0) - 1, Math.max(pct(ys, 0.98), 0) + 1, 5);
      var clampV = function (v, r) { return Math.min(r[1], Math.max(r[0], v)); };
      var nOut = plotted.filter(function (x) { return x.x * 100 < xr[0] || x.x * 100 > xr[1] || x.y * 100 < yr[0] || x.y * 100 > yr[1]; }).length;
      if (nOut) { var ksEl = view.querySelector('#view .card .ks, .card .ks'); if (ksEl) ksEl.innerHTML += ' \u00b7 ' + nOut + ' outlier' + (nOut > 1 ? 's' : '') + ' beyond the axis range shown on the edge (tooltip has the true value)'; }
      var maxRev = Math.max.apply(null, plotted.map(function (x) { return x.rev; }));
      var rad = function (v) { return 3.5 + Math.sqrt(Math.max(0, v) / maxRev) * 9; };
      var zones = {
        id: 'quadZones',
        beforeDatasetsDraw: function (ch) {
          var a = ch.chartArea, x = ch.scales.x, y = ch.scales.y, c = ch.ctx, px = x.getPixelForValue(sx), py = y.getPixelForValue(0);
          c.save();
          var rect = function (x0, y0, x1, y1, fill) { c.fillStyle = fill; c.fillRect(x0, y0, x1 - x0, y1 - y0); };
          rect(a.left, a.top, px, py, Q.pd.bg); rect(px, a.top, a.right, py, Q.pg.bg);
          rect(a.left, py, px, a.bottom, Q.ld.bg); rect(px, py, a.right, a.bottom, Q.lg.bg);
          c.strokeStyle = '#8a97a8'; c.lineWidth = 1; c.beginPath(); c.moveTo(a.left, py); c.lineTo(a.right, py); c.moveTo(px, a.top); c.lineTo(px, a.bottom); c.stroke();
          c.font = '600 13px "DM Sans", system-ui, sans-serif'; c.textBaseline = 'top';
          c.fillStyle = Q.pd.col; c.textAlign = 'left'; c.fillText('Profitable \u00b7 declining', a.left + 10, a.top + 8);
          c.fillStyle = Q.pg.col; c.textAlign = 'right'; c.fillText('Profitable \u00b7 growing', a.right - 10, a.top + 8);
          c.textBaseline = 'bottom';
          c.fillStyle = Q.ld.col; c.textAlign = 'left'; c.fillText('Loss-making \u00b7 declining', a.left + 10, a.bottom - 8);
          c.fillStyle = Q.lg.col; c.textAlign = 'right'; c.fillText('Loss-making \u00b7 growing', a.right - 10, a.bottom - 8);
          c.restore();
        }
      };
      var keys = ['pg', 'pd', 'lg', 'ld'];
      B.chart('quadC', { type: 'bubble', plugins: [zones], data: { datasets: keys.map(function (k) {
        return { label: Q[k].t, clip: 14, backgroundColor: Q[k].col + 'cc', borderColor: '#ffffff', borderWidth: 1, hoverBorderColor: '#16436f', hoverBorderWidth: 2,
          data: plotted.filter(function (x) { return x.k === k; }).map(function (x) { return { x: clampV(x.x * 100, xr), y: clampV(x.y * 100, yr), r: rad(x.rev), w: x }; }) };
      }) }, options: {
        onClick: function (e, els) { if (els && els.length) { var d = this.data.datasets[els[0].datasetIndex].data[els[0].index]; if (d && d.w) B.openOutlet(d.w.o); } },
        onHover: function (e, els) { if (e.native && e.native.target) e.native.target.style.cursor = els && els.length ? 'pointer' : 'default'; },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
          tooltip: { callbacks: { title: function (it) { return it[0].raw.w.ol.name; },
            label: function (c) { var w = c.raw.w; return w.ol.code + ' \u00b7 ' + w.ol.type + ' \u00b7 ' + w.ol.am; },
            afterLabel: function (c) { var w = c.raw.w; return ['Growth ' + sgnP(w.x) + ' \u00b7 PAT margin ' + F.p(w.y, 2), 'PAT Rp ' + F.m(w.pat, 1) + 'm \u00b7 sales Rp ' + F.m(w.rev, 0) + 'm', Q[w.k].t]; } } } },
        scales: {
          x: { min: xr[0], max: xr[1], title: { display: true, text: 'Comparable ' + rateName + ' growth \u00b7 ' + P.tag + ' vs ' + P.baseTag, font: { size: 11 } }, ticks: { font: { size: 10 }, stepSize: xr[1] - xr[0] > 80 ? 20 : 10, callback: function (v) { return Math.round(v) + '%'; } }, grid: { display: false } },
          y: { min: yr[0], max: yr[1], title: { display: true, text: 'Estimated PAT margin', font: { size: 11 } }, ticks: { font: { size: 10 }, stepSize: 5, callback: function (v) { return Math.round(v) + '%'; } }, grid: { display: false } } } } });
    }
  };
})(window);
