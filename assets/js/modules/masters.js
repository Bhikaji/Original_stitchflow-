/**
 * StitchFlow ERP — General Masters & Menu Management
 * File: assets/js/modules/masters.js
 */

/* ---------------- Masters ---------------- */
function mastersDefs() {
  return [
    {
      g: 'Buying', k: 'raisedForList', icon: 'gear', title: 'Raised For', ph: 'e.g. Production',
      hint: 'Department or person a purchase order is raised for.'
    },

    {
      g: 'Product', k: 'categories', icon: 'order', title: 'Item Categories', ph: 'Category name',
      hint: 'Top-level grouping — Fabric, Trims, Packaging.'
    },
    {
      g: 'Product', k: 'classifications', icon: 'order', title: 'Classifications', ph: 'Classification name',
      hint: 'Line-item classification used on PO rows and Item Master.'
    },
    {
      g: 'Product', k: 'qualities', icon: 'check', title: 'Quality Master', ph: 'e.g. Premium, Standard',
      hint: 'Quality options available in Item Master → Quality.'
    },
    {
      g: 'Product', k: 'sizes', icon: 'chart', title: 'Size Master', ph: 'Size (e.g. S, M, L…)',
      hint: 'Size set used for size-wise quantity entry.'
    },

    {
      g: 'Product', k: 'qcResults', icon: 'check', title: 'QC Result', ph: 'e.g. Pass',
      hint: 'QC outcomes available when receiving finished goods.'
    },
    {
      g: 'Commercial', k: 'gstRates', icon: 'cash', title: 'GST %', ph: 'e.g. 5',
      hint: 'Allowed GST percentages. Item Master picks its rate from this list.'
    },
    {
      g: 'Product', k: 'uoms', icon: 'box', title: 'UOM', ph: 'e.g. m, kg, pcs',
      hint: 'Units of measure available on Item Master and every document line.'
    },
    {
      g: 'Product', k: 'washTypes', icon: 'sparkle', title: 'Wash Type', ph: 'e.g. Enzyme Softener',
      hint: 'Wash processes used on Costing — Order Info → Wash Type.'
    },
    {
      g: 'Production', k: 'processTypes', icon: 'gear', title: 'Process Type', ph: 'e.g. Embroidery, Washing, Printing',
      hint: 'Process options available on New Process PO / Outward.'
    },
    {
      g: 'Commercial', k: 'gstTypes', icon: 'cash', title: 'GST Type', ph: 'e.g. IGST',
      hint: 'Drives how a supplier\u2019s GST splits on a PO.'
    },
    {
      g: 'Commercial', k: 'paymentTermsList', icon: 'cash', title: 'Payment Terms', ph: 'e.g. 30 days credit',
      hint: 'Credit terms offered on a purchase order.'
    },
    {
      g: 'Commercial', k: 'freightChargesList', icon: 'truck', title: 'Freight Charges', ph: 'e.g. Included',
      hint: 'Who bears freight on the order.'
    },
    {
      g: 'Commercial', k: 'transportModes', icon: 'truck', title: 'Mode of Transportation', ph: 'e.g. Road',
      hint: 'Road, Rail, Air, Sea, Courier.'
    },
    {
      g: 'Commercial', k: 'businessTypes', icon: 'order', title: 'Business Type', ph: 'e.g. Buyer',
      hint: 'Buyer / Supplier / Vendor on the onboarding master.'
    },
    {
      g: 'Commercial', k: 'partyStatuses', icon: 'check', title: 'Status', ph: 'e.g. Active',
      hint: 'Active / Inactive flag for onboarded parties.'
    },

    {
      g: 'Buying', k: 'warehouses', icon: 'box', title: 'Warehouse', ph: 'e.g. Main Store',
      hint: 'Storage locations goods are received into on Material Inward.'
    },
    {
      g: 'Buying', k: 'returnTypes', icon: 'receive', title: 'Return Type', ph: 'e.g. Leftover Material',
      hint: 'Reasons available on Inward Job Work Return and Job Work Return item lines.'
    },

    {
      g: 'Sale', k: 'sellerPrograms', icon: 'order', title: 'Seller ↔ po_type', ph: 'Seller id (e.g. KEN)',
      hint: 'Which program (SJIT / PPMP) each Myntra seller id runs under. On import it is applied to every row whose seller id is listed here, ahead of the report’s own po_type.'
    },

    { g: 'Location', k: 'countries', icon: 'home', title: 'Country', ph: 'Country name', hint: '' },
    { g: 'Location', k: 'states', icon: 'truck', title: 'State', ph: 'State name', hint: '' }
  ];
}
let mTab = 'raisedForList';
let mQuery = '';
let mParent = '';
let mPage = 1;
let mSize = 10;
let mNavScrollTop = 0;
function canMasterTab(k, action) { if (k === 'audit' || k === 'usermanagement') return userCan(k, action || 'view'); return userCanMaster(k, action || 'view'); }
function goMasterTab(k) { if (!canMasterTab(k, 'view')) return toast('Access denied for this Master', 'red'); mTab = k; mQuery = ''; mParent = ''; mPage = 1; saveUiState(); renderMasters(); }
function mClearFilters() { mQuery = ''; mParent = ''; mPage = 1; renderMasters(); }
function clearItemMasterFilters() { imState.q = ''; imState.page = 1; renderMasters(); }
function clearPartyMasterFilters() { ptState.q = ''; ptState.page = 1; renderMasters(); }
function mSearch(v) {
  mQuery = v;
  mPage = 1;
  const el = $('m-body'); if (!el) return;
  /* the filter box lives inside #m-body — rebuilding it would drop focus,
     so restore the caret straight after the re-render */
  const active = document.activeElement;
  const wasFilter = !!(active && active.closest && active.closest('.msearch'));
  const pos = wasFilter ? active.selectionStart : 0;
  el.innerHTML = masterPanelHtml();
  setTimeout(function () { alignTables(); renumberSr(); attachExcelHeaderFilters(el); }, 0);
  if (wasFilter) {
    const again = qs('.msearch .inp', el);
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { } }
  }
}

function renderMasters() {
  const existingMasterNav = qs('.masters-wrap .mnav', $('content'));
  if (existingMasterNav) mNavScrollTop = existingMasterNav.scrollTop;
  const defs = mastersDefs(), allowedDefs = defs.filter(function (d) { return userCanMaster(d.k, 'view'); });
  const specialAllowed = ['styles', 'items', 'partyrecords', 'companydetails', 'loginpage', 'menumaster', 'usermanagement', 'audit'].filter(function (k) { return canMasterTab(k, 'view'); });
  if (!allowedDefs.some(d => d.k === mTab) && specialAllowed.indexOf(mTab) === -1) mTab = specialAllowed[0] || (allowedDefs[0] && allowedDefs[0].k) || '';
  const entryVisible = function (k) { if (k === 'audit' || k === 'usermanagement') return userCan(k, 'view'); return userCanMaster(k, 'view'); };
  const entryCount = function (k) { if (k === 'usermanagement') return (db.users || []).filter(function (x) { return x.status !== 'Inactive'; }).length; if (k === 'styles') return (db.masters.styles || []).filter(function (x) { return x.active !== false; }).length; if (k === 'items') return (db.masters.items || []).filter(function (x) { return x.active !== false; }).length; if (k === 'partyrecords') return (db.masters.parties || []).filter(function (x) { return x.status !== 'Inactive'; }).length; if (k === 'companydetails') return 1; if (k === 'loginpage') return ((((db.masters || {}).loginSettings || {}).slides || []).filter(function (x) { return x.active !== false; }).length); if (k === 'menumaster') return 2; if (k === 'audit') return (db.auditTrail || []).length; return (db.masters[k] || []).filter(function (v) { return masterIsActive(k, v); }).length; };
  const entryIcon = function (k) { if (k === 'audit' || k === 'loginpage') return 'view'; if (k === 'usermanagement') return 'gear'; if (k === 'partyrecords' || k === 'companydetails') return 'home'; if (k === 'menumaster') return 'gear'; const d = defs.find(function (x) { return x.k === k; }); return d ? d.icon : 'box'; };
  const entries = masterMenuEntries().filter(function (x) { return entryVisible(x.target || x.k); }), sections = masterMenuSections().filter(function (sec) { return entries.some(function (x) { return x.section === sec; }); });
  let side = ''; sections.forEach(function (sec) { side += '<div class="mnav-sec">' + esc(menuLabel('section-master-' + sec, sec)) + '</div>'; entries.filter(function (x) { return x.section === sec; }).forEach(function (x) { const target = x.target || x.k, active = mTab === target; side += '<button class="mnav-item' + (active ? ' active' : '') + '" onclick="goMasterTab(\'' + target + '\')"><span class="mn-ic">' + ic(entryIcon(target), 16) + '</span><span class="mn-l">' + esc(x.l) + '</span><span class="cnt">' + entryCount(target) + '</span></button>'; }); });

  $('content').innerHTML =
    '<div class="masters-wrap">' +
    '<aside class="mnav">' + side + '</aside>' +
    '<div class="panel mpanel" id="m-body">' + masterPanelHtml() + '</div>' +
    '</div>';
  const restoredMasterNav = qs('.masters-wrap .mnav', $('content'));
  if (restoredMasterNav) {
    restoredMasterNav.scrollTop = mNavScrollTop;
    restoredMasterNav.addEventListener('scroll', function () { mNavScrollTop = restoredMasterNav.scrollTop; }, { passive: true });
    requestAnimationFrame(function () { restoredMasterNav.scrollTop = mNavScrollTop; });
  }
  const masterHost = $('m-body'); if (masterHost) { masterHost.classList.toggle('menu-editor-host', mTab === 'menumaster'); masterHost.classList.toggle('user-editor-host', mTab === 'usermanagement' && userEditMode); }
  const masterActions = $('tb-actions'); if (masterActions && mTab) { if (mTab === 'usermanagement') masterActions.innerHTML = '<button class="btn btn-ghost" onclick="exportSingleMasterExcel(\'usermanagement\')">' + ic('download', 16) + 'Export Users</button>'; else if (mTab === 'audit') masterActions.innerHTML = '<button class="btn btn-ghost" onclick="exportAuditCSV()">' + ic('download', 16) + 'Export Audit</button>'; else if (mTab === 'companydetails') masterActions.innerHTML = ''; else masterActions.innerHTML = '<button class="btn btn-ghost" onclick="exportSingleMasterExcel(\'' + mTab + '\')">' + ic('download', 16) + 'Export ' + esc(userMasterLabel(mTab)) + '</button>'; }
  const inp = $('m-new-' + mTab); if (inp) inp.focus(); if (mTab === 'usermanagement' && !userEditMode) setTimeout(function () { userListSearch(userListQuery); }, 0);
  setTimeout(function () { attachExcelHeaderFilters($('m-body')); const b = $('m-body'); if (b) { if (mTab !== 'companydetails' && !userCanMaster(mTab, 'create')) qsa('.btn-primary,.add-row input,.add-row button', b).forEach(function (x) { x.disabled = true; }); if (!userCanMaster(mTab, 'edit')) qsa('.btn-icon:not(.danger),.master-status-sw', b).forEach(function (x) { x.disabled = true; }); if (!userCanMaster(mTab, 'delete')) qsa('.btn-icon.danger', b).forEach(function (x) { x.disabled = true; }); } }, 0);
}

