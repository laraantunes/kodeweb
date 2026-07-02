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
                isLocal: t.isLocal || false
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
