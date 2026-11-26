/* ============================================================================
 * BOD Dashboard - Stock holding / Month of inventory (MOI) tab (Segments & geography)
 * MOI = stock holding at month end / revenue of the same month (MASTER "STOCK HOLDING" columns).
 * For a longer period it is total stock / total revenue over the outlet-months that have both
 * (= average stock over average monthly sales). A stock of 0 means "not recorded" and is left out.
 * Reads the outlet against the Watchlist thresholds (B.flagTH.moiLow / moiHigh, proposed values):
 *   low MOI  -> stock may be limiting sales      high MOI -> cash tied up, expiry / loss risk
 * and crosses it with like-for-like growth to answer: is low stock holding back a store, is high stock a loss waiting?
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  if (!S.stockScope) S.stockScope = 'mature';
  if (!S.stockBasis) S.stockBasis = 'period';     // 'period' (pooled over the selected months) | 'last' (latest month only)
  if (!S.stockDim) S.stockDim = 'band';
  if (S.stockSig === undefined) S.stockSig = null;
  if (S.stockBand === undefined) S.stockBand = null;

  var MINB = 5;
  var EDGES = [0, 1.5, 2, 2.5, 3, 4, Infinity];
  var BCOL = ['#b5303b', '#d9622b', '#0f7a55', '#2c9fb5', '#d98a12', '#8e2430'];
  var BLAB = ['< 1.5', '1.5\u20132', '2\u20132.5', '2.5\u20133', '3\u20134', '\u2265 4'];
  var LAG = 0.10;   // an outlet 'lags' when its like-for-like growth is more than 10 points below the company like-for-like growth
  var SIGS = {
    limit: { sev: 'h', label: 'Stock may be limiting growth', desc: 'Low MOI and sales growing well below the company (or falling)' },
    over: { sev: 'h', label: 'Overstocked and lagging', desc: 'High MOI and sales growing well below the company (or falling): loss risk' },
    lean: { sev: 'm', label: 'Lean stock, watch availability', desc: 'Low MOI, sales keeping pace' },
    high: { sev: 'm', label: 'High stock, cash tied up', desc: 'High MOI, sales keeping pace' },
    ok: { sev: 'i', label: 'Within range', desc: 'MOI between the low and high thresholds' }
  };
  var DIMS = { band: ['MOI band', null], type: ['Outlet type', function (o) { return o.type; }], am: ['Area manager', function (o) { return o.am; }],
    prov: ['Province', function (o) { return o.prov; }], city: ['Kota', function (o) { return o.city || 'N/A'; }], size: ['Store size', function (o) { return B.sizeKey(o); }],
    tier: ['Tier (Category)', function (o) { return o.tier; }], nature: ['Nature', function (o) { return o.nature; }] };

  function seg(id, items, cur) { return '<div class="seg" id="' + id + '">' + items.map(function (x) { return '<button data-v="' + x[0] + '"' + (String(cur) === String(x[0]) ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>'; }
  function pct(a, p) { a = a.filter(isN).sort(function (x, y) { return x - y; }); if (!a.length) return NaN; return a[Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * p)))]; }
  function val(m, k, o, t) { return t < m.min || t > m.max ? NaN : E.get(m, k, o, t); }
  function bandOf(v) { for (var i = 0; i < EDGES.length - 1; i++) if (v >= EDGES[i] && v < EDGES[i + 1]) return i; return EDGES.length - 2; }
  function sum(a, f) { var s = 0; a.forEach(function (x) { var v = f(x); if (isN(v)) s += v; }); return s; }

  // reading of an outlet: MOI against the thresholds, crossed with like-for-like growth
  function readOf(w, TH, base) {
    if (!isN(w.moi)) return 'na';
    var down = w.r.cat === 'lfl' && isN(w.gRev) && (w.r.dir === 'down' || (isN(base) && w.gRev < base - LAG));
    if (w.moi < TH.moiLow) return down ? 'limit' : 'lean';
    if (w.moi >= TH.moiHigh && !w.isNew) return down ? 'over' : 'high';
    return 'ok';
  }

  B.tabs.stock = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, TH = B.flagTH || { moiLow: 1.75, moiHigh: 4 };
      if (m.stockFrom == null) { view.innerHTML = '<div class="note warn"><b>No stock holding data.</b> The MASTER sheet has no <i>STOCK HOLDING</i> month columns (or fewer than 20 outlets have a value).</div>'; return; }
      if (!P.cur.length) { view.innerHTML = '<div class="note warn">No months in this selection yet.</div>'; return; }
      var endT = P.cur[P.cur.length - 1], lastB = S.stockBasis === 'last';
      var all = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      var scoped = all.filter(function (r) { return S.stockScope === 'all' || r.cat !== 'new'; });
      var lflRows = all.filter(function (r) { return r.cat === 'lfl'; });
      var base = lflRows.length ? E.groupStats(m, P, lflRows).lRev : NaN;
      var recs = scoped.map(function (r) {
        var A = r.A, L = r.last, x = lastB ? L : A, moi = x.moi;
        var s0 = val(m, 'stock', r.o, endT - 3), v0 = val(m, 'rev', r.o, endT - 3), sY = val(m, 'stock', r.o, endT - 12);
        var moi3 = s0 > 0 && v0 > 0 ? s0 / v0 : NaN, sNow = val(m, 'stock', r.o, endT);
        var w = { o: r.o, r: r, ol: r.ol, moi: moi, moiP: A.moi, moiL: L.moi, moi3: moi3, isNew: r.cat === 'new',
          stockL: L.stockAvg, stockP: A.stockAvg, revP: A.revStockAvg,
          stockYoY: sNow > 0 && sY > 0 ? sNow / sY - 1 : NaN, sl: A.slPct, gRev: r.cat === 'lfl' ? r.gRev : NaN };
        w.sig = readOf(w, TH, base); w.bi = isN(moi) ? bandOf(moi) : -1;
        return w;
      });
      var has = recs.filter(function (w) { return isN(w.moi); }), noStock = recs.length - has.length;

      var ctl = '<div class="geoctl">' + seg('stockScope', [['mature', 'Mature outlets only'], ['all', 'All trading outlets']], S.stockScope) +
        seg('stockBasis', [['period', 'MOI over the selected period'], ['last', 'MOI of the latest month (' + esc(E.monthShort(endT)) + ')']], S.stockBasis) + '</div>';
      var banner = '<div class="note"><b>Stock holding and month of inventory (MOI).</b> MOI = stock holding at month end \u00f7 sales of the same month, i.e. how many months of sales sit on the shelf. ' +
        'For a period it is total stock \u00f7 total sales over the outlet-months that have both (average stock over average monthly sales). Stock holding is on file from <b>' + esc(E.monthLabel(m.stockFrom)) + '</b>; a recorded stock of 0 is treated as not recorded. ' +
        '<b>Reading:</b> MOI below <b>' + TH.moiLow + '</b> may mean the shelf is too thin to keep up with demand (stock limits sales); MOI at or above <b>' + TH.moiHigh + '</b> means cash tied up and expiry / loss risk. ' +
        'Both thresholds are proposed starting points, not company policy' + (S.stockScope === 'mature' ? '. New outlets (within ' + E.NEW_MONTHS + ' months of opening) are left out: they carry an opening stock load, so their MOI is high by design. ' : '. New outlets are included, so their opening stock load pushes MOI up. ') +
        '<b>Coverage:</b> ' + has.length + ' of ' + recs.length + ' outlets in view have stock holding for ' + (lastB ? esc(E.monthShort(endT)) : esc(P.tag)) + '. ' + (B.isFiltered() ? 'Top-bar filters apply.' : '') + '</div>';
      if (!has.length) { view.innerHTML = banner + ctl + '<div class="note warn">No outlet in this selection has both a stock holding and sales for ' + (lastB ? esc(E.monthLabel(endT)) : esc(P.tag)) + (P.cur[P.cur.length - 1] < m.stockFrom ? '. Stock holding data starts ' + esc(E.monthLabel(m.stockFrom)) + '.' : '.') + '</div>'; wire(view); return; }

      /* ---------- totals ---------- */
      var gsAll = E.groupStats(m, P, has.map(function (w) { return w.r; }));
      var tA = lastB ? E.agg(m, has.map(function (w) { return w.o; }), [endT]) : gsAll.a;
      var lastAgg = E.agg(m, has.map(function (w) { return w.o; }), [endT]);
      var moiVals = has.map(function (w) { return w.moi; });
      var cnt = {}; Object.keys(SIGS).forEach(function (k) { cnt[k] = 0; });
      has.forEach(function (w) { cnt[w.sig]++; });
      var lowN = has.filter(function (w) { return w.moi < TH.moiLow; }).length, highN = has.filter(function (w) { return w.moi >= TH.moiHigh && !w.isNew; }).length;
      var above = sum(has.filter(function (w) { return !w.isNew; }), function (w) { var x = lastB ? w.r.last : w.r.A; var st = x.stk, rv = x.stkRev; return st > 0 && rv > 0 && w.moi >= TH.moiHigh ? st / x.stkN - TH.moiHigh * (rv / x.stkN) : 0; });
      var gLow = has.filter(function (w) { return w.moi < TH.moiLow && w.r.cat === 'lfl'; }), gHigh = has.filter(function (w) { return w.moi >= TH.moiHigh && w.r.cat === 'lfl' && !w.isNew; });
      var gMean = function (a) { return a.length ? sum(a, function (w) { return w.gRev; }) / a.length : NaN; };

      var cards = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">' +
        B.card('Company MOI \u00b7 ' + (lastB ? esc(E.monthShort(endT)) : esc(P.tag)), F.moi(tA.moi, 2) + ' <small>months</small>', 'Stock ' + F.rp(tA.stockAvg * (lastB ? tA.stkN : tA.stkN / Math.max(1, P.cur.length))) + (lastB ? '' : ' avg per month') + '<br>over sales ' + F.rp(tA.stkRev / (lastB ? 1 : Math.max(1, P.cur.length)))) +
        B.card('Stock holding \u00b7 ' + esc(E.monthShort(endT)), F.rp(lastAgg.stk), lastAgg.stkN + ' outlets \u00b7 avg ' + F.jt(lastAgg.stockAvg, 0) + ' each<br>MOI ' + F.moi(lastAgg.moi, 2)) +
        B.card('Typical outlet MOI', F.moi(U.median(moiVals), 2), 'median \u00b7 middle half ' + F.moi(pct(moiVals, 0.25), 2) + '\u2013' + F.moi(pct(moiVals, 0.75), 2)) +
        B.card('Low stock cover (&lt; ' + TH.moiLow + ')', lowN + ' <small>outlets</small>', isN(gMean(gLow)) ? 'their sales growth: avg ' + F.p(gMean(gLow), 1, true) + ' (' + gLow.length + ' like-for-like)' : 'no like-for-like read', lowN ? '' : 'pos') +
        B.card('High stock (\u2265 ' + TH.moiHigh + ')', highN + ' <small>outlets</small>', (isN(gMean(gHigh)) ? 'their sales growth: avg ' + F.p(gMean(gHigh), 1, true) + '<br>' : '') + 'stock above ' + TH.moiHigh + ' months: ' + F.rp(above), highN ? 'neg' : 'pos') +
        B.card('Needs a look', (cnt.limit + cnt.over) + ' <small>outlets</small>', cnt.limit + ' low stock and lagging<br>' + cnt.over + ' high stock and lagging<br>lagging = growth &gt;' + Math.round(LAG * 100) + ' pts below company (' + (isN(base) ? F.p(base, 1, true) : 'n/a') + ') or falling', cnt.limit + cnt.over ? 'neg' : 'pos') + '</div>';

      /* ---------- band statistics ---------- */
      var bands = EDGES.slice(0, -1).map(function (e, i) {
        var a = has.filter(function (w) { return w.bi === i; });
        var gs = a.length ? E.groupStats(m, P, a.map(function (w) { return w.r; })) : null;
        var xa = a.length ? (lastB ? E.agg(m, a.map(function (w) { return w.o; }), [endT]) : gs.a) : null;
        return { i: i, a: a, n: a.length, gs: gs, xa: xa, lab: BLAB[i], col: BCOL[i] };
      });
      function grpRow(label, a, col, dataAttr) {
        var few = a.length < MINB, gs = a.length ? E.groupStats(m, P, a.map(function (w) { return w.r; })) : null;
        var xa = a.length ? (lastB ? E.agg(m, a.map(function (w) { return w.o; }), [endT]) : gs.a) : null;
        var nlow = a.filter(function (w) { return w.moi < TH.moiLow; }).length, nhigh = a.filter(function (w) { return w.moi >= TH.moiHigh && !w.isNew; }).length;
        var lfl = a.filter(function (w) { return w.r.cat === 'lfl'; }).length;
        return '<tr' + (dataAttr || '') + ' style="' + (dataAttr ? 'cursor:pointer;' : '') + (few ? 'color:var(--mute);' : '') + '"><td class="l"><b>' + (col ? '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + col + ';margin-right:6px"></span>' : '') + esc(label) + '</b>' + (few ? ' <small>few</small>' : '') + '</td>' +
          '<td>' + a.length + '</td><td>' + (xa ? F.m(xa.stockAvg, 0) : '\u2013') + '</td><td>' + (xa ? F.m(xa.revStockAvg, 0) : '\u2013') + '</td><td class="pt"><b>' + (xa ? F.moi(xa.moi, 2) : '\u2013') + '</b></td>' +
          '<td>' + nlow + '</td><td>' + nhigh + '</td><td class="' + F.cls(gs && gs.lRev) + '">' + (gs && lfl && isN(gs.lRev) ? F.p(gs.lRev, 1, true) : '\u2013') + '</td>' +
          '<td>' + (gs ? F.p(gs.a.slPct, 2) : '\u2013') + '</td><td class="' + F.cls(gs && gs.a.psh) + '">' + (gs ? F.n(gs.a.psh) : '\u2013') + '</td><td class="' + F.cls(gs && gs.a.patMargin) + '">' + (gs ? F.p(gs.a.patMargin, 2) : '\u2013') + '</td></tr>';
      }
      var dimKey = DIMS[S.stockDim] ? S.stockDim : 'band', dimName = DIMS[dimKey][0];
      var rowsHtml;
      if (dimKey === 'band') {
        rowsHtml = bands.filter(function (b) { return b.n > 0; }).map(function (b) { return grpRow(b.lab + ' months', b.a, b.col, ' data-b="' + b.i + '"'); }).join('');
      } else {
        var grp = {}; has.forEach(function (w) { var k = DIMS[dimKey][1](w.ol); (grp[k] = grp[k] || []).push(w); });
        rowsHtml = Object.keys(grp).sort(function (a, b) { return grp[b].length - grp[a].length; }).map(function (k) { return grpRow(k, grp[k], null, ''); }).join('');
      }
      var dimSeg = seg('stockDim', Object.keys(DIMS).map(function (k) { return [k, DIMS[k][0]]; }), dimKey);
      var bandTbl = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Stock holding by ' + esc(dimKey === 'band' ? 'MOI band' : dimName.toLowerCase()) + '</h3><p>' + (lastB ? esc(E.monthShort(endT)) : esc(P.tag)) + ' \u00b7 ' + (S.stockScope === 'mature' ? 'mature outlets' : 'all trading outlets') + ' \u00b7 stock and sales per outlet per month, Rp Jt \u00b7 growth is like-for-like vs ' + esc(P.baseTag) + (dimKey === 'band' ? ' \u00b7 click a band to filter the outlet list' : '') + '</p></div><div style="overflow-x:auto">' + dimSeg + '</div></div>' +
        '<div class="tx" style="max-height:none"><table id="stockBands"><thead><tr><th class="l">' + esc(dimName) + '</th><th>Outlets</th><th>Stock / outlet<small>Rp Jt</small></th><th>Sales / outlet<small>Rp Jt / month</small></th><th class="pt">MOI<small>months</small></th><th>Low MOI<small>&lt; ' + TH.moiLow + '</small></th><th>High MOI<small>\u2265 ' + TH.moiHigh + '</small></th><th>Sales growth<small>like-for-like</small></th><th>Stock loss<small>% sales</small></th><th>PSH<small>Rp/hr</small></th><th>PAT margin</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div></div>';

      /* ---------- signal tiles + outlet table ---------- */
      var sevCol = { h: 'var(--l5)', m: 'var(--l3)', i: 'var(--l2)' };
      var tiles = ['limit', 'over', 'lean', 'high', 'ok'].map(function (k) {
        return '<div class="tile' + (S.stockSig === k ? ' on' : '') + '" data-sig="' + k + '" style="--c:' + sevCol[SIGS[k].sev] + '"><div class="n">' + cnt[k] + '</div><div class="t">' + esc(SIGS[k].label) + '</div><div class="d">' + esc(SIGS[k].desc) + '</div></div>';
      }).join('');
      var shown = has.filter(function (w) { return (S.stockSig === null || w.sig === S.stockSig) && (S.stockBand === null || w.bi === S.stockBand); });
      var pill = function (k) { return '<span class="fl ' + SIGS[k].sev + '" title="' + esc(SIGS[k].desc) + '">' + esc(SIGS[k].label) + '</span>'; };
      var moiTd = function (w) { return w.moi < TH.moiLow ? 'neg' : (w.moi >= TH.moiHigh && !w.isNew ? 'warn' : ''); };
      var cols = [
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + (w.isNew ? ' \u00b7 new' : '') + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'sg', label: 'Reading', left: true, get: function (w) { return ({ limit: 0, over: 1, lean: 2, high: 3, ok: 4 })[w.sig]; }, fmt: function (w) { return pill(w.sig); } },
        { k: 'sk', label: 'Stock ' + esc(E.monthShort(endT)), sub: 'Rp Jt', get: function (w) { return w.stockL; }, fmt: function (w) { return F.m(w.stockL, 0); } },
        { k: 'moi', th: 'pt', cls: 'pt', label: 'MOI', sub: lastB ? esc(E.monthShort(endT)) : esc(P.tag), get: function (w) { return w.moi; }, fmt: function (w) { return '<b>' + F.moi(w.moi, 2) + '</b>'; }, tdc: moiTd },
        { k: 'ml', label: 'MOI ' + esc(E.monthShort(endT)), sub: 'latest month', get: function (w) { return w.moiL; }, fmt: function (w) { return F.moi(w.moiL, 2); } },
        { k: 'm3', label: 'MOI 3 months ago', sub: esc(E.monthShort(endT - 3)), get: function (w) { return w.moi3; }, fmt: function (w) { return F.moi(w.moi3, 2); } },
        { k: 'sy', label: 'Stock vs ' + esc(E.monthShort(endT - 12)), sub: 'year on year', get: function (w) { return w.stockYoY; }, fmt: function (w) { return isN(w.stockYoY) ? F.p(w.stockYoY, 0, true) : '\u2013'; } },
        { k: 'g', label: 'Sales change', sub: 'vs ' + esc(P.baseTag), get: function (w) { return w.gRev; }, fmt: function (w) { return isN(w.gRev) ? F.p(w.gRev, 1, true) : '\u2013'; }, tdc: function (w) { return F.cls(w.gRev); } },
        { k: 'lv', label: 'Level', get: function (w) { return w.r.cat === 'lfl' ? (w.r.dir === 'down' ? -w.r.level : w.r.level) : null; }, fmt: function (w) { return w.r.cat === 'lfl' ? (w.r.dir === 'down' ? '\u2193L' : '\u2191L') + w.r.level : (w.isNew ? 'new' : '\u2013'); } },
        { k: 'rv', label: 'Sales ' + esc(E.monthShort(endT)), sub: 'Rp Jt', get: function (w) { return w.r.last.rev; }, fmt: function (w) { return F.m(w.r.last.rev, 0); } },
        { k: 'sl', label: 'Stock loss', sub: '% sales', get: function (w) { return w.sl; }, fmt: function (w) { return F.p(w.sl, 2); } },
        { k: 'ps', label: 'PSH', sub: 'Rp/hr', get: function (w) { return w.r.A.psh; }, fmt: function (w) { return F.n(w.r.A.psh); }, tdc: function (w) { return F.cls(w.r.A.psh); } }
      ];
      var tbl = B.table('tbl-stock', shown, cols, { defSort: 'moi', defDir: 1, limit: 500 });
      var bsel = seg('stockBandSel', [['', 'All MOI bands (' + has.length + ')']].concat(bands.filter(function (b) { return b.n > 0; }).map(function (b) { return [b.i, b.lab + ' (' + b.n + ')']; })), S.stockBand === null ? '' : S.stockBand);
      var selTxt = (S.stockSig ? ' \u00b7 ' + esc(SIGS[S.stockSig].label) : '') + (S.stockBand !== null ? ' \u00b7 MOI ' + BLAB[S.stockBand] : '');
      var tw = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlets by stock holding</h3><p>' + shown.length + ' outlets' + selTxt + ' \u00b7 sorted by lowest MOI first \u00b7 click an outlet for its profile (stock and MOI are in its monthly trend)</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + B.searchBox() + '<button class="btn" id="expStock"><i class="fas fa-download"></i> Export</button></div></div>' +
        '<div style="padding:0 12px 8px;overflow-x:auto">' + bsel + '</div>' + tbl.html + '</div>';

      view.innerHTML = banner + ctl + cards + bandTbl +
        '<div class="sec" style="margin-top:14px"><h3>Where stock may be limiting, or hurting<small>MOI against growth, ' + esc(P.tag) + ' vs ' + esc(P.baseTag) + '</small></h3></div>' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:6px">' + tiles + '</div><div class="hint">Select a tile to filter the outlet list below.' + (S.stockSig ? ' <a style="cursor:pointer;color:var(--navy);font-weight:700;text-decoration:underline" id="stockClr">Clear filter</a>' : '') + '</div>' +
        '<div class="grid g2" style="margin-top:12px"><div class="card"><h4>MOI over time, company and outlet spread</h4><div class="ch"><canvas id="skC1"></canvas></div><div class="ks">Pooled MOI = total stock \u00f7 total sales. Dotted lines: middle half of outlets. Dashed red / amber lines: the low and high thresholds.</div></div>' +
        '<div class="card"><h4>Sales growth and PSH by MOI band</h4><div class="ch"><canvas id="skC2"></canvas></div><div class="ks">Bars: like-for-like sales growth vs ' + esc(P.baseTag) + '. Line: PSH (Rp/hr). Grey = fewer than ' + MINB + ' outlets. Read it as an association, not proof of cause.</div></div></div>' +
        '<div class="grid g2" style="margin-top:12px"><div class="card"><h4>Total stock holding and sales (Rp M)</h4><div class="ch"><canvas id="skC3"></canvas></div><div class="ks">Outlets in view, month by month. Bars: stock holding at month end. Line: sales of the month.</div></div>' +
        '<div class="card"><h4>MOI against sales growth, by outlet</h4><div class="ch"><canvas id="skC4"></canvas></div><div class="ks">Each dot is a like-for-like outlet; click for its profile. Left of the red line: thin stock. Right of the amber line: heavy stock.</div></div></div>' + tw;

      /* ---------- wiring ---------- */
      wire(view); tbl.bind(view); B.bindSearch(view);
      view.querySelectorAll('[data-sig]').forEach(function (el) { el.onclick = function () { S.stockSig = S.stockSig === el.dataset.sig ? null : el.dataset.sig; S.sort = null; B.render(); }; });
      var c = view.querySelector('#stockClr'); if (c) c.onclick = function () { S.stockSig = null; B.render(); };
      view.querySelector('#stockBandSel').onclick = function (e) { var b = e.target.closest('button'); if (b) { S.stockBand = b.dataset.v === '' ? null : +b.dataset.v; S.sort = null; B.render(); } };
      view.querySelectorAll('#stockBands tbody tr[data-b]').forEach(function (tr) { tr.onclick = function () { var i = +tr.dataset.b; S.stockBand = S.stockBand === i ? null : i; B.render(); }; });
      view.querySelector('#expStock').onclick = function () {
        B.csv('bod-stock-holding-' + P.tag.replace(/\s+/g, '_') + '.csv', ['Code', 'Outlet', 'Type', 'Area manager', 'Kota', 'Reading', 'Stock latest month (Rp)', 'MOI (selected basis)', 'MOI selected period', 'MOI latest month', 'MOI 3 months ago', 'Stock vs same month last year', 'Sales change vs prior year', 'Latest month sales (Rp)', 'Stock loss % of sales', 'PSH (Rp/hr)'],
          tbl.all.map(function (w) { return [w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.city || '', SIGS[w.sig] ? SIGS[w.sig].label : '', isN(w.stockL) ? Math.round(w.stockL) : '', isN(w.moi) ? w.moi.toFixed(2) : '', isN(w.moiP) ? w.moiP.toFixed(2) : '', isN(w.moiL) ? w.moiL.toFixed(2) : '', isN(w.moi3) ? w.moi3.toFixed(2) : '', isN(w.stockYoY) ? w.stockYoY.toFixed(4) : '', isN(w.gRev) ? w.gRev.toFixed(4) : '', Math.round(w.r.last.rev), isN(w.sl) ? w.sl.toFixed(4) : '', isN(w.r.A.psh) ? Math.round(w.r.A.psh) : '']; }));
      };
      var dsel = view.querySelector('#stockDim'); if (dsel) dsel.onclick = function (e) { var b = e.target.closest('button'); if (b) { S.stockDim = b.dataset.v; B.render(); } };

      /* ---------- charts ---------- */
      var oList = scoped.map(function (r) { return r.o; }), months = [];
      for (var t = m.stockFrom; t <= m.latest; t++) months.push(t);
      var tr = months.map(function (t2) {
        var per = [], st = 0, rv = 0;
        oList.forEach(function (o) { var s = val(m, 'stock', o, t2), r2 = val(m, 'rev', o, t2); if (s > 0 && r2 > 0) { per.push(s / r2); st += s; rv += r2; } });
        return { t: t2, moi: rv > 0 ? st / rv : NaN, med: U.median(per), p25: pct(per, 0.25), p75: pct(per, 0.75), stock: st, rev: rv, n: per.length };
      }).filter(function (x) { return x.n >= 20; });
      var lab = tr.map(function (x) { return E.monthShort(x.t); });
      var line = function (label, key, col, dash, w) { return { type: 'line', label: label, data: tr.map(function (x) { return isN(x[key]) ? x[key] : null; }), borderColor: col, backgroundColor: col, borderWidth: w || 2, borderDash: dash || [], pointRadius: w === 3 ? 3 : 0, tension: .2 }; };
      var flat = function (label, v, col) { return { type: 'line', label: label, data: tr.map(function () { return v; }), borderColor: col, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0 }; };
      B.chart('skC1', { data: { labels: lab, datasets: [line('Company MOI', 'moi', '#16436f', null, 3), line('Median outlet', 'med', '#2c9fb5', null, 2), line('25th percentile', 'p25', '#8e9aaf', [2, 3], 1.5), line('75th percentile', 'p75', '#8e9aaf', [2, 3], 1.5), flat('Low threshold ' + TH.moiLow, TH.moiLow, '#b5303b'), flat('High threshold ' + TH.moiHigh, TH.moiHigh, '#d98a12')] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { beginAtZero: true, title: { display: true, text: 'Months of inventory', font: { size: 10 } }, ticks: { font: { size: 10 } } } } } });
      var bb = bands.filter(function (b) { return b.n > 0; });
      B.chart('skC2', { data: { labels: bb.map(function (b) { return b.lab + ' (' + b.n + ')'; }), datasets: [
        { type: 'bar', label: 'Sales growth (like-for-like, %)', data: bb.map(function (b) { return b.gs && isN(b.gs.lRev) ? b.gs.lRev * 100 : null; }), backgroundColor: bb.map(function (b) { return b.n < MINB ? '#c9d1db' : b.col + 'cc'; }), yAxisID: 'y', order: 2 },
        { type: 'line', label: 'PSH (Rp/hr)', data: bb.map(function (b) { return b.gs && isN(b.gs.a.psh) ? b.gs.a.psh : null; }), borderColor: '#16436f', backgroundColor: '#16436f', pointRadius: 4, borderWidth: 2, yAxisID: 'y1', order: 1 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { title: { display: true, text: 'MOI band (months)', font: { size: 10 } }, ticks: { font: { size: 10 } } },
          y: { position: 'left', title: { display: true, text: 'Sales growth %', font: { size: 10 } }, ticks: { font: { size: 10 } } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'PSH (Rp/hr)', font: { size: 10 } }, ticks: { font: { size: 10 } } } } } });
      B.chart('skC3', { data: { labels: lab, datasets: [
        { type: 'bar', label: 'Stock holding (Rp M)', data: tr.map(function (x) { return x.stock / 1e9; }), backgroundColor: '#8fb4de', order: 2 },
        { type: 'line', label: 'Sales (Rp M)', data: tr.map(function (x) { return x.rev / 1e9; }), borderColor: '#b5303b', backgroundColor: '#b5303b', pointRadius: 2, borderWidth: 2, order: 1 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { beginAtZero: true, title: { display: true, text: 'Rp M (billion)', font: { size: 10 } }, ticks: { font: { size: 10 } } } } } });
      var pts = {}, ds = [];
      ['limit', 'over', 'lean', 'high', 'ok'].forEach(function (k) {
        var a = has.filter(function (w) { return w.sig === k && isN(w.gRev); }); if (!a.length) return; pts[ds.length] = a;
        var col = k === 'limit' || k === 'over' ? '#b5303b' : k === 'ok' ? '#2c9fb5' : '#d98a12';
        ds.push({ label: SIGS[k].label, data: a.map(function (w) { return { x: w.moi, y: w.gRev * 100 }; }), backgroundColor: col + 'aa', borderColor: col, pointRadius: 4, pointHoverRadius: 6 });
      });
      B.chart('skC4', { type: 'scatter', data: { datasets: ds }, options: { clip: 12,
        onClick: function (e, els) { if (els.length && pts[els[0].datasetIndex]) B.openOutlet(pts[els[0].datasetIndex][els[0].index].o); },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } }, tooltip: { callbacks: { label: function (c) { var w = pts[c.datasetIndex][c.dataIndex]; return w.ol.name + ' \u00b7 MOI ' + F.moi(w.moi, 2) + ' \u00b7 sales ' + F.p(w.gRev, 1, true) + ' \u00b7 stock Rp ' + F.m(w.stockL, 0) + ' Jt'; } } } },
        scales: { x: { title: { display: true, text: 'MOI (months)', font: { size: 10 } }, ticks: { font: { size: 10 } } }, y: { title: { display: true, text: 'Sales growth vs ' + P.baseTag + ' (%)', font: { size: 10 } }, ticks: { font: { size: 10 } } } } } });
    }
  };

  function wire(view) {
    var on = function (id, fn) { var el = view.querySelector('#' + id); if (el) el.onclick = function (e) { var b = e.target.closest('button'); if (b) { fn(b.dataset.v); S.sort = null; S.stockSig = null; S.stockBand = null; B.render(); } }; };
    on('stockScope', function (v) { S.stockScope = v; });
    on('stockBasis', function (v) { S.stockBasis = v; });
  }
})(window);
