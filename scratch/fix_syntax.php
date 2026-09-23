<?php
$jsPath = __DIR__ . '/../assets/js/app-core.js';
$jsCore = file_get_contents($jsPath);

// The bad line is "   • brand, size, style name, seller SKU captured on every sale item."
// which comes right after our append marker "/* --- Added Sales Module Demo --- */"
$badMarker = "/* --- Added Sales Module Demo --- */\n\n   • brand, size, style name, seller SKU captured on every sale item.\n   ===================================================================== */";

if (strpos($jsCore, "• brand, size, style name") !== false) {
    // Just prepend /* to the broken comment
    $jsCore = str_replace("   • brand, size", "/* • brand, size", $jsCore);
    file_put_contents($jsPath, $jsCore);
    echo "Fixed syntax error in app-core.js\n";
} else {
    echo "Bad comment not found.\n";
}
