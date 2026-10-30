# AD ZONEX — Vercel + Supabase setup

Project root = the site. Hosting: Vercel. Database + photo storage: Supabase.
Admin login: Admin ID → Password → Key file (unchanged).

## 1. Supabase (once)
1. supabase.com → **New project** (region near you, e.g. Mumbai/Singapore). Save the database password.
2. **SQL Editor → New query** → paste everything from `supabase/setup.sql` → **Run**.
   (Creates the `kv_store` table, locks it so the public key can't touch it, and creates the private `media` bucket.)
3. **Project Settings → API** → copy the **Project URL** and the **service_role** key.
   The service_role key is a secret: it goes ONLY into Vercel env vars, never into GitHub or the browser.

## 2. Upload to GitHub
```
git init
git add .
git status        # node_modules, .env, generated-keys must NOT be listed
git commit -m "AD ZONEX website"
git branch -M main
git remote add origin https://github.com/chandrasekar-AWS/AD-ZoneX.git
git push -u origin main
```

## 3. Vercel
**Add New → Project** → import `AD-ZoneX` → keep the detected Vite settings → then **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL from step 1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from step 1.3 |
| `SMTP_USER` | `designadzonex@gmail.com` (Gmail that SENDS the emails) |
| `SMTP_PASS` | Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords) |
| `ADMIN_USERNAME` | your admin ID (choose a NEW one, not the old `adzone_admin`) |
| `ADMIN_PASSWORD` | **required**, 12+ random characters |
| `ADMIN_SECRET` | **required**, 24+ random characters (signs login sessions) |
| `ADMIN_KEY_SECRET` | **required**, 24+ random characters; then make a key file with `npm run gen-key` |
| `ADMIN_REVOKED_KEY_IDS` | optional, key IDs to lock out (comma separated) |
| `CRON_SECRET` | **required**, 16+ random characters; protects the daily-backup URL |
| `VITE_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET` | optional human check on the public forms (see below) |
| `VITE_GA_ID` | optional Google Analytics ID |

Then **Deployments → Redeploy** (variables only apply to new deployments).

## 4. Where enquiries go
- Design services → `designadzonex@gmail.com`
- Print / Signage / Digital (or none chosen) → `enquiry@adzonex.in`
- Every enquiry is also saved (Admin → Enquiries, and Supabase → Table Editor → `kv_store`). Check Outlook's Junk folder on the first test.

## 5. Admin
Open `/admin/login` (not linked on the site). Make a key file: `npm run gen-key` → `generated-keys/` (keep it off GitHub).
Wrong-password lock-out (5 tries → 10 min) is stored in Supabase, so it works reliably on Vercel.
Daily auto-backup runs via Vercel Cron; **Admin → Backups** has Back up now / Download / Restore.

## 6. Run locally
```
npm install
npm run dev
```
http://localhost:5173 — locally, data is kept in `.local-data/` (Supabase not needed). Copy `.env.example` to `.env` to test emails.

## Security headers and Google Analytics
`vercel.json` sets a strict Content-Security-Policy (`script-src 'self'`) plus Trusted Types.
If you turn on Google Analytics (`VITE_GA_ID`), add `https://www.googletagmanager.com` to `script-src`
in `vercel.json`. (`src/trustedTypes.js` already allows that host.) After changing headers, open the
live site, press F12 and check the Console shows no "Trusted Type" or "Content Security Policy" errors.

## IMPORTANT: replace the old admin secrets
Older versions of this project had the admin password and secrets written inside `server/lib/admin-config.mjs`,
and that file is in your GitHub history. **Treat them as public.** Now:
1. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, `ADMIN_KEY_SECRET`, `CRON_SECRET` on Vercel with NEW random values
   (a password manager can generate them). If any are missing or weak, `/admin` stays closed.
2. Put the same `ADMIN_KEY_SECRET` in your local `.env`, run `npm run gen-key`, keep the new key file off GitHub. Old key files stop working.
3. Redeploy on Vercel. Everyone is signed out.
You can generate a random value with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## Human check (CAPTCHA) on the contact and careers forms
Optional and free: Cloudflare dashboard → Turnstile → add your site → copy the Site key and Secret key.
Set `VITE_TURNSTILE_SITE_KEY` (site key) and `TURNSTILE_SECRET` (secret key) on Vercel and redeploy. Then in `vercel.json`
add `https://challenges.cloudflare.com` to `script-src`, `connect-src` and a new `frame-src` entry. Without keys the forms use the
hidden honeypot field plus rate limits (5 messages per 10 minutes, 3 applications per hour, per visitor).

## Admin activity log
Every sign-in (success and failure), upload, delete, content save, backup and restore is recorded. See `GET /api/audit` when signed in,
Supabase → Table Editor → `kv_store` (keys starting `audit/`), or Vercel → Logs (search `[audit]`).

## Tests
`npm test` runs 31 automated security checks (no internet or Supabase needed). Run it before every deploy.
