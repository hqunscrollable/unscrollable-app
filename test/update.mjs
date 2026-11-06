import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787'; const PW = 'test-pass-123456';
const br = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await br.newContext({ viewport: vp, serviceWorkers: 'block' }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/'); await pg.waitForTimeout(1200);
  ok(label + ': no bar when up to date', await pg.locator('#updbar').isHidden());
  await pg.evaluate(() => { window.__marker = 1; });
  await pg.route('**/app/js/releases.js*', async r => { const res = await r.fetch(); let t = await res.text(); t = t.replace("v: '1.6.5'", "v: '9.9.9'").replace("window.UNS_RELEASES = [", "window.UNS_RELEASES = [\n  { v: '9.9.9', date: 'x', title: 'Test', what: '', does: '', friction: 'x', where: '' },"); await r.fulfill({ response: res, body: t }); });
  await pg.evaluate(() => window.U.checkUpdate(true)); await pg.waitForTimeout(800);
  ok(label + ': bar appears for a newer version', await pg.locator('#updbar').isVisible() && /9\.9\.9/.test(await pg.textContent('#updbar')));
  if (label === 'phone') await pg.screenshot({ path: '/mnt/user-data/outputs/v165-update-phone.png' }); else await pg.screenshot({ path: '/mnt/user-data/outputs/v165-update-desktop.png' });
  await pg.click('[data-act=laterupdate]'); ok(label + ': Later hides it', await pg.locator('#updbar').isHidden());
  await pg.evaluate(() => { document.getElementById('updbar').hidden = false; });
  await Promise.all([pg.waitForNavigation({ timeout: 10000 }), pg.click('[data-act=applyupdate]')]);
  await pg.waitForTimeout(1500);
  ok(label + ': Update now reloads the page itself', (await pg.evaluate(() => window.__marker)) === undefined);
  ok(label + ': still signed in after update', /\/app\/?$/.test(pg.url()) || pg.url().includes('/app/'));
  ok(label + ': no bar after update', await pg.locator('#updbar').isHidden());
  ok(label + ': no page errors', errs.length === 0); if (errs.length) console.log(errs);
  await ctx.close();
}
await br.close();
