<?php
require_once __DIR__ . '/base.php';

try {
    switch ($action) {
        case 'git_repos':
            $git_dirs = [];
            $patterns = [
                WORKSPACE_ROOT . '/.git',
                WORKSPACE_ROOT . '/*/.git',
                WORKSPACE_ROOT . '/*/*/.git',
                WORKSPACE_ROOT . '/*/*/*/.git'
            ];
            foreach ($patterns as $pattern) {
                $matches = glob($pattern, GLOB_ONLYDIR);
                if ($matches) {
                    foreach ($matches as $dir) {
                        $parent = dirname($dir);
                        $relative = str_replace(WORKSPACE_ROOT, '', $parent);
                        $relative = ltrim(str_replace('\\', '/', $relative), '/');
                        if (empty($relative)) $relative = '/ (Workspace Root)';
                        $git_dirs[] = [
                            'path' => $parent,
                            'name' => $relative
                        ];
                    }
                }
            }
            
            echo json_encode(['success' => true, 'repos' => $git_dirs]);
            break;
            
        case 'git_status':
            $repo = $_POST['repo'] ?? '';
            if (empty($repo) || !is_dir($repo)) throw new Exception("Repositório inválido.");
            
            // Branch
            $branch = trim(shell_exec("cd " . escapeshellarg($repo) . " && git branch --show-current 2>&1"));
            
            // Ahead/Behind count
            $ahead = 0;
            $behind = 0;
            $rev_count = trim(shell_exec("cd " . escapeshellarg($repo) . " && git rev-list --left-right --count \"HEAD...@{u}\" 2>&1"));
            if ($rev_count && preg_match('/^(\d+)\s+(\d+)$/', $rev_count, $matches)) {
                $ahead = (int)$matches[1];
                $behind = (int)$matches[2];
            }
            
            // Status (staged vs unstaged)
            $status_raw = shell_exec("cd " . escapeshellarg($repo) . " && git status --porcelain 2>&1");
            $staged = [];
            $unstaged = [];
            
            if ($status_raw !== null) {
                $lines = explode("\n", rtrim($status_raw));
                foreach ($lines as $line) {
                    if (strlen($line) < 3) continue;
                    $x = substr($line, 0, 1);
                    $y = substr($line, 1, 1);
                    $file = trim(substr($line, 3));
                    
                    // If X is not space/?, it's staged
                    if ($x !== ' ' && $x !== '?') {
                        $staged[] = ['file' => $file, 'status' => $x];
                    }
                    // If Y is not space, it's unstaged (or untracked if ??)
                    if ($y !== ' ' && $y !== '') {
                        if ($x === '?' && $y === '?') {
                            $unstaged[] = ['file' => $file, 'status' => '?'];
                        } else {
                            $unstaged[] = ['file' => $file, 'status' => $y];
                        }
                    }
                }
            }
            
            // Tree
            $tree_raw = shell_exec("cd " . escapeshellarg($repo) . " && git log --graph --oneline --all -n 30 2>&1");
            $tree = [];
            if ($tree_raw) {
                $lines = explode("\n", rtrim($tree_raw));
                foreach($lines as $line) {
                    $tree[] = htmlspecialchars($line);
                }
            }
            
            echo json_encode([
                'success' => true,
                'branch' => $branch,
                'ahead' => $ahead,
                'behind' => $behind,
                'staged' => $staged,
                'unstaged' => $unstaged,
                'tree' => $tree
            ]);
            break;
            
        case 'git_diff':
            $repo = $_POST['repo'] ?? '';
            $file = $_POST['file'] ?? '';
            if (empty($repo) || !is_dir($repo)) throw new Exception("Repositório inválido.");
            
            $output = shell_exec("cd " . escapeshellarg($repo) . " && git diff HEAD -- " . escapeshellarg($file) . " 2>&1");
            
            // Se o output estiver vazio, mas o arquivo existir e for untracked
            if (empty(trim($output)) && file_exists($repo . '/' . $file)) {
                $status = shell_exec("cd " . escapeshellarg($repo) . " && git status --porcelain -- " . escapeshellarg($file) . " 2>&1");
                if (strpos($status, '??') !== false) {
                    // É um arquivo novo (untracked). Vamos fazer um diff entre nada e o arquivo
                    $output = shell_exec("cd " . escapeshellarg($repo) . " && git diff /dev/null " . escapeshellarg($file) . " 2>&1");
                }
            }
            
            echo json_encode(['success' => true, 'output' => $output]);
            break;
            
        case 'git_action':
            $repo = $_POST['repo'] ?? '';
            $git_action = $_POST['git_action'] ?? '';
            $file = $_POST['file'] ?? '';
            $msg = $_POST['message'] ?? '';
            
            if (empty($repo) || !is_dir($repo)) throw new Exception("Repositório inválido.");
            
            $output = "";
            $cmd_base = "cd " . escapeshellarg($repo) . " && ";
            
            if ($git_action === 'stage') {
                $output = shell_exec($cmd_base . "git add " . escapeshellarg($file) . " 2>&1");
            } elseif ($git_action === 'unstage') {
                $output = shell_exec($cmd_base . "git reset HEAD " . escapeshellarg($file) . " 2>&1");
            } elseif ($git_action === 'revert') {
                $output = shell_exec($cmd_base . "git checkout HEAD -- " . escapeshellarg($file) . " 2>&1");
                // If it's untracked, checkout won't work, we might need to rm it, but checkout is safer.
                if (strpos($output, 'error: pathspec') !== false) {
                    $output = shell_exec($cmd_base . "git clean -f -- " . escapeshellarg($file) . " 2>&1");
                }
            } elseif ($git_action === 'commit') {
                $output = shell_exec($cmd_base . "git commit -m " . escapeshellarg($msg) . " 2>&1");
            } elseif ($git_action === 'pull') {
                $output = shell_exec($cmd_base . "git pull 2>&1");
            } elseif ($git_action === 'push') {
                $output = shell_exec($cmd_base . "git push 2>&1");
            } else {
                throw new Exception("Ação Git desconhecida.");
            }
            
            echo json_encode(['success' => true, 'output' => $output]);
            break;

        default:
            throw new Exception("Ação desconhecida ou não suportada neste módulo: $action");
    }
} catch (Exception $e) {
    http_response_code(400);
    
    $log_file = $rootDir . '/kodeweb_error.log';
    $log_message = date('Y-m-d H:i:s') . " - Action [{$action}]: " . $e->getMessage() . "\n";
    file_put_contents($log_file, $log_message, FILE_APPEND);
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
