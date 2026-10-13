<?php
/* =====================================================================
   StitchFlow ERP — users endpoint (kept for compatibility with the
   original front-end which posts {users:[…]} on every save).
   GET  → current users (assembled from users/user_modules/user_permissions)
   POST → validate + persist just the users collection
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/persist.php';
require_once __DIR__ . '/lib/assemble.php';
require_once __DIR__ . '/lib/validate.php';

try {
    $currentUser = sf_require_auth();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $pdo = sf_pdo();

    if ($method === 'GET') {
        sf_require_role(['Admin']);
        sf_json_out(['ok' => true, 'users' => assemble_users($pdo)]);
    }

    if ($method === 'POST') {
        if (PHP_SAPI !== 'cli' && !sf_verify_csrf()) {
            sf_fail('Security validation failed: Invalid or missing CSRF token.', 403);
        }
        sf_require_role(['Admin']);
        $body = sf_read_json_body();
        $users = is_array($body['users'] ?? null) ? $body['users'] : null;
        if ($users === null) sf_fail('Expected {"users": [...]}', 400);
        $err = sf_v_users(['users' => $users]);
        if ($err !== null) sf_fail($err, 422);
        $deletedUsers = is_array($body['_deleted']['users'] ?? null) ? $body['_deleted']['users'] : null;
        $pdo->beginTransaction();
        try {
            persist_users($pdo, $users, $deletedUsers);
            sf_kv_set($pdo, 'hash:users', md5(json_encode($users, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)));
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
