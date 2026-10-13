/**
 * StitchFlow ERP — Job Work & Finished Goods Receipt
 * File: assets/js/modules/jobwork.js
 */

/* ================= JOB WORK (multiple material issues → job-worker vendor → finished goods) ================= */
const JW_EXTRA_REASONS = ['Wastage', 'Rework', 'Shortage', 'Damage', 'Top-up', 'Sample', 'Other'];
function jwLinesByDate(arr) {
  return (arr || []).slice().sort(function (a, b) {
    const da = String(a.date || ''), db = String(b.date || '');
    if (da === db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? -1 : 1;
  });
}
function jwLastRowDate(tbodyId) {
  const rows = qsa('#' + tbodyId + ' tr').filter(function (tr) { return !tr.classList.contains('jw-dgrp'); });
  for (let i = rows.length - 1; i >= 0; i--) {
    const d = dval(qs('[data-f="date"]', rows[i]));
    if (d) return d;
  }
  return today();
}
function jwPodIdFor(tbodyId, dateIso) {
  const sampleScope = pageView && pageView.m === 'sample' && tbodyId === 'jw-extras';
  const scope = sampleScope ? 'sample-' + tbodyId : tbodyId;
  return 'grp_' + scope + '_' + String(dateIso || 'none').replace(/[^0-9A-Za-z]/g, '');
}
function jwSeedGroupPod(tbodyId, it) {
  it = it || {};
  if (!it.pod || !it.date) return;
  const id = jwPodIdFor(tbodyId, it.date);
  if (!PODDATA[id]) PODDATA[id] = { pod: it.pod, podName: it.podName || 'POD', kind: it.podKind || (/pdf/i.test(it.podName || '') || /^data:application\/pdf/i.test(it.pod) ? 'pdf' : 'image') };
}
function jwApplyGroupMeta(tbodyId, tr, row) {
  if (!row) return;
  const d = row.date || dval(qs('[data-f="date"]', tr)) || '';
  const dcEl = qs('[data-f="dcNo"]', tr);
  row.dcNo = dcEl ? String(dcEl.value || '').trim() : (row.dcNo || '');
  const lineInp = qs('[data-pod]', tr);
  const linePd = lineInp ? PODDATA[lineInp.dataset.pod] : null;
  const pd = (linePd && linePd.pod) ? linePd : PODDATA[jwPodIdFor(tbodyId, d)];
  if (pd && pd.pod) { row.pod = pd.pod; row.podName = pd.podName; row.podKind = pd.kind || ''; }
}
function jwRowGroupHasPod(tr) {
  const tb = tr && tr.closest ? tr.closest('#jw-issues, #jw-extras') : null;
  if (!tb) return false;
  const d = dval(qs('[data-f="date"]', tr)) || '';
  const pd = PODDATA[jwPodIdFor(tb.id, d)];
  return !!(pd && pd.pod);
}
function jwGroupRowsByDate(tbodyId) {
  const tb = $(tbodyId); if (!tb) return;

  /* Restore the editable row cells before rebuilding the visual groups. */
  qsa('tr.jw-dgrp', tb).forEach(function (tr) { tr.remove(); });
  qsa('.jw-merged-dispatch', tb).forEach(function (td) { td.remove(); });
  const rows = qsa('tr', tb).filter(function (tr) { return !tr.classList.contains('jw-dgrp'); });
  rows.forEach(function (tr) {
    const dateEl = qs('[data-f="date"]', tr), dcEl = qs('[data-f="dcNo"]', tr);
    const dateTd = dateEl && dateEl.closest ? dateEl.closest('td') : null;
    const dcTd = dcEl && dcEl.closest ? dcEl.closest('td') : null;
    const podTd = qs('[data-jw-group-pod]', tr);
    if (dateTd) dateTd.style.display = '';
    if (dcTd) dcTd.style.display = '';
    if (podTd) {
      podTd.style.display = '';
      podTd.rowSpan = 1;
      podTd.classList.remove('jw-merged-pod');
    }
  });
  if (!rows.length) return;

  const keyed = rows.map(function (tr, i) {
    return { tr: tr, i: i, d: dval(qs('[data-f="date"]', tr)) || '' };
  });
  keyed.sort(function (a, b) {
    if (a.d === b.d) return a.i - b.i;
    if (!a.d) return 1;
    if (!b.d) return -1;
    return a.d < b.d ? -1 : 1;
  });

  /* One issue date creates one DC. All lines in that DC share one POD. */
  const dcByDate = {};
  keyed.forEach(function (k) {
    const el = qs('[data-f="dcNo"]', k.tr);
    const v = el ? String(el.value || '').trim() : '';
    if (k.d && v && !dcByDate[k.d]) dcByDate[k.d] = v;
  });
  keyed.forEach(function (k) {
    if (!k.d) return;
    /* A new DC number is intentionally not consumed while the form is being
       created. Existing saved rows keep their number; blank rows show Pending
       and receive the next sequence only inside saveJobWork(). */
    const el = qs('[data-f="dcNo"]', k.tr);
    if (el && dcByDate[k.d]) el.value = dcByDate[k.d];
  });

  const groups = [];
  keyed.forEach(function (k) {
    let g = groups.length ? groups[groups.length - 1] : null;
    if (!g || g.date !== k.d) {
      g = { date: k.d, dc: k.d ? (dcByDate[k.d] || '') : '', rows: [] };
      groups.push(g);
    }
    g.rows.push(k.tr);
  });

  groups.forEach(function (g) {
    const podId = jwPodIdFor(tbodyId, g.date);
    g.rows.forEach(function (tr, index) {
      const dateEl = qs('[data-f="date"]', tr), dcEl = qs('[data-f="dcNo"]', tr);
      const dateTd = dateEl && dateEl.closest ? dateEl.closest('td') : null;
      const dcTd = dcEl && dcEl.closest ? dcEl.closest('td') : null;

      if (g.date) {
        /* Move the old full-width date/DC block into the table body and merge
           it vertically across all material lines for this DC. The original
           inputs stay in the DOM (hidden) so saving and stock logic are unchanged. */
        if (dateTd) dateTd.style.display = 'none';
        if (dcTd) dcTd.style.display = 'none';
        if (index === 0) {
          const merged = document.createElement('td');
          merged.className = 'jw-merged-dispatch';
          merged.rowSpan = g.rows.length;
          merged.colSpan = 2;
          merged.innerHTML =
            '<div class="jw-merge-date">' + ic('inbox', 13) + '<b>' + esc(dpToDisplay(g.date) || g.date) + '</b></div>' +
            '<div class="jw-merge-dc">' + ((pageView && pageView.m === 'sample') ? 'Sample DC No. ' : 'DC No. ') + '<b>' + esc(g.dc || ((pageView && pageView.m === 'sample') ? 'SAM — generated on Save' : 'Pending — generated on Save')) + '</b></div>' +
            '<div class="jw-merge-lines">' + g.rows.length + (g.rows.length === 1 ? ' line' : ' lines') + '</div>';
          const sr = qs('td.srcol', tr);
          if (sr && sr.parentNode) sr.parentNode.insertBefore(merged, sr.nextSibling);
          else tr.insertBefore(merged, tr.firstChild);
        }
      }

      const podCell = qs('[data-jw-group-pod]', tr);
      if (podCell) {
        if (!g.date) {
          podCell.innerHTML = '<span class="att-none">Select date</span>';
        } else if (index === 0) {
          /* One vertically merged POD cell per DC, matching the merged Date/DC
             treatment. The upload, preview and remove actions stay centered. */
          podCell.rowSpan = g.rows.length;
          podCell.classList.add('jw-merged-pod');
          podCell.innerHTML = podCellHtml(podId);
        } else {
          podCell.style.display = 'none';
          podCell.innerHTML = '';
        }
      }
      tb.appendChild(tr);
    });
  });
  renumberSr(tb);
}
function addJwIssue() {
  addRow('jw-issues', function () { return jwIssueRow({ date: today() }); });
  afterRenderIssues();
}
function addJwExtra() {
  addRow('jw-extras', function () { return jwExtraRow({ date: today() }); });
  afterRenderExtras();
}
function jwExtraRow(it) {
  it = it || {};
  const itemId = rid('jxi'), unitId = rid('jxu'), rsnId = rid('jxr'), poId = rid('jxpo'), clsId = rid('jxcl');
  jwSeedGroupPod('jw-extras', it);
  const podId = jwPodIdFor('jw-extras', it.date || '');
  return '<tr data-jw-saved="' + (it._saved ? '1' : '0') + '">' +
    srTd() +
    '<td><input class="inp" type="text" data-date autocomplete="off" readonly disabled data-f="date" value="' + esc(it.date || today()) + '"></td>' +
    '<td><input class="inp" data-f="dcNo" value="' + esc(it.dcNo || '') + '" disabled title="System generated — one DC No. per date"></td>' +
    '<td>' + cbox(clsId, { opts: db.masters.classifications, value: it.classification || (itemByName(it.item) || {}).classification || '', f: 'classification', placeholder: 'Classification', free: true, onSet: function () { jwClassChanged(clsId, itemId); } }) + '</td>' +
    '<td>' + cbox(itemId, { opts: itemOptsFor(it.classification || (itemByName(it.item) || {}).classification || ''), value: it.item || '', f: 'item', placeholder: 'Fabric / Trim', free: true, onSet: function (v) { const el = qs('[data-cb-input="' + itemId + '"]'); jwSetUnit(el, v); jwRowRefresh(el); calcJWExtras(); } }) +
    '</td>' +
    '<td>' + cbox(poId, { opts: inwardOptionsForItem(it.item), value: inwardNoForIssue(it), f: 'inwardNo', placeholder: 'Select Inward', free: false, onSet: function () { jwSyncPoRef(qs('[data-cb-input="' + poId + '"]').closest('tr')); jwRowRefresh(qs('[data-cb-input="' + poId + '"]')); } }) + '</td>' +
    '<td class="po-ref-cell"><input class="inp" data-f="poRef" value="' + esc(it.poRef || poRefFromInward(inwardNoForIssue(it))) + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-postock style="color:var(--muted);font-weight:600">' + fmtNum(inwardItemStock(inwardNoForIssue(it), it.item, stockExcept())) + '</td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="qty" value="' + (it.qty ?? '') + '" placeholder="0" oninput="jwCheckActual(this)" title="Actually issued — cannot exceed stock"></td>' +
    '<td class="uom-cell"><input class="inp" data-f="unit" value="' + esc(it.unit || itemUnit(it.item) || '') + '" placeholder="Auto" disabled></td>' +
    '<td><input class="inp" data-f="reason" value="' + esc(it.reason || '') + '" placeholder="Reason *" oninput="jwReasonCheck(this)"></td>' +
    '<td class="pod-cell" data-jw-group-pod>' + ((it.date || '') ? podCellHtml(podId) : '<span class="att-none">Select date</span>') + '</td>' +
    '<td class="actions-cell">' +
    (it._saved ? '<button type="button" class="btn-icon jw-row-edit" title="Edit this saved row" onclick="jwEditIssueRow(this)">' + ic('pencil', 15) + '</button>' : '') +
    '<button type="button" class="btn-icon danger jw-row-delete" title="Remove this row" onclick="removeRow(this);calcJWExtras();jwGroupRowsByDate(\'jw-extras\');jwRefreshSharedStock()">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
function calcJWExtras() {
  const tb = $('jw-extras'); if (!tb) return;
  const map = {};
  qsa('tr', tb).forEach(function (tr) {
    const itEl = qs('[data-f="item"]', tr);
    const item = itEl ? (itEl.dataset.cbInput ? cboxGet(itEl.dataset.cbInput) : itEl.value) : '';
    const q = pf((qs('[data-f="qty"]', tr) || {}).value);
    if (!item || q <= 0) return;
    const unEl = qs('[data-f="unit"]', tr);
    const un = unEl ? (unEl.dataset.cbInput ? cboxGet(unEl.dataset.cbInput) : unEl.value) : '';
    const k = item + '|' + un;
    map[k] = (map[k] || 0) + q;
  });
  const parts = Object.keys(map).map(function (k) {
    const p = k.split('|');
    return esc(p[0]) + ': <b>' + fmtNum(map[k]) + '</b>' + (p[1] ? ' ' + esc(p[1]) : '');
  });
  const el = $('jw-extra-totals');
  if (el) el.innerHTML = parts.length ? parts.join(' &nbsp;·&nbsp; ') : '—';
}
function afterRenderExtras() {
  dpSyncAll($('jw-extras'));
  calcJWExtras();
  qsa('#jw-extras tr').forEach(function (tr) {
    if (tr.classList.contains('jw-dgrp')) return;
    jwRowRefresh(qs('[data-f="item"]', tr) || tr);
  });
  jwGroupRowsByDate('jw-extras');
  jwLockPodRows();
  jwLockSavedRows('jw-extras');
}
function inwardByNo(no) {
  const n = String(no || '').trim();
  if (!n) return null;
  return db.inward.find(function (r) { return r.no === n; }) || null;
}
/* Inward documents that received this item (PO receipt, opening stock, JW return) */
function inwardOptionsForItem(itemName, skipTr) {
  const target = String(itemName || '').trim();
  const targetBare = bareItemName(target);
  const targetId = findMasterId(targetBare, 'items') || findMasterId(target, 'items') || '';
  const targetName = lcName(targetBare);
  if (!targetName && !targetId) return [];
  return db.inward
    .filter(function (r) {
      return (r.items || []).some(function (i) {
        const recName = String(i.name || '').trim();
        const recBare = bareItemName(recName);
        const recId = String(i.item_id || i.itemId || '');
        const nameMatch = lcName(recBare) === targetName || lcName(recName) === lcName(target) || lcName(recBare) === lcName(target) || lcName(recName) === targetName;
        const idMatch = !!targetId && !!recId && String(recId) === String(targetId);
        return (nameMatch || idMatch) && pf(i.recQty) > 0;
      });
    })
    .sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : 1; })
    .map(function (r) {
      const extra = r.entryType === 'Opening Stock' ? 'Opening Stock'
        : r.entryType === 'Job Work Return' ? ('Job Work Return' + (r.vendor ? ' \u00b7 ' + r.vendor : ''))
          : ('Against PO' + (r.poRef ? ' \u00b7 ' + r.poRef : '') + (r.supplier ? ' \u00b7 ' + r.supplier : ''));
      const available = inwardItemStock(r.no, itemName, stockExcept(skipTr));
      return { v: r.no, l: r.no + (extra ? ' \u00b7 ' + extra : '') + ' \u00b7 Stock ' + fmtNum(available) };
    });
}
function poRefFromInward(inwardNo) {
  const r = inwardByNo(inwardNo);
  if (!r) return inwardNo || '';
  return r.poRef || inwardRef(r) || r.no;
}
/* map a saved issue row onto an Inward No. (new field, or first matching inward for a legacy poRef) */
function inwardNoForIssue(it) {
  it = it || {};
  if (it.inwardNo) return it.inwardNo;
  if (it.poRef && it.item) {
    const target = String(it.item || '').trim();
    const targetBare = bareItemName(target);
    const targetId = findMasterId(targetBare, 'items') || findMasterId(target, 'items') || '';
    const hit = db.inward.find(function (r) {
      const ref = r.poRef || inwardRef(r);
      return ref === it.poRef && (r.items || []).some(function (i) {
        const recName = String(i.name || '').trim();
        const recBare = bareItemName(recName);
        const recId = String(i.item_id || i.itemId || '');
        const nameMatch = lcName(recBare) === lcName(targetBare) || lcName(recName) === lcName(target) || lcName(recBare) === lcName(target) || lcName(recName) === lcName(targetBare);
        const idMatch = !!targetId && !!recId && String(recId) === String(targetId);
        return (nameMatch || idMatch) && pf(i.recQty) > 0;
      });
    });
    if (hit) return hit.no;
  }
  return '';
}
function issueLineQty(s) {
  if (!s) return 0;
  if (s.actualQty != null && s.actualQty !== '') return pf(s.actualQty);
  return pf(s.qty);
}
function issueHitsInward(s, inwardNo, itemName) {
  if (!sameItemRef(s.item, itemName)) return false;
  return String(inwardNoForIssue(s) || '') === String(inwardNo || '');
}
function liveFormIssued(inwardNo, itemName, skipTr) {
  let q = 0;
  ['jw-issues', 'jw-extras'].forEach(function (tid) {
    const tb = $(tid); if (!tb) return;
    qsa('tr', tb).forEach(function (tr) {
      if (skipTr && tr === skipTr) return;
      const itEl = qs('[data-f="item"]', tr);
      const item = itEl ? (itEl.dataset.cbInput ? cboxGet(itEl.dataset.cbInput) : itEl.value) : '';
      if (!sameItemRef(item, itemName)) return;
      const inEl = qs('[data-f="inwardNo"]', tr);
      const no = inEl ? (inEl.dataset.cbInput ? cboxGet(inEl.dataset.cbInput) : inEl.value) : '';
      if (String(no || '') !== String(inwardNo || '')) return;
      const act = qs('[data-f="actualQty"]', tr);
      const qtyEl = qs('[data-f="qty"]', tr);
      q += pf(act ? act.value : (qtyEl && qtyEl.value));
    });
  });
  return q;
}
function stockExcept(skipTr) {
  const ex = { skipTr: skipTr || null };
  if (pageView && pageView.kind === 'form') {
    if (pageView.m === 'jobwork') ex.jwId = pageView.id || null;
    if (pageView.m === 'sample') ex.sampleId = pageView.id || null;
  }
  return ex;
}
/* Stock = Inward − Job Work − Sample − Purchase Return (this inward + item) */
function inwardItemStock(inwardNo, itemName, except) {
  const rec = inwardByNo(inwardNo);
  if (!rec) return 0;
  except = except || stockExcept();
  let q = 0;
  (rec.items || []).forEach(function (i) { if (sameItemRef(i.name, itemName)) q += pf(i.recQty); });
  (db.jobwork || []).forEach(function (j) {
    if (except.jwId && j.id === except.jwId) return;
    (j.issues || []).concat(j.extras || []).forEach(function (s) {
      if (issueHitsInward(s, inwardNo, itemName)) q -= issueLineQty(s);
    });
  });
  (db.sample || []).forEach(function (j) {
    if (except.sampleId && j.id === except.sampleId) return;
    (j.extras || []).concat(j.issues || []).forEach(function (s) {
      if (issueHitsInward(s, inwardNo, itemName)) q -= issueLineQty(s);
    });
  });
  const poRef = rec.poRef || '';
  (db.purchasereturn || []).forEach(function (r) {
    if (except.prId && r.id === except.prId) return;
    if (r.inwardNo) {
      if (String(r.inwardNo) !== String(inwardNo)) return;
    } else if (!poRef || r.poRef !== poRef) {
      return;
    }
    (r.items || []).forEach(function (i) { if (sameItemRef(i.name, itemName)) q -= pf(i.retQty); });
  });
  if (!except.ignoreLive) q -= liveFormIssued(inwardNo, itemName, except.skipTr);
  return Math.max(0, q);
}
function jwRefreshSharedStock() {
  ['jw-issues', 'jw-extras'].forEach(function (tid) {
    const tb = $(tid); if (!tb) return;
    qsa('tr', tb).forEach(function (tr) {
      const itEl = qs('[data-f="item"]', tr), inEl = qs('[data-f="inwardNo"]', tr), st = qs('[data-postock]', tr);
      if (!itEl || !inEl || !st) return;
      const item = itEl.dataset.cbInput ? cboxGet(itEl.dataset.cbInput) : itEl.value;
      const no = inEl.dataset.cbInput ? cboxGet(inEl.dataset.cbInput) : inEl.value;
      st.textContent = fmtNum(inwardItemStock(no, item, stockExcept(tr)));
    });
  });
}
function jwValidateCombinedStock(issues, extras, id, mod) {
  const sums = {}, rows = (issues || []).concat(extras || []);
  rows.forEach(function (x) { const key = lcName(x.item) + '|' + String(x.inwardNo || ''); if (!x.item || !x.inwardNo) return; sums[key] = (sums[key] || 0) + pf(x.actualQty != null && x.actualQty !== '' ? x.actualQty : x.qty); });
  for (const key of Object.keys(sums)) {
    const parts = key.split('|'), item = parts[0], no = parts.slice(1).join('|');
    const except = { ignoreLive: true }; if (mod === 'sample') except.sampleId = id || null; else except.jwId = id || null;
    const available = inwardItemStock(no, item, except);
    if (sums[key] > available + 0.000001) {
      let target = null; qsa('#jw-issues tr,#jw-extras tr').some(function (tr) { const ie = qs('[data-f="item"]', tr), ne = qs('[data-f="inwardNo"]', tr); const iv = ie ? (ie.dataset.cbInput ? cboxGet(ie.dataset.cbInput) : ie.value) : ''; const nv = ne ? (ne.dataset.cbInput ? cboxGet(ne.dataset.cbInput) : ne.value) : ''; if (lcName(iv) === item && String(nv) === no) { target = qs('[data-f="actualQty"]', tr) || qs('[data-f="qty"]', tr); return true; } return false; });
      return reqBad(target, 'Combined issue quantity for ' + bareItemName(item) + ' on ' + no + ' is ' + fmtNum(sums[key]) + ' but available stock is ' + fmtNum(available));
    }
  }
  return true;
}
function jwSyncPoRef(tr) {
  if (!tr) return;
  const inEl = qs('[data-f="inwardNo"]', tr);
  const no = inEl ? (inEl.dataset.cbInput ? cboxGet(inEl.dataset.cbInput) : inEl.value) : '';
  const hid = qs('[data-f="poRef"]', tr);
  if (hid) hid.value = poRefFromInward(no);
}
/* POs that ordered this item, newest first */
function poOptionsForItem(itemName) {
  const nm = String(itemName || '').trim().toLowerCase();
  if (!nm) return [];
  const opts = db.po
    .filter(function (p) {
      return !isInactiveDoc(p) &&
        (p.items || []).some(function (i) { return String(i.name || '').trim().toLowerCase() === nm; });
    })
    .sort(function (a, b) { return b.date < a.date ? -1 : 1; })
    .map(function (p) { return { v: p.no, l: p.no + ' · ' + (p.supplier || '') }; });
  /* opening stock behaves like a source document — issue against it too */
  db.inward
    .filter(function (r) {
      return r.entryType === 'Opening Stock' &&
        (r.items || []).some(function (i) { return String(i.name || '').trim().toLowerCase() === nm; });
    })
    .sort(function (a, b) { return b.date < a.date ? -1 : 1; })
    .forEach(function (r) { const ref = r.poRef || osRefFor(r.no); opts.push({ v: ref, l: ref + ' · Opening Stock' }); });
  /* material returned by a job worker is back in stock — re-issue it against its JWR ref */
  db.inward
    .filter(function (r) {
      return r.entryType === 'Job Work Return' &&
        (r.items || []).some(function (i) {
          return String(i.name || '').trim().toLowerCase() === nm && pf(i.recQty) > 0;
        });
    })
    .sort(function (a, b) { return b.date < a.date ? -1 : 1; })
    .forEach(function (r) {
      const ref = r.poRef || osRefFor(r.no).replace('OS-', 'JWR-');
      opts.push({ v: ref, l: ref + ' · Job Work Return' + (r.vendor ? ' · ' + r.vendor : '') });
    });
  return opts;
}
/* PO Actual Stock, per PO + item:
      Inward received − Purchase Return + Job Work Return */
