/* ============================================================================
 * BOD Dashboard - Rent vs profitability tab (Segments & geography)
 * Segments outlets by rent and shows how PSH / PAT behave inside each segment:
 *   (a) Rent per month   - bands such as 100-150 Jt, 150-200 Jt ...
 *   (b) Rent per m2      - bands such as 0.10-0.20 Jt, 0.20-0.30 Jt ... (rent per month / sales-floor m2)
 * Rent = MASTER "RENTAL" column, averaged over the months of the selected period that have a value.
 * PAT = PSH x working hours per outlet-month. Band PSH is hours-weighted (PAT / hours), never an average of ratios.
 * Nothing is estimated: outlets without rent (or, for the m2 view, without floor size) are counted but left out.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  if (!S.rentBy) S.rentBy = 'month';
  if (!S.rentScope) S.rentScope = 'mature';
  if (!S.rentStepM) S.rentStepM = 50;        // Jt per month
  if (!S.rentStepA) S.rentStepA = 0.1;       // Jt per m2 per month
  if (S.rentBand === undefined) S.rentBand = null;
  if (!S.rentY) S.rentY = 'psh';

  var MINB = 5;   // a band needs 5 outlets before it is treated as a benchmark
  var PAL = ['#8e9aaf', '#5b8def', '#2c9fb5', '#0f7a55', '#8bb23a', '#d98a12', '#d9622b', '#b5303b', '#7b3fa0', '#44508a'];

  function avgRent(m, o, months) {
    var s = 0, n = 0;
    months.forEach(function (t) { if (t < m.min || t > m.max) return; var v = E.get(m, 'rent', o, t); if (isN(v) && v > 0) { s += v; n++; } });
    return n ? s / n : NaN;
  }
  function sum(a, f) { var s = 0; a.forEach(function (x) { var v = f(x); if (isN(v)) s += v; }); return s; }
  function pct(a, p) { a = a.filter(isN).sort(function (x, y) { return x - y; }); if (!a.length) return NaN; var i = Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * p))); return a[i]; }
  function seg(id, items, cur) { return '<div class="seg" id="' + id + '">' + items.map(function (x) { return '<button data-v="' + x[0] + '"' + (String(cur) === String(x[0]) ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>'; }

  /* Jt amounts: per month bands in whole Jt, per m2 bands with 2 decimals */
  function jt(v, byM2) { return isN(v) ? (byM2 ? v.toFixed(2) : String(Math.round(v))) : '\u2013'; }
  function makeBands(vals, step, byM2) {
    var v = vals.filter(isN);
    if (!v.length) return [];
    var lo = Math.floor(Math.min.apply(null, v) / step + 1e-9) * step;
    var cap = Math.ceil(pct(v, 0.95) / step - 1e-9) * step;
    if (cap <= lo) cap = lo + step;
    var nb = Math.round((cap - lo) / step) + 1, bands = [];
    for (var i = 0; i < nb; i++) {
      var a = lo + i * step, b = a + step, last = i === nb - 1;
      bands.push({ i: i, lo: a, hi: last ? Infinity : b, last: last, col: PAL[i % PAL.length],
        label: last ? '\u2265 ' + jt(a, byM2) + ' Jt' : jt(a, byM2) + '\u2013' + jt(b, byM2) + ' Jt' });
    }
    return bands;
  }
  function bandOf(bands, v, step, lo) { var i = Math.floor((v - lo) / step + 1e-9); return Math.max(0, Math.min(bands.length - 1, i)); }

  B.tabs.rent = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, byM2 = S.rentBy === 'm2';
      if (!P.cur.length) { view.innerHTML = '<div class="note warn">No months in this selection yet.</div>'; return; }
      var all = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      var scoped = all.filter(function (r) { return S.rentScope === 'all' || r.cat !== 'new'; });
      var recs = scoped.map(function (r) {
        var A = r.A, ol = r.ol, fl = ol.floor, rentM = avgRent(m, r.o, P.cur);
        var patM = A.patOM > 0 ? A.pat / A.patOM : NaN, revM = A.revOM > 0 ? A.rev / A.revOM : NaN;
        var rpm = isN(rentM) && isN(fl) ? rentM / fl : NaN;
        return { o: r.o, ol: ol, r: r, fl: fl, rentM: rentM, rpm: rpm, revM: revM, patM: patM, psh: A.psh, isNew: r.cat === 'new',
          rentPct: isN(rentM) && isN(revM) && revM > 0 ? rentM / revM : NaN,
          x: byM2 ? rpm : rentM };
      });
      var hasRent = recs.filter(function (x) { return isN(x.rentM); }), hasX = recs.filter(function (x) { return isN(x.x); });
      var noRent = recs.length - hasRent.length, noFloor = hasRent.length - recs.filter(function (x) { return isN(x.rpm); }).length;
      var step = byM2 ? S.rentStepA : S.rentStepM, scale = 1e6;
      var xs = hasX.map(function (x) { return x.x / scale; });
      var bands = makeBands(xs, step, byM2), lo = bands.length ? bands[0].lo : 0;
      hasX.forEach(function (x) { x.bi = bandOf(bands, x.x / scale, step, lo); });

      var stepSeg = byM2 ? seg('rentStep', [[0.05, '0.05'], [0.1, '0.10'], [0.2, '0.20']], S.rentStepA) : seg('rentStep', [[25, '25'], [50, '50'], [100, '100']], S.rentStepM);
      var ctl = '<div class="geoctl">' + seg('rentBy', [['month', 'Rent per month'], ['m2', 'Rent per m\u00b2']], S.rentBy) +
        seg('rentScope', [['mature', 'Mature outlets only'], ['all', 'All trading outlets']], S.rentScope) +
        '<label>Band width (Jt' + (byM2 ? ' per m\u00b2' : '') + ') ' + stepSeg + '</label></div>';
      var banner = '<div class="note"><b>Rent vs profitability.</b> Outlets are grouped into bands of ' + (byM2 ? '<i>rent per m\u00b2 per month</i> (rent \u00f7 sales-floor m\u00b2, in Jt)' : '<i>rent per month</i> (in Jt)') +
        ' and each band shows PSH and PAT. Rent is the MASTER <i>RENTAL</i> column averaged over the months of ' + esc(P.tag) + ' that have a value. ' +
        '<b>PSH</b> of a band = total PAT \u00f7 total working hours (hours-weighted); <b>PAT</b> = PSH \u00d7 working hours per outlet-month, shown per outlet per month. ' +
        'The last band is open-ended (\u2265). Bands with fewer than ' + MINB + ' outlets are shown in grey and should be read as indicative. ' +
        '<b>Coverage:</b> ' + hasRent.length + ' of ' + recs.length + ' outlets in view have rent recorded' + (byM2 ? '; ' + (hasRent.length - noFloor) + ' of those also have a floor size (the others are left out of the per-m\u00b2 view)' : '') + '. ' +
        (S.rentScope === 'mature' ? 'New outlets (within ' + E.NEW_MONTHS + ' months of opening) are left out because they are still ramping up. ' : 'New outlets are included, so their ramp-up pulls band results down. ') +
        (B.isFiltered() ? 'Top-bar filters apply.' : '') + '</div>';

      if (!hasX.length) {
        view.innerHTML = banner + ctl + '<div class="note warn">No outlet in this selection has ' + (byM2 ? 'both a rent and a floor size' : 'a rent') + ' recorded in MASTER for ' + esc(P.tag) + '.</div>';
        wire(view); return;
      }

      /* ---------- band statistics ---------- */
      var st = bands.map(function (b) {
        var a = hasX.filter(function (x) { return x.bi === b.i; });
        var gs = a.length ? E.groupStats(m, P, a.map(function (x) { return x.r; })) : null;
        var withPat = a.filter(function (x) { return x.r.A.patOM > 0; });
        var fl = a.filter(function (x) { return isN(x.fl); });
        return { b: b, a: a, n: a.length,
          rent: U.mean(a, function (x) { return x.rentM; }), rpm: U.mean(a, function (x) { return x.rpm; }), floor: U.mean(fl, function (x) { return x.fl; }),
          psh: gs ? gs.a.psh : NaN, patO: U.mean(a, function (x) { return x.patM; }), revO: U.mean(a, function (x) { return x.revM; }),
          margin: gs ? gs.a.patMargin : NaN, rentPct: gs ? gs.a.rentPct : NaN,
          patPm2: fl.length ? sum(fl, function (x) { return x.patM; }) / sum(fl, function (x) { return x.fl; }) : NaN,
          prof: withPat.filter(function (x) { return x.r.patCur > 0; }).length, nPat: withPat.length,
          lfl: gs && P.baseAvailable ? gs.lRev : NaN };
      }).filter(function (s) { return s.n > 0; });
      var tot = (function () {
        var gs = E.groupStats(m, P, hasX.map(function (x) { return x.r; }));
        return { psh: gs.a.psh, patO: U.mean(hasX, function (x) { return x.patM; }), margin: gs.a.patMargin, rentPct: gs.a.rentPct,
          medX: U.median(xs), medRent: U.median(hasRent.map(function (x) { return x.rentM / 1e6; })), medRpm: U.median(recs.filter(function (x) { return isN(x.rpm); }).map(function (x) { return x.rpm / 1e6; })) };
      })();
      var bench = st.filter(function (s) { return s.n >= MINB && isN(s.psh); });
      var best = bench.slice().sort(function (a, b) { return b.psh - a.psh; })[0], worst = bench.slice().sort(function (a, b) { return a.psh - b.psh; })[0];

      /* ---------- cards ---------- */
      var cards = '<div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
        B.card('Outlets segmented', hasX.length + ' <small>of ' + recs.length + '</small>', noRent + ' without rent' + (byM2 ? '<br>' + noFloor + ' with rent but no floor size' : ''), noRent ? '' : 'pos') +
        B.card('Median ' + (byM2 ? 'rent per m\u00b2' : 'rent per month'), 'Rp ' + (byM2 ? F.n(tot.medX, 2) : F.n(tot.medX, 0)) + ' <small>Jt</small>', byM2 ? 'per m\u00b2 per month' : 'median outlet, ' + esc(P.tag)) +
        B.card('PSH \u00b7 these outlets', F.n(tot.psh), 'Rp per staff hour<br>PAT margin ' + F.p(tot.margin, 2), tot.psh < 0 ? 'neg' : 'pos') +
        B.card('Rent as share of sales', F.p(tot.rentPct, 1), 'Total rent \u00f7 total sales, outlets in view') +
        B.card('Best vs weakest band (PSH)', best ? esc(best.b.label) : '\u2013', best ? 'PSH ' + F.n(best.psh) + ' Rp/hr<br>weakest: ' + esc(worst.b.label) + ' \u00b7 ' + F.n(worst.psh) : 'No band has ' + MINB + ' outlets yet') + '</div>';

      /* ---------- band table ---------- */
      var rows = st.map(function (s) {
        var few = s.n < MINB, sel = S.rentBand === s.b.i;
        return '<tr data-b="' + s.b.i + '" style="cursor:pointer;' + (few ? 'color:var(--mute);' : '') + (sel ? 'background:#eef4ff;' : '') + '"><td class="l"><b><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + s.b.col + ';margin-right:6px"></span>' + esc(s.b.label) + '</b>' + (few ? ' <small>few</small>' : '') + '</td>' +
          '<td>' + s.n + '</td><td>' + F.m(s.rent, 1) + '</td><td>' + (isN(s.rpm) ? F.m(s.rpm, 3) : '\u2013') + '</td><td>' + (isN(s.floor) ? F.n(s.floor, 1) : '\u2013') + '</td>' +
          '<td>' + F.m(s.revO, 1) + '</td><td>' + F.p(s.rentPct, 1) + '</td>' +
          '<td class="pt ' + F.cls(s.psh) + '"><b>' + F.n(s.psh) + '</b></td><td class="' + F.cls(s.patO) + '"><b>' + F.m(s.patO, 2) + '</b></td><td class="' + F.cls(s.patPm2) + '">' + (isN(s.patPm2) ? F.m(s.patPm2, 3) : '\u2013') + '</td>' +
          '<td class="' + F.cls(s.margin) + '">' + F.p(s.margin, 2) + '</td><td>' + (s.nPat ? s.prof + ' / ' + s.nPat + ' <small style="color:var(--mute)">(' + F.p(s.prof / s.nPat, 0) + ')</small>' : '\u2013') + '</td>' +
          '<td class="' + F.cls(s.lfl) + '">' + (isN(s.lfl) ? F.p(s.lfl, 1, true) : '\u2013') + '</td></tr>';
      }).join('');
      var bandTbl = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>' + (byM2 ? 'Rent per m\u00b2 bands' : 'Rent per month bands') + ' vs PSH and PAT</h3><p>' + esc(P.tag) + ' \u00b7 ' + (S.rentScope === 'mature' ? 'mature outlets' : 'all trading outlets') + ' \u00b7 amounts in Jt (million Rupiah) unless stated \u00b7 click a band to list its outlets</p></div></div>' +
        '<div class="tx" style="max-height:none"><table id="rentBands"><thead><tr><th class="l">' + (byM2 ? 'Rent per m\u00b2 band' : 'Rent per month band') + '</th><th>Outlets</th><th>Rent / month<small>Jt</small></th><th>Rent per m\u00b2<small>Jt / month</small></th><th>Floor<small>m\u00b2</small></th>' +
        '<th>Sales / outlet<small>Jt per month</small></th><th>Rent / sales</th><th class="pt">PSH<small>Rp/hr</small></th><th>PAT / outlet<small>Jt per month</small></th><th>PAT per m\u00b2<small>Jt per month</small></th><th>PAT margin</th><th>Profitable outlets</th><th>Like-for-like sales<small>vs ' + esc(P.baseTag) + '</small></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';

      /* ---------- outlet table ---------- */
      var shown = S.rentBand === null ? hasX : hasX.filter(function (x) { return x.bi === S.rentBand; });
      var bandName = function (w) { return bands[w.bi] ? bands[w.bi].label : '\u2013'; };
      var cols = [
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + (w.isNew ? ' \u00b7 new' : '') + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'ct', label: 'Kota', left: true, get: function (w) { return w.ol.city || ''; }, fmt: function (w) { return esc(w.ol.city || '\u2013'); } },
        { k: 'bd', label: 'Band', left: true, get: function (w) { return w.bi; }, fmt: function (w) { return '<span class="gv" style="background:' + bands[w.bi].col + '22;color:' + bands[w.bi].col + '">' + esc(bandName(w)) + '</span>'; } },
        { k: 'rt', label: 'Rent / month', sub: 'Jt', get: function (w) { return w.rentM; }, fmt: function (w) { return F.m(w.rentM, 1); } },
        { k: 'fl', label: 'Floor', sub: 'm\u00b2', get: function (w) { return w.fl; }, fmt: function (w) { return F.n(w.fl, 1); } },
        { k: 'rp', label: 'Rent per m\u00b2', sub: 'Jt / month', get: function (w) { return w.rpm; }, fmt: function (w) { return isN(w.rpm) ? F.m(w.rpm, 3) : '\u2013'; } },
        { k: 'rv', label: 'Sales / month', sub: 'Jt', get: function (w) { return w.revM; }, fmt: function (w) { return F.m(w.revM, 1); } },
        { k: 'rs', label: 'Rent / sales', get: function (w) { return w.rentPct; }, fmt: function (w) { return F.p(w.rentPct, 1); } },
        { k: 'ps', th: 'pt', cls: 'pt', label: 'PSH', sub: 'Rp/hr', get: function (w) { return w.psh; }, fmt: function (w) { return '<b>' + F.n(w.psh) + '</b>'; }, tdc: function (w) { return F.cls(w.psh); } },
        { k: 'pm', label: 'PAT / month', sub: 'Jt', get: function (w) { return w.patM; }, fmt: function (w) { return F.m(w.patM, 2); }, tdc: function (w) { return F.cls(w.patM); } }
      ];
      var tbl = B.table('tbl-rent', shown, cols, { defSort: 'ps', defDir: -1, limit: 500 });
      var bsel = seg('rentBandSel', [['', 'All bands (' + hasX.length + ')']].concat(st.map(function (s) { return [s.b.i, s.b.label + ' (' + s.n + ')']; })), S.rentBand === null ? '' : S.rentBand);
      var tw = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlets by rent</h3><p>' + shown.length + ' outlets' + (S.rentBand !== null && bands[S.rentBand] ? ' \u00b7 band ' + esc(bands[S.rentBand].label) : '') + ' \u00b7 sortable \u00b7 click an outlet for its profile</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + B.searchBox() + '<button class="btn" id="expRent"><i class="fas fa-download"></i> Export</button></div></div>' +
        '<div style="padding:0 12px 8px;overflow-x:auto">' + bsel + '</div>' + tbl.html + '</div>';

      var ySeg = seg('rentY', [['psh', 'PSH'], ['pat', 'PAT per month']], S.rentY);
      view.innerHTML = banner + ctl + cards + bandTbl +
        '<div class="grid g2" style="margin-top:12px"><div class="card"><h4>PSH and PAT by ' + (byM2 ? 'rent per m\u00b2' : 'rent per month') + ' band</h4><div class="ch"><canvas id="rtC1"></canvas></div><div class="ks">Bars: PSH (Rp per staff hour, left). Line: PAT per outlet per month (Jt, right). Grey bars = fewer than ' + MINB + ' outlets.</div></div>' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">' + (byM2 ? 'Rent per m\u00b2' : 'Rent') + ' against ' + (S.rentY === 'pat' ? 'PAT' : 'PSH') + '</h4>' + ySeg + '</div><div class="ch"><canvas id="rtC2"></canvas></div><div class="ks">Each dot is an outlet. Click a dot to open its profile.</div></div></div>' + tw;

      /* ---------- wiring ---------- */
      wire(view);
      tbl.bind(view); B.bindSearch(view);
      view.querySelector('#rentBandSel').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.rentBand = b.dataset.v === '' ? null : +b.dataset.v; S.sort = null; B.render(); } };
      view.querySelectorAll('#rentBands tbody tr[data-b]').forEach(function (tr) { tr.onclick = function () { var i = +tr.dataset.b; S.rentBand = S.rentBand === i ? null : i; B.render(); }; });
      view.querySelector('#rentY').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.rentY = b.dataset.v; B.render(); } };
      view.querySelector('#expRent').onclick = function () {
        B.csv('bod-rent-vs-profit.csv', ['Code', 'Outlet', 'Type', 'Area manager', 'Kota', 'Floor m2', 'Period', 'Band', 'Rent per month (Rp)', 'Rent per m2 per month (Rp)', 'Sales per month (Rp)', 'Rent / sales', 'PSH (Rp/hr)', 'PAT per month (Rp)'],
          tbl.all.map(function (w) { return [w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.city || '', isN(w.fl) ? w.fl : '', P.tag, bandName(w), isN(w.rentM) ? Math.round(w.rentM) : '', isN(w.rpm) ? Math.round(w.rpm) : '', isN(w.revM) ? Math.round(w.revM) : '', isN(w.rentPct) ? w.rentPct.toFixed(4) : '', isN(w.psh) ? Math.round(w.psh) : '', isN(w.patM) ? Math.round(w.patM) : '']; }));
      };

      /* ---------- charts ---------- */
      var tick = { ticks: { font: { size: 10 } } };
      B.chart('rtC1', { data: { labels: st.map(function (s) { return s.b.label + ' (' + s.n + ')'; }), datasets: [
        { type: 'bar', label: 'PSH (Rp/hr)', data: st.map(function (s) { return isN(s.psh) ? s.psh : null; }), backgroundColor: st.map(function (s) { return s.n < MINB ? '#c9d1db' : s.b.col + 'cc'; }), yAxisID: 'y', order: 2 },
        { type: 'line', label: 'PAT per outlet / month (Jt)', data: st.map(function (s) { return isN(s.patO) ? s.patO / 1e6 : null; }), borderColor: '#b5303b', backgroundColor: '#b5303b', pointRadius: 4, borderWidth: 2, yAxisID: 'y1', order: 1 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 10 } } },
          y: { position: 'left', ticks: { font: { size: 10 } }, title: { display: true, text: 'PSH (Rp/hr)', font: { size: 10 } } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } }, title: { display: true, text: 'PAT per outlet / month (Jt)', font: { size: 10 } } } } } });
      var yk = S.rentY === 'pat' ? 'patM' : 'psh', yScale = S.rentY === 'pat' ? 1e6 : 1, pts = {}, ds = [];
      st.forEach(function (s) {
        var a = s.a.filter(function (x) { return isN(x[yk]); }); if (!a.length) return; pts[ds.length] = a;
        ds.push({ label: s.b.label, data: a.map(function (x) { return { x: x.x / scale, y: x[yk] / yScale }; }), backgroundColor: s.b.col + 'cc', borderColor: s.b.col, pointRadius: 4, pointHoverRadius: 6 });
      });
      B.chart('rtC2', { type: 'scatter', data: { datasets: ds }, options: { clip: 12,
        onClick: function (e, els) { if (els.length && pts[els[0].datasetIndex]) B.openOutlet(pts[els[0].datasetIndex][els[0].index].o); },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } }, tooltip: { callbacks: { label: function (c) { var x = pts[c.datasetIndex][c.dataIndex];
          return x.ol.name + ' \u00b7 rent Rp ' + F.m(x.rentM, 1) + ' Jt' + (isN(x.rpm) ? ' (Rp ' + F.m(x.rpm, 3) + ' Jt/m\u00b2)' : '') + ' \u00b7 PSH ' + F.n(x.psh) + ' \u00b7 PAT Rp ' + F.m(x.patM, 2) + ' Jt'; } } } },
        scales: { x: { title: { display: true, text: byM2 ? 'Rent per m\u00b2 per month (Jt)' : 'Rent per month (Jt)', font: { size: 10 } }, ticks: tick.ticks },
          y: { title: { display: true, text: S.rentY === 'pat' ? 'PAT per outlet / month (Jt)' : 'PSH (Rp/hr)', font: { size: 10 } }, ticks: tick.ticks } } } });
    }
  };

  function wire(view) {
    var on = function (id, fn) { var el = view.querySelector('#' + id); if (el) el.onclick = function (e) { var b = e.target.closest('button'); if (b) { fn(b.dataset.v); S.sort = null; S.rentBand = null; B.render(); } }; };
    on('rentBy', function (v) { S.rentBy = v; });
    on('rentScope', function (v) { S.rentScope = v; });
    on('rentStep', function (v) { if (S.rentBy === 'm2') S.rentStepA = +v; else S.rentStepM = +v; });
  }
})(window);