let MASTER_RECORD_POPUP = '';
function itemRecordsMasterPanelHtml() {
  return '<div class="mhead"><div><h3>Item Master <span class="c">' + db.masters.items.length + '</span></h3>' +
    '<p>View all items first. Use Add Item or the pencil icon to open the item form.</p></div>' +
    '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
    '<button class="btn btn-ghost" onclick="exportItemExcelTemplate()">' + ic('download', 15) + 'Excel Template</button>' +
    '<button class="btn btn-ghost" onclick="triggerItemExcelImport()">' + ic('inbox', 15) + 'Import Excel</button>' +
    '<input type="file" id="item-excel-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none" onchange="importItemExcel(this)">' +
    '<button class="btn btn-primary" onclick="openItemMasterPopup()">' + ic('plus', 15) + 'Add Item</button></div></div>' +
    '<div class="mtools"><div class="search msearch">' + ic('search', 16) +
    '<input class="inp" placeholder="Search items…" value="' + esc(imState.q) + '" oninput="imSearch(this.value)"></div>' +
    '<button class="btn btn-ghost btn-sm" id="im-clear-filters" onclick="clearItemMasterFilters()"' + (imState.q ? '' : ' disabled') + '>Clear filters</button></div>' +
    itemMasterListHtml();
}
function partyRecordsMasterPanelHtml() {
  return '<div class="mhead"><div><h3>Party onboarding <span class="c">' + db.masters.parties.length + '</span></h3>' +
    '<p>View all parties first. Use New partner or the pencil icon to open the onboarding form.</p></div>' +
    '<div style="margin-left:auto"><button class="btn btn-primary" onclick="openPartyMasterPopup()">' + ic('plus', 15) + 'New partner</button></div></div>' +
    '<div class="mtools"><div class="search msearch">' + ic('search', 16) +
    '<input class="inp" placeholder="Search by name, code, GST, PAN or city" value="' + esc(ptState.q) + '" oninput="ptSearch(this.value)"></div>' +
    '<button class="btn btn-ghost btn-sm" id="pt-clear-filters" onclick="clearPartyMasterFilters()"' + (ptState.q ? '' : ' disabled') + '>Clear filters</button>' +
    '<span class="rowcount" id="pt-count"></span></div><div id="pt-list">' + partyListHtml() + '</div>';
}
function openItemMasterPopup(id) {
  if (!userCanMaster('items', id ? 'edit' : 'create')) return toast((id ? 'Edit' : 'Create') + ' access denied for Item Master', 'red');
  imEditId = id || null; MASTER_RECORD_POPUP = 'item';
  const rec = imEditId ? db.masters.items.find(function (x) { return x.id === imEditId; }) : null;
  openDialog({
    itemSize: true, title: rec ? 'Edit Item — ' + rec.name : 'Add Item', confirmText: rec ? 'Update Item' : 'Add Item',
    bodyHtml: itemMasterFormHtml(rec, true),
    after: function () { afterRenderItemForm(); const el = $('im-name'); if (el) el.focus(); },
    onConfirm: function () { return saveItemMasterForm(); }
  });
}
function openPartyMasterPopup(id) {
  if (!userCanMaster('partyrecords', id ? 'edit' : 'create')) return toast((id ? 'Edit' : 'Create') + ' access denied for Party onboarding', 'red');
  if (typeof obNewPartner === 'function') {
    if (!id) {
      cur = 'partneronboarding';
      obEditId = 'new';
      render();
      return;
    }
    const existing = db.partners && db.partners.find(function (x) { return x.id === id; });
    if (existing) {
      cur = 'partneronboarding';
      obEditId = id;
      render();
      return;
    }
  }
  ptEditId = id || null; MASTER_RECORD_POPUP = 'party';
  const rec = ptEditId ? db.masters.parties.find(function (x) { return x.id === ptEditId; }) : null;
  openDialog({
    wide: true, title: rec ? 'Edit Party onboarding — ' + rec.legalName : 'Add Party onboarding', confirmText: rec ? 'Update Party' : 'Add Party',
    bodyHtml: partyFormHtml(rec, true),
    after: function () { dpSyncAll($('appDialogBox')); renumberSr($('pt-billtos')); qsa('#pt-billtos tr').forEach(function (tr) { const el = qs('[data-f="gstNo"]', tr); if (el) btValidateRow(el); }); const el = $('pt-legal'); if (el) el.focus(); },
    onConfirm: function () { return savePartyForm(); }
  });
}
function refreshMasterRecords(kind) {
  if (kind === 'item') { mTab = 'items'; imEditId = null; }
  if (kind === 'party') { mTab = 'partyrecords'; ptEditId = null; }
  if (cur !== 'masters') cur = 'masters';
  renderMasters();
}
function saveLoginSettings(note) { auditPush('Login Page Master', 'Updated', 'Login Page', [note || 'Login slideshow settings updated']); saveDB(); renderMasters(); }
function loginSlideChanged(id, field, value) { if (!userCanMaster('loginpage', 'edit')) return toast('Edit access denied', 'red'); const s = ((((db.masters || {}).loginSettings || {}).slides) || []).find(function (x) { return x.id === id; }); if (!s) return; s[field] = value; saveLoginSettings('Slide ' + s.name + ' — ' + field + ' changed to ' + value); }
function toggleLoginSlide(id) { if (!userCanMaster('loginpage', 'edit')) return toast('Edit access denied', 'red'); const s = db.masters.loginSettings.slides.find(function (x) { return x.id === id; }); if (!s) return; s.active = s.active === false; saveLoginSettings('Slide ' + s.name + ' marked ' + (s.active ? 'Active' : 'Inactive')); }
function moveLoginSlide(id, dir) { if (!userCanMaster('loginpage', 'edit')) return toast('Edit access denied', 'red'); const a = db.masters.loginSettings.slides, i = a.findIndex(function (x) { return x.id === id; }), j = i + dir; if (i < 0 || j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; saveLoginSettings('Slide order changed'); }
function deleteLoginSlide(id) { if (!userCanMaster('loginpage', 'delete')) return toast('Delete access denied', 'red'); const a = db.masters.loginSettings.slides, s = a.find(function (x) { return x.id === id; }); if (!s) return; if (a.length <= 1) return toast('At least one login image is required', 'red'); confirmDelete({ kind: 'login slide', name: s.name }, function () { db.masters.loginSettings.slides = a.filter(function (x) { return x.id !== id; }); saveLoginSettings('Deleted login slide ' + s.name); }); }
function onLoginSlideFile(inp) { if (!userCanMaster('loginpage', 'create')) return toast('Create access denied', 'red'); const f = inp.files && inp.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Choose an image file', 'red'); const rd = new FileReader(); rd.onload = function (e) { const img = new Image(); img.onload = function () { const max = 1800; let w = img.width, h = img.height; if (w > max) { h = Math.round(h * max / w); w = max; } const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); const a = db.masters.loginSettings.slides; const n = a.length + 1; a.push({ id: 'LS-' + String(Date.now()).slice(-8), name: f.name.replace(/\.[^.]+$/, ''), image: cv.toDataURL('image/jpeg', .82), fit: 'cover', position: 'center', active: true }); saveLoginSettings('Added login slide ' + f.name); }; img.src = e.target.result; }; rd.readAsDataURL(f); }
function onLoginSlideReplace(inp, id) { if (!userCanMaster('loginpage', 'edit')) return toast('Edit access denied', 'red'); const f = inp.files && inp.files[0]; if (!f) return; if (!/^image\//.test(f.type)) return toast('Choose an image file', 'red'); const rd = new FileReader(); rd.onload = function (e) { const img = new Image(); img.onload = function () { const max = 1800; let w = img.width, h = img.height; if (w > max) { h = Math.round(h * max / w); w = max; } const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); const slide = db.masters.loginSettings.slides.find(function (x) { return x.id === id; }); if (!slide) return; slide.image = cv.toDataURL('image/jpeg', .82); slide.name = f.name.replace(/\.[^.]+$/, ''); saveLoginSettings('Replaced login slide image ' + slide.name); }; img.src = e.target.result; }; rd.readAsDataURL(f); }
function setLoginInterval(v) { if (!userCanMaster('loginpage', 'edit')) return; db.masters.loginSettings.interval = Math.max(2, Math.min(30, pf(v) || 6)); saveLoginSettings('Slideshow interval changed to ' + db.masters.loginSettings.interval + ' seconds'); }
function loginPageMasterHtml() { const cfg = db.masters.loginSettings || { slides: [], interval: 6 }, slides = cfg.slides || [], first = slides.find(function (x) { return x.active !== false; }) || slides[0]; return '<div class="mhead"><div><h3>Login Page Master <span class="c">' + slides.length + '</span></h3><p>Upload slideshow images and control how each image fits on the left side of the login page.</p></div><div style="margin-left:auto"><label class="btn btn-primary file-btn">' + ic('plus', 15) + 'Add Image<input type="file" accept="image/*" onchange="onLoginSlideFile(this)"></label></div></div>' + '<div class="mtools">' + field('Slideshow interval (seconds)', '<input class="inp" type="number" min="2" max="30" value="' + esc(cfg.interval || 6) + '" onchange="setLoginInterval(this.value)">') + '</div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Preview</th><th>Slide Name</th><th>Image Fit</th><th>Position</th><th>Status</th><th class="num">Actions</th></tr></thead><tbody>' + slides.map(function (s, i) { return '<tr><td><b>' + (i + 1) + '</b></td><td><label class="login-thumb-replace" title="Click to replace image"><img class="login-slide-thumb" src="' + loginImageSrc(s) + '"><span>Replace</span><input type="file" accept="image/*" onchange="onLoginSlideReplace(this,\'' + s.id + '\')"></label></td><td><input class="inp" value="' + esc(s.name || 'Slide') + '" onchange="loginSlideChanged(\'' + s.id + '\',\'name\',this.value)"></td><td><select class="inp" onchange="loginSlideChanged(\'' + s.id + '\',\'fit\',this.value)">' + ['cover', 'contain', 'fill'].map(function (v) { return '<option value="' + v + '"' + (s.fit === v ? ' selected' : '') + '>' + ({ cover: 'Cover (crop to fill)', contain: 'Contain (show full image)', fill: 'Stretch to fill' })[v] + '</option>'; }).join('') + '</select></td><td><select class="inp" onchange="loginSlideChanged(\'' + s.id + '\',\'position\',this.value)">' + ['center', 'top', 'bottom', 'left', 'right'].map(function (v) { return '<option' + ((s.position || 'center') === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></td><td><button class="sw' + (s.active === false ? '' : ' on') + '" onclick="toggleLoginSlide(\'' + s.id + '\')"><span class="sw-knob"></span></button> ' + (s.active === false ? 'Inactive' : 'Active') + '</td><td class="actions-cell"><button class="btn-icon" title="Move up" onclick="moveLoginSlide(\'' + s.id + '\',-1)">↑</button><button class="btn-icon" title="Move down" onclick="moveLoginSlide(\'' + s.id + '\',1)">↓</button><button class="btn-icon danger" onclick="deleteLoginSlide(\'' + s.id + '\')">' + ic('trash', 14) + '</button></td></tr>'; }).join('') + '</tbody></table></div><div class="hint">Fit options: Cover fills the area and may crop; Contain shows the complete image; Stretch fills the entire area. Position controls the image focal point.</div>'; }
let MENU_DRAG = null, MENU_GROUP_DRAG = null;
function menuGroupDragStart(e, list, section) { if (!userCanMaster('menumaster', 'edit')) { e.preventDefault(); return; } MENU_GROUP_DRAG = { list: list, section: section }; e.currentTarget.classList.add('dragging'); }
function menuGroupDrop(e, list, target) { e.preventDefault(); e.stopPropagation(); qsa('.shop-menu-group.dragging').forEach(function (x) { x.classList.remove('dragging'); }); if (!MENU_GROUP_DRAG || MENU_GROUP_DRAG.list !== list || MENU_GROUP_DRAG.section === target) return; const key = list === 'main' ? 'mainGroupOrder' : 'masterGroupOrder', a = db.masters.menuSettings[key], from = a.indexOf(MENU_GROUP_DRAG.section), to = a.indexOf(target); if (from < 0 || to < 0) return; const moved = MENU_GROUP_DRAG.section; a.splice(from, 1); const nt = a.indexOf(target); a.splice(nt < 0 ? a.length : nt, 0, moved); MENU_GROUP_DRAG = null; saveMenuOrder(key, 'Moved menu group ' + moved + ' before ' + target); }
function menuSmartGroupDrop(e, list, section) { if (MENU_GROUP_DRAG) menuGroupDrop(e, list, section); else menuDropToGroup(e, list, section); }
function mainMenuEntries() { const cfg = ((db.masters || {}).menuSettings || {}), out = [], hidden = cfg.hiddenMain || []; NAV_GROUPS.forEach(function (g) { g.items.forEach(function (k) { if (MODULES[k] && hidden.indexOf(k) < 0) out.push({ k: k, target: k, l: menuLabel(k, MODULES[k].label), section: menuSection('main', k, g.title || 'Home'), custom: false }); }); }); (cfg.customMainItems || []).forEach(function (x) { if (MODULES[x.target] && x.target !== 'usermanagement') out.push({ k: x.id, target: x.target, l: menuLabel(x.id, x.label || menuLabel(x.target, MODULES[x.target].label)), section: x.section || defaultMainSection(x.target), custom: true }); }); return out.sort(function (a, b) { return menuOrder('mainOrder', a.k) - menuOrder('mainOrder', b.k); }); }
function mainMenuSections() { const base = NAV_GROUPS.map(function (g) { return g.title || 'Home'; }), custom = (((db.masters || {}).menuSettings || {}).customMainGroups || []), all = base.concat(custom.filter(function (x) { return base.indexOf(x) < 0; })), order = (((db.masters || {}).menuSettings || {}).mainGroupOrder || []); return all.sort(function (a, b) { const ai = order.indexOf(a), bi = order.indexOf(b); return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi); }); }
function masterMenuEntries() { const cfg = ((db.masters || {}).menuSettings || {}), base = [{ k: 'styles', l: 'Style Master', section: 'Records' }, { k: 'items', l: 'Item Master', section: 'Records' }, { k: 'companydetails', l: 'Company Details', section: 'Records' }, { k: 'loginpage', l: 'Login Page', section: 'Records' }, { k: 'menumaster', l: 'Menu Management', section: 'Records' }], out = [], hidden = cfg.hiddenMaster || []; base.forEach(function (x) { if (hidden.indexOf(x.k) < 0) out.push({ k: x.k, target: x.k, l: menuLabel(x.k, x.l), section: menuSection('master', x.k, x.section), custom: false }); }); mastersDefs().forEach(function (d) { if (hidden.indexOf(d.k) < 0) out.push({ k: d.k, target: d.k, l: menuLabel(d.k, d.title), section: menuSection('master', d.k, d.g), custom: false }); }); if (hidden.indexOf('usermanagement') < 0) out.push({ k: 'usermanagement', target: 'usermanagement', l: menuLabel('usermanagement', 'User Management'), section: menuSection('master', 'usermanagement', 'Governance'), custom: false }); if (hidden.indexOf('audit') < 0) out.push({ k: 'audit', target: 'audit', l: menuLabel('audit', 'Audit Trail'), section: menuSection('master', 'audit', 'Governance'), custom: false }); (cfg.customMasterItems || []).forEach(function (x) { out.push({ k: x.id, target: x.target, l: menuLabel(x.id, x.label || menuLabel(x.target, x.target)), section: x.section || defaultMasterSection(x.target), custom: true }); }); return out.sort(function (a, b) { return menuOrder('masterOrder', a.k) - menuOrder('masterOrder', b.k); }); }
function masterMenuSections() { const base = ['Records'].concat(mastersDefs().map(function (d) { return d.g; })).concat(['Governance']).filter(function (v, i, a) { return a.indexOf(v) === i; }), custom = (((db.masters || {}).menuSettings || {}).customMasterGroups || []), all = base.concat(custom.filter(function (x) { return base.indexOf(x) < 0; })), order = (((db.masters || {}).menuSettings || {}).masterGroupOrder || []); return all.sort(function (a, b) { const ai = order.indexOf(a), bi = order.indexOf(b); return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi); }); }
function menuDragStart(e, list, key, section) { e.stopPropagation(); if (!userCanMaster('menumaster', 'edit')) { e.preventDefault(); return; } MENU_DRAG = { list: list, key: key, section: section }; e.currentTarget.classList.add('dragging'); }
function setMenuEntrySection(list, key, section) { const items = (((db.masters || {}).menuSettings || {})[list === 'main' ? 'customMainItems' : 'customMasterItems'] || []), x = items.find(function (i) { return i.id === key; }); if (x) x.section = section; else db.masters.menuSettings[list === 'main' ? 'mainSections' : 'masterSections'][key] = section; }
function menuDrop(e, list, target, section) { e.preventDefault(); qsa('.menu-sort-row.dragging,.shop-menu-child.dragging').forEach(function (x) { x.classList.remove('dragging'); }); if (!MENU_DRAG || MENU_DRAG.list !== list || MENU_DRAG.key === target) return; const name = list === 'main' ? 'mainOrder' : 'masterOrder', sectionMap = list === 'main' ? 'mainSections' : 'masterSections', a = db.masters.menuSettings[name], from = a.indexOf(MENU_DRAG.key), to = a.indexOf(target); if (from < 0 || to < 0) return; setMenuEntrySection(list, MENU_DRAG.key, section); a.splice(from, 1); const newTo = a.indexOf(target); a.splice(newTo < 0 ? a.length : newTo, 0, MENU_DRAG.key); const moved = MENU_DRAG.key; MENU_DRAG = null; saveMenuOrder(name, 'Moved ' + moved + ' to ' + section + ' by drag and drop'); }
function moveMenuEntry(list, key, dir, section) { if (!userCanMaster('menumaster', 'edit')) return toast('Edit access denied', 'red'); const entries = (list === 'main' ? mainMenuEntries() : masterMenuEntries()).filter(function (x) { return x.section === section; }), i = entries.findIndex(function (x) { return x.k === key; }), j = i + dir; if (i < 0 || j < 0 || j >= entries.length) return; const name = list === 'main' ? 'mainOrder' : 'masterOrder', a = db.masters.menuSettings[name], ai = a.indexOf(entries[i].k), aj = a.indexOf(entries[j].k), t = a[ai]; a[ai] = a[aj]; a[aj] = t; saveMenuOrder(name, 'Menu item moved ' + (dir < 0 ? 'up' : 'down')); }
function saveMenuOrder(name, note) { auditPush('Menu Management', 'Updated', name, [note]); saveDB(); renderMasters(); }
function allMenuCandidates(list) { if (list === 'main') { const out = []; NAV_GROUPS.forEach(function (g) { g.items.forEach(function (k) { if (MODULES[k]) out.push({ k: k, l: menuLabel(k, MODULES[k].label) }); }); }); return out; } const out = [{ k: 'styles', l: 'Style Master' }, { k: 'items', l: 'Item Master' }, { k: 'partyrecords', l: 'Party onboarding' }, { k: 'companydetails', l: 'Company Details' }, { k: 'loginpage', l: 'Login Page' }, { k: 'menumaster', l: 'Menu Management' }]; mastersDefs().forEach(function (d) { out.push({ k: d.k, l: d.title }); }); out.push({ k: 'usermanagement', l: 'User Management' }); out.push({ k: 'audit', l: 'Audit Trail' }); return out.map(function (x) { x.l = menuLabel(x.k, x.l); return x; }); }
function createMenuGroup(list) { if (!userCanMaster('menumaster', 'create')) return toast('Create access denied', 'red'); openDialog({ title: 'Create ' + (list === 'main' ? 'Main Menu' : 'Master Menu') + ' Group', bodyHtml: '<div class="dlg-field"><label>Menu name *</label><input class="inp" id="new-menu-group" placeholder="e.g. Manufacturing"></div>', confirmText: 'Create Menu', onConfirm: function () { const v = (($('new-menu-group') || {}).value || '').trim(); if (!v) return reqBad('new-menu-group', 'Menu name is required'); const key = list === 'main' ? 'customMainGroups' : 'customMasterGroups', a = db.masters.menuSettings[key], all = (list === 'main' ? mainMenuSections() : masterMenuSections()); if (all.some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) return reqBad('new-menu-group', 'Menu name already exists'); a.push(v); const groupOrder = list === 'main' ? 'mainGroupOrder' : 'masterGroupOrder'; db.masters.menuSettings[groupOrder].push(v); saveMenuOrder(list === 'main' ? 'mainOrder' : 'masterOrder', 'Created menu group ' + v); } }); }
function openAddMenuItem(list, section) { if (!userCanMaster('menumaster', 'create')) return toast('Create access denied', 'red'); const candidates = allMenuCandidates(list); openDialog({ title: 'Add Menu Item to ' + section, bodyHtml: '<div class="dlg-field"><label>Module / Master *</label><select class="inp" id="add-menu-target">' + candidates.map(function (x) { return '<option value="' + x.k + '">' + esc(x.l) + '</option>'; }).join('') + '</select></div><div class="dlg-field"><label>Menu label</label><input class="inp" id="add-menu-label" placeholder="Optional custom label"></div>', confirmText: 'Add Menu Item', onConfirm: function () { const target = (($('add-menu-target') || {}).value || ''), label = (($('add-menu-label') || {}).value || '').trim(), itemsKey = list === 'main' ? 'customMainItems' : 'customMasterItems', orderKey = list === 'main' ? 'mainOrder' : 'masterOrder'; if (!target) return false; const cand = candidates.find(function (x) { return x.k === target; }), id = (list === 'main' ? 'MMI-' : 'MSI-') + uid(); db.masters.menuSettings[itemsKey].push({ id: id, target: target, label: label || (cand ? cand.l : target), section: section }); db.masters.menuSettings[orderKey].push(id); saveMenuOrder(orderKey, 'Added another ' + target + ' menu item to ' + section); } }); }
function deleteMenuItem(list, key) { if (!userCanMaster('menumaster', 'delete')) return toast('Delete access denied', 'red'); if ((list === 'main' && (key === 'masters' || key === 'po')) || (list === 'master' && key === 'menumaster')) return toast('This core menu cannot be removed', 'red'); const x = (list === 'main' ? mainMenuEntries() : masterMenuEntries()).find(function (i) { return i.k === key; }), hiddenKey = list === 'main' ? 'hiddenMain' : 'hiddenMaster', itemsKey = list === 'main' ? 'customMainItems' : 'customMasterItems', orderKey = list === 'main' ? 'mainOrder' : 'masterOrder'; confirmDelete({ kind: 'menu item', name: x ? x.l : key }, function () { if (x && x.custom) { db.masters.menuSettings[itemsKey] = db.masters.menuSettings[itemsKey].filter(function (i) { return i.id !== key; }); db.masters.menuSettings[orderKey] = db.masters.menuSettings[orderKey].filter(function (i) { return i !== key; }); delete db.masters.menuSettings.labels[key]; } else if (db.masters.menuSettings[hiddenKey].indexOf(key) < 0) db.masters.menuSettings[hiddenKey].push(key); saveMenuOrder(orderKey, 'Removed menu item ' + key); }); }
function deleteMenuGroup(list, section) { if (!userCanMaster('menumaster', 'delete')) return toast('Delete access denied', 'red'); const customKey = list === 'main' ? 'customMainGroups' : 'customMasterGroups', a = db.masters.menuSettings[customKey]; if (a.indexOf(section) < 0) return toast('Core menu groups cannot be deleted', 'red'); confirmDelete({ kind: 'menu group', name: section }, function () { const entries = (list === 'main' ? mainMenuEntries() : masterMenuEntries()).filter(function (x) { return x.section === section; }), mapKey = list === 'main' ? 'mainSections' : 'masterSections'; entries.forEach(function (x) { setMenuEntrySection(list, x.k, list === 'main' ? defaultMainSection(x.target || x.k) : defaultMasterSection(x.target || x.k)); }); db.masters.menuSettings[customKey] = a.filter(function (x) { return x !== section; }); const groupOrder = list === 'main' ? 'mainGroupOrder' : 'masterGroupOrder'; db.masters.menuSettings[groupOrder] = db.masters.menuSettings[groupOrder].filter(function (x) { return x !== section; }); saveMenuOrder(list === 'main' ? 'mainOrder' : 'masterOrder', 'Deleted menu group ' + section); }); }
function menuDropToGroup(e, list, section) { e.preventDefault(); qsa('.shop-menu-child.dragging').forEach(function (x) { x.classList.remove('dragging'); }); if (!MENU_DRAG || MENU_DRAG.list !== list) return; const mapKey = list === 'main' ? 'mainSections' : 'masterSections', orderKey = list === 'main' ? 'mainOrder' : 'masterOrder', a = db.masters.menuSettings[orderKey], i = a.indexOf(MENU_DRAG.key); setMenuEntrySection(list, MENU_DRAG.key, section); if (i > -1) { a.splice(i, 1); a.push(MENU_DRAG.key); } const moved = MENU_DRAG.key; MENU_DRAG = null; saveMenuOrder(orderKey, 'Moved ' + moved + ' to ' + section); }
function renameMenuSection(list, section) { if (!userCanMaster('menumaster', 'edit')) return toast('Edit access denied', 'red'); const key = 'section-' + list + '-' + section, old = menuLabel(key, section); openDialog({ title: 'Rename Menu Group', bodyHtml: '<div class="dlg-field"><label>Group label</label><input class="inp" id="menu-section-name" value="' + esc(old) + '"></div>', confirmText: 'Rename', onConfirm: function () { const v = (($('menu-section-name') || {}).value || '').trim(); if (!v) return reqBad('menu-section-name', 'Group name is required'); db.masters.menuSettings.labels[key] = v; saveMenuOrder(list === 'main' ? 'mainOrder' : 'masterOrder', 'Group ' + section + ' renamed to ' + v); } }); }
function renameMenuItem(list, key) { if (!userCanMaster('menumaster', 'edit')) return toast('Edit access denied', 'red'); const entries = list === 'main' ? mainMenuEntries() : masterMenuEntries(), x = entries.find(function (i) { return i.k === key; }), old = menuLabel(key, x ? x.l : key); openDialog({ title: 'Rename Menu Item', bodyHtml: '<div class="dlg-field"><label>Menu label</label><input class="inp" id="menu-rename-value" value="' + esc(old) + '"></div><div class="dlg-note">This changes the navigation label only. The internal module key remains ' + esc(key) + '.</div>', confirmText: 'Rename', onConfirm: function () { const v = (($('menu-rename-value') || {}).value || '').trim(); if (!v) return reqBad('menu-rename-value', 'Menu label is required'); db.masters.menuSettings.labels[key] = v; auditPush('Menu Management', 'Updated', key, ['Menu label: ' + old + ' → ' + v]); saveDB(); renderMasters(); } }); }
let MENU_EDITOR_TAB = 'main';
function setMenuEditorTab(tab) { MENU_EDITOR_TAB = tab; renderMasters(); }
function toggleShopMenuGroup(btn) { const g = btn.closest('.shop-menu-group'); if (g) g.classList.toggle('closed'); }
function menuGroupsFor(list) {
  if (list === 'main') return mainMenuSections().map(function (section) { return { section: section, entries: mainMenuEntries().filter(function (x) { return x.section === section; }) }; });
  return masterMenuSections().map(function (section) { return { section: section, entries: masterMenuEntries().filter(function (x) { return x.section === section; }) }; });
}
function shopMenuChildHtml(list, x) { return '<div class="shop-menu-child" draggable="true" ondragstart="menuDragStart(event,\'' + list + '\',\'' + x.k + '\',\'' + esc(x.section).replace(/'/g, "\\'") + '\')" ondragover="event.preventDefault()" ondrop="menuDrop(event,\'' + list + '\',\'' + x.k + '\',\'' + esc(x.section).replace(/'/g, "\\'") + '\')"><span class="handle">⋮⋮</span><span><b>' + esc(x.l) + '</b><small>' + esc(x.k) + '</small></span><span><button class="btn-icon" title="Rename" onclick="renameMenuItem(\'' + list + '\',\'' + x.k + '\')">' + ic('pencil', 13) + '</button><button class="btn-icon" title="Move up" onclick="moveMenuEntry(\'' + list + '\',\'' + x.k + '\',-1,\'' + esc(x.section).replace(/'/g, "\\'") + '\')">↑</button><button class="btn-icon" title="Move down" onclick="moveMenuEntry(\'' + list + '\',\'' + x.k + '\',1,\'' + esc(x.section).replace(/'/g, "\\'") + '\')">↓</button></span></div>'; }
function shopMenuGroupsHtml(list) { const customs = (((db.masters || {}).menuSettings || {})[list === 'main' ? 'customMainGroups' : 'customMasterGroups'] || []); return menuGroupsFor(list).map(function (g) { return '<div class="shop-menu-group" draggable="true" ondragstart="menuGroupDragStart(event,\'' + list + '\',\'' + esc(g.section).replace(/'/g, "\\'") + '\')" ondragover="event.preventDefault()" ondrop="menuSmartGroupDrop(event,\'' + list + '\',\'' + esc(g.section).replace(/'/g, "\\'") + '\')"><div class="shop-menu-parent"><span class="drag">⋮⋮</span><button class="chev" onclick="toggleShopMenuGroup(this)">⌄</button><span>' + esc(menuLabel('section-' + list + '-' + g.section, g.section)) + '</span><button class="btn-icon" title="Rename group" onclick="renameMenuSection(\'' + list + '\',\'' + esc(g.section).replace(/'/g, "\\'") + '\')">' + ic('pencil', 12) + '</button>' + (customs.indexOf(g.section) > -1 ? '<button class="btn-icon danger" title="Delete menu group" onclick="deleteMenuGroup(\'' + list + '\',\'' + esc(g.section).replace(/'/g, "\\'") + '\')">' + ic('trash', 12) + '</button>' : '') + '<span class="count">' + g.entries.length + ' items</span></div><div class="shop-menu-children" ondragover="event.preventDefault()" ondrop="menuDropToGroup(event,\'' + list + '\',\'' + esc(g.section).replace(/'/g, "\\'") + '\')">' + g.entries.map(function (x) { return shopMenuChildHtml(list, x); }).join('') + '</div></div>'; }).join(''); }
function menuManagementHtml() { return '<div class="shop-menu-page"><div class="shop-menu-head"><div><h3>Menu Management</h3><p class="sub-line">Main navigation with Masters submenus managed in one place</p></div><button class="btn btn-primary" onclick="createMenuGroup(\'main\')">' + ic('plus', 14) + 'Create Main Menu</button><button class="btn btn-ghost" onclick="createMenuGroup(\'master\')">' + ic('plus', 14) + 'Create Master Sub Menu</button></div><div class="shop-menu-name"><label>Name</label><input class="inp" value="Main Menu" disabled><div class="sub-line">Handle: main-navigation</div></div><div class="shop-menu-card"><h4>Main Menu</h4>' + shopMenuGroupsHtml('main') + '<div class="shop-menu-group" style="margin-top:14px"><div class="shop-menu-parent"><span class="drag">⋮⋮</span><button class="chev" onclick="toggleShopMenuGroup(this)">⌄</button><span>Masters Sub Menu</span><span class="count">' + masterMenuEntries().length + ' items</span></div><div class="shop-menu-children"><div class="sub-line" style="margin:4px 0 10px">These items appear inside the Masters module and are managed as part of the Main Menu structure.</div>' + shopMenuGroupsHtml('master') + '</div></div></div><div class="shop-menu-save"><button class="btn btn-primary" onclick="toast(\'Menu order is saved automatically\',\'green\')">Save</button></div><div class="hint">The same module or Master can be added to multiple menus with different labels. Main Menu and Masters Sub Menu are now maintained together on this page.</div></div>'; }
function companyGstChanged(el) {
  if (!el) return;
  el.value = String(el.value || '').toUpperCase().replace(/\s+/g, '');
  if (/^\d{2}/.test(el.value)) { const sc = $('co-state-code'); if (sc) sc.value = el.value.slice(0, 2); }
  const pan = $('co-pan'); if (pan) pan.value = el.value.length >= 12 ? el.value.slice(2, 12) : '';
}
function companyDetailsMasterHtml() {
  const c = Object.assign({}, DEFAULT_COMPANY_DETAILS, (db.masters && db.masters.companyDetails) || {});
  const canEdit = canMasterTab('companydetails', 'edit');
  return '<div class="mhead"><div><h3>Company Details</h3><p>Legal, GST and address details used on Purchase Orders, Delivery Challans and GST / E-Way Bill prints.</p></div>' +
    (canEdit ? '<button class="btn btn-primary" onclick="saveCompanyDetails()">' + ic('save', 15) + 'Save Company Details</button>' : '') + '</div>' +
    '<div class="sec">Legal &amp; GST Details</div><div class="grid-fixed">' +
    field('Company Legal Name *', '<input class="inp" id="co-name" value="' + esc(c.name || '') + '" placeholder="Legal company name">') +
    field('GSTIN *', '<input class="inp" id="co-gst" maxlength="15" value="' + esc(c.gstNo || '') + '" placeholder="27ABCDE1234F1Z5" oninput="companyGstChanged(this)">') +
    field('PAN (Auto from GSTIN)', '<input class="inp" id="co-pan" maxlength="10" value="' + esc(c.pan || (c.gstNo ? String(c.gstNo).slice(2, 12) : '')) + '" placeholder="Auto from GSTIN" disabled>') +
    field('State *', cbox('co-state', { opts: db.masters.states || [], value: c.state || '', placeholder: 'Select state', free: false })) +
    field('State Code *', '<input class="inp" id="co-state-code" maxlength="2" inputmode="numeric" value="' + esc(c.stateCode || '') + '" placeholder="27" oninput="this.value=this.value.replace(/[^0-9]/g,\'\').slice(0,2)">') +
    field('Jurisdiction *', '<input class="inp" id="co-jurisdiction" value="' + esc(c.jurisdiction || '') + '" placeholder="e.g. Ichalkaranji">') +
    '</div><div class="sec">Registered Office</div><div class="grid-fixed">' +
    field('Registered Office — Line 1 *', '<textarea class="inp" id="co-reg" rows="3" placeholder="Registered office address">' + esc(c.reg || '') + '</textarea>') +
    field('Registered Office — Line 2', '<textarea class="inp" id="co-reg2" rows="3" placeholder="Additional address line">' + esc(c.reg2 || '') + '</textarea>') +
    '</div><div class="sec">Works / Dispatch &amp; Contact</div><div class="grid-fixed">' +
    field('Works / Dispatch Address *', '<textarea class="inp" id="co-works" rows="3" placeholder="Works / dispatch address">' + esc(c.works || '') + '</textarea>') +
    field('Contact Details', '<textarea class="inp" id="co-contact" rows="3" placeholder="Telephone and email">' + esc(c.contact || '') + '</textarea>') +
    '</div><div class="hint">These details automatically flow to all supported print documents. State Code and PAN are derived automatically from the GSTIN while typing.</div>';
}
function saveCompanyDetails() {
  if (!canMasterTab('companydetails', 'edit')) return toast('Edit access denied', 'red');
  clearReqMarks();
  const val = function (id) { return String((($(id) || {}).value) || '').trim(); };
  const name = val('co-name'), gst = val('co-gst').toUpperCase(), pan = gst.length >= 12 ? gst.slice(2, 12) : '', state = cboxGet('co-state'), stateCode = val('co-state-code'), reg = val('co-reg'), reg2 = val('co-reg2'), works = val('co-works'), contact = val('co-contact'), jurisdiction = val('co-jurisdiction');
  if (!name) return reqBad('co-name', 'Company Legal Name is required');
  if (!gst) return reqBad('co-gst', 'GSTIN is required for GST / E-Way Bill print');
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gst)) return reqBad('co-gst', 'Enter a valid 15-character GSTIN');
  if (!state) return reqBad('co-state', 'State is required');
  if (!/^\d{2}$/.test(stateCode)) return reqBad('co-state-code', 'State Code must contain 2 digits');
  if (gst.slice(0, 2) !== stateCode) return reqBad('co-state-code', 'State Code must match the first two GSTIN digits');
  if (!reg) return reqBad('co-reg', 'Registered Office address is required');
  if (!works) return reqBad('co-works', 'Works / Dispatch address is required');
  if (!jurisdiction) return reqBad('co-jurisdiction', 'Jurisdiction is required');
  const prev = Object.assign({}, db.masters.companyDetails || {});
  const next = { name: name, gstNo: gst, pan: pan, state: state, stateCode: stateCode, reg: reg, reg2: reg2, works: works, contact: contact, jurisdiction: jurisdiction };
  db.masters.companyDetails = next;
  const changes = []; Object.keys(next).forEach(function (k) { if (String(prev[k] || '') !== String(next[k] || '')) changes.push(k + ': ' + String(prev[k] || '—') + ' → ' + String(next[k] || '—')); });
  auditPush('Company Details', 'Updated', name, changes.length ? changes : ['Company details saved']);
  saveDB(); toast('Company Details saved', 'green'); renderMasters();
}
function masterPanelHtml() {
  if (mTab === 'styles') return styleMasterPanelHtml();
  if (mTab === 'items') return itemRecordsMasterPanelHtml();
  if (mTab === 'partyrecords') return partyRecordsMasterPanelHtml();
  if (mTab === 'companydetails') return companyDetailsMasterHtml();
  if (mTab === 'loginpage') return loginPageMasterHtml();
  if (mTab === 'menumaster') return menuManagementHtml();
  if (mTab === 'usermanagement') return userManagementMasterHtml();
  if (mTab === 'audit') return auditMasterPanelHtml();
  const d = mastersDefs().find(x => x.k === mTab);
  if (!d) return '';
  const all = db.masters[d.k] || [];
  const q = mQuery.toLowerCase().trim();
  let rows = all.map((v, i) => ({ v: v, i: i, id: masterIdFor(d.k, v) })).reverse().filter(r => !q || String(r.v).toLowerCase().includes(q) || String(r.id).toLowerCase().includes(q));
  if (MASTER_PARENT[d.k] && mParent) rows = rows.filter(r => parentOf(d.k, r.v) === mParent);
  const pg = slicePage(rows, { page: mPage, size: mSize });
  mPage = pg.page; mSize = pg.size;
  rows = pg.rows;

  const list = pg.total
    ? rows.map(function (r, idx) {
      const used = masterUsedIn(d.k, r.v);
      const ebtn = '<span class="mi-acts"><button class="btn-icon" title="Edit" onclick="editMaster(\'' + d.k + '\',' + r.i + ')">' + ic('pencil', 13) + '</button>';
      const btn = ebtn +
        (used.length
          ? '<button class="btn-icon" disabled title="Cannot delete — used in ' + esc(used.join(', ')) + '">' + ic('lock', 13) + '</button>'
          : '<button class="btn-icon danger" title="Delete" onclick="delMaster(\'' + d.k + '\',' + r.i + ')">' + ic('trash', 13) + '</button>') +
        '</span>';
      const par = MASTER_PARENT[d.k] ? parentOf(d.k, r.v) : '';
      const addr = d.k === 'warehouses' ? warehouseAddr(r.v) : d.k === 'sellerPrograms' ? sellerProgramOf(r.v) : '';
      return '<div class="master-item' + (used.length ? ' mi-locked' : '') + '"><span class="mi-sr">' + (pg.from + idx) + '</span><span class="mi-id">' + esc(masterIdFor(d.k, r.v)) + '</span><span>' + esc(r.v) +
        (addr ? '<span class="meta"> · ' + esc(addr) + '</span>' : '') +
        (par ? '<span class="inuse">' + esc(par) + '</span>' : '') +
        (used.length ? '<span class="inuse">in use · ' + esc(used.join(', ')) + '</span>' : '') + '</span><span class="master-status-cell">' + masterToggleHtml(d.k, r.v) + '</span>' + btn + '</div>';
    }).join('')
    : '<div class="master-item mi-empty">' + (all.length ? 'No matches for “' + esc(mQuery) + '”' : 'Nothing added yet') + '</div>';

  return '<div class="mhead">' +
    '<div><h3>' + esc(d.title) + '<span class="c">' + all.length + '</span></h3>' +
    (d.hint ? '<p>' + d.hint + '</p>' : '') +
    (d.k === 'sellerPrograms' ? '<p class="meta">' + esc(sellerProgramCoverage()) + '</p>' : '') + '</div>' +
    '</div>' +
    '<div class="mtools">' +
    '<div class="add-row" style="flex:1">' +
    (MASTER_PARENT[d.k]
      ? cbox('m-parent-' + d.k, {
        opts: db.masters[MASTER_PARENT[d.k].parent] || [], value: mParent, f: 'parent',
        placeholder: MASTER_PARENT[d.k].label + ' *', free: false, onSet: function (v) { mParent = v; mSearch(mQuery); }
      })
      : '') +
    '<input class="inp" id="m-new-' + d.k + '" placeholder="' + esc(d.ph) + '" onkeydown="if(event.key===\'Enter\')addMaster(\'' + d.k + '\')">' +
    (d.k === 'warehouses' ? '<input class="inp" id="m-new-' + d.k + '-addr" placeholder="Address" onkeydown="if(event.key===\'Enter\')addMaster(\'' + d.k + '\')">' : '') +
    (d.k === 'sellerPrograms' ? '<input class="inp" id="m-new-sellerPrograms-prog" placeholder="po_type · SJIT / PPMP" list="m-prog-datalist" style="max-width:180px" onkeydown="if(event.key===\'Enter\')addMaster(\'sellerPrograms\')"><datalist id="m-prog-datalist">' + sellerProgramValues().map(function (x) { return '<option value="' + esc(x.v) + '"></option>'; }).join('') + '</datalist>' : '') +
    '<button class="btn btn-primary btn-sm" onclick="addMaster(\'' + d.k + '\')">' + ic('plus', 15) + 'Add</button>' +
    '</div>' +
    '<div class="search msearch">' + ic('search', 16) +
    '<input class="inp" placeholder="Filter ' + esc(d.title) + '" value="' + esc(mQuery) + '" oninput="mSearch(this.value)"></div>' +
    ((mQuery || mParent) ? '<button class="btn btn-ghost btn-sm" onclick="mClearFilters()">Clear filters</button>' : '') +
    '</div>' +
    '<div class="master-list-head"><span>Sr.</span><span>ID</span><span>Master Value</span><span>Status</span><span>Actions</span></div>' +
    '<div class="master-list mlist">' + list + '</div>' + pagerBar(pg, 'master', d.k);
}



function masterToggleHtml(k, v) { const on = masterIsActive(k, v); return '<button type="button" class="sw master-status-sw' + (on ? ' on' : '') + '" aria-pressed="' + on + '" title="' + (on ? 'Active' : 'Inactive') + '" onclick="toggleMasterActive(\'' + k + '\',' + JSON.stringify(String(v)).replace(/"/g, '&quot;') + ',this)"><span class="sw-knob"></span></button><span class="master-status-label ' + (on ? 'on' : 'off') + '">' + (on ? 'Active' : 'Inactive') + '</span>'; }
function toggleMasterActive(k, v, btn) {
  if (!userCanMaster(k, 'edit')) return toast('Edit access denied for this Master', 'red');
  if (!db.masters.masterStatus) db.masters.masterStatus = {}; if (!db.masters.masterStatus[k]) db.masters.masterStatus[k] = {}; const key = String(v).trim().toLowerCase(); const on = !masterIsActive(k, v); db.masters.masterStatus[k][key] = on;
  auditPush('Master — ' + k, 'Updated', String(v), ['Status: ' + (!on ? 'Active' : 'Inactive') + ' → ' + (on ? 'Active' : 'Inactive')]); saveDB(); toast(String(v) + ' marked ' + (on ? 'Active' : 'Inactive'), 'green'); renderMasters();
}
function addMaster(k) {
  if (!userCanMaster(k, 'create')) return toast('Create access denied for this Master', 'red');
  clearReqMarks();
  const v = $('m-new-' + k).value.trim();
  if (!v) return reqBad('m-new-' + k, 'Enter a value first');
  const dupErr = masterDupError(k, v);
  if (dupErr) return reqBad('m-new-' + k, dupErr);
  const vErr = masterValueError(k, v);
  if (vErr) return reqBad('m-new-' + k, vErr);
  if (MASTER_PARENT[k]) {
    const par = cboxGet('m-parent-' + k);
    if (!par) return reqBad('m-parent-' + k, MASTER_PARENT[k].label + ' is required first');
    addMasterVal(k, v);
    setParentOf(k, v, par);
    saveDB();
    renderMasters();
    return;
  }
  addMasterVal(k, v);
  if (k === 'warehouses') {
    const a = $('m-new-warehouses-addr');
    setWarehouseAddr(v, a ? a.value.trim() : '');
    saveDB();
  }
  if (k === 'sellerPrograms') {
    const p = $('m-new-sellerPrograms-prog');
    setSellerProgram(v, p ? p.value : '');
    saveDB();
  }
  renderMasters();
}
/* '' when the value is free to use, else the message to show */
function masterDupError(k, v) {
  const nv = String(v == null ? '' : v).trim().toLowerCase();
  if (!nv) return '';
  if (k === 'items') {
    return db.masters.items.some(function (i) { return String(i.name || '').trim().toLowerCase() === nv; })
      ? '\u201c' + v + '\u201d already exists in Item Master \u2014 duplicate names are not allowed' : '';
  }
  return (db.masters[k] || []).some(function (x) { return String(x).trim().toLowerCase() === nv; })
    ? '\u201c' + v + '\u201d already exists in this master \u2014 duplicate names are not allowed' : '';
}
function addMasterVal(k, v, silent) {
  if (k === 'items') {
    if (!db.masters.items.some(i => i.name.toLowerCase() === v.toLowerCase())) {
      db.seq.item = (db.seq.item || 0) + 1;
      db.masters.items.push({
        id: uid(), code: 'ITM-' + String(db.seq.item).padStart(4, '0'), name: v, category: 'Other', unit: '',
        classification: '', materialType: '', quality: '', description: '', hasColor: false, sizes: [],
        colorName: '', width: '', moq: '', itemRate: '', itemMRP: '', cgst: '', sgst: '', igst: '', gst: '', hsn: '',
        purchaseRate: '', saleRate: '', image: '', active: true
      });
      saveDB();
    }
  } else {
    if (!db.masters[k].includes(v)) { db.masters[k].push(v); saveDB(); if (typeof syncMastersToMysql === 'function') syncMastersToMysql(); }
  }
  if (!silent) toast('Added: ' + v, 'green');
}
function delMaster(k, i) {
  const v = db.masters[k][i];
  // v5: deletion is allowed even when the value is in use. The confirmation
  // dialog still shows a warning so the user knows downstream entries will
  // have a dangling reference.
  const used = masterUsedIn(k, v);
  const warnNote = used.length
    ? '<div style="background:#fff5ea;border-left:4px solid #ffb800;color:#5e4200"><b>In use by:</b> ' + esc(used.join(', ')) + '. These entries will have a dangling reference after deletion.</div>'
    : '';
  const kids = masterChildrenOf(k, v);
  confirmDelete({ kind: 'master value', name: v, bodyHtml: warnNote, confirmText: 'Delete permanently' }, function () {
    const idx = db.masters[k].indexOf(v);
    if (idx < 0) return;
    db.masters[k].splice(idx, 1);
    const delKey = String(v).trim().toLowerCase();
    if (db.masters.masterIds && db.masters.masterIds[k]) delete db.masters.masterIds[k][delKey];
    if (db.masters.masterStatus && db.masters.masterStatus[k]) delete db.masters.masterStatus[k][delKey];
    if (k === 'warehouses') setWarehouseAddr(v, '');
    if (k === 'sellerPrograms') setSellerProgram(v, '');
    if (MASTER_PARENT[k]) setParentOf(k, v, '');
    saveDB(); toast('Removed'); renderMasters();
  }, kids.length ? (kids.length + ' dependent ' + kids[0].label + ' value' + (kids.length > 1 ? 's' : '') + ' will be left without a parent.') : '');
}
/* child master values that hang off this value (Country \u2192 State, etc.) */
function masterChildrenOf(k, v) {
  const out = [];
  Object.keys(MASTER_PARENT).forEach(function (ck) {
    if (MASTER_PARENT[ck].parent !== k) return;
    (db.masters[ck] || []).forEach(function (cv) {
      if (String(parentOf(ck, cv)).trim().toLowerCase() === String(v).trim().toLowerCase()) out.push({ key: ck, val: cv, label: ck });
    });
  });
  return out;
}
/* rename a master value everywhere it is referenced in saved records */
function renameEverywhere(oldV, newV) {
  const from = String(oldV);
  const skip = { parentMap: 1 };
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (typeof node[i] === 'string') { if (node[i] === from) node[i] = newV; }
        else walk(node[i]);
      }
      return;
    }
    Object.keys(node).forEach(function (key) {
      const val = node[key];
      if (typeof val === 'string') { if (val === from) node[key] = newV; }
      else if (val && typeof val === 'object' && !skip[key]) walk(val);
    });
  }
  ORDER.concat(['jobworkreturn']).forEach(function (m) { if (Array.isArray(db[m])) walk(db[m]); });
  walk(db.masters.items);
  walk(db.masters.parties);
  walk(db.masters.styles);
}
/* rename a value inside one master list + keep parent/child links intact */
function renameMasterVal(k, oldV, newV) {
  const idx = db.masters[k].indexOf(oldV);
  if (idx < 0) return false;
  const oldKey = String(oldV).trim().toLowerCase(), newKey = String(newV).trim().toLowerCase();
  if (db.masters.masterIds && db.masters.masterIds[k] && db.masters.masterIds[k][oldKey]) { db.masters.masterIds[k][newKey] = db.masters.masterIds[k][oldKey]; delete db.masters.masterIds[k][oldKey]; }
  if (db.masters.masterStatus && db.masters.masterStatus[k] && db.masters.masterStatus[k][oldKey] != null) { db.masters.masterStatus[k][newKey] = db.masters.masterStatus[k][oldKey]; delete db.masters.masterStatus[k][oldKey]; }
  db.masters[k][idx] = newV;
  if (MASTER_PARENT[k]) { const par = parentOf(k, oldV); setParentOf(k, oldV, ''); setParentOf(k, newV, par); }
  if (k === 'sellerPrograms') { const program = sellerProgramOf(oldV); if (program) { setSellerProgram(oldV, ''); setSellerProgram(newV, program); } }
  /* re-point children that referenced the old parent name */
  Object.keys(MASTER_PARENT).forEach(function (ck) {
    if (MASTER_PARENT[ck].parent !== k) return;
    const map = (db.masters.parentMap || {})[ck] || {};
    Object.keys(map).forEach(function (cv) { if (map[cv] === oldV) map[cv] = newV; });
  });
  renameEverywhere(oldV, newV);
  return true;
}
/* Edit dialog for a simple master value (rename + optional re-parent) */
function editMaster(k, i) {
  const v = db.masters[k][i]; if (v == null) return;
  const d = mastersDefs().find(x => x.k === k);
  const title = d ? d.title : k;
  const used = masterUsedIn(k, v);
  const par = MASTER_PARENT[k];
  const parentId = 'dlg-parent-' + k;
  openDialog({
    title: 'Edit ' + title.replace(/s$/, ''),
    bodyHtml:
      (par ? '<div class="dlg-field"><label>' + esc(par.label) + '</label>' +
        cbox(parentId, { opts: db.masters[par.parent] || [], value: parentOf(k, v), placeholder: par.label, free: false }) + '</div>' : '') +
      '<div class="dlg-field"><label>Value *</label>' +
      '<input class="inp" id="dlg-mval" value="' + esc(v) + '" placeholder="' + esc(d ? d.ph : 'Value') + '"></div>' +
      (k === 'warehouses' ? '<div class="dlg-field"><label>Address</label>' +
        '<input class="inp" id="dlg-maddr" value="' + esc(warehouseAddr(v)) + '" placeholder="Warehouse address"></div>' : '') +
      (k === 'sellerPrograms' ? '<div class="dlg-field"><label>po_type</label>' +
        '<input class="inp" id="dlg-mprog" value="' + esc(sellerProgramOf(v)) + '" placeholder="e.g. SJIT or PPMP" list="m-prog-datalist"></div>' : ''),
    note: used.length ? 'This value is used in ' + esc(used.join(', ')) + '. Renaming it updates those records too.' : '',
    confirmText: 'Save changes',
    after: function () { const el = $('dlg-mval'); if (el) { el.focus(); el.select(); } },
    onConfirm: function () {
      const nv = ($('dlg-mval') ? $('dlg-mval').value : '').trim();
      if (!nv) { reqBad('dlg-mval', 'Value cannot be empty'); return false; }
      if (nv.toLowerCase() !== String(v).toLowerCase()) {
        const dupErr = masterDupError(k, nv);
        if (dupErr) { reqBad('dlg-mval', dupErr); return false; }
      }
      const vErr = masterValueError(k, nv);
      if (vErr) { reqBad('dlg-mval', vErr); return false; }
      if (par) {
        const pv = cboxGet(parentId);
        if (!pv) { reqBad(parentId, par.label + ' is required'); return false; }
        setParentOf(k, v, pv);
      }
      if (nv !== v) renameMasterVal(k, v, nv);
      if (k === 'warehouses') {
        const ae = $('dlg-maddr');
        if (nv !== v) setWarehouseAddr(v, '');
        setWarehouseAddr(nv, ae ? ae.value.trim() : '');
      }
      if (k === 'sellerPrograms') {
        const pe = $('dlg-mprog');
        if (nv !== v) setSellerProgram(v, '');
        setSellerProgram(nv, pe ? pe.value : '');
      }
      saveDB(); toast('Updated: ' + nv, 'green'); renderMasters();
    }
  });
}
function addItemMaster() {
  clearReqMarks();
  const name = $('m-item-name').value.trim();
  if (!name) return reqBad('m-item-name', 'Item name is required');
  if (db.masters.items.some(i => i.name.toLowerCase() === name.toLowerCase())) return toast('\u201c' + name + '\u201d already exists in Item Master \u2014 duplicate names are not allowed', 'red');
  db.masters.items.push({ name: name, category: $('m-item-cat').value, unit: $('m-item-unit').value });
  saveDB(); toast('Item added: ' + name, 'green'); renderMasters();
}
function delItemMaster(i) {
  const it = db.masters.items[i]; if (!it) return;
  // v5: deletion is allowed even when the item is in use. The confirmation
  // dialog still shows a warning so the user knows downstream entries will
  // have a dangling reference.
  const used = itemUsedIn(it.name);
  const warnNote = used.length
    ? '<div style="background:#fff5ea;border-left:4px solid #ffb800;color:#5e4200"><b>Item in use:</b> ' + esc(used.join(', ')) + ' reference this item and will have a dangling reference after deletion.</div>'
    : '';
  confirmDelete({ kind: 'item', name: it.name, bodyHtml: warnNote, confirmText: 'Delete permanently' }, function () {
    db.masters.items.splice(i, 1); saveDB(); toast('Item removed'); renderMasters();
  });
}
function itemOpts() { return db.masters.items.filter(function (i) { return i.active !== false; }).map(i => { const code = i.code ? '[' + i.code + '] ' : ''; return { v: i.name, l: code + i.name + (i.unit ? ' (' + i.unit + ')' : ''), mid: i.code || i.id, hint: i.unit ? i.unit : '' }; }); }
function itemDisplay(name) { const it = itemByName(name); return it ? ((it.code ? '[' + it.code + '] ' : '') + it.name) : (name || ''); }
function itemUnit(name) { const it = db.masters.items.find(i => i.name.toLowerCase() === String(name).toLowerCase()); return it && it.unit ? it.unit : ''; }
function itemByName(name) {
  const target = bareItemName(String(name || ''));
  return (db.masters.items || []).find(function (i) {
    return lcName(bareItemName(i.name)) === lcName(target)
      || lcName(i.name) === lcName(target)
      || lcName(i.name) === lcName(String(name || ''));
  });
}
function sameItem(a, b) {
  if (!a || !b) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    const idA = a.item_id || (typeof a === 'string' ? findMasterId(a, 'items') : findMasterId(a.name || a.item, 'items'));
    const idB = b.item_id || (typeof b === 'string' ? findMasterId(b, 'items') : findMasterId(b.name || b.item, 'items'));
    if (idA && idB) return idA === idB;
    const nmA = String(typeof a === 'string' ? a : (a.name || a.item || '')).trim().toLowerCase();
    const nmB = String(typeof b === 'string' ? b : (b.name || b.item || '')).trim().toLowerCase();
    return nmA === nmB;
  }
  const idA = findMasterId(a, 'items');
  const idB = findMasterId(b, 'items');
  if (idA && idB) return idA === idB;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function itemStockQty(nameOrId) {
  if (!nameOrId) return 0;
  const targetId = findMasterId(nameOrId, 'items');
  const targetName = String(nameOrId).toLowerCase().trim();
  let received = 0, issued = 0;
  db.inward.forEach(inw => (inw.items || []).forEach(i => {
    const itmId = i.item_id || findMasterId(i.name, 'items');
    if ((targetId && itmId && targetId === itmId) || (i.name && i.name.toLowerCase().trim() === targetName)) {
      received += pf(i.recQty);
    }
  }));
  db.jobwork.forEach(j => (j.issues || []).concat(j.extras || []).forEach(i => {
    const itmId = i.item_id || findMasterId(i.item, 'items');
    if ((targetId && itmId && targetId === itmId) || (i.item && i.item.toLowerCase().trim() === targetName)) {
      issued += pf(i.qty);
    }
  }));
  /* material sent back to the supplier leaves our stock */
  db.purchasereturn.forEach(r => (r.items || []).forEach(i => {
    const itmId = i.item_id || findMasterId(i.name, 'items');
    if ((targetId && itmId && targetId === itmId) || (i.name && i.name.toLowerCase().trim() === targetName)) {
      issued += pf(i.retQty);
    }
  }));
  /* material the job worker sends back comes into stock */
  db.jobworkreturn.forEach(r => (r.items || []).forEach(i => {
    const itmId = i.item_id || findMasterId(i.name, 'items');
    if ((targetId && itmId && targetId === itmId) || (i.name && i.name.toLowerCase().trim() === targetName)) {
      received += pf(i.retQty);
    }
  }));
  return Math.max(0, received - issued);
}

