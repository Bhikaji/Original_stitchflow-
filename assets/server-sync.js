/* =====================================================================
   StitchFlow ERP — PHP/MySQL server sync layer (Multi-User Zero Data Loss)
   Injected as the final script of the original StitchFlow_QA_Fixed_v5
   page (UI and business logic 100% unchanged). It:
     1. loads the authoritative db from api/data.php (MySQL) at startup
        and re-renders the app with it,
     2. tracks explicit entity deletions across all transactions, master
        records (items, parties, styles), users, and dropdown values so
        concurrent user entries are NEVER accidentally deleted,
     3. polls the server revision in the background to automatically sync
        records added by other active users in real-time,
     4. wraps saveDB() so every save is validated and persisted into the
        normalized MySQL schema through the PHP API.
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
  var lastCommittedDb = null;
  var serverRevision = 0;

  function clearLegacyBrowserData() {
    try {
      ['stitchflow_d2c_qa_fixed_v5', 'stitchflow_d2c_qa_fixed_v5_backup', 'stitchflow_d2c_v1', 'garmentErpGstSettings', 'stitchflow_audit_user'].forEach(function (key) {
        localStorage.removeItem(key);
      });
    } catch (e) {}
  }

  function actorHeader() {
    try { if (typeof currentAuditUser === 'function') return currentAuditUser(); } catch (e) {}
    return 'StitchFlow User';
  }

  var TX_KEYS = ['po', 'inward', 'jobwork', 'processoutward', 'processinward', 'sample', 'sale', 'costing', 'purchasereturn', 'jobworkreturn', 'customReports'];
  var MASTER_RECORD_KEYS = ['items', 'parties', 'styles'];
  var LIST_MASTER_KEYS = [
    'suppliers','customers','colours','fabrics','sizes','categories','classifications',
    'materialTypes','qualities','firms','addresses','boms','raisedForList','countries',
    'states','sellerPrograms','districts','talukas','partyStatuses','businessTypes','gstTypes',
    'paymentTermsList','freightChargesList','transportModes','warehouses','gstRates',
    'uoms','qcResults','returnTypes','washTypes','processTypes'
  ];

  var initialIds = {};
  var initialMasterVals = {};

  function recordLoadedIds(source) {
    if (!source || typeof source !== 'object') return;
    TX_KEYS.forEach(function (k) {
      if (Array.isArray(source[k])) {
        initialIds[k] = source[k].map(function (x) { return x && x.id; }).filter(Boolean);
      } else {
        initialIds[k] = [];
      }
    });

    if (Array.isArray(source.users)) {
      initialIds.users = source.users.map(function (x) { return x && x.id; }).filter(Boolean);
    } else {
      initialIds.users = [];
    }

    if (source.masters && typeof source.masters === 'object') {
      MASTER_RECORD_KEYS.forEach(function (k) {
        if (Array.isArray(source.masters[k])) {
          initialIds[k] = source.masters[k].map(function (x) { return x && x.id; }).filter(Boolean);
        } else {
          initialIds[k] = [];
        }
      });

      LIST_MASTER_KEYS.forEach(function (k) {
        if (Array.isArray(source.masters[k])) {
          initialMasterVals[k] = source.masters[k].map(function (x) { return String(x); }).filter(Boolean);
        } else {
          initialMasterVals[k] = [];
        }
      });
    }
  }

  function isUserActivelyEditing() {
    var dlg = document.getElementById('appDialog');
    if (dlg && dlg.classList.contains('show')) return true;
    var act = document.activeElement;
    if (act && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.tagName === 'SELECT')) {
      return true;
    }
    return false;
  }

  function pushNow() {
    if (inflight) { queued = true; return; }
    inflight = true;

    // Explicit deletion tracking across transactions, master records, users, and list values (ZERO DATA LOSS)
    var deletedMap = {};

    // 1. Transactions
    TX_KEYS.forEach(function (k) {
      if (Array.isArray(initialIds[k]) && Array.isArray(db[k])) {
        var curSet = {};
        db[k].forEach(function (x) { if (x && x.id) curSet[x.id] = true; });
        var removed = initialIds[k].filter(function (id) { return !curSet[id]; });
        if (removed.length) deletedMap[k] = removed;
      }
    });

    // 2. Users (prevent deletion of admin)
    if (Array.isArray(initialIds.users) && Array.isArray(db.users)) {
      var curUserSet = {};
      db.users.forEach(function (x) { if (x && x.id) curUserSet[x.id] = true; });
      var removedUsers = initialIds.users.filter(function (id) { return !curUserSet[id] && id !== 'USR-0001'; });
      if (removedUsers.length) deletedMap.users = removedUsers;
    }

    // 3. Master records (items, parties, styles)
    if (db.masters && typeof db.masters === 'object') {
      MASTER_RECORD_KEYS.forEach(function (k) {
        if (Array.isArray(initialIds[k]) && Array.isArray(db.masters[k])) {
          var curSet = {};
          db.masters[k].forEach(function (x) { if (x && x.id) curSet[x.id] = true; });
          var removed = initialIds[k].filter(function (id) { return !curSet[id]; });
          if (removed.length) deletedMap[k] = removed;
        }
      });

      // 4. List master values
      var delMasters = {};
      LIST_MASTER_KEYS.forEach(function (k) {
        if (Array.isArray(initialMasterVals[k]) && Array.isArray(db.masters[k])) {
          var curSet = {};
          db.masters[k].forEach(function (x) { if (x != null) curSet[String(x)] = true; });
          var removed = initialMasterVals[k].filter(function (v) { return !curSet[v]; });
          if (removed.length) delMasters[k] = removed;
        }
      });
      if (Object.keys(delMasters).length) {
        deletedMap.masters = delMasters;
      }
    }

    db._deleted = deletedMap;
    db._client_revision = serverRevision;

    var payload;
    try { payload = JSON.stringify(db); } catch (e) { inflight = false; return; }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (window.__SF_CSRF__) {
      try { xhr.setRequestHeader('X-CSRF-Token', window.__SF_CSRF__); } catch (e) {}
    }
    try { xhr.setRequestHeader('X-StitchFlow-User', actorHeader()); } catch (e) {}
    try {
      var allowEmpty = window.__SF_ALLOW_EMPTY_TABLES;
      if (Array.isArray(allowEmpty) && allowEmpty.length) xhr.setRequestHeader('X-StitchFlow-Allow-Empty', allowEmpty.join(','));
    } catch (e) {}
    xhr.onload = function () {
      inflight = false;
      if (xhr.status === 401) {
        if (typeof showLogin === 'function') showLogin();
        try { toast('⚠️ Session expired or not signed in. Please sign in.', 'red'); } catch (e) {}
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        var m = 'The server rejected this save';
        try { var j = JSON.parse(xhr.responseText); if (j && j.error) m = j.error; } catch (e) {}
        try { toast('⚠️ Server: ' + m, 'red'); } catch (e) {}
        if (lastCommittedDb) {
          try {
            db = JSON.parse(lastCommittedDb);
            if (typeof render === 'function') render();
          } catch (e) {}
        }
      } else {
        lastCommittedDb = payload;
        try {
          var res = JSON.parse(xhr.responseText);
          if (res && res.revision) {
            serverRevision = res.revision;
            db._revision = res.revision;
          }
        } catch (e) {}
        recordLoadedIds(db);
        delete db._deleted;
        delete db._client_revision;
        clearLegacyBrowserData();
        try { window.__SF_ALLOW_EMPTY_TABLES = []; } catch (e) {}
        try { toast('Database saved successfully', 'green'); } catch (e) {}
      }
      if (queued) { queued = false; pushNow(); }
    };
    xhr.onerror = function () {
      inflight = false;
      try { toast('⚠️ Could not reach the ERP server. Please verify your connection.', 'red'); } catch (e) {}
      if (queued) { queued = false; pushNow(); }
    };
    xhr.send(payload);
  }

  function schedulePush() { clearTimeout(timer); timer = setTimeout(pushNow, 35); }

  /* wrap saveDB */
  var baseSave = saveDB;
  saveDB = function () {
    var ok = baseSave.apply(this, arguments);
    if (!loaded && typeof sfServerBase === 'function' && sfServerBase()) {
      try { toast('Database is not available — this change was not saved.', 'red'); } catch (e) {}
      return ok;
    }
    schedulePush();
    return ok;
  };

  /* -------- initial load: MySQL is the source of truth -------- */
  var loaded = false;
  function fetchAuthoritativeDb(isSync, isBackground) {
    if (isBackground && (inflight || queued || isUserActivelyEditing())) return;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', API, !!isSync ? false : true);
      xhr.withCredentials = true;
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var resp = JSON.parse(xhr.responseText);
            if (resp && resp.db && resp.db.masters) {
              var d = resp.db;
              try { d = migrate(d); } catch (e) {}
              try { d = normalizeDB(d); } catch (e) {}
              try { d = migrateUserPins(d); } catch (e) {}
              db = d;
              if (d._revision) serverRevision = d._revision;
              lastCommittedDb = JSON.stringify(db);
              recordLoadedIds(d);
              try { AUDIT_PREV = auditSnapshot(db); } catch (e) {}
              clearLegacyBrowserData();
              loaded = true;
              if (!isBackground) {
                try { applyNav(); } catch (e) {}
              }
              try { render(); } catch (e) {}
            }
          } catch (e) {}
        } else if (xhr.status === 401) {
          if (!isBackground && typeof showLogin === 'function') showLogin();
        }
      };
      if (isSync) {
        xhr.send(null);
        if (xhr.status === 200) {
          var resp = JSON.parse(xhr.responseText);
          if (resp && resp.db && resp.db.masters) {
            var d = resp.db;
            try { d = migrate(d); } catch (e) {}
            try { d = normalizeDB(d); } catch (e) {}
            try { d = migrateUserPins(d); } catch (e) {}
            db = d;
            if (d._revision) serverRevision = d._revision;
            lastCommittedDb = JSON.stringify(db);
            recordLoadedIds(d);
            try { AUDIT_PREV = auditSnapshot(db); } catch (e) {}
            clearLegacyBrowserData();
            loaded = true;
          }
        } else if (xhr.status === 401) {
          if (typeof showLogin === 'function') showLogin();
        }
      } else {
        xhr.send(null);
      }
    } catch (e) {}
  }

  window.__sfReloadAuthoritativeDb = function () {
    fetchAuthoritativeDb(false, false);
  };

  fetchAuthoritativeDb(true, false);

  if (loaded) {
    try { applyNav(); } catch (e) {}
    try { render(); } catch (e) {}
  }

  /* -------- Background Live Polling (Zero Data Loss across multiple active users) -------- */
  function checkServerUpdates() {
    if (inflight || queued || isUserActivelyEditing()) return;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', API + '?revision_only=1', true);
      xhr.withCredentials = true;
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var j = JSON.parse(xhr.responseText);
            if (j && j.revision && j.revision > serverRevision) {
              fetchAuthoritativeDb(false, true);
            }
          } catch (e) {}
        }
      };
      xhr.send(null);
    } catch (e) {}
  }

  setInterval(checkServerUpdates, 20000);
  window.addEventListener('focus', checkServerUpdates);

  /* ---- Double-submit protection on save / submit actions ---- */
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('button, .btn, .act-btn') : null;
    if (!btn) return;
    var txt = (btn.textContent || '').trim().toLowerCase();
    var isSave = txt === 'save' || txt === 'submit' || txt === 'create' || btn.classList.contains('btn-save') || (btn.dataset && btn.dataset.action === 'save');
    if (isSave) {
      if (btn.dataset.sfSubmitting === '1') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      btn.dataset.sfSubmitting = '1';
      btn.classList.add('btn-busy');
      setTimeout(function () {
        delete btn.dataset.sfSubmitting;
        btn.classList.remove('btn-busy');
      }, 1000);
    }
  }, true);

  /* ---- Session timeout warning ---- */
  var lastUserActivity = Date.now();
  var sessionWarned = false;
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(function (evt) {
    window.addEventListener(evt, function () {
      lastUserActivity = Date.now();
      sessionWarned = false;
    }, { passive: true });
  });
  setInterval(function () {
    var idleMinutes = (Date.now() - lastUserActivity) / (60 * 1000);
    if (idleMinutes >= 25 && !sessionWarned) {
      sessionWarned = true;
      try {
        toast('⚠️ Your session may expire soon due to inactivity. Please save any unsaved work.', 'amber');
      } catch (e) {}
    }
  }, 60 * 1000);
})();
