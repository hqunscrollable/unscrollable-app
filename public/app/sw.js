/* Unscrollable app shell. Keeps the screens and the last loaded data on the device,
   so a bad connection shows "offline, showing saved data" instead of a blank page or a sign-in screen.
   Network first: online you always get the newest files. Cleared when you sign out. */
var V = 'uns-shell-1.6.1';
var SHELL = ['/app/', '/app/app.css', '/app/eye.js', '/app/favicon.svg', '/app/icon-192.png',
  '/app/js/boot.js', '/app/js/core.js', '/app/js/screens_a.js', '/app/js/screens_b.js', '/app/js/screens_c.js', '/app/js/screens_d.js',
  '/app/js/releases.js', '/app/js/live.js', '/app/js/build.js', '/app/js/intake.js', '/app/js/mobile.js'];
var DATA = ['/app/api/me', '/app/api/data'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function keep(req, res) {
  if (res && res.ok && !res.redirected && res.type === 'basic') {
    var copy = res.clone();
    caches.open(V).then(function (c) { c.put(req, copy); }).catch(function () {});
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf('/app') !== 0) return;
  if (url.pathname === '/app/api/logout' && req.method === 'POST') {
    e.respondWith(fetch(req).then(function (res) { if (res.ok) caches.delete(V); return res; }));
    return;
  }
  if (req.method !== 'GET') return;
  if (url.pathname.indexOf('/app/api/') === 0 && DATA.indexOf(url.pathname) < 0) return;
  if (url.pathname === '/app/sw.js' || url.pathname.indexOf('/app/login') === 0 || url.pathname.indexOf('/app/forgot') === 0 || url.pathname.indexOf('/app/reset') === 0) return;
  e.respondWith(
    fetch(req).then(function (res) { return keep(req.mode === 'navigate' ? new Request('/app/') : req, res); }).catch(function () {
      return caches.match(req.mode === 'navigate' ? '/app/' : req).then(function (hit) {
        return hit || new Response('You are offline.', { status: 503, headers: { 'content-type': 'text/plain' } });
      });
    })
  );
});
