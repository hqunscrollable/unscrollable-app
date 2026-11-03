import {
  randomHex, sha256hex, safeEqual, hashPassword, newSalt, ITERATIONS,
  encryptSecret, decryptSecret, newTotpSecret, verifyTotp
} from './crypto.js';
import { notify } from './discord.js';
import { sendMail, emailOk } from './mail.js';
import STATUS from '../STATUS.json';

const TZ = 'Asia/Karachi';             // assumption: the founders' working day. Confirm.
const SESSION_DAYS = 30;
const COOKIE = 'uns_app';
const TRUST_COOKIE = 'uns_dev', TRUST_DAYS = 30;     // remembered device: skips the authenticator code, never the password
const LOCK_AFTER = 5, LOCK_MINUTES = 15;
const PUBLIC_PAGES = new Set(['/app/login.html', '/app/login.js', '/app/login.css', '/app/reset.html', '/app/reset.js', '/app/forgot.html', '/app/forgot.js', '/app/eye.js',
  '/app/sw.js', '/app/favicon.svg', '/app/icon-180.png', '/app/icon-192.png', '/app/icon-512.png', '/app/icon-maskable-512.png', '/app/manifest.webmanifest']);
const OWNERS = ['Tabish', 'Ali', 'Mehak'];
const T_STATUS = ['todo', 'doing', 'blocked', 'done'];
const T_PRIO = ['high', 'normal', 'low'];
const STAGES = ['sent', 'accepted', 'comment', 'dm', 'guide', 'audit', 'pitched', 'booked', 'away'];   // 'pitched' is kept only so older rows stay valid
const LISTS = ['icp', 'any'];
const W_KIND = ['outlier', 'icp', 'other'];
const CLAUDE_MAX_MIN = 240;
const TAGS = ['hot', 'warm', 'quiet'];
const AWAY = ['no reply', 'not ICP', 'no budget', 'timing', 'other'];
const R_STATE = ['now', 'waiting', 'parked', 'stale'];

const SEC = {
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000',
  'cache-control': 'no-store'
};
function withSec(res) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(SEC)) r.headers.set(k, v);
  return r;
}
const json = (data, status = 200, extra = {}) => {
  const h = new Headers({ 'content-type': 'application/json' });
  for (const [k, v] of Object.entries(extra)) { if (Array.isArray(v)) v.forEach(x => h.append(k, x)); else h.set(k, v); }
  return withSec(new Response(JSON.stringify(data), { status, headers: h }));
};
const bad = (msg, status = 400) => json({ error: msg }, status);

const todayStr = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
const nowIso = () => new Date().toISOString();
const id = (p) => p + randomHex(6);

function cookieOf(req, name) {
  const m = (req.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(name + '='));
  return m ? m.slice(name.length + 1) : null;
}
async function readJson(req) {
  const t = await req.text();
  if (t.length > 100000) throw new HttpError(413, 'Too large');
  try { return t ? JSON.parse(t) : {}; } catch { throw new HttpError(400, 'Bad JSON'); }
}
class HttpError extends Error { constructor(s, m) { super(m); this.status = s; } }

async function log(env, actor, action, entity, entityId, detail) {
  await env.DB.prepare('INSERT INTO activity_log(actor,action,entity,entity_id,detail) VALUES (?,?,?,?,?)')
    .bind(actor || null, action, entity || null, entityId || null, detail ? String(detail).slice(0, 300) : null).run();
}

