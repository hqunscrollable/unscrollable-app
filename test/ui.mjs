import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:8799';
const b = await chromium.launch(); const errs = [];
async function run(w, h, tag) {
  const go = async (p, id) => { if (w < 860) { const m = await p.$('[data-act="menu"]'); if (m && await m.isVisible()) await m.click(); await p.waitForTimeout(250); } const el = await p.$(`[data-act="nav"][data-id="${id}"]`); if (!el) return null; await el.click(); await p.waitForTimeout(300); return el; };
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(tag + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(tag + ' console ' + m.text()); });
  await p.goto(base + '/app/');
  await p.waitForURL('**/login.html');
  await p.fill('#id', 'tabish'); await p.fill('#pw', 'test-pass-123456'); await p.click('#go');
  await p.waitForURL('**/app/'); await p.waitForSelector('nav button, nav a', { timeout: 8000 });
  const navs = await p.$$eval('[data-act="nav"]', e => e.map(x => x.textContent.trim().replace(/\s+/g, ' ')));
  console.log(tag, 'nav:', navs.join(' | '));
  for (const id of ['home','leads','tasks','account','developer','clients','posts','inbox','audits','billing']) {
    if (!(await go(p, id))) { console.log(tag, 'no nav', id); continue; }
    const demo = await p.$$eval('.banner', e => e.some(x => /Demo screen/.test(x.textContent)));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    console.log(tag, id, 'demoBanner=' + demo, 'hscroll=' + sw);
  }
  await go(p, 'leads'); await p.click('[data-act="laddtoggle"]');
  await p.fill('#a_name', 'UI Test ' + tag); await p.click('[data-act="laddsave"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/t/leads-${tag}.png` });
  await go(p, 'home');
  await p.screenshot({ path: `/tmp/t/fu-${tag}.png` });
  await go(p, 'home');
  await p.screenshot({ path: `/tmp/t/home-${tag}.png` });
  await ctx.close();
}
await run(1280, 800, 'desk'); await run(390, 800, 'phone');
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close();
