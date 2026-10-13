/**
 * StitchFlow ERP — Purchase Return
 * File: assets/js/modules/purchasereturn.js
 */

/* =====================================================================
   PURCHASE RETURN — material going back to the supplier against a PO
   ===================================================================== */
function prReceivedQty(poRef, itemName, colour) {
  if (!poRef || !itemName) return 0;
  const nm = String(itemName).trim().toLowerCase();
  const cl = String(colour == null ? '' : colour).trim().toLowerCase();
  let tot = 0;
  db.inward.forEach(function (r) {
    if (r.poRef !== poRef) return;
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() !== nm) return;
      const ic = String(i.color || i.colour || '').trim().toLowerCase();
      if (cl && ic && ic !== cl) return;
      tot += pf(i.recQty);
    });
  });
  return tot;
}
function prReturnedQty(poRef, itemName, colour, excludeId) {
  if (!poRef || !itemName) return 0;
  const nm = String(itemName).trim().toLowerCase();
  const cl = String(colour == null ? '' : colour).trim().toLowerCase();
  let tot = 0;
  db.purchasereturn.forEach(function (r) {
    if (r.poRef !== poRef) return;
    if (excludeId && r.id === excludeId) return;
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() !== nm) return;
      const ic = String(i.color || i.colour || '').trim().toLowerCase();
      if (cl && ic && ic !== cl) return;
      tot += pf(i.retQty);
    });
  });
  return tot;
}
function prTotal(r) {
  return (r.items || []).reduce(function (a, i) { return a + pf(i.retQty) * pf(i.rate); }, 0);
}
const PR_REASONS = ['Quality Rejection', 'Damaged in Transit', 'Short Supply', 'Excess Supply', 'Wrong Item', 'Late Delivery', 'Other'];

function inwardOptionsForPo(poNo) {
  const n = String(poNo || '').trim();
  if (!n) return [];
  return db.inward
    .filter(function (r) {
      if (r.status === 'Rejected') return false;
      if (String(r.poRef || '') !== n) return false;
      return (r.items || []).some(function (i) { return pf(i.recQty) > 0; });
    })
    .sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : 1; })
    .map(function (r) {
      const extra = (dpToDisplay(r.date) || r.date || '') + (r.warehouse ? ' · ' + r.warehouse : '');
      return { v: r.no, l: r.no + (extra ? ' · ' + extra : '') };
    });
}
function prRateFromPo(poNo, itemName) {
  const po = db.po.find(function (p) { return p.no === poNo; });
  if (!po) return '';
  const it = (po.items || []).find(function (i) { return lcName(i.name) === lcName(itemName); });
  return it ? (it.rate ?? '') : '';
}
function prInwardRecQty(inwardNo, itemName, colour) {
  const rec = inwardByNo(inwardNo); if (!rec) return 0;
  const nm = lcName(itemName);
  const cl = String(colour == null ? '' : colour).trim().toLowerCase();
  let q = 0;
  (rec.items || []).forEach(function (i) {
    if (lcName(i.name) !== nm) return;
    const ic = String(i.color || i.colour || '').trim().toLowerCase();
    if (cl && ic && ic !== cl) return;
    q += pf(i.recQty);
  });
  return q;
}
function prItemRow(it, poQty, excludeId, inwardNo) {
  it = it || {};
  inwardNo = inwardNo || ((typeof CBOX !== 'undefined' && CBOX['pr-inward']) ? CBOX['pr-inward'].val : '') || '';
  const recvd = it.recQty != null && it.recQty !== '' ? pf(it.recQty) : prInwardRecQty(inwardNo, it.name, it.color);
  const stock = inwardNo ? inwardItemStock(inwardNo, it.name, { prId: excludeId || (pageView && pageView.id) || null }) : 0;
  return '<tr data-recvd="' + recvd + '" data-stock="' + stock + '">' +
    srTd() +
    '<td><input class="inp" data-f="classification" value="' + esc(it.classification || (itemByName(it.name) || {}).classification || '') + '" placeholder="—" disabled></td>' +
    '<td><input class="inp" data-f="name" value="' + esc(itemDisplay(it.name) || it.name || '') + '" placeholder="From Inward" disabled>' +
    '<input type="hidden" data-f="specs" value="' + esc(it.specs || '') + '">' +
    '<input type="hidden" data-f="color" value="' + esc(it.color || '') + '">' +
    '<input type="hidden" data-f="reason" value="' + esc(it.reason || '') + '"></td>' +
    '<td class="num" style="color:var(--muted);font-weight:600">' + fmtNum(recvd) + '</td>' +
    '<td class="num tdr"><b>' + fmtNum(stock) + '</b></td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="retQty" value="' + (it.retQty ?? '') + '" placeholder="0" oninput="prCheckQty(this);calcPR()"></td>' +
    '<td><input class="inp" data-f="unit" value="' + esc(it.unit || '') + '" placeholder="—" disabled></td>' +
    '<td><input class="inp num" type="number" data-f="rate" value="' + (it.rate ?? '') + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-prval style="font-weight:650">0</td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this);calcPR()">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
