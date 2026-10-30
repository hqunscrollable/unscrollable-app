/* Show or hide password. Adds an eye button to every password field, including ones the app draws later. */
(function () {
  var OPEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var SHUT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function wrap(inp) {
    if (inp.getAttribute('data-eye')) return;
    inp.setAttribute('data-eye', '1');
    var w = document.createElement('span'); w.className = 'eyew';
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    var b = document.createElement('button', {}); b.type = 'button'; b.className = 'eyeb';
    b.setAttribute('aria-label', 'Show password'); b.setAttribute('aria-pressed', 'false'); b.innerHTML = OPEN;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.innerHTML = show ? SHUT : OPEN;
      b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      inp.focus();
    });
    w.appendChild(b);
  }
  function scan() { var l = document.querySelectorAll('input[type=password]:not([data-eye])'); for (var i = 0; i < l.length; i++) wrap(l[i]); }
  scan();
  if (window.MutationObserver) new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
