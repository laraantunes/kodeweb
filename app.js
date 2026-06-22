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
    searchFilteredResults: [],
    dbExplorer: {
        activeTab: 'data', // 'data' or 'structure'
        selectedDb: null,
        selectedTable: null,
        activeDriver: 'mysql',
        tableColumns: [],
        tableData: [],
        currentPage: 1,
        limit: 5,
        baseQuery: '',
        currentQuery: ''
    }
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
        bindKey: { win: 'Alt-W', mac: 'Option-W' },
        exec: function(editor) {
            if (state.activeTabPath) {
                closeTab(state.activeTabPath);
            }
        }
    });
    
    // Add Next/Prev Tab Commands
    state.editor.commands.addCommand({
        name: 'nextTab',
        bindKey: { win: 'Alt-.', mac: 'Option-.' },
        exec: function(editor) {
            cycleTabs(1);
        }
    });
    
    state.editor.commands.addCommand({
        name: 'prevTab',
        bindKey: { win: 'Alt-,', mac: 'Option-,' },
        exec: function(editor) {
            cycleTabs(-1);
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
            
            const searchEl = document.querySelector('.ace_search');
            if (searchEl && !searchEl.classList.contains('hide')) {
                if (editor.searchBox) {
                    editor.searchBox.hide();
                    editor.focus();
                    closedAny = true;
                }
            }
            
            if (closedAny) {
                return true;
            }
            editor.execCommand('singleSelection');
        },
        readOnly: true
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
        
        // Update Markdown Preview if active
        if (typeof mdPreviewActive !== 'undefined' && mdPreviewActive) {
            if (typeof updateMdPreview === 'function') updateMdPreview();
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
            
            // Context Menu Button (3 dots)
            const contextMenuBtn = document.createElement('span');
            contextMenuBtn.className = 'tree-context-menu-btn';
            contextMenuBtn.textContent = '⋮';
            contextMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showTreeContextMenu(e, row.dataset.path, file.name, file.is_dir);
            });
            row.appendChild(contextMenuBtn);
            
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

function showTreeContextMenu(e, path, name, isDir) {
    let menu = document.getElementById('tree-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'tree-context-menu';
        menu.className = 'tree-context-menu';
        menu.innerHTML = `
            <div class="tree-context-menu-item" id="ctx-upload" style="display: none;">📤 Carregar arquivos</div>
            <div class="tree-context-menu-item" id="ctx-rename">✏️ Renomear</div>
            <div class="tree-context-menu-item danger" id="ctx-delete">❌ Excluir</div>
        `;
        document.body.appendChild(menu);
        
        document.addEventListener('click', (event) => {
            if (event.target !== menu && !menu.contains(event.target)) {
                menu.classList.remove('active');
            }
        });
    }

    const uploadItem = document.getElementById('ctx-upload');
    if (isDir) {
        uploadItem.style.display = 'flex';
        uploadItem.onclick = () => {
            menu.classList.remove('active');
            openUploadModal(path);
        };
    } else {
        uploadItem.style.display = 'none';
    }

    document.getElementById('ctx-rename').onclick = () => {
        menu.classList.remove('active');
        showPrompt("Renomear Item", "Digite o novo nome:", name, (newName) => {
            if (newName && newName !== name) {
                renameNode(path, newName);
            }
        });
    };
    
    document.getElementById('ctx-delete').onclick = () => {
        menu.classList.remove('active');
        showConfirm(`Deseja realmente remover permanentemente: ${name}?`, () => {
            deleteNode(path);
        });
    };

    menu.classList.add('active');
    
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${e.clientX - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${e.clientY - rect.height}px`;
    }
}

// 6. Tabs & Ace Sessions Management
async function openFile(path, name) {
    // Check if tab already exists
    if (state.openTabs[path]) {
        activateTab(path);
        return;
    }
    
    const ext = name.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
    
    if (isImage) {
        state.openTabs[path] = {
            path: path,
            name: name,
            isImage: true,
            isDirty: false
        };
        createTabUI(path, name);
        activateTab(path);
        return;
    }
    
    try {
        const response = await fetch(`api.php?action=file_read&path=${encodeURIComponent(path)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        const mode = getAceMode(ext);
        
        // Create Edit Session
        const session = ace.createEditSession(data.content, mode);
        session.setUndoManager(new ace.UndoManager());
        
        state.openTabs[path] = {
            path: path,
            name: name,
            session: session,
            isImage: false,
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
    tab.draggable = true;
    
    tab.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', path);
        tab.classList.add('dragging');
        setTimeout(() => tab.style.opacity = '0.5', 0);
    });
    
    tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
        tab.style.opacity = '1';
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
    
    const tabInfo = state.openTabs[path];
    
    // Update breadcrumb
    updateBreadcrumb(path === 'db_explorer' ? 'Explorador de Banco de Dados' : path);
    
    if (path === 'db_explorer') {
        // Hide editor, image preview and placeholder
        document.getElementById('no-file-placeholder').classList.add('hidden');
        document.getElementById('editor').classList.add('hidden');
        if(document.getElementById('image-preview-container')) document.getElementById('image-preview-container').classList.add('hidden');
        
        // Show db explorer
        document.getElementById('db-explorer-container').classList.remove('hidden');
        
        // Sync connections dropdown
        syncDbExplorerConnections();
    } else {
        // Hide db explorer
        document.getElementById('db-explorer-container').classList.add('hidden');
        
        if (tabInfo && tabInfo.isImage) {
            document.getElementById('editor').classList.add('hidden');
            document.getElementById('no-file-placeholder').classList.add('hidden');
            
            const imgContainer = document.getElementById('image-preview-container');
            const imgEl = document.getElementById('image-preview-element');
            const infoEl = document.getElementById('image-preview-info');
            
            imgEl.onload = function() {
                infoEl.textContent = `${this.naturalWidth} x ${this.naturalHeight} pixels`;
            };
            // Add a cache buster if it's an image that might change
            imgEl.src = `api.php?action=file_serve&path=${encodeURIComponent(path)}&_t=${new Date().getTime()}`;
            imgContainer.classList.remove('hidden');
        } else if (tabInfo) {
            if(document.getElementById('image-preview-container')) document.getElementById('image-preview-container').classList.add('hidden');
            // Swap Ace session
            state.editor.setSession(tabInfo.session);
            state.editor.focus();
            
            // Hide placeholder, show editor
            document.getElementById('no-file-placeholder').classList.add('hidden');
            document.getElementById('editor').classList.remove('hidden');
        }
    }
    
    // Markdown Preview Toggle Logic
    const mdBtn = document.getElementById('md-toggle-btn');
    const isMarkdown = tabInfo && tabInfo.name && (tabInfo.name.endsWith('.md') || tabInfo.name.endsWith('.markdown'));
    
    if (isMarkdown && !tabInfo.isImage) {
        if(mdBtn) mdBtn.classList.remove('hidden');
        if (typeof mdPreviewActive !== 'undefined' && mdPreviewActive) {
            if (typeof updateMdPreview === 'function') updateMdPreview();
        }
    } else {
        if(mdBtn) mdBtn.classList.add('hidden');
        if (typeof mdPreviewActive !== 'undefined' && mdPreviewActive) {
            if (typeof toggleMdPreview === 'function') toggleMdPreview(); // Force close preview when switching to non-markdown
        }
    }
}

function cycleTabs(direction) {
    const container = document.getElementById('tabs-container');
    const tabs = Array.from(container.querySelectorAll('.tab'));
    if (tabs.length <= 1) return;
    
    let currentIndex = -1;
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].classList.contains('active')) {
            currentIndex = i;
            break;
        }
    }
    
    if (currentIndex !== -1) {
        let nextIndex = (currentIndex + direction) % tabs.length;
        if (nextIndex < 0) nextIndex = tabs.length - 1;
        
        const nextPath = tabs[nextIndex].dataset.path;
        activateTab(nextPath);
    }
}

