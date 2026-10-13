/**
 * StitchFlow ERP — Process PO / Outward & Process Inward
 * File: assets/js/modules/process.js
 */

/* =====================================================================
   PROCESS PO / OUTWARD + PROCESS INWARD
   Finished garment styles move size-wise through Embroidery / Washing /
   Printing. Outward and inward use separate document series; inward may be
   booked in several partial receipts.
   ===================================================================== */
const PROCESS_TYPES = ['Embroidery', 'Washing', 'Printing'];
function processTypeAbbr(type) {
  const clean = String(type || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (clean.slice(0, 3) || 'PRO').padEnd(3, 'X');
}
function nextProcessOutwardNo(type) {
  const abbr = processTypeAbbr(type);
  let max = pf(db.seq.processoutward);
  (db.processoutward || []).forEach(function (r) {
    const m = /^[A-Z0-9]{3}-(\d+)$/.exec(String(r.no || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  db.seq.processoutward = max + 1;
  return abbr + '-' + String(db.seq.processoutward).padStart(5, '0');
}
function processVendorOptions() {
  const out = [], seen = {};
  function add(v, l) { v = String(v || '').trim(); if (!v || seen[v.toLowerCase()]) return; seen[v.toLowerCase()] = 1; out.push({ v: v, l: l || v }); }
  vendorPartyOptions().forEach(function (o) { add(o.v, o.l); });
  supplierPartyOptions().forEach(function (o) { add(o.v, o.l); });
  return out;
}
function processOutwardOptions() {
  return (db.processoutward || []).filter(function (r) { return !['Completed', 'Cancelled', 'Closed'].includes(r.status); })
    .sort(function (a, b) { return String(b.no).localeCompare(String(a.no), undefined, { numeric: true }); })
    .map(function (r) { return { v: r.no, l: r.no + ' · ' + (r.processType || '') + ' · ' + (r.processor || '') }; });
}
function processSizeHtml(values, pending, mode) {
  values = values || {}; pending = pending || {};
  return '<div class="sz-inputs process-sizes">' + (db.masters.sizes || []).map(function (sz) {
    const val = values[sz] != null ? values[sz] : '';
    const max = pending[sz] != null ? pf(pending[sz]) : '';
    const isDis = (mode === 'in' && max !== '' && max <= 0);
    return '<span class="szbox' + (isDis ? ' szbox-disabled' : '') + '"><span class="szlbl">' + esc(sz) + '</span>' +
      '<input class="inp inp-sm szin" type="number" min="0" step="1" data-psz="' + esc(sz) + '" value="' + esc(val) + '"' +
      (mode === 'in' && max !== '' ? ' max="' + max + '" title="Pending ' + fmtNum(max) + '"' : '') +
      (isDis ? ' disabled style="opacity:0.4;background:var(--bg-subtle,#f1f5f9);cursor:not-allowed;"' : '') +
      ' oninput="' + (mode === 'in' ? 'calcProcessInward()' : 'calcProcessOutward()') + '">' +
      (mode === 'in' ? '<span class="szbal">' + (max <= 0 ? '—' : 'bal ' + fmtNum(max)) + '</span>' : '') + '</span>';
  }).join('') + '</div>';
}
function processOutwardRow(it) {
  it = it || {}; const style = it.style || '';
  return '<tr>' + srTd() +
    '<td><b>' + esc(styleLabel(style) || style || '—') + '</b><input type="hidden" data-f="style" value="' + esc(style) + '"></td>' +
    '<td class="sizes-cell">' + processSizeHtml(it.sizes || {}, {}, 'out') + '</td>' +
    '<td class="num" data-ptotal>0</td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="rate" value="' + (it.rate ?? '') + '" oninput="calcProcessOutward()"></td>' +
    '<td class="num" data-pamount>0</td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this);calcProcessOutward()">' + ic('trash', 14) + '</button></td></tr>';
}
function processRowsFromJW(jwNo) {
  const jw = (db.jobwork || []).find(function (x) { return x.no === jwNo; });
  if (!jw) return [];
  return (jw.garments || []).filter(function (g) { return g.style || g.desc; }).map(function (g) {
    return { style: g.style || g.desc, sizes: Object.assign({}, g.sizes || {}), rate: 0 };
  });
}
function onProcessJWSelect(jwNo) {
  const tb = $('pro-items'); if (!tb) return;
  const rows = processRowsFromJW(jwNo);
  tb.innerHTML = rows.map(processOutwardRow).join('') || processOutwardRow();
  calcProcessOutward();
}
function formProcessOutward(rec) {
  const r = rec || {};
  const rows = (r.items && r.items.length) ? r.items : processRowsFromJW(r.jwRef || '');
  return '<div class="sec">Process PO / Outward</div><div class="grid-fixed">' +
    (r.id ? field('Process Outward No.', '<input class="inp" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('Date *', '<input class="inp" data-date readonly disabled id="f-date" value="' + esc(r.date || today()) + '">') +
    field('Process Type *', cbox('pro-type', { opts: db.masters.processTypes || PROCESS_TYPES, value: r.processType || '', placeholder: 'Select Process Type' })) +
    field('Processor / Vendor *', cbox('pro-vendor', { opts: processVendorOptions(), value: r.processor || '', placeholder: 'Select processor' })) +
    field('Source Job Work *', cbox('pro-jw', { opts: (db.jobwork || []).map(function (j) { return { v: j.no, l: j.no + ' · ' + (j.vendor || '') }; }), value: r.jwRef || '', placeholder: 'Select Job Work', onSet: onProcessJWSelect })) +
    field('Expected Return Date', '<input class="inp" data-date readonly id="pro-expected" value="' + esc(r.expectedDate || '') + '">') +
    field('Status', cbox('pro-status', { opts: STATUSES.processoutward, value: r.status || 'Open' })) +
    field('Remarks', '<input class="inp" id="pro-remarks" value="' + esc(r.remarks || '') + '">') +
    '</div><div class="sec">Style / Size-wise Quantity Sent</div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Style</th><th>Size-wise Outward Qty</th><th class="num">Total Qty</th><th class="num">Rate / pc</th><th class="num">Amount</th><th></th></tr></thead>' +
    '<tbody id="pro-items">' + (rows.length ? rows.map(processOutwardRow).join('') : processOutwardRow()) + '</tbody>' +
    '<tfoot><tr class="tot-row"><td></td><td>Total</td><td></td><td class="num" id="pro-total-qty">0</td><td></td><td class="num" id="pro-total-amt">₹0</td><td></td></tr></tfoot></table></div>' +
    '<div class="hint">Select a source Job Work to load its styles and size quantities. Adjust the quantities being sent for the selected process.</div>';
}
function processRowData(tr) {
  const style = (qs('[data-f="style"]', tr) || {}).value || '';
  const sizes = {}; let qty = 0;
  qsa('[data-psz]', tr).forEach(function (i) { const n = pf(i.value); if (n > 0) { sizes[i.dataset.psz] = n; qty += n; } });
  return { style: style, sizes: sizes, qty: qty, rate: pf((qs('[data-f="rate"]', tr) || {}).value) };
}
function calcProcessOutward() {
  let tq = 0, ta = 0; qsa('#pro-items tr').forEach(function (tr) { const x = processRowData(tr), a = x.qty * x.rate; tq += x.qty; ta += a; const q = qs('[data-ptotal]', tr), am = qs('[data-pamount]', tr); if (q) q.textContent = fmtNum(x.qty); if (am) am.textContent = fmtNum(a); });
  if ($('pro-total-qty')) $('pro-total-qty').textContent = fmtNum(tq); if ($('pro-total-amt')) $('pro-total-amt').textContent = fmtINR(ta); renumberSr($('pro-items'));
}
function afterRenderProcessOutward() { calcProcessOutward(); }
function saveProcessOutward(id) {
  clearReqMarks(); const prev = id ? (db.processoutward || []).find(function (x) { return x.id === id; }) : null;
  if (!cboxGet('pro-type')) return reqBad('pro-type', 'Process Type is required');
  if (!cboxGet('pro-vendor')) return reqBad('pro-vendor', 'Processor / Vendor is required');
  if (!cboxGet('pro-jw')) return reqBad('pro-jw', 'Source Job Work is required');
  const items = qsa('#pro-items tr').map(processRowData).filter(function (x) { return x.style && x.qty > 0; });
  if (!items.length) return reqBad(qs('#pro-items [data-psz]'), 'Enter at least one size-wise outward quantity');
  const data = { date: dval('f-date') || today(), processType: cboxGet('pro-type'), processor: cboxGet('pro-vendor'), jwRef: cboxGet('pro-jw'), expectedDate: dval('pro-expected'), remarks: ($('pro-remarks').value || '').trim(), items: items, status: cboxGet('pro-status') || 'Open' };
  if (prev) Object.assign(prev, data); else { data.id = uid(); data.no = nextProcessOutwardNo(data.processType); data.createdAt = Date.now(); db.processoutward.push(data); }
  updateProcessOutwardStatus(prev || data); saveDB(); pageView = null; toast('Process Outward saved — ' + (prev ? prev.no : data.no), 'green'); render();
}
function processReceivedMap(outNo, excludeId) {
  const map = {}; (db.processinward || []).forEach(function (r) { if (r.outwardRef !== outNo || r.id === excludeId || r.status === 'Cancelled') return; (r.items || []).forEach(function (it) { Object.keys(it.sizes || {}).forEach(function (sz) { const k = it.style + '|' + sz; map[k] = (map[k] || 0) + pf(it.sizes[sz]); }); }); }); return map;
}
function processInwardRow(outItem, saved, outNo, excludeId) {
  outItem = outItem || {}; saved = saved || {}; const got = processReceivedMap(outNo, excludeId), pending = {};
  (db.masters.sizes || []).forEach(function (sz) { pending[sz] = Math.max(0, pf((outItem.sizes || {})[sz]) - pf(got[outItem.style + '|' + sz])); });
  return '<tr>' + srTd() + '<td><b>' + esc(styleLabel(outItem.style) || outItem.style) + '</b><input type="hidden" data-f="style" value="' + esc(outItem.style || '') + '"></td>' +
    '<td class="sizes-cell">' + processSizeHtml(saved.sizes || {}, pending, 'in') + '</td><td class="num" data-pri-total>0</td><td class="num" data-pri-pending>' + fmtNum(Object.keys(pending).reduce(function (a, k) { return a + pending[k]; }, 0)) + '</td></tr>';
}
function onProcessOutwardSelect(no) {
  const out = (db.processoutward || []).find(function (x) { return x.no === no; }), tb = $('pri-items'); if (!out || !tb) return;
  if ($('pri-type')) $('pri-type').value = out.processType || ''; if ($('pri-vendor')) $('pri-vendor').value = out.processor || '';
  tb.innerHTML = (out.items || []).map(function (it) { return processInwardRow(it, {}, no, null); }).join(''); calcProcessInward();
}
function formProcessInward(rec) {
  const r = rec || {}, out = (db.processoutward || []).find(function (x) { return x.no === r.outwardRef; });
  const rows = out ? (out.items || []) : [];
  return '<div class="sec">Process Inward</div><div class="grid-fixed">' +
    (r.id ? field('Process Inward No.', '<input class="inp" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('Date *', '<input class="inp" data-date readonly disabled id="f-date" value="' + esc(r.date || today()) + '">') +
    field('Process Outward Ref *', cbox('pri-out', { opts: processOutwardOptions(), value: r.outwardRef || '', placeholder: 'Select Process Outward', onSet: onProcessOutwardSelect })) +
    field('Process Type', '<input class="inp" id="pri-type" value="' + esc((out && out.processType) || r.processType || '') + '" disabled>') +
    field('Processor / Vendor', '<input class="inp" id="pri-vendor" value="' + esc((out && out.processor) || r.processor || '') + '" disabled>') +
    field('Warehouse *', cbox('pri-wh', { opts: db.masters.warehouses, value: r.warehouse || '', placeholder: 'Select warehouse' })) +
    field('Status', cbox('pri-status', { opts: STATUSES.processinward, value: r.status || 'Received' })) +
    field('Remarks', '<input class="inp" id="pri-remarks" value="' + esc(r.remarks || '') + '">') +
    '</div><div class="sec">Processed Garments Received — Partial Receipt</div><div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Style</th><th>Receive Now (size-wise)</th><th class="num">Receive Qty</th><th class="num">Pending Before Receipt</th></tr></thead><tbody id="pri-items">' +
    (rows.length ? rows.map(function (it) { const sv = (r.items || []).find(function (x) { return x.style === it.style; }) || {}; return processInwardRow(it, sv, r.outwardRef, r.id); }).join('') : '') +
    '</tbody><tfoot><tr class="tot-row"><td></td><td>Total</td><td></td><td class="num" id="pri-total">0</td><td></td></tr></tfoot></table></div>' +
    '<div class="hint">Multiple Process Inward entries may be saved against the same Process Outward until all size quantities are received.</div>';
}
function calcProcessInward() { let t = 0; qsa('#pri-items tr').forEach(function (tr) { const x = processRowData(tr); t += x.qty; const c = qs('[data-pri-total]', tr); if (c) c.textContent = fmtNum(x.qty); }); if ($('pri-total')) $('pri-total').textContent = fmtNum(t); renumberSr($('pri-items')); }
function afterRenderProcessInward() { calcProcessInward(); }
function updateProcessOutwardStatus(out) { if (!out) return; const sent = (out.items || []).reduce(function (a, it) { return a + Object.keys(it.sizes || {}).reduce(function (x, k) { return x + pf(it.sizes[k]); }, 0); }, 0); const got = (db.processinward || []).filter(function (r) { return r.outwardRef === out.no && r.status !== 'Cancelled'; }).reduce(function (a, r) { return a + (r.items || []).reduce(function (x, it) { return x + Object.keys(it.sizes || {}).reduce(function (y, k) { return y + pf(it.sizes[k]); }, 0); }, 0); }, 0); out.status = got <= 0 ? 'Open' : (got >= sent ? 'Completed' : 'Partially Received'); }
function saveProcessInward(id) { clearReqMarks(); const prev = id ? (db.processinward || []).find(function (x) { return x.id === id; }) : null, no = cboxGet('pri-out'), out = (db.processoutward || []).find(function (x) { return x.no === no; }); if (!out) return reqBad('pri-out', 'Process Outward reference is required'); if (!cboxGet('pri-wh')) return reqBad('pri-wh', 'Warehouse is required'); const over = qsa('#pri-items [data-psz]').find(function (el) { return el.max !== '' && pf(el.value) > pf(el.max); }); if (over) return reqBad(over, 'Received quantity cannot exceed the pending size quantity (' + fmtNum(pf(over.max)) + ')'); const items = qsa('#pri-items tr').map(processRowData).filter(function (x) { return x.style && x.qty > 0; }); if (!items.length) return reqBad(qs('#pri-items [data-psz]'), 'Enter received quantity for at least one size'); const data = { date: dval('f-date') || today(), outwardRef: no, processType: out.processType, processor: out.processor, warehouse: cboxGet('pri-wh'), remarks: ($('pri-remarks').value || '').trim(), items: items, status: cboxGet('pri-status') || 'Received' }; if (prev) Object.assign(prev, data); else { data.id = uid(); data.no = nextNo('processinward', 'PRI'); data.createdAt = Date.now(); db.processinward.push(data); } updateProcessOutwardStatus(out); saveDB(); pageView = null; toast('Process Inward saved — ' + (prev ? prev.no : data.no), 'green'); render(); }

