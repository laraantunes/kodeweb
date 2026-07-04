(function () {
    // Carregar xterm.js dinamicamente se não existir
    if (!window.Terminal) {
        const xtermCss = document.createElement('link');
        xtermCss.rel = 'stylesheet';
        xtermCss.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css';
        document.head.appendChild(xtermCss);

        const xtermJs = document.createElement('script');
        xtermJs.src = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js';
        xtermJs.onload = () => {
            const xtermFit = document.createElement('script');
            xtermFit.src = 'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js';
            document.head.appendChild(xtermFit);
        };
        document.head.appendChild(xtermJs);
    }

    let socket = null;
    let terminal = null;
    let fitAddon = null;
    let isConnected = false;
    let initAttempts = 0;

    // Criar interface do terminal interativo
    let pluginContainer = document.getElementById('plugin_interactive_terminal-container');
    if (!pluginContainer) {
        pluginContainer = document.createElement('div');
        pluginContainer.id = 'plugin_interactive_terminal-container';
        pluginContainer.className = 'plugin-container hidden';
        pluginContainer.style.width = '100%';
        pluginContainer.style.height = '100%';
        pluginContainer.style.overflow = 'hidden';
        pluginContainer.style.background = '#000000';
        pluginContainer.style.display = 'flex';
        pluginContainer.style.flexDirection = 'column';

        // Header de controle
        const header = document.createElement('div');
        header.style.padding = '10px';
        header.style.background = 'var(--bg-secondary)';
        header.style.borderBottom = '1px solid var(--border-color)';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        header.innerHTML = `
            <div style="color: var(--text-primary); font-weight: bold; font-size: 13px;">Terminal Interativo</div>
            <div>
                <span id="xterm-status" style="margin-right: 15px; font-size: 12px; color: var(--accent-danger);">Desconectado</span>
                <button id="xterm-reconnect-btn" class="btn btn-sm btn-primary">Reconectar</button>
            </div>
        `;

        // Container do Xterm
        const xtermContainer = document.createElement('div');
        xtermContainer.id = 'xterm-container';
        xtermContainer.style.flex = '1';
        xtermContainer.style.width = '100%';
        xtermContainer.style.overflow = 'hidden';
        xtermContainer.style.padding = '5px';

        pluginContainer.appendChild(header);
        pluginContainer.appendChild(xtermContainer);

        const editorWrapper = document.querySelector('.editor-wrapper');
        if (editorWrapper) {
            editorWrapper.appendChild(pluginContainer);
        }

        document.getElementById('xterm-reconnect-btn').addEventListener('click', connectWebSocket);
    }

    function initXterm() {
        if (terminal) return;
        if (!window.Terminal || !window.FitAddon) {
            initAttempts++;
            if (initAttempts > 50) {
                document.getElementById('xterm-status').innerText = 'Erro ao carregar (Pressione F5)';
                document.getElementById('xterm-status').style.color = 'var(--accent-danger)';
                return;
            }
            setTimeout(initXterm, 100);
            return;
        }

        terminal = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#000000',
                foreground: '#f8f8f2'
            },
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 14
        });

        fitAddon = new FitAddon.FitAddon();
        terminal.loadAddon(fitAddon);

        terminal.open(document.getElementById('xterm-container'));
        fitAddon.fit();

        window.addEventListener('resize', () => {
            if (!pluginContainer.classList.contains('hidden')) {
                fitAddon.fit();
            }
        });

        terminal.onData(data => {
            if (socket && isConnected) {
                socket.send(JSON.stringify({ type: 'input', input: data }));
            }
        });
    }

    async function connectWebSocket() {
        if (!terminal) {
            initXterm();
            // Wait for terminal to finish initialization
            setTimeout(connectWebSocket, 200);
            return;
        }

        document.getElementById('xterm-status').innerText = 'Iniciando servidor...';
        document.getElementById('xterm-status').style.color = 'var(--text-muted)';

        try {
            // Chama a API PHP para iniciar o servidor (se já não estiver rodando)
            const res = await fetch('plugins/interactive_terminal/api/start-server.php');
            const data = await res.json();
            
            if (!data.success) {
                document.getElementById('xterm-status').innerText = 'Falha no Servidor';
                document.getElementById('xterm-status').style.color = 'var(--accent-danger)';
                if (terminal) {
                    terminal.writeln(`\r\n\x1b[31mERRO: ${data.message}\x1b[0m`);
                }
                return;
            }
        } catch (e) {
            console.error("Erro ao tentar iniciar o servidor:", e);
        }

        document.getElementById('xterm-status').innerText = 'Conectando...';

        if (socket) {
            socket.onclose = null;
            socket.close();
        }

        // Delay para garantir que o server iniciou
        setTimeout(() => {
            const host = window.location.hostname || '127.0.0.1';
            const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            
            let wsUrl = `${wsProtocol}://${host}:28422`;
            
            // Em ambiente HTTPS (geralmente produção), usamos um proxy reverso para contornar firewalls e usar SSL
            if (window.location.protocol === 'https:') {
                let pathname = window.location.pathname.replace(/\/[^\/]*$/, ''); // Pega o diretório atual
                if (pathname === '/') pathname = '';
                wsUrl = `${wsProtocol}://${window.location.host}${pathname}/ws-terminal`;
            }

            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                isConnected = true;
                document.getElementById('xterm-status').innerText = 'Conectado';
                document.getElementById('xterm-status').style.color = 'var(--accent-success)';
                if (terminal) {
                    terminal.clear();
                    terminal.writeln('\x1b[32mConectado ao servidor do terminal interativo.\x1b[0m');
                }
                
                const startPayload = { type: 'start' };
                if (window.interactiveTerminalSshConnId) {
                    startPayload.connection_id = window.interactiveTerminalSshConnId;
                }
                
                socket.send(JSON.stringify(startPayload));
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'output' && terminal) {
                        terminal.write(data.data);
                    } else if (data.type === 'status' || data.type === 'error') {
                        // ignore or log
                    }
                } catch (e) {
                    if (terminal) terminal.write(event.data);
                }
            };

            socket.onclose = () => {
                isConnected = false;
                document.getElementById('xterm-status').innerText = 'Desconectado';
                document.getElementById('xterm-status').style.color = 'var(--accent-danger)';
                if (terminal) {
                    terminal.writeln('\r\n\x1b[31mConexão perdida ou recusada.\x1b[0m');
                    terminal.writeln('\x1b[33mSe você estiver no Windows, o servidor não pode iniciar automaticamente no painel do XAMPP.\x1b[0m');
                    terminal.writeln('\x1b[33mPor favor, vá na pasta do kodeweb e dê um duplo clique no arquivo \x1b[1miterm-start.bat\x1b[22m\x1b[0m');
                }
            };

            socket.onerror = (error) => {
                console.error("WebSocket Error: ", error);
            };
        }, 1000);
    }

    // Adiciona o botão na barra inferior de terminais
    const terminalBtns = document.querySelector('.terminal-panel .sidebar-header > div:nth-child(2)');
    if (terminalBtns && !document.getElementById('btn-add-interactive-terminal')) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm tooltip-left';
        btn.id = 'btn-add-interactive-terminal';
        btn.title = 'Terminal Interativo (WS)';
        btn.style = 'padding: 2px 6px; font-size:10px; background-color: var(--accent); border-color: var(--accent); color: white; margin-left: 4px;';
        btn.innerHTML = '💻 Interativo';
        btn.onclick = () => {
            window.interactiveTerminalSshConnId = null; // Clear SSH context for local
            // Se openFile existir, usa para simular aba. Se não, mostra o container.
            if (typeof openFile === 'function') {
                openFile('plugin_interactive_terminal', 'Terminal Interativo');
                setTimeout(() => {
                    if (fitAddon) fitAddon.fit();
                    if (!isConnected) connectWebSocket();
                }, 100);
            } else {
                document.querySelectorAll('.plugin-container, .editor-inner, #db-explorer-view, #ftp-explorer-view, #git-explorer-view').forEach(el => el.classList.add('hidden'));
                pluginContainer.classList.remove('hidden');
                setTimeout(() => {
                    if (fitAddon) fitAddon.fit();
                    if (!isConnected) connectWebSocket();
                }, 100);
            }
        };
        terminalBtns.appendChild(btn);
    }
    
    // Add global function for SSH Interactive Terminal
    window.openSshInteractiveTerminal = function(connId, connName) {
        if (typeof closeModal === 'function') closeModal('modal-ssh-connection');
        
        // Disconnect if already connected to a different context
        if (socket && isConnected) {
            socket.close();
            terminal.clear();
        }
        
        window.interactiveTerminalSshConnId = connId;
        
        if (typeof openFile === 'function') {
            openFile('plugin_interactive_terminal', 'Terminal Interativo (SSH: ' + connName + ')');
            setTimeout(() => {
                if (fitAddon) fitAddon.fit();
                if (!isConnected) connectWebSocket();
            }, 100);
        } else {
            document.querySelectorAll('.plugin-container, .editor-inner, #db-explorer-view, #ftp-explorer-view, #git-explorer-view').forEach(el => el.classList.add('hidden'));
            pluginContainer.classList.remove('hidden');
            setTimeout(() => {
                if (fitAddon) fitAddon.fit();
                if (!isConnected) connectWebSocket();
            }, 100);
        }
    };
})();
