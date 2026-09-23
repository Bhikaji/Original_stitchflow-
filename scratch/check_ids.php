<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$id = 'imudmqh66027jr';

$tables = ['parties', 'items', 'styles', 'users'];
foreach ($tables as $t) {
    $stmt = $pdo->query("SELECT id FROM $t WHERE id = '$id'");
    if ($stmt->fetch()) {
        echo "Found in $t\n";
    }
}
$stmt = $pdo->query("SELECT COUNT(*) FROM parties");
echo "Parties count: " . $stmt->fetchColumn() . "\n";