function closeTab(path) {
    const tabInfo = state.openTabs[path];
    if (tabInfo && tabInfo.isDirty) {
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
            if(document.getElementById('image-preview-container')) document.getElementById('image-preview-container').classList.add('hidden');
            document.getElementById('db-explorer-container').classList.add('hidden');
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
    const dbInput = document.getElementById('db-database');
    if (isSQLite) {
        dbLabel.textContent = 'Caminho do Arquivo SQLite (relativo ao workspace)';
        dbInput.placeholder = 'db/database.sqlite';
        dbInput.required = true;
    } else {
        dbLabel.textContent = 'Nome do Banco de Dados (Opcional)';
        dbInput.placeholder = 'meu_banco';
        dbInput.required = false;
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
    initUploadEvents();
    
    // Global keyboard listener for tab cycling (Alt+. and Alt+,)
    document.addEventListener('keydown', (e) => {
        // Only if no modal is active and we're not inside the ace editor (ace handles it)
        if (e.altKey && (e.key === '.' || e.key === ',')) {
            e.preventDefault();
            if (!state.editor || !state.editor.isFocused()) {
                cycleTabs(e.key === '.' ? 1 : -1);
            }
        }
    });
    
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
    
    // Database Explorer listeners
    document.getElementById('btn-explore-db').addEventListener('click', openDbExplorer);
    document.getElementById('db-explorer-connection-select').addEventListener('change', (e) => {
        loadDbExplorerTree(e.target.value);
    });
    document.getElementById('db-explorer-refresh-btn').addEventListener('click', () => {
        const connId = document.getElementById('db-explorer-connection-select').value;
        if (connId) {
            loadDbExplorerTree(connId);
        }
    });
    
    // Tab switching in Explorer
    document.getElementById('db-tab-data-btn').addEventListener('click', () => switchDbTab('data'));
    document.getElementById('db-tab-structure-btn').addEventListener('click', () => switchDbTab('structure'));
    
    // Run query / pagination in Explorer
    document.getElementById('db-data-run-query-btn').addEventListener('click', () => {
        state.dbExplorer.currentPage = 1;
        fetchTableData();
    });
    document.getElementById('db-data-search-query').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            state.dbExplorer.currentPage = 1;
            fetchTableData();
        }
    });
    document.getElementById('db-pagination-prev-btn').addEventListener('click', () => {
        if (state.dbExplorer.currentPage > 1) {
            state.dbExplorer.currentPage--;
            fetchTableData();
        }
    });
    document.getElementById('db-pagination-next-btn').addEventListener('click', () => {
        state.dbExplorer.currentPage++;
        fetchTableData();
    });
    
    // Actions in Explorer
    document.getElementById('db-data-add-row-btn').addEventListener('click', openAddDbRowModal);
    document.getElementById('form-db-row').addEventListener('submit', saveDbRowSubmit);
    
    document.getElementById('db-structure-add-column-btn').addEventListener('click', openAddDbColumnModal);
    document.getElementById('form-db-column').addEventListener('submit', saveDbColumnSubmit);
    
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
            
            const searchEl = document.querySelector('.ace_search');
            if (searchEl && !searchEl.classList.contains('hide')) {
                if (state.editor && state.editor.searchBox) {
                    state.editor.searchBox.hide();
                    state.editor.focus();
                    closedAny = true;
                }
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

// Database Explorer implementation
function openDbExplorer() {
    const path = 'db_explorer';
    const name = '🗄️ Explorador DB';
    
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

async function syncDbExplorerConnections() {
    const select = document.getElementById('db-explorer-connection-select');
    const currentValue = select.value;
    
    try {
        const response = await fetch('api.php?action=db_connections_list');
        const data = await response.json();
        
        if (data.success) {
            select.innerHTML = '<option value="">Selecione uma conexão...</option>';
            data.connections.forEach(conn => {
                const opt = document.createElement('option');
                opt.value = conn.id;
                opt.textContent = `${conn.name} (${conn.driver.toUpperCase()})`;
                select.appendChild(opt);
            });
            
            // Restore previous or select current active connection
            if (currentValue && data.connections.some(c => c.id === currentValue)) {
                select.value = currentValue;
            } else if (state.activeConnectionId && data.connections.some(c => c.id === state.activeConnectionId)) {
                select.value = state.activeConnectionId;
                loadDbExplorerTree(state.activeConnectionId);
            }
        }
    } catch (err) {
        console.error("Erro ao sincronizar conexões no explorador:", err);
    }
}

async function loadDbExplorerTree(connId) {
    const root = document.getElementById('db-tree-root');
    if (!connId) {
        root.innerHTML = '<li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">Selecione uma conexão para listar os bancos.</li>';
        document.getElementById('db-table-view-container').classList.add('hidden');
        document.getElementById('db-explorer-empty-placeholder').classList.remove('hidden');
        return;
    }
    
    root.innerHTML = '<li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">Carregando bancos de dados...</li>';
    
    try {
        const response = await fetch(`api.php?action=db_list_databases&connection_id=${connId}`);
        const data = await response.json();
        
        if (data.success) {
            root.innerHTML = '';
            state.dbExplorer.activeDriver = data.driver;
            
            data.databases.forEach(db => {
                const li = document.createElement('li');
                li.className = 'tree-node';
                
                const row = document.createElement('div');
                row.className = 'tree-row';
                row.dataset.db = db;
                row.dataset.type = 'database';
                
                // Arrow
                const arrow = document.createElement('span');
                arrow.className = 'tree-arrow';
                arrow.textContent = '▶';
                row.appendChild(arrow);
                
                // Icon
                const icon = document.createElement('span');
                icon.className = 'tree-icon';
                icon.textContent = '🗄️';
                row.appendChild(icon);
                
                // Name
                const nameSpan = document.createElement('span');
                nameSpan.className = 'tree-name';
                nameSpan.textContent = db;
                row.appendChild(nameSpan);
                
                li.appendChild(row);
                
                // Sub list for tables
                const subUl = document.createElement('ul');
                subUl.className = 'file-tree hidden';
                li.appendChild(subUl);
                
                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Select tree node style
                    document.querySelectorAll('#db-tree-root .tree-row').forEach(r => r.classList.remove('active-file'));
                    row.classList.add('active-file');
                    
                    toggleExplorerDatabaseNode(row, subUl, connId);
                });
                
                root.appendChild(li);
            });
        } else {
            root.innerHTML = `<li style="color: var(--accent-error); font-size:12px; text-align:center; padding-top:20px; padding-left:10px; padding-right:10px;">Erro: ${escapeHTML(data.message)}</li>`;
        }
    } catch (err) {
        root.innerHTML = `<li style="color: var(--accent-error); font-size:12px; text-align:center; padding-top:20px;">Falha de rede: ${escapeHTML(err.message)}</li>`;
    }
}

