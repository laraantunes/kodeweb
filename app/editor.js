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
