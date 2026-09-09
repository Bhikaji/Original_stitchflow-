<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';
require_once __DIR__ . '/../api/lib/persist.php';
require_once __DIR__ . '/../api/lib/validate.php';

$assembled = assemble_db();
echo "Assembled PO count: " . count($assembled['po']) . "\n";

// Add test PO
$testPoNo = 'PO-TEST-' . time();
$party = $assembled['masters']['parties'][0] ?? null;
$item = $assembled['masters']['items'][0] ?? null;

$supplierName = $party ? ($party['shortName'] ?: $party['legalName']) : 'KEN ENTERPRISES';
$supplierId = $party ? ($party['code'] ?: $party['id']) : 'SUP-0004';
$itemName = $item ? $item['name'] : 'Single Jersey Cotton 180 GSM';
$itemId = $item ? ($item['code'] ?: $item['id']) : 'ITM-0001';

$newPo = [
    'id' => 'test_' . uniqid(),
    'no' => $testPoNo,
    'date' => date('Y-m-d'),
    'supplier' => $supplierName,
    'supplier_id' => $supplierId,
    'supplierGst' => '',
    'shipTo' => 'Factory Unit 1',
    'paymentTerms' => 'Net 30',
    'pay_terms_id' => 'PAY-0001',
    'transportMode' => 'Road',
    'classification' => 'Raw Material',
    'poType' => 'Fabric',
    'status' => 'Draft',
    'items' => [
        [
            'id' => 'item_' . uniqid(),
            'name' => $itemName,
            'item_id' => $itemId,
            'color' => 'Black',
            'qty' => 100,
            'rate' => 250,
            'unit' => 'MTR',
            'unit_id' => 'UOM-0001',
            'amount' => 25000,
            'gst' => 5
        ]
    ]
];

$assembled['po'][] = $newPo;

// Persist
try {
    $written = persist_db($assembled, 'TestRunner');
    echo "[SUCCESS] persist_db executed!\n";
    
    // Verify row in MySQL
    $stmt = sf_pdo()->prepare("SELECT po_no, supplier, supplier_id, pay_terms, pay_terms_id FROM purchase_orders WHERE po_no = ?");
    $stmt->execute([$testPoNo]);
    echo "Saved row from purchase_orders:\n";
    print_r($stmt->fetch());

    // Verify item row
    $stmtItem = sf_pdo()->prepare("SELECT poi.name, poi.item_id, poi.color, poi.color_id, poi.unit, poi.unit_id 
                                   FROM purchase_order_items poi 
                                   JOIN purchase_orders po ON po.id = poi.po_id 
                                   WHERE po.po_no = ?");
    $stmtItem->execute([$testPoNo]);
    echo "Saved item row from purchase_order_items:\n";
    print_r($stmtItem->fetchAll());

    // Clean up
    sf_pdo()->prepare("DELETE FROM purchase_orders WHERE po_no = ?")->execute([$testPoNo]);
    echo "[CLEANUP DONE]\n";
} catch (Throwable $e) {
    echo "[ERROR] " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}
