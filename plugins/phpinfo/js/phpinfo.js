(function() {
    // Adiciona o container do plugin se não existir
    let pluginContainer = document.getElementById('plugin_phpinfo-container');
    if (!pluginContainer) {
        pluginContainer = document.createElement('div');
        pluginContainer.id = 'plugin_phpinfo-container';
        pluginContainer.className = 'plugin-container hidden';
        pluginContainer.style.width = '100%';
        pluginContainer.style.height = '100%';
        pluginContainer.style.overflow = 'hidden';
        pluginContainer.style.background = 'var(--bg-primary)';
        
        // Carrega o iframe apontando para o index.php interno do plugin
        pluginContainer.innerHTML = '<iframe src="plugins/phpinfo/index.php" style="width: 100%; height: 100%; border: none; display: block;"></iframe>';
        
        const editorWrapper = document.querySelector('.editor-wrapper');
        if (editorWrapper) {
            editorWrapper.appendChild(pluginContainer);
        }
    }

    // Cria o botão Info na aba Sobre das opções
    const aboutView = document.querySelector('#options-about-view > div');
    if (aboutView) {
        if (!document.getElementById('plugin_phpinfo-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.id = 'plugin_phpinfo-btn';
            btn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 78" width="20" height="11" style="vertical-align: middle;"><ellipse cx="74" cy="39" rx="74" ry="39" fill="#777bb3"/><path d="M26.7 51.5h8.9c9.3 0 12-5.5 12-9.6 0-5.8-3.7-9.5-11.8-9.5H23.5l-3.3 19.1zm2.3-15.5H35c4.7 0 6.6 2 6.6 5.5 0 4-3 5.9-6.3 5.9H31l1.9-11.4zm23 15.5H57l2.2-12.7c.3-1.6 1.7-3.1 4.1-3.1h2.2l-2.7 15.8h4.9l2.7-15.8h2.2c2.4 0 3.7 1.4 3.4 3.1l-2.2 12.7h4.9l2.4-13.8c.7-4-1.9-6.5-6.5-6.5h-5.2l.6-3.4H62.6l-3.4 19.1zM93 51.5h8.9c9.3 0 12-5.5 12-9.6 0-5.8-3.7-9.5-11.8-9.5H89.9l-3.3 19.1zm2.4-15.5h5.9c4.7 0 6.6 2 6.6 5.5 0 4-3 5.9-6.3 5.9h-4.3l1.9-11.4z" fill="#0b0114"/></svg> Abrir PHP Info</span>';
            
            btn.addEventListener('click', () => {
                if (typeof closeModal === 'function') closeModal('modal-options');
                if (typeof openFile === 'function') openFile('plugin_phpinfo', 'PHP Info');
            });

            const newContainer = document.createElement('div');
            newContainer.style.marginTop = '15px';
            newContainer.style.textAlign = 'center';
            newContainer.appendChild(btn);
            
            aboutView.appendChild(newContainer);
        }
    }
    
    // FORÇAR RENDERIZAÇÃO E DEBUG
    setTimeout(() => {
        let updateBtn = document.getElementById('btn-update-kodeweb');
        if (updateBtn) {
            updateBtn.style.display = 'inline-block';
            updateBtn.style.visibility = 'visible';
            updateBtn.style.opacity = '1';
            updateBtn.style.position = 'relative';
            updateBtn.style.zIndex = '9999';
        }
        
        let formActions = document.querySelector('#modal-options .form-actions');
        if (formActions) {
            formActions.style.display = 'block';
            formActions.style.visibility = 'visible';
            formActions.style.opacity = '1';
        }
    }, 500);
})();
