import { execSync } from 'node:child_process';
const B = 'http://localhost:8787/app/api', H = { 'x-uns': '1', 'content-type': 'application/json' };
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + x)); if (!c) process.exitCode = 1; };
const post = (p, b, ck) => fetch(B + p, { method: 'POST', headers: { ...H, ...(ck ? { cookie: ck } : {}) }, body: JSON.stringify(b || {}) });
const q = (sql) => JSON.parse(execSync(`npx wrangler d1 execute uns-app --local --persist-to .state --json --command "${sql}"`, { encoding: 'utf8' }))[0].results;
const PW = 'test-pass-123456';
const adm = (await post('/login', { login_id: 'tabish', password: PW })).headers.getSetCookie()[0].split(';')[0];
const lid = 'fg' + (Date.now() % 1000000), lid2 = lid + 'b';
for (const l of [lid, lid2]) { const nu = await (await post('/admin/users', { name: 'FG', login_id: l, role: 'founder' }, adm)).json(); await post('/reset', { token: nu.path.split('#')[1], password: PW }); }
const cnt = (l) => q(`SELECT COUNT(*) n FROM reset_tokens r JOIN users u ON u.id=r.user_id WHERE r.via='mail' AND u.login_id='${l}'`)[0].n;
const ck = (await post('/login', { login_id: lid, password: PW })).headers.getSetCookie()[0].split(';')[0];
// no email yet: same answer, no token
let a = await post('/forgot', { login_id: lid }), ja = await a.text();
let b = await post('/forgot', { login_id: 'nobody-here' }), jb = await b.text();
ok('same reply for known and unknown', a.status === 200 && b.status === 200 && ja === jb, ja + jb);
ok('no email, no token', cnt(lid) === 0);
// set email needs password
ok('email refused with wrong password', (await post('/me/email', { email: 'x@y.com', current: 'nope-nope-nope1' }, ck)).status === 403);
ok('bad email refused', (await post('/me/email', { email: 'nope', current: PW }, ck)).status === 400);
ok('email saved', (await post('/me/email', { email: 'Test@Example.com', current: PW }, ck)).status === 200);
ok('/me shows email', (await (await fetch(B + '/me', { headers: { cookie: ck } })).json()).email === 'test@example.com');
// requests create tokens, previous ones are voided, limit is 3 per hour
for (let i = 0; i < 5; i++) await post('/forgot', { login_id: lid });
ok('rate limit: 3 tokens an hour', cnt(lid) === 3, cnt(lid));
ok('only one token still usable', q(`SELECT COUNT(*) n FROM reset_tokens r JOIN users u ON u.id=r.user_id WHERE r.via='mail' AND r.used_at IS NULL AND u.login_id='${lid}'`)[0].n === 1);
ok('token lives 30 minutes', (() => { const r = q(`SELECT (julianday(r.expires_at)-julianday(r.created_at))*1440 m FROM reset_tokens r JOIN users u ON u.id=r.user_id WHERE r.via='mail' AND r.used_at IS NULL AND u.login_id='${lid}'`)[0].m; return Math.abs(r - 30) < 0.5; })());
await new Promise(r => setTimeout(r, 1500)); ok('failed send is logged', q(`SELECT COUNT(*) n FROM activity_log WHERE action='reset_mail_failed' AND actor='${lid}'`)[0].n >= 1);
// dev sets someone else's email; non-dev cannot
ok('dev sets email', (await post('/admin/user-email', { login_id: lid2, email: 'b@example.com' }, adm)).status === 200);
ok('non-dev cannot', (await post('/admin/user-email', { login_id: lid2, email: 'c@example.com' }, ck)).status === 403);
ok('mail test needs SMTP', (await post('/admin/mail-test', {}, adm)).status >= 400);
ok('forgot needs the CSRF header', (await fetch(B + '/forgot', { method: 'POST', body: '{}' })).status === 403);
