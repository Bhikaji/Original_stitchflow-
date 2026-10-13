/**
 * StitchFlow ERP — Sales Entries & Marketplace Import
 * File: assets/js/modules/sale.js
 */

/* ================= SALE ================= */
var SALE_RAW_HDRS = null;
const SALE_RAW_FIELDS = {
  sellerId: ['seller id', 'seller id fk', 'sellerid', 'seller code', 'vendor id', 'vendor code', 'partner id', 'store id'],
  program: ['po type'], warehouseId: ['warehouse id'], orderDate: ['created on'], styleCode: ['style id'],
  sku: ['seller sku code'], skuId: ['sku id'], myntraSku: ['myntra sku code'], size: ['size'],
  vendorArticle: ['vendor article number'], brand: ['brand'], desc: ['style name'], articleType: ['article type', 'product type'],
  city: ['city'], mrp: ['total mrp'], discount: ['discount'], rate: ['final amount'], sp: ['seller price'],
  mpStatus: ['order status'], cancelReason: ['cancellation reason'],
  state: ['state', 'ship state', 'shipping state', 'buyer state', 'destination state', 'state name', 'deliver state']
};
function saleRawFrom(it, names) {
  if (!(it.raw && SALE_RAW_HDRS)) return '';
  const keys = SALE_RAW_HDRS.map(function (h) { return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); });
  for (let n = 0; n < names.length; n++) {
    const i = keys.indexOf(String(names[n] || '').replace(/\s+/g, ''));
    if (i > -1 && it.raw[i] != null && it.raw[i] !== '') return it.raw[i];
  }
  return '';
}
function saleRawVal(it, f) { return it[f] != null && it[f] !== '' ? it[f] : saleRawFrom(it, SALE_RAW_FIELDS[f] || []) || it[f] || ''; }
function saleItemRow(it) {
  it = it || {};
  const tx = function (f, ph) { const v = f === 'desc' ? (saleRawFrom(it, ['style name']) || it.desc || '') : saleRawVal(it, f); return '<td><input class="inp" data-f="' + f + '" value="' + esc(v || '') + '" placeholder="' + (ph || '') + '" spellcheck="false"></td>'; };
  const nm = function (f, ph) { const v = saleRawVal(it, f); return '<td><input class="inp num" type="number" step="any" data-f="' + f + '" value="' + (v === '' || v == null ? '' : v) + '" oninput="calcSale()" placeholder="' + (ph || '') + '"></td>'; };
  return '<tr>' + srTd() + tx('sellerId', 'e.g. 68905') + tx('program', 'PPMP / FBM / SJIT') + tx('warehouseId') + tx('orderDate') + tx('styleCode') + tx('sku') + tx('skuId') + tx('myntraSku') + tx('size') + tx('vendorArticle') + tx('brand') + tx('desc', 'Style name') + tx('articleType') + tx('city') + nm('mrp') + nm('discount') + nm('rate') + nm('sp') + tx('mpStatus') + tx('cancelReason') +
    '<td><input class="inp num" type="number" min="0" data-f="qty" value="' + (it.qty ?? 1) + '" oninput="calcSale()"></td>' +
    '<td class="num" data-amt style="font-weight:700">0</td><td><input type="hidden" data-f="orderNo" value="' + esc(it.orderNo || '') + '"><input type="hidden" data-f="orderLine" value="' + esc(it.orderLine || '') + '"><button type="button" class="btn-icon danger" onclick="removeRow(this)">' + ic('trash', 15) + '</button></td></tr>';
}
function formSale(rec) {
  const r = rec || {};
  return '<div class="sec">Sale Entry</div><div class="grid2">' + field('Sale No (auto)', '<input class="inp" id="f-no" value="' + esc(r.no || '') + '" disabled>') + field('Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly id="f-date" value="' + esc(r.date || today()) + '">') + field('Notes', '<input class="inp" id="f-notes" value="' + esc(r.notes || '') + '" placeholder="Optional">') + '</div>' +
    '<div class="sec">Sale Items — Excel-style entry</div><div class="table-wrap"><table class="mini-table xl-table" style="min-width:2390px"><thead><tr>' + srTh() + '<th title="the seller id the Seller ↔ po_type master keys off">seller id</th><th>po_type</th><th>warehouse id</th><th>created on</th><th>style id</th><th>seller sku code</th><th>sku id</th><th>myntra sku code</th><th>size</th><th>vendor article number</th><th>brand</th><th>style name</th><th>product type</th><th>city</th><th class="num">total mrp</th><th class="num">discount</th><th class="num">final amount</th><th class="num">seller price</th><th>order status</th><th>cancellation reason</th><th class="num">Qty</th><th class="num">Amount</th><th></th></tr></thead>' + (SALE_RAW_HDRS = (r.source && r.source.rawHeaders) || null, '') + '<tbody id="sale-items">' + (r.items && r.items.length ? r.items.map(saleItemRow).join('') : saleItemRow()) + '</tbody><tfoot><tr class="tot-row"><td></td><td>Total</td><td colspan="19"></td><td class="num" id="sale-tqty">0</td><td class="num" id="sale-tamt">₹0</td><td></td></tr></tfoot></table></div>' +
    '<div class="bom-foot"><span class="bom-hint">Paste rows from Excel · drag the green corner to fill down</span><button class="btn btn-ghost btn-sm" onclick="addRow(\'sale-items\',saleItemRow);calcSale()">' + ic('plus', 15) + 'Add item</button></div><div class="hint">Status: ' + cbox('sl-status', { opts: STATUSES.sale, value: r.status || 'Open', f: 'status', free: false, compact: true }) + '</div>';
}
function saleRowEffRate(tr) { const g = function (f) { const el = qs('[data-f="' + f + '"]', tr); return el ? pf(el.value) : 0; }; let eff = g('rate'); if (eff <= 0 && g('mrp') - g('discount') > 0) eff = g('mrp') - g('discount'); if (eff <= 0 && g('sp') > 0) eff = g('sp'); return eff; }
function calcSale() { const tb = $('sale-items'); if (!tb) return; let tq = 0, ta = 0; qsa('tr', tb).forEach(function (tr) { const q = pf(qs('[data-f="qty"]', tr) ? qs('[data-f="qty"]', tr).value : 0), a = Math.round(q * saleRowEffRate(tr) * 100) / 100, amt = qs('[data-amt]', tr); if (amt) amt.textContent = fmtNum(a); tq += q; ta += a; }); if ($('sale-tqty')) $('sale-tqty').textContent = fmtNum(tq); if ($('sale-tamt')) $('sale-tamt').textContent = fmtINR(ta); renumberSr($('sale-items')); }
function saveSale(id) {
  clearReqMarks();
  const prevItems = id && db.sale.find(function (r) { return r.id === id; }) ? db.sale.find(function (r) { return r.id === id; }).items || [] : null;
  const items = gatherRows('sale-items', ['desc', 'sku', 'styleCode', 'program', 'orderNo', 'orderLine', 'myntraSku', 'skuId']).map(function (i, idx) {
    i.amount = Math.round(pf(i.qty) * (pf(i.rate) > 0 ? pf(i.rate) : (pf(i.mrp) - pf(i.discount)) > 0 ? pf(i.mrp) - pf(i.discount) : pf(i.sp)) * 100) / 100;
    const prev = prevItems && prevItems[idx]; if (prev) { if (prev.raw && !i.raw) i.raw = prev.raw; if (prev.rowNo != null && i.rowNo == null) i.rowNo = prev.rowNo; if (prev.imported && i.imported == null) i.imported = true; if (prev.state && !i.state) i.state = prev.state; if (prev.sellerId && !i.sellerId) i.sellerId = prev.sellerId; if (prev.program && !i.program) i.program = prev.program; } return i;
  });
  if (!items.length) return reqBadCell('sale-items', 0, 'desc', 'Add at least one sale item');
  const prevRec = id ? db.sale.find(function (r) { return r.id === id; }) : null;
  const data = { date: dval('f-date') || today(), customer: prevRec && prevRec.customer || 'Myntra D2C', channel: prevRec && prevRec.channel || 'Myntra D2C', payStatus: prevRec && prevRec.payStatus || 'Unpaid', payMode: prevRec && prevRec.payMode || '', invoiceNo: prevRec && prevRec.invoiceNo || '', notes: $('f-notes').value.trim(), items: items, status: cboxGet('sl-status') };
  if (id) Object.assign(db.sale.find(function (r) { return r.id === id; }), data); else { data.id = uid(); data.no = nextNo('sale', 'SL'); data.createdAt = Date.now(); db.sale.push(data); }
  saveDB(); pageView = null; toast('Sale saved', 'green'); render();
}



/* --- Added Sales Module Demo --- */

/* • brand, size, style name, seller SKU captured on every sale item.
   ===================================================================== */

/* ---------- state ---------- */
let MP_STATE = null;

const MP_SOURCES = [
  { k: 'myntra', l: 'Myntra', customer: 'Myntra D2C', channel: 'Myntra D2C' },
  { k: 'flipkart', l: 'Flipkart', customer: 'Flipkart', channel: 'Marketplace' },
  { k: 'amazon', l: 'Amazon', customer: 'Amazon', channel: 'Marketplace' },
  { k: 'meesho', l: 'Meesho', customer: 'Meesho', channel: 'Marketplace' },
  { k: 'ajio', l: 'AJIO', customer: 'AJIO', channel: 'Marketplace' },
  { k: 'other', l: 'Other / Generic', customer: 'Myntra D2C', channel: 'Marketplace' }
];

const MP_FIELDS = [
  { k: 'orderNo', l: 'Order No' },
  { k: 'orderLine', l: 'Order Line ID' },
  { k: 'orderDate', l: 'Order Date' },
  { k: 'sku', l: 'SKU / Article', req: true },
  { k: 'styleCode', l: 'Style Code' },
  { k: 'productName', l: 'Product / Style Name' },
  { k: 'brand', l: 'Brand' },
  { k: 'size', l: 'Size' },
  { k: 'qty', l: 'Quantity' },
  { k: 'mrp', l: 'MRP (₹)' },
  { k: 'sellingPrice', l: 'Selling Price (₹)' },
  { k: 'discount', l: 'Discount (₹)' },
  { k: 'netAmount', l: 'Net / Final Amount (₹)' },
  { k: 'orderStatus', l: 'Order Status' },
  { k: 'program', l: 'Program (po_type)' },
  { k: 'sellerId', l: 'Seller id (feeds the po_type master)' }
];

