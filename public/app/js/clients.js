/* Clients (1.7.2). Delivery only: whose move it is, next step, journey, touches, checklist, terms, tasks.
   Money (price, payments, revenue share) is not here. It goes in a Billing section later. */
(function () {
  var U = window.U, S = U.S, esc = U.esc, pill = U.pill, ME = window.UNS_ME || {};
  var live0 = U.isLive; U.isLive = function (k) { return k === 'clients' || live0(k); };
  var D = null, ERR = null, busy = false, saving = false;
  var PEOPLE = U.OWNERS || ['Tabish', 'Ali', 'Mehak'];
  var STAGES = [['onboarding', 'Onboarding'], ['pilot', 'Pilot'], ['active', 'Active'], ['review', 'Review'], ['ended', 'Ended']];
  var TERMS = [['open', 'Not sent'], ['sent', 'Sent, waiting'], ['agreed', 'Agreed']];
  var TONE = { onboarding: '', pilot: 'warn', active: 'good', review: 'warn', ended: 'mut' };
  var CHECKS = ['Terms sent', 'Terms agreed', 'Kickoff done', 'First post live', 'First review done'];

  var css = document.createElement('style');
  css.textContent = '.cl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}'
    + '.cl-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(max-width:620px){.cl-form{grid-template-columns:minmax(0,1fr)}}'
    + '.cl-form .w{grid-column:1/-1}.cl-say{font:800 18px/1.3 "Plus Jakarta Sans",Inter,sans-serif;overflow-wrap:anywhere}'
    + '.cl-ev{font-size:13px;padding:6px 0;border-top:1px solid var(--line);display:flex;gap:10px;justify-content:space-between}.cl-ev:first-child{border-top:0}'
    + '.cl-rail{display:flex;gap:6px;flex-wrap:wrap}.cl-rail span{font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;background:var(--surface-2);color:var(--muted);border:1px solid var(--line)}'
    + '.cl-rail span.on{background:var(--brand);color:var(--brand-fg);border-color:transparent}.cl-rail span.done{color:var(--fg)}'
    + '.cl-week{display:flex;gap:6px}.cl-week i{width:22px;height:22px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line)}.cl-week i.on{background:var(--brand);border-color:transparent}'
    + '.cl-chk{display:flex;gap:8px;align-items:center;padding:6px 0;font-size:14px}.cl-chk input{width:18px;height:18px}'
    + '.cl-need{border-left:4px solid var(--warn)}';
  document.head.appendChild(css);

  function api(method, path, body) {
    return fetch('/app/api' + path, { method: method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .catch(function () { throw new Error('No connection. Try again when you are back online.'); })
      .then(function (r) { if (r.status === 401) { location.replace('/app/login.html'); throw new Error('auth'); } return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Failed'); return j; }); });
  }
  function load() {
    busy = true;
    return api('GET', '/clients').then(function (d) { D = d; ERR = null; busy = false; U.render(); }).catch(function (e) { busy = false; ERR = e.message; U.render(); });
  }
  function fail(e) { saving = false; if (e.message !== 'auth') U.toast('<b>Not saved.</b> ' + esc(e.message)); U.render(); }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function lab(l, v) { for (var i = 0; i < l.length; i++) if (l[i][0] === v) return l[i][1]; return v || ''; }
  function opts(list, v) { return list.map(function (x) { var a = Array.isArray(x) ? x[0] : x, b = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(a) + '"' + (a === v ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join(''); }
  function today() { return (U.live && U.live.today) || new Date().toISOString().slice(0, 10); }
  function fmt(d) { return d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''; }
  function get(id) { return D && D.clients.filter(function (c) { return c.id === id; })[0]; }
  function tasksOf(id) { return D.tasks.filter(function (t) { return t.client_id === id && t.status !== 'done'; }); }
  function inputF(l, id, v, extra) { return '<label class="f">' + l + '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '" ' + (extra || '') + '></label>'; }
  function checks(c) { try { var a = JSON.parse(c.checklist || '[]'); return CHECKS.map(function (_, i) { return a[i] ? 1 : 0; }); } catch (e) { return [0, 0, 0, 0, 0]; } }
  function head(t, sub, actions) { return '<div class="head"><div><h1>' + esc(t) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><div class="row">' + (actions || '') + '</div></div>'; }
  function touchDays(id) { var s = {}; D.events.forEach(function (e) { if (e.client_id === id && e.kind === 'touch' && e.day) s[e.day] = 1; }); return s; }
  function lastTouch(id) {
    var t = D.events.filter(function (e) { return e.client_id === id && e.kind === 'touch'; })[0];
    if (!t) return null;
    return Math.max(0, Math.round((Date.parse(today() + 'T12:00:00Z') - Date.parse(String(t.day || t.at).slice(0, 10) + 'T12:00:00Z')) / 864e5));
  }
  /* the one sentence: whose move, and how quiet it has been */
  function say(c) {
    var q = lastTouch(c.id), quiet = q == null ? 'No contact logged yet' : q === 0 ? 'Spoke today' : 'Last contact ' + q + ' day' + (q === 1 ? '' : 's') + ' ago';
    var who = c.ball === 'them' ? 'Waiting on them' : 'Your move, ' + c.owner;
    return who + '. ' + quiet + '.';
  }
  function needsUs(c) {
    if (c.stage === 'ended') return false;
    var q = lastTouch(c.id);
    return (c.ball === 'us' && (q == null || q >= 2)) || (c.next_checkin && c.next_checkin <= today());
  }

  /* ---------- skeleton ---------- */
  function skel() { return '<div class="cl-grid"><div class="sk" style="height:150px"></div><div class="sk" style="height:150px"></div></div>'; }

  /* ---------- list ---------- */
  function newCard() {
    var leads = ((U.live && U.live.leads) || []).filter(function (l) { return !D.clients.some(function (c) { return c.lead_id === l.id; }); });
    return '<div class="card"><h3 style="margin-bottom:8px">New client</h3><div class="stack" style="gap:10px">'
      + (leads.length ? '<label class="f">From a lead<select id="cn_lead"><option value="">Not from a lead</option>' + leads.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(l.name + (l.company ? ', ' + l.company : '')) + '</option>'; }).join('') + '</select></label>' : '')
      + inputF('Name (if not from a lead)', 'cn_name', '', 'maxlength="120"')
      + '<label class="f">Owner<select id="cn_owner">' + opts(PEOPLE, ME.name) + '</select></label>'
      + inputF('Package', 'cn_pkg', '', 'maxlength="120" placeholder="Pilot, 30 days"')
      + '<div class="row"><button type="button" class="btn pri sm" data-act="clcreate">Add client</button><button type="button" class="btn sm" data-act="clnew" data-id="0">Cancel</button></div></div></div>';
  }
  function card(c) {
    var late = c.next_checkin && c.next_checkin < today();
    return '<div class="card stack' + (needsUs(c) ? ' cl-need' : '') + '" style="gap:10px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><div style="min-width:0"><h2 style="overflow-wrap:anywhere">' + esc(c.name) + '</h2><div class="mut sm">' + esc(c.company || c.package || '') + '</div></div>' + pill(lab(STAGES, c.stage), TONE[c.stage]) + '</div>'
      + '<div class="cl-say">' + esc(say(c)) + '</div>'
      + '<div class="sm"><span class="mut">Next:</span> ' + esc(c.next_step || 'Nothing set') + (c.next_checkin ? ' <span class="' + (late ? 'bad' : 'mut') + '">(' + (late ? 'late, ' : '') + fmt(c.next_checkin) + ')</span>' : '') + '</div>'
      + '<div class="row"><button type="button" class="btn pri sm" data-act="cltouch" data-id="' + esc(c.id) + '">Log a touch</button><button type="button" class="btn sm" data-act="clopen" data-id="' + esc(c.id) + '">Details</button></div></div>';
  }
  function listView() {
    var h = head('Clients', 'Whose move it is, and what happens next.', '<button type="button" class="btn pri sm" data-act="clnew" data-id="1">New client</button>');
    if (S.ui.clNew && D) h += newCard();
    if (!D) return h + (ERR ? '<div class="banner">Could not load clients. ' + esc(ERR) + '</div>' : skel());
    if (!D.clients.length) return h + '<div class="empty">No clients yet. Press New client, or pick a lead.</div>';
    var need = D.clients.filter(needsUs);
    if (need.length) h += '<div class="card cl-need"><b>Needs us today:</b> ' + need.map(function (c) { return esc(c.name); }).join(', ') + '</div>';
    return h + '<div class="cl-grid">' + D.clients.map(card).join('') + '</div>';
  }

  /* ---------- details ---------- */
  function detail(c) {
    var tasks = tasksOf(c.id), evs = D.events.filter(function (e) { return e.client_id === c.id; }).slice(0, 15), ck = checks(c);
    var si = 0; STAGES.forEach(function (s, i) { if (s[0] === c.stage) si = i; });
    var next = STAGES[si + 1];
    var days = touchDays(c.id), wk = '';
    for (var i = 6; i >= 0; i--) { var d = new Date(Date.parse(today() + 'T12:00:00Z') - i * 864e5).toISOString().slice(0, 10); wk += '<i class="' + (days[d] ? 'on' : '') + '" title="' + d + '"></i>'; }
    var h = '<div class="row"><button type="button" class="btn sm" data-act="clopen" data-id="">All clients</button></div>'
      + head(c.name, esc(c.company || ''), '<button type="button" class="btn pri sm" data-act="cltouch" data-id="' + esc(c.id) + '">Log a touch</button>');
    h += '<div class="card stack" style="gap:12px"><div class="cl-say">' + esc(say(c)) + '</div>'
      + '<div class="row"><span class="mut sm">Ball is with</span><button type="button" class="btn sm' + (c.ball === 'us' ? ' pri' : '') + '" data-act="clball" data-id="' + esc(c.id) + '" data-v="us">Us</button><button type="button" class="btn sm' + (c.ball === 'them' ? ' pri' : '') + '" data-act="clball" data-id="' + esc(c.id) + '" data-v="them">Them</button></div>'
      + '<div class="cl-rail">' + STAGES.map(function (s, i) { return '<span class="' + (i === si ? 'on' : i < si ? 'done' : '') + '">' + s[1] + '</span>'; }).join('') + '</div>'
      + (next ? '<div class="row"><button type="button" class="btn sm" data-act="clstage" data-id="' + esc(c.id) + '" data-v="' + next[0] + '">Move to ' + next[1] + '</button></div>' : '')
      + '<div><div class="mut sm" style="margin-bottom:6px">Last 7 days of contact</div><div class="cl-week">' + wk + '</div></div></div>';
    h += '<div class="card"><h3 style="margin-bottom:6px">Checklist</h3>' + CHECKS.map(function (t, i) { return '<label class="cl-chk"><input type="checkbox" data-act="clchk" data-id="' + esc(c.id) + '" data-i="' + i + '"' + (ck[i] ? ' checked' : '') + '> ' + esc(t) + '</label>'; }).join('') + '</div>';
    h += '<div class="card"><h3 style="margin-bottom:8px">Plan and terms</h3><div class="cl-form">'
      + '<label class="f">Terms<select id="cd_terms_status">' + opts(TERMS, c.terms_status) + '</select></label>'
      + '<label class="f">Owner<select id="cd_owner">' + opts(PEOPLE, c.owner) + '</select></label>'
      + inputF('Package', 'cd_package', c.package, 'maxlength="120"')
      + inputF('Next check-in', 'cd_next_checkin', c.next_checkin, 'type="date"')
      + inputF('Pilot starts', 'cd_pilot_start', c.pilot_start, 'type="date"')
      + inputF('Pilot ends', 'cd_pilot_end', c.pilot_end, 'type="date"')
      + '<div class="w">' + inputF('Next step', 'cd_next_step', c.next_step, 'maxlength="200"') + '</div>'
      + '<div class="w"><label class="f">Terms in short<textarea id="cd_terms" rows="4" maxlength="2000" placeholder="What we do, for how long, what happens after the pilot. Money goes in Billing.">' + esc(c.terms || '') + '</textarea></label></div>'
      + '<div class="w"><label class="f">Notes<textarea id="cd_notes" rows="3" maxlength="2000">' + esc(c.notes || '') + '</textarea></label></div>'
      + '</div><div class="row" style="margin-top:10px"><button type="button" class="btn pri sm" data-act="clsave" data-id="' + esc(c.id) + '"' + (saving ? ' disabled' : '') + '>Save</button></div></div>';
    h += '<div class="card"><h3 style="margin-bottom:8px">Tasks</h3>'
      + (tasks.length ? '<div class="list">' + tasks.map(function (t) {
        return '<div class="item"><div class="mn"><div class="t">' + esc(t.title) + '</div><div class="d">' + esc(t.owner || '') + (t.due ? ' · ' + fmt(t.due) : '') + '</div></div></div>';
      }).join('') + '</div>' : '<div class="empty">No open tasks.</div>')
      + '<div class="cl-form" style="margin-top:10px"><div class="w">' + inputF('New task', 'ct_title', '', 'maxlength="200"') + '</div>'
      + '<label class="f">Owner<select id="ct_owner">' + opts(PEOPLE, c.owner) + '</select></label>' + inputF('Due', 'ct_due', '', 'type="date"')
      + '</div><div class="row" style="margin-top:10px"><button type="button" class="btn sm" data-act="cltask" data-id="' + esc(c.id) + '">Add task</button></div></div>';
    h += '<div class="card"><h3 style="margin-bottom:8px">History</h3>' + (evs.length ? evs.map(function (e) { return '<div class="cl-ev"><span>' + esc(e.detail || e.kind) + '</span><span class="mut">' + esc(e.by || '') + ' · ' + esc(String(e.at).slice(0, 10)) + '</span></div>'; }).join('') : '<div class="empty">Nothing yet.</div>') + '</div>';
    return h;
  }

  U.screens.clients = function () {
    if (!D && !busy && !ERR) load();
    var c = S.ui.clId && D && get(S.ui.clId);
    return '<div class="stack">' + (c ? detail(c) : listView()) + '</div>';
  };

  var A = U.acts;
  function patch(id, b, msg) {
    return api('PATCH', '/clients/' + id, b).then(load).then(function () { if (msg) U.toast(msg); }).catch(fail);
  }
  A.clnew = function (el) { S.ui.clNew = el.getAttribute('data-id') === '1'; U.render(); };
  A.clopen = function (el) { S.ui.clId = el.getAttribute('data-id') || null; U.render(); window.scrollTo(0, 0); };
  A.clcreate = function () {
    var lead = val('cn_lead'), body = lead ? { lead_id: lead, owner: val('cn_owner'), package: val('cn_pkg') } : { name: val('cn_name'), owner: val('cn_owner'), package: val('cn_pkg') };
    api('POST', '/clients', body).then(function (r) { S.ui.clNew = false; S.ui.clId = r.id; return load(); }).then(function () { U.toast('Client added.'); }).catch(fail);
  };
  A.cltouch = function (el) {
    api('POST', '/clients/' + el.getAttribute('data-id') + '/touch', {}).then(load).then(function () { U.toast('Logged. Ball is with them.'); }).catch(fail);
  };
  A.clball = function (el) { patch(el.getAttribute('data-id'), { ball: el.getAttribute('data-v') }); };
  A.clstage = function (el) { patch(el.getAttribute('data-id'), { stage: el.getAttribute('data-v') }, 'Moved.'); };
  A.clchk = function (el) {
    var c = get(el.getAttribute('data-id')); if (!c) return;
    var ck = checks(c); ck[+el.getAttribute('data-i')] = el.checked ? 1 : 0;
    patch(c.id, { checklist: ck });
  };
  A.clsave = function (el) {
    if (saving) return; saving = true;
    var b = {}; ['terms_status', 'owner', 'package', 'pilot_start', 'pilot_end', 'next_step', 'next_checkin', 'terms', 'notes'].forEach(function (k) { b[k] = val('cd_' + k); });
    api('PATCH', '/clients/' + el.getAttribute('data-id'), b)
      .then(function () { saving = false; return load(); }).then(function () { U.toast('Saved.'); })
      .catch(function (e) { if (e.message === 'Nothing to change.') { saving = false; U.toast('Nothing changed.'); U.render(); } else fail(e); });
  };
  A.cltask = function (el) {
    var t = val('ct_title'); if (!t) { U.toast('Write the task first.'); return; }
    api('POST', '/tasks', { title: t, owner: val('ct_owner'), due: val('ct_due') || null, area: 'Clients', client_id: el.getAttribute('data-id') })
      .then(load).then(function () { U.toast('Task added.'); }).catch(fail);
  };
})();
