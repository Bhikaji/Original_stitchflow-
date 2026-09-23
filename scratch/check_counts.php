<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $t) {
    $count = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    echo "$t: $count\n";
}
