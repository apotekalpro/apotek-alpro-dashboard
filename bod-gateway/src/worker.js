/* ============================================================================
 * Alpro gateway (Cloudflare Worker, no dependencies)
 *
 * Why it exists: GitHub Pages is static and the repo is public, so anything the browser needs is
 * public. This Worker keeps the secrets (Supabase service key, token-signing secret, Google
 * service account) server-side, so the Google Sheets can be private (shared only with the service
 * account) while signed-in dashboard users still get their data.
 *
 *   POST /auth/login     {email, password} -> BOD token   (aud 'bod', 8 h; Chief or 'bod' ticked only)
 *   POST /auth/session   {email, password} -> app token   (aud 'app', 7 d; any active user; plus bod_token if BOD access)
 *   GET  /bod/data?sheet=master|exec        -> BOD workbook (Authorization: Bearer <bod token>)
 *   GET  /sheet/<key>/gviz|export|values    -> a registered sheet (Authorization: Bearer <app token>)
 *   GET  /admin/selftest                    -> Chief/Admin only: which sheets the service account can read
 *   GET  /health
 *
 * Every data call re-reads the user from Supabase, so disabling a user or removing access takes
 * effect on the next request. Only sheets listed in REGISTRY can be read, and a sheet with a tab
 * list only serves those tabs (the company workbook's BOD tabs stay behind /bod/data).
 *
 * Secrets (wrangler secret put): SUPABASE_SERVICE_KEY, BOD_JWT_SECRET, GOOGLE_SERVICE_ACCOUNT (JSON)
 * Vars (wrangler.jsonc): SUPABASE_URL, SHEET_ID (company workbook), ALLOWED_ORIGINS (comma separated),
 *                        APP_TOKEN_HOURS (optional, default 168)
 * ==========================================================================*/
const enc = new TextEncoder(), dec = new TextDecoder();
const ISS = 'alpro-bod-gateway', AUD = 'bod', APP_AUD = 'app', TOKEN_TTL = 8 * 3600, BOD_TAB = 'bod';
const SHEETS = { master: 'sheet=MASTER&headers=4', exec: 'sheet=Exec%20Dashboard&range=A9:ZZ25&headers=0' };

/* ---------- small crypto helpers ---------- */
const toB64u = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const hmacKey = (secret, use) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, use);
async function signJwt(payload, secret) {
  const h = toB64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))), p = toB64u(enc.encode(JSON.stringify(payload)));
  return h + '.' + p + '.' + toB64u(await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(h + '.' + p)));
}
async function verifyJwt(tok, secret, aud) {
  try {
    const p = String(tok || '').split('.'); if (p.length !== 3) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), fromB64u(p[2]), enc.encode(p[0] + '.' + p[1]));
    if (!ok) return null;
    const pl = JSON.parse(dec.decode(fromB64u(p[1])));
    if (pl.iss !== ISS || pl.aud !== (aud || AUD) || !pl.exp || pl.exp * 1000 < Date.now()) return null;
    return pl;
  } catch (e) { return null; }
}
function same(a, b) { // constant-time string compare
  a = enc.encode(String(a)); b = enc.encode(String(b)); let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i] || 0) ^ (b[i] || 0);
  return d === 0;
}

/* ---------- password check: same formats the dashboard login already accepts ---------- */
async function passwordOk(password, stored) {
  if (!stored || !password) return false;
  if (stored.indexOf('$pbkdf2$') === 0) {
    const parts = stored.split('$'); if (parts.length !== 4) return false;
    const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0)), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return same(btoa(String.fromCharCode(...new Uint8Array(bits))), parts[3]);
  }
  let legacy = '', plain64 = '';
  try { legacy = btoa(password + 'salt_apotek_alpro_2024'); plain64 = btoa(password); } catch (e) { /* non-latin1 password */ }
  return (legacy && same(stored, legacy)) || same(stored, password) || (plain64 && same(stored, plain64));
}

