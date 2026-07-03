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

$php_bin = defined('PHP_BINARY') && PHP_BINARY ? PHP_BINARY : 'php';

if ($is_win) {
    // Escapar do Job Object do Apache usando PowerShell Start-Process
    $psCommand = "Start-Process -FilePath '" . $php_bin . "' -ArgumentList '-f', '" . $serverScript . "' -WindowStyle Hidden";
    pclose(popen('powershell.exe -WindowStyle Hidden -Command "' . $psCommand . '"', 'r'));
} else {
    // Linux auto-start background process
    shell_exec('nohup ' . escapeshellarg($php_bin) . ' ' . escapeshellarg($serverScript) . ' > /dev/null 2>&1 &');
}

// Give it a moment to start
usleep(500000); // 0.5s

echo json_encode(['success' => true, 'message' => 'Server started.']);
