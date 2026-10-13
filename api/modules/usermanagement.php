<?php
/* StitchFlow ERP — User Management module
   GET (list/single) · POST/PUT (add/edit — plain PINs are hashed exactly like the
   app: sha256:<hex>) · DELETE. Duplicate usernames rejected server-side. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

sf_require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = sf_load_db();
$users = array_values(array_filter((array)($db['users'] ?? []), 'is_array'));

if ($method === 'GET') {
    $id = s($_GET['id'] ?? '');
    if ($id !== '') {
        foreach ($users as $u) {
            if (s($u['id'] ?? '') === $id || lc($u['username'] ?? '') === lc($id)) {
                unset($u['pin']);
                sf_json_out(['ok' => true, 'record' => $u]);
            }
        }
        sf_fail('User not found', 404);
    }
    $sanitized = array_map(function ($u) {
        unset($u['pin']);
        return $u;
    }, $users);
    sf_json_out(['ok' => true, 'module' => 'usermanagement'] + sf_listing($sanitized, $_GET));
}

if ($method === 'POST' || $method === 'PUT') {
    sf_require_role(['Admin']);
    $doc = sf_read_json_body();
    if (isset($doc['pin']) && s($doc['pin']) !== '') {
        $rawPin = s($doc['pin']);
        if (strpos($rawPin, '$2y$') !== 0 && strpos($rawPin, '$argon2id$') !== 0) {
            $doc['pin'] = password_hash($rawPin, PASSWORD_DEFAULT);
        }
    }
    $id = s($doc['id'] ?? '');
    $isNew = true;
    foreach ((array)$db['users'] as $i => $ex) {
        if (is_array($ex) && $id !== '' && s($ex['id'] ?? '') === $id) {
            if (!isset($doc['pin']) || s($doc['pin']) === '') unset($doc['pin']);   // keep old PIN
            $db['users'][$i] = array_merge($ex, $doc);
            $doc = $db['users'][$i]; $isNew = false; break;
        }
    }
    if ($isNew) {
        if (s($doc['username'] ?? '') === '') sf_fail('Username is required', 422);
        if (s($doc['name'] ?? '') === '') sf_fail('Full Name is required', 422);
        if (s($doc['pin'] ?? '') === '') sf_fail('PIN is required', 422);
        $db['seq'] = (array)($db['seq'] ?? []);
        $db['seq']['user'] = (int)pf($db['seq']['user'] ?? 0) + 1;
        if ($id === '') $doc['id'] = 'USR-' . str_pad((string)$db['seq']['user'], 4, '0', STR_PAD_LEFT);
        $doc += ['role' => 'Custom', 'status' => 'Active', 'accessLevel' => 'Detailed', 'modules' => []];
        $db['users'][] = $doc;
    }
    sf_commit_db($db);
    unset($doc['pin']);
    sf_json_out(['ok' => true, 'action' => $isNew ? 'created' : 'updated', 'record' => $doc]);
}

if ($method === 'DELETE') {
    sf_require_role(['Admin']);
    $id = s($_GET['id'] ?? '');
    if ($id === '') sf_fail('id is required', 400);
    if ($id === 'USR-0001') sf_fail('The root System Administrator cannot be deleted', 422);
    $found = false;
    $db['users'] = array_values(array_filter((array)$db['users'], function ($u) use ($id, &$found) {
        if (is_array($u) && s($u['id'] ?? '') === $id) { $found = true; return false; }
        return true;
    }));
    if (!$found) sf_fail('User not found', 404);
    sf_commit_db($db);
    sf_json_out(['ok' => true, 'action' => 'deleted', 'id' => $id]);
}
sf_fail('Method not allowed', 405);
