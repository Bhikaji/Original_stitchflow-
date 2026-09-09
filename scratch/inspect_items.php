<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$items = $pdo->query('SELECT id, code, name, category, classification, is_active FROM items')->fetchAll(PDO::FETCH_ASSOC);
echo "Items count: " . count($items) . "\n";
foreach ($items as $it) {
    echo json_encode($it) . "\n";
}

$classifications = $pdo->query("SELECT * FROM master_values WHERE master_key = 'classifications'")->fetchAll(PDO::FETCH_ASSOC);
echo "\nClassifications in master_values:\n";
foreach ($classifications as $c) {
    echo json_encode($c) . "\n";
}