async function toggleExplorerDatabaseNode(row, subUl, connId) {
    const arrow = row.querySelector('.tree-arrow');
    const isCollapsed = subUl.classList.contains('hidden');
    const dbName = row.dataset.db;
    
    if (isCollapsed) {
        subUl.classList.remove('hidden');
        arrow.textContent = '▼';
        
        subUl.innerHTML = '<li style="color: var(--text-muted); font-size:11px; padding: 4px 20px;">Carregando tabelas...</li>';
        
        try {
            const response = await fetch(`api.php?action=db_list_tables&connection_id=${connId}&database=${encodeURIComponent(dbName)}`);
            const data = await response.json();
            
            if (data.success) {
                subUl.innerHTML = '';
                if (data.tables.length === 0) {
                    subUl.innerHTML = '<li style="color: var(--text-muted); font-size:11px; padding: 4px 20px; font-style:italic;">Sem tabelas</li>';
                    return;
                }
                
                data.tables.forEach(table => {
                    const li = document.createElement('li');
                    li.className = 'tree-node';
                    
                    const tRow = document.createElement('div');
                    tRow.className = 'tree-row';
                    tRow.dataset.db = dbName;
                    tRow.dataset.table = table;
                    tRow.dataset.type = 'table';
                    
                    // Indent
                    const indent = document.createElement('span');
                    indent.className = 'tree-indent';
                    tRow.appendChild(indent);
                    
                    // Empty space instead of arrow
                    const arrowSpace = document.createElement('span');
                    arrowSpace.className = 'tree-arrow';
                    tRow.appendChild(arrowSpace);
                    
                    // Icon
                    const icon = document.createElement('span');
                    icon.className = 'tree-icon';
                    icon.textContent = '📋';
                    tRow.appendChild(icon);
                    
                    // Name
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'tree-name';
                    nameSpan.textContent = table;
                    tRow.appendChild(nameSpan);
                    
                    li.appendChild(tRow);
                    
                    tRow.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('#db-tree-root .tree-row').forEach(r => r.classList.remove('active-file'));
                        tRow.classList.add('active-file');
                        
                        loadTableDetails(dbName, table);
                    });
                    
                    subUl.appendChild(li);
                });
            } else {
                subUl.innerHTML = `<li style="color: var(--accent-error); font-size:11px; padding: 4px 20px;">Erro: ${escapeHTML(data.message)}</li>`;
            }
        } catch (err) {
            subUl.innerHTML = `<li style="color: var(--accent-error); font-size:11px; padding: 4px 20px;">Falha: ${escapeHTML(err.message)}</li>`;
        }
    } else {
        subUl.classList.add('hidden');
        arrow.textContent = '▶';
    }
}

