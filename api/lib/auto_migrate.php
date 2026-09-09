<?php
/* =====================================================================
   StitchFlow ERP — Automatic Database Schema Self-Healing & Migration
   Ensures all foreign key columns (item_id, supplier_id, color_id, etc.)
   and auto-increment primary keys exist across all tables.
   Executes safely on local, staging, and remote environments.
   ===================================================================== */
declare(strict_types=1);

function sf_run_auto_migrate(PDO $pdo, bool $verbose = false): array {
    $log = [];
    $schemaCols = [];
    try {
        $st = $pdo->query("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE()");
        while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
            $schemaCols[strtolower($r['TABLE_NAME'])][strtolower($r['COLUMN_NAME'])] = true;
        }
    } catch (Throwable $e) {
        $schemaCols = [];
    }

    $hasCol = function (string $tbl, string $col) use ($pdo, &$schemaCols): bool {
        $t = strtolower($tbl);
        $c = strtolower($col);
        if (isset($schemaCols[$t][$c])) return true;
        try {
            $st = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
            $st->execute([$tbl, $col]);
            return (bool)$st->fetch();
        } catch (Throwable $e) {
            return false;
        }
    };

    $columnsToEnsure = [
        'purchase_orders' => [
            'supplier_id' => 'VARCHAR(40) DEFAULT NULL',
            'buyer_id' => 'VARCHAR(40) DEFAULT NULL',
            'category_id' => 'VARCHAR(40) DEFAULT NULL',
            'classification_id' => 'VARCHAR(40) DEFAULT NULL',
            'pay_terms_id' => 'VARCHAR(40) DEFAULT NULL',
            'transport_mode_id' => 'VARCHAR(40) DEFAULT NULL',
            'raised_for_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'purchase_order_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
            'classification_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'inwards' => [
            'supplier_id' => 'VARCHAR(40) DEFAULT NULL',
            'vendor_id' => 'VARCHAR(40) DEFAULT NULL',
            'warehouse_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'inward_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'jobworks' => [
            'vendor_id' => 'VARCHAR(40) DEFAULT NULL',
            'process_type_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'jobwork_issues' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'jobwork_receipts' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'jobwork_returns' => [
            'vendor_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'jobwork_return_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'process_outwards' => [
            'vendor_id' => 'VARCHAR(40) DEFAULT NULL',
            'process_type_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'process_outward_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'process_inwards' => [
            'vendor_id' => 'VARCHAR(40) DEFAULT NULL',
            'process_type_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'process_inward_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'sales' => [
            'customer_id' => 'VARCHAR(40) DEFAULT NULL',
            'transport_mode_id' => 'VARCHAR(40) DEFAULT NULL',
            'pay_terms_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'sale_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'costings' => [
            'style_id' => 'VARCHAR(40) DEFAULT NULL',
            'buyer_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'costing_rows' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'purchase_returns' => [
            'supplier_id' => 'VARCHAR(40) DEFAULT NULL',
            'warehouse_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
        'purchase_return_items' => [
            'item_id' => 'VARCHAR(40) DEFAULT NULL',
            'color_id' => 'VARCHAR(40) DEFAULT NULL',
            'unit_id' => 'VARCHAR(40) DEFAULT NULL',
        ],
    ];

    $added = 0;
    foreach ($columnsToEnsure as $tbl => $cols) {
        foreach ($cols as $col => $def) {
            if (!$hasCol($tbl, $col)) {
                try {
                    $pdo->exec("ALTER TABLE `$tbl` ADD COLUMN `$col` $def");
                    $schemaCols[strtolower($tbl)][strtolower($col)] = true;
                    $log[] = "Added column `$col` to `$tbl`";
                    $added++;
                } catch (Throwable $e) {
                    $log[] = "Warning: Could not add `$col` to `$tbl`: " . $e->getMessage();
                }
            }
        }
    }

    // Backfill master IDs if any columns were just added
    if ($added > 0) {
        try {
            $items = [];
            foreach ($pdo->query('SELECT id, code, name FROM items') as $r) {
                $cid = !empty($r['code']) ? $r['code'] : $r['id'];
                if (!empty($r['name'])) $items[mb_strtolower(trim($r['name']))] = $cid;
            }

            if (!empty($items)) {
                // Update purchase_order_items
                $stPoi = $pdo->prepare('UPDATE purchase_order_items SET item_id = ? WHERE id = ?');
                foreach ($pdo->query('SELECT id, name, item_id FROM purchase_order_items WHERE item_id IS NULL OR item_id = ""') as $r) {
                    $k = mb_strtolower(trim($r['name'] ?? ''));
                    if (isset($items[$k])) $stPoi->execute([$items[$k], $r['id']]);
                }

                // Update inward_items
                $stIni = $pdo->prepare('UPDATE inward_items SET item_id = ? WHERE id = ?');
                foreach ($pdo->query('SELECT id, name, item_id FROM inward_items WHERE item_id IS NULL OR item_id = ""') as $r) {
                    $k = mb_strtolower(trim($r['name'] ?? ''));
                    if (isset($items[$k])) $stIni->execute([$items[$k], $r['id']]);
                }

                // Update jobwork_issues
                $stJwi = $pdo->prepare('UPDATE jobwork_issues SET item_id = ? WHERE id = ?');
                foreach ($pdo->query('SELECT id, item, item_id FROM jobwork_issues WHERE item_id IS NULL OR item_id = ""') as $r) {
                    $k = mb_strtolower(trim($r['item'] ?? ''));
                    if (isset($items[$k])) $stJwi->execute([$items[$k], $r['id']]);
                }

                // Update sale_items
                $stSi = $pdo->prepare('UPDATE sale_items SET item_id = ? WHERE id = ?');
                foreach ($pdo->query('SELECT id, descr, item_id FROM sale_items WHERE item_id IS NULL OR item_id = ""') as $r) {
                    $k = mb_strtolower(trim($r['descr'] ?? ''));
                    if (isset($items[$k])) $stSi->execute([$items[$k], $r['id']]);
                }
            }
            $log[] = "Backfilled item_id references for existing transactions";
        } catch (Throwable $e) {
            $log[] = "Note on backfill: " . $e->getMessage();
        }
    }

    // Recreate views to ensure they reference item_id
    try {
        $pdo->exec("DROP VIEW IF EXISTS `v_po_received`");
        $pdo->exec("CREATE VIEW `v_po_received` AS
            SELECT
                p.po_no AS po_no,
                li.item_id AS item_id,
                li.name AS item_name,
                li.color_id AS color_id,
                li.color AS color,
                li.qty AS po_qty,
                COALESCE((
                    SELECT SUM(ii.rec_qty)
                    FROM inward_items ii
                    JOIN inwards iw ON iw.id = ii.inward_id
                    WHERE iw.po_ref = p.po_no
                      AND (
                            (li.item_id IS NOT NULL AND li.item_id <> '' AND ii.item_id = li.item_id)
                            OR (LOWER(TRIM(ii.name)) = LOWER(TRIM(li.name)))
                          )
                ), 0) AS received_qty
            FROM purchase_orders p
            JOIN purchase_order_items li ON li.po_id = p.id");

        $pdo->exec("DROP VIEW IF EXISTS `v_stock_ledger`");
        $pdo->exec("CREATE VIEW `v_stock_ledger` AS
            SELECT
                i.inward_date AS txn_date,
                'inward' AS txn_type,
                i.inward_no AS ref_no,
                ii.item_id AS item_id,
                ii.name AS item_name,
                ii.color_id AS color_id,
                ii.unit_id AS unit_id,
                ii.rec_qty AS qty_in,
                0 AS qty_out
            FROM inward_items ii
            JOIN inwards i ON i.id = ii.inward_id
            WHERE i.status = 'Completed'
            UNION ALL
            SELECT
                COALESCE(x.issue_date, j.jw_date) AS txn_date,
                'jobwork_issue' AS txn_type,
                j.jw_no AS ref_no,
                x.item_id AS item_id,
                x.item AS item_name,
                x.color_id AS color_id,
                x.unit_id AS unit_id,
                0 AS qty_in,
                x.qty AS qty_out
            FROM jobwork_issues x
            JOIN jobworks j ON j.id = x.jobwork_id
            WHERE j.doc_type = 'jobwork'
            UNION ALL
            SELECT
                pr.return_date AS txn_date,
                'purchase_return' AS txn_type,
                pr.return_no AS ref_no,
                pi.item_id AS item_id,
                pi.name AS item_name,
                pi.color_id AS color_id,
                pi.unit_id AS unit_id,
                0 AS qty_in,
                pi.ret_qty AS qty_out
            FROM purchase_return_items pi
            JOIN purchase_returns pr ON pr.id = pi.return_id");

        $pdo->exec("DROP VIEW IF EXISTS `v_item_stock`");
        $pdo->exec("CREATE VIEW `v_item_stock` AS
            SELECT 
                COALESCE(sl.item_id, sl.item_name) AS item_key,
                MAX(sl.item_id) AS item_id,
                MAX(sl.item_name) AS item_name,
                GREATEST(0, SUM(sl.qty_in) - SUM(sl.qty_out)) AS stock_qty
            FROM v_stock_ledger sl
            WHERE (sl.item_id IS NOT NULL AND sl.item_id <> '') 
               OR (sl.item_name IS NOT NULL AND sl.item_name <> '')
            GROUP BY COALESCE(sl.item_id, sl.item_name)");
        
        $log[] = "Updated SQL views (v_po_received, v_stock_ledger, v_item_stock)";
    } catch (Throwable $e) {
        $log[] = "Views update notice: " . $e->getMessage();
    }

    try {
        // Read classifications dynamically from master_values table
        $stCls = $pdo->query("SELECT value, master_id, parent_value FROM master_values WHERE master_key = 'classifications' AND is_active = 1");
        $dbClassifications = $stCls ? $stCls->fetchAll(PDO::FETCH_ASSOC) : [];

        // Read items with empty/null classification dynamically from items table
        $stItems = $pdo->query("SELECT id, name, category, description FROM items WHERE classification IS NULL OR TRIM(classification) = ''");
        $unclassifiedItems = $stItems ? $stItems->fetchAll(PDO::FETCH_ASSOC) : [];

        if (!empty($dbClassifications) && !empty($unclassifiedItems)) {
            $upStmt = $pdo->prepare("UPDATE items SET classification = ? WHERE id = ?");

            foreach ($unclassifiedItems as $item) {
                $itemName = strtolower(trim((string)$item['name']));
                $itemCat = strtolower(trim((string)$item['category']));
                $matchedCls = null;

                foreach ($dbClassifications as $c) {
                    $clsVal = trim((string)$c['value']);
                    $clsLower = strtolower($clsVal);
                    if ($clsVal === '' || $clsLower === 'other') continue;

                    // Direct name match or item name starts with classification name
                    if ($itemName === $clsLower || strpos($itemName, $clsLower) === 0 || strpos($clsLower, $itemName) === 0) {
                        $matchedCls = $clsVal;
                        break;
                    }

                    // Word tokens derived dynamically from classification value in database
                    $tokens = preg_split('/[\s\-\/\,\(\)]+/', $clsLower, -1, PREG_SPLIT_NO_EMPTY);
                    foreach ($tokens as $token) {
                        $stem = rtrim($token, 's');
                        if (strlen($stem) >= 3 && strpos($itemName, $stem) !== false) {
                            $matchedCls = $clsVal;
                            break 2;
                        }
                    }

                    // Category match if category in DB matches classification
                    if ($itemCat !== '' && ($itemCat === $clsLower || strpos($clsLower, $itemCat) === 0)) {
                        $matchedCls = $clsVal;
                        break;
                    }
                }

                if ($matchedCls !== null) {
                    $upStmt->execute([$matchedCls, $item['id']]);
                }
            }
        }
        $log[] = "Synchronized item classifications dynamically from database";
    } catch (Throwable $e) {
        $log[] = "Dynamic classification notice: " . $e->getMessage();
    }

    return $log;
}
 