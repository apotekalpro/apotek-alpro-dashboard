/* ============================================================================
 * BOD Dashboard - PSH ranking tab
 * Ranks trading outlets by PSH (profitability per staff hour) for the selected period and filters.
 * Period PSH = PAT / working hours summed over the outlet's months in the period, where PAT = PSH x working hours per outlet-month.
 * Rank movement compares with the same ranking built for the prior-year period (same months, one year earlier).
 * ==========================================================================*/
(function (win) {
  'use strict';
  var B = win.BOD, E = B.E, F = B.F, S = B.S, esc = B.esc, isN = B.isN, U = B.util;
  if (!S.pshScope) S.pshScope = 'all';
  if (!S.pshDim) S.pshDim = 'am';

  var BANDS = [
    { k: 'q1', t: 'Top quartile', col: '#0f7a55' },
    { k: 'q2', t: 'Upper middle', col: '#5aa05a' },
    { k: 'q3', t: 'Lower middle', col: '#e0b24a' },
    { k: 'q4', t: 'Bottom quartile', col: '#b5303b' }
  ];
  var DIMS = {
    am: ['Area manager', function (o) { return o.am || 'N/A'; }],
    type: ['Outlet type', function (o) { return o.type || 'N/A'; }],
    size: ['Store size', function (o) { return B.sizeKey(o); }],
    city: ['Kota', function (o) { return o.city || 'N/A'; }],
    prov: ['Province', function (o) { return o.prov || 'N/A'; }]
  };

  function rankSet(rows, scope, minM) {
    var arr = rows.filter(function (r) {
      return r.cat !== 'inactive' && r.A.patOM >= minM && isN(r.A.psh) && (scope === 'all' || r.cat !== 'new');
    });
    arr.sort(function (a, b) { return b.A.psh - a.A.psh; });
    return arr;
  }
  function bandOf(i, n) { var q = n ? i / n : 0; return q < 0.25 ? 'q1' : q < 0.5 ? 'q2' : q < 0.75 ? 'q3' : 'q4'; }
  function bandPill(w) {
    var b = BANDS.filter(function (x) { return x.k === w.band; })[0];
    return '<span class="gv ' + w.band + '">' + b.t + '</span>' + (w.A.psh <= 0 ? '<span class="gv loss">Loss-making</span>' : '');
  }
  function status(r) { return r.cat === 'new' ? 'New \u00b7 month ' + r.age : r.cat === 'lfl' ? 'Mature' : 'Mature (no prior base)'; }

  B.tabs.psh = {
    render: function (ctx, view) {
      var m = ctx.m, P = ctx.P, endT = P.cur[P.cur.length - 1];
      var minM = 1; // the period selected at the top is the only control: any outlet with PSH data in it is ranked (months shown per outlet)
      var ranked = rankSet(ctx.rowsF, S.pshScope, minM), n = ranked.length;
      var allTrading = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive'; }).length;

      /* prior-period rank over the same rule set */
      var prior = {}, hasPrior = P.baseAvailable;
      if (hasPrior) {
        var pr = ctx.rowsF.filter(function (r) { return r.cat !== 'inactive' && r.B.patOM >= minM && isN(r.B.psh) && (S.pshScope === 'all' || r.cat !== 'new'); });
        pr.sort(function (a, b) { return b.B.psh - a.B.psh; });
        pr.forEach(function (r, i) { prior[r.o] = i + 1; });
      }
      var W = ranked.map(function (r, i) {
        var w = Object.create(r);
        w.rk = i + 1; w.band = bandOf(i, n);
        w.hrs = r.A.patOM > 0 ? r.A.wh / r.A.patOM : NaN;
        w.dPsh = isN(r.B.psh) && r.B.patOM >= minM ? r.A.psh - r.B.psh : NaN;
        w.pRank = prior[r.o] || NaN;
        w.move = isN(w.pRank) ? w.pRank - w.rk : NaN;
        return w;
      });
      var vals = W.map(function (w) { return w.A.psh; });
      var med = U.median(vals);
      var q = function (k) { return W.filter(function (w) { return w.band === k; }); };
      var pooled = function (a) { return a.length ? E.agg(m, a.map(function (w) { return w.o; }), P.cur).psh : NaN; };
      var top = q('q1'), bot = q('q4'), loss = W.filter(function (w) { return w.A.psh <= 0; });
      var cp = null;
      if (!B.isFiltered() && B.exec) { try { cp = E.companyPsh(m, B.exec, P.cur); } catch (e) { cp = null; } }
      var coPsh = cp && isN(cp.v) ? cp.v : pooled(W);
      var topP = pooled(top), botP = pooled(bot);

      var ctl = '<div class="geoctl"><div class="seg" id="pshScope"><button data-v="all"' + (S.pshScope === 'all' ? ' class="on"' : '') + '>All trading outlets</button><button data-v="mature"' + (S.pshScope === 'mature' ? ' class="on"' : '') + '>Mature only (exclude new)</button></div>' +
        '<span class="hint" style="margin:0 8px">Period: <b>'+esc(P.tag)+'</b> ('+P.cur.length+' month'+(P.cur.length>1?'s':'')+', '+esc(E.monthShort(P.cur[0]))+(P.cur.length>1?' \u2013 '+esc(E.monthShort(endT)):'')+') \u00b7 change it with the Year / Period filters above</span>' +
        '<span class="geoleg">' + BANDS.map(function (b) { return '<span class="gv ' + b.k + '">' + b.t + '</span>'; }).join('') + '</span></div>';

      var banner = '<div class="note"><b>PSH ranking, ' + esc(P.tag) + '.</b> Outlets are ranked from the highest to the lowest <b>PSH (profit per staff hour)</b> over the selected period and filters: period PSH = PAT \u00f7 working hours across the months in the period (PAT = PSH \u00d7 working hours per outlet-month), so a strong month does not outweigh a weak one unless it has more hours. ' +
        'Quartile bands split the ranked outlets into four equal groups. ' + (hasPrior ? '<b>Rank move</b> compares with the same ranking for ' + esc(P.baseTag) + ' (positive = moved up); it is blank when the outlet had too little PSH data then. ' : 'Prior-year ranking is not available for this selection, so rank movement is blank. ') +
        'Every outlet with PSH data in the period is ranked (the Months column shows how many of the ' + P.cur.length + ' months each one has, so an outlet with 1 month is ranked on that month only)' + (S.pshScope === 'mature' ? '; outlets within ' + E.NEW_MONTHS + ' months of opening are left out' : '') + '. Outlets with no PSH data in the period are left out' + (allTrading - n > 0 ? ' (' + (allTrading - n) + ' of ' + allTrading + ' trading outlets)' : '') + '. New outlets are still ramping up, so read their rank with care.</div>';

      var cards = '<div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">' +
        B.card('Outlets ranked', n, 'of ' + allTrading + ' trading outlets') +
        B.card('Company PSH', F.n(coPsh), 'Rp per staff hour, ' + esc(P.tag) + (cp && cp.src === 'sheet' ? ' \u00b7 Exec Dashboard' : ' \u00b7 ranked outlets pooled'), F.cls(coPsh) === 'neg' ? 'neg' : '') +
        B.card('Median outlet PSH', F.n(med), 'Rp per staff hour', F.cls(med) === 'neg' ? 'neg' : '') +
        B.card('Top vs bottom quartile', F.n(topP) + ' <small>vs</small> ' + F.n(botP), 'pooled PSH, Rp/hr' + (isN(topP) && isN(botP) && botP > 0 ? ' \u00b7 ' + (topP / botP).toFixed(1) + '\u00d7 gap' : '')) +
        B.card('Loss-making outlets', loss.length, 'PSH of zero or below' + (n ? ' \u00b7 ' + F.p(loss.length / n, 0) + ' of ranked' : ''), loss.length ? 'neg' : 'pos') + '</div>';

      var c = function (key, label, sub, get, fmt, tdc, extra) { return Object.assign({ k: key, label: label, sub: sub, get: get, fmt: fmt, tdc: tdc }, extra || {}); };
      var cols = [
        c('rk', 'Rank', 'by PSH', function (w) { return w.rk; }, function (w) { return '<b>' + w.rk + '</b><small style="color:var(--mute)"> /' + n + '</small>'; }),
        { k: 'nm', label: 'Outlet', left: true, get: function (w) { return w.ol.name; }, fmt: function (w) { return '<div class="nm"><b>' + esc(w.ol.name) + '</b><span>' + esc(w.ol.code) + ' \u00b7 ' + esc(w.ol.type) + '</span></div>'; } },
        { k: 'am', label: 'Area manager', left: true, get: function (w) { return w.ol.am; }, fmt: function (w) { return esc(w.ol.am); } },
        { k: 'ct', label: 'Kota', left: true, get: function (w) { return w.ol.city || ''; }, fmt: function (w) { return esc(w.ol.city || '\u2013'); } },
        { k: 'st', label: 'Status', left: true, get: function (w) { return w.cat === 'new' ? 0 : 1; }, fmt: function (w) { return status(w); } },
        c('ps', 'PSH', esc(P.tag) + ' \u00b7 Rp/hr', function (w) { return w.A.psh; }, function (w) { return '<b>' + F.n(w.A.psh) + '</b>'; }, function (w) { return F.cls(w.A.psh); }),
        c('pb', 'PSH', hasPrior ? esc(P.baseTag) + ' \u00b7 Rp/hr' : 'prior year', function (w) { return w.B.patOM >= minM ? w.B.psh : NaN; }, function (w) { return w.B.patOM >= minM ? F.n(w.B.psh) : '\u2013'; }, function (w) { return w.B.patOM >= minM ? F.cls(w.B.psh) : ''; }),
        c('dp', 'Change', 'Rp/hr', function (w) { return w.dPsh; }, function (w) { return isN(w.dPsh) ? (w.dPsh > 0 ? '+' : w.dPsh < 0 ? '\u2212' : '') + F.n(Math.abs(w.dPsh)) : '\u2013'; }, function (w) { return F.cls(w.dPsh); }),
        c('mv', 'Rank move', 'vs prior', function (w) { return w.move; }, function (w) { return isN(w.move) ? (w.move > 0 ? '\u25b2 ' + w.move : w.move < 0 ? '\u25bc ' + Math.abs(w.move) : '=') : '\u2013'; }, function (w) { return F.cls(w.move); }),
        c('pl', E.monthShort(endT) + ' PSH', 'latest month', function (w) { return w.pshLast; }, function (w) { return F.n(w.pshLast); }, function (w) { return F.cls(w.pshLast); }),
        c('rev', 'Sales', 'Rp m', function (w) { return w.A.rev; }, function (w) { return F.m(w.A.rev, 1); }),
        c('mg', 'Margin', '', function (w) { return w.A.margin; }, function (w) { return F.p(w.A.margin, 1); }),
        c('hr', 'Staff hours', 'per month', function (w) { return w.hrs; }, function (w) { return F.n(w.hrs); }),
        { k: 'pat', th: 'pt', cls: 'pt', label: 'PAT', sub: 'Rp m', get: function (w) { return w.A.pat; }, fmt: function (w) { return F.m(w.A.pat); }, tdc: function (w) { return F.cls(w.A.pat); } },
        c('mo', 'Months', 'with PSH', function (w) { return w.A.patOM; }, function (w) { return w.A.patOM + '/' + w.nMonths; }),
        { k: 'bd', label: 'Band', left: true, get: function (w) { return w.rk; }, fmt: function (w) { return bandPill(w); } }
      ];
      var tbl = B.table('tbl-psh', W, cols, { defSort: 'rk', defDir: 1, limit: 500 });

      /* grouped ranking */
      var dim = DIMS[S.pshDim] || DIMS.am, grp = {};
      W.forEach(function (w) { var k = dim[1](w.ol); (grp[k] = grp[k] || []).push(w); });
      var gl = Object.keys(grp).map(function (k) {
        var a = grp[k], g = E.agg(m, a.map(function (w) { return w.o; }), P.cur);
        var pg = null;
        if (hasPrior) { var gb = E.agg(m, a.filter(function (w) { return w.B.patOM >= minM; }).map(function (w) { return w.o; }), P.base); pg = gb.wh > 0 ? gb.psh : NaN; }
        return { k: k, n: a.length, psh: g.psh, med: U.median(a.map(function (w) { return w.A.psh; })), pat: g.pat, prior: pg, loss: a.filter(function (w) { return w.A.psh <= 0; }).length, q1: a.filter(function (w) { return w.band === 'q1'; }).length, q4: a.filter(function (w) { return w.band === 'q4'; }).length };
      }).sort(function (a, b) { return (isN(b.psh) ? b.psh : -1e18) - (isN(a.psh) ? a.psh : -1e18); });
      var gbody = gl.map(function (g, i) {
        var d = isN(g.prior) && isN(g.psh) ? g.psh - g.prior : NaN;
        return '<tr style="cursor:default"><td><b>' + (i + 1) + '</b></td><td class="l"><b>' + esc(g.k) + '</b></td><td>' + g.n + '</td><td class="' + F.cls(g.psh) + '"><b>' + F.n(g.psh) + '</b></td><td class="' + F.cls(g.med) + '">' + F.n(g.med) + '</td>' +
          '<td class="' + F.cls(g.prior) + '">' + (hasPrior ? F.n(g.prior) : '\u2013') + '</td><td class="' + F.cls(d) + '">' + (isN(d) ? (d > 0 ? '+' : d < 0 ? '\u2212' : '') + F.n(Math.abs(d)) : '\u2013') + '</td>' +
          '<td>' + (g.q1 || '\u2013') + '</td><td>' + (g.q4 || '\u2013') + '</td><td class="' + (g.loss ? 'neg' : '') + '">' + (g.loss || '\u2013') + '</td><td class="pt ' + F.cls(g.pat) + '">' + F.m(g.pat) + '</td></tr>';
      }).join('');
      var gseg = '<div class="seg" id="pshDim">' + Object.keys(DIMS).map(function (k) { return '<button data-v="' + k + '"' + (S.pshDim === k ? ' class="on"' : '') + '>' + DIMS[k][0] + '</button>'; }).join('') + '</div>';
      var gtable = '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>PSH ranking by ' + esc(dim[0].toLowerCase()) + '</h3><p>Pooled PSH of the ranked outlets in each group (total PAT \u00f7 total staff hours), ' + esc(P.tag) + '. Top / bottom = outlets in the top / bottom quartile of the ranking.</p></div>' + gseg + '</div>' +
        '<div class="tx"><table><thead><tr><th>#</th><th class="l">' + esc(dim[0]) + '</th><th>Outlets</th><th>PSH<small>Rp/hr</small></th><th>Median outlet<small>Rp/hr</small></th><th>Prior PSH<small>Rp/hr</small></th><th>Change<small>Rp/hr</small></th><th>In top quartile</th><th>In bottom quartile</th><th>Loss-making</th><th class="pt">PAT<small>Rp m</small></th></tr></thead><tbody>' + (gbody || '<tr><td colspan="11" class="empty">No outlets ranked.</td></tr>') + '</tbody></table></div></div>';

      view.innerHTML = banner + ctl + cards +
        '<div class="grid g2" style="margin-top:12px"><div class="card" style="grid-column:span 2"><h4>Highest and lowest PSH outlets, ' + esc(P.tag) + '</h4><div class="ch" style="height:' + (n > 20 ? 440 : Math.max(200, 24 * n + 60)) + 'px"><canvas id="pshC"></canvas></div><div class="ks">Top 10 (green) and bottom 10 (red) of the ' + n + ' ranked outlets, Rp per staff hour' + (n > 20 ? '. The full list is in the table below.' : '.') + '</div></div></div>' +
        '<div class="tw" style="margin-top:12px"><div class="th"><div><h3>Outlet PSH ranking</h3><p>' + n + ' outlets \u00b7 click a column to re-sort (rank stays tied to PSH) \u00b7 click an outlet for its history</p></div><div style="display:flex;gap:8px;align-items:center">' + B.searchBox() + '<button class="btn" id="expPsh"><i class="fas fa-download"></i> Export</button></div></div>' + tbl.html + '</div>' + gtable;

      tbl.bind(view); B.bindSearch(view);
      view.querySelectorAll('#pshScope button').forEach(function (b) { b.onclick = function () { S.pshScope = b.dataset.v; S.sort = null; B.render(); }; });
      view.querySelectorAll('#pshDim button').forEach(function (b) { b.onclick = function () { S.pshDim = b.dataset.v; B.render(); }; });
      view.querySelector('#expPsh').onclick = function () {
        B.csv('bod-psh-ranking.csv', ['Rank', 'Code', 'Outlet', 'Type', 'Area manager', 'Province', 'Kota', 'Kecamatan', 'Status', 'Opened', 'PSH (period)', 'PSH (prior period)', 'Change', 'Prior rank', 'Rank move', 'PSH latest month', 'Sales', 'Margin', 'Staff hours per month', 'PAT', 'Months with PSH', 'Band', 'Loss-making'],
          tbl.all.map(function (w) { return [w.rk, w.ol.code, w.ol.name, w.ol.type, w.ol.am, w.ol.prov, w.ol.city, w.ol.kec, status(w), w.ol.start ? new Date(w.ol.start).toISOString().slice(0, 10) : '', Math.round(w.A.psh), w.B.patOM >= minM && isN(w.B.psh) ? Math.round(w.B.psh) : '', isN(w.dPsh) ? Math.round(w.dPsh) : '', isN(w.pRank) ? w.pRank : '', isN(w.move) ? w.move : '', isN(w.pshLast) ? Math.round(w.pshLast) : '', Math.round(w.A.rev), isN(w.A.margin) ? w.A.margin.toFixed(4) : '', isN(w.hrs) ? Math.round(w.hrs) : '', Math.round(w.A.pat), w.A.patOM, BANDS.filter(function (b) { return b.k === w.band; })[0].t, w.A.psh <= 0 ? 'yes' : '']; }));
      };

      /* chart */
      var pick = n > 20 ? W.slice(0, 10).concat(W.slice(-10)) : W;
      B.chart('pshC', { type: 'bar', data: { labels: pick.map(function (w) { return '#' + w.rk + ' ' + w.ol.name; }),
        datasets: [{ data: pick.map(function (w) { return w.A.psh; }), backgroundColor: pick.map(function (w) { return BANDS.filter(function (b) { return b.k === w.band; })[0].col + 'cc'; }) }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { var w = pick[c.dataIndex]; return 'PSH Rp ' + F.n(w.A.psh) + '/hr \u00b7 ' + status(w); }, afterLabel: function (c) { var w = pick[c.dataIndex]; return [w.ol.am + ' \u00b7 ' + (w.ol.city || ''), 'PAT Rp ' + F.m(w.A.pat) + 'm \u00b7 ' + w.A.patOM + ' months']; } } } },
          scales: { x: { ticks: { font: { size: 9 }, callback: function (v) { return F.n(v); } } }, y: { ticks: { font: { size: 9 }, autoSkip: false } } } } });
    }
  };
})(window);