function poItemStock(poNo, itemName) {
  const nm = String(itemName || '').trim().toLowerCase();
  if (!nm) return 0;
  let inward = 0, purchaseReturn = 0, jobworkReturn = 0;

  db.inward.forEach(function (r) {
    if (r.entryType === 'Job Work Return') return;   // counted separately below
    if (poNo && r.poRef !== poNo) return;
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() === nm) inward += pf(i.recQty);
    });
  });
  db.purchasereturn.forEach(function (r) {
    if (poNo && r.poRef !== poNo) return;
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() === nm) purchaseReturn += pf(i.retQty);
    });
  });
  /* material the job worker sent back */
  db.inward.filter(function (r) { return r.entryType === 'Job Work Return'; }).forEach(function (r) {
    const j = db.jobwork.find(function (x) { return x.no === r.jwRef; });
    const self = poNo && r.poRef === poNo;          // issuing straight off this return
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() !== nm) return;
      if (poNo && !self) {
        const src = j ? (j.issues || []).concat(j.extras || [])
          .find(function (s) { return String(s.item || '').trim().toLowerCase() === nm; }) : null;
        if (src && src.poRef && src.poRef !== poNo) return;
      }
      jobworkReturn += pf(i.recQty);
    });
  });
  db.jobworkreturn.forEach(function (r) {
    const j = db.jobwork.find(function (x) { return x.no === r.jwRef; });
    (r.items || []).forEach(function (i) {
      if (String(i.name || '').trim().toLowerCase() !== nm) return;
      if (poNo) {
        const src = j ? (j.issues || []).concat(j.extras || [])
          .find(function (s) { return String(s.item || '').trim().toLowerCase() === nm; }) : null;
        if (src && src.poRef && src.poRef !== poNo) return;
      }
      jobworkReturn += pf(i.retQty);
    });
  });
  return Math.max(0, inward - purchaseReturn + jobworkReturn);
}
/* refresh a row's PO list + stock readout after item/PO changes */
/* write the item's UOM into the disabled cell */
function jwSetUnit(anyEl, itemName) {
  const tr = anyEl && anyEl.closest ? anyEl.closest('tr') : null; if (!tr) return;
  const u = qs('[data-f="unit"]', tr);
  if (u) u.value = itemUnit(itemName) || u.value || '';
}
/* the same Inward + item must not appear twice in one table */
function jwDupPoCheck(anyEl) {
  const tr = anyEl && anyEl.closest ? anyEl.closest('tr') : null; if (!tr) return false;
  const tb = tr.parentNode; if (!tb) return false;
  /* Sample may split the same Item + Inward across multiple issue lines/DCs.
     Shared stock validation still limits their combined quantity. */
  if (pageView && pageView.m === 'sample') {
    tr.classList.remove('row-over');
    return false;
  }
  const val = function (row, f) {
    const el = qs('[data-f="' + f + '"]', row);
    if (!el) return '';
    return String(el.dataset.cbInput ? cboxGet(el.dataset.cbInput) : el.value || '').trim().toLowerCase();
  };
  const item = val(tr, 'item'), inward = val(tr, 'inwardNo');
  if (!item || !inward) { tr.classList.remove('row-over'); return false; }
  let dup = false;
  qsa('tr', tb).forEach(function (other) {
    if (other === tr || dup) return;
    if (val(other, 'item') === item && val(other, 'inwardNo') === inward) dup = true;
  });
  tr.classList.toggle('row-over', dup);
  if (dup) {
    const nm = qs('[data-f="item"]', tr);
    const pn = qs('[data-f="inwardNo"]', tr);
    toast('Already added — ' + ((nm && nm.value) || 'item') + ' on ' + ((pn && pn.value) || 'this Inward') +
      '. Edit the existing line instead.', 'red');
    const inEl = qs('[data-f="inwardNo"]', tr);
    if (inEl && inEl.dataset.cbInput) { cboxSet(inEl.dataset.cbInput, ''); inEl.value = ''; }
    const hid = qs('[data-f="poRef"]', tr); if (hid) hid.value = '';
    const st = qs('[data-postock]', tr); if (st) st.textContent = '0';
    tr.classList.remove('row-over');
  }
  return dup;
}
function jwItemReturnBlockReason(itemName) {
  if (!pageView || pageView.kind !== 'form' || pageView.m !== 'jobwork' || !pageView.id) return '';
  const job = (db.jobwork || []).find(function (x) { return x.id === pageView.id; });
  const nm = lcName(bareItemName(itemName));
  if (!job || !nm) return '';
  const refs = [];
  (db.jobworkreturn || []).forEach(function (r) {
    if (r.jwRef !== job.no) return;
    const used = (r.items || []).some(function (i) {
      return lcName(bareItemName(i.name)) === nm && (pf(i.retQty) > 0 || pf(i.recQty) > 0);
    });
    if (used) refs.push(r.no || 'Job Work Return');
  });
  (db.inward || []).forEach(function (r) {
    if (r.entryType !== 'Job Work Return' || r.jwRef !== job.no) return;
    const used = (r.items || []).some(function (i) {
      return lcName(bareItemName(i.name)) === nm && (pf(i.recQty) > 0 || pf(i.retQty) > 0);
    });
    if (used) refs.push(r.no || 'Job Work Return Inward');
  });
  return refs.length ? 'Item is locked — used in ' + refs.join(', ') : '';
}
function jwSyncReturnItemDeleteLock(tr) {
  if (!tr) return;
  const del = qs('.jw-row-delete', tr), edit = qs('.jw-row-edit', tr);
  const reason = jwItemReturnBlockReason(rowItemName(tr));
  [del, edit].forEach(function (btn) {
    if (!btn) return;
    if (reason) {
      btn.disabled = true;
      btn.dataset.returnLocked = '1';
      btn.title = reason + ' — editing and deletion are disabled';
    } else if (btn.dataset.returnLocked === '1') {
      delete btn.dataset.returnLocked;
      btn.title = btn.classList.contains('jw-row-edit') ? 'Edit this saved row' : 'Remove this row';
      if (btn.classList.contains('jw-row-edit') || tr.dataset.jwEditing === '1' || tr.dataset.jwSaved !== '1') btn.disabled = false;
    }
  });
}
/* A returned material line stays fully locked, but its DC-level POD control
   remains usable. Since one DC can contain several lines, enable the visible
   merged POD cell when any line in that date group is return-locked. */
