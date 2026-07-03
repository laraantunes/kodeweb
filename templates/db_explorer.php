<!-- Database Explorer Panel -->
<div id="db-explorer-container" class="hidden">
    <!-- Sidebar for Databases & Tables Tree -->
    <aside class="db-explorer-sidebar">
        <div class="db-explorer-sidebar-header">
            <span>Navegador DB</span>
            <div style="display: flex; gap: 8px;">
                <button class="action-icon-btn" id="db-explorer-custom-query-btn" title="Nova Consulta SQL">📝</button>
                <button class="action-icon-btn" id="db-explorer-refresh-btn" title="Recarregar Estrutura">🔄</button>
            </div>
        </div>
        <div class="db-explorer-connection-select-container">
            <label for="db-explorer-connection-select" style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:4px;">Conexão:</label>
            <select id="db-explorer-connection-select" class="form-input" style="padding:4px 8px; font-size:12px;">
                <option value="">Selecione...</option>
            </select>
        </div>
        <div class="db-explorer-sidebar-content">
            <ul class="file-tree" id="db-tree-root">
                <li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">
                    Selecione uma conexão para listar os bancos.
                </li>
            </ul>
        </div>
    </aside>
    
    <!-- Main Content Area for selected Table -->
    <main class="db-explorer-content">
        <div id="db-explorer-empty-placeholder" class="db-explorer-placeholder">
            <h3>Gerenciador de Banco de Dados</h3>
            <p style="color: var(--text-muted); font-size:13px; margin-top:8px;">Selecione uma tabela na árvore lateral para visualizar e editar seus dados e estrutura.</p>
        </div>
        
        <div id="db-custom-query-container" class="hidden" style="display: flex; flex-direction: column; height: 100%;">
            <div class="db-table-header">
                <div class="db-table-title-section">
                    <span class="db-table-badge" style="background-color: var(--accent-primary);">SQL</span>
                    <h2>Consulta SQL Personalizada</h2>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm" id="db-cancel-custom-query-btn" style="display: none;">🛑 Cancelar</button>
                    <button class="btn btn-primary btn-sm" id="db-run-custom-query-btn">▶️ Executar Consulta</button>
                </div>
            </div>
            <div style="padding: 15px; display: flex; flex-direction: column; gap: 15px; flex: 1; overflow: hidden;">
                <div id="db-custom-query-editor" style="height: 250px; border: 1px solid var(--border-color); border-radius: 4px;"></div>
                <div id="db-custom-query-results" style="flex: 1; overflow: auto; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary);">
                    <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Os resultados da sua consulta aparecerão aqui.</div>
                </div>
            </div>
        </div>
        
        <div id="db-table-view-container" class="hidden">
            <div class="db-table-header">
                <div class="db-table-title-section">
                    <span class="db-table-badge">Tabela</span>
                    <h2 id="db-table-title">tabela</h2>
                </div>
                <div class="db-table-tabs">
                    <button class="db-tab-btn active" id="db-tab-data-btn">Dados</button>
                    <button class="db-tab-btn" id="db-tab-structure-btn">Estrutura</button>
                </div>
            </div>
            
            <!-- Tab content: Data -->
            <div class="db-tab-content" id="db-tab-data-content">
                <div class="db-data-toolbar">
                    <div class="db-search-box-container">
                        <input type="text" id="db-data-search-query" class="form-input" placeholder="SELECT * FROM tabela LIMIT 5" />
                        <button class="btn btn-primary btn-sm" id="db-data-run-query-btn">Filtrar</button>
                    </div>
                    <button class="btn btn-sm" id="db-data-add-row-btn" style="background-color: var(--accent-success); border-color: var(--accent-success); color: #0b0114;">+ Inserir Registro</button>
                </div>
                
                <div class="db-data-grid-container" id="db-data-grid-container">
                    <!-- Dynamic table data grid loads here -->
                </div>
                
                <!-- Pagination Footer -->
                <div class="db-data-pagination">
                    <div class="db-pagination-info" id="db-pagination-info">
                        Mostrando registros
                    </div>
                    <div class="db-pagination-controls">
                        <button class="btn btn-sm" id="db-pagination-prev-btn" disabled>Anterior</button>
                        <span class="db-pagination-page" id="db-pagination-page-label">Página 1</span>
                        <button class="btn btn-sm" id="db-pagination-next-btn">Próxima</button>
                    </div>
                </div>
            </div>
            
            <!-- Tab content: Structure -->
            <div class="db-tab-content hidden" id="db-tab-structure-content">
                <div class="db-structure-toolbar">
                    <button class="btn btn-primary btn-sm" id="db-structure-add-column-btn">+ Adicionar Coluna</button>
                </div>
                <div class="db-structure-grid-container">
                    <table class="db-results-table" style="font-size: 13px;">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Nulável</th>
                                <th>Chave</th>
                                <th>Padrão</th>
                                <th>Extra</th>
                                <th style="width: 120px; text-align: center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="db-table-structure-body">
                            <!-- Dynamic structure columns load here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>
</div>
