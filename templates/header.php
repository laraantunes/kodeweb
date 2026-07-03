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
