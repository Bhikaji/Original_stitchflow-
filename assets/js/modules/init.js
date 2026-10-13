/**
 * StitchFlow ERP — Application Bootstrapper & Initialization
 * File: assets/js/modules/init.js
 */

/* ---------------- init ---------------- */
try {
  if (typeof window.initQaLayer === 'function') {
    window.initQaLayer();
  }
  applyNav();
  render();
  bindGbSearch();
  var lm = document.getElementById('loadMsg'); if (lm) lm.style.display = 'none';
} catch (e) {
  showErr('Startup error: ' + (e && e.message ? e.message : e), e && e.stack);
}

