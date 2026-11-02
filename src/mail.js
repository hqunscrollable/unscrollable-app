// Minimal SMTP sender for a Cloudflare Worker (implicit TLS, AUTH LOGIN).
// Config: SMTP_PASS (secret). Optional vars: SMTP_HOST, SMTP_PORT, SMTP_USER. Defaults are the Hostinger mailbox.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (s) => btoa(String.fromCharCode(...enc.encode(s)));
const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();
export const emailOk = (e) => /^[^\s@<>",;:]{1,64}@[^\s@<>",;:]{1,190}\.[a-z]{2,}$/i.test(String(e || '')) && String(e).length <= 254;

export async function sendMail(env, { to, subject, text }, connectFn) {
  if (!env.SMTP_PASS) throw new Error('SMTP_PASS is not set');
  if (!emailOk(to)) throw new Error('Bad recipient address');
  const host = env.SMTP_HOST || 'smtp.hostinger.com', port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER || 'hq@unscrollable.studio';
  const connect = connectFn || (await import('cloudflare:sockets')).connect;
  const sock = connect({ hostname: host, port }, { secureTransport: 'on' });
  const w = sock.writable.getWriter(), r = sock.readable.getReader();
  let buf = '';
  const readReply = async () => {
    for (;;) {
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { const reply = lines.slice(0, i + 1).join('\n'); buf = lines.slice(i + 1).join('\r\n'); return reply; }
      }
      const { value, done } = await r.read();
      if (done) throw new Error('Mail server closed the connection');
      buf += dec.decode(value, { stream: true });
    }
  };
  const step = async (line, want) => {
    if (line !== null) await w.write(enc.encode(line + '\r\n'));
    const reply = await readReply();
    if (!reply.startsWith(want)) throw new Error('Mail server said: ' + clean(reply).slice(0, 120));
  };
  const body = btoa(String.fromCharCode(...enc.encode(String(text)))).replace(/.{76}/g, '$&\r\n');
  const msg = [
    'From: Unscrollable <' + user + '>', 'To: ' + clean(to), 'Subject: ' + clean(subject),
    'Date: ' + new Date().toUTCString(), 'Message-ID: <' + crypto.randomUUID() + '@unscrollable.studio>',
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', body
  ].join('\r\n');
  const run = async () => {
    await step(null, '220');
    await step('EHLO unscrollable.studio', '250');
    await step('AUTH LOGIN', '334');
    await step(b64(user), '334');
    await step(b64(env.SMTP_PASS), '235');
    await step('MAIL FROM:<' + user + '>', '250');
    await step('RCPT TO:<' + clean(to) + '>', '250');
    await step('DATA', '354');
    await step(msg + '\r\n.', '250');
    try { await w.write(enc.encode('QUIT\r\n')); } catch {}
  };
  try {
    await Promise.race([run(), new Promise((_, rej) => setTimeout(() => rej(new Error('Mail server timed out')), 12000))]);
  } finally {
    try { sock.close(); } catch {}
  }
}
