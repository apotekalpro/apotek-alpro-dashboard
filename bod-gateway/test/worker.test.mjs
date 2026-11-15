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

/* ===================== stage 1: app session + registered sheets ===================== */
users['chief2@x.id'] = { email: 'chief2@x.id', name: 'Chief2', role: 'chief', status: 'active', password_hash: legacy('Pass#1'), department_access: [] };
users['ppm@x.id'] = { email: 'ppm@x.id', name: 'Ppm', role: 'ppm', status: 'active', password_hash: legacy('Pass#4'), department_access: ['ppm'] };
users['mgr@x.id'] = { email: 'mgr@x.id', name: 'Mgr', role: 'manager', status: 'active', password_hash: legacy('Pass#3'), department_access: ['hr'] };
const HR = '1S4uqo11FidtOHXqRJQNdd_NAQhDPSfW57qxL4llXLlc';
const upstream = [];
const mf2 = async (url, init) => {
  url = String(url);
  let m = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)\/(gviz\/tq|export)\?/.exec(url) || /^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/([^/]+)\/values\//.exec(url);
  if (m) {
    upstream.push({ url, auth: init && init.headers && init.headers.Authorization });
    if (!init || !init.headers || init.headers.Authorization !== 'Bearer g-token') return new Response('denied', { status: 401 });
    if (m[1] === HR) return new Response('not shared', { status: 404 });
    return new Response('DATA:' + m[1], { status: 200 });
  }
  return mockFetch(url, init);
};
const appLogin = (email, pw) => handle(req('/auth/session', { method: 'POST', body: JSON.stringify({ email, password: pw }), headers: { 'content-type': 'application/json' } }), env, mf2);
const sh = (path, tok) => handle(req(path, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} }), env, mf2);
const forgeApp = (secret, over = {}) => { const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), now = Math.floor(Date.now() / 1000), pl = b64u(JSON.stringify(Object.assign({ iss: 'alpro-bod-gateway', aud: 'app', sub: 'chief2@x.id', email: 'chief2@x.id', role: 'chief', iat: now, exp: now + 3600 }, over))); return h + '.' + pl + '.' + crypto.createHmac('sha256', secret).update(h + '.' + pl).digest('base64url'); };

console.log('\n-- app session --');
r = await appLogin('mgr@x.id', 'Pass#3'); j = await r.json(); const mgrTok = j.token;
ok('any active user (no BOD) gets an app token', r.status === 200 && !!mgrTok && j.role === 'manager');
const ttl = j.exp - Math.floor(Date.now() / 1000); ok('app token lasts about 7 days', ttl > 6.9 * 86400 && ttl < 7.1 * 86400, ttl);
r = await appLogin('chief2@x.id', 'Pass#1'); j = await r.json(); const cTok = j.token; ok('chief gets an app token', r.status === 200 && !!cTok);
r = await appLogin('ppm@x.id', 'Pass#4'); j = await r.json(); const ppmTok = j.token; ok('ppm user gets an app token', r.status === 200 && !!ppmTok);
r = await appLogin('mgr@x.id', 'nope'); ok('wrong password on /auth/session gets 401', r.status === 401);
r = await appLogin('ghost@x.id', 'x'); ok('unknown user on /auth/session gets 401', r.status === 401);
r = await sh('/bod/data?sheet=exec', mgrTok); ok('app token cannot read the BOD workbook (audience separation)', r.status === 401);
r = await sh('/sheet/strategy/export?gid=352474780&format=csv', bodTok); ok('BOD token cannot read /sheet (audience separation)', r.status === 401);
r = await sh('/sheet/strategy/export?gid=352474780&format=csv', forgeApp('alpro_jwt_secret_2024_secure')); ok('app token forged with the OLD public secret gets 401', r.status === 401);
r = await sh('/sheet/strategy/export?gid=352474780&format=csv', forgeApp(env.BOD_JWT_SECRET, { exp: Math.floor(Date.now() / 1000) - 5 })); ok('expired app token gets 401', r.status === 401);
r = await sh('/sheet/strategy/export?gid=352474780&format=csv'); ok('/sheet without a token gets 401', r.status === 401);

console.log('\n-- registered sheets --');
let n1 = upstream.length;
r = await sh('/sheet/strategy/export?gid=352474780&format=csv', mgrTok); let t = await r.text();
ok('strategy export of the allowed gid works for any user', r.status === 200 && t === 'DATA:1oU2uCC1WokxCFZAW8pKeb4osZC-ktIwB-TvlyvpRZ6s' && /text\/csv/.test(r.headers.get('content-type')));
ok('Google is called with the service-account bearer and only the fixed URL shape', upstream.length === n1 + 1 && upstream[n1].auth === 'Bearer g-token' && upstream[n1].url === 'https://docs.google.com/spreadsheets/d/1oU2uCC1WokxCFZAW8pKeb4osZC-ktIwB-TvlyvpRZ6s/export?format=csv&gid=352474780', upstream[n1] && upstream[n1].url);
r = await sh('/sheet/strategy/export?gid=999&format=csv', mgrTok); ok('a gid outside the allow-list is refused (403)', r.status === 403);
r = await sh('/sheet/strategy/export?format=csv', mgrTok); ok('export without gid is refused (403, no default tab)', r.status === 403);
r = await sh('/sheet/pillar/export?gid=341128155&format=csv', mgrTok); ok('pillar second gid works', r.status === 200);
r = await sh('/sheet/nothere/gviz?sheet=x', mgrTok); ok('unregistered key is 404', r.status === 404);
r = await sh('/sheet/strategy/gviz?tqx=out:csv&gid=352474780&tq=select%20*', mgrTok); ok('query-language parameter is refused (400)', r.status === 400);
r = await sh('/sheet/strategy/gviz?gid=1%26tq%3Dselect', mgrTok); ok('gid must be digits only (400)', r.status === 400);
r = await sh('/sheet/company/gviz?tqx=out:csv&sheet=AM%20Daily%20Progress%26tq%3Dselect%20*', mgrTok); ok('injecting a parameter through the sheet name is refused (403)', r.status === 403);
r = await sh('/sheet/strategy/gviz?tqx=out:evil&gid=352474780', mgrTok); ok('unknown output format refused (400)', r.status === 400);
r = await sh('/sheet/strategy/gviz?gid=352474780&range=A1:B2%26tq%3Dx', mgrTok); ok('bad cell range refused (400)', r.status === 400);

