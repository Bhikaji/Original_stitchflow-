<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';
require_once __DIR__ . '/../api/lib/validate.php';

function sf_v_process_outwards_test(array $db): ?string {
    $jws = [];
    foreach (sf_docs($db, 'jobwork') as $j) {
        $no = s($j['no'] ?? '');
        if ($no === '') continue;
        $jws[$no] = $j;
    }
    
    // Group active outwards by jwRef + processType + style
    $sent = [];
    foreach (sf_active_docs($db, 'processoutward') as $o) {
        $jwRef = s($o['jwRef'] ?? '');
        $procType = s($o['processType'] ?? '');
        foreach ((is_array($o['items'] ?? null) ? $o['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $style = s($it['style'] ?? '');
            $k = $jwRef . '|' . $procType . '|' . mb_strtolower($style);
            $sent[$k] = ($sent[$k] ?? 0) + pf($it['qty'] ?? 0);
        }
    }
    
    // Inwards back
    $back = [];
    $outwardMap = [];
    foreach (sf_docs($db, 'processoutward') as $o) {
        $no = s($o['no'] ?? '');
        if ($no !== '') $outwardMap[$no] = $o;
    }
    foreach (sf_active_docs($db, 'processinward') as $r) {
        $outNo = s($r['outwardRef'] ?? '');
        $outDoc = $outwardMap[$outNo] ?? null;
        if (!$outDoc) continue;
        $jwRef = s($outDoc['jwRef'] ?? '');
        $procType = s($outDoc['processType'] ?? '');
        foreach ((is_array($r['items'] ?? null) ? $r['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $style = s($it['style'] ?? '');
            $k = $jwRef . '|' . $procType . '|' . mb_strtolower($style);
            $back[$k] = ($back[$k] ?? 0) + pf($it['qty'] ?? 0);
        }
    }
    
    foreach ($sent as $k => $totalSent) {
        [$jwRef, $procType, $style] = explode('|', $k, 3);
        if (!isset($jws[$jwRef])) continue; // Standalone or missing JW
        $jw = $jws[$jwRef];
        $jwQty = 0;
        foreach ((is_array($jw['garments'] ?? null) ? $jw['garments'] : []) as $g) {
            if (!is_array($g)) continue;
            $gStyle = mb_strtolower(s($g['style'] ?? $g['desc'] ?? ''));
            if ($gStyle === $style) {
                $q = pf($g['orderQty'] ?? 0);
                if ($q <= 0 && is_array($g['sizes'] ?? null)) {
                    foreach ($g['sizes'] as $szQ) $q += pf($szQ);
                }
                $jwQty += $q;
            }
        }
        $b = $back[$k] ?? 0;
        $netSent = $totalSent - $b;
        if ($netSent > $jwQty + SF_EPS) {
            return "Process Outward: sent quantity for {$style} ({$netSent}) exceeds the Job Work order quantity on {$jwRef} ({$jwQty})";
        }
    }
    return null;
}

$db = assemble_db();

// Test 1: with 5 pcs on JW-0001 (should PASS)
$db['processoutward'] = [
    [
        'id' => 'test_po_1',
        'no' => 'PO-0001',
        'date' => '2026-09-08',
        'jwRef' => 'JW-0001',
        'processType' => 'Embroidery',
        'processor' => 'KEN GLOBAL',
        'status' => 'Open',
        'items' => [
            [
                'style' => 'CS-1000',
                'sizes' => ['S' => 5],
                'qty' => 5,
                'rate' => 5
            ]
        ]
    ]
];
$err1 = sf_v_process_outwards_test($db);
echo "Test 1 (5 pcs): " . ($err1 === null ? "PASS" : "FAIL: $err1") . "\n";

// Test 2: with 10 pcs on JW-0001 (should FAIL)
$db['processoutward'][0]['items'][0]['qty'] = 10;
$err2 = sf_v_process_outwards_test($db);
echo "Test 2 (10 pcs): " . ($err2 !== null ? "PASS (caught: $err2)" : "FAIL (allowed)") . "\n";