/* ---------- Supabase (service key stays here) ---------- */
async function findUser(env, email, f) {
  const url = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/users?select=email,name,role,status,password_hash,department_access&limit=1&status=eq.active&email=eq.' + encodeURIComponent(email.toLowerCase());
  const hdr = { apikey: env.SUPABASE_SERVICE_KEY };
  // legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys are not JWTs and go in apikey only
  if (String(env.SUPABASE_SERVICE_KEY).indexOf('eyJ') === 0) hdr.Authorization = 'Bearer ' + env.SUPABASE_SERVICE_KEY;
  const r = await f(url, { headers: hdr });
  if (!r.ok) throw new Error('supabase ' + r.status);
  const rows = await r.json(); return rows && rows[0] || null;
}
function deptList(u) {
  let d = u && u.department_access; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = d.split(','); } }
  return Array.isArray(d) ? d.map((x) => String(x).trim().toLowerCase()) : [];
}
function hasBod(u) {
  if (!u) return false;
  if (String(u.role || '').toLowerCase() === 'chief') return true;
  return deptList(u).indexOf(BOD_TAB) >= 0;
}

/* ---------- registered sheets ----------
 * allow: 'any' = every active user; otherwise Chief/Admin always, plus the listed roles/depts.
 * tabs (names) / gids: when present, ONLY those tabs can be read. Without either, the whole workbook. */
function registry(env) {
  return {
    company:  { id: env.SHEET_ID, allow: 'any', tabs: ['Goal Jan 2026 to Dec 2026', 'AM Daily Progress', 'SBM EBM DASHBOARD'], gids: ['353860854'] },
    strategy: { id: '1oU2uCC1WokxCFZAW8pKeb4osZC-ktIwB-TvlyvpRZ6s', allow: 'any', gids: ['352474780'] },
    pillar:   { id: '18QxvJrdARXHuGOeLoqA11x0o4Vy_AIkwdqW0-cgqJMs', allow: 'any', gids: ['1852108984', '341128155'] },
    loss:     { id: '1Mr42a0pG4fQGsxTj77FmaTapE4_utQJ8mXO4DRYU2i0', allow: 'any', gids: ['1075651210', '0'] },
    biodata:  { id: '1oKBl-ppv5qjsBq8IXj5Q9KPThlSepSG-ocLIdZeS3g0', allow: 'any', tabs: ['DIGITAL MASTER'] },
    opex:     { id: '1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M', allow: 'any', tabs: ['Audit', 'FieldAudit_Detail', 'INDEX', 'STTK_SHRINKAGE', 'Shrinkage_Items_Raw', 'CCTV_14H', 'Analysis Field Audit Detail'] },
    // HR master data: not served to staff in general. Not wired to any page yet (the PPM tab lives in another repo).
    hr:       { id: '1S4uqo11FidtOHXqRJQNdd_NAQhDPSfW57qxL4llXLlc', allow: { roles: ['ppm', 'strategy'], depts: ['ppm'] } }
  };
}
function canRead(u, def) {
  if (!u) return false;
  if (def.allow === 'any') return true;
  const role = String(u.role || '').toLowerCase();
  if (role === 'chief' || role === 'admin') return true;
  const a = def.allow || {};
  if (a.roles && a.roles.indexOf(role) >= 0) return true;
  const d = deptList(u); return !!a.depts && a.depts.some((x) => d.indexOf(x) >= 0);
}
function tabAllowed(def, sheet, gid) {
  if (!def.tabs && !def.gids) return true;
  if (sheet !== null && sheet !== undefined) return !!def.tabs && def.tabs.indexOf(sheet) >= 0;
  if (gid !== null && gid !== undefined) return !!def.gids && def.gids.indexOf(gid) >= 0;
  return false; // no tab named = the workbook's first tab, which a restricted sheet never serves
}
const CELLS = /^[A-Za-z]{1,3}\d{0,7}(:[A-Za-z]{1,3}\d{0,7})?$/;
// Turns a client request into the one Google URL we are willing to call; never forwards unknown parameters.
function buildQuery(def, mode, p) {
  const bad = (m, st) => ({ error: m, status: st || 400 });
  const sheet = p.get('sheet'), gid = p.get('gid');
  if (sheet !== null && (sheet.length === 0 || sheet.length > 100)) return bad('bad sheet name');
  if (gid !== null && !/^\d{1,12}$/.test(gid)) return bad('bad gid');
  if (mode === 'values') { // Google Sheets API v4: range=Tab!A1:B2
    const rg = p.get('range') || '', i = rg.lastIndexOf('!');
    if (i < 1 || rg.length > 150) return bad('range must look like Tab!A1:B2');
    const tab = rg.slice(0, i).replace(/^'(.*)'$/, '$1');
    if (!CELLS.test(rg.slice(i + 1))) return bad('bad cell range');
    if (!tabAllowed(def, tab, null)) return bad('this tab is not available', 403);
    return { url: 'https://sheets.googleapis.com/v4/spreadsheets/' + def.id + '/values/' + encodeURIComponent(rg), ctype: 'application/json; charset=utf-8' };
  }
  if (p.has('tq')) return bad('query language not supported');
  if (!tabAllowed(def, sheet, gid)) return bad('this tab is not available', 403);
  const base = 'https://docs.google.com/spreadsheets/d/' + def.id;
  if (mode === 'export') {
    if (gid === null || (p.get('format') || 'csv') !== 'csv') return bad('export needs gid and format=csv');
    return { url: base + '/export?format=csv&gid=' + gid, ctype: 'text/csv; charset=utf-8' };
  }
  const tqx = p.get('tqx') || 'out:json';
  if (tqx !== 'out:csv' && tqx !== 'out:json') return bad('bad tqx');
  let q = 'tqx=' + tqx;
  if (sheet !== null) q += '&sheet=' + encodeURIComponent(sheet); else if (gid !== null) q += '&gid=' + gid;
  const rng = p.get('range'); if (rng) { if (!CELLS.test(rng)) return bad('bad cell range'); q += '&range=' + rng; }
  const hd = p.get('headers'); if (hd) { if (!/^\d{1,3}$/.test(hd)) return bad('bad headers'); q += '&headers=' + hd; }
  return { url: base + '/gviz/tq?' + q, ctype: tqx === 'out:csv' ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8' };
}

/* ---------- Google service account -> access token -> private sheet ---------- */
let gTok = null;
async function googleToken(env, f) {
  if (gTok && gTok.exp > Date.now() + 60000) return gTok.v;
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT), now = Math.floor(Date.now() / 1000);
  const h = toB64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const c = toB64u(enc.encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly', aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3300 })));
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (x) => x.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = toB64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(h + '.' + c)));
  const r = await f(sa.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + h + '.' + c + '.' + sig });
  if (!r.ok) throw new Error('google token ' + r.status);
  const j = await r.json(); gTok = { v: j.access_token, exp: Date.now() + (j.expires_in || 3300) * 1000 }; return gTok.v;
}

