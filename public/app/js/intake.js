/* Intake (founder side). Forms and responses live in permanent tables.
   Founder forms are answered one question at a time by each founder, then compared. */
(function () {
  var U = window.U, S = U.S, esc = U.esc, pill = U.pill, ME = window.UNS_ME || {};
  (function () { var at = -1; U.SECTIONS.forEach(function (x, i) { if (x[3] === 'Daily') at = i; }); U.SECTIONS.splice(at + 1, 0, ['intake', 'Intake', 'inbox', 'Daily']); })();
  S.flags.intake = { back: true, client: false };
  var live0 = U.isLive; U.isLive = function (k) { return k === 'intake' || live0(k); };
  var D = null, ERR = null, busy = false, saving = false, ans = {};
  var AUD = [['founder', 'Founders'], ['contractor', 'Contractors'], ['client', 'Clients']];
  var PEOPLE = U.OWNERS || ['Tabish', 'Ali', 'Mehak'];

  var css = document.createElement('style');
  css.textContent = '.iq-chips{display:flex;flex-wrap:wrap;gap:8px}.iq-chip{border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:99px;padding:10px 15px;min-height:44px;font:inherit;font-weight:500;cursor:pointer;text-align:left}'
    + '.iq-chip[aria-pressed="true"]{background:var(--brand);color:var(--brand-fg);border-color:var(--brand)}'
    + '.iq-bar{height:6px;background:var(--surface-2);border-radius:99px;overflow:hidden}.iq-bar i{display:block;height:100%;background:var(--brand);border-radius:99px}'
    + '.iq-big{font:800 34px/1 "Plus Jakarta Sans",Inter,sans-serif;color:var(--brand)}.iq-q{font:700 21px/1.25 "Plus Jakarta Sans",Inter,sans-serif;text-wrap:balance}'
    + '.iq-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}@media(max-width:620px){.iq-cols{grid-template-columns:minmax(0,1fr)}}'
    + '.iq-col{background:var(--surface-2);border-radius:12px;padding:12px;min-width:0;overflow-wrap:anywhere}.iq-col .eyebrow{display:block;margin-bottom:6px}'
    + '.iq-pills{display:flex;flex-wrap:wrap;gap:6px}.iq-pill{font-size:13px;border-radius:99px;padding:3px 10px;background:var(--surface);border:1px solid var(--line)}.iq-pill.all{background:var(--brand);color:var(--brand-fg);border-color:var(--brand)}'
    + '.iq-row{padding:16px 0;border-top:1px solid var(--line)}.iq-row:first-child{border-top:0;padding-top:0}'
    + '.iq-track{height:10px;background:var(--surface-2);border-radius:99px;position:relative;margin:8px 0 4px}.iq-track i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--brand)}'
    + '.iq-ends{display:flex;justify-content:space-between;gap:10px}.iq-nm{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:10px}'
    + '.iq-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.iq-in textarea{min-height:110px}'
    + '.iq-range{width:100%;accent-color:var(--brand);height:36px}';
  document.head.appendChild(css);

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
  function fail(e) { saving = false; if (e.message !== 'auth') U.toast('<b>Not saved.</b> ' + esc(e.message)); U.render(); }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function form(id) { return D && D.forms.filter(function (f) { return f.id === id; })[0]; }
  function resp(fid) { return D ? D.responses.filter(function (r) { return r.form_id === fid; }) : []; }
  function mine(fid) { return resp(fid).filter(function (r) { return r.who === ME.name; })[0]; }
  function day(iso) { return String(iso || '').slice(0, 10); }
  function dkey(f) { return 'uns-intake-draft-' + f.id + '-' + ME.name; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function isFounder(f) { return f.audience === 'founder'; }
  function allDone(f) { var w = resp(f.id).map(function (r) { return r.who; }); return PEOPLE.every(function (p) { return w.indexOf(p) > -1; }); }
  function revealed(f) { return !isFounder(f) || (f.config && f.config.reveal) !== 'all' || allDone(f); }

  function emptyAns(f) { var a = {}; f.fields.forEach(function (q) { a[q.id] = q.type === 'multi' ? [] : q.type === 'slider' ? q.def : ''; }); return a; }
  function loadAns(f) {
    var m = mine(f.id), base = emptyAns(f);
    if (m) { ans = Object.assign(base, m.answers); return; }
    try { var d = store(dkey(f)); ans = Object.assign(base, d ? JSON.parse(d) : {}); } catch (e) { ans = base; }
  }
  function saveDraft(f) { store(dkey(f), JSON.stringify(ans)); }
  function answered(q) {
    var v = ans[q.id];
    if (q.type === 'multi') return q.exact ? v.length === q.exact : v.length > 0;
    if (q.type === 'slider') return true;
    return !!String(v == null ? '' : v).trim();
  }

  function parseQs(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m;
      if ((m = l.match(/^pick:\s*(.+?)\s*\|\s*(.+)$/i))) return { type: 'pick', label: m[1], options: m[2].split(',').map(function (x) { return x.trim(); }).filter(Boolean) };
      if ((m = l.match(/^multi:\s*(.+?)\s*\|\s*(.+)$/i))) return { type: 'multi', label: m[1], options: m[2].split(',').map(function (x) { return x.trim(); }).filter(Boolean) };
      if ((m = l.match(/^slider:\s*(.+?)\s*\|\s*(\d+)\s*-\s*(\d+)(?:\s*\|\s*([^,]+),\s*(.+))?$/i))) return { type: 'slider', label: m[1], min: +m[2], max: +m[3], lo: m[4] || '', hi: m[5] || '' };
      if ((m = l.match(/^long:\s*(.+)$/i))) return { type: 'long', label: m[1] };
      return { type: 'short', label: l.replace(/^short:\s*/i, '') };
    });
  }

  /* ---------- list and builder ---------- */
  function newCard() {
    return '<div class="card"><h3 style="margin-bottom:8px">New form</h3><div class="stack" style="gap:10px">'
      + '<label class="f">Title<input id="in_t" maxlength="120" placeholder="Contractor intake"></label>'
      + '<label class="f">What it is for<input id="in_a" maxlength="500" placeholder="One line the person will read first"></label>'
      + '<label class="f">Who fills it<select id="in_w">' + AUD.map(function (a) { return '<option value="' + a[0] + '">' + a[1] + '</option>'; }).join('') + '</select></label>'
      + '<label class="f">Questions, one per line<textarea id="in_q" rows="8" placeholder="What do you do best?\nlong: Describe a week that went well.\npick: How do you work? | Mornings, Evenings\nmulti: Which do you enjoy? | Sales, Design, Ops\nslider: How loud should we be? | 0-100 | Whisper, Shouting"></textarea></label>'
      + '<div class="sm mut">A plain line is a short answer. Start with <b>long:</b>, <b>pick:</b> (one choice), <b>multi:</b> (many choices) or <b>slider:</b>. For pick and multi write the question, a bar, then the choices with commas.</div>'
      + '<div class="row"><button type="button" class="btn pri sm" data-act="infcreate">Create form</button><button type="button" class="btn sm" data-act="innew" data-id="0">Cancel</button></div></div></div>';
  }
  function status(f) {
    if (!isFounder(f)) return resp(f.id).length + (resp(f.id).length === 1 ? ' response' : ' responses');
    var n = PEOPLE.filter(function (p) { return resp(f.id).some(function (r) { return r.who === p; }); }).length;
    return n + ' of ' + PEOPLE.length + ' answered';
  }
  function listView() {
    var h = '<div class="head"><div><h1>Intake</h1><div class="sub">Forms and every response, kept permanently. Only the three founders see this.</div></div><div class="row"><button type="button" class="btn pri sm" data-act="innew" data-id="1">New form</button></div></div>';
    if (S.ui.inNew) h += newCard();
    if (!D) return h + (ERR ? '<div class="banner">Could not load intake. ' + esc(ERR) + '</div>' : '<div class="empty">Loading.</div>');
    if (!D.forms.length) return h + '<div class="empty">No forms yet. Press New form to make the first one.</div>';
    h += '<div class="list">' + D.forms.map(function (f) {
      var m = isFounder(f) ? (mine(f.id) ? pill('You: done', 'good') : pill('You: not yet', 'warn')) : '';
      return '<div class="item" style="align-items:center;flex-wrap:wrap;gap:8px"><div class="mn" style="flex:1 1 220px;min-width:0"><div class="t">' + esc(f.title) + '</div><div class="d">' + f.fields.length + ' questions. ' + esc(status(f)) + '. ' + esc(f.about || '') + '</div></div>'
        + '<div class="row" style="gap:6px">' + m + pill(lab(AUD, f.audience), 'mut') + (f.status === 'open' ? '' : pill('Closed', 'mut')) + '<button type="button" class="btn sm' + (isFounder(f) && !mine(f.id) && f.status === 'open' ? ' pri' : '') + '" data-act="inopen" data-id="' + esc(f.id) + '">' + (isFounder(f) && !mine(f.id) && f.status === 'open' ? 'Answer' : 'Open') + '</button></div></div>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- form home ---------- */
  function manualAdd(f) {
    if (f.status !== 'open') return '<div class="banner">This form is closed. Reopen it to add responses.</div>';
    return '<div class="card"><h3 style="margin-bottom:8px">Add a response</h3><div class="stack" style="gap:10px">'
      + '<label class="f">From<input id="ir_who" maxlength="120" placeholder="Name of the person"></label>'
      + f.fields.map(function (q) {
        var id = 'ir_' + q.id;
        if (q.type === 'long') return '<label class="f">' + esc(q.label) + '<textarea id="' + id + '" rows="4"></textarea></label>';
        if (q.type === 'pick') return '<label class="f">' + esc(q.label) + '<select id="' + id + '"><option value="">Choose</option>' + q.options.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') + '</select></label>';
        if (q.type === 'multi') return '<label class="f">' + esc(q.label) + '<input id="' + id + '" placeholder="Choices, separated by commas"></label>';
        if (q.type === 'slider') return '<label class="f">' + esc(q.label) + ' (' + q.min + ' to ' + q.max + ')<input id="' + id + '" inputmode="numeric"></label>';
        return '<label class="f">' + esc(q.label) + '<input id="' + id + '" maxlength="500"></label>';
      }).join('')
      + '<div class="row"><button type="button" class="btn pri sm" data-act="inrsave" data-id="' + esc(f.id) + '">Save response</button></div></div></div>';
  }
  function show(q, v) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (Array.isArray(v)) return v.join(', ');
    return String(v) + (q.type === 'slider' ? (q.unit || '') : '');
  }
  function formView(f) {
    var rs = resp(f.id), m = mine(f.id), fo = isFounder(f);
    var h = '<div class="head"><div><h1>' + esc(f.title) + '</h1><div class="sub">' + esc(f.about || '') + '</div></div><div class="row"><button type="button" class="btn sm" data-act="inopen" data-id="">All forms</button></div></div>';
    h += '<div class="row" style="gap:6px">' + pill(lab(AUD, f.audience), 'mut') + (f.status === 'open' ? '' : pill('Closed', 'mut')) + '<span class="sm mut">' + f.fields.length + ' questions' + ((f.config && f.config.time) ? ', ' + esc(f.config.time.toLowerCase()) : '') + '. Questions lock after the first response.</span></div>';
    if (fo) {
      h += '<div class="card stack"><div>' + (f.config && f.config.intro ? '<p class="sm mut" style="margin:0 0 10px">' + esc(f.config.intro) + '</p>' : '') + '</div><div class="row">'
        + (f.status === 'open' ? '<button type="button" class="btn pri" data-act="intake" data-id="' + esc(f.id) + '">' + (m ? 'Edit my answers' : 'Start. Answer one at a time') + '</button>' : '')
        + (rs.length ? '<button type="button" class="btn" data-act="inres" data-id="' + esc(f.id) + '">' + (m ? 'See results' : 'See what is in so far') + '</button>' : '') + '</div>'
        + '<div>' + PEOPLE.map(function (p) { var r = rs.filter(function (x) { return x.who === p; })[0]; return '<div class="row" style="justify-content:space-between;padding:8px 0;border-top:1px solid var(--line)"><span>' + esc(p) + (p === ME.name ? ' (you)' : '') + '</span>' + (r ? pill('Answered ' + esc(day(r.updated_at || r.created_at)), 'good') : pill('Waiting', 'warn')) + '</div>'; }).join('') + '</div></div>';
    } else {
      h += manualAdd(f);
      h += '<h3>Responses (' + rs.length + ')</h3>';
      h += rs.length ? '<div class="list">' + rs.map(function (r) {
        return '<div class="item" style="flex-direction:column;align-items:stretch"><div class="row" style="justify-content:space-between;gap:8px"><div><b>' + esc(r.who) + '</b> <span class="sm mut">' + esc(day(r.created_at)) + ', added by ' + esc(r.created_by || '') + '</span></div><button type="button" class="btn sm" data-act="inrdel" data-id="' + esc(r.id) + '">Delete</button></div>'
          + '<div class="stack" style="gap:8px;margin-top:8px">' + f.fields.map(function (q) { var a = show(q, r.answers[q.id]); return a ? '<div class="sm"><span class="mut">' + esc(q.label) + '</span><div style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(a) + '</div></div>' : ''; }).join('') + '</div></div>';
      }).join('') + '</div>' : '<div class="empty">No responses yet.</div>';
    }
    h += '<div class="row"><button type="button" class="btn sm" data-act="instatus" data-id="' + esc(f.id) + '">' + (f.status === 'open' ? 'Close form' : 'Reopen form') + '</button><button type="button" class="btn sm" data-act="infdel" data-id="' + esc(f.id) + '">Delete form</button></div>';
    return h;
  }

  /* ---------- answering, one question at a time ---------- */
  function takeView(f) {
    var step = Math.min(S.ui.inStep || 0, f.fields.length - 1), q = f.fields[step], v = ans[q.id], last = step === f.fields.length - 1;
    var h = '<div class="card stack"><div><div class="iq-head"><span class="eyebrow">' + esc(q.section || f.title) + '</span><span class="sm mut">' + (step + 1) + ' of ' + f.fields.length + '</span></div>'
      + '<div class="iq-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + f.fields.length + '" aria-valuenow="' + (step + 1) + '" style="margin:6px 0 16px"><i style="width:' + ((step + 1) / f.fields.length * 100) + '%"></i></div>'
      + '<div class="iq-q">' + esc(q.label) + '</div>' + (q.type === 'multi' ? '<p class="sm mut" style="margin:6px 0 0">' + (q.exact ? 'Pick exactly ' + q.exact + '. ' + v.length + ' chosen.' : 'Pick as many as fit.') + '</p>' : '') + '</div>';
    if (q.type === 'pick' || q.type === 'multi') {
      h += '<div class="iq-chips">' + q.options.map(function (o) { var on = q.type === 'multi' ? v.indexOf(o) > -1 : v === o; return '<button type="button" class="iq-chip" aria-pressed="' + on + '" data-act="inopt" data-o="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') + '</div>';
    } else if (q.type === 'slider') {
      h += '<div class="iq-big" id="iq_sv">' + v + esc(q.unit || '') + '</div><input type="range" class="iq-range" id="iq_sl" min="' + q.min + '" max="' + q.max + '" value="' + v + '" aria-label="' + esc(q.label) + '">'
        + (q.lo || q.hi ? '<div class="iq-ends"><span class="sm mut">' + esc(q.lo || '') + '</span><span class="sm mut">' + esc(q.hi || '') + '</span></div>' : '');
    } else if (q.type === 'long') {
      h += '<div class="iq-in"><textarea id="iq_tx" placeholder="' + esc(q.ph || '') + '" aria-label="' + esc(q.label) + '">' + esc(v) + '</textarea></div>';
    } else {
      h += '<input id="iq_tx" maxlength="500" placeholder="' + esc(q.ph || '') + '" aria-label="' + esc(q.label) + '" value="' + esc(v) + '">';
    }
    h += '<div class="row"><button type="button" class="btn" data-act="inback">' + (step === 0 ? 'Leave. Draft is kept' : 'Back') + '</button><button type="button" class="btn pri" id="iq_next" data-act="innext"' + (answered(q) && !saving ? '' : ' disabled') + '>' + (last ? (saving ? 'Saving' : 'Submit') : 'Next') + '</button></div></div>';
    return h;
  }

  /* ---------- results ---------- */
  function others(f) { return resp(f.id); }
  function ansOf(f, who) { var r = resp(f.id).filter(function (x) { return x.who === who; })[0]; return r ? r.answers : null; }
  function verdict(f, q, present) {
    var vs = present.map(function (p) { return ansOf(f, p)[q.id]; });
    if (present.length < 2) return { tag: '', shared: [] };
    if (q.type === 'multi') {
      var sh = q.options.filter(function (o) { return vs.every(function (x) { return (x || []).indexOf(o) > -1; }); });
      return { tag: sh.length ? pill(sh.length + ' shared', 'good') : pill('nothing shared', 'warn'), shared: sh };
    }
    if (q.type === 'pick') return { tag: vs.every(function (x) { return x === vs[0]; }) ? pill('aligned', 'good') : pill('differs', 'warn'), shared: [] };
    if (q.type === 'slider') { var n = vs.map(Number), sp = Math.max.apply(null, n) - Math.min.apply(null, n); return { tag: sp <= Math.round((q.max - q.min) * 0.15) ? pill('close', 'good') : pill('apart by ' + sp + (q.unit || ''), 'warn'), shared: [] }; }
    return { tag: pill('read together', 'mut'), shared: [] };
  }
  function cell(f, q, who, sh) {
    var a = ansOf(f, who); if (!a) return '<span class="mut">Not answered yet</span>';
    var v = a[q.id];
    if (q.type === 'multi') return '<div class="iq-pills">' + (v || []).map(function (o) { return '<span class="iq-pill' + (sh.indexOf(o) > -1 ? ' all' : '') + '">' + esc(o) + '</span>'; }).join('') + '</div>';
    if (q.type === 'slider') return '<b>' + esc(v == null ? '' : v) + esc(q.unit || '') + '</b>';
    return v ? '<span style="white-space:pre-wrap">' + esc(v) + '</span>' : '<span class="mut">Blank</span>';
  }
  function compareBody(f) {
    var present = PEOPLE.filter(function (p) { return ansOf(f, p); }), sec = '', h = '';
    f.fields.forEach(function (q) {
      if (q.section && q.section !== sec) { sec = q.section; h += '<h3 style="margin:18px 0 0">' + esc(sec) + '</h3>'; }
      var vd = verdict(f, q, present);
      h += '<div class="iq-row"><div class="iq-head"><b>' + esc(q.label) + '</b>' + vd.tag + '</div><div class="iq-cols">' + PEOPLE.map(function (p) { return '<div class="iq-col"><span class="eyebrow">' + esc(p) + '</span>' + cell(f, q, p, vd.shared) + '</div>'; }).join('') + '</div></div>';
    });
    return h;
  }
  function ownBody(f) {
    var a = ansOf(f, ME.name), sec = '', h = '';
    if (!a) return '<div class="empty">You have not answered yet.</div>';
    f.fields.forEach(function (q) {
      if (q.section && q.section !== sec) { sec = q.section; h += '<h3 style="margin:18px 0 0">' + esc(sec) + '</h3>'; }
      var s = show(q, a[q.id]); h += '<div class="iq-row"><div class="sm mut">' + esc(q.label) + '</div><div style="white-space:pre-wrap">' + esc(s || 'Blank') + '</div></div>';
    });
    return h;
  }
  /* traits */
  function score(f, a) {
    var T = f.config.traits || {}, raw = {}, mn = {}, mx = {};
    Object.keys(T).forEach(function (k) { raw[k] = 0; mn[k] = 0; mx[k] = 0; });
    f.fields.forEach(function (q) {
      if (q.type === 'pick' && q.weights) {
        var keys = {}; q.weights.forEach(function (w) { Object.keys(w).forEach(function (k) { keys[k] = 1; }); });
        var idx = q.options.indexOf(a[q.id]);
        Object.keys(keys).forEach(function (k) { var vs = q.weights.map(function (w) { return w[k] || 0; }); mn[k] += Math.min.apply(null, vs); mx[k] += Math.max.apply(null, vs); raw[k] += idx > -1 ? (q.weights[idx][k] || 0) : 0; });
      } else if (q.type === 'slider' && q.w) {
        Object.keys(q.w).forEach(function (k) { var fr = (Number(a[q.id]) - q.min) / (q.max - q.min); raw[k] += q.w[k] * (2 * fr - 1); mn[k] -= Math.abs(q.w[k]); mx[k] += Math.abs(q.w[k]); });
      }
    });
    var s = {}; Object.keys(T).forEach(function (k) { s[k] = mx[k] === mn[k] ? 50 : Math.round((raw[k] - mn[k]) / (mx[k] - mn[k]) * 100); });
    return s;
  }
  function band(v) { return v < 36 ? 'L' : v > 64 ? 'H' : 'M'; }
  function tbar(v) { return '<div class="iq-track" role="img" aria-label="' + v + ' out of 100"><i style="width:' + v + '%"></i></div>'; }
  function tprofile(f, who) {
    var a = ansOf(f, who), T = f.config.traits || {}, s = score(f, a), h = '';
    h += Object.keys(T).map(function (k) { var t = T[k], v = s[k]; return '<div class="iq-row"><div class="iq-head"><b>' + esc(t.n) + '</b><span class="sm mut">' + v + ' / 100</span></div>' + tbar(v) + '<div class="iq-ends"><span class="sm mut">' + esc(t.lo) + '</span><span class="sm mut">' + esc(t.hi) + '</span></div><p class="sm" style="margin:8px 0 0">' + esc(t[band(v)]) + '</p></div>'; }).join('');
    var bs = a[f.config.best] || [], dr = a[f.config.drain] || [];
    h += '<div class="iq-row"><h3>Where you help most</h3><div class="iq-pills" style="margin-top:8px">' + (bs.length ? bs.map(function (r) { return '<span class="iq-pill all">' + esc(r) + '</span>'; }).join('') : '<span class="mut">None picked</span>') + '</div></div>';
    h += '<div class="iq-row"><h3>Where you need cover</h3><div class="iq-pills" style="margin-top:8px">' + (dr.length ? dr.map(function (r) { return '<span class="iq-pill">' + esc(r) + '</span>'; }).join('') : '<span class="mut">None picked</span>') + '</div></div>';
    h += '<div class="iq-row"><h3>How you work</h3><div class="stack" style="gap:6px;margin-top:8px">' + f.fields.filter(function (q) { return q.style; }).map(function (q) { return '<div><span class="eyebrow">' + esc(q.style) + '</span><div>' + esc(a[q.id] || '') + '</div></div>'; }).join('') + '</div></div>';
    h += '<div class="iq-row"><div class="iq-cols" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + f.fields.filter(function (q) { return q.own; }).map(function (q) { return '<div><span class="eyebrow">' + esc(q.own) + '</span><div style="white-space:pre-wrap">' + esc(a[q.id] || '') + '</div></div>'; }).join('') + '</div></div>';
    return h;
  }
  function tteam(f) {
    var T = f.config.traits || {}, sc = {}, h = '', roles = [];
    PEOPLE.forEach(function (p) { sc[p] = score(f, ansOf(f, p)); });
    h += Object.keys(T).map(function (k) {
      var vs = PEOPLE.map(function (p) { return sc[p][k]; }), sp = Math.max.apply(null, vs) - Math.min.apply(null, vs);
      return '<div class="iq-row"><div class="iq-head"><b>' + esc(T[k].n) + '</b>' + (sp <= 20 ? pill('similar', 'good') : pill(sp + ' apart', 'warn')) + '</div>' + PEOPLE.map(function (p) { return '<div class="iq-nm"><span>' + esc(p) + '</span><span>' + sc[p][k] + '</span></div>' + tbar(sc[p][k]); }).join('') + '<div class="iq-ends"><span class="sm mut">' + esc(T[k].lo) + '</span><span class="sm mut">' + esc(T[k].hi) + '</span></div></div>';
    }).join('');
    var bq = f.fields.filter(function (q) { return q.id === f.config.best; })[0]; roles = bq ? bq.options : [];
    h += '<div class="iq-row"><h3>Who covers what</h3>' + roles.map(function (r) {
      var st = PEOPLE.filter(function (p) { return (ansOf(f, p)[f.config.best] || []).indexOf(r) > -1; }), dr = PEOPLE.filter(function (p) { return (ansOf(f, p)[f.config.drain] || []).indexOf(r) > -1; });
      var tag = !st.length ? pill('nobody\'s strength', 'warn') : dr.length === PEOPLE.length ? pill('all drained', 'warn') : pill('covered', 'good');
      return '<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="iq-head"><b>' + esc(r) + '</b>' + tag + '</div><div class="sm mut">Strong: ' + esc(st.join(', ') || 'no one') + '. Drained: ' + esc(dr.join(', ') || 'no one') + '.</div></div>';
    }).join('') + '</div>';
    f.fields.filter(function (q) { return q.style; }).forEach(function (q) { h += '<div class="iq-row"><h3>' + esc(q.style) + '</h3><div class="iq-cols">' + PEOPLE.map(function (p) { return '<div class="iq-col"><span class="eyebrow">' + esc(p) + '</span>' + esc(ansOf(f, p)[q.id] || '') + '</div>'; }).join('') + '</div></div>'; });
    h += '<div class="iq-row"><h3>In their own words</h3><div class="iq-cols">' + PEOPLE.map(function (p) { return '<div class="iq-col"><span class="eyebrow">' + esc(p) + '</span>' + f.fields.filter(function (q) { return q.own; }).map(function (q) { return '<div class="sm" style="margin-bottom:6px"><b>' + esc(q.own) + ':</b> ' + esc(ansOf(f, p)[q.id] || '') + '</div>'; }).join('') + '</div>'; }).join('') + '</div></div>';
    return h;
  }
  function resultsView(f) {
    var rev = revealed(f), traits = (f.config && f.config.view) === 'traits', tab = S.ui.inTab || 'mine';
    var waiting = PEOPLE.filter(function (p) { return !ansOf(f, p); });
    var h = '<div class="head"><div><h1>' + esc(f.title) + '</h1><div class="sub">' + (traits ? (tab === 'team' ? 'The team. Differences are good, they show who covers what.' : 'Your profile. Scores run 0 to 100 and none is better than another.') : (rev ? 'Side by side. Read the gaps out loud, then log what you settle.' : 'Your answers. The others appear when all three have answered.')) + '</div></div><div class="row"><button type="button" class="btn sm" data-act="inopen" data-id="' + esc(f.id) + '">Back to form</button>' + (f.status === 'open' ? '<button type="button" class="btn sm" data-act="intake" data-id="' + esc(f.id) + '">Edit my answers</button>' : '') + '</div></div>';
    if (!rev) h += '<div class="banner">Waiting on ' + esc(waiting.join(' and ')) + '. You see only your own answers until all three are in, so nobody reads the others first.</div>';
    if (traits && ansOf(f, ME.name)) h += '<div class="row"><button type="button" class="btn sm' + (tab === 'mine' ? ' pri' : '') + '" data-act="intab" data-id="mine">My profile</button><button type="button" class="btn sm' + (tab === 'team' ? ' pri' : '') + '" data-act="intab" data-id="team"' + (rev ? '' : ' disabled') + '>Team' + (rev ? '' : ' (locked)') + '</button></div>';
    var body = !ansOf(f, ME.name) && !rev ? '<div class="empty">You have not answered yet.</div>' : traits ? (tab === 'team' && rev ? tteam(f) : tprofile(f, ME.name)) : (rev ? compareBody(f) : ownBody(f));
    return h + '<div class="card">' + body + '</div>';
  }

  U.screens.intake = function () {
    if (!D && !busy && !ERR) load();
    var f = S.ui.inForm && form(S.ui.inForm), v = S.ui.inView;
    var h = f ? (v === 'take' ? takeView(f) : v === 'res' ? resultsView(f) : formView(f)) : listView();
    return '<div class="stack">' + h + '</div>';
  };

  var A = U.acts;
  A.innew = function (el) { S.ui.inNew = el.getAttribute('data-id') === '1'; U.render(); };
  A.inopen = function (el) { S.ui.inForm = el.getAttribute('data-id') || null; S.ui.inView = null; S.ui.inStep = 0; U.render(); window.scrollTo(0, 0); };
  A.intake = function (el) { var f = form(el.getAttribute('data-id')); if (!f) return; loadAns(f); S.ui.inForm = f.id; S.ui.inView = 'take'; S.ui.inStep = 0; U.render(); window.scrollTo(0, 0); };
  A.inres = function (el) { S.ui.inForm = el.getAttribute('data-id'); S.ui.inView = 'res'; S.ui.inTab = 'mine'; U.render(); window.scrollTo(0, 0); };
  A.intab = function (el) { S.ui.inTab = el.getAttribute('data-id'); U.render(); };
  A.infcreate = function () {
    api('POST', '/intake/forms', { title: val('in_t'), about: val('in_a'), audience: val('in_w'), fields: parseQs(val('in_q')) })
      .then(function (r) { S.ui.inNew = false; S.ui.inForm = r.id; S.ui.inView = null; return load(); }).then(function () { U.toast('Form created.'); }).catch(fail);
  };
  A.instatus = function (el) { var f = form(el.getAttribute('data-id')); if (!f) return; api('PATCH', '/intake/forms/' + f.id, { status: f.status === 'open' ? 'closed' : 'open' }).then(load).catch(fail); };
  A.infdel = function (el) {
    if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Press again. Deletes all responses'; return; }
    api('DELETE', '/intake/forms/' + el.getAttribute('data-id')).then(function () { S.ui.inForm = null; S.ui.inView = null; return load(); }).then(function () { U.toast('Form deleted.'); }).catch(fail);
  };
  A.inrdel = function (el) {
    if (el.getAttribute('data-sure') !== '1') { el.setAttribute('data-sure', '1'); el.textContent = 'Press again to delete'; return; }
    api('DELETE', '/intake/responses/' + el.getAttribute('data-id')).then(load).then(function () { U.toast('Response deleted.'); }).catch(fail);
  };
  A.inrsave = function (el) {
    var f = form(el.getAttribute('data-id')); if (!f) return;
    var a = {}; f.fields.forEach(function (q) {
      var v = val('ir_' + q.id);
      a[q.id] = q.type === 'multi' ? v.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : q.type === 'slider' ? (v === '' ? '' : Number(v)) : v;
    });
    api('POST', '/intake/forms/' + f.id + '/responses', { who: val('ir_who'), answers: a }).then(load).then(function () { U.toast('Response saved.'); }).catch(fail);
  };
  /* wizard */
  function cur() { var f = S.ui.inForm && form(S.ui.inForm); return f && f.fields[Math.min(S.ui.inStep || 0, f.fields.length - 1)] ? { f: f, q: f.fields[Math.min(S.ui.inStep || 0, f.fields.length - 1)] } : null; }
  A.inopt = function (el) {
    var c = cur(); if (!c) return; var o = el.getAttribute('data-o'), q = c.q, v = ans[q.id];
    if (q.type === 'multi') { var i = v.indexOf(o); if (i > -1) v.splice(i, 1); else if (!q.exact || v.length < q.exact) v.push(o); } else ans[q.id] = o;
    saveDraft(c.f); U.render();
  };
  A.inback = function () { var c = cur(); if (!c) return; if (!(S.ui.inStep > 0)) { S.ui.inView = null; } else S.ui.inStep--; U.render(); window.scrollTo(0, 0); };
  A.innext = function () {
    var c = cur(); if (!c || !answered(c.q) || saving) return;
    if ((S.ui.inStep || 0) < c.f.fields.length - 1) { S.ui.inStep = (S.ui.inStep || 0) + 1; U.render(); window.scrollTo(0, 0); return; }
    saving = true; U.render();
    api('POST', '/intake/forms/' + c.f.id + '/responses', { answers: ans }).then(function () { saving = false; store(dkey(c.f), null); S.ui.inView = 'res'; S.ui.inTab = 'mine'; return load(); }).then(function () { U.toast('Saved.'); }).catch(fail);
  };
  /* typing and sliders must not re-render the screen */
  document.addEventListener('input', function (e) {
    var t = e.target, c = cur(); if (!c || S.ui.inView !== 'take') return;
    if (t.id === 'iq_tx') { ans[c.q.id] = t.value; saveDraft(c.f); var b = document.getElementById('iq_next'); if (b) b.disabled = !answered(c.q) || saving; }
    else if (t.id === 'iq_sl') { ans[c.q.id] = Number(t.value); var sv = document.getElementById('iq_sv'); if (sv) sv.textContent = t.value + (c.q.unit || ''); saveDraft(c.f); }
  });
})();
