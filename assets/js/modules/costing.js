/**
 * StitchFlow ERP — Buyer Order Costing & BOM
 * File: assets/js/modules/costing.js
 */

/* =====================================================================
   COSTING — buyer order costing (fabric + trims BOM, cost break-up, FOB)
   ===================================================================== */
const fmt2 = (n) => (Number(n) || 0).toFixed(2);
const fmt4 = (n) => (Number(n) || 0).toFixed(4);

const COST_ROWS = [
  { id: 'fabric', label: 'Fabric Cost', type: 'auto' },
  { id: 'trims', label: 'Trims Cost', type: 'auto' },
  { id: 'cm', label: 'CM *', type: 'cost', def: 0 },
  { id: 'washing', label: 'Washing', type: 'cost', def: 0 },
  { id: 'photoshoot', label: 'Photoshoot', type: 'cost', def: 0 },
  { id: 'transportation', label: 'Transportation', type: 'cost', def: 0 },
  { id: 'testing', label: 'Testing', type: 'cost', def: 0 },
  { id: 'totalMaking', label: 'Total making cost with fabric and trims', type: 'auto', strong: true },
  { id: 'garmentRejection', label: 'Garment Rejection *', type: 'pct', def: 0 },
  { id: 'finance', label: 'Finance *', type: 'pct', def: 0 },
  { id: 'totalProduction', label: 'Total Production Cost', type: 'auto', strong: true },
  { id: 'cogs', label: 'COGS', type: 'auto' },
  { id: 'margin', label: 'Margin', type: 'auto' },
  { id: 'cmp', label: 'CMP', type: 'auto', strong: true }
];

function costRemoveRow(btn, tbodyId) {
  const tb = $(tbodyId);
  if (!tb) return;
  if (tb.querySelectorAll('tr').length <= 1) { toast('At least one row needed', 'red'); return; }
  btn.closest('tr').remove();
  renumberSr(tb);
  recalcAll();
}
function costNumVal(v) { return (v === undefined || v === null || v === '') ? '' : v; }
function costItemRow(tbodyId, item, cons, uom, rate, wastage) {
  const uomId = rid('cuom');
  return '<tr>' +
    '<td class="sr-cell" data-sr></td>' +
    '<td><input class="inp" data-f="item" placeholder="Particulars" value="' + esc(item || '') + '"></td>' +
    '<td><input class="inp num" type="number" step="any" data-f="cons" value="' + costNumVal(cons) + '" oninput="recalcAll()"></td>' +
    '<td>' + cbox(uomId, { opts: db.masters.uoms || [], value: uom || '', f: 'uom', placeholder: 'UOM', compact: true }) + '</td>' +
    '<td><input class="inp num" type="number" step="any" data-f="rate" value="' + costNumVal(rate) + '" oninput="recalcAll()"></td>' +
    '<td><input class="inp num" type="number" step="any" data-f="wastage" value="' + costNumVal(wastage) + '" oninput="recalcAll()"></td>' +
    '<td><input class="inp num" data-f="amount" value="0.0000" readonly tabindex="-1" title="Cons × (1 + Wastage%) × Rate"></td>' +
    '<td class="xl-act"><button type="button" class="btn-icon danger" title="Remove" onclick="costRemoveRow(this,\'' + tbodyId + '\')">' + ic('trash', 14) + '</button></td>' +
    '</tr>';
}
function fabricRowTpl() { return costItemRow('fabricBody'); }
function sewingRowTpl() { return costItemRow('sewingBody'); }

