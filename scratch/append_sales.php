<?php
$jsPath = __DIR__ . '/../assets/js/app-core.js';
$cssPath = __DIR__ . '/../assets/css/app.css';

$demoJsPath = __DIR__ . '/../demo/extracted_sales.js';
$demoCssPath = __DIR__ . '/../demo/extracted_css.css';

$jsCore = file_get_contents($jsPath);
$cssCore = file_get_contents($cssPath);

$demoJs = file_get_contents($demoJsPath);
$demoCss = file_get_contents($demoCssPath);

if (strpos($jsCore, 'openSaleImport') === false) {
    file_put_contents($jsPath, "\n\n/* --- Added Sales Module Demo --- */\n\n" . $demoJs, FILE_APPEND);
    echo "Appended demo sales JS to app-core.js\n";
} else {
    echo "Sales JS already in app-core.js\n";
}

// Check for something unique in demo CSS, e.g. open-stock-table or sdb-row, or just check size.
// Actually, I'll just append it if not already appended. Let's use a unique marker.
if (strpos($cssCore, '/* --- Added Sales Module Demo --- */') === false) {
    file_put_contents($cssPath, "\n\n/* --- Added Sales Module Demo --- */\n\n" . $demoCss, FILE_APPEND);
    echo "Appended demo sales CSS to app.css\n";
} else {
    echo "Sales CSS already in app.css\n";
}
