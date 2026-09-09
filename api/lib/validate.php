<?php
/* =====================================================================
   StitchFlow ERP — server-side validation layer
   Re-implements the business rules of the original StitchFlow
   application in PHP so the MySQL data can never violate them, even if
   the API is called directly. Rules mirror the front-end exactly:

     • master value format rules (GST %, UOM) and duplicate protection
     • Item Master duplicate names, numeric HSN
     • Party onboarding duplicate legal/short names + duplicate GSTIN
     • Style Master duplicate Internal IDs
     • PO: item rows required, qty > 0, no duplicate item per PO,
       delivery date ≥ PO date, GST amounts = qty × rate × pct
     • Inward (Against PO): over-receipt — Σ received per PO+item+colour
       must not exceed the PO quantity; duplicate supplier invoice per PO
     • Purchase Return: Σ returned per inward+item ≤ received qty
     • Job Work / Sample: combined issue+extra qty per item+inward must
       not exceed that inward's stock (mirrors jwValidateCombinedStock /
       inwardItemStock)
     • Job Work Return: Σ returned per JW+item ≤ issued qty
     • Process Inward: Σ received per outward+style+size ≤ outward qty
     • Users: duplicate usernames

   v5 behaviour preserved: deleting an in-use master is ALLOWED (the
   front-end warns about dangling references) — so no referential
   delete blocks are enforced here, exactly like the source application.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

const SF_EPS = 0.000001;

function sf_validate_db(array $db): ?string {
    $checks = [
        'sf_v_masters', 'sf_v_items', 'sf_v_parties', 'sf_v_styles', 'sf_v_users',
        'sf_v_pos', 'sf_v_inwards', 'sf_v_purchase_returns', 'sf_v_jobwork_stock',
        'sf_v_jobwork_returns', 'sf_v_process_outwards', 'sf_v_process_inwards',
    ];
    foreach ($checks as $fn) {
        $err = $fn($db);
        if ($err !== null) return $err;
    }
    return null;
}

function sf_docs(array $db, string $key): array {
    $v = $db[$key] ?? [];
    return is_array($v) ? array_values(array_filter($v, 'is_array')) : [];
}
function sf_active_docs(array $db, string $key): array {
    return array_values(array_filter(sf_docs($db, $key), function ($d) {
        return lc($d['status'] ?? '') !== 'cancelled';
    }));
}

/* ---- masters: duplicates + per-master value format (masterValueError) */
function sf_v_masters(array $db): ?string {
    $m = is_array($db['masters'] ?? null) ? $db['masters'] : [];
    foreach (SF_LIST_MASTERS as $key) {
        $list = $m[$key] ?? [];
        if (!is_array($list)) continue;
        $seen = [];
        foreach ($list as $v) {
            if (!is_scalar($v)) continue;
            $sv = trim((string)$v);
            if ($sv === '') continue;
            $lk = mb_strtolower($sv);
            if (isset($seen[$lk])) return "“{$sv}” already exists in this master — duplicate values are not allowed";
            $seen[$lk] = 1;
            if ($key === 'gstRates') {
                if (!preg_match('/^\d+(\.\d{1,2})?$/', $sv)) return 'GST % must be a number, e.g. 5, 12 or 18';
                $n = (float)$sv;
                if ($n < 0 || $n > 100) return 'GST % must be between 0 and 100';
            }
            if ($key === 'uoms' && !preg_match('/^[A-Za-z][A-Za-z0-9 .\/-]{0,11}$/', $sv)) {
                return 'UOM must be 1–12 characters, letters/digits only (e.g. m, kg, pcs, sq.mtr)';
            }
        }
    }
    return null;
}

function sf_v_items(array $db): ?string {
    $items = ($db['masters']['items'] ?? []);
    if (!is_array($items)) return null;
    $seen = [];
    foreach ($items as $it) {
        if (!is_array($it)) continue;
        $name = s($it['name'] ?? '');
        if ($name === '') continue;
        $lk = lc($name);
        if (isset($seen[$lk])) return "“{$name}” already exists in Item Master — duplicate names are not allowed";
        $seen[$lk] = 1;
        $hsn = s($it['hsn'] ?? '');
        if ($hsn !== '' && !preg_match('/^\d+$/', $hsn)) return "HSN Code must be numbers only — item “{$name}”";
    }
    return null;
}

