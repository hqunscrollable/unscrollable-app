/* Build dashboard (Tabish only). Reads STATUS.json through the API and keeps internal notes in the database. */
(function () {
  var U = window.U, S = U.S, esc = U.esc, pill = U.pill, ME = window.UNS_ME;
  U.SECTIONS.push(['build', 'Build', 'code', 'System']);
  S.flags.build = { back: true, client: false };
  var B = null, ERR = null, SHIP = {}, TAGS = ['Idea', 'Decision', 'Remember', 'Bug', 'Question'];
  var st = S.ui.b = { fs: 'All', nt: 'All', q: '', edit: null };
  try { SHIP = JSON.parse(localStorage.getItem('uns-ship') || '{}') || {}; } catch (e) { SHIP = {}; }

  var css = document.createElement('style');
  css.textContent = '.bento{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.bento .wide{grid-column:span 2}.bento .tall{grid-row:span 2}'
    + '@media(max-width:820px){.bento{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.bento{grid-template-columns:minmax(0,1fr)}.bento .wide{grid-column:auto}}'
    + '.bt{display:flex;flex-direction:column;gap:6px;justify-content:space-between}.bt .big{font:800 30px/1 "Plus Jakarta Sans",Inter,sans-serif;letter-spacing:-.02em}.bt .k{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em}'
    + '.bt.hot{background:var(--brand);color:var(--brand-fg);border-color:var(--brand)}.bt.hot,.bt.hot b,.bt.hot span{color:var(--brand-fg)}.bt.hot .k{opacity:.85}'
    + '.bdbar{height:8px;border-radius:99px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden}.bdbar i{display:block;height:100%;background:var(--brand)}'
    + '.bn{border-top:1px solid var(--line);padding:10px 0;display:flex;gap:10px;align-items:flex-start}.bn:first-child{border-top:0}.bn .tx{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}'
    + '.ck{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--line)}.ck:first-child{border-top:0}.ck input{width:20px;height:20px;min-width:20px;padding:0;margin:2px 0 0;flex:none}';
  document.head.appendChild(css);

  function api(method, path, body) {
    return fetch('/app/api' + path, { method: method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { if (r.status === 401) { location.href = '/app/login.html'; throw new Error('auth'); } return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Failed'); return j; }); });
  }
  function load() { return api('GET', '/admin/build').then(function (d) { B = d; ERR = null; U.render(); }).catch(function (e) { ERR = e.message; U.render(); }); }
  function stateOf(f) { return f.state; }
  var ORDER = ['Idea', 'Designed', 'Built', 'Tested', 'Deployed'];
  function tone(s) { return s === 'Deployed' ? 'good' : s === 'Tested' || s === 'Built' ? '' : s === 'Designed' ? 'warn' : 'mut'; }
  function ago(iso) { var d = Math.round((Date.now() - Date.parse(iso)) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; }

  U.screens.build = function () {
    var h = '<div class="head"><div><h1>Build</h1><div class="sub">The whole app at a glance, and your own notes. Only you can see this.</div></div><div class="row"><button type="button" class="btn sm" data-act="bload">Refresh</button></div></div>';
    if (ERR) return '<div class="stack">' + h + '<div class="banner warn">Could not load. ' + esc(ERR) + '</div></div>';
    if (!B) { load(); return '<div class="stack">' + h + '<div class="empty">Loading</div></div>'; }
    var s = B.status, f = s.features || [], dep = f.filter(function (x) { return x.state === 'Deployed'; }).length;
    var behind = s.live !== s.built;
    h += '<div class="bento">'
      + '<div class="card tile bt"><span class="k">Live now</span><b class="big">' + esc(s.live) + '</b><span class="sm mut">What your users see</span></div>'
      + '<div class="card tile bt' + (behind ? ' hot' : '') + '"><span class="k">Built</span><b class="big">' + esc(s.built) + '</b><span class="sm">' + (behind ? 'Waiting for you to deploy' : 'Same as live') + '</span></div>'
      + '<div class="card tile bt"><span class="k">Next</span><b class="big">' + esc(s.next) + '</b><span class="sm mut">Designing</span></div>'
      + '<div class="card tile bt"><span class="k">Features live</span><b class="big">' + dep + '<span class="mut" style="font-size:16px"> / ' + f.length + '</span></b><div class="bdbar"><i style="width:' + Math.round(dep / Math.max(1, f.length) * 100) + '%"></i></div></div>'
      + '<div class="card wide"><h3 style="margin-bottom:6px">Right now</h3><div>' + esc(s.right_now || '') + '</div><h3 style="margin:14px 0 6px">Blocked on you</h3>' + (s.blocked_on_tabish || []).map(function (x) { return '<div class="sm" style="padding:3px 0">• ' + esc(x) + '</div>'; }).join('') + '</div>'
      + '<div class="card wide"><h3 style="margin-bottom:8px">Phases</h3>' + (s.phases || []).map(function (p) { var pc = Math.round(p.done / Math.max(1, p.total) * 100); return '<div style="margin-bottom:9px"><div class="row" style="justify-content:space-between"><span class="sm"><b>' + esc(p.name) + '</b></span><span class="sm mut tn">' + p.done + '/' + p.total + '</span></div><div class="bdbar"><i style="width:' + pc + '%"></i></div></div>'; }).join('') + '</div>'
      + '</div>';
    // ship checklist
    var steps = s.pending_on_pc || [], dn = steps.filter(function (_, i) { return SHIP[i]; }).length;
    h += '<div class="grid g2" style="align-items:start"><div class="card"><div class="row" style="justify-content:space-between"><h3>Ship checklist</h3>' + pill(dn + ' of ' + steps.length, dn === steps.length && steps.length ? 'good' : '') + '</div><div class="sm mut" style="margin:4px 0 8px">Your steps on your PC. Ticks stay in this browser only.</div>'
      + (steps.length ? steps.map(function (t, i) { return '<label class="ck"><input type="checkbox" data-act="bship" data-id="' + i + '"' + (SHIP[i] ? ' checked' : '') + '><span' + (SHIP[i] ? ' class="mut"' : '') + '>' + esc(t) + '</span></label>'; }).join('') : '<div class="empty">Nothing to ship.</div>') + '</div>'
      + '<div class="card"><h3 style="margin-bottom:8px">Next three</h3>' + (s.next_three || []).map(function (t, i) { return '<div class="ck"><b class="tn">' + (i + 1) + '</b><span>' + esc(t) + '</span></div>'; }).join('') + '<h3 style="margin:14px 0 8px">Risks</h3>' + (s.risks || []).map(function (t) { return '<div class="sm" style="padding:4px 0">• ' + esc(t) + '</div>'; }).join('') + '</div></div>';
    // features
    var fl = f.filter(function (x) { return st.fs === 'All' || x.state === st.fs; });
    h += '<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h3>Features</h3><div class="tabs">' + ['All'].concat(ORDER).map(function (x) { return '<button type="button" data-act="bfs" data-id="' + x + '" aria-pressed="' + (st.fs === x) + '">' + x + '</button>'; }).join('') + '</div></div><div class="grid g2" style="margin-top:10px">'
      + (fl.length ? fl.map(function (x) { return '<div class="card tight"><div class="row" style="justify-content:space-between;gap:8px"><b>' + esc(x.name) + '</b>' + pill(x.state, tone(x.state)) + '</div><div class="sm mut" style="margin-top:4px">' + esc(x.ver || '') + (x.note ? '. ' + esc(x.note) : '') + '</div></div>'; }).join('') : '<div class="empty">None in this state.</div>') + '</div></div>';
    // notes
    var q = st.q.toLowerCase(), nl = B.notes.filter(function (n) { return (st.nt === 'All' || n.tag === st.nt) && (!q || n.text.toLowerCase().indexOf(q) >= 0); });
    h += '<div class="card"><h3 style="margin-bottom:4px">My notes</h3><div class="sm mut" style="margin-bottom:10px">Private to you. Saved in the app database, so Claude can read them when you ask.</div>'
      + '<div class="stack" style="gap:8px"><textarea id="bn_t" rows="3" maxlength="4000" placeholder="Write a note for later"></textarea><div class="row"><select id="bn_g" style="width:auto">' + TAGS.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select><label class="row sm" style="gap:6px"><input type="checkbox" id="bn_p" style="width:18px;height:18px;min-height:0;padding:0"> Pin</label><button type="button" class="btn pri" data-act="bnadd">Save note</button></div></div>'
      + '<div class="row" style="margin:14px 0 6px;flex-wrap:wrap"><div class="tabs">' + ['All'].concat(TAGS).map(function (x) { return '<button type="button" data-act="bnt" data-id="' + x + '" aria-pressed="' + (st.nt === x) + '">' + x + '</button>'; }).join('') + '</div><input id="bn_q" placeholder="Search notes" value="' + esc(st.q) + '" style="flex:1;min-width:140px"></div>'
      + (nl.length ? nl.map(function (n) {
        if (st.edit === n.id) return '<div class="bn"><div class="tx"><textarea id="be_t" rows="3" maxlength="4000">' + esc(n.text) + '</textarea><div class="row" style="margin-top:6px"><button type="button" class="btn sm pri" data-act="bnsave" data-id="' + n.id + '">Save</button><button type="button" class="btn sm" data-act="bnedit" data-id="">Cancel</button></div></div></div>';
        return '<div class="bn"><div class="tx">' + (n.pin ? '📌 ' : '') + esc(n.text) + '<div class="sm mut" style="margin-top:4px">' + pill(n.tag) + ' ' + esc(ago(n.updated_at)) + '</div></div><div class="row" style="gap:4px"><button type="button" class="btn sm" data-act="bnpin" data-id="' + n.id + '">' + (n.pin ? 'Unpin' : 'Pin') + '</button><button type="button" class="btn sm" data-act="bnedit" data-id="' + n.id + '">Edit</button><button type="button" class="btn sm bad" data-act="bndel" data-id="' + n.id + '">Delete</button></div></div>';
      }).join('') : '<div class="empty">No notes yet.</div>') + '</div>';
    h += '<div class="card scroll"><h3 style="margin-bottom:8px">Changelog</h3><table class="tbl"><tbody>' + (s.changelog || []).map(function (c) { return '<tr><td class="tn"><b>' + esc(c.v) + '</b></td><td class="tn mut">' + esc(c.date) + '</td><td>' + esc(c.text) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<div class="sm mut">Source: STATUS.json in the repo. Claude updates it at the end of every build (rule in CLAUDE.md). Updated ' + esc(s.updated || '') + '.</div>';
    return '<div class="stack">' + h + '</div>';
  };

  var A = U.acts;
  function fail(e) { if (e.message !== 'auth') U.toast('<b>Not saved.</b> ' + esc(e.message)); }
  A.bload = function () { load(); };
  A.bfs = function (el) { st.fs = el.getAttribute('data-id'); U.render(); };
  A.bnt = function (el) { st.nt = el.getAttribute('data-id'); U.render(); };
  A.bship = function (el) { SHIP[el.getAttribute('data-id')] = el.checked; try { localStorage.setItem('uns-ship', JSON.stringify(SHIP)); } catch (e) {} U.render(); };
  A.bnadd = function () {
    var t = document.getElementById('bn_t').value.trim(); if (!t) { U.toast('Write something first.'); return; }
    api('POST', '/admin/notes', { text: t, tag: document.getElementById('bn_g').value, pin: document.getElementById('bn_p').checked }).then(function () { return load(); }).then(function () { U.toast('Note saved.'); }).catch(fail);
  };
  A.bnpin = function (el) { var n = B.notes.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; api('PATCH', '/admin/notes/' + n.id, { pin: !n.pin }).then(load).catch(fail); };
  A.bnedit = function (el) { st.edit = el.getAttribute('data-id') || null; U.render(); };
  A.bnsave = function (el) { api('PATCH', '/admin/notes/' + el.getAttribute('data-id'), { text: document.getElementById('be_t').value }).then(function () { st.edit = null; return load(); }).catch(fail); };
  A.bndel = function (el) {
    if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Sure?'; return; }
    api('DELETE', '/admin/notes/' + el.getAttribute('data-id')).then(load).catch(fail);
  };
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'bn_q') { st.q = e.target.value; var pos = e.target.selectionStart; U.render(); var i = document.getElementById('bn_q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} } } });
})();
