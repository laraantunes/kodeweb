<?php
require_once __DIR__ . '/base.php';

try {
    switch ($action) {
        case 'update_user':
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            if (empty($username)) {
                throw new Exception("Usuário é obrigatório.");
            }
            $auth_file = $rootDir . '/data/auth.enc';
            
            if (empty($password) && file_exists($auth_file)) {
                $encData = file_get_contents($auth_file);
                $decData = KodeWebEncryption::decrypt($encData);
                if ($decData) {
                    $authData = json_decode($decData, true);
                    $password_hash = $authData['password'] ?? '';
                } else {
                    $password_hash = '';
                }
            } else {
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
            }
            
            $jsonString = json_encode([
                'username' => $username,
                'password' => $password_hash
            ]);
            $encrypted = KodeWebEncryption::encrypt($jsonString);
            if (file_put_contents($auth_file, $encrypted) === false) {
                throw new Exception("Erro ao salvar arquivo de autenticação.");
            }
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
