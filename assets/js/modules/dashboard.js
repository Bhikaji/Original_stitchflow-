/**
 * StitchFlow ERP — Production & Sales Dashboard and Summary Engine
 * File: assets/js/modules/dashboard.js
 */

/* =====================================================================
   FABRIC & TRIMS INWARD/OUTWARD SUMMARY REPORT ENGINE & DASHBOARD WIDGET
   ===================================================================== */
function sfGetItemRate(name, inwardNo) {
  const clean = String(name || '').trim().toLowerCase();
  if (inwardNo) {
    const inw = inwardByNo(inwardNo);
    if (inw) {
      const it = (inw.items || []).find(x => String(x.name || '').trim().toLowerCase() === clean);
      if (it) {
        const r = pf(it.poRate != null ? it.poRate : it.rate);
        if (r > 0) return r;
      }
    }
  }
  for (let i = 0; i < (db.inward || []).length; i++) {
    const inw = db.inward[i];
    const it = (inw.items || []).find(x => String(x.name || '').trim().toLowerCase() === clean);
    if (it) {
      const r = pf(it.poRate != null ? it.poRate : it.rate);
      if (r > 0) return r;
    }
  }
  const mi = (db.masters.items || []).find(x => String(x.name || '').trim().toLowerCase() === clean);
  if (mi) {
    const r = pf(mi.purchase_rate || mi.item_rate || 0);
    if (r > 0) return r;
  }
  return 0;
}

function fabricValuation() {
  let val = 0;
  (db.inward || []).forEach(inw => {
    if (inw.status && /cancel|reject/i.test(inw.status)) return;
    (inw.items || []).forEach(i => {
      if (isFabricItem(i.name, i.category, i.classification) && pf(i.recQty) > 0) {
        val += pf(i.recQty) * pf(i.poRate != null ? i.poRate : i.rate);
      }
    });
  });
  (db.jobwork || []).forEach(j => {
    (j.issues || []).concat(j.extras || []).forEach(i => {
      if (i.item && isFabricItem(i.item, i.category, i.classification)) {
        const r = sfGetItemRate(i.item, i.inwardNo);
        val -= pf(i.actualQty != null && i.actualQty !== '' ? i.actualQty : i.qty) * r;
      }
    });
  });
  return Math.max(0, Math.round(val));
}

function trimsValuation() {
  let val = 0;
  (db.inward || []).forEach(inw => {
    if (inw.status && /cancel|reject/i.test(inw.status)) return;
    (inw.items || []).forEach(i => {
      if (!isFabricItem(i.name, i.category, i.classification) && pf(i.recQty) > 0) {
        val += pf(i.recQty) * pf(i.poRate != null ? i.poRate : i.rate);
      }
    });
  });
  (db.jobwork || []).forEach(j => {
    (j.issues || []).concat(j.extras || []).forEach(i => {
      if (i.item && !isFabricItem(i.item, i.category, i.classification)) {
        const r = sfGetItemRate(i.item, i.inwardNo);
        val -= pf(i.actualQty != null && i.actualQty !== '' ? i.actualQty : i.qty) * r;
      }
    });
  });
  return Math.max(0, Math.round(val));
}

function openReportType(type, from, to) {
  repState.type = type;
  if (from) repState.from = from;
  if (to) repState.to = to;
  repState.page = 1;
  go('reports');
}

