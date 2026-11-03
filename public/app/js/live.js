/* Live screens: Home, Leads, Follow-ups, Tasks, My account, Developer. Real data from the API.
   Everything else in the app is demo data from the prototype screens. */
(function () {
  var U = window.U, S = U.S, esc = U.esc, pill = U.pill, ME = window.UNS_ME;
  var LIVE = ['home', 'leads', 'followups', 'tasks', 'whatsnew', 'account', 'developer', 'build'];
  var L = window.UNS_DATA;
  U.live = L;
  U.isLive = function (k) { return LIVE.indexOf(k) >= 0; };
  U.SECTIONS.push(['whatsnew', "What's new", 'bell', 'System']);
  S.flags.whatsnew = { back: true, client: false };
  U.SECTIONS.push(['account', 'My account', 'sliders', 'System']);
  S.flags.account = { back: true, client: false };
  function applyFlags() { Object.keys(L.flags || {}).forEach(function (k) { if (S.flags[k]) S.flags[k].back = L.flags[k]; }); }
  applyFlags();
  document.getElementById('markslot').innerHTML = U.MARK;
  document.getElementById('verTxt').textContent = 'v' + (window.UNS_RELEASES && window.UNS_RELEASES[0].v || '') + '. Signed in as ' + ME.name;

  /* ---------- helpers ---------- */
  var STAGES = [['sent', 'Connection sent'], ['accepted', 'Connection accepted'], ['comment', 'First comment'], ['dm', 'DM started'], ['guide', 'Guide sent'], ['audit', 'Audit offered or sent'], ['pitched', 'Call pitched (old)'], ['booked', 'Call booked'], ['away', 'Away']];
  var LISTS = [['icp', 'ICP'], ['any', 'Any industry']];
  var AWAY = ['no reply', 'not ICP', 'no budget', 'timing', 'other'];
  var TAGS = [['hot', 'Hot'], ['warm', 'Warm'], ['quiet', 'Quiet']];
  var OWN = ['Tabish', 'Ali', 'Mehak'];
  var T_ST = [['todo', 'To do'], ['doing', 'Doing'], ['blocked', 'Blocked'], ['done', 'Done']];
  function lab(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v || ''; }
  function addDays(d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function dd(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5); }
  function fmt(d) { return d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''; }
  function when(d) {
    if (!d) return { t: 'No date', c: 'mut', k: 99999 };
    var k = dd(d, L.today);
    if (k < 0) return { t: Math.abs(k) + 'd late', c: 'bad', k: k };
    if (k === 0) return { t: 'Today', c: 'warn', k: 0 };
    return { t: fmt(d), c: '', k: k };
  }
  function opts(list, v) {
    return list.map(function (x) { var val = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(val) + '"' + (val === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
  }
  function head(t, sub, actions) { return '<div class="head"><div><h1>' + esc(t) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><div class="row">' + (actions || '') + '</div></div>'; }
  function api(method, path, body) {
    return fetch('/app/api' + path, {
      method: method, credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-uns': '1' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }).catch(function () { throw new Error('No connection. Try again when you are back online.'); }).then(function (r) {
      if (r.status === 401) { location.replace('/app/login.html'); throw new Error('auth'); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Failed'); return j; });
    });
  }
  function reload() {
    return api('GET', '/data').then(function (d) { L = d; U.live = d; window.UNS_DATA = d; applyFlags(); U.render(); });
  }
  function run(p, okMsg) {
    return p.then(function (r) { return reload().then(function () { if (okMsg) U.toast(esc(okMsg)); return r; }); })
      .catch(function (e) { if (e.message !== 'auth') U.toast('<b>Not saved.</b> ' + esc(e.message)); });
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  /* ---------- funnel logic ---------- */
  function funnelDay(l) { return l.funnel_start ? dd(L.today, l.funnel_start) + 1 : 1; }
  function sinceSent(l) { return l.sent_at ? dd(L.today, l.sent_at) : 0; }
  function engageNum(l) {
    if (l.stage !== 'sent' || !l.sent_at) return 0;
    var n = sinceSent(l); if (n < 1 || n > 5) return 0;
    var done = []; try { done = JSON.parse(l.engage_done || '[]'); } catch (e) { done = []; }
    return done.indexOf(n) >= 0 ? 0 : n;
  }
  function engageList(owner) { return L.leads.filter(function (l) { return (owner === 'All' || l.owner === owner) && engageNum(l) > 0; }); }
  function suggest(l) {
    if (l.stage === 'sent') return sinceSent(l) >= 6 ? 'Sent ' + sinceSent(l) + ' days ago, no accept. Nudge, or move to Away' : 'Request sent ' + sinceSent(l) + ' day(s) ago. Engage on their posts each day';
    if (l.stage === 'accepted') return 'Accepted. Send the first comment or DM';
    var d = funnelDay(l);
    if (l.stage === 'comment') return d <= 1 ? 'Leave a real comment on a recent post' : d === 2 ? 'Second comment or a thoughtful reaction' : 'Send the DM about one specific point from their content';
    if (l.stage === 'dm') return d >= 7 && l.tag !== 'quiet' ? 'Offer the free profile audit: Tabish names the one thing costing them most' : d >= 7 ? 'Quiet by day 7: move to Away unless something changed' : 'Keep it light. Offer the guide as a yes or no question';
    if (l.stage === 'guide') return d >= 7 && l.tag !== 'quiet' ? 'Offer the free profile audit: Tabish names the one thing costing them most' : d >= 7 ? 'Quiet by day 7: move to Away unless something changed' : 'Ask what they want to do on LinkedIn. Listen for the call';
    if (l.stage === 'audit') return 'Send the audit (Tabish\'s Loom or doc plus Mehak\'s one-section mockup). Book the call only after they react';
    if (l.stage === 'pitched') return 'Offer two specific times, then confirm the booking';
    if (l.stage === 'booked') return 'Prepare the call: one-page profile audit';
    return '';
  }
  function isOpen(l) { return l.stage !== 'away' && l.stage !== 'booked'; }
  function due(l) {
    if (!isOpen(l)) return false;
    if (l.stage === 'sent') return sinceSent(l) >= 6 && (!l.next_due || l.next_due <= L.today);
    return !l.next_due || l.next_due <= L.today;
  }
  function mine(l) { return l.owner === ME.name; }
  function queue(owner) {
    return L.leads.filter(function (l) { return due(l) && (owner === 'All' || l.owner === owner); }).sort(function (a, b) {
      var ra = a.tag === 'hot' ? 0 : a.tag === 'warm' ? 1 : 2, rb = b.tag === 'hot' ? 0 : b.tag === 'warm' ? 1 : 2;
      return ra - rb || String(a.next_due || '').localeCompare(String(b.next_due || ''));
    });
  }
  U.liveDue = function () { return queue(ME.name).length + engageList(ME.name).length; };
  U.watchDue = function () { return watchLeft(ME.name); };

  /* ---------- demo banner ---------- */
  U.banner = function () {
    if (S.door === 'back' && U.isLive(S.route)) return '';
    return '<div class="banner warn" style="margin-bottom:12px"><b>Demo screen.</b> The clients and numbers here are examples, not real. Nothing on this screen is saved to the server.</div>';
  };

  function cpb(l) { return l.profile_url ? '<button type="button" class="btn sm" data-act="lcopy" data-url="' + esc(l.profile_url) + '" aria-label="Copy LinkedIn link for ' + esc(l.name) + '">Copy link</button>' : ''; }
  function mates(l) { var c = String(l.company || '').trim().toLowerCase(); if (!c) return []; return L.leads.filter(function (x) { return x.id !== l.id && String(x.company || '').trim().toLowerCase() === c; }); }
  function co(l) {
    if (!l.company) return '';
    var n = mates(l).length + 1;
    return ' <span class="co" style="--h:' + hue(String(l.company).trim().toLowerCase()) + '" title="' + (n > 1 ? n + ' people at ' : '') + esc(l.company) + '"><i></i>' + esc(l.company) + (n > 1 ? ' <b>' + n + '</b>' : '') + '</span>';
  }
  function engageRow(l) {
    var n = engageNum(l); if (!n) return '';
    return '<div class="row eng" style="gap:8px;margin-top:10px;flex-wrap:wrap"><span class="pill">Engage ' + n + ' of 5</span><span class="sm">Comment on or engage with their latest post.</span>'
      + '<button type="button" class="btn pri sm" data-act="engdone" data-id="' + esc(l.id) + '" data-n="' + n + '">Done</button><button type="button" class="btn sm" data-act="engskip" data-id="' + esc(l.id) + '" data-n="' + n + '">Skip</button></div>';
  }
  function sameCo(l) {
    var m = mates(l); if (!m.length) return '';
    return '<div class="card stack" style="gap:8px;margin-top:12px"><div class="d">Same company: ' + esc(l.company) + '</div>' + m.map(function (x) {
      return '<div class="item" style="align-items:center">' + av('lead', x) + '<div class="mn" style="flex:1"><div class="t">' + esc(x.name) + '</div><div class="d">' + esc(lab(STAGES, x.stage)) + '</div></div><button type="button" class="btn sm" data-act="lopen" data-id="' + esc(x.id) + '">Open</button></div>';
    }).join('') + '</div>';
  }
  function drawer() {
    if (!S.ui.lopen) return '';
    var ol = L.leads.filter(function (l) { return l.id === S.ui.lopen; })[0]; if (!ol) return '';
    return '<div class="drawer-bg" data-act="lclose"></div><aside class="drawer" role="dialog" aria-label="Lead details"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h3>Lead</h3><button type="button" class="btn sm" data-act="lclose">Close (Esc)</button></div>' + leadCard(ol, { owner: true, drawer: true }) + sameCo(ol) + '</aside>';
  }

  /* ---------- profile photos ---------- */
  function hue(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function inits(n) { var p = String(n || '?').trim().split(/\s+/), a = p[0] ? p[0].charAt(0) : '?', b = p.length > 1 ? p[p.length - 1].charAt(0) : ''; return (a + b).toUpperCase(); }
  function touchy() { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); }
  function av(kind, o, btn) {
    var inner = o.avatar_v ? '<img class="avp" src="/app/api/avatar/' + kind + '/' + esc(o.id) + '?v=' + esc(o.avatar_v) + '" alt="" width="38" height="38" loading="lazy">' : '<span class="avp ini" style="--h:' + hue(o.name) + '" aria-hidden="true">' + esc(inits(o.name)) + '</span>';
    var tip = touchy() ? 'Tap to ' + (o.avatar_v ? 'change' : 'add') + ' the photo.' : 'Change photo. Choose a file, or press Ctrl+V to paste a screenshot.';
    return btn ? '<button type="button" class="avb' + (o.avatar_v ? '' : ' empty') + '" data-act="photo" data-kind="' + kind + '" data-id="' + esc(o.id) + '" title="' + tip + '" aria-label="' + (o.avatar_v ? 'Change' : 'Add') + ' photo for ' + esc(o.name || '') + '">' + inner + '</button>' : inner;
  }
  U.whoHtml = function () {
    return '<div class="row" style="gap:10px;align-items:center;flex-wrap:nowrap">' + av('user', { id: ME.id, name: ME.name, avatar_v: ME.avatar_v }, true)
      + '<div style="min-width:0"><div style="color:#F3F5FA;font-weight:600;overflow-wrap:anywhere">' + esc(ME.name) + '</div><div>Signed in' + (ME.is_dev ? ', admin' : '') + '</div></div></div>';
  };

  /* ---------- lead card ---------- */
  function leadCard(l, opt) {
    opt = opt || {};
    var d = funnelDay(l), w = when(l.next_due), sug = suggest(l);
    var evs = L.events.filter(function (e) { return e.lead_id === l.id; }).slice(0, 8);
    var stageVal = l.stage;
    var stageOpts = STAGES.filter(function (s) { return s[0] !== 'away' && (s[0] !== 'pitched' || l.stage === 'pitched'); }).map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === stageVal ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('')
      + AWAY.map(function (r) { return '<option value="away|' + r + '"' + (l.stage === 'away' && l.away_reason === r ? ' selected' : '') + '>Away: ' + r + '</option>'; }).join('');
    var nm = l.profile_url ? '<a href="' + esc(l.profile_url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.name) + '</a>' : esc(l.name);
    return '<div class="item" style="flex-direction:column;align-items:stretch" data-lead="' + esc(l.id) + '">'
      + '<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div class="row" style="gap:12px;flex:1 1 220px;min-width:0;align-items:flex-start">' + av('lead', l, true) + '<div class="mn" style="flex:1;min-width:0"><div class="t">' + nm + co(l) + '</div>'
      + '<div class="d">' + (l.stage === 'away' ? 'Away: ' + esc(l.away_reason || '') : l.stage === 'sent' ? esc(sug) : 'Day ' + d + '. ' + esc(sug)) + '</div></div></div>'
      + '<div class="row" style="gap:6px;flex-wrap:wrap">' + pill(lab(TAGS, l.tag), l.tag === 'hot' ? 'warn' : l.tag === 'warm' ? '' : 'mut') + pill(lab(STAGES, l.stage)) + pill(l.owner) + (l.list === 'any' ? pill('Any industry' + (l.industry ? ': ' + l.industry : ''), 'mut') : '') + (l.stage !== 'away' && l.stage !== 'sent' ? '<span class="pill ' + (w.c || 'mut') + '">' + esc(w.t) + '</span>' : '') + '</div></div>'
      + engageRow(l)
      + '<div class="row" style="gap:8px;margin-top:10px">'
      + (isOpen(l) && (l.stage !== 'sent' || sinceSent(l) >= 6) ? '<button type="button" class="btn pri sm" data-act="ldone" data-id="' + esc(l.id) + '">Did it</button><button type="button" class="btn sm" data-act="lsnooze" data-id="' + esc(l.id) + '">Tomorrow</button>' : '')
      + cpb(l) + xb(l) + (opt.drawer ? '' : '<button type="button" class="btn sm" data-act="lopen" data-id="' + esc(l.id) + '">Open</button>')
      + (!l.avatar_v && l.profile_url ? '<button type="button" class="btn sm" data-act="pfetch" data-kind="lead" data-id="' + esc(l.id) + '">Fetch photo</button>' : '')
      + '<label class="sm mut row" style="gap:6px">Stage<select data-chg="lstage" data-id="' + esc(l.id) + '">' + stageOpts + '</select></label>'
      + '<label class="sm mut row" style="gap:6px">Signal<select data-chg="ltag" data-id="' + esc(l.id) + '">' + opts(TAGS, l.tag) + '</select></label>'
      + (opt.owner ? '<label class="sm mut row" style="gap:6px">Owner<select data-chg="lowner" data-id="' + esc(l.id) + '">' + opts(OWN, l.owner) + '</select></label><label class="sm mut row" style="gap:6px">List<select data-chg="llist" data-id="' + esc(l.id) + '">' + opts(LISTS, l.list || 'icp') + '</select></label>' : '') + '</div>'
      + (opt.drawer ? detailsForm(l) : '')
      + '<details' + (opt.drawer ? ' open' : '') + ' style="margin-top:8px"><summary class="sm mut" style="cursor:pointer">Notes and history</summary><div class="stack" style="gap:8px;margin-top:8px">'
      + (l.why_fit ? '<div class="sm"><b>Why they fit:</b> ' + esc(l.why_fit) + '</div>' : '')
      + '<div class="row"><input id="ln_' + esc(l.id) + '" placeholder="Add a note about the conversation" style="flex:1;min-width:200px"><button type="button" class="btn sm" data-act="lnote" data-id="' + esc(l.id) + '">Save note</button></div>'
      + (evs.length ? '<div class="list">' + evs.map(function (e) { return '<div class="sm"><span class="mut">' + esc((e.at || '').slice(0, 10)) + ' ' + esc(e.by || '') + ':</span> ' + esc(e.detail || '') + '</div>'; }).join('') + '</div>' : '')
      + '</div></details></div>';
  }

  function detailsForm(l) {
    var id = esc(l.id);
    return '<div class="card" style="margin-top:10px"><h3 style="margin-bottom:8px">Details</h3><div class="stack" style="gap:10px">'
      + '<div class="row"><label class="f" style="flex:1;min-width:160px">Name<input id="ld_name_' + id + '" value="' + esc(l.name || '') + '" maxlength="120"></label>'
      + '<label class="f" style="flex:1;min-width:160px">Company<input id="ld_co_' + id + '" value="' + esc(l.company || '') + '" maxlength="120"></label></div>'
      + '<label class="f">LinkedIn link<input id="ld_url_' + id + '" value="' + esc(l.profile_url || '') + '" placeholder="https://www.linkedin.com/in/..." inputmode="url" maxlength="300"></label>'
      + '<label class="f">X link<input id="ld_x_' + id + '" value="' + esc(l.x_url || '') + '" placeholder="https://x.com/name" inputmode="url" maxlength="200"></label>'
      + '<label class="f">Industry<input id="ld_ind_' + id + '" value="' + esc(l.industry || '') + '" maxlength="80"></label>'
      + '<div class="row"><button type="button" class="btn pri sm" data-act="ldetsave" data-id="' + id + '">Save details</button></div></div></div>';
  }

  /* ---------- FOLLOW-UPS ---------- */
  U.screens.followups = function () {
    var who = S.ui.fuWho || ME.name, fl = S.ui.fuList || 'all', q = queue(who).filter(function (l) { return fl === 'all' || (l.list || 'icp') === fl; });
    var shown = fl === 'all' ? q.filter(function (l) { return (l.list || 'icp') === 'icp'; }).slice(0, 5).concat(q.filter(function (l) { return l.list === 'any'; }).slice(0, 5)) : q.slice(0, 5);
    var h = head('Follow-ups', 'Your next actions today, hot signals first. Five at a time. Do them, then press Did it.',
      '<label class="sm row" style="gap:6px">Whose list<select data-chg="fuwho">' + opts([ME.name].concat(L.people.filter(function (p) { return p !== ME.name; })).concat('All'), who) + '</select></label><label class="sm row" style="gap:6px">Lead list<select data-chg="fulist">' + opts([['all', 'Both'], ['icp', 'ICP'], ['any', 'Any industry']], fl) + '</select></label>');
    h += '<div class="banner">You send every message yourself in LinkedIn. This app never sends for you. Wording follows the approved templates, and a new template needs all three founders.</div>';
    var eg = engageList(who);
    h += '<section class="stack" style="gap:8px"><div class="row" style="justify-content:space-between"><h3>Engage</h3><span class="sm mut">' + eg.length + ' today. Does not use the five slots.</span></div>'
      + '<div class="sm mut">Daily for 5 days after a connection request: comment on or engage with their latest post.</div>'
      + (eg.length ? '<div class="list">' + eg.map(function (l) { return leadCard(l, {}); }).join('') + '</div>' : '<div class="empty">Nobody to engage with today.</div>') + '</section>';
    h += '<h3>Today</h3>';
    h += shown.length ? '<div class="list">' + shown.map(function (l) { return leadCard(l, {}); }).join('') + '</div>' : '<div class="empty">Nothing due for ' + esc(who) + '. Add leads in Leads, or take the day for comments.</div>';
    if (q.length > shown.length) h += '<div class="sm mut">' + (q.length - shown.length) + ' more due. They show when you finish these. Five at a time per list.</div>';
    return '<div class="stack">' + h + drawer() + '</div>';
  };

  /* ---------- LEADS ---------- */
  function addLeadForm(lf) {
    return '<div class="card"><h3 style="margin-bottom:8px">Add a lead</h3><div class="stack" style="gap:10px"><div class="row">'
        + '<label class="f" style="flex:1;min-width:180px">Name<input id="a_name"></label><label class="f" style="flex:1;min-width:180px">Company<input id="a_co"></label>'
        + '<label class="f">Owner<select id="a_own">' + opts(OWN, ME.name) + '</select></label></div>'
        + '<div class="row"><label class="f">List<select id="a_list">' + opts(LISTS, lf === 'any' ? 'any' : 'icp') + '</select></label><label class="f" style="flex:1;min-width:160px">Industry (any industry list)<input id="a_ind" maxlength="80"></label></div>'
        + '<label class="f">Where do they start?<select id="a_start"><option value="comment">1st degree: start at First comment</option><option value="sent">Cold: connection request sent</option></select></label>'
        + '<label class="f">LinkedIn profile link<input id="a_url" placeholder="https://www.linkedin.com/in/..."></label>'
        + '<label class="f">X link (optional)<input id="a_x" placeholder="https://x.com/..."></label>'
        + '<label class="f">Why they fit (active, personal brand matters, weak profile, location)<input id="a_why"></label>'
        + '<div class="row"><button type="button" class="btn pri" data-act="laddsave">Add lead</button><button type="button" class="btn" data-act="laddtoggle">Cancel</button></div></div></div>';
  }
  /* Phone Leads (1.4.0): approved mobile layout. Search, Due / All / Away, owner chips, groups by urgency. */
  var deskLeads;
  U.phoneLeads = function () {
    var lf = S.ui.llist || 'icp';
    var pv = S.ui.pview || 'due', of = S.ui.lown || 'All', q = String(S.ui.lq || '').trim().toLowerCase();
    var h = '<div class="plh"><h1>' + (lf === 'watch' ? 'Watchlist' : 'Leads') + '</h1><button type="button" class="btn pri" data-act="laddtoggle">' + (S.ui.ladd ? 'Cancel' : 'Add lead') + '</button></div>';
    if (S.ui.ladd) h += addLeadForm(lf);
    var lists = [['icp', 'ICP'], ['any', 'Any industry'], ['all', 'Both'], ['watch', 'Watchlist']];
    h += '<div class="psteps" role="group" aria-label="Lead list">' + lists.map(function (v) { return '<button type="button" class="pchip' + (lf === v[0] ? ' on' : '') + '" data-act="llistsel" data-id="' + v[0] + '" aria-pressed="' + (lf === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div>';
    if (lf === 'watch') return '<div class="phone-leads">' + h + phoneWatchBody() + '</div>';
    h += '<input class="psearch" type="search" data-chg="lq" value="' + esc(S.ui.lq || '') + '" placeholder="Search name or company" aria-label="Search leads" enterkeyhint="search">';
    h += '<div class="psteps" role="group" aria-label="Show">' + [['due', 'Due'], ['all', 'All'], ['away', 'Away']].map(function (v) { return '<button type="button" class="pchip' + (pv === v[0] ? ' on' : '') + '" data-act="pview" data-id="' + v[0] + '" aria-pressed="' + (pv === v[0]) + '">' + v[1] + '</button>'; }).join('')
      + '<span class="psep"></span>' + [['All', 'Everyone']].concat([[ME.name, 'Me']]).concat(OWN.filter(function (o) { return o !== ME.name; }).map(function (o) { return [o, o]; })).map(function (v) { return '<button type="button" class="pchip' + (of === v[0] ? ' on' : '') + '" data-act="pown" data-id="' + esc(v[0]) + '" aria-pressed="' + (of === v[0]) + '">' + esc(v[1]) + '</button>'; }).join('') + '</div>';
    var ls = L.leads.filter(function (l) {
      if (of !== 'All' && l.owner !== of) return false;
      if (lf !== 'all' && (l.list || 'icp') !== lf) return false;
      if (q && (String(l.name) + ' ' + String(l.company || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    function row(l) {
      var w = when(l.next_due);
      return '<button type="button" class="pitem" data-act="lopen" data-id="' + esc(l.id) + '">' + av('lead', l) + '<span class="mn"><b>' + esc(l.name) + '</b><small>' + esc((l.company ? l.company + ' · ' : '') + lab(STAGES, l.stage)) + '</small></span>' + (l.stage === 'away' ? pill('Away', 'mut') : pill(w.t, w.c)) + '</button>';
    }
    function grp(t, a, c) { return a.length ? '<div class="pgh' + (c ? ' ' + c : '') + '"><b>' + t + '</b><i>' + a.length + '</i></div><div class="pcard">' + a.map(row).join('') + '</div>' : ''; }
    var open = ls.filter(isOpen).sort(function (a, b) { return String(a.next_due || '9999').localeCompare(String(b.next_due || '9999')); }), body = '';
    if (pv === 'away') body = grp('Away', ls.filter(function (l) { return l.stage === 'away'; }));
    else if (pv === 'all') body = STAGES.filter(function (s) { return s[0] !== 'away'; }).map(function (s) { return grp(s[1], open.filter(function (l) { return l.stage === s[0]; })); }).join('');
    else body = grp('Overdue', open.filter(function (l) { return l.next_due && l.next_due < L.today; }), 'bad') + grp('Due today', open.filter(function (l) { return l.next_due === L.today; })) + grp('Coming up', open.filter(function (l) { return l.next_due && l.next_due > L.today; })) + grp('No date set', open.filter(function (l) { return !l.next_due; }));
    return '<div class="phone-leads">' + h + (body || '<div class="pcard pempty">' + (pv === 'away' ? 'Nobody is parked or dropped.' : q ? 'No leads match.' : 'Nothing here.') + '</div>') + '</div>' + drawer();
  };
  U.screens.leads = function () {
    if (window.matchMedia && matchMedia('(max-width:760px)').matches) return U.phoneLeads();
    var view = S.ui.lview || 'board', of = S.ui.lown || 'All';
    var lf = S.ui.llist || 'icp';
    var ls = L.leads.filter(function (l) { return (of === 'All' || l.owner === of) && (lf === 'all' || (l.list || 'icp') === lf); });
    if (lf === 'watch') {
      var wt = '<div class="row"><div class="seg" role="group" aria-label="Lead list">' + [['icp', 'ICP'], ['any', 'Any industry'], ['all', 'Both'], ['watch', 'Watchlist']].map(function (v) { return '<button type="button" data-act="llistsel" data-id="' + v[0] + '" aria-pressed="' + (lf === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
      return '<div class="stack"><div class="head"><div><h1>Leads</h1><div class="sub">Watchlist: people we comment on every day to stay visible. Not leads until you press Make lead.</div></div></div>' + wt + watchBody() + '</div>';
    }
    var h = head('Leads', 'The warm funnel: connect, comment, DM, guide, pitch the call. One owner per lead.',
      '<button type="button" class="btn pri" data-act="laddtoggle">Add lead</button>');
    if (S.ui.ladd) h += addLeadForm(lf);
    h += '<div class="row"><div class="seg" role="group" aria-label="Lead list">' + [['icp', 'ICP'], ['any', 'Any industry'], ['all', 'Both'], ['watch', 'Watchlist']].map(function (v) { return '<button type="button" data-act="llistsel" data-id="' + v[0] + '" aria-pressed="' + (lf === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div></div>';
    if (lf === 'any') h += '<div class="banner">Any industry: people who are not our ICP but can afford the service. Same steps as the ICP list, kept apart so it can win the first client.</div>';
    h += '<div class="row"><div class="seg" role="group">' + [['board', 'Board'], ['all', 'All'], ['away', 'Away']].map(function (v) { return '<button type="button" data-act="lview" data-id="' + v[0] + '" aria-pressed="' + (view === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div>'
      + '<label class="sm row" style="gap:6px">Owner<select data-chg="lown">' + opts(['All'].concat(OWN), of) + '</select></label></div>';
    if (view === 'board') {
      h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));align-items:start">' + STAGES.filter(function (s) { return s[0] !== 'away' && (s[0] !== 'pitched' || ls.some(function (l) { return l.stage === 'pitched'; })); }).map(function (s) {
        var col = ls.filter(function (l) { return l.stage === s[0]; });
        return '<div class="card tight"><div class="row" style="justify-content:space-between"><b>' + s[1] + '</b>' + pill(String(col.length), 'mut') + '</div><div class="list" style="margin-top:8px">'
          + (col.length ? col.map(function (l) { return '<div class="item" style="padding:8px;align-items:center;gap:10px">' + av('lead', l) + '<div class="mn"><div class="t">' + esc(l.name) + '</div><div class="d">' + co(l) + ' ' + esc(l.owner) + (l.stage === 'sent' ? '. Sent ' + sinceSent(l) + 'd ago' : '. Day ' + funnelDay(l)) + '</div></div><div class="sd">' + pill(lab(TAGS, l.tag), l.tag === 'hot' ? 'warn' : l.tag === 'warm' ? '' : 'mut') + cpb(l) + xb(l) + '<button type="button" class="btn sm" data-act="lopen" data-id="' + esc(l.id) + '">Open</button></div></div>'; }).join('') : '<div class="empty">None</div>') + '</div></div>';
      }).join('') + '</div>';
    } else if (view === 'all') {
      var open = ls.filter(function (l) { return l.stage !== 'away'; });
      h += open.length ? '<div class="list">' + open.map(function (l) { return leadCard(l, { owner: true }); }).join('') + '</div>' : '<div class="empty">No leads yet. Add the first one.</div>';
    } else {
      var aw = ls.filter(function (l) { return l.stage === 'away'; });
      h += aw.length ? '<div class="list">' + aw.map(function (l) { return leadCard(l, { owner: true }); }).join('') + '</div>' : '<div class="empty">Nobody is parked or dropped.</div>';
    }
    return '<div class="stack">' + h + drawer() + '</div>';
  };

  /* ---------- TASKS (design ported from the Unscrollable Tasks artifact) ---------- */
  var T_AREAS = ['Setup', 'Brand', 'Sales', 'Content', 'Systems', 'Delivery', 'Other'];
  var T_PRI = [['high', 'High'], ['normal', 'Normal'], ['low', 'Low']];
  function tchip(t, c) { return '<span class="tk-chip' + (c ? ' ' + c : '') + '">' + esc(t) + '</span>'; }
  function tlate(t) { return t.status !== 'done' && t.due && t.due < L.today; }
  function tsort(a, b) {
    if (a.due !== b.due) { if (!a.due) return 1; if (!b.due) return -1; return a.due < b.due ? -1 : 1; }
    var P = { high: 0, normal: 1, low: 2 };
    return (P[a.priority] - P[b.priority]) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
  }
  function tvisible(t) {
    var who = S.ui.tkWho || 'all', area = S.ui.tkArea || '';
    if (area && t.area !== area) return false;
    if (who === 'me' && t.owner !== ME.name && t.owner !== 'Everyone') return false;
    if (OWN.indexOf(who) >= 0 && t.owner !== who && t.owner !== 'Everyone') return false;
    return true;
  }
  function tcard(t) {
    var open = S.ui.tkOpen && S.ui.tkOpen[t.id], chk = t.checks || [], cm = t.comments || [];
    var chips = tchip(t.owner, t.owner === ME.name || t.owner === 'Everyone' ? 'me' : '');
    if (t.status !== 'todo' && t.status !== 'done') chips += tchip(lab(T_ST, t.status), t.status === 'blocked' ? 'late' : '');
    chips += tchip(t.area || 'Other');
    if (t.due) chips += tchip((tlate(t) ? 'Late ' : 'Due ') + fmt(t.due), tlate(t) ? 'late' : '');
    if (t.priority === 'high') chips += tchip('High', 'hi');
    if (chk.length) { var dn = chk.filter(function (c) { return c.d; }).length; chips += tchip(dn + '/' + chk.length, dn === chk.length ? 'ok' : ''); }
    if (cm.length) chips += tchip(cm.length + (cm.length === 1 ? ' note' : ' notes'));
    var h = '<article class="tk" data-status="' + esc(t.status) + '" data-late="' + (tlate(t) ? 1 : 0) + '"><div class="tk-h">'
      + '<button type="button" class="tk-ck" data-act="tkdone" data-id="' + esc(t.id) + '" aria-pressed="' + (t.status === 'done') + '" aria-label="Mark done"></button>'
      + '<button type="button" class="tk-m" data-act="tkopen" data-id="' + esc(t.id) + '" aria-expanded="' + (!!open) + '"><span class="tk-t">' + esc(t.title) + '</span><span class="tk-chips">' + chips + '</span></button></div>';
    if (open) {
      h += '<div class="tk-b"><label class="f">Title<input data-chg="tktitle" data-id="' + esc(t.id) + '" value="' + esc(t.title) + '" maxlength="200"></label>'
        + '<div class="tk-fields"><label class="f">Status<select data-chg="tkstatus" data-id="' + esc(t.id) + '">' + opts(T_ST, t.status) + '</select></label>'
        + '<label class="f">Owner<select data-chg="tkowner" data-id="' + esc(t.id) + '">' + opts(OWN.concat('Everyone'), t.owner) + '</select></label>'
        + '<label class="f">Priority<select data-chg="tkpri" data-id="' + esc(t.id) + '">' + opts(T_PRI, t.priority) + '</select></label>'
        + '<label class="f">Area<select data-chg="tkarea" data-id="' + esc(t.id) + '">' + opts(T_AREAS, t.area || 'Other') + '</select></label>'
        + '<label class="f">Due<input type="date" value="' + esc(t.due || '') + '" data-chg="tkdue" data-id="' + esc(t.id) + '"></label></div>'
        + '<label class="f">Details<textarea data-chg="tknotes" data-id="' + esc(t.id) + '" placeholder="Details, links, what done looks like." rows="3">' + esc(t.notes || '') + '</textarea></label>'
        + '<div class="tk-sub"><h2>Checklist</h2>' + chk.map(function (c, i) { return '<div class="tk-item' + (c.d ? ' dn' : '') + '"><input type="checkbox" data-chg="tkcheck" data-id="' + esc(t.id) + '" data-i="' + i + '"' + (c.d ? ' checked' : '') + '><span>' + esc(c.t) + '</span><button type="button" class="btn sm bad" data-act="tkchkdel" data-id="' + esc(t.id) + '" data-i="' + i + '" aria-label="Remove step">x</button></div>'; }).join('')
        + '<input id="tkc_' + esc(t.id) + '" data-enter="tkchkadd" data-id="' + esc(t.id) + '" placeholder="Add a step, press Enter" maxlength="200"></div>'
        + '<div class="tk-sub"><h2>Comments</h2>' + cm.map(function (c) { return '<div class="tk-cm"><span class="m">' + esc((c.at || '').slice(0, 10)) + ' · ' + esc(c.by || '') + '</span><p>' + esc(c.t) + '</p></div>'; }).join('')
        + '<div class="tk-mini"><input id="tkm_' + esc(t.id) + '" data-enter="tkpost" data-id="' + esc(t.id) + '" placeholder="Add a comment" maxlength="500"><button type="button" class="btn" data-act="tkpost" data-id="' + esc(t.id) + '">Post</button></div></div>'
        + (ME.is_dev ? '<div><button type="button" class="btn bad" data-act="tdelete" data-id="' + esc(t.id) + '">Delete task</button></div>' : '')
        + '</div>';
    }
    return h + '</article>';
  }
  /* Phone Tasks (1.4.0): same task cards and editor, grouped by urgency, chips instead of dropdowns. */
  U.phoneTasks = function () {
    var who = S.ui.tkWho || 'all', showDone = S.ui.tkDone === 'show';
    var ts = L.tasks.filter(tvisible);
    var h = '<div class="plh"><h1>Tasks</h1></div>';
    h += '<div class="pcard ptkadd"><input id="tk_q" data-enter="tkadd" placeholder="What needs doing?" maxlength="200" aria-label="New task title"><div class="row" style="gap:8px;flex-wrap:nowrap"><select id="tk_o" aria-label="Owner">' + opts(OWN.concat('Everyone'), ME.name) + '</select><button type="button" class="btn pri" data-act="tkadd">Add task</button></div></div>';
    var whos = [['all', 'Everyone'], ['me', 'Mine']].concat(OWN.filter(function (o) { return o !== ME.name; }).map(function (o) { return [o, o]; }));
    h += '<div class="psteps" role="group" aria-label="Whose tasks">' + whos.map(function (v) { return '<button type="button" class="pchip' + (who === v[0] ? ' on' : '') + '" data-act="ptkwho" data-id="' + esc(v[0]) + '" aria-pressed="' + (who === v[0]) + '">' + esc(v[1]) + '</button>'; }).join('')
      + '<span class="psep"></span><button type="button" class="pchip' + (showDone ? ' on' : '') + '" data-act="ptkdone" aria-pressed="' + showDone + '">Show done</button></div>';
    var open = ts.filter(function (t) { return t.status !== 'done'; }).sort(tsort);
    function grp(t, a, c) { return a.length ? '<div class="pgh' + (c ? ' ' + c : '') + '"><b>' + t + '</b><i>' + a.length + '</i></div><section class="tk-group">' + a.map(tcard).join('') + '</section>' : ''; }
    var late = open.filter(tlate), td = open.filter(function (t) { return t.due === L.today; }), rest = open.filter(function (t) { return !tlate(t) && t.due !== L.today; });
    var body = grp('Overdue', late, 'bad') + grp('Due today', td)
      + grp('Doing', rest.filter(function (t) { return t.status === 'doing'; })) + grp('To do', rest.filter(function (t) { return t.status === 'todo'; })) + grp('Blocked', rest.filter(function (t) { return t.status === 'blocked'; }), 'bad');
    if (showDone) body += grp('Done', ts.filter(function (t) { return t.status === 'done'; }).sort(tsort));
    return '<div class="phone-leads">' + h + (body || '<div class="pcard pempty">Nothing open here.</div>') + '</div>';
  };
  U.screens.tasks = function () {
    if (window.matchMedia && matchMedia('(max-width:760px)').matches && (S.ui.tkView || 'list') === 'list') return U.phoneTasks();
    var view = S.ui.tkView || 'list', who = S.ui.tkWho || 'all', area = S.ui.tkArea || '', showDone = S.ui.tkDone === 'show';
    var ts = L.tasks.filter(tvisible), out = '';
    if (view === 'list') {
      ['doing', 'todo', 'blocked', 'done'].forEach(function (st) {
        if (st === 'done' && !showDone) return;
        var g = ts.filter(function (t) { return t.status === st; }).sort(tsort); if (!g.length) return;
        out += '<section class="tk-group"><h2>' + esc(lab(T_ST, st)) + ' ' + g.length + '</h2>' + g.map(tcard).join('') + '</section>';
      });
      var hid = !showDone ? ts.filter(function (t) { return t.status === 'done'; }).length : 0;
      if (hid) out += '<p class="sm mut">' + hid + ' done task' + (hid === 1 ? '' : 's') + ' hidden. Change Done tasks to Show.</p>';
      if (!out) out = '<p class="empty">' + (ts.length ? 'Nothing open here. Everything in this view is done.' : 'No tasks yet. Add the first one above.') + '</p>';
    } else {
      out = '<div class="tk-board">' + T_ST.map(function (st) {
        var g = ts.filter(function (t) { return t.status === st[0]; }).sort(tsort);
        return '<section class="tk-col"><h2>' + esc(st[1]) + ' ' + g.length + '</h2>' + g.map(tcard).join('') + '</section>';
      }).join('') + '</div>';
    }
    return '<div class="stack"><div class="head"><div><h1>Tasks</h1><div class="sub">One shared to-do list for Tabish, Ali and Mehak. Add a task, give it an owner and a date, move it across as it gets done.</div></div></div>'
      + '<section class="card"><div class="tk-add"><input id="tk_q" data-enter="tkadd" placeholder="New task, then press Enter" maxlength="200" aria-label="New task title"><select id="tk_o" aria-label="Owner">' + opts(OWN.concat('Everyone'), ME.name) + '</select><button type="button" class="btn pri" data-act="tkadd">Add</button></div></section>'
      + '<section class="card stack" style="gap:10px"><div class="seg tk-seg" role="group"><button type="button" data-act="tkview" data-id="list" aria-pressed="' + (view === 'list') + '">List</button><button type="button" data-act="tkview" data-id="board" aria-pressed="' + (view === 'board') + '">Board</button></div>'
      + '<div class="row"><label class="f">Whose<select data-chg="tkwho">' + opts([['all', 'Everyone'], ['me', 'Mine']].concat(OWN.map(function (o) { return [o, o]; })), who) + '</select></label>'
      + '<label class="f">Area<select data-chg="tkfarea">' + opts([['', 'All areas']].concat(T_AREAS.map(function (a) { return [a, a]; })), area) + '</select></label>'
      + '<label class="f">Done tasks<select data-chg="tkdoneview">' + opts([['hide', 'Hide'], ['show', 'Show']], showDone ? 'show' : 'hide') + '</select></label></div></section>'
      + out + '</div>';
  };

  /* ---------- TODAY (replaces Home and Follow-ups) ---------- */
  function isoMs(iso) { var s = String(iso || ''); if (!s) return NaN; if (s.indexOf('T') < 0) s = s.replace(' ', 'T'); if (!/Z|[+-]\d\d:?\d\d$/.test(s)) s += 'Z'; return Date.parse(s); }
  function dayOf(iso) { var ms = isoMs(iso); if (isNaN(ms)) return ''; try { return new Date(ms).toLocaleDateString('en-CA', { timeZone: L.tz || 'Asia/Karachi' }); } catch (e) { return ''; } }
  function doneToday(l) { return dayOf(l.last_action_at) === L.today; }
  function ago(iso) { var m = Math.round((Date.now() - isoMs(iso)) / 60000); if (isNaN(m)) return ''; if (m < 60) return Math.max(m, 1) + ' min ago'; if (m < 1440) return Math.round(m / 60) + ' h ago'; return Math.round(m / 1440) + ' d ago'; }
  function tRow(l, done) {
    var w = when(l.next_due), cls = w.k < 0 ? 'warn' : 'mut';
    return '<div class="item" style="align-items:center;flex-wrap:wrap' + (done ? ';opacity:.7' : '') + '">' + av('lead', l) + '<div class="mn" style="flex:1 1 200px"><div class="t">' + esc(l.name) + co(l) + '</div><div class="d">' + esc(suggest(l)) + '</div></div>'
      + '<div class="row" style="gap:6px;flex-wrap:wrap">' + pill(lab(STAGES, l.stage), 'mut') + (done ? pill('Done', 'good') : '<span class="pill ' + cls + '">' + esc(w.t) + '</span>')
      + cpb(l) + '<button type="button" class="btn sm" data-act="lopen" data-id="' + esc(l.id) + '">Open</button>' + (done ? '' : '<button type="button" class="btn pri sm" data-act="ldone" data-id="' + esc(l.id) + '">Did it</button>') + '</div></div>';
  }
  function fiveCard(title, listKey, who, q) {
    var mine5 = q.filter(function (l) { return (l.list || 'icp') === listKey; }), shown = mine5.slice(0, 5);
    var dn = L.leads.filter(function (l) { return (l.list || 'icp') === listKey && (who === 'All' || l.owner === who) && l.stage !== 'sent' && doneToday(l) && !due(l); }).slice(0, 5);
    return '<section class="card stack" style="gap:10px" aria-label="Your five, ' + esc(title) + '"><div class="row" style="justify-content:space-between;gap:8px"><div class="row" style="gap:8px"><h2>Your five</h2>' + pill(title, listKey === 'icp' ? '' : 'mut') + '</div><span class="sm mut">' + dn.length + ' done today' + (mine5.length > 5 ? '. ' + (mine5.length - 5) + ' more waiting' : '') + '</span></div>'
      + (shown.length ? '<div class="list">' + shown.map(function (l) { return tRow(l, false); }).join('') + '</div>' : '<div class="empty">Nothing due in this list.</div>')
      + (dn.length ? '<div class="list" style="margin-top:4px">' + dn.map(function (l) { return tRow(l, true); }).join('') + '</div>' : '') + '</section>';
  }
  /* ---------- what's new ---------- */
  var REL = window.UNS_RELEASES || [];
  function relUnseen() { return REL.length && ME.seen_release !== REL[0].v; }
  function relSeen() { if (!REL.length || ME.seen_release === REL[0].v) return; ME.seen_release = REL[0].v; api('POST', '/me/seen', { v: REL[0].v }).catch(function () {}); }
  function relBanner() {
    if (!relUnseen()) return '';
    var r = REL[0];
    return '<div class="banner" style="margin-bottom:14px"><b>New in ' + esc(r.v) + ': ' + esc(r.title) + '.</b> ' + esc(r.friction) + ' <button type="button" class="btn sm" data-act="nav" data-id="whatsnew">See what changed</button> <button type="button" class="btn sm" data-act="relseen">Got it</button></div>';
  }
  U.screens.whatsnew = function () {
    relSeen();
    var h = '<div class="head"><div><div class="eyebrow">Updates</div><h1>What\'s new</h1><div class="sub">Every change to this app, in plain words, newest first.</div></div></div><div class="stack">';
    REL.forEach(function (r, i) {
      h += '<div class="card"><div class="row" style="justify-content:space-between;gap:8px;align-items:baseline"><h3 style="margin:0">' + esc(r.title) + '</h3><span class="sm">v' + esc(r.v) + ' &middot; ' + esc(r.date) + '</span></div><div class="stack" style="gap:8px;margin-top:10px">'
        + '<div><b>What it is.</b> ' + esc(r.what) + '</div><div><b>What it does.</b> ' + esc(r.does) + '</div><div><b>How it cuts friction.</b> ' + esc(r.friction) + '</div><div class="sm">Where: ' + esc(r.where) + '</div></div></div>';
    });
    return h + '</div>';
  };
  U.screens.home = function () {
    var who = S.ui.fuWho || ME.name, q = queue(who);
    var tk = L.tasks.filter(function (t) { return t.status !== 'done' && (who === 'All' || t.owner === who || t.owner === 'Everyone'); });
    var tkDue = tk.filter(function (t) { return t.due && t.due <= L.today; }), tkLate = tk.filter(tlate);
    var lateL = q.filter(function (l) { return l.next_due && l.next_due < L.today; });
    var eg = engageList(who), booked = L.leads.filter(function (l) { return l.stage === 'booked'; }), blocked = L.tasks.filter(function (t) { return t.status === 'blocked'; });
    var wLeft = watchLeft(who), wTeam = OWN.reduce(function (n, o) { return n + watchLeft(o); }, 0);
    var dueN = q.length + tkDue.length, lateN = lateL.length + tkLate.length;
    var dateTxt = new Date(L.today + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    var seg = [[ME.name, 'Me']].concat(OWN.filter(function (o) { return o !== ME.name; }).map(function (o) { return [o, o]; })).concat([['All', 'All']]);
    var h = relBanner() + '<div class="head"><div><div class="eyebrow">' + esc(dateTxt) + '</div><h1>Today</h1><div class="sub">' + dueN + ' thing' + (dueN === 1 ? '' : 's') + ' due, ' + lateN + ' overdue. The Watchlist still needs ' + wTeam + ' comment' + (wTeam === 1 ? '' : 's') + ' from the team.</div></div>'
      + '<div class="row"><div class="seg" role="group" aria-label="Whose list">' + seg.map(function (s) { return '<button type="button" data-act="twho" data-id="' + esc(s[0]) + '" aria-pressed="' + (who === s[0]) + '">' + esc(s[1]) + '</button>'; }).join('') + '</div><button type="button" class="btn pri" data-act="tgo" data-id="leads:add">Add lead</button></div></div>';
    var tiles = [['Due today', dueN, (q.length ? q.length + ' lead' + (q.length === 1 ? '' : 's') : 'No leads') + (tkDue.length ? ', ' + tkDue.length + ' task' + (tkDue.length === 1 ? '' : 's') : ''), '', 'home'],
      ['Overdue', lateN, lateN ? 'Oldest first below' : 'All clear', lateN ? 'late' : '', 'home'], ['Engage', eg.length, 'Outside the five', '', 'home'],
      ['Watchlist left', wLeft, 'Team ' + wTeam, '', 'leads:watch'], ['Calls booked', booked.length, 'All of us', booked.length ? 'ok' : '', 'leads'], ['Blocked', blocked.length, 'Open Tasks', blocked.length ? 'late' : '', 'tasks']];
    h += '<div class="tday-tiles">' + tiles.map(function (t) { return '<button type="button" class="card tile tl ' + t[3] + '" data-act="tgo" data-id="' + t[4] + '"><span class="eyebrow">' + t[0] + '</span><b class="tn">' + t[1] + '</b><span>' + esc(t[2]) + '</span></button>'; }).join('') + '</div>';
    var left = fiveCard('ICP list', 'icp', who, q) + fiveCard('Any industry', 'any', who, q)
      + '<section class="card stack" style="gap:10px" aria-label="Engage"><div class="row" style="justify-content:space-between;gap:8px"><div class="row" style="gap:8px"><h2>Engage</h2>' + pill('Outside the five', 'warn') + '</div><span class="sm mut">Comment or like on their latest post</span></div>'
      + (eg.length ? '<div class="list">' + eg.map(function (l) {
        var n = engageNum(l);
        return '<div class="item" style="align-items:center;flex-wrap:wrap">' + av('lead', l) + '<div class="mn" style="flex:1 1 180px"><div class="t">' + esc(l.name) + co(l) + '</div><div class="d">Touch ' + n + ' of 5, request sent ' + sinceSent(l) + ' day' + (sinceSent(l) === 1 ? '' : 's') + ' ago</div></div>'
          + '<span class="dots" aria-hidden="true">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i < n ? 'on' : i === n ? 'cur' : '') + '"></i>'; }).join('') + '</span>'
          + cpb(l) + '<button type="button" class="btn sm" data-act="engskip" data-id="' + esc(l.id) + '" data-n="' + n + '">Skip</button><button type="button" class="btn pri sm" data-act="engdone" data-id="' + esc(l.id) + '" data-n="' + n + '">Done</button></div>';
      }).join('') + '</div>' : '<div class="empty">Nobody to engage with today.</div>') + '</section>';
    var tg = wtarget();
    var hot = L.leads.filter(function (l) { return l.tag === 'hot' && isOpen(l) && (who === 'All' || l.owner === who); }).sort(function (a, b) { return String(b.updated_at || '').localeCompare(String(a.updated_at || '')); }).slice(0, 4);
    var right = '<section class="card stack" style="gap:12px" aria-label="Watchlist today"><div class="row" style="justify-content:space-between"><h2>Watchlist today</h2><span class="sm mut">Target ' + tg + ' each</span></div>'
      + OWN.map(function (o) { var n = wdone(o), pc = Math.min(100, Math.round(n / tg * 100)); return '<div class="stack" style="gap:6px"><div class="row" style="justify-content:space-between"><b>' + esc(o) + '</b><span class="sm mut tn">' + n + ' of ' + tg + '</span></div><div class="pbar" role="img" aria-label="' + esc(o) + ' ' + n + ' of ' + tg + '"><i style="width:' + pc + '%"></i></div></div>'; }).join('')
      + '<button type="button" class="btn pri" data-act="tgo" data-id="leads:watch">Open ' + (who === 'All' ? 'my' : 'the') + ' batch, ' + wLeft + ' left</button></section>'
      + '<section class="card stack" style="gap:8px" aria-label="Hot signals"><h2>Hot signals</h2>' + (hot.length ? '<div class="list">' + hot.map(function (l) { return '<button type="button" class="item" data-act="lopen" data-id="' + esc(l.id) + '">' + av('lead', l) + '<div class="mn"><div class="t">' + esc(l.name) + '</div><div class="d">' + esc(lab(STAGES, l.stage)) + '. Updated ' + esc(ago(l.updated_at)) + '</div></div></button>'; }).join('') + '</div>' : '<div class="empty">No leads marked Hot. Set a lead\'s Signal to Hot when they respond.</div>') + '</section>'
      + '<section class="card stack" style="gap:8px" aria-label="Calls booked"><div class="row" style="justify-content:space-between"><h2>Calls booked</h2>' + pill(String(booked.length), booked.length ? 'good' : 'mut') + '</div>' + (booked.length ? '<div class="list">' + booked.slice(0, 4).map(function (l) { return '<button type="button" class="item" data-act="lopen" data-id="' + esc(l.id) + '">' + av('lead', l) + '<div class="mn"><div class="t">' + esc(l.name) + co(l) + '</div><div class="d">' + esc(l.owner) + (l.next_due ? '. ' + esc(fmt(l.next_due)) : '') + '</div></div></button>'; }).join('') + '</div>' : '<div class="empty">No calls booked yet.</div>') + '</section>'
      + '<section class="card stack" style="gap:8px" aria-label="Blocked"><div class="row" style="justify-content:space-between"><h2>Blocked</h2>' + pill(String(blocked.length), blocked.length ? 'warn' : 'mut') + '</div>' + (blocked.length ? '<div class="list">' + blocked.slice(0, 4).map(function (t) { return '<div class="item"><div class="mn"><div class="t">' + esc(t.title) + '</div><div class="d">' + esc(t.owner) + '</div></div></div>'; }).join('') + '</div>' : '<div class="empty">Nothing is blocked.</div>') + '</section>';
    return '<div class="stack">' + h + '<div class="tday"><div class="stack">' + left + '</div><div class="stack">' + right + '</div></div>' + drawer() + '</div>';
  };
  /* Phone Dashboard (1.4.0): the approved mobile layout, built from the same live data. */
  U.phoneHome = function () {
    var who = ME.name, q = queue(who), eg = engageList(who);
    var tk = L.tasks.filter(function (t) { return t.status !== 'done' && (t.owner === who || t.owner === 'Everyone'); });
    var tkLate = tk.filter(tlate), tkDue = tk.filter(function (t) { return t.due && t.due <= L.today; });
    var lateL = q.filter(function (l) { return l.next_due && l.next_due < L.today; });
    var dueN = q.length + tkDue.length, lateN = lateL.length + tkLate.length;
    var tg = wtarget(), wd = wdone(who), wl = watchLeft(who), pc = tg ? Math.min(100, Math.round(wd / tg * 100)) : 100, C = 2 * Math.PI * 26;
    var hr = new Date().getHours(), hello = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    var first = lateL[0] || q[0];
    var h = '<div class="pgreet">' + hello + ', ' + esc(who) + '</div><h1 class="pdash">Dashboard</h1>' + relBanner();
    h += first
      ? '<div class="phero"><span class="eyebrow">Do this first</span><b>Follow up with ' + esc(first.name) + '</b><small>' + esc(first.next_action || lab(STAGES, first.stage)) + ' &middot; ' + esc(when(first.next_due).t) + '</small><button type="button" class="btn" data-act="lopen" data-id="' + esc(first.id) + '">Open lead</button></div>'
      : '<div class="phero"><span class="eyebrow">All clear</span><b>Nothing overdue. Nice work.</b><small>Add a lead or work through the Watchlist.</small><button type="button" class="btn" data-act="tgo" data-id="leads:add">Add lead</button></div>';
    h += '<div class="pprog"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--tint)" stroke-width="8"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--brand)" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (C * pc / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="15" font-weight="800" fill="var(--fg)">' + pc + '%</text></svg><div><b>' + wd + ' of ' + tg + ' Watchlist comments</b><small>' + (wl ? wl + ' to go today.' : 'Done for today.') + '</small></div></div>';
    var tiles = [['warn', 'Overdue', lateN, 'Leads and tasks late', 'leads'], ['blue', 'Due today', dueN, 'To contact or do', 'leads'], ['green', 'Open tasks', tk.length, 'Yours', 'tasks'], ['', 'Engage', eg.length, 'Comments today', 'home']];
    h += '<div class="ptiles">' + tiles.map(function (t) { return '<button type="button" class="ptile ' + t[0] + '" data-act="tgo" data-id="' + t[4] + '"><span class="eyebrow">' + t[1] + '</span><b class="n">' + t[2] + '</b><small>' + t[3] + '</small></button>'; }).join('') + '</div>';
    if (eg.length) h += '<div class="pgh"><b>Engage today</b><i>' + eg.length + '</i></div><div class="pcard">' + eg.slice(0, 6).map(function (l) {
      var n = engageNum(l);
      return '<div class="pitem">' + av('lead', l) + '<button type="button" class="mn" data-act="lopen" data-id="' + esc(l.id) + '"><b>' + esc(l.name) + '</b><small>Touch ' + n + ' of 5</small></button><button type="button" class="btn sm" data-act="engskip" data-id="' + esc(l.id) + '" data-n="' + n + '">Skip</button><button type="button" class="btn pri sm" data-act="engdone" data-id="' + esc(l.id) + '" data-n="' + n + '">Done</button></div>';
    }).join('') + '</div>';
    if (q.length) h += '<div class="pgh"><b>Follow up</b><i>' + q.length + '</i></div><div class="pcard">' + q.slice(0, 5).map(function (l) {
      var w = when(l.next_due);
      return '<button type="button" class="pitem" data-act="lopen" data-id="' + esc(l.id) + '">' + av('lead', l) + '<span class="mn"><b>' + esc(l.name) + '</b><small>' + esc(l.company || lab(STAGES, l.stage)) + '</small></span>' + pill(w.t, w.c) + '</button>';
    }).join('') + '</div>';
    var nt = tk.slice().sort(function (a, b) { return String(a.due || '9999').localeCompare(String(b.due || '9999')); }).slice(0, 3);
    h += '<div class="pgh"><b>Next tasks</b><i>' + nt.length + '</i></div>' + (nt.length ? '<div class="pcard">' + nt.map(function (t) { var w = when(t.due); return '<button type="button" class="pitem" data-act="tgo" data-id="tasks"><span class="mn"><b>' + esc(t.title) + '</b><small>' + esc(t.owner) + '</small></span>' + pill(w.t, w.c) + '</button>'; }).join('') + '</div>' : '<div class="pcard pempty">No open tasks.</div>');
    return '<div class="phone-dash">' + h + '</div>' + drawer();
  };
  U.screens.followups = U.screens.home;

  /* ---------- MY ACCOUNT ---------- */
  U.screens.account = function () {
    var h = head('My account', 'Signed in as ' + esc(ME.name) + ' (' + esc(ME.login_id) + ').');
    h += '<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:8px">Your photo</h3><div class="row" style="gap:14px;align-items:center;flex-wrap:wrap"><span class="avbig">' + av('user', { id: ME.id, name: ME.name, avatar_v: ME.avatar_v }) + '</span><div class="stack" style="gap:8px;flex:1 1 220px"><div class="sm">Shows in the menu so you can see who is signed in. If you add no photo, you get coloured initials.</div><div class="row" style="gap:8px"><button type="button" class="btn" data-act="photo" data-kind="user" data-id="' + esc(ME.id) + '">' + (ME.avatar_v ? 'Change photo' : 'Add photo') + '</button>' + (ME.avatar_v ? '<button type="button" class="btn" data-act="photodel">Remove</button>' : '') + '</div></div></div></div>';
    h += '<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:8px">Save LinkedIn photos with one click</h3><div class="stack" style="gap:8px"><div class="sm"><b>Once:</b> drag this button to your bookmarks bar (press Ctrl+Shift+B to show it). <b>Then:</b> on anyone\'s LinkedIn profile, click it. Their photo is saved to that person in Leads or the Watchlist.</div><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><a class="btn pri" href="' + esc(bmCode()) + '" title="Drag me to your bookmarks bar. Do not click me here." onclick="return false">Save to UNS</a><button type="button" class="btn sm" data-act="bmcopy">Copy button code</button></div><div class="sm mut">Cannot drag it? Add any bookmark, then paste the copied code as its address.</div></div></div>';
    if (U.installCard) h += U.installCard();
    h += '<div class="grid g2" style="align-items:start"><div class="card"><h3 style="margin-bottom:8px">Change password</h3><div class="stack" style="gap:10px"><label class="f">Current password<input id="pw_cur" type="password" autocomplete="current-password"></label><label class="f">New password (12 characters or more)<input id="pw_new" type="password" autocomplete="new-password"></label><div><button type="button" class="btn pri" data-act="pwsave">Change password</button></div></div></div>'
      + '<div class="card"><h3 style="margin-bottom:8px">Two-factor sign-in</h3>' + (ME.totp_enabled ? '<div class="banner">Two-factor is on for your account. On the sign-in page you can type a recovery code in place of the authenticator code, and tick Remember this device to skip the code on this computer for 30 days.</div>' : '<div class="stack" style="gap:10px"><div class="sm">Founders use an authenticator app. Set it up now: press the button, add the key to your app, then type the 6-digit code to confirm.</div>' + (S.ui.twofa ? '<div class="card tight"><div class="sm mut">Key (type it into your authenticator app)</div><code style="overflow-wrap:anywhere;font-size:15px">' + esc(S.ui.twofa.secret) + '</code></div><label class="f">6-digit code<input id="tf_code" inputmode="numeric" maxlength="7" autocomplete="one-time-code"></label><div><button type="button" class="btn pri" data-act="tfon">Turn on</button></div>' : '<div><button type="button" class="btn pri" data-act="tfsetup">Start setup</button></div>') + '</div>') + '</div></div>';
    h += '<div class="grid g2" style="align-items:start"><div class="card"><h3 style="margin-bottom:8px">Email for password reset</h3><div class="stack" style="gap:10px"><div class="sm">' + (ME.email ? 'On file: ' + esc(ME.email) + '.' : 'No email on file yet.') + ' Forgot password sends a reset link here. Leave empty to remove it.</div><label class="f">Email<input id="em_new" type="email" autocomplete="email"></label><label class="f">Current password<input id="em_pw" type="password" autocomplete="current-password"></label><div><button type="button" class="btn" data-act="emailsave">Save email</button></div></div></div></div>';
    if (ME.totp_enabled || S.ui.codes) {
      h += '<div class="grid g2" style="align-items:start"><div class="card"><h3 style="margin-bottom:8px">Recovery codes</h3><div class="stack" style="gap:10px">';
      if (S.ui.codes) {
        h += '<div class="banner warn"><b>Save these now.</b> They are shown once. Each works one time in place of the authenticator code. Keep them in your password manager.</div><div class="rcodes">' + S.ui.codes.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div><div class="row"><button type="button" class="btn" data-act="rccopy">Copy all</button><button type="button" class="btn pri" data-act="rcsave">I saved them</button></div>';
      } else {
        h += '<div class="sm">' + (ME.recovery_left ? esc(String(ME.recovery_left)) + ' unused codes left.' : 'You have no recovery codes yet.') + ' Making new ones cancels all the old ones. Lost your phone? A recovery code gets you in.</div><label class="f">Current password<input id="rc_pw" type="password" autocomplete="current-password"></label><div><button type="button" class="btn pri" data-act="rcnew">Make new codes</button></div>';
      }
      h += '</div></div><div class="card"><h3 style="margin-bottom:8px">Remembered devices</h3><div class="stack" style="gap:10px"><div class="sm">Computers where you ticked Remember this device skip the authenticator code for 30 days. They still need your password. Changing your password forgets them all.</div><div><button type="button" class="btn" data-act="devforget">Forget all remembered devices</button></div></div></div></div>';
    }
    return '<div class="stack">' + h + '</div>';
  };

  /* ---------- DEVELOPER (Tabish only) ---------- */
  var DEV = null, PPL = null;
  U.screens.developer = function () {
    var h = head('Developer', 'Tabish only. Health, access and the activity log.');
    if (!PPL) api('GET', '/admin/users').then(function (d) { PPL = d.users; U.render(); }).catch(function () {});
    if (!DEV) { api('GET', '/dev').then(function (d) { DEV = d; U.render(); }).catch(function () {}); return '<div class="stack">' + h + '<div class="empty">Loading</div></div>'; }
    h += '<div class="grid g4">' + [['Leads', DEV.counts.leads], ['Tasks', DEV.counts.tasks], ['Board items', DEV.counts.radar], ['People', DEV.counts.users]].map(function (r) { return '<div class="card tile"><b class="tn">' + r[1] + '</b><span>' + r[0] + '</span></div>'; }).join('') + '</div>';
    h += '<div class="grid g2" style="align-items:start"><div class="card"><h3 style="margin-bottom:8px">Screens on or off</h3><div class="list">' + DEV.flags.map(function (f) { return '<div class="item"><div class="mn"><div class="t">' + esc(f.key) + '</div></div>' + (f.key === 'developer' ? pill('Always on', 'mut') : '<button type="button" class="btn sm" data-act="flag" data-id="' + esc(f.key) + '" data-on="' + (f.on_back ? 0 : 1) + '">' + (f.on_back ? 'Turn off' : 'Turn on') + '</button>') + '</div>'; }).join('') + '</div></div>'
      + '<div class="card"><h3 style="margin-bottom:8px">Access</h3><div class="stack" style="gap:10px"><div class="sm">One-time password reset link. Valid for one hour. Send it to the person yourself. Their old sessions stop working.</div><div class="row"><input id="rl_id" placeholder="Their sign-in ID" style="flex:1;min-width:160px"><button type="button" class="btn sm" data-act="rlink">Make link</button><button type="button" class="btn sm bad" data-act="revoke">Sign them out</button></div><div class="sm">Email used for their password reset link.</div><div class="row"><input id="de_id" placeholder="Their sign-in ID" style="flex:1;min-width:140px"><input id="de_em" type="email" placeholder="their@email.com" style="flex:1;min-width:160px"><button type="button" class="btn sm" data-act="devemail">Save email</button></div><div class="row"><button type="button" class="btn sm" data-act="mailtest">Send test email to me</button></div>' + (S.ui.rl ? '<div class="card tight"><code style="overflow-wrap:anywhere">' + esc(location.origin + S.ui.rl) + '</code></div>' : '') + '</div>'
      + '<h3 style="margin:14px 0 8px">Signed in now</h3><div class="list">' + (DEV.sessions.length ? DEV.sessions.slice(0, 8).map(function (s) { return '<div class="sm">' + esc(s.name) + ' since ' + esc((s.created_at || '').slice(0, 10)) + '</div>'; }).join('') : '<div class="empty">No sessions.</div>') + '</div></div></div>';
    h += '<div class="card"><h3 style="margin-bottom:8px">Claude access</h3><div class="stack" style="gap:10px"><div class="sm">Let Claude look at the app for a short time. The code works as a read-only founder view of leads, tasks, Watchlist and the board. It cannot see accounts, passwords, access or this screen. It stops by itself. Paste it to Claude in chat.</div>'
      + '<div class="row"><label class="f">Valid for<select id="ct_min">' + opts([['30', '30 minutes'], ['60', '1 hour'], ['120', '2 hours'], ['240', '4 hours']], '60') + '</select></label><label class="f">Can change data<select id="ct_w">' + opts([['0', 'No, read only'], ['1', 'Yes, can add and edit']], '0') + '</select></label></div>'
      + '<div class="row"><button type="button" class="btn pri" data-act="ctmake">Make code</button><button type="button" class="btn bad" data-act="ctrevoke">Switch off all codes</button></div>'
      + (S.ui.ct ? '<div class="card tight"><div class="sm">Shown once. Valid until ' + esc(S.ui.ct.expires_at.slice(11, 16)) + ' UTC, ' + (S.ui.ct.write ? 'can change data' : 'read only') + '.</div><code style="overflow-wrap:anywhere">' + esc(S.ui.ct.token) + '</code></div>' : '')
      + ((DEV.claude_tokens || []).length ? '<div class="sm mut">Active codes: ' + DEV.claude_tokens.length + (DEV.claude_tokens[0].last_used_at ? '. Last used ' + esc(DEV.claude_tokens[0].last_used_at.slice(11, 16)) + ' UTC.' : '. Not used yet.') + '</div>' : '<div class="sm mut">No active codes.</div>') + '</div></div>';
    h += '<div class="card"><h3 style="margin-bottom:8px">People and access</h3><div class="list">' + (PPL ? PPL.map(function (u) {
      return '<div class="item" style="flex-wrap:wrap"><div class="mn"><div class="t">' + esc(u.name) + ' <span class="mut" style="font-weight:400">' + esc(u.login_id) + '</span></div><div class="d">' + esc(u.role) + (u.totp_enabled ? ', two-factor on' : ', no two-factor') + (u.must_reset ? ', waiting to choose a password' : '') + (u.active ? '' : ', switched off') + '</div></div><div class="row" style="gap:6px">'
        + '<button type="button" class="btn sm" data-act="ulink" data-id="' + esc(u.login_id) + '">Make link</button>'
        + (u.id === ME.id ? '' : '<button type="button" class="btn sm' + (u.active ? ' bad' : '') + '" data-act="uactive" data-id="' + esc(u.id) + '" data-on="' + (u.active ? 0 : 1) + '">' + (u.active ? 'Switch off' : 'Switch on') + '</button>') + '</div></div>';
    }).join('') : '<div class="empty">Loading</div>') + '</div>'
      + '<h3 style="margin:14px 0 8px">Add a person</h3><div class="stack" style="gap:10px"><div class="row"><label class="f" style="flex:1;min-width:150px">Name<input id="nu_name" maxlength="60"></label><label class="f" style="flex:1;min-width:150px">Sign-in ID<input id="nu_id" maxlength="30" autocapitalize="none" placeholder="letters and numbers"></label><label class="f">Role<select id="nu_role">' + opts([['founder', 'Founder'], ['contractor', 'Contractor'], ['client', 'Client']], 'founder') + '</select></label></div>'
      + '<div class="sm mut">Contractors and clients can sign in but see none of the founders app until their own screens are built. Founders see everything.</div>'
      + '<div><button type="button" class="btn pri" data-act="ucreate">Create and get link</button></div>'
      + (S.ui.nl ? '<div class="card tight"><div class="sm">Send this link to ' + esc(S.ui.nl.who) + ' privately. It works once, for one hour.</div><code style="overflow-wrap:anywhere">' + esc(location.origin + S.ui.nl.path) + '</code></div>' : '') + '</div></div>';
    h += '<div class="card scroll"><h3 style="margin-bottom:8px">Activity log</h3><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead><tbody>' + DEV.activity.map(function (a) { return '<tr><td class="tn">' + esc(a.at) + '</td><td>' + esc(a.actor || '') + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail || '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<div class="sm mut">Version 1.2.3-dev. Backups: run <code>node scripts/backup-db.mjs</code> on the PC (see README).</div>';
    return '<div class="stack">' + h + '</div>';
  };

  /* ---------- WATCHLIST: people we comment on every day ---------- */
  var W_KIND = [['outlier', 'Outlier'], ['icp', 'ICP'], ['other', 'Other']];
  function wtarget() { return parseInt((L.settings || {}).watch_target, 10) || 25; }
  function wdone(who) { var n = 0; (L.watch_comments || []).forEach(function (c) { if (c.day === L.today && c.by === who) n++; }); return n; }
  function wcommentedToday(id) { return (L.watch_comments || []).some(function (c) { return c.day === L.today && c.watch_id === id; }); }
  function wbatch(who) {
    return (L.watch || []).filter(function (w) { return w.owner === who && w.active && !w.lead_id && !wcommentedToday(w.id); })
      .sort(function (a, b) { return String(a.last_commented_at || '').localeCompare(String(b.last_commented_at || '')) || a.name.localeCompare(b.name); });
  }
  function watchLeft(who) { return Math.max(0, Math.min(wtarget() - wdone(who), wbatch(who).length)); }
  function wago(w) { return w.last_commented_at ? (dd(L.today, w.last_commented_at) === 0 ? 'today' : dd(L.today, w.last_commented_at) + 'd ago') : 'never'; }
  function wrow(w, opt) {
    opt = opt || {};
    var done = wcommentedToday(w.id);
    var nm = '<a href="' + esc(w.profile_url) + '" target="_blank" rel="noopener noreferrer">' + esc(w.name) + '</a>';
    return '<div class="item" style="align-items:center;flex-wrap:wrap' + (done ? ';opacity:.7' : '') + '">' + av('watch', w, true) + '<div class="mn"><div class="t">' + nm + '</div><div class="d">' + esc(lab(W_KIND, w.kind)) + '. Last commented ' + wago(w) + '. ' + w.comment_count + ' total.' + (w.lead_id ? ' Now a lead.' : '') + '</div></div>'
      + '<div class="row" style="gap:6px;flex-wrap:wrap">'
      + (opt.full ? '<select data-chg="wowner" data-id="' + esc(w.id) + '" aria-label="Owner">' + opts(OWN, w.owner) + '</select><select data-chg="wkind" data-id="' + esc(w.id) + '" aria-label="Type">' + opts(W_KIND, w.kind) + '</select>' : '')
      + cpb(w)
      + (done ? '<button type="button" class="btn sm" data-act="wundo" data-id="' + esc(w.id) + '">Undo</button>'
        : '<button type="button" class="btn pri sm" data-act="wdone" data-id="' + esc(w.id) + '">Commented</button>')
      + (!w.lead_id ? '<button type="button" class="btn sm" data-act="wlead" data-id="' + esc(w.id) + '">Make lead</button>' : '')
      + (opt.full ? '<button type="button" class="btn sm' + (w.active ? '' : ' pri') + '" data-act="wactive" data-id="' + esc(w.id) + '" data-on="' + (w.active ? 0 : 1) + '">' + (w.active ? 'Hide' : 'Show') + '</button>' : '')
      + '</div></div>';
  }
  /* Phone Watchlist (1.4.0) */
  function pwrow(w, full) {
    var done = wcommentedToday(w.id);
    var nm = '<a href="' + esc(w.profile_url) + '" target="_blank" rel="noopener noreferrer">' + esc(w.name) + '</a>';
    return '<div class="pitem pw' + (done ? ' done' : '') + '">' + av('watch', w, true) + '<div class="mn"><b>' + nm + '</b><small>' + esc(lab(W_KIND, w.kind)) + '. Last ' + wago(w) + (full ? '. ' + esc(w.owner) : '') + (w.lead_id ? '. Lead' : '') + '</small>'
      + '<span class="pwx">' + cpb(w) + (!w.lead_id ? '<button type="button" class="btn sm" data-act="wlead" data-id="' + esc(w.id) + '">Make lead</button>' : '') + (full ? '<button type="button" class="btn sm' + (w.active ? '' : ' pri') + '" data-act="wactive" data-id="' + esc(w.id) + '" data-on="' + (w.active ? 0 : 1) + '">' + (w.active ? 'Hide' : 'Show') + '</button>' : '') + '</span></div>'
      + (full ? '' : done ? '<button type="button" class="btn sm" data-act="wundo" data-id="' + esc(w.id) + '">Undo</button>' : '<button type="button" class="btn pri sm" data-act="wdone" data-id="' + esc(w.id) + '">Commented</button>') + '</div>';
  }
  function phoneWatchBody() {
    var tab = S.ui.wtab || 'today', who = S.ui.wwho || ME.name, tg = wtarget(), wd = wdone(who), pc = tg ? Math.min(100, Math.round(wd / tg * 100)) : 100, C = 2 * Math.PI * 26;
    var h = '<div class="pprog"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--tint)" stroke-width="8"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--brand)" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (C * pc / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="15" font-weight="800" fill="var(--fg)">' + pc + '%</text></svg><div><b>' + esc(who) + ': ' + wd + ' of ' + tg + '</b><small>Team today: ' + OWN.map(function (o) { return esc(o) + ' ' + wdone(o); }).join(', ') + '</small></div></div>';
    h += '<div class="psteps" role="group" aria-label="Watchlist view">' + [['today', 'Today'], ['all', 'All people'], ['add', 'Add people']].map(function (t) { return '<button type="button" class="pchip' + (tab === t[0] ? ' on' : '') + '" data-act="wtab" data-id="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'today') {
      var b = wbatch(who), left = Math.max(0, tg - wd), shown = b.slice(0, left);
      var dn = (L.watch || []).filter(function (w) { return w.owner === who && wcommentedToday(w.id); });
      h += '<div class="psteps" role="group" aria-label="Whose list">' + OWN.map(function (o) { return '<button type="button" class="pchip' + (who === o ? ' on' : '') + '" data-act="pwwho" data-id="' + esc(o) + '" aria-pressed="' + (who === o) + '">' + esc(o) + '</button>'; }).join('') + '</div>';
      h += shown.length ? '<div class="pgh"><b>To comment on</b><i>' + shown.length + (b.length > shown.length ? ' of ' + b.length : '') + '</i></div><div class="pcard">' + shown.map(function (w) { return pwrow(w); }).join('') + '</div>' : '<div class="pcard pempty">' + (b.length ? 'Target reached for today. Nice work.' : 'Nobody on this list yet. Add people.') + '</div>';
      if (dn.length) h += '<div class="pgh"><b>Done today</b><i>' + dn.length + '</i></div><div class="pcard">' + dn.map(function (w) { return pwrow(w); }).join('') + '</div>';
    } else if (tab === 'all') {
      var q = (S.ui.wq || '').toLowerCase(), of = S.ui.wown || 'All';
      var all = (L.watch || []).filter(function (w) { return w.active && (of === 'All' || w.owner === of) && (!q || w.name.toLowerCase().indexOf(q) >= 0); });
      h += '<input class="psearch" id="w_q" data-enter="wsearch" placeholder="Search by name, press Enter" value="' + esc(S.ui.wq || '') + '" enterkeyhint="search">';
      h += '<div class="psteps">' + ['All'].concat(OWN).map(function (o) { return '<button type="button" class="pchip' + (of === o ? ' on' : '') + '" data-act="pwown" data-id="' + esc(o) + '" aria-pressed="' + (of === o) + '">' + esc(o === 'All' ? 'Everyone' : o) + '</button>'; }).join('') + '</div>';
      h += '<div class="pgh"><b>People</b><i>' + all.length + (all.length > 100 ? ', first 100' : '') + '</i></div><div class="pcard">' + (all.slice(0, 100).map(function (w) { return pwrow(w, true); }).join('') || '<div class="pempty">No one matches.</div>') + '</div>';
    } else {
      h += '<div class="pcard" style="padding:14px"><div class="stack" style="gap:10px"><div class="sm">Paste LinkedIn profile links, one per line. To give a name, write it first: <code>Jane Doe, https://www.linkedin.com/in/jane</code>. Links already on the list are skipped.</div>'
        + '<textarea id="w_paste" rows="7" placeholder="https://www.linkedin.com/in/..."></textarea>'
        + '<div class="row" style="gap:8px"><label class="f" style="flex:1">Whose<select id="w_own">' + opts([['split', 'Split evenly']].concat(OWN.map(function (o) { return [o, o]; })), 'split') + '</select></label>'
        + '<label class="f" style="flex:1">Type<select id="w_kind">' + opts(W_KIND, 'outlier') + '</select></label></div>'
        + '<button type="button" class="btn pri" data-act="wadd">Add to the Watchlist</button></div></div>';
    }
    return h;
  }
  function watchBody() {
    var tab = S.ui.wtab || 'today', who = S.ui.wwho || ME.name, tg = wtarget();
    var nopic = photosMissing().length;
    var h = '<div class="row" style="justify-content:space-between"><div>' + (nopic ? '<button type="button" class="btn sm" data-act="pfetchall">Try to fetch ' + Math.min(nopic, 8) + ' missing photos (' + nopic + ' without)</button>' : '<span class="sm mut">All photos in place.</span>') + '</div><label class="sm row" style="gap:6px">Daily target<select data-chg="wtarget">' + opts([10, 15, 20, 25, 30, 40].map(String), String(tg)) + '</select></label></div>';
    h += '<div class="grid g4">' + OWN.map(function (o) { var n = wdone(o); return '<div class="card tile"><b class="tn">' + n + '/' + tg + '</b><span>' + esc(o) + ' commented today</span></div>'; }).join('')
      + '<div class="card tile"><b class="tn">' + (L.watch || []).filter(function (w) { return w.active; }).length + '</b><span>People on the list</span></div></div>';
    h += '<div class="seg" role="group">' + [['today', 'Today'], ['all', 'All people'], ['add', 'Add people']].map(function (t) { return '<button type="button" data-act="wtab" data-id="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'today') {
      var b = wbatch(who), left = Math.max(0, tg - wdone(who)), shown = b.slice(0, left);
      var dn = (L.watch || []).filter(function (w) { return w.owner === who && wcommentedToday(w.id); });
      h += '<div class="row" style="justify-content:space-between"><div class="sm">' + esc(who) + ': ' + wdone(who) + ' of ' + tg + ' done. ' + (b.length > shown.length ? (b.length - shown.length) + ' more in the queue.' : '') + '</div>'
        + '<label class="sm row" style="gap:6px">Whose list<select data-chg="wwho">' + opts(OWN, who) + '</select></label></div>';
      h += '<div class="sm mut">Longest since your last comment first. Press Commented after you leave a real comment. If you did it for someone else, switch Whose list to them.</div>';
      h += shown.length ? '<div class="list">' + shown.map(function (w) { return wrow(w); }).join('') + '</div>' : '<div class="empty">' + (b.length ? 'Target reached for today. Nice work.' : 'Nobody on this list yet. Add people in Add people.') + '</div>';
      if (dn.length) h += '<h3>Done today</h3><div class="list">' + dn.map(function (w) { return wrow(w); }).join('') + '</div>';
    } else if (tab === 'all') {
      var q = (S.ui.wq || '').toLowerCase(), of = S.ui.wown || 'All', ok = S.ui.wkind || 'All', sh = S.ui.wshow || 'active';
      var all = (L.watch || []).filter(function (w) { return (of === 'All' || w.owner === of) && (ok === 'All' || w.kind === ok) && (sh === 'all' || (sh === 'active' ? w.active : !w.active)) && (!q || w.name.toLowerCase().indexOf(q) >= 0); });
      h += '<div class="row"><input id="w_q" data-enter="wsearch" placeholder="Search by name, press Enter" value="' + esc(S.ui.wq || '') + '" style="flex:1;min-width:180px">'
        + '<label class="sm row" style="gap:6px">Owner<select data-chg="wown">' + opts(['All'].concat(OWN), of) + '</select></label>'
        + '<label class="sm row" style="gap:6px">Type<select data-chg="wkindf">' + opts([['All', 'All']].concat(W_KIND), ok) + '</select></label>'
        + '<label class="sm row" style="gap:6px">Show<select data-chg="wshow">' + opts([['active', 'Active'], ['hidden', 'Hidden'], ['all', 'All']], sh) + '</select></label></div>';
      h += '<div class="sm mut">' + all.length + ' people. Showing the first 100.</div><div class="list">' + all.slice(0, 100).map(function (w) { return wrow(w, { full: true }); }).join('') + '</div>';
    } else {
      h += '<div class="card"><h3 style="margin-bottom:8px">Add people</h3><div class="stack" style="gap:10px"><div class="sm">Paste LinkedIn profile links, one per line. To give a name, write it first: <code>Jane Doe, https://www.linkedin.com/in/jane</code>. Up to 500 at a time. Links already on the list are skipped.</div>'
        + '<textarea id="w_paste" rows="8" placeholder="https://www.linkedin.com/in/..."></textarea>'
        + '<div class="row"><label class="f">Whose<select id="w_own">' + opts([['split', 'Split evenly between us']].concat(OWN.map(function (o) { return [o, o]; })), 'split') + '</select></label>'
        + '<label class="f">Type<select id="w_kind">' + opts(W_KIND, 'outlier') + '</select></label></div>'
        + '<div><button type="button" class="btn pri" data-act="wadd">Add to the Watchlist</button></div></div></div>';
    }
    return '<div class="stack">' + h + '</div>';
  }

  /* ---------- actions ---------- */
  var A = U.acts;
  A.signout = function () { api('POST', '/logout', {}).then(function () { location.replace('/app/login.html'); }).catch(function () { location.replace('/app/login.html'); }); };
  A.wtab = function (el) { S.ui.wtab = el.getAttribute('data-id'); U.render(); };
  A.wsearch = function () { S.ui.wq = val('w_q'); U.render(); };
  function wby() { return S.ui.wwho || ME.name; }
  A.wdone = function (el) { run(api('POST', '/watch/' + el.getAttribute('data-id') + '/comment', { by: wby() })); };
  A.wundo = function (el) { run(api('DELETE', '/watch/' + el.getAttribute('data-id') + '/comment')); };
  A.wactive = function (el) { run(api('PATCH', '/watch/' + el.getAttribute('data-id'), { active: el.getAttribute('data-on') === '1' })); };
  A.wlead = function (el) { run(api('POST', '/watch/' + el.getAttribute('data-id') + '/promote', {}), 'Now a lead. Find it in Leads.'); };
  A.wadd = function () {
    var lines = (document.getElementById('w_paste') || { value: '' }).value.split(/\n+/), items = [];
    lines.forEach(function (ln) {
      ln = ln.trim(); if (!ln) return;
      var m = ln.match(/https?:\/\/\S+/); if (!m) { items.push({ profile_url: ln }); return; }
      var nm = ln.replace(m[0], '').replace(/[,;|\t-]+\s*$/, '').replace(/^[,;|\t-]+\s*/, '').trim();
      items.push({ name: nm, profile_url: m[0] });
    });
    if (!items.length) { U.toast('Paste at least one link.'); return; }
    api('POST', '/watch', { items: items, owner: val('w_own'), kind: val('w_kind') }).then(function (r) {
      U.toast('Added ' + r.added + '. Skipped ' + r.skipped + ' already on the list' + (r.bad ? ', ' + r.bad + ' not valid profile links' : '') + '.');
      var e = document.getElementById('w_paste'); if (e) e.value = ''; return reload();
    }).catch(function (e) { U.toast('<b>Not added.</b> ' + esc(e.message)); });
  };
  /* ---- photos ---- */
  function photosMissing() {
    return (L.watch || []).filter(function (w) { return w.active && !w.avatar_v && !w.avatar_try; }).map(function (w) { return ['watch', w.id]; })
      .concat(L.leads.filter(function (l) { return l.profile_url && !l.avatar_v && !l.avatar_try; }).map(function (l) { return ['lead', l.id]; }));
  }
  function photoInput() {
    var i = document.getElementById('photo_in');
    if (!i) {
      i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.id = 'photo_in'; i.hidden = true; document.body.appendChild(i);
      i.addEventListener('change', function () { var f = i.files && i.files[0]; i.value = ''; if (f) sendPhoto(f); });
    }
    return i;
  }
  function sendPhoto(blob) {
    var t = S.ui.ptarget; if (!t) return;
    // createImageBitmap reads the file without a blob: URL, which the page security policy does not allow.
    createImageBitmap(blob).then(function (img) {
      var s = 96, c = document.createElement('canvas'); c.width = c.height = s;
      var m = Math.min(img.width, img.height), sx = (img.width - m) / 2, sy = (img.height - m) / 2;
      c.getContext('2d').drawImage(img, sx, sy, m, m, 0, 0, s, s);
      S.ui.ptarget = null;
      run(api('PUT', '/avatar/' + t.kind + '/' + t.id, { data: c.toDataURL('image/jpeg', 0.85) }).then(function (r) { if (t.kind === 'user' && r && r.v) ME.avatar_v = r.v; return r; }), 'Photo saved.');
    }).catch(function () { U.toast('That file is not an image.'); });
  }
  function bmCode() {
    var app = location.origin;
    var f = function () {
      try {
        var m = document.querySelector('main') || document, c = [].slice.call(m.querySelectorAll('img')).filter(function (i) { return /licdn\.com/.test(i.src) && /profile-(displayphoto|framedphoto)/.test(i.src); }).sort(function (a, b) { return b.naturalWidth - a.naturalWidth; })[0];
        var s = c ? c.src : ((document.querySelector('meta[property="og:image"]') || {}).content || '');
        var h1 = document.querySelector('main h1'), nm = (document.title && !/^\(?\d*\)?\s*LinkedIn$/i.test(document.title) ? document.title : (h1 ? h1.innerText : (document.querySelector('meta[property="og:title"]') || {}).content || '')).split('\n')[0];
        var p = location.pathname.match(/^\/in\/[^\/]+/);
        if (!p || !s) { alert('Open a LinkedIn profile first, then click Save to UNS.'); return; }
        window.open('APP/app/photo.html#u=' + encodeURIComponent(location.origin + p[0]) + '&i=' + encodeURIComponent(s) + '&n=' + encodeURIComponent(nm), 'uns_photo', 'width=420,height=300');
      } catch (e) { alert('Save to UNS: ' + e.message); }
    };
    return 'javascript:(' + f.toString().replace('APP', app).replace(/\s*\n\s*/g, '') + ')()';
  }
  A.bmcopy = function (el) { U.copy(bmCode(), el); };
  A.photodel = function () { run(api('DELETE', '/avatar/user/' + ME.id).then(function (r) { ME.avatar_v = null; return r; }), 'Photo removed.'); };
  A.photo = function (el) {
    S.ui.ptarget = { kind: el.getAttribute('data-kind'), id: el.getAttribute('data-id'), at: Date.now() };
    if (touchy()) { U.toast('Choose a photo from your phone.'); photoInput().click(); return; }
    var again = S.ui.pwait && S.ui.pwait.id === S.ui.ptarget.id && Date.now() - S.ui.pwait.at < 10000;
    if (again) { photoInput().click(); return; }
    S.ui.pwait = { id: S.ui.ptarget.id, at: Date.now() };
    U.toast('<b>Press Ctrl+V now</b> to paste their photo (on LinkedIn: right-click the photo, Copy image). Click the face again to choose a file instead.');
  };
  document.addEventListener('paste', function (e) {
    var t = S.ui.ptarget; if (!t || Date.now() - t.at > 600000) t = S.ui.lopen ? { kind: 'lead', id: S.ui.lopen, at: Date.now() } : null; if (!t) return;
    var it = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < it.length; i++) if (it[i].type.indexOf('image/') === 0) { e.preventDefault(); S.ui.ptarget = t; sendPhoto(it[i].getAsFile()); return; }
  });
  A.pfetch = function (el) {
    U.toast('Looking for the photo.');
    api('POST', '/avatar/' + el.getAttribute('data-kind') + '/' + el.getAttribute('data-id') + '/fetch', {}).then(function (r) {
      return reload().then(function () { U.toast(r.ok ? 'Photo found.' : 'LinkedIn did not give a photo. Click the avatar to add one yourself.'); });
    }).catch(function (e) { U.toast('<b>Not fetched.</b> ' + esc(e.message)); });
  };
  A.pfetchall = function () {
    var todo = photosMissing().slice(0, 8), ok = 0; if (!todo.length) return;
    U.toast('Trying ' + todo.length + ' profiles. This takes a few seconds.');
    todo.reduce(function (p, x) { return p.then(function () { return api('POST', '/avatar/' + x[0] + '/' + x[1] + '/fetch', {}).then(function (r) { if (r.ok) ok++; }).catch(function () {}); }); }, Promise.resolve())
      .then(reload).then(function () { U.toast('Got ' + ok + ' of ' + todo.length + '. ' + (ok < todo.length ? 'LinkedIn hides the rest: click an avatar to add a photo yourself.' : '')); });
  };
  A.twho = function (el) { S.ui.fuWho = el.getAttribute('data-id'); U.render(); };
  A.tgo = function (el) {
    var p = el.getAttribute('data-id').split(':');
    if (p[1] === 'watch') { S.ui.llist = 'watch'; S.ui.wtab = 'today'; S.ui.wwho = ME.name; }
    if (p[1] === 'add') { S.ui.ladd = true; if (S.ui.llist === 'watch') S.ui.llist = 'icp'; }
    if (U.go) { U.go(p[0]); } else { S.route = p[0]; S.ui.draw = false; U.render(); }
  };
  A.llistsel = function (el) { S.ui.llist = el.getAttribute('data-id'); U.render(); };
  A.ptkwho = function (el) { S.ui.tkWho = el.getAttribute('data-id'); U.render(); };
  A.ptkdone = function () { S.ui.tkDone = S.ui.tkDone === 'show' ? 'hide' : 'show'; U.render(); };
  A.pwwho = function (el) { S.ui.wwho = el.getAttribute('data-id'); U.render(); };
  A.pwown = function (el) { S.ui.wown = el.getAttribute('data-id'); U.render(); };
  A.pview = function (el) { S.ui.pview = el.getAttribute('data-id'); U.render(); };
  A.pown = function (el) { S.ui.lown = el.getAttribute('data-id'); U.render(); };
  A.lview = function (el) { S.ui.lview = el.getAttribute('data-id'); U.render(); };
  A.laddtoggle = function () { S.ui.ladd = !S.ui.ladd; U.render(); };
  A.lcopy = function (el) { U.copy(el.getAttribute('data-url'), el); };
  function xb(l) { return l.x_url ? '<a class="btn sm" href="' + esc(l.x_url) + '" target="_blank" rel="noopener noreferrer" aria-label="Open X for ' + esc(l.name) + '">X</a><button type="button" class="btn sm" data-act="lcopy" data-url="' + esc(l.x_url) + '" aria-label="Copy X link for ' + esc(l.name) + '">Copy X</button>' : ''; }
  A.lopen = function (el) { S.ui.lopen = el.getAttribute('data-id'); U.render(); };
  A.lclose = function () { S.ui.lopen = null; U.render(); };
  A.engdone = function (el) { run(api('POST', '/leads/' + el.getAttribute('data-id') + '/engage', { n: +el.getAttribute('data-n') }), 'Engage logged.'); };
  A.engskip = function (el) { run(api('POST', '/leads/' + el.getAttribute('data-id') + '/engage', { n: +el.getAttribute('data-n'), skip: true }), 'Skipped.'); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.ui.lopen) { S.ui.lopen = null; U.render(); } });
  A.laddsave = function () {
    var name = val('a_name'); if (!name) { U.toast('Name the lead.'); return; }
    var purl = val('a_url');
    run(api('POST', '/leads', { name: name, company: val('a_co'), owner: val('a_own'), profile_url: val('a_url'), x_url: val('a_x'), why_fit: val('a_why'), stage: val('a_start'), list: val('a_list'), industry: val('a_ind'), source: val('a_start') === 'sent' ? 'Connection request' : '1st degree connection' }), 'Lead added.').then(function (r) { S.ui.ladd = false; U.render(); if (r && r.id && purl) api('POST', '/avatar/lead/' + r.id + '/fetch', {}).then(reload).catch(function () {}); });
  };
  A.ldone = function (el) {
    var id = el.getAttribute('data-id'), l = L.leads.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    run(api('POST', '/leads/' + id + '/event', { kind: 'action', detail: 'Did: ' + suggest(l) }).then(function () { return api('PATCH', '/leads/' + id, { next_due: addDays(L.today, 1) }); }), 'Logged. Next action tomorrow.');
  };
  A.ldetsave = function (el) {
    var id = el.getAttribute('data-id'), l = L.leads.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var f = [['name', 'ld_name_', l.name], ['company', 'ld_co_', l.company], ['profile_url', 'ld_url_', l.profile_url], ['x_url', 'ld_x_', l.x_url], ['industry', 'ld_ind_', l.industry]], b = {}, n = 0;
    f.forEach(function (r) { var v = val(r[1] + id); if (v !== (r[2] || '')) { b[r[0]] = v; n++; } });
    if (b.name === '') { U.toast('A lead needs a name.'); return; }
    if (!n) { U.toast('Nothing changed.'); return; }
    var urlChanged = 'profile_url' in b && b.profile_url;
    run(api('PATCH', '/leads/' + id, b), 'Details saved.').then(function () { if (urlChanged && !l.avatar_v) api('POST', '/avatar/lead/' + id + '/fetch', {}).then(reload).catch(function () {}); });
  };
  A.lsnooze = function (el) { var id = el.getAttribute('data-id'); run(api('PATCH', '/leads/' + id, { next_due: addDays(L.today, 1) }), 'Moved to tomorrow.'); };
  A.lnote = function (el) { var id = el.getAttribute('data-id'), t = val('ln_' + id); if (!t) return; run(api('POST', '/leads/' + id + '/event', { kind: 'note', detail: t }), 'Note saved.'); };
  function task(id) { return L.tasks.filter(function (t) { return t.id === id; })[0]; }
  A.tdelete = function (el) { var id = el.getAttribute('data-id'); if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Press again to delete'; return; } run(api('DELETE', '/tasks/' + id), 'Task deleted.'); };
  A.tkview = function (el) { S.ui.tkView = el.getAttribute('data-id'); U.render(); };
  A.tkopen = function (el) { var id = el.getAttribute('data-id'); S.ui.tkOpen = S.ui.tkOpen || {}; if (S.ui.tkOpen[id]) delete S.ui.tkOpen[id]; else S.ui.tkOpen[id] = 1; U.render(); };
  A.tkdone = function (el) { var id = el.getAttribute('data-id'), t = task(id); if (t) run(api('PATCH', '/tasks/' + id, { status: t.status === 'done' ? 'todo' : 'done' })); };
  A.tkadd = function () {
    var q = document.getElementById('tk_q'), v = q ? q.value.trim() : ''; if (!v) return;
    run(api('POST', '/tasks', { title: v, owner: val('tk_o'), area: S.ui.tkArea || 'Other' }), 'Task added.').then(function () { var e = document.getElementById('tk_q'); if (e) e.focus(); });
  };
  A.tkchkadd = function (el) { var id = el.getAttribute('data-id'), t = task(id), v = val('tkc_' + id); if (!v || !t) return; S.ui.tkOpen = S.ui.tkOpen || {}; S.ui.tkOpen[id] = 1; run(api('PATCH', '/tasks/' + id, { checks: (t.checks || []).concat([{ t: v, d: false }]) })); };
  A.tkchkdel = function (el) { var id = el.getAttribute('data-id'), t = task(id), i = +el.getAttribute('data-i'); if (!t) return; var c = (t.checks || []).slice(); c.splice(i, 1); run(api('PATCH', '/tasks/' + id, { checks: c })); };
  A.tkpost = function (el) { var id = el.getAttribute('data-id'), t = task(id), v = val('tkm_' + id); if (!v || !t) return; run(api('PATCH', '/tasks/' + id, { comments: (t.comments || []).concat([{ by: ME.name, t: v, at: new Date().toISOString() }]) })); };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return; var el = e.target.closest ? e.target.closest('[data-enter]') : null; if (!el) return;
    e.preventDefault(); var f = A[el.getAttribute('data-enter')]; if (f) f(el);
  });
  A.radd = function () { var t = val('r_text'); if (!t) return; run(api('POST', '/radar', { text: t, state: val('r_state') })); };
  A.pwsave = function () { api('POST', '/password', { current: val('pw_cur'), new: val('pw_new') }).then(function () { U.toast('Password changed.'); U.render(); }).catch(function (e) { U.toast('<b>Not changed.</b> ' + esc(e.message)); }); };
  A.tfsetup = function () { api('POST', '/2fa/setup', {}).then(function (r) { S.ui.twofa = r; U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.tfon = function () { api('POST', '/2fa/enable', { code: val('tf_code') }).then(function (r) { ME.totp_enabled = true; S.ui.twofa = null; S.ui.codes = r.codes || null; ME.recovery_left = (r.codes || []).length; U.toast('Two-factor is on.'); U.render(); }).catch(function (e) { U.toast('<b>Not turned on.</b> ' + esc(e.message)); }); };
  A.rcnew = function () { api('POST', '/2fa/recovery', { current: val('rc_pw') }).then(function (r) { S.ui.codes = r.codes; ME.recovery_left = r.codes.length; U.render(); }).catch(function (e) { U.toast('<b>No new codes.</b> ' + esc(e.message)); }); };
  A.rcsave = function () { S.ui.codes = null; U.render(); };
  A.rccopy = function () { var t = (S.ui.codes || []).join('\n'); try { navigator.clipboard.writeText(t).then(function () { U.toast('Copied.'); }, function () { U.toast('Could not copy. Select the codes and copy by hand.'); }); } catch (e) { U.toast('Could not copy. Select the codes and copy by hand.'); } };
  A.emailsave = function () { api('POST', '/me/email', { email: val('em_new'), current: document.getElementById('em_pw').value }).then(function (r) { ME.email = r.email; U.toast(r.email ? 'Email saved.' : 'Email removed.'); U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.devemail = function () { api('POST', '/admin/user-email', { login_id: val('de_id'), email: val('de_em') }).then(function () { DEV = null; U.toast('Email saved.'); U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.mailtest = function () { U.toast('Sending test email.'); api('POST', '/admin/mail-test', {}).then(function () { U.toast('Test email sent. Check your inbox and spam.'); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.relseen = function () { relSeen(); U.render(); };
  A.devforget = function () { api('POST', '/2fa/forget-devices', {}).then(function () { U.toast('All remembered devices forgotten.'); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.flag = function (el) { api('POST', '/flags/' + el.getAttribute('data-id'), { on: el.getAttribute('data-on') === '1' }).then(function () { DEV = null; return reload(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.ucreate = function () {
    var nm = val('nu_name'), lid = val('nu_id').toLowerCase(), role = val('nu_role');
    api('POST', '/admin/users', { name: nm, login_id: lid, role: role }).then(function (r) { S.ui.nl = { path: r.path, who: nm }; PPL = null; DEV = null; U.render(); })
      .catch(function (e) { U.toast('<b>Not created.</b> ' + esc(e.message)); });
  };
  A.ulink = function (el) {
    var lid = el.getAttribute('data-id');
    api('POST', '/admin/reset-link', { login_id: lid }).then(function (r) { S.ui.nl = { path: r.path, who: lid }; PPL = null; DEV = null; U.render(); }).catch(function (e) { U.toast(esc(e.message)); });
  };
  A.uactive = function (el) {
    api('POST', '/admin/users/' + el.getAttribute('data-id') + '/active', { active: el.getAttribute('data-on') === '1' }).then(function () { PPL = null; DEV = null; U.render(); }).catch(function (e) { U.toast(esc(e.message)); });
  };
  A.ctmake = function () { api('POST', '/admin/claude-token', { minutes: +val('ct_min'), write: val('ct_w') === '1' }).then(function (r) { S.ui.ct = r; DEV = null; U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.ctrevoke = function () { api('POST', '/admin/claude-token/revoke', {}).then(function () { S.ui.ct = null; DEV = null; U.toast('All Claude codes are off.'); U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.rlink = function () { var v = val('rl_id'); if (!v) return; api('POST', '/admin/reset-link', { login_id: v }).then(function (r) { S.ui.rl = r.path; DEV = null; U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };
  A.revoke = function () { var v = val('rl_id'); if (!v) return; api('POST', '/admin/revoke', { login_id: v }).then(function () { DEV = null; U.toast('Signed out everywhere.'); U.render(); }).catch(function (e) { U.toast(esc(e.message)); }); };

  /* selects and checkboxes */
  document.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-chg]') : null; if (!el) return;
    var k = el.getAttribute('data-chg'), id = el.getAttribute('data-id'), v = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'lstage') { var p = String(v).split('|'); run(api('PATCH', '/leads/' + id, p[0] === 'away' ? { stage: 'away', away_reason: p[1] } : { stage: p[0] }), 'Stage updated.'); }
    else if (k === 'ltag') run(api('PATCH', '/leads/' + id, { tag: v }));
    else if (k === 'lowner') run(api('PATCH', '/leads/' + id, { owner: v }));
    else if (k === 'llist') run(api('PATCH', '/leads/' + id, { list: v }), 'Moved to ' + (v === 'any' ? 'Any industry' : 'ICP') + '.');
    else if (k === 'fulist') { S.ui.fuList = v; U.render(); }
    else if (k === 'wtarget') run(api('POST', '/settings/watch_target', { value: +v }));
    else if (k === 'wwho') { S.ui.wwho = v; U.render(); }
    else if (k === 'wown') { S.ui.wown = v; U.render(); }
    else if (k === 'wkindf') { S.ui.wkind = v; U.render(); }
    else if (k === 'wshow') { S.ui.wshow = v; U.render(); }
    else if (k === 'wowner') run(api('PATCH', '/watch/' + id, { owner: v }));
    else if (k === 'wkind') run(api('PATCH', '/watch/' + id, { kind: v }));
    else if (k === 'lown') { S.ui.lown = v; U.render(); }
    else if (k === 'lq') { S.ui.lq = v; U.render(); }
    else if (k === 'fuwho') { S.ui.fuWho = v; U.render(); }
    else if (k === 'tkwho') { S.ui.tkWho = v; U.render(); }
    else if (k === 'tkfarea') { S.ui.tkArea = v; U.render(); }
    else if (k === 'tkdoneview') { S.ui.tkDone = v; U.render(); }
    else if (k === 'tktitle') { if (String(v).trim()) run(api('PATCH', '/tasks/' + id, { title: v })); }
    else if (k === 'tkstatus') run(api('PATCH', '/tasks/' + id, { status: v }));
    else if (k === 'tkowner') run(api('PATCH', '/tasks/' + id, { owner: v }));
    else if (k === 'tkpri') run(api('PATCH', '/tasks/' + id, { priority: v }));
    else if (k === 'tkarea') run(api('PATCH', '/tasks/' + id, { area: v }));
    else if (k === 'tkdue') run(api('PATCH', '/tasks/' + id, { due: v || null }));
    else if (k === 'tknotes') run(api('PATCH', '/tasks/' + id, { notes: v }));
    else if (k === 'tkcheck') { var t = task(id), i = +el.getAttribute('data-i'); if (t) { var c = t.checks.map(function (x) { return { t: x.t, d: x.d }; }); c[i].d = v; run(api('PATCH', '/tasks/' + id, { checks: c })); } }
    else if (k === 'rdone') run(api('PATCH', '/radar/' + id, { done: v }));
  });
})();
