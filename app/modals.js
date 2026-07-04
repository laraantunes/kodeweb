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
        if (!e.key) return;
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
        let theme = window.EDITOR_THEME || "dracula";
        if (theme === 'darcula') theme = 'dracula';
        state.dbExplorer.customQueryEditor.setTheme("ace/theme/" + theme);
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