function formCosting(rec) {
  rec = rec || {};
  return '' +
    '<div class="split-grid">' +
    '<div class="split-col">' +
    '<div class="sec">Order Info and Cost Break Up</div>' +
    '<div class="xl-sheet">' +
    '<div class="xl-sheet-head">Order Info<span class="xl-tip">↵ / ↓↑ move · Tab ⇥ ↔ navigate · drag green corner to fill · paste rows from Excel</span></div>' +
    '<div class="xl-grid">' +
    '<div class="xl-cell xl-lbl">Style Image</div>' +
    '<div class="xl-cell xl-val xl-imgcell" id="styleImageCell">' +
    '<input class="xl-in" type="file" id="styleImage" accept="image/*" title="Upload style image">' +
    '<span class="imgph">Upload image</span>' +
    '<img class="imgprev" id="styleImagePreview" alt="Style image" style="display:none">' +
    '<button type="button" class="imgclear" id="styleImageClear" title="Remove image">' + ic('trash', 10) + '</button>' +
    '</div>' +
    (rec && rec.id && rec.no
      ? '<div class="xl-cell xl-lbl">Costing No</div><div class="xl-cell xl-val"><input class="xl-in" id="cost-no" value="' + esc(rec.no) + '" disabled></div>'
      : '') +
    '<div class="xl-cell xl-lbl">Style</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="styleName" placeholder="e.g. Shirt" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">Style Description</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="styleDescription" placeholder="e.g. Mens Shirt" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">Brand *</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="brandName" placeholder="e.g. Myntra" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">Label *</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="labelName" placeholder="e.g. Roadster" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">Order Qty</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in num" type="number" step="any" id="totalQty" value=""></div>' +
    '<div class="xl-cell xl-lbl">Fabric Quality</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="fabricQuality" placeholder="e.g. ACC-JW24269 (Fabric-1)" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">Trim Fabric</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="trimFabric" placeholder="e.g. N/A" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">Wash Type</div>' +
    '<div class="xl-cell xl-val">' + cbox('cost-washType', { opts: db.masters.washTypes || [], value: (rec.order && rec.order.washType) || '', placeholder: 'Select wash type…' }) + '</div>' +
    '<div class="xl-cell xl-lbl">Production Factory</div>' +
    '<div class="xl-cell xl-val">' + cbox('cost-factory', { opts: vendorPartyOptions(), value: (rec.order && rec.order.factory) || '', placeholder: 'Select vendor…' }) + '</div>' +
    '<div class="xl-cell xl-lbl">Size and Ratio</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in" id="sizeRatio" placeholder="e.g. S-XL" spellcheck="false"></div>' +
    '<div class="xl-cell xl-lbl">SAM</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in num" type="number" step="any" id="sam" value=""></div>' +
    '<div class="xl-cell xl-lbl">FOB *</div>' +
    '<div class="xl-cell xl-val"><input class="xl-in num" type="number" step="any" id="fob" value=""></div>' +
    '</div>' +
    '<div class="xl-sheet-head">Cost Break Up</div>' +
    '<div class="table-wrap" style="border:none;border-radius:0">' +
    '<table class="xl-table" id="breakupTable">' +
    '<thead><tr><th>Field</th><th class="num" style="width:132px">Cost/pcs</th><th class="num" style="width:112px">% FOB</th></tr></thead>' +
    '<tbody id="breakupBody"></tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="split-col">' +
    '<div class="sec">Fabric Cost Breakup</div>' +
    '<div class="table-wrap"><table class="mini-table xl-table cost-bom" id="fabricBomTable">' +
    '<thead><tr>' + srTh() + '<th>Particulars *</th><th class="num">Cons/pcs</th><th>UOM</th><th class="num">Rate</th><th class="num">Wastage %</th><th class="num">Cost</th><th></th></tr></thead>' +
    '<tbody id="fabricBody"></tbody></table></div>' +
    '<div class="bom-foot"><span class="bom-hint">Paste rows from Excel · drag the green corner to fill down</span>' +
    '<button class="btn btn-ghost btn-sm" onclick="addRow(\'fabricBody\', fabricRowTpl); recalcAll()">' + ic('plus', 15) + 'Add item</button></div>' +
    '<div class="sec">Trims Cost Breakup</div>' +
    '<div class="table-wrap"><table class="mini-table xl-table cost-bom" id="sewingBomTable">' +
    '<thead><tr>' + srTh() + '<th>Particulars *</th><th class="num">Cons/pcs</th><th>UOM</th><th class="num">Rate</th><th class="num">Wastage %</th><th class="num">Cost</th><th></th></tr></thead>' +
    '<tbody id="sewingBody"></tbody></table></div>' +
    '<div class="bom-foot"><span class="bom-hint">Paste rows from Excel · drag the green corner to fill down</span>' +
    '<button class="btn btn-ghost btn-sm" onclick="addRow(\'sewingBody\', sewingRowTpl); recalcAll()">' + ic('plus', 15) + 'Add item</button></div>' +
    '</div>' +
    '</div>' +
    '<div class="sec">Notes</div>' +
    '<div class="field" style="max-width:560px"><label class="lbl">Narration</label>' +
    '<input class="inp" id="narration" placeholder="Any remarks for this costing..."></div>';
}

function tableSum(tbodyId) {
  const tb = $(tbodyId); if (!tb) return 0;
  let sum = 0;
  qsa('tr', tb).forEach(function (tr) {
    const consEl = qs('[data-f="cons"]', tr); if (!consEl) return;
    const cons = pf(consEl.value);
    const wastage = pf((qs('[data-f="wastage"]', tr) || {}).value);
    const rate = pf((qs('[data-f="rate"]', tr) || {}).value);
    const total = (cons + cons * (wastage / 100)) * rate;
    const amt = qs('[data-f="amount"]', tr); if (amt) amt.value = fmt4(total);
    sum += total;
  });
  return sum;
}
function buildBreakupTable() {
  const el = $('breakupBody'); if (!el) return;
  el.innerHTML = COST_ROWS.map(function (r) {
    const cls = r.strong ? ' class="totalrow"' : '';
    let costCell, pctCell;
    if (r.type === 'cost') {
      costCell = '<input class="xl-in num" type="number" step="any" id="c_' + r.id + '" value="' + r.def + '" oninput="recalcAll()">';
      pctCell = '<input class="xl-in num" id="p_' + r.id + '" value="0.00" readonly tabindex="-1">';
    } else if (r.type === 'pct') {
      const hint = r.id === 'garmentRejection' ? '% of Total Making Cost' : '% of Trims + CM + Washing + Photoshoot';
      costCell = '<input class="xl-in num" id="c_' + r.id + '" value="0.00" readonly tabindex="-1">';
      pctCell = '<input class="xl-in num" type="number" step="any" id="p_' + r.id + '" value="' + r.def + '" title="' + hint + '" oninput="recalcAll()">';
    } else {
      costCell = '<input class="xl-in num" id="c_' + r.id + '" value="0.00" readonly tabindex="-1">';
      pctCell = '<input class="xl-in num" id="p_' + r.id + '" value="0.00" readonly tabindex="-1">';
    }
    return '<tr' + cls + '><td class="xl-lblc">' + r.label + '</td><td>' + costCell + '</td><td>' + pctCell + '</td></tr>';
  }).join('');
}
function setCostRow(id, cost, fob) {
  const costEl = $('c_' + id); if (!costEl) return;
  if (document.activeElement !== costEl) costEl.value = fmt2(cost);
  const p = $('p_' + id); if (p) p.value = fmt2(fob ? (cost / fob) * 100 : 0);
}
function recalcAll() {
  if (!$('breakupBody') || !$('fob')) return;
  const fob = pf($('fob').value);
  const fabricCost = tableSum('fabricBody');
  const trimsCost = tableSum('sewingBody');
  setCostRow('fabric', fabricCost, fob);
  setCostRow('trims', trimsCost, fob);
  const cm = pf(($('c_cm') || {}).value);
  const washing = pf(($('c_washing') || {}).value);
  const photoshoot = pf(($('c_photoshoot') || {}).value);
  const transportation = pf(($('c_transportation') || {}).value);
  const testing = pf(($('c_testing') || {}).value);
  setCostRow('cm', cm, fob);
  setCostRow('washing', washing, fob);
  setCostRow('photoshoot', photoshoot, fob);
  setCostRow('transportation', transportation, fob);
  setCostRow('testing', testing, fob);
  const totalMaking = fabricCost + trimsCost + cm + washing + photoshoot + transportation + testing;
  setCostRow('totalMaking', totalMaking, fob);
  const rejPer = pf(($('p_garmentRejection') || {}).value);
  const rejCost = totalMaking * rejPer / 100;
  if ($('c_garmentRejection')) $('c_garmentRejection').value = fmt2(rejCost);
  const financePer = pf(($('p_finance') || {}).value);
  const financeCost = (trimsCost + cm + washing + photoshoot) * financePer / 100;
  if ($('c_finance')) $('c_finance').value = fmt2(financeCost);
  const totalProduction = totalMaking + rejCost + financeCost;
  const cogs = totalMaking + rejCost;
  const margin = fob - totalProduction;
  const cmp = cm + margin;
  setCostRow('totalProduction', totalProduction, fob);
  setCostRow('cogs', cogs, fob);
  setCostRow('margin', margin, fob);
  setCostRow('cmp', cmp, fob);
  renumberSr($('fabricBody'));
  renumberSr($('sewingBody'));
}

