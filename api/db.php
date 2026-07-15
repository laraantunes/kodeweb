<?php
require_once __DIR__ . '/base.php';

try {
    switch ($action) {
        case 'db_connections_list':
            $connections_dir = $rootDir . '/connections';
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
                        // Skip non-DB connections (like FTP and SSH)
                        if (isset($data['type']) && in_array($data['type'], ['ftp', 'ssh'])) {
                            continue;
                        }
                        $data['has_password'] = !empty($data['password']);
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
            $duplicate_from = $_POST['duplicate_from'] ?? '';
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
                // If duplicating and password is '********', read password from the duplicated connection
                if ($password === '********' && !empty($duplicate_from)) {
                    $existingFile = $rootDir . '/connections/' . $duplicate_from . '.enc';
                    if (file_exists($existingFile)) {
                        $encData = file_get_contents($existingFile);
                        $decData = KodeWebEncryption::decrypt($encData);
                        if ($decData) {
                            $oldConn = json_decode($decData, true);
                            $password = $oldConn['password'] ?? '';
                        }
                    }
                }
            } else {
                // If editing and password is '********', merge with existing password
                if ($password === '********') {
                    $existingFile = $rootDir . '/connections/' . $id . '.enc';
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
            
            $connections_dir = $rootDir . '/connections';
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
            
            $file = $rootDir . '/connections/' . $id . '.enc';
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
