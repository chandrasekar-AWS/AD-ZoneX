import fs from 'node:fs';

// Reads ADMIN_KEY_SECRET from the .env file (or the environment) BEFORE the key file is made.
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*([^#]*?)\s*(#.*)?$/);
    if (m && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
if (!process.env.ADMIN_KEY_SECRET || process.env.ADMIN_KEY_SECRET.length < 24) {
  console.error('\nSet ADMIN_KEY_SECRET (24+ random characters) in .env first, then run this again.\n');
  process.exit(1);
}

const { makeKeyFile } = await import('../server/lib/keyfile.mjs');
const { kid, text } = makeKeyFile();
fs.mkdirSync('generated-keys', { recursive: true });
const file = `generated-keys/adzone-admin-${kid}.key`;
fs.writeFileSync(file, text);
console.log(`\nNew key file created:\n\n   ${file}\n   (key ID: ${kid})\n`);
console.log('Copy it somewhere safe (pen-drive). Upload it on /admin/login to sign in.');
console.log('To disable this key later, add its ID to the ADMIN_REVOKED_KEY_IDS environment variable\n');
