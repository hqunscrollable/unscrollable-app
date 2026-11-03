import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787', H = { 'x-uns': '1', 'content-type': 'application/json' };
const PW = 'test-pass-123456';

// server: cookie, login redirect, renewal
const lr = await fetch(B + '/app/api/login', { method: 'POST', headers: H, body: JSON.stringify({ login_id: 'tabish', password: PW }) });
const ck = lr.headers.getSetCookie()[0];
ok('session cookie is SameSite=Lax', /SameSite=Lax/.test(ck) && !/SameSite=Strict/.test(ck));
const cookie = ck.split(';')[0];
const r1 = await fetch(B + '/app/login.html', { headers: { cookie }, redirect: 'manual' });
ok('signed in: login page redirects to app', r1.status === 302 && /\/app\/$/.test(r1.headers.get('location') || ''));
const r2 = await fetch(B + '/app/login.html', { redirect: 'manual' });
ok('signed out: login page still loads', r2.status === 200);
const me = await fetch(B + '/app/api/me', { headers: { cookie } });
const sc = me.headers.getSetCookie()[0] || '';
ok('opening the app renews the session cookie', /uns_app=/.test(sc) && /Max-Age=\d{6,7}/.test(sc) && /SameSite=Lax/.test(sc));
ok('sw.js is public', (await fetch(B + '/app/sw.js')).status === 200);

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 800 } });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/');
await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached' });

// back never lands on login
await pg.goBack().catch(() => {});
ok('back from first screen does not show sign-in', !/login\.html/.test(pg.url()));
await pg.goto(B + '/app/'); await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached' });
ok('signed in: visiting login goes to app', await (async () => { await pg.goto(B + '/app/login.html'); return /\/app\/(#.*)?$/.test(pg.url()); })());
await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached' });

// history: each screen is a step
await pg.evaluate(() => window.U.go('leads')); await pg.waitForTimeout(150);
await pg.evaluate(() => window.U.go('tasks')); await pg.waitForTimeout(150);
ok('tasks shown', await pg.evaluate(() => window.U.S.route) === 'tasks');
await pg.goBack(); await pg.waitForTimeout(200);
ok('back goes to leads', await pg.evaluate(() => window.U.S.route) === 'leads');
await pg.goBack(); await pg.waitForTimeout(200);
ok('back goes to home', await pg.evaluate(() => window.U.S.route) === 'home');
await pg.goForward(); await pg.waitForTimeout(200);
ok('forward goes to leads', await pg.evaluate(() => window.U.S.route) === 'leads');

// sheet is a history step: back closes it, stays on the screen
await pg.evaluate(() => { const l = window.U.live && window.U.live.leads && window.U.live.leads[0]; if (l) window.U.openLead(l.id); });
await pg.waitForTimeout(250);
const sheetOpen = await pg.evaluate(() => !document.getElementById('sheet').hidden);
ok('lead card opens', sheetOpen);
if (sheetOpen) {
  await pg.goBack(); await pg.waitForTimeout(250);
  ok('back closes the card', await pg.evaluate(() => document.getElementById('sheet').hidden));
  ok('still on leads', await pg.evaluate(() => window.U.S.route) === 'leads');
  await pg.evaluate(() => { const l = window.U.live.leads[0]; window.U.openLead(l.id); }); await pg.waitForTimeout(200);
  await pg.evaluate(() => window.U.closeSheet()); await pg.waitForTimeout(250);
  ok('closing the card with its button leaves no extra step', await pg.evaluate(() => window.U.S.route) === 'leads');
  await pg.goBack(); await pg.waitForTimeout(200);
  ok('one back from there goes to home', await pg.evaluate(() => window.U.S.route) === 'home');
}

// phone chrome
ok('prototype bar hidden on phone', await pg.evaluate(() => getComputedStyle(document.querySelector('.proto')).display) === 'none');
await pg.evaluate(() => window.U.go('account')); await pg.waitForTimeout(200);
ok('install card on My account', /Put it on your home screen/.test(await pg.textContent('#main')));
await pg.click('[data-act=menu]'); await pg.waitForTimeout(250);
ok('menu has Sign out and Light or dark', (await pg.locator('.sidefoot [data-act=signout]').isVisible()) && (await pg.locator('.sidefoot [data-act=themeflip]').isVisible()));
const t0 = await pg.evaluate(() => window.U.S.theme); await pg.click('[data-act=themeflip]'); await pg.waitForTimeout(150);
ok('theme switch works', await pg.evaluate(() => window.U.S.theme) !== t0);
ok('no sideways scroll at 390px', await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

// service worker and offline
await pg.evaluate(() => navigator.serviceWorker.ready); await pg.waitForTimeout(1500);
const cached = await pg.evaluate(async () => { const ks = await caches.keys(); if (!ks.length) return 0; return (await (await caches.open(ks[0])).keys()).length; });
ok('service worker cached the shell (' + cached + ' files)', cached >= 8);
await pg.goto(B + '/app/'); await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached' });
await ctx.setOffline(true);
await pg.reload(); await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached', timeout: 8000 }).catch(() => {});
ok('offline reload still shows the app', await pg.locator('#nav [data-id=leads]').count() === 1);
ok('offline bar shows', await pg.evaluate(() => { const b = document.getElementById('offbar'); return !!b && !b.hidden; }));
ok('still not on sign-in', !/login\.html/.test(pg.url()));
await ctx.setOffline(false); await pg.waitForTimeout(300);
ok('offline bar hides when back online', await pg.evaluate(() => document.getElementById('offbar').hidden));

// sign out clears the saved copy
await pg.goto(B + '/app/'); await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached' });
await pg.evaluate(() => window.U.acts.signout()); await pg.waitForURL('**/login.html');
await pg.waitForTimeout(500);
ok('sign out clears saved data and screens', await pg.evaluate(async () => {
  let n = 0; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) { const p = new URL(r.url).pathname; if (p.startsWith('/app/api/') || p.startsWith('/app/js/') || p === '/app/') n++; }
  return n === 0;
}));
ok('no page errors', errs.length === 0); if (errs.length) console.log(errs);
await br.close();
