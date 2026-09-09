<?php
/* =====================================================================
   StitchFlow ERP — Master ID & Foreign Key Migration Script
   Adds ID reference columns to all document headers and line item tables,
   indexes them, and backfills IDs matching existing text values.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

$pdo = sf_pdo();

function addColIfNotExists(PDO $pdo, string $table, string $col, string $def): void {
    $st = $pdo->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $st->execute([$table, $col]);
    if ($st->fetch() === false) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$col` $def");
        echo "Added column `$col` to `$table`\n";
    }
}

function addIndexIfNotExists(PDO $pdo, string $table, string $idxName, string $cols): void {
    $st = $pdo->prepare("SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?");
    $st->execute([$table, $idxName]);
    if ($st->fetch() === false) {
        $pdo->exec("ALTER TABLE `$table` ADD INDEX `$idxName` ($cols)");
        echo "Added index `$idxName` to `$table`\n";
    }
}

echo "Starting Schema Migration for Master IDs...\n";

// 1. Purchase Orders & PO Items
addColIfNotExists($pdo, 'purchase_orders', 'supplier_id', 'VARCHAR(40) DEFAULT NULL AFTER `supplier`');
addColIfNotExists($pdo, 'purchase_orders', 'buyer_id', 'VARCHAR(40) DEFAULT NULL AFTER `buyer`');
addColIfNotExists($pdo, 'purchase_orders', 'category_id', 'VARCHAR(40) DEFAULT NULL AFTER `category`');
addColIfNotExists($pdo, 'purchase_orders', 'classification_id', 'VARCHAR(40) DEFAULT NULL AFTER `classification`');
addColIfNotExists($pdo, 'purchase_orders', 'pay_terms_id', 'VARCHAR(40) DEFAULT NULL AFTER `pay_terms`');
addColIfNotExists($pdo, 'purchase_orders', 'transport_mode_id', 'VARCHAR(40) DEFAULT NULL AFTER `transport_mode`');
addColIfNotExists($pdo, 'purchase_orders', 'raised_for_id', 'VARCHAR(40) DEFAULT NULL AFTER `raised_for`');
addIndexIfNotExists($pdo, 'purchase_orders', 'idx_po_supplier_id', '`supplier_id`');

addColIfNotExists($pdo, 'purchase_order_items', 'item_id', 'VARCHAR(40) DEFAULT NULL AFTER `name`');
addColIfNotExists($pdo, 'purchase_order_items', 'color_id', 'VARCHAR(40) DEFAULT NULL AFTER `color`');
addColIfNotExists($pdo, 'purchase_order_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL AFTER `unit`');
addColIfNotExists($pdo, 'purchase_order_items', 'classification_id', 'VARCHAR(40) DEFAULT NULL AFTER `classification`');
addIndexIfNotExists($pdo, 'purchase_order_items', 'idx_poi_item_id', '`item_id`');

// 2. Inwards & Inward Items
addColIfNotExists($pdo, 'inwards', 'supplier_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'inwards', 'vendor_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'inwards', 'warehouse_id', 'VARCHAR(40) DEFAULT NULL');
addIndexIfNotExists($pdo, 'inwards', 'idx_inw_supplier_id', '`supplier_id`');

addColIfNotExists($pdo, 'inward_items', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'inward_items', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'inward_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL');
addIndexIfNotExists($pdo, 'inward_items', 'idx_ini_item_id', '`item_id`');

// 3. Jobworks & Issues & Receipts & Returns
addColIfNotExists($pdo, 'jobworks', 'vendor_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobworks', 'process_type_id', 'VARCHAR(40) DEFAULT NULL');
addIndexIfNotExists($pdo, 'jobworks', 'idx_jw_vendor_id', '`vendor_id`');

addColIfNotExists($pdo, 'jobwork_issues', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_issues', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_issues', 'unit_id', 'VARCHAR(40) DEFAULT NULL');
addIndexIfNotExists($pdo, 'jobwork_issues', 'idx_jwi_item_id', '`item_id`');

addColIfNotExists($pdo, 'jobwork_receipts', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_receipts', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_receipts', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

addColIfNotExists($pdo, 'jobwork_returns', 'vendor_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_return_items', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_return_items', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'jobwork_return_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

// 4. Process Outwards & Inwards
addColIfNotExists($pdo, 'process_outwards', 'vendor_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_outwards', 'process_type_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_outward_items', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_outward_items', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_outward_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

addColIfNotExists($pdo, 'process_inwards', 'vendor_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_inwards', 'process_type_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_inward_items', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_inward_items', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'process_inward_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

// 5. Sales & Sale Items
addColIfNotExists($pdo, 'sales', 'customer_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'sales', 'transport_mode_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'sales', 'pay_terms_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'sale_items', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'sale_items', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'sale_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

// 6. Costings & Costing Rows
addColIfNotExists($pdo, 'costings', 'style_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'costings', 'buyer_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'costing_rows', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'costing_rows', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'costing_rows', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

// 7. Purchase Returns
addColIfNotExists($pdo, 'purchase_returns', 'supplier_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'purchase_returns', 'warehouse_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'purchase_return_items', 'item_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'purchase_return_items', 'color_id', 'VARCHAR(40) DEFAULT NULL');
addColIfNotExists($pdo, 'purchase_return_items', 'unit_id', 'VARCHAR(40) DEFAULT NULL');

echo "\nColumns created successfully.\nBackfilling IDs from existing master records...\n";

// Load lookup maps from database
$parties = []; // name/short -> code/id
foreach ($pdo->query('SELECT id, code, legal_name, short_name FROM parties') as $r) {
    $cid = !empty($r['code']) ? $r['code'] : $r['id'];
    if (!empty($r['legal_name'])) $parties[mb_strtolower(trim($r['legal_name']))] = $cid;
    if (!empty($r['short_name'])) $parties[mb_strtolower(trim($r['short_name']))] = $cid;
}

$items = []; // name -> code/id
foreach ($pdo->query('SELECT id, code, name FROM items') as $r) {
    $cid = !empty($r['code']) ? $r['code'] : $r['id'];
    if (!empty($r['name'])) $items[mb_strtolower(trim($r['name']))] = $cid;
}

$styles = []; // internal_id -> id
foreach ($pdo->query('SELECT id, internal_id FROM styles') as $r) {
    $cid = !empty($r['id']) ? $r['id'] : $r['internal_id'];
    if (!empty($r['internal_id'])) $styles[mb_strtolower(trim($r['internal_id']))] = $cid;
}

$masterValues = []; // [master_key][lower_value] -> master_id
foreach ($pdo->query('SELECT master_key, value, master_id FROM master_values WHERE master_id IS NOT NULL AND master_id != ""') as $r) {
    $masterValues[$r['master_key']][mb_strtolower(trim($r['value']))] = $r['master_id'];
}

function resolveId(string $text, array $map, array $fallbackList = []): ?string {
    $clean = mb_strtolower(trim($text));
    if ($clean === '') return null;
    if (isset($map[$clean])) return $map[$clean];
    if (isset($fallbackList[$clean])) return $fallbackList[$clean];
    return null;
}

// Backfill purchase_orders
$poRows = $pdo->query('SELECT id, supplier, buyer, category, classification, pay_terms, transport_mode, raised_for FROM purchase_orders')->fetchAll();
$uPo = $pdo->prepare('UPDATE purchase_orders SET supplier_id = ?, buyer_id = ?, category_id = ?, classification_id = ?, pay_terms_id = ?, transport_mode_id = ?, raised_for_id = ? WHERE id = ?');
foreach ($poRows as $r) {
    $uPo->execute([
        resolveId((string)$r['supplier'], $parties, $masterValues['suppliers'] ?? []),
        resolveId((string)$r['buyer'], $parties, $masterValues['customers'] ?? []),
        resolveId((string)$r['category'], $masterValues['categories'] ?? []),
        resolveId((string)$r['classification'], $masterValues['classifications'] ?? []),
        resolveId((string)$r['pay_terms'], $masterValues['paymentTermsList'] ?? []),
        resolveId((string)$r['transport_mode'], $masterValues['transportModes'] ?? []),
        resolveId((string)$r['raised_for'], $masterValues['raisedForList'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled purchase_orders IDs.\n";

// Backfill purchase_order_items
$poiRows = $pdo->query('SELECT id, name, color, unit, classification FROM purchase_order_items')->fetchAll();
$uPoi = $pdo->prepare('UPDATE purchase_order_items SET item_id = ?, color_id = ?, unit_id = ?, classification_id = ? WHERE id = ?');
foreach ($poiRows as $r) {
    $uPoi->execute([
        resolveId((string)$r['name'], $items),
        resolveId((string)$r['color'], $masterValues['colours'] ?? []),
        resolveId((string)$r['unit'], $masterValues['uoms'] ?? []),
        resolveId((string)$r['classification'], $masterValues['classifications'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled purchase_order_items IDs.\n";

// Backfill inwards & inward_items
$inwRows = $pdo->query('SELECT id, supplier, vendor, warehouse FROM inwards')->fetchAll();
$uInw = $pdo->prepare('UPDATE inwards SET supplier_id = ?, vendor_id = ?, warehouse_id = ? WHERE id = ?');
foreach ($inwRows as $r) {
    $uInw->execute([
        resolveId((string)$r['supplier'], $parties, $masterValues['suppliers'] ?? []),
        resolveId((string)$r['vendor'], $parties, $masterValues['suppliers'] ?? []),
        resolveId((string)$r['warehouse'], $masterValues['warehouses'] ?? []),
        $r['id']
    ]);
}
$iniRows = $pdo->query('SELECT id, name, color, unit FROM inward_items')->fetchAll();
$uIni = $pdo->prepare('UPDATE inward_items SET item_id = ?, color_id = ?, unit_id = ? WHERE id = ?');
foreach ($iniRows as $r) {
    $uIni->execute([
        resolveId((string)$r['name'], $items),
        resolveId((string)$r['color'], $masterValues['colours'] ?? []),
        resolveId((string)$r['unit'], $masterValues['uoms'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled inwards & inward_items IDs.\n";

// Backfill jobworks & issues
$jwRows = $pdo->query('SELECT id, vendor FROM jobworks')->fetchAll();
$uJw = $pdo->prepare('UPDATE jobworks SET vendor_id = ? WHERE id = ?');
foreach ($jwRows as $r) {
    $uJw->execute([
        resolveId((string)$r['vendor'], $parties, $masterValues['suppliers'] ?? []),
        $r['id']
    ]);
}
$jwiRows = $pdo->query('SELECT id, item, unit FROM jobwork_issues')->fetchAll();
$uJwi = $pdo->prepare('UPDATE jobwork_issues SET item_id = ?, unit_id = ? WHERE id = ?');
foreach ($jwiRows as $r) {
    $uJwi->execute([
        resolveId((string)$r['item'], $items),
        resolveId((string)$r['unit'], $masterValues['uoms'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled jobworks & issues IDs.\n";

// Backfill process_outwards & items
$poOutRows = $pdo->query('SELECT id, processor, process_type FROM process_outwards')->fetchAll();
$uPoOut = $pdo->prepare('UPDATE process_outwards SET vendor_id = ?, process_type_id = ? WHERE id = ?');
foreach ($poOutRows as $r) {
    $uPoOut->execute([
        resolveId((string)$r['processor'], $parties, $masterValues['suppliers'] ?? []),
        resolveId((string)$r['process_type'], $masterValues['processTypes'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled process_outwards IDs.\n";

// Backfill sales & sale_items
$saleRows = $pdo->query('SELECT id, customer FROM sales')->fetchAll();
$uSale = $pdo->prepare('UPDATE sales SET customer_id = ? WHERE id = ?');
foreach ($saleRows as $r) {
    $uSale->execute([
        resolveId((string)$r['customer'], $parties, $masterValues['customers'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled sales IDs.\n";

// Backfill costings & costing_rows
$costRows = $pdo->query('SELECT id, style, brand FROM costings')->fetchAll();
$uCost = $pdo->prepare('UPDATE costings SET style_id = ?, buyer_id = ? WHERE id = ?');
foreach ($costRows as $r) {
    $uCost->execute([
        resolveId((string)$r['style'], $styles),
        resolveId((string)$r['brand'], $parties, $masterValues['customers'] ?? []),
        $r['id']
    ]);
}
$costItemRows = $pdo->query('SELECT id, item, uom FROM costing_rows')->fetchAll();
$uCostItem = $pdo->prepare('UPDATE costing_rows SET item_id = ?, unit_id = ? WHERE id = ?');
foreach ($costItemRows as $r) {
    $uCostItem->execute([
        resolveId((string)$r['item'], $items),
        resolveId((string)$r['uom'], $masterValues['uoms'] ?? []),
        $r['id']
    ]);
}
echo "Backfilled costings IDs.\n";

echo "\nMigration completed successfully!\n";
