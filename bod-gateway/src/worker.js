/* ============================================================================
 * BOD gateway (Cloudflare Worker, no dependencies)
 *
 * Why it exists: GitHub Pages is static and the repo is public, so anything the browser needs is
 * public. This Worker keeps the secrets (Supabase service key, token-signing secret, Google
 * service account) server-side and only hands BOD data to a signed-in user who is Chief or has
 * the 'bod' department ticked.
 *
 *   POST /auth/login   {email, password} -> {token, exp, email, name, role}   (8 h token)
 *   GET  /bod/data?sheet=master|exec     -> gviz JSON text (Authorization: Bearer <token>)
 *   GET  /health
 *
 * Secrets (wrangler secret put): SUPABASE_SERVICE_KEY, BOD_JWT_SECRET, GOOGLE_SERVICE_ACCOUNT (JSON)
 * Vars (wrangler.jsonc): SUPABASE_URL, SHEET_ID, ALLOWED_ORIGINS (comma separated)
 * ==========================================================================*/
const enc = new TextEncoder(), dec = new TextDecoder();
const ISS = 'alpro-bod-gateway', AUD = 'bod', TOKEN_TTL = 8 * 3600, BOD_TAB = 'bod';
const SHEETS = { master: 'sheet=MASTER&headers=4', exec: 'sheet=Exec%20Dashboard&range=A9:ZZ25&headers=0' };

/* ---------- small crypto helpers ---------- */
const toB64u = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const hmacKey = (secret, use) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, use);
async function signJwt(payload, secret) {
  const h = toB64u(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))), p = toB64u(enc.encode(JSON.stringify(payload)));
  return h + '.' + p + '.' + toB64u(await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(h + '.' + p)));
}
async function verifyJwt(tok, secret) {
  try {
    const p = String(tok || '').split('.'); if (p.length !== 3) return null;
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), fromB64u(p[2]), enc.encode(p[0] + '.' + p[1]));
    if (!ok) return null;
    const pl = JSON.parse(dec.decode(fromB64u(p[1])));
    if (pl.iss !== ISS || pl.aud !== AUD || !pl.exp || pl.exp * 1000 < Date.now()) return null;
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
  const r = await f(url, { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } });
  if (!r.ok) throw new Error('supabase ' + r.status);
  const rows = await r.json(); return rows && rows[0] || null;
}
function hasBod(u) {
  if (!u) return false;
  if (String(u.role || '').toLowerCase() === 'chief') return true;
  let d = u.department_access; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = d.split(','); } }
  return Array.isArray(d) && d.map((x) => String(x).trim().toLowerCase()).indexOf(BOD_TAB) >= 0;
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

    if (url.pathname === '/auth/login' && req.method === 'POST') {
      let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
      const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
      if (!email || !password) return json({ error: 'email and password required' }, 400);
      const fk = (req.headers.get('cf-connecting-ip') || '-') + '|' + email, fr = fails.get(fk);
      if (fr && fr.n >= 5 && Date.now() - fr.t < 15 * 60000) return json({ error: 'too many attempts, try again in 15 minutes' }, 429);
      const u = await findUser(env, email, f);
      if (!u || !(await passwordOk(password, u.password_hash))) { fails.set(fk, { n: (fr && Date.now() - fr.t < 15 * 60000 ? fr.n : 0) + 1, t: Date.now() }); return json({ error: 'invalid email or password' }, 401); }
      fails.delete(fk);
      if (!hasBod(u)) return json({ error: 'this account does not have BOD access' }, 403);
      const now = Math.floor(Date.now() / 1000), exp = now + TOKEN_TTL;
      const token = await signJwt({ iss: ISS, aud: AUD, sub: u.email, email: u.email, name: u.name || '', role: String(u.role || '').toLowerCase(), iat: now, exp: exp }, env.BOD_JWT_SECRET);
      return json({ token: token, exp: exp, email: u.email, name: u.name || '', role: String(u.role || '').toLowerCase() });
    }

    if (url.pathname === '/bod/data' && req.method === 'GET') {
      const m = /^Bearer (.+)$/.exec(req.headers.get('Authorization') || '');
      const pl = m && await verifyJwt(m[1], env.BOD_JWT_SECRET);
      if (!pl) return json({ error: 'sign in required' }, 401);
      const q = SHEETS[url.searchParams.get('sheet')]; if (!q) return json({ error: 'unknown sheet' }, 400);
      const u = await findUser(env, pl.email, f);               // access removed or user disabled since sign-in -> stop at once
      if (!hasBod(u)) return json({ error: 'access removed' }, 403);
      const gt = await googleToken(env, f);
      const r = await f('https://docs.google.com/spreadsheets/d/' + env.SHEET_ID + '/gviz/tq?tqx=out:json&' + q, { headers: { Authorization: 'Bearer ' + gt } });
      if (!r.ok) return json({ error: 'source sheet unavailable (' + r.status + ')' }, 502);
      return new Response(await r.text(), { status: 200, headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8' }, cors) });
    }
    return json({ error: 'not found' }, 404);
  } catch (e) { return json({ error: 'gateway error' }, 502); }
}
export default { fetch: (req, env) => handle(req, env) };
