const B = 'http://localhost:8799/app/api';
let ck = '';
async function call(m, p, b, h = {}) {
  const r = await fetch(B + p, { method: m, headers: { 'content-type': 'application/json', 'x-uns': '1', ...(ck && !h.authorization ? { cookie: ck } : {}), ...h }, body: b === undefined ? undefined : JSON.stringify(b) });
  const sc = r.headers.get('set-cookie'); if (sc) ck = sc.split(';')[0];
  let j = {}; try { j = await r.json(); } catch {} return { s: r.status, j };
}
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + JSON.stringify(x))); if (!c) process.exitCode = 1; };
let r = await call('POST', '/login', { login_id: 'tabish', password: 'test-pass-123456' }); ok('login', r.s === 200, r);
const u = Date.now().toString(36);
// stages
r = await call('POST', '/leads', { name: 'Cold ' + u, owner: 'Ali', stage: 'sent', list: 'any', industry: 'Law', profile_url: 'https://www.linkedin.com/in/cold-' + u }); ok('create sent', r.s === 200, r);
const cold = r.j.id;
r = await call('POST', '/leads', { name: 'First ' + u, owner: 'Tabish', profile_url: 'https://www.linkedin.com/in/first-' + u }); const first = r.j.id;
let d = (await call('GET', '/data')).j; let L = d.leads.find(x => x.id === cold);
ok('sent fields', L.stage === 'sent' && L.sent_at === d.today && L.list === 'any' && L.industry === 'Law' && !L.funnel_start && !L.next_due, L);
ok('first comment default', d.leads.find(x => x.id === first).stage === 'comment' && d.leads.find(x => x.id === first).list === 'icp');
r = await call('POST', `/leads/${cold}/engage`, { n: 1 }); ok('engage not due on day 0', r.s === 400, r);
r = await call('PATCH', `/leads/${cold}`, { stage: 'accepted' }); ok('accept', r.s === 200, r);
L = (await call('GET', '/data')).j.leads.find(x => x.id === cold);
ok('accepted fields', L.stage === 'accepted' && L.accepted_at && L.funnel_start && L.next_due === L.funnel_start, L);
r = await call('PATCH', `/leads/${cold}`, { stage: 'away', away_reason: 'timing' }); ok('away', r.s === 200, r);
r = await call('PATCH', `/leads/${cold}`, { stage: 'sent' }); ok('reopen to sent', r.s === 200, r);
L = (await call('GET', '/data')).j.leads.find(x => x.id === cold); ok('sent again clears', L.engage_done === '[]' && L.next_due === null, L);
r = await call('PATCH', `/leads/${cold}`, { list: 'icp' }); ok('list move', r.s === 200);
r = await call('PATCH', `/leads/${cold}`, { list: 'zzz' }); ok('bad list rejected', r.s === 400);
r = await call('PATCH', `/leads/${first}`, { stage: 'dm' }); L = (await call('GET', '/data')).j.leads.find(x => x.id === first); ok('dm move keeps funnel_start', L.stage === 'dm' && !!L.funnel_start);
// engage with sent_at in the past (simulate via direct update is not possible here: use dev SQL later)
// watchlist
const links = []; for (let i = 0; i < 7; i++) links.push({ profile_url: `https://www.linkedin.com/in/person-${u}-${i}?utm=1` });
links.push({ profile_url: links[0].profile_url }); links.push({ profile_url: 'https://evil.com/x' }); links.push({ name: 'Named One', profile_url: `https://www.linkedin.com/in/named-${u}/` });
r = await call('POST', '/watch', { items: links, owner: 'split', kind: 'outlier' }); ok('bulk add', r.s === 200 && r.j.added === 8 && r.j.skipped === 1 && r.j.bad === 1, r);
d = (await call('GET', '/data')).j; const W = d.watch.filter(w => w.profile_url.includes(u));
ok('split owners', new Set(W.map(w => w.owner)).size === 3, W.map(w => w.owner));
ok('name derived', W.some(w => w.name === 'Named One') && W.some(w => /^Person /.test(w.name)), W.map(w => w.name));
const w0 = W[0].id;
r = await call('POST', `/watch/${w0}/comment`, { by: 'Ali' }); ok('comment', r.s === 200, r);
r = await call('POST', `/watch/${w0}/comment`, { by: 'Ali' }); ok('comment twice same day is idempotent', r.j.already === true, r);
d = (await call('GET', '/data')).j; ok('comment recorded', d.watch.find(w => w.id === w0).comment_count === 1 && d.watch_comments.some(c => c.watch_id === w0 && c.by === 'Ali'));
r = await call('DELETE', `/watch/${w0}/comment`); d = (await call('GET', '/data')).j; ok('undo', d.watch.find(w => w.id === w0).comment_count === 0 && d.watch.find(w => w.id === w0).last_commented_at === null);
r = await call('PATCH', `/watch/${w0}`, { owner: 'Mehak', kind: 'icp', active: false }); ok('update', r.s === 200, r);
r = await call('POST', `/watch/${W[1].id}/promote`, {}); ok('promote', r.s === 200, r);
r = await call('POST', `/watch/${W[1].id}/promote`, {}); ok('promote twice rejected', r.s === 409, r);
r = await call('POST', '/settings/watch_target', { value: 30 }); ok('target', r.s === 200); r = await call('POST', '/settings/watch_target', { value: 1000 }); ok('target bad', r.s === 400);
// claude token
r = await call('POST', '/admin/claude-token', { minutes: 60, write: false }); ok('issue token', r.s === 200 && /^cl_[0-9a-f]{64}$/.test(r.j.token), r);
const T = r.j.token, H = { authorization: 'Bearer ' + T };
const saved = ck; ck = '';
r = await call('GET', '/data', undefined, H); ok('claude reads data', r.s === 200 && Array.isArray(r.j.leads), r.s);
r = await call('GET', '/me', undefined, H); ok('claude /me', r.j.name === 'Claude');
r = await call('POST', '/tasks', { title: 'x' }, H); ok('claude read-only blocks write', r.s === 403, r);
for (const p of ['/dev', '/admin/users', '/password', '/2fa/setup', '/flags/home', '/admin/claude-token']) { r = await call(p === '/dev' || p === '/admin/users' ? 'GET' : 'POST', p, p === '/dev' || p === '/admin/users' ? undefined : {}, H); ok('claude blocked ' + p, r.s === 403, r); }
r = await call('GET', '/data', undefined, { authorization: 'Bearer cl_' + '0'.repeat(64) }); ok('wrong token', r.s === 401);
r = await call('GET', '/data', undefined, { authorization: 'Bearer junk' }); ok('junk token', r.s === 401);
ck = saved;
r = await call('POST', '/admin/claude-token', { minutes: 60, write: true }); const T2 = r.j.token; ck = '';
r = await call('POST', '/tasks', { title: 'Claude test ' + u, owner: 'Tabish' }, { authorization: 'Bearer ' + T2 }); ok('claude write token can add task', r.s === 200, r);
r = await call('DELETE', '/tasks/' + r.j.id, undefined, { authorization: 'Bearer ' + T2 }); ok('claude cannot delete', r.s === 403, r);
ck = saved; r = await call('POST', '/admin/claude-token/revoke', {}); ok('revoke', r.s === 200);
ck = ''; r = await call('GET', '/data', undefined, H); ok('revoked token dead', r.s === 401); ck = saved;
r = await call('GET', '/dev'); ok('log shows claude', r.j.activity.some(a => a.actor === 'claude' && a.action === 'task_created'), r.j.activity.slice(0, 3));
