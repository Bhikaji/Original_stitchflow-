<?php
require_once __DIR__ . '/../api/lib/persist.php';
$db = sf_load_db();
foreach($db['inward'] as $i) {
  echo $i['no'] . " - " . $i['entryType'] . "\n";
}
