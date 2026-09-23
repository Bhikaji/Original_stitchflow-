<?php
require __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$cols = $pdo->query('SHOW COLUMNS FROM sales')->fetchAll(PDO::FETCH_ASSOC);
print_r($cols);
$cols = $pdo->query('SHOW COLUMNS FROM sale_items')->fetchAll(PDO::FETCH_ASSOC);
print_r($cols);
