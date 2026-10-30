(function () {
  var f = document.getElementById('f'), err = document.getElementById('err'), go = document.getElementById('go');
  var token = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = '';
    var a = document.getElementById('pw').value;
    if (a !== document.getElementById('pw2').value) { err.textContent = 'The two passwords differ.'; return; }
    if (!token) { err.textContent = 'This link is not valid. Ask Tabish for a new one.'; return; }
    go.disabled = true;
    fetch('/app/api/reset', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' },
      body: JSON.stringify({ token: token, password: a })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.href = '/app/login.html'; } else { err.textContent = x.j.error || 'Link expired. Ask Tabish for a new one.'; go.disabled = false; } })
      .catch(function () { err.textContent = 'No connection. Try again.'; go.disabled = false; });
  });
})();
