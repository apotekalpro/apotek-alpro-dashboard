/* Alpro gateway client.
 *
 * Reads a Google Sheet through the gateway Worker when this browser holds a gateway token (stored by the
 * dashboard login), and otherwise falls back to the old direct read. While a sheet is still public both
 * paths work, so switching a page to this helper cannot break it. Once the sheet is set to Restricted only
 * the gateway path works, and a user without a token gets a "please sign in again" error.
 *
 * Kill switch: window.BOD_GATEWAY_URL = '' (bod-config.js) turns the gateway path off everywhere.
 * Console check: AlproGW.last  ->  { biodata: 'gateway' | 'direct' }
 */
(function (win) {
  'use strict';
  var KEY = 'alpro_gw_app';            // { token, exp, email }, written by bodSilentSignIn() in index.html
  var last = {};

  function base() { return String(win.BOD_GATEWAY_URL || '').replace(/\/+$/, ''); }
  function token() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.token && s.exp * 1000 > Date.now() + 30000) return s.token;
    } catch (e) { /* fall through */ }
    try { localStorage.removeItem(KEY); } catch (e2) { /* ignore */ }
    return null;
  }
  function fetchT(url, opts, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms);
    opts = opts || {}; opts.signal = c.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  function looksLikeHtml(t) { return /^\s*<(!doctype|html)/i.test(t); }   // Google answers a locked sheet with a sign-in page

  // key: registered sheet key; mode: 'gviz' | 'export' | 'values'; params: plain object; directUrl: the old Google URL (fallback)
  function sheetText(key, mode, params, directUrl) {
    var gw = base(), tok = token(), why = '';
    var viaGateway = Promise.resolve(null);
    if (gw && tok) {
      var qs = Object.keys(params || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
      viaGateway = fetchT(gw + '/sheet/' + key + '/' + mode + (qs ? '?' + qs : ''), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' }, 15000)
        .then(function (r) {
          if (r.ok) return r.text().then(function (t) { if (looksLikeHtml(t)) { why = 'bad'; return null; } last[key] = 'gateway'; return t; });
          if (r.status === 401 || r.status === 403) { why = 'signin'; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
          else why = 'http' + r.status;
          return null;
        })
        .catch(function () { why = 'unreachable'; return null; });
    } else if (gw) { why = 'signin'; }
    return viaGateway.then(function (t) {
      if (t !== null) return t;
      if (!directUrl) { var e0 = new Error('gateway failed'); e0.code = why === 'signin' ? 'signin' : 'failed'; throw e0; }
      return fetchT(directUrl, { cache: 'no-store' }, 20000).then(function (d) {
        if (!d.ok) throw new Error('HTTP ' + d.status);
        return d.text().then(function (x) { if (looksLikeHtml(x)) throw new Error('not readable'); last[key] = 'direct'; return x; });
      }).catch(function (e) {
        var err = new Error('could not load ' + key + ' (' + (why || e.message) + ')');
        err.code = why === 'signin' ? 'signin' : 'failed';
        throw err;
      });
    });
  }

  win.AlproGW = { sheetText: sheetText, hasSession: function () { return !!token(); }, last: last, KEY: KEY };
})(window);
