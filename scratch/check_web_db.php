<?php
$host = 'localhost';
$port = 80;
$path = '/scratch/db_name.php';
file_put_contents(__DIR__ . '/db_name.php', '<?php require_once "../api/bootstrap.php"; echo sf_config()["db"]["name"];');
$ch = curl_init("http://localhost/stitchflow/scratch/db_name.php");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo "DB Name via HTTP: " . $res . "\n";