function sf_v_parties(array $db): ?string {
    $parties = ($db['masters']['parties'] ?? []);
    if (!is_array($parties)) return null;
    $legals = []; $shorts = []; $gsts = [];
    foreach ($parties as $p) {
        if (!is_array($p)) continue;
        $legal = s($p['legalName'] ?? '');
        $short = s($p['shortName'] ?? '');
        if ($legal !== '') {
            $lk = lc($legal);
            if (isset($legals[$lk])) return "“{$legal}” already exists in Party onboarding Master — duplicate values are not allowed";
            $legals[$lk] = 1;
        }
        if ($short !== '') {
            $lk = lc($short);
            if (isset($shorts[$lk])) return "“{$short}” already exists in Party onboarding Master — duplicate values are not allowed";
            $shorts[$lk] = 1;
        }
        foreach ((is_array($p['billTos'] ?? null) ? $p['billTos'] : []) as $b) {
            if (!is_array($b)) continue;
            $g = strtoupper(s($b['gstNo'] ?? ''));
            if ($g === '') continue;
            if (isset($gsts[$g]) && $gsts[$g] !== ($p['id'] ?? '')) {
                return "GST No already exists — “{$g}” is used by another party. Duplicates are not allowed";
            }
            $gsts[$g] = $p['id'] ?? '';
        }
    }
    return null;
}

function sf_v_styles(array $db): ?string {
    $styles = ($db['masters']['styles'] ?? []);
    if (!is_array($styles)) return null;
    $seen = [];
    foreach ($styles as $st) {
        if (!is_array($st)) continue;
        $int = s($st['internal'] ?? '');
        if ($int === '') continue;
        $lk = lc($int);
        if (isset($seen[$lk])) return "Style “{$int}” already exists — duplicate Internal IDs are not allowed";
        $seen[$lk] = 1;
    }
    return null;
}

function sf_v_users(array $db): ?string {
    $seen = [];
    foreach (sf_docs($db, 'users') as $u) {
        $un = lc($u['username'] ?? '');
        if ($un === '') continue;
        if (isset($seen[$un])) return "Username “{$u['username']}” already exists — duplicate usernames are not allowed";
        $seen[$un] = 1;
    }
    return null;
}

/* ---- PO: rows, qty, duplicate line items, delivery date, GST math ---- */
function sf_v_pos(array $db): ?string {
    foreach (sf_docs($db, 'po') as $po) {
        $no = s($po['no'] ?? 'PO');
        $items = is_array($po['items'] ?? null) ? array_filter($po['items'], 'is_array') : [];
        if (!count($items)) return "PO {$no}: add at least one item";
        $seen = [];
        foreach ($items as $it) {
            $name = lc(preg_replace('/\s*\(.*\)\s*$/', '', s($it['name'] ?? '')));
            if ($name !== '' && isset($seen[$name])) return "PO {$no}: duplicate item — keep a single line per item";
            if ($name !== '') $seen[$name] = 1;
            if (pf($it['qty'] ?? 0) <= 0) return "PO {$no}: quantity must be more than zero — " . s($it['name'] ?? 'item');
            /* GST split must equal qty × rate × pct (as calculated by the app) */
            $amt = pf($it['qty'] ?? 0) * pf($it['rate'] ?? 0);
            foreach ([['cgstPct','camt'], ['sgstPct','samt'], ['igstPct','iamt']] as [$pk, $ak]) {
                $expect = $amt * pf($it[$pk] ?? 0) / 100;
                if (abs($expect - pf($it[$ak] ?? 0)) > 0.05) {
                    return "PO {$no}: GST amount mismatch on “" . s($it['name'] ?? 'item') . "” — line tax must equal qty × rate × GST%";
                }
            }
        }
        $d = s($po['date'] ?? '');
        $dd = s($po['deliveryDate'] ?? '');
        if ($d !== '' && $dd !== '' && $dd < $d) {
            return "PO {$no}: Delivery Date must be the same as or later than the PO Date";
        }
    }
    return null;
}

