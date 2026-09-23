<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();
$count = $pdo->query("SELECT COUNT(*) FROM parties WHERE JSON_EXTRACT(extra_json, '$.id') IS NOT NULL")->fetchColumn();
echo "Parties with id in extra_json: " . $count . "\n";
