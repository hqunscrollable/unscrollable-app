import net from 'node:net';
import { sendMail, emailOk } from '../src/mail.js';
const ok = (n, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : ' ' + x)); if (!c) process.exitCode = 1; };
const got = []; let failAuth = false;
const srv = net.createServer(s => {
  let data = false, msg = '', auth = 0;
  s.write('220 hi\r\n');
  s.on('data', d => { for (const l of d.toString().split('\r\n').filter(Boolean)) {
    if (data) { msg += l + '\n'; if (l === '.') { data = false; got.push(msg); s.write('250 queued\r\n'); } continue; }
    got.push(l);
    if (l.startsWith('EHLO')) s.write('250-x\r\n250 AUTH LOGIN\r\n');
    else if (l === 'AUTH LOGIN') { auth = 1; s.write('334 VXNlcm5hbWU6\r\n'); }
    else if (l.startsWith('MAIL') || l.startsWith('RCPT')) s.write('250 ok\r\n');
    else if (l === 'DATA') { data = true; s.write('354 go\r\n'); }
    else if (l === 'QUIT') s.end('221 bye\r\n');
    else if (auth === 1) { auth = 2; s.write('334 UGFzc3dvcmQ6\r\n'); }
    else if (auth === 2) { auth = 3; s.write(failAuth ? '535 bad login\r\n' : '235 ok\r\n'); }
  } });
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
const connectFn = () => { const c = net.connect(port, '127.0.0.1');
  return { writable: new WritableStream({ write: ch => new Promise(r => c.write(ch, r)) }),
    readable: new ReadableStream({ start(ctl) { c.on('data', d => ctl.enqueue(new Uint8Array(d))); c.on('end', () => { try { ctl.close(); } catch {} }); } }), close: () => c.destroy() }; };
await sendMail({ SMTP_PASS: 'pw' }, { to: 'a@b.com', subject: 'Hi\r\nBcc: x@y.com', text: 'Hello link' }, connectFn);
const all = got.join('\n');
ok('sequence', /EHLO/.test(all) && /AUTH LOGIN/.test(all) && /MAIL FROM:<hq@unscrollable.studio>/.test(all) && /RCPT TO:<a@b.com>/.test(all) && /DATA/.test(all));
ok('subject cannot inject headers', !/^Bcc:/m.test(all));
ok('body is base64', /SGVsbG8gbGluaw==/.test(all));
failAuth = true;
let err = ''; try { await sendMail({ SMTP_PASS: 'pw' }, { to: 'a@b.com', subject: 's', text: 't' }, connectFn); } catch (e) { err = e.message; }
ok('auth failure reported', /535/.test(err), err);
err = ''; try { await sendMail({}, { to: 'a@b.com', subject: 's', text: 't' }, connectFn); } catch (e) { err = e.message; }
ok('missing password reported', /SMTP_PASS/.test(err), err);
ok('bad address refused', !emailOk('a@b') && !emailOk('a b@c.com') && emailOk('x.y@z.co'));
srv.close();
