<?php
/* CLI-only database backup. Configure the two-hour schedule in cPanel Cron Jobs. */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$config = require __DIR__ . '/config.php';
$db = $config['db'];
$driveCredentialsFile = getenv('STITCHFLOW_DRIVE_SERVICE_ACCOUNT_FILE') ?: '';
$driveFolderId = getenv('STITCHFLOW_DRIVE_FOLDER_ID') ?: '1COCYE739q8-5GUpf0J8HwT757Q5ZJSs0';
$recipient = getenv('STITCHFLOW_BACKUP_EMAIL') ?: '';
$backupDir = getenv('STITCHFLOW_BACKUP_DIR') ?: sys_get_temp_dir();
$mysqldump = getenv('STITCHFLOW_MYSQLDUMP') ?: '/usr/bin/mysqldump';

if ($driveCredentialsFile === '' || $driveFolderId === '') {
    fwrite(STDERR, "Google Drive backup is not configured. Set STITCHFLOW_DRIVE_SERVICE_ACCOUNT_FILE and STITCHFLOW_DRIVE_FOLDER_ID.\n");
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

$credentials = json_decode((string) @file_get_contents($driveCredentialsFile), true);
if (!is_array($credentials) || empty($credentials['client_email']) || empty($credentials['private_key'])) {
    fwrite(STDERR, "Google Drive service-account credentials could not be read.\n");
    exit(1);
}

$base64Url = static function (string $value): string {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
};
$jwtHeader = $base64Url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
$jwtClaims = $base64Url(json_encode([
    'iss' => $credentials['client_email'],
    'scope' => 'https://www.googleapis.com/auth/drive.file',
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => time(),
    'exp' => time() + 3600,
], JSON_THROW_ON_ERROR));
$signingInput = $jwtHeader . '.' . $jwtClaims;
$signature = '';
if (!openssl_sign($signingInput, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256)) {
    fwrite(STDERR, "Google Drive JWT signing failed.\n");
    exit(1);
}
$tokenResponse = json_decode((string) @file_get_contents('https://oauth2.googleapis.com/token', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $signingInput . '.' . $base64Url($signature),
        ]),
        'ignore_errors' => true,
    ],
])), true);
if (!is_array($tokenResponse) || empty($tokenResponse['access_token'])) {
    fwrite(STDERR, "Google Drive access token request failed.\n");
    exit(1);
}

$metadata = json_encode([
    'name' => basename($zipPath),
    'parents' => [$driveFolderId],
    'description' => 'Automated StitchFlow database backup generated at ' . $stamp . ' UTC.',
], JSON_THROW_ON_ERROR);
$boundary = '=_stitchflow_drive_' . bin2hex(random_bytes(12));
$fileData = (string) @file_get_contents($zipPath);
$multipartBody = '--' . $boundary . "\r\n"
    . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
    . $metadata . "\r\n"
    . '--' . $boundary . "\r\n"
    . "Content-Type: application/gzip\r\n\r\n"
    . $fileData . "\r\n"
    . '--' . $boundary . "--\r\n";
$ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $multipartBody,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $tokenResponse['access_token'],
        'Content-Type: multipart/related; boundary=' . $boundary,
        'Content-Length: ' . strlen($multipartBody),
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 300,
]);
$driveResponse = curl_exec($ch);
$driveStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$driveError = curl_error($ch);
curl_close($ch);
if ($driveResponse === false || $driveStatus < 200 || $driveStatus >= 300) {
    fwrite(STDERR, "Google Drive upload failed (HTTP {$driveStatus}): " . ($driveError ?: (string) $driveResponse) . "\n");
    exit(1);
}

$driveFile = json_decode($driveResponse, true);
echo "Backup uploaded to Google Drive: " . ($driveFile['name'] ?? basename($zipPath)) . "\n";

if ($recipient !== '') {
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        fwrite(STDERR, "Invalid backup recipient.\n");
        exit(1);
    }
    $subject = 'StitchFlow database backup uploaded - ' . $stamp . ' UTC';
    $sent = mail($recipient, $subject, "Backup uploaded to Google Drive: " . ($driveFile['name'] ?? basename($zipPath)) . "\r\n");
    if (!$sent) fwrite(STDERR, "Drive upload succeeded, but email notification failed.\n");
}

// Keep only the latest seven local copies after the Drive upload succeeds.
$files = glob(rtrim($backupDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'stitchflow_*.sql.gz') ?: [];
rsort($files, SORT_STRING);
foreach (array_slice($files, 7) as $oldFile) @unlink($oldFile);