# Unscrollable master app (Sprint 1, v1.0.0-dev)

Founders' app at `unscrollable.studio/app`. Live screens: Home, Leads, Follow-ups, Tasks, My account, Developer.
Every other screen is a labelled "Demo" screen with example data held in the browser only (never in the database).

## Run it on your computer
```
npm install
npx wrangler d1 migrations apply uns-app --local --persist-to .state
UNS_PASSWORD=<test password> node scripts/create-user.mjs tabish Tabish --dev > user.sql   # local test only
npx wrangler d1 execute uns-app --local --persist-to .state --file user.sql
npx wrangler dev --local --persist-to .state --port 8799      # open http://localhost:8799/app/
node test/ui.mjs                                              # browser test, needs Playwright
```
For real accounts leave UNS_PASSWORD unset: the script asks for the password, hidden. Never put a real password in chat or in a file.

## Go live (Gate 3, Tabish does the logins)
1. Cloudflare account under hq@, two-factor on, password manager.
2. `npx wrangler d1 create uns-app`, paste the id into wrangler.toml.
3. `npx wrangler d1 migrations apply uns-app --remote`
4. Secrets: `npx wrangler secret put TOTP_KEY` (random 32 bytes, base64), `DISCORD_ERRORS`, `DISCORD_ALERTS` (webhook URLs).
5. Create the three accounts with `scripts/create-user.mjs ... > user.sql` then `npx wrangler d1 execute uns-app --remote --file user.sql`. Delete user.sql after.
6. `npx wrangler deploy`, test on the workers.dev address first. Add the production route only after DNS is on Cloudflare with the mail records copied exactly.
7. Sign in as each founder, set up two-factor in My account, check the Developer screen.

## Backups
`node scripts/backup-db.mjs "F:\unscrollable\db-backups"` exports the database. Run it daily from Windows Task Scheduler.

## Known open items
- Password hashing cost on the free plan is not yet measured on real Cloudflare. If sign-in hits the CPU limit, Workers Paid (about $5 a month, unverified) fixes it.
- No email sender yet. Password resets use a one-time link Tabish creates in Developer.
- Lead model (stages, signals, five-a-day queue) is a draft until Tabish confirms it after the team call.
- "Today" uses Asia/Karachi. Confirm.

## Locked out of your own account
Only Tabish can fix this, from the PC, in the hq.unscrollable Cloudflare login (`npx wrangler whoami` must show account ec2f152a...). Clears a pending reset and any lockout, password and two-factor stay as they are:
```
npx wrangler d1 execute uns-app --remote --command "UPDATE credentials SET must_reset=0, failed_count=0, locked_until=NULL WHERE user_id=(SELECT id FROM users WHERE login_id='tabish')"
```
Dashboard fallback: Storage and databases, D1, uns-app, Console, paste the UPDATE.
