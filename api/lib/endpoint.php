<?php
/* =====================================================================
   StitchFlow ERP — shared endpoint engine
   Powers the per-module (api/modules/*.php) and per-master
   (api/masters/*.php) endpoint files. Every endpoint works on the same
   normalized MySQL schema through assemble/persist, and EVERY write is
   checked by the full server-side business-rule validator, so the API
   can never produce data the original application would reject.

   Common features implemented for every master/module endpoint:
     list · view single · add · edit · delete · activate/deactivate ·
     search (?q=) · filter (?status=/?field=value) · pagination
     (?page=&per=) · sorting (?sort=&dir=) · duplicate validation ·
     required-field validation · in-use detection (?usage=) ·
     created/updated by + dates.
   v5 rule preserved: deleting an in-use record is allowed — the
   response carries the "usedBy" list as a warning, exactly like the
   original application's confirmation dialog.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/persist.php';
require_once __DIR__ . '/assemble.php';
require_once __DIR__ . '/validate.php';

/* ---------- ID / number generation (mirrors the app exactly) -------- */
function sf_uid_new(): string { return 'id' . base_convert((string)time(), 10, 36) . bin2hex(random_bytes(4)); }

const SF_DOC_PREFIX = [
    'po' => 'PO', 'inward' => 'IN', 'jobwork' => 'JW', 'sample' => 'SMP', 'sale' => 'SL',
    'costing' => 'CST', 'purchasereturn' => 'PR', 'jobworkreturn' => 'JWR', 'processinward' => 'PRI',
];

function sf_next_no(array &$db, string $key, string $prefix, int $pad = 4): string {
    $db['seq'] = is_array($db['seq'] ?? null) ? $db['seq'] : [];
    $db['seq'][$key] = (int)pf($db['seq'][$key] ?? 0) + 1;
    return $prefix . '-' . str_pad((string)$db['seq'][$key], $pad, '0', STR_PAD_LEFT);
}

/* processTypeAbbr() + nextProcessOutwardNo() from the app */
function sf_process_abbr(string $type): string {
    $clean = strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper($type)));
    return str_pad(substr($clean, 0, 3) ?: 'PRO', 3, 'X');
}
function sf_next_process_outward_no(array &$db, string $type): string {
    $max = (int)pf($db['seq']['processoutward'] ?? 0);
    foreach ((is_array($db['processoutward'] ?? null) ? $db['processoutward'] : []) as $r) {
        if (is_array($r) && preg_match('/^[A-Z0-9]{3}-(\d+)$/', s($r['no'] ?? ''), $m)) {
            $max = max($max, (int)$m[1]);
        }
    }
    $db['seq']['processoutward'] = $max + 1;
    return sf_process_abbr($type) . '-' . str_pad((string)$db['seq']['processoutward'], 5, '0', STR_PAD_LEFT);
}

/* midPrefix() map from the app — master value IDs like CAT-0001 */
const SF_MID_PREFIX = [
    'raisedForList' => 'RFL', 'categories' => 'CAT', 'classifications' => 'CLS', 'sizes' => 'SIZ',
    'qcResults' => 'QCR', 'gstRates' => 'GST', 'uoms' => 'UOM', 'washTypes' => 'WAS',
    'processTypes' => 'PRT', 'gstTypes' => 'GTY', 'paymentTermsList' => 'PAY',
    'freightChargesList' => 'FRT', 'transportModes' => 'TRN', 'businessTypes' => 'BTY',
    'partyStatuses' => 'STS', 'warehouses' => 'WH', 'returnTypes' => 'RTN',
    'countries' => 'CNT', 'states' => 'STA',
];
function sf_mid_prefix(string $k): string {
    if (isset(SF_MID_PREFIX[$k])) return SF_MID_PREFIX[$k];
    $p = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $k), 0, 3));
    return $p !== '' ? $p : 'MST';
}

