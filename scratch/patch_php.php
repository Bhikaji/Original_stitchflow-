<?php
$file = 'c:\\xampp\\htdocs\\stitchflow\\assets\\js\\app-core.js';
$content = file_get_contents($file);

$target = "let p=db.masters.parties.find(function(x){return x.partnerId===rec.id || String(x.gstNo||'').toUpperCase()===String(g.gstin||'').toUpperCase();});";
$replacement = "let p=db.masters.parties.find(function(x){return x.partnerId===rec.id;});";

if (strpos($content, $target) !== false) {
    $content = str_replace($target, $replacement, $content);
    file_put_contents($file, $content);
    echo "Successfully patched app-core.js\n";
} else {
    echo "Target string not found in app-core.js\n";
}
