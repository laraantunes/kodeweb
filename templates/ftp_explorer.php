<!-- FTP Explorer Panel -->
<div id="ftp-explorer-container" class="hidden" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-primary); z-index: 5; overflow-y: auto; padding: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
        <h3 id="ftp-explorer-title" style="margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🌐</span> Conexão FTP
        </h3>
        <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-primary" id="ftp-new-file-btn" data-tooltip="Novo Arquivo">📄+</button>
            <button class="btn btn-sm btn-primary" id="ftp-new-folder-btn" data-tooltip="Nova Pasta">📁+</button>
            <button class="btn btn-sm" id="ftp-refresh-btn" data-tooltip="Atualizar">🔄</button>
        </div>
    </div>
    
    <div class="ftp-tree-wrapper" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; min-height: calc(100% - 70px); padding: 15px; overflow-y: auto;">
        <!-- Drag and drop zone inside FTP -->
        <div id="ftp-drop-zone" style="min-height: 100%;">
            <ul class="file-tree" id="ftp-tree-root" style="padding: 0;">
                <li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">
                    Carregando arquivos do FTP...
                </li>
            </ul>
        </div>
    </div>
</div>
