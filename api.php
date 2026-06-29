<?php
// api.php - Backend API for KodeWeb IDE
header('Content-Type: application/json; charset=utf-8');

define('IS_API', true);
require_once __DIR__ . '/auth.php';
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

// Helper to get PDO connection from connection ID
function get_pdo_connection($connection_id, $database_override = null) {
    if (empty($connection_id)) {
        throw new Exception("Conexão não especificada.");
    }
    
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
    $database = ($database_override !== null && $database_override !== '') ? $database_override : $connInfo['database'];
    
    $dsn = '';
    if ($driver === 'mysql') {
        if ($database !== null && $database !== '') {
            $dsn = "mysql:host=$host;dbname=$database;charset=utf8mb4";
        } else {
            $dsn = "mysql:host=$host;charset=utf8mb4";
        }
        if (!empty($port)) {
            $dsn .= ";port=$port";
        }
    } elseif ($driver === 'pgsql') {
        if ($database !== null && $database !== '') {
            $dsn = "pgsql:host=$host;dbname=$database";
        } else {
            $dsn = "pgsql:host=$host";
        }
        if (!empty($port)) {
            $dsn .= ";port=$port";
        }
    } elseif ($driver === 'sqlite') {
        $dsn = "sqlite:" . get_absolute_path($database);
    } else {
        throw new Exception("Driver do banco de dados não suportado: $driver");
    }
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5
    ];
    
    return [
        'pdo' => new PDO($dsn, $username, $password, $options),
        'driver' => $driver,
        'database' => $database
    ];
}

// Helper function to get FTP connection
function get_ftp_connection($connection_id) {
    if (empty($connection_id)) {
        throw new Exception("Conexão FTP não especificada.");
    }
    
    $file = __DIR__ . '/connections/' . $connection_id . '.enc';
    if (!file_exists($file)) {
        throw new Exception("Conexão FTP não encontrada.");
    }
    
    $encryptedData = file_get_contents($file);
    $decryptedData = KodeWebEncryption::decrypt($encryptedData);
    if (!$decryptedData) {
        throw new Exception("Erro de descriptografia dos dados de conexão FTP.");
    }
    
    $connInfo = json_decode($decryptedData, true);
    if (!$connInfo || !isset($connInfo['type']) || $connInfo['type'] !== 'ftp') {
        throw new Exception("Dados de conexão FTP inválidos.");
    }
    
    return $connInfo;
}

