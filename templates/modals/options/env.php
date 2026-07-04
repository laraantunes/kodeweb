        <div id="options-env-view" class="hidden">
            <form id="form-options-env" onsubmit="saveOptionsEnv(event)">
                <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="options-env-local" style="width: 16px; height: 16px;">
                    <label class="form-label" for="options-env-local" style="margin-bottom: 0; cursor: pointer;">Ambiente Local (LOCAL_ENV=1)</label>
                </div>
                <div class="form-group" style="margin-top: 15px;">
                    <label class="form-label" for="options-env-workspace">Caminho do Workspace (WORKSPACE_PATH)</label>
                    <input type="text" class="form-input" id="options-env-workspace" list="workspace-history-list" placeholder="Padrão: <?= htmlspecialchars(str_replace('\\', '/', dirname(dirname(dirname(__DIR__))))) ?>">
                    <datalist id="workspace-history-list"></datalist>
                    <small class="form-text text-muted" style="font-size: 11px;">Se deixado em branco, utiliza a pasta superior padrão (<?= htmlspecialchars(str_replace('\\', '/', dirname(dirname(dirname(__DIR__))))) ?>).</small>
                </div>
                <div class="form-actions" style="margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Salvar Ambiente</button>
                </div>
            </form>
        </div>
