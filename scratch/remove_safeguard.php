<?php
$file = 'c:\\xampp\\htdocs\\stitchflow\\api\\lib\\persist.php';
$content = file_get_contents($file);

$pattern = '/function sf_prevent_truncate\(PDO \$pdo, array \$docs, string \$tableName, string \$where = \'\'\): void \{.*?\n\}/s';
$replacement = "function sf_prevent_truncate(PDO \$pdo, array \$docs, string \$tableName, string \$where = ''): void {\n    // Safeguard removed per user request\n    return;\n}";

if (preg_match($pattern, $content)) {
    $content = preg_replace($pattern, $replacement, $content);
    file_put_contents($file, $content);
    echo "Successfully removed safeguard in persist.php\n";
} else {
    echo "Regex pattern not found in persist.php\n";
}
