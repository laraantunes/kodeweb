// --- Git Explorer Logic ---

function openGitExplorer() {
    const path = 'git_explorer';
    const name = '🌿 Git Integrado';
    
    if (!state.openTabs[path]) {
        state.openTabs[path] = {
            path: path,
            name: name,
            isSpecial: true
        };
        createTabUI(path, name);
    }
    activateTab(path);
}

// Bind button
document.addEventListener('DOMContentLoaded', () => {
    const gitBtn = document.getElementById('git-btn');
    if (gitBtn) {
        gitBtn.addEventListener('click', () => {
            openGitExplorer();
        });
    }
    
    // Git select change
    const repoSelect = document.getElementById('git-repo-select');
    if (repoSelect) {
        repoSelect.addEventListener('change', () => {
            if (repoSelect.value) {
                loadGitStatus(repoSelect.value);
            } else {
                document.getElementById('git-current-branch').style.display = 'none';
                document.getElementById('git-sync-status').style.display = 'none';
                document.getElementById('git-log-output').textContent = '';
                document.getElementById('git-staged-files').innerHTML = '';
                document.getElementById('git-unstaged-files').innerHTML = '';
            }
        });
    }
    
    // Git buttons
    if (document.getElementById('git-refresh-btn')) document.getElementById('git-refresh-btn').addEventListener('click', () => {
        const repo = document.getElementById('git-repo-select').value;
        if (repo) loadGitStatus(repo);
    });
    
    if (document.getElementById('git-commit-btn')) document.getElementById('git-commit-btn').addEventListener('click', async () => {
        const repo = document.getElementById('git-repo-select').value;
        const msg = document.getElementById('git-commit-msg').value;
        if (!repo) return showToast('Selecione um repositório.', 'warning');
        if (!msg) return showToast('Digite uma mensagem de commit.', 'warning');
        
        await executeGitAction(repo, 'commit', null, msg);
        document.getElementById('git-commit-msg').value = '';
    });
    
    if (document.getElementById('git-pull-btn')) document.getElementById('git-pull-btn').addEventListener('click', () => {
        const repo = document.getElementById('git-repo-select').value;
        if (repo) executeGitAction(repo, 'pull');
    });
    
    if (document.getElementById('git-push-btn')) document.getElementById('git-push-btn').addEventListener('click', () => {
        const repo = document.getElementById('git-repo-select').value;
        if (repo) executeGitAction(repo, 'push');
    });
});

async function loadGitRepositories() {
    try {
        const res = await fetch(getApiUrl('git_repos') + '?action=git_repos');
        const data = await res.json();
        if (data.success) {
            const select = document.getElementById('git-repo-select');
            select.innerHTML = '<option value="">Selecione um repositório...</option>';
            data.repos.forEach(repo => {
                const opt = document.createElement('option');
                opt.value = repo.path;
                opt.textContent = repo.name;
                select.appendChild(opt);
            });
            // Auto select if only one
            if (data.repos.length === 1) {
                select.value = data.repos[0].path;
                loadGitStatus(data.repos[0].path);
            }
        }
    } catch (e) {
        console.error("Erro ao carregar repositórios git", e);
    }
}