function clearStyleImage() {
  const inp = $('styleImage'); if (inp) inp.value = '';
  const pv = $('styleImagePreview'); if (!pv) return;
  pv.removeAttribute('src'); pv.removeAttribute('title'); pv.style.display = 'none';
  const cl = $('styleImageClear'); if (cl) cl.style.display = 'none';
  const ph = qs('.imgph', $('styleImageCell')); if (ph) ph.style.display = '';
}
function setStyleImagePreview(dataURL, name) {
  const pv = $('styleImagePreview'); if (!pv) return;
  pv.src = dataURL; pv.title = name || 'Style image'; pv.style.display = 'block';
  const cl = $('styleImageClear'); if (cl) cl.style.display = 'flex';
  const ph = qs('.imgph', $('styleImageCell')); if (ph) ph.style.display = 'none';
}
function bindCostingImage() {
  const inp = $('styleImage');
  if (inp && !inp._bound) {
    inp._bound = true;
    inp.addEventListener('change', function () {
      const f = this.files && this.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = function () { setStyleImagePreview(rd.result, f.name); };
      rd.readAsDataURL(f);
    });
  }
  const cl = $('styleImageClear');
  if (cl && !cl._bound) {
    cl._bound = true;
    cl.addEventListener('click', function (ev) { ev.stopPropagation(); clearStyleImage(); });
  }
}