/* ---------- load / save the whole db around one mutation ------------ */
function sf_load_db(): array {
    if (!sf_initialized()) {
        /* empty installation — start from an empty structural db */
        return ['seq' => [], 'po' => [], 'inward' => [], 'jobwork' => [], 'processoutward' => [],
                'processinward' => [], 'sample' => [], 'sale' => [], 'costing' => [],
                'purchasereturn' => [], 'jobworkreturn' => [], 'auditTrail' => [],
                'customReports' => [], 'users' => [], 'masters' => []];
    }
    return assemble_db();
}
function sf_commit_db(array $db): void {
    $err = sf_validate_db($db);
    if ($err !== null) sf_fail($err, 422);
    persist_db($db, sf_actor());
}

/* ---------- list helpers: search / filter / sort / paginate --------- */
function sf_listing(array $rows, array $qs): array {
    $q = mb_strtolower(s($qs['q'] ?? ''));
    if ($q !== '') {
        $rows = array_values(array_filter($rows, function ($r) use ($q) {
            return mb_stripos(json_encode($r, JSON_UNESCAPED_UNICODE), $q) !== false;
        }));
    }
    foreach ($qs as $k => $v) {
        if (in_array($k, ['q','sort','dir','page','per','id','no','value','usage','report','module','master'], true)) continue;
        $vv = s($v);
        if ($vv === '') continue;
        $rows = array_values(array_filter($rows, function ($r) use ($k, $vv) {
            return is_array($r) && mb_strtolower(s($r[$k] ?? '')) === mb_strtolower($vv);
        }));
    }
    $total = count($rows);
    $sort = s($qs['sort'] ?? '');
    if ($sort !== '') {
        $dir = strtolower(s($qs['dir'] ?? 'asc')) === 'desc' ? -1 : 1;
        usort($rows, function ($a, $b) use ($sort, $dir) {
            $x = $a[$sort] ?? null; $y = $b[$sort] ?? null;
            if (is_numeric($x) && is_numeric($y)) return $dir * (pf($x) <=> pf($y));
            return $dir * strnatcasecmp(s($x), s($y));
        });
    }
    $per = max(1, min(500, (int)($qs['per'] ?? 50)));
    $page = max(1, (int)($qs['page'] ?? 1));
    $paged = array_key_exists('page', $qs) || array_key_exists('per', $qs);
    if ($paged) $rows = array_slice($rows, ($page - 1) * $per, $per);
    return ['total' => $total, 'page' => $paged ? $page : 1, 'per' => $paged ? $per : $total, 'rows' => $rows];
}

