<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();

echo "=== Testing View Queries ===\n";

echo "1. v_stock_ledger (first 5 rows):\n";
$rows = $pdo->query("SELECT * FROM v_stock_ledger LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);

echo "2. v_item_stock (first 5 rows):\n";
$rows = $pdo->query("SELECT * FROM v_item_stock LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);

echo "3. v_po_received (first 5 rows):\n";
$rows = $pdo->query("SELECT * FROM v_po_received LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);

echo "=== All Views Executed Successfully! ===\n";
