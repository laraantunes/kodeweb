
function getApiUrl(action) {
    if (!action) return 'api.php';
    const files = ['files_list', 'files_list_recursive', 'file_read', 'file_serve', 'file_save', 'file_create', 'file_upload', 'file_rename', 'file_delete'];
    const db = ['db_connections_list', 'db_connection_save', 'db_connection_delete', 'db_query_execute', 'db_list_databases', 'db_list_tables', 'db_table_structure', 'db_column_add', 'db_column_delete', 'db_column_modify', 'db_row_insert', 'db_row_update', 'db_row_delete'];
    const ftp = ['ftp_connections_list', 'ftp_connection_save', 'ftp_connection_delete', 'ftp_test', 'ftp_list', 'ftp_file_read', 'ftp_file_save', 'ftp_transfer_batch_local', 'ftp_transfer_local', 'ftp_transfer_batch_remote', 'ftp_transfer_remote', 'ftp_list_recursive', 'ftp_mkdir', 'ftp_delete', 'ftp_rename', 'ftp_file_upload'];
    const terminal = ['terminal_cmd'];
    const ssh = ['ssh_connections_list', 'ssh_connection_save', 'ssh_connection_delete', 'ssh_test_connection', 'ssh_terminal_cmd'];
    const user = ['update_user'];
    const git = ['git_repos', 'git_status', 'git_diff', 'git_action'];
    const kodeweb = ['status', 'update_kodeweb', 'update_env'];

    if (files.includes(action)) return 'api/files.php';
    if (db.includes(action)) return 'api/db.php';
    if (ftp.includes(action)) return 'api/ftp.php';
    if (terminal.includes(action)) return 'api/terminal.php';
    if (ssh.includes(action)) return 'api/ssh.php';
    if (user.includes(action)) return 'api/user.php';
    if (git.includes(action)) return 'api/git.php';
    if (kodeweb.includes(action)) return 'api/kodeweb.php';
    
    return 'api.php';
}

// app.js - Client-side logic for KodeWeb IDE

// Application State
const state = {
    workspaceRoot: '',
    localEnv: false,
    username: typeof CURRENT_USERNAME !== 'undefined' ? CURRENT_USERNAME : 'user',
    terminals: {
        'term-1': { id: 'term-1', name: 'Terminal 1', cwd: '', history: [], historyIndex: -1, outputHTML: '<div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator - Inicializado.</div>' }
    },
    activeTerminalId: 'term-1',
    terminalCounter: 1,
    openTabs: {},         // filePath -> { path, name, session, isDirty }
    activeTabPath: null,
    selectedNode: null,   // Currently highlighted element in tree { path, isDir }
    expandedFolders: new Set(),
    activeConnectionId: null,
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
    initLocalFileDrop();
    
    restorePanelsState();
    restoreTabsState();
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
    let dirtySaveTimeout;
    state.editor.on('input', () => {
        if (state.activeTabPath && state.openTabs[state.activeTabPath]) {
            const tab = state.openTabs[state.activeTabPath];
            const isClean = tab.session.getUndoManager().isClean();
            
            if (tab.isDirty !== !isClean) {
                tab.isDirty = !isClean;
                updateTabUI(state.activeTabPath);
            }
            
            // Save dirty state to localStorage
            clearTimeout(dirtySaveTimeout);
            dirtySaveTimeout = setTimeout(() => {
                if (tab.isDirty) {
                    localStorage.setItem('kodeweb_dirty_' + tab.path, tab.session.getValue());
                } else {
                    localStorage.removeItem('kodeweb_dirty_' + tab.path);
                }
            }, 500);
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
    
    if (leftBtn) leftBtn.addEventListener('click', () => togglePanel('panel-left', 'resizer-left', leftBtn));
    if (rightBtn) rightBtn.addEventListener('click', () => togglePanel('panel-right', 'resizer-right', rightBtn));
    if (bottomBtn) bottomBtn.addEventListener('click', () => togglePanel('panel-bottom', 'resizer-bottom', bottomBtn));
}

function togglePanel(panelId, resizerId, button) {
    const panel = document.getElementById(panelId);
    const resizer = document.getElementById(resizerId);
    
    panel.classList.toggle('hidden');
    if (resizer) resizer.classList.toggle('hidden');
    button.classList.toggle('active');
    
    if (state.editor) state.editor.resize();
    savePanelsState();
}

// 4. Fetch status on initialization
async function fetchSystemStatus() {
    try {
        const response = await fetch(getApiUrl('status') + '?action=status');
        const data = await response.json();
        if (data.success) {
            state.workspaceRoot = data.workspace_root;
            // Populate database driver options
            populateDbDrivers(data.pdo_drivers);
            
            state.localEnv = data.local_env;
            const envCheckbox = document.getElementById('options-env-local');
            if (envCheckbox) {
                envCheckbox.checked = data.local_env;
            }
            
            if (data.username) {
                state.username = data.username;
                const userField = document.getElementById('options-username');
                if (userField) userField.value = data.username;
            }
            
            updateTerminalPrompt(data.terminal_cwd);
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
        const response = await fetch(getApiUrl('files_list') + `?action=files_list&path=${encodeURIComponent(path)}`);
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
            
            row.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectTreeNode(row);
                showTreeContextMenu(e, row.dataset.path, file.name, file.is_dir);
            });
            
            row.draggable = true;
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', row.dataset.path);
                e.dataTransfer.effectAllowed = 'copyMove';
            });
            
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
                
                // Restore expanded state automatically
                if (state.expandedFolders.has(file.path)) {
                    subUl.classList.remove('hidden');
                    arrow.textContent = '▼';
                    loadFiles(file.path, subUl);
                }
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
        state.expandedFolders.add(row.dataset.path);
        // Reload folder contents on expansion
        loadFiles(row.dataset.path, subUl);
    } else {
        subUl.classList.add('hidden');
        arrow.textContent = '▶';
        state.expandedFolders.delete(row.dataset.path);
    }
}

