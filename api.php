<?php
// api.php - Backend API for KodeWeb IDE
header('Content-Type: application/json; charset=utf-8');
session_start();

require_once __DIR__ . '/encryption.php';

// Define the root workspace path (parent of kodeweb directory)
define('WORKSPACE_ROOT', realpath(dirname(__DIR__)));

// Helper function to resolve relative paths safely within the workspace
function get_absolute_path($relativePath) {
    // Sanitize relative path to prevent directory traversal
    $relativePath = str_replace(['../', '..\\'], '', $relativePath);
    $relativePath = trim($relativePath, '/\\');
    
    if (empty($relativePath)) {
        return WORKSPACE_ROOT;
    }
    
    return WORKSPACE_ROOT . DIRECTORY_SEPARATOR . $relativePath;
}

// Check action parameter
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'status':
            // System info, active path, and available PDO drivers
            echo json_encode([
                'success' => true,
                'workspace_root' => WORKSPACE_ROOT,
                'terminal_cwd' => $_SESSION['terminal_cwd'] ?? WORKSPACE_ROOT,
                'php_version' => PHP_VERSION,
                'os' => PHP_OS,
                'pdo_drivers' => PDO::getAvailableDrivers(),
            ]);
            break;

        case 'files_list':
            // List files in a directory on-demand
            $relativePath = $_GET['path'] ?? '';
            $absPath = get_absolute_path($relativePath);
            
            if (!is_dir($absPath)) {
                throw new Exception("Diretório não encontrado: " . htmlspecialchars($relativePath));
            }
            
            $items = [];
            $files = scandir($absPath);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                
                $fullPath = $absPath . DIRECTORY_SEPARATOR . $file;
                $isDir = is_dir($fullPath);
                
                // Get path relative to WORKSPACE_ROOT
                $itemRelPath = ltrim(str_replace(WORKSPACE_ROOT, '', $fullPath), DIRECTORY_SEPARATOR);
                
                $items[] = [
                    'name' => $file,
                    'path' => $itemRelPath,
                    'is_dir' => $isDir,
                    'size' => $isDir ? 0 : filesize($fullPath),
                    'ext' => $isDir ? '' : pathinfo($file, PATHINFO_EXTENSION)
                ];
            }
            
            // Sort directories first, then files alphabetically
            usort($items, function($a, $b) {
                if ($a['is_dir'] && !$b['is_dir']) return -1;
                if (!$a['is_dir'] && $b['is_dir']) return 1;
                return strcasecmp($a['name'], $b['name']);
            });
            
            echo json_encode(['success' => true, 'files' => $items]);
            break;

        case 'file_read':
            $relativePath = $_GET['path'] ?? '';
            $absPath = get_absolute_path($relativePath);
            
            if (!file_exists($absPath) || is_dir($absPath)) {
                throw new Exception("Arquivo não encontrado.");
            }
            
            $content = file_get_contents($absPath);
            echo json_encode(['success' => true, 'content' => $content]);
            break;

        case 'file_save':
            $relativePath = $_POST['path'] ?? '';
            $content = $_POST['content'] ?? '';
            $absPath = get_absolute_path($relativePath);
            
            // Ensure parent directory exists
            $parentDir = dirname($absPath);
            if (!is_dir($parentDir)) {
                mkdir($parentDir, 0755, true);
            }
            
            if (file_put_contents($absPath, $content) === false) {
                throw new Exception("Falha ao salvar o arquivo.");
            }
            
            echo json_encode(['success' => true]);
            break;

        case 'file_create':
            $parentPath = $_POST['parent_path'] ?? '';
            $name = $_POST['name'] ?? '';
            $type = $_POST['type'] ?? 'file'; // 'file' or 'dir'
            
            if (empty($name)) {
                throw new Exception("O nome não pode ser vazio.");
            }
            
            $absParent = get_absolute_path($parentPath);
            $absPath = $absParent . DIRECTORY_SEPARATOR . $name;
            
            if (file_exists($absPath)) {
                throw new Exception("Arquivo ou pasta já existe.");
            }
            
            if ($type === 'dir') {
                if (!mkdir($absPath, 0755, true)) {
                    throw new Exception("Falha ao criar diretório.");
                }
            } else {
                if (file_put_contents($absPath, '') === false) {
                    throw new Exception("Falha ao criar arquivo.");
                }
            }
            
            $relPath = ltrim(str_replace(WORKSPACE_ROOT, '', $absPath), DIRECTORY_SEPARATOR);
            echo json_encode(['success' => true, 'path' => $relPath]);
            break;

        case 'file_rename':
            $relativePath = $_POST['path'] ?? '';
            $newName = $_POST['new_name'] ?? '';
            
            if (empty($newName)) {
                throw new Exception("O novo nome não pode ser vazio.");
            }
            
            $absPath = get_absolute_path($relativePath);
            $absParent = dirname($absPath);
            $newAbsPath = $absParent . DIRECTORY_SEPARATOR . $newName;
            
            if (file_exists($newAbsPath)) {
                throw new Exception("Um arquivo com o novo nome já existe.");
            }
            
            if (!rename($absPath, $newAbsPath)) {
                throw new Exception("Falha ao renomear.");
            }
            
            $newRelPath = ltrim(str_replace(WORKSPACE_ROOT, '', $newAbsPath), DIRECTORY_SEPARATOR);
            echo json_encode(['success' => true, 'path' => $newRelPath]);
            break;

        case 'file_delete':
            $relativePath = $_POST['path'] ?? '';
            $absPath = get_absolute_path($relativePath);
            
            if (!file_exists($absPath)) {
                throw new Exception("Item não existe.");
            }
            
            if (is_dir($absPath)) {
                // Delete directory and contents
                $deleteDir = function($dirPath) use (&$deleteDir) {
                    $files = array_diff(scandir($dirPath), ['.', '..']);
                    foreach ($files as $file) {
                        $p = $dirPath . DIRECTORY_SEPARATOR . $file;
                        is_dir($p) ? $deleteDir($p) : unlink($p);
                    }
                    return rmdir($dirPath);
                };
                if (!$deleteDir($absPath)) {
                    throw new Exception("Falha ao deletar diretório.");
                }
            } else {
                if (!unlink($absPath)) {
                    throw new Exception("Falha ao deletar arquivo.");
                }
            }
            
            echo json_encode(['success' => true]);
            break;

        case 'terminal_cmd':
            $cmd = $_POST['cmd'] ?? '';
            if ($cmd === '') {
                echo json_encode(['success' => true, 'output' => '', 'cwd' => $_SESSION['terminal_cwd']]);
                break;
            }
            
            if (!isset($_SESSION['terminal_cwd'])) {
                $_SESSION['terminal_cwd'] = WORKSPACE_ROOT;
            }
            
            $current_cwd = $_SESSION['terminal_cwd'];
            $delimiter = "---KODEWEB_PWD_DELIMITER---";
            
            // Build the execution command that outputs the new directory at the end
            $full_cmd = "cd " . escapeshellarg($current_cwd) . " && eval " . escapeshellarg($cmd) . " 2>&1; echo " . escapeshellarg($delimiter) . "; pwd";
            
            $output = shell_exec($full_cmd);
            $clean_output = $output;
            $new_cwd = $current_cwd;
            
            if (strpos($output, $delimiter) !== false) {
                $parts = explode($delimiter, $output);
                $clean_output = rtrim($parts[0]);
                $new_cwd = trim($parts[1]);
                
                if (is_dir($new_cwd)) {
                    $_SESSION['terminal_cwd'] = $new_cwd;
                } else {
                    $new_cwd = $current_cwd;
                }
            }
            
            echo json_encode([
                'success' => true,
                'output' => $clean_output,
                'cwd' => $_SESSION['terminal_cwd']
            ]);
            break;

        case 'db_connections_list':
            $connections_dir = __DIR__ . '/connections';
            if (!is_dir($connections_dir)) {
                mkdir($connections_dir, 0700, true);
            }
            
            $connections = [];
            $files = glob($connections_dir . '/*.enc');
            foreach ($files as $file) {
                $encryptedData = file_get_contents($file);
                $decryptedData = KodeWebEncryption::decrypt($encryptedData);
                if ($decryptedData) {
                    $data = json_decode($decryptedData, true);
                    if ($data) {
                        // Omit password for safety
                        unset($data['password']);
                        $connections[] = $data;
                    }
                }
            }
            
            echo json_encode(['success' => true, 'connections' => $connections]);
            break;

        case 'db_connection_save':
            $id = $_POST['id'] ?? '';
            $name = $_POST['name'] ?? '';
            $driver = $_POST['driver'] ?? 'mysql';
            $host = $_POST['host'] ?? '';
            $port = $_POST['port'] ?? '';
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            $database = $_POST['database'] ?? '';
            
            if (empty($name)) {
                throw new Exception("O nome da conexão é obrigatório.");
            }
            
            if (empty($id)) {
                $id = uniqid('conn_');
            } else {
                // If editing and password is empty, merge with existing password
                if (empty($password)) {
                    $existingFile = __DIR__ . '/connections/' . $id . '.enc';
                    if (file_exists($existingFile)) {
                        $encData = file_get_contents($existingFile);
                        $decData = KodeWebEncryption::decrypt($encData);
                        if ($decData) {
                            $oldConn = json_decode($decData, true);
                            $password = $oldConn['password'] ?? '';
                        }
                    }
                }
            }
            
            $connectionData = [
                'id' => $id,
                'name' => $name,
                'driver' => $driver,
                'host' => $host,
                'port' => $port,
                'username' => $username,
                'password' => $password,
                'database' => $database
            ];
            
            $connections_dir = __DIR__ . '/connections';
            if (!is_dir($connections_dir)) {
                mkdir($connections_dir, 0700, true);
            }
            
            $jsonString = json_encode($connectionData);
            $encrypted = KodeWebEncryption::encrypt($jsonString);
            
            if (file_put_contents($connections_dir . '/' . $id . '.enc', $encrypted) === false) {
                throw new Exception("Erro ao salvar arquivo de conexão.");
            }
            
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'db_connection_delete':
            $id = $_POST['id'] ?? '';
            if (empty($id)) {
                throw new Exception("ID de conexão inválido.");
            }
            
            $file = __DIR__ . '/connections/' . $id . '.enc';
            if (file_exists($file)) {
                unlink($file);
            }
            
            echo json_encode(['success' => true]);
            break;

        case 'db_query_execute':
            $connection_id = $_POST['connection_id'] ?? '';
            $sql = $_POST['sql'] ?? '';
            
            if (empty($connection_id)) {
                throw new Exception("Conexão não especificada.");
            }
            
            if (empty($sql)) {
                throw new Exception("Instrução SQL vazia.");
            }
            
            // Load and decrypt connection details
            $file = __DIR__ . '/connections/' . $connection_id . '.enc';
            if (!file_exists($file)) {
                throw new Exception("Conexão não encontrada.");
            }
            
            $encryptedData = file_get_contents($file);
            $decryptedData = KodeWebEncryption::decrypt($encryptedData);
            if (!$decryptedData) {
                throw new Exception("Erro de descriptografia dos dados de conexão.");
            }
            
            $connInfo = json_decode($decryptedData, true);
            if (!$connInfo) {
                throw new Exception("Dados de conexão inválidos.");
            }
            
            $driver = $connInfo['driver'];
            $host = $connInfo['host'];
            $port = $connInfo['port'];
            $username = $connInfo['username'];
            $password = $connInfo['password'];
            $database = $connInfo['database'];
            
            // Build DSN
            $dsn = '';
            if ($driver === 'mysql') {
                $dsn = "mysql:host=$host;dbname=$database;charset=utf8mb4";
                if (!empty($port)) {
                    $dsn .= ";port=$port";
                }
            } elseif ($driver === 'pgsql') {
                $dsn = "pgsql:host=$host;dbname=$database";
                if (!empty($port)) {
                    $dsn .= ";port=$port";
                }
            } elseif ($driver === 'sqlite') {
                // SQLite expects the filepath (or database value)
                // We resolve the sqlite path using get_absolute_path for security
                $dsn = "sqlite:" . get_absolute_path($database);
            } else {
                throw new Exception("Driver do banco de dados não suportado: $driver");
            }
            
            // Connect and execute query
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5 // 5 seconds timeout
            ];
            
            $pdo = new PDO($dsn, $username, $password, $options);
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            $results = [];
            $columns = [];
            $affected_rows = 0;
            $is_select = false;
            
            // Basic regex to identify if query is SELECT or PRAGMA/SHOW/DESCRIBE
            if (preg_match('/^\s*(select|show|describe|explain|pragma)\b/i', $sql)) {
                $is_select = true;
                $results = $stmt->fetchAll();
                if (count($results) > 0) {
                    $columns = array_keys($results[0]);
                } else {
                    // Try to fetch column metadata if empty result set
                    for ($i = 0; $i < $stmt->columnCount(); $i++) {
                        $meta = $stmt->getColumnMeta($i);
                        if ($meta) {
                            $columns[] = $meta['name'];
                        }
                    }
                }
            } else {
                $affected_rows = $stmt->rowCount();
            }
            
            echo json_encode([
                'success' => true,
                'is_select' => $is_select,
                'columns' => $columns,
                'rows' => $results,
                'affected_rows' => $affected_rows
            ]);
            break;

        case 'files_list_recursive':
            $items = [];
            $exclude_dirs = ['node_modules', 'vendor', '.git', 'connections', '.gemini'];
            
            $scan = function($dir) use (&$scan, &$items, $exclude_dirs) {
                if (!is_dir($dir)) return;
                $files = scandir($dir);
                if ($files === false) return;
                
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') continue;
                    
                    $fullPath = $dir . DIRECTORY_SEPARATOR . $file;
                    $isDir = is_dir($fullPath);
                    
                    if ($isDir) {
                        if (in_array($file, $exclude_dirs)) continue;
                        $scan($fullPath);
                    } else {
                        // Get path relative to WORKSPACE_ROOT
                        $itemRelPath = ltrim(str_replace(WORKSPACE_ROOT, '', $fullPath), DIRECTORY_SEPARATOR);
                        $items[] = [
                            'name' => $file,
                            'path' => $itemRelPath
                        ];
                    }
                }
            };
            
            $scan(WORKSPACE_ROOT);
            echo json_encode([
                'success' => true,
                'files' => $items
            ]);
            break;
            
        default:
            throw new Exception("Ação desconhecida: $action");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
