<?php 
require_once('auth.php');
require_once('config.php'); 
?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KodeWeb IDE</title>
    <!-- Favicon link -->
    <link rel="icon" type="image/svg+xml" href="logo.svg">
    <link rel="stylesheet" href="style.css">

    <!-- Ace Editor Library from CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/ace.js" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/ext-language_tools.min.js" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js" referrerpolicy="no-referrer"></script>

</head>

<body>

    <!-- Header bar -->
    <header class="top-header">
        <div class="logo-section">
            <img src="logo.svg" alt="KodeWeb Logo"
                style="height: 28px; width: 28px; vertical-align: middle; margin-right: 6px;">
            <span class="app-title">KodeWeb IDE</span>
            <?= ($local) ? "<span style=color:red>LOCAL</span>" : "" ?>
        </div>

        <!-- File Breadcrumb -->
        <div class="breadcrumb-section" id="breadcrumb">
            Nenhum arquivo aberto
        </div>

        <!-- Toggle buttons on the right -->
        <div class="panel-toggles">
            <button class="toggle-btn active tooltip-right" id="toggle-left-btn" data-tooltip="Exibir/Ocultar Explorer">
                <span>📁</span> Arquivos
            </button>
            <button class="toggle-btn active tooltip-right" id="toggle-bottom-btn"
                data-tooltip="Exibir/Ocultar Terminal">
                <span>🖥️</span> Terminal
            </button>
            <button class="toggle-btn active tooltip-right" id="toggle-right-btn"
                data-tooltip="Exibir/Ocultar Banco de Dados">
                <span>🔌</span> Banco de Dados
            </button>
            <button class="toggle-btn tooltip-right" id="help-btn" data-tooltip="Atalhos e Ajuda">
                <span>❓</span> Ajuda
            </button>
            <button class="toggle-btn" id="logout-btn" onclick="window.location.href='logout.php'" style="margin-left: 10px; color: var(--accent-danger); border-color: var(--accent-danger);">
                <span>🚪</span> Sair
            </button>
        </div>
    </header>

    <!-- Workspace container -->
    <div class="workspace">

        <!-- Left panel (Files Explorer) -->
        <aside class="sidebar-panel" id="panel-left" style="width: 270px;">
            <div class="sidebar-header">
                <span>Explorer</span>
                <div class="panel-actions">
                    <button class="action-icon-btn" id="new-file-btn" data-tooltip="Novo Arquivo">📄+</button>
                    <button class="action-icon-btn" id="new-folder-btn" data-tooltip="Nova Pasta">📁+</button>
                    <button class="action-icon-btn" id="refresh-tree-btn" data-tooltip="Recarregar Árvore">🔄</button>
                    <button class="action-icon-btn" id="rename-node-btn" data-tooltip="Renomear" disabled>✏️</button>
                    <button class="action-icon-btn" id="delete-node-btn" data-tooltip="Excluir" disabled>❌</button>
                </div>
            </div>
            <div class="panel-content">
                <ul class="file-tree" id="file-tree-root">
                    <!-- Dynamic file tree contents load here -->
                    <li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">
                        Carregando arquivos...</li>
                </ul>
            </div>
        </aside>

        <!-- Left drag handle vertical splitter -->
        <div class="resizer resizer-v" id="resizer-left"></div>

        <!-- Central layout area (Editor and Terminal) -->
        <main class="center-workspace">

            <!-- Editor area -->
            <section class="editor-panel">
                <!-- Tab bar -->
                <div class="tabs-bar" id="tabs-container">
                    <!-- Dynamic tabs load here -->
                </div>

                <!-- Main Editor container -->
                <div class="editor-wrapper">
                    <div class="no-active-file" id="no-file-placeholder">
                        <img src="logo.svg" alt="KodeWeb Logo"
                            style="height: 64px; width: 64px; margin-bottom: 12px; opacity: 0.85;">
                        <h3>Boas-vindas ao KodeWeb</h3>
                        <p style="margin-top: 8px; font-size:13px; color: var(--text-muted); margin-bottom: 20px;">Abra
                            um arquivo na barra lateral para começar a programar.</p>

                        <div
                            style="max-width: 320px; margin: 0 auto; text-align: left; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px 16px;">
                            <h4
                                style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--accent); margin-bottom:10px; text-align:center; letter-spacing:0.5px;">
                                Atalhos Úteis</h4>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
                                <span style="color:var(--text-muted);">Salvar Arquivo</span>
                                <span><kbd
                                        style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Ctrl
                                        + S</kbd></span>
                            </div>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
                                <span style="color:var(--text-muted);">Fechar Aba/Arquivo</span>
                                <span><kbd
                                        style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Alt
                                        + W</kbd></span>
                            </div>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
                                <span style="color:var(--text-muted);">Navegar entre Abas</span>
                                <span><kbd
                                        style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Alt
                                        + ,</kbd> e <kbd
                                        style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Alt
                                        + .</kbd></span>
                            </div>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
                                <span style="color:var(--text-muted);">Abrir Arquivo</span>
                                <span style="color:var(--text-primary); font-size:11px; font-weight:500;">Duplo
                                    clique</span>
                            </div>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
                                <span style="color:var(--text-muted);">Histórico do Terminal</span>
                                <span><kbd
                                        style="background:var(--bg-input); padding:2px 4px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">↑</kbd>
                                    <kbd
                                        style="background:var(--bg-input); padding:2px 4px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">↓</kbd></span>
                            </div>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
                                <span style="color:var(--text-muted);">Buscar Arquivo</span>
                                <span><kbd
                                        style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Ctrl + P</kbd></span>
                            </div>
                            <div
                                style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                                <span style="color:var(--text-muted);">Limpar Terminal</span>
                                <span><kbd
                                        style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px; font-family:var(--font-mono);">clear</kbd></span>
                            </div>
                        </div>
                        <div style="margin-top: 30px; font-size: 11px; color: var(--text-muted); text-align: center;">
                            v1.0 - 2026 <a href="https://laralabs.dev" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 500;">Laralabs</a>
                        </div>
                    </div>
                    <div id="editor" class="editor-instance hidden"></div>
                    
                    <!-- Image Preview Container -->
                    <div id="image-preview-container" class="hidden" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary); z-index: 5; overflow: auto;">
                        <div style="padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%;">
                            <img id="image-preview-element" src="" style="max-width: 100%; max-height: calc(100vh - 150px); object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border-radius: 4px; background-image: repeating-linear-gradient(45deg, #1d0c2c 25%, transparent 25%, transparent 75%, #1d0c2c 75%, #1d0c2c), repeating-linear-gradient(45deg, #1d0c2c 25%, #0b0114 25%, #0b0114 75%, #1d0c2c 75%, #1d0c2c); background-position: 0 0, 10px 10px; background-size: 20px 20px;">
                            <div id="image-preview-info" style="margin-top: 15px; color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);"></div>
                        </div>
                    </div>
                    
                    <!-- Markdown Preview Container -->
                    <div id="md-preview-container" class="hidden" style="position: absolute; top: 0; right: 0; bottom: 0; width: 50%; border-left: 1px solid var(--border-color); background: var(--bg-primary); z-index: 4; overflow-y: auto; padding: 20px;">
                        <div id="md-preview-content" class="markdown-body" style="color: var(--text-primary);"></div>
                    </div>
                    
                    <!-- Floating Markdown Toggle Button -->
                    <button id="md-toggle-btn" class="hidden" onclick="toggleMdPreview()" style="position: absolute; top: 15px; right: 25px; z-index: 6; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 5px 10px; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 12px; display: flex; align-items: center; gap: 5px; transition: all 0.2s;">
                        <span>👁️</span> Preview
                    </button>
                    
                    <!-- Database Explorer Panel -->
                    <div id="db-explorer-container" class="hidden">
                        <!-- Sidebar for Databases & Tables Tree -->
                        <aside class="db-explorer-sidebar">
                            <div class="db-explorer-sidebar-header">
                                <span>Navegador DB</span>
                                <button class="action-icon-btn" id="db-explorer-refresh-btn" data-tooltip="Recarregar Estrutura">🔄</button>
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
                </div>
            </section>

            <!-- Bottom drag handle horizontal splitter -->
            <div class="resizer resizer-h" id="resizer-bottom"></div>

            <!-- Bottom panel (Terminal) -->
            <section class="terminal-panel" id="panel-bottom" style="height: 220px;">
                <div class="sidebar-header" style="background-color: #151515;">
                    <span>Terminal</span>
                    <span style="font-size: 11px; text-transform: none; color: var(--text-muted);">Execução no
                        Servidor</span>
                </div>
                <div class="terminal-input-row">
                    <span class="terminal-prompt" id="terminal-prompt-path">user@kodeweb:Workspace$</span>
                    <input type="text" class="terminal-input" id="terminal-input"
                        placeholder="Digite seu comando aqui e aperte Enter..." autocomplete="off">
                </div>
                <div class="terminal-console" id="terminal-console">
                    <div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator - Inicializado.</div>
                </div>
            </section>

        </main>

        <!-- Right drag handle vertical splitter -->
        <div class="resizer resizer-v" id="resizer-right"></div>

        <!-- Right panel (Database Connections & Queries) -->
        <aside class="sidebar-panel" id="panel-right" style="width: 300px;">
            <div class="sidebar-header">
                <span>Banco de Dados</span>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-sm tooltip-right" id="btn-explore-db" data-tooltip="Explorar Banco (Nova Aba)"
                        style="padding: 2px 6px; font-size:10px; background-color: var(--bg-hover);">🔍 Explorar</button>
                    <button class="btn btn-sm btn-primary tooltip-right" id="btn-add-db" data-tooltip="Nova Conexão"
                        style="padding: 2px 6px; font-size:10px;">+ Conexão</button>
                </div>
            </div>
            <div class="panel-content" style="display: flex; flex-direction: column; gap: 12px;">

                <div>
                    <h4 style="font-size: 12px; margin-bottom: 6px; color: var(--text-muted); font-weight:500;">Conexões
                        Ativas</h4>
                    <div id="db-connections">
                        <!-- Saved connection cards load here -->
                    </div>
                </div>

                <div class="db-query-section">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="font-size: 12px; color: var(--text-muted); font-weight:500;">Consulta SQL</h4>
                        <button class="btn btn-sm btn-primary" id="execute-query-btn" style="padding:4px 10px;"
                            disabled>Executar</button>
                    </div>

                    <span id="active-db-label" style="font-size:11px; color: var(--text-muted); font-style:italic;">Sem
                        conexão ativa.</span>

                    <textarea class="sql-textarea" id="sql-query" placeholder="SELECT * FROM tabela LIMIT 10;"
                        disabled></textarea>

                    <h4 style="font-size: 12px; margin-top: 4px; color: var(--text-muted); font-weight:500;">Resultados
                    </h4>
                    <div class="db-results-container" id="db-results">
                        <div style="padding:10px; color:var(--text-muted); font-size:11px;">Sem resultados. Execute uma
                            consulta para exibir dados.</div>
                    </div>
                </div>

            </div>
        </aside>

    </div>

    <!-- Modal for Database Connections -->
    <div class="modal-overlay" id="modal-connection">
        <div class="modal-content">
            <h3 class="modal-header" id="modal-conn-title">Nova Conexão de Banco</h3>
            <form id="form-db-connection">
                <input type="hidden" id="db-conn-id">

                <div class="form-group">
                    <label class="form-label" for="db-conn-name">Nome da Conexão</label>
                    <input type="text" class="form-input" id="db-conn-name" placeholder="ex: Produção MySQL" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="db-driver">SGBD / Driver</label>
                    <select class="form-input" id="db-driver">
                        <!-- Loaded dynamically based on PDO availability -->
                    </select>
                </div>

                <div class="form-group" id="group-host">
                    <label class="form-label" for="db-host">IP / Host Externo</label>
                    <input type="text" class="form-input" id="db-host" placeholder="127.0.0.1">
                </div>

                <div class="form-group" id="group-port">
                    <label class="form-label" for="db-port">Porta</label>
                    <input type="number" class="form-input" id="db-port" placeholder="3306">
                </div>

                <div class="form-group" id="group-username">
                    <label class="form-label" for="db-username">Usuário</label>
                    <input type="text" class="form-input" id="db-username" placeholder="root">
                </div>

                <div class="form-group" id="group-password">
                    <label class="form-label" for="db-password">Senha (Criptografada no Servidor)</label>
                    <input type="password" class="form-input" id="db-password" placeholder="Senha do banco de dados">
                </div>

                <div class="form-group" id="group-database">
                    <label class="form-label" id="label-database" for="db-database">Nome do Banco</label>
                    <input type="text" class="form-input" id="db-database" placeholder="meu_banco">
                </div>

                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeModal('modal-connection')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Conexão</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal for Uploading Files -->
    <div class="modal-overlay" id="modal-upload">
        <div class="modal-content" style="width: 500px; max-width: 95%;">
            <h3 class="modal-header">Carregar Arquivos</h3>
            <div id="upload-drop-zone" class="upload-drop-zone">
                <div style="font-size: 32px; margin-bottom: 10px;">📥</div>
                <p>Arraste e solte arquivos ou pastas aqui</p>
                <p style="font-size: 11px; color: var(--text-muted); margin: 8px 0;">ou</p>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('upload-files-input').click()">Selecionar Arquivos</button>
                    <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('upload-folder-input').click()">Selecionar Pasta</button>
                </div>
                <input type="file" id="upload-files-input" multiple style="display: none;">
                <input type="file" id="upload-folder-input" webkitdirectory directory style="display: none;">
                <input type="hidden" id="upload-target-path">
            </div>
            
            <div id="upload-progress-container" style="margin-top: 15px; max-height: 200px; overflow-y: auto;">
                <!-- Progress items go here -->
            </div>
            
            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="btn" onclick="closeModal('modal-upload')">Fechar</button>
            </div>
        </div>
    </div>

    <!-- Modal for Creating New Nodes (File/Folder) -->
    <div class="modal-overlay" id="modal-new-node">
        <div class="modal-content" style="width: 360px;">
            <h3 class="modal-header" id="modal-node-title">Novo Arquivo</h3>
            <form id="form-new-node">
                <input type="hidden" id="new-node-type" value="file">
                <input type="hidden" id="new-node-parent" value="">

                <div class="form-group">
                    <label class="form-label" id="label-node-name" for="new-node-name">Nome do Arquivo</label>
                    <input type="text" class="form-input" id="new-node-name" placeholder="ex: index.js" required>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeModal('modal-new-node')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Criar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Confirm Modal overlay -->
    <div class="modal-overlay" id="modal-confirm">
        <div class="modal-content" style="width: 360px;">
            <h3 class="modal-header">Confirmar Ação</h3>
            <p id="confirm-modal-message"
                style="font-size: 13px; margin-bottom: 20px; color: var(--text-muted); line-height: 1.4;"></p>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal('modal-confirm')">Cancelar</button>
                <button type="button" class="btn btn-danger" id="confirm-modal-ok-btn">Confirmar</button>
            </div>
        </div>
    </div>

    <!-- Prompt Modal overlay -->
    <div class="modal-overlay" id="modal-prompt">
        <div class="modal-content" style="width: 380px;">
            <h3 class="modal-header" id="prompt-modal-title">Entrada</h3>
            <form id="form-prompt-modal">
                <div class="form-group">
                    <label class="form-label" id="prompt-modal-label" for="prompt-modal-input">Valor</label>
                    <input type="text" class="form-input" id="prompt-modal-input" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeModal('modal-prompt')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Confirmar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Global File Search Modal (Ctrl + P) -->
    <div class="modal-overlay search-overlay" id="modal-global-search">
        <div class="modal-content search-modal-content">
            <div class="search-modal-header">
                <input type="text" id="global-search-input" placeholder="Digite para pesquisar arquivos... (Ctrl+P)" autocomplete="off">
            </div>
            <div class="search-results-list" id="global-search-results">
                <!-- Results will load here dynamically -->
            </div>
            <div class="search-modal-footer">
                <span>Use <kbd>↑</kbd> <kbd>↓</kbd> para navegar, <kbd>Enter</kbd> para abrir e <kbd>Esc</kbd> para fechar.</span>
            </div>
        </div>
    </div>

    <!-- Modal for DB Row Add/Edit -->
    <div class="modal-overlay" id="modal-db-row">
        <div class="modal-content" style="width: 500px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
            <h3 class="modal-header" id="modal-db-row-title">Inserir Registro</h3>
            <form id="form-db-row" style="overflow-y: auto; flex: 1; padding-right: 4px;">
                <div id="db-row-fields-container">
                    <!-- Dynamically populated field inputs -->
                </div>
                <div class="form-actions" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn" onclick="closeModal('modal-db-row')">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btn-save-db-row">Salvar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal for DB Column Add/Edit -->
    <div class="modal-overlay" id="modal-db-column">
        <div class="modal-content" style="width: 400px; max-width: 90%;">
            <h3 class="modal-header" id="modal-db-column-title">Adicionar Coluna</h3>
            <form id="form-db-column">
                <input type="hidden" id="db-col-is-edit" value="false">
                <input type="hidden" id="db-col-old-name" value="">
                
                <div class="form-group">
                    <label class="form-label" for="db-col-name">Nome da Coluna</label>
                    <input type="text" class="form-input" id="db-col-name" placeholder="ex: email" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="db-col-type">Tipo</label>
                    <input type="text" class="form-input" id="db-col-type" placeholder="ex: varchar(255) ou INT" required>
                </div>
                
                <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 15px;">
                    <input type="checkbox" id="db-col-nullable" checked style="width: 16px; height: 16px;">
                    <label class="form-label" for="db-col-nullable" style="margin-bottom: 0; cursor: pointer;">Permitir Nulo (NULL)</label>
                </div>
                
                <div class="form-group" style="margin-top: 15px;">
                    <label class="form-label" for="db-col-default">Valor Padrão</label>
                    <input type="text" class="form-input" id="db-col-default" placeholder="ex: NULL, CURRENT_TIMESTAMP ou valor literal">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeModal('modal-db-column')">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btn-save-db-column">Salvar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal for Help / Keyboard Shortcuts -->
    <div class="modal-overlay" id="modal-help">
        <div class="modal-content" style="width: 550px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column;">
            <h3 class="modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span>Atalhos de Teclado & Ajuda</span>
                <span class="close-modal-btn" onclick="closeModal('modal-help')" style="cursor: pointer; font-size: 20px; opacity: 0.7;">&times;</span>
            </h3>
            <div class="help-modal-body" style="overflow-y: auto; flex: 1; padding-right: 4px;">
                
                <h4 class="help-section-title">Navegação e Sistema</h4>
                <table class="help-shortcuts-table">
                    <tr><td><kbd>Ctrl + P</kbd></td><td>Pesquisa rápida de arquivos (Go to File)</td></tr>
                    <tr><td><kbd>Ctrl + S</kbd></td><td>Salvar arquivo atual</td></tr>
                    <tr><td><kbd>Alt + W</kbd></td><td>Fechar aba atual</td></tr>
                    <tr><td><kbd>Alt + ,</kbd> e <kbd>Alt + .</kbd></td><td>Navegar entre abas (Anterior / Próxima)</td></tr>
                </table>

                <h4 class="help-section-title">Edição no Editor (Ace)</h4>
                <table class="help-shortcuts-table">
                    <tr><td><kbd>Ctrl + F</kbd></td><td>Buscar texto no arquivo</td></tr>
                    <tr><td><kbd>Ctrl + H</kbd></td><td>Buscar e substituir texto</td></tr>
                    <tr><td><kbd>Ctrl + L</kbd></td><td>Ir para uma linha específica</td></tr>
                    <tr><td><kbd>Ctrl + Z</kbd></td><td>Desfazer última alteração</td></tr>
                    <tr><td><kbd>Ctrl + Y</kbd> / <kbd>Ctrl + Shift + Z</kbd></td><td>Refazer alteração</td></tr>
                    <tr><td><kbd>Ctrl + D</kbd></td><td>Remover linha atual</td></tr>
                    <tr><td><kbd>Ctrl + /</kbd></td><td>Comentar / Descomentar linha</td></tr>
                    <tr><td><kbd>Alt + ↑ / ↓</kbd></td><td>Mover linha selecionada para cima / baixo</td></tr>
                    <tr><td><kbd>Alt + Shift + ↑ / ↓</kbd></td><td>Duplicar linha selecionada acima / abaixo</td></tr>
                    <tr><td><kbd>Ctrl + Alt + ↑ / ↓</kbd></td><td>Adicionar cursor multi-linha acima / abaixo</td></tr>
                    <tr><td><kbd>Tab</kbd> / <kbd>Shift + Tab</kbd></td><td>Avançar / Recuar tabulação (identação)</td></tr>
                </table>

                <h4 class="help-section-title">Terminal Integrado</h4>
                <table class="help-shortcuts-table">
                    <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navegar pelo histórico de comandos</td></tr>
                    <tr><td><kbd>clear</kbd></td><td>Digitar no terminal para limpar o histórico visual</td></tr>
                </table>

                <h4 class="help-section-title">Explorador de Arquivos</h4>
                <table class="help-shortcuts-table">
                    <tr><td><kbd>Duplo Clique</kbd></td><td>Abrir arquivo selecionado</td></tr>
                </table>
                
            </div>
            <div class="form-actions" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                <button type="button" class="btn btn-primary" onclick="closeModal('modal-help')">Fechar</button>
            </div>
        </div>
    </div>

    <!-- Toast Notifications Container -->
    <div id="toast-container"
        style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;">
    </div>

    <!-- Link App Controller JS -->
    <script src="app.js?v=<?= filemtime('app.js') ?>"></script>
</body>

</html>
