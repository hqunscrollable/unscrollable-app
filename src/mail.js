// Minimal SMTP sender for a Cloudflare Worker (implicit TLS, AUTH LOGIN).
// Config: SMTP_PASS (secret). Optional vars: SMTP_HOST, SMTP_PORT, SMTP_USER. Defaults are the Hostinger mailbox.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (s) => btoa(String.fromCharCode(...enc.encode(s)));
const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();
export const emailOk = (e) => /^[^\s@<>",;:]{1,64}@[^\s@<>",;:]{1,190}\.[a-z]{2,}$/i.test(String(e || '')) && String(e).length <= 254;

// Preferred path: Resend over HTTPS. Workers cannot reach Hostinger SMTP, so this is the one that works.
// Secrets and vars: RESEND_API_KEY (secret), RESEND_FROM (optional, e.g. "Unscrollable <hq@unscrollable.studio>" once the domain is verified).
async function sendResend(env, { to, subject, text }) {
  const from = String(env.RESEND_FROM || 'Unscrollable <onboarding@resend.dev>').trim();
  const key = String(env.RESEND_API_KEY).trim().replace(/^["']|["']$/g, '');
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json', 'user-agent': 'unscrollable-app/1.0', accept: 'application/json' },
      body: JSON.stringify({ from, to: [clean(to)], subject: clean(subject), text: String(text) })
    });
  } catch (e) { throw new Error('Could not reach Resend: ' + String((e && e.message) || e).slice(0, 100)); }
  if (!res.ok) {
    let m = '';
    try {
      const raw = await res.text();
      try { const j = JSON.parse(raw); m = (typeof j.message === 'string' && j.message) || (typeof j.error === 'string' && j.error) || (j.error && j.error.message) || j.name || raw; }
      catch { m = raw; }
    } catch {}
    throw new Error('Resend said ' + res.status + (m ? ': ' + clean(typeof m === 'string' ? m : JSON.stringify(m)).slice(0, 200) : ' (no reason given)') + ' [key ' + key.length + ' chars, starts ' + key.slice(0, 3) + ', to ' + clean(to) + ', server ' + (res.headers.get('server') || '?') + ', type ' + (res.headers.get('content-type') || '?') + ']');
  }
}

export async function sendMail(env, { to, subject, text }, connectFn) {
  if (!emailOk(to)) throw new Error('Bad recipient address');
  if (env.RESEND_API_KEY) return sendResend(env, { to, subject, text });
  if (!env.SMTP_PASS) throw new Error('No mail service is set up (RESEND_API_KEY or SMTP_PASS)');
  const host = env.SMTP_HOST || 'smtp.hostinger.com', port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER || 'hq@unscrollable.studio';
  const connect = connectFn || (await import('cloudflare:sockets')).connect;
  const sock = connect({ hostname: host, port }, { secureTransport: 'on' });
  let stage = 'connecting to ' + host + ':' + port;
  const w = sock.writable.getWriter(), r = sock.readable.getReader();
  let buf = '';
  const say = (e) => new Error(stage + ': ' + String((e && e.message) || e).slice(0, 140));
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
    if (sock.opened) { try { await sock.opened; } catch (e) { throw say(e); } }
    stage = 'waiting for greeting'; await step(null, '220');
    stage = 'hello'; await step('EHLO unscrollable.studio', '250');
    stage = 'login'; await step('AUTH LOGIN', '334');
    stage = 'login user'; await step(b64(user), '334');
    stage = 'login password'; await step(b64(env.SMTP_PASS), '235');
    stage = 'sender'; await step('MAIL FROM:<' + user + '>', '250');
    stage = 'recipient'; await step('RCPT TO:<' + clean(to) + '>', '250');
    stage = 'data'; await step('DATA', '354');
    stage = 'sending message'; await step(msg + '\r\n.', '250');
    try { await w.write(enc.encode('QUIT\r\n')); } catch {}
  };
  try {
    await Promise.race([run().catch((e) => { throw /^Mail server said|^connecting|^waiting|^hello|^login|^sender|^recipient|^data|^sending/.test(e.message) ? e : say(e); }), new Promise((_, rej) => setTimeout(() => rej(new Error('Mail server timed out at: ' + stage)), 12000))]);
  } finally {
    try { sock.close(); } catch {}
  }
}
