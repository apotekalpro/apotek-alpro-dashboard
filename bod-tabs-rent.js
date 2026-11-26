/* ============================================================================
 * BOD Dashboard - Rent vs profitability tab (Segments & geography)
 * Segments outlets by rent and shows how PSH / PAT behave inside each segment. Both views are shown together:
 *   (a) Rent per month   - fixed 5 Jt bands: 0-5, 5-10, 10-15 ...
 *   (b) Rent per m2      - fixed 0.1 Jt bands: 0.0-0.1, 0.1-0.2 ... (rent per month / sales-floor m2)
 * Rent = MASTER "RENTAL" column, averaged over the months of the selected period that have a value.
 * PAT = PSH x working hours per outlet-month. Band PSH is hours-weighted (PAT / hours), never an average of ratios.
 * Nothing is estimated: outlets without rent (or, for the m2 view, without floor size) are counted but left out.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  if (!S.rentScope) S.rentScope = 'mature';
  if (S.rentBandM === undefined) S.rentBandM = null;   // band filter of the outlet table, rent per month
  if (S.rentBandA === undefined) S.rentBandA = null;   // band filter of the outlet table, rent per m2
  if (!S.rentX) S.rentX = 'month';                     // x axis of the scatter
  if (!S.rentY) S.rentY = 'psh';
  var STEP_M = 5, STEP_A = 0.1;                        // Jt per month / Jt per m2 per month (fixed)

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
  function jt(v, byM2) { return isN(v) ? (byM2 ? v.toFixed(2) : (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1))) : '\u2013'; }
  function makeBands(vals, step, byM2) {
    var v = vals.filter(isN);
    if (!v.length) return [];
    var lo = Math.floor(Math.min.apply(null, v) / step + 1e-9) * step;
    // Cover the whole range up to the highest rent. Only a far-out value (more than twice the 95th percentile, e.g. a data
    // entry slip) is folded into an open-ended top band so it cannot stretch the table.
    var mx = Math.max.apply(null, v), p95 = pct(v, 0.95), trunc = mx > 2 * p95 && mx > 30;
    var cap = Math.ceil((trunc ? p95 : mx) / step - 1e-9) * step;
    if (cap <= lo) cap = lo + step;
    var nb = Math.round((cap - lo) / step) + (trunc ? 1 : 0), bands = [];
    for (var i = 0; i < nb; i++) {
      var a = lo + i * step, b = a + step, last = trunc && i === nb - 1;
      bands.push({ i: i, lo: a, hi: last ? Infinity : b, last: last, col: PAL[i % PAL.length],
        label: last ? '\u2265 ' + jt(a, byM2) + ' Jt' : jt(a, byM2) + '\u2013' + jt(b, byM2) + ' Jt' });
    }
    return bands;
  }
  function bandOf(bands, v, step, lo) { var i = Math.floor((v - lo) / step + 1e-9); return Math.max(0, Math.min(bands.length - 1, i)); }

  /* statistics of one segmentation (rent per month, or rent per m2) */
  function dimStats(m, P, recs, byM2) {
    var key = byM2 ? 'rpm' : 'rentM', bk = byM2 ? 'ba' : 'bm', step = byM2 ? STEP_A : STEP_M;
    var items = recs.filter(function (x) { return isN(x[key]); });
    var xs = items.map(function (x) { return x[key] / 1e6; });
    var bands = makeBands(xs, step, byM2), lo = bands.length ? bands[0].lo : 0;
    items.forEach(function (x) { x[bk] = bandOf(bands, x[key] / 1e6, step, lo); });
    var st = bands.map(function (b) {
      var a = items.filter(function (x) { return x[bk] === b.i; });
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
    var bench = st.filter(function (s) { return s.n >= MINB && isN(s.psh); });
    return { byM2: byM2, key: key, bk: bk, sel: byM2 ? 'rentBandA' : 'rentBandM', items: items, bands: bands, st: st,
      best: bench.slice().sort(function (a, b) { return b.psh - a.psh; })[0], worst: bench.slice().sort(function (a, b) { return a.psh - b.psh; })[0] };
  }

  function bandTable(d, P, id) {
    var title = d.byM2 ? 'Rent per m\u00b2 bands' : 'Rent per month bands';
    var head = '<div class="th"><div><h3>' + title + ' vs PSH and PAT</h3><p>' + esc(P.tag) + ' \u00b7 ' + (S.rentScope === 'mature' ? 'mature outlets' : 'all trading outlets') + ' \u00b7 ' + (d.byM2 ? '0.1 Jt per m\u00b2 steps' : '5 Jt steps') + ' \u00b7 amounts in Jt (million Rupiah) unless stated \u00b7 click a band to filter the outlet list below</p></div></div>';
    if (!d.st.length) return '<div class="tw" style="margin-top:12px">' + head + '<div class="note warn" style="margin:8px 12px">No outlet has both a rent and a floor size recorded.</div></div>';
    var rows = d.st.map(function (s) {
      var few = s.n < MINB, sel = S[d.sel] === s.b.i;
      return '<tr data-b="' + s.b.i + '" style="cursor:pointer;' + (few ? 'color:var(--mute);' : '') + (sel ? 'background:#eef4ff;' : '') + '"><td class="l"><b><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + s.b.col + ';margin-right:6px"></span>' + esc(s.b.label) + '</b>' + (few ? ' <small>few</small>' : '') + '</td>' +
        '<td>' + s.n + '</td><td>' + F.m(s.rent, 1) + '</td><td>' + (isN(s.rpm) ? F.m(s.rpm, 3) : '\u2013') + '</td><td>' + (isN(s.floor) ? F.n(s.floor, 1) : '\u2013') + '</td>' +
        '<td>' + F.m(s.revO, 1) + '</td><td>' + F.p(s.rentPct, 1) + '</td>' +
        '<td class="pt ' + F.cls(s.psh) + '"><b>' + F.n(s.psh) + '</b></td><td class="' + F.cls(s.patO) + '"><b>' + F.m(s.patO, 2) + '</b></td><td class="' + F.cls(s.patPm2) + '">' + (isN(s.patPm2) ? F.m(s.patPm2, 3) : '\u2013') + '</td>' +
        '<td class="' + F.cls(s.margin) + '">' + F.p(s.margin, 2) + '</td><td>' + (s.nPat ? s.prof + ' / ' + s.nPat + ' <small style="color:var(--mute)">(' + F.p(s.prof / s.nPat, 0) + ')</small>' : '\u2013') + '</td>' +
        '<td class="' + F.cls(s.lfl) + '">' + (isN(s.lfl) ? F.p(s.lfl, 1, true) : '\u2013') + '</td></tr>';
    }).join('');
    return '<div class="tw" style="margin-top:12px">' + head +
      '<div class="tx" style="max-height:none"><table id="' + id + '"><thead><tr><th class="l">' + (d.byM2 ? 'Rent per m\u00b2 band' : 'Rent per month band') + '</th><th>Outlets</th><th>Rent / month<small>Jt</small></th><th>Rent per m\u00b2<small>Jt / month</small></th><th>Floor<small>m\u00b2</small></th>' +
      '<th>Sales / outlet<small>Jt per month</small></th><th>Rent / sales</th><th class="pt">PSH<small>Rp/hr</small></th><th>PAT / outlet<small>Jt per month</small></th><th>PAT per m\u00b2<small>Jt per month</small></th><th>PAT margin</th><th>Profitable outlets</th><th>Like-for-like sales<small>vs ' + esc(P.baseTag) + '</small></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function bandChart(id, d) {
    var st = d.st;
    B.chart(id, { data: { labels: st.map(function (s) { return s.b.label + ' (' + s.n + ')'; }), datasets: [
      { type: 'bar', label: 'PSH (Rp/hr)', data: st.map(function (s) { return isN(s.psh) ? s.psh : null; }), backgroundColor: st.map(function (s) { return s.n < MINB ? '#c9d1db' : s.b.col + 'cc'; }), yAxisID: 'y', order: 2 },
      { type: 'line', label: 'PAT per outlet / month (Jt)', data: st.map(function (s) { return isN(s.patO) ? s.patO / 1e6 : null; }), borderColor: '#b5303b', backgroundColor: '#b5303b', pointRadius: 4, borderWidth: 2, yAxisID: 'y1', order: 1 }] },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 10 } } },
        y: { position: 'left', ticks: { font: { size: 10 } }, title: { display: true, text: 'PSH (Rp/hr)', font: { size: 10 } } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } }, title: { display: true, text: 'PAT per outlet / month (Jt)', font: { size: 10 } } } } } });
  }

  B.tabs.rent = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P;
      if (!P.cur.length) { view.innerHTML = '<div class="note warn">No months in this selection yet.</div>'; return; }
      var all = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      var scoped = all.filter(function (r) { return S.rentScope === 'all' || r.cat !== 'new'; });
      var recs = scoped.map(function (r) {
        var A = r.A, ol = r.ol, fl = ol.floor, rentM = avgRent(m, r.o, P.cur);
        var patM = A.patOM > 0 ? A.pat / A.patOM : NaN, revM = A.revOM > 0 ? A.rev / A.revOM : NaN;
        var rpm = isN(rentM) && isN(fl) ? rentM / fl : NaN;
        return { o: r.o, ol: ol, r: r, fl: fl, rentM: rentM, rpm: rpm, revM: revM, patM: patM, psh: A.psh, isNew: r.cat === 'new',
          rentPct: isN(rentM) && isN(revM) && revM > 0 ? rentM / revM : NaN };
      });
      var hasRent = recs.filter(function (x) { return isN(x.rentM); }), hasRpm = recs.filter(function (x) { return isN(x.rpm); });
      var noRent = recs.length - hasRent.length, noFloor = hasRent.length - hasRpm.length;
      var ctl = '<div class="geoctl">' + seg('rentScope', [['mature', 'Mature outlets only'], ['all', 'All trading outlets']], S.rentScope) + '</div>';
      var banner = '<div class="note"><b>Rent vs profitability.</b> Outlets are grouped two ways, side by side: by <i>rent per month</i> (5 Jt bands) and by <i>rent per m\u00b2 per month</i> (rent \u00f7 sales-floor m\u00b2, 0.1 Jt bands). Each band shows PSH and PAT. ' +
        'Rent is the MASTER <i>RENTAL</i> column averaged over the months of ' + esc(P.tag) + ' that have a value. ' +
        '<b>PSH</b> of a band = total PAT \u00f7 total working hours (hours-weighted); <b>PAT</b> = PSH \u00d7 working hours per outlet-month, shown per outlet per month. ' +
        'Bands with fewer than ' + MINB + ' outlets are shown in grey and should be read as indicative. ' +
        '<b>Coverage:</b> ' + hasRent.length + ' of ' + recs.length + ' outlets in view have rent recorded; ' + hasRpm.length + ' of those also have a floor size (the others are left out of the per-m\u00b2 view). ' +
        (S.rentScope === 'mature' ? 'New outlets (within ' + E.NEW_MONTHS + ' months of opening) are left out because they are still ramping up. ' : 'New outlets are included, so their ramp-up pulls band results down. ') +
        (B.isFiltered() ? 'Top-bar filters apply.' : '') + '</div>';

      if (!hasRent.length) {
        view.innerHTML = banner + ctl + '<div class="note warn">No outlet in this selection has a rent recorded in MASTER for ' + esc(P.tag) + '.</div>';
        wire(view); return;
      }

      var dM = dimStats(m, P, recs, false), dA = dimStats(m, P, recs, true), scale = 1e6;
      var tot = (function () {
        var gs = E.groupStats(m, P, hasRent.map(function (x) { return x.r; }));
        return { psh: gs.a.psh, margin: gs.a.patMargin, rentPct: gs.a.rentPct,
          medRent: U.median(hasRent.map(function (x) { return x.rentM / scale; })), medRpm: U.median(hasRpm.map(function (x) { return x.rpm / scale; })) };
      })();
      var bw = function (d, sub) { return d.best ? esc(d.best.b.label) : '\u2013'; };
      var bwSub = function (d) { return d.best ? 'PSH ' + F.n(d.best.psh) + ' Rp/hr<br>weakest: ' + esc(d.worst.b.label) + ' \u00b7 ' + F.n(d.worst.psh) : 'No band has ' + MINB + ' outlets yet'; };

      /* ---------- cards ---------- */
      var cards = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
        B.card('Outlets segmented', hasRent.length + ' <small>of ' + recs.length + '</small>', noRent + ' without rent<br>' + noFloor + ' with rent but no floor size', noRent ? '' : 'pos') +
        B.card('Median rent per month', 'Rp ' + F.n(tot.medRent, 1) + ' <small>Jt</small>', 'median outlet, ' + esc(P.tag)) +
        B.card('Median rent per m\u00b2', 'Rp ' + F.n(tot.medRpm, 2) + ' <small>Jt</small>', 'per m\u00b2 per month') +
        B.card('PSH \u00b7 these outlets', F.n(tot.psh), 'Rp per staff hour<br>PAT margin ' + F.p(tot.margin, 2) + ' \u00b7 rent ' + F.p(tot.rentPct, 1) + ' of sales', tot.psh < 0 ? 'neg' : 'pos') +
        B.card('Best band \u00b7 rent per month', bw(dM), bwSub(dM)) +
        B.card('Best band \u00b7 rent per m\u00b2', bw(dA), bwSub(dA)) + '</div>';

      /* ---------- outlet table (keeps its band filters) ---------- */
      var shown = hasRent.filter(function (x) { return (S.rentBandM === null || x.bm === S.rentBandM) && (S.rentBandA === null || x.ba === S.rentBandA); });
      var bandName = function (d, i) { return isN(i) && d.bands[i] ? d.bands[i].label : '\u2013'; };
      var bandCol = function (k, label, d, bk) {
        return { k: k, label: label, left: true, get: function (w) { return isN(w[bk]) ? w[bk] : NaN; },
          fmt: function (w) { return isN(w[bk]) && d.bands[w[bk]] ? '<span class="gv" style="background:' + d.bands[w[bk]].col + '22;color:' + d.bands[w[bk]].col + '">' + esc(d.bands[w[bk]].label) + '</span>' : '\u2013'; } };
      };
      var cols = [
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + (w.isNew ? ' \u00b7 new' : '') + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'ct', label: 'Kota', left: true, get: function (w) { return w.ol.city || ''; }, fmt: function (w) { return esc(w.ol.city || '\u2013'); } },
        bandCol('bdm', 'Rent band', dM, 'bm'),
        bandCol('bda', 'Rent / m\u00b2 band', dA, 'ba'),
        { k: 'rt', label: 'Rent / month', sub: 'Jt', get: function (w) { return w.rentM; }, fmt: function (w) { return F.m(w.rentM, 1); } },
        { k: 'fl', label: 'Floor', sub: 'm\u00b2', get: function (w) { return w.fl; }, fmt: function (w) { return F.n(w.fl, 1); } },
        { k: 'rp', label: 'Rent per m\u00b2', sub: 'Jt / month', get: function (w) { return w.rpm; }, fmt: function (w) { return isN(w.rpm) ? F.m(w.rpm, 3) : '\u2013'; } },
        { k: 'rv', label: 'Sales / month', sub: 'Jt', get: function (w) { return w.revM; }, fmt: function (w) { return F.m(w.revM, 1); } },
        { k: 'rs', label: 'Rent / sales', get: function (w) { return w.rentPct; }, fmt: function (w) { return F.p(w.rentPct, 1); } },
        { k: 'ps', th: 'pt', cls: 'pt', label: 'PSH', sub: 'Rp/hr', get: function (w) { return w.psh; }, fmt: function (w) { return '<b>' + F.n(w.psh) + '</b>'; }, tdc: function (w) { return F.cls(w.psh); } },
        { k: 'pm', label: 'PAT / month', sub: 'Jt', get: function (w) { return w.patM; }, fmt: function (w) { return F.m(w.patM, 2); }, tdc: function (w) { return F.cls(w.patM); } }
      ];
      var tbl = B.table('tbl-rent', shown, cols, { defSort: 'ps', defDir: -1, limit: 500 });
      var filt = function (id, label, d) {
        if (!d.st.length) return '';
        return '<div style="display:flex;gap:8px;align-items:center;padding:0 12px 6px"><span style="font-size:11px;color:var(--mute);min-width:96px">' + label + '</span><div style="overflow-x:auto">' +
          seg(id, [['', 'All (' + d.items.length + ')']].concat(d.st.map(function (s) { return [s.b.i, s.b.label + ' (' + s.n + ')']; })), S[d.sel] === null ? '' : S[d.sel]) + '</div></div>';
      };
      var selTxt = (S.rentBandM !== null && dM.bands[S.rentBandM] ? ' \u00b7 rent ' + esc(dM.bands[S.rentBandM].label) : '') + (S.rentBandA !== null && dA.bands[S.rentBandA] ? ' \u00b7 rent per m\u00b2 ' + esc(dA.bands[S.rentBandA].label) : '');
      var tw = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlets by rent</h3><p>' + shown.length + ' outlets' + selTxt + ' \u00b7 sortable \u00b7 click an outlet for its profile</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + B.searchBox() + '<button class="btn" id="expRent"><i class="fas fa-download"></i> Export</button></div></div>' +
        filt('rentBandSelM', 'Rent per month', dM) + filt('rentBandSelA', 'Rent per m\u00b2', dA) + tbl.html + '</div>';

      var xm2 = S.rentX === 'm2', dX = xm2 ? dA : dM;
      var ySeg = seg('rentY', [['psh', 'PSH'], ['pat', 'PAT per month']], S.rentY), xSeg = seg('rentX', [['month', 'Rent per month'], ['m2', 'Rent per m\u00b2']], S.rentX);
      view.innerHTML = banner + ctl + cards +
        bandTable(dM, P, 'rentBandsM') + bandTable(dA, P, 'rentBandsA') +
        '<div class="grid g2" style="margin-top:12px">' +
        '<div class="card"><h4>PSH and PAT by rent per month band</h4><div class="ch"><canvas id="rtC1"></canvas></div><div class="ks">Bars: PSH (Rp per staff hour, left). Line: PAT per outlet per month (Jt, right). Grey bars = fewer than ' + MINB + ' outlets.</div></div>' +
        '<div class="card"><h4>PSH and PAT by rent per m\u00b2 band</h4><div class="ch"><canvas id="rtC3"></canvas></div><div class="ks">Same reading, bands of rent per m\u00b2 per month (Jt).</div></div></div>' +
        '<div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h4 style="margin:0">' + (xm2 ? 'Rent per m\u00b2' : 'Rent') + ' against ' + (S.rentY === 'pat' ? 'PAT' : 'PSH') + '</h4><div style="display:flex;gap:8px;flex-wrap:wrap">' + xSeg + ySeg + '</div></div><div class="ch"><canvas id="rtC2"></canvas></div><div class="ks">Each dot is an outlet. Click a dot to open its profile.</div></div>' + tw;

      /* ---------- wiring ---------- */
      wire(view);
      tbl.bind(view); B.bindSearch(view);
      var pick = function (id, key) {
        var el = view.querySelector('#' + id); if (!el) return;
        el.onclick = function (e) { var b = e.target.closest('button'); if (b) { S[key] = b.dataset.v === '' ? null : +b.dataset.v; S.sort = null; B.render(); } };
      };
      pick('rentBandSelM', 'rentBandM'); pick('rentBandSelA', 'rentBandA');
      [['rentBandsM', 'rentBandM'], ['rentBandsA', 'rentBandA']].forEach(function (p) {
        view.querySelectorAll('#' + p[0] + ' tbody tr[data-b]').forEach(function (tr) { tr.onclick = function () { var i = +tr.dataset.b; S[p[1]] = S[p[1]] === i ? null : i; B.render(); }; });
      });
      view.querySelector('#rentY').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.rentY = b.dataset.v; B.render(); } };
      view.querySelector('#rentX').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.rentX = b.dataset.v; B.render(); } };
      view.querySelector('#expRent').onclick = function () {
        B.csv('bod-rent-vs-profit.csv', ['Code', 'Outlet', 'Type', 'Area manager', 'Kota', 'Floor m2', 'Period', 'Rent band', 'Rent per m2 band', 'Rent per month (Rp)', 'Rent per m2 per month (Rp)', 'Sales per month (Rp)', 'Rent / sales', 'PSH (Rp/hr)', 'PAT per month (Rp)'],
          tbl.all.map(function (w) { return [w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.city || '', isN(w.fl) ? w.fl : '', P.tag, bandName(dM, w.bm), bandName(dA, w.ba), isN(w.rentM) ? Math.round(w.rentM) : '', isN(w.rpm) ? Math.round(w.rpm) : '', isN(w.revM) ? Math.round(w.revM) : '', isN(w.rentPct) ? w.rentPct.toFixed(4) : '', isN(w.psh) ? Math.round(w.psh) : '', isN(w.patM) ? Math.round(w.patM) : '']; }));
      };

      /* ---------- charts ---------- */
      if (dM.st.length) bandChart('rtC1', dM);
      if (dA.st.length) bandChart('rtC3', dA);
      var tick = { ticks: { font: { size: 10 } } };
      var yk = S.rentY === 'pat' ? 'patM' : 'psh', yScale = S.rentY === 'pat' ? 1e6 : 1, pts = {}, ds = [];
      dX.st.forEach(function (s) {
        var a = s.a.filter(function (x) { return isN(x[yk]); }); if (!a.length) return; pts[ds.length] = a;
        ds.push({ label: s.b.label, data: a.map(function (x) { return { x: x[dX.key] / scale, y: x[yk] / yScale }; }), backgroundColor: s.b.col + 'cc', borderColor: s.b.col, pointRadius: 4, pointHoverRadius: 6 });
      });
      B.chart('rtC2', { type: 'scatter', data: { datasets: ds }, options: { clip: 12,
        onClick: function (e, els) { if (els.length && pts[els[0].datasetIndex]) B.openOutlet(pts[els[0].datasetIndex][els[0].index].o); },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } }, tooltip: { callbacks: { label: function (c) { var x = pts[c.datasetIndex][c.dataIndex];
          return x.ol.name + ' \u00b7 rent Rp ' + F.m(x.rentM, 1) + ' Jt' + (isN(x.rpm) ? ' (Rp ' + F.m(x.rpm, 3) + ' Jt/m\u00b2)' : '') + ' \u00b7 PSH ' + F.n(x.psh) + ' \u00b7 PAT Rp ' + F.m(x.patM, 2) + ' Jt'; } } } },
        scales: { x: { title: { display: true, text: xm2 ? 'Rent per m\u00b2 per month (Jt)' : 'Rent per month (Jt)', font: { size: 10 } }, ticks: tick.ticks },
          y: { title: { display: true, text: S.rentY === 'pat' ? 'PAT per outlet / month (Jt)' : 'PSH (Rp/hr)', font: { size: 10 } }, ticks: tick.ticks } } } });
    }
  };

  function wire(view) {
    var el = view.querySelector('#rentScope');
    if (el) el.onclick = function (e) { var b = e.target.closest('button'); if (b) { S.rentScope = b.dataset.v; S.sort = null; S.rentBandM = null; S.rentBandA = null; B.render(); } };
  }
})(window);
