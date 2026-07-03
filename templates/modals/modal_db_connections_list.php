<!-- Modal for Database Connections List -->
<div class="modal-overlay" id="modal-db-connections-list">
    <div class="modal-content" style="width: 450px;">
        <h3 class="modal-header">Gerenciador DB</h3>
        
        <div id="db-modal-list-view">
            <ul id="db-connections-modal-list" style="list-style:none; padding:0; margin:0; max-height: 300px; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px;">
                <li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Carregando conexões...</li>
            </ul>
        </div>
        
        <div class="form-actions" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;" id="db-modal-footer">
            <button type="button" class="btn" onclick="closeModal('modal-db-connections-list')">Fechar</button>
            <button type="button" class="btn btn-primary" onclick="closeModal('modal-db-connections-list'); document.getElementById('form-db-connection').reset(); document.getElementById('db-conn-id').value = ''; document.getElementById('modal-conn-title').textContent = 'Nova Conexão de Banco'; openModal('modal-connection');">Nova Conexão</button>
        </div>
    </div>
</div>
