<div class="modal-overlay" id="modal-save-as">
    <div class="modal-content" style="width: 500px;">
        <h3 class="modal-header">Salvar Como...</h3>
        
        <div class="form-group">
            <label class="form-label" for="save-as-filename">Nome do Arquivo:</label>
            <input type="text" id="save-as-filename" class="form-input" placeholder="ex: novo_arquivo.txt">
        </div>
        <div class="form-group" style="margin-top: 15px;">
            <label class="form-label">Selecionar Pasta no Workspace:</label>
            <div id="save-as-tree" class="file-tree" style="height: 200px; overflow-y: auto; border: 1px solid var(--border-color); padding: 5px; border-radius: 4px; background: var(--bg-primary);"></div>
        </div>
        <div style="margin-top: 10px; margin-bottom: 20px; font-size: 13px; color: var(--text-muted);">
            Caminho selecionado: <span id="save-as-selected-path" style="color: var(--accent);">/</span>
        </div>
        
        <div class="form-actions" style="display: flex; justify-content: space-between;">
            <button type="button" class="btn" onclick="executeSaveAsDownload()">Fazer Download Local</button>
            <div>
                <button type="button" class="btn" onclick="closeModal('modal-save-as')">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="executeSaveAs()">Salvar no Workspace</button>
            </div>
        </div>
    </div>
</div>
