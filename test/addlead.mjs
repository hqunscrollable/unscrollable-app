import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787'; const PW = 'test-pass-123456';
const br = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1100, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await br.newContext({ viewport: vp }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/'); await pg.waitForTimeout(700);
  await pg.evaluate(() => { location.hash = '#leads'; }); await pg.waitForTimeout(900);
  await pg.click('[data-act=llistsel][data-id=icp]'); await pg.waitForTimeout(300);
  await pg.click('[data-act=laddtoggle]'); await pg.waitForTimeout(300);
  const N = 'Zed ' + label + Date.now();
  await pg.fill('#a_name', N); await pg.selectOption('#a_list', 'any'); await pg.selectOption('#a_own', 'Ali');
  await pg.click('[data-act=laddsave]'); await pg.waitForTimeout(1500);
  ok(label + ': new lead visible right after adding (other list and owner)', (await pg.textContent('#main')).includes(N));
  ok(label + ': no page errors', errs.length === 0); if (errs.length) console.log(errs);
  await ctx.close();
}
await br.close();
