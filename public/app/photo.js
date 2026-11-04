(function () {
  var q = new URLSearchParams(location.hash.replace(/^#/, ''));
  var u = q.get('u') || '', i = q.get('i') || '', n = q.get('n') || '';
  var msg = document.getElementById('msg'), err = document.getElementById('err'), cl = document.getElementById('close');
  cl.addEventListener('click', function () { window.close(); });
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  function nameNote(r) {
    if (r.renamed && r.renamed.length) return ' Name fixed to ' + r.renamed.join(', ') + '.';
    if (!r.read) return ' Could not read a name from this page, so the name was left as is.';
    return ' Name kept (it was typed by hand, or already right). Read from the page: ' + r.read + '.';
  }
  function fail(t) { msg.textContent = 'Not saved.'; err.textContent = t; cl.hidden = false; }
  if (!u || !i) { fail('Use the Save to UNS button on a LinkedIn profile page.'); return; }
  fetch('/app/api/avatar/capture', { method: 'POST', headers: { 'content-type': 'application/json', 'x-uns': '1' }, body: JSON.stringify({ profile_url: u, img_url: i, name: n }) })
    .then(function (r) { if (r.status === 401) throw new Error('signin'); return r.json(); })
    .then(function (r) {
      if (r.ok) { msg.textContent = 'Saved the photo for ' + r.names.join(', ') + '.' + (r.by_name ? ' Matched by name. The saved LinkedIn link did not match this page, so it was updated to this one.' : '') + nameNote(r); cl.hidden = false; setTimeout(function () { window.close(); }, 1500); return; }
      if (r.reason === 'nomatch') fail('This person is not in your Leads or Watchlist yet. Add them first, then click the button again.');
      else if (r.reason === 'image') fail((r.by_name ? 'Matched by name and updated the saved link. ' : '') + nameNote(r).trim() + ' LinkedIn did not let the app download this photo. Right-click the photo, Copy image, then press Ctrl+V on their card in the app.');
      else fail('That is not a LinkedIn profile link.');
    })
    .catch(function (e) { fail(e.message === 'signin' ? 'You are signed out. Sign in to the app, then click the button again.' : 'No connection. Try again.'); });
})();