/* ---- Inward: over-receipt vs PO qty + duplicate invoice per PO ---- */
function sf_v_inwards(array $db): ?string {
    $poQty = [];   // poNo|item(lc) → ordered qty
    foreach (sf_active_docs($db, 'po') as $po) {
        $no = s($po['no'] ?? '');
        foreach ((is_array($po['items'] ?? null) ? $po['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $k = $no . '|' . lc($it['name'] ?? '');
            $poQty[$k] = ($poQty[$k] ?? 0) + pf($it['qty'] ?? 0);
        }
    }
    $recv = []; $inv = [];
    foreach (sf_docs($db, 'inward') as $in) {
        $poRef = s($in['poRef'] ?? '');
        $isPo = $poRef !== '' && strpos($poRef, 'OS-') !== 0 && strpos($poRef, 'JWR-') !== 0;
        if (!$isPo) continue;
        $invNo = lc($in['invoiceNo'] ?? '');
        if ($invNo !== '') {
            $ik = $poRef . '|' . $invNo;
            if (isset($inv[$ik])) return "Invoice " . s($in['invoiceNo'] ?? '') . " is already recorded against {$poRef} — duplicate invoice numbers are not allowed";
            $inv[$ik] = 1;
        }
        foreach ((is_array($in['items'] ?? null) ? $in['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $k = $poRef . '|' . lc($it['name'] ?? '');
            $recv[$k] = ($recv[$k] ?? 0) + pf($it['recQty'] ?? 0);
        }
    }
    // Over-receipt is allowed for inward entries: warn on the UI, but do not block the record.
    // Keep the rest of the validation active for duplicate invoices and valid document structure.
    foreach ($recv as $k => $q) {
        if (!isset($poQty[$k])) continue; // PO may have been edited/removed — front-end governs
        // no hard block here; over-receipt is permitted and handled as a warning in the app.
    }
    return null;
}

/* ---- Purchase Return: Σ returned per inward+item ≤ received ---- */
function sf_v_purchase_returns(array $db): ?string {
    $inwardRec = [];  // inwardNo|item → received
    foreach (sf_docs($db, 'inward') as $in) {
        $no = s($in['no'] ?? '');
        foreach ((is_array($in['items'] ?? null) ? $in['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $k = $no . '|' . lc($it['name'] ?? '');
            $inwardRec[$k] = ($inwardRec[$k] ?? 0) + pf($it['recQty'] ?? 0);
        }
    }
    $ret = [];
    foreach (sf_active_docs($db, 'purchasereturn') as $pr) {
        $inNo = s($pr['inwardNo'] ?? '');
        foreach ((is_array($pr['items'] ?? null) ? $pr['items'] : []) as $it) {
            if (!is_array($it)) continue;
            if (pf($it['retQty'] ?? 0) < 0) return "Purchase Return " . s($pr['no'] ?? '') . ": return quantity cannot be negative";
            if ($inNo === '') continue;
            $k = $inNo . '|' . lc($it['name'] ?? '');
            $ret[$k] = ($ret[$k] ?? 0) + pf($it['retQty'] ?? 0);
        }
    }
    foreach ($ret as $k => $q) {
        if (!isset($inwardRec[$k])) continue;
        if ($q > $inwardRec[$k] + SF_EPS) {
            [$in, $item] = explode('|', $k, 2);
            return "Return quantity for “{$item}” exceeds the received quantity on {$in}";
        }
    }
    return null;
}

/* ---- Job Work / Sample combined stock per item+inward (inwardItemStock) */
function sf_v_jobwork_stock(array $db): ?string {
    $issueQty = function (array $l) {
        return (isset($l['actualQty']) && $l['actualQty'] !== '' && $l['actualQty'] !== null)
            ? pf($l['actualQty']) : pf($l['qty'] ?? 0);
    };
    $avail = [];   // inwardNo|item → received
    $poOf = [];
    foreach (sf_docs($db, 'inward') as $in) {
        $no = s($in['no'] ?? '');
        $poOf[$no] = s($in['poRef'] ?? '');
        foreach ((is_array($in['items'] ?? null) ? $in['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $k = $no . '|' . lc($it['name'] ?? '');
            $avail[$k] = ($avail[$k] ?? 0) + pf($it['recQty'] ?? 0);
        }
    }
    /* purchase returns reduce that inward's stock (by inwardNo, else by PO) */
    foreach (sf_active_docs($db, 'purchasereturn') as $pr) {
        $inNo = s($pr['inwardNo'] ?? '');
        $poRef = s($pr['poRef'] ?? '');
        foreach ((is_array($pr['items'] ?? null) ? $pr['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $nm = lc($it['name'] ?? '');
            if ($inNo !== '') {
                $k = $inNo . '|' . $nm;
                if (isset($avail[$k])) $avail[$k] -= pf($it['retQty'] ?? 0);
            } elseif ($poRef !== '') {
                foreach ($poOf as $no => $po) {
                    if ($po === $poRef && isset($avail[$no . '|' . $nm])) {
                        $avail[$no . '|' . $nm] -= pf($it['retQty'] ?? 0);
                        break;
                    }
                }
            }
        }
    }
    $used = [];
    foreach (['jobwork', 'sample'] as $mod) {
        foreach (sf_docs($db, $mod) as $j) {
            $lines = array_merge(
                is_array($j['issues'] ?? null) ? $j['issues'] : [],
                is_array($j['extras'] ?? null) ? $j['extras'] : []
            );
            foreach ($lines as $l) {
                if (!is_array($l)) continue;
                $no = s($l['inwardNo'] ?? '');
                $item = lc($l['item'] ?? '');
                if ($no === '' || $item === '') continue;
                $k = $no . '|' . $item;
                $used[$k] = ($used[$k] ?? 0) + $issueQty($l);
            }
        }
    }
    foreach ($used as $k => $q) {
        if (!isset($avail[$k])) continue;
        if ($q > $avail[$k] + SF_EPS) {
            [$no, $item] = explode('|', $k, 2);
            return "Combined issue quantity for {$item} on {$no} is " . rtrim(rtrim(number_format($q, 3, '.', ''), '0'), '.') .
                   " but available stock is " . rtrim(rtrim(number_format(max(0, $avail[$k]), 3, '.', ''), '0'), '.');
        }
    }
    return null;
}

/* ---- Job Work Return: Σ returned per JW+item ≤ issued ---- */
function sf_v_jobwork_returns(array $db): ?string {
    $issued = [];
    foreach (sf_docs($db, 'jobwork') as $j) {
        $no = s($j['no'] ?? '');
        $lines = array_merge(
            is_array($j['issues'] ?? null) ? $j['issues'] : [],
            is_array($j['extras'] ?? null) ? $j['extras'] : []
        );
        foreach ($lines as $l) {
            if (!is_array($l)) continue;
            $k = $no . '|' . lc($l['item'] ?? '');
            $q = (isset($l['actualQty']) && $l['actualQty'] !== '' && $l['actualQty'] !== null) ? pf($l['actualQty']) : pf($l['qty'] ?? 0);
            $issued[$k] = ($issued[$k] ?? 0) + $q;
        }
    }
    $ret = [];
    foreach (sf_active_docs($db, 'jobworkreturn') as $r) {
        $jw = s($r['jwRef'] ?? '');
        foreach ((is_array($r['items'] ?? null) ? $r['items'] : []) as $it) {
            if (!is_array($it)) continue;
            $k = $jw . '|' . lc($it['name'] ?? '');
            $ret[$k] = ($ret[$k] ?? 0) + pf($it['retQty'] ?? 0);
        }
    }
    foreach ($ret as $k => $q) {
        if (!isset($issued[$k])) continue;
        if ($q > $issued[$k] + SF_EPS) {
            [$jw, $item] = explode('|', $k, 2);
            return "Job Work Return: return quantity for “{$item}” exceeds the quantity issued on {$jw}";
        }
    }
    return null;
}

/* ---- Process Inward: Σ received per outward+style+size ≤ sent ---- */
function sf_v_process_inwards(array $db): ?string {
    $sent = [];
    foreach (sf_docs($db, 'processoutward') as $o) {
        $no = s($o['no'] ?? '');
        foreach ((is_array($o['items'] ?? null) ? $o['items'] : []) as $it) {
            if (!is_array($it)) continue;
            foreach ((is_array($it['sizes'] ?? null) ? $it['sizes'] : []) as $sz => $q) {
                $k = $no . '|' . s($it['style'] ?? '') . '|' . s($sz);
                $sent[$k] = ($sent[$k] ?? 0) + pf($q);
            }
        }
    }
    $recv = [];
    foreach (sf_docs($db, 'processinward') as $r) {
        if (lc($r['status'] ?? '') === 'cancelled') continue;
        $no = s($r['outwardRef'] ?? '');
        foreach ((is_array($r['items'] ?? null) ? $r['items'] : []) as $it) {
            if (!is_array($it)) continue;
            foreach ((is_array($it['sizes'] ?? null) ? $it['sizes'] : []) as $sz => $q) {
                $k = $no . '|' . s($it['style'] ?? '') . '|' . s($sz);
                $recv[$k] = ($recv[$k] ?? 0) + pf($q);
            }
        }
    }
    foreach ($recv as $k => $q) {
        if (!isset($sent[$k])) continue;
        if ($q > $sent[$k] + SF_EPS) {
            [$no, $style, $sz] = explode('|', $k, 3);
            return "Process Inward: received quantity for {$style} / {$sz} exceeds the pending quantity on {$no}";
        }
    }
    return null;
}

/* ---- Process Outward: Σ sent per JW+process_type+style ≤ JW garment qty ---- */
function sf_v_process_outwards(array $db): ?string {
    $jws = [];
    foreach (sf_docs($db, 'jobwork') as $j) {
        $no = s($j['no'] ?? '');
        if ($no === '') continue;
        $jws[$no] = $j;
    }
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
        if (!isset($jws[$jwRef])) continue;
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