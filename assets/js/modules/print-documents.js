/**
 * StitchFlow ERP — Printable Documents (PO, GRN, DC)
 * File: assets/js/modules/print-documents.js
 */

/* =====================================================================
   PURCHASE ORDER — printable document
   ===================================================================== */
const PRINT_CO = new Proxy({}, {
  get: function (_, key) {
    const c = db && db.masters && db.masters.companyDetails;
    return c && c[key] != null ? c[key] : DEFAULT_COMPANY_DETAILS[key];
  }
});
const PO_TERMS_PRINT = [
  'We have the right to reject any goods rejected by our QC, and the vendor will be solely responsible for the rejection.',
  'We reserve the right to reject goods found defective even at a later stage, and to recover the cost of material and any losses from the seller.',
  'Payment shall be made for the actual quantity received by us, and our records shall be final and conclusive on this point.',
  'We will be entitled to deduct discount as mentioned in the order.',
  'Any dispute arising with respect to this PO shall be subject to "' + PRINT_CO.jurisdiction + '" jurisdiction.',
  'You will allow our customers and quality personnel to visit your factory to verify the quality of material supplied and the quality-control system you follow.',
  'Excess of PO qty of +/- 2% is acceptable. Payment will be released for the lower of physically received qty and PO qty.',
  'Delivery address: as above.',
  'Goods will be inspected at your factory as per our quality requirements. Packing list, invoice and L.R. copy are required by email after dispatch.'
];
/* amount in words — Indian numbering */
function amountWords(n) {
  n = Math.round(pf(n));
  if (!n) return 'ZERO RUPEES ONLY';
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE',
    'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const two = function (x) { return x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : ''); };
  const three = function (x) { return (x >= 100 ? ones[Math.floor(x / 100)] + ' HUNDRED' + (x % 100 ? ' AND ' : '') : '') + (x % 100 ? two(x % 100) : ''); };
  let out = '';
  const cr = Math.floor(n / 10000000); n %= 10000000;
  const lk = Math.floor(n / 100000); n %= 100000;
  const th = Math.floor(n / 1000); n %= 1000;
  if (cr) out += three(cr) + ' CRORE ';
  if (lk) out += three(lk) + ' LAKH ';
  if (th) out += three(th) + ' THOUSAND ';
  if (n) out += three(n);
  return out.replace(/\s+/g, ' ').trim() + ' RUPEES ONLY';
}
function toTitleCaseWords(str) {
  return str.toLowerCase().split(/\s+/).map(function (w) {
    if (w === 'and') return 'And';
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ').replace(/\s+Rupees\s+Only/i, ' Only').replace(/Thousand\b/g, 'Thousands');
}
/* toolbar Print → the PO currently at the top of the filtered list */
function printFirstPO() {
  const rows = filtered('po');
  if (!rows.length) return toast('No purchase order to print', 'red');
  printPO(rows[0].id);
}
function printPO(id) {
  const r = db.po.find(function (x) { return x.id === id; });
  if (!r) return toast('Purchase order not found', 'red');

  const party = partyByName(r.supplier);
  const trade = partyTradeByName(r.supplier, r.supplierTrade);
  const shipParty = partyByName(r.shipTo);
  const shipTrade = supplierShipToRecord(r.supplier, r.shipTo);
  const firmTrade = null;

  const line = function (lbl, val) {
    return '<tr><td class="k">' + esc(lbl) + '</td><td class="c">:</td><td class="v">' + (val == null || val === '' ? '' : esc(val)) + '</td></tr>';
  };
  const addrBlock = function (title, nm, addr, gst, pan, st) {
    return '<div class="abox"><div class="atitle">' + title + '</div>' +
      '<div class="aname">' + esc(nm || '—') + '</div>' +
      (addr ? '<div class="aline">' + esc(addr) + '</div>' : '') +
      '<table class="akv">' + line('GST NO', gst) + line('PAN NO', pan) + line('STATE', st) + '</table></div>';
  };

  const items = r.items || [];
  let totQty = 0, totAmt = 0, totC = 0, totS = 0, totI = 0;
  const rows = items.map(function (i, idx) {
    const amt = pf(i.qty) * pf(i.rate);
    const c = pf(i.camt), s = pf(i.samt), g = pf(i.iamt);
    totQty += pf(i.qty); totAmt += amt; totC += c; totS += s; totI += g;
    return '<tr>' +
      '<td class="ctr">' + (idx + 1) + '</td>' +
      '<td>' + esc(i.classification || '') + '</td>' +
      '<td>' + esc(i.code || '') + '</td>' +
      '<td><b>' + esc(i.name || '') + '</b>' + (i.specs ? '<div class="sub">' + esc(i.specs) + '</div>' : '') + '</td>' +
      '<td>' + esc(i.hsn || '') + '</td>' +
      '<td class="rt">' + fmtNum(i.qty) + '</td>' +
      '<td>' + esc(i.unit || '') + '</td>' +
      '<td class="rt">' + fmtNum(pf(i.rate).toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(amt.toFixed(2)) + '</td>' +
      '</tr>';
  }).join('');

  /* HSN-wise tax summary */
  const hsnMap = {};
  items.forEach(function (i) {
    const k = i.hsn || '—';
    if (!hsnMap[k]) hsnMap[k] = { taxable: 0, cRate: pf(i.cgstPct), c: 0, sRate: pf(i.sgstPct), s: 0, iRate: pf(i.igstPct), i: 0 };
    hsnMap[k].taxable += pf(i.qty) * pf(i.rate);
    hsnMap[k].c += pf(i.camt); hsnMap[k].s += pf(i.samt); hsnMap[k].i += pf(i.iamt);
  });
  const hsnRows = Object.keys(hsnMap).map(function (k) {
    const x = hsnMap[k];
    return '<tr><td>' + esc(k) + '</td><td class="rt">' + fmtNum(x.taxable.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(x.cRate.toFixed(2)) + ' %</td><td class="rt">' + fmtNum(x.c.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(x.sRate.toFixed(2)) + ' %</td><td class="rt">' + fmtNum(x.s.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(x.iRate.toFixed(2)) + ' %</td><td class="rt">' + fmtNum(x.i.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum((x.c + x.s + x.i).toFixed(2)) + '</td></tr>';
  }).join('');

  const pnf = pnfValue(r.pnf);
  const afterTax = totAmt + totC + totS + totI + pnf;
  const grand = Math.round(afterTax);
  const roundOff = grand - afterTax;

  const supplierTradeName = (trade && (trade.tradeName || trade.name)) || r.supplierTrade || (party && (party.tradeName || party.shortName)) || (party ? (party.tradeName || party.shortName || party.legalName) : (r.supplier || '—'));
  const supplierAddr = trade ? [trade.address, trade.city, trade.state, trade.pin].filter(Boolean).join(', ')
    : (party ? [party.address, party.city, party.state, party.pin].filter(Boolean).join(', ') : '');
  const supplierGst = trade ? trade.gstNo : (party ? party.gstNo : '');
  const supplierState = trade ? trade.state : (party ? party.state : '');
  const shipReg = r.shipToRegistration || null;   // raw registration from parties.extra_json.registrations
    
    // Name
    const shipName =
      shipReg?.tradeName ||
      shipParty?.tradeName ||
      shipParty?.name ||
      r.shipTo ||                       // raw stored value as last resort
      PRINT_CO.name;
    
    // Address
    const regAddr = shipReg
      ? [
          shipReg.principalAddress ?? shipReg.address,
          shipReg.city,
          shipReg.placeState ?? shipReg.state,
          shipReg.pin ?? shipReg.pincode,
        ].filter(Boolean).join(', ')
      : '';
    
    const shipAddr = regAddr
      || (shipParty
          ? [shipParty.address, shipParty.city, shipParty.state, shipParty.pin].filter(Boolean).join(', ')
          : '')
      || PRINT_CO.works.replace(/^Works:\s*/i, '');
    
    // GST
    const shipGst =
      shipReg?.gstin ||
      shipReg?.gstNo ||
      shipParty?.gstNo ||
      PRINT_CO.gstNo;
    
    // State
    const shipState =
      shipReg?.placeState ||
      shipReg?.state ||
      shipParty?.state ||
      PRINT_CO.state;

  const doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Purchase Order ' + esc(r.no) + ' | ' + esc(PRINT_CO.name) + '</title><style>' +
    ':root{--ink:#172033;--muted:#667085;--line:#cfd6df;--soft:#f4f7fa;--brand:#173f67;--brand2:#eaf1f8}' +
    '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:var(--ink);margin:0;padding:14px;background:#e9edf2}' +
    '.bar{display:flex;gap:8px;justify-content:flex-end;max-width:960px;margin:0 auto 10px;position:sticky;top:8px;z-index:2}.bar button{font:inherit;font-weight:700;padding:8px 17px;border:1px solid #b7c0cb;border-radius:6px;background:#fff;cursor:pointer}.bar .p{background:var(--brand);color:#fff;border-color:var(--brand)}' +
    '.sheet{max-width:960px;margin:0 auto;background:#fff;box-shadow:0 3px 18px rgba(16,24,40,.14);border-top:7px solid var(--brand);padding:0 22px 16px}' +
    '.mast{display:grid;grid-template-columns:1fr 260px;gap:22px;padding:17px 0 13px;border-bottom:2px solid var(--brand)}.company h1{font-size:18px;letter-spacing:.3px;margin:0 0 5px;color:var(--brand)}.company p{margin:1px 0;line-height:1.35;color:#344054}.company .gst{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:4px;background:var(--brand2);font-weight:700}.pohead{text-align:right}.pohead .eyebrow{font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}.pohead h2{font-size:22px;letter-spacing:1px;margin:3px 0;color:var(--brand)}.pohead .pono{font-size:15px;font-weight:800}.status{display:inline-block;margin-top:5px;padding:3px 9px;border:1px solid #99a8b8;border-radius:12px;font-size:9px;font-weight:700;text-transform:uppercase}' +
    '.meta{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin:13px 0}.meta>div{padding:7px 9px;min-height:43px}.meta>div+div{border-left:1px solid var(--line)}.meta span,.label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.55px;color:var(--muted);margin-bottom:3px}.meta b{font-size:10.5px}' +
    '.parties{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:8px;margin-bottom:12px}.card{border:1px solid var(--line);border-radius:6px;overflow:hidden}.card h3{font-size:8.5px;text-transform:uppercase;letter-spacing:.7px;margin:0;padding:5px 8px;background:var(--brand2);color:var(--brand)}.card .body{padding:7px 9px;min-height:88px}.card b{font-size:10.5px}.card p{margin:3px 0;line-height:1.35;color:#344054}.mini{margin-top:5px;font-size:8.8px;line-height:1.45}.mini strong{color:var(--muted);font-weight:600}' +
    '.commercial{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}.term{border-left:3px solid #91a7bd;background:var(--soft);padding:6px 8px;min-height:42px}.term b{display:block;margin-top:2px}' +
    'table{border-collapse:collapse;width:100%}.items{margin-bottom:10px}.items th{background:var(--brand);color:#fff;font-size:8.5px;letter-spacing:.25px;padding:6px 5px;text-align:left;border:1px solid var(--brand)}.items td{border:1px solid var(--line);padding:6px 5px;vertical-align:top}.items tbody tr:nth-child(even){background:#fafbfd}.items .rt,.rt{text-align:right}.items .ctr,.ctr{text-align:center}.items .sub{font-size:8.5px;color:var(--muted);margin-top:2px}.tot td{font-weight:800;background:var(--brand2);border-color:#aab9c8}' +
    '.finance{display:grid;grid-template-columns:1.55fr .75fr;gap:10px;margin:10px 0}.taxbox,.totalbox{border:1px solid var(--line);border-radius:6px;overflow:hidden}.boxhead{padding:5px 8px;background:var(--soft);font-weight:800;text-transform:uppercase;font-size:8.5px;letter-spacing:.5px}.hsn th,.hsn td{border:1px solid var(--line);padding:4px;font-size:8.3px}.hsn th{background:#f8fafc}.sum td{padding:4px 8px}.sum .lbl{text-align:right;color:#475467}.sum .amt{text-align:right;width:95px;font-weight:700}.sum .grand td{background:var(--brand);color:#fff;font-size:12px;font-weight:800;padding:7px 8px}' +
    '.words{border:1px solid #aab9c8;background:var(--brand2);padding:6px 9px;border-radius:5px;font-size:9px;font-weight:700;margin-bottom:8px}.remark{padding:6px 9px;border-left:3px solid #d5a021;background:#fff9e8;margin-bottom:8px}' +
    '.terms{border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin-top:8px}.terms h4,.terms h2,.terms h3{margin:0 0 5px;font-size:10px;color:var(--brand)}.terms ol,.terms ul{columns:2;column-gap:26px;margin:0;padding-left:16px}.terms li{break-inside:avoid;margin-bottom:3px;line-height:1.3;font-size:8.5px}.terms p{margin:0 0 4px;font-size:8.5px}.terms a{color:inherit}' +
    '.sign{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:12px;border:1px solid var(--line);border-radius:6px;overflow:hidden}.sign>div{min-height:76px;padding:7px 9px;text-align:center}.sign>div+div{border-left:1px solid var(--line)}.sign b{font-size:9px}.sign span{display:block;height:42px;border-bottom:1px solid #98a2b3;margin-bottom:4px}.foot{text-align:center;color:var(--muted);font-size:8px;margin-top:9px;letter-spacing:.35px}' +
    '@page{size:A4 portrait;margin:7mm}@media print{body{padding:0;background:#fff}.bar{display:none}.sheet{max-width:none;box-shadow:none;padding:0 8mm 5mm;border-top-width:5px}.items tr,.finance,.sign,.card{break-inside:avoid}}' +
    '</style></head><body><div class="bar"><button class="p" onclick="window.print()">Print Purchase Order</button><button onclick="window.close()">Close</button></div><main class="sheet">' +
    '<header class="mast"><div class="company"><h1>' + esc(PRINT_CO.name) + '</h1><p>' + esc(PRINT_CO.reg) + '</p><p>' + esc(PRINT_CO.reg2) + '</p><p>' + esc(PRINT_CO.works) + '</p><p>' + esc(PRINT_CO.contact) + '</p><div class="gst">GSTIN: ' + esc(PRINT_CO.gstNo || 'Not configured') + ' &nbsp; | &nbsp; PAN: ' + esc(PRINT_CO.pan || '—') + ' &nbsp; | &nbsp; State: ' + esc(PRINT_CO.state || '') + ' (' + esc(PRINT_CO.stateCode || '') + ')</div></div>' +
    '<div class="pohead"><div class="eyebrow">Procurement Document</div><h2>PURCHASE ORDER</h2><div class="pono">' + esc(r.no || '') + '</div><div class="status">' + esc(r.status || 'Draft') + '</div></div></header>' +
    '<section class="meta"><div><span>PO Date</span><b>' + esc(dpToDisplay(r.date) || r.date || '—') + '</b></div><div><span>Delivery Date</span><b>' + esc(dpToDisplay(r.deliveryDate) || r.deliveryDate || '—') + '</b></div><div><span>Quotation / PI No.</span><b>' + esc(r.qtnNo || '—') + '</b></div><div><span>Quotation / PI Date</span><b>' + esc(dpToDisplay(r.qtnDate) || r.qtnDate || '—') + '</b></div></section>' +
    '<section class="parties"><div class="card"><h3>Supplier / Vendor</h3><div class="body"><b>' + esc(supplierTradeName) + '</b><p>' + esc(supplierAddr || 'Address not available') + '</p><div class="mini"><strong>GSTIN:</strong> ' + esc(supplierGst || '—') + '<br><strong>State:</strong> ' + esc(supplierState || '—') + '</div></div></div>' +
    '<div class="card"><h3>Bill To</h3><div class="body"><b>' + esc(PRINT_CO.name) + '</b><p>' + esc(PRINT_CO.works.replace(/^Works:\s*/i, '')) + '</p><div class="mini"><strong>GSTIN:</strong> ' + esc(PRINT_CO.gstNo || '—') + '<br><strong>PAN:</strong> ' + esc(PRINT_CO.pan || '—') + '<br><strong>State:</strong> ' + esc(PRINT_CO.state || '—') + '</div></div></div>' +
    '<div class="card"><h3>Ship To / Delivery Address</h3><div class="body"><b>' + esc(shipName) + '</b><p>' + esc(shipAddr || 'Address not available') + '</p><div class="mini"><strong>GSTIN:</strong> ' + esc(shipGst || '—') + '<br><strong>State:</strong> ' + esc(shipState || '—') + '</div></div></div></section>' +
    '<section class="commercial"><div class="term"><span class="label">Payment Terms</span><b>' + esc(r.payTerms || '—') + '</b></div><div class="term"><span class="label">Freight Charges</span><b>' + esc(r.freightCharges || '—') + '</b></div><div class="term"><span class="label">Transport Mode</span><b>' + esc(r.transportMode || '—') + '</b></div><div class="term"><span class="label">Raised For</span><b>' + esc(r.raisedFor || '—') + '</b></div><div class="term"><span class="label">Transit Insurance</span><b>' + esc(r.transitInsurance || '—') + '</b></div><div class="term"><span class="label">P &amp; F</span><b>' + esc((r.pnf === '' || r.pnf == null) ? 'Nil' : r.pnf) + '</b></div><div class="term"><span class="label">GST Type</span><b>' + esc(r.gstType || '—') + '</b></div><div class="term"><span class="label">Currency</span><b>INR (₹)</b></div></section>' +
    '<table class="items"><thead><tr><th class="ctr" style="width:32px">#</th><th>Classification</th><th>Item Code</th><th>Product / Specification</th><th>HSN</th><th class="rt">Qty</th><th>UOM</th><th class="rt">Rate (₹)</th><th class="rt">Amount (₹)</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr class="tot"><td colspan="5">Item Total</td><td class="rt">' + fmtNum(totQty) + '</td><td></td><td></td><td class="rt">' + fmtNum(totAmt.toFixed(2)) + '</td></tr></tfoot></table>' +
    '<section class="finance"><div class="taxbox"><div class="boxhead">HSN-wise Tax Summary</div><table class="hsn"><thead><tr><th rowspan="2">HSN</th><th rowspan="2">Taxable</th><th colspan="2">CGST</th><th colspan="2">SGST</th><th colspan="2">IGST</th><th rowspan="2">Tax</th></tr><tr><th>%</th><th>Amt</th><th>%</th><th>Amt</th><th>%</th><th>Amt</th></tr></thead><tbody>' + hsnRows + '</tbody><tfoot><tr class="tot"><td>Total</td><td class="rt">' + fmtNum(totAmt.toFixed(2)) + '</td><td></td><td class="rt">' + fmtNum(totC.toFixed(2)) + '</td><td></td><td class="rt">' + fmtNum(totS.toFixed(2)) + '</td><td></td><td class="rt">' + fmtNum(totI.toFixed(2)) + '</td><td class="rt">' + fmtNum((totC + totS + totI).toFixed(2)) + '</td></tr></tfoot></table></div>' +
    '<div class="totalbox"><div class="boxhead">Order Value</div><table class="sum"><tr><td class="lbl">Taxable Value</td><td class="amt">' + fmtNum(totAmt.toFixed(2)) + '</td></tr><tr><td class="lbl">CGST</td><td class="amt">' + fmtNum(totC.toFixed(2)) + '</td></tr><tr><td class="lbl">SGST</td><td class="amt">' + fmtNum(totS.toFixed(2)) + '</td></tr><tr><td class="lbl">IGST</td><td class="amt">' + fmtNum(totI.toFixed(2)) + '</td></tr>' + (pnf ? '<tr><td class="lbl">P &amp; F</td><td class="amt">' + fmtNum(pnf.toFixed(2)) + '</td></tr>' : '') + '<tr><td class="lbl">Round Off</td><td class="amt">' + fmtNum(roundOff.toFixed(2)) + '</td></tr><tr class="grand"><td>Grand Total</td><td class="rt">₹' + fmtNum(grand.toFixed(2)) + '</td></tr></table></div></section>' +
    '<div class="words">Amount in words: ' + esc(amountWords(grand)) + '</div>' +
    (r.narration ? '<div class="remark"><b>Remarks:</b> ' + esc(r.narration) + '</div>' : '') +
    poTermsPrintHtml(r) +
    '<section class="sign"><div><b>Prepared / Checked By</b><span></span>Name &amp; Signature</div><div><b>Supplier Acceptance</b><span></span>Stamp &amp; Signature</div><div><b>For ' + esc(PRINT_CO.name) + '</b><span></span>Authorized Signatory</div></section>' +
    '<div class="foot">SYSTEM-GENERATED PURCHASE ORDER · SUBJECT TO ' + esc(PRINT_CO.jurisdiction.toUpperCase()) + ' JURISDICTION</div></main></body></html>';

  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print the purchase order', 'red');
  w.document.write(doc);
  w.document.close();
}

/* =====================================================================
   GOODS RECEIPT NOTE (GRN / INWARD) — printable document
   ===================================================================== */
function printFirstInward() {
  const rows = filtered('inward');
  if (!rows.length) return toast('No inward record to print', 'red');
  printInward(rows[0].id);
}

function printInward(id) {
  const r = (db.inward || []).find(function (x) { return x.id === id || x.no === id; });
  if (!r) return toast('Inward record not found', 'red');

  const po = r.poRef ? (db.po || []).find(function (p) { return p.no === r.poRef || p.id === r.poRef; }) : null;
  const party = partyByName(r.supplier);
  const trade = partyTradeByName(r.supplier, r.supplierTrade);
  const supplierTradeName = (trade && (trade.tradeName || trade.name)) || r.supplierTrade || (party && (party.tradeName || party.shortName)) || (party ? (party.tradeName || party.shortName || party.legalName) : (r.supplier || '—'));
  const supplierAddr = trade ? [trade.address, trade.city, trade.state, trade.pin].filter(Boolean).join(', ')
    : (party ? [party.address, party.city, party.state, party.pin].filter(Boolean).join(', ') : '');
  const supplierGst = trade ? (trade.gstNo || '') : (party ? (party.gstNo || '') : '');
  const supplierPan = trade ? (trade.pan || '') : (party ? (party.pan || '') : '');
  const supplierState = trade ? (trade.state || '') : (party ? (party.state || '') : '');

  const buyerName = (po && (po.buyer || po.raisedFor)) || r.buyer || (r.items && r.items[0] && r.items[0].buyer) || '—';
  const displayDocNo = r.grn ? (r.grn + (r.no && r.no !== r.grn ? ' (' + r.no + ')' : '')) : (r.no || '—');
  const poNo = r.poRef || (r.jwRef ? ('JW: ' + r.jwRef) : '—');
  const invoiceNo = r.invoiceNo || r.challan || '—';
  const invoiceDate = dpToDisplay(r.invoiceDate) || r.invoiceDate || '—';
  const inwardDate = dpToDisplay(r.date) || r.date || '—';

  const coWorks = (PRINT_CO.works || '').replace(/^Works:\s*/i, '');
  const shipParty = po ? partyByName(po.shipTo) : null;
  const shipTrade = po ? supplierShipToRecord(po.supplier, po.shipTo) : null;
  const shipName = shipTrade ? (shipTrade.tradeName || shipTrade.name) : (shipParty ? (shipParty.legalName || shipParty.shortName) : (r.warehouse ? (PRINT_CO.name + ' — ' + r.warehouse) : (po && po.shipTo ? po.shipTo : PRINT_CO.name)));
  const shipAddr = shipTrade ? [shipTrade.address, shipTrade.city, shipTrade.state].filter(Boolean).join(', ')
    : (shipParty ? [shipParty.address, shipParty.city, shipParty.state, shipParty.pin].filter(Boolean).join(', ')
      : (coWorks || PRINT_CO.reg));
  const shipGst = shipTrade ? (shipTrade.gstNo || PRINT_CO.gstNo) : (shipParty ? (shipParty.gstNo || PRINT_CO.gstNo) : PRINT_CO.gstNo);
  const shipState = shipTrade ? (shipTrade.state || PRINT_CO.state) : (shipParty ? (shipParty.state || PRINT_CO.state) : PRINT_CO.state);

  const isInterState = supplierState && PRINT_CO.state && supplierState.toLowerCase().trim() !== PRINT_CO.state.toLowerCase().trim();

  let totQty = 0, totAmt = 0, totC = 0, totS = 0, totI = 0;
  const items = r.items || [];
  const hsnMap = {};

  const rows = items.map(function (it, idx) {
    const rawItemName = String(it.name || '').trim();
    const leadingCode = /^(?:\(|\[)?([A-Za-z]{2,}-\d+)(?:\)|\])?\s*(.*)$/.exec(rawItemName);
    const lookupName = leadingCode ? leadingCode[2].trim() : bareItemName(rawItemName);
    const poItem = (po && po.items) ? po.items.find(function (pi) { return pi.name === it.name || bareItemName(pi.name) === lookupName || (it.code && pi.code === it.code); }) : null;
    const im = itemByName(lookupName) || itemByName(rawItemName);
    const itemCode = it.code || (leadingCode && leadingCode[1]) || (im && im.code) || (poItem && poItem.code) || it.item_id || '—';
    const hsn = it.hsn || (im && im.hsn) || (poItem && poItem.hsn) || '—';
    const itemName = (leadingCode ? leadingCode[2].trim() : bareItemName(rawItemName)) || rawItemName;
    const specs = it.specs || (poItem && poItem.specs) || '';
    const qty = pf(it.recQty != null ? it.recQty : it.qty);
    const uom = it.unit || (im && im.unit) || (poItem && poItem.unit) || '—';
    const rate = pf(it.poRate != null ? it.poRate : (it.rate != null ? it.rate : ((poItem && poItem.rate) || (im && im.purchaseRate) || 0)));
    const amt = qty * rate;

    let cRate = 0, sRate = 0, iRate = 0;
    if (poItem && (pf(poItem.igstPct) > 0 || pf(poItem.cgstPct) > 0 || pf(poItem.sgstPct) > 0)) {
      iRate = pf(poItem.igstPct);
      cRate = pf(poItem.cgstPct);
      sRate = pf(poItem.sgstPct);
    } else {
      const baseTax = pf(it.gst || (im && im.gst) || (poItem && poItem.gst) || 5);
      if (isInterState) iRate = baseTax;
      else { cRate = baseTax / 2; sRate = baseTax / 2; }
    }

    const camt = amt * (cRate / 100);
    const samt = amt * (sRate / 100);
    const iamt = amt * (iRate / 100);

    totQty += qty; totAmt += amt; totC += camt; totS += samt; totI += iamt;

    const k = hsn || '—';
    if (!hsnMap[k]) hsnMap[k] = { taxable: 0, cRate: cRate, c: 0, sRate: sRate, s: 0, iRate: iRate, i: 0 };
    hsnMap[k].taxable += amt;
    hsnMap[k].c += camt;
    hsnMap[k].s += samt;
    hsnMap[k].i += iamt;

    return '<tr>' +
      '<td class="ctr">' + (idx + 1) + '</td>' +
      '<td>' + esc(it.classification || (im && im.classification) || (poItem && poItem.classification) || '') + '</td>' +
      '<td>' + esc(itemCode) + '</td>' +
      '<td><b>' + esc(itemName) + '</b>' + (specs ? '<div class="sub">' + esc(specs) + '</div>' : '') + '</td>' +
      '<td>' + esc(hsn) + '</td>' +
      '<td class="rt">' + fmtNum(qty) + '</td>' +
      '<td>' + esc(uom) + '</td>' +
      '<td class="rt">' + fmtNum(rate.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(amt.toFixed(2)) + '</td>' +
      '</tr>';
  }).join('');

  // Handle Freight if present
  const freightVal = pf(r.freight);
  const freightGstRate = pf(r.freightGst);
  let freightC = 0, freightS = 0, freightI = 0;
  if (freightVal > 0) {
    if (isInterState) {
      freightI = freightVal * (freightGstRate / 100);
    } else {
      freightC = freightVal * ((freightGstRate / 2) / 100);
      freightS = freightVal * ((freightGstRate / 2) / 100);
    }
    const fk = r.freightHsn || '9965';
    if (!hsnMap[fk]) hsnMap[fk] = { taxable: 0, cRate: isInterState ? 0 : freightGstRate / 2, c: 0, sRate: isInterState ? 0 : freightGstRate / 2, s: 0, iRate: isInterState ? freightGstRate : 0, i: 0 };
    hsnMap[fk].taxable += freightVal;
    hsnMap[fk].c += freightC;
    hsnMap[fk].s += freightS;
    hsnMap[fk].i += freightI;
    totC += freightC;
    totS += freightS;
    totI += freightI;
  }

  const totTaxable = totAmt + freightVal;
  const hsnRows = Object.keys(hsnMap).map(function (k) {
    const x = hsnMap[k];
    return '<tr><td>' + esc(k) + '</td><td class="rt">' + fmtNum(x.taxable.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(x.cRate.toFixed(2)) + ' %</td><td class="rt">' + fmtNum(x.c.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(x.sRate.toFixed(2)) + ' %</td><td class="rt">' + fmtNum(x.s.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum(x.iRate.toFixed(2)) + ' %</td><td class="rt">' + fmtNum(x.i.toFixed(2)) + '</td>' +
      '<td class="rt">' + fmtNum((x.c + x.s + x.i).toFixed(2)) + '</td></tr>';
  }).join('');

  const afterTax = totTaxable + totC + totS + totI;
  const grand = Math.round(afterTax);
  const roundOff = grand - afterTax;

  let classification = '';
  if (items && items.length) classification = items[0].classification || '';
  if (!classification && r.warehouse) {
    if (/trim/i.test(r.warehouse)) classification = 'Trims';
    else if (/fabric/i.test(r.warehouse)) classification = 'Fabric';
  }
  const grnTitle = 'GOODS RECEIPT NOTE' + (classification ? ' - ' + classification.toUpperCase() : '');

  const doc = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>' + esc(grnTitle) + ' ' + esc(r.no) + ' | ' + esc(PRINT_CO.name) + '</title>' +
    '<style>' +
    ':root{--ink:#172033;--muted:#667085;--line:#cfd6df;--soft:#f4f7fa;--brand:#173f67;--brand2:#eaf1f8}' +
    '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:var(--ink);margin:0;padding:14px;background:#e9edf2}' +
    '.bar{display:flex;gap:8px;justify-content:flex-end;max-width:960px;margin:0 auto 10px;position:sticky;top:8px;z-index:2}' +
    '.bar button{font:inherit;font-weight:700;padding:8px 17px;border:1px solid #b7c0cb;border-radius:6px;background:#fff;cursor:pointer}' +
    '.bar .p{background:var(--brand);color:#fff;border-color:var(--brand)}' +
    '.sheet{max-width:960px;margin:0 auto;background:#fff;box-shadow:0 3px 18px rgba(16,24,40,.14);border-top:7px solid var(--brand);padding:0 22px 16px}' +
    '.mast{display:grid;grid-template-columns:1fr 280px;gap:22px;padding:17px 0 13px;border-bottom:2px solid var(--brand)}' +
    '.company h1{font-size:18px;letter-spacing:.3px;margin:0 0 5px;color:var(--brand)}' +
    '.company p{margin:1px 0;line-height:1.35;color:#344054}' +
    '.company .gst{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:4px;background:var(--brand2);font-weight:700}' +
    '.pohead{text-align:right}' +
    '.pohead .eyebrow{font-size:9px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}' +
    '.pohead h2{font-size:22px;letter-spacing:1px;margin:3px 0;color:var(--brand)}' +
    '.pohead .pono{font-size:15px;font-weight:800}' +
    '.status{display:inline-block;margin-top:5px;padding:3px 9px;border:1px solid #99a8b8;border-radius:12px;font-size:9px;font-weight:700;text-transform:uppercase}' +
    '.meta{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin:13px 0}' +
    '.meta>div{padding:7px 9px;min-height:43px}' +
    '.meta>div+div{border-left:1px solid var(--line)}' +
    '.meta span,.label{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.55px;color:var(--muted);margin-bottom:3px}' +
    '.meta b{font-size:10.5px}' +
    '.parties{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:8px;margin-bottom:12px}' +
    '.card{border:1px solid var(--line);border-radius:6px;overflow:hidden}' +
    '.card h3{font-size:8.5px;text-transform:uppercase;letter-spacing:.7px;margin:0;padding:5px 8px;background:var(--brand2);color:var(--brand)}' +
    '.card .body{padding:7px 9px;min-height:88px}' +
    '.card b{font-size:10.5px}' +
    '.card p{margin:3px 0;line-height:1.35;color:#344054}' +
    '.mini{margin-top:5px;font-size:8.8px;line-height:1.45}' +
    '.mini strong{color:var(--muted);font-weight:600}' +
    '.commercial{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}' +
    '.term{border-left:3px solid #91a7bd;background:var(--soft);padding:6px 8px;min-height:42px}' +
    '.term b{display:block;margin-top:2px}' +
    'table{border-collapse:collapse;width:100%}' +
    '.items{margin-bottom:10px}' +
    '.items th{background:var(--brand);color:#fff;font-size:8.5px;letter-spacing:.25px;padding:6px 5px;text-align:left;border:1px solid var(--brand)}' +
    '.items td{border:1px solid var(--line);padding:6px 5px;vertical-align:top}' +
    '.items tbody tr:nth-child(even){background:#fafbfd}' +
    '.items .rt,.rt{text-align:right}' +
    '.items .ctr,.ctr{text-align:center}' +
    '.items .sub{font-size:8.5px;color:var(--muted);margin-top:2px}' +
    '.tot td{font-weight:800;background:var(--brand2);border-color:#aab9c8}' +
    '.finance{display:grid;grid-template-columns:1.55fr .75fr;gap:10px;margin:10px 0}' +
    '.taxbox,.totalbox{border:1px solid var(--line);border-radius:6px;overflow:hidden}' +
    '.boxhead{padding:5px 8px;background:var(--soft);font-weight:800;text-transform:uppercase;font-size:8.5px;letter-spacing:.5px}' +
    '.hsn th,.hsn td{border:1px solid var(--line);padding:4px;font-size:8.3px}' +
    '.hsn th{background:#f8fafc}' +
    '.sum td{padding:4px 8px}' +
    '.sum .lbl{text-align:right;color:#475467}' +
    '.sum .amt{text-align:right;width:95px;font-weight:700}' +
    '.sum .grand td{background:var(--brand);color:#fff;font-size:12px;font-weight:800;padding:7px 8px}' +
    '.words{border:1px solid #aab9c8;background:var(--brand2);padding:6px 9px;border-radius:5px;font-size:9px;font-weight:700;margin-bottom:8px}' +
    '.remark{padding:6px 9px;border-left:3px solid #d5a021;background:#fff9e8;margin-bottom:8px}' +
    '.terms{border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin-top:8px}' +
    '.terms h4,.terms h2,.terms h3{margin:0 0 5px;font-size:10px;color:var(--brand)}' +
    '.terms ol,.terms ul{columns:2;column-gap:26px;margin:0;padding-left:16px}' +
    '.terms li{break-inside:avoid;margin-bottom:3px;line-height:1.3;font-size:8.5px}' +
    '.terms p{margin:0 0 4px;font-size:8.5px}' +
    '.sign{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:12px;border:1px solid var(--line);border-radius:6px;overflow:hidden}' +
    '.sign>div{min-height:76px;padding:7px 9px;text-align:center}' +
    '.sign>div+div{border-left:1px solid var(--line)}' +
    '.sign b{font-size:9px}' +
    '.sign span{display:block;height:42px;border-bottom:1px solid #98a2b3;margin-bottom:4px}' +
    '.foot{text-align:center;color:var(--muted);font-size:8px;margin-top:9px;letter-spacing:.35px}' +
    '@page{size:A4 portrait;margin:7mm}' +
    '@media print{body{padding:0;background:#fff}.bar{display:none}.sheet{max-width:none;box-shadow:none;padding:0 8mm 5mm;border-top-width:5px}.items tr,.finance,.sign,.card{break-inside:avoid}}' +
    '</style></head><body>' +
    '<div class="bar"><button class="p" onclick="window.print()">Print Goods Receipt Note</button><button onclick="window.close()">Close</button></div>' +
    '<main class="sheet">' +
    '<header class="mast">' +
    '<div class="company">' +
    '<h1>' + esc(PRINT_CO.name) + '</h1>' +
    '<p>' + esc(PRINT_CO.reg) + '</p>' +
    '<p>' + esc(PRINT_CO.reg2) + '</p>' +
    '<p>' + esc(PRINT_CO.works) + '</p>' +
    '<p>' + esc(PRINT_CO.contact) + '</p>' +
    '<div class="gst">GSTIN: ' + esc(PRINT_CO.gstNo || 'Not configured') + ' &nbsp; | &nbsp; State: ' + esc(PRINT_CO.state || '') + ' (' + esc(PRINT_CO.stateCode || '') + ')</div>' +
    '</div>' +
    '<div class="pohead">' +
    '<div class="eyebrow">Receipt Document</div>' +
    '<h2>GOODS RECEIPT NOTE</h2>' +
    '<div class="pono">' + esc(displayDocNo) + '</div>' +
    '<div class="status">' + esc(r.status || 'Received') + '</div>' +
    '</div>' +
    '</header>' +
    '<section class="meta">' +
    '<div><span>Inward / GRN Date</span><b>' + esc(inwardDate) + '</b></div>' +
    '<div><span>PO Number</span><b>' + esc(poNo) + '</b></div>' +
    '<div><span>Invoice / Challan No.</span><b>' + esc(invoiceNo) + '</b></div>' +
    '<div><span>Invoice / Challan Date</span><b>' + esc(invoiceDate) + '</b></div>' +
    '</section>' +
    '<section class="parties">' +
    '<div class="card"><h3>Supplier / Vendor</h3><div class="body"><b>' + esc(supplierTradeName) + '</b><p>' + esc(supplierAddr || 'Address not available') + '</p><div class="mini"><strong>GSTIN:</strong> ' + esc(supplierGst || '—') + '<br><strong>State:</strong> ' + esc(supplierState || '—') + '</div></div></div>' +
    '<div class="card"><h3>Bill To</h3><div class="body"><b>' + esc(PRINT_CO.name) + '</b><p>' + esc(coWorks) + '</p><div class="mini"><strong>GSTIN:</strong> ' + esc(PRINT_CO.gstNo || '—') + '<br><strong>State:</strong> ' + esc(PRINT_CO.state || '—') + '</div></div></div>' +
    '<div class="card"><h3>Ship To / Delivery Address</h3><div class="body"><b>' + esc(shipName) + '</b><p>' + esc(shipAddr || 'Address not available') + '</p><div class="mini"><strong>GSTIN:</strong> ' + esc(shipGst || '—') + '<br><strong>State:</strong> ' + esc(shipState || '—') + '</div></div></div>' +
    '</section>' +
    '<section class="commercial">' +
    '<div class="term"><span class="label">Warehouse / Store</span><b>' + esc(r.warehouse || '—') + '</b></div>' +
    '<div class="term"><span class="label">Vehicle No.</span><b>' + esc(r.vehicle || '—') + '</b></div>' +
    '<div class="term"><span class="label">Received By</span><b>' + esc(r.receivedBy || '—') + '</b></div>' +
    '<div class="term"><span class="label">Entry Type</span><b>' + esc(r.entryType || '—') + '</b></div>' +
    '<div class="term"><span class="label">Bin / Rack Location</span><b>' + esc(r.bin || '—') + '</b></div>' +
    '<div class="term"><span class="label">Buyer / Style Ref</span><b>' + esc(buyerName) + '</b></div>' +
    '<div class="term"><span class="label">GST Type</span><b>' + esc(r.gstType || (isInterState ? 'IGST' : 'CGST & SGST')) + '</b></div>' +
    '<div class="term"><span class="label">Currency</span><b>INR (₹)</b></div>' +
    '</section>' +
    '<table class="items"><thead><tr><th class="ctr" style="width:32px">#</th><th>Classification</th><th>Item Code</th><th>Product / Specification</th><th>HSN</th><th class="rt">Qty</th><th>UOM</th><th class="rt">Rate (₹)</th><th class="rt">Amount (₹)</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr class="tot"><td colspan="5">Item Total</td><td class="rt">' + fmtNum(totQty) + '</td><td></td><td></td><td class="rt">' + fmtNum(totAmt.toFixed(2)) + '</td></tr></tfoot></table>' +
    '<section class="finance"><div class="taxbox"><div class="boxhead">HSN-wise Tax Summary</div><table class="hsn"><thead><tr><th rowspan="2">HSN</th><th rowspan="2">Taxable</th><th colspan="2">CGST</th><th colspan="2">SGST</th><th colspan="2">IGST</th><th rowspan="2">Tax</th></tr><tr><th>%</th><th>Amt</th><th>%</th><th>Amt</th><th>%</th><th>Amt</th></tr></thead><tbody>' + hsnRows + '</tbody><tfoot><tr class="tot"><td>Total</td><td class="rt">' + fmtNum(totTaxable.toFixed(2)) + '</td><td></td><td class="rt">' + fmtNum(totC.toFixed(2)) + '</td><td></td><td class="rt">' + fmtNum(totS.toFixed(2)) + '</td><td></td><td class="rt">' + fmtNum(totI.toFixed(2)) + '</td><td class="rt">' + fmtNum((totC + totS + totI).toFixed(2)) + '</td></tr></tfoot></table></div>' +
    '<div class="totalbox"><div class="boxhead">Order Value</div><table class="sum"><tr><td class="lbl">Taxable Value</td><td class="amt">' + fmtNum(totAmt.toFixed(2)) + '</td></tr>' + (freightVal ? '<tr><td class="lbl">Freight Charges</td><td class="amt">' + fmtNum(freightVal.toFixed(2)) + '</td></tr>' : '') + '<tr><td class="lbl">CGST</td><td class="amt">' + fmtNum(totC.toFixed(2)) + '</td></tr><tr><td class="lbl">SGST</td><td class="amt">' + fmtNum(totS.toFixed(2)) + '</td></tr><tr><td class="lbl">IGST</td><td class="amt">' + fmtNum(totI.toFixed(2)) + '</td></tr><tr><td class="lbl">Round Off</td><td class="amt">' + fmtNum(roundOff.toFixed(2)) + '</td></tr><tr class="grand"><td>Grand Total</td><td class="rt">₹' + fmtNum(grand.toFixed(2)) + '</td></tr></table></div></section>' +
    '<div class="words">Amount in words: ' + esc(amountWords(grand)) + '</div>' +
    (r.openingRemark || r.remarks || r.narration || r.notes ? '<div class="remark"><b>Remarks:</b> ' + esc(r.openingRemark || r.remarks || r.narration || r.notes) + '</div>' : '') +
    '<section class="terms"><h4>AGREED TERMS &amp; CONDITIONS</h4><ol>' +
    '<li>Goods which are rejected by our QC will be returned to the seller at their sole responsibility.</li>' +
    '<li>We reserve the right to reject defective goods even at a later stage and recover the cost of material and losses, if any.</li>' +
    '<li>Payment shall be made for the actual accepted quantity received by us and our records shall be final and conclusive on this point.</li>' +
    '<li>We shall be entitled to deduct discount and debit notes for discrepancies as mentioned in the order.</li>' +
    '<li>Any dispute arising with respect to this Goods Receipt Note shall be subject to ' + esc(PRINT_CO.jurisdiction) + ' jurisdiction.</li>' +
    '</ol></section>' +
    '<section class="sign">' +
    '<div><b>Prepared / Checked By</b><span></span>Name &amp; Signature</div>' +
    '<div><b>Store / Received By</b><span></span>Name &amp; Signature</div>' +
    '<div><b>For ' + esc(PRINT_CO.name) + '</b><span></span>Authorized Signatory</div>' +
    '</section>' +
    '<div class="foot">SYSTEM-GENERATED GOODS RECEIPT NOTE · SUBJECT TO ' + esc(PRINT_CO.jurisdiction.toUpperCase()) + ' JURISDICTION</div></main></body></html>';

  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print the Goods Receipt Note', 'red');
  w.document.write(doc);
  w.document.close();
}



/* =====================================================================
   JOB WORK DELIVERY CHALLAN — one printable document per DC number
   ===================================================================== */
function dcGroupsForJobWork(rec, mod) {
  const map = {};
  mod = mod || 'jobwork';
  function add(line, section) {
    line = line || {};
    if (!String(line.item || '').trim()) return;
    const qty = pf(line.actualQty != null && line.actualQty !== '' ? line.actualQty : line.qty);
    if (qty <= 0) return;
    const date = String(line.date || '').trim();
    const dc = String(line.dcNo || '').trim() || ('Unnumbered · ' + (dpToDisplay(date) || date || 'No date'));
    if (!map[dc]) map[dc] = { dcNo: dc, date: date, issues: [], extras: [], pod: false, podName: '' };
    const g = map[dc];
    if (!g.date && date) g.date = date;
    g[section].push(line);
    if (line.pod) { g.pod = true; if (!g.podName) g.podName = line.podName || 'POD uploaded'; }
  }
  (rec.issues || []).forEach(function (x) { add(x, 'issues'); });
  (rec.extras || []).forEach(function (x) { add(x, mod === 'sample' ? 'issues' : 'extras'); });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
    /* Latest issue date / highest DC appears first on the print-selection page. */
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return b.dcNo.localeCompare(a.dcNo, undefined, { numeric: true, sensitivity: 'base' });
  });
}
function openDCPrint(jobId, mod) {
  mod = mod || 'jobwork';
  const rec = (db[mod] || []).find(function (x) { return x.id === jobId; });
  if (!rec) return toast((mod === 'sample' ? 'Sample' : 'Job Work') + ' not found', 'red');
  const groups = dcGroupsForJobWork(rec, mod);
  if (!groups.length) return toast('No issued material is available to print', 'red');
  pageView = { kind: 'dcprint', jobId: jobId, dcMod: mod };
  render();
}
function closeDCPrintPage() {
  const id = pageView && pageView.jobId;
  const mod = (pageView && pageView.dcMod) || 'jobwork';
  pageView = { kind: 'form', m: mod, id: id };
  render();
}
function dcSelection() {
  return qsa('#dc-print-list input[data-dc-check]:checked').map(function (x) { return x.value; });
}
function dcToggleAll(on) {
  qsa('#dc-print-list input[data-dc-check]').forEach(function (x) { x.checked = !!on; });
  const n = $('dc-selected-count'); if (n) n.textContent = dcSelection().length + ' selected';
}
function dcSelectionChanged() {
  const all = qsa('#dc-print-list input[data-dc-check]');
  const sel = dcSelection();
  const master = $('dc-check-all');
  if (master) { master.checked = all.length > 0 && sel.length === all.length; master.indeterminate = sel.length > 0 && sel.length < all.length; }
  const n = $('dc-selected-count'); if (n) n.textContent = sel.length + ' selected';
}
function printSelectedDCs(jobId, mod) {
  const selected = dcSelection();
  if (!selected.length) return toast('Select at least one DC to print', 'red');
  printJobWorkDCs(jobId, selected, mod || 'jobwork');
}
function printAllDCs(jobId, mod) {
  mod = mod || 'jobwork';
  const rec = (db[mod] || []).find(function (x) { return x.id === jobId; });
  if (!rec) return;
  printJobWorkDCs(jobId, dcGroupsForJobWork(rec, mod).map(function (g) { return g.dcNo; }), mod);
}
function printSelectedGSTDCs(jobId) {
  const selected = dcSelection();
  if (!selected.length) return toast('Select at least one DC for GST / E-Way print', 'red');
  printJobWorkGSTDCs(jobId, selected);
}
function printAllGSTDCs(jobId) {
  const rec = (db.jobwork || []).find(function (x) { return x.id === jobId; });
  if (!rec) return;
  printJobWorkGSTDCs(jobId, dcGroupsForJobWork(rec, 'jobwork').map(function (g) { return g.dcNo; }));
}
function printJobWorkGSTDC(jobId, dcNo) { printJobWorkGSTDCs(jobId, [dcNo]); }
function renderDCPrintPage() {
  const jobId = pageView && pageView.jobId;
  const mod = (pageView && pageView.dcMod) || 'jobwork';
  const isSample = mod === 'sample';
  const rec = (db[mod] || []).find(function (x) { return x.id === jobId; });
  if (!rec) { pageView = null; render(); return; }
  const groups = dcGroupsForJobWork(rec, mod);
  $('tb-title').textContent = isSample ? 'Print Sample Delivery Challans' : 'Print Delivery Challans';
  $('tb-sub').textContent = (rec.no || (isSample ? 'Sample' : 'Job Work')) + ' · ' + (rec.vendor || '') + ' · one DC per print page';
  $('tb-actions').innerHTML =
    '<button class="btn btn-ghost" onclick="closeDCPrintPage()">' + ic('back', 16) + (isSample ? 'Back to Sample' : 'Back to Job Work') + '</button>' +
    '<button class="btn btn-ghost" onclick="printAllDCs(\'' + rec.id + '\',\'' + mod + '\')">' + ic('print', 16) + 'Print all DCs</button>' +
    (isSample ? '' : '<button class="btn btn-ghost" onclick="printAllGSTDCs(\'' + rec.id + '\')">' + ic('print', 16) + 'GST print all</button>') +
    (isSample ? '' : '<button class="btn btn-ghost" onclick="printSelectedGSTDCs(\'' + rec.id + '\')">' + ic('print', 16) + 'GST print selected</button>') +
    '<button class="btn btn-primary" onclick="printSelectedDCs(\'' + rec.id + '\',\'' + mod + '\')">' + ic('print', 16) + 'Print selected</button>';

  const totalLines = groups.reduce(function (a, g) { return a + g.issues.length + g.extras.length; }, 0);
  const rows = groups.map(function (g) {
    const pod = g.pod
      ? '<span class="dc-pod-status ok">' + ic('check', 13) + 'Uploaded</span>' + (g.podName ? '<div class="sub-line">' + esc(g.podName) + '</div>' : '')
      : '<span class="dc-pod-status miss">POD pending</span>';
    return '<tr>' +
      '<td class="selcol"><label class="cbx"><input type="checkbox" data-dc-check value="' + esc(g.dcNo) + '" onchange="dcSelectionChanged()"></label></td>' +
      '<td><b>' + esc(g.dcNo) + '</b></td>' +
      '<td>' + esc(dpToDisplay(g.date) || g.date || '—') + '</td>' +
      '<td class="num">' + g.issues.length + '</td>' +
      (isSample ? '' : '<td class="num">' + g.extras.length + '</td>') +
      '<td class="num"><b>' + (g.issues.length + g.extras.length) + '</b></td>' +
      '<td>' + pod + '</td>' +
      '<td class="actions-cell">' +
      '<button class="btn btn-ghost btn-sm" data-dc="' + esc(g.dcNo) + '" onclick="printJobWorkDC(\'' + rec.id + '\',this.dataset.dc,\'' + mod + '\')">' + ic('print', 14) + 'Preview / Print</button>' +
      (isSample ? '' : '<button class="btn btn-ghost btn-sm" data-dc="' + esc(g.dcNo) + '" onclick="printJobWorkGSTDC(\'' + rec.id + '\',this.dataset.dc)">' + ic('print', 14) + 'GST / E-Way Print</button>') +
      '</td></tr>';
  }).join('');
  $('content').innerHTML =
    '<div class="dc-select-summary">' +
    '<div class="stock-chip">' + (isSample ? 'Sample ' : 'Job Work ') + '<b>' + esc(rec.no || '') + '</b></div>' +
    '<div class="stock-chip">DCs <b>' + groups.length + '</b></div>' +
    '<div class="stock-chip">Material lines <b>' + totalLines + '</b></div>' +
    '<div class="stock-chip" id="dc-selected-count">0 selected</div>' +
    '</div>' +
    '<div class="panel"><div class="table-wrap"><table id="dc-print-list"><thead><tr>' +
    '<th class="selcol"><label class="cbx"><input id="dc-check-all" type="checkbox" onchange="dcToggleAll(this.checked)"></label></th>' +
    '<th>DC No.</th><th>Issue Date</th><th class="num">Material Issues</th>' + (isSample ? '' : '<th class="num">Extra Issues</th>') +
    '<th class="num">Total Lines</th><th>POD Status</th><th></th></tr></thead><tbody>' + rows +
    '</tbody></table></div></div>' +
    '<div class="hint">Each DC prints on a separate page. ' + (isSample ? 'Sample material issue lines sharing the same SAM number print together.' : 'Material Issues and Extra Quantity Issued are combined only when they carry the same DC number. GST / E-Way Print creates a separate valued delivery challan with HSN, GST breakup and transport fields for e-way bill support.') + ' Use the row button for a quick print, or select several DCs for one print job.</div>';
}
function printJobWorkDC(jobId, dcNo, mod) { printJobWorkDCs(jobId, [dcNo], mod || 'jobwork'); }
function printJobWorkDCs(jobId, dcNos, mod) {
  mod = mod || 'jobwork';
  const isSample = mod === 'sample';
  const rec = (db[mod] || []).find(function (x) { return x.id === jobId; });
  if (!rec) return toast((isSample ? 'Sample' : 'Job Work') + ' not found', 'red');
  const wanted = dcNos || [];
  const groups = dcGroupsForJobWork(rec, mod).filter(function (g) { return wanted.indexOf(g.dcNo) > -1; });
  if (!groups.length) return toast('No printable DC selected', 'red');
  const party = partyByName(rec.vendor);
  const vendorName = party ? (party.legalName || party.shortName) : rec.vendor;
  const vendorAddr = party ? [party.address, party.city, party.state, party.pin].filter(Boolean).join(', ') : '';
  const styles = jwStyleList(rec).map(function (s) { return styleLabel(s) || s; }).join(', ');

  function itemRows(g) {
    const all = [];
    g.issues.forEach(function (x) { all.push({ section: 'Material Issue', x: x }); });
    g.extras.forEach(function (x) { all.push({ section: 'Extra Issue', x: x }); });
    return all.map(function (a, i) {
      const x = a.x;
      const q = pf(x.actualQty != null && x.actualQty !== '' ? x.actualQty : x.qty);
      return '<tr><td class="ctr">' + (i + 1) + '</td><td>' + esc(a.section) + '</td>' +
        '<td>' + esc(x.classification || '—') + '</td><td><b>' + esc(bareItemName(x.item) || x.item || '') + '</b>' +
        (x.colour ? '<div class="sub">Colour: ' + esc(x.colour) + '</div>' : '') + '</td>' +
        '<td>' + esc(x.inwardNo || '—') + '</td><td class="rt">' + fmtNum(q) + '</td><td>' + esc(x.unit || '') + '</td>' +
        '<td>' + esc(a.section === 'Extra Issue' ? (x.reason || '—') : '—') + '</td></tr>';
    }).join('');
  }
  function totals(g) {
    const map = {};
    g.issues.concat(g.extras).forEach(function (x) {
      const u = x.unit || 'Qty';
      const q = pf(x.actualQty != null && x.actualQty !== '' ? x.actualQty : x.qty);
      map[u] = (map[u] || 0) + q;
    });
    return Object.keys(map).map(function (u) { return esc(u) + ': <b>' + fmtNum(map[u]) + '</b>'; }).join(' &nbsp; | &nbsp; ');
  }
  function podAckRows(g) {
    const all = [];
    g.issues.forEach(function (x) { all.push({ section: 'Material', x: x }); });
    g.extras.forEach(function (x) { all.push({ section: 'Extra', x: x }); });
    return all.map(function (a, i) {
      const x = a.x;
      const q = pf(x.actualQty != null && x.actualQty !== '' ? x.actualQty : x.qty);
      return '<tr><td class="ctr">' + (i + 1) + '</td><td>' + esc(a.section) + '</td>' +
        '<td>' + esc(bareItemName(x.item) || x.item || '') + '</td><td class="rt"><b>' + fmtNum(q) + '</b></td>' +
        '<td>' + esc(x.unit || '') + '</td><td class="write"></td><td class="write"></td><td class="write wide"></td></tr>';
    }).join('');
  }
  function sheet(g) {
    return '<section class="sheet">' +
      '<div class="copytag">ORIGINAL — SEND WITH MATERIAL · RETURN STAMPED ACKNOWLEDGEMENT</div>' +
      '<div class="hd"><h1>' + esc(PRINT_CO.name) + '</h1><div>' + esc(PRINT_CO.reg) + '</div><div>' + esc(PRINT_CO.reg2) + '</div>' +
      '<div>' + esc(PRINT_CO.works) + '</div><div>' + esc(PRINT_CO.contact) + '</div></div>' +
      '<div class="title">DELIVERY CHALLAN — ' + (isSample ? 'SAMPLE MATERIAL ISSUE' : 'JOB WORK MATERIAL ISSUE') + '</div>' +
      '<div class="meta"><div><table class="kv">' +
      '<tr><td class="k">DC No.</td><td class="c">:</td><td class="v bigv">' + esc(g.dcNo) + '</td></tr>' +
      '<tr><td class="k">Issue Date</td><td class="c">:</td><td class="v">' + esc(dpToDisplay(g.date) || g.date || '') + '</td></tr>' +
      '<tr><td class="k">' + (isSample ? 'Sample No.' : 'Job Work No.') + '</td><td class="c">:</td><td class="v">' + esc(rec.no || '') + '</td></tr>' +
      '<tr><td class="k">' + (isSample ? 'Sample Date' : 'Job Work Date') + '</td><td class="c">:</td><td class="v">' + esc(dpToDisplay(rec.date) || rec.date || '') + '</td></tr>' +
      '</table></div><div><table class="kv">' +
      '<tr><td class="k">Deliver To</td><td class="c">:</td><td class="v">' + esc(vendorName || '') + '</td></tr>' +
      '<tr><td class="k">Address</td><td class="c">:</td><td>' + esc(vendorAddr || '—') + '</td></tr>' +
      '<tr><td class="k">GST No.</td><td class="c">:</td><td class="v">' + esc((party && party.gstNo) || '—') + '</td></tr>' +
      '<tr><td class="k">Style(s)</td><td class="c">:</td><td class="v">' + esc(styles || '—') + '</td></tr>' +
      '</table></div></div>' +
      '<table class="items"><thead><tr><th class="ctr">Sr.</th><th>Issue Type</th><th>Classification</th><th>Item</th>' +
      '<th>Inward No.</th><th class="rt">Actual Issue Qty</th><th>UOM</th><th>Reason</th></tr></thead><tbody>' + itemRows(g) + '</tbody></table>' +
      '<div class="total">Dispatch totals: ' + totals(g) + '</div>' +
      '<div class="note"><b>Purpose:</b> Raw material issued for job-work processing only. Ownership of the material remains with ' + esc(PRINT_CO.name) + '.' +
      (rec.notes ? '<br><b>Instructions:</b> ' + esc(rec.notes) : '') + '</div>' +
      '<div class="dc-sign"><div><b>Prepared / Checked By</b><span></span>Name &amp; Signature</div>' +
      '<div><b>For ' + esc(PRINT_CO.name) + '</b><span></span>Authorized Signatory</div></div>' +

      '<div class="cut"><span>✂</span> DETACH / RETURN THIS STAMPED SECTION AS PROOF OF DELIVERY <span>✂</span></div>' +
      '<div class="podack">' +
      '<div class="podtitle"><div><b>PROOF OF DELIVERY (POD)</b><small>JOB WORKER MATERIAL RECEIPT ACKNOWLEDGEMENT</small></div>' +
      '<div class="podref">DC No. <b>' + esc(g.dcNo) + '</b><br>Date <b>' + esc(dpToDisplay(g.date) || g.date || '') + '</b></div></div>' +
      '<div class="podmeta"><b>From:</b> ' + esc(PRINT_CO.name) + ' &nbsp; | &nbsp; <b>Received at:</b> ' + esc(vendorName || '') +
      ' &nbsp; | &nbsp; <b>' + (isSample ? 'Sample' : 'Job Work') + ':</b> ' + esc(rec.no || '') + '</div>' +
      '<div class="ackstatement">I/We acknowledge receipt of the materials listed below. Quantities were physically checked at the time of delivery.</div>' +
      '<table class="ack"><thead><tr><th>Sr.</th><th>Type</th><th>Item</th><th class="rt">DC Qty</th><th>UOM</th>' +
      '<th>Qty Received</th><th>Short / Excess</th><th>Condition / Remarks</th></tr></thead><tbody>' + podAckRows(g) + '</tbody></table>' +
      '<div class="checks">Condition: &nbsp; □ Received in full and good condition &nbsp;&nbsp; □ Short / Excess &nbsp;&nbsp; □ Damaged &nbsp;&nbsp; □ Subject to detailed verification</div>' +
      '<div class="receiver"><div><b>Receiver Name &amp; Designation</b><span></span></div><div><b>Mobile No.</b><span></span></div>' +
      '<div><b>Actual Receipt Date &amp; Time</b><span></span></div><div class="stamp"><b>Job Worker Stamp &amp; Authorized Signature</b><span></span></div></div>' +
      '<div class="podnote">Job worker: stamp and sign this acknowledgement after confirming received quantities. Return the signed copy to the sender for POD upload.</div>' +
      '</div>' +
      '<div class="foot">SUBJECT TO ' + esc(PRINT_CO.jurisdiction.toUpperCase()) + ' JURISDICTION</div>' +
      '</section>';
  }
  const doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (isSample ? 'Sample ' : '') + 'Delivery Challan ' + esc(groups.map(function (g) { return g.dcNo; }).join(', ')) + '</title><style>' +
    '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;margin:0;padding:14px;background:#eee}' +
    '.bar{display:flex;gap:8px;justify-content:flex-end;max-width:1000px;margin:0 auto 10px;position:sticky;top:0}' +
    '.bar button{font:inherit;padding:7px 16px;border:1px solid #999;border-radius:4px;background:#fff;cursor:pointer}.bar .p{background:#303030;color:#fff;border-color:#303030}' +
    '.sheet{max-width:1000px;margin:0 auto 16px;background:#fff;border:1px solid #000;page-break-after:always}.sheet:last-child{page-break-after:auto}.copytag{text-align:center;padding:3px 8px;background:#111;color:#fff;font-size:9px;font-weight:bold;letter-spacing:.5px}' +
    '.hd{text-align:center;padding:8px 10px;border-bottom:1px solid #000}.hd h1{font-size:15px;margin:0 0 3px}.hd div{font-size:10px;line-height:1.4}' +
    '.title{text-align:center;font-size:13px;font-weight:bold;padding:5px;border-bottom:1px solid #000;letter-spacing:.8px}.bigv{font-size:13px}' +
    '.meta{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #000}.meta>div{padding:8px 10px}.meta>div+div{border-left:1px solid #000}' +
    'table{border-collapse:collapse;width:100%}.kv td{padding:2px 3px;vertical-align:top}.kv .k{width:100px}.kv .c{width:10px}.kv .v{font-weight:bold}' +
    '.items th,.items td{border:1px solid #000;padding:5px 6px;vertical-align:top}.items th{background:#eee;font-size:10px;text-align:left}.items .ctr,.ctr{text-align:center}.items .rt,.rt{text-align:right}.sub{font-size:9px;margin-top:2px;color:#444}' +
    '.total{padding:5px 10px;text-align:right;border-bottom:1px solid #000}.note{padding:5px 10px;border-bottom:1px solid #000;line-height:1.35;font-size:9.5px}' +
    '.dc-sign{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #000}.dc-sign>div{padding:6px 12px;text-align:center;font-size:9.5px}.dc-sign>div+div{border-left:1px solid #000}.dc-sign span{display:block;height:25px;border-bottom:1px solid #777;margin:0 18px 3px}' +
    '.cut{position:relative;text-align:center;padding:5px 8px;border-top:1px dashed #000;border-bottom:1px dashed #000;font-size:9px;font-weight:bold;letter-spacing:.35px}.cut span{margin:0 12px}' +
    '.podack{background:#fff}.podtitle{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #000}.podtitle b{font-size:13px;letter-spacing:.6px}.podtitle small{display:block;font-size:8.5px;margin-top:2px}.podref{text-align:right;line-height:1.5;font-size:10px}.podmeta,.ackstatement,.checks,.podnote{padding:4px 8px;border-bottom:1px solid #000;font-size:9px;line-height:1.35}.ackstatement{font-weight:600}.ack th,.ack td{border:1px solid #000;padding:3px 4px;font-size:8.5px;vertical-align:middle}.ack th{background:#eee}.ack .write{min-width:65px;height:22px}.ack .wide{min-width:105px}.receiver{display:grid;grid-template-columns:1.2fr .8fr 1fr 1.5fr;border-bottom:1px solid #000}.receiver>div{min-height:62px;padding:5px 7px;text-align:center;font-size:8.5px}.receiver>div+div{border-left:1px solid #000}.receiver span{display:block;height:34px;border-bottom:1px solid #777;margin:0 5px}.receiver .stamp{font-weight:bold}.podnote{text-align:center;font-weight:600;background:#f7f7f7}' +
    '.foot{text-align:center;padding:5px;font-size:10px;font-weight:bold}' +
    '@page{size:A4 portrait;margin:8mm}@media print{body{padding:0;background:#fff}.bar{display:none}.sheet{border:1px solid #000;margin:0;max-width:none;page-break-after:always}.sheet:last-child{page-break-after:auto}.podack,.receiver,.ack tr{break-inside:avoid}}' +
    '</style></head><body><div class="bar"><button class="p" onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>' +
    groups.map(sheet).join('') + '</body></html>';
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to open the DC print page', 'red');
  w.document.write(doc); w.document.close();
}


/* GST / E-Way Bill support copy — valuation is taken from the source PO where
   available, otherwise from Item Master. This is a delivery challan, not a tax invoice. */
function printJobWorkGSTDCs(jobId, dcNos) {
  const rec = (db.jobwork || []).find(function (x) { return x.id === jobId; });
  if (!rec) return toast('Job Work not found', 'red');
  const wanted = dcNos || [];
  const groups = dcGroupsForJobWork(rec, 'jobwork').filter(function (g) { return wanted.indexOf(g.dcNo) > -1; });
  if (!groups.length) return toast('No printable DC selected', 'red');
  const party = partyByName(rec.vendor);
  const vendorName = party ? (party.legalName || party.shortName) : rec.vendor;
  const vendorAddr = party ? [party.address, party.city, party.state, party.pin].filter(Boolean).join(', ') : '';
  const vendorGst = (party && party.gstNo) || '';
  const vendorState = (party && party.state) || '';
  const vendorStateCode = vendorGst && /^\d{2}/.test(vendorGst) ? vendorGst.slice(0, 2) : (vendorState === 'Maharashtra' ? '27' : '');
  const senderGst = PRINT_CO.gstNo || '';
  const senderState = PRINT_CO.state || 'Maharashtra';
  const senderStateCode = PRINT_CO.stateCode || (senderGst && /^\d{2}/.test(senderGst) ? senderGst.slice(0, 2) : '27');
  const interState = !!(vendorStateCode && senderStateCode && vendorStateCode !== senderStateCode);

  function lineInfo(x) {
    const im = itemByName(x.item) || {};
    const inward = inwardByNo(x.inwardNo || '');
    const poNo = x.poRef || (inward && inward.poRef) || '';
    const po = (db.po || []).find(function (p) { return p.no === poNo; });
    const pi = po && (po.items || []).find(function (i) { return lcName(i.name) === lcName(x.item); });
    const qty = pf(x.actualQty != null && x.actualQty !== '' ? x.actualQty : x.qty);
    const rate = pf((pi && pi.rate) || im.itemRate || 0);
    const taxable = qty * rate;
    const gstRate = pf(im.gst || (pi && (pf(pi.cgstPct) + pf(pi.sgstPct) + pf(pi.igstPct))) || 0);
    const cgstRate = interState ? 0 : gstRate / 2;
    const sgstRate = interState ? 0 : gstRate / 2;
    const igstRate = interState ? gstRate : 0;
    return {
      item: bareItemName(x.item) || x.item || '', hsn: im.hsn || (pi && pi.hsn) || '', inwardNo: x.inwardNo || '', poNo: poNo,
      qty: qty, unit: x.unit || im.unit || '', rate: rate, taxable: taxable, gstRate: gstRate,
      cgstRate: cgstRate, sgstRate: sgstRate, igstRate: igstRate,
      cgst: taxable * cgstRate / 100, sgst: taxable * sgstRate / 100, igst: taxable * igstRate / 100
    };
  }
  function sheet(g) {
    const lines = g.issues.concat(g.extras).map(lineInfo);
    let taxable = 0, cgst = 0, sgst = 0, igst = 0, qty = 0;
    const rows = lines.map(function (x, i) {
      taxable += x.taxable; cgst += x.cgst; sgst += x.sgst; igst += x.igst; qty += x.qty;
      return '<tr><td class="ctr">' + (i + 1) + '</td><td><b>' + esc(x.item) + '</b></td><td>' + esc(x.hsn || '—') + '</td>' +
        '<td>' + esc(x.inwardNo || '—') + '<small>PO: ' + esc(x.poNo || '—') + '</small></td><td class="rt">' + fmtNum(x.qty) + '</td><td>' + esc(x.unit) + '</td>' +
        '<td class="rt">' + fmtNum(x.rate) + '</td><td class="rt">' + fmtNum(x.taxable) + '</td><td class="ctr">' + fmtNum(x.gstRate) + '%</td>' +
        '<td class="rt">' + (x.cgstRate ? fmtNum(x.cgst) + '<small>' + fmtNum(x.cgstRate) + '%</small>' : '—') + '</td>' +
        '<td class="rt">' + (x.sgstRate ? fmtNum(x.sgst) + '<small>' + fmtNum(x.sgstRate) + '%</small>' : '—') + '</td>' +
        '<td class="rt">' + (x.igstRate ? fmtNum(x.igst) + '<small>' + fmtNum(x.igstRate) + '%</small>' : '—') + '</td></tr>';
    }).join('');
    const taxTotal = cgst + sgst + igst, grand = taxable + taxTotal;
    return '<section class="sheet"><div class="copytag">ORIGINAL FOR CONSIGNEE / E-WAY BILL SUPPORTING DOCUMENT</div>' +
      '<div class="hd"><h1>' + esc(PRINT_CO.name) + '</h1><div>' + esc(PRINT_CO.reg) + '</div><div>' + esc(PRINT_CO.reg2) + '</div><div>' + esc(PRINT_CO.works) + '</div><div>' + esc(PRINT_CO.contact) + '</div></div>' +
      '<div class="title">DELIVERY CHALLAN FOR JOB WORK — GST / E-WAY BILL COPY</div>' +
      '<div class="docgrid"><div><table class="kv"><tr><td>Document No.</td><td>:</td><td><b>' + esc(g.dcNo) + '</b></td></tr><tr><td>Document Date</td><td>:</td><td><b>' + esc(dpToDisplay(g.date) || g.date || '') + '</b></td></tr><tr><td>Job Work No.</td><td>:</td><td>' + esc(rec.no || '') + '</td></tr><tr><td>Supply Type</td><td>:</td><td><b>Outward — Job Work</b></td></tr></table></div>' +
      '<div><table class="kv"><tr><td>Transaction Type</td><td>:</td><td>Regular</td></tr><tr><td>Document Type</td><td>:</td><td>Delivery Challan</td></tr><tr><td>Place of Dispatch</td><td>:</td><td>' + esc(senderState) + '</td></tr><tr><td>Place of Delivery</td><td>:</td><td>' + esc(vendorState || '—') + '</td></tr></table></div></div>' +
      '<div class="parties"><div><h3>Consignor / From</h3><b>' + esc(PRINT_CO.name) + '</b><p>' + esc(PRINT_CO.works.replace('Works: ', '')) + '</p><table class="kv"><tr><td>GSTIN</td><td>:</td><td><b>' + esc(senderGst || '________________') + '</b></td></tr><tr><td>State / Code</td><td>:</td><td>' + esc(senderState) + ' / ' + esc(senderStateCode) + '</td></tr></table></div>' +
      '<div><h3>Consignee / Ship To</h3><b>' + esc(vendorName || '') + '</b><p>' + esc(vendorAddr || '—') + '</p><table class="kv"><tr><td>GSTIN</td><td>:</td><td><b>' + esc(vendorGst || 'Unregistered / Not available') + '</b></td></tr><tr><td>State / Code</td><td>:</td><td>' + esc(vendorState || '—') + ' / ' + esc(vendorStateCode || '—') + '</td></tr></table></div></div>' +
      '<table class="items"><thead><tr><th>Sr.</th><th>Description of Goods</th><th>HSN</th><th>Inward / PO Ref.</th><th class="rt">Qty</th><th>UOM</th><th class="rt">Rate</th><th class="rt">Taxable Value</th><th>GST %</th><th class="rt">CGST</th><th class="rt">SGST</th><th class="rt">IGST</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td colspan="4"><b>Total</b></td><td class="rt"><b>' + fmtNum(qty) + '</b></td><td colspan="2"></td><td class="rt"><b>' + fmtNum(taxable) + '</b></td><td></td><td class="rt"><b>' + fmtNum(cgst) + '</b></td><td class="rt"><b>' + fmtNum(sgst) + '</b></td><td class="rt"><b>' + fmtNum(igst) + '</b></td></tr></tfoot></table>' +
      '<div class="value"><span>Taxable Value <b>' + fmtINR(taxable) + '</b></span><span>Indicative GST <b>' + fmtINR(taxTotal) + '</b></span><span>E-Way Bill Value <b>' + fmtINR(grand) + '</b></span></div>' +
      '<div class="transport"><h3>Transportation / E-Way Bill Details</h3><div><b>Transporter Name &amp; ID:</b> ______________________________</div><div><b>Vehicle No.:</b> __________________</div><div><b>Transport Document No. / Date:</b> ______________________________</div><div><b>Approx. Distance:</b> __________ km</div><div><b>E-Way Bill No.:</b> ______________________________</div></div>' +
      '<div class="decl"><b>Declaration:</b> Goods described above are sent exclusively for job-work processing under delivery challan. Ownership remains with ' + esc(PRINT_CO.name) + '. This is not a tax invoice. GST valuation is shown only to support statutory movement and e-way bill documentation.</div>' +
      '<div class="sign"><div><b>Prepared / Checked By</b><span></span>Name &amp; Signature</div><div><b>Receiver Acknowledgement</b><span></span>Stamp &amp; Signature</div><div><b>For ' + esc(PRINT_CO.name) + '</b><span></span>Authorized Signatory</div></div>' +
      '<div class="foot">SUBJECT TO ' + esc(PRINT_CO.jurisdiction.toUpperCase()) + ' JURISDICTION</div></section>';
  }
  const doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>GST Delivery Challan ' + esc(groups.map(function (g) { return g.dcNo; }).join(', ')) + '</title><style>' +
    '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#000;margin:0;padding:12px;background:#eee}.bar{display:flex;gap:8px;justify-content:flex-end;max-width:1120px;margin:0 auto 10px;position:sticky;top:0}.bar button{font:inherit;padding:7px 16px;border:1px solid #999;border-radius:4px;background:#fff;cursor:pointer}.bar .p{background:#303030;color:#fff;border-color:#303030}.sheet{max-width:1120px;margin:0 auto 16px;background:#fff;border:1px solid #000;page-break-after:always}.sheet:last-child{page-break-after:auto}.copytag{text-align:center;background:#111;color:#fff;padding:4px;font-size:9px;font-weight:bold;letter-spacing:.5px}.hd{text-align:center;padding:7px;border-bottom:1px solid #000}.hd h1{font-size:15px;margin:0 0 2px}.hd div{font-size:9px;line-height:1.3}.title{text-align:center;font-size:13px;font-weight:bold;padding:6px;border-bottom:1px solid #000;letter-spacing:.5px}.docgrid,.parties{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #000}.docgrid>div,.parties>div{padding:7px 9px}.docgrid>div+div,.parties>div+div{border-left:1px solid #000}.parties h3,.transport h3{font-size:10px;text-transform:uppercase;margin:0 0 4px}.parties p{margin:3px 0;min-height:22px}.kv{border-collapse:collapse;width:100%}.kv td{padding:1px 3px;vertical-align:top}.kv td:first-child{width:115px}.items{border-collapse:collapse;width:100%}.items th,.items td{border:1px solid #000;padding:4px;vertical-align:top}.items th{background:#eee;font-size:8.5px}.items small{display:block;font-size:7.5px;color:#333;margin-top:2px}.ctr{text-align:center}.rt{text-align:right}.value{display:flex;justify-content:flex-end;gap:22px;padding:6px 9px;border-bottom:1px solid #000;font-size:10px}.transport{display:grid;grid-template-columns:1.3fr 1fr 1.6fr .8fr 1.2fr;gap:8px;padding:8px;border-bottom:1px solid #000}.transport h3{grid-column:1/-1}.decl{padding:6px 9px;border-bottom:1px solid #000;font-size:9px;line-height:1.35}.sign{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #000}.sign>div{text-align:center;padding:6px}.sign>div+div{border-left:1px solid #000}.sign span{display:block;height:34px;border-bottom:1px solid #777;margin:0 10px 3px}.foot{text-align:center;padding:5px;font-weight:bold}@page{size:A4 landscape;margin:7mm}@media print{body{padding:0;background:#fff}.bar{display:none}.sheet{margin:0;border:1px solid #000;max-width:none;page-break-after:always}.sheet:last-child{page-break-after:auto}}</style></head><body><div class="bar"><button class="p" onclick="window.print()">Print GST / E-Way Copy</button><button onclick="window.close()">Close</button></div>' + groups.map(sheet).join('') + '</body></html>';
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to open the GST print page', 'red');
  w.document.write(doc); w.document.close();
}

function jwAutoStatus(d) {
  if (d.status === 'Cancelled') return 'Cancelled';
  if (d.status === 'Closed') return 'Closed';
  const ord = jwTotalOrder(d), rec = jwTotalReceived(d);
  if (ord > 0 && rec >= ord) return 'Completed';
  if (rec > 0) return 'Partially Received';
  // No FG left — do not keep Completed / Partially Received
  return d.status === 'In Progress' ? 'In Progress' : 'Issued';
}

