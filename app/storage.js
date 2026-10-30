// 14. Local Storage State Management
function savePanelsState() {
    const panels = {
        left: document.getElementById('panel-left').classList.contains('hidden'),
        right: document.getElementById('panel-right').classList.contains('hidden'),
        bottom: document.getElementById('panel-bottom').classList.contains('hidden')
    };
    try {
        localStorage.setItem('kodeweb_panels', JSON.stringify(panels));
        try {
            localStorage.setItem('kodeweb_expanded_folders', JSON.stringify(Array.from(state.expandedFolders)));
        } catch(e) {}
    } catch(e) {}
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
                isLocal: t.isLocal || false,
                isNew: t.isNew || false,
                isDirty: t.isDirty || false
            });
        });
        try {
            localStorage.setItem('kodeweb_tabs', JSON.stringify({
                tabs: tabsData,
                active: state.activeTabPath && state.openTabs[state.activeTabPath] && !(state.openTabs[state.activeTabPath].isLocal && (state.openTabs[state.activeTabPath].isImage || state.openTabs[state.activeTabPath].isPdf)) ? state.activeTabPath : null
            }));
        } catch(e) {}
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
                        openLocalFile({ name: t.name, type: 'text/plain' }, content, t.path, null, t.isDirty !== false);
                    }
                } else if (t.isNew) {
                    state.openTabs[t.path] = {
                        path: t.path,
                        name: t.name,
                        isLocal: false,
                        isNew: true,
                        session: ace.createEditSession("", "ace/mode/text")
                    };
                    const content = localStorage.getItem('kodeweb_dirty_' + t.path);
                    if (content !== null) {
                        state.openTabs[t.path].session.setValue(content);
                        state.openTabs[t.path].isDirty = true;
                    }
                    if (typeof createTabUI === 'function') createTabUI(t.path, t.name);
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
        if (!dt) return;

        // Prefer File System Access API handles when available so Ctrl+S can save directly to disk
        if (dt.items && dt.items.length > 0 && typeof dt.items[0].getAsFileSystemHandle === 'function') {
            const handlePromises = Array.from(dt.items)
                .filter(item => item.kind === 'file')
                .map(item => item.getAsFileSystemHandle());

            Promise.all(handlePromises).then(async (handles) => {
                for (const handle of handles) {
                    if (handle && handle.kind === 'file') {
                        await processLocalFileHandle(handle);
                    }
                }
            }).catch(err => {
                console.error('Erro ao processar arquivo arrastado via FileSystemHandle:', err);
            });
            return;
        }

        if (!dt.files || dt.files.length === 0) return;
        
        Array.from(dt.files).forEach(file => {
            readAndOpenLocalFile(file, null);
        });
    });
}

function initFileHandler() {
    if ('launchQueue' in window) {
        window.launchQueue.setConsumer(async (launchParams) => {
            if (!launchParams || !launchParams.files || launchParams.files.length === 0) {
                return;
            }
            for (const fileHandle of launchParams.files) {
                try {
                    if (fileHandle.kind && fileHandle.kind !== 'file') continue;
                    await processLocalFileHandle(fileHandle);
                } catch (err) {
                    console.error('Erro ao abrir arquivo via PWA File Handler:', err);
                    if (typeof showToast === 'function') {
                        showToast('Erro ao abrir arquivo local: ' + err.message, 'error');
                    }
                }
            }
        });
    }

    // Consume any pending files queued during login screen redirect
    if ('indexedDB' in window) {
        try {
            const req = indexedDB.open('kodeweb_pwa_db', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('pending_files')) {
                    db.createObjectStore('pending_files', { autoIncrement: true });
                }
            };
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('pending_files')) return;
                const tx = db.transaction('pending_files', 'readwrite');
                const store = tx.objectStore('pending_files');
                const getAllReq = store.getAll();
                getAllReq.onsuccess = async () => {
                    const handles = getAllReq.result || [];
                    if (handles.length > 0) {
                        const clearTx = db.transaction('pending_files', 'readwrite');
                        clearTx.objectStore('pending_files').clear();
                        for (const fileHandle of handles) {
                            try {
                                await processLocalFileHandle(fileHandle);
                            } catch (err) {
                                console.error('Erro ao abrir arquivo pendente pós-login:', err);
                            }
                        }
                    }
                };
            };
        } catch (e) {}
    }
}

async function processLocalFileHandle(fileHandle) {
    // Check if this exact FileSystemFileHandle is already open in a tab
    for (const existingPath of Object.keys(state.openTabs)) {
        const existingTab = state.openTabs[existingPath];
        if (existingTab && existingTab.fileHandle && typeof existingTab.fileHandle.isSameEntry === 'function') {
            try {
                if (await existingTab.fileHandle.isSameEntry(fileHandle)) {
                    activateTab(existingPath);
                    return;
                }
            } catch (e) {}
        }
    }

    const file = await fileHandle.getFile();

    // Check if there is a restored local tab with the same name and no fileHandle yet
    for (const existingPath of Object.keys(state.openTabs)) {
        const existingTab = state.openTabs[existingPath];
        if (existingTab && existingTab.isLocal && !existingTab.fileHandle && existingTab.name === file.name && !existingTab.isDirty) {
            existingTab.fileHandle = fileHandle;
            if (!existingTab.isImage && !existingTab.isPdf && existingTab.session) {
                const textContent = await file.text();
                existingTab.session.setValue(textContent);
                existingTab.session.getUndoManager().markClean();
                existingTab.isDirty = false;
                localStorage.setItem('kodeweb_dirty_' + existingPath, textContent);
                updateTabUI(existingPath);
            }
            activateTab(existingPath);
            return;
        }
    }

    readAndOpenLocalFile(file, fileHandle);
}

function readAndOpenLocalFile(file, fileHandle = null) {
    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();
    const isImg = (file.type && file.type.startsWith('image/') && ext !== 'svg') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    reader.onload = (event) => {
        const content = event.target.result;
        openLocalFile(file, content, null, fileHandle);
    };
    if (isImg || isPdf) {
        reader.readAsDataURL(file);
    } else {
        reader.readAsText(file);
    }
}

function openLocalFile(file, content, overridePath = null, fileHandle = null, initialDirty = null) {
    const name = file.name;
    const path = overridePath || ('local://' + Date.now() + '_' + Math.random().toString(36).substring(2, 6) + '_' + name);
    
    const ext = name.split('.').pop().toLowerCase();
    const isImg = (file.type ? (file.type.startsWith('image/') && ext !== 'svg') : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(ext)) && (typeof content === 'string' && content.startsWith('data:image/'));
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';
    
    if (isImg || isPdf) {
        state.openTabs[path] = {
            path: path,
            name: name,
            isImage: isImg,
            isPdf: isPdf,
            isDirty: false,
            isLocal: true,
            fileHandle: fileHandle || null,
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
    
    const isDirty = initialDirty !== null ? initialDirty : !fileHandle;

    state.openTabs[path] = {
        path: path,
        name: name,
        session: session,
        isImage: false,
        isDirty: isDirty,
        isLocal: true,
        fileHandle: fileHandle || null
    };
    
    localStorage.setItem('kodeweb_dirty_' + path, content);
    
    createTabUI(path, name);
    activateTab(path);
    updateTabUI(path);
    saveTabsState();
}
