<?php
$appHtmlPath = __DIR__ . '/../app/app.html';
$jsPath = __DIR__ . '/../demo/extracted_sales.js';
$cssPath = __DIR__ . '/../demo/extracted_css.css'; // wait, is this the right css?

$html = file_get_contents($appHtmlPath);

$jsContent = file_get_contents($jsPath);
$cssContent = file_get_contents($cssPath);

// check if already implemented
if (strpos($html, 'function openSaleImport()') !== false) {
    echo "Sales module JS already in app.html\n";
} else {
    $injection = "\n<style>\n" . $cssContent . "\n</style>\n<script>\n" . $jsContent . "\n</script>\n";
    $html = str_replace('</body>', $injection . '</body>', $html);
    file_put_contents($appHtmlPath, $html);
    echo "Injected JS and CSS into app.html\n";
}
