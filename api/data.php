<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/persist.php';
require_once __DIR__ . '/lib/assemble.php';
require_once __DIR__ . '/lib/validate.php';
require_once __DIR__ . '/lib/backup.php';

try {
    $user = sf_require_auth();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        if (isset($_GET['revision_only'])) {
            $pdo = sf_pdo();
            $rev = (int)(sf_kv_get($pdo, 'db_revision') ?: 0);
            sf_json_out(['ok' => true, 'revision' => $rev]);
        }
        if (!sf_initialized()) {
            sf_json_out(['ok' => true, 'empty' => true]);
        }
        sf_json_out(['ok' => true, 'db' => assemble_db()]);
    }

    if ($method === 'POST') {
        if (PHP_SAPI !== 'cli' && !sf_verify_csrf()) {
            sf_fail('Security validation failed: Invalid or missing CSRF token.', 403);
        }
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            sf_fail('Empty request body', 400);
        }
        $db = json_decode($raw, true);
        if (!isset($db['masters']) || !is_array($db['masters'])) {
            sf_fail('Payload does not look like a StitchFlow database (missing masters)', 400);
        }
        $err = sf_validate_db($db);
        if ($err !== null) {
            sf_fail($err, 422);
        }
        // Auto-backup snapshot once a day before processing saves
        sf_auto_backup_daily();

        try {
            $written = persist_db($db, sf_actor());
            $rev = (int)(sf_kv_get(sf_pdo(), 'db_revision') ?: 0);
            sf_json_out(['ok' => true, 'written' => $written, 'revision' => $rev]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    sf_fail('Method not allowed', 405);
} catch (PDOException $e) {
    error_log('StitchFlow Database error: ' . $e->getMessage());
    sf_fail('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    if (strpos($e->getMessage(), 'Access denied') !== false || strpos($e->getMessage(), 'Security block') !== false) {
        sf_fail($e->getMessage(), 403);
    }
    error_log('StitchFlow Server error: ' . $e->getMessage());
    sf_fail('Server error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine(), 500);
}
