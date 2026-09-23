<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/persist.php';
require_once __DIR__ . '/lib/assemble.php';
require_once __DIR__ . '/lib/validate.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        if (!sf_initialized()) {
            sf_json_out(['ok' => true, 'empty' => true]);
        }
        sf_json_out(['ok' => true, 'db' => assemble_db()]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        file_put_contents(__DIR__ . '/../scratch/post_debug.log', date('Y-m-d H:i:s') . " POST received. Length: " . strlen($raw) . "\n", FILE_APPEND);
        if ($raw === false || $raw === '') {
            file_put_contents(__DIR__ . '/../scratch/post_debug.log', date('Y-m-d H:i:s') . " Error: Empty request body\n", FILE_APPEND);
        }
        $db = json_decode($raw, true);
        if (!isset($db['masters']) || !is_array($db['masters'])) {
            file_put_contents(__DIR__ . '/../scratch/post_debug.log', date('Y-m-d H:i:s') . " Error: Missing masters\n", FILE_APPEND);
            sf_fail('Payload does not look like a StitchFlow database (missing masters)', 400);
        }
        $err = sf_validate_db($db);
        if ($err !== null) {
            file_put_contents(__DIR__ . '/../scratch/post_debug.log', date('Y-m-d H:i:s') . " Validation Error: $err\n", FILE_APPEND);
            sf_fail($err, 422);
        }
        try {
            $written = persist_db($db, sf_actor());
            file_put_contents(__DIR__ . '/../scratch/post_debug.log', date('Y-m-d H:i:s') . " Success! Written: " . implode(',', $written) . "\n", FILE_APPEND);
            sf_json_out(['ok' => true, 'written' => $written]);
        } catch (Exception $e) {
            file_put_contents(__DIR__ . '/../scratch/post_debug.log', date('Y-m-d H:i:s') . " Persist Exception: " . $e->getMessage() . "\n", FILE_APPEND);
            throw $e;
        }
    }

    sf_fail('Method not allowed', 405);
} catch (PDOException $e) {
    sf_fail('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    sf_fail('Server error: ' . $e->getMessage(), 500);
}
