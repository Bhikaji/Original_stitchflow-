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
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $pdo = sf_pdo();

    if ($method === 'GET') {
        sf_json_out(['ok' => true, 'users' => assemble_users($pdo)]);
    }

    if ($method === 'POST') {
        $body = sf_read_json_body();
        $users = is_array($body['users'] ?? null) ? $body['users'] : null;
        if ($users === null) sf_fail('Expected {"users": [...]}', 400);
        $err = sf_v_users(['users' => $users]);
        if ($err !== null) sf_fail($err, 422);
        $pdo->beginTransaction();
        try {
            persist_users($pdo, $users);
            sf_kv_set($pdo, 'hash:users', md5(json_encode($users, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)));
            $pdo->commit();
        } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
        sf_json_out(['ok' => true]);
    }

    sf_fail('Method not allowed', 405);
} catch (PDOException $e) {
    sf_fail('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    sf_fail('Server error: ' . $e->getMessage(), 500);
}