// ---------- sessions ----------
async function sessionUser(env, req) {
  const tok = cookieOf(req, COOKIE);
  if (!tok || tok.length < 40) return null;
  const h = await sha256hex(tok);
  const row = await env.DB.prepare(
    `SELECT u.id, u.login_id, u.name, u.role, u.is_dev, u.active, c.totp_enabled, c.must_reset
     FROM sessions s JOIN users u ON u.id = s.user_id JOIN credentials c ON c.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at > ?`).bind(h, nowIso()).first();
  if (!row || !row.active || row.must_reset) return null;
  return row;
}
async function startSession(env, req, userId) {
  const tok = randomHex(32);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,ua) VALUES (?,?,?,?)')
    .bind(await sha256hex(tok), userId, exp, (req.headers.get('user-agent') || '').slice(0, 120)).run();
  await env.DB.prepare('UPDATE users SET last_seen = ? WHERE id = ?').bind(nowIso(), userId).run();
  return `${COOKIE}=${tok}; Path=/app; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
// Sliding session: every time the app opens, the session gets 30 more days, but never more than 90 days after sign-in.
const SESSION_CAP_DAYS = 90;
async function renewSession(env, req) {
  const tok = cookieOf(req, COOKIE);
  if (!tok || tok.length < 40) return null;
  const h = await sha256hex(tok);
  const row = await env.DB.prepare('SELECT created_at FROM sessions WHERE token_hash = ?').bind(h).first();
  if (!row) return null;
  let t0 = Date.parse(String(row.created_at || '').replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(row.created_at || '')) ? '' : 'Z'));
  if (!Number.isFinite(t0)) t0 = Date.now();
  const end = Math.min(Date.now() + SESSION_DAYS * 864e5, t0 + SESSION_CAP_DAYS * 864e5);
  const left = Math.floor((end - Date.now()) / 1000);
  if (left < 3600) return null;
  await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').bind(new Date(end).toISOString(), h).run();
  return `${COOKIE}=${tok}; Path=/app; HttpOnly; Secure; SameSite=Lax; Max-Age=${left}`;
}
const clearCookie = `${COOKIE}=; Path=/app; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// ---------- recovery codes and remembered devices ----------
const normCode = (c) => String(c || '').toLowerCase().replace(/[\s-]/g, '');
const isRecovery = (n) => /^[0-9a-f]{10}$/.test(n);            // 10 hex characters. An authenticator code is 6 digits.
async function makeRecoveryCodes(env, userId) {
  const codes = [], stmts = [env.DB.prepare('DELETE FROM recovery_codes WHERE user_id = ?').bind(userId)];
  for (let i = 0; i < 10; i++) {
    const c = randomHex(5);
    codes.push(c.slice(0, 5) + '-' + c.slice(5));
    stmts.push(env.DB.prepare('INSERT INTO recovery_codes(code_hash,user_id) VALUES (?,?)').bind(await sha256hex(userId + ':' + c), userId));
  }
  await env.DB.batch(stmts);
  return codes;
}
async function useRecoveryCode(env, userId, norm) {
  const r = await env.DB.prepare('UPDATE recovery_codes SET used_at = ? WHERE code_hash = ? AND user_id = ? AND used_at IS NULL')
    .bind(nowIso(), await sha256hex(userId + ':' + norm), userId).run();
  return !!(r.meta && r.meta.changes > 0);
}
async function recoveryLeft(env, userId) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL').bind(userId).first();
  return r ? r.n : 0;
}
async function trustedValid(env, userId, tok) {
  if (!tok || tok.length < 40) return false;
  const h = await sha256hex(tok);
  const row = await env.DB.prepare('SELECT token_hash FROM trusted_devices WHERE token_hash = ? AND user_id = ? AND expires_at > ?').bind(h, userId, nowIso()).first();
  if (!row) return false;
  await env.DB.prepare('UPDATE trusted_devices SET last_used_at = ? WHERE token_hash = ?').bind(nowIso(), h).run();
  return true;
}
async function trustDevice(env, req, userId) {
  const tok = randomHex(32);
  await env.DB.prepare('INSERT INTO trusted_devices(token_hash,user_id,expires_at,ua) VALUES (?,?,?,?)')
    .bind(await sha256hex(tok), userId, new Date(Date.now() + TRUST_DAYS * 864e5).toISOString(), (req.headers.get('user-agent') || '').slice(0, 120)).run();
  return `${TRUST_COOKIE}=${tok}; Path=/app; HttpOnly; Secure; SameSite=Lax; Max-Age=${TRUST_DAYS * 86400}`;
}
const clearTrustCookie = `${TRUST_COOKIE}=; Path=/app; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

function passwordProblem(pw, loginId) {
  if (typeof pw !== 'string' || pw.length < 12) return 'Use at least 12 characters.';
  if (pw.length > 200) return 'Too long.';
  if (loginId && pw.toLowerCase().includes(String(loginId).toLowerCase())) return 'Do not include your ID.';
  return null;
}

// ---------- auth routes ----------
async function login(env, req) {
  const b = await readJson(req);
  const loginId = String(b.login_id || '').trim().toLowerCase().slice(0, 60);
  const pw = String(b.password || '');
  const generic = () => bad('Wrong ID, password or code.', 401);
  const u = await env.DB.prepare(
    `SELECT u.id, u.name, u.active, c.* FROM users u JOIN credentials c ON c.user_id = u.id WHERE u.login_id = ?`)
    .bind(loginId).first();
  if (!u || !u.active) {                       // same work and same answer for unknown IDs
    await hashPassword(pw, newSalt());
    return generic();
  }
  if (u.locked_until && u.locked_until > nowIso()) {
    await hashPassword(pw, newSalt());
    return json({ error: 'Too many tries. Wait and try again.' }, 429);
  }
  const ok = safeEqual(await hashPassword(pw, u.salt, u.iterations), u.password_hash);
  let codeOk = true, trusted = false, usedRecovery = false;
  if (ok && u.totp_enabled) {
    const n = normCode(b.code);
    if (await trustedValid(env, u.id, cookieOf(req, TRUST_COOKIE))) trusted = true;
    else if (isRecovery(n)) { codeOk = await useRecoveryCode(env, u.id, n); usedRecovery = codeOk; }
    else codeOk = await verifyTotp(await decryptSecret(u.totp_secret_enc, env.TOTP_KEY), b.code);
  }
  if (!ok || !codeOk) {
    const n = u.failed_count + 1;
    const lock = n >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
    await env.DB.prepare('UPDATE credentials SET failed_count = ?, locked_until = ? WHERE user_id = ?')
      .bind(lock ? 0 : n, lock, u.id).run();
    await log(env, loginId, 'login_failed', 'user', u.id, lock ? 'locked' : null);
    if (lock) await notify(env, 'alerts', `Sign-in locked for ${u.name} after ${LOCK_AFTER} failed tries.`);
    return generic();
  }
  await env.DB.prepare('UPDATE credentials SET failed_count = 0, locked_until = NULL WHERE user_id = ?').bind(u.id).run();
  if (u.must_reset) return json({ must_reset: true, error: 'Your password has to be set first. Open the setup link Tabish sent you, or ask him for a new one.' }, 403);
  const cookies = [await startSession(env, req, u.id)];
  if (u.totp_enabled && !trusted && b.remember === true) cookies.push(await trustDevice(env, req, u.id));
  await log(env, loginId, 'login', 'user', u.id, trusted ? 'remembered device' : usedRecovery ? 'recovery code' : (cookies.length > 1 ? 'device remembered' : null));
  let left;
  if (usedRecovery) {
    left = await recoveryLeft(env, u.id);
    await log(env, loginId, 'recovery_code_used', 'user', u.id, left + ' left');
    await notify(env, 'alerts', `${u.name} signed in with a recovery code. ${left} left.`);
  }
  return json({ ok: true, totp_enabled: !!u.totp_enabled, recovery_left: left }, 200, { 'set-cookie': cookies });
}

async function logout(env, req) {
  const tok = cookieOf(req, COOKIE);
  if (tok) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256hex(tok)).run();
  return json({ ok: true }, 200, { 'set-cookie': clearCookie });
}

async function changePassword(env, user, req) {
  const b = await readJson(req);
  const cred = await env.DB.prepare('SELECT * FROM credentials WHERE user_id = ?').bind(user.id).first();
  if (!safeEqual(await hashPassword(String(b.current || ''), cred.salt, cred.iterations), cred.password_hash))
    return bad('Current password is wrong.', 403);
  const p = passwordProblem(b.new, user.login_id); if (p) return bad(p);
  const salt = newSalt();
  await env.DB.prepare('UPDATE credentials SET password_hash=?, salt=?, iterations=?, updated_at=? WHERE user_id=?')
    .bind(await hashPassword(b.new, salt), salt, ITERATIONS, nowIso(), user.id).run();
  const tok = cookieOf(req, COOKIE);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').bind(user.id, await sha256hex(tok)),
    env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(user.id)
  ]);
  await log(env, user.login_id, 'password_changed', 'user', user.id);
  return json({ ok: true }, 200, { 'set-cookie': clearTrustCookie });
}

async function resetWithToken(env, req) {
  const b = await readJson(req);
  const th = await sha256hex(String(b.token || ''));
  const row = await env.DB.prepare(
    'SELECT r.user_id, u.login_id FROM reset_tokens r JOIN users u ON u.id = r.user_id WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?')
    .bind(th, nowIso()).first();
  if (!row) return bad('This link is not valid any more.', 400);
  const p = passwordProblem(b.password, row.login_id); if (p) return bad(p);
  const salt = newSalt();
  await env.DB.batch([
    env.DB.prepare('UPDATE credentials SET password_hash=?, salt=?, iterations=?, must_reset=0, failed_count=0, locked_until=NULL, updated_at=? WHERE user_id=?')
      .bind(await hashPassword(b.password, salt), salt, ITERATIONS, nowIso(), row.user_id),
    env.DB.prepare('UPDATE reset_tokens SET used_at = ? WHERE token_hash = ?').bind(nowIso(), th),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
    env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(row.user_id)
  ]);
  await log(env, row.login_id, 'password_reset', 'user', row.user_id);
  return json({ ok: true });
}

// 1.3.0: forgot password by email. Same answer for every request, so nobody can learn who has an account.
const FORGOT_MINUTES = 30, FORGOT_PER_USER_HOUR = 3, FORGOT_ALL_HOUR = 20;
async function forgot(env, req, ctx) {
  const b = await readJson(req);
  const loginId = String(b.login_id || '').trim().toLowerCase().slice(0, 60);
  const done = () => json({ ok: true });
  if (!loginId) return done();
  const u = await env.DB.prepare('SELECT id, login_id, name, email, active FROM users WHERE login_id = ?').bind(loginId).first();
  if (!u || !u.active || !emailOk(u.email)) return done();
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const mine = await env.DB.prepare("SELECT COUNT(*) n FROM reset_tokens WHERE via='mail' AND user_id=? AND created_at > ?").bind(u.id, hourAgo).first();
  const all = await env.DB.prepare("SELECT COUNT(*) n FROM reset_tokens WHERE via='mail' AND created_at > ?").bind(hourAgo).first();
  if (mine.n >= FORGOT_PER_USER_HOUR || all.n >= FORGOT_ALL_HOUR) { await log(env, u.login_id, 'reset_mail_limited', 'user', u.id); return done(); }
  const tok = randomHex(24), now = nowIso();
  await env.DB.batch([
    env.DB.prepare("UPDATE reset_tokens SET used_at = ? WHERE user_id = ? AND via = 'mail' AND used_at IS NULL").bind(now, u.id),
    env.DB.prepare("INSERT INTO reset_tokens(token_hash,user_id,expires_at,created_at,via) VALUES (?,?,?,?,'mail')")
      .bind(await sha256hex(tok), u.id, new Date(Date.now() + FORGOT_MINUTES * 60e3).toISOString(), now)
  ]);
  const link = new URL(req.url).origin + '/app/reset.html#' + tok;
  const text = 'Hi ' + u.name + ',\n\nSomeone asked to reset the password for your Unscrollable sign-in (' + u.login_id + '). Open this link to choose a new one:\n\n' + link
    + '\n\nThe link works once and expires in ' + FORGOT_MINUTES + ' minutes. You will still need your authenticator code or a recovery code to sign in afterwards.\n\nIf you did not ask for this, ignore this email. Nothing changes.\n\nUnscrollable';
  ctx.waitUntil((async () => {
    try { await sendMail(env, { to: u.email, subject: 'Reset your Unscrollable password', text }); await log(env, u.login_id, 'reset_mail_sent', 'user', u.id); }
    catch (e) { await log(env, u.login_id, 'reset_mail_failed', 'user', u.id, String(e.message || e).slice(0, 120)); await notify(env, 'errors', 'Reset email failed for ' + u.login_id + ': ' + String(e.message || e).slice(0, 120)); }
  })());
  return done();
}
// Own email: needs the current password, so a stolen session cannot redirect resets.
async function setMyEmail(env, user, req) {
  const b = await readJson(req);
  const cred = await env.DB.prepare('SELECT * FROM credentials WHERE user_id = ?').bind(user.id).first();
  if (!safeEqual(await hashPassword(String(b.current || ''), cred.salt, cred.iterations), cred.password_hash)) return bad('Current password is wrong.', 403);
  const e = String(b.email || '').trim().toLowerCase();
  if (e && !emailOk(e)) return bad('That email address does not look right.');
  await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(e || null, user.id).run();
  await log(env, user.login_id, 'email_set', 'user', user.id);
  return json({ ok: true, email: e || null });
}
async function setSeenRelease(env, user, req) {
  if (user.claude) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const v = String(b.v || '');
  if (!/^[0-9.]{1,12}$/.test(v)) return bad('Bad version.');
  await env.DB.prepare('UPDATE users SET seen_release = ? WHERE id = ?').bind(v, user.id).run();
  return json({ ok: true });
}
async function adminSetEmail(env, user, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const e = String(b.email || '').trim().toLowerCase();
  if (e && !emailOk(e)) return bad('That email address does not look right.');
  const t = await env.DB.prepare('SELECT id, login_id FROM users WHERE login_id = ?').bind(String(b.login_id || '').toLowerCase()).first();
  if (!t) return bad('No such user.', 404);
  await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(e || null, t.id).run();
  await log(env, user.login_id, 'email_set_by_dev', 'user', t.id);
  return json({ ok: true });
}
async function adminMailTest(env, user) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const me = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(user.id).first();
  if (!me || !emailOk(me.email)) return bad('Set your own email first (My account).');
  try { await sendMail(env, { to: me.email, subject: 'Unscrollable test email', text: 'If you can read this, the app can send email. Nothing else to do.' }); }
  catch (e) { return bad('Send failed. ' + String(e.message || e).slice(0, 160), 502); }
  return json({ ok: true });
}

// Interim reset path until an email sender is chosen: Tabish creates a one-time link.
async function adminResetLink(env, user, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const t = await env.DB.prepare('SELECT id, login_id FROM users WHERE login_id = ?').bind(String(b.login_id || '').toLowerCase()).first();
  if (!t) return bad('No such user.', 404);
  const tok = randomHex(24);
  await env.DB.prepare('INSERT INTO reset_tokens(token_hash,user_id,expires_at) VALUES (?,?,?)')
    .bind(await sha256hex(tok), t.id, new Date(Date.now() + 3600e3).toISOString()).run();
  // The current password keeps working until the link is used. Making a link must never lock anyone out.
  await log(env, user.login_id, 'reset_link_created', 'user', t.id);
  return json({ path: `/app/reset.html#${tok}`, expires_minutes: 60 });
}

