<?php
$module = 'jobwork';
$pageTitle = 'Job Work — Issue & FG Receipt | KEND2C';
$pageHeading = 'Job Work';
$pageSub = 'Material issues to job-worker vendor; finished goods received';
$basePath = isset($basePath) ? $basePath : '../';
require_once __DIR__ . '/../includes/header.php';
require_once __DIR__ . '/../includes/sidebar.php';
?>
<main class="main">
  <div class="topbar">
    <div>
      <h2 id="tb-title"><?= htmlspecialchars($pageHeading) ?></h2>
      <div class="sub" id="tb-sub"><?= $pageSub ?></div>
    </div>
    <div class="spacer"></div>
    <div class="actions" id="tb-actions"></div>
  </div>
  <div class="msgbox" id="msgBox">
    <div class="js-err" id="jsErr"></div>
    <div class="load-msg" id="loadMsg"><div class="spin"></div> Loading KEND2C…</div>
  </div>
  <div class="content" id="content"></div>
</main>
<script>
window.__INITIAL_PAGE__ = '<?= $module ?>';
</script>
<?php
require_once __DIR__ . '/../includes/footer.php';