function showTreeContextMenu(e, path, name, isDir) {
    let menu = document.getElementById('tree-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'tree-context-menu';
        menu.className = 'tree-context-menu';
        menu.innerHTML = `
            <div class="tree-context-menu-item" id="ctx-open" style="display: none;">👁️ Abrir</div>
            <div class="tree-context-menu-item" id="ctx-new-file" style="display: none;">📄+ Novo Arquivo</div>
            <div class="tree-context-menu-item" id="ctx-new-folder" style="display: none;">📁+ Nova Pasta</div>
            <div class="tree-context-menu-item" id="ctx-upload" style="display: none;">📤 Carregar arquivos</div>
            <div class="tree-context-menu-item" id="ctx-rename">✏️ Renomear</div>
            <div class="tree-context-menu-item danger" id="ctx-delete">❌ Excluir</div>
        `;
        document.body.appendChild(menu);
        
        window.addEventListener('click', (event) => {
            if (event.target !== menu && !menu.contains(event.target) && !event.target.classList.contains('tree-context-menu-btn')) {
                menu.classList.remove('active');
            }
        }, true);
        window.addEventListener('contextmenu', (event) => {
            if (event.target !== menu && !menu.contains(event.target)) {
                menu.classList.remove('active');
            }
        }, true);
    }

    const uploadItem = document.getElementById('ctx-upload');
    const newFileItem = document.getElementById('ctx-new-file');
    const newFolderItem = document.getElementById('ctx-new-folder');
    
    if (isDir) {
        uploadItem.style.display = 'flex';
        uploadItem.onclick = () => {
            menu.classList.remove('active');
            openUploadModal(path);
        };
        newFileItem.style.display = 'flex';
        newFileItem.onclick = () => {
            menu.classList.remove('active');
            openNewNodeModal('file', path);
        };
        newFolderItem.style.display = 'flex';
        newFolderItem.onclick = () => {
            menu.classList.remove('active');
            openNewNodeModal('dir', path);
        };
    } else {
        uploadItem.style.display = 'none';
        newFileItem.style.display = 'none';
        newFolderItem.style.display = 'none';
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
    
    if (state.openingFiles && state.openingFiles.has(path)) {
        return; // Already opening
    }
    if (!state.openingFiles) state.openingFiles = new Set();
    state.openingFiles.add(path);

    
    const ext = name.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
    const isPdf = ext === 'pdf';
    
    if (isImage || isPdf) {
        state.openTabs[path] = {
            path: path,
            name: name,
            isImage: isImage,
            isPdf: isPdf,
            isDirty: false
        };
        createTabUI(path, name);
        activateTab(path);
        state.openingFiles.delete(path);
        return;
    }

    
    try {
        const formData = new FormData();
        let isFtp = false;
        let ftpConnId = '';
        let ftpPath = path;
        
        if (path.startsWith('ftp://')) {
            isFtp = true;
            const parts = path.replace('ftp://', '').split('/');
            ftpConnId = parts.shift();
            ftpPath = '/' + parts.join('/');
            
            formData.append('action', 'ftp_file_read');
            formData.append('connection_id', ftpConnId);
            formData.append('path', ftpPath);
        } else {
            formData.append('action', 'file_read');
            formData.append('path', path);
        }
        
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        
        const mode = getAceMode(ext);
        
        // Create Edit Session
        const session = ace.createEditSession(data.content, mode);
        session.setUndoManager(new ace.UndoManager());
        
        let isDirty = false;
        const dirtyKey = 'kodeweb_dirty_' + path;
        const dirtyContent = localStorage.getItem(dirtyKey);
        
        if (dirtyContent !== null && dirtyContent !== data.content) {
            session.setValue(dirtyContent); // Makes it dirty in undo stack
            isDirty = true;
        } else if (dirtyContent !== null) {
            localStorage.removeItem(dirtyKey);
        }
        
        state.openTabs[path] = {
            path: path,
            name: name,
            session: session,
            isImage: false,
            isDirty: isDirty
        };
        
        createTabUI(path, name);
        activateTab(path);
        
        if (isDirty) {
            updateTabUI(path);
        }
    } catch (err) {
        showToast("Erro ao abrir arquivo: " + err.message, "error");
    } finally {
        if (state.openingFiles) state.openingFiles.delete(path);
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
    
    tab.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            closeTab(path);
        }
    });
    
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
    if (path === 'db_explorer') {
        updateBreadcrumb('Explorador de Banco de Dados');
    } else if (path === 'git_explorer') {
        updateBreadcrumb('Git Integrado');
    } else {
        updateBreadcrumb(path);
    }
    if (path === 'db_explorer') {
        // Hide editor, image preview and placeholder
        document.getElementById('no-file-placeholder').classList.add('hidden');
        document.getElementById('editor').classList.add('hidden');
        if(document.getElementById('image-preview-container')) document.getElementById('image-preview-container').classList.add('hidden');
        if(document.getElementById('ftp-explorer-container')) document.getElementById('ftp-explorer-container').classList.add('hidden');
        if(document.getElementById('git-explorer-container')) document.getElementById('git-explorer-container').classList.add('hidden');
        
        // Show db explorer
        document.getElementById('db-explorer-container').classList.remove('hidden');
        
        // Sync connections dropdown
        syncDbExplorerConnections();
    } else if (path && path.startsWith('ftp_explorer_')) {
        // Hide editor, DB explorer, image preview and placeholder
        document.getElementById('no-file-placeholder').classList.add('hidden');
        document.getElementById('editor').classList.add('hidden');
        if(document.getElementById('image-preview-container')) document.getElementById('image-preview-container').classList.add('hidden');
        if(document.getElementById('pdf-preview-container')) document.getElementById('pdf-preview-container').classList.add('hidden');
        document.getElementById('db-explorer-container').classList.add('hidden');
        if(document.getElementById('git-explorer-container')) document.getElementById('git-explorer-container').classList.add('hidden');
        
        // Show ftp explorer
        document.getElementById('ftp-explorer-container').classList.remove('hidden');
    } else if (path === 'git_explorer') {
        // Hide others, show git
        document.getElementById('no-file-placeholder').classList.add('hidden');
        document.getElementById('editor').classList.add('hidden');
        if(document.getElementById('image-preview-container')) document.getElementById('image-preview-container').classList.add('hidden');
        if(document.getElementById('pdf-preview-container')) document.getElementById('pdf-preview-container').classList.add('hidden');
        document.getElementById('db-explorer-container').classList.add('hidden');
        if(document.getElementById('ftp-explorer-container')) document.getElementById('ftp-explorer-container').classList.add('hidden');
        
        if(document.getElementById('git-explorer-container')) document.getElementById('git-explorer-container').classList.remove('hidden');
        
        // Load repos if not loaded
        if (document.getElementById('git-repo-select').options.length <= 1) {
            loadGitRepositories();
        }
    } else {
        // Hide db explorer and ftp explorer
        document.getElementById('db-explorer-container').classList.add('hidden');
        if(document.getElementById('ftp-explorer-container')) document.getElementById('ftp-explorer-container').classList.add('hidden');
        if(document.getElementById('git-explorer-container')) document.getElementById('git-explorer-container').classList.add('hidden');
        
        const editorEl = document.getElementById('editor');
        const placeholderEl = document.getElementById('no-file-placeholder');
        const imgContainer = document.getElementById('image-preview-container');
        const pdfContainer = document.getElementById('pdf-preview-container');
        
        if (tabInfo && tabInfo.isImage) {
            editorEl.classList.add('hidden');
            placeholderEl.classList.add('hidden');
            pdfContainer.classList.add('hidden');
            
            const imgEl = document.getElementById('image-preview-element');
            const infoEl = document.getElementById('image-preview-info');
            
            imgEl.onload = function() {
                infoEl.textContent = `${this.naturalWidth} x ${this.naturalHeight} pixels`;
            };
            
            if (tabInfo.isLocal) {
                imgEl.src = tabInfo.localDataUrl;
            } else {
                imgEl.src = getApiUrl('file_serve') + `?action=file_serve&path=${encodeURIComponent(path)}&_t=${new Date().getTime()}`;
            }
            imgContainer.classList.remove('hidden');
        } else if (tabInfo && tabInfo.isPdf) {
            editorEl.classList.add('hidden');
            placeholderEl.classList.add('hidden');
            imgContainer.classList.add('hidden');
            
            const pdfEl = document.getElementById('pdf-preview-element');
            if (tabInfo.isLocal) {
                pdfEl.src = tabInfo.localDataUrl;
            } else {
                pdfEl.src = getApiUrl('file_serve') + `?action=file_serve&path=${encodeURIComponent(path)}&_t=${new Date().getTime()}`;
            }
            pdfContainer.classList.remove('hidden');
        } else if (tabInfo) {
            if(imgContainer) imgContainer.classList.add('hidden');
            if(pdfContainer) pdfContainer.classList.add('hidden');
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
    saveTabsState();
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
    localStorage.removeItem('kodeweb_dirty_' + path);
    
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
            if(document.getElementById('pdf-preview-container')) document.getElementById('pdf-preview-container').classList.add('hidden');
            document.getElementById('db-explorer-container').classList.add('hidden');
            if(document.getElementById('ftp-explorer-container')) document.getElementById('ftp-explorer-container').classList.add('hidden');
            if(document.getElementById('git-explorer-container')) document.getElementById('git-explorer-container').classList.add('hidden');
            updateBreadcrumb('');
        }
    }
    saveTabsState();
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
    
    if (tab.isLocal) {
        // Trigger download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = tab.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        tab.isDirty = false;
        tab.session.getUndoManager().markClean();
        updateTabUI(tab.path);
        localStorage.removeItem('kodeweb_dirty_' + tab.path);
        showToast("Arquivo baixado com sucesso.", "success");
        return;
    }
    
    const formData = new FormData();
    
    if (tab.path.startsWith('ftp://')) {
        const parts = tab.path.replace('ftp://', '').split('/');
        const ftpConnId = parts.shift();
        const ftpPath = '/' + parts.join('/');
        
        formData.append('action', 'ftp_file_save');
        formData.append('connection_id', ftpConnId);
        formData.append('path', ftpPath);
    } else {
        formData.append('action', 'file_save');
        formData.append('path', tab.path);
    }
    formData.append('content', content);
    
    try {
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.success) {
            tab.isDirty = false;
            tab.session.getUndoManager().markClean();
            updateTabUI(tab.path);
            localStorage.removeItem('kodeweb_dirty_' + tab.path);
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
        'htaccess': 'ace/mode/apache_conf',
        'diff': 'ace/mode/diff',
        'patch': 'ace/mode/diff'
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
    termId = termId || state.activeTerminalId;
    const term = state.terminals[termId];
    if (!term) return;
    
    cmd = cmd.trim();
    if (!cmd) return;
    
    if (term.reconnect) return;
    
    term.history.push(cmd);
    term.historyIndex = term.history.length;
    saveTerminalState();
    
    const shortCwd = term.cwd.replace(state.workspaceRoot, 'Workspace');
    const username = state.username || 'user';
    const promptPath = term.type === 'ssh' ? `ssh@kodeweb:${term.cwd}$` : `${username}@kodeweb:${shortCwd}$`;
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
    }
}

