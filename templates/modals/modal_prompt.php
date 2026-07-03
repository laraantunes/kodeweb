<!-- Prompt Modal overlay -->
<div class="modal-overlay" id="modal-prompt">
    <div class="modal-content" style="width: 380px;">
        <h3 class="modal-header" id="prompt-modal-title">Entrada</h3>
        <form id="form-prompt-modal">
            <div class="form-group">
                <label class="form-label" id="prompt-modal-label" for="prompt-modal-input">Valor</label>
                <input type="text" class="form-input" id="prompt-modal-input" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal('modal-prompt')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Confirmar</button>
            </div>
        </form>
    </div>
</div>
