<?php
require_once 'api/lib/db.php';
require_once 'api/lib/assemble.php';

$start = microtime(true);
$db = assemble_db();
$mid = microtime(true);

$json = json_encode($db);
$end = microtime(true);

echo "Assemble Time: " . round($mid - $start, 4) . " seconds\n";
echo "JSON Encode Time: " . round($end - $mid, 4) . " seconds\n";
echo "JSON Size: " . round(strlen($json) / 1024 / 1024, 2) . " MB\n";

$conn = get_db_connection();
$result = $conn->query("SELECT schema_key, COUNT(*) as count FROM kv_store GROUP BY schema_key ORDER BY count DESC");
echo "\nRow counts by schema:\n";
while($row = $result->fetch_assoc()) {
    echo $row['schema_key'] . ": " . $row['count'] . "\n";
}
$conn->close();
?>
