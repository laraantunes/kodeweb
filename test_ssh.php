<?php
require 'vendor/autoload.php';
$ssh = new \phpseclib3\Net\SSH2('localhost');
var_dump(method_exists($ssh, 'enablePTY'));
var_dump(method_exists($ssh, 'read'));
var_dump(method_exists($ssh, 'write'));
