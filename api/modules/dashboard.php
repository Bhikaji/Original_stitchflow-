<?php
/* StitchFlow ERP — Dashboard module (computed summary over all collections) */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

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
]]);
