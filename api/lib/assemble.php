<?php
/* =====================================================================
   StitchFlow ERP — assembly layer
   Rebuilds the application `db` document from the normalized MySQL
   schema — the exact structure the StitchFlow front-end works with.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/persist.php';

function fnum($v) { return $v === null ? 0 : (float)$v; }
function fstr($v): string { return $v === null ? '' : (string)$v; }

function sf_initialized(): bool {
    $st = sf_pdo()->prepare('SELECT v FROM kv_store WHERE k = ?');
    $st->execute(['initialized']);
    return $st->fetchColumn() === '1';
}

function assemble_db(): array {
    $pdo = sf_pdo();
    $db = [];

    /* ---- sequences ---- */
    $db['seq'] = [];
    foreach ($pdo->query('SELECT seq_key, seq_value FROM sequences') as $r)
        $db['seq'][$r['seq_key']] = (int)$r['seq_value'];

    /* ---- transactions ---- */
    $db['po']             = assemble_pos($pdo);
    $db['inward']         = assemble_inwards($pdo);
    $db['jobwork']        = assemble_jobwork_like($pdo, 'jobwork');
    $db['processoutward'] = assemble_process_outwards($pdo);
    $db['processinward']  = assemble_process_inwards($pdo);
    $db['sample']         = assemble_jobwork_like($pdo, 'sample');
    $db['sale']           = assemble_sales($pdo);
    $db['costing']        = assemble_costings($pdo);
    $db['purchasereturn'] = assemble_purchase_returns($pdo);
    $db['jobworkreturn']  = assemble_jobwork_returns($pdo);
    $db['auditTrail']     = assemble_audit($pdo);
    $db['customReports']  = assemble_custom_reports($pdo);
    $db['users']          = assemble_users($pdo);

    /* ---- masters ---- */
    $db['masters'] = assemble_masters($pdo);

    /* ---- gst api settings ---- */
    $g = assemble_gst_settings($pdo);
    if ($g !== null) $db['gstApiSettings'] = $g;

    /* ---- leftover top-level keys ---- */
    foreach ($pdo->query("SELECT k, v FROM kv_store WHERE k LIKE 'toplevel:%'") as $r) {
        $key = substr($r['k'], strlen('toplevel:'));
        $val = json_decode((string)$r['v'], true);
        if (!array_key_exists($key, $db)) $db[$key] = $val;
    }
    return $db;
}

/* =====================================================================
   MASTERS
   ===================================================================== */
