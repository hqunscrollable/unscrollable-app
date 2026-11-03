(function () {
  var f = document.getElementById('f'), err = document.getElementById('err'), go = document.getElementById('go');
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = ''; go.disabled = true;
    fetch('/app/api/login', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' },
      body: JSON.stringify({ login_id: document.getElementById('id').value, password: document.getElementById('pw').value, code: document.getElementById('code').value, remember: document.getElementById('rem').checked })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.replace('/app/'); } else { err.textContent = x.j.error || 'Could not sign in.'; go.disabled = false; } })
      .catch(function () { err.textContent = 'No connection. Try again.'; go.disabled = false; });
  });
  // Back button or swipe can bring this page back from memory while already signed in. Check, then skip it.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    fetch('/app/api/me', { credentials: 'same-origin' }).then(function (r) { if (r.ok) location.replace('/app/'); }).catch(function () {});
  });
})();
