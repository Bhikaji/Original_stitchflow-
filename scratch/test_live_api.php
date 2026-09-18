<?php
$ch = curl_init('http://kend2c.kenerp.com/api/data.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
echo substr($res, 0, 100);