async function twofaSetup(env, user) {
  const secret = newTotpSecret();
  await env.DB.prepare('UPDATE credentials SET totp_secret_enc=?, totp_enabled=0 WHERE user_id=?')
    .bind(await encryptSecret(secret, env.TOTP_KEY), user.id).run();
  const label = encodeURIComponent('Unscrollable:' + user.login_id);
  return json({ secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=Unscrollable&digits=6&period=30` });
}
async function twofaEnable(env, user, req) {
  const b = await readJson(req);
  const c = await env.DB.prepare('SELECT totp_secret_enc FROM credentials WHERE user_id=?').bind(user.id).first();
  if (!c || !c.totp_secret_enc) return bad('Start setup first.');
  if (!(await verifyTotp(await decryptSecret(c.totp_secret_enc, env.TOTP_KEY), b.code))) return bad('That code is wrong.', 400);
  await env.DB.prepare('UPDATE credentials SET totp_enabled=1 WHERE user_id=?').bind(user.id).run();
  const codes = await makeRecoveryCodes(env, user.id);
  await log(env, user.login_id, '2fa_enabled', 'user', user.id);
  return json({ ok: true, codes });
}
// New recovery codes replace every old one. Needs the current password, so a stolen session cannot read or reset them.
async function recoveryNew(env, user, req) {
  const b = await readJson(req);
  const cred = await env.DB.prepare('SELECT * FROM credentials WHERE user_id = ?').bind(user.id).first();
  if (!cred || !cred.totp_enabled) return bad('Turn on two-factor first.');
  if (!safeEqual(await hashPassword(String(b.current || ''), cred.salt, cred.iterations), cred.password_hash)) return bad('Current password is wrong.', 403);
  const codes = await makeRecoveryCodes(env, user.id);
  await log(env, user.login_id, 'recovery_codes_made', 'user', user.id);
  return json({ ok: true, codes });
}
async function forgetDevices(env, user) {
  await env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(user.id).run();
  await log(env, user.login_id, 'devices_forgotten', 'user', user.id);
  return json({ ok: true }, 200, { 'set-cookie': clearTrustCookie });
}

// ---------- data routes ----------
function pick(b, keys) { const o = {}; for (const k of keys) if (k in b) o[k] = b[k]; return o; }
const str = (v, n = 500) => (v == null ? null : String(v).slice(0, n));
const dateOk = (v) => v == null || v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);

async function allData(env, user) {
  const [tasks, leads, radar, users] = await Promise.all([
    env.DB.prepare('SELECT * FROM tasks ORDER BY done_at IS NOT NULL, due IS NULL, due').all(),
    env.DB.prepare('SELECT * FROM leads ORDER BY updated_at DESC').all(),
    env.DB.prepare('SELECT * FROM radar_items ORDER BY updated_at DESC').all(),
    env.DB.prepare('SELECT name FROM users WHERE active = 1 ORDER BY name').all()
  ]);
  const flags = await env.DB.prepare('SELECT key, on_back FROM flags').all();
  const events = await env.DB.prepare(
    'SELECT lead_id, at, kind, detail, by FROM lead_events ORDER BY id DESC LIMIT 300').all();
  const since = todayStr(new Date(Date.now() - 14 * 864e5));
  const [watch, wcom, set] = await Promise.all([
    env.DB.prepare('SELECT id,name,profile_url,kind,owner,active,notes,last_commented_at,comment_count,lead_id,avatar_v,avatar_try FROM watchlist ORDER BY name').all(),
    env.DB.prepare('SELECT watch_id, day, by FROM watch_comments WHERE day >= ?').bind(since).all(),
    env.DB.prepare('SELECT key, value FROM app_settings').all()
  ]);
  return json({
    today: todayStr(), tz: TZ, me: user.name, is_dev: !!user.is_dev,
    watch: watch.results, watch_comments: wcom.results,
    settings: Object.fromEntries(set.results.map(r => [r.key, r.value])),
    tasks: tasks.results.map(t => ({ ...t, checks: JSON.parse(t.checks), comments: JSON.parse(t.comments) })),
    leads: leads.results, events: events.results, radar: radar.results,
    people: users.results.map(u => u.name),
    flags: Object.fromEntries(flags.results.map(f => [f.key, !!f.on_back]))
  });
}

async function taskCreate(env, user, req) {
  const b = await readJson(req);
  const title = str(b.title, 200); if (!title || !title.trim()) return bad('Title needed.');
  const owner = OWNERS.concat('Everyone').includes(b.owner) ? b.owner : user.name;
  const prio = T_PRIO.includes(b.priority) ? b.priority : 'normal';
  if (!dateOk(b.due)) return bad('Bad date.');
  const tid = id('t_');
  await env.DB.prepare('INSERT INTO tasks(id,title,owner,priority,area,due,notes) VALUES (?,?,?,?,?,?,?)')
    .bind(tid, title.trim(), owner, prio, str(b.area, 40), b.due || null, str(b.notes, 2000)).run();
  await log(env, user.login_id, 'task_created', 'task', tid, title);
  return json({ id: tid });
}
async function taskUpdate(env, user, tid, req) {
  const b = await readJson(req);
  const cur = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(tid).first();
  if (!cur) return bad('Not found.', 404);
  const f = pick(b, ['title', 'status', 'owner', 'priority', 'area', 'due', 'notes', 'checks', 'comments']);
  const set = [], vals = [];
  const add = (k, v) => { set.push(k + ' = ?'); vals.push(v); };
  if ('title' in f) { if (!str(f.title, 200)?.trim()) return bad('Title needed.'); add('title', f.title.trim().slice(0, 200)); }
  if ('status' in f) {
    if (!T_STATUS.includes(f.status)) return bad('Bad status.');
    add('status', f.status); add('done_at', f.status === 'done' ? nowIso() : null);
  }
  if ('owner' in f) { if (!OWNERS.concat('Everyone').includes(f.owner)) return bad('Bad owner.'); add('owner', f.owner); }
  if ('priority' in f) { if (!T_PRIO.includes(f.priority)) return bad('Bad priority.'); add('priority', f.priority); }
  if ('area' in f) add('area', str(f.area, 40));
  if ('due' in f) { if (!dateOk(f.due)) return bad('Bad date.'); add('due', f.due || null); }
  if ('notes' in f) add('notes', str(f.notes, 2000));
  if ('checks' in f) { if (!Array.isArray(f.checks) || f.checks.length > 50) return bad('Bad checklist.'); add('checks', JSON.stringify(f.checks.map(c => ({ t: str(c.t, 200), d: !!c.d })))); }
  if ('comments' in f) { if (!Array.isArray(f.comments) || f.comments.length > 100) return bad('Bad comments.'); add('comments', JSON.stringify(f.comments.map(c => ({ by: str(c.by, 30), t: str(c.t, 1000), at: str(c.at, 30) })))); }
  if (!set.length) return bad('Nothing to change.');
  add('updated_at', nowIso());
  await env.DB.prepare(`UPDATE tasks SET ${set.join(', ')} WHERE id = ?`).bind(...vals, tid).run();
  await log(env, user.login_id, 'task_updated', 'task', tid, Object.keys(f).join(','));
  return json({ ok: true });
}
async function taskDelete(env, user, tid) {
  if (!user.is_dev) return bad('Only Tabish can delete.', 403);   // constitution: final deletes are Tabish's
  await env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(tid).run();
  await log(env, user.login_id, 'task_deleted', 'task', tid);
  return json({ ok: true });
}

async function leadCreate(env, user, req) {
  const b = await readJson(req);
  const name = str(b.name, 120); if (!name || !name.trim()) return bad('Name needed.');
  const owner = OWNERS.includes(b.owner) ? b.owner : user.name;
  const url = str(b.profile_url, 300) || null;
  if (url && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(url)) return bad('Use a LinkedIn profile link.');
  const xurl = str(b.x_url, 200) || null;
  if (xurl && !/^https:\/\/(www\.)?(x|twitter)\.com\//i.test(xurl)) return bad('Use an X link, like https://x.com/name.');
  const lid = id('l_');
  const start = b.stage === 'sent' ? 'sent' : 'comment';   // cold lead starts at Connection sent, 1st degree at First comment
  const t = todayStr();
  try {
    await env.DB.prepare(
      'INSERT INTO leads(id,name,profile_url,company,owner,stage,tag,funnel_start,why_fit,source,next_action,next_due,sent_at,list,industry,x_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(lid, name.trim(), url, str(b.company, 120), owner, start, 'warm', start === 'sent' ? null : t, str(b.why_fit, 500), str(b.source, 60),
        start === 'sent' ? 'Engage on their posts each day, then check on day 6' : 'First real comment on a recent post', start === 'sent' ? null : t,
        start === 'sent' ? t : null, LISTS.includes(b.list) ? b.list : 'icp', str(b.industry, 80), xurl).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) return bad('This profile is already in the list.', 409);
    throw e;
  }
  await env.DB.prepare('INSERT INTO lead_events(lead_id,kind,detail,by) VALUES (?,?,?,?)').bind(lid, 'created', start === 'sent' ? 'Added at Connection sent' : 'Added to the funnel', user.name).run();
  await log(env, user.login_id, 'lead_created', 'lead', lid, name);
  return json({ id: lid });
}
async function leadUpdate(env, user, lid, req) {
  const b = await readJson(req);
  const cur = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(lid).first();
  if (!cur) return bad('Not found.', 404);
  const set = [], vals = [], ev = [];
  const add = (k, v) => { set.push(k + ' = ?'); vals.push(v); };
  if ('stage' in b && b.stage !== cur.stage) {
    if (!STAGES.includes(b.stage)) return bad('Bad stage.');
    if (b.stage === 'away' && !AWAY.includes(b.away_reason)) return bad('Pick a reason for Away.');
    add('stage', b.stage); add('away_reason', b.stage === 'away' ? b.away_reason : null);
    const t = todayStr();
    if (b.stage === 'sent') {
      add('sent_at', t); add('engage_done', '[]'); add('funnel_start', null); add('next_due', null);
      add('next_action', 'Engage on their posts each day, then check on day 6');
    } else if (b.stage === 'accepted') {
      add('accepted_at', t); add('funnel_start', t); add('next_due', t); add('next_action', 'Send the first comment or DM');
    } else if (b.stage !== 'away' && (!cur.funnel_start || cur.stage === 'away')) {
      add('funnel_start', t);
    }
    ev.push(['stage', `${cur.stage} to ${b.stage}` + (b.stage === 'away' ? ` (${b.away_reason})` : '')]);
    add('last_action_at', nowIso());
  }
  if ('tag' in b && b.tag !== cur.tag) {
    if (!TAGS.includes(b.tag)) return bad('Bad tag.');
    add('tag', b.tag); ev.push(['tag', `${cur.tag} to ${b.tag}`]);
  }
  if ('owner' in b && b.owner !== cur.owner) {
    if (!OWNERS.includes(b.owner)) return bad('Bad owner.');
    add('owner', b.owner); ev.push(['owner', `${cur.owner} to ${b.owner}`]);
  }
  if ('list' in b && b.list !== cur.list) {
    if (!LISTS.includes(b.list)) return bad('Bad list.');
    add('list', b.list); ev.push(['list', `${cur.list} to ${b.list}`]);
  }
  for (const [k, n] of [['industry', 80], ['name', 120], ['company', 120], ['why_fit', 500], ['notes', 2000], ['next_action', 200], ['source', 60]])
    if (k in b && !set.some(x => x.startsWith(k + ' '))) add(k, str(b[k], n));
  if ('next_due' in b && !set.some(x => x.startsWith('next_due '))) { if (!dateOk(b.next_due)) return bad('Bad date.'); add('next_due', b.next_due || null); }
  if ('profile_url' in b) {
    const u = str(b.profile_url, 300) || null;
    if (u && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(u)) return bad('Use a LinkedIn profile link.');
    add('profile_url', u);
  }
  if ('x_url' in b) {
    const x = str(b.x_url, 200) || null;
    if (x && !/^https:\/\/(www\.)?(x|twitter)\.com\//i.test(x)) return bad('Use an X link, like https://x.com/name.');
    add('x_url', x);
  }
  if (!set.length) return bad('Nothing to change.');
  add('updated_at', nowIso());
  try {
    await env.DB.prepare(`UPDATE leads SET ${set.join(', ')} WHERE id = ?`).bind(...vals, lid).run();
  } catch (e) { if (String(e).includes('UNIQUE')) return bad('That profile is already in the list.', 409); throw e; }
  for (const [k, d] of ev)
    await env.DB.prepare('INSERT INTO lead_events(lead_id,kind,detail,by) VALUES (?,?,?,?)').bind(lid, k, d, user.name).run();
  await log(env, user.login_id, 'lead_updated', 'lead', lid, Object.keys(b).join(','));
  return json({ ok: true });
}
async function leadEvent(env, user, lid, req) {
  const b = await readJson(req);
  const kind = b.kind === 'action' ? 'action' : 'note';
  const d = str(b.detail, 500); if (!d || !d.trim()) return bad('Write something.');
  const r = await env.DB.prepare('SELECT id FROM leads WHERE id = ?').bind(lid).first();
  if (!r) return bad('Not found.', 404);
  await env.DB.prepare('INSERT INTO lead_events(lead_id,kind,detail,by) VALUES (?,?,?,?)').bind(lid, kind, d.trim(), user.name).run();
  if (kind === 'action') await env.DB.prepare('UPDATE leads SET last_action_at=?, updated_at=? WHERE id=?').bind(nowIso(), nowIso(), lid).run();
  return json({ ok: true });
}

async function radarCreate(env, user, req) {
  const b = await readJson(req);
  const text = str(b.text, 300); if (!text || !text.trim()) return bad('Text needed.');
  const rid = id('r_');
  await env.DB.prepare('INSERT INTO radar_items(id,text,area,state,owner) VALUES (?,?,?,?,?)')
    .bind(rid, text.trim(), str(b.area, 40), R_STATE.includes(b.state) ? b.state : 'now', OWNERS.includes(b.owner) ? b.owner : null).run();
  return json({ id: rid });
}
async function radarUpdate(env, user, rid, req) {
  const b = await readJson(req);
  const set = [], vals = [];
  if ('done' in b) { set.push('done = ?'); vals.push(b.done ? 1 : 0); }
  if ('state' in b) { if (!R_STATE.includes(b.state)) return bad('Bad state.'); set.push('state = ?'); vals.push(b.state); }
  if ('text' in b) { set.push('text = ?'); vals.push(str(b.text, 300)); }
  if ('owner' in b) { set.push('owner = ?'); vals.push(OWNERS.includes(b.owner) ? b.owner : null); }
  if (!set.length) return bad('Nothing to change.');
  set.push('updated_at = ?'); vals.push(nowIso());
  await env.DB.prepare(`UPDATE radar_items SET ${set.join(', ')} WHERE id = ?`).bind(...vals, rid).run();
  return json({ ok: true });
}

async function devInfo(env, user) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const [act, flags, integ, counts, sess] = await Promise.all([
    env.DB.prepare('SELECT at, actor, action, entity, detail FROM activity_log ORDER BY id DESC LIMIT 100').all(),
    env.DB.prepare('SELECT * FROM flags').all(),
    env.DB.prepare('SELECT * FROM integrations').all(),
    env.DB.prepare('SELECT (SELECT COUNT(*) FROM leads) leads, (SELECT COUNT(*) FROM tasks) tasks, (SELECT COUNT(*) FROM radar_items) radar, (SELECT COUNT(*) FROM users) users').first(),
    env.DB.prepare('SELECT u.name, s.created_at, s.expires_at, s.ua FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.expires_at > ? ORDER BY s.created_at DESC').bind(nowIso()).all()
  ]);
  const ct = await env.DB.prepare('SELECT created_at, expires_at, can_write, last_used_at FROM claude_tokens WHERE revoked = 0 AND expires_at > ? ORDER BY created_at DESC').bind(nowIso()).all();
  return json({ activity: act.results, flags: flags.results, integrations: integ.results, counts, sessions: sess.results, claude_tokens: ct.results, version: '1.2.3-dev' });
}
// ---------- Build dashboard (Tabish only): STATUS.json from the repo plus internal notes ----------
const NOTE_TAGS = ['Idea', 'Decision', 'Remember', 'Bug', 'Question'];
async function buildInfo(env, user) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const n = await env.DB.prepare('SELECT id, text, tag, pin, created_at, updated_at FROM dev_notes ORDER BY pin DESC, updated_at DESC LIMIT 500').all();
  return json({ status: STATUS, notes: n.results });
}
async function noteCreate(env, user, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const text = String(b.text || '').trim().slice(0, 4000);
  if (!text) return bad('Write something first.');
  const tag = NOTE_TAGS.includes(b.tag) ? b.tag : 'Idea';
  const nid = id('n'), t = nowIso();
  await env.DB.prepare('INSERT INTO dev_notes(id,text,tag,pin,author,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(nid, text, tag, b.pin ? 1 : 0, user.login_id, t, t).run();
  return json({ id: nid });
}
async function noteUpdate(env, user, nid, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const cur = await env.DB.prepare('SELECT * FROM dev_notes WHERE id = ?').bind(nid).first();
  if (!cur) return bad('Not found.', 404);
  const text = b.text === undefined ? cur.text : String(b.text).trim().slice(0, 4000);
  if (!text) return bad('Note cannot be empty.');
  const tag = b.tag === undefined ? cur.tag : (NOTE_TAGS.includes(b.tag) ? b.tag : cur.tag);
  const pin = b.pin === undefined ? cur.pin : (b.pin ? 1 : 0);
  await env.DB.prepare('UPDATE dev_notes SET text=?, tag=?, pin=?, updated_at=? WHERE id=?').bind(text, tag, pin, nowIso(), nid).run();
  return json({ ok: true });
}
async function noteDelete(env, user, nid) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  await env.DB.prepare('DELETE FROM dev_notes WHERE id = ?').bind(nid).run();
  return json({ ok: true });
}

async function setFlag(env, user, key, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  if (key === 'developer') return bad('Developer stays on.');
  await env.DB.prepare('UPDATE flags SET on_back = ? WHERE key = ?').bind(b.on ? 1 : 0, key).run();
  await log(env, user.login_id, 'flag', 'flag', key, b.on ? 'on' : 'off');
  return json({ ok: true });
}

// People and access (Tabish only). New people get a random password nobody knows plus a one-time link to choose their own.
async function adminUsers(env, user) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const r = await env.DB.prepare(
    `SELECT u.id, u.login_id, u.name, u.email, u.role, u.is_dev, u.active, u.last_seen, u.created_at, c.totp_enabled, c.must_reset
     FROM users u JOIN credentials c ON c.user_id = u.id ORDER BY u.created_at`).all();
  return json({ users: r.results });
}
async function adminCreateUser(env, user, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const loginId = String(b.login_id || '').trim().toLowerCase();
  const name = str(b.name, 60)?.trim();
  const role = ['founder', 'contractor', 'client'].includes(b.role) ? b.role : null;
  if (!/^[a-z0-9._-]{3,30}$/.test(loginId)) return bad('Sign-in ID: 3 to 30 letters, numbers, dot, dash or underscore.');
  if (!name) return bad('Name needed.');
  if (!role) return bad('Pick a role.');
  const uid = id('u_'), salt = newSalt();
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users(id,login_id,name,role,is_dev) VALUES (?,?,?,?,0)').bind(uid, loginId, name, role),
      env.DB.prepare('INSERT INTO credentials(user_id,password_hash,salt,iterations,must_reset) VALUES (?,?,?,?,1)')
        .bind(uid, await hashPassword(randomHex(32), salt), salt, ITERATIONS)
    ]);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return bad('That sign-in ID is taken.', 409);
    throw e;
  }
  const tok = randomHex(24);
  await env.DB.prepare('INSERT INTO reset_tokens(token_hash,user_id,expires_at) VALUES (?,?,?)')
    .bind(await sha256hex(tok), uid, new Date(Date.now() + 3600e3).toISOString()).run();
  await log(env, user.login_id, 'user_created', 'user', uid, `${loginId} (${role})`);
  return json({ id: uid, path: `/app/reset.html#${tok}`, expires_minutes: 60 });
}
async function adminSetActive(env, user, uid, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  if (uid === user.id) return bad('You cannot switch off your own account.');
  const t = await env.DB.prepare('SELECT login_id FROM users WHERE id = ?').bind(uid).first();
  if (!t) return bad('No such user.', 404);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET active = ? WHERE id = ?').bind(b.active ? 1 : 0, uid),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(uid)
  ]);
  await log(env, user.login_id, b.active ? 'user_activated' : 'user_deactivated', 'user', uid, t.login_id);
  return json({ ok: true });
}
async function revokeSessions(env, user, req) {
  if (!user.is_dev) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const t = await env.DB.prepare('SELECT id FROM users WHERE login_id = ?').bind(String(b.login_id || '').toLowerCase()).first();
  if (!t) return bad('No such user.', 404);
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(t.id).run();
  await log(env, user.login_id, 'sessions_revoked', 'user', t.id);
  return json({ ok: true });
}

