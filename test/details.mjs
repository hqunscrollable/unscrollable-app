import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787'; const PW = 'test-pass-123456';
const br = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1100, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await br.newContext({ viewport: vp });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/');
  await pg.waitForTimeout(600);
  await pg.evaluate(() => { location.hash = '#leads'; }); await pg.waitForTimeout(900);
  await pg.click('[data-act=lopen]'); await pg.waitForSelector('.drawer');
  const id = await pg.$eval('.drawer [data-act=ldetsave]', e => e.getAttribute('data-id'));
  ok(label + ': Details form in the panel', !!(await pg.$('#ld_co_' + id)) && !!(await pg.$('#ld_x_' + id)) && !!(await pg.$('#ld_url_' + id)));
  const co = 'Test Co ' + label;
  await pg.fill('#ld_co_' + id, co); await pg.fill('#ld_x_' + id, 'https://x.com/testperson');
  await pg.click('[data-act=ldetsave]'); await pg.waitForTimeout(1200);
  await pg.click('.drawer [data-act=lclose]').catch(() => {}); await pg.waitForTimeout(300);
  await pg.evaluate(i => {}, id);
  await pg.click('[data-act=lopen][data-id="' + id + '"]').catch(async () => { await pg.click('[data-act=lopen]'); });
  await pg.waitForSelector('.drawer');
  ok(label + ': company saved', (await pg.inputValue('#ld_co_' + id)) === co);
  ok(label + ': X link saved', (await pg.inputValue('#ld_x_' + id)) === 'https://x.com/testperson');
  await pg.fill('#ld_x_' + id, 'https://example.com/nope'); await pg.click('[data-act=ldetsave]'); await pg.waitForTimeout(800);
  ok(label + ': bad X link is refused', /Not saved/.test(await pg.innerText('body')));
  await pg.screenshot({ path: '/tmp/details-' + label + '.png' });
  ok(label + ': no page errors', errs.length === 0); if (errs.length) console.log(errs);
  await ctx.close();
}
await br.close();