function seedDefaultCostingRows() {
  const fb = $('fabricBody'), sb = $('sewingBody');
  if (!fb || !sb) return;
  fb.innerHTML = '';
  addRow('fabricBody', fabricRowTpl);
  sb.innerHTML = '';
  addRow('sewingBody', sewingRowTpl);
}
function applyCostingData(rec) {
  const o = rec.order || {};
  const put = function (id, v) { const el = $(id); if (el) el.value = v; };
  put('brandName', o.brand || '');
  put('labelName', o.label || '');
  put('styleName', o.style || '');
  put('styleDescription', o.styleDescription || '');
  put('totalQty', o.totalQty != null ? o.totalQty : 0);
  put('fabricQuality', o.fabricQuality || '');
  put('trimFabric', o.trimFabric || '');
  cboxSet('cost-factory', o.factory || '');
  cboxSet('cost-washType', o.washType || '');
  put('sizeRatio', o.sizeRatio || '');
  put('sam', o.sam != null ? o.sam : 0);
  put('fob', o.fob != null ? o.fob : 0);
  if (rec.styleImage) setStyleImagePreview(rec.styleImage, o.style || 'Style image');
  else clearStyleImage();
  const fb = $('fabricBody'), sb = $('sewingBody');
  if (fb) {
    fb.innerHTML = '';
    (rec.fabric && rec.fabric.length ? rec.fabric : [{}]).forEach(function (r) {
      addRow('fabricBody', function () { return costItemRow('fabricBody', r.item, r.cons, r.uom, r.rate, r.wastage); });
    });
  }
  if (sb) {
    sb.innerHTML = '';
    (rec.sewing && rec.sewing.length ? rec.sewing : [{}]).forEach(function (r) {
      addRow('sewingBody', function () { return costItemRow('sewingBody', r.item, r.cons, r.uom, r.rate, r.wastage); });
    });
  }
  const b = rec.breakup || {};
  put('c_cm', b.cm != null ? b.cm : 0);
  put('c_washing', b.washing != null ? b.washing : 0);
  put('c_photoshoot', b.photoshoot != null ? b.photoshoot : 0);
  put('c_transportation', b.transportation != null ? b.transportation : 0);
  put('c_testing', b.testing != null ? b.testing : 0);
  put('p_garmentRejection', b.garmentRejection != null ? b.garmentRejection : 0);
  put('p_finance', b.finance != null ? b.finance : 0);
  put('narration', rec.narration || '');
  recalcAll();
}
function gatherCosting() {
  recalcAll();
  const rows = function (tbodyId) {
    return qsa('tr', $(tbodyId)).map(function (tr) {
      return {
        item: (qs('[data-f="item"]', tr) || {}).value || '',
        cons: pf((qs('[data-f="cons"]', tr) || {}).value),
        uom: (function () {
          const el = qs('[data-f="uom"]', tr);
          if (!el) return '';
          if (el.dataset && el.dataset.cbInput) return String(cboxGet(el.dataset.cbInput) || '').trim();
          return String(el.value || '').trim();
        })(),
        rate: pf((qs('[data-f="rate"]', tr) || {}).value),
        wastage: pf((qs('[data-f="wastage"]', tr) || {}).value)
      };
    });
  };
  const gv = function (id) { return (($(id) || {}).value || '').trim(); };
  return {
    styleImage: (($('styleImagePreview') || {}).src) || '',
    order: {
      brand: gv('brandName'), label: gv('labelName'),
      style: gv('styleName'), styleDescription: gv('styleDescription'),
      totalQty: pf(gv('totalQty')), fabricQuality: gv('fabricQuality'),
      trimFabric: gv('trimFabric'), factory: cboxGet('cost-factory') || '',
      washType: cboxGet('cost-washType') || '', sizeRatio: gv('sizeRatio'),
      sam: pf(gv('sam')), fob: pf(gv('fob'))
    },
    breakup: {
      cm: pf(($('c_cm') || {}).value), washing: pf(($('c_washing') || {}).value),
      photoshoot: pf(($('c_photoshoot') || {}).value), transportation: pf(($('c_transportation') || {}).value),
      testing: pf(($('c_testing') || {}).value),
      garmentRejection: pf(($('p_garmentRejection') || {}).value), finance: pf(($('p_finance') || {}).value)
    },
    fabric: rows('fabricBody'),
    sewing: rows('sewingBody'),
    narration: gv('narration'),
    totals: {
      orderValue: pf(gv('totalQty')) * pf(gv('fob')),
      totalMaking: pf(($('c_totalMaking') || {}).value),
      totalProduction: pf(($('c_totalProduction') || {}).value),
      margin: pf(($('c_margin') || {}).value),
      cmp: pf(($('c_cmp') || {}).value)
    }
  };
}
function saveCosting(id) {
  const data = gatherCosting();
  delete data._repeat;
  const o = data.order || {};
  if (!o.brand) return reqBad('brandName', 'Brand is required');
  if (!o.label) return reqBad('labelName', 'Label is required');
  if (pf(o.fob) <= 0) return reqBad('fob', 'FOB is required and must be more than zero');
  if (pf((data.breakup || {}).cm) <= 0) return reqBad('c_cm', 'CM is required and must be more than zero');
  if (pf((data.breakup || {}).garmentRejection) < 0) return reqBad('p_garmentRejection', 'Garment Rejection % cannot be negative');
  if (pf((data.breakup || {}).finance) < 0) return reqBad('p-finance', 'Finance % cannot be negative');
  if (!(data.fabric || []).some(function (x) { return String(x.item || '').trim(); }))
    return reqBadCell('fabricBody', 0, 'item', 'At least one Particulars entry is required in Fabric Cost Breakup');
  if (!(data.sewing || []).some(function (x) { return String(x.item || '').trim(); }))
    return reqBadCell('sewingBody', 0, 'item', 'At least one Particulars entry is required in Trims Cost Breakup');
  data.date = today();
  if (id) {
    const ex = db.costing.find(function (r) { return r.id === id; });
    if (!ex) return;
    data.no = ex.no; data.id = ex.id; data.createdAt = ex.createdAt;
    Object.assign(ex, data);
  } else {
    data.id = uid();
    data.no = nextNo('costing', 'CST');
    data.createdAt = Date.now();
    db.costing.push(data);
  }
  saveDB();
  pageView = null;
  toast('Costing saved — ' + (data.no || o.brand || o.style), 'green');
  render();
}
function repeatCosting(id) {
  const src = db.costing.find(function (r) { return r.id === id; });
  if (!src) return toast('Costing not found', 'red');
  pageView = { kind: 'form', m: 'costing', id: null, repeatFrom: id };
  render();
}
function costingLineAmt(r) {
  r = r || {};
  const cons = pf(r.cons), wastage = pf(r.wastage), rate = pf(r.rate);
  return (cons + cons * (wastage / 100)) * rate;
}
function computeCostingPrint(rec) {
  rec = rec || {};
  const o = rec.order || {}, b = rec.breakup || {};
  const fob = pf(o.fob);
  const fabricCost = (rec.fabric || []).reduce(function (a, r) { return a + costingLineAmt(r); }, 0);
  const trimsCost = (rec.sewing || []).reduce(function (a, r) { return a + costingLineAmt(r); }, 0);
  const cm = pf(b.cm), washing = pf(b.washing), photoshoot = pf(b.photoshoot);
  const transportation = pf(b.transportation), testing = pf(b.testing);
  const totalMaking = fabricCost + trimsCost + cm + washing + photoshoot + transportation + testing;
  const rejPer = pf(b.garmentRejection), financePer = pf(b.finance);
  const rejCost = totalMaking * rejPer / 100;
  const financeCost = (trimsCost + cm + washing + photoshoot) * financePer / 100;
  const totalProduction = totalMaking + rejCost + financeCost;
  const cogs = totalMaking + rejCost;
  const margin = fob - totalProduction;
  const cmp = cm + margin;
  const pct = function (c) { return fob ? (c / fob) * 100 : 0; };
  return {
    o: o, fob: fob,
    rows: [
      { label: 'Fabric Cost', cost: fabricCost, pct: pct(fabricCost) },
      { label: 'Trims Cost', cost: trimsCost, pct: pct(trimsCost) },
      { label: 'CM', cost: cm, pct: pct(cm) },
      { label: 'Washing', cost: washing, pct: pct(washing) },
      { label: 'Photoshoot', cost: photoshoot, pct: pct(photoshoot) },
      { label: 'Transportation', cost: transportation, pct: pct(transportation) },
      { label: 'Testing', cost: testing, pct: pct(testing) },
      { label: 'Total making cost with fabric and trims', cost: totalMaking, pct: pct(totalMaking), strong: true },
      { label: 'Garment Rejection', cost: rejCost, pct: rejPer },
      { label: 'Finance', cost: financeCost, pct: financePer },
      { label: 'Total Production Cost', cost: totalProduction, pct: pct(totalProduction), strong: true },
      { label: 'COGS', cost: cogs, pct: pct(cogs) },
      { label: 'Margin', cost: margin, pct: pct(margin) },
      { label: 'CMP', cost: cmp, pct: pct(cmp), strong: true }
    ]
  };
}
function printCosting(id) {
  const rec = db.costing.find(function (x) { return x.id === id; });
  if (!rec) return toast('Costing not found', 'red');
  const x = computeCostingPrint(rec);
  const o = x.o;
  const bomRows = function (arr) {
    return (arr || []).map(function (r, i) {
      return '<tr><td class="ctr">' + (i + 1) + '</td><td>' + esc(r.item || '') + '</td>' +
        '<td class="rt">' + fmtNum(pf(r.cons)) + '</td><td>' + esc(r.uom || '') + '</td>' +
        '<td class="rt">' + fmtNum(pf(r.rate)) + '</td><td class="rt">' + fmtNum(pf(r.wastage)) + '</td>' +
        '<td class="rt">' + fmt4(costingLineAmt(r)) + '</td></tr>';
    }).join('') || '<tr><td colspan="7">—</td></tr>';
  };
  const img = rec.styleImage
    ? '<img class="simg" src="' + rec.styleImage + '" alt="Style image">'
    : '<div class="noph">No style image</div>';
  const kv = function (lbl, val) {
    return '<tr><td class="k">' + esc(lbl) + '</td><td>' + (val === '' || val == null ? '—' : val) + '</td></tr>';
  };
  const doc =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Costing ' + esc(rec.no) + ' | ' + esc(PRINT_CO.name) + '</title>' +
    '<style>' +
    '*{box-sizing:border-box}' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;margin:0;padding:14px;background:#fff}' +
    '.bar{display:flex;gap:8px;justify-content:flex-end;max-width:1040px;margin:0 auto 10px}' +
    '.bar button{font:inherit;padding:7px 16px;border:1px solid #999;border-radius:4px;background:#f3f3f3;cursor:pointer}' +
    '.bar button.p{background:#303030;color:#fff;border-color:#303030}' +
    '.sheet{max-width:1040px;margin:0 auto;border:1px solid #000}' +
    '.hd{text-align:center;padding:8px 10px;border-bottom:1px solid #000}' +
    '.hd h1{font-size:15px;margin:0 0 3px}' +
    '.hd div{font-size:10px;line-height:1.45}' +
    '.title{text-align:center;font-size:13px;font-weight:bold;padding:5px;border-bottom:1px solid #000;letter-spacing:1px}' +
    '.meta{display:flex;border-bottom:1px solid #000}' +
    '.meta .imgcol{width:200px;padding:10px;border-right:1px solid #000;text-align:center}' +
    '.simg{max-width:180px;max-height:150px;object-fit:contain;border:1px solid #ccc}' +
    '.noph{color:#888;padding:28px 8px;border:1px dashed #bbb}' +
    '.meta .infocol{flex:1;padding:8px 12px}' +
    '.kv{border-collapse:collapse;width:100%}' +
    '.kv td{padding:2px 6px;vertical-align:top}' +
    '.kv .k{width:140px;font-weight:bold;color:#333}' +
    'table.items{border-collapse:collapse;width:100%}' +
    '.items th,.items td{border:1px solid #000;padding:4px 6px}' +
    '.items th{background:#eee;font-size:10px;text-align:left}' +
    '.items .rt{text-align:right}.items .ctr{text-align:center}' +
    '.sec{background:#eceef1;padding:5px 10px;font-weight:bold;border-top:1px solid #000;border-bottom:1px solid #000}' +
    '.strong td{font-weight:bold;background:#f4f4f4}' +
    '.mpos{color:#0c5132;font-weight:bold}.mneg{color:#8e1f0b;font-weight:bold}' +
    '.foot{text-align:center;padding:6px;font-size:10px;border-top:1px solid #000}' +
    '@media print{.bar{display:none}body{padding:0}.sheet{border:none;max-width:none}}' +
    '</style></head><body>' +
    '<div class="bar"><button onclick="window.print()" class="p">Print</button><button onclick="window.close()">Close</button></div>' +
    '<div class="sheet">' +
    '<div class="hd"><h1>' + esc(PRINT_CO.name) + '</h1>' +
    '<div>' + esc(PRINT_CO.reg) + '</div><div>' + esc(PRINT_CO.works) + '</div></div>' +
    '<div class="title">STYLE COSTING — ' + esc(rec.no) + '</div>' +
    '<div class="meta">' +
    '<div class="imgcol"><div style="font-weight:bold;margin-bottom:6px">Style Image</div>' + img + '</div>' +
    '<div class="infocol"><table class="kv">' +
    kv('Costing No', esc(rec.no)) +
    kv('Date', esc(dpToDisplay(rec.date) || rec.date || '')) +
    kv('Style', esc(o.style || '')) +
    kv('Style Description', esc(o.styleDescription || '')) +
    kv('Brand', esc(o.brand || '')) +
    kv('Label', esc(o.label || '')) +
    kv('Order Qty', fmtNum(o.totalQty || 0)) +
    kv('Fabric Quality', esc(o.fabricQuality || '')) +
    kv('Trim Fabric', esc(o.trimFabric || '')) +
    kv('Wash Type', esc(o.washType || '')) +
    kv('Production Factory', esc(o.factory || '')) +
    kv('Size and Ratio', esc(o.sizeRatio || '')) +
    kv('SAM', fmtNum(o.sam || 0)) +
    kv('FOB', fmtINR(x.fob)) +
    '</table></div>' +
    '</div>' +
    '<div class="sec">Fabric Cost Breakup</div>' +
    '<table class="items"><thead><tr><th>Sr. No.</th><th>Particulars</th><th class="rt">Cons/pcs</th><th>UOM</th><th class="rt">Rate</th><th class="rt">Wastage %</th><th class="rt">Cost</th></tr></thead>' +
    '<tbody>' + bomRows(rec.fabric) + '</tbody></table>' +
    '<div class="sec">Trims Cost Breakup</div>' +
    '<table class="items"><thead><tr><th>Sr. No.</th><th>Particulars</th><th class="rt">Cons/pcs</th><th>UOM</th><th class="rt">Rate</th><th class="rt">Wastage %</th><th class="rt">Cost</th></tr></thead>' +
    '<tbody>' + bomRows(rec.sewing) + '</tbody></table>' +
    '<div class="sec">Cost Break Up</div>' +
    '<table class="items"><thead><tr><th>Field</th><th class="rt">Cost/pcs</th><th class="rt">% FOB</th></tr></thead><tbody>' +
    x.rows.map(function (r) {
      const cls = r.strong ? ' class="strong"' : '';
      const mcls = r.label === 'Margin' ? (r.cost < 0 ? ' mneg' : ' mpos') : '';
      return '<tr' + cls + '><td>' + esc(r.label) + '</td><td class="rt' + mcls + '">' + fmt2(r.cost) + '</td><td class="rt">' + fmt2(r.pct) + '</td></tr>';
    }).join('') +
    '</tbody></table>' +
    (rec.narration ? '<div class="sec">Narration</div><div style="padding:8px 10px">' + esc(rec.narration) + '</div>' : '') +
    '<div class="foot">SUBJECT TO ' + esc(PRINT_CO.jurisdiction.toUpperCase()) + ' JURISDICTION</div>' +
    '</div></body></html>';
  const w = window.open('', '_blank');
  if (!w) return toast('Pop-up blocked — allow pop-ups to print', 'red');
  w.document.write(doc);
  w.document.close();
}
function bindTableColResize(table, key) {
  if (!table || table._colResizeBound) return;
  table._colResizeBound = true;
  table.style.tableLayout = 'fixed';
  const ths = qsa('thead th', table);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('stitchflow_colw_' + key) || '{}'); } catch (e) { saved = {}; }
  ths.forEach(function (th, i) {
    if (saved[i]) { th.style.width = saved[i]; th.style.minWidth = saved[i]; }
    const grip = document.createElement('span');
    grip.className = 'col-grip';
    grip.title = 'Drag to resize column';
    th.appendChild(grip);
    grip.addEventListener('mousedown', function (e) {
      e.preventDefault(); e.stopPropagation();
      const sx = e.pageX, sw = th.getBoundingClientRect().width;
      grip.classList.add('on');
      document.body.classList.add('col-resizing');
      function mv(ev) {
        const w = Math.max(32, Math.round(sw + ev.pageX - sx));
        th.style.width = w + 'px';
        th.style.minWidth = w + 'px';
        th.style.maxWidth = w + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up);
        document.body.classList.remove('col-resizing');
        grip.classList.remove('on');
        const map = {};
        ths.forEach(function (h, j) { if (h.style.width) map[j] = h.style.width; });
        try { localStorage.setItem('stitchflow_colw_' + key, JSON.stringify(map)); } catch (err) { }
      }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    });
  });
}
function afterRenderCosting(rec) {
  buildBreakupTable();
  bindCostingImage();
  if (rec && (rec.id || rec._repeat)) applyCostingData(rec);
  else {
    seedDefaultCostingRows();
    recalcAll();
  }
  bindCostingExcelNav();
  bindTableColResize($('fabricBomTable'), 'cost-fabric');
  bindTableColResize($('sewingBomTable'), 'cost-trims');
  bindTableColResize($('breakupTable'), 'cost-breakup');
}

