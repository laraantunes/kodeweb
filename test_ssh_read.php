<?php
require 'vendor/autoload.php';
$ssh = new \phpseclib3\Net\SSH2('localhost');
var_dump($ssh->login('test', 'test')); // We don't have valid credentials but let's see if we can get a shell. Wait, without credentials we can't test.
