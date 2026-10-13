/**
 * StitchFlow ERP — Material Inward & GRN
 * File: assets/js/modules/inward.js
 */

/* ================= INWARD ================= */
function poOptions() {
  return db.po.filter(p => !isInactiveDoc(p)).sort((a, b) => b.date < a.date ? -1 : 1)
    .map(p => ({ v: p.no, l: p.no + ' · ' + (p.supplier || '') + ' (' + (p.category || '') + ')' }));
}
/* qty already received for this PO + item across earlier inwards (excluding the row being edited) */
function inwardReceivedSoFar(poRef, itemName, colour, excludeId) {
  if (!poRef || !itemName) return 0;
  const nm = String(itemName).trim().toLowerCase();
  const cl = String(colour == null ? '' : colour).trim().toLowerCase();
  let tot = 0;
  db.inward.forEach(function (r) {
    if (r.poRef !== poRef) return;
    if (excludeId && r.id === excludeId) return;
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() !== nm) return;
      const ic = String(i.color || i.colour || '').trim().toLowerCase();
      if (cl && ic && ic !== cl) return;
      tot += pf(i.recQty);
    });
  });
  return tot;
}
/* =====================================================================
   DOWNSTREAM-USE LOCKS
   A record (or a single item line) can no longer be deleted once a later
   document already consumes it.
   ===================================================================== */
