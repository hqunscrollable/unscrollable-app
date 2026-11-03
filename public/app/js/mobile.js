/* Phone basics (1.3.3): offline bar, home-screen install help, a sign-out and theme switch inside the menu on phones. */
(function () {
  'use strict';
  var U = window.U, S = U.S, A = U.acts, esc = U.esc;

  /* offline bar */
  var bar = document.createElement('div');
  bar.id = 'offbar'; bar.setAttribute('role', 'status'); bar.hidden = true;
  bar.textContent = 'You are offline. Showing what was last saved. Changes will not save until you are back online.';
  document.body.insertBefore(bar, document.body.firstChild);
  function net() { bar.hidden = navigator.onLine !== false; }
  window.addEventListener('offline', net);
  window.addEventListener('online', function () { net(); U.toast('<b>Back online.</b> Pull to refresh or reopen the screen if something looks old.'); });
  net();

  /* menu footer on phones (the dark prototype bar is hidden there) */
  var side = document.getElementById('side');
  if (side) {
    var f = document.createElement('div'); f.className = 'sidefoot';
    f.innerHTML = '<button type="button" class="btn sm" data-act="themeflip">Light or dark</button><button type="button" class="btn sm" data-act="signout">Sign out</button>';
    side.appendChild(f);
  }
  A.themeflip = function () { S.theme = S.theme === 'dark' ? 'light' : 'dark'; U.render(); };

  /* home-screen install help */
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function ios() { var ua = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); }
  function android() { return /Android/.test(navigator.userAgent || ''); }
  U.installCard = function () {
    var body;
    if (standalone()) body = '<div class="sm">You are using the installed app. It opens straight from your home screen and keeps you signed in.</div>';
    else if (window.UNS_INSTALL) body = '<div class="sm">Install it so it opens like any other app, full screen, with no browser bar.</div><div><button type="button" class="btn" data-act="install">Install the app</button></div>';
    else if (ios()) body = '<div class="sm">On iPhone and iPad this has to be done in Safari:</div><ol class="sm" style="margin:6px 0 0 18px;padding:0"><li>Open this page in Safari.</li><li>Tap the Share button (the square with an arrow).</li><li>Tap Add to Home Screen, then Add.</li></ol>';
    else if (android()) body = '<div class="sm">Open the browser menu (three dots) and tap Install app, or Add to Home screen.</div>';
    else body = '<div class="sm">In Chrome or Edge, click the install icon at the right end of the address bar. In Safari on a Mac, choose File, then Add to Dock.</div>';
    return '<div class="card" style="margin-bottom:14px"><h3 style="margin-bottom:8px">Put it on your home screen</h3><div class="stack" style="gap:10px">' + body + '</div></div>';
  };
  A.install = function () {
    var e = window.UNS_INSTALL; if (!e) return;
    e.prompt();
    e.userChoice.then(function () { window.UNS_INSTALL = null; U.render(); }, function () {});
  };
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.UNS_INSTALL = e; if (S.route === 'account') U.render(); });
  window.addEventListener('appinstalled', function () { window.UNS_INSTALL = null; });
})();