function loadTableDetails(dbName, tableName) {
    state.dbExplorer.selectedDb = dbName;
    state.dbExplorer.selectedTable = tableName;
    state.dbExplorer.currentPage = 1;
    
    document.getElementById('db-table-title').textContent = `${dbName}.${tableName}`;
    
    // Set default select query
    let quote = '`';
    if (state.dbExplorer.activeDriver === 'pgsql') quote = '"';
    
    const queryInput = document.getElementById('db-data-search-query');
    queryInput.value = `SELECT * FROM ${quote}${tableName}${quote} LIMIT 5;`;
    
    // Switch to data tab by default
    switchDbTab('data');
    
    document.getElementById('db-explorer-empty-placeholder').classList.add('hidden');
    document.getElementById('db-table-view-container').classList.remove('hidden');
    
    fetchTableData();
    fetchTableStructure();
}

function switchDbTab(tabName) {
    state.dbExplorer.activeTab = tabName;
    
    document.getElementById('db-tab-data-btn').classList.toggle('active', tabName === 'data');
    document.getElementById('db-tab-structure-btn').classList.toggle('active', tabName === 'structure');
    
    document.getElementById('db-tab-data-content').classList.toggle('hidden', tabName !== 'data');
    document.getElementById('db-tab-structure-content').classList.toggle('hidden', tabName !== 'structure');
}

function paginateQuery(sql, page, limit) {
    let cleanSql = sql.trim();
    if (cleanSql.endsWith(';')) {
        cleanSql = cleanSql.slice(0, -1).trim();
    }
    
    // Regex for LIMIT and OFFSET
    const limitRegex = /\bLIMIT\s+(\d+)/i;
    const offsetRegex = /\bOFFSET\s+(\d+)/i;
    
    let currentLimit = limit;
    const limitMatch = cleanSql.match(limitRegex);
    if (limitMatch) {
        currentLimit = parseInt(limitMatch[1], 10);
    } else {
        cleanSql += ` LIMIT ${currentLimit}`;
    }
    state.dbExplorer.limit = currentLimit;
    
    const offset = (page - 1) * currentLimit;
    
    const offsetMatch = cleanSql.match(offsetRegex);
    if (offsetMatch) {
        if (offset > 0) {
            cleanSql = cleanSql.replace(offsetRegex, `OFFSET ${offset}`);
        } else {
            cleanSql = cleanSql.replace(/\s+OFFSET\s+\d+/i, '');
        }
    } else if (offset > 0) {
        cleanSql += ` OFFSET ${offset}`;
    }
    
    return cleanSql + ';';
}

