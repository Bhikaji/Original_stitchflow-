/* =====================================================================
   StitchFlow ERP — PHP/MySQL server sync layer
   Injected as the final script of the original StitchFlow_QA_Fixed_v5
   page (UI and business logic 100% unchanged). It:
     1. loads the authoritative db from api/data.php (MySQL) at startup
        and re-renders the app with it,
     2. wraps saveDB() so every save is validated and persisted into the
        normalized MySQL schema through the PHP API,
     3. surfaces server-side validation errors as the usual red toasts.
   ===================================================================== */
(function () {
  'use strict';
  function getApiUrl() {
    var base = typeof sfServerBase === 'function' ? sfServerBase() : '';
    if (!base && typeof location !== 'undefined') {
      var p = String(location.pathname || '/');
      var idx = p.indexOf('/pages/');
      if (idx > -1) base = p.slice(0, idx + 1);
      else {
        var aIdx = p.indexOf('/app/');
        if (aIdx > -1) base = p.slice(0, aIdx + 1);
        else base = p.replace(/\/[^\/]*$/, '/');
      }
    }
    return (base || './') + 'api/data.php';
  }
  var API = getApiUrl();
  var timer = 0, inflight = false, queued = false;

  function clearLegacyBrowserData() {
    try {
      ['stitchflow_d2c_qa_fixed_v5', 'stitchflow_d2c_qa_fixed_v5_backup', 'stitchflow_d2c_v1'].forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (e) {}
  }

  function actorHeader() {
    try { if (typeof currentAuditUser === 'function') return currentAuditUser(); } catch (e) {}
    return 'StitchFlow User';
  }

  function pushNow() {
    if (inflight) { queued = true; return; }
    inflight = true;
    var payload;
    try { payload = JSON.stringify(db); } catch (e) { inflight = false; return; }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    try { xhr.setRequestHeader('X-StitchFlow-User', actorHeader()); } catch (e) {}
    xhr.onload = function () {
      inflight = false;
      if (xhr.status < 200 || xhr.status >= 300) {
        var m = 'The server rejected this save';
        try { var j = JSON.parse(xhr.responseText); if (j && j.error) m = j.error; } catch (e) {}
        try { toast('⚠️ Server: ' + m, 'red'); } catch (e) {}
      } else {
        clearLegacyBrowserData();
        try { toast('Database saved successfully', 'green'); } catch (e) {}
      }
      if (queued) { queued = false; pushNow(); }
    };
    xhr.onerror = function () {
      inflight = false;
      try { toast('⚠️ Could not reach the ERP server — this change is only saved in the browser for now.', 'red'); } catch (e) {}
      if (queued) { queued = false; pushNow(); }
    };
    xhr.send(payload);
  }
  function schedulePush() { clearTimeout(timer); timer = setTimeout(pushNow, 350); }

  /* wrap whatever saveDB currently is (the QA layer's version) */
  var baseSave = saveDB;
  saveDB = function () {
    var ok = baseSave.apply(this, arguments);
    schedulePush();
    return ok;
  };

  /* best-effort flush on tab close */
  window.addEventListener('beforeunload', function () {
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API, new Blob([JSON.stringify(db)], { type: 'application/json' }));
      }
    } catch (e) {}
  });

  /* -------- initial load: MySQL is the source of truth -------- */
  var loaded = false;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API, false);   // synchronous: swap db before the user interacts
    xhr.send(null);
    if (xhr.status === 200) {
      var resp = JSON.parse(xhr.responseText);
      if (resp && resp.db && resp.db.masters) {
        var d = resp.db;
        try { d = migrate(d); } catch (e) {}
        try { d = normalizeDB(d); } catch (e) {}
        try { d = migrateUserPins(d); } catch (e) {}
        db = d;
        db._revision = Date.now();
        try { AUDIT_PREV = auditSnapshot(db); } catch (e) {}
        clearLegacyBrowserData();
        loaded = true;
      } else if (resp && resp.empty) {
        /* first run: seed the server with the local (default) database */
        pushNow();
      }
    }
  } catch (e) { /* offline — the app keeps working on browser storage */ }

  if (loaded) {
    try { applyNav(); } catch (e) {}
    try { render(); } catch (e) {}
  }
})();