function jwAllowPodOnlyForReturnedGroup(tr) {
  const tb = tr && tr.closest ? tr.closest('#jw-issues, #jw-extras') : null;
  if (!tb || !pageView || pageView.m !== 'jobwork') return;
  const date = dval(qs('[data-f="date"]', tr)) || '';
  const group = qsa('tr', tb).filter(function (row) {
    if (row.classList.contains('jw-dgrp')) return false;
    return (dval(qs('[data-f="date"]', row)) || '') === date;
  });
  if (!group.some(function (row) { return !!jwItemReturnBlockReason(rowItemName(row)); })) return;
  group.forEach(function (row) {
    qsa('.pod-cell input[data-pod]', row).forEach(function (el) { el.disabled = false; el.title = 'Upload or replace POD'; });
    qsa('.pod-cell .pod-view', row).forEach(function (el) { el.disabled = false; });
    qsa('.pod-cell .pod-del', row).forEach(function (el) { el.disabled = true; el.title = 'POD removal is disabled because returned material exists'; });
  });
}
function jwRowRefresh(anyEl) {
  const tr = anyEl && anyEl.closest ? anyEl.closest('tr') : null; if (!tr) return;
  const g = function (f) { return qs('[data-f="' + f + '"]', tr); };
  const itEl = g('item');
  const item = itEl ? (itEl.dataset.cbInput ? cboxGet(itEl.dataset.cbInput) : itEl.value) : '';
  const inEl = g('inwardNo');
  if (inEl && inEl.dataset.cbInput) {
    const c = CBOX[inEl.dataset.cbInput];
    if (c) {
      c.opts = inwardOptionsForItem(item, tr).map(normalizeOpt);
      if (c.val && !c.opts.some(function (o) { return o.v === c.val; })) {
        const missing = normalizeOpt({ v: c.val, l: c.display || String(c.val) }, null);
        if (!c.opts.some(function (o) { return o.v === c.val; })) c.opts.push(missing);
        inEl.value = c.display || c.val;
      } else if (!c.val && c.opts.length === 1) {
        c.val = c.opts[0].v; inEl.value = c.opts[0].l;
      } else if (!c.val) {
        inEl.value = '';
      }
      renderCboxList(inEl.dataset.cbInput);
      jwSyncPoRef(tr);
    }
  }
  /* classification drives the row — only back-fill it when it is still empty,
     never overwrite or blank a value the user picked */
  const im = itemByName(item);
  const clsEl = g('classification');
  if (clsEl && im && im.classification) {
    if (clsEl.dataset.cbInput) {
      const cc = CBOX[clsEl.dataset.cbInput];
      if (cc && !cc.val) cboxSet(clsEl.dataset.cbInput, im.classification);
    } else if (!clsEl.value) {
      clsEl.value = im.classification;
    }
  }
  const inwardNo = inEl ? (inEl.dataset.cbInput ? cboxGet(inEl.dataset.cbInput) : inEl.value) : '';
  const stEl = qs('[data-postock]', tr);
  if (stEl) stEl.textContent = fmtNum(inwardItemStock(inwardNo, item, stockExcept(tr)));
  jwDupPoCheck(tr.querySelector('input'));
  jwSyncReturnItemDeleteLock(tr);
  jwRefreshSharedStock();
}
/* classification picked on a JW row → restrict its item list */
function jwClassChanged(clsId, itemId) {
  const cls = cboxGet(clsId);
  const c = CBOX[itemId]; if (!c) return;
  c.opts = itemOptsFor(cls).map(function (o) { return normalizeOpt(o, 'items'); }).filter(function (o) { return masterValueAllowed(o.v); });
  if (!c.opts.some(function (o) { return o.v === c.val; })) {
    c.val = ''; c.typed = false;
    const inp = qs('[data-cb-input="' + itemId + '"]');
    if (inp) inp.value = '';
  }
  renderCboxList(itemId);
  const anchor = qs('[data-cb-input="' + itemId + '"]');
  if (anchor) jwRowRefresh(anchor);
}
/* Actual Issue Qty can never exceed what the PO still holds */
/* Job Work: the same item may only appear once per table */
function jwDupCheck(anyEl, name) {
  const tr = anyEl && anyEl.closest ? anyEl.closest('tr') : null;
  const nm = lcName(bareItemName(name));
  if (!tr || !nm) return false;
  const tb = tr.parentNode; if (!tb) return false;
  let dup = false;
  qsa('tr', tb).forEach(function (other) {
    if (other === tr || dup) return;
    const el = qs('[data-f="item"]', other);
    const v = el ? (el.dataset.cbInput ? cboxGet(el.dataset.cbInput) : el.value) : '';
    if (lcName(bareItemName(v)) === nm) dup = true;
  });
  if (!dup) return false;
  const where = (tb.id === 'jw-extras') ? 'Extra Quantity Issued' : 'Material Issues';
  toast('Duplicate item \u2014 ' + bareItemName(name) + ' is already listed under ' + where + '. Update that line instead.', 'red');
  const el = qs('[data-f="item"]', tr);
  if (el && el.dataset.cbInput) { cboxSet(el.dataset.cbInput, ''); el.value = ''; }
  ['unit', 'qty', 'actualQty', 'cons'].forEach(function (f) { const x = qs('[data-f="' + f + '"]', tr); if (x) x.value = ''; });
  const st = qs('[data-postock]', tr); if (st) st.textContent = '0';
  if (tb.id === 'jw-extras') calcJWExtras(); else calcJWIssues();
  return true;
}
/* Reason is mandatory on every Extra Quantity Issued line that has an item or qty */
function jwReasonCheck(el) {
  const tr = el && el.closest ? el.closest('tr') : null; if (!tr) return;
  const item = rowItemName(tr);
  const qty = pf((qs('[data-f="qty"]', tr) || {}).value);
  const need = !!item || qty > 0;
  el.classList.toggle('inp-bad', need && !String(el.value || '').trim());
}
function jwCheckActual(el) {
  const tr = el && el.closest ? el.closest('tr') : null; if (!tr) return;
  const stEl = qs('[data-postock]', tr);
  const avail = stEl ? pf(String(stEl.textContent).replace(/,/g, '')) : 0;
  const now = pf(el.value);
  const bad = now > avail;
  el.classList.toggle('inp-bad', bad);
  if (bad) {
    if (!tr.dataset.warnedAct) {
      tr.dataset.warnedAct = '1';
      const nm = qs('[data-f="item"]', tr);
      toast('Actual issue exceeds stock — ' + ((nm && nm.value) || 'item') +
        ' has only ' + fmtNum(avail) + ' available', 'red');
    }
    el.value = avail > 0 ? avail : '';
  } else {
    delete tr.dataset.warnedAct;
  }
  if (tr.parentNode && tr.parentNode.id === 'jw-issues') calcJWIssues(); else calcJWExtras();
  jwRefreshSharedStock();
}
/* default Actual Issue Qty to the auto figure until the user overrides it */
function jwSyncActual(tr) {
  if (!tr) return;
  const autoEl = qs('[data-f="qty"]', tr);
  const actEl = qs('[data-f="actualQty"]', tr);
  if (!autoEl || !actEl) return;
  if (!actEl.dataset.touched) {
    actEl.value = autoEl.value;
    jwCheckActual(actEl);
  }
}
function jwIssueRow(it) {
  it = it || {};
  const itemId = rid('jwi'), unitId = rid('jwiu'), szId = rid('jws'), poId = rid('jwpo'), clsId = rid('jwcl');
  jwSeedGroupPod('jw-issues', it);
  const selSizes = (Array.isArray(it.sizes) && it.sizes.length) ? it.sizes.slice()
    : (it.sizes && typeof it.sizes === 'object' && Object.keys(it.sizes).length) ? Object.keys(it.sizes)
      : [];
  return '<tr data-jw-saved="' + (it._saved ? '1' : '0') + '">' +
    srTd() +
    '<td><input class="inp" type="text" data-date autocomplete="off" readonly disabled data-f="date" value="' + esc(it.date || today()) + '"></td>' +
    '<td><input class="inp" data-f="dcNo" value="' + esc(it.dcNo || '') + '" disabled title="System generated — one DC No. per date"></td>' +
    '<td>' + cbox(clsId, { opts: db.masters.classifications, value: it.classification || (itemByName(it.item) || {}).classification || '', f: 'classification', placeholder: 'Classification', free: true, onSet: function () { jwClassChanged(clsId, itemId); } }) + '</td>' +
    '<td>' + cbox(itemId, { opts: itemOptsFor(it.classification || (itemByName(it.item) || {}).classification || ''), value: it.item || '', f: 'item', placeholder: 'Fabric / Trim', free: true, onSet: function (v) { const el = qs('[data-cb-input="' + itemId + '"]'); jwSetUnit(el, v); jwRowRefresh(el); calcJWIssues(); } }) +
    '<input type="text" data-f="colour" value="' + esc(it.colour || '') + '" style="display:none" tabindex="-1" aria-hidden="true">' +
    '</td>' +
    '<td>' + cbox(poId, { opts: inwardOptionsForItem(it.item), value: inwardNoForIssue(it), f: 'inwardNo', placeholder: 'Select Inward', free: false, onSet: function () { jwSyncPoRef(qs('[data-cb-input="' + poId + '"]').closest('tr')); jwRowRefresh(qs('[data-cb-input="' + poId + '"]')); } }) + '</td>' +
    '<td class="po-ref-cell"><input class="inp" data-f="poRef" value="' + esc(it.poRef || poRefFromInward(inwardNoForIssue(it))) + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-postock style="color:var(--muted);font-weight:600">' + fmtNum(inwardItemStock(inwardNoForIssue(it), it.item, stockExcept())) + '</td>' +
    '<td class="sizes-cell">' +
    mcbox(szId, { opts: db.masters.sizes, selected: selSizes, placeholder: 'Select sizes…', onSet: function () { calcIssueQtyById(szId); } }) +
    '</td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="cons" value="' + (it.cons ?? '') + '" placeholder="e.g. 1.2" oninput="calcIssueQtyById(\'' + szId + '\')" title="Consumption per garment"></td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="qty" value="' + (it.qty ?? '') + '" readonly style="color:var(--muted);font-weight:700" title="Auto-calculated = Order Qty (selected sizes) × Cons./Gmt"></td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="actualQty" value="' + (it.actualQty ?? it.qty ?? '') + '" placeholder="0" oninput="this.dataset.touched=1;jwCheckActual(this)" title="Actually issued — cannot exceed stock"></td>' +
    '<td class="uom-cell"><input class="inp" data-f="unit" value="' + esc(it.unit || itemUnit(it.item) || '') + '" placeholder="Auto" disabled></td>' +
    '<td class="pod-cell" data-jw-group-pod>' + ((it.date || '') ? podCellHtml(jwPodIdFor('jw-issues', it.date || '')) : '<span class="att-none">Select date</span>') + '</td>' +
    '<td class="actions-cell">' +
    (it._saved ? '<button type="button" class="btn-icon jw-row-edit" title="Edit this saved row" onclick="jwEditIssueRow(this)">' + ic('pencil', 15) + '</button>' : '') +
    '<button type="button" class="btn-icon danger jw-row-delete" title="Remove this row" onclick="removeIssueRow(this)">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
function jwDomSizeOrder(colour) {
  // live order qty per size from the styles register (same form); optionally filtered to a matching garment colour
  const map = {};
  qsa('#jw-garments tr').forEach(tr => {
    if (colour) {
      const colInp = qs('[data-f="colour"]', tr);
      const rc = colInp ? colInp.value.trim() : '';
      if (rc && rc.toLowerCase() !== String(colour).toLowerCase()) return;
    }
    qsa('[data-f^="sz"]', tr).forEach(inp => { const s = inp.dataset.f.slice(2); map[s] = (map[s] || 0) + pf(inp.value); });
  });
  return map;
}
function jwStyleSizesUsed(colour) {
  // sizes that actually have order qty entered in Finished Garments — Styles (optionally filtered to a colour)
  const used = jwDomSizeOrder(colour);
  return db.masters.sizes.filter(s => (used[s] || 0) > 0);
}
function refreshIssueSizeOptsForRow(tr) {
  const mcb = qs('.mcbox', tr); if (!mcb || !mcb.dataset.mcb) return;
  const c = MCBOX[mcb.dataset.mcb]; if (!c) return;
  const colInp = qs('[data-f="colour"]', tr);
  const colour = colInp ? colInp.value.trim() : '';
  let used = jwStyleSizesUsed(colour);
  if (!used.length) used = db.masters.sizes.slice();   // nothing entered in Styles yet → don't block the user
  c.opts = used.map(s => ({ v: s, l: s }));
  c.sel = c.sel.filter(s => used.indexOf(s) > -1);
  updateMcboxInput(mcb.dataset.mcb); renderMcboxList(mcb.dataset.mcb);
}
function calcIssueQtyById(szId) {
  const mcbEl = qs('[data-mcb="' + szId + '"]'); if (!mcbEl) return;
  const tr = mcbEl.closest('tr'); if (tr) { refreshIssueSizeOptsForRow(tr); calcIssueRowQty(tr); }
}
function calcIssueRowQty(tr) {
  const mcb = qs('.mcbox', tr); const c = (mcb && mcb.dataset.mcb) ? MCBOX[mcb.dataset.mcb] : null;
  const consInp = qs('[data-f="cons"]', tr);
  const cons = consInp ? pf(consInp.value) : 0;
  const colInp = qs('[data-f="colour"]', tr);
  const colour = colInp ? String(colInp.value || '').trim() : '';
  const orders = jwDomSizeOrder(colour);
  let totalOrder = 0;
  if (c) c.sel.forEach(s => { totalOrder += (orders[s] || 0); });
  const qty = (cons > 0 && totalOrder > 0) ? Math.round(totalOrder * cons * 100) / 100 : 0;
  const qtyInp = qs('[data-f="qty"]', tr);
  if (qtyInp) qtyInp.value = qty > 0 ? qty : '';
  jwSyncActual(tr);
  calcJWIssues();
}
function afterRenderIssues() {
  qsa('#jw-issues tr').forEach(function (tr) {
    if (tr.classList.contains('jw-dgrp')) return;
    const m = qs('.mcbox', tr);
    if (m && m.dataset.mcb) renderMcboxList(m.dataset.mcb);
    refreshIssueSizeOptsForRow(tr);
    calcIssueRowQty(tr);
    jwRowRefresh(qs('[data-f="item"]', tr) || tr);
  });
  calcJWIssues();
  jwGroupRowsByDate('jw-issues');
  jwLockPodRows();
  jwLockSavedRows('jw-issues');
}
/* Saved Material Issue / Extra Issue rows open read-only. The pencil button is
   the explicit opt-in that unlocks only that row for editing. */
function jwRowHasGroupPod(tr) {
  if (!tr) return false;
  const tb = tr.closest('#jw-issues, #jw-extras');
  const d = dval(qs('[data-f="date"]', tr)) || '';
  if (tb && d) {
    const pd = PODDATA[jwPodIdFor(tb.id, d)];
    if (pd && pd.pod) return true;
  }
  return typeof jwRowHasPod === 'function' ? jwRowHasPod(tr) : false;
}
function jwDisableEditIfPod(tr) {
  const edit = qs('.jw-row-edit', tr);
  if (!edit) return false;
  if (!jwRowHasGroupPod(tr)) return false;
  edit.disabled = true;
  edit.title = 'Edit locked — POD (Proof of Delivery) is uploaded for this DC';
  tr.dataset.jwEditing = '';
  return true;
}
function jwLockSavedRows(tbodyId) {
  const tb = $(tbodyId); if (!tb) return;
  qsa('tr[data-jw-saved="1"]', tb).forEach(function (tr) {
    if (tr.dataset.jwEditing === '1' && !jwRowHasGroupPod(tr)) return;
    tr.classList.add('jw-edit-locked');
    qsa('input,select,textarea,button', tr).forEach(function (el) { el.disabled = true; });
    const edit = qs('.jw-row-edit', tr);
    if (edit) { edit.disabled = false; edit.title = 'Edit this saved row'; }
    if (jwDisableEditIfPod(tr)) { /* keep pencil locked when POD exists */ }
    jwSyncReturnItemDeleteLock(tr);
    qsa('.pod-view', tr).forEach(function (el) { el.disabled = false; });
  });
  qsa('tr[data-jw-saved="1"]', tb).forEach(jwAllowPodOnlyForReturnedGroup);
}
function jwEditIssueRow(btn) {
  const tr = btn && btn.closest ? btn.closest('tr') : null; if (!tr) return;
  if (jwRowHasGroupPod(tr)) return toast('Edit locked — POD is already uploaded for this DC', 'red');
  const returnBlock = jwItemReturnBlockReason(rowItemName(tr));
  if (returnBlock) return toast(returnBlock + ' — it cannot be edited', 'red');
  const mod = (pageView && pageView.m === 'sample') ? 'sample' : 'jobwork';
  const rec = (pageView && pageView.id) ? (db[mod] || []).find(function (x) { return x.id === pageView.id; }) : null;
  if (rec && rec.status === 'Closed') return toast((rec.no || (mod === 'sample' ? 'Sample' : 'Job Work')) + ' is closed — reopen it before editing', 'red');
  tr.dataset.jwEditing = '1';
  tr.classList.remove('jw-edit-locked', 'row-locked');
  tr.removeAttribute('title');
  qsa('input,select,textarea,button', tr).forEach(function (el) {
    const f = (el.dataset && el.dataset.f) || '';
    /* System-controlled fields never become editable. */
    if (f === 'date' || f === 'dcNo' || f === 'unit' || f === 'poRef' || el.readOnly) { el.disabled = true; return; }
    el.disabled = false;
  });
  btn.disabled = true;
  jwSyncReturnItemDeleteLock(tr);
  const docName = (pageView && pageView.m === 'sample') ? 'Sample' : 'Job Work';
  btn.title = 'Editing enabled — save the ' + docName + ' to apply changes';
  const first = qs('[data-f="classification"]', tr) || qs('[data-f="item"]', tr) || qs('[data-f="reason"]', tr);
  if (first) { try { first.focus(); } catch (e) { } }
  toast('Row enabled for editing — press Save ' + docName + ' when finished', 'green');
}
function jwRowHasPod(tr) {
  if (!tr) return false;
  const inp = qs('[data-pod]', tr);
  if (!inp) return false;
  const pd = PODDATA[inp.dataset.pod];
  return !!(pd && pd.pod);
}
function jwUnlockPodRow(tr) {
  if (!tr) return;
  tr.classList.remove('row-locked');
  tr.removeAttribute('title');
  qsa('input,select,textarea,button', tr).forEach(function (el) {
    if (el.readOnly) return;
    if (el.dataset && (el.dataset.f === 'unit' || el.dataset.f === 'poRef')) return;
    if (el.getAttribute('placeholder') === 'Auto') return;
    el.disabled = false;
  });
  jwSyncReturnItemDeleteLock(tr);
}
function jwSyncPodDelete(tr) {
  if (!tr) return;
  const why = 'POD already uploaded — this line is locked';
  if (jwRowHasPod(tr)) {
    lockTableRow(tr, why);
    qsa('.pod-cell .pod-del, .pod-cell .pod-view', tr).forEach(function (el) { el.disabled = false; });
    qsa('.pod-cell input[data-pod]', tr).forEach(function (el) { el.disabled = false; });
    const del = qs('td:last-child button.btn-icon.danger', tr);
    if (del) { del.disabled = true; del.title = why; }
  } else {
    jwUnlockPodRow(tr);
  }
}
function jwLockPodRows() {
  ['jw-issues', 'jw-extras'].forEach(function (tid) {
    const tb = $(tid); if (!tb) return;
    qsa('tr', tb).forEach(function (tr) {
      if (tr.classList.contains('jw-dgrp')) return;
      const d = dval(qs('[data-f="date"]', tr)) || '';
      const pd = PODDATA[jwPodIdFor(tid, d)];
      if (pd && pd.pod) {
        lockTableRow(tr, 'POD already uploaded for DC ' + (((qs('[data-f="dcNo"]', tr) || {}).value) || '') + ' — this DC group is locked');
        jwDisableEditIfPod(tr);
        qsa('.pod-cell .pod-del, .pod-cell .pod-view', tr).forEach(function (el) { el.disabled = false; });
        qsa('.pod-cell input[data-pod]', tr).forEach(function (el) { el.disabled = false; });
      } else if (!(tr.dataset.jwSaved === '1' && tr.dataset.jwEditing !== '1')) {
        jwUnlockPodRow(tr);
      }
    });
    qsa('tr.jw-dgrp .pod-del, tr.jw-dgrp .pod-view', tb).forEach(function (el) { el.disabled = false; });
    qsa('tr', tb).forEach(function (tr) { if (!tr.classList.contains('jw-dgrp')) jwAllowPodOnlyForReturnedGroup(tr); });
  });
}
document.addEventListener('change', function (e) {
  const el = e.target;
  if (!el || !el.matches || !el.matches('input[data-date][data-f="date"]')) return;
  const tb = el.closest('#jw-issues, #jw-extras');
  if (tb && tb.id) { jwGroupRowsByDate(tb.id); jwLockPodRows(); }
});
function podIsPdf(pd) {
  if (!pd) return false;
  if (pd.kind === 'pdf') return true;
  if (/^data:application\/pdf/i.test(pd.pod || '')) return true;
  return /\.pdf$/i.test(pd.podName || '');
}
function podCellHtml(podId) {
  const pd = PODDATA[podId];
  const accept = ' accept="image/*,application/pdf,.pdf"';
  const change = ' onchange="onPODFile(this,\'' + podId + '\')"';
  if (!(pd && pd.pod)) {
    return '<label class="pod-upload-box empty" title="Upload proof of delivery">' +
      '<input type="file"' + accept + ' data-pod="' + podId + '"' + change + '>' +
      '<span class="pod-upload-plus">＋</span>' +
      '<span class="pod-upload-title">Upload POD</span>' +
      '<span class="pod-upload-help">Image or PDF · max 5 MB</span></label>';
  }
  const preview = podIsPdf(pd)
    ? '<div class="pod-preview-pdf">PDF</div>'
    : '<img class="pod-preview-img" src="' + pd.pod + '" alt="POD preview">';
  return '<div class="pod-upload-box has">' +
    '<div class="pod-upload-actions">' +
    '<button type="button" class="pod-view" title="View POD" onclick="event.stopPropagation();viewPOD(\'' + podId + '\')">' + ic('view', 12) + '</button>' +
    '<button type="button" class="pod-del" title="Remove POD" onclick="event.stopPropagation();clearPOD(\'' + podId + '\')">' + ic('trash', 11) + '</button>' +
    '</div>' + preview +
    '<div class="pod-upload-name" title="' + esc(pd.podName || 'POD') + '">' + esc(pd.podName || 'POD') + '</div>' +
    '<label class="pod-replace">Replace<input type="file"' + accept + ' data-pod="' + podId + '"' + change + '></label>' +
    '</div>';
}
/* Convert a stored data URL to a Blob URL. Browsers commonly block direct
   data: PDF navigation from a local HTML file, while Blob URLs open reliably
   in the browser's built-in PDF viewer. */
function podObjectUrl(data) {
  const src = String(data || '');
  if (!/^data:/i.test(src)) return { url: src, revoke: false };
  const comma = src.indexOf(',');
  if (comma < 0) return { url: src, revoke: false };
  const meta = src.slice(0, comma);
  const mimeHit = /^data:([^;,]+)/i.exec(meta);
  const mime = mimeHit ? mimeHit[1] : 'application/octet-stream';
  const raw = src.slice(comma + 1);
  try {
    let bytes;
    if (/;base64/i.test(meta)) {
      const bin = atob(raw);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      const text = decodeURIComponent(raw);
      bytes = new TextEncoder().encode(text);
    }
    return { url: URL.createObjectURL(new Blob([bytes], { type: mime })), revoke: true };
  } catch (e) {
    return { url: src, revoke: false };
  }
}
function viewPOD(podId) {
  const pd = PODDATA[podId]; if (!pd || !pd.pod) return;
  if (podIsPdf(pd)) {
    /* Open the tab synchronously from the click so popup blockers allow it,
       then navigate that tab to a browser-readable Blob URL. */
    const w = window.open('about:blank', '_blank');
    if (!w) return toast('Allow pop-ups to view the PDF', 'red');
    const obj = podObjectUrl(pd.pod);
    if (!obj.url) { w.close(); return toast('Could not prepare the PDF preview', 'red'); }
    try { w.location.replace(obj.url); }
    catch (e) { w.location.href = obj.url; }
    if (obj.revoke) setTimeout(function () { try { URL.revokeObjectURL(obj.url); } catch (e) { } }, 300000);
    return;
  }
  const w = window.open('', '_blank');
  if (w) {
    const doc = w.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>POD Preview</title></head><body style="margin:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh"></body></html>');
    doc.close();
    const imgEl = doc.createElement('img');
    imgEl.style.maxWidth = '95vw';
    imgEl.style.maxHeight = '95vh';
    imgEl.style.borderRadius = '12px';
    imgEl.src = pd.pod;
    doc.body.appendChild(imgEl);
  }
}
function onPODFile(inp, podId) {
  const f = inp.files && inp.files[0]; if (!f) return;
  const isPdf = (f.type && /pdf/i.test(f.type)) || /\.pdf$/i.test(f.name);
  const isImg = (f.type && /^image\//i.test(f.type)) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name);
  if (!isPdf && !isImg) { toast('Upload an image or a PDF', 'red'); inp.value = ''; return; }
  if (f.size > 5 * 1024 * 1024) { toast('POD file is too large (max 5 MB)', 'red'); inp.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    const finish = function (payload) {
      PODDATA[podId] = payload;
      qsa('[data-pod="' + podId + '"]').forEach(function (podInp) {
        const cell = podInp.closest('.pod-cell');
        if (cell) cell.innerHTML = podCellHtml(podId);
      });
      jwLockPodRows();
      toast('POD attached: ' + f.name, 'green');
    };
    if (isPdf) {
      finish({ pod: dataUrl, podName: f.name, kind: 'pdf' });
      return;
    }
    const img = new Image();
    img.onload = function () {
      const max = 900;
      let w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      finish({ pod: cv.toDataURL('image/jpeg', 0.72), podName: f.name, kind: 'image' });
    };
    img.onerror = function () { toast('Could not read that image', 'red'); };
    img.src = dataUrl;
  };
  reader.readAsDataURL(f);
}
function clearPOD(podId) {
  delete PODDATA[podId];
  const inputs = qsa('[data-pod="' + podId + '"]'); if (!inputs.length) return;
  inputs.forEach(function (inp) {
    const cell = inp.closest('.pod-cell');
    if (cell) cell.innerHTML = podCellHtml(podId);
  });
  jwLockPodRows();
  toast('POD removed');
}
function removeIssueRow(btn) {
  const tr = btn.closest('tr');
  const returnBlock = jwItemReturnBlockReason(rowItemName(tr));
  if (returnBlock) return toast(returnBlock, 'red');
  // v5: allow delete after user has clicked Edit pencil (jwEditing=1)
  if (jwRowGroupHasPod(tr) && tr.dataset.jwEditing !== '1') return toast('Cannot delete — POD already uploaded for this date. Click the Edit pencil first to unlock the row.', 'red');
  const mcb = qs('.mcbox', tr);
  if (mcb && mcb.dataset.mcb) delete MCBOX[mcb.dataset.mcb];
  tr.remove(); calcJWIssues(); jwGroupRowsByDate('jw-issues'); jwRefreshSharedStock();
}
/* styles chosen on a job work — the header multi-select is the source of truth */
function jwStyleList(r) {
  if (r && Array.isArray(r.styles) && r.styles.length) return r.styles.slice();
  const out = [];
  ((r && r.garments) || []).forEach(function (g) {
    const s = g.style || g.desc;
    if (s && out.indexOf(s) === -1) out.push(s);
  });
  return out;
}
/* one garment row per selected style */
function jwGarmentRowsHtml(r) {
  const list = jwStyleList(r);
  if (!list.length) return '';
  return list.map(function (s) {
    const g = ((r && r.garments) || []).find(function (x) { return (x.style || x.desc) === s; }) || {};
    return jwGarmentRow(Object.assign({}, g, { style: s }));
  }).join('');
}
/* header selection changed — rebuild the row without clearing its size selection.
   Changing only the Style ID must not discard sizes/quantities already entered. */
function jwStylesChanged() {
  const tb = $('jw-garments'); if (!tb) return;
  const s = cboxGet('jw-style');
  let keep = {};
  const tr = qs('#jw-garments tr');
  if (tr) {
    const mcb = qs('.mcbox', tr);
    const mid = mcb && mcb.dataset.mcb;
    const mc = mid ? MCBOX[mid] : null;
    const store = mid ? (rowSz[mid] || { sizes: {} }) : { sizes: {} };
    const typed = Object.assign({}, store.sizes || {});

    /* Capture the current boxes before replacing the row. Selected sizes are
       retained even when their quantity is still blank or zero. */
    qsa('input[data-f^="sz"]', tr).forEach(function (inp) {
      typed[inp.dataset.f.slice(2)] = inp.value;
    });
    const selected = mc ? mc.sel.slice() : Object.keys(typed);
    const sizes = {};
    selected.forEach(function (size) {
      sizes[size] = typed[size] != null ? typed[size] : '';
    });

    const colEl = qs('[data-f="colour"]', tr);
    const rateEl = qs('[data-f="rate"]', tr);
    keep = {
      colour: colEl ? colEl.value : '',
      rate: rateEl ? rateEl.value : '',
      sizes: sizes
    };
    if (mid) {
      delete MCBOX[mid];
      delete rowSz[mid];
    }
  }
  tb.innerHTML = s ? jwGarmentRow(Object.assign({}, keep, { style: s })) : '';
  afterRenderGarments();
}
function jwGarmentRow(g) {
  g = g || {};
  const szId = rid('jgsz');
  const style = g.style || g.desc || '';
  const sizes = g.sizes || {};
  const sel = Object.keys(sizes);   // nothing pre-selected on a new row
  /* sizes saved with a quantity are locked while editing an existing Job Work */
  const lockedSizes = g._duplicate ? [] : sel.filter(function (k) { return pf(sizes[k]) > 0; });
  rowSz[szId] = { sizes: Object.assign({}, sizes) };
  return '<tr>' +
    srTd() +
    '<td class="style-cell jw-stname"><b>' + esc(styleLabel(style) || style) + '</b>' +
    '<input type="hidden" data-f="style" value="' + esc(style) + '"></td>' +
    '<input type="hidden" data-f="colour" value="' + esc(g.colour || '') + '">' +
    '<td class="sizes-cell">' +
    mcbox(szId, {
      opts: db.masters.sizes, selected: sel, locked: lockedSizes,
      lockMsg: 'This size already has a saved quantity on this Job Work and cannot be removed',
      placeholder: 'Select sizes…', onSet: function () { renderSzInputs(szId); }
    }) +
    '</td>' +
    '<td class="sizes-cell">' +
    '<div class="sz-inputs" id="szin_' + szId + '"></div>' +
    '</td>' +
    '<td class="num" data-order style="font-weight:700">0</td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="rate" value="' + (g.rate ?? '') + '" oninput="calcJW()"></td>' +
    '<td class="num" data-gamt style="font-weight:700">0</td>' +
    ((pageView && pageView.m === 'sample')
      ? '<td><button type="button" class="btn-icon danger" title="Remove this style" onclick="smpRemoveStyleRow(this)">' + ic('trash', 15) + '</button></td>'
      : '') +
    '</tr>';
}
/* dropping a row unticks that style in the header picker */
function jwRemoveStyleRow(btn) {
  const tr = btn.closest('tr'); if (!tr) return;
  cboxSet('jw-style', '');
  const inp = qs('[data-cb-input="jw-style"]');
  if (inp) inp.value = '';
  tr.remove();
  afterRenderGarments();
}
function renderSzInputs(szId) {
  const c = MCBOX[szId]; const wrap = $('szin_' + szId); if (!c || !wrap) return;
  const store = rowSz[szId] || (rowSz[szId] = { sizes: {} });
  // capture typed values before regenerating
  qsa('input[data-f^="sz"]', wrap).forEach(inp => { store.sizes[inp.dataset.f.slice(2)] = inp.value; });
  wrap.innerHTML = c.sel.map(s =>
    '<span class="szbox"><span class="szlbl">' + esc(s) + '</span><input class="inp inp-sm szin" type="number" min="0" data-f="sz' + esc(s) + '" value="' + esc(store.sizes[s] != null ? store.sizes[s] : '') + '" oninput="calcJW()"></span>'
  ).join('');
  calcJW();
}
function afterRenderGarments() {
  renumberSr();
  // called after the form HTML is injected — populates size inputs for every style row
  qsa('#jw-garments tr').forEach(tr => {
    const m = qs('.mcbox', tr);
    if (m && m.dataset.mcb) { renderMcboxList(m.dataset.mcb); renderSzInputs(m.dataset.mcb); }
  });
  calcJW();
}
function removeGarmentRow(btn) { btn.closest('tr').remove(); calcJW(); }
function gatherGarmentRows() {
  const out = [];
  qsa('#jw-garments tr').forEach(tr => {
    const styEl = qs('[data-f="style"]', tr);
    const style = styEl ? (styEl.dataset.cbInput ? cboxGet(styEl.dataset.cbInput) : (styEl.value || '')) : '';
    const colEl = qs('[data-f="colour"]', tr);
    const colour = colEl ? (colEl.dataset.cbInput ? cboxGet(colEl.dataset.cbInput) : (colEl.value || '')) : '';
    const rate = pf(qs('[data-f="rate"]', tr) ? qs('[data-f="rate"]', tr).value : 0);
    const sizes = {};
    let orderQty = 0;
    qsa('[data-f^="sz"]', tr).forEach(inp => {
      const v = pf(inp.value);
      if (v > 0) { sizes[inp.dataset.f.slice(2)] = v; orderQty += v; }
    });
    if (style || orderQty > 0) {
      const st = db.masters.styles.find(x => x.internal === style);
      out.push({ style: style, portal: st ? st.portal : '', desc: style, colour: colour, sizes: sizes, orderQty: orderQty, rate: rate });
    }
  });
  return out;
}
function calcJWIssues() {
  const tb = $('jw-issues'); if (!tb) return;
  let fab = 0, fabUnit = 'm'; const trims = {};
  qsa('tr', tb).forEach(tr => {
    const item = ((qs('[data-f="item"]', tr) || {}).value || '').trim();
    const qty = pf((qs('[data-f="qty"]', tr) || {}).value);
    if (!item || qty <= 0) return;
    if (isFabricItem(item)) { fab += qty; const u = ((qs('[data-f="unit"]', tr) || {}).value || '').trim(); if (u) fabUnit = u; }
    else trims[item] = (trims[item] || 0) + qty;
  });
  const el = $('jw-totals'); if (!el) return;
  let h = 'Fabric: <b>' + fmtNum(fab) + ' ' + fabUnit + '</b>';
  const names = Object.keys(trims);
  if (names.length) h += ' &nbsp;·&nbsp; Trims: ' + names.map(n => '<b>' + esc(n) + ': ' + fmtNum(trims[n]) + '</b>').join(' &nbsp; ');
  el.innerHTML = h;
}

function formJobWork(rec) {
  const r = rec || {};
  return '<div class="sec">Job Worker</div><div class="grid-fixed">' +
    (rec && rec.id ? field('JW No', '<input class="inp" id="f-no" value="' + esc(r.no || '') + '" disabled>') : '') +
    field('Date *', '<input class="inp" type="text" data-date autocomplete="off" readonly disabled id="f-date" value="' + esc(r.date || today()) + '">') +
    field('Job Worker / Vendor *', cbox('jw-vendor', { opts: jobWorkVendorOptions(), value: r.vendor || '', f: 'vendor', placeholder: 'Search Vendor parties…', free: false })) +
    field('Style (Internal ID) *', cbox('jw-style', {
      opts: styleOpts(),
      value: jwStyleList(r)[0] || '', display: styleLabel(jwStyleList(r)[0] || ''),
      f: 'style', placeholder: 'Search & select a style…', free: false,
      onSet: function () { jwStylesChanged(); }
    })) +
    '</div>' +
    '<div class="sec">Finished Garments — Styles <span style="text-transform:none;color:var(--muted);font-weight:600">(the style picked above · select sizes &amp; enter size-wise qty)</span></div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Style</th><th>Size Selection *</th><th>Size-wise Qty</th><th>Order Qty</th><th>Job Work CM (₹/pc)</th><th>Charges</th></tr></thead>' +
    '<tbody id="jw-garments">' + jwGarmentRowsHtml(r) + '</tbody>' +
    '<tfoot><tr class="tot-row"><td></td><td>Totals</td><td></td><td></td><td class="num" id="jw-gtot-oqty">0</td><td></td><td class="num" id="jw-gtot-chg">₹0</td></tr></tfoot></table></div>' +
    '<div class="sec">Material Issues to Job Worker <span style="text-transform:none;color:var(--muted);font-weight:600">(one DC No. = one POD upload)</span></div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Issue Date</th><th>DC No.</th><th>Classification *</th><th>Item Name *</th><th>Inward No. *</th><th>PO No.</th><th class="num">Stock</th><th>Size Selection *</th><th>Cons./Gmt (Mtr/Nos) *</th><th>Qty (auto)</th><th class="num">Actual Issue Qty</th><th>UOM</th><th>POD (Proof of Delivery)</th><th></th></tr></thead>' +
    '<tbody id="jw-issues">' + ((r.issues && r.issues.length) ? jwLinesByDate(r.issues).map(function (x) { return jwIssueRow(Object.assign({}, x, { _saved: !!r.id })); }).join('') : jwIssueRow({ date: today() })) + '</tbody>' +
    '</table></div>' +
    '<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addJwIssue()">＋ Add Issue Record</button>' +

    '<div class="sec">Extra Quantity Issued <span style="text-transform:none;color:var(--muted);font-weight:600">(one DC No. = one POD upload)</span></div>' +
    '<div class="table-wrap"><table class="mini-table"><thead><tr>' + srTh() + '<th>Issue Date</th><th>DC No.</th><th>Classification *</th><th>Item Name *</th><th>Inward No. *</th><th>PO No.</th><th class="num">Stock</th><th class="num">Actual Issue Qty</th><th>UOM</th><th>Reason *</th><th>POD (Proof of Delivery)</th><th></th></tr></thead>' +
    '<tbody id="jw-extras">' + ((r.extras && r.extras.length) ? jwLinesByDate(r.extras).map(function (x) { return jwExtraRow(Object.assign({}, x, { _saved: !!r.id })); }).join('') : jwExtraRow({ date: today() })) + '</tbody>' +
    '</table></div>' +
    '<button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addJwExtra()">＋ Add Extra Issue</button>' +
    '';
}
function calcJW() {
  const tb = $('jw-garments'); if (!tb) return;
  let tq = 0, tc = 0;
  qsa('tr', tb).forEach(tr => {
    let q = 0;
    qsa('[data-f^="sz"]', tr).forEach(inp => { q += pf(inp.value); });
    const rt = pf(qs('[data-f="rate"]', tr) ? qs('[data-f="rate"]', tr).value : 0);
    const a = q * rt;
    const od = qs('[data-order]', tr); if (od) od.textContent = fmtNum(q);
    const el = qs('[data-gamt]', tr); if (el) el.textContent = fmtNum(a);
    tq += q; tc += a;
  });
  $('jw-gtot-oqty').textContent = fmtNum(tq);
  $('jw-gtot-chg').textContent = fmtINR(tc);
  // refresh issue size options + Qty (auto-calculated from selected sizes' order qty × consumption)
  qsa('#jw-issues tr').forEach(tr => { refreshIssueSizeOptsForRow(tr); calcIssueRowQty(tr); });
}
/* ---------------- SAMPLE (Job Work without material issues) -------------
   Sample has its own material-issue row: no Reason column, and Issue Date /
   Classification / Item Name / Inward No. are all mandatory. */
function smpIssueRow(it) {
  it = it || {};
  const itemId = rid('smi'), poId = rid('smpo'), clsId = rid('smcl');
  const issueDate = it.date || today();
  jwSeedGroupPod('jw-extras', Object.assign({}, it, { date: issueDate }));
  const podId = jwPodIdFor('jw-extras', issueDate);
  return '<tr data-jw-saved="' + (it._saved ? '1' : '0') + '">' +
    srTd() +
    '<td><input class="inp" type="text" data-date autocomplete="off" readonly disabled data-f="date" value="' + esc(issueDate) + '"></td>' +
    '<td><input class="inp" data-f="dcNo" value="' + esc(it.dcNo || '') + '" disabled title="System generated after Save"></td>' +
    '<td>' + cbox(clsId, { opts: db.masters.classifications, value: it.classification || (itemByName(it.item) || {}).classification || '', f: 'classification', placeholder: 'Classification *', free: true, onSet: function () { jwClassChanged(clsId, itemId); } }) + '</td>' +
    '<td>' + cbox(itemId, { opts: itemOptsFor(it.classification || (itemByName(it.item) || {}).classification || ''), value: it.item || '', f: 'item', placeholder: 'Fabric / Trim *', free: true, onSet: function (v) { const el = qs('[data-cb-input="' + itemId + '"]'); jwSetUnit(el, v); jwRowRefresh(el); calcJWExtras(); } }) +
    '</td>' +
    '<td>' + cbox(poId, { opts: inwardOptionsForItem(it.item), value: inwardNoForIssue(it), f: 'inwardNo', placeholder: 'Select Inward *', free: false, onSet: function () { jwSyncPoRef(qs('[data-cb-input="' + poId + '"]').closest('tr')); jwRowRefresh(qs('[data-cb-input="' + poId + '"]')); } }) + '</td>' +
    '<td class="po-ref-cell"><input class="inp" data-f="poRef" value="' + esc(it.poRef || poRefFromInward(inwardNoForIssue(it))) + '" placeholder="Auto" disabled></td>' +
    '<td class="num" data-postock style="color:var(--muted);font-weight:600">' + fmtNum(inwardItemStock(inwardNoForIssue(it), it.item, stockExcept())) + '</td>' +
    '<td><input class="inp num" type="number" min="0" step="0.01" data-f="qty" value="' + (it.qty ?? '') + '" placeholder="0" oninput="jwCheckActual(this)" title="Cannot exceed stock"></td>' +
    '<td class="uom-cell"><input class="inp" data-f="unit" value="' + esc(it.unit || itemUnit(it.item) || '') + '" placeholder="Auto" disabled></td>' +
    '<td class="pod-cell" data-jw-group-pod>' + podCellHtml(podId) + '</td>' +
    '<td class="actions-cell">' +
    (it._saved ? '<button type="button" class="btn-icon jw-row-edit" title="Edit this saved row" onclick="jwEditIssueRow(this)">' + ic('pencil', 15) + '</button>' : '') +
    '<button type="button" class="btn-icon danger jw-row-delete" onclick="removeRow(this);calcJWExtras();jwGroupRowsByDate(\'jw-extras\');jwRefreshSharedStock()">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
/* Sample allows several styles — rebuild one garment row per picked style */
function smpStylesChanged() {
  const tb = $('jw-garments'); if (!tb) return;
  const chosen = mcboxGet('smp-styles');
  const current = gatherGarmentRows();
  tb.innerHTML = chosen.map(function (s) {
    const g = current.find(function (x) { return x.style === s; }) || {};
    return jwGarmentRow(Object.assign({}, g, { style: s }));
  }).join('');
  afterRenderGarments();
}
/* dropping a garment row unticks that style in the header picker */
function smpRemoveStyleRow(btn) {
  const tr = btn.closest('tr'); if (!tr) return;
  const el = qs('[data-f="style"]', tr);
  const s = el ? el.value : '';
  const c = MCBOX['smp-styles'];
  if (c && s) {
    const i = c.sel.indexOf(s);
    if (i > -1) c.sel.splice(i, 1);
    updateMcboxInput('smp-styles'); renderMcboxList('smp-styles');
  }
  tr.remove();
  afterRenderGarments();
}


function jwAssignDcNosOnSave(lines, kind) {
  const byDate = {};
  (lines || []).forEach(function (row) { if (row.date && row.dcNo && !byDate[row.date]) byDate[row.date] = row.dcNo; });
  (lines || []).forEach(function (row) {
    if (!row.date) return;
    if (!byDate[row.date]) byDate[row.date] = kind === 'sample' ? nextSampleDcNo() : nextNo('dc', 'DC');
    row.dcNo = byDate[row.date];
  });
}
function saveJobWork(id) {
  clearReqMarks();
  /* validate in the same order the fields appear on screen */
  if (!cboxGet('jw-vendor')) return reqBad('jw-vendor', 'Job worker / vendor is required');
  if (!cboxGet('jw-style')) return reqBad('jw-style', 'Style (Internal ID) is required');
  const issuesRaw = gatherRows('jw-issues', ['item']);
  // attach POD uploads + size consumption to their matching issue row (by row order, skipping empty-item rows)
  let ri = 0;
  qsa('#jw-issues tr').forEach(tr => {
    const itemVal = ((qs('[data-f="item"]', tr) || {}).value || '').trim();
    if (!itemVal) return;
    const row = issuesRaw[ri++]; if (!row) return;
    jwApplyGroupMeta('jw-issues', tr, row);
    const mcb = qs('.mcbox', tr);
    if (mcb && mcb.dataset.mcb) {
      const c = MCBOX[mcb.dataset.mcb];
      if (c) row.sizes = c.sel.slice();
    }
    row.requiredFabric = row.qty || 0;      // the size-wise requirement
    if (row.actualQty === '' || row.actualQty == null) row.actualQty = row.qty || 0;
    row.qty = pf(row.actualQty) || pf(row.qty);   // what actually left the store
    if (row.inwardNo) row.poRef = poRefFromInward(row.inwardNo);
  });
  const issues = issuesRaw.filter(i => pf(i.qty) > 0 || pf(i.actualQty) > 0);
  const dupKey = {};
  for (let k = 0; k < issues.length; k++) {
    const nm = lcName(bareItemName(issues[k].item));
    const ik = nm + '|' + lcName(issues[k].inwardNo);
    if (nm && issues[k].inwardNo && dupKey[ik]) {
      return reqBadCell('jw-issues', k, 'inwardNo', 'Duplicate — ' + bareItemName(issues[k].item) + ' on ' + issues[k].inwardNo + ' appears more than once under Material Issues.');
    }
    dupKey[ik] = 1;
  }
  /* 3. Material Issues — every used row needs these */
  // v5: skip the per-row validation when there are 0 rows AND we are editing (allow deleting all)
  if (qsa('#jw-issues tr').length > 0 && !requireRowFields('jw-issues', [
    { f: 'classification', label: 'Classification' },
    { f: 'item', label: 'Item Name' },
    { f: 'inwardNo', label: 'Inward No.' },
    { f: '__sizes', label: 'Size Selection' },
    { f: 'cons', label: 'Cons./Gmt' }
  ], 'material issue row')) return false;
  // v5: only require at least one issue on NEW records (allow deleting all from existing records)
  if (!id && !issues.length) return reqBadCell('jw-issues', 0, 'item', 'Add at least one material issue (fabric / trim) with qty');
  const rec = id ? db.jobwork.find(r => r.id === id) : null;
  const receipts = rec ? (rec.receipts || []) : [];
  /* 2. Style is picked in the header; each resulting row needs its sizes */
  if (!requireRowFields('jw-garments', [
    { f: '__sizes', label: 'Size Selection' }
  ], 'style row')) return false;
  const garmentRows = gatherGarmentRows();
  if (!garmentRows.length) return reqBad('jw-style', 'Style (Internal ID) is required');
  if (!garmentRows.some(g => g.orderQty > 0)) {
    const grow = qsa('#jw-garments tr')[0];
    const szEl = grow ? (qs('.sz-inputs input', grow) || qs('.mcbox-input', grow)) : null;
    return reqBad(szEl, 'Enter size-wise qty for at least one style');
  }
  const garments = garmentRows.map(g => ({
    style: g.style, portal: g.portal, desc: g.style, colour: g.colour, sizes: g.sizes,
    orderQty: g.orderQty, rate: g.rate,
    receivedQty: receipts.filter(r => r.desc === g.style && r.colour === g.colour).reduce((a, r) => a + pf(r.qty), 0)
  }));
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
  /* 4. Extra Quantity Issued — classification / item / Inward on every used row.
     Blank spare rows are ignored, so this table stays optional as a whole. */
  const xRows = qsa('#jw-extras tr');
  for (let i = 0; i < xRows.length; i++) {
    const tr = xRows[i];
    if (rowIsBlank(tr, ['classification', 'item', 'inwardNo', 'reason', 'qty'])) continue;
    const need = [
      { f: 'classification', label: 'Classification' },
      { f: 'item', label: 'Item Name' },
      { f: 'inwardNo', label: 'Inward No.' }
    ];
    for (let k = 0; k < need.length; k++) {
      if (rowVal(tr, need[k].f) === '') {
        return reqBadIn(tr, need[k].f, need[k].label + ' is required on extra issue row ' + (i + 1));
      }
    }
  }
  /* Extra Quantity Issued intentionally allows the same item on several lines
     (separate top-ups, each with its own reason) */
  for (let k = 0; k < extras.length; k++) {
    if (!String(extras[k].reason || '').trim()) {
      return reqBadCell('jw-extras', k, 'reason', 'Reason is required for every Extra Quantity Issued line — ' + (bareItemName(extras[k].item) || 'item ' + (k + 1)));
    }
  }
  if (!jwValidateCombinedStock(issues, extras, id, 'jobwork')) return false;
  /* Consume the next DC sequence only now, after every validation has passed. */
  jwAssignDcNosOnSave(issues);
  jwAssignDcNosOnSave(extras);
  const data = {
    date: dval('f-date') || today(), vendor: cboxGet('jw-vendor'),
    /* keep `styles` in step with the garment rows actually present, so a
       legacy multi-style job work never loses a row on re-save */
    styles: (function () {
      const out = [];
      garmentRows.forEach(function (g) { if (g.style && out.indexOf(g.style) === -1) out.push(g.style); });
      const cur = cboxGet('jw-style');
      if (cur && out.indexOf(cur) === -1) out.push(cur);
      return out;
    })(),
    issues, garments, extras,
    issueDate: (issues[0] && issues[0].date) || '',
    expectedDate: rec ? (rec.expectedDate || '') : '',
    receiveDate: rec ? (rec.receiveDate || '') : '',
    status: rec ? (rec.status || 'Issued') : 'Issued',
    notes: rec ? (rec.notes || '') : ''
  };
  data.status = jwAutoStatus(data);
  if (id) Object.assign(rec, data);
  else { data.id = uid(); data.no = nextNo('jobwork', 'JW'); data.createdAt = Date.now(); data.receipts = []; db.jobwork.push(data); }
  const saved = saveDB();
  const savedNo = id ? (rec ? rec.no : '') : data.no;
  pageView = null; toast('Job Work saved — ' + savedNo, 'green'); render();
  if (!saved) setTimeout(function () { toast('⚠️ Storage full — POD images may not be saved. Remove some images.', 'red'); }, 400);
}



/* ---- Receive Finished Goods — full page, multiple receipts (each with own date + consumption) ---- */
/* ---------- size-wise receiving ----------------------------------
   RCSZ holds the per-row size boxes so a re-render never loses typing. */
const RCSZ = {};
/* sizes ordered for a style on this job work (in Size Master order) */
function rcOrderedSizes(rec, style) {
  const order = db.masters.sizes || [];
  const sortKeys = function (keys) {
    return keys.slice().sort(function (a, b) {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  };
  /* Sizes are scoped to the STYLE: show the sizes that style was ordered in,
     plus any size already received against it. Only when the style has no
     order line at all do we fall back to the whole Size Master. */
  const g = (rec.garments || []).find(function (x) { return x.desc === style || x.style === style; });
  const sz = (g && g.sizes && typeof g.sizes === 'object' && !Array.isArray(g.sizes)) ? g.sizes : {};
  const seen = {};
  const keys = [];
  Object.keys(sz).forEach(function (k) {
    if (pf(sz[k]) > 0 && !seen[k]) { seen[k] = 1; keys.push(k); }
  });
  /* a size already received for this style must stay visible/editable */
  (rec.receipts || []).forEach(function (r) {
    if (r.desc !== style || !r.sizes || typeof r.sizes !== 'object') return;
    Object.keys(r.sizes).forEach(function (k) {
      if (pf(r.sizes[k]) > 0 && !seen[k]) { seen[k] = 1; keys.push(k); }
    });
  });
  if (keys.length) return sortKeys(keys).map(function (k) { return { size: k, ordered: pf(sz[k]) }; });
  /* style not size-ordered here — offer the full Size Master */
  return sortKeys(order).map(function (k) { return { size: k, ordered: pf(sz[k]) }; });
}
/* qty already received for a style/size across saved receipts */
function rcReceivedBySize(rec, style, size, excludeRid) {
  let tot = 0;
  (rec.receipts || []).forEach(function (r) {
    if (r.desc !== style) return;
    if (excludeRid && r.rid === excludeRid) return;
    if (r.sizes && typeof r.sizes === 'object') tot += pf(r.sizes[size]);
  });
  return tot;
}
/* the Receive Now cell — one box per ordered size, or a single box when the
   style has no size breakdown */
function rcSizeCellHtml(rowId, style, vals, excludeRid) {
  const rec = rcRecord();
  const store = RCSZ[rowId] || (RCSZ[rowId] = { sizes: {}, flat: '' });
  if (vals && typeof vals === 'object') store.sizes = Object.assign({}, vals);
  /* show the size strip even before a style is picked, so the row never
     flips from a single box to size boxes mid-entry */
  const list = rec ? rcOrderedSizes(rec, style) : [];
  if (!list.length) {
    return '<input class="inp num" type="number" min="0" data-f="recv" value="' +
      esc(store.flat != null ? store.flat : '') + '" placeholder="0" oninput="rcFlatChanged(\'' + rowId + '\',this.value)">';
  }
  return '<div class="rc-sz">' + list.map(function (o) {
    const done = rcReceivedBySize(rec, style, o.size, excludeRid);
    const bal = Math.max(0, o.ordered - done);
    const v = store.sizes[o.size];
    const hasOrder = o.ordered > 0;
    return '<span class="szbox"><span class="szlbl">' + esc(o.size) + '</span>' +
      '<input class="inp inp-sm szin" type="number" min="0" data-f="sz' + esc(o.size) + '" ' +
      'value="' + esc(v != null ? v : '') + '" placeholder="0" title="' +
      (hasOrder ? 'Ordered ' + fmtNum(o.ordered) + ' \u00b7 pending ' + fmtNum(bal)
        : 'Not size-ordered on this job work \u00b7 received ' + fmtNum(done)) +
      '" oninput="rcSizeChanged(\'' + rowId + '\')">' +
      '<span class="szbal">' + (hasOrder ? fmtNum(bal) : '\u2014') + '</span></span>';
  }).join('') + '</div>';
}
function rcLockRows() {
  qsa('#rc-saved tr.rc-locked').forEach(function (tr) {
    qsa('input,select,textarea', tr).forEach(function (el) { el.disabled = true; });
    qsa('.cbox,.mcbox', tr).forEach(function (bx) { bx.classList.add('cbox-ro'); });
  });
  qsa('#rc-saved tr:not(.rc-locked)').forEach(function (tr) {
    qsa('.cbox,.mcbox', tr).forEach(function (bx) { bx.classList.remove('cbox-ro'); });
  });
}
function rcSizeChanged(rowId) {
  const store = RCSZ[rowId] || (RCSZ[rowId] = { sizes: {}, flat: '' });
  const cell = qs('[data-rcrow="' + rowId + '"]');
  if (cell) qsa('input[data-f^="sz"]', cell).forEach(function (inp) { store.sizes[inp.dataset.f.slice(2)] = inp.value; });
  calcReceive();
}
function rcFlatChanged(rowId, v) {
  const store = RCSZ[rowId] || (RCSZ[rowId] = { sizes: {}, flat: '' });
  store.flat = v;
  calcReceive();
}
/* read a combobox/input cell from a receive row */
function rcCellVal(tr, f) {
  const el = qs('[data-f="' + f + '"]', tr);
  if (!el) return '';
  if (el.dataset.cbInput) return String(cboxGet(el.dataset.cbInput) || '').trim();
  if (el.dataset.cb) return String(cboxGet(el.dataset.cb) || '').trim();
  return String(el.value || '').trim();
}
/* total for one row */
function rcRowQty(tr) {
  const szs = qsa('input[data-f^="sz"]', tr);
  if (szs.length) return szs.reduce(function (a, i) { return a + pf(i.value); }, 0);
  const flat = qs('[data-f="recv"]', tr);
  return flat ? pf(flat.value) : 0;
}
/* the size map typed into one row */
function rcRowSizes(tr) {
  const out = {};
  qsa('input[data-f^="sz"]', tr).forEach(function (i) {
    const q = pf(i.value);
    if (q > 0) out[i.dataset.f.slice(2)] = q;
  });
  return out;
}
/* style picked / changed — rebuild that row's size boxes */
function rcStyleChanged(rowId, style, excludeRid) {
  const cell = qs('[data-rcrow="' + rowId + '"]');
  if (!cell) return;
  RCSZ[rowId] = { sizes: {}, flat: '' };
  cell.innerHTML = rcSizeCellHtml(rowId, style, null, excludeRid);
  calcReceive();
}
/* drop an entry line; the last line for a style stays so the style is not lost */
function rcRemoveEntryRow(btn) {
  const tr = btn.closest('tr'); if (!tr) return;
  const tb = tr.parentNode;
  if (tb && qsa('tr', tb).length <= 1) {
    /* keep the row but clear it */
    qsa('input[data-f^="sz"]', tr).forEach(function (i) { i.value = ''; });
    const flat = qs('[data-f="recv"]', tr); if (flat) flat.value = '';
    calcReceive();
    return;
  }
  tr.remove();
  renumberSr();
  calcReceive();
}
/* add another dated entry line for a style (same style, different date) */
function rcAddDateRow(style) {
  const tb = $('rc-garments'); if (!tb) return;
  const rec = rcRecord();
  const g = (rec && style) ? ((rec.garments || []).find(function (x) { return (x.style || x.desc) === style; }) || { style: style, desc: style })
    : { style: style, desc: style };
  tb.insertAdjacentHTML('beforeend', rcGarmentRow(Object.assign({}, g, { style: style, date: today() })));
  dpSyncAll(tb);
  calcReceive();
  const rows = qsa('tr', tb);
  const last = rows[rows.length - 1];
  const f = last ? (qs('input[data-f^="sz"]', last) || qs('[data-f="recv"]', last)) : null;
  if (f) { try { f.focus(); } catch (e) { } }
}
/* every stored receipt needs a stable id so edits can be matched back */
function rcEnsureIds(rec) {
  (rec.receipts || []).forEach(function (r) { if (!r.rid) r.rid = uid(); });
}
/* an already-saved receipt, rendered as an editable row */
function rcSavedRow(r) {
  const rowId = rid('rcrow');
  let saved = (r.sizes && typeof r.sizes === 'object') ? r.sizes : null;
  /* receipts booked before size-wise entry have no size map. If the style is
     size-broken, seed the boxes proportionally so the quantity is never lost. */
  if (!saved) {
    const recNow = rcRecord();
    const list = (recNow && r.desc) ? rcOrderedSizes(recNow, r.desc) : [];
    if (list.length) {
      const ordTot = list.reduce(function (a, o) { return a + o.ordered; }, 0);
      const q = pf(r.qty);
      saved = {};
      let run = 0;
      list.forEach(function (o, i) {
        const share = (i === list.length - 1) ? (q - run) : Math.round(q * (ordTot ? o.ordered / ordTot : 0));
        saved[o.size] = Math.max(0, share);
        run += saved[o.size];
      });
    }
  }
  RCSZ[rowId] = { sizes: saved ? Object.assign({}, saved) : {}, flat: saved ? '' : (r.qty ?? '') };
  const qcId = rid('rcsqc'), whId = rid('rcswh');
  /* saved receipts open locked — the Edit button unlocks the row */
  return '<tr class="rc-hist rc-locked" data-rid="' + esc(r.rid || '') + '">' +
    srTd() +
    '<td><input class="inp" type="text" data-date autocomplete="off" readonly data-f="date" value="' + esc(r.date || '') + '" disabled></td>' +
    '<td class="rc-stname"><b>' + esc(styleLabel(r.desc) || r.desc || '\u2014') + '</b>' +
    '<input type="hidden" data-f="desc" value="' + esc(r.desc || '') + '"></td>' +
    '<td class="rc-szcell" data-rcrow="' + rowId + '">' + rcSizeCellHtml(rowId, r.desc || '', saved, r.rid) + '</td>' +
    '<td class="rc-uom">pcs</td>' +
    '<td class="rc-qc">' + cbox(qcId, { opts: db.masters.qcResults, value: r.qc || 'Pass', f: 'qc', placeholder: 'QC', free: false }) + '</td>' +
    '<td class="rc-wh">' + cbox(whId, { opts: db.masters.warehouses, value: r.warehouse || '', f: 'warehouse', placeholder: 'Warehouse', free: false }) + '</td>' +
    '<input type="hidden" data-f="colour" value="' + esc(r.colour || '') + '">' +
    '<input type="hidden" data-f="consumption" value="' + esc(r.consumption ?? '') + '">' +
    '<td class="actions-cell">' +
    '<button type="button" class="btn-icon" title="Edit this receipt" onclick="rcEditSaved(this)">' + ic('pencil', 15) + '</button>' +
    '<button type="button" class="btn-icon danger" title="Delete this receipt" onclick="rcDeleteSaved(this)">' + ic('trash', 15) + '</button>' +
    '</td>' +
    '</tr>';
}
/* unlock a saved receipt row for editing */
function rcEditSaved(btn) {
  const tr = btn.closest('tr'); if (!tr) return;
  tr.classList.remove('rc-locked');
  qsa('input,select,textarea', tr).forEach(function (el) {
    if (el.dataset.f === 'uom') return;                 /* UOM stays fixed */
    el.disabled = false;
  });
  /* re-enable the comboboxes in this row */
  qsa('.cbox,.mcbox', tr).forEach(function (bx) { bx.classList.remove('cbox-ro'); });
  btn.disabled = true;
  btn.title = 'Editing — change the values, then Save receipt';
  const first = qs('input[data-f^="sz"]', tr) || qs('[data-f="recv"]', tr);
  if (first) { try { first.focus(); first.select(); } catch (e) { } }
  toast('Row unlocked — edit it, then press Save receipt', 'green');
}
/* removing a saved receipt asks first, then drops the row (applied on save) */
function rcDeleteSaved(btn) {
  const tr = btn.closest('tr'); if (!tr) return;
  const qtyEl = qs('[data-f="qty"]', tr);
  const nameEl = qs('[data-f="desc"]', tr);
  const nm = nameEl ? (nameEl.dataset.cbInput ? cboxGet(nameEl.dataset.cbInput) : nameEl.value) : '';
  confirmDelete({ kind: 'receipt', name: (nm || 'this style') + ' — ' + fmtNum(qtyEl ? qtyEl.value : 0) + ' pcs' }, function () {
    tr.remove();
    renumberSr();
    calcReceive();
    toast('Receipt removed — save to apply', 'green');
  });
}
function rcGarmentRow(g) {
  g = g || {};
  const rowId = rid('rcrow'), qcId = rid('rcqc'), whId = rid('rcwh');
  const style0 = g.style || g.desc || '';
  RCSZ[rowId] = { sizes: {}, flat: '' };
  return '<tr>' +
    srTd() +
    '<td><input class="inp" type="text" data-date autocomplete="off" readonly data-f="date" value="' + esc(g.date || today()) + '"></td>' +
    '<td class="rc-stname"><b>' + esc(styleLabel(style0) || style0 || '\u2014') + '</b>' +
    '<input type="hidden" data-f="desc" value="' + esc(style0) + '"></td>' +
    '<td class="rc-szcell" data-rcrow="' + rowId + '">' + rcSizeCellHtml(rowId, style0, null) + '</td>' +
    '<td class="rc-uom">pcs</td>' +
    '<td class="rc-qc">' + cbox(qcId, { opts: db.masters.qcResults, value: g.qc || 'Pass', f: 'qc', placeholder: 'QC', free: false, addMaster: 'qcResults', addText: 'QC Result' }) + '</td>' +
    '<td class="rc-wh">' + cbox(whId, { opts: db.masters.warehouses, value: g.warehouse || '', f: 'warehouse', placeholder: 'Warehouse', free: false, addMaster: 'warehouses', addText: 'Warehouse' }) + '</td>' +
    /* retained so saved records and downstream logic keep working */
    '<input type="hidden" data-f="colour" value="' + esc(g.colour || '') + '">' +
    '<input type="hidden" data-f="oqty" value="' + (g.orderQty ?? '') + '">' +
    '<input type="hidden" data-f="recv0" value="' + (g.receivedQty ?? 0) + '">' +
    '<input type="hidden" data-f="consumption" value="">' +
    '<td><button type="button" class="btn-icon danger" title="Remove this line" onclick="rcRemoveEntryRow(this)">' + ic('trash', 15) + '</button></td>' +
    '</tr>';
}
/* live totals under the receipts table */
function calcReceive() {
  const rec = rcRecord();
  if (!rec) return;
  let now = 0;
  qsa('#rc-garments tr').forEach(function (tr) { now += rcRowQty(tr); });
  /* saved receipts are editable, so read them from the DOM too */
  let saved = 0;
  const savedTb = $('rc-saved');
  if (savedTb) {
    qsa('tr', savedTb).forEach(function (tr) { saved += rcRowQty(tr); });
  } else {
    saved = jwTotalReceived(rec);
  }
  const total = saved + now;
  /* per-row running total under each size strip */
  qsa('.rc-szcell').forEach(function (cell) {
    const tr = cell.closest('tr'); if (!tr) return;
    const strip = qs('.rc-sz', cell); if (!strip) return;
    let tot = qs('.rc-sz-tot', cell);
    if (!tot) { tot = document.createElement('span'); tot.className = 'rc-sz-tot'; cell.appendChild(tot); }
    const q = rcRowQty(tr);
    tot.textContent = q > 0 ? fmtNum(q) + ' pcs' : '';
  });
  const fUnit = jwFabricUnit(rec) || 'meter';
  const issued = jwFabricTotal(rec);
  const returned = jwFabricReturned(rec);
  const actual = Math.max(0, issued - returned);
  const actCons = actual > 0 ? total / actual : 0;
  const woCons = jwWorkOrderCons(rec);
  const diff = actCons - woCons;
  const set = function (id, v) { const e = $(id); if (e) e.textContent = v; };
  set('rc-total', fmtNum(total));
  set('rc-fab-issued', fmtNum(issued));
  set('rc-fab-return', fmtNum(returned));
  set('rc-fab-actual', fmtNum(actual));
  set('rc-act-cons', actCons ? actCons.toFixed(2) : '0.00');
  set('rc-wo-cons', woCons ? woCons.toFixed(2) : '0.00');
  set('rc-diff', (diff ? diff.toFixed(2) : '0.00'));
  const de = $('rc-diff');
  if (de) de.style.color = Math.abs(diff) < 0.005 ? 'var(--ink)' : (diff > 0 ? '#8e1f0b' : '#0c5132');
  qsa('.rc-unit-f').forEach(function (e) { e.textContent = fUnit === 'm' ? 'meter' : fUnit; });
  renumberSr();
}
/* the record behind the receive page — Job Work or Sample */
function rcModule() { return (pageView && pageView.rcMod) ? pageView.rcMod : 'jobwork'; }
function rcRecord() {
  if (!pageView || pageView.kind !== 'receive') return null;
  const list = db[rcModule()] || [];
  return list.find(function (r) { return r.id === pageView.jwId; }) || null;
}
function openReceive(jwId, mod) {
  mod = mod || 'jobwork'; if (!userCan(mod, 'edit')) return toast('Receive/Edit access denied', 'red');
  const list = db[mod] || [];
  const rec = list.find(function (r) { return r.id === jwId; });
  if (rec && rec.status === 'Closed') return toast((rec.no || 'This entry') + ' is closed — reopen it to receive', 'red');
  pageView = { kind: 'receive', jwId: jwId, rcMod: mod || 'jobwork' };
  render();
}
function renderReceivePage() {
  setTimeout(dpSyncAll, 0);
  const rec = rcRecord(); if (!rec) { back(); return; }
  rcEnsureIds(rec);
  $('tb-title').textContent = rcModule() === 'sample' ? 'Receive samples' : 'Receive finished goods';
  $('tb-sub').textContent = rec.no + ' · ' + rec.vendor + (rec.status === 'Closed' ? ' · Closed' : '');
  $('tb-actions').innerHTML =
    '<button class="btn btn-ghost" onclick="back()">' + ic('back', 16) + 'Back</button>' +
    (rec.status === 'Closed'
      ? '<span class="badge b-gray">Closed</span>'
      : '<button class="btn btn-primary" onclick="saveReceivePage()">' + ic('save', 16) + 'Save receipt</button>');
  const styleList = jwStyleList(rec);
  const gs = styleList.length
    ? styleList.map(function (s) {
      return (rec.garments || []).find(function (x) { return (x.style || x.desc) === s; }) || { style: s, desc: s };
    })
    : ((rec.garments && rec.garments.length) ? rec.garments : [{}]);
  const receipts = jwReceipts(rec).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const pending = Math.max(0, jwTotalOrder(rec) - jwTotalReceived(rec));
  const fUnitRaw = jwFabricUnit(rec);
  const fUnit = fUnitRaw === 'm' ? 'meter' : (fUnitRaw || 'meter');
  const chips =
    '<div class="stock-chip">🧵 <b>' + esc(rec.no) + '</b> · ' + esc(rec.vendor) +
    (jwStyleList(rec).length ? ' &nbsp;·&nbsp; Style: <b>' + esc(jwStyleList(rec).map(styleLabel).join(', ')) + '</b>' : '') +
    ' &nbsp;·&nbsp; Order: <b>' + fmtNum(jwTotalOrder(rec)) + '</b>' +
    ' &nbsp;·&nbsp; Received: <b>' + fmtNum(jwTotalReceived(rec)) + '</b>' +
    ' &nbsp;·&nbsp; Pending: <b>' + fmtNum(pending) + '</b></div>';

  /* receipts already booked — editable, each keyed to its stored entry */
  const histRows = receipts.map(function (r) { return rcSavedRow(r); }).join('');

  /* the metric block from the spec */
  const mrow = function (label, valId, unit, cls) {
    return '<tr class="rc-sum' + (cls ? ' ' + cls : '') + '">' +
      '<td class="srcol"></td><td></td><td class="rc-lbl">' + label + '</td>' +
      '<td class="num"><b id="' + valId + '">0</b></td>' +
      '<td class="rc-sumunit" colspan="3">' + unit + '</td></tr>';
  };
  const summary =
    mrow('Total', 'rc-total', 'pcs', 'rc-total-row') +
    mrow('Fabric Issued', 'rc-fab-issued', '<span class="rc-unit-f">' + esc(fUnit) + '</span>') +
    mrow('Fabric Return', 'rc-fab-return', '<span class="rc-unit-f">' + esc(fUnit) + '</span>') +
    mrow('Actual Fabric Issued', 'rc-fab-actual', '<span class="rc-unit-f">' + esc(fUnit) + '</span>') +
    mrow('Actual Consumption', 'rc-act-cons', 'pcs/<span class="rc-unit-f">' + esc(fUnit) + '</span>') +
    mrow('Work Order Consumption', 'rc-wo-cons', 'pcs/<span class="rc-unit-f">' + esc(fUnit) + '</span>') +
    mrow('Difference', 'rc-diff', '', 'rc-diff-row');

  $('content').innerHTML = chips +
    '<div class="entry-page">' +
    '<div class="sec">Receive Finished Goods</div>' +
    '<div class="table-wrap"><table class="mini-table rc-table"><thead><tr>' +
    srTh() + '<th class="rc-dcol">Date</th><th class="rc-stcol">Style</th>' +
    '<th>Receive Now <span class="rc-szhint">(size-wise)</span></th>' +
    '<th class="rc-ucol">UOM</th><th class="rc-qccol">QC</th><th class="rc-whcol">Warehouse</th><th></th>' +
    '</tr></thead>' +
    '<tbody class="rc-histbody" id="rc-saved">' + histRows + '</tbody>' +
    '<tbody id="rc-garments">' + gs.map(rcGarmentRow).join('') + '</tbody>' +
    '<tbody class="rc-sumbody">' + summary + '</tbody>' +
    '</table></div>' +
    '<div class="rc-addbar">' +
    (styleList.length
      ? styleList.map(function (s) {
        return '<button class="btn btn-ghost btn-sm" onclick="rcAddDateRow(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')">' +
          ic('plus', 15) + 'Add date \u00b7 ' + esc(styleLabel(s) || s) + '</button>';
      }).join('')
      : '<button class="btn btn-ghost btn-sm" onclick="rcAddDateRow(\'\')">' + ic('plus', 15) + 'Add date</button>') +
    '</div>' +
    '<div class="hint">💡 Each line is one dated receipt \u2014 one row per style, and <b>Add date</b> books that style again on another day. <b>Receive Now</b> shows a box for each size that style was ordered in — the small grey figure under each box is the pending quantity for that size (\u2014 when the size was not part of the order). Set <b>QC</b> and the receiving <b>Warehouse</b> on each line. Saved receipts are locked: press ✎ to edit one or 🗑 to delete it, then press Save receipt. <b>Actual Fabric Issued</b> = Fabric Issued − Fabric Return, and <b>Actual Consumption</b> = Total received ÷ Actual Fabric Issued. <b>Difference</b> compares it with the Cons./Gmt planned on the job work.</div>' +
    '</div>';
  rcLockRows();
  calcReceive();
}
function saveReceivePage() {
  clearReqMarks();
  const rec = rcRecord(); if (!rec) return;
  if (rec.status === 'Closed') return toast((rec.no || 'This entry') + ' is closed — reopen it to receive', 'red');
  /* new entry rows — read directly so the dynamic size boxes are included */
  const rows = [];
  qsa('#rc-garments tr').forEach(function (tr) {
    const nameEl = qs('[data-f="desc"]', tr);
    const nm = nameEl ? (nameEl.dataset.cbInput ? cboxGet(nameEl.dataset.cbInput) : nameEl.value) : '';
    const q = rcRowQty(tr);
    if (!nm && q <= 0) return;                    /* untouched spare row */
    rows.push({
      tr: tr,
      date: dval(qs('[data-f="date"]', tr)),
      desc: nm,
      colour: (qs('[data-f="colour"]', tr) || {}).value || '',
      oqty: (qs('[data-f="oqty"]', tr) || {}).value || '',
      recv: q,
      sizes: rcRowSizes(tr),
      qc: rcCellVal(tr, 'qc'),
      warehouse: rcCellVal(tr, 'warehouse'),
      consumption: pf((qs('[data-f="consumption"]', tr) || {}).value)
    });
  });
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].desc) return reqBadIn(rows[i].tr, 'desc', 'Style is required on receipt row ' + (i + 1));
    if (pf(rows[i].recv) > 0) {
      if (!rows[i].qc) return reqBadIn(rows[i].tr, 'qc', 'QC result is required on receipt row ' + (i + 1));
      if (!rows[i].warehouse) return reqBadIn(rows[i].tr, 'warehouse', 'Warehouse is required on receipt row ' + (i + 1));
    }
  }
  /* ---- apply edits to receipts that were already saved ---- */
  const prevRx = (rec.receipts || []).slice();
  const keptRx = [];
  const savedTb = $('rc-saved');
  if (savedTb) {
    const srows = qsa('tr', savedTb);
    for (let i = 0; i < srows.length; i++) {
      const tr = srows[i];
      const nameEl = qs('[data-f="desc"]', tr);
      const nm = nameEl ? (nameEl.dataset.cbInput ? cboxGet(nameEl.dataset.cbInput) : nameEl.value) : '';
      const q = rcRowQty(tr);
      const szMap = rcRowSizes(tr);
      if (!nm) return reqBadIn(tr, 'desc', 'Style is required on saved receipt row ' + (i + 1));
      if (q <= 0) {
        const firstSz = qs('input[data-f^="sz"]', tr);
        return reqBad(firstSz || qs('[data-f="recv"]', tr), 'Quantity must be more than zero on saved receipt row ' + (i + 1));
      }
      const orig = prevRx.find(function (x) { return x.rid === tr.dataset.rid; }) || {};
      const colEl = qs('[data-f="colour"]', tr);
      let col = colEl ? colEl.value : (orig.colour || '');
      if (!col) { const gm = (rec.garments || []).find(function (x) { return x.desc === nm; }); if (gm) col = gm.colour || ''; }
      keptRx.push({
        rid: tr.dataset.rid || uid(),
        date: dval(qs('[data-f="date"]', tr)) || orig.date || today(),
        desc: nm, colour: col, qty: q,
        sizes: Object.keys(szMap).length ? szMap : (orig.sizes || undefined),
        qc: rcCellVal(tr, 'qc') || orig.qc || '',
        warehouse: rcCellVal(tr, 'warehouse') || orig.warehouse || '',
        consumption: pf((qs('[data-f="consumption"]', tr) || {}).value)
      });
    }
  } else {
    prevRx.forEach(function (x) { keptRx.push(x); });
  }
  const removedCount = prevRx.length - keptRx.length;
  const addingNew = rows.some(r => pf(r.recv) > 0);
  const changedSaved = removedCount > 0 || keptRx.some(function (k) {
    const o = prevRx.find(function (x) { return x.rid === k.rid; });
    return !o || pf(o.qty) !== pf(k.qty) || o.desc !== k.desc || o.date !== k.date;
  });
  if (!addingNew && !changedSaved) {
    return reqBadCell('rc-garments', 0, 'recv', 'Enter receive qty for at least one style');
  }
  const existing = (rec.garments || []).slice();
  rec.receipts = keptRx;
  rows.forEach(r => {
    if (!r.colour) {
      const gm = (rec.garments || []).find(x => x.desc === r.desc);
      if (gm) r.colour = gm.colour || '';
    }
    const qty = pf(r.recv);
    if (qty <= 0) return;
    rec.receipts.push({
      rid: uid(), date: r.date || today(), desc: r.desc, colour: r.colour || '', qty: qty,
      sizes: (r.sizes && Object.keys(r.sizes).length) ? r.sizes : undefined,
      qc: r.qc || '', warehouse: r.warehouse || '',
      consumption: pf(r.consumption)
    });
  });
  rows.forEach(r => {
    /* the Colour column was removed from this screen, so a blank colour must
       fall back to matching on the style alone instead of forking a new garment */
    let g = rec.garments.find(x => x.desc === r.desc && x.colour === r.colour)
      || (!r.colour ? rec.garments.find(x => x.desc === r.desc) : null);
    if (g && !r.colour) r.colour = g.colour || '';
    const st = db.masters.styles.find(s => s.internal === r.desc);
    if (!g) { g = { style: r.desc, portal: st ? st.portal : '', desc: r.desc, colour: r.colour, sizes: {}, orderQty: 0, rate: 0, receivedQty: 0 }; rec.garments.push(g); }
    if (st && !g.style) { g.style = st.internal; g.portal = st.portal; }
    const m = existing.find(x => x.desc === r.desc && x.colour === r.colour);
    if (pf(r.oqty) > 0) g.orderQty = pf(r.oqty);
    else if (m && pf(m.orderQty) > 0) g.orderQty = pf(m.orderQty);
    if (m) g.rate = pf(m.rate);
  });
  /* a style that now only exists on an edited saved row still needs a garment */
  keptRx.forEach(function (k) {
    if (rec.garments.some(function (x) { return x.desc === k.desc; })) return;
    const st = db.masters.styles.find(function (s) { return s.internal === k.desc; });
    rec.garments.push({ style: k.desc, portal: st ? st.portal : '', desc: k.desc, colour: k.colour || '', sizes: {}, orderQty: 0, rate: 0, receivedQty: 0 });
  });
  rec.garments.forEach(g => { g.receivedQty = rec.receipts.filter(rx => rx.desc === g.desc && rx.colour === g.colour).reduce((a, rx) => a + pf(rx.qty), 0); });
  if (rows.length) rec.receiveDate = rows[rows.length - 1].date || today();
  rec.status = jwAutoStatus(rec);
  saveDB(); pageView = null;
  toast('Receipt saved — total received ' + fmtNum(jwTotalReceived(rec)) + ' pcs' +
    (removedCount > 0 ? ' (' + removedCount + ' removed)' : ''), 'green');
  render();
}

