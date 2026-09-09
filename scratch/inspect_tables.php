<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $t) {
    echo "=== Table: $t ===\n";
    $pks = [];
    $cols = $pdo->query("DESCRIBE `$t`")->fetchAll();
    foreach ($cols as $col) {
        $extra = $col['Extra'] ? " ({$col['Extra']})" : "";
        $key = $col['Key'] ? " [{$col['Key']}]" : "";
        if ($col['Key'] === 'PRI') $pks[] = $col['Field'];
        echo "  {$col['Field']} : {$col['Type']}$key$extra\n";
    }
    echo "  PRIMARY KEY: " . implode(', ', $pks) . "\n\n";
}
