/* ============================================================================
 * BOD Dashboard - Profitability (PAT) tab
 * Company, group and outlet profitability with its own look-back window (last 3 / 6 / 12 months or the dashboard period),
 * a comparison with the window before it, and an indicative trend forecast.
 * PAT = PSH x working hours per outlet-month (management definition). Period PSH = PAT / working hours.
 * Forecast = straight-line trend fitted on the last K monthly PAT values (K selectable), extended 3 months, shown next to a
 * "hold flat" scenario. It ignores seasonality, openings and closures, so read it as direction, not as a budget.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  var H = 3;
  if (!S.patWin) S.patWin = '6';
  if (!S.patScope) S.patScope = 'all';
  if (!S.patFit) S.patFit = 6;
  if (!S.patDim) S.patDim = 'am';
  if (S.patCls === undefined) S.patCls = null;

  var CLS = {
    good: { t: 'Profitable \u00b7 improving', col: '#0f7a55', rank: 1, c: 'jg' },
    slip: { t: 'Profitable \u00b7 slipping', col: '#d98a12', rank: 2, c: 'js' },
    turn: { t: 'Turning around', col: '#2f6fb5', rank: 3, c: 'jt' },
    narrow: { t: 'Loss \u00b7 narrowing', col: '#e0a24a', rank: 4, c: 'jn' },
    loss: { t: 'Loss \u00b7 not improving', col: '#b5303b', rank: 5, c: 'jl' },
    few: { t: 'Too little data', col: '#a9b4c2', rank: 6, c: 'jf' }
  };
  var DIMS = {
    am: ['Area manager', function (o) { return o.am || 'N/A'; }],
    type: ['Outlet type', function (o) { return o.type || 'N/A'; }],
    size: ['Store size', function (o) { return B.sizeKey(o); }],
    city: ['Kota', function (o) { return o.city || 'N/A'; }],
    prov: ['Province', function (o) { return o.prov || 'N/A'; }]
  };

  /* ---------- helpers ---------- */
  function val(m, key, o, t) { return t < m.min || t > m.max ? NaN : E.get(m, key, o, t); }
  function sgn(v, d) { return isN(v) ? (v > 0 ? '+' : v < 0 ? '\u2212' : '') + F.m(Math.abs(v), d == null ? 1 : d) : '\u2013'; }
  function sgnN(v) { return isN(v) ? (v > 0 ? '+' : v < 0 ? '\u2212' : '') + F.n(Math.abs(v)) : '\u2013'; }
  function mlab(a, b) { return a === b ? E.monthShort(a) : E.monthShort(a) + ' \u2013 ' + E.monthShort(b); }

  // monthly PAT / hours / sales for a set of outlets, only outlet-months where PSH and hours both exist
  function mkSeries(m, ids, T) {
    var out = {};
    T.forEach(function (t) {
      var r = { t: t, pat: 0, wh: 0, revP: 0, n: 0, pos: 0 };
      for (var i = 0; i < ids.length; i++) {
        var o = ids[i], p = val(m, 'psh', o, t), h = val(m, 'wh', o, t);
        if (isN(p) && isN(h)) {
          var v = p * h; r.pat += v; r.wh += h; r.n++; if (v > 0) r.pos++;
          var rv = val(m, 'rev', o, t); if (isN(rv)) r.revP += rv;
        }
      }
      out[t] = r;
    });
    return out;
  }
  function winAgg(ser, months) {
    var a = { pat: 0, wh: 0, revP: 0, mo: 0, len: months.length };
    months.forEach(function (t) { var r = ser[t]; if (r && r.n > 0) { a.pat += r.pat; a.wh += r.wh; a.revP += r.revP; a.mo++; } });
    a.psh = a.wh > 0 ? a.pat / a.wh : NaN;
    a.margin = a.revP > 0 ? a.pat / a.revP : NaN;
    a.pm = a.mo > 0 ? a.pat / a.mo : NaN;
    return a;
  }
  // straight-line fit; x = months relative to the window end (0 = last month)
  function fit(pts) {
    var n = pts.length; if (n < 4) return null;
    var sx = 0, sy = 0; pts.forEach(function (p) { sx += p.x; sy += p.y; });
    var mx = sx / n, my = sy / n, sxx = 0, sxy = 0, syy = 0;
    pts.forEach(function (p) { sxx += (p.x - mx) * (p.x - mx); sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) * (p.y - my); });
    if (!sxx) return null;
    var b = sxy / sxx, a = my - b * mx, sse = 0;
    pts.forEach(function (p) { var e = p.y - (a + b * p.x); sse += e * e; });
    return { a: a, b: b, n: n, r2: syy > 0 ? 1 - sse / syy : NaN, sd: Math.sqrt(sse / Math.max(1, n - 2)) };
  }
  function fitOf(ser, T, K) {
    var endT = T[T.length - 1], pts = [];
    T.slice(-K).forEach(function (t) { var r = ser[t]; if (r && r.n > 0) pts.push({ x: t - endT, y: r.pat }); });
    return fit(pts);
  }
  function fcTotal(f) { if (!f) return NaN; var s = 0; for (var k = 1; k <= H; k++) s += f.a + f.b * k; return s; }
  function breakeven(f, endT) {
    if (!f) return { txt: '\u2013', k: 9999 };
    if (f.a >= 0) return { txt: 'Profitable now', k: 0 };
    if (f.b > 0) { var k = Math.ceil(-f.a / f.b); return k <= 12 ? { txt: '~' + k + ' mo (' + E.monthShort(endT + k) + ')', k: k } : { txt: 'Beyond 12 months', k: 500 }; }
    return { txt: 'No improvement', k: 999 };
  }
  function journey(win, last3, f, be) {
    if (!f) return 'few';
    if (win.pat > 0) return f.b >= 0 ? 'good' : 'slip';
    if (last3 > 0 || (f.b > 0 && be.k <= 6)) return 'turn';
    return f.b > 0 ? 'narrow' : 'loss';
  }
  function last3Of(ser, T) { var s = 0; T.slice(-3).forEach(function (t) { var r = ser[t]; if (r && r.n > 0) s += r.pat; }); return s; }
  function pill(j) { return '<span class="gv ' + CLS[j].c + '">' + CLS[j].t + '</span>'; }

  /* ---------- windows ---------- */
  function mkWin(T, L, off) {   // L months, ending `off` months before the last month; null if not fully inside history
    var n = T.length, end = n - off, start = end - L;
    if (start < 0 || end <= 0) return null;
    return T.slice(start, end);
  }
  function winMonths(T, key, P) {
    var L = key === 'dash' ? P.cur.length : +key;
    L = Math.min(L, T.length);
    var cur = key === 'dash' ? P.cur.filter(function (t) { return t >= T[0]; }) : T.slice(-L);
    var prev = mkWin(T, cur.length, cur.length);
    // previous window must sit directly before the current one
    var firstIdx = T.indexOf(cur[0]); prev = firstIdx - cur.length >= 0 ? T.slice(firstIdx - cur.length, firstIdx) : null;
    var yoy = cur.every(function (t) { return t - 12 >= T[0]; }) ? cur.map(function (t) { return t - 12; }) : null;
    return { cur: cur, prev: prev, yoy: yoy, len: cur.length };
  }

  /* ---------- tab ---------- */
  B.tabs.pat = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P;
      if (!P.cur.length) { view.innerHTML = '<div class="note warn">No months in this selection yet.</div>'; return; }
      var endT = P.cur[P.cur.length - 1], T = [];
      for (var t = m.baseMin; t <= endT; t++) T.push(t);
      var K = Math.min(S.patFit, T.length), tagFor = { '3': 'Last 3 months', '6': 'Last 6 months', '12': 'Last 12 months', dash: P.tag };
      var short = { '3': 'L3M', '6': 'L6M', '12': 'L12M', dash: P.tag };

      /* outlets in scope */
      var recs = [];
      ctx.rowsF.forEach(function (r) {
        var age = E.ageAt(r.ol, endT), isNew = isN(age) && age <= E.NEW_MONTHS;
        if (S.patScope === 'mature' && isNew) return;
        var ser = mkSeries(m, [r.o], T), any = T.some(function (x) { return ser[x].n > 0; });
        if (!any) return;
        recs.push({ o: r.o, ol: r.ol, r: r, age: age, isNew: isNew, ser: ser });
      });
      var ids = recs.map(function (x) { return x.o; });
      if (!ids.length) { view.innerHTML = '<div class="note warn">No outlets with PSH and working-hours data in this selection.</div>'; return; }
      var ser = mkSeries(m, ids, T);
      var W = winMonths(T, S.patWin, P), tagW = short[S.patWin];
      var aW = winAgg(ser, W.cur), aP = W.prev ? winAgg(ser, W.prev) : null, aY = W.yoy ? winAgg(ser, W.yoy) : null;
      var cf = fitOf(ser, T, K), l3 = last3Of(ser, T), be = breakeven(cf, endT), fcT = fcTotal(cf);
      var flat = (function () { var s = 0, n = 0; T.slice(-3).forEach(function (x) { if (ser[x].n > 0) { s += ser[x].pat; n++; } }); return n ? s / n * H : NaN; })();
      var exOk = !B.isFiltered() && S.patScope === 'all' && B.exec;
      var execPsh = function (months) { if (!exOk) return NaN; try { var c = E.companyPsh(m, B.exec, months); return c.src === 'sheet' ? c.v : NaN; } catch (e) { return NaN; } };

      /* per-outlet records for the selected window */
      recs.forEach(function (x) {
        x.aW = winAgg(x.ser, W.cur); x.aP = W.prev ? winAgg(x.ser, W.prev) : null; x.aY = W.yoy ? winAgg(x.ser, W.yoy) : null;
        x.f = fitOf(x.ser, T, K); x.l3 = last3Of(x.ser, T); x.be = breakeven(x.f, endT);
        var need = Math.max(1, Math.ceil(W.len / 2));
        x.prevOK = !!(x.aP && x.aP.mo >= need && x.aW.mo >= need);
        x.chg = x.prevOK ? x.aW.pm - x.aP.pm : NaN;
        x.yoyChg = x.aY && x.aY.mo >= need && x.aW.mo >= need ? x.aW.pm - x.aY.pm : NaN;
        x.lastM = x.ser[endT] && x.ser[endT].n > 0 ? x.ser[endT].pat : NaN;
        x.fc = fcTotal(x.f); x.j = x.aW.mo > 0 ? journey(x.aW, x.l3, x.f, x.be) : null;
        x.statusTxt = x.isNew ? 'New \u00b7 month ' + x.age : 'Mature';
      });
      var inWin = recs.filter(function (x) { return x.aW.mo > 0; });
      var nProf = inWin.filter(function (x) { return x.aW.pat > 0; }).length;
      var prevPct = function (L) { return null; };

      /* ---------- window comparison ---------- */
      var wins = ['3', '6', '12'].concat([2, 3, 6, 12].indexOf(P.cur.length) < 0 || true ? ['dash'] : []);
      var seen = {}, rowsW = [];
      wins.forEach(function (k) {
        var w = winMonths(T, k, P), key = w.cur.length + ':' + w.cur[w.cur.length - 1];
        if (k === 'dash' && ['3', '6', '12'].some(function (q) { var z = winMonths(T, q, P); return z.cur.length === w.cur.length && z.cur[z.cur.length - 1] === w.cur[w.cur.length - 1]; })) return;
        rowsW.push({ k: k, w: w });
      });
      var need2 = function (L) { return Math.max(1, Math.ceil(L / 2)); };
      var mom = rowsW.map(function (rw) {
        var w = rw.w, a = winAgg(ser, w.cur), p = w.prev ? winAgg(ser, w.prev) : null, y = w.yoy ? winAgg(ser, w.yoy) : null, nd = need2(w.len);
        var oa = 0, op = 0, na = 0, np = 0, imp = 0, cmp = 0;
        recs.forEach(function (x) {
          var xa = winAgg(x.ser, w.cur), xp = w.prev ? winAgg(x.ser, w.prev) : null;
          if (xa.mo > 0) { na++; if (xa.pat > 0) oa++; }
          if (xp && xp.mo > 0) { np++; if (xp.pat > 0) op++; }
          if (xp && xa.mo >= nd && xp.mo >= nd) { cmp++; if (xa.pm > xp.pm) imp++; }
        });
        return { k: rw.k, w: w, a: a, p: p, y: y, oa: oa, na: na, op: op, np: np, imp: imp, cmp: cmp, ex: execPsh(w.cur), exP: w.prev ? execPsh(w.prev) : NaN };
      });
      var momRows = mom.map(function (r) {
        var lab = (r.k === 'dash' ? 'Dashboard period \u00b7 ' + esc(P.tag) : tagFor[r.k]) + '<small>' + esc(mlab(r.w.cur[0], r.w.cur[r.w.cur.length - 1])) + (r.a.mo < r.w.len ? ' \u00b7 ' + r.a.mo + ' of ' + r.w.len + ' months with data' : '') + '</small>';
        var ch = r.p && r.p.mo ? r.a.pm - r.p.pm : NaN, yy = r.y && r.y.mo ? r.a.pm - r.y.pm : NaN;
        var pct = function (n, d) { return d ? F.p(n / d, 0) : '\u2013'; };
        return '<tr style="cursor:default' + (r.k === S.patWin ? ';background:#f1f6fd' : '') + '"><td class="l"><b>' + lab + '</b></td>' +
          '<td class="pt ' + F.cls(r.a.pat) + '"><b>' + F.m(r.a.pat, 1) + '</b></td><td class="' + F.cls(r.a.pm) + '">' + F.m(r.a.pm, 2) + '</td>' +
          '<td>' + (r.p ? F.m(r.p.pm, 2) : '\u2013') + '</td><td class="' + F.cls(ch) + '"><b>' + sgn(ch, 2) + '</b></td>' +
          '<td class="' + F.cls(yy) + '">' + (r.y ? sgn(yy, 2) : '\u2013') + '</td>' +
          '<td class="' + F.cls(r.a.margin) + '">' + F.p(r.a.margin, 2) + '</td><td class="' + F.cls(r.a.psh) + '">' + F.n(r.a.psh) + '</td><td class="' + F.cls(r.ex) + '">' + F.n(r.ex) + '</td>' +
          '<td>' + r.oa + ' / ' + r.na + ' <small style="color:var(--mute)">(' + pct(r.oa, r.na) + (r.np ? ' vs ' + pct(r.op, r.np) + ' before' : '') + ')</small></td>' +
          '<td>' + (r.cmp ? r.imp + ' / ' + r.cmp + ' <small style="color:var(--mute)">(' + pct(r.imp, r.cmp) + ')</small>' : '\u2013') + '</td></tr>';
      }).join('');
      var momTbl = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Same company, different look-back windows</h3><p>Each row ends at ' + esc(E.monthShort(endT)) + '. \u201cBefore\u201d is the window of the same length directly earlier. A long window can still show losses while the latest 3 or 6 months have already turned: compare the rows. PAT / month is in Rp m.</p></div></div>' +
        '<div class="tx" style="max-height:none"><table><thead><tr><th class="l">Window</th><th class="pt">PAT<small>Rp m</small></th><th>PAT / month<small>Rp m</small></th><th>Before<small>PAT / month</small></th><th>Change<small>Rp m / month</small></th><th>vs last year<small>PAT / month</small></th><th>PAT margin</th><th>Outlet PSH<small>Rp/hr</small></th><th>Company PSH<small>Exec Dashboard</small></th><th>Profitable outlets</th><th>Improved vs before</th></tr></thead><tbody>' + momRows + '</tbody></table></div></div>';

      /* ---------- controls and banner ---------- */
      var seg = function (id, items, cur) { return '<div class="seg" id="' + id + '">' + items.map(function (x) { return '<button data-v="' + x[0] + '"' + (String(cur) === String(x[0]) ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>'; };
      var ctl = '<div class="geoctl">' + seg('patWin', [['3', 'Last 3 months'], ['6', 'Last 6 months'], ['12', 'Last 12 months'], ['dash', 'Dashboard period (' + esc(P.tag) + ')']], S.patWin) +
        seg('patScope', [['all', 'All trading outlets'], ['mature', 'Mature only (exclude new)']], S.patScope) +
        '<label>Trend fitted on the last <select id="patFit">' + [4, 6, 9, 12].map(function (x) { return '<option value="' + x + '"' + (S.patFit === x ? ' selected' : '') + '>' + x + ' months</option>'; }).join('') + '</select></label>' +
        '<span class="geoleg">' + ['good', 'slip', 'turn', 'narrow', 'loss'].map(function (k) { return '<span class="gv ' + CLS[k].c + '">' + CLS[k].t + '</span>'; }).join('') + '</span></div>';
      var banner = '<div class="note"><b>Profitability (PAT), company and outlet.</b> Choose how far back to look: ' + esc(tagFor[S.patWin]) + ' here covers ' + esc(mlab(W.cur[0], endT)) + ' (' + W.len + ' month' + (W.len > 1 ? 's' : '') + '). The window ends at the last month of the dashboard period (' + esc(E.monthShort(endT)) + '). ' +
        '<b>PAT</b> = PSH \u00d7 working hours per outlet-month, summed; it is the management estimate, not a full accounting profit. ' +
        '<b>Trend and forecast</b> fit a straight line through the last ' + K + ' monthly PAT values and extend it ' + H + ' months, next to a \u201chold flat\u201d scenario (average of the last 3 months). They do not know about seasonality (e.g. Ramadan), openings, closures or price changes and rest on at most ' + T.length + ' months of reliable history, so treat them as direction. ' +
        '<b>Journey</b>: profitable (PAT over the window above zero) and improving / slipping by trend; <i>Turning around</i> = a loss over the window but the last 3 months are positive or breakeven is within 6 months on trend; <i>Loss, narrowing</i> = improving but not there yet; <i>Loss, not improving</i> = flat or worsening. ' +
        'Outlets need at least 4 months of PSH data inside the trend window to be judged. ' + (S.patScope === 'mature' ? 'New outlets (within ' + E.NEW_MONTHS + ' months of opening) are excluded from every month. ' : 'The company line includes new openings, so part of its growth comes from adding outlets; switch to \u201cMature only\u201d to see the existing base. ') +
        (B.isFiltered() ? 'Filters from the top bar apply.' : '') + '</div>';

      /* ---------- cards ---------- */
      var dPm = aP && aP.mo ? aW.pm - aP.pm : NaN;
      var profPrev = (function () { if (!W.prev) return NaN; var n = 0, p = 0; recs.forEach(function (x) { if (x.aP && x.aP.mo > 0) { n++; if (x.aP.pat > 0) p++; } }); return n ? p / n : NaN; })();
      var cards = '<div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
        B.card('PAT \u00b7 ' + esc(tagW), F.rp(aW.pat), 'PAT / month ' + F.rp(aW.pm) + (isN(dPm) ? '<br>vs ' + F.rp(aP.pm) + ' before \u00b7 <b class="' + F.cls(dPm) + '">' + sgn(dPm, 2) + 'm / month</b>' : '<br>no earlier window in the workbook'), aW.pat < 0 ? 'neg' : 'pos') +
        B.card('Outlet PSH \u00b7 ' + esc(tagW), F.n(aW.psh), 'Rp per staff hour' + (aP && aP.mo ? '<br>before ' + F.n(aP.psh) + ' \u00b7 <b class="' + F.cls(aW.psh - aP.psh) + '">' + sgnN(aW.psh - aP.psh) + '</b>' : '') + (isN(execPsh(W.cur)) ? '<br>Exec Dashboard ' + F.n(execPsh(W.cur)) : ''), aW.psh < 0 ? 'neg' : 'pos') +
        B.card('Profitable outlets', nProf + ' <small>of ' + inWin.length + '</small>', F.p(inWin.length ? nProf / inWin.length : NaN, 0) + ' of outlets with PAT above zero' + (isN(profPrev) ? '<br>before: ' + F.p(profPrev, 0) : ''), nProf / Math.max(1, inWin.length) >= 0.5 ? 'pos' : 'neg') +
        B.card('Trend \u00b7 last ' + K + ' months', cf ? sgn(cf.b, 2) + ' <small>m / month</small>' : '\u2013', cf ? 'PAT changes by this much each month<br>fit R\u00b2 ' + (isN(cf.r2) ? cf.r2.toFixed(2) : '\u2013') + ' \u00b7 trend level at ' + esc(E.monthShort(endT)) + ' ' + F.rp(cf.a) : 'Not enough months with data', cf ? F.cls(cf.b) : '') +
        B.card('Next ' + H + ' months (indicative)', F.rp(fcT), 'If the trend continues<br>hold-flat scenario ' + F.rp(flat) + '<br>breakeven: <b>' + esc(be.txt) + '</b>', isN(fcT) && fcT < 0 ? 'neg' : 'pos') + '</div>';

      /* ---------- journey cards ---------- */
      var clsRows = {}; Object.keys(CLS).forEach(function (k) { clsRows[k] = inWin.filter(function (x) { return x.j === k; }); });
      var lv = ['good', 'slip', 'turn', 'narrow', 'loss'].map(function (k) {
        var a = clsRows[k], tot = a.reduce(function (s, x) { return s + x.aW.pat; }, 0);
        return '<button class="lc' + (S.patCls === k ? ' on' : '') + '" data-cls="' + k + '" style="--c:' + CLS[k].col + '"><div class="l">' + CLS[k].t.toUpperCase() + '</div><div class="d">' + ({ good: 'PAT above zero, trend up or flat', slip: 'PAT above zero, trend down', turn: 'Loss over window, recent months positive or near breakeven', narrow: 'Loss over window, trend up', loss: 'Loss over window, trend flat or down' })[k] +
          '</div><div class="big">' + a.length + '<small>outlets</small></div><div class="f"><b>' + F.m(tot, 1) + '</b><span>PAT Rp m, ' + esc(tagW) + '</span></div></button>';
      }).join('');
      var fewN = clsRows.few.length;
      var lvHtml = '<div class="sec"><h3>Outlet journey<small>' + esc(tagFor[S.patWin]) + ' result + trend of the last ' + K + ' months</small></h3><a data-cls="all">All outlets \u00b7 ' + inWin.length + '</a></div><div class="lv" id="patLv">' + lv + '</div>' +
        '<div class="hint">Select a card to filter the table below.' + (fewN ? ' ' + fewN + ' outlet(s) have fewer than 4 months of PSH data in the trend window and are shown as \u201ctoo little data\u201d.' : '') + '</div>';

      /* ---------- outlet table ---------- */
      var c = function (key, label, sub, get, fmt, tdc, extra) { return Object.assign({ k: key, label: label, sub: sub, get: get, fmt: fmt, tdc: tdc }, extra || {}); };
      var cols = [
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'ct', label: 'Kota', left: true, get: function (w) { return w.ol.city || ''; }, fmt: function (w) { return esc(w.ol.city || '\u2013'); } },
        { k: 'st', label: 'Status', left: true, get: function (w) { return w.isNew ? 0 : 1; }, fmt: function (w) { return w.statusTxt; } },
        { k: 'pat', th: 'pt', cls: 'pt', label: 'PAT', sub: esc(tagW) + ' \u00b7 Rp m', get: function (w) { return w.aW.pat; }, fmt: function (w) { return '<b>' + F.m(w.aW.pat, 1) + '</b>'; }, tdc: function (w) { return F.cls(w.aW.pat); } },
        c('psh', 'PSH', esc(tagW) + ' \u00b7 Rp/hr', function (w) { return w.aW.psh; }, function (w) { return F.n(w.aW.psh); }, function (w) { return F.cls(w.aW.psh); }),
        c('mg', 'PAT margin', 'of sales', function (w) { return w.aW.margin; }, function (w) { return F.p(w.aW.margin, 2); }, function (w) { return F.cls(w.aW.margin); }),
        c('pm', 'PAT / month', 'Rp m', function (w) { return w.aW.pm; }, function (w) { return F.m(w.aW.pm, 2); }, function (w) { return F.cls(w.aW.pm); }),
        c('pp', 'Before', 'PAT / month', function (w) { return w.prevOK ? w.aP.pm : NaN; }, function (w) { return w.prevOK ? F.m(w.aP.pm, 2) : '\u2013'; }, function (w) { return w.prevOK ? F.cls(w.aP.pm) : ''; }),
        c('ch', 'Change', 'Rp m / month', function (w) { return w.chg; }, function (w) { return sgn(w.chg, 2); }, function (w) { return F.cls(w.chg); }),
        c('yy', 'vs last year', 'PAT / month', function (w) { return w.yoyChg; }, function (w) { return sgn(w.yoyChg, 2); }, function (w) { return F.cls(w.yoyChg); }),
        c('l3', 'Last 3 months', 'PAT Rp m', function (w) { return w.l3; }, function (w) { return F.m(w.l3, 1); }, function (w) { return F.cls(w.l3); }),
        c('lm', E.monthShort(endT), 'PAT Rp m', function (w) { return w.lastM; }, function (w) { return F.m(w.lastM, 2); }, function (w) { return F.cls(w.lastM); }),
        c('tr', 'Trend', 'Rp m / month', function (w) { return w.f ? w.f.b : NaN; }, function (w) { return w.f ? sgn(w.f.b, 2) : '\u2013'; }, function (w) { return w.f ? F.cls(w.f.b) : ''; }),
        c('r2', 'Fit', 'R\u00b2', function (w) { return w.f ? w.f.r2 : NaN; }, function (w) { return w.f && isN(w.f.r2) ? w.f.r2.toFixed(2) : '\u2013'; }),
        c('fc', 'Next ' + H + ' months', 'forecast PAT Rp m', function (w) { return w.fc; }, function (w) { return F.m(w.fc, 1); }, function (w) { return F.cls(w.fc); }),
        { k: 'be', label: 'Breakeven', sub: 'on trend', left: true, get: function (w) { return w.be.k; }, fmt: function (w) { return esc(w.be.txt); } },
        { k: 'jn', label: 'Journey', left: true, get: function (w) { return CLS[w.j].rank; }, fmt: function (w) { return pill(w.j); } }
      ];
      var rowsT = inWin.filter(function (x) { return !S.patCls || x.j === S.patCls; });
      var tbl = B.table('tbl-pat', rowsT, cols, { defSort: 'pat', defDir: 1, limit: 500 });

      /* ---------- group table ---------- */
      var dim = DIMS[S.patDim] || DIMS.am, grp = {};
      inWin.forEach(function (x) { var k = dim[1](x.ol); (grp[k] = grp[k] || []).push(x); });
      var gl = Object.keys(grp).map(function (k) {
        var a = grp[k], gi = a.map(function (x) { return x.o; }), gs = mkSeries(m, gi, T), gW = winAgg(gs, W.cur), gP = W.prev ? winAgg(gs, W.prev) : null;
        var gf = fitOf(gs, T, K), gl3 = last3Of(gs, T), gb = breakeven(gf, endT);
        return { k: k, n: a.length, w: gW, p: gP, f: gf, fc: fcTotal(gf), be: gb, prof: a.filter(function (x) { return x.aW.pat > 0; }).length, j: gW.mo ? journey(gW, gl3, gf, gb) : 'few', ch: gP && gP.mo ? gW.pm - gP.pm : NaN };
      }).sort(function (a, b) { return a.w.pat - b.w.pat; });
      var gbody = gl.map(function (g) {
        return '<tr style="cursor:default"><td class="l"><b>' + esc(g.k) + '</b></td><td>' + g.n + '</td><td class="pt ' + F.cls(g.w.pat) + '"><b>' + F.m(g.w.pat, 1) + '</b></td><td class="' + F.cls(g.w.psh) + '">' + F.n(g.w.psh) + '</td><td class="' + F.cls(g.w.margin) + '">' + F.p(g.w.margin, 2) + '</td>' +
          '<td>' + (g.p && g.p.mo ? F.m(g.p.pm, 2) : '\u2013') + '</td><td class="' + F.cls(g.ch) + '">' + sgn(g.ch, 2) + '</td><td>' + g.prof + ' / ' + g.n + ' <small style="color:var(--mute)">(' + F.p(g.n ? g.prof / g.n : NaN, 0) + ')</small></td>' +
          '<td class="' + (g.f ? F.cls(g.f.b) : '') + '">' + (g.f ? sgn(g.f.b, 2) : '\u2013') + '</td><td class="' + F.cls(g.fc) + '">' + F.m(g.fc, 1) + '</td><td class="l">' + esc(g.be.txt) + '</td><td class="l">' + pill(g.j) + '</td></tr>';
      }).join('');
      var gseg = seg('patDim', Object.keys(DIMS).map(function (k) { return [k, DIMS[k][0]]; }), S.patDim);
      var gtable = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Profitability by ' + esc(dim[0].toLowerCase()) + '</h3><p>' + esc(tagFor[S.patWin]) + ', sorted from the biggest loss. Trend and forecast use the group\u2019s total monthly PAT.</p></div>' + gseg + '</div>' +
        '<div class="tx" style="max-height:none"><table><thead><tr><th class="l">' + esc(dim[0]) + '</th><th>Outlets</th><th class="pt">PAT<small>Rp m</small></th><th>PSH<small>Rp/hr</small></th><th>PAT margin</th><th>Before<small>PAT / month</small></th><th>Change<small>Rp m / month</small></th><th>Profitable outlets</th><th>Trend<small>Rp m / month</small></th><th>Next ' + H + ' months<small>Rp m</small></th><th class="l">Breakeven</th><th class="l">Journey</th></tr></thead><tbody>' + (gbody || '<tr><td colspan="12" class="empty">No data.</td></tr>') + '</tbody></table></div></div>';

      view.innerHTML = banner + ctl + cards + momTbl +
        '<div class="grid g2" style="margin-top:12px"><div class="card" style="grid-column:span 2"><h4>Company PAT per month, trend and ' + H + '-month outlook</h4><div class="ch t"><canvas id="patC1"></canvas></div><div class="ks">Bars: monthly PAT of the outlets in view (Rp m). Solid line: straight-line trend fitted on the last ' + K + ' months, dotted continuation = forecast, with \u00b11 standard deviation of the fit. Grey dashed: hold the last-3-month average flat. Indicative only.</div></div></div>' +
        '<div class="grid g2" style="margin-top:12px"><div class="card" style="grid-column:span 2"><h4>PSH and share of outlets with positive PAT, by month</h4><div class="ch"><canvas id="patC2"></canvas></div></div></div>' +
        '<div style="margin-top:14px">' + lvHtml + '</div>' +
        '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlet profitability</h3><p>' + rowsT.length + ' outlets' + (S.patCls ? ' \u00b7 ' + esc(CLS[S.patCls].t) : '') + ' \u00b7 ' + esc(tagFor[S.patWin]) + ' \u00b7 sortable \u00b7 click an outlet for the detail with its own period filter</p></div><div style="display:flex;gap:8px;align-items:center">' + B.searchBox() + '<button class="btn" id="expPat"><i class="fas fa-download"></i> Export</button></div></div>' + tbl.html + '</div>' + gtable;

      /* ---------- wiring ---------- */
      tbl.bind(view); B.bindSearch(view);
      var bindSeg = function (id, key, num) { view.querySelectorAll('#' + id + ' button').forEach(function (b) { b.onclick = function () { S[key] = b.dataset.v; S.patCls = key === 'patDim' ? S.patCls : S.patCls; S.sort = null; B.render(); }; }); };
      bindSeg('patWin', 'patWin'); bindSeg('patScope', 'patScope'); bindSeg('patDim', 'patDim');
      view.querySelector('#patFit').onchange = function (e) { S.patFit = +e.target.value; S.sort = null; B.render(); };
      view.querySelectorAll('[data-cls]').forEach(function (el) { el.onclick = function () { var v = el.dataset.cls; S.patCls = v === 'all' ? null : (S.patCls === v ? null : v); S.sort = null; B.render(); }; });
      view.querySelector('#expPat').onclick = function () {
        B.csv('bod-profitability-' + S.patWin + '.csv', ['Code', 'Outlet', 'Type', 'Area manager', 'Province', 'Kota', 'Status', 'Window', 'PAT', 'PSH', 'PAT margin', 'PAT per month', 'Before: PAT per month', 'Change per month', 'vs last year: PAT per month', 'Last 3 months PAT', E.monthShort(endT) + ' PAT', 'Trend per month', 'Fit R2', 'Forecast next ' + H + ' months', 'Breakeven on trend', 'Journey'],
          tbl.all.map(function (w) { return [w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.prov, w.ol.city, w.statusTxt, tagFor[S.patWin], Math.round(w.aW.pat), isN(w.aW.psh) ? Math.round(w.aW.psh) : '', isN(w.aW.margin) ? w.aW.margin.toFixed(4) : '', Math.round(w.aW.pm), w.prevOK ? Math.round(w.aP.pm) : '', isN(w.chg) ? Math.round(w.chg) : '', isN(w.yoyChg) ? Math.round(w.yoyChg) : '', Math.round(w.l3), isN(w.lastM) ? Math.round(w.lastM) : '', w.f ? Math.round(w.f.b) : '', w.f && isN(w.f.r2) ? w.f.r2.toFixed(3) : '', isN(w.fc) ? Math.round(w.fc) : '', w.be.txt, CLS[w.j].t]; }));
      };

      /* ---------- charts ---------- */
      var Tc = T.slice(-18), fut = []; for (var k = 1; k <= H; k++) fut.push(endT + k);
      var labels = Tc.concat(fut).map(function (x) { return E.monthShort(x); });
      var pad = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(null); return a; };
      var act = Tc.map(function (x) { return ser[x].n > 0 ? ser[x].pat / 1e6 : null; });
      var fitIdx = {}; T.slice(-K).forEach(function (x) { fitIdx[x] = 1; });
      var trendLine = Tc.map(function (x) { return cf && fitIdx[x] ? (cf.a + cf.b * (x - endT)) / 1e6 : null; }).concat(fut.map(function (x) { return cf ? (cf.a + cf.b * (x - endT)) / 1e6 : null; }));
      var up = pad(Tc.length).concat(fut.map(function (x) { return cf ? (cf.a + cf.b * (x - endT) + cf.sd) / 1e6 : null; }));
      var lo = pad(Tc.length).concat(fut.map(function (x) { return cf ? (cf.a + cf.b * (x - endT) - cf.sd) / 1e6 : null; }));
      var flatM = isN(flat) ? flat / H / 1e6 : null, fl = pad(Tc.length - 1).concat([flatM]).concat(fut.map(function () { return flatM; }));
      if (cf) { up[Tc.length - 1] = trendLine[Tc.length - 1]; lo[Tc.length - 1] = trendLine[Tc.length - 1]; }
      B.chart('patC1', { data: { labels: labels, datasets: [
        { type: 'bar', label: 'Monthly PAT (Rp m)', data: act.concat(pad(H)), backgroundColor: act.map(function (v) { return v != null && v < 0 ? '#e3a0a6' : '#8fc8ad'; }).concat(pad(H)), order: 3 },
        { type: 'line', label: 'Trend (last ' + K + ' months) and forecast', data: trendLine, borderColor: '#16436f', backgroundColor: '#16436f', pointRadius: 2, borderWidth: 2, tension: 0, segment: { borderDash: function (c) { return c.p0DataIndex >= Tc.length - 1 ? [5, 4] : undefined; } }, spanGaps: false, order: 1 },
        { type: 'line', label: 'Forecast \u00b11 s.d.', data: up, borderColor: '#9db0c8', borderDash: [2, 3], pointRadius: 0, borderWidth: 1, order: 2 },
        { type: 'line', label: 'Forecast \u22121 s.d.', data: lo, borderColor: '#9db0c8', borderDash: [2, 3], pointRadius: 0, borderWidth: 1, order: 2 },
        { type: 'line', label: 'Hold flat (last 3 months average)', data: fl, borderColor: '#7a8696', borderDash: [6, 4], pointRadius: 2, borderWidth: 1.5, order: 2 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, filter: function (it) { return it.text.indexOf('\u2212') < 0; } } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label.replace(/ \(Rp m\)/, '') + ': Rp ' + (c.parsed.y == null ? '\u2013' : c.parsed.y.toFixed(1) + 'm'); } } } },
          scales: { x: { ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 }, callback: function (v) { return v + 'm'; } }, grid: { color: function (c) { return c.tick && c.tick.value === 0 ? '#8a97a8' : '#eef1f5'; } } } } } });
      var sh = Tc.map(function (x) { return exOk ? E.execAt(B.exec, 'PSH', x) : NaN; });
      var ds2 = [
        { label: 'Outlet PSH (PAT \u00f7 hours, Rp/hr)', data: Tc.map(function (x) { return ser[x].wh > 0 ? ser[x].pat / ser[x].wh : null; }), borderColor: '#b5303b', backgroundColor: '#b5303b', tension: .2, pointRadius: 2, yAxisID: 'y' }];
      if (sh.some(isN)) ds2.push({ label: 'Company PSH (Exec Dashboard)', data: sh.map(function (v) { return isN(v) ? v : null; }), borderColor: '#d98a12', borderDash: [5, 4], tension: .2, pointRadius: 2, yAxisID: 'y' });
      ds2.push({ label: 'Outlets with positive PAT (%)', data: Tc.map(function (x) { return ser[x].n > 0 ? ser[x].pos / ser[x].n * 100 : null; }), borderColor: '#0f7a55', backgroundColor: '#0f7a55', tension: .2, pointRadius: 2, yAxisID: 'y1' });
      B.chart('patC2', { type: 'line', data: { labels: Tc.map(function (x) { return E.monthShort(x); }), datasets: ds2 }, options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
        scales: { x: { ticks: { font: { size: 10 } } }, y: { position: 'left', ticks: { font: { size: 10 } }, title: { display: true, text: 'PSH (Rp/hr)', font: { size: 10 } } }, y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, callback: function (v) { return v + '%'; } }, title: { display: true, text: 'Outlets with PAT > 0', font: { size: 10 } } } } } });
    }
  };
})(window);
