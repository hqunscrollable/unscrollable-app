import { totpNow } from '../src/crypto.js';
const B = 'http://localhost:8799/app/api', H = { 'x-uns': '1', 'content-type': 'application/json' };
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + x)); if (!c) process.exitCode = 1; };
const post = (p, b, ck) => fetch(B + p, { method: 'POST', headers: { ...H, ...(ck ? { cookie: ck } : {}) }, body: JSON.stringify(b || {}) });
const cookies = (r) => r.headers.getSetCookie().map(c => c.split(';')[0]);
const PW = 'test-pass-123456', PW2 = 'another-pass-987654';
// admin makes a fresh user
const a = await post('/login', { login_id: 'tabish', password: PW }); const adm = cookies(a)[0];
const lid = 'rc' + (Date.now() % 1000000);
const nu = await (await post('/admin/users', { name: 'Recovery T', login_id: lid, role: 'founder' }, adm)).json();
const tok = nu.path.split('#')[1];
ok('reset link set password', (await post('/reset', { token: tok, password: PW })).status === 200);
let r = await post('/login', { login_id: lid, password: PW }); const ck = cookies(r)[0]; ok('login without 2fa', r.status === 200, r.status);
// 2FA on, codes come back
const su = await (await post('/2fa/setup', {}, ck)).json();
const en = await post('/2fa/enable', { code: await totpNow(su.secret) }, ck); const eb = await en.json();
ok('2fa on returns 10 codes', en.status === 200 && eb.codes && eb.codes.length === 10, JSON.stringify(eb));
ok('codes look like xxxxx-xxxxx', /^[0-9a-f]{5}-[0-9a-f]{5}$/.test(eb.codes[0]), eb.codes[0]);
const me = await (await fetch(B + '/me', { headers: { cookie: ck } })).json(); ok('me shows 10 left', me.recovery_left === 10, JSON.stringify(me));
// totp login still works
r = await post('/login', { login_id: lid, password: PW, code: await totpNow(su.secret) }); ok('totp login works', r.status === 200, r.status);
r = await post('/login', { login_id: lid, password: PW }); ok('no code is refused', r.status === 401, r.status);
// recovery code once
r = await post('/login', { login_id: lid, password: PW, code: eb.codes[0] }); const rb = await r.json(); ok('recovery code signs in', r.status === 200 && rb.recovery_left === 9, r.status + JSON.stringify(rb));
r = await post('/login', { login_id: lid, password: PW, code: eb.codes[0] }); ok('same recovery code refused', r.status === 401, r.status);
r = await post('/login', { login_id: lid, password: 'wrong-password-xyz', code: eb.codes[1] }); ok('recovery code needs the right password', r.status === 401, r.status);
r = await post('/login', { login_id: lid, password: PW, code: eb.codes[1].toUpperCase().replace('-', ' ') }); ok('code typed in capitals with a space works', r.status === 200, r.status);
// remember device
r = await post('/login', { login_id: lid, password: PW, code: await totpNow(su.secret), remember: true }); const cs = cookies(r);
const dev = cs.find(c => c.startsWith('uns_dev=')); ok('remember sets device cookie', r.status === 200 && !!dev, cs.join('|'));
r = await post('/login', { login_id: lid, password: PW }); ok('no code refused without the cookie', r.status === 401, r.status);
r = await fetch(B + '/login', { method: 'POST', headers: { ...H, cookie: dev }, body: JSON.stringify({ login_id: lid, password: PW }) }); ok('trusted device skips the code', r.status === 200, r.status);
r = await fetch(B + '/login', { method: 'POST', headers: { ...H, cookie: dev }, body: JSON.stringify({ login_id: lid, password: 'wrong-password-xyz' }) }); ok('trusted device still needs the password', r.status === 401, r.status);
// another user's device cookie does not work
const lid2 = 'rd' + (Date.now() % 1000000); const nu2 = await (await post('/admin/users', { name: 'Other', login_id: lid2, role: 'founder' }, adm)).json();
await post('/reset', { token: nu2.path.split('#')[1], password: PW });
const s2 = cookies(await post('/login', { login_id: lid2, password: PW }))[0]; const su2 = await (await post('/2fa/setup', {}, s2)).json(); await post('/2fa/enable', { code: await totpNow(su2.secret) }, s2);
r = await fetch(B + '/login', { method: 'POST', headers: { ...H, cookie: dev }, body: JSON.stringify({ login_id: lid2, password: PW }) }); ok('device cookie is tied to one user', r.status === 401, r.status);
// new codes need the password
r = await post('/2fa/recovery', { current: 'nope-nope-nope-1' }, ck); ok('new codes refused with wrong password', r.status === 403, r.status);
r = await post('/2fa/recovery', { current: PW }, ck); const nb = await r.json(); ok('new codes made', r.status === 200 && nb.codes.length === 10, r.status);
r = await post('/login', { login_id: lid, password: PW, code: eb.codes[2] }); ok('old codes are dead', r.status === 401, r.status);
r = await post('/login', { login_id: lid, password: PW, code: nb.codes[0] }); ok('new code works', r.status === 200, r.status);
// forget devices
r = await post('/2fa/forget-devices', {}, ck); ok('forget devices', r.status === 200, r.status);
r = await fetch(B + '/login', { method: 'POST', headers: { ...H, cookie: dev }, body: JSON.stringify({ login_id: lid, password: PW }) }); ok('old device now needs a code', r.status === 401, r.status);
// password change forgets devices too
r = await post('/login', { login_id: lid, password: PW, code: await totpNow(su.secret), remember: true }); const dev2 = cookies(r).find(c => c.startsWith('uns_dev='));
r = await post('/password', { current: PW, new: PW2 }, ck); ok('password change', r.status === 200, r.status);
r = await fetch(B + '/login', { method: 'POST', headers: { ...H, cookie: dev2 }, body: JSON.stringify({ login_id: lid, password: PW2 }) }); ok('password change forgets devices', r.status === 401, r.status);
// claude token cannot reach any of it
const t = await (await post('/admin/claude-token', { minutes: 10, write: true }, adm)).json();
r = await fetch(B + '/2fa/recovery', { method: 'POST', headers: { ...H, authorization: 'Bearer ' + t.token }, body: JSON.stringify({ current: PW }) }); ok('claude token cannot touch recovery codes', r.status === 403, r.status);
await post('/admin/claude-token/revoke', {}, adm);
