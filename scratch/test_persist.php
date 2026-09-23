<?php
require __DIR__ . '/../api/bootstrap.php';
require __DIR__ . '/../api/lib/persist.php';

$pdo = sf_pdo();
$actor = "TestUser";

$docs = [
    [
        'id' => 'SL-TEST-1',
        'no' => 'SL-0001',
        'date' => '2023-10-25',
        'customer' => 'Test Customer',
        'channel' => 'Flipkart',
        'payStatus' => 'Unpaid',
        'payMode' => '',
        'invoiceNo' => '',
        'notes' => 'Import note',
        'status' => 'Open',
        'createdAt' => time() * 1000,
        'source' => [
            'kind' => 'marketplace-import',
            'marketplace' => 'Flipkart',
            'program' => '',
            'batchId' => 'batch-1',
            'fileName' => 'test.xlsx',
            'rawHeaders' => ['Col1', 'Col2']
        ],
        'items' => [
            [
                'desc' => 'Test Item',
                'qty' => 1,
                'rate' => 100,
                'amount' => 100,
                'raw' => ['A', 'B']
            ]
        ]
    ]
];

try {
    $pdo->beginTransaction();
    persist_sales($pdo, $docs, $actor);
    $pdo->commit();
    echo "Success!\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