async function loadGitStatus(repoPath) {
    const branchEl = document.getElementById('git-current-branch');
    const syncStatusEl = document.getElementById('git-sync-status');
    const logEl = document.getElementById('git-log-output');
    const stagedEl = document.getElementById('git-staged-files');
    const unstagedEl = document.getElementById('git-unstaged-files');
    
    branchEl.textContent = 'Carregando...';
    syncStatusEl.textContent = '';
    stagedEl.innerHTML = '';
    unstagedEl.innerHTML = '';
    
    try {
        const formData = new FormData();
        formData.append('action', 'git_status');
        formData.append('repo', repoPath);
        
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            branchEl.style.display = 'inline-block';
            syncStatusEl.style.display = 'inline-block';
            branchEl.textContent = data.branch;
            
            let syncText = [];
            if (data.ahead > 0) syncText.push(`⬆️ ${data.ahead} (Ahead)`);
            if (data.behind > 0) syncText.push(`⬇️ ${data.behind} (Behind)`);
            syncStatusEl.textContent = syncText.length > 0 ? `[${syncText.join(' ')}]` : '✔️ Sincronizado';
            
            logEl.textContent = data.tree.join('\n');
            
            // Render Unstaged
            if (data.unstaged.length === 0) {
                unstagedEl.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 12px;">Nenhuma alteração</div>';
            } else {
                data.unstaged.forEach(f => {
                    const div = document.createElement('div');
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';
                    div.style.padding = '4px 8px';
                    div.style.borderBottom = '1px solid var(--border-color)';
                    div.style.fontSize = '12px';
                    
                    const label = document.createElement('span');
                    let statusColor = f.status === '?' ? 'var(--accent-primary)' : 'var(--accent-warning)';
                    label.innerHTML = `<span style="color:${statusColor}; font-weight:bold; margin-right:5px;">${f.status}</span> ${f.file}`;
                    
                    const actions = document.createElement('div');
                    const btnAdd = document.createElement('button');
                    btnAdd.className = 'btn btn-sm btn-primary';
                    btnAdd.innerHTML = '➕';
                    btnAdd.title = 'Stage file';
                    btnAdd.onclick = () => executeGitAction(repoPath, 'stage', f.file);
                    
                    const btnRev = document.createElement('button');
                    btnRev.className = 'btn btn-sm';
                    btnRev.innerHTML = '↩️';
                    btnRev.title = 'Revert changes';
                    btnRev.style.marginLeft = '5px';
                    btnRev.onclick = () => {
                        showConfirm('Tem certeza que deseja reverter ' + f.file + '?', () => {
                            executeGitAction(repoPath, 'revert', f.file);
                        });
                    };
                    
                    const btnDiff = document.createElement('button');
                    btnDiff.className = 'btn btn-sm';
                    btnDiff.innerHTML = '👁️';
                    btnDiff.title = 'View diff';
                    btnDiff.style.marginLeft = '5px';
                    btnDiff.onclick = () => openGitDiff(repoPath, f.file);
                    
                    actions.appendChild(btnAdd);
                    actions.appendChild(btnRev);
                    actions.appendChild(btnDiff);
                    div.appendChild(label);
                    div.appendChild(actions);
                    unstagedEl.appendChild(div);
                });
            }
            
            // Render Staged
            if (data.staged.length === 0) {
                stagedEl.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 12px;">Nenhum arquivo no stage</div>';
            } else {
                data.staged.forEach(f => {
                    const div = document.createElement('div');
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';
                    div.style.padding = '4px 8px';
                    div.style.borderBottom = '1px solid var(--border-color)';
                    div.style.fontSize = '12px';
                    
                    const label = document.createElement('span');
                    label.innerHTML = `<span style="color:var(--accent-success); font-weight:bold; margin-right:5px;">${f.status}</span> ${f.file}`;
                    
                    const btnRem = document.createElement('button');
                    btnRem.className = 'btn btn-sm';
                    btnRem.innerHTML = '➖';
                    btnRem.title = 'Unstage file';
                    btnRem.onclick = () => executeGitAction(repoPath, 'unstage', f.file);
                    
                    const btnDiff = document.createElement('button');
                    btnDiff.className = 'btn btn-sm';
                    btnDiff.innerHTML = '👁️';
                    btnDiff.title = 'View diff';
                    btnDiff.style.marginLeft = '5px';
                    btnDiff.onclick = () => openGitDiff(repoPath, f.file);
                    
                    const actions = document.createElement('div');
                    actions.appendChild(btnRem);
                    actions.appendChild(btnDiff);
                    
                    div.appendChild(label);
                    div.appendChild(actions);
                    stagedEl.appendChild(div);
                });
            }
        }
    } catch (e) {
        console.error("Erro status git", e);
        branchEl.textContent = 'Erro';
    }
}

