const fs = require('fs');
const file = 'c:\\xampp\\htdocs\\stitchflow\\assets\\js\\app-core.js';
let content = fs.readFileSync(file, 'utf8');

// Patch MODULES
content = content.replace(
  `  sale: { label: 'Sale', icon: 'cash', sub: 'Sales entries — Myntra D2C &amp; others' },
  costing: { label: 'Costing', icon: 'cash', sub: 'Buyer order costing — fabric, trims, CM, FOB &amp; margin' },`,
  `  sale: { label: 'Sale', icon: 'cash', sub: 'Sales entries — Myntra D2C &amp; others' },
  salenumbers: { label: 'Sale Numbers', icon: 'order', sub: 'Figures only — Indian grouping, whole rupees, no K / L / Cr short form' },
  saledashboard: { label: 'Sale Dashboard', icon: 'view', sub: 'Interactive marketplace analytics — click any bar, chip or chart to cross-filter' },
  costing: { label: 'Costing', icon: 'cash', sub: 'Buyer order costing — fabric, trims, CM, FOB &amp; margin' },`
);

// Patch NAV_SALE_VIEWS
if(!content.includes('const NAV_SALE_VIEWS =')) {
  content = content.replace(
    `const ORDER = ['dashboard', 'po', 'inward', 'jobwork', 'processoutward', 'processinward', 'sample', 'purchasereturn', 'sale', 'costing', 'styles', 'itemmaster', 'parties', 'partneronboarding', 'gstapi', 'reports', 'masters'];`,
    `const NAV_SALE_VIEWS = { salenumbers: 1, saledashboard: 1 };\nconst ORDER = ['dashboard', 'po', 'inward', 'jobwork', 'processoutward', 'processinward', 'sample', 'purchasereturn', 'sale', 'salenumbers', 'saledashboard', 'costing', 'styles', 'itemmaster', 'parties', 'partneronboarding', 'gstapi', 'reports', 'masters'];`
  );
}

// Patch NAV_GROUPS
content = content.replace(
  `const NAV_GROUPS = [
  { title: '', items: ['dashboard'] },
  { title: 'Operations', items: ['po', 'inward', 'jobwork', 'processoutward', 'processinward', 'sample', 'sale', 'costing'] },
  { title: 'Returns', items: ['purchasereturn'] },`,
  `const NAV_GROUPS = [
  { title: '', items: ['dashboard'] },
  { title: 'Operations', items: ['po', 'inward', 'jobwork', 'processoutward', 'processinward', 'sample', 'sale', 'salenumbers', 'saledashboard', 'costing'] },
  { title: 'Returns', items: ['purchasereturn'] },`
);

// Patch userCan
content = content.replace(
  `function userCan(m, action) {
  const u = authUser(); if (!u) return false; if (u.role === 'Admin') return true; if (m === 'usermanagement') return false; action = action || 'view';
  if (m === 'styles' && userCanMaster('styles', action)) return true;`,
  `function userCan(m, action) {
  const u = authUser(); if (!u) return false; if (u.role === 'Admin') return true; if (m === 'usermanagement') return false; action = action || 'view';
  if (typeof NAV_SALE_VIEWS !== 'undefined' && NAV_SALE_VIEWS[m]) m = 'sale';
  if (m === 'styles' && userCanMaster('styles', action)) return true;`
);

// Patch pageMap
content = content.replace(
  `    'sample': 'pages/sample.php',
    'sale': 'pages/sale.php',
    'costing': 'pages/costing.php',
    'purchasereturn': 'pages/purchasereturn.php',`,
  `    'sample': 'pages/sample.php',
    'sale': 'pages/sale.php',
    'salenumbers': 'pages/sale.php',
    'saledashboard': 'pages/sale.php',
    'costing': 'pages/costing.php',
    'purchasereturn': 'pages/purchasereturn.php',`
);

// Patch go()
content = content.replace(
  `function go(m) {
  if (!userCan(m, 'view')) return toast('Access denied for this module', 'red');
  var path = (typeof location !== 'undefined') ? String(location.pathname || '') : '';`,
  `function go(m) {
  if (!userCan(m, 'view')) return toast('Access denied for this module', 'red');
  if (m === 'salenumbers') { openSaleNumbers(); if (typeof toggleNav !== 'undefined' && isMobileNav()) toggleNav(false); return; }
  if (m === 'saledashboard') { openSaleDashboard(); if (typeof toggleNav !== 'undefined' && isMobileNav()) toggleNav(false); return; }
  var path = (typeof location !== 'undefined') ? String(location.pathname || '') : '';`
);

content = content.replace(
  `      'processoutward': 'processoutward', 'processinward': 'processinward', 'sample': 'sample',
      'sale': 'sale', 'costing': 'costing', 'purchasereturn': 'purchasereturn',`,
  `      'processoutward': 'processoutward', 'processinward': 'processinward', 'sample': 'sample',
      'sale': 'sale', 'salenumbers': 'sale', 'saledashboard': 'sale', 'costing': 'costing', 'purchasereturn': 'purchasereturn',`
);

// Patch nav() showing active state
content = content.replace(
  `    let rows = ''; entries.forEach(function (x) { const m = x.target || x.k; if (!MODULES[m]) return; const showCnt = ['po', 'jobwork', 'sample', 'processoutward'].includes(m), n = showCnt ? navOpenCount(m) : (db[m] ? db[m].length : 0), cnt = showCnt ? '<span class="cnt">' + n + '</span>' : '', active = cur === m || (m === 'masters' && (cur === 'itemmaster' || cur === 'parties' || cur === 'audit' || cur === 'usermanagement')), navLabel = x.l || menuLabel(m, MODULES[m].label); rows += '<button class="nav-item' + (active ? ' active' : '') + '" onclick="go(\\'' + m + '\\')" title="' + esc(navLabel) + '"><span class="ico">' + ic(MODULES[m].icon, 20) + '</span><span class="nl">' + esc(navLabel) + '</span>' + cnt + '</button>'; });`,
  `    let rows = ''; entries.forEach(function (x) { const m = x.target || x.k; if (!MODULES[m]) return; const showCnt = ['po', 'jobwork', 'sample', 'processoutward', 'sale'].includes(m), n = showCnt ? navOpenCount(m) : (db[m] ? db[m].length : 0), cnt = showCnt ? '<span class="cnt">' + n + '</span>' : '', active = cur === m || (pageView && pageView.kind === m) || (m === 'masters' && (cur === 'itemmaster' || cur === 'parties' || cur === 'audit' || cur === 'usermanagement')), navLabel = x.l || menuLabel(m, MODULES[m].label); rows += '<button class="nav-item' + (active ? ' active' : '') + '" onclick="go(\\'' + m + '\\')" title="' + esc(navLabel) + '"><span class="ico">' + ic(MODULES[m].icon, 20) + '</span><span class="nl">' + esc(navLabel) + '</span>' + cnt + '</button>'; });`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched app-core.js successfully.');
