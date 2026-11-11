/* ============================================================================
 * BOD Dashboard - Store size & profitability tab
 * Uses MASTER columns "Size Category" (SS / S / M / L / XL) and "Size Sales Floor (m2)".
 * Per-m2 measures are always per FULL m2 per month:
 *   Sales per m2 per month = (revenue / months with sales) / sales-floor m2
 *   PAT per m2 per month   = (PAT / months with PSH and hours) / sales-floor m2   (PAT = PSH x working hours)
 * Band totals are floor-weighted (sum of monthly sales / sum of m2), not an average of ratios.
 * Nothing is estimated: outlets without a floor size are listed as "Not recorded" and left out of per-m2 figures.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  if (!S.sizeScope) S.sizeScope = 'mature';
  if (!S.sizeBand) S.sizeBand = '';
  if (!S.sizeY) S.sizeY = 'sales';

  var ORDER = ['SS', 'S', 'M', 'L', 'XL', 'Not recorded'];
  var COL = { SS: '#8e9aaf', S: '#5b8def', M: '#0f7a55', L: '#d98a12', XL: '#7b3fa0', 'Not recorded': '#a9b4c2' };
  var BAND_TXT = 'SS under 10 m\u00b2, S 10\u201320, M 20\u201330, L 30\u201350, XL 50 and above';
  var TOL = 0.2, MINB = 5;   // verdict at +/-20% of the band median; a band needs 5 outlets for a benchmark

  function inferred(f) { return !isN(f) ? '' : f < 10 ? 'SS' : f < 20 ? 'S' : f < 30 ? 'M' : f < 50 ? 'L' : 'XL'; }
  function avgCell(m, key, o, months) {
    var s = 0, n = 0;
    months.forEach(function (t) { if (t < m.min || t > m.max) return; var v = E.get(m, key, o, t); if (isN(v)) { s += v; n++; } });
    return n ? s / n : NaN;
  }
  function sum(a, f) { var s = 0; a.forEach(function (x) { var v = f(x); if (isN(v)) s += v; }); return s; }
  function pill(v) { return v === 'above' ? '<span class="gv jg">Above band</span>' : v === 'below' ? '<span class="gv jl">Below band</span>' : v === 'in' ? '<span class="gv js">In line</span>' : '<span class="gv jf">\u2013</span>'; }
  function sg(v, d) { return isN(v) ? (v > 0 ? '+' : v < 0 ? '\u2212' : '') + F.m(Math.abs(v), d == null ? 2 : d) : '\u2013'; }
  B.sizeBands = ORDER;
  B.sizeColor = COL;

  B.tabs.size = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P;
      if (!P.cur.length) { view.innerHTML = '<div class="note warn">No months in this selection yet.</div>'; return; }
      var all = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      var recs = all.filter(function (r) { return S.sizeScope === 'all' || r.cat !== 'new'; }).map(function (r) {
        var ol = r.ol, fl = ol.floor, A = r.A;
        var revM = A.revOM > 0 ? A.rev / A.revOM : NaN, patM = A.patOM > 0 ? A.pat / A.patOM : NaN;
        var rentM = avgCell(m, 'rent', r.o, P.cur), whM = A.patOM > 0 ? A.wh / A.patOM : NaN, ok = isN(fl);
        return {
          o: r.o, ol: ol, r: r, band: B.sizeKey(ol), fl: ok ? fl : NaN, isNew: r.cat === 'new',
          revM: revM, patM: patM, rentM: rentM,
          spm: ok ? revM / fl : NaN, ppm: ok ? patM / fl : NaN, rpm: ok ? rentM / fl : NaN, hpm: ok ? whM / fl : NaN
        };
      });
      var nTrade = all.length, nSc = recs.length;
      var withF = recs.filter(function (x) { return isN(x.fl); });
      var withCat = recs.filter(function (x) { return !!x.ol.sizeCat; });
      var noFl = recs.length - withF.length, noCat = recs.length - withCat.length;

      /* band statistics */
      var byBand = {}; ORDER.forEach(function (k) { byBand[k] = []; });
      recs.forEach(function (x) { byBand[x.band].push(x); });
      function stat(a) {
        var f = a.filter(function (x) { return isN(x.fl); }), sp = f.filter(function (x) { return isN(x.spm); }), pp = f.filter(function (x) { return isN(x.ppm); }), rp = f.filter(function (x) { return isN(x.rpm); });
        var gs = a.length ? E.groupStats(m, P, a.map(function (x) { return x.r; })) : null;
        var withPat = a.filter(function (x) { return x.r.A.patOM > 0; });
        return {
          n: a.length, nF: f.length, minF: f.length ? Math.min.apply(null, f.map(function (x) { return x.fl; })) : NaN, maxF: f.length ? Math.max.apply(null, f.map(function (x) { return x.fl; })) : NaN,
          medF: U.median(f.map(function (x) { return x.fl; })), totF: sum(f, function (x) { return x.fl; }),
          spm: sp.length ? sum(sp, function (x) { return x.revM; }) / sum(sp, function (x) { return x.fl; }) : NaN,
          ppm: pp.length ? sum(pp, function (x) { return x.patM; }) / sum(pp, function (x) { return x.fl; }) : NaN,
          rpm: rp.length ? sum(rp, function (x) { return x.rentM; }) / sum(rp, function (x) { return x.fl; }) : NaN,
          hpm: f.length ? U.mean(f, function (x) { return x.hpm; }) : NaN,
          medSpm: U.median(sp.map(function (x) { return x.spm; })), medPpm: U.median(pp.map(function (x) { return x.ppm; })),
          revO: a.length ? U.mean(a, function (x) { return x.revM; }) : NaN, patO: a.length ? U.mean(a, function (x) { return x.patM; }) : NaN,
          margin: gs ? gs.a.patMargin : NaN, psh: gs ? gs.a.psh : NaN, lfl: gs && P.baseAvailable ? gs.lRev : NaN, nLfl: gs ? gs.nLfl : 0,
          prof: withPat.filter(function (x) { return x.r.patCur > 0; }).length, nPat: withPat.length
        };
      }
      var st = {}; ORDER.forEach(function (k) { st[k] = stat(byBand[k]); });
      var tot = stat(recs), totF = stat(withF);

      /* benchmark each outlet against the median of its own band */
      recs.forEach(function (x) {
        var s = st[x.band], ok = s.nF >= MINB && x.band !== 'Not recorded';
        x.idx = ok && isN(x.spm) && s.medSpm > 0 ? x.spm / s.medSpm - 1 : NaN;
        x.pgap = ok && isN(x.ppm) && isN(s.medPpm) ? x.ppm - s.medPpm : NaN;
        x.verdict = isN(x.idx) ? (x.idx >= TOL ? 'above' : x.idx <= -TOL ? 'below' : 'in') : '';
      });

      /* bands that matter for the cards */
      var rank = ORDER.slice(0, 5).filter(function (k) { return st[k].nF >= MINB && isN(st[k].ppm); }).sort(function (a, b) { return st[b].ppm - st[a].ppm; });
      var rankS = ORDER.slice(0, 5).filter(function (k) { return st[k].nF >= MINB && isN(st[k].spm); }).sort(function (a, b) { return st[b].spm - st[a].spm; });

      /* label versus the m2 actually recorded */
      var mism = withF.filter(function (x) { return x.ol.sizeCat && inferred(x.fl) !== x.ol.sizeCat; });

      var seg = function (id, items, cur) { return '<div class="seg" id="' + id + '">' + items.map(function (x) { return '<button data-v="' + x[0] + '"' + (String(cur) === String(x[0]) ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>'; };

      /* ---------- banner ---------- */
      var banner = '<div class="note"><b>Store size &amp; profitability.</b> Size comes from two MASTER columns: <i>Size Category</i> (SS / S / M / L / XL, as you classified it) and <i>Size Sales Floor (m\u00b2)</i>. ' +
        '<b>Sales per m\u00b2</b> = average monthly sales \u00f7 sales-floor m\u00b2; <b>PAT per m\u00b2</b> = average monthly PAT \u00f7 sales-floor m\u00b2 (PAT = PSH \u00d7 working hours). Both are per month, for ' + esc(P.tag) + '. ' +
        'Band figures are floor-weighted (total monthly sales \u00f7 total m\u00b2), so a large store counts for more than a small one. ' +
        '<b>Coverage:</b> ' + withF.length + ' of ' + nSc + ' outlets in view have a floor size and ' + withCat.length + ' have a size category; the ' + noFl + ' without floor size are shown as \u201cNot recorded\u201d and kept out of every per-m\u00b2 figure (nothing is estimated). ' +
        'An outlet is benchmarked against the <i>median of its own size category</i> once the category has at least ' + MINB + ' outlets with a floor size: \u201cAbove band\u201d / \u201cBelow band\u201d means sales per m\u00b2 at least ' + Math.round(TOL * 100) + '% above / below that median. ' +
        (S.sizeScope === 'mature' ? 'New outlets (within ' + E.NEW_MONTHS + ' months of opening) are left out because they are still ramping up; switch to \u201cAll trading outlets\u201d to include them. ' : 'New outlets are included, so their ramp-up pulls band averages down. ') +
        (B.isFiltered() ? 'Top-bar filters apply.' : '') + '</div>';
      var ctl = '<div class="geoctl">' + seg('sizeScope', [['mature', 'Mature outlets only'], ['all', 'All trading outlets']], S.sizeScope) +
        '<span class="geoleg">' + ORDER.map(function (k) { return '<span class="gv" style="background:' + COL[k] + '22;color:' + COL[k] + '">' + esc(k) + ' \u00b7 ' + st[k].n + '</span>'; }).join('') + '</span></div>';

      if (!withF.length && !withCat.length) {
        view.innerHTML = banner + ctl + '<div class="note warn">None of the outlets in this selection has a size category or floor size recorded in MASTER.</div>';
        view.querySelector('#sizeScope').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.sizeScope = b.dataset.v; B.render(); } };
        return;
      }

      /* ---------- cards ---------- */
      var cards = '<div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
        B.card('Size recorded', withF.length + ' <small>of ' + nSc + '</small>', F.p(nSc ? withF.length / nSc : NaN, 0) + ' of outlets have a floor size<br>' + noFl + ' without \u00b7 ' + noCat + ' without a category', noFl ? '' : 'pos') +
        B.card('Median sales floor', isN(totF.medF) ? F.n(totF.medF, 1) + ' <small>m\u00b2</small>' : '\u2013', 'Smallest ' + F.n(totF.minF, 1) + ' \u00b7 largest ' + F.n(totF.maxF, 1) + ' m\u00b2<br>' + F.n(totF.totF, 0) + ' m\u00b2 in total') +
        B.card('Sales per m\u00b2 / month', isN(totF.spm) ? 'Rp ' + F.m(totF.spm, 2) + 'm' : '\u2013', 'Floor-weighted, outlets with size<br>median outlet Rp ' + F.m(totF.medSpm, 2) + 'm') +
        B.card('PAT per m\u00b2 / month', isN(totF.ppm) ? 'Rp ' + F.m(totF.ppm, 3) + 'm' : '\u2013', 'Median outlet Rp ' + F.m(totF.medPpm, 3) + 'm<br>PAT margin ' + F.p(totF.margin, 2), isN(totF.ppm) && totF.ppm < 0 ? 'neg' : '') +
        B.card('Most productive size', rank.length ? esc(rank[0]) : '\u2013', rank.length ? 'PAT per m\u00b2 Rp ' + F.m(st[rank[0]].ppm, 3) + 'm<br>weakest: ' + esc(rank[rank.length - 1]) + ' Rp ' + F.m(st[rank[rank.length - 1]].ppm, 3) + 'm' : 'No size category has ' + MINB + ' outlets with data') + '</div>';

      /* ---------- band table ---------- */
      var brow = function (k, lab) {
        var s = k === '*' ? totF : st[k]; if (!s.n && k !== '*') return '';
        var nn = k === '*' ? withF.length : s.n;
        return '<tr style="cursor:default' + (k === '*' ? ';font-weight:700;background:#f6f8fb' : '') + '"><td class="l"><b>' + (k === '*' ? lab : '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + COL[k] + ';margin-right:6px"></span>' + esc(lab)) + '</b></td>' +
          '<td>' + nn + '</td><td>' + (s.nF ? F.n(s.minF, 1) + ' \u2013 ' + F.n(s.maxF, 1) : '\u2013') + '</td><td>' + F.n(s.medF, 1) + '</td>' +
          '<td>' + F.m(s.revO, 1) + '</td><td class="pt"><b>' + F.m(s.spm, 2) + '</b></td><td class="' + F.cls(s.ppm) + '"><b>' + F.m(s.ppm, 3) + '</b></td>' +
          '<td class="' + F.cls(s.patO) + '">' + F.m(s.patO, 2) + '</td><td class="' + F.cls(s.margin) + '">' + F.p(s.margin, 2) + '</td><td class="' + F.cls(s.psh) + '">' + F.n(s.psh) + '</td>' +
          '<td>' + F.m(s.rpm, 3) + '</td><td>' + F.n(s.hpm, 1) + '</td><td class="' + F.cls(s.lfl) + '">' + (isN(s.lfl) ? F.p(s.lfl, 1, true) : '\u2013') + '</td>' +
          '<td>' + (s.nPat ? s.prof + ' / ' + s.nPat + ' <small style="color:var(--mute)">(' + F.p(s.prof / s.nPat, 0) + ')</small>' : '\u2013') + '</td></tr>';
      };
      var bt = ORDER.map(function (k) { return brow(k, k === 'Not recorded' ? 'Not recorded' : k); }).join('') + brow('*', 'All with floor size');
      var bandTbl = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Size bands</h3><p>' + esc(P.tag) + ' \u00b7 ' + (S.sizeScope === 'mature' ? 'mature outlets' : 'all trading outlets') + '. Per-m\u00b2 columns use only outlets with a floor size. Rp m unless stated.</p></div></div>' +
        '<div class="tx" style="max-height:none"><table><thead><tr><th class="l">Size category</th><th>Outlets</th><th>Floor range<small>m\u00b2</small></th><th>Median floor<small>m\u00b2</small></th><th>Sales / outlet<small>per month</small></th><th class="pt">Sales per m\u00b2<small>per month</small></th><th>PAT per m\u00b2<small>per month</small></th>' +
        '<th>PAT / outlet<small>per month</small></th><th>PAT margin</th><th>PSH<small>Rp/hr</small></th><th>Rent per m\u00b2<small>per month</small></th><th>Staff hours per m\u00b2<small>per month</small></th><th>Like-for-like sales<small>vs ' + esc(P.baseTag || 'last year') + '</small></th><th>Profitable outlets</th></tr></thead><tbody>' + bt + '</tbody></table></div></div>';

      /* ---------- outlet table ---------- */
      var shown = S.sizeBand ? recs.filter(function (x) { return x.band === S.sizeBand; }) : recs;
      var cols = [
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + (w.isNew ? ' \u00b7 new' : '') + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'ct', label: 'Kota', left: true, get: function (w) { return w.ol.city || ''; }, fmt: function (w) { return esc(w.ol.city || '\u2013'); } },
        { k: 'sc', label: 'Size', left: true, get: function (w) { return ORDER.indexOf(w.band); }, fmt: function (w) { return '<span class="gv" style="background:' + COL[w.band] + '22;color:' + COL[w.band] + '">' + esc(w.band === 'Not recorded' ? '\u2013' : w.band) + '</span>'; } },
        { k: 'fl', label: 'Floor', sub: 'm\u00b2', get: function (w) { return w.fl; }, fmt: function (w) { return F.n(w.fl, 1); } },
        { k: 'rv', label: 'Sales / month', sub: 'Rp m', get: function (w) { return w.revM; }, fmt: function (w) { return F.m(w.revM, 1); } },
        { k: 'sp', th: 'pt', cls: 'pt', label: 'Sales per m\u00b2', sub: 'per month \u00b7 Rp m', get: function (w) { return w.spm; }, fmt: function (w) { return '<b>' + F.m(w.spm, 2) + '</b>'; } },
        { k: 'ix', label: 'vs size category', sub: 'sales per m\u00b2', get: function (w) { return w.idx; }, fmt: function (w) { return isN(w.idx) ? F.p(w.idx, 0, true) : '\u2013'; }, tdc: function (w) { return F.cls(w.idx); } },
        { k: 'pm', label: 'PAT / month', sub: 'Rp m', get: function (w) { return w.patM; }, fmt: function (w) { return F.m(w.patM, 2); }, tdc: function (w) { return F.cls(w.patM); } },
        { k: 'pp', label: 'PAT per m\u00b2', sub: 'per month \u00b7 Rp m', get: function (w) { return w.ppm; }, fmt: function (w) { return F.m(w.ppm, 3); }, tdc: function (w) { return F.cls(w.ppm); } },
        { k: 'pg', label: 'vs size category', sub: 'PAT per m\u00b2 \u00b7 Rp m', get: function (w) { return w.pgap; }, fmt: function (w) { return sg(w.pgap, 3); }, tdc: function (w) { return F.cls(w.pgap); } },
        { k: 'rp', label: 'Rent per m\u00b2', sub: 'per month \u00b7 Rp m', get: function (w) { return w.rpm; }, fmt: function (w) { return F.m(w.rpm, 3); } },
        { k: 'hp', label: 'Staff hours per m\u00b2', sub: 'per month', get: function (w) { return w.hpm; }, fmt: function (w) { return F.n(w.hpm, 1); } },
        { k: 'ps', label: 'PSH', sub: 'Rp/hr', get: function (w) { return w.r.A.psh; }, fmt: function (w) { return F.n(w.r.A.psh); }, tdc: function (w) { return F.cls(w.r.A.psh); } },
        { k: 'vd', label: 'Verdict', left: true, get: function (w) { return isN(w.idx) ? w.idx : NaN; }, fmt: function (w) { return pill(w.verdict); } }
      ];
      var tbl = B.table('tbl-size', shown, cols, { defSort: 'sp', defDir: -1, limit: 500 });
      var bseg = seg('sizeBand', [['', 'All (' + recs.length + ')']].concat(ORDER.filter(function (k) { return st[k].n; }).map(function (k) { return [k, k + ' (' + st[k].n + ')']; })), S.sizeBand);
      var tw = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlets by size</h3><p>' + shown.length + ' outlets' + (S.sizeBand ? ' \u00b7 size ' + esc(S.sizeBand) : '') + ' \u00b7 sortable \u00b7 click an outlet for its profile</p></div><div style="display:flex;gap:8px;align-items:center">' + B.searchBox() + '<button class="btn" id="expSize">Export CSV</button></div></div>' + '<div style="margin:0 12px 8px">' + bseg + '</div>' + tbl.html + '</div>';

      /* ---------- data-quality note ---------- */
      var dq = '';
      if (mism.length) dq = '<div class="note warn" style="margin-top:12px"><b>Label and floor size disagree for ' + mism.length + ' outlet(s).</b> The category you entered is used as given; the usual bands in your data are ' + BAND_TXT + ' m\u00b2. ' +
        mism.slice(0, 8).map(function (x) { return esc(x.ol.name) + ' (' + esc(x.ol.sizeCat) + ', ' + F.n(x.fl, 2) + ' m\u00b2)'; }).join(' \u00b7 ') + (mism.length > 8 ? ' \u00b7 and ' + (mism.length - 8) + ' more' : '') + '. These are usually values sitting just next to a boundary.</div>';
      var catOnly = recs.filter(function (x) { return x.ol.sizeCat && !isN(x.fl); }).length, flOnly = recs.filter(function (x) { return !x.ol.sizeCat && isN(x.fl); }).length;
      if (catOnly || flOnly) dq += '<div class="note warn" style="margin-top:12px">' + (catOnly ? catOnly + ' outlet(s) have a size category but no floor size (included in band counts, excluded from per-m\u00b2). ' : '') + (flOnly ? flOnly + ' outlet(s) have a floor size but no category (shown as \u201cNot recorded\u201d; per-m\u00b2 still available in the table below).' : '') + '</div>';

      var ySeg = seg('sizeY', [['sales', 'Sales per m\u00b2'], ['pat', 'PAT per m\u00b2']], S.sizeY);
      view.innerHTML = banner + ctl + cards + dq + bandTbl +
        '<div class="grid g2" style="margin-top:12px"><div class="card"><h4>Sales and PAT per m\u00b2 by size category</h4><div class="ch"><canvas id="szC1"></canvas></div><div class="ks">Bars: sales per m\u00b2 per month (left, Rp m). Line: PAT per m\u00b2 per month (right, Rp m). Categories with fewer than ' + MINB + ' outlets are shown but not used for benchmarks.</div></div>' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0">Floor size against productivity</h4>' + ySeg + '</div><div class="ch"><canvas id="szC2"></canvas></div><div class="ks">Each dot is an outlet, coloured by size category; click one to open it. A downward drift to the right means bigger stores earn less per m\u00b2.</div></div></div>' +
        tw;

      /* ---------- wiring ---------- */
      tbl.bind(view); B.bindSearch(view);
      view.querySelector('#sizeScope').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.sizeScope = b.dataset.v; S.sort = null; B.render(); } };
      view.querySelector('#sizeBand').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.sizeBand = b.dataset.v; S.sort = null; B.render(); } };
      view.querySelector('#sizeY').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.sizeY = b.dataset.v; B.render(); } };
      view.querySelector('#expSize').onclick = function () {
        B.csv('bod-store-size.csv', ['Code', 'Outlet', 'Type', 'Area manager', 'Province', 'Kota', 'Size category', 'Floor m2', 'Status', 'Period', 'Sales per month', 'Sales per m2 per month', 'vs size category (sales per m2)', 'PAT per month', 'PAT per m2 per month', 'Rent per m2 per month', 'Staff hours per m2 per month', 'PSH', 'Verdict'],
          tbl.all.map(function (w) { return [w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.prov, w.ol.city, w.ol.sizeCat || '', isN(w.fl) ? w.fl : '', w.isNew ? 'New' : 'Mature', P.tag, isN(w.revM) ? Math.round(w.revM) : '', isN(w.spm) ? Math.round(w.spm) : '', isN(w.idx) ? w.idx.toFixed(4) : '', isN(w.patM) ? Math.round(w.patM) : '', isN(w.ppm) ? Math.round(w.ppm) : '', isN(w.rpm) ? Math.round(w.rpm) : '', isN(w.hpm) ? w.hpm.toFixed(2) : '', isN(w.r.A.psh) ? Math.round(w.r.A.psh) : '', w.verdict]; }));
      };

      /* ---------- charts ---------- */
      var bl = ORDER.slice(0, 5).filter(function (k) { return st[k].nF > 0; });
      B.chart('szC1', { data: { labels: bl.map(function (k) { return k + ' (' + st[k].nF + ')'; }), datasets: [
        { type: 'bar', label: 'Sales per m\u00b2 / month (Rp m)', data: bl.map(function (k) { return isN(st[k].spm) ? st[k].spm / 1e6 : null; }), backgroundColor: bl.map(function (k) { return COL[k] + 'cc'; }), yAxisID: 'y', order: 2 },
        { type: 'line', label: 'PAT per m\u00b2 / month (Rp m)', data: bl.map(function (k) { return isN(st[k].ppm) ? st[k].ppm / 1e6 : null; }), borderColor: '#b5303b', backgroundColor: '#b5303b', pointRadius: 4, borderWidth: 2, yAxisID: 'y1', order: 1 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 11 } } }, y: { position: 'left', beginAtZero: true, ticks: { font: { size: 10 } }, title: { display: true, text: 'Sales per m\u00b2 (Rp m)', font: { size: 10 } } }, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } }, title: { display: true, text: 'PAT per m\u00b2 (Rp m)', font: { size: 10 } } } } } });
      var yk = S.sizeY === 'pat' ? 'ppm' : 'spm', pts = {}, ds = [];
      ORDER.forEach(function (k) {
        var a = withF.filter(function (x) { return x.band === k && isN(x[yk]); });
        if (!a.length) return; pts[ds.length] = a;
        ds.push({ label: k, data: a.map(function (x) { return { x: x.fl, y: x[yk] / 1e6 }; }), backgroundColor: COL[k] + 'cc', borderColor: COL[k], pointRadius: 4, pointHoverRadius: 6 });
      });
      B.chart('szC2', { type: 'scatter', data: { datasets: ds }, options: { clip: 12,
        onClick: function (e, els) { if (els.length && pts[els[0].datasetIndex]) B.openOutlet(pts[els[0].datasetIndex][els[0].index].o); },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: function (c) { var x = pts[c.datasetIndex][c.dataIndex]; return x.ol.name + ' \u00b7 ' + F.n(x.fl, 1) + ' m\u00b2 \u00b7 Rp ' + c.parsed.y.toFixed(S.sizeY === 'pat' ? 3 : 2) + 'm per m\u00b2'; } } } },
        scales: { x: { title: { display: true, text: 'Sales floor (m\u00b2)', font: { size: 10 } }, ticks: { font: { size: 10 } } }, y: { title: { display: true, text: (S.sizeY === 'pat' ? 'PAT' : 'Sales') + ' per m\u00b2 per month (Rp m)', font: { size: 10 } }, ticks: { font: { size: 10 } }, grid: { color: function (c) { return c.tick && c.tick.value === 0 ? '#8a97a8' : '#eef1f5'; } } } } } });
    }
  };
})(window);
