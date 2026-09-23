<?php
$ch = curl_init('https://kend2c.kenerp.com/api/data.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$res = curl_exec($ch);
echo substr($res, 0, 500);