/* alias order = priority; first alias listed wins ties between columns */
const MP_ALIASES = {
  orderNo: ['order id fk', 'order id', 'order no', 'order number', 'sub order no', 'sub order id', 'sub order', 'shipment id', 'orderno'],
  orderLine: ['order line id', 'order line', 'order line no', 'order item id'],
  orderDate: ['created on', 'order date', 'ordered on', 'purchase date', 'order created', 'created date', 'ordered date', 'delivered on', 'date'],
  sku: ['seller sku code', 'item barcode', 'myntra sku code', 'barcode', 'sku', 'sku id', 'sku code', 'seller sku', 'fsn', 'listing id', 'simple sku', 'variant sku', 'seller style id', 'article code'],
  styleCode: ['style id', 'style code', 'style', 'article no', 'article code', 'fashion id'],
  productName: ['style name', 'product name', 'item name', 'product', 'item description', 'product title', 'garment name', 'description'],
  brand: ['brand', 'brand name'],
  size: ['size', 'size name', 'variant size', 'variant'],
  qty: ['quantity', 'qty', 'order qty', 'ordered qty', 'ordered quantity', 'units', 'no of units', 'unit count', 'qty pcs'],
  mrp: ['total mrp', 'mrp', 'mrp rs', 'mrp inr', 'max retail price', 'listed price', 'list price', 'actual price', 'original price'],
  sellingPrice: ['selling price', 'sale price', 'seller price', 'sales price', 'sp', 'discounted price', 'selling price rs', 'sale price rs'],
  discount: ['discount', 'seller discount', 'total seller discount', 'discount value', 'discount amount', 'discount on mrp', 'total discount', 'discount rs', 'discount inr'],
  netAmount: ['final sale price with tax', 'final amount', 'customer price', 'net amount', 'net selling price', 'net proceeds', 'collection amount', 'settlement amount', 'realized price', 'net price', 'net value'],
  orderStatus: ['order status', 'status', 'item status', 'order item status', 'delivery status', 'shipment status'],
  program: ['po type', 'po_type', 'program', 'fulfillment type', 'fulfillment'],
  sellerId: ['seller id', 'seller id fk', 'sellerid', 'seller code', 'seller name', 'vendor id', 'vendor code', 'partner id', 'partner code', 'store id', 'outlet id']
};
/* same list, for when the column was not mapped but is plainly there */
const MP_SELLER_HDRS = MP_ALIASES.sellerId;

function mpSource(k) { return MP_SOURCES.find(function (s) { return s.k === k; }) || MP_SOURCES[MP_SOURCES.length - 1]; }

/* statuses that read as a return rather than a sale - their chip warns, it never skips on its own */
function mpStatusIsBad(s) {
  const v = String(s || '').trim();
  if (!v) return false;
  return /cancel|rto|return|refund|lost|failed/i.test(v) || /^(ca|can|cx|cxl|ld|rt|rtd|rp)$/i.test(v);
}

/* ---------- openers ---------- */
function openSaleImport() {
  if (!userCan('sale', 'view')) return toast('Access denied for this module', 'red');
  MP_STATE = {
    view: 'import', step: 1, srcKey: 'myntra', fileName: '', sheets: null, sheetIdx: 0,
    headerRowIdx: 0, headers: [], dataRows: [], mapping: {}, parsed: null, statusCounts: {},
    opts: { group: 'date', program: 'AUTO', customer: '', channel: '', skipStatuses: null }
  };
  cur = 'sale'; pageView = { kind: 'saleimport' };
  render();
}
function openSaleImportHistory() {
  if (!userCan('sale', 'view')) return toast('Access denied for this module', 'red');
  MP_STATE = { view: 'history', statusCounts: {}, opts: { group: 'date', program: 'AUTO', customer: '', channel: '', skipStatuses: null } };
  cur = 'sale'; pageView = { kind: 'saleimport' };
  render();
}
function mpShowHistoryView() { mpPreserveOpts(); MP_STATE.view = 'history'; render(); }
function mpShowImportView() { mpPreserveOpts(); MP_STATE.view = 'import'; render(); }
function mpCloseImport() { MP_STATE = null; pageView = null; cur = 'sale'; render(); }

/* ---------- page shell ---------- */
function renderSaleImportPage() {
  const st = MP_STATE;
  if (!st) { mpCloseImport(); return; }
  $('tb-title').textContent = st.view === 'history' ? 'Marketplace Import History' : 'Marketplace Sale Import';
  $('tb-sub').innerHTML = st.view === 'history'
    ? 'Every marketplace report imported into Sale, with the Sale records it created'
    : 'Import Myntra (PPMP / FBM / SJIT), Flipkart and other marketplace sale reports into Sale records';
  $('tb-actions').innerHTML =
    '<button class="btn btn-ghost" onclick="mpCloseImport()">' + ic('back', 16) + 'Back to Sale</button>' +
    (st.view === 'history'
      ? '<button class="btn btn-primary" onclick="mpShowImportView()">' + ic('plus', 16) + 'New Import</button>'
      : '<button class="btn btn-ghost" onclick="mpShowHistoryView()">' + ic('view', 16) + 'Import History</button>');
  $('content').innerHTML = st.view === 'history' ? mpHistoryHtml() : mpImportHtml();
}

function mpStepper() {
  const st = MP_STATE;
  const active = st.sheets ? 2 : 1;
  const steps = ['Upload report', 'Map & review', 'Import'];
  return '<div class="segbar" style="margin-bottom:16px">' + steps.map(function (s, i) {
    return '<span class="seg' + (i + 1 === active ? ' on' : '') + '" style="cursor:default"><b>' + (i + 1) + '</b>&nbsp;' + s + '</span>';
  }).join('') + '</div>';
}

/* ---------- step 1 : upload ---------- */
function mpImportHtml() {
  const st = MP_STATE;
  if (!st.sheets) return mpStep1Html();
  return mpStep2Html();
}

function mpStep1Html() {
  const st = MP_STATE;
  const pills = MP_SOURCES.map(function (s) {
    return '<button type="button" class="seg' + (st.srcKey === s.k ? ' on' : '') + '" onclick="mpSetSource(\'' + s.k + '\')">' + esc(s.l) + '</button>';
  }).join('');
  return '<div class="entry-page">' + mpStepper() +
    '<div class="sec">Upload marketplace sale report</div>' +
    '<div class="grid-fixed">' +
    field('Marketplace', '<div class="segbar" style="flex-wrap:wrap">' + pills + '</div>') +
    field('Report file (.xlsx / .csv)',
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-primary" onclick="mpTriggerFile()">' + ic('inbox', 16) + 'Choose Excel / CSV file</button>' +
      (st.fileName ? '<span class="badge b-green">' + esc(st.fileName) + '</span>' : '<span class="sub-line">No file selected</span>') +
      '</div><input type="file" id="mp-file" accept=".xlsx,.csv,.txt" style="display:none" onchange="mpOnFile(this)">') +
    '</div>' +
    '<div class="hint">' +
    'Upload the <b>Seller_Orders_Report</b> (contains PPMP + FBM rows, auto-detected via the po_type column) or the ' +
    '<b>SJIT_DELIVERED_ORDERS</b> report from Myntra Partner Portal → Reports. Flipkart / Amazon / Meesho / AJIO exports work too.<br>' +
    'Columns are auto-detected and can be corrected in the next step. Reports without a Quantity column are treated as <b>1 row = 1 pc</b>.<br><b>Every column of the file is preserved</b> on each imported row — nothing from the Excel is lost.' +
    '<br><button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="mpDownloadSample()">' + ic('download', 16) + 'Download sample report (for testing)</button>' +
    '</div>' +
    '</div>';
}

function mpTriggerFile() {
  const i = $('mp-file'); if (i) { i.value = ''; i.click(); }
}
function mpSetSource(k) {
  const st = MP_STATE; if (!st) return;
  const prev = mpSource(st.srcKey), next = mpSource(k);
  mpPreserveOpts();
  if (!st.opts.customer || st.opts.customer === prev.customer) st.opts.customer = next.customer;
  if (!st.opts.channel || st.opts.channel === prev.channel) st.opts.channel = next.channel;
  st.srcKey = k;
  render();
}
async function mpOnFile(inp) {
  const file = inp.files && inp.files[0]; if (!file) return;
  const st = MP_STATE;
  toast('Reading ' + file.name + ' …');
  let wb;
  try { wb = await mpReadWorkbook(file); }
  catch (e) { toast('Could not read file: ' + (e.message || e), 'red'); return; }
  st.fileName = file.name;
  st.sheets = wb.sheets;
  st.sheetIdx = 0;
  mpLoadSheet();
  st.step = 2; st.view = 'import';
  render();
  if (st.parsed && st.parsed.length) toast('Loaded ' + st.headers.length + ' columns · ' + fmtNum(st.dataRows.length) + ' rows from ' + file.name, 'green');
  else toast('File loaded but no data rows were found — check the sheet / header row', 'red');
}
function mpSheetChange(v) {
  mpPreserveOpts();
  MP_STATE.sheetIdx = parseInt(v, 10) || 0;
  MP_STATE.opts.skipStatuses = null;
  mpLoadSheet();
  render();
}
function mpBackToUpload() {
  mpPreserveOpts();
  const st = MP_STATE;
  st.sheets = null; st.headers = []; st.dataRows = []; st.mapping = {}; st.parsed = null; st.statusCounts = {}; st.step = 1;
  render();
}

