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
