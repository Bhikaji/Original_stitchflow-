   • brand, size, style name, seller SKU captured on every sale item.
   ===================================================================== */

/* ---------- state ---------- */
let MP_STATE = null;

const MP_SOURCES = [
  { k:'myntra',   l:'Myntra',          customer:'Myntra D2C', channel:'Myntra D2C' },
  { k:'flipkart', l:'Flipkart',        customer:'Flipkart',   channel:'Marketplace' },
  { k:'amazon',   l:'Amazon',          customer:'Amazon',     channel:'Marketplace' },
  { k:'meesho',   l:'Meesho',          customer:'Meesho',     channel:'Marketplace' },
  { k:'ajio',     l:'AJIO',            customer:'AJIO',       channel:'Marketplace' },
  { k:'other',    l:'Other / Generic', customer:'Myntra D2C', channel:'Marketplace' }
];

const MP_FIELDS = [
  { k:'orderNo',      l:'Order No' },
  { k:'orderLine',    l:'Order Line ID' },
  { k:'orderDate',    l:'Order Date' },
  { k:'sku',          l:'SKU / Article', req:true },
  { k:'styleCode',    l:'Style Code' },
  { k:'productName',  l:'Product / Style Name' },
  { k:'brand',        l:'Brand' },
  { k:'size',         l:'Size' },
  { k:'qty',          l:'Quantity' },
  { k:'mrp',          l:'MRP (₹)' },
  { k:'sellingPrice', l:'Selling Price (₹)' },
  { k:'discount',     l:'Discount (₹)' },
  { k:'netAmount',    l:'Net / Final Amount (₹)' },
  { k:'orderStatus',  l:'Order Status' },
  { k:'program',      l:'Program (po_type)' },
  { k:'sellerId',     l:'Seller id (feeds the po_type master)' }
];

/* alias order = priority; first alias listed wins ties between columns */
const MP_ALIASES = {
  orderNo:      ['order id fk','order id','order no','order number','sub order no','sub order id','sub order','shipment id','orderno'],
  orderLine:    ['order line id','order line','order line no','order item id'],
  orderDate:    ['created on','order date','ordered on','purchase date','order created','created date','ordered date','delivered on','date'],
  sku:          ['seller sku code','item barcode','myntra sku code','barcode','sku','sku id','sku code','seller sku','fsn','listing id','simple sku','variant sku','seller style id','article code'],
  styleCode:    ['style id','style code','style','article no','article code','fashion id'],
  productName:  ['style name','product name','item name','product','item description','product title','garment name','description'],
  brand:        ['brand','brand name'],
  size:         ['size','size name','variant size','variant'],
  qty:          ['quantity','qty','order qty','ordered qty','ordered quantity','units','no of units','unit count','qty pcs'],
  mrp:          ['total mrp','mrp','mrp rs','mrp inr','max retail price','listed price','list price','actual price','original price'],
  sellingPrice: ['selling price','sale price','seller price','sales price','sp','discounted price','selling price rs','sale price rs'],
  discount:     ['discount','seller discount','total seller discount','discount value','discount amount','discount on mrp','total discount','discount rs','discount inr'],
  netAmount:    ['final sale price with tax','final amount','customer price','net amount','net selling price','net proceeds','collection amount','settlement amount','realized price','net price','net value'],
  orderStatus:  ['order status','status','item status','order item status','delivery status','shipment status'],
  program:      ['po type','po_type','program','fulfillment type','fulfillment'],
  sellerId:     ['seller id','seller id fk','sellerid','seller code','seller name','vendor id','vendor code','partner id','partner code','store id','outlet id']
};
/* same list, for when the column was not mapped but is plainly there */
const MP_SELLER_HDRS = MP_ALIASES.sellerId;

function mpSource(k){ return MP_SOURCES.find(function(s){ return s.k === k; }) || MP_SOURCES[MP_SOURCES.length - 1]; }

/* statuses that read as a return rather than a sale - their chip warns, it never skips on its own */
function mpStatusIsBad(s){
  const v = String(s||'').trim();
  if(!v) return false;
  return /cancel|rto|return|refund|lost|failed/i.test(v) || /^(ca|can|cx|cxl|ld|rt|rtd|rp)$/i.test(v);
}

/* ---------- openers ---------- */
function openSaleImport(){
  if(!userCan('sale','view')) return toast('Access denied for this module','red');
  MP_STATE = { view:'import', step:1, srcKey:'myntra', fileName:'', sheets:null, sheetIdx:0,
               headerRowIdx:0, headers:[], dataRows:[], mapping:{}, parsed:null, statusCounts:{},
               opts:{ group:'date', program:'AUTO', customer:'', channel:'', skipStatuses:null } };
  cur = 'sale'; pageView = { kind:'saleimport' };
  render();
}
function openSaleImportHistory(){
  if(!userCan('sale','view')) return toast('Access denied for this module','red');
  MP_STATE = { view:'history', statusCounts:{}, opts:{ group:'date', program:'AUTO', customer:'', channel:'', skipStatuses:null } };
  cur = 'sale'; pageView = { kind:'saleimport' };
  render();
}
function mpShowHistoryView(){ mpPreserveOpts(); MP_STATE.view = 'history'; render(); }
function mpShowImportView(){ mpPreserveOpts(); MP_STATE.view = 'import'; render(); }
function mpCloseImport(){ MP_STATE = null; pageView = null; cur = 'sale'; render(); }

/* ---------- page shell ---------- */
function renderSaleImportPage(){
  const st = MP_STATE;
  if(!st){ mpCloseImport(); return; }
  $('tb-title').textContent = st.view === 'history' ? 'Marketplace Import History' : 'Marketplace Sale Import';
  $('tb-sub').innerHTML = st.view === 'history'
    ? 'Every marketplace report imported into Sale, with the Sale records it created'
    : 'Import Myntra (PPMP / FBM / SJIT), Flipkart and other marketplace sale reports into Sale records';
  $('tb-actions').innerHTML =
    '<button class="btn btn-ghost" onclick="mpCloseImport()">' + ic('back',16) + 'Back to Sale</button>' +
    (st.view === 'history'
      ? '<button class="btn btn-primary" onclick="mpShowImportView()">' + ic('plus',16) + 'New Import</button>'
      : '<button class="btn btn-ghost" onclick="mpShowHistoryView()">' + ic('view',16) + 'Import History</button>');
  $('content').innerHTML = st.view === 'history' ? mpHistoryHtml() : mpImportHtml();
}

function mpStepper(){
  const st = MP_STATE;
  const active = st.sheets ? 2 : 1;
  const steps = ['Upload report','Map & review','Import'];
  return '<div class="segbar" style="margin-bottom:16px">' + steps.map(function(s,i){
    return '<span class="seg' + (i+1===active?' on':'') + '" style="cursor:default"><b>' + (i+1) + '</b>&nbsp;' + s + '</span>';
  }).join('') + '</div>';
}

/* ---------- step 1 : upload ---------- */
function mpImportHtml(){
  const st = MP_STATE;
  if(!st.sheets) return mpStep1Html();
  return mpStep2Html();
}

function mpStep1Html(){
  const st = MP_STATE;
  const pills = MP_SOURCES.map(function(s){
    return '<button type="button" class="seg' + (st.srcKey===s.k?' on':'') + '" onclick="mpSetSource(\''+s.k+'\')">' + esc(s.l) + '</button>';
  }).join('');
  return '<div class="entry-page">' + mpStepper() +
    '<div class="sec">Upload marketplace sale report</div>' +
    '<div class="grid-fixed">' +
      field('Marketplace', '<div class="segbar" style="flex-wrap:wrap">' + pills + '</div>') +
      field('Report file (.xlsx / .csv)',
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-primary" onclick="mpTriggerFile()">' + ic('inbox',16) + 'Choose Excel / CSV file</button>' +
          (st.fileName ? '<span class="badge b-green">' + esc(st.fileName) + '</span>' : '<span class="sub-line">No file selected</span>') +
        '</div><input type="file" id="mp-file" accept=".xlsx,.csv,.txt" style="display:none" onchange="mpOnFile(this)">') +
    '</div>' +
    '<div class="hint">' +
      'Upload the <b>Seller_Orders_Report</b> (contains PPMP + FBM rows, auto-detected via the po_type column) or the ' +
      '<b>SJIT_DELIVERED_ORDERS</b> report from Myntra Partner Portal → Reports. Flipkart / Amazon / Meesho / AJIO exports work too.<br>' +
      'Columns are auto-detected and can be corrected in the next step. Reports without a Quantity column are treated as <b>1 row = 1 pc</b>.<br><b>Every column of the file is preserved</b> on each imported row — nothing from the Excel is lost.' +
      '<br><button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="mpDownloadSample()">' + ic('download',16) + 'Download sample report (for testing)</button>' +
    '</div>' +
  '</div>';
}

function mpTriggerFile(){
  const i = $('mp-file'); if(i){ i.value=''; i.click(); }
}
function mpSetSource(k){
  const st = MP_STATE; if(!st) return;
  const prev = mpSource(st.srcKey), next = mpSource(k);
  mpPreserveOpts();
  if(!st.opts.customer || st.opts.customer === prev.customer) st.opts.customer = next.customer;
  if(!st.opts.channel  || st.opts.channel  === prev.channel ) st.opts.channel  = next.channel;
  st.srcKey = k;
  render();
}
async function mpOnFile(inp){
  const file = inp.files && inp.files[0]; if(!file) return;
  const st = MP_STATE;
  toast('Reading ' + file.name + ' …');
  let wb;
  try { wb = await mpReadWorkbook(file); }
  catch(e){ toast('Could not read file: ' + (e.message || e), 'red'); return; }
  st.fileName = file.name;
  st.sheets = wb.sheets;
  st.sheetIdx = 0;
  mpLoadSheet();
  st.step = 2; st.view = 'import';
  render();
  if(st.parsed && st.parsed.length) toast('Loaded ' + st.headers.length + ' columns · ' + fmtNum(st.dataRows.length) + ' rows from ' + file.name, 'green');
  else toast('File loaded but no data rows were found — check the sheet / header row', 'red');
}
function mpSheetChange(v){
  mpPreserveOpts();
  MP_STATE.sheetIdx = parseInt(v,10) || 0;
  MP_STATE.opts.skipStatuses = null;
  mpLoadSheet();
  render();
}
function mpBackToUpload(){
  mpPreserveOpts();
  const st = MP_STATE;
  st.sheets = null; st.headers = []; st.dataRows = []; st.mapping = {}; st.parsed = null; st.statusCounts = {}; st.step = 1;
  render();
}

/* ---------- workbook reading ---------- */
async function mpReadWorkbook(file){
  const name = String(file.name||'').toLowerCase();
  if(/\.(csv|txt)$/.test(name)){
    const text = await file.text();
    const rows = mpParseCSV(text);
    if(!rows.length) throw new Error('The CSV file is empty');
    return { sheets:[{ name:'CSV', rows:rows }] };
  }
  if(!/\.xlsx$/.test(name)){
    if(/\.xls$/.test(name)) throw new Error('Old .xls format is not supported — open it in Excel and re-save as .xlsx, or export as CSV');
    throw new Error('Please upload an .xlsx or .csv file');
  }
  const buf = await file.arrayBuffer();
  let shared=''; try{ shared = await unzipEntry(buf,'xl/sharedStrings.xml'); }catch(e){}
  const ss = parseShared(shared);
  const wbXml = await unzipEntry(buf,'xl/workbook.xml');
  const wbDoc = new DOMParser().parseFromString(wbXml,'application/xml');
  let relMap = {};
  try{
    const relsXml = await unzipEntry(buf,'xl/_rels/workbook.xml.rels');
    const relsDoc = new DOMParser().parseFromString(relsXml,'application/xml');
    Array.from(relsDoc.getElementsByTagName('Relationship')).forEach(function(r){
      relMap[r.getAttribute('Id')] = r.getAttribute('Target')||'';
    });
  }catch(e){}
  const sheetEls = Array.from(wbDoc.getElementsByTagName('sheet'));
  const out = [];
  for(let i=0;i<sheetEls.length;i++){
    const shEl = sheetEls[i];
    const shName = shEl.getAttribute('name') || ('Sheet ' + (i+1));
    let target = relMap[shEl.getAttribute('r:id')] || ('worksheets/sheet'+(i+1)+'.xml');
    target = String(target).replace(/^\//,'');
    if(target.indexOf('xl/') !== 0) target = 'xl/' + target;
    let x; try{ x = await unzipEntry(buf, target); }catch(e){ continue; }
    try{
      const rows = mpParseSheetXml(x, ss);
      if(rows.length) out.push({ name: shName, rows: rows });
    }catch(e){}
  }
  if(!out.length) throw new Error('No readable worksheet found in this file');
  return { sheets: out };
}

function mpParseSheetXml(xml, ss){
  const doc = new DOMParser().parseFromString(xml,'application/xml');
  const rawRows = []; let maxCol = 0;
  Array.from(doc.getElementsByTagName('row')).forEach(function(r){
    const cells = {};
    Array.from(r.childNodes).forEach(function(c){
      if(c.nodeType !== 1 || c.tagName !== 'c') return;
      const ref = c.getAttribute('r')||'';
      const letters = (/^[A-Z]+/.exec(ref)||[''])[0];
      let col = 0; for(let i=0;i<letters.length;i++) col = col*26 + letters.charCodeAt(i) - 64; col--;
      if(col < 0) return;
      const t = c.getAttribute('t'); let v='';
      if(t==='inlineStr'){ v = Array.from(c.getElementsByTagName('t')).map(function(n){return n.textContent;}).join(''); }
      else {
        const n = c.getElementsByTagName('v')[0]; v = n ? n.textContent : '';
        if(t==='s') v = ss[+v] || '';
        else if(t==='b') v = v==='1' ? 'TRUE' : 'FALSE';
      }
      cells[col] = String(v==null?'':v);
      if(col > maxCol) maxCol = col;
    });
    rawRows.push(cells);
  });
  return rawRows.map(function(cells){
    const row = new Array(maxCol+1).fill('');
    Object.keys(cells).forEach(function(k){ row[+k] = cells[k]; });
    return row;
  });
}

function mpParseCSV(text){
  text = String(text||'').replace(/^\uFEFF/,'');
  const head = text.split(/\r?\n/).slice(0,5).join('\n');
  const counts = { ',':(head.match(/,/g)||[]).length, '\t':(head.match(/\t/g)||[]).length, ';':(head.match(/;/g)||[]).length };
  const delim = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; })[0] || ',';
  const rows=[]; let row=[], cell='', inQ=false;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    if(inQ){
      if(ch==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else inQ=false; }
      else cell += ch;
    } else {
      if(ch==='"') inQ = true;
      else if(ch===delim){ row.push(cell); cell=''; }
      else if(ch==='\n'){ row.push(cell); cell=''; if(row.some(function(c){return String(c).trim()!=='';})) rows.push(row.map(function(c){return String(c).trim();})); row=[]; }
      else if(ch==='\r'){/* skip */}
      else cell += ch;
    }
  }
  if(cell!=='' || row.length){ row.push(cell); if(row.some(function(c){return String(c).trim()!=='';})) rows.push(row.map(function(c){return String(c).trim();})); }
  return rows;
}

/* ---------- header detection & mapping ---------- */
function mpHeaderKey(h){ return String(h||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim(); }

function mpFindHeaderRow(rows){
  const max = Math.min(rows.length, 15);
  let best = 0, bestScore = 0;
  for(let r=0;r<max;r++){
    const row = rows[r]||[]; let score = 0;
    row.forEach(function(cell){
      const k = mpHeaderKey(cell); if(!k || k.length < 2) return;
      MP_FIELDS.forEach(function(f){
        (MP_ALIASES[f.k]||[]).forEach(function(a){
          const ak = a.replace(/\s+/g,'');
          if(k===ak || k.indexOf(ak)>-1 || (ak.indexOf(k)>-1 && k.length>3)) score++;
        });
      });
    });
    if(score > bestScore){ bestScore = score; best = r; }
  }
  return best;
}

function mpAutoMap(headers){
  const keys = headers.map(mpHeaderKey);
  const cands = [];
  MP_FIELDS.forEach(function(f){
    (MP_ALIASES[f.k]||[]).forEach(function(alias, ai){
      const ak = alias.replace(/\s+/g,'');
      keys.forEach(function(hk, idx){
        if(!hk) return;
        let score = 0;
        if(hk === ak) score = 3;
        else if(hk.indexOf(ak) === 0) score = 2;
        else if(hk.length > 3 && hk.indexOf(ak) > -1) score = 1;
        if(score) cands.push({ f:f.k, idx:idx, score:score, ai:ai });
      });
    });
  });
  cands.sort(function(a,b){ return b.score - a.score || a.ai - b.ai || a.idx - b.idx; });
  const map = {}, usedF = {}, usedC = {};
  cands.forEach(function(c){
    if(usedF[c.f] || usedC[c.idx]) return;
    map[c.f] = c.idx; usedF[c.f] = 1; usedC[c.idx] = 1;
  });
  return map;
}

function mpLoadSheet(){
  const st = MP_STATE;
  const sh = st.sheets[st.sheetIdx];
  const hIdx = mpFindHeaderRow(sh.rows);
  st.headerRowIdx = hIdx;
  const raw = (sh.rows[hIdx]||[]).slice();
  while(raw.length && String(raw[raw.length-1]||'').trim()==='') raw.pop();
  st.headers = raw.map(function(h,i){ const s=String(h==null?'':h).trim(); return s || ('Column '+(i+1)); });
  st.dataRows = sh.rows.slice(hIdx+1).filter(function(r){ return r.some(function(c){ return String(c==null?'':c).trim()!==''; }); });
  st.mapping = mpAutoMap(st.headers);
  /* the file's status profile; nothing is pre-ticked, the chips decide */
  st.statusCounts = {};
  if(st.mapping.orderStatus != null){
    st.dataRows.forEach(function(r){
      const s = String(r[st.mapping.orderStatus]==null?'':r[st.mapping.orderStatus]).trim();
      if(!s) return;
      st.statusCounts[s] = (st.statusCounts[s]||0) + 1;
    });
  }
  if(!st.opts.skipStatuses){
    st.opts.skipStatuses = [];   /* no status is left out until a chip is ticked */
  }
  mpReparse();
}

/* ---------- value helpers ---------- */
function mpCellVal(row, idx){ return idx>=0 && idx<row.length ? String(row[idx]==null?'':row[idx]).trim() : ''; }
function mpVal(row, f){ const idx = MP_STATE.mapping[f]; return idx==null ? '' : mpCellVal(row, idx); }
function mpColByName(row, names){
  const st = MP_STATE;
  const keys = st.headers.map(mpHeaderKey);
  for(let n=0;n<names.length;n++){
    const nk = names[n].replace(/\s+/g,'');
    for(let i=0;i<keys.length;i++){
      if(keys[i] === nk) return mpCellVal(row, i);
    }
  }
  return '';
}
function mpMoney(v){
  if(v==null || v==='') return 0;
  let s = String(v).replace(/[₹\s,]/g,'');
  const m = /^\((.*)\)$/.exec(s); if(m) s = '-' + m[1];
  s = s.replace(/[^0-9.\-]/g,'');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function mpQty(v){
  const n = parseFloat(String(v==null?'':v).replace(/[^0-9.\-]/g,''));
  return isNaN(n) ? 0 : Math.round(n);
}
const mpPad2 = function(n){ return String(n).padStart(2,'0'); };
function mpExcelSerialToISO(n){
  const d = new Date(Date.UTC(1899,11,30) + n*86400000);
  return d.toISOString().slice(0,10);
}
function mpParseDate(v){
  const s = String(v==null?'':v).trim(); if(!s) return '';
  if(/^\d{5}(\.\d+)?$/.test(s)){ const n=parseFloat(s); if(n>20000 && n<80000) return mpExcelSerialToISO(Math.floor(n)); }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if(m) return m[1] + '-' + mpPad2(+m[2]) + '-' + mpPad2(+m[3]);
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
  if(m){
    let dd = +m[1], mm = +m[2];
    if(mm > 12 && dd <= 12){ const t = dd; dd = mm; mm = t; }   // assume dd-mm-yyyy (India)
    return m[3] + '-' + mpPad2(mm) + '-' + mpPad2(dd);
  }
  const d = new Date(s);
  if(!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  return '';
}
function mpRowDate(row){
  let d = mpParseDate(mpVal(row,'orderDate'));
  if(!d) d = mpParseDate(mpColByName(row, ['created on','delivered on','shipped on','packed on','order date']));
  return d;
}
function mpDedupeKey(r){
  if(r.orderLine) return [(r.orderNo||''),'L',r.orderLine].join('|').toLowerCase();
  return [(r.orderNo||''),(r.sku||''),(r.size||'')].join('|').toLowerCase();
}
function mpExistingKeys(){
  const set = new Set();
  (db.saleImports||[]).forEach(function(b){ (b.keys||[]).forEach(function(k){ set.add(k); }); });
  return set;
}

/* ---------- parse rows ---------- */
function mpReparse(){
  const st = MP_STATE;
  const seen = {}, existing = mpExistingKeys();
  const hasQtyCol = st.mapping.qty != null;
  const skipSet = {};
  (st.opts.skipStatuses||[]).forEach(function(s){ skipSet[s] = 1; });
  const out = [];
  st.dataRows.forEach(function(row, i){
    const orderNo   = mpVal(row,'orderNo');
    const orderLine = mpVal(row,'orderLine');
    const sku       = mpVal(row,'sku') || mpVal(row,'styleCode');
    const styleCode = mpVal(row,'styleCode');
    const productName = mpVal(row,'productName');
    const brand     = mpVal(row,'brand');
    const size      = mpVal(row,'size');
    const qty       = hasQtyCol ? mpQty(mpVal(row,'qty')) : 1;   /* Myntra exports are unit-level: 1 row = 1 pc */
    const mrp       = mpMoney(mpVal(row,'mrp'));
    const sp        = mpMoney(mpVal(row,'sellingPrice'));
    const disc      = mpMoney(mpVal(row,'discount'));
    const net       = mpMoney(mpVal(row,'netAmount'));
    const status    = mpVal(row,'orderStatus');
    const fileProg  = st.mapping.program != null ? String(mpVal(row,'program')).toUpperCase().trim() : '';
    /* the seller id is the key of the Seller ↔ po_type master */
    const sellerId  = String(mpVal(row,'sellerId') || mpColByName(row, MP_SELLER_HDRS) || '').trim();
    /* the report’s po_type is the starting point; the master outranks it further down, per seller id */
    const program   = fileProg || (sellerId && masterIsActive('sellerPrograms', sellerId) ? sellerProgramOf(sellerId) : '');
    const progFrom  = program ? (fileProg ? 'file' : 'master') : '';
    const orderDate = mpRowDate(row);

    let unit = net > 0 ? net : (sp > 0 ? sp - disc : (mrp > 0 ? mrp - disc : 0));
    if(unit <= 0 && sp > 0) unit = sp;
    if(unit <= 0 && mrp > 0) unit = mrp;
    unit = Math.round(unit*100)/100;
    if(qty > 1) unit = Math.round((unit/qty)*100)/100;
    const amount = Math.round(unit * qty * 100)/100;

    const raw = new Array(st.headers.length);
    for(let c=0;c<st.headers.length;c++) raw[c] = mpCellVal(row, c);
    const rec = { rowNo:i+2, orderNo:orderNo, orderLine:orderLine, orderDate:orderDate, sku:sku, styleCode:styleCode,
                  productName:productName, brand:brand, size:size, qty:qty, mrp:mrp, sp:sp, disc:disc, net:net,
                  status:status, program:program, progFrom:progFrom, sellerId:sellerId, unit:unit, amount:amount, skip:false, dup:false, reason:'', raw:raw };
    const base = (productName || (styleCode ? 'Style ' + styleCode : '') || (sku ? 'SKU ' + sku : '') || ('Line ' + rec.rowNo)).trim();
    rec.desc = base + (sku && (productName || styleCode) ? ' · ' + sku : '') + (size ? ' · ' + size : '');
    rec.key = mpDedupeKey(rec);

    if(hasQtyCol && qty <= 0){ rec.skip = true; rec.reason = 'Missing / zero quantity'; }
    else if(!productName && !sku && !styleCode){ rec.skip = true; rec.reason = 'No SKU or product name'; }
    else if(status && skipSet[status]){ rec.skip = true; rec.reason = 'Status: ' + status; }
    else if(existing.has(rec.key)){ rec.skip = true; rec.dup = true; rec.reason = 'Already imported earlier'; }
    else if(seen[rec.key]){ rec.skip = true; rec.dup = true; rec.reason = 'Duplicate row in this file'; }
    if(!rec.skip) seen[rec.key] = 1;
    out.push(rec);
  });
  /* the Seller \u2194 po_type master outranks the report: where it holds the row's seller id, that
     is the program. The report's own po_type is the fallback for ids the master does not know,
     and a disagreement is remembered so the review can show it instead of hiding it. */
  out.forEach(function(r){
    const sid = r.sellerId;
    if(!sid || !masterIsActive('sellerPrograms', sid)) return;
    const p = sellerProgramOf(sid);
    if(!p) return;
    const said = r.progFrom === 'file' ? r.program : '';
    if(said && said !== p) r.progOver = said;
    r.program = p;
    r.progFrom = (said && said === p) ? 'file' : 'master';
  });
  st.parsed = out;
}

/* ---------- preserve UI options across re-renders ---------- */
function mpPreserveOpts(){
  const st = MP_STATE; if(!st || !st.opts) return;
  try{
    if(qs('[data-cb-input="mp-cust"]')) st.opts.customer = cboxGet('mp-cust');
    if(qs('[data-cb-input="mp-chan"]')) st.opts.channel  = cboxGet('mp-chan');
    const grp = $('mp-group');    if(grp) st.opts.group = grp.value;
    const pr  = $('mp-program');  if(pr)  st.opts.program = pr.value;
    const stx = qsa('[data-mp-status]');
    if(stx.length) st.opts.skipStatuses = stx.filter(function(c){ return c.checked; }).map(function(c){ return c.getAttribute('data-mp-status'); });
  }catch(e){}
}
function mpMapChange(f, v){
  mpPreserveOpts();
  MP_STATE.mapping[f] = parseInt(v,10);
  if(isNaN(MP_STATE.mapping[f])) delete MP_STATE.mapping[f];
  mpReparse();
  render();
}
function mpToggleStatus(s, on){
  mpPreserveOpts();
  const st = MP_STATE;
  const cur = st.opts.skipStatuses || [];
  if(on && cur.indexOf(s) < 0) cur.push(s);
  if(!on) st.opts.skipStatuses = cur.filter(function(x){ return x !== s; });
  else st.opts.skipStatuses = cur;
  mpReparse();
  render();
}
function mpGroupChange(v){ mpPreserveOpts(); MP_STATE.opts.group = v; render(); }

/* ---------- step 2 : map, review, import ---------- */
function mpMappingHtml(){
  const st = MP_STATE;
  let h = '<div class="grid-auto">';
  MP_FIELDS.forEach(function(f){
    const opts = ['<option value="-1">— Not present —</option>'].concat(st.headers.map(function(hdr,i){
      return '<option value="' + i + '"' + (st.mapping[f.k]===i ? ' selected' : '') + '>' + esc(hdr) + '</option>';
    })).join('');
    h += field(f.l + (f.req ? ' *' : ''), '<select class="inp" onchange="mpMapChange(\'' + f.k + '\', this.value)">' + opts + '</select>');
  });
  return h + '</div>';
}

function mpStep2Html(){
  const st = MP_STATE, src = mpSource(st.srcKey);
  const parsed = st.parsed || [];
  const ok = parsed.filter(function(r){ return !r.skip; });
  const skipped = parsed.filter(function(r){ return r.skip; });
  const dupN = skipped.filter(function(r){ return r.dup; }).length;
  const statN = skipped.filter(function(r){ return /^Status:/.test(r.reason); }).length;
  const errN = skipped.length - dupN - statN;
  const qty = ok.reduce(function(a,r){ return a + r.qty; }, 0);
  const amt = ok.reduce(function(a,r){ return a + r.amount; }, 0);
  const autoP = !st.opts.program || st.opts.program === 'AUTO';
  const byProg = {};
  ok.forEach(function(r){
    const p = autoP ? (r.program || '—') : st.opts.program;
    if(!byProg[p]) byProg[p] = { n:0, qty:0, amt:0, m:0 };
    byProg[p].n++; byProg[p].qty += r.qty; byProg[p].amt += r.amount; if(autoP && r.progFrom === 'master') byProg[p].m++;
  });
  const groups = mpBuildGroups();
  const locked = mpProgLocked();
  if(locked) st.opts.program = 'AUTO';
  /* the file's own tally - a run where every row is already imported must not read as "no po_type" */
  const nFile = parsed.filter(function(r){ return r.progFrom === 'file'; }).length;
  const nMaster = parsed.filter(function(r){ return r.progFrom === 'master'; }).length;
  const nBlank = parsed.filter(function(r){ return !r.program; }).length;
  const sids = mpSellerIds();
  const unmatched = sids.filter(function(sid){ return !sellerProgramOf(sid); }).length;
  const nOver = parsed.filter(function(r){ return !!r.progOver; }).length;
  const nSellers = sids.length;
  const seenProg = []; parsed.forEach(function(r){ if(r.program && seenProg.indexOf(r.program) < 0) seenProg.push(r.program); });
  const hasQty = st.mapping.qty != null;
  const hasIdent = st.mapping.sku != null || st.mapping.productName != null || st.mapping.styleCode != null;
  const canImport = userCan('sale','create') && ok.length > 0 && hasIdent;

  let h = '<div class="entry-page">' + mpStepper();

  /* file + sheet */
  h += '<div class="sec">File</div><div class="grid-fixed">' +
    field('Report file', '<span class="badge b-green">' + esc(st.fileName) + '</span> <button type="button" class="btn btn-ghost btn-sm" onclick="mpBackToUpload()">' + ic('back',16) + 'Change file</button>') +
    (st.sheets.length > 1
      ? field('Worksheet', '<select class="inp" onchange="mpSheetChange(this.value)">' + st.sheets.map(function(s,i){
          return '<option value="' + i + '"' + (i===st.sheetIdx?' selected':'') + '>' + esc(s.name) + ' (' + fmtNum(s.rows.length) + ' rows)</option>';
        }).join('') + '</select>')
      : field('Worksheet', '<span class="sub-line">' + esc(st.sheets[st.sheetIdx].name) + ' · header detected on row ' + (st.headerRowIdx+1) + '</span>')) +
  '</div>';

  if(!hasIdent){
    h += '<div class="warn">⚠️ Column mapping incomplete — map at least one of <b>SKU / Product Name / Style Code</b> before importing.</div>';
  } else if(!hasQty && parsed.length){
    h += '<div class="hint" style="background:#f1f6fd;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px">ℹ️ No <b>Quantity</b> column in this report — Myntra exports are unit-level, so <b>each row is imported as 1 pc</b>. All <b>' + st.headers.length + ' columns</b> of the file are preserved on every imported row — click any preview row to see them.</div>';
  }

  /* mapping */
  h += '<div class="sec">Column mapping (auto-detected — correct if needed)</div>' + mpMappingHtml();

  /* options */
  const progs = ['AUTO','SJIT','PPMP','FBM'];
  if(st.opts.program && progs.indexOf(st.opts.program) < 0) progs.push(st.opts.program);
  h += '<div class="sec">Import options</div><div class="grid-fixed">' +
    field('Marketplace', '<div class="segbar" style="flex-wrap:wrap">' + MP_SOURCES.map(function(s){
      return '<button type="button" class="seg' + (st.srcKey===s.k?' on':'') + '" onclick="mpSetSource(\''+s.k+'\')">' + esc(s.l) + '</button>';
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
        : '<select class="inp" id="mp-program">' + progs.map(function(p){
            const l = p==='AUTO' ? 'Auto — from report po_type' + (st.mapping.program!=null ? '' : ' (not in file)') : p;
            return '<option value="' + p + '"' + ((st.opts.program||'AUTO')===p ? ' selected' : '') + '>' + esc(l) + '</option>';
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
        '<option value="date"'  + (st.opts.group!=='file' && st.opts.group!=='order' ? ' selected':'') + '>One Sale record per Order Date</option>' +
        '<option value="file"'  + (st.opts.group==='file'  ? ' selected':'') + '>One Sale record per program / report</option>' +
        '<option value="order"' + (st.opts.group==='order' ? ' selected':'') + '>One Sale record per Order No</option>' +
      '</select>') +
    field('Customer *', cbox('mp-cust', { opts: db.masters.customers, value: st.opts.customer || src.customer, f:'customer', addMaster:'customers', addText:'Customers', free:true })) +
    field('Channel', cbox('mp-chan', { opts: CHANNELS, value: st.opts.channel || src.channel, f:'channel', free:true })) +
  '</div>';

  /* the file's seller ids next to what the Seller ↔ po_type master holds for each one */
  if(sids.length){
    h += '<div class="sec">Seller id → program, from the Seller ↔ po_type master</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">' + sids.map(function(sid, j){
        const rows = parsed.filter(function(r){ return mpSellerSidOf(r).toLowerCase() === sid.toLowerCase(); });
        const nImp = rows.filter(function(r){ return !r.skip; }).length;
        const prog = sellerProgramOf(sid), on = masterIsActive('sellerPrograms', sid);
        const nF = rows.filter(function(r){ return r.progFrom === 'file'; }).length;
        const nM = rows.filter(function(r){ return r.progFrom === 'master'; }).length;
        const nOvr = rows.filter(function(r){ return !!r.progOver; }).length;
        const bits = [fmtNum(rows.length) + ' row' + (rows.length === 1 ? '' : 's') +
          (nImp === rows.length ? '' : ' · ' + fmtNum(nImp) + ' will import')];
        if(st.mapping.program != null && nF) bits.push(fmtNum(nF) + ' answered by the report');
        if(nM) bits.push(fmtNum(nM) + ' from the master');
        if(nOvr) bits.push(fmtNum(nOvr) + ' the master overrode the report');
        if(!nF && !nM) bits.push('no program on those rows');
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
  const statuses = Object.keys(st.statusCounts||{}).sort();
  if(statuses.length){
    const bads = statuses.filter(function(x){ return mpStatusIsBad(x) && (st.opts.skipStatuses||[]).indexOf(x) < 0; });
    const nBad = bads.reduce(function(t,x){ return t + (st.statusCounts[x]||0); }, 0);
    h += '<div class="sec">Order statuses in this file \u2014 tick to skip</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px">' + statuses.map(function(s){
        const on = (st.opts.skipStatuses||[]).indexOf(s) > -1;
        return '<label class="cbx" style="border:1px solid var(--line);border-radius:8px;padding:6px 10px;background:#fff;gap:8px">' +
          '<input type="checkbox" data-mp-status="' + esc(s) + '"' + (on ? ' checked' : '') + ' onchange="mpToggleStatus(\'' + snJsArg(s) + '\', this.checked)"> ' +
          '<span><b>' + esc(s) + '</b> <span class="sub-line">' + fmtNum(st.statusCounts[s]) + ' rows</span></span></label>';
      }).join('') + '</div>' +
      '<div class="hint">Nothing is excluded by default — every status above is booked as Sale rows with their status kept on each item. ' +
      'Tick a status to leave those rows out of this import.' +
      (bads.length ? ' <span style="color:#b45309">' + fmtNum(nBad) + ' row' + (nBad === 1 ? '' : 's') + ' marked ' +
        bads.map(function(x){ return '<b>' + esc(x) + '</b>'; }).join(' / ') +
        (nBad === 1 ? ' reads' : ' read') + ' as a return rather than a sale, and ' +
        (nBad === 1 ? 'is being' : 'are being') + ' booked.</span>' : '') + '</div>';
  }

  /* summary */
  h += '<div class="sec">Review</div><div class="stats">' +
    '<div class="stat"><div class="lbl">Rows in file</div><div class="val">' + fmtNum(parsed.length) + '</div></div>' +
    '<div class="stat green"><div class="lbl">Will import</div><div class="val">' + fmtNum(ok.length) + '</div><div class="extra">' + fmtNum(qty) + ' pcs · ' + fmtINR(amt) + '</div></div>' +
    '<div class="stat"><div class="lbl">Sale records to create</div><div class="val">' + fmtNum(groups.length) + '</div><div class="extra">' + esc(autoP && (st.mapping.program!=null || locked) ? (locked ? 'split by po_type from the master' : 'split by po_type') : (st.opts.group==='date' ? 'grouped by order date' : st.opts.group==='order' ? 'grouped by order no' : 'one per program')) + '</div></div>' +
    '<div class="stat' + (skipped.length?' pink':'') + '"><div class="lbl">Skipped</div><div class="val">' + fmtNum(skipped.length) + '</div><div class="extra">' + statN + ' status · ' + dupN + ' duplicate · ' + errN + ' invalid</div></div>' +
  '</div>';
  const progChips = Object.keys(byProg).map(function(p){
    const m = byProg[p].m;
    return '<span class="stock-chip"><b>' + esc(p) + '</b> ' + fmtNum(byProg[p].n) + ' rows · ' + fmtNum(byProg[p].qty) + ' pcs · <b>' + fmtINR(Math.round(byProg[p].amt*100)/100) + '</b>' +
      (m ? ' <span class="sub-line">' + fmtNum(m) + ' from the seller master</span>' : '') + '</span>';
  }).join('');
  if(progChips) h += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' + progChips + '</div>';

  /* preview tables */
  h += '<div class="sec">Preview — first ' + Math.min(10, ok.length) + ' rows</div>';
  h += mpPreviewTable(ok.slice(0,10), false, autoP);
  if(skipped.length){
    h += '<div class="sec">Skipped rows — first ' + Math.min(8, skipped.length) + ' of ' + skipped.length + '</div>';
    h += mpPreviewTable(skipped.slice(0,8), true, autoP);
  }

  /* actions */
  h += '<div style="display:flex;gap:8px;margin-top:18px;align-items:center;flex-wrap:wrap">' +
    '<button type="button" class="btn btn-ghost" onclick="mpBackToUpload()">' + ic('back',16) + 'Upload a different file</button>' +
    '<div style="flex:1"></div>' +
    '<button type="button" class="btn btn-primary"' + (canImport ? '' : ' disabled style="opacity:.45;cursor:not-allowed"') + ' onclick="mpDoImport()">' +
      ic('check',16) + 'Import ' + fmtNum(ok.length) + ' rows into ' + fmtNum(groups.length) + ' Sale record' + (groups.length===1?'':'s') +
    '</button></div>';
  if(!userCan('sale','create')) h += '<div class="hint">You do not have create access on the Sale module.</div>';

  return h + '</div>';
}

function mpToggleRaw(list, idx){
  const st = MP_STATE; if(!st) return;
  const key = list + ':' + idx;
  st.rawOpen = (st.rawOpen === key) ? null : key;
  render();
}
function mpRawGridHtml(headers, raw){
  let h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:4px 18px;background:#f7f7f5;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:4px 0 10px">';
  for(let c=0;c<headers.length;c++){
    h += '<div style="font-size:12px;line-height:1.5"><span class="sub-line">' + esc(headers[c]) + ':</span> <b>' + (raw[c] === '' ? '<span class="sub-line">—</span>' : esc(raw[c])) + '</b></div>';
  }
  return h + '</div>';
}

/* the preview slices the parsed rows, so a cell has to find its record the same way */
function mpRecAt(listName, idx){
  const st = MP_STATE;
  if(!st || !st.parsed) return null;
  const list = st.parsed.filter(function(r){ return listName === 'skip' ? !!r.skip : !r.skip; });
  return list[idx] || null;
}
function mpSellerSidOf(r){ return String((r && r.sellerId) || '').trim(); }
/* jump out of the import into the master, searched for this seller */
function mpOpenSellerMaster(sid){
  if(!canMasterTab('sellerPrograms','view')) return toast('Access denied for this Master','red');
  cur = 'masters'; pageView = null; mTab = 'sellerPrograms'; mQuery = String(sid || ''); mParent = ''; mPage = 1;
  render();
}
/* from a preview row: sid is read off the record, so nothing has to be quoted into HTML */
function mpJumpSeller(listName, idx){
  const r = mpRecAt(listName, idx);
  mpOpenSellerMaster(r ? mpSellerSidOf(r) : '');
}
/* true when the Seller \u2194 po_type master holds an answer for every seller id in this file -
   then the program is a fact taken from the master, not a choice to make here */
function mpProgLocked(){
  const st = MP_STATE;
  if(!st || !st.parsed || !st.opts || st.opts.progOverride) return false;
  const live = st.parsed.filter(function(r){ return !r.skip; });
  if(!live.length) return false;
  return live.every(function(r){
    const sid = mpSellerSidOf(r);
    return !!sid && !!sellerProgramOf(sid) && masterIsActive('sellerPrograms', sid);
  });
}
function mpProgUnlock(){
  mpPreserveOpts();
  if(!MP_STATE) return;
  MP_STATE.opts.progOverride = true;
  render(); toast('You can pick the program for this file','green');
}
function mpProgRelock(){
  if(!MP_STATE) return;
  MP_STATE.opts.progOverride = false; MP_STATE.opts.program = 'AUTO';
  render(); toast('Back to the Seller \u2194 po_type master','green');
}
function mpOpenSellerMasterAll(){ mpOpenSellerMaster(''); }
function mpMiniLink(fn, label){
  return ' <a href="#" onclick="' + fn + ';return false" style="color:var(--blue,#2563eb);text-decoration:underline">' + label + '</a>';
}
function mpSellerLink(listName, idx, html, title){
  return '<a href="#" onclick="mpSellerDialog(event,\'' + listName + '\',' + idx + ');return false" ' +
    'style="color:var(--blue,#2563eb);text-decoration:underline" title="' + esc(title) + '">' + html + '</a>';
}
/* the row's own pair of cells: the seller id it carries and the po_type it will be booked with */
function mpSellerCells(r, listName, i, showProg, locked){
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
function mpSellerIds(){
  const st = MP_STATE;
  if(!st || !st.parsed) return [];
  const seen = {}, out = [];
  st.parsed.forEach(function(r){
    const sid = mpSellerSidOf(r);
    if(!sid) return;
    const k = sid.toLowerCase();
    if(seen[k]) return;
    seen[k] = 1; out.push(sid);
  });
  return out;
}
function mpSellerJumpAt(i){ mpOpenSellerMaster(mpSellerIds()[i] || ''); }
function mpSellerDialogAt(ev, i){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  mpSellerDialogFor(mpSellerIds()[i] || '', 'mpSellerJumpAt(' + i + ')');
}
function mpSellerDialog(ev, listName, idx){
  if(ev && ev.stopPropagation) ev.stopPropagation();
  const r = mpRecAt(listName, idx);
  if(!r) return;
  mpSellerDialogFor(mpSellerSidOf(r), 'mpJumpSeller(\'' + listName + '\',' + idx + ')');
}
/* the mapping, editable right here: saving re-reads the file so the review updates at once */
function mpSellerDialogFor(sid, jump){
  const st = MP_STATE;
  if(!st) return;
  if(!sid){
    openDialog({
      title: 'No seller id on this row',
      bodyHtml: '<div style="font-size:13px;line-height:1.6">This report has no seller id column mapped, so po_type cannot be filled from the ' +
        '<b>Seller ↔ po_type</b> master. Choose the column under <b>Column mapping → Seller id</b> and the rows are re-read at once. ' +
        'If the export carries no such column, nothing is guessed: every row keeps whatever po_type the file had.</div>',
      confirmText: 'Back to the review'
    });
    return;
  }
  const same = st.parsed.filter(function(x){ return mpSellerSidOf(x).toLowerCase() === sid.toLowerCase(); });
  const willImport = same.filter(function(x){ return !x.skip; }).length;
  const nFile = same.filter(function(x){ return x.progFrom === 'file'; }).length;
  const nMaster = same.filter(function(x){ return x.progFrom === 'master'; }).length;
  const nOver = same.filter(function(x){ return !!x.progOver; }).length;
  const mapped = sellerProgramOf(sid), on = masterIsActive('sellerPrograms', sid);
  openDialog({
    title: 'Seller id ' + sid,
    bodyHtml:
      '<div class="dlg-field"><label>po_type for ' + esc(sid) + '</label>' +
        '<input class="inp" id="mp-dlg-prog" value="' + esc(mapped) + '" placeholder="e.g. SJIT / PPMP" list="mp-dlg-prog-list" autocomplete="off">' +
        '<datalist id="mp-dlg-prog-list">' + sellerProgramValues().map(function(x){ return '<option value="' + esc(x.v) + '"></option>'; }).join('') + '</datalist>' +
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
    after: function(){ const e2 = document.getElementById('mp-dlg-prog'); if(e2){ e2.focus(); e2.select(); } },
    confirmText: mapped ? 'Save and re-check the rows' : 'Add to the master and re-check',
    onConfirm: function(){
      const el = document.getElementById('mp-dlg-prog'), prog = el ? String(el.value).trim() : '';
      const low = sid.toLowerCase();
      if(!(db.masters.sellerPrograms || []).some(function(x){ return String(x).trim().toLowerCase() === low; })) addMasterVal('sellerPrograms', sid, true);
      setSellerProgram(sid, prog);
      if(db.masters.masterStatus && db.masters.masterStatus.sellerPrograms) db.masters.masterStatus.sellerPrograms[low] = true;
      saveDB();
      mpReparse();
      render();
      toast(sid + (prog ? ' → ' + sellerProgramOf(sid) : ' cleared') + ' · rows re-checked', 'green');
      return true;
    }
  });
}

function mpPreviewTable(rows, skippedMode, showProg){
  if(!rows.length) return '<div class="panel"><div class="empty" style="padding:26px"><p>No rows</p></div></div>';
  const st = MP_STATE;
  const locked = mpProgLocked();
  const listName = skippedMode ? 'skip' : 'ok';
  const ncols = 11 + (showProg?1:0) + (skippedMode?1:0);
  const head = '<tr>' + srTh() + '<th>Order No</th><th>Date</th><th>SKU / Style</th><th>Product</th><th>Size</th><th title="the column the Seller ↔ po_type master is keyed on">Seller id</th>' + (showProg?'<th>po_type</th>':'') + '<th class="num">Qty</th><th class="num">Unit ₹</th><th class="num">Amount</th><th>Status</th>' + (skippedMode?'<th>Reason</th>':'') + '</tr>';
  const body = rows.map(function(r, i){
    const open = st && st.rawOpen === listName + ':' + i;
    let h = '<tr style="cursor:pointer" title="Click to see all ' + (st?st.headers.length:0) + ' columns of this Excel row" onclick="mpToggleRaw(&quot;' + listName + '&quot;,' + i + ')">' +
      '<td class="srcol">' + (i+1) + '</td>' +
      '<td>' + (open ? '▾ ' : '▸ ') + esc(r.orderNo || '—') + '</td>' +
      '<td>' + esc(r.orderDate ? dpToDisplay(r.orderDate) : '—') + '</td>' +
      '<td>' + esc(r.sku || r.styleCode || '—') + '</td>' +
      '<td>' + esc(r.productName || '—') + (r.brand ? '<div class="sub-line">' + esc(r.brand) + '</div>' : '') + '</td>' +
      '<td>' + esc(r.size || '—') + '</td>' +
      (function(){ const c = mpSellerCells(r, listName, i, showProg, locked); return c.sid + (showProg ? c.prog : ''); })() +
      '<td class="num">' + fmtNum(r.qty) + '</td>' +
      '<td class="num">' + fmtNum(r.unit) + '</td>' +
      '<td class="num"><b>' + fmtINR(r.amount) + '</b></td>' +
      '<td>' + esc(r.status || '—') + '</td>' +
      (skippedMode ? '<td><span class="badge ' + (r.dup?'b-amber':'b-red') + '">' + esc(r.reason) + '</span></td>' : '') +
    '</tr>' +
    (open && r.raw ? '<tr><td colspan="' + ncols + '" style="padding:2px 8px">' + mpRawGridHtml(st.headers, r.raw) + '</td></tr>' : '');
    return h;
  }).join('');
  return '<div class="panel"><div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></div>';
}

/* ---------- grouping & import ---------- */
function mpItemFromRec(rec){
  const rw = rec.raw || [];
  const sid  = String(rec.sellerId || mpColByName(rw, MP_SELLER_HDRS) || '').trim();
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

function mpBuildGroups(){
  const st = MP_STATE;
  if(!st || !st.parsed) return [];
  const mode = st.opts.group || 'date';
  const autoP = !st.opts.program || st.opts.program === 'AUTO';
  const byKey = {}, groups = [];
  st.parsed.forEach(function(rec){
    if(rec.skip) return;
    const prog = autoP ? (rec.program || '') : st.opts.program;
    const base = mode==='file' ? 'ALL' : mode==='date' ? (rec.orderDate || 'No date') : (rec.orderNo || ('Line ' + rec.rowNo));
    const key = base + (autoP ? '|P|' + (prog || 'NA') : '');
    if(!byKey[key]){
      byKey[key] = { key:key, program:prog, date:'', dateMax:'', items:[], qty:0, amount:0, orderNos:{}, rawHeaders: st.headers };
      groups.push(byKey[key]);
    }
    const g = byKey[key];
    g.items.push(mpItemFromRec(rec));
    g.qty += rec.qty; g.amount += rec.amount;
    if(rec.orderNo) g.orderNos[rec.orderNo] = 1;
    if(mode==='date'){ g.date = key.indexOf('No date')===0 ? today() : (rec.orderDate || today()); }
    else if(rec.orderDate && (!g.dateMax || rec.orderDate > g.dateMax)) g.dateMax = rec.orderDate;
  });
  groups.forEach(function(g){
    if(mode !== 'date') g.date = g.dateMax || today();
    g.amount = Math.round(g.amount*100)/100;
  });
  return groups;
}

function mpDoImport(){
  const st = MP_STATE;
  mpPreserveOpts();
  if(!userCan('sale','create')) return toast('Create access denied for the Sale module','red');
  const groups = mpBuildGroups();
  if(!groups.length) return toast('Nothing to import — every row is skipped','red');
  const src = mpSource(st.srcKey);
  const customer = String((cboxGet('mp-cust')||'').trim() || st.opts.customer || src.customer);
  const channel  = String((cboxGet('mp-chan')||'').trim() || st.opts.channel || src.channel);
  const pay      = 'Unpaid';   /* the file has no say in it - it is marked on the Sale */
  const batchId  = uid();
  const saleIds = [], saleNos = [], keys = [], programs = [];
  let qty = 0, amount = 0, dMin = '', dMax = '';
  groups.forEach(function(g){
    const program = g.program || '';
    if(program && programs.indexOf(program) < 0) programs.push(program);
    const rec = {
      id: uid(), date: g.date, customer: customer, channel: channel,
      payStatus: pay, payMode: '', invoiceNo: '',
      notes: src.l + (program ? ' ' + program : '') + ' sale report import — ' + st.fileName + ' · ' + g.items.length + ' line' + (g.items.length===1?'':'s'),
      status: 'Open', items: g.items,
      source: { kind:'marketplace-import', marketplace: src.l, program: program, batchId: batchId, fileName: st.fileName, rawHeaders: (g.rawHeaders||st.headers).slice() }
    };
    rec.no = nextNo('sale','SL'); rec.createdAt = Date.now();
    db.sale.push(rec); saleIds.push(rec.id); saleNos.push(rec.no);
    g.items.forEach(function(it){ keys.push(mpDedupeKey(it)); qty += pf(it.qty); amount += pf(it.amount); });
    if(!dMin || g.date < dMin) dMin = g.date;
    if(!dMax || g.date > dMax) dMax = g.date;
  });
  amount = Math.round(amount*100)/100;
  const ok = (st.parsed||[]).filter(function(r){ return !r.skip; });
  const skipped = (st.parsed||[]).length - ok.length;
  if(!Array.isArray(db.saleImports)) db.saleImports = [];
  db.saleImports.unshift({
    id: batchId, at: new Date().toISOString(), marketplace: src.l,
    program: programs.length ? programs.join(' + ') : '',
    fileName: st.fileName,
    sheet: st.sheets && st.sheets[st.sheetIdx] ? st.sheets[st.sheetIdx].name : '',
    rowsTotal: (st.parsed||[]).length, rowsImported: ok.length, rowsSkipped: skipped,
    rawHeaders: st.headers.slice(),
    saleIds: saleIds, keys: keys, qty: qty, amount: amount,
    period: dMin && dMax ? (dMin === dMax ? dMin : dMin + ' → ' + dMax) : ''
  });
  auditPush('Sale', 'Marketplace Import', saleNos.slice(0,10).join(', ') + (saleNos.length>10 ? ' +' + (saleNos.length-10) : ''), [
    'Marketplace: ' + src.l + (programs.length ? ' · ' + programs.join('+') : ''), 'File: ' + st.fileName,
    'Rows imported: ' + ok.length + ' (skipped ' + skipped + ')',
    'Sale records created: ' + saleNos.length,
    'Qty: ' + qty + ' · Amount: ' + fmtINR(amount)
  ]);
  saveDB();
  MP_STATE = null; pageView = null; cur = 'sale';
  toast('Imported ' + fmtNum(ok.length) + ' rows into ' + saleNos.length + ' Sale record' + (saleNos.length===1?'':'s') + (programs.length ? ' (' + programs.join(', ') + ')' : '') + ' — ' + fmtINR(amount), 'green');
  render();
}

/* ---------- import history ---------- */
function mpHistoryHtml(){
  const list = db.saleImports || [];
  if(!list.length){
    return '<div class="panel"><div class="empty"><div class="big">' + ic('inbox',26) + '</div>' +
      '<h3>No marketplace imports yet</h3>' +
      '<p>Import a Myntra Seller Orders / SJIT report, Flipkart or another marketplace export — every import batch is listed here with the Sale records it created.</p>' +
      '<button class="btn btn-primary" onclick="mpShowImportView()">' + ic('plus',16) + 'New Import</button></div></div>';
  }
  const rows = list.map(function(b){
    const live = (b.saleIds||[]).map(function(id){ return db.sale.find(function(s){ return s.id===id; }); }).filter(Boolean);
    const dt = b.at ? new Date(b.at).toLocaleString('en-IN',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
    const chips = live.slice(0,4).map(function(s){
      return '<button type="button" class="btn btn-ghost btn-sm" style="margin:2px 3px 2px 0" onclick="event.stopPropagation();openForm(\'sale\',\'' + s.id + '\')">' + esc(s.no) + (s.source && s.source.program ? ' · ' + esc(s.source.program) : '') + '</button>';
    }).join('') + (live.length > 4 ? '<span class="sub-line">+' + (live.length-4) + ' more</span>' : '');
    return '<tr>' +
      '<td><b>' + esc(b.marketplace||'') + '</b>' + (b.program ? ' <span class="badge b-blue">' + esc(b.program) + '</span>' : '') + '<div class="sub-line">' + esc(dt) + '</div></td>' +
      '<td>' + esc(b.fileName||'—') + (b.sheet ? '<div class="sub-line">Sheet: ' + esc(b.sheet) + '</div>' : '') + (b.period ? '<div class="sub-line">Period: ' + esc(b.period) + '</div>' : '') + '</td>' +
      '<td class="num">' + fmtNum(b.rowsImported||0) + '<div class="sub-line">of ' + fmtNum(b.rowsTotal||0) + ' rows</div></td>' +
      '<td class="num">' + fmtNum(b.qty||0) + '</td>' +
      '<td class="num"><b>' + fmtINR(b.amount||0) + '</b></td>' +
      '<td>' + (live.length ? chips : '<span class="badge b-gray">Records deleted</span>') + '</td>' +
      '<td class="actions-cell no-print" onclick="event.stopPropagation()">' +
        '<button class="btn-icon" title="View imported data (all columns)" onclick="mpViewBatch(\'' + b.id + '\')">' + ic('view',15) + '</button>' +
        '<button class="btn-icon danger" title="Delete batch and its Sale records" onclick="mpDeleteBatch(\'' + b.id + '\')">' + ic('trash',15) + '</button>' +
      '</td></tr>';
  }).join('');
  return '<div class="panel list-panel"><div class="table-wrap"><table><thead><tr>' +
    '<th>Marketplace / Imported</th><th>File</th><th class="num">Rows</th><th class="num">Qty</th><th class="num">Amount</th><th>Sale records created</th><th class="num no-print">Actions</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

function mpViewBatch(id){
  const b = (db.saleImports||[]).find(function(x){ return x.id === id; });
  if(!b) return;
  const recs = (b.saleIds||[]).map(function(i){ return db.sale.find(function(s){ return s.id === i; }); }).filter(Boolean);
  if(!recs.length) return toast('The Sale records of this batch were deleted — the raw data went with them','red');
  const headers = (recs[0].source && recs[0].source.rawHeaders) || b.rawHeaders || [];
  const rows = [];
  recs.forEach(function(s){ (s.items||[]).forEach(function(it){ if(it.raw) rows.push(it); }); });
  let body;
  if(!headers.length || !rows.length){
    body = '<p class="sub-line">This batch was imported before full-column capture was added, so only the mapped fields are stored.</p>';
  } else {
    rows.sort(function(a,b2){ return (a.rowNo||0) - (b2.rowNo||0); });
    const MAX = 400, shown = rows.slice(0, MAX);
    body = '<div style="overflow:auto;max-height:62vh;border:1px solid var(--line);border-radius:10px"><table><thead><tr><th>#</th>' +
      headers.map(function(h){ return '<th style="white-space:nowrap">' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      shown.map(function(it, i){
        return '<tr><td>' + (i+1) + '</td>' + it.raw.map(function(v){ return '<td style="white-space:nowrap">' + esc(v==null||v===''?'':v) + '</td>'; }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      (rows.length > MAX ? '<div class="hint" style="margin-top:6px">Showing the first ' + MAX + ' of ' + fmtNum(rows.length) + ' rows — all rows are stored on the Sale records.</div>' : '');
  }
  openDialog({
    title: 'Imported data — ' + (b.fileName || 'report'),
    message: '<div class="sub-line" style="margin-bottom:8px">' + esc(b.marketplace||'') + (b.program ? ' · ' + esc(b.program) : '') +
      ' · ' + fmtNum(rows.length) + ' rows × ' + headers.length + ' columns — exactly as in the Excel file</div>' + body,
    confirmText: 'Close', hideCancel: true
  });
}

function mpDeleteBatch(id){
  const b = (db.saleImports||[]).find(function(x){ return x.id === id; });
  if(!b) return;
  openDialog({
    title: 'Delete import batch',
    message: 'Delete the <span class="dlg-strong">' + esc(b.fileName || 'import') + '</span> batch (' + esc(b.marketplace||'') + (b.program ? ' · ' + esc(b.program) : '') + ')?<br>This also deletes the <span class="dlg-strong">' + (b.saleIds||[]).length + ' Sale record(s)</span> it created. This cannot be undone.',
    confirmText: 'Delete batch', danger: true,
    onConfirm: function(){
      const ids = b.saleIds || [];
      db.sale = db.sale.filter(function(s){ return ids.indexOf(s.id) < 0; });
      db.saleImports = (db.saleImports||[]).filter(function(x){ return x.id !== id; });
      auditPush('Sale', 'Import Deleted', b.fileName || id, ['Marketplace: ' + (b.marketplace||''), 'Sale records removed: ' + ids.length]);
      saveDB(); toast('Import batch deleted along with its Sale records', 'green'); render();
    }
  });
}

/* ---------- sample report (for testing) ---------- */
function mpSampleXlsx(headers, rows, sheetName){
  const files = {};
  files['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  files['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xesc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
  files['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  files['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303030"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>';
  files['xl/worksheets/sheet1.xml'] = xsheet(headers, rows, []);
  return xzip(files);
}
function mpDownloadSample(){
  const headers = ['order id fk','order line id','po_type','created on','style id','seller sku code','style name','brand','size','order status','delivered on','total mrp','discount','final amount'];
  const rows = [
    ['6008985479','11374212590','SJIT','2026-09-01 10:12:00.000','39432272','KEN-SH-1001-BLK-M','KEN Cotton Casual Shirt Black','KEN','M','C','2026-09-03 15:17:26.000','1299','400','879'],
    ['6008985479','11374212591','SJIT','2026-09-01 10:12:00.000','39432272','KEN-SH-1001-BLK-L','KEN Cotton Casual Shirt Black','KEN','L','C','2026-09-03 15:17:26.000','1299','400','879'],
    ['6008086339','11372769147','PPMP','2026-09-02 07:48:00.000','40470072','SZT-MSHIRT-01FA-2XL','Sztori Men Plus Size Tartan Check Shirt','Sztori','46','SH','','2349','1721','628'],
    ['6005478263','11368353219','FBM','2026-09-02 04:55:00.000','40618559','RDS-WSHIRT-01K-XL','Roadster Cotton Button-Down Collar Shirts','Roadster','XL','C','2026-09-05 13:16:12.000','1799','1371','428'],
    ['6014043106','11382615900','FBM','2026-09-03 04:32:00.000','41113280','RDS-WSHIRT-O1S-S','Roadster Striped Cotton Spread Collar Shirt','Roadster','S','RTO','','1799','1349','450'],
    ['6013135879','11381160101','PPMP','2026-09-04 15:10:00.000','42852480','MNH-KURTA-3305-M','Mast & Harbour Kurta Set Maroon','Mast & Harbour','M','C','2026-09-07 20:31:38.000','2199','700','1479']
  ];
  downloadBytes(mpSampleXlsx(headers, rows, 'Seller Orders Report'), 'Myntra_Seller_Orders_Report_Sample.xlsx');
  toast('Sample Myntra Seller Orders report downloaded (SJIT + PPMP + FBM rows) — upload it back to test', 'green');
}

/* ================= SALE DASHBOARD (interactive, cross-filtered) ================= */
let SDB_RANGE = 0; /* 0 = all data, else days */
/* one filter bag, shared by the Sale Dashboard and the Sale Numbers view */
const SDB_EMPTY = { day:'', prog:'', brand:'', status:'', city:'', state:'', article:'', reason:'' };
let SDB_F = Object.assign({}, SDB_EMPTY);
let SDB_STYLES = [];
let SDB_FRSTYLES = [];
let SDB_ALL_STYLE = [];   /* every style in the filtered view — feeds the Total row */
let SDB_ALL_FR = [];      /* every F / RTO style in the filtered view */
const SDB_DIMS = ['day','prog','brand','status','city','state','article','reason'];
/* a dimension is a SET of picked values: a click adds the row, clicking it again takes it
   back out, and '' or [] both mean "this dim is not filtering".  Single-value writes
   (SDB_F.brand = 'Alpha') keep working because sdbList() accepts both shapes. */
/* hooks the test probes drive the marketplace-import wizard through; nothing in the app
   calls them, so the reachability pass is told to leave `__`-prefixed names alone */
function __mpSetState(s){ MP_STATE = Object.assign({ view:'import', step:2, srcKey:'myntra', sheets:[{name:'T',rows:[]}], sheetIdx:0, headerRowIdx:0, statusCounts:{} }, s); }
function __mpGetState(){ return MP_STATE; }
function __mpReparse(){ mpReparse(); return MP_STATE.parsed; }
function __mpBuildGroups(){ return mpBuildGroups(); }

function sdbList(dim){
  const v = SDB_F[dim];
  if(Array.isArray(v)) return v.slice();
  return (v === '' || v == null) ? [] : [String(v)];
}
function sdbAny(dim){ return sdbList(dim).length > 0; }
function sdbHas(dim, val){ return sdbList(dim).indexOf(String(val)) > -1; }
function sdbCount(dim){ return sdbList(dim).length; }
function sdbValText(dim){ return sdbList(dim).join(', '); }
function sdbClearDim(dim){ SDB_F[dim] = ''; render(); }
const SDB_STATUS_FULL = {
  'C':'Completed','SH':'Shipped','PK':'Packed','WP':'Waiting for Pickup','RTO':'Return to Origin',
  'F':'Failed','L':'Lost in Transit','CA':'Cancelled','CX':'Cancelled','LD':'Lost','RT':'Returned',
  'DL':'Delivered','RFR':'Ready for Return','IC':'In Cart','BK':'Booked'
};
function sdbStatusKey(code){
  const c = String(code||'').toUpperCase();
  return (c === 'F' || c === 'RTO') ? 'F / RTO' : (c || '—');
}
function sdbStatusFull(key){
  if(key === 'F / RTO') return 'F / RTO — Failed / Return to Origin';
  const f = SDB_STATUS_FULL[key];
  return f ? key + ' — ' + f : String(key||'—');
}
function sdbKeyOf(dim, x){
  if(dim === 'day') return x.date || 'No date';
  if(dim === 'prog') return x.it.program || '—';
  if(dim === 'brand') return x.it.brand || '—';
  if(dim === 'status') return sdbStatusKey(x.it.mpStatus);
  if(dim === 'article') return x.it.articleType || '—';
  /* the state bucket is the expensive one: the same wrapper is reused across every chart,
     so the answer is worked out once per line, not once per chart */
  if(dim === 'state'){
    if(x._st === undefined) x._st = snStateOf(x.it, x.rec && x.rec.source && x.rec.source.rawHeaders);
    return x._st;
  }
  if(dim === 'reason') return x.it.cancelReason || '—';
  return x.it.city || '—';
}
function sdbFiltered(base, except){
  return base.filter(function(x){
    for(let i=0;i<SDB_DIMS.length;i++){
      const d = SDB_DIMS[i];
      if(d === except || !sdbAny(d)) continue;
      if(!sdbHas(d, sdbKeyOf(d, x))) return false;   /* a line is kept if its value is one of the picked ones */
    }
    return true;
  });
}
function openSaleDashboard(){
  if(!userCan('sale','view')) return toast('Access denied for this module','red');
  cur = 'sale'; pageView = { kind:'saledashboard' };
  render();
}
function sdbToggle(dim, val){
  val = String(val == null ? '' : val);
  const cur = sdbList(dim);
  const i = cur.indexOf(val);
  if(i > -1) cur.splice(i, 1); else cur.push(val);
  SDB_F[dim] = cur.length ? cur : '';        /* empty again means off, not an empty array */
  render();
}
function sdbClear(){
  SDB_F = Object.assign({}, SDB_EMPTY);
  render();
}
/* rg = explicit window (comparison period) > the shared filter > legacy day cutoff */
function sfWindow(rg){
  if(rg) return { from: rg.from || '', to: rg.to || '' };
  if(sfActive()) return { from: SDATE.from, to: SDATE.to };
  if(SDB_RANGE){
    const d = new Date(); d.setDate(d.getDate() - SDB_RANGE);
    return { from: d.toISOString().slice(0,10), to: '' };
  }
  return null;
}
/* rg = explicit {from,to} window (used for the comparison period);
   with no argument the shared Sale date filter (SDATE) decides */
function sdbCollect(rg){
  const w = sfWindow(rg);
  const from = w ? w.from : '', to = w ? w.to : '';
  const items = [];
  (db.sale||[]).forEach(function(s){
    (s.items||[]).forEach(function(it){
      const dt = it.orderDate || s.date || '';
      if(from && dt && dt < from) return;
      if(to && dt && dt > to) return;
      items.push({ it:it, rec:s, date:dt });
    });
  });
  return items;
}
function sfClear(){
  SDATE.from = ''; SDATE.to = ''; SDATE.preset = 'all';
  SDB_RANGE = 0;
  render();
}
/* an empty window must not tell someone to import data they already have */
function sdbEmptyHtml(what){
  const hasAny = (db.sale||[]).some(function(s){ return (s.items||[]).length || s.date; });
  const w = sfWindow();
  if(hasAny && w){
    const txt = (w.from && w.to) ? rdpRangeLabel(w.from, w.to) : (w.to ? 'up to ' + rdpPrettyLong(w.to) : 'from ' + rdpPrettyLong(w.from));
    return '<div class="panel"><div class="empty"><div class="big">' + ic('filter',26) + '</div><h3>Nothing in ' + esc(txt) + '</h3>' +
      '<p>The sale data is there, it just falls outside ' + esc(rdpLabel(SDATE)) + '. Clear the window to see all of it.</p>' +
      '<button class="btn btn-primary" onclick="sfClear()">' + ic('back',16) + 'Show all data</button> ' +
      '<button class="btn btn-ghost" onclick="openSaleImport()">' + ic('inbox',16) + 'Import a report</button></div></div>';
  }
  return '<div class="panel"><div class="empty"><div class="big">' + ic('inbox',26) + '</div><h3>No sale data yet</h3><p>' + what + '</p><button class="btn btn-primary" onclick="openSaleImport()">' + ic('plus',16) + 'Import a report</button></div></div>';
}
function sfToolbarHtml(n){
  /* no Clear dates button: the range chip itself is the way back (see rdpTriggerHtml) */
  return rdpTriggerHtml('sfTrig' + n, true);
}
function sdbSum(list, f){ return list.reduce(function(a,x){ return a + (pf(x.it[f])||0); }, 0); }
function sdbGroup(list, keyFn){
  const g = {};
  list.forEach(function(x){
    const k = String(keyFn(x) || '—') || '—';
    if(!g[k]) g[k] = { n:0, qty:0, amt:0 };
    g[k].n++; g[k].qty += pf(x.it.qty)||0; g[k].amt += pf(x.it.amount)||0;
  });
  return Object.keys(g).map(function(k){ return { l:k, n:g[k].n, qty:g[k].qty, amt:Math.round(g[k].amt*100)/100 }; });
}
function sdbTop(list, keyFn, n){
  return sdbGroup(list, keyFn).sort(function(a,b){ return b.amt - a.amt; }).slice(0, n);
}
function sdbHBars(rows, color, dim){
  const max = Math.max.apply(null, [1].concat(rows.map(function(r){ return r.amt; })));
  return rows.map(function(r){
    const w = Math.max(2, Math.round(r.amt / max * 100));
    const on = sdbHas(dim, r.l);
    return '<div class="sdb-row' + (on?' on':'') + '" style="display:grid;grid-template-columns:150px 1fr 150px;gap:10px;align-items:center;margin:3px 0" title="Click to filter by ' + esc(r.l) + ', click again to remove" onclick="sdbToggle(\'' + dim + '\',\'' + snJsArg(r.l) + '\')">' +
      '<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(r.d || r.l) + '">' + esc(r.d || r.l) + '</div>' +
      '<div style="background:#eef0ee;border-radius:6px;height:16px"><div style="width:' + w + '%;background:' + (on ? '#d97706' : color) + ';height:16px;border-radius:6px"></div></div>' +
      '<div class="num" style="font-size:12px;font-weight:700">' + fmtINR(r.amt) + ' <span class="sub-line">· ' + fmtNum(r.qty) + ' pcs</span></div></div>';
  }).join('') || '<div class="sub-line">No data</div>';
}
function sdbDayChart(list){
  const byDay = {};
  list.forEach(function(x){ const d = x.date || 'No date'; byDay[d] = (byDay[d]||0) + (pf(x.it.amount)||0); });
  const days = Object.keys(byDay).sort();
  if(!days.length) return '<div class="sub-line">No dated sales yet</div>';
  const W = 720, pad = 6, fs = 9, n = days.length, plotH = 130;
  const max = Math.max.apply(null, [1].concat(days.map(function(d){ return byDay[d]; })));
  let vLen = 0, dLen = 0;
  days.forEach(function(d){
    vLen = Math.max(vLen, ('₹' + fmtNum(Math.round(byDay[d]*100)/100)).length);
    dLen = Math.max(dLen, String(d).length);
  });
  const span = (W - pad*2) / n;
  const CH = 0.62 * fs;                 /* rough glyph width, used to spot collisions */
  const rotV = (n > 1) && (CH * vLen > span - 2);
  const rotD = (n > 1) && (CH * dLen > span - 2);
  const axisH = fs + 5;
  const vBand = rotV ? Math.min(84, Math.ceil(CH * vLen) + 7) : axisH;
  const dBand = rotD ? Math.min(56, Math.ceil(CH * dLen) + 7) : axisH;
  const H = 4 + vBand + plotH + dBand;
  const plotBot = H - dBand, plotTop = 4 + vBand;
  const bw = Math.max(3, Math.min(70, Math.floor(span) - (n > 1 ? 4 : 0)));
  /* every day is labelled: horizontal when it cannot collide, otherwise rotated 90deg */
  let bars = '', dates = '';
  days.forEach(function(d, i){
    const cx = pad + i * span + span/2, x = cx - bw/2;
    const v = byDay[d], y = plotBot - Math.max(2, Math.round((v/max) * Math.max(24, plotBot - plotTop)));
    const on = sdbHas('day', d);
    const vRot = rotV ? ' transform="rotate(-90 ' + cx + ' ' + (y - 3) + ')"' : '';
    const dRot = rotD ? ' transform="rotate(-90 ' + cx + ' ' + (plotBot + dBand - 2) + ')"' : '';
    const aV = rotV ? 'start' : 'middle', aD = rotD ? 'start' : 'middle';
    const vTxt = '₹' + fmtNum(Math.round(v));
    const dTxt = n <= 10 ? String(d) : String(d).slice(5);
    bars += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + (plotBot - y) + '" rx="2" fill="' + (on ? '#d97706' : '#0c5132') + '" onclick="sdbToggle(\'day\',\'' + snJsArg(d) + '\')"><title>' + esc(String(d) + ' — ₹' + fmtNum(Math.round(v*100)/100) + ' · click to filter') + '</title></rect>';
    bars += '<text x="' + cx + '" y="' + (y - 3) + '"' + vRot + ' font-size="' + fs + '" font-weight="700" text-anchor="' + aV + '" fill="#333">' + esc(vTxt) + '</text>';
    dates += '<text x="' + cx + '" y="' + (rotD ? plotBot + dBand - 2 : plotBot + fs + 3) + '"' + dRot + ' font-size="' + fs + '" text-anchor="' + aD + '" fill="#777">' + esc(dTxt) + '</text>';
  });
  const tot = Math.round(days.reduce(function(a,d){ return a + byDay[d]; }, 0)*100)/100;
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto" role="img" aria-label="Sale value by day, ' + n + ' days, each labelled">' +
    '<title>' + esc(n + (n === 1 ? ' day' : ' days') + ' · total ₹' + fmtNum(tot)) + '</title>' +
    '<line x1="' + pad + '" y1="' + plotBot + '" x2="' + (W - pad) + '" y2="' + plotBot + '" stroke="var(--line,#ddd)" stroke-width="1"/>' +
    bars + dates + '</svg>';
}
function sdbStyleLink(l){
  return /^\d{5,}$/.test(l)
    ? '<a href="https://www.myntra.com/' + esc(l) + '" target="_blank" rel="noopener" style="color:var(--blue,#2563eb);font-weight:700;text-decoration:underline" title="Open style ' + esc(l) + ' on Myntra" onclick="event.stopPropagation()">' + esc(l) + '</a>'
    : esc(l);
}
function sdbDrillFR(i){
  const label = SDB_FRSTYLES[i]; if(label == null) return;
  const rows = sdbFiltered(sdbCollect(), null).filter(function(x){
    const c = String(x.it.mpStatus||'').toUpperCase();
    return (c === 'F' || c === 'RTO') && (x.it.styleCode || x.it.desc || x.it.sku || '') === label;
  });
  const body = '<div style="overflow:auto;max-height:60vh;border:1px solid var(--line);border-radius:10px"><table><thead><tr><th>Order No</th><th>Date</th><th>Size</th><th>City</th><th>Status</th><th>Reason</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>' +
    rows.map(function(x){
      return '<tr><td>' + esc(x.it.orderNo || '—') + '</td><td>' + esc(x.date || '—') + '</td><td>' + esc(x.it.size || '—') + '</td><td>' + esc(x.it.city || '—') + '</td><td>' + esc(x.it.mpStatus || '—') + '</td><td>' + esc(x.it.cancelReason || '—') + '</td><td class="num">' + fmtNum(x.it.qty) + '</td><td class="num"><b>' + fmtINR(x.it.amount) + '</b></td></tr>';
    }).join('') + '</tbody></table></div>';
  openDialog({ title: 'F / RTO orders — ' + label, hideCancel: true, message: '<div class="sub-line" style="margin-bottom:8px">' + fmtNum(rows.length) + ' failed / returned line' + (rows.length===1?'':'s') + ' · ' + fmtINR(Math.round(rows.reduce(function(a,x){return a+pf(x.it.amount);},0)*100)/100) + '</div>' + body, confirmText: 'Close' });
}
function sdbDrill(i){
  const label = SDB_STYLES[i]; if(label == null) return;
  const rows = sdbFiltered(sdbCollect(), null).filter(function(x){ return (x.it.styleCode || x.it.desc || x.it.sku || '') === label || (x.it.desc || '') === label; });
  const body = '<div style="overflow:auto;max-height:60vh;border:1px solid var(--line);border-radius:10px"><table><thead><tr><th>Order No</th><th>Date</th><th>Size</th><th>City</th><th>Status</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>' +
    rows.map(function(x){
      return '<tr><td>' + esc(x.it.orderNo || '—') + '</td><td>' + esc(x.date || '—') + '</td><td>' + esc(x.it.size || '—') + '</td><td>' + esc(x.it.city || '—') + '</td><td>' + esc(x.it.mpStatus || '—') + '</td><td class="num">' + fmtNum(x.it.qty) + '</td><td class="num"><b>' + fmtINR(x.it.amount) + '</b></td></tr>';
    }).join('') + '</tbody></table></div>';
  openDialog({ title: 'Orders — ' + label, hideCancel: true, message: '<div class="sub-line" style="margin-bottom:8px">' + fmtNum(rows.length) + ' line' + (rows.length===1?'':'s') + ' · ' + fmtINR(Math.round(rows.reduce(function(a,x){return a+pf(x.it.amount);},0)*100)/100) + '</div>' + body, confirmText: 'Close' });
}
/* Bold TOTAL row for the style tables. `rows` is the full grouped set in the
   current filtered view (not just the top 10 shown), `shown` is what's on screen. */
function sdbTotalRow(rows, shown){
  rows = rows || [];
  let q = 0, a = 0;
  rows.forEach(function(s){ q += pf(s.qty)||0; a += pf(s.amt)||0; });
  const label = (shown != null && rows.length > shown)
    ? 'Total — all ' + fmtNum(rows.length) + ' styles (shown: top ' + shown + ')'
    : 'Total — ' + fmtNum(rows.length) + (rows.length === 1 ? ' style' : ' styles');
  return '<tfoot><tr class="tot-row"><td colspan="5" style="font-weight:800">' + label + '</td>' +
    '<td class="num">' + fmtNum(q) + '</td><td class="num"><b>' + fmtINR(Math.round(a*100)/100) + '</b></td></tr></tfoot>';
}
function renderSaleDashboard(){
  $('tb-title').textContent = 'Sale Dashboard';
  $('tb-sub').innerHTML = 'Interactive marketplace analytics — click any bar, chip or chart column to cross-filter';
  $('tb-actions').innerHTML =
    '<button class="btn btn-ghost" onclick="pageView=null;cur=\'sale\';render()">' + ic('back',16) + 'Back to Sale</button>' +
    sfToolbarHtml('Dash') +
    '<button class="btn btn-ghost" onclick="openSaleNumbers()">' + ic('order',16) + 'Sale Numbers</button>' +
    '<button class="btn btn-primary" onclick="openSaleImport()">' + ic('inbox',16) + 'Import report</button>';
  const base = sdbCollect();
  if(!base.length){
    $('content').innerHTML = sdbEmptyHtml('Import a Myntra Seller Orders / SJIT report and the dashboard lights up with programs, brands, cities and daily sales.');
    return;
  }
  const all = sdbFiltered(base, null);
  const byDayL   = sdbFiltered(base, 'day');
  const byProgL  = sdbFiltered(base, 'prog');
  const byBrandL = sdbFiltered(base, 'brand');
  const byStatL  = sdbFiltered(base, 'status');
  const byCityL  = sdbFiltered(base, 'city');

  const amt = Math.round(sdbSum(all,'amount')*100)/100;
  const qty = sdbSum(all,'qty');
  const orders = {}; all.forEach(function(x){ if(x.it.orderNo) orders[x.it.orderNo] = 1; });
  const orderN = Object.keys(orders).length;
  const rto = all.filter(function(x){ return /rto/i.test(x.it.mpStatus||''); }).length;
  const canc = all.filter(function(x){ return /cancel/i.test(x.it.mpStatus||'') || (x.it.cancelReason||'') !== ''; }).length;
  const byProg = sdbGroup(byProgL, function(x){ return sdbKeyOf('prog',x); }).sort(function(a,b){ return b.amt - a.amt; });
  const byBrand = sdbTop(byBrandL, function(x){ return sdbKeyOf('brand',x); }, 8);
  const styleMap = {};
  all.forEach(function(x){
    const k = x.it.styleCode || x.it.desc || x.it.sku || '';
    if(!k) return;
    if(!styleMap[k]) styleMap[k] = { l:k, name:'', brand:'', article:'', n:0, qty:0, amt:0 };
    styleMap[k].n++; styleMap[k].qty += pf(x.it.qty)||0; styleMap[k].amt += pf(x.it.amount)||0;
    if(!styleMap[k].name) styleMap[k].name = x.it.desc || '';
    if(!styleMap[k].brand) styleMap[k].brand = x.it.brand || '';
    if(!styleMap[k].article) styleMap[k].article = x.it.articleType || '';
  });
  const byStyleAll = Object.keys(styleMap).map(function(k){ const s = styleMap[k]; s.amt = Math.round(s.amt*100)/100; return s; })
    .sort(function(a,b){ return b.amt - a.amt; });
  const byStyle = byStyleAll.slice(0, 10);
  SDB_STYLES = byStyle.map(function(s){ return s.l; });
  SDB_ALL_STYLE = byStyleAll;
  const frList = all.filter(function(x){ const c = String(x.it.mpStatus||'').toUpperCase(); return c === 'F' || c === 'RTO'; });
  const frMap = {};
  frList.forEach(function(x){
    const k = x.it.styleCode || x.it.desc || x.it.sku || '';
    if(!k) return;
    if(!frMap[k]) frMap[k] = { l:k, article:'', brand:'', qty:0, amt:0 };
    frMap[k].qty += pf(x.it.qty)||0; frMap[k].amt += pf(x.it.amount)||0;
    if(!frMap[k].article) frMap[k].article = x.it.articleType || '';
    if(!frMap[k].brand) frMap[k].brand = x.it.brand || '';
  });
  const frStylesAll = Object.keys(frMap).map(function(k){ const s = frMap[k]; s.amt = Math.round(s.amt*100)/100; return s; })
    .sort(function(a,b){ return b.amt - a.amt; });
  const frStyles = frStylesAll.slice(0, 10);
  SDB_FRSTYLES = frStyles.map(function(s){ return s.l; });
  SDB_ALL_FR = frStylesAll;
  const byCity = sdbTop(byCityL, function(x){ return sdbKeyOf('city',x); }, 8).filter(function(r){ return r.l !== '—'; });
  const byArticle = sdbTop(sdbFiltered(base, 'article'), function(x){ return sdbKeyOf('article',x); }, 8).filter(function(r){ return r.l !== '—'; });
  const byStatus = sdbGroup(byStatL, function(x){ return sdbKeyOf('status',x); }).sort(function(a,b){ return b.n - a.n; })
    .map(function(s){ s.d = sdbStatusFull(s.l); return s; });
  const byReason = sdbGroup(sdbFiltered(base, 'reason').filter(function(x){ return (x.it.cancelReason||'') !== ''; }), function(x){ return x.it.cancelReason; }).sort(function(a,b){ return b.n - a.n; }).slice(0,8);

  const active = SDB_DIMS.filter(function(d){ return sdbAny(d); });
  let h = '<style>.sdb-row{cursor:pointer;border-radius:8px;padding:3px 6px}.sdb-row:hover{background:#f2f4f2}.sdb-row.on{background:#fdf3e3;outline:2px solid #d97706}.sdb-chip{cursor:pointer}.sdb-chip:hover{opacity:.85}.sdb-chip.on{outline:2px solid #d97706}svg rect{cursor:pointer}svg rect:hover{opacity:.8}</style>';

  if(active.length){
    h += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px"><span class="sub-line">Filters:</span>' +
      active.map(function(d){ return '<span class="badge b-amber">' + esc(d) + (sdbCount(d) > 1 ? ' (' + sdbCount(d) + ')' : '') + ': ' + esc(sdbValText(d)) + ' <b style="cursor:pointer" title="Clear this filter" onclick="sdbClearDim(\'' + d + '\')">✕</b></span>'; }).join('') +
      '<button class="btn btn-ghost btn-sm" onclick="sdbClear()">Clear all</button></div>';
  }

  h += '<div class="stats">' +
    '<div class="stat green"><div class="lbl">Sale value</div><div class="val">' + fmtINR(amt) + '</div><div class="extra">' + fmtNum(all.length) + ' line' + (all.length===1?'':'s') + (active.length ? ' (filtered)' : '') + '</div></div>' +
    '<div class="stat"><div class="lbl">Quantity</div><div class="val">' + fmtNum(qty) + ' <small>pcs</small></div><div class="extra">avg ' + fmtINR(qty ? Math.round(amt/qty) : 0) + ' / pc</div></div>' +
    '<div class="stat"><div class="lbl">Orders</div><div class="val">' + fmtNum(orderN) + '</div><div class="extra">' + fmtINR(orderN ? Math.round(amt/orderN) : 0) + ' / order</div></div>' +
  '</div>';

  h += '<div class="sec">Sales by day — click a column to filter</div><div class="panel" style="padding:12px">' + sdbDayChart(byDayL) + '</div>';

  h += '<div class="grid2" style="margin-top:14px"><div><div class="sec">Program split (po_type) — click to filter, several at once</div><div class="panel" style="padding:12px">' + sdbHBars(byProg, '#29845a', 'prog') + '</div>' +
       '<div class="sec">Top brands — click to filter, several at once</div><div class="panel" style="padding:12px">' + sdbHBars(byBrand, '#3f6fb5', 'brand') + '</div>' +
       '<div class="sec">Product type wise — click to filter, several at once</div><div class="panel" style="padding:12px">' + (byArticle.length ? sdbHBars(byArticle, '#8a4fb5', 'article') : '<div class="sub-line">No product type data</div>') + '</div></div>' +
       '<div><div class="sec">Order status mix — click to filter, several at once</div><div class="panel" style="padding:12px">' +
         sdbHBars(byStatus, '#7c5cbf', 'status') +
         (function(){
           const tAmt = Math.round(byStatus.reduce(function(a,s){ return a + s.amt; },0)*100)/100;
           const tQty = byStatus.reduce(function(a,s){ return a + s.qty; },0);
           return '<div style="display:grid;grid-template-columns:150px 1fr 150px;gap:10px;align-items:center;margin-top:8px;border-top:2px solid var(--line);padding-top:8px">' +
             '<div style="font-size:12px;font-weight:800">Total</div><div></div>' +
             '<div class="num" style="font-size:12px;font-weight:800">' + fmtINR(tAmt) + ' <span class="sub-line">· ' + fmtNum(tQty) + ' pcs</span></div></div>';
         })() +
       '</div>' +
       '<div class="sec">Top cities — click to filter, several at once</div><div class="panel" style="padding:12px">' + (byCity.length ? sdbHBars(byCity, '#b5653f', 'city') : '<div class="sub-line">No city data</div>') + '</div>' +
       (byReason.length ? '<div class="sec">Cancellation / return reasons — click to filter, several at once</div><div class="panel" style="padding:12px">' + byReason.map(function(r){
         const on = sdbHas('reason', r.l);
         return '<div class="sdb-row' + (on?' on':'') + '" style="display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:12px;margin:2px 0" title="Click to filter the whole dashboard by this reason, again to remove" onclick="sdbToggle(\'reason\',\'' + snJsArg(r.l) + '\')"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.l) + '</span><b style="white-space:nowrap">' + fmtNum(r.n) + ' <span class="sub-line">· ' + fmtINR(r.amt) + '</span></b></div>';
       }).join('') + '</div>' : '') +
       '</div></div>';

  h += '<div class="sec">Top styles by value — click a row for order drill-down · style id opens on Myntra</div><div class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>#</th><th>Style ID</th><th>Style / product</th><th>Product type</th><th>Brand</th><th class="num">Pcs</th><th class="num">Value</th></tr></thead><tbody>' +
    byStyle.map(function(s, i){
      const link = sdbStyleLink(s.l);
      return '<tr style="cursor:pointer" title="Click to see the orders behind this style" onclick="sdbDrill(' + i + ')"><td>' + (i+1) + '</td><td>' + link + '</td><td style="max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.name || s.l) + '</td><td>' + esc(s.article || '—') + '</td><td>' + esc(s.brand || '—') + '</td><td class="num">' + fmtNum(s.qty) + '</td><td class="num"><b>' + fmtINR(s.amt) + '</b></td></tr>';
    }).join('') + '</tbody>' + sdbTotalRow(SDB_ALL_STYLE, byStyle.length) + '</table></div></div>';

  h += '<div class="sec">F / RTO wise — Failed / Return to Origin · click a row for return drill-down</div>' +
    '<div class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>#</th><th>Style ID</th><th class="num">Pcs</th><th>Product type</th><th>Brand</th><th class="num">Value</th></tr></thead><tbody>' +
    (frStyles.length ? frStyles.map(function(s, i){
      return '<tr style="cursor:pointer" title="Click to see the failed / returned orders behind this style" onclick="sdbDrillFR(' + i + ')"><td>' + (i+1) + '</td><td>' + sdbStyleLink(s.l) + '</td><td class="num">' + fmtNum(s.qty) + '</td><td>' + esc(s.article || '—') + '</td><td>' + esc(s.brand || '—') + '</td><td class="num"><b>' + fmtINR(s.amt) + '</b></td></tr>';
    }).join('') : '<tr><td colspan="6" class="sub-line" style="padding:10px">No F / RTO rows in the current view</td></tr>') +
    '</tbody>' + (frStyles.length ? sdbTotalRow(SDB_ALL_FR, frStyles.length) : '') + '</table></div></div>';

  $('content').innerHTML = h;
}

/* ================= SALE NUMBERS (figures only — no charts, no bars, no colour) =================
   Every figure is a full number: Indian grouping, rounded to whole rupees, no ₹ symbol and no
   K / L / Cr short form, so the columns can be read, compared and copied straight into a sheet. */
const SN_COLS = [ {h:'Qty',k:'qty'}, {h:'Value',k:'amt'}, {h:'Share %',k:'share',pct:1} ];
function snInt(n){ return Math.round(pf(n)).toLocaleString('en-IN', {maximumFractionDigits:0}); }
function snPct(part, whole){ const w = pf(whole); return (w ? (pf(part)/w*100) : 0).toFixed(1); }
/* Sale Numbers groups by state, but the Myntra report only carries a city, so the city is
   rolled up through this map - state capitals plus well-known cities, and names shared by two
   states are left out rather than guessed. A genuine "state" column in the imported file always
   wins. An unmapped city is kept, in its own bucket - never dropped - and each state row lists
   the cities behind it, so a gap in the map is visible and can be extended by adding
   "<city>: '<State>'" below. */
const SN_NO_CITY = ['', 'na', 'n/a', 'nil', 'none', 'unknown', '-', '—', 'not available', 'not applicable', 'no city', 'others'];
/* Every way a place name is written in a shipping address, resolved to a state: the exact
   letters (SN_CITY_STATE) and a fold that ignores doubled letters and trailing a’s, so
   "Gautam Buddha Nagar" and "Gautam Budh Nagar" both land in Uttar Pradesh. Names that two
   states legitimately share are absent from both - those rows say "State not mapped" and
   list the cities, rather than guessing. */
const SN_CITY_STATE = {
  /* Arunachal Pradesh */ aalo: 'Arunachal Pradesh', 
  /* Gujarat */ abdasa: 'Gujarat', 
  /* Assam */ abhayapuri: 'Assam', 
  /* Punjab */ abohar: 'Punjab', 
  /* Telangana */ achampet: 'Telangana', 
  /* Haryana */ adampur: 'Haryana', 
  /* Telangana */ adilabad: 'Telangana', 
  /* Kerala */ adimali: 'Kerala', 
  /* Andhra Pradesh */ adoni: 'Andhra Pradesh', 
  /* Kerala */ adoor: 'Kerala', 
  /* Karnataka */ afzalpur: 'Karnataka', 
  /* Madhya Pradesh */ agar: 'Madhya Pradesh', agarmalwa: 'Madhya Pradesh', 
  /* Tripura */ agartala: 'Tripura', 
  /* Uttar Pradesh */ agra: 'Uttar Pradesh', 
  /* Gujarat */ ahmedabad: 'Gujarat', 
  /* Maharashtra */ ahmednagar: 'Maharashtra', 
  /* Gujarat */ ahwa: 'Gujarat', 
  /* West Bengal */ aistala: 'West Bengal', 
  /* Mizoram */ aizawl: 'Mizoram', 
  /* West Bengal */ ajaygarh: 'West Bengal', 
  /* Rajasthan */ ajmer: 'Rajasthan', 
  /* Punjab */ ajnala: 'Punjab', 
  /* Uttar Pradesh */ akbarpur: 'Uttar Pradesh', 
  /* Maharashtra */ akola: 'Maharashtra', 
  /* Telangana */ alair: 'Telangana', 
  /* Karnataka */ aland: 'Karnataka', 
  /* Kerala */ alappuzha: 'Kerala', 
  /* Bihar */ alauli: 'Bihar', 
  /* Maharashtra */ alibag: 'Maharashtra', 
  /* Uttar Pradesh */ aligarh: 'Uttar Pradesh', 
  /* West Bengal */ alipore: 'West Bengal', alipurduar: 'West Bengal', 
  /* Madhya Pradesh */ alirajpur: 'Madhya Pradesh', 
  /* Andhra Pradesh */ allagadda: 'Andhra Pradesh', 
  /* Uttar Pradesh */ allahabad: 'Uttar Pradesh', 
  /* Andhra Pradesh */ allurisitharamaraju: 'Andhra Pradesh', 
  /* Uttarakhand */ almora: 'Uttarakhand', 
  /* Arunachal Pradesh */ along: 'Arunachal Pradesh', 
  /* Kerala */ aluva: 'Kerala', 
  /* Rajasthan */ alwar: 'Rajasthan', 
  /* Andhra Pradesh */ amalapuram: 'Andhra Pradesh', 
  /* Bihar */ amarpur: 'Bihar', 
  /* Himachal Pradesh */ amb: 'Himachal Pradesh', 
  /* Haryana */ ambala: 'Haryana', 
  /* Kerala */ ambalappuzha: 'Kerala', 
  /* Tamil Nadu */ ambasamudram: 'Tamil Nadu', 
  /* Tripura */ ambassa: 'Tripura', 
  /* Uttar Pradesh */ ambedkarnagar: 'Uttar Pradesh', 
  /* Chhattisgarh */ ambikapur: 'Chhattisgarh', 
  /* Tamil Nadu */ ambur: 'Tamil Nadu', 
  /* Uttar Pradesh */ amethi: 'Uttar Pradesh', 
  /* Assam */ amguri: 'Assam', amingaon: 'Assam', 
  /* Madhya Pradesh */ amla: 'Madhya Pradesh', 
  /* Meghalaya */ amlarem: 'Meghalaya', 
  /* Bihar */ amnour: 'Bihar', 
  /* Meghalaya */ ampati: 'Meghalaya', 
  /* Tripura */ ampin: 'Tripura', 
  /* Telangana */ amrabad: 'Telangana', 
  /* Maharashtra */ amravati: 'Maharashtra', 
  /* Gujarat */ amreli: 'Gujarat', 
  /* Punjab */ amritsar: 'Punjab', 
  /* Uttar Pradesh */ amroha: 'Uttar Pradesh', 
  /* Andhra Pradesh */ anakapalli: 'Andhra Pradesh', 
  /* Gujarat */ anand: 'Gujarat', 
  /* Odisha */ anandapur: 'Odisha', 
  /* Andhra Pradesh */ anantapur: 'Andhra Pradesh', ananthapuramu: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ anantnag: 'Jammu & Kashmir', 
  /* Karnataka */ anekal: 'Karnataka', 
  /* Kerala */ angamaly: 'Kerala', 
  /* Odisha */ angul: 'Odisha', 
  /* Arunachal Pradesh */ anini: 'Arunachal Pradesh', 
  /* Gujarat */ anjar: 'Gujarat', 
  /* Arunachal Pradesh */ anjaw: 'Arunachal Pradesh', 
  /* Gujarat */ ankleshwar: 'Gujarat', anklevi: 'Gujarat', 
  /* Karnataka */ ankola: 'Karnataka', 
  /* Andhra Pradesh */ annamayya: 'Andhra Pradesh', 
  /* Madhya Pradesh */ anuppur: 'Madhya Pradesh', 
  /* Uttar Pradesh */ aonla: 'Uttar Pradesh', 
  /* Tamil Nadu */ arakkonam: 'Tamil Nadu', arani: 'Tamil Nadu', 
  /* Bihar */ araria: 'Bihar', 
  /* Tamil Nadu */ aravakurichi: 'Tamil Nadu', 
  /* Gujarat */ aravalli: 'Gujarat', 
  /* Tamil Nadu */ ariyalur: 'Tamil Nadu', 
  /* Karnataka */ arkalgud: 'Karnataka', 
  /* Himachal Pradesh */ arki: 'Himachal Pradesh', 
  /* Telangana */ armoor: 'Telangana', 
  /* Bihar */ arrah: 'Bihar', 
  /* Karnataka */ arsikere: 'Karnataka', 
  /* Tamil Nadu */ aruppukkottai: 'Tamil Nadu', 
  /* Bihar */ arwal: 'Bihar', 
  /* West Bengal */ asansol: 'West Bengal', 
  /* Madhya Pradesh */ ashoknagar: 'Madhya Pradesh', 
  /* Telangana */ asifabad: 'Telangana', 
  /* Uttar Pradesh */ atarra: 'Uttar Pradesh', 
  /* Madhya Pradesh */ ater: 'Madhya Pradesh', 
  /* Karnataka */ athani: 'Karnataka', 
  /* Andhra Pradesh */ atmakur: 'Andhra Pradesh', 
  /* Uttar Pradesh */ atrauliya: 'Uttar Pradesh', 
  /* Odisha */ atri: 'Odisha', 
  /* Andhra Pradesh */ attili: 'Andhra Pradesh', 
  /* Kerala */ attingal: 'Kerala', 
  /* Tamil Nadu */ attur: 'Tamil Nadu', 
  /* Bihar */ aurai: 'Bihar', 
  /* Uttar Pradesh */ auraiya: 'Uttar Pradesh', 
  /* Maharashtra */ aurangabad: 'Maharashtra', 
  /* Rajasthan */ auwa: 'Rajasthan', 
  /* Tamil Nadu */ avadi: 'Tamil Nadu', 
  /* Andhra Pradesh */ avanigadda: 'Andhra Pradesh', 
  /* Tamil Nadu */ avinashi: 'Tamil Nadu', 
  /* Uttar Pradesh */ ayodhya: 'Uttar Pradesh', azamgarh: 'Uttar Pradesh', 
  /* Bihar */ bachwara: 'Bihar', 
  /* Assam */ badarpur: 'Assam', 
  /* Himachal Pradesh */ baddi: 'Himachal Pradesh', 
  /* Rajasthan */ badiyad: 'Rajasthan', 
  /* Madhya Pradesh */ badnagar: 'Madhya Pradesh', 
  /* West Bengal */ baduria: 'West Bengal', 
  /* Andhra Pradesh */ badvel: 'Andhra Pradesh', 
  /* Bihar */ bagaha: 'Bihar', 
  /* Karnataka */ bagalkot: 'Karnataka', bagalkote: 'Karnataka', 
  /* Assam */ bagan: 'Assam', 
  /* Rajasthan */ baganga: 'Rajasthan', 
  /* Chhattisgarh */ bagbahra: 'Chhattisgarh', 
  /* Uttarakhand */ bageshwar: 'Uttarakhand', 
  /* Uttar Pradesh */ baghpat: 'Uttar Pradesh', 
  /* Jharkhand */ bagodar: 'Jharkhand', 
  /* Uttar Pradesh */ bagpat: 'Uttar Pradesh', 
  /* Bihar */ bahadurganj: 'Bihar', 
  /* Uttar Pradesh */ bahadurpur: 'Uttar Pradesh', 
  /* West Bengal */ baharampur: 'West Bengal', 
  /* Jharkhand */ baharpora: 'Jharkhand', 
  /* Uttar Pradesh */ baheri: 'Uttar Pradesh', bahraich: 'Uttar Pradesh', 
  /* Chhattisgarh */ baihar: 'Chhattisgarh', 
  /* Himachal Pradesh */ baijnath: 'Himachal Pradesh', 
  /* Chhattisgarh */ baikunthpur: 'Chhattisgarh', 
  /* Karnataka */ bailhongal: 'Karnataka', 
  /* Mizoram */ bairabi: 'Mizoram', 
  /* Assam */ bajali: 'Assam', 
  /* Bihar */ bakhtiarpur: 'Bihar', 
  /* Assam */ baksa: 'Assam', 
  /* Punjab */ balachaur: 'Punjab', 
  /* Madhya Pradesh */ balaghat: 'Madhya Pradesh', 
  /* Odisha */ balangir: 'Odisha', balaramgarh: 'Odisha', 
  /* West Bengal */ balarampur: 'West Bengal', 
  /* Odisha */ balasore: 'Odisha', 
  /* Rajasthan */ bali: 'Rajasthan', 
  /* Odisha */ balianta: 'Odisha', 
  /* Jharkhand */ baliapur: 'Jharkhand', 
  /* Haryana */ ballabgarh: 'Haryana', 
  /* Karnataka */ ballari: 'Karnataka', 
  /* Uttar Pradesh */ ballia: 'Uttar Pradesh', 
  /* West Bengal */ bally: 'West Bengal', 
  /* Chhattisgarh */ balod: 'Chhattisgarh', baloda: 'Chhattisgarh', balodabazar: 'Chhattisgarh', 
  /* Rajasthan */ balotra: 'Rajasthan', 
  /* Chhattisgarh */ balrampurramanujganj: 'Chhattisgarh', balud: 'Chhattisgarh', 
  /* West Bengal */ balurghat: 'West Bengal', 
  /* Madhya Pradesh */ bamori: 'Madhya Pradesh', 
  /* Odisha */ banarpal: 'Odisha', 
  /* Gujarat */ banaskantha: 'Gujarat', 
  /* Uttar Pradesh */ banda: 'Uttar Pradesh', 
  /* Jammu & Kashmir */ bandipora: 'Jammu & Kashmir', bandipore: 'Jammu & Kashmir', 
  /* Karnataka */ bangalore: 'Karnataka', bangalorerural: 'Karnataka', bangaloreurban: 'Karnataka', bangarpet: 'Karnataka', banhatti: 'Karnataka', 
  /* Bihar */ banka: 'Bihar', 
  /* West Bengal */ bankura: 'West Bengal', 
  /* Uttar Pradesh */ bansgaon: 'Uttar Pradesh', 
  /* Rajasthan */ banswara: 'Rajasthan', 
  /* Andhra Pradesh */ bapatla: 'Andhra Pradesh', 
  /* Rajasthan */ baphni: 'Rajasthan', bapni: 'Rajasthan', 
  /* West Bengal */ barabani: 'West Bengal', 
  /* Uttar Pradesh */ barabanki: 'Uttar Pradesh', 
  /* Bihar */ barachaki: 'Bihar', 
  /* Maharashtra */ baramati: 'Maharashtra', 
  /* Odisha */ baramba: 'Odisha', 
  /* Chhattisgarh */ baramkela: 'Chhattisgarh', 
  /* Jammu & Kashmir */ baramulla: 'Jammu & Kashmir', 
  /* Rajasthan */ baran: 'Rajasthan', 
  /* West Bengal */ barasat: 'West Bengal', 
  /* Bihar */ barbigha: 'Bihar', 
  /* Odisha */ barbil: 'Odisha', 
  /* Assam */ barchalla: 'Assam', 
  /* West Bengal */ bardhaman: 'West Bengal', 
  /* Gujarat */ bardoli: 'Gujarat', 
  /* Uttar Pradesh */ bareilly: 'Uttar Pradesh', 
  /* Odisha */ bargarh: 'Odisha', 
  /* Bihar */ barh: 'Bihar', 
  /* Uttar Pradesh */ barhalganj: 'Uttar Pradesh', 
  /* Bihar */ barharia: 'Bihar', 
  /* Jharkhand */ barhi: 'Jharkhand', 
  /* Bihar */ bariarpur: 'Bihar', 
  /* Odisha */ baripada: 'Odisha', 
  /* Bihar */ bariyarpur: 'Bihar', 
  /* Jharkhand */ barkagaon: 'Jharkhand', 
  /* Rajasthan */ barmer: 'Rajasthan', 
  /* Gujarat */ baroda: 'Gujarat', 
  /* Assam */ barpeta: 'Assam', 
  /* West Bengal */ barrackpore: 'West Bengal', 
  /* Rajasthan */ barva: 'Rajasthan', 
  /* Madhya Pradesh */ barwani: 'Madhya Pradesh', 
  /* Arunachal Pradesh */ basar: 'Arunachal Pradesh', 
  /* Karnataka */ basavanabagevadi: 'Karnataka', 
  /* West Bengal */ basirhat: 'West Bengal', 
  /* Chhattisgarh */ basna: 'Chhattisgarh', 
  /* Rajasthan */ bassi: 'Rajasthan', 
  /* Chhattisgarh */ bastar: 'Chhattisgarh', 
  /* Uttar Pradesh */ basti: 'Uttar Pradesh', 
  /* Odisha */ basudevpur: 'Odisha', 
  /* Punjab */ bathinda: 'Punjab', 
  /* Tamil Nadu */ batlagundu: 'Tamil Nadu', 
  /* Gujarat */ bavla: 'Gujarat', 
  /* Haryana */ bawal: 'Haryana', 
  /* Rajasthan */ beawar: 'Rajasthan', 
  /* Maharashtra */ beed: 'Maharashtra', 
  /* Madhya Pradesh */ begam: 'Madhya Pradesh', 
  /* Bihar */ begusarai: 'Bihar', 
  /* Chhattisgarh */ bela: 'Chhattisgarh', 
  /* Karnataka */ belagavi: 'Karnataka', 
  /* Bihar */ beldaur: 'Bihar', 
  /* Karnataka */ belgaum: 'Karnataka', 
  /* Telangana */ bellampalle: 'Telangana', 
  /* Karnataka */ bellary: 'Karnataka', 
  /* Tripura */ belonia: 'Tripura', 
  /* Odisha */ belpahar: 'Odisha', 
  /* Karnataka */ belthangady: 'Karnataka', belur: 'Karnataka', 
  /* Chhattisgarh */ bemetara: 'Chhattisgarh', 
  /* Jammu & Kashmir */ bemina: 'Jammu & Kashmir', 
  /* Karnataka */ bengaluru: 'Karnataka', 
  /* Bihar */ benipatti: 'Bihar', 
  /* Jharkhand */ bermo: 'Jharkhand', bero: 'Jharkhand', 
  /* Andhra Pradesh */ bethamcherla: 'Andhra Pradesh', 
  /* Bihar */ bettiah: 'Bihar', 
  /* Madhya Pradesh */ betul: 'Madhya Pradesh', 
  /* Uttar Pradesh */ bewar: 'Uttar Pradesh', 
  /* Bihar */ bhabua: 'Bihar', 
  /* Uttar Pradesh */ bhadohi: 'Uttar Pradesh', 
  /* Telangana */ bhadradrikothagudem: 'Telangana', 
  /* Rajasthan */ bhadrajun: 'Rajasthan', 
  /* Odisha */ bhadrak: 'Odisha', 
  /* West Bengal */ bhadreshwar: 'West Bengal', 
  /* Jharkhand */ bhaga: 'Jharkhand', 
  /* Bihar */ bhagalpur: 'Bihar', 
  /* Telangana */ bhainsa: 'Telangana', 
  /* Rajasthan */ bhamashah: 'Rajasthan', 
  /* Odisha */ bhanapur: 'Odisha', 
  /* Maharashtra */ bhandara: 'Maharashtra', 
  /* Rajasthan */ bhanipura: 'Rajasthan', 
  /* Odisha */ bhanjanagar: 'Odisha', 
  /* Chhattisgarh */ bhanpuri: 'Chhattisgarh', 
  /* Odisha */ bhanupatna: 'Odisha', bhapur: 'Odisha', 
  /* Rajasthan */ bharatpur: 'Rajasthan', 
  /* Gujarat */ bharuch: 'Gujarat', 
  /* Chhattisgarh */ bhatapara: 'Chhattisgarh', 
  /* Karnataka */ bhatkal: 'Karnataka', 
  /* Uttar Pradesh */ bhatpar: 'Uttar Pradesh', 
  /* West Bengal */ bhatpara: 'West Bengal', 
  /* Tamil Nadu */ bhavani: 'Tamil Nadu', 
  /* Gujarat */ bhavnagar: 'Gujarat', 
  /* Odisha */ bhawanipatna: 'Odisha', 
  /* Madhya Pradesh */ bhedaghat: 'Madhya Pradesh', 
  /* Rajasthan */ bhedupada: 'Rajasthan', 
  /* Telangana */ bheemini: 'Telangana', 
  /* Andhra Pradesh */ bheemunipatnam: 'Andhra Pradesh', 
  /* Rajasthan */ bhenswada: 'Rajasthan', 
  /* Gujarat */ bhesan: 'Gujarat', 
  /* Chhattisgarh */ bhetri: 'Chhattisgarh', bhilai: 'Chhattisgarh', 
  /* Gujarat */ bhildi: 'Gujarat', 
  /* Rajasthan */ bhilwara: 'Rajasthan', bhim: 'Rajasthan', 
  /* Andhra Pradesh */ bhimavaram: 'Andhra Pradesh', 
  /* Uttarakhand */ bhimtal: 'Uttarakhand', 
  /* Madhya Pradesh */ bhind: 'Madhya Pradesh', 
  /* Rajasthan */ bhinmal: 'Rajasthan', 
  /* Maharashtra */ bhiwandi: 'Maharashtra', 
  /* Haryana */ bhiwani: 'Haryana', 
  /* Odisha */ bhograi: 'Odisha', 
  /* Bihar */ bhojpur: 'Bihar', 
  /* Rajasthan */ bhomsen: 'Rajasthan', 
  /* Telangana */ bhongir: 'Telangana', 
  /* Madhya Pradesh */ bhopal: 'Madhya Pradesh', 
  /* Rajasthan */ bhopalgarh: 'Rajasthan', 
  /* Chhattisgarh */ bhopalpatnam: 'Chhattisgarh', 
  /* Odisha */ bhuban: 'Odisha', bhubaneswar: 'Odisha', 
  /* Gujarat */ bhuj: 'Gujarat', 
  /* Himachal Pradesh */ bhuntar: 'Himachal Pradesh', 
  /* Telangana */ bhupalpalle: 'Telangana', bhupalpally: 'Telangana', 
  /* Madhya Pradesh */ biaora: 'Madhya Pradesh', 
  /* Bihar */ bibhutipur: 'Bihar', 
  /* Goa */ bicholim: 'Goa', 
  /* Arunachal Pradesh */ bichom: 'Arunachal Pradesh', 
  /* Karnataka */ bidar: 'Karnataka', 
  /* Bihar */ biharsharif: 'Bihar', bihpur: 'Bihar', bihta: 'Bihar', 
  /* Assam */ bihukhata: 'Assam', bihupuria: 'Assam', 
  /* Karnataka */ bijapur: 'Karnataka', 
  /* Assam */ bijni: 'Assam', 
  /* Uttar Pradesh */ bijnor: 'Uttar Pradesh', 
  /* Rajasthan */ bikaner: 'Rajasthan', 
  /* Bihar */ bikram: 'Bihar', 
  /* Karnataka */ bilagi: 'Karnataka', 
  /* Rajasthan */ bilara: 'Rajasthan', 
  /* Chhattisgarh */ bilhaugadh: 'Chhattisgarh', 
  /* Uttar Pradesh */ bilhaur: 'Uttar Pradesh', 
  /* Gujarat */ bilimora: 'Gujarat', 
  /* Odisha */ biramitrapur: 'Odisha', 
  /* West Bengal */ birbhum: 'West Bengal', 
  /* Bihar */ birpur: 'Bihar', 
  /* Madhya Pradesh */ birsa: 'Madhya Pradesh', 
  /* Karnataka */ birur: 'Karnataka', 
  /* Uttar Pradesh */ bisauli: 'Uttar Pradesh', 
  /* Manipur */ bishnupur: 'Manipur', 
  /* Tripura */ bishramganj: 'Tripura', 
  /* Jharkhand */ bishrampur: 'Jharkhand', 
  /* Assam */ biswanath: 'Assam', biswanathchariali: 'Assam', 
  /* Telangana */ bodhan: 'Telangana', 
  /* Bihar */ bodhgaya: 'Bihar', 
  /* Tamil Nadu */ bodi: 'Tamil Nadu', 
  /* Maharashtra */ boisar: 'Maharashtra', 
  /* Jharkhand */ bokaro: 'Jharkhand', 
  /* Assam */ boko: 'Assam', 
  /* Arunachal Pradesh */ boleng: 'Arunachal Pradesh', 
  /* Telangana */ bollaram: 'Telangana', 
  /* Maharashtra */ bombay: 'Maharashtra', 
  /* Arunachal Pradesh */ bomdila: 'Arunachal Pradesh', 
  /* Odisha */ bonaigarh: 'Odisha', 
  /* Assam */ bongaigaon: 'Assam', 
  /* Jharkhand */ boria: 'Jharkhand', 
  /* Gujarat */ borsad: 'Gujarat', botad: 'Gujarat', 
  /* Odisha */ boudh: 'Odisha', brahmagiri: 'Odisha', brahmapur: 'Odisha', 
  /* Karnataka */ brahmavar: 'Karnataka', 
  /* Uttar Pradesh */ budaun: 'Uttar Pradesh', 
  /* Jammu & Kashmir */ budgam: 'Jammu & Kashmir', 
  /* Rajasthan */ buhana: 'Rajasthan', 
  /* Uttar Pradesh */ bulandshahr: 'Uttar Pradesh', 
  /* Maharashtra */ buldhana: 'Maharashtra', 
  /* Rajasthan */ bundi: 'Rajasthan', 
  /* Jharkhand */ bundu: 'Jharkhand', 
  /* Madhya Pradesh */ burhanpur: 'Madhya Pradesh', 
  /* Bihar */ buxar: 'Bihar', 
  /* Karnataka */ byadgi: 'Karnataka', 
  /* Assam */ cachar: 'Assam', 
  /* West Bengal */ calcutta: 'West Bengal', 
  /* Kerala */ calicut: 'Kerala', 
  /* Goa */ canacona: 'Goa', 
  /* Andaman and Nicobar */ carnicobar: 'Andaman and Nicobar', 
  /* Delhi */ centraldelhi: 'Delhi', 
  /* Jharkhand */ chaibasa: 'Jharkhand', chainpur: 'Jharkhand', 
  /* Bihar */ chakai: 'Bihar', 
  /* West Bengal */ chakdah: 'West Bengal', 
  /* Kerala */ chalakudy: 'Kerala', 
  /* Gujarat */ chalala: 'Gujarat', 
  /* Andhra Pradesh */ challapalle: 'Andhra Pradesh', 
  /* Karnataka */ chamarajanagar: 'Karnataka', 
  /* Himachal Pradesh */ chamba: 'Himachal Pradesh', 
  /* Uttarakhand */ chamoli: 'Uttarakhand', champawat: 'Uttarakhand', 
  /* Mizoram */ champhai: 'Mizoram', 
  /* Odisha */ champua: 'Odisha', 
  /* Karnataka */ chamrajnagar: 'Karnataka', 
  /* Uttar Pradesh */ chandauli: 'Uttar Pradesh', 
  /* Manipur */ chandel: 'Manipur', 
  /* Chandigarh */ chandigarh: 'Chandigarh', 
  /* Uttar Pradesh */ chandpur: 'Uttar Pradesh', 
  /* Maharashtra */ chandrapur: 'Maharashtra', 
  /* Kerala */ changanacherry: 'Kerala', 
  /* Arunachal Pradesh */ changlang: 'Arunachal Pradesh', 
  /* Ladakh */ changthang: 'Ladakh', 
  /* Karnataka */ channapatna: 'Karnataka', 
  /* Bihar */ chanpatia: 'Bihar', chapra: 'Bihar', 
  /* Assam */ charaideo: 'Assam', 
  /* Uttar Pradesh */ charkhari: 'Uttar Pradesh', 
  /* Haryana */ charkhidadri: 'Haryana', 
  /* Jharkhand */ chatra: 'Jharkhand', chauparan: 'Jharkhand', 
  /* Kerala */ chavakkad: 'Kerala', chavara: 'Kerala', 
  /* Andhra Pradesh */ chebrolu: 'Andhra Pradesh', cheepurupalli: 'Andhra Pradesh', 
  /* Bihar */ chenari: 'Bihar', 
  /* Tamil Nadu */ chengalpattu: 'Tamil Nadu', 
  /* Kerala */ chengannur: 'Kerala', 
  /* Tamil Nadu */ chennai: 'Tamil Nadu', 
  /* Bihar */ chhapra: 'Bihar', 
  /* Odisha */ chhataripur: 'Odisha', 
  /* Madhya Pradesh */ chhatarpur: 'Madhya Pradesh', 
  /* Maharashtra */ chhatrapatisambhajinagar: 'Maharashtra', 
  /* Odisha */ chhatrapur: 'Odisha', chhendipada: 'Odisha', 
  /* Madhya Pradesh */ chhindwara: 'Madhya Pradesh', 
  /* Bihar */ chhitauni: 'Bihar', 
  /* Gujarat */ chhotaudaipur: 'Gujarat', 
  /* Madhya Pradesh */ chicholi: 'Madhya Pradesh', 
  /* Karnataka */ chickballapur: 'Karnataka', 
  /* Tamil Nadu */ chidambaram: 'Tamil Nadu', 
  /* Odisha */ chikiti: 'Odisha', 
  /* Karnataka */ chikkaballapur: 'Karnataka', chikkamagaluru: 'Karnataka', chikmagalur: 'Karnataka', chiknayakanhalli: 'Karnataka', chikodi: 'Karnataka', 
  /* Telangana */ chilkur: 'Telangana', 
  /* Karnataka */ chincholi: 'Karnataka', 
  /* West Bengal */ chinsurah: 'West Bengal', 
  /* Andhra Pradesh */ chintalapalle: 'Andhra Pradesh', 
  /* Karnataka */ chintamani: 'Karnataka', 
  /* Uttar Pradesh */ chiraigaon: 'Uttar Pradesh', 
  /* Andhra Pradesh */ chirala: 'Andhra Pradesh', 
  /* Assam */ chirang: 'Assam', 
  /* Jharkhand */ chirkunda: 'Jharkhand', 
  /* Karnataka */ chitaldurga: 'Karnataka', chitradurga: 'Karnataka', 
  /* Uttar Pradesh */ chitrakoot: 'Uttar Pradesh', 
  /* Karnataka */ chittapur: 'Karnataka', 
  /* Andhra Pradesh */ chittoor: 'Andhra Pradesh', 
  /* Rajasthan */ chittorgarh: 'Rajasthan', 
  /* Kerala */ chittur: 'Kerala', 
  /* Andhra Pradesh */ chodavaram: 'Andhra Pradesh', 
  /* Gujarat */ chotila: 'Gujarat', 
  /* Odisha */ choudwar: 'Odisha', 
  /* Nagaland */ chumukedima: 'Nagaland', 
  /* Sikkim */ chungthang: 'Sikkim', 
  /* Manipur */ churachandpur: 'Manipur', 
  /* Rajasthan */ churu: 'Rajasthan', 
  /* Kerala */ cochin: 'Kerala', 
  /* Tamil Nadu */ coimbatore: 'Tamil Nadu', colachel: 'Tamil Nadu', 
  /* Delhi */ connaughtplace: 'Delhi', 
  /* West Bengal */ contai: 'West Bengal', coochbehar: 'West Bengal', 
  /* Tamil Nadu */ coonoor: 'Tamil Nadu', 
  /* Goa */ cortalim: 'Goa', 
  /* West Bengal */ cossimbazar: 'West Bengal', 
  /* Tamil Nadu */ cuddalore: 'Tamil Nadu', 
  /* Andhra Pradesh */ cuddapah: 'Andhra Pradesh', 
  /* Goa */ cuncolim: 'Goa', curchorem: 'Goa', 
  /* Odisha */ cuttack: 'Odisha', 
  /* Dadra & Nagar Haveli and Daman & Diu */ dadraandnagarhaveli: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Uttar Pradesh */ dadri: 'Uttar Pradesh', 
  /* Maharashtra */ dahanu: 'Maharashtra', 
  /* Gujarat */ dahod: 'Gujarat', 
  /* Karnataka */ dakshinakannada: 'Karnataka', 
  /* West Bengal */ dakshindinajpur: 'West Bengal', 
  /* Assam */ dalgaon: 'Assam', 
  /* Chhattisgarh */ dallirajhara: 'Chhattisgarh', 
  /* Bihar */ dalsinghsarai: 'Bihar', 
  /* Jharkhand */ daltonganj: 'Jharkhand', 
  /* Dadra & Nagar Haveli and Daman & Diu */ daman: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Madhya Pradesh */ damoh: 'Madhya Pradesh', 
  /* Bihar */ danapur: 'Bihar', 
  /* Gujarat */ dang: 'Gujarat', danta: 'Gujarat', 
  /* Chhattisgarh */ dantewada: 'Chhattisgarh', 
  /* Arunachal Pradesh */ daporijo: 'Arunachal Pradesh', 
  /* Bihar */ darauli: 'Bihar', daraunda: 'Bihar', darbhanga: 'Bihar', 
  /* Odisha */ daringbadi: 'Odisha', 
  /* West Bengal */ darjeeling: 'West Bengal', 
  /* Assam */ darrang: 'Assam', 
  /* Delhi */ daryaganj: 'Delhi', 
  /* Punjab */ dasua: 'Punjab', 
  /* Madhya Pradesh */ datia: 'Madhya Pradesh', 
  /* Rajasthan */ dausa: 'Rajasthan', 
  /* Karnataka */ davanagere: 'Karnataka', davangere: 'Karnataka', 
  /* Odisha */ debagarh: 'Odisha', 
  /* Rajasthan */ dechu: 'Rajasthan', deedana: 'Rajasthan', deeg: 'Rajasthan', 
  /* Gujarat */ deesa: 'Gujarat', 
  /* Delhi */ defencecolony: 'Delhi', 
  /* Uttarakhand */ dehradun: 'Uttarakhand', 
  /* Bihar */ dehri: 'Bihar', 
  /* Delhi */ delhi: 'Delhi', 
  /* Andhra Pradesh */ dendukuru: 'Andhra Pradesh', 
  /* Tamil Nadu */ denkanikottai: 'Tamil Nadu', 
  /* Uttar Pradesh */ deoband: 'Uttar Pradesh', 
  /* Jharkhand */ deoghar: 'Jharkhand', deohari: 'Jharkhand', 
  /* Uttar Pradesh */ deoria: 'Uttar Pradesh', 
  /* Madhya Pradesh */ depalpur: 'Madhya Pradesh', 
  /* Tamil Nadu */ devakottai: 'Tamil Nadu', 
  /* Karnataka */ devanahalli: 'Karnataka', 
  /* Chhattisgarh */ devbhoomi: 'Chhattisgarh', 
  /* Gujarat */ devbhoomidwarka: 'Gujarat', devbhumidwarka: 'Gujarat', 
  /* Madhya Pradesh */ devgarh: 'Madhya Pradesh', 
  /* Kerala */ devikulam: 'Kerala', 
  /* Uttarakhand */ devprayag: 'Uttarakhand', 
  /* Madhya Pradesh */ dewas: 'Madhya Pradesh', 
  /* Tripura */ dhalai: 'Tripura', 
  /* Chhattisgarh */ dhamtari: 'Chhattisgarh', 
  /* Jharkhand */ dhanbad: 'Jharkhand', dhanwar: 'Jharkhand', 
  /* Madhya Pradesh */ dhar: 'Madhya Pradesh', 
  /* Himachal Pradesh */ dharamshala: 'Himachal Pradesh', 
  /* Maharashtra */ dharashiv: 'Maharashtra', 
  /* Bihar */ dharauri: 'Bihar', 
  /* Tripura */ dharmanagar: 'Tripura', 
  /* Tamil Nadu */ dharmapuri: 'Tamil Nadu', 
  /* Andhra Pradesh */ dharmavaram: 'Andhra Pradesh', 
  /* Telangana */ dharur: 'Telangana', 
  /* Karnataka */ dharwad: 'Karnataka', 
  /* Assam */ dhemaji: 'Assam', 
  /* Odisha */ dhenkanal: 'Odisha', 
  /* Uttar Pradesh */ dholi: 'Uttar Pradesh', 
  /* Gujarat */ dholka: 'Gujarat', 
  /* Rajasthan */ dholpur: 'Rajasthan', 
  /* Gujarat */ dhoraji: 'Gujarat', dhrangadhra: 'Gujarat', 
  /* Assam */ dhubri: 'Assam', 
  /* Maharashtra */ dhule: 'Maharashtra', 
  /* Gujarat */ dhungri: 'Gujarat', 
  /* West Bengal */ dhupguri: 'West Bengal', 
  /* Punjab */ dhuri: 'Punjab', 
  /* Assam */ dibrugarh: 'Assam', 
  /* Rajasthan */ didwana: 'Rajasthan', didwanakuchaman: 'Rajasthan', 
  /* Odisha */ digapahandi: 'Odisha', 
  /* Assam */ digboi: 'Assam', 
  /* West Bengal */ digha: 'West Bengal', 
  /* Uttar Pradesh */ dighwara: 'Uttar Pradesh', dildarnagar: 'Uttar Pradesh', 
  /* Assam */ dimahasao: 'Assam', 
  /* Nagaland */ dimapur: 'Nagaland', 
  /* Bihar */ dinapur: 'Bihar', 
  /* Tamil Nadu */ dindigul: 'Tamil Nadu', 
  /* Madhya Pradesh */ dindori: 'Madhya Pradesh', 
  /* West Bengal */ dinhata: 'West Bengal', 
  /* Assam */ diphu: 'Assam', 
  /* Ladakh */ diskit: 'Ladakh', 
  /* Dadra & Nagar Haveli and Daman & Diu */ diu: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Jammu & Kashmir */ doda: 'Jammu & Kashmir', 
  /* Karnataka */ doddaballapur: 'Karnataka', 
  /* Chhattisgarh */ dongargarh: 'Chhattisgarh', 
  /* Punjab */ doraha: 'Punjab', 
  /* Telangana */ dornakal: 'Telangana', 
  /* Ladakh */ drass: 'Ladakh', 
  /* Andhra Pradesh */ drbrambedkarkonaseema: 'Andhra Pradesh', 
  /* Assam */ duliajan: 'Assam', 
  /* Jharkhand */ dumka: 'Jharkhand', 
  /* Bihar */ dumraon: 'Bihar', 
  /* Jharkhand */ dumri: 'Jharkhand', 
  /* Rajasthan */ dungarpur: 'Rajasthan', 
  /* Ladakh */ durbuk: 'Ladakh', 
  /* Chhattisgarh */ durg: 'Chhattisgarh', 
  /* West Bengal */ durgapur: 'West Bengal', 
  /* Delhi */ dwarka: 'Delhi', 
  /* Bihar */ eastchamparan: 'Bihar', 
  /* Delhi */ eastdelhi: 'Delhi', 
  /* Meghalaya */ easternwestkhasihills: 'Meghalaya', eastgarohills: 'Meghalaya', 
  /* Andhra Pradesh */ eastgodavari: 'Andhra Pradesh', 
  /* Meghalaya */ eastjaintiahills: 'Meghalaya', 
  /* Arunachal Pradesh */ eastkameng: 'Arunachal Pradesh', 
  /* Meghalaya */ eastkhasihills: 'Meghalaya', 
  /* Arunachal Pradesh */ eastsiang: 'Arunachal Pradesh', 
  /* Sikkim */ eastsikkim: 'Sikkim', 
  /* Jharkhand */ eastsinghbhum: 'Jharkhand', 
  /* Tamil Nadu */ edappadi: 'Tamil Nadu', 
  /* Haryana */ ellabad: 'Haryana', 
  /* Andhra Pradesh */ eluru: 'Andhra Pradesh', 
  /* West Bengal */ englishbazar: 'West Bengal', 
  /* Kerala */ erattupetta: 'Kerala', ernakulam: 'Kerala', 
  /* Tamil Nadu */ erode: 'Tamil Nadu', 
  /* Uttar Pradesh */ etah: 'Uttar Pradesh', etawah: 'Uttar Pradesh', 
  /* Telangana */ ethamadaka: 'Telangana', 
  /* Uttar Pradesh */ etmadpur: 'Uttar Pradesh', 
  /* Tamil Nadu */ ettayapuram: 'Tamil Nadu', 
  /* Kerala */ ettumanoor: 'Kerala', 
  /* Uttar Pradesh */ faizabad: 'Uttar Pradesh', 
  /* West Bengal */ falakata: 'West Bengal', farakka: 'West Bengal', 
  /* Haryana */ faridabad: 'Haryana', 
  /* Punjab */ faridkot: 'Punjab', 
  /* Uttar Pradesh */ farrukhabad: 'Uttar Pradesh', 
  /* Haryana */ fatehabad: 'Haryana', 
  /* Uttar Pradesh */ fatehgarh: 'Uttar Pradesh', 
  /* Punjab */ fatehgarhsahib: 'Punjab', 
  /* Uttar Pradesh */ fatehpur: 'Uttar Pradesh', 
  /* Punjab */ fazilka: 'Punjab', 
  /* Uttar Pradesh */ firozabad: 'Uttar Pradesh', 
  /* Punjab */ firozpur: 'Punjab', 
  /* Karnataka */ gadag: 'Karnataka', gadaga: 'Karnataka', gadagbetageri: 'Karnataka', 
  /* Maharashtra */ gadchiroli: 'Maharashtra', 
  /* Telangana */ gadwal: 'Telangana', 
  /* Madhya Pradesh */ gairatganj: 'Madhya Pradesh', 
  /* Odisha */ gajapati: 'Odisha', 
  /* Andhra Pradesh */ ganapavaram: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ ganderbal: 'Jammu & Kashmir', 
  /* Gujarat */ gandevi: 'Gujarat', gandhidham: 'Gujarat', gandhinagar: 'Gujarat', 
  /* Andhra Pradesh */ gangada: 'Andhra Pradesh', gangadharanellore: 'Andhra Pradesh', 
  /* Karnataka */ gangawati: 'Karnataka', 
  /* Sikkim */ gangtok: 'Sikkim', 
  /* Odisha */ ganjam: 'Odisha', 
  /* Uttar Pradesh */ ganjdundwara: 'Uttar Pradesh', 
  /* Assam */ garamur: 'Assam', 
  /* Madhya Pradesh */ garhakota: 'Madhya Pradesh', 
  /* Jharkhand */ garhwa: 'Jharkhand', 
  /* Chhattisgarh */ gariaband: 'Chhattisgarh', 
  /* Gujarat */ gariadhar: 'Gujarat', 
  /* Punjab */ garshankar: 'Punjab', 
  /* Assam */ gauhati: 'Assam', 
  /* Chhattisgarh */ gaurela: 'Chhattisgarh', gaurelapendramarwahi: 'Chhattisgarh', gaurellapendramarwahi: 'Chhattisgarh', 
  /* Uttar Pradesh */ gauriganj: 'Uttar Pradesh', 
  /* Assam */ gauripur: 'Assam', 
  /* Uttar Pradesh */ gautambuddhanagar: 'Uttar Pradesh', gautambuddhnagar: 'Uttar Pradesh', 
  /* Bihar */ gaya: 'Bihar', 
  /* Sikkim */ geyzing: 'Sikkim', 
  /* Rajasthan */ ghanaipur: 'Rajasthan', 
  /* Telangana */ ghanpur: 'Telangana', 
  /* West Bengal */ ghatal: 'West Bengal', 
  /* Uttar Pradesh */ ghatampur: 'Uttar Pradesh', 
  /* Jharkhand */ ghatshila: 'Jharkhand', 
  /* Uttar Pradesh */ ghaziabad: 'Uttar Pradesh', ghazipur: 'Uttar Pradesh', 
  /* Bihar */ ghoshi: 'Bihar', 
  /* Gujarat */ ghumli: 'Gujarat', 
  /* Tamil Nadu */ gingee: 'Tamil Nadu', 
  /* Jharkhand */ giridih: 'Jharkhand', 
  /* Gujarat */ girsomnath: 'Gujarat', 
  /* Assam */ goalpara: 'Assam', 
  /* Tamil Nadu */ gobichettipalayam: 'Tamil Nadu', 
  /* Odisha */ gobindpur: 'Odisha', 
  /* Jharkhand */ godda: 'Jharkhand', 
  /* Gujarat */ godhra: 'Gujarat', 
  /* Rajasthan */ gogunda: 'Rajasthan', 
  /* Madhya Pradesh */ goharghat: 'Madhya Pradesh', 
  /* Karnataka */ gokak: 'Karnataka', 
  /* Uttar Pradesh */ gokul: 'Uttar Pradesh', 
  /* Assam */ golaghat: 'Assam', 
  /* Uttar Pradesh */ golagokarannath: 'Uttar Pradesh', 
  /* Tripura */ gomati: 'Tripura', 
  /* Jharkhand */ gomoh: 'Jharkhand', 
  /* Uttar Pradesh */ gonda: 'Uttar Pradesh', 
  /* Gujarat */ gondal: 'Gujarat', 
  /* Chhattisgarh */ gonder: 'Chhattisgarh', 
  /* Maharashtra */ gondia: 'Maharashtra', 
  /* Punjab */ goniana: 'Punjab', 
  /* Andhra Pradesh */ gooty: 'Andhra Pradesh', 
  /* Bihar */ gopalamau: 'Bihar', gopalganj: 'Bihar', gopalpur: 'Bihar', 
  /* Uttarakhand */ gopeshwar: 'Uttarakhand', 
  /* Uttar Pradesh */ gorakhpur: 'Uttar Pradesh', 
  /* Bihar */ goraul: 'Bihar', gotha: 'Bihar', 
  /* Uttar Pradesh */ greaternoida: 'Uttar Pradesh', 
  /* Tamil Nadu */ gudiyatham: 'Tamil Nadu', 
  /* Andhra Pradesh */ gudur: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ gulabgarh: 'Jammu & Kashmir', 
  /* Karnataka */ gulbarga: 'Karnataka', guledgudda: 'Karnataka', 
  /* Jharkhand */ gumla: 'Jharkhand', 
  /* Tamil Nadu */ gummidipoondi: 'Tamil Nadu', 
  /* Madhya Pradesh */ guna: 'Madhya Pradesh', gunad: 'Madhya Pradesh', 
  /* Karnataka */ gundlupet: 'Karnataka', 
  /* Andhra Pradesh */ guntur: 'Andhra Pradesh', 
  /* Odisha */ guo: 'Odisha', 
  /* Andhra Pradesh */ gurazala: 'Andhra Pradesh', 
  /* Punjab */ gurdaspur: 'Punjab', 
  /* Haryana */ gurgaon: 'Haryana', gurugram: 'Haryana', 
  /* Kerala */ guruvayur: 'Kerala', 
  /* Assam */ guwahati: 'Assam', 
  /* Madhya Pradesh */ gwalior: 'Madhya Pradesh', 
  /* Sikkim */ gyalshing: 'Sikkim', 
  /* Uttar Pradesh */ gyanpur: 'Uttar Pradesh', 
  /* West Bengal */ habra: 'West Bengal', 
  /* Assam */ haflong: 'Assam', 
  /* Karnataka */ hagaribommanahalli: 'Karnataka', 
  /* Telangana */ haidergarh: 'Telangana', 
  /* Assam */ hailakandi: 'Assam', 
  /* Bihar */ hajipur: 'Bihar', 
  /* Assam */ hajo: 'Assam', 
  /* West Bengal */ haldia: 'West Bengal', 
  /* Uttarakhand */ haldwani: 'Uttarakhand', 
  /* Karnataka */ haliyal: 'Karnataka', 
  /* Gujarat */ halol: 'Gujarat', halvad: 'Gujarat', 
  /* Assam */ hamren: 'Assam', 
  /* Telangana */ hanamkonda: 'Telangana', 
  /* Ladakh */ hanle: 'Ladakh', 
  /* Haryana */ hansi: 'Haryana', 
  /* Rajasthan */ hanumangarh: 'Rajasthan', 
  /* Uttar Pradesh */ hapur: 'Uttar Pradesh', 
  /* Madhya Pradesh */ harda: 'Madhya Pradesh', 
  /* Uttar Pradesh */ hardoi: 'Uttar Pradesh', 
  /* Uttarakhand */ haridwar: 'Uttarakhand', 
  /* Karnataka */ harihar: 'Karnataka', harpanahalli: 'Karnataka', 
  /* Uttar Pradesh */ harraiya: 'Uttar Pradesh', hasanpur: 'Uttar Pradesh', 
  /* Karnataka */ hassan: 'Karnataka', 
  /* Uttar Pradesh */ hata: 'Uttar Pradesh', hathras: 'Uttar Pradesh', 
  /* Bihar */ hathua: 'Bihar', 
  /* Assam */ hatsingimari: 'Assam', 
  /* Karnataka */ haveri: 'Karnataka', 
  /* Arunachal Pradesh */ hawai: 'Arunachal Pradesh', 
  /* Telangana */ hayathnagar: 'Telangana', 
  /* Jharkhand */ hazaribag: 'Jharkhand', hazaribagh: 'Jharkhand', 
  /* Gujarat */ himatnagar: 'Gujarat', 
  /* Andhra Pradesh */ hindupur: 'Andhra Pradesh', 
  /* Maharashtra */ hingoli: 'Maharashtra', 
  /* Odisha */ hinjili: 'Odisha', 
  /* Andhra Pradesh */ hiramandalam: 'Andhra Pradesh', 
  /* Karnataka */ hirekerur: 'Karnataka', hiriyur: 'Karnataka', 
  /* Haryana */ hisar: 'Haryana', 
  /* Mizoram */ hnahthial: 'Mizoram', 
  /* Haryana */ hodal: 'Haryana', 
  /* Assam */ hojai: 'Assam', 
  /* Karnataka */ holalkere: 'Karnataka', holenarsipur: 'Karnataka', honnali: 'Karnataka', honnavar: 'Karnataka', 
  /* West Bengal */ hooghly: 'West Bengal', 
  /* Karnataka */ hosanagar: 'Karnataka', hosdurga: 'Karnataka', 
  /* Madhya Pradesh */ hoshangabad: 'Madhya Pradesh', 
  /* Punjab */ hoshiarpur: 'Punjab', 
  /* Karnataka */ hoskote: 'Karnataka', hospet: 'Karnataka', hospete: 'Karnataka', 
  /* Tamil Nadu */ hosur: 'Tamil Nadu', 
  /* West Bengal */ howrah: 'West Bengal', 
  /* Karnataka */ hubballi: 'Karnataka', hubli: 'Karnataka', hunsur: 'Karnataka', 
  /* Gujarat */ huva: 'Gujarat', 
  /* Madhya Pradesh */ huzur: 'Madhya Pradesh', 
  /* Telangana */ huzurabad: 'Telangana', hyderabad: 'Telangana', 
  /* Maharashtra */ ichalkaranji: 'Maharashtra', 
  /* Gujarat */ idar: 'Gujarat', 
  /* Kerala */ idukki: 'Kerala', 
  /* Uttar Pradesh */ iglas: 'Uttar Pradesh', 
  /* West Bengal */ illaberia: 'West Bengal', 
  /* Manipur */ imphal: 'Manipur', imphaleast: 'Manipur', imphalwest: 'Manipur', 
  /* Maharashtra */ indapur: 'Maharashtra', 
  /* West Bengal */ indas: 'West Bengal', 
  /* Karnataka */ indi: 'Karnataka', 
  /* Madhya Pradesh */ indore: 'Madhya Pradesh', 
  /* Haryana */ indri: 'Haryana', 
  /* Telangana */ indurvi: 'Telangana', 
  /* Kerala */ irinjalakuda: 'Kerala', iritty: 'Kerala', 
  /* Madhya Pradesh */ isagarh: 'Madhya Pradesh', 
  /* Bihar */ islampur: 'Bihar', 
  /* Arunachal Pradesh */ itanagar: 'Arunachal Pradesh', 
  /* Madhya Pradesh */ itarsi: 'Madhya Pradesh', 
  /* Uttar Pradesh */ itaunja: 'Uttar Pradesh', 
  /* Madhya Pradesh */ jabalpur: 'Madhya Pradesh', 
  /* Haryana */ jagadhri: 'Haryana', 
  /* Karnataka */ jagalur: 'Karnataka', 
  /* Odisha */ jagatsinghpur: 'Odisha', 
  /* Chhattisgarh */ jagdalpur: 'Chhattisgarh', 
  /* Telangana */ jagitial: 'Telangana', jagtial: 'Telangana', 
  /* Uttar Pradesh */ jahanabad: 'Uttar Pradesh', 
  /* Bihar */ jainagar: 'Bihar', 
  /* Rajasthan */ jaipur: 'Rajasthan', jaisalmer: 'Rajasthan', 
  /* Odisha */ jajpur: 'Odisha', 
  /* West Bengal */ jakua: 'West Bengal', 
  /* Uttar Pradesh */ jalalabad: 'Uttar Pradesh', 
  /* Gujarat */ jalalpore: 'Gujarat', 
  /* Punjab */ jalandhar: 'Punjab', 
  /* Uttar Pradesh */ jalaun: 'Uttar Pradesh', 
  /* Maharashtra */ jalgaon: 'Maharashtra', jalna: 'Maharashtra', 
  /* Rajasthan */ jalore: 'Rajasthan', 
  /* West Bengal */ jalpaiguri: 'West Bengal', 
  /* Bihar */ jamalpur: 'Bihar', 
  /* Gujarat */ jambusar: 'Gujarat', 
  /* Andhra Pradesh */ jammalamadugu: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ jammu: 'Jammu & Kashmir', 
  /* Gujarat */ jamnagar: 'Gujarat', 
  /* Jharkhand */ jamshedpur: 'Jharkhand', jamtara: 'Jharkhand', jamua: 'Jharkhand', 
  /* Bihar */ jamui: 'Bihar', 
  /* Delhi */ janakpuri: 'Delhi', 
  /* Telangana */ jangaon: 'Telangana', 
  /* Andhra Pradesh */ jangareddygudem: 'Andhra Pradesh', 
  /* Chhattisgarh */ janjgir: 'Chhattisgarh', janjgirchampa: 'Chhattisgarh', 
  /* Jharkhand */ jarmundi: 'Jharkhand', jarria: 'Jharkhand', 
  /* Gujarat */ jasdan: 'Gujarat', 
  /* Chhattisgarh */ jashpur: 'Chhattisgarh', jashpurnagar: 'Chhattisgarh', 
  /* Uttar Pradesh */ jaswantnagar: 'Uttar Pradesh', 
  /* Odisha */ jatani: 'Odisha', 
  /* Uttar Pradesh */ jaunpur: 'Uttar Pradesh', 
  /* Rajasthan */ javewar: 'Rajasthan', jawai: 'Rajasthan', 
  /* Himachal Pradesh */ jawalamukhi: 'Himachal Pradesh', 
  /* Tamil Nadu */ jayankondam: 'Tamil Nadu', 
  /* Telangana */ jayashankarbhupalpally: 'Telangana', 
  /* West Bengal */ jaypur: 'West Bengal', 
  /* Bihar */ jehanabad: 'Bihar', 
  /* Gujarat */ jetpur: 'Gujarat', 
  /* Karnataka */ jewargi: 'Karnataka', 
  /* Madhya Pradesh */ jhabua: 'Madhya Pradesh', 
  /* Bihar */ jhajha: 'Bihar', 
  /* Haryana */ jhajjar: 'Haryana', 
  /* Rajasthan */ jhalawar: 'Rajasthan', 
  /* West Bengal */ jhalda: 'West Bengal', 
  /* Uttar Pradesh */ jhansi: 'Uttar Pradesh', 
  /* West Bengal */ jhargram: 'West Bengal', 
  /* Odisha */ jharsuguda: 'Odisha', 
  /* Chhattisgarh */ jhira: 'Chhattisgarh', 
  /* Rajasthan */ jhunjhunu: 'Rajasthan', 
  /* West Bengal */ jiaganj: 'West Bengal', 
  /* Haryana */ jind: 'Haryana', 
  /* Manipur */ jiribam: 'Manipur', 
  /* Odisha */ joda: 'Odisha', 
  /* Rajasthan */ jodhpur: 'Rajasthan', 
  /* Himachal Pradesh */ jogindernagar: 'Himachal Pradesh', 
  /* Telangana */ jogulambagadwal: 'Telangana', 
  /* Tamil Nadu */ jolarpettai: 'Tamil Nadu', 
  /* Assam */ jonai: 'Assam', 
  /* Sikkim */ jorethang: 'Sikkim', 
  /* Assam */ jorhat: 'Assam', 
  /* Uttarakhand */ joshimath: 'Uttarakhand', 
  /* Meghalaya */ jowai: 'Meghalaya', 
  /* Telangana */ jukkal: 'Telangana', 
  /* Gujarat */ junagadh: 'Gujarat', 
  /* Odisha */ junagarh: 'Odisha', 
  /* Chhattisgarh */ kabirdham: 'Chhattisgarh', 
  /* Tripura */ kadamtala: 'Tripura', 
  /* Andhra Pradesh */ kadapa: 'Andhra Pradesh', 
  /* Gujarat */ kadi: 'Gujarat', 
  /* Uttar Pradesh */ kadipur: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kadiyam: 'Andhra Pradesh', 
  /* Telangana */ kagaznagar: 'Telangana', 
  /* Bihar */ kahalgaon: 'Bihar', 
  /* Andhra Pradesh */ kaikaluru: 'Andhra Pradesh', 
  /* Tripura */ kailashahar: 'Tripura', 
  /* Uttar Pradesh */ kaimganj: 'Uttar Pradesh', 
  /* Bihar */ kaimur: 'Bihar', 
  /* Haryana */ kaithal: 'Haryana', 
  /* Assam */ kajalgaon: 'Assam', 
  /* Odisha */ kakatpur: 'Odisha', 
  /* Manipur */ kakching: 'Manipur', 
  /* Andhra Pradesh */ kakinada: 'Andhra Pradesh', 
  /* Kerala */ kakkanad: 'Kerala', 
  /* Uttar Pradesh */ kakori: 'Uttar Pradesh', 
  /* Karnataka */ kalaburagi: 'Karnataka', 
  /* Odisha */ kalahandi: 'Odisha', 
  /* Karnataka */ kalasa: 'Karnataka', 
  /* Gujarat */ kalawad: 'Gujarat', 
  /* Karnataka */ kalghatgi: 'Karnataka', kalgi: 'Karnataka', 
  /* West Bengal */ kalimpong: 'West Bengal', 
  /* Odisha */ kalinga: 'Odisha', 
  /* Andhra Pradesh */ kalla: 'Andhra Pradesh', 
  /* Tamil Nadu */ kallakurichi: 'Tamil Nadu', 
  /* West Bengal */ kalna: 'West Bengal', 
  /* Kerala */ kalpetta: 'Kerala', 
  /* Uttar Pradesh */ kalpi: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kaluvakolanu: 'Andhra Pradesh', 
  /* Telangana */ kalwakurthy: 'Telangana', 
  /* Maharashtra */ kalyan: 'Maharashtra', 
  /* Andhra Pradesh */ kalyandurg: 'Andhra Pradesh', kamalapurum: 'Andhra Pradesh', 
  /* Telangana */ kamareddy: 'Telangana', 
  /* Manipur */ kamjong: 'Manipur', 
  /* Arunachal Pradesh */ kamle: 'Arunachal Pradesh', 
  /* Gujarat */ kamrej: 'Gujarat', 
  /* Assam */ kamrup: 'Assam', kamrupmetropolitan: 'Assam', 
  /* Karnataka */ kanakapura: 'Karnataka', 
  /* Tamil Nadu */ kancheepuram: 'Tamil Nadu', kanchipuram: 'Tamil Nadu', 
  /* Odisha */ kandhamal: 'Odisha', 
  /* Tamil Nadu */ kangeyam: 'Tamil Nadu', 
  /* Manipur */ kangpokpi: 'Manipur', 
  /* Himachal Pradesh */ kangra: 'Himachal Pradesh', 
  /* Manipur */ kangtui: 'Manipur', 
  /* Delhi */ kanjhawala: 'Delhi', 
  /* Kerala */ kanjirappalli: 'Kerala', 
  /* Jharkhand */ kanke: 'Jharkhand', 
  /* Chhattisgarh */ kanker: 'Chhattisgarh', 
  /* West Bengal */ kankinara: 'West Bengal', 
  /* Uttar Pradesh */ kannauj: 'Uttar Pradesh', 
  /* Kerala */ kannur: 'Kerala', 
  /* Uttar Pradesh */ kanpur: 'Uttar Pradesh', kanpurdehat: 'Uttar Pradesh', kanpurnagar: 'Uttar Pradesh', kanth: 'Uttar Pradesh', 
  /* West Bengal */ kanthi: 'West Bengal', 
  /* Tamil Nadu */ kanyakumari: 'Tamil Nadu', 
  /* Punjab */ kapurthala: 'Punjab', 
  /* Maharashtra */ karad: 'Maharashtra', 
  /* Puducherry */ karaikal: 'Puducherry', 
  /* Tamil Nadu */ karaikudi: 'Tamil Nadu', 
  /* Rajasthan */ karauli: 'Rajasthan', 
  /* Assam */ karbianglong: 'Assam', 
  /* Ladakh */ kargil: 'Ladakh', 
  /* Jammu & Kashmir */ kargilkahoon: 'Jammu & Kashmir', 
  /* Tamil Nadu */ kariapatti: 'Tamil Nadu', 
  /* Assam */ karimganj: 'Assam', 
  /* Telangana */ karimnagar: 'Telangana', 
  /* West Bengal */ karimpur: 'West Bengal', 
  /* Karnataka */ karkala: 'Karnataka', 
  /* Haryana */ karnal: 'Haryana', 
  /* Uttarakhand */ karnaprayag: 'Uttarakhand', 
  /* Delhi */ karolbagh: 'Delhi', 
  /* Bihar */ karpi: 'Bihar', 
  /* Kerala */ karunagappalli: 'Kerala', 
  /* Tamil Nadu */ karur: 'Tamil Nadu', 
  /* Karnataka */ karwar: 'Karnataka', 
  /* Uttar Pradesh */ karwi: 'Uttar Pradesh', 
  /* Kerala */ kasaragod: 'Kerala', 
  /* Chhattisgarh */ kasdol: 'Chhattisgarh', 
  /* Uttar Pradesh */ kasganj: 'Uttar Pradesh', 
  /* Uttarakhand */ kashipur: 'Uttarakhand', 
  /* Madhya Pradesh */ katangi: 'Madhya Pradesh', 
  /* Chhattisgarh */ katghora: 'Chhattisgarh', kathdol: 'Chhattisgarh', 
  /* Uttarakhand */ kathgodam: 'Uttarakhand', 
  /* Jammu & Kashmir */ kathua: 'Jammu & Kashmir', 
  /* Assam */ katigorah: 'Assam', 
  /* Bihar */ katihar: 'Bihar', 
  /* Madhya Pradesh */ katni: 'Madhya Pradesh', 
  /* Tamil Nadu */ katpadi: 'Tamil Nadu', 
  /* Uttar Pradesh */ katra: 'Uttar Pradesh', 
  /* Jharkhand */ katras: 'Jharkhand', 
  /* Kerala */ kattappana: 'Kerala', 
  /* West Bengal */ katwa: 'West Bengal', 
  /* Uttar Pradesh */ kaushambi: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kavali: 'Andhra Pradesh', 
  /* Lakshadweep */ kavaratti: 'Lakshadweep', 
  /* Chhattisgarh */ kawardha: 'Chhattisgarh', 
  /* Mizoram */ kawnpui: 'Mizoram', 
  /* Tamil Nadu */ keelakarai: 'Tamil Nadu', 
  /* Rajasthan */ kekri: 'Rajasthan', 
  /* Odisha */ kendrapara: 'Odisha', kendujhar: 'Odisha', keonjhar: 'Odisha', 
  /* Arunachal Pradesh */ keyipanyor: 'Arunachal Pradesh', 
  /* Himachal Pradesh */ keylong: 'Himachal Pradesh', 
  /* Odisha */ khabra: 'Odisha', 
  /* Bihar */ khagaria: 'Bihar', 
  /* Uttar Pradesh */ khairabad: 'Uttar Pradesh', 
  /* Chhattisgarh */ khairagarh: 'Chhattisgarh', khairagarhchhuikhadangandai: 'Chhattisgarh', 
  /* Rajasthan */ khairthal: 'Rajasthan', khairthaltijara: 'Rajasthan', 
  /* Ladakh */ khalatse: 'Ladakh', 
  /* Odisha */ khalikote: 'Odisha', 
  /* Uttar Pradesh */ khalilabad: 'Uttar Pradesh', 
  /* Bihar */ khalispur: 'Bihar', 
  /* Gujarat */ khambhalia: 'Gujarat', 
  /* Telangana */ khammam: 'Telangana', 
  /* Madhya Pradesh */ khandwa: 'Madhya Pradesh', 
  /* Punjab */ khanna: 'Punjab', 
  /* West Bengal */ kharagpur: 'West Bengal', 
  /* Punjab */ kharar: 'Punjab', 
  /* Madhya Pradesh */ khargone: 'Madhya Pradesh', 
  /* Haryana */ kharkhoda: 'Haryana', 
  /* Chhattisgarh */ kharsia: 'Chhattisgarh', 
  /* Jharkhand */ kharswan: 'Jharkhand', 
  /* Odisha */ khatiguma: 'Odisha', 
  /* West Bengal */ khatra: 'West Bengal', 
  /* Mizoram */ khawzawl: 'Mizoram', 
  /* Gujarat */ kheda: 'Gujarat', 
  /* Rajasthan */ kherwara: 'Rajasthan', 
  /* Meghalaya */ khliehriat: 'Meghalaya', 
  /* Arunachal Pradesh */ khonsa: 'Arunachal Pradesh', 
  /* Odisha */ khordha: 'Odisha', 
  /* Manipur */ khoupum: 'Manipur', 
  /* Tripura */ khowai: 'Tripura', 
  /* Assam */ khumtai: 'Assam', 
  /* Jharkhand */ khunti: 'Jharkhand', 
  /* Madhya Pradesh */ khurai: 'Madhya Pradesh', 
  /* Uttar Pradesh */ khurja: 'Uttar Pradesh', 
  /* Tamil Nadu */ killiyur: 'Tamil Nadu', kilvelur: 'Tamil Nadu', 
  /* Himachal Pradesh */ kinnaur: 'Himachal Pradesh', 
  /* Uttar Pradesh */ kintur: 'Uttar Pradesh', 
  /* Nagaland */ kiphire: 'Nagaland', 
  /* Bihar */ kishanganj: 'Bihar', 
  /* Rajasthan */ kishangarh: 'Rajasthan', 
  /* Jammu & Kashmir */ kishtwar: 'Jammu & Kashmir', 
  /* Kerala */ kochi: 'Kerala', 
  /* Karnataka */ kodagu: 'Karnataka', 
  /* Tamil Nadu */ kodaikanal: 'Tamil Nadu', 
  /* Odisha */ kodala: 'Odisha', 
  /* Telangana */ kodangal: 'Telangana', 
  /* Jharkhand */ koderma: 'Jharkhand', 
  /* Gujarat */ kodinar: 'Gujarat', 
  /* Telangana */ koheda: 'Telangana', 
  /* Nagaland */ kohima: 'Nagaland', 
  /* Assam */ kokrajhar: 'Assam', 
  /* Karnataka */ kolar: 'Karnataka', 
  /* Mizoram */ kolasib: 'Mizoram', 
  /* Maharashtra */ kolhapur: 'Maharashtra', 
  /* West Bengal */ kolkata: 'West Bengal', 
  /* Kerala */ kollam: 'Kerala', 
  /* Karnataka */ kollegal: 'Karnataka', 
  /* Arunachal Pradesh */ koloriang: 'Arunachal Pradesh', 
  /* Telangana */ komarambheem: 'Telangana', 
  /* Odisha */ komna: 'Odisha', 
  /* Andhra Pradesh */ konaseema: 'Andhra Pradesh', 
  /* Chhattisgarh */ kondagaon: 'Chhattisgarh', 
  /* Uttar Pradesh */ kondharkheda: 'Uttar Pradesh', 
  /* Kerala */ kondotty: 'Kerala', 
  /* Karnataka */ koppal: 'Karnataka', 
  /* Odisha */ koraput: 'Odisha', 
  /* Telangana */ koratla: 'Telangana', 
  /* Chhattisgarh */ korba: 'Chhattisgarh', korea: 'Chhattisgarh', 
  /* Odisha */ korei: 'Odisha', 
  /* Chhattisgarh */ koriya: 'Chhattisgarh', 
  /* Uttar Pradesh */ kosi: 'Uttar Pradesh', 
  /* Rajasthan */ kota: 'Rajasthan', 
  /* Odisha */ kotagarh: 'Odisha', 
  /* Tamil Nadu */ kotagiri: 'Tamil Nadu', 
  /* Gujarat */ kotdasangani: 'Gujarat', 
  /* Uttarakhand */ kotdwara: 'Uttarakhand', 
  /* Telangana */ kothagudem: 'Telangana', kothakota: 'Telangana', 
  /* Kerala */ kothamangalam: 'Kerala', 
  /* Andhra Pradesh */ kothapalle: 'Andhra Pradesh', 
  /* Punjab */ kotkapura: 'Punjab', 
  /* Rajasthan */ kotputli: 'Rajasthan', kotputlibehror: 'Rajasthan', 
  /* Kerala */ kottarakkara: 'Kerala', kottayam: 'Kerala', kovalam: 'Kerala', 
  /* Tamil Nadu */ kovilpatti: 'Tamil Nadu', 
  /* Andhra Pradesh */ kovvur: 'Andhra Pradesh', kovvuru: 'Andhra Pradesh', 
  /* Kerala */ koyilandy: 'Kerala', kozhencherry: 'Kerala', kozhikode: 'Kerala', 
  /* Arunachal Pradesh */ kradaadi: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ krishna: 'Andhra Pradesh', 
  /* Tamil Nadu */ krishnagiri: 'Tamil Nadu', 
  /* West Bengal */ krishnanagar: 'West Bengal', 
  /* Rajasthan */ kuchaman: 'Rajasthan', 
  /* Karnataka */ kudligi: 'Karnataka', 
  /* Bihar */ kudra: 'Bihar', 
  /* Karnataka */ kudremukh: 'Karnataka', 
  /* Jammu & Kashmir */ kulgam: 'Jammu & Kashmir', 
  /* Bihar */ kulharia: 'Bihar', 
  /* Tamil Nadu */ kulithalai: 'Tamil Nadu', 
  /* Himachal Pradesh */ kullu: 'Himachal Pradesh', 
  /* Uttar Pradesh */ kulpahar: 'Uttar Pradesh', 
  /* Tamil Nadu */ kumbakonam: 'Tamil Nadu', 
  /* Chhattisgarh */ kumhari: 'Chhattisgarh', 
  /* Karnataka */ kumta: 'Karnataka', 
  /* Telangana */ kumurambheemasifabad: 'Telangana', 
  /* Uttar Pradesh */ kunda: 'Uttar Pradesh', 
  /* Madhya Pradesh */ kundam: 'Madhya Pradesh', 
  /* Karnataka */ kundapura: 'Karnataka', kundgol: 'Karnataka', 
  /* Jharkhand */ kundhi: 'Jharkhand', 
  /* Chhattisgarh */ kundra: 'Chhattisgarh', 
  /* Karnataka */ kunigal: 'Karnataka', 
  /* Kerala */ kunnamkulam: 'Kerala', 
  /* Andhra Pradesh */ kuppam: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ kupwara: 'Jammu & Kashmir', 
  /* Bihar */ kurauli: 'Bihar', 
  /* Tamil Nadu */ kurinjipadi: 'Tamil Nadu', 
  /* Andhra Pradesh */ kurnool: 'Andhra Pradesh', 
  /* West Bengal */ kurseong: 'West Bengal', 
  /* Chhattisgarh */ kurud: 'Chhattisgarh', 
  /* Haryana */ kurukshetra: 'Haryana', 
  /* Arunachal Pradesh */ kurungkumey: 'Arunachal Pradesh', 
  /* Madhya Pradesh */ kurwai: 'Madhya Pradesh', 
  /* Goa */ kushavati: 'Goa', 
  /* Uttar Pradesh */ kushinagar: 'Uttar Pradesh', 
  /* Madhya Pradesh */ kusmi: 'Madhya Pradesh', 
  /* Sikkim */ kusong: 'Sikkim', 
  /* Gujarat */ kutch: 'Gujarat', 
  /* Kerala */ kuthuparamba: 'Kerala', kuttanad: 'Kerala', 
  /* Sikkim */ lachen: 'Sikkim', 
  /* Rajasthan */ lachhmangarh: 'Rajasthan', 
  /* Sikkim */ lachung: 'Sikkim', 
  /* Himachal Pradesh */ lahaulandspiti: 'Himachal Pradesh', 
  /* Uttar Pradesh */ lakhimpurkheri: 'Uttar Pradesh', 
  /* Assam */ lakhipur: 'Assam', 
  /* Bihar */ lakhisarai: 'Bihar', 
  /* Andhra Pradesh */ lakkirepally: 'Andhra Pradesh', 
  /* Lakshadweep */ lakshadweep: 'Lakshadweep', 
  /* Karnataka */ lakshmeshwar: 'Karnataka', 
  /* Tamil Nadu */ lalgudi: 'Tamil Nadu', 
  /* Uttar Pradesh */ lalitpur: 'Uttar Pradesh', 
  /* Madhya Pradesh */ lamdhi: 'Madhya Pradesh', 
  /* Manipur */ lamphelpat: 'Manipur', 
  /* Jharkhand */ lapung: 'Jharkhand', latehar: 'Jharkhand', 
  /* Gujarat */ lathi: 'Gujarat', 
  /* Maharashtra */ latur: 'Maharashtra', 
  /* Mizoram */ lawngtlai: 'Mizoram', 
  /* Assam */ ledo: 'Assam', 
  /* Ladakh */ leh: 'Ladakh', 
  /* Arunachal Pradesh */ lemmi: 'Arunachal Pradesh', leparada: 'Arunachal Pradesh', likabali: 'Arunachal Pradesh', 
  /* West Bengal */ liluah: 'West Bengal', 
  /* Gujarat */ limbdi: 'Gujarat', 
  /* Karnataka */ lingsugur: 'Karnataka', 
  /* Gujarat */ lodhika: 'Gujarat', 
  /* Jharkhand */ lohardaga: 'Jharkhand', 
  /* Arunachal Pradesh */ lohit: 'Arunachal Pradesh', longding: 'Arunachal Pradesh', 
  /* Nagaland */ longleng: 'Nagaland', 
  /* Arunachal Pradesh */ lowerdibangvalley: 'Arunachal Pradesh', lowersiang: 'Arunachal Pradesh', lowersubansiri: 'Arunachal Pradesh', 
  /* Uttar Pradesh */ lucknow: 'Uttar Pradesh', 
  /* Punjab */ ludhiana: 'Punjab', 
  /* Gujarat */ lunavada: 'Gujarat', 
  /* Chhattisgarh */ lundia: 'Chhattisgarh', 
  /* Mizoram */ lunglei: 'Mizoram', 
  /* Andhra Pradesh */ macherla: 'Andhra Pradesh', machilipatnam: 'Andhra Pradesh', madanapalle: 'Andhra Pradesh', 
  /* Karnataka */ maddur: 'Karnataka', 
  /* Goa */ madgaon: 'Goa', 
  /* Tamil Nadu */ madhavaram: 'Tamil Nadu', 
  /* Uttar Pradesh */ madhavganj: 'Uttar Pradesh', 
  /* Bihar */ madhepura: 'Bihar', madhubani: 'Bihar', 
  /* Jharkhand */ madhupur: 'Jharkhand', 
  /* Karnataka */ madikeri: 'Karnataka', 
  /* Tamil Nadu */ madras: 'Tamil Nadu', madukkarai: 'Tamil Nadu', madurai: 'Tamil Nadu', madurantakam: 'Tamil Nadu', 
  /* Karnataka */ magadi: 'Karnataka', 
  /* Telangana */ mahabubabad: 'Telangana', mahabubnagar: 'Telangana', 
  /* Odisha */ mahakuda: 'Odisha', 
  /* Haryana */ maham: 'Haryana', 
  /* Uttar Pradesh */ maharajganj: 'Uttar Pradesh', 
  /* Madhya Pradesh */ maharajpur: 'Madhya Pradesh', 
  /* Chhattisgarh */ mahasamund: 'Chhattisgarh', 
  /* Telangana */ mahbubnagar: 'Telangana', 
  /* Puducherry */ mahe: 'Puducherry', 
  /* Haryana */ mahendragarh: 'Haryana', 
  /* Jharkhand */ maheshpur: 'Jharkhand', 
  /* Gujarat */ mahisagar: 'Gujarat', 
  /* Uttar Pradesh */ mahoba: 'Uttar Pradesh', maholi: 'Uttar Pradesh', mahrajganj: 'Uttar Pradesh', 
  /* Gujarat */ mahuva: 'Gujarat', 
  /* Madhya Pradesh */ maihar: 'Madhya Pradesh', 
  /* West Bengal */ mainaguri: 'West Bengal', 
  /* Uttar Pradesh */ mainpuri: 'Uttar Pradesh', 
  /* Meghalaya */ mairang: 'Meghalaya', 
  /* Assam */ majuli: 'Assam', 
  /* Telangana */ makthal: 'Telangana', 
  /* Assam */ makum: 'Assam', 
  /* Kerala */ mala: 'Kerala', malappuram: 'Kerala', 
  /* Karnataka */ malavalli: 'Karnataka', 
  /* West Bengal */ malda: 'West Bengal', maldah: 'West Bengal', 
  /* Maharashtra */ malegaon: 'Maharashtra', 
  /* Punjab */ malerkotla: 'Punjab', 
  /* Gujarat */ malia: 'Gujarat', 
  /* Odisha */ malkangiri: 'Odisha', 
  /* Karnataka */ malur: 'Karnataka', 
  /* Mizoram */ mamit: 'Mizoram', 
  /* Telangana */ manakondur: 'Telangana', 
  /* Himachal Pradesh */ manali: 'Himachal Pradesh', 
  /* Tamil Nadu */ manamadurai: 'Tamil Nadu', 
  /* Kerala */ mananthavady: 'Kerala', 
  /* Tamil Nadu */ manapparai: 'Tamil Nadu', 
  /* Madhya Pradesh */ manasa: 'Madhya Pradesh', 
  /* Gujarat */ manavadar: 'Gujarat', 
  /* West Bengal */ manbazar: 'West Bengal', 
  /* Telangana */ mancherial: 'Telangana', 
  /* Rajasthan */ mandawa: 'Rajasthan', 
  /* Himachal Pradesh */ mandi: 'Himachal Pradesh', 
  /* Madhya Pradesh */ mandla: 'Madhya Pradesh', mandsaur: 'Madhya Pradesh', 
  /* Karnataka */ mandya: 'Karnataka', 
  /* Chhattisgarh */ manendragarh: 'Chhattisgarh', manendragarhchirmiribharatpur: 'Chhattisgarh', 
  /* Andhra Pradesh */ mangalagiri: 'Andhra Pradesh', 
  /* Assam */ mangaldoi: 'Assam', 
  /* West Bengal */ mangalkot: 'West Bengal', 
  /* Karnataka */ mangalore: 'Karnataka', mangaluru: 'Karnataka', 
  /* Sikkim */ mangan: 'Sikkim', 
  /* Chhattisgarh */ mango: 'Chhattisgarh', 
  /* Gujarat */ mangrol: 'Gujarat', 
  /* Bihar */ manihari: 'Bihar', 
  /* Chandigarh */ manimajra: 'Chandigarh', 
  /* Kerala */ manjeri: 'Kerala', manjeshwar: 'Kerala', 
  /* Uttar Pradesh */ manjhanpur: 'Uttar Pradesh', 
  /* Chhattisgarh */ manjhi: 'Chhattisgarh', 
  /* Assam */ mankachar: 'Assam', 
  /* Tamil Nadu */ mannargudi: 'Tamil Nadu', 
  /* Kerala */ mannarkkad: 'Kerala', 
  /* Punjab */ mansa: 'Punjab', 
  /* Bihar */ mansurchak: 'Bihar', 
  /* Karnataka */ manvi: 'Karnataka', 
  /* Goa */ mapusa: 'Goa', margao: 'Goa', 
  /* Assam */ margherita: 'Assam', 
  /* West Bengal */ margram: 'West Bengal', 
  /* Assam */ marigaon: 'Assam', 
  /* Andhra Pradesh */ markapur: 'Andhra Pradesh', markapuram: 'Andhra Pradesh', 
  /* Rajasthan */ marwar: 'Rajasthan', marwarjunction: 'Rajasthan', 
  /* Bihar */ masaurhi: 'Bihar', 
  /* Karnataka */ maski: 'Karnataka', 
  /* Bihar */ masrakh: 'Bihar', 
  /* Jharkhand */ masua: 'Jharkhand', 
  /* Uttar Pradesh */ mathura: 'Uttar Pradesh', 
  /* West Bengal */ matigara: 'West Bengal', 
  /* Kerala */ mattanur: 'Kerala', 
  /* Uttar Pradesh */ mau: 'Uttar Pradesh', 
  /* Madhya Pradesh */ mauganj: 'Madhya Pradesh', 
  /* Uttar Pradesh */ maunathbhanjan: 'Uttar Pradesh', 
  /* Punjab */ maur: 'Punjab', 
  /* Kerala */ mavelikara: 'Kerala', 
  /* Uttar Pradesh */ mawana: 'Uttar Pradesh', 
  /* Meghalaya */ mawkynrew: 'Meghalaya', mawkyrshan: 'Meghalaya', mawkyrwat: 'Meghalaya', 
  /* Andaman and Nicobar */ mayabunder: 'Andaman and Nicobar', 
  /* Tamil Nadu */ mayiladuthurai: 'Tamil Nadu', 
  /* Odisha */ mayurbhanj: 'Odisha', 
  /* Arunachal Pradesh */ mechuka: 'Arunachal Pradesh', 
  /* Telangana */ medak: 'Telangana', medchal: 'Telangana', 
  /* West Bengal */ medinipur: 'West Bengal', 
  /* Uttar Pradesh */ meerut: 'Uttar Pradesh', 
  /* Arunachal Pradesh */ mehao: 'Arunachal Pradesh', 
  /* Bihar */ mehdawal: 'Bihar', 
  /* Uttar Pradesh */ mehnagar: 'Uttar Pradesh', mehoni: 'Uttar Pradesh', 
  /* Gujarat */ mehsana: 'Gujarat', 
  /* Uttar Pradesh */ meja: 'Uttar Pradesh', 
  /* West Bengal */ mejia: 'West Bengal', 
  /* Sikkim */ melli: 'Sikkim', 
  /* Tamil Nadu */ melur: 'Tamil Nadu', 
  /* Nagaland */ meluri: 'Nagaland', 
  /* West Bengal */ memari: 'West Bengal', 
  /* Gujarat */ mendarda: 'Gujarat', 
  /* Telangana */ metpalli: 'Telangana', 
  /* Tamil Nadu */ mettupalayam: 'Tamil Nadu', mettur: 'Tamil Nadu', 
  /* West Bengal */ midnapore: 'West Bengal', 
  /* Maharashtra */ mirabhayandar: 'Maharashtra', miraj: 'Maharashtra', 
  /* Uttar Pradesh */ mirganj: 'Uttar Pradesh', mirzapur: 'Uttar Pradesh', misrikh: 'Uttar Pradesh', 
  /* Gujarat */ modasa: 'Gujarat', 
  /* Uttar Pradesh */ modipuram: 'Uttar Pradesh', 
  /* Punjab */ moga: 'Punjab', 
  /* Andhra Pradesh */ mogalthuru: 'Andhra Pradesh', 
  /* Telangana */ mogudapalli: 'Telangana', 
  /* Punjab */ mohali: 'Punjab', 
  /* Uttar Pradesh */ mohanlalganj: 'Uttar Pradesh', 
  /* Bihar */ mohiuddinnagar: 'Bihar', 
  /* Chhattisgarh */ mohla: 'Chhattisgarh', mohlamanpurambagarhchowki: 'Chhattisgarh', 
  /* Nagaland */ mokokchung: 'Nagaland', 
  /* Karnataka */ molakalmuru: 'Karnataka', 
  /* Telangana */ mominpura: 'Telangana', 
  /* Nagaland */ mon: 'Nagaland', 
  /* Uttar Pradesh */ moradabad: 'Uttar Pradesh', 
  /* Assam */ moran: 'Assam', 
  /* Gujarat */ morbi: 'Gujarat', 
  /* Madhya Pradesh */ morena: 'Madhya Pradesh', 
  /* Assam */ morigaon: 'Assam', 
  /* Telangana */ mothkur: 'Telangana', 
  /* Bihar */ motihari: 'Bihar', 
  /* Punjab */ mukerian: 'Punjab', muktsar: 'Punjab', 
  /* Karnataka */ mulbagal: 'Karnataka', 
  /* Telangana */ mulugu: 'Telangana', 
  /* Maharashtra */ mumbai: 'Maharashtra', mumbaisuburban: 'Maharashtra', 
  /* Karnataka */ mundgod: 'Karnataka', 
  /* Gujarat */ mundra: 'Gujarat', 
  /* Chhattisgarh */ mungeli: 'Chhattisgarh', 
  /* Bihar */ munger: 'Bihar', 
  /* West Bengal */ murarai: 'West Bengal', murshidabad: 'West Bengal', 
  /* Bihar */ mushahri: 'Bihar', 
  /* Assam */ mushalpur: 'Assam', 
  /* Tamil Nadu */ musiri: 'Tamil Nadu', 
  /* Uttarakhand */ mussoorie: 'Uttarakhand', 
  /* Tamil Nadu */ muthupet: 'Tamil Nadu', 
  /* Kerala */ muvattupuzha: 'Kerala', 
  /* Uttar Pradesh */ muzaffarnagar: 'Uttar Pradesh', 
  /* Bihar */ muzaffarpur: 'Bihar', 
  /* Andhra Pradesh */ mylavaram: 'Andhra Pradesh', 
  /* Karnataka */ mysore: 'Karnataka', mysuru: 'Karnataka', 
  /* Odisha */ nabarangpur: 'Odisha', 
  /* Punjab */ nabha: 'Punjab', 
  /* West Bengal */ nadia: 'West Bengal', 
  /* Gujarat */ nadiad: 'Gujarat', 
  /* Karnataka */ nagamangala: 'Karnataka', 
  /* Assam */ nagaon: 'Assam', 
  /* Tamil Nadu */ nagapattinam: 'Tamil Nadu', 
  /* Andhra Pradesh */ nagari: 'Andhra Pradesh', 
  /* Telangana */ nagarkurnool: 'Telangana', 
  /* Rajasthan */ nagaur: 'Rajasthan', 
  /* Tamil Nadu */ nagercoil: 'Tamil Nadu', 
  /* Uttar Pradesh */ nagina: 'Uttar Pradesh', nagla: 'Uttar Pradesh', 
  /* Tamil Nadu */ nagore: 'Tamil Nadu', 
  /* Maharashtra */ nagpur: 'Maharashtra', 
  /* Himachal Pradesh */ nahan: 'Himachal Pradesh', 
  /* Assam */ naharkatia: 'Assam', 
  /* Arunachal Pradesh */ naharlagun: 'Arunachal Pradesh', 
  /* Uttarakhand */ nainital: 'Uttarakhand', 
  /* Gujarat */ nakhatrana: 'Gujarat', 
  /* Punjab */ nakodar: 'Punjab', 
  /* Bihar */ nalanda: 'Bihar', 
  /* Maharashtra */ nalasopara: 'Maharashtra', 
  /* Assam */ nalbari: 'Assam', 
  /* Telangana */ nalgonda: 'Telangana', 
  /* West Bengal */ nalhati: 'West Bengal', 
  /* Tamil Nadu */ namakkal: 'Tamil Nadu', 
  /* Sikkim */ namchi: 'Sikkim', 
  /* Arunachal Pradesh */ namsai: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ nandalur: 'Andhra Pradesh', 
  /* Maharashtra */ nanded: 'Maharashtra', 
  /* West Bengal */ nandigram: 'West Bengal', 
  /* Delhi */ nandnagri: 'Delhi', 
  /* Maharashtra */ nandurbar: 'Maharashtra', 
  /* Andhra Pradesh */ nandyal: 'Andhra Pradesh', 
  /* Punjab */ nangal: 'Punjab', 
  /* Tamil Nadu */ nanguneri: 'Tamil Nadu', 
  /* Karnataka */ nanjangud: 'Karnataka', 
  /* Tamil Nadu */ nannilam: 'Tamil Nadu', 
  /* Arunachal Pradesh */ napangphung: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ narakapatnam: 'Andhra Pradesh', narasampet: 'Andhra Pradesh', narasaraopet: 'Andhra Pradesh', 
  /* Telangana */ narayanpet: 'Telangana', 
  /* Arunachal Pradesh */ nari: 'Arunachal Pradesh', 
  /* Bihar */ narkatiaganj: 'Bihar', 
  /* Odisha */ narla: 'Odisha', 
  /* Gujarat */ narmada: 'Gujarat', 
  /* Haryana */ narnaul: 'Haryana', narnaund: 'Haryana', 
  /* Telangana */ narsampet: 'Telangana', 
  /* Madhya Pradesh */ narsinghpur: 'Madhya Pradesh', 
  /* Haryana */ narwana: 'Haryana', 
  /* Maharashtra */ nashik: 'Maharashtra', 
  /* Rajasthan */ nasirabad: 'Rajasthan', 
  /* Tamil Nadu */ natham: 'Tamil Nadu', 
  /* Rajasthan */ nathdwara: 'Rajasthan', 
  /* Bihar */ nathnagar: 'Bihar', naugachia: 'Bihar', 
  /* Uttar Pradesh */ naugarh: 'Uttar Pradesh', nautanwa: 'Uttar Pradesh', 
  /* Karnataka */ navalgund: 'Karnataka', 
  /* Maharashtra */ navimumbai: 'Maharashtra', 
  /* Gujarat */ navsari: 'Gujarat', 
  /* Bihar */ nawada: 'Bihar', 
  /* Punjab */ nawanshahr: 'Punjab', 
  /* West Bengal */ naxalbari: 'West Bengal', 
  /* Sikkim */ nayabazar: 'Sikkim', 
  /* Odisha */ nayagarh: 'Odisha', 
  /* Assam */ nazira: 'Assam', 
  /* Kerala */ nedumkandam: 'Kerala', 
  /* Tamil Nadu */ needamangalam: 'Tamil Nadu', 
  /* Madhya Pradesh */ neemuch: 'Madhya Pradesh', 
  /* Karnataka */ nelamangala: 'Karnataka', 
  /* Andhra Pradesh */ nellimarla: 'Andhra Pradesh', nellore: 'Andhra Pradesh', 
  /* Tripura */ nepalinagar: 'Tripura', 
  /* Madhya Pradesh */ nepanagar: 'Madhya Pradesh', 
  /* Delhi */ newdelhi: 'Delhi', 
  /* Uttarakhand */ newtehri: 'Uttarakhand', 
  /* Tamil Nadu */ neyveli: 'Tamil Nadu', 
  /* Kerala */ neyyattinkara: 'Kerala', 
  /* Uttar Pradesh */ nichlaul: 'Uttar Pradesh', 
  /* Andaman and Nicobar */ nicobar: 'Andaman and Nicobar', 
  /* Andhra Pradesh */ nidadavolu: 'Andhra Pradesh', 
  /* Odisha */ nilagiri: 'Odisha', 
  /* Kerala */ nilambur: 'Kerala', 
  /* Tamil Nadu */ nilgiris: 'Tamil Nadu', 
  /* Odisha */ nimapara: 'Odisha', nimdella: 'Odisha', nindura: 'Odisha', 
  /* Karnataka */ nippani: 'Karnataka', 
  /* Telangana */ nirmal: 'Telangana', 
  /* West Bengal */ nirsa: 'West Bengal', 
  /* Nagaland */ niuland: 'Nagaland', 
  /* Madhya Pradesh */ niwari: 'Madhya Pradesh', 
  /* Telangana */ nizamabad: 'Telangana', nizamsagar: 'Telangana', 
  /* Haryana */ nohar: 'Haryana', 
  /* Uttar Pradesh */ noida: 'Uttar Pradesh', 
  /* Nagaland */ noklak: 'Nagaland', 
  /* Manipur */ noney: 'Manipur', 
  /* Meghalaya */ nongpoh: 'Meghalaya', nongstoin: 'Meghalaya', 
  /* Andaman and Nicobar */ northandmiddleandaman: 'Andaman and Nicobar', 
  /* Delhi */ northdelhi: 'Delhi', northeastdelhi: 'Delhi', 
  /* Meghalaya */ northgarohills: 'Meghalaya', 
  /* Goa */ northgoa: 'Goa', 
  /* Assam */ northlakhimpur: 'Assam', 
  /* Sikkim */ northsikkim: 'Sikkim', 
  /* Tripura */ northtripura: 'Tripura', 
  /* Delhi */ northwestdelhi: 'Delhi', 
  /* Andhra Pradesh */ ntr: 'Andhra Pradesh', 
  /* Odisha */ nuapada: 'Odisha', 
  /* Ladakh */ nubra: 'Ladakh', 
  /* Haryana */ nuh: 'Haryana', 
  /* Manipur */ nungba: 'Manipur', 
  /* Himachal Pradesh */ nurpur: 'Himachal Pradesh', 
  /* Ladakh */ nyoma: 'Ladakh', 
  /* Tamil Nadu */ oddanchatram: 'Tamil Nadu', 
  /* Arunachal Pradesh */ oldziro: 'Arunachal Pradesh', 
  /* Bihar */ olhapur: 'Bihar', 
  /* Kerala */ ollur: 'Kerala', 
  /* Gujarat */ olpad: 'Gujarat', 
  /* Tamil Nadu */ omalur: 'Tamil Nadu', 
  /* West Bengal */ onda: 'West Bengal', 
  /* Andhra Pradesh */ ongole: 'Andhra Pradesh', 
  /* Tamil Nadu */ ooty: 'Tamil Nadu', 
  /* Uttar Pradesh */ orai: 'Uttar Pradesh', 
  /* Maharashtra */ oros: 'Maharashtra', 
  /* Rajasthan */ osian: 'Rajasthan', 
  /* Maharashtra */ osmanabad: 'Maharashtra', 
  /* Kerala */ ottappalam: 'Kerala', 
  /* Puducherry */ ozhukarai: 'Puducherry', 
  /* Odisha */ padampur: 'Odisha', 
  /* Andhra Pradesh */ paderu: 'Andhra Pradesh', 
  /* Gujarat */ padra: 'Gujarat', 
  /* Uttar Pradesh */ padrauna: 'Uttar Pradesh', 
  /* Ladakh */ padum: 'Ladakh', 
  /* Jharkhand */ paharia: 'Jharkhand', 
  /* Kerala */ painavu: 'Kerala', 
  /* Arunachal Pradesh */ pakkekessang: 'Arunachal Pradesh', 
  /* Jharkhand */ pakur: 'Jharkhand', 
  /* Sikkim */ pakyong: 'Sikkim', 
  /* Kerala */ pala: 'Kerala', 
  /* Andhra Pradesh */ palacole: 'Andhra Pradesh', 
  /* Kerala */ palakkad: 'Kerala', 
  /* Andhra Pradesh */ palamaner: 'Andhra Pradesh', 
  /* Himachal Pradesh */ palampur: 'Himachal Pradesh', 
  /* Jharkhand */ palamu: 'Jharkhand', 
  /* Tamil Nadu */ palani: 'Tamil Nadu', 
  /* Gujarat */ palanpur: 'Gujarat', 
  /* Andhra Pradesh */ palasa: 'Andhra Pradesh', 
  /* Maharashtra */ palghar: 'Maharashtra', 
  /* Rajasthan */ pali: 'Rajasthan', 
  /* Bihar */ paliganj: 'Bihar', 
  /* Arunachal Pradesh */ palin: 'Arunachal Pradesh', 
  /* Tamil Nadu */ pallapatti: 'Tamil Nadu', pallavaram: 'Tamil Nadu', 
  /* Andhra Pradesh */ palnadu: 'Andhra Pradesh', 
  /* Telangana */ palvoncha: 'Telangana', 
  /* Haryana */ palwal: 'Haryana', 
  /* West Bengal */ panagarh: 'West Bengal', 
  /* Goa */ panaji: 'Goa', 
  /* Haryana */ panchkula: 'Haryana', 
  /* West Bengal */ panchla: 'West Bengal', 
  /* Gujarat */ panchmahal: 'Gujarat', 
  /* Karnataka */ pandavapura: 'Karnataka', 
  /* Maharashtra */ pandharpur: 'Maharashtra', 
  /* Madhya Pradesh */ pandhurna: 'Madhya Pradesh', 
  /* Chhattisgarh */ pandri: 'Chhattisgarh', 
  /* Arunachal Pradesh */ pangin: 'Arunachal Pradesh', 
  /* Haryana */ panipat: 'Haryana', 
  /* Goa */ panjim: 'Goa', 
  /* Madhya Pradesh */ panna: 'Madhya Pradesh', 
  /* Tamil Nadu */ panruti: 'Tamil Nadu', 
  /* West Bengal */ panskura: 'West Bengal', 
  /* Maharashtra */ panvel: 'Maharashtra', 
  /* Tamil Nadu */ papanasam: 'Tamil Nadu', 
  /* Arunachal Pradesh */ papumpare: 'Arunachal Pradesh', 
  /* Odisha */ paralakhemundi: 'Odisha', 
  /* Rajasthan */ parbatsar: 'Rajasthan', 
  /* Maharashtra */ parbhani: 'Maharashtra', 
  /* Jharkhand */ parsori: 'Jharkhand', 
  /* Andhra Pradesh */ parvathipuram: 'Andhra Pradesh', parvathipurammanyam: 'Andhra Pradesh', 
  /* Himachal Pradesh */ parwanoo: 'Himachal Pradesh', 
  /* West Bengal */ paschimbardhaman: 'West Bengal', paschimmedinipur: 'West Bengal', 
  /* Arunachal Pradesh */ pasighat: 'Arunachal Pradesh', 
  /* Gujarat */ patan: 'Gujarat', 
  /* Telangana */ patancheru: 'Telangana', 
  /* Chhattisgarh */ patanjli: 'Chhattisgarh', 
  /* West Bengal */ patashpur: 'West Bengal', 
  /* Haryana */ pataudi: 'Haryana', 
  /* Chhattisgarh */ pathalgaon: 'Chhattisgarh', 
  /* Kerala */ pathanamthitta: 'Kerala', pathanapuram: 'Kerala', 
  /* Punjab */ pathankot: 'Punjab', 
  /* Assam */ pathsala: 'Assam', 
  /* Punjab */ patiala: 'Punjab', 
  /* Bihar */ patna: 'Bihar', 
  /* Odisha */ patnagarh: 'Odisha', 
  /* Kerala */ pattambi: 'Kerala', 
  /* Odisha */ pattamundai: 'Odisha', 
  /* Tamil Nadu */ pattukkottai: 'Tamil Nadu', 
  /* Uttarakhand */ pauri: 'Uttarakhand', paurigarhwal: 'Uttarakhand', 
  /* Kerala */ payyanur: 'Kerala', pazhayangadi: 'Kerala', 
  /* Telangana */ peddapalli: 'Telangana', 
  /* Kerala */ peerumedu: 'Kerala', 
  /* Haryana */ pehowa: 'Haryana', 
  /* Chhattisgarh */ pendra: 'Chhattisgarh', 
  /* Andhra Pradesh */ penugonda: 'Andhra Pradesh', penukonda: 'Andhra Pradesh', penumarru: 'Andhra Pradesh', 
  /* Tamil Nadu */ perambalur: 'Tamil Nadu', 
  /* Kerala */ perambra: 'Kerala', 
  /* Tamil Nadu */ peravurani: 'Tamil Nadu', 
  /* Nagaland */ peren: 'Nagaland', 
  /* Kerala */ peringottur: 'Kerala', perinthalmanna: 'Kerala', 
  /* Tamil Nadu */ perundurai: 'Tamil Nadu', 
  /* Bihar */ peshar: 'Bihar', 
  /* Nagaland */ pfutsero: 'Nagaland', 
  /* Punjab */ phagwara: 'Punjab', 
  /* Rajasthan */ phalodi: 'Rajasthan', 
  /* West Bengal */ phansidewa: 'West Bengal', 
  /* Nagaland */ phek: 'Nagaland', 
  /* Manipur */ pherzawl: 'Manipur', 
  /* Odisha */ phulbani: 'Odisha', 
  /* Assam */ phulbari: 'Assam', 
  /* Bihar */ phulparas: 'Bihar', 
  /* Uttar Pradesh */ phulpur: 'Uttar Pradesh', 
  /* Bihar */ phulwari: 'Bihar', 
  /* Madhya Pradesh */ pichhore: 'Madhya Pradesh', 
  /* Andhra Pradesh */ piduguralla: 'Andhra Pradesh', pileru: 'Andhra Pradesh', 
  /* Uttar Pradesh */ pilibhit: 'Uttar Pradesh', 
  /* Maharashtra */ pimprichinchwad: 'Maharashtra', 
  /* Uttar Pradesh */ pindra: 'Uttar Pradesh', 
  /* Rajasthan */ pindwara: 'Rajasthan', 
  /* West Bengal */ pingla: 'West Bengal', 
  /* Madhya Pradesh */ pipariya: 'Madhya Pradesh', 
  /* Odisha */ pipili: 'Odisha', 
  /* Madhya Pradesh */ pipoda: 'Madhya Pradesh', 
  /* Jharkhand */ pipra: 'Jharkhand', 
  /* Uttar Pradesh */ pipraich: 'Uttar Pradesh', 
  /* Bihar */ piprasi: 'Bihar', 
  /* Delhi */ pitampura: 'Delhi', 
  /* Andhra Pradesh */ pithapuram: 'Andhra Pradesh', 
  /* Uttarakhand */ pithoragarh: 'Uttarakhand', 
  /* Rajasthan */ pokaran: 'Rajasthan', 
  /* Odisha */ polasara: 'Odisha', 
  /* Andhra Pradesh */ polavaram: 'Andhra Pradesh', 
  /* Tamil Nadu */ pollachi: 'Tamil Nadu', polur: 'Tamil Nadu', 
  /* Goa */ ponda: 'Goa', 
  /* Puducherry */ pondicherry: 'Puducherry', 
  /* Andhra Pradesh */ ponduru: 'Andhra Pradesh', ponnur: 'Andhra Pradesh', 
  /* Tamil Nadu */ poompuhar: 'Tamil Nadu', poonamallee: 'Tamil Nadu', 
  /* Jammu & Kashmir */ poonch: 'Jammu & Kashmir', 
  /* Kerala */ poonjar: 'Kerala', 
  /* Gujarat */ porbandar: 'Gujarat', 
  /* Manipur */ porompat: 'Manipur', 
  /* Andaman and Nicobar */ portblair: 'Andaman and Nicobar', 
  /* West Bengal */ potashpur: 'West Bengal', 
  /* Jharkhand */ potka: 'Jharkhand', 
  /* Uttar Pradesh */ powayan: 'Uttar Pradesh', 
  /* Andhra Pradesh */ prakasam: 'Andhra Pradesh', 
  /* Bihar */ pranpur: 'Bihar', 
  /* Gujarat */ prantij: 'Gujarat', 
  /* Rajasthan */ pratapgarhraj: 'Rajasthan', 
  /* Chhattisgarh */ pratappur: 'Chhattisgarh', 
  /* Uttar Pradesh */ prayagraj: 'Uttar Pradesh', 
  /* Delhi */ preetvihar: 'Delhi', 
  /* Andhra Pradesh */ proddatur: 'Andhra Pradesh', 
  /* Puducherry */ puducherry: 'Puducherry', 
  /* Tamil Nadu */ pudukkottai: 'Tamil Nadu', 
  /* Andhra Pradesh */ pulivendla: 'Andhra Pradesh', 
  /* Telangana */ pulkal: 'Telangana', 
  /* Jammu & Kashmir */ pulwama: 'Jammu & Kashmir', 
  /* Kerala */ punalur: 'Kerala', 
  /* Maharashtra */ pune: 'Maharashtra', 
  /* Delhi */ punjabibagh: 'Delhi', 
  /* West Bengal */ purbabardhaman: 'West Bengal', purbamedinipur: 'West Bengal', 
  /* Odisha */ puri: 'Odisha', 
  /* Bihar */ purnia: 'Bihar', 
  /* West Bengal */ purulia: 'West Bengal', 
  /* Odisha */ purushottampur: 'Odisha', 
  /* Andhra Pradesh */ puttaparthi: 'Andhra Pradesh', 
  /* Meghalaya */ pynursla: 'Meghalaya', 
  /* Goa */ quepem: 'Goa', 
  /* Kerala */ quilon: 'Kerala', 
  /* Karnataka */ rabkavi: 'Karnataka', 
  /* Gujarat */ radhanpur: 'Gujarat', 
  /* Uttar Pradesh */ raebareli: 'Uttar Pradesh', 
  /* Arunachal Pradesh */ raga: 'Arunachal Pradesh', 
  /* West Bengal */ raghunathpur: 'West Bengal', 
  /* Karnataka */ raichur: 'Karnataka', 
  /* Maharashtra */ raigad: 'Maharashtra', 
  /* West Bengal */ raiganj: 'West Bengal', 
  /* Chhattisgarh */ raigarh: 'Chhattisgarh', 
  /* Odisha */ railanka: 'Odisha', 
  /* Chhattisgarh */ raipur: 'Chhattisgarh', 
  /* Madhya Pradesh */ raisen: 'Madhya Pradesh', 
  /* Andhra Pradesh */ rajahmundry: 'Andhra Pradesh', rajamahendravaram: 'Andhra Pradesh', rajampeta: 'Andhra Pradesh', 
  /* Telangana */ rajannasircilla: 'Telangana', 
  /* Jammu & Kashmir */ rajanpur: 'Jammu & Kashmir', 
  /* Tamil Nadu */ rajapalayam: 'Tamil Nadu', 
  /* Uttar Pradesh */ rajauli: 'Uttar Pradesh', 
  /* Jammu & Kashmir */ rajauri: 'Jammu & Kashmir', 
  /* Madhya Pradesh */ rajgarh: 'Madhya Pradesh', 
  /* Bihar */ rajgir: 'Bihar', 
  /* Gujarat */ rajkot: 'Gujarat', 
  /* Rajasthan */ rajlamni: 'Rajasthan', 
  /* Jharkhand */ rajnagar: 'Jharkhand', 
  /* Chhattisgarh */ rajnandgaon: 'Chhattisgarh', 
  /* Jammu & Kashmir */ rajouri: 'Jammu & Kashmir', 
  /* Delhi */ rajourigarden: 'Delhi', 
  /* Gujarat */ rajpipla: 'Gujarat', 
  /* Uttar Pradesh */ rajpur: 'Uttar Pradesh', 
  /* Punjab */ rajpura: 'Punjab', 
  /* Rajasthan */ rajsamand: 'Rajasthan', 
  /* Odisha */ ramachandrapur: 'Odisha', 
  /* Telangana */ ramagundam: 'Telangana', 
  /* Karnataka */ ramanagara: 'Karnataka', 
  /* Tamil Nadu */ ramanathapuram: 'Tamil Nadu', 
  /* Andhra Pradesh */ ramaruggu: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ ramban: 'Jammu & Kashmir', 
  /* Tamil Nadu */ rameswaram: 'Tamil Nadu', 
  /* Jharkhand */ ramgarh: 'Jharkhand', 
  /* Andhra Pradesh */ rampachodavaram: 'Andhra Pradesh', 
  /* Uttar Pradesh */ rampur: 'Uttar Pradesh', 
  /* Punjab */ rampuraphul: 'Punjab', 
  /* West Bengal */ rampurhat: 'West Bengal', 
  /* Rajasthan */ ramsan: 'Rajasthan', 
  /* West Bengal */ ranaghat: 'West Bengal', 
  /* Jharkhand */ ranchi: 'Jharkhand', 
  /* Karnataka */ ranebennur: 'Karnataka', 
  /* Assam */ rangapara: 'Assam', 
  /* Telangana */ rangareddy: 'Telangana', 
  /* Assam */ rangia: 'Assam', 
  /* Sikkim */ rangpo: 'Sikkim', 
  /* Haryana */ rania: 'Haryana', 
  /* West Bengal */ raniganj: 'West Bengal', 
  /* Tamil Nadu */ ranipet: 'Tamil Nadu', ranipettai: 'Tamil Nadu', 
  /* Odisha */ ranipur: 'Odisha', 
  /* Kerala */ ranni: 'Kerala', 
  /* Gujarat */ ranpur: 'Gujarat', rapar: 'Gujarat', 
  /* Andhra Pradesh */ raptadu: 'Andhra Pradesh', 
  /* Tamil Nadu */ rasipur: 'Tamil Nadu', 
  /* Rajasthan */ rath: 'Rajasthan', 
  /* Madhya Pradesh */ ratlam: 'Madhya Pradesh', 
  /* Maharashtra */ ratnagiri: 'Maharashtra', 
  /* Jharkhand */ ratu: 'Jharkhand', 
  /* Bihar */ raxaul: 'Bihar', 
  /* Andhra Pradesh */ rayachoti: 'Andhra Pradesh', rayadurg: 'Andhra Pradesh', 
  /* Odisha */ rayagada: 'Odisha', 
  /* Andhra Pradesh */ razole: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ reasi: 'Jammu & Kashmir', 
  /* Himachal Pradesh */ reckongpeo: 'Himachal Pradesh', 
  /* Madhya Pradesh */ rehli: 'Madhya Pradesh', 
  /* Odisha */ remuna: 'Odisha', 
  /* Andhra Pradesh */ repalle: 'Andhra Pradesh', 
  /* Meghalaya */ resubelpara: 'Meghalaya', 
  /* Madhya Pradesh */ rewa: 'Madhya Pradesh', 
  /* Haryana */ rewari: 'Haryana', 
  /* Meghalaya */ ribhoi: 'Meghalaya', 
  /* Sikkim */ rinchenpong: 'Sikkim', 
  /* Uttarakhand */ rishikesh: 'Uttarakhand', 
  /* Uttar Pradesh */ robertsganj: 'Uttar Pradesh', 
  /* Delhi */ rohini: 'Delhi', 
  /* Haryana */ rohtak: 'Haryana', 
  /* Bihar */ rohtas: 'Bihar', 
  /* Arunachal Pradesh */ roing: 'Arunachal Pradesh', 
  /* Uttarakhand */ roorkee: 'Uttarakhand', 
  /* Bihar */ rosera: 'Bihar', 
  /* Odisha */ rourkela: 'Odisha', 
  /* Uttarakhand */ rudraprayag: 'Uttarakhand', rudrapur: 'Uttarakhand', 
  /* Punjab */ rupnagar: 'Punjab', 
  /* Odisha */ rupsa: 'Odisha', 
  /* Gujarat */ sabarkantha: 'Gujarat', 
  /* Bihar */ sabour: 'Bihar', 
  /* Uttar Pradesh */ sadabad: 'Uttar Pradesh', 
  /* Delhi */ sadarbazaar: 'Delhi', 
  /* Assam */ sadiya: 'Assam', 
  /* Rajasthan */ sadri: 'Rajasthan', 
  /* Madhya Pradesh */ sagar: 'Madhya Pradesh', 
  /* Karnataka */ sagara: 'Karnataka', 
  /* Uttar Pradesh */ sahanpur: 'Uttar Pradesh', saharanpur: 'Uttar Pradesh', 
  /* Bihar */ saharsa: 'Bihar', 
  /* Uttar Pradesh */ sahaswan: 'Uttar Pradesh', 
  /* Jharkhand */ sahebganj: 'Jharkhand', 
  /* Punjab */ sahibzadaajitsinghnagar: 'Punjab', sahnewal: 'Punjab', 
  /* Uttar Pradesh */ saidpur: 'Uttar Pradesh', 
  /* Mizoram */ saiha: 'Mizoram', 
  /* Manipur */ saikol: 'Manipur', 
  /* West Bengal */ sainthia: 'West Bengal', 
  /* Mizoram */ saitual: 'Mizoram', 
  /* Chhattisgarh */ saja: 'Chhattisgarh', 
  /* Delhi */ saket: 'Delhi', 
  /* Karnataka */ sakleshpur: 'Karnataka', 
  /* Chhattisgarh */ sakti: 'Chhattisgarh', 
  /* Tamil Nadu */ salem: 'Tamil Nadu', 
  /* West Bengal */ saltora: 'West Bengal', 
  /* Rajasthan */ salumbar: 'Rajasthan', 
  /* Punjab */ samana: 'Punjab', 
  /* Bihar */ samastipur: 'Bihar', 
  /* Jammu & Kashmir */ samba: 'Jammu & Kashmir', 
  /* Odisha */ sambalpur: 'Odisha', 
  /* Uttar Pradesh */ sambhal: 'Uttar Pradesh', 
  /* Chhattisgarh */ samri: 'Chhattisgarh', 
  /* Gujarat */ sanand: 'Gujarat', 
  /* Rajasthan */ sanchore: 'Rajasthan', 
  /* Uttar Pradesh */ sandila: 'Uttar Pradesh', 
  /* Karnataka */ sandur: 'Karnataka', 
  /* Telangana */ sangareddy: 'Telangana', 
  /* Maharashtra */ sangli: 'Maharashtra', 
  /* Punjab */ sangrur: 'Punjab', 
  /* Goa */ sanguem: 'Goa', 
  /* Tamil Nadu */ sankagiri: 'Tamil Nadu', 
  /* Assam */ sankardevnagar: 'Assam', 
  /* West Bengal */ sankrail: 'West Bengal', 
  /* Goa */ sanquelim: 'Goa', 
  /* Gujarat */ santhali: 'Gujarat', 
  /* Uttar Pradesh */ santkabirnagar: 'Uttar Pradesh', 
  /* Madhya Pradesh */ sanwer: 'Madhya Pradesh', 
  /* Rajasthan */ sarada: 'Rajasthan', 
  /* Jharkhand */ saraikela: 'Jharkhand', 
  /* Chhattisgarh */ saraipali: 'Chhattisgarh', 
  /* Bihar */ saran: 'Bihar', 
  /* Chhattisgarh */ sarangarh: 'Chhattisgarh', sarangarhbilaigarh: 'Chhattisgarh', 
  /* Jharkhand */ sarath: 'Jharkhand', 
  /* Uttar Pradesh */ sardhana: 'Uttar Pradesh', 
  /* Rajasthan */ sardulgarh: 'Rajasthan', 
  /* Uttar Pradesh */ sarnath: 'Uttar Pradesh', 
  /* Bihar */ sasaram: 'Bihar', 
  /* Uttar Pradesh */ sasni: 'Uttar Pradesh', 
  /* Maharashtra */ satara: 'Maharashtra', 
  /* Tamil Nadu */ sathankulam: 'Tamil Nadu', 
  /* Madhya Pradesh */ satna: 'Madhya Pradesh', 
  /* Goa */ sattari: 'Goa', 
  /* Andhra Pradesh */ sattenapalle: 'Andhra Pradesh', 
  /* Tamil Nadu */ sattur: 'Tamil Nadu', 
  /* Rajasthan */ sawaimadhopur: 'Rajasthan', 
  /* Gujarat */ sayla: 'Gujarat', 
  /* Telangana */ secunderabad: 'Telangana', 
  /* Karnataka */ sedam: 'Karnataka', 
  /* Delhi */ seelampur: 'Delhi', 
  /* Madhya Pradesh */ sehore: 'Madhya Pradesh', 
  /* Manipur */ senapati: 'Manipur', 
  /* Madhya Pradesh */ seoni: 'Madhya Pradesh', 
  /* Tripura */ sepahijala: 'Tripura', 
  /* Arunachal Pradesh */ seppa: 'Arunachal Pradesh', 
  /* Jharkhand */ seraikela: 'Jharkhand', seraikelakharsawan: 'Jharkhand', 
  /* Mizoram */ serchhip: 'Mizoram', 
  /* Uttar Pradesh */ shahabad: 'Uttar Pradesh', 
  /* Delhi */ shahdara: 'Delhi', 
  /* Madhya Pradesh */ shahdol: 'Madhya Pradesh', 
  /* Uttar Pradesh */ shahganj: 'Uttar Pradesh', 
  /* Punjab */ shahidbhagatsinghnagar: 'Punjab', 
  /* Uttar Pradesh */ shahjahanpur: 'Uttar Pradesh', 
  /* Punjab */ shahkot: 'Punjab', 
  /* Rajasthan */ shahpura: 'Rajasthan', 
  /* Madhya Pradesh */ shajapur: 'Madhya Pradesh', 
  /* Ladakh */ sham: 'Ladakh', 
  /* Nagaland */ shamator: 'Nagaland', 
  /* Telangana */ shamirpet: 'Telangana', 
  /* Uttar Pradesh */ shamli: 'Uttar Pradesh', 
  /* Meghalaya */ shangpung: 'Meghalaya', 
  /* Telangana */ shankarampalli: 'Telangana', 
  /* Bihar */ sheikhpura: 'Bihar', sheohar: 'Bihar', 
  /* Madhya Pradesh */ sheopur: 'Madhya Pradesh', 
  /* Bihar */ sherghati: 'Bihar', 
  /* West Bengal */ shibpur: 'West Bengal', 
  /* Karnataka */ shikaripura: 'Karnataka', 
  /* Meghalaya */ shillong: 'Meghalaya', 
  /* Himachal Pradesh */ shimla: 'Himachal Pradesh', 
  /* Karnataka */ shimoga: 'Karnataka', 
  /* Maharashtra */ shirdi: 'Maharashtra', 
  /* Karnataka */ shivamogga: 'Karnataka', 
  /* Madhya Pradesh */ shivpuri: 'Madhya Pradesh', 
  /* Arunachal Pradesh */ shiyomi: 'Arunachal Pradesh', 
  /* Tamil Nadu */ sholinganallur: 'Tamil Nadu', 
  /* Jammu & Kashmir */ shopian: 'Jammu & Kashmir', 
  /* Karnataka */ shorapur: 'Karnataka', 
  /* Kerala */ shornur: 'Kerala', 
  /* Uttar Pradesh */ shravasti: 'Uttar Pradesh', 
  /* Mizoram */ siaha: 'Mizoram', 
  /* Arunachal Pradesh */ siang: 'Arunachal Pradesh', 
  /* Assam */ sibsagar: 'Assam', 
  /* Karnataka */ siddapur: 'Karnataka', 
  /* Uttar Pradesh */ siddharthnagar: 'Uttar Pradesh', 
  /* Telangana */ siddipet: 'Telangana', 
  /* Madhya Pradesh */ sidhi: 'Madhya Pradesh', 
  /* Gujarat */ sidhpur: 'Gujarat', 
  /* Karnataka */ sidlaghatta: 'Karnataka', 
  /* Madhya Pradesh */ sihora: 'Madhya Pradesh', 
  /* Uttar Pradesh */ sikandra: 'Uttar Pradesh', sikandrabad: 'Uttar Pradesh', 
  /* Rajasthan */ sikar: 'Rajasthan', 
  /* Bihar */ sikele: 'Bihar', silao: 'Bihar', 
  /* Assam */ silchar: 'Assam', 
  /* West Bengal */ siliguri: 'West Bengal', 
  /* Jharkhand */ silli: 'Jharkhand', 
  /* Dadra & Nagar Haveli and Daman & Diu */ silvassa: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Madhya Pradesh */ silwani: 'Madhya Pradesh', 
  /* Jharkhand */ simdega: 'Jharkhand', 
  /* Chhattisgarh */ simga: 'Chhattisgarh', 
  /* Andhra Pradesh */ simhadripuram: 'Andhra Pradesh', 
  /* Bihar */ simri: 'Bihar', 
  /* Karnataka */ sindhnur: 'Karnataka', 
  /* Maharashtra */ sindhudurg: 'Maharashtra', 
  /* Manipur */ singda: 'Manipur', 
  /* Bihar */ singhwara: 'Bihar', 
  /* Rajasthan */ singra: 'Rajasthan', 
  /* Madhya Pradesh */ singrauli: 'Madhya Pradesh', 
  /* Sikkim */ singtam: 'Sikkim', 
  /* Tripura */ sipahijala: 'Tripura', 
  /* Karnataka */ sira: 'Karnataka', 
  /* Uttar Pradesh */ sirathu: 'Uttar Pradesh', 
  /* Telangana */ sircilla: 'Telangana', 
  /* Tamil Nadu */ sirkali: 'Tamil Nadu', 
  /* Himachal Pradesh */ sirmaur: 'Himachal Pradesh', 
  /* Rajasthan */ sirohi: 'Rajasthan', 
  /* Madhya Pradesh */ sironj: 'Madhya Pradesh', 
  /* Haryana */ sirsa: 'Haryana', 
  /* Karnataka */ sirsi: 'Karnataka', 
  /* Uttar Pradesh */ sirsingan: 'Uttar Pradesh', 
  /* Bihar */ sitamarhi: 'Bihar', 
  /* Uttar Pradesh */ sitapur: 'Uttar Pradesh', 
  /* Uttarakhand */ sitarganj: 'Uttarakhand', 
  /* Tamil Nadu */ sivaganga: 'Tamil Nadu', sivagangai: 'Tamil Nadu', sivakasi: 'Tamil Nadu', 
  /* Assam */ sivasagar: 'Assam', 
  /* Bihar */ siwan: 'Bihar', 
  /* Uttar Pradesh */ siyana: 'Uttar Pradesh', 
  /* Rajasthan */ siyu: 'Rajasthan', 
  /* Madhya Pradesh */ sohagpur: 'Madhya Pradesh', 
  /* Haryana */ sohna: 'Haryana', 
  /* Meghalaya */ sohra: 'Meghalaya', 
  /* Rajasthan */ sojat: 'Rajasthan', 
  /* Gujarat */ sojitra: 'Gujarat', 
  /* Himachal Pradesh */ solan: 'Himachal Pradesh', 
  /* Maharashtra */ solapur: 'Maharashtra', 
  /* Assam */ sonai: 'Assam', 
  /* Tripura */ sonamura: 'Tripura', 
  /* Assam */ sonari: 'Assam', 
  /* Uttar Pradesh */ sonbhadra: 'Uttar Pradesh', 
  /* Bihar */ sonepur: 'Bihar', 
  /* Haryana */ sonipat: 'Haryana', 
  /* Assam */ sonitpur: 'Assam', 
  /* Bihar */ sonpur: 'Bihar', 
  /* Jammu & Kashmir */ sopore: 'Jammu & Kashmir', 
  /* Karnataka */ sorab: 'Karnataka', 
  /* Uttar Pradesh */ soraon: 'Uttar Pradesh', 
  /* Sikkim */ soreng: 'Sikkim', 
  /* Odisha */ soro: 'Odisha', 
  /* Andaman and Nicobar */ southandaman: 'Andaman and Nicobar', 
  /* Delhi */ southdelhi: 'Delhi', southeastdelhi: 'Delhi', 
  /* Meghalaya */ southgarohills: 'Meghalaya', 
  /* Goa */ southgoa: 'Goa', 
  /* Assam */ southsalmara: 'Assam', southsalmaramankachar: 'Assam', 
  /* Sikkim */ southsikkim: 'Sikkim', 
  /* Tripura */ southtripura: 'Tripura', 
  /* Delhi */ southwestdelhi: 'Delhi', 
  /* Meghalaya */ southwestgarohills: 'Meghalaya', southwestkhasihills: 'Meghalaya', 
  /* Rajasthan */ sriganganagar: 'Rajasthan', 
  /* Andhra Pradesh */ srikakulam: 'Andhra Pradesh', srikalahasti: 'Andhra Pradesh', 
  /* Punjab */ srimuktsarsahib: 'Punjab', 
  /* Jammu & Kashmir */ srinagar: 'Jammu & Kashmir', 
  /* Karnataka */ srinivaspur: 'Karnataka', 
  /* Tamil Nadu */ sriperumbudur: 'Tamil Nadu', 
  /* Karnataka */ srirangapatna: 'Karnataka', 
  /* Andhra Pradesh */ srisathyasai: 'Andhra Pradesh', 
  /* Odisha */ subarnapur: 'Odisha', 
  /* West Bengal */ subarnarekha: 'West Bengal', 
  /* Chhattisgarh */ sukma: 'Chhattisgarh', 
  /* Karnataka */ sullia: 'Karnataka', 
  /* Andhra Pradesh */ sullurupeta: 'Andhra Pradesh', 
  /* Telangana */ sultanabad: 'Telangana', 
  /* Kerala */ sultanbathery: 'Kerala', 
  /* Uttar Pradesh */ sultanpur: 'Uttar Pradesh', 
  /* Tamil Nadu */ sulur: 'Tamil Nadu', 
  /* Rajasthan */ sumerpur: 'Rajasthan', 
  /* Odisha */ sundargarh: 'Odisha', sundergarh: 'Odisha', 
  /* Himachal Pradesh */ sundernagar: 'Himachal Pradesh', 
  /* Karnataka */ supa: 'Karnataka', 
  /* Bihar */ supaul: 'Bihar', 
  /* Chhattisgarh */ surajpur: 'Chhattisgarh', 
  /* Gujarat */ surat: 'Gujarat', surendranagar: 'Gujarat', 
  /* Chhattisgarh */ surguja: 'Chhattisgarh', 
  /* West Bengal */ suri: 'West Bengal', 
  /* Telangana */ suryapet: 'Telangana', 
  /* Madhya Pradesh */ susner: 'Madhya Pradesh', 
  /* Meghalaya */ sutnga: 'Meghalaya', 
  /* Andhra Pradesh */ tada: 'Andhra Pradesh', tadepalligudem: 'Andhra Pradesh', tadipatri: 'Andhra Pradesh', 
  /* Madhya Pradesh */ taghrapur: 'Madhya Pradesh', 
  /* Gujarat */ talaja: 'Gujarat', 
  /* Odisha */ talcher: 'Odisha', 
  /* West Bengal */ taldangra: 'West Bengal', 
  /* Arunachal Pradesh */ taliha: 'Arunachal Pradesh', 
  /* Kerala */ taliparamba: 'Kerala', 
  /* Gujarat */ talisa: 'Gujarat', 
  /* Andhra Pradesh */ tallapaka: 'Andhra Pradesh', 
  /* Tamil Nadu */ tambaram: 'Tamil Nadu', 
  /* Manipur */ tamenglong: 'Manipur', 
  /* West Bengal */ tamluk: 'West Bengal', 
  /* Assam */ tamulpur: 'Assam', 
  /* Uttar Pradesh */ tanda: 'Uttar Pradesh', 
  /* Telangana */ tandur: 'Telangana', 
  /* Tamil Nadu */ tanjore: 'Tamil Nadu', 
  /* Andhra Pradesh */ tanuku: 'Andhra Pradesh', 
  /* Gujarat */ tapi: 'Gujarat', 
  /* Madhya Pradesh */ tarana: 'Madhya Pradesh', 
  /* Andhra Pradesh */ tarlupadu: 'Andhra Pradesh', 
  /* Punjab */ tarntaran: 'Punjab', tarntaransahib: 'Punjab', 
  /* Jharkhand */ tati: 'Jharkhand', 
  /* Arunachal Pradesh */ tato: 'Arunachal Pradesh', tawang: 'Arunachal Pradesh', 
  /* Bihar */ teghra: 'Bihar', 
  /* Uttarakhand */ tehrigarhwal: 'Uttarakhand', 
  /* Andhra Pradesh */ tekkali: 'Andhra Pradesh', 
  /* Odisha */ telko: 'Odisha', 
  /* Andhra Pradesh */ tenali: 'Andhra Pradesh', 
  /* Assam */ tengakhat: 'Assam', 
  /* Manipur */ tengnoupal: 'Manipur', 
  /* Tamil Nadu */ tenkasi: 'Tamil Nadu', 
  /* Assam */ tezpur: 'Assam', 
  /* Arunachal Pradesh */ tezu: 'Arunachal Pradesh', 
  /* Uttar Pradesh */ thakurdwara: 'Uttar Pradesh', 
  /* Bihar */ thakurgarh: 'Bihar', 
  /* Kerala */ thalassery: 'Kerala', 
  /* Maharashtra */ thane: 'Maharashtra', 
  /* Tamil Nadu */ thanjavur: 'Tamil Nadu', 
  /* Gujarat */ thara: 'Gujarat', tharad: 'Gujarat', 
  /* Tamil Nadu */ tharangambadi: 'Tamil Nadu', 
  /* Gujarat */ thasra: 'Gujarat', 
  /* Tamil Nadu */ theni: 'Tamil Nadu', 
  /* Himachal Pradesh */ theog: 'Himachal Pradesh', 
  /* Tamil Nadu */ thiruchendur: 'Tamil Nadu', thirumangalam: 'Tamil Nadu', thiruvadanai: 'Tamil Nadu', 
  /* Kerala */ thiruvalla: 'Kerala', 
  /* Tamil Nadu */ thiruvallur: 'Tamil Nadu', 
  /* Kerala */ thiruvananthapuram: 'Kerala', 
  /* Tamil Nadu */ thiruvarur: 'Tamil Nadu', thiruverumbur: 'Tamil Nadu', thiruvidaimarudur: 'Tamil Nadu', 
  /* Kerala */ thodupuzha: 'Kerala', 
  /* Tamil Nadu */ thoothukudi: 'Tamil Nadu', 
  /* Manipur */ thoubal: 'Manipur', 
  /* Tamil Nadu */ thovalai: 'Tamil Nadu', 
  /* Kerala */ thrissur: 'Kerala', thrithala: 'Kerala', 
  /* Madhya Pradesh */ tikamgarh: 'Madhya Pradesh', 
  /* Bihar */ tilka: 'Bihar', 
  /* Tamil Nadu */ tindivanam: 'Tamil Nadu', 
  /* Assam */ tinsukia: 'Assam', 
  /* Karnataka */ tiptur: 'Karnataka', 
  /* Arunachal Pradesh */ tirap: 'Arunachal Pradesh', 
  /* Karnataka */ tirthahalli: 'Karnataka', 
  /* Tamil Nadu */ tiruchengode: 'Tamil Nadu', tiruchirappalli: 'Tamil Nadu', tirukoilur: 'Tamil Nadu', tirumayam: 'Tamil Nadu', tirunelveli: 'Tamil Nadu', 
  /* Andhra Pradesh */ tirupati: 'Andhra Pradesh', 
  /* Tamil Nadu */ tirupattur: 'Tamil Nadu', tirupparankundram: 'Tamil Nadu', tiruppur: 'Tamil Nadu', 
  /* Kerala */ tirur: 'Kerala', 
  /* Tamil Nadu */ tiruttani: 'Tamil Nadu', tiruvallur: 'Tamil Nadu', tiruvannaamalai: 'Tamil Nadu', tiruvannamalai: 'Tamil Nadu', tiruvarur: 'Tamil Nadu', tiruvottiyur: 'Tamil Nadu', 
  /* Assam */ titabor: 'Assam', 
  /* Rajasthan */ tonk: 'Rajasthan', 
  /* Jammu & Kashmir */ tral: 'Jammu & Kashmir', 
  /* Kerala */ trichur: 'Kerala', 
  /* Tamil Nadu */ trichy: 'Tamil Nadu', 
  /* Kerala */ trivandrum: 'Kerala', 
  /* Nagaland */ tuensang: 'Nagaland', 
  /* West Bengal */ tufanganj: 'West Bengal', 
  /* Karnataka */ tumakuru: 'Karnataka', 
  /* Maharashtra */ tumsar: 'Maharashtra', 
  /* Meghalaya */ tura: 'Meghalaya', 
  /* Karnataka */ turuvekere: 'Karnataka', 
  /* Tamil Nadu */ tuticorin: 'Tamil Nadu', 
  /* Madhya Pradesh */ udaipura: 'Madhya Pradesh', 
  /* Assam */ udalguri: 'Assam', 
  /* Andhra Pradesh */ udaygiri: 'Andhra Pradesh', 
  /* Tamil Nadu */ udhagamandalam: 'Tamil Nadu', 
  /* Jammu & Kashmir */ udhampur: 'Jammu & Kashmir', 
  /* Uttarakhand */ udhamsinghnagar: 'Uttarakhand', 
  /* Assam */ udqhbari: 'Assam', 
  /* Karnataka */ udupi: 'Karnataka', 
  /* Uttar Pradesh */ ujhani: 'Uttar Pradesh', 
  /* Madhya Pradesh */ ujjain: 'Madhya Pradesh', 
  /* Manipur */ ukhrul: 'Manipur', 
  /* Haryana */ uklana: 'Haryana', 
  /* Maharashtra */ ulhasnagar: 'Maharashtra', 
  /* Andhra Pradesh */ ulvapadu: 'Andhra Pradesh', 
  /* Madhya Pradesh */ umaria: 'Madhya Pradesh', 
  /* Himachal Pradesh */ una: 'Himachal Pradesh', 
  /* Gujarat */ unai: 'Gujarat', 
  /* Tripura */ unakoti: 'Tripura', 
  /* Gujarat */ unjha: 'Gujarat', 
  /* Uttar Pradesh */ unnao: 'Uttar Pradesh', 
  /* Gujarat */ upleta: 'Gujarat', 
  /* Arunachal Pradesh */ upperdibangvalley: 'Arunachal Pradesh', uppersiang: 'Arunachal Pradesh', uppersubansiri: 'Arunachal Pradesh', 
  /* Tamil Nadu */ usilampatti: 'Tamil Nadu', uthangarai: 'Tamil Nadu', 
  /* Telangana */ utkoor: 'Telangana', utnoor: 'Telangana', 
  /* Karnataka */ uttarakannada: 'Karnataka', 
  /* West Bengal */ uttardinajpur: 'West Bengal', 
  /* Uttarakhand */ uttarkashi: 'Uttarakhand', 
  /* West Bengal */ uttarpara: 'West Bengal', 
  /* Gujarat */ vadodara: 'Gujarat', vagra: 'Gujarat', 
  /* Kerala */ vaikom: 'Kerala', 
  /* Mizoram */ vairengte: 'Mizoram', 
  /* Bihar */ vaishali: 'Bihar', 
  /* Gujarat */ vallabhi: 'Gujarat', vallabhipur: 'Gujarat', 
  /* Rajasthan */ vallabhnagar: 'Rajasthan', 
  /* Gujarat */ vallabhvidyanagar: 'Gujarat', valsad: 'Gujarat', 
  /* Tamil Nadu */ vandavasi: 'Tamil Nadu', 
  /* Kerala */ vandiperiyar: 'Kerala', 
  /* Tamil Nadu */ vaniyambadi: 'Tamil Nadu', vanur: 'Tamil Nadu', 
  /* Gujarat */ vapi: 'Gujarat', 
  /* Uttar Pradesh */ varanasi: 'Uttar Pradesh', 
  /* Kerala */ varkala: 'Kerala', 
  /* Maharashtra */ vasai: 'Maharashtra', 
  /* Delhi */ vasantvihar: 'Delhi', 
  /* Goa */ vasco: 'Goa', 
  /* Tamil Nadu */ vasudevanallur: 'Tamil Nadu', 
  /* Kerala */ vatakara: 'Kerala', 
  /* Gujarat */ vav: 'Gujarat', vavtharad: 'Gujarat', 
  /* Andhra Pradesh */ vayalpad: 'Andhra Pradesh', veeraghattam: 'Andhra Pradesh', veerankesari: 'Andhra Pradesh', veeravasaram: 'Andhra Pradesh', 
  /* Telangana */ velairutram: 'Telangana', 
  /* Tamil Nadu */ velankanni: 'Tamil Nadu', vellore: 'Tamil Nadu', 
  /* Telangana */ vemulawada: 'Telangana', 
  /* Gujarat */ veraval: 'Gujarat', 
  /* Andhra Pradesh */ vetapalem: 'Andhra Pradesh', 
  /* Madhya Pradesh */ vidisha: 'Madhya Pradesh', 
  /* Karnataka */ vijayanagar: 'Karnataka', vijayanagara: 'Karnataka', vijayapura: 'Karnataka', 
  /* Andhra Pradesh */ vijayawada: 'Andhra Pradesh', 
  /* Telangana */ vikarabad: 'Telangana', 
  /* Puducherry */ villianur: 'Puducherry', 
  /* Tamil Nadu */ villupuram: 'Tamil Nadu', viluppuram: 'Tamil Nadu', 
  /* Gujarat */ vinchhior: 'Gujarat', 
  /* Uttar Pradesh */ vindhyachal: 'Uttar Pradesh', 
  /* Gujarat */ viramgam: 'Gujarat', 
  /* Maharashtra */ virar: 'Maharashtra', 
  /* Tamil Nadu */ virudhachalam: 'Tamil Nadu', virudhunagar: 'Tamil Nadu', 
  /* Andhra Pradesh */ visakhapatnam: 'Andhra Pradesh', 
  /* Gujarat */ visavadar: 'Gujarat', 
  /* Andhra Pradesh */ vissannapeta: 'Andhra Pradesh', vizag: 'Andhra Pradesh', vizianagaram: 'Andhra Pradesh', 
  /* Uttar Pradesh */ vrindavan: 'Uttar Pradesh', 
  /* Gujarat */ vyara: 'Gujarat', 
  /* Kerala */ vythiri: 'Kerala', wadakkanchery: 'Kerala', 
  /* Gujarat */ wadhwan: 'Gujarat', 
  /* Karnataka */ wadi: 'Karnataka', 
  /* Gujarat */ waghodia: 'Gujarat', 
  /* Madhya Pradesh */ waidhan: 'Madhya Pradesh', 
  /* Tamil Nadu */ walajabad: 'Tamil Nadu', 
  /* Telangana */ wanaparthy: 'Telangana', 
  /* Gujarat */ wankaner: 'Gujarat', 
  /* Telangana */ warangal: 'Telangana', warangalrural: 'Telangana', warangalurban: 'Telangana', 
  /* Maharashtra */ wardha: 'Maharashtra', 
  /* Telangana */ wardhannapet: 'Telangana', 
  /* Maharashtra */ washim: 'Maharashtra', 
  /* Kerala */ wayanad: 'Kerala', 
  /* Bihar */ westchamparan: 'Bihar', 
  /* Delhi */ westdelhi: 'Delhi', 
  /* Meghalaya */ westgarohills: 'Meghalaya', 
  /* Andhra Pradesh */ westgodavari: 'Andhra Pradesh', 
  /* Meghalaya */ westjaintiahills: 'Meghalaya', 
  /* Arunachal Pradesh */ westkameng: 'Arunachal Pradesh', 
  /* Assam */ westkarbianglong: 'Assam', 
  /* Meghalaya */ westkhasihills: 'Meghalaya', 
  /* Arunachal Pradesh */ westsiang: 'Arunachal Pradesh', 
  /* Sikkim */ westsikkim: 'Sikkim', 
  /* Jharkhand */ westsinghbhum: 'Jharkhand', 
  /* Tripura */ westtripura: 'Tripura', 
  /* Meghalaya */ williamnagar: 'Meghalaya', 
  /* Telangana */ wodchah: 'Telangana', 
  /* Nagaland */ wokha: 'Nagaland', 
  /* Arunachal Pradesh */ yachuli: 'Arunachal Pradesh', 
  /* Telangana */ yadadribhuvanagiri: 'Telangana', 
  /* Karnataka */ yadgir: 'Karnataka', 
  /* Andhra Pradesh */ yadiki: 'Andhra Pradesh', 
  /* Haryana */ yamunanagar: 'Haryana', 
  /* Puducherry */ yanam: 'Puducherry', 
  /* Maharashtra */ yavatmal: 'Maharashtra', 
  /* Andhra Pradesh */ yeleswaram: 'Andhra Pradesh', yellareddy: 'Andhra Pradesh', yemmiganur: 'Andhra Pradesh', 
  /* Arunachal Pradesh */ yingkiong: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ ysrkadapa: 'Andhra Pradesh', 
  /* Sikkim */ yuksom: 'Sikkim', yumthang: 'Sikkim', 
  /* Arunachal Pradesh */ yupia: 'Arunachal Pradesh', 
  /* Ladakh */ zanskar: 'Ladakh', 
  /* Punjab */ zirakpur: 'Punjab', 
  /* Arunachal Pradesh */ ziro: 'Arunachal Pradesh', 
  /* Nagaland */ zunheboto: 'Nagaland', 
};
const SN_CITY_FOLD = {
  /* Gujarat */ abdas: 'Gujarat', 
  /* Assam */ abhayapuri: 'Assam', 
  /* Punjab */ abohar: 'Punjab', 
  /* Telangana */ achampet: 'Telangana', 
  /* Haryana */ adampur: 'Haryana', 
  /* Telangana */ adilabad: 'Telangana', 
  /* Kerala */ adimali: 'Kerala', 
  /* Andhra Pradesh */ adoni: 'Andhra Pradesh', 
  /* Kerala */ ador: 'Kerala', 
  /* Karnataka */ afzalpur: 'Karnataka', 
  /* Madhya Pradesh */ agar: 'Madhya Pradesh', agarmalw: 'Madhya Pradesh', 
  /* Tripura */ agartal: 'Tripura', 
  /* Uttar Pradesh */ agr: 'Uttar Pradesh', 
  /* Gujarat */ ahmedabad: 'Gujarat', 
  /* Maharashtra */ ahmednagar: 'Maharashtra', 
  /* Gujarat */ ahw: 'Gujarat', 
  /* West Bengal */ aistal: 'West Bengal', 
  /* Mizoram */ aizawl: 'Mizoram', 
  /* West Bengal */ ajaygarh: 'West Bengal', 
  /* Rajasthan */ ajmer: 'Rajasthan', 
  /* Punjab */ ajnal: 'Punjab', 
  /* Uttar Pradesh */ akbarpur: 'Uttar Pradesh', 
  /* Maharashtra */ akol: 'Maharashtra', 
  /* Andhra Pradesh */ alagad: 'Andhra Pradesh', 
  /* Uttar Pradesh */ alahabad: 'Uttar Pradesh', 
  /* Telangana */ alair: 'Telangana', 
  /* Karnataka */ aland: 'Karnataka', 
  /* Kerala */ alapuzh: 'Kerala', 
  /* Bihar */ alauli: 'Bihar', 
  /* Maharashtra */ alibag: 'Maharashtra', 
  /* Uttar Pradesh */ aligarh: 'Uttar Pradesh', 
  /* West Bengal */ alipore: 'West Bengal', alipurduar: 'West Bengal', 
  /* Madhya Pradesh */ alirajpur: 'Madhya Pradesh', 
  /* Uttarakhand */ almor: 'Uttarakhand', 
  /* Arunachal Pradesh */ alo: 'Arunachal Pradesh', along: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ alurisitharamraju: 'Andhra Pradesh', 
  /* Kerala */ aluv: 'Kerala', 
  /* Rajasthan */ alwar: 'Rajasthan', 
  /* Andhra Pradesh */ amalapuram: 'Andhra Pradesh', 
  /* Bihar */ amarpur: 'Bihar', 
  /* Himachal Pradesh */ amb: 'Himachal Pradesh', 
  /* Haryana */ ambal: 'Haryana', 
  /* Kerala */ ambalapuzh: 'Kerala', 
  /* Tripura */ ambas: 'Tripura', 
  /* Tamil Nadu */ ambasamudram: 'Tamil Nadu', 
  /* Uttar Pradesh */ ambedkarnagar: 'Uttar Pradesh', 
  /* Chhattisgarh */ ambikapur: 'Chhattisgarh', 
  /* Tamil Nadu */ ambur: 'Tamil Nadu', 
  /* Uttar Pradesh */ amethi: 'Uttar Pradesh', 
  /* Assam */ amguri: 'Assam', amingaon: 'Assam', 
  /* Madhya Pradesh */ aml: 'Madhya Pradesh', 
  /* Meghalaya */ amlarem: 'Meghalaya', 
  /* Bihar */ amnour: 'Bihar', 
  /* Meghalaya */ ampati: 'Meghalaya', 
  /* Tripura */ ampin: 'Tripura', 
  /* Telangana */ amrabad: 'Telangana', 
  /* Maharashtra */ amravati: 'Maharashtra', 
  /* Gujarat */ amreli: 'Gujarat', 
  /* Punjab */ amritsar: 'Punjab', 
  /* Uttar Pradesh */ amroh: 'Uttar Pradesh', 
  /* Andhra Pradesh */ anakapali: 'Andhra Pradesh', anamay: 'Andhra Pradesh', 
  /* Gujarat */ anand: 'Gujarat', 
  /* Odisha */ anandapur: 'Odisha', 
  /* Andhra Pradesh */ anantapur: 'Andhra Pradesh', ananthapuramu: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ anantnag: 'Jammu & Kashmir', 
  /* Karnataka */ anekal: 'Karnataka', 
  /* Kerala */ angamaly: 'Kerala', 
  /* Odisha */ angul: 'Odisha', 
  /* Arunachal Pradesh */ anini: 'Arunachal Pradesh', 
  /* Gujarat */ anjar: 'Gujarat', 
  /* Arunachal Pradesh */ anjaw: 'Arunachal Pradesh', 
  /* Gujarat */ ankleshwar: 'Gujarat', anklevi: 'Gujarat', 
  /* Karnataka */ ankol: 'Karnataka', 
  /* Madhya Pradesh */ anupur: 'Madhya Pradesh', 
  /* Uttar Pradesh */ aonl: 'Uttar Pradesh', 
  /* Bihar */ arah: 'Bihar', 
  /* Tamil Nadu */ arakonam: 'Tamil Nadu', arani: 'Tamil Nadu', 
  /* Bihar */ arari: 'Bihar', 
  /* Tamil Nadu */ aravakurichi: 'Tamil Nadu', 
  /* Gujarat */ aravali: 'Gujarat', 
  /* Tamil Nadu */ ariyalur: 'Tamil Nadu', 
  /* Karnataka */ arkalgud: 'Karnataka', 
  /* Himachal Pradesh */ arki: 'Himachal Pradesh', 
  /* Telangana */ armor: 'Telangana', 
  /* Karnataka */ arsikere: 'Karnataka', 
  /* Tamil Nadu */ arupukotai: 'Tamil Nadu', 
  /* Bihar */ arwal: 'Bihar', 
  /* West Bengal */ asansol: 'West Bengal', 
  /* Madhya Pradesh */ ashoknagar: 'Madhya Pradesh', 
  /* Telangana */ asifabad: 'Telangana', 
  /* Uttar Pradesh */ atar: 'Uttar Pradesh', 
  /* Madhya Pradesh */ ater: 'Madhya Pradesh', 
  /* Karnataka */ athani: 'Karnataka', 
  /* Andhra Pradesh */ atili: 'Andhra Pradesh', 
  /* Kerala */ atingal: 'Kerala', 
  /* Andhra Pradesh */ atmakur: 'Andhra Pradesh', 
  /* Uttar Pradesh */ atrauliy: 'Uttar Pradesh', 
  /* Odisha */ atri: 'Odisha', 
  /* Tamil Nadu */ atur: 'Tamil Nadu', 
  /* Bihar */ aurai: 'Bihar', 
  /* Uttar Pradesh */ auraiy: 'Uttar Pradesh', 
  /* Maharashtra */ aurangabad: 'Maharashtra', 
  /* Rajasthan */ auw: 'Rajasthan', 
  /* Tamil Nadu */ avadi: 'Tamil Nadu', 
  /* Andhra Pradesh */ avanigad: 'Andhra Pradesh', 
  /* Tamil Nadu */ avinashi: 'Tamil Nadu', 
  /* Uttar Pradesh */ ayodhy: 'Uttar Pradesh', azamgarh: 'Uttar Pradesh', 
  /* Bihar */ bachwar: 'Bihar', 
  /* Assam */ badarpur: 'Assam', 
  /* Himachal Pradesh */ badi: 'Himachal Pradesh', 
  /* Rajasthan */ badiyad: 'Rajasthan', 
  /* Madhya Pradesh */ badnagar: 'Madhya Pradesh', 
  /* West Bengal */ baduri: 'West Bengal', 
  /* Andhra Pradesh */ badvel: 'Andhra Pradesh', 
  /* Bihar */ bagah: 'Bihar', 
  /* Karnataka */ bagalkot: 'Karnataka', bagalkote: 'Karnataka', 
  /* Assam */ bagan: 'Assam', 
  /* Rajasthan */ bagang: 'Rajasthan', 
  /* Chhattisgarh */ bagbahr: 'Chhattisgarh', 
  /* Uttarakhand */ bageshwar: 'Uttarakhand', 
  /* Uttar Pradesh */ baghpat: 'Uttar Pradesh', 
  /* Jharkhand */ bagodar: 'Jharkhand', 
  /* Uttar Pradesh */ bagpat: 'Uttar Pradesh', 
  /* Bihar */ bahadurganj: 'Bihar', 
  /* Uttar Pradesh */ bahadurpur: 'Uttar Pradesh', 
  /* West Bengal */ baharampur: 'West Bengal', 
  /* Jharkhand */ baharpor: 'Jharkhand', 
  /* Uttar Pradesh */ baheri: 'Uttar Pradesh', bahraich: 'Uttar Pradesh', 
  /* Chhattisgarh */ baihar: 'Chhattisgarh', 
  /* Himachal Pradesh */ baijnath: 'Himachal Pradesh', 
  /* Chhattisgarh */ baikunthpur: 'Chhattisgarh', 
  /* Karnataka */ bailhongal: 'Karnataka', 
  /* Mizoram */ bairabi: 'Mizoram', 
  /* Assam */ bajali: 'Assam', 
  /* Bihar */ bakhtiarpur: 'Bihar', 
  /* Assam */ baks: 'Assam', 
  /* Haryana */ balabgarh: 'Haryana', 
  /* Punjab */ balachaur: 'Punjab', 
  /* Madhya Pradesh */ balaghat: 'Madhya Pradesh', 
  /* Odisha */ balangir: 'Odisha', balaramgarh: 'Odisha', 
  /* West Bengal */ balarampur: 'West Bengal', 
  /* Karnataka */ balari: 'Karnataka', 
  /* Odisha */ balasore: 'Odisha', baliant: 'Odisha', 
  /* Jharkhand */ baliapur: 'Jharkhand', 
  /* Chhattisgarh */ balod: 'Chhattisgarh', balodbazar: 'Chhattisgarh', 
  /* Rajasthan */ balotr: 'Rajasthan', 
  /* Chhattisgarh */ balrampuramanujganj: 'Chhattisgarh', balud: 'Chhattisgarh', 
  /* West Bengal */ balurghat: 'West Bengal', baly: 'West Bengal', 
  /* Madhya Pradesh */ bamori: 'Madhya Pradesh', 
  /* Odisha */ banarpal: 'Odisha', 
  /* Gujarat */ banaskanth: 'Gujarat', 
  /* Uttar Pradesh */ band: 'Uttar Pradesh', 
  /* Jammu & Kashmir */ bandipor: 'Jammu & Kashmir', bandipore: 'Jammu & Kashmir', 
  /* Karnataka */ bangalore: 'Karnataka', bangalorerural: 'Karnataka', bangaloreurban: 'Karnataka', bangarpet: 'Karnataka', banhati: 'Karnataka', 
  /* Bihar */ bank: 'Bihar', 
  /* West Bengal */ bankur: 'West Bengal', 
  /* Uttar Pradesh */ bansgaon: 'Uttar Pradesh', 
  /* Rajasthan */ banswar: 'Rajasthan', 
  /* Andhra Pradesh */ bapatl: 'Andhra Pradesh', 
  /* Rajasthan */ baphni: 'Rajasthan', bapni: 'Rajasthan', 
  /* West Bengal */ barabani: 'West Bengal', 
  /* Uttar Pradesh */ barabanki: 'Uttar Pradesh', 
  /* Bihar */ barachaki: 'Bihar', 
  /* West Bengal */ barackpore: 'West Bengal', 
  /* Maharashtra */ baramati: 'Maharashtra', 
  /* Odisha */ baramb: 'Odisha', 
  /* Chhattisgarh */ baramkel: 'Chhattisgarh', 
  /* Jammu & Kashmir */ baramul: 'Jammu & Kashmir', 
  /* Rajasthan */ baran: 'Rajasthan', 
  /* West Bengal */ barasat: 'West Bengal', 
  /* Bihar */ barbigh: 'Bihar', 
  /* Odisha */ barbil: 'Odisha', 
  /* Assam */ barchal: 'Assam', 
  /* West Bengal */ bardhaman: 'West Bengal', 
  /* Gujarat */ bardoli: 'Gujarat', 
  /* Uttar Pradesh */ bareily: 'Uttar Pradesh', 
  /* Odisha */ bargarh: 'Odisha', 
  /* Bihar */ barh: 'Bihar', 
  /* Uttar Pradesh */ barhalganj: 'Uttar Pradesh', 
  /* Bihar */ barhari: 'Bihar', 
  /* Jharkhand */ barhi: 'Jharkhand', 
  /* Bihar */ bariarpur: 'Bihar', 
  /* Odisha */ baripad: 'Odisha', 
  /* Bihar */ bariyarpur: 'Bihar', 
  /* Jharkhand */ barkagaon: 'Jharkhand', 
  /* Rajasthan */ barmer: 'Rajasthan', 
  /* Gujarat */ barod: 'Gujarat', 
  /* Assam */ barpet: 'Assam', 
  /* Rajasthan */ barv: 'Rajasthan', 
  /* Madhya Pradesh */ barwani: 'Madhya Pradesh', 
  /* Arunachal Pradesh */ basar: 'Arunachal Pradesh', 
  /* Karnataka */ basavanbagevadi: 'Karnataka', 
  /* Rajasthan */ basi: 'Rajasthan', 
  /* West Bengal */ basirhat: 'West Bengal', 
  /* Chhattisgarh */ basn: 'Chhattisgarh', bastar: 'Chhattisgarh', 
  /* Uttar Pradesh */ basti: 'Uttar Pradesh', 
  /* Odisha */ basudevpur: 'Odisha', 
  /* Punjab */ bathind: 'Punjab', 
  /* Tamil Nadu */ batlagundu: 'Tamil Nadu', 
  /* Gujarat */ bavl: 'Gujarat', 
  /* Haryana */ bawal: 'Haryana', 
  /* Rajasthan */ beawar: 'Rajasthan', 
  /* Maharashtra */ bed: 'Maharashtra', 
  /* Madhya Pradesh */ begam: 'Madhya Pradesh', 
  /* Bihar */ begusarai: 'Bihar', 
  /* Chhattisgarh */ bel: 'Chhattisgarh', 
  /* Karnataka */ belagavi: 'Karnataka', 
  /* Telangana */ belampale: 'Telangana', 
  /* Karnataka */ belary: 'Karnataka', 
  /* Bihar */ beldaur: 'Bihar', 
  /* Karnataka */ belgaum: 'Karnataka', 
  /* Tripura */ beloni: 'Tripura', 
  /* Odisha */ belpahar: 'Odisha', 
  /* Karnataka */ belthangady: 'Karnataka', belur: 'Karnataka', 
  /* Chhattisgarh */ bemetar: 'Chhattisgarh', 
  /* Jammu & Kashmir */ bemin: 'Jammu & Kashmir', 
  /* Karnataka */ bengaluru: 'Karnataka', 
  /* Bihar */ benipati: 'Bihar', 
  /* Jharkhand */ bermo: 'Jharkhand', bero: 'Jharkhand', 
  /* Andhra Pradesh */ bethamcherl: 'Andhra Pradesh', 
  /* Bihar */ betiah: 'Bihar', 
  /* Madhya Pradesh */ betul: 'Madhya Pradesh', 
  /* Uttar Pradesh */ bewar: 'Uttar Pradesh', 
  /* Bihar */ bhabu: 'Bihar', 
  /* Uttar Pradesh */ bhadohi: 'Uttar Pradesh', 
  /* Telangana */ bhadradrikothagudem: 'Telangana', 
  /* Rajasthan */ bhadrajun: 'Rajasthan', 
  /* Odisha */ bhadrak: 'Odisha', 
  /* West Bengal */ bhadreshwar: 'West Bengal', 
  /* Jharkhand */ bhag: 'Jharkhand', 
  /* Bihar */ bhagalpur: 'Bihar', 
  /* Telangana */ bhains: 'Telangana', 
  /* Rajasthan */ bhamashah: 'Rajasthan', 
  /* Odisha */ bhanapur: 'Odisha', 
  /* Maharashtra */ bhandar: 'Maharashtra', 
  /* Rajasthan */ bhanipur: 'Rajasthan', 
  /* Odisha */ bhanjanagar: 'Odisha', 
  /* Chhattisgarh */ bhanpuri: 'Chhattisgarh', 
  /* Odisha */ bhanupatn: 'Odisha', bhapur: 'Odisha', 
  /* Rajasthan */ bharatpur: 'Rajasthan', 
  /* Gujarat */ bharuch: 'Gujarat', 
  /* Chhattisgarh */ bhatapar: 'Chhattisgarh', 
  /* Karnataka */ bhatkal: 'Karnataka', 
  /* Tamil Nadu */ bhavani: 'Tamil Nadu', 
  /* Gujarat */ bhavnagar: 'Gujarat', 
  /* Odisha */ bhawanipatn: 'Odisha', 
  /* Madhya Pradesh */ bhedaghat: 'Madhya Pradesh', 
  /* Rajasthan */ bhedupad: 'Rajasthan', 
  /* Telangana */ bhemini: 'Telangana', 
  /* Andhra Pradesh */ bhemunipatnam: 'Andhra Pradesh', 
  /* Rajasthan */ bhenswad: 'Rajasthan', 
  /* Gujarat */ bhesan: 'Gujarat', 
  /* Chhattisgarh */ bhetri: 'Chhattisgarh', bhilai: 'Chhattisgarh', 
  /* Gujarat */ bhildi: 'Gujarat', 
  /* Rajasthan */ bhilwar: 'Rajasthan', bhim: 'Rajasthan', 
  /* Andhra Pradesh */ bhimavaram: 'Andhra Pradesh', 
  /* Uttarakhand */ bhimtal: 'Uttarakhand', 
  /* Madhya Pradesh */ bhind: 'Madhya Pradesh', 
  /* Rajasthan */ bhinmal: 'Rajasthan', 
  /* Maharashtra */ bhiwandi: 'Maharashtra', 
  /* Haryana */ bhiwani: 'Haryana', 
  /* Odisha */ bhograi: 'Odisha', 
  /* Bihar */ bhojpur: 'Bihar', 
  /* Rajasthan */ bhomsen: 'Rajasthan', 
  /* Telangana */ bhongir: 'Telangana', 
  /* Madhya Pradesh */ bhopal: 'Madhya Pradesh', 
  /* Rajasthan */ bhopalgarh: 'Rajasthan', 
  /* Chhattisgarh */ bhopalpatnam: 'Chhattisgarh', 
  /* Odisha */ bhuban: 'Odisha', bhubaneswar: 'Odisha', 
  /* Gujarat */ bhuj: 'Gujarat', 
  /* Himachal Pradesh */ bhuntar: 'Himachal Pradesh', 
  /* Telangana */ bhupalpale: 'Telangana', bhupalpaly: 'Telangana', 
  /* Madhya Pradesh */ biaor: 'Madhya Pradesh', 
  /* Bihar */ bibhutipur: 'Bihar', 
  /* Goa */ bicholim: 'Goa', 
  /* Arunachal Pradesh */ bichom: 'Arunachal Pradesh', 
  /* Karnataka */ bidar: 'Karnataka', 
  /* Bihar */ biharsharif: 'Bihar', bihpur: 'Bihar', biht: 'Bihar', 
  /* Assam */ bihukhat: 'Assam', bihupuri: 'Assam', 
  /* Karnataka */ bijapur: 'Karnataka', 
  /* Assam */ bijni: 'Assam', 
  /* Uttar Pradesh */ bijnor: 'Uttar Pradesh', 
  /* Rajasthan */ bikaner: 'Rajasthan', 
  /* Bihar */ bikram: 'Bihar', 
  /* Karnataka */ bilagi: 'Karnataka', 
  /* Rajasthan */ bilar: 'Rajasthan', 
  /* Chhattisgarh */ bilhaugadh: 'Chhattisgarh', 
  /* Uttar Pradesh */ bilhaur: 'Uttar Pradesh', 
  /* Gujarat */ bilimor: 'Gujarat', 
  /* Odisha */ biramitrapur: 'Odisha', 
  /* West Bengal */ birbhum: 'West Bengal', 
  /* Bihar */ birpur: 'Bihar', 
  /* Madhya Pradesh */ birs: 'Madhya Pradesh', 
  /* Karnataka */ birur: 'Karnataka', 
  /* Uttar Pradesh */ bisauli: 'Uttar Pradesh', 
  /* Manipur */ bishnupur: 'Manipur', 
  /* Tripura */ bishramganj: 'Tripura', 
  /* Jharkhand */ bishrampur: 'Jharkhand', 
  /* Assam */ biswanath: 'Assam', biswanathchariali: 'Assam', 
  /* Telangana */ bodhan: 'Telangana', 
  /* Bihar */ bodhgay: 'Bihar', 
  /* Tamil Nadu */ bodi: 'Tamil Nadu', 
  /* Maharashtra */ boisar: 'Maharashtra', 
  /* Jharkhand */ bokaro: 'Jharkhand', 
  /* Assam */ boko: 'Assam', 
  /* Telangana */ bolaram: 'Telangana', 
  /* Arunachal Pradesh */ boleng: 'Arunachal Pradesh', 
  /* Maharashtra */ bombay: 'Maharashtra', 
  /* Arunachal Pradesh */ bomdil: 'Arunachal Pradesh', 
  /* Odisha */ bonaigarh: 'Odisha', 
  /* Assam */ bongaigaon: 'Assam', 
  /* Jharkhand */ bori: 'Jharkhand', 
  /* Gujarat */ borsad: 'Gujarat', botad: 'Gujarat', 
  /* Odisha */ boudh: 'Odisha', brahmagiri: 'Odisha', brahmapur: 'Odisha', 
  /* Karnataka */ brahmavar: 'Karnataka', 
  /* Uttar Pradesh */ budaun: 'Uttar Pradesh', 
  /* Jammu & Kashmir */ budgam: 'Jammu & Kashmir', 
  /* Rajasthan */ buhan: 'Rajasthan', 
  /* Uttar Pradesh */ bulandshahr: 'Uttar Pradesh', 
  /* Maharashtra */ buldhan: 'Maharashtra', 
  /* Rajasthan */ bundi: 'Rajasthan', 
  /* Jharkhand */ bundu: 'Jharkhand', 
  /* Madhya Pradesh */ burhanpur: 'Madhya Pradesh', 
  /* Bihar */ buxar: 'Bihar', 
  /* Karnataka */ byadgi: 'Karnataka', 
  /* Assam */ cachar: 'Assam', 
  /* West Bengal */ calcut: 'West Bengal', 
  /* Kerala */ calicut: 'Kerala', 
  /* Goa */ canacon: 'Goa', 
  /* Andaman and Nicobar */ carnicobar: 'Andaman and Nicobar', 
  /* Delhi */ centraldelhi: 'Delhi', 
  /* Jharkhand */ chaibas: 'Jharkhand', chainpur: 'Jharkhand', 
  /* Bihar */ chakai: 'Bihar', 
  /* West Bengal */ chakdah: 'West Bengal', 
  /* Kerala */ chalakudy: 'Kerala', 
  /* Gujarat */ chalal: 'Gujarat', 
  /* Andhra Pradesh */ chalapale: 'Andhra Pradesh', 
  /* Karnataka */ chamarajanagar: 'Karnataka', 
  /* Himachal Pradesh */ chamb: 'Himachal Pradesh', 
  /* Uttarakhand */ chamoli: 'Uttarakhand', champawat: 'Uttarakhand', 
  /* Mizoram */ champhai: 'Mizoram', 
  /* Odisha */ champu: 'Odisha', 
  /* Karnataka */ chamrajnagar: 'Karnataka', chanapatn: 'Karnataka', 
  /* Uttar Pradesh */ chandauli: 'Uttar Pradesh', 
  /* Manipur */ chandel: 'Manipur', 
  /* Chandigarh */ chandigarh: 'Chandigarh', 
  /* Uttar Pradesh */ chandpur: 'Uttar Pradesh', 
  /* Maharashtra */ chandrapur: 'Maharashtra', 
  /* Kerala */ changanachery: 'Kerala', 
  /* Arunachal Pradesh */ changlang: 'Arunachal Pradesh', 
  /* Ladakh */ changthang: 'Ladakh', 
  /* Bihar */ chanpati: 'Bihar', chapr: 'Bihar', 
  /* Assam */ charaideo: 'Assam', 
  /* Uttar Pradesh */ charkhari: 'Uttar Pradesh', 
  /* Haryana */ charkhidadri: 'Haryana', 
  /* Odisha */ chataripur: 'Odisha', 
  /* Madhya Pradesh */ chatarpur: 'Madhya Pradesh', 
  /* Jharkhand */ chatr: 'Jharkhand', 
  /* Maharashtra */ chatrapatisambhajinagar: 'Maharashtra', 
  /* Odisha */ chatrapur: 'Odisha', 
  /* Jharkhand */ chauparan: 'Jharkhand', 
  /* Kerala */ chavakad: 'Kerala', chavar: 'Kerala', 
  /* Andhra Pradesh */ chebrolu: 'Andhra Pradesh', 
  /* Tamil Nadu */ chenai: 'Tamil Nadu', 
  /* Bihar */ chenari: 'Bihar', 
  /* Odisha */ chendipad: 'Odisha', 
  /* Tamil Nadu */ chengalpatu: 'Tamil Nadu', 
  /* Kerala */ chenganur: 'Kerala', 
  /* Andhra Pradesh */ chepurupali: 'Andhra Pradesh', 
  /* Madhya Pradesh */ chicholi: 'Madhya Pradesh', 
  /* Karnataka */ chickbalapur: 'Karnataka', 
  /* Tamil Nadu */ chidambaram: 'Tamil Nadu', 
  /* Karnataka */ chikabalapur: 'Karnataka', chikamagaluru: 'Karnataka', 
  /* Odisha */ chikiti: 'Odisha', 
  /* Karnataka */ chikmagalur: 'Karnataka', chiknayakanhali: 'Karnataka', chikodi: 'Karnataka', 
  /* Telangana */ chilkur: 'Telangana', 
  /* Karnataka */ chincholi: 'Karnataka', 
  /* Madhya Pradesh */ chindwar: 'Madhya Pradesh', 
  /* West Bengal */ chinsurah: 'West Bengal', 
  /* Andhra Pradesh */ chintalapale: 'Andhra Pradesh', 
  /* Karnataka */ chintamani: 'Karnataka', 
  /* Uttar Pradesh */ chiraigaon: 'Uttar Pradesh', 
  /* Andhra Pradesh */ chiral: 'Andhra Pradesh', 
  /* Assam */ chirang: 'Assam', 
  /* Jharkhand */ chirkund: 'Jharkhand', 
  /* Karnataka */ chitaldurg: 'Karnataka', chitapur: 'Karnataka', 
  /* Bihar */ chitauni: 'Bihar', 
  /* Andhra Pradesh */ chitor: 'Andhra Pradesh', 
  /* Rajasthan */ chitorgarh: 'Rajasthan', 
  /* Karnataka */ chitradurg: 'Karnataka', 
  /* Uttar Pradesh */ chitrakot: 'Uttar Pradesh', 
  /* Kerala */ chitur: 'Kerala', 
  /* Andhra Pradesh */ chodavaram: 'Andhra Pradesh', 
  /* Gujarat */ chotil: 'Gujarat', chotudaipur: 'Gujarat', 
  /* Odisha */ choudwar: 'Odisha', 
  /* Nagaland */ chumukedim: 'Nagaland', 
  /* Sikkim */ chungthang: 'Sikkim', 
  /* Manipur */ churachandpur: 'Manipur', 
  /* Rajasthan */ churu: 'Rajasthan', 
  /* West Bengal */ cochbehar: 'West Bengal', 
  /* Kerala */ cochin: 'Kerala', 
  /* Tamil Nadu */ coimbatore: 'Tamil Nadu', colachel: 'Tamil Nadu', 
  /* Delhi */ conaughtplace: 'Delhi', 
  /* Tamil Nadu */ conor: 'Tamil Nadu', 
  /* West Bengal */ contai: 'West Bengal', 
  /* Goa */ cortalim: 'Goa', 
  /* West Bengal */ cosimbazar: 'West Bengal', 
  /* Tamil Nadu */ cudalore: 'Tamil Nadu', 
  /* Andhra Pradesh */ cudapah: 'Andhra Pradesh', 
  /* Goa */ cuncolim: 'Goa', curchorem: 'Goa', 
  /* Odisha */ cutack: 'Odisha', 
  /* Dadra & Nagar Haveli and Daman & Diu */ dadrandnagarhaveli: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Uttar Pradesh */ dadri: 'Uttar Pradesh', 
  /* Maharashtra */ dahanu: 'Maharashtra', 
  /* Gujarat */ dahod: 'Gujarat', 
  /* West Bengal */ dakshindinajpur: 'West Bengal', 
  /* Karnataka */ dakshinkanad: 'Karnataka', 
  /* Assam */ dalgaon: 'Assam', 
  /* Chhattisgarh */ dalirajhar: 'Chhattisgarh', 
  /* Bihar */ dalsinghsarai: 'Bihar', 
  /* Jharkhand */ daltonganj: 'Jharkhand', 
  /* Dadra & Nagar Haveli and Daman & Diu */ daman: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Madhya Pradesh */ damoh: 'Madhya Pradesh', 
  /* Bihar */ danapur: 'Bihar', 
  /* Gujarat */ dang: 'Gujarat', dant: 'Gujarat', 
  /* Chhattisgarh */ dantewad: 'Chhattisgarh', 
  /* Arunachal Pradesh */ daporijo: 'Arunachal Pradesh', 
  /* Assam */ darang: 'Assam', 
  /* Bihar */ darauli: 'Bihar', daraund: 'Bihar', darbhang: 'Bihar', 
  /* Odisha */ daringbadi: 'Odisha', 
  /* West Bengal */ darjeling: 'West Bengal', 
  /* Delhi */ daryaganj: 'Delhi', 
  /* Punjab */ dasu: 'Punjab', 
  /* Madhya Pradesh */ dati: 'Madhya Pradesh', 
  /* Rajasthan */ daus: 'Rajasthan', 
  /* Karnataka */ davanagere: 'Karnataka', davangere: 'Karnataka', 
  /* Odisha */ debagarh: 'Odisha', 
  /* Rajasthan */ dechu: 'Rajasthan', dedan: 'Rajasthan', 
  /* Delhi */ defencecolony: 'Delhi', 
  /* Rajasthan */ deg: 'Rajasthan', 
  /* Uttarakhand */ dehradun: 'Uttarakhand', 
  /* Bihar */ dehri: 'Bihar', 
  /* Delhi */ delhi: 'Delhi', 
  /* Andhra Pradesh */ dendukuru: 'Andhra Pradesh', 
  /* Tamil Nadu */ denkanikotai: 'Tamil Nadu', 
  /* Uttar Pradesh */ deoband: 'Uttar Pradesh', 
  /* Jharkhand */ deoghar: 'Jharkhand', deohari: 'Jharkhand', 
  /* Uttar Pradesh */ deori: 'Uttar Pradesh', 
  /* Madhya Pradesh */ depalpur: 'Madhya Pradesh', 
  /* Gujarat */ des: 'Gujarat', 
  /* Tamil Nadu */ devakotai: 'Tamil Nadu', 
  /* Karnataka */ devanahali: 'Karnataka', 
  /* Chhattisgarh */ devbhomi: 'Chhattisgarh', 
  /* Gujarat */ devbhomidwark: 'Gujarat', devbhumidwark: 'Gujarat', 
  /* Madhya Pradesh */ devgarh: 'Madhya Pradesh', 
  /* Kerala */ devikulam: 'Kerala', 
  /* Uttarakhand */ devprayag: 'Uttarakhand', 
  /* Madhya Pradesh */ dewas: 'Madhya Pradesh', 
  /* Tripura */ dhalai: 'Tripura', 
  /* Chhattisgarh */ dhamtari: 'Chhattisgarh', 
  /* Jharkhand */ dhanbad: 'Jharkhand', dhanwar: 'Jharkhand', 
  /* Madhya Pradesh */ dhar: 'Madhya Pradesh', 
  /* Himachal Pradesh */ dharamshal: 'Himachal Pradesh', 
  /* Maharashtra */ dharashiv: 'Maharashtra', 
  /* Bihar */ dharauri: 'Bihar', 
  /* Tripura */ dharmanagar: 'Tripura', 
  /* Tamil Nadu */ dharmapuri: 'Tamil Nadu', 
  /* Andhra Pradesh */ dharmavaram: 'Andhra Pradesh', 
  /* Telangana */ dharur: 'Telangana', 
  /* Karnataka */ dharwad: 'Karnataka', 
  /* Assam */ dhemaji: 'Assam', 
  /* Odisha */ dhenkanal: 'Odisha', 
  /* Uttar Pradesh */ dholi: 'Uttar Pradesh', 
  /* Gujarat */ dholk: 'Gujarat', 
  /* Rajasthan */ dholpur: 'Rajasthan', 
  /* Gujarat */ dhoraji: 'Gujarat', dhrangadhr: 'Gujarat', 
  /* Assam */ dhubri: 'Assam', 
  /* Maharashtra */ dhule: 'Maharashtra', 
  /* Gujarat */ dhungri: 'Gujarat', 
  /* West Bengal */ dhupguri: 'West Bengal', 
  /* Punjab */ dhuri: 'Punjab', 
  /* Assam */ dibrugarh: 'Assam', 
  /* Rajasthan */ didwan: 'Rajasthan', didwankuchaman: 'Rajasthan', 
  /* Odisha */ digapahandi: 'Odisha', 
  /* Assam */ digboi: 'Assam', 
  /* West Bengal */ digh: 'West Bengal', 
  /* Uttar Pradesh */ dighwar: 'Uttar Pradesh', dildarnagar: 'Uttar Pradesh', 
  /* Nagaland */ dimapur: 'Nagaland', 
  /* Assam */ dimhasao: 'Assam', 
  /* Bihar */ dinapur: 'Bihar', 
  /* Tamil Nadu */ dindigul: 'Tamil Nadu', 
  /* Madhya Pradesh */ dindori: 'Madhya Pradesh', 
  /* West Bengal */ dinhat: 'West Bengal', 
  /* Assam */ diphu: 'Assam', 
  /* Ladakh */ diskit: 'Ladakh', 
  /* Dadra & Nagar Haveli and Daman & Diu */ diu: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Jammu & Kashmir */ dod: 'Jammu & Kashmir', 
  /* Karnataka */ dodabalapur: 'Karnataka', 
  /* Chhattisgarh */ dongargarh: 'Chhattisgarh', 
  /* Punjab */ dorah: 'Punjab', 
  /* Telangana */ dornakal: 'Telangana', 
  /* Ladakh */ dras: 'Ladakh', 
  /* Andhra Pradesh */ drbrambedkarkonasem: 'Andhra Pradesh', 
  /* Assam */ duliajan: 'Assam', 
  /* Jharkhand */ dumk: 'Jharkhand', 
  /* Bihar */ dumraon: 'Bihar', 
  /* Jharkhand */ dumri: 'Jharkhand', 
  /* Rajasthan */ dungarpur: 'Rajasthan', 
  /* Ladakh */ durbuk: 'Ladakh', 
  /* Chhattisgarh */ durg: 'Chhattisgarh', 
  /* West Bengal */ durgapur: 'West Bengal', 
  /* Delhi */ dwark: 'Delhi', 
  /* Bihar */ eastchamparan: 'Bihar', 
  /* Delhi */ eastdelhi: 'Delhi', 
  /* Meghalaya */ easternwestkhasihils: 'Meghalaya', eastgarohils: 'Meghalaya', 
  /* Andhra Pradesh */ eastgodavari: 'Andhra Pradesh', 
  /* Meghalaya */ eastjaintihils: 'Meghalaya', 
  /* Arunachal Pradesh */ eastkameng: 'Arunachal Pradesh', 
  /* Meghalaya */ eastkhasihils: 'Meghalaya', 
  /* Arunachal Pradesh */ eastsiang: 'Arunachal Pradesh', 
  /* Sikkim */ eastsikim: 'Sikkim', 
  /* Jharkhand */ eastsinghbhum: 'Jharkhand', 
  /* Tamil Nadu */ edapadi: 'Tamil Nadu', 
  /* Haryana */ elabad: 'Haryana', 
  /* Andhra Pradesh */ eluru: 'Andhra Pradesh', 
  /* West Bengal */ englishbazar: 'West Bengal', 
  /* Kerala */ eratupet: 'Kerala', ernakulam: 'Kerala', 
  /* Tamil Nadu */ erode: 'Tamil Nadu', 
  /* Uttar Pradesh */ etah: 'Uttar Pradesh', etawah: 'Uttar Pradesh', 
  /* Tamil Nadu */ etayapuram: 'Tamil Nadu', 
  /* Telangana */ ethamadak: 'Telangana', 
  /* Uttar Pradesh */ etmadpur: 'Uttar Pradesh', 
  /* Kerala */ etumanor: 'Kerala', 
  /* Uttar Pradesh */ faizabad: 'Uttar Pradesh', 
  /* West Bengal */ falakat: 'West Bengal', farak: 'West Bengal', 
  /* Haryana */ faridabad: 'Haryana', 
  /* Punjab */ faridkot: 'Punjab', 
  /* Uttar Pradesh */ farukhabad: 'Uttar Pradesh', 
  /* Haryana */ fatehabad: 'Haryana', 
  /* Uttar Pradesh */ fatehgarh: 'Uttar Pradesh', 
  /* Punjab */ fatehgarhsahib: 'Punjab', 
  /* Uttar Pradesh */ fatehpur: 'Uttar Pradesh', 
  /* Punjab */ fazilk: 'Punjab', 
  /* Uttar Pradesh */ firozabad: 'Uttar Pradesh', 
  /* Punjab */ firozpur: 'Punjab', 
  /* Karnataka */ gadag: 'Karnataka', gadagbetageri: 'Karnataka', 
  /* Maharashtra */ gadchiroli: 'Maharashtra', 
  /* Telangana */ gadwal: 'Telangana', 
  /* Madhya Pradesh */ gairatganj: 'Madhya Pradesh', 
  /* Odisha */ gajapati: 'Odisha', 
  /* Andhra Pradesh */ ganapavaram: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ ganderbal: 'Jammu & Kashmir', 
  /* Gujarat */ gandevi: 'Gujarat', gandhidham: 'Gujarat', gandhinagar: 'Gujarat', 
  /* Andhra Pradesh */ gangad: 'Andhra Pradesh', gangadharnelore: 'Andhra Pradesh', 
  /* Karnataka */ gangawati: 'Karnataka', 
  /* Sikkim */ gangtok: 'Sikkim', 
  /* Odisha */ ganjam: 'Odisha', 
  /* Uttar Pradesh */ ganjdundwar: 'Uttar Pradesh', 
  /* Assam */ garamur: 'Assam', 
  /* Madhya Pradesh */ garhakot: 'Madhya Pradesh', 
  /* Jharkhand */ garhw: 'Jharkhand', 
  /* Chhattisgarh */ gariaband: 'Chhattisgarh', 
  /* Gujarat */ gariadhar: 'Gujarat', 
  /* Punjab */ garshankar: 'Punjab', 
  /* Assam */ gauhati: 'Assam', 
  /* Chhattisgarh */ gaurel: 'Chhattisgarh', gaurelpendrmarwahi: 'Chhattisgarh', 
  /* Uttar Pradesh */ gauriganj: 'Uttar Pradesh', 
  /* Assam */ gauripur: 'Assam', 
  /* Uttar Pradesh */ gautambudhnagar: 'Uttar Pradesh', 
  /* Bihar */ gay: 'Bihar', 
  /* Sikkim */ geyzing: 'Sikkim', 
  /* Rajasthan */ ghanaipur: 'Rajasthan', 
  /* Telangana */ ghanpur: 'Telangana', 
  /* West Bengal */ ghatal: 'West Bengal', 
  /* Uttar Pradesh */ ghatampur: 'Uttar Pradesh', 
  /* Jharkhand */ ghatshil: 'Jharkhand', 
  /* Uttar Pradesh */ ghaziabad: 'Uttar Pradesh', ghazipur: 'Uttar Pradesh', 
  /* Bihar */ ghoshi: 'Bihar', 
  /* Gujarat */ ghumli: 'Gujarat', 
  /* Tamil Nadu */ ginge: 'Tamil Nadu', 
  /* Jharkhand */ giridih: 'Jharkhand', 
  /* Gujarat */ girsomnath: 'Gujarat', 
  /* Assam */ goalpar: 'Assam', 
  /* Tamil Nadu */ gobichetipalayam: 'Tamil Nadu', 
  /* Odisha */ gobindpur: 'Odisha', 
  /* Jharkhand */ god: 'Jharkhand', 
  /* Gujarat */ godhr: 'Gujarat', 
  /* Rajasthan */ gogund: 'Rajasthan', 
  /* Madhya Pradesh */ goharghat: 'Madhya Pradesh', 
  /* Karnataka */ gokak: 'Karnataka', 
  /* Uttar Pradesh */ gokul: 'Uttar Pradesh', 
  /* Assam */ golaghat: 'Assam', 
  /* Uttar Pradesh */ golgokaranath: 'Uttar Pradesh', 
  /* Tripura */ gomati: 'Tripura', 
  /* Jharkhand */ gomoh: 'Jharkhand', 
  /* Uttar Pradesh */ gond: 'Uttar Pradesh', 
  /* Gujarat */ gondal: 'Gujarat', 
  /* Chhattisgarh */ gonder: 'Chhattisgarh', 
  /* Maharashtra */ gondi: 'Maharashtra', 
  /* Punjab */ gonian: 'Punjab', 
  /* Bihar */ gopalamau: 'Bihar', gopalganj: 'Bihar', gopalpur: 'Bihar', 
  /* Uttarakhand */ gopeshwar: 'Uttarakhand', 
  /* Uttar Pradesh */ gorakhpur: 'Uttar Pradesh', 
  /* Bihar */ goraul: 'Bihar', goth: 'Bihar', 
  /* Andhra Pradesh */ goty: 'Andhra Pradesh', 
  /* Uttar Pradesh */ greaternoid: 'Uttar Pradesh', 
  /* Tamil Nadu */ gudiyatham: 'Tamil Nadu', 
  /* Andhra Pradesh */ gudur: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ gulabgarh: 'Jammu & Kashmir', 
  /* Karnataka */ gulbarg: 'Karnataka', guledgud: 'Karnataka', 
  /* Tamil Nadu */ gumidipondi: 'Tamil Nadu', 
  /* Jharkhand */ guml: 'Jharkhand', 
  /* Madhya Pradesh */ gun: 'Madhya Pradesh', gunad: 'Madhya Pradesh', 
  /* Karnataka */ gundlupet: 'Karnataka', 
  /* Andhra Pradesh */ guntur: 'Andhra Pradesh', 
  /* Odisha */ guo: 'Odisha', 
  /* Andhra Pradesh */ gurazal: 'Andhra Pradesh', 
  /* Punjab */ gurdaspur: 'Punjab', 
  /* Haryana */ gurgaon: 'Haryana', gurugram: 'Haryana', 
  /* Kerala */ guruvayur: 'Kerala', 
  /* Assam */ guwahati: 'Assam', 
  /* Madhya Pradesh */ gwalior: 'Madhya Pradesh', 
  /* Sikkim */ gyalshing: 'Sikkim', 
  /* Uttar Pradesh */ gyanpur: 'Uttar Pradesh', 
  /* West Bengal */ habr: 'West Bengal', 
  /* Assam */ haflong: 'Assam', 
  /* Karnataka */ hagaribomanahali: 'Karnataka', 
  /* Telangana */ haidergarh: 'Telangana', 
  /* Assam */ hailakandi: 'Assam', 
  /* Bihar */ hajipur: 'Bihar', 
  /* Assam */ hajo: 'Assam', 
  /* West Bengal */ haldi: 'West Bengal', 
  /* Uttarakhand */ haldwani: 'Uttarakhand', 
  /* Karnataka */ haliyal: 'Karnataka', 
  /* Gujarat */ halol: 'Gujarat', halvad: 'Gujarat', 
  /* Assam */ hamren: 'Assam', 
  /* Telangana */ hanamkond: 'Telangana', 
  /* Ladakh */ hanle: 'Ladakh', 
  /* Haryana */ hansi: 'Haryana', 
  /* Rajasthan */ hanumangarh: 'Rajasthan', 
  /* Uttar Pradesh */ hapur: 'Uttar Pradesh', haraiy: 'Uttar Pradesh', 
  /* Madhya Pradesh */ hard: 'Madhya Pradesh', 
  /* Uttar Pradesh */ hardoi: 'Uttar Pradesh', 
  /* Uttarakhand */ haridwar: 'Uttarakhand', 
  /* Karnataka */ harihar: 'Karnataka', harpanahali: 'Karnataka', hasan: 'Karnataka', 
  /* Uttar Pradesh */ hasanpur: 'Uttar Pradesh', hat: 'Uttar Pradesh', hathras: 'Uttar Pradesh', 
  /* Bihar */ hathu: 'Bihar', 
  /* Assam */ hatsingimari: 'Assam', 
  /* Karnataka */ haveri: 'Karnataka', 
  /* Arunachal Pradesh */ hawai: 'Arunachal Pradesh', 
  /* Telangana */ hayathnagar: 'Telangana', 
  /* Jharkhand */ hazaribag: 'Jharkhand', hazaribagh: 'Jharkhand', 
  /* Gujarat */ himatnagar: 'Gujarat', 
  /* Andhra Pradesh */ hindupur: 'Andhra Pradesh', 
  /* Maharashtra */ hingoli: 'Maharashtra', 
  /* Odisha */ hinjili: 'Odisha', 
  /* Andhra Pradesh */ hiramandalam: 'Andhra Pradesh', 
  /* Karnataka */ hirekerur: 'Karnataka', hiriyur: 'Karnataka', 
  /* Haryana */ hisar: 'Haryana', 
  /* Mizoram */ hnahthial: 'Mizoram', 
  /* Haryana */ hodal: 'Haryana', 
  /* West Bengal */ hoghly: 'West Bengal', 
  /* Assam */ hojai: 'Assam', 
  /* Karnataka */ holalkere: 'Karnataka', holenarsipur: 'Karnataka', honali: 'Karnataka', honavar: 'Karnataka', hosanagar: 'Karnataka', hosdurg: 'Karnataka', 
  /* Madhya Pradesh */ hoshangabad: 'Madhya Pradesh', 
  /* Punjab */ hoshiarpur: 'Punjab', 
  /* Karnataka */ hoskote: 'Karnataka', hospet: 'Karnataka', hospete: 'Karnataka', 
  /* Tamil Nadu */ hosur: 'Tamil Nadu', 
  /* West Bengal */ howrah: 'West Bengal', 
  /* Karnataka */ hubali: 'Karnataka', hubli: 'Karnataka', hunsur: 'Karnataka', 
  /* Gujarat */ huv: 'Gujarat', 
  /* Madhya Pradesh */ huzur: 'Madhya Pradesh', 
  /* Telangana */ huzurabad: 'Telangana', hyderabad: 'Telangana', 
  /* Maharashtra */ ichalkaranji: 'Maharashtra', 
  /* Gujarat */ idar: 'Gujarat', 
  /* Kerala */ iduki: 'Kerala', 
  /* Uttar Pradesh */ iglas: 'Uttar Pradesh', 
  /* West Bengal */ ilaberi: 'West Bengal', 
  /* Manipur */ imphal: 'Manipur', imphaleast: 'Manipur', imphalwest: 'Manipur', 
  /* Maharashtra */ indapur: 'Maharashtra', 
  /* West Bengal */ indas: 'West Bengal', 
  /* Karnataka */ indi: 'Karnataka', 
  /* Madhya Pradesh */ indore: 'Madhya Pradesh', 
  /* Haryana */ indri: 'Haryana', 
  /* Telangana */ indurvi: 'Telangana', 
  /* Kerala */ irinjalakud: 'Kerala', irity: 'Kerala', 
  /* Madhya Pradesh */ isagarh: 'Madhya Pradesh', 
  /* Bihar */ islampur: 'Bihar', 
  /* Arunachal Pradesh */ itanagar: 'Arunachal Pradesh', 
  /* Madhya Pradesh */ itarsi: 'Madhya Pradesh', 
  /* Uttar Pradesh */ itaunj: 'Uttar Pradesh', 
  /* Madhya Pradesh */ jabalpur: 'Madhya Pradesh', 
  /* Haryana */ jagadhri: 'Haryana', 
  /* Karnataka */ jagalur: 'Karnataka', 
  /* Odisha */ jagatsinghpur: 'Odisha', 
  /* Chhattisgarh */ jagdalpur: 'Chhattisgarh', 
  /* Telangana */ jagitial: 'Telangana', jagtial: 'Telangana', 
  /* Uttar Pradesh */ jahanabad: 'Uttar Pradesh', 
  /* Bihar */ jainagar: 'Bihar', 
  /* Rajasthan */ jaipur: 'Rajasthan', jaisalmer: 'Rajasthan', 
  /* Odisha */ jajpur: 'Odisha', 
  /* West Bengal */ jaku: 'West Bengal', 
  /* Uttar Pradesh */ jalalabad: 'Uttar Pradesh', 
  /* Gujarat */ jalalpore: 'Gujarat', 
  /* Punjab */ jalandhar: 'Punjab', 
  /* Uttar Pradesh */ jalaun: 'Uttar Pradesh', 
  /* Maharashtra */ jalgaon: 'Maharashtra', jaln: 'Maharashtra', 
  /* Rajasthan */ jalore: 'Rajasthan', 
  /* West Bengal */ jalpaiguri: 'West Bengal', 
  /* Andhra Pradesh */ jamalamadugu: 'Andhra Pradesh', 
  /* Bihar */ jamalpur: 'Bihar', 
  /* Gujarat */ jambusar: 'Gujarat', jamnagar: 'Gujarat', 
  /* Jharkhand */ jamshedpur: 'Jharkhand', jamtar: 'Jharkhand', 
  /* Bihar */ jamui: 'Bihar', 
  /* Delhi */ janakpuri: 'Delhi', 
  /* Telangana */ jangaon: 'Telangana', 
  /* Andhra Pradesh */ jangaredygudem: 'Andhra Pradesh', 
  /* Chhattisgarh */ janjgir: 'Chhattisgarh', janjgirchamp: 'Chhattisgarh', 
  /* Jharkhand */ jari: 'Jharkhand', jarmundi: 'Jharkhand', 
  /* Gujarat */ jasdan: 'Gujarat', 
  /* Chhattisgarh */ jashpur: 'Chhattisgarh', jashpurnagar: 'Chhattisgarh', 
  /* Uttar Pradesh */ jaswantnagar: 'Uttar Pradesh', 
  /* Odisha */ jatani: 'Odisha', 
  /* Uttar Pradesh */ jaunpur: 'Uttar Pradesh', 
  /* Rajasthan */ javewar: 'Rajasthan', jawai: 'Rajasthan', 
  /* Himachal Pradesh */ jawalamukhi: 'Himachal Pradesh', 
  /* Tamil Nadu */ jayankondam: 'Tamil Nadu', 
  /* Telangana */ jayashankarbhupalpaly: 'Telangana', 
  /* West Bengal */ jaypur: 'West Bengal', 
  /* Bihar */ jehanabad: 'Bihar', 
  /* Gujarat */ jetpur: 'Gujarat', 
  /* Karnataka */ jewargi: 'Karnataka', 
  /* Madhya Pradesh */ jhabu: 'Madhya Pradesh', 
  /* Haryana */ jhajar: 'Haryana', 
  /* Bihar */ jhajh: 'Bihar', 
  /* Rajasthan */ jhalawar: 'Rajasthan', 
  /* West Bengal */ jhald: 'West Bengal', 
  /* Uttar Pradesh */ jhansi: 'Uttar Pradesh', 
  /* West Bengal */ jhargram: 'West Bengal', 
  /* Odisha */ jharsugud: 'Odisha', 
  /* Chhattisgarh */ jhir: 'Chhattisgarh', 
  /* Rajasthan */ jhunjhunu: 'Rajasthan', 
  /* West Bengal */ jiaganj: 'West Bengal', 
  /* Haryana */ jind: 'Haryana', 
  /* Manipur */ jiribam: 'Manipur', 
  /* Odisha */ jod: 'Odisha', 
  /* Rajasthan */ jodhpur: 'Rajasthan', 
  /* Himachal Pradesh */ jogindernagar: 'Himachal Pradesh', 
  /* Telangana */ jogulambgadwal: 'Telangana', 
  /* Tamil Nadu */ jolarpetai: 'Tamil Nadu', 
  /* Assam */ jonai: 'Assam', 
  /* Sikkim */ jorethang: 'Sikkim', 
  /* Assam */ jorhat: 'Assam', 
  /* Uttarakhand */ joshimath: 'Uttarakhand', 
  /* Meghalaya */ jowai: 'Meghalaya', 
  /* Telangana */ jukal: 'Telangana', 
  /* Gujarat */ junagadh: 'Gujarat', 
  /* Odisha */ junagarh: 'Odisha', 
  /* Chhattisgarh */ kabirdham: 'Chhattisgarh', 
  /* Tripura */ kadamtal: 'Tripura', 
  /* Andhra Pradesh */ kadap: 'Andhra Pradesh', 
  /* Gujarat */ kadi: 'Gujarat', 
  /* Uttar Pradesh */ kadipur: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kadiyam: 'Andhra Pradesh', 
  /* Telangana */ kagaznagar: 'Telangana', 
  /* Bihar */ kahalgaon: 'Bihar', 
  /* Andhra Pradesh */ kaikaluru: 'Andhra Pradesh', 
  /* Tripura */ kailashahar: 'Tripura', 
  /* Uttar Pradesh */ kaimganj: 'Uttar Pradesh', 
  /* Bihar */ kaimur: 'Bihar', 
  /* Haryana */ kaithal: 'Haryana', 
  /* Assam */ kajalgaon: 'Assam', 
  /* Kerala */ kakanad: 'Kerala', 
  /* Odisha */ kakatpur: 'Odisha', 
  /* Manipur */ kakching: 'Manipur', 
  /* Andhra Pradesh */ kakinad: 'Andhra Pradesh', 
  /* Uttar Pradesh */ kakori: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kal: 'Andhra Pradesh', 
  /* Karnataka */ kalaburagi: 'Karnataka', 
  /* Odisha */ kalahandi: 'Odisha', 
  /* Tamil Nadu */ kalakurichi: 'Tamil Nadu', 
  /* Karnataka */ kalas: 'Karnataka', 
  /* Gujarat */ kalawad: 'Gujarat', 
  /* Karnataka */ kalghatgi: 'Karnataka', kalgi: 'Karnataka', 
  /* West Bengal */ kalimpong: 'West Bengal', 
  /* Odisha */ kaling: 'Odisha', 
  /* West Bengal */ kaln: 'West Bengal', 
  /* Kerala */ kalpet: 'Kerala', 
  /* Uttar Pradesh */ kalpi: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kaluvakolanu: 'Andhra Pradesh', 
  /* Telangana */ kalwakurthy: 'Telangana', 
  /* Maharashtra */ kalyan: 'Maharashtra', 
  /* Andhra Pradesh */ kalyandurg: 'Andhra Pradesh', kamalapurum: 'Andhra Pradesh', 
  /* Telangana */ kamaredy: 'Telangana', 
  /* Manipur */ kamjong: 'Manipur', 
  /* Arunachal Pradesh */ kamle: 'Arunachal Pradesh', 
  /* Gujarat */ kamrej: 'Gujarat', 
  /* Assam */ kamrup: 'Assam', kamrupmetropolitan: 'Assam', 
  /* Karnataka */ kanakapur: 'Karnataka', 
  /* Uttar Pradesh */ kanauj: 'Uttar Pradesh', 
  /* Tamil Nadu */ kanchepuram: 'Tamil Nadu', kanchipuram: 'Tamil Nadu', 
  /* Odisha */ kandhamal: 'Odisha', 
  /* Tamil Nadu */ kangeyam: 'Tamil Nadu', 
  /* Manipur */ kangpokpi: 'Manipur', 
  /* Himachal Pradesh */ kangr: 'Himachal Pradesh', 
  /* Manipur */ kangtui: 'Manipur', 
  /* Delhi */ kanjhawal: 'Delhi', 
  /* Kerala */ kanjirapali: 'Kerala', 
  /* Jharkhand */ kanke: 'Jharkhand', 
  /* Chhattisgarh */ kanker: 'Chhattisgarh', 
  /* West Bengal */ kankinar: 'West Bengal', 
  /* Uttar Pradesh */ kanpur: 'Uttar Pradesh', kanpurdehat: 'Uttar Pradesh', kanpurnagar: 'Uttar Pradesh', kanth: 'Uttar Pradesh', 
  /* West Bengal */ kanthi: 'West Bengal', 
  /* Kerala */ kanur: 'Kerala', 
  /* Tamil Nadu */ kanyakumari: 'Tamil Nadu', 
  /* Punjab */ kapurthal: 'Punjab', 
  /* Maharashtra */ karad: 'Maharashtra', 
  /* Puducherry */ karaikal: 'Puducherry', 
  /* Tamil Nadu */ karaikudi: 'Tamil Nadu', 
  /* Rajasthan */ karauli: 'Rajasthan', 
  /* Assam */ karbianglong: 'Assam', 
  /* Ladakh */ kargil: 'Ladakh', 
  /* Jammu & Kashmir */ kargilkahon: 'Jammu & Kashmir', 
  /* Tamil Nadu */ kariapati: 'Tamil Nadu', 
  /* Assam */ karimganj: 'Assam', 
  /* Telangana */ karimnagar: 'Telangana', 
  /* West Bengal */ karimpur: 'West Bengal', 
  /* Karnataka */ karkal: 'Karnataka', 
  /* Haryana */ karnal: 'Haryana', 
  /* Uttarakhand */ karnaprayag: 'Uttarakhand', 
  /* Delhi */ karolbagh: 'Delhi', 
  /* Bihar */ karpi: 'Bihar', 
  /* Kerala */ karunagapali: 'Kerala', 
  /* Tamil Nadu */ karur: 'Tamil Nadu', 
  /* Karnataka */ karwar: 'Karnataka', 
  /* Uttar Pradesh */ karwi: 'Uttar Pradesh', 
  /* Kerala */ kasaragod: 'Kerala', 
  /* Chhattisgarh */ kasdol: 'Chhattisgarh', 
  /* Uttar Pradesh */ kasganj: 'Uttar Pradesh', 
  /* Uttarakhand */ kashipur: 'Uttarakhand', 
  /* Madhya Pradesh */ katangi: 'Madhya Pradesh', 
  /* Kerala */ katapan: 'Kerala', 
  /* Chhattisgarh */ katghor: 'Chhattisgarh', kathdol: 'Chhattisgarh', 
  /* Uttarakhand */ kathgodam: 'Uttarakhand', 
  /* Jammu & Kashmir */ kathu: 'Jammu & Kashmir', 
  /* Assam */ katigorah: 'Assam', 
  /* Bihar */ katihar: 'Bihar', 
  /* Madhya Pradesh */ katni: 'Madhya Pradesh', 
  /* Tamil Nadu */ katpadi: 'Tamil Nadu', 
  /* Uttar Pradesh */ katr: 'Uttar Pradesh', 
  /* Jharkhand */ katras: 'Jharkhand', 
  /* West Bengal */ katw: 'West Bengal', 
  /* Uttar Pradesh */ kaushambi: 'Uttar Pradesh', 
  /* Andhra Pradesh */ kavali: 'Andhra Pradesh', 
  /* Lakshadweep */ kavarati: 'Lakshadweep', 
  /* Chhattisgarh */ kawardh: 'Chhattisgarh', 
  /* Mizoram */ kawnpui: 'Mizoram', 
  /* Rajasthan */ kekri: 'Rajasthan', 
  /* Tamil Nadu */ kelakarai: 'Tamil Nadu', 
  /* Odisha */ kendrapar: 'Odisha', kendujhar: 'Odisha', keonjhar: 'Odisha', 
  /* Arunachal Pradesh */ keyipanyor: 'Arunachal Pradesh', 
  /* Himachal Pradesh */ keylong: 'Himachal Pradesh', 
  /* Odisha */ khabr: 'Odisha', 
  /* Bihar */ khagari: 'Bihar', 
  /* Uttar Pradesh */ khairabad: 'Uttar Pradesh', 
  /* Chhattisgarh */ khairagarh: 'Chhattisgarh', khairagarhchuikhadangandai: 'Chhattisgarh', 
  /* Rajasthan */ khairthal: 'Rajasthan', khairthaltijar: 'Rajasthan', 
  /* Ladakh */ khalatse: 'Ladakh', 
  /* Odisha */ khalikote: 'Odisha', 
  /* Uttar Pradesh */ khalilabad: 'Uttar Pradesh', 
  /* Bihar */ khalispur: 'Bihar', 
  /* Telangana */ khamam: 'Telangana', 
  /* Gujarat */ khambhali: 'Gujarat', 
  /* Punjab */ khan: 'Punjab', 
  /* Madhya Pradesh */ khandw: 'Madhya Pradesh', 
  /* West Bengal */ kharagpur: 'West Bengal', 
  /* Punjab */ kharar: 'Punjab', 
  /* Madhya Pradesh */ khargone: 'Madhya Pradesh', 
  /* Haryana */ kharkhod: 'Haryana', 
  /* Chhattisgarh */ kharsi: 'Chhattisgarh', 
  /* Jharkhand */ kharswan: 'Jharkhand', 
  /* Odisha */ khatigum: 'Odisha', 
  /* West Bengal */ khatr: 'West Bengal', 
  /* Mizoram */ khawzawl: 'Mizoram', 
  /* Gujarat */ khed: 'Gujarat', 
  /* Rajasthan */ kherwar: 'Rajasthan', 
  /* Meghalaya */ khliehriat: 'Meghalaya', 
  /* Arunachal Pradesh */ khons: 'Arunachal Pradesh', 
  /* Odisha */ khordh: 'Odisha', 
  /* Manipur */ khoupum: 'Manipur', 
  /* Tripura */ khowai: 'Tripura', 
  /* Assam */ khumtai: 'Assam', 
  /* Jharkhand */ khunti: 'Jharkhand', 
  /* Madhya Pradesh */ khurai: 'Madhya Pradesh', 
  /* Uttar Pradesh */ khurj: 'Uttar Pradesh', 
  /* Tamil Nadu */ kiliyur: 'Tamil Nadu', kilvelur: 'Tamil Nadu', 
  /* Himachal Pradesh */ kinaur: 'Himachal Pradesh', 
  /* Uttar Pradesh */ kintur: 'Uttar Pradesh', 
  /* Nagaland */ kiphire: 'Nagaland', 
  /* Bihar */ kishanganj: 'Bihar', 
  /* Rajasthan */ kishangarh: 'Rajasthan', 
  /* Jammu & Kashmir */ kishtwar: 'Jammu & Kashmir', 
  /* Kerala */ kochi: 'Kerala', 
  /* Karnataka */ kodagu: 'Karnataka', 
  /* Tamil Nadu */ kodaikanal: 'Tamil Nadu', 
  /* Odisha */ kodal: 'Odisha', 
  /* Telangana */ kodangal: 'Telangana', 
  /* Jharkhand */ koderm: 'Jharkhand', 
  /* Gujarat */ kodinar: 'Gujarat', 
  /* Telangana */ kohed: 'Telangana', 
  /* Nagaland */ kohim: 'Nagaland', 
  /* Assam */ kokrajhar: 'Assam', 
  /* Kerala */ kolam: 'Kerala', 
  /* Karnataka */ kolar: 'Karnataka', 
  /* Mizoram */ kolasib: 'Mizoram', 
  /* Karnataka */ kolegal: 'Karnataka', 
  /* Maharashtra */ kolhapur: 'Maharashtra', 
  /* West Bengal */ kolkat: 'West Bengal', 
  /* Arunachal Pradesh */ koloriang: 'Arunachal Pradesh', 
  /* Telangana */ komarambhem: 'Telangana', 
  /* Odisha */ komn: 'Odisha', 
  /* Andhra Pradesh */ konasem: 'Andhra Pradesh', 
  /* Chhattisgarh */ kondagaon: 'Chhattisgarh', 
  /* Uttar Pradesh */ kondharkhed: 'Uttar Pradesh', 
  /* Kerala */ kondoty: 'Kerala', 
  /* Karnataka */ kopal: 'Karnataka', 
  /* Odisha */ koraput: 'Odisha', 
  /* Telangana */ koratl: 'Telangana', 
  /* Chhattisgarh */ korb: 'Chhattisgarh', kore: 'Chhattisgarh', 
  /* Odisha */ korei: 'Odisha', 
  /* Chhattisgarh */ koriy: 'Chhattisgarh', 
  /* Uttar Pradesh */ kosi: 'Uttar Pradesh', 
  /* Rajasthan */ kot: 'Rajasthan', 
  /* Odisha */ kotagarh: 'Odisha', 
  /* Tamil Nadu */ kotagiri: 'Tamil Nadu', 
  /* Kerala */ kotarakar: 'Kerala', kotayam: 'Kerala', 
  /* Gujarat */ kotdsangani: 'Gujarat', 
  /* Uttarakhand */ kotdwar: 'Uttarakhand', 
  /* Telangana */ kothagudem: 'Telangana', kothakot: 'Telangana', 
  /* Kerala */ kothamangalam: 'Kerala', 
  /* Andhra Pradesh */ kothapale: 'Andhra Pradesh', 
  /* Punjab */ kotkapur: 'Punjab', 
  /* Rajasthan */ kotputli: 'Rajasthan', kotputlibehror: 'Rajasthan', 
  /* Kerala */ kovalam: 'Kerala', 
  /* Tamil Nadu */ kovilpati: 'Tamil Nadu', 
  /* Andhra Pradesh */ kovur: 'Andhra Pradesh', kovuru: 'Andhra Pradesh', 
  /* Kerala */ koyilandy: 'Kerala', kozhenchery: 'Kerala', kozhikode: 'Kerala', 
  /* Arunachal Pradesh */ krdadi: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ krishn: 'Andhra Pradesh', 
  /* Tamil Nadu */ krishnagiri: 'Tamil Nadu', 
  /* West Bengal */ krishnanagar: 'West Bengal', 
  /* Rajasthan */ kuchaman: 'Rajasthan', 
  /* Karnataka */ kudligi: 'Karnataka', 
  /* Bihar */ kudr: 'Bihar', 
  /* Karnataka */ kudremukh: 'Karnataka', 
  /* Jammu & Kashmir */ kulgam: 'Jammu & Kashmir', 
  /* Bihar */ kulhari: 'Bihar', 
  /* Tamil Nadu */ kulithalai: 'Tamil Nadu', 
  /* Uttar Pradesh */ kulpahar: 'Uttar Pradesh', 
  /* Himachal Pradesh */ kulu: 'Himachal Pradesh', 
  /* Tamil Nadu */ kumbakonam: 'Tamil Nadu', 
  /* Chhattisgarh */ kumhari: 'Chhattisgarh', 
  /* Karnataka */ kumt: 'Karnataka', 
  /* Telangana */ kumurambhemasifabad: 'Telangana', 
  /* Kerala */ kunamkulam: 'Kerala', 
  /* Uttar Pradesh */ kund: 'Uttar Pradesh', 
  /* Madhya Pradesh */ kundam: 'Madhya Pradesh', 
  /* Karnataka */ kundapur: 'Karnataka', kundgol: 'Karnataka', 
  /* Jharkhand */ kundhi: 'Jharkhand', 
  /* Chhattisgarh */ kundr: 'Chhattisgarh', 
  /* Karnataka */ kunigal: 'Karnataka', 
  /* Andhra Pradesh */ kupam: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ kupwar: 'Jammu & Kashmir', 
  /* Bihar */ kurauli: 'Bihar', 
  /* Tamil Nadu */ kurinjipadi: 'Tamil Nadu', 
  /* Andhra Pradesh */ kurnol: 'Andhra Pradesh', 
  /* West Bengal */ kurseong: 'West Bengal', 
  /* Chhattisgarh */ kurud: 'Chhattisgarh', 
  /* Haryana */ kurukshetr: 'Haryana', 
  /* Arunachal Pradesh */ kurungkumey: 'Arunachal Pradesh', 
  /* Madhya Pradesh */ kurwai: 'Madhya Pradesh', 
  /* Goa */ kushavati: 'Goa', 
  /* Uttar Pradesh */ kushinagar: 'Uttar Pradesh', 
  /* Madhya Pradesh */ kusmi: 'Madhya Pradesh', 
  /* Sikkim */ kusong: 'Sikkim', 
  /* Kerala */ kutanad: 'Kerala', 
  /* Gujarat */ kutch: 'Gujarat', 
  /* Kerala */ kuthuparamb: 'Kerala', 
  /* Sikkim */ lachen: 'Sikkim', 
  /* Rajasthan */ lachmangarh: 'Rajasthan', 
  /* Sikkim */ lachung: 'Sikkim', 
  /* Himachal Pradesh */ lahaulandspiti: 'Himachal Pradesh', 
  /* Uttar Pradesh */ lakhimpurkheri: 'Uttar Pradesh', 
  /* Assam */ lakhipur: 'Assam', 
  /* Bihar */ lakhisarai: 'Bihar', 
  /* Andhra Pradesh */ lakirepaly: 'Andhra Pradesh', 
  /* Lakshadweep */ lakshadwep: 'Lakshadweep', 
  /* Karnataka */ lakshmeshwar: 'Karnataka', 
  /* Tamil Nadu */ lalgudi: 'Tamil Nadu', 
  /* Uttar Pradesh */ lalitpur: 'Uttar Pradesh', 
  /* Madhya Pradesh */ lamdhi: 'Madhya Pradesh', 
  /* Manipur */ lamphelpat: 'Manipur', 
  /* Jharkhand */ lapung: 'Jharkhand', latehar: 'Jharkhand', 
  /* Gujarat */ lathi: 'Gujarat', 
  /* Maharashtra */ latur: 'Maharashtra', 
  /* Mizoram */ lawngtlai: 'Mizoram', 
  /* Assam */ ledo: 'Assam', 
  /* Ladakh */ leh: 'Ladakh', 
  /* Arunachal Pradesh */ lemi: 'Arunachal Pradesh', leprad: 'Arunachal Pradesh', likabali: 'Arunachal Pradesh', 
  /* West Bengal */ liluah: 'West Bengal', 
  /* Gujarat */ limbdi: 'Gujarat', 
  /* Karnataka */ lingsugur: 'Karnataka', 
  /* Gujarat */ lodhik: 'Gujarat', 
  /* Jharkhand */ lohardag: 'Jharkhand', 
  /* Arunachal Pradesh */ lohit: 'Arunachal Pradesh', longding: 'Arunachal Pradesh', 
  /* Nagaland */ longleng: 'Nagaland', 
  /* Arunachal Pradesh */ lowerdibangvaley: 'Arunachal Pradesh', lowersiang: 'Arunachal Pradesh', lowersubansiri: 'Arunachal Pradesh', 
  /* Uttar Pradesh */ lucknow: 'Uttar Pradesh', 
  /* Punjab */ ludhian: 'Punjab', 
  /* Gujarat */ lunavad: 'Gujarat', 
  /* Chhattisgarh */ lundi: 'Chhattisgarh', 
  /* Mizoram */ lunglei: 'Mizoram', 
  /* Andhra Pradesh */ macherl: 'Andhra Pradesh', machilipatnam: 'Andhra Pradesh', madanapale: 'Andhra Pradesh', 
  /* Goa */ madgaon: 'Goa', 
  /* Tamil Nadu */ madhavaram: 'Tamil Nadu', 
  /* Uttar Pradesh */ madhavganj: 'Uttar Pradesh', 
  /* Bihar */ madhepur: 'Bihar', madhubani: 'Bihar', 
  /* Jharkhand */ madhupur: 'Jharkhand', 
  /* Karnataka */ madikeri: 'Karnataka', 
  /* Tamil Nadu */ madras: 'Tamil Nadu', madukarai: 'Tamil Nadu', 
  /* Karnataka */ madur: 'Karnataka', 
  /* Tamil Nadu */ madurai: 'Tamil Nadu', madurantakam: 'Tamil Nadu', 
  /* Karnataka */ magadi: 'Karnataka', 
  /* Telangana */ mahabubabad: 'Telangana', mahabubnagar: 'Telangana', 
  /* Odisha */ mahakud: 'Odisha', 
  /* Haryana */ maham: 'Haryana', 
  /* Uttar Pradesh */ maharajganj: 'Uttar Pradesh', 
  /* Madhya Pradesh */ maharajpur: 'Madhya Pradesh', 
  /* Chhattisgarh */ mahasamund: 'Chhattisgarh', 
  /* Telangana */ mahbubnagar: 'Telangana', 
  /* Puducherry */ mahe: 'Puducherry', 
  /* Haryana */ mahendragarh: 'Haryana', 
  /* Jharkhand */ maheshpur: 'Jharkhand', 
  /* Gujarat */ mahisagar: 'Gujarat', 
  /* Uttar Pradesh */ mahob: 'Uttar Pradesh', maholi: 'Uttar Pradesh', mahrajganj: 'Uttar Pradesh', 
  /* Gujarat */ mahuv: 'Gujarat', 
  /* Madhya Pradesh */ maihar: 'Madhya Pradesh', 
  /* West Bengal */ mainaguri: 'West Bengal', 
  /* Uttar Pradesh */ mainpuri: 'Uttar Pradesh', 
  /* Meghalaya */ mairang: 'Meghalaya', 
  /* Assam */ majuli: 'Assam', 
  /* Telangana */ makthal: 'Telangana', 
  /* Assam */ makum: 'Assam', 
  /* Kerala */ mal: 'Kerala', malapuram: 'Kerala', 
  /* Karnataka */ malavali: 'Karnataka', 
  /* West Bengal */ mald: 'West Bengal', maldah: 'West Bengal', 
  /* Maharashtra */ malegaon: 'Maharashtra', 
  /* Punjab */ malerkotl: 'Punjab', 
  /* Gujarat */ mali: 'Gujarat', 
  /* Odisha */ malkangiri: 'Odisha', 
  /* Karnataka */ malur: 'Karnataka', 
  /* Mizoram */ mamit: 'Mizoram', 
  /* Telangana */ manakondur: 'Telangana', 
  /* Himachal Pradesh */ manali: 'Himachal Pradesh', 
  /* Tamil Nadu */ manamadurai: 'Tamil Nadu', 
  /* Kerala */ mananthavady: 'Kerala', 
  /* Tamil Nadu */ manaparai: 'Tamil Nadu', manargudi: 'Tamil Nadu', 
  /* Kerala */ manarkad: 'Kerala', 
  /* Madhya Pradesh */ manas: 'Madhya Pradesh', 
  /* Gujarat */ manavadar: 'Gujarat', 
  /* West Bengal */ manbazar: 'West Bengal', 
  /* Telangana */ mancherial: 'Telangana', 
  /* Rajasthan */ mandaw: 'Rajasthan', 
  /* Himachal Pradesh */ mandi: 'Himachal Pradesh', 
  /* Madhya Pradesh */ mandl: 'Madhya Pradesh', mandsaur: 'Madhya Pradesh', 
  /* Karnataka */ mandy: 'Karnataka', 
  /* Chhattisgarh */ manendragarh: 'Chhattisgarh', manendragarhchirmiribharatpur: 'Chhattisgarh', 
  /* Andhra Pradesh */ mangalagiri: 'Andhra Pradesh', 
  /* Assam */ mangaldoi: 'Assam', 
  /* West Bengal */ mangalkot: 'West Bengal', 
  /* Karnataka */ mangalore: 'Karnataka', mangaluru: 'Karnataka', 
  /* Sikkim */ mangan: 'Sikkim', 
  /* Chhattisgarh */ mango: 'Chhattisgarh', 
  /* Gujarat */ mangrol: 'Gujarat', 
  /* Bihar */ manihari: 'Bihar', 
  /* Chandigarh */ manimajr: 'Chandigarh', 
  /* Kerala */ manjeri: 'Kerala', manjeshwar: 'Kerala', 
  /* Uttar Pradesh */ manjhanpur: 'Uttar Pradesh', 
  /* Chhattisgarh */ manjhi: 'Chhattisgarh', 
  /* Assam */ mankachar: 'Assam', 
  /* Punjab */ mans: 'Punjab', 
  /* Bihar */ mansurchak: 'Bihar', 
  /* Karnataka */ manvi: 'Karnataka', 
  /* Goa */ mapus: 'Goa', margao: 'Goa', 
  /* Assam */ margherit: 'Assam', 
  /* West Bengal */ margram: 'West Bengal', 
  /* Assam */ marigaon: 'Assam', 
  /* Andhra Pradesh */ markapur: 'Andhra Pradesh', markapuram: 'Andhra Pradesh', 
  /* Rajasthan */ marwar: 'Rajasthan', marwarjunction: 'Rajasthan', 
  /* Bihar */ masaurhi: 'Bihar', 
  /* Karnataka */ maski: 'Karnataka', 
  /* Bihar */ masrakh: 'Bihar', 
  /* Jharkhand */ masu: 'Jharkhand', 
  /* Kerala */ matanur: 'Kerala', 
  /* Uttar Pradesh */ mathur: 'Uttar Pradesh', 
  /* West Bengal */ matigar: 'West Bengal', 
  /* Uttar Pradesh */ mau: 'Uttar Pradesh', 
  /* Madhya Pradesh */ mauganj: 'Madhya Pradesh', 
  /* Uttar Pradesh */ maunathbhanjan: 'Uttar Pradesh', 
  /* Punjab */ maur: 'Punjab', 
  /* Kerala */ mavelikar: 'Kerala', 
  /* Uttar Pradesh */ mawan: 'Uttar Pradesh', 
  /* Meghalaya */ mawkynrew: 'Meghalaya', mawkyrshan: 'Meghalaya', mawkyrwat: 'Meghalaya', 
  /* Andaman and Nicobar */ mayabunder: 'Andaman and Nicobar', 
  /* Tamil Nadu */ mayiladuthurai: 'Tamil Nadu', 
  /* Odisha */ mayurbhanj: 'Odisha', 
  /* Arunachal Pradesh */ mechuk: 'Arunachal Pradesh', 
  /* Telangana */ medak: 'Telangana', medchal: 'Telangana', 
  /* West Bengal */ medinipur: 'West Bengal', 
  /* Arunachal Pradesh */ mehao: 'Arunachal Pradesh', 
  /* Bihar */ mehdawal: 'Bihar', 
  /* Uttar Pradesh */ mehnagar: 'Uttar Pradesh', mehoni: 'Uttar Pradesh', 
  /* Gujarat */ mehsan: 'Gujarat', 
  /* Uttar Pradesh */ mej: 'Uttar Pradesh', 
  /* West Bengal */ meji: 'West Bengal', 
  /* Sikkim */ meli: 'Sikkim', 
  /* Tamil Nadu */ melur: 'Tamil Nadu', 
  /* Nagaland */ meluri: 'Nagaland', 
  /* West Bengal */ memari: 'West Bengal', 
  /* Gujarat */ mendard: 'Gujarat', 
  /* Uttar Pradesh */ merut: 'Uttar Pradesh', 
  /* Telangana */ metpali: 'Telangana', 
  /* Tamil Nadu */ metupalayam: 'Tamil Nadu', metur: 'Tamil Nadu', 
  /* West Bengal */ midnapore: 'West Bengal', 
  /* Maharashtra */ miraj: 'Maharashtra', mirbhayandar: 'Maharashtra', 
  /* Uttar Pradesh */ mirganj: 'Uttar Pradesh', mirzapur: 'Uttar Pradesh', misrikh: 'Uttar Pradesh', 
  /* Gujarat */ modas: 'Gujarat', 
  /* Uttar Pradesh */ modipuram: 'Uttar Pradesh', 
  /* Punjab */ mog: 'Punjab', 
  /* Andhra Pradesh */ mogalthuru: 'Andhra Pradesh', 
  /* Telangana */ mogudapali: 'Telangana', 
  /* Punjab */ mohali: 'Punjab', 
  /* Uttar Pradesh */ mohanlalganj: 'Uttar Pradesh', 
  /* Bihar */ mohiudinagar: 'Bihar', 
  /* Chhattisgarh */ mohl: 'Chhattisgarh', mohlmanpurambagarhchowki: 'Chhattisgarh', 
  /* Nagaland */ mokokchung: 'Nagaland', 
  /* Karnataka */ molakalmuru: 'Karnataka', 
  /* Telangana */ mominpur: 'Telangana', 
  /* Nagaland */ mon: 'Nagaland', 
  /* Uttar Pradesh */ moradabad: 'Uttar Pradesh', 
  /* Assam */ moran: 'Assam', 
  /* Gujarat */ morbi: 'Gujarat', 
  /* Madhya Pradesh */ moren: 'Madhya Pradesh', 
  /* Assam */ morigaon: 'Assam', 
  /* Telangana */ mothkur: 'Telangana', 
  /* Bihar */ motihari: 'Bihar', 
  /* Punjab */ mukerian: 'Punjab', muktsar: 'Punjab', 
  /* Karnataka */ mulbagal: 'Karnataka', 
  /* Telangana */ mulugu: 'Telangana', 
  /* Maharashtra */ mumbai: 'Maharashtra', mumbaicity: 'Maharashtra', mumbaisuburban: 'Maharashtra', 
  /* Karnataka */ mundgod: 'Karnataka', 
  /* Gujarat */ mundr: 'Gujarat', 
  /* Chhattisgarh */ mungeli: 'Chhattisgarh', 
  /* Bihar */ munger: 'Bihar', 
  /* West Bengal */ murarai: 'West Bengal', murshidabad: 'West Bengal', 
  /* Bihar */ mushahri: 'Bihar', 
  /* Assam */ mushalpur: 'Assam', 
  /* Tamil Nadu */ musiri: 'Tamil Nadu', 
  /* Uttarakhand */ musorie: 'Uttarakhand', 
  /* Tamil Nadu */ muthupet: 'Tamil Nadu', 
  /* Kerala */ muvatupuzh: 'Kerala', 
  /* Uttar Pradesh */ muzafarnagar: 'Uttar Pradesh', 
  /* Bihar */ muzafarpur: 'Bihar', 
  /* Andhra Pradesh */ mylavaram: 'Andhra Pradesh', 
  /* Karnataka */ mysore: 'Karnataka', mysuru: 'Karnataka', 
  /* Odisha */ nabarangpur: 'Odisha', 
  /* Punjab */ nabh: 'Punjab', 
  /* West Bengal */ nadi: 'West Bengal', 
  /* Gujarat */ nadiad: 'Gujarat', 
  /* Karnataka */ nagamangal: 'Karnataka', 
  /* Assam */ nagaon: 'Assam', 
  /* Tamil Nadu */ nagapatinam: 'Tamil Nadu', 
  /* Andhra Pradesh */ nagari: 'Andhra Pradesh', 
  /* Telangana */ nagarkurnol: 'Telangana', 
  /* Rajasthan */ nagaur: 'Rajasthan', 
  /* Tamil Nadu */ nagercoil: 'Tamil Nadu', 
  /* Uttar Pradesh */ nagin: 'Uttar Pradesh', nagl: 'Uttar Pradesh', 
  /* Tamil Nadu */ nagore: 'Tamil Nadu', 
  /* Maharashtra */ nagpur: 'Maharashtra', 
  /* Himachal Pradesh */ nahan: 'Himachal Pradesh', 
  /* Assam */ naharkati: 'Assam', 
  /* Arunachal Pradesh */ naharlagun: 'Arunachal Pradesh', 
  /* Uttarakhand */ nainital: 'Uttarakhand', 
  /* Gujarat */ nakhatran: 'Gujarat', 
  /* Punjab */ nakodar: 'Punjab', 
  /* Bihar */ naland: 'Bihar', 
  /* Maharashtra */ nalasopar: 'Maharashtra', 
  /* Assam */ nalbari: 'Assam', 
  /* Telangana */ nalgond: 'Telangana', 
  /* West Bengal */ nalhati: 'West Bengal', 
  /* Tamil Nadu */ namakal: 'Tamil Nadu', 
  /* Sikkim */ namchi: 'Sikkim', 
  /* Arunachal Pradesh */ namsai: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ nandalur: 'Andhra Pradesh', 
  /* Maharashtra */ nanded: 'Maharashtra', 
  /* West Bengal */ nandigram: 'West Bengal', 
  /* Delhi */ nandnagri: 'Delhi', 
  /* Maharashtra */ nandurbar: 'Maharashtra', 
  /* Andhra Pradesh */ nandyal: 'Andhra Pradesh', 
  /* Punjab */ nangal: 'Punjab', 
  /* Tamil Nadu */ nanguneri: 'Tamil Nadu', nanilam: 'Tamil Nadu', 
  /* Karnataka */ nanjangud: 'Karnataka', 
  /* Arunachal Pradesh */ napangphung: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ narakapatnam: 'Andhra Pradesh', narasampet: 'Andhra Pradesh', narasaraopet: 'Andhra Pradesh', 
  /* Telangana */ narayanpet: 'Telangana', 
  /* Arunachal Pradesh */ nari: 'Arunachal Pradesh', 
  /* Bihar */ narkatiaganj: 'Bihar', 
  /* Odisha */ narl: 'Odisha', 
  /* Gujarat */ narmad: 'Gujarat', 
  /* Haryana */ narnaul: 'Haryana', narnaund: 'Haryana', 
  /* Telangana */ narsampet: 'Telangana', 
  /* Madhya Pradesh */ narsinghpur: 'Madhya Pradesh', 
  /* Haryana */ narwan: 'Haryana', 
  /* Maharashtra */ nashik: 'Maharashtra', 
  /* Rajasthan */ nasirabad: 'Rajasthan', 
  /* Tamil Nadu */ natham: 'Tamil Nadu', 
  /* Rajasthan */ nathdwar: 'Rajasthan', 
  /* Bihar */ nathnagar: 'Bihar', naugachi: 'Bihar', 
  /* Uttar Pradesh */ naugarh: 'Uttar Pradesh', nautanw: 'Uttar Pradesh', 
  /* Karnataka */ navalgund: 'Karnataka', 
  /* Maharashtra */ navimumbai: 'Maharashtra', 
  /* Gujarat */ navsari: 'Gujarat', 
  /* Bihar */ nawad: 'Bihar', 
  /* Punjab */ nawanshahr: 'Punjab', 
  /* West Bengal */ naxalbari: 'West Bengal', 
  /* Odisha */ nayagarh: 'Odisha', 
  /* Sikkim */ naybazar: 'Sikkim', 
  /* Assam */ nazir: 'Assam', 
  /* Tamil Nadu */ nedamangalam: 'Tamil Nadu', 
  /* Kerala */ nedumkandam: 'Kerala', 
  /* Karnataka */ nelamangal: 'Karnataka', 
  /* Andhra Pradesh */ nelimarl: 'Andhra Pradesh', nelore: 'Andhra Pradesh', 
  /* Madhya Pradesh */ nemuch: 'Madhya Pradesh', 
  /* Tripura */ nepalinagar: 'Tripura', 
  /* Madhya Pradesh */ nepnagar: 'Madhya Pradesh', 
  /* Delhi */ newdelhi: 'Delhi', 
  /* Uttarakhand */ newtehri: 'Uttarakhand', 
  /* Kerala */ neyatinkar: 'Kerala', 
  /* Tamil Nadu */ neyveli: 'Tamil Nadu', 
  /* Uttar Pradesh */ nichlaul: 'Uttar Pradesh', 
  /* Andaman and Nicobar */ nicobar: 'Andaman and Nicobar', 
  /* Andhra Pradesh */ nidadavolu: 'Andhra Pradesh', 
  /* Odisha */ nilagiri: 'Odisha', 
  /* Kerala */ nilambur: 'Kerala', 
  /* Tamil Nadu */ nilgiris: 'Tamil Nadu', 
  /* Odisha */ nimapar: 'Odisha', nimdel: 'Odisha', nindur: 'Odisha', 
  /* Karnataka */ nipani: 'Karnataka', 
  /* Telangana */ nirmal: 'Telangana', 
  /* West Bengal */ nirs: 'West Bengal', 
  /* Nagaland */ niuland: 'Nagaland', 
  /* Madhya Pradesh */ niwari: 'Madhya Pradesh', 
  /* Telangana */ nizamabad: 'Telangana', nizamsagar: 'Telangana', 
  /* Haryana */ nohar: 'Haryana', 
  /* Uttar Pradesh */ noid: 'Uttar Pradesh', 
  /* Nagaland */ noklak: 'Nagaland', 
  /* Manipur */ noney: 'Manipur', 
  /* Meghalaya */ nongpoh: 'Meghalaya', nongstoin: 'Meghalaya', 
  /* Andaman and Nicobar */ northandmidleandaman: 'Andaman and Nicobar', 
  /* Delhi */ northdelhi: 'Delhi', northeastdelhi: 'Delhi', 
  /* Meghalaya */ northgarohils: 'Meghalaya', 
  /* Goa */ northgo: 'Goa', 
  /* Assam */ northlakhimpur: 'Assam', 
  /* Sikkim */ northsikim: 'Sikkim', 
  /* Tripura */ northtripur: 'Tripura', 
  /* Delhi */ northwestdelhi: 'Delhi', 
  /* Andhra Pradesh */ ntr: 'Andhra Pradesh', 
  /* Odisha */ nuapad: 'Odisha', 
  /* Ladakh */ nubr: 'Ladakh', 
  /* Haryana */ nuh: 'Haryana', 
  /* Manipur */ nungb: 'Manipur', 
  /* Himachal Pradesh */ nurpur: 'Himachal Pradesh', 
  /* Ladakh */ nyom: 'Ladakh', 
  /* Tamil Nadu */ odanchatram: 'Tamil Nadu', 
  /* Arunachal Pradesh */ oldziro: 'Arunachal Pradesh', 
  /* Bihar */ olhapur: 'Bihar', 
  /* Gujarat */ olpad: 'Gujarat', 
  /* Kerala */ olur: 'Kerala', 
  /* Tamil Nadu */ omalur: 'Tamil Nadu', 
  /* West Bengal */ ond: 'West Bengal', 
  /* Andhra Pradesh */ ongole: 'Andhra Pradesh', 
  /* Uttar Pradesh */ orai: 'Uttar Pradesh', 
  /* Maharashtra */ oros: 'Maharashtra', 
  /* Rajasthan */ osian: 'Rajasthan', 
  /* Maharashtra */ osmanabad: 'Maharashtra', 
  /* Kerala */ otapalam: 'Kerala', 
  /* Tamil Nadu */ oty: 'Tamil Nadu', 
  /* Puducherry */ ozhukarai: 'Puducherry', 
  /* Odisha */ padampur: 'Odisha', 
  /* Andhra Pradesh */ paderu: 'Andhra Pradesh', 
  /* Gujarat */ padr: 'Gujarat', 
  /* Uttar Pradesh */ padraun: 'Uttar Pradesh', 
  /* Ladakh */ padum: 'Ladakh', 
  /* Jharkhand */ pahari: 'Jharkhand', 
  /* Kerala */ painavu: 'Kerala', 
  /* Arunachal Pradesh */ pakekesang: 'Arunachal Pradesh', 
  /* Jharkhand */ pakur: 'Jharkhand', 
  /* Sikkim */ pakyong: 'Sikkim', 
  /* Kerala */ pal: 'Kerala', 
  /* Andhra Pradesh */ palacole: 'Andhra Pradesh', 
  /* Kerala */ palakad: 'Kerala', 
  /* Andhra Pradesh */ palamaner: 'Andhra Pradesh', 
  /* Himachal Pradesh */ palampur: 'Himachal Pradesh', 
  /* Jharkhand */ palamu: 'Jharkhand', 
  /* Tamil Nadu */ palani: 'Tamil Nadu', 
  /* Gujarat */ palanpur: 'Gujarat', 
  /* Tamil Nadu */ palapati: 'Tamil Nadu', 
  /* Andhra Pradesh */ palas: 'Andhra Pradesh', 
  /* Tamil Nadu */ palavaram: 'Tamil Nadu', 
  /* Maharashtra */ palghar: 'Maharashtra', 
  /* Rajasthan */ pali: 'Rajasthan', 
  /* Bihar */ paliganj: 'Bihar', 
  /* Arunachal Pradesh */ palin: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ palnadu: 'Andhra Pradesh', 
  /* Telangana */ palvonch: 'Telangana', 
  /* Haryana */ palwal: 'Haryana', 
  /* Madhya Pradesh */ pan: 'Madhya Pradesh', 
  /* West Bengal */ panagarh: 'West Bengal', 
  /* Goa */ panaji: 'Goa', 
  /* Haryana */ panchkul: 'Haryana', 
  /* West Bengal */ panchl: 'West Bengal', 
  /* Gujarat */ panchmahal: 'Gujarat', 
  /* Karnataka */ pandavapur: 'Karnataka', 
  /* Maharashtra */ pandharpur: 'Maharashtra', 
  /* Madhya Pradesh */ pandhurn: 'Madhya Pradesh', 
  /* Chhattisgarh */ pandri: 'Chhattisgarh', 
  /* Arunachal Pradesh */ pangin: 'Arunachal Pradesh', 
  /* Haryana */ panipat: 'Haryana', 
  /* Goa */ panjim: 'Goa', 
  /* Tamil Nadu */ panruti: 'Tamil Nadu', 
  /* West Bengal */ panskur: 'West Bengal', 
  /* Maharashtra */ panvel: 'Maharashtra', 
  /* Tamil Nadu */ papanasam: 'Tamil Nadu', 
  /* Arunachal Pradesh */ papumpare: 'Arunachal Pradesh', 
  /* Odisha */ paralakhemundi: 'Odisha', 
  /* Rajasthan */ parbatsar: 'Rajasthan', 
  /* Maharashtra */ parbhani: 'Maharashtra', 
  /* Jharkhand */ parsori: 'Jharkhand', 
  /* Andhra Pradesh */ parvathipuram: 'Andhra Pradesh', parvathipuramanyam: 'Andhra Pradesh', 
  /* Himachal Pradesh */ parwano: 'Himachal Pradesh', 
  /* West Bengal */ paschimbardhaman: 'West Bengal', paschimedinipur: 'West Bengal', 
  /* Arunachal Pradesh */ pasighat: 'Arunachal Pradesh', 
  /* Kerala */ patambi: 'Kerala', 
  /* Odisha */ patamundai: 'Odisha', 
  /* Gujarat */ patan: 'Gujarat', 
  /* Telangana */ patancheru: 'Telangana', 
  /* Chhattisgarh */ patanjli: 'Chhattisgarh', 
  /* West Bengal */ patashpur: 'West Bengal', 
  /* Haryana */ pataudi: 'Haryana', 
  /* Chhattisgarh */ pathalgaon: 'Chhattisgarh', 
  /* Kerala */ pathanamthit: 'Kerala', pathanapuram: 'Kerala', 
  /* Punjab */ pathankot: 'Punjab', 
  /* Assam */ pathsal: 'Assam', 
  /* Punjab */ patial: 'Punjab', 
  /* Bihar */ patn: 'Bihar', 
  /* Odisha */ patnagarh: 'Odisha', 
  /* Tamil Nadu */ patukotai: 'Tamil Nadu', 
  /* Uttarakhand */ pauri: 'Uttarakhand', paurigarhwal: 'Uttarakhand', 
  /* Kerala */ payanur: 'Kerala', pazhayangadi: 'Kerala', 
  /* Telangana */ pedapali: 'Telangana', 
  /* Haryana */ pehow: 'Haryana', 
  /* Chhattisgarh */ pendr: 'Chhattisgarh', 
  /* Andhra Pradesh */ penugond: 'Andhra Pradesh', penukond: 'Andhra Pradesh', penumaru: 'Andhra Pradesh', 
  /* Tamil Nadu */ perambalur: 'Tamil Nadu', 
  /* Kerala */ perambr: 'Kerala', 
  /* Tamil Nadu */ peravurani: 'Tamil Nadu', 
  /* Nagaland */ peren: 'Nagaland', 
  /* Kerala */ peringotur: 'Kerala', perinthalman: 'Kerala', perumedu: 'Kerala', 
  /* Tamil Nadu */ perundurai: 'Tamil Nadu', 
  /* Bihar */ peshar: 'Bihar', 
  /* Nagaland */ pfutsero: 'Nagaland', 
  /* Punjab */ phagwar: 'Punjab', 
  /* Rajasthan */ phalodi: 'Rajasthan', 
  /* West Bengal */ phansidew: 'West Bengal', 
  /* Nagaland */ phek: 'Nagaland', 
  /* Manipur */ pherzawl: 'Manipur', 
  /* Odisha */ phulbani: 'Odisha', 
  /* Assam */ phulbari: 'Assam', 
  /* Bihar */ phulparas: 'Bihar', 
  /* Uttar Pradesh */ phulpur: 'Uttar Pradesh', 
  /* Bihar */ phulwari: 'Bihar', 
  /* Madhya Pradesh */ pichore: 'Madhya Pradesh', 
  /* Andhra Pradesh */ pidugural: 'Andhra Pradesh', pileru: 'Andhra Pradesh', 
  /* Uttar Pradesh */ pilibhit: 'Uttar Pradesh', 
  /* Maharashtra */ pimprichinchwad: 'Maharashtra', 
  /* Uttar Pradesh */ pindr: 'Uttar Pradesh', 
  /* Rajasthan */ pindwar: 'Rajasthan', 
  /* West Bengal */ pingl: 'West Bengal', 
  /* Madhya Pradesh */ pipariy: 'Madhya Pradesh', 
  /* Odisha */ pipili: 'Odisha', 
  /* Madhya Pradesh */ pipod: 'Madhya Pradesh', 
  /* Jharkhand */ pipr: 'Jharkhand', 
  /* Uttar Pradesh */ pipraich: 'Uttar Pradesh', 
  /* Bihar */ piprasi: 'Bihar', 
  /* Delhi */ pitampur: 'Delhi', 
  /* Andhra Pradesh */ pithapuram: 'Andhra Pradesh', 
  /* Uttarakhand */ pithoragarh: 'Uttarakhand', 
  /* Rajasthan */ pokaran: 'Rajasthan', 
  /* Tamil Nadu */ polachi: 'Tamil Nadu', 
  /* Odisha */ polasar: 'Odisha', 
  /* Andhra Pradesh */ polavaram: 'Andhra Pradesh', 
  /* Tamil Nadu */ polur: 'Tamil Nadu', pompuhar: 'Tamil Nadu', ponamale: 'Tamil Nadu', 
  /* Jammu & Kashmir */ ponch: 'Jammu & Kashmir', 
  /* Goa */ pond: 'Goa', 
  /* Puducherry */ pondichery: 'Puducherry', 
  /* Andhra Pradesh */ ponduru: 'Andhra Pradesh', 
  /* Kerala */ ponjar: 'Kerala', 
  /* Andhra Pradesh */ ponur: 'Andhra Pradesh', 
  /* Gujarat */ porbandar: 'Gujarat', 
  /* Manipur */ porompat: 'Manipur', 
  /* Andaman and Nicobar */ portblair: 'Andaman and Nicobar', 
  /* West Bengal */ potashpur: 'West Bengal', 
  /* Jharkhand */ potk: 'Jharkhand', 
  /* Uttar Pradesh */ powayan: 'Uttar Pradesh', 
  /* Andhra Pradesh */ prakasam: 'Andhra Pradesh', 
  /* Bihar */ pranpur: 'Bihar', 
  /* Gujarat */ prantij: 'Gujarat', 
  /* Rajasthan */ pratapgarhraj: 'Rajasthan', 
  /* Chhattisgarh */ pratapur: 'Chhattisgarh', 
  /* Uttar Pradesh */ prayagraj: 'Uttar Pradesh', 
  /* Delhi */ pretvihar: 'Delhi', 
  /* Andhra Pradesh */ prodatur: 'Andhra Pradesh', 
  /* Puducherry */ puduchery: 'Puducherry', 
  /* Tamil Nadu */ pudukotai: 'Tamil Nadu', 
  /* Andhra Pradesh */ pulivendl: 'Andhra Pradesh', 
  /* Telangana */ pulkal: 'Telangana', 
  /* Jammu & Kashmir */ pulwam: 'Jammu & Kashmir', 
  /* Kerala */ punalur: 'Kerala', 
  /* Maharashtra */ pune: 'Maharashtra', 
  /* Delhi */ punjabibagh: 'Delhi', 
  /* West Bengal */ purbardhaman: 'West Bengal', purbmedinipur: 'West Bengal', 
  /* Odisha */ puri: 'Odisha', 
  /* Bihar */ purni: 'Bihar', 
  /* West Bengal */ puruli: 'West Bengal', 
  /* Odisha */ purushotampur: 'Odisha', 
  /* Andhra Pradesh */ putaparthi: 'Andhra Pradesh', 
  /* Meghalaya */ pynursl: 'Meghalaya', 
  /* Goa */ quepem: 'Goa', 
  /* Kerala */ quilon: 'Kerala', 
  /* Karnataka */ rabkavi: 'Karnataka', 
  /* Gujarat */ radhanpur: 'Gujarat', 
  /* Uttar Pradesh */ raebareli: 'Uttar Pradesh', 
  /* Arunachal Pradesh */ rag: 'Arunachal Pradesh', 
  /* West Bengal */ raghunathpur: 'West Bengal', 
  /* Karnataka */ raichur: 'Karnataka', 
  /* Maharashtra */ raigad: 'Maharashtra', 
  /* West Bengal */ raiganj: 'West Bengal', 
  /* Chhattisgarh */ raigarh: 'Chhattisgarh', 
  /* Odisha */ railank: 'Odisha', 
  /* Chhattisgarh */ raipur: 'Chhattisgarh', 
  /* Madhya Pradesh */ raisen: 'Madhya Pradesh', 
  /* Andhra Pradesh */ rajahmundry: 'Andhra Pradesh', rajamahendravaram: 'Andhra Pradesh', rajampet: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ rajanpur: 'Jammu & Kashmir', 
  /* Telangana */ rajansircil: 'Telangana', 
  /* Tamil Nadu */ rajapalayam: 'Tamil Nadu', 
  /* Uttar Pradesh */ rajauli: 'Uttar Pradesh', 
  /* Jammu & Kashmir */ rajauri: 'Jammu & Kashmir', 
  /* Madhya Pradesh */ rajgarh: 'Madhya Pradesh', 
  /* Bihar */ rajgir: 'Bihar', 
  /* Gujarat */ rajkot: 'Gujarat', 
  /* Rajasthan */ rajlamni: 'Rajasthan', 
  /* Jharkhand */ rajnagar: 'Jharkhand', 
  /* Chhattisgarh */ rajnandgaon: 'Chhattisgarh', 
  /* Jammu & Kashmir */ rajouri: 'Jammu & Kashmir', 
  /* Delhi */ rajourigarden: 'Delhi', 
  /* Gujarat */ rajpipl: 'Gujarat', 
  /* Rajasthan */ rajsamand: 'Rajasthan', 
  /* Odisha */ ramachandrapur: 'Odisha', 
  /* Telangana */ ramagundam: 'Telangana', 
  /* Karnataka */ ramanagar: 'Karnataka', 
  /* Tamil Nadu */ ramanathapuram: 'Tamil Nadu', 
  /* Andhra Pradesh */ ramarugu: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ ramban: 'Jammu & Kashmir', 
  /* Tamil Nadu */ rameswaram: 'Tamil Nadu', 
  /* Jharkhand */ ramgarh: 'Jharkhand', 
  /* Andhra Pradesh */ rampachodavaram: 'Andhra Pradesh', 
  /* Uttar Pradesh */ rampur: 'Uttar Pradesh', 
  /* West Bengal */ rampurhat: 'West Bengal', 
  /* Punjab */ rampurphul: 'Punjab', 
  /* Rajasthan */ ramsan: 'Rajasthan', 
  /* West Bengal */ ranaghat: 'West Bengal', 
  /* Jharkhand */ ranchi: 'Jharkhand', 
  /* Karnataka */ ranebenur: 'Karnataka', 
  /* Assam */ rangapar: 'Assam', rangi: 'Assam', 
  /* Sikkim */ rangpo: 'Sikkim', 
  /* Telangana */ rangredy: 'Telangana', 
  /* West Bengal */ raniganj: 'West Bengal', 
  /* Tamil Nadu */ ranipet: 'Tamil Nadu', ranipetai: 'Tamil Nadu', 
  /* Odisha */ ranipur: 'Odisha', 
  /* Gujarat */ ranpur: 'Gujarat', rapar: 'Gujarat', 
  /* Andhra Pradesh */ raptadu: 'Andhra Pradesh', 
  /* Tamil Nadu */ rasipur: 'Tamil Nadu', 
  /* Rajasthan */ rath: 'Rajasthan', 
  /* Madhya Pradesh */ ratlam: 'Madhya Pradesh', 
  /* Maharashtra */ ratnagiri: 'Maharashtra', 
  /* Jharkhand */ ratu: 'Jharkhand', 
  /* Bihar */ raxaul: 'Bihar', 
  /* Andhra Pradesh */ rayachoti: 'Andhra Pradesh', rayadurg: 'Andhra Pradesh', 
  /* Odisha */ rayagad: 'Odisha', 
  /* Andhra Pradesh */ razole: 'Andhra Pradesh', 
  /* Jammu & Kashmir */ reasi: 'Jammu & Kashmir', 
  /* Himachal Pradesh */ reckongpeo: 'Himachal Pradesh', 
  /* Madhya Pradesh */ rehli: 'Madhya Pradesh', 
  /* Odisha */ remun: 'Odisha', 
  /* Andhra Pradesh */ repale: 'Andhra Pradesh', 
  /* Meghalaya */ resubelpar: 'Meghalaya', 
  /* Madhya Pradesh */ rew: 'Madhya Pradesh', 
  /* Haryana */ rewari: 'Haryana', 
  /* Meghalaya */ ribhoi: 'Meghalaya', 
  /* Sikkim */ rinchenpong: 'Sikkim', 
  /* Uttarakhand */ rishikesh: 'Uttarakhand', 
  /* Uttar Pradesh */ robertsganj: 'Uttar Pradesh', 
  /* Delhi */ rohini: 'Delhi', 
  /* Haryana */ rohtak: 'Haryana', 
  /* Bihar */ rohtas: 'Bihar', 
  /* Arunachal Pradesh */ roing: 'Arunachal Pradesh', 
  /* Uttarakhand */ rorke: 'Uttarakhand', 
  /* Bihar */ roser: 'Bihar', 
  /* Odisha */ rourkel: 'Odisha', 
  /* Uttarakhand */ rudraprayag: 'Uttarakhand', rudrapur: 'Uttarakhand', 
  /* Punjab */ rupnagar: 'Punjab', 
  /* Odisha */ rups: 'Odisha', 
  /* Gujarat */ sabarkanth: 'Gujarat', 
  /* Bihar */ sabour: 'Bihar', 
  /* Uttar Pradesh */ sadabad: 'Uttar Pradesh', 
  /* Delhi */ sadarbazar: 'Delhi', 
  /* Assam */ sadiy: 'Assam', 
  /* Rajasthan */ sadri: 'Rajasthan', 
  /* Uttar Pradesh */ sahanpur: 'Uttar Pradesh', saharanpur: 'Uttar Pradesh', 
  /* Bihar */ sahars: 'Bihar', 
  /* Uttar Pradesh */ sahaswan: 'Uttar Pradesh', 
  /* Jharkhand */ sahebganj: 'Jharkhand', 
  /* Punjab */ sahibzadajitsinghnagar: 'Punjab', sahnewal: 'Punjab', 
  /* Uttar Pradesh */ saidpur: 'Uttar Pradesh', 
  /* Mizoram */ saih: 'Mizoram', 
  /* Manipur */ saikol: 'Manipur', 
  /* West Bengal */ sainthi: 'West Bengal', 
  /* Mizoram */ saitual: 'Mizoram', 
  /* Chhattisgarh */ saj: 'Chhattisgarh', 
  /* Delhi */ saket: 'Delhi', 
  /* Karnataka */ sakleshpur: 'Karnataka', 
  /* Chhattisgarh */ sakti: 'Chhattisgarh', 
  /* Tamil Nadu */ salem: 'Tamil Nadu', 
  /* West Bengal */ saltor: 'West Bengal', 
  /* Rajasthan */ salumbar: 'Rajasthan', 
  /* Punjab */ saman: 'Punjab', 
  /* Bihar */ samastipur: 'Bihar', 
  /* Jammu & Kashmir */ samb: 'Jammu & Kashmir', 
  /* Odisha */ sambalpur: 'Odisha', 
  /* Uttar Pradesh */ sambhal: 'Uttar Pradesh', 
  /* Chhattisgarh */ samri: 'Chhattisgarh', 
  /* Gujarat */ sanand: 'Gujarat', 
  /* Rajasthan */ sanchore: 'Rajasthan', 
  /* Uttar Pradesh */ sandil: 'Uttar Pradesh', 
  /* Karnataka */ sandur: 'Karnataka', 
  /* Telangana */ sangaredy: 'Telangana', 
  /* Maharashtra */ sangli: 'Maharashtra', 
  /* Punjab */ sangrur: 'Punjab', 
  /* Goa */ sanguem: 'Goa', 
  /* Tamil Nadu */ sankagiri: 'Tamil Nadu', 
  /* Assam */ sankardevnagar: 'Assam', 
  /* West Bengal */ sankrail: 'West Bengal', 
  /* Goa */ sanquelim: 'Goa', 
  /* Gujarat */ santhali: 'Gujarat', 
  /* Uttar Pradesh */ santkabirnagar: 'Uttar Pradesh', 
  /* Madhya Pradesh */ sanwer: 'Madhya Pradesh', 
  /* Rajasthan */ sarad: 'Rajasthan', 
  /* Jharkhand */ saraikel: 'Jharkhand', 
  /* Chhattisgarh */ saraipali: 'Chhattisgarh', 
  /* Bihar */ saran: 'Bihar', 
  /* Chhattisgarh */ sarangarh: 'Chhattisgarh', sarangarhbilaigarh: 'Chhattisgarh', 
  /* Jharkhand */ sarath: 'Jharkhand', 
  /* Uttar Pradesh */ sardhan: 'Uttar Pradesh', 
  /* Rajasthan */ sardulgarh: 'Rajasthan', 
  /* Uttar Pradesh */ sarnath: 'Uttar Pradesh', 
  /* Bihar */ sasaram: 'Bihar', 
  /* Uttar Pradesh */ sasni: 'Uttar Pradesh', 
  /* Maharashtra */ satar: 'Maharashtra', 
  /* Goa */ satari: 'Goa', 
  /* Andhra Pradesh */ satenapale: 'Andhra Pradesh', 
  /* Tamil Nadu */ sathankulam: 'Tamil Nadu', 
  /* Madhya Pradesh */ satn: 'Madhya Pradesh', 
  /* Tamil Nadu */ satur: 'Tamil Nadu', 
  /* Rajasthan */ sawaimadhopur: 'Rajasthan', 
  /* Gujarat */ sayl: 'Gujarat', 
  /* Telangana */ secunderabad: 'Telangana', 
  /* Karnataka */ sedam: 'Karnataka', 
  /* Madhya Pradesh */ sehore: 'Madhya Pradesh', 
  /* Delhi */ selampur: 'Delhi', 
  /* Manipur */ senapati: 'Manipur', 
  /* Madhya Pradesh */ seoni: 'Madhya Pradesh', 
  /* Arunachal Pradesh */ sep: 'Arunachal Pradesh', 
  /* Tripura */ sepahijal: 'Tripura', 
  /* Jharkhand */ seraikel: 'Jharkhand', seraikelkharsawan: 'Jharkhand', 
  /* Mizoram */ serchip: 'Mizoram', 
  /* Uttar Pradesh */ shahabad: 'Uttar Pradesh', 
  /* Delhi */ shahdar: 'Delhi', 
  /* Madhya Pradesh */ shahdol: 'Madhya Pradesh', 
  /* Uttar Pradesh */ shahganj: 'Uttar Pradesh', 
  /* Punjab */ shahidbhagatsinghnagar: 'Punjab', 
  /* Uttar Pradesh */ shahjahanpur: 'Uttar Pradesh', 
  /* Punjab */ shahkot: 'Punjab', 
  /* Rajasthan */ shahpur: 'Rajasthan', 
  /* Madhya Pradesh */ shajapur: 'Madhya Pradesh', 
  /* Ladakh */ sham: 'Ladakh', 
  /* Nagaland */ shamator: 'Nagaland', 
  /* Telangana */ shamirpet: 'Telangana', 
  /* Uttar Pradesh */ shamli: 'Uttar Pradesh', 
  /* Meghalaya */ shangpung: 'Meghalaya', 
  /* Telangana */ shankarampali: 'Telangana', 
  /* Bihar */ sheikhpur: 'Bihar', sheohar: 'Bihar', 
  /* Madhya Pradesh */ sheopur: 'Madhya Pradesh', 
  /* Bihar */ sherghati: 'Bihar', 
  /* West Bengal */ shibpur: 'West Bengal', 
  /* Karnataka */ shikaripur: 'Karnataka', 
  /* Meghalaya */ shilong: 'Meghalaya', 
  /* Himachal Pradesh */ shiml: 'Himachal Pradesh', 
  /* Karnataka */ shimog: 'Karnataka', 
  /* Maharashtra */ shirdi: 'Maharashtra', 
  /* Karnataka */ shivamog: 'Karnataka', 
  /* Madhya Pradesh */ shivpuri: 'Madhya Pradesh', 
  /* Arunachal Pradesh */ shiyomi: 'Arunachal Pradesh', 
  /* Tamil Nadu */ sholinganalur: 'Tamil Nadu', 
  /* Jammu & Kashmir */ shopian: 'Jammu & Kashmir', 
  /* Karnataka */ shorapur: 'Karnataka', 
  /* Kerala */ shornur: 'Kerala', 
  /* Uttar Pradesh */ shravasti: 'Uttar Pradesh', 
  /* Mizoram */ siah: 'Mizoram', 
  /* Arunachal Pradesh */ siang: 'Arunachal Pradesh', 
  /* Assam */ sibsagar: 'Assam', 
  /* Karnataka */ sidapur: 'Karnataka', 
  /* Uttar Pradesh */ sidharthnagar: 'Uttar Pradesh', 
  /* Madhya Pradesh */ sidhi: 'Madhya Pradesh', 
  /* Gujarat */ sidhpur: 'Gujarat', 
  /* Telangana */ sidipet: 'Telangana', 
  /* Karnataka */ sidlaghat: 'Karnataka', 
  /* Madhya Pradesh */ sihor: 'Madhya Pradesh', 
  /* Uttar Pradesh */ sikandr: 'Uttar Pradesh', sikandrabad: 'Uttar Pradesh', 
  /* Rajasthan */ sikar: 'Rajasthan', 
  /* Bihar */ sikele: 'Bihar', silao: 'Bihar', 
  /* Assam */ silchar: 'Assam', 
  /* Jharkhand */ sili: 'Jharkhand', 
  /* West Bengal */ siliguri: 'West Bengal', 
  /* Dadra & Nagar Haveli and Daman & Diu */ silvas: 'Dadra & Nagar Haveli and Daman & Diu', 
  /* Madhya Pradesh */ silwani: 'Madhya Pradesh', 
  /* Jharkhand */ simdeg: 'Jharkhand', 
  /* Chhattisgarh */ simg: 'Chhattisgarh', 
  /* Andhra Pradesh */ simhadripuram: 'Andhra Pradesh', 
  /* Bihar */ simri: 'Bihar', 
  /* Karnataka */ sindhnur: 'Karnataka', 
  /* Maharashtra */ sindhudurg: 'Maharashtra', 
  /* Manipur */ singd: 'Manipur', 
  /* Bihar */ singhwar: 'Bihar', 
  /* Rajasthan */ singr: 'Rajasthan', 
  /* Madhya Pradesh */ singrauli: 'Madhya Pradesh', 
  /* Sikkim */ singtam: 'Sikkim', 
  /* Tripura */ sipahijal: 'Tripura', 
  /* Karnataka */ sir: 'Karnataka', 
  /* Uttar Pradesh */ sirathu: 'Uttar Pradesh', 
  /* Telangana */ sircil: 'Telangana', 
  /* Tamil Nadu */ sirkali: 'Tamil Nadu', 
  /* Himachal Pradesh */ sirmaur: 'Himachal Pradesh', 
  /* Rajasthan */ sirohi: 'Rajasthan', 
  /* Madhya Pradesh */ sironj: 'Madhya Pradesh', 
  /* Haryana */ sirs: 'Haryana', 
  /* Karnataka */ sirsi: 'Karnataka', 
  /* Uttar Pradesh */ sirsingan: 'Uttar Pradesh', 
  /* Bihar */ sitamarhi: 'Bihar', 
  /* Uttar Pradesh */ sitapur: 'Uttar Pradesh', 
  /* Uttarakhand */ sitarganj: 'Uttarakhand', 
  /* Tamil Nadu */ sivagang: 'Tamil Nadu', sivagangai: 'Tamil Nadu', sivakasi: 'Tamil Nadu', 
  /* Assam */ sivasagar: 'Assam', 
  /* Bihar */ siwan: 'Bihar', 
  /* Uttar Pradesh */ siyan: 'Uttar Pradesh', 
  /* Rajasthan */ siyu: 'Rajasthan', 
  /* Madhya Pradesh */ sohagpur: 'Madhya Pradesh', 
  /* Haryana */ sohn: 'Haryana', 
  /* Meghalaya */ sohr: 'Meghalaya', 
  /* Rajasthan */ sojat: 'Rajasthan', 
  /* Gujarat */ sojitr: 'Gujarat', 
  /* Himachal Pradesh */ solan: 'Himachal Pradesh', 
  /* Maharashtra */ solapur: 'Maharashtra', 
  /* Assam */ sonai: 'Assam', 
  /* Tripura */ sonamur: 'Tripura', 
  /* Assam */ sonari: 'Assam', 
  /* Uttar Pradesh */ sonbhadr: 'Uttar Pradesh', 
  /* Bihar */ sonepur: 'Bihar', 
  /* Haryana */ sonipat: 'Haryana', 
  /* Assam */ sonitpur: 'Assam', 
  /* Bihar */ sonpur: 'Bihar', 
  /* Jammu & Kashmir */ sopore: 'Jammu & Kashmir', 
  /* Karnataka */ sorab: 'Karnataka', 
  /* Uttar Pradesh */ soraon: 'Uttar Pradesh', 
  /* Sikkim */ soreng: 'Sikkim', 
  /* Odisha */ soro: 'Odisha', 
  /* Andaman and Nicobar */ southandaman: 'Andaman and Nicobar', 
  /* Delhi */ southdelhi: 'Delhi', southeastdelhi: 'Delhi', 
  /* Meghalaya */ southgarohils: 'Meghalaya', 
  /* Goa */ southgo: 'Goa', 
  /* Assam */ southsalmar: 'Assam', southsalmarmankachar: 'Assam', 
  /* Sikkim */ southsikim: 'Sikkim', 
  /* Tripura */ southtripur: 'Tripura', 
  /* Delhi */ southwestdelhi: 'Delhi', 
  /* Meghalaya */ southwestgarohils: 'Meghalaya', southwestkhasihils: 'Meghalaya', 
  /* Rajasthan */ sriganganagar: 'Rajasthan', 
  /* Andhra Pradesh */ srikakulam: 'Andhra Pradesh', srikalahasti: 'Andhra Pradesh', 
  /* Punjab */ srimuktsarsahib: 'Punjab', 
  /* Jammu & Kashmir */ srinagar: 'Jammu & Kashmir', 
  /* Karnataka */ srinivaspur: 'Karnataka', 
  /* Tamil Nadu */ sriperumbudur: 'Tamil Nadu', 
  /* Karnataka */ srirangapatn: 'Karnataka', 
  /* Andhra Pradesh */ srisathysai: 'Andhra Pradesh', 
  /* Odisha */ subarnapur: 'Odisha', 
  /* West Bengal */ subarnarekh: 'West Bengal', 
  /* Chhattisgarh */ sukm: 'Chhattisgarh', 
  /* Karnataka */ suli: 'Karnataka', 
  /* Telangana */ sultanabad: 'Telangana', 
  /* Kerala */ sultanbathery: 'Kerala', 
  /* Uttar Pradesh */ sultanpur: 'Uttar Pradesh', 
  /* Tamil Nadu */ sulur: 'Tamil Nadu', 
  /* Andhra Pradesh */ sulurupet: 'Andhra Pradesh', 
  /* Rajasthan */ sumerpur: 'Rajasthan', 
  /* Odisha */ sundargarh: 'Odisha', sundergarh: 'Odisha', 
  /* Himachal Pradesh */ sundernagar: 'Himachal Pradesh', 
  /* Karnataka */ sup: 'Karnataka', 
  /* Bihar */ supaul: 'Bihar', 
  /* Chhattisgarh */ surajpur: 'Chhattisgarh', 
  /* Gujarat */ surat: 'Gujarat', surendranagar: 'Gujarat', 
  /* Chhattisgarh */ surguj: 'Chhattisgarh', 
  /* West Bengal */ suri: 'West Bengal', 
  /* Telangana */ suryapet: 'Telangana', 
  /* Madhya Pradesh */ susner: 'Madhya Pradesh', 
  /* Meghalaya */ sutng: 'Meghalaya', 
  /* Andhra Pradesh */ tad: 'Andhra Pradesh', tadepaligudem: 'Andhra Pradesh', tadipatri: 'Andhra Pradesh', 
  /* Madhya Pradesh */ taghrapur: 'Madhya Pradesh', 
  /* Gujarat */ talaj: 'Gujarat', 
  /* Andhra Pradesh */ talapak: 'Andhra Pradesh', 
  /* Odisha */ talcher: 'Odisha', 
  /* West Bengal */ taldangr: 'West Bengal', 
  /* Arunachal Pradesh */ talih: 'Arunachal Pradesh', 
  /* Kerala */ taliparamb: 'Kerala', 
  /* Gujarat */ talis: 'Gujarat', 
  /* Tamil Nadu */ tambaram: 'Tamil Nadu', 
  /* Manipur */ tamenglong: 'Manipur', 
  /* West Bengal */ tamluk: 'West Bengal', 
  /* Assam */ tamulpur: 'Assam', 
  /* Uttar Pradesh */ tand: 'Uttar Pradesh', 
  /* Telangana */ tandur: 'Telangana', 
  /* Tamil Nadu */ tanjore: 'Tamil Nadu', 
  /* Andhra Pradesh */ tanuku: 'Andhra Pradesh', 
  /* Gujarat */ tapi: 'Gujarat', 
  /* Madhya Pradesh */ taran: 'Madhya Pradesh', 
  /* Andhra Pradesh */ tarlupadu: 'Andhra Pradesh', 
  /* Punjab */ tarntaran: 'Punjab', tarntaransahib: 'Punjab', 
  /* Jharkhand */ tati: 'Jharkhand', 
  /* Arunachal Pradesh */ tato: 'Arunachal Pradesh', tawang: 'Arunachal Pradesh', 
  /* Bihar */ teghr: 'Bihar', 
  /* Uttarakhand */ tehrigarhwal: 'Uttarakhand', 
  /* Andhra Pradesh */ tekali: 'Andhra Pradesh', 
  /* Odisha */ telko: 'Odisha', 
  /* Andhra Pradesh */ tenali: 'Andhra Pradesh', 
  /* Assam */ tengakhat: 'Assam', 
  /* Manipur */ tengnoupal: 'Manipur', 
  /* Tamil Nadu */ tenkasi: 'Tamil Nadu', 
  /* Assam */ tezpur: 'Assam', 
  /* Arunachal Pradesh */ tezu: 'Arunachal Pradesh', 
  /* Uttar Pradesh */ thakurdwar: 'Uttar Pradesh', 
  /* Bihar */ thakurgarh: 'Bihar', 
  /* Kerala */ thalasery: 'Kerala', 
  /* Maharashtra */ thane: 'Maharashtra', 
  /* Tamil Nadu */ thanjavur: 'Tamil Nadu', 
  /* Gujarat */ thar: 'Gujarat', tharad: 'Gujarat', 
  /* Tamil Nadu */ tharangambadi: 'Tamil Nadu', 
  /* Gujarat */ thasr: 'Gujarat', 
  /* Tamil Nadu */ theni: 'Tamil Nadu', 
  /* Himachal Pradesh */ theog: 'Himachal Pradesh', 
  /* Tamil Nadu */ thiruchendur: 'Tamil Nadu', thirumangalam: 'Tamil Nadu', thiruvadanai: 'Tamil Nadu', 
  /* Kerala */ thiruval: 'Kerala', 
  /* Tamil Nadu */ thiruvalur: 'Tamil Nadu', 
  /* Kerala */ thiruvananthapuram: 'Kerala', 
  /* Tamil Nadu */ thiruvarur: 'Tamil Nadu', thiruverumbur: 'Tamil Nadu', thiruvidaimarudur: 'Tamil Nadu', 
  /* Kerala */ thodupuzh: 'Kerala', 
  /* Tamil Nadu */ thothukudi: 'Tamil Nadu', 
  /* Manipur */ thoubal: 'Manipur', 
  /* Tamil Nadu */ thovalai: 'Tamil Nadu', 
  /* Kerala */ thrisur: 'Kerala', thrithal: 'Kerala', 
  /* Madhya Pradesh */ tikamgarh: 'Madhya Pradesh', 
  /* Bihar */ tilk: 'Bihar', 
  /* Tamil Nadu */ tindivanam: 'Tamil Nadu', 
  /* Assam */ tinsuki: 'Assam', 
  /* Karnataka */ tiptur: 'Karnataka', 
  /* Arunachal Pradesh */ tirap: 'Arunachal Pradesh', 
  /* Karnataka */ tirthahali: 'Karnataka', 
  /* Tamil Nadu */ tiruchengode: 'Tamil Nadu', tiruchirapali: 'Tamil Nadu', tirukoilur: 'Tamil Nadu', tirumayam: 'Tamil Nadu', tirunelveli: 'Tamil Nadu', tiruparankundram: 'Tamil Nadu', 
  /* Andhra Pradesh */ tirupati: 'Andhra Pradesh', 
  /* Tamil Nadu */ tirupatur: 'Tamil Nadu', tirupur: 'Tamil Nadu', 
  /* Kerala */ tirur: 'Kerala', 
  /* Tamil Nadu */ tirutani: 'Tamil Nadu', tiruvalur: 'Tamil Nadu', tiruvanamalai: 'Tamil Nadu', tiruvarur: 'Tamil Nadu', tiruvotiyur: 'Tamil Nadu', 
  /* Assam */ titabor: 'Assam', 
  /* Rajasthan */ tonk: 'Rajasthan', 
  /* Jammu & Kashmir */ tral: 'Jammu & Kashmir', 
  /* Kerala */ trichur: 'Kerala', 
  /* Tamil Nadu */ trichy: 'Tamil Nadu', 
  /* Kerala */ trivandrum: 'Kerala', 
  /* Nagaland */ tuensang: 'Nagaland', 
  /* West Bengal */ tufanganj: 'West Bengal', 
  /* Karnataka */ tumakuru: 'Karnataka', 
  /* Maharashtra */ tumsar: 'Maharashtra', 
  /* Meghalaya */ tur: 'Meghalaya', 
  /* Karnataka */ turuvekere: 'Karnataka', 
  /* Tamil Nadu */ tuticorin: 'Tamil Nadu', 
  /* Assam */ udalguri: 'Assam', 
  /* Andhra Pradesh */ udaygiri: 'Andhra Pradesh', 
  /* Tamil Nadu */ udhagamandalam: 'Tamil Nadu', 
  /* Jammu & Kashmir */ udhampur: 'Jammu & Kashmir', 
  /* Uttarakhand */ udhamsinghnagar: 'Uttarakhand', 
  /* Assam */ udqhbari: 'Assam', 
  /* Karnataka */ udupi: 'Karnataka', 
  /* Madhya Pradesh */ ujain: 'Madhya Pradesh', 
  /* Uttar Pradesh */ ujhani: 'Uttar Pradesh', 
  /* Manipur */ ukhrul: 'Manipur', 
  /* Haryana */ uklan: 'Haryana', 
  /* Maharashtra */ ulhasnagar: 'Maharashtra', 
  /* Andhra Pradesh */ ulvapadu: 'Andhra Pradesh', 
  /* Madhya Pradesh */ umari: 'Madhya Pradesh', 
  /* Gujarat */ unai: 'Gujarat', 
  /* Tripura */ unakoti: 'Tripura', 
  /* Uttar Pradesh */ unao: 'Uttar Pradesh', 
  /* Gujarat */ unjh: 'Gujarat', 
  /* Arunachal Pradesh */ uperdibangvaley: 'Arunachal Pradesh', upersiang: 'Arunachal Pradesh', upersubansiri: 'Arunachal Pradesh', 
  /* Gujarat */ uplet: 'Gujarat', 
  /* Tamil Nadu */ usilampati: 'Tamil Nadu', 
  /* West Bengal */ utardinajpur: 'West Bengal', 
  /* Karnataka */ utarkanad: 'Karnataka', 
  /* Uttarakhand */ utarkashi: 'Uttarakhand', 
  /* West Bengal */ utarpar: 'West Bengal', 
  /* Tamil Nadu */ uthangarai: 'Tamil Nadu', 
  /* Telangana */ utkor: 'Telangana', utnor: 'Telangana', 
  /* Gujarat */ vadodar: 'Gujarat', vagr: 'Gujarat', 
  /* Kerala */ vaikom: 'Kerala', 
  /* Mizoram */ vairengte: 'Mizoram', 
  /* Bihar */ vaishali: 'Bihar', 
  /* Gujarat */ valabhi: 'Gujarat', valabhipur: 'Gujarat', 
  /* Rajasthan */ valabhnagar: 'Rajasthan', 
  /* Gujarat */ valabhvidyanagar: 'Gujarat', valsad: 'Gujarat', 
  /* Tamil Nadu */ vandavasi: 'Tamil Nadu', 
  /* Kerala */ vandiperiyar: 'Kerala', 
  /* Tamil Nadu */ vaniyambadi: 'Tamil Nadu', vanur: 'Tamil Nadu', 
  /* Gujarat */ vapi: 'Gujarat', 
  /* Uttar Pradesh */ varanasi: 'Uttar Pradesh', 
  /* Kerala */ varkal: 'Kerala', 
  /* Maharashtra */ vasai: 'Maharashtra', 
  /* Delhi */ vasantvihar: 'Delhi', 
  /* Goa */ vasco: 'Goa', 
  /* Tamil Nadu */ vasudevanalur: 'Tamil Nadu', 
  /* Kerala */ vatakar: 'Kerala', 
  /* Gujarat */ vav: 'Gujarat', vavtharad: 'Gujarat', 
  /* Andhra Pradesh */ vayalpad: 'Andhra Pradesh', 
  /* Telangana */ velairutram: 'Telangana', 
  /* Tamil Nadu */ velankani: 'Tamil Nadu', velore: 'Tamil Nadu', 
  /* Telangana */ vemulawad: 'Telangana', 
  /* Andhra Pradesh */ veraghatam: 'Andhra Pradesh', verankesari: 'Andhra Pradesh', 
  /* Gujarat */ veraval: 'Gujarat', 
  /* Andhra Pradesh */ veravasaram: 'Andhra Pradesh', vetapalem: 'Andhra Pradesh', 
  /* Madhya Pradesh */ vidish: 'Madhya Pradesh', 
  /* Karnataka */ vijayanagar: 'Karnataka', vijayapur: 'Karnataka', 
  /* Andhra Pradesh */ vijayawad: 'Andhra Pradesh', 
  /* Telangana */ vikarabad: 'Telangana', 
  /* Puducherry */ vilianur: 'Puducherry', 
  /* Tamil Nadu */ vilupuram: 'Tamil Nadu', 
  /* Gujarat */ vinchior: 'Gujarat', 
  /* Uttar Pradesh */ vindhyachal: 'Uttar Pradesh', 
  /* Gujarat */ viramgam: 'Gujarat', 
  /* Maharashtra */ virar: 'Maharashtra', 
  /* Tamil Nadu */ virudhachalam: 'Tamil Nadu', virudhunagar: 'Tamil Nadu', 
  /* Andhra Pradesh */ visakhapatnam: 'Andhra Pradesh', visanapet: 'Andhra Pradesh', 
  /* Gujarat */ visavadar: 'Gujarat', 
  /* Andhra Pradesh */ vizag: 'Andhra Pradesh', vizianagaram: 'Andhra Pradesh', 
  /* Uttar Pradesh */ vrindavan: 'Uttar Pradesh', 
  /* Gujarat */ vyar: 'Gujarat', 
  /* Kerala */ vythiri: 'Kerala', wadakanchery: 'Kerala', 
  /* Gujarat */ wadhwan: 'Gujarat', 
  /* Karnataka */ wadi: 'Karnataka', 
  /* Gujarat */ waghodi: 'Gujarat', 
  /* Madhya Pradesh */ waidhan: 'Madhya Pradesh', 
  /* Tamil Nadu */ walajabad: 'Tamil Nadu', 
  /* Telangana */ wanaparthy: 'Telangana', 
  /* Gujarat */ wankaner: 'Gujarat', 
  /* Telangana */ warangal: 'Telangana', warangalrural: 'Telangana', warangalurban: 'Telangana', 
  /* Maharashtra */ wardh: 'Maharashtra', 
  /* Telangana */ wardhanapet: 'Telangana', 
  /* Maharashtra */ washim: 'Maharashtra', 
  /* Kerala */ wayanad: 'Kerala', 
  /* Bihar */ westchamparan: 'Bihar', 
  /* Delhi */ westdelhi: 'Delhi', 
  /* Meghalaya */ westgarohils: 'Meghalaya', 
  /* Andhra Pradesh */ westgodavari: 'Andhra Pradesh', 
  /* Meghalaya */ westjaintihils: 'Meghalaya', 
  /* Arunachal Pradesh */ westkameng: 'Arunachal Pradesh', 
  /* Assam */ westkarbianglong: 'Assam', 
  /* Meghalaya */ westkhasihils: 'Meghalaya', 
  /* Tripura */ westripur: 'Tripura', 
  /* Arunachal Pradesh */ westsiang: 'Arunachal Pradesh', 
  /* Sikkim */ westsikim: 'Sikkim', 
  /* Jharkhand */ westsinghbhum: 'Jharkhand', 
  /* Meghalaya */ wiliamnagar: 'Meghalaya', 
  /* Telangana */ wodchah: 'Telangana', 
  /* Nagaland */ wokh: 'Nagaland', 
  /* Arunachal Pradesh */ yachuli: 'Arunachal Pradesh', 
  /* Telangana */ yadadribhuvanagiri: 'Telangana', 
  /* Karnataka */ yadgir: 'Karnataka', 
  /* Andhra Pradesh */ yadiki: 'Andhra Pradesh', 
  /* Haryana */ yamunagar: 'Haryana', yamunanagar: 'Haryana', 
  /* Puducherry */ yanam: 'Puducherry', 
  /* Maharashtra */ yavatmal: 'Maharashtra', 
  /* Andhra Pradesh */ yelaredy: 'Andhra Pradesh', yeleswaram: 'Andhra Pradesh', yemiganur: 'Andhra Pradesh', 
  /* Arunachal Pradesh */ yingkiong: 'Arunachal Pradesh', 
  /* Andhra Pradesh */ ysrkadap: 'Andhra Pradesh', 
  /* Sikkim */ yuksom: 'Sikkim', yumthang: 'Sikkim', 
  /* Arunachal Pradesh */ yupi: 'Arunachal Pradesh', 
  /* Ladakh */ zanskar: 'Ladakh', 
  /* Punjab */ zirakpur: 'Punjab', 
  /* Arunachal Pradesh */ ziro: 'Arunachal Pradesh', 
  /* Nagaland */ zunheboto: 'Nagaland', 
};

function snCityFold(c){
  const w = String(c || '').toLowerCase().split(/[^a-z]+/).filter(Boolean).map(function(x){ return x.replace(/a+$/, ''); });
  const k = w.join('').replace(/(.)\1/g, '$1');
  return (k.length > 3 && k.slice(-3) === 'cit') ? k.slice(0, -3) : k;
}
const SN_STATE_KEYS = Object.keys(SN_CITY_STATE).sort(function(a,b){ return b.length - a.length; });
function snCityKey(c){
  const k = String(c || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return (k.length > 4 && k.slice(-4) === 'city') ? k.slice(0, -4) : k;
}
/* the state names themselves are valid answers - some reports put the state in the city column */
const SN_STATE_NAMES = (function(){
  const o = {};
  Object.keys(SN_CITY_STATE).forEach(function(k){ const v = SN_CITY_STATE[k]; if(!o[snCityKey(v)]) o[snCityKey(v)] = v; });
  return o;
})();
function snTitleCase(t){ return t.replace(/\s+/g, ' ').trim().replace(/\b\w/g, function(ch){ return ch.toUpperCase(); }); }
function snRawByNames(row, hdrs, names){
  if(!row || !hdrs || !hdrs.length) return '';
  const keys = hdrs.map(function(h){ return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); });
  for(let n = 0; n < names.length; n++){
    const i = keys.indexOf(names[n].replace(/[^a-z0-9]+/g, ''));
    if(i > -1 && row[i] != null && String(row[i]).trim() !== '') return String(row[i]).trim();
  }
  return '';
}
const SN_STATE_HDRS = ['state', 'ship state', 'shipping state', 'buyer state', 'bill to state', 'billing state',
                      'deliver state', 'delivery state', 'destination state', 'state name', 'order state', 'receiver state'];
/* 1. the imported file's own state column  2. the city / district map  3. a visible "not mapped" bucket */
/* short state codes -> full names, so a file that carries MH / KA / TG prints
   Maharashtra / Karnataka / Telangana */
const SN_STATE_CODES = {'AN':'Andaman and Nicobar', 'AP':'Andhra Pradesh', 'AR':'Arunachal Pradesh', 'AS':'Assam', 'BR':'Bihar', 'CG':'Chhattisgarh', 'CH':'Chandigarh', 'DD':'Dadra & Nagar Haveli and Daman & Diu', 'DH':'Dadra & Nagar Haveli and Daman & Diu', 'DN':'Dadra & Nagar Haveli and Daman & Diu', 'DL':'Delhi', 'GA':'Goa', 'GJ':'Gujarat', 'HP':'Himachal Pradesh', 'HR':'Haryana', 'JH':'Jharkhand', 'JK':'Jammu & Kashmir', 'KA':'Karnataka', 'KL':'Kerala', 'LA':'Ladakh', 'LD':'Lakshadweep', 'MH':'Maharashtra', 'ML':'Meghalaya', 'MN':'Manipur', 'MP':'Madhya Pradesh', 'MZ':'Mizoram', 'NL':'Nagaland', 'OD':'Odisha', 'OR':'Odisha', 'PB':'Punjab', 'PY':'Puducherry', 'RJ':'Rajasthan', 'SK':'Sikkim', 'TG':'Telangana', 'TS':'Telangana', 'TN':'Tamil Nadu', 'TR':'Tripura', 'UK':'Uttarakhand', 'UT':'Uttarakhand', 'UP':'Uttar Pradesh', 'WB':'West Bengal'};
function snStateOf(it, hdrs){
  it = it || {};
  let given = String(it.state != null ? it.state : '').trim();
  if (!given && it.raw) given = snRawByNames(it.raw, hdrs || SALE_RAW_HDRS || [], SN_STATE_HDRS);
  if (given && SN_NO_CITY.indexOf(given.toLowerCase()) === -1){
    const g = snCityKey(given).toUpperCase();
    if (g.length === 2 && SN_STATE_CODES[g]) return SN_STATE_CODES[g];   /* 'MH' -> Maharashtra */
    return snTitleCase(given);
  }
  const raw = String(it.city || '').trim();
  if (SN_NO_CITY.indexOf(raw.toLowerCase()) > -1) return 'No city in report';
  const key = snCityKey(raw);
  if (key.length === 2 && SN_STATE_CODES[key.toUpperCase()]) return SN_STATE_CODES[key.toUpperCase()];
  if (SN_STATE_NAMES[key]) return SN_STATE_NAMES[key];
  if (SN_CITY_STATE[key]) return SN_CITY_STATE[key];
  const fk = snCityFold(raw);
  if (SN_CITY_FOLD[fk]) return SN_CITY_FOLD[fk];
  for (let i = 0; i < SN_STATE_KEYS.length; i++){
    const k = SN_STATE_KEYS[i];
    if (k.length > 4 && key.indexOf(k) > -1) return SN_CITY_STATE[k];
    if (k.length > 4 && fk && fk.indexOf(k) > -1) return SN_CITY_FOLD[k] || SN_CITY_STATE[k];
  }
  return 'State not mapped';
}
/* the cities behind each state, most frequent first, as the row's sub-line */
function snStateRows(list, keyFn){
  const rows = snAgg(list, keyFn);
  const byState = {};
  list.forEach(function(x){
    const k = keyFn(x), c = String(x.it.city || '').trim() || 'no city';
    const b = byState[k] || (byState[k] = {});
    b[c] = (b[c] || 0) + 1;
  });
  rows.forEach(function(r){
    const b = byState[r.l] || {};
    const cs = Object.keys(b).sort(function(a,c){ return b[c] - b[a] || (a < c ? -1 : 1); });
    /* the cities a state is made of are not wanted under every row - only the bucket
       that holds nothing else keeps its list */
    r.sub = (r.l === 'State not mapped' && cs.length)
      ? (cs.length > 3 ? cs.slice(0, 3).join(', ') + ' +' + (cs.length - 3) + ' more' : cs.join(', '))
      : '';
  });
  return rows;
}

function snAgg(list, keyFn, subFn){
  const g = {};
  list.forEach(function(x){
    const k = String(keyFn(x) || '\u2014') || '\u2014';
    let b = g[k];
    if(!b) b = g[k] = { l:k, sub:(subFn ? String(subFn(x) || '') : ''), n:0, qty:0, amt:0, ord:{}, frN:0, frQ:0, frA:0, cxN:0, cxA:0 };
    const q = pf(x.it.qty), a = pf(x.it.amount);
    const st = String(x.it.mpStatus||'').toUpperCase();
    const isFr = (st === 'F' || st === 'RTO');
    const isCx = /cancel/i.test(st) || ((x.it.cancelReason||'') !== '');
    b.n++; b.qty += q; b.amt += a;
    if(x.it.orderNo) b.ord[x.it.orderNo] = 1;
    if(isFr){ b.frN++; b.frQ += q; b.frA += a; }
    if(isCx){ b.cxN++; b.cxA += a; }
  });
  return Object.keys(g).map(function(k){
    const b = g[k];
    return { l:b.l, sub:b.sub, n:b.n, qty:b.qty, amt:Math.round(b.amt*100)/100, orders:Object.keys(b.ord).length,
             frN:b.frN, frQ:b.frQ, frA:Math.round(b.frA*100)/100, cxN:b.cxN, cxA:Math.round(b.cxA*100)/100 };
  }).sort(function(a,b){ return b.amt - a.amt; });
}
/* a value for an inline onclick: escape for a JS string sitting in an HTML attribute */
function snJsArg(v){
  return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function snTable(title, rows, grand, cols, labelHdr, linkIds, topN, dim){
  /* the only thing left in a table heading: "2 rows in ✕", and only while that table is
     actually filtering - it is a control, not a caption */
  const sel = (dim && sdbAny(dim))
    ? ' <span class="sn-sel">' + sdbCount(dim) + (sdbCount(dim) === 1 ? ' row in' : ' rows in') +
      ' <b class="sn-pick-x" role="button" tabindex="0" title="' + esc('Clear the ' + title + ' filter') +
      '" onclick="sdbClearDim(\'' + dim + '\')" onkeydown="if(event.key===\'Enter\'){this.click();}">\u2715</b></span>'
    : '';
  /* Cap what's on screen: the rows past the cut are rolled into one Others line, so the
     table still adds up to the whole window, and the TOTAL row keeps counting every row. */
  const cut = (topN && rows.length > topN);
  let shown = rows;
  if(cut){
    const rest = rows.slice(topN);
    const oth = rest.reduce(function(a,r){ a.n += r.n; a.qty += r.qty; a.amt += r.amt; return a; }, { n:0, qty:0, amt:0 });
    oth.amt = Math.round(oth.amt*100)/100;
    oth.l = 'Others'; oth.sub = rest.length + (rest.length === 1 ? ' row' : ' rows') + ' not shown'; oth.other = true;
    shown = rows.slice(0, topN).concat([oth]);
  }
  const inner = '<div class="table-wrap"><table style="min-width:0"><thead><tr><th>' +
    esc(labelHdr) + '</th>' + cols.map(function(c){ return '<th class="num">' + esc(c.h) + '</th>'; }).join('') +
    '</tr></thead>';
  if(!rows.length){
    /* an empty table is still a table: the copied text keeps its heading so the block
       count matches what is on screen even when a filter has emptied it */
    if(SN_LAST) SN_LAST.push({ title: title, rows: [[labelHdr].concat(cols.map(function(c){ return c.h; }))] });
    return '<div class="sec">' + esc(title) + sel + '</div><div class="panel">' + inner +
      '<tbody><tr><td colspan="' + (cols.length + 1) + '" class="sub-line" style="padding:10px 12px">No rows in this view</td></tr></tbody></table></div></div>';
  }
  function vals(r){
    return { n:r.n, qty:r.qty, amt:r.amt, share:snPct(r.amt, grand) };
  }
  const body = shown.map(function(r){
    const m = vals(r);
    const lab = (r.d || r.l);
    const can = !!dim && !r.other;                 /* the rolled-up Others line is not a filter */
    const on = can && sdbHas(dim, r.l);
    const pick = '<span class="sn-pick' + (on ? ' sn-pick-on' : '') + '" role="button" tabindex="0" title="' +
      esc('Click to ' + (on ? 'remove ' + lab + ' from this filter' : 'filter the whole view by ' + lab + ' - other rows can stay picked')) +
      '" onclick="sdbToggle(\'' + dim + '\',\'' + snJsArg(r.l) + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click();}">' +
      esc(lab) + '</span>' +
      (on ? ' <b class="sn-pick-x" role="button" tabindex="0" title="' + esc('Remove ' + lab + ' from this filter') +
            '" onclick="sdbToggle(\'' + dim + '\',\'' + snJsArg(r.l) + '\')" onkeydown="if(event.key===\'Enter\'){this.click();}">\u2715</b>' : '');
    const cell = linkIds ? sdbStyleLink(lab) : (can ? pick : esc(lab));
    return '<tr' + (on ? ' class="sn-on"' : '') + '><td' + (r.other ? ' class="sn-other"' : '') + '>' + cell + (r.sub ? '<div class="sub-line" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(r.sub) + '">' + esc(r.sub) + '</div>' : '') + '</td>' +
      cols.map(function(c){ return '<td class="num">' + (c.pct ? m[c.k] : snInt(m[c.k])) + '</td>'; }).join('') + '</tr>';
  }).join('');
  const t = rows.reduce(function(a,r){ a.n+=r.n; a.qty+=r.qty; a.amt+=r.amt; return a; }, { n:0, qty:0, amt:0 });
  const tot = { n:t.n, qty:t.qty, amt:Math.round(t.amt*100)/100 };
  const mT = vals(tot);
  const foot = '<tfoot><tr class="tot-row"><td>Total \u2014 ' + rows.length + (rows.length === 1 ? ' row' : ' rows') + '</td>' +
    cols.map(function(c){ return '<td class="num">' + (c.pct ? mT[c.k] : snInt(mT[c.k])) + '</td>'; }).join('') + '</tr></tfoot>';
  if(SN_LAST){
    const exp = [[labelHdr].concat(cols.map(function(c){ return c.h; }))];
    shown.forEach(function(r){
      const m = vals(r);
      exp.push([r.d || r.l].concat(cols.map(function(c){ return c.pct ? m[c.k] : snInt(m[c.k]); })));
    });
    if(rows.length){
      const hTot = ['Total \u2014 ' + rows.length + (rows.length === 1 ? ' row' : ' rows')];
      cols.forEach(function(c){ hTot.push(c.pct ? mT[c.k] : snInt(mT[c.k])); });
      exp.push(hTot);
    }
    SN_LAST.push({ title: title, rows: exp });
  }
  return '<div class="sec">' + esc(title) + sel + '</div>' +
    '<div class="panel">' + inner + '<tbody>' + body + '</tbody>' + foot + '</table></div></div>';
}
let SN_LAST = null;   /* { title, head:[], rows:[[]] } per table, for copy-out */
/* kept for a one-line restore: no button calls this since the numbers toolbar lost it */
function openSaleNumbers(){
  if(!userCan('sale','view')) return toast('Access denied for this module','red');
  cur = 'sale'; pageView = { kind:'salenumbers' };
  render();
}
function renderSaleNumbers(){
  $('tb-title').textContent = 'Sale Numbers';
  $('tb-sub').textContent = 'Figures only \u2014 Indian grouping, whole rupees, no currency symbol and no K / L / Cr short form';
  $('tb-actions').innerHTML =
    '<button class="btn btn-ghost" onclick="pageView=null;cur=\'sale\';render()">' + ic('back',16) + 'Back to Sale</button>';
  const base = sdbCollect();
  if(!base.length){
    SN_LAST = null;
    $('content').innerHTML = '<div class="sn-fbar">' + sfToolbarHtml('Numbers') + '</div>' +
      sdbEmptyHtml('Import a Myntra Seller Orders / SJIT report and every figure below fills in.');
    return;
  }
  const all = sdbFiltered(base, null);
  const total = all.reduce(function(a,x){ a.qty += pf(x.it.qty); a.amt += pf(x.it.amount); return a; }, { qty:0, amt:0 });
  const grand = Math.round(total.amt*100)/100;
  /* a dimension's own table must keep every row - otherwise, once one value is picked the
     table holds nothing else to click and several picks are impossible.  The dashboard's
     charts do the same by excluding their own dimension from the filter; its Share % base
     moves with it, so the table still comes to 100%. */
  function snDimList(dim){ return sdbAny(dim) ? sdbFiltered(base, dim) : all; }
  function snDimGrand(list){ return Math.round(list.reduce(function(a, x){ return a + pf(x.it.amount); }, 0) * 100) / 100; }
  const Lp = snDimList('prog'), Lb = snDimList('brand'), La = snDimList('article');
  const Ls = snDimList('state'), Lst = snDimList('status'), Lr = snDimList('reason');
  const Gp = snDimGrand(Lp), Gb = snDimGrand(Lb), Ga = snDimGrand(La);
  const Gs = snDimGrand(Ls), Gst = snDimGrand(Lst);
  const frRows = all.filter(function(x){ const c = String(x.it.mpStatus||'').toUpperCase(); return c === 'F' || c === 'RTO'; });
  const frAmt = Math.round(frRows.reduce(function(a,x){ return a + pf(x.it.amount); }, 0)*100)/100;
  SN_LAST = [];

  const active = SDB_DIMS.filter(function(d){ return sdbAny(d); });
  let h = '<style>.sdb-numnote{font-size:12px;color:var(--muted,#777)}' +
    '.sn-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start;margin-top:6px}' +
    '.sn-col{min-width:0}' + '.sn-other{font-style:italic;color:#6b6b6b}' +
    '.sn-fbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}' +
    '.sn-pick{cursor:pointer;border-bottom:1px dotted #9db3a8}' +
    '.sn-pick:hover{color:#0c5132;border-bottom-color:#0c5132}' +
    '.sn-pick:focus-visible{outline:2px solid #0c5132;outline-offset:2px}' +
    '.sn-pick-x{color:#d97706;font-weight:800;margin-left:4px;cursor:pointer}' +
    '.sn-sel{margin-left:10px;font-size:11px;font-weight:600;color:#8a5200;background:#fdf3e3;border:1px solid #e5b566;border-radius:999px;padding:1px 8px}' +
    'tr.sn-on .sn-pick{font-weight:750;color:#0c5132;border-bottom-color:transparent}' +
    'tr.sn-on{background:#fdf3e3}' + 'tr.sn-on td:first-child{box-shadow:inset 3px 0 0 #d97706}' +
    '.sn-h{display:flex;align-items:baseline;gap:10px;margin:2px 0 2px;padding:8px 12px;border-radius:10px 10px 0 0;background:#0c5132;color:#fff}' +
    '.sn-h span:first-child{font-size:14px;font-weight:750}' +
    '.sn-h .sub-line{color:rgba(255,255,255,.72);font-size:11px;margin-left:auto;text-align:right}' +
    '.sn-col .sec{margin:14px 0 8px;font-size:12px}' +
    '@media(max-width:1000px){.sn-grid{grid-template-columns:1fr}}</style>';
  /* the same bag the dashboard writes, editable from here: one x per filter, one Clear all */
  h += '<div class="sn-fbar">' + sfToolbarHtml('Numbers') +
    '<span class="sub-line">' +
    (active.length ? 'Filters (shared with the Sale Dashboard):'
                    : 'No filters set \u2014 click rows in any table below to filter every table here and on the Sale Dashboard; several can be picked at once.') +
    '</span>' +
    active.map(function(d){ return '<span class="badge b-amber">' + esc(d) + (sdbCount(d) > 1 ? ' (' + sdbCount(d) + ')' : '') + ': ' + esc(sdbValText(d)) +
      ' <b class="sn-fx" title="Clear this filter" onclick="sdbClearDim(\'' + d + '\')">\u2715</b></span>'; }).join('') +
    (active.length ? '<button class="btn btn-ghost btn-sm" onclick="sdbClear()">Clear all</button>' : '') +
    '</div>';
  const reasonList = Lr.filter(function(x){ return (x.it.cancelReason||'') !== ''; });
  /* the reason table shares out the value that carries a reason - not the whole window -
     so the reasons add up to 100% instead of "11.8% of everything we sold" */
  const Rn = snDimGrand(reasonList);
  const styleList = all.filter(function(x){ return (x.it.styleCode || x.it.desc || x.it.sku || '') !== ''; });
  const frStyleList = frRows.filter(function(x){ return (x.it.styleCode || x.it.desc || x.it.sku || '') !== ''; });
  const K_prog = function(x){ return sdbKeyOf('prog', x); };
  const K_brand = function(x){ return sdbKeyOf('brand', x); };
  const K_art = function(x){ return sdbKeyOf('article', x); };
  const K_state = function(x){ return sdbKeyOf('state', x); };
  const K_status = function(x){ return sdbKeyOf('status', x); };
  const K_reason = function(x){ return x.it.cancelReason; };
  const K_style = function(x){ return x.it.styleCode || x.it.desc || x.it.sku || ''; };
  const K_styleDesc = function(x){ return x.it.desc || ''; };
  const K_styleArt = function(x){ return x.it.articleType || ''; };
  /* two sections, side by side */
  const snSales =
      snTable('By program (po_type)', snAgg(Lp, K_prog), Gp, SN_COLS, 'Program', false, 0, 'prog') +
      snTable('By brand', snAgg(Lb, K_brand), Gb, SN_COLS, 'Brand', false, 0, 'brand') +
      snTable('By product type', snAgg(La, K_art), Ga, SN_COLS, 'Product type', false, 0, 'article') +
      snTable('By state', snStateRows(Ls, K_state), Gs, SN_COLS, 'State', false, 10, 'state') +
      snTable('By style', snAgg(styleList, K_style, K_styleDesc), grand, SN_COLS, 'Style ID', true, 10);
  const snReturns =
      snTable('By order status', snAgg(Lst, K_status).map(function(r){ r.d = sdbStatusFull(r.l); return r; }), Gst, SN_COLS, 'Status', false, 0, 'status') +
      snTable('By cancellation / return reason', snAgg(reasonList, K_reason), Rn, SN_COLS, 'Reason', false, 10, 'reason') +
      snTable('F / RTO by style', snAgg(frStyleList, K_style, K_styleArt), frAmt, SN_COLS, 'Style ID', true, 10);
  h += '<div class="sn-grid">' +
         '<div class="sn-col"><div class="sn-h"><span>Sales</span><span class="sub-line">5 tables · share % of the sale value in the chosen date window</span></div>' + snSales + '</div>' +
         '<div class="sn-col"><div class="sn-h"><span>Returns &amp; status</span><span class="sub-line">3 tables · sale value and F / RTO value</span></div>' + snReturns + '</div>' +
       '</div>';
  $('content').innerHTML = h;
}