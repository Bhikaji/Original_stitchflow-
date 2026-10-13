<?php
/* =====================================================================
   StitchFlow ERP — masters endpoint (kept for compatibility with the
   original front-end which posts {masters:{…}} on every save).
   GET  → all masters assembled from the normalized master tables
   POST → validate + persist just the masters branch
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/persist.php';
require_once __DIR__ . '/lib/assemble.php';
require_once __DIR__ . '/lib/validate.php';

try {
    $user = sf_require_auth();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $pdo = sf_pdo();

    if ($method === 'GET') {
        sf_json_out(['ok' => true, 'masters' => assemble_masters($pdo)]);
    }

    if ($method === 'POST') {
        if (PHP_SAPI !== 'cli' && !sf_verify_csrf()) {
            sf_fail('Security validation failed: Invalid or missing CSRF token.', 403);
        }
        $currentUser = sf_current_user();
        if ($currentUser !== null && ($currentUser['role'] ?? '') !== 'Admin') {
            if (!sf_user_can('masters', '*', 'edit') && !sf_user_can('masters', '*', 'create')) {
                sf_fail('Access denied: You do not have permission to modify masters.', 403);
            }
        }
        $body = sf_read_json_body();
        $masters = is_array($body['masters'] ?? null) ? $body['masters'] : null;
        if ($masters === null) sf_fail('Expected {"masters": {...}}', 400);
        $fake = ['masters' => $masters];
        foreach (['sf_v_masters', 'sf_v_items', 'sf_v_parties', 'sf_v_styles'] as $fn) {
            $err = $fn($fake);
            if ($err !== null) sf_fail($err, 422);
        }
        $allDeleted = is_array($body['_deleted'] ?? null) ? $body['_deleted'] : [];
        $actor = sf_actor();
        $pdo->beginTransaction();
        try {
            persist_list_masters($pdo, $masters, $actor, is_array($allDeleted['masters'] ?? null) ? $allDeleted['masters'] : null);
            if (array_key_exists('styles', $masters)) persist_styles($pdo, is_array($masters['styles']) ? $masters['styles'] : [], $actor, is_array($allDeleted['styles'] ?? null) ? $allDeleted['styles'] : null);
            if (array_key_exists('items', $masters)) persist_items($pdo, is_array($masters['items']) ? $masters['items'] : [], $actor, is_array($allDeleted['items'] ?? null) ? $allDeleted['items'] : null);
            if (array_key_exists('parties', $masters)) persist_parties($pdo, is_array($masters['parties']) ? $masters['parties'] : [], $actor, is_array($allDeleted['parties'] ?? null) ? $allDeleted['parties'] : null);
            if (array_key_exists('companyDetails', $masters)) persist_company($pdo, is_array($masters['companyDetails']) ? $masters['companyDetails'] : []);
            if (array_key_exists('loginSettings', $masters)) persist_login($pdo, is_array($masters['loginSettings']) ? $masters['loginSettings'] : []);
            if (array_key_exists('menuSettings', $masters)) persist_menu($pdo, is_array($masters['menuSettings']) ? $masters['menuSettings'] : []);
            /* invalidate collection hashes so the next full save rewrites cleanly */
            $pdo->exec("DELETE FROM kv_store WHERE k IN ('hash:listmasters','hash:styles','hash:items','hash:parties','hash:companyDetails','hash:loginSettings','hash:menuSettings')");
            $newRevision = (int)round(microtime(true) * 1000);
            sf_kv_set($pdo, 'db_revision', (string)$newRevision);
            $pdo->commit();
        } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
        sf_json_out(['ok' => true, 'revision' => $newRevision]);
    }

    sf_fail('Method not allowed', 405);
} catch (PDOException $e) {
    error_log('StitchFlow Database error: ' . $e->getMessage());
    sf_fail('A database error occurred. Please contact the administrator.', 500);
} catch (Throwable $e) {
    error_log('StitchFlow Server error: ' . $e->getMessage());
    sf_fail('An internal server error occurred.', 500);
}
