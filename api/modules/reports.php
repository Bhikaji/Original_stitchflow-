<?php
/* StitchFlow ERP — Reports module
   ?report=stock | poreceived | grn | issues | wip | fgreceived
   Reproduces the app's standard reports from the normalized tables/views. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

$report = s($_GET['report'] ?? 'stock');
$db = sf_load_db();
$rows = [];
switch ($report) {
    case 'stock':
        foreach (sf_pdo()->query('SELECT item_name, stock_qty FROM v_item_stock ORDER BY item_name') as $r)
            $rows[] = ['item' => $r['item_name'], 'stockQty' => (float)$r['stock_qty']];
        break;
    case 'poreceived':
        foreach (sf_pdo()->query('SELECT * FROM v_po_received ORDER BY po_no') as $r)
            $rows[] = ['poNo' => $r['po_no'], 'item' => $r['item_name'], 'colour' => $r['color'],
                       'poQty' => (float)$r['po_qty'], 'receivedQty' => (float)$r['received_qty'],
                       'pendingQty' => max(0, (float)$r['po_qty'] - (float)$r['received_qty'])];
        break;
    case 'grn':
        foreach ((array)($db['inward'] ?? []) as $in) {
            if (!is_array($in)) continue;
            foreach ((array)($in['items'] ?? []) as $it) if (is_array($it))
                $rows[] = ['inwardNo' => s($in['no'] ?? ''), 'date' => s($in['date'] ?? ''), 'entryType' => s($in['entryType'] ?? ''),
                           'poRef' => s($in['poRef'] ?? ''), 'supplier' => s($in['supplier'] ?? ''), 'invoiceNo' => s($in['invoiceNo'] ?? ''),
                           'item' => s($it['name'] ?? ''), 'colour' => s($it['color'] ?? ''), 'unit' => s($it['unit'] ?? ''),
                           'recQty' => pf($it['recQty'] ?? 0), 'rate' => pf($it['poRate'] ?? 0), 'warehouse' => s($in['warehouse'] ?? '')];
        }
        break;
    case 'issues':
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $k => $lbl) {
            foreach ((array)($db[$k] ?? []) as $j) {
                if (!is_array($j)) continue;
                foreach (array_merge((array)($j['issues'] ?? []), (array)($j['extras'] ?? [])) as $l) if (is_array($l))
                    $rows[] = ['module' => $lbl, 'no' => s($j['no'] ?? ''), 'vendor' => s($j['vendor'] ?? ''),
                               'date' => s($l['date'] ?? ''), 'item' => s($l['item'] ?? ''), 'inwardNo' => s($l['inwardNo'] ?? ''),
                               'qty' => pf($l['qty'] ?? 0),
                               'actualQty' => isset($l['actualQty']) ? pf($l['actualQty']) : null,
                               'unit' => s($l['unit'] ?? ''), 'dcNo' => s($l['dcNo'] ?? ''), 'reason' => s($l['reason'] ?? '')];
            }
        }
        break;
    case 'wip':
        foreach ((array)($db['jobwork'] ?? []) as $j) {
            if (!is_array($j) || in_array(s($j['status'] ?? ''), ['Completed', 'Closed', 'Cancelled'], true)) continue;
            foreach ((array)($j['garments'] ?? []) as $g) if (is_array($g)) {
                $pend = pf($g['orderQty'] ?? 0) - pf($g['receivedQty'] ?? 0);
                if ($pend > 0) $rows[] = ['jobWorkNo' => s($j['no'] ?? ''), 'vendor' => s($j['vendor'] ?? ''),
                    'style' => s($g['style'] ?? ($g['desc'] ?? '')), 'colour' => s($g['colour'] ?? ''),
                    'orderQty' => pf($g['orderQty'] ?? 0), 'receivedQty' => pf($g['receivedQty'] ?? 0), 'pendingQty' => $pend,
                    'status' => s($j['status'] ?? '')];
            }
        }
        break;
    case 'fgreceived':
        foreach (['jobwork' => 'Job Work', 'sample' => 'Sample'] as $k => $lbl) {
            foreach ((array)($db[$k] ?? []) as $j) {
                if (!is_array($j)) continue;
                foreach ((array)($j['receipts'] ?? []) as $r) if (is_array($r))
                    $rows[] = ['module' => $lbl, 'no' => s($j['no'] ?? ''), 'vendor' => s($j['vendor'] ?? ''),
                               'date' => s($r['date'] ?? ''), 'style' => s($r['desc'] ?? ''), 'colour' => s($r['colour'] ?? ''),
                               'qty' => pf($r['qty'] ?? 0), 'qc' => s($r['qc'] ?? ''), 'warehouse' => s($r['warehouse'] ?? ''),
                               'consumption' => pf($r['consumption'] ?? 0)];
            }
        }
        break;
    default:
        sf_fail('Unknown report — use stock, poreceived, grn, issues, wip or fgreceived', 400);
}
sf_json_out(['ok' => true, 'report' => $report] + sf_listing($rows, $_GET));
