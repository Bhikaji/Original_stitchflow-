<?php
/* CLI-only database backup with local disk retention & optional Google Drive upload.
   Configure cron schedule in cPanel or Task Scheduler. */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$config = require __DIR__ . '/config.php';
$db = $config['db'];
$driveCredentialsFile = getenv('STITCHFLOW_DRIVE_SERVICE_ACCOUNT_FILE') ?: '';
$googleClientId = getenv('STITCHFLOW_GOOGLE_CLIENT_ID') ?: '';
$googleClientSecret = getenv('STITCHFLOW_GOOGLE_CLIENT_SECRET') ?: '';
$googleRefreshToken = getenv('STITCHFLOW_GOOGLE_REFRESH_TOKEN') ?: '';
$driveFolderId = getenv('STITCHFLOW_DRIVE_FOLDER_ID') ?: '1COCYE739q8-5GUpf0J8HwT757Q5ZJSs0';
$recipient = getenv('STITCHFLOW_BACKUP_EMAIL') ?: '';

$backupDir = getenv('STITCHFLOW_BACKUP_DIR') ?: (__DIR__ . DIRECTORY_SEPARATOR . 'backups');
$mysqldump = getenv('STITCHFLOW_MYSQLDUMP') ?: (
    is_file('C:\\xampp2\\mysql\\bin\\mysqldump.exe') ? 'C:\\xampp2\\mysql\\bin\\mysqldump.exe' : (
        is_file('/usr/bin/mysqldump') ? '/usr/bin/mysqldump' : 'mysqldump'
    )
);

if (!is_dir($backupDir)) {
    if (!mkdir($backupDir, 0700, true) && !is_dir($backupDir)) {
        fwrite(STDERR, "Backup directory could not be created: {$backupDir}\n");
        exit(1);
    }
}

// SEC-16: Ensure backups directory is protected against direct web HTTP requests
$htaccessPath = rtrim($backupDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '.htaccess';
if (!is_file($htaccessPath)) {
    file_put_contents($htaccessPath, "<IfModule authz_core_module>\n    Require all denied\n</IfModule>\n<IfModule !authz_core_module>\n    Deny from all\n</IfModule>\n");
}

$stamp = gmdate('Y-m-d_H-i-s');
$sqlPath = rtrim($backupDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'stitchflow_' . $stamp . '.sql';
$zipPath = $sqlPath . '.gz';

// SEC-09 Hardening: Avoid passing password in command-line arguments to prevent process-table exposure
$tempCnf = tempnam($backupDir, 'sf_mycnf_');
if ($tempCnf === false) {
    fwrite(STDERR, "Unable to create secure temporary database config file.\n");
    exit(1);
}
@chmod($tempCnf, 0600);
$cnfContent = "[client]\n"
    . "host=" . addcslashes((string)$db['host'], "\n\r\"") . "\n"
    . "port=" . (int)$db['port'] . "\n"
    . "user=" . addcslashes((string)$db['user'], "\n\r\"") . "\n"
    . "password=" . addcslashes((string)$db['pass'], "\n\r\"") . "\n";
file_put_contents($tempCnf, $cnfContent);

$command = implode(' ', [
    escapeshellarg($mysqldump),
    '--defaults-extra-file=' . escapeshellarg($tempCnf),
    '--single-transaction --quick --routines --triggers --hex-blob',
    escapeshellarg((string) $db['name']),
    '>', escapeshellarg($sqlPath), '2>&1',
]);

$output = [];
$status = 0;
exec($command, $output, $status);
@unlink($tempCnf);
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

$uploadPath = $zipPath;
$uploadMime = 'application/gzip';
$encryptionKey = getenv('STITCHFLOW_BACKUP_ENCRYPTION_KEY') ?: '';
if ($encryptionKey !== '') {
    $encPath = $zipPath . '.enc';
    $iv = random_bytes(16);
    $plaintext = file_get_contents($zipPath);
    if ($plaintext !== false) {
        $ciphertext = openssl_encrypt($plaintext, 'aes-256-cbc', hash('sha256', $encryptionKey, true), OPENSSL_RAW_DATA, $iv);
        if ($ciphertext !== false) {
            file_put_contents($encPath, $iv . $ciphertext);
            $uploadPath = $encPath;
            $uploadMime = 'application/octet-stream';
            echo "Backup encrypted with AES-256-CBC at rest: {$encPath} (" . round(filesize($encPath) / 1024, 1) . " KB)\n";
        }
    }
}

echo "Local database backup created successfully: {$zipPath} (" . round(filesize($zipPath) / 1024, 1) . " KB)\n";

// DB-03 Retention: Prune local copies, keeping the latest 14 backups
$files = glob(rtrim($backupDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'stitchflow_*.sql.gz*') ?: [];
rsort($files, SORT_STRING);
$pruned = 0;
foreach (array_slice($files, 14) as $oldFile) {
    if (@unlink($oldFile)) $pruned++;
}
if ($pruned > 0) {
    echo "Retention policy: Pruned {$pruned} older local backup(s).\n";
}

// Google Drive cloud upload (if configured)
$hasOAuth = ($googleClientId !== '' && $googleClientSecret !== '' && $googleRefreshToken !== '');
$hasServiceAccount = ($driveCredentialsFile !== '' && is_file($driveCredentialsFile));

if (!$hasOAuth && !$hasServiceAccount) {
    echo "Cloud backup skipped: Google Drive credentials not configured. Local backup is safely retained.\n";
    exit(0);
}

$tokenRequest = [
    'grant_type' => 'refresh_token',
    'client_id' => $googleClientId,
    'client_secret' => $googleClientSecret,
    'refresh_token' => $googleRefreshToken,
];

if (!$hasOAuth && $hasServiceAccount) {
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
    $tokenRequest = [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $signingInput . '.' . $base64Url($signature),
    ];
}

$tokenCurl = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($tokenCurl, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($tokenRequest),
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);
$tokenBody = curl_exec($tokenCurl);
$tokenError = curl_error($tokenCurl);
$tokenStatus = (int) curl_getinfo($tokenCurl, CURLINFO_HTTP_CODE);
curl_close($tokenCurl);
$tokenResponse = json_decode((string) $tokenBody, true);
if (!is_array($tokenResponse) || empty($tokenResponse['access_token'])) {
    fwrite(STDERR, "Google Drive access token request failed (HTTP {$tokenStatus}): " . ($tokenError ?: (string) $tokenBody) . "\n");
    exit(1);
}

$metadata = json_encode([
    'name' => basename($uploadPath),
    'parents' => [$driveFolderId],
    'description' => 'Automated StitchFlow database backup generated at ' . $stamp . ' UTC.',
], JSON_THROW_ON_ERROR);
$boundary = '=_stitchflow_drive_' . bin2hex(random_bytes(12));
$fileData = (string) @file_get_contents($uploadPath);
$multipartBody = '--' . $boundary . "\r\n"
    . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
    . $metadata . "\r\n"
    . '--' . $boundary . "\r\n"
    . "Content-Type: " . $uploadMime . "\r\n\r\n"
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