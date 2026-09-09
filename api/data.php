<?php
/* =====================================================================
   StitchFlow ERP — main data endpoint
   GET  → assemble the complete application db from MySQL
   POST → validate (server-side business rules) and persist the db into
          the normalized tables
   The front-end (original StitchFlow_QA_Fixed_v5 UI, unchanged) talks
   to this endpoint through the server-sync layer.
   ===================================================================== */
//   echo "hii";exit;
 
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
        $db = sf_read_json_body();
        if (!isset($db['masters']) || !is_array($db['masters'])) {
            sf_fail('Payload does not look like a StitchFlow database (missing masters)', 400);
        }
        $err = sf_validate_db($db);
        if ($err !== null) sf_fail($err, 422);
        $written = persist_db($db, sf_actor());
        sf_json_out(['ok' => true, 'written' => $written]);
    }

    sf_fail('Method not allowed', 405);
} catch (PDOException $e) {
    sf_fail('Database error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    sf_fail('Server error: ' . $e->getMessage(), 500);
}
