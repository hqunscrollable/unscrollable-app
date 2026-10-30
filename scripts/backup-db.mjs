// Local database backup. Run on your computer (Windows Task Scheduler works well, daily).
//   node scripts/backup-db.mjs "F:\\unscrollable\\db-backups"
// Needs `wrangler login` done once. Keeps every file, named by date and time.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || './db-backups';
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = join(dir, `uns-app-${stamp}.sql`);
execFileSync('npx', ['wrangler', 'd1', 'export', 'uns-app', '--remote', '--output', out], { stdio: 'inherit', shell: true });
console.log('Saved', out, statSync(out).size, 'bytes');
console.log('Files in folder:', readdirSync(dir).length);