async function fetchTableData() {
    const connId = document.getElementById('db-explorer-connection-select').value;
    if (!connId || !state.dbExplorer.selectedTable) return;
    
    const rawQuery = document.getElementById('db-data-search-query').value.trim();
    if (!rawQuery) return;
    
    const paginatedQuery = paginateQuery(rawQuery, state.dbExplorer.currentPage, state.dbExplorer.limit);
    document.getElementById('db-data-search-query').value = paginatedQuery;
    
    const gridContainer = document.getElementById('db-data-grid-container');
    gridContainer.innerHTML = '<div style="padding:20px; color:var(--text-muted); text-align:center;">Buscando registros...</div>';
    
    // Disable/Enable pagination buttons
    document.getElementById('db-pagination-prev-btn').disabled = state.dbExplorer.currentPage === 1;
    document.getElementById('db-pagination-next-btn').disabled = true; // Wait for response to decide
    
    const formData = new FormData();
    formData.append('action', 'db_query_execute');
    formData.append('connection_id', connId);
    formData.append('database', state.dbExplorer.selectedDb);
    formData.append('sql', paginatedQuery);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            if (!data.is_select) {
                gridContainer.innerHTML = `<div style="padding:20px; color:var(--accent-success); text-align:center;">Comando executado com sucesso. Linhas afetadas: ${data.affected_rows}</div>`;
                document.getElementById('db-pagination-info').textContent = `Comando executado.`;
                return;
            }
            
            state.dbExplorer.tableData = data.rows;
            renderDataGrid(data.columns, data.rows);
        } else {
            gridContainer.innerHTML = `<div style="padding:20px; color:var(--accent-error); font-family:var(--font-mono); font-size:12px; white-space:pre-wrap;">${escapeHTML(data.message)}</div>`;
            document.getElementById('db-pagination-info').textContent = `Erro na execução.`;
        }
    } catch (err) {
        gridContainer.innerHTML = `<div style="padding:20px; color:var(--accent-error); font-size:12px;">Falha de comunicação: ${escapeHTML(err.message)}</div>`;
        document.getElementById('db-pagination-info').textContent = `Falha de rede.`;
    }
}

function renderDataGrid(columns, rows) {
    const gridContainer = document.getElementById('db-data-grid-container');
    gridContainer.innerHTML = '';
    
    if (rows.length === 0) {
        gridContainer.innerHTML = '<div style="padding:20px; color:var(--text-muted); text-align:center;">Nenhum registro encontrado para esta página.</div>';
        document.getElementById('db-pagination-info').textContent = `Mostrando 0 registros`;
        document.getElementById('db-pagination-page-label').textContent = `Página ${state.dbExplorer.currentPage}`;
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'db-grid-table';
    
    // Header
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        trHead.appendChild(th);
    });
    // Action header
    const thActions = document.createElement('th');
    thActions.textContent = 'Ações';
    thActions.style.width = '120px';
    thActions.style.textAlign = 'center';
    trHead.appendChild(thActions);
    thead.appendChild(trHead);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = rowIndex;
        
        columns.forEach(col => {
            const td = document.createElement('td');
            td.dataset.column = col;
            td.textContent = row[col] !== null ? row[col] : 'NULL';
            if (row[col] === null) td.style.color = 'var(--text-muted)';
            tr.appendChild(td);
        });
        
        // Actions cell
        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'center';
        tdActions.innerHTML = `
            <button class="btn btn-sm btn-edit" onclick="editDbRowInline(${rowIndex}, this)">✏️ Editar</button>
            <button class="btn btn-sm btn-danger btn-delete" onclick="deleteDbRow(${rowIndex})">X</button>
        `;
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    gridContainer.appendChild(table);
    
    // Pagination footer updates
    const count = rows.length;
    const startRecord = (state.dbExplorer.currentPage - 1) * state.dbExplorer.limit + 1;
    const endRecord = startRecord + count - 1;
    document.getElementById('db-pagination-info').textContent = `Mostrando registros ${startRecord}-${endRecord}`;
    document.getElementById('db-pagination-page-label').textContent = `Página ${state.dbExplorer.currentPage}`;
    
    // Enable next button if returned count is exactly our limit (meaning there might be more)
    document.getElementById('db-pagination-next-btn').disabled = count < state.dbExplorer.limit;
}

async function fetchTableStructure() {
    const connId = document.getElementById('db-explorer-connection-select').value;
    if (!connId || !state.dbExplorer.selectedTable) return;
    
    const body = document.getElementById('db-table-structure-body');
    body.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">Carregando estrutura...</td></tr>';
    
    try {
        const response = await fetch(`api.php?action=db_table_structure&connection_id=${connId}&database=${encodeURIComponent(state.dbExplorer.selectedDb)}&table=${encodeURIComponent(state.dbExplorer.selectedTable)}`);
        const data = await response.json();
        
        if (data.success) {
            body.innerHTML = '';
            state.dbExplorer.tableColumns = data.columns;
            
            data.columns.forEach(col => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td><strong>${escapeHTML(col.name)}</strong></td>
                    <td><code style="color:var(--accent-hover);">${escapeHTML(col.type)}</code></td>
                    <td>${col.nullable ? '<span style="color:var(--accent-success);">Sim</span>' : '<span style="color:var(--accent-error);">Não</span>'}</td>
                    <td><span style="font-family:var(--font-mono); font-weight:600; color:var(--accent);">${escapeHTML(col.key)}</span></td>
                    <td><span style="color:var(--text-muted); font-size:12px;">${col.default !== null ? escapeHTML(col.default) : 'NULL'}</span></td>
                    <td><span style="color:var(--text-muted); font-size:11px;">${escapeHTML(col.extra)}</span></td>
                    <td style="text-align: center;">
                        <button class="btn btn-sm" onclick="openEditDbColumnModal(${JSON.stringify(col).replace(/"/g, '&quot;')})">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDbColumn('${escapeHTML(col.name)}')">X</button>
                    </td>
                `;
                body.appendChild(tr);
            });
        } else {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--accent-error); padding:20px;">Erro: ${escapeHTML(data.message)}</td></tr>`;
        }
    } catch (err) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--accent-error); padding:20px;">Falha: ${escapeHTML(err.message)}</td></tr>`;
    }
}

