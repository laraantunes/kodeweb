<?php 
require_once('auth.php');
require_once('config.php'); 
require_once('encryption.php');

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once(__DIR__ . '/vendor/autoload.php');
}
use Symfony\Component\Yaml\Yaml;

$current_username = 'user';
$auth_file = __DIR__ . '/data/auth.enc';
if (file_exists($auth_file)) {
    $encData = file_get_contents($auth_file);
    $decData = KodeWebEncryption::decrypt($encData);
    if ($decData) {
        $authData = json_decode($decData, true);
        if (!empty($authData['username'])) {
            $current_username = $authData['username'];
        }
    }
}

// Plugin Loader
$plugins_dir = __DIR__ . '/plugins';
$active_plugins = [];
if (is_dir($plugins_dir)) {
    foreach (scandir($plugins_dir) as $plugin_folder) {
        if ($plugin_folder === '.' || $plugin_folder === '..') continue;
        $yaml_file = $plugins_dir . '/' . $plugin_folder . '/plugin.yaml';
        if (file_exists($yaml_file) && class_exists('Symfony\Component\Yaml\Yaml')) {
            try {
                $plugin_data = Yaml::parseFile($yaml_file);
                $plugin_data['folder'] = $plugin_folder;
                $active_plugins[] = $plugin_data;
            } catch (Exception $e) {
                // Ignore parse errors for now
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">

<?php require 'templates/head.php'; ?>

<body>

    <?php require 'templates/header.php'; ?>

    <!-- Workspace container -->
    <div class="workspace">

        <?php require 'templates/sidebar_left.php'; ?>

        <!-- Left drag handle vertical splitter -->
        <div class="resizer resizer-v" id="resizer-left"></div>

        <!-- Central layout area (Editor and Terminal) -->
        <main class="center-workspace">

            <!-- Editor area -->
            <section class="editor-panel">
                <!-- Tab bar -->
                <div class="tabs-bar" id="tabs-container">
                    <!-- Dynamic tabs load here -->
                </div>

                <!-- Main Editor container -->
                <div class="editor-wrapper">
                    <?php require 'templates/editor_main.php'; ?>
                    
                    <?php require 'templates/db_explorer.php'; ?>
                    
                    <?php require 'templates/ftp_explorer.php'; ?>
                    
                    <?php require 'templates/git_explorer.php'; ?>
                </div>
            </section>

            <!-- Bottom drag handle horizontal splitter -->
            <div class="resizer resizer-h" id="resizer-bottom"></div>

            <?php require 'templates/terminal.php'; ?>

        </main>

        <!-- Right drag handle vertical splitter -->
        <div class="resizer resizer-v" id="resizer-right"></div>

        <?php require 'templates/sidebar_right.php'; ?>
    </div>

    <?php require 'templates/modals.php'; ?>

    <!-- Toast Notifications Container -->
    <div id="toast-container"
        style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;">
    </div>

    <?php require 'templates/scripts.php'; ?>
</body>

</html>
