<?php
$descriptorspec = [
   0 => ["pipe", "r"],
   1 => ["pipe", "w"],
   2 => ["pipe", "w"]
];
$process = proc_open('cmd.exe', $descriptorspec, $pipes, __DIR__, null, ['bypass_shell' => true]);
if (is_resource($process)) {
    stream_set_blocking($pipes[1], true); // MUST BE TRUE for timeout to work
    stream_set_timeout($pipes[1], 0, 10000); // 10ms timeout
    
    // first read
    fread($pipes[1], 8192);
    
    // second read when empty
    $start = microtime(true);
    $out = fread($pipes[1], 8192);
    $end = microtime(true);
    
    var_dump($out);
    var_dump($end - $start);
    proc_close($process);
}