// ---------- Engage reminder (Connection sent, days 1 to 5) ----------
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
async function leadEngage(env, user, lid, req) {
  const b = await readJson(req);
  const cur = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(lid).first();
  if (!cur) return bad('Not found.', 404);
  if (cur.stage !== 'sent' || !cur.sent_at) return bad('This lead is not at Connection sent.');
  const n = Number(b.n), day = daysBetween(cur.sent_at, todayStr());
  if (!Number.isInteger(n) || n < 1 || n > 5 || n > day) return bad('That touch is not due.');
  let done = []; try { done = JSON.parse(cur.engage_done || '[]'); } catch { done = []; }
  if (!done.includes(n)) done.push(n);
  const skip = !!b.skip;
  await env.DB.prepare('UPDATE leads SET engage_done = ?, last_action_at = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(done), skip ? cur.last_action_at : nowIso(), nowIso(), lid).run();
  await env.DB.prepare('INSERT INTO lead_events(lead_id,kind,detail,by) VALUES (?,?,?,?)')
    .bind(lid, 'engage', `Engage touch ${n} of 5 ${skip ? 'skipped' : 'done'}`, user.name).run();
  await log(env, user.login_id, skip ? 'engage_skipped' : 'engage_done', 'lead', lid, `touch ${n}`);
  return json({ ok: true });
}

// ---------- Watchlist: people we comment on every day ----------
function nameFromUrl(u) {
  const m = /\/in\/([^/?#]+)/i.exec(u); if (!m) return 'Unnamed';
  let s; try { s = decodeURIComponent(m[1]); } catch { s = m[1]; }
  s = s.replace(/-[0-9a-f]{6,}$/i, '').replace(/[-_]+/g, ' ').trim();
  return s ? s.replace(/\b\w/g, c => c.toUpperCase()).slice(0, 120) : 'Unnamed';
}
function cleanUrl(u) {
  const s = String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  return /^https:\/\/([a-z]+\.)?linkedin\.com\/in\/[^/\s]+$/i.test(s) ? s : null;
}
async function watchAdd(env, user, req) {
  const b = await readJson(req);
  const items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
  if (!items.length) return bad('Paste at least one profile link.');
  const kind = W_KIND.includes(b.kind) ? b.kind : 'outlier';
  const split = b.owner === 'split';
  const fixed = OWNERS.includes(b.owner) ? b.owner : user.name;
  const have = new Set((await env.DB.prepare('SELECT profile_url FROM watchlist').all()).results.map(r => r.profile_url.toLowerCase()));
  const stmts = []; let skipped = 0, badLinks = 0, i = 0;
  for (const it of items) {
    const url = cleanUrl(it && it.profile_url);
    if (!url) { badLinks++; continue; }
    if (have.has(url.toLowerCase())) { skipped++; continue; }
    have.add(url.toLowerCase());
    const owner = split ? OWNERS[i++ % OWNERS.length] : fixed;
    stmts.push(env.DB.prepare('INSERT INTO watchlist(id,name,profile_url,kind,owner) VALUES (?,?,?,?,?)')
      .bind(id('w_'), (str(it.name, 120) || '').trim() || nameFromUrl(url), url, kind, owner));
  }
  for (let k = 0; k < stmts.length; k += 50) await env.DB.batch(stmts.slice(k, k + 50));
  await log(env, user.login_id, 'watch_added', 'watchlist', null, `${stmts.length} added, ${skipped} duplicates, ${badLinks} bad links`);
  return json({ added: stmts.length, skipped, bad: badLinks });
}
async function watchUpdate(env, user, wid, req) {
  const b = await readJson(req);
  const cur = await env.DB.prepare('SELECT * FROM watchlist WHERE id = ?').bind(wid).first();
  if (!cur) return bad('Not found.', 404);
  const set = [], vals = [], add = (k, v) => { set.push(k + ' = ?'); vals.push(v); };
  if ('owner' in b) { if (!OWNERS.includes(b.owner)) return bad('Bad owner.'); add('owner', b.owner); }
  if ('kind' in b) { if (!W_KIND.includes(b.kind)) return bad('Bad type.'); add('kind', b.kind); }
  if ('active' in b) add('active', b.active ? 1 : 0);
  if ('notes' in b) add('notes', str(b.notes, 500));
  if ('name' in b) { const n = str(b.name, 120); if (!n || !n.trim()) return bad('Name needed.'); add('name', n.trim()); }
  if (!set.length) return bad('Nothing to change.');
  await env.DB.prepare(`UPDATE watchlist SET ${set.join(', ')} WHERE id = ?`).bind(...vals, wid).run();
  await log(env, user.login_id, 'watch_updated', 'watchlist', wid, Object.keys(b).join(','));
  return json({ ok: true });
}
async function watchComment(env, user, wid, req) {
  const b = await readJson(req);
  const cur = await env.DB.prepare('SELECT id FROM watchlist WHERE id = ?').bind(wid).first();
  if (!cur) return bad('Not found.', 404);
  const by = OWNERS.includes(b.by) ? b.by : user.name;
  const t = todayStr();
  const dup = await env.DB.prepare('SELECT id FROM watch_comments WHERE watch_id = ? AND day = ?').bind(wid, t).first();
  if (dup) return json({ ok: true, already: true });
  await env.DB.batch([
    env.DB.prepare('INSERT INTO watch_comments(watch_id,day,by,logged_by) VALUES (?,?,?,?)').bind(wid, t, by, user.name),
    env.DB.prepare('UPDATE watchlist SET last_commented_at = ?, comment_count = comment_count + 1 WHERE id = ?').bind(t, wid)
  ]);
  await log(env, user.login_id, 'watch_comment', 'watchlist', wid, by === user.name ? null : `for ${by}`);
  return json({ ok: true });
}
async function watchUncomment(env, user, wid) {
  const t = todayStr();
  const row = await env.DB.prepare('SELECT id FROM watch_comments WHERE watch_id = ? AND day = ? ORDER BY id DESC').bind(wid, t).first();
  if (!row) return json({ ok: true });
  const prev = await env.DB.prepare('SELECT MAX(day) d FROM watch_comments WHERE watch_id = ? AND id <> ?').bind(wid, row.id).first();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM watch_comments WHERE id = ?').bind(row.id),
    env.DB.prepare('UPDATE watchlist SET last_commented_at = ?, comment_count = MAX(comment_count - 1, 0) WHERE id = ?').bind(prev && prev.d || null, wid)
  ]);
  await log(env, user.login_id, 'watch_uncomment', 'watchlist', wid);
  return json({ ok: true });
}
async function watchPromote(env, user, wid, req) {
  const b = await readJson(req);
  const w = await env.DB.prepare('SELECT * FROM watchlist WHERE id = ?').bind(wid).first();
  if (!w) return bad('Not found.', 404);
  if (w.lead_id) return bad('Already a lead.', 409);
  const owner = OWNERS.includes(b.owner) ? b.owner : w.owner;
  const lid = id('l_'), t = todayStr();
  try {
    await env.DB.prepare('INSERT INTO leads(id,name,profile_url,owner,stage,tag,funnel_start,source,next_action,next_due) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(lid, w.name, w.profile_url, owner, 'comment', 'warm', t, 'Watchlist', 'Keep commenting, then send the DM about one specific point', t).run();
  } catch (e) { if (String(e).includes('UNIQUE')) return bad('This profile is already a lead.', 409); throw e; }
  await env.DB.batch([
    env.DB.prepare('UPDATE watchlist SET lead_id = ? WHERE id = ?').bind(lid, wid),
    env.DB.prepare('INSERT INTO lead_events(lead_id,kind,detail,by) VALUES (?,?,?,?)').bind(lid, 'created', 'Moved from the Watchlist', user.name),
    env.DB.prepare("INSERT OR REPLACE INTO avatars(kind,id,mime,data,updated_at) SELECT 'lead', ?, mime, data, updated_at FROM avatars WHERE kind='watch' AND id=?").bind(lid, wid),
    env.DB.prepare('UPDATE leads SET avatar_v = (SELECT avatar_v FROM watchlist WHERE id = ?) WHERE id = ?').bind(wid, lid)
  ]);
  await log(env, user.login_id, 'watch_promoted', 'lead', lid, w.name);
  return json({ id: lid });
}
async function setSetting(env, user, key, req) {
  if (key !== 'watch_target') return bad('Unknown setting.', 404);
  const b = await readJson(req); const n = Number(b.value);
  if (!Number.isInteger(n) || n < 5 || n > 60) return bad('Pick a number from 5 to 60.');
  await env.DB.prepare('UPDATE app_settings SET value = ? WHERE key = ?').bind(String(n), key).run();
  await log(env, user.login_id, 'setting', 'setting', key, String(n));
  return json({ ok: true });
}

// ---------- Claude access (Tabish only). Short-lived, read-only unless he allows writes. ----------
async function claudeIssue(env, user, req) {
  if (!user.is_dev || user.claude) return bad('Not allowed.', 403);
  const b = await readJson(req);
  const mins = Math.min(Math.max(parseInt(b.minutes, 10) || 60, 5), CLAUDE_MAX_MIN);
  const tok = 'cl_' + randomHex(32);
  const exp = new Date(Date.now() + mins * 60000).toISOString();
  await env.DB.prepare('INSERT INTO claude_tokens(token_hash,created_by,expires_at,can_write) VALUES (?,?,?,?)')
    .bind(await sha256hex(tok), user.login_id, exp, b.write ? 1 : 0).run();
  await log(env, user.login_id, 'claude_token_issued', 'claude', null, `${mins} min, ${b.write ? 'read and write' : 'read only'}`);
  return json({ token: tok, expires_at: exp, write: !!b.write });
}
async function claudeRevoke(env, user) {
  if (!user.is_dev || user.claude) return bad('Not allowed.', 403);
  await env.DB.prepare('UPDATE claude_tokens SET revoked = 1 WHERE revoked = 0').run();
  await log(env, user.login_id, 'claude_tokens_revoked', 'claude');
  return json({ ok: true });
}
async function claudeUser(env, tok) {
  if (!/^cl_[0-9a-f]{64}$/.test(tok)) return null;
  const h = await sha256hex(tok);
  const row = await env.DB.prepare('SELECT can_write FROM claude_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > ?').bind(h, nowIso()).first();
  if (!row) return null;
  await env.DB.prepare('UPDATE claude_tokens SET last_used_at = ? WHERE token_hash = ?').bind(nowIso(), h).run();
  return { id: 'claude', login_id: 'claude', name: 'Claude', role: 'founder', is_dev: 0, claude: true, can_write: !!row.can_write, totp_enabled: 1 };
}

// ---------- profile photos ----------
const AV_TABLE = { lead: 'leads', watch: 'watchlist', user: 'users' };   // 'user' = the signed-in person's own photo
const AV_MAX = 160000;   // base64 characters kept per photo (about 120 KB)
async function avatarSave(env, kind, rid, mime, b64) {
  const v = String(Date.now());
  await env.DB.batch([
    env.DB.prepare('INSERT OR REPLACE INTO avatars(kind,id,mime,data,updated_at) VALUES (?,?,?,?,?)').bind(kind, rid, mime, b64, nowIso()),
    env.DB.prepare(`UPDATE ${AV_TABLE[kind]} SET avatar_v = ? WHERE id = ?`).bind(v, rid)
  ]);
  return v;
}
async function avatarPut(env, user, kind, rid, req) {
  if (!AV_TABLE[kind]) return bad('Not found.', 404);
  if (kind === 'user' && rid !== user.id) return bad('You can only change your own photo.', 403);
  const row = await env.DB.prepare(`SELECT id FROM ${AV_TABLE[kind]} WHERE id = ?`).bind(rid).first();
  if (!row) return bad('Not found.', 404);
  const b = await readJson(req);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''));
  if (!m || m[2].length > 60000) return bad('That image is not valid or is too big.');
  const v = await avatarSave(env, kind, rid, 'image/' + m[1], m[2]);
  await log(env, user.login_id, 'avatar_set', kind, rid);
  return json({ ok: true, v });
}
async function avatarGet(env, kind, rid) {
  if (!AV_TABLE[kind]) return bad('Not found.', 404);
  const r = await env.DB.prepare('SELECT mime, data FROM avatars WHERE kind = ? AND id = ?').bind(kind, rid).first();
  if (!r) return bad('Not found.', 404);
  const bin = atob(r.data), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const res = withSec(new Response(bytes, { headers: { 'content-type': r.mime } }));
  res.headers.set('cache-control', 'private, max-age=31536000, immutable');
  return res;
}
async function avatarDelete(env, user, kind, rid) {
  if (!AV_TABLE[kind]) return bad('Not found.', 404);
  if (kind === 'user' && rid !== user.id) return bad('You can only change your own photo.', 403);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM avatars WHERE kind = ? AND id = ?').bind(kind, rid),
    env.DB.prepare(`UPDATE ${AV_TABLE[kind]} SET avatar_v = NULL WHERE id = ?`).bind(rid)
  ]);
  return json({ ok: true });
}
// Best effort: read the public page's og:image. LinkedIn often hides it from servers, so a miss is normal.
async function fetchPhoto(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'UnscrollableApp/1.2 (+profile photo preview)', accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 300000);
    const m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html) || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
    if (!m) return null;
    let u; try { u = new URL(m[1].replace(/&amp;/g, '&')); } catch { return null; }
    if (u.protocol !== 'https:' || !/(^|\.)licdn\.com$/i.test(u.hostname)) return null;
    const ir = await fetch(u.href, { signal: AbortSignal.timeout(5000) });
    const ct = (ir.headers.get('content-type') || '').split(';')[0];
    if (!ir.ok || !/^image\/(jpeg|png|webp)$/.test(ct)) return null;
    const buf = new Uint8Array(await ir.arrayBuffer());
    if (!buf.length || buf.length > 120000) return null;
    let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    const b64 = btoa(s);
    return b64.length <= AV_MAX ? { mime: ct, b64 } : null;
  } catch { return null; }
}
async function avatarFetch(env, user, kind, rid) {
  if (!AV_TABLE[kind]) return bad('Not found.', 404);
  const row = await env.DB.prepare(`SELECT profile_url FROM ${AV_TABLE[kind]} WHERE id = ?`).bind(rid).first();
  if (!row) return bad('Not found.', 404);
  const got = row.profile_url ? await fetchPhoto(row.profile_url) : null;
  if (!got) {
    await env.DB.prepare(`UPDATE ${AV_TABLE[kind]} SET avatar_try = ? WHERE id = ?`).bind(todayStr(), rid).run();
    return json({ ok: false });
  }
  await avatarSave(env, kind, rid, got.mime, got.b64);
  return json({ ok: true });
}

