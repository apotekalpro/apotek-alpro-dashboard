/* ============================================================================
 * BOD Dashboard - tabs: Overview, Declining stores, Improving stores, New outlets
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN;
  var LVC = { down: { 5: 'var(--l5)', 4: 'var(--l4)', 3: 'var(--l3)', 2: 'var(--l2)', 1: 'var(--l1)' }, up: { 5: 'var(--up5)', 4: 'var(--up4)', 3: 'var(--up3)', 2: 'var(--up2)', 1: 'var(--up1)' } };
  var sum = function (a, f) { return a.reduce(function (s, x) { var v = f(x); return s + (isN(v) ? v : 0); }, 0); };
  var mean = function (a, f) { var v = a.map(f).filter(isN); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : NaN; };
  var median = function (a) { a = a.filter(isN).sort(function (x, y) { return x - y; }); var n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : NaN; };
  var daysIn = function (t) { var o = E.ymOf(t); return new Date(Date.UTC(o.y, o.m + 1, 0)).getUTCDate(); };
  B.util = { sum: sum, mean: mean, median: median, daysIn: daysIn };

  function typeBreakdown(rows) {
    var c = {}; rows.forEach(function (r) { c[r.ol.type] = (c[r.ol.type] || 0) + 1; });
    return Object.keys(c).sort().map(function (k) { return c[k] + ' ' + k.replace('EXPRESS-SM', 'Express-SM').replace(/^ALPRO$/, 'Alpro').replace(/^EXPRESS$/, 'Express'); }).join(' \u00b7 ') || '\u2013';
  }
  function scopeLabel() {
    return (S.level ? 'Level ' + S.level : 'All levels') + ' \u00b7 ' + (S.type ? S.type : 'All outlet types') + (S.am ? ' \u00b7 ' + S.am : '') + (S.prov ? ' \u00b7 ' + S.prov : '') + (S.city ? ' \u00b7 ' + S.city : '') + (S.size ? ' \u00b7 size ' + S.size : '');
  }

  /* ---------- shared outlet table columns ---------- */
  function outletCols(ctx, dir) {
    var P = ctx.P, last = E.monthShort(P.cur[P.cur.length - 1]), rl = ctx.rate === 'tx';
    var chg = function (v) { return isN(v) ? '<span class="chg ' + (v < 0 ? 'neg' : 'pos') + '">' + F.p(v, 2, true) + '</span>' : '\u2013'; };
    return [
      { k: 'level', label: 'Level', left: true, get: function (r) { return r.level; }, fmt: function (r) { return '<span class="lvl" style="--c:' + LVC[dir][r.level] + '">L' + r.level + '</span>'; } },
      { k: 'name', label: 'Outlet', left: true, get: function (r) { return r.ol.name; }, fmt: function (r) { return '<div class="nm"><b>' + esc(r.ol.name) + '</b><span>' + esc(r.ol.code) + ' \u00b7 <i class="pill t">' + esc(r.ol.type) + '</i> ' + esc(r.ol.am) + '</span></div>'; } },
      { k: 'start', label: 'Opened', get: function (r) { return r.ol.start; }, fmt: function (r) { return F.d(r.ol.start); } },
      { k: 'age', label: 'Operating', sub: 'months', get: function (r) { return r.opMonths; }, fmt: function (r) { return F.n(r.opMonths); } },
      { k: 'rb', label: esc(P.baseTag) + ' sales', sub: 'Rp m', get: function (r) { return r.revBase; }, fmt: function (r) { return F.m(r.revBase); } },
      { k: 'rc', label: esc(P.tag) + ' sales', sub: 'Rp m', get: function (r) { return r.revCur; }, fmt: function (r) { return F.m(r.revCur); } },
      { k: 'gRev', label: 'Sales change', get: function (r) { return r.gRev; }, fmt: function (r) { return chg(r.gRev); } },
      { k: 'gTx', label: 'Tx change', get: function (r) { return r.gTx; }, fmt: function (r) { return chg(r.gTx); } },
      { k: 'gBk', label: 'Basket change', get: function (r) { return r.gBasket; }, fmt: function (r) { return isN(r.gBasket) ? '<span class="' + F.cls(r.gBasket) + '">' + F.p(r.gBasket, 1, true) + '</span>' : '\u2013'; }, tdc: function (r) { return F.cls(r.gBasket); } },
      { k: 'dM', label: 'Margin', sub: 'change', get: function (r) { return r.dMargin; }, fmt: function (r) { return F.pp(r.dMargin); }, tdc: function (r) { return F.cls(r.dMargin); } },
      { k: 'pb', label: esc(P.baseTag) + ' PSH', sub: 'Rp/hr', get: function (r) { return r.B.psh; }, fmt: function (r) { return F.n(r.B.psh); }, tdc: function (r) { return F.cls(r.B.psh); } },
      { k: 'pc', label: esc(P.tag) + ' PSH', sub: 'Rp/hr', get: function (r) { return r.A.psh; }, fmt: function (r) { return F.n(r.A.psh); }, tdc: function (r) { return F.cls(r.A.psh); } },
      { k: 'pl', label: last + ' PSH', sub: 'Rp/hr', get: function (r) { return r.pshLast; }, fmt: function (r) { return F.n(r.pshLast); }, tdc: function (r) { return F.cls(r.pshLast); } },
      { k: 'tb', th: 'pt', cls: 'pt', label: esc(P.baseTag) + ' PAT', sub: 'Rp k', get: function (r) { return r.patBase; }, fmt: function (r) { return isN(r.patBase) && r.B.patOM ? F.n(r.patBase / 1e3) : '\u2013'; }, tdc: function (r) { return F.cls(r.patBase); } },
      { k: 'tc', th: 'pt', cls: 'pt', label: esc(P.tag) + ' PAT', sub: 'Rp k', get: function (r) { return r.patCur; }, fmt: function (r) { return r.A.patOM ? F.n(r.patCur / 1e3) : '\u2013'; }, tdc: function (r) { return F.cls(r.patCur); } },
      { k: 'tl', th: 'pt', cls: 'pt', label: last + ' PAT', sub: 'Rp k', get: function (r) { return r.patLast; }, fmt: function (r) { return r.last.patOM ? F.n(r.patLast / 1e3) : '\u2013'; }, tdc: function (r) { return F.cls(r.patLast); } }
    ];
  }

  function cohortView(dir) {
    return {
      render: function (ctx, view) {
        var all = dir === 'down' ? ctx.down : ctx.up, P = ctx.P;
        if (!P.baseAvailable) { view.innerHTML = '<div class="note warn">Level analysis needs a full prior-year comparison. Pick a period whose prior-year months are in the workbook (from ' + E.monthLabel(ctx.m.baseMin + 12) + ' onwards) to see ' + (dir === 'down' ? 'declining' : 'improving') + ' stores.</div>'; return; }
        var rows = S.level ? all.filter(function (r) { return r.level === S.level; }) : all;
        var nm = dir === 'down' ? 'decline' : 'growth', rl = ctx.rate === 'tx' ? 'transaction' : 'sales';
        var banner = '<div class="note"><b>' + (dir === 'down' ? 'Declining stores' : 'Improving stores') + '.</b> Like-for-like outlets that traded in every month of ' + esc(P.tag) + ' and ' + esc(P.baseTag) + ', ranked into five levels by <b>' + rl + '</b> ' + nm +
          '. ' + ctx.neu.length + ' new outlet(s) (opened within ' + E.NEW_MONTHS + ' months)' + (ctx.nc.length ? ' and ' + ctx.nc.length + ' older outlet(s) without a full prior-year base' : '') + ' are not in the levels; see <i>New outlets</i>. Click an outlet for its monthly detail.</div>';
        var cards = B.levelCards(ctx, dir);
        var rc = sum(rows, function (r) { return r.revCur; }), rb = sum(rows, function (r) { return r.revBase; }), dRev = rc - rb;
        var avg = mean(rows, function (r) { return r.rate; });
        var patC = sum(rows, function (r) { return r.A.patOM ? r.patCur : 0; }), patB = sum(rows, function (r) { return r.B.patOM ? r.patBase : 0; });
        var neg = rows.filter(function (r) { return r.A.patOM && r.patCur < 0; }).length;
        var covC = sum(rows, function (r) { return r.A.patOM; }), expC = sum(rows, function (r) { return r.nMonths; });
        var covB = sum(rows, function (r) { return r.B.patOM; });
        var sumry = '<div class="sec" style="margin-top:14px"><h3>' + esc(scopeLabel()) + '</h3></div><div class="grid g4">' +
          B.card('Selected outlets', rows.length, typeBreakdown(rows)) +
          B.card(esc(P.tag) + ' sales', '<small>Rp</small> ' + (rc / 1e9).toFixed(2) + '<small>b</small>', esc(P.baseTag) + ': Rp ' + (rb / 1e9).toFixed(2) + 'b') +
          B.card('Average outlet ' + nm, F.p(avg, 2, dir === 'up'), 'Simple mean of outlet ' + rl + ' growth rates', dir === 'down' ? 'neg' : 'pos') +
          B.card('Sales ' + (dir === 'down' ? 'reduction' : 'increase'), '<small>Rp</small> ' + (Math.abs(dRev) / 1e9).toFixed(2) + '<small>b</small>', 'Total sales change: ' + F.p(rb > 0 ? rc / rb - 1 : NaN, 2, true), dir === 'down' ? 'neg' : 'pos') + '</div>' +
          '<div class="pat"><div><h4>' + esc(P.baseTag) + ' PAT</h4><div class="kv ' + (patB < 0 ? 'neg' : '') + '">' + F.rp(patB) + '</div><div class="ks">' + covB + ' outlet-months with PSH and hours</div></div>' +
          '<div><h4>' + esc(P.tag) + ' PAT</h4><div class="kv ' + (patC < 0 ? 'neg' : '') + '">' + F.rp(patC) + '</div><div class="ks">' + covC + ' / ' + expC + ' outlet-months</div></div>' +
          '<div><h4>' + esc(P.tag) + ' outlets with negative PAT</h4><div class="kv ' + (neg ? 'neg' : '') + '">' + neg + '</div><div class="ks">Of ' + rows.length + ' selected outlets</div></div>' +
          '<p>PAT = reported PSH &times; working hours for each outlet-month, summed over the period. Outlet-months without PSH or hours are left out, not guessed.</p></div>';
        var cols = outletCols(ctx, dir);
        var tbl = B.table('tbl-' + dir, rows, cols, { defSort: 'gRev', defDir: dir === 'down' ? 1 : -1 });
        var tw = '<div class="tw"><div class="th"><div><h3>Outlet sales, operating age, PSH &amp; PAT</h3><p>Level ' + (S.level || '5 to 1') + ' in the same table. Scroll right for PAT. Select an outlet for monthly details.</p></div>' +
          '<div style="display:flex;gap:10px;align-items:center">' + (neg ? '<span class="pill" style="background:#fde8e8;color:var(--neg);padding:5px 10px">' + neg + ' with negative ' + esc(P.tag) + ' PAT</span>' : '') + B.searchBox() + '<button class="btn" id="exp"><i class="fas fa-download"></i> Export table</button></div></div>' + tbl.html + '</div>';
        view.innerHTML = banner + cards + sumry + tw;
        B.bindLevels(view); tbl.bind(view); B.bindSearch(view);
        view.querySelector('#exp').onclick = function () {
          B.csv('bod-' + dir + '-outlets-' + P.tag.replace(/\s+/g, '_') + '.csv',
            ['Level', 'Code', 'Outlet', 'Type', 'AM', 'Opened', 'Operating months', P.baseTag + ' sales', P.tag + ' sales', 'Sales change', 'Tx change', 'Basket change', 'Margin change pp', P.baseTag + ' PSH', P.tag + ' PSH', 'Latest PSH', P.baseTag + ' PAT', P.tag + ' PAT', 'Latest PAT'],
            tbl.all.map(function (r) { return [r.level, r.ol.code, r.ol.name, r.ol.type, r.ol.am, r.ol.start ? new Date(r.ol.start).toISOString().slice(0, 10) : '', r.opMonths, Math.round(r.revBase), Math.round(r.revCur), r.gRev.toFixed(4), isN(r.gTx) ? r.gTx.toFixed(4) : '', isN(r.gBasket) ? r.gBasket.toFixed(4) : '', isN(r.dMargin) ? (r.dMargin * 100).toFixed(2) : '', isN(r.B.psh) ? Math.round(r.B.psh) : '', isN(r.A.psh) ? Math.round(r.A.psh) : '', isN(r.pshLast) ? Math.round(r.pshLast) : '', Math.round(r.patBase), Math.round(r.patCur), Math.round(r.patLast)]; }));
        };
      }
    };
  }

  /* ---------- New outlets ---------- */
  // Median revenue by month-since-first-sale among outlets that opened inside the data window
  B.ramp = function (m) {
    var by = {}, first = m.baseMin + 1;
    m.outlets.forEach(function (ol, o) {
      if (ol.firstRev < first) return;           // already trading when the data starts: not a ramp-up observation
      if (ol.startIdx >= 0 && ol.startIdx < m.baseMin - 1) return;   // recorded opening date is long before: reopened / data gap, not a new store
      for (var a = 1; a <= 24; a++) {
        var t = ol.firstRev + a - 1; if (t > m.latest) break;
        var v = E.get(m, 'rev', o, t); if (v > 0 && a > 1) (by[a] = by[a] || []).push(v);   // age 1 is a part-month, skip
      }
    });
    var med = {}, cnt = {}; Object.keys(by).forEach(function (a) { med[a] = median(by[a].slice()); cnt[a] = by[a].length; });
    return { med: med, cnt: cnt };
  };

  B.tabs['new'] = {
    render: function (ctx, view) {
      var P = ctx.P, m = ctx.m, rows = ctx.neu, endT = P.cur[P.cur.length - 1];
      var bench = median(ctx.lfl.map(function (r) { return r.last.rev / daysIn(endT); }));
      var rampo = B.ramp(m);
      rows.forEach(function (r) {
        r.rpd = r.last.rev > 0 ? r.last.rev / daysIn(endT) : NaN; r.vsBench = isN(bench) && isN(r.rpd) ? r.rpd / bench : NaN;
        r.ageSale = r.ol.firstRev >= 0 ? endT - r.ol.firstRev + 1 : NaN;   // months since first sale (ramp curve basis)
        var md = rampo.med[r.ageSale]; r.vsRamp = isN(md) && r.last.rev > 0 ? r.last.rev / md : NaN;
      });
      var young = rows;
      var banner = '<div class="note"><b>New outlets.</b> An outlet is <b>new while it is within ' + E.NEW_MONTHS + ' months of opening</b> (opening month = month 1, counted to ' + E.monthLabel(endT) + '). New outlets are kept out of the decline and improvement levels and judged on ramp-up instead. Older outlets that still lack a full prior-year base are listed separately below. Benchmark = median daily sales of like-for-like outlets in ' + E.monthLabel(endT) + ': <b>' + F.rp(bench) + '</b> per outlet per day.</div>';
      var cards = '<div class="grid g4">' +
        B.card('New outlets (\u2264 ' + E.NEW_MONTHS + ' months)', rows.length, typeBreakdown(rows) + (ctx.nc.length ? '<br>+ ' + ctx.nc.length + ' older, not yet comparable' : '')) +
        B.card(esc(P.tag) + ' sales', '<small>Rp</small> ' + (sum(rows, function (r) { return r.revCur; }) / 1e9).toFixed(2) + '<small>b</small>', E.monthLabel(endT) + ': Rp ' + (sum(rows, function (r) { return r.last.rev; }) / 1e9).toFixed(2) + 'b') +
        B.card('Median daily sales, new outlets', F.rp(median(young.map(function (r) { return r.rpd; }))), (isN(bench) ? F.p(median(young.map(function (r) { return r.rpd; })) / bench, 0) + ' of mature benchmark' : ''), '') +
        B.card('Negative PAT in ' + E.monthShort(endT), rows.filter(function (r) { return r.last.patOM && r.patLast < 0; }).length, 'Of ' + rows.filter(function (r) { return r.last.patOM; }).length + ' with PSH reported') + '</div>';
      var flags = function (r) { return isN(r.vsRamp) && r.vsRamp < 0.5 ? '<span class="fl h">Slow ramp</span>' : isN(r.vsRamp) && r.vsRamp >= 1.2 ? '<span class="fl i">Fast ramp</span>' : ''; };
      var cols = [
        { k: 'name', label: 'Outlet', left: true, get: function (r) { return r.ol.name; }, fmt: function (r) { return '<div class="nm"><b>' + esc(r.ol.name) + '</b><span>' + esc(r.ol.code) + ' \u00b7 <i class="pill t">' + esc(r.ol.type) + '</i> ' + esc(r.ol.am) + '</span></div>'; } },
        { k: 'start', label: 'Opened', get: function (r) { return r.ol.start; }, fmt: function (r) { return F.d(r.ol.start); } },
        { k: 'age', label: 'Age', sub: 'months since opening', get: function (r) { return r.age; }, fmt: function (r) { return F.n(r.age); } },
        { k: 'mt', label: 'Months trading', sub: 'in period', get: function (r) { return r.nCur; }, fmt: function (r) { return r.nCur + ' / ' + r.nMonths; } },
        { k: 'rc', label: esc(P.tag) + ' sales', sub: 'Rp m', get: function (r) { return r.revCur; }, fmt: function (r) { return F.m(r.revCur); } },
        { k: 'rl', label: E.monthShort(endT) + ' sales', sub: 'Rp m', get: function (r) { return r.last.rev; }, fmt: function (r) { return F.m(r.last.rev); } },
        { k: 'rpd', label: 'Sales / day', sub: 'Rp m', get: function (r) { return r.rpd; }, fmt: function (r) { return F.m(r.rpd, 2); } },
        { k: 'vb', label: 'vs mature', sub: 'benchmark', get: function (r) { return r.vsBench; }, fmt: function (r) { return F.p(r.vsBench, 0); } },
        { k: 'vr', label: 'vs ramp curve', sub: 'same age', get: function (r) { return r.vsRamp; }, fmt: function (r) { return F.p(r.vsRamp, 0); } },
        { k: 'mg', label: 'Margin', get: function (r) { return r.last.margin; }, fmt: function (r) { return F.p(r.last.margin, 1); } },
        { k: 'pl', label: E.monthShort(endT) + ' PSH', sub: 'Rp/hr', get: function (r) { return r.pshLast; }, fmt: function (r) { return F.n(r.pshLast); }, tdc: function (r) { return F.cls(r.pshLast); } },
        { k: 'tc', th: 'pt', cls: 'pt', label: esc(P.tag) + ' PAT', sub: 'Rp k', get: function (r) { return r.patCur; }, fmt: function (r) { return r.A.patOM ? F.n(r.patCur / 1e3) : '\u2013'; }, tdc: function (r) { return F.cls(r.patCur); } },
        { k: 'tl', th: 'pt', cls: 'pt', label: E.monthShort(endT) + ' PAT', sub: 'Rp k', get: function (r) { return r.patLast; }, fmt: function (r) { return r.last.patOM ? F.n(r.patLast / 1e3) : '\u2013'; }, tdc: function (r) { return F.cls(r.patLast); } },
        { k: 'fl', label: 'Signal', left: true, get: function (r) { return r.vsRamp; }, fmt: flags },
        { k: 'why', label: 'Why new', left: true, get: function (r) { return r.reason; }, fmt: function (r) { return '<span style="color:var(--mute);font-size:10.5px">' + esc(r.reason) + '</span>'; } }
      ];
      var tbl = B.table('tbl-new', rows, cols, { defSort: 'start', defDir: -1 });
      var ncRows = ctx.nc;
      var ncCols = [
        cols[0],
        { k: 'start', label: 'Opened', get: function (r) { return r.ol.start; }, fmt: function (r) { return F.d(r.ol.start); } },
        { k: 'age', label: 'Age', sub: 'months since opening', get: function (r) { return r.age; }, fmt: function (r) { return F.n(r.age); } },
        { k: 'mt', label: 'Months trading', sub: 'in period', get: function (r) { return r.nCur; }, fmt: function (r) { return r.nCur + ' / ' + r.nMonths; } },
        { k: 'rc', label: esc(P.tag) + ' sales', sub: 'Rp m', get: function (r) { return r.revCur; }, fmt: function (r) { return F.m(r.revCur); } },
        { k: 'rl', label: E.monthShort(endT) + ' sales', sub: 'Rp m', get: function (r) { return r.last.rev; }, fmt: function (r) { return F.m(r.last.rev); } },
        { k: 'pl', label: E.monthShort(endT) + ' PSH', sub: 'Rp/hr', get: function (r) { return r.pshLast; }, fmt: function (r) { return F.n(r.pshLast); }, tdc: function (r) { return F.cls(r.pshLast); } },
        { k: 'why', label: 'Why not comparable', left: true, get: function (r) { return r.reason; }, fmt: function (r) { return '<span style="color:var(--mute);font-size:10.5px">' + esc(r.reason) + '</span>'; } }
      ];
      var tblNc = ncRows.length ? B.table('tbl-nc', ncRows, ncCols, { defSort: 'start', defDir: -1 }) : null;
      view.innerHTML = banner + cards +
        '<div class="grid g2" style="margin-top:12px"><div class="card"><h4>Ramp-up curve: median monthly sales by months since opening (Rp m)</h4><div class="ch"><canvas id="rampC"></canvas></div><div class="ks">Real outlets that opened inside the workbook window (first part-month skipped). Bars show how many outlets feed each point.</div></div>' +
        '<div class="card"><h4>Daily sales vs mature benchmark, new outlets</h4><div class="ch" style="height:420px"><canvas id="newC"></canvas></div></div></div>' +
        '<div class="tw"><div class="th"><div><h3>New outlets</h3><p>Slow ramp = latest-month sales below half the median of outlets at the same age.</p></div><div style="display:flex;gap:10px">' + B.searchBox() + '<button class="btn" id="exp"><i class="fas fa-download"></i> Export table</button></div></div>' + tbl.html + '</div>' +
        (tblNc ? '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Older outlets, not yet comparable (' + ncRows.length + ')</h3><p>Opened more than ' + E.NEW_MONTHS + ' months ago but missing sales in some comparison months, so they are left out of the decline and improvement levels.</p></div></div>' + tblNc.html + '</div>' : '');
      tbl.bind(view); if (tblNc) tblNc.bind(view); B.bindSearch(view);
      view.querySelector('#exp').onclick = function () {
        B.csv('bod-new-outlets.csv', ['Code', 'Outlet', 'Type', 'AM', 'Opened', 'Age months', 'Months trading', 'Sales in period', 'Latest month sales', 'Sales per day', 'vs benchmark', 'vs ramp', 'Latest PSH', 'PAT in period', 'Latest PAT', 'Reason'],
          tbl.all.map(function (r) { return [r.ol.code, r.ol.name, r.ol.type, r.ol.am, r.ol.start ? new Date(r.ol.start).toISOString().slice(0, 10) : '', r.age, r.nCur + '/' + r.nMonths, Math.round(r.revCur), Math.round(r.last.rev), isN(r.rpd) ? Math.round(r.rpd) : '', isN(r.vsBench) ? r.vsBench.toFixed(3) : '', isN(r.vsRamp) ? r.vsRamp.toFixed(3) : '', isN(r.pshLast) ? Math.round(r.pshLast) : '', Math.round(r.patCur), Math.round(r.patLast), r.reason]; }));
      };
      var ages = []; for (var a = 2; a <= 24; a++) if (rampo.med[a] != null) ages.push(a);
      B.chart('rampC', { data: { labels: ages.map(function (a) { return 'M' + a; }), datasets: [
        { type: 'line', label: 'Median sales (Rp m)', data: ages.map(function (a) { return rampo.med[a] / 1e6; }), borderColor: '#16436f', backgroundColor: '#16436f', tension: .25, yAxisID: 'y', pointRadius: 3 },
        { type: 'bar', label: 'Outlets', data: ages.map(function (a) { return rampo.cnt[a]; }), backgroundColor: '#d5e0ee', yAxisID: 'y1' }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { y: { position: 'left', beginAtZero: true, ticks: { font: { size: 9 } } }, y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 9 }, precision: 0 } }, x: { ticks: { font: { size: 9 } } } } } });
      var yy = young.filter(function (r) { return isN(r.rpd); }).sort(function (x, y) { return y.rpd - x.rpd; }).slice(0, 25);
      B.chart('newC', { type: 'bar', data: { labels: yy.map(function (r) { return r.ol.name.slice(0, 20); }), datasets: [{ label: 'Rp m per day', data: yy.map(function (r) { return r.rpd / 1e6; }), backgroundColor: yy.map(function (r) { return isN(bench) && r.rpd >= bench ? '#0f7a55' : '#c9951c'; }) }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { afterLabel: function (c) { var r = yy[c.dataIndex]; return F.p(r.vsBench, 0) + ' of benchmark \u00b7 age ' + r.age + ' months'; } } } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 9 } } }, y: { ticks: { autoSkip: false, font: { size: 8.5 } } } } } });
    }
  };

  B.tabs.down = cohortView('down');
  B.tabs.up = cohortView('up');

  /* ---------- Overview ---------- */
  var EXEC_FMT = {
    'Total Active Outlet': 'n', 'MTM Growth (Include Days)': 'p', 'MTM Growth (Exclude Days)': 'p', 'Revenue': 'm', 'Revenue/outlet/day': 'n', 'Margin': 'p', 'Transaction': 'n', 'Profit': 'm',
    'Total Focus Product': 'm', 'New Member': 'n', 'PSH': 'n', 'OUTLET WITH +VE PSH': 'n', 'EVIP': 'n', 'QTY SKU PER TX': 'd', 'Purchasing Power': 'n', 'New Member Return Rate %': 'p'
  };
  function execCell(label, v) {
    if (!isN(v)) return '\u2013'; var k = EXEC_FMT[label] || 'n';
    if (k === 'p') return F.p(v, 2); if (k === 'm') return F.m(v, 1); if (k === 'd') return v.toFixed(2); return F.n(v);
  }

  B.tabs.overview = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, ex = B.exec, rows = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; });
      var gs = E.groupStats(m, P, ctx.rowsF), endT = P.cur[P.cur.length - 1];
      var all = rows.map(function (r) { return r.o; }), mo = E.monthly(m, all), cur = mo[mo.length - 1];
      for (var i = mo.length - 1; i >= 0; i--) if (mo[i].t === endT) { cur = mo[i]; break; }
      var hasBase = P.baseAvailable;
      // Company PSH: the sheet's own company figure when no outlet filter is applied (owner instruction);
      // otherwise rebuilt as PAT / hours from the filtered outlets.
      var coPsh = { m: cur.psh, p: gs.a.psh, pos: cur.posPsh, n: cur.nPsh, src: 'rebuilt' };
      if (!B.isFiltered()) {
        var sm = E.execAt(ex, 'PSH', endT), sp = E.companyPsh(m, ex, P.cur), sv = E.execAt(ex, 'OUTLET WITH +VE PSH', endT);
        if (isN(sm)) { coPsh.m = sm; coPsh.src = 'sheet'; if (isN(sv)) coPsh.pos = sv; }
        if (sp.src === 'sheet') coPsh.p = sp.v;
      }
      var gl = function (v) { return hasBase ? F.p(v, 1, true) : 'n/a'; };
      var cards = '<div class="grid g6" style="margin-bottom:12px">' +
        B.card('Sales \u00b7 ' + esc(P.tag), F.rp(gs.a.rev), hasBase ? 'vs ' + F.rp(gs.b.rev) + '<br>Like-for-like <b class="' + F.cls(gs.lRev) + '">' + gl(gs.lRev) + '</b>' : 'Prior-year base not in workbook') +
        B.card('Transactions', F.n(gs.a.tx), hasBase ? 'vs ' + F.n(gs.b.tx) + '<br>Like-for-like <b class="' + F.cls(gs.lTx) + '">' + gl(gs.lTx) + '</b>' : '') +
        B.card('Gross profit \u00b7 margin', F.rp(gs.a.pro), 'Margin ' + F.p(gs.a.margin, 2) + (hasBase ? '<br>LFL change <b class="' + F.cls(gs.lMargin) + '">' + F.pp(gs.lMargin) + '</b>' : '')) +
        B.card('PAT (PSH \u00d7 hours)', F.rp(gs.a.pat), hasBase ? 'vs ' + F.rp(gs.b.pat) + '<br>Change ' + F.rp(gs.dPat) : '', gs.a.pat < 0 ? 'neg' : 'pos') +
        B.card('PSH \u00b7 ' + E.monthShort(endT), F.n(coPsh.m), 'Period PSH ' + F.n(coPsh.p) + ' Rp/hr' + (coPsh.src === 'sheet' ? ' <span title=\"Company PSH as published on the Exec Dashboard\">(sheet)</span>' : '') + '<br>' + coPsh.pos + ' of ' + coPsh.n + ' outlets positive', coPsh.m < 0 ? 'neg' : 'pos') +
        B.card('Trading outlets', gs.n, ctx.down.length + ' declining \u00b7 ' + ctx.up.length + ' improving<br>' + ctx.neu.length + ' new \u00b7 ' + ctx.nc.length + ' not yet comparable') + '</div>';
      var cards2 = '<div class="grid g6" style="margin-bottom:12px">' +
        B.card('Basket \u00b7 ' + E.monthShort(endT), F.n(cur.basket) + ' <small>Rp</small>', 'Sales \u00f7 transactions') +
        B.card('Focus product', F.p(cur.focus, 1), 'Share of sales \u00b7 ' + E.monthShort(endT)) +
        B.card('Sales by members', F.p(cur.mem, 1), 'Share of transactions') +
        B.card('Recruitment rate', F.p(cur.rr, 1), 'New members \u00f7 walk-ins without membership') +
        B.card('New members', F.n(cur.nm), E.monthShort(endT) + (cur.evip ? ' \u00b7 EVIP ' + F.n(cur.evip) : '')) +
        B.card('Salary \u00b7 stock loss', F.p(cur.sal, 1) + ' \u00b7 ' + F.p(cur.sl, 1), 'Share of sales \u00b7 ' + E.monthShort(endT)) + '</div>';
      // alerts strip (computed in insights module)
      var al = B.computeFlags ? B.computeFlags(ctx) : null, alHtml = '';
      if (al) {
        var top = al.defs.filter(function (d) { return al.counts[d.id] > 0 && d.sev !== 'i'; }).sort(function (a, b) { return (b.sev === 'h') - (a.sev === 'h') || al.counts[b.id] - al.counts[a.id]; }).slice(0, 4);
        alHtml = '<div class="sec"><h3>Needs intervention<small>' + al.high + ' outlets with a high-severity flag</small></h3><a id="toWatch">Open watchlist \u2192</a></div><div class="grid g4" style="margin-bottom:14px">' +
          top.map(function (d) { return '<div class="tile" data-flag="' + d.id + '" style="--c:' + (d.sev === 'h' ? 'var(--l5)' : 'var(--l3)') + '"><div class="n">' + al.counts[d.id] + '</div><div class="t">' + esc(d.label) + '</div><div class="d">' + esc(d.desc) + '</div></div>'; }).join('') + '</div>';
      }
      // exec table
      var months = ex.months, last12 = Math.max(0, months.length - 14);
      var th = '<tr><th class="l" style="position:sticky;left:0;z-index:3">Company performance</th>' + months.slice(last12).map(function (t) { return '<th>' + E.monthShort(t) + '</th>'; }).join('') + '</tr>';
      var tb = ex.order.map(function (lab) {
        var v = ex.rows[lab].slice(last12);
        return '<tr style="cursor:default"><td class="l" style="position:sticky;left:0;background:#fff;font-weight:600;z-index:1">' + esc(lab) + '</td>' + v.map(function (x, j) {
          var cls = (/MTM|Margin|Return/.test(lab) ? '' : '') + (lab === 'PSH' ? F.cls(x) : (/MTM/.test(lab) ? F.cls(x) : ''));
          return '<td class="' + cls + '">' + execCell(lab, x) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      view.innerHTML = '<div class="note"><b>Executive overview.</b> Period cards are rebuilt from MASTER for the ' + gs.n + ' outlets trading in the selection (closed outlets and ECOM are not in MASTER, so company totals can differ from the Exec Dashboard below, mostly in older months; see Data notes for the month-by-month check). Use the filters above to move between full period, half-year, quarter, running 12 months or a single month.</div>' +
        cards + cards2 + alHtml +
        '<div class="grid g2"><div class="card"><h4>Company sales (Rp b) and margin %</h4><div class="ch t"><canvas id="o1"></canvas></div></div><div class="card"><h4>PSH (Rp per staff hour) and outlets with positive PSH</h4><div class="ch t"><canvas id="o2"></canvas></div></div></div>' +
        '<div class="grid g2" style="margin-top:12px"><div class="card"><h4>Transactions and new members</h4><div class="ch t"><canvas id="o3"></canvas></div></div><div class="card"><h4>Outlets by level, ' + esc(P.tag) + ' vs ' + esc(P.baseTag) + '</h4><div class="ch t"><canvas id="o4"></canvas></div></div></div>' +
        '<div class="tw"><div class="th"><div><h3>Exec Dashboard</h3><p>Company performance as published in the workbook (rows 9\u201325), last ' + (months.length - last12) + ' months. Amounts: sales, profit and focus product in Rp m.</p></div>' +
        '<button class="btn" id="expEx"><i class="fas fa-download"></i> Export full series</button></div><div class="tx"><table id="execT"><thead>' + th + '</thead><tbody>' + tb + '</tbody></table></div></div>';
      view.querySelectorAll('[data-flag]').forEach(function (el) { el.onclick = function () { S.flag = el.dataset.flag; S.tab = 'watch'; B.render(); }; });
      var tw = view.querySelector('#toWatch'); if (tw) tw.onclick = function () { S.flag = null; S.tab = 'watch'; B.render(); };
      view.querySelector('#expEx').onclick = function () {
        B.csv('bod-exec-dashboard.csv', ['Metric'].concat(months.map(E.monthLabel)), ex.order.map(function (l) { return [l].concat(ex.rows[l].map(function (x) { return x == null ? '' : x; })); }));
      };
      var lab = months.map(E.monthShort), R = ex.rows;
      var tick = { ticks: { font: { size: 9 } } }, leg = { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } };
      B.chart('o1', { data: { labels: lab, datasets: [
        { type: 'bar', label: 'Sales (Rp b)', data: R['Revenue'].map(function (x) { return isN(x) ? x / 1e9 : null; }), backgroundColor: '#9db8d9', yAxisID: 'y' },
        { type: 'line', label: 'Margin %', data: R['Margin'].map(function (x) { return isN(x) ? x * 100 : null; }), borderColor: '#0f7a55', backgroundColor: '#0f7a55', tension: .25, yAxisID: 'y1', pointRadius: 2 }] },
        options: { plugins: leg, scales: { x: tick, y: { position: 'left', ticks: tick.ticks }, y1: { position: 'right', min: 20, grid: { drawOnChartArea: false }, ticks: tick.ticks } } } });
      B.chart('o2', { data: { labels: lab, datasets: [
        { type: 'bar', label: 'Outlets with +ve PSH', data: R['OUTLET WITH +VE PSH'], backgroundColor: '#cfe5d8', yAxisID: 'y1' },
        { type: 'line', label: 'PSH (Rp/hr)', data: R['PSH'], borderColor: '#b5303b', backgroundColor: '#b5303b', tension: .25, yAxisID: 'y', pointRadius: 2 }] },
        options: { plugins: leg, scales: { x: tick, y: { position: 'left', ticks: tick.ticks }, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: tick.ticks } } } });
      B.chart('o3', { data: { labels: lab, datasets: [
        { type: 'line', label: 'Transactions', data: R['Transaction'], borderColor: '#16436f', backgroundColor: '#16436f', tension: .25, yAxisID: 'y', pointRadius: 2 },
        { type: 'bar', label: 'New members', data: R['New Member'], backgroundColor: '#e6d3a3', yAxisID: 'y1' }] },
        options: { plugins: leg, scales: { x: tick, y: { position: 'left', ticks: tick.ticks }, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: tick.ticks } } } });
      var lvl = function (list, L) { return list.filter(function (r) { return r.level === L; }).length; };
      B.chart('o4', { type: 'bar', data: { labels: ['Declining L5', 'L4', 'L3', 'L2', 'L1', 'Improving L1', 'L2', 'L3', 'L4', 'L5'], datasets: [{ label: 'Outlets',
        data: [5, 4, 3, 2, 1].map(function (L) { return lvl(ctx.down, L); }).concat([1, 2, 3, 4, 5].map(function (L) { return lvl(ctx.up, L); })),
        backgroundColor: ['#b5303b', '#d9622b', '#c9951c', '#6f7db0', '#2f7f9a', '#9bb15a', '#80a95a', '#5aa05a', '#2a9467', '#0f7a55'] }] },
        options: { plugins: { legend: { display: false } }, scales: { x: tick, y: { ticks: { font: { size: 9 }, precision: 0 } } } } });
    }
  };
})(window);
