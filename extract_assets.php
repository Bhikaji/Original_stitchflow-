<?php
declare(strict_types=1);

$html = file_get_contents(__DIR__ . '/app/app.html');
if ($html === false) {
    echo "Could not read app/app.html\n";
    exit(1);
}

// 1. Extract all <style> blocks
preg_match_all('#<style[^>]*>(.*?)</style>#is', $html, $styleMatches);
$combinedCss = implode("\n\n/* --- Next Style Block --- */\n\n", $styleMatches[1]);

if (!is_dir(__DIR__ . '/assets/css')) {
    mkdir(__DIR__ . '/assets/css', 0777, true);
}
file_put_contents(__DIR__ . '/assets/css/app.css', $combinedCss);
echo "Saved assets/css/app.css (" . strlen($combinedCss) . " bytes)\n";

// 2. Extract internal <script> contents (ignoring external CDN / cloudflare scripts)
preg_match_all('#<script(?![^>]*src=["\']http)([^>]*)>(.*?)</script>#is', $html, $scriptMatches);
$combinedJs = [];
foreach ($scriptMatches[2] as $idx => $js) {
    // Skip small cloudflare challenge snippets if any
    if (strpos($js, '__CF$cv$params') !== false) continue;
    $combinedJs[] = "/* ================= Script Block " . ($idx + 1) . " ================= */\n" . $js;
}
$fullCoreJs = implode("\n\n", $combinedJs);

if (!is_dir(__DIR__ . '/assets/js')) {
    mkdir(__DIR__ . '/assets/js', 0777, true);
}
file_put_contents(__DIR__ . '/assets/js/app-core.js', $fullCoreJs);
echo "Saved assets/js/app-core.js (" . strlen($fullCoreJs) . " bytes)\n";

echo "Assets extraction done.\n";
