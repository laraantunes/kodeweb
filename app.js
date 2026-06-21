// app.js - Client-side logic for KodeWeb IDE

// Application State
const state = {
    workspaceRoot: '',
    terminalCwd: '',
    openTabs: {},         // filePath -> { path, name, session, isDirty }
    activeTabPath: null,
    selectedNode: null,   // Currently highlighted element in tree { path, isDir }
    activeConnectionId: null,
    terminalHistory: [],
    terminalHistoryIndex: -1,
    editor: null,
    allFiles: null,
    searchSelectedIndex: -1,
    searchFilteredResults: []
};

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initAceEditor();
    initLayoutResizers();
    initPanelToggles();
    fetchSystemStatus();
    loadFiles();
    loadDbConnections();
    initEventListeners();
});

// 1. Initialize Ace Editor
function initAceEditor() {
    state.editor = ace.edit("editor");
    state.editor.setTheme("ace/theme/dracula");
    state.editor.setOptions({
        fontSize: "14px",
        fontFamily: "'Fira Code', monospace",
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        showPrintMargin: false,
        useSoftTabs: true,
        tabSize: 4
    });
    
    // Add Save Command
    state.editor.commands.addCommand({
        name: 'save',
        bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
        exec: function(editor) {
            saveActiveFile();
        }
    });

    // Add Close Tab Command
    state.editor.commands.addCommand({
        name: 'closeTab',
        bindKey: { win: 'Ctrl-W|Alt-W', mac: 'Command-W|Option-W' },
        exec: function(editor) {
            if (state.activeTabPath) {
                closeTab(state.activeTabPath);
            }
        }
    });

    // Add Global Search Command
    state.editor.commands.addCommand({
        name: 'globalSearch',
        bindKey: { win: 'Ctrl-P', mac: 'Command-P' },
        exec: function(editor) {
            toggleGlobalSearchModal();
        }
    });

    // Add Escape Command to close modals and search box
    state.editor.commands.addCommand({
        name: 'closeModalsAndPopups',
        bindKey: { win: 'Esc', mac: 'Esc' },
        exec: function(editor) {
            let closedAny = false;
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
                closedAny = true;
            });
            
            if (editor.searchBox && !editor.searchBox.isCollapsed) {
                editor.searchBox.hide();
                editor.focus();
                closedAny = true;
            }
            
            return closedAny;
        }
    });

    // Handle Content Changes (Dirty state)
    state.editor.on('input', () => {
        if (state.activeTabPath && state.openTabs[state.activeTabPath]) {
            const tab = state.openTabs[state.activeTabPath];
            if (!tab.isDirty && !tab.session.getUndoManager().isClean()) {
                tab.isDirty = true;
                updateTabUI(state.activeTabPath);
            }
        }
    });
}

// 2. Panel Resizing
function initLayoutResizers() {
    const leftPanel = document.getElementById('panel-left');
    const rightPanel = document.getElementById('panel-right');
    const bottomPanel = document.getElementById('panel-bottom');
    
    const resizerLeft = document.getElementById('resizer-left');
    const resizerRight = document.getElementById('resizer-right');
    const resizerBottom = document.getElementById('resizer-bottom');
    
    setupResizer(resizerLeft, leftPanel, 'v', 'left');
    setupResizer(resizerRight, rightPanel, 'v', 'right');
    setupResizer(resizerBottom, bottomPanel, 'h', 'bottom');
}

function setupResizer(resizer, panel, orientation, side) {
    let startOffset, startSize;
    
    resizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        resizer.classList.add('dragging');
        document.body.style.cursor = orientation === 'v' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
        
        if (orientation === 'v') {
            startOffset = e.clientX;
            startSize = panel.offsetWidth;
        } else {
            startOffset = e.clientY;
            startSize = panel.offsetHeight;
        }
        
        const onPointerMove = (moveEvent) => {
            if (orientation === 'v') {
                const delta = moveEvent.clientX - startOffset;
                const newSize = side === 'left' ? startSize + delta : startSize - delta;
                if (newSize > 120 && newSize < 800) {
                    panel.style.width = `${newSize}px`;
                }
            } else {
                const delta = moveEvent.clientY - startOffset;
                const newSize = startSize - delta; // Dragging up increases height
                if (newSize > 80 && newSize < 600) {
                    panel.style.height = `${newSize}px`;
                }
            }
            if (state.editor) state.editor.resize();
        };
        
        const onPointerUp = () => {
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
        
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    });
}

// 3. Panel Toggle Views
function initPanelToggles() {
    const leftBtn = document.getElementById('toggle-left-btn');
    const rightBtn = document.getElementById('toggle-right-btn');
    const bottomBtn = document.getElementById('toggle-bottom-btn');
    
    leftBtn.addEventListener('click', () => togglePanel('panel-left', 'resizer-left', leftBtn));
    rightBtn.addEventListener('click', () => togglePanel('panel-right', 'resizer-right', rightBtn));
    bottomBtn.addEventListener('click', () => togglePanel('panel-bottom', 'resizer-bottom', bottomBtn));
}

function togglePanel(panelId, resizerId, button) {
    const panel = document.getElementById(panelId);
    const resizer = document.getElementById(resizerId);
    
    panel.classList.toggle('hidden');
    if (resizer) resizer.classList.toggle('hidden');
    button.classList.toggle('active');
    
    if (state.editor) state.editor.resize();
}

// 4. Fetch status on initialization
async function fetchSystemStatus() {
    try {
        const response = await fetch('api.php?action=status');
        const data = await response.json();
        if (data.success) {
            state.workspaceRoot = data.workspace_root;
            updateTerminalPrompt(data.terminal_cwd);
            // Populate database driver options
            populateDbDrivers(data.pdo_drivers);
        }
    } catch (err) {
        console.error("Erro ao obter status do sistema:", err);
    }
}

function populateDbDrivers(drivers) {
    const select = document.getElementById('db-driver');
    select.innerHTML = '';
    
    // Add drivers in order of preference
    const driverNames = {
        'mysql': 'MySQL / MariaDB',
        'pgsql': 'PostgreSQL',
        'sqlite': 'SQLite (Local)'
    };
    
    drivers.forEach(drv => {
        if (driverNames[drv]) {
            const opt = document.createElement('option');
            opt.value = drv;
            opt.textContent = driverNames[drv];
            select.appendChild(opt);
        }
    });
    
    // Toggle fields based on initial selected driver
    toggleDbConnectionFields();
}

// 5. File Tree Operations
async function loadFiles(path = '', container = document.getElementById('file-tree-root')) {
    try {
        const response = await fetch(`api.php?action=files_list&path=${encodeURIComponent(path)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        container.innerHTML = '';
        data.files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'tree-node';
            
            const row = document.createElement('div');
            row.className = 'tree-row';
            row.dataset.path = file.path;
            row.dataset.isDir = file.is_dir ? 'true' : 'false';
            
            // Indentation
            const depth = path ? path.split(/[\/\\]/).length : 0;
            for (let i = 0; i < depth; i++) {
                const indent = document.createElement('span');
                indent.className = 'tree-indent';
                row.appendChild(indent);
            }
            
            // Expand/Collapse Arrow
            const arrow = document.createElement('span');
            arrow.className = 'tree-arrow';
            if (file.is_dir) {
                arrow.textContent = '▶';
            }
            row.appendChild(arrow);
            
            // Icon
            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            icon.textContent = file.is_dir ? '📁' : '📄';
            row.appendChild(icon);
            
            // Name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'tree-name';
            nameSpan.textContent = file.name;
            row.appendChild(nameSpan);
            
            li.appendChild(row);
            
            if (file.is_dir) {
                const subUl = document.createElement('ul');
                subUl.className = 'file-tree hidden';
                li.appendChild(subUl);
                
                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectTreeNode(row);
                    toggleFolder(row, subUl);
                });
            } else {
                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectTreeNode(row);
                });
                
                row.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    openFile(file.path, file.name);
                });
            }
            
            container.appendChild(li);
        });
    } catch (err) {
        showToast("Erro ao carregar arquivos: " + err.message, "error");
    }
}

function selectTreeNode(rowElement) {
    if (state.selectedNode) {
        state.selectedNode.classList.remove('active-file');
    }
    rowElement.classList.add('active-file');
    state.selectedNode = rowElement;
    
    // Enable rename/delete actions
    document.getElementById('rename-node-btn').disabled = false;
    document.getElementById('delete-node-btn').disabled = false;
}

function toggleFolder(row, subUl) {
    const arrow = row.querySelector('.tree-arrow');
    const isCollapsed = subUl.classList.contains('hidden');
    
    if (isCollapsed) {
        subUl.classList.remove('hidden');
        arrow.textContent = '▼';
        // Reload folder contents on expansion
        loadFiles(row.dataset.path, subUl);
    } else {
        subUl.classList.add('hidden');
        arrow.textContent = '▶';
    }
}

// 6. Tabs & Ace Sessions Management
async function openFile(path, name) {
    // Check if tab already exists
    if (state.openTabs[path]) {
        activateTab(path);
        return;
    }
    
    try {
        const response = await fetch(`api.php?action=file_read&path=${encodeURIComponent(path)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        // Determine Mode based on extension
        const ext = name.split('.').pop();
        const mode = getAceMode(ext);
        
        // Create Edit Session
        const session = ace.createEditSession(data.content, mode);
        session.setUndoManager(new ace.UndoManager());
        
        state.openTabs[path] = {
            path: path,
            name: name,
            session: session,
            isDirty: false
        };
        
        createTabUI(path, name);
        activateTab(path);
    } catch (err) {
        showToast("Erro ao abrir arquivo: " + err.message, "error");
    }
}

function createTabUI(path, name) {
    const container = document.getElementById('tabs-container');
    
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.path = path;
    tab.title = path;
    
    const title = document.createElement('span');
    title.textContent = name;
    title.style.marginRight = '8px';
    tab.appendChild(title);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(path);
    });
    tab.appendChild(closeBtn);
    
    tab.addEventListener('click', () => activateTab(path));
    
    container.appendChild(tab);
}

function activateTab(path) {
    state.activeTabPath = path;
    
    // Update active tab UI class
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.path === path);
    });
    
    // Swap Ace session
    const tabInfo = state.openTabs[path];
    state.editor.setSession(tabInfo.session);
    state.editor.focus();
    
    // Update breadcrumb
    updateBreadcrumb(path);
    
    // Hide placeholder
    document.getElementById('no-file-placeholder').classList.add('hidden');
    document.getElementById('editor').classList.remove('hidden');
}

function closeTab(path) {
    const tabInfo = state.openTabs[path];
    if (tabInfo.isDirty) {
        showConfirm(`O arquivo "${tabInfo.name}" possui alterações não salvas. Deseja realmente fechar?`, () => {
            proceedCloseTab(path);
        });
    } else {
        proceedCloseTab(path);
    }
}

function proceedCloseTab(path) {
    // Remove from UI
    const tabElement = document.querySelector(`.tab[data-path="${CSS.escape(path)}"]`);
    if (tabElement) tabElement.remove();
    
    delete state.openTabs[path];
    
    // Switch to another tab if closing active
    if (state.activeTabPath === path) {
        const remainingPaths = Object.keys(state.openTabs);
        if (remainingPaths.length > 0) {
            activateTab(remainingPaths[remainingPaths.length - 1]);
        } else {
            state.activeTabPath = null;
            document.getElementById('no-file-placeholder').classList.remove('hidden');
            document.getElementById('editor').classList.add('hidden');
            updateBreadcrumb('');
        }
    }
}

function updateTabUI(path) {
    const tabElement = document.querySelector(`.tab[data-path="${CSS.escape(path)}"]`);
    if (tabElement) {
        tabElement.classList.toggle('dirty', state.openTabs[path].isDirty);
    }
}

async function saveActiveFile() {
    if (!state.activeTabPath) return;
    
    const tab = state.openTabs[state.activeTabPath];
    const content = state.editor.getValue();
    
    const formData = new FormData();
    formData.append('action', 'file_save');
    formData.append('path', tab.path);
    formData.append('content', content);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            tab.isDirty = false;
            tab.session.getUndoManager().markClean();
            updateTabUI(tab.path);
            showToast("Arquivo salvo com sucesso.", "success");
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        showToast("Erro ao salvar arquivo: " + err.message, "error");
    }
}

function getAceMode(ext) {
    const modes = {
        'php': 'ace/mode/php',
        'js': 'ace/mode/javascript',
        'css': 'ace/mode/css',
        'html': 'ace/mode/html',
        'json': 'ace/mode/json',
        'sql': 'ace/mode/sql',
        'md': 'ace/mode/markdown',
        'txt': 'ace/mode/text',
        'xml': 'ace/mode/xml',
        'yml': 'ace/mode/yaml',
        'yaml': 'ace/mode/yaml',
        'ini': 'ace/mode/ini',
        'htaccess': 'ace/mode/apache_conf'
    };
    return modes[ext.toLowerCase()] || 'ace/mode/text';
}

function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';
    
    if (!path) {
        breadcrumb.textContent = 'Nenhum arquivo aberto';
        return;
    }
    
    const parts = path.split(/[\/\\]/);
    let currentAccumulated = '';
    
    parts.forEach((part, index) => {
        if (index > 0) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' / ';
            breadcrumb.appendChild(separator);
        }
        
        currentAccumulated += (index > 0 ? '/' : '') + part;
        
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = part;
        
        breadcrumb.appendChild(item);
    });
}

// 7. Terminal Operations
function updateTerminalPrompt(cwd) {
    state.terminalCwd = cwd;
    const shortCwd = cwd.replace(state.workspaceRoot, 'Workspace');
    document.getElementById('terminal-prompt-path').textContent = `user@kodeweb:${shortCwd}$`;
}

function writeToTerminalConsole(text, type = 'output') {
    const consoleDiv = document.getElementById('terminal-console');
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
    
    consoleDiv.appendChild(line);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

async function executeTerminalCommand(cmd) {
    cmd = cmd.trim();
    if (!cmd) return;
    
    // Save to history
    state.terminalHistory.push(cmd);
    state.terminalHistoryIndex = state.terminalHistory.length;
    
    // Write request to console
    const promptPath = document.getElementById('terminal-prompt-path').textContent;
    writeToTerminalConsole({ prefix: promptPath, cmd: cmd }, 'cmd');
    
    if (cmd === 'clear' || cmd === 'cls') {
        document.getElementById('terminal-console').innerHTML = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'terminal_cmd');
    formData.append('cmd', cmd);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.output) {
                writeToTerminalConsole(data.output);
            }
            updateTerminalPrompt(data.cwd);
        } else {
            writeToTerminalConsole(data.message || 'Erro desconhecido.', 'error');
        }
    } catch (err) {
        writeToTerminalConsole("Falha de conexão com o servidor: " + err.message, 'error');
    }
}

// 8. Database Dashboard Operations
async function loadDbConnections() {
    try {
        const response = await fetch('api.php?action=db_connections_list');
        const data = await response.json();
        
        if (data.success) {
            const listDiv = document.getElementById('db-connections');
            listDiv.innerHTML = '';
            
            if (data.connections.length === 0) {
                listDiv.innerHTML = '<div style="color: var(--text-muted); font-size:12px; text-align:center;">Nenhuma conexão salva.</div>';
                return;
            }
            
            data.connections.forEach(conn => {
                const card = document.createElement('div');
                card.className = 'db-conn-card';
                if (state.activeConnectionId === conn.id) {
                    card.classList.add('active-db');
                }
                
                card.innerHTML = `
                    <div class="db-conn-title">
                        <span>🔌 ${escapeHTML(conn.name)}</span>
                        <span style="font-size:10px; background-color: var(--bg-hover); padding: 2px 6px; border-radius: 10px;">
                            ${escapeHTML(conn.driver.toUpperCase())}
                        </span>
                    </div>
                    <div class="db-conn-meta">
                        ${conn.driver === 'sqlite' ? escapeHTML(conn.database) : `${escapeHTML(conn.host)}:${escapeHTML(conn.port)} (${escapeHTML(conn.database)})`}
                    </div>
                    <div class="db-conn-actions">
                        <button class="btn btn-sm" onclick="selectDbConnection('${conn.id}', event)">Conectar</button>
                        <button class="btn btn-sm" onclick="editDbConnection(${JSON.stringify(conn).replace(/"/g, '&quot;')}, event)">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDbConnection('${conn.id}', event)">Excluir</button>
                    </div>
                `;
                
                listDiv.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Erro ao listar conexões de banco:", err);
    }
}

function selectDbConnection(id, e) {
    if (e) e.stopPropagation();
    state.activeConnectionId = id;
    
    document.querySelectorAll('.db-conn-card').forEach(card => {
        card.classList.remove('active-db');
    });
    
    // Find card and add active class
    loadDbConnections(); // Quick reload to update active class
    
    // Enable Query Editor
    document.getElementById('sql-query').disabled = false;
    document.getElementById('execute-query-btn').disabled = false;
    
    const activeLabel = document.getElementById('active-db-label');
    activeLabel.textContent = `Conectado. Selecione ou digite sua consulta SQL.`;
    activeLabel.style.color = 'var(--accent-success)';
}

function toggleDbConnectionFields() {
    const driver = document.getElementById('db-driver').value;
    const isSQLite = driver === 'sqlite';
    
    document.getElementById('group-host').classList.toggle('hidden', isSQLite);
    document.getElementById('group-port').classList.toggle('hidden', isSQLite);
    document.getElementById('group-username').classList.toggle('hidden', isSQLite);
    document.getElementById('group-password').classList.toggle('hidden', isSQLite);
    
    const dbLabel = document.getElementById('label-database');
    if (isSQLite) {
        dbLabel.textContent = 'Caminho do Arquivo SQLite (relativo ao workspace)';
        document.getElementById('db-database').placeholder = 'db/database.sqlite';
    } else {
        dbLabel.textContent = 'Nome do Banco de Dados';
        document.getElementById('db-database').placeholder = 'meu_banco';
    }
}

function openAddConnectionModal() {
    document.getElementById('modal-conn-title').textContent = 'Nova Conexão de Banco';
    document.getElementById('db-conn-id').value = '';
    document.getElementById('db-conn-name').value = '';
    document.getElementById('db-host').value = '127.0.0.1';
    document.getElementById('db-port').value = '3306';
    document.getElementById('db-username').value = '';
    document.getElementById('db-password').value = '';
    document.getElementById('db-database').value = '';
    
    document.getElementById('modal-connection').classList.add('active');
}

window.editDbConnection = function(conn, e) {
    if (e) e.stopPropagation();
    document.getElementById('modal-conn-title').textContent = 'Editar Conexão';
    document.getElementById('db-conn-id').value = conn.id;
    document.getElementById('db-conn-name').value = conn.name;
    document.getElementById('db-driver').value = conn.driver;
    document.getElementById('db-host').value = conn.host || '';
    document.getElementById('db-port').value = conn.port || '';
    document.getElementById('db-username').value = conn.username || '';
    document.getElementById('db-password').value = ''; // Don't prefill password
    document.getElementById('db-database').value = conn.database || '';
    
    toggleDbConnectionFields();
    document.getElementById('modal-connection').classList.add('active');
};

window.deleteDbConnection = function(id, e) {
    if (e) e.stopPropagation();
    showConfirm("Deseja realmente remover esta conexão?", async () => {
        const formData = new FormData();
        formData.append('action', 'db_connection_delete');
        formData.append('id', id);
        
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                if (state.activeConnectionId === id) {
                    state.activeConnectionId = null;
                    document.getElementById('sql-query').disabled = true;
                    document.getElementById('execute-query-btn').disabled = true;
                    const activeLabel = document.getElementById('active-db-label');
                    activeLabel.textContent = 'Sem conexão ativa.';
                    activeLabel.style.color = 'var(--text-muted)';
                }
                loadDbConnections();
                showToast("Conexão removida com sucesso!", "success");
            } else {
                showToast("Erro ao excluir: " + data.message, "error");
            }
        } catch (err) {
            showToast("Erro de conexão: " + err.message, "error");
        }
    });
};

async function saveDbConnection(e) {
    e.preventDefault();
    
    const id = document.getElementById('db-conn-id').value;
    const name = document.getElementById('db-conn-name').value;
    const driver = document.getElementById('db-driver').value;
    const host = document.getElementById('db-host').value;
    const port = document.getElementById('db-port').value;
    const username = document.getElementById('db-username').value;
    const password = document.getElementById('db-password').value;
    const database = document.getElementById('db-database').value;
    
    const formData = new FormData();
    formData.append('action', 'db_connection_save');
    formData.append('id', id);
    formData.append('name', name);
    formData.append('driver', driver);
    formData.append('host', host);
    formData.append('port', port);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('database', database);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            closeModal('modal-connection');
            loadDbConnections();
            showToast("Conexão salva com sucesso!", "success");
        } else {
            showToast("Erro ao salvar conexão: " + data.message, "error");
        }
    } catch (err) {
        showToast("Erro ao salvar conexão: " + err.message, "error");
    }
}

async function executeSqlQuery() {
    if (!state.activeConnectionId) return;
    const sql = document.getElementById('sql-query').value.trim();
    if (!sql) return;
    
    const executeBtn = document.getElementById('execute-query-btn');
    executeBtn.disabled = true;
    executeBtn.textContent = 'Rodando...';
    
    const resultsContainer = document.getElementById('db-results');
    resultsContainer.innerHTML = '<div style="padding:10px; color:var(--text-muted);">Executando consulta...</div>';
    
    const formData = new FormData();
    formData.append('action', 'db_query_execute');
    formData.append('connection_id', state.activeConnectionId);
    formData.append('sql', sql);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        resultsContainer.innerHTML = '';
        
        if (data.success) {
            if (data.is_select) {
                if (data.rows.length === 0) {
                    resultsContainer.innerHTML = '<div style="padding:10px; color:var(--text-muted);">Nenhum resultado retornado.</div>';
                } else {
                    const table = document.createElement('table');
                    table.className = 'db-results-table';
                    
                    // Render headers
                    const trHead = document.createElement('tr');
                    data.columns.forEach(col => {
                        const th = document.createElement('th');
                        th.textContent = col;
                        trHead.appendChild(th);
                    });
                    table.appendChild(trHead);
                    
                    // Render data rows
                    data.rows.forEach(row => {
                        const trRow = document.createElement('tr');
                        data.columns.forEach(col => {
                            const td = document.createElement('td');
                            td.textContent = row[col] !== null ? row[col] : 'NULL';
                            trRow.appendChild(td);
                        });
                        table.appendChild(trRow);
                    });
                    
                    resultsContainer.appendChild(table);
                }
            } else {
                resultsContainer.innerHTML = `<div style="padding:10px; color:var(--accent-success);">Comando executado com sucesso. Linhas afetadas: ${data.affected_rows}</div>`;
            }
        } else {
            resultsContainer.innerHTML = `<div style="padding:10px; color:var(--accent-error); font-family:var(--font-mono); font-size:12px; white-space:pre-wrap;">${escapeHTML(data.message)}</div>`;
        }
    } catch (err) {
        resultsContainer.innerHTML = `<div style="padding:10px; color:var(--accent-error); font-family:var(--font-mono); font-size:12px;">Falha de comunicação: ${escapeHTML(err.message)}</div>`;
    } finally {
        executeBtn.disabled = false;
        executeBtn.textContent = 'Executar';
    }
}

// 9. Event Listeners & Modals Setup
function initEventListeners() {
    // New Node Modal Action Trigger
    document.getElementById('new-file-btn').addEventListener('click', () => openNewNodeModal('file'));
    document.getElementById('new-folder-btn').addEventListener('click', () => openNewNodeModal('dir'));
    
    // Refresh File Tree
    document.getElementById('refresh-tree-btn').addEventListener('click', () => {
        loadFiles();
        state.selectedNode = null;
        document.getElementById('rename-node-btn').disabled = true;
        document.getElementById('delete-node-btn').disabled = true;
    });
    
    // Rename Node
    document.getElementById('rename-node-btn').addEventListener('click', () => {
        if (!state.selectedNode) return;
        const currentPath = state.selectedNode.dataset.path;
        const oldName = currentPath.split(/[\/\\]/).pop();
        showPrompt("Renomear Item", "Digite o novo nome:", oldName, (newName) => {
            if (newName && newName !== oldName) {
                renameNode(currentPath, newName);
            }
        });
    });
    
    // Delete Node
    document.getElementById('delete-node-btn').addEventListener('click', () => {
        if (!state.selectedNode) return;
        const currentPath = state.selectedNode.dataset.path;
        const name = currentPath.split(/[\/\\]/).pop();
        showConfirm(`Deseja realmente remover permanentemente: ${name}?`, () => {
            deleteNode(currentPath);
        });
    });
    
    // Terminal input execution listener
    document.getElementById('terminal-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const input = e.target;
            const cmd = input.value;
            input.value = '';
            executeTerminalCommand(cmd);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.terminalHistoryIndex > 0) {
                state.terminalHistoryIndex--;
                e.target.value = state.terminalHistory[state.terminalHistoryIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.terminalHistoryIndex < state.terminalHistory.length - 1) {
                state.terminalHistoryIndex++;
                e.target.value = state.terminalHistory[state.terminalHistoryIndex];
            } else {
                state.terminalHistoryIndex = state.terminalHistory.length;
                e.target.value = '';
            }
        }
    });
    
    // Modal controls
    document.getElementById('db-driver').addEventListener('change', toggleDbConnectionFields);
    document.getElementById('btn-add-db').addEventListener('click', openAddConnectionModal);
    document.getElementById('form-db-connection').addEventListener('submit', saveDbConnection);
    document.getElementById('execute-query-btn').addEventListener('click', executeSqlQuery);
    
    // Help button and modal controls
    document.getElementById('help-btn').addEventListener('click', () => {
        document.getElementById('modal-help').classList.add('active');
    });
    document.getElementById('modal-help').addEventListener('click', (e) => {
        if (e.target.id === 'modal-help') {
            closeModal('modal-help');
        }
    });

    // Form new node submit
    document.getElementById('form-new-node').addEventListener('submit', submitNewNode);
    
    // Global shortcut listener (when editor is not focused)
    window.addEventListener('keydown', (e) => {
        const isW = e.key.toLowerCase() === 'w';
        const isCtrlW = (e.ctrlKey || e.metaKey) && isW;
        const isAltW = e.altKey && isW;
        
        if (isCtrlW || isAltW) {
            e.preventDefault();
            if (state.activeTabPath) {
                closeTab(state.activeTabPath);
            }
        }
        
        const isP = e.key.toLowerCase() === 'p';
        const isCtrlP = (e.ctrlKey || e.metaKey) && isP;
        if (isCtrlP) {
            e.preventDefault();
            toggleGlobalSearchModal();
        }

        if (e.key === 'Escape') {
            let closedAny = false;
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
                closedAny = true;
            });
            
            if (state.editor && state.editor.searchBox && !state.editor.searchBox.isCollapsed) {
                state.editor.searchBox.hide();
                state.editor.focus();
                closedAny = true;
            }
            
            if (closedAny) {
                e.preventDefault();
            }
        }
    });

    // Confirm modal OK button
    document.getElementById('confirm-modal-ok-btn').addEventListener('click', () => {
        closeModal('modal-confirm');
        if (confirmCallback) {
            confirmCallback();
            confirmCallback = null;
        }
    });

    // Prompt modal submit handler
    document.getElementById('form-prompt-modal').addEventListener('submit', (e) => {
        e.preventDefault();
        const val = document.getElementById('prompt-modal-input').value.trim();
        closeModal('modal-prompt');
        if (promptCallback) {
            promptCallback(val);
            promptCallback = null;
        }
    });

    // Global Search Modal Input and Navigation events
    const searchInput = document.getElementById('global-search-input');
    searchInput.addEventListener('input', () => {
        filterGlobalSearchResults();
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveSearchSelection(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveSearchSelection(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            selectSearchItem();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModal('modal-global-search');
        }
    });

    document.getElementById('modal-global-search').addEventListener('click', (e) => {
        if (e.target.id === 'modal-global-search') {
            closeModal('modal-global-search');
        }
    });
}

function openNewNodeModal(type) {
    const parentPath = state.selectedNode && state.selectedNode.dataset.isDir === 'true'
        ? state.selectedNode.dataset.path 
        : '';
        
    document.getElementById('new-node-type').value = type;
    document.getElementById('new-node-parent').value = parentPath;
    document.getElementById('new-node-name').value = '';
    
    document.getElementById('modal-node-title').textContent = type === 'dir' ? 'Nova Pasta' : 'Novo Arquivo';
    document.getElementById('label-node-name').textContent = type === 'dir' ? 'Nome da Pasta' : 'Nome do Arquivo';
    document.getElementById('new-node-name').placeholder = type === 'dir' ? 'minha_pasta' : 'script.js';
    
    document.getElementById('modal-new-node').classList.add('active');
    setTimeout(() => document.getElementById('new-node-name').focus(), 100);
}

async function submitNewNode(e) {
    e.preventDefault();
    const type = document.getElementById('new-node-type').value;
    const parentPath = document.getElementById('new-node-parent').value;
    const name = document.getElementById('new-node-name').value.trim();
    
    if (!name) return;
    
    const formData = new FormData();
    formData.append('action', 'file_create');
    formData.append('type', type);
    formData.append('parent_path', parentPath);
    formData.append('name', name);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            state.allFiles = null; // Invalidate search index cache
            closeModal('modal-new-node');
            
            // Reload containing folder or tree
            if (parentPath && state.selectedNode) {
                // Find parent container ul
                const nodeLi = state.selectedNode.closest('.tree-node');
                const subUl = nodeLi.querySelector('ul.file-tree');
                if (subUl) {
                    subUl.classList.remove('hidden');
                    state.selectedNode.querySelector('.tree-arrow').textContent = '▼';
                    loadFiles(parentPath, subUl);
                } else {
                    loadFiles();
                }
            } else {
                loadFiles();
            }
            
            showToast(`${type === 'dir' ? 'Pasta' : 'Arquivo'} criado com sucesso!`, 'success');
            
            // If it's a file, open it immediately
            if (type === 'file') {
                openFile(data.path, name);
            }
        } else {
            showToast("Erro ao criar: " + data.message, "error");
        }
    } catch (err) {
        showToast("Erro na requisição: " + err.message, "error");
    }
}

async function renameNode(path, newName) {
    const formData = new FormData();
    formData.append('action', 'file_rename');
    formData.append('path', path);
    formData.append('new_name', newName);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            state.allFiles = null; // Invalidate search index cache
            // Reload files tree
            loadFiles();
            state.selectedNode = null;
            document.getElementById('rename-node-btn').disabled = true;
            document.getElementById('delete-node-btn').disabled = true;
            
            showToast("Item renomeado com sucesso!", "success");
            
            // If renamed file is open in tabs, update tab name
            if (state.openTabs[path]) {
                const tabInfo = state.openTabs[path];
                tabInfo.name = newName;
                tabInfo.path = data.path;
                
                // Transfer session to new key and delete old
                state.openTabs[data.path] = tabInfo;
                delete state.openTabs[path];
                
                // Update tab title and dataset on the DOM element
                const tabElement = document.querySelector(`.tab[data-path="${CSS.escape(path)}"]`);
                if (tabElement) {
                    tabElement.dataset.path = data.path;
                    tabElement.title = data.path;
                    tabElement.querySelector('span').textContent = newName;
                }
                
                if (state.activeTabPath === path) {
                    state.activeTabPath = data.path;
                    updateBreadcrumb(data.path);
                }
            }
        } else {
            showToast("Erro ao renomear: " + data.message, "error");
        }
    } catch (err) {
        showToast("Erro de conexão: " + err.message, "error");
    }
}

async function deleteNode(path) {
    const formData = new FormData();
    formData.append('action', 'file_delete');
    formData.append('path', path);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            state.allFiles = null; // Invalidate search index cache
            loadFiles();
            state.selectedNode = null;
            document.getElementById('rename-node-btn').disabled = true;
            document.getElementById('delete-node-btn').disabled = true;
            
            showToast("Item excluído com sucesso!", "success");
            
            // If deleted file is open, close its tab
            if (state.openTabs[path]) {
                // Force close tab by setting dirty to false temporarily
                state.openTabs[path].isDirty = false;
                closeTab(path);
            }
        } else {
            showToast("Erro ao deletar: " + data.message, "error");
        }
    } catch (err) {
        showToast("Erro de conexão: " + err.message, "error");
    }
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Utilities
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Modal and Toast State & Helpers
let confirmCallback = null;
let promptCallback = null;

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<span style="font-size:14px;">${icon}</span> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 50);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showConfirm(message, onConfirm) {
    document.getElementById('confirm-modal-message').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('modal-confirm').classList.add('active');
}

function showPrompt(title, label, defaultValue, onSubmit) {
    document.getElementById('prompt-modal-title').textContent = title;
    document.getElementById('prompt-modal-label').textContent = label;
    const input = document.getElementById('prompt-modal-input');
    input.value = defaultValue;
    promptCallback = onSubmit;
    
    document.getElementById('modal-prompt').classList.add('active');
    setTimeout(() => input.focus(), 150);
}

async function toggleGlobalSearchModal() {
    const modal = document.getElementById('modal-global-search');
    const input = document.getElementById('global-search-input');
    
    if (modal.classList.contains('active')) {
        closeModal('modal-global-search');
        return;
    }
    
    modal.classList.add('active');
    input.value = '';
    state.searchSelectedIndex = -1;
    state.searchFilteredResults = [];
    
    const resultsContainer = document.getElementById('global-search-results');
    resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Carregando índice de arquivos...</div>';
    
    setTimeout(() => input.focus(), 150);
    
    try {
        if (!state.allFiles) {
            const response = await fetch('api.php?action=files_list_recursive');
            const data = await response.json();
            if (data.success) {
                state.allFiles = data.files;
            } else {
                resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--accent-error); font-size: 13px;">Erro ao carregar: ${escapeHTML(data.message)}</div>`;
                return;
            }
        }
        
        filterGlobalSearchResults();
    } catch (err) {
        resultsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--accent-error); font-size: 13px;">Erro de conexão: ${escapeHTML(err.message)}</div>`;
    }
}

function filterGlobalSearchResults() {
    const input = document.getElementById('global-search-input');
    const query = input.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('global-search-results');
    
    if (!state.allFiles) return;
    
    let filtered = [];
    if (!query) {
        filtered = state.allFiles.slice(0, 15);
    } else {
        filtered = state.allFiles.filter(file => {
            return file.name.toLowerCase().includes(query) || 
                   file.path.toLowerCase().includes(query);
        });
        
        filtered.sort((a, b) => {
            const aNameLower = a.name.toLowerCase();
            const bNameLower = b.name.toLowerCase();
            const aStartsWith = aNameLower.startsWith(query);
            const bStartsWith = bNameLower.startsWith(query);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return a.path.localeCompare(b.path);
        });
        
        filtered = filtered.slice(0, 15);
    }
    
    state.searchFilteredResults = filtered;
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Nenhum arquivo correspondente.</div>';
        state.searchSelectedIndex = -1;
        return;
    }
    
    resultsContainer.innerHTML = '';
    filtered.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item' + (index === 0 ? ' selected' : '');
        item.dataset.index = index;
        item.dataset.path = file.path;
        item.dataset.name = file.name;
        
        let displayName = escapeHTML(file.name);
        let displayPath = escapeHTML(file.path);
        
        if (query) {
            const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
            displayName = displayName.replace(regex, '<strong style="color: var(--accent);">$1</strong>');
            displayPath = displayPath.replace(regex, '<strong style="color: var(--accent);">$1</strong>');
        }
        
        item.innerHTML = `
            <div class="search-result-name">${displayName}</div>
            <div class="search-result-path">${displayPath}</div>
        `;
        
        item.addEventListener('click', () => {
            openFile(file.path, file.name);
            closeModal('modal-global-search');
        });
        
        resultsContainer.appendChild(item);
    });
    
    state.searchSelectedIndex = 0;
}

function moveSearchSelection(direction) {
    const resultsContainer = document.getElementById('global-search-results');
    const items = resultsContainer.querySelectorAll('.search-result-item');
    if (items.length === 0) return;
    
    if (state.searchSelectedIndex >= 0 && state.searchSelectedIndex < items.length) {
        items[state.searchSelectedIndex].classList.remove('selected');
    }
    
    state.searchSelectedIndex += direction;
    
    if (state.searchSelectedIndex < 0) {
        state.searchSelectedIndex = items.length - 1;
    } else if (state.searchSelectedIndex >= items.length) {
        state.searchSelectedIndex = 0;
    }
    
    const selectedItem = items[state.searchSelectedIndex];
    selectedItem.classList.add('selected');
    
    selectedItem.scrollIntoView({ block: 'nearest' });
}

function selectSearchItem() {
    if (state.searchSelectedIndex >= 0 && state.searchSelectedIndex < state.searchFilteredResults.length) {
        const file = state.searchFilteredResults[state.searchSelectedIndex];
        openFile(file.path, file.name);
        closeModal('modal-global-search');
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

window.toggleGlobalSearchModal = toggleGlobalSearchModal;
