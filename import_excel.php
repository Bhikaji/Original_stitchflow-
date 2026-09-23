<?php
/**
 * Direct Sales Excel (CSV) Data Import Script
 * Upload a CSV file exported from Excel to directly store into `sales` and `sale_items` tables.
 */
require_once 'api/lib/db.php';
require_once 'api/lib/persist.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['excel_file'])) {
    $file = $_FILES['excel_file'];
    
    if ($file['error'] === UPLOAD_ERR_OK) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if ($ext === 'csv') {
            $conn = get_db_connection();
            $handle = fopen($file['tmp_name'], 'r');
            
            if ($handle !== FALSE) {
                // Read headers
                $headers = fgetcsv($handle, 1000, ",");
                // Clean headers (remove BOM if exists, trim)
                $headers = array_map(function($h) { return trim(preg_replace('/[\x00-\x1F\x7F]/', '', $h)); }, $headers);
                
                $salesCount = 0;
                $itemsCount = 0;
                
                $conn->begin_transaction();
                
                try {
                    $stmtSale = $conn->prepare("INSERT INTO sales 
                        (id, sale_no, sale_date, customer, status, created_by, updated_by) 
                        VALUES (?, ?, ?, ?, 'Completed', 'Import', 'Import')
                        ON DUPLICATE KEY UPDATE id=id");
                        
                    $stmtItem = $conn->prepare("INSERT INTO sale_items 
                        (sale_id, sort_order, descr, qty, rate, amount) 
                        VALUES (?, ?, ?, ?, ?, ?)");
                    
                    // Keep track of sales we've already inserted to group items
                    $insertedSales = [];
                    $sortOrderTracker = [];
                    
                    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                        $row = array_combine($headers, $data);
                        
                        // --- MAP YOUR CSV COLUMNS HERE ---
                        // Change these keys to match your exact CSV column headers
                        $saleNo = $row['sale_no'] ?? $row['Sale No'] ?? $row['Invoice No'] ?? '';
                        $saleDate = $row['sale_date'] ?? $row['Date'] ?? date('Y-m-d');
                        $customer = $row['customer'] ?? $row['Customer'] ?? '';
                        
                        $itemDesc = $row['item'] ?? $row['Item Description'] ?? $row['Description'] ?? '';
                        $qty = floatval($row['qty'] ?? $row['Quantity'] ?? 0);
                        $rate = floatval($row['rate'] ?? $row['Price'] ?? 0);
                        $amount = $qty * $rate;
                        // ---------------------------------
                        
                        if (empty($saleNo)) {
                            continue; // Skip rows without a sale number
                        }
                        
                        // Generate a unique ID for the sale if not already generated
                        if (!isset($insertedSales[$saleNo])) {
                            $saleId = 'sl_' . bin2hex(random_bytes(6));
                            $stmtSale->bind_param("ssss", $saleId, $saleNo, $saleDate, $customer);
                            $stmtSale->execute();
                            $insertedSales[$saleNo] = $saleId;
                            $sortOrderTracker[$saleNo] = 0;
                            $salesCount++;
                        }
                        
                        $saleId = $insertedSales[$saleNo];
                        $sortOrder = $sortOrderTracker[$saleNo]++;
                        
                        // Insert item
                        $stmtItem->bind_param("sisddd", $saleId, $sortOrder, $itemDesc, $qty, $rate, $amount);
                        $stmtItem->execute();
                        $itemsCount++;
                    }
                    
                    $conn->commit();
                    $message = "Successfully imported $salesCount sales and $itemsCount items into the database!";
                } catch (Exception $e) {
                    $conn->rollback();
                    $message = "Error importing data: " . $e->getMessage();
                }
                
                fclose($handle);
                $conn->close();
            } else {
                $message = "Failed to read the uploaded file.";
            }
        } else {
            $message = "Please save your Excel file as a CSV and upload that.";
        }
    } else {
        $message = "Error uploading file. Code: " . $file['error'];
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Direct Sales Excel Import</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .card { border: 1px solid #ccc; padding: 20px; border-radius: 5px; max-width: 600px; }
        .message { margin-bottom: 20px; padding: 10px; background: #e0f7fa; border-left: 5px solid #00acc1; }
        .error { background: #ffebee; border-left: 5px solid #f44336; }
        code { background: #eee; padding: 2px 4px; }
    </style>
</head>
<body>
    <h2>Direct Sales Data Import</h2>
    <div class="card">
        <?php if ($message): ?>
            <div class="message <?php echo strpos($message, 'Error') !== false || strpos($message, 'Please save') !== false ? 'error' : ''; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <form method="post" enctype="multipart/form-data">
            <p>1. Ensure your Excel file has columns like: <code>sale_no</code>, <code>sale_date</code>, <code>customer</code>, <code>item</code>, <code>qty</code>, <code>rate</code></p>
            <p>2. Save your Excel data as a <b>.csv</b> file.</p>
            <p>3. Upload it here to store directly into the <b>sales</b> and <b>sale_items</b> tables.</p>
            <input type="file" name="excel_file" accept=".csv" required>
            <br><br>
            <button type="submit" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer;">Import Sales Data</button>
        </form>
    </div>
</body>
</html>
