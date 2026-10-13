/**
 * StitchFlow ERP — Sample Development
 * File: assets/js/modules/sample.js
 */

function formSample(rec) {
  const r = rec || {};
  return '<div class="sec">Sample</div><div class="grid-fixed">' +
    (rec && rec.id ? field('Sample No', '<input class="inp" id="f-no" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly disabled id="f-date" value="' + esc(r.date || today()) + '">') +
    field('Job Worker / Vendor *', cbox('jw-vendor', { opts: jobWorkVendorOptions(), value: r.vendor || '', f: 'vendor', placeholder: 'Search Vendor parties…', free: false })) +
    field('Style (Internal ID) *', mcbox('smp-styles', {
      opts: styleOpts(),
      selected: jwStyleList(r), disabled: !!(rec && rec.id),
      placeholder: 'Search & select styles…', onSet: function () { smpStylesChanged(); }
    })) +
    '</div>' +
    '<div class="sec">Sample Garments — Styles <span style="text-transform:none;color:var(--muted);font-weight:600">(one row per style picked above · select sizes &amp; enter size-wise qty)</span></div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Style</th><th>Size Selection *</th><th>Size-wise Qty</th><th>Sample Qty</th><th>Rate (₹/pc)</th><th>Charges</th><th></th></tr></thead>' +
    '<tbody id="jw-garments">' + jwGarmentRowsHtml(r) + '</tbody>' +
    '<tfoot><tr class="tot-row"><td></td><td>Totals</td><td></td><td></td><td class="num" id="jw-gtot-oqty">0</td><td></td><td class="num" id="jw-gtot-chg">₹0</td><td></td></tr></tfoot></table></div>' +

    '<div class="sec">Material Issues to Job Worker <span style="text-transform:none;color:var(--muted);font-weight:600">(one Sample DC No. = one POD upload · SAM number generated after Save)</span></div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Issue Date *</th><th>Sample DC No.</th><th>Classification *</th><th>Item Name *</th><th>Inward No. *</th><th>PO No.</th><th class="num">Inward Stock</th><th>Qty *</th><th>UOM</th><th>POD (Proof of Delivery)</th><th></th></tr></thead>' +
    '<tbody id="jw-extras">' + ((r.extras && r.extras.length) ? jwLinesByDate(r.extras).map(function (x) { return smpIssueRow(Object.assign({}, x, { _saved: true })); }).join('') : smpIssueRow({ date: today() })) + '</tbody>' +
    '</table></div>' +
    '<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addRow(\'jw-extras\',smpIssueRow);afterRenderExtras()">＋ Add Issue Record</button>' +
    '';
}
function saveSample(id) {
  clearReqMarks();
  if (!cboxGet('jw-vendor')) return reqBad('jw-vendor', 'Job worker / vendor is required');
  if (!mcboxGet('smp-styles').length) return reqBad('smp-styles', 'Style (Internal ID) is required — pick at least one style');
  if (!requireRowFields('jw-garments', [
    { f: '__sizes', label: 'Size Selection' }
  ], 'style row')) return false;
  const garmentRows = gatherGarmentRows();
  if (!garmentRows.length) return reqBad('smp-styles', 'Style (Internal ID) is required — pick at least one style');
  if (!garmentRows.some(g => g.orderQty > 0)) {
    const grow = qsa('#jw-garments tr')[0];
    const szEl = grow ? (qs('.sz-inputs input', grow) || qs('.mcbox-input', grow)) : null;
    return reqBad(szEl, 'Enter size-wise qty for at least one style');
  }
  const rec = id ? db.sample.find(r => r.id === id) : null;
  const receipts = rec ? (rec.receipts || []) : [];
  const garments = garmentRows.map(g => ({
    style: g.style, portal: g.portal, desc: g.style, colour: g.colour, sizes: g.sizes,
    orderQty: g.orderQty, rate: g.rate,
    receivedQty: receipts.filter(r => r.desc === g.style && r.colour === g.colour).reduce((a, r) => a + pf(r.qty), 0)
  }));
  /* Extra Quantity Issued — same rules as Job Work */
  const extrasRaw = gatherRows('jw-extras', ['item']);
  let xi = 0;
  qsa('#jw-extras tr').forEach(tr => {
    const itemVal = ((qs('[data-f="item"]', tr) || {}).value || '').trim();
    if (!itemVal) return;
    const row = extrasRaw[xi++]; if (!row) return;
    jwApplyGroupMeta('jw-extras', tr, row);
  });
  extrasRaw.forEach(function (row) { if (row.inwardNo) row.poRef = poRefFromInward(row.inwardNo); });
  const extras = extrasRaw.filter(i => pf(i.qty) > 0);
  /* Material Issues to Job Worker is mandatory on a Sample: at least one
     complete line, and every used line must carry date, classification,
     item, PO and a quantity greater than zero. */
  const xRows = qsa('#jw-extras tr');
  let xFilled = 0;
  for (let i = 0; i < xRows.length; i++) {
    const tr = xRows[i];
    if (rowIsBlank(tr, ['classification', 'item', 'inwardNo', 'qty'])) continue;
    xFilled++;
    const need = [
      { f: 'date', label: 'Issue Date' },
      { f: 'classification', label: 'Classification' },
      { f: 'item', label: 'Item Name' },
      { f: 'inwardNo', label: 'Inward No.' }
    ];
    for (let k = 0; k < need.length; k++) {
      const v = (need[k].f === 'date') ? dval(qs('[data-f="date"]', tr)) : rowVal(tr, need[k].f);
      if (!v) return reqBadIn(tr, need[k].f, need[k].label + ' is required on material issue row ' + (i + 1));
    }
    if (pf(rowVal(tr, 'qty')) <= 0) {
      return reqBadIn(tr, 'qty', 'Qty must be more than zero on material issue row ' + (i + 1) +
        (rowVal(tr, 'item') ? ' — ' + bareItemName(rowVal(tr, 'item')) : ''));
    }
  }
  if (!xFilled) {
    const first = xRows[0];
    if (first) return reqBadIn(first, 'classification',
      'Material Issues to Job Worker is required — complete at least one issue line');
    return reqBadCell('jw-extras', 0, 'classification',
      'Material Issues to Job Worker is required — complete at least one issue line');
  }
  if (!jwValidateCombinedStock([], extras, id, 'sample')) return false;
  /* Generate the sample challan only after validation and Save. */
  jwAssignDcNosOnSave(extras, 'sample');
  const data = {
    date: dval('f-date') || today(), vendor: cboxGet('jw-vendor'),
    styles: (function () {
      const out = [];
      garmentRows.forEach(function (g) { if (g.style && out.indexOf(g.style) === -1) out.push(g.style); });
      mcboxGet('smp-styles').forEach(function (s) { if (s && out.indexOf(s) === -1) out.push(s); });
      return out;
    })(),
    issues: [], garments: garments, extras: extras,
    expectedDate: rec ? (rec.expectedDate || '') : '',
    receiveDate: rec ? (rec.receiveDate || '') : '',
    status: rec ? (rec.status || 'Issued') : 'Issued',
    notes: rec ? (rec.notes || '') : ''
  };
  data.status = jwAutoStatus(data);
  if (id) Object.assign(rec, data);
  else { data.id = uid(); data.no = nextNo('sample', 'SMP'); data.createdAt = Date.now(); data.receipts = []; db.sample.push(data); }
  const saved = saveDB();
  const savedNo = id ? (rec ? rec.no : '') : data.no;
  pageView = null; toast('Sample saved — ' + savedNo, 'green'); render();
  if (!saved) setTimeout(function () { toast('⚠️ Storage full — POD images may not be saved. Remove some images.', 'red'); }, 400);
}
function nextSampleDcNo() {
  let max = pf(db.seq.sampledc);
  (db.sample || []).forEach(function (r) { (r.extras || []).forEach(function (x) { const m = /^SAM-(\d+)$/.exec(String(x.dcNo || '')); if (m) max = Math.max(max, parseInt(m[1], 10) || 0); }); });
  db.seq.sampledc = max + 1;
  return 'SAM-' + String(db.seq.sampledc).padStart(4, '0');
}