// 8. Database Dashboard Operations
async function loadDbConnections() {
    try {
        const response = await fetch(getApiUrl('db_connections_list') + '?action=db_connections_list');
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

async function loadDbConnectionsModalList() {
    const listDiv = document.getElementById('db-connections-modal-list');
    if (!listDiv) return;
    
    listDiv.innerHTML = '<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Carregando conexões...</li>';
    try {
        const response = await fetch(getApiUrl('db_connections_list') + '?action=db_connections_list');
        const data = await response.json();
        
        if (data.success) {
            listDiv.innerHTML = '';
            if (data.connections.length === 0) {
                listDiv.innerHTML = '<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Nenhuma conexão salva.</li>';
                return;
            }
            
            data.connections.forEach(conn => {
                const li = document.createElement('li');
                li.style.padding = '10px 15px';
                li.style.borderBottom = '1px solid var(--border-color)';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';
                
                li.innerHTML = `
                    <div style="font-size: 14px; font-weight: bold; color: var(--text-primary);">
                        <span style="color: var(--accent-primary); margin-right: 5px;">🗄️</span> ${conn.name}
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${conn.driver} ${conn.driver !== 'sqlite' ? '- ' + conn.host : ''}</div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm" onclick="connectFromDbModalList('${conn.id}')">Conectar</button>
                        <button class="btn btn-sm" onclick="editDbConnection(${JSON.stringify(conn).replace(/"/g, '&quot;')}, event)">Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDbConnection('${conn.id}', event)">Excluir</button>
                    </div>
                `;
                listDiv.appendChild(li);
            });
        }
    } catch (err) {
        console.error("Erro modal db connections:", err);
        listDiv.innerHTML = '<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Erro ao carregar.</li>';
    }
}

window.connectFromDbModalList = function(id) {
    selectDbConnection(id);
    openDbExplorer();
    closeModal('modal-db-connections-list');
};

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
            const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
                loadDbConnectionsModalList();
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.success) {
            closeModal('modal-connection');
            loadDbConnections();
            loadDbConnectionsModalList();
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
    let refreshTimeout;
    document.getElementById('refresh-tree-btn').addEventListener('click', () => {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
            loadFiles();
            state.selectedNode = null;
            document.getElementById('rename-node-btn').disabled = true;
            document.getElementById('delete-node-btn').disabled = true;
        }, 100);
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
    
    document.getElementById('terminal-input').addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const input = e.target;
            const val = input.value;
            const term = state.terminals[state.activeTerminalId];
            if (!term || !term.autocompleteList) return;
            
            // split by space, respecting quotes if possible, but simple split is ok for basic use
            const parts = val.split(' ');
            const lastPart = parts.pop();
            
            if (lastPart) {
                // Find all matches
                const matches = term.autocompleteList.filter(item => item.toLowerCase().startsWith(lastPart.toLowerCase()));
                
                if (matches.length === 1) {
                    parts.push(matches[0]);
                    input.value = parts.join(' ');
                } else if (matches.length > 1) {
                    // Find common prefix
                    let commonPrefix = matches[0];
                    for (let i = 1; i < matches.length; i++) {
                        let j = 0;
                        while (j < commonPrefix.length && j < matches[i].length && commonPrefix[j].toLowerCase() === matches[i][j].toLowerCase()) {
                            j++;
                        }
                        commonPrefix = commonPrefix.substring(0, j);
                    }
                    if (commonPrefix.length > lastPart.length) {
                        parts.push(commonPrefix);
                        input.value = parts.join(' ');
                    } else {
                        // Print options to console
                        writeToTerminalConsole(matches.join('  '), 'output');
                    }
                }
            }
        } else if (e.key === 'Enter') {
            const input = e.target;
            const cmd = input.value;
            input.value = '';
            executeTerminalCommand(cmd);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const term = state.terminals[state.activeTerminalId];
            if (term && term.historyIndex > 0) {
                term.historyIndex--;
                e.target.value = term.history[term.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const term = state.terminals[state.activeTerminalId];
            if (term && term.historyIndex < term.history.length - 1) {
                term.historyIndex++;
                e.target.value = term.history[term.historyIndex];
            } else if (term) {
                term.historyIndex = term.history.length;
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
    document.getElementById('db-explorer-custom-query-btn').addEventListener('click', () => {
        openCustomDbQueryView();
    });
    document.getElementById('db-run-custom-query-btn').addEventListener('click', executeCustomDbQuery);
    document.getElementById('db-cancel-custom-query-btn').addEventListener('click', cancelCustomDbQuery);
    
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

function openNewNodeModal(type, overrideParentPath = null) {
    const parentPath = overrideParentPath !== null 
        ? overrideParentPath 
        : (state.selectedNode && state.selectedNode.dataset.isDir === 'true'
            ? state.selectedNode.dataset.path 
            : '');
        
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
                saveTabsState();
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
            const response = await fetch(getApiUrl('files_list_recursive') + '?action=files_list_recursive');
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
        const response = await fetch(getApiUrl('db_connections_list') + '?action=db_connections_list');
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
        document.getElementById('db-custom-query-container').classList.add('hidden');
        document.getElementById('db-explorer-empty-placeholder').classList.remove('hidden');
        return;
    }
    
    root.innerHTML = '<li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">Carregando bancos de dados...</li>';
    
    try {
        const response = await fetch(getApiUrl('db_list_databases') + `?action=db_list_databases&connection_id=${connId}`);
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
            const response = await fetch(getApiUrl('db_list_tables') + `?action=db_list_tables&connection_id=${connId}&database=${encodeURIComponent(dbName)}`);
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
    document.getElementById('db-custom-query-container').classList.add('hidden');
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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

function openCustomDbQueryView() {
    document.getElementById('db-explorer-empty-placeholder').classList.add('hidden');
    document.getElementById('db-table-view-container').classList.add('hidden');
    document.getElementById('db-custom-query-container').classList.remove('hidden');
    
    // Initialize Ace Editor if not yet
    if (!state.dbExplorer.customQueryEditor) {
        state.dbExplorer.customQueryEditor = ace.edit("db-custom-query-editor");
        state.dbExplorer.customQueryEditor.setTheme("ace/theme/tomorrow_night_eighties");
        state.dbExplorer.customQueryEditor.session.setMode("ace/mode/sql");
        state.dbExplorer.customQueryEditor.setOptions({
            fontSize: "14px",
            showPrintMargin: false,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true
        });
        
        state.dbExplorer.customQueryEditor.commands.addCommand({
            name: 'runCustomQuery',
            bindKey: {win: 'Ctrl-Enter',  mac: 'Command-Enter'},
            exec: function() {
                executeCustomDbQuery();
            }
        });
    }
}

async function executeCustomDbQuery() {
    if (state.dbExplorer.customQueryAbortController) {
        state.dbExplorer.customQueryAbortController.abort();
    }
    
    const editor = state.dbExplorer.customQueryEditor;
    if (!editor) return;
    
    const sql = editor.getValue().trim();
    if (!sql) {
        showToast("Digite uma consulta SQL.", "warning");
        return;
    }
    
    const connId = document.getElementById('db-explorer-connection-select').value;
    if (!connId) {
        showToast("Selecione uma conexão no Navegador DB.", "warning");
        return;
    }
    
    const resultsContainer = document.getElementById('db-custom-query-results');
    resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Executando consulta...</div>';
    
    const formData = new FormData();
    formData.append('action', 'db_query_execute');
    formData.append('connection_id', connId);
    formData.append('database', state.dbExplorer.currentDatabase || '');
    formData.append('sql', sql);
    
    state.dbExplorer.customQueryAbortController = new AbortController();
    const btnRun = document.getElementById('db-run-custom-query-btn');
    const btnCancel = document.getElementById('db-cancel-custom-query-btn');
    btnRun.style.display = 'none';
    btnCancel.style.display = 'inline-block';
    
    try {
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData, signal: state.dbExplorer.customQueryAbortController.signal });
        const data = await response.json();
        
        if (data.success) {
            if (data.is_select) {
                renderCustomQueryGrid(data.columns, data.rows);
            } else {
                resultsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--accent-success);">${data.affected_rows} linha(s) afetada(s).</div>`;
            }
        } else {
            resultsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--accent-danger);">Erro: ${data.message}</div>`;
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            resultsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--accent-warning);">Consulta abortada localmente (o servidor ainda pode estar processando em segundo plano).</div>`;
        } else {
            resultsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--accent-danger);">Erro na requisição: ${err.message}</div>`;
        }
    } finally {
        state.dbExplorer.customQueryAbortController = null;
        btnRun.style.display = 'inline-block';
        btnCancel.style.display = 'none';
    }
}

