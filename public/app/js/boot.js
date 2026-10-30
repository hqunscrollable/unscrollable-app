// Loads the session and data first, then the app scripts in order, then starts.
(function () {
  var SCRIPTS = ['core.js', 'screens_a.js', 'screens_b.js', 'screens_c.js', 'screens_d.js', 'live.js'];
  function fail() { location.href = '/app/login.html'; }
  function get(path) {
    return fetch(path, { credentials: 'same-origin' }).then(function (r) {
      if (r.status === 401) { fail(); throw new Error('auth'); }
      if (r.status === 403) throw new Error('noaccess');
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
  }
  function load(i) {
    return new Promise(function (resolve, reject) {
      if (i >= SCRIPTS.length) return resolve();
      var s = document.createElement('script');
      s.src = '/app/js/' + SCRIPTS[i]; s.onload = function () { load(i + 1).then(resolve, reject); };
      s.onerror = function () { reject(new Error('script ' + SCRIPTS[i])); };
      document.body.appendChild(s);
    });
  }
  Promise.all([get('/app/api/me'), get('/app/api/data')]).then(function (r) {
    window.UNS_ME = r[0]; window.UNS_DATA = r[1];
    return load(0);
  }).then(function () {
    window.U.start();
  }).catch(function (e) {
    if (e && e.message === 'auth') return;
    if (e && e.message === 'noaccess') { document.getElementById('main').innerHTML = '<div class="banner">You are signed in, but this account has no screens in the app yet. Tabish will tell you when your access is ready.</div><p><button type="button" class="btn" data-act="signout" id="so">Sign out</button></p>'; document.getElementById('so').onclick = function () { fetch('/app/api/logout', { method: 'POST', credentials: 'same-origin', headers: { 'x-uns': '1' } }).then(function () { location.href = '/app/login.html'; }); }; return; }
    document.getElementById('main').innerHTML = '<div class="banner warn">The app could not start. Reload the page. If it keeps happening, tell Tabish.</div>';
  });
})();
