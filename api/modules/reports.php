<?php
/* StitchFlow ERP — Reports module
   ?report=stock | poreceived | grn | issues | wip | fgreceived
   Reproduces the app's standard reports from the normalized tables/views. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

sf_require_auth();
sf_require_perm('modules', 'reports', 'view');

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
    case 'fabric_inout_summary':
    case 'trims_inout_summary':
        $isFabReport = ($report === 'fabric_inout_summary');
        $from = s($_GET['from'] ?? date('Y-m-d', strtotime('-9 days')));
        $to   = s($_GET['to']   ?? date('Y-m-d'));
        if ($from > $to) { $tmp = $from; $from = $to; $to = $tmp; }

        $isFabric = function (string $name) use ($db): bool {
            $clean = strtolower(trim($name));
            foreach ((array)($db['masters']['items'] ?? []) as $it) {
                if (strtolower(trim(s($it['name'] ?? ''))) === $clean) {
                    return s($it['category'] ?? '') === 'Fabric';
                }
            }
            return (bool)preg_match('/fabric/i', $name);
        };

        $getItemRate = function (string $name, string $inwardNo = '') use ($db): float {
            $clean = strtolower(trim($name));
            if ($inwardNo !== '') {
                foreach ((array)($db['inward'] ?? []) as $inw) {
                    if (s($inw['no'] ?? '') === $inwardNo) {
                        foreach ((array)($inw['items'] ?? []) as $it) {
                            if (strtolower(trim(s($it['name'] ?? ''))) === $clean) {
                                $r = pf($it['poRate'] ?? ($it['rate'] ?? 0));
                                if ($r > 0) return $r;
                            }
                        }
                    }
                }
            }
            foreach ((array)($db['inward'] ?? []) as $inw) {
                foreach ((array)($inw['items'] ?? []) as $it) {
                    if (strtolower(trim(s($it['name'] ?? ''))) === $clean) {
                        $r = pf($it['poRate'] ?? ($it['rate'] ?? 0));
                        if ($r > 0) return $r;
                    }
                }
            }
            foreach ((array)($db['masters']['items'] ?? []) as $it) {
                if (strtolower(trim(s($it['name'] ?? ''))) === $clean) {
                    $r = pf($it['purchase_rate'] ?? ($it['item_rate'] ?? 0));
                    if ($r > 0) return $r;
                }
            }
            return 0.0;
        };

        // 1. Initial Opening before $from
        $curOpenQty = 0.0;
        $curOpenVal = 0.0;
        $daily = []; // [isoDate => ['inQty'=>0, 'inVal'=>0, 'outQty'=>0, 'outVal'=>0]]

        // Process Inwards
        foreach ((array)($db['inward'] ?? []) as $inw) {
            if (!is_array($inw)) continue;
            $st = s($inw['status'] ?? '');
            if (preg_match('/cancel|reject/i', $st)) continue;
            $d = s($inw['date'] ?? '');
            $isOpeningStock = (s($inw['entryType'] ?? '') === 'Opening Stock');
            foreach ((array)($inw['items'] ?? []) as $it) {
                if (!is_array($it)) continue;
                $nm = s($it['name'] ?? '');
                $fab = $isFabric($nm);
                if ($isFabReport ? !$fab : $fab) continue;
                $q = pf($it['recQty'] ?? 0);
                if ($q <= 0) continue;
                $r = pf($it['poRate'] ?? ($it['rate'] ?? 0));
                if ($r <= 0) $r = $getItemRate($nm, s($inw['no'] ?? ''));
                $v = $q * $r;

                if ($d < $from || ($isOpeningStock && $d <= $from)) {
                    $curOpenQty += $q;
                    $curOpenVal += $v;
                } elseif ($d >= $from && $d <= $to) {
                    $daily[$d]['inQty'] = ($daily[$d]['inQty'] ?? 0.0) + $q;
                    $daily[$d]['inVal'] = ($daily[$d]['inVal'] ?? 0.0) + $v;
                }
            }
        }

        // Process Outwards: Job Work issues & extras
        foreach ((array)($db['jobwork'] ?? []) as $jw) {
            if (!is_array($jw)) continue;
            if (preg_match('/cancel/i', s($jw['status'] ?? ''))) continue;
            $lines = array_merge((array)($jw['issues'] ?? []), (array)($jw['extras'] ?? []));
            foreach ($lines as $l) {
                if (!is_array($l)) continue;
                $nm = s($l['item'] ?? '');
                $fab = $isFabric($nm);
                if ($isFabReport ? !$fab : $fab) continue;
                $q = pf(isset($l['actualQty']) && $l['actualQty'] !== '' ? $l['actualQty'] : ($l['qty'] ?? 0));
                if ($q <= 0) continue;
                $d = s($l['date'] ?? ($jw['date'] ?? ''));
                $r = $getItemRate($nm, s($l['inwardNo'] ?? ''));
                $v = $q * $r;

                if ($d < $from) {
                    $curOpenQty -= $q;
                    $curOpenVal -= $v;
                } elseif ($d >= $from && $d <= $to) {
                    $daily[$d]['outQty'] = ($daily[$d]['outQty'] ?? 0.0) + $q;
                    $daily[$d]['outVal'] = ($daily[$d]['outVal'] ?? 0.0) + $v;
                }
            }
        }

        // Process Outwards: Purchase Returns
        foreach ((array)($db['purchasereturn'] ?? []) as $pr) {
            if (!is_array($pr)) continue;
            if (preg_match('/cancel/i', s($pr['status'] ?? ''))) continue;
            $d = s($pr['date'] ?? '');
            foreach ((array)($pr['items'] ?? []) as $it) {
                if (!is_array($it)) continue;
                $nm = s($it['name'] ?? '');
                $fab = $isFabric($nm);
                if ($isFabReport ? !$fab : $fab) continue;
                $q = pf($it['retQty'] ?? 0);
                if ($q <= 0) continue;
                $r = pf($it['rate'] ?? 0);
                if ($r <= 0) $r = $getItemRate($nm, s($pr['poRef'] ?? ''));
                $v = $q * $r;

                if ($d < $from) {
                    $curOpenQty -= $q;
                    $curOpenVal -= $v;
                } elseif ($d >= $from && $d <= $to) {
                    $daily[$d]['outQty'] = ($daily[$d]['outQty'] ?? 0.0) + $q;
                    $daily[$d]['outVal'] = ($daily[$d]['outVal'] ?? 0.0) + $v;
                }
            }
        }

        // Process Outwards: Samples issues & extras
        foreach ((array)($db['sample'] ?? []) as $sm) {
            if (!is_array($sm)) continue;
            if (preg_match('/cancel/i', s($sm['status'] ?? ''))) continue;
            $lines = array_merge((array)($sm['issues'] ?? []), (array)($sm['extras'] ?? []));
            foreach ($lines as $l) {
                if (!is_array($l)) continue;
                $nm = s($l['item'] ?? '');
                $fab = $isFabric($nm);
                if ($isFabReport ? !$fab : $fab) continue;
                $q = pf(isset($l['actualQty']) && $l['actualQty'] !== '' ? $l['actualQty'] : ($l['qty'] ?? 0));
                if ($q <= 0) continue;
                $d = s($l['date'] ?? ($sm['date'] ?? ''));
                $r = $getItemRate($nm, s($l['inwardNo'] ?? ''));
                $v = $q * $r;

                if ($d < $from) {
                    $curOpenQty -= $q;
                    $curOpenVal -= $v;
                } elseif ($d >= $from && $d <= $to) {
                    $daily[$d]['outQty'] = ($daily[$d]['outQty'] ?? 0.0) + $q;
                    $daily[$d]['outVal'] = ($daily[$d]['outVal'] ?? 0.0) + $v;
                }
            }
        }

        // Build continuous calendar day-by-day rows from $from to $to
        $startDate = new DateTime($from);
        $endDate   = new DateTime($to);
        $interval  = new DateInterval('P1D');
        $period    = new DatePeriod($startDate, $interval, (clone $endDate)->modify('+1 day'));

        $totalInQty  = 0.0; $totalInVal  = 0.0;
        $totalOutQty = 0.0; $totalOutVal = 0.0;
        $dayCount = 0;

        foreach ($period as $dt) {
            $iso = $dt->format('Y-m-d');
            $dispDate = $dt->format('d-m-Y');
            $inQ  = $daily[$iso]['inQty']  ?? 0.0;
            $inV  = $daily[$iso]['inVal']  ?? 0.0;
            $outQ = $daily[$iso]['outQty'] ?? 0.0;
            $outV = $daily[$iso]['outVal'] ?? 0.0;

            $clsQty = $curOpenQty + $inQ - $outQ;
            $clsVal = $curOpenVal + $inV - $outV;

            if ($isFabReport) {
                $rows[] = [
                    'date'             => $dispDate,
                    'isoDate'          => $iso,
                    'openingQtyMeter'  => round($curOpenQty, 2),
                    'openingValueRs'   => round($curOpenVal, 2),
                    'inwardQtyMeter'   => round($inQ, 2),
                    'inwardValueRs'    => round($inV, 2),
                    'outwardQtyMeter'  => round($outQ, 2),
                    'outwardValueRs'   => round($outV, 2),
                    'closingQtyMeter'  => round($clsQty, 2),
                    'closingValueRs'   => round($clsVal, 2),
                ];
            } else {
                $rows[] = [
                    'date'             => $dispDate,
                    'isoDate'          => $iso,
                    'openingValueRs'   => round($curOpenVal, 2),
                    'inwardValueRs'    => round($inV, 2),
                    'outwardValueRs'   => round($outV, 2),
                    'closingValueRs'   => round($clsVal, 2),
                ];
            }

            $totalInQty  += $inQ;
            $totalInVal  += $inV;
            $totalOutQty += $outQ;
            $totalOutVal += $outV;
            $curOpenQty   = $clsQty;
            $curOpenVal   = $clsVal;
            $dayCount++;
        }

        $summary = [
            'totalInwardQty'   => round($totalInQty, 2),
            'totalInwardVal'   => round($totalInVal, 2),
            'totalOutwardQty'  => round($totalOutQty, 2),
            'totalOutwardVal'  => round($totalOutVal, 2),
            'finalClosingQty'  => round($curOpenQty, 2),
            'finalClosingVal'  => round($curOpenVal, 2),
            'avgInwardQty'     => $dayCount > 0 ? round($totalInQty / $dayCount, 2) : 0,
            'avgInwardVal'     => $dayCount > 0 ? round($totalInVal / $dayCount, 2) : 0,
            'avgOutwardQty'    => $dayCount > 0 ? round($totalOutQty / $dayCount, 2) : 0,
            'avgOutwardVal'    => $dayCount > 0 ? round($totalOutVal / $dayCount, 2) : 0,
            'dayCount'         => $dayCount,
            'from'             => $from,
            'to'               => $to,
        ];

        sf_json_out([
            'ok'      => true,
            'report'  => $report,
            'title'   => $isFabReport ? 'Fabric Inward and Outward Summary Report' : 'Trims Inward and Outward Summary Report',
            'summary' => $summary,
            'rows'    => $rows,
            'count'   => count($rows),
        ]);
        break;
    default:
        sf_fail('Unknown report — use stock, poreceived, grn, issues, wip, fgreceived, fabric_inout_summary or trims_inout_summary', 400);
}
sf_json_out(['ok' => true, 'report' => $report] + sf_listing($rows, $_GET));
