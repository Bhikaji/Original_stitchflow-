<?php
/* =====================================================================
   StitchFlow ERP — persistence layer
   Decomposes the application `db` document (same structure the original
   StitchFlow_QA_Fixed_v5 front-end maintains) into the normalized MySQL
   schema. Every collection is written inside one transaction; unchanged
   collections are skipped via content hashes kept in kv_store.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

/* list masters exactly as in the original app (MASTER_KEYS + sizes) */
const SF_LIST_MASTERS = [
    'suppliers','customers','colours','fabrics','sizes','categories','classifications',
    'materialTypes','qualities','firms','addresses','boms','raisedForList','countries',
    'states','districts','talukas','partyStatuses','businessTypes','gstTypes',
    'paymentTermsList','freightChargesList','transportModes','warehouses','gstRates',
    'uoms','qcResults','returnTypes','washTypes','processTypes',
];

const SF_MODULE_KEYS = ['po','inward','jobwork','processoutward','processinward','sample',
                        'sale','costing','purchasereturn','jobworkreturn'];

const SF_TOPLEVEL_KNOWN = ['seq','po','inward','jobwork','processoutward','processinward',
    'sample','sale','costing','purchasereturn','jobworkreturn','auditTrail','customReports',
    'users','masters','gstApiSettings'];

const SF_MASTER_META_KEYS = ['masterIds','masterIdSeq','masterStatus','parentMap',
    'warehouseAddr','companyDetails','loginSettings','menuSettings','parties','items','styles'];