/* ---------- workbook reading ---------- */
async function mpReadWorkbook(file) {
  const name = String(file.name || '').toLowerCase();
  if (/\.(csv|txt)$/.test(name)) {
    const text = await file.text();
    const rows = mpParseCSV(text);
    if (!rows.length) throw new Error('The CSV file is empty');
    return { sheets: [{ name: 'CSV', rows: rows }] };
  }
  if (!/\.xlsx$/.test(name)) {
    if (/\.xls$/.test(name)) throw new Error('Old .xls format is not supported — open it in Excel and re-save as .xlsx, or export as CSV');
    throw new Error('Please upload an .xlsx or .csv file');
  }
  const buf = await file.arrayBuffer();
  let shared = ''; try { shared = await unzipEntry(buf, 'xl/sharedStrings.xml'); } catch (e) { }
  const ss = parseShared(shared);
  const wbXml = await unzipEntry(buf, 'xl/workbook.xml');
  const wbDoc = new DOMParser().parseFromString(wbXml, 'application/xml');
  let relMap = {};
  try {
    const relsXml = await unzipEntry(buf, 'xl/_rels/workbook.xml.rels');
    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    Array.from(relsDoc.getElementsByTagName('Relationship')).forEach(function (r) {
      relMap[r.getAttribute('Id')] = r.getAttribute('Target') || '';
    });
  } catch (e) { }
  const sheetEls = Array.from(wbDoc.getElementsByTagName('sheet'));
  const out = [];
  for (let i = 0; i < sheetEls.length; i++) {
    const shEl = sheetEls[i];
    const shName = shEl.getAttribute('name') || ('Sheet ' + (i + 1));
    let target = relMap[shEl.getAttribute('r:id')] || ('worksheets/sheet' + (i + 1) + '.xml');
    target = String(target).replace(/^\//, '');
    if (target.indexOf('xl/') !== 0) target = 'xl/' + target;
    let x; try { x = await unzipEntry(buf, target); } catch (e) { continue; }
    try {
      const rows = mpParseSheetXml(x, ss);
      if (rows.length) out.push({ name: shName, rows: rows });
    } catch (e) { }
  }
  if (!out.length) throw new Error('No readable worksheet found in this file');
  return { sheets: out };
}

function mpParseSheetXml(xml, ss) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rawRows = []; let maxCol = 0;
  Array.from(doc.getElementsByTagName('row')).forEach(function (r) {
    const cells = {};
    Array.from(r.childNodes).forEach(function (c) {
      if (c.nodeType !== 1 || c.tagName !== 'c') return;
      const ref = c.getAttribute('r') || '';
      const letters = (/^[A-Z]+/.exec(ref) || [''])[0];
      let col = 0; for (let i = 0; i < letters.length; i++) col = col * 26 + letters.charCodeAt(i) - 64; col--;
      if (col < 0) return;
      const t = c.getAttribute('t'); let v = '';
      if (t === 'inlineStr') { v = Array.from(c.getElementsByTagName('t')).map(function (n) { return n.textContent; }).join(''); }
      else {
        const n = c.getElementsByTagName('v')[0]; v = n ? n.textContent : '';
        if (t === 's') v = ss[+v] || '';
        else if (t === 'b') v = v === '1' ? 'TRUE' : 'FALSE';
      }
      cells[col] = String(v == null ? '' : v);
      if (col > maxCol) maxCol = col;
    });
    rawRows.push(cells);
  });
  return rawRows.map(function (cells) {
    const row = new Array(maxCol + 1).fill('');
    Object.keys(cells).forEach(function (k) { row[+k] = cells[k]; });
    return row;
  });
}

function mpParseCSV(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const head = text.split(/\r?\n/).slice(0, 5).join('\n');
  const counts = { ',': (head.match(/,/g) || []).length, '\t': (head.match(/\t/g) || []).length, ';': (head.match(/;/g) || []).length };
  const delim = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0] || ',';
  const rows = []; let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); cell = ''; if (row.some(function (c) { return String(c).trim() !== ''; })) rows.push(row.map(function (c) { return String(c).trim(); })); row = []; }
      else if (ch === '\r') {/* skip */ }
      else cell += ch;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some(function (c) { return String(c).trim() !== ''; })) rows.push(row.map(function (c) { return String(c).trim(); })); }
  return rows;
}

/* ---------- header detection & mapping ---------- */
function mpHeaderKey(h) { return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim(); }

