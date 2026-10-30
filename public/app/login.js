(function () {
  var f = document.getElementById('f'), err = document.getElementById('err'), go = document.getElementById('go');
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = ''; go.disabled = true;
    fetch('/app/api/login', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' },
      body: JSON.stringify({ login_id: document.getElementById('id').value, password: document.getElementById('pw').value, code: document.getElementById('code').value })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.href = '/app/'; } else { err.textContent = x.j.error || 'Could not sign in.'; go.disabled = false; } })
      .catch(function () { err.textContent = 'No connection. Try again.'; go.disabled = false; });
  });
})();
