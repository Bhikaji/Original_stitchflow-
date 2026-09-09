<?php
$lines = file(__DIR__ . '/../app/app1.html');
$slice = array_slice($lines, 13554, 14078 - 13554);
$code = implode('', $slice);
echo "Extracted " . count($slice) . " lines, " . strlen($code) . " bytes\n";
echo "First 500 chars:\n" . substr($code, 0, 500) . "\n";
echo "Last 500 chars:\n" . substr($code, -500) . "\n";
file_put_contents(__DIR__ . '/partner_block.js', $code);
