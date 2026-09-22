<?php
require 'api/bootstrap.php';
$pdo = sf_pdo();
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $t) {
    echo $t . ': ' . $pdo->query('SELECT COUNT(*) FROM ' . $t)->fetchColumn() . "\n";
}
