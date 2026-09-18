<?php
require 'api/bootstrap.php';
require 'api/lib/assemble.php';
$db = assemble_db();
print_r(array_keys($db));
