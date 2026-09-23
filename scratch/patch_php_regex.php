<?php
$file = 'c:\\xampp\\htdocs\\stitchflow\\assets\\js\\app-core.js';
$content = file_get_contents($file);

$pattern = '/let p=db\.masters\.parties\.find\(function\(x\)\{return x\.partnerId===rec\.id.*?\}\);/';
$replacement = "let p=db.masters.parties.find(function(x){return x.partnerId===rec.id;});";

if (preg_match($pattern, $content)) {
    $content = preg_replace($pattern, $replacement, $content);
    file_put_contents($file, $content);
    echo "Successfully patched app-core.js via regex\n";
} else {
    echo "Regex pattern not found in app-core.js\n";
}
