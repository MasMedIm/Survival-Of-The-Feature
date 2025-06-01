;(function(){
  if (!navigator.sendBeacon) return;
  // Tracking endpoint
  // Tracking endpoint: use current origin for local development
  const TRACK_URL = window.location.origin + '/track';
  // Derive variant from path (/main/, /variant-1/, /variant-2/)
  const path = window.location.pathname.replace(/\/?$/, '');
  const parts = path.split('/').filter(Boolean);
  const VARIANT_ID = parts.length > 0 ? parts[parts.length - 1] : 'main';
  // Session ID
  const sessionId = (crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  let maxDepth = 0;
  let last = 0;
  function throttle(fn, wait) {
    return function() {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn();
      }
    };
  }
  function track() {
    const scrollY = window.scrollY || window.pageYOffset;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return;
    const pct = Math.round((scrollY / docH) * 100);
    if (pct > maxDepth) maxDepth = pct;
  }
  window.addEventListener('scroll', throttle(track, 200));
  track();
  function send() {
    const payload = JSON.stringify({
      variant: VARIANT_ID,
      sessionId: sessionId,
      maxDepth: maxDepth,
      ts: Date.now()
    });
    navigator.sendBeacon(TRACK_URL, payload);
  }
  window.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') send();
  });
  window.addEventListener('beforeunload', send);
})();