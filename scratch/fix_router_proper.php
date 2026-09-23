<?php
$jsPath = __DIR__ . '/../assets/js/app-core.js';
$jsCore = file_get_contents($jsPath);

$target = "if (pageView.kind === 'form') { renderFormPage(); return; }";

$replacement = "if (pageView.kind === 'form') { renderFormPage(); return; }\n    if (pageView.kind === 'saleimport') { renderSaleImportPage(); return; }\n    if (pageView.kind === 'saledashboard') { renderSaleDashboard(); return; }\n    if (pageView.kind === 'salenumbers') { renderSaleNumbersPage(); return; }";

// Replace it if it hasn't been replaced exactly like this
if (strpos($jsCore, "renderSaleImportPage(); return;") === false) {
    if (strpos($jsCore, $target) !== false) {
        $jsCore = str_replace($target, $replacement, $jsCore);
        file_put_contents($jsPath, $jsCore);
        echo "Successfully updated app-core.js router\n";
    } else {
        echo "Target string not found.\n";
    }
} else {
    echo "Router is already hooked.\n";
}
