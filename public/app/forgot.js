(function () {
  var f = document.getElementById('f'), err = document.getElementById('err'), ok = document.getElementById('ok'), go = document.getElementById('go');
  f.addEventListener('submit', function (e) {
    e.preventDefault(); err.textContent = ''; ok.textContent = ''; go.disabled = true;
    fetch('/app/api/forgot', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-uns': '1' },
      body: JSON.stringify({ login_id: document.getElementById('id').value })
    }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function () { ok.textContent = 'If that account has an email on file, a reset link is on its way. Check spam too. No email? Ask a founder for a link.'; })
      .catch(function () { err.textContent = 'No connection. Try again.'; go.disabled = false; });
  });
})();
