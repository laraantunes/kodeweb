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

