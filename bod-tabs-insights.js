/* ============================================================================
 * BOD Dashboard - tabs: Financial growth, Watchlist, Winning formula
 * Alert thresholds below are PROPOSED defaults, shown on screen so the board can challenge them.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;

  /* ---------- flags ---------- */
  var TH = { txDrop: -0.10, marginDrop: -0.02, stockLoss: 0.03, salary: 0.20, rent: 0.10, recruit: 0.15, negStreak: 3, slowRamp: 0.5 };
  var DEFS = [
    { id: 'lvl45', sev: 'h', label: 'Level 4\u20135 decline', desc: 'Sales or transactions down 15% or more vs last year' },
    { id: 'txdrop', sev: 'h', label: 'Footfall falling', desc: 'Transactions down 10% or more vs last year' },
    { id: 'negpsh', sev: 'h', label: 'Negative PSH 3 months running', desc: 'PAT negative in each of the last 3 months' },
    { id: 'stockloss', sev: 'h', label: 'High stock loss', desc: 'Stock loss at or above 3% of sales in the latest month' },
    { id: 'slow', sev: 'h', label: 'Slow ramp-up', desc: 'New outlet at under half the sales of outlets at the same age' },
    { id: 'margin', sev: 'm', label: 'Margin erosion', desc: 'Margin down 2 pp or more vs last year' },
    { id: 'salary', sev: 'm', label: 'Heavy salary load', desc: 'Salary at or above 20% of sales in the latest month' },
    { id: 'rent', sev: 'm', label: 'High rental cost', desc: 'Rental above 10% of sales in the latest month' },
    { id: 'recruit', sev: 'm', label: 'Weak member recruitment', desc: 'Recruitment rate below 15% in the latest month' },
    { id: 'lossmaking', sev: 'm', label: 'Loss-making mature outlet', desc: 'Negative PAT over the period, open more than 12 months' },
    { id: 'anomaly', sev: 'i', label: 'Check the data', desc: 'Latest margin above 60% or below \u221230%' }
  ];
  B.flagDefs = DEFS;
  B.flagTH = TH;

  B.computeFlags = function (ctx) {
    var m = ctx.m, endT = ctx.P.cur[ctx.P.cur.length - 1], counts = {}, by = {}, high = 0, ramp = null, bench = NaN;
    DEFS.forEach(function (d) { counts[d.id] = 0; });
    var dm = new Date(Date.UTC(E.ymOf(endT).y, E.ymOf(endT).m + 1, 0)).getUTCDate();
    var rampo = B.ramp(m);
    ctx.rowsF.forEach(function (r) {
      if (r.cat === 'inactive') return;
      var L = r.last, f = [];
      if (r.cat === 'lfl') {
        if (r.dir === 'down' && r.level >= 4) f.push('lvl45');
        if (isN(r.gTx) && r.gTx <= TH.txDrop) f.push('txdrop');
        if (isN(r.dMargin) && r.dMargin <= TH.marginDrop) f.push('margin');
      }
      var p = [0, 1, 2].map(function (k) { return E.get(m, 'psh', r.o, endT - k); });
      if (p.every(function (v) { return v === v && v < 0; })) f.push('negpsh');
      if (isN(L.slPct) && L.revC > 0 && L.slPct >= TH.stockLoss) f.push('stockloss');
      if (isN(L.salPct) && L.salPct >= TH.salary) f.push('salary');
      if (isN(L.rentPct) && L.revC > 0 && L.rentPct > TH.rent) f.push('rent');
      if (isN(L.rrPct) && L.rrPct < TH.recruit) f.push('recruit');
      if (r.A.patOM > 0 && r.patCur < 0 && r.opMonths > 12) f.push('lossmaking');
      if (isN(L.margin) && (L.margin > 0.6 || L.margin < -0.3)) f.push('anomaly');
      if (r.cat === 'new' && r.ol.firstRev >= 0) {
        var age = endT - r.ol.firstRev + 1, md = rampo.med[age];
        if (age <= 12 && age >= 2 && isN(md) && L.rev > 0 && L.rev / md < TH.slowRamp) f.push('slow');
      }
      if (f.length) {
        by[r.o] = f; var hi = false;
        f.forEach(function (id) { counts[id]++; if (DEFS.filter(function (d) { return d.id === id; })[0].sev === 'h') hi = true; });
        if (hi) high++;
      }
    });
    return { defs: DEFS, counts: counts, by: by, high: high, endT: endT };
  };

  /* ---------- Watchlist ---------- */
  B.tabs.watch = {
    render: function (ctx, view) {
      var al = B.computeFlags(ctx), P = ctx.P, endT = al.endT, sevW = { h: 3, m: 2, i: 1 };
      var sevOf = function (id) { return DEFS.filter(function (d) { return d.id === id; })[0].sev; };
      var rows = ctx.rowsF.filter(function (r) { return al.by[r.o]; });
      rows.forEach(function (r) { r.flags = al.by[r.o]; r.score = r.flags.reduce(function (s, id) { return s + sevW[sevOf(id)]; }, 0); });
      var sel = S.flag && al.counts[S.flag] != null ? S.flag : null;
      var shown = sel ? rows.filter(function (r) { return r.flags.indexOf(sel) >= 0; }) : rows;
      var tiles = DEFS.map(function (d) {
        var c = d.sev === 'h' ? 'var(--l5)' : d.sev === 'm' ? 'var(--l3)' : 'var(--l2)';
        return '<div class="tile' + (sel === d.id ? ' on' : '') + '" data-flag="' + d.id + '" style="--c:' + c + '"><div class="n">' + al.counts[d.id] + '</div><div class="t">' + esc(d.label) + '</div><div class="d">' + esc(d.desc) + '</div></div>';
      }).join('');
      var pill = function (id) { var d = DEFS.filter(function (x) { return x.id === id; })[0]; return '<span class="fl ' + d.sev + '" title="' + esc(d.desc) + '">' + esc(d.label) + '</span>'; };
      var cols = [
        { k: 'score', label: 'Priority', sub: 'score', get: function (r) { return r.score; }, fmt: function (r) { return '<b>' + r.score + '</b>'; } },
        { k: 'name', label: 'Outlet', left: true, get: function (r) { return r.ol.name; }, fmt: function (r) { return '<div class="nm"><b>' + esc(r.ol.name) + '</b><span>' + esc(r.ol.code) + ' \u00b7 <i class="pill t">' + esc(r.ol.type) + '</i> ' + esc(r.ol.am) + '</span></div>'; } },
        { k: 'fl', label: 'Flags', left: true, get: function (r) { return r.flags.length; }, fmt: function (r) { return '<div style="white-space:normal;min-width:240px">' + r.flags.map(pill).join('') + '</div>'; } },
        { k: 'lv', label: 'Level', get: function (r) { return r.cat === 'lfl' ? (r.dir === 'down' ? -r.level : r.level) : null; }, fmt: function (r) { return r.cat === 'lfl' ? (r.dir === 'down' ? '<span class="lvl" style="--c:var(--l' + r.level + ')">\u2193L' + r.level + '</span>' : '<span class="lvl" style="--c:var(--up' + r.level + ')">\u2191L' + r.level + '</span>') : '<span class="pill">New</span>'; } },
        { k: 'g', label: 'Sales change', get: function (r) { return r.gRev; }, fmt: function (r) { return isN(r.gRev) ? F.p(r.gRev, 1, true) : '\u2013'; }, tdc: function (r) { return F.cls(r.gRev); } },
        { k: 'gt', label: 'Tx change', get: function (r) { return r.gTx; }, fmt: function (r) { return isN(r.gTx) ? F.p(r.gTx, 1, true) : '\u2013'; }, tdc: function (r) { return F.cls(r.gTx); } },
        { k: 'rv', label: E.monthShort(endT) + ' sales', sub: 'Rp m', get: function (r) { return r.last.rev; }, fmt: function (r) { return F.m(r.last.rev); } },
        { k: 'mg', label: 'Margin', get: function (r) { return r.last.margin; }, fmt: function (r) { return F.p(r.last.margin, 1); } },
        { k: 'sa', label: 'Salary', sub: '% sales', get: function (r) { return r.last.salPct; }, fmt: function (r) { return F.p(r.last.salPct, 1); } },
        { k: 'rn', label: 'Rental', sub: '% sales', get: function (r) { return r.last.rentPct; }, fmt: function (r) { return F.p(r.last.rentPct, 1); }, tdc: function (r) { return isN(r.last.rentPct) && r.last.rentPct > TH.rent ? 'neg' : ''; } },
        { k: 'sl', label: 'Stock loss', sub: '% sales', get: function (r) { return r.last.slPct; }, fmt: function (r) { return F.p(r.last.slPct, 1); } },
        { k: 'rr', label: 'Recruit', sub: 'rate', get: function (r) { return r.last.rrPct; }, fmt: function (r) { return F.p(r.last.rrPct, 0); } },
        { k: 'pl', label: 'PSH', sub: 'Rp/hr', get: function (r) { return r.pshLast; }, fmt: function (r) { return F.n(r.pshLast); }, tdc: function (r) { return F.cls(r.pshLast); } },
        { k: 'tl', th: 'pt', cls: 'pt', label: E.monthShort(endT) + ' PAT', sub: 'Rp k', get: function (r) { return r.patLast; }, fmt: function (r) { return r.last.patOM ? F.n(r.patLast / 1e3) : '\u2013'; }, tdc: function (r) { return F.cls(r.patLast); } }
      ];
      var tbl = B.table('tbl-watch', shown, cols, { defSort: 'score', defDir: -1 });
      view.innerHTML = '<div class="note"><b>Watchlist: outlets that need intervention.</b> Each outlet is checked against ' + DEFS.length + ' rules on ' + E.monthLabel(endT) + ' data and ' + esc(P.tag) + ' vs ' + esc(P.baseTag) + '. Priority score = 3 per high flag, 2 per medium, 1 per info. ' +
        '<b>' + al.high + '</b> outlet(s) carry at least one high-severity flag. Thresholds are proposed starting points, not company policy; tell me the ones the board wants changed.</div>' +
        '<div class="grid g4" style="margin-bottom:6px">' + tiles + '</div><div class="hint">Select a tile to filter. ' + (sel ? '<a style="cursor:pointer;color:var(--navy);font-weight:700;text-decoration:underline" id="clr">Clear filter</a>' : '') + '</div>' +
        '<div class="tw"><div class="th"><div><h3>' + (sel ? esc(DEFS.filter(function (d) { return d.id === sel; })[0].label) : 'All flagged outlets') + ' \u00b7 ' + shown.length + ' outlets</h3><p>Click an outlet for its monthly history.</p></div><div style="display:flex;gap:10px">' + B.searchBox() + '<button class="btn" id="exp"><i class="fas fa-download"></i> Export table</button></div></div>' + tbl.html + '</div>';
      view.querySelectorAll('[data-flag]').forEach(function (el) { el.onclick = function () { S.flag = S.flag === el.dataset.flag ? null : el.dataset.flag; B.render(); }; });
      var c = view.querySelector('#clr'); if (c) c.onclick = function () { S.flag = null; B.render(); };
      tbl.bind(view); B.bindSearch(view);
      view.querySelector('#exp').onclick = function () {
        B.csv('bod-watchlist.csv', ['Priority', 'Code', 'Outlet', 'Type', 'AM', 'Flags', 'Sales change', 'Tx change', 'Latest sales', 'Latest margin', 'Salary %', 'Rental %', 'Stock loss %', 'Recruit %', 'Latest PSH', 'Latest PAT'],
          tbl.all.map(function (r) { return [r.score, r.ol.code, r.ol.name, r.ol.type, r.ol.am, r.flags.map(function (id) { return DEFS.filter(function (d) { return d.id === id; })[0].label; }).join('; '), isN(r.gRev) ? r.gRev.toFixed(4) : '', isN(r.gTx) ? r.gTx.toFixed(4) : '', Math.round(r.last.rev), isN(r.last.margin) ? r.last.margin.toFixed(4) : '', isN(r.last.salPct) ? r.last.salPct.toFixed(4) : '', isN(r.last.rentPct) ? r.last.rentPct.toFixed(4) : '', isN(r.last.slPct) ? r.last.slPct.toFixed(4) : '', isN(r.last.rrPct) ? r.last.rrPct.toFixed(4) : '', isN(r.pshLast) ? Math.round(r.pshLast) : '', Math.round(r.patLast)]; }));
      };
    }
  };

  /* ---------- Financial growth ---------- */
  function cohortOf(o) {
    var t = o.startIdx >= 0 ? o.startIdx : o.firstRev;
    if (t === undefined || t < 0) return 'Unknown';
    var y = 2000 + Math.floor(t / 12);
    return y < 2020 ? 'Before 2020' : String(y);
  }
  var DIMS = { cohort: ['Opening year', cohortOf], type: ['Outlet type', function (o) { return o.type; }], tier: ['Tier (Category)', function (o) { return o.tier; }], size: ['Store size', function (o) { return B.sizeKey(o); }], am: ['Area manager', function (o) { return o.am; }], prov: ['Province', function (o) { return o.prov; }], nature: ['Nature', function (o) { return o.nature; }], city: ['City / regency', function (o) { return o.city || 'N/A'; }] };
  S.dim = S.dim || 'type';

  B.tabs.growth = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, rows = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      var gs = E.groupStats(m, P, ctx.rowsF), hb = P.baseAvailable, endT = P.cur[P.cur.length - 1];
      var chg = function (a, b) { return hb && b > 0 ? a / b - 1 : NaN; };
      var line = function (lab, a, b, fmt, mode) {
        var d = (mode === 'pp' || mode === 'abs') ? (hb && isN(a) && isN(b) ? a - b : NaN) : chg(a, b);
        var dTxt = mode === 'pp' ? F.pp(d) : mode === 'abs' ? (isN(d) ? (d >= 0 ? '+' : '\u2212') + fmt(Math.abs(d)) : '\u2013') : F.p(d, 1, true);
        var neg = (mode === 'abs' && isN(a) && a < 0) ? ' neg' : '';
        return '<tr style="cursor:default"><td class="l"><b>' + lab + '</b></td><td class="' + neg + '">' + fmt(a) + '</td><td class="' + (mode === 'abs' && isN(b) && b < 0 ? 'neg' : '') + '">' + (hb ? fmt(b) : '\u2013') + '</td><td class="' + F.cls(d) + '">' + dTxt + '</td></tr>';
      };
      var a = gs.a, b = gs.b;
      var coP = { a: a.psh, b: b.psh, src: 'rebuilt' };
      if (!B.isFiltered() && B.exec) {
        var pa = E.companyPsh(m, B.exec, P.cur), pb = hb ? E.companyPsh(m, B.exec, P.base) : null;
        if (pa.src === 'sheet') { coP.a = pa.v; coP.src = 'sheet'; if (pb && pb.src === 'sheet') coP.b = pb.v; else coP.b = NaN; }
      }
      var execSales = '';
      if (!B.isFiltered() && B.exec && hb) {
        var sx = function (ms) { var t = 0, ok = ms.length > 0; ms.forEach(function (x) { var v = E.execAt(B.exec, 'Revenue', x); if (isN(v)) t += v; else ok = false; }); return ok ? t : NaN; };
        var xa = sx(P.cur), xb = sx(P.base);
        if (isN(xa) && isN(xb) && xb > 0) execSales = '<tr style="cursor:default;background:#f7f9fc"><td class="l"><b>Sales per Exec Dashboard</b> <small style="color:var(--mute)">(company row as published; reference only)</small></td><td>' + F.rp(xa) + '</td><td>' + F.rp(xb) + '</td><td class="' + F.cls(xa / xb - 1) + '">' + F.p(xa / xb - 1, 1, true) + '</td></tr>';
      }
      var lflRows = '';
      lflRows += '<tr style="cursor:default"><td class="l"><b>Like-for-like sales</b> (' + gs.nLfl + ' outlets)</td><td>' + F.rp(gs.la.rev) + '</td><td>' + (hb ? F.rp(gs.lb.rev) : '\u2013') + '</td><td class="' + F.cls(gs.lRev) + '">' + F.p(gs.lRev, 1, true) + '</td></tr>';
      lflRows += '<tr style="cursor:default"><td class="l"><b>Like-for-like transactions</b></td><td>' + F.n(gs.la.tx) + '</td><td>' + (hb ? F.n(gs.lb.tx) : '\u2013') + '</td><td class="' + F.cls(gs.lTx) + '">' + F.p(gs.lTx, 1, true) + '</td></tr>';
      var mt = '<div class="tw" style="margin-top:0"><div class="th"><div><h3>Company growth scorecard</h3><p>' + esc(P.tag) + ' vs ' + esc(P.baseTag) + ' \u00b7 all ' + gs.n + ' trading outlets in the current filter</p></div></div><div class="tx"><table><thead><tr><th class="l">Metric</th><th>' + esc(P.tag) + '</th><th>' + esc(P.baseTag) + '</th><th>Change</th></tr></thead><tbody>' +
        line('Sales', a.rev, b.rev, F.rp) + execSales + line('Transactions', a.tx, b.tx, F.n) + line('Basket size (Rp)', a.basket, b.basket, F.n) + line('Gross profit', a.pro, b.pro, F.rp) +
        line('Margin', a.margin, b.margin, function (v) { return F.p(v, 2); }, 'pp') +
        line('<b>PAT (PSH \u00d7 hours)</b>', a.pat, b.pat, F.rp, 'abs') +
        line('PSH (Rp per staff hour)' + (coP.src === 'sheet' ? ' \u00b7 company, per sheet' : ''), coP.a, coP.b, F.n, 'abs') +
        line('Focus product share of sales', a.focusPct, b.focusPct, function (v) { return F.p(v, 1); }, 'pp') + line('Sales through members', a.memPct, b.memPct, function (v) { return F.p(v, 1); }, 'pp') +
        line('Recruitment rate', a.rrPct, b.rrPct, function (v) { return F.p(v, 1); }, 'pp') + line('New members', a.nm, b.nm, F.n) +
        line('Salary % of sales', a.salPct, b.salPct, function (v) { return F.p(v, 1); }, 'pp') + line('Rental % of sales', a.rentPct, b.rentPct, function (v) { return F.p(v, 1); }, 'pp') + line('Stock loss % of sales', a.slPct, b.slPct, function (v) { return F.p(v, 2); }, 'pp') +
        lflRows + '</tbody></table></div></div>';

      // dimension table
      var dim = DIMS[S.dim] || DIMS.type, groups = {};
      rows.forEach(function (r) { var k = dim[1](r.ol) || 'N/A'; (groups[k] = groups[k] || []).push(r); });
      var recs = Object.keys(groups).map(function (k) {
        var rr = groups[k], g = E.groupStats(m, P, rr), dn = rr.filter(function (r) { return r.cat === 'lfl' && r.dir === 'down'; }).length, lf = rr.filter(function (r) { return r.cat === 'lfl'; }).length;
        return { k: k, g: g, n: rr.length, dn: dn, lf: lf, o: rr[0].o };
      });
      recs.forEach(function (x) { x.ol = { name: x.k, code: '', am: '' }; });
      var c = function (key, label, sub, get, fmt, tdc) { return { k: key, label: label, sub: sub, get: get, fmt: fmt, tdc: tdc }; };
      var dcols = [
        { k: 'k', label: dim[0], left: true, get: function (x) { return x.k; }, fmt: function (x) { return '<b>' + esc(x.k) + '</b>'; } },
        c('n', 'Outlets', '', function (x) { return x.n; }, function (x) { return x.n; }),
        c('rev', 'Sales', 'Rp b', function (x) { return x.g.a.rev; }, function (x) { return (x.g.a.rev / 1e9).toFixed(2); }),
        c('lr', 'LFL sales', 'change', function (x) { return x.g.lRev; }, function (x) { return F.p(x.g.lRev, 1, true); }, function (x) { return F.cls(x.g.lRev); }),
        c('lt', 'LFL tx', 'change', function (x) { return x.g.lTx; }, function (x) { return F.p(x.g.lTx, 1, true); }, function (x) { return F.cls(x.g.lTx); }),
        c('mg', 'Margin', '', function (x) { return x.g.a.margin; }, function (x) { return F.p(x.g.a.margin, 1); }),
        c('dm', 'LFL margin', 'change', function (x) { return x.g.lMargin; }, function (x) { return F.pp(x.g.lMargin); }, function (x) { return F.cls(x.g.lMargin); }),
        c('bk', 'Basket', 'Rp', function (x) { return x.g.a.basket; }, function (x) { return F.n(x.g.a.basket); }),
        c('fp', 'Focus', '% sales', function (x) { return x.g.a.focusPct; }, function (x) { return F.p(x.g.a.focusPct, 1); }),
        c('rr', 'Recruit', 'rate', function (x) { return x.g.a.rrPct; }, function (x) { return F.p(x.g.a.rrPct, 0); }),
        c('ps', 'PSH', 'Rp/hr', function (x) { return x.g.a.psh; }, function (x) { return F.n(x.g.a.psh); }, function (x) { return F.cls(x.g.a.psh); }),
        { k: 'pat', th: 'pt', cls: 'pt', label: 'PAT', sub: 'Rp m', get: function (x) { return x.g.a.pat; }, fmt: function (x) { return F.m(x.g.a.pat); }, tdc: function (x) { return F.cls(x.g.a.pat); } },
        { k: 'dpat', th: 'pt', cls: 'pt', label: 'PAT change', sub: 'Rp m', get: function (x) { return x.g.dPat; }, fmt: function (x) { return hb ? F.m(x.g.dPat) : '\u2013'; }, tdc: function (x) { return F.cls(x.g.dPat); } },
        c('ng', 'Negative PAT', 'outlets', function (x) { return x.g.negPat; }, function (x) { return x.g.negPat; }, function (x) { return x.g.negPat ? 'neg' : ''; }),
        c('dn', 'Declining', '% of LFL', function (x) { return x.lf ? x.dn / x.lf : NaN; }, function (x) { return x.lf ? F.p(x.dn / x.lf, 0) : '\u2013'; })
      ];
      var dtbl = B.table('tbl-dim', recs.map(function (x) { return Object.assign(x, { o: x.o }); }), dcols, { defSort: 'rev', defDir: -1 });
      var dimSel = Object.keys(DIMS).map(function (k) { return '<option value="' + k + '"' + (S.dim === k ? ' selected' : '') + '>' + DIMS[k][0] + '</option>'; }).join('');

      view.innerHTML = '<div class="note"><b>Financial growth.</b> Sales, transactions, profit, PAT and margin for ' + esc(P.label) + ', each against ' + esc(P.baseTag) + '. Totals include every outlet that traded; <i>like-for-like</i> rows only count outlets with a full prior-year base, so new openings do not flatter growth.</div>' +
        '<div class="grid g2" style="align-items:start">' + mt +
        '<div class="grid" style="gap:12px"><div class="card"><h4>Year-on-year growth by month</h4><div class="ch"><canvas id="gy"></canvas></div><div class="ks">Same-month growth, all trading outlets (includes new openings). Sales, transactions and profit.</div></div>' +
        '<div class="card"><h4>PAT (Rp m) and margin %, by month</h4><div class="ch"><canvas id="gp"></canvas></div></div></div></div>' +
        '<div class="tw"><div class="th"><div><h3>Growth by ' + dim[0].toLowerCase() + '</h3><p>Where the growth and the leakage sit. Rows are sortable; PAT columns are on the right.</p></div><div style="display:flex;gap:10px;align-items:center"><label style="font-size:11px;color:var(--ink2);font-weight:600">Group by <select id="dimSel" style="border:1px solid var(--line);border-radius:6px;padding:5px 8px;margin-left:4px">' + dimSel + '</select></label><button class="btn" id="exp"><i class="fas fa-download"></i> Export</button></div></div>' + dtbl.html + '</div>';
      view.querySelector('#dimSel').onchange = function (e) { S.dim = e.target.value; S.sort = null; B.render(); };
      var t = view.querySelector('#tbl-dim'); if (t) { t.querySelectorAll('th').forEach(function (th) { th.onclick = function () { var k = th.dataset.k, cur = S.sort && S.sort.id === 'tbl-dim' ? S.sort : { k: 'rev', dir: -1 }; S.sort = { id: 'tbl-dim', k: k, dir: cur.k === k ? -cur.dir : 1 }; B.render(); }; }); t.querySelectorAll('tbody tr').forEach(function (tr) { tr.style.cursor = 'default'; }); }
      view.querySelector('#exp').onclick = function () {
        B.csv('bod-growth-by-' + S.dim + '.csv', [dim[0], 'Outlets', 'Sales', 'LFL sales change', 'LFL tx change', 'Margin', 'LFL margin change', 'PSH', 'PAT', 'PAT change', 'Negative PAT outlets'],
          dtbl.all.map(function (x) { return [x.k, x.n, Math.round(x.g.a.rev), isN(x.g.lRev) ? x.g.lRev.toFixed(4) : '', isN(x.g.lTx) ? x.g.lTx.toFixed(4) : '', isN(x.g.a.margin) ? x.g.a.margin.toFixed(4) : '', isN(x.g.lMargin) ? x.g.lMargin.toFixed(4) : '', isN(x.g.a.psh) ? Math.round(x.g.a.psh) : '', Math.round(x.g.a.pat), Math.round(x.g.dPat), x.g.negPat]; }));
      };
      // charts: monthly series for the filtered outlets
      var all = rows.map(function (r) { return r.o; }), mo = E.monthly(m, all), byT = {}; mo.forEach(function (x) { byT[x.t] = x; });
      var ts = mo.filter(function (x) { return x.t - 12 >= m.baseMin && x.t > endT - 24 && x.t <= m.latest; });
      var yy = function (key) { return ts.map(function (x) { var b = byT[x.t - 12]; return b && b[key] > 0 ? (x[key] / b[key] - 1) * 100 : null; }); };
      var lab = ts.map(function (x) { return E.monthShort(x.t); }), tick = { ticks: { font: { size: 9 } } }, leg = { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } };
      B.chart('gy', { type: 'line', data: { labels: lab, datasets: [
        { label: 'Sales', data: yy('rev'), borderColor: '#16436f', backgroundColor: '#16436f', tension: .25, pointRadius: 2 },
        { label: 'Transactions', data: yy('tx'), borderColor: '#c9951c', backgroundColor: '#c9951c', tension: .25, pointRadius: 2 },
        { label: 'Profit', data: yy('pro'), borderColor: '#0f7a55', backgroundColor: '#0f7a55', tension: .25, pointRadius: 2 }] },
        options: { plugins: leg, scales: { x: tick, y: { ticks: { font: { size: 9 }, callback: function (v) { return v + '%'; } } } } } });
      B.chart('gp', { data: { labels: lab, datasets: [
        { type: 'bar', label: 'PAT (Rp m)', data: ts.map(function (x) { return isN(x.pat) ? x.pat / 1e6 : null; }), backgroundColor: ts.map(function (x) { return x.pat < 0 ? '#e7a3a8' : '#a9d3bd'; }), yAxisID: 'y' },
        { type: 'line', label: 'Margin %', data: ts.map(function (x) { return isN(x.margin) ? x.margin * 100 : null; }), borderColor: '#16436f', backgroundColor: '#16436f', tension: .25, yAxisID: 'y1', pointRadius: 2 }] },
        options: { plugins: leg, scales: { x: tick, y: { position: 'left', ticks: tick.ticks }, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: tick.ticks } } } });
    }
  };

  /* ---------- Area manager scorecard ---------- */
  B.tabs.am = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, hb = P.baseAvailable, al = B.computeFlags(ctx);
      var rows = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; }), groups = {};
      rows.forEach(function (r) { (groups[r.ol.am || 'Unassigned'] = groups[r.ol.am || 'Unassigned'] || []).push(r); });
      var recs = Object.keys(groups).map(function (k) {
        var rr = groups[k], g = E.groupStats(m, P, rr);
        var lf = rr.filter(function (r) { return r.cat === 'lfl'; }), dn = lf.filter(function (r) { return r.dir === 'down'; });
        var hi = rr.filter(function (r) { return (al.by[r.o] || []).some(function (id) { return DEFS.filter(function (d) { return d.id === id; })[0].sev === 'h'; }); }).length;
        var deep = dn.filter(function (r) { return r.level >= 4; }).length;
        return { k: k, g: g, n: rr.length, lf: lf.length, dn: dn.length, deep: deep, hi: hi, ol: { name: k, code: '', am: k }, o: rr[0].o };
      });
      var c = function (key, label, sub, get, fmt, tdc, extra) { return Object.assign({ k: key, label: label, sub: sub, get: get, fmt: fmt, tdc: tdc }, extra || {}); };
      var cols = [
        { k: 'k', label: 'Area manager', left: true, get: function (x) { return x.k; }, fmt: function (x) { return '<b>' + esc(x.k) + '</b>'; } },
        c('n', 'Outlets', '', function (x) { return x.n; }, function (x) { return x.n; }),
        c('rev', 'Sales', 'Rp b', function (x) { return x.g.a.rev; }, function (x) { return (x.g.a.rev / 1e9).toFixed(2); }),
        c('lr', 'LFL sales', 'change', function (x) { return x.g.lRev; }, function (x) { return F.p(x.g.lRev, 1, true); }, function (x) { return F.cls(x.g.lRev); }),
        c('lt', 'LFL tx', 'change', function (x) { return x.g.lTx; }, function (x) { return F.p(x.g.lTx, 1, true); }, function (x) { return F.cls(x.g.lTx); }),
        c('mg', 'Margin', '', function (x) { return x.g.a.margin; }, function (x) { return F.p(x.g.a.margin, 1); }),
        c('dm', 'LFL margin', 'change', function (x) { return x.g.lMargin; }, function (x) { return F.pp(x.g.lMargin); }, function (x) { return F.cls(x.g.lMargin); }),
        c('ps', 'PSH', 'Rp/hr', function (x) { return x.g.a.psh; }, function (x) { return F.n(x.g.a.psh); }, function (x) { return F.cls(x.g.a.psh); }),
        { k: 'pat', th: 'pt', cls: 'pt', label: 'PAT', sub: 'Rp m', get: function (x) { return x.g.a.pat; }, fmt: function (x) { return F.m(x.g.a.pat); }, tdc: function (x) { return F.cls(x.g.a.pat); } },
        { k: 'dpat', th: 'pt', cls: 'pt', label: 'PAT change', sub: 'Rp m', get: function (x) { return x.g.dPat; }, fmt: function (x) { return hb ? F.m(x.g.dPat) : '\u2013'; }, tdc: function (x) { return F.cls(x.g.dPat); } },
        c('dn', 'Declining', '% of LFL', function (x) { return x.lf ? x.dn / x.lf : NaN; }, function (x) { return x.lf ? F.p(x.dn / x.lf, 0) : '\u2013'; }, function (x) { return x.lf && x.dn / x.lf >= 0.5 ? 'neg' : ''; }),
        c('deep', 'Level 4\u20135', 'outlets', function (x) { return x.deep; }, function (x) { return x.deep; }, function (x) { return x.deep ? 'neg' : ''; }),
        c('ng', 'Negative PAT', 'outlets', function (x) { return x.g.negPat; }, function (x) { return x.g.negPat; }, function (x) { return x.g.negPat ? 'neg' : ''; }),
        c('hi', 'High alerts', 'outlets', function (x) { return x.hi; }, function (x) { return x.hi; }, function (x) { return x.hi ? 'neg' : ''; })
      ];
      var tbl = B.table('tbl-am', recs, cols, { defSort: 'dn', defDir: -1 });
      view.innerHTML = '<div class="note"><b>Area manager scorecard.</b> ' + esc(P.tag) + (hb ? ' vs ' + esc(P.baseTag) : '') + '. One row per AM across the outlets in the current filter; <i>declining</i> counts like-for-like outlets that fell on ' + esc(ctx.rateName) + '. Click an AM to see their declining stores.</div>' +
        '<div class="tw"><div class="th"><div><h3>Area managers</h3><p>' + recs.length + ' area managers \u00b7 sortable \u00b7 PAT = PSH \u00d7 hours</p></div><button class="btn" id="expAm"><i class="fas fa-download"></i> Export</button></div>' + tbl.html + '</div>';
      var t = view.querySelector('#tbl-am');
      if (t) {
        t.querySelectorAll('th').forEach(function (th) { th.onclick = function () { var k = th.dataset.k, cur = S.sort && S.sort.id === 'tbl-am' ? S.sort : { k: 'dn', dir: -1 }; S.sort = { id: 'tbl-am', k: k, dir: cur.k === k ? -cur.dir : 1 }; B.render(); }; });
        t.querySelectorAll('tbody tr[data-i]').forEach(function (tr) { tr.onclick = function () { var x = tbl.rows[+tr.dataset.i]; S.am = x.k; if (B.syncFilters) B.syncFilters(); S.tab = 'down'; S.level = null; B.render(); }; });
      }
      view.querySelector('#expAm').onclick = function () {
        B.csv('bod-am-scorecard.csv', ['Area manager', 'Outlets', 'Sales', 'LFL sales change', 'LFL tx change', 'Margin', 'LFL margin change', 'PSH', 'PAT', 'PAT change', 'Declining LFL outlets', 'LFL outlets', 'Level 4-5 outlets', 'Negative PAT outlets', 'High alert outlets'],
          tbl.all.map(function (x) { return [x.k, x.n, Math.round(x.g.a.rev), isN(x.g.lRev) ? x.g.lRev.toFixed(4) : '', isN(x.g.lTx) ? x.g.lTx.toFixed(4) : '', isN(x.g.a.margin) ? x.g.a.margin.toFixed(4) : '', isN(x.g.lMargin) ? x.g.lMargin.toFixed(4) : '', isN(x.g.a.psh) ? Math.round(x.g.a.psh) : '', Math.round(x.g.a.pat), hb ? Math.round(x.g.dPat) : '', x.dn, x.lf, x.deep, x.g.negPat, x.hi]; }));
      };
    }
  };

  /* ---------- Winning formula ---------- */
  function pearson(xs, ys) {
    var n = 0, sx = 0, sy = 0, i; for (i = 0; i < xs.length; i++) if (isN(xs[i]) && isN(ys[i])) { n++; sx += xs[i]; sy += ys[i]; }
    if (n < 20) return { r: NaN, n: n }; var mx = sx / n, my = sy / n, a = 0, b = 0, c = 0;
    for (i = 0; i < xs.length; i++) if (isN(xs[i]) && isN(ys[i])) { var dx = xs[i] - mx, dy = ys[i] - my; a += dx * dy; b += dx * dx; c += dy * dy; }
    return { r: b > 0 && c > 0 ? a / Math.sqrt(b * c) : NaN, n: n };
  }
  B.tabs.win = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, days = P.cur.reduce(function (s, t) { return s + U.daysIn(t); }, 0);
      var pool = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive' && r.A.patOM >= Math.min(3, P.cur.length) && isN(r.A.psh) && r.opMonths >= 12; });
      var drivers = [
        ['Sales per day (Rp m)', function (r) { return r.A.rev / days / 1e6; }, function (v) { return F.n(v, 2); }, 'Scale'],
        ['Transactions per day', function (r) { return r.A.tx / days; }, function (v) { return F.n(v, 0); }, 'Traffic'],
        ['Basket size (Rp)', function (r) { return r.A.basket; }, F.n, 'Ticket'],
        ['Margin', function (r) { return r.A.margin; }, function (v) { return F.p(v, 1); }, 'Mix / pricing'],
        ['Focus product share', function (r) { return r.A.focusPct; }, function (v) { return F.p(v, 1); }, 'Mix / pricing'],
        ['Sales through members', function (r) { return r.A.memPct; }, function (v) { return F.p(v, 1); }, 'Loyalty'],
        ['Recruitment rate', function (r) { return r.A.rrPct; }, function (v) { return F.p(v, 1); }, 'Loyalty'],
        ['Staff sales per day (Rp m)', function (r) { return r.A.ssd / 1e6; }, function (v) { return F.n(v, 2); }, 'Productivity'],
        ['Salary % of sales', function (r) { return r.A.salPct; }, function (v) { return F.p(v, 1); }, 'Cost'],
        ['Rental % of sales', function (r) { return r.A.rentPct; }, function (v) { return F.p(v, 1); }, 'Cost'],
        ['Stock loss % of sales', function (r) { return r.A.slPct; }, function (v) { return F.p(v, 2); }, 'Cost']
      ];
      if (pool.length < 20) { view.innerHTML = '<div class="note warn">Not enough mature outlets with PSH and working-hours data in this selection (' + pool.length + ') to compare top and bottom performers. Widen the filters.</div>'; return; }
      var sorted = pool.slice().sort(function (a, b) { return b.A.psh - a.A.psh; }), q = Math.max(5, Math.round(sorted.length / 4));
      var top = sorted.slice(0, q), bot = sorted.slice(-q), mid = sorted.slice(q, sorted.length - q);
      var psh = pool.map(function (r) { return r.A.psh; });
      var rowsT = drivers.map(function (d) {
        var av = function (a) { return U.median(a.map(d[1])); }, t = av(top), b = av(bot), mm = av(mid), cr = pearson(pool.map(d[1]), psh);
        return { name: d[0], f: d[2], grp: d[3], top: t, mid: mm, bot: b, gap: isN(t) && isN(b) && b !== 0 ? t / b - 1 : NaN, r: cr.r, n: cr.n };
      });
      var byR = rowsT.slice().sort(function (a, b) { return Math.abs(b.r || 0) - Math.abs(a.r || 0); });
      var tbl = rowsT.map(function (x) {
        return '<tr style="cursor:default"><td class="l"><b>' + esc(x.name) + '</b><div style="font-size:10px;color:var(--mute)">' + esc(x.grp) + '</div></td><td style="background:#f1f9f5">' + x.f(x.top) + '</td><td>' + x.f(x.mid) + '</td><td style="background:#fdf1f1">' + x.f(x.bot) + '</td><td class="' + (isN(x.gap) ? '' : '') + '">' + (isN(x.gap) ? F.p(x.gap, 0, true) : '\u2013') + '</td><td><div class="bar"><i style="left:50%;width:' + Math.abs((x.r || 0)) * 50 + '%;' + ((x.r || 0) < 0 ? 'transform:translateX(-100%);background:#d9622b' : 'background:#2a9467') + '"></i></div></td><td class="' + F.cls(x.r) + '">' + (isN(x.r) ? (x.r >= 0 ? '+' : '\u2212') + Math.abs(x.r).toFixed(2) : '\u2013') + '</td></tr>';
      }).join('');
      // sales-per-day winners by type
      var byType = {}; pool.forEach(function (r) { (byType[r.ol.type] = byType[r.ol.type] || []).push(r); });
      var typeRows = Object.keys(byType).sort().map(function (k) {
        var a = byType[k], tp = a.slice().sort(function (x, y) { return y.A.psh - x.A.psh; })[0];
        return '<tr style="cursor:default"><td class="l"><b>' + esc(k) + '</b></td><td>' + a.length + '</td><td>' + F.n(U.median(a.map(function (r) { return r.A.psh; }))) + '</td><td>' + F.p(a.filter(function (r) { return r.A.psh > 0; }).length / a.length, 0) + '</td><td class="l">' + esc(tp.ol.name) + ' (' + F.n(tp.A.psh) + ')</td></tr>';
      }).join('');
      var best = top.slice(0, 15);
      var cols = [
        { k: 'rk', label: '#', get: function (r) { return sorted.indexOf(r) + 1; }, fmt: function (r) { return sorted.indexOf(r) + 1; } },
        { k: 'name', label: 'Outlet', left: true, get: function (r) { return r.ol.name; }, fmt: function (r) { return '<div class="nm"><b>' + esc(r.ol.name) + '</b><span>' + esc(r.ol.code) + ' \u00b7 <i class="pill t">' + esc(r.ol.type) + '</i> ' + esc(r.ol.am) + '</span></div>'; } },
        { k: 'ps', label: 'PSH', sub: 'Rp/hr', get: function (r) { return r.A.psh; }, fmt: function (r) { return F.n(r.A.psh); } },
        { k: 'bk', label: 'Basket', get: function (r) { return r.A.basket; }, fmt: function (r) { return F.n(r.A.basket); } },
        { k: 'mg', label: 'Margin', get: function (r) { return r.A.margin; }, fmt: function (r) { return F.p(r.A.margin, 1); } },
        { k: 'fp', label: 'Focus', get: function (r) { return r.A.focusPct; }, fmt: function (r) { return F.p(r.A.focusPct, 1); } },
        { k: 'mb', label: 'Member', get: function (r) { return r.A.memPct; }, fmt: function (r) { return F.p(r.A.memPct, 0); } },
        { k: 'rr', label: 'Recruit', get: function (r) { return r.A.rrPct; }, fmt: function (r) { return F.p(r.A.rrPct, 0); } },
        { k: 'sa', label: 'Salary', sub: '% sales', get: function (r) { return r.A.salPct; }, fmt: function (r) { return F.p(r.A.salPct, 1); } },
        { k: 'g', label: 'Sales change', get: function (r) { return r.gRev; }, fmt: function (r) { return isN(r.gRev) ? F.p(r.gRev, 1, true) : '\u2013'; }, tdc: function (r) { return F.cls(r.gRev); } }
      ];
      var bt = B.table('tbl-best', best, cols, { defSort: 'rk', defDir: 1 });
      view.innerHTML = '<div class="note"><b>Winning formula.</b> Mature outlets (open 12+ months, ' + pool.length + ' in this view) ranked by PSH for ' + esc(P.tag) + '. The top quarter (' + q + ' outlets) is compared with the bottom quarter on the levers management can pull. Medians are used so a single outlier cannot skew a column. ' +
        '<b>Correlation is not causation</b>, and salary, rental and margin move PSH almost by definition (they sit inside PAT), so read those as cost discipline, and the traffic, basket, loyalty and mix rows as the commercial levers.</div>' +
        '<div class="grid g2" style="align-items:start"><div class="tw" style="margin-top:0"><div class="th"><div><h3>Top quarter vs bottom quarter</h3><p>Median per outlet \u00b7 correlation with PSH across all ' + pool.length + ' outlets</p></div></div><div class="tx"><table><thead><tr><th class="l">Driver</th><th class="pt">Top 25%</th><th>Middle</th><th style="background:#8a2f37">Bottom 25%</th><th>Top vs bottom</th><th>Link to PSH</th><th>r</th></tr></thead><tbody>' + tbl + '</tbody></table></div></div>' +
        '<div class="grid" style="gap:12px"><div class="card"><h4>Strongest links to PSH (correlation r)</h4><div class="ch t"><canvas id="wc"></canvas></div><div class="ks">Positive = higher value goes with higher PSH. Across all ' + pool.length + ' mature outlets in the filter.</div></div>' +
        '<div class="tw" style="margin-top:0"><div class="th"><div><h3>By outlet type</h3></div></div><div class="tx"><table><thead><tr><th class="l">Type</th><th>Outlets</th><th>Median PSH</th><th>% positive PSH</th><th class="l">Best performer (PSH)</th></tr></thead><tbody>' + typeRows + '</tbody></table></div></div></div></div>' +
        '<div class="tw"><div class="th"><div><h3>Top 15 outlets by PSH: the playbook to copy</h3><p>Real outlets from MASTER. Click one for its monthly trend.</p></div></div>' + bt.html + '</div>';
      bt.bind(view);
      B.chart('wc', { type: 'bar', data: { labels: byR.map(function (x) { return x.name; }), datasets: [{ label: 'r', data: byR.map(function (x) { return isN(x.r) ? +x.r.toFixed(2) : 0; }), backgroundColor: byR.map(function (x) { return (x.r || 0) >= 0 ? '#2a9467' : '#d9622b'; }) }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: -1, max: 1, ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } } });
    }
  };
})(window);
