document.addEventListener('DOMContentLoaded', () => {
    initAceEditor();
    initLayoutResizers();
    initPanelToggles();
    fetchSystemStatus();
    loadFiles();
    loadDbConnections();
    initEventListeners();
    initLocalFileDrop();
    
    restorePanelsState();
    restoreTabsState().then(() => {
        if (typeof initFileHandler === 'function') {
            initFileHandler();
        }
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
            .then(reg => {
                reg.update();
                console.log('Service Worker registrado com sucesso:', reg.scope);
            })
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }
});
