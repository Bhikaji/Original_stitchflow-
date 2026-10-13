/**
 * StitchFlow ERP — Vendor & Customer Onboarding Master
 * File: assets/js/modules/parties.js
 */

/* =====================================================================
   Party onboarding ONBOARDING MASTER
   ===================================================================== */
let ptEditId = null;
let ptState = { q: '', page: 1, size: 10 };

function renderParties() {
  setTimeout(dpSyncAll, 0);
  setTimeout(function () {
    renumberSr($('pt-billtos'));
    qsa('#pt-billtos tr').forEach(function (tr) {
      const el = qs('[data-f="gstNo"]', tr); if (el) btValidateRow(el);
    });
  }, 0);
  $('content').innerHTML =
    '<div class="entry-page">' + partyFormHtml(ptEditId ? db.masters.parties.find(x => x.id === ptEditId) : null) + '</div>' +
    '<div class="section-title" style="margin-top:26px">All parties <span class="c">' + db.masters.parties.length + '</span></div>' +
    '<div class="panel"><div class="filter-bar"><div class="search">' + ic('search', 16) +
    '<input class="inp" placeholder="Search by name, code, GST, PAN or city" value="' + esc(ptState.q) + '" oninput="ptSearch(this.value)"></div>' +
    '<span class="rowcount" id="pt-count"></span></div>' +
    '<div id="pt-list">' + partyListHtml() + '</div></div>';
}
function ptSearch(v) { ptState.q = v; ptState.page = 1; const b = $('pt-clear-filters'); if (b) b.disabled = !String(v || '').trim(); const el = $('pt-list'); if (el) { el.innerHTML = partyListHtml(); setTimeout(function () { alignTables(); attachExcelHeaderFilters(el); }, 0); } }

function partyFormHtml(x, popup) {
  x = x || {};
  return '<div class="sec">' + (x.id ? 'Edit party — ' + esc(x.legalName) : 'New Party onboarding') + '</div>' +
    '<div class="grid-auto">' +
    (x.id ? field('Party Code', '<input class="inp" value="' + esc(x.code || '') + '" disabled>') : '') +
    field('Legal Name *', '<input class="inp" id="pt-legal" value="' + esc(x.legalName || '') + '" placeholder="Registered legal entity name">') +
    field('Short Name *', '<input class="inp" id="pt-short" value="' + esc(x.shortName || '') + '" placeholder="Trade / display name">') +
    field('Business Type *', mcbox('pt-btypes', { opts: db.masters.businessTypes, selected: partyTypes(x), placeholder: 'Select one or more types…' })) +
    field('Status *', cbox('pt-status', { opts: db.masters.partyStatuses, value: x.status || 'Active', f: 'status', placeholder: 'Select status', addMaster: 'partyStatuses', addText: 'Statuses', free: true })) +
    '</div>' +
    '<div class="sec">Bill To — trades / branches <span style="text-transform:none;color:var(--muted);font-weight:600">(one company can bill from several registered trades)</span></div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' +
    srTh() + '<th style="width:115px">Location ID / No.</th><th>Trade / Branch Name *</th><th>GST No *</th><th>PAN No *</th><th>Country *</th><th>State *</th>' +
    '<th>City Name *</th><th>Address *</th><th>GST Type</th><th>Pin Code *</th><th></th>' +
    '</tr></thead><tbody id="pt-billtos">' +
    ((x.billTos && x.billTos.length) ? x.billTos.map(billToRow).join('') : billToRow()) +
    '</tbody></table></div>' +
    '<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addRow(\'pt-billtos\', billToRow)">' + ic('plus', 15) + 'Add trade</button>' +

    (popup ? '' : '<div style="margin-top:14px;display:flex;gap:10px">' +
      '<button class="btn btn-primary" onclick="savePartyForm()">' + ic('save', 16) + (x.id ? 'Update party' : 'Submit') + '</button>' +
      (x.id ? '<button class="btn btn-ghost" onclick="cancelEditParty()">Cancel edit</button>' : '') +
      '</div>');
}

