<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

$pdo = sf_pdo();
echo "=== Starting Auto-Increment Primary Key Migration ===\n\n";

// Tables where row_seq exists and should become PRIMARY KEY
$rowSeqTables = [
    'parties'          => 'id',
    'items'            => 'id',
    'styles'           => 'id',
    'users'            => 'id',
    'purchase_orders'  => 'id',
    'inwards'          => 'id',
    'jobworks'         => 'id',
    'process_outwards' => 'id',
    'process_inwards'  => 'id',
    'sales'            => 'id',
    'costings'         => 'id',
    'purchase_returns' => 'id',
    'jobwork_returns'  => 'id',
];

foreach ($rowSeqTables as $table => $oldPk) {
    echo "Processing table '$table'...\n";
    // Check current primary key
    $cols = $pdo->query("DESCRIBE `$table`")->fetchAll();
    $pks = [];
    $hasRowSeq = false;
    foreach ($cols as $c) {
        if ($c['Key'] === 'PRI') $pks[] = $c['Field'];
        if ($c['Field'] === 'row_seq') $hasRowSeq = true;
    }

    if (!$hasRowSeq) {
        // Add row_seq if somehow missing
        echo "  Adding row_seq column to $table...\n";
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `row_seq` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE FIRST");
    }

    if ($pks !== ['row_seq']) {
        echo "  Promoting row_seq to PRIMARY KEY on $table (was " . implode(', ', $pks) . ")...\n";
        try {
            // First drop existing unique on row_seq if present so it doesn't collide
            $pdo->exec("ALTER TABLE `$table` DROP INDEX `row_seq`");
        } catch (Throwable $e) {}

        // Drop current PK, add unique index on oldPk, add PK on row_seq
        $idxName = "idx_{$table}_{$oldPk}";
        try {
            $pdo->exec("ALTER TABLE `$table` ADD UNIQUE KEY `$idxName` (`$oldPk`)");
        } catch (Throwable $e) {}

        $pdo->exec("ALTER TABLE `$table` DROP PRIMARY KEY, ADD PRIMARY KEY (`row_seq`)");
        echo "  [SUCCESS] $table PRIMARY KEY is now (row_seq)\n";
    } else {
        echo "  [ALREADY DONE] $table PRIMARY KEY is already (row_seq)\n";
    }
}

// Tables without auto-increment PK: warehouse_addresses, sequences, kv_store
$customPkTables = [
    'warehouse_addresses' => 'warehouse',
    'sequences'           => 'seq_key',
    'kv_store'            => 'k'
];

foreach ($customPkTables as $table => $oldKey) {
    echo "Processing table '$table'...\n";
    $cols = $pdo->query("DESCRIBE `$table`")->fetchAll();
    $hasId = false;
    $pks = [];
    foreach ($cols as $c) {
        if ($c['Field'] === 'id') $hasId = true;
        if ($c['Key'] === 'PRI') $pks[] = $c['Field'];
    }

    if (!$hasId) {
        echo "  Adding auto-increment id column to $table...\n";
        // Drop existing primary key on oldKey, add unique key on oldKey, add id as auto_increment primary key
        $idxName = "idx_{$table}_{$oldKey}";
        try {
            $pdo->exec("ALTER TABLE `$table` ADD UNIQUE KEY `$idxName` (`$oldKey`)");
        } catch (Throwable $e) {}
        $pdo->exec("ALTER TABLE `$table` DROP PRIMARY KEY");
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST");
        echo "  [SUCCESS] Added id as AUTO_INCREMENT PRIMARY KEY on $table\n";
    } else {
        echo "  [ALREADY DONE] id exists on $table\n";
    }
}

echo "\n=== Updating Database Views for Key-Based Joins ===\n";

// 1. v_stock_ledger: include item_id
$pdo->exec("DROP VIEW IF EXISTS `v_stock_ledger`");
$pdo->exec("CREATE VIEW `v_stock_ledger` AS
    SELECT 
        w.inward_date AS txn_date,
        'inward' AS txn_type,
        w.inward_no AS ref_no,
        i.item_id AS item_id,
        i.name AS item_name,
        i.color_id AS color_id,
        i.unit_id AS unit_id,
        i.rec_qty AS qty_in,
        0 AS qty_out
    FROM inward_items i
    JOIN inwards w ON w.id = i.inward_id
    UNION ALL
    SELECT
        jr.return_date AS txn_date,
        'jobwork_return' AS txn_type,
        jr.return_no AS ref_no,
        ji.item_id AS item_id,
        ji.name AS item_name,
        ji.color_id AS color_id,
        ji.unit_id AS unit_id,
        ji.ret_qty AS qty_in,
        0 AS qty_out
    FROM jobwork_return_items ji
    JOIN jobwork_returns jr ON jr.id = ji.return_id
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
    JOIN purchase_returns pr ON pr.id = pi.return_id
");
echo "  [SUCCESS] Recreated v_stock_ledger with item_id foreign keys\n";

// 2. v_item_stock: group by item_id (with fallback to item_name)
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
    GROUP BY COALESCE(sl.item_id, sl.item_name)
");
echo "  [SUCCESS] Recreated v_item_stock grouped by item_id\n";

// 3. v_po_received: join on item_id key rather than text name
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
                  (li.item_id IS NOT NULL AND ii.item_id IS NOT NULL AND ii.item_id = li.item_id)
                  OR (LOWER(TRIM(ii.name)) = LOWER(TRIM(li.name)))
              )
        ), 0) AS received_qty
    FROM purchase_order_items li
    JOIN purchase_orders p ON p.id = li.po_id
");
echo "  [SUCCESS] Recreated v_po_received with key-based comparison (ii.item_id = li.item_id)\n";

echo "\n=== Migration Complete ===\n";