function cancelCustomDbQuery() {
    if (state.dbExplorer.customQueryAbortController) {
        state.dbExplorer.customQueryAbortController.abort();
    }
}

function renderCustomQueryGrid(columns, rows) {
    const gridContainer = document.getElementById('db-custom-query-results');
    gridContainer.innerHTML = '';
    
    if (rows.length === 0) {
        gridContainer.innerHTML = '<div style="padding:20px; color:var(--text-muted); text-align:center;">Nenhum registro retornado.</div>';
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
    thead.appendChild(trHead);
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    rows.forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            let val = row[col];
            if (val === null) {
                td.innerHTML = '<span class="db-null">NULL</span>';
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    gridContainer.appendChild(table);
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
        const response = await fetch(getApiUrl('db_table_structure') + `?action=db_table_structure&connection_id=${connId}&database=${encodeURIComponent(state.dbExplorer.selectedDb)}&table=${encodeURIComponent(state.dbExplorer.selectedTable)}`);
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
            const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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

    // File Tree drag and drop
    const fileTreeRoot = document.getElementById('file-tree-root');
    if (fileTreeRoot) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileTreeRoot.addEventListener(eventName, preventDefaults, false);
        });

        fileTreeRoot.addEventListener('dragover', (e) => {
            document.querySelectorAll('.tree-row.drag-over').forEach(el => el.classList.remove('drag-over'));
            const row = e.target.closest('.tree-row');
            if (row && row.dataset.isDir === 'true') {
                row.classList.add('drag-over');
            } else {
                fileTreeRoot.classList.add('drag-over');
            }
        });

        fileTreeRoot.addEventListener('dragleave', (e) => {
            const row = e.target.closest('.tree-row');
            if (row) {
                row.classList.remove('drag-over');
            }
            if (e.target === fileTreeRoot) {
                fileTreeRoot.classList.remove('drag-over');
            }
        });

        fileTreeRoot.addEventListener('drop', (e) => {
            document.querySelectorAll('.tree-row.drag-over').forEach(el => el.classList.remove('drag-over'));
            fileTreeRoot.classList.remove('drag-over');
            
            const dt = e.dataTransfer;
            // Check if there are items or files
            if (!dt || (!dt.items.length && !dt.files.length && !dt.getData('text/plain'))) return;
            
            let targetPath = '';
            const row = e.target.closest('.tree-row');
            if (row) {
                if (row.dataset.isDir === 'true') {
                    targetPath = row.dataset.path;
                } else {
                    const pathParts = row.dataset.path.split(/[\/\\]/);
                    pathParts.pop();
                    targetPath = pathParts.join('/');
                }
            }
            
            const ftpData = dt.getData('text/plain');
            if (ftpData && ftpData.startsWith('ftp://')) {
                transferFtpToLocal(ftpData, targetPath);
                return;
            }
            
            openUploadModal(targetPath);
            
            if (dt.items && dt.items.length > 0 && !ftpData) {
                handleDropItems(dt.items);
            } else if (dt.files && dt.files.length > 0) {
                handleFiles(dt.files);
            }
        });
    }
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
    
    xhr.open('POST', getApiUrl(formData.get('action')), true);
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
            const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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
        const response = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
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