/* state code 27 is treated as intra-state for CGST + SGST; all other states are IGST */
function gstTypeForState(state) {
  const s = String(state == null ? '' : state).trim();
  if (!s) return '';
  const codeMatch = s.match(/\d{2}/);
  const code = codeMatch ? codeMatch[0] : '';
  return code === '27' ? 'CGST & SGST' : 'IGST';
}
function applyPartyGst() { /* GST type is derived per Bill To trade */ }
function billToRow(b, i) {
  b = b || {};
  const cnId = rid('btcn'), stId = rid('btst');
  const country = b.country || 'India';
  const uKey = String(b.uniqueKey || b.key || (typeof i === 'number' ? ('GSTIN ' + (i + 1)) : '')).trim();
  const bId = String(b.id || uid()).trim();
  return '<tr>' +
    srTd() +
    '<input type="hidden" data-f="id" value="' + esc(bId) + '">' +
    '<input type="hidden" data-f="key" value="' + esc(uKey) + '">' +
    '<td><input class="inp" data-f="uniqueKey" value="' + esc(uKey) + '" placeholder="e.g. GSTIN ' + (typeof i === 'number' ? (i + 1) : 1) + '" style="font-weight:700;width:105px" title="Unique Key / ID for this GST registration" oninput="const k=this.closest(\'tr\').querySelector(\'[data-f=key]\'); if(k) k.value=this.value"></td>' +
    '<td><input class="inp" data-f="name" value="' + esc(b.name || '') + '" placeholder="e.g. Head Office / Unit 2"></td>' +
    '<td><input class="inp" data-f="gstNo" value="' + esc(b.gstNo || '') + '" placeholder="27ABCDE1234F1Z5" maxlength="15" data-upper oninput="btOnGst(this)"><div class="cellhint"></div></td>' +
    '<td><input class="inp" data-f="pan" value="' + esc(b.pan || panFromGst(b.gstNo) || '') + '" placeholder="Auto from GST" maxlength="10" data-upper disabled><div class="cellhint"></div></td>' +
    '<td>' + cbox(cnId, {
      opts: db.masters.countries, value: country, f: 'country', placeholder: 'Country', free: true,
      onSet: function (v) { btGeoChanged(cnId, 'country', v); }
    }) + '</td>' +
    '<td>' + cbox(stId, {
      opts: childValues('states', country), value: b.state || '', f: 'state', placeholder: 'State', free: true,
      onSet: function (v) { btGeoChanged(stId, 'state', v); btApplyGstType(stId); }
    }) + '</td>' +
    /* District / Taluka were removed from the form — the saved values are kept
       inside the City cell so existing records and exports stay intact */
    '<td><input type="hidden" data-f="district" value="' + esc(b.district || '') + '">' +
    '<input type="hidden" data-f="taluka" value="' + esc(b.taluka || '') + '">' +
    '<input class="inp" data-f="city" value="' + esc(b.city || '') + '" placeholder="City"></td>' +
    '<td><input class="inp bt-addr" data-f="address" value="' + esc(b.address || '') + '" placeholder="Building, street, area"></td>' +
    '<td><input class="inp" data-f="gstType" value="' + esc(b.gstType || gstTypeForState(b.state)) + '" placeholder="Auto" disabled></td>' +
    '<td><input class="inp num" data-f="pin" value="' + esc(b.pin || '') + '" placeholder="411001" maxlength="6" inputmode="numeric" data-numeric oninput="btValidateRow(this)"><div class="cellhint"></div></td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this)">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
/* refill the levels below whichever geography box changed, within this row only */
function btGeoChanged(srcId, level, val) {
  const src = qs('[data-cb="' + srcId + '"]');
  const tr = src ? src.closest('tr') : null;
  if (!tr) return;
  const idOf = function (f) {
    const el = qs('[data-f="' + f + '"]', tr);
    return el && el.dataset.cbInput ? el.dataset.cbInput : '';
  };
  const setOpts = function (id, key, parentVal) {
    if (!id) return;
    const c = CBOX[id]; if (!c) return;
    c.opts = childValues(key, parentVal).map(function (v) { return { v: v, l: v }; });
    c.val = ''; c.typed = false;
    const inp = qs('[data-cb-input="' + id + '"]'); if (inp) inp.value = '';
    renderCboxList(id);
  };
  if (level === 'country') { setOpts(idOf('state'), 'states', val); }
}
/* ---- Indian tax-ID validation ---------------------------------- */
const GST_STATE_CODE = {
  'jammu and kashmir': '01', 'himachal pradesh': '02', 'punjab': '03', 'chandigarh': '04', 'uttarakhand': '05',
  'haryana': '06', 'delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09', 'bihar': '10', 'sikkim': '11',
  'arunachal pradesh': '12', 'nagaland': '13', 'manipur': '14', 'mizoram': '15', 'tripura': '16', 'meghalaya': '17',
  'assam': '18', 'west bengal': '19', 'jharkhand': '20', 'odisha': '21', 'chhattisgarh': '22', 'madhya pradesh': '23',
  'gujarat': '24', 'daman and diu': '25', 'dadra and nagar haveli': '26', 'maharashtra': '27', 'karnataka': '29',
  'goa': '30', 'lakshadweep': '31', 'kerala': '32', 'tamil nadu': '33', 'puducherry': '34', 'andaman and nicobar islands': '35',
  'telangana': '36', 'andhra pradesh': '37', 'ladakh': '38'
};
/* official GSTIN check-digit (mod-36) */
function gstChecksumOK(g) {
  const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (!/^[0-9A-Z]{15}$/.test(g)) return false;
  let factor = 2, sum = 0;
  for (let i = 13; i >= 0; i--) {          /* first 14 chars feed the checksum */
    let cp = A.indexOf(g[i]); if (cp < 0) return false;
    let d = factor * cp;
    factor = (factor === 2) ? 1 : 2;
    d = Math.floor(d / 36) + (d % 36);
    sum += d;
  }
  return A[(36 - (sum % 36)) % 36] === g[14];
}
/* returns '' when fine, else the reason */
function panFromGst(gst) {
  const s = String(gst || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length >= 12 ? s.slice(2, 12) : '';
}
function panError(v) {
  const s = String(v || '').trim().toUpperCase();
  if (!s) return '';
  if (s.length !== 10) return 'PAN must be 10 characters';
  if (!PAN_RE.test(s)) return 'Format must be AAAAA1234A';
  return '';
}
function gstDuplicateOf(gst, exceptPartyId, exceptTr) {
  const g = String(gst || '').trim().toUpperCase();
  if (g.length !== 15) return '';
  const parties = db.masters.parties || [];
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    if (exceptPartyId && p.id === exceptPartyId) continue;
    const nos = [p.gstNo].concat((p.billTos || []).map(function (b) { return b.gstNo; }));
    if (nos.some(function (n) { return String(n || '').trim().toUpperCase() === g; }))
      return p.legalName || p.shortName || p.code || 'another party';
  }
  if (exceptTr) {
    const rows = qsa('#pt-billtos tr');
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] === exceptTr) continue;
      const el = qs('[data-f="gstNo"]', rows[i]);
      if (el && String(el.value || '').trim().toUpperCase() === g)
        return 'another trade on this form';
    }
  }
  return '';
}
function gstError(v, state, pan) {
  const s = String(v || '').trim().toUpperCase();
  if (!s) return '';
  if (s.length !== 15) return 'GSTIN must be 15 characters';
  if (!GST_RE.test(s)) return 'Format must be 27AAAAA1234A1Z5';
  if (!gstChecksumOK(s)) return 'Check digit is invalid';
  const code = GST_STATE_CODE[String(state || '').trim().toLowerCase()];
  if (state && code && s.slice(0, 2) !== code) return 'State code should be ' + code + ' for ' + state;
  const p = String(pan || '').trim().toUpperCase();
  if (p && p.length === 10 && s.slice(2, 12) !== p) return 'Characters 3–12 must match the PAN';
  return '';
}
function pinError(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (!/^[1-9][0-9]{5}$/.test(s)) return 'PIN must be 6 digits, not starting with 0';
  return '';
}
/* paint a single cell's hint + border */
function setCellHint(inp, msg, okMsg) {
  if (!inp) return;
  const hint = inp.parentNode ? inp.parentNode.querySelector('.cellhint') : null;
  const bad = !!msg;
  inp.classList.toggle('inp-bad', bad);
  if (hint) {
    hint.textContent = msg || (inp.value.trim() ? (okMsg || '') : '');
    hint.className = 'cellhint' + (bad ? ' bad' : (inp.value.trim() && okMsg ? ' ok' : ''));
  }
}
function btOnGst(el) {
  const tr = el && el.closest ? el.closest('tr') : null;
  if (tr) {
    const panEl = qs('[data-f="pan"]', tr);
    if (panEl) panEl.value = panFromGst(el.value);
  }
  btValidateRow(el);
}
function btValidateRow(el) {
  const tr = el && el.closest ? el.closest('tr') : null;
  if (!tr) return true;
  const g = function (f) { return qs('[data-f="' + f + '"]', tr); };
  const stEl = g('state');
  const state = stEl ? (stEl.dataset.cbInput ? cboxGet(stEl.dataset.cbInput) : stEl.value) : '';
  const panEl = g('pan'), gstEl = g('gstNo'), pinEl = g('pin');
  if (panEl && gstEl) panEl.value = panFromGst(gstEl.value) || panEl.value;
  const pErr = panError(panEl ? panEl.value : '');
  let gErr = gstError(gstEl ? gstEl.value : '', state, panEl ? panEl.value : '');
  if (!gErr && gstEl && String(gstEl.value || '').trim()) {
    const who = gstDuplicateOf(gstEl.value, ptEditId, tr);
    if (who) gErr = 'GST already used by ' + who;
  }
  const nErr = pinError(pinEl ? pinEl.value : '');
  setCellHint(panEl, pErr, 'Valid');
  setCellHint(gstEl, gErr, 'Valid');
  setCellHint(pinEl, nErr, 'Valid');
  return !pErr && !gErr && !nErr;
}
function btValidateAll() {
  const bad = [];
  qsa('#pt-billtos tr').forEach(function (tr, i) {
    const any = qs('[data-f="gstNo"]', tr);
    if (!btValidateRow(any || tr.querySelector('input'))) {
      const nm = (qs('[data-f="name"]', tr) || {}).value || ('Row ' + (i + 1));
      bad.push(nm);
    }
  });
  return bad;
}
/* GST Type on a Bill To row follows that row's state */
function btApplyGstType(srcId) {
  const src = qs('[data-cb="' + srcId + '"]');
  const tr = src ? src.closest('tr') : null; if (!tr) return;
  const stEl = qs('[data-f="state"]', tr);
  const state = stEl ? (stEl.dataset.cbInput ? cboxGet(stEl.dataset.cbInput) : stEl.value) : '';
  const gtEl = qs('[data-f="gstType"]', tr);
  if (gtEl) gtEl.value = gstTypeForState(state);
  btValidateRow(gtEl || stEl);
}
/* every visible Bill To column is mandatory — checked screen order, row by row */
const BT_REQUIRED = [
  { f: 'name', label: 'Trade / Branch Name' },
  { f: 'gstNo', label: 'GST No' },
  { f: 'pan', label: 'PAN No' },
  { f: 'country', label: 'Country' },
  { f: 'state', label: 'State' },
  { f: 'city', label: 'City Name' },
  { f: 'address', label: 'Address' },
  { f: 'pin', label: 'Pin Code' }
];
function btRequireAll() {
  const rows = qsa('#pt-billtos tr');
  const scan = BT_REQUIRED.map(function (s) { return s.f; });
  let filled = 0;
  for (let i = 0; i < rows.length; i++) {
    const tr = rows[i];
    if (rowIsBlank(tr, scan)) continue;
    filled++;
    for (let k = 0; k < BT_REQUIRED.length; k++) {
      const sp = BT_REQUIRED[k];
      if (rowVal(tr, sp.f) === '') return reqBadIn(tr, sp.f, sp.label + ' is required on trade row ' + (i + 1));
    }
  }
  if (!filled) {
    const first = rows[0];
    if (first) reqBadIn(first, 'name', 'Add at least one Bill To trade / branch \u2014 every field is required');
    return false;
  }
  return true;
}
function gatherBillTos() {
  const seenKeys = {};
  return gatherRows('pt-billtos', ['id', 'uniqueKey', 'key', 'name', 'gstNo', 'city', 'address']).map(function (b, i) {
    const st = (b.state || '').trim();
    let uKey = String(b.uniqueKey || b.key || ('GSTIN ' + (i + 1))).trim();
    if (!uKey) {
      uKey = 'GSTIN ' + (i + 1);
    }
    if (seenKeys[uKey.toLowerCase()]) {
      let baseKey = uKey;
      let sfx = 2;
      while (seenKeys[(baseKey + ' (' + sfx + ')').toLowerCase()]) {
        sfx++;
      }
      uKey = baseKey + ' (' + sfx + ')';
    }
    seenKeys[uKey.toLowerCase()] = true;
    return {
      id: b.id || uid(),
      key: uKey,
      uniqueKey: uKey,
      name: (b.name || '').trim(), gstNo: (b.gstNo || '').trim().toUpperCase(),
      pan: (b.pan || '').trim().toUpperCase(), gstType: gstTypeForState(st),
      country: (b.country || '').trim(), state: st,
      district: (b.district || '').trim(), taluka: (b.taluka || '').trim(),
      city: (b.city || '').trim(), address: (b.address || '').trim(),
      pin: String(b.pin == null ? '' : b.pin).trim()
    };
  }).filter(function (b) { return b.name || b.gstNo || b.city || b.address || b.pan || b.pin; });
}
/* --- light-touch format validation (warn, never block typing) --- */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
function ptValidate() { /* party-level tax fields now live on each Bill To row */ }

