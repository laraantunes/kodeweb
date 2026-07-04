// 7. Terminal Operations
function updateTerminalPrompt(cwd, termId = null) {
    termId = termId || state.activeTerminalId;
    if (!state.terminals[termId]) return;
    state.terminals[termId].cwd = cwd;
    
    if (termId === state.activeTerminalId) {
        const shortCwd = cwd.replace(state.workspaceRoot, 'Workspace');
        const username = state.username || 'user';
        document.getElementById('terminal-prompt-path').textContent = `${username}@kodeweb:${shortCwd}$`;
    }
}

function writeToTerminalConsole(text, type = 'output', termId = null) {
    termId = termId || state.activeTerminalId;
    if (!state.terminals[termId]) return;
    
    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    if (type === 'cmd') {
        const prefix = document.createElement('span');
        prefix.className = 'terminal-prompt-prefix';
        prefix.textContent = text.prefix;
        
        const cmdText = document.createTextNode(` ${text.cmd}`);
        line.appendChild(prefix);
        line.appendChild(cmdText);
    } else {
        line.textContent = text;
        if (type === 'error') line.style.color = 'var(--accent-error)';
    }
    
    state.terminals[termId].outputHTML += line.outerHTML;
    
    if (termId === state.activeTerminalId) {
        const consoleDiv = document.getElementById('terminal-console');
        consoleDiv.appendChild(line);
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
}

async function executeTerminalCommand(cmd, termId = null) {
    try {
        termId = termId || state.activeTerminalId;
        const term = state.terminals[termId];
        if (!term) return;
        
        cmd = cmd.trim();
        if (!cmd) return;
        
        if (term.reconnect) return;
        
        term.history.push(cmd);
        term.historyIndex = term.history.length;
        saveTerminalState();
        
        const cwd = term.cwd || '';
        const wsRoot = state.workspaceRoot || '';
        const shortCwd = cwd.replace(wsRoot, 'Workspace');
        const username = state.username || 'user';
        const promptPath = term.type === 'ssh' ? `ssh@kodeweb:${cwd}$` : `${username}@kodeweb:${shortCwd}$`;
        
        writeToTerminalConsole({ prefix: promptPath, cmd: cmd }, 'cmd', termId);
    
    if (cmd === 'clear' || cmd === 'cls') {
        term.outputHTML = '';
        if (termId === state.activeTerminalId) {
            document.getElementById('terminal-console').innerHTML = '';
        }
        return;
    }
    
    const formData = new FormData();
    if (term.type === 'ssh') {
        formData.append('action', 'ssh_terminal_cmd');
        formData.append('connection_id', term.connId);
    } else {
        formData.append('action', 'terminal_cmd');
    }
    formData.append('cmd', cmd);
    formData.append('terminal_id', termId);
    
    try {
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.success) {
            if (data.output) writeToTerminalConsole(data.output, 'output', termId);
            updateTerminalPrompt(data.cwd, termId);
            if (data.autocomplete_list) {
                state.terminals[termId].autocompleteList = data.autocomplete_list;
            }
        } else {
            writeToTerminalConsole(data.message || 'Erro desconhecido.', 'error', termId);
        }
    } catch (err) {
        writeToTerminalConsole("Falha de conexão com o servidor: " + err.message, 'error', termId);
        console.error("API error in terminal:", err);
    }
    } catch (criticalErr) {
        console.error("Critical error in executeTerminalCommand:", criticalErr);
        alert("Erro no terminal: " + criticalErr.message);
    }
}


// 9. Multiple Terminals Management
function createTerminalTab(cwd = '', type = 'local', connId = null, reconnect = false) {
    state.terminalCounter++;
    const termId = 'term-' + state.terminalCounter;
    
    let name = 'Terminal ' + state.terminalCounter;
    if (type === 'ssh') name = '🔒 SSH ' + state.terminalCounter;
    
    state.terminals[termId] = {
        id: termId,
        name: name,
        cwd: cwd || (type === 'local' ? state.workspaceRoot : '') || '',
        history: [],
        historyIndex: -1,
        autocompleteList: [],
        type: type,
        connId: connId,
        reconnect: reconnect,
        outputHTML: '<div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator - Inicializado.</div>'
    };
    
    saveTerminalState();
    
    // Add to UI
    renderTerminalTabs();
    activateTerminalTab(termId);
    
    // Initialize
    if (type === 'ssh') {
        if (reconnect) {
            state.terminals[termId].outputHTML += `<br><div style="color:var(--accent-error)">Sessão SSH Desconectada.</div><button class="btn btn-sm btn-primary" onclick="reconnectSshTerminal('${termId}')" style="margin-top:10px;">Reconectar</button>`;
            if (state.activeTerminalId === termId) document.getElementById('terminal-console').innerHTML = state.terminals[termId].outputHTML;
        } else {
            executeTerminalCommand('', termId);
        }
    } else {
        executeTerminalCommand('', termId);
    }
}

