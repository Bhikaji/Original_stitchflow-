<?php
/* =====================================================================
   StitchFlow ERP — Lightweight Production Health Check Endpoint
   Used for uptime monitoring, load balancer health checks, and cPanel monitors.
   HTTP 200 = Service Healthy
   HTTP 503 = Service Degraded / Database Down
   ===================================================================== */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Content-Type-Options: nosniff');

$startTime = microtime(true);
$checks = [
    'php'      => 'OK',
    'database' => 'UNKNOWN',
    'storage'  => 'OK'
];
$healthy = true;
$dbLatencyMs = 0;

try {
    require_once __DIR__ . '/bootstrap.php';
    $t0 = microtime(true);
    $pdo = sf_pdo();
    $st = $pdo->query('SELECT 1');
    if ($st && $st->fetchColumn() === 1) {
        $checks['database'] = 'OK';
        $dbLatencyMs = round((microtime(true) - $t0) * 1000, 2);
    } else {
        $checks['database'] = 'FAIL';
        $healthy = false;
    }
} catch (Throwable $e) {
    error_log('Health check database error: ' . $e->getMessage());
    $checks['database'] = 'FAIL';
    $healthy = false;
}

// Storage check
$storageDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage';
if (!is_dir($storageDir) || !is_writable($storageDir)) {
    $checks['storage'] = 'DEGRADED';
}

$httpCode = $healthy ? 200 : 503;
http_response_code($httpCode);

echo json_encode([
    'status'      => $healthy ? 'UP' : 'DOWN',
    'timestamp'   => time(),
    'php_version' => PHP_VERSION,
    'checks'      => $checks,
    'db_latency'  => $dbLatencyMs . 'ms',
    'total_time'  => round((microtime(true) - $startTime) * 1000, 2) . 'ms'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
