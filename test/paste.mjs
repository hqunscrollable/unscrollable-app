import { chromium } from 'playwright';
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) process.exitCode = 1; };
const B = 'http://localhost:8787'; const PW = 'test-pass-123456';
const br = await chromium.launch(); const pg = await (await br.newContext({ viewport: { width: 1200, height: 900 } })).newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
await pg.goto(B + '/app/login.html'); await pg.fill('#id', 'tabish'); await pg.fill('#pw', PW); await pg.click('#go'); await pg.waitForURL('**/app/');
await pg.waitForSelector('#nav [data-id=leads]', { state: 'attached' });
await pg.evaluate(() => { location.hash = '#leads'; }); await pg.waitForTimeout(800);
const pasteImg = () => pg.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 64, 64);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); const dt = new DataTransfer(); dt.items.add(new File([blob], 'p.png', { type: 'image/png' }));
  document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
});
// 1. open the card, click the face on desktop: no file chooser, a Ctrl+V hint, then paste works
let chooser = false; pg.on('filechooser', () => { chooser = true; });
await pg.click('.item:has(.co:has-text("Chromie")) [data-act=lopen]'); await pg.waitForTimeout(400);
const face = await pg.$('.drawer .avb'); ok('face is tappable in the card', !!face);
await face.click(); await pg.waitForTimeout(300);
ok('desktop click does not open the file chooser first', !chooser);
ok('hint says Press Ctrl+V', /Press Ctrl\+V/.test(await pg.textContent('#toasts')));
await pasteImg(); await pg.waitForTimeout(1200);
ok('pasted photo saved for that lead', (await pg.$$('.drawer img.avp')).length >= 1);
await pg.click('[data-act=lclose]'); await pg.waitForTimeout(300);
// 2. drawer open, paste goes to that lead without clicking the face
await pg.click('.item:has(.co:has-text("Click")) [data-act=lopen]'); await pg.waitForTimeout(400);
await pg.evaluate(() => { /* clear old target */ });
await pasteImg(); await pg.waitForTimeout(1200);
const d = await pg.$eval('.drawer', e => e.querySelectorAll('img.avp').length); ok('paste with the card open sets that lead photo', d >= 1);
ok('no page errors', errs.length === 0); if (errs.length) console.log(errs);
await br.close();
