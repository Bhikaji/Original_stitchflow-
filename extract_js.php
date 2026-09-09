<?php
declare(strict_types=1);

$lines = file(__DIR__ . '/app/app.html');
if ($lines === false) {
    echo "Failed to read app/app.html\n";
    exit(1);
}

// Slice from line 1334 (0-indexed 1333) to line 14451 (0-indexed 14451)
$jsLines = array_slice($lines, 1334, 14451 - 1334);
$rawJs = implode('', $jsLines);

// Remove closing/opening script tags inside the block and cloudflare scripts
$cleanJs = preg_replace('#</script>\s*<script[^>]*>#is', "\n/* --- Next Script Block --- */\n", $rawJs);
$cleanJs = preg_replace('#<script.*?</script>#is', '', $cleanJs);
$cleanJs = preg_replace('#</script>#is', '', $cleanJs);

if (!is_dir(__DIR__ . '/assets/js')) {
    mkdir(__DIR__ . '/assets/js', 0777, true);
}

file_put_contents(__DIR__ . '/assets/js/app-core.js', $cleanJs);
echo "Extracted assets/js/app-core.js: " . strlen($cleanJs) . " bytes (" . count(explode("\n", $cleanJs)) . " lines)\n";
