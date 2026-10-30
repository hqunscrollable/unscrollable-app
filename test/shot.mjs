import { chromium } from 'playwright';
const b = await chromium.launch(); for (const theme of ['light','dark']) {
const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
await p.goto('http://localhost:8799/app/'); await p.fill('#id', 'tabish'); await p.fill('#pw', 'test-pass-123456'); await p.click('#go');
await p.waitForSelector('[data-act="nav"][data-id="leads"]'); await p.click(`[data-act="theme"][data-id="${theme}"]`);
await p.click('[data-act="nav"][data-id="leads"]'); await p.click('[data-act="llistsel"][data-id="watch"]'); await p.screenshot({ path: `/tmp/t/prev-watch-${theme}.png` });
await p.click('[data-act="llistsel"][data-id="any"]'); await p.screenshot({ path: `/tmp/t/prev-any-${theme}.png` });
await p.click('[data-act="nav"][data-id="home"]'); await p.screenshot({ path: `/tmp/t/prev-fu-${theme}.png` }); }
await b.close();
