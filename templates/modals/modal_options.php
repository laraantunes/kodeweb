<!-- Modal for Options -->
<div class="modal-overlay" id="modal-options">
    <div class="modal-content" style="width: 500px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 class="modal-header">Opções</h3>
        
        <div class="db-table-tabs" style="margin-bottom: 15px; justify-content: flex-start; gap: 10px;">
            <button class="db-tab-btn active" id="options-tab-conn-btn" onclick="switchOptionsTab('conn')" style="border-radius: 4px;">Conexões</button>
            <button class="db-tab-btn" id="options-tab-env-btn" onclick="switchOptionsTab('env')" style="border-radius: 4px;">Ambiente</button>
            <button class="db-tab-btn" id="options-tab-user-btn" onclick="switchOptionsTab('user')" style="border-radius: 4px;">Usuário</button>
            <button class="db-tab-btn" id="options-tab-about-btn" onclick="switchOptionsTab('about')" style="border-radius: 4px;">Sobre</button>
        </div>
        
        <div id="options-conn-view">
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-db-connections-list').classList.add('active'); loadDbConnectionsModalList();">Conexões DB</button>
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-ftp-connection').classList.add('active'); switchFtpModalTab('list');">Conexões FTP</button>
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-ssh-connection').classList.add('active'); switchSshModalTab('list');">Conexões SSH</button>
            </div>
        </div>
        
        <div id="options-env-view" class="hidden">
            <form id="form-options-env" onsubmit="saveOptionsEnv(event)">
                <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="options-env-local" style="width: 16px; height: 16px;">
                    <label class="form-label" for="options-env-local" style="margin-bottom: 0; cursor: pointer;">Ambiente Local (LOCAL_ENV=1)</label>
                </div>
                <div class="form-actions" style="margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Salvar Ambiente</button>
                </div>
            </form>
        </div>

        <div id="options-user-view" class="hidden">
            <form id="form-options-user" onsubmit="saveOptionsUser(event)">
                <div class="form-group">
                    <label class="form-label" for="options-username">Usuário</label>
                    <input type="text" class="form-input" id="options-username" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="options-password">Nova Senha (deixe em branco para não alterar)</label>
                    <input type="password" class="form-input" id="options-password" placeholder="Nova senha...">
                </div>
                <div class="form-actions" style="margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Salvar Usuário</button>
                </div>
            </form>
        </div>

        <div id="options-about-view" class="hidden">
            <div style="text-align: center; padding: 20px;">
                <img src="logo.svg" alt="KodeWeb Logo" style="height: 64px; width: 64px; margin-bottom: 12px;">
                <h3>KodeWeb IDE</h3>
                <p style="margin-top: 10px; font-size: 13px; color: var(--text-muted);">
                    <?= $app_version ?> - 2026 <a href="https://laralabs.dev" target="_blank" style="color: var(--accent); text-decoration: none;">Laralabs</a>
                </p>
                <p style="margin-top: 10px; font-size: 13px; color: var(--text-muted);">
                    <a href="https://github.com/laraantunes/kodeweb" target="_blank" style="color: var(--accent); text-decoration: none;">https://github.com/laraantunes/kodeweb</a>
                </p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" id="btn-update-kodeweb" onclick="updateKodeWeb(this)">Buscar Atualizações</button>
                </div>
            </div>
        </div>
        
        <div class="form-actions" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
            <button type="button" class="btn" onclick="closeModal('modal-options')">Fechar</button>
        </div>
    </div>
</div>