window.reconnectSshTerminal = function(termId) {
    const term = state.terminals[termId];
    if (term) {
        term.reconnect = false;
        term.outputHTML = '<div class="terminal-line" style="color: var(--text-muted);">Reconectando...</div>';
        if (state.activeTerminalId === termId) document.getElementById('terminal-console').innerHTML = term.outputHTML;
        executeTerminalCommand('', termId);
    }
}

function closeTerminalTab(termId) {
    const keys = Object.keys(state.terminals);
    if (keys.length <= 1) return; // Don't close the last terminal
    
    delete state.terminals[termId];
    
    saveTerminalState();
    if (state.activeTerminalId === termId) {
        const remainingKeys = Object.keys(state.terminals);
        activateTerminalTab(remainingKeys[remainingKeys.length - 1]);
    } else {
        renderTerminalTabs();
    }
}

function activateTerminalTab(termId) {
    if (!state.terminals[termId]) return;
    
    state.activeTerminalId = termId;
    const term = state.terminals[termId];
    
    // Update console
    document.getElementById('terminal-console').innerHTML = term.outputHTML;
    document.getElementById('terminal-console').scrollTop = document.getElementById('terminal-console').scrollHeight;
    
    // Update prompt
    updateTerminalPrompt(term.cwd, termId);
    
    // Render tabs
    renderTerminalTabs();
    
    // Focus input
    document.getElementById('terminal-input').focus();
}

function renderTerminalTabs() {
    const container = document.getElementById('terminal-tabs-container');
    if (!container) return;
    container.innerHTML = '';
    
    Object.values(state.terminals).forEach(term => {
        const tab = document.createElement('div');
        tab.className = 'tab terminal-tab';
        if (term.id === state.activeTerminalId) tab.classList.add('active');
        tab.dataset.id = term.id;
        tab.draggable = true;
        
        tab.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', term.id);
            tab.classList.add('dragging');
            setTimeout(() => tab.style.opacity = '0.5', 0);
        });
        
        tab.addEventListener('dragend', () => {
            tab.classList.remove('dragging');
            tab.style.opacity = '1';
            saveTerminalState();
        });
        
        tab.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingTab = container.querySelector('.dragging');
            if (draggingTab && draggingTab !== tab) {
                const rect = tab.getBoundingClientRect();
                const offset = e.clientX - rect.left - (rect.width / 2);
                if (offset < 0) {
                    container.insertBefore(draggingTab, tab);
                } else {
                    container.insertBefore(draggingTab, tab.nextSibling);
                }
            }
        });
        
        const title = document.createElement('span');
        title.textContent = term.name;
        title.title = "Duplo clique para renomear";
        title.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            showPrompt("Renomear Terminal", "Digite o novo nome:", term.name, (newName) => {
                if (newName && newName.trim()) {
                    term.name = newName.trim();
                    saveTerminalState();
                    renderTerminalTabs();
                }
            });
        });
        tab.appendChild(title);
        
        if (Object.keys(state.terminals).length > 1) {
            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '×';
            closeBtn.style.marginLeft = '4px';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTerminalTab(term.id);
            });
            tab.appendChild(closeBtn);
        }
        
        tab.addEventListener('click', () => {
            activateTerminalTab(term.id);
        });
        
        tab.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle click
                e.preventDefault();
                e.stopPropagation();
                if (Object.keys(state.terminals).length > 1) {
                    closeTerminalTab(term.id);
                }
            }
        });
        
        container.appendChild(tab);
    });
}

// Add event listener for new terminal button
document.addEventListener('DOMContentLoaded', () => {
    const addTermBtn = document.getElementById('btn-add-terminal');
    if (addTermBtn) {
        addTermBtn.addEventListener('click', () => {
            const currentCwd = state.terminals[state.activeTerminalId] && state.terminals[state.activeTerminalId].type === 'local' 
                ? state.terminals[state.activeTerminalId].cwd 
                : '';
            createTerminalTab(currentCwd, 'local');
        });
    }
    
    const addSshTermBtn = document.getElementById('btn-add-ssh-terminal');
    if (addSshTermBtn) {
        addSshTermBtn.addEventListener('click', () => {
            document.getElementById('modal-ssh-connection').classList.add('active');
            switchSshModalTab('list');
        });
    }
    
    const container = document.getElementById('terminal-tabs-container');
    if (container) {
        container.addEventListener('dblclick', (e) => {
            if (e.target === container) {
                const currentCwd = state.terminals[state.activeTerminalId] && state.terminals[state.activeTerminalId].type === 'local' 
                    ? state.terminals[state.activeTerminalId].cwd 
                    : '';
                createTerminalTab(currentCwd, 'local');
            }
        });
    }
    
    const formSsh = document.getElementById("form-ssh-connection");
    if (formSsh) {
        formSsh.addEventListener("submit", (e) => {
            e.preventDefault();
            saveSshConnection();
        });
    }
    
    if (!restoreTerminalState() || Object.keys(state.terminals).length === 0) {
        createTerminalTab();
    }
});

