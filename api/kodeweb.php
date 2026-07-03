<?php
require_once __DIR__ . '/base.php';

try {
    switch ($action) {
        case 'update_kodeweb':
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => [
                        'User-Agent: KodeWeb-Updater'
                    ]
                ]
            ]);
            
            $apiResponse = file_get_contents('https://api.github.com/repos/laraantunes/kodeweb/releases/latest', false, $context);
            if (!$apiResponse) {
                throw new Exception("Falha ao buscar a última versão no GitHub.");
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
            $zipContent = file_get_contents($zipUrl, false, $context);
            if (!$zipContent) {
                throw new Exception("Falha ao baixar o arquivo da versão.");
            }
            file_put_contents($tempZip, $zipContent);
            
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
            echo json_encode([
                'success' => true,
                'workspace_root' => WORKSPACE_ROOT,
                'terminal_cwd' => (isset($_SESSION['terminal_cwd']) && is_array($_SESSION['terminal_cwd'])) ? ($_SESSION['terminal_cwd']['default'] ?? WORKSPACE_ROOT) : ($_SESSION['terminal_cwd'] ?? WORKSPACE_ROOT),
                'php_version' => PHP_VERSION,
                'os' => PHP_OS,
                'pdo_drivers' => PDO::getAvailableDrivers(),
                'local_env' => (isset($GLOBALS['local']) ? $GLOBALS['local'] : false),
                'username' => $username,
            ]);
            break;

        case 'update_env':
            $isLocal = isset($_POST['local_env']) && $_POST['local_env'] === 'true';
            $env_file = $rootDir . '/.env';
            $envContent = "";
            if (file_exists($env_file)) {
                $envContent = file_get_contents($env_file);
                // Remove existing LOCAL_ENV
                $envContent = preg_replace('/^LOCAL_ENV=.*\n?/m', '', $envContent);
            }
            $envContent .= "LOCAL_ENV=" . ($isLocal ? '1' : '0') . "\n";
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
