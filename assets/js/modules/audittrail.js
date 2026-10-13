/**
 * StitchFlow ERP — Audit Trail
 * File: assets/js/modules/audittrail.js
 */

/* ================= AUDIT TRAIL ================= */
let auditState = { q: '', action: '', page: 1, size: 50 };
function auditRows() {
  const q = String(auditState.q || '').toLowerCase().trim(), act = auditState.action;
  return (db.auditTrail || []).slice().sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).filter(function (x) {
    if (act && x.action !== act) return false;
    if (!q) return true;
    return ([x.user, x.area, x.action, x.record].concat(x.changes || []).join(' ').toLowerCase().indexOf(q) > -1);
  });
}
function refreshAuditView() { if (cur === 'masters' && mTab === 'audit') renderMasters(); else renderAuditTrail(); }
function auditSearch(v) { auditState.q = v; auditState.page = 1; refreshAuditView(); const e = $('audit-q'); if (e) { e.focus(); try { e.setSelectionRange(e.value.length, e.value.length); } catch (err) { } } }
function auditAction(v) { auditState.action = v; auditState.page = 1; refreshAuditView(); }
function auditFriendlyField(path) {
  let s = String(path || 'field').replace(/\[\d+\]/g, ' item').replace(/\./g, ' — ');
  const map = { actualQty: 'actual issue quantity', recQty: 'received quantity', poRate: 'rate', dcNo: 'DC number', gstType: 'GST type', outwardRef: 'process outward reference', jwRef: 'job work reference', payStatus: 'payment status' };
  Object.keys(map).forEach(function (k) { s = s.replace(new RegExp(k, 'gi'), map[k]); });
  s = s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function auditPlainChange(c) {
  const text = String(c || ''), colon = text.indexOf(':'), arrow = text.indexOf('→');
  if (colon > -1 && arrow > colon) {
    const field = auditFriendlyField(text.slice(0, colon));
    const oldVal = text.slice(colon + 1, arrow).trim(), newVal = text.slice(arrow + 1).trim();
    return field + ' changed from “' + oldVal + '” to “' + newVal + '”';
  }
  return text;
}
function auditPlainNote(x) {
  const who = x.user || 'A user', area = x.area || 'record', rec = x.record || 'record', changes = x.changes || [], n = changes.length;
  if (x.action === 'Created') return who + ' created ' + rec + ' in ' + area + (changes.length ? '. Details: ' + changes.slice(0, 3).join('; ') + '.' : '.');
  if (x.action === 'Deleted') return who + ' deleted ' + rec + ' from ' + area + (changes.length ? '. Deleted record details: ' + changes.slice(0, 3).join('; ') + '.' : '.');
  if (x.action === 'Added') return who + ' added “' + rec + '” to ' + area + (changes.length && changes[0] !== 'Master record added' ? '. ' + changes.slice(0, 2).join('; ') + '.' : '.');
  if (x.action === 'Removed') return who + ' removed “' + rec + '” from ' + area + (changes.length && changes[0] !== 'Master record removed' ? '. ' + changes.slice(0, 2).join('; ') + '.' : '.');
  const details = changes.slice(0, 4).map(auditPlainChange);
  return who + ' updated ' + rec + ' in ' + area + (details.length ? '. ' + details.join('; ') + (n > 4 ? '; and ' + (n - 4) + ' more changes' : '') + '.' : '.');
}
function auditMasterPanelHtml() { const rows = auditRows().slice(0, 100), body = rows.length ? rows.map(function (x, i) { const when = new Date(x.at), date = isNaN(when) ? x.at : when.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); return '<tr><td class="srcol">' + (i + 1) + '</td><td style="white-space:nowrap">' + esc(date) + '</td><td>' + esc(x.user || '—') + '</td><td><b>' + esc(x.area || '—') + '</b></td><td>' + badge(x.action || 'Updated') + '</td><td>' + esc(x.record || '—') + '</td><td class="audit-note">' + esc(auditPlainNote(x)) + '</td></tr>'; }).join('') : '<tr><td colspan="7"><div class="empty">No audit entries found.</div></td></tr>'; return '<div class="mhead"><div><h3>Audit Trail <span class="c">' + (db.auditTrail || []).length + '</span></h3><p>Trace who changed what and when.</p></div></div><div class="mtools"><div class="search msearch">' + ic('search', 16) + '<input class="inp" id="audit-q" placeholder="Search audit entries" value="' + esc(auditState.q) + '" oninput="auditSearch(this.value)"></div><select class="inp" style="width:auto" onchange="auditAction(this.value)"><option value="">All actions</option>' + ['Created', 'Updated', 'Deleted', 'Added', 'Removed'].map(function (a) { return '<option' + (auditState.action === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></div><div class="table-wrap"><table><thead><tr><th class="srcol">Sr.</th><th>Date & Time</th><th>User</th><th>Module / Master</th><th>Action</th><th>Record</th><th>Simple Change Note</th></tr></thead><tbody>' + body + '</tbody></table></div><div class="hint">Showing latest ' + rows.length + ' matching audit events.</div>'; }
function renderAuditTrail() {
  const rows = auditRows(), pg = slicePage(rows, auditState); auditState.page = pg.page;
  const body = pg.rows.length ? pg.rows.map(function (x, i) {
    const when = new Date(x.at); const date = isNaN(when) ? x.at : when.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tone = x.action === 'Deleted' || x.action === 'Removed' ? 'b-red' : x.action === 'Created' || x.action === 'Added' ? 'b-green' : 'b-blue';
    return '<tr><td class="srcol">' + (pg.from + i) + '</td><td style="white-space:nowrap">' + esc(date) + '</td><td>' + esc(x.user || '—') + '</td><td><b>' + esc(x.area || '—') + '</b></td><td><span class="badge ' + tone + '">' + esc(x.action || '—') + '</span></td><td><b>' + esc(x.record || '—') + '</b></td><td>' + (x.changes || []).map(function (c) { return '<div class="audit-change">' + esc(c) + '</div>'; }).join('') + '</td><td class="audit-note">' + esc(auditPlainNote(x)) + '</td></tr>';
  }).join('') : '<tr><td colspan="8"><div class="empty"><div class="big">' + ic('view', 28) + '</div><h3>No audit entries found</h3><p>Changes made after Audit Trail was enabled will appear here.</p></div></td></tr>';
  $('content').innerHTML = '<div class="stats"><div class="stat"><div class="lbl">Audit events</div><div class="val">' + fmtNum((db.auditTrail || []).length) + '</div></div><div class="stat"><div class="lbl">Filtered events</div><div class="val">' + fmtNum(rows.length) + '</div></div><div class="stat"><div class="lbl">Retention</div><div class="val">2,000 <small>latest events</small></div></div></div>' +
    '<div class="panel list-panel"><div class="index-stick"><div class="filter-bar"><div class="search">' + ic('search', 16) + '<input class="inp" id="audit-q" placeholder="Search user, module, record or changed field" value="' + esc(auditState.q) + '" oninput="auditSearch(this.value)"></div>' +
    '<select class="inp" style="width:auto" onchange="auditAction(this.value)"><option value="">All actions</option>' + ['Created', 'Updated', 'Deleted', 'Added', 'Removed'].map(function (a) { return '<option' + (auditState.action === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select><span class="rowcount">' + rows.length + ' events</span></div></div>' +
    '<div class="table-wrap"><table><thead><tr><th class="srcol">Sr.</th><th>Date &amp; Time</th><th>User</th><th>Module / Master</th><th>Action</th><th>Record</th><th>Changes (old → new)</th><th>Simple Change Note</th></tr></thead><tbody>' + body + '</tbody></table></div>' + pagerBar(pg, 'audit', 'trail') + '</div>';
}
function exportAuditCSV() {
  const rows = auditRows(); if (!rows.length) return toast('No audit entries to export', 'red');
  const csv = ['Date & Time,User,Area,Action,Record,Changes,Simple Change Note'].concat(rows.map(function (x) { return [x.at, x.user, x.area, x.action, x.record, (x.changes || []).join(' | '), auditPlainNote(x)].map(csvEsc).join(','); })).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit_trail_' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove(); toast('Audit trail exported', 'green');
}