/* ---------- in-use detection (mirrors the app's usedIn checks) ------ */
function sf_master_usage(array $db, string $key, string $value): array {
    $used = [];
    $lc = mb_strtolower(trim($value));
    $hit = function (string $ref) use (&$used) { if (!in_array($ref, $used, true)) $used[] = $ref; };
    $each = function (string $coll, callable $fn) use ($db) {
        foreach ((is_array($db[$coll] ?? null) ? $db[$coll] : []) as $d) if (is_array($d)) $fn($d);
    };
    $eq = function ($v) use ($lc) { return mb_strtolower(s($v)) === $lc; };

    if ($key === 'styles') {
        $each('po', function ($d) use ($eq, $hit) { foreach ((array)($d['styles'] ?? []) as $st) if ($eq($st)) $hit('PO ' . s($d['no'] ?? '')); });
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $c => $lbl) {
            $each($c, function ($d) use ($eq, $hit, $lbl) {
                foreach ((array)($d['styles'] ?? []) as $st) if ($eq($st)) $hit($lbl . ' ' . s($d['no'] ?? ''));
                foreach ((array)($d['garments'] ?? []) as $g) if (is_array($g) && ($eq($g['style'] ?? '') || $eq($g['desc'] ?? ''))) $hit($lbl . ' ' . s($d['no'] ?? ''));
            });
        }
        foreach (['processoutward' => 'Process Outward', 'processinward' => 'Process Inward'] as $c => $lbl) {
            $each($c, function ($d) use ($eq, $hit, $lbl) { foreach ((array)($d['items'] ?? []) as $it) if (is_array($it) && $eq($it['style'] ?? '')) $hit($lbl . ' ' . s($d['no'] ?? '')); });
        }
        return $used;
    }
    if ($key === 'items') {
        $each('po', function ($d) use ($eq, $hit) { foreach ((array)($d['items'] ?? []) as $it) if (is_array($it) && $eq($it['name'] ?? '')) $hit('PO ' . s($d['no'] ?? '')); });
        $each('inward', function ($d) use ($eq, $hit) { foreach ((array)($d['items'] ?? []) as $it) if (is_array($it) && $eq($it['name'] ?? '')) $hit('Inward ' . s($d['no'] ?? '')); });
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $c => $lbl) {
            $each($c, function ($d) use ($eq, $hit, $lbl) {
                foreach (array_merge((array)($d['issues'] ?? []), (array)($d['extras'] ?? [])) as $l)
                    if (is_array($l) && $eq($l['item'] ?? '')) $hit($lbl . ' ' . s($d['no'] ?? ''));
            });
        }
        $each('purchasereturn', function ($d) use ($eq, $hit) { foreach ((array)($d['items'] ?? []) as $it) if (is_array($it) && $eq($it['name'] ?? '')) $hit('Purchase Return ' . s($d['no'] ?? '')); });
        $each('jobworkreturn', function ($d) use ($eq, $hit) { foreach ((array)($d['items'] ?? []) as $it) if (is_array($it) && $eq($it['name'] ?? '')) $hit('Job Work Return ' . s($d['no'] ?? '')); });
        return $used;
    }
    if ($key === 'parties') {
        $each('po', function ($d) use ($eq, $hit) { if ($eq($d['supplier'] ?? '') || $eq($d['buyer'] ?? '')) $hit('PO ' . s($d['no'] ?? '')); });
        $each('inward', function ($d) use ($eq, $hit) { if ($eq($d['supplier'] ?? '') || $eq($d['vendor'] ?? '')) $hit('Inward ' . s($d['no'] ?? '')); });
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $c => $lbl)
            $each($c, function ($d) use ($eq, $hit, $lbl) { if ($eq($d['vendor'] ?? '')) $hit($lbl . ' ' . s($d['no'] ?? '')); });
        $each('processoutward', function ($d) use ($eq, $hit) { if ($eq($d['processor'] ?? '')) $hit('Process Outward ' . s($d['no'] ?? '')); });
        $each('sale', function ($d) use ($eq, $hit) { if ($eq($d['customer'] ?? '')) $hit('Sale ' . s($d['no'] ?? '')); });
        return $used;
    }

    /* targeted checks for list masters */
    $map = [
        'warehouses'         => [['inward','warehouse','Inward'], ['purchasereturn','warehouse','Purchase Return'], ['jobworkreturn','warehouse','Job Work Return'], ['processinward','warehouse','Process Inward']],
        'processTypes'       => [['processoutward','processType','Process Outward'], ['processinward','processType','Process Inward']],
        'customers'          => [['sale','customer','Sale']],
        'suppliers'          => [['po','supplier','PO'], ['inward','supplier','Inward']],
        'raisedForList'      => [['po','raisedFor','PO']],
        'paymentTermsList'   => [['po','payTerms','PO']],
        'freightChargesList' => [['po','freightCharges','PO']],
        'transportModes'     => [['po','transportMode','PO']],
        'gstTypes'           => [['po','gstType','PO']],
        'washTypes'          => [],
        'returnTypes'        => [],
        'qcResults'          => [],
    ];
    if (isset($map[$key])) {
        foreach ($map[$key] as [$coll, $field, $lbl]) {
            $each($coll, function ($d) use ($eq, $hit, $field, $lbl) { if ($eq($d[$field] ?? '')) $hit($lbl . ' ' . s($d['no'] ?? '')); });
        }
    }
    /* generic deep checks for value-bearing line fields */
    $lineChecks = [
        'colours'         => [['po','items','color','PO'], ['inward','items','color','Inward']],
        'classifications' => [['po','items','classification','PO'], ['inward','items','classification','Inward']],
        'uoms'            => [['po','items','unit','PO'], ['inward','items','unit','Inward']],
        'returnTypes'     => [['jobworkreturn','items','returnType','Job Work Return']],
        'qcResults'       => [],
        'washTypes'       => [],
    ];
    if (isset($lineChecks[$key])) {
        foreach ($lineChecks[$key] as [$coll, $sub, $field, $lbl]) {
            $each($coll, function ($d) use ($eq, $hit, $sub, $field, $lbl) {
                foreach ((array)($d[$sub] ?? []) as $it) if (is_array($it) && $eq($it[$field] ?? '')) $hit($lbl . ' ' . s($d['no'] ?? ''));
            });
        }
    }
    if ($key === 'washTypes') {
        $each('costing', function ($d) use ($eq, $hit) { if (is_array($d['order'] ?? null) && $eq($d['order']['washType'] ?? '')) $hit('Costing ' . s($d['no'] ?? '')); });
    }
    if ($key === 'qcResults') {
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $c => $lbl)
            $each($c, function ($d) use ($eq, $hit, $lbl) { foreach ((array)($d['receipts'] ?? []) as $r) if (is_array($r) && $eq($r['qc'] ?? '')) $hit($lbl . ' ' . s($d['no'] ?? '')); });
    }
    if (in_array($key, ['categories','classifications','qualities','uoms','gstRates','materialTypes'], true)) {
        $field = ['categories'=>'category','classifications'=>'classification','qualities'=>'quality','uoms'=>'unit','gstRates'=>'gst','materialTypes'=>'materialType'][$key];
        foreach ((array)($db['masters']['items'] ?? []) as $it)
            if (is_array($it) && $eq($it[$field] ?? '')) $hit('Item ' . s($it['name'] ?? ''));
    }
    if ($key === 'sizes') {
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $c => $lbl) {
            $each($c, function ($d) use ($lc, $hit, $lbl) {
                foreach ((array)($d['garments'] ?? []) as $g) if (is_array($g))
                    foreach (array_keys((array)($g['sizes'] ?? [])) as $sz)
                        if (mb_strtolower((string)$sz) === $lc) $hit($lbl . ' ' . s($d['no'] ?? ''));
            });
        }
    }
    if (in_array($key, ['countries','states','districts','talukas','businessTypes','partyStatuses'], true)) {
        $field = ['countries'=>'country','states'=>'state','districts'=>'district','talukas'=>'taluka','businessTypes'=>'businessType','partyStatuses'=>'status'][$key];
        foreach ((array)($db['masters']['parties'] ?? []) as $p)
            if (is_array($p) && (mb_stripos(s($p[$field] ?? ''), trim($value)) !== false))
                $hit('Party ' . s($p['legalName'] ?? ''));
    }
    return $used;
}