function mpFindHeaderRow(rows) {
  const max = Math.min(rows.length, 15);
  let best = 0, bestScore = 0;
  for (let r = 0; r < max; r++) {
    const row = rows[r] || []; let score = 0;
    row.forEach(function (cell) {
      const k = mpHeaderKey(cell); if (!k || k.length < 2) return;
      MP_FIELDS.forEach(function (f) {
        (MP_ALIASES[f.k] || []).forEach(function (a) {
          const ak = a.replace(/\s+/g, '');
          if (k === ak || k.indexOf(ak) > -1 || (ak.indexOf(k) > -1 && k.length > 3)) score++;
        });
      });
    });
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

function mpAutoMap(headers) {
  const keys = headers.map(mpHeaderKey);
  const cands = [];
  MP_FIELDS.forEach(function (f) {
    (MP_ALIASES[f.k] || []).forEach(function (alias, ai) {
      const ak = alias.replace(/\s+/g, '');
      keys.forEach(function (hk, idx) {
        if (!hk) return;
        let score = 0;
        if (hk === ak) score = 3;
        else if (hk.indexOf(ak) === 0) score = 2;
        else if (hk.length > 3 && hk.indexOf(ak) > -1) score = 1;
        if (score) cands.push({ f: f.k, idx: idx, score: score, ai: ai });
      });
    });
  });
  cands.sort(function (a, b) { return b.score - a.score || a.ai - b.ai || a.idx - b.idx; });
  const map = {}, usedF = {}, usedC = {};
  cands.forEach(function (c) {
    if (usedF[c.f] || usedC[c.idx]) return;
    map[c.f] = c.idx; usedF[c.f] = 1; usedC[c.idx] = 1;
  });
  return map;
}

function mpLoadSheet() {
  const st = MP_STATE;
  const sh = st.sheets[st.sheetIdx];
  const hIdx = mpFindHeaderRow(sh.rows);
  st.headerRowIdx = hIdx;
  const raw = (sh.rows[hIdx] || []).slice();
  while (raw.length && String(raw[raw.length - 1] || '').trim() === '') raw.pop();
  st.headers = raw.map(function (h, i) { const s = String(h == null ? '' : h).trim(); return s || ('Column ' + (i + 1)); });
  st.dataRows = sh.rows.slice(hIdx + 1).filter(function (r) { return r.some(function (c) { return String(c == null ? '' : c).trim() !== ''; }); });
  st.mapping = mpAutoMap(st.headers);
  /* the file's status profile; nothing is pre-ticked, the chips decide */
  st.statusCounts = {};
  if (st.mapping.orderStatus != null) {
    st.dataRows.forEach(function (r) {
      const s = String(r[st.mapping.orderStatus] == null ? '' : r[st.mapping.orderStatus]).trim();
      if (!s) return;
      st.statusCounts[s] = (st.statusCounts[s] || 0) + 1;
    });
  }
  if (!st.opts.skipStatuses) {
    st.opts.skipStatuses = [];   /* no status is left out until a chip is ticked */
  }
  mpReparse();
}

/* ---------- value helpers ---------- */
function mpCellVal(row, idx) { return idx >= 0 && idx < row.length ? String(row[idx] == null ? '' : row[idx]).trim() : ''; }
function mpVal(row, f) { const idx = MP_STATE.mapping[f]; return idx == null ? '' : mpCellVal(row, idx); }
function mpColByName(row, names) {
  const st = MP_STATE;
  const keys = st.headers.map(mpHeaderKey);
  for (let n = 0; n < names.length; n++) {
    const nk = names[n].replace(/\s+/g, '');
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === nk) return mpCellVal(row, i);
    }
  }
  return '';
}
function mpMoney(v) {
  if (v == null || v === '') return 0;
  let s = String(v).replace(/[₹\s,]/g, '');
  const m = /^\((.*)\)$/.exec(s); if (m) s = '-' + m[1];
  s = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function mpQty(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}
const mpPad2 = function (n) { return String(n).padStart(2, '0'); };
function mpExcelSerialToISO(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  return d.toISOString().slice(0, 10);
}
function mpParseDate(v) {
  const s = String(v == null ? '' : v).trim(); if (!s) return '';
  if (/^\d{5}(\.\d+)?$/.test(s)) { const n = parseFloat(s); if (n > 20000 && n < 80000) return mpExcelSerialToISO(Math.floor(n)); }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return m[1] + '-' + mpPad2(+m[2]) + '-' + mpPad2(+m[3]);
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
  if (m) {
    let dd = +m[1], mm = +m[2];
    if (mm > 12 && dd <= 12) { const t = dd; dd = mm; mm = t; }   // assume dd-mm-yyyy (India)
    return m[3] + '-' + mpPad2(mm) + '-' + mpPad2(dd);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}
function mpRowDate(row) {
  let d = mpParseDate(mpVal(row, 'orderDate'));
  if (!d) d = mpParseDate(mpColByName(row, ['created on', 'delivered on', 'shipped on', 'packed on', 'order date']));
  return d;
}
function mpDedupeKey(r) {
  if (r.orderLine) return [(r.orderNo || ''), 'L', r.orderLine].join('|').toLowerCase();
  return [(r.orderNo || ''), (r.sku || ''), (r.size || '')].join('|').toLowerCase();
}
function mpExistingKeys() {
  const set = new Set();
  (db.saleImports || []).forEach(function (b) { (b.keys || []).forEach(function (k) { set.add(k); }); });
  return set;
}

/* ---------- parse rows ---------- */
function mpReparse() {
  const st = MP_STATE;
  const seen = {}, existing = mpExistingKeys();
  const hasQtyCol = st.mapping.qty != null;
  const skipSet = {};
  (st.opts.skipStatuses || []).forEach(function (s) { skipSet[s] = 1; });
  const out = [];
  st.dataRows.forEach(function (row, i) {
    const orderNo = mpVal(row, 'orderNo');
    const orderLine = mpVal(row, 'orderLine');
    const sku = mpVal(row, 'sku') || mpVal(row, 'styleCode');
    const styleCode = mpVal(row, 'styleCode');
    const productName = mpVal(row, 'productName');
    const brand = mpVal(row, 'brand');
    const size = mpVal(row, 'size');
    const qty = hasQtyCol ? mpQty(mpVal(row, 'qty')) : 1;   /* Myntra exports are unit-level: 1 row = 1 pc */
    const mrp = mpMoney(mpVal(row, 'mrp'));
    const sp = mpMoney(mpVal(row, 'sellingPrice'));
    const disc = mpMoney(mpVal(row, 'discount'));
    const net = mpMoney(mpVal(row, 'netAmount'));
    const status = mpVal(row, 'orderStatus');
    const fileProg = st.mapping.program != null ? String(mpVal(row, 'program')).toUpperCase().trim() : '';
    /* the seller id is the key of the Seller ↔ po_type master */
    const sellerId = String(mpVal(row, 'sellerId') || mpColByName(row, MP_SELLER_HDRS) || '').trim();
    /* the report’s po_type is the starting point; the master outranks it further down, per seller id */
    const program = fileProg || (sellerId && masterIsActive('sellerPrograms', sellerId) ? sellerProgramOf(sellerId) : '');
    const progFrom = program ? (fileProg ? 'file' : 'master') : '';
    const orderDate = mpRowDate(row);

    let unit = net > 0 ? net : (sp > 0 ? sp - disc : (mrp > 0 ? mrp - disc : 0));
    if (unit <= 0 && sp > 0) unit = sp;
    if (unit <= 0 && mrp > 0) unit = mrp;
    unit = Math.round(unit * 100) / 100;
    if (qty > 1) unit = Math.round((unit / qty) * 100) / 100;
    const amount = Math.round(unit * qty * 100) / 100;

    const raw = new Array(st.headers.length);
    for (let c = 0; c < st.headers.length; c++) raw[c] = mpCellVal(row, c);
    const rec = {
      rowNo: i + 2, orderNo: orderNo, orderLine: orderLine, orderDate: orderDate, sku: sku, styleCode: styleCode,
      productName: productName, brand: brand, size: size, qty: qty, mrp: mrp, sp: sp, disc: disc, net: net,
      status: status, program: program, progFrom: progFrom, sellerId: sellerId, unit: unit, amount: amount, skip: false, dup: false, reason: '', raw: raw
    };
    const base = (productName || (styleCode ? 'Style ' + styleCode : '') || (sku ? 'SKU ' + sku : '') || ('Line ' + rec.rowNo)).trim();
    rec.desc = base + (sku && (productName || styleCode) ? ' · ' + sku : '') + (size ? ' · ' + size : '');
    rec.key = mpDedupeKey(rec);

    if (hasQtyCol && qty <= 0) { rec.skip = true; rec.reason = 'Missing / zero quantity'; }
    else if (!productName && !sku && !styleCode) { rec.skip = true; rec.reason = 'No SKU or product name'; }
    else if (status && skipSet[status]) { rec.skip = true; rec.reason = 'Status: ' + status; }
    else if (existing.has(rec.key)) { rec.skip = true; rec.dup = true; rec.reason = 'Already imported earlier'; }
    else if (seen[rec.key]) { rec.skip = true; rec.dup = true; rec.reason = 'Duplicate row in this file'; }
    if (!rec.skip) seen[rec.key] = 1;
    out.push(rec);
  });
  /* the Seller \u2194 po_type master outranks the report: where it holds the row's seller id, that
     is the program. The report's own po_type is the fallback for ids the master does not know,
     and a disagreement is remembered so the review can show it instead of hiding it. */
  out.forEach(function (r) {
    const sid = r.sellerId;
    if (!sid || !masterIsActive('sellerPrograms', sid)) return;
    const p = sellerProgramOf(sid);
    if (!p) return;
    const said = r.progFrom === 'file' ? r.program : '';
    if (said && said !== p) r.progOver = said;
    r.program = p;
    r.progFrom = (said && said === p) ? 'file' : 'master';
  });
  st.parsed = out;
}

/* ---------- preserve UI options across re-renders ---------- */
function mpPreserveOpts() {
  const st = MP_STATE; if (!st || !st.opts) return;
  try {
    if (qs('[data-cb-input="mp-cust"]')) st.opts.customer = cboxGet('mp-cust');
    if (qs('[data-cb-input="mp-chan"]')) st.opts.channel = cboxGet('mp-chan');
    const grp = $('mp-group'); if (grp) st.opts.group = grp.value;
    const pr = $('mp-program'); if (pr) st.opts.program = pr.value;
    const stx = qsa('[data-mp-status]');
    if (stx.length) st.opts.skipStatuses = stx.filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-mp-status'); });
  } catch (e) { }
}
function mpMapChange(f, v) {
  mpPreserveOpts();
  MP_STATE.mapping[f] = parseInt(v, 10);
  if (isNaN(MP_STATE.mapping[f])) delete MP_STATE.mapping[f];
  mpReparse();
  render();
}
function mpToggleStatus(s, on) {
  mpPreserveOpts();
  const st = MP_STATE;
  const cur = st.opts.skipStatuses || [];
  if (on && cur.indexOf(s) < 0) cur.push(s);
  if (!on) st.opts.skipStatuses = cur.filter(function (x) { return x !== s; });
  else st.opts.skipStatuses = cur;
  mpReparse();
  render();
}
function mpGroupChange(v) { mpPreserveOpts(); MP_STATE.opts.group = v; render(); }

/* ---------- step 2 : map, review, import ---------- */
function mpMappingHtml() {
  const st = MP_STATE;
  let h = '<div class="grid-auto">';
  MP_FIELDS.forEach(function (f) {
    const opts = ['<option value="-1">— Not present —</option>'].concat(st.headers.map(function (hdr, i) {
      return '<option value="' + i + '"' + (st.mapping[f.k] === i ? ' selected' : '') + '>' + esc(hdr) + '</option>';
    })).join('');
    h += field(f.l + (f.req ? ' *' : ''), '<select class="inp" onchange="mpMapChange(\'' + f.k + '\', this.value)">' + opts + '</select>');
  });
  return h + '</div>';
}

function mpStep2Html() {
  const st = MP_STATE, src = mpSource(st.srcKey);
  const parsed = st.parsed || [];
  const ok = parsed.filter(function (r) { return !r.skip; });
  const skipped = parsed.filter(function (r) { return r.skip; });
  const dupN = skipped.filter(function (r) { return r.dup; }).length;
  const statN = skipped.filter(function (r) { return /^Status:/.test(r.reason); }).length;
  const errN = skipped.length - dupN - statN;
  const qty = ok.reduce(function (a, r) { return a + r.qty; }, 0);
  const amt = ok.reduce(function (a, r) { return a + r.amount; }, 0);
  const autoP = !st.opts.program || st.opts.program === 'AUTO';
  const byProg = {};
  ok.forEach(function (r) {
    const p = autoP ? (r.program || '—') : st.opts.program;
    if (!byProg[p]) byProg[p] = { n: 0, qty: 0, amt: 0, m: 0 };
    byProg[p].n++; byProg[p].qty += r.qty; byProg[p].amt += r.amount; if (autoP && r.progFrom === 'master') byProg[p].m++;
  });
  const groups = mpBuildGroups();
  const locked = mpProgLocked();
  if (locked) st.opts.program = 'AUTO';
  /* the file's own tally - a run where every row is already imported must not read as "no po_type" */
  const nFile = parsed.filter(function (r) { return r.progFrom === 'file'; }).length;
  const nMaster = parsed.filter(function (r) { return r.progFrom === 'master'; }).length;
  const nBlank = parsed.filter(function (r) { return !r.program; }).length;
  const sids = mpSellerIds();
  const unmatched = sids.filter(function (sid) { return !sellerProgramOf(sid); }).length;
  const nOver = parsed.filter(function (r) { return !!r.progOver; }).length;
  const nSellers = sids.length;
  const seenProg = []; parsed.forEach(function (r) { if (r.program && seenProg.indexOf(r.program) < 0) seenProg.push(r.program); });
  const hasQty = st.mapping.qty != null;
  const hasIdent = st.mapping.sku != null || st.mapping.productName != null || st.mapping.styleCode != null;
  const canImport = userCan('sale', 'create') && ok.length > 0 && hasIdent;

  let h = '<div class="entry-page">' + mpStepper();

  /* file + sheet */
  h += '<div class="sec">File</div><div class="grid-fixed">' +
    field('Report file', '<span class="badge b-green">' + esc(st.fileName) + '</span> <button type="button" class="btn btn-ghost btn-sm" onclick="mpBackToUpload()">' + ic('back', 16) + 'Change file</button>') +
    (st.sheets.length > 1
      ? field('Worksheet', '<select class="inp" onchange="mpSheetChange(this.value)">' + st.sheets.map(function (s, i) {
        return '<option value="' + i + '"' + (i === st.sheetIdx ? ' selected' : '') + '>' + esc(s.name) + ' (' + fmtNum(s.rows.length) + ' rows)</option>';
      }).join('') + '</select>')
      : field('Worksheet', '<span class="sub-line">' + esc(st.sheets[st.sheetIdx].name) + ' · header detected on row ' + (st.headerRowIdx + 1) + '</span>')) +
    '</div>';

  if (!hasIdent) {
    h += '<div class="warn">⚠️ Column mapping incomplete — map at least one of <b>SKU / Product Name / Style Code</b> before importing.</div>';
  } else if (!hasQty && parsed.length) {
    h += '<div class="hint" style="background:#f1f6fd;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px">ℹ️ No <b>Quantity</b> column in this report — Myntra exports are unit-level, so <b>each row is imported as 1 pc</b>. All <b>' + st.headers.length + ' columns</b> of the file are preserved on every imported row — click any preview row to see them.</div>';
  }

  /* mapping */
  h += '<div class="sec">Column mapping (auto-detected — correct if needed)</div>' + mpMappingHtml();

  /* options */
  const progs = ['AUTO', 'SJIT', 'PPMP', 'FBM'];
  if (st.opts.program && progs.indexOf(st.opts.program) < 0) progs.push(st.opts.program);
  h += '<div class="sec">Import options</div><div class="grid-fixed">' +
    field('Marketplace', '<div class="segbar" style="flex-wrap:wrap">' + MP_SOURCES.map(function (s) {
      return '<button type="button" class="seg' + (st.srcKey === s.k ? ' on' : '') + '" onclick="mpSetSource(\'' + s.k + '\')">' + esc(s.l) + '</button>';
    }).join('') + '</div>') +
    field('Seller program',
      (locked
        ? '<select class="inp" id="mp-program" disabled title="The Seller ↔ po_type master holds an answer for every seller id in this file, so its program is what these rows are booked with">' +
        '<option value="AUTO">Auto — from the Seller ↔ po_type master</option></select>' +
        '<div class="sub-line" style="margin-top:4px">' + esc(seenProg.join(' + ') || '—') + ' · ' +
        fmtNum(nMaster + nFile) + ' row' + (nMaster + nFile === 1 ? '' : 's') + ' · ' + fmtNum(nSellers) + ' seller id' + (nSellers === 1 ? '' : 's') +
        ' taken from the master' +
        (nOver ? ' · <span style="color:#b45309">' + fmtNum(nOver) + ' row' + (nOver === 1 ? '' : 's') + ' the report answered differently</span>' : '') +
        mpMiniLink('mpProgUnlock', 'override for this file') + '</div>'
        : '<select class="inp" id="mp-program">' + progs.map(function (p) {
          const l = p === 'AUTO' ? 'Auto — from report po_type' + (st.mapping.program != null ? '' : ' (not in file)') : p;
          return '<option value="' + p + '"' + ((st.opts.program || 'AUTO') === p ? ' selected' : '') + '>' + esc(l) + '</option>';
        }).join('') + '</select>' +
        '<div class="sub-line" style="margin-top:4px">' +
        (st.mapping.program != null
          ? fmtNum(nFile) + ' of ' + fmtNum(parsed.length) + ' rows answered by the report’s own po_type'
          : 'the report has no po_type column') + ' · ' +
        fmtNum(nMaster) + ' from the master' +
        (nOver ? ' · ' + fmtNum(nOver) + ' the master overrode' : '') +
        (unmatched ? ' · <span style="color:#b45309">' + fmtNum(unmatched) + ' seller id' + (unmatched === 1 ? '' : 's') + ' not in the master</span>' : '') +
        (nBlank && !unmatched ? ' · <span style="color:#b45309">' + fmtNum(nBlank) + ' left blank</span>' : '') +
        mpMiniLink('mpOpenSellerMasterAll', 'open the master') +
        (st.opts.progOverride ? mpMiniLink('mpProgRelock', 'back to the master') : '') + '</div>')) +
    field('Create Sale records',
      '<select class="inp" id="mp-group" onchange="mpGroupChange(this.value)">' +
      '<option value="date"' + (st.opts.group !== 'file' && st.opts.group !== 'order' ? ' selected' : '') + '>One Sale record per Order Date</option>' +
      '<option value="file"' + (st.opts.group === 'file' ? ' selected' : '') + '>One Sale record per program / report</option>' +
      '<option value="order"' + (st.opts.group === 'order' ? ' selected' : '') + '>One Sale record per Order No</option>' +
      '</select>') +
    field('Customer *', cbox('mp-cust', { opts: db.masters.customers, value: st.opts.customer || src.customer, f: 'customer', addMaster: 'customers', addText: 'Customers', free: true })) +
    field('Channel', cbox('mp-chan', { opts: CHANNELS, value: st.opts.channel || src.channel, f: 'channel', free: true })) +
    '</div>';

  /* the file's seller ids next to what the Seller ↔ po_type master holds for each one */
  if (sids.length) {
    h += '<div class="sec">Seller id → program, from the Seller ↔ po_type master</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">' + sids.map(function (sid, j) {
        const rows = parsed.filter(function (r) { return mpSellerSidOf(r).toLowerCase() === sid.toLowerCase(); });
        const nImp = rows.filter(function (r) { return !r.skip; }).length;
        const prog = sellerProgramOf(sid), on = masterIsActive('sellerPrograms', sid);
        const nF = rows.filter(function (r) { return r.progFrom === 'file'; }).length;
        const nM = rows.filter(function (r) { return r.progFrom === 'master'; }).length;
        const nOvr = rows.filter(function (r) { return !!r.progOver; }).length;
        const bits = [fmtNum(rows.length) + ' row' + (rows.length === 1 ? '' : 's') +
          (nImp === rows.length ? '' : ' · ' + fmtNum(nImp) + ' will import')];
        if (st.mapping.program != null && nF) bits.push(fmtNum(nF) + ' answered by the report');
        if (nM) bits.push(fmtNum(nM) + ' from the master');
        if (nOvr) bits.push(fmtNum(nOvr) + ' the master overrode the report');
        if (!nF && !nM) bits.push('no program on those rows');
        const tail = bits.join(' · ');
        return '<span class="stock-chip"><b>' + esc(sid) + '</b> → ' +
          (prog ? (on ? '<b>' + esc(prog) + '</b>' : '<b>' + esc(prog) + '</b> <span style="color:#b45309">switched off</span>')
            : '<span style="color:#b45309">not in the master</span>') +
          ' <span class="sub-line">' + tail + '</span>' +
          (prog ? '' : mpMiniLink('mpSellerDialogAt(null,' + j + ')', 'link it')) + '</span>';
      }).join('') + '</div>' +
      '<div class="hint">Read off the <b>' + esc(st.headers[st.mapping.sellerId != null ? st.mapping.sellerId : 0] || 'seller id') + '</b> column. ' +
      'Wherever the master holds an id, its program is what those rows are booked with — the report’s own ' +
      'po_type is used only for ids it does not know. Click "link it" on one of those and the rows are re-read at once, no re-upload.</div>';
  }

  /* status skip chips */
  const statuses = Object.keys(st.statusCounts || {}).sort();
  if (statuses.length) {
    const bads = statuses.filter(function (x) { return mpStatusIsBad(x) && (st.opts.skipStatuses || []).indexOf(x) < 0; });
    const nBad = bads.reduce(function (t, x) { return t + (st.statusCounts[x] || 0); }, 0);
    h += '<div class="sec">Order statuses in this file \u2014 tick to skip</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + statuses.map(function (s) {
        const on = (st.opts.skipStatuses || []).indexOf(s) > -1;
        return '<label class="cbx" style="border:1px solid var(--line);border-radius:8px;padding:6px 10px;background:#fff;gap:8px">' +
          '<input type="checkbox" data-mp-status="' + esc(s) + '"' + (on ? ' checked' : '') + ' onchange="mpToggleStatus(\'' + snJsArg(s) + '\', this.checked)"> ' +
          '<span><b>' + esc(s) + '</b> <span class="sub-line">' + fmtNum(st.statusCounts[s]) + ' rows</span></span></label>';
      }).join('') + '</div>' +
      '<div class="hint">Nothing is excluded by default — every status above is booked as Sale rows with their status kept on each item. ' +
      'Tick a status to leave those rows out of this import.' +
      (bads.length ? ' <span style="color:#b45309">' + fmtNum(nBad) + ' row' + (nBad === 1 ? '' : 's') + ' marked ' +
        bads.map(function (x) { return '<b>' + esc(x) + '</b>'; }).join(' / ') +
        (nBad === 1 ? ' reads' : ' read') + ' as a return rather than a sale, and ' +
        (nBad === 1 ? 'is being' : 'are being') + ' booked.</span>' : '') + '</div>';
  }

  /* summary */
  h += '<div class="sec">Review</div><div class="stats">' +
    '<div class="stat"><div class="lbl">Rows in file</div><div class="val">' + fmtNum(parsed.length) + '</div></div>' +
    '<div class="stat green"><div class="lbl">Will import</div><div class="val">' + fmtNum(ok.length) + '</div><div class="extra">' + fmtNum(qty) + ' pcs · ' + fmtINR(amt) + '</div></div>' +
    '<div class="stat"><div class="lbl">Sale records to create</div><div class="val">' + fmtNum(groups.length) + '</div><div class="extra">' + esc(autoP && (st.mapping.program != null || locked) ? (locked ? 'split by po_type from the master' : 'split by po_type') : (st.opts.group === 'date' ? 'grouped by order date' : st.opts.group === 'order' ? 'grouped by order no' : 'one per program')) + '</div></div>' +
    '<div class="stat' + (skipped.length ? ' pink' : '') + '"><div class="lbl">Skipped</div><div class="val">' + fmtNum(skipped.length) + '</div><div class="extra">' + statN + ' status · ' + dupN + ' duplicate · ' + errN + ' invalid</div></div>' +
    '</div>';
  const progChips = Object.keys(byProg).map(function (p) {
    const m = byProg[p].m;
    return '<span class="stock-chip"><b>' + esc(p) + '</b> ' + fmtNum(byProg[p].n) + ' rows · ' + fmtNum(byProg[p].qty) + ' pcs · <b>' + fmtINR(Math.round(byProg[p].amt * 100) / 100) + '</b>' +
      (m ? ' <span class="sub-line">' + fmtNum(m) + ' from the seller master</span>' : '') + '</span>';
  }).join('');
  if (progChips) h += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' + progChips + '</div>';

  /* preview tables */
  h += '<div class="sec">Preview — first ' + Math.min(10, ok.length) + ' rows</div>';
  h += mpPreviewTable(ok.slice(0, 10), false, autoP);
  if (skipped.length) {
    h += '<div class="sec">Skipped rows — first ' + Math.min(8, skipped.length) + ' of ' + skipped.length + '</div>';
    h += mpPreviewTable(skipped.slice(0, 8), true, autoP);
  }

  /* actions */
  h += '<div style="display:flex;gap:8px;margin-top:18px;align-items:center;flex-wrap:wrap">' +
    '<button type="button" class="btn btn-ghost" onclick="mpBackToUpload()">' + ic('back', 16) + 'Upload a different file</button>' +
    '<div style="flex:1"></div>' +
    '<button type="button" class="btn btn-primary"' + (canImport ? '' : ' disabled style="opacity:.45;cursor:not-allowed"') + ' onclick="mpDoImport()">' +
    ic('check', 16) + 'Import ' + fmtNum(ok.length) + ' rows into ' + fmtNum(groups.length) + ' Sale record' + (groups.length === 1 ? '' : 's') +
    '</button></div>';
  if (!userCan('sale', 'create')) h += '<div class="hint">You do not have create access on the Sale module.</div>';

  return h + '</div>';
}