// ---------- router ----------
async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method;

  if (p !== '/app' && !p.startsWith('/app/')) return withSec(new Response('Not found', { status: 404 }));

  if (p.startsWith('/app/api/')) {
    const api = p.slice('/app/api'.length);
    if (method !== 'GET' && method !== 'HEAD') {
      // CSRF: custom header plus same-origin check, on top of SameSite=Lax.
      if (req.headers.get('x-uns') !== '1') return bad('Bad request.', 403);
      const o = req.headers.get('origin');
      if (o && o !== url.origin) return bad('Bad origin.', 403);
    }
    if (api === '/login' && method === 'POST') return login(env, req);
    if (api === '/reset' && method === 'POST') return resetWithToken(env, req);
    if (api === '/forgot' && method === 'POST') return forgot(env, req, ctx);
    let user;
    const auth = req.headers.get('authorization') || '';
    if (auth.startsWith('Bearer ')) {
      user = await claudeUser(env, auth.slice(7).trim());
      if (!user) return bad('Token not valid.', 401);
      // Claude can reach the data screens only. Never accounts, passwords, two-factor, access, flags or the developer area.
      const okPath = api === '/me' || api === '/data' || /^\/(tasks|leads|watch|radar|settings)(\/|$)/.test(api);
      if (!okPath) return bad('Claude has no access to this.', 403);
      if (method !== 'GET' && !user.can_write) return bad('This Claude token is read-only.', 403);
      if (method === 'DELETE') return bad('Claude cannot delete.', 403);
    } else {
      user = await sessionUser(env, req);
    }
    if (!user) return bad('Sign in first.', 401);
    let m;
    if (api === '/me' && method === 'GET') { const ck = user.claude ? null : await renewSession(env, req).catch(() => null); return json({ id: user.id, name: user.name, login_id: user.login_id, role: user.role, is_dev: !!user.is_dev, totp_enabled: !!user.totp_enabled, recovery_left: user.claude ? 0 : await recoveryLeft(env, user.id), ...(user.claude ? { email: null, seen_release: null } : (await env.DB.prepare('SELECT email, seen_release, avatar_v FROM users WHERE id = ?').bind(user.id).first()) || {}) }, 200, ck ? { 'set-cookie': ck } : {}); }
    if (api === '/logout' && method === 'POST') return logout(env, req);
    if (api === '/password' && method === 'POST') return changePassword(env, user, req);
    if (api === '/2fa/setup' && method === 'POST') return twofaSetup(env, user);
    if (api === '/2fa/enable' && method === 'POST') return twofaEnable(env, user, req);
    if (api === '/2fa/recovery' && method === 'POST') return recoveryNew(env, user, req);
    if (api === '/2fa/forget-devices' && method === 'POST') return forgetDevices(env, user);
    if (api === '/me/email' && method === 'POST') return setMyEmail(env, user, req);
    if (api === '/me/seen' && method === 'POST') return setSeenRelease(env, user, req);
    // Contractor and client accounts can sign in and manage their own login, but see no founder data until their own screens exist.
    if (user.role !== 'founder') return bad('This account has no access to the founders app yet.', 403);
    if (api === '/data' && method === 'GET') return allData(env, user);
    if ((m = api.match(/^\/avatar\/(lead|watch|user)\/([\w]+)$/))) {
      if (method === 'GET') return avatarGet(env, m[1], m[2]);
      if (method === 'PUT') return avatarPut(env, user, m[1], m[2], req);
      if (method === 'DELETE') return avatarDelete(env, user, m[1], m[2]);
    }
    if ((m = api.match(/^\/avatar\/(lead|watch)\/([\w]+)\/fetch$/)) && method === 'POST') return avatarFetch(env, user, m[1], m[2]);
    if (api === '/tasks' && method === 'POST') return taskCreate(env, user, req);
    if ((m = api.match(/^\/tasks\/([\w]+)$/))) {
      if (method === 'PATCH') return taskUpdate(env, user, m[1], req);
      if (method === 'DELETE') return taskDelete(env, user, m[1]);
    }
    if (api === '/leads' && method === 'POST') return leadCreate(env, user, req);
    if ((m = api.match(/^\/leads\/([\w]+)$/)) && method === 'PATCH') return leadUpdate(env, user, m[1], req);
    if ((m = api.match(/^\/leads\/([\w]+)\/event$/)) && method === 'POST') return leadEvent(env, user, m[1], req);
    if ((m = api.match(/^\/leads\/([\w]+)\/engage$/)) && method === 'POST') return leadEngage(env, user, m[1], req);
    if (api === '/watch' && method === 'POST') return watchAdd(env, user, req);
    if ((m = api.match(/^\/watch\/([\w]+)$/)) && method === 'PATCH') return watchUpdate(env, user, m[1], req);
    if ((m = api.match(/^\/watch\/([\w]+)\/comment$/))) {
      if (method === 'POST') return watchComment(env, user, m[1], req);
      if (method === 'DELETE') return watchUncomment(env, user, m[1]);
    }
    if ((m = api.match(/^\/watch\/([\w]+)\/promote$/)) && method === 'POST') return watchPromote(env, user, m[1], req);
    if ((m = api.match(/^\/settings\/(\w+)$/)) && method === 'POST') return setSetting(env, user, m[1], req);
    if (api === '/admin/claude-token' && method === 'POST') return claudeIssue(env, user, req);
    if (api === '/admin/claude-token/revoke' && method === 'POST') return claudeRevoke(env, user);
    if (api === '/radar' && method === 'POST') return radarCreate(env, user, req);
    if ((m = api.match(/^\/radar\/([\w]+)$/)) && method === 'PATCH') return radarUpdate(env, user, m[1], req);
    if (api === '/dev' && method === 'GET') return devInfo(env, user);
    if (api === '/admin/build' && method === 'GET') return buildInfo(env, user);
    if (api === '/admin/notes' && method === 'POST') return noteCreate(env, user, req);
    if ((m = api.match(/^\/admin\/notes\/(\w+)$/))) {
      if (method === 'PATCH') return noteUpdate(env, user, m[1], req);
      if (method === 'DELETE') return noteDelete(env, user, m[1]);
    }
    if ((m = api.match(/^\/flags\/(\w+)$/)) && method === 'POST') return setFlag(env, user, m[1], req);
    if (api === '/admin/reset-link' && method === 'POST') return adminResetLink(env, user, req);
    if (api === '/admin/user-email' && method === 'POST') return adminSetEmail(env, user, req);
    if (api === '/admin/mail-test' && method === 'POST') return adminMailTest(env, user);
    if (api === '/admin/users' && method === 'GET') return adminUsers(env, user);
    if (api === '/admin/users' && method === 'POST') return adminCreateUser(env, user, req);
    if ((m = api.match(/^\/admin\/users\/(\w+)\/active$/)) && method === 'POST') return adminSetActive(env, user, m[1], req);
    if (api === '/admin/revoke' && method === 'POST') return revokeSessions(env, user, req);
    return bad('Not found.', 404);
  }

  // Pages and scripts: only the sign-in files are public. Everything else needs a session.
  const path = (p === '/app') ? '/app/index.html' : p;
  if (method !== 'GET' && method !== 'HEAD') return withSec(new Response('Method not allowed', { status: 405 }));
  if (path === '/app/login.html') {
    // Already signed in: skip the sign-in page, so the back gesture never shows a login screen.
    if (await sessionUser(env, req)) return withSec(Response.redirect(url.origin + '/app/', 302));
  }
  if (!PUBLIC_PAGES.has(path)) {
    const user = await sessionUser(env, req);
    if (!user) return withSec(Response.redirect(url.origin + '/app/login.html', 302));
  }
  const file = (path === '/app' || path === '/app/') ? '/app/index.html' : path;
  const assetReq = new Request(new URL(file, url.origin), req);
  const res = await env.ASSETS.fetch(assetReq);
  return withSec(res);
}

