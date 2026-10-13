/**
 * StitchFlow ERP — Purchase Orders (PO)
 * File: assets/js/modules/po.js
 */

/* ================= PO ================= */
function poItemRow(it) {
  it = it || {};
  const nameId = rid('poin'), unitId = null, clsId = rid('pocl');
  return '<tr>' +
    srTd() +
    '<td>' + cbox(clsId, { opts: db.masters.classifications, value: it.classification || '', f: 'classification', placeholder: 'Classification', addMaster: 'classifications', addText: 'Classifications', free: true, compact: true, onSet: function (v) { poClassChanged(clsId, nameId, v); } }) + '</td>' +
    '<td>' + cbox(nameId, { opts: itemOptsFor(it.classification), value: it.name || '', display: itemDisplay(it.name), f: 'name', placeholder: 'Item / Fabric', addMaster: 'items', addText: 'Item Master', free: true, onSet: v => { const tr = qs('[data-cb-input="' + nameId + '"]').closest('tr'); if (poDupCheck(tr, v)) return; poApplyItemDefaults(tr, v, unitId, clsId); calcPO(); } }) +
    '<input type="text" data-f="code" value="' + esc(it.code || '') + '" style="display:none" tabindex="-1" aria-hidden="true"></td>' +
    '<td><input class="inp" data-f="hsn" value="' + esc(it.hsn || '') + '" placeholder="Auto" disabled></td>' +
    '<td><input class="inp" data-f="unit" value="' + esc(it.unit || '') + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-stock style="color:var(--muted);font-weight:600">' + fmtNum(itemStockQty(it.name)) + '</td>' +
    '<td><input class="inp num" type="number" min="0" step="any" data-f="qty" value="' + (it.qty ?? '') + '" oninput="calcPO()"></td>' +
    '<td><input class="inp num" type="number" min="0" step="any" data-f="rate" value="' + (it.rate ?? '') + '" oninput="calcPO()"></td>' +
    '<td><input class="inp num inp-sm" type="number" step="any" data-f="cgstPct" value="' + (it.cgstPct ?? '') + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-camt style="color:var(--muted)">0</td>' +
    '<td><input class="inp num inp-sm" type="number" step="any" data-f="sgstPct" value="' + (it.sgstPct ?? '') + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-samt style="color:var(--muted)">0</td>' +
    '<td><input class="inp num inp-sm" type="number" step="any" data-f="igstPct" value="' + (it.igstPct ?? '') + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-iamt style="color:var(--muted)">0</td>' +
    '<td class="num" data-amt style="font-weight:700">0</td>' +
    '<td class="num" data-total style="font-weight:800;color:var(--pink-dark)">0</td>' +
    '<td><button type="button" class="btn-icon danger" onclick="removeRow(this);calcPO()">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
/* classification picked → restrict the item list on that row */
function poClassChanged(clsId, nameId, cls) {
  const c = CBOX[nameId]; if (!c) return;
  c.opts = itemOptsFor(cls).map(function (o) { return normalizeOpt(o, 'items'); }).filter(function (o) { return masterValueAllowed(o.v); });
  const stillValid = c.opts.some(function (o) { return o.v === c.val; });
  if (!stillValid) {
    c.val = ''; c.typed = false;
    const inp = qs('[data-cb-input="' + nameId + '"]');
    if (inp) {
      inp.value = '';
      const tr = inp.closest('tr');
      if (tr) {
        ['hsn', 'unit', 'code'].forEach(function (f) { const el = qs('[data-f="' + f + '"]', tr); if (el) el.value = ''; });
        const st = qs('[data-stock]', tr); if (st) st.textContent = '0';
      }
    }
    calcPO();
  }
  renderCboxList(nameId);
}
/* PO must never list the same item twice */
function poDupCheck(tr, name) {
  const nm = lcName(bareItemName(name));
  if (!nm || !tr) return false;
  const tb = tr.parentNode; if (!tb) return false;
  let dup = false;
  qsa('tr', tb).forEach(function (other) {
    if (other === tr || dup) return;
    if (lcName(rowItemName(other)) === nm) dup = true;
  });
  if (!dup) return false;
  toast('Duplicate item \u2014 ' + bareItemName(name) + ' is already on this purchase order. Update that line\u2019s quantity instead.', 'red');
  const el = qs('[data-f="name"]', tr);
  if (el && el.dataset.cbInput) { cboxSet(el.dataset.cbInput, ''); el.value = ''; }
  ['hsn', 'unit', 'code', 'cgstPct', 'sgstPct', 'igstPct', 'qty', 'rate'].forEach(function (f) {
    const x = qs('[data-f="' + f + '"]', tr); if (x) x.value = '';
  });
  const st = qs('[data-stock]', tr); if (st) st.textContent = '0';
  calcPO();
  return true;
}
/* '' when the line's GST matches Item Master, else the message */
function poGstMismatch(i) {
  const im = itemByName(bareItemName(i.name));
  if (!im) return '';
  const master = pf(im.gst);
  const line = pf(i.cgstPct) + pf(i.sgstPct) + pf(i.igstPct);
  if (Math.abs(master - line) < 0.005) return '';
  return 'GST mismatch — ' + bareItemName(i.name) + ' is configured at ' + fmtNum(master) +
    '% in Item Master but this line totals ' + fmtNum(line) + '%. Re-select the item to reload the correct rate.';
}
/* recompute every line's GST from Item Master + the PO's GST type */
function poSyncGstFromMaster() {
  const gstType = String((($('f-gsttype') || {}).value) || '').toUpperCase();
  const hasGstType = !!gstType;
  const splitGst = gstType.indexOf('CGST') > -1;
  let fixed = 0;
  qsa('#po-items tr').forEach(function (tr) {
    if (tr.classList.contains('row-locked')) return;
    const nm = rowItemName(tr); if (!nm) return;
    const im = itemByName(nm); if (!im) return;
    const g = pf(im.gst);
    const set = function (f, v) { const el = qs('[data-f="' + f + '"]', tr); if (el && String(el.value) !== String(v)) { el.value = v; fixed++; } };
    set('cgstPct', hasGstType && splitGst ? g / 2 : '');
    set('sgstPct', hasGstType && splitGst ? g / 2 : '');
    set('igstPct', hasGstType && !splitGst ? g : '');
  });
  if (fixed) calcPO();
  return fixed;
}
function poApplyItemDefaults(tr, name, unitId, clsId) {
  if (!tr) return;
  const it = itemByName(name);
  const set = (sel, val) => { const el = qs(sel, tr); if (el) el.value = (val != null && val !== '') ? val : ''; };
  set('[data-f="code"]', it ? it.code : '');
  if (clsId && it && it.classification) cboxSet(clsId, it.classification);
  set('[data-f="hsn"]', it ? it.hsn : '');
  set('[data-f="unit"]', it ? (it.unit || itemUnit(name)) : '');
  /* Item Master keeps ONE GST % — split it per the PO's GST type */
  const gstPct = it ? pf(it.gst) : 0;
  const gstType = String((($('f-gsttype') || {}).value) || '').toUpperCase();
  const hasGstType = !!gstType;
  const splitGst = gstType.indexOf('CGST') > -1;
  set('[data-f="cgstPct"]', it && hasGstType && splitGst ? gstPct / 2 : '');
  set('[data-f="sgstPct"]', it && hasGstType && splitGst ? gstPct / 2 : '');
  set('[data-f="igstPct"]', it && hasGstType && !splitGst ? gstPct : '');
  const stockTd = qs('[data-stock]', tr); if (stockTd) stockTd.textContent = fmtNum(itemStockQty(name));
}

/* =====================================================================
   RICH TEXT EDITOR — Shopify-style toolbar for PO Terms & Conditions
   ===================================================================== */
function termsToHtml(raw) {
  const t = String(raw == null ? '' : raw);
  if (!t) return DEFAULT_PO_TERMS;
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  return t.split(/\n+/).map(function (line) {
    const s = line.trim(); if (!s) return '';
    return '<p>' + esc(s) + '</p>';
  }).join('') || DEFAULT_PO_TERMS;
}
function rteSanitize(html) {
  const d = document.createElement('div');
  d.innerHTML = String(html == null ? '' : html);
  const dangerousTags = /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|SVG|MATH|FORM|INPUT|BUTTON|TEXTAREA|SELECT|OPTION|BASE|APPLET|FRAME|FRAMESET|TEMPLATE|NOSCRIPT|AUDIO|VIDEO|SOURCE|TRACK|MARQUEE)$/i;
  const allowedTags = /^(P|BR|STRONG|B|EM|I|U|S|STRIKE|UL|OL|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|CODE|TABLE|THEAD|TBODY|TR|TH|TD|HR|SPAN|DIV|SUB|SUP|A)$/i;
  qsa('*', d).forEach(function (el) {
    const tag = el.tagName.toUpperCase();
    if (dangerousTags.test(tag)) {
      el.remove();
      return;
    }
    if (!allowedTags.test(tag)) {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.remove();
      return;
    }
    Array.prototype.slice.call(el.attributes || []).forEach(function (a) {
      const attrName = a.name.toLowerCase();
      const attrVal = String(a.value || '').trim();
      if (/^on/i.test(attrName) || attrName === 'srcdoc' || attrName === 'formaction' || attrName === 'action') {
        el.removeAttribute(a.name);
        return;
      }
      if (attrName === 'href' || attrName === 'src') {
        if (/^(javascript|vbscript|data):/i.test(attrVal)) {
          el.removeAttribute(a.name);
          return;
        }
      }
      if (attrName === 'style') {
        if (/expression|url\s*\(|behavior|binding|-moz-binding/i.test(attrVal)) {
          el.removeAttribute(a.name);
          return;
        }
      }
    });
  });
  return d.innerHTML;
}
function rteSvg(d) {
  return '<svg class="i" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
}
function rteHtml(html) {
  const body = rteSanitize(termsToHtml(html));
  const btn = function (cmd, title, inner) {
    return '<button type="button" class="rte-btn" data-cmd="' + cmd + '" title="' + title + '" onclick="rteCmd(\'' + cmd + '\')">' + inner + '</button>';
  };
  return '<div class="rte" id="f-terms-rte">' +
    '<div class="rte-bar">' +
    '<select class="rte-sel" title="Paragraph" onchange="rteBlock(this.value)">' +
    '<option value="p">Paragraph</option>' +
    '<option value="h2">Heading</option>' +
    '<option value="h3">Subheading</option>' +
    '<option value="blockquote">Quote</option>' +
    '</select>' +
    '<span class="rte-sep"></span>' +
    btn('bold', 'Bold', '<b>B</b>') +
    btn('italic', 'Italic', '<i>I</i>') +
    btn('underline', 'Underline', '<u>U</u>') +
    '<span class="rte-sep"></span>' +
    btn('justifyLeft', 'Align left', rteSvg('<path d="M3.5 5.5h13M3.5 10h9M3.5 14.5h13"/>')) +
    btn('justifyCenter', 'Align center', rteSvg('<path d="M3.5 5.5h13M5.5 10h9M3.5 14.5h13"/>')) +
    btn('justifyRight', 'Align right', rteSvg('<path d="M3.5 5.5h13M7.5 10h9M3.5 14.5h13"/>')) +
    '<span class="rte-sep"></span>' +
    btn('insertUnorderedList', 'Bulleted list', rteSvg('<path d="M7 5.5h9.5M7 10h9.5M7 14.5h9.5"/><circle cx="4.2" cy="5.5" r="1"/><circle cx="4.2" cy="10" r="1"/><circle cx="4.2" cy="14.5" r="1"/>')) +
    btn('insertOrderedList', 'Numbered list', rteSvg('<path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9"/><path d="M3.2 4.2h2.2v4H3.6M3.2 12.2h2.6M3.2 14.8h2.6"/>')) +
    '<span class="rte-sep"></span>' +
    '<button type="button" class="rte-btn" title="Insert link" onclick="rteLink()">' + rteSvg('<path d="M8.2 11.8 11.8 8.2"/><path d="M7.2 9.2 5.8 10.6a2.4 2.4 0 0 0 3.4 3.4l1.4-1.4M12.8 10.8l1.4-1.4a2.4 2.4 0 0 0-3.4-3.4L9.4 7.4"/>') + '</button>' +
    btn('strikeThrough', 'Strikethrough', '<s>S</s>') +
    '<button type="button" class="rte-btn" title="Clear formatting" onclick="rteCmd(\'removeFormat\')">' + rteSvg('<path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5"/>') + '</button>' +
    '<span class="rte-sep"></span>' +
    '<button type="button" class="rte-btn" id="rte-code-btn" title="Show HTML" onclick="rteToggleCode()">&lt;/&gt;</button>' +
    '</div>' +
    '<div class="rte-body" id="f-terms" contenteditable="true" spellcheck="true" data-ph="Write terms and conditions…">' + body + '</div>' +
    '</div>';
}
function rteCmd(cmd, val) {
  const body = $('f-terms'); if (!body) return;
  if ($('f-terms-rte') && $('f-terms-rte').classList.contains('code')) return;
  body.focus();
  try { document.execCommand(cmd, false, val == null ? null : val); } catch (e) { }
  rteSyncState();
}
function rteBlock(tag) {
  const body = $('f-terms'); if (!body) return;
  body.focus();
  try { document.execCommand('formatBlock', false, tag); } catch (e) { }
  rteSyncState();
}
function rteLink() {
  const body = $('f-terms'); if (!body) return;
  openDialog({
    title: 'Insert link',
    bodyHtml: '<div class="dlg-field"><label>URL</label><input class="inp" id="rte-url" placeholder="https://"></div>',
    confirmText: 'Insert',
    after: function () { const el = $('rte-url'); if (el) el.focus(); },
    onConfirm: function () {
      const url = (($('rte-url') || {}).value || '').trim();
      if (!url) return false;
      rteCmd('createLink', url);
    }
  });
}
function rteToggleCode() {
  const rte = $('f-terms-rte'), body = $('f-terms'); if (!rte || !body) return;
  if (rte.classList.contains('code')) {
    body.innerHTML = rteSanitize(body.innerText || body.textContent || '');
    rte.classList.remove('code');
    const b = $('rte-code-btn'); if (b) { b.classList.remove('on'); b.title = 'Show HTML'; }
  } else {
    body.textContent = body.innerHTML;
    rte.classList.add('code');
    const b = $('rte-code-btn'); if (b) { b.classList.add('on'); b.title = 'Show formatted'; }
  }
}
function rteGet() {
  const body = $('f-terms'); if (!body) return '';
  const rte = $('f-terms-rte');
  if (rte && rte.classList.contains('code')) return rteSanitize(body.innerText || body.textContent || '');
  return rteSanitize(body.innerHTML || '');
}
function rteSyncState() {
  const bar = qs('#f-terms-rte .rte-bar'); if (!bar) return;
  qsa('.rte-btn[data-cmd]', bar).forEach(function (btn) {
    let on = false;
    try { on = document.queryCommandState(btn.dataset.cmd); } catch (e) { }
    btn.classList.toggle('on', !!on);
  });
}
function bindRte() {
  const body = $('f-terms'); if (!body || body._rteBound) return;
  body._rteBound = true;
  body.addEventListener('keyup', rteSyncState);
  body.addEventListener('mouseup', rteSyncState);
  body.addEventListener('paste', function (e) {
    if ($('f-terms-rte') && $('f-terms-rte').classList.contains('code')) return;
    e.preventDefault();
    const text = ((e.clipboardData || window.clipboardData).getData('text/plain') || '');
    try { document.execCommand('insertText', false, text); } catch (err) { }
  });
}
function poTermsPrintHtml(r) {
  const html = rteSanitize(termsToHtml((r && r.terms) || DEFAULT_PO_TERMS));
  return '<div class="terms"><h4>AGREED TERMS &amp; CONDITIONS</h4><div class="rte-print">' + html + '</div></div>';
}

function onPoBuyerChange(buyer) {
  if (MCBOX['po-styles']) {
    const opts = styleOpts(buyer);
    MCBOX['po-styles'].opts = opts.map(normalizeOpt).filter(function (o) { return masterValueAllowed(o.v); });
    updateMcboxInput('po-styles');
    renderMcboxList('po-styles');
  }
}

function formPO(rec) {
  const r = rec || {};
  const isEdit = !!(rec && rec.id);
  return '<div class="sec">Purchase Order</div><div class="grid-fixed">' +
    (isEdit ? field('PO No', '<input class="inp" id="f-no" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('PO Date *', '<input class="inp" type="text" data-date autocomplete="off" disabled id="f-date" value="' + esc(r.date || today()) + '" title="Purchase orders are always dated today">') +
    field('Supplier *', cbox('po-supplier', { opts: supplierPartyOptions(), value: r.supplier || '', f: 'supplier', placeholder: 'Type to search…', free: true, onSet: v => onPoSupplierChange(v) })) +
    field('Supplier Trade Name *', cbox('po-trade', { opts: partyTradeOptions(r.supplier), value: r.supplierTrade || '', f: 'supplierTrade', placeholder: 'Select trade / branch', free: true, onSet: v => onPoTradeChange(v) })) +
    field('Ship To *', cbox('po-shipto', { opts: allShipToOptions(), value: r.shipTo || '', f: 'shipTo', placeholder: 'Select supplier GSTIN…', free: true })) +
    field('GST Type', '<input class="inp" id="f-gsttype" value="' + esc(r.gstType || '') + '" placeholder="Auto after Supplier Trade Name" disabled title="Auto-filled from Supplier Trade Name"><div class="fhint" id="f-gsttype-hint">Select Supplier Trade Name to determine GST Type</div>') +
    field('Buyer *', cbox('po-buyer', { opts: buyerPartyOptions(), value: r.buyer || '', f: 'buyer', placeholder: 'Type to search…', free: true, onSet: v => onPoBuyerChange(v) })) +
    field('Style (Internal ID) *', mcbox('po-styles', {
      opts: styleOpts(r.buyer),
      selected: Array.isArray(r.styles) ? r.styles.slice() : (r.styles ? [r.styles] : []),
      placeholder: 'Select one or more styles…'
    })) +
    '</div>' +
    '<div class="sec">Items</div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' +
    srTh() + '<th>Classification *</th><th>Item Name *</th><th>HSN No</th><th>Unit</th><th>Stock</th><th>Quantity</th><th>Rate</th>' +
    '<th>CGST%</th><th>CAMT</th><th>SGST%</th><th>SAMT</th><th>IGST%</th><th>IAMT</th><th>Amount</th><th>Total Amount</th><th></th>' +
    '</tr></thead>' +
    '<tbody id="po-items">' + (r.items && r.items.length ? r.items.map(poItemRow).join('') : poItemRow()) + '</tbody></table></div>' +
    '<div class="po-add-item-bar"><button class="btn btn-ghost btn-sm" onclick="addRow(\'po-items\',poItemRow);calcPO()">＋ Add item</button></div>' +
    '<div class="grid-fixed" style="margin-top:18px">' +
    field('Total Qty', '<input class="inp" id="po-sum-qty" value="0" disabled>') +
    field('Gross Amount', '<input class="inp" id="po-sum-gross" value="₹0" disabled>') +
    field('GST Amount', '<input class="inp" id="po-sum-gst" value="₹0" disabled>') +
    field('Net Amount', '<input class="inp" id="po-sum-net" value="₹0" disabled>') +
    field('Delivery Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly id="f-delivery-date" value="' + esc(r.deliveryDate || '') + '">') +
    field('Raised For *', cbox('po-raisedfor', { opts: db.masters.raisedForList, value: r.raisedFor || '', f: 'raisedFor', placeholder: 'Select raised for', addMaster: 'raisedForList', addText: 'Raised For', free: true })) +
    field('Qtn. / P.I. No.', '<input class="inp" id="f-qtn-no" value="' + esc(r.qtnNo || '') + '">') +
    field('Qtn. / P.I. No. – Date', '<input class="inp" type="text" data-date autocomplete="off" readonly id="f-qtn-date" value="' + esc(r.qtnDate || '') + '">') +
    field('Payment Terms', cbox('po-payterms', { opts: db.masters.paymentTermsList, value: r.payTerms || '', f: 'payTerms', placeholder: 'Select payment terms', addMaster: 'paymentTermsList', addText: 'Payment Terms', free: true })) +
    field('Freight Charges', cbox('po-freightcharges', { opts: db.masters.freightChargesList, value: r.freightCharges || '', f: 'freightCharges', placeholder: '--Select--', addMaster: 'freightChargesList', addText: 'Freight Charges', free: true })) +
    field('P &amp; F', '<input class="inp" id="f-pnf" value="' + esc(r.pnf === '' || r.pnf == null ? 'Nil' : r.pnf) + '" placeholder="Nil" oninput="calcPO()" onfocus="if(this.value===\'Nil\')this.select()">') +
    field('Transit Insurance', cbox('po-transitins', { opts: TRANSIT_INSURANCE_OPTS, value: r.transitInsurance || '', f: 'transitInsurance', placeholder: '--Select--', free: false })) +
    field('Mode of Transportation', cbox('po-transport', { opts: db.masters.transportModes, value: r.transportMode || '', f: 'transportMode', placeholder: '--Select--', addMaster: 'transportModes', addText: 'Transport Modes', free: true })) +
    field('Narration', '<input class="inp" id="f-narration" value="' + esc(r.narration || '') + '">') +
    '</div>' +
    '<div class="sec">Terms and Conditions</div>' + rteHtml(r.terms || DEFAULT_PO_TERMS);
}
function calcPO() {
  const tb = $('po-items'); if (!tb) return;
  let tq = 0, gross = 0, gstAmt = 0, freightAmt = 0;
  qsa('tr', tb).forEach((tr, idx) => {
    const srEl = qs('[data-sr]', tr); if (srEl) srEl.textContent = idx + 1;
    const q = pf(qs('[data-f="qty"]', tr) ? qs('[data-f="qty"]', tr).value : 0);
    const rt = pf(qs('[data-f="rate"]', tr) ? qs('[data-f="rate"]', tr).value : 0);
    const cgstPct = pf(qs('[data-f="cgstPct"]', tr) ? qs('[data-f="cgstPct"]', tr).value : 0);
    const sgstPct = pf(qs('[data-f="sgstPct"]', tr) ? qs('[data-f="sgstPct"]', tr).value : 0);
    const igstPct = pf(qs('[data-f="igstPct"]', tr) ? qs('[data-f="igstPct"]', tr).value : 0);
    const amount = q * rt;
    const camt = amount * cgstPct / 100, samt = amount * sgstPct / 100, iamt = amount * igstPct / 100;
    const total = amount + camt + samt + iamt;
    const put = (sel, val) => { const el = qs(sel, tr); if (el) el.textContent = fmtNum(val); };
    put('[data-camt]', camt); put('[data-samt]', samt); put('[data-iamt]', iamt);
    put('[data-amt]', amount); put('[data-total]', total);
    tq += q; gross += amount; gstAmt += camt + samt + iamt;
  });
  freightAmt = pnfValue($('f-pnf') ? $('f-pnf').value : 0);
  const net = gross + gstAmt + freightAmt;
  if ($('po-sum-qty')) $('po-sum-qty').value = fmtNum(tq);
  if ($('po-sum-gross')) $('po-sum-gross').value = fmtINR(gross);
  if ($('po-sum-gst')) $('po-sum-gst').value = fmtINR(gstAmt);
  if ($('po-sum-freight')) $('po-sum-freight').value = fmtINR(freightAmt);
  if ($('po-sum-net')) $('po-sum-net').value = fmtINR(net);
}
/* "Nil" (or blank) means zero P&F */
function pnfValue(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s || /^nil{1,2}$/i.test(s)) return 0;
  return pf(s);
}
/* mirror the supplier's GST type onto the PO and re-split every line's GST */
/* supplier changed → refill its trades, clear the old pick, refresh GST */
function onPoSupplierChange(supplier) {
  const c = CBOX['po-trade'];
  if (c) {
    c.opts = partyTradeOptions(supplier);
    c.val = ''; c.display = null; c.typed = false;
    const inp = qs('[data-cb-input="po-trade"]');
    if (inp) inp.value = '';
    renderCboxList('po-trade');
  }

  applyPoGstType(supplier);
  onPoTradeChange('');
}
/* a trade carries its own GST registration, so its state drives the tax split */
function onPoTradeChange(tradeName) {
  const t = partyTradeByName(cboxGet('po-supplier'), tradeName);
  const gstNo = String(t && (t.gstNo || t.gstin) || '').trim().toUpperCase();
  const state = String(t && t.state || '').trim();
  const stateCode = /^\d{2}$/.test(gstNo.slice(0, 2)) ? gstNo.slice(0, 2) :
    (/^\d{2}$/.test(state) ? state : GST_STATE_CODE[state.toLowerCase()] || '');
  const gstType = t && stateCode ? (stateCode === '27' ? 'CGST & SGST' : 'IGST') : '';
  const el = $('f-gsttype'); if (el) el.value = gstType;
  const hint = $('f-gsttype-hint');
  if (hint) {
    hint.textContent = t && gstType ? ('Auto from Supplier Trade Name' + (t.state ? ' — ' + t.state : '')) : 'Select a Supplier Trade Name with State / GST Type configured';
    hint.className = t && gstType ? 'fhint ok' : 'fhint';
  }
  qsa('#po-items tr').forEach(function (tr) {
    const nm = qs('[data-f="name"]', tr);
    if (nm && nm.value) poApplyItemDefaults(tr, cboxGet(nm.dataset.cbInput) || nm.value, null, null);
  });
  calcPO();
}
function onPoGstTypeChange(v) {
  /* retained for compatibility; GST Type is controlled by Supplier Trade */
  const el = $('f-gsttype'); if (el) el.value = v || '';
  calcPO();
}
function applyPoGstType() {
  const trade = cboxGet('po-trade');
  if (trade) { onPoTradeChange(trade); return; }
  const el = $('f-gsttype'); if (el) el.value = '';
  const hint = $('f-gsttype-hint');
  if (hint) { hint.textContent = 'Select Supplier Trade Name to determine GST Type'; hint.className = 'fhint'; }
  poSyncGstFromMaster();
  calcPO();
}
function poCategoryFromItems(items, prev) {
  const cls = [...new Set((items || []).map(i => (i.classification || '').trim()).filter(Boolean))];
  if (cls.length === 1) return cls[0];
  if (cls.length > 1) return 'Combined';
  return prev ? (prev.category || '') : '';
}
function savePO(id) {
  clearReqMarks();
  /* validate in the same order the fields appear on screen */
  if (!cboxGet('po-supplier')) return reqBad('po-supplier', 'Supplier is required');
  if (!cboxGet('po-trade')) return reqBad('po-trade', 'Supplier Trade Name is required');
  if (!(($('f-gsttype') || {}).value || '').trim()) return reqBad('f-gsttype', 'GST Type could not be determined — configure State / GST Type on the selected Supplier Trade Name');
  if (!cboxGet('po-shipto')) return reqBad('po-shipto', 'Ship To is required');
  if (!cboxGet('po-buyer')) return reqBad('po-buyer', 'Buyer is required');
  if (!mcboxGet('po-styles').length) return reqBad('po-styles', 'Style (Internal ID) is required — pick at least one style');
  const items = gatherRows('po-items', ['name']).map(i => {
    const amt = pf(i.qty) * pf(i.rate);
    i.camt = amt * pf(i.cgstPct) / 100; i.samt = amt * pf(i.sgstPct) / 100; i.iamt = amt * pf(i.igstPct) / 100;
    i.discount = 0;
    i.amount = amt;
    i.totalAmount = amt + i.camt + i.samt + i.iamt;
    return i;
  });
  if (!requireRowFields('po-items', [
    { f: 'classification', label: 'Classification' },
    { f: 'name', label: 'Item Name' }
  ], 'item row')) return false;
  if (!items.length) return reqBadCell('po-items', 0, 'name', 'Add at least one item');
  const seenPo = {};
  for (let k = 0; k < items.length; k++) {
    const key = lcName(bareItemName(items[k].name));
    if (key && seenPo[key]) return reqBadCell('po-items', k, 'name', 'Duplicate item \u2014 ' + bareItemName(items[k].name) + ' appears more than once. Keep a single line per item.');
    seenPo[key] = 1;
  }
  const zeroIdx = items.findIndex(function (i) { return pf(i.qty) <= 0; });
  if (zeroIdx > -1) return reqBadCell('po-items', zeroIdx, 'qty', 'Quantity must be more than zero — ' + (items[zeroIdx].name || 'item'));
  /* line GST must equal the rate configured on Item Master */
  for (let k = 0; k < items.length; k++) {
    const gerr = poGstMismatch(items[k]);
    if (gerr) return reqBadCell('po-items', k, 'name', gerr);
  }
  if (!cboxGet('po-raisedfor')) return reqBad('po-raisedfor', 'Raised For is required');
  if (!dval('f-delivery-date')) return reqBad('f-delivery-date', 'Delivery Date is required');
  const poDateVal = dval('f-date') || today();
  if (dval('f-delivery-date') < poDateVal)
    return reqBad('f-delivery-date', 'Delivery Date must be the same as or later than the PO Date (' + dpToDisplay(poDateVal) + ')');
  const prev = id ? db.po.find(r => r.id === id) : null;
  const partyLocked = !!(prev && poHasInward(prev.no));
  const data = {
    firm: prev ? (prev.firm || '') : (db.masters.firms[0] || ''), date: dval('f-date') || today(), supplier: partyLocked ? prev.supplier : cboxGet('po-supplier'),
    billTo: prev ? (prev.billTo || '') : '', shipTo: cboxGet('po-shipto'), gstType: (($('f-gsttype') || {}).value) || '',
    supplierTrade: partyLocked ? prev.supplierTrade : cboxGet('po-trade'),
    poType: prev ? (prev.poType || '') : '', buyer: cboxGet('po-buyer'),
    styles: mcboxGet('po-styles'),
    bom: prev && Array.isArray(prev.bom) ? prev.bom.slice() : [], bomType: prev ? (prev.bomType || '') : '',
    classification: prev ? (prev.classification || '') : '',
    category: poCategoryFromItems(items, prev),
    items, status: prev ? (prev.status || 'Draft') : 'Draft',
    deliveryAddress: prev ? (prev.deliveryAddress || '') : '', deliveryDate: dval('f-delivery-date'),
    closeDate: prev ? (prev.closeDate || '') : '', raisedFor: cboxGet('po-raisedfor'),
    qtnNo: $('f-qtn-no').value.trim(), qtnDate: dval('f-qtn-date'),
    payTerms: cboxGet('po-payterms'), freightCharges: cboxGet('po-freightcharges'),
    pnf: pnfValue($('f-pnf').value), transitInsurance: cboxGet('po-transitins'),
    transportMode: cboxGet('po-transport'), narration: $('f-narration').value.trim(),
    terms: rteGet()
  };
  if (id) Object.assign(db.po.find(r => r.id === id), data);
  else { data.id = uid(); data.no = nextNo('po', 'PO'); data.createdAt = Date.now(); db.po.push(data); }
  const poNoSaved = id ? ((db.po.find(r => r.id === id) || {}).no || '') : data.no;
  saveDB(); pageView = null; render();
}

