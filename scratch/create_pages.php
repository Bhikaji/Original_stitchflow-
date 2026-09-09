<?php
$modules = [
    [
        'file' => 'dashboard.php',
        'key' => 'dashboard',
        'title' => 'Dashboard — Production & Sales Overview | KEND2C',
        'heading' => 'Dashboard',
        'sub' => 'Production &amp; sales overview'
    ],
    [
        'file' => 'po.php',
        'key' => 'po',
        'title' => 'Purchase Orders (PO) | KEND2C',
        'heading' => 'PO',
        'sub' => 'Purchase orders for fabric, trims &amp; packaging'
    ],
    [
        'file' => 'materialinward.php',
        'key' => 'inward',
        'title' => 'Material Inward (GRN) | KEND2C',
        'heading' => 'Inward',
        'sub' => 'Raw material receipt against PO (fabric &amp; trims in)'
    ],
    [
        'file' => 'inward.php',
        'key' => 'inward',
        'title' => 'Material Inward (GRN) | KEND2C',
        'heading' => 'Inward',
        'sub' => 'Raw material receipt against PO (fabric &amp; trims in)'
    ],
    [
        'file' => 'jobwork.php',
        'key' => 'jobwork',
        'title' => 'Job Work — Issue & FG Receipt | KEND2C',
        'heading' => 'Job Work',
        'sub' => 'Material issues to job-worker vendor; finished goods received'
    ],
    [
        'file' => 'processoutward.php',
        'key' => 'processoutward',
        'title' => 'Process PO / Outward | KEND2C',
        'heading' => 'Process PO / Outward',
        'sub' => 'Send style and size-wise garment quantities for embroidery, washing or printing'
    ],
    [
        'file' => 'processinward.php',
        'key' => 'processinward',
        'title' => 'Process Inward | KEND2C',
        'heading' => 'Process Inward',
        'sub' => 'Receive processed garments partially against a Process Outward'
    ],
    [
        'file' => 'sample.php',
        'key' => 'sample',
        'title' => 'Sample Development | KEND2C',
        'heading' => 'Sample',
        'sub' => 'Sample development — styles with size-wise qty; samples received back'
    ],
    [
        'file' => 'sale.php',
        'key' => 'sale',
        'title' => 'Sales Entries — D2C & B2B | KEND2C',
        'heading' => 'Sale',
        'sub' => 'Sales entries — Myntra D2C &amp; others'
    ],
    [
        'file' => 'costing.php',
        'key' => 'costing',
        'title' => 'Buyer Order Costing | KEND2C',
        'heading' => 'Costing',
        'sub' => 'Buyer order costing — fabric, trims, CM, FOB &amp; margin'
    ],
    [
        'file' => 'purchasereturn.php',
        'key' => 'purchasereturn',
        'title' => 'Purchase Return to Supplier | KEND2C',
        'heading' => 'Purchase Return',
        'sub' => 'Return rejected or excess material back to the supplier against a PO'
    ],
    [
        'file' => 'jobworkreturn.php',
        'key' => 'jobworkreturn',
        'title' => 'Job Work Material Return | KEND2C',
        'heading' => 'Job Work Return',
        'sub' => 'Material returned by the job worker back to our warehouse'
    ],
    [
        'file' => 'styles.php',
        'key' => 'styles',
        'title' => 'Style Master | KEND2C',
        'heading' => 'Style Master',
        'sub' => 'Style master with buyer, SKU and size references'
    ],
    [
        'file' => 'itemmaster.php',
        'key' => 'itemmaster',
        'title' => 'Item Master — SKUs & Pricing | KEND2C',
        'heading' => 'Item Master',
        'sub' => 'Detailed item / SKU master — pricing, GST, sizes &amp; images'
    ],
    [
        'file' => 'parties.php',
        'key' => 'parties',
        'title' => 'Vendor & Party Onboarding | KEND2C',
        'heading' => 'Vendor onboarding',
        'sub' => 'Onboarding master — legal entity, tax IDs, address &amp; business type'
    ],
    [
        'file' => 'partneronboarding.php',
        'key' => 'partneronboarding',
        'title' => 'Partner Onboarding (GST Auto-Fetch) | KEND2C',
        'heading' => 'Vendor onboarding',
        'sub' => 'Onboard buyer and vendor accounts with GSTIN auto-fetch, brands and contacts'
    ],
    [
        'file' => 'gstapi.php',
        'key' => 'gstapi',
        'title' => 'GST API Connection | KEND2C',
        'heading' => 'GST API connection',
        'sub' => 'Configure third-party GST provider and auto-fetch taxpayer data'
    ],
    [
        'file' => 'reports.php',
        'key' => 'reports',
        'title' => 'Production & Stock Reports | KEND2C',
        'heading' => 'Reports',
        'sub' => 'GRN, issues, WIP, FG received &amp; stock reports with date range'
    ],
    [
        'file' => 'reporting.php',
        'key' => 'reporting',
        'title' => 'Custom Pivot Reporting | KEND2C',
        'heading' => 'Reporting',
        'sub' => 'Custom pivot reporting with configurable breakdowns, metrics and filters'
    ],
    [
        'file' => 'audittrail.php',
        'key' => 'audit',
        'title' => 'System Audit Trail | KEND2C',
        'heading' => 'Audit Trail',
        'sub' => 'Trace who changed what and when across modules and masters'
    ],
    [
        'file' => 'usermanagement.php',
        'key' => 'usermanagement',
        'title' => 'User Management & Permissions | KEND2C',
        'heading' => 'User Management',
        'sub' => 'Users, roles and module-level access control'
    ],
    [
        'file' => 'masters.php',
        'key' => 'masters',
        'title' => 'System Masters | KEND2C',
        'heading' => 'Masters',
        'sub' => 'Style master, sizes, suppliers, customers &amp; locations'
    ]
];

$pagesDir = __DIR__ . '/../pages';
if (!is_dir($pagesDir)) {
    mkdir($pagesDir, 0777, true);
}

foreach ($modules as $m) {
    $code = "<?php\n"
          . "\$module = '" . $m['key'] . "';\n"
          . "\$pageTitle = '" . addslashes($m['title']) . "';\n"
          . "\$pageHeading = '" . addslashes($m['heading']) . "';\n"
          . "\$pageSub = '" . addslashes($m['sub']) . "';\n"
          . "\$basePath = isset(\$basePath) ? \$basePath : '../';\n"
          . "require_once __DIR__ . '/../includes/header.php';\n"
          . "require_once __DIR__ . '/../includes/sidebar.php';\n"
          . "?>\n"
          . "<main class=\"main\">\n"
          . "  <div class=\"topbar\">\n"
          . "    <div>\n"
          . "      <h2 id=\"tb-title\"><?= htmlspecialchars(\$pageHeading) ?></h2>\n"
          . "      <div class=\"sub\" id=\"tb-sub\"><?= \$pageSub ?></div>\n"
          . "    </div>\n"
          . "    <div class=\"spacer\"></div>\n"
          . "    <div class=\"actions\" id=\"tb-actions\"></div>\n"
          . "  </div>\n"
          . "  <div class=\"msgbox\" id=\"msgBox\">\n"
          . "    <div class=\"js-err\" id=\"jsErr\"></div>\n"
          . "    <div class=\"load-msg\" id=\"loadMsg\"><div class=\"spin\"></div> Loading KEND2C…</div>\n"
          . "  </div>\n"
          . "  <div class=\"content\" id=\"content\"></div>\n"
          . "</main>\n"
          . "<script>\n"
          . "window.__INITIAL_PAGE__ = '<?= \$module ?>';\n"
          . "</script>\n"
          . "<?php\n"
          . "require_once __DIR__ . '/../includes/footer.php';\n";

    file_put_contents($pagesDir . '/' . $m['file'], $code);
    echo "Created pages/" . $m['file'] . "\n";
}
echo "All pages created successfully.\n";
