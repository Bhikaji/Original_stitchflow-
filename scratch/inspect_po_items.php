<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$pois = $pdo->query('SELECT id, po_id, classification, name, qty, rate FROM purchase_order_items')->fetchAll(PDO::FETCH_ASSOC);
echo "PO Items count: " . count($pois) . "\n";
foreach ($pois as $p) {
    echo json_encode($p) . "\n";
}
