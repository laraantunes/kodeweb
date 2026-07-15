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
                        <button class="btn btn-sm" onclick="duplicateDbConnection(${JSON.stringify(conn).replace(/"/g, '&quot;')}, event)">Duplicar</button>
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
                        <button class="btn btn-sm" onclick="duplicateDbConnection(${JSON.stringify(conn).replace(/"/g, '&quot;')}, event)">Duplicar</button>
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
    if (document.getElementById('db-conn-duplicate-from')) {
        document.getElementById('db-conn-duplicate-from').value = '';
    }
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
    if (document.getElementById('db-conn-duplicate-from')) {
        document.getElementById('db-conn-duplicate-from').value = '';
    }
    document.getElementById('db-conn-name').value = conn.name;
    document.getElementById('db-driver').value = conn.driver;
    document.getElementById('db-host').value = conn.host || '';
    document.getElementById('db-port').value = conn.port || '';
    document.getElementById('db-username').value = conn.username || '';
    document.getElementById('db-password').value = conn.has_password ? '********' : '';
    document.getElementById('db-database').value = conn.database || '';
    
    toggleDbConnectionFields();
    document.getElementById('modal-connection').classList.add('active');
};

window.duplicateDbConnection = function(conn, e) {
    if (e) e.stopPropagation();
    document.getElementById('modal-conn-title').textContent = 'Duplicar Conexão';
    document.getElementById('db-conn-id').value = '';
    if (document.getElementById('db-conn-duplicate-from')) {
        document.getElementById('db-conn-duplicate-from').value = conn.id;
    }
    document.getElementById('db-conn-name').value = conn.name + ' (Cópia)';
    document.getElementById('db-driver').value = conn.driver;
    document.getElementById('db-host').value = conn.host || '';
    document.getElementById('db-port').value = conn.port || '';
    document.getElementById('db-username').value = conn.username || '';
    document.getElementById('db-password').value = conn.has_password ? '********' : '';
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
    const duplicateFrom = document.getElementById('db-conn-duplicate-from') ? document.getElementById('db-conn-duplicate-from').value : '';
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
    formData.append('duplicate_from', duplicateFrom);
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