function savePartyForm() {
  clearReqMarks();
  const legalName = ($('pt-legal').value || '').trim();
  if (!legalName) return reqBad('pt-legal', 'Legal Name is required');
  const shortName = ($('pt-short').value || '').trim();
  if (!shortName) return reqBad('pt-short', 'Short Name is required');
  const partyNameClash = (db.masters.parties || []).find(function (x) {
    if (x.id === ptEditId) return false;
    return String(x.legalName || '').trim().toLowerCase() === legalName.toLowerCase();
  });
  if (partyNameClash) return reqBad('pt-legal', '“' + legalName + '” already exists in Party onboarding Master — duplicate values are not allowed');
  const partyShortClash = (db.masters.parties || []).find(function (x) {
    if (x.id === ptEditId) return false;
    return String(x.shortName || '').trim().toLowerCase() === shortName.toLowerCase();
  });
  if (partyShortClash) return reqBad('pt-short', '“' + shortName + '” already exists in Party onboarding Master — duplicate values are not allowed');
  const types = mcboxGet('pt-btypes');
  if (!types.length) return reqBad('pt-btypes', 'Business Type is required — pick at least one');
  const btype = types.join(', ');
  const pstatus = cboxGet('pt-status');
  if (!pstatus) return reqBad('pt-status', 'Status is required');
  if (!btRequireAll()) return false;

  const invalid = btValidateAll();
  if (invalid.length) {
    const firstBad = qs('#pt-billtos .inp-bad');
    return reqBad(firstBad, 'Fix the highlighted tax details — ' + invalid.join(', '));
  }
  const billTos = gatherBillTos();
  if (!billTos.length) return reqBadCell('pt-billtos', 0, 'name', 'Add at least one Bill To trade / branch');
  const tradeNames = {};
  for (let i = 0; i < billTos.length; i++) {
    const tradeKey = String(billTos[i].name || '').trim().toLowerCase();
    if (tradeKey && tradeNames[tradeKey]) {
      return reqBadCell('pt-billtos', i, 'name', '“' + billTos[i].name + '” is duplicated — Bill To trade names must be unique');
    }
    if (tradeKey) tradeNames[tradeKey] = true;
    const g = String(billTos[i].gstNo || '').trim();
    if (!g) continue;
    const who = gstDuplicateOf(g, ptEditId, null);
    if (who) {
      toast('GST No already exists — “' + g + '” is used by ' + who, 'red');
      return reqBadCell('pt-billtos', i, 'gstNo', 'GST No already exists — duplicates are not allowed');
    }
    for (let j = 0; j < i; j++) {
      if (String(billTos[j].gstNo || '').trim().toUpperCase() === g.toUpperCase()) {
        toast('GST No already entered on another trade in this form', 'red');
        return reqBadCell('pt-billtos', i, 'gstNo', 'Duplicate GST No on this party');
      }
    }
  }
  const primary = billTos[0];
  const prevParty = ptEditId ? db.masters.parties.find(function (x) { return x.id === ptEditId; }) : null;
  const data = {
    legalName, shortName: shortName, siteCode: (prevParty ? (prevParty.siteCode || '') : ''),
    /* headline tax + address mirror the primary trade so lists and the PO keep working */
    pan: primary.pan, gstNo: primary.gstNo, address: primary.address || '',
    country: primary.country, state: primary.state,
    district: primary.district, taluka: primary.taluka,
    city: primary.city, pin: primary.pin,
    status: pstatus || 'Active', businessType: btype, businessTypes: types,
    gstType: primary.gstType || gstTypeForState(primary.state),
    billTos: billTos
  };
  if (ptEditId) {
    Object.assign(db.masters.parties.find(x => x.id === ptEditId), data);
    toast('Party updated — ' + legalName, 'green'); ptEditId = null;
  } else {
    db.seq.party = (db.seq.party || 0) + 1;
    data.id = uid(); data.code = 'PTY-' + String(db.seq.party).padStart(4, '0');
    db.masters.parties.push(data);
    toast('Party added — ' + legalName, 'green');
  }
  syncPartyIntoLists();
  saveDB();
  if (MASTER_RECORD_POPUP === 'party') { MASTER_RECORD_POPUP = ''; refreshMasterRecords('party'); }
  else renderParties();
}

