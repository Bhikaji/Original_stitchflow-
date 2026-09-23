<?php
require __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$keys = $pdo->query('SHOW CREATE TABLE sale_items')->fetch(PDO::FETCH_ASSOC);
print_r($keys);