function buildSummaryInOutReport(type, from, to) {
  const isFab = (type === 'fabric_inout_summary');
  const title = isFab ? 'Fabric Inward and Outward Summary Report' : 'Trims Inward and Outward Summary Report';

  let header = [];
  if (isFab) {
    header = [
      'Date',
      'Opening Qty Meter',
      'Opening Value Rs.',
      'Inward Qty Meter',
      'Inward Value Rs.',
      'Outward Qty Meter',
      'Outward Value Rs.',
      'Closing Qty Meter',
      'Closing Value Rs.'
    ];
  } else {
    header = [
      'Date',
      'Opening Value Rs.',
      'Inward Value Rs.',
      'Outward Value Rs.',
      'Closing Value Rs.'
    ];
  }

  const fFrom = from || defaultFrom();
  const fTo = to || today();

  let curOpenQty = 0;
  let curOpenVal = 0;
  const daily = {};

  // 1. Inward
  (db.inward || []).forEach(inw => {
    if (inw.status && /cancel|reject/i.test(inw.status)) return;
    const d = inw.date || '';
    const isOpeningStock = (inw.entryType === 'Opening Stock');
    (inw.items || []).forEach(it => {
      const nm = it.name || '';
      const isF = isFabricItem(nm, it.category, it.classification);
      if (isFab ? !isF : isF) return;
      const q = pf(it.recQty);
      if (q <= 0) return;
      let r = pf(it.poRate != null ? it.poRate : it.rate);
      if (r <= 0) r = sfGetItemRate(nm, inw.no);
      const v = q * r;

      if (d < fFrom || (isOpeningStock && d <= fFrom)) {
        curOpenQty += q;
        curOpenVal += v;
      } else if (d >= fFrom && d <= fTo) {
        if (!daily[d]) daily[d] = { inQty: 0, inVal: 0, outQty: 0, outVal: 0 };
        daily[d].inQty += q;
        daily[d].inVal += v;
      }
    });
  });

  // 2. Outward: Job Work (issues and extras)
  (db.jobwork || []).forEach(jw => {
    if (jw.status && /cancel/i.test(jw.status)) return;
    const lines = (jw.issues || []).concat(jw.extras || []);
    lines.forEach(l => {
      const nm = l.item || '';
      const isF = isFabricItem(nm, l.category, l.classification);
      if (isFab ? !isF : isF) return;
      const q = pf(l.actualQty != null && l.actualQty !== '' ? l.actualQty : l.qty);
      if (q <= 0) return;
      const d = l.date || jw.date || '';
      const r = sfGetItemRate(nm, l.inwardNo);
      const v = q * r;

      if (d < fFrom) {
        curOpenQty -= q;
        curOpenVal -= v;
      } else if (d >= fFrom && d <= fTo) {
        if (!daily[d]) daily[d] = { inQty: 0, inVal: 0, outQty: 0, outVal: 0 };
        daily[d].outQty += q;
        daily[d].outVal += v;
      }
    });
  });

  // 3. Outward: Purchase Returns
  (db.purchasereturn || []).forEach(pr => {
    if (pr.status && /cancel/i.test(pr.status)) return;
    const d = pr.date || '';
    (pr.items || []).forEach(it => {
      const nm = it.name || '';
      const isF = isFabricItem(nm, it.category, it.classification);
      if (isFab ? !isF : isF) return;
      const q = pf(it.retQty);
      if (q <= 0) return;
      let r = pf(it.rate);
      if (r <= 0) r = sfGetItemRate(nm, pr.poRef);
      const v = q * r;

      if (d < fFrom) {
        curOpenQty -= q;
        curOpenVal -= v;
      } else if (d >= fFrom && d <= fTo) {
        if (!daily[d]) daily[d] = { inQty: 0, inVal: 0, outQty: 0, outVal: 0 };
        daily[d].outQty += q;
        daily[d].outVal += v;
      }
    });
  });

  // 4. Outward: Sample (issues and extras)
  (db.sample || []).forEach(sm => {
    if (sm.status && /cancel/i.test(sm.status)) return;
    const lines = (sm.issues || []).concat(sm.extras || []);
    lines.forEach(l => {
      const nm = l.item || '';
      const isF = isFabricItem(nm, l.category, l.classification);
      if (isFab ? !isF : isF) return;
      const q = pf(l.actualQty != null && l.actualQty !== '' ? l.actualQty : l.qty);
      if (q <= 0) return;
      const d = l.date || sm.date || '';
      const r = sfGetItemRate(nm, l.inwardNo);
      const v = q * r;

      if (d < fFrom) {
        curOpenQty -= q;
        curOpenVal -= v;
      } else if (d >= fFrom && d <= fTo) {
        if (!daily[d]) daily[d] = { inQty: 0, inVal: 0, outQty: 0, outVal: 0 };
        daily[d].outQty += q;
        daily[d].outVal += v;
      }
    });
  });

  // Calendar day iteration from fFrom to fTo
  const rows = [];
  const rawRows = [];
  const start = new Date(fFrom);
  const end = new Date(fTo);
  let totInQ = 0, totInV = 0, totOutQ = 0, totOutV = 0;
  let dayCount = 0;

  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
    const cur = new Date(start);
    while (cur <= end) {
      const iso = dpISO(cur);
      const dispDate = dpToDisplay(iso) || iso;
      const act = daily[iso] || { inQty: 0, inVal: 0, outQty: 0, outVal: 0 };
      const inQ = act.inQty, inV = act.inVal, outQ = act.outQty, outV = act.outVal;
      const clsQ = curOpenQty + inQ - outQ;
      const clsV = curOpenVal + inV - outV;

      if (isFab) {
        rows.push([
          dispDate,
          fmtInventoryNum(curOpenQty),
          fmtInventoryNum(curOpenVal),
          fmtInventoryNum(inQ),
          fmtInventoryNum(inV),
          fmtInventoryNum(outQ),
          fmtInventoryNum(outV),
          fmtInventoryNum(clsQ),
          fmtInventoryNum(clsV)
        ]);
        rawRows.push({
          date: dispDate, iso: iso,
          openQ: curOpenQty, openV: curOpenVal,
          inQ: inQ, inV: inV,
          outQ: outQ, outV: outV,
          clsQ: clsQ, clsV: clsV
        });
      } else {
        rows.push([
          dispDate,
          fmtInventoryNum(curOpenVal),
          fmtInventoryNum(inV),
          fmtInventoryNum(outV),
          fmtInventoryNum(clsV)
        ]);
        rawRows.push({
          date: dispDate, iso: iso,
          openV: curOpenVal,
          inV: inV,
          outV: outV,
          clsV: clsV
        });
      }

      totInQ += inQ;
      totInV += inV;
      totOutQ += outQ;
      totOutV += outV;
      curOpenQty = clsQ;
      curOpenVal = clsV;
      dayCount++;

      cur.setDate(cur.getDate() + 1);
    }
  }

  const avgInQ = dayCount > 0 ? Math.round(totInQ / dayCount) : 0;
  const avgInV = dayCount > 0 ? Math.round(totInV / dayCount) : 0;
  const avgOutQ = dayCount > 0 ? Math.round(totOutQ / dayCount) : 0;
  const avgOutV = dayCount > 0 ? Math.round(totOutV / dayCount) : 0;

  let footTotal = [];
  let footAvg = [];
  if (isFab) {
    footTotal = [
      'Total :',
      '',
      '',
      fmtInventoryNum(totInQ),
      fmtInventoryNum(totInV),
      fmtInventoryNum(totOutQ),
      fmtInventoryNum(totOutV),
      fmtInventoryNum(curOpenQty),
      fmtInventoryNum(curOpenVal)
    ];
    footAvg = [
      'Average :',
      '',
      '',
      fmtInventoryNum(avgInQ),
      fmtInventoryNum(avgInV),
      fmtInventoryNum(avgOutQ),
      fmtInventoryNum(avgOutV),
      '',
      ''
    ];
  } else {
    footTotal = [
      'Total :',
      '',
      fmtInventoryNum(totInV),
      fmtInventoryNum(totOutV),
      fmtInventoryNum(curOpenVal)
    ];
    footAvg = [
      'Average :',
      '',
      fmtInventoryNum(avgInV),
      fmtInventoryNum(avgOutV),
      ''
    ];
  }

  return {
    isSummary: true,
    isFabric: isFab,
    title: title,
    header: header,
    rows: rows,
    rawRows: rawRows,
    foot: footTotal,
    footAvg: footAvg,
    summary: {
      from: fFrom, to: fTo, dayCount: dayCount,
      totalInQty: totInQ, totalInVal: totInV,
      totalOutQty: totOutQ, totalOutVal: totOutV,
      closingQty: curOpenQty, closingVal: curOpenVal,
      avgInQty: avgInQ, avgInVal: avgInV,
      avgOutQty: avgOutQ, avgOutVal: avgOutV
    }
  };
}

function renderSummaryReportBody(el, rep, from, to) {
  if (!el) return;
  ensureSummaryReportStyles();
  const s = rep.summary;
  const dispFrom = dpToDisplay(from) || from;
  const dispTo = dpToDisplay(to) || to;
  const isFab = !!rep.isFabric;
  const ribbonTitle = esc(rep.title) + ' ' + dispFrom + ' and ' + dispTo;

  let kpiHtml = '';
  if (isFab) {
    kpiHtml =
      '<div class="dash-kpis summary-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px">' +
      '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Inward Qty</span>' +
      '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a">' + fmtInventoryNum(s.totalInQty) + ' (Meter)</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Value: ₹' + fmtInventoryNum(s.totalInVal) + '</span>' +
      '</div>' +
      '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Outward Qty</span>' +
      '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a">' + fmtInventoryNum(s.totalOutQty) + ' (Meter)</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Value: ₹' + fmtInventoryNum(s.totalOutVal) + '</span>' +
      '</div>' +
      '<div class="dash-kpi highlight" style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#854d0e;text-transform:uppercase;letter-spacing:0.5px">CLOSING</span>' +
      '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#713f12">' + fmtInventoryNum(s.closingQty) + ' (Meter)</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#854d0e">Value: ₹' + fmtInventoryNum(s.closingVal) + '</span>' +
      '</div>' +
      '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Daily Averages</span>' +
      '<span class="dash-kpi-val" style="font-size:15px;font-weight:800;color:#0f172a">In: ' + fmtInventoryNum(s.avgInQty) + ' (Meter) · Out: ' + fmtInventoryNum(s.avgOutQty) + ' (Meter)</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Across ' + s.dayCount + ' continuous days</span>' +
      '</div>' +
      '</div>';
  } else {
    kpiHtml =
      '<div class="dash-kpis summary-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px">' +
      '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Inward Value</span>' +
      '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a">₹' + fmtInventoryNum(s.totalInVal) + '</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Daily average: ₹' + fmtInventoryNum(s.avgInVal) + '</span>' +
      '</div>' +
      '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Outward Value</span>' +
      '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a">₹' + fmtInventoryNum(s.totalOutVal) + '</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Daily average: ₹' + fmtInventoryNum(s.avgOutVal) + '</span>' +
      '</div>' +
      '<div class="dash-kpi highlight" style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px">Closing Value</span>' +
      '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#1e3a8a">₹' + fmtInventoryNum(s.closingVal) + '</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#1e40af">Total active trims valuation</span>' +
      '</div>' +
      '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
      '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Timeframe</span>' +
      '<span class="dash-kpi-val" style="font-size:12px;font-weight:800;color:#0f172a;white-space:nowrap">' + dispFrom + ' → ' + dispTo + '</span>' +
      '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">' + s.dayCount + ' continuous days</span>' +
      '</div>' +
      '</div>';
  }

  const tableHtml = buildSummaryExcelTableHtml(rep);

  el.innerHTML =
    '<div class="sec-banner" style="padding:12px 16px;background:linear-gradient(to right, #fefce8, #ffffff);border:1px solid #fef08a;border-radius:8px;margin-bottom:14px">' +
    '<div class="sec-title" style="font-size:15px;font-weight:700;color:#854d0e">' + ribbonTitle + '</div>' +
    '<div class="sec-sub" style="font-size:12px;color:#a16207;margin-top:3px">Continuous daily opening balance, inward receipts, outward issues across Job Work, Purchase Returns &amp; Samples, and closing inventory valuation</div>' +
    '</div>' +
    kpiHtml +
    '<div class="excel-title-ribbon" style="background:#f8cbac;color:#000;font-weight:800;font-size:13.5px;text-align:center;padding:9px 14px;border:1px solid #777;border-bottom:none;border-radius:6px 6px 0 0;box-sizing:border-box;letter-spacing:0.2px">' + ribbonTitle + '</div>' +
    tableHtml;
}

function ensureSummaryReportStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('sf-excel-summary-styles')) return;
  const st = document.createElement('style');
  st.id = 'sf-excel-summary-styles';
  st.textContent =
    '.dash-summary-panel{background:#fff!important;border:1px solid #d1d5db!important;border-radius:12px!important;padding:18px 20px!important;margin:18px 0 24px 0!important;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)!important;box-sizing:border-box!important}' +
    '.dash-trims-inventory-row{display:grid!important;grid-template-columns:minmax(0,50fr) minmax(0,50fr)!important;gap:0 18px!important;align-items:start!important}' +
    '.dash-trims-inventory-row>div{min-width:0!important}' +
    '.dash-inventory-panel{min-width:0!important;max-width:100%!important;overflow:visible!important}' +
    '.dash-inventory-panel .dash-table-wrap{width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important}' +
    '.dash-inventory-panel .summary-report-table{display:table!important;table-layout:fixed!important;width:100%!important;min-width:520px!important;max-width:none!important;font-size:11px!important}' +
    '.dash-inventory-panel .summary-report-table th:nth-child(1),.dash-inventory-panel .summary-report-table td:nth-child(1){width:40%!important}' +
    '.dash-inventory-panel .summary-report-table th:nth-child(2),.dash-inventory-panel .summary-report-table td:nth-child(2){width:20%!important}' +
    '.dash-inventory-panel .summary-report-table th:nth-child(3),.dash-inventory-panel .summary-report-table td:nth-child(3){width:25%!important}' +
    '.dash-inventory-panel .summary-report-table th:nth-child(4),.dash-inventory-panel .summary-report-table td:nth-child(4){width:15%!important}' +
    '.dash-inventory-panel .summary-report-table th,.dash-inventory-panel .summary-report-table td{box-sizing:border-box!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-all!important;padding:5px 3px!important}' +
    '.dash-inventory-panel .summary-report-table td.num{ text-align:right!important}' +
    '@media(max-width:900px){.dash-trims-inventory-row{grid-template-columns:1fr!important}}' +
    '.dash-trims-summary-widget{min-width:0!important;width:100%!important}' +
    '.dash-trims-summary-table-wrap{overflow:hidden!important;width:100%!important;max-width:100%!important}' +
    '.summary-report-table.trims-summary-table{display:table!important;table-layout:fixed!important;width:100%!important;min-width:0!important;max-width:100%!important;font-size:13px!important}' +
    '.summary-report-table.trims-summary-table th,.summary-report-table.trims-summary-table td{box-sizing:border-box!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;padding:6px 3px!important;line-height:1.25!important}' +
    '.summary-report-table.trims-summary-table th:first-child,.summary-report-table.trims-summary-table td:first-child{width:22%!important}' +
    '.summary-report-table.trims-summary-table th:not(:first-child),.summary-report-table.trims-summary-table td:not(:first-child){width:19.5%!important}' +
    '.summary-report-table.trims-summary-table td.num{text-align:right!important;font-size:13px!important}' +
    '.dash-summary-head{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;flex-wrap:wrap!important;gap:14px!important;margin-bottom:14px!important;border-bottom:1px solid #f1f5f9!important;padding-bottom:12px!important}' +
    '.dash-summary-titles{flex:1 1 320px!important}' +
    '.dash-summary-badge{display:inline-flex!important;align-items:center!important;gap:6px!important;font-size:11px!important;font-weight:750!important;letter-spacing:0.5px!important;color:#0f766e!important;background:#f0fdfa!important;padding:3px 9px!important;border-radius:20px!important;border:1px solid #ccfbf1!important;margin-bottom:5px!important}' +
    '.dash-summary-badge.trims-badge{color:#1d4ed8!important;background:#eff6ff!important;border-color:#dbeafe!important}' +
    '.dash-summary-badge .badge-dot{width:7px!important;height:7px!important;border-radius:50%!important;background:currentColor!important;display:inline-block!important}' +
    '.dash-panel-main-title{font-size:16.5px!important;font-weight:750!important;color:#0f172a!important;margin:0 0 3px 0!important;letter-spacing:-0.2px!important}' +
    '.dash-summary-sub{font-size:12px!important;color:#64748b!important;margin:0!important}' +
    '.dash-summary-actions{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}' +
    '.dash-period-pills{display:inline-flex!important;background:#f1f5f9!important;border-radius:7px!important;padding:3px!important;gap:2px!important}' +
    '.dash-pill{border:none!important;background:transparent!important;padding:5px 11px!important;font-size:12px!important;font-weight:600!important;color:#475569!important;border-radius:5px!important;cursor:pointer!important;transition:all 0.15s ease!important;line-height:1.2!important}' +
    '.dash-pill:hover{color:#0f172a!important;background:rgba(255,255,255,0.6)!important}' +
    '.dash-pill.active{background:#fff!important;color:#0f172a!important;font-weight:750!important;box-shadow:0 1px 3px rgba(0,0,0,0.1)!important}' +
    '.dash-date-inputs{display:inline-flex!important;align-items:center!important;gap:5px!important;background:#fff!important;border:1px solid #cbd5e1!important;border-radius:7px!important;padding:2px 8px!important}' +
    '.dash-dt-inp{border:none!important;padding:3px 4px!important;font-size:12px!important;color:#1e293b!important;background:transparent!important;outline:none!important;font-family:inherit!important}' +
    '.dash-dt-sep{font-size:11px!important;font-weight:600!important;color:#94a3b8!important;text-transform:uppercase!important}' +
    '.dash-kpis{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:12px!important;margin-bottom:14px!important}' +
    '@media(max-width:900px){.dash-kpis{grid-template-columns:repeat(2,1fr)!important}}' +
    '.dash-kpi{background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:8px!important;padding:10px 14px!important;display:flex!important;flex-direction:column!important;gap:3px!important;box-sizing:border-box!important}' +
    '.dash-kpi.highlight{background:#fefce8!important;border-color:#fde047!important}' +
    '.dash-kpi-lbl{font-size:10.5px!important;font-weight:750!important;color:#64748b!important;text-transform:uppercase!important;letter-spacing:0.5px!important;display:block!important}' +
    '.dash-kpi-val{font-size:17px!important;font-weight:800!important;color:#0f172a!important;font-variant-numeric:tabular-nums!important;line-height:1.2!important;display:block!important}' +
    '.dash-kpi-sub{font-size:11.5px!important;color:#64748b!important;display:block!important}' +
    '.excel-title-ribbon{background:#f8cbac!important;color:#000!important;font-weight:800!important;font-size:13.5px!important;text-align:center!important;padding:9px 14px!important;border:1px solid #777!important;border-bottom:none!important;letter-spacing:0.2px!important;border-radius:6px 6px 0 0!important;box-sizing:border-box!important}' +
    '.dash-table-wrap{overflow-x:auto!important;border:1px solid #777!important;border-radius:0 0 6px 6px!important;background:#fff!important;box-sizing:border-box!important}' +
    '.summary-report-table.excel-style{width:100%!important;border-collapse:collapse!important;font-size:12px!important;font-variant-numeric:tabular-nums!important;background:#fff!important;margin:0!important}' +
    '.summary-report-table.excel-style th{background:#f1f5f9!important;color:#000!important;font-weight:750!important;border:1px solid #777!important;text-align:center!important;padding:6px 8px!important;vertical-align:middle!important;line-height:1.3!important}' +
    '.summary-report-table.excel-style thead tr.thead-top th.num,.summary-report-table.excel-style thead tr.thead-sub th.num{text-align:right!important}' +
    '.summary-report-table.excel-style thead tr.thead-top th.th-date{text-align:left!important}' +
    '.summary-report-table.excel-style .th-sublabel{font-size:10.5px!important;font-weight:600!important;color:#333!important;margin-top:2px!important;text-transform:none!important}' +
    '.summary-report-table.excel-style td{border:1px solid #777!important;padding:6px 8px!important;white-space:nowrap!important;color:#000!important;font-size:12px!important}' +
    '.summary-report-table.excel-style tbody tr:hover td{background:#f8fafc!important}' +
    '.summary-report-table.excel-style tbody td.td-date{font-weight:600!important;color:#0f172a!important;text-align:left!important;background:#fff!important}' +
    '.summary-report-table.excel-style tbody td.num{text-align:right!important}' +
    '.summary-report-table.excel-style tfoot tr.tot-row td,.summary-report-table.excel-style tfoot tr.avg-row td{background:#e2e8f0!important;color:#000!important;font-weight:800!important;border:1px solid #000!important;padding:6px 8px!important}' +
    '.summary-report-table.excel-style tfoot tr.tot-row td.td-tot,.summary-report-table.excel-style tfoot tr.avg-row td.td-avg{text-align:right!important;font-weight:850!important}';
  document.head.appendChild(st);
}

