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
