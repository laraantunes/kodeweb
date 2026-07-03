<?php
$php_bin = defined('PHP_BINARY') && PHP_BINARY ? PHP_BINARY : 'php';
$serverScript = 'D:\Lara\xampp8.2\htdocs\kodeweb\plugins\interactive_terminal\server.php';

echo "Method 1: start /B\n";
$cmd1 = 'start /B "Terminal" ' . escapeshellarg($php_bin) . ' -f ' . escapeshellarg($serverScript);
pclose(popen($cmd1, 'r'));
echo "Command 1: " . $cmd1 . "\n";

echo "Method 2: WScript (fallback if COM missing)\n";
$vbs = sys_get_temp_dir() . '\\start_hidden.vbs';
file_put_contents($vbs, 'Set objShell = WScript.CreateObject("WScript.Shell")' . "\r\n" . 'objShell.Run """' . $php_bin . '"" -f ""' . $serverScript . '""", 0, False');
pclose(popen('cscript.exe //nologo ' . escapeshellarg($vbs), 'r'));