function assemble_masters(PDO $pdo): array {
    $m = [];
    foreach (SF_LIST_MASTERS as $k) $m[$k] = [];
    $ids = []; $status = []; $parents = [];
    foreach ($pdo->query('SELECT * FROM master_values ORDER BY master_key, sort_order, id') as $r) {
        $k = $r['master_key'];
        if (!isset($m[$k])) $m[$k] = [];
        $m[$k][] = sf_mv_decode((string)$r['value']);
        $lk = mb_strtolower(trim((string)$r['value']));
        if ($r['master_id'] !== null && $r['master_id'] !== '') $ids[$k][$lk] = $r['master_id'];
        $status[$k][$lk] = (bool)(int)$r['is_active'];
        if ($r['parent_value'] !== null && $r['parent_value'] !== '') $parents[$k][(string)$r['value']] = $r['parent_value'];
    }
    foreach ($pdo->query("SELECT k, v FROM kv_store WHERE k LIKE 'parentorphan:%'") as $r) {
        $parts = explode(':', substr($r['k'], strlen('parentorphan:')), 2);
        if (count($parts) === 2) $parents[$parts[0]][$parts[1]] = (string)$r['v'];
    }
    $m['masterIds'] = (object)array_map(function ($x) { return (object)$x; }, $ids);
    $m['masterStatus'] = (object)array_map(function ($x) { return (object)$x; }, $status);
    $m['parentMap'] = (object)array_map(function ($x) { return (object)$x; }, $parents);
    $seq = [];
    foreach ($pdo->query('SELECT master_key, seq_value FROM master_id_sequences') as $r)
        $seq[$r['master_key']] = (int)$r['seq_value'];
    $m['masterIdSeq'] = (object)$seq;
    $wh = [];
    foreach ($pdo->query('SELECT warehouse, address FROM warehouse_addresses') as $r)
        $wh[$r['warehouse']] = fstr($r['address']);
    $m['warehouseAddr'] = (object)$wh;

    /* styles */
    $m['styles'] = [];
    foreach ($pdo->query('SELECT * FROM styles ORDER BY row_seq') as $r) {
        $doc = [
            'id' => $r['id'], 'internal' => fstr($r['internal_id']), 'portal' => fstr($r['portal_id']),
            'desc' => fstr($r['description']), 'buyer' => fstr($r['buyer']),
            'active' => (bool)(int)$r['is_active'],
        ];
        $m['styles'][] = merge_extra($doc, $r['extra_json']);
    }

    /* items */
    $sizes = [];
    foreach ($pdo->query('SELECT item_id, size FROM item_sizes ORDER BY item_id, sort_order') as $r)
        $sizes[$r['item_id']][] = $r['size'];
    $m['items'] = [];
    foreach ($pdo->query('SELECT * FROM items ORDER BY row_seq') as $r) {
        $classification = fstr($r['classification']);
        if ($classification === '' && !empty($m['classifications'])) {
            $nameLower = strtolower(trim(fstr($r['name'])));
            $catLower = strtolower(trim(fstr($r['category'])));
            foreach ($m['classifications'] as $cVal) {
                $cStr = trim((string)$cVal);
                $cLower = strtolower($cStr);
                if ($cLower === '' || $cLower === 'other') continue;
                if ($nameLower === $cLower || strpos($nameLower, $cLower) === 0 || strpos($cLower, $nameLower) === 0) {
                    $classification = $cStr;
                    break;
                }
                $tokens = preg_split('/[\s\-\/\,\(\)]+/', $cLower, -1, PREG_SPLIT_NO_EMPTY);
                foreach ($tokens as $tk) {
                    $stem = rtrim($tk, 's');
                    if (strlen($stem) >= 3 && strpos($nameLower, $stem) !== false) {
                        $classification = $cStr;
                        break 2;
                    }
                }
                if ($catLower !== '' && ($catLower === $cLower || strpos($cLower, $catLower) === 0)) {
                    $classification = $cStr;
                    break;
                }
            }
        }
        $doc = [
            'id' => $r['id'], 'code' => fstr($r['code']), 'name' => fstr($r['name']),
            'category' => fstr($r['category']), 'classification' => $classification,
            'materialType' => fstr($r['material_type']), 'quality' => fstr($r['quality']),
            'description' => fstr($r['description']), 'unit' => fstr($r['unit']),
            'width' => fstr($r['width']), 'hsn' => fstr($r['hsn']),
            'gst' => $r['gst'] === null ? '' : (float)$r['gst'],
            'image' => fstr($r['image']), 'active' => (bool)(int)$r['is_active'],
            'hasColor' => (bool)(int)$r['has_color'],
            'sizes' => $sizes[$r['id']] ?? [],
            'colorName' => fstr($r['color_name']), 'moq' => fstr($r['moq']),
            'itemRate' => fstr($r['item_rate']), 'itemMRP' => fstr($r['item_mrp']),
            'cgst' => fstr($r['cgst']), 'sgst' => fstr($r['sgst']), 'igst' => fstr($r['igst']),
            'purchaseRate' => fstr($r['purchase_rate']), 'saleRate' => fstr($r['sale_rate']),
        ];
        $m['items'][] = merge_extra($doc, $r['extra_json']);
    }

    /* parties */
    $bts = [];
    foreach ($pdo->query('SELECT party_id, business_type FROM party_business_types ORDER BY party_id, sort_order') as $r)
        $bts[$r['party_id']][] = $r['business_type'];
    $bills = [];
    foreach ($pdo->query('SELECT * FROM party_bill_tos ORDER BY party_id, sort_order, id') as $r) {
        $b = [
            'name' => fstr($r['name']), 'gstNo' => fstr($r['gst_no']), 'pan' => fstr($r['pan']),
            'gstType' => fstr($r['gst_type']), 'country' => fstr($r['country']), 'state' => fstr($r['state']),
            'district' => fstr($r['district']), 'taluka' => fstr($r['taluka']), 'city' => fstr($r['city']),
            'address' => fstr($r['address']), 'pin' => fstr($r['pin']),
        ];
        $bills[$r['party_id']][] = merge_extra($b, $r['extra_json']);
    }
    $m['parties'] = [];
    foreach ($pdo->query('SELECT * FROM parties ORDER BY row_seq') as $r) {
        $doc = [
            'id' => $r['id'], 'code' => fstr($r['code']),
            'legalName' => fstr($r['legal_name']), 'shortName' => fstr($r['short_name']),
            'siteCode' => fstr($r['site_code']), 'pan' => fstr($r['pan']), 'gstNo' => fstr($r['gst_no']),
            'address' => fstr($r['address']), 'country' => fstr($r['country']), 'state' => fstr($r['state']),
            'district' => fstr($r['district']), 'taluka' => fstr($r['taluka']), 'city' => fstr($r['city']),
            'pin' => fstr($r['pin']), 'status' => fstr($r['status']),
            'businessType' => fstr($r['business_type']),
            'businessTypes' => $bts[$r['id']] ?? [],
            'gstType' => fstr($r['gst_type']),
            'billTos' => $bills[$r['id']] ?? [],
        ];
        $m['parties'][] = merge_extra($doc, $r['extra_json']);
    }

    /* company details */
    $c = $pdo->query('SELECT * FROM company_details WHERE id = 1')->fetch();
    if ($c) {
        $doc = [
            'name' => fstr($c['name']), 'reg' => fstr($c['reg']), 'reg2' => fstr($c['reg2']),
            'works' => fstr($c['works']), 'contact' => fstr($c['contact']), 'gstNo' => fstr($c['gst_no']),
            'pan' => fstr($c['pan']), 'state' => fstr($c['state']), 'stateCode' => fstr($c['state_code']),
            'jurisdiction' => fstr($c['jurisdiction']),
        ];
        $m['companyDetails'] = merge_extra($doc, $c['extra_json']);
    }

    /* login settings */
    $l = $pdo->query('SELECT * FROM login_settings WHERE id = 1')->fetch();
    $slides = [];
    foreach ($pdo->query('SELECT * FROM login_slides ORDER BY sort_order, id') as $r) {
        $sl = [
            'id' => fstr($r['slide_id']), 'name' => fstr($r['name']), 'fit' => fstr($r['fit']),
            'position' => fstr($r['position']), 'active' => (bool)(int)$r['is_active'],
            'data' => fstr($r['data']),
        ];
        $slides[] = merge_extra($sl, $r['extra_json']);
    }
    if ($l || $slides) {
        $ls = ['interval' => $l ? (int)$l['slide_interval'] : 6, 'slides' => $slides];
        $m['loginSettings'] = $l ? merge_extra($ls, $l['extra_json']) : $ls;
    }

    /* menu settings */
    $main = []; $master = [];
    foreach ($pdo->query('SELECT * FROM menu_settings ORDER BY menu_area, sort_order') as $r) {
        if ($r['menu_area'] === 'main') $main[] = $r['item_key']; else $master[] = $r['item_key'];
    }
    if ($main || $master) {
        $ms = ['mainOrder' => $main, 'masterOrder' => $master];
        $st = $pdo->prepare('SELECT v FROM kv_store WHERE k = ?');
        $st->execute(['menuSettingsExtra']);
        $ex = $st->fetchColumn();
        if ($ex) { $exd = json_decode((string)$ex, true); if (is_array($exd)) $ms += $exd; }
        $m['menuSettings'] = $ms;
    }

    /* leftover master keys */
    foreach ($pdo->query("SELECT k, v FROM kv_store WHERE k LIKE 'master:%'") as $r) {
        $key = substr($r['k'], strlen('master:'));
        if (!array_key_exists($key, $m)) $m[$key] = json_decode((string)$r['v'], true);
    }
    return $m;
}

