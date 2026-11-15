# BOD gateway (Cloudflare Worker)

GitHub Pages only serves static files and this repo is public, so anything the browser needs is public.
This Worker holds the secrets and only returns BOD data to a signed-in user who is **Chief** or has **bod** ticked in
`department_access`. Access is re-checked against the users table on every data request, so removing someone's BOD tick or
disabling them cuts them off immediately (not at token expiry).

```
POST /auth/login    {email,password} -> BOD token   8 h, Chief or 'bod' ticked only
POST /auth/session  {email,password} -> app token   7 d (APP_TOKEN_HOURS), any active user;
                                        also returns bod_token/bod_exp when the user has BOD access
GET  /bod/data?sheet=master|exec     -> BOD workbook   (Bearer <BOD token>)
GET  /sheet/<key>/gviz|export|values -> a registered sheet (Bearer <app token>)
GET  /admin/selftest                 -> Chief/Admin only: which sheets the service account can already read
GET  /health
```

## One-time setup (about 20 minutes)

1. **Google service account** (Google Cloud Console): create a project, enable *Google Sheets API* and *Google Drive API*,
   create a service account, create a JSON key. Open the BOD Google Sheet -> Share -> add the service account's
   `client_email` as **Viewer**.
2. **Deploy** (from `bod-gateway/`):
   ```bash
   npx wrangler login            # your own Cloudflare account, on your own computer
   npx wrangler secret put SUPABASE_SERVICE_KEY     # a NEW Supabase secret key (sb_secret_...) for project txmr..., created in Supabase > Settings > API Keys. It sits next to the old keys, so nothing breaks.
   npx wrangler secret put BOD_JWT_SECRET           # any long random string, e.g. openssl rand -base64 48
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT   # paste the whole JSON key file
   npx wrangler deploy
   ```
   Check `https://<worker>.workers.dev/health` returns `{"ok":true}`.
3. **Turn it on:** set `window.BOD_GATEWAY_URL = 'https://<worker>.workers.dev'` in `bod-config.js`, merge, hard refresh.
   BOD then asks for its own sign-in and loads all data through the Worker. The old client-side token check is ignored in this mode.
4. **Do NOT lock the sheet yet.** The same workbook is also read directly by the main dashboard and the AM tracker
   (tabs "Goal 2026", "AM Daily Progress", "SBM EBM DASHBOARD"). Setting it to Restricted now would break those pages.
   Lock it only after every page that reads it goes through the Worker (phase 2). Until then BOD data is still readable
   from the public sheet link by anyone who has it; this step makes BOD itself properly access-controlled, but does not yet close the sheet.
5. **Rate limit** (Cloudflare dashboard -> Security -> WAF -> Rate limiting): e.g. 10 requests / minute on `/auth/login`.
   The Worker has a small per-instance brake (5 failures / 15 min) but a real rule is stronger.

Rollback at any time: set `BOD_GATEWAY_URL` back to `''` (if you have already restricted the sheet, re-share it as "Anyone with the link").

## Stage 1: registered sheets (private Google Sheets behind the Worker)

The Worker can now serve the other Google Sheets too, so they can be set to **Restricted** once the pages read through it.
Pages switch over one sheet at a time (see the trial below). A page that has not been switched keeps reading the sheet directly.

Registered in `registry()` in `src/worker.js` (key: sheet, who may read, which tabs):

| key | sheet | who | tabs served |
|---|---|---|---|
| `company` | Company Performance workbook (`SHEET_ID`) | any active user | only Goal Jan 2026 to Dec 2026, AM Daily Progress (name or gid 353860854), SBM EBM DASHBOARD. MASTER and Exec Dashboard are **never** served here, only through `/bod/data` |
| `strategy` | Strategy Team Dashboard | any active user | gid 352474780 |
| `pillar` | Pillar Compilation | any active user | gids 1852108984, 341128155 |
| `loss` | Loss Sales Tracker (also Price comparison) | any active user | gids 1075651210, 0 |
| `biodata` | Biodata Outlet | any active user | DIGITAL MASTER |
| `opex` | OPEX Dashboard Master | any active user | the 7 tabs OPEX reads |
| `hr` | Master Data (HR) | Chief/Admin, role or dept `ppm`/`strategy` | whole workbook. **Not wired to any page** (the PPM tab is another repo) |

