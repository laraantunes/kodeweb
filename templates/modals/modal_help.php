<!-- Modal for Help / Keyboard Shortcuts -->
<div class="modal-overlay" id="modal-help">
    <div class="modal-content" style="width: 550px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column;">
        <h3 class="modal-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>Atalhos de Teclado & Ajuda</span>
            <span class="close-modal-btn" onclick="closeModal('modal-help')" style="cursor: pointer; font-size: 20px; opacity: 0.7;">&times;</span>
        </h3>
        <div class="help-modal-body" style="overflow-y: auto; flex: 1; padding-right: 4px;">
            
            <h4 class="help-section-title">Navegação e Sistema</h4>
            <table class="help-shortcuts-table">
                <tr><td><kbd>Ctrl + P</kbd></td><td>Pesquisa rápida de arquivos (Go to File)</td></tr>
                <tr><td><kbd>Ctrl + S</kbd></td><td>Salvar arquivo atual</td></tr>
                <tr><td><kbd>Alt + W</kbd></td><td>Fechar aba atual</td></tr>
                <tr><td><kbd>Alt + ,</kbd> e <kbd>Alt + .</kbd></td><td>Navegar entre abas (Anterior / Próxima)</td></tr>
            </table>

            <h4 class="help-section-title">Edição no Editor (Ace)</h4>
            <table class="help-shortcuts-table">
                <tr><td><kbd>Ctrl + F</kbd></td><td>Buscar texto no arquivo</td></tr>
                <tr><td><kbd>Ctrl + H</kbd></td><td>Buscar e substituir texto</td></tr>
                <tr><td><kbd>Ctrl + L</kbd></td><td>Ir para uma linha específica</td></tr>
                <tr><td><kbd>Ctrl + Z</kbd></td><td>Desfazer última alteração</td></tr>
                <tr><td><kbd>Ctrl + Y</kbd> / <kbd>Ctrl + Shift + Z</kbd></td><td>Refazer alteração</td></tr>
                <tr><td><kbd>Ctrl + D</kbd></td><td>Remover linha atual</td></tr>
                <tr><td><kbd>Ctrl + /</kbd></td><td>Comentar / Descomentar linha</td></tr>
                <tr><td><kbd>Alt + ↑ / ↓</kbd></td><td>Mover linha selecionada para cima / baixo</td></tr>
                <tr><td><kbd>Alt + Shift + ↑ / ↓</kbd></td><td>Duplicar linha selecionada acima / abaixo</td></tr>
                <tr><td><kbd>Ctrl + Alt + ↑ / ↓</kbd></td><td>Adicionar cursor multi-linha acima / abaixo</td></tr>
                <tr><td><kbd>Tab</kbd> / <kbd>Shift + Tab</kbd></td><td>Avançar / Recuar tabulação (identação)</td></tr>
            </table>

            <h4 class="help-section-title">Terminal Integrado</h4>
            <table class="help-shortcuts-table">
                <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Navegar pelo histórico de comandos</td></tr>
                <tr><td><kbd>clear</kbd></td><td>Digitar no terminal para limpar o histórico visual</td></tr>
            </table>

            <h4 class="help-section-title">Explorador de Arquivos</h4>
            <table class="help-shortcuts-table">
                <tr><td><kbd>Duplo Clique</kbd></td><td>Abrir arquivo selecionado</td></tr>
            </table>
            
        </div>
        <div class="form-actions" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-color);">
            <button type="button" class="btn btn-primary" onclick="closeModal('modal-help')">Fechar</button>
        </div>
    </div>
</div>
