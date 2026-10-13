<?php
$basePath = isset($basePath) ? $basePath : (strpos($_SERVER['REQUEST_URI'] ?? '', '/pages/') !== false ? '../' : './');
?>
</div> <!-- .app -->

<div class="savebar" id="saveBar"></div>
<div class="toast-wrap" id="toastWrap"></div>
<div class="overlay" id="appDialog"><div class="modal modal-sm" id="appDialogBox"></div></div>

<?php
$jsModules = [
    'core.js',
    'masters.js',
    'styles.js',
    'itemmaster.js',
    'parties.js',
    'dashboard.js',
    'po.js',
    'inward.js',
    'process.js',
    'jobwork.js',
    'sample.js',
    'purchasereturn.js',
    'jobworkreturn.js',
    'print-documents.js',
    'sale.js',
    'sale-dashboard.js',
    'costing.js',
    'reports.js',
    'custom-reports.js',
    'usermanagement.js',
    'audittrail.js',
    'partner-gst.js',
    'init.js'
];
foreach ($jsModules as $modFile):
    $fullModPath = dirname(__DIR__) . '/assets/js/modules/' . $modFile;
    $v = file_exists($fullModPath) ? (filemtime($fullModPath) . '-' . filesize($fullModPath)) : '1';
?>
<script src="<?= $basePath ?>assets/js/modules/<?= $modFile ?>?v=<?= $v ?>"></script>
<?php endforeach; ?>
<script src="<?= $basePath ?>assets/server-sync.js?v=<?= @filemtime(dirname(__DIR__) . '/assets/server-sync.js') . '-' . @filesize(dirname(__DIR__) . '/assets/server-sync.js') ?>"></script>
</body>
</html>
