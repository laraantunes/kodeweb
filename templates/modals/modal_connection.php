<!-- Modal for Database Connections -->
<div class="modal-overlay" id="modal-connection">
    <div class="modal-content">
        <h3 class="modal-header" id="modal-conn-title">Nova Conexão de Banco</h3>
        <form id="form-db-connection">
            <input type="hidden" id="db-conn-id">
            <input type="hidden" id="db-conn-duplicate-from">

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
                <input type="text" class="form-input" id="db-database" placeholder="meu_banco">
            </div>

            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal('modal-connection')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Conexão</button>
            </div>
        </form>
    </div>
</div>
