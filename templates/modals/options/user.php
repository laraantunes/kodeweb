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
