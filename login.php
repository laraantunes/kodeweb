<?php
// login.php

ini_set('session.gc_maxlifetime', 86400); // 24 hours
session_set_cookie_params(86400);
session_start();

$auth_file = __DIR__ . '/data/auth.enc';

if (!file_exists($auth_file)) {
    header("Location: install.php");
    exit;
}

if (!empty($_SESSION['logged_in'])) {
    header("Location: index.php");
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once 'encryption.php';
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error = 'Por favor, preencha todos os campos.';
    } else {
        $encData = file_get_contents($auth_file);
        $decData = KodeWebEncryption::decrypt($encData);
        if ($decData) {
            $authData = json_decode($decData, true);
            if ($authData && $username === $authData['username'] && password_verify($password, $authData['password'])) {
                $_SESSION['logged_in'] = true;
                header("Location: index.php");
                exit;
            } else {
                $error = 'Usuário ou senha incorretos.';
            }
        } else {
            $error = 'Erro ao ler o arquivo de autenticação.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KodeWeb - Login</title>
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
        .login-card {
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 30px;
            width: 380px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            text-align: center;
        }
        .login-card img {
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
        }
        .login-card h2 {
            margin-bottom: 24px;
            color: var(--text-primary);
            font-size: 20px;
            font-weight: 500;
        }
        .form-group {
            text-align: left;
            margin-bottom: 16px;
        }
        .error-message {
            color: var(--accent-danger);
            font-size: 13px;
            margin-bottom: 16px;
            text-align: center;
        }
        .btn-full {
            width: 100%;
            padding: 10px;
            font-size: 14px;
        }
    </style>
</head>
<body>

    <div class="login-card">
        <img src="logo.svg" alt="KodeWeb Logo">
        <h2>KodeWeb IDE</h2>
        
        <?php if ($error): ?>
            <div class="error-message"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" action="">
            <div class="form-group">
                <label class="form-label" for="username">Usuário</label>
                <input type="text" class="form-input" id="username" name="username" required autofocus>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="password">Senha</label>
                <input type="password" class="form-input" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">Entrar</button>
        </form>
    </div>

</body>
</html>
