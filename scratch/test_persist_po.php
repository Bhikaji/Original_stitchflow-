<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';

// Fetch existing DB
$db = assemble_db();

// Prepare a Process Outward document
$newPo = [
    'id' => 'po_' . uniqid(),
    'no' => 'EMB-00001',
    'date' => date('Y-m-d'),
    'processType' => 'Embroidery',
    'process_type_id' => 'PRT-0001',
    'processor' => 'KEN GLOBAL',
    'vendor_id' => 'PRT-0001',
    'jwRef' => 'JW-0001',
    'expectedDate' => date('Y-m-d', strtotime('+3 days')),
    'remarks' => 'Test save from E2E validation',
    'items' => [
        [
            'style' => 'CS-1000',
            'sizes' => ['S' => 5],
            'qty' => 5,
            'rate' => 5
        ]
    ],
    'status' => 'Open',
    'createdAt' => time() * 1000
];

$db['processoutward'][] = $newPo;

// POST to api/data.php
$ch = curl_init('https://kend2c.kenerp.com/api/data.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['db' => $db]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Requested-With: XMLHttpRequest'
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status: $httpCode\n";
echo "Response: $resp\n";

// Now re-assemble from MySQL to confirm it was persisted into MySQL tables
$freshDb = assemble_db();
$found = null;
foreach ($freshDb['processoutward'] as $po) {
    if ($po['no'] === 'EMB-00001') {
        $found = $po;
        break;
    }
}

if ($found) {
    echo "[SUCCESS] Process Outward EMB-00001 persisted into MySQL and re-assembled:\n";
    print_r($found);
} else {
    echo "[FAILED] Process Outward EMB-00001 not found in fresh assemble_db!\n";
}