// In-line Row Editing Logic
window.editDbRowInline = function(rowIndex, btn) {
    const tr = document.querySelector(`.db-grid-table tr[data-row-index="${rowIndex}"]`);
    if (!tr) return;
    
    const rowData = state.dbExplorer.tableData[rowIndex];
    const columns = Object.keys(rowData);
    
    // Change cells to inputs
    columns.forEach(col => {
        const td = tr.querySelector(`td[data-column="${col}"]`);
        if (td) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'db-grid-cell-input';
            input.value = rowData[col] !== null ? rowData[col] : '';
            td.innerHTML = '';
            td.appendChild(input);
        }
    });
    
    // Change actions buttons
    const tdActions = tr.lastElementChild;
    tdActions.innerHTML = `
        <button class="btn btn-sm btn-primary" onclick="saveDbRowInline(${rowIndex}, this)">Salvar</button>
        <button class="btn btn-sm" onclick="cancelDbRowInline(${rowIndex}, this)">Cancelar</button>
    `;
};

window.cancelDbRowInline = function(rowIndex, btn) {
    // Just re-render data grid to discard changes
    renderDataGrid(Object.keys(state.dbExplorer.tableData[0]), state.dbExplorer.tableData);
};

window.saveDbRowInline = async function(rowIndex, btn) {
    const tr = document.querySelector(`.db-grid-table tr[data-row-index="${rowIndex}"]`);
    if (!tr) return;
    
    const connId = document.getElementById('db-explorer-connection-select').value;
    const oldRowData = state.dbExplorer.tableData[rowIndex];
    const columns = Object.keys(oldRowData);
    
    const newValuesObj = {};
    columns.forEach(col => {
        const td = tr.querySelector(`td[data-column="${col}"]`);
        const input = td.querySelector('input');
        newValuesObj[col] = input.value;
    });
    
    // Build keys (WHERE clause matching columns)
    const priCols = state.dbExplorer.tableColumns.filter(c => c.key === 'PRI').map(c => c.name);
    const keysObj = {};
    
    if (priCols.length > 0) {
        priCols.forEach(col => {
            keysObj[col] = oldRowData[col];
        });
    } else {
        // Fallback: match all columns
        columns.forEach(col => {
            keysObj[col] = oldRowData[col];
        });
    }
    
    btn.disabled = true;
    btn.textContent = 'Salving...';
    
    const formData = new FormData();
    formData.append('action', 'db_row_update');
    formData.append('connection_id', connId);
    formData.append('database', state.dbExplorer.selectedDb);
    formData.append('table', state.dbExplorer.selectedTable);
    formData.append('keys', JSON.stringify(keysObj));
    formData.append('values', JSON.stringify(newValuesObj));
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            showToast("Registro atualizado com sucesso!", "success");
            fetchTableData();
        } else {
            showToast("Erro ao atualizar: " + data.message, "error");
            btn.disabled = false;
            btn.textContent = 'Salvar';
        }
    } catch (err) {
        showToast("Erro na requisição: " + err.message, "error");
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
};

window.deleteDbRow = function(rowIndex) {
    const connId = document.getElementById('db-explorer-connection-select').value;
    const rowData = state.dbExplorer.tableData[rowIndex];
    const columns = Object.keys(rowData);
    
    showConfirm("Deseja realmente remover permanentemente este registro?", async () => {
        const priCols = state.dbExplorer.tableColumns.filter(c => c.key === 'PRI').map(c => c.name);
        const keysObj = {};
        
        if (priCols.length > 0) {
            priCols.forEach(col => {
                keysObj[col] = rowData[col];
            });
        } else {
            columns.forEach(col => {
                keysObj[col] = rowData[col];
            });
        }
        
        const formData = new FormData();
        formData.append('action', 'db_row_delete');
        formData.append('connection_id', connId);
        formData.append('database', state.dbExplorer.selectedDb);
        formData.append('table', state.dbExplorer.selectedTable);
        formData.append('keys', JSON.stringify(keysObj));
        
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                showToast("Registro removido com sucesso!", "success");
                fetchTableData();
            } else {
                showToast("Erro ao deletar registro: " + data.message, "error");
            }
        } catch (err) {
            showToast("Erro na requisição: " + err.message, "error");
        }
    });
};

