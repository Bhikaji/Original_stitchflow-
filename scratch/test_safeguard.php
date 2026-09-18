<?php
require_once __DIR__ . '/../api/bootstrap.php';
require_once __DIR__ . '/../api/lib/assemble.php';
require_once __DIR__ . '/../api/lib/persist.php';
require_once __DIR__ . '/../api/lib/validate.php';

$pdo = sf_pdo();

// Insert a fake PO directly to the DB to ensure count > 0
$pdo->exec("INSERT INTO purchase_orders (po_no, po_date, supplier, supplier_id, status) VALUES ('PO-SAFEGUARD', '2026-09-18', 'Test', 'T1', 'Draft')");
echo "Inserted test PO.\n";

$assembled = assemble_db();
echo "Assembled PO count: " . count($assembled['po']) . "\n";

// Force empty POs to simulate truncation
$assembled['po'] = [];

try {
    // We expect this to fail with our new safeguard
    persist_db($assembled, 'TestRunner');
    echo "[FAIL] The database was saved with empty POs! Safeguard failed.\n";
} catch (RuntimeException $e) {
    if (strpos($e->getMessage(), 'Safeguard Triggered') !== false) {
        echo "[SUCCESS] Safeguard caught the truncation attempt!\n";
        echo "Exception: " . $e->getMessage() . "\n";
    } else {
        echo "[FAIL] Unexpected RuntimeException: " . $e->getMessage() . "\n";
    }
} catch (Throwable $e) {
    echo "[FAIL] Unexpected error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}

// Clean up fake PO
$pdo->exec("DELETE FROM purchase_orders WHERE po_no = 'PO-SAFEGUARD'");