function prCheckQty(el) {
  const tr = el.closest('tr'); if (!tr) return;
  const avail = pf(tr.dataset.stock);
  const now = pf(el.value);
  const bad = now > avail;
  tr.classList.toggle('row-over', bad);
  if (bad) {
    // v5: hard-clamp on every input event so the value can never exceed stock.
    // The save wrapper will also block, but clamping here keeps the form tidy.
    if (!tr.dataset.warned) {
      tr.dataset.warned = '1';
      const nm = tr.querySelector('[data-f="name"]');
      toast('Return Qty capped at available stock — ' + ((nm && nm.value) || 'item') +
        ' has only ' + fmtNum(avail) + ' in stock', 'red');
    }
    el.value = avail > 0 ? avail : 0;
  } else {
    delete tr.dataset.warned;
  }
}
function calcPR() {
  const tb = $('pr-items'); if (!tb) return;
  let q = 0, amt = 0;
  qsa('tr', tb).forEach(function (tr) {
    const line = pf((qs('[data-f="retQty"]', tr) || {}).value) * pf((qs('[data-f="rate"]', tr) || {}).value);
    const c = qs('[data-prval]', tr); if (c) c.textContent = fmtNum(line);
    q += pf((qs('[data-f="retQty"]', tr) || {}).value); amt += line;
  });
  if ($('pr-sum-qty')) $('pr-sum-qty').value = fmtNum(q);
  if ($('pr-sum-amt')) $('pr-sum-amt').value = fmtINR(+amt.toFixed(2));
  renumberSr(tb);
}
function prFillInwardOpts(poNo, keepVal) {
  const c = CBOX['pr-inward']; if (!c) return [];
  c.opts = inwardOptionsForPo(poNo).map(normalizeOpt);
  c.emptyMsg = poNo ? 'No Inward receipts found for ' + poNo + ' — receive material in Inward first' : 'Select a PO Reference first';
  if (keepVal && c.opts.some(function (o) { return o.v === keepVal; })) {
    cboxSet('pr-inward', keepVal);
  } else {
    c.val = '';
    const inp = qs('[data-cb-input="pr-inward"]');
    if (inp) inp.value = '';
  }
  renderCboxList('pr-inward');
  return c.opts;
}
function onPRPoSelect(poNo) {
  const po = db.po.find(function (p) { return p.no === poNo; });
  const sup = $('pr-supplier');
  if (sup) sup.value = po ? (po.supplier || '') : '';
  const opts = prFillInwardOpts(poNo, '');
  $('pr-items').innerHTML = prItemRow();
  calcPR();
  if (opts.length === 1) {
    cboxSet('pr-inward', opts[0].v);
    onPRInwardSelect(opts[0].v);
  }
}
function onPRInwardSelect(inwardNo) {
  const rec = inwardByNo(inwardNo);
  const excl = (pageView && pageView.kind === 'form' && pageView.m === 'purchasereturn') ? pageView.id : null;
  if (!rec) { $('pr-items').innerHTML = prItemRow(); calcPR(); return; }
  const poNo = cboxGet('pr-po') || rec.poRef || '';
  if (poNo && !cboxGet('pr-po')) {
    cboxSet('pr-po', poNo);
    const po = db.po.find(function (p) { return p.no === poNo; });
    const sup = $('pr-supplier');
    if (sup && po) sup.value = po.supplier || rec.supplier || '';
  }
  const rows = (rec.items || []).filter(function (i) { return pf(i.recQty) > 0; }).map(function (i) {
    return prItemRow({
      name: i.name, classification: i.classification || (itemByName(i.name) || {}).classification || '',
      specs: i.specs || '', color: i.color || i.colour || '', unit: i.unit || itemUnit(i.name) || '',
      rate: prRateFromPo(poNo, i.name), recQty: pf(i.recQty), retQty: 0
    }, 0, excl, rec.no);
  });
  $('pr-items').innerHTML = rows.join('') || prItemRow();
  dpSyncAll(); calcPR();
}
function formPurchaseReturn(rec) {
  const r = rec || {};
  const isEdit = !!(rec && rec.id);
  return '<div class="sec">Purchase Return</div><div class="grid-fixed">' +
    (isEdit ? field('Return No', '<input class="inp" id="f-no" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly disabled id="f-date" value="' + esc(r.date || today()) + '">') +
    field('PO Reference *', cbox('pr-po', { opts: poOptions(), value: r.poRef || '', f: 'poRef', placeholder: 'Search PO…', free: false, onSet: onPRPoSelect })) +
    field('Inward No. *', cbox('pr-inward', { opts: inwardOptionsForPo(r.poRef), value: r.inwardNo || '', f: 'inwardNo', placeholder: 'Select Inward…', emptyMsg: r.poRef ? 'No Inward receipts found for ' + r.poRef + ' — receive material in Inward first' : 'Select a PO Reference first', free: false, onSet: onPRInwardSelect })) +
    field('Supplier', '<input class="inp" id="pr-supplier" value="' + esc(r.supplier || '') + '" placeholder="Auto from PO" disabled>') +
    field('Vehicle No', '<input class="inp" id="pr-vehicle" value="' + esc(r.vehicle || '') + '">') +
    field('Warehouse (from) *', cbox('pr-warehouse', { opts: db.masters.warehouses, value: r.warehouse || '', f: 'warehouse', placeholder: 'Select warehouse', addMaster: 'warehouses', addText: 'Warehouse', free: true, onSet: function (v) { prShowWhAddr(v); } }) +
      '<div class="fhint" id="pr-wh-addr">' + esc(warehouseAddr(r.warehouse) || '') + '</div>') +
    field('Returned By', '<input class="inp" id="pr-by" value="' + esc(r.returnedBy || '') + '">') +
    '</div>' +
    '<div class="sec">Items Returned to Supplier</div>' +
    '<div class="table-wrap"><table class="mini-table" id="pr-table"><thead><tr>' +
    srTh() + '<th>Classification</th><th>Item Name</th><th class="num">Received</th><th class="num">Stock</th>' +
    '<th class="num">Return Qty</th><th>Unit</th><th class="num">Rate</th><th class="num">Value</th><th></th>' +
    '</tr></thead>' +
    '<tbody id="pr-items">' + ((r.items && r.items.length) ? r.items.map(function (it) { return prItemRow(it, 0, r.id, r.inwardNo); }).join('') : prItemRow()) + '</tbody></table></div>' +
    '<div class="grid-even5" style="margin-top:18px">' +
    field('Total Return Qty', '<input class="inp" id="pr-sum-qty" value="0" disabled>') +
    field('Total Return Value', '<input class="inp" id="pr-sum-amt" value="₹0" disabled>') +
    field('Reason *', '<input class="inp" id="pr-remarks" value="' + esc(r.reason || r.remarks || '') + '" placeholder="Why is this material going back?">') +
    '</div>';
}
function prShowWhAddr(v) {
  const el = $('pr-wh-addr'); if (!el) return;
  el.textContent = warehouseAddr(v) || '';
}
function savePurchaseReturn(id) {
  clearReqMarks();
  const items = gatherRows('pr-items', ['name']).map(function (i) { i.name = bareItemName(i.name); return i; }).filter(i => pf(i.retQty) > 0);
  if (!cboxGet('pr-po')) return reqBad('pr-po', 'PO reference is required');
  if (!cboxGet('pr-inward')) return reqBad('pr-inward', 'Inward No. is required');
  if (!cboxGet('pr-warehouse')) return reqBad('pr-warehouse', 'Warehouse (from) is required');
  /* the items grid sits above the Reason field on screen */
  if (!items.length) return reqBadCell('pr-items', 0, 'retQty', 'Enter a return quantity for at least one item');
  if (!($('pr-remarks').value || '').trim()) return reqBad('pr-remarks', 'Reason is required');
  const prev = id ? db.purchasereturn.find(r => r.id === id) : null;
  const data = {
    date: dval('f-date') || today(), poRef: cboxGet('pr-po'), inwardNo: cboxGet('pr-inward'),
    supplier: $('pr-supplier').value.trim(), debitNote: (id ? ((db.purchasereturn.find(function (x) { return x.id === id; }) || {}).debitNote || '') : ''),
    vehicle: $('pr-vehicle').value.trim(), warehouse: cboxGet('pr-warehouse'),
    returnedBy: $('pr-by').value.trim(),
    reason: $('pr-remarks').value.trim(), remarks: $('pr-remarks').value.trim(),
    items, status: prev ? (prev.status || 'Draft') : 'Draft'
  };
  if (id) Object.assign(prev, data);
  else { data.id = uid(); data.no = nextNo('purchasereturn', 'PUR'); data.createdAt = Date.now(); db.purchasereturn.push(data); }
  saveDB(); pageView = null; toast('Purchase Return saved — ' + (prev ? prev.no : data.no), 'green'); render();
}

