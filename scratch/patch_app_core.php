<?php
$file = 'c:/xampp/htdocs/stitchflow/assets/js/app-core.js';
$content = file_get_contents($file);

$search = "saleIds: saleIds, keys: keys, qty: qty, amount: amount,
    period: dMin && dMax ? (dMin === dMax ? dMin : dMin + ' → ' + dMax) : ''
  });";

$replace = "saleIds: saleIds, keys: keys, qty: qty, amount: amount,
    period: dMin && dMax ? (dMin === dMax ? dMin : dMin + ' → ' + dMax) : ''
  });
  if (db.saleImports.length > 50) db.saleImports.length = 50;";

$newContent = str_replace(str_replace("\r", "", $search), str_replace("\r", "", $replace), str_replace("\r", "", $content));

if ($newContent === str_replace("\r", "", $content)) {
    echo "NO MATCH FOUND!\n";
} else {
    file_put_contents($file, $newContent);
    echo "PATCH APPLIED SUCCESSFULLY!\n";
}
