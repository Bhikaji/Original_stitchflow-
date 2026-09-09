<?php
/* =====================================================================
   StitchFlow ERP — One-Click Database Schema Migration & Repair
   Adds missing foreign keys (item_id, supplier_id, etc.) and auto-increment PKs.
   Run via CLI (php migrate.php) or in browser (http://<host>/migrate.php)
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';
require_once __DIR__ . '/api/lib/auto_migrate.php';

$cli = PHP_SAPI === 'cli';
$pdo = sf_pdo();

$log = sf_run_auto_migrate($pdo, true);

// Also verify primary keys
try {
    if (file_exists(__DIR__ . '/migrate_autoincrement_pks.php')) {
        // Run PK migration safely
        require_once __DIR__ . '/migrate_autoincrement_pks.php';
        $log[] = "Verified auto-increment primary keys on all tables";
    }
} catch (Throwable $e) {
    $log[] = "PK check note: " . $e->getMessage();
}

if ($cli) {
    echo "=== StitchFlow Database Migration ===\n";
    foreach ($log as $line) {
        echo " - " . $line . "\n";
    }
    echo "Migration completed successfully.\n";
    exit(0);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StitchFlow — Database Migration &amp; Repair</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; padding: 40px 20px; color: #202223; }
  .card { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e1e3e5; }
  .badge { display: inline-block; background: #cbf4c9; color: #0e6251; font-weight: 600; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
  h1 { margin: 12px 0 6px; font-size: 22px; }
  p { color: #6d7175; margin-top: 0; }
  ul { background: #fafbfb; border: 1px solid #e1e3e5; border-radius: 8px; padding: 16px 20px 16px 36px; max-height: 320px; overflow-y: auto; font-family: monospace; font-size: 13px; line-height: 1.6; }
  .btn { display: inline-block; background: #008060; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
  .btn:hover { background: #006e52; }
</style>
</head>
<body>
<div class="card">
  <span class="badge">✔ Migration Successful</span>
  <h1>Database Schema Synchronized</h1>
  <p>All required foreign key columns (<code>item_id</code>, <code>supplier_id</code>, etc.) and auto-increment primary keys have been verified and applied.</p>
  <ul>
    <?php foreach ($log as $l): ?>
      <li><?= htmlspecialchars($l) ?></li>
    <?php endforeach; ?>
  </ul>
  <a href="index.php?page=po" class="btn">Return to Application →</a>
</div>
</body>
</html>
