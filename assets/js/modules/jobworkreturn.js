/**
 * StitchFlow ERP — Job Work Return
 * File: assets/js/modules/jobworkreturn.js
 */

/* =====================================================================
   JOB WORK RETURN — job worker sending material back to our warehouse
   ===================================================================== */
function jwOptions() {
  return db.jobwork.filter(j => !isInactiveDoc(j)).sort((a, b) => b.date < a.date ? -1 : 1)
    .map(j => ({ v: j.no, l: j.no + ' · ' + (j.vendor || '') }));
}
function jwrIssuedQty(jwRef, itemName) {
  const j = db.jobwork.find(x => x.no === jwRef); if (!j) return 0;
  const nm = String(itemName || '').trim().toLowerCase();
  return (j.issues || []).concat(j.extras || [])
    .filter(i => String(i.item || '').trim().toLowerCase() === nm)
    .reduce((a, i) => a + pf(i.qty), 0);
}
function jwrReturnedQty(jwRef, itemName, excludeId) {
  const nm = String(itemName || '').trim().toLowerCase();
  let tot = 0;
  const scan = function (r) {
    if (r.jwRef !== jwRef) return;
    if (excludeId && r.id === excludeId) return;
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() === nm) tot += pf(i.retQty) + pf(i.recQty);
    });
  };
  db.jobworkreturn.forEach(scan);
  db.inward.filter(function (r) { return r.entryType === 'Job Work Return'; }).forEach(scan);
  return tot;
}
function returnTypeOpts() { return (db.masters.returnTypes && db.masters.returnTypes.length) ? db.masters.returnTypes.slice() : ['Leftover Material', 'Rejected / Damaged', 'Excess Issued', 'Wrong Material', 'Cutting Waste', 'Other']; }

