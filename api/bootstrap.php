<?php
/* =====================================================================
   StitchFlow ERP — API bootstrap
   PDO connection + shared helpers used by the persist / assemble /
   validate layers.
   ===================================================================== */
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('memory_limit', '1024M');

function sf_config(): array {
    static $cfg = null;
    if ($cfg === null) $cfg = require dirname(__DIR__) . '/config.php';
    return $cfg;
}

function sf_ensure_schema(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $st = $pdo->query("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'item_id' LIMIT 1");
        if ($st && $st->fetch()) {
            return;
        }
    } catch (Throwable $e) {
        return;
    }
    require_once __DIR__ . '/lib/auto_migrate.php';
    sf_run_auto_migrate($pdo);
}

function sf_pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $c = sf_config()['db'];
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset={$c['charset']}";
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        sf_ensure_schema($pdo);
    }
    return $pdo;
}

function sf_json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sf_fail(string $message, int $code = 422): void {
    sf_json_out(['ok' => false, 'error' => $message], $code);
}

function sf_read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') sf_fail('Empty request body', 400);
    $data = json_decode($raw, true);
    if (!is_array($data)) sf_fail('Invalid JSON payload', 400);
    return $data;
}

/* ---------- small value helpers (mirror the JS pf()/string handling) --- */
function pf($v): float {
    if (is_numeric($v)) return (float)$v;
    if (is_string($v)) { $f = (float)str_replace(',', '', trim($v)); return is_nan($f) ? 0.0 : $f; }
    return 0.0;
}
function s($v): string { return is_scalar($v) ? trim((string)$v) : ''; }
function lc($v): string { return mb_strtolower(s($v)); }
function nz($v) { $t = s($v); return $t === '' ? null : $t; }
function nd($v) { // normalise a yyyy-mm-dd date or null
    $t = s($v);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $t) ? $t : null;
}
function ni($v) { return is_numeric($v) ? (int)$v : null; }
function b01($v): int { return ($v === false || $v === 0 || $v === '0' || $v === null) ? ($v === null ? 1 : 0) : ($v ? 1 : 0); }

/* keep only keys NOT stored in explicit columns → extra_json (lossless) */
function extra_json(array $row, array $knownKeys): ?string {
    $rest = array_diff_key($row, array_flip($knownKeys));
    if (!$rest) return null;
    return json_encode($rest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function merge_extra(array $doc, $extraJson): array {
    if (!$extraJson) return $doc;
    $extra = json_decode((string)$extraJson, true);
    if (is_array($extra)) foreach ($extra as $k => $v) if (!array_key_exists($k, $doc)) $doc[$k] = $v;
    return $doc;
}

/* current audit user (sent by the sync layer with each save) */
function sf_actor(): string {
    $h = $_SERVER['HTTP_X_STITCHFLOW_USER'] ?? '';
    $u = is_string($h) ? trim($h) : '';
    return $u !== '' ? mb_substr($u, 0, 120) : 'StitchFlow User';
}
