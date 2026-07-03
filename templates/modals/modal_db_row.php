<!-- Modal for DB Row Add/Edit -->
<div class="modal-overlay" id="modal-db-row">
    <div class="modal-content" style="width: 500px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column;">
        <h3 class="modal-header" id="modal-db-row-title">Inserir Registro</h3>
        <form id="form-db-row" style="overflow-y: auto; flex: 1; padding-right: 4px;">
            <div id="db-row-fields-container">
                <!-- Dynamically populated field inputs -->
            </div>
            <div class="form-actions" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid var(--border-color);">
                <button type="button" class="btn" onclick="closeModal('modal-db-row')">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btn-save-db-row">Salvar</button>
            </div>
        </form>
    </div>
</div>
