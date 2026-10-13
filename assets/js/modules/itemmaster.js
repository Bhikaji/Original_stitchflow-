/**
 * StitchFlow ERP — Item Master & Excel Import/Export
 * File: assets/js/modules/itemmaster.js
 */

/* ===== Item Master Excel template / import (self-contained XLSX) ===== */
function exportAllMastersExcel() {
  const sheets = [];
  sheets.push({ name: 'Style Master', headers: ['ID', 'Internal ID', 'Portal ID', 'Description', 'Status'], rows: (db.masters.styles || []).map(function (x) { return [x.id || '', x.internal || '', x.portal || '', x.desc || '', x.active === false ? 'Inactive' : 'Active']; }) });
  sheets.push({ name: 'Item Master', headers: ['ID', 'Item Name', 'Category', 'Classification', 'Quality', 'Description', 'UOM', 'Width', 'HSN', 'GST %', 'Status'], rows: (db.masters.items || []).map(function (x) { return [x.code || '', x.name || '', x.category || '', x.classification || '', x.quality || '', x.description || '', x.unit || '', x.width || '', x.hsn || '', x.gst == null ? '' : x.gst, x.active === false ? 'Inactive' : 'Active']; }) });
  sheets.push({ name: 'Party onboarding', headers: ['ID', 'Legal Name', 'Short Name', 'Business Type', 'GST No', 'PAN', 'City', 'State', 'Status'], rows: (db.masters.parties || []).map(function (x) { return [x.code || '', x.legalName || '', x.shortName || '', partyTypes(x).join(', '), x.gstNo || '', x.pan || '', x.city || '', x.state || '', x.status || 'Active']; }) });
  mastersDefs().forEach(function (d) { const rows = (db.masters[d.k] || []).map(function (v) { return [masterIdFor(d.k, v), String(v), masterIsActive(d.k, v) ? 'Active' : 'Inactive', MASTER_PARENT[d.k] ? parentOf(d.k, v) : '', d.k === 'warehouses' ? warehouseAddr(v) : '']; }); sheets.push({ name: d.title, headers: ['ID', 'Master Value', 'Status', 'Parent', 'Additional Details'], rows: rows }); });
  const menuRows = []; mainMenuEntries().forEach(function (x, i) { menuRows.push(['Main Menu', x.section, x.l, x.target || x.k, i + 1]); }); masterMenuEntries().forEach(function (x, i) { menuRows.push(['Masters Sub Menu', x.section, x.l, x.target || x.k, i + 1]); }); sheets.push({ name: 'Menu Management', headers: ['Menu Area', 'Parent Menu', 'Display Label', 'Module or Master', 'Order'], rows: menuRows });
  const login = (((db.masters || {}).loginSettings || {})); sheets.push({ name: 'Login Page', headers: ['Slide ID', 'Slide Name', 'Fit', 'Position', 'Status', 'Interval Seconds'], rows: (login.slides || []).map(function (x) { return [x.id, x.name, x.fit, x.position, x.active === false ? 'Inactive' : 'Active', login.interval || 6]; }) });
  const used = {}, clean = function (name) { let n = String(name || 'Master').replace(/[\\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Master', base = n, i = 2; while (used[n]) n = (base.slice(0, 27) + ' ' + i++).slice(0, 31); used[n] = 1; return n; }; sheets.forEach(function (sh) { sh.name = clean(sh.name); });
  let content = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
  let wb = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>', rels = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">', files = {};
  sheets.forEach(function (sh, i) { const n = i + 1; content += '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; wb += '<sheet name="' + xesc(sh.name) + '" sheetId="' + n + '" r:id="rId' + n + '"/>'; rels += '<Relationship Id="rId' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + n + '.xml"/>'; files['xl/worksheets/sheet' + n + '.xml'] = xsheet(sh.headers, sh.rows, []); });
  content += '</Types>'; wb += '</sheets></workbook>'; rels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  files['[Content_Types].xml'] = content; files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'; files['xl/workbook.xml'] = wb; files['xl/_rels/workbook.xml.rels'] = rels; files['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303030"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>';
  downloadBytes(xzip(files), 'All_Masters_' + today() + '.xlsx'); toast('All Masters exported to Excel', 'green');
}

function masterExportData(k) {
  if (k === 'usermanagement') return { name: 'User Management', headers: ['User ID', 'Full Name', 'Username', 'Role', 'Status', 'Visible Modules', 'Permission Model'], rows: (db.users || []).map(function (u) { const mods = u.role === 'Admin' ? 'All modules' : Object.keys((u.permissions && u.permissions.modules) || {}).filter(function (m) { return u.permissions.modules[m].view; }).map(function (m) { return (MODULES[m] || {}).label || m; }).join(', ') || ((u.modules || []).join(', ')); return [u.id || '', u.name || '', u.username || '', u.role || '', u.status || 'Active', mods, u.permissions ? 'Detailed per module' : 'Legacy role access']; }) };
  if (k === 'styles') return { name: 'Style Master', headers: ['ID', 'Internal ID', 'Portal ID', 'Description', 'Status'], rows: (db.masters.styles || []).map(function (x) { return [x.id || '', x.internal || '', x.portal || '', x.desc || '', x.active === false ? 'Inactive' : 'Active']; }) };
  if (k === 'items') return { name: 'Item Master', headers: ['ID', 'Item Name', 'Category', 'Classification', 'Quality', 'Description', 'UOM', 'Width', 'HSN', 'GST %', 'Status'], rows: (db.masters.items || []).map(function (x) { return [x.code || '', x.name || '', x.category || '', x.classification || '', x.quality || '', x.description || '', x.unit || '', x.width || '', x.hsn || '', x.gst == null ? '' : x.gst, x.active === false ? 'Inactive' : 'Active']; }) };
  if (k === 'partyrecords') return { name: 'Party onboarding', headers: ['ID', 'Legal Name', 'Short Name', 'Business Type', 'GST No', 'PAN', 'City', 'State', 'Status'], rows: (db.masters.parties || []).map(function (x) { return [x.code || '', x.legalName || '', x.shortName || '', partyTypes(x).join(', '), x.gstNo || '', x.pan || '', x.city || '', x.state || '', x.status || 'Active']; }) };
  if (k === 'loginpage') { const c = db.masters.loginSettings || {}; return { name: 'Login Page', headers: ['Slide ID', 'Slide Name', 'Fit', 'Position', 'Status', 'Interval Seconds'], rows: (c.slides || []).map(function (x) { return [x.id, x.name, x.fit, x.position, x.active === false ? 'Inactive' : 'Active', c.interval || 6]; }) }; }
  if (k === 'menumaster') { const rows = []; mainMenuEntries().forEach(function (x, i) { rows.push(['Main Menu', x.section, x.l, x.target || x.k, i + 1]); }); masterMenuEntries().forEach(function (x, i) { rows.push(['Masters Sub Menu', x.section, x.l, x.target || x.k, i + 1]); }); return { name: 'Menu Management', headers: ['Menu Area', 'Parent Menu', 'Display Label', 'Module or Master', 'Order'], rows: rows }; }
  const d = mastersDefs().find(function (x) { return x.k === k; }), rows = (db.masters[k] || []).map(function (v) { return [masterIdFor(k, v), String(v), masterIsActive(k, v) ? 'Active' : 'Inactive', MASTER_PARENT[k] ? parentOf(k, v) : '', k === 'warehouses' ? warehouseAddr(v) : '']; }); return { name: d ? d.title : k, headers: ['ID', 'Master Value', 'Status', 'Parent', 'Additional Details'], rows: rows };
}
function exportSingleMasterExcel(k) { const sh = masterExportData(k), sheetName = String(sh.name || 'Master').replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31), files = {}; files['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'; files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'; files['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xesc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>'; files['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'; files['xl/styles.xml'] = '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303030"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'; files['xl/worksheets/sheet1.xml'] = xsheet(sh.headers, sh.rows, []); downloadBytes(xzip(files), String(sh.name).replace(/[^A-Za-z0-9_-]/g, '_') + '_' + today() + '.xlsx'); toast(sh.name + ' exported to Excel', 'green'); }

const ITEM_XLSX_HEADERS = ['Category', 'Classification', 'Item Name', 'Quality', 'Description', 'UOM', 'Width / Dimensions', 'HSN Code', 'GST %', 'Status'];
let ITEM_IMPORT_ERRORS = [];
function xesc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]; }); }
function xcol(n) { let s = ''; while (n) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); } return s; }
function xcell(ref, v, style) { return '<c r="' + ref + '" t="inlineStr"' + (style ? ' s="' + style + '"' : '') + '><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>'; }
function xsheet(headers, rows, validations, headerStyles) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
  headers.forEach(function (h, i) { const w = Math.max(12, Math.min(34, String(h).length + 5)); xml += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; });
  xml += '</cols><sheetData><row r="1">' + headers.map(function (h, i) { return xcell(xcol(i + 1) + '1', h, headerStyles && headerStyles[i] != null ? headerStyles[i] : 1); }).join('') + '</row>';
  rows.forEach(function (row, ri) { xml += '<row r="' + (ri + 2) + '">' + headers.map(function (_, ci) { return xcell(xcol(ci + 1) + (ri + 2), row[ci] == null ? '' : row[ci], 0); }).join('') + '</row>'; });
  xml += '</sheetData><autoFilter ref="A1:' + xcol(headers.length) + '1"/>';
  if (validations && validations.length) { xml += '<dataValidations count="' + validations.length + '">' + validations.map(function (v) { return '<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Invalid master value" error="Select a value from the latest Master list" sqref="' + v.range + '"><formula1>' + xesc(v.formula || v.name) + '</formula1></dataValidation>'; }).join('') + '</dataValidations>'; }
  return xml + '</worksheet>';
}
function xcrc(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) { c ^= bytes[i]; for (let k = 0; k < 8; k++)c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ 0xffffffff) >>> 0; }
function xu16(a, o, v) { a[o] = v & 255; a[o + 1] = (v >>> 8) & 255; } function xu32(a, o, v) { xu16(a, o, v); xu16(a, o + 2, v >>> 16); }
function xconcat(parts) { const n = parts.reduce(function (a, p) { return a + p.length; }, 0), out = new Uint8Array(n); let o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; }); return out; }
function xzip(files) {
  const enc = new TextEncoder(), locals = [], centrals = []; let offset = 0;
  Object.keys(files).forEach(function (name) {
    const nb = enc.encode(name), data = enc.encode(files[name]), crc = xcrc(data), lh = new Uint8Array(30 + nb.length); xu32(lh, 0, 0x04034b50); xu16(lh, 4, 20); xu16(lh, 6, 0); xu16(lh, 8, 0); xu32(lh, 14, crc); xu32(lh, 18, data.length); xu32(lh, 22, data.length); xu16(lh, 26, nb.length); lh.set(nb, 30); locals.push(lh, data);
    const ch = new Uint8Array(46 + nb.length); xu32(ch, 0, 0x02014b50); xu16(ch, 4, 20); xu16(ch, 6, 20); xu16(ch, 8, 0); xu16(ch, 10, 0); xu32(ch, 16, crc); xu32(ch, 20, data.length); xu32(ch, 24, data.length); xu16(ch, 28, nb.length); xu32(ch, 42, offset); ch.set(nb, 46); centrals.push(ch); offset += lh.length + data.length;
  });
  const central = xconcat(centrals), end = new Uint8Array(22); xu32(end, 0, 0x06054b50); xu16(end, 8, centrals.length); xu16(end, 10, centrals.length); xu32(end, 12, central.length); xu32(end, 16, offset); return xconcat(locals.concat([central, end]));
}
function activeMasterRows(k) { return (db.masters[k] || []).filter(function (v) { return masterIsActive(k, v); }).slice().reverse(); }
function itemWorkbookRows() {
  const rows = []; for (let i = 0; i < 50; i++)rows.push(new Array(ITEM_XLSX_HEADERS.length).fill('')); return rows;
}
function xlsxRangeName(v) { return 'CAT_' + String(v || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''); }
function buildItemXlsx(rows, errorMode) {
  const cats = activeMasterRows('categories'), allClass = activeMasterRows('classifications');
  const masters = [cats, allClass, activeMasterRows('qualities'), activeMasterRows('uoms'), activeMasterRows('gstRates'), ['Active', 'Inactive']];
  const mh = ['Categories', 'Classifications', 'Qualities', 'UOMs', 'GSTRates', 'Statuses'];
  const dependent = [];
  cats.forEach(function (cat) {
    const values = allClass.filter(function (cls) { return String(parentOf('classifications', cls) || '').trim().toLowerCase() === String(cat).trim().toLowerCase(); });
    const rangeName = xlsxRangeName(cat); masters.push(values); mh.push('Classification — ' + cat); dependent.push({ cat: cat, name: rangeName, index: masters.length - 1 });
  });
  const max = Math.max.apply(null, masters.map(function (a) { return Math.max(1, a.length); })); const mr = []; for (let i = 0; i < max; i++)mr.push(masters.map(function (a) { return a[i] || ''; }));
  const headers = errorMode ? ITEM_XLSX_HEADERS.concat(['Import Error']) : ITEM_XLSX_HEADERS;
  const classFormula = 'INDIRECT("CAT_"&SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(UPPER($A2)," ","_"),"-","_"),"/","_"),"&","_"))';
  const vals = [{ range: 'A2:A500', name: 'Categories' }, { range: 'B2:B500', formula: classFormula }, { range: 'D2:D500', name: 'Qualities' }, { range: 'F2:F500', name: 'UOMs' }, { range: 'I2:I500', name: 'GSTRates' }, { range: 'J2:J500', name: 'Statuses' }];
  let names = ['Categories', 'Classifications', 'Qualities', 'UOMs', 'GSTRates', 'Statuses'].map(function (n, i) { const last = Math.max(2, masters[i].length + 1); return '<definedName name="' + n + '">Masters!$' + xcol(i + 1) + '$2:$' + xcol(i + 1) + '$' + last + '</definedName>'; }).join('');
  dependent.forEach(function (d) { const last = Math.max(2, masters[d.index].length + 1); names += '<definedName name="' + d.name + '">Masters!$' + xcol(d.index + 1) + '$2:$' + xcol(d.index + 1) + '$' + last + '</definedName>'; });
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Item Template" sheetId="1" r:id="rId1"/><sheet name="Masters" sheetId="2" state="hidden" r:id="rId2"/></sheets><definedNames>' + names + '</definedNames></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303030"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf fontId="0" fillId="3" borderId="0" applyFill="1"/></cellXfs></styleSheet>',
    'xl/worksheets/sheet1.xml': xsheet(headers, rows, vals, headers.map(function (_, i) { return [2, 4, 6, 7].indexOf(i) > -1 || i >= ITEM_XLSX_HEADERS.length ? 2 : 1; })), 'xl/worksheets/sheet2.xml': xsheet(mh, mr, [])
  }; return xzip(files);
}
function downloadBytes(bytes, name) { const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); }
function exportItemExcelTemplate() { downloadBytes(buildItemXlsx(itemWorkbookRows(), false), 'Item_Master_Template_' + today() + '.xlsx'); toast('Excel template exported — yellow headers require manual input', 'green'); }
function triggerItemExcelImport() { if (!userCanMaster('items', 'create')) return toast('Item import access denied', 'red'); const el = $('item-excel-file'); if (el) { el.value = ''; el.click(); } }
async function unzipEntry(buf, want) {
  const a = new Uint8Array(buf), dv = new DataView(buf); let eocd = -1; for (let i = a.length - 22; i >= 0 && i > a.length - 66000; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } } if (eocd < 0) throw new Error('Invalid XLSX file'); let count = dv.getUint16(eocd + 10, true), pos = dv.getUint32(eocd + 16, true);
  for (let z = 0; z < count; z++) { if (dv.getUint32(pos, true) !== 0x02014b50) break; const method = dv.getUint16(pos + 10, true), cs = dv.getUint32(pos + 20, true), nl = dv.getUint16(pos + 28, true), el = dv.getUint16(pos + 30, true), cl = dv.getUint16(pos + 32, true), off = dv.getUint32(pos + 42, true), name = new TextDecoder().decode(a.slice(pos + 46, pos + 46 + nl)); if (name === want) { const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), data = a.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + cs); if (method === 0) return new TextDecoder().decode(data); if (method === 8 && typeof DecompressionStream !== 'undefined') { const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return new TextDecoder().decode(await new Response(stream).arrayBuffer()); } throw new Error('Compressed XLSX is not supported by this browser'); } pos += 46 + nl + el + cl; } throw new Error('Item Template sheet not found');
}
function parseShared(xml) { if (!xml) return []; const d = new DOMParser().parseFromString(xml, 'application/xml'); return Array.from(d.getElementsByTagName('si')).map(function (si) { return Array.from(si.getElementsByTagName('t')).map(function (t) { return t.textContent; }).join(''); }); }
async function readItemXlsx(file) { const buf = await file.arrayBuffer(); let shared = ''; try { shared = await unzipEntry(buf, 'xl/sharedStrings.xml'); } catch (e) { } const ss = parseShared(shared), xml = await unzipEntry(buf, 'xl/worksheets/sheet1.xml'), doc = new DOMParser().parseFromString(xml, 'application/xml'), out = []; Array.from(doc.getElementsByTagName('row')).forEach(function (r, ri) { if (ri === 0) return; const row = new Array(ITEM_XLSX_HEADERS.length).fill(''); Array.from(r.getElementsByTagName('c')).forEach(function (c) { const ref = c.getAttribute('r') || '', letters = (/^[A-Z]+/.exec(ref) || [''])[0]; let col = 0; for (const ch of letters) col = col * 26 + ch.charCodeAt(0) - 64; col--; if (col < 0 || col >= row.length) return; const t = c.getAttribute('t'); let v = ''; if (t === 'inlineStr') { const n = c.getElementsByTagName('t')[0]; v = n ? n.textContent : ''; } else { const n = c.getElementsByTagName('v')[0]; v = n ? n.textContent : ''; if (t === 's') v = ss[+v] || ''; } row[col] = String(v).trim(); }); if (row.some(Boolean)) out.push(row); }); return out; }
function itemMasterAllowed(k, v) {
  if (k === 'gstRates') {
    const n = Number(String(v == null ? '' : v).trim()); if (!isFinite(n)) return false;
    return (db.masters[k] || []).some(function (x) { return masterIsActive(k, x) && Math.abs(Number(x) - n) < 0.000001; });
  }
  return (db.masters[k] || []).some(function (x) { return masterIsActive(k, x) && String(x).trim().toLowerCase() === String(v).trim().toLowerCase(); });
}
async function importItemExcel(inp) {
  const file = inp.files && inp.files[0]; if (!file) return; let rows; try { rows = await readItemXlsx(file); } catch (e) { toast('Could not read Excel file: ' + e.message, 'red'); return; }
  const errors = [], valid = [], seen = {};
  rows.forEach(function (r, idx) {
    const err = [], cat = r[0], cls = r[1], name = r[2], quality = r[3], desc = r[4], uom = r[5], width = r[6], hsn = r[7], gst = r[8], status = r[9] || 'Active';
    if (!name) err.push('Item Name is required');
    if (!cat || !itemMasterAllowed('categories', cat)) err.push('Invalid/inactive Category');
    if (!cls || !itemMasterAllowed('classifications', cls)) err.push('Invalid/inactive Classification');
    if (cat && cls) { const allowed = childValues('classifications', cat).some(function (v) { return masterIsActive('classifications', v) && String(v).trim().toLowerCase() === String(cls).trim().toLowerCase(); }); if (!allowed) err.push('Classification does not belong to selected Category'); }
    if (quality && !itemMasterAllowed('qualities', quality)) err.push('Invalid/inactive Quality');
    if (!uom || !itemMasterAllowed('uoms', uom)) err.push('Invalid/inactive UOM');
    if (!/^\d+$/.test(hsn)) err.push('HSN Code must contain numbers only');
    if (!itemMasterAllowed('gstRates', gst)) err.push('Invalid/inactive GST %');
    if (!/^(active|deactive|inactive)$/i.test(status)) err.push('Status must be Active or Inactive');
    const key = String(name || '').toLowerCase(); if (key && seen[key]) err.push('Duplicate Item Name in file'); if (key) seen[key] = 1;
    const clash = (db.masters.items || []).find(function (x) { return String(x.name).toLowerCase() === key; }); if (clash) err.push('Item Name already exists as ' + clash.code);
    if (err.length) errors.push(r.concat([err.join('; ')]));
    else valid.push({ name: name, category: cat, classification: cls, quality: quality, description: desc, unit: uom, width: width, hsn: hsn, gst: pf(gst), active: /^active$/i.test(status) });
  });
  valid.forEach(function (data) { db.seq.item = pf(db.seq.item) + 1; data.id = uid(); data.code = 'ITM-' + String(db.seq.item).padStart(4, '0'); data.image = ''; db.masters.items.push(data); });
  if (valid.length) { saveDB(); renderMasters(); }
  if (errors.length) {
    ITEM_IMPORT_ERRORS = errors;
    openDialog({ title: 'Item import completed with errors', message: '<b>' + valid.length + '</b> valid row(s) were imported successfully.<br><b>' + errors.length + '</b> invalid row(s) were rejected.', note: 'Download the error file containing only rejected rows, correct the Import Error column, and import that file again.', confirmText: 'Download error file', cancelText: 'Close', onConfirm: function () { downloadItemImportErrors(); } });
    if (valid.length) toast(valid.length + ' valid item row(s) imported; ' + errors.length + ' rejected', 'green');
    return;
  }
  if (valid.length) toast(valid.length + ' new item row(s) imported successfully', 'green');
  else toast('No item rows found in the Excel file', 'red');
}
function downloadItemImportErrors() { if (!ITEM_IMPORT_ERRORS.length) return; downloadBytes(buildItemXlsx(ITEM_IMPORT_ERRORS, true), 'Item_Master_Import_Errors_' + today() + '.xlsx'); }