function saveTerminalState() {
    const termState = {
        terminals: {},
        activeTerminalId: state.activeTerminalId,
        terminalCounter: state.terminalCounter
    };
    
    const domTabs = document.querySelectorAll('#terminal-tabs-container .terminal-tab');
    let orderedIds = [];
    if (domTabs.length > 0) {
        domTabs.forEach(t => orderedIds.push(t.dataset.id));
    } else {
        orderedIds = Object.keys(state.terminals);
    }
    
    orderedIds.forEach(id => {
        if (!state.terminals[id]) return;
        const term = state.terminals[id];
        termState.terminals[id] = {
            id: term.id,
            name: term.name,
            cwd: term.cwd,
            history: term.history,
            historyIndex: term.historyIndex,
            type: term.type || 'local',
            connId: term.connId || null,
            reconnect: term.type === 'ssh' ? true : false
        };
    });
    
    try {
        localStorage.setItem('kodeweb_terminals', JSON.stringify(termState));
    } catch(e) {
        console.warn('Could not save terminal state to localStorage', e);
    }
}
function restoreTerminalState() {
    try {
        const saved = localStorage.getItem('kodeweb_terminals');
        if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.terminals && Object.keys(data.terminals).length > 0) {
                state.terminals = {};
                for (const [id, term] of Object.entries(data.terminals)) {
                    state.terminals[id] = {
                        ...term,
                        reconnect: term.type === 'ssh' ? true : false,
                        autocompleteList: [],
                        outputHTML: term.type === 'ssh' 
                            ? '<div class="terminal-line" style="color: var(--text-muted);">Sessão SSH Restaurada.</div><br><div style="color:var(--accent-error)">Sessão Desconectada.</div><button class="btn btn-sm btn-primary" onclick="reconnectSshTerminal(\'' + id + '\')" style="margin-top:10px;">Reconectar</button>'
                            : '<div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator - Restaurado.</div>'
                    };
                }
                state.activeTerminalId = data.activeTerminalId;
                state.terminalCounter = data.terminalCounter;
                
                renderTerminalTabs();
                if (state.activeTerminalId) {
                    activateTerminalTab(state.activeTerminalId);
                }
                return true;
            }
        } catch (e) {
            console.error('Failed to parse terminal state', e);
        }
    }
    } catch(e) {
        console.warn('Could not read terminal state from localStorage', e);
    }
    return false;
}

// SSH Connection Logic
window.switchSshModalTab = function(tabId) {
    const listBtn = document.getElementById("ssh-tab-list-btn");
    const formBtn = document.getElementById("ssh-tab-form-btn");
    const listView = document.getElementById("ssh-modal-list-view");
    const formView = document.getElementById("ssh-modal-form-view");
    
    if (tabId === "list") {
        listBtn.classList.add("active");
        formBtn.classList.remove("active");
        listView.classList.remove("hidden");
        formView.classList.add("hidden");
        loadSshConnections();
    } else {
        formBtn.classList.add("active");
        listBtn.classList.remove("active");
        formView.classList.remove("hidden");
        listView.classList.add("hidden");
    }
}

async function loadSshConnections() {
    const ul = document.getElementById("ssh-connections-list");
    ul.innerHTML = '<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Carregando conexões...</li>';
    
    try {
        const formData = new FormData();
        formData.append("action", "ssh_connections_list");
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message || "Erro");
        
        ul.innerHTML = "";
        if (!data.connections || data.connections.length === 0) {
            ul.innerHTML = '<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Nenhuma conexão salva.</li>';
            return;
        }
        
        data.connections.forEach(conn => {
            const li = document.createElement("li");
            li.style.padding = "10px 15px";
            li.style.borderBottom = "1px solid var(--border-color)";
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            
            li.innerHTML = `
                <div>
                    <div style="font-weight: 500; font-size: 13px;">${escapeHTML(conn.name)}</div>
                    <div class="db-conn-meta">${escapeHTML(conn.username)}@${escapeHTML(conn.host)}:${conn.port || 22}</div>
                </div>
                <div class="db-conn-actions">
                    <button class="action-icon-btn" onclick="openSshTerminal('${conn.id}', '${escapeHTML(conn.name)}')">🖥️ Conectar</button>
                    <button class="action-icon-btn" onclick="if(typeof openSshInteractiveTerminal === 'function') openSshInteractiveTerminal('${conn.id}', '${escapeHTML(conn.name)}')">💻 Interativo</button>
                    <button class="action-icon-btn danger" onclick="deleteSshConnection('${conn.id}')">❌</button>
                </div>
            `;
            ul.appendChild(li);
        });
    } catch (e) {
        ul.innerHTML = '<li style="color:var(--accent-danger); font-size:12px; text-align:center; padding:15px;">Erro ao carregar conexões.</li>';
    }
}

