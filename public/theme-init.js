// Applies the saved light/dark theme before the app renders (avoids a flash). Loaded from index.html as a plain script.
(function () {
  try {
    var mode = localStorage.getItem('wfp_theme') || 'auto';
    var dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {}
})();
