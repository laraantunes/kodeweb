<?php
require_once __DIR__ . '/base.php';

try {
    switch ($action) {
        case 'update_kodeweb':
            $ch = curl_init('https://api.github.com/repos/laraantunes/kodeweb/releases/latest');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'KodeWeb-Updater');
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $apiResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if (!$apiResponse || $httpCode !== 200) {
                throw new Exception("Falha ao buscar a última versão no GitHub. HTTP: $httpCode");
            }
            
            $releaseData = json_decode($apiResponse, true);
            $assets = $releaseData['assets'] ?? [];
            
            $zipUrl = '';
            foreach ($assets as $asset) {
                if (strpos($asset['name'], 'kodeweb-release.zip') !== false) {
                    $zipUrl = $asset['browser_download_url'];
                    break;
                }
            }
            
            if (empty($zipUrl)) {
                throw new Exception("Nenhum arquivo de build (.zip) encontrado na última versão.");
            }
            
            $tempZip = $rootDir . '/data/kodeweb-release-temp.zip';
            
            // Usando cURL para baixar o ZIP
            $ch = curl_init($zipUrl);
            $fp = fopen($tempZip, 'w+');
            curl_setopt($ch, CURLOPT_FILE, $fp);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_USERAGENT, 'KodeWeb-Updater');
            curl_setopt($ch, CURLOPT_TIMEOUT, 60); // 60 segundos max para baixar
            curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);
            fclose($fp);
            
            if ($curlError || filesize($tempZip) < 1024) {
                if (file_exists($tempZip)) unlink($tempZip);
                throw new Exception("Falha ao baixar o arquivo da versão. Erro: $curlError");
            }
            
            $zip = new ZipArchive;
            if ($zip->open($tempZip) === TRUE) {
                $zip->extractTo($rootDir);
                $zip->close();
                unlink($tempZip);
                echo json_encode(['success' => true, 'message' => 'Aplicação atualizada para a ' . $releaseData['tag_name']]);
            } else {
                if (file_exists($tempZip)) unlink($tempZip);
                throw new Exception("Falha ao extrair o arquivo .zip da atualização.");
            }
            break;

        case 'get_plugins':
            $plugins_dir = $rootDir . '/plugins';
            $user_settings_file = $rootDir . '/data/user-settings.yaml';
            $plugins = [];
            $active_folders = [];
            
            if (file_exists($user_settings_file) && class_exists('Symfony\Component\Yaml\Yaml')) {
                try {
                    $user_settings = \Symfony\Component\Yaml\Yaml::parseFile($user_settings_file) ?: [];
                    $active_folders = $user_settings['plugins']['active'] ?? [];
                } catch (Exception $e) {}
            }

            if (is_dir($plugins_dir)) {
                foreach (scandir($plugins_dir) as $folder) {
                    if ($folder === '.' || $folder === '..') continue;
                    $yaml_file = $plugins_dir . '/' . $folder . '/plugin.yaml';
                    if (file_exists($yaml_file) && class_exists('Symfony\Component\Yaml\Yaml')) {
                        try {
                            $plugin_data = \Symfony\Component\Yaml\Yaml::parseFile($yaml_file);
                            $plugins[] = [
                                'folder' => $folder,
                                'name' => $plugin_data['name'] ?? $folder,
                                'description' => $plugin_data['description'] ?? '',
                                'version' => $plugin_data['version'] ?? '',
                                'creator' => $plugin_data['creator'] ?? '',
                                'active' => in_array($folder, $active_folders)
                            ];
                        } catch (Exception $e) {}
                    }
                }
            }
            echo json_encode(['success' => true, 'plugins' => $plugins]);
            break;

        case 'save_plugins':
            $active_plugins = json_decode($_POST['active_plugins'] ?? '[]', true);
            $user_settings_file = $rootDir . '/data/user-settings.yaml';
            $user_settings = [];
            
            if (file_exists($user_settings_file) && class_exists('Symfony\Component\Yaml\Yaml')) {
                try {
                    $user_settings = \Symfony\Component\Yaml\Yaml::parseFile($user_settings_file) ?: [];
                } catch (Exception $e) {}
            }
            
            if (!isset($user_settings['plugins'])) $user_settings['plugins'] = [];
            $user_settings['plugins']['active'] = $active_plugins;
            
            if (class_exists('Symfony\Component\Yaml\Yaml')) {
                file_put_contents($user_settings_file, \Symfony\Component\Yaml\Yaml::dump($user_settings, 4, 2));
            }
            echo json_encode(['success' => true]);
            break;

        case 'status':
            $auth_file = $rootDir . '/data/auth.enc';
            $username = '';
            if (file_exists($auth_file)) {
                $encData = file_get_contents($auth_file);
                $decData = KodeWebEncryption::decrypt($encData);
                if ($decData) {
                    $authData = json_decode($decData, true);
                    $username = $authData['username'] ?? '';
                }
            }

            // System info, active path, and available PDO drivers
                $historyFile = $rootDir . '/data/workspaces.json';
                $workspace_history = file_exists($historyFile) ? json_decode(file_get_contents($historyFile), true) : [];
                if (!is_array($workspace_history)) $workspace_history = [];

                echo json_encode([
                    'success' => true,
                    'workspace_root' => WORKSPACE_ROOT,
                    'terminal_cwd' => (isset($_SESSION['terminal_cwd']) && is_array($_SESSION['terminal_cwd'])) ? ($_SESSION['terminal_cwd']['default'] ?? WORKSPACE_ROOT) : ($_SESSION['terminal_cwd'] ?? WORKSPACE_ROOT),
                    'php_version' => PHP_VERSION,
                    'os' => PHP_OS,
                    'pdo_drivers' => PDO::getAvailableDrivers(),
                    'local_env' => (isset($GLOBALS['local']) ? $GLOBALS['local'] : false),
                    'workspace_path' => (isset($GLOBALS['env']['WORKSPACE_PATH']) ? $GLOBALS['env']['WORKSPACE_PATH'] : ''),
                    'workspace_history' => $workspace_history,
                    'username' => $username,
                ]);
                break;

        case 'update_env':
            $isLocal = isset($_POST['local_env']) && $_POST['local_env'] === 'true';
            $workspacePath = $_POST['workspace_path'] ?? '';
            $env_file = $rootDir . '/.env';
            $envContent = "";
            if (file_exists($env_file)) {
                $envContent = file_get_contents($env_file);
                // Remove existing LOCAL_ENV and WORKSPACE_PATH
                $envContent = preg_replace('/^LOCAL_ENV=.*\n?/m', '', $envContent);
                $envContent = preg_replace('/^WORKSPACE_PATH=.*\n?/m', '', $envContent);
            }
            $envContent = trim($envContent) . "\nLOCAL_ENV=" . ($isLocal ? '1' : '0') . "\n";
            if (!empty($workspacePath)) {
                $envContent .= "WORKSPACE_PATH=" . $workspacePath . "\n";
                
                // Update history
                $historyFile = $rootDir . '/data/workspaces.json';
                $history = file_exists($historyFile) ? json_decode(file_get_contents($historyFile), true) : [];
                if (!is_array($history)) $history = [];
                $history = array_values(array_unique(array_merge([$workspacePath], $history)));
                $history = array_slice($history, 0, 10);
                file_put_contents($historyFile, json_encode($history));
            }
            file_put_contents($env_file, trim($envContent) . "\n");
            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception("Ação desconhecida ou não suportada neste módulo: $action");
    }
} catch (Exception $e) {
    http_response_code(400);
    
    $log_file = $rootDir . '/kodeweb_error.log';
    $log_message = date('Y-m-d H:i:s') . " - Action [{$action}]: " . $e->getMessage() . "\n";
    file_put_contents($log_file, $log_message, FILE_APPEND);
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