// 14. Local Storage State Management
function savePanelsState() {
    const panels = {
        left: document.getElementById('panel-left').classList.contains('hidden'),
        right: document.getElementById('panel-right').classList.contains('hidden'),
        bottom: document.getElementById('panel-bottom').classList.contains('hidden')
    };
    localStorage.setItem('kodeweb_panels', JSON.stringify(panels));
}

function restorePanelsState() {
    try {
        const saved = JSON.parse(localStorage.getItem('kodeweb_panels'));
        if (saved) {
            if (saved.left) document.getElementById('toggle-left-btn').click();
            if (saved.right) document.getElementById('toggle-right-btn').click();
            if (saved.bottom) document.getElementById('toggle-bottom-btn').click();
        }
    } catch(e) {}
}

function saveTabsState() {
    if (typeof saveTabsState.timeout !== 'undefined') clearTimeout(saveTabsState.timeout);
    saveTabsState.timeout = setTimeout(() => {
        const tabsData = [];
        // Use DOM order to preserve drag and drop reordering
        const domTabs = document.querySelectorAll('#tabs-container .tab');
        let orderedPaths = [];
        if (domTabs.length > 0) {
            domTabs.forEach(t => orderedPaths.push(t.dataset.path));
        } else {
            orderedPaths = Object.keys(state.openTabs);
        }
        
        orderedPaths.forEach(path => {
            const t = state.openTabs[path];
            if (!t) return;
            if (t.isLocal && (t.isImage || t.isPdf)) return; // Do not persist local images or pdfs
            tabsData.push({
                path: t.path,
                name: t.name,
                isSpecial: t.isSpecial || false,
                isImage: t.isImage || false,
                isPdf: t.isPdf || false,
                isLocal: t.isLocal || false
            });
        });
        localStorage.setItem('kodeweb_tabs', JSON.stringify({
            tabs: tabsData,
            active: state.activeTabPath && state.openTabs[state.activeTabPath] && !(state.openTabs[state.activeTabPath].isLocal && (state.openTabs[state.activeTabPath].isImage || state.openTabs[state.activeTabPath].isPdf)) ? state.activeTabPath : null
        }));
    }, 200);
}

async function restoreTabsState() {
    try {
        const saved = JSON.parse(localStorage.getItem('kodeweb_tabs'));
        if (saved && saved.tabs && saved.tabs.length > 0) {
            for (const t of saved.tabs) {
                if (t.isSpecial && t.path === 'db_explorer') {
                    openDbExplorer();
                } else if (t.isSpecial && t.path === 'git_explorer') {
                    openGitExplorer();
                } else if (t.isSpecial && t.path.startsWith('ftp_explorer_')) {
                    const connId = t.path.replace('ftp_explorer_', '');
                    const connName = t.name.replace('🛜 ', '');
                    openFtpExplorer(connId, connName);
                } else if (t.isLocal) {
                    const content = localStorage.getItem('kodeweb_dirty_' + t.path);
                    if (content !== null) {
                        openLocalFile({ name: t.name, type: 'text/plain' }, content, t.path);
                    }
                } else {
                    await openFile(t.path, t.name);
                }
            }
            if (saved.active && state.openTabs[saved.active]) {
                activateTab(saved.active);
            }
        }
    } catch(e) {}
}

function initLocalFileDrop() {
    const editorWrapper = document.querySelector('.editor-wrapper');
    if (!editorWrapper) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        editorWrapper.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    
    editorWrapper.addEventListener('dragover', () => {
        editorWrapper.classList.add('drag-over');
    });
    
    editorWrapper.addEventListener('dragleave', (e) => {
        if (!editorWrapper.contains(e.relatedTarget)) {
            editorWrapper.classList.remove('drag-over');
        }
    });
    
    editorWrapper.addEventListener('drop', (e) => {
        editorWrapper.classList.remove('drag-over');
        
        const dt = e.dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) return;
        
        Array.from(dt.files).forEach(file => {
            const reader = new FileReader();
            const isImg = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            reader.onload = (event) => {
                const content = event.target.result;
                openLocalFile(file, content);
            };
            if (isImg || isPdf) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    });
}

function openLocalFile(file, content, overridePath = null) {
    const name = file.name;
    const path = overridePath || ('local://' + Date.now() + '_' + name);
    
    const ext = name.split('.').pop().toLowerCase();
    const isImg = file.type ? file.type.startsWith('image/') : ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    
    if (isImg || isPdf) {
        state.openTabs[path] = {
            path: path,
            name: name,
            isImage: isImg,
            isPdf: isPdf,
            isDirty: false,
            isLocal: true,
            localDataUrl: content
        };
        createTabUI(path, name);
        activateTab(path);
        saveTabsState();
        return;
    }
    
    const mode = getAceMode(ext);
    const session = ace.createEditSession(content, mode);
    session.setUndoManager(new ace.UndoManager());
    
    state.openTabs[path] = {
        path: path,
        name: name,
        session: session,
        isImage: false,
        isDirty: true, // Local files are always "unsaved" relative to server
        isLocal: true
    };
    
    localStorage.setItem('kodeweb_dirty_' + path, content);
    
    createTabUI(path, name);
    activateTab(path);
    updateTabUI(path);
    saveTabsState();
}

// 15. Markdown Preview Logic
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

// ==========================================
// FTP Explorer & Modal Logic
// ==========================================

let activeFtpConnId = null;

function initFtpModal() {
    const btn = document.getElementById("ftp-connections-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            document.getElementById("modal-ftp-connection").classList.add("active");
            loadFtpConnections();
            switchFtpModalTab("list");
        });
    }

    const form = document.getElementById("form-ftp-connection");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            saveFtpConnection();
        });
    }
}

function switchFtpModalTab(tabId) {
    const listBtn = document.getElementById("ftp-tab-list-btn");
    const formBtn = document.getElementById("ftp-tab-form-btn");
    const listView = document.getElementById("ftp-modal-list-view");
    const formView = document.getElementById("ftp-modal-form-view");
    
    if (tabId === "list") {
        listBtn.classList.add("active");
        formBtn.classList.remove("active");
        listView.classList.remove("hidden");
        formView.classList.add("hidden");
        loadFtpConnections();
    } else {
        formBtn.classList.add("active");
        listBtn.classList.remove("active");
        formView.classList.remove("hidden");
        listView.classList.add("hidden");
    }
}