async function openGitDiff(repoPath, file) {
    try {
        const formData = new FormData();
        formData.append('action', 'git_diff');
        formData.append('repo', repoPath);
        formData.append('file', file);
        
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            let output = data.output;
            if (!output || output.trim() === '') {
                output = "(Não há mudanças ou é um arquivo binário/novo sem diff)";
            }
            
            const tabName = `[Diff] ${file}`;
            const path = `git_diff_${Date.now()}`;
            
            const mode = getAceMode('diff');
            const session = ace.createEditSession(output, mode);
            session.setUndoManager(new ace.UndoManager());
            
            state.openTabs[path] = {
                path: path,
                name: tabName,
                session: session,
                isImage: false,
                isPdf: false,
                isDirty: false,
                isLocal: true // Evita carregar do servidor
            };
            
            createTabUI(path, tabName);
            activateTab(path);
        } else {
            showToast(data.message || "Erro ao carregar diff", "error");
        }
    } catch (e) {
        showToast("Erro de rede.", "error");
    }
}

async function executeGitAction(repoPath, action, file = null, message = null) {
    try {
        const formData = new FormData();
        formData.append('action', 'git_action');
        formData.append('repo', repoPath);
        formData.append('git_action', action);
        if (file) formData.append('file', file);
        if (message) formData.append('message', message);
        
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            if (action === 'commit' || action === 'pull' || action === 'push') {
                showToast("Comando Git executado com sucesso.", "success");
            }
            loadGitStatus(repoPath);
        } else {
            showToast(data.message || "Erro no comando git", "error");
        }
    } catch (e) {
        showToast("Erro de rede.", "error");
    }
}
// --- Options Modal Functions ---

function openOptionsModal() {
    switchOptionsTab('conn');
    document.getElementById('modal-options').classList.add('active');
}

function switchOptionsTab(tab) {
    const tabs = ['conn', 'env', 'user', 'about'];
    tabs.forEach(t => {
        const btn = document.getElementById(`options-tab-${t}-btn`);
        const view = document.getElementById(`options-${t}-view`);
        if (btn) btn.classList.toggle('active', t === tab);
        if (view) {
            if (t === tab) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        }
    });
}

async function saveOptionsEnv(event) {
    event.preventDefault();
    const isLocal = document.getElementById('options-env-local').checked;
    
    try {
        const formData = new FormData();
        formData.append('action', 'update_env');
        formData.append('local_env', isLocal);
        
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        
        const data = await response.json();
        if (data.success) {
            state.localEnv = isLocal;
            showToast("Ambiente atualizado com sucesso. A página será recarregada.", "success");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast("Erro: " + (data.message || data.error), "error");
        }
    } catch (err) {
        showToast("Erro ao atualizar ambiente.", "error");
    }
}

async function saveOptionsUser(event) {
    event.preventDefault();
    const username = document.getElementById('options-username').value;
    const password = document.getElementById('options-password').value;
    
    if (!username) {
        showToast("O nome de usuário é obrigatório.", "warning");
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'update_user');
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        
        const data = await response.json();
        if (data.success) {
            showToast("Usuário atualizado com sucesso. Faça login novamente.", "success");
            closeModal('modal-options');
            setTimeout(() => window.location.href = 'logout.php', 1500);
        } else {
            showToast("Erro: " + (data.message || data.error), "error");
        }
    } catch (err) {
        showToast("Erro ao atualizar usuário.", "error");
    }
}

function updateKodeWeb(btn) {
    showConfirm("Tem certeza que deseja atualizar a aplicação? Isso executará 'git pull origin main'.", async () => {
        const originalText = btn.innerText;
        btn.innerText = "Atualizando...";
        btn.disabled = true;
        
        try {
            const response = await fetch(getApiUrl('update_kodeweb') + '?action=update_kodeweb');
            const data = await response.json();
            
            if (data.success) {
                showToast("Aplicação atualizada com sucesso! Recarregando...", "success");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast("Erro ao atualizar: " + (data.message || data.error), "error");
                btn.innerText = originalText;
                btn.disabled = false;
                
                if (data.output) {
                    console.error("Git output:", data.output);
                }
            }
        } catch (err) {
            showToast("Erro de rede ao atualizar a aplicação.", "error");
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}