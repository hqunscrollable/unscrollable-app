// Discord alerts. The app writes to Discord. Discord never writes to the app.
export async function notify(env, channel, text) {
  const url = channel === 'errors' ? env.DISCORD_ERRORS : env.DISCORD_ALERTS;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: String(text).slice(0, 1800), allowed_mentions: { parse: [] } })
    });
    return r.ok;
  } catch { return false; }
}
