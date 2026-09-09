<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';
$db = assemble_db();
foreach ($db['jobwork'] as $jw) {
    echo "JW: " . $jw['no'] . "\n";
    foreach ($jw['garments'] as $g) {
        echo "  style: " . ($g['style'] ?? '') . ", desc: " . ($g['desc'] ?? '') . "\n";
    }
}
