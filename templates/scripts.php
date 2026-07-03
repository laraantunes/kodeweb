<!-- Link App Controller JS -->
<script src="app/api.js?v=<?= time() ?>"></script>
<script src="app/state.js?v=<?= time() ?>"></script>
<script src="app/editor.js?v=<?= time() ?>"></script>
<script src="app/layout.js?v=<?= time() ?>"></script>
<script src="app/init_status.js?v=<?= time() ?>"></script>
<script src="app/files.js?v=<?= time() ?>"></script>
<script src="app/tabs.js?v=<?= time() ?>"></script>
<script src="app/terminal.js?v=<?= time() ?>"></script>
<script src="app/database.js?v=<?= time() ?>"></script>
<script src="app/ftp.js?v=<?= time() ?>"></script>
<script src="app/git.js?v=<?= time() ?>"></script>
<script src="app/upload.js?v=<?= time() ?>"></script>
<script src="app/storage.js?v=<?= time() ?>"></script>
<script src="app/markdown.js?v=<?= time() ?>"></script>
<script src="app/modals.js?v=<?= time() ?>"></script>
<script src="app/init.js?v=<?= time() ?>"></script>
<?php
foreach ($active_plugins as $plugin) {
    if (!empty($plugin['js']) && is_array($plugin['js'])) {
        foreach ($plugin['js'] as $js) {
            echo '<script src="plugins/' . htmlspecialchars($plugin['folder']) . '/' . htmlspecialchars($js) . '?v=' . time() . '"></script>' . "\n";
        }
    }
}
?>
