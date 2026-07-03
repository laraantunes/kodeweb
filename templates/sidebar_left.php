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