/* ---------------- Item Master (full page) ---------------- */
let imEditId = null;
let imState = { q: '', page: 1, size: 10 };
function renderItemMaster() {
  setTimeout(dpSyncAll, 0);
  $('content').innerHTML =
    '<div class="entry-page" style="max-width:1560px">' + itemMasterFormHtml(imEditId ? db.masters.items.find(i => i.id === imEditId) : null) + '</div>' +
    '<div class="section-title" style="margin-top:26px">📦 All Items <span class="c">' + db.masters.items.length + '</span></div>' +
    '<div class="filter-bar"><input class="inp" id="im-search" placeholder="🔍 Search items…" value="' + esc(imState.q) + '" oninput="imSearch(this.value)" style="max-width:320px"></div>' +
    itemMasterListHtml();
  afterRenderItemForm();
}
function imSearch(v) { imState.q = v; imState.page = 1; const b = $('im-clear-filters'); if (b) b.disabled = !String(v || '').trim(); renderItemListOnly(); }
function renderItemListOnly() { const el = document.getElementById('im-list'); if (el) { el.outerHTML = itemMasterListHtml(); setTimeout(function () { attachExcelHeaderFilters($('m-body') || document); }, 0); } }
function itemMasterListHtml() {
  const q = imState.q.toLowerCase().trim();
  let rows = db.masters.items.slice();
  if (q) rows = rows.filter(it => (it.name + ' ' + it.code + ' ' + (it.category || '') + ' ' + (it.hsn || '')).toLowerCase().includes(q));
  rows.sort((a, b) => String(b.code || b.id || '').localeCompare(String(a.code || a.id || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const pg = slicePage(rows, imState);
  if (!pg.total) return '<div id="im-list" class="panel empty"><div class="big">📦</div><p>No items found.</p></div>';
  return '<div id="im-list"><div class="table-wrap"><table class="recent"><thead><tr><th class="srcol">Sr. No.</th><th>Image</th><th>Item</th><th>ID</th><th>Category</th><th>Classification</th><th>UOM</th><th>HSN</th><th class="num">GST %</th><th>Status</th><th class="num no-print">Actions</th></tr></thead><tbody data-sr-start="' + pg.from + '">' +
    pg.rows.map((it, i) =>
      '<tr>' +
      '<td class="srcol">' + (pg.from + i) + '</td>' +
      '<td class="im-image-col">' + (it.image ? '<button type="button" class="im-list-image" title="View image" onclick="event.stopPropagation();viewItemImage(\'' + it.id + '\')"><img src="' + it.image + '" alt="' + esc(it.name) + '"></button>' : '<span class="im-no-image">—</span>') + '</td>' +
      '<td><b>' + esc(it.name) + '</b>' + (it.colorName ? '<div class="sub-line">🎨 ' + esc(it.colorName) + '</div>' : '') + '</td>' +
      '<td>' + esc(it.code) + '</td>' +
      '<td>' + esc(it.category || '—') + '</td>' +
      '<td>' + esc(it.classification || '—') + '</td>' +
      '<td>' + esc(it.unit || '—') + '</td>' +
      '<td>' + esc(it.hsn || '—') + '</td>' +
      '<td class="num">' + ((it.gst !== '' && it.gst != null) ? fmtNum(it.gst) + '%' : '—') + '</td>' +
      '<td onclick="event.stopPropagation()"><button type="button" class="sw master-status-sw' + (it.active !== false ? ' on' : '') + '" onclick="toggleItemRecordStatus(\'' + it.id + '\')"><span class="sw-knob"></span></button> <span class="master-status-label ' + (it.active !== false ? 'on">Active' : 'off">Inactive') + '</span></td>' +
      '<td class="actions-cell no-print">' +
      '<button class="btn-icon" title="Edit" onclick="editItemMaster(\'' + it.id + '\')">' + ic('pencil', 15) + '</button>' +
      ((itemUsedIn(it.name).length)
        ? '<button class="btn-icon" disabled title="Cannot delete — used in ' + esc(itemUsedIn(it.name).join(', ')) + '">' + ic('lock', 15) + '</button>'
        : '<button class="btn-icon danger" title="Delete" onclick="deleteItemMasterRow(\'' + it.id + '\')">' + ic('trash', 15) + '</button>') +
      '</td>' +
      '</tr>'
    ).join('') + '</tbody></table></div>' + pagerBar(pg, 'item', 'items') + '</div>';
}
function closeItemImageViewer() { const el = $('itemImageViewer'); if (el) el.remove(); }
function viewItemImage(id) { const it = (db.masters.items || []).find(function (x) { return x.id === id; }); if (!it || !it.image) return; closeItemImageViewer(); const el = document.createElement('div'); el.id = 'itemImageViewer'; el.className = 'item-image-viewer'; el.innerHTML = '<div class="item-image-viewer-card" onclick="event.stopPropagation()"><div class="item-image-viewer-head"><b>' + esc(it.name) + (it.code ? ' · ' + esc(it.code) : '') + '</b><button class="btn-icon" onclick="closeItemImageViewer()">' + ic('x', 16) + '</button></div><div class="item-image-viewer-body"><img src="' + it.image + '" alt="' + esc(it.name) + '"></div></div>'; el.onclick = closeItemImageViewer; document.body.appendChild(el); }
function toggleItemRecordStatus(id) { const it = db.masters.items.find(function (x) { return x.id === id; }); if (!it) return; const old = it.active !== false; it.active = !old; saveDB(); toast(it.name + ' marked ' + (it.active ? 'Active' : 'Inactive'), 'green'); if (cur === 'masters') renderMasters(); else renderItemMaster(); }
function editItemMaster(id) {
  if (cur === 'masters' && mTab === 'items') { openItemMasterPopup(id); return; }
  imEditId = id; renderItemMaster(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelEditItem() { imEditId = null; renderItemMaster(); }
function deleteItemMasterRow(id) {
  const it = db.masters.items.find(i => i.id === id); if (!it) return;
  // v5: deletion is allowed even when the item is in use. The confirmation
  // dialog still shows a warning so the user knows downstream entries will
  // have a dangling reference.
  const used = itemUsedIn(it.name);
  const warnNote = used.length
    ? '<div style="background:#fff5ea;border-left:4px solid #ffb800;color:#5e4200"><b>Item in use:</b> ' + esc(used.join(', ')) + ' reference this item and will have a dangling reference after deletion.</div>'
    : '';
  confirmDelete({ kind: 'item', name: it.name + (it.code ? ' (' + it.code + ')' : ''), bodyHtml: warnNote, confirmText: 'Delete permanently' }, function () {
    db.masters.items = db.masters.items.filter(i => i.id !== id);
    if (imEditId === id) imEditId = null;
    saveDB(); toast('Item removed');
    if (cur === 'masters' && mTab === 'items') renderMasters(); else renderItemMaster();
  });
}
function itemMasterFormHtml(it, popup) {
  it = it || {};
  return '<div class="sec">' + (it.id ? 'Edit Item — ' + esc(it.name) : 'New Item') + '</div>' +
    '<div class="grid-auto im-equal-grid">' +
    field('Category *', cbox('im-category', { opts: db.masters.categories, value: it.category || '', f: 'category', placeholder: 'Select Category', addMaster: 'categories', addText: 'Item Categories', free: true, onSet: function (v) { imCategoryChanged(v); } })) +
    field('Classification *', cbox('im-classification', { opts: childValues('classifications', it.category), value: it.classification || '', f: 'classification', placeholder: '-Classification-', addMaster: 'classifications', addText: 'Classifications', free: true })) +
    field('Item Name *', '<input class="inp" id="im-name" value="' + esc(it.name || '') + '" placeholder="Item name">') +
    field('Quality', cbox('im-quality', { opts: db.masters.qualities, value: it.quality || '', f: 'quality', placeholder: '--Quality--', addMaster: 'qualities', addText: 'Quality Grades', free: true })) +

    field('Description / Count Construction', '<input class="inp" id="im-desc" value="' + esc(it.description || '') + '" placeholder="e.g. 30s combed cotton">') +
    field('UOM *', cbox('im-uom', { opts: db.masters.uoms, value: it.unit || '', f: 'unit', placeholder: '--UOM--', addMaster: 'uoms', addText: 'UOM', free: false })) +
    field('Width / Dimensions', '<input class="inp" id="im-width" value="' + esc(it.width || '') + '" placeholder="e.g. 44 inch">') +
    field('HSN Code *', '<input class="inp" id="im-hsn" data-numeric maxlength="8" value="' + esc(it.hsn || '') + '" placeholder="e.g. 52081290" inputmode="numeric">') +
    field('GST % *', cbox('im-gst-cb', { opts: db.masters.gstRates, value: (it.gst === '' || it.gst == null) ? '' : String(it.gst), f: 'gst', placeholder: '--GST %--', addMaster: 'gstRates', addText: 'GST %', free: false })) +

    field('Item Image', '<div class="img-upload-row"><label class="btn btn-ghost btn-sm file-btn">Choose file<input type="file" accept="image/*" id="im-image-file" onchange="onItemImageFile(this)"></label><span id="im-image-name" class="sub-line">' + (it.image ? 'Image attached' : 'No file chosen') + '</span>' + (it.image ? '<img src="' + it.image + '" id="im-image-preview" class="im-thumb-lg">' : '<img id="im-image-preview" class="im-thumb-lg" style="display:none">') + '<button type="button" class="btn-icon danger" id="im-image-delete" title="Delete image" onclick="clearItemImage()" style="' + (it.image ? 'display:inline-flex' : 'display:none') + '">' + ic('trash', 14) + '</button></div>') +
    '</div>' +
    (popup ? '' : '<div style="margin-top:8px;display:flex;gap:10px">' +
      '<button class="btn btn-primary" onclick="saveItemMasterForm()">💾 ' + (it.id ? 'Update Item' : 'Submit') + '</button>' +
      (it.id ? '<button class="btn btn-ghost" onclick="cancelEditItem()">Cancel Edit</button>' : '') +
      '</div>');
}
let imImageData = '';
function toggleItemActive() {
  const val = $('im-active-value'), sw = $('im-active-switch'), lab = $('im-active-label');
  if (!val || !sw) return;
  const on = val.value !== '1';
  val.value = on ? '1' : '0';
  sw.classList.toggle('on', on);
  sw.setAttribute('aria-pressed', String(on));
  if (lab) lab.textContent = on ? 'Active' : 'Inactive';
}
function clearItemImage() { imImageData = ''; const prev = $('im-image-preview'), name = $('im-image-name'), del = $('im-image-delete'), file = $('im-image-file'); if (prev) { prev.removeAttribute('src'); prev.style.display = 'none'; } if (name) name.textContent = 'No file chosen'; if (del) del.style.display = 'none'; if (file) file.value = ''; toast('Item image removed — save the Item to apply', 'green'); }
function onItemImageFile(inp) {
  const f = inp.files && inp.files[0]; if (!f) return;
  $('im-image-name').textContent = f.name;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const max = 500; let w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      imImageData = cv.toDataURL('image/jpeg', 0.8);
      const prev = $('im-image-preview'); if (prev) { prev.src = imImageData; prev.style.display = 'inline-block'; } const del = $('im-image-delete'); if (del) del.style.display = 'inline-flex';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(f);
}
function afterRenderItemForm() {
  imImageData = imEditId ? ((db.masters.items.find(i => i.id === imEditId) || {}).image || '') : '';
}
function imCategoryChanged(cat) {
  const c = CBOX['im-classification']; if (!c) return;
  c.opts = childValues('classifications', cat).map(function (v) { return normalizeOpt(v, 'classifications'); });
  c.val = ''; c.typed = false;
  const inp = qs('[data-cb-input="im-classification"]'); if (inp) inp.value = '';
  renderCboxList('im-classification');
}
function saveItemMasterForm() {
  clearReqMarks();
  if (!cboxGet('im-category')) return reqBad('im-category', 'Category is required');
  if (!cboxGet('im-classification')) return reqBad('im-classification', 'Classification is required');
  const name = ($('im-name').value || '').trim();
  if (!name) return reqBad('im-name', 'Item Name is required');
  if (!cboxGet('im-uom')) return reqBad('im-uom', 'UOM is required');
  const hsn = (($('im-hsn') || {}).value || '').trim();
  if (!hsn) return reqBad('im-hsn', 'HSN Code is required');
  if (!/^\d+$/.test(hsn)) return reqBad('im-hsn', 'HSN Code must be numbers only');
  if (!cboxGet('im-gst-cb') && cboxGet('im-gst-cb') !== '0') return reqBad('im-gst-cb', 'GST % is required');
  const prev = imEditId ? (db.masters.items.find(i => i.id === imEditId) || {}) : {};
  const activeEl = $('im-active-value');
  const activeVal = activeEl ? activeEl.value : (prev.active === false ? '0' : '1');
  const gst = pf(cboxGet('im-gst-cb'));
  const data = {
    name, category: cboxGet('im-category'), classification: cboxGet('im-classification'),
    materialType: prev.materialType || '',
    quality: cboxGet('im-quality'), description: $('im-desc').value.trim(),
    unit: cboxGet('im-uom'), width: $('im-width').value.trim(), hsn: $('im-hsn').value.trim(),
    gst: gst, image: imImageData,
    active: activeVal === '1',
    /* retired fields — preserved so existing records / exports stay intact */
    hasColor: !!prev.hasColor, sizes: Array.isArray(prev.sizes) ? prev.sizes.slice() : [],
    colorName: prev.colorName || '', moq: prev.moq ?? '',
    itemRate: prev.itemRate ?? '', itemMRP: prev.itemMRP ?? '',
    cgst: prev.cgst ?? '', sgst: prev.sgst ?? '', igst: prev.igst ?? '',
    purchaseRate: prev.purchaseRate ?? '', saleRate: prev.saleRate ?? ''
  };
  const nameClash = db.masters.items.some(function (i) { return i.id !== imEditId && String(i.name).toLowerCase() === name.toLowerCase(); });
  if (nameClash) return reqBad('im-name', '\u201c' + name + '\u201d already exists in Item Master \u2014 duplicate names are not allowed');
  if (imEditId) {
    const ex = db.masters.items.find(i => i.id === imEditId);
    if (!ex.code) { db.seq.item = (db.seq.item || 0) + 1; ex.code = 'ITM-' + String(db.seq.item).padStart(4, '0'); }
    Object.assign(ex, data);
    saveDB(); toast('Item updated — ' + name, 'green'); imEditId = null;
    if (MASTER_RECORD_POPUP === 'item') { MASTER_RECORD_POPUP = ''; refreshMasterRecords('item'); } else renderItemMaster();
  } else {
    db.seq.item = (db.seq.item || 0) + 1;
    data.id = uid(); data.code = 'ITM-' + String(db.seq.item).padStart(4, '0');
    db.masters.items.push(data);
    saveDB(); toast('Item added — ' + name, 'green');
    if (MASTER_RECORD_POPUP === 'item') { MASTER_RECORD_POPUP = ''; refreshMasterRecords('item'); } else renderItemMaster();
  }
}
function exportItemsCSV() {
  if (!db.masters.items.length) return toast('Nothing to export', 'red');
  const cols = ['code', 'name', 'category', 'classification', 'quality', 'unit', 'width', 'hsn', 'gst', 'active'];
  const header = cols.join(',');
  const lines = db.masters.items.map(it => cols.map(c => csvEsc(String(it[c] ?? ''))).join(','));
  const csv = header + '\n' + lines.join('\n');
  try {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'items_' + today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast('CSV exported — ' + db.masters.items.length + ' items', 'green');
  } catch (e) { toast('Download blocked in preview — open the file in a browser to export'); }
}

