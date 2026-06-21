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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/ext-language_tools.min.js"
        referrerpolicy="no-referrer"></script>
</head>

<body>

    <!-- Header bar -->
    <header class="top-header">
        <div class="logo-section">
            <img src="logo.svg" alt="KodeWeb Logo"
                style="height: 28px; width: 28px; vertical-align: middle; margin-right: 6px;">
            <span class="app-title">KodeWeb IDE</span>
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
        </div>
    </header>

    <!-- Workspace container -->
    <div class="workspace">

        <!-- Left panel (Files Explorer) -->
        <aside class="sidebar-panel" id="panel-left" style="width: 260px;">
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
                    </div>
                    <div id="editor" class="editor-instance hidden"></div>
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
                    <div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator -
                        Inicializado.</div>
                </div>
            </section>

        </main>

        <!-- Right drag handle vertical splitter -->
        <div class="resizer resizer-v" id="resizer-right"></div>

        <!-- Right panel (Database Connections & Queries) -->
        <aside class="sidebar-panel" id="panel-right" style="width: 300px;">
            <div class="sidebar-header">
                <span>Banco de Dados</span>
                <button class="btn btn-sm btn-primary tooltip-right" id="btn-add-db" data-tooltip="Nova Conexão"
                    style="padding: 2px 8px; font-size:10px;">+ Conexão</button>
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
                    <input type="text" class="form-input" id="db-database" placeholder="meu_banco" required>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeModal('modal-connection')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Conexão</button>
                </div>
            </form>
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
    <script src="app.js"></script>
</body>

</html>