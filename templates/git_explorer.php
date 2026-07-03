<!-- Git Explorer Panel -->
<div id="git-explorer-container" class="hidden" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-primary); z-index: 5; overflow-y: auto; padding: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
        <h3 style="margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🌿</span> Git Integrado
        </h3>
        <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-primary" id="git-refresh-btn" data-tooltip="Atualizar Status">🔄 Atualizar</button>
        </div>
    </div>
    
    <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 12px;">Repositório:</label>
        <select id="git-repo-select" class="form-input" style="width: 100%; max-width: 400px;">
            <option value="">Carregando projetos...</option>
        </select>
        <span id="git-current-branch" style="display: none; margin-left: 10px; padding: 3px 8px; background: var(--bg-hover); border-radius: 4px; font-size: 12px; color: var(--accent-primary);"></span>
        <span id="git-sync-status" style="display: none; margin-left: 5px; font-size: 12px; color: var(--text-muted);"></span>
    </div>

    <div style="display: flex; gap: 20px; height: calc(100% - 150px); min-height: 400px;">
        
        <!-- Left Column: Staging Area -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 15px; border-right: 1px solid var(--border-color); padding-right: 20px;">
            
            <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">Staged Changes (A commitar)</h4>
                <div id="git-staged-files" style="flex: 1; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary); overflow-y: auto; padding: 5px;">
                    <!-- Staged files here -->
                </div>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px;">Unstaged Changes</h4>
                <div id="git-unstaged-files" style="flex: 1; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary); overflow-y: auto; padding: 5px;">
                    <!-- Unstaged files here -->
                </div>
            </div>
            
            <div style="margin-top: 10px;">
                <input type="text" id="git-commit-msg" class="form-input" placeholder="Mensagem do commit..." style="width: 100%; margin-bottom: 10px;">
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-primary" id="git-commit-btn" style="flex: 1;">✓ Commit</button>
                    <button class="btn" id="git-pull-btn" title="Git Pull">⬇ Pull</button>
                    <button class="btn" id="git-push-btn" title="Git Push">⬆ Push</button>
                </div>
            </div>
            
        </div>
        
        <!-- Right Column: Git Log / Output -->
        <div style="flex: 1; display: flex; flex-direction: column;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Histórico (Log)</h4>
            <pre id="git-log-output" style="flex: 1; margin: 0; background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: 4px; padding: 10px; font-family: monospace; font-size: 12px; color: var(--text-muted); overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">
            </pre>
        </div>

    </div>
</div>
