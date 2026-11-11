// ════════════════════════════════════════════════════════════════
//  ADMIN SETTINGS (no secrets live in this file any more)
// ════════════════════════════════════════════════════════════════
//  Everything secret is read from environment variables:
//    ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET, ADMIN_KEY_SECRET
//  On Vercel: Settings → Environment Variables. Locally: the .env file.
//  If any of them is missing in production, the admin login stays CLOSED.
//
//  ▸ Make a new key file:   npm run gen-key
//  ▸ Lock out a lost key file: put its ID in the ADMIN_REVOKED_KEY_IDS
//    environment variable (comma separated), or in the list below.
// ════════════════════════════════════════════════════════════════

// Key files you want to disable (their IDs).
export const REVOKED_KEY_IDS = [];

// Logged out automatically after this many minutes.
export const SESSION_MINUTES = 60;
