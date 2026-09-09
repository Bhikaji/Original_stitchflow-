<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$tables = ['parties', 'items', 'master_values', 'styles', 'users', 'warehouse_addresses', 'purchase_orders', 'inwards', 'jobworks'];

foreach ($tables as $t) {
    echo "=== Table: $t ===\n";
    $cols = $pdo->query("DESCRIBE `$t`")->fetchAll();
    foreach ($cols as $col) {
        $extra = $col['Extra'] ? " ({$col['Extra']})" : "";
        $key = $col['Key'] ? " [{$col['Key']}]" : "";
        echo "  {$col['Field']} : {$col['Type']}$key$extra\n";
    }
    echo "\n";
}
