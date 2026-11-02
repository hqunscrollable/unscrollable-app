# Unscrollable app: rules for Claude

Read `STATUS.json` first, before anything else. It says what is live, what is built but not deployed, what is next, and what is blocked on Tabish.

At the end of every build, update `STATUS.json` (versions, feature states, pending steps, next three, changelog) and add an entry to `public/app/js/releases.js`. Tabish reads STATUS.json in the app at `/app/#build`.

Facts
- Cloudflare Worker with static assets and D1 (binding DB). Route unscrollable.studio/app*.
- Tabish deploys from his PC (git am, git push, wrangler). Claude cannot deploy.
- One phase per session, one patch per phase. Patch order matters.
- No secrets in the repo, in STATUS.json or in notes.
- Plain words for the founders. No em dashes.
