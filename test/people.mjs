import { chromium } from 'playwright';
const B = 'http://localhost:8799', b = await chromium.launch(); const errs = [];
async function page() { const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message)); return p; }
const p = await page();
await p.goto(B + '/app/'); await p.fill('#id', 'tabish'); await p.fill('#pw', 'test-pass-123456'); await p.click('#go');
await p.waitForSelector('[data-act="nav"][data-id="developer"]'); await p.click('[data-act="nav"][data-id="developer"]');
await p.waitForSelector('#nu_name');
const uid = 'zed' + Date.now().toString(36).slice(-5);
await p.fill('#nu_name', 'Zed Contractor'); await p.fill('#nu_id', uid); await p.selectOption('#nu_role', 'contractor'); await p.click('[data-act="ucreate"]');
const lc = p.locator('code', { hasText: 'reset.html' }); await lc.waitFor(); const link = (await lc.first().textContent()).trim(); console.log('link ok:', /reset\.html#/.test(link));
const q = await page(); await q.goto(link); await q.fill('#pw', 'zed-password-9999'); await q.fill('#pw2', 'zed-password-9999'); await q.click('#go'); await q.waitForURL('**/login.html');
await q.fill('#id', uid); await q.fill('#pw', 'zed-password-9999'); await q.click('#go'); await q.waitForTimeout(1500);
console.log('contractor sees:', (await q.textContent('#main')).slice(0, 80));
const r = await q.evaluate(async () => (await fetch('/app/api/data')).status); console.log('contractor /data status:', r);
const t = await q.evaluate(async () => (await fetch('/app/api/dev')).status); console.log('contractor /dev status:', t);
// reuse of link must fail
const again = await q.evaluate(async (tok) => (await fetch('/app/api/reset', { method: 'POST', headers: { 'x-uns': '1', 'content-type': 'application/json' }, body: JSON.stringify({ token: tok, password: 'another-password-1' }) })).status, link.split('#')[1]); console.log('link reuse status:', again);
// deactivate
await p.reload(); await p.click('[data-act="nav"][data-id="developer"]'); await p.waitForSelector('[data-act="uactive"]');
await p.locator('.item', { hasText: uid }).locator('[data-act="uactive"]').click(); await p.waitForTimeout(800);
const gone = await q.evaluate(async () => (await fetch('/app/api/me')).status); console.log('after switch off /me:', gone);
await p.screenshot({ path: '/tmp/t/people.png', fullPage: true });
console.log('ERRORS:', errs.join('|') || 'none'); await b.close();
