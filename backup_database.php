<?php
/* CLI-only database backup. Configure the two-hour schedule in cPanel Cron Jobs. */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$config = require __DIR__ . '/config.php';
$db = $config['db'];
$recipient = getenv('STITCHFLOW_BACKUP_EMAIL') ?: 'kenaiitdeparment@gmail.com';
$backupDir = getenv('STITCHFLOW_BACKUP_DIR') ?: sys_get_temp_dir();
$mysqldump = getenv('STITCHFLOW_MYSQLDUMP') ?: '/usr/bin/mysqldump';

if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Invalid backup recipient.\n");
    exit(1);
}
if (!is_dir($backupDir) && !mkdir($backupDir, 0700, true) && !is_dir($backupDir)) {
    fwrite(STDERR, "Backup directory could not be created.\n");
    exit(1);
}

$stamp = gmdate('Y-m-d_H-i-s');
$sqlPath = rtrim($backupDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'stitchflow_' . $stamp . '.sql';
$zipPath = $sqlPath . '.gz';
$command = implode(' ', [
    escapeshellarg($mysqldump),
    '--single-transaction --quick --routines --triggers --hex-blob',
    '--host=' . escapeshellarg((string) $db['host']),
    '--port=' . escapeshellarg((string) $db['port']),
    '--user=' . escapeshellarg((string) $db['user']),
    '--password=' . escapeshellarg((string) $db['pass']),
    escapeshellarg((string) $db['name']),
    '>', escapeshellarg($sqlPath), '2>&1',
]);

$output = [];
$status = 0;
exec($command, $output, $status);
if ($status !== 0 || !is_file($sqlPath) || filesize($sqlPath) === 0) {
    @unlink($sqlPath);
    fwrite(STDERR, "Database export failed: " . implode(' ', $output) . "\n");
    exit(1);
}

$input = fopen($sqlPath, 'rb');
$outputFile = gzopen($zipPath, 'wb9');
if (!$input || !$outputFile) {
    if (is_resource($input)) fclose($input);
    @unlink($sqlPath);
    @unlink($zipPath);
    fwrite(STDERR, "Backup compression failed.\n");
    exit(1);
}
while (!feof($input)) {
    $chunk = fread($input, 1024 * 1024);
    if ($chunk !== false) gzwrite($outputFile, $chunk);
}
fclose($input);
gzclose($outputFile);
@unlink($sqlPath);

$attachment = file_get_contents($zipPath);
$subject = 'StitchFlow database backup - ' . $stamp . ' UTC';
$boundary = '=_stitchflow_' . bin2hex(random_bytes(12));
$headers = [
    'From: StitchFlow backup <no-reply@' . preg_replace('/^www\./', '', (string) ($_SERVER['HTTP_HOST'] ?? 'kend2c.kenerp.com')) . '>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
];
$body = '--' . $boundary . "\r\n"
    . "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
    . "Automated StitchFlow database backup generated at " . $stamp . " UTC.\r\n"
    . '--' . $boundary . "\r\n"
    . "Content-Type: application/gzip; name=\"" . basename($zipPath) . "\"\r\n"
    . "Content-Disposition: attachment; filename=\"" . basename($zipPath) . "\"\r\n"
    . "Content-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($attachment ?: ''))
    . '--' . $boundary . "--\r\n";

$sent = mail($recipient, $subject, $body, implode("\r\n", $headers));
if (!$sent) {
    fwrite(STDERR, "Backup created but email delivery failed: " . $zipPath . "\n");
    exit(1);
}

// Keep only the latest seven local copies when the hosting mailer accepts the message.
$files = glob(rtrim($backupDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'stitchflow_*.sql.gz') ?: [];
rsort($files, SORT_STRING);
foreach (array_slice($files, 7) as $oldFile) @unlink($oldFile);
echo "Backup emailed to {$recipient}: {$zipPath}\n";