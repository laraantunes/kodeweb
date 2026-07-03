<!-- Right panel (Database Connections & Queries) -->
<aside class="sidebar-panel" id="panel-right" style="width: 300px;">
    <div class="sidebar-header">
        <span>Banco de Dados</span>
        <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm tooltip-right" id="btn-explore-db" data-tooltip="Explorar Banco (Nova Aba)"
                style="padding: 2px 6px; font-size:10px; background-color: var(--bg-hover);">🔍 Explorar</button>
            <button class="btn btn-sm btn-primary tooltip-right" id="btn-add-db" data-tooltip="Nova Conexão"
                style="padding: 2px 6px; font-size:10px;">+ Conexão</button>
        </div>
    </div>
    <div class="panel-content" style="display: flex; flex-direction: column; gap: 12px;">

        <div>
            <h4 style="font-size: 12px; margin-bottom: 6px; color: var(--text-muted); font-weight:500;">Conexões
                Ativas</h4>
            <div id="db-connections">
                <!-- Saved connection cards load here -->
            </div>
        </div>

        <div class="db-query-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="font-size: 12px; color: var(--text-muted); font-weight:500;">Consulta SQL</h4>
                <button class="btn btn-sm btn-primary" id="execute-query-btn" style="padding:4px 10px;"
                    disabled>Executar</button>
            </div>

            <span id="active-db-label" style="font-size:11px; color: var(--text-muted); font-style:italic;">Sem
                conexão ativa.</span>

            <textarea class="sql-textarea" id="sql-query" placeholder="SELECT * FROM tabela LIMIT 10;"
                disabled></textarea>

            <h4 style="font-size: 12px; margin-top: 4px; color: var(--text-muted); font-weight:500;">Resultados
            </h4>
            <div class="db-results-container" id="db-results">
                <div style="padding:10px; color:var(--text-muted); font-size:11px;">Sem resultados. Execute uma
                    consulta para exibir dados.</div>
            </div>
        </div>

    </div>
</aside>
