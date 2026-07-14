// Global loading indicator state
window.activeRequests = 0;
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    window.activeRequests++;
    const loader = document.getElementById('global-loading');
    if(loader) loader.style.display = 'inline-flex';
    
    try {
        const response = await originalFetch.apply(this, args);
        return response;
    } finally {
        window.activeRequests--;
        if(window.activeRequests <= 0) {
            window.activeRequests = 0;
            if(loader) loader.style.display = 'none';
        }
    }
};

function getApiUrl(action) {
    if (!action) return 'api.php';
    const files = ['files_list', 'files_list_recursive', 'file_read', 'file_serve', 'file_save', 'file_create', 'file_upload', 'file_rename', 'file_delete'];
    const db = ['db_connections_list', 'db_connection_save', 'db_connection_delete', 'db_query_execute', 'db_list_databases', 'db_list_tables', 'db_table_structure', 'db_column_add', 'db_column_delete', 'db_column_modify', 'db_row_insert', 'db_row_update', 'db_row_delete'];
    const ftp = ['ftp_connections_list', 'ftp_connection_save', 'ftp_connection_delete', 'ftp_test', 'ftp_list', 'ftp_file_read', 'ftp_file_save', 'ftp_transfer_batch_local', 'ftp_transfer_local', 'ftp_transfer_batch_remote', 'ftp_transfer_remote', 'ftp_list_recursive', 'ftp_mkdir', 'ftp_delete', 'ftp_rename', 'ftp_file_upload'];
    const terminal = ['terminal_cmd'];
    const ssh = ['ssh_connections_list', 'ssh_connection_save', 'ssh_connection_delete', 'ssh_test_connection', 'ssh_terminal_cmd'];
    const user = ['update_user'];
    const git = ['git_repos', 'git_status', 'git_diff', 'git_action'];
    const kodeweb = ['status', 'update_kodeweb', 'update_env', 'get_plugins', 'save_plugins', 'save_editor_theme'];

    if (files.includes(action)) return 'api/files.php';
    if (db.includes(action)) return 'api/db.php';
    if (ftp.includes(action)) return 'api/ftp.php';
    if (terminal.includes(action)) return 'api/terminal.php';
    if (ssh.includes(action)) return 'api/ssh.php';
    if (user.includes(action)) return 'api/user.php';
    if (git.includes(action)) return 'api/git.php';
    if (kodeweb.includes(action)) return 'api/kodeweb.php';
    
    return 'api.php';
}

// app.js - Client-side logic for KodeWeb IDE
