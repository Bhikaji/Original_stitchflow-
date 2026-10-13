<?php
/* StitchFlow ERP — Dashboard module (computed summary over all collections) */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

sf_require_auth();
sf_require_perm('modules', 'dashboard', 'view');

$db = sf_load_db();
$cnt = fn($k) => count(array_filter((array)($db[$k] ?? []), 'is_array'));
$byStatus = function ($k) use ($db) {
    $out = [];
    foreach ((array)($db[$k] ?? []) as $d) if (is_array($d)) { $st = s($d['status'] ?? '—'); $out[$st] = ($out[$st] ?? 0) + 1; }
    return $out;
};
$stock = [];
foreach (sf_pdo()->query('SELECT item_name, stock_qty FROM v_item_stock ORDER BY item_name') as $r)
    $stock[] = ['item' => $r['item_name'], 'qty' => (float)$r['stock_qty']];
// Fabric & Trims quick inventory and valuation metrics
$fabStockM = 0.0; $fabStockVal = 0.0;
$trimsStockVal = 0.0;
foreach ((array)($db['inward'] ?? []) as $inw) {
    if (preg_match('/cancel|reject/i', s($inw['status'] ?? ''))) continue;
    foreach ((array)($inw['items'] ?? []) as $it) {
        $nm = s($it['name'] ?? '');
        $isFab = false;
        foreach ((array)($db['masters']['items'] ?? []) as $mi) {
            if (strtolower(trim(s($mi['name'] ?? ''))) === strtolower(trim($nm))) {
                $isFab = (s($mi['category'] ?? '') === 'Fabric'); break;
            }
        }
        if (!$isFab && preg_match('/fabric/i', $nm)) $isFab = true;
        $q = pf($it['recQty'] ?? 0);
        $r = pf($it['poRate'] ?? ($it['rate'] ?? 0));
        if ($isFab) {
            $fabStockM += $q;
            $fabStockVal += ($q * $r);
        } else {
            $trimsStockVal += ($q * $r);
        }
    }
}
// Deduct Job Work issues
foreach ((array)($db['jobwork'] ?? []) as $jw) {
    if (preg_match('/cancel/i', s($jw['status'] ?? ''))) continue;
    foreach (array_merge((array)($jw['issues'] ?? []), (array)($jw['extras'] ?? [])) as $l) {
        $nm = s($l['item'] ?? '');
        $isFab = false;
        foreach ((array)($db['masters']['items'] ?? []) as $mi) {
            if (strtolower(trim(s($mi['name'] ?? ''))) === strtolower(trim($nm))) {
                $isFab = (s($mi['category'] ?? '') === 'Fabric'); break;
            }
        }
        if (!$isFab && preg_match('/fabric/i', $nm)) $isFab = true;
        $q = pf(isset($l['actualQty']) && $l['actualQty'] !== '' ? $l['actualQty'] : ($l['qty'] ?? 0));
        // estimate rate
        $r = 0.0;
        foreach ((array)($db['inward'] ?? []) as $inw) {
            foreach ((array)($inw['items'] ?? []) as $it) {
                if (strtolower(trim(s($it['name'] ?? ''))) === strtolower(trim($nm))) {
                    $r = pf($it['poRate'] ?? ($it['rate'] ?? 0)); if ($r > 0) break 2;
                }
            }
        }
        if ($isFab) {
            $fabStockM = max(0.0, $fabStockM - $q);
            $fabStockVal = max(0.0, $fabStockVal - ($q * $r));
        } else {
            $trimsStockVal = max(0.0, $trimsStockVal - ($q * $r));
        }
    }
}

sf_json_out(['ok' => true, 'module' => 'dashboard', 'summary' => [
    'purchaseOrders'   => ['count' => $cnt('po'),             'byStatus' => $byStatus('po')],
    'materialInwards'  => ['count' => $cnt('inward'),         'byStatus' => $byStatus('inward')],
    'jobWorks'         => ['count' => $cnt('jobwork'),        'byStatus' => $byStatus('jobwork')],
    'processOutwards'  => ['count' => $cnt('processoutward'), 'byStatus' => $byStatus('processoutward')],
    'processInwards'   => ['count' => $cnt('processinward'),  'byStatus' => $byStatus('processinward')],
    'samples'          => ['count' => $cnt('sample'),         'byStatus' => $byStatus('sample')],
    'sales'            => ['count' => $cnt('sale'),           'byStatus' => $byStatus('sale')],
    'costings'         => ['count' => $cnt('costing')],
    'purchaseReturns'  => ['count' => $cnt('purchasereturn'), 'byStatus' => $byStatus('purchasereturn')],
    'jobWorkReturns'   => ['count' => $cnt('jobworkreturn'),  'byStatus' => $byStatus('jobworkreturn')],
    'items'            => count((array)($db['masters']['items'] ?? [])),
    'styles'           => count((array)($db['masters']['styles'] ?? [])),
    'parties'          => count((array)($db['masters']['parties'] ?? [])),
    'users'            => $cnt('users'),
    'stock'            => $stock,
    'fabricStock'      => ['meters' => round($fabStockM, 2), 'value' => round($fabStockVal, 2)],
    'trimsStock'       => ['value' => round($trimsStockVal, 2)],
]]);
