<?php
/* =====================================================================
   StitchFlow ERP — installer
   Creates every table, view and seed row of the normalized schema.
   Run from the CLI:   php setup.php
   or open in browser: http://<host>/setup.php
   ===================================================================== */
declare(strict_types=1);

$cli = PHP_SAPI === 'cli';
if (!$cli) { header('Content-Type: text/plain; charset=utf-8'); }

$cfg = require __DIR__ . '/config.php';
$c = $cfg['db'];

function out(string $msg): void { echo $msg . PHP_EOL; }

try {
    /* connect without a schema first so we can create the database */
    $pdo = new PDO("mysql:host={$c['host']};port={$c['port']};charset={$c['charset']}", $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$c['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$c['name']}`");
    out("Database `{$c['name']}` ready.");

    $st = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($st && $st->fetch()) {
        throw new RuntimeException("Database already initialized. Refusing to import schema.sql to prevent data loss.");
    }

    $sql = file_get_contents(__DIR__ . '/schema.sql');
    if ($sql === false) throw new RuntimeException('schema.sql not found');

    /* strip comment-only lines, then split on ; at end of statement */
    $lines = array_filter(
        explode("\n", $sql),
        function ($l) {
            return !preg_match('/^\s*--/', $l);
        }
    );
    $clean = implode("\n", $lines);
    $stmts = array_filter(array_map('trim', preg_split('/;\s*(?=\n|$)/', $clean)));

    $n = 0;
    foreach ($stmts as $stmt) {
        if ($stmt === '') continue;
        $pdo->exec($stmt);
        $n++;
    }
    out("Executed {$n} schema statements — all tables, views and seed data are in place.");
    out('StitchFlow ERP is ready. Open index.php and sign in (admin / PIN 1234).');
} catch (Throwable $e) {
    http_response_code(500);
    out('Setup failed: ' . $e->getMessage());
    exit(1);
}