Rules the Worker enforces: only registered keys; only the listed tabs; only digits for `gid`; cell ranges validated; no query-language
(`tq`) parameter; unknown parameters are never forwarded (the Google URL is rebuilt from validated pieces). The user is re-read from
Supabase on every call, so a disabled user is cut off at once. BOD and app tokens have different audiences and cannot be swapped.

**Re-deploy after pulling this change:** paste the new `src/worker.js` into the Worker editor and Deploy (no new secrets or variables needed;
optionally add the variable `APP_TOKEN_HOURS`, default 168). Then share each sheet with the service account (**Viewer**) and check
`/admin/selftest` (needs a Chief or Admin app token from `POST /auth/session`). It lists every registered sheet as `ok` or `share the sheet with the service account`.

Do not set a sheet to Restricted until its readers have been switched to the Worker (stage 2) and `/admin/selftest` says `ok` for it.

## Trial: Biodata Outlet (the first sheet behind the Worker)

`gw-client.js` (`window.AlproGW.sheetText`) reads a registered sheet through the Worker using the app token that the dashboard login
stores in `localStorage['alpro_gw_app']`. If the browser has no token (or the Worker does not know the endpoint yet) it falls back to the
old direct read, so nothing breaks while the sheet is still public. Switched so far: Biodata Outlet, Pillar Tracker, Strategy (PSH Bull Eye), Loss Sales Tracker, Price Comparison Tracker, and every reader of the BOD workbook (AM Performance Tracker in `index.html` and `am-performance-tracker.html`, Elite BM Tracker, AM forecast, Goal targets, outlet types).
Not switched on purpose: OPEX (Google API key still used) and the PPM/HR sheet (separate repo). The Android `www/` copy is not updated.
The Worker streams the Google response instead of buffering it (the Loss sheet's main tab is about 30 MB).

Steps:
1. Merge, then paste the new `src/worker.js` into the Cloudflare editor and Deploy. `POST /auth/session` must answer 400 (not 404) to an empty body.
2. Wait for GitHub Pages (about 10 min), hard refresh, **log out and log in again** (this is what stores the token).
3. Open Operations, Biodata Outlet. Status line says "Live data loaded". Console: `AlproGW.last.biodata` is `'gateway'`.
4. Restrict the Biodata sheet in Google Sheets, reload, and check it still loads. An anonymous request to the sheet must now return 401.
5. Rollback: set the sheet back to "Anyone with the link" (instant), or set `BOD_GATEWAY_URL` to `''`.

After the sheet is restricted, a browser that has no gateway token shows "session expired, log out and sign in again" on that page.

## Important limits of this step
- It protects the **BOD data**. The main dashboard (`index.html`) still talks to Supabase directly with an embedded key;
  that is the next thing to move behind a Worker (see the PR description).
- Passwords are still verified against the existing stored format (base64 "legacy" hash for most users, PBKDF2 for some).
  The Worker accepts the same formats so nobody has to reset anything, but the legacy format is weak. Plan a migration to PBKDF2/argon2 on next login.
- BOD now has a separate sign-in (same email and password). The Executive Dashboard session is deliberately not trusted by BOD in secure mode,
  because the browser can be told to claim any role.

## Tests
`node bod-gateway/test/worker.test.mjs` (74 checks, mocked Google and Supabase): login for both hash formats, forged / expired /
wrong-audience tokens, a token forged with the old public secret, BOD and app tokens not interchangeable, access revoked after
sign-in, disabled user, CORS, unconfigured = closed, tab allow-lists (MASTER never served on `/sheet`), parameter-injection attempts,
per-sheet access rules, Sheets-API `values` calls, and the Chief/Admin-only selftest.