/* ---------- HTTP ---------- */
const fails = new Map(); // per-isolate brute-force brake; add a Cloudflare rate-limiting rule on /auth/login as well
function corsHeaders(req, env) {
  const allow = (env.ALLOWED_ORIGINS || 'https://apotekalpro.github.io').split(',').map((s) => s.trim()), o = req.headers.get('Origin');
  const h = { Vary: 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (o && allow.indexOf(o) >= 0) { h['Access-Control-Allow-Origin'] = o; h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'; h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'; h['Access-Control-Max-Age'] = '600'; }
  return h;
}
export async function handle(req, env, f) {
  f = f || fetch;
  const cors = corsHeaders(req, env), url = new URL(req.url);
  const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, cors) });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!env.BOD_JWT_SECRET || !env.SUPABASE_SERVICE_KEY || !env.GOOGLE_SERVICE_ACCOUNT) return json({ error: 'gateway not configured' }, 503);
  try {
    if (url.pathname === '/health') return json({ ok: true });

    if ((url.pathname === '/auth/login' || url.pathname === '/auth/session') && req.method === 'POST') {
      const isApp = url.pathname === '/auth/session';
      let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
      const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
      if (!email || !password) return json({ error: 'email and password required' }, 400);
      const fk = (req.headers.get('cf-connecting-ip') || '-') + '|' + email, fr = fails.get(fk);
      if (fr && fr.n >= 5 && Date.now() - fr.t < 15 * 60000) return json({ error: 'too many attempts, try again in 15 minutes' }, 429);
      const u = await findUser(env, email, f);
      if (!u || !(await passwordOk(password, u.password_hash))) { fails.set(fk, { n: (fr && Date.now() - fr.t < 15 * 60000 ? fr.n : 0) + 1, t: Date.now() }); return json({ error: 'invalid email or password' }, 401); }
      fails.delete(fk);
      if (!isApp && !hasBod(u)) return json({ error: 'this account does not have BOD access' }, 403);
      const ttl = isApp ? Math.max(1, Math.min(Number(env.APP_TOKEN_HOURS) || 168, 720)) * 3600 : TOKEN_TTL;
      const now = Math.floor(Date.now() / 1000), exp = now + ttl, role = String(u.role || '').toLowerCase();
      const token = await signJwt({ iss: ISS, aud: isApp ? APP_AUD : AUD, sub: u.email, email: u.email, name: u.name || '', role: role, iat: now, exp: exp }, env.BOD_JWT_SECRET);
      const out = { token: token, exp: exp, email: u.email, name: u.name || '', role: role };
      if (isApp && hasBod(u)) { // one sign-in gives both tokens, so the dashboard login needs a single call
        out.bod_exp = now + TOKEN_TTL;
        out.bod_token = await signJwt({ iss: ISS, aud: AUD, sub: u.email, email: u.email, name: u.name || '', role: role, iat: now, exp: out.bod_exp }, env.BOD_JWT_SECRET);
      }
      return json(out);
    }

    const bearer = (aud) => { const m = /^Bearer (.+)$/.exec(req.headers.get('Authorization') || ''); return m ? verifyJwt(m[1], env.BOD_JWT_SECRET, aud) : null; };

    if (url.pathname === '/bod/data' && req.method === 'GET') {
      const pl = await bearer(AUD);
      if (!pl) return json({ error: 'sign in required' }, 401);
      const q = SHEETS[url.searchParams.get('sheet')]; if (!q) return json({ error: 'unknown sheet' }, 400);
      const u = await findUser(env, pl.email, f);               // access removed or user disabled since sign-in -> stop at once
      if (!hasBod(u)) return json({ error: 'access removed' }, 403);
      const gt = await googleToken(env, f);
      const r = await f('https://docs.google.com/spreadsheets/d/' + env.SHEET_ID + '/gviz/tq?tqx=out:json&' + q, { headers: { Authorization: 'Bearer ' + gt } });
      if (!r.ok) return json({ error: 'source sheet unavailable (' + r.status + ')' }, 502);
      return new Response(await r.text(), { status: 200, headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, cors) });
    }

    // GET /sheet/<key>/<gviz|export|values>?...  -> the registered sheet, read with the service account
    let sm = /^\/sheet\/([a-z0-9_]{1,20})\/(gviz|export|values)$/.exec(url.pathname);
    if (sm && req.method === 'GET') {
      const pl = await bearer(APP_AUD);
      if (!pl) return json({ error: 'sign in required' }, 401);
      const def = registry(env)[sm[1]]; if (!def || !def.id) return json({ error: 'unknown sheet' }, 404);
      const u = await findUser(env, pl.email, f);
      if (!u) return json({ error: 'access removed' }, 403);
      if (!canRead(u, def)) return json({ error: 'no access to this sheet' }, 403);
      const q = buildQuery(def, sm[2], url.searchParams); if (q.error) return json({ error: q.error }, q.status);
      const gt = await googleToken(env, f);
      const r = await f(q.url, { headers: { Authorization: 'Bearer ' + gt } });
      if (!r.ok) return json({ error: 'source sheet unavailable (' + r.status + ')' }, 502);
      return new Response(await r.text(), { status: 200, headers: Object.assign({ 'content-type': q.ctype }, cors) });
    }

    // Chief only: can the service account read each registered sheet yet? (no data is returned)
    if (url.pathname === '/admin/selftest' && req.method === 'GET') {
      const pl = await bearer(APP_AUD);
      if (!pl) return json({ error: 'sign in required' }, 401);
      const u = await findUser(env, pl.email, f);
      if (!u || ['chief', 'admin'].indexOf(String(u.role || '').toLowerCase()) < 0) return json({ error: 'chief or admin only' }, 403);
      const gt = await googleToken(env, f), out = {}, reg = registry(env);
      for (const k of Object.keys(reg)) {
        const d = reg[k]; if (!d.id) { out[k] = 'sheet id not configured'; continue; }
        const first = d.tabs ? 'sheet=' + encodeURIComponent(d.tabs[0]) : d.gids ? 'gid=' + d.gids[0] : '';
        try {
          const r = await f('https://docs.google.com/spreadsheets/d/' + d.id + '/gviz/tq?tqx=out:json&range=A1:A1' + (first ? '&' + first : ''), { headers: { Authorization: 'Bearer ' + gt } });
          out[k] = r.ok ? 'ok' : 'cannot read (' + r.status + (r.status === 401 || r.status === 403 || r.status === 404 ? ': share the sheet with the service account' : '') + ')';
        } catch (e) { out[k] = 'error'; }
      }
      return json({ sheets: out, service_account: JSON.parse(env.GOOGLE_SERVICE_ACCOUNT).client_email });
    }
    return json({ error: 'not found' }, 404);
  } catch (e) { return json({ error: 'gateway error' }, 502); }
}
export default { fetch: (req, env) => handle(req, env) };
