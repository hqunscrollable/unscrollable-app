// Create a founder account. Run on YOUR computer. The password is typed here, never in chat.
//   node scripts/create-user.mjs tabish "Tabish" --dev > user.sql
//   npx wrangler d1 execute uns-app --remote --file user.sql     (use --local to test)
// Then delete user.sql. It holds a hash, not the password, but keep it out of backups anyway.
import { hashPassword, newSalt, ITERATIONS, randomHex } from '../src/crypto.js';

const [loginId, name, ...flags] = process.argv.slice(2);
if (!loginId || !name) { console.error('Usage: node scripts/create-user.mjs <login_id> <Name> [--dev]'); process.exit(1); }
const isDev = flags.includes('--dev') ? 1 : 0;

function ask(prompt) {
  return new Promise((resolve) => {
    process.stderr.write(prompt);
    const stdin = process.stdin; let buf = '';
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume(); stdin.setEncoding('utf8');
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') { if (stdin.isTTY) stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); process.stderr.write('\n'); return resolve(buf); }
        if (c === '\u0003') process.exit(1);
        if (c === '\u007f') buf = buf.slice(0, -1); else buf += c;
      }
    };
    stdin.on('data', onData);
  });
}
// UNS_PASSWORD is for automated local tests only. Real accounts: leave it unset and type the password.
const pw = process.env.UNS_PASSWORD || await ask('Password (min 12 characters, not shown): ');
const pw2 = process.env.UNS_PASSWORD || await ask('Again: ');
if (pw !== pw2) { console.error('Passwords differ.'); process.exit(1); }
if (pw.length < 12) { console.error('Too short.'); process.exit(1); }
const salt = newSalt();
const hash = await hashPassword(pw, salt);
const uid = 'u_' + randomHex(6);
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
console.log(`INSERT INTO users(id,login_id,name,is_dev) VALUES (${q(uid)},${q(loginId.toLowerCase())},${q(name)},${isDev});`);
console.log(`INSERT INTO credentials(user_id,password_hash,salt,iterations) VALUES (${q(uid)},${q(hash)},${q(salt)},${ITERATIONS});`);