// Row Modal Insertion Logic
window.openAddDbRowModal = function() {
    const container = document.getElementById('db-row-fields-container');
    container.innerHTML = '';
    
    document.getElementById('modal-db-row-title').textContent = `Inserir Registro - ${state.dbExplorer.selectedTable}`;
    
    state.dbExplorer.tableColumns.forEach(col => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const isAuto = col.extra && col.extra.includes('auto_increment');
        
        group.innerHTML = `
            <label class="form-label" for="row-input-${col.name}">
                ${escapeHTML(col.name)}
                <span style="font-size:10px; color:var(--text-muted);">
                    (${escapeHTML(col.type)})${col.nullable ? '' : ' *'}${isAuto ? ' [Auto Incremento]' : ''}
                </span>
            </label>
            <input type="text" class="form-input row-field-input" id="row-input-${col.name}" name="${col.name}" 
                   placeholder="${col.default !== null ? 'Padrão: ' + col.default : (col.nullable ? 'Nulo' : 'Obrigatório')}"
                   ${isAuto ? 'disabled' : ''}>
        `;
        container.appendChild(group);
    });
    
    document.getElementById('modal-db-row').classList.add('active');
};

async function saveDbRowSubmit(e) {
    e.preventDefault();
    const connId = document.getElementById('db-explorer-connection-select').value;
    
    const inputs = document.querySelectorAll('#db-row-fields-container .row-field-input');
    const valuesObj = {};
    
    inputs.forEach(input => {
        if (!input.disabled) {
            valuesObj[input.name] = input.value;
        }
    });
    
    const submitBtn = document.getElementById('btn-save-db-row');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salving...';
    
    const formData = new FormData();
    formData.append('action', 'db_row_insert');
    formData.append('connection_id', connId);
    formData.append('database', state.dbExplorer.selectedDb);
    formData.append('table', state.dbExplorer.selectedTable);
    formData.append('values', JSON.stringify(valuesObj));
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            closeModal('modal-db-row');
            showToast("Registro inserido com sucesso!", "success");
            fetchTableData();
        } else {
            showToast("Erro ao inserir registro: " + data.message, "error");
        }
    } catch (err) {
        showToast("Erro na requisição: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
    }
}

// 12. Upload Logic
function openUploadModal(path) {
    document.getElementById('upload-target-path').value = path;
    document.getElementById('upload-progress-container').innerHTML = '';
    document.getElementById('modal-upload').classList.add('active');
}

function initUploadEvents() {
    const dropZone = document.getElementById('upload-drop-zone');
    const filesInput = document.getElementById('upload-files-input');
    const folderInput = document.getElementById('upload-folder-input');

    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('highlight'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const items = dt.items;
        if (items) {
            handleDropItems(items);
        } else {
            handleFiles(dt.files);
        }
    });

    filesInput.addEventListener('change', function() {
        handleFiles(this.files);
        this.value = ''; // Reset
    });

    folderInput.addEventListener('change', function() {
        handleFiles(this.files);
        this.value = ''; // Reset
    });
}

function handleDropItems(items) {
    const filesToUpload = [];
    let pendingEntries = 0;

    function processEntry(entry, path = '') {
        if (entry.isFile) {
            pendingEntries++;
            entry.file(file => {
                file.customPath = path + file.name;
                filesToUpload.push(file);
                pendingEntries--;
                checkDone();
            });
        } else if (entry.isDirectory) {
            pendingEntries++;
            const dirReader = entry.createReader();
            dirReader.readEntries(entries => {
                entries.forEach(e => processEntry(e, path + entry.name + '/'));
                pendingEntries--;
                checkDone();
            });
        }
    }

    function checkDone() {
        if (pendingEntries === 0 && filesToUpload.length > 0) {
            handleFiles(filesToUpload);
        }
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                processEntry(entry);
            }
        }
    }
}

function handleFiles(files) {
    if (!files || files.length === 0) return;
    const targetPath = document.getElementById('upload-target-path').value;
    
    Array.from(files).forEach(file => {
        uploadFile(file, targetPath);
    });
}

function uploadFile(file, targetDir) {
    const container = document.getElementById('upload-progress-container');
    
    // Create progress item UI
    const itemDiv = document.createElement('div');
    itemDiv.className = 'upload-progress-item';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'upload-file-name';
    const relativePath = file.webkitRelativePath || file.customPath || file.name;
    nameDiv.textContent = relativePath;
    
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'upload-progress-bar-wrapper';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress-bar';
    progressBar.style.width = '0%';
    
    progressWrapper.appendChild(progressBar);
    itemDiv.appendChild(nameDiv);
    itemDiv.appendChild(progressWrapper);
    container.appendChild(itemDiv);
    
    // Upload via XMLHttpRequest
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    formData.append('action', 'file_upload');
    formData.append('target_dir', targetDir);
    formData.append('relative_path', relativePath);
    formData.append('file', file);
    
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
        }
    });
    
    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            try {
                const res = JSON.parse(xhr.responseText);
                if (res.success) {
                    progressBar.style.backgroundColor = 'var(--accent-success)';
                } else {
                    progressBar.style.backgroundColor = 'var(--accent-error)';
                    nameDiv.textContent += ` (Erro: ${res.message || 'Desconhecido'})`;
                }
            } catch (err) {
                progressBar.style.backgroundColor = 'var(--accent-error)';
            }
        } else {
            progressBar.style.backgroundColor = 'var(--accent-error)';
        }
        
        const refreshBtn = document.getElementById('refresh-tree-btn');
        if (refreshBtn) refreshBtn.click();
    });
    
    xhr.addEventListener('error', () => {
        progressBar.style.backgroundColor = 'var(--accent-error)';
    });
    
    xhr.open('POST', 'api.php', true);
    xhr.send(formData);
}
// Columns (Structure) Logic
window.openAddDbColumnModal = function() {
    document.getElementById('modal-db-column-title').textContent = 'Adicionar Coluna';
    document.getElementById('db-col-is-edit').value = 'false';
    document.getElementById('db-col-old-name').value = '';
    
    document.getElementById('db-col-name').value = '';
    document.getElementById('db-col-type').value = 'varchar(255)';
    document.getElementById('db-col-nullable').checked = true;
    document.getElementById('db-col-default').value = '';
    
    document.getElementById('modal-db-column').classList.add('active');
};

