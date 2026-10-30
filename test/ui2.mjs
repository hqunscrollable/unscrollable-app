import { chromium } from 'playwright';
const B = 'http://localhost:8799', b = await chromium.launch(); const errs = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + (x || ''))); if (!c) process.exitCode = 1; };
await p.goto(B + '/app/'); await p.fill('#id', 'tabish'); await p.fill('#pw', 'test-pass-123456'); await p.click('#go');
await p.waitForSelector('[data-act="nav"][data-id="leads"]');
ok('no separate Watchlist nav item', (await p.locator('[data-act="nav"][data-id="watchlist"]').count()) === 0);
await p.click('[data-act="nav"][data-id="leads"]');
// add cold lead via UI
await p.click('[data-act="laddtoggle"]'); await p.fill('#a_name', 'UI Cold Lead'); await p.selectOption('#a_start', 'sent'); await p.selectOption('#a_list', 'any'); await p.fill('#a_ind', 'Fintech');
await p.fill('#a_url', 'https://www.linkedin.com/in/ui-cold-' + Date.now().toString(36)); await p.click('[data-act="laddsave"]'); await p.waitForTimeout(800);
await p.click('[data-act="llistsel"][data-id="any"]');
ok('any list shows lead at Connection sent', (await p.textContent('#main')).includes('UI Cold Lead') && (await p.textContent('#main')).includes('Connection sent'));
await p.click('[data-act="lopen"]'); await p.waitForSelector('.drawer');
ok('side panel opens', true); await p.screenshot({ path: '/tmp/t/drawer.png' });
await p.keyboard.press('Escape'); ok('Escape closes', (await p.locator('.drawer').count()) === 0);
// Watchlist toggle
await p.click('[data-act="llistsel"][data-id="watch"]'); await p.click('[data-act="wtab"][data-id="add"]');
const u = Date.now().toString(36);
await p.fill('#w_paste', Array.from({ length: 12 }, (_, i) => `Person ${i}, https://www.linkedin.com/in/ui-w-${u}-${i}`).join('\n')); await p.selectOption('#w_own', 'Tabish'); await p.click('[data-act="wadd"]'); await p.waitForTimeout(900);
await p.click('[data-act="wtab"][data-id="today"]');
const n0 = await p.locator('[data-act="wdone"]').count(); ok('today batch shows people', n0 >= 12, n0);
await p.locator('[data-act="wdone"]').first().click(); await p.waitForTimeout(700);
ok('commented moves to done today', (await p.locator('[data-act="wundo"]').count()) === 1 && (await p.locator('[data-act="wdone"]').count()) === n0 - 1);
await p.screenshot({ path: '/tmp/t/watch.png', fullPage: true });
await p.locator('[data-act="wundo"]').first().click(); await p.waitForTimeout(600);
await p.click('[data-act="wtab"][data-id="all"]'); ok('all tab lists people', (await p.locator('[data-chg="wowner"]').count()) > 0);
// engage: make a cold lead sent 3 days ago via SQL is done outside; check the group renders
await p.click('[data-act="nav"][data-id="home"]'); ok('followups has Engage group', (await p.textContent('#main')).includes('Engage'));
// developer token
await p.click('[data-act="nav"][data-id="developer"]'); await p.waitForSelector('[data-act="ctmake"]'); await p.click('[data-act="ctmake"]'); await p.waitForTimeout(600);
const tok = await p.locator('code', { hasText: 'cl_' }).first().textContent(); ok('token shown', /^cl_[0-9a-f]{64}$/.test(tok.trim()));
await p.screenshot({ path: '/tmp/t/dev.png', fullPage: true });
await p.click('[data-act="ctrevoke"]');
// phone width
const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 800 }); m.on('pageerror', e => errs.push(e.message));
await m.goto(B + '/app/'); await m.waitForTimeout(1200);
const ov = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2); ok('no horizontal scroll on phone', !ov);
console.log('ERRORS:', errs.join('|') || 'none'); await b.close();
