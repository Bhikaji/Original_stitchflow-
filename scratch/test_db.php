<?php
require_once __DIR__ . '/../api/bootstrap.php';
$cols = sf_pdo()->query("DESCRIBE kv_store")->fetchAll();
foreach ($cols as $c) {
    echo $c['Field'] . " : " . $c['Type'] . " [" . ($c['Key'] ?? '') . "] " . ($c['Extra'] ?? '') . "\n";
}
