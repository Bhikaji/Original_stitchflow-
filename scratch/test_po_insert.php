<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';
require_once __DIR__ . '/../api/lib/persist.php';

try {
    $db = assemble_db();
    $newPo = [
        'id' => 'po_' . uniqid(),
        'no' => 'PO-TEST-' . time(),
        'date' => date('Y-m-d'),
        'status' => 'Draft',
        'items' => [
            [
                'name' => 'Fabric A',
                'qty' => 10,
                'rate' => 100
            ]
        ]
    ];
    $db['po'][] = $newPo;
    
    $written = persist_db($db, 'test_actor');
    echo "Success! Written collections: " . implode(', ', $written) . "\n";
} catch (Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
