<!-- Left panel (Files Explorer) -->
<aside class="sidebar-panel" id="panel-left" style="width: 270px;">
    <div class="sidebar-header">
        <span>Explorer</span>
        <div class="panel-actions">
            <button class="action-icon-btn" id="new-file-btn" title="Novo Arquivo">📄+</button>
            <button class="action-icon-btn" id="new-folder-btn" title="Nova Pasta">📁+</button>
            <button class="action-icon-btn" id="refresh-tree-btn" title="Recarregar Árvore">🔄</button>
            <button class="action-icon-btn" id="rename-node-btn" title="Renomear" disabled>✏️</button>
            <button class="action-icon-btn" id="delete-node-btn" title="Excluir" disabled>❌</button>
        </div>
    </div>
    <div class="panel-content" style="display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding: 5px 10px; background: rgba(0,0,0,0.1); user-select: none;">
            <div id="workspace-path-display" title="Carregando..." style="flex: 1; font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; padding-right: 5px;" oncontextmenu="openWorkspaceContextMenu(event)" ondblclick="openWorkspaceOptions(event)">
                Carregando workspace...
            </div>
            <button onclick="openWorkspaceContextMenu(event)" style="font-size: 14px; background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 0; line-height: 1;" title="Opções do Workspace">⋮</button>
        </div>
        
        <div id="workspace-context-menu" class="tree-context-menu" style="display: none;">
            <div class="tree-context-menu-item" onclick="openWorkspaceOptions(event)">⚙️ Alterar Workspace</div>
        </div>
        
        <script>
            function openWorkspaceOptions(e) {
                if (e) e.preventDefault();
                const menu = document.getElementById('workspace-context-menu');
                if (menu) {
                    menu.classList.remove('active');
                    menu.style.display = 'none';
                }
                const modal = document.getElementById('modal-options');
                if (modal) modal.classList.add('active');
                if (typeof switchOptionsTab === 'function') switchOptionsTab('env');
            }
            
            function openWorkspaceContextMenu(e) {
                e.preventDefault();
                e.stopPropagation();
                const menu = document.getElementById('workspace-context-menu');
                if (!menu) return;
                menu.style.display = 'block';
                menu.classList.add('active');
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            }
            
            // Close context menu on outside click
            document.addEventListener('click', function(e) {
                const menu = document.getElementById('workspace-context-menu');
                if (menu && menu.classList.contains('active') && e.target.id !== 'workspace-path-display') {
                    menu.classList.remove('active');
                    menu.style.display = 'none';
                }
            });
        </script>
        
        <ul class="file-tree" id="file-tree-root" style="flex: 1; overflow: auto; margin-top: 5px;">
            <!-- Dynamic file tree contents load here -->
            <li style="color: var(--text-muted); font-size:12px; text-align:center; padding-top:20px;">
                Carregando arquivos...</li>
        </ul>
    </div>
</aside>