/* find an onboarded party by short OR legal name (case-insensitive) */
function normalizePartyType(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[_/\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const map = {
    'buyer': 'Buyer',
    'customer': 'Customer',
    'supplier': 'Supplier',
    'vendor': 'Vendor',
    'job worker': 'Supplier',
    'jobworker': 'Supplier',
    'job worker supplier': 'Supplier'
  };
  return map[key] || raw;
}
function partyTypes(x) {
  x = x || {};
  const raw = Array.isArray(x.businessTypes) && x.businessTypes.length ? x.businessTypes : String(x.businessType || '').split(/[,/|]/);
  const out = [];
  raw.forEach(function (t) {
    const v = normalizePartyType(t);
    if (v && out.indexOf(v) === -1) out.push(v);
  });
  return out;
}
function partyHasType(x, type) {
  const t = normalizePartyType(type).toLowerCase();
  return partyTypes(x).some(function (v) { return normalizePartyType(v).toLowerCase() === t; });
}
function partyByName(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const n = raw.toLowerCase();
  const withSuffix = raw.split(' · ')[0].trim();
  const matchParty = function (p) {
    const names = [
      String(p.tradeName || ''),
      String(p.shortName || ''),
      String(p.legalName || ''),
      String(p.displayName || ''),
      String(p.name || ''),
      String((p.tradeName || p.shortName || p.legalName || p.displayName || '') + (p.city ? ' · ' + p.city : ''))
    ];
    if (Array.isArray(p.registrations)) {
      p.registrations.forEach(function (r) {
        if (r.tradeName) names.push(String(r.tradeName));
        if (r.legalName) names.push(String(r.legalName));
      });
    }
    const lowered = names.filter(Boolean).map(function (s) { return s.toLowerCase(); });
    return lowered.some(function (s) {
      return s === n || s === withSuffix.toLowerCase() || (n && s.indexOf(n) > -1) || (withSuffix && s.indexOf(withSuffix.toLowerCase()) > -1);
    });
  };
  const fromMaster = (db.masters && db.masters.parties || []).find(matchParty);
  const fromPartner = (db.partners || []).find(function (p) {
    const names = [
      String(p.shortName || ''),
      String(p.displayName || ''),
      String(p.legalName || ''),
      String(p.code || ''),
      String((p.shortName || p.displayName || p.legalName || '') + ((p.registrations && p.registrations[0] && p.registrations[0].city) ? ' · ' + p.registrations[0].city : ''))
    ];
    if (Array.isArray(p.registrations)) {
      p.registrations.forEach(function (r) {
        if (r.tradeName) names.push(String(r.tradeName));
        if (r.legalName) names.push(String(r.legalName));
      });
    }
    return names.filter(Boolean).some(function (s) {
      const sl = s.toLowerCase();
      return sl === n || sl === withSuffix.toLowerCase() || (n && sl.indexOf(n) > -1) || (withSuffix && sl.indexOf(withSuffix.toLowerCase()) > -1);
    });
  });
  if (fromMaster) {
    const partner = fromPartner || (db.partners || []).find(function (p) {
      return (fromMaster.partnerId && p.id === fromMaster.partnerId) ||
        (fromMaster.gstNo && p.registrations && p.registrations.some(function (r) { return r.gstin === fromMaster.gstNo; }));
    });
    if (partner) {
      if (!fromMaster.registrations || !fromMaster.registrations.length) fromMaster.registrations = partner.registrations;
      if (!fromMaster.tradeName && partner.registrations && partner.registrations[0] && partner.registrations[0].tradeName) {
        fromMaster.tradeName = partner.registrations[0].tradeName;
      }
      if (!fromMaster.billTos || !fromMaster.billTos.length) {
        fromMaster.billTos = (partner.registrations || []).map(function (r, i) {
          const uKey = String(r.uniqueKey || r.key || ('GSTIN ' + (i + 1))).trim();
          const tName = String(r.tradeName || r.legalName || partner.displayName || ('Trade ' + (i + 1))).trim();
          return { id: r.id || uid(), key: uKey, uniqueKey: uKey, name: tName, tradeName: tName, legalName: String(r.legalName || '').trim(), gstNo: String(r.gstin || '').trim(), city: String(r.city || '').trim(), state: String(r.placeState || r.state || '').trim(), address: String(r.principalAddress || '').trim(), gstType: String(r.gstType || '').trim(), active: true };
        });
      }
    }
    return fromMaster;
  }
  if (!fromPartner) return null;
  const regs = Array.isArray(fromPartner.registrations) ? fromPartner.registrations : [];
  const billTos = regs.map(function (r, i) {
    const uKey = String(r.uniqueKey || r.key || ('GSTIN ' + (i + 1))).trim();
    const tradeName = String(r.tradeName || r.legalName || fromPartner.displayName || ('Trade ' + (i + 1))).trim();
    const gstNo = String(r.gstin || '').trim();
    return { id: r.id || uid(), key: uKey, uniqueKey: uKey, name: tradeName, tradeName: tradeName, legalName: String(r.legalName || '').trim(), gstNo: gstNo, city: String(r.city || '').trim(), state: String(r.placeState || r.state || '').trim(), address: String(r.principalAddress || '').trim(), gstType: String(r.gstType || '').trim(), active: true };
  }).filter(function (b) { return b.name; });
  const pTradeName = (regs[0] && regs[0].tradeName) || fromPartner.shortName || fromPartner.displayName || '';
  return Object.assign({}, fromPartner, {
    tradeName: pTradeName,
    legalName: (regs[0] && regs[0].legalName) || fromPartner.legalName || fromPartner.displayName || '',
    shortName: pTradeName || fromPartner.shortName || fromPartner.displayName || '',
    billTos: billTos.length ? billTos : (Array.isArray(fromPartner.billTos) ? fromPartner.billTos : [])
  });
}
/* every onboarded party, for Ship To */
function partyOptions() {
  const seen = {};
  const out = [];
  function add(nm, label, mid) {
    nm = String(nm || '').trim();
    if (!nm || seen[nm.toLowerCase()]) return;
    seen[nm.toLowerCase()] = true; out.push({ v: nm, l: label || nm, mid: mid || '' });
  }
  (db.masters.parties || []).filter(function (x) { return x.status !== 'Inactive'; }).forEach(function (x) {
    const mid = x.code || x.id || '', prefix = mid ? '[' + mid + '] ' : '', types = partyTypes(x).join(', ');
    const main = x.shortName || x.legalName;
    add(main, prefix + main + (x.city ? ' · ' + x.city : '') + (types ? ' (' + types + ')' : ''), mid);
    (x.billTos || []).forEach(function (b) {
      const name = b.name || b.tradeName || b.legalName;
      add(name, prefix + name + (b.city ? ' · ' + b.city : '') + (types ? ' (' + types + ')' : ''), mid);
    });
  });
  return out.sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
}
function supplierPartyOptions() {
  const seen = {};
  const out = [];
  function add(v, l, mid) {
    v = String(v || '').trim();
    if (!v || seen[v.toLowerCase()]) return;
    seen[v.toLowerCase()] = true;
    out.push({ v: v, l: l || v, mid: mid || '' });
  }
  (db.masters.suppliers || []).forEach(function (v) {
    const mid = masterIdFor('suppliers', v);
    const code = mid ? '[' + mid + '] ' : '';
    add(v, code + v, mid);
  });
  (db.masters.parties || []).filter(function (x) { return x.status !== 'Inactive'; }).forEach(function (x) {
    const nm = x.tradeName || x.shortName || x.legalName || x.displayName;
    if (!nm) return;
    const mid = x.code || x.id || '';
    const code = mid ? '[' + mid + '] ' : '';
    if (partyHasType(x, 'Supplier') || partyHasType(x, 'Vendor') || partyHasType(x, 'Job worker') || partyHasType(x, 'JobWorker')) add(nm, code + nm + (x.city ? ' · ' + x.city : ''), mid);
  });
  (db.partners || []).forEach(function (x) {
    const nm = (x.registrations && x.registrations[0] && x.registrations[0].tradeName) || x.shortName || x.displayName;
    if (!nm) return;
    const mid = x.partnerCode || x.id || '';
    const code = mid ? '[' + mid + '] ' : '';
    const roles = (x.roles || []).map(function (r) { return String(r || '').trim(); });
    if (roles.indexOf('SUPPLIER') > -1 || roles.indexOf('VENDOR') > -1 || roles.indexOf('JOB_WORKER') > -1) add(nm, code + nm + ((x.registrations && x.registrations[0] && x.registrations[0].city) ? ' · ' + x.registrations[0].city : ''), mid);
  });
  return out.sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
}
/* Party onboarding parties whose Business Type is Vendor — used as Production Factory */
function vendorPartyOptions() {
  const seen = {};
  const out = [];
  function add(v, l, mid) {
    v = String(v || '').trim();
    if (!v || seen[v.toLowerCase()]) return;
    seen[v.toLowerCase()] = true;
    out.push({ v: v, l: l || v, mid: mid || '' });
  }
  (db.masters.parties || []).filter(function (x) { return x.status !== 'Inactive'; }).forEach(function (x) {
    const nm = x.shortName || x.legalName || x.displayName;
    if (!nm) return;
    const mid = x.code || x.id || '';
    const code = mid ? '[' + mid + '] ' : '';
    if (partyHasType(x, 'Vendor') || partyHasType(x, 'Supplier') || partyHasType(x, 'Job worker') || partyHasType(x, 'JobWorker')) add(nm, code + nm + (x.city ? ' · ' + x.city : ''), mid);
  });
  (db.partners || []).forEach(function (x) {
    const nm = x.shortName || x.displayName || x.legalName;
    if (!nm) return;
    const mid = x.partnerCode || x.id || '';
    const code = mid ? '[' + mid + '] ' : '';
    const roles = (x.roles || []).map(function (r) { return String(r || '').trim(); });
    if (roles.indexOf('VENDOR') > -1 || roles.indexOf('SUPPLIER') > -1 || roles.indexOf('JOB_WORKER') > -1) add(nm, code + nm + ((x.registrations && x.registrations[0] && x.registrations[0].city) ? ' · ' + x.registrations[0].city : ''), mid);
  });
  return out.sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
}
/* Job Work and Sample use only parties whose Business Type contains Vendor.
   Inactive vendors remain available here by design for these two modules. */
/* Style Master: list parties whose Business Type contains Buyer — used to tag a
   style with the buyer it's made for. The dropdown shows the party's short
   (or legal) name plus city, and stays list-only like every other combobox. */
function buyerPartyOptions() {
  const seen = {};
  const out = [];
  function add(v, l, mid) {
    v = String(v || '').trim();
    if (!v || seen[v.toLowerCase()]) return;
    seen[v.toLowerCase()] = true;
    out.push({ v: v, l: l || v, mid: mid || '' });
  }
  (db.masters.customers || []).forEach(function (v) {
    const mid = masterIdFor('customers', v);
    const code = mid ? '[' + mid + '] ' : '';
    add(v, code + v, mid);
  });
  (db.masters.parties || [])
    .filter(function (x) { return x.status !== 'Inactive'; })
    .forEach(function (x) {
      const nm = x.shortName || x.legalName;
      if (!nm) return;
      const mid = x.code || x.id || '';
      const code = mid ? '[' + mid + '] ' : '';
      if (partyHasType(x, 'Buyer') || partyHasType(x, 'Customer')) add(nm, code + nm + (x.city ? ' · ' + x.city : ''), mid);
    });
  return out.sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
}

function jobWorkVendorOptions() {
  return db.masters.parties
    .filter(function (x) { return partyHasType(x, 'Vendor') || partyHasType(x, 'Supplier') || partyHasType(x, 'Job worker'); })
    .sort(function (a, b) { return String(a.legalName || '').localeCompare(String(b.legalName || '')); })
    .map(function (x) {
      const nm = x.shortName || x.legalName;
      const city = x.city ? ' · ' + x.city : '';
      const inactive = x.status === 'Inactive' ? ' · Inactive' : '';
      return { v: nm, l: nm + city + inactive };
    });
}
/* Bill To trades registered under a party */
function partyTradeRecords(name, keepGstRegistrations) {
  const pty = partyByName(name);
  if (!pty) return [];
  const partner = (db.partners || []).find(function (p) {
    return (pty.partnerId && p.id === pty.partnerId) ||
      (pty.gstNo && p.registrations && p.registrations.some(function (r) { return String(r.gstin || '').toUpperCase() === String(pty.gstNo).toUpperCase(); })) ||
      (String(pty.legalName || '').toLowerCase() === String(p.legalName || '').toLowerCase()) ||
      (String(pty.shortName || '').toLowerCase() === String(p.shortName || '').toLowerCase());
  });
  /* Linked Partner onboarding registrations are authoritative. Older Party
     records may contain only the first Bill To registration. */
  let rawTradeList = [];
  [partner && partner.registrations, pty.billTos, pty.registrations].forEach(function (list) {
    if (Array.isArray(list)) list.forEach(function (record) { rawTradeList.push(record); });
  });
  if (!rawTradeList.length) {
    const singleName = String(pty.tradeName || pty.shortName || pty.legalName || pty.displayName || name || '').trim();
    if (singleName) {
      rawTradeList = [{
        name: singleName,
        tradeName: singleName,
        legalName: pty.legalName || '',
        gstNo: String(pty.gstNo || '').trim(),
        city: String(pty.city || '').trim(),
        state: String(pty.state || '').trim(),
        gstType: String(pty.gstType || '').trim(),
        address: String(pty.address || '').trim()
      }];
    }
  }
  const records = [];
  rawTradeList.forEach(function (b, i) {
    const tradeNm = String((b && (b.tradeName || b.name || b.legalName)) || pty.tradeName || ('Trade ' + (i + 1))).trim();
    let uKey = String((b && (b.uniqueKey || b.key)) || (i + 1)).trim();
    if (uKey.startsWith('GSTIN ') || uKey.startsWith('LOC-')) uKey = String(i + 1);
    const gst = String((b && (b.gstNo || b.gstin)) || pty.gstNo || '').trim();
    const state = String((b && (b.placeState || b.state)) || pty.state || '').trim();
    const city = String((b && b.city) || pty.city || '').trim();
    const addr = String((b && (b.principalAddress || b.address)) || pty.address || '').trim();
    const gstType = String((b && b.gstType) || pty.gstType || gstTypeForState(state)).trim();
    const place = [city, state].filter(Boolean).join(', ');
    records.push({
      id: (b && b.id) || '',
      key: uKey,
      uniqueKey: uKey,
      name: tradeNm,
      tradeName: tradeNm,
      legalName: String((b && b.legalName) || pty.legalName || '').trim(),
      gstNo: gst,
      city: city,
      state: state,
      gstType: gstType,
      address: addr,
      label: (uKey ? uKey + ' · ' : '') + tradeNm + (place ? ' · ' + place : '') + (gst ? ' · ' + gst : '')
    });
  });
  const seen = {};
  return records.filter(function (r) {
    /* Ship To needs a separate choice for each GST registration, even when
       several registrations use the same trade name. */
    const gst = String(r.gstNo || '').trim().toUpperCase();
    const key = keepGstRegistrations
      ? String(r.label || '').toLowerCase()
      : String(r.name || '').trim().toLowerCase();
    if (!key) return false;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
function partyTradeOptions(name) {
  return partyTradeRecords(name).map(function (r) { return { v: r.name, l: r.label }; });
}
/* Supplier GST registrations available as PO Ship To destinations */
function allShipToOptions() {
  const all = [];
  (db.masters.parties || []).forEach(function (pty) {
    if (pty.status === 'Inactive') return;
    const nm = pty.shortName || pty.legalName;
    if (!nm) return;
    const records = partyTradeRecords(nm, true);
    records.filter(function (r) { return !!r.gstNo; }).forEach(function (r) {
      all.push({ v: String(r.uniqueKey || '').trim() || r.name, l: r.label });
    });
  });
  const seen = {};
  return all.filter(function (o) {
    if (seen[o.l]) return false;
    seen[o.l] = true;
    return true;
  }).sort(function (a, b) { return String(a.l).localeCompare(String(b.l)); });
}

function supplierShipToOptions(name) {
  return partyTradeRecords(name, true).filter(function (r) { return !!r.gstNo; }).map(function (r) {
    return { v: String(r.uniqueKey || '').trim() || r.name, l: r.label };
  });
}
function supplierShipToRecord(supplier, shipTo) {
  const value = String(shipTo || '').trim();
  const gst = value.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z])$/i);
  if (gst) {
    const byGst = partyTradeRecords(supplier, true).find(function (r) { return String(r.gstNo || '').toUpperCase() === gst[1].toUpperCase(); });
    if (byGst) return byGst;
  }
  return partyTradeByName(supplier, value);
}
function partyTradeByName(partyName, tradeName) {
  const t = String(tradeName || '').trim().toLowerCase();
  const list = partyTradeRecords(partyName);
  if (!list.length) return null;
  if (!t) return list[0];
  let hit = list.find(function (b) { 
    return String(b.name || b.tradeName || '').trim().toLowerCase() === t || String(b.uniqueKey || b.key || '').trim().toLowerCase() === t; 
  });
  if (hit) return hit;
  hit = list.find(function (b) {
    const match = (b.name + (b.tradeName || '') + (b.legalName || '') + (b.city || '') + (b.state || '') + (b.gstNo || '')).toLowerCase();
    return match.indexOf(t) > -1 || t.indexOf(match) > -1;
  });
  return hit || list[0] || null;
}
/* items limited to a classification (all items when none picked) */
/* Helper to stem common singular/plural suffixes */
function stemWord(w) {
  w = String(w || '').toLowerCase().trim();
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  return w;
}

/* Helper to break a phrase into normalized word tokens */
function phraseWords(s) {
  return String(s || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[\(\)\-\/\,\.\:\;\_]/g, ' ')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(stemWord);
}

/* items limited to a classification (all items when none picked) */
function itemOptsFor(classification) {
  const raw = String(classification || '').trim();
  const allowInactive = typeof pageView !== 'undefined' && pageView && pageView.kind === 'form' && (pageView.m === 'jobwork' || pageView.m === 'sample');
  const activeItems = (db.masters.items || []).filter(function (i) { return allowInactive || i.active !== false; });

  if (!raw) {
    return activeItems.map(function (i) {
      const code = i.code ? '[' + i.code + '] ' : '';
      return { v: i.name, l: code + i.name + (i.unit ? ' (' + i.unit + ')' : ''), mid: i.code || i.id, hint: i.unit ? i.unit : '' };
    });
  }

  // 1. Extract code prefix if any, e.g. [CLS-0002]
  const codeMatch = raw.match(/\b(CLS-\d+|CAT-\d+|ITM-\d+)\b/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : '';

  // 2. Clean label
  const cleanTarget = cleanMasterVal(raw).toLowerCase();
  const targetStem = stemWord(cleanTarget);

  // 3. Build candidate match terms
  const candidates = new Set();
  if (cleanTarget) candidates.add(cleanTarget);
  if (targetStem) candidates.add(targetStem);

  // If a classification Master ID is in raw or matches code, resolve official name
  if (db.masters && db.masters.masterIds && db.masters.masterIds.classifications) {
    const mIds = db.masters.masterIds.classifications;
    for (const [name, id] of Object.entries(mIds)) {
      const idUpper = String(id).toUpperCase();
      if ((code && idUpper === code) || String(id).toLowerCase() === cleanTarget) {
        candidates.add(name.toLowerCase());
        candidates.add(stemWord(name));
      }
    }
  }

  // Check if target is a known category (e.g. Fabric, Trims, Packaging)
  const allCats = (db.masters.categories || []).map(function (c) { return cleanMasterVal(c).toLowerCase(); });
  const isCategory = allCats.includes(cleanTarget) || allCats.includes(targetStem);

  const queryWords = phraseWords(raw);

  const list = activeItems.filter(function (i) {
    let itmCls = cleanMasterVal(i.classification).toLowerCase();
    let itmCat = cleanMasterVal(i.category).toLowerCase();
    const itmName = cleanMasterVal(i.name).toLowerCase();
    const itmDesc = cleanMasterVal(i.description).toLowerCase();
    const itmCode = String(i.code || i.id || '').toUpperCase();

    // If item has code matching candidate code
    if (code && itmCode === code) return true;

    // Auto-infer classification dynamically from database classifications if missing or empty
    if (!itmCls && db.masters && db.masters.classifications) {
      const dbCls = db.masters.classifications;
      for (let j = 0; j < dbCls.length; j++) {
        const cVal = cleanMasterVal(dbCls[j]).toLowerCase();
        if (!cVal || cVal === 'other') continue;
        const cStem = stemWord(cVal);
        if (itmName === cVal || stemWord(itmName) === cStem || itmCat === cVal) {
          itmCls = cVal;
          break;
        }
        if (itmName.includes(cVal) || cVal.includes(itmName) || itmName.includes(cStem) || cVal.includes(stemWord(itmName))) {
          itmCls = cVal;
          break;
        }
        const tokens = phraseWords(cVal);
        for (let k = 0; k < tokens.length; k++) {
          if (tokens[k].length >= 3 && itmName.includes(tokens[k])) {
            itmCls = cVal;
            break;
          }
        }
        if (itmCls) break;
      }
      if (!itmCls && itmCat) itmCls = itmCat;
    }

    const itmClsStem = stemWord(itmCls);
    const itmNameStem = stemWord(itmName);
    const itmCatStem = stemWord(itmCat);

    // If user specifically picked a Category (e.g. Trims, Packaging, Fabric)
    if (isCategory) {
      if (itmCat === cleanTarget || itmCatStem === targetStem) return true;
      const itmParent = cleanMasterVal(parentOf('classifications', itmCls)).toLowerCase();
      if (itmParent === cleanTarget || stemWord(itmParent) === targetStem) return true;
      const kids = childValues('classifications', cleanTarget);
      if (kids && kids.some(function (k) { return cleanMasterVal(k).toLowerCase() === itmCls; })) return true;
      return false;
    }

    // Otherwise, user picked a specific classification:
    for (const c of candidates) {
      if (!c) continue;
      if (itmCls === c || itmClsStem === c) return true;
      if (itmName === c || itmNameStem === c) return true;
      if (itmCls.includes(c) || c.includes(itmCls)) return true;
      if (itmName.includes(c) || c.includes(itmName)) return true;
    }

    // Dynamic category terms derived from database categories
    const catWords = new Set();
    allCats.forEach(function (cat) { phraseWords(cat).forEach(function (w) { catWords.add(w); }); });

    // Word-level overlap (e.g. 'label' matches item with 'Labels' or 'Label - Main/Size')
    const itemWords = phraseWords(itmCls).concat(phraseWords(itmName)).concat(phraseWords(itmDesc));
    for (const qw of queryWords) {
      if (!qw || qw.length < 3 || catWords.has(qw)) continue;
      if (itemWords.includes(qw)) return true;
      if (itmCls.includes(qw) || itmName.includes(qw)) return true;
    }

    return false;
  });

  const finalList = list.length ? list : activeItems;
  return finalList.map(function (i) {
    const code = i.code ? '[' + i.code + '] ' : '';
    return { v: i.name, l: code + i.name + (i.unit ? ' (' + i.unit + ')' : ''), mid: i.code || i.id, hint: i.unit ? i.unit : '' };
  });
}
function partyGstType(name) { const p = partyByName(name); return p ? (p.gstType || '') : ''; }

/* keep the Supplier / Customer dropdowns in step with onboarded parties */
function syncPartyIntoLists() {
  if (!db.masters) db.masters = {};
  if (!db.masters.suppliers) db.masters.suppliers = [];
  if (!db.masters.customers) db.masters.customers = [];
  const supplierSet = {};
  const customerSet = {};
  (db.masters.suppliers || []).forEach(function (s) { supplierSet[String(s || '').trim().toLowerCase()] = true; });
  (db.masters.customers || []).forEach(function (s) { customerSet[String(s || '').trim().toLowerCase()] = true; });
  db.masters.parties.forEach(function (x) {
    if (x.status !== 'Active') return;
    const nm = x.shortName || x.legalName;
    if (!nm) return;
    const types = partyTypes(x).map(function (t) { return String(t || '').trim().toLowerCase(); });
    const isSupplier = types.indexOf('supplier') > -1 || types.indexOf('vendor') > -1 || types.indexOf('job worker') > -1 || types.indexOf('jobworker') > -1;
    const isBuyer = types.indexOf('buyer') > -1 || types.indexOf('customer') > -1;
    if (isSupplier && !supplierSet[nm.toLowerCase()]) {
      db.masters.suppliers.push(nm);
      supplierSet[nm.toLowerCase()] = true;
    }
    if (isBuyer && !customerSet[nm.toLowerCase()]) {
      db.masters.customers.push(nm);
      customerSet[nm.toLowerCase()] = true;
    }
  });
}

function togglePartyRecordStatus(id) { const x = db.masters.parties.find(function (p) { return p.id === id; }); if (!x) return; const old = x.status === 'Inactive' ? 'Inactive' : 'Active'; x.status = old === 'Active' ? 'Inactive' : 'Active'; syncPartyIntoLists(); saveDB(); toast((x.shortName || x.legalName) + ' marked ' + x.status, 'green'); if (cur === 'masters') renderMasters(); else renderParties(); }
function editParty(id) {
  if (cur === 'masters' && mTab === 'partyrecords') { openPartyMasterPopup(id); return; }
  ptEditId = id; renderParties(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelEditParty() { ptEditId = null; renderParties(); }
function deleteParty(id) {
  const x = db.masters.parties.find(p => p.id === id); if (!x) return;
  // v5: deletion is allowed even when the party is in use. The confirmation
  // dialog still shows a warning so the user knows downstream entries will
  // have a dangling reference.
  const used = partyUsedIn(x);
  const warnNote = used.length
    ? '<div style="background:#fff5ea;border-left:4px solid #ffb800;color:#5e4200"><b>Party in use:</b> ' + esc(used.join(', ')) + ' reference this party and will have a dangling reference after deletion.</div>'
    : '';
  confirmDelete({ kind: 'party', name: x.legalName || x.shortName || 'this party', bodyHtml: warnNote, confirmText: 'Delete permanently' }, function () {
    const idx = db.masters.parties.findIndex(p => p.id === id);
    if (idx < 0) return;
    db.masters.parties = db.masters.parties.filter(p => p.id !== id);
    if (ptEditId === id) ptEditId = null;
    saveDB();
    toastUndo(x.legalName + ' removed', () => { db.masters.parties.splice(idx, 0, x); saveDB(); if (cur === 'masters') renderMasters(); else renderParties(); });
    if (cur === 'masters' && mTab === 'partyrecords') renderMasters(); else renderParties();
  });
}

function partyListHtml() {
  const q = ptState.q.toLowerCase().trim();
  let rows = db.masters.parties.slice();
  if (q) rows = rows.filter(x => (x.legalName + ' ' + x.shortName + ' ' + x.code + ' ' + x.gstNo + ' ' + x.pan + ' ' + x.city + ' ' + x.state).toLowerCase().includes(q));
  rows.sort((a, b) => String(b.code || b.id || '').localeCompare(String(a.code || a.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const pg = slicePage(rows, ptState);
  const cnt = $('pt-count'); if (cnt) cnt.textContent = pg.total + ' of ' + db.masters.parties.length;
  if (!pg.total) {
    return '<div class="empty"><div class="big">' + ic('home', 26) + '</div>' +
      (db.masters.parties.length ? '<h3>No matching parties</h3><p>Try a different search term.</p>'
        : '<h3>No parties onboarded yet</h3><p>Add your first vendor, supplier or buyer using the form above.</p>') + '</div>';
  }
  return '<div class="table-wrap"><table><thead><tr>' +
    '<th class="srcol">Sr. No.</th><th>Party</th><th>ID</th><th>Type</th><th>GST Type</th><th>GST No</th><th>PAN</th><th>City</th><th>State</th><th>Status</th><th class="num no-print">Actions</th>' +
    '</tr></thead><tbody data-sr-start="' + pg.from + '">' +
    pg.rows.map((x, i) =>
      '<tr onclick="editParty(\'' + x.id + '\')">' +
      '<td class="srcol">' + (pg.from + i) + '</td>' +
      '<td><b>' + esc(x.legalName) + '</b>' + (x.shortName ? '<div class="sub-line">' + esc(x.shortName) + '</div>' : '') + '</td>' +
      '<td>' + esc(x.code) + '</td>' +
      '<td>' + (partyTypes(x).length ? partyTypes(x).map(function (t) {
        return '<span class="badge ' + (t === 'Buyer' ? 'b-blue' : t === 'Supplier' ? 'b-pink' : 'b-gray') + '">' + esc(t) + '</span>';
      }).join(' ') : '—') + '</td>' +
      '<td>' + esc(x.gstType || '—') + (x.billTos && x.billTos.length ? '<div class="sub-line">' + x.billTos.length + ' trade' + (x.billTos.length > 1 ? 's' : '') + '</div>' : '') + '</td>' +
      '<td>' + esc(x.gstNo || '—') + '</td>' +
      '<td>' + esc(x.pan || '—') + '</td>' +
      '<td>' + esc(x.city || '—') + '</td>' +
      '<td>' + esc(x.state || '—') + '</td>' +
      '<td onclick="event.stopPropagation()"><button type="button" class="sw master-status-sw' + (x.status === 'Inactive' ? '' : ' on') + '" onclick="togglePartyRecordStatus(\'' + x.id + '\')"><span class="sw-knob"></span></button> <span class="master-status-label ' + (x.status === 'Inactive' ? 'off">Inactive' : 'on">Active') + '</span></td>' +
      '<td class="actions-cell no-print" onclick="event.stopPropagation()">' +
      '<button class="btn-icon" title="Edit" onclick="editParty(\'' + x.id + '\')">' + ic('pencil', 15) + '</button>' +
      (partyUsedIn(x).length
        ? '<button class="btn-icon" disabled title="Cannot delete — used in ' + esc(partyUsedIn(x).join(', ')) + '">' + ic('lock', 15) + '</button>'
        : '<button class="btn-icon danger" title="Delete" onclick="deleteParty(\'' + x.id + '\')">' + ic('trash', 15) + '</button>') + '</td>' +
      '</tr>').join('') + '</tbody></table></div>' + pagerBar(pg, 'party', 'parties');
}

function exportPartiesCSV() {
  if (!db.masters.parties.length) return toast('Nothing to export', 'red');
  const cols = ['code', 'legalName', 'shortName', 'businessType', 'gstType', 'pan', 'gstNo', 'country', 'state', 'city', 'address', 'pin', 'status'];
  const csv = cols.join(',') + '\n' +
    db.masters.parties.map(x => cols.map(c => csvEsc(String(x[c] ?? ''))).join(',')).join('\n');
  try {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vendor_buyer_' + today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast('CSV exported — ' + db.masters.parties.length + ' parties', 'green');
  } catch (e) { toast('Download blocked in preview — open the file in a browser to export'); }
}


/* =====================================================================
   MASTER USAGE GUARD
   Scans every module + master for a value before allowing its removal.
   ===================================================================== */
const MASTER_USAGE = {
  suppliers: [{ t: 'PO', f: d => d.po.map(r => r.supplier) },
  { t: 'Inward', f: d => d.inward.map(r => r.supplier) },
  { t: 'Job Work', f: d => d.jobwork.map(r => r.vendor) },
  { t: 'Sample', f: d => (d.sample || []).map(r => r.vendor) }],
  customers: [{ t: 'Sale', f: d => d.sale.map(r => r.customer) },
  { t: 'PO', f: d => d.po.map(r => r.buyer) }],
  firms: [{ t: 'PO', f: d => d.po.map(r => r.firm) }],
  addresses: [{ t: 'PO', f: d => d.po.flatMap(r => [r.billTo, r.shipTo]) }],
  raisedForList: [{ t: 'PO', f: d => d.po.map(r => r.raisedFor) }],
  warehouses: [{ t: 'Inward', f: d => d.inward.map(r => r.warehouse) },
  { t: 'Purchase Return', f: d => d.purchasereturn.map(r => r.warehouse) },
  { t: 'Job Work Return', f: d => d.jobworkreturn.map(r => r.warehouse) }],
  categories: [{ t: 'Item Master', f: d => d.masters.items.map(i => i.category) }],
  classifications: [{ t: 'Item Master', f: d => d.masters.items.map(i => i.classification) },
  { t: 'PO items', f: d => d.po.flatMap(r => (r.items || []).map(i => i.classification)) }],
  materialTypes: [{ t: 'Item Master', f: d => d.masters.items.map(i => i.materialType) }],
  qualities: [{ t: 'Item Master', f: d => d.masters.items.map(i => i.quality) }],
  _colours_removed: [{ t: 'Job Work', f: d => d.jobwork.flatMap(r => (r.garments || []).map(g => g.colour)) },
  { t: 'Inward', f: d => d.inward.flatMap(r => (r.items || []).map(i => i.colour || i.color)) }],
  sizes: [{ t: 'Job Work', f: d => d.jobwork.flatMap(r => (r.garments || []).flatMap(g => Object.keys(g.sizes || {}))) },
  { t: 'Item Master', f: d => d.masters.items.flatMap(i => i.sizes || []) }],
  fabrics: [{ t: 'Item Master', f: d => d.masters.items.map(i => i.name) }],
  boms: [{ t: 'PO', f: d => d.po.flatMap(r => Array.isArray(r.bom) ? r.bom : [r.bom]) }],
  gstTypes: [{ t: 'Party onboarding', f: d => d.masters.parties.map(x => x.gstType) },
  { t: 'PO', f: d => d.po.map(r => r.gstType) }],
  paymentTermsList: [{ t: 'PO', f: d => d.po.map(r => r.payTerms) }],
  freightChargesList: [{ t: 'PO', f: d => d.po.map(r => r.freightCharges) }],
  transportModes: [{ t: 'PO', f: d => d.po.map(r => r.transportMode) }],
  businessTypes: [{ t: 'Party onboarding', f: d => d.masters.parties.map(x => x.businessType) }],
  partyStatuses: [{ t: 'Party onboarding', f: d => d.masters.parties.map(x => x.status) }],
  countries: [{ t: 'Party onboarding', f: d => d.masters.parties.map(x => x.country) }],
  states: [{ t: 'Party onboarding', f: d => d.masters.parties.map(x => x.state) }],
  gstRates: [{ t: 'Item Master', f: d => d.masters.items.map(i => (i.gst === '' || i.gst == null) ? '' : String(i.gst)) }],
  qcResults: [{ t: 'Job Work receipts', f: d => d.jobwork.flatMap(j => (j.receipts || []).map(r => r.qc)) },
  { t: 'Sample receipts', f: d => (d.sample || []).flatMap(j => (j.receipts || []).map(r => r.qc)) }],
  uoms: [{ t: 'Item Master', f: d => d.masters.items.map(i => i.unit) },
  { t: 'PO items', f: d => d.po.flatMap(r => (r.items || []).map(i => i.unit)) },
  { t: 'Inward', f: d => d.inward.flatMap(r => (r.items || []).map(i => i.unit)) },
  { t: 'Costing', f: d => (d.costing || []).flatMap(r => (r.fabric || []).concat(r.sewing || []).map(i => i.uom)) }],
  washTypes: [{ t: 'Costing', f: d => (d.costing || []).map(r => (r.order || {}).washType) }],
  processTypes: [{ t: 'Process PO / Outward', f: d => (d.processoutward || []).map(r => r.processType) }],
  returnTypes: [{ t: 'Inward (JW Return)', f: d => d.inward.flatMap(r => (r.items || []).map(i => i.type)) },
  { t: 'Job Work Return', f: d => (d.jobworkreturn || []).flatMap(r => (r.items || []).map(i => i.type)) }]
};
/* returns [] when free to delete, else a list of module names using it */
function masterUsedIn(key, value) {
  const rules = MASTER_USAGE[key]; if (!rules) return [];
  const needle = String(value == null ? '' : value).trim().toLowerCase();
  if (!needle) return [];
  const hits = [];
  rules.forEach(function (r) {
    let vals = [];
    try { vals = r.f(db) || []; } catch (e) { vals = []; }
    const found = vals.some(function (v) { return String(v == null ? '' : v).trim().toLowerCase() === needle; });
    if (found && hits.indexOf(r.t) === -1) hits.push(r.t);
  });
  return hits;
}
/* ---- Party onboarding usage guard -------------------------------------
   A party is locked once any document or master refers to it by legal name,
   short name or one of its registered Bill To trade names. */
function partyUsedIn(party) {
  if (!party) return [];
  const names = [];
  const push = function (v) {
    const s = String(v == null ? '' : v).trim().toLowerCase();
    if (s && names.indexOf(s) === -1) names.push(s);
  };
  push(party.legalName); push(party.shortName);
  (party.billTos || []).forEach(function (b) { push(b.name); });
  if (!names.length) return [];
  const has = function (vals) {
    return (vals || []).some(function (v) {
      return names.indexOf(String(v == null ? '' : v).trim().toLowerCase()) > -1;
    });
  };
  const checks = [
    { t: 'PO', f: function () { return db.po.flatMap(function (r) { return [r.supplier, r.buyer, r.shipTo, r.billTo, r.supplierTrade]; }); } },
    { t: 'Material Inward', f: function () { return db.inward.map(function (r) { return r.supplier; }); } },
    { t: 'Job Work', f: function () { return db.jobwork.map(function (r) { return r.vendor; }); } },
    { t: 'Sample', f: function () { return (db.sample || []).map(function (r) { return r.vendor; }); } },
    { t: 'Sale', f: function () { return db.sale.map(function (r) { return r.customer; }); } },
    { t: 'Purchase Return', f: function () { return db.purchasereturn.map(function (r) { return r.supplier; }); } },
    { t: 'Job Work Return', f: function () { return db.jobworkreturn.map(function (r) { return r.vendor; }); } },
    { t: 'Costing', f: function () { return (db.costing || []).map(function (r) { return (r.order || {}).factory; }); } },
    { t: 'Process Outward', f: function () { return (db.processoutward || []).map(function (r) { return r.processor; }); } }
  ];
  const out = [];
  checks.forEach(function (c) {
    let vals = [];
    try { vals = c.f() || []; } catch (e) { vals = []; }
    if (has(vals) && out.indexOf(c.t) === -1) out.push(c.t);
  });
  return out;
}
/* ---- Item Master usage guard ---------------------------------------- */
function itemUsedIn(name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return [];
  const has = function (vals) {
    return (vals || []).some(function (v) { return String(v == null ? '' : v).trim().toLowerCase() === needle; });
  };
  const checks = [
    { t: 'PO', f: function () { return db.po.flatMap(function (r) { return (r.items || []).map(function (i) { return bareItemName(i.name); }); }); } },
    { t: 'Material Inward', f: function () { return db.inward.flatMap(function (r) { return (r.items || []).map(function (i) { return bareItemName(i.name); }); }); } },
    { t: 'Job Work', f: function () { return db.jobwork.flatMap(function (r) { return (r.issues || []).concat(r.extras || []).map(function (i) { return bareItemName(i.item || i.name); }); }); } },
    { t: 'Sample', f: function () { return (db.sample || []).flatMap(function (r) { return (r.issues || []).concat(r.extras || []).map(function (i) { return bareItemName(i.item || i.name); }); }); } },
    { t: 'Purchase Return', f: function () { return db.purchasereturn.flatMap(function (r) { return (r.items || []).map(function (i) { return bareItemName(i.name); }); }); } },
    { t: 'Job Work Return', f: function () { return db.jobworkreturn.flatMap(function (r) { return (r.items || []).map(function (i) { return bareItemName(i.name); }); }); } },
    { t: 'BOM master', f: function () { return (db.masters.boms || []).map(function (x) { return typeof x === 'string' ? x : (x && x.item); }); } }
  ];
  const out = [];
  checks.forEach(function (c) {
    let vals = [];
    try { vals = c.f() || []; } catch (e) { vals = []; }
    if (has(vals) && out.indexOf(c.t) === -1) out.push(c.t);
  });
  return out;
}
function styleUsedIn(internal) {
  const needle = String(internal || '').trim().toLowerCase();
  if (!needle) return [];
  const hit = function (list) {
    return (list || []).some(function (j) {
      return (j.garments || []).some(function (g) { return String(g.desc || '').trim().toLowerCase() === needle; })
        || (j.receipts || []).some(function (x) { return String(x.desc || '').trim().toLowerCase() === needle; });
    });
  };
  const out = [];
  if (hit(db.jobwork)) out.push('Job Work');
  if (hit(db.sample)) out.push('Sample');
  if (db.po.some(function (p) { return (p.styles || []).some(function (s) { return String(s).trim().toLowerCase() === needle; }); })) out.push('PO');
  return out;
}


