<!-- Modal for Creating New Nodes (File/Folder) -->
<div class="modal-overlay" id="modal-new-node">
    <div class="modal-content" style="width: 360px;">
        <h3 class="modal-header" id="modal-node-title">Novo Arquivo</h3>
        <form id="form-new-node">
            <input type="hidden" id="new-node-type" value="file">
            <input type="hidden" id="new-node-parent" value="">

            <div class="form-group">
                <label class="form-label" id="label-node-name" for="new-node-name">Nome do Arquivo</label>
                <input type="text" class="form-input" id="new-node-name" placeholder="ex: index.js" required>
            </div>

            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal('modal-new-node')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Criar</button>
            </div>
        </form>
    </div>
</div>
