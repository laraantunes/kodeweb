// 15. Markdown Preview Logic
window.mdPreviewActive = false;

window.toggleMdPreview = function() {
    window.mdPreviewActive = !window.mdPreviewActive;
    const editorEl = document.getElementById('editor');
    const mdContainer = document.getElementById('md-preview-container');
    const btn = document.getElementById('md-toggle-btn');
    
    if (window.mdPreviewActive) {
        editorEl.style.right = '50%';
        mdContainer.classList.remove('hidden');
        btn.innerHTML = '<span>❌</span> Fechar Preview';
        window.updateMdPreview();
    } else {
        editorEl.style.right = '0';
        mdContainer.classList.add('hidden');
        btn.innerHTML = '<span>👁️</span> Preview';
    }
    
    if (state.editor) {
        state.editor.resize();
    }
};

window.updateMdPreview = function() {
    if (!window.mdPreviewActive) return;
    const content = state.editor.getValue();
    if (typeof marked !== 'undefined') {
        document.getElementById('md-preview-content').innerHTML = marked.parse(content);
    }
};

// ==========================================