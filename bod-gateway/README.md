# BOD gateway (Cloudflare Worker)

GitHub Pages only serves static files and this repo is public, so anything the browser needs is public.
This Worker holds the secrets and only returns BOD data to a signed-in user who is **Chief** or has **bod** ticked in
`department_access`. Access is re-checked against the users table on every data request, so removing someone's BOD tick or
disabling them cuts them off immediately (not at token expiry).

```
POST /auth/login  {email,password} -> {token,exp,email,name,role}   8-hour token, signed with a secret that never leaves the Worker
GET  /bod/data?sheet=master|exec   -> gviz JSON  (Authorization: Bearer <token>)
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

## Important limits of this step
- It protects the **BOD data**. The main dashboard (`index.html`) still talks to Supabase directly with an embedded key;
  that is the next thing to move behind a Worker (see the PR description).
- Passwords are still verified against the existing stored format (base64 "legacy" hash for most users, PBKDF2 for some).
  The Worker accepts the same formats so nobody has to reset anything, but the legacy format is weak. Plan a migration to PBKDF2/argon2 on next login.
- BOD now has a separate sign-in (same email and password). The Executive Dashboard session is deliberately not trusted by BOD in secure mode,
  because the browser can be told to claim any role.

## Tests
`node bod-gateway/test/worker.test.mjs` (20 checks: login for both hash formats, forged / expired / wrong-audience tokens,
a token forged with the old public secret, access revoked after sign-in, disabled user, CORS, unconfigured = closed).
