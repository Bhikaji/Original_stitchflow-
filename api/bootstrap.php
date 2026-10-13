<?php
/* =====================================================================
   StitchFlow ERP — API bootstrap
   PDO connection + shared helpers used by the persist / assemble /
   validate layers.
   ===================================================================== */
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('memory_limit', '1024M');

function sf_config(): array {
    static $cfg = null;
    if ($cfg === null) $cfg = require dirname(__DIR__) . '/config.php';
    return $cfg;
}

function sf_ensure_schema(PDO $pdo): void {
    // Restrict automatic DDL migrations to CLI execution only to protect live database
    if (PHP_SAPI !== 'cli') {
        return;
    }
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $st = $pdo->query("SHOW COLUMNS FROM `purchase_order_items` LIKE 'item_id'");
        if ($st && $st->fetch()) {
            return;
        }
    } catch (Throwable $e) {
        // Table may not exist yet or query failed; fall through to auto_migrate
    }
    require_once __DIR__ . '/lib/auto_migrate.php';
    try {
        sf_run_auto_migrate($pdo);
    } catch (Throwable $e) {
        error_log('StitchFlow auto_migrate error: ' . $e->getMessage());
    }
}

function sf_pdo(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $c = sf_config()['db'];
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset={$c['charset']}";
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        sf_ensure_schema($pdo);
    }
    return $pdo;
}

function sf_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    $cookieParams = [
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ];
    session_set_cookie_params($cookieParams);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('SF_SESSID');
    @session_start();

    // 30-minute server-side session inactivity timeout (SEC-TIMEOUT)
    if (isset($_SESSION['sf_user'])) {
        $now = time();
        $idleLimit = 1800; // 30 minutes
        if (isset($_SESSION['sf_last_activity']) && ($now - $_SESSION['sf_last_activity'] > $idleLimit)) {
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000,
                    $params["path"], $params["domain"],
                    $params["secure"], $params["httponly"]
                );
            }
            @session_destroy();
            @session_start();
        } else {
            $_SESSION['sf_last_activity'] = $now;
        }
    }
}

function sf_current_user(): ?array {
    sf_session_start();
    return $_SESSION['sf_user'] ?? null;
}

function sf_require_auth(): array {
    $user = sf_current_user();
    if ($user === null) {
        $isApi = (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/') !== false)
            || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
            || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest');
        if ($isApi) {
            sf_fail('Authentication required. Please sign in.', 401);
        }
        $base = (strpos($_SERVER['REQUEST_URI'] ?? '', '/pages/') !== false) ? '../' : './';
        header('Location: ' . $base . 'index.php?auth_required=1');
        exit;
    }
    return $user;
}

function sf_require_role($roles): array {
    $user = sf_require_auth();
    $roles = (array)$roles;
    $userRole = (string)($user['role'] ?? '');
    if (!in_array($userRole, $roles, true)) {
        sf_fail('Access denied: insufficient permissions.', 403);
    }
    return $user;
}

function sf_user_can(string $scope, string $key, string $action = 'view'): bool {
    $user = sf_current_user();
    if ($user === null) return false;
    $role = (string)($user['role'] ?? '');
    if ($role === 'Admin') return true;
    if ($key === 'usermanagement' || $key === 'users') return false;

    $accessLevel = (string)($user['accessLevel'] ?? 'Detailed');
    if ($accessLevel === 'Read Only' && !in_array($action, ['view', 'export'], true)) {
        return false;
    }

    $perms = (array)($user['permissions'] ?? []);
    $scopePerms = (array)($perms[$scope] ?? []);
    $alias = ($key === 'items') ? 'itemmaster' : (($key === 'itemmaster') ? 'items' : null);
    $itemPerm = (array)($scopePerms[$key] ?? ($alias ? ($scopePerms[$alias] ?? []) : []));
    if (!empty($itemPerm)) {
        if (!empty($itemPerm[$action])) return true;
        if ($action === 'export' && !empty($itemPerm['view'])) return true;
        return false;
    }

    if ($scope === 'modules') {
        $mods = (array)($user['modules'] ?? []);
        if (in_array('*', $mods, true) || in_array($key, $mods, true) || ($alias && in_array($alias, $mods, true))) {
            return true;
        }
        $roleDefaults = [
            'Store'      => ['dashboard', 'po', 'inward', 'jobwork', 'processoutward', 'processinward', 'sample', 'styles', 'itemmaster', 'items', 'parties', 'reports'],
            'Production' => ['dashboard', 'jobwork', 'processoutward', 'processinward', 'sample', 'styles', 'itemmaster', 'items', 'parties', 'reports'],
            'Accounts'   => ['dashboard', 'po', 'inward', 'sale', 'salenumbers', 'saledashboard', 'costing', 'styles', 'itemmaster', 'items', 'parties', 'purchasereturn', 'reports'],
        ];
        $def = $roleDefaults[$role] ?? [];
        if (in_array($key, $def, true) || ($alias && in_array($alias, $def, true))) {
            return true;
        }
    }

    if ($scope === 'masters') {
        $mPerms = (array)($perms['masters'] ?? []);
        $targetPerm = !empty($mPerms[$key]) ? $mPerms[$key] : ($alias && !empty($mPerms[$alias]) ? $mPerms[$alias] : null);
        if ($targetPerm !== null) {
            return !empty($targetPerm[$action]);
        }
        $mods = (array)($user['modules'] ?? []);
        if (in_array('*', $mods, true) || in_array('masters', $mods, true)) {
            return true;
        }
        $roleDefaults = [
            'Store'      => true,
            'Production' => true,
            'Accounts'   => true,
        ];
        if (!empty($roleDefaults[$role])) {
            return true;
        }
    }

    return false;
}

function sf_require_perm(string $scope, string $key, string $action = 'view'): array {
    $user = sf_require_auth();
    if (!sf_user_can($scope, $key, $action)) {
        sf_fail("Access denied: You do not have permission to {$action} {$key}.", 403);
    }
    return $user;
}

function sf_csrf_token(): string {
    sf_session_start();
    if (empty($_SESSION['sf_csrf'])) {
        $_SESSION['sf_csrf'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['sf_csrf'];
}

function sf_verify_csrf(): bool {
    sf_session_start();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? null;
    if (!is_string($token) || empty($_SESSION['sf_csrf'])) {
        return false;
    }
    return hash_equals($_SESSION['sf_csrf'], $token);
}

function sf_json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sf_fail(string $message, int $code = 422): void {
    sf_json_out(['ok' => false, 'error' => $message], $code);
}

function sf_read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') sf_fail('Empty request body', 400);
    $data = json_decode($raw, true);
    if (!is_array($data)) sf_fail('Invalid JSON payload', 400);
    return $data;
}

/* ---------- small value helpers (mirror the JS pf()/string handling) --- */
function pf($v): float {
    if (is_numeric($v)) return (float)$v;
    if (is_string($v)) { $f = (float)str_replace(',', '', trim($v)); return is_nan($f) ? 0.0 : $f; }
    return 0.0;
}
function s($v): string { return is_scalar($v) ? trim((string)$v) : ''; }
function lc($v): string { return mb_strtolower(s($v)); }
function nz($v) { $t = s($v); return $t === '' ? null : $t; }
function nd($v) { // normalise a yyyy-mm-dd date or null
    $t = s($v);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $t) ? $t : null;
}
function ni($v) { return is_numeric($v) ? (int)$v : null; }
function b01($v): int { return ($v === false || $v === 0 || $v === '0' || $v === null) ? ($v === null ? 1 : 0) : ($v ? 1 : 0); }

/* keep only keys NOT stored in explicit columns → extra_json (lossless) */
function extra_json(array $row, array $knownKeys): ?string {
    $rest = array_diff_key($row, array_flip($knownKeys));
    if (!$rest) return null;
    return json_encode($rest, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function merge_extra(array $doc, $extraJson): array {
    if (!$extraJson) return $doc;
    $extra = json_decode((string)$extraJson, true);
    if (is_array($extra)) foreach ($extra as $k => $v) if (!array_key_exists($k, $doc)) $doc[$k] = $v;
    return $doc;
}

/* current audit user (strictly derived from authenticated session) */
function sf_actor(): string {
    $u = sf_current_user();
    if ($u !== null) {
        if (!empty($u['name'])) return mb_substr((string)$u['name'], 0, 120);
        if (!empty($u['username'])) return mb_substr((string)$u['username'], 0, 120);
    }
    if (PHP_SAPI === 'cli') {
        return 'CLI System';
    }
    return 'Authenticated User';
}