function assemble_gst_settings(PDO $pdo) {
    $g = $pdo->query('SELECT * FROM gst_api_settings WHERE id = 1')->fetch();
    if (!$g) return null;
    $doc = [
        'provider' => fstr($g['provider']), 'environment' => fstr($g['environment']),
        'baseUrl' => fstr($g['base_url']), 'lookupPath' => fstr($g['lookup_path']),
        'queryParam' => fstr($g['query_param']), 'authType' => fstr($g['auth_type']),
        'apiKey' => fstr($g['api_key']), 'proxyEndpoint' => fstr($g['proxy_endpoint']),
        'timeout' => $g['timeout_secs'] === null ? 30 : (int)$g['timeout_secs'],
        'businessType' => fstr($g['business_type']), 'lastChecked' => fstr($g['last_checked']),
        'toggles' => [
            'enabled' => (bool)(int)$g['tog_enabled'], 'proxy' => (bool)(int)$g['tog_proxy'],
            'demo' => (bool)(int)$g['tog_demo'], 'autofill' => (bool)(int)$g['tog_autofill'],
            'typing' => (bool)(int)$g['tog_typing'], 'autocreate' => (bool)(int)$g['tog_autocreate'],
        ],
    ];
    return merge_extra($doc, $g['extra_json']);
}

