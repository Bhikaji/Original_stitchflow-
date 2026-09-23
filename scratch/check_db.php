<?php
require __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
try {
    $pdo->query("INSERT INTO sales (id, sale_no, sale_date) VALUES ('SL-FAIL-TEST', 'SL-FAIL-TEST', 'No date ')");
    echo "SUCCESS\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