function mpToggleRaw(list, idx) {
  const st = MP_STATE; if (!st) return;
  const key = list + ':' + idx;
  st.rawOpen = (st.rawOpen === key) ? null : key;
  render();
}
function mpRawGridHtml(headers, raw) {
  let h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:4px 18px;background:#f7f7f5;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:4px 0 10px">';
  for (let c = 0; c < headers.length; c++) {
    h += '<div style="font-size:12px;line-height:1.5"><span class="sub-line">' + esc(headers[c]) + ':</span> <b>' + (raw[c] === '' ? '<span class="sub-line">—</span>' : esc(raw[c])) + '</b></div>';
  }
  return h + '</div>';
}

/* the preview slices the parsed rows, so a cell has to find its record the same way */
function mpRecAt(listName, idx) {
  const st = MP_STATE;
  if (!st || !st.parsed) return null;
  const list = st.parsed.filter(function (r) { return listName === 'skip' ? !!r.skip : !r.skip; });
  return list[idx] || null;
}
function mpSellerSidOf(r) { return String((r && r.sellerId) || '').trim(); }
/* jump out of the import into the master, searched for this seller */
function mpOpenSellerMaster(sid) {
  if (!canMasterTab('sellerPrograms', 'view')) return toast('Access denied for this Master', 'red');
  cur = 'masters'; pageView = null; mTab = 'sellerPrograms'; mQuery = String(sid || ''); mParent = ''; mPage = 1;
  render();
}
/* from a preview row: sid is read off the record, so nothing has to be quoted into HTML */
function mpJumpSeller(listName, idx) {
  const r = mpRecAt(listName, idx);
  mpOpenSellerMaster(r ? mpSellerSidOf(r) : '');
}
/* true when the Seller \u2194 po_type master holds an answer for every seller id in this file -
   then the program is a fact taken from the master, not a choice to make here */
