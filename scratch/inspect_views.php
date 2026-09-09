<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$views = ['v_item_stock', 'v_po_received', 'v_stock_ledger'];
foreach ($views as $v) {
    echo "=== View: $v ===\n";
    $row = $pdo->query("SHOW CREATE VIEW `$v`")->fetch(PDO::FETCH_ASSOC);
    echo $row['Create View'] . "\n\n";
}
