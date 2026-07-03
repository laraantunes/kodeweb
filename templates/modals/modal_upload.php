<!-- Modal for Uploading Files -->
<div class="modal-overlay" id="modal-upload">
    <div class="modal-content" style="width: 500px; max-width: 95%;">
        <h3 class="modal-header">Carregar Arquivos</h3>
        <div id="upload-drop-zone" class="upload-drop-zone">
            <div style="font-size: 32px; margin-bottom: 10px;">📥</div>
            <p>Arraste e solte arquivos ou pastas aqui</p>
            <p style="font-size: 11px; color: var(--text-muted); margin: 8px 0;">ou</p>
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('upload-files-input').click()">Selecionar Arquivos</button>
                <button type="button" class="btn btn-sm btn-primary" onclick="document.getElementById('upload-folder-input').click()">Selecionar Pasta</button>
            </div>
            <input type="file" id="upload-files-input" multiple style="display: none;">
            <input type="file" id="upload-folder-input" webkitdirectory directory style="display: none;">
            <input type="hidden" id="upload-target-path">
        </div>
        
        <div id="upload-progress-container" style="margin-top: 15px; max-height: 200px; overflow-y: auto;">
            <!-- Progress items go here -->
        </div>
        
        <div class="form-actions" style="margin-top: 20px;">
            <button type="button" class="btn" onclick="closeModal('modal-upload')">Fechar</button>
        </div>
    </div>
</div>
