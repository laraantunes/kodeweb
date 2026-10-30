document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('/index.php')) {
        window.history.replaceState(null, '', './' + window.location.search + window.location.hash);
    }

    initAceEditor();
    initLayoutResizers();
    initPanelToggles();
    fetchSystemStatus();
    loadFiles();
    loadDbConnections();
    initEventListeners();
    initLocalFileDrop();

    // Register PWA File Handler immediately so launchQueue is consumed synchronously on launch
    if (typeof initFileHandler === 'function') {
        initFileHandler();
    }
    
    restorePanelsState();
    restoreTabsState();

    // Register Service Worker with version cache-busting for CDNs/Cloudflare
    if ('serviceWorker' in navigator) {
        const swVersion = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'v2.7.2';
        navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(swVersion), { updateViaCache: 'none' })
            .then(reg => {
                reg.update();
                console.log('Service Worker registrado com sucesso:', reg.scope);
            })
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }
});
