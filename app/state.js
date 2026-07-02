// Application State
const state = {
    workspaceRoot: '',
    localEnv: false,
    username: typeof CURRENT_USERNAME !== 'undefined' ? CURRENT_USERNAME : 'user',
    terminals: {
        'term-1': { id: 'term-1', name: 'Terminal 1', cwd: '', history: [], historyIndex: -1, outputHTML: '<div class="terminal-line" style="color: var(--text-muted);">KodeWeb Terminal Emulator - Inicializado.</div>' }
    },
    activeTerminalId: 'term-1',
    terminalCounter: 1,
    openTabs: {},         // filePath -> { path, name, session, isDirty }
    activeTabPath: null,
    selectedNode: null,   // Currently highlighted element in tree { path, isDir }
    expandedFolders: new Set(),
    activeConnectionId: null,
    editor: null,
    allFiles: null,
    searchSelectedIndex: -1,
    searchFilteredResults: [],
    dbExplorer: {
        activeTab: 'data', // 'data' or 'structure'
        selectedDb: null,
        selectedTable: null,
        activeDriver: 'mysql',
        tableColumns: [],
        tableData: [],
        currentPage: 1,
        limit: 5,
        baseQuery: '',
        currentQuery: ''
    }
};

// Initialize the Application