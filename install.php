<?php
// install.php

$auth_file = __DIR__ . '/data/auth.enc';
$is_installed = file_exists($auth_file);
$message = '';
$message_type = ''; // 'success' or 'error'

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once 'encryption.php';
    
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $is_local = isset($_POST['is_local']) ? '1' : '0';

    if (empty($username) || empty($password)) {
        $message = 'Usuário e senha são obrigatórios.';
        $message_type = 'error';
    } else {
        // Create data folder if it doesn't exist
        $data_dir = __DIR__ . '/data';
        if (!is_dir($data_dir)) {
            mkdir($data_dir, 0755, true);
        }

        // Create data/.htaccess for protection
        file_put_contents($data_dir . '/.htaccess', "Require all denied\nDeny from all");

        // Create initial user-settings.yaml if it doesn't exist
        $user_settings_file = $data_dir . '/user-settings.yaml';
        if (!file_exists($user_settings_file)) {
            $default_settings = "# Configurações do Usuário\n# Adicione suas configurações personalizadas aqui.\n";
            file_put_contents($user_settings_file, $default_settings);
        }

        // Hash the password
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $auth_data = json_encode(['username' => $username, 'password' => $hash]);
        
        // Encrypt and save
        $encrypted = KodeWebEncryption::encrypt($auth_data);
        if (file_put_contents($auth_file, $encrypted) !== false) {
            
            // Create .env
            $env_content = "LOCAL_ENV=" . $is_local . "\n";
            file_put_contents(__DIR__ . '/.env', $env_content);
            
            header("Location: login.php");
            exit;
        } else {
            $message = 'Erro ao salvar o arquivo de autenticação. Verifique as permissões de gravação.';
            $message_type = 'error';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KodeWeb - Instalação</title>
    <link rel="icon" type="image/svg+xml" href="logo.svg">
    <link rel="stylesheet" href="style.css">
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background-color: var(--bg-primary);
        }
        .install-card {
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 30px;
            width: 420px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            text-align: center;
        }
        .install-card img {
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
        }
        .install-card h2 {
            margin-bottom: 8px;
            color: var(--text-primary);
            font-size: 20px;
            font-weight: 500;
        }
        .install-card p {
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 24px;
            line-height: 1.4;
        }
        .form-group {
            text-align: left;
            margin-bottom: 16px;
        }
        .alert-error {
            color: var(--accent-danger);
            background-color: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.2);
            padding: 10px;
            border-radius: 4px;
            font-size: 13px;
            margin-bottom: 16px;
            text-align: center;
        }
        .alert-warning {
            color: #ffc107;
            background-color: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.2);
            padding: 10px;
            border-radius: 4px;
            font-size: 13px;
            margin-bottom: 16px;
            text-align: left;
            line-height: 1.4;
        }
        .btn-full {
            width: 100%;
            padding: 10px;
            font-size: 14px;
            margin-top: 10px;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
        }
        .checkbox-group input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        .checkbox-group label {
            cursor: pointer;
            margin-bottom: 0;
            font-size: 13px;
        }
    </style>
</head>
<body>

    <div class="install-card">
        <img src="logo.svg" alt="KodeWeb Logo">
        <h2>Instalação do KodeWeb</h2>
        <p>Defina suas credenciais de acesso e configure o ambiente inicial.</p>
        
        <?php if ($message && $message_type === 'error'): ?>
            <div class="alert-error"><?= htmlspecialchars($message) ?></div>
        <?php endif; ?>

        <?php if ($is_installed): ?>
            <div class="alert-warning">
                <strong>Atenção:</strong> O KodeWeb já está instalado neste servidor. 
                Ao prosseguir e salvar, você estará sobrescrevendo o usuário e senha de acesso atuais.
            </div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label class="form-label" for="username">Usuário Administrador</label>
                <input type="text" class="form-input" id="username" name="username" required <?= !$is_installed ? 'autofocus' : '' ?>>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="password">Senha de Acesso</label>
                <input type="password" class="form-input" id="password" name="password" required>
            </div>
            
            <div class="form-group checkbox-group">
                <?php
                // Check if .env says LOCAL_ENV=1
                $is_local_checked = false;
                if (file_exists(__DIR__ . '/.env')) {
                    $env = parse_ini_file(__DIR__ . '/.env');
                    if (isset($env['LOCAL_ENV']) && $env['LOCAL_ENV'] == '1') {
                        $is_local_checked = true;
                    }
                }
                ?>
                <input type="checkbox" id="is_local" name="is_local" value="1" <?= $is_local_checked ? 'checked' : '' ?>>
                <label for="is_local">Ambiente Local (Desativa algumas proteções de produção)</label>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">
                <?= $is_installed ? 'Atualizar Credenciais' : 'Instalar e Concluir' ?>
            </button>
            
            <?php if ($is_installed): ?>
                <div style="margin-top: 15px;">
                    <a href="login.php" style="color: var(--text-muted); font-size: 12px; text-decoration: none;">Voltar para o Login</a>
                </div>
            <?php endif; ?>
        </form>
    </div>

</body>
</html>
