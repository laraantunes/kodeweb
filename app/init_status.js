// 4. Fetch status on initialization
async function fetchSystemStatus() {
    try {
        const response = await fetch(getApiUrl('status') + '?action=status');
        const data = await response.json();
        if (data.success) {
            state.workspaceRoot = data.workspace_root;
            // Populate database driver options
            populateDbDrivers(data.pdo_drivers);
            
            state.localEnv = data.local_env;
            const envCheckbox = document.getElementById('options-env-local');
            if (envCheckbox) {
                envCheckbox.checked = data.local_env;
            }
            
            if (data.username) {
                state.username = data.username;
                const userField = document.getElementById('options-username');
                if (userField) userField.value = data.username;
            }
            
            updateTerminalPrompt(data.terminal_cwd);
        }
    } catch (err) {
        console.error("Erro ao obter status do sistema:", err);
    }
}

function populateDbDrivers(drivers) {
    const select = document.getElementById('db-driver');
    select.innerHTML = '';
    
    // Add drivers in order of preference
    const driverNames = {
        'mysql': 'MySQL / MariaDB',
        'pgsql': 'PostgreSQL',
        'sqlite': 'SQLite (Local)'
    };
    
    drivers.forEach(drv => {
        if (driverNames[drv]) {
            const opt = document.createElement('option');
            opt.value = drv;
            opt.textContent = driverNames[drv];
            select.appendChild(opt);
        }
    });
    
    // Toggle fields based on initial selected driver
    toggleDbConnectionFields();
}
