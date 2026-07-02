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
