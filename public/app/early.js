/* Starts the two data requests while the page is still loading, so they run alongside the script downloads. boot.js picks them up. */
(function () {
  try {
    var o = { credentials: 'same-origin' };
    window.UNS_EARLY = { '/app/api/me': fetch('/app/api/me', o), '/app/api/data': fetch('/app/api/data', o) };
  } catch (e) {}
})();
