<div class="no-active-file" id="no-file-placeholder">
    <img src="logo.svg" alt="KodeWeb Logo"
        style="height: 64px; width: 64px; margin-bottom: 12px; opacity: 0.85;">
    <h3>Boas-vindas ao KodeWeb</h3>
    <p style="margin-top: 8px; font-size:13px; color: var(--text-muted); margin-bottom: 20px;">Abra
        um arquivo na barra lateral para começar.</p>

    <div
        style="max-width: 320px; margin: 0 auto; text-align: left; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px 16px;">
        <h4
            style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--accent); margin-bottom:10px; text-align:center; letter-spacing:0.5px;">
            Atalhos Úteis</h4>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
            <span style="color:var(--text-muted);">Salvar Arquivo</span>
            <span><kbd
                    style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Ctrl
                    + S</kbd></span>
        </div>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
            <span style="color:var(--text-muted);">Fechar Aba/Arquivo</span>
            <span><kbd
                    style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Alt
                    + W</kbd></span>
        </div>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
            <span style="color:var(--text-muted);">Navegar entre Abas</span>
            <span><kbd
                    style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Alt
                    + ,</kbd> e <kbd
                    style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Alt
                    + .</kbd></span>
        </div>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
            <span style="color:var(--text-muted);">Abrir Arquivo</span>
            <span style="color:var(--text-primary); font-size:11px; font-weight:500;">Duplo
                clique</span>
        </div>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
            <span style="color:var(--text-muted);">Histórico do Terminal</span>
            <span><kbd
                    style="background:var(--bg-input); padding:2px 4px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">↑</kbd>
                <kbd
                    style="background:var(--bg-input); padding:2px 4px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">↓</kbd></span>
        </div>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:8px;">
            <span style="color:var(--text-muted);">Buscar Arquivo</span>
            <span><kbd
                    style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px;">Ctrl + P</kbd></span>
        </div>
        <div
            style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
            <span style="color:var(--text-muted);">Limpar Terminal</span>
            <span><kbd
                    style="background:var(--bg-input); padding:2px 6px; border-radius:3px; border:1px solid var(--border-color); font-size:11px; font-family:var(--font-mono);">clear</kbd></span>
        </div>
    </div>
    <div style="margin-top: 30px; font-size: 11px; color: var(--text-muted); text-align: center;">
        <?= $app_version ?> - 2026 <a href="https://laralabs.dev" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 500;">Laralabs</a>
    </div>
</div>
<div id="editor" class="editor-instance hidden"></div>

<!-- Image Preview Container -->
<div id="image-preview-container" class="hidden" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background-color: var(--bg-primary); z-index: 5; overflow: auto;">
    <div style="padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%;">
        <img id="image-preview-element" src="" style="max-width: 100%; max-height: calc(100vh - 150px); object-fit: contain; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border-radius: 4px; background-image: repeating-linear-gradient(45deg, #1d0c2c 25%, transparent 25%, transparent 75%, #1d0c2c 75%, #1d0c2c), repeating-linear-gradient(45deg, #1d0c2c 25%, #0b0114 25%, #0b0114 75%, #1d0c2c 75%, #1d0c2c); background-position: 0 0, 10px 10px; background-size: 20px 20px;">
        <div id="image-preview-info" style="margin-top: 15px; color: var(--text-muted); font-size: 12px; font-family: var(--font-mono);"></div>
    </div>
</div>

<!-- PDF Preview Container -->
<div id="pdf-preview-container" class="hidden" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-primary); z-index: 5;">
    <iframe id="pdf-preview-element" src="" style="width: 100%; height: 100%; border: none;"></iframe>
</div>

<!-- Markdown Preview Container -->
<div id="md-preview-container" class="hidden" style="position: absolute; top: 0; right: 0; bottom: 0; width: 50%; border-left: 1px solid var(--border-color); background: var(--bg-primary); z-index: 4; overflow-y: auto; padding: 20px;">
    <div id="md-preview-content" class="markdown-body" style="color: var(--text-primary);"></div>
</div>

<!-- Floating Markdown Toggle Button -->
<button id="md-toggle-btn" class="hidden" onclick="toggleMdPreview()" style="position: absolute; top: 15px; right: 25px; z-index: 6; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 5px 10px; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-size: 12px; display: flex; align-items: center; gap: 5px; transition: all 0.2s;">
    <span>👁️</span> Preview
</button>
