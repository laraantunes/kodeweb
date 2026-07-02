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
    restoreTabsState();
});
