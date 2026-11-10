/* ============================================================================
 * BOD Dashboard - outlet detail drawer
 * Opens from any outlet row. Has its own period filter (starts from the dashboard selection) and shows the outlet's
 * sales, estimated PAT, weighted PSH and every other parameter used in the dashboard, current vs prior-year period,
 * a measure-selectable monthly trend, outlet economics and a comparison with peers (same outlet type, same maturity).
 * PAT = PSH x working hours per outlet-month. Period PSH = PAT / working hours. Targets are not used.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  var $ = function (id) { return document.getElementById(id); };
  var D = null, MIN_PEERS = 8;
  B.drCharts = [];

  function killCharts() { B.drCharts.forEach(function (c) { try { c.destroy(); } catch (e) { /* noop */ } }); B.drCharts = []; }
  function mk(id, cfg) {
    var el = $(id); if (!el || !win.Chart) return;
    cfg.options = cfg.options || {}; cfg.options.maintainAspectRatio = false; cfg.options.responsive = true;
    B.drCharts.push(new win.Chart(el.getContext('2d'), cfg));
  }
  function close() { killCharts(); $('drawerHost').innerHTML = ''; D = null; }

  /* ---------- helpers ---------- */
  function val(m, key, o, t) { return t < m.min || t > m.max ? NaN : E.get(m, key, o, t); }
  function obs(m, key, o, months) { var s = 0, n = 0; months.forEach(function (t) { var v = val(m, key, o, t); if (v === v) { s += v; n++; } }); return { s: s, n: n }; }
  function cover(m, key, o, months) { return obs(m, key, o, months).n; }
  function sgn(v, f) { return isN(v) ? (v > 0 ? '+' : v < 0 ? '\u2212' : '') + f(Math.abs(v)) : '\u2013'; }
  function avgDays(P) { var d = 0; P.cur.forEach(function (t) { d += U.daysIn(t); }); return d / Math.max(1, P.cur.length); }
  function sizeOf(ol) { var v = parseFloat(String(ol.size || '').replace(/[^0-9.,]/g, '').replace(',', '.')); return v > 0 ? v : NaN; }
  function lastSalesT(m, o) { for (var t = m.latest; t >= m.min; t--) if (val(m, 'rev', o, t) > 0) return t; return -1; }
  function statusOf(r) {
    if (!r) return '';
    if (r.cat === 'lfl') return (r.dir === 'down' ? 'Declining' : 'Improving') + ' \u00b7 level ' + r.level;
    return r.cat === 'new' ? 'New outlet \u00b7 month ' + r.age : r.cat === 'nc' ? 'Not yet comparable' : 'No sales in period';
  }

  /* ---------- measures for the trend chart ---------- */
  function MS(m, o) {
    var pct = function (k) { return function (x) { return isN(x[k]) ? x[k] * 100 : null; }; };
    var amt = function (k) { return function (x) { return isN(x[k]) ? x[k] / 1e6 : null; }; };
    var num = function (k) { return function (x) { return isN(x[k]) ? x[k] : null; }; };
    return [
      ['rev', 'Revenue (Rp m)', amt('rev')], ['tx', 'Transactions', num('tx')], ['basket', 'Basket size (Rp)', num('basket')],
      ['margin', 'Margin %', pct('margin')], ['pro', 'Profit (Rp m)', amt('pro')],
      ['psh', 'PSH (Rp/hr)', function (x) { return val(m, 'psh', o, x.t) === val(m, 'psh', o, x.t) && isN(x.psh) ? x.psh : null; }],
      ['pat', 'PAT (Rp m)', function (x) { return isN(val(m, 'psh', o, x.t)) && isN(x.pat) ? x.pat / 1e6 : null; }],
      ['wh', 'Working hours', function (x) { var v = val(m, 'wh', o, x.t); return isN(v) ? v : null; }],
      ['ssd', 'Avg staff sales/day (Rp m)', amt('ssd')],
      ['focus', 'Focus product %', pct('focus')], ['mem', 'Sales through members %', pct('mem')], ['rr', 'Recruitment rate %', pct('rr')], ['nm', 'New members', num('nm')],
      ['sal', 'Salary % of sales', pct('sal')], ['rent', 'Rent % of sales', pct('rent')], ['util', 'Utilities % of sales', pct('util')], ['sl', 'Stock loss % of sales', pct('sl')]
    ];
  }

  /* ---------- peer comparison ---------- */
  function peerBlock(m, P, rowsD, r0, o) {
    var self = rowsD[o], grpNew = self.cat === 'new', dA = avgDays(P);
    var pool = rowsD.filter(function (r) { return r.o !== o && r.cat !== 'inactive' && r.A.patOM >= Math.min(3, P.cur.length) && (r.cat === 'new') === grpNew; });
    var same = pool.filter(function (r) { return r.ol.type === self.ol.type; }), scope = 'same outlet type (' + self.ol.type + ')';
    if (same.length < MIN_PEERS) { same = pool; scope = 'all outlet types'; }
    var spd = function (r) { return r.A.revOM > 0 ? r.A.rev / (r.A.revOM * dA) : NaN; };
    var M = [
      ['PSH (Rp/hr)', function (r) { return r.A.psh; }, F.n, 1],
      ['PAT margin', function (r) { return r.A.patMargin; }, function (v) { return F.p(v, 2); }, 1],
      ['Profit margin', function (r) { return r.A.margin; }, function (v) { return F.p(v, 1); }, 1],
      ['Sales per trading day (Rp m)', spd, function (v) { return F.m(v, 2); }, 1],
      ['Basket size (Rp)', function (r) { return r.A.basket; }, F.n, 1],
      ['Focus product share', function (r) { return r.A.focusPct; }, function (v) { return F.p(v, 1); }, 1],
      ['Sales through members', function (r) { return r.A.memPct; }, function (v) { return F.p(v, 1); }, 1],
      ['Recruitment rate', function (r) { return r.A.rrPct; }, function (v) { return F.p(v, 1); }, 1],
      ['Salary % of sales', function (r) { return r.A.salPct; }, function (v) { return F.p(v, 1); }, -1],
      ['Rent % of sales', function (r) { return r.A.rentPct; }, function (v) { return F.p(v, 1); }, -1]
    ];
    if (P.baseAvailable) M.push([(S.rate === 'tx' ? 'Transaction' : 'Sales') + ' growth (like-for-like)', function (r) { return r.cat === 'lfl' ? r.rate : NaN; }, function (v) { return F.p(v, 1, true); }, 1]);
    var out = M.map(function (d) {
      var mine = d[1](self), arr = same.map(d[1]).filter(isN), med = U.median(arr);
      var better = isN(mine) ? arr.filter(function (v) { return d[3] > 0 ? v > mine : v < mine; }).length + 1 : NaN;
      return { l: d[0], mine: mine, med: med, n: arr.length, rank: better, fmt: d[2], dir: d[3] };
    });
    var pm = out[1], gapM = isN(self.A.patMargin) && isN(pm.med) && self.A.patOM > 0 ? (self.A.patMargin - pm.med) * self.A.revPat / self.A.patOM : NaN;
    return { rows: out, n: same.length, scope: scope, ok: same.length >= MIN_PEERS, peerPatMargin: pm.med, gap: gapM };
  }


  /* ---------- watchlist flags for this outlet (same rules as the Watchlist tab, on the drawer's period) ---------- */
  function flagPanel(m, P, r, o, endT, L) {
    if (!r || r.cat === 'inactive' || !B.computeFlags) return '';
    var al = B.computeFlags({ m: m, P: P, rowsF: [r] }), ids = al.by[o] || [], TH = B.flagTH || {}, defs = B.flagDefs;
    var def = function (id) { return defs.filter(function (d) { return d.id === id; })[0]; };
    var sevW = { h: 3, m: 2, i: 1 }, score = ids.reduce(function (a, id) { return a + sevW[def(id).sev]; }, 0);
    var mon = E.monthShort(endT), rn = S.rate === 'tx' ? 'Transactions' : 'Sales';
    var ev = {
      lvl45: function () { return rn + ' ' + F.p(r.rate, 1, true) + ' vs ' + esc(P.baseTag) + ' (level ' + r.level + ' decline)'; },
      txdrop: function () { return 'Transactions ' + F.p(r.gTx, 1, true) + ' vs ' + esc(P.baseTag) + ' (flag at ' + F.p(TH.txDrop, 0, true) + ')'; },
      negpsh: function () {
        return 'PAT ' + [2, 1, 0].map(function (k) { var t = endT - k, ps = val(m, 'psh', o, t), h = val(m, 'wh', o, t); return E.monthShort(t) + ' ' + (isN(ps) && isN(h) ? 'Rp ' + F.m(ps * h, 2) + 'm' : '\u2013'); }).join(' \u00b7 ');
      },
      stockloss: function () { return 'Stock loss ' + F.p(L.slPct, 1) + ' of sales in ' + esc(mon) + ' (flag at ' + F.p(TH.stockLoss, 0) + ')'; },
      slow: function () { var rp = B.ramp(m), age = endT - r.ol.firstRev + 1, md = rp.med[age]; return 'Month ' + age + ' sales Rp ' + F.m(L.rev, 1) + 'm vs typical Rp ' + F.m(md, 1) + 'm for outlets at the same age (' + F.p(L.rev / md, 0) + ')'; },
      margin: function () { return 'Margin ' + F.pp(r.dMargin) + ' vs ' + esc(P.baseTag) + ' (' + F.p(r.A.margin, 1) + ' now, ' + F.p(r.B.margin, 1) + ' before)'; },
      salary: function () { return 'Salary ' + F.p(L.salPct, 1) + ' of sales in ' + esc(mon) + ' (flag at ' + F.p(TH.salary, 0) + ')'; },
      recruit: function () { return 'Recruitment rate ' + F.p(L.rrPct, 1) + ' in ' + esc(mon) + ' (flag below ' + F.p(TH.recruit, 0) + ')'; },
      lossmaking: function () { return 'PAT Rp ' + F.m(r.patCur, 1) + 'm over ' + esc(P.tag) + ', open ' + r.opMonths + ' months'; },
      anomaly: function () { return 'Margin ' + F.p(L.margin, 1) + ' in ' + esc(mon) + ' is outside the plausible range; check the source data first'; }
    };
    var order = { h: 0, m: 1, i: 2 };
    var sorted = ids.slice().sort(function (a, b) { return order[def(a).sev] - order[def(b).sev]; });
    var sevTxt = { h: 'High', m: 'Medium', i: 'Check' };
    var items = sorted.map(function (id) {
      var d = def(id), t = '';
      try { t = ev[id](); } catch (e) { t = esc(d.desc); }
      return '<div class="flrow"><span class="fl ' + d.sev + '">' + esc(d.label) + '</span><span class="flsev">' + sevTxt[d.sev] + '</span><span class="fltx">' + t + '<small>Rule: ' + esc(d.desc) + '</small></span></div>';
    }).join('');
    var head = ids.length
      ? '<b>' + ids.length + ' flag' + (ids.length > 1 ? 's' : '') + ' to pay attention to</b> \u00b7 priority score ' + score + ' <small>(3 per high, 2 per medium, 1 per check; same score as the Watchlist)</small>'
      : '<b class="pos">No watchlist flags</b> for this outlet in this period';
    var foot = 'Checked on ' + esc(E.monthLabel(endT)) + ' data' + (P.baseAvailable ? ' and ' + esc(P.tag) + ' vs ' + esc(P.baseTag) : '; no prior-year comparison for this period, so the growth, footfall and margin-change flags cannot be tested') + '. Thresholds are the Watchlist defaults.';
    return '<div class="flp ' + (ids.length ? (sorted.some(function (id) { return def(id).sev === 'h'; }) ? 'hi' : 'md') : 'ok') + '" id="drFlags"><div class="flh">' + head + '</div>' + items + '<div class="flf">' + foot + '</div></div>';
  }

  /* ---------- drawer ---------- */
  B.openOutlet = function (o) {
    var m = B.model;
    D = { o: o, year: S.year, period: S.period, month: S.month || m.latest };
    draw();
  };

  function draw() {
    var m = B.model, o = D.o, ol = m.outlets[o];
    var oldDr = document.querySelector('#drawerHost .dr'), keepTop = oldDr ? oldDr.scrollTop : 0;
    killCharts(); D.rendered = false;
    var P = E.resolvePeriod(m, { basis: S.basis, year: D.year, period: D.period, month: D.month });
    var rowsD = E.evaluate(m, P, S.rate), r = rowsD[o], hb = P.baseAvailable, N = P.cur.length, endT = N ? P.cur[N - 1] : m.latest;
    var tags = '<span class="pill t">' + esc(ol.type) + '</span><span class="pill">' + esc(ol.nature) + '</span><span class="pill">' + esc(ol.tier) + '</span><span class="pill">' + esc(ol.am) + '</span><span class="pill">' + esc(ol.city || ol.prov) + '</span>' +
      (ol.transformed ? '<span class="pill">Transformed ' + esc(ol.phase || '') + '</span>' : '');
    var sub = [ol.city, ol.prov, ol.tier, ol.nature].filter(Boolean).map(esc).join(' \u00b7 ');

    /* period bar */
    var ys = {}, t; for (t = m.min; t <= m.latest; t++) ys[E.yearOf(S.basis, t)] = 1;
    var years = Object.keys(ys).map(Number).sort(function (a, b) { return b - a; });
    var ps = ['FY', 'H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4'].map(function (k) { return [k, E.periodName(S.basis, k, D.year, m.latest, m.baseMin)]; });
    ps.push(['R12', 'Running 12 months (' + E.monthShort(m.latest - 11) + ' \u2013 ' + E.monthShort(m.latest) + ')'], ['M', 'Single month']);
    var ms = []; for (t = m.latest; t >= m.min + 12; t--) ms.push(t);
    var bar = '<div class="drbar"><b>Period</b><select id="drY">' + years.map(function (y) { return '<option value="' + y + '"' + (y === D.year ? ' selected' : '') + '>' + E.yearLabel(S.basis, y) + '</option>'; }).join('') + '</select>' +
      '<select id="drP">' + ps.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === D.period ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>' +
      (D.period === 'M' ? '<select id="drM">' + ms.map(function (x) { return '<option value="' + x + '"' + (x === D.month ? ' selected' : '') + '>' + E.monthLabel(x) + '</option>'; }).join('') + '</select>' : '') +
      '<button class="btn sm" id="drSync" title="Use the period selected on the dashboard"><i class="fas fa-rotate-left"></i> Dashboard period</button>' +
      '<span class="drtag">' + (N ? esc(P.label) : 'No data') + (hb ? ' \u00b7 vs ' + esc(P.baseTag) : ' \u00b7 no prior-year comparison') + '</span></div>';

    /* narrative */
    var lastT = lastSalesT(m, o), first = ol.firstRev;
    var narr = 'Official opening ' + (ol.start ? F.d(ol.start) : 'not recorded') + '. First positive sales ' + (first >= 0 ? E.monthLabel(first) : 'n/a') + '. ' +
      (ol.startIdx >= 0 && first >= 0 && ol.startIdx > first + 1 ? 'The recorded opening date is later than the first sales month, so the first sales month is used for age. ' : '') +
      'Age at ' + E.monthLabel(endT) + ': ' + (isN(E.ageAt(ol, endT)) ? E.ageAt(ol, endT) + ' months' : 'n/a') + '. Last observed positive sales ' + (lastT >= 0 ? E.monthLabel(lastT) : 'n/a') + '. ' +
      (r ? '<b>' + esc(statusOf(r)) + '</b>' + (r.cat === 'new' || r.cat === 'nc' ? ' \u2013 ' + esc(r.reason || '') : '') + '.' : '');

    if (!N) {
      $('drawerHost').innerHTML = shell(ol, tags, sub, bar, '<div class="note warn">No months in this period yet.</div>');
      wire(); return;
    }

    /* aggregates */
    var A = E.agg(m, [o], P.cur), Bg = hb ? E.agg(m, [o], P.base) : null, L = E.agg(m, [o], [endT]);
    var revMatch = 0, revMatchB = 0, nMatch = 0;
    if (hb) P.cur.forEach(function (tt, i) { var a = val(m, 'rev', o, tt), b = val(m, 'rev', o, P.base[i]); if (a > 0 && b > 0) { revMatch += a; revMatchB += b; nMatch++; } });
    var yoy = nMatch ? revMatch / revMatchB - 1 : NaN;
    var trading = rowsD.filter(function (x) { return x.cat !== 'inactive' && x.A.patOM > 0 && isN(x.A.psh); });
    var rank = isN(A.psh) ? trading.filter(function (x) { return x.A.psh > A.psh; }).length + 1 : NaN;

    var cards = '<div class="drcards">' +
      B.card('Sales ' + esc(P.tag), F.rp(A.rev), A.revOM + '/' + N + ' recorded sales months' + (nMatch ? ' \u00b7 comparable YoY <b class="' + F.cls(yoy) + '">' + F.p(yoy, 1, true) + '</b> (' + nMatch + ' matched months)' : (hb ? ' \u00b7 no matched prior months' : ''))) +
      B.card('Estimated PAT ' + esc(P.tag), F.rp(A.pat), (hb ? esc(P.baseTag) + ' ' + F.rp(Bg.pat) + ' \u00b7 ' : '') + 'coverage ' + (hb ? Bg.patOM + '/' + N + ' \u2192 ' : '') + A.patOM + '/' + N, A.pat < 0 ? 'neg' : '') +
      B.card('Weighted PSH', F.n(A.psh), (hb ? esc(P.baseTag) + ' ' + F.n(Bg.psh) + ' \u00b7 ' : '') + 'per staff hour' + (isN(rank) ? ' \u00b7 rank <b>#' + rank + '</b> of ' + trading.length : ''), A.psh < 0 ? 'neg' : '') +
      B.card(esc(E.monthShort(endT)) + ' PAT', F.rp(L.pat), 'PSH ' + F.n(L.psh) + '/hr \u00b7 sales ' + F.rp(L.rev), L.pat < 0 ? 'neg' : '') +
      B.card('Status', esc(statusOf(r)), r && r.cat === 'lfl' ? esc(S.rate === 'tx' ? 'transactions' : 'sales') + ' ' + F.p(r.rate, 1, true) + ' vs ' + esc(P.baseTag) : esc((r && r.reason) || ''), r && r.cat === 'lfl' ? (r.dir === 'down' ? 'neg' : 'pos') : '') + '</div>';

    /* trend chart panel */
    var win12 = N < 6, tw = []; if (win12) { for (t = endT - 11; t <= endT; t++) tw.push(t); } else tw = P.cur.slice();
    var measures = MS(m, o), cur = D.measure || 'rev';
    var trend = '<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><h4 style="font-size:16px;margin:0">Monthly outlet trend</h4><div class="ks">' +
      (win12 ? 'Last 12 months to ' + esc(E.monthShort(endT)) + ' vs the same months a year earlier.' : esc(P.tag) + (hb ? ' and ' + esc(P.baseTag) : '') + '.') + ' Missing observations leave a gap.</div></div>' +
      '<div><div class="ks">Outlet measure</div><select id="drMeasure">' + measures.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="ch t"><canvas id="drTrend"></canvas></div></div>';

    /* parameter table */
    var covs = function (key, months) { return cover(m, key, o, months); };
    var money = function (v) { return F.rp(v); }, pc1 = function (v) { return F.p(v, 1); }, pc2 = function (v) { return F.p(v, 2); };
    var PR = [
      ['h', 'Sales and traffic'],
      ['Sales', 'rev', function (a) { return a.rev; }, money, 'pct', 1],
      ['Transactions', 'tx', function (a) { return a.tx; }, F.n, 'pct', 1],
      ['Basket size (Rp)', 'tx', function (a) { return a.basket; }, F.n, 'pct', 1],
      ['Avg staff sales per day (Rp m)', 'ssd', function (a) { return a.ssd; }, function (v) { return F.m(v, 2); }, 'pct', 1],
      ['h', 'Profitability'],
      ['Profit (gross, as recorded)', 'pro', function (a) { return a.pro; }, money, 'pct', 1],
      ['Profit margin', 'pro', function (a) { return a.margin; }, pc1, 'pp', 1],
      ['Working hours', 'wh', function (a) { return a.wh; }, F.n, 'pct', 0],
      ['PSH (Rp/hr, hours-weighted)', 'psh', function (a) { return a.psh; }, F.n, 'abs', 1],
      ['PAT (PSH \u00d7 hours)', 'psh', function (a) { return a.pat; }, money, 'abs', 1],
      ['PAT margin (PAT \u00f7 sales)', 'psh', function (a) { return a.patMargin; }, pc2, 'pp', 1],
      ['h', 'Customers and mix'],
      ['Focus product share of sales', 'focus', function (a) { return a.focusPct; }, pc1, 'pp', 1],
      ['Ethical focus product share', 'eth', function (a) { return a.ethPct; }, pc1, 'pp', 1],
      ['Non-ethical focus product share', 'nonEth', function (a) { return a.nonEthPct; }, pc1, 'pp', 1],
      ['Sales through members', 'mem', function (a) { return a.memPct; }, pc1, 'pp', 1],
      ['Recruitment rate (recruited \u00f7 walk-ins without membership)', 'rr', function (a) { return a.rrPct; }, pc1, 'pp', 1],
      ['New members', 'newMem', function (a) { return a.nm; }, F.n, 'pct', 1],
      ['EVIP (last month of period)', 'evip', function (a) { return a.evip; }, F.n, 'pct', 1],
      ['h', 'Cost lines (share of sales)'],
      ['Salary', 'sal', function (a) { return a.salPct; }, pc1, 'pp', -1],
      ['Rental', 'rent', function (a) { return a.rentPct; }, pc1, 'pp', -1],
      ['Utilities', 'util', function (a) { return a.utilPct; }, pc1, 'pp', -1],
      ['Petty cash', 'petty', function (a) { return a.pettyPct; }, pc2, 'pp', -1],
      ['Stock loss', 'stockloss', function (a) { return a.slPct; }, pc2, 'pp', -1]
    ];
    var ptab = PR.map(function (d) {
      if (d[0] === 'h') return '<tr class="drh"><td colspan="5">' + d[1] + '</td></tr>';
      var a = d[2](A), b = Bg ? d[2](Bg) : NaN, ch;
      if (!hb || !isN(b)) ch = NaN; else if (d[4] === 'pct') ch = b !== 0 ? (a - b) / Math.abs(b) : NaN; else ch = a - b;
      var chTxt = d[4] === 'pct' ? F.p(ch, 1, true) : d[4] === 'pp' ? F.pp(ch) : sgn(ch, d[3]);
      var cc = d[5] ? (ch * d[5] > 0 ? 'pos' : ch * d[5] < 0 ? 'neg' : '') : '';
      var cn = covs(d[1], P.cur), cb = hb ? covs(d[1], P.base) : null;
      return '<tr><td class="l">' + d[0] + '</td><td class="' + (d[3] === money || d[3] === F.n ? F.cls(a) : '') + '"><b>' + d[3](a) + '</b></td><td>' + (hb ? d[3](b) : '\u2013') + '</td><td class="' + cc + '">' + chTxt + '</td><td>' + cn + '/' + N + (hb ? ' \u2192 ' + cb + '/' + N : '') + '</td></tr>';
    }).join('');
    var ptable = '<div class="tw" style="margin-top:0;margin-bottom:12px"><div class="th"><div><h3>All parameters</h3><p>' + esc(P.tag) + (hb ? ' vs ' + esc(P.baseTag) + ' (same months, one year earlier)' : ' (no prior-year comparison for this selection)') + '. Coverage = months with a recorded value' + (hb ? ' (current \u2192 prior)' : '') + '. Percent measures change in percentage points.</p></div></div>' +
      '<div class="tx" style="max-height:none"><table class="mt"><thead><tr><th class="l">Measure</th><th>' + esc(P.tag) + '</th><th>' + (hb ? esc(P.baseTag) : 'Prior year') + '</th><th>Change</th><th>Coverage (months)</th></tr></thead><tbody>' + ptab + '</tbody></table></div></div>';

    /* economics */
    var peers = peerBlock(m, P, rowsD, r, o), size = sizeOf(ol), mc = Math.max(1, A.patOM);
    var sal = obs(m, 'sal', o, P.cur), rent = obs(m, 'rent', o, P.cur), util = obs(m, 'util', o, P.cur), petty = obs(m, 'petty', o, P.cur), sl = obs(m, 'stockloss', o, P.cur);
    var perM = function (x) { return x.n ? x.s / x.n : NaN; };
    var revDays = A.revOM > 0 ? A.rev / (A.revOM * avgDays(P)) : NaN;
    var erow = function (l, v, c, cls) { return '<tr><td class="l">' + l + '</td><td class="' + (cls || '') + '">' + v + '</td><td>' + c + '</td></tr>'; };
    var eco = '';
    if (isN(size)) {
      eco += erow('Revenue / full m\u00b2 / month', money(A.rev / A.revOM / size), A.revOM + ' revenue months \u00b7 ' + F.n(size, 1) + ' full m\u00b2') +
        erow('PAT / full m\u00b2 / month', money(A.pat / mc / size), A.patOM + ' PAT months', F.cls(A.pat));
    } else eco += erow('Revenue and PAT per m\u00b2', '\u2013', 'Store size is not recorded in MASTER (Size column is empty)');
    eco += erow('Sales per trading day', money(revDays), A.revOM + ' revenue months') +
      erow('Working hours / month', F.n(A.patOM ? A.wh / A.patOM : NaN), A.patOM + ' months') +
      erow('PAT / month', money(A.patOM ? A.pat / A.patOM : NaN), A.patOM + ' PAT months', F.cls(A.pat)) +
      erow('Salary / observed month', money(perM(sal)), sal.n + ' months') + erow('Rent / observed month', money(perM(rent)), rent.n + ' months') +
      erow('Utilities / observed month', money(perM(util)), util.n + ' months') + erow('Petty cash / observed month', money(perM(petty)), petty.n + ' months') +
      erow('Stock loss / observed month', money(perM(sl)), sl.n + ' months') +
      erow('Own PAT margin', pc2(A.patMargin), A.patOM + ' PAT months', F.cls(A.patMargin));
    if (peers.ok) eco += erow('Peer PAT margin (median)', pc2(peers.peerPatMargin), peers.n + ' other eligible peers \u00b7 minimum ' + MIN_PEERS) +
      erow('Peer reference gap / month', sgn(peers.gap, function (v) { return F.rp(v); }), 'own margin vs peer median, on own sales \u00b7 ' + esc(peers.scope), F.cls(peers.gap));
    else eco += erow('Peer PAT margin (median)', '\u2013', 'only ' + peers.n + ' eligible peers (minimum ' + MIN_PEERS + ')');
    var etable = '<div class="tw" style="margin-top:0;margin-bottom:12px"><div class="th"><div><h3>Outlet economics</h3><p>' + esc(P.tag) + ' \u00b7 ' + esc(ol.type) + ' \u00b7 ' + esc(ol.tier) + '. Cost lines are averages over the months they were recorded.</p></div></div>' +
      '<div class="tx" style="max-height:none"><table class="mt"><thead><tr><th class="l">Measure</th><th>Value</th><th>Coverage</th></tr></thead><tbody>' + eco + '</tbody></table></div></div>';

    /* peers table */
    var pt = peers.rows.map(function (d) {
      var gap = isN(d.mine) && isN(d.med) ? d.mine - d.med : NaN, good = isN(gap) ? gap * d.dir : NaN;
      var gTxt = !isN(gap) ? '\u2013' : /margin|share|Sales through|Recruitment|% of sales|growth/.test(d.l) ? F.pp(gap) : sgn(gap, d.l.indexOf('(Rp m)') >= 0 ? function (v) { return F.m(v, 2); } : F.n);
      return '<tr><td class="l">' + esc(d.l) + '</td><td><b>' + (isN(d.mine) ? d.fmt(d.mine) : '\u2013') + '</b></td><td>' + (isN(d.med) ? d.fmt(d.med) : '\u2013') + '</td><td class="' + (good > 0 ? 'pos' : good < 0 ? 'neg' : '') + '">' + gTxt + '</td><td>' + (isN(d.rank) ? '#' + d.rank + ' of ' + (d.n + 1) : '\u2013') + '</td></tr>';
    }).join('');
    var ptbl = '<div class="tw" style="margin-top:0;margin-bottom:12px"><div class="th"><div><h3>Versus peers</h3><p>' + (peers.ok ? peers.n + ' other ' + (r && r.cat === 'new' ? 'new' : 'mature') + ' outlets, ' + esc(peers.scope) + '; median of peers; rank 1 = best (lowest for cost lines).' : 'Fewer than ' + MIN_PEERS + ' comparable outlets in this period, so peer comparison is not shown.') + '</p></div></div>' +
      (peers.ok ? '<div class="tx" style="max-height:none"><table class="mt"><thead><tr><th class="l">Measure</th><th>This outlet</th><th>Peer median</th><th>Gap</th><th>Rank in peers</th></tr></thead><tbody>' + pt + '</tbody></table></div>' : '') + '</div>';

    /* 24-month data */
    var all = E.monthly(m, [o]), byT = {}; all.forEach(function (x) { byT[x.t] = x; });
    var mo = all.filter(function (x) { return (x.rev > 0 || x.tx > 0) && x.t <= endT; }), last24 = mo.slice(-24);
    var yo = function (x, key) { var b = x.t - 12 >= m.baseMin ? byT[x.t - 12] : null; return b && b[key] > 0 && x[key] > 0 ? x[key] / b[key] - 1 : NaN; };
    var tb = last24.slice().reverse().map(function (x) {
      var h = val(m, 'wh', o, x.t), ph = val(m, 'psh', o, x.t);
      return '<tr><td class="l">' + E.monthLabel(x.t) + '</td><td>' + F.m(x.rev) + '</td><td class="' + F.cls(yo(x, 'rev')) + '">' + F.p(yo(x, 'rev'), 1, true) + '</td><td>' + F.n(x.tx) + '</td><td class="' + F.cls(yo(x, 'tx')) + '">' + F.p(yo(x, 'tx'), 1, true) +
        '</td><td>' + F.n(x.basket) + '</td><td>' + F.p(x.margin, 1) + '</td><td class="' + F.cls(ph) + '">' + F.n(ph) + '</td><td class="' + F.cls(ph) + '">' + (isN(ph) ? F.m(x.pat) : '\u2013') + '</td><td>' + F.n(h) + '</td><td>' + F.p(x.focus, 1) + '</td><td>' + F.p(x.mem, 0) + '</td><td>' + F.p(x.rr, 0) + '</td><td>' + F.n(x.nm) + '</td><td>' + F.p(x.sal, 1) + '</td><td>' + F.p(x.rent, 1) + '</td><td>' + F.p(x.sl, 1) + '</td></tr>';
    }).join('');
    var dtab = '<div style="margin:4px 0 12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="drToggle">Show 24-month data table</button><button class="btn" id="drCsv"><i class="fas fa-download"></i> Export months</button></div>' +
      '<div id="drTable" class="hidden"><div class="card" style="margin-bottom:12px"><h4>Sales (Rp m) and PAT (Rp m), last ' + last24.length + ' months to ' + esc(E.monthShort(endT)) + '</h4><div class="ch t"><canvas id="dc1"></canvas></div></div>' +
      '<div class="grid g2" style="margin-bottom:12px"><div class="card"><h4>PSH (Rp per staff hour) and margin %</h4><div class="ch"><canvas id="dc2"></canvas></div></div><div class="card"><h4>Transactions and basket size</h4><div class="ch"><canvas id="dc3"></canvas></div></div></div>' +
      '<div class="tw" style="margin-top:0"><div class="th"><div><h3>Monthly detail</h3><p>Amounts in Rp m; YoY compares with the same month a year earlier.</p></div></div><div class="tx" style="max-height:420px"><table class="mt"><thead><tr><th class="l">Month</th><th>Sales</th><th>YoY</th><th>Tx</th><th>YoY</th><th>Basket</th><th>Margin</th><th>PSH</th><th>PAT</th><th>Hours</th><th>Focus %</th><th>Member %</th><th>Recruit %</th><th>New mem</th><th>Salary %</th><th>Rent %</th><th>Stock loss %</th></tr></thead><tbody>' + tb + '</tbody></table></div></div></div>';

    var note = P.baseAvailable ? '' : '<div class="note warn">No prior-year comparison for this period (the workbook\u2019s comparable history starts ' + esc(E.monthLabel(m.baseMin)) + '). Pick a later period to see change and growth.</div>';
    $('drawerHost').innerHTML = shell(ol, tags, sub, bar, '<div class="drnarr">' + narr + '</div>' + note + flagPanel(m, P, r, o, endT, L) + cards + trend + ptable + etable + ptbl + dtab);
    wire();

    /* charts */
    var mdef = measures.filter(function (x) { return x[0] === cur; })[0] || measures[0];
    var line = function (months, dx) { return months.map(function (tt) { var t2 = tt - dx; if (t2 < m.baseMin && dx) return null; var x = byT[t2]; if (!x || !(val(m, 'rev', o, t2) > 0)) return null; return mdef[2](x); }); };
    var lab = tw.map(function (tt) { return E.monthShort(tt).replace(/ '\d+$/, ''); });
    var ds = [{ label: win12 ? 'Last 12 months to ' + E.monthShort(endT) : P.tag, data: line(tw, 0), borderColor: '#16436f', backgroundColor: '#16436f', tension: .25, pointRadius: 3, spanGaps: false }];
    if (hb || win12) ds.push({ label: win12 ? 'Same months a year earlier' : P.baseTag, data: line(tw, 12), borderColor: '#9db0c8', backgroundColor: '#9db0c8', tension: .25, pointRadius: 3, spanGaps: false });
    mk('drTrend', { type: 'line', data: { labels: lab, datasets: ds }, options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { title: function (c) { var i = c[0].dataIndex; return E.monthLabel(tw[i]) + (c[0].datasetIndex ? ' (prior year: ' + E.monthLabel(tw[i] - 12) + ')' : ''); } } } }, scales: { x: { ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } }, title: { display: true, text: mdef[1], font: { size: 10 } } } } } });
    var labels = last24.map(function (x) { return E.monthShort(x.t); });
    var base = { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { font: { size: 9 } } } } };
    var two = function () { return Object.assign({}, base, { scales: { x: base.scales.x, y: { position: 'left', ticks: { font: { size: 9 } } }, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 9 } } } } }); };
    D.chartsCfg = function () {
      if (D.rendered) return; D.rendered = true;
      mk('dc1', { data: { labels: labels, datasets: [
        { type: 'bar', label: 'Sales', data: last24.map(function (x) { return x.rev / 1e6; }), backgroundColor: '#9db8d9', yAxisID: 'y' },
        { type: 'line', label: 'PAT', data: last24.map(function (x) { return isN(val(m, 'psh', o, x.t)) && isN(x.pat) ? x.pat / 1e6 : null; }), borderColor: '#0f7a55', backgroundColor: '#0f7a55', tension: .25, yAxisID: 'y1', pointRadius: 2 }] }, options: two() });
      mk('dc2', { type: 'line', data: { labels: labels, datasets: [
        { label: 'PSH', data: last24.map(function (x) { return isN(val(m, 'psh', o, x.t)) ? x.psh : null; }), borderColor: '#b5303b', yAxisID: 'y', tension: .25, pointRadius: 2 },
        { label: 'Margin %', data: last24.map(function (x) { return isN(x.margin) ? x.margin * 100 : null; }), borderColor: '#16436f', yAxisID: 'y1', tension: .25, pointRadius: 2 }] }, options: two() });
      mk('dc3', { type: 'line', data: { labels: labels, datasets: [
        { label: 'Transactions', data: last24.map(function (x) { return x.tx; }), borderColor: '#2f7f9a', yAxisID: 'y', tension: .25, pointRadius: 2 },
        { label: 'Basket (Rp)', data: last24.map(function (x) { return isN(x.basket) ? x.basket : null; }), borderColor: '#c9951c', yAxisID: 'y1', tension: .25, pointRadius: 2 }] }, options: two() });
    };
    var tg = $('drToggle'), tblEl = $('drTable');
    if (D.open) { tblEl.classList.remove('hidden'); tg.textContent = 'Hide 24-month data table'; D.chartsCfg(); }
    tg.onclick = function () {
      var hid = tblEl.classList.toggle('hidden'); D.open = !hid; tg.textContent = hid ? 'Show 24-month data table' : 'Hide 24-month data table';
      if (!hid) D.chartsCfg();
    };
    $('drCsv').onclick = function () {
      B.csv('bod-outlet-' + (ol.code || o) + '-months.csv', ['Month', 'Sales', 'Transactions', 'Basket', 'Profit', 'Margin', 'PSH', 'PAT', 'Working hours', 'Focus %', 'Member %', 'Recruitment %', 'New members', 'Salary % of sales', 'Rent % of sales', 'Stock loss % of sales'],
        mo.map(function (x) { var ph = val(m, 'psh', o, x.t); return [E.monthLabel(x.t), Math.round(x.rev), Math.round(x.tx), isN(x.basket) ? Math.round(x.basket) : '', isN(x.pro) ? Math.round(x.pro) : '', isN(x.margin) ? x.margin.toFixed(4) : '', isN(ph) ? Math.round(ph) : '', isN(ph) ? Math.round(x.pat) : '', isN(val(m, 'wh', o, x.t)) ? val(m, 'wh', o, x.t) : '', isN(x.focus) ? x.focus.toFixed(4) : '', isN(x.mem) ? x.mem.toFixed(4) : '', isN(x.rr) ? x.rr.toFixed(4) : '', isN(x.nm) ? x.nm : '', isN(x.sal) ? x.sal.toFixed(4) : '', isN(x.rent) ? x.rent.toFixed(4) : '', isN(x.sl) ? x.sl.toFixed(4) : '']; }));
    };
    var sel = $('drMeasure'); if (sel) sel.onchange = function () { D.measure = sel.value; draw(); };
    var nd = document.querySelector('#drawerHost .dr'); if (nd && keepTop) nd.scrollTop = keepTop;
  }

  function shell(ol, tags, sub, bar, body) {
    return '<div class="dim" id="dim"></div><aside class="dr"><button class="dx" id="dx"><i class="fas fa-xmark"></i></button>' +
      '<div class="eyebrow">' + esc(ol.code) + ' \u00b7 ' + esc(ol.type) + '</div><h2>' + esc(ol.fullName || ol.name) + '</h2><div class="drsub">' + sub + '</div>' + bar + body + '</aside>';
  }
  function wire() {
    $('dx').onclick = close; $('dim').onclick = close;
    var y = $('drY'), p = $('drP'), mo = $('drM'), sy = $('drSync'); if (!y) return;
    y.onchange = function () { D.year = +y.value; D.open = false; draw(); };
    p.onchange = function () { D.period = p.value; if (D.period === 'M' && !D.month) D.month = B.model.latest; D.open = false; draw(); };
    if (mo) mo.onchange = function () { D.month = +mo.value; D.open = false; draw(); };
    sy.onclick = function () { D.year = S.year; D.period = S.period; D.month = S.month || B.model.latest; D.open = false; draw(); };
  }
})(window);