window.openSshTerminal = function(connId, connName) {
    closeModal('modal-ssh-connection');
    createTerminalTab('', 'ssh', connId, false);
}

async function saveSshConnection() {
    const id = document.getElementById("ssh-conn-id").value;
    const name = document.getElementById("ssh-conn-name").value;
    const host = document.getElementById("ssh-host").value;
    const port = document.getElementById("ssh-port").value;
    const username = document.getElementById("ssh-username").value;
    const password = document.getElementById("ssh-password").value;
    
    const formData = new FormData();
    formData.append("action", "ssh_connection_save");
    formData.append("id", id);
    formData.append("name", name);
    formData.append("host", host);
    formData.append("port", port);
    formData.append("username", username);
    formData.append("password", password);
    
    try {
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            showToast("Conexão SSH salva com sucesso", "success");
            document.getElementById("form-ssh-connection").reset();
            document.getElementById("ssh-conn-id").value = "";
            switchSshModalTab("list");
        } else {
            showToast(data.message, "error");
        }
    } catch (e) {
        showToast("Erro ao salvar conexão", "error");
    }
}

window.testSshConnection = async function() {
    const host = document.getElementById("ssh-host").value;
    const port = document.getElementById("ssh-port").value;
    const username = document.getElementById("ssh-username").value;
    const password = document.getElementById("ssh-password").value;
    
    if (!host) {
        showToast("Preencha o Host.", "error");
        return;
    }
    
    const formData = new FormData();
    formData.append("action", "ssh_test_connection");
    formData.append("host", host);
    formData.append("port", port);
    formData.append("username", username);
    formData.append("password", password);
    
    const btn = event.target;
    const oldText = btn.innerHTML;
    btn.innerHTML = "⏳ Testando...";
    btn.disabled = true;
    
    try {
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, "success");
        } else {
            showToast(data.message, "error");
        }
    } catch (e) {
        showToast("Erro de comunicação.", "error");
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

window.deleteSshConnection = function(id) {
    showConfirm("Tem certeza que deseja remover esta conexão SSH?", async () => {
        const formData = new FormData();
        formData.append("action", "ssh_connection_delete");
        formData.append("id", id);
        
        try {
            const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast("Conexão removida.", "success");
                loadSshConnections();
            } else {
                showToast(data.message, "error");
            }
        } catch (e) {
            showToast("Erro de rede.", "error");
        }
    });
}

// --- Options Modal Functions ---

function openOptionsModal() {
    switchOptionsTab('conn');
    document.getElementById('modal-options').classList.add('active');
}

function switchOptionsTab(tab) {
    const tabs = ['conn', 'env', 'editor', 'user', 'plugins', 'about'];
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

    if (tab === 'editor') {
        const themeSelect = document.getElementById('options-editor-theme');
        if (themeSelect && window.EDITOR_THEME) {
            themeSelect.value = window.EDITOR_THEME;
        }
    }
}

async function saveOptionsEditor(event) {
    event.preventDefault();
    const theme = document.getElementById('options-editor-theme').value;
    
    try {
        const formData = new FormData();
        formData.append('action', 'save_editor_theme');
        formData.append('theme', theme);
        
        const response = await fetch(getApiUrl('save_editor_theme'), { method: 'POST', body: formData });
        
        const data = await response.json();
        if (data.success) {
            window.EDITOR_THEME = theme;
            
            // Apply theme to active editor
            if (state.editor) {
                state.editor.setTheme("ace/theme/" + theme);
            }
            
            // Apply theme to DB SQL textarea if ace is used there
            if (state.dbExplorer && state.dbExplorer.customQueryEditor) {
                state.dbExplorer.customQueryEditor.setTheme("ace/theme/" + theme);
            }

            showToast("Tema do editor atualizado com sucesso.", "success");
        } else {
            showToast("Erro: " + (data.message || data.error), "error");
        }
    } catch (err) {
        showToast("Erro ao atualizar tema do editor.", "error");
    }
}

async function saveOptionsEnv(event) {
    event.preventDefault();
    const isLocal = document.getElementById('options-env-local').checked;
    
    try {
        const formData = new FormData();
        formData.append('action', 'update_env');
        formData.append('local_env', isLocal);
        formData.append('workspace_path', document.getElementById('options-env-workspace').value);
        
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
