<!-- Modal for FTP Connections -->
<div class="modal-overlay" id="modal-ftp-connection">
    <div class="modal-content" style="width: 450px;">
        <h3 class="modal-header">Gerenciador FTP</h3>
        
        <div class="db-table-tabs" style="margin-bottom: 15px; justify-content: flex-start; gap: 10px;">
            <button class="db-tab-btn active" id="ftp-tab-list-btn" onclick="switchFtpModalTab('list')" style="border-radius: 4px;">Armazenadas</button>
            <button class="db-tab-btn" id="ftp-tab-form-btn" onclick="switchFtpModalTab('form', true)" style="border-radius: 4px;">Nova Conexão</button>
        </div>
        
        <div id="ftp-modal-list-view">
            <ul id="ftp-connections-list" style="list-style:none; padding:0; margin:0; max-height: 300px; overflow-y: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px;">
                <li style="color:var(--text-muted); font-size:12px; text-align:center; padding:15px;">Carregando conexões...</li>
            </ul>
        </div>
        
        <div id="ftp-modal-form-view" class="hidden">
            <form id="form-ftp-connection">
                <input type="hidden" id="ftp-conn-id">

                <div class="form-group">
                    <label class="form-label" for="ftp-conn-name">Nome da Conexão</label>
                    <input type="text" class="form-input" id="ftp-conn-name" placeholder="ex: Servidor de Produção" required>
                </div>

                <div style="display:flex; gap:10px;">
                    <div class="form-group" style="flex:3;">
                        <label class="form-label" for="ftp-host">IP / Host</label>
                        <input type="text" class="form-input" id="ftp-host" placeholder="ftp.site.com" required>
                    </div>

                    <div class="form-group" style="flex:1;">
                        <label class="form-label" for="ftp-port">Porta</label>
                        <input type="number" class="form-input" id="ftp-port" placeholder="21">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="ftp-username">Usuário</label>
                    <input type="text" class="form-input" id="ftp-username" placeholder="meu_user" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="ftp-password">Senha (Criptografada no Servidor)</label>
                    <input type="password" class="form-input" id="ftp-password" placeholder="Sua senha FTP">
                </div>

                <div class="form-actions" style="margin-top: 15px;">
                    <button type="button" class="btn" onclick="testFtpConnection()">🔌 Testar Conexão</button>
                    <div style="flex:1"></div>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
        
        <div class="form-actions" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;" id="ftp-modal-footer">
            <button type="button" class="btn" onclick="closeModal('modal-ftp-connection')">Fechar</button>
        </div>
    </div>
</div>