function mpProgLocked() {
  const st = MP_STATE;
  if (!st || !st.parsed || !st.opts || st.opts.progOverride) return false;
  const live = st.parsed.filter(function (r) { return !r.skip; });
  if (!live.length) return false;
  return live.every(function (r) {
    const sid = mpSellerSidOf(r);
    return !!sid && !!sellerProgramOf(sid) && masterIsActive('sellerPrograms', sid);
  });
}
function mpProgUnlock() {
  mpPreserveOpts();
  if (!MP_STATE) return;
  MP_STATE.opts.progOverride = true;
  render(); toast('You can pick the program for this file', 'green');
}
function mpProgRelock() {
  if (!MP_STATE) return;
  MP_STATE.opts.progOverride = false; MP_STATE.opts.program = 'AUTO';
  render(); toast('Back to the Seller \u2194 po_type master', 'green');
}
function mpOpenSellerMasterAll() { mpOpenSellerMaster(''); }
function mpMiniLink(fn, label) {
  return ' <a href="#" onclick="' + fn + ';return false" style="color:var(--blue,#2563eb);text-decoration:underline">' + label + '</a>';
}
function mpSellerLink(listName, idx, html, title) {
  return '<a href="#" onclick="mpSellerDialog(event,\'' + listName + '\',' + idx + ');return false" ' +
    'style="color:var(--blue,#2563eb);text-decoration:underline" title="' + esc(title) + '">' + html + '</a>';
}
/* the row's own pair of cells: the seller id it carries and the po_type it will be booked with */
function mpSellerCells(r, listName, i, showProg, locked) {
  const sid = mpSellerSidOf(r);
  const mapped = sid ? sellerProgramOf(sid) : '';
  const on = sid ? masterIsActive('sellerPrograms', sid) : true;
  let sidCell;
  if (!sid) {
    sidCell = '<span class="sub-line" title="This report has no seller id column, so po_type cannot be filled from the master">— not in file</span>';
  } else {
    sidCell = mpSellerLink(listName, i, esc(sid),
      !mapped ? sid + ' is not in the Seller ↔ po_type master — click to add it'
        : !on ? sid + ' → ' + mapped + ', but the mapping is switched off — click to switch it back on'
          : sid + ' → ' + mapped + ' · click to view or change the mapping');
    if (!mapped) sidCell += '<div class="sub-line" style="color:#b45309">not mapped</div>';
    else if (!on) sidCell += '<div class="sub-line" style="color:#b45309">switched off</div>';
  }
  let progCell;
  if (r.program) {
    progCell = '<span class="badge b-blue">' + esc(r.program) + '</span>' +
      (r.progFrom === 'master'
        ? (locked
          ? '<div class="sub-line">from the seller master</div>'
          : '<div class="sub-line">' + mpSellerLink(listName, i, 'from the master', 'filled from the Seller ↔ po_type master — click to change it') + '</div>')
        : '<div class="sub-line">from the file</div>');
  } else {
    progCell = mpSellerLink(listName, i, '+ po_type',
      sid ? 'no po_type for ' + sid + ' — the file had none and the master has no row. Click to add it and the rows are re-read.'
        : 'no po_type on this row — click to set one');
  }
  if (r.progOver) progCell += '<div class="sub-line" style="color:#b45309">the report said ' + esc(r.progOver) + '</div>';
  return { sid: '<td>' + sidCell + '</td>', prog: '<td>' + progCell + '</td>' };
}
/* every distinct seller id in this file, in the order the rows were read */
function mpSellerIds() {
  const st = MP_STATE;
  if (!st || !st.parsed) return [];
  const seen = {}, out = [];
  st.parsed.forEach(function (r) {
    const sid = mpSellerSidOf(r);
    if (!sid) return;
    const k = sid.toLowerCase();
    if (seen[k]) return;
    seen[k] = 1; out.push(sid);
  });
  return out;
}
function mpSellerJumpAt(i) { mpOpenSellerMaster(mpSellerIds()[i] || ''); }
function mpSellerDialogAt(ev, i) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  mpSellerDialogFor(mpSellerIds()[i] || '', 'mpSellerJumpAt(' + i + ')');
}
function mpSellerDialog(ev, listName, idx) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  const r = mpRecAt(listName, idx);
  if (!r) return;
  mpSellerDialogFor(mpSellerSidOf(r), 'mpJumpSeller(\'' + listName + '\',' + idx + ')');
}
/* the mapping, editable right here: saving re-reads the file so the review updates at once */
function mpSellerDialogFor(sid, jump) {
  const st = MP_STATE;
  if (!st) return;
  if (!sid) {
    openDialog({
      title: 'No seller id on this row',
      bodyHtml: '<div style="font-size:13px;line-height:1.6">This report has no seller id column mapped, so po_type cannot be filled from the ' +
        '<b>Seller ↔ po_type</b> master. Choose the column under <b>Column mapping → Seller id</b> and the rows are re-read at once. ' +
        'If the export carries no such column, nothing is guessed: every row keeps whatever po_type the file had.</div>',
      confirmText: 'Back to the review'
    });
    return;
  }
  const same = st.parsed.filter(function (x) { return mpSellerSidOf(x).toLowerCase() === sid.toLowerCase(); });
  const willImport = same.filter(function (x) { return !x.skip; }).length;
  const nFile = same.filter(function (x) { return x.progFrom === 'file'; }).length;
  const nMaster = same.filter(function (x) { return x.progFrom === 'master'; }).length;
  const nOver = same.filter(function (x) { return !!x.progOver; }).length;
  const mapped = sellerProgramOf(sid), on = masterIsActive('sellerPrograms', sid);
  openDialog({
    title: 'Seller id ' + sid,
    bodyHtml:
      '<div class="dlg-field"><label>po_type for ' + esc(sid) + '</label>' +
      '<input class="inp" id="mp-dlg-prog" value="' + esc(mapped) + '" placeholder="e.g. SJIT / PPMP" list="mp-dlg-prog-list" autocomplete="off">' +
      '<datalist id="mp-dlg-prog-list">' + sellerProgramValues().map(function (x) { return '<option value="' + esc(x.v) + '"></option>'; }).join('') + '</datalist>' +
      '</div>' +
      '<div class="sub-line">' + fmtNum(same.length) + (same.length === 1 ? ' row carries this seller id' : ' rows in this file carry this seller id') +
      (willImport === same.length ? '' : ' \u00b7 ' + fmtNum(willImport) + ' of them will import') + ' \u00b7 ' +
      (nFile ? fmtNum(nFile) + ' the report said the same thing · ' : '') +
      (nOver ? fmtNum(nOver) + ' the master overrode the report · ' : '') +
      (nMaster ? fmtNum(nMaster) + ' filled from the master' : fmtNum(same.length - nFile - nOver) + ' will be filled from the master') + '</div>' +
      (mapped && !on ? '<div class="warn" style="margin-top:10px">This mapping is switched <b>off</b> — saving it here switches it back on.</div>' : '') +
      (!mapped ? '<div class="hint" style="margin-top:10px">Nothing is stored for ' + esc(sid) + ' yet, so those rows keep the report’s own po_type — and are booked without a program where the report had none.</div>' : '') +
      '<div style="margin-top:12px;font-size:12.5px"><a href="#" onclick="' + (jump || 'mpOpenSellerMasterAll()') + ';return false" ' +
      'style="color:var(--blue,#2563eb);text-decoration:underline">Open the Seller ↔ po_type master</a> ' +
      '<span class="sub-line">the import stays staged — "New Import" brings this review back</span></div>',
    after: function () { const e2 = document.getElementById('mp-dlg-prog'); if (e2) { e2.focus(); e2.select(); } },
    confirmText: mapped ? 'Save and re-check the rows' : 'Add to the master and re-check',
    onConfirm: function () {
      const el = document.getElementById('mp-dlg-prog'), prog = el ? String(el.value).trim() : '';
      const low = sid.toLowerCase();
      if (!(db.masters.sellerPrograms || []).some(function (x) { return String(x).trim().toLowerCase() === low; })) addMasterVal('sellerPrograms', sid, true);
      setSellerProgram(sid, prog);
      if (db.masters.masterStatus && db.masters.masterStatus.sellerPrograms) db.masters.masterStatus.sellerPrograms[low] = true;
      saveDB();
      mpReparse();
      render();
      toast(sid + (prog ? ' → ' + sellerProgramOf(sid) : ' cleared') + ' · rows re-checked', 'green');
      return true;
    }
  });
}

