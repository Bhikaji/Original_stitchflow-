<?php
$code = file_get_contents(__DIR__ . '/partner_block.js');
preg_match_all('#function\s+([a-zA-Z0-9_$]+)\s*\(#', $code, $m);
echo "Functions in partner_block.js (" . count($m[1]) . " functions):\n";
foreach ($m[1] as $fn) {
    echo "  - $fn\n";
}
