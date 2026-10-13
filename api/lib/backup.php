<?php
/* =====================================================================
   StitchFlow ERP — Automated Database Backup Engine (Zero Data Loss)
   Creates daily rolling snapshots and manual backups of the normalized
   MySQL database without relying on external mysqldump binary.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

function sf_backup_dir(): string {
    $dir = dirname(__DIR__, 2) . '/storage/backups';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

function sf_create_backup(?string $name = null): string {
    $pdo = sf_pdo();
    $dir = sf_backup_dir();
    $timestamp = date('Y-m-d_H-i-s');
    $filename = $name ? "backup_{$name}_{$timestamp}.sql" : "backup_{$timestamp}.sql";
    $filepath = $dir . '/' . $filename;

    $out = "-- StitchFlow ERP Database Backup\n";
    $out .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
    $out .= "SET FOREIGN_KEY_CHECKS=0;\n";
    $out .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n";

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        $table = (string)$table;
        // Skip view stubs or system tables
        if (str_starts_with($table, 'v_')) continue;

        $out .= "-- --------------------------------------------------------\n";
        $out .= "-- Structure for table `{$table}`\n";
        $out .= "-- --------------------------------------------------------\n";
        $out .= "DROP TABLE IF EXISTS `{$table}`;\n";

        $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
        $createSql = $createStmt['Create Table'] ?? '';
        $out .= $createSql . ";\n\n";

        // Dump data
        $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
        if (!empty($rows)) {
            $out .= "-- Dumping data for table `{$table}`\n";
            $cols = array_keys($rows[0]);
            $colList = implode('`, `', $cols);

            $chunks = array_chunk($rows, 100);
            foreach ($chunks as $chunk) {
                $out .= "INSERT INTO `{$table}` (`{$colList}`) VALUES\n";
                $valLines = [];
                foreach ($chunk as $row) {
                    $vals = [];
                    foreach ($row as $val) {
                        if ($val === null) {
                            $vals[] = 'NULL';
                        } elseif (is_numeric($val)) {
                            $vals[] = $val;
                        } else {
                            $vals[] = $pdo->quote((string)$val);
                        }
                    }
                    $valLines[] = '(' . implode(',', $vals) . ')';
                }
                $out .= implode(",\n", $valLines) . ";\n";
            }
            $out .= "\n";
        }
    }

    $out .= "SET FOREIGN_KEY_CHECKS=1;\n";
    file_put_contents($filepath, $out);

    // Prune backups older than 14 days
    sf_prune_backups(14);

    return $filepath;
}

function sf_prune_backups(int $keepDays = 14): void {
    $dir = sf_backup_dir();
    $cutoff = time() - ($keepDays * 86400);
    $files = glob($dir . '/backup_*.sql');
    if ($files) {
        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $cutoff) {
                @unlink($file);
            }
        }
    }
}

function sf_auto_backup_daily(): void {
    $dir = sf_backup_dir();
    $today = date('Y-m-d');
    $todayPattern = $dir . "/backup_{$today}_*.sql";
    $existing = glob($todayPattern);
    if (empty($existing)) {
        // No backup created today yet — create one
        try {
            sf_create_backup($today);
        } catch (Throwable $e) {
            error_log('StitchFlow auto-backup failed: ' . $e->getMessage());
        }
    }
}
