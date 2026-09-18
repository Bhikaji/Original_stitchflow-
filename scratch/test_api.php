<?php
$res = file_get_contents('http://localhost/stitchflow/index.php');
echo substr($res, 0, 500);