function lcName(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

function sameItemRef(left, right) {
  const a = String(left == null ? '' : left).trim();
  const b = String(right == null ? '' : right).trim();
  if (!a && !b) return true;
  if (!a || !b) return false;
  const aBare = lcName(bareItemName(a));
  const bBare = lcName(bareItemName(b));
  if (aBare && bBare && aBare === bBare) return true;
  if (lcName(a) === lcName(b)) return true;
  const aCode = (a.match(/[\[(]([A-Za-z]{2,}-\d+)[\])]/) || [])[1];
  const bCode = (b.match(/[\[(]([A-Za-z]{2,}-\d+)[\])]/) || [])[1];
  return !!aCode && !!bCode && lcName(aCode) === lcName(bCode);
}

/* --- PO level: is there any Inward booked against this PO? --- */
function poInwardEntries(poNo) {
  if (!poNo) return [];
  const no = String(poNo).trim();
  return db.inward.filter(function (r) { return String(r.poRef || '').trim() === no && r.status !== 'Rejected'; });
}
function poHasInward(poNo) { return poInwardEntries(poNo).length > 0; }
/* --- PO item level: has this specific item been received on this PO? --- */
function poItemHasInward(poNo, itemName, itemCode) {
  const nm = lcName(bareItemName(itemName));
  const cd = lcName(itemCode || '');
  if (!poNo || (!nm && !cd)) return false;
  return poInwardEntries(poNo).some(function (r) {
    return (r.items || []).some(function (i) {
      if (pf(i.recQty) <= 0) return false;
      const inN = lcName(bareItemName(i.name));
      const inC = lcName(i.code || '');
      if (nm && inN && nm === inN) return true;
      if (cd && inC && cd === inC) return true;
      return false;
    });
  });
}
/* the reference other documents use to point back at an inward entry:
   PO receipt -> the PO no, Opening Stock -> OS-####, Job Work Return -> JWR-#### */
function inwardRef(rec) {
  if (!rec) return '';
  if (rec.poRef) return rec.poRef;
  if (rec.entryType === 'Opening Stock') return osRefFor(rec.no);
  if (rec.entryType === 'Job Work Return') return osRefFor(rec.no).replace('OS-', 'JWR-');
  return '';
}
/* --- Inward level: is any outward document consuming this stock? --- */
function issueUsesInward(s, inwardNo) {
  return String(inwardNoForIssue(s) || '') === String(inwardNo || '');
}
function prUsesInward(r, inwardNo) {
  if (!r || !inwardNo) return false;
  if (r.inwardNo) return String(r.inwardNo) === String(inwardNo);
  return false;
}
function inwardOutwardUsers(rec) {
  const no = rec && rec.no; if (!no) return [];
  const out = [];
  function scan(list, label) {
    (list || []).forEach(function (j) {
      const hit = (j.issues || []).concat(j.extras || []).some(function (s) {
        return issueUsesInward(s, no) && pf(s.actualQty != null ? s.actualQty : s.qty) > 0;
      });
      if (hit) out.push(label + ' ' + j.no);
    });
  }
  scan(db.jobwork, 'Job Work');
  scan(db.sample, 'Sample');
  db.purchasereturn.forEach(function (r) {
    if (!prUsesInward(r, no)) return;
    if ((r.items || []).some(function (i) { return pf(i.retQty) > 0; })) out.push('Purchase Return ' + r.no);
  });
  return out;
}
function inwardHasOutward(rec) { return inwardOutwardUsers(rec).length > 0; }
/* --- Inward item level: is this specific item consumed downstream? --- */
function inwardItemHasOutward(rec, itemName) {
  const no = rec && rec.no, nm = lcName(itemName);
  if (!no || !nm) return false;
  const inOut = function (list) {
    return (list || []).some(function (j) {
      return (j.issues || []).concat(j.extras || []).some(function (s) {
        return issueUsesInward(s, no) && lcName(s.item) === nm && pf(s.actualQty != null ? s.actualQty : s.qty) > 0;
      });
    });
  };
  if (inOut(db.jobwork) || inOut(db.sample)) return true;
  return db.purchasereturn.some(function (r) {
    return prUsesInward(r, no) && (r.items || []).some(function (i) { return lcName(i.name) === nm && pf(i.retQty) > 0; });
  });
}
/* why a whole record cannot be deleted — '' when it can */
function deleteBlockReason(m, r) {
  if (m === 'po' && poHasInward(r.no)) {
    const n = poInwardEntries(r.no).length;
    return n + ' Inward entr' + (n > 1 ? 'ies are' : 'y is') + ' booked against this PO';
  }
  if (m === 'inward') {
    const users = inwardOutwardUsers(r);
    if (users.length) return 'Inward ' + (r.no || '') + ' is already used in ' + users.slice(0, 3).join(', ') + (users.length > 3 ? ' +' + (users.length - 3) + ' more' : '');
  }
  if (m === 'jobwork') {
    const recv = jwTotalReceived(r);
    if (recv > 0) return 'Finished goods already received (' + fmtNum(recv) + ') — delete the Receive FG entries first';
    const direct = (db.jobworkreturn || []).filter(function (x) { return x.jwRef === r.no; });
    const inwardReturns = (db.inward || []).filter(function (x) { return x.entryType === 'Job Work Return' && x.jwRef === r.no; });
    const n = direct.length + inwardReturns.length;
    if (n) return n + ' Job Work Return entr' + (n > 1 ? 'ies are' : 'y is') + ' booked against this Job Work';
  }
  if (m === 'sample') {
    const recv = jwTotalReceived(r);
    if (recv > 0) return 'Samples already received (' + fmtNum(recv) + ') — delete the receive entries first';
  }
  if (m === 'processoutward') {
    const n = (db.processinward || []).filter(function (x) { return x.outwardRef === r.no && !/cancel/i.test(x.status || ''); }).length;
    if (n) return n + ' Process Inward entr' + (n > 1 ? 'ies are' : 'y is') + ' booked against this outward';
  }
  return '';
}
/* grey out + disable every input in a row that must not change */
function lockTableRow(tr, why) {
  if (!tr) return;
  tr.classList.add('row-locked');
  tr.title = why || 'Locked — used by a later entry';
  qsa('input,select,textarea,button', tr).forEach(function (el) {
    // v5: keep the Edit pencil button enabled so user can unlock the row to delete
    if (el.classList && (el.classList.contains('jw-row-edit') || el.classList.contains('po-row-edit'))) {
      el.disabled = false;
      return;
    }
    el.disabled = true;
    if (el.tagName === 'BUTTON') el.title = why || 'Cannot delete — used by a later entry';
  });
}
function rowItemName(tr) {
  const el = qs('[data-f="name"]', tr) || qs('[data-f="item"]', tr);
  if (!el) return '';
  let v = '';
  if (el.dataset.cbInput) v = cboxGet(el.dataset.cbInput) || el.value;
  else if (el.dataset.cb) v = cboxGet(el.dataset.cb) || el.value;
  else v = el.value;
  return bareItemName(v);
}
/* PO form: lock every item line already received on this PO */
function poLockReceivedRows() {
  let poNo = '';
  if (formCtx && formCtx.id) {
    const rec = db.po.find(function (p) { return p.id === formCtx.id; });
    if (rec) poNo = rec.no || '';
  }
  if (!poNo && $('f-no')) poNo = ($('f-no').value || '').trim();
  if (!poNo) return;
  if (poHasInward(poNo)) {
    ['po-supplier', 'po-trade'].forEach(function (id) { const box = qs('[data-cb="' + id + '"]'), inp = qs('[data-cb-input="' + id + '"]'); if (box) { box.classList.add('cbox-ro'); box.title = 'Locked — Inward is already booked against this PO'; } if (inp) inp.disabled = true; });
  }
  let locked = 0;
  qsa('#po-items tr').forEach(function (tr) {
    const nm = rowItemName(tr);
    const codeEl = qs('[data-f="code"]', tr);
    const code = codeEl ? String(codeEl.value || '').trim() : '';
    if (!nm && !code) return;
    if (poItemHasInward(poNo, nm, code)) {
      lockTableRow(tr, 'Inward already exists for this item — delete is disabled');
      const del = qs('button.btn-icon.danger, button.btn-icon', tr);
      if (del) { del.disabled = true; del.title = 'Cannot delete — inward exists for this item'; }
      locked++;
    }
  });
  showLockNote('po-items', locked, locked + ' item line' + (locked > 1 ? 's are' : ' is') + ' locked — inward is already booked against this item.');
}
/* Inward form: lock every item line already consumed by an outward document */
function inwardLockConsumedRows() {
  const rec = (formCtx && formCtx.id) ? db.inward.find(function (r) { return r.id === formCtx.id; }) : null;
  if (!rec) return;
  let locked = 0;
  qsa('#inward-items tr').forEach(function (tr) {
    const nm = rowItemName(tr);
    if (nm && inwardItemHasOutward(rec, nm)) { lockTableRow(tr, 'Inward ' + rec.no + ' — this item is already used on a later entry and cannot be changed or deleted'); locked++; }
  });
  showLockNote('inward-items', locked, locked + ' item line' + (locked > 1 ? 's are' : ' is') + ' locked — Inward ' + rec.no + ' is already used (Job Work / Sample / Purchase Return).');
}
function showLockNote(tbodyId, count, msg) {
  const tb = $(tbodyId); if (!tb) return;
  const wrap = tb.closest('.table-wrap'); if (!wrap) return;
  const old = wrap.parentNode.querySelector('.lock-note[data-for="' + tbodyId + '"]');
  if (old) old.remove();
  if (!count) return;
  wrap.insertAdjacentHTML('afterend', '<div class="lock-note" data-for="' + tbodyId + '">' + ic('lock', 15) + '<span>' + esc(msg) + '</span></div>');
}

/* warn (never block) when a line is received beyond the PO quantity */
function inwardCheckQty(el) {
  const tr = el.closest('tr'); if (!tr) return;
  const poQty = pf(tr.dataset.poqty);
  const prev = pf(tr.dataset.recvd);
  const now = pf(el.value);
  const over = (prev + now) - poQty;
  const bad = poQty > 0 && over > 0;
  tr.classList.toggle('row-over', bad);
  if (bad && !tr.dataset.warned) {
    tr.dataset.warned = '1';
    const nm = tr.querySelector('[data-f="name"]');
    toast('Over receipt on ' + ((nm && nm.value) || 'this item') + ' — PO ' + fmtNum(poQty) +
      ', already received ' + fmtNum(prev) + ', entering ' + fmtNum(now) +
      ' (excess ' + fmtNum(over) + ')', 'red');
  }
  if (!bad) delete tr.dataset.warned;
}
/* GST split follows the supplier's GST type, same rule as the PO */
function inwardGstMode() {
  const po = db.po.find(p => p.no === (CBOX['in-po'] ? CBOX['in-po'].val : ''));
  let t = po ? (po.gstType || '') : '';
  if (!t) t = partyGstType($('f-supplier') ? $('f-supplier').value : '') || 'IGST';
  return String(t).toUpperCase().indexOf('CGST') > -1 ? 'split' : 'igst';
}
function calcInward() {
  const tb = $('inward-items'); if (!tb) return;
  let tq = 0, amt = 0, cgst = 0, sgst = 0, igst = 0;
  const split = inwardGstMode() === 'split';
  qsa('tr', tb).forEach(function (tr) {
    const q = pf((qs('[data-f="recQty"]', tr) || {}).value);
    const rt = pf((qs('[data-f="poRate"]', tr) || {}).value);
    const line = q * rt;
    const cell = qs('.open-line-value', tr) || qs('[data-val]', tr); if (cell) cell.textContent = fmtNum(line);
    const gp = pf(tr.dataset.gst);
    if (split) { cgst += line * (gp / 2) / 100; sgst += line * (gp / 2) / 100; }
    else igst += line * gp / 100;
    tq += q; amt += line;
  });
  const fr = pf(($('in-freight') || {}).value);
  const frGst = pf(cboxGet('in-freight-gst-cb'));
  if (split) { cgst += fr * (frGst / 2) / 100; sgst += fr * (frGst / 2) / 100; }
  else igst += fr * frGst / 100;

  const before = amt + fr;
  const after = before + cgst + sgst + igst;
  const grand = Math.round(after);
  const round = grand - after;

  const put = function (id, v) { const el = $(id); if (el) el.textContent = fmtNum(v.toFixed ? +v.toFixed(2) : v); };
  if ($('in-sum-qty')) $('in-sum-qty').value = fmtNum(tq);
  if ($('in-sum-amt')) $('in-sum-amt').value = fmtINR(+amt.toFixed(2));
  put('in-t-freight', +fr.toFixed(2));
  put('in-t-before', +before.toFixed(2));
  put('in-t-sgst', +sgst.toFixed(2));
  put('in-t-cgst', +cgst.toFixed(2));
  put('in-t-igst', +igst.toFixed(2));
  put('in-t-after', +after.toFixed(2));
  put('in-t-round', +round.toFixed(2));
  put('in-t-grand', grand);
  renumberSr($('inward-items'));
}
function inwardAttRow(a) {
  a = a || {};
  const id = rid('inatt'), mandatory = /^supplier invoice$/i.test(String(a.name || '').trim());
  if (a.data) ATTDATA[id] = { data: a.data, fileName: a.fileName || '', locked: mandatory };
  else if (mandatory) ATTDATA[id] = { data: '', fileName: '', locked: true };
  return '<tr' + (mandatory ? ' data-mandatory-invoice="1"' : '') + '>' +
    srTd() +
    '<td><input class="inp" data-f="attName" value="' + esc(a.name || '') + '" placeholder="e.g. Invoice"' + (mandatory ? ' disabled title="Supplier Invoice is mandatory"' : '') + '></td>' +
    '<td class="att-cell" data-att="' + id + '">' + attCellHtml(id) + '</td>' +
    '<td class="att-preview-cell"><button type="button" class="btn btn-ghost btn-sm"' + ((ATTDATA[id] && ATTDATA[id].data) ? ' onclick="viewInwardAttachment(\'' + id + '\')"' : ' disabled') + '>' + ic('view', 13) + 'Preview</button></td>' +
    '<td class="actions-cell">' +
    '<button type="button" class="btn-icon" title="Add row" onclick="addRow(\'inward-atts\', inwardAttRow)">' + ic('plus', 15) + '</button>' +
    (mandatory ? '<button type="button" class="btn-icon danger" disabled title="Supplier Invoice cannot be deleted">' + ic('trash', 15) + '</button>' : '<button type="button" class="btn-icon danger" title="Remove" onclick="removeRow(this)">' + ic('trash', 15) + '</button>') +
    '</td></tr>';
}
const ATTDATA = {};
function attCellHtml(id) {
  const a = ATTDATA[id], accept = ' accept="image/*,application/pdf,.pdf"', change = ' onchange="onAttFile(this,\'' + id + '\')"';
  if (!(a && a.data)) return '<label class="pod-upload-box empty att-upload-box"><input type="file" data-f="attFile" data-attid="' + id + '"' + accept + change + '><span class="pod-upload-plus">＋</span><span class="pod-upload-title">Upload File</span><span class="pod-upload-help">Image or PDF · max 5 MB</span></label>';
  const pdf = /pdf/i.test(a.fileName || '') || /^data:application\/pdf/i.test(a.data), img = /^data:image\//i.test(a.data), preview = pdf ? '<div class="pod-preview-pdf">PDF</div>' : img ? '<img class="pod-preview-img" src="' + a.data + '" alt="Attachment">' : '<div class="pod-preview-pdf">FILE</div>';
  return '<div class="pod-upload-box has att-upload-box">' + (a.locked ? '' : '<div class="pod-upload-actions"><button type="button" class="pod-del" title="Remove file" onclick="event.stopPropagation();clearAtt(\'' + id + '\')">' + ic('trash', 11) + '</button></div>') + preview + '<div class="pod-upload-name" title="' + esc(a.fileName || 'file') + '">' + esc(a.fileName || 'file') + '</div>' + (a.locked ? '' : '<label class="pod-replace">Replace<input type="file" data-f="attFile" data-attid="' + id + '"' + accept + change + '></label>') + '</div>';
}
function syncAttachmentPreviewButton(id) { const cell = qs('[data-att="' + id + '"]'), btn = cell && cell.closest('tr') ? qs('.att-preview-cell .btn', cell.closest('tr')) : null, a = ATTDATA[id]; if (btn) { btn.disabled = !(a && a.data); btn.onclick = (a && a.data) ? function () { viewInwardAttachment(id); } : null; } }
function viewInwardAttachment(id) { const a = ATTDATA[id]; if (!a || !a.data) return; const pdf = /pdf/i.test(a.fileName || '') || /^data:application\/pdf/i.test(a.data); if (pdf) { const w = window.open('about:blank', '_blank'); if (!w) return toast('Allow pop-ups to preview the attachment', 'red'); const obj = podObjectUrl(a.data); try { w.location.replace(obj.url); } catch (e) { w.location.href = obj.url; } if (obj.revoke) setTimeout(function () { URL.revokeObjectURL(obj.url); }, 300000); return; } const w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to preview the attachment', 'red'); const doc = w.document; doc.open(); doc.write('<!DOCTYPE html><html><head><title>Attachment Preview</title></head><body style="margin:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh"></body></html>'); doc.close(); const imgEl = doc.createElement('img'); imgEl.style.maxWidth = '95vw'; imgEl.style.maxHeight = '95vh'; imgEl.src = a.data; doc.body.appendChild(imgEl); }
function clearAtt(id) {
  if (ATTDATA[id] && ATTDATA[id].locked) return toast('Supplier Invoice is mandatory and cannot be removed', 'red');
  delete ATTDATA[id];
  const cell = qs('[data-att="' + id + '"]'); if (cell) cell.innerHTML = attCellHtml(id); syncAttachmentPreviewButton(id);
}
function onAttFile(inp, id) {
  const f = inp.files && inp.files[0]; if (!f) return;
  const valid = /^image\//i.test(f.type) || /pdf/i.test(f.type) || /\.(pdf|png|jpe?g|webp)$/i.test(f.name); if (!valid) { inp.value = ''; return toast('Upload an image or PDF attachment', 'red'); }
  if (f.size > 5 * 1024 * 1024) return toast('File too large — keep attachments under 5 MB', 'red');
  const reader = new FileReader();
  reader.onload = function (e) {
    const locked = !!(ATTDATA[id] && ATTDATA[id].locked); ATTDATA[id] = { data: e.target.result, fileName: f.name, locked: locked };
    const cell = qs('[data-att="' + id + '"]'); if (cell) cell.innerHTML = attCellHtml(id); syncAttachmentPreviewButton(id);
    toast('Attached: ' + f.name, 'green');
  };
  reader.readAsDataURL(f);
}
function validateInwardAttachments() { const rows = qsa('#inward-atts tr'); for (let i = 0; i < rows.length; i++) { const tr = rows[i], nameEl = qs('[data-f="attName"]', tr), name = String((nameEl && nameEl.value) || '').trim(), cell = qs('[data-att]', tr), a = cell ? ATTDATA[cell.dataset.att] : null, hasFile = !!(a && a.data); if (hasFile && !name) return reqBad(nameEl, 'Attachment Name is required when a file is uploaded — row ' + (i + 1)); if (name && !hasFile) return reqBad(qs('.att-upload-box', tr) || cell, 'Attachment file is required when Attachment Name is entered — row ' + (i + 1)); } return true; }
function gatherAttachments() {
  const out = [];
  qsa('tr', $('inward-atts')).forEach(function (tr) {
    const nm = (qs('[data-f="attName"]', tr) || {}).value || '';
    const cell = qs('[data-att]', tr);
    const id = cell ? cell.dataset.att : '';
    const a = ATTDATA[id];
    if (nm.trim() || (a && a.data)) out.push({ name: nm.trim(), data: a ? a.data : '', fileName: a ? a.fileName : '' });
  });
  return out;
}
/* flip the Inward form between a PO receipt and an opening-stock entry */
function setInwardType(t) {
  const action = (pageView && pageView.id) ? 'edit' : 'create'; if (!userCanInward(t, action)) return toast(action.charAt(0).toUpperCase() + action.slice(1) + ' access denied for ' + t, 'red');
  const el = $('f-entrytype'); if (!el) return;
  if (t === 'PO Receipt' && el.value !== 'PO Receipt' && !(pageView && pageView.id)) { return requestAgainstPoInvoice(); }
  if (el.value === t) return;
  el.value = t;
  const opening = (t === 'Opening Stock');
  const jwret = (t === 'Job Work Return');
  /* keep whatever is already typed, just re-render the form in the new mode */
  const rec = (pageView && pageView.id) ? db.inward.find(function (x) { return x.id === pageView.id; }) : null;
  const draft = Object.assign({}, rec || {}, {
    entryType: t,
    date: dval('f-date') || today(),
    receivedBy: ($('f-by') || {}).value || '',
    warehouse: cboxGet('in-warehouse'),
    items: []
  });
  $('content').innerHTML = '<div class="entry-page">' + formInward(draft) + '</div>';
  dpSyncAll(); calcInward();
  toast(opening ? 'Opening stock mode — enter physical stock on hand'
    : jwret ? 'Job work return mode — material coming back from the job worker'
      : 'PO receipt mode', 'green');
}
/* a free-entry row: pick any item, type the quantity you physically hold */

function openingStockHeaders() { return ['Item Code', 'Opening Qty', 'Rate']; }
function exportOpeningStockTemplate() {
  const headers = openingStockHeaders();
  const items = (db.masters.items || []).filter(function (it) { return it.active !== false; });
  const rows = items.length
    ? items.map(function (it) { return [it.code || it.id || '', '', '']; })
    : [['', '', '']];
  const sheets = [
    { name: 'Opening Stock', headers: headers, rows: rows },
    {
      name: 'Instructions', headers: ['Field', 'Required', 'Notes'], rows: [
        ['Item Code', 'Yes', 'Item Master ID, e.g. ITM-0012'],
        ['Opening Qty', 'Yes', 'Physical quantity on hand — must be greater than 0'],
        ['Rate', 'Yes', 'Rate per unit — 0 allowed'],
        ['Tip', '', 'Fill Opening Qty and Rate only. Classification, Item Name and Unit come from Item Master on upload.']
      ]
    }
  ];
  let content = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
  let wb = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
  let rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  const files = {};
  sheets.forEach(function (sh, i) {
    const n = i + 1;
    content += '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    wb += '<sheet name="' + xesc(sh.name) + '" sheetId="' + n + '" r:id="rId' + n + '"/>';
    rels += '<Relationship Id="rId' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + n + '.xml"/>';
    files['xl/worksheets/sheet' + n + '.xml'] = xsheet(sh.headers, sh.rows, []);
  });
  content += '</Types>'; wb += '</sheets></workbook>';
  rels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  files['[Content_Types].xml'] = content;
  files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  files['xl/workbook.xml'] = wb;
  files['xl/_rels/workbook.xml.rels'] = rels;
  files['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303030"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>';
  downloadBytes(xzip(files), 'Opening_Stock_Template_' + today() + '.xlsx');
  toast('Opening Stock Excel template downloaded — fill Qty & Rate, then upload', 'green');
}
function triggerOpeningStockImport() {
  const inp = $('open-xlsx-file'); if (!inp) return;
  inp.value = ''; inp.click();
}
function resolveOpeningItem(codeOrName) {
  const raw = String(codeOrName || '').trim(); if (!raw) return null;
  const items = db.masters.items || [];
  const lc = raw.toLowerCase();
  return items.find(function (i) { return String(i.code || '').toLowerCase() === lc; }) ||
    items.find(function (i) { return String(i.id || '').toLowerCase() === lc; }) ||
    itemByName(raw) ||
    items.find(function (i) { return String(i.name || '').toLowerCase() === lc; }) ||
    null;
}
async function readOpeningStockXlsx(file) {
  const buf = await file.arrayBuffer();
  let shared = '';
  try { shared = await unzipEntry(buf, 'xl/sharedStrings.xml'); } catch (e) { }
  const ss = parseShared(shared);
  const xml = await unzipEntry(buf, 'xl/worksheets/sheet1.xml');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const out = [];
  Array.from(doc.getElementsByTagName('row')).forEach(function (r, ri) {
    if (ri === 0) return;
    const row = new Array(3).fill('');
    Array.from(r.getElementsByTagName('c')).forEach(function (c) {
      const ref = c.getAttribute('r') || '', letters = (/^[A-Z]+/.exec(ref) || [''])[0];
      let col = 0; for (const ch of letters) col = col * 26 + ch.charCodeAt(0) - 64; col--;
      if (col < 0 || col >= row.length) return;
      const t = c.getAttribute('t'); let v = '';
      if (t === 'inlineStr') { const n = c.getElementsByTagName('t')[0]; v = n ? n.textContent : ''; }
      else { const n = c.getElementsByTagName('v')[0]; v = n ? n.textContent : ''; if (t === 's') v = ss[+v] || ''; }
      row[col] = String(v).trim();
    });
    if (row.some(Boolean)) out.push(row);
  });
  return out;
}
async function importOpeningStockExcel(inp) {
  const file = inp.files && inp.files[0]; if (!file) return;
  let rows;
  try { rows = await readOpeningStockXlsx(file); }
  catch (e) { toast('Could not read Excel file: ' + (e.message || e), 'red'); inp.value = ''; return; }
  const errors = [], loaded = [];
  const seen = {};
  rows.forEach(function (r, idx) {
    const code = r[0], qty = pf(r[1]), rate = pf(r[2]);
    const line = idx + 2;
    if (!String(code || '').trim() && qty <= 0 && rate <= 0) return;
    const it = resolveOpeningItem(code);
    if (!it) { errors.push('Row ' + line + ': Item Code not found in Item Master — ' + (code || '(blank)')); return; }
    if (!(qty > 0)) { errors.push('Row ' + line + ': Opening Qty must be greater than 0 for ' + (it.code || it.name)); return; }
    if (rate < 0) { errors.push('Row ' + line + ': Rate cannot be negative for ' + (it.code || it.name)); return; }
    const key = String(it.id || it.code || it.name).toLowerCase();
    if (seen[key]) { errors.push('Row ' + line + ': duplicate Item Code ' + (it.code || it.name)); return; }
    seen[key] = 1;
    loaded.push({
      classification: it.classification || '',
      name: it.name,
      recQty: qty,
      poRate: rate,
      unit: it.unit || '',
      gst: it.gst
    });
  });
  if (!loaded.length) {
    toast(errors.length ? errors.slice(0, 3).join(' | ') : 'No valid opening stock rows found', 'red');
    inp.value = ''; return;
  }
  const tb = $('inward-items');
  if (tb) tb.innerHTML = loaded.map(function (it) { return openItemRow(it); }).join('');
  if (typeof dpSyncAll === 'function') dpSyncAll();
  loaded.forEach(function () { });
  if (typeof calcInward === 'function') calcInward();
  qsa('#inward-items [data-f="recQty"]').forEach(function (el) { if (typeof calcOpeningValue === 'function') calcOpeningValue(el); });
  toast('Uploaded ' + loaded.length + ' opening stock item' + (loaded.length > 1 ? 's' : '') + (errors.length ? ' — ' + errors.length + ' row(s) skipped' : ''), 'green');
  if (errors.length) toast(errors.slice(0, 4).join(' | ') + (errors.length > 4 ? ' …' : ''), 'amber');
  inp.value = '';
}

function openItemRow(it) {
  it = it || {};
  const clsId = rid('opcl'), itemId = rid('opit');
  const im = itemByName(it.name);
  const gstPct = pf(it.gst) || (im ? pf(im.gst) : 0);
  return '<tr data-poqty="0" data-recvd="0" data-gst="' + gstPct + '">' +
    srTd() +
    '<td>' + cbox(clsId, { opts: db.masters.classifications, value: it.classification || (im ? im.classification : '') || '', f: 'classification', placeholder: 'Classification', free: true, onSet: function () { jwClassChanged(clsId, itemId); } }) + '</td>' +
    '<td>' + cbox(itemId, { opts: itemOptsFor(it.classification || (im ? im.classification : '') || ''), value: it.name || '', f: 'name', placeholder: 'Select item', free: true, onSet: function (v) { openRowItemPicked(qs('[data-cb-input="' + itemId + '"]'), v); } }) +
    '<input type="text" data-f="specs" value="' + esc(it.specs || '') + '" style="display:none" tabindex="-1" aria-hidden="true">' +
    '<input type="text" data-f="color" value="' + esc(it.color || '') + '" style="display:none" tabindex="-1" aria-hidden="true"></td>' +
    '<td class="num"><input class="inp num" type="number" min="0" step="0.01" data-f="recQty" value="' + (it.recQty ?? '') + '" placeholder="0" oninput="calcOpeningValue(this)" onchange="calcOpeningValue(this)"></td>' +
    '<td class="num"><input class="inp num" type="number" min="0" step="0.01" data-f="poRate" value="' + (it.poRate ?? '') + '" placeholder="0" oninput="calcOpeningValue(this)" onchange="calcOpeningValue(this)">' +
    '<input type="text" data-f="gst" value="' + gstPct + '" style="display:none" tabindex="-1" aria-hidden="true">' +
    '</td>' +
    '<td class="num open-line-value" data-val style="font-weight:650">' + fmtNum(pf(it.recQty) * pf(it.poRate)) + '</td>' +
    '<td class="uom-cell"><input class="inp" data-f="unit" value="' + esc(it.unit || '') + '" placeholder="Auto" disabled></td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this);calcInward()">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
/* Opening Stock value updates immediately as Opening Qty × Rate. Keeping this
   row-level calculation separate makes the Value cell responsive even before
   the complete Inward totals are recalculated. */
function calcOpeningValue(el) {
  const tr = el && el.closest ? el.closest('tr') : null;
  if (tr) {
    const qty = pf((qs('[data-f="recQty"]', tr) || {}).value);
    const rate = pf((qs('[data-f="poRate"]', tr) || {}).value);
    const valueCell = qs('.open-line-value', tr) || qs('[data-val]', tr);
    if (valueCell) valueCell.textContent = fmtNum(qty * rate);
  }
  calcInward();
}
/* one line per item in an opening-stock entry */
function openDupCheck(tr, name) {
  const nm = String(name || '').trim().toLowerCase();
  if (!nm) return false;
  const tb = tr.parentNode; if (!tb) return false;
  let dup = false;
  qsa('tr', tb).forEach(function (other) {
    if (other === tr || dup) return;
    const el = qs('[data-f="name"]', other);
    const v = el ? String(el.dataset.cbInput ? cboxGet(el.dataset.cbInput) : el.value || '').trim().toLowerCase() : '';
    if (v === nm) dup = true;
  });
  if (!dup) return false;
  toast('Already added — ' + name + ' is on another line. Update that quantity instead.', 'red');
  const el = qs('[data-f="name"]', tr);
  if (el && el.dataset.cbInput) { cboxSet(el.dataset.cbInput, ''); el.value = ''; }
  const u = qs('[data-f="unit"]', tr); if (u) u.value = '';
  const q = qs('[data-f="recQty"]', tr); if (q) q.value = '';
  const r = qs('[data-f="poRate"]', tr); if (r) r.value = '';
  calcInward();
  return true;
}
function openRowItemPicked(anyEl, name) {
  const tr = anyEl && anyEl.closest ? anyEl.closest('tr') : null; if (!tr) return;
  if (openDupCheck(tr, name)) return;
  const im = itemByName(name);
  const u = qs('[data-f="unit"]', tr); if (u) u.value = im ? (im.unit || '') : '';
  const g = qs('[data-f="gst"]', tr); if (g) g.value = im ? pf(im.gst) : 0;
  tr.dataset.gst = im ? pf(im.gst) : 0;
  const rate = qs('[data-f="poRate"]', tr);
  if (rate && !pf(rate.value) && im && pf(im.purchaseRate)) rate.value = im.purchaseRate;
  calcInward();
}
function inwardItemRow(it, poQty, excludeId) {
  it = it || {};
  const poRef = (typeof CBOX !== 'undefined' && CBOX['in-po']) ? CBOX['in-po'].val : '';
  const done = inwardReceivedSoFar(poRef, it.name, it.color || it.colour, excludeId);
  const bal = Math.max(0, pf(poQty) - done);
  const im = itemByName(it.name);
  const gstPct = pf(it.gst) || (im ? pf(im.gst) : 0);
  return '<tr data-poqty="' + pf(poQty) + '" data-recvd="' + done + '" data-gst="' + gstPct + '">' +
    srTd() +
    '<td><input class="inp" data-f="classification" value="' + esc(it.classification || (im ? im.classification : '') || '') + '" placeholder="—" disabled></td>' +
    '<td><input class="inp" data-f="name" value="' + esc(itemDisplay(it.name) || it.name || '') + '" placeholder="From PO" disabled>' +
    '<input type="text" data-f="specs" value="' + esc(it.specs || '') + '" style="display:none" tabindex="-1" aria-hidden="true">' +
    '<input type="text" data-f="color" value="' + esc(it.color || '') + '" style="display:none" tabindex="-1" aria-hidden="true"></td>' +
    '<td class="num" style="color:var(--muted);font-weight:600">' + fmtNum(poQty) + '</td>' +
    '<td class="num tdr"><b>' + fmtNum(done) + '</b>' +
    (pf(poQty) > 0 ? '<div class="sub-line">balance ' + fmtNum(bal) + '</div>' : '') + '</td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" inputmode="decimal" data-f="recQty" value="' + (it.recQty ?? '') + '" placeholder="0" oninput="inwardCheckQty(this);calcInward()"></td>' +
    '<td><input class="inp num" type="number" data-f="poRate" value="' + (it.poRate ?? '') + '" placeholder="Auto" disabled>' +
    '<input type="text" data-f="gst" value="' + gstPct + '" style="display:none" tabindex="-1" aria-hidden="true">' +
    '</td>' +
    '<td class="num" data-val style="font-weight:650">0</td>' +
    '<td><input class="inp" data-f="unit" value="' + esc(it.unit || '') + '" placeholder="—" disabled></td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this)">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
function formInward(rec) {
  const r = rec || {};
  const isEdit = !!(rec && rec.id);
  const opening = r.entryType === 'Opening Stock';
  const jwret = r.entryType === 'Job Work Return';
  const poMode = !opening && !jwret;
  return '<div class="sec" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
    (isEdit ? 'Edit Inward (' + esc(r.no || '') + ' · ' + esc(r.entryType || '') + ')' : 'New Material Inward') +
    '<span style="margin-left:auto;display:flex;gap:8px;align-items:center">' +
    '<button type="button" class="btn btn-ghost btn-sm" onclick="back()">' + ic('back', 14) + 'Back to Inwards</button>' +
    (isEdit ? '<button type="button" class="btn btn-primary btn-sm" onclick="openForm(\'inward\')">＋ New Inward</button>' : '') +
    (opening
      ? '<button type="button" class="btn btn-ghost btn-sm" onclick="exportOpeningStockTemplate()">⬇ Excel template</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" onclick="triggerOpeningStockImport()">⬆ Upload Excel</button>' +
      '<input type="file" id="open-xlsx-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none" onchange="importOpeningStockExcel(this)">'
      : '') +
    '</span>' +
    '</div>' +
    '<div class="field" style="max-width:720px">' +
    '<label class="lbl">Entry Type</label>' +
    '<div class="segbar">' +
    '<button type="button" class="seg' + (poMode ? ' on' : '') + (isEdit ? ' locked' : '') + '"' + ((isEdit || !userCanInward('PO Receipt', 'create')) ? ' disabled title="Entry type unavailable for this user"' : ' onclick="setInwardType(\'PO Receipt\')"') + '>' + ic('inbox', 15) + 'Against PO</button>' +
    '<button type="button" class="seg' + (opening ? ' on' : '') + (isEdit ? ' locked' : '') + '"' + ((isEdit || !userCanInward('Opening Stock', 'create')) ? ' disabled title="Entry type unavailable for this user"' : ' onclick="setInwardType(\'Opening Stock\')"') + '>' + ic('box', 15) + 'Opening Stock</button>' +
    '<button type="button" class="seg' + (jwret ? ' on' : '') + (isEdit ? ' locked' : '') + '"' + ((isEdit || !userCanInward('Job Work Return', 'create')) ? ' disabled title="Entry type unavailable for this user"' : ' onclick="setInwardType(\'Job Work Return\')"') + '>' + ic('receive', 15) + 'Job Work Return</button>' +
    '</div>' +
    '<input type="hidden" id="f-entrytype" value="' + esc(r.entryType || 'PO Receipt') + '">' +
    '<div class="fhint" id="f-entrytype-hint">' +
    (isEdit ? '<b>Notice:</b> You are editing existing record <b>' + esc(r.no || '') + '</b>. Entry type cannot be changed once saved. To inward new goods against a PO, click <a href="javascript:void(0)" onclick="openForm(\'inward\')" style="color:var(--primary);font-weight:600;text-decoration:underline">＋ New Inward</a>.' : (opening
      ? 'Physical stock already on hand — no PO, no supplier invoice.'
      : jwret
        ? 'Material coming back from a job worker into your warehouse.'
        : 'Goods received against a purchase order.')) +
    '</div>' +
    '</div>' +
    '<div class="grid-fixed' + (jwret ? ' in-jwr' : '') + '">' +
    field('Inward No', '<input class="inp" id="f-no" value="' + esc(r.no || 'Auto-generated') + '" disabled>', 'inj-no') +
    field('Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly disabled id="f-date" value="' + esc(r.date || today()) + '">', 'inj-date') +
    '<div class="field po-only"' + (poMode ? '' : ' style="display:none"') + '><label class="lbl">PO Reference *</label>' +
    cbox('in-po', { opts: poOptions(), value: r.poRef || '', f: 'poRef', placeholder: 'Search PO…', free: false, onSet: onPOSelect }) + '</div>' +
    '<div class="field po-only"' + (poMode ? '' : ' style="display:none"') + '><label class="lbl">Supplier</label>' +
    '<input class="inp" id="f-supplier" value="' + esc(r.supplier || '') + '" placeholder="Auto from PO" disabled></div>' +
    '<div class="field po-only"' + (poMode ? '' : ' style="display:none"') + '><label class="lbl">Invoice No. *</label>' +
    '<input class="inp" id="f-invno" value="' + esc(r.invoiceNo || '') + '" placeholder="Supplier invoice no."></div>' +
    '<div class="field po-only"' + (poMode ? '' : ' style="display:none"') + '><label class="lbl">Invoice Date *</label>' +
    '<input class="inp" type="text" data-date autocomplete="off" readonly id="f-invdate" value="' + esc(r.invoiceDate || '') + '"></div>' +
    (poMode ? field('Warehouse *', cbox('in-warehouse', { opts: db.masters.warehouses, value: r.warehouse || '', f: 'warehouse', placeholder: 'Select warehouse', addMaster: 'warehouses', addText: 'Warehouse', free: true }), 'inj-wh') : '') +
    '<div class="field po-only"' + (poMode ? '' : ' style="display:none"') + '><label class="lbl">Vehicle No</label>' +
    '<input class="inp" id="f-vehicle" value="' + esc(r.vehicle || '') + '"></div>' +
    (opening ? '' : field('Received By', '<input class="inp" id="f-by" value="' + esc(r.receivedBy || '') + '">', 'inj-by')) +
    (poMode ? '' : field('Warehouse *', cbox('in-warehouse', { opts: db.masters.warehouses, value: r.warehouse || '', f: 'warehouse', placeholder: 'Select warehouse', addMaster: 'warehouses', addText: 'Warehouse', free: true }), 'inj-wh')) +
    '<div class="field open-only"' + (opening ? '' : ' style="display:none"') + '><label class="lbl">Remarks</label>' +
    '<input class="inp" id="f-openremark" value="' + esc(r.openingRemark || '') + '" placeholder="e.g. Stock as on go-live"></div>' +
    '<div class="field jwr-only inj-jw"' + (jwret ? '' : ' style="display:none"') + '><label class="lbl">Job Work No. *</label>' +
    cbox('in-jw', { opts: jwOptions(), value: r.jwRef || '', f: 'jwRef', placeholder: 'Search Job Work…', free: false, onSet: onInwardJWSelect }) + '</div>' +
    '<div class="field jwr-only inj-ven"' + (jwret ? '' : ' style="display:none"') + '><label class="lbl">Job Worker</label>' +
    '<input class="inp" id="f-jwvendor" value="' + esc(r.vendor || '') + '" placeholder="Auto from Job Work" disabled></div>' +
    '<div class="field jwr-only inj-ch"' + (jwret ? '' : ' style="display:none"') + '><label class="lbl">Challan No</label>' +
    '<input class="inp" id="f-jwchallan" value="' + esc(r.challan || '') + '" placeholder="Job worker challan"></div>' +
    '</div>' +
    (opening
      ? '<div class="sec">Opening Stock Items</div>'
      : jwret
        ? '<div class="sec">Material Returned by Job Worker</div>'
        : '<div class="sec">Items Received (PO qty for reference)</div>') +
    (jwret
      ? '<div class="table-wrap"><table class="mini-table jwr-items-table">' +
      '<colgroup><col class="j-sr"><col class="j-name"><col class="j-iss"><col class="j-alr"><col class="j-qty"><col class="j-rate"><col class="j-val"><col class="j-unit"><col class="j-type"><col class="j-act"></colgroup>' +
      '<thead><tr>' +
      srTh() + '<th>Item Name</th><th>Issued</th><th>Already Returned</th>' +
      '<th>Return Qty</th><th>Rate</th><th>Value</th><th>Unit</th><th>Return Type</th><th></th>' +
      '</tr></thead><tbody id="inward-items">' +
      ((r.items && r.items.length) ? r.items.map(it => jwrItemRow(it, r.id)).join('') : jwrItemRow()) +
      '</tbody></table></div>'
      : '<div class="table-wrap"><table class="mini-table' + (opening ? ' open-stock-table' : ' po-inward-table') + '">' +
      (opening
        ? '<colgroup><col class="c-sr"><col class="c-cls"><col class="c-name"><col class="c-qty"><col class="c-rate"><col class="c-val"><col class="c-unit"><col class="c-act"></colgroup>'
        : '<colgroup><col class="p-sr"><col class="p-cls"><col class="p-name"><col class="p-poq"><col class="p-till"><col class="p-qty"><col class="p-rate"><col class="p-val"><col class="p-unit"><col class="p-act"></colgroup>') +
      '<thead><tr>' + srTh() + '<th>Classification</th><th>Item Name</th>' +
      (opening ? '' : '<th>PO Qty</th><th>Till Date Received</th>') +
      '<th>' + (opening ? 'Opening Qty' : 'Recv Qty') + '</th>' +
      '<th>' + (opening ? 'Rate' : 'PO Rate') + '</th>' +
      '<th>Value</th><th>Unit</th><th></th></tr></thead>' +
      '<tbody id="inward-items">' +
      (r.items && r.items.length
        ? r.items.map(it => opening ? openItemRow(it) : inwardItemRow(it, it.poQty, r.id)).join('')
        : (opening ? openItemRow() : inwardItemRow())) +
      '</tbody></table></div>') +
    (opening
      ? '<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addRow(\'inward-items\', openItemRow)">' + ic('plus', 15) + 'Add item</button>'
      : '') +

    '<div class="grid-even5" style="margin-top:18px">' +
    field('Total Quantity', '<input class="inp" id="in-sum-qty" value="0" disabled>') +
    field('Total Amount', '<input class="inp" id="in-sum-amt" value="₹0" disabled>') +
    (poMode
      ? field('Freight Charges', '<input class="inp num" type="number" min="0" step="0.01" id="in-freight" value="' + esc(r.freight ?? 0) + '" oninput="calcInward()">') +
      field('Freight GST%', cbox('in-freight-gst-cb', { opts: db.masters.gstRates, value: (r.freightGst === '' || r.freightGst == null) ? '0' : String(r.freightGst), f: 'freightGst', placeholder: '--GST %--', addMaster: 'gstRates', addText: 'GST %', free: false, onSet: function () { calcInward(); } })) +
      field('Freight HSN Code', '<input class="inp" id="in-freight-hsn" inputmode="numeric" pattern="[0-9]*" maxlength="12" value="' + esc(r.freightHsn || '') + '" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')" placeholder="Numbers only">')
      : '') +
    '</div>' +

    '<div class="inward-bottom-grid' + (poMode ? '' : ' single') + '">' +
    (poMode
      ? '<div class="inward-summary-row"><section class="inward-summary-panel"><div class="sec">Summary</div>' +
      '<div class="intot-wrap"><table class="intot">' +
      '<tr><th>Freight Charges</th><td class="num" id="in-t-freight">0.00</td></tr>' +
      '<tr><th>Total (Before Tax)</th><td class="num" id="in-t-before">0.00</td></tr>' +
      '<tr><th>SGST</th><td class="num" id="in-t-sgst">0.00</td></tr>' +
      '<tr><th>CGST</th><td class="num" id="in-t-cgst">0.00</td></tr>' +
      '<tr><th>IGST</th><td class="num" id="in-t-igst">0.00</td></tr>' +
      '<tr><th>Total (After Tax)</th><td class="num" id="in-t-after">0.00</td></tr>' +
      '<tr><th>Round Off</th><td class="num" id="in-t-round">0.00</td></tr>' +
      '<tr class="grand"><th>Grand Total</th><td class="num" id="in-t-grand">0.00</td></tr>' +
      '</table></div></section></div>'
      : '') +
    '<section class="inward-attachments-panel">' +
    '<div class="sec">Attachments</div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Attachment Name</th><th>Attachment</th><th>Preview</th><th class="num">Add/Remove</th></tr></thead>' +
    '<tbody id="inward-atts">' + ((r.attachments && r.attachments.length) ? r.attachments.map(inwardAttRow).join('') : inwardAttRow()) + '</tbody></table></div></section>' +
    '</div>';
}
function onPOSelect(poNo) {
  const po = db.po.find(p => p.no === poNo);
  const sup = $('f-supplier');
  const excl = (pageView && pageView.kind === 'form' && pageView.m === 'inward') ? pageView.id : null;
  if (!po) { if (sup) sup.value = ''; $('inward-items').innerHTML = inwardItemRow(); dpSyncAll(); calcInward(); return; }
  // Block further inward entry until the PO is Approved (or already in receipt).
  if (po && !['Approved', 'Partially Received', 'Received'].includes(po.status)) {
    toast('Inward blocked: PO ' + po.no + ' is "' + (po.status || 'Draft') + '" — approve the PO before booking inward.', 'red');
    if (typeof cboxSet === 'function') cboxSet('in-po', '');
    if (sup) sup.value = '';
    $('inward-items').innerHTML = inwardItemRow();
    dpSyncAll(); calcInward();
    return;
  }
  if (sup) sup.value = po.supplier || '';
  $('inward-items').innerHTML = po.items.map(i => inwardItemRow(
    {
      name: i.name, classification: i.classification, specs: i.specs, color: i.color, recQty: 0, unit: i.unit || 'm',
      poRate: i.rate, gst: pf(i.cgstPct) + pf(i.sgstPct) + pf(i.igstPct)
    }, i.qty, excl)).join('') || inwardItemRow();
  dpSyncAll(); calcInward(); inwardLockConsumedRows();
}
function saveInward(id) {
  clearReqMarks();
  const entryType = (($('f-entrytype') || {}).value) || 'PO Receipt';
  if (!userCanInward(entryType, id ? 'edit' : 'create')) return toast((id ? 'Edit' : 'Create') + ' access denied for ' + entryType, 'red');
  const opening = entryType === 'Opening Stock';
  const jwret = entryType === 'Job Work Return';
  const poMode = !opening && !jwret;
  const items = gatherRows('inward-items', ['name']).map(function (i) { i.name = bareItemName(i.name); return i; })
    .filter(function (i) { return pf(i.recQty) > 0; });
  if (!validateInwardAttachments()) return false;
  const attachments = gatherAttachments();
  if (poMode && !attachments.some(function (a) { return a && a.data && (/invoice/i.test(a.name || '') || /invoice/i.test(a.fileName || '')); })) return reqBad(qs('#inward-atts input[type=file]'), 'Supplier Invoice attachment is mandatory for Against PO Inward');
  if (jwret && !cboxGet('in-jw')) return reqBad('in-jw', 'Job Work number is required');
  if (poMode && !cboxGet('in-po')) return reqBad('in-po', 'PO Reference is required');
  if (poMode) {
    const poHit = db.po.find(function (p) { return p.no === cboxGet('in-po'); });
    if (poHit && isInactiveDoc(poHit)) return reqBad('in-po', 'PO ' + poHit.no + ' is ' + String(poHit.status).toLowerCase() + ' — reopen it to book inward');
    if (poHit && !['Approved', 'Partially Received', 'Received'].includes(poHit.status)) {
      return reqBad('in-po', 'PO ' + poHit.no + ' is "' + (poHit.status || 'Draft') + '" — approve the PO before booking inward');
    }
  }
  if (poMode) {
    if (!($('f-invno').value || '').trim()) return reqBad('f-invno', 'Invoice No. is required');
    if (!dval('f-invdate')) return reqBad('f-invdate', 'Invoice Date is required');
    const poDateRec = db.po.find(function (p) { return p.no === cboxGet('in-po'); });
    if (poDateRec && poDateRec.date && dval('f-invdate') < poDateRec.date) {
      return reqBad('f-invdate', 'Invoice Date must be the same as or later than the PO Date (' + dpToDisplay(poDateRec.date) + ')');
    }
  }
  if (!cboxGet('in-warehouse')) return reqBad('in-warehouse', 'Warehouse is required');
  if (poMode) {
    const invNo = ($('f-invno').value || '').trim().toLowerCase();
    const poNo = cboxGet('in-po');
    const clash = db.inward.find(function (r) {
      return r.id !== id && r.poRef === poNo && String(r.invoiceNo || '').trim().toLowerCase() === invNo;
    });
    if (clash) return reqBad('f-invno', 'Invoice ' + ($('f-invno').value || '').trim() + ' is already recorded against ' + poNo + ' in ' + clash.no + ' — duplicate invoice numbers are not allowed');
  }
  const zeroIn = items.find(function (i) { return pf(i.recQty) <= 0; });
  if (zeroIn) return reqBadCell('inward-items', reqFirstEmptyRow('inward-items', 'recQty'), 'recQty', 'Quantity must be more than zero — ' + (zeroIn.name || 'item'));
  if (!items.length) return reqBadCell('inward-items', 0, opening ? 'name' : 'recQty', (opening || jwret) ? 'Enter a quantity for at least one item' : 'Add at least one item row');
  if (opening) {
    const seen = {};
    for (let k = 0; k < items.length; k++) {
      const key = String(items[k].name || '').trim().toLowerCase();
      if (key && seen[key]) return reqBadCell('inward-items', k, 'name', 'Duplicate item — ' + items[k].name + ' appears more than once');
      seen[key] = 1;
    }
  }
  const prev = id ? db.inward.find(r => r.id === id) : null;
  const data = {
    entryType: entryType,
    openingRemark: opening ? ((($('f-openremark') || {}).value) || '').trim() : '',
    jwRef: jwret ? cboxGet('in-jw') : '',
    vendor: jwret ? (($('f-jwvendor') || {}).value || '').trim() : '',
    challan: jwret ? (($('f-jwchallan') || {}).value || '').trim() : '',
    date: dval('f-date') || today(), poRef: (opening || jwret) ? '' : cboxGet('in-po'),
    grn: prev ? (prev.grn || '') : '',
    invoiceNo: (opening || jwret) ? '' : (($('f-invno') || {}).value || '').trim(),
    invoiceDate: (opening || jwret) ? '' : dval('f-invdate'),
    supplier: opening ? 'Opening Stock'
      : jwret ? ((($('f-jwvendor') || {}).value || '').trim() || 'Job Work Return')
        : (($('f-supplier') || {}).value || '').trim(),
    vehicle: (opening || jwret) ? '' : (($('f-vehicle') || {}).value || '').trim(),
    bin: prev ? (prev.bin || '') : '',
    receivedBy: opening ? '' : String((($('f-by') || {}).value) || '').trim(),
    warehouse: cboxGet('in-warehouse'),
    freight: poMode ? pf(($('in-freight') || {}).value) : 0,
    freightGst: poMode ? pf(cboxGet('in-freight-gst-cb')) : 0,
    freightHsn: poMode ? ((($('in-freight-hsn') || {}).value) || '').trim() : '',
    attachments: attachments,
    items, status: prev ? (prev.status || ((opening || jwret) ? 'Completed' : 'Completed')) : ((opening || jwret) ? 'Completed' : 'Completed')
  };
  if (id) {
    const ex = db.inward.find(r => r.id === id);
    Object.assign(ex, data);
    if (opening) ex.poRef = osRefFor(ex.no);              // IN-0003 -> OS-0003
    if (jwret) ex.poRef = osRefFor(ex.no).replace('OS-', 'JWR-');
  } else {
    data.id = uid();
    data.no = nextNo('inward', 'IN');          // one continuous series for all inwards
    if (opening) data.poRef = osRefFor(data.no);          // IN-0003 -> OS-0003
    if (jwret) data.poRef = osRefFor(data.no).replace('OS-', 'JWR-');   // IN-0003 -> JWR-0003
    data.createdAt = Date.now();
    db.inward.push(data);
  }
  saveDB(); if (data.poRef && !opening && !jwret) updatePOStatus(data.poRef);
  pageView = null; PENDING_INWARD_INVOICE = null;
  toast(opening ? 'Opening stock saved' : jwret ? 'Job work return saved' : 'Inward saved', 'green');
  render();
}
function updatePOStatus(poNo) {
  const po = db.po.find(p => p.no === poNo); if (!po || isInactiveDoc(po)) return;
  const inws = db.inward.filter(i => i.poRef === poNo && i.status !== 'Rejected');
  let allDone = true, any = false;
  po.items.forEach(it => {
    const itId = it.item_id || findMasterId(it.name, 'items');
    const got = inws.reduce((a, i) => a + sumBy(i.items.filter(x => {
      const xId = x.item_id || findMasterId(x.name, 'items');
      return (itId && xId) ? (itId === xId) : (x.name === it.name);
    }), 'recQty'), 0);
    if (got <= 0) allDone = false; else any = true;
    if (got < pf(it.qty)) allDone = false;
  });
  if (allDone && any) po.status = 'Received';
  else if (any) po.status = 'Partially Received';
  saveDB();
}


