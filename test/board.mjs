import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787'; const PW = 'test-pass-123456';
const br = await chromium.launch();
for (const w of [1024, 1280, 1366]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/'); await pg.waitForTimeout(700);
  if (w === 1024) {
    const mk = (n, c, st) => pg.evaluate(async ([n, c, st]) => { const r = await fetch('/app/api/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-uns': '1' }, body: JSON.stringify({ name: n, company: c, owner: 'Ali', stage: st, list: 'icp' }) }); return r.status; }, [n, c, st]);
    await mk('Vladimir Krstic Longname', 'Introscope', 'sent'); await mk('Erik Schutzler', 'Moe', 'accepted'); await mk('Josephine Femenella', 'First Rounds On Me', 'comment'); await mk('Batu Balci', 'Toven Systems', 'sent');
  }
  await pg.evaluate(() => { location.hash = '#leads'; }); await pg.waitForTimeout(1000);
  await pg.click('[data-act=llistsel][data-id=icp]').catch(() => {}); await pg.waitForTimeout(400);
  ok(w + ': sent list present, no sent column', (await pg.locator('.srow').count()) >= 2 && (await pg.locator('.lcol b', { hasText: 'Connection sent' }).count()) === 0);
  const hs = await pg.evaluate(() => Array.from(document.querySelectorAll('.bc .t')).map(e => e.getBoundingClientRect().height));
  ok(w + ': board names stay on 1 or 2 lines', hs.length > 0 && hs.every(h => h < 50));
  ok(w + ': no page-wide sideways scroll', await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
  const stN = await pg.locator('.srow').count();
  await pg.fill('.lsearch', 'introscope'); await pg.press('.lsearch', 'Enter'); await pg.waitForTimeout(500);
  ok(w + ': search by company filters', (await pg.locator('.srow').count()) < stN && (await pg.locator('.srow').count()) >= 1);
  await pg.fill('.lsearch', 'schutz'); await pg.press('.lsearch', 'Enter'); await pg.waitForTimeout(500);
  ok(w + ': search by name finds board card', (await pg.locator('.bc').count()) >= 1 && (await pg.locator('.bc .t').allTextContents()).every(t => /schutz/i.test(t)));
  if (w === 1024) await pg.screenshot({ path: '/tmp/board1024.png' });
  ok(w + ': no page errors', errs.length === 0); if (errs.length) console.log(errs);
  await ctx.close();
}
await br.close();