function jwrItemRow(it, excludeId) {
  it = it || {};
  const jwRef = (typeof CBOX !== 'undefined' && CBOX['in-jw']) ? CBOX['in-jw'].val : '';
  const typeId = rid('jwrt');
  const issued = jwrIssuedQty(jwRef, it.name);
  const already = jwrReturnedQty(jwRef, it.name, excludeId);
  const bal = Math.max(0, issued - already);
  const im = itemByName(it.name);
  const gstPct = pf(it.gst) || (im ? pf(im.gst) : 0);
  return '<tr data-issued="' + issued + '" data-returned="' + already + '" data-poqty="0" data-recvd="0" data-gst="' + gstPct + '">' +
    srTd() +
    '<td><input class="inp" data-f="name" value="' + esc(it.name || '') + '" placeholder="From Job Work" disabled>' +
    '<input type="text" data-f="gst" value="' + gstPct + '" style="display:none" tabindex="-1" aria-hidden="true">' +
    '<input type="text" data-f="qc" value="OK" style="display:none" tabindex="-1" aria-hidden="true">' +
    '<input type="text" data-f="classification" value="' + esc(it.classification || (im ? im.classification : '') || '') + '" style="display:none" tabindex="-1" aria-hidden="true"></td>' +
    '<td class="num" style="color:var(--muted);font-weight:600">' + fmtNum(issued) + '</td>' +
    '<td class="num tdr"><b>' + fmtNum(already) + '</b><div class="sub-line">balance ' + fmtNum(bal) + '</div></td>' +
    '<td class="num"><input class="inp num" type="number" min="0" step="0.01" data-f="recQty" value="' + (it.recQty ?? it.retQty ?? '') + '" placeholder="0" oninput="jwrCheckQty(this);calcInward()"></td>' +
    '<td class="num"><input class="inp num" type="number" min="0" step="0.01" data-f="poRate" value="' + (it.poRate ?? '') + '" placeholder="0" oninput="calcInward()"></td>' +
    '<td class="num open-line-value" data-val style="font-weight:650">' + fmtNum(pf(it.recQty) * pf(it.poRate)) + '</td>' +
    '<td class="uom-cell"><input class="inp" data-f="unit" value="' + esc(it.unit || '') + '" placeholder="Auto" disabled></td>' +
    '<td>' + cbox(typeId, { opts: returnTypeOpts(), value: it.type || '', f: 'type', placeholder: 'Return type', addMaster: 'returnTypes', addText: 'Return Type', free: false }) + '</td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this);calcInward()">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
function jwrCheckQty(el) {
  const tr = el.closest('tr'); if (!tr) return;
  const avail = pf(tr.dataset.issued) - pf(tr.dataset.returned);
  const now = pf(el.value);
  const bad = avail > 0 && now > avail;
  tr.classList.toggle('row-over', bad);
  if (bad && !tr.dataset.warned) {
    tr.dataset.warned = '1';
    const nm = tr.querySelector('[data-f="name"]');
    toast('Return exceeds issued balance — ' + ((nm && nm.value) || 'item') +
      ' has only ' + fmtNum(avail) + ' outstanding', 'red');
  }
  if (!bad) delete tr.dataset.warned;
}
function calcJWR() {
  const tb = $('jwr-items'); if (!tb) return;
  let q = 0;
  qsa('tr', tb).forEach(function (tr) { q += pf((qs('[data-f="retQty"]', tr) || {}).value); });
  if ($('jwr-sum-qty')) $('jwr-sum-qty').value = fmtNum(q);
}
/* Job Work picked on the Inward form */
function onInwardJWSelect(jwNo) {
  const j = db.jobwork.find(x => x.no === jwNo);
  const ven = $('f-jwvendor');
  const excl = (pageView && pageView.kind === 'form' && pageView.m === 'inward') ? pageView.id : null;
  if (!j) { if (ven) ven.value = ''; $('inward-items').innerHTML = jwrItemRow(); calcInward(); return; }
  if (ven) ven.value = j.vendor || '';
  const seen = {}, rows = [];
  (j.issues || []).concat(j.extras || []).forEach(function (i) {
    const k = String(i.item || '').trim().toLowerCase();
    if (!k || seen[k]) return;
    seen[k] = 1;
    const im = itemByName(i.item);
    rows.push(jwrItemRow({
      name: i.item, unit: i.unit, recQty: 0,
      poRate: im ? im.purchaseRate : '', classification: im ? im.classification : ''
    }, excl));
  });
  $('inward-items').innerHTML = rows.join('') || jwrItemRow();
  dpSyncAll(); calcInward();
}
function onJWRSelect(jwNo) {
  const j = db.jobwork.find(x => x.no === jwNo);
  const ven = $('jwr-vendor');
  const excl = (pageView && pageView.kind === 'form' && pageView.m === 'jobworkreturn') ? pageView.id : null;
  if (!j) { if (ven) ven.value = ''; $('jwr-items').innerHTML = jwrItemRow(); calcJWR(); return; }
  if (ven) ven.value = j.vendor || '';
  const seen = {};
  const rows = [];
  (j.issues || []).concat(j.extras || []).forEach(function (i) {
    const k = String(i.item || '').trim().toLowerCase();
    if (!k || seen[k]) return;
    seen[k] = 1;
    rows.push(jwrItemRow({ name: i.item, unit: i.unit, retQty: 0 }, excl));
  });
  $('jwr-items').innerHTML = rows.join('') || jwrItemRow();
  dpSyncAll(); calcJWR();
}
function formJobWorkReturn(rec) {
  const r = rec || {};
  const isEdit = !!(rec && rec.id);
  return '<div class="sec">Job Work Return</div><div class="grid-fixed">' +
    (isEdit ? field('Return No', '<input class="inp" id="f-no" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly disabled id="f-date" value="' + esc(r.date || today()) + '">') +
    field('Job Work No. *', cbox('jwr-jw', { opts: jwOptions(), value: r.jwRef || '', f: 'jwRef', placeholder: 'Search Job Work…', free: false, onSet: onJWRSelect })) +
    field('Job Worker', '<input class="inp" id="jwr-vendor" value="' + esc(r.vendor || '') + '" placeholder="Auto from Job Work" disabled>') +
    field('Warehouse (into) *', cbox('jwr-warehouse', { opts: db.masters.warehouses, value: r.warehouse || '', f: 'warehouse', placeholder: 'Select warehouse', addMaster: 'warehouses', addText: 'Warehouse', free: true })) +
    field('Challan No', '<input class="inp" id="jwr-challan" value="' + esc(r.challan || '') + '" placeholder="Job worker challan">') +
    field('Vehicle No', '<input class="inp" id="jwr-vehicle" value="' + esc(r.vehicle || '') + '">') +
    field('Received By', '<input class="inp" id="jwr-by" value="' + esc(r.receivedBy || '') + '">') +
    '</div>' +
    '<div class="sec">Material Returned by Job Worker</div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' +
    srTh() + '<th>Item</th><th class="num">Issued</th><th class="num">Already Returned</th><th class="num">Return Qty</th>' +
    '<th>Unit</th><th>Return Type</th><th>Remark</th><th></th>' +
    '</tr></thead>' +
    '<tbody id="jwr-items">' + ((r.items && r.items.length) ? r.items.map(it => jwrItemRow(it, r.id)).join('') : jwrItemRow()) + '</tbody></table></div>' +
    '<div class="grid-even5" style="margin-top:18px">' +
    field('Total Return Qty', '<input class="inp" id="jwr-sum-qty" value="0" disabled>') +
    field('Remarks', '<input class="inp" id="jwr-remarks" value="' + esc(r.remarks || '') + '" placeholder="Optional">') +
    '</div>';
}
function saveJobWorkReturn(id) {
  clearReqMarks();
  const items = gatherRows('jwr-items', ['name']).filter(i => pf(i.retQty) > 0);
  if (!cboxGet('jwr-jw')) return reqBad('jwr-jw', 'Job Work number is required');
  if (!cboxGet('jwr-warehouse')) return reqBad('jwr-warehouse', 'Warehouse is required');
  if (!items.length) return reqBadCell('jwr-items', 0, 'retQty', 'Enter a return quantity for at least one item');
  const prev = id ? db.jobworkreturn.find(r => r.id === id) : null;
  const data = {
    date: dval('f-date') || today(), jwRef: cboxGet('jwr-jw'),
    vendor: $('jwr-vendor').value.trim(), warehouse: cboxGet('jwr-warehouse'),
    challan: $('jwr-challan').value.trim(), vehicle: $('jwr-vehicle').value.trim(),
    receivedBy: $('jwr-by').value.trim(), remarks: $('jwr-remarks').value.trim(),
    items, status: prev ? (prev.status || 'Draft') : 'Draft'
  };
  if (id) Object.assign(prev, data);
  else { data.id = uid(); data.no = nextNo('jobworkreturn', 'JWR'); data.createdAt = Date.now(); db.jobworkreturn.push(data); }
  saveDB(); pageView = null; toast('Job Work Return saved — ' + (prev ? prev.no : data.no), 'green'); render();
}


