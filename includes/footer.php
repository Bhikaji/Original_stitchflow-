<?php
$basePath = isset($basePath) ? $basePath : (strpos($_SERVER['REQUEST_URI'] ?? '', '/pages/') !== false ? '../' : './');
?>
</div> <!-- .app -->

<div class="savebar" id="saveBar"></div>
<div class="toast-wrap" id="toastWrap"></div>
<div class="overlay" id="appDialog"><div class="modal modal-sm" id="appDialogBox"></div></div>

<script src="<?= $basePath ?>assets/js/app-core.js?v=<?= @filemtime(dirname(__DIR__) . '/assets/js/app-core.js') . '-' . @filesize(dirname(__DIR__) . '/assets/js/app-core.js') ?>"></script>
<script src="<?= $basePath ?>assets/server-sync.js?v=<?= @filemtime(dirname(__DIR__) . '/assets/server-sync.js') . '-' . @filesize(dirname(__DIR__) . '/assets/server-sync.js') ?>"></script>
</body>
</html>
