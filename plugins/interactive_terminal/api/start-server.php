<?php
header('Content-Type: application/json');

$port = 28420;
$host = '127.0.0.1';

// Check if port is open
$connection = @fsockopen($host, $port, $errno, $errstr, 1);

if (is_resource($connection)) {
    fclose($connection);
    echo json_encode(['success' => true, 'message' => 'Server is already running.']);
    exit;
}

$serverScript = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'server.php';

$is_win = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';

// Força o uso do php CLI puro na hospedagem em vez do php-fpm/lsphp web
$php_bin = 'php';
if (defined('PHP_BINARY') && strpos(strtolower(PHP_BINARY), 'lsphp') === false && strpos(strtolower(PHP_BINARY), 'php-fpm') === false) {
    $php_bin = PHP_BINARY;
}

if ($is_win) {
    // Escapar do Job Object do Apache usando PowerShell Start-Process
    $psCommand = "Start-Process -FilePath '" . $php_bin . "' -ArgumentList '-f', '" . $serverScript . "' -WindowStyle Hidden";
    pclose(popen('powershell.exe -WindowStyle Hidden -Command "' . $psCommand . '"', 'r'));
} else {
    // Check if shell_exec is available
    $disabled = explode(',', ini_get('disable_functions'));
    $disabled = array_map('trim', $disabled);
    
    if (in_array('shell_exec', $disabled)) {
        echo json_encode(['success' => false, 'message' => 'A hospedagem bloqueia a função shell_exec. O terminal interativo não pode ser iniciado.']);
        exit;
    }

    $logFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'server_error.log';
    
    // Check if we can write to the directory
    if (!is_writable(dirname(__DIR__))) {
        echo json_encode(['success' => false, 'message' => 'Sem permissão de escrita para gerar log.']);
        exit;
    }
    
    $cmd = 'nohup ' . escapeshellarg($php_bin) . ' ' . escapeshellarg($serverScript) . ' > ' . escapeshellarg($logFile) . ' 2>&1 & echo $!';
    $pid = shell_exec($cmd);
    
    if (empty(trim($pid))) {
        echo json_encode(['success' => false, 'message' => 'shell_exec rodou mas não conseguiu iniciar o processo em background. Verifique se nohup está disponível.']);
        exit;
    }
}

// Give it a moment to start
usleep(500000); // 0.5s

echo json_encode([
    'success' => true, 
    'message' => 'Tentativa de iniciar finalizada.',
    'pid' => isset($pid) ? trim($pid) : null,
    'php_bin' => $php_bin,
    'cmd' => isset($cmd) ? $cmd : null
]);
