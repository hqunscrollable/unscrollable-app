import crypto from 'crypto'; import fs from 'fs';
const k = JSON.parse(fs.readFileSync('/tmp/dk.json')); const priv = crypto.createPrivateKey(k.priv);
const send = async (body, id, bad) => {
  const ts = String(Math.floor(Date.now() / 1000)), raw = JSON.stringify(body);
  let sig = crypto.sign(null, Buffer.from(ts + raw), priv).toString('hex'); if (bad) sig = sig.replace(/^../, sig.startsWith('00') ? '11' : '00');
  const r = await fetch('http://localhost:8787/app/discord', { method: 'POST', headers: { 'x-signature-ed25519': sig, 'x-signature-timestamp': ts, 'content-type': 'application/json' }, body: raw });
  return [r.status, await r.text()];
};
const ok = (n, c) => console.log((c ? 'PASS ' : 'FAIL ') + n);
let r = await send({ type: 1 }); ok('ping answered', r[0] === 200 && r[1].includes('"type":1'));
r = await send({ type: 1 }, 0, true); ok('bad signature refused', r[0] === 401);
r = await send({ type: 2, data: { name: 'status' }, member: { user: { id: '999' } } }); ok('stranger refused', r[0] === 200 && /Only the founders/.test(r[1]));
r = await send({ type: 2, data: { name: 'status' }, member: { user: { id: '111' } } }); ok('founder gets status, private', r[0] === 200 && r[1].includes('"flags":64') && /Test Client/.test(r[1])); console.log(r[1].slice(0, 300));
r = await send({ type: 2, data: { name: 'status', options: [{ name: 'client', value: 'zzznone' }] }, member: { user: { id: '111' } } }); ok('no match message', /No client matches/.test(r[1]));
const nr = await fetch('http://localhost:8787/app/discord', { method: 'POST', body: '{}' }); ok('unsigned refused', nr.status === 401);