console.log('\n-- company workbook: BOD tabs stay behind /bod/data --');
r = await sh('/sheet/company/gviz?tqx=out:csv&sheet=Goal+Jan+2026+to+Dec+2026', mgrTok); ok('Goal tab readable by any user (the + in the URL is a space)', r.status === 200);
r = await sh('/sheet/company/gviz?tqx=out:csv&sheet=AM+Daily+Progress', mgrTok); ok('AM Daily Progress tab readable', r.status === 200);
r = await sh('/sheet/company/gviz?tqx=out:csv&sheet=SBM%20EBM%20DASHBOARD', mgrTok); ok('SBM EBM DASHBOARD tab readable', r.status === 200);
r = await sh('/sheet/company/export?format=csv&gid=353860854', mgrTok); ok('AM Daily Progress by gid readable', r.status === 200);
r = await sh('/sheet/company/gviz?tqx=out:json&sheet=MASTER&headers=4', mgrTok); ok('MASTER (BOD data) is NOT served to an ordinary user', r.status === 403);
r = await sh('/sheet/company/gviz?tqx=out:json&sheet=MASTER&headers=4', cTok); ok('MASTER is not served on /sheet even to a Chief (only /bod/data)', r.status === 403);
r = await sh('/sheet/company/gviz?tqx=out:json&sheet=Exec%20Dashboard', cTok); ok('Exec Dashboard is not served on /sheet either', r.status === 403);
r = await sh('/sheet/company/gviz?tqx=out:json', cTok); ok('company with no tab named (would be the first tab) is refused', r.status === 403);

console.log('\n-- per-sheet access rules --');
r = await sh('/sheet/hr/gviz?tqx=out:csv&sheet=Anything', mgrTok); ok('HR sheet: ordinary user refused (403)', r.status === 403);
r = await sh('/sheet/hr/gviz?tqx=out:csv&sheet=Anything', ppmTok); ok('HR sheet: ppm role passes the access rule (then Google says 404 = not shared yet)', r.status === 502);
r = await sh('/sheet/hr/gviz?tqx=out:csv&sheet=Anything', cTok); ok('HR sheet: chief passes the access rule', r.status === 502);

console.log('\n-- values (Sheets API) for OPEX --');
n1 = upstream.length;
r = await sh('/sheet/opex/values?range=' + encodeURIComponent('Audit!A:N'), mgrTok); t = await r.text();
ok('opex values for an allowed tab works', r.status === 200 && t === 'DATA:1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M');
ok('values call goes to the Sheets API with the bearer, no API key', upstream[n1].url === 'https://sheets.googleapis.com/v4/spreadsheets/1WkoZimssIpNbHZMhExTKiQkgyNMSLWeN0PXH_hQU08M/values/Audit!A%3AN' && upstream[n1].auth === 'Bearer g-token', upstream[n1].url);
r = await sh('/sheet/opex/values?range=' + encodeURIComponent('Secret!A:B'), mgrTok); ok('opex values for a tab outside the list is refused (403)', r.status === 403);
r = await sh('/sheet/opex/values?range=' + encodeURIComponent('Audit!A:N?key=1'), mgrTok); ok('values range with extra characters refused (400)', r.status === 400);
r = await sh('/sheet/opex/values?range=A:N', mgrTok); ok('values range without a tab refused (400)', r.status === 400);
r = await sh('/sheet/opex/values?range=' + encodeURIComponent("'FieldAudit_Detail'!A:AU"), mgrTok); ok('quoted tab name accepted', r.status === 200);

console.log('\n-- access changes take effect at once --');
users['mgr@x.id'].status = 'disabled'; r = await sh('/sheet/strategy/export?gid=352474780&format=csv', mgrTok); ok('disabled user is stopped on the next request (403)', r.status === 403); users['mgr@x.id'].status = 'active';

console.log('\n-- selftest --');
r = await sh('/admin/selftest'); ok('selftest without token 401', r.status === 401);
r = await sh('/admin/selftest', mgrTok); ok('selftest for a non-chief 403', r.status === 403);
r = await sh('/admin/selftest', cTok); j = await r.json();
ok('selftest for chief lists every registered sheet', r.status === 200 && ['company', 'strategy', 'pillar', 'loss', 'biodata', 'opex', 'hr'].every((k) => k in j.sheets), JSON.stringify(j));
ok('selftest says ok for shared sheets and how to fix the others', j.sheets.strategy === 'ok' && /share the sheet with the service account/.test(j.sheets.hr), JSON.stringify(j.sheets));
ok('selftest shows the service-account email to share with', j.service_account === 'bod@test.iam.gserviceaccount.com');
ok('selftest returns no sheet data', !JSON.stringify(j).includes('DATA:'));
r = await handle(req('/sheet/strategy/export?gid=352474780&format=csv', { headers: { Origin: 'https://evil.example', Authorization: 'Bearer ' + mgrTok } }), env, mf2);
ok('other origins get no CORS header on /sheet', !r.headers.get('access-control-allow-origin'));

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
