<!-- Modal for SSH Connections -->
<div class="modal-overlay" id="modal-ssh-connection">
    <div class="modal-content" style="width: 450px;">
        <h3 class="modal-header">Gerenciador SSH</h3>
        
        <div class="db-table-tabs" style="margin-bottom: 15px; justify-content: flex-start; gap: 10px;">
            <button class="db-tab-btn active" id="ssh-tab-list-btn" onclick="switchSshModalTab('list')" style="border-radius: 4px;">Armazenadas</button>
            <button class="db-tab-btn" id="ssh-tab-form-btn" onclick="switchSshModalTab('form')" style="border-radius: 4px;">Nova Conexão</button>
        </div>
        
        <div id="ssh-modal-list-view">
            <ul id="ssh-connections-list" style="list-style:none; padding:0; margin:0; max-height: 300px; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px;">
                <li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Carregando conexões...</li>
            </ul>
        </div>
        
        <div id="ssh-modal-form-view" class="hidden">
            <form id="form-ssh-connection">
                <input type="hidden" id="ssh-conn-id">

                <div class="form-group">
                    <label class="form-label" for="ssh-conn-name">Nome da Conexão</label>
                    <input type="text" class="form-input" id="ssh-conn-name" placeholder="ex: Servidor Web" required>
                </div>

                <div style="display:flex; gap:10px;">
                    <div class="form-group" style="flex:3;">
                        <label class="form-label" for="ssh-host">IP / Host</label>
                        <input type="text" class="form-input" id="ssh-host" placeholder="ssh.site.com" required>
                    </div>

                    <div class="form-group" style="flex:1;">
                        <label class="form-label" for="ssh-port">Porta</label>
                        <input type="number" class="form-input" id="ssh-port" placeholder="22" value="22">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="ssh-username">Usuário</label>
                    <input type="text" class="form-input" id="ssh-username" placeholder="root" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="ssh-password">Senha (Criptografada no Servidor)</label>
                    <input type="password" class="form-input" id="ssh-password" placeholder="Sua senha SSH">
                </div>

                <div class="form-actions" style="margin-top: 15px;">
                    <button type="button" class="btn" onclick="testSshConnection()">🔌 Testar Conexão</button>
                    <div style="flex:1"></div>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
        
        <div class="form-actions" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;" id="ssh-modal-footer">
            <button type="button" class="btn" onclick="closeModal('modal-ssh-connection')">Fechar</button>
        </div>
    </div>
</div>