async function loadFtpConnections() {
    const ul = document.getElementById("ftp-connections-list");
    ul.innerHTML = '<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Carregando conexões...</li>';
    
    try {
        const formData = new FormData();
        formData.append("action", "ftp_connections_list");
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
                    <div class="db-conn-meta">${escapeHTML(conn.username)}@${escapeHTML(conn.host)}:${conn.port || 21}</div>
                </div>
                <div class="db-conn-actions">
                    <button class="action-icon-btn" onclick="openFtpExplorer('${conn.id}', '${escapeHTML(conn.name)}')">🛜 Conectar</button>
                    <button class="action-icon-btn danger" onclick="deleteFtpConnection('${conn.id}')">❌</button>
                </div>
            `;
            ul.appendChild(li);
        });
    } catch (e) {
        ul.innerHTML = '<li style="color:var(--accent-danger); font-size:12px; text-align:center; padding:15px;">Erro ao carregar conexões.</li>';
    }
}

async function saveFtpConnection() {
    const id = document.getElementById("ftp-conn-id").value;
    const name = document.getElementById("ftp-conn-name").value;
    const host = document.getElementById("ftp-host").value;
    const port = document.getElementById("ftp-port").value;
    const username = document.getElementById("ftp-username").value;
    const password = document.getElementById("ftp-password").value;
    
    const formData = new FormData();
    formData.append("action", "ftp_connection_save");
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
            showToast("Conexão FTP salva com sucesso", "success");
            document.getElementById("form-ftp-connection").reset();
            document.getElementById("ftp-conn-id").value = "";
            switchFtpModalTab("list");
        } else {
            showToast(data.message, "error");
        }
    } catch (e) {
        showToast("Erro ao salvar conexão", "error");
    }
}

async function testFtpConnection() {
    const host = document.getElementById("ftp-host").value;
    const port = document.getElementById("ftp-port").value;
    const username = document.getElementById("ftp-username").value;
    const password = document.getElementById("ftp-password").value;
    
    if (!host) {
        showToast("Preencha o Host.", "error");
        return;
    }
    
    showToast("Testando conexão...", "info");
    
    const formData = new FormData();
    formData.append("action", "ftp_test");
    formData.append("host", host);
    formData.append("port", port);
    formData.append("username", username);
    formData.append("password", password);
    
    try {
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast("Conexão FTP estabelecida com sucesso!", "success");
        } else {
            showToast(data.message, "error");
        }
    } catch (e) {
        showToast("Erro de comunicação", "error");
    }
}

async function deleteFtpConnection(id) {
    showConfirm("Tem certeza que deseja excluir esta conexão FTP?", async () => {
        const formData = new FormData();
        formData.append("action", "ftp_connection_delete");
        formData.append("id", id);
        
        try {
            const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                showToast("Excluído.", "success");
                loadFtpConnections();
            } else {
                showToast(data.message, "error");
            }
        } catch (e) {}
    });
}

function openFtpExplorer(connId, name) {
    closeModal("modal-ftp-connection");
    
    const tabPath = `ftp_explorer_${connId}`;
    
    if (!state.openTabs[tabPath]) {
        state.openTabs[tabPath] = {
            path: tabPath,
            name: `🛜 ${name}`,
            isSpecial: true,
            isDirty: false
        };
        createTabUI(tabPath, `🛜 ${name}`);
    }
    
    activateTab(tabPath);
    
    document.getElementById("ftp-explorer-container").classList.remove("hidden");
    document.getElementById("ftp-explorer-title").innerHTML = `<span style="font-size: 20px;">🌐</span> ${name}`;
    
    activeFtpConnId = connId;
    loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
    initFtpDragAndDrop();
}

async function loadFtpTree(connId, path, parentElement) {
    parentElement.innerHTML = '<li style="color:var(--text-muted); font-size:12px; padding: 10px;">Carregando...</li>';
    
    try {
        const formData = new FormData();
        formData.append("action", "ftp_list");
        formData.append("connection_id", connId);
        formData.append("path", path);
        
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        parentElement.innerHTML = "";
        if (!data.items || data.items.length === 0) {
            parentElement.innerHTML = '<li style="color:var(--text-muted); font-size:12px; padding: 10px;">Vazio</li>';
            return;
        }
        
        data.items.forEach(item => {
            const li = document.createElement("li");
            li.className = "tree-row";
            li.dataset.path = item.path;
            li.dataset.isdir = item.is_dir;
            
            li.draggable = true;
            li.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", `ftp://${connId}${item.path}`);
                e.dataTransfer.effectAllowed = "copyMove";
            });
            
            const indent = path.split("/").length;
            li.style.paddingLeft = (indent * 12) + "px";
            
            const isExpanded = state.expandedFolders.has(`ftp://${connId}${item.path}`);
            
            let iconHtml = "";
            if (item.is_dir) {
                const arrow = isExpanded ? "▼" : "▶";
                iconHtml = `<span class="tree-icon arrow-icon">${arrow}</span><span class="tree-icon folder-icon">📁</span>`;
            } else {
                iconHtml = '<span class="tree-icon arrow-icon" style="opacity: 0;">▶</span><span class="tree-icon file-icon">📄</span>';
            }
            
            li.innerHTML = `${iconHtml}<span class="tree-label">${escapeHTML(item.name)}</span>`;
            parentElement.appendChild(li);
            
            let subUl = null;
            if (item.is_dir) {
                subUl = document.createElement("ul");
                subUl.className = "file-tree hidden";
                if (isExpanded) subUl.classList.remove("hidden");
                parentElement.appendChild(subUl);
                
                li.addEventListener("click", (e) => {
                    e.stopPropagation();
                    toggleFtpTree(li, subUl, connId);
                });
                
                if (isExpanded) {
                    loadFtpTree(connId, item.path, subUl);
                }
                
                li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("drag-over"); });
                li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
                li.addEventListener("drop", (e) => handleFtpDrop(e, connId, item.path, li));
            } else {
                li.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openFile(`ftp://${connId}${item.path}`, item.name);
                });
            }
            
            const contextMenuBtn = document.createElement('span');
            contextMenuBtn.className = 'tree-context-menu-btn';
            contextMenuBtn.textContent = '⋮';
            contextMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showFtpContextMenu(e, connId, item.path, item.name, item.is_dir);
            });
            li.appendChild(contextMenuBtn);
            
            li.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                showFtpContextMenu(e, connId, item.path, item.name, item.is_dir);
            });
        });
    } catch (e) {
        parentElement.innerHTML = `<li style="color:var(--accent-danger); font-size:12px; padding: 10px;">Erro: ${e.message}</li>`;
    }
}

function toggleFtpTree(row, subUl, connId) {
    const arrow = row.querySelector(".arrow-icon");
    const path = `ftp://${connId}${row.dataset.path}`;
    if (subUl.classList.contains("hidden")) {
        subUl.classList.remove("hidden");
        arrow.textContent = "▼";
        state.expandedFolders.add(path);
        loadFtpTree(connId, row.dataset.path, subUl);
    } else {
        subUl.classList.add("hidden");
        arrow.textContent = "▶";
        state.expandedFolders.delete(path);
    }
}