/* =====================================================================
   MODULE ENDPOINT — full CRUD for one transaction collection
   ===================================================================== */
function sf_module_endpoint(string $key): void {
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $db = sf_load_db();
        $docs = is_array($db[$key] ?? null) ? array_values(array_filter($db[$key], 'is_array')) : [];

        if ($method === 'GET') {
            $id = s($_GET['id'] ?? ''); $no = s($_GET['no'] ?? '');
            if ($id !== '' || $no !== '') {
                foreach ($docs as $d) {
                    if (($id !== '' && s($d['id'] ?? '') === $id) || ($no !== '' && s($d['no'] ?? '') === $no)) {
                        sf_json_out(['ok' => true, 'record' => $d]);
                    }
                }
                sf_fail('Record not found', 404);
            }
            sf_json_out(['ok' => true] + sf_listing($docs, $_GET) + ['module' => $key]);
        }

        if ($method === 'POST' || $method === 'PUT') {
            $doc = sf_read_json_body();
            $id = s($doc['id'] ?? '');
            $isNew = true;
            if ($id !== '') {
                foreach ($db[$key] as $i => $ex) {
                    if (is_array($ex) && s($ex['id'] ?? '') === $id) {
                        /* edit: merge over the existing record (like Object.assign in the app) */
                        $db[$key][$i] = array_merge($ex, $doc);
                        $isNew = false;
                        $doc = $db[$key][$i];
                        break;
                    }
                }
            }
            if ($isNew) {
                if ($id === '') $doc['id'] = sf_uid_new();
                if (s($doc['no'] ?? '') === '') {
                    if ($key === 'processoutward') $doc['no'] = sf_next_process_outward_no($db, s($doc['processType'] ?? ''));
                    elseif ($key === 'customReports') $doc['id'] = s($doc['id'] ?? '') ?: ('RPT-' . base_convert((string)(int)(microtime(true) * 1000), 10, 36));
                    elseif (isset(SF_DOC_PREFIX[$key])) $doc['no'] = sf_next_no($db, $key, SF_DOC_PREFIX[$key]);
                }
                if (!isset($doc['createdAt'])) $doc['createdAt'] = (int)(microtime(true) * 1000);
                $db[$key] = $db[$key] ?? [];
                $db[$key][] = $doc;
            }
            sf_commit_db($db);
            sf_json_out(['ok' => true, 'action' => $isNew ? 'created' : 'updated', 'record' => $doc]);
        }

        if ($method === 'DELETE') {
            $id = s($_GET['id'] ?? '');
            if ($id === '') sf_fail('id is required', 400);
            $found = false;
            $db[$key] = array_values(array_filter((array)($db[$key] ?? []), function ($d) use ($id, &$found) {
                if (is_array($d) && s($d['id'] ?? '') === $id) { $found = true; return false; }
                return true;
            }));
            if (!$found) sf_fail('Record not found', 404);
            sf_commit_db($db);
            sf_json_out(['ok' => true, 'action' => 'deleted', 'id' => $id]);
        }

        sf_fail('Method not allowed', 405);
    } catch (PDOException $e) { sf_fail('Database error: ' . $e->getMessage(), 500); }
      catch (Throwable $e) { if ($e instanceof Error) sf_fail('Server error: ' . $e->getMessage(), 500); throw $e; }
}