function buildSummaryExcelTableHtml(rep) {
  const isFab = !!rep.isFabric;
  let thead = '';
  if (isFab) {
    thead =
      '<thead>' +
      '<tr class="thead-top">' +
      '<th rowspan="2" class="th-date" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:6px 10px;text-align:left;vertical-align:middle">Date</th>' +
      '<th colspan="2" class="ctr th-open" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Opening</th>' +
      '<th colspan="2" class="ctr th-inward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Inward</th>' +
      '<th colspan="2" class="ctr th-outward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Outward</th>' +
      '<th colspan="2" class="ctr th-close" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Closing</th>' +
      '</tr>' +
      '<tr class="thead-sub">' +
      '<th class="num th-open" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Meter</th>' +
      '<th class="num th-open" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '<th class="num th-inward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Meter</th>' +
      '<th class="num th-inward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '<th class="num th-outward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Meter</th>' +
      '<th class="num th-outward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '<th class="num th-close" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Meter</th>' +
      '<th class="num th-close" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '</tr>' +
      '</thead>';
  } else {
    thead =
      '<thead>' +
      '<tr class="thead-top">' +
      '<th rowspan="2" class="th-date" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:6px 10px;text-align:left;vertical-align:middle">Date</th>' +
      '<th class="ctr th-open" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Opening</th>' +
      '<th class="ctr th-inward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Inward</th>' +
      '<th class="ctr th-outward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Outward</th>' +
      '<th class="ctr th-close" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:center">Closing</th>' +
      '</tr>' +
      '<tr class="thead-sub">' +
      '<th class="num th-open" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '<th class="num th-inward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '<th class="num th-outward" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '<th class="num th-close" style="background:#ffff00;color:#000;font-weight:750;border:1px solid #777;padding:5px 10px;text-align:right">Value (INR)</th>' +
      '</tr>' +
      '</thead>';
  }

  let tbody = '<tbody>';
  if (!rep.rows.length) {
    tbody += '<tr><td colspan="' + rep.header.length + '" style="text-align:center;color:#6b7280;padding:24px;border:1px solid #777">No transactions in selected date range</td></tr>';
  } else {
    rep.rows.forEach(r => {
      tbody += '<tr>';
      r.forEach((c, idx) => {
        const isDate = (idx === 0);
        const cellStyle = isDate
          ? 'text-align:left;font-weight:600;color:#0f172a;background:#fff;border:1px solid #777;padding:6px 10px;white-space:nowrap'
          : 'text-align:right;border:1px solid #777;padding:6px 10px;white-space:nowrap;font-variant-numeric:tabular-nums';
        tbody += '<td class="' + (isDate ? 'td-date' : 'num') + '" style="' + cellStyle + '">' + esc(c) + '</td>';
      });
      tbody += '</tr>';
    });
  }
  tbody += '</tbody>';

  const footerRow = function (cells, rowClass, labelClass) {
    const labelSpan = rep.isFabric ? 3 : 2;
    const labelStyle = 'background:#ffff00!important;color:#000!important;font-weight:850;border:1px solid #000;padding:7px 10px;text-align:right';
    const valueStyle = 'background:#ffff00!important;color:#000!important;font-weight:800;border:1px solid #000;padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums';
    return '<tr class="' + rowClass + '" style="background:#ffff00!important;color:#000!important;font-weight:800;border:1px solid #000">' +
      '<td colspan="' + labelSpan + '" class="' + labelClass + '" style="' + labelStyle + '"><b>' + (cells[0] ? esc(cells[0]) : '') + '</b></td>' +
      cells.slice(labelSpan).map(function (c) { return '<td class="num" style="' + valueStyle + '"><b>' + (c ? esc(c) : '') + '</b></td>'; }).join('') +
      '</tr>';
  };
  const tfoot =
    '<tfoot>' +
    footerRow(rep.foot, 'tot-row', 'td-tot') +
    footerRow(rep.footAvg, 'avg-row', 'td-avg') +
    '</tfoot>';
  thead = thead.replace(/#ffff00/g, '#f1f5f9');
  const neutralTfoot = tfoot.replace(/#ffff00/g, '#e2e8f0');

  const tableClass = rep.isFabric ? '' : ' trims-summary-table';
  const wrapperClass = rep.isFabric ? '' : ' dash-trims-summary-table-wrap';
  return '<div class="table-wrap dash-table-wrap' + wrapperClass + '" style="overflow:hidden;border:1px solid #777;border-radius:0 0 6px 6px;background:#fff;box-sizing:border-box">' +
    '<table class="summary-report-table excel-style' + tableClass + '" style="width:100%;border-collapse:collapse;font-size:12px;background:#fff;margin:0">' +
    thead + tbody + neutralTfoot +
    '</table>' +
    '</div>';
}

/* ---------------- DASHBOARD SEPARATE SUMMARY WIDGETS ---------------- */
let dashFabricPreset = 'month';
let dashTrimsPreset = 'month';
let dashFabricRange = calcPresetRange('month');
let dashTrimsRange = calcPresetRange('month');

function calcPresetRange(preset) {
  const t = today();
  if (preset === 'month') {
    return { from: t.slice(0, 7) + '-01', to: t };
  }
  const n = parseInt(preset, 10) || 10;
  const dt = dpParse(t) || new Date();
  const dTo = dpISO(dt);
  const dFromDt = new Date(dt);
  dFromDt.setDate(dFromDt.getDate() - (n - 1));
  return { from: dpISO(dFromDt), to: dTo };
}

function setDashFabricPeriod(p) {
  dashFabricPreset = p;
  dashFabricRange = calcPresetRange(p);
  renderDashboardFabricWidget();
}

function setDashTrimsPeriod(p) {
  dashTrimsPreset = p;
  dashTrimsRange = calcPresetRange(p);
  renderDashboardTrimsWidget();
}

function setDashFabricDates(from, to) {
  dashFabricPreset = null;
  dashFabricRange = { from, to };
  renderDashboardFabricWidget();
}

function setDashTrimsDates(from, to) {
  dashTrimsPreset = null;
  dashTrimsRange = { from, to };
  renderDashboardTrimsWidget();
}

function exportSummaryPanelCSV(kind) {
  const isFab = (kind === 'fabric');
  const range = isFab ? dashFabricRange : dashTrimsRange;
  const type = isFab ? 'fabric_inout_summary' : 'trims_inout_summary';
  const rep = buildSummaryInOutReport(type, range.from, range.to);
  const from = range.from, to = range.to;
  let csv = '';
  if (isFab) {
    csv += 'Date,Opening,,Inward,,Outward,,Closing,\n';
    csv += ',Meter,Value (INR),Meter,Value (INR),Meter,Value (INR),Meter,Value (INR)\n';
  } else {
    csv += 'Date,Opening,Inward,Outward,Closing\n';
    csv += ',Value (INR),Value (INR),Value (INR),Value (INR)\n';
  }
  csv += rep.rows.map(row => row.map(csvEsc).join(',')).join('\n') + '\n';
  if (rep.foot) csv += rep.foot.map(csvEsc).join(',') + '\n';
  if (rep.footAvg) csv += rep.footAvg.map(csvEsc).join(',') + '\n';

  try {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (isFab ? 'Fabric_Summary_' : 'Trims_Summary_') + from + '_to_' + to + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Summary CSV exported', 'green');
  } catch (e) { toast('Download blocked in preview'); }
}

function renderDashboardFabricWidget() {
  ensureSummaryReportStyles();
  const el = $('dash-fabric-summary-widget');
  if (!el) return;
  const range = dashFabricRange;
  const rep = buildSummaryInOutReport('fabric_inout_summary', range.from, range.to);
  const s = rep.summary;
  const dispFrom = dpToDisplay(range.from) || range.from;
  const dispTo = dpToDisplay(range.to) || range.to;

  const kpisHtml =
    '<div class="dash-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px">' +
    '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Report Period</span>' +
    '<span class="dash-kpi-val" style="font-size:12px;font-weight:800;color:#0f172a;line-height:1.2;white-space:nowrap">' + dispFrom + ' → ' + dispTo + '</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">' + s.dayCount + ' continuous days</span>' +
    '</div>' +
    '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Inward</span>' +
    '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2">' + fmtInventoryNum(s.totalInQty) + ' (Meter)</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Value: ₹' + fmtNum(s.totalInVal) + '</span>' +
    '</div>' +
    '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Outward</span>' +
    '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2">' + fmtNum(s.totalOutQty) + ' (Meter)</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Value: ₹' + fmtNum(s.totalOutVal) + '</span>' +
    '</div>' +
    '<div class="dash-kpi highlight" style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#854d0e;text-transform:uppercase;letter-spacing:0.5px">CLOSING</span>' +
    '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#713f12;line-height:1.2">' + fmtInventoryNum(s.closingQty) + ' (Meter)</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#854d0e">Value: ₹' + fmtInventoryNum(s.closingVal) + '</span>' +
    '</div>' +
    '</div>';

  const tableHtml = buildSummaryExcelTableHtml(rep);

  el.innerHTML =
    '<div class="dash-summary-panel dash-trims-summary-widget" style="background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:18px 20px;margin:18px 0 24px 0;box-shadow:0 1px 3px rgba(0,0,0,0.05);box-sizing:border-box">' +
    '<div class="dash-summary-head" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:12px">' +
    '<div class="dash-summary-titles" style="flex:1 1 320px">' +
    '<h3 class="dash-panel-main-title" style="font-size:16.5px;font-weight:750;color:#0f172a;margin:0 0 3px 0;letter-spacing:-0.2px">Date Wise Fabric Report (In-Out)</h3>' +
    '</div>' +
    '<div class="dash-summary-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
    '<button type="button" class="dash-pill active" onclick="dashboardDateFilter(\'fabric\', event)" title="Choose report date range">This month</button>' +
    '<button type="button" class="btn btn-sm btn-ghost" onclick="exportSummaryPanelCSV(\'fabric\')" title="Download CSV spreadsheet">' + ic('download', 14) + ' Export CSV</button>' +
    '<button type="button" class="btn btn-sm btn-primary" onclick="openReportType(\'fabric_inout_summary\', \'' + range.from + '\', \'' + range.to + '\')">Full Report →</button>' +
    '</div>' +
    '</div>' +
    kpisHtml +
    tableHtml +
    '</div>';
}

function renderDashboardTrimsWidget() {
  ensureSummaryReportStyles();
  const el = $('dash-trims-summary-widget');
  if (!el) return;
  const range = dashTrimsRange;
  const rep = buildSummaryInOutReport('trims_inout_summary', range.from, range.to);
  const s = rep.summary;
  const dispFrom = dpToDisplay(range.from) || range.from;
  const dispTo = dpToDisplay(range.to) || range.to;

  const kpisHtml =
    '<div class="dash-kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px">' +
    '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Report Period</span>' +
    '<span class="dash-kpi-val" style="font-size:12px;font-weight:800;color:#0f172a;line-height:1.2;white-space:nowrap">' + dispFrom + ' → ' + dispTo + '</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">' + s.dayCount + ' continuous days</span>' +
    '</div>' +
    '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Inward Value</span>' +
    '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2">₹' + fmtNum(s.totalInVal) + '</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Daily Avg: ₹' + fmtNum(s.avgInVal) + '</span>' +
    '</div>' +
    '<div class="dash-kpi" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Outward Value</span>' +
    '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.2">₹' + fmtNum(s.totalOutVal) + '</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#64748b">Daily Avg: ₹' + fmtNum(s.avgOutVal) + '</span>' +
    '</div>' +
    '<div class="dash-kpi highlight" style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px">' +
    '<span class="dash-kpi-lbl" style="font-size:10.5px;font-weight:750;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px">Closing Value</span>' +
    '<span class="dash-kpi-val" style="font-size:17px;font-weight:800;color:#1e3a8a;line-height:1.2">₹' + fmtInventoryNum(s.closingVal) + '</span>' +
    '<span class="dash-kpi-sub" style="font-size:11.5px;color:#1e40af">Total active trims in stock</span>' +
    '</div>' +
    '</div>';

  const tableHtml = buildSummaryExcelTableHtml(rep);

  el.innerHTML =
    '<div class="dash-summary-panel" style="background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:18px 20px;margin:18px 0 24px 0;box-shadow:0 1px 3px rgba(0,0,0,0.05);box-sizing:border-box">' +
    '<div class="dash-summary-head" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:12px">' +
    '<div class="dash-summary-titles" style="flex:1 1 320px">' +
    '<h3 class="dash-panel-main-title" style="font-size:16.5px;font-weight:750;color:#0f172a;margin:0 0 3px 0;letter-spacing:-0.2px">Date Wise Trims Report (In-Out)</h3>' +
    '</div>' +
    '<div class="dash-summary-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
    '<button type="button" class="dash-pill active" onclick="dashboardDateFilter(\'trims\', event)" title="Choose report date range">This month</button>' +
    '<button type="button" class="btn btn-sm btn-ghost" onclick="exportSummaryPanelCSV(\'trims\')" title="Download CSV spreadsheet">' + ic('download', 14) + ' Export CSV</button>' +
    '<button type="button" class="btn btn-sm btn-primary" onclick="openReportType(\'trims_inout_summary\', \'' + range.from + '\', \'' + range.to + '\')">Full Report →</button>' +
    '</div>' +
    '</div>' +
    kpisHtml +
    tableHtml +
    '</div>';
}

function dashboardSimpleTable(title, header, rows, foot) {
  const head = header.map(function (h, i) { return '<th class="' + (i ? 'num' : '') + '">' + esc(h) + '</th>'; }).join('');
  const body = rows.length ? rows.map(function (row) { return '<tr>' + row.map(function (c, i) { return '<td class="' + (i ? 'num' : '') + '">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + header.length + '" style="text-align:center;color:var(--muted)">No data available</td></tr>';
  const total = foot ? '<tfoot><tr>' + (title === 'Inventory'
    ? '<td colspan="2" class="td-tot" style="text-align:right"><b>' + esc(foot[0]) + '</b></td>' + foot.slice(2).map(function (c) { return '<td class="num"><b>' + esc(c) + '</b></td>'; }).join('')
    : foot.map(function (c, i) { return '<td class="' + (i ? 'num' : '') + '"><b>' + esc(c) + '</b></td>'; }).join('')) + '</tr></tfoot>' : '';
  const cols = title === 'Inventory' ? '<colgroup><col style="width:40%"><col style="width:20%"><col style="width:25%"><col style="width:15%"></colgroup>' : '';
  return '<div class="table-wrap dash-table-wrap"><table class="summary-report-table excel-style' + (title === 'Inventory' ? ' inventory-simple-table' : '') + '">' + cols + '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>' + total + '</table></div>';
}
function dashboardWipVendorRows() {
  const grouped = {};
  (db.jobwork || []).forEach(function (j) {
    if (j.status === 'Cancelled' || j.status === 'Closed') return;
    const orderQty = jwTotalOrder(j), fabricIssue = (j.issues || []).concat(j.extras || []).filter(function (x) { return x.item && isFabricItem(x.item); }).reduce(function (a, x) { return a + issueLineQty(x); }, 0);
    const fabricReturn = jwFabricReturned(j), actualIssue = Math.max(0, fabricIssue - fabricReturn), consumption = orderQty > 0 ? fabricIssue / orderQty : 0, garmentExpected = consumption > 0 ? Math.round(actualIssue / consumption) : 0;
    let inwardPass = 0, inwardReject = 0; const receipts = jwReceipts(j);
    if (receipts.length) receipts.forEach(function (r) { if (/reject|fail/i.test(String(r.qc || 'Pass'))) inwardReject += pf(r.qty); else inwardPass += pf(r.qty); }); else inwardPass = jwTotalReceived(j);
    const wip = Math.max(0, garmentExpected - inwardPass - inwardReject); if (!wip) return;
    const key = String(j.vendor || '—').trim() || '—', g = grouped[key] || (grouped[key] = { vendor: key, issue: 0, ret: 0, actual: 0, expected: 0, pass: 0, reject: 0, wip: 0, cons: 0 });
    g.issue += fabricIssue; g.ret += fabricReturn; g.actual += actualIssue; g.expected += garmentExpected; g.pass += inwardPass; g.reject += inwardReject; g.wip += wip; g.cons += consumption;
  });
  return Object.keys(grouped).map(function (k) { return grouped[k]; }).sort(function (a, b) { return a.vendor.localeCompare(b.vendor); });
}
function renderDashboardInventoryWidget() {
  const el = $('dash-inventory-widget'); if (!el) return;
  const fabricValue = fabricValuation(), trimsValue = trimsValuation();
  const wip = dashboardWipVendorRows().reduce(function (a, x) { return a + x.wip; }, 0), fg = (db.jobwork || []).reduce(function (a, j) { return a + jwTotalReceived(j); }, 0);
  const rows = [['Fabric Stock', 'mtr', fmtInventoryNum(fabricStock().m), fmtInventoryNum(fabricValue)], ['Trims Stock', '-', '-', fmtInventoryNum(trimsValue)], ['WIP', 'pcs', fmtInventoryNum(wip), '-'], ['FG', 'pcs', fmtInventoryNum(fg), '-']];
  const total = ['Total', '-', fmtInventoryNum(fabricStock().m + wip + fg), fmtInventoryNum(fabricValue + trimsValue)];
  el.innerHTML = '<div class="dash-summary-panel dash-inventory-panel"><div class="dash-summary-head"><div class="dash-summary-titles"><h3 class="dash-panel-main-title">Inventory</h3></div></div>' + dashboardSimpleTable('Inventory', ['Particulars', 'UOM', 'Qty', 'Value'], rows, total) + '</div>';
}
function renderDashboardWipWidget() {
  const el = $('dash-wip-widget'); if (!el) return;
  const data = dashboardWipVendorRows(), rows = data.map(function (x) { return [x.vendor, fmtInventoryNum(x.issue), fmtInventoryNum(x.ret), fmtInventoryNum(x.actual), fmtInventoryNum(x.cons), fmtInventoryNum(x.expected), fmtInventoryNum(x.pass), fmtInventoryNum(x.reject), fmtInventoryNum(x.wip), '-']; });
  const t = data.reduce(function (a, x) { a.issue += x.issue; a.ret += x.ret; a.actual += x.actual; a.expected += x.expected; a.pass += x.pass; a.reject += x.reject; a.wip += x.wip; return a; }, { issue: 0, ret: 0, actual: 0, expected: 0, pass: 0, reject: 0, wip: 0 });
  const foot = ['Total', fmtInventoryNum(t.issue), fmtInventoryNum(t.ret), fmtInventoryNum(t.actual), '', fmtInventoryNum(t.expected), fmtInventoryNum(t.pass), fmtInventoryNum(t.reject), fmtInventoryNum(t.wip), '-'];
  el.innerHTML = '<div class="dash-summary-panel"><div class="dash-summary-head"><div class="dash-summary-titles"><h3 class="dash-panel-main-title">WIP Vendor-wise</h3></div></div>' + dashboardSimpleTable('WIP Vendor-wise', ['Vendor Name', 'Fabric Issue', 'Fabric Return', 'Actual Issue', 'Cons.', 'Garment Expected', 'Garment Inward', 'Rejection', 'WIP', 'WIP mtr'], rows, foot) + '</div>';
}
function renderBothDashboardWidgets() {
  renderDashboardFabricWidget();
  renderDashboardTrimsWidget();
  renderDashboardInventoryWidget();
  renderDashboardWipWidget();
}

window.ensureSummaryReportStyles = ensureSummaryReportStyles;
window.buildSummaryExcelTableHtml = buildSummaryExcelTableHtml;
window.renderDashboardFabricWidget = renderDashboardFabricWidget;
window.renderDashboardTrimsWidget = renderDashboardTrimsWidget;
window.renderDashboardInventoryWidget = renderDashboardInventoryWidget;
window.renderDashboardWipWidget = renderDashboardWipWidget;
window.renderBothDashboardWidgets = renderBothDashboardWidgets;
window.setDashFabricPeriod = setDashFabricPeriod;
window.setDashTrimsPeriod = setDashTrimsPeriod;
window.setDashFabricDates = setDashFabricDates;
window.setDashTrimsDates = setDashTrimsDates;
window.exportSummaryPanelCSV = exportSummaryPanelCSV;
window.openReportType = openReportType;

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const poOpen = db.po.filter(r => !['Received', 'Closed', 'Cancelled', 'Rejected'].includes(r.status));
  const poTotal = poOpen.reduce((a, r) => a + sumItemAmt(r.items), 0);
  const stock = fabricStock();
  const jwActive = db.jobwork.filter(r => ['Issued', 'In Progress', 'Partially Received'].includes(r.status)).length;
  const fgRecv = db.jobwork.reduce((a, j) => a + jwTotalReceived(j), 0);
  const fgStyles = db.jobwork.reduce((a, j) => a + jwGarments(j).length, 0);
  const saleAmt = db.sale.reduce((a, r) => a + sumBy(r.items, 'amount'), 0);
  const saleDue = db.sale.filter(r => r.payStatus === 'Unpaid').length;

  const steps = [
    { k: 'po', n: db.po.length, t: 'POs Raised' },
    { k: 'inward', n: db.inward.length, t: 'Inwards Done' },
    { k: 'jobwork', n: db.jobwork.length, t: 'Job Works' },
    { k: 'sale', n: db.sale.length, t: 'Sales' }
  ];
  const maxStep = Math.max(1, ...steps.map(s => s.n));
  let flow = '';
  steps.forEach((s, i) => {
    const pct = Math.round((s.n / maxStep) * 100);
    flow += '<div class="step" onclick="go(\'' + s.k + '\')" role="button" tabindex="0">' +
      '<span class="ic">' + ic(MODULES[s.k].icon, 16) + '</span>' +
      '<div class="n">' + s.n + '</div><div class="t">' + s.t + '</div>' +
      sparkBar(pct) + '</div>';
    if (i < steps.length - 1) flow += '<div class="arrow">' + ic('chevron', 14) + '</div>';
  });

  let recent = [];
  ['po', 'inward', 'jobwork', 'sample', 'sale', 'purchasereturn'].forEach(m => (db[m] || []).forEach(r => recent.push({ m, no: r.no, date: r.date, status: r.status, key: r.supplier || r.vendor || r.customer || r.party || jwFirstStyle(r) || r.garment || '' })));
  recent = recent.sort((a, b) => (b.date + b.no) < (a.date + a.no) ? -1 : 1).slice(0, 8);

  let rh = recent.length
    ? '<div class="panel" style="margin-top:6px"><div class="table-wrap"><table class="recent"><thead><tr><th>Module</th><th>No</th><th>Date</th><th>Party / Vendor / Style</th><th>Status</th></tr></thead><tbody>' +
    recent.map(r => '<tr onclick="openForm(\'' + r.m + '\',\'' + (db[r.m].find(x => x.no === r.no) || {}).id + '\')">' +
      '<td><span class="modcell">' + ic(MODULES[r.m].icon, 16) + MODULES[r.m].label + '</span></td>' +
      '<td><b>' + esc(r.no) + '</b></td><td>' + esc(dpToDisplay(r.date) || r.date) + '</td><td>' + esc(r.key) + '</td><td>' + badge(r.status) + '</td></tr>').join('') +
    '</tbody></table></div></div>'
    : '<div class="panel"><div class="empty"><div class="big">' + ic('inbox', 26) + '</div>' +
    '<h3>No activity yet</h3><p>Start by raising a purchase order or configuring your masters.</p>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-primary" onclick="openForm(\'po\')">' + ic('plus', 16) + 'Create Purchase Order</button></div></div></div>';

  $('sidefoot').innerHTML = '<span class="dot"></span>Saved to database<div class="sf-sub">Updated ' + new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div>';

  $('content').innerHTML =
    '<div class="stats">' +
    statCard('order', 'Open PO value', fmtINR(poTotal), poOpen.length + ' of ' + db.po.length + ' POs still open', '', "go('po')") +
    statCard('box', 'Fabric in stock', fmtInventoryNum(stock.m) + '<small> (Meter)</small>', (stock.issuedM > 0 ? fmtInventoryNum(stock.issuedM) + ' m issued · ' : '') + '₹' + fmtInventoryNum(fabricValuation()) + ' value', 'green', "openReportType('fabric_inout_summary')") +
    statCard('needle', 'Trims in stock', '₹' + fmtInventoryNum(trimsValuation()) + '<small> Value</small>', trimStock().filter(t => t.balance > 0).length + '<small> items</small>', 'blue', "openReportType('trims_inout_summary')") +
    statCard('chart', 'Job works active', jwActive, db.jobwork.length + ' total job works', '', "go('jobwork')") +
    statCard('check', 'FG received', fmtNum(fgRecv) + '<small> pcs</small>', fgStyles + ' styles across job works', 'green', "go('jobwork')") +
    statCard('cash', 'Sales', fmtINR(saleAmt), '', '', "go('sale')") +
    '</div>' +
    '<div id="dash-fabric-summary-widget"></div>' +
    '<div class="dash-trims-inventory-row"><div id="dash-trims-summary-widget"></div><div id="dash-inventory-widget"></div></div>' +
    '<div id="dash-wip-widget"></div>' +
    '';

  renderBothDashboardWidgets();
}
function statCard(icon, lbl, val, extra, cls, onclick) {
  const clickable = onclick ? ' onclick="' + onclick + '" role="button" tabindex="0"' : '';
  return '<div class="stat ' + (cls || '') + (onclick ? ' clickable' : '') + '"' + clickable + '>' +
    '<span class="chip">' + (ICONS[icon] ? ic(icon, 18) : icon) + '</span>' +
    '<div class="lbl">' + lbl + '</div>' +
    '<div class="val">' + val + '</div>' +
    '<div class="extra">' + extra + '</div></div>';
}
function sparkBar(pct, tone) {
  const w = Math.max(0, Math.min(100, pct));
  return '<div class="prog ' + (tone || '') + '"><span style="width:' + w + '%"></span></div>';
}
function isFabricItem(name, category, classification) {
  const lineCategory = String(category || '').trim().toLowerCase();
  if (lineCategory) return lineCategory === 'fabric';
  const cleanClassification = String(classification || '').trim();
  if (cleanClassification) {
    const parent = typeof parentOf === 'function' ? parentOf('classifications', cleanClassification) : '';
    const classificationCategory = String(parent || cleanClassification).trim().toLowerCase();
    if (classificationCategory === 'fabric') return true;
    if (classificationCategory === 'trims' || classificationCategory === 'packaging' || classificationCategory === 'other') return false;
  }
  const cleanName = String(bareItemName(name) || '').trim().toLowerCase();
  const it = db.masters.items.find(x => String(x.name || '').trim().toLowerCase() === cleanName);
  if (it) return String(it.category || '').trim().toLowerCase() === 'fabric';
  return /fabric/i.test(String(name));
}
function jwFabricTotal(j) {
  return (j.issues || []).concat(j.extras || []).filter(i => i.item && isFabricItem(i.item, i.category)).reduce((a, i) => a + pf(i.qty), 0);
}
function jwFabricUnit(j) {
  const it = (j.issues || []).find(i => i.item && isFabricItem(i.item, i.category) && i.unit);
  return it ? it.unit : 'm';
}
function jwGarments(j) { return Array.isArray(j.garments) ? j.garments : []; }
function jwReceipts(j) { return Array.isArray(j.receipts) ? j.receipts : []; }
function jwTotalOrder(j) { const gs = jwGarments(j); return gs.length ? sumBy(gs, 'orderQty') : pf(j.orderQty); }
function jwTotalReceived(j) {
  const rxs = jwReceipts(j);
  if (rxs.length) return sumBy(rxs, 'qty');
  // Empty receipts list means FG was fully removed — do not fall back to stale garment.receivedQty
  if (Array.isArray(j.receipts)) return 0;
  return jwGarments(j).length ? sumBy(jwGarments(j), 'receivedQty') : pf(j.receivedQty);
}
function jwConsumed(j) { return sumBy(jwReceipts(j), 'consumption'); }
/* fabric the job worker sent back to us against this job work */
function jwFabricReturned(j) {
  let tot = 0;
  const scan = function (r) {
    if (r.jwRef !== j.no) return;
    (r.items || []).forEach(function (i) {
      if (!i.name || !isFabricItem(i.name, i.category)) return;
      tot += pf(i.retQty) + pf(i.recQty);
    });
  };
  db.jobworkreturn.forEach(scan);
  db.inward.filter(function (r) { return r.entryType === 'Job Work Return'; }).forEach(scan);
  return tot;
}
/* fabric actually consumed at the job worker = issued − returned */
function jwActualFabricIssued(j) { return Math.max(0, jwFabricTotal(j) - jwFabricReturned(j)); }
/* pcs per unit of fabric planned by the work order (from Cons./Gmt) */
function jwWorkOrderCons(j) {
  const req = jwRequiredFabric(j), ord = jwTotalOrder(j);
  if (req > 0 && ord > 0) return ord / req;
  /* older records never stored requiredFabric — fall back to the planned
     Cons./Gmt on the fabric issue lines (metre per garment -> pcs per metre) */
  const consRows = (j.issues || []).filter(function (i) { return i.item && isFabricItem(i.item, i.category) && pf(i.cons) > 0; });
  if (!consRows.length) return 0;
  const avg = consRows.reduce(function (a, i) { return a + pf(i.cons); }, 0) / consRows.length;
  return avg > 0 ? 1 / avg : 0;
}
function jwRequiredFabric(j) { return sumBy(j.issues || [], 'requiredFabric'); }
function jwTotalCharges(j) { return jwGarments(j).reduce((a, g) => a + pf(g.orderQty) * pf(g.rate), 0); }
function jwFirstStyle(j) { const g = jwGarments(j).find(x => x.desc); return g ? g.desc : ''; }
function jwTrimSummary(j) {
  const map = {};
  (j.issues || []).forEach(i => {
    if (!i.item || isFabricItem(i.item, i.category)) return;
    const k = i.item + '||' + (i.unit || '');
    map[k] = map[k] || { name: i.item, unit: i.unit || '', qty: 0 };
    map[k].qty += pf(i.qty);
  });
  return Object.values(map);
}
function fabricStock() {
  let received = 0, issued = 0;
  db.inward.forEach(inw => {
    if (inw.status && /cancel|reject/i.test(inw.status)) return;
    (inw.items || []).forEach(i => {
      if (isFabricItem(i.name, i.category, i.classification) && /^(m|meter|metre|mtr)$/i.test(String(i.unit || '').trim()) && pf(i.recQty) > 0) received += pf(i.recQty);
    });
  });
  db.jobwork.forEach(j => { issued += jwFabricTotal(j); });
  return { m: Math.max(0, received - issued), receivedM: received, issuedM: issued };
}
function trimStock() {
  // per-item trims balance: received (from Inward) − issued (across all Job Work issue records)
  const recv = {}, issue = {};
  db.inward.forEach(inw => {
    if (inw.status && /cancel|reject/i.test(inw.status)) return;
    (inw.items || []).forEach(i => {
      if (i.name && !isFabricItem(i.name, i.category, i.classification) && pf(i.recQty) > 0) recv[i.name] = (recv[i.name] || 0) + pf(i.recQty);
    });
  });
  db.jobwork.forEach(j => {
    if (j.status && /cancel/i.test(j.status)) return;
    (j.issues || []).concat(j.extras || []).forEach(i => {
      if (i.item && !isFabricItem(i.item, i.category, i.classification)) issue[i.item] = (issue[i.item] || 0) + issueLineQty(i);
    });
  });
  const names = Array.from(new Set(Object.keys(recv).concat(Object.keys(issue))));
  return names.map(n => ({ name: n, received: recv[n] || 0, issued: issue[n] || 0, balance: (recv[n] || 0) - (issue[n] || 0) }));
}
function trimsChipHtml() {
  const list = trimStock().filter(x => x.issued > 0 || x.balance > 0);
  if (!list.length) return '🧷 Trims stock: <span style="opacity:.6">—</span>';
  return '🧷 Trims stock: ' + list.slice(0, 4).map(x => '<b>' + esc(x.name) + ': ' + fmtInventoryNum(x.balance) + '</b>').join(' &nbsp;·&nbsp; ') +
    (list.length > 4 ? ' <span style="opacity:.7">+' + (list.length - 4) + ' more</span>' : '');
}


