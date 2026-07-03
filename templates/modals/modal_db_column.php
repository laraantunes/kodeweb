<!-- Modal for DB Column Add/Edit -->
<div class="modal-overlay" id="modal-db-column">
    <div class="modal-content" style="width: 400px; max-width: 90%;">
        <h3 class="modal-header" id="modal-db-column-title">Adicionar Coluna</h3>
        <form id="form-db-column">
            <input type="hidden" id="db-col-is-edit" value="false">
            <input type="hidden" id="db-col-old-name" value="">
            
            <div class="form-group">
                <label class="form-label" for="db-col-name">Nome da Coluna</label>
                <input type="text" class="form-input" id="db-col-name" placeholder="ex: email" required>
            </div>
            
            <div class="form-group">
                <label class="form-label" for="db-col-type">Tipo</label>
                <input type="text" class="form-input" id="db-col-type" placeholder="ex: varchar(255) ou INT" required>
            </div>
            
            <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 15px;">
                <input type="checkbox" id="db-col-nullable" checked style="width: 16px; height: 16px;">
                <label class="form-label" for="db-col-nullable" style="margin-bottom: 0; cursor: pointer;">Permitir Nulo (NULL)</label>
            </div>
            
            <div class="form-group" style="margin-top: 15px;">
                <label class="form-label" for="db-col-default">Valor Padrão</label>
                <input type="text" class="form-input" id="db-col-default" placeholder="ex: NULL, CURRENT_TIMESTAMP ou valor literal">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal('modal-db-column')">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btn-save-db-column">Salvar</button>
            </div>
        </form>
    </div>
</div>
