import { chromium } from 'playwright';
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + x)); if (!c) process.exitCode = 1; };
const b = await chromium.launch(); const errs = [];
for (const [w, h, tag] of [[1280, 800, 'd'], [390, 800, 'm']]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8799/app/login.html');
  ok(tag + ' eye button on login', await pg.locator('.eyeb').count() === 1);
  await pg.fill('#pw', 'secret-value-1');
  await pg.click('.eyeb'); ok(tag + ' shows password', (await pg.getAttribute('#pw', 'type')) === 'text');
  ok(tag + ' label says Hide', (await pg.getAttribute('.eyeb', 'aria-label')) === 'Hide password');
  await pg.click('.eyeb'); ok(tag + ' hides again', (await pg.getAttribute('#pw', 'type')) === 'password');
  ok(tag + ' no sideways scroll', !(await pg.evaluate('document.documentElement.scrollWidth>innerWidth+1')));
  ok(tag + ' remember box present', await pg.locator('#rem').count() === 1);
  await pg.screenshot({ path: `/tmp/login_${tag}.png` });
  // sign in and open My account
  await pg.fill('#id', 'tabish'); await pg.fill('#pw', 'test-pass-123456'); await pg.click('#go'); await pg.waitForURL('**/app/');
  await pg.waitForSelector('[data-act=nav]');
  if (tag === 'm') await pg.click('[data-act=menu]');
  await pg.click('[data-act=nav][data-id=account]'); await pg.waitForTimeout(300);
  ok(tag + ' eye on account fields', await pg.locator('#pw_cur ~ .eyeb, .eyew #pw_cur').count() >= 1);
  ok(tag + ' two eyes on account page', await pg.locator('.eyeb').count() === 2, await pg.locator('.eyeb').count());
  await pg.screenshot({ path: `/tmp/account_${tag}.png`, fullPage: true });
  ok(tag + ' account no sideways scroll', !(await pg.evaluate('document.documentElement.scrollWidth>innerWidth+1')));
}
console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no page errors'); await b.close();
