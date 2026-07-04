<!-- Modal for Options -->
<div class="modal-overlay" id="modal-options">
    <div class="modal-content" style="width: 500px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 class="modal-header">Opções</h3>
        
        <div class="db-table-tabs" style="margin-bottom: 15px; justify-content: flex-start; gap: 10px;">
            <button class="db-tab-btn active" id="options-tab-conn-btn" onclick="switchOptionsTab('conn')" style="border-radius: 4px;">Conexões</button>
            <button class="db-tab-btn" id="options-tab-env-btn" onclick="switchOptionsTab('env')" style="border-radius: 4px;">Ambiente</button>
            <button class="db-tab-btn" id="options-tab-editor-btn" onclick="switchOptionsTab('editor')" style="border-radius: 4px;">Editor</button>
            <button class="db-tab-btn" id="options-tab-user-btn" onclick="switchOptionsTab('user')" style="border-radius: 4px;">Usuário</button>
            <button class="db-tab-btn" id="options-tab-plugins-btn" onclick="switchOptionsTab('plugins')" style="border-radius: 4px;">Plugins</button>
            <button class="db-tab-btn" id="options-tab-about-btn" onclick="switchOptionsTab('about')" style="border-radius: 4px;">Sobre</button>
        </div>
        
        <div id="options-conn-view">
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-db-connections-list').classList.add('active'); loadDbConnectionsModalList();">Conexões DB</button>
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-ftp-connection').classList.add('active'); switchFtpModalTab('list');">Conexões FTP</button>
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-ssh-connection').classList.add('active'); switchSshModalTab('list');">Conexões SSH</button>
            </div>
        </div>
        
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

        <div id="options-editor-view" class="hidden">
            <form id="form-options-editor" onsubmit="saveOptionsEditor(event)">
                <div class="form-group" style="margin-top: 15px;">
                    <label class="form-label" for="options-editor-theme">Tema do Editor</label>
                    <select class="form-input" id="options-editor-theme">
                        <optgroup label="Temas Escuros (Dark)">
                            <option value="dracula">Dracula (Padrão)</option>
                            <option value="ambiance">Ambiance</option>
                            <option value="chaos">Chaos</option>
                            <option value="clouds_midnight">Clouds Midnight</option>
                            <option value="cobalt">Cobalt</option>
                            <option value="gob">Green on Black</option>
                            <option value="gruvbox">Gruvbox</option>
                            <option value="idle_fingers">idle Fingers</option>
                            <option value="kr_theme">krTheme</option>
                            <option value="merbivore">Merbivore</option>
                            <option value="merbivore_soft">Merbivore Soft</option>
                            <option value="mono_industrial">Mono Industrial</option>
                            <option value="monokai">Monokai</option>
                            <option value="pastel_on_dark">Pastel on Dark</option>
                            <option value="solarized_dark">Solarized Dark</option>
                            <option value="terminal">Terminal</option>
                            <option value="tomorrow_night">Tomorrow Night</option>
                            <option value="tomorrow_night_blue">Tomorrow Night Blue</option>
                            <option value="tomorrow_night_bright">Tomorrow Night Bright</option>
                            <option value="tomorrow_night_eighties">Tomorrow Night 80s</option>
                            <option value="twilight">Twilight</option>
                            <option value="vibrant_ink">Vibrant Ink</option>
                            <option value="github_dark">GitHub Dark</option>
                        </optgroup>
                        <optgroup label="Temas Claros (Light)">
                            <option value="chrome">Chrome</option>
                            <option value="clouds">Clouds</option>
                            <option value="crimson_editor">Crimson Editor</option>
                            <option value="dawn">Dawn</option>
                            <option value="dreamweaver">Dreamweaver</option>
                            <option value="eclipse">Eclipse</option>
                            <option value="github">GitHub</option>
                            <option value="iplastic">IPlastic</option>
                            <option value="katzenmilch">KatzenMilch</option>
                            <option value="kuroir">Kuroir</option>
                            <option value="solarized_light">Solarized Light</option>
                            <option value="sqlserver">SQL Server</option>
                            <option value="textmate">TextMate</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="xcode">XCode</option>
                        </optgroup>
                    </select>
                </div>
                <div class="form-actions" style="margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Salvar Tema</button>
                </div>
            </form>
        </div>

        <div id="options-user-view" class="hidden">
            <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
                <p style="margin-bottom: 10px; font-size: 13px; color: var(--text-muted);">Configurações avançadas do usuário:</p>
                <?php
                $kodeWebRoot = dirname(dirname(__DIR__));
                $workspacePath = dirname($kodeWebRoot);
                if (isset($env['WORKSPACE_PATH']) && trim($env['WORKSPACE_PATH']) !== '') {
                    $workspacePath = trim($env['WORKSPACE_PATH']);
                }
                $workspaceRoot = realpath($workspacePath) ?: $workspacePath;
                $relPath = ltrim(str_replace($workspaceRoot, '', $kodeWebRoot), '/\\') . '/data/user-settings.yaml';
                $relPath = str_replace('\\', '/', $relPath);
                ?>
                <button type="button" class="btn" onclick="openFile('<?= htmlspecialchars($relPath) ?>'); closeModal('modal-options');">⚙️ Abrir Configurações (user-settings.yaml)</button>
            </div>
            <form id="form-options-user" onsubmit="saveOptionsUser(event)">
                <div class="form-group">
                    <label class="form-label" for="options-username">Usuário</label>
                    <input type="text" class="form-input" id="options-username" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="options-password">Nova Senha (deixe em branco para não alterar)</label>
                    <input type="password" class="form-input" id="options-password" placeholder="Nova senha...">
                </div>
                <div class="form-actions" style="margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Salvar Usuário</button>
                </div>
            </form>
        </div>

        <div id="options-plugins-view" class="hidden">
            <h4 style="margin-bottom: 15px; color: var(--text-primary);">Gerenciador de Plugins</h4>
            <div id="options-plugins-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">Carregando plugins...</div>
            </div>
            <div class="form-actions" style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="savePluginsConfig()">Salvar Plugins</button>
            </div>
        </div>

        <div id="options-about-view" class="hidden">
            <div style="text-align: center; padding: 20px;">
                <img src="logo.svg" alt="KodeWeb Logo" style="height: 64px; width: 64px; margin-bottom: 12px;">
                <h3>KodeWeb IDE</h3>
                <p style="margin-top: 10px; font-size: 13px; color: var(--text-muted);">
                    <?= $app_version ?> - 2026 <a href="https://laralabs.dev" target="_blank" style="color: var(--accent); text-decoration: none;">Laralabs</a>
                </p>
                <p style="margin-top: 10px; font-size: 13px; color: var(--text-muted);">
                    <a href="https://github.com/laraantunes/kodeweb" target="_blank" style="color: var(--accent); text-decoration: none;">https://github.com/laraantunes/kodeweb</a>
                </p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" id="btn-update-kodeweb" onclick="updateKodeWeb(this)">Buscar Atualizações</button>
                </div>
            </div>
        </div>
        
        <div class="form-actions" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
            <button type="button" class="btn" onclick="closeModal('modal-options')">Fechar</button>
        </div>
    </div>
</div>
