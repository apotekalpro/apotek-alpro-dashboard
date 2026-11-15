// Run: node bod-gateway/test/worker.test.mjs   (Node 18+, no dependencies)
import { handle } from '../src/worker.js';
import crypto from 'node:crypto';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ client_email: 'bod@test.iam.gserviceaccount.com', token_uri: 'https://oauth2.googleapis.com/token', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'svc-key', BOD_JWT_SECRET: 'unit-test-secret-0123456789', GOOGLE_SERVICE_ACCOUNT: SA, SHEET_ID: 'SHEET123', ALLOWED_ORIGINS: 'https://apotekalpro.github.io' };
const ORIGIN = 'https://apotekalpro.github.io';
const legacy = (p) => Buffer.from(p + 'salt_apotek_alpro_2024').toString('base64');
const pbkdf2 = (p) => { const salt = crypto.randomBytes(16), h = crypto.pbkdf2Sync(p, salt, 100000, 32, 'sha256'); return '$pbkdf2$' + salt.toString('base64') + '$' + h.toString('base64'); };
let users = {
  'chief@x.id': { email: 'chief@x.id', name: 'Chief', role: 'chief', status: 'active', password_hash: legacy('Pass#1'), department_access: [] },
  'bod@x.id': { email: 'bod@x.id', name: 'Ticked', role: 'manager', status: 'active', password_hash: pbkdf2('Strong#2'), department_access: ['hr', 'bod'] },
  'plain@x.id': { email: 'plain@x.id', name: 'Plain', role: 'manager', status: 'active', password_hash: legacy('Pass#3'), department_access: ['hr'] }
};
const calls = [];
const mockFetch = async (url, init) => {
  url = String(url); calls.push({ url, init });
  if (url.includes('/rest/v1/users')) {
    if (!(init.headers.apikey === 'svc-key')) return new Response('no', { status: 401 });
    const em = decodeURIComponent(/email=eq\.([^&]+)/.exec(url)[1]); const u = users[em];
    return new Response(JSON.stringify(u && u.status === 'active' ? [u] : []), { status: 200 });
  }
  if (url.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'g-token', expires_in: 3600 }), { status: 200 });
  if (url.startsWith('https://docs.google.com/spreadsheets/d/SHEET123/gviz/tq')) {
    if (init.headers.Authorization !== 'Bearer g-token') return new Response('denied', { status: 401 });
    return new Response('google.visualization.Query.setResponse({"status":"ok","table":{}});', { status: 200 });
  }
  return new Response('?', { status: 404 });
};
const req = (path, o = {}) => new Request('https://gw.example' + path, { method: o.method || 'GET', headers: Object.assign({ Origin: ORIGIN }, o.headers || {}), body: o.body });
const login = (email, password) => handle(req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'content-type': 'application/json' } }), env, mockFetch);
const data = (sheet, tok) => handle(req('/bod/data?sheet=' + sheet, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), env, mockFetch);
const b64u = (b) => Buffer.from(b).toString('base64url');
const forge = (secret, over = {}) => { const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), now = Math.floor(Date.now() / 1000), p = b64u(JSON.stringify(Object.assign({ iss: 'alpro-bod-gateway', aud: 'bod', email: 'chief@x.id', role: 'chief', iat: now, exp: now + 900 }, over))); return h + '.' + p + '.' + crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url'); };

let pass = 0, fail = 0; const ok = (name, c, extra) => { if (c) pass++; else { fail++; console.log('FAIL', name, extra || ''); } console.log((c ? 'ok   ' : 'FAIL ') + name); };

let r = await login('chief@x.id', 'Pass#1'); let j = await r.json(); const chiefTok = j.token;
ok('chief logs in (legacy hash)', r.status === 200 && !!chiefTok && j.role === 'chief');
r = await login('bod@x.id', 'Strong#2'); j = await r.json(); const bodTok = j.token;
ok('user with bod ticked logs in (pbkdf2 hash)', r.status === 200 && !!bodTok);
r = await login('plain@x.id', 'Pass#3'); ok('user without bod gets 403', r.status === 403);
r = await login('chief@x.id', 'wrong'); ok('wrong password gets 401', r.status === 401);
r = await login('nobody@x.id', 'x'); ok('unknown user gets 401 (same message)', r.status === 401 && (await r.json()).error === 'invalid email or password');
for (let i = 0; i < 6; i++) r = await login('chief@x.id', 'bad' + i); ok('brute force is slowed (429)', r.status === 429);
r = await data('master'); ok('data without token gets 401', r.status === 401);
r = await data('master', 'abc.def.ghi'); ok('garbage token gets 401', r.status === 401);
r = await data('master', forge('alpro_jwt_secret_2024_secure')); ok('token forged with the OLD public secret gets 401', r.status === 401);
r = await data('master', forge(env.BOD_JWT_SECRET, { exp: Math.floor(Date.now() / 1000) - 10 })); ok('expired token gets 401', r.status === 401);
r = await data('master', forge(env.BOD_JWT_SECRET, { aud: 'other' })); ok('wrong audience gets 401', r.status === 401);
const n0 = calls.length;
r = await data('master', chiefTok); let txt = await r.text(); ok('chief gets MASTER via private sheet', r.status === 200 && txt.includes('setResponse'));
ok('sheet fetched with the service-account bearer, no sheet key leaked to client', calls.slice(n0).some((c) => c.url.includes('/gviz/tq') && c.init.headers.Authorization === 'Bearer g-token') && !txt.includes('g-token'));
r = await data('exec', bodTok); ok('ticked user gets Exec Dashboard', r.status === 200);
r = await data('secret', chiefTok); ok('unknown sheet name rejected', r.status === 400);
users['bod@x.id'].department_access = ['hr']; r = await data('master', bodTok); ok('access removed after sign-in stops data at once (403)', r.status === 403);
users['chief@x.id'].status = 'disabled'; r = await data('master', chiefTok); ok('disabled user stops at once (403)', r.status === 403); users['chief@x.id'].status = 'active';
r = await handle(req('/bod/data?sheet=master', { method: 'OPTIONS' }), env, mockFetch); ok('CORS preflight allowed for the dashboard origin', r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === ORIGIN);
r = await handle(new Request('https://gw.example/bod/data?sheet=master', { headers: { Origin: 'https://evil.example', Authorization: 'Bearer ' + chiefTok } }), env, mockFetch); ok('other origins get no CORS header', !r.headers.get('Access-Control-Allow-Origin'));
r = await handle(req('/health'), Object.assign({}, env, { GOOGLE_SERVICE_ACCOUNT: '' }), mockFetch); ok('unconfigured gateway answers 503, never open', r.status === 503);
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
