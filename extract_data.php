<?php
$sql = file_get_contents(__DIR__ . '/schema.sql');
$lines = explode("\n", $sql);
$out = [];
$out[] = "SET FOREIGN_KEY_CHECKS=0;";

$in_data_dump = false;
foreach ($lines as $i => $line) {
    if (preg_match('/^-- Dumping data for table `([^`]+)`/', $line)) {
        $in_data_dump = true;
        $out[] = "";
        $out[] = $line;
        continue;
    }
    if ($in_data_dump) {
        if (strpos($line, '-- Table structure for table') === 0 || strpos($line, '-- Final view structure') === 0) {
            $in_data_dump = false;
            continue;
        }
        $out[] = $line;
    }
}
$out[] = "SET FOREIGN_KEY_CHECKS=1;";
file_put_contents(__DIR__ . '/data_only.sql', implode("\n", $out));
echo "Created data_only.sql successfully.\n";