function mpPreviewTable(rows, skippedMode, showProg) {
  if (!rows.length) return '<div class="panel"><div class="empty" style="padding:26px"><p>No rows</p></div></div>';
  const st = MP_STATE;
  const locked = mpProgLocked();
  const listName = skippedMode ? 'skip' : 'ok';
  const ncols = 11 + (showProg ? 1 : 0) + (skippedMode ? 1 : 0);
  const head = '<tr>' + srTh() + '<th>Order No</th><th>Date</th><th>SKU / Style</th><th>Product</th><th>Size</th><th title="the column the Seller ↔ po_type master is keyed on">Seller id</th>' + (showProg ? '<th>po_type</th>' : '') + '<th class="num">Qty</th><th class="num">Unit ₹</th><th class="num">Amount</th><th>Status</th>' + (skippedMode ? '<th>Reason</th>' : '') + '</tr>';
  const body = rows.map(function (r, i) {
    const open = st && st.rawOpen === listName + ':' + i;
    let h = '<tr style="cursor:pointer" title="Click to see all ' + (st ? st.headers.length : 0) + ' columns of this Excel row" onclick="mpToggleRaw(&quot;' + listName + '&quot;,' + i + ')">' +
      '<td class="srcol">' + (i + 1) + '</td>' +
      '<td>' + (open ? '▾ ' : '▸ ') + esc(r.orderNo || '—') + '</td>' +
      '<td>' + esc(r.orderDate ? dpToDisplay(r.orderDate) : '—') + '</td>' +
      '<td>' + esc(r.sku || r.styleCode || '—') + '</td>' +
      '<td>' + esc(r.productName || '—') + (r.brand ? '<div class="sub-line">' + esc(r.brand) + '</div>' : '') + '</td>' +
      '<td>' + esc(r.size || '—') + '</td>' +
      (function () { const c = mpSellerCells(r, listName, i, showProg, locked); return c.sid + (showProg ? c.prog : ''); })() +
      '<td class="num">' + fmtNum(r.qty) + '</td>' +
      '<td class="num">' + fmtNum(r.unit) + '</td>' +
      '<td class="num"><b>' + fmtINR(r.amount) + '</b></td>' +
      '<td>' + esc(r.status || '—') + '</td>' +
      (skippedMode ? '<td><span class="badge ' + (r.dup ? 'b-amber' : 'b-red') + '">' + esc(r.reason) + '</span></td>' : '') +
      '</tr>' +
      (open && r.raw ? '<tr><td colspan="' + ncols + '" style="padding:2px 8px">' + mpRawGridHtml(st.headers, r.raw) + '</td></tr>' : '');
    return h;
  }).join('');
  return '<div class="panel"><div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></div>';
}

/* ---------- grouping & import ---------- */
function mpItemFromRec(rec) {
  const rw = rec.raw || [];
  const sid = String(rec.sellerId || mpColByName(rw, MP_SELLER_HDRS) || '').trim();
  /* a program forced for this file wins, then the master’s answer stamped at parse; the report’s value is the fallback */
  const forced = (MP_STATE && MP_STATE.opts && MP_STATE.opts.program && MP_STATE.opts.program !== 'AUTO')
    ? String(MP_STATE.opts.program).toUpperCase() : '';
  const prog = forced || String(rec.program || '').trim() ||
    (sid && masterIsActive('sellerPrograms', sid) ? sellerProgramOf(sid) : '');
  return {
    desc: rec.productName || rec.desc, qty: rec.qty, rate: rec.unit, disc: 0, tax: 0, amount: rec.amount,
    sku: rec.sku, styleCode: rec.styleCode, size: rec.size, brand: rec.brand,
    orderNo: rec.orderNo, orderLine: rec.orderLine, orderDate: rec.orderDate, program: prog,
    sellerId: sid,
    mrp: rec.mrp, sp: rec.sp, discount: rec.disc, mpStatus: rec.status, imported: true,
    rowNo: rec.rowNo, raw: rec.raw,
    warehouseId: mpColByName(rw, ['warehouse id']),
    skuId: mpColByName(rw, ['sku id']),
    myntraSku: mpColByName(rw, ['myntra sku code']),
    vendorArticle: mpColByName(rw, ['vendor article number']),
    articleType: mpColByName(rw, ['article type', 'product type']),
    city: mpColByName(rw, ['city']),
    state: mpColByName(rw, ['state', 'ship state', 'shipping state', 'buyer state', 'bill to state',
      'billing state', 'deliver state', 'delivery state', 'destination state',
      'state name', 'order state', 'receiver state']),
    cancelReason: mpColByName(rw, ['cancellation reason'])
  };
}

function mpBuildGroups() {
  const st = MP_STATE;
  if (!st || !st.parsed) return [];
  const mode = st.opts.group || 'date';
  const autoP = !st.opts.program || st.opts.program === 'AUTO';
  const byKey = {}, groups = [];
  st.parsed.forEach(function (rec) {
    if (rec.skip) return;
    const prog = autoP ? (rec.program || '') : st.opts.program;
    const base = mode === 'file' ? 'ALL' : mode === 'date' ? (rec.orderDate || 'No date') : (rec.orderNo || ('Line ' + rec.rowNo));
    const key = base + (autoP ? '|P|' + (prog || 'NA') : '');
    if (!byKey[key]) {
      byKey[key] = { key: key, program: prog, date: '', dateMax: '', items: [], qty: 0, amount: 0, orderNos: {}, rawHeaders: st.headers };
      groups.push(byKey[key]);
    }
    const g = byKey[key];
    g.items.push(mpItemFromRec(rec));
    g.qty += rec.qty; g.amount += rec.amount;
    if (rec.orderNo) g.orderNos[rec.orderNo] = 1;
    if (mode === 'date') { g.date = key.indexOf('No date') === 0 ? today() : (rec.orderDate || today()); }
    else if (rec.orderDate && (!g.dateMax || rec.orderDate > g.dateMax)) g.dateMax = rec.orderDate;
  });
  groups.forEach(function (g) {
    if (mode !== 'date') g.date = g.dateMax || today();
    g.amount = Math.round(g.amount * 100) / 100;
  });
  return groups;
}

function mpDoImport() {
  const st = MP_STATE;
  mpPreserveOpts();
  if (!userCan('sale', 'create')) return toast('Create access denied for the Sale module', 'red');
  const groups = mpBuildGroups();
  if (!groups.length) return toast('Nothing to import — every row is skipped', 'red');
  const src = mpSource(st.srcKey);
  const customer = String((cboxGet('mp-cust') || '').trim() || st.opts.customer || src.customer);
  const channel = String((cboxGet('mp-chan') || '').trim() || st.opts.channel || src.channel);
  const pay = 'Unpaid';   /* the file has no say in it - it is marked on the Sale */
  const batchId = uid();
  const saleIds = [], saleNos = [], keys = [], programs = [];
  let qty = 0, amount = 0, dMin = '', dMax = '';
  groups.forEach(function (g) {
    const program = g.program || '';
    if (program && programs.indexOf(program) < 0) programs.push(program);
    const rec = {
      id: uid(), date: g.date, customer: customer, channel: channel,
      payStatus: pay, payMode: '', invoiceNo: '',
      notes: src.l + (program ? ' ' + program : '') + ' sale report import — ' + st.fileName + ' · ' + g.items.length + ' line' + (g.items.length === 1 ? '' : 's'),
      status: 'Open', items: g.items,
      source: { kind: 'marketplace-import', marketplace: src.l, program: program, batchId: batchId, fileName: st.fileName, rawHeaders: (g.rawHeaders || st.headers).slice() }
    };
    rec.no = nextNo('sale', 'SL'); rec.createdAt = Date.now();
    db.sale.push(rec); saleIds.push(rec.id); saleNos.push(rec.no);
    g.items.forEach(function (it) { keys.push(mpDedupeKey(it)); qty += pf(it.qty); amount += pf(it.amount); });
    if (!dMin || g.date < dMin) dMin = g.date;
    if (!dMax || g.date > dMax) dMax = g.date;
  });
  amount = Math.round(amount * 100) / 100;
  const ok = (st.parsed || []).filter(function (r) { return !r.skip; });
  const skipped = (st.parsed || []).length - ok.length;
  if (!Array.isArray(db.saleImports)) db.saleImports = [];
  db.saleImports.unshift({
    id: batchId, at: new Date().toISOString(), marketplace: src.l,
    program: programs.length ? programs.join(' + ') : '',
    fileName: st.fileName,
    sheet: st.sheets && st.sheets[st.sheetIdx] ? st.sheets[st.sheetIdx].name : '',
    rowsTotal: (st.parsed || []).length, rowsImported: ok.length, rowsSkipped: skipped,
    rawHeaders: st.headers.slice(),
    saleIds: saleIds, keys: keys, qty: qty, amount: amount,
    period: dMin && dMax ? (dMin === dMax ? dMin : dMin + ' → ' + dMax) : ''
  });
  if (db.saleImports.length > 50) db.saleImports.length = 50;
  if (db.saleImports.length > 50) db.saleImports.length = 50;
  auditPush('Sale', 'Marketplace Import', saleNos.slice(0, 10).join(', ') + (saleNos.length > 10 ? ' +' + (saleNos.length - 10) : ''), [
    'Marketplace: ' + src.l + (programs.length ? ' · ' + programs.join('+') : ''), 'File: ' + st.fileName,
    'Rows imported: ' + ok.length + ' (skipped ' + skipped + ')',
    'Sale records created: ' + saleNos.length,
    'Qty: ' + qty + ' · Amount: ' + fmtINR(amount)
  ]);
  saveDB();
  MP_STATE = null; pageView = null; cur = 'sale';
  toast('Imported ' + fmtNum(ok.length) + ' rows into ' + saleNos.length + ' Sale record' + (saleNos.length === 1 ? '' : 's') + (programs.length ? ' (' + programs.join(', ') + ')' : '') + ' — ' + fmtINR(amount), 'green');
  render();
}

