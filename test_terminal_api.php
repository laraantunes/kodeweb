<?php
$_POST['action'] = 'terminal_cmd';
$_POST['cmd'] = 'dir';
$_POST['terminal_id'] = 'term-1';

// Bypass auth by setting session before including api.php
session_start();
$_SESSION['kodeweb_auth'] = true;
$_SESSION['user_id'] = 1;

// Capture output
ob_start();
require 'api.php';
$output = ob_get_clean();

file_put_contents('test_api_output.txt', $output);
echo "Output saved.";
