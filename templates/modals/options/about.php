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
