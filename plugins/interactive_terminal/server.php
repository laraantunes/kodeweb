<?php
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Loop;

require dirname(dirname(__DIR__)) . '/vendor/autoload.php';

class TerminalServer implements MessageComponentInterface {
    protected $clients;
    protected $processes;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->processes = [];
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        $this->processes[$conn->resourceId] = [];
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (isset($data['type']) && $data['type'] === 'start') {
            
            // Check for SSH Connection
            if (isset($data['connection_id']) && !empty($data['connection_id'])) {
                $connId = $data['connection_id'];
                
                require_once dirname(dirname(__DIR__)) . '/encryption.php';
                $rootDir = dirname(dirname(__DIR__));
                $file = $rootDir . '/connections/' . $connId . '.enc';
                
                if (file_exists($file)) {
                    $encData = file_get_contents($file);
                    $decData = KodeWebEncryption::decrypt($encData);
                    if ($decData) {
                        $connInfo = json_decode($decData, true);
                        if ($connInfo && isset($connInfo['host'])) {
                            try {
                                $host = $connInfo['host'];
                                $port = !empty($connInfo['port']) ? (int)$connInfo['port'] : 22;
                                $username = $connInfo['username'];
                                $password = $connInfo['password'] ?? '';
                                
                                $from->send(json_encode(['type' => 'status', 'message' => "Conectando ao servidor SSH $username@$host:$port ..."]));
                                
                                $ssh = new \phpseclib3\Net\SSH2($host, $port);
                                if ($ssh->login($username, $password)) {
                                    $from->send(json_encode(['type' => 'output', 'data' => "\r\n\x1b[32mSSH conectado com sucesso!\x1b[0m\r\n"]));
                                    
                                    // Allocate PTY and set up interactive read
                                    $ssh->enablePTY();
                                    $ssh->openShell(); // Open shell synchronously with default timeout
                                    $ssh->setTimeout(0.01); // 10ms non-blocking polling for ReactPHP
                                    
                                    $this->processes[$from->resourceId] = [
                                        'is_ssh' => true,
                                        'ssh' => $ssh
                                    ];
                                    
                                    // Timer to poll SSH for output
                                    $loop = Loop::get();
                                    $timer = $loop->addPeriodicTimer(0.05, function () use ($ssh, $from) {
                                        try {
                                            $out = $ssh->read('', \phpseclib3\Net\SSH2::READ_NEXT);
                                            if (is_string($out) && $out !== '') {
                                                $from->send(json_encode(['type' => 'output', 'data' => mb_convert_encoding($out, 'UTF-8', 'UTF-8')], JSON_INVALID_UTF8_SUBSTITUTE));
                                            } elseif ($out === true && !$ssh->isTimeout()) {
                                                // If it's true and NOT a timeout, it means the channel closed
                                                $from->send(json_encode(['type' => 'status', 'message' => 'SSH connection closed by server.']));
                                                Loop::get()->cancelTimer($timer);
                                            }
                                        } catch (\Exception $e) {
                                            $from->send(json_encode(['type' => 'error', 'message' => 'SSH Error: ' . $e->getMessage()]));
                                        }
                                    });
                                    $this->processes[$from->resourceId]['timer'] = $timer;
                                    
                                    return;
                                } else {
                                    $from->send(json_encode(['type' => 'error', 'message' => 'Falha de autenticação SSH. Verifique o usuário e senha.']));
                                    return;
                                }
                            } catch (\Exception $e) {
                                $from->send(json_encode(['type' => 'error', 'message' => 'Erro SSH: ' . $e->getMessage()]));
                                return;
                            }
                        }
                    }
                }
                $from->send(json_encode(['type' => 'error', 'message' => 'Conexão SSH não encontrada ou inválida.']));
                return;
            }
            
            $is_win = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
            $cwd = dirname(dirname(dirname(__DIR__)));

            if ($is_win) {
                $this->processes[$from->resourceId] = [
                    'is_simulated' => true,
                    'cwd' => $cwd,
                    'buffer' => ''
                ];
                $prompt = "\r\n$cwd> ";
                $welcome = "Microsoft Windows\r\n(c) Microsoft Corporation. Todos os direitos reservados.\r\n" . $prompt;
                $from->send(json_encode(['type' => 'output', 'data' => $welcome]));
                $from->send(json_encode(['type' => 'status', 'message' => 'Terminal iniciado (Modo Simulado).']));
            } else {
                $cmd = 'bash';
                
                $descriptorspec = array(
                   0 => array("pipe", "r"),
                   1 => array("pipe", "w"),
                   2 => array("pipe", "w")
                );
                
                $process = proc_open($cmd, $descriptorspec, $pipes, $cwd, null, ['bypass_shell' => true]);
                
                if (is_resource($process)) {
                    stream_set_blocking($pipes[1], false);
                    stream_set_blocking($pipes[2], false);
                    
                    $this->processes[$from->resourceId] = [
                        'process' => $process,
                        'pipes' => $pipes
                    ];

                    $loop = Loop::get();
                    
                    $loop->addReadStream($pipes[1], function ($pipe) use ($from) {
                        $out = fread($pipe, 8192);
                        if ($out !== false && $out !== '') {
                            $from->send(json_encode(['type' => 'output', 'data' => mb_convert_encoding($out, 'UTF-8', 'ISO-8859-1')], JSON_INVALID_UTF8_SUBSTITUTE));
                        }
                    });

                    $loop->addReadStream($pipes[2], function ($pipe) use ($from) {
                        $out = fread($pipe, 8192);
                        if ($out !== false && $out !== '') {
                            $from->send(json_encode(['type' => 'output', 'data' => mb_convert_encoding($out, 'UTF-8', 'ISO-8859-1')], JSON_INVALID_UTF8_SUBSTITUTE));
                        }
                    });
                    
                    $from->send(json_encode(['type' => 'status', 'message' => 'Terminal iniciado.']));
                } else {
                    $from->send(json_encode(['type' => 'error', 'message' => 'Falha ao iniciar o terminal.']));
                }
            }
        } elseif (isset($data['type']) && $data['type'] === 'input') {
            if (isset($this->processes[$from->resourceId]['is_ssh'])) {
                $ssh = $this->processes[$from->resourceId]['ssh'];
                $ssh->write($data['input']);
                return;
            } elseif (isset($this->processes[$from->resourceId]['is_simulated'])) {
                $char = $data['input'];
                if (!isset($this->processes[$from->resourceId]['buffer'])) {
                    $this->processes[$from->resourceId]['buffer'] = '';
                }
                
                if ($char === "\r") {
                    $input = trim($this->processes[$from->resourceId]['buffer']);
                    $this->processes[$from->resourceId]['buffer'] = '';
                    $cwd = $this->processes[$from->resourceId]['cwd'];
                    
                    if ($input === '') {
                        $from->send(json_encode(['type' => 'output', 'data' => "\r\n$cwd> "]));
                        return;
                    }
                    
                    // echo the newline
                    $from->send(json_encode(['type' => 'output', 'data' => "\r\n"]));
                    
                    // handle cd
                    if (preg_match('/^cd\s+(.+)$/i', $input, $matches)) {
                        $new_dir = trim($matches[1]);
                        if ($new_dir === '..') {
                            $cwd = dirname($cwd);
                        } elseif (realpath($cwd . DIRECTORY_SEPARATOR . $new_dir)) {
                            $cwd = realpath($cwd . DIRECTORY_SEPARATOR . $new_dir);
                        } elseif (realpath($new_dir)) {
                            $cwd = realpath($new_dir);
                        }
                        $this->processes[$from->resourceId]['cwd'] = $cwd;
                        $from->send(json_encode(['type' => 'output', 'data' => "\r\n$cwd> "]));
                        return;
                    }
                    
                    // Execute with UTF-8 codepage forced
                    $cmd = "chcp 65001 >nul && cd /d " . escapeshellarg($cwd) . " && " . $input . " 2>&1";
                    $out = shell_exec($cmd);
                    
                    // Normalize newlines to \r\n to prevent the staircase effect in xterm.js
                    $out = str_replace("\r\n", "\n", $out);
                    $out = str_replace("\n", "\r\n", $out);
                    
                    $prompt = "\r\n$cwd> ";
                    // Since we forced chcp 65001, the output is already UTF-8. 
                    // We just use 'UTF-8' as the source encoding to clean any invalid bytes.
                    $from->send(json_encode(['type' => 'output', 'data' => mb_convert_encoding($out . $prompt, 'UTF-8', 'UTF-8')], JSON_INVALID_UTF8_SUBSTITUTE));
                } elseif ($char === "\x7f" || $char === "\x08") { // Backspace
                    if (strlen($this->processes[$from->resourceId]['buffer']) > 0) {
                        $this->processes[$from->resourceId]['buffer'] = substr($this->processes[$from->resourceId]['buffer'], 0, -1);
                        // Send backspace sequence to terminal to erase character
                        $from->send(json_encode(['type' => 'output', 'data' => "\x08 \x08"]));
                    }
                } else {
                    $this->processes[$from->resourceId]['buffer'] .= $char;
                    // Echo character back to terminal
                    $from->send(json_encode(['type' => 'output', 'data' => mb_convert_encoding($char, 'UTF-8', 'ISO-8859-1')], JSON_INVALID_UTF8_SUBSTITUTE));
                }
            } elseif (isset($this->processes[$from->resourceId]['pipes'])) {
                fwrite($this->processes[$from->resourceId]['pipes'][0], $data['input']);
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        $this->cleanupProcess($conn->resourceId);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
        $this->cleanupProcess($conn->resourceId);
    }

    private function cleanupProcess($id) {
        if (isset($this->processes[$id])) {
            $loop = Loop::get();
            if (isset($this->processes[$id]['timer'])) {
                $loop->cancelTimer($this->processes[$id]['timer']);
            }
            if (isset($this->processes[$id]['is_ssh'])) {
                if (isset($this->processes[$id]['ssh'])) {
                    $this->processes[$id]['ssh']->disconnect();
                }
            } elseif (isset($this->processes[$id]['pipes'])) {
                $is_win = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
                if (!$is_win) {
                    $loop->removeReadStream($this->processes[$id]['pipes'][1]);
                    $loop->removeReadStream($this->processes[$id]['pipes'][2]);
                }
                fclose($this->processes[$id]['pipes'][0]);
                fclose($this->processes[$id]['pipes'][1]);
                fclose($this->processes[$id]['pipes'][2]);
            }
            if (isset($this->processes[$id]['process'])) {
                proc_close($this->processes[$id]['process']);
            }
        }
        unset($this->processes[$id]);
    }
}

$port = 28420;
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new TerminalServer()
        )
    ),
    $port
);

echo "Terminal WebSocket Server running on port {$port}\n";
$server->run();