function assemble_users(PDO $pdo): array {
    $mods = [];
    foreach ($pdo->query('SELECT user_id, module FROM user_modules ORDER BY user_id, sort_order') as $r)
        $mods[$r['user_id']][] = $r['module'];
    $perms = [];
    foreach ($pdo->query('SELECT * FROM user_permissions ORDER BY id') as $r) {
        $perms[$r['user_id']][$r['scope']][$r['perm_key']] = [
            'view' => (bool)(int)$r['can_view'], 'create' => (bool)(int)$r['can_create'],
            'edit' => (bool)(int)$r['can_edit'], 'delete' => (bool)(int)$r['can_delete'],
        ];
    }
    $out = [];
    foreach ($pdo->query('SELECT * FROM users ORDER BY row_seq') as $r) {
        $doc = [
            'id' => $r['id'], 'name' => fstr($r['name']), 'username' => fstr($r['username']),
            'pin' => fstr($r['pin_hash']), 'role' => fstr($r['role']), 'status' => fstr($r['status']),
        ];
        if ($r['access_level'] !== null) $doc['accessLevel'] = $r['access_level'];
        $doc['modules'] = $mods[$r['id']] ?? [];
        if (isset($perms[$r['id']])) {
            $p = $perms[$r['id']];
            $doc['permissions'] = [
                'modules'     => (object)($p['modules'] ?? []),
                'inwardTypes' => (object)($p['inwardTypes'] ?? []),
                'masters'     => (object)($p['masters'] ?? []),
            ];
        }
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

/* =====================================================================
   TRANSACTIONS
   ===================================================================== */
function sf_children(PDO $pdo, string $sql): array {
    $out = [];
    foreach ($pdo->query($sql) as $r) $out[$r['__pid']][] = $r;
    return $out;
}

function assemble_pos(PDO $pdo): array {
    $styles = sf_children($pdo, 'SELECT po_id AS __pid, style FROM purchase_order_styles ORDER BY po_id, sort_order');
    $items  = sf_children($pdo, 'SELECT po_id AS __pid, t.* FROM purchase_order_items t ORDER BY po_id, sort_order');
    $boms   = sf_children($pdo, 'SELECT po_id AS __pid, row_json FROM purchase_order_bom ORDER BY po_id, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM purchase_orders ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['po_no']), 'firm' => fstr($r['firm']), 'date' => fstr($r['po_date']),
            'supplier' => fstr($r['supplier']), 'supplier_id' => fstr($r['supplier_id'] ?? null),
            'billTo' => fstr($r['bill_to']), 'shipTo' => fstr($r['ship_to']),
            'gstType' => fstr($r['gst_type']), 'supplierTrade' => fstr($r['supplier_trade']),
            'poType' => fstr($r['po_type']),
            'buyer' => fstr($r['buyer']), 'buyer_id' => fstr($r['buyer_id'] ?? null),
            'styles' => array_map(function ($x) { return $x['style']; }, $styles[$id] ?? []),
            'bom' => array_map(function ($x) { return json_decode((string)$x['row_json'], true); }, $boms[$id] ?? []),
            'bomType' => fstr($r['bom_type']),
            'classification' => fstr($r['classification']), 'classification_id' => fstr($r['classification_id'] ?? null),
            'category' => fstr($r['category']), 'category_id' => fstr($r['category_id'] ?? null),
            'items' => array_map(function ($it) {
                $doc = [
                    'classification' => fstr($it['classification']), 'classification_id' => fstr($it['classification_id'] ?? null),
                    'name' => fstr($it['name']), 'item_id' => fstr($it['item_id'] ?? null),
                    'specs' => fstr($it['specs']),
                    'color' => fstr($it['color']), 'color_id' => fstr($it['color_id'] ?? null),
                    'qty' => fnum($it['qty']),
                    'unit' => fstr($it['unit']), 'unit_id' => fstr($it['unit_id'] ?? null),
                    'rate' => fnum($it['rate']),
                    'cgstPct' => fnum($it['cgst_pct']), 'sgstPct' => fnum($it['sgst_pct']),
                    'igstPct' => fnum($it['igst_pct']), 'camt' => fnum($it['cgst_amt']),
                    'samt' => fnum($it['sgst_amt']), 'iamt' => fnum($it['igst_amt']),
                    'discount' => fnum($it['discount']), 'amount' => fnum($it['amount']),
                    'totalAmount' => fnum($it['total_amount']),
                ];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']), 'deliveryAddress' => fstr($r['delivery_address']),
            'deliveryDate' => fstr($r['delivery_date']), 'closeDate' => fstr($r['close_date']),
            'raisedFor' => fstr($r['raised_for']), 'raised_for_id' => fstr($r['raised_for_id'] ?? null),
            'qtnNo' => fstr($r['qtn_no']), 'qtnDate' => fstr($r['qtn_date']),
            'payTerms' => fstr($r['pay_terms']), 'pay_terms_id' => fstr($r['pay_terms_id'] ?? null),
            'freightCharges' => fstr($r['freight_charges']),
            'pnf' => fstr($r['pnf']), 'transitInsurance' => fstr($r['transit_insurance']),
            'transportMode' => fstr($r['transport_mode']), 'transport_mode_id' => fstr($r['transport_mode_id'] ?? null),
            'narration' => fstr($r['narration']),
            'terms' => fstr($r['terms']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_inwards(PDO $pdo): array {
    $items = sf_children($pdo, 'SELECT inward_id AS __pid, t.* FROM inward_items t ORDER BY inward_id, sort_order');
    $atts  = sf_children($pdo, 'SELECT inward_id AS __pid, t.* FROM inward_attachments t ORDER BY inward_id, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM inwards ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['inward_no']), 'entryType' => fstr($r['entry_type']),
            'openingRemark' => fstr($r['opening_remark']), 'jwRef' => fstr($r['jw_ref']),
            'vendor' => fstr($r['vendor']), 'vendor_id' => fstr($r['vendor_id'] ?? null),
            'challan' => fstr($r['challan']), 'date' => fstr($r['inward_date']),
            'poRef' => fstr($r['po_ref']), 'grn' => fstr($r['grn']), 'invoiceNo' => fstr($r['invoice_no']),
            'invoiceDate' => fstr($r['invoice_date']),
            'supplier' => fstr($r['supplier']), 'supplier_id' => fstr($r['supplier_id'] ?? null),
            'vehicle' => fstr($r['vehicle']), 'bin' => fstr($r['bin']), 'receivedBy' => fstr($r['received_by']),
            'warehouse' => fstr($r['warehouse']), 'warehouse_id' => fstr($r['warehouse_id'] ?? null),
            'freight' => fnum($r['freight']),
            'freightGst' => fnum($r['freight_gst']), 'freightHsn' => fstr($r['freight_hsn']),
            'attachments' => array_map(function ($a) {
                $doc = ['name' => fstr($a['name']), 'fileName' => fstr($a['file_name']), 'data' => fstr($a['data'])];
                return merge_extra($doc, $a['extra_json']);
            }, $atts[$id] ?? []),
            'items' => array_map(function ($it) {
                $doc = [
                    'classification' => fstr($it['classification']), 'classification_id' => fstr($it['classification_id'] ?? null),
                    'name' => fstr($it['name']), 'item_id' => fstr($it['item_id'] ?? null),
                    'specs' => fstr($it['specs']),
                    'color' => fstr($it['color']), 'color_id' => fstr($it['color_id'] ?? null),
                    'unit' => fstr($it['unit']), 'unit_id' => fstr($it['unit_id'] ?? null),
                    'poRate' => fnum($it['po_rate']), 'gst' => fnum($it['gst']), 'recQty' => fnum($it['rec_qty']),
                ];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_jobwork_like(PDO $pdo, string $docType): array {
    $q = $pdo->quote($docType);
    $styles = sf_children($pdo, "SELECT s.jobwork_id AS __pid, s.style FROM jobwork_styles s JOIN jobworks j ON j.id = s.jobwork_id WHERE j.doc_type = $q ORDER BY s.jobwork_id, s.sort_order");
    $lines  = sf_children($pdo, "SELECT x.jobwork_id AS __pid, x.* FROM jobwork_issues x JOIN jobworks j ON j.id = x.jobwork_id WHERE j.doc_type = $q ORDER BY x.jobwork_id, x.line_kind, x.sort_order");
    $garms  = sf_children($pdo, "SELECT g.jobwork_id AS __pid, g.* FROM jobwork_garments g JOIN jobworks j ON j.id = g.jobwork_id WHERE j.doc_type = $q ORDER BY g.jobwork_id, g.sort_order");
    $rcpts  = sf_children($pdo, "SELECT r.jobwork_id AS __pid, r.* FROM jobwork_receipts r JOIN jobworks j ON j.id = r.jobwork_id WHERE j.doc_type = $q ORDER BY r.jobwork_id, r.sort_order");
    $gsizes = sf_children($pdo, "SELECT gs.garment_id AS __pid, gs.size, gs.qty FROM jobwork_garment_sizes gs ORDER BY gs.id");
    $rsizes = sf_children($pdo, "SELECT rs.receipt_id AS __pid, rs.size, rs.qty FROM jobwork_receipt_sizes rs ORDER BY rs.id");
    $out = [];
    foreach ($pdo->query("SELECT * FROM jobworks WHERE doc_type = $q ORDER BY row_seq") as $r) {
        $id = $r['id'];
        $mkLine = function ($x) {
            $doc = [
                'date' => fstr($x['issue_date']), 'classification' => fstr($x['classification']),
                'item' => fstr($x['item']), 'item_id' => fstr($x['item_id'] ?? null),
                'color_id' => fstr($x['color_id'] ?? null),
                'inwardNo' => fstr($x['inward_no']), 'poRef' => fstr($x['po_ref']),
                'qty' => fnum($x['qty']), 'unit' => fstr($x['unit']), 'unit_id' => fstr($x['unit_id'] ?? null),
            ];
            if ($x['actual_qty'] !== null) $doc['actualQty'] = (float)$x['actual_qty'];
            if ($x['cons'] !== null) $doc['cons'] = (float)$x['cons'];
            if ($x['reason'] !== null) $doc['reason'] = (string)$x['reason'];
            if ($x['dc_no'] !== null) $doc['dcNo'] = (string)$x['dc_no'];
            if ($x['pod'] !== null && $x['pod'] !== '') {
                $doc['pod'] = (string)$x['pod'];
                if ($x['pod_name'] !== null) $doc['podName'] = (string)$x['pod_name'];
                if ($x['pod_kind'] !== null) $doc['podKind'] = (string)$x['pod_kind'];
            }
            return merge_extra($doc, $x['extra_json']);
        };
        $all = $lines[$id] ?? [];
        $issues = array_values(array_map($mkLine, array_filter($all, function ($x) { return $x['line_kind'] === 'issue'; })));
        $extras = array_values(array_map($mkLine, array_filter($all, function ($x) { return $x['line_kind'] === 'extra'; })));
        $doc = [
            'id' => $id, 'no' => fstr($r['jw_no']), 'date' => fstr($r['jw_date']),
            'vendor' => fstr($r['vendor']), 'vendor_id' => fstr($r['vendor_id'] ?? null),
            'process_type_id' => fstr($r['process_type_id'] ?? null),
            'styles' => array_map(function ($x) { return $x['style']; }, $styles[$id] ?? []),
            'issues' => $issues,
            'garments' => array_map(function ($g) use ($gsizes) {
                $sz = [];
                foreach ($gsizes[$g['id']] ?? [] as $x) $sz[$x['size']] = fnum($x['qty']);
                $doc = [
                    'style' => fstr($g['style']), 'portal' => fstr($g['portal']), 'desc' => fstr($g['descr']),
                    'colour' => fstr($g['colour']), 'sizes' => (object)$sz,
                    'orderQty' => fnum($g['order_qty']), 'rate' => fnum($g['rate']),
                    'receivedQty' => fnum($g['received_qty']),
                ];
                return merge_extra($doc, $g['extra_json']);
            }, $garms[$id] ?? []),
            'extras' => $extras,
            'issueDate' => fstr($r['issue_date']), 'expectedDate' => fstr($r['expected_date']),
            'receiveDate' => fstr($r['receive_date']), 'status' => fstr($r['status']),
            'notes' => fstr($r['notes']),
            'receipts' => array_map(function ($x) use ($rsizes) {
                $doc = [
                    'rid' => fstr($x['rid']), 'date' => fstr($x['rcpt_date']), 'desc' => fstr($x['descr']),
                    'colour' => fstr($x['colour']), 'color_id' => fstr($x['color_id'] ?? null),
                    'qty' => fnum($x['qty']), 'unit_id' => fstr($x['unit_id'] ?? null),
                ];
                $sz = [];
                foreach ($rsizes[$x['id']] ?? [] as $y) $sz[$y['size']] = fnum($y['qty']);
                if ($sz) $doc['sizes'] = $sz;
                $doc['qc'] = fstr($x['qc']);
                $doc['warehouse'] = fstr($x['warehouse']);
                $doc['consumption'] = fnum($x['consumption']);
                return merge_extra($doc, $x['extra_json']);
            }, $rcpts[$id] ?? []),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_process_outwards(PDO $pdo): array {
    $items = sf_children($pdo, 'SELECT outward_id AS __pid, t.* FROM process_outward_items t ORDER BY outward_id, sort_order');
    $sizes = sf_children($pdo, 'SELECT item_id AS __pid, size, qty FROM process_outward_item_sizes ORDER BY id');
    $out = [];
    foreach ($pdo->query('SELECT * FROM process_outwards ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['out_no']), 'date' => fstr($r['out_date']),
            'processType' => fstr($r['process_type']), 'process_type_id' => fstr($r['process_type_id'] ?? null),
            'processor' => fstr($r['processor']), 'vendor_id' => fstr($r['vendor_id'] ?? null),
            'jwRef' => fstr($r['jw_ref']), 'expectedDate' => fstr($r['expected_date']),
            'remarks' => fstr($r['remarks']),
            'items' => array_map(function ($it) use ($sizes) {
                $sz = [];
                foreach ($sizes[$it['id']] ?? [] as $x) $sz[$x['size']] = fnum($x['qty']);
                $doc = ['style' => fstr($it['style']), 'item_id' => fstr($it['item_id'] ?? null), 'sizes' => (object)$sz, 'qty' => fnum($it['qty']), 'rate' => fnum($it['rate'])];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_process_inwards(PDO $pdo): array {
    $items = sf_children($pdo, 'SELECT inward_id AS __pid, t.* FROM process_inward_items t ORDER BY inward_id, sort_order');
    $sizes = sf_children($pdo, 'SELECT item_id AS __pid, size, qty FROM process_inward_item_sizes ORDER BY id');
    $out = [];
    foreach ($pdo->query('SELECT * FROM process_inwards ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['in_no']), 'date' => fstr($r['in_date']),
            'outwardRef' => fstr($r['outward_ref']), 'processType' => fstr($r['process_type']), 'process_type_id' => fstr($r['process_type_id'] ?? null),
            'processor' => fstr($r['processor']), 'vendor_id' => fstr($r['vendor_id'] ?? null),
            'warehouse' => fstr($r['warehouse']),
            'remarks' => fstr($r['remarks']),
            'items' => array_map(function ($it) use ($sizes) {
                $sz = [];
                foreach ($sizes[$it['id']] ?? [] as $x) $sz[$x['size']] = fnum($x['qty']);
                $doc = ['style' => fstr($it['style']), 'item_id' => fstr($it['item_id'] ?? null), 'sizes' => (object)$sz, 'qty' => fnum($it['qty']), 'rate' => fnum($it['rate'])];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_sales(PDO $pdo): array {
    $items = sf_children($pdo, 'SELECT sale_id AS __pid, t.* FROM sale_items t ORDER BY sale_id, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM sales ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['sale_no']), 'date' => fstr($r['sale_date']),
            'customer' => fstr($r['customer']), 'customer_id' => fstr($r['customer_id'] ?? null),
            'channel' => fstr($r['channel']),
            'payStatus' => fstr($r['pay_status']), 'pay_terms_id' => fstr($r['pay_terms_id'] ?? null),
            'payMode' => fstr($r['pay_mode']), 'transport_mode_id' => fstr($r['transport_mode_id'] ?? null),
            'invoiceNo' => fstr($r['invoice_no']), 'notes' => fstr($r['notes']),
            'items' => array_map(function ($it) {
                $doc = ['desc' => fstr($it['descr']), 'item_id' => fstr($it['item_id'] ?? null), 'color_id' => fstr($it['color_id'] ?? null),
                        'unit_id' => fstr($it['unit_id'] ?? null), 'qty' => fnum($it['qty']), 'rate' => fnum($it['rate']),
                        'disc' => fnum($it['disc_pct']), 'tax' => fnum($it['tax_pct']), 'amount' => fnum($it['amount'])];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_costings(PDO $pdo): array {
    $rows = sf_children($pdo, 'SELECT costing_id AS __pid, t.* FROM costing_rows t ORDER BY costing_id, section, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM costings ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $mkRow = function ($x) {
            $doc = ['item' => fstr($x['item']), 'item_id' => fstr($x['item_id'] ?? null), 'cons' => fnum($x['cons']),
                    'uom' => fstr($x['uom']), 'unit_id' => fstr($x['unit_id'] ?? null),
                    'rate' => fnum($x['rate']), 'wastage' => fnum($x['wastage'])];
            return merge_extra($doc, $x['extra_json']);
        };
        $all = $rows[$id] ?? [];
        $extra = $r['extra_json'] ? json_decode((string)$r['extra_json'], true) : null;
        $sub = is_array($extra) && isset($extra['__sub']) ? $extra['__sub'] : [];
        if (is_array($extra)) unset($extra['__sub']);
        $doc = [
            'id' => $id, 'styleImage' => fstr($r['style_image']),
            'order' => array_merge([
                'brand' => fstr($r['brand']), 'buyer_id' => fstr($r['buyer_id'] ?? null),
                'label' => fstr($r['label']), 'style' => fstr($r['style']), 'style_id' => fstr($r['style_id'] ?? null),
                'styleDescription' => fstr($r['style_description']), 'totalQty' => fnum($r['total_qty']),
                'fabricQuality' => fstr($r['fabric_quality']), 'trimFabric' => fstr($r['trim_fabric']),
                'factory' => fstr($r['factory']), 'washType' => fstr($r['wash_type']),
                'sizeRatio' => fstr($r['size_ratio']), 'sam' => fnum($r['sam']), 'fob' => fnum($r['fob']),
            ], is_array($sub['order'] ?? null) ? $sub['order'] : []),
            'breakup' => array_merge([
                'cm' => fnum($r['cm']), 'washing' => fnum($r['washing']), 'photoshoot' => fnum($r['photoshoot']),
                'transportation' => fnum($r['transportation']), 'testing' => fnum($r['testing']),
                'garmentRejection' => fnum($r['garment_rejection_pct']), 'finance' => fnum($r['finance_pct']),
            ], is_array($sub['breakup'] ?? null) ? $sub['breakup'] : []),
            'fabric' => array_values(array_map($mkRow, array_filter($all, function ($x) { return $x['section'] === 'fabric'; }))),
            'sewing' => array_values(array_map($mkRow, array_filter($all, function ($x) { return $x['section'] === 'sewing'; }))),
            'narration' => fstr($r['narration']),
            'totals' => array_merge([
                'orderValue' => fnum($r['order_value']), 'totalMaking' => fnum($r['total_making']),
                'totalProduction' => fnum($r['total_production']), 'margin' => fnum($r['margin']),
                'cmp' => fnum($r['cmp']),
            ], is_array($sub['totals'] ?? null) ? $sub['totals'] : []),
            'date' => fstr($r['cost_date']), 'no' => fstr($r['cost_no']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        if (is_array($extra)) foreach ($extra as $k => $v) if (!array_key_exists($k, $doc)) $doc[$k] = $v;
        $out[] = $doc;
    }
    return $out;
}

function assemble_purchase_returns(PDO $pdo): array {
    $items = sf_children($pdo, 'SELECT return_id AS __pid, t.* FROM purchase_return_items t ORDER BY return_id, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM purchase_returns ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['return_no']), 'date' => fstr($r['return_date']),
            'poRef' => fstr($r['po_ref']), 'inwardNo' => fstr($r['inward_no']),
            'supplier' => fstr($r['supplier']), 'supplier_id' => fstr($r['supplier_id'] ?? null),
            'debitNote' => fstr($r['debit_note']), 'vehicle' => fstr($r['vehicle']),
            'warehouse' => fstr($r['warehouse']), 'warehouse_id' => fstr($r['warehouse_id'] ?? null),
            'returnedBy' => fstr($r['returned_by']),
            'reason' => fstr($r['reason']), 'remarks' => fstr($r['remarks']),
            'items' => array_map(function ($it) {
                $doc = [
                    'classification' => fstr($it['classification']), 'name' => fstr($it['name']),
                    'item_id' => fstr($it['item_id'] ?? null), 'color_id' => fstr($it['color_id'] ?? null),
                    'specs' => fstr($it['specs']), 'color' => fstr($it['color']),
                    'unit' => fstr($it['unit']), 'unit_id' => fstr($it['unit_id'] ?? null),
                    'rate' => fnum($it['rate']), 'recQty' => fnum($it['rec_qty']), 'retQty' => fnum($it['ret_qty']),
                ];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_jobwork_returns(PDO $pdo): array {
    $items = sf_children($pdo, 'SELECT return_id AS __pid, t.* FROM jobwork_return_items t ORDER BY return_id, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM jobwork_returns ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $doc = [
            'id' => $id, 'no' => fstr($r['return_no']), 'date' => fstr($r['return_date']),
            'jwRef' => fstr($r['jw_ref']), 'vendor' => fstr($r['vendor']), 'vendor_id' => fstr($r['vendor_id'] ?? null),
            'warehouse' => fstr($r['warehouse']),
            'challan' => fstr($r['challan']), 'vehicle' => fstr($r['vehicle']),
            'receivedBy' => fstr($r['received_by']), 'remarks' => fstr($r['remarks']),
            'items' => array_map(function ($it) {
                $doc = ['name' => fstr($it['name']), 'item_id' => fstr($it['item_id'] ?? null),
                        'color_id' => fstr($it['color_id'] ?? null), 'unit' => fstr($it['unit']),
                        'unit_id' => fstr($it['unit_id'] ?? null), 'retQty' => fnum($it['ret_qty']),
                        'returnType' => fstr($it['return_type']), 'remark' => fstr($it['remark'])];
                return merge_extra($doc, $it['extra_json']);
            }, $items[$id] ?? []),
            'status' => fstr($r['status']),
        ];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_audit(PDO $pdo): array {
    $changes = sf_children($pdo, 'SELECT audit_id AS __pid, change_txt FROM audit_trail_changes ORDER BY audit_id, sort_order');
    $out = [];
    foreach ($pdo->query('SELECT * FROM audit_trail ORDER BY row_seq') as $r) {
        $doc = [
            'id' => $r['id'], 'at' => fstr($r['at_iso']), 'user' => fstr($r['user_name']),
            'area' => fstr($r['area']), 'action' => fstr($r['action']), 'record' => fstr($r['record_ref']),
            'changes' => array_map(function ($x) { return (string)$x['change_txt']; }, $changes[$r['id']] ?? []),
        ];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}

function assemble_custom_reports(PDO $pdo): array {
    $fields = sf_children($pdo, 'SELECT report_id AS __pid, field_role, field_key FROM custom_report_fields ORDER BY report_id, field_role, sort_order');
    $filters = sf_children($pdo, 'SELECT report_id AS __pid, filter_key, filter_value FROM custom_report_filters ORDER BY report_id, id');
    $out = [];
    foreach ($pdo->query('SELECT * FROM custom_reports ORDER BY row_seq') as $r) {
        $id = $r['id'];
        $f = $fields[$id] ?? [];
        $pick = function ($role) use ($f) {
            return array_values(array_map(function ($x) { return $x['field_key']; }, array_filter($f, function ($x) use ($role) { return $x['field_role'] === $role; })));
        };
        $flt = [];
        foreach ($filters[$id] ?? [] as $x) {
            $flt[$x['filter_key']] = json_decode((string)$x['filter_value'], true);
        }
        $doc = [
            'id' => $id, 'source' => fstr($r['source']), 'sources' => $pick('source'),
            'name' => fstr($r['name']), 'folder' => fstr($r['folder']), 'chartType' => fstr($r['chart_type']),
            'reportFormat' => fstr($r['report_format']), 'from' => fstr($r['date_from']), 'to' => fstr($r['date_to']),
            'breakdowns' => $pick('breakdown'), 'metrics' => $pick('metric'), 'filters' => (object)$flt,
            'sortCol' => fstr($r['sort_col']), 'sortDir' => fstr($r['sort_dir']),
            'createdBy' => fstr($r['created_by']),
        ];
        if ($r['updated_at_ms'] !== null) $doc['updatedAt'] = (int)$r['updated_at_ms'];
        if ($r['created_at_ms'] !== null) $doc['createdAt'] = (int)$r['created_at_ms'];
        $out[] = merge_extra($doc, $r['extra_json']);
    }
    return $out;
}