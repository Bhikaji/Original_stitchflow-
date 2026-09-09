<?php
/* StitchFlow ERP — User Management module
   GET (list/single) · POST/PUT (add/edit — plain PINs are hashed exactly like the
   app: sha256:<hex>) · DELETE. Duplicate usernames rejected server-side. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$db = sf_load_db();
$users = array_values(array_filter((array)($db['users'] ?? []), 'is_array'));

if ($method === 'GET') {
    $id = s($_GET['id'] ?? '');
    if ($id !== '') {
        foreach ($users as $u) if (s($u['id'] ?? '') === $id || lc($u['username'] ?? '') === lc($id)) sf_json_out(['ok' => true, 'record' => $u]);
        sf_fail('User not found', 404);
    }
    sf_json_out(['ok' => true, 'module' => 'usermanagement'] + sf_listing($users, $_GET));
}

if ($method === 'POST' || $method === 'PUT') {
    $doc = sf_read_json_body();
    if (isset($doc['pin']) && s($doc['pin']) !== '' && strncmp(s($doc['pin']), 'sha256:', 7) !== 0) {
        $doc['pin'] = 'sha256:' . hash('sha256', s($doc['pin']));   // hashPin() equivalent
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
