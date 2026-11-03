(function () {
  var q = new URLSearchParams(location.hash.replace(/^#/, ''));
  var u = q.get('u') || '', i = q.get('i') || '', n = q.get('n') || '';
  var msg = document.getElementById('msg'), err = document.getElementById('err'), cl = document.getElementById('close');
  cl.addEventListener('click', function () { window.close(); });
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  function fail(t) { msg.textContent = 'Not saved.'; err.textContent = t; cl.hidden = false; }
  if (!u || !i) { fail('Use the Save to UNS button on a LinkedIn profile page.'); return; }
  fetch('/app/api/avatar/capture', { method: 'POST', headers: { 'content-type': 'application/json', 'x-uns': '1' }, body: JSON.stringify({ profile_url: u, img_url: i, name: n }) })
    .then(function (r) { if (r.status === 401) throw new Error('signin'); return r.json(); })
    .then(function (r) {
      if (r.ok) { msg.textContent = 'Saved the photo for ' + r.names.join(', ') + '.' + (r.renamed && r.renamed.length ? ' Name fixed.' : ''); cl.hidden = false; setTimeout(function () { window.close(); }, 1500); return; }
      if (r.reason === 'nomatch') fail('This person is not in your Leads or Watchlist yet. Add them first, then click the button again.');
      else if (r.reason === 'image') fail((r.renamed && r.renamed.length ? 'Name fixed to ' + r.renamed.join(', ') + '. ' : '') + 'LinkedIn did not let the app download this photo. Right-click the photo, Copy image, then press Ctrl+V on their card in the app.');
      else fail('That is not a LinkedIn profile link.');
    })
    .catch(function (e) { fail(e.message === 'signin' ? 'You are signed out. Sign in to the app, then click the button again.' : 'No connection. Try again.'); });
})();
