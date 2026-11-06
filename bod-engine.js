/* ============================================================================
 * BOD Dashboard - data engine
 * Source workbook: Google Sheet (MASTER + Exec Dashboard rows 9-25)
 * Works in browser (window.BODEngine) and node (module.exports) so the same
 * parser builds the offline snapshot.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var SHEET_ID = '1yHmOzLTp7uzjgoKASHbiLdwXcGske0bDc81Ur5vrdIs';
  var SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';

  // Order matters: "Non Ethical Focus Product" must be tested before "Ethical Focus Product".
  var METRICS = [
    ['nonEth', 'Non Ethical Focus Product'], ['eth', 'Ethical Focus Product'],
    ['focus', 'Total Focus Product'], ['mem', '% by members'],
    ['ssd', 'Avg Staff Sales/Day'], ['rr', 'Recruitment Rate'],
    ['newMem', 'New Member'], ['basket', 'Basket Size'], ['margin', 'Margin %'],
    ['tx', 'Transaction'], ['pro', 'Profit'], ['rev', 'Revenue'], ['evip', 'EVIP'],
    ['psh', 'PSH'], ['sal', 'SALARY'], ['rent', 'RENTAL'], ['util', 'UTILITIES'],
    ['petty', 'PETTY CASH'], ['stockloss', 'STOCK LOSS'], ['wh', 'WORKING HOURS']
  ];
  var KEYS = METRICS.map(function (m) { return m[0]; });

  var MON = { jan: 1, feb: 2, mar: 3, mac: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8,
              sep: 9, oct: 10, okt: 10, nov: 11, dec: 12, des: 12 };
  var MON_RE = /(jan|feb|mar|mac|apr|may|mei|jun|jul|aug|agu|sep|oct|okt|nov|dec|des)[a-z]*[\s\-]+(\d{2,4})\s*$/i;
  var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- month index helpers: idx = (year-2000)*12 + (month-1) ---------- */
  function ymOf(idx) { return { y: 2000 + Math.floor(idx / 12), m: idx % 12 }; }
  function monthLabel(idx) { var o = ymOf(idx); return MN[o.m] + ' ' + o.y; }
  function monthShort(idx) { var o = ymOf(idx); return MN[o.m] + " '" + String(o.y).slice(2); }
  // Fiscal year runs Nov -> Oct (FY2026 = Nov 2025 .. Oct 2026), read from the reference screenshot
  // ("FY2026 Nov 2025 - Oct 2026"). basis 'CY' switches to calendar year (Jan -> Dec).
  function yearOf(basis, idx) { var o = ymOf(idx); return basis === 'CY' ? o.y : o.y + (o.m >= 10 ? 1 : 0); }
  function yearStart(basis, y) { return basis === 'CY' ? (y - 2000) * 12 : (y - 1 - 2000) * 12 + 10; }
  function yearLabel(basis, y) { return (basis === 'CY' ? 'CY' : 'FY') + y; }
  var PERIOD_OFF = { FY: [0, 11], H1: [0, 5], H2: [6, 11], Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11] };
  var PERIOD_NAME = { FY: 'Full year', H1: 'Half-year 1', H2: 'Half-year 2', Q1: 'Quarter 1', Q2: 'Quarter 2', Q3: 'Quarter 3', Q4: 'Quarter 4' };
  function periodName(basis, p) {
    var s = yearStart(basis, 2001), o = PERIOD_OFF[p];
    return PERIOD_NAME[p] + ' (' + MN[ymOf(s + o[0]).m] + '\u2013' + MN[ymOf(s + o[1]).m] + ')';
  }

  /* ---------- gviz parsing ---------- */
  function parseGviz(text) {
    var s = text.indexOf('('), e = text.lastIndexOf(')');
    var j = JSON.parse(text.slice(s + 1, e));
    if (j.status && j.status !== 'ok') throw new Error('gviz status ' + j.status);
    return j;
  }
  function cellNum(c) {
    if (!c) return NaN;
    var v = c.v;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      var t = v.replace(/[,\s]/g, '');
      if (/^-?\d+(\.\d+)?$/.test(t)) return +t;
    }
    return NaN;
  }
  function cellStr(c) {
    if (!c || c.v === null || c.v === undefined) return '';
    var s = String(c.v).trim();
    return (s === '#N/A' || s === '#REF!' || s === '#VALUE!' || s === '#DIV/0!') ? '' : s;
  }
  function cellDate(c) {
    if (!c || c.v === null || c.v === undefined) return null;
    var v = c.v, m;
    if (typeof v === 'string') {
      m = /^Date\((\d+),(\d+),(\d+)/.exec(v);
      if (m) return Date.UTC(+m[1], +m[2], +m[3]);
      m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());   // dd/mm/yyyy text (e.g. JKJPCP1)
      if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    }
    return null;
  }

  /* ---------- MASTER -> model ---------- */
  // Fixed info columns are located by their header text (the sheet's columns move when months are added).
  // Defaults are the positions seen on 2026-11; they only apply if a header cannot be found.
  var FIXED = [
    ['code', /^(\d[\d,]*\s+)?Outlet\b/i, 0], ['name', /\bName\b/i, 1], ['start', /Start Date/i, 2], ['am', /^AM\b/i, 4],
    ['type', /\bTYPE\b/i, 5], ['nature', /\bNATURE\b/i, 6], ['kec', /KECAMATAN/i, 7], ['city', /\bKOTA\b/i, 8],
    ['prov', /PROVINCE/i, 9], ['size', /\bSize\b/i, 11], ['target', /Target\s+2026/i, 13], ['transformed', /Transformed/i, 14],
    ['phase', /\bPHASE\b/i, 15], ['tier', /Category/i, 16]
  ];
  function parseMaster(j) {
    var cols = j.table.cols, rows = j.table.rows;
    var colMap = {}, minI = 1e9, maxI = -1, i, k, firstMetric = 1e9;
    cols.forEach(function (c, ci) {
      var lab = (c.label || '').trim();
      var mm = MON_RE.exec(lab);
      if (!mm) return;
      var g = null;
      for (k = 0; k < METRICS.length; k++) { if (lab.indexOf(METRICS[k][1]) >= 0) { g = METRICS[k][0]; break; } }
      if (!g) return;
      var y = +mm[2]; if (y < 100) y += 2000;
      var idx = (y - 2000) * 12 + (MON[mm[1].toLowerCase()] - 1);
      (colMap[g] = colMap[g] || {})[idx] = ci;
      if (idx < minI) minI = idx; if (idx > maxI) maxI = idx;
      if (ci < firstMetric) firstMetric = ci;
    });
    var fx = {};
    FIXED.forEach(function (f) {
      fx[f[0]] = f[2];
      for (var ci = 0; ci < Math.min(firstMetric, cols.length); ci++) {
        if (f[1].test((cols[ci].label || '').trim())) { fx[f[0]] = ci; break; }
      }
    });
    var outlets = [], rowsKept = [];
    rows.forEach(function (r) {
      var c = r.c || [];
      var code = cellStr(c[fx.code]);
      if (!code || code === 'ECOM' || code === 'Outlet' || /^(grand\s+)?total\b/i.test(code)) return;
      rowsKept.push(c);
    });
    var no = rowsKept.length, nm = maxI - minI + 1;
    var S = {};
    KEYS.forEach(function (key) { S[key] = new Float64Array(no * nm).fill(NaN); });
    rowsKept.forEach(function (c, oi) {
      var prov = cellStr(c[fx.prov]).toUpperCase();
      if (prov === 'DKI JAKARTA') prov = 'JAKARTA';
      outlets.push({
        code: cellStr(c[fx.code]), name: cellStr(c[fx.name]).replace(/^APOTEK ALPRO\s+/i, '').trim() || cellStr(c[fx.name]),
        fullName: cellStr(c[fx.name]),
        start: cellDate(c[fx.start]), am: cellStr(c[fx.am]) || 'Unassigned', type: cellStr(c[fx.type]) || 'N/A',
        nature: cellStr(c[fx.nature]) || 'N/A', kec: cellStr(c[fx.kec]), city: cellStr(c[fx.city]), prov: prov || 'N/A',
        size: cellStr(c[fx.size]), target26: cellNum(c[fx.target]), transformed: cellStr(c[fx.transformed]),
        phase: cellStr(c[fx.phase]), tier: (cellStr(c[fx.tier]) || 'N/A').toUpperCase()
      });
      KEYS.forEach(function (key) {
        var cm = colMap[key]; if (!cm) return;
        for (var t in cm) {
          var v = cellNum(c[cm[t]]);
          if (v === v) S[key][oi * nm + (+t - minI)] = v;
        }
      });
    });
    // normalise units: % columns arrive in percent points -> fractions
    ['mem', 'rr'].forEach(function (key) { var a = S[key]; for (i = 0; i < a.length; i++) if (a[i] === a[i]) a[i] = a[i] / 100; });
    return finishModel({ outlets: outlets, min: minI, max: maxI, nm: nm, S: S });
  }

  function finishModel(m) {
    // "latest" = last month in which at least 50 outlets reported revenue (guards against pre-built future columns)
    var latest = m.min;
    for (var t = m.max; t >= m.min; t--) {
      var n = 0;
      for (var o = 0; o < m.outlets.length; o++) if (m.S.rev[o * m.nm + (t - m.min)] > 0) n++;
      if (n >= 50) { latest = t; break; }
    }
    m.latest = latest;
    m.minBy = {};
    KEYS.forEach(function (k) {
      m.minBy[k] = null;
      for (var t2 = m.min; t2 <= m.max && m.minBy[k] === null; t2++) {
        for (var o2 = 0; o2 < m.outlets.length; o2++) {
          var v2 = m.S[k][o2 * m.nm + (t2 - m.min)];
          if (v2 === v2) { m.minBy[k] = t2; break; }
        }
      }
    });
    // Revenue starts Jun 2024 but looks like a part-month (Rp 9.7b vs 17.7b in Jul) and every other metric starts Jul 2024,
    // so Jul 2024 is the first month trusted as a year-on-year base.
    m.baseMin = Math.max(m.minBy.tx || m.min, m.minBy.pro || m.min, m.minBy.psh || m.min);
    // first month with revenue per outlet (for opening age / new-outlet detection)
    m.outlets.forEach(function (ol, o) {
      var f = -1;
      for (var tt = m.min; tt <= m.latest; tt++) { if (m.S.rev[o * m.nm + (tt - m.min)] > 0) { f = tt; break; } }
      ol.firstRev = f;
      ol.startIdx = ol.start ? (new Date(ol.start).getUTCFullYear() - 2000) * 12 + new Date(ol.start).getUTCMonth() : -1;
    });
    return m;
  }

  /* ---------- Exec Dashboard (rows 9-25, any number of month columns) ---------- */
  // The row labelled "Month" holds the first month as a date in column B and the following months in the
  // next columns, one per column. New months are appended on the right, so we read until the last column
  // that holds data instead of assuming a fixed width.
  function serialToIdx(v) {                       // Excel/Sheets serial day number -> month index
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return (d.getUTCFullYear() - 2000) * 12 + d.getUTCMonth();
  }
  function execMonthOf(c) {                       // a header cell -> month index, or null
    if (!c || c.v === null || c.v === undefined) return null;
    if (typeof c.v === 'number' && c.v > 30000) return serialToIdx(c.v);
    if (typeof c.v === 'string') {
      var m = /^Date\((\d+),(\d+),(\d+)/.exec(c.v);
      if (m) return (+m[1] - 2000) * 12 + +m[2];
    }
    var f = typeof c.f === 'string' ? c.f : (typeof c.v === 'string' ? c.v : '');
    var mm = MON_RE.exec(f.trim());
    if (mm) { var y = +mm[2]; if (y < 100) y += 2000; return (y - 2000) * 12 + (MON[mm[1].toLowerCase()] - 1); }
    return null;
  }
  function parseExec(j) {
    var rows = j.table.rows, out = { months: [], rows: {}, order: [] };
    var hdr = null;
    rows.forEach(function (r) { var c = r.c || []; if (!hdr && cellStr(c[0]).toLowerCase() === 'month') hdr = c; });
    var width = 0;
    rows.forEach(function (r) {
      var c = r.c || [];
      for (var k = c.length - 1; k >= 1; k--) { if (cellNum(c[k]) === cellNum(c[k])) { if (k > width) width = k; break; } }
    });
    var first = hdr ? execMonthOf(hdr[1]) : null;
    if (first === null) first = (2025 - 2000) * 12;       // header unreadable: last known start (Jan 2025)
    for (var i = 0; i < width; i++) {
      var t = first + i, hc = hdr ? execMonthOf(hdr[1 + i]) : null;
      if (hc !== null && i > 0) t = hc;                    // trust an explicit date if the header carries one
      out.months.push(t);
    }
    rows.forEach(function (r) {
      var c = r.c || [];
      var label = cellStr(c[0]); if (!label || label.toLowerCase() === 'month') return;
      var vals = [];
      for (var k = 1; k <= width; k++) { var v = cellNum(c[k]); vals.push(v === v ? v : null); }
      out.rows[label] = vals; out.order.push(label);
    });
    return out;
  }
  // last month (index) in which the Exec row has a value
  function execLast(exec, label) {
    var r = exec && exec.rows[label]; if (!r) return null;
    for (var i = r.length - 1; i >= 0; i--) if (r[i] !== null && r[i] === r[i]) return { t: exec.months[i], v: r[i] };
    return null;
  }
  function execAt(exec, label, t) {
    var r = exec && exec.rows[label]; if (!r) return NaN;
    var i = exec.months.indexOf(t); if (i < 0) return NaN;
    return r[i] === null ? NaN : r[i];
  }

  /* ---------- snapshot (fallback when the live sheet is unreachable) ---------- */
  function toSnapshot(model, exec) {
    var S = {};
    KEYS.forEach(function (k) {
      var a = model.S[k], b = new Array(a.length);
      for (var i = 0; i < a.length; i++) b[i] = a[i] === a[i] ? Math.round(a[i] * 1e5) / 1e5 : null;
      S[k] = b;
    });
    return { version: 1, fetchedAt: new Date().toISOString(), min: model.min, max: model.max, nm: model.nm,
             outlets: model.outlets, S: S, exec: exec };
  }
  function fromSnapshot(s) {
    var S = {};
    KEYS.forEach(function (k) {
      var b = s.S[k], a = new Float64Array(b.length);
      for (var i = 0; i < b.length; i++) a[i] = b[i] === null ? NaN : b[i];
      S[k] = a;
    });
    return { model: finishModel({ outlets: s.outlets, min: s.min, max: s.max, nm: s.nm, S: S }), exec: s.exec, fetchedAt: s.fetchedAt };
  }

  /* ---------- period selection ---------- */
  // sel: {basis:'FY'|'CY', year, period:'FY'|'H1'|'H2'|'Q1'..'Q4'|'R12'|'M', month(idx)}
  // Growth is always running year-on-year: same months, 12 months earlier.
  function resolvePeriod(model, sel) {
    var basis = sel.basis || 'FY', cur = [], label = '', partial = false, tag = '', baseTag = '';
    if (sel.period === 'M') {
      cur = [sel.month]; label = monthLabel(cur[0]); tag = monthShort(cur[0]); baseTag = monthShort(cur[0] - 12);
    } else if (sel.period === 'R12') {
      for (var t = model.latest - 11; t <= model.latest; t++) cur.push(t);
      label = 'Running 12 months \u00b7 ' + monthLabel(cur[0]) + ' \u2013 ' + monthLabel(model.latest);
      tag = 'R12M'; baseTag = 'prior R12M';
    } else {
      var off = PERIOD_OFF[sel.period] || PERIOD_OFF.FY, s0 = yearStart(basis, sel.year), full = [];
      for (var o = off[0]; o <= off[1]; o++) full.push(s0 + o);
      cur = full.filter(function (x) { return x >= model.min && x <= model.latest; });
      partial = cur.length < full.length;
      var pre = sel.period === 'FY' ? '' : sel.period + ' ';
      tag = pre + yearLabel(basis, sel.year); baseTag = pre + yearLabel(basis, sel.year - 1);
      if (cur.length) label = tag + ' \u00b7 ' + monthLabel(cur[0]) + ' \u2013 ' + monthLabel(cur[cur.length - 1]) + (partial ? ' (to date)' : '');
    }
    var base = cur.map(function (x) { return x - 12; });
    var bm = model.baseMin != null ? model.baseMin : model.min;
    var baseAvailable = base.length > 0 && base.every(function (x) { return x >= bm; });
    return { cur: cur, base: base, label: label, partial: partial, baseAvailable: baseAvailable, tag: tag, baseTag: baseTag };
  }

  /* ---------- aggregation ---------- */
  function g(model, key, o, t) { return model.S[key][o * model.nm + (t - model.min)]; }

  // Aggregates a set of outlets over a set of months using only month-cells that exist.
  // PAT = PSH x working hours (per outlet-month). PSH(period) = PAT / working hours.
  function agg(model, oList, months) {
    var A = { rev: 0, tx: 0, pro: 0, pat: 0, wh: 0, nm: 0, revTx: 0, revPro: 0, revPat: 0,
              fa: 0, fr: 0, ea: 0, er: 0, na: 0, nr: 0, ma: 0, mt: 0, rrNm: 0, rrWalk: 0, sdRev: 0, sdDays: 0,
              sal: 0, rent: 0, util: 0, petty: 0, sl: 0, revC: 0, evip: 0, nOM: 0, patOM: 0, revOM: 0, nOutlets: oList.length };
    var S = model.S, nmn = model.nm, mn = model.min;
    var lastT = months.length ? months[months.length - 1] : null;
    for (var a = 0; a < oList.length; a++) {
      var o = oList[a], base = o * nmn;
      for (var b = 0; b < months.length; b++) {
        var t = months[b], p = base + (t - mn);
        var rev = S.rev[p], tx = S.tx[p], pro = S.pro[p], psh = S.psh[p], wh = S.wh[p];
        var hasRev = rev === rev;
        if (hasRev) { A.rev += rev; if (rev > 0) A.revOM++; }
        if (tx === tx) { A.tx += tx; if (hasRev) A.revTx += rev; }
        if (pro === pro) { A.pro += pro; if (hasRev) A.revPro += rev; }
        if (psh === psh && wh === wh) {
          A.pat += psh * wh; A.wh += wh; A.patOM++;
          if (hasRev) A.revPat += rev;
        }
        var nmv = S.newMem[p]; if (nmv === nmv) A.nm += nmv;
        var f = S.focus[p]; if (f === f && hasRev) { A.fa += f * rev; A.fr += rev; }
        var e = S.eth[p]; if (e === e && hasRev) { A.ea += e * rev; A.er += rev; }
        var nn = S.nonEth[p]; if (nn === nn && hasRev) { A.na += nn * rev; A.nr += rev; }
        var mem = S.mem[p]; if (mem === mem && tx === tx) { A.ma += mem * tx; A.mt += tx; }
        var rr = S.rr[p]; if (rr === rr && rr > 0 && nmv === nmv) { A.rrNm += nmv; A.rrWalk += nmv / rr; }
        var sd = S.ssd[p]; if (sd === sd && sd > 0 && hasRev) { A.sdRev += rev; A.sdDays += rev / sd; }
        var sal = S.sal[p];
        if (sal === sal && hasRev) {
          A.sal += sal; A.revC += rev;
          var q;
          q = S.rent[p]; if (q === q) A.rent += q;
          q = S.util[p]; if (q === q) A.util += q;
          q = S.petty[p]; if (q === q) A.petty += q;
          q = S.stockloss[p]; if (q === q) A.sl += q;
        }
        A.nOM++;
        if (t === lastT) { var ev = S.evip[p]; if (ev === ev) A.evip += ev; }
      }
    }
    A.margin = A.revPro > 0 ? A.pro / A.revPro : NaN;
    A.basket = A.tx > 0 ? A.revTx / A.tx : NaN;
    A.psh = A.wh > 0 ? A.pat / A.wh : NaN;
    A.patMargin = A.revPat > 0 ? A.pat / A.revPat : NaN;
    A.focusPct = A.fr > 0 ? A.fa / A.fr : NaN;
    A.ethPct = A.er > 0 ? A.ea / A.er : NaN;
    A.nonEthPct = A.nr > 0 ? A.na / A.nr : NaN;
    A.memPct = A.mt > 0 ? A.ma / A.mt : NaN;
    A.rrPct = A.rrWalk > 0 ? A.rrNm / A.rrWalk : NaN;
    A.ssd = A.sdDays > 0 ? A.sdRev / A.sdDays : NaN;
    A.salPct = A.revC > 0 ? A.sal / A.revC : NaN;
    A.rentPct = A.revC > 0 ? A.rent / A.revC : NaN;
    A.utilPct = A.revC > 0 ? A.util / A.revC : NaN;
    A.pettyPct = A.revC > 0 ? A.petty / A.revC : NaN;
    A.slPct = A.revC > 0 ? A.sl / A.revC : NaN;
    return A;
  }

  // Sum of one metric over months, only when EVERY month is present (like-for-like test)
  function fullSum(model, key, o, months) {
    var s = 0;
    for (var i = 0; i < months.length; i++) {
      var v = g(model, key, o, months[i]);
      if (!(v === v)) return NaN;
      if (key !== 'pro' && !(v > 0)) return NaN;
      s += v;
    }
    return s;
  }

  /* ---------- 5-level rating ---------- */
  // growth g (fraction). Decline: <=-20% L5, -20..-15 L4, -15..-10 L3, -10..-5 L2, -5..0 L1
  function declineLevel(gr) { var d = -gr; return d >= 0.20 ? 5 : d >= 0.15 ? 4 : d >= 0.10 ? 3 : d >= 0.05 ? 2 : 1; }
  function improveLevel(gr) { return gr >= 0.20 ? 5 : gr >= 0.15 ? 4 : gr >= 0.10 ? 3 : gr >= 0.05 ? 2 : 1; }
  var LEVEL_TXT = {
    down: { 5: '20% or more decline', 4: '15% to below 20% decline', 3: '10% to below 15% decline', 2: '5% to below 10% decline', 1: 'Above 0% to below 5% decline' },
    up:   { 5: '20% or more growth', 4: '15% to below 20% growth', 3: '10% to below 15% growth', 2: '5% to below 10% growth', 1: '0% to below 5% growth' }
  };


  /* ---------- like-for-like evaluation ---------- */
  // P = resolvePeriod(...). rate = 'rev' | 'tx' (the metric that drives the 5 levels).
  // An outlet is "lfl" only if it traded in EVERY month of both the current window and the
  // same window one year earlier; everything else is routed to "new" (or "inactive").
  function evaluate(model, P, rate) {
    var rk = rate === 'tx' ? 'tx' : 'rev', rows = [], endT = P.cur[P.cur.length - 1];
    for (var o = 0; o < model.outlets.length; o++) {
      var ol = model.outlets[o], r = { o: o, ol: ol, cat: 'inactive', reason: '' };
      var nCur = 0, nBase = 0, nBaseTx = 0, t;
      for (var i = 0; i < P.cur.length; i++) {
        if (g(model, 'rev', o, P.cur[i]) > 0) nCur++;
        t = P.base[i];
        if (t >= model.min) { if (g(model, 'rev', o, t) > 0) nBase++; if (g(model, 'tx', o, t) > 0) nBaseTx++; }
      }
      r.nCur = nCur; r.nBase = nBase; r.nMonths = P.cur.length;
      r.opMonths = ol.startIdx >= 0 ? Math.max(0, endT - ol.startIdx + 1) : null;
      r.ageMonths = r.opMonths;
      var A = agg(model, [o], P.cur), B = agg(model, [o], P.base);
      r.A = A; r.B = B;
      r.last = agg(model, [o], [endT]);
      r.revCur = A.rev; r.revBase = B.rev; r.txCur = A.tx; r.txBase = B.tx;
      r.patCur = A.pat; r.patBase = B.pat; r.patLast = r.last.pat; r.pshLast = r.last.psh;
      if (nCur === 0) { r.reason = 'No sales in the selected period'; rows.push(r); continue; }
      var okCur = nCur === P.cur.length;
      var baseWanted = P.cur.length;
      var baseOk = P.baseAvailable && nBase === baseWanted && (rk !== 'tx' || nBaseTx === baseWanted);
      var curRate = rk === 'tx' ? A.tx : A.rev, baseRate = rk === 'tx' ? B.tx : B.rev;
      if (okCur && baseOk && curRate > 0 && baseRate > 0) {
        r.cat = 'lfl';
        r.gRev = A.rev / B.rev - 1;
        r.gTx = (A.tx > 0 && B.tx > 0) ? A.tx / B.tx - 1 : NaN;
        r.gBasket = (A.basket > 0 && B.basket > 0) ? A.basket / B.basket - 1 : NaN;
        r.gPro = B.pro > 0 ? A.pro / B.pro - 1 : NaN;
        r.dPat = A.pat - B.pat;
        r.dMargin = (A.margin === A.margin && B.margin === B.margin) ? A.margin - B.margin : NaN;
        r.rate = rk === 'tx' ? r.gTx : r.gRev;
        r.dir = r.rate < 0 ? 'down' : 'up';
        r.level = r.rate < 0 ? declineLevel(r.rate) : improveLevel(r.rate);
      } else {
        r.cat = 'new';
        if (!P.baseAvailable) r.reason = 'Prior-year base not available in the workbook';
        else if (nBase === 0) r.reason = 'Opened within or after the comparison window (no prior-year sales)';
        else if (nBase < baseWanted) r.reason = 'Prior-year gap: ' + (baseWanted - nBase) + ' of ' + baseWanted + ' comparison months without sales';
        else if (rk === 'tx') r.reason = 'Prior-year transactions missing';
        else if (!okCur) r.reason = 'Gap in current period: ' + (P.cur.length - nCur) + ' month(s) without sales';
        else r.reason = 'Not comparable';
      }
      rows.push(r);
    }
    return rows;
  }

  // Aggregate a set of evaluated rows into a group record with both total and like-for-like views
  function groupStats(model, P, rows) {
    var all = rows.filter(function (r) { return r.cat !== 'inactive'; }).map(function (r) { return r.o; });
    var lfl = rows.filter(function (r) { return r.cat === 'lfl'; }).map(function (r) { return r.o; });
    var a = agg(model, all, P.cur), b = agg(model, all, P.base), la = agg(model, lfl, P.cur), lb = agg(model, lfl, P.base);
    var neg = 0;
    rows.forEach(function (r) { if (r.cat !== 'inactive' && r.A.patOM > 0 && r.patCur < 0) neg++; });
    function gr(x, y) { return y > 0 ? x / y - 1 : NaN; }
    return { n: all.length, nLfl: lfl.length, a: a, b: b, la: la, lb: lb, negPat: neg,
             gRev: gr(a.rev, b.rev), gTx: gr(a.tx, b.tx), gPro: gr(a.pro, b.pro),
             lRev: gr(la.rev, lb.rev), lTx: gr(la.tx, lb.tx), lPro: gr(la.pro, lb.pro),
             dMargin: (a.margin === a.margin && b.margin === b.margin) ? a.margin - b.margin : NaN,
             lMargin: (la.margin === la.margin && lb.margin === lb.margin) ? la.margin - lb.margin : NaN,
             dPat: a.pat - b.pat, lDPat: la.pat - lb.pat };
  }


  // Company-level PSH as published on the Exec Dashboard (per month). For a multi-month period the monthly
  // figures are weighted by that month's total working hours (from MASTER). Returns {v, src:'sheet'|'rebuilt'}.
  function companyPsh(model, exec, months) {
    var num = 0, den = 0, all = [], o;
    for (o = 0; o < model.outlets.length; o++) all.push(o);
    for (var i = 0; i < months.length; i++) {
      var t = months[i], v = execAt(exec, 'PSH', t);
      if (v !== v) { num = NaN; break; }
      var w = agg(model, all, [t]).wh; if (!(w > 0)) w = 1;
      num += v * w; den += w;
    }
    if (num === num && den > 0 && months.length) return { v: num / den, src: 'sheet' };
    var A = agg(model, all, months);
    return { v: A.psh, src: 'rebuilt' };
  }

  // Month-by-month series for a set of outlets (all months with data)
  function monthly(model, oList) {
    var out = [];
    for (var t = model.min; t <= model.latest; t++) {
      var A = agg(model, oList, [t]), posPsh = 0, nPsh = 0;
      for (var q = 0; q < oList.length; q++) { var pv = g(model, 'psh', oList[q], t); if (pv === pv) { nPsh++; if (pv > 0) posPsh++; } }
      out.push({ t: t, rev: A.rev, tx: A.tx, pro: A.pro, pat: A.pat, margin: A.margin, psh: A.psh, basket: A.basket,
                 focus: A.focusPct, mem: A.memPct, rr: A.rrPct, ssd: A.ssd, nm: A.nm, n: A.revOM,
                 sal: A.salPct, rent: A.rentPct, util: A.utilPct, petty: A.pettyPct, sl: A.slPct,
                 posPsh: posPsh, nPsh: nPsh, evip: A.evip });
    }
    return out;
  }


  // Outlets whose recorded opening date is later than their first month of sales (start-date vs sales mismatch)
  function dataNotes(model) {
    var late = [], noStart = [];
    model.outlets.forEach(function (o) {
      if (o.startIdx < 0) noStart.push(o);
      if (o.startIdx >= 0 && o.firstRev >= 0 && o.startIdx > o.firstRev + 1) late.push(o);
    });
    return { startAfterSales: late, noStart: noStart };
  }

  var API = {
    SHEET_ID: SHEET_ID, SHEET_URL: SHEET_URL, METRICS: METRICS, KEYS: KEYS, MN: MN, PERIOD_OFF: PERIOD_OFF, periodName: periodName, LEVEL_TXT: LEVEL_TXT,
    parseGviz: parseGviz, parseMaster: parseMaster, parseExec: parseExec, toSnapshot: toSnapshot, fromSnapshot: fromSnapshot,
    ymOf: ymOf, monthLabel: monthLabel, monthShort: monthShort, yearOf: yearOf, yearStart: yearStart, yearLabel: yearLabel,
    resolvePeriod: resolvePeriod, agg: agg, fullSum: fullSum, get: g,
    declineLevel: declineLevel, improveLevel: improveLevel, evaluate: evaluate, dataNotes: dataNotes, groupStats: groupStats, monthly: monthly,
    masterUrl: function () { return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:json&sheet=MASTER&headers=4'; },
    execUrl: function () { return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent('Exec Dashboard') + '&range=A9:ZZ25&headers=0'; },
    execLast: execLast, execAt: execAt, companyPsh: companyPsh
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.BODEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
