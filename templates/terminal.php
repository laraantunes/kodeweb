<!-- Bottom panel (Terminal) -->
<section class="terminal-panel" id="panel-bottom" style="height: 220px;">
    <div class="sidebar-header" style="background-color: #151515; display: flex; align-items: center; justify-content: space-between; padding-right: 10px;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; overflow-x: auto;">
            <span style="flex-shrink: 0;">Terminal</span>
            <div class="tabs-bar terminal-tabs-bar" id="terminal-tabs-container" style="flex: 1; border-bottom: none; background: transparent; padding: 0; min-height: unset; height: 24px; display: flex; gap: 4px; overflow-x: auto;">
                <!-- Dynamic terminal tabs load here -->
            </div>
        </div>
        <div style="display: flex; gap: 4px; flex-shrink: 0; margin-left: 10px;">
            <button class="btn btn-sm tooltip-left" id="btn-add-terminal" title="Novo Terminal Local" style="padding: 2px 6px; font-size:10px;">+ Aba</button>
            <button class="btn btn-sm tooltip-left" id="btn-add-ssh-terminal" title="Nova Conexão SSH" style="padding: 2px 6px; font-size:10px; background-color: #2c2538; border-color: var(--accent);">+ SSH</button>
        </div>
    </div>
    <div class="terminal-input-row">
        <span class="terminal-prompt" id="terminal-prompt-path"><?= htmlspecialchars($current_username) ?>@kodeweb:Workspace$</span>
        <input type="text" class="terminal-input" id="terminal-input"
            placeholder="Digite seu comando aqui e aperte Enter..." autocomplete="off">
    </div>
    <div class="terminal-console" id="terminal-console">
        <div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator - Inicializado.</div>
    </div>
</section>
