import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787'; const PW = 'test-pass-123456';
const br = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1100, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await br.newContext({ viewport: vp }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/');
  await pg.waitForTimeout(700);
  await pg.evaluate(() => { location.hash = '#intake'; }); await pg.waitForTimeout(1200);
  let t = await pg.textContent('#main');
  ok(label + ': both founder forms listed', t.includes('Founder Alignment') && t.includes('Founder Traits'));
  ok(label + ': shows you done', /You: done/.test(t));
  // alignment: open, results locked
  await pg.click('[data-id="if_alignment"]'); await pg.waitForTimeout(400);
  ok(label + ': form home shows people', /Ali/.test(await pg.textContent('#main')) && /Waiting/.test(await pg.textContent('#main')));
  await pg.click('[data-act=inres]'); await pg.waitForTimeout(400);
  t = await pg.textContent('#main');
  ok(label + ': alignment results wait for the others', /Waiting on Ali and Mehak/.test(t));
  // edit wizard
  await pg.click('[data-act=inopen][data-id="if_alignment"]'); await pg.waitForTimeout(300);
  await pg.click('[data-act=intake]'); await pg.waitForTimeout(400);
  ok(label + ': wizard shows 1 of 22', /1 of 22/.test(await pg.textContent('#main')));
  let steps = 0;
  for (let i = 0; i < 40; i++) {
    const txt = await pg.textContent('#main');
    const m = txt.match(/(\d+) of 22/); if (!m) break;
    const dis = await pg.$eval('#iq_next', b => b.disabled);
    if (dis) {
      if (await pg.$('#iq_tx')) await pg.fill('#iq_tx', 'x');
      else { const c = await pg.$('.iq-chip[aria-pressed="false"]'); if (c) await c.click(); }
      await pg.waitForTimeout(100);
    }
    steps++;
    await pg.click('#iq_next'); await pg.waitForTimeout(150);
    if (/Saved/.test(await pg.innerText('body')) && !/\d+ of 22/.test(await pg.textContent('#main'))) break;
  }
  await pg.waitForTimeout(900);
  t = await pg.textContent('#main');
  ok(label + ': submit lands on results', /Waiting on|Side by side/.test(t));
  // traits
  await pg.click('[data-act=inopen]'); await pg.waitForTimeout(200);
  await pg.click('[data-act=inopen][data-id=""]'); await pg.waitForTimeout(300);
  await pg.click('[data-act=inopen][data-id="if_traits"]'); await pg.waitForTimeout(300);
  await pg.click('[data-act=inres]'); await pg.waitForTimeout(400);
  t = await pg.textContent('#main');
  ok(label + ': traits profile shows bars', /Curiosity|Follow-through/.test(t) && /\/ 100/.test(t));
  ok(label + ': team locked', await pg.$eval('[data-act=intab][data-id=team]', b => b.disabled));
  await pg.screenshot({ path: '/tmp/traits-' + label + '.png', fullPage: true });
  // narrow overflow
  ok(label + ': no horizontal overflow', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok(label + ': no page errors', errs.length === 0); if (errs.length) console.log(errs);
  await ctx.close();
}
await br.close();
