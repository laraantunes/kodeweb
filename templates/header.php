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
        <span id="global-loading" style="display: none; align-items: center; margin-right: 15px; color: var(--accent); font-size: 13px; font-weight: 500;">
            <svg viewBox="0 0 50 50" style="width: 16px; height: 16px; animation: spin 1s linear infinite;">
                <circle cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke="currentColor" style="stroke-linecap: round; stroke-dasharray: 90, 150; stroke-dashoffset: 0; animation: dash 1.5s ease-in-out infinite;"></circle>
            </svg>
            <span style="margin-left: 5px;">Processando...</span>
        </span>
        <button class="toggle-btn tooltip-right" id="new-blank-file-btn" title="Novo Arquivo (Em Branco)" onclick="openNewBlankFile()">
            <span>📄</span> Novo
        </button>
        <button class="toggle-btn active tooltip-right" id="toggle-left-btn" title="Exibir/Ocultar Explorer">
            <span>📁</span> Arquivos
        </button>
        <button class="toggle-btn active tooltip-right" id="toggle-bottom-btn"
            title="Exibir/Ocultar Terminal">
            <span>🖥️</span> Terminal
        </button>
        <button class="toggle-btn active tooltip-right" id="toggle-right-btn" title="Exibir/Ocultar Banco de Dados">
            <span>🔌</span> Banco de Dados
        </button>
        <button class="toggle-btn tooltip-right" id="ftp-connections-btn" title="Gerenciador FTP">
            <span>🌐</span> FTP
        </button>
        <button class="toggle-btn tooltip-right" id="git-btn" title="Git Integrado">
            <span>🌿</span> Git
        </button>
        <button class="toggle-btn tooltip-right" id="help-btn" title="Atalhos e Ajuda">
            <span>❓</span> Ajuda
        </button>
        <button class="toggle-btn" id="options-btn" onclick="openOptionsModal()" style="margin-left: 10px; color: var(--text-primary); border-color: var(--border-color);">
            <span>⚙️</span> Opções
        </button>
        <button class="toggle-btn" id="logout-btn" onclick="window.location.href='logout.php'" style="margin-left: 10px; color: var(--accent-danger); border-color: var(--accent-danger);">
            <span>🚪</span> Sair
        </button>
    </div>
</header>