// ---------- cron ----------
async function health(env) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE active = 1').first();
  const ok = r && r.n > 0;
  await env.DB.prepare(`INSERT INTO integrations(key,last_run_at,last_error) VALUES ('health',?,?)
    ON CONFLICT(key) DO UPDATE SET last_run_at=excluded.last_run_at, last_error=excluded.last_error`)
    .bind(nowIso(), ok ? null : 'no active users').run();
  return ok;
}

export default {
  async fetch(req, env, ctx) {
    try { return await route(req, env, ctx); }
    catch (e) {
      if (e instanceof HttpError) return bad(e.message, e.status);
      ctx.waitUntil(notify(env, 'errors', `App error on ${new URL(req.url).pathname}: ${String(e && e.message || e).slice(0, 200)}`));
      return bad('Something broke. The team was alerted.', 500);
    }
  },
  async scheduled(event, env, ctx) {
    try {
      const ok = await health(env);
      if (!ok) { await notify(env, 'errors', 'Health check failed: no active users found.'); return; }
      if (event.cron === '0 4 * * 1') await notify(env, 'alerts', 'Monday check: the app is healthy.');
      await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso()).run();
      await env.DB.prepare('DELETE FROM trusted_devices WHERE expires_at < ?').bind(nowIso()).run();
      await env.DB.prepare('DELETE FROM claude_tokens WHERE expires_at < ?').bind(new Date(Date.now() - 864e5).toISOString()).run();
    } catch (e) {
      await notify(env, 'errors', `Health check error: ${String(e && e.message || e).slice(0, 200)}`);
    }
  }
};
