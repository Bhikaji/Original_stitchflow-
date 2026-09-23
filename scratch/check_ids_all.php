<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $t) {
    $cols = $pdo->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($cols as $c) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM `$t` WHERE `$c` LIKE '%imudmqh66027jr%'");
        if ($stmt && $stmt->fetchColumn() > 0) {
            echo "Found in $t.$c\n";
        }
    }
}
