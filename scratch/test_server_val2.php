<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';
require_once __DIR__ . '/../api/lib/validate.php';

$db = assemble_db();

// Test 1: Valid outward of 5 pcs against JW-0001 (which has 5 pcs ordered)
$db['processoutward'] = [
    [
        'id' => 'test_out_1',
        'no' => 'PRT-00001',
        'date' => '2026-09-08',
        'jwRef' => 'JW-0001',
        'processType' => 'Embroidery',
        'processor' => 'KEN GLOBAL',
        'status' => 'Open',
        'items' => [
            [
                'style' => 'CS-1000',
                'sizes' => ['S' => 5],
                'qty' => 5,
                'rate' => 5
            ]
        ]
    ]
];
$err1 = sf_validate_db($db);
echo "Test 1 (5 pcs, valid): " . ($err1 === null ? "[PASS]" : "[FAIL]: " . $err1) . "\n";

// Test 2: Invalid outward of 10 pcs against JW-0001 (exceeds 5 pcs)
$db['processoutward'][0]['items'][0]['qty'] = 10;
$err2 = sf_validate_db($db);
echo "Test 2 (10 pcs, exceeds): " . ($err2 !== null ? "[PASS] Caught: " . $err2 : "[FAIL] Allowed invalid qty") . "\n";
