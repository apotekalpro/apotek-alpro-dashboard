/* ============================================================================
 * BOD Dashboard - core: access gate, data loading, filters, shared UI helpers
 * ==========================================================================*/
(function (win) {
  'use strict';
  var E = win.BODEngine;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var isN = function (v) { return typeof v === 'number' && v === v && isFinite(v); };

  /* ---------- formatters ---------- */
  var F = {
    n: function (v, d) { return isN(v) ? (d ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : nf0.format(v)) : '\u2013'; },
    m: function (v, d) { return isN(v) ? (v / 1e6).toLocaleString('en-US', { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d }) : '\u2013'; },
    rp: function (v, d) {
      if (!isN(v)) return '\u2013'; var a = Math.abs(v), s = v < 0 ? '\u2212' : '';
      d = d == null ? 2 : d;
      if (a >= 1e9) return s + 'Rp ' + (a / 1e9).toFixed(d) + 'b';
      if (a >= 1e6) return s + 'Rp ' + (a / 1e6).toFixed(1) + 'm';
      return s + 'Rp ' + nf0.format(a);
    },
    p: function (v, d, sign) {
      if (!isN(v)) return '\u2013'; d = d == null ? 1 : d; var x = v * 100;
      var t = Math.abs(x).toFixed(d); var neg = x < 0 && +t !== 0;
      return (neg ? '\u2212' : (sign && +t !== 0 ? '+' : '')) + t + '%';
    },
    pp: function (v) { if (!isN(v)) return '\u2013'; var x = v * 100; return (x < 0 ? '\u2212' : '+') + Math.abs(x).toFixed(2) + ' pp'; },
    d: function (ms) { if (!ms) return '\u2013'; var d = new Date(ms); return ('0' + d.getUTCDate()).slice(-2) + ' ' + E.MN[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); },
    cls: function (v) { return !isN(v) ? '' : v < 0 ? 'neg' : v > 0 ? 'pos' : ''; }
  };

  /* ---------- state ---------- */
  var S = { basis: 'FY', year: null, period: 'FY', month: null, rate: 'rev', type: '', am: '', prov: '', city: '', tab: 'overview', level: null, sort: null, search: '' };
  var B = { S: S, F: F, esc: esc, isN: isN, E: E, model: null, exec: null, fetchedAt: null, source: '', ctx: null, tabs: {}, charts: [] };
  win.BOD = B;

  /* ---------- access gate: Chief, or users with BOD ticked in Admin Config ---------- */
  var JWT_SECRET = 'alpro_jwt_secret_2024_secure', ALLOWED_ROLES = ['chief'];
  function b64u(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; return atob(str); }
  async function verifyStoredJwt() {
    try {
      var raw = localStorage.getItem('alpro_session'); if (!raw) return null;
      var tok = JSON.parse(raw).accessToken; if (!tok) return null;
      var p = tok.split('.'); if (p.length !== 3) return null;
      var key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      var sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(p[0] + '.' + p[1]));
      var exp = btoa(String.fromCharCode.apply(null, new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      if (exp !== p[2]) return null;
      var pl = JSON.parse(b64u(p[1]));
      if (pl.exp && pl.exp * 1000 < Date.now()) return { expired: true, payload: pl };
      return { payload: pl };
    } catch (e) { return null; }
  }
  async function checkAccess() {
    // 1) embedded in the Executive Dashboard (same origin): trust the live session of the parent window
    try {
      if (win.parent && win.parent !== win && win.parent.currentUserRole) {
        var r = String(win.parent.currentUserRole).toLowerCase();
        B.user = { email: win.parent.currentUser, role: r };
        // the Executive Dashboard decides (Chief, or BOD ticked on this user); fall back to role only
        if (typeof win.parent.canAccessBod === 'function') return !!win.parent.canAccessBod();
        return ALLOWED_ROLES.indexOf(r) >= 0;
      }
    } catch (e) { /* cross-origin parent: fall through */ }
    // 2) opened directly: validate the signed session token written by the dashboard login
    var v = await verifyStoredJwt();
    if (v && v.payload) {
      var role = String(v.payload.role || '').toLowerCase();
      B.user = { email: v.payload.email, role: role };
      if (v.expired) { B.expired = true; return false; }
      return ALLOWED_ROLES.indexOf(role) >= 0 || v.payload.bod === true;
    }
    return false;
  }

  /* ---------- data loading ---------- */
  function timeoutFetch(url, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms);
    return fetch(url, { signal: c.signal, cache: 'no-store' }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
  }
  // Drop Exec Dashboard columns beyond the latest MASTER month (a pre-filled future column must not show).
  B.trimExec = function () {
    var ex = B.exec, m = B.model; if (!ex || !m) return;
    var keep = 0; ex.months.forEach(function (t, i) { if (t <= m.latest) keep = i + 1; });
    ex.months = ex.months.slice(0, keep);
    Object.keys(ex.rows).forEach(function (k) { ex.rows[k] = ex.rows[k].slice(0, keep); });
  };
  // true when any outlet filter (type / AM / province) narrows the company
  B.isFiltered = function () { return !!(S.type || S.am || S.prov || S.city); };
  async function loadData(force) {
    var view = $('view');
    view.innerHTML = '<div class="loading"><div class="spin"></div>Loading MASTER and Exec Dashboard from the source workbook&hellip;</div>';
    try {
      var res = await Promise.all([timeoutFetch(E.masterUrl(), 60000), timeoutFetch(E.execUrl(), 30000)]);
      B.model = E.parseMaster(E.parseGviz(res[0]));
      B.exec = E.parseExec(E.parseGviz(res[1]));
      B.trimExec();
      B.fetchedAt = new Date(); B.source = 'live';
    } catch (err) {
      var snap = null;
      try { var r = await fetch('bod-data-snapshot.json', { cache: 'no-store' }); if (r.ok) snap = await r.json(); } catch (e2) { /* none */ }
      if (!snap) {
        view.innerHTML = '<div class="note err"><b>Could not load the source workbook.</b> ' + esc(err.message) +
          '<br>Check that the Google Sheet is still shared as &ldquo;Anyone with the link can view&rdquo;, then press Refresh.</div>';
        return false;
      }
      var o = E.fromSnapshot(snap); B.model = o.model; B.exec = o.exec; B.trimExec(); B.fetchedAt = new Date(o.fetchedAt); B.source = 'snapshot';
    }
    return true;
  }

  /* ---------- filters ---------- */
  function uniq(arr) { var m = {}; arr.forEach(function (x) { m[x] = (m[x] || 0) + 1; }); return Object.keys(m).sort(); }
  function fillSelect(id, items, all, cur) {
    var el = $(id); el.innerHTML = '<option value="">' + all + '</option>' + items.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  // Kota list follows the selected province (and is cleared if the chosen Kota is not in it)
  function fillCities() {
    var ol = B.model.outlets.filter(function (o) { return !S.prov || o.prov === S.prov; });
    var list = uniq(ol.map(function (o) { return o.city; }).filter(Boolean));
    if (S.city && list.indexOf(S.city) < 0) S.city = '';
    fillSelect('fCity', list, 'All kota', S.city);
  }
  B.syncFilters = function () {
    fillCities(); ['fType', 'fAm', 'fProv', 'fCity'].forEach(function (id) { var k = id === 'fType' ? 'type' : id === 'fAm' ? 'am' : id === 'fProv' ? 'prov' : 'city'; if ($(id)) $(id).value = S[k] || ''; });
  };
  function buildControls() {
    var m = B.model, ys = {}, t;
    for (t = m.min; t <= m.latest; t++) ys[E.yearOf(S.basis, t)] = 1;
    var years = Object.keys(ys).map(Number).sort(function (a, b) { return b - a; });
    if (!S.year || years.indexOf(S.year) < 0) S.year = years[0];
    $('fYear').innerHTML = years.map(function (y) { return '<option value="' + y + '"' + (y === S.year ? ' selected' : '') + '>' + E.yearLabel(S.basis, y) + '</option>'; }).join('');
    // period names show the real months, e.g. "Full period (Jan\u2013Oct \u00b7 to date)"; running 12 months follows the latest month
    var ps = ['FY', 'H1', 'H2', 'Q1', 'Q2', 'Q3', 'Q4'].map(function (k) { return [k, E.periodName(S.basis, k, S.year, m.latest, m.baseMin)]; });
    ps.push(['R12', 'Running 12 months (' + E.monthShort(m.latest - 11) + ' \u2013 ' + E.monthShort(m.latest) + ')'], ['M', 'Single month']);
    $('fPeriod').innerHTML = ps.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === S.period ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
    var ms = []; for (t = m.latest; t >= m.min + 12; t--) ms.push(t);
    if (!S.month) S.month = m.latest;
    $('fMonth').innerHTML = ms.map(function (x) { return '<option value="' + x + '"' + (x === S.month ? ' selected' : '') + '>' + E.monthLabel(x) + '</option>'; }).join('');
    $('lMonth').classList.toggle('hidden', S.period !== 'M');
    var ol = m.outlets;
    fillSelect('fType', uniq(ol.map(function (o) { return o.type; })), 'All types', S.type);
    fillSelect('fAm', uniq(ol.map(function (o) { return o.am; })), 'All area managers', S.am);
    fillSelect('fProv', uniq(ol.map(function (o) { return o.prov; })), 'All provinces', S.prov);
    fillCities();
  }
  function wire() {
    function onChange(fn) { return function (e) { fn(e.target.value); B.render(); }; }
    $('fYear').onchange = function (e) { S.year = +e.target.value; S.level = null; buildControls(); B.render(); };
    $('fPeriod').onchange = function (e) { S.period = e.target.value; $('lMonth').classList.toggle('hidden', S.period !== 'M'); S.level = null; B.render(); };
    $('fMonth').onchange = onChange(function (v) { S.month = +v; });
    $('fType').onchange = onChange(function (v) { S.type = v; });
    $('fAm').onchange = onChange(function (v) { S.am = v; });
    $('fProv').onchange = function (e) { S.prov = e.target.value; fillCities(); S.level = null; B.render(); };
    $('fCity').onchange = onChange(function (v) { S.city = v; });
    $('fRate').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return; S.rate = b.dataset.v; S.level = null;
      [].forEach.call($('fRate').children, function (x) { x.classList.toggle('on', x === b); }); B.render();
    };
    $('btnRefresh').onclick = function () { B.reload(); };
    $('btnNotes').onclick = function () { B.openNotes(); };
    $('tabs').onclick = function (e) { var b = e.target.closest('.tab'); if (!b) return; S.tab = b.dataset.t; S.level = null; S.sort = null; B.render(); };
  }

  /* ---------- context ---------- */
  function pass(o) {
    return (!S.type || o.type === S.type) && (!S.am || o.am === S.am) && (!S.prov || o.prov === S.prov) && (!S.city || o.city === S.city);
  }
  function buildCtx() {
    var m = B.model;
    var P = E.resolvePeriod(m, { basis: S.basis, year: S.year, period: S.period, month: S.month });
    var rows = E.evaluate(m, P, S.rate);
    var rowsF = rows.filter(function (r) { return pass(r.ol); });
    var ctx = { m: m, P: P, rows: rows, rowsF: rowsF, rate: S.rate };
    ctx.down = rowsF.filter(function (r) { return r.cat === 'lfl' && r.dir === 'down'; });
    ctx.up = rowsF.filter(function (r) { return r.cat === 'lfl' && r.dir === 'up'; });
    ctx.neu = rowsF.filter(function (r) { return r.cat === 'new'; });
    ctx.nc = rowsF.filter(function (r) { return r.cat === 'nc'; });
    ctx.lfl = rowsF.filter(function (r) { return r.cat === 'lfl'; });
    ctx.rateName = S.rate === 'tx' ? 'transactions' : 'sales';
    return ctx;
  }

  /* ---------- tabs / render ---------- */
  var TAB_LIST = [
    ['overview', 'Overview'], ['down', 'Declining stores'], ['up', 'Improving stores'], ['new', 'New outlets'],
    ['growth', 'Financial growth'], ['am', 'Area managers'], ['psh', 'PSH ranking'], ['geo', 'Geographic analysis'], ['size', 'Store size & profitability'], ['watch', 'Watchlist & alerts'], ['win', 'Winning formula']
  ];
  function destroyCharts() { B.charts.forEach(function (c) { try { c.destroy(); } catch (e) { /* noop */ } }); B.charts = []; }
  B.chart = function (id, cfg) {
    var el = $(id); if (!el || !win.Chart) return null;
    cfg.options = cfg.options || {}; cfg.options.maintainAspectRatio = false; cfg.options.responsive = true;
    var c = new win.Chart(el.getContext('2d'), cfg); B.charts.push(c); return c;
  };
  B.render = function () {
    if (!B.model) return;
    destroyCharts();
    var ctx = B.ctx = buildCtx(), P = ctx.P;
    $('pTag').textContent = P.tag || ''; $('pRange').textContent = P.cur.length ? P.label.replace(/^[^\u00b7]*\u00b7\s*/, '') : 'No data';
    $('subtitle').textContent = 'Growth is running year-on-year: ' + (P.tag || '') + ' vs ' + (P.baseTag || '') + ', same months. Levels are driven by ' + ctx.rateName + '.';
    var badge = { down: ctx.down.length, up: ctx.up.length, 'new': ctx.neu.length };
    var TI = { overview: 'fa-gauge-high', down: 'fa-arrow-trend-down', up: 'fa-arrow-trend-up', 'new': 'fa-store', growth: 'fa-chart-line', am: 'fa-user-tie', psh: 'fa-ranking-star', geo: 'fa-map-location-dot', size: 'fa-ruler-combined', watch: 'fa-flag', win: 'fa-trophy' };
    var BC = { down: 'dn', up: 'up', 'new': 'nw' };
    $('tabs').innerHTML = TAB_LIST.map(function (t) {
      return '<button class="tab' + (S.tab === t[0] ? ' on' : '') + '" data-t="' + t[0] + '"><i class="fas ' + (TI[t[0]] || 'fa-circle') + ' ti"></i>' + t[1] + (badge[t[0]] != null ? '<span class="n ' + (BC[t[0]] || '') + '">' + badge[t[0]] + '</span>' : '') + '</button>';
    }).join('');
    var bn = '';
    if (!P.cur.length) bn = '<div class="note warn"><b>No data for this selection.</b> The workbook has no months in the chosen year/period yet.</div>';
    else if (!P.baseAvailable) bn = '<div class="note warn"><b>No prior-year comparison.</b> The workbook\'s comparable history starts ' + esc(E.monthLabel(B.model.baseMin)) + ' (the first month looks like a part-month), so ' + esc(P.baseTag) + ' cannot be built for this selection. Totals are shown; growth levels need a period with prior-year months in the workbook (e.g. FY2025 Half-year 2, or anything in FY2026).</div>' + (P.startLimited ? '<div class="note"><b>' + esc(P.tag) + ' covers ' + esc(E.monthLabel(P.cur[0])) + ' \u2013 ' + esc(E.monthLabel(P.cur[P.cur.length - 1])) + ' only</b>: the workbook has no reliable data before ' + esc(E.monthLabel(B.model.baseMin)) + '.</div>' : '');
    else if (P.partial) bn = '<div class="note warn"><b>Year to date.</b> ' + esc(P.tag) + ' has ' + P.cur.length + ' month(s) so far; each is compared with the same months a year earlier.</div>';
    if (B.source === 'snapshot') bn += '<div class="note warn"><b>Offline snapshot.</b> Live workbook unreachable; showing data saved ' + esc(B.fetchedAt.toISOString().slice(0, 16).replace('T', ' ')) + '.</div>';
    $('banner').innerHTML = bn;
    $('foot').innerHTML = 'Source: Google Sheet (MASTER, Exec Dashboard rows 9\u201325) \u00b7 loaded ' + B.fetchedAt.toLocaleString() + ' (' + B.source + ') \u00b7 latest month: ' + E.monthLabel(B.model.latest) +
      ' \u00b7 PAT = PSH \u00d7 working hours per outlet-month \u00b7 amounts in Rupiah.';
    var t = B.tabs[S.tab] || B.tabs.overview;
    var v = $('view'); v.innerHTML = '';
    t.render(ctx, v);
  };
  B.reload = async function () {
    var ok = await loadData(true); if (!ok) return; buildControls(); B.render();
  };

  /* ---------- shared UI building blocks ---------- */
  var LV_COL = { down: { 5: 'var(--l5)', 4: 'var(--l4)', 3: 'var(--l3)', 2: 'var(--l2)', 1: 'var(--l1)' }, up: { 5: 'var(--up5)', 4: 'var(--up4)', 3: 'var(--up3)', 2: 'var(--up2)', 1: 'var(--up1)' } };
  B.levelCards = function (ctx, dir) {
    var list = dir === 'down' ? ctx.down : ctx.up, h = '';
    for (var L = 5; L >= 1; L--) {
      var sub = list.filter(function (r) { return r.level === L; });
      var avg = sub.length ? sub.reduce(function (a, r) { return a + r.rate; }, 0) / sub.length : NaN;
      h += '<button class="lc' + (S.level === L ? ' on' : '') + '" data-lv="' + L + '" style="--c:' + LV_COL[dir][L] + '"><div class="l">LEVEL ' + L + '</div><div class="d">' + E.LEVEL_TXT[dir][L] +
        '</div><div class="big">' + sub.length + '<small>outlets</small></div><div class="f"><b>' + (sub.length ? F.p(avg, 2, dir === 'up') : '\u2013') + '</b><span>average ' + (dir === 'down' ? 'decline' : 'growth') + '</span></div></button>';
    }
    return '<div class="sec"><h3>' + (dir === 'down' ? 'Decline levels' : 'Improvement levels') + '<small>' + (dir === 'down' ? 'Most severe \u2192 mildest' : 'Strongest \u2192 mildest') + '</small></h3>' +
      '<a data-lv="all">All levels \u00b7 ' + list.length + ' outlets</a></div><div class="lv" id="lvRow">' + h + '</div>' +
      '<div class="hint">Level cards show the full cohort. Select a card to filter the table below. Levels use ' + (ctx.rate === 'tx' ? 'transaction' : 'sales') + ' growth, ' + esc(ctx.P.tag) + ' vs ' + esc(ctx.P.baseTag) + '.</div>';
  };
  B.bindLevels = function (root) {
    root.querySelectorAll('[data-lv]').forEach(function (el) {
      el.onclick = function () { var v = el.dataset.lv; S.level = v === 'all' ? null : (S.level === +v ? null : +v); S.sort = null; B.render(); };
    });
  };
  B.card = function (title, val, sub, cls) { return '<div class="card"><h4>' + title + '</h4><div class="kv ' + (cls || '') + '">' + val + '</div><div class="ks">' + (sub || '') + '</div></div>'; };

  // Sortable outlet table. cols: [{k,label,sub,cls,th,get(r)->sortVal,fmt(r)->html}]
  B.table = function (id, rows, cols, opts) {
    opts = opts || {};
    var sort = S.sort && S.sort.id === id ? S.sort : (opts.defSort ? { id: id, k: opts.defSort, dir: opts.defDir || 1 } : null);
    var col = sort ? cols.filter(function (c) { return c.k === sort.k; })[0] : null;
    var arr = rows.slice();
    if (S.search) { var q = S.search.toLowerCase(); arr = arr.filter(function (r) { return (r.ol.name + ' ' + r.ol.code + ' ' + r.ol.am).toLowerCase().indexOf(q) >= 0; }); }
    if (col) arr.sort(function (a, b) {
      var x = col.get(a), y = col.get(b), xn = x == null || x !== x, yn = y == null || y !== y;
      if (xn && yn) return 0; if (xn) return 1; if (yn) return -1;
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
    });
    var shown = arr.slice(0, opts.limit || 500);
    var head = '<tr>' + cols.map(function (c) {
      var ar = sort && sort.k === c.k ? (sort.dir > 0 ? '\u25b2' : '\u25bc') : '\u21c5';
      return '<th class="' + (c.th || '') + ' ' + (c.left ? 'l' : '') + '" data-k="' + c.k + '">' + c.label + (c.sub ? '<small>' + c.sub + '</small>' : '') + '<span class="ar">' + ar + '</span></th>';
    }).join('') + '</tr>';
    var body = shown.map(function (r, i) {
      return '<tr data-i="' + i + '">' + cols.map(function (c) { return '<td class="' + (c.left ? 'l ' : '') + (c.cls || '') + ' ' + (c.tdc ? c.tdc(r) : '') + '">' + c.fmt(r) + '</td>'; }).join('') + '</tr>';
    }).join('');
    var html = '<div class="tx"><table id="' + id + '"><thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="' + cols.length + '" class="empty">No outlets match this selection.</td></tr>') + '</tbody></table></div>';
    return { html: html, rows: shown, all: arr, bind: function (root) {
      var t = root.querySelector('#' + id); if (!t) return;
      t.querySelectorAll('th').forEach(function (th) {
        th.onclick = function () {
          var k = th.dataset.k, cur = S.sort && S.sort.id === id ? S.sort : (opts.defSort ? { k: opts.defSort, dir: opts.defDir || 1 } : null);
          S.sort = { id: id, k: k, dir: cur && cur.k === k ? -cur.dir : 1 }; B.render();
        };
      });
      t.querySelectorAll('tbody tr[data-i]').forEach(function (tr) { tr.onclick = function () { B.openOutlet(shown[+tr.dataset.i].o); }; });
    } };
  };
  B.csv = function (name, header, rows) {
    var q = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var txt = [header].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + txt], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  B.searchBox = function () { return '<input id="q" placeholder="Search outlet, code or AM" value="' + esc(S.search) + '" style="border:1px solid var(--line);border-radius:6px;padding:6px 10px;font-size:12px;min-width:210px">'; };
  B.bindSearch = function (root) {
    var q = root.querySelector('#q'); if (!q) return;
    q.oninput = function () { S.search = q.value; var pos = q.selectionStart; B.render(); var n = $('q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
  };

  /* ---------- outlet drawer: see bod-drawer.js ---------- */

  /* ---------- data notes ---------- */
  B.openNotes = function () {
    var m = B.model, dn = E.dataNotes(m), ctx = B.ctx;
    var gs = E.groupStats(m, ctx.P, ctx.rows);
    var all = m.outlets.map(function (_, i) { return i; }), A = E.agg(m, all, [m.latest]);
    var execPsh = E.execAt(B.exec, 'PSH', m.latest);
    $('drawerHost').innerHTML = '<div class="dim" id="dim"></div><aside class="dr"><button class="dx" id="dx"><i class="fas fa-xmark"></i></button><div class="eyebrow">Read before presenting</div><h2>Data notes and definitions</h2>' +
      '<div class="card" style="margin:12px 0"><h4>How the numbers are built</h4><ul style="margin:6px 0 0 16px;padding:0;line-height:1.7">' +
      '<li><b>Growth</b> = running year-on-year: the selected months vs the same months 12 months earlier.</li>' +
      '<li><b>Level</b> (decline or improve): &ge;20% L5, 15&ndash;20% L4, 10&ndash;15% L3, 5&ndash;10% L2, 0&ndash;5% L1, on sales or transactions per the switch.</li>' +
      '<li><b>Like-for-like outlet</b> = traded in every month of both windows. Others are listed under <i>New outlets</i> with the reason.</li>' +
      '<li><b>PAT</b> = PSH &times; working hours for each outlet-month, summed over the period. <b>PSH</b> for a period = PAT &divide; working hours (hours-weighted).</li>' +
      '<li><b>Margin</b> = profit &divide; sales. <b>Basket</b> = sales &divide; transactions. <b>Focus product %</b> and <b>member %</b> are sales-weighted and transaction-weighted.</li>' +
      '<li><b>Recruitment rate</b> = new members &divide; walk-in customers without membership (10 walk-ins, 2 recruited = 20%); rolled up as total recruited &divide; implied walk-ins.</li>' +
      '<li><b>Financial year</b> = Jan&ndash;Dec: FY' + E.yearOf('FY', m.latest) + ' runs from ' + E.monthLabel(E.yearStart('FY', E.yearOf('FY', m.latest))) + ' to the latest month in the sheet (' + E.monthLabel(m.latest) + ') and rolls over automatically each January. <b>Running 12 months</b> = the last 12 months to the latest month (' + E.monthLabel(m.latest - 11) + ' &ndash; ' + E.monthLabel(m.latest) + ') and moves forward as months are added.</li></ul></div>' +
      '<div class="card" style="margin-bottom:12px"><h4>Things in the workbook worth confirming</h4><ul style="margin:6px 0 0 16px;padding:0;line-height:1.7">' +
      '<li><b>PAT</b> is PSH &times; working hours per outlet-month (per management definition). It is not Profit minus the cost columns in MASTER, because other costs (management fee, tax, other overheads) are outside the sheet. Latest month PAT: <b>' + F.rp(A.pat) + '</b>.</li>' +
      '<li><b>Company PSH</b> (' + E.monthLabel(m.latest) + ') is taken from the Exec Dashboard: <b>' + F.n(execPsh) + '</b> (outlet PSH &times; hours rolled up is <b>' + F.n(A.psh) + '</b>; the gap is expected because the company figure also reflects management fee, tax and other items). Outlet-level and filtered views always use outlet PSH &times; hours; for multi-month periods the company monthly figures are weighted by working hours.</li>' +
      '<li>Closed outlets (hidden rows below the active list in MASTER) and the ECOM row are excluded, so company totals can sit slightly below the sheet\u2019s own totals.</li>' +
      '<li>' + dn.startAfterSales.length + ' outlet(s) have an opening date later than their first sales month; ' + dn.noStart.length + ' have no valid opening date. Operating months use the recorded opening date.</li>' +
      '<li><b>New outlet</b> = within ' + E.NEW_MONTHS + ' months of opening (opening month = month 1, counted to the period\'s last month, using the recorded opening date; if sales began well before that date, the first sales month is used). New outlets are kept out of the decline and improvement levels. Older outlets that still lack sales in some prior-year comparison months are shown under <i>New outlets</i> as "not yet comparable".</li>' +
      '<li>Revenue history starts ' + E.monthLabel(m.min) + ' but the first month looks partial, so ' + E.monthLabel(m.baseMin) + ' is used as the first month. FY2024 therefore covers Jul&ndash;Dec only; FY2025 (Jan&ndash;Dec) shows full-year totals, but growth levels start from Jul 2025 (prior-year base = Jul 2024), so use Half-year 2 for FY2025 growth; from FY2026 onwards every period is compared.</li>' +
      '<li>Columns Size and Grand Opening are empty, so Store size &amp; profitability is a placeholder until the Size column is filled. <b>Target figures are not used</b> (not compared against target by design).</li>' +
      '<li>Margin has a few implausible cells (e.g. 137% and &minus;97%); they are used as recorded and show up in the Watchlist.</li></ul></div>' +
      '<div class="card"><h4>Coverage for this view</h4><div class="ks">' + gs.n + ' trading outlets \u00b7 ' + gs.nLfl + ' like-for-like \u00b7 ' + (gs.n - gs.nLfl) + ' new or non-comparable \u00b7 ' + m.outlets.length + ' rows read from MASTER.</div></div></aside>';
    var close = function () { $('drawerHost').innerHTML = ''; }; $('dx').onclick = close; $('dim').onclick = close;
  };

  /* ---------- boot ---------- */
  B.boot = async function () {
    var ok = false;
    try { ok = await checkAccess(); } catch (e) { ok = false; }
    $('gate').classList.add('hidden');
    if (!ok) {
      if (B.expired) { var d = $('denied'); d.querySelector('h2').textContent = 'Session expired'; d.querySelector('p').innerHTML = 'Your sign-in has expired. Please return to the Executive Dashboard and sign in again.'; }
      $('denied').classList.remove('hidden'); return;
    }
    $('app').classList.remove('hidden');
    wire();
    var loaded = await loadData(false);
    if (!loaded) return;
    buildControls(); B.render();
  };
})(window);
