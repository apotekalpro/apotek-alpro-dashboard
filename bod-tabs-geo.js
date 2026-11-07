/* ============================================================================
 * BOD Dashboard - Geographic analysis tab
 * Compares zones (Kecamatan or Kota, as recorded in MASTER) on growth, productivity and profitability and
 * flags zones that look saturated (most mature outlets flat or declining while outlets are still productive)
 * versus zones that are winning or under-penetrated. Thresholds are PROPOSED defaults and are shown on screen.
 * The workbook has no coordinates or population data, so distance (1-2 km) cannot be measured here.
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;

  // Outlet is "flat" under stall (absolute YoY). Zone growth is judged against the company's own like-for-like growth in the same view,
  // because a fast-growing company would otherwise label nearly every zone a winner.
  var TH = { stall: 0.10, stallShare: 0.5, winMult: 1.15, winShare: 0.25, lagMult: 0.6, minLfl: 3, whiteMax: 3, whiteSpd: 1.2 };
  if (!S.geoLevel) S.geoLevel = 'kec';
  if (!S.geoMin) S.geoMin = 2;
  if (!S.geoJudge) S.geoJudge = 3;
  if (S.geoOpen === undefined) S.geoOpen = null;

  var V = {
    plat: { t: 'Plateau \u00b7 expansion candidate', c: 'plat', rank: 1, col: '#d98a12' },
    lag: { t: 'Lagging company growth \u00b7 watch', c: 'lag', rank: 2, col: '#e0b24a' },
    win: { t: 'Winning zone', c: 'win', rank: 3, col: '#0f7a55' },
    grow: { t: 'Growing', c: 'grow', rank: 4, col: '#5aa05a' },
    weak: { t: 'Stalled \u00b7 fix first', c: 'weak', rank: 5, col: '#b5303b' },
    mon: { t: 'Monitor', c: 'mon', rank: 6, col: '#6f7db0' },
    few: { t: 'Too few outlets', c: 'few', rank: 7, col: '#a9b4c2' }
  };

  function zoneKey(r) { return S.geoLevel === 'kec' ? (r.ol.city || 'N/A') + ' | ' + (r.ol.kec || 'N/A') : (r.ol.city || 'N/A'); }
  function zoneName(k) { var i = k.indexOf(' | '); return i < 0 ? k : k.slice(i + 3); }
  function zoneParent(k) { var i = k.indexOf(' | '); return i < 0 ? (S.geoLevel === 'kota' ? '' : '') : k.slice(0, i); }
  function daysAvg(P) { var d = 0; P.cur.forEach(function (t) { d += U.daysIn(t); }); return d / Math.max(1, P.cur.length); }
  function levelTxt(r) {
    if (r.cat === 'lfl') return (r.dir === 'down' ? 'Down L' : 'Up L') + r.level;
    return r.cat === 'new' ? 'New' : 'Not comparable';
  }

  /* ---------- build zone records ---------- */
  function build(ctx) {
    TH.minLfl = S.geoJudge;
    var m = ctx.m, P = ctx.P, dA = daysAvg(P), endT = P.cur[P.cur.length - 1], gk = ctx.rate === 'tx' ? 'lTx' : 'lRev';
    var cgs = E.groupStats(m, P, ctx.rowsF), cg = cgs[gk];
    var lflAll = ctx.rowsF.filter(function (r) { return r.cat === 'lfl'; });
    var rows = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; }), groups = {};
    rows.forEach(function (r) { var k = zoneKey(r); (groups[k] = groups[k] || []).push(r); });
    var last3 = P.cur.slice(-3);
    var zones = Object.keys(groups).filter(function (k) { return groups[k].length >= S.geoMin; }).map(function (k) {
      var rr = groups[k], g = E.groupStats(m, P, rr), lf = rr.filter(function (r) { return r.cat === 'lfl'; });
      var la = g.la, nL = lf.length, stalled = lf.filter(function (r) { return r.rate < TH.stall; }).length;
      var dn = lf.filter(function (r) { return r.dir === 'down'; }).length;
      var mom = NaN;
      if (nL) {
        var ids = lf.map(function (r) { return r.o; }), a3 = E.agg(m, ids, last3), b3 = E.agg(m, ids, last3.map(function (t) { return t - 12; }));
        var x = ctx.rate === 'tx' ? [a3.tx, b3.tx] : [a3.rev, b3.rev]; mom = x[1] > 0 ? x[0] / x[1] - 1 : NaN;
      }
      var perOM = function (v) { return la.revOM > 0 ? v / la.revOM / dA : NaN; };
      return {
        k: k, name: zoneName(k), parent: zoneParent(k), rows: rr, n: rr.length, nL: nL, g: g,
        zg: g[gk], mom: mom, stalled: stalled, dn: dn, share: nL ? stalled / nL : NaN,
        spd: perOM(la.rev), tpd: perOM(la.tx),
        recent: rr.filter(function (r) { return r.ol.openIdx >= 0 && r.ol.openIdx >= endT - 11; }).length,
        nNew: rr.filter(function (r) { return r.cat === 'new'; }).length,
        ol: { name: zoneName(k), code: '', am: zoneParent(k) }, o: rr[0].o
      };
    });
    var ok = zones.filter(function (z) { return z.nL >= TH.minLfl; });
    var med = { spd: U.median(ok.map(function (z) { return z.spd; }).filter(isN)), psh: U.median(ok.map(function (z) { return z.g.a.psh; }).filter(isN)) };
    zones.forEach(function (z) { classify(z, med, cg); });
    return { zones: zones, med: med, dA: dA, endT: endT, groups: groups, cg: cg, nLflAll: lflAll.length, nStallAll: lflAll.filter(function (r) { return r.rate < TH.stall; }).length };
  }

  function classify(z, med, cg) {
    var hiSpd = isN(z.spd) && isN(med.spd) && z.spd >= med.spd, psh = z.g.a.psh, rel = isN(cg) && cg > 0;
    var lagLine = rel ? cg * TH.lagMult : 0.05, winLine = rel ? Math.max(cg * TH.winMult, 0.10) : 0.10;
    z.white = z.n <= TH.whiteMax && isN(z.spd) && isN(med.spd) && z.spd >= TH.whiteSpd * med.spd && isN(z.zg) && z.zg >= lagLine;
    var sp = isN(z.spd) ? 'Rp ' + (z.spd / 1e6).toFixed(2) + 'm' : 'n/a', md = isN(med.spd) ? 'Rp ' + (med.spd / 1e6).toFixed(2) + 'm' : 'n/a';
    var cmp = rel ? ' vs ' + F.p(cg, 1) + ' for the company' : '';
    var cn = z.recent > 0 ? ' ' + z.recent + ' outlet(s) opened here in the last 12 months, so check cannibalisation before adding more.' : '';
    if (z.nL < TH.minLfl) { z.v = 'few'; z.why = 'Only ' + z.nL + ' like-for-like outlet(s); at least ' + TH.minLfl + ' are needed for a reliable read.'; return; }
    var plateau = z.share >= TH.stallShare || (isN(z.zg) && z.zg < TH.stall);
    if (plateau) {
      if (isN(psh) && psh > 0 && hiSpd) {
        z.v = 'plat';
        z.why = z.stalled + ' of ' + z.nL + ' mature outlets grew under ' + F.p(TH.stall, 0) + ' (' + z.dn + ' declining); zone growth ' + F.p(z.zg, 1, true) + cmp + '. Yet sales per outlet per day (' + sp + ') is at or above the zone median (' + md + ') and PSH is positive. Current catchments look saturated: consider infill within 1\u20132 km or a larger / upgraded format.' + cn;
      } else {
        z.v = 'weak';
        z.why = z.stalled + ' of ' + z.nL + ' mature outlets grew under ' + F.p(TH.stall, 0) + '; zone growth ' + F.p(z.zg, 1, true) + cmp + ' and productivity is ' + (isN(psh) && psh <= 0 ? 'loss-making (PSH \u2264 0)' : 'below the zone median (' + sp + ' vs ' + md + ' per outlet per day)') + '. Fix offering and operations first; more outlets would probably not help.' + cn;
      }
    } else if (isN(z.zg) && z.zg < lagLine) {
      z.v = 'lag';
      z.why = 'Mature outlets grew ' + F.p(z.zg, 1) + cmp + ', under ' + F.p(TH.lagMult, 0) + ' of the company pace, although only ' + z.stalled + ' of ' + z.nL + ' are flat. Growth is slowing relative to the rest of the network' + (hiSpd ? ' while sales per outlet per day (' + sp + ') is already at or above the zone median (' + md + '): an early saturation signal, so watch before adding outlets.' : '; productivity is below the zone median (' + sp + ' vs ' + md + '), so look at the offering first.') + cn;
    } else if (isN(z.zg) && z.zg >= winLine && z.share <= TH.winShare) {
      z.v = 'win';
      z.why = 'Mature outlets grew ' + F.p(z.zg, 1) + cmp + ' and only ' + z.stalled + ' of ' + z.nL + ' are flat or declining. Study what these outlets do (see Winning formula and the driver comparison below) and replicate it.';
    } else {
      z.v = 'grow'; z.why = 'Mature outlets grew ' + F.p(z.zg, 1) + cmp + '; ' + z.stalled + ' of ' + z.nL + ' are flat or declining.';
    }
    if (z.white && (z.v === 'win' || z.v === 'grow')) z.why += ' Only ' + z.n + ' outlets in the zone with strong sales per outlet per day: under-penetrated, a good place to add outlets.';
    if ((z.v === 'plat' || z.v === 'lag') && isN(z.mom) && z.mom < z.zg - 0.05) z.why += ' The last 3 months are ' + F.p(z.mom, 1, true) + ' vs last year, slower than the period, so the slowdown is accelerating.';
  }

  function pill(z) {
    return '<span class="gv ' + V[z.v].c + '">' + V[z.v].t + '</span>' + (z.white && (z.v === 'win' || z.v === 'grow') ? '<span class="gv white">Under-penetrated</span>' : '');
  }

  /* ---------- zone detail (expanded row) ---------- */
  function detail(z, ctx, bd, ncol) {
    var rows = z.rows.slice().sort(function (a, b) { return (b.last.rev || 0) - (a.last.rev || 0); });
    var tr = rows.map(function (r) {
      var spd = r.A.revOM > 0 ? r.A.rev / r.A.revOM / bd.dA : NaN;
      var cls = r.cat === 'lfl' ? (r.dir === 'down' ? 'neg' : 'pos') : '';
      return '<tr data-o="' + r.o + '"><td class="l"><b>' + esc(r.ol.name) + '</b><span style="color:var(--mute);font-size:10.5px"> ' + esc(r.ol.code) + '</span></td><td class="l">' + esc(r.ol.type) + '</td><td class="l">' + esc(r.ol.am) + '</td>' +
        '<td>' + F.d(r.ol.start) + '</td><td>' + (isN(r.age) ? F.n(r.age) : '\u2013') + '</td><td class="' + cls + '">' + levelTxt(r) + '</td>' +
        '<td class="' + F.cls(r.rate) + '">' + (r.cat === 'lfl' ? F.p(r.rate, 1, true) : '\u2013') + '</td><td>' + F.m(spd, 2) + '</td><td class="' + F.cls(r.A.psh) + '">' + F.n(r.A.psh) + '</td></tr>';
    }).join('');
    return '<tr class="geo-det"><td colspan="' + ncol + '"><div class="geo-why"><b>' + esc(V[z.v].t) + '.</b> ' + esc(z.why) + '</div>' +
      '<table class="geo-sub"><thead><tr><th class="l">Outlet</th><th class="l">Type</th><th class="l">AM</th><th>Opened</th><th>Age (months)</th><th>Status</th><th>' + (ctx.rate === 'tx' ? 'Tx' : 'Sales') + ' growth</th><th>Sales / day (Rp m)</th><th>PSH (Rp/hr)</th></tr></thead><tbody>' + tr + '</tbody></table></td></tr>';
  }

  /* ---------- what the winning zones do differently ---------- */
  var DRV = [
    ['Sales per outlet per day (Rp m)', function (z) { return z.spd / 1e6; }, function (v) { return F.n(v, 2); }],
    ['Transactions per outlet per day', function (z) { return z.tpd; }, function (v) { return F.n(v, 0); }],
    ['Basket size (Rp)', function (z) { return z.g.la.basket; }, F.n],
    ['Margin', function (z) { return z.g.la.margin; }, function (v) { return F.p(v, 1); }],
    ['Focus product share', function (z) { return z.g.la.focusPct; }, function (v) { return F.p(v, 1); }],
    ['Sales through members', function (z) { return z.g.la.memPct; }, function (v) { return F.p(v, 1); }],
    ['Recruitment rate', function (z) { return z.g.la.rrPct; }, function (v) { return F.p(v, 1); }],
    ['PSH (Rp/hr)', function (z) { return z.g.la.psh; }, F.n],
    ['Salary % of sales', function (z) { return z.g.la.salPct; }, function (v) { return F.p(v, 1); }],
    ['Rental % of sales', function (z) { return z.g.la.rentPct; }, function (v) { return F.p(v, 1); }]
  ];
  function compare(zs) {
    var up = zs.filter(function (z) { return z.v === 'win' || z.v === 'grow'; }), dn = zs.filter(function (z) { return z.v === 'plat' || z.v === 'weak' || z.v === 'lag'; });
    if (up.length < 2 || dn.length < 2) return '';
    var body = DRV.map(function (d) {
      var a = U.median(up.map(d[1]).filter(isN)), b = U.median(dn.map(d[1]).filter(isN));
      var gap = isN(a) && isN(b) && b !== 0 ? a / b - 1 : NaN;
      return '<tr style="cursor:default"><td class="l"><b>' + esc(d[0]) + '</b></td><td style="background:#f1f9f5">' + d[2](a) + '</td><td>' + d[2](b) + '</td><td class="' + F.cls(gap) + '">' + F.p(gap, 0, true) + '</td></tr>';
    }).join('');
    return '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>What growing zones do differently</h3><p>Median of ' + up.length + ' winning / growing zones vs ' + dn.length + ' plateau / lagging / stalled zones, mature (like-for-like) outlets only. Differences describe the zones; they do not prove cause.</p></div></div>' +
      '<div class="tx"><table><thead><tr><th class="l">Driver</th><th>Winning / growing zones</th><th>Plateau / lagging / stalled zones</th><th>Gap</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }

  /* ---------- tab ---------- */
  B.tabs.geo = {
    render: function (ctx, view) {
      var P = ctx.P;
      if (!P.baseAvailable) {
        view.innerHTML = '<div class="note warn">Geographic analysis needs a full prior-year comparison to judge growth. Pick a period whose prior-year months are in the workbook (from ' + E.monthLabel(ctx.m.baseMin + 12) + ' onwards).</div>';
        return;
      }
      var bd = build(ctx), zs = bd.zones, kecMode = S.geoLevel === 'kec', hb = true;
      var lvl = kecMode ? 'Kecamatan' : 'Kota';
      var cnt = function (v) { return zs.filter(function (z) { return z.v === v; }); };
      var outs = function (a) { return a.reduce(function (s, z) { return s + z.n; }, 0); };
      var plat = cnt('plat'), lag = cnt('lag'), win = cnt('win').concat(cnt('grow')), weak = cnt('weak');
      var noKec = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive' && !r.ol.kec; }).length;

      var ctl = '<div class="geoctl"><div class="seg" id="geoLvl"><button data-v="kec"' + (kecMode ? ' class="on"' : '') + '>Kecamatan</button><button data-v="kota"' + (!kecMode ? ' class="on"' : '') + '>Kota</button></div>' +
        '<label>Show zones with at least <select id="geoMin">' + [1, 2, 3, 5].map(function (n) { return '<option value="' + n + '"' + (S.geoMin === n ? ' selected' : '') + '>' + n + ' outlet' + (n > 1 ? 's' : '') + '</option>'; }).join('') + '</select></label>' +
        '<label>Judge zones with at least <select id="geoJudge">' + [2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (S.geoJudge === n ? ' selected' : '') + '>' + n + ' mature outlets</option>'; }).join('') + '</select></label>' +
        '<span class="geoleg">' + ['plat', 'lag', 'win', 'grow', 'weak'].map(function (k) { return '<span class="gv ' + V[k].c + '">' + V[k].t + '</span>'; }).join('') + '</span></div>';

      var cgTxt = isN(bd.cg) ? F.p(bd.cg, 1, true) : 'n/a';
      var banner = '<div class="note"><b>Geographic analysis.</b> Outlets are grouped by <b>' + lvl + '</b> as recorded in MASTER and compared on ' + esc(P.tag) + ' vs ' + esc(P.baseTag) + ', using mature (like-for-like) outlets so new openings do not distort growth. ' +
        '<b>Context:</b> the company\u2019s like-for-like ' + esc(ctx.rateName) + ' growth in this view is <b>' + cgTxt + '</b> and only <b>' + bd.nStallAll + ' of ' + bd.nLflAll + '</b> mature outlets grew less than ' + F.p(TH.stall, 0) + ', so true plateaus are rare and zones are also judged <i>relative to the company pace</i>. ' +
        '<b>Plateau</b> = at least ' + F.p(TH.stallShare, 0) + ' of a zone\u2019s mature outlets grew under ' + F.p(TH.stall, 0) + ' (or the zone as a whole did). With healthy sales per outlet per day and positive PSH that points to saturation (<i>expansion candidate</i>); with weak productivity it points to an offering or operations problem (<i>fix first</i>). ' +
        '<b>Lagging</b> = growing, but under ' + F.p(TH.lagMult, 0) + ' of the company pace: an early warning. <b>Winning</b> = at least ' + TH.winMult.toFixed(2) + '\u00d7 the company pace with at most ' + F.p(TH.winShare, 0) + ' of outlets flat. Zones need ' + TH.minLfl + '+ mature outlets to be judged. ' +
        '<b>Limits:</b> the workbook has no coordinates, population or competitor data, so a 1\u20132 km radius cannot be measured; treat the list as a shortlist to check on a map. Thresholds are proposed defaults.</div>';

      var cards = '<div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
        B.card('Zones compared', zs.length, esc(lvl) + ' with ' + S.geoMin + '+ outlets \u00b7 ' + outs(zs) + ' outlets') +
        B.card('Plateau \u00b7 expansion candidates', plat.length, outs(plat) + ' outlets \u00b7 productive but flat', plat.length ? 'warnk' : '') +
        B.card('Lagging company growth', lag.length, outs(lag) + ' outlets \u00b7 early saturation watch', lag.length ? 'warnk' : '') +
        B.card('Winning / growing zones', win.length, outs(win) + ' outlets \u00b7 learn from these', win.length ? 'pos' : '') +
        B.card('Stalled \u00b7 fix first', weak.length, outs(weak) + ' outlets \u00b7 weak and flat', weak.length ? 'neg' : '') + '</div>';

      var c = function (key, label, sub, get, fmt, tdc, extra) { return Object.assign({ k: key, label: label, sub: sub, get: get, fmt: fmt, tdc: tdc }, extra || {}); };
      var cols = [
        { k: 'k', label: lvl, left: true, get: function (z) { return z.name; }, fmt: function (z) { return '<div class="nm"><b>' + esc(z.name) + '</b>' + (kecMode ? '<span>' + esc(z.parent) + '</span>' : '') + '</div>'; } },
        c('n', 'Outlets', 'trading', function (z) { return z.n; }, function (z) { return z.n; }),
        c('nl', 'Mature', 'like-for-like', function (z) { return z.nL; }, function (z) { return z.nL; }),
        c('rc', 'Opened', 'last 12 mo', function (z) { return z.recent; }, function (z) { return z.recent || '\u2013'; }),
        c('rev', 'Sales', 'Rp b', function (z) { return z.g.a.rev; }, function (z) { return (z.g.a.rev / 1e9).toFixed(2); }),
        c('spd', 'Sales / outlet / day', 'Rp m, mature', function (z) { return z.spd; }, function (z) { return F.m(z.spd, 2); }),
        c('zg', ctx.rate === 'tx' ? 'LFL tx' : 'LFL sales', 'growth', function (z) { return z.zg; }, function (z) { return F.p(z.zg, 1, true); }, function (z) { return F.cls(z.zg); }),
        c('mom', 'Last 3 months', 'growth', function (z) { return z.mom; }, function (z) { return F.p(z.mom, 1, true); }, function (z) { return F.cls(z.mom); }),
        c('st', 'Flat or declining', '% of mature', function (z) { return z.share; }, function (z) { return isN(z.share) ? F.p(z.share, 0) + ' <small style="color:var(--mute)">(' + z.stalled + '/' + z.nL + ')</small>' : '\u2013'; }, function (z) { return isN(z.share) && z.share >= TH.stallShare ? 'neg' : ''; }),
        c('mg', 'Margin', '', function (z) { return z.g.a.margin; }, function (z) { return F.p(z.g.a.margin, 1); }),
        c('ps', 'PSH', 'Rp/hr', function (z) { return z.g.a.psh; }, function (z) { return F.n(z.g.a.psh); }, function (z) { return F.cls(z.g.a.psh); }),
        { k: 'pat', th: 'pt', cls: 'pt', label: 'PAT', sub: 'Rp m', get: function (z) { return z.g.a.pat; }, fmt: function (z) { return F.m(z.g.a.pat); }, tdc: function (z) { return F.cls(z.g.a.pat); } },
        { k: 'vr', label: 'Signal', left: true, get: function (z) { return V[z.v].rank; }, fmt: function (z) { return pill(z); } }
      ];
      var tbl = B.table('tbl-geo', zs, cols, { defSort: 'vr', defDir: 1, limit: 500 });

      view.innerHTML = banner + ctl + cards +
        '<div class="grid g2" style="margin-top:12px"><div class="card" style="grid-column:span 2"><h4>Growth vs productivity by ' + esc(lvl.toLowerCase()) + '</h4><div class="ch" style="height:360px"><canvas id="geoC"></canvas></div>' +
        '<div class="ks">Each bubble is a ' + esc(lvl.toLowerCase()) + ' (size = number of outlets). Right = faster growth, up = higher sales per mature outlet per day. Top-right zones are winning; bottom-left are weak; the plateau zones sit near zero growth. Zones with fewer than ' + TH.minLfl + ' mature outlets are left out.</div></div></div>' +
        '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>' + esc(lvl) + ' scorecard</h3><p>' + zs.length + ' zones \u00b7 click a zone to see its outlets \u00b7 sortable \u00b7 PAT = PSH \u00d7 hours' + (noKec && kecMode ? ' \u00b7 ' + noKec + ' outlet(s) have no kecamatan in MASTER' : '') + '</p></div><button class="btn" id="expGeo"><i class="fas fa-download"></i> Export</button></div>' + tbl.html + '</div>' +
        compare(zs);

      /* table: sorting is handled by B.table; rows toggle an outlet list */
      tbl.bind(view);
      var t = view.querySelector('#tbl-geo');
      if (t) {
        t.querySelectorAll('tbody tr[data-i]').forEach(function (tr) {
          var z = tbl.rows[+tr.dataset.i];
          tr.onclick = function () { S.geoOpen = S.geoOpen === z.k ? null : z.k; B.render(); };
          if (S.geoOpen === z.k) {
            tr.classList.add('geo-open');
            tr.insertAdjacentHTML('afterend', detail(z, ctx, bd, cols.length));
            var nx = tr.nextElementSibling;
            nx.querySelectorAll('tr[data-o]').forEach(function (r2) { r2.style.cursor = 'pointer'; r2.onclick = function (e) { e.stopPropagation(); B.openOutlet(+r2.dataset.o); }; });
          }
        });
      }
      view.querySelectorAll('#geoLvl button').forEach(function (b) { b.onclick = function () { S.geoLevel = b.dataset.v; S.geoOpen = null; S.sort = null; B.render(); }; });
      view.querySelector('#geoJudge').onchange = function (e) { S.geoJudge = +e.target.value; S.geoOpen = null; B.render(); };
      view.querySelector('#geoMin').onchange = function (e) { S.geoMin = +e.target.value; S.geoOpen = null; B.render(); };
      view.querySelector('#expGeo').onclick = function () {
        B.csv('bod-geographic-' + S.geoLevel + '.csv', [lvl, 'Kota', 'Outlets', 'Mature LFL outlets', 'Opened last 12 months', 'Sales', 'Sales per mature outlet per day', 'LFL growth', 'Last 3 months growth', 'Flat or declining mature outlets', 'Share flat or declining', 'Margin', 'PSH', 'PAT', 'Signal', 'Reading'],
          tbl.all.map(function (z) { return [z.name, z.parent, z.n, z.nL, z.recent, Math.round(z.g.a.rev), isN(z.spd) ? Math.round(z.spd) : '', isN(z.zg) ? z.zg.toFixed(4) : '', isN(z.mom) ? z.mom.toFixed(4) : '', z.stalled, isN(z.share) ? z.share.toFixed(3) : '', isN(z.g.a.margin) ? z.g.a.margin.toFixed(4) : '', isN(z.g.a.psh) ? Math.round(z.g.a.psh) : '', Math.round(z.g.a.pat), V[z.v].t + (z.white ? ' + under-penetrated' : ''), z.why]; }));
      };

      /* bubble chart */
      var plotted = zs.filter(function (z) { return z.nL >= TH.minLfl && isN(z.zg) && isN(z.spd); });
      var order = ['plat', 'lag', 'win', 'grow', 'weak'];
      B.chart('geoC', { type: 'bubble', data: { datasets: order.map(function (k) {
        return { label: V[k].t, backgroundColor: V[k].col + 'b3', borderColor: V[k].col, borderWidth: 1,
          data: plotted.filter(function (z) { return z.v === k; }).map(function (z) { return { x: z.zg * 100, y: z.spd / 1e6, r: Math.max(5, Math.sqrt(z.n) * 4), z: z }; }) };
      }) }, options: {
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
          tooltip: { callbacks: { label: function (c) { var z = c.raw.z; return z.name + (kecMode ? ' (' + z.parent + ')' : '') + ': ' + z.n + ' outlets'; },
            afterLabel: function (c) { var z = c.raw.z; return ['Growth ' + F.p(z.zg, 1, true) + ' \u00b7 sales/outlet/day Rp ' + (z.spd / 1e6).toFixed(2) + 'm', z.stalled + ' of ' + z.nL + ' mature outlets flat or declining']; } } } },
        scales: { x: { title: { display: true, text: 'Mature outlets growth vs last year (%)', font: { size: 10 } }, ticks: { font: { size: 9 }, callback: function (v) { return v + '%'; } }, grid: { color: function (c) { return c.tick && c.tick.value === 0 ? '#8a97a8' : '#eef1f5'; } } },
          y: { title: { display: true, text: 'Sales per mature outlet per day (Rp m)', font: { size: 10 } }, beginAtZero: true, ticks: { font: { size: 9 } } } } } });
    }
  };
})(window);
