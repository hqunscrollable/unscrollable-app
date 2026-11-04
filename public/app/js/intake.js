/* Intake (founder side). Forms and responses live in permanent tables. Founders read everything here.
   The private link page for contractors and clients comes in a later build. */
(function () {
  var U = window.U, S = U.S, esc = U.esc, pill = U.pill;
  U.SECTIONS.push(['intake', 'Intake', 'inbox', 'Business']);
  S.flags.intake = { back: true, client: false };
  var live0 = U.isLive; U.isLive = function (k) { return k === 'intake' || live0(k); };
  var D = null, ERR = null, busy = false;
  var AUD = [['founder', 'Founders'], ['contractor', 'Contractors'], ['client', 'Clients']];
  function lab(l, v) { for (var i = 0; i < l.length; i++) if (l[i][0] === v) return l[i][1]; return v; }
  function api(method, path, body) {
    return fetch('/app/api' + path, { method: method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' }, body: body === undefined ? undefined : JSON.stringify(body) })
      .catch(function () { throw new Error('No connection. Try again when you are back online.'); })
      .then(function (r) { if (r.status === 401) { location.replace('/app/login.html'); throw new Error('auth'); } return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Failed'); return j; }); });
  }
  function load() {
    busy = true;
    return api('GET', '/intake').then(function (d) { D = d; ERR = null; busy = false; U.render(); }).catch(function (e) { busy = false; ERR = e.message; U.render(); });
  }
  function fail(e) { if (e.message !== 'auth') U.toast('<b>Not saved.</b> ' + esc(e.message)); }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function form(id) { return D && D.forms.filter(function (f) { return f.id === id; })[0]; }
  function resp(fid) { return D ? D.responses.filter(function (r) { return r.form_id === fid; }) : []; }
  function day(iso) { return String(iso || '').slice(0, 10); }

  function parseQs(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m;
      if ((m = l.match(/^pick:\s*(.+?)\s*\|\s*(.+)$/i))) return { type: 'pick', label: m[1], options: m[2].split(',').map(function (x) { return x.trim(); }).filter(Boolean) };
      if ((m = l.match(/^long:\s*(.+)$/i))) return { type: 'long', label: m[1] };
      return { type: 'short', label: l.replace(/^short:\s*/i, '') };
    });
  }

  function newCard() {
    return '<div class="card"><h3 style="margin-bottom:8px">New form</h3><div class="stack" style="gap:10px">'
      + '<label class="f">Title<input id="in_t" maxlength="120" placeholder="Founder Traits"></label>'
      + '<label class="f">What it is for<input id="in_a" maxlength="500" placeholder="One line the person will read first"></label>'
      + '<label class="f">Who fills it<select id="in_w">' + AUD.map(function (a) { return '<option value="' + a[0] + '">' + a[1] + '</option>'; }).join('') + '</select></label>'
      + '<label class="f">Questions, one per line<textarea id="in_q" rows="7" placeholder="What do you do best?\nlong: Describe a week that went well.\npick: How do you work? | Mornings, Evenings, Both"></textarea></label>'
      + '<div class="sm mut">A plain line is a short answer. Start with <b>long:</b> for a long answer. Start with <b>pick:</b> then the question, a bar, and the choices with commas.</div>'
      + '<div class="row"><button type="button" class="btn pri sm" data-act="infcreate">Create form</button><button type="button" class="btn sm" data-act="innew" data-id="0">Cancel</button></div></div></div>';
  }

  function listView() {
    var h = '<div class="head"><div><h1>Intake</h1><div class="sub">Forms and every response, kept permanently. Only the three founders see this.</div></div><div class="row"><button type="button" class="btn pri sm" data-act="innew" data-id="1">New form</button></div></div>';
    if (S.ui.inNew) h += newCard();
    if (!D) return h + (ERR ? '<div class="banner">Could not load intake. ' + esc(ERR) + '</div>' : '<div class="empty">Loading.</div>');
    if (!D.forms.length) return h + '<div class="empty">No forms yet. Press New form to make the first one.</div>';
    h += '<div class="list">' + D.forms.map(function (f) {
      var n = resp(f.id).length;
      return '<div class="item" style="align-items:center"><div class="mn" style="flex:1;min-width:0"><div class="t">' + esc(f.title) + '</div><div class="d">' + f.fields.length + ' questions. ' + n + (n === 1 ? ' response' : ' responses') + '. ' + esc(f.about || '') + '</div></div>'
        + '<div class="row" style="gap:6px">' + pill(lab(AUD, f.audience), 'mut') + pill(f.status === 'open' ? 'Open' : 'Closed', f.status === 'open' ? '' : 'mut') + '<button type="button" class="btn sm" data-act="inopen" data-id="' + esc(f.id) + '">Open</button></div></div>';
    }).join('') + '</div>';
    return h;
  }

  function addForm(f) {
    if (f.status !== 'open') return '<div class="banner">This form is closed. Reopen it to add responses.</div>';
    return '<div class="card"><h3 style="margin-bottom:8px">Add a response</h3><div class="stack" style="gap:10px">'
      + '<label class="f">From<input id="ir_who" maxlength="120" placeholder="Name of the person"></label>'
      + f.fields.map(function (q) {
        var id = 'ir_' + q.id;
        if (q.type === 'long') return '<label class="f">' + esc(q.label) + '<textarea id="' + id + '" rows="4"></textarea></label>';
        if (q.type === 'pick') return '<label class="f">' + esc(q.label) + '<select id="' + id + '"><option value="">Choose</option>' + q.options.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select></label>';
        return '<label class="f">' + esc(q.label) + '<input id="' + id + '" maxlength="500"></label>';
      }).join('')
      + '<div class="row"><button type="button" class="btn pri sm" data-act="inrsave" data-id="' + esc(f.id) + '">Save response</button></div></div></div>';
  }

  function formView(f) {
    var rs = resp(f.id);
    var h = '<div class="head"><div><h1>' + esc(f.title) + '</h1><div class="sub">' + esc(f.about || '') + '</div></div><div class="row"><button type="button" class="btn sm" data-act="inopen" data-id="">All forms</button>'
      + '<button type="button" class="btn sm" data-act="instatus" data-id="' + esc(f.id) + '">' + (f.status === 'open' ? 'Close form' : 'Reopen form') + '</button>'
      + '<button type="button" class="btn sm" data-act="infdel" data-id="' + esc(f.id) + '">Delete form</button></div></div>';
    h += '<div class="row" style="gap:6px">' + pill(lab(AUD, f.audience), 'mut') + pill(f.status === 'open' ? 'Open' : 'Closed', f.status === 'open' ? '' : 'mut') + '<span class="sm mut">' + f.fields.length + ' questions. Questions lock after the first response.</span></div>';
    h += addForm(f);
    h += '<h3>Responses (' + rs.length + ')</h3>';
    h += rs.length ? '<div class="list">' + rs.map(function (r) {
      return '<div class="item" style="flex-direction:column;align-items:stretch"><div class="row" style="justify-content:space-between;gap:8px"><div><b>' + esc(r.who) + '</b> <span class="sm mut">' + esc(day(r.created_at)) + ', added by ' + esc(r.created_by || '') + '</span></div><button type="button" class="btn sm" data-act="inrdel" data-id="' + esc(r.id) + '">Delete</button></div>'
        + '<div class="stack" style="gap:8px;margin-top:8px">' + f.fields.map(function (q) { var a = r.answers[q.id]; return a ? '<div class="sm"><span class="mut">' + esc(q.label) + '</span><div style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(a) + '</div></div>' : ''; }).join('') + '</div></div>';
    }).join('') + '</div>' : '<div class="empty">No responses yet.</div>';
    return h;
  }

  U.screens.intake = function () {
    if (!D && !busy && !ERR) load();
    var f = S.ui.inForm && form(S.ui.inForm);
    return '<div class="stack">' + (f ? formView(f) : listView()) + '</div>';
  };

  var A = U.acts;
  A.innew = function (el) { S.ui.inNew = el.getAttribute('data-id') === '1'; U.render(); };
  A.inopen = function (el) { S.ui.inForm = el.getAttribute('data-id') || null; U.render(); window.scrollTo(0, 0); };
  A.infcreate = function () {
    api('POST', '/intake/forms', { title: val('in_t'), about: val('in_a'), audience: val('in_w'), fields: parseQs(val('in_q')) })
      .then(function (r) { S.ui.inNew = false; S.ui.inForm = r.id; return load(); }).then(function () { U.toast('Form created.'); }).catch(fail);
  };
  A.instatus = function (el) { var f = form(el.getAttribute('data-id')); if (!f) return; api('PATCH', '/intake/forms/' + f.id, { status: f.status === 'open' ? 'closed' : 'open' }).then(load).catch(fail); };
  A.infdel = function (el) {
    if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Press again. Deletes all responses'; return; }
    api('DELETE', '/intake/forms/' + el.getAttribute('data-id')).then(function () { S.ui.inForm = null; return load(); }).then(function () { U.toast('Form deleted.'); }).catch(fail);
  };
  A.inrsave = function (el) {
    var f = form(el.getAttribute('data-id')); if (!f) return;
    var a = {}; f.fields.forEach(function (q) { a[q.id] = val('ir_' + q.id); });
    api('POST', '/intake/forms/' + f.id + '/responses', { who: val('ir_who'), answers: a }).then(load).then(function () { U.toast('Response saved.'); }).catch(fail);
  };
  A.inrdel = function (el) {
    if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Press again to delete'; return; }
    api('DELETE', '/intake/responses/' + el.getAttribute('data-id')).then(load).then(function () { U.toast('Response deleted.'); }).catch(fail);
  };
})();