/* Excel-style keyboard / paste / fill-handle — scoped to costing sheets */
let COSTING_NAV_BOUND = false;
function bindCostingExcelNav() {
  if (COSTING_NAV_BOUND) return;
  COSTING_NAV_BOUND = true;
  const root = document;
  let lastKeyTab = false;
  function isEditable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.type === 'file' || el.type === 'hidden') return false;
    if (el.offsetParent === null) return false;
    return true;
  }
  function scopeCells(t) {
    const tbody = t.closest('tbody');
    if (tbody) return Array.prototype.slice.call(tbody.querySelectorAll('input,select,textarea')).filter(isEditable);
    const grid = t.closest('.xl-grid');
    if (grid) return Array.prototype.slice.call(grid.querySelectorAll('input,select,textarea')).filter(isEditable);
    return [];
  }
  function findVertical(cells, idx, down) {
    const r = cells[idx].getBoundingClientRect();
    const cx = r.left + r.width / 2;
    let best = null, bestD = Infinity;
    for (let i = 0; i < cells.length; i++) {
      if (i === idx) continue;
      const b = cells[i].getBoundingClientRect();
      if (Math.abs((b.left + b.width / 2) - cx) >= 14) continue;
      const d = down ? (b.top - r.bottom) : (r.top - b.bottom);
      if (d > -2 && d < bestD) { bestD = d; best = cells[i]; }
    }
    return best;
  }
  function findHorizontal(cells, idx, right) {
    const r = cells[idx].getBoundingClientRect();
    const cy = r.top + r.height / 2;
    let best = null, bestD = Infinity;
    for (let i = 0; i < cells.length; i++) {
      if (i === idx) continue;
      const b = cells[i].getBoundingClientRect();
      if (Math.abs((b.top + b.height / 2) - cy) >= 16) continue;
      const d = right ? (b.left - r.right) : (r.left - b.right);
      if (d > -2 && d < bestD) { bestD = d; best = cells[i]; }
    }
    return best;
  }
  function coerceFor(inp, val) {
    if (inp.type !== 'number') return val;
    const n = parseFloat(String(val).replace(/[^0-9.\\-]/g, ''));
    return isNaN(n) ? '' : n;
  }
  function applyCellValue(inp, val) {
    if (!inp) return;
    const v = coerceFor(inp, val);
    if (inp.dataset && inp.dataset.cbInput) {
      const id = inp.dataset.cbInput;
      const c = CBOX[id];
      const raw = String(v == null ? '' : v).trim();
      const exact = c && c.opts.find(function (o) { return String(o.v) === raw || String(o.l) === raw; });
      if (exact) pickCbox(id, exact.v, exact.l);
      else if (c) { inp.value = (c.display != null && c.val) ? c.display : c.val; }
      return;
    }
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function pasteBOM(t, txt) {
    const tr = t.closest('tr'), tbody = tr.closest('tbody');
    const tbodyId = tbody.id;
    const tplFn = tbodyId === 'fabricBody' ? fabricRowTpl : sewingRowTpl;
    const rows = txt.split(/\r?\n/)
      .map(function (l) { return l.split('\t').map(function (x) { return x.trim(); }); })
      .filter(function (c) { return c.some(function (x) { return x !== ''; }); });
    if (!rows.length) return;
    const allRows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    const startRow = allRows.indexOf(tr);
    const startCol = Array.prototype.indexOf.call(tr.querySelectorAll('td'), t.closest('td'));
    rows.forEach(function (cells, ri) {
      let trg = allRows[startRow + ri];
      if (!trg) { addRow(tbodyId, tplFn); trg = tbody.lastElementChild; }
      const tds = trg.querySelectorAll('td');
      cells.forEach(function (val, ci) {
        const td = tds[startCol + ci]; if (!td) return;
        const inp = td.querySelector('input');
        if (!inp || inp.readOnly || inp.disabled || inp.type === 'file') return;
        applyCellValue(inp, val);
      });
    });
  }
  let fillState = null;
  function hideFillHandle() {
    qsa('.fh').forEach(function (h) { h.remove(); });
    qsa('.fh-cell').forEach(function (td) { td.classList.remove('fh-cell'); });
  }
  function clearFillHl() { qsa('td.fill-hl').forEach(function (td) { td.classList.remove('fill-hl'); }); }
  function paintFillHl() {
    if (!fillState) return;
    const r0 = Math.min(fillState.startRow, fillState.curRow), r1 = Math.max(fillState.startRow, fillState.curRow);
    const c0 = Math.min(fillState.startCol, fillState.curCol), c1 = Math.max(fillState.startCol, fillState.curCol);
    for (let r = r0; r <= r1; r++) {
      const tr = fillState.rowsArr[r]; if (!tr) continue;
      const tds = tr.querySelectorAll('td');
      for (let c = c0; c <= c1; c++) { if (tds[c]) tds[c].classList.add('fill-hl'); }
    }
  }
  function applyFill() {
    if (!fillState) return;
    const st = fillState;
    const r0 = Math.min(st.startRow, st.curRow), r1 = Math.max(st.startRow, st.curRow);
    const c0 = Math.min(st.startCol, st.curCol), c1 = Math.max(st.startCol, st.curCol);
    for (let r = r0; r <= r1; r++) {
      const tr = st.rowsArr[r]; if (!tr) continue;
      const tds = tr.querySelectorAll('td');
      for (let c = c0; c <= c1; c++) {
        const td = tds[c]; if (!td) continue;
        const inp = td.querySelector('input');
        if (!inp || inp.readOnly || inp.disabled || inp.type === 'file') continue;
        let val = st.startVal;
        if (st.ctrl && st.isNum) val = String(st.startNum + (r - st.startRow) + (c - st.startCol));
        if (String(inp.value) !== String(val)) applyCellValue(inp, val);
      }
    }
  }
  function startFill(e, handle, inp, td) {
    if (!e.isPrimary) return;
    e.preventDefault();
    const tbody = td.closest('tbody');
    const trs = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    const startVal = inp.value;
    const num = parseFloat(String(startVal).replace(/[^0-9.\\-]/g, ''));
    fillState = {
      tbody: tbody, rowsArr: trs,
      startRow: trs.indexOf(td.closest('tr')),
      startCol: Array.prototype.indexOf.call(td.closest('tr').querySelectorAll('td'), td),
      curRow: 0, curCol: 0, startVal: startVal,
      ctrl: e.ctrlKey || e.metaKey,
      isNum: String(startVal).trim() !== '' && !isNaN(num),
      startNum: num
    };
    fillState.curRow = fillState.startRow; fillState.curCol = fillState.startCol;
    document.body.classList.add('filling');
    const move = function (ev) {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const tdel = el && el.closest ? el.closest('td') : null;
      clearFillHl();
      if (tdel && tdel.closest('tbody') === fillState.tbody) {
        fillState.curRow = fillState.rowsArr.indexOf(tdel.closest('tr'));
        fillState.curCol = Array.prototype.indexOf.call(tdel.closest('tr').querySelectorAll('td'), tdel);
        paintFillHl();
      }
    };
    const up = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      applyFill(); clearFillHl();
      document.body.classList.remove('filling');
      fillState = null; recalcAll();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }
  function showFillHandle(t) {
    hideFillHandle();
    const td = t.closest ? t.closest('td') : null;
    if (!td || !td.closest('table.xl-table') || t.readOnly || t.disabled || t.type === 'file') return;
    td.classList.add('fh-cell');
    const h = document.createElement('div');
    h.className = 'fh';
    td.appendChild(h);
    h.addEventListener('pointerdown', function (e) { startFill(e, h, t, td); });
    h.addEventListener('mousedown', function (e) { e.preventDefault(); });
  }
  root.addEventListener('keydown', function (e) {
    const t = e.target;
    if (!t.closest || !(t.closest('table.xl-table') || t.closest('.xl-grid'))) return;
    if (e.key === 'Tab') { lastKeyTab = true; return; }
    if (!t.matches || !t.matches('input,textarea,select') || (t.type && t.type === 'file')) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (e.key === 'ArrowLeft' && t.selectionStart !== 0) return;
      if (e.key === 'ArrowRight' && t.selectionEnd !== t.value.length) return;
      e.preventDefault();
      const cells = scopeCells(t);
      const idx = cells.indexOf(t);
      if (idx === -1) return;
      let nxt = (e.key === 'ArrowUp' || e.key === 'ArrowDown')
        ? findVertical(cells, idx, e.key === 'ArrowDown')
        : findHorizontal(cells, idx, e.key === 'ArrowRight');
      if (!nxt && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && cells.length > 1) {
        nxt = e.key === 'ArrowRight' ? cells[(idx + 1) % cells.length] : cells[(idx - 1 + cells.length) % cells.length];
      }
      if (!nxt) return;
      nxt.focus(); try { if (nxt.select) nxt.select(); } catch (err) { }
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const cells = scopeCells(t);
    const idx = cells.indexOf(t);
    if (idx === -1) return;
    let nxt = findVertical(cells, idx, true);
    if (!nxt) {
      const tbody = t.closest('tbody');
      if (tbody && (tbody.id === 'fabricBody' || tbody.id === 'sewingBody')) {
        addRow(tbody.id, tbody.id === 'fabricBody' ? fabricRowTpl : sewingRowTpl);
        recalcAll();
        const nw = tbody.lastElementChild.querySelector('[data-f="' + (t.dataset.f || '') + '"]');
        if (nw) { nw.focus(); try { nw.select(); } catch (err) { } }
        return;
      }
      nxt = cells[idx + 1] || cells[0];
    }
    if (nxt) { nxt.focus(); try { if (nxt.select) nxt.select(); } catch (err) { } }
  });
  root.addEventListener('focusin', function (e) {
    const t = e.target;
    if (lastKeyTab && t.matches && t.matches('input,select,textarea')) {
      lastKeyTab = false;
      try { if (t.select) t.select(); } catch (err) { }
    }
    if (!document.body.classList.contains('filling') && t.closest && t.closest('table.xl-table')) showFillHandle(t);
  });
  root.addEventListener('focusout', function () {
    if (!document.body.classList.contains('filling')) hideFillHandle();
  });
  root.addEventListener('mousedown', function () { lastKeyTab = false; });
  root.addEventListener('paste', function (e) {
    const t = e.target;
    if (!t.matches || !t.matches('input') || t.type === 'file') return;
    if (!(t.closest('table.xl-table') || t.closest('.xl-grid'))) return;
    const txt = ((e.clipboardData || window.clipboardData).getData('text/plain') || '');
    if (!/[\t\n]/.test(txt)) return;
    const tbody = t.closest('tbody');
    if (tbody && (tbody.id === 'fabricBody' || tbody.id === 'sewingBody')) {
      e.preventDefault(); pasteBOM(t, txt); recalcAll(); return;
    }
    const parts = txt.split(/[\t\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length < 2) return;
    const cells = scopeCells(t);
    const idx = cells.indexOf(t);
    if (idx === -1) return;
    e.preventDefault();
    for (let i = idx, j = 0; i < cells.length && j < parts.length; i++, j++) {
      applyCellValue(cells[i], parts[j]);
    }
    recalcAll();
  });
  window.addEventListener('scroll', hideFillHandle, true);
  window.addEventListener('resize', hideFillHandle);
}


