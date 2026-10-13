/**
 * StitchFlow ERP — Style Master
 * File: assets/js/modules/styles.js
 */

function styleMasterPanelHtml() {
  const all = db.masters.styles || [];
  const q = mQuery.toLowerCase().trim();
  let filteredSt = all.map(function (s, i) { return { s: s, i: i }; }).reverse().filter(function (x) {
    if (!q) return true;
    const s = x.s;
    return (s.internal + ' ' + (s.portal || '') + ' ' + (s.desc || '')).toLowerCase().indexOf(q) > -1;
  });
  const pg = slicePage(filteredSt, { page: mPage, size: mSize });
  mPage = pg.page; mSize = pg.size;
  const list = pg.total
    ? pg.rows.map(function (x, idx) {
      const s = x.s, i = x.i;
      const used = styleUsedIn(s.internal);
      return '<div class="master-item"><span class="mi-sr">' + (pg.from + idx) + '</span><span class="mi-id">' + esc(s.id || '—') + '</span><span><b>' + esc(s.internal) + '</b>' +
        (s.portal ? ' <span class="meta">' + esc(s.portal) + '</span>' : '') +
        (s.desc ? ' <span class="meta">' + esc(s.desc) + '</span>' : '') +
        (s.buyer ? ' <span class="meta" style="color:#00527c">Buyer: ' + esc(s.buyer) + '</span>' : '') +
        '</span><span class="master-status-cell">' + styleToggleHtml(s) + '</span><span class="mi-acts">' +
        '<button class="btn-icon" title="Edit" onclick="editStyle(' + i + ')">' + ic('pencil', 13) + '</button>' +
        (used.length
          ? '<button class="btn-icon" disabled title="Cannot delete — used in Job Work">' + ic('lock', 13) + '</button>'
          : '<button class="btn-icon danger" title="Delete" onclick="delStyle(' + i + ')">' + ic('trash', 13) + '</button>') +
        '</span></div>';
    }).join('')
    : '<div class="master-item mi-empty">' + (all.length ? 'No matches' : 'Nothing added yet') + '</div>';
  return '<div class="mhead"><div><h3>Style Master<span class="c">' + db.masters.styles.length + '</span></h3>' +
    '<p>Internal ID is mandatory on Job Work. Portal ID is the marketplace style number. Buyer is mandatory and is filtered to parties whose Business Type contains Buyer.</p></div></div>' +
    '<div class="mtools"><div class="add-row" style="flex:1">' +
    cbox('m-style-buyer', { opts: buyerPartyOptions(), value: '', placeholder: 'Buyer *', compact: true }) +
    '<input class="inp" id="m-style-internal" placeholder="Internal ID * (e.g. CS-101)">' +
    '<input class="inp" id="m-style-portal" placeholder="Portal ID (e.g. MYN-44512)">' +
    '<input class="inp" id="m-style-desc" placeholder="Description">' +
    '<button class="btn btn-primary btn-sm" onclick="addStyle()">' + ic('plus', 15) + 'Add</button>' +
    '</div><div class="search msearch">' + ic('search', 16) + '<input class="inp" placeholder="Filter Style Master" value="' + esc(mQuery) + '" oninput="mSearch(this.value)"></div>' +
    (mQuery ? '<button class="btn btn-ghost btn-sm" onclick="mClearFilters()">Clear filters</button>' : '') + '</div>' +
    '<div class="master-list-head"><span>Sr.</span><span>ID</span><span>Style</span><span>Status</span><span>Actions</span></div>' +
    '<div class="master-list mlist">' + list + '</div>' + pagerBar(pg, 'master', 'styles');
}
function addStyle() {
  clearReqMarks();
  const buyer = cboxGet('m-style-buyer');
  const internal = $('m-style-internal').value.trim();
  const portal = $('m-style-portal').value.trim();
  const desc = $('m-style-desc').value.trim();
  if (!buyer) return reqBad(qs('[data-cb-input="m-style-buyer"]'), 'Buyer is required');
  if (!internal) return reqBad('m-style-internal', 'Internal ID style no. is required');
  if (db.masters.styles.some(s => s.internal.toLowerCase() === internal.toLowerCase())) return reqBad('m-style-internal', '\u201c' + internal + '\u201d already exists in Style Master \u2014 duplicate names are not allowed');
  if (portal && db.masters.styles.some(function (s) { return String(s.portal || '').trim().toLowerCase() === portal.toLowerCase(); })) {
    return reqBad('m-style-portal', '\u201c' + portal + '\u201d already exists in Style Master \u2014 duplicate Portal IDs are not allowed');
  }
  db.seq.style = pf(db.seq.style) + 1;
  db.masters.styles.push({ id: 'STY-' + String(db.seq.style).padStart(4, '0'), internal: internal, portal: portal, desc: desc, buyer: buyer, active: true });
  saveDB(); toast('Style added: ' + internal, 'green'); renderMasters();
}
function delStyle(i) {
  const s = db.masters.styles[i];
  if (!s) return;
  // v5: deletion is allowed even when the style is in use. The confirmation
  // dialog still shows a warning so the user knows downstream Job Work rows
  // will have a dangling style reference.
  const used = styleUsedIn(s.internal);
  const warnNote = used.length
    ? '<div style="background:#fff5ea;border-left:4px solid #ffb800;color:#5e4200"><b>Style in use:</b> ' + used.length + ' Job Work row' + (used.length > 1 ? 's' : '') + ' reference this style and will have a dangling reference after deletion.</div>'
    : '';
  confirmDelete({ kind: 'style', name: s.internal, bodyHtml: warnNote, confirmText: 'Delete permanently' }, function () {
    const idx = db.masters.styles.indexOf(s);
    if (idx < 0) return;
    db.masters.styles.splice(idx, 1); saveDB(); toast('Style removed'); renderMasters();
  });
}
function editStyle(i) {
  const s = db.masters.styles[i]; if (!s) return;
  const used = styleUsedIn(s.internal).length;
  openDialog({
    title: 'Edit Style \u2014 ' + s.internal,
    bodyHtml:
      '<div class="dlg-field"><label>Internal ID *</label><input class="inp" id="dlg-st-int" value="' + esc(s.internal) + '" placeholder="e.g. CS-101"></div>' +
      '<div class="dlg-field"><label>Portal ID</label><input class="inp" id="dlg-st-por" value="' + esc(s.portal || '') + '" placeholder="e.g. MYN-44512"></div>' +
      '<div class="dlg-field"><label>Description</label><input class="inp" id="dlg-st-desc" value="' + esc(s.desc || '') + '" placeholder="Description"></div>' +
      '<div class="dlg-field"><label>Buyer *</label>' +
      cbox('dlg-st-buyer', { opts: buyerPartyOptions(), value: s.buyer || '', placeholder: 'Buyer *' }) +
      '</div>',
    note: used ? 'This style is used in Job Work. Renaming the internal ID updates those entries too.' : '',
    confirmText: 'Save changes',
    after: function () {
      // preset the buyer combobox to the saved value (the static bodyHtml can't
      // reference live cbox state, so we set it after the dialog mounts).
      try { cboxSet('dlg-st-buyer', s.buyer || ''); } catch (e) { }
      const el = $('dlg-st-int'); if (el) { el.focus(); el.select(); }
    },
    onConfirm: function () {
      const iv = $('dlg-st-int').value.trim();
      if (!iv) { reqBad('dlg-st-int', 'Internal ID is required'); return false; }
      if (iv.toLowerCase() !== s.internal.toLowerCase() &&
        db.masters.styles.some(x => x !== s && x.internal.toLowerCase() === iv.toLowerCase())) { reqBad('dlg-st-int', 'Internal ID already exists'); return false; }
      const pv = $('dlg-st-por').value.trim();
      if (pv && db.masters.styles.some(function (x) { return x !== s && String(x.portal || '').trim().toLowerCase() === pv.toLowerCase(); })) {
        reqBad('dlg-st-por', 'Portal ID already exists in Style Master'); return false;
      }
      const bv = cboxGet('dlg-st-buyer') || '';
      // v5: buyer is mandatory on Style Master
      if (!bv) {
        reqBad(qs('[data-cb-input="dlg-st-buyer"]'), 'Buyer is required');
        return false;
      }
      // if a buyer was picked, confirm they really are a Buyer (defensive — the
      // dropdown only lists Buyers, but a stored value could be stale)
      const p = partyByName(bv);
      if (p && !partyHasType(p, 'Buyer')) {
        reqBad(qs('[data-cb-input="dlg-st-buyer"]'), 'Selected party is not a Buyer');
        return false;
      }
      const old = s.internal;
      s.portal = pv;
      s.desc = $('dlg-st-desc').value.trim();
      s.buyer = bv;
      if (iv !== old) { s.internal = iv; renameEverywhere(old, iv); }
      saveDB(); toast('Style updated: ' + iv, 'green'); renderMasters();
    }
  });
}
function styleOpts(buyer) {
  const allowInactive = typeof pageView !== 'undefined' && pageView && pageView.kind === 'form' && (pageView.m === 'jobwork' || pageView.m === 'sample');
  const styles = (db.masters && Array.isArray(db.masters.styles)) ? db.masters.styles : [];
  const cleanBuyer = buyer ? String(buyer).trim().toLowerCase() : '';

  const list = styles.filter(function (s) {
    if (!allowInactive && s.active === false) return false;
    if (cleanBuyer) {
      const sb = String(s.buyer || '').trim().toLowerCase();
      // If a style has a buyer assigned, match it to the chosen buyer
      // If a style has no buyer assigned, it is a generic style available to all buyers
      if (sb && sb !== cleanBuyer && !cleanBuyer.includes(sb) && !sb.includes(cleanBuyer)) {
        return false;
      }
    }
    return true;
  });

  return list.map(function (s) {
    const intId = String(s.internal || s.internal_id || s.name || s.id || '').trim();
    const code = s.id ? '[' + s.id + '] ' : '';
    return { v: intId, l: code + styleLabel(intId), mid: s.id };
  }).filter(function (o) { return o.v; });
}
function styleToggleHtml(s) { const on = s.active !== false; return '<button type="button" class="sw master-status-sw' + (on ? ' on' : '') + '" onclick="toggleStyleActive(\'' + s.id + '\')"><span class="sw-knob"></span></button><span class="master-status-label ' + (on ? 'on' : 'off') + '">' + (on ? 'Active' : 'Inactive') + '</span>'; }
function toggleStyleActive(id) { const s = db.masters.styles.find(function (x) { return x.id === id; }); if (!s) return; const old = s.active !== false; s.active = !old; saveDB(); toast(s.internal + ' marked ' + (s.active ? 'Active' : 'Inactive'), 'green'); renderMasters(); }
/* full "CS-101 · MYN-44512 — Casual Shirt" label for a stored internal id */
function styleLabel(internal) {
  const clean = String(internal || '').trim().toLowerCase();
  const s = (db.masters && Array.isArray(db.masters.styles)) ? db.masters.styles.find(function (x) {
    return String(x.internal || x.internal_id || x.name || x.id || '').trim().toLowerCase() === clean;
  }) : null;
  if (!s) return internal || '';
  const intVal = s.internal || s.internal_id || internal;
  return intVal + (s.portal ? ' \u00b7 ' + s.portal : '') + (s.desc ? ' \u2014 ' + s.desc : '');
}
