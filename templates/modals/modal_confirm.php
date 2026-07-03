<!-- Confirm Modal overlay -->
<div class="modal-overlay" id="modal-confirm">
    <div class="modal-content" style="width: 360px;">
        <h3 class="modal-header">Confirmar Ação</h3>
        <p id="confirm-modal-message"
            style="font-size: 13px; margin-bottom: 20px; color: var(--text-muted); line-height: 1.4;"></p>
        <div class="form-actions">
            <button type="button" class="btn" onclick="closeModal('modal-confirm')">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirm-modal-ok-btn">Confirmar</button>
        </div>
    </div>
</div>