function connect_ftp($connInfo) {
    $host = $connInfo['host'];
    $port = !empty($connInfo['port']) ? (int)$connInfo['port'] : 21;
    $username = $connInfo['username'];
    $password = $connInfo['password'];
    
    if (!function_exists('ftp_connect')) {
        throw new Exception("Extensão FTP não está habilitada no PHP.");
    }
    
    $ftp = @ftp_connect($host, $port, 10);
    if (!$ftp) {
        $error = error_get_last();
        $msg = $error ? $error['message'] : "Desconhecido";
        @file_put_contents('data/ftp_error.log', date('Y-m-d H:i:s') . " - Connect Error ($host:$port): $msg\n", FILE_APPEND);
        throw new Exception("Não foi possível conectar ao servidor FTP $host:$port.");
    }
    
    if (!@ftp_login($ftp, $username, $password)) {
        $error = error_get_last();
        $msg = $error ? $error['message'] : "Desconhecido";
        @file_put_contents('data/ftp_error.log', date('Y-m-d H:i:s') . " - Login Error ($username@$host): $msg\n", FILE_APPEND);
        throw new Exception("Falha na autenticação FTP para o usuário $username.");
    }
    
    ftp_pasv($ftp, true);
    return $ftp;
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
            $relativePath = $_POST['path'] ?? $_GET['path'] ?? '';
            $absPath = get_absolute_path($relativePath);
            
            if (!file_exists($absPath) || is_dir($absPath)) {
                throw new Exception("Arquivo não encontrado.");
            }
            
            $content = file_get_contents($absPath);
            echo json_encode(['success' => true, 'content' => $content]);
            break;

        case 'file_serve':
            $relativePath = $_GET['path'] ?? '';
            $absPath = get_absolute_path($relativePath);
            
            if (!file_exists($absPath) || is_dir($absPath)) {
                http_response_code(404);
                exit("Arquivo não encontrado.");
            }
            
            $mimeType = @mime_content_type($absPath);
            if (!$mimeType) {
                $mimeType = 'application/octet-stream';
            }
            
            $ext = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
            $mimes = [
                'svg' => 'image/svg+xml',
                'css' => 'text/css',
                'js' => 'application/javascript',
                'json' => 'application/json',
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                'ico' => 'image/x-icon'
            ];
            if (isset($mimes[$ext])) {
                $mimeType = $mimes[$ext];
            }
            
            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($absPath));
            readfile($absPath);
            exit;


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

        case 'file_upload':
            $targetDir = $_POST['target_dir'] ?? '';
            $relativePath = $_POST['relative_path'] ?? ''; // preserve folder structure
            
            if (empty($_FILES['file'])) {
                throw new Exception("Nenhum arquivo enviado.");
            }
            
            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("Erro no upload do arquivo.");
            }
            
            $absTargetDir = get_absolute_path($targetDir);
            
            if (!empty($relativePath)) {
                $finalPath = $absTargetDir . DIRECTORY_SEPARATOR . $relativePath;
            } else {
                $finalPath = $absTargetDir . DIRECTORY_SEPARATOR . basename($file['name']);
            }
            
            $finalDir = dirname($finalPath);
            if (!is_dir($finalDir)) {
                mkdir($finalDir, 0755, true);
            }
            
            if (!move_uploaded_file($file['tmp_name'], $finalPath)) {
                throw new Exception("Falha ao mover arquivo enviado.");
            }
            
            echo json_encode(['success' => true]);
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
                        if (is_dir($p)) {
                            $deleteDir($p);
                        } else {
                            @chmod($p, 0777);
                            @unlink($p);
                        }
                    }
                    @chmod($dirPath, 0777);
                    return @rmdir($dirPath);
                };
                if (!$deleteDir($absPath)) {
                    $err = error_get_last();
                    $errMsg = $err ? $err['message'] : 'Erro desconhecido';
                    throw new Exception("Falha ao deletar diretório: " . $errMsg);
                }
            } else {
                @chmod($absPath, 0777);
                if (!@unlink($absPath)) {
                    $err = error_get_last();
                    $errMsg = $err ? $err['message'] : 'Erro desconhecido';
                    throw new Exception("Falha ao deletar arquivo: " . $errMsg);
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
                        // Skip non-DB connections (like FTP)
                        if (isset($data['type']) && $data['type'] === 'ftp') {
                            continue;
                        }
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
            $database = $_POST['database'] ?? '';
            
            if (empty($sql)) {
                throw new Exception("Instrução SQL vazia.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            
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

        case 'db_list_databases':
            $connection_id = $_GET['connection_id'] ?? $_POST['connection_id'] ?? '';
            $conn = get_pdo_connection($connection_id);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            $databases = [];
            
            if ($driver === 'mysql') {
                $stmt = $pdo->query("SHOW DATABASES");
                $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($driver === 'pgsql') {
                $stmt = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false");
                $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($driver === 'sqlite') {
                $databases = [$conn['database']];
            }
            echo json_encode(['success' => true, 'databases' => $databases, 'driver' => $driver]);
            break;

        case 'db_list_tables':
            $connection_id = $_GET['connection_id'] ?? $_POST['connection_id'] ?? '';
            $database = $_GET['database'] ?? $_POST['database'] ?? '';
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            $tables = [];
            
            if ($driver === 'mysql') {
                $stmt = $pdo->query("SHOW TABLES");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($driver === 'pgsql') {
                $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($driver === 'sqlite') {
                $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }
            echo json_encode(['success' => true, 'tables' => $tables]);
            break;

        case 'db_table_structure':
            $connection_id = $_GET['connection_id'] ?? $_POST['connection_id'] ?? '';
            $database = $_GET['database'] ?? $_POST['database'] ?? '';
            $table = $_GET['table'] ?? $_POST['table'] ?? '';
            if (empty($table)) throw new Exception("Tabela não especificada.");
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            $columns = [];
            
            if ($driver === 'mysql') {
                $stmt = $pdo->query("SHOW FULL COLUMNS FROM `" . str_replace("`","``",$table) . "`");
                $rows = $stmt->fetchAll();
                foreach ($rows as $row) {
                    $columns[] = [
                        'name' => $row['Field'],
                        'type' => $row['Type'],
                        'nullable' => $row['Null'] === 'YES',
                        'key' => $row['Key'],
                        'default' => $row['Default'],
                        'extra' => $row['Extra']
                    ];
                }
            } elseif ($driver === 'pgsql') {
                $stmt = $pdo->prepare("
                    SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
                           (SELECT tc.constraint_type 
                            FROM information_schema.table_constraints tc 
                            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
                            WHERE tc.table_name = c.table_name AND kcu.column_name = c.column_name AND tc.constraint_type = 'PRIMARY KEY' LIMIT 1) as key_type
                    FROM information_schema.columns c
                    WHERE c.table_name = :table AND c.table_schema = 'public'
                    ORDER BY c.ordinal_position
                ");
                $stmt->execute(['table' => $table]);
                $rows = $stmt->fetchAll();
                foreach ($rows as $row) {
                    $columns[] = [
                        'name' => $row['column_name'],
                        'type' => $row['data_type'],
                        'nullable' => $row['is_nullable'] === 'YES',
                        'key' => $row['key_type'] === 'PRIMARY KEY' ? 'PRI' : '',
                        'default' => $row['column_default'],
                        'extra' => ''
                    ];
                }
            } elseif ($driver === 'sqlite') {
                $stmt = $pdo->query("PRAGMA table_info(`" . str_replace("`","``",$table) . "`)");
                $rows = $stmt->fetchAll();
                foreach ($rows as $row) {
                    $columns[] = [
                        'name' => $row['name'],
                        'type' => $row['type'],
                        'nullable' => $row['notnull'] == 0,
                        'key' => $row['pk'] == 1 ? 'PRI' : '',
                        'default' => $row['dflt_value'],
                        'extra' => ''
                    ];
                }
            }
            echo json_encode(['success' => true, 'columns' => $columns]);
            break;

        case 'db_column_add':
            $connection_id = $_POST['connection_id'] ?? '';
            $database = $_POST['database'] ?? '';
            $table = $_POST['table'] ?? '';
            $column_name = $_POST['column_name'] ?? '';
            $column_type = $_POST['column_type'] ?? '';
            $nullable = isset($_POST['nullable']) && $_POST['nullable'] === 'true';
            $default_value = $_POST['default_value'] ?? null;
            
            if (empty($table) || empty($column_name) || empty($column_type)) {
                throw new Exception("Parâmetros inválidos.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            
            $nullSql = $nullable ? "NULL" : "NOT NULL";
            $defaultSql = "";
            if ($default_value !== null && $default_value !== '') {
                if (strtoupper($default_value) === 'NULL') {
                    $defaultSql = "DEFAULT NULL";
                } elseif (strtoupper($default_value) === 'CURRENT_TIMESTAMP') {
                    $defaultSql = "DEFAULT CURRENT_TIMESTAMP";
                } else {
                    $defaultSql = "DEFAULT " . $pdo->quote($default_value);
                }
            }
            
            if ($driver === 'mysql' || $driver === 'sqlite') {
                $sql = "ALTER TABLE `" . str_replace("`","``",$table) . "` ADD COLUMN `" . str_replace("`","``",$column_name) . "` $column_type $nullSql $defaultSql";
            } else { // pgsql
                $sql = "ALTER TABLE \"" . str_replace("\"","\"\"",$table) . "\" ADD COLUMN \"" . str_replace("\"","\"\"",$column_name) . "\" $column_type $nullSql $defaultSql";
            }
            
            $pdo->exec($sql);
            echo json_encode(['success' => true]);
            break;

        case 'db_column_delete':
            $connection_id = $_POST['connection_id'] ?? '';
            $database = $_POST['database'] ?? '';
            $table = $_POST['table'] ?? '';
            $column_name = $_POST['column_name'] ?? '';
            
            if (empty($table) || empty($column_name)) {
                throw new Exception("Parâmetros inválidos.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            
            if ($driver === 'mysql' || $driver === 'sqlite') {
                $sql = "ALTER TABLE `" . str_replace("`","``",$table) . "` DROP COLUMN `" . str_replace("`","``",$column_name) . "`";
            } else { // pgsql
                $sql = "ALTER TABLE \"" . str_replace("\"","\"\"",$table) . "\" DROP COLUMN \"" . str_replace("\"","\"\"",$column_name) . "\"";
            }
            
            $pdo->exec($sql);
            echo json_encode(['success' => true]);
            break;

        case 'db_column_modify':
            $connection_id = $_POST['connection_id'] ?? '';
            $database = $_POST['database'] ?? '';
            $table = $_POST['table'] ?? '';
            $old_name = $_POST['old_name'] ?? '';
            $new_name = $_POST['new_name'] ?? '';
            $column_type = $_POST['column_type'] ?? '';
            $nullable = isset($_POST['nullable']) && $_POST['nullable'] === 'true';
            $default_value = $_POST['default_value'] ?? null;
            
            if (empty($table) || empty($old_name) || empty($new_name) || empty($column_type)) {
                throw new Exception("Parâmetros inválidos.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            
            $nullSql = $nullable ? "NULL" : "NOT NULL";
            $defaultSql = "";
            if ($default_value !== null && $default_value !== '') {
                if (strtoupper($default_value) === 'NULL') {
                    $defaultSql = "DEFAULT NULL";
                } elseif (strtoupper($default_value) === 'CURRENT_TIMESTAMP') {
                    $defaultSql = "DEFAULT CURRENT_TIMESTAMP";
                } else {
                    $defaultSql = "DEFAULT " . $pdo->quote($default_value);
                }
            }
            
            if ($driver === 'mysql') {
                $sql = "ALTER TABLE `" . str_replace("`","``",$table) . "` CHANGE COLUMN `" . str_replace("`","``",$old_name) . "` `" . str_replace("`","``",$new_name) . "` $column_type $nullSql $defaultSql";
                $pdo->exec($sql);
            } elseif ($driver === 'pgsql') {
                $tableEsc = "\"" . str_replace("\"","\"\"",$table) . "\"";
                if ($old_name !== $new_name) {
                    $pdo->exec("ALTER TABLE $tableEsc RENAME COLUMN \"" . str_replace("\"","\"\"",$old_name) . "\" TO \"" . str_replace("\"","\"\"",$new_name) . "\"");
                }
                $colEsc = "\"" . str_replace("\"","\"\"",$new_name) . "\"";
                $pdo->exec("ALTER TABLE $tableEsc ALTER COLUMN $colEsc TYPE $column_type");
                if ($nullable) {
                    $pdo->exec("ALTER TABLE $tableEsc ALTER COLUMN $colEsc DROP NOT NULL");
                } else {
                    $pdo->exec("ALTER TABLE $tableEsc ALTER COLUMN $colEsc SET NOT NULL");
                }
                if ($default_value !== null && $default_value !== '') {
                    $pdo->exec("ALTER TABLE $tableEsc ALTER COLUMN $colEsc SET $defaultSql");
                } else {
                    $pdo->exec("ALTER TABLE $tableEsc ALTER COLUMN $colEsc DROP DEFAULT");
                }
            } elseif ($driver === 'sqlite') {
                if ($old_name !== $new_name) {
                    $pdo->exec("ALTER TABLE `" . str_replace("`","``",$table) . "` RENAME COLUMN `" . str_replace("`","``",$old_name) . "` TO `" . str_replace("`","``",$new_name) . "`");
                } else {
                    throw new Exception("SQLite não suporta alteração de tipo ou restrições de coluna diretamente.");
                }
            }
            echo json_encode(['success' => true]);
            break;

        case 'db_row_insert':
            $connection_id = $_POST['connection_id'] ?? '';
            $database = $_POST['database'] ?? '';
            $table = $_POST['table'] ?? '';
            $values = $_POST['values'] ?? '';
            
            if (empty($table) || empty($values)) {
                throw new Exception("Parâmetros inválidos.");
            }
            
            $valuesObj = json_decode($values, true);
            if (!is_array($valuesObj) || empty($valuesObj)) {
                throw new Exception("Valores vazios.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            
            $cols = [];
            $placeholders = [];
            $params = [];
            
            $i = 0;
            foreach ($valuesObj as $col => $val) {
                $paramName = "v_" . $i++;
                if ($driver === 'mysql' || $driver === 'sqlite') {
                    $cols[] = "`" . str_replace("`","``",$col) . "`";
                } else {
                    $cols[] = "\"" . str_replace("\"","\"\"",$col) . "\"";
                }
                $placeholders[] = ":$paramName";
                $params[$paramName] = $val === '' ? null : $val;
            }
            
            $colsSql = implode(", ", $cols);
            $placeholdersSql = implode(", ", $placeholders);
            
            if ($driver === 'mysql' || $driver === 'sqlite') {
                $sql = "INSERT INTO `" . str_replace("`","``",$table) . "` ($colsSql) VALUES ($placeholdersSql)";
            } else {
                $sql = "INSERT INTO \"" . str_replace("\"","\"\"",$table) . "\" ($colsSql) VALUES ($placeholdersSql)";
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true]);
            break;

        case 'db_row_update':
            $connection_id = $_POST['connection_id'] ?? '';
            $database = $_POST['database'] ?? '';
            $table = $_POST['table'] ?? '';
            $keys = $_POST['keys'] ?? '';
            $values = $_POST['values'] ?? '';
            
            if (empty($table) || empty($keys) || empty($values)) {
                throw new Exception("Parâmetros inválidos.");
            }
            
            $keysObj = json_decode($keys, true);
            $valuesObj = json_decode($values, true);
            
            if (!is_array($keysObj) || empty($keysObj) || !is_array($valuesObj)) {
                throw new Exception("Valores inválidos.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            
            $setClauses = [];
            $whereClauses = [];
            $params = [];
            
            $i = 0;
            foreach ($valuesObj as $col => $val) {
                $paramName = "v_" . $i++;
                if ($driver === 'mysql' || $driver === 'sqlite') {
                    $setClauses[] = "`" . str_replace("`","``",$col) . "` = :$paramName";
                } else {
                    $setClauses[] = "\"" . str_replace("\"","\"\"",$col) . "\" = :$paramName";
                }
                $params[$paramName] = $val === '' ? null : $val;
            }
            
            foreach ($keysObj as $col => $val) {
                $paramName = "k_" . $i++;
                if ($driver === 'mysql' || $driver === 'sqlite') {
                    $whereClauses[] = "`" . str_replace("`","``",$col) . "` = :$paramName";
                } else {
                    $whereClauses[] = "\"" . str_replace("\"","\"\"",$col) . "\" = :$paramName";
                }
                $params[$paramName] = $val;
            }
            
            $setSql = implode(", ", $setClauses);
            $whereSql = implode(" AND ", $whereClauses);
            
            if ($driver === 'mysql' || $driver === 'sqlite') {
                $sql = "UPDATE `" . str_replace("`","``",$table) . "` SET $setSql WHERE $whereSql";
            } else {
                $sql = "UPDATE \"" . str_replace("\"","\"\"",$table) . "\" SET $setSql WHERE $whereSql";
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true]);
            break;

        case 'db_row_delete':
            $connection_id = $_POST['connection_id'] ?? '';
            $database = $_POST['database'] ?? '';
            $table = $_POST['table'] ?? '';
            $keys = $_POST['keys'] ?? '';
            
            if (empty($table) || empty($keys)) {
                throw new Exception("Parâmetros inválidos.");
            }
            
            $keysObj = json_decode($keys, true);
            if (!is_array($keysObj) || empty($keysObj)) {
                throw new Exception("Chaves primárias inválidas.");
            }
            
            $conn = get_pdo_connection($connection_id, empty($database) ? null : $database);
            $pdo = $conn['pdo'];
            $driver = $conn['driver'];
            
            $whereClauses = [];
            $params = [];
            $i = 0;
            foreach ($keysObj as $col => $val) {
                $paramName = "k_" . $i++;
                if ($driver === 'mysql' || $driver === 'sqlite') {
                    $whereClauses[] = "`" . str_replace("`","``",$col) . "` = :$paramName";
                } else {
                    $whereClauses[] = "\"" . str_replace("\"","\"\"",$col) . "\" = :$paramName";
                }
                $params[$paramName] = $val;
            }
            
            $whereSql = implode(" AND ", $whereClauses);
            if ($driver === 'mysql' || $driver === 'sqlite') {
                $sql = "DELETE FROM `" . str_replace("`","``",$table) . "` WHERE $whereSql";
            } else {
                $sql = "DELETE FROM \"" . str_replace("\"","\"\"",$table) . "\" WHERE $whereSql";
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true]);
            break;


            
        case 'ftp_connections_list':
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
                    if ($data && isset($data['type']) && $data['type'] === 'ftp') {
                        unset($data['password']);
                        $connections[] = $data;
                    }
                }
            }
            
            echo json_encode(['success' => true, 'connections' => $connections]);
            break;

        case 'ftp_connection_save':
            $id = $_POST['id'] ?? '';
            $name = $_POST['name'] ?? '';
            $host = $_POST['host'] ?? '';
            $port = $_POST['port'] ?? '21';
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            
            if (empty($name) || empty($host)) {
                throw new Exception("Nome e Host são obrigatórios.");
            }
            
            if (empty($id)) {
                $id = uniqid('ftp_conn_');
            } else {
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
                'type' => 'ftp',
                'name' => $name,
                'host' => $host,
                'port' => $port,
                'username' => $username,
                'password' => $password
            ];
            
            $connections_dir = __DIR__ . '/connections';
            if (!is_dir($connections_dir)) {
                mkdir($connections_dir, 0700, true);
            }
            
            $jsonString = json_encode($connectionData);
            $encrypted = KodeWebEncryption::encrypt($jsonString);
            
            if (file_put_contents($connections_dir . '/' . $id . '.enc', $encrypted) === false) {
                throw new Exception("Erro ao salvar arquivo de conexão FTP.");
            }
            
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'ftp_connection_delete':
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

        case 'ftp_test':
            $host = $_POST['host'] ?? '';
            $port = empty($_POST['port']) ? 21 : (int)$_POST['port'];
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            
            if (!function_exists('ftp_connect')) {
                throw new Exception("Extensão FTP não está habilitada.");
            }
            
            $ftp = @ftp_connect($host, $port, 5);
            if (!$ftp) {
                $error = error_get_last();
                $msg = $error ? $error['message'] : "Desconhecido";
                @file_put_contents('data/ftp_error.log', date('Y-m-d H:i:s') . " - Test Connect Error ($host:$port): $msg\n", FILE_APPEND);
                throw new Exception("Falha de conexão com $host:$port");
            }
            if (!@ftp_login($ftp, $username, $password)) {
                $error = error_get_last();
                $msg = $error ? $error['message'] : "Desconhecido";
                @file_put_contents('data/ftp_error.log', date('Y-m-d H:i:s') . " - Test Login Error ($username@$host): $msg\n", FILE_APPEND);
                ftp_close($ftp);
                throw new Exception("Falha de autenticação.");
            }
            
            ftp_close($ftp);
            echo json_encode(['success' => true]);
            break;

        case 'ftp_list':
            $connection_id = $_GET['connection_id'] ?? $_POST['connection_id'] ?? '';
            $path = $_GET['path'] ?? $_POST['path'] ?? '/';
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $items = [];
            
            $mlsd = @ftp_mlsd($ftp, $path);
            if (is_array($mlsd) && count($mlsd) >= 0) {
                foreach ($mlsd as $entry) {
                    $name = $entry['name'];
                    if ($name === '.' || $name === '..') continue;
                    
                    $isDir = isset($entry['type']) && $entry['type'] === 'cdir' ? true : (isset($entry['type']) && $entry['type'] === 'dir');
                    // some FTP servers return pdir or cdir, wait, 'dir' is normal. 'cdir' is current (.), 'pdir' is parent (..)
                    if (isset($entry['type']) && ($entry['type'] === 'cdir' || $entry['type'] === 'pdir')) continue;
                    
                    $fullPath = rtrim($path, '/') . '/' . $name;
                    $items[] = [
                        'name' => $name,
                        'path' => $fullPath,
                        'is_dir' => $isDir,
                        'size' => isset($entry['size']) ? (int)$entry['size'] : 0
                    ];
                }
            } else {
                $rawlist = @ftp_rawlist($ftp, $path);
                if (is_array($rawlist)) {
                    foreach ($rawlist as $line) {
                        if (preg_match('/^([d\-l])[rwx\-]{9}\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\d+\s+[\d:]+\s+(.+)$/', $line, $matches)) {
                            $type = $matches[1];
                            $size = (int)$matches[2];
                            $name = $matches[3];
                            
                            if ($name === '.' || $name === '..') continue;
                            $items[] = [
                                'name' => $name,
                                'path' => rtrim($path, '/') . '/' . $name,
                                'is_dir' => ($type === 'd' || $type === 'l'),
                                'size' => $size
                            ];
                        } 
                        elseif (preg_match('/^\d{2}\-\d{2}\-\d{2}\s+\d{2}:\d{2}[AP]M\s+(<DIR>|[\d]+)\s+(.+)$/', $line, $matches)) {
                            $isDir = trim($matches[1]) === '<DIR>';
                            $size = $isDir ? 0 : (int)$matches[1];
                            $name = trim($matches[2]);
                            
                            if ($name === '.' || $name === '..') continue;
                            $items[] = [
                                'name' => $name,
                                'path' => rtrim($path, '/') . '/' . $name,
                                'is_dir' => $isDir,
                                'size' => $size
                            ];
                        }
                    }
                }
            }
            
            usort($items, function($a, $b) {
                if ($a['is_dir'] && !$b['is_dir']) return -1;
                if (!$a['is_dir'] && $b['is_dir']) return 1;
                return strcasecmp($a['name'], $b['name']);
            });
            
            ftp_close($ftp);
            echo json_encode(['success' => true, 'items' => $items]);
            break;

        case 'ftp_file_read':
            $connection_id = $_POST['connection_id'] ?? '';
            $path = $_POST['path'] ?? '';
            
            if (empty($path)) throw new Exception("Caminho não especificado.");
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $tempFile = tempnam(sys_get_temp_dir(), 'ftp_');
            if (@ftp_get($ftp, $tempFile, $path, FTP_BINARY)) {
                $content = file_get_contents($tempFile);
                $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
                $isImage = in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico']);
                if ($isImage) {
                    $mime = mime_content_type($tempFile) ?: 'image/jpeg';
                    $content = 'data:' . $mime . ';base64,' . base64_encode($content);
                }
                unlink($tempFile);
                ftp_close($ftp);
                
                echo json_encode(['success' => true, 'content' => $content]);
            } else {
                ftp_close($ftp);
                throw new Exception("Erro ao baixar arquivo do FTP.");
            }
            break;

        case 'ftp_file_save':
            $connection_id = $_POST['connection_id'] ?? '';
            $path = $_POST['path'] ?? '';
            $content = $_POST['content'] ?? '';
            
            if (empty($path)) throw new Exception("Caminho não especificado.");
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $tempFile = tempnam(sys_get_temp_dir(), 'ftp_');
            file_put_contents($tempFile, $content);
            
            if (@ftp_put($ftp, $path, $tempFile, FTP_BINARY)) {
                unlink($tempFile);
                ftp_close($ftp);
                echo json_encode(['success' => true]);
            } else {
                unlink($tempFile);
                ftp_close($ftp);
                throw new Exception("Erro ao salvar arquivo no FTP.");
            }
            break;

        case 'ftp_transfer_batch_local':
            $connection_id = $_POST['connection_id'] ?? '';
            $files_json = $_POST['files'] ?? '[]';
            
            $files = json_decode($files_json, true);
            if (!is_array($files)) {
                throw new Exception("Formato de arquivos inválido.");
            }
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            // Cache created dirs to avoid redundant mkdir calls
            $createdDirs = [];
            $results = [];
            
            foreach ($files as $file) {
                $local_path = $file['local_path'];
                $ftp_path = $file['ftp_path'];
                
                $absLocalPath = get_absolute_path($local_path);
                if (!file_exists($absLocalPath) || is_dir($absLocalPath)) {
                    $results[] = ['file' => $local_path, 'success' => false, 'error' => 'Not found or is dir'];
                    continue;
                }
                
                $dirParts = explode('/', dirname($ftp_path));
                $currentDir = '';
                if (dirname($ftp_path) !== '.' && dirname($ftp_path) !== '') {
                    foreach ($dirParts as $part) {
                        if (empty($part) || $part === '.') continue;
                        $currentDir .= '/' . $part;
                        if (!isset($createdDirs[$currentDir])) {
                            @ftp_mkdir($ftp, $currentDir);
                            $createdDirs[$currentDir] = true;
                        }
                    }
                }
                
                if (@ftp_put($ftp, $ftp_path, $absLocalPath, FTP_BINARY)) {
                    $results[] = ['file' => $local_path, 'success' => true];
                } else {
                    $results[] = ['file' => $local_path, 'success' => false];
                }
            }
            
            ftp_close($ftp);
            echo json_encode(['success' => true, 'results' => $results]);
            break;

        case 'ftp_transfer_local':
            $connection_id = $_POST['connection_id'] ?? '';
            $local_path = $_POST['local_path'] ?? '';
            $ftp_path = $_POST['ftp_path'] ?? ''; 
            
            if (empty($local_path) || empty($ftp_path)) {
                throw new Exception("Caminho local e FTP são obrigatórios.");
            }
            
            $absLocalPath = get_absolute_path($local_path);
            if (!file_exists($absLocalPath)) {
                throw new Exception("Arquivo local não encontrado.");
            }
            if (is_dir($absLocalPath)) {
                throw new Exception("A transferência deve ser arquivo por arquivo.");
            }
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $dirParts = explode('/', dirname($ftp_path));
            $currentDir = '';
            if (dirname($ftp_path) !== '.' && dirname($ftp_path) !== '') {
                foreach ($dirParts as $part) {
                    if (empty($part) || $part === '.') continue;
                    $currentDir .= '/' . $part;
                    @ftp_mkdir($ftp, $currentDir);
                }
            }
            
            if (@ftp_put($ftp, $ftp_path, $absLocalPath, FTP_BINARY)) {
                ftp_close($ftp);
                echo json_encode(['success' => true]);
            } else {
                $err = error_get_last();
                $errMsg = $err ? $err['message'] : 'Erro desconhecido';
                ftp_close($ftp);
                throw new Exception("Erro ao enviar arquivo para o FTP: " . $errMsg);
            }
            break;

        case 'ftp_transfer_batch_remote':
            $connection_id = $_POST['connection_id'] ?? '';
            $files_json = $_POST['files'] ?? '[]';
            
            $files = json_decode($files_json, true);
            if (!is_array($files)) {
                throw new Exception("Formato de arquivos inválido.");
            }
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $results = [];
            foreach ($files as $file) {
                $ftp_path = $file['ftp_path'];
                $local_path = $file['local_path'];
                
                $absLocalPath = get_absolute_path($local_path);
                $dir = dirname($absLocalPath);
                if (!is_dir($dir)) {
                    mkdir($dir, 0777, true);
                }
                
                if (@ftp_get($ftp, $absLocalPath, $ftp_path, FTP_BINARY)) {
                    $results[] = ['file' => $local_path, 'success' => true];
                } else {
                    $results[] = ['file' => $local_path, 'success' => false];
                }
            }
            
            ftp_close($ftp);
            echo json_encode(['success' => true, 'results' => $results]);
            break;

        case 'ftp_transfer_remote':
            $connection_id = $_POST['connection_id'] ?? '';
            $ftp_path = $_POST['ftp_path'] ?? ''; 
            $local_path = $_POST['local_path'] ?? '';
            
            if (empty($local_path) || empty($ftp_path)) {
                throw new Exception("Caminho local e FTP são obrigatórios.");
            }
            
            $absLocalPath = get_absolute_path($local_path);
            
            $dir = dirname($absLocalPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0777, true);
            }
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            if (@ftp_get($ftp, $absLocalPath, $ftp_path, FTP_BINARY)) {
                ftp_close($ftp);
                echo json_encode(['success' => true]);
            } else {
                ftp_close($ftp);
                throw new Exception("Erro ao baixar arquivo do FTP.");
            }
            break;

        case 'ftp_list_recursive':
            $connection_id = $_POST['connection_id'] ?? '';
            $base_path = $_POST['path'] ?? '/';
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $items = [];
            
            $scan = function($dir) use (&$scan, &$items, $ftp) {
                $raw = @ftp_mlsd($ftp, $dir);
                if ($raw === false) return;
                foreach ($raw as $item) {
                    if ($item['name'] === '.' || $item['name'] === '..') continue;
                    $fullPath = rtrim($dir, '/') . '/' . ltrim($item['name'], '/');
                    if ($item['type'] === 'dir') {
                        $scan($fullPath);
                    } elseif ($item['type'] === 'file') {
                        $items[] = [
                            'name' => $item['name'],
                            'path' => ltrim(str_replace($_POST['path'] ?? '/', '', $fullPath), '/')
                        ];
                    }
                }
            };
            
            $size = @ftp_size($ftp, $base_path);
            if ($size != -1) {
                $items[] = [
                    'name' => basename($base_path),
                    'path' => basename($base_path)
                ];
            } else {
                $scan($base_path);
            }
            
            ftp_close($ftp);
            echo json_encode(['success' => true, 'files' => $items]);
            break;


        case 'ftp_mkdir':
            $connection_id = $_POST['connection_id'] ?? '';
            $path = $_POST['path'] ?? '';
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            if (@ftp_mkdir($ftp, $path)) {
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Erro ao criar diretório.");
            }
            ftp_close($ftp);
            break;
            
        case 'ftp_delete':
            $connection_id = $_POST['connection_id'] ?? '';
            $path = $_POST['path'] ?? '';
            $is_dir = isset($_POST['is_dir']) && $_POST['is_dir'] === 'true';
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            if ($is_dir) {
                $delete_recursive = function($conn, $dirPath) use (&$delete_recursive) {
                    $items = @ftp_mlsd($conn, $dirPath);
                    if ($items !== false) {
                        foreach ($items as $item) {
                            if ($item['name'] === '.' || $item['name'] === '..') continue;
                            $fullPath = rtrim($dirPath, '/') . '/' . ltrim($item['name'], '/');
                            if ($item['type'] === 'dir') {
                                $delete_recursive($conn, $fullPath);
                            } else {
                                @ftp_delete($conn, $fullPath);
                            }
                        }
                    }
                    return @ftp_rmdir($conn, $dirPath);
                };
                $success = $delete_recursive($ftp, $path);
            } else {
                $success = @ftp_delete($ftp, $path);
            }
            
            if ($success) {
                echo json_encode(['success' => true]);
            } else {
                $err = error_get_last();
                $errMsg = $err ? $err['message'] : 'Erro desconhecido';
                throw new Exception("Erro ao deletar: " . $errMsg);
            }
            ftp_close($ftp);
            break;
            
        case 'ftp_rename':
            $connection_id = $_POST['connection_id'] ?? '';
            $old_path = $_POST['old_path'] ?? '';
            $new_path = $_POST['new_path'] ?? '';
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            if (@ftp_rename($ftp, $old_path, $new_path)) {
                echo json_encode(['success' => true]);
            } else {
                throw new Exception("Erro ao renomear.");
            }
            ftp_close($ftp);
            break;

        case 'ftp_file_upload':
            $connection_id = $_POST['connection_id'] ?? '';
            $target_dir = $_POST['target_dir'] ?? '/';
            if (empty($_FILES['files'])) {
                throw new Exception("Nenhum arquivo enviado.");
            }
            
            $connInfo = get_ftp_connection($connection_id);
            $ftp = connect_ftp($connInfo);
            
            $files = $_FILES['files'];
            $successCount = 0;
            $errors = [];
            
            $isMultiple = is_array($files['name']);
            $count = $isMultiple ? count($files['name']) : 1;
            
            for ($i = 0; $i < $count; $i++) {
                $name = $isMultiple ? $files['name'][$i] : $files['name'];
                $tmpPath = $isMultiple ? $files['tmp_name'][$i] : $files['tmp_name'];
                $error = $isMultiple ? $files['error'][$i] : $files['error'];
                
                if ($error === UPLOAD_ERR_OK) {
                    $relPath = $isMultiple && isset($_POST['paths'][$i]) ? $_POST['paths'][$i] : $name;
                    $fullFtpPath = rtrim($target_dir, '/') . '/' . ltrim($relPath, '/');
                    
                    $dirParts = explode('/', dirname($relPath));
                    $currentDir = rtrim($target_dir, '/');
                    if (dirname($relPath) !== '.' && dirname($relPath) !== '') {
                        foreach ($dirParts as $part) {
                            if (empty($part) || $part === '.') continue;
                            $currentDir .= '/' . $part;
                            @ftp_mkdir($ftp, $currentDir);
                        }
                    }
                    
                    if (@ftp_put($ftp, $fullFtpPath, $tmpPath, FTP_BINARY)) {
                        $successCount++;
                    } else {
                        $err = error_get_last();
                        $errMsg = $err ? $err['message'] : 'Erro desconhecido';
                        $errors[] = "Erro ao enviar $name: " . $errMsg;
                    }
                }
            }
            ftp_close($ftp);
            echo json_encode(['success' => true, 'uploaded' => $successCount, 'errors' => $errors]);
            break;

        case 'files_list_recursive':
            $dir_param = $_GET['dir'] ?? $_POST['dir'] ?? '';
            $base_dir = empty($dir_param) ? WORKSPACE_ROOT : get_absolute_path($dir_param);
            
            if (!is_dir($base_dir)) {
                // If it's a file, just return it
                if (file_exists($base_dir)) {
                    $itemRelPath = ltrim(str_replace(WORKSPACE_ROOT, '', $base_dir), DIRECTORY_SEPARATOR);
                    echo json_encode(['success' => true, 'files' => [['name' => basename($base_dir), 'path' => $itemRelPath]]]);
                } else {
                    throw new Exception("Diretório ou arquivo não encontrado.");
                }
                break;
            }
            
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
                        $itemRelPath = ltrim(str_replace(WORKSPACE_ROOT, '', $fullPath), DIRECTORY_SEPARATOR);
                        $items[] = [
                            'name' => $file,
                            'path' => $itemRelPath
                        ];
                    }
                }
            };
            
            $scan($base_dir);
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
    
    $log_file = __DIR__ . '/kodeweb_error.log';
    $log_message = date('Y-m-d H:i:s') . " - Action [{$action}]: " . $e->getMessage() . "\n";
    file_put_contents($log_file, $log_message, FILE_APPEND);
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
