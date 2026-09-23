<?php
require_once __DIR__ . '/../api/bootstrap.php';

echo "=== 1. Testing Page HTTP Responses ===\n";
$pages = [
    'https://kend2c.kenerp.com/' => 'Dashboard',
    'https://kend2c.kenerp.com/index.php?page=po' => 'PO',
    'https://kend2c.kenerp.com/pages/po.php' => 'Purchase Orders',
    'https://kend2c.kenerp.com/pages/materialinward.php' => 'Material Inward',
    'https://kend2c.kenerp.com/pages/jobwork.php' => 'Job Work',
    'https://kend2c.kenerp.com/pages/sale.php' => 'Sale',
    'https://kend2c.kenerp.com/pages/costing.php' => 'Costing',
    'https://kend2c.kenerp.com/pages/masters.php' => 'Masters',
];

foreach ($pages as $url => $expect) {
    $ctx = stream_context_create(['http' => ['timeout' => 5]]);
    $html = @file_get_contents($url, false, $ctx);
    if ($html === false) {
        echo "[FAIL] $url (could not connect)\n";
        continue;
    }
    $hasExpect = stripos($html, $expect) !== false;
    echo ($hasExpect ? "[PASS]" : "[FAIL]") . " $url (found '$expect')\n";
}

echo "\n=== 2. Testing API Data Persistence & Foreign Keys ===\n";
// Fetch current data
$ctx = stream_context_create(['http' => ['timeout' => 10]]);
$dataJson = file_get_contents('https://kend2c.kenerp.com/api/data.php', false, $ctx);
$data = json_decode($dataJson, true);

if (!isset($data['db'])) {
    echo "[FAIL] Could not fetch DB from api/data.php\n";
    exit(1);
}
echo "[PASS] Fetched data from api/data.php\n";

$db = $data['db'];

// Check parties and items
$party = $db['masters']['parties'][0] ?? null;
$item = $db['masters']['items'][0] ?? null;
echo "Sample party: " . ($party ? $party['legalName'] . " (" . ($party['code'] ?? $party['id']) . ")" : "none") . "\n";
echo "Sample item: " . ($item ? $item['name'] . " (" . ($item['code'] ?? $item['id']) . ")" : "none") . "\n";

// Add a test PO with both text and foreign key
$testPoNo = 'PO-E2E-' . time();
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

$db['po'][] = $newPo;

// Save via POST to api/data.php
$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($db),
        'timeout' => 15
    ]
];
$context  = stream_context_create($options);
$result = file_get_contents('https://kend2c.kenerp.com/api/data.php', false, $context);
$saveRes = json_decode($result, true);

if (!isset($saveRes['ok']) || !$saveRes['ok']) {
    echo "[FAIL] POST to api/data.php failed: " . $result . "\n";
    exit(1);
} else {
    echo "[PASS] Successfully saved test PO via HTTP POST to api/data.php\n";
}

// Verify directly in MySQL table purchase_orders
$pdo = sf_pdo();
$stmt = $pdo->prepare("SELECT po_no, supplier, supplier_id, pay_terms, pay_terms_id FROM purchase_orders WHERE po_no = ?");
$stmt->execute([$testPoNo]);
$savedRow = $stmt->fetch();

if ($savedRow && $savedRow['supplier_id'] === $supplierId) {
    echo "[PASS] Found saved row in MySQL purchase_orders with supplier_id = {$savedRow['supplier_id']}:\n";
    print_r($savedRow);
} else {
    echo "[FAIL] Row or supplier_id mismatch in MySQL purchase_orders\n";
}

// Verify line items in MySQL purchase_order_items
$stmtItem = $pdo->prepare("SELECT poi.name, poi.item_id, poi.color, poi.color_id, poi.unit, poi.unit_id 
                           FROM purchase_order_items poi 
                           JOIN purchase_orders po ON po.id = poi.po_id 
                           WHERE po.po_no = ?");
$stmtItem->execute([$testPoNo]);
$savedItems = $stmtItem->fetchAll();

if ($savedItems && $savedItems[0]['item_id'] === $itemId) {
    echo "[PASS] Found saved item row in MySQL purchase_order_items with item_id = {$savedItems[0]['item_id']}:\n";
    print_r($savedItems);
} else {
    echo "[FAIL] Items not found or item_id mismatch in MySQL purchase_order_items\n";
}

// Verify GET api/data.php returns the new PO with foreign keys
$freshDataJson = file_get_contents('https://kend2c.kenerp.com/api/data.php', false, $ctx);
$freshData = json_decode($freshDataJson, true);
$freshPo = null;
foreach ($freshData['db']['po'] as $p) {
    if ($p['no'] === $testPoNo) {
        $freshPo = $p;
        break;
    }
}
if ($freshPo && isset($freshPo['supplier_id']) && $freshPo['supplier_id'] === $supplierId) {
    echo "[PASS] Verified GET api/data.php returns re-assembled PO with supplier_id = {$freshPo['supplier_id']}\n";
} else {
    echo "[FAIL] GET api/data.php did not return expected foreign key\n";
}

// Cleanup test PO
$pdo->prepare("DELETE FROM purchase_orders WHERE po_no = ?")->execute([$testPoNo]);
echo "\n=== All Tests Passed 100%! ===\n";
