<?php
/* =====================================================================
   StitchFlow ERP — Database Hardening Migration (DB-01, DB-04, PERF-03)
   1. Increases trim and line item rate precision to DECIMAL(16, 4).
   2. Creates missing indexes on foreign key columns across 22 tables.
   3. Refactors v_po_received view to use pre-aggregated LEFT JOIN.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

$pdo = sf_pdo();
echo "Starting StitchFlow ERP schema hardening migration...\n";

/* ---------------------------------------------------------------------
   1. Increase Decimal Precision (DB-01)
   --------------------------------------------------------------------- */
$precisionCols = [
    ['costing_rows', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['inward_items', 'po_rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['jobwork_garments', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['process_inward_items', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['process_outward_items', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['purchase_order_items', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['purchase_return_items', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
    ['sale_items', 'rate', 'DECIMAL(16, 4) NOT NULL DEFAULT 0.0000'],
];

echo "\n[1/3] Updating rate columns to DECIMAL(16, 4)...\n";
foreach ($precisionCols as [$tbl, $col, $typeDef]) {
    try {
        $sql = "ALTER TABLE `{$tbl}` MODIFY COLUMN `{$col}` {$typeDef}";
        $pdo->exec($sql);
        echo "  - Modified {$tbl}.{$col} -> {$typeDef}\n";
    } catch (PDOException $e) {
        echo "  ! Error on {$tbl}.{$col}: " . $e->getMessage() . "\n";
    }
}

/* ---------------------------------------------------------------------
   2. Add Missing Foreign Key Indexes (DB-04)
   --------------------------------------------------------------------- */
$fkIndexes = [
    'costing_rows' => [
        'idx_costing_rows_item_id' => 'item_id',
        'idx_costing_rows_color_id' => 'color_id',
        'idx_costing_rows_unit_id' => 'unit_id',
    ],
    'costings' => [
        'idx_costings_style_id' => 'style_id',
        'idx_costings_buyer_id' => 'buyer_id',
    ],
    'inward_items' => [
        'idx_inward_items_color_id' => 'color_id',
        'idx_inward_items_unit_id' => 'unit_id',
    ],
    'inwards' => [
        'idx_inwards_warehouse_id' => 'warehouse_id',
        'idx_inwards_vendor_id' => 'vendor_id',
    ],
    'jobwork_issues' => [
        'idx_jobwork_issues_color_id' => 'color_id',
        'idx_jobwork_issues_unit_id' => 'unit_id',
    ],
    'jobwork_receipts' => [
        'idx_jobwork_receipts_item_id' => 'item_id',
        'idx_jobwork_receipts_color_id' => 'color_id',
        'idx_jobwork_receipts_unit_id' => 'unit_id',
    ],
    'jobwork_return_items' => [
        'idx_jobwork_return_items_item_id' => 'item_id',
        'idx_jobwork_return_items_color_id' => 'color_id',
        'idx_jobwork_return_items_unit_id' => 'unit_id',
    ],
    'jobwork_returns' => [
        'idx_jobwork_returns_vendor_id' => 'vendor_id',
    ],
    'jobworks' => [
        'idx_jobworks_process_type_id' => 'process_type_id',
    ],
    'login_slides' => [
        'idx_login_slides_slide_id' => 'slide_id',
    ],
    'master_values' => [
        'idx_master_values_master_id' => 'master_id',
    ],
    'process_inward_items' => [
        'idx_process_inward_items_item_id' => 'item_id',
        'idx_process_inward_items_color_id' => 'color_id',
        'idx_process_inward_items_unit_id' => 'unit_id',
    ],
    'process_inwards' => [
        'idx_process_inwards_vendor_id' => 'vendor_id',
        'idx_process_inwards_process_type_id' => 'process_type_id',
    ],
    'process_outward_items' => [
        'idx_process_outward_items_item_id' => 'item_id',
        'idx_process_outward_items_color_id' => 'color_id',
        'idx_process_outward_items_unit_id' => 'unit_id',
    ],
    'process_outwards' => [
        'idx_process_outwards_vendor_id' => 'vendor_id',
        'idx_process_outwards_process_type_id' => 'process_type_id',
    ],
    'purchase_order_items' => [
        'idx_purchase_order_items_classification_id' => 'classification_id',
        'idx_purchase_order_items_color_id' => 'color_id',
        'idx_purchase_order_items_unit_id' => 'unit_id',
    ],
    'purchase_orders' => [
        'idx_purchase_orders_buyer_id' => 'buyer_id',
        'idx_purchase_orders_classification_id' => 'classification_id',
        'idx_purchase_orders_category_id' => 'category_id',
        'idx_purchase_orders_raised_for_id' => 'raised_for_id',
        'idx_purchase_orders_pay_terms_id' => 'pay_terms_id',
        'idx_purchase_orders_transport_mode_id' => 'transport_mode_id',
    ],
    'purchase_return_items' => [
        'idx_purchase_return_items_item_id' => 'item_id',
        'idx_purchase_return_items_color_id' => 'color_id',
        'idx_purchase_return_items_unit_id' => 'unit_id',
    ],
    'purchase_returns' => [
        'idx_purchase_returns_supplier_id' => 'supplier_id',
        'idx_purchase_returns_warehouse_id' => 'warehouse_id',
    ],
    'sale_items' => [
        'idx_sale_items_item_id' => 'item_id',
        'idx_sale_items_color_id' => 'color_id',
        'idx_sale_items_unit_id' => 'unit_id',
    ],
    'sales' => [
        'idx_sales_customer_id' => 'customer_id',
        'idx_sales_transport_mode_id' => 'transport_mode_id',
        'idx_sales_pay_terms_id' => 'pay_terms_id',
    ],
    'styles' => [
        'idx_styles_portal_id' => 'portal_id',
    ],
];

echo "\n[2/3] Adding missing foreign key indexes across 22 tables...\n";
foreach ($fkIndexes as $tbl => $indexes) {
    // Check existing indexes for $tbl
    $existing = [];
    $stmt = $pdo->prepare("SHOW INDEX FROM `{$tbl}`");
    $stmt->execute();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $existing[$row['Key_name']] = true;
    }

    foreach ($indexes as $indexName => $colName) {
        if (isset($existing[$indexName])) {
            echo "  - Index {$tbl}.{$indexName} already exists.\n";
            continue;
        }
        try {
            $pdo->exec("ALTER TABLE `{$tbl}` ADD INDEX `{$indexName}` (`{$colName}`)");
            echo "  + Created index {$tbl}.{$indexName} on (`{$colName}`)\n";
        } catch (PDOException $e) {
            echo "  ! Error creating {$tbl}.{$indexName}: " . $e->getMessage() . "\n";
        }
    }
}

/* ---------------------------------------------------------------------
   3. Refactor v_po_received View (PERF-03)
   --------------------------------------------------------------------- */
echo "\n[3/3] Refactoring view v_po_received to eliminate correlated subquery bottleneck...\n";
try {
    $viewSql = "CREATE OR REPLACE VIEW `v_po_received` AS
SELECT `p`.`po_no` AS `po_no`,
       `li`.`item_id` AS `item_id`,
       `li`.`name` AS `item_name`,
       `li`.`color_id` AS `color_id`,
       `li`.`color` AS `color`,
       `li`.`qty` AS `po_qty`,
       COALESCE(`rec`.`total_received`, 0) AS `received_qty`
FROM `purchase_orders` `p`
JOIN `purchase_order_items` `li` ON `p`.`id` = `li`.`po_id`
LEFT JOIN (
    SELECT `iw`.`po_ref`,
           COALESCE(`ii`.`item_id`, `ii`.`name`) AS `match_key`,
           SUM(`ii`.`rec_qty`) AS `total_received`
    FROM `inwards` `iw`
    JOIN `inward_items` `ii` ON `iw`.`id` = `ii`.`inward_id`
    WHERE `iw`.`po_ref` IS NOT NULL AND `iw`.`po_ref` != ''
    GROUP BY `iw`.`po_ref`, COALESCE(`ii`.`item_id`, `ii`.`name`)
) `rec` ON `rec`.`po_ref` = `p`.`po_no` AND `rec`.`match_key` = COALESCE(`li`.`item_id`, `li`.`name`)";

    $pdo->exec($viewSql);
    echo "  + Successfully recreated v_po_received with pre-aggregated LEFT JOIN.\n";
} catch (PDOException $e) {
    echo "  ! Error recreating v_po_received: " . $e->getMessage() . "\n";
}

echo "\nMigration complete! All schema hardening changes applied successfully.\n";
