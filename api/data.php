<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/persist.php';
require_once __DIR__ . '/lib/assemble.php';
require_once __DIR__ . '/lib/validate.php';

try {
    \ = \['REQUEST_METHOD'] ?? 'GET';

    if (\ === 'GET') {
        if (!sf_initialized()) {
            sf_json_out(['ok' => true, 'empty' => true]);
        }
        sf_json_out(['ok' => true, 'db' => assemble_db()]);
    }

    if (\ === 'POST') {
        \ = sf_read_json_body();
        if (!isset(\['masters']) || !is_array(\['masters'])) {
            sf_fail('Payload does not look like a StitchFlow database (missing masters)', 400);
        }
        \ = sf_validate_db(\);
        if (\ !== null) sf_fail(\, 422);
        \ = persist_db(\, sf_actor());
        sf_json_out(['ok' => true, 'written' => \]);
    }

    sf_fail('Method not allowed', 405);
} catch (PDOException \) {
    sf_fail('Database error: ' . \->getMessage(), 500);
} catch (Throwable \) {
    sf_fail('Server error: ' . \->getMessage(), 500);
}