function showFtpContextMenu(e, connId, path, name, isDir) {
    let menu = document.getElementById("tree-context-menu");
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'tree-context-menu';
        menu.className = 'tree-context-menu';
        menu.innerHTML = `
            <div class="tree-context-menu-item" id="ctx-open" style="display: none;">👁️ Abrir</div>
            <div class="tree-context-menu-item" id="ctx-new-file" style="display: none;">📄+ Novo Arquivo</div>
            <div class="tree-context-menu-item" id="ctx-new-folder" style="display: none;">📁+ Nova Pasta</div>
            <div class="tree-context-menu-item" id="ctx-upload" style="display: none;">📤 Carregar arquivos</div>
            <div class="tree-context-menu-item" id="ctx-rename">✏️ Renomear</div>
            <div class="tree-context-menu-item danger" id="ctx-delete">❌ Excluir</div>
        `;
        document.body.appendChild(menu);
        
        window.addEventListener('click', (event) => {
            if (event.target !== menu && !menu.contains(event.target) && !event.target.classList.contains('tree-context-menu-btn')) {
                menu.classList.remove('active');
            }
        }, true);
        window.addEventListener('contextmenu', (event) => {
            if (event.target !== menu && !menu.contains(event.target)) {
                menu.classList.remove('active');
            }
        }, true);
    }
    
    const uploadItem = document.getElementById("ctx-upload");
    const openItem = document.getElementById("ctx-open");
    const newFileItem = document.getElementById("ctx-new-file");
    const newFolderItem = document.getElementById("ctx-new-folder");
    
    if (isDir) {
        uploadItem.style.display = "flex";
        newFileItem.style.display = "flex";
        newFolderItem.style.display = "flex";
        openItem.style.display = "none";
        
        uploadItem.onclick = () => {
            menu.classList.remove("active");
            document.getElementById("upload-target-path").value = `ftp://${connId}${path}`;
            document.getElementById("modal-upload").classList.add("active");
        };
        newFileItem.onclick = () => {
            menu.classList.remove("active");
            ftpNewFile(connId, path);
        };
        newFolderItem.onclick = () => {
            menu.classList.remove("active");
            ftpNewFolder(connId, path);
        };
    } else {
        uploadItem.style.display = "none";
        newFileItem.style.display = "none";
        newFolderItem.style.display = "none";
        openItem.style.display = "flex";
        
        openItem.onclick = () => {
            menu.classList.remove("active");
            ftpOpenFile(connId, path, name);
        };
    }

    document.getElementById("ctx-rename").onclick = () => {
        menu.classList.remove("active");
        showPrompt("Renomear no FTP", "Novo nome:", name, (newName) => {
            if (newName && newName !== name) {
                const parts = path.split("/");
                parts.pop();
                const newPath = parts.join("/") + "/" + newName;
                const formData = new FormData();
                formData.append("action", "ftp_rename");
                formData.append("connection_id", connId);
                formData.append("old_path", path);
                formData.append("new_path", newPath);
                
                fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        showToast("Renomeado com sucesso", "success");
                        loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
                    } else showToast(data.message, "error");
                });
            }
        });
    };
    
    document.getElementById("ctx-delete").onclick = () => {
        menu.classList.remove("active");
        showConfirm(`Deseja deletar ${name} do FTP?`, () => {
            const formData = new FormData();
            formData.append("action", "ftp_delete");
            formData.append("connection_id", connId);
            formData.append("path", path);
            formData.append("is_dir", isDir);
            
            fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    showToast("Deletado", "success");
                    const parts = path.split("/");
                    parts.pop();
                    loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
                } else showToast(data.message, "error");
            });
        });
    };

    menu.classList.add("active");
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
}

async function handleFtpDrop(e, connId, targetPath, highlightElement) {
    e.preventDefault();
    e.stopPropagation();
    if (highlightElement) highlightElement.classList.remove("drag-over");
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    const localPathStr = e.dataTransfer.getData("text/plain");
    if (localPathStr && !localPathStr.startsWith("ftp://")) {
        showToast("Iniciando transferência...", "info");
        transferLocalToFtp(localPathStr, connId, targetPath);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFilesToFtp(e.dataTransfer.files, connId, targetPath);
    }
}

function initFtpDragAndDrop() {
    const root = document.getElementById("ftp-explorer-container");
    root.addEventListener("dragover", (e) => { e.preventDefault(); });
    root.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === root || e.target.id === "ftp-drop-zone" || e.target.id === "ftp-tree-root") {
            handleFtpDrop(e, activeFtpConnId, "/", null);
        }
    });
}

function initFtpToolbar() {
    document.getElementById('ftp-new-file-btn').addEventListener('click', () => {
        if (!activeFtpConnId) return;
        ftpNewFile(activeFtpConnId, "/");
    });
    document.getElementById('ftp-new-folder-btn').addEventListener('click', () => {
        if (!activeFtpConnId) return;
        ftpNewFolder(activeFtpConnId, "/");
    });
    document.getElementById('ftp-refresh-btn').addEventListener('click', () => {
        if (!activeFtpConnId) return;
        loadFtpTree(activeFtpConnId, "/", document.getElementById("ftp-tree-root"));
    });
}

function ftpNewFile(connId, basePath) {
    showPrompt("Novo Arquivo no FTP", "Nome do arquivo:", "", (fileName) => {
        if (fileName) {
            const targetPath = (basePath === "/" ? "" : basePath) + "/" + fileName;
            const formData = new FormData();
            formData.append("action", "ftp_file_save");
            formData.append("connection_id", connId);
            formData.append("path", targetPath);
            formData.append("content", "");
            
            fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    showToast("Arquivo criado", "success");
                    loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
                } else showToast(data.message, "error");
            });
        }
    });
}

function ftpNewFolder(connId, basePath) {
    showPrompt("Nova Pasta no FTP", "Nome da pasta:", "", (folderName) => {
        if (folderName) {
            const targetPath = (basePath === "/" ? "" : basePath) + "/" + folderName;
            const formData = new FormData();
            formData.append("action", "ftp_mkdir");
            formData.append("connection_id", connId);
            formData.append("path", targetPath);
            
            fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    showToast("Pasta criada", "success");
                    loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
                } else showToast(data.message, "error");
            });
        }
    });
}

async function ftpOpenFile(connId, path, name) {
    showToast(`Baixando ${name} do FTP...`, "info");
    const formData = new FormData();
    formData.append("action", "ftp_file_read");
    formData.append("connection_id", connId);
    formData.append("path", path);
    
    try {
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            // For now, we open it in the editor as a local temporary file or just display it?
            // Actually, we can open it natively by passing it to openFile but with a special path format!
            // Or we just save it locally to a temp folder and open that?
            // Wait, opening FTP file directly is supported by just setting the editor content, but saving will need to go to FTP!
            // The system handles saving via activeFilePath. We could prefix the path with `ftp://...`
            // Let's create an ftp temp path in the workspace.
            
            // For now, save it to a `.ftp_cache` local folder?
            // Wait, I can just use transferFtpToLocal to download to root, then open it!
            showToast("Abrindo não implementado via cache, enviando para pasta local.");
            transferFtpToLocal(`ftp://${connId}${path}`, "/");
        } else {
            showToast(data.message, "error");
        }
    } catch(e) {
        showToast("Erro ao abrir arquivo.", "error");
    }
}

