<?php
require_once __DIR__ . '/../api/bootstrap.php';
$pdo = sf_pdo();

$updates = [
    'Fabric'   => 'Fabric',
    'Thread'   => 'Thread',
    'Buttons'  => 'Button',
    'Zipper'   => 'Zipper',
    'Labels'   => 'Label - Main/Size',
    'Elastic'  => 'Elastic',
    'Poly Bag' => 'Poly Bag',
    'Carton'   => 'Carton',
    'Sticker'  => 'Sticker',
    'Hang Tag' => 'Hang Tag',
];

$stmt = $pdo->prepare('UPDATE items SET classification = ? WHERE name = ?');
foreach ($updates as $name => $cls) {
    $stmt->execute([$cls, $name]);
    echo "Updated {$name} => {$cls} (rows: {$stmt->rowCount()})\n";
}

// Check items table after update
$items = $pdo->query('SELECT id, code, name, category, classification FROM items')->fetchAll(PDO::FETCH_ASSOC);
echo "\nUpdated items:\n";
foreach ($items as $it) {
    echo json_encode($it) . "\n";
}
