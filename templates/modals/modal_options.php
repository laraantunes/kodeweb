<!-- Modal for Options -->
<div class="modal-overlay" id="modal-options">
    <div class="modal-content" style="width: 500px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 class="modal-header">Opções</h3>
        
        <div class="db-table-tabs" style="margin-bottom: 15px; justify-content: flex-start; gap: 10px;">
            <button class="db-tab-btn active" id="options-tab-conn-btn" onclick="switchOptionsTab('conn')" style="border-radius: 4px;">Conexões</button>
            <button class="db-tab-btn" id="options-tab-env-btn" onclick="switchOptionsTab('env')" style="border-radius: 4px;">Ambiente</button>
            <button class="db-tab-btn" id="options-tab-editor-btn" onclick="switchOptionsTab('editor')" style="border-radius: 4px;">Editor</button>
            <button class="db-tab-btn" id="options-tab-user-btn" onclick="switchOptionsTab('user')" style="border-radius: 4px;">Usuário</button>
            <button class="db-tab-btn" id="options-tab-plugins-btn" onclick="switchOptionsTab('plugins')" style="border-radius: 4px;">Plugins</button>
            <button class="db-tab-btn" id="options-tab-about-btn" onclick="switchOptionsTab('about')" style="border-radius: 4px;">Sobre</button>
        </div>
        
        <?php require __DIR__ . '/options/conn.php'; ?>
        <?php require __DIR__ . '/options/env.php'; ?>
        <?php require __DIR__ . '/options/editor.php'; ?>
        <?php require __DIR__ . '/options/user.php'; ?>
        <?php require __DIR__ . '/options/plugins.php'; ?>
        <?php require __DIR__ . '/options/about.php'; ?>
        
        <div class="form-actions" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
            <button type="button" class="btn" onclick="closeModal('modal-options')">Fechar</button>
        </div>
    </div>
</div>