async function transferLocalToFtp(localPathStr, connId, targetDir) {
    try {
        const formData = new FormData();
        formData.append("action", "files_list_recursive");
        formData.append("dir", localPathStr);
        
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const filesToTransfer = data.files;
        if (filesToTransfer.length === 0) {
            showToast("Nenhum arquivo para transferir.", "info");
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        let processedCount = 0;
        const totalFiles = filesToTransfer.length;
        
        const progressContainer = document.getElementById("upload-progress-container");
        document.getElementById("modal-upload").classList.add("active");
        progressContainer.innerHTML = `<h4 style="margin-bottom:10px;">Transferindo ${totalFiles} arquivos para o FTP...</h4>
                                       <div id="batch-progress" style="margin-bottom: 10px; font-weight: bold;">Preparando lotes...</div>`;
        const batchProgressEl = document.getElementById("batch-progress");

        const localPathSegments = localPathStr.replace(/\\/g, "/").split("/");
        localPathSegments.pop();
        const localParentDir = localPathSegments.join("/");

        // Batch files into chunks of 100
        const batchSize = 100;
        for (let i = 0; i < totalFiles; i += batchSize) {
            const batch = filesToTransfer.slice(i, i + batchSize);
            const batchPayload = [];
            
            for (const file of batch) {
                let relPath = file.path.replace(/\\/g, "/");
                
                let finalRelPath = relPath;
                if (localParentDir && relPath.startsWith(localParentDir + "/")) {
                    finalRelPath = relPath.substring(localParentDir.length + 1);
                } else if (localParentDir === "" && relPath.startsWith("/")) {
                    finalRelPath = relPath.substring(1);
                }
                
                let ftpDestPath = (targetDir === "/" ? "" : targetDir) + "/" + finalRelPath;
                ftpDestPath = ftpDestPath.replace(/\/+/g, "/");
                
                batchPayload.push({
                    local_path: file.path,
                    ftp_path: ftpDestPath
                });
            }
            
            batchProgressEl.innerHTML = `Transferindo lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(totalFiles/batchSize)}... (${processedCount}/${totalFiles})`;
            
            const tfData = new FormData();
            tfData.append("action", "ftp_transfer_batch_local");
            tfData.append("connection_id", connId);
            tfData.append("files", JSON.stringify(batchPayload));
            
            try {
                const trRes = await fetch(getApiUrl(tfData.get('action')), { method: 'POST', body: tfData });
                const trData = await trRes.json();
                if (trData.success && trData.results) {
                    for (const result of trData.results) {
                        if (result.success) successCount++;
                        else errorCount++;
                    }
                } else {
                    errorCount += batch.length;
                }
            } catch (e) {
                errorCount += batch.length;
            }
            
            processedCount += batch.length;
            batchProgressEl.innerHTML = `Processado ${processedCount}/${totalFiles}...`;
        }
        
        showToast(`Transferência concluída: ${successCount} sucesso, ${errorCount} erros.`, successCount > 0 ? "success" : "error");
        loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
        
    } catch (e) {
        showToast("Erro na transferência: " + e.message, "error");
    }
}

async function uploadFilesToFtp(files, connId, targetDir) {
    const formData = new FormData();
    formData.append("action", "ftp_file_upload");
    formData.append("connection_id", connId);
    formData.append("target_dir", targetDir);
    
    for (let i = 0; i < files.length; i++) {
        formData.append("files[]", files[i]);
        if (files[i].webkitRelativePath) {
            formData.append("paths[]", files[i].webkitRelativePath);
        } else {
            formData.append("paths[]", files[i].name);
        }
    }
    
    showToast("Enviando arquivos...", "info");
    fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast(`${data.uploaded} arquivo(s) enviados.`, "success");
            loadFtpTree(connId, "/", document.getElementById("ftp-tree-root"));
        } else {
            showToast(data.message || "Erro no upload.", "error");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initFtpModal();
    initFtpToolbar();
});


async function transferFtpToLocal(ftpPathStr, targetDir) {
    try {
        const urlObj = new URL(ftpPathStr);
        const connId = urlObj.host;
        let ftpPath = urlObj.pathname;
        if (!ftpPath.startsWith('/')) ftpPath = '/' + ftpPath;
        
        const formData = new FormData();
        formData.append("action", "ftp_list_recursive");
        formData.append("connection_id", connId);
        formData.append("path", ftpPath);
        
        const res = await fetch(getApiUrl(formData.get('action')), { method: 'POST', body: formData });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.message);
        
        const filesToTransfer = data.files;
        if (!filesToTransfer || filesToTransfer.length === 0) {
            showToast("Nenhum arquivo para transferir.", "info");
            return;
        }
        
        showToast(`Baixando ${filesToTransfer.length} arquivos...`, "info");
        
        let successCount = 0;
        let errorCount = 0;
        let processedCount = 0;
        const totalFiles = filesToTransfer.length;
        
        const progressContainer = document.getElementById("upload-progress-container");
        document.getElementById("modal-upload").classList.add("active");
        progressContainer.innerHTML = `<h4 style="margin-bottom:10px;">Baixando ${totalFiles} arquivos do FTP...</h4>
                                       <div id="batch-progress" style="margin-bottom: 10px; font-weight: bold;">Preparando lotes...</div>`;
        const batchProgressEl = document.getElementById("batch-progress");
        
        const ftpPathSegments = ftpPath.split("/").filter(s => s);
        ftpPathSegments.pop(); // Remove the item's own name to get its parent directory
        const ftpParentDir = ftpPathSegments.join("/");
        
        // Batch files into chunks of 100
        const batchSize = 100;
        for (let i = 0; i < totalFiles; i += batchSize) {
            const batch = filesToTransfer.slice(i, i + batchSize);
            const batchPayload = [];
            
            for (const file of batch) {
                let relPath = file.path.replace(/\\/g, "/");
                
                let finalRelPath = relPath;
                if (ftpParentDir && relPath.startsWith(ftpParentDir + "/")) {
                    finalRelPath = relPath.substring(ftpParentDir.length + 1);
                } else if (ftpParentDir === "" && relPath.startsWith("/")) {
                    finalRelPath = relPath.substring(1);
                }
                
                let localDestPath = (targetDir === "/" || targetDir === "" ? "" : targetDir) + "/" + finalRelPath;
                localDestPath = localDestPath.replace(/\/+/g, "/");
                if (localDestPath.startsWith("/")) localDestPath = localDestPath.substring(1);
                
                let fullFtpFilePath = (ftpPath.endsWith(relPath) ? ftpPath : ftpPath + '/' + relPath).replace(/\/+/g, "/");
                if (filesToTransfer.length === 1) fullFtpFilePath = ftpPath;
                
                batchPayload.push({
                    ftp_path: fullFtpFilePath,
                    local_path: localDestPath
                });
            }
            
            batchProgressEl.innerHTML = `Baixando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(totalFiles/batchSize)}... (${processedCount}/${totalFiles})`;
            
            const tfData = new FormData();
            tfData.append("action", "ftp_transfer_batch_remote");
            tfData.append("connection_id", connId);
            tfData.append("files", JSON.stringify(batchPayload));
            
            try {
                const trRes = await fetch(getApiUrl(tfData.get('action')), { method: 'POST', body: tfData });
                const trData = await trRes.json();
                if (trData.success && trData.results) {
                    for (const result of trData.results) {
                        if (result.success) successCount++;
                        else errorCount++;
                    }
                } else {
                    errorCount += batch.length;
                }
            } catch (e) {
                errorCount += batch.length;
            }
            
            processedCount += batch.length;
            batchProgressEl.innerHTML = `Processado ${processedCount}/${totalFiles}...`;
        }
        
        showToast(`Transferência concluída: ${successCount} sucesso, ${errorCount} erros.`, successCount > 0 ? "success" : "error");
        loadFileTree();
        setTimeout(() => closeModal('modal-upload'), 2000);
        
    } catch (e) {
        showToast("Erro na transferência: " + e.message, "error");
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
    
    if (!restoreTerminalState()) {
        // Set initial WORKSPACE_ROOT to term-1 if it was loaded
        if (state.terminals['term-1']) {
            setTimeout(renderTerminalTabs, 1000); // Give it a sec to load the UI
        }
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
    
    localStorage.setItem('kodeweb_terminals', JSON.stringify(termState));
}

function restoreTerminalState() {
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