/* =====================================================================
   LIST-MASTER ENDPOINT — full CRUD for one master_values master
   ===================================================================== */
function sf_to_array($v): array {
    if (is_array($v)) { foreach ($v as $k => $x) if (is_object($x) || is_array($x)) $v[$k] = sf_to_array($x); return $v; }
    if (is_object($v)) return sf_to_array((array)$v);
    return [];
}

function sf_list_master_endpoint(string $key): void {
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $db = sf_load_db();
        $m = &$db['masters'];
        foreach (['masterIds', 'masterStatus', 'parentMap', 'masterIdSeq', 'warehouseAddr'] as $meta) {
            $m[$meta] = sf_to_array($m[$meta] ?? []);
        }
        $list = array_values(array_filter((array)($m[$key] ?? []), 'is_scalar'));
        $ids = (array)($m['masterIds'][$key] ?? []);
        $status = (array)($m['masterStatus'][$key] ?? []);
        $parents = (array)($m['parentMap'][$key] ?? []);
        $whAddr = (array)($m['warehouseAddr'] ?? []);

        $rowFor = function ($v) use ($ids, $status, $parents, $whAddr, $key) {
            $lk = mb_strtolower(trim((string)$v));
            $row = [
                'id' => s($ids[$lk] ?? ''), 'value' => (string)$v,
                'active' => !array_key_exists($lk, $status) || (bool)$status[$lk],
                'parent' => s($parents[(string)$v] ?? ''),
            ];
            if ($key === 'warehouses') $row['address'] = s($whAddr[(string)$v] ?? '');
            return $row;
        };

        if ($method === 'GET') {
            $usage = s($_GET['usage'] ?? '');
            if ($usage !== '') sf_json_out(['ok' => true, 'value' => $usage, 'usedBy' => sf_master_usage($db, $key, $usage)]);
            $rows = array_map($rowFor, $list);
            sf_json_out(['ok' => true, 'master' => $key] + sf_listing($rows, $_GET));
        }

        if ($method === 'POST' || $method === 'PUT') {
            $body = sf_read_json_body();
            $value = s($body['value'] ?? '');
            if ($value === '') sf_fail('Value is required', 422);
            $old = s($body['oldValue'] ?? '');
            $lkNew = mb_strtolower($value);
            $lkOld = mb_strtolower($old);
            $lcList = array_map(function ($v) { return mb_strtolower(trim((string)$v)); }, $list);
            /* duplicate validation: renaming into another existing value is not allowed;
               re-posting the same value acts as an update (status / parent / address) */
            if ($old !== '' && $lkOld !== $lkNew && in_array($lkNew, $lcList, true)) {
                sf_fail("“{$value}” already exists in this master — duplicate values are not allowed", 422);
            }
            $isRename = $old !== '' && in_array($lkOld, $lcList, true) && $lkOld !== $lkNew;
            if ($isRename) {
                foreach ($m[$key] as $i => $v) {
                    if (is_scalar($v) && mb_strtolower(trim((string)$v)) === $lkOld) { $m[$key][$i] = $value; break; }
                }
                /* carry over id / status / parent / address to the new value */
                if (isset($m['masterIds'][$key][$lkOld])) { $m['masterIds'][$key][$lkNew] = $m['masterIds'][$key][$lkOld]; if ($lkOld !== $lkNew) unset($m['masterIds'][$key][$lkOld]); }
                if (isset($m['masterStatus'][$key][$lkOld])) { $m['masterStatus'][$key][$lkNew] = $m['masterStatus'][$key][$lkOld]; if ($lkOld !== $lkNew) unset($m['masterStatus'][$key][$lkOld]); }
                if (isset($m['parentMap'][$key][$old])) { $m['parentMap'][$key][$value] = $m['parentMap'][$key][$old]; if ($old !== $value) unset($m['parentMap'][$key][$old]); }
                if ($key === 'warehouses' && isset($m['warehouseAddr'][$old])) { $m['warehouseAddr'][$value] = $m['warehouseAddr'][$old]; if ($old !== $value) unset($m['warehouseAddr'][$old]); }
            } elseif (!in_array($lkNew, $lcList, true)) {
                $m[$key] = array_values((array)($m[$key] ?? []));
                $m[$key][] = $value;
                /* assign master ID exactly like the app: midPrefix + shared per-master sequence */
                $m['masterIds'] = (array)($m['masterIds'] ?? []); $m['masterIds'][$key] = (array)($m['masterIds'][$key] ?? []);
                $m['masterIdSeq'] = (array)($m['masterIdSeq'] ?? []);
                $m['masterStatus'] = (array)($m['masterStatus'] ?? []); $m['masterStatus'][$key] = (array)($m['masterStatus'][$key] ?? []);
                $seq = (int)pf($m['masterIdSeq'][$key] ?? 0) + 1;
                $m['masterIdSeq'][$key] = $seq;
                $m['masterIds'][$key][$lkNew] = sf_mid_prefix($key) . '-' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
                $m['masterStatus'][$key][$lkNew] = true;
            }
            /* activate / deactivate */
            if (array_key_exists('active', $body)) {
                $m['masterStatus'] = (array)($m['masterStatus'] ?? []); $m['masterStatus'][$key] = (array)($m['masterStatus'][$key] ?? []);
                $m['masterStatus'][$key][$lkNew] = (bool)$body['active'];
            }
            /* parent master (Country→State→District→Taluka chains) */
            if (array_key_exists('parent', $body)) {
                $m['parentMap'] = (array)($m['parentMap'] ?? []); $m['parentMap'][$key] = (array)($m['parentMap'][$key] ?? []);
                if (s($body['parent']) === '') unset($m['parentMap'][$key][$value]);
                else $m['parentMap'][$key][$value] = s($body['parent']);
            }
            /* warehouse dispatch address */
            if ($key === 'warehouses' && array_key_exists('address', $body)) {
                $m['warehouseAddr'] = (array)($m['warehouseAddr'] ?? []);
                if (s($body['address']) === '') unset($m['warehouseAddr'][$value]);
                else $m['warehouseAddr'][$value] = s($body['address']);
            }
            sf_commit_db($db);
            $freshList = array_values(array_filter((array)($db['masters'][$key] ?? []), 'is_scalar'));
            $ids2 = (array)($db['masters']['masterIds'][$key] ?? []);
            sf_json_out(['ok' => true, 'action' => $isRename ? 'updated' : 'saved',
                         'value' => $value, 'masterId' => s($ids2[$lkNew] ?? ''), 'count' => count($freshList)]);
        }

        if ($method === 'DELETE') {
            $value = s($_GET['value'] ?? '');
            if ($value === '') { $body = sf_read_json_body(); $value = s($body['value'] ?? ''); }
            if ($value === '') sf_fail('value is required', 400);
            $lk = mb_strtolower($value);
            $found = false;
            $m[$key] = array_values(array_filter((array)($m[$key] ?? []), function ($v) use ($lk, &$found) {
                if (is_scalar($v) && mb_strtolower(trim((string)$v)) === $lk) { $found = true; return false; }
                return true;
            }));
            if (!$found) sf_fail('Value not found in this master', 404);
            $usedBy = sf_master_usage($db, $key, $value);   // v5: warn, never block
            unset($m['masterIds'][$key][$lk], $m['masterStatus'][$key][$lk], $m['parentMap'][$key][$value]);
            if ($key === 'warehouses') unset($m['warehouseAddr'][$value]);
            sf_commit_db($db);
            sf_json_out(['ok' => true, 'action' => 'deleted', 'value' => $value,
                         'usedBy' => $usedBy,
                         'warning' => $usedBy ? 'Value was in use — dangling references remain (v5 behaviour)' : '']);
        }

        sf_fail('Method not allowed', 405);
    } catch (PDOException $e) { sf_fail('Database error: ' . $e->getMessage(), 500); }
}

