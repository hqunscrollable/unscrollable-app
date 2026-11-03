/* Phone shell (1.4.0): slim header, bottom tab bar (Dashboard, Leads, Tasks, More), More list, phone Dashboard.
   Only active at phone width. Desktop keeps the sidebar layout. */
(function () {
  'use strict';
  var U = window.U, S = U.S, A = U.acts, esc = U.esc, ME = window.UNS_ME;
  var mq = window.matchMedia ? matchMedia('(max-width:760px)') : { matches: false };
  function isPhone() { return !!mq.matches; }

  /* header */
  var top = document.createElement('header');
  top.id = 'mtop';
  top.innerHTML = '<span class="mmark" aria-hidden="true">' + (U.MARK || '') + '</span><b>Unscrollable</b><button type="button" class="mav" data-act="pacct" aria-label="My account">' + esc((ME && ME.name || 'U').charAt(0).toUpperCase()) + '</button>';
  /* tab bar */
  var I = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    leads: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
    more: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  var TABS = [['home', 'Dashboard'], ['leads', 'Leads'], ['tasks', 'Tasks'], ['more', 'More']];
  var tabs = document.createElement('nav');
  tabs.id = 'mtabs'; tabs.setAttribute('aria-label', 'Main');
  tabs.innerHTML = TABS.map(function (t) {
    return '<button type="button" data-act="ptab" data-id="' + t[0] + '"><span class="ti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[t[0]] + '</svg></span><span>' + t[1] + '</span></button>';
  }).join('');
  var appEl = document.querySelector('.app');
  document.body.insertBefore(top, appEl || document.body.firstChild); document.body.appendChild(tabs);

  function sync() {
    var r = S.route, main = ['home', 'leads', 'tasks'];
    var k = main.indexOf(r) >= 0 ? r : 'more';
    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
      if (b.getAttribute('data-id') === k) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  A.pacct = function () { U.go('account'); };
  A.ptab = function (el) {
    var id = el.getAttribute('data-id');
    if (id === S.route) { window.scrollTo(0, 0); return; }
    U.go(id);
  };
  var mainEl = document.getElementById('main');
  if (mainEl && window.MutationObserver) new MutationObserver(sync).observe(mainEl, { childList: true });
  sync();

  /* Dashboard: phone layout on phones, the desktop Today screen otherwise */
  var deskHome = U.screens.home;
  U.screens.home = U.screens.followups = function () { return isPhone() && U.phoneHome ? U.phoneHome() : deskHome(); };

  /* More list */
  var isLive0 = U.isLive; U.isLive = function (k) { return k === 'more' || isLive0(k); };
  S.flags.more = { back: true, client: false };
  U.screens.more = function () {
    var h = '<div class="pmore"><div class="eyebrow">Menu</div><h1>More</h1>', groups = [], byName = {};
    U.SECTIONS.forEach(function (s) {
      var id = s[0];
      if (id === 'home' || id === 'leads' || id === 'tasks' || id === 'more') return;
      if (!S.flags[id] || !S.flags[id].back) return;
      if ((id === 'developer' || id === 'build') && !(ME && ME.is_dev)) return;
      var g = byName[s[3]]; if (!g) { g = byName[s[3]] = { n: s[3], items: [], live: 0 }; groups.push(g); }
      g.items.push(s); if (U.isLive(id)) g.live++;
    });
    groups.sort(function (a, b) { return (b.live > 0) - (a.live > 0); });
    groups.forEach(function (g) {
      h += '<div class="pgh"><b>' + esc(g.n) + '</b></div><div class="pcard pmorelist">' + g.items.map(function (s) {
        return '<button type="button" data-act="nav" data-id="' + s[0] + '"><span>' + esc(s[1]) + '</span>' + (U.isLive(s[0]) ? '' : '<span class="pill mut">Demo</span>') + '<i aria-hidden="true">&rsaquo;</i></button>';
      }).join('') + '</div>';
    });
    h += (U.installCard ? U.installCard() : '') + '<div class="row" style="gap:8px"><button type="button" class="btn" data-act="themeflip">Light or dark</button><button type="button" class="btn" data-act="signout">Sign out</button></div></div>';
    return h;
  };
  if (mq.addEventListener) mq.addEventListener('change', function () { U.render(); });
  else if (mq.addListener) mq.addListener(function () { U.render(); });
})();
