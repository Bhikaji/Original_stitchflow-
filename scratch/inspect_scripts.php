<?php
$lines = file(__DIR__ . '/../app/app1.html');
echo "Total lines in app1.html: " . count($lines) . "\n";
$inScript = false;
$scriptStart = -1;
foreach ($lines as $num => $line) {
    if (stripos($line, '<script') !== false) {
        echo "Found <script> at line " . ($num + 1) . ": " . trim(substr($line, 0, 100)) . "\n";
    }
    if (stripos($line, '</script>') !== false) {
        echo "Found </script> at line " . ($num + 1) . ": " . trim(substr($line, 0, 100)) . "\n";
    }
}