/* =====================================================================
   RECORD-MASTER ENDPOINT — Styles / Items / Parties (id-based CRUD)
   ===================================================================== */
function sf_record_master_endpoint(string $key): void {
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $db = sf_load_db();
        $rows = array_values(array_filter((array)($db['masters'][$key] ?? []), 'is_array'));

        if ($method === 'GET') {
            $usage = s($_GET['usage'] ?? '');
            if ($usage !== '') sf_json_out(['ok' => true, 'value' => $usage, 'usedBy' => sf_master_usage($db, $key, $usage)]);
            $id = s($_GET['id'] ?? '');
            if ($id !== '') {
                foreach ($rows as $r) {
                    if (s($r['id'] ?? '') === $id || s($r['code'] ?? '') === $id) sf_json_out(['ok' => true, 'record' => $r]);
                }
                sf_fail('Record not found', 404);
            }
            sf_json_out(['ok' => true, 'master' => $key] + sf_listing($rows, $_GET));
        }

        if ($method === 'POST' || $method === 'PUT') {
            $doc = sf_read_json_body();
            $id = s($doc['id'] ?? '');
            $isNew = true;
            foreach ((array)$db['masters'][$key] as $i => $ex) {
                if (is_array($ex) && $id !== '' && s($ex['id'] ?? '') === $id) {
                    $db['masters'][$key][$i] = array_merge($ex, $doc);
                    $doc = $db['masters'][$key][$i];
                    $isNew = false;
                    break;
                }
            }
            if ($isNew) {
                if ($id === '') $doc['id'] = sf_uid_new();
                $db['seq'] = (array)($db['seq'] ?? []);
                if ($key === 'styles' && s($doc['internal'] ?? '') === '') sf_fail('Internal ID is required', 422);
                if ($key === 'styles' && !str_starts_with(s($doc['id'] ?? ''), 'STY-')) {
                    $db['seq']['style'] = (int)pf($db['seq']['style'] ?? 0) + 1;
                    $doc['id'] = 'STY-' . str_pad((string)$db['seq']['style'], 4, '0', STR_PAD_LEFT);
                }
                if ($key === 'items') {
                    if (s($doc['name'] ?? '') === '') sf_fail('Item Name is required', 422);
                    if (s($doc['code'] ?? '') === '') {
                        $db['seq']['item'] = (int)pf($db['seq']['item'] ?? 0) + 1;
                        $doc['code'] = 'ITM-' . str_pad((string)$db['seq']['item'], 4, '0', STR_PAD_LEFT);
                    }
                }
                if ($key === 'parties') {
                    if (s($doc['legalName'] ?? '') === '') sf_fail('Legal Name is required', 422);
                    if (s($doc['shortName'] ?? '') === '') sf_fail('Short Name is required', 422);
                    if (s($doc['code'] ?? '') === '') {
                        $db['seq']['party'] = (int)pf($db['seq']['party'] ?? 0) + 1;
                        $doc['code'] = 'PTY-' . str_pad((string)$db['seq']['party'], 4, '0', STR_PAD_LEFT);
                    }
                }
                $db['masters'][$key] = (array)($db['masters'][$key] ?? []);
                $db['masters'][$key][] = $doc;
            }
            sf_commit_db($db);   // duplicate name / GSTIN / internal-ID rules enforced here
            sf_json_out(['ok' => true, 'action' => $isNew ? 'created' : 'updated', 'record' => $doc]);
        }

        if ($method === 'DELETE') {
            $id = s($_GET['id'] ?? '');
            if ($id === '') sf_fail('id is required', 400);
            $target = null;
            $db['masters'][$key] = array_values(array_filter((array)($db['masters'][$key] ?? []), function ($r) use ($id, &$target) {
                if (is_array($r) && (s($r['id'] ?? '') === $id || s($r['code'] ?? '') === $id)) { $target = $r; return false; }
                return true;
            }));
            if ($target === null) sf_fail('Record not found', 404);
            $nameField = $key === 'styles' ? 'internal' : ($key === 'items' ? 'name' : 'legalName');
            $usedBy = sf_master_usage($db, $key, s($target[$nameField] ?? ''));   // v5: warn, never block
            sf_commit_db($db);
            sf_json_out(['ok' => true, 'action' => 'deleted', 'id' => $id, 'usedBy' => $usedBy,
                         'warning' => $usedBy ? 'Record was in use — dangling references remain (v5 behaviour)' : '']);
        }

        sf_fail('Method not allowed', 405);
    } catch (PDOException $e) { sf_fail('Database error: ' . $e->getMessage(), 500); }
}

/* =====================================================================
   SINGLETON ENDPOINT — Company Details / Login Page / Menu / GST API
   ===================================================================== */
function sf_singleton_endpoint(string $path, string $label): void {
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $db = sf_load_db();
        $get = function (array $db) use ($path) {
            if ($path === 'gstApiSettings') return $db['gstApiSettings'] ?? new stdClass();
            return $db['masters'][$path] ?? new stdClass();
        };
        if ($method === 'GET') sf_json_out(['ok' => true, 'settings' => $get($db), 'name' => $label]);
        if ($method === 'POST' || $method === 'PUT') {
            $body = sf_read_json_body();
            if ($path === 'gstApiSettings') $db['gstApiSettings'] = array_merge((array)($db['gstApiSettings'] ?? []), $body);
            else $db['masters'][$path] = array_merge((array)($db['masters'][$path] ?? []), $body);
            sf_commit_db($db);
            sf_json_out(['ok' => true, 'action' => 'saved', 'settings' => $get($db)]);
        }
        sf_fail('Method not allowed', 405);
    } catch (PDOException $e) { sf_fail('Database error: ' . $e->getMessage(), 500); }
}