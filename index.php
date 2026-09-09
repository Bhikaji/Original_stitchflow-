<?php
/* =====================================================================
   StitchFlow ERP — Modular Front Controller
   Routes request to specific module PHP page while maintaining
   core business logic, Polaris UI, and server-sync layer.
   ===================================================================== */
declare(strict_types=1);

$page = isset($_GET['page']) ? trim((string)$_GET['page']) : 'dashboard';
if ($page === '') {
    $page = 'dashboard';
}

$pageMap = [
    'dashboard'         => 'dashboard.php',
    'po'                => 'po.php',
    'inward'            => 'materialinward.php',
    'materialinward'    => 'materialinward.php',
    'jobwork'           => 'jobwork.php',
    'processoutward'    => 'processoutward.php',
    'processinward'     => 'processinward.php',
    'sample'            => 'sample.php',
    'sale'              => 'sale.php',
    'costing'           => 'costing.php',
    'purchasereturn'    => 'purchasereturn.php',
    'jobworkreturn'     => 'jobworkreturn.php',
    'styles'            => 'styles.php',
    'itemmaster'        => 'itemmaster.php',
    'parties'           => 'parties.php',
    'partneronboarding' => 'partneronboarding.php',
    'gstapi'            => 'gstapi.php',
    'reports'           => 'reports.php',
    'reporting'         => 'reporting.php',
    'audit'             => 'audittrail.php',
    'audittrail'        => 'audittrail.php',
    'usermanagement'    => 'usermanagement.php',
    'masters'           => 'masters.php',
];

$targetFile = $pageMap[$page] ?? 'dashboard.php';
$targetPath = __DIR__ . '/pages/' . $targetFile;

if (!is_file($targetPath)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Module page not found: " . htmlspecialchars($page);
    exit;
}

header('Cache-Control: no-store');
$basePath = './';
require $targetPath;
