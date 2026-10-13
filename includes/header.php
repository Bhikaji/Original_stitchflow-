<?php
require_once dirname(__DIR__) . '/api/bootstrap.php';
sf_session_start();

$basePath = isset($basePath) ? $basePath : (strpos($_SERVER['REQUEST_URI'] ?? '', '/pages/') !== false ? '../' : './');
$currentUser = sf_current_user();
$csrfToken = sf_csrf_token();

// If accessed directly via /pages/*.php instead of index.php front controller, redirect
if (strpos($_SERVER['SCRIPT_NAME'] ?? '', '/pages/') !== false) {
    $targetModule = !empty($module) ? $module : 'dashboard';
    header('Location: ' . $basePath . 'index.php?page=' . urlencode($targetModule));
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="csrf-token" content="<?= htmlspecialchars($csrfToken, ENT_QUOTES) ?>">
<title><?= htmlspecialchars($pageTitle ?? 'KEND2C — Garment Manufacturing ERP') ?></title>
<link rel="stylesheet" href="<?= $basePath ?>assets/css/app.css?v=<?= @filemtime(dirname(__DIR__) . '/assets/css/app.css') ?>">
<script>
window.__SF_CSRF__ = <?= json_encode($csrfToken) ?>;
<?php if ($currentUser): ?>
window.__AUTH_USER__ = <?= json_encode($currentUser, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
<?php endif; ?>
</script>
</head>
<body>
<div class="globalbar">
  <button class="gb-burger" id="navToggle" onclick="toggleNav()" aria-label="Toggle navigation" aria-expanded="true" title="Toggle menu (Ctrl+B)">
    <span></span><span></span><span></span>
  </button>
  <div class="gb-brand"><div class="gb-mark">🧵</div><span>KEND2C</span></div>
  <div class="gb-search" id="gbSearchWrap">
    <div class="gb-field" id="gbField">
      <span id="gbChips"></span>
      <input id="gbSearch" type="text" placeholder="Search" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="gbPop">
      <kbd class="gb-kbd">Ctrl K</kbd>
    </div>
    <div class="gb-pop" id="gbPop" role="listbox"></div>
  </div>
  <div class="gb-right">
    <button class="gb-btn" title="Notifications">🔔</button>
    <button class="gb-avatar"><span class="av">KC</span><span>KEND2C</span></button>
  </div>
</div>
<div class="app">
