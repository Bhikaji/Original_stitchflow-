<?php
/* =====================================================================
   StitchFlow ERP — PHP/MySQL Configuration
   Reads database credentials from server environment variables or .env file.
   ===================================================================== */
declare(strict_types=1);

// Automatically load .env file if present in application root
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines !== false) {
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) continue;
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $name  = trim($parts[0]);
                $value = trim($parts[1]);
                if (getenv($name) === false) {
                    putenv("{$name}={$value}");
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }
}

$defaultPort = '3306';
if (DIRECTORY_SEPARATOR === '\\' && is_dir('C:\\xampp2') && !getenv('STITCHFLOW_DB_PORT')) {
    $defaultPort = '3307';
}

return [
    'db' => [
        'host'     => $_ENV['STITCHFLOW_DB_HOST'] ?? getenv('STITCHFLOW_DB_HOST') ?: 'localhost',
        'port'     => $_ENV['STITCHFLOW_DB_PORT'] ?? getenv('STITCHFLOW_DB_PORT') ?: $defaultPort,
        'name'     => $_ENV['STITCHFLOW_DB_NAME'] ?? getenv('STITCHFLOW_DB_NAME') ?: '',
        'user'     => $_ENV['STITCHFLOW_DB_USER'] ?? getenv('STITCHFLOW_DB_USER') ?: '',
        'pass'     => $_ENV['STITCHFLOW_DB_PASS'] ?? getenv('STITCHFLOW_DB_PASS') ?: '',
        'charset'  => 'utf8mb4',
    ],
];