/* scalar list value encoding — non-scalar master entries survive round trips */
function sf_mv_encode($v): string {
    if (is_scalar($v) || $v === null) return (string)$v;
    return "\u{1}json:" . json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
function sf_mv_decode(string $v) {
    if (strncmp($v, "\u{1}json:", strlen("\u{1}json:")) === 0) {
        $d = json_decode(substr($v, strlen("\u{1}json:")), true);
        return $d === null ? $v : $d;
    }
    return $v;
}

function sf_hash_get(PDO $pdo, string $key): ?string {
    $st = $pdo->prepare('SELECT v FROM kv_store WHERE k = ?');
    $st->execute(['hash:' . $key]);
    $v = $st->fetchColumn();
    return $v === false ? null : (string)$v;
}
function sf_kv_set(PDO $pdo, string $key, ?string $val): void {
    $pdo->prepare('INSERT INTO kv_store (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)')
        ->execute([$key, $val]);
}
function sf_kv_del(PDO $pdo, string $key): void {
    $pdo->prepare('DELETE FROM kv_store WHERE k = ?')->execute([$key]);
}

function sf_prevent_truncate(PDO $pdo, array $docs, string $tableName): void {
    if (empty($docs)) {
        // Allow if the table is already empty (e.g. fresh installation)
        $count = (int)$pdo->query("SELECT COUNT(*) FROM `$tableName`")->fetchColumn();
        if ($count > 0) {
            throw new RuntimeException("Safeguard Triggered: Refusing to truncate table '$tableName'.");
        }
    }
}

function sf_changed(PDO $pdo, string $key, $subtree): bool {
    $hash = md5(json_encode($subtree, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    if (sf_hash_get($pdo, $key) === $hash) return false;
    sf_kv_set($pdo, 'hash:' . $key, $hash);
    return true;
}

/* record status transitions into status_history */
function sf_capture_status(PDO $pdo, string $docType, string $table, string $idCol, string $noCol, string $statusCol, array $docs, string $actor): void {
    $prev = [];
    foreach ($pdo->query("SELECT `$idCol` AS id, `$statusCol` AS st FROM `$table`") as $r) $prev[$r['id']] = $r['st'];
    $ins = $pdo->prepare('INSERT INTO status_history (doc_type, doc_id, doc_no, from_status, to_status, changed_by) VALUES (?,?,?,?,?,?)');
    foreach ($docs as $d) {
        if (!is_array($d)) continue;
        $id = s($d['id'] ?? ''); if ($id === '') continue;
        $new = s($d['status'] ?? '');
        $old = $prev[$id] ?? null;
        if ($old === null || $old !== $new) {
            $ins->execute([$docType, $id, s($d['no'] ?? ''), $old, $new, $actor]);
        }
    }
}

/* Master ID foreign key cache and resolution helpers */
function sf_id_cache(PDO $pdo): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $parties = [];
    foreach ($pdo->query('SELECT id, code, legal_name, short_name FROM parties') as $r) {
        $cid = !empty($r['code']) ? $r['code'] : $r['id'];
        if (!empty($r['legal_name'])) $parties[mb_strtolower(trim($r['legal_name']))] = $cid;
        if (!empty($r['short_name'])) $parties[mb_strtolower(trim($r['short_name']))] = $cid;
    }
    $items = [];
    foreach ($pdo->query('SELECT id, code, name FROM items') as $r) {
        $cid = !empty($r['code']) ? $r['code'] : $r['id'];
        if (!empty($r['name'])) $items[mb_strtolower(trim($r['name']))] = $cid;
    }
    $styles = [];
    foreach ($pdo->query('SELECT id, internal_id FROM styles') as $r) {
        $cid = !empty($r['id']) ? $r['id'] : $r['internal_id'];
        if (!empty($r['internal_id'])) $styles[mb_strtolower(trim($r['internal_id']))] = $cid;
    }
    $mvals = [];
    foreach ($pdo->query('SELECT master_key, value, master_id FROM master_values WHERE master_id IS NOT NULL AND master_id != ""') as $r) {
        $mvals[$r['master_key']][mb_strtolower(trim($r['value']))] = $r['master_id'];
    }
    $cache = ['parties' => $parties, 'items' => $items, 'styles' => $styles, 'mvals' => $mvals];
    return $cache;
}

function sf_resolve_party_id(PDO $pdo, ?string $val, ?string $explicitId = null): ?string {
    if (!empty($explicitId)) return $explicitId;
    if ($val === null || trim($val) === '') return null;
    $c = sf_id_cache($pdo)['parties'];
    $k = mb_strtolower(trim($val));
    return $c[$k] ?? null;
}

function sf_resolve_item_id(PDO $pdo, ?string $val, ?string $explicitId = null): ?string {
    if (!empty($explicitId)) return $explicitId;
    if ($val === null || trim($val) === '') return null;
    $c = sf_id_cache($pdo)['items'];
    $k = mb_strtolower(trim($val));
    return $c[$k] ?? null;
}

function sf_resolve_style_id(PDO $pdo, ?string $val, ?string $explicitId = null): ?string {
    if (!empty($explicitId)) return $explicitId;
    if ($val === null || trim($val) === '') return null;
    $c = sf_id_cache($pdo)['styles'];
    $k = mb_strtolower(trim($val));
    return $c[$k] ?? null;
}

function sf_resolve_mval_id(PDO $pdo, string $mkey, ?string $val, ?string $explicitId = null): ?string {
    if (!empty($explicitId)) return $explicitId;
    if ($val === null || trim($val) === '') return null;
    $c = sf_id_cache($pdo)['mvals'][$mkey] ?? [];
    $k = mb_strtolower(trim($val));
    return $c[$k] ?? null;
}


/* =====================================================================
   MAIN ENTRY
   ===================================================================== */
function persist_db(array $db, string $actor): array {
    $pdo = sf_pdo();
    $pdo->beginTransaction();
    $written = [];
    try {
        /* ---- sequences (db.seq) ---- */
        if (isset($db['seq']) && is_array($db['seq']) && sf_changed($pdo, 'seq', $db['seq'])) {
            $st = $pdo->prepare('INSERT INTO sequences (seq_key, seq_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE seq_value = VALUES(seq_value)');
            foreach ($db['seq'] as $k => $v) $st->execute([s($k), (int)pf($v)]);
            $written[] = 'seq';
        }

        $masters = (isset($db['masters']) && is_array($db['masters'])) ? $db['masters'] : [];

        /* ---- simple list masters + ids/status/parents/addresses ---- */
        $mSub = [];
        foreach (SF_LIST_MASTERS as $k) $mSub[$k] = $masters[$k] ?? [];
        $mSub['_ids']    = $masters['masterIds']     ?? [];
        $mSub['_seq']    = $masters['masterIdSeq']   ?? [];
        $mSub['_status'] = $masters['masterStatus']  ?? [];
        $mSub['_parent'] = $masters['parentMap']     ?? [];
        $mSub['_whaddr'] = $masters['warehouseAddr'] ?? [];
        if (sf_changed($pdo, 'listmasters', $mSub)) {
            persist_list_masters($pdo, $masters, $actor);
            $written[] = 'masters';
        }

        /* ---- styles ---- */
        if (array_key_exists('styles', $masters) && sf_changed($pdo, 'styles', $masters['styles'])) {
            persist_styles($pdo, is_array($masters['styles']) ? $masters['styles'] : [], $actor);
            $written[] = 'styles';
        }

        /* ---- items ---- */
        if (array_key_exists('items', $masters) && sf_changed($pdo, 'items', $masters['items'])) {
            persist_items($pdo, is_array($masters['items']) ? $masters['items'] : [], $actor);
            $written[] = 'items';
        }

        /* ---- parties ---- */
        if (array_key_exists('parties', $masters) && sf_changed($pdo, 'parties', $masters['parties'])) {
            persist_parties($pdo, is_array($masters['parties']) ? $masters['parties'] : [], $actor);
            $written[] = 'parties';
        }

        /* ---- company details ---- */
        if (array_key_exists('companyDetails', $masters) && sf_changed($pdo, 'companyDetails', $masters['companyDetails'])) {
            persist_company($pdo, is_array($masters['companyDetails']) ? $masters['companyDetails'] : []);
            $written[] = 'companyDetails';
        }

        /* ---- login settings ---- */
        if (array_key_exists('loginSettings', $masters) && sf_changed($pdo, 'loginSettings', $masters['loginSettings'])) {
            persist_login($pdo, is_array($masters['loginSettings']) ? $masters['loginSettings'] : []);
            $written[] = 'loginSettings';
        }

        /* ---- menu settings ---- */
        if (array_key_exists('menuSettings', $masters) && sf_changed($pdo, 'menuSettings', $masters['menuSettings'])) {
            persist_menu($pdo, is_array($masters['menuSettings']) ? $masters['menuSettings'] : []);
            $written[] = 'menuSettings';
        }

        /* ---- unknown / future master keys → kv_store (lossless) ---- */
        $knownMaster = array_merge(SF_LIST_MASTERS, SF_MASTER_META_KEYS);
        $leftoverMasters = array_diff_key($masters, array_flip($knownMaster));
        if (sf_changed($pdo, 'mastersLeftover', $leftoverMasters)) {
            $pdo->exec("DELETE FROM kv_store WHERE k LIKE 'master:%'");
            foreach ($leftoverMasters as $k => $v) {
                sf_kv_set($pdo, 'master:' . $k, json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }
        }

        /* ---- gst api settings ---- */
        if (array_key_exists('gstApiSettings', $db) && sf_changed($pdo, 'gstApiSettings', $db['gstApiSettings'])) {
            persist_gst_settings($pdo, is_array($db['gstApiSettings']) ? $db['gstApiSettings'] : []);
            $written[] = 'gstApiSettings';
        }

        /* ---- users ---- */
        if (array_key_exists('users', $db) && sf_changed($pdo, 'users', $db['users'])) {
            persist_users($pdo, is_array($db['users']) ? $db['users'] : []);
            $written[] = 'users';
        }

        /* ---- transactions ---- */
        $tx = [
            'po'             => 'persist_pos',
            'inward'         => 'persist_inwards',
            'jobwork'        => 'persist_jobworks',
            'sample'         => 'persist_samples',
            'processoutward' => 'persist_process_outwards',
            'processinward'  => 'persist_process_inwards',
            'sale'           => 'persist_sales',
            'costing'        => 'persist_costings',
            'purchasereturn' => 'persist_purchase_returns',
            'jobworkreturn'  => 'persist_jobwork_returns',
        ];
        foreach ($tx as $key => $fn) {
            if (array_key_exists($key, $db) && sf_changed($pdo, $key, $db[$key])) {
                $fn($pdo, is_array($db[$key]) ? $db[$key] : [], $actor);
                $written[] = $key;
            }
        }

        /* ---- audit trail ---- */
        if (array_key_exists('auditTrail', $db) && sf_changed($pdo, 'auditTrail', $db['auditTrail'])) {
            persist_audit($pdo, is_array($db['auditTrail']) ? $db['auditTrail'] : []);
            $written[] = 'auditTrail';
        }

        /* ---- custom reports ---- */
        if (array_key_exists('customReports', $db) && sf_changed($pdo, 'customReports', $db['customReports'])) {
            persist_custom_reports($pdo, is_array($db['customReports']) ? $db['customReports'] : []);
            $written[] = 'customReports';
        }

        /* ---- any other top-level keys (e.g. _revision) → kv_store ---- */
        $leftTop = array_diff_key($db, array_flip(SF_TOPLEVEL_KNOWN));
        if (sf_changed($pdo, 'topLeftover', $leftTop)) {
            $pdo->exec("DELETE FROM kv_store WHERE k LIKE 'toplevel:%'");
            foreach ($leftTop as $k => $v) {
                sf_kv_set($pdo, 'toplevel:' . $k, json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }
        }

        sf_kv_set($pdo, 'initialized', '1');
        $pdo->commit();
        return $written;
    } catch (Throwable $e) {
        $pdo->rollBack();
        /* invalidate hashes so the next save retries a full write */
        $pdo->exec("DELETE FROM kv_store WHERE k LIKE 'hash:%'");
        throw $e;
    }
}

/* =====================================================================
   MASTERS
   ===================================================================== */
function persist_list_masters(PDO $pdo, array $masters, string $actor): void {
    $ids     = is_array($masters['masterIds']     ?? null) ? $masters['masterIds']     : [];
    $status  = is_array($masters['masterStatus']  ?? null) ? $masters['masterStatus']  : [];
    $parents = is_array($masters['parentMap']     ?? null) ? $masters['parentMap']     : [];
    $idSeq   = is_array($masters['masterIdSeq']   ?? null) ? $masters['masterIdSeq']   : [];
    $whAddr  = is_array($masters['warehouseAddr'] ?? null) ? $masters['warehouseAddr'] : [];
    /* these masters are simple string lists, stored in kv pairs */
    $flat = [];
    foreach (SF_LIST_MASTERS as $k) {
        if (!empty($masters[$k])) $flat[$k] = $masters[$k];
    }
    sf_prevent_truncate($pdo, $flat, 'master_values');
    $pdo->exec('DELETE FROM master_values');
    $ins = $pdo->prepare('INSERT INTO master_values
        (master_key, value, master_id, parent_value, is_active, sort_order, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?)');
    foreach (SF_LIST_MASTERS as $key) {
        $list = $masters[$key] ?? [];
        if (!is_array($list)) continue;
        $seen = [];
        foreach (array_values($list) as $i => $val) {
            $enc = sf_mv_encode($val);
            $lk  = mb_strtolower(trim($enc));
            if ($enc === '' || isset($seen[$lk])) continue; // duplicates are rejected upstream; guard anyway
            $seen[$lk] = 1;
            $mid    = isset($ids[$key][$lk]) ? s($ids[$key][$lk]) : null;
            $active = array_key_exists($lk, $status[$key] ?? []) ? b01($status[$key][$lk]) : 1;
            $parent = isset($parents[$key][$enc]) ? s($parents[$key][$enc]) : null;
            $ins->execute([$key, $enc, $mid, $parent, $active, $i, $actor, $actor]);
        }
        /* keep parentMap entries whose value is no longer in the list (lossless) */
        foreach (($parents[$key] ?? []) as $val => $par) {
            if (!isset($seen[mb_strtolower(trim((string)$val))])) {
                sf_kv_set($pdo, 'parentorphan:' . $key . ':' . $val, s($par));
            }
        }
    }

    $pdo->exec('DELETE FROM master_id_sequences');
    $insSeq = $pdo->prepare('INSERT INTO master_id_sequences (master_key, seq_value) VALUES (?,?)');
    foreach ($idSeq as $k => $v) $insSeq->execute([s($k), (int)pf($v)]);

    $pdo->exec('DELETE FROM warehouse_addresses');
    $insWh = $pdo->prepare('INSERT INTO warehouse_addresses (warehouse, address) VALUES (?,?)');
    foreach ($whAddr as $wh => $addr) if (s($wh) !== '') $insWh->execute([s($wh), (string)$addr]);
}

function persist_styles(PDO $pdo, array $styles, string $actor): void {
    sf_prevent_truncate($pdo, $styles, 'styles');
    $prevCreated = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM styles') as $r) $prevCreated[$r['id']] = $r;
    $pdo->exec('DELETE FROM styles');
    $known = ['id','internal','portal','desc','buyer','active'];
    $ins = $pdo->prepare('INSERT INTO styles (id, internal_id, portal_id, description, buyer, is_active, extra_json, created_by, updated_by, created_at)
                          VALUES (?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $seen = [];
    foreach ($styles as $x) {
        if (!is_array($x)) continue;
        $id = s($x['id'] ?? '');
        if ($id === '' || isset($seen[$id])) $id = $id !== '' ? $id . '-' . bin2hex(random_bytes(3)) : 'STY-' . bin2hex(random_bytes(4));
        $seen[$id] = 1;
        $p = $prevCreated[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['internal'] ?? ''), nz($x['portal'] ?? ''), nz($x['desc'] ?? ''), nz($x['buyer'] ?? ''),
            b01($x['active'] ?? true), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
    }
}

function persist_items(PDO $pdo, array $items, string $actor): void {
    sf_prevent_truncate($pdo, $items, 'items');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM items') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM items');
    $known = ['id','code','name','category','classification','materialType','quality','description',
              'unit','width','hsn','gst','image','active','hasColor','sizes','colorName','moq',
              'itemRate','itemMRP','cgst','sgst','igst','purchaseRate','saleRate'];
    $ins = $pdo->prepare('INSERT INTO items
        (id, code, name, category, classification, material_type, quality, description, unit, width,
         hsn, gst, image, is_active, has_color, color_name, moq, item_rate, item_mrp, cgst, sgst, igst,
         purchase_rate, sale_rate, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insSize = $pdo->prepare('INSERT INTO item_sizes (item_id, size, sort_order) VALUES (?,?,?)');
    $seenId = []; $seenName = [];
    foreach ($items as $x) {
        if (!is_array($x)) {
            /* legacy simple item {name,category,unit} appears as object; scalars are skipped */
            continue;
        }
        $id = s($x['id'] ?? '');
        if ($id === '' || isset($seenId[$id])) $id = 'itm_' . bin2hex(random_bytes(6));
        $seenId[$id] = 1;
        $name = s($x['name'] ?? '');
        if ($name === '' || isset($seenName[lc($name)])) {
            if ($name === '') continue;
        }
        $seenName[lc($name)] = 1;
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, nz($x['code'] ?? ''), $name, nz($x['category'] ?? ''), nz($x['classification'] ?? ''),
            nz($x['materialType'] ?? ''), nz($x['quality'] ?? ''), nz($x['description'] ?? ''),
            nz($x['unit'] ?? ''), nz($x['width'] ?? ''), nz($x['hsn'] ?? ''),
            isset($x['gst']) && $x['gst'] !== '' ? pf($x['gst']) : null,
            nz($x['image'] ?? ''), b01($x['active'] ?? true), !empty($x['hasColor']) ? 1 : 0,
            nz($x['colorName'] ?? ''), nz($x['moq'] ?? ''), nz($x['itemRate'] ?? ''), nz($x['itemMRP'] ?? ''),
            nz($x['cgst'] ?? ''), nz($x['sgst'] ?? ''), nz($x['igst'] ?? ''),
            nz($x['purchaseRate'] ?? ''), nz($x['saleRate'] ?? ''),
            extra_json($x, $known), $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['sizes'] ?? null) ? $x['sizes'] : []) as $i => $sz) {
            $insSize->execute([$id, s($sz), $i]);
        }
    }
}

function persist_parties(PDO $pdo, array $parties, string $actor): void {
    sf_prevent_truncate($pdo, $parties, 'parties');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM parties') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM parties');
    $known = ['id','code','legalName','shortName','siteCode','pan','gstNo','address','country','state',
              'district','taluka','city','pin','status','businessType','businessTypes','gstType','billTos'];
    $ins = $pdo->prepare('INSERT INTO parties
        (id, code, legal_name, short_name, site_code, pan, gst_no, address, country, state, district,
         taluka, city, pin, status, business_type, gst_type, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insBt = $pdo->prepare('INSERT INTO party_business_types (party_id, business_type, sort_order) VALUES (?,?,?)');
    $insBill = $pdo->prepare('INSERT INTO party_bill_tos
        (party_id, name, gst_no, pan, gst_type, country, state, district, taluka, city, address, pin, sort_order, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $btKnown = ['name','gstNo','pan','gstType','country','state','district','taluka','city','address','pin'];
    $seen = []; $seenLegal = [];
    foreach ($parties as $x) {
        if (!is_array($x)) continue;
        $id = s($x['id'] ?? '');
        if ($id === '' || isset($seen[$id])) $id = 'pty_' . bin2hex(random_bytes(6));
        $seen[$id] = 1;
        $legal = s($x['legalName'] ?? '');
        if ($legal === '' || isset($seenLegal[lc($legal)])) { if ($legal === '') continue; }
        $seenLegal[lc($legal)] = 1;
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, nz($x['code'] ?? ''), $legal, s($x['shortName'] ?? ''), nz($x['siteCode'] ?? ''),
            nz($x['pan'] ?? ''), nz($x['gstNo'] ?? ''), nz($x['address'] ?? ''), nz($x['country'] ?? ''),
            nz($x['state'] ?? ''), nz($x['district'] ?? ''), nz($x['taluka'] ?? ''), nz($x['city'] ?? ''),
            nz($x['pin'] ?? ''), s($x['status'] ?? 'Active') ?: 'Active', nz($x['businessType'] ?? ''),
            nz($x['gstType'] ?? ''), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['businessTypes'] ?? null) ? $x['businessTypes'] : []) as $i => $bt) {
            if (s($bt) !== '') $insBt->execute([$id, s($bt), $i]);
        }
        foreach (array_values(is_array($x['billTos'] ?? null) ? $x['billTos'] : []) as $i => $b) {
            if (!is_array($b)) continue;
            $insBill->execute([
                $id, nz($b['name'] ?? ''), nz($b['gstNo'] ?? ''), nz($b['pan'] ?? ''), nz($b['gstType'] ?? ''),
                nz($b['country'] ?? ''), nz($b['state'] ?? ''), nz($b['district'] ?? ''), nz($b['taluka'] ?? ''),
                nz($b['city'] ?? ''), nz($b['address'] ?? ''), nz($b['pin'] ?? ''), $i, extra_json($b, $btKnown),
            ]);
        }
    }
}

function persist_company(PDO $pdo, array $c): void {
    $known = ['name','reg','reg2','works','contact','gstNo','pan','state','stateCode','jurisdiction'];
    $pdo->exec('DELETE FROM company_details');
    $pdo->prepare('INSERT INTO company_details (id, name, reg, reg2, works, contact, gst_no, pan, state, state_code, jurisdiction, extra_json)
                   VALUES (1,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
            nz($c['name'] ?? ''), nz($c['reg'] ?? ''), nz($c['reg2'] ?? ''), nz($c['works'] ?? ''),
            nz($c['contact'] ?? ''), nz($c['gstNo'] ?? ''), nz($c['pan'] ?? ''), nz($c['state'] ?? ''),
            nz($c['stateCode'] ?? ''), nz($c['jurisdiction'] ?? ''), extra_json($c, $known),
        ]);
}

function persist_login(PDO $pdo, array $l): void {
    $known = ['interval','slides'];
    $pdo->exec('DELETE FROM login_settings');
    $pdo->exec('DELETE FROM login_slides');
    $pdo->prepare('INSERT INTO login_settings (id, slide_interval, extra_json) VALUES (1,?,?)')
        ->execute([(int)pf($l['interval'] ?? 6) ?: 6, extra_json($l, $known)]);
    $ins = $pdo->prepare('INSERT INTO login_slides (slide_id, name, fit, position, is_active, data, sort_order, extra_json) VALUES (?,?,?,?,?,?,?,?)');
    $sKnown = ['id','name','fit','position','active','data'];
    foreach (array_values(is_array($l['slides'] ?? null) ? $l['slides'] : []) as $i => $sl) {
        if (!is_array($sl)) continue;
        $ins->execute([nz($sl['id'] ?? ''), nz($sl['name'] ?? ''), nz($sl['fit'] ?? ''), nz($sl['position'] ?? ''),
                       b01($sl['active'] ?? true), nz($sl['data'] ?? ''), $i, extra_json($sl, $sKnown)]);
    }
}

function persist_menu(PDO $pdo, array $m): void {
    $pdo->exec('DELETE FROM menu_settings');
    $ins = $pdo->prepare('INSERT INTO menu_settings (menu_area, item_key, sort_order) VALUES (?,?,?)');
    foreach (array_values(is_array($m['mainOrder'] ?? null) ? $m['mainOrder'] : []) as $i => $k)
        if (s($k) !== '') $ins->execute(['main', s($k), $i]);
    foreach (array_values(is_array($m['masterOrder'] ?? null) ? $m['masterOrder'] : []) as $i => $k)
        if (s($k) !== '') $ins->execute(['master', s($k), $i]);
    $extra = array_diff_key($m, ['mainOrder' => 1, 'masterOrder' => 1]);
    sf_kv_set($pdo, 'menuSettingsExtra', $extra ? json_encode($extra, JSON_UNESCAPED_UNICODE) : null);
}

function persist_gst_settings(PDO $pdo, array $g): void {
    $known = ['provider','environment','baseUrl','lookupPath','queryParam','authType','apiKey',
              'proxyEndpoint','timeout','businessType','lastChecked','toggles'];
    $t = is_array($g['toggles'] ?? null) ? $g['toggles'] : [];
    $pdo->exec('DELETE FROM gst_api_settings');
    $pdo->prepare('INSERT INTO gst_api_settings
        (id, provider, environment, base_url, lookup_path, query_param, auth_type, api_key, proxy_endpoint,
         timeout_secs, business_type, last_checked, tog_enabled, tog_proxy, tog_demo, tog_autofill,
         tog_typing, tog_autocreate, extra_json)
        VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
            nz($g['provider'] ?? ''), nz($g['environment'] ?? ''), nz($g['baseUrl'] ?? ''),
            nz($g['lookupPath'] ?? ''), nz($g['queryParam'] ?? ''), nz($g['authType'] ?? ''),
            nz($g['apiKey'] ?? ''), nz($g['proxyEndpoint'] ?? ''), ni($g['timeout'] ?? null),
            nz($g['businessType'] ?? ''), nz($g['lastChecked'] ?? ''),
            b01($t['enabled'] ?? true), b01($t['proxy'] ?? true), b01($t['demo'] ?? true),
            b01($t['autofill'] ?? true), b01($t['typing'] ?? true), !empty($t['autocreate']) ? 1 : 0,
            extra_json($g, $known),
        ]);
}

function persist_users(PDO $pdo, array $users): void {
    sf_prevent_truncate($pdo, $users, 'users');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_at FROM users') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM users');
    $known = ['id','name','username','pin','role','status','accessLevel','modules','permissions'];
    $ins = $pdo->prepare('INSERT INTO users (id, name, username, pin_hash, role, status, access_level, extra_json, created_at)
                          VALUES (?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insMod = $pdo->prepare('INSERT INTO user_modules (user_id, module, sort_order) VALUES (?,?,?)');
    $insPerm = $pdo->prepare('INSERT INTO user_permissions (user_id, scope, perm_key, can_view, can_create, can_edit, can_delete) VALUES (?,?,?,?,?,?,?)');
    $seenId = []; $seenUser = [];
    foreach ($users as $u) {
        if (!is_array($u)) continue;
        $id = s($u['id'] ?? '');
        if ($id === '' || isset($seenId[$id])) $id = 'USR-' . strtoupper(bin2hex(random_bytes(3)));
        $seenId[$id] = 1;
        $un = s($u['username'] ?? '');
        if ($un === '' || isset($seenUser[lc($un)])) continue;
        $seenUser[lc($un)] = 1;
        $p = $prev[s($u['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($u['name'] ?? ''), $un, nz($u['pin'] ?? ''), s($u['role'] ?? 'Custom') ?: 'Custom',
            s($u['status'] ?? 'Active') ?: 'Active', nz($u['accessLevel'] ?? ''),
            extra_json($u, $known), $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($u['modules'] ?? null) ? $u['modules'] : []) as $i => $m)
            if (s($m) !== '') $insMod->execute([$id, s($m), $i]);
        $perms = is_array($u['permissions'] ?? null) ? $u['permissions'] : [];
        foreach (['modules','inwardTypes','masters'] as $scope) {
            foreach ((is_array($perms[$scope] ?? null) ? $perms[$scope] : []) as $pk => $pv) {
                if (!is_array($pv)) continue;
                $insPerm->execute([$id, $scope, s($pk),
                    !empty($pv['view']) ? 1 : 0, !empty($pv['create']) ? 1 : 0,
                    !empty($pv['edit']) ? 1 : 0, !empty($pv['delete']) ? 1 : 0]);
            }
        }
    }
}

/* =====================================================================
   TRANSACTIONS
   ===================================================================== */
function sf_uid(array $x, array &$seen, string $prefix): string {
    $id = s($x['id'] ?? '');
    if ($id === '' || isset($seen[$id])) $id = $prefix . '_' . bin2hex(random_bytes(6));
    $seen[$id] = 1;
    return $id;
}

function persist_pos(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'po', 'purchase_orders', 'id', 'po_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'purchase_orders');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM purchase_orders') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM purchase_orders');
    $known = ['id','no','firm','date','supplier','supplier_id','supplierTrade','billTo','shipTo','gstType','poType',
              'buyer','buyer_id','styles','bom','bomType','classification','classification_id','category','category_id','items','status',
              'deliveryAddress','deliveryDate','closeDate','raisedFor','raised_for_id','qtnNo','qtnDate','payTerms','pay_terms_id',
              'freightCharges','pnf','transitInsurance','transportMode','transport_mode_id','narration','terms','createdAt'];
    $ins = $pdo->prepare('INSERT INTO purchase_orders
        (id, po_no, firm, po_date, supplier, supplier_id, supplier_trade, bill_to, ship_to, gst_type, po_type, buyer, buyer_id,
         bom_type, classification, classification_id, category, category_id, status, delivery_address, delivery_date, close_date,
         raised_for, raised_for_id, qtn_no, qtn_date, pay_terms, pay_terms_id, freight_charges, pnf, transit_insurance, transport_mode, transport_mode_id,
         narration, terms, created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insStyle = $pdo->prepare('INSERT INTO purchase_order_styles (po_id, style, sort_order) VALUES (?,?,?)');
    $insItem = $pdo->prepare('INSERT INTO purchase_order_items
        (po_id, sort_order, classification, classification_id, name, item_id, specs, color, color_id, qty, unit, unit_id, rate, cgst_pct, sgst_pct,
         igst_pct, cgst_amt, sgst_amt, igst_amt, discount, amount, total_amount, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $iKnown = ['classification','classification_id','name','item_id','specs','color','colour','color_id','qty','unit','unit_id','rate','cgstPct','sgstPct',
               'igstPct','camt','samt','iamt','discount','amount','totalAmount'];
    $insBom = $pdo->prepare('INSERT INTO purchase_order_bom (po_id, sort_order, row_json) VALUES (?,?,?)');
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'po');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nz($x['firm'] ?? ''), nd($x['date'] ?? ''), nz($x['supplier'] ?? ''),
            sf_resolve_party_id($pdo, $x['supplier'] ?? null, $x['supplier_id'] ?? null),
            nz($x['supplierTrade'] ?? ''), nz($x['billTo'] ?? ''), nz($x['shipTo'] ?? ''),
            nz($x['gstType'] ?? ''), nz($x['poType'] ?? ''), nz($x['buyer'] ?? ''),
            sf_resolve_party_id($pdo, $x['buyer'] ?? null, $x['buyer_id'] ?? null),
            nz($x['bomType'] ?? ''),
            nz($x['classification'] ?? ''), sf_resolve_mval_id($pdo, 'classifications', $x['classification'] ?? null, $x['classification_id'] ?? null),
            nz($x['category'] ?? ''), sf_resolve_mval_id($pdo, 'categories', $x['category'] ?? null, $x['category_id'] ?? null),
            s($x['status'] ?? 'Draft') ?: 'Draft',
            nz($x['deliveryAddress'] ?? ''), nd($x['deliveryDate'] ?? ''), nd($x['closeDate'] ?? ''),
            nz($x['raisedFor'] ?? ''), sf_resolve_mval_id($pdo, 'raisedForList', $x['raisedFor'] ?? null, $x['raised_for_id'] ?? null),
            nz($x['qtnNo'] ?? ''), nd($x['qtnDate'] ?? ''),
            nz($x['payTerms'] ?? ''), sf_resolve_mval_id($pdo, 'paymentTermsList', $x['payTerms'] ?? null, $x['pay_terms_id'] ?? null),
            nz($x['freightCharges'] ?? ''), nz($x['pnf'] ?? ''),
            nz($x['transitInsurance'] ?? ''),
            nz($x['transportMode'] ?? ''), sf_resolve_mval_id($pdo, 'transportModes', $x['transportMode'] ?? null, $x['transport_mode_id'] ?? null),
            nz($x['narration'] ?? ''),
            nz($x['terms'] ?? ''), ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['styles'] ?? null) ? $x['styles'] : []) as $i => $st)
            if (s($st) !== '') $insStyle->execute([$id, s($st), $i]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([
                $id, $i, nz($it['classification'] ?? ''), sf_resolve_mval_id($pdo, 'classifications', $it['classification'] ?? null, $it['classification_id'] ?? null),
                nz($it['name'] ?? ''), sf_resolve_item_id($pdo, $it['name'] ?? null, $it['item_id'] ?? null),
                nz($it['specs'] ?? ''),
                nz($it['color'] ?? ($it['colour'] ?? '')), sf_resolve_mval_id($pdo, 'colours', $it['color'] ?? ($it['colour'] ?? null), $it['color_id'] ?? null),
                pf($it['qty'] ?? 0), nz($it['unit'] ?? ''), sf_resolve_mval_id($pdo, 'uoms', $it['unit'] ?? null, $it['unit_id'] ?? null),
                pf($it['rate'] ?? 0), pf($it['cgstPct'] ?? 0), pf($it['sgstPct'] ?? 0), pf($it['igstPct'] ?? 0),
                pf($it['camt'] ?? 0), pf($it['samt'] ?? 0), pf($it['iamt'] ?? 0), pf($it['discount'] ?? 0),
                pf($it['amount'] ?? 0), pf($it['totalAmount'] ?? 0), extra_json($it, $iKnown),
            ]);
        }
        foreach (array_values(is_array($x['bom'] ?? null) ? $x['bom'] : []) as $i => $row)
            $insBom->execute([$id, $i, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }
}

function persist_inwards(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'inward', 'inwards', 'id', 'inward_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'inwards');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM inwards') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM inwards');
    $known = ['id','no','entryType','openingRemark','jwRef','vendor','vendor_id','challan','date','poRef','grn',
              'invoiceNo','invoiceDate','supplier','supplier_id','vehicle','bin','receivedBy','warehouse','warehouse_id','freight',
              'freightGst','freightHsn','attachments','items','status','createdAt'];
    $ins = $pdo->prepare('INSERT INTO inwards
        (id, inward_no, entry_type, opening_remark, jw_ref, vendor, vendor_id, challan, inward_date, po_ref, grn,
         invoice_no, invoice_date, supplier, supplier_id, vehicle, bin, received_by, warehouse, warehouse_id, freight, freight_gst,
         freight_hsn, status, created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insItem = $pdo->prepare('INSERT INTO inward_items
        (inward_id, sort_order, classification, name, item_id, specs, color, color_id, unit, unit_id, po_rate, gst, rec_qty, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $iKnown = ['classification','name','item_id','specs','color','colour','color_id','unit','unit_id','poRate','gst','recQty'];
    $insAtt = $pdo->prepare('INSERT INTO inward_attachments (inward_id, sort_order, name, file_name, data, extra_json) VALUES (?,?,?,?,?,?)');
    $aKnown = ['name','fileName','data'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'in');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nz($x['entryType'] ?? ''), nz($x['openingRemark'] ?? ''),
            nz($x['jwRef'] ?? ''), nz($x['vendor'] ?? ''), sf_resolve_party_id($pdo, $x['vendor'] ?? null, $x['vendor_id'] ?? null),
            nz($x['challan'] ?? ''), nd($x['date'] ?? ''),
            nz($x['poRef'] ?? ''), nz($x['grn'] ?? ''), nz($x['invoiceNo'] ?? ''), nd($x['invoiceDate'] ?? ''),
            nz($x['supplier'] ?? ''), sf_resolve_party_id($pdo, $x['supplier'] ?? null, $x['supplier_id'] ?? null),
            nz($x['vehicle'] ?? ''), nz($x['bin'] ?? ''), nz($x['receivedBy'] ?? ''),
            nz($x['warehouse'] ?? ''), sf_resolve_mval_id($pdo, 'warehouses', $x['warehouse'] ?? null, $x['warehouse_id'] ?? null),
            pf($x['freight'] ?? 0), pf($x['freightGst'] ?? 0),
            nz($x['freightHsn'] ?? ''), s($x['status'] ?? 'Completed') ?: 'Completed',
            ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([
                $id, $i, nz($it['classification'] ?? ''), nz($it['name'] ?? ''), sf_resolve_item_id($pdo, $it['name'] ?? null, $it['item_id'] ?? null),
                nz($it['specs'] ?? ''),
                nz($it['color'] ?? ($it['colour'] ?? '')), sf_resolve_mval_id($pdo, 'colours', $it['color'] ?? ($it['colour'] ?? null), $it['color_id'] ?? null),
                nz($it['unit'] ?? ''), sf_resolve_mval_id($pdo, 'uoms', $it['unit'] ?? null, $it['unit_id'] ?? null),
                pf($it['poRate'] ?? 0),
                pf($it['gst'] ?? 0), pf($it['recQty'] ?? 0), extra_json($it, $iKnown),
            ]);
        }
        foreach (array_values(is_array($x['attachments'] ?? null) ? $x['attachments'] : []) as $i => $a) {
            if (!is_array($a)) continue;
            $insAtt->execute([$id, $i, nz($a['name'] ?? ''), nz($a['fileName'] ?? ''), nz($a['data'] ?? ''), extra_json($a, $aKnown)]);
        }
    }
}

function persist_jobwork_like(PDO $pdo, array $docs, string $docType, string $actor): void {
    sf_capture_status($pdo, $docType, 'jobworks', 'id', 'jw_no', 'status',
        array_filter($docs, 'is_array'), $actor);
    sf_prevent_truncate($pdo, $docs, 'jobworks');
    $prev = [];
    $st = $pdo->prepare('SELECT id, created_by, created_at FROM jobworks WHERE doc_type = ?');
    $st->execute([$docType]);
    foreach ($st as $r) $prev[$r['id']] = $r;
    $pdo->prepare('DELETE FROM jobworks WHERE doc_type = ?')->execute([$docType]);
    $known = ['id','no','date','vendor','vendor_id','processType','process_type_id','styles','issues','garments','extras','receipts','issueDate',
              'expectedDate','receiveDate','status','notes','createdAt'];
    $ins = $pdo->prepare('INSERT INTO jobworks
        (id, doc_type, jw_no, jw_date, vendor, vendor_id, process_type_id, issue_date, expected_date, receive_date, status, notes,
         created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insStyle = $pdo->prepare('INSERT INTO jobwork_styles (jobwork_id, style, sort_order) VALUES (?,?,?)');
    $insIssue = $pdo->prepare('INSERT INTO jobwork_issues
        (jobwork_id, line_kind, sort_order, issue_date, classification, item, item_id, color_id, inward_no, po_ref, qty,
         actual_qty, unit, unit_id, cons, reason, dc_no, pod, pod_name, pod_kind, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $issKnown = ['date','classification','item','item_id','color_id','inwardNo','poRef','qty','actualQty','unit','unit_id','cons',
                 'reason','dcNo','pod','podName','podKind'];
    $insG = $pdo->prepare('INSERT INTO jobwork_garments
        (jobwork_id, sort_order, style, portal, descr, colour, order_qty, rate, received_qty, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?)');
    $gKnown = ['style','portal','desc','colour','color','sizes','orderQty','rate','receivedQty'];
    $insGS = $pdo->prepare('INSERT INTO jobwork_garment_sizes (garment_id, size, qty) VALUES (?,?,?)');
    $insR = $pdo->prepare('INSERT INTO jobwork_receipts
        (jobwork_id, rid, sort_order, rcpt_date, descr, colour, color_id, qty, unit_id, qc, warehouse, consumption, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $rKnown = ['rid','date','desc','colour','color','color_id','qty','unit_id','sizes','qc','warehouse','consumption'];
    $insRS = $pdo->prepare('INSERT INTO jobwork_receipt_sizes (receipt_id, size, qty) VALUES (?,?,?)');
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, $docType === 'sample' ? 'smp' : 'jw');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, $docType, s($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['vendor'] ?? ''),
            sf_resolve_party_id($pdo, $x['vendor'] ?? null, $x['vendor_id'] ?? null),
            sf_resolve_mval_id($pdo, 'processTypes', $x['processType'] ?? ($x['process_type'] ?? null), $x['process_type_id'] ?? null),
            nd($x['issueDate'] ?? ''), nd($x['expectedDate'] ?? ''), nd($x['receiveDate'] ?? ''),
            s($x['status'] ?? 'Issued') ?: 'Issued', nz($x['notes'] ?? ''), ni($x['createdAt'] ?? null),
            extra_json($x, $known), $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['styles'] ?? null) ? $x['styles'] : []) as $i => $st)
            if (s($st) !== '') $insStyle->execute([$id, s($st), $i]);
        foreach (['issues' => 'issue', 'extras' => 'extra'] as $lk => $kind) {
            foreach (array_values(is_array($x[$lk] ?? null) ? $x[$lk] : []) as $i => $it) {
                if (!is_array($it)) continue;
                $insIssue->execute([
                    $id, $kind, $i, nd($it['date'] ?? ''), nz($it['classification'] ?? ''),
                    nz($it['item'] ?? ''), sf_resolve_item_id($pdo, $it['item'] ?? null, $it['item_id'] ?? null),
                    sf_resolve_mval_id($pdo, 'colours', $it['color'] ?? ($it['colour'] ?? null), $it['color_id'] ?? null),
                    nz($it['inwardNo'] ?? ''), nz($it['poRef'] ?? ''),
                    pf($it['qty'] ?? 0),
                    (isset($it['actualQty']) && $it['actualQty'] !== '' && $it['actualQty'] !== null) ? pf($it['actualQty']) : null,
                    nz($it['unit'] ?? ''), sf_resolve_mval_id($pdo, 'uoms', $it['unit'] ?? null, $it['unit_id'] ?? null),
                    (isset($it['cons']) && $it['cons'] !== '' && $it['cons'] !== null) ? pf($it['cons']) : null,
                    array_key_exists('reason', $it) ? s($it['reason']) : null,
                    array_key_exists('dcNo', $it) ? s($it['dcNo']) : null, nz($it['pod'] ?? ''),
                    nz($it['podName'] ?? ''), nz($it['podKind'] ?? ''), extra_json($it, $issKnown),
                ]);
            }
        }
        foreach (array_values(is_array($x['garments'] ?? null) ? $x['garments'] : []) as $i => $g) {
            if (!is_array($g)) continue;
            $insG->execute([
                $id, $i, nz($g['style'] ?? ''), nz($g['portal'] ?? ''), nz($g['desc'] ?? ''),
                nz($g['colour'] ?? ($g['color'] ?? '')), pf($g['orderQty'] ?? 0), pf($g['rate'] ?? 0),
                pf($g['receivedQty'] ?? 0), extra_json($g, $gKnown),
            ]);
            $gid = (int)$pdo->lastInsertId();
            foreach ((is_array($g['sizes'] ?? null) ? $g['sizes'] : []) as $sz => $q)
                $insGS->execute([$gid, s($sz), pf($q)]);
        }
        foreach (array_values(is_array($x['receipts'] ?? null) ? $x['receipts'] : []) as $i => $r) {
            if (!is_array($r)) continue;
            $insR->execute([
                $id, nz($r['rid'] ?? ''), $i, nd($r['date'] ?? ''), nz($r['desc'] ?? ''),
                nz($r['colour'] ?? ($r['color'] ?? '')), sf_resolve_mval_id($pdo, 'colours', $r['colour'] ?? ($r['color'] ?? null), $r['color_id'] ?? null),
                pf($r['qty'] ?? 0), sf_resolve_mval_id($pdo, 'uoms', $r['unit'] ?? null, $r['unit_id'] ?? null),
                nz($r['qc'] ?? ''),
                nz($r['warehouse'] ?? ''), pf($r['consumption'] ?? 0), extra_json($r, $rKnown),
            ]);
            $rid = (int)$pdo->lastInsertId();
            foreach ((is_array($r['sizes'] ?? null) ? $r['sizes'] : []) as $sz => $q)
                $insRS->execute([$rid, s($sz), pf($q)]);
        }
    }
}
function persist_jobworks(PDO $pdo, array $docs, string $actor): void { persist_jobwork_like($pdo, $docs, 'jobwork', $actor); }
function persist_samples(PDO $pdo, array $docs, string $actor): void { persist_jobwork_like($pdo, $docs, 'sample', $actor); }

function persist_process_outwards(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'processoutward', 'process_outwards', 'id', 'out_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'process_outwards');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM process_outwards') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM process_outwards');
    $known = ['id','no','date','processType','process_type_id','processor','vendor_id','jwRef','expectedDate','remarks','items','status','createdAt'];
    $ins = $pdo->prepare('INSERT INTO process_outwards
        (id, out_no, out_date, process_type, process_type_id, processor, vendor_id, jw_ref, expected_date, remarks, status,
         created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insItem = $pdo->prepare('INSERT INTO process_outward_items (outward_id, sort_order, style, item_id, qty, rate, extra_json) VALUES (?,?,?,?,?,?,?)');
    $insSize = $pdo->prepare('INSERT INTO process_outward_item_sizes (item_id, size, qty) VALUES (?,?,?)');
    $iKnown = ['style','item_id','sizes','qty','rate'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'pro');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['processType'] ?? ''),
            sf_resolve_mval_id($pdo, 'processTypes', $x['processType'] ?? null, $x['process_type_id'] ?? null),
            nz($x['processor'] ?? ''), sf_resolve_party_id($pdo, $x['processor'] ?? null, $x['vendor_id'] ?? null),
            nz($x['jwRef'] ?? ''), nd($x['expectedDate'] ?? ''), nz($x['remarks'] ?? ''),
            s($x['status'] ?? 'Open') ?: 'Open', ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([$id, $i, nz($it['style'] ?? ''), sf_resolve_item_id($pdo, $it['style'] ?? null, $it['item_id'] ?? null), pf($it['qty'] ?? 0), pf($it['rate'] ?? 0), extra_json($it, $iKnown)]);
            $iid = (int)$pdo->lastInsertId();
            foreach ((is_array($it['sizes'] ?? null) ? $it['sizes'] : []) as $sz => $q)
                $insSize->execute([$iid, s($sz), pf($q)]);
        }
    }
}

function persist_process_inwards(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'processinward', 'process_inwards', 'id', 'in_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'process_inwards');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM process_inwards') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM process_inwards');
    $known = ['id','no','date','outwardRef','processType','process_type_id','processor','vendor_id','warehouse','remarks','items','status','createdAt'];
    $ins = $pdo->prepare('INSERT INTO process_inwards
        (id, in_no, in_date, outward_ref, process_type, process_type_id, processor, vendor_id, warehouse, remarks, status,
         created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insItem = $pdo->prepare('INSERT INTO process_inward_items (inward_id, sort_order, style, item_id, qty, rate, extra_json) VALUES (?,?,?,?,?,?,?)');
    $insSize = $pdo->prepare('INSERT INTO process_inward_item_sizes (item_id, size, qty) VALUES (?,?,?)');
    $iKnown = ['style','item_id','sizes','qty','rate'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'pri');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['outwardRef'] ?? ''), nz($x['processType'] ?? ''),
            sf_resolve_mval_id($pdo, 'processTypes', $x['processType'] ?? null, $x['process_type_id'] ?? null),
            nz($x['processor'] ?? ''), sf_resolve_party_id($pdo, $x['processor'] ?? null, $x['vendor_id'] ?? null),
            nz($x['warehouse'] ?? ''), nz($x['remarks'] ?? ''),
            s($x['status'] ?? 'Received') ?: 'Received', ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([$id, $i, nz($it['style'] ?? ''), sf_resolve_item_id($pdo, $it['style'] ?? null, $it['item_id'] ?? null), pf($it['qty'] ?? 0), pf($it['rate'] ?? 0), extra_json($it, $iKnown)]);
            $iid = (int)$pdo->lastInsertId();
            foreach ((is_array($it['sizes'] ?? null) ? $it['sizes'] : []) as $sz => $q)
                $insSize->execute([$iid, s($sz), pf($q)]);
        }
    }
}

function persist_sales(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'sale', 'sales', 'id', 'sale_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'sales');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM sales') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM sales');
    $known = ['id','no','date','customer','customer_id','channel','payStatus','pay_terms_id','payMode','transport_mode_id','invoiceNo','notes','items','status','createdAt'];
    $ins = $pdo->prepare('INSERT INTO sales
        (id, sale_no, sale_date, customer, customer_id, channel, pay_status, pay_terms_id, pay_mode, transport_mode_id, invoice_no, notes, status,
         created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insItem = $pdo->prepare('INSERT INTO sale_items (sale_id, sort_order, descr, item_id, color_id, unit_id, qty, rate, disc_pct, tax_pct, amount, extra_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    $iKnown = ['desc','item_id','color_id','unit_id','qty','rate','disc','tax','amount'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'sl');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['customer'] ?? ''),
            sf_resolve_party_id($pdo, $x['customer'] ?? null, $x['customer_id'] ?? null),
            nz($x['channel'] ?? ''),
            nz($x['payStatus'] ?? ''), sf_resolve_mval_id($pdo, 'paymentTermsList', $x['payStatus'] ?? null, $x['pay_terms_id'] ?? null),
            nz($x['payMode'] ?? ''), sf_resolve_mval_id($pdo, 'transportModes', $x['payMode'] ?? null, $x['transport_mode_id'] ?? null),
            nz($x['invoiceNo'] ?? ''), nz($x['notes'] ?? ''),
            s($x['status'] ?? 'Open') ?: 'Open', ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([$id, $i, nz($it['desc'] ?? ''), sf_resolve_item_id($pdo, $it['desc'] ?? null, $it['item_id'] ?? null),
                               sf_resolve_mval_id($pdo, 'colours', $it['color'] ?? null, $it['color_id'] ?? null),
                               sf_resolve_mval_id($pdo, 'uoms', $it['unit'] ?? null, $it['unit_id'] ?? null),
                               pf($it['qty'] ?? 0), pf($it['rate'] ?? 0),
                               pf($it['disc'] ?? 0), pf($it['tax'] ?? 0), pf($it['amount'] ?? 0), extra_json($it, $iKnown)]);
        }
    }
}

function persist_costings(PDO $pdo, array $docs, string $actor): void {
    sf_prevent_truncate($pdo, $docs, 'costings');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM costings') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM costings');
    $known = ['id','no','date','styleImage','order','breakup','fabric','sewing','narration','totals','createdAt'];
    $ins = $pdo->prepare('INSERT INTO costings
        (id, cost_no, cost_date, style_image, brand, buyer_id, label, style, style_id, style_description, total_qty,
         fabric_quality, trim_fabric, factory, wash_type, size_ratio, sam, fob, cm, washing, photoshoot,
         transportation, testing, garment_rejection_pct, finance_pct, narration, order_value, total_making,
         total_production, margin, cmp, created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insRow = $pdo->prepare('INSERT INTO costing_rows (costing_id, section, sort_order, item, item_id, cons, uom, unit_id, rate, wastage, extra_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $rKnown = ['item','item_id','cons','uom','unit_id','rate','wastage'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'cst');
        $o = is_array($x['order'] ?? null) ? $x['order'] : [];
        $b = is_array($x['breakup'] ?? null) ? $x['breakup'] : [];
        $t = is_array($x['totals'] ?? null) ? $x['totals'] : [];
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $extra = extra_json($x, $known);
        $sub = [];
        $so = array_diff_key($o, array_flip(['brand','label','style','styleDescription','totalQty','fabricQuality','trimFabric','factory','washType','sizeRatio','sam','fob']));
        $sb = array_diff_key($b, array_flip(['cm','washing','photoshoot','transportation','testing','garmentRejection','finance']));
        $st2 = array_diff_key($t, array_flip(['orderValue','totalMaking','totalProduction','margin','cmp']));
        if ($so) $sub['order'] = $so;
        if ($sb) $sub['breakup'] = $sb;
        if ($st2) $sub['totals'] = $st2;
        if ($sub) {
            $ex = $extra ? json_decode($extra, true) : [];
            $ex['__sub'] = $sub;
            $extra = json_encode($ex, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $ins->execute([
            $id, nz($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['styleImage'] ?? ''),
            nz($o['brand'] ?? ''), sf_resolve_party_id($pdo, $o['brand'] ?? null, $x['buyer_id'] ?? null),
            nz($o['label'] ?? ''), nz($o['style'] ?? ''),
            sf_resolve_style_id($pdo, $o['style'] ?? null, $x['style_id'] ?? null),
            nz($o['styleDescription'] ?? ''),
            pf($o['totalQty'] ?? 0), nz($o['fabricQuality'] ?? ''), nz($o['trimFabric'] ?? ''),
            nz($o['factory'] ?? ''), nz($o['washType'] ?? ''), nz($o['sizeRatio'] ?? ''),
            pf($o['sam'] ?? 0), pf($o['fob'] ?? 0),
            pf($b['cm'] ?? 0), pf($b['washing'] ?? 0), pf($b['photoshoot'] ?? 0), pf($b['transportation'] ?? 0),
            pf($b['testing'] ?? 0), pf($b['garmentRejection'] ?? 0), pf($b['finance'] ?? 0),
            nz($x['narration'] ?? ''),
            pf($t['orderValue'] ?? 0), pf($t['totalMaking'] ?? 0), pf($t['totalProduction'] ?? 0),
            pf($t['margin'] ?? 0), pf($t['cmp'] ?? 0), ni($x['createdAt'] ?? null), $extra,
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (['fabric','sewing'] as $sec) {
            foreach (array_values(is_array($x[$sec] ?? null) ? $x[$sec] : []) as $i => $r) {
                if (!is_array($r)) continue;
                $insRow->execute([$id, $sec, $i, nz($r['item'] ?? ''), sf_resolve_item_id($pdo, $r['item'] ?? null, $r['item_id'] ?? null),
                                  pf($r['cons'] ?? 0), nz($r['uom'] ?? ''), sf_resolve_mval_id($pdo, 'uoms', $r['uom'] ?? null, $r['unit_id'] ?? null),
                                  pf($r['rate'] ?? 0), pf($r['wastage'] ?? 0), extra_json($r, $rKnown)]);
            }
        }
    }
}

function persist_purchase_returns(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'purchasereturn', 'purchase_returns', 'id', 'return_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'purchase_returns');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM purchase_returns') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM purchase_returns');
    $known = ['id','no','date','poRef','inwardNo','supplier','supplier_id','debitNote','vehicle','warehouse','warehouse_id',
              'returnedBy','reason','remarks','items','status','createdAt'];
    $ins = $pdo->prepare('INSERT INTO purchase_returns
        (id, return_no, return_date, po_ref, inward_no, supplier, supplier_id, debit_note, vehicle, warehouse, warehouse_id,
         returned_by, reason, remarks, status, created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insItem = $pdo->prepare('INSERT INTO purchase_return_items
        (return_id, sort_order, classification, name, item_id, specs, color, color_id, unit, unit_id, rate, rec_qty, ret_qty, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $iKnown = ['classification','name','item_id','specs','color','colour','color_id','unit','unit_id','rate','recQty','retQty'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'pr');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['poRef'] ?? ''), nz($x['inwardNo'] ?? ''),
            nz($x['supplier'] ?? ''), sf_resolve_party_id($pdo, $x['supplier'] ?? null, $x['supplier_id'] ?? null),
            nz($x['debitNote'] ?? ''), nz($x['vehicle'] ?? ''),
            nz($x['warehouse'] ?? ''), sf_resolve_mval_id($pdo, 'warehouses', $x['warehouse'] ?? null, $x['warehouse_id'] ?? null),
            nz($x['returnedBy'] ?? ''), nz($x['reason'] ?? ''), nz($x['remarks'] ?? ''),
            s($x['status'] ?? 'Draft') ?: 'Draft', ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([
                $id, $i, nz($it['classification'] ?? ''), nz($it['name'] ?? ''), sf_resolve_item_id($pdo, $it['name'] ?? null, $it['item_id'] ?? null),
                nz($it['specs'] ?? ''),
                nz($it['color'] ?? ($it['colour'] ?? '')), sf_resolve_mval_id($pdo, 'colours', $it['color'] ?? ($it['colour'] ?? null), $it['color_id'] ?? null),
                nz($it['unit'] ?? ''), sf_resolve_mval_id($pdo, 'uoms', $it['unit'] ?? null, $it['unit_id'] ?? null),
                pf($it['rate'] ?? 0),
                pf($it['recQty'] ?? 0), pf($it['retQty'] ?? 0), extra_json($it, $iKnown),
            ]);
        }
    }
}

function persist_jobwork_returns(PDO $pdo, array $docs, string $actor): void {
    sf_capture_status($pdo, 'jobworkreturn', 'jobwork_returns', 'id', 'return_no', 'status', $docs, $actor);
    sf_prevent_truncate($pdo, $docs, 'jobwork_returns');
    $prev = [];
    foreach ($pdo->query('SELECT id, created_by, created_at FROM jobwork_returns') as $r) $prev[$r['id']] = $r;
    $pdo->exec('DELETE FROM jobwork_returns');
    $known = ['id','no','date','jwRef','vendor','vendor_id','warehouse','challan','vehicle','receivedBy','remarks','items','status','createdAt'];
    $ins = $pdo->prepare('INSERT INTO jobwork_returns
        (id, return_no, return_date, jw_ref, vendor, vendor_id, warehouse, challan, vehicle, received_by, remarks,
         status, created_at_ms, extra_json, created_by, updated_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP))');
    $insItem = $pdo->prepare('INSERT INTO jobwork_return_items
        (return_id, sort_order, name, item_id, color_id, unit, unit_id, ret_qty, return_type, remark, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    $iKnown = ['name','item_id','color_id','unit','unit_id','retQty','returnType','remark'];
    $seen = [];
    foreach ($docs as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'jwr');
        $p = $prev[s($x['id'] ?? '')] ?? null;
        $ins->execute([
            $id, s($x['no'] ?? ''), nd($x['date'] ?? ''), nz($x['jwRef'] ?? ''), nz($x['vendor'] ?? ''),
            sf_resolve_party_id($pdo, $x['vendor'] ?? null, $x['vendor_id'] ?? null),
            nz($x['warehouse'] ?? ''), nz($x['challan'] ?? ''), nz($x['vehicle'] ?? ''),
            nz($x['receivedBy'] ?? ''), nz($x['remarks'] ?? ''), s($x['status'] ?? 'Draft') ?: 'Draft',
            ni($x['createdAt'] ?? null), extra_json($x, $known),
            $p['created_by'] ?? $actor, $actor, $p['created_at'] ?? null,
        ]);
        foreach (array_values(is_array($x['items'] ?? null) ? $x['items'] : []) as $i => $it) {
            if (!is_array($it)) continue;
            $insItem->execute([$id, $i, nz($it['name'] ?? ''), sf_resolve_item_id($pdo, $it['name'] ?? null, $it['item_id'] ?? null),
                               sf_resolve_mval_id($pdo, 'colours', $it['color'] ?? null, $it['color_id'] ?? null),
                               nz($it['unit'] ?? ''), sf_resolve_mval_id($pdo, 'uoms', $it['unit'] ?? null, $it['unit_id'] ?? null),
                               pf($it['retQty'] ?? 0),
                               nz($it['returnType'] ?? ''), nz($it['remark'] ?? ''), extra_json($it, $iKnown)]);
        }
    }
}

function persist_audit(PDO $pdo, array $rows): void {
    $pdo->exec('DELETE FROM audit_trail');
    $known = ['id','at','user','area','action','record','changes'];
    $ins = $pdo->prepare('INSERT INTO audit_trail (id, at_iso, user_name, area, action, record_ref, extra_json) VALUES (?,?,?,?,?,?,?)');
    $insC = $pdo->prepare('INSERT INTO audit_trail_changes (audit_id, sort_order, change_txt) VALUES (?,?,?)');
    $seen = [];
    foreach ($rows as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'aud');
        $ins->execute([$id, nz($x['at'] ?? ''), nz($x['user'] ?? ''), nz($x['area'] ?? ''),
                       nz($x['action'] ?? ''), nz($x['record'] ?? ''), extra_json($x, $known)]);
        foreach (array_values(is_array($x['changes'] ?? null) ? $x['changes'] : []) as $i => $c)
            $insC->execute([$id, $i, is_scalar($c) ? (string)$c : json_encode($c, JSON_UNESCAPED_UNICODE)]);
    }
}

function persist_custom_reports(PDO $pdo, array $rows): void {
    $pdo->exec('DELETE FROM custom_reports');
    $known = ['id','name','folder','source','sources','chartType','reportFormat','from','to',
              'breakdowns','metrics','filters','sortCol','sortDir','createdBy','createdAt','updatedAt'];
    $ins = $pdo->prepare('INSERT INTO custom_reports
        (id, name, folder, source, chart_type, report_format, date_from, date_to, sort_col, sort_dir,
         created_by, created_at_ms, updated_at_ms, extra_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    $insF = $pdo->prepare('INSERT INTO custom_report_fields (report_id, field_role, field_key, sort_order) VALUES (?,?,?,?)');
    $insFl = $pdo->prepare('INSERT INTO custom_report_filters (report_id, filter_key, filter_value) VALUES (?,?,?)');
    $seen = [];
    foreach ($rows as $x) {
        if (!is_array($x)) continue;
        $id = sf_uid($x, $seen, 'rpt');
        $ins->execute([
            $id, s($x['name'] ?? ''), nz($x['folder'] ?? ''), nz($x['source'] ?? ''),
            nz($x['chartType'] ?? ''), nz($x['reportFormat'] ?? ''), nz($x['from'] ?? ''), nz($x['to'] ?? ''),
            nz($x['sortCol'] ?? ''), nz($x['sortDir'] ?? ''), nz($x['createdBy'] ?? ''),
            ni($x['createdAt'] ?? null), ni($x['updatedAt'] ?? null), extra_json($x, $known),
        ]);
        foreach (['sources' => 'source', 'breakdowns' => 'breakdown', 'metrics' => 'metric'] as $lk => $role) {
            foreach (array_values(is_array($x[$lk] ?? null) ? $x[$lk] : []) as $i => $f)
                if (s($f) !== '') $insF->execute([$id, $role, s($f), $i]);
        }
        foreach ((is_array($x['filters'] ?? null) ? $x['filters'] : []) as $fk => $fv)
            $insFl->execute([$id, s($fk), json_encode($fv, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }
}