window.openEditDbColumnModal = function(col) {
    document.getElementById('modal-db-column-title').textContent = `Editar Coluna - ${col.name}`;
    document.getElementById('db-col-is-edit').value = 'true';
    document.getElementById('db-col-old-name').value = col.name;
    
    document.getElementById('db-col-name').value = col.name;
    document.getElementById('db-col-type').value = col.type;
    document.getElementById('db-col-nullable').checked = col.nullable;
    document.getElementById('db-col-default').value = col.default !== null ? col.default : '';
    
    document.getElementById('modal-db-column').classList.add('active');
};

window.deleteDbColumn = function(colName) {
    const connId = document.getElementById('db-explorer-connection-select').value;
    
    showConfirm(`Deseja realmente excluir a coluna "${colName}"? ISSO APAGARÁ TODOS OS DADOS DA COLUNA PERMANENTEMENTE!`, async () => {
        const formData = new FormData();
        formData.append('action', 'db_column_delete');
        formData.append('connection_id', connId);
        formData.append('database', state.dbExplorer.selectedDb);
        formData.append('table', state.dbExplorer.selectedTable);
        formData.append('column_name', colName);
        
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                showToast("Coluna excluída com sucesso!", "success");
                fetchTableStructure();
                fetchTableData();
            } else {
                showToast("Erro ao excluir coluna: " + data.message, "error");
            }
        } catch (err) {
            showToast("Erro na requisição: " + err.message, "error");
        }
    });
};

async function saveDbColumnSubmit(e) {
    e.preventDefault();
    
    const connId = document.getElementById('db-explorer-connection-select').value;
    const isEdit = document.getElementById('db-col-is-edit').value === 'true';
    const oldName = document.getElementById('db-col-old-name').value;
    const newName = document.getElementById('db-col-name').value.trim();
    const type = document.getElementById('db-col-type').value.trim();
    const nullable = document.getElementById('db-col-nullable').checked;
    const defaultValue = document.getElementById('db-col-default').value;
    
    const submitBtn = document.getElementById('btn-save-db-column');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salving...';
    
    const formData = new FormData();
    formData.append('action', isEdit ? 'db_column_modify' : 'db_column_add');
    formData.append('connection_id', connId);
    formData.append('database', state.dbExplorer.selectedDb);
    formData.append('table', state.dbExplorer.selectedTable);
    
    if (isEdit) {
        formData.append('old_name', oldName);
        formData.append('new_name', newName);
    } else {
        formData.append('column_name', newName);
    }
    formData.append('column_type', type);
    formData.append('nullable', nullable ? 'true' : 'false');
    formData.append('default_value', defaultValue);
    
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.success) {
            closeModal('modal-db-column');
            showToast(isEdit ? "Coluna modificada com sucesso!" : "Coluna adicionada com sucesso!", "success");
            fetchTableStructure();
            fetchTableData();
        } else {
            showToast("Erro ao salvar coluna: " + data.message, "error");
        }
    } catch (err) {
        showToast("Erro na requisição: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
    }
}

// 14. Markdown Preview Logic
window.mdPreviewActive = false;

window.toggleMdPreview = function() {
    window.mdPreviewActive = !window.mdPreviewActive;
    const editorEl = document.getElementById('editor');
    const mdContainer = document.getElementById('md-preview-container');
    const btn = document.getElementById('md-toggle-btn');
    
    if (window.mdPreviewActive) {
        editorEl.style.right = '50%';
        mdContainer.classList.remove('hidden');
        btn.innerHTML = '<span>❌</span> Fechar Preview';
        window.updateMdPreview();
    } else {
        editorEl.style.right = '0';
        mdContainer.classList.add('hidden');
        btn.innerHTML = '<span>👁️</span> Preview';
    }
    
    if (state.editor) {
        state.editor.resize();
    }
};

window.updateMdPreview = function() {
    if (!window.mdPreviewActive) return;
    const content = state.editor.getValue();
    if (typeof marked !== 'undefined') {
        document.getElementById('md-preview-content').innerHTML = marked.parse(content);
    }
};