/* ---------- import history ---------- */
function mpHistoryHtml() {
  const list = db.saleImports || [];
  if (!list.length) {
    return '<div class="panel"><div class="empty"><div class="big">' + ic('inbox', 26) + '</div>' +
      '<h3>No marketplace imports yet</h3>' +
      '<p>Import a Myntra Seller Orders / SJIT report, Flipkart or another marketplace export — every import batch is listed here with the Sale records it created.</p>' +
      '<button class="btn btn-primary" onclick="mpShowImportView()">' + ic('plus', 16) + 'New Import</button></div></div>';
  }
  const rows = list.map(function (b) {
    const live = (b.saleIds || []).map(function (id) { return db.sale.find(function (s) { return s.id === id; }); }).filter(Boolean);
    const dt = b.at ? new Date(b.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const chips = live.slice(0, 4).map(function (s) {
      return '<button type="button" class="btn btn-ghost btn-sm" style="margin:2px 3px 2px 0" onclick="event.stopPropagation();openForm(\'sale\',\'' + s.id + '\')">' + esc(s.no) + (s.source && s.source.program ? ' · ' + esc(s.source.program) : '') + '</button>';
    }).join('') + (live.length > 4 ? '<span class="sub-line">+' + (live.length - 4) + ' more</span>' : '');
    return '<tr>' +
      '<td><b>' + esc(b.marketplace || '') + '</b>' + (b.program ? ' <span class="badge b-blue">' + esc(b.program) + '</span>' : '') + '<div class="sub-line">' + esc(dt) + '</div></td>' +
      '<td>' + esc(b.fileName || '—') + (b.sheet ? '<div class="sub-line">Sheet: ' + esc(b.sheet) + '</div>' : '') + (b.period ? '<div class="sub-line">Period: ' + esc(b.period) + '</div>' : '') + '</td>' +
      '<td class="num">' + fmtNum(b.rowsImported || 0) + '<div class="sub-line">of ' + fmtNum(b.rowsTotal || 0) + ' rows</div></td>' +
      '<td class="num">' + fmtNum(b.qty || 0) + '</td>' +
      '<td class="num"><b>' + fmtINR(b.amount || 0) + '</b></td>' +
      '<td>' + (live.length ? chips : '<span class="badge b-gray">Records deleted</span>') + '</td>' +
      '<td class="actions-cell no-print" onclick="event.stopPropagation()">' +
      '<button class="btn-icon" title="View imported data (all columns)" onclick="mpViewBatch(\'' + b.id + '\')">' + ic('view', 15) + '</button>' +
      '<button class="btn-icon danger" title="Delete batch and its Sale records" onclick="mpDeleteBatch(\'' + b.id + '\')">' + ic('trash', 15) + '</button>' +
      '</td></tr>';
  }).join('');
  return '<div class="panel list-panel"><div class="table-wrap"><table><thead><tr>' +
    '<th>Marketplace / Imported</th><th>File</th><th class="num">Rows</th><th class="num">Qty</th><th class="num">Amount</th><th>Sale records created</th><th class="num no-print">Actions</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function mpViewBatch(id) {
  const b = (db.saleImports || []).find(function (x) { return x.id === id; });
  if (!b) return;
  const recs = (b.saleIds || []).map(function (i) { return db.sale.find(function (s) { return s.id === i; }); }).filter(Boolean);
  if (!recs.length) return toast('The Sale records of this batch were deleted — the raw data went with them', 'red');
  const headers = (recs[0].source && recs[0].source.rawHeaders) || b.rawHeaders || [];
  const rows = [];
  recs.forEach(function (s) { (s.items || []).forEach(function (it) { if (it.raw) rows.push(it); }); });
  let body;
  if (!headers.length || !rows.length) {
    body = '<p class="sub-line">This batch was imported before full-column capture was added, so only the mapped fields are stored.</p>';
  } else {
    rows.sort(function (a, b2) { return (a.rowNo || 0) - (b2.rowNo || 0); });
    const MAX = 400, shown = rows.slice(0, MAX);
    body = '<div style="overflow:auto;max-height:62vh;border:1px solid var(--line);border-radius:10px"><table><thead><tr><th>#</th>' +
      headers.map(function (h) { return '<th style="white-space:nowrap">' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      shown.map(function (it, i) {
        return '<tr><td>' + (i + 1) + '</td>' + it.raw.map(function (v) { return '<td style="white-space:nowrap">' + esc(v == null || v === '' ? '' : v) + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      (rows.length > MAX ? '<div class="hint" style="margin-top:6px">Showing the first ' + MAX + ' of ' + fmtNum(rows.length) + ' rows — all rows are stored on the Sale records.</div>' : '');
  }
  openDialog({
    title: 'Imported data — ' + (b.fileName || 'report'),
    message: '<div class="sub-line" style="margin-bottom:8px">' + esc(b.marketplace || '') + (b.program ? ' · ' + esc(b.program) : '') +
      ' · ' + fmtNum(rows.length) + ' rows × ' + headers.length + ' columns — exactly as in the Excel file</div>' + body,
    confirmText: 'Close', hideCancel: true
  });
}

function mpDeleteBatch(id) {
  const b = (db.saleImports || []).find(function (x) { return x.id === id; });
  if (!b) return;
  openDialog({
    title: 'Delete import batch',
    message: 'Delete the <span class="dlg-strong">' + esc(b.fileName || 'import') + '</span> batch (' + esc(b.marketplace || '') + (b.program ? ' · ' + esc(b.program) : '') + ')?<br>This also deletes the <span class="dlg-strong">' + (b.saleIds || []).length + ' Sale record(s)</span> it created. This cannot be undone.',
    confirmText: 'Delete batch', danger: true,
    onConfirm: function () {
      const ids = b.saleIds || [];
      db.sale = db.sale.filter(function (s) { return ids.indexOf(s.id) < 0; });
      db.saleImports = (db.saleImports || []).filter(function (x) { return x.id !== id; });
      auditPush('Sale', 'Import Deleted', b.fileName || id, ['Marketplace: ' + (b.marketplace || ''), 'Sale records removed: ' + ids.length]);
      try { window.__SF_ALLOW_EMPTY_TABLES = ['sale']; } catch (e) { }
      saveDB(); toast('Import batch deleted along with its Sale records', 'green'); render();
    }
  });
}

/* ---------- sample report (for testing) ---------- */
function mpSampleXlsx(headers, rows, sheetName) {
  const files = {};
  files['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  files['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xesc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
  files['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  files['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303030"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>';
  files['xl/worksheets/sheet1.xml'] = xsheet(headers, rows, []);
  return xzip(files);
}
function mpDownloadSample() {
  const headers = ['order id fk', 'order line id', 'po_type', 'created on', 'style id', 'seller sku code', 'style name', 'brand', 'size', 'order status', 'delivered on', 'total mrp', 'discount', 'final amount'];
  const rows = [
    ['6008985479', '11374212590', 'SJIT', '2026-09-01 10:12:00.000', '39432272', 'KEN-SH-1001-BLK-M', 'KEN Cotton Casual Shirt Black', 'KEN', 'M', 'C', '2026-09-03 15:17:26.000', '1299', '400', '879'],
    ['6008985479', '11374212591', 'SJIT', '2026-09-01 10:12:00.000', '39432272', 'KEN-SH-1001-BLK-L', 'KEN Cotton Casual Shirt Black', 'KEN', 'L', 'C', '2026-09-03 15:17:26.000', '1299', '400', '879'],
    ['6008086339', '11372769147', 'PPMP', '2026-09-02 07:48:00.000', '40470072', 'SZT-MSHIRT-01FA-2XL', 'Sztori Men Plus Size Tartan Check Shirt', 'Sztori', '46', 'SH', '', '2349', '1721', '628'],
    ['6005478263', '11368353219', 'FBM', '2026-09-02 04:55:00.000', '40618559', 'RDS-WSHIRT-01K-XL', 'Roadster Cotton Button-Down Collar Shirts', 'Roadster', 'XL', 'C', '2026-09-05 13:16:12.000', '1799', '1371', '428'],
    ['6014043106', '11382615900', 'FBM', '2026-09-03 04:32:00.000', '41113280', 'RDS-WSHIRT-O1S-S', 'Roadster Striped Cotton Spread Collar Shirt', 'Roadster', 'S', 'RTO', '', '1799', '1349', '450'],
    ['6013135879', '11381160101', 'PPMP', '2026-09-04 15:10:00.000', '42852480', 'MNH-KURTA-3305-M', 'Mast & Harbour Kurta Set Maroon', 'Mast & Harbour', 'M', 'C', '2026-09-07 20:31:38.000', '2199', '700', '1479']
  ];
  downloadBytes(mpSampleXlsx(headers, rows, 'Seller Orders Report'), 'Myntra_Seller_Orders_Report_Sample.xlsx');
  toast('Sample Myntra Seller Orders report downloaded (SJIT + PPMP + FBM rows) — upload it back to test', 'green');
}

