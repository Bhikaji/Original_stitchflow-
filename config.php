<?php
/* StitchFlow ERP — PHP/MySQL configuration */
return [
    'db' => [
        'host'     => getenv('STITCHFLOW_DB_HOST') ?: '127.0.0.1',
        'port'     => getenv('STITCHFLOW_DB_PORT') ?: '3306',
        'name'     => getenv('STITCHFLOW_DB_NAME') ?: 'kenerp_kend2c',
        'user'     => getenv('STITCHFLOW_DB_USER') ?: 'kenerp_kend2c',
        'pass'     => getenv('STITCHFLOW_DB_PASS') ?: 's8}9D1hy]kNwQeey',
        'charset'  => 'utf8mb4',
    ],
];
