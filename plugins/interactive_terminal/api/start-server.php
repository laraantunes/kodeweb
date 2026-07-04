<?php
header('Content-Type: application/json');

$port = 8080;
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
    // Linux auto-start background process with logging to find out why it's crashing
    $logFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'server_error.log';
    $cmd = 'nohup ' . escapeshellarg($php_bin) . ' ' . escapeshellarg($serverScript) . ' > ' . escapeshellarg($logFile) . ' 2>&1 &';
    shell_exec($cmd);
}

// Give it a moment to start
usleep(500000); // 0.5s

echo json_encode(['success' => true, 'message' => 'Server started.']);
