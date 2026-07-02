// 2. Panel Resizing
function initLayoutResizers() {
    const leftPanel = document.getElementById('panel-left');
    const rightPanel = document.getElementById('panel-right');
    const bottomPanel = document.getElementById('panel-bottom');
    
    const resizerLeft = document.getElementById('resizer-left');
    const resizerRight = document.getElementById('resizer-right');
    const resizerBottom = document.getElementById('resizer-bottom');
    
    setupResizer(resizerLeft, leftPanel, 'v', 'left');
    setupResizer(resizerRight, rightPanel, 'v', 'right');
    setupResizer(resizerBottom, bottomPanel, 'h', 'bottom');
}

function setupResizer(resizer, panel, orientation, side) {
    let startOffset, startSize;
    
    resizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        resizer.classList.add('dragging');
        document.body.style.cursor = orientation === 'v' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
        
        if (orientation === 'v') {
            startOffset = e.clientX;
            startSize = panel.offsetWidth;
        } else {
            startOffset = e.clientY;
            startSize = panel.offsetHeight;
        }
        
        const onPointerMove = (moveEvent) => {
            if (orientation === 'v') {
                const delta = moveEvent.clientX - startOffset;
                const newSize = side === 'left' ? startSize + delta : startSize - delta;
                if (newSize > 120 && newSize < 800) {
                    panel.style.width = `${newSize}px`;
                }
            } else {
                const delta = moveEvent.clientY - startOffset;
                const newSize = startSize - delta; // Dragging up increases height
                if (newSize > 80 && newSize < 600) {
                    panel.style.height = `${newSize}px`;
                }
            }
            if (state.editor) state.editor.resize();
        };
        
        const onPointerUp = () => {
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
        
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    });
}

// 3. Panel Toggle Views
function initPanelToggles() {
    const leftBtn = document.getElementById('toggle-left-btn');
    const rightBtn = document.getElementById('toggle-right-btn');
    const bottomBtn = document.getElementById('toggle-bottom-btn');
    
    if (leftBtn) leftBtn.addEventListener('click', () => togglePanel('panel-left', 'resizer-left', leftBtn));
    if (rightBtn) rightBtn.addEventListener('click', () => togglePanel('panel-right', 'resizer-right', rightBtn));
    if (bottomBtn) bottomBtn.addEventListener('click', () => togglePanel('panel-bottom', 'resizer-bottom', bottomBtn));
}

function togglePanel(panelId, resizerId, button) {
    const panel = document.getElementById(panelId);
    const resizer = document.getElementById(resizerId);
    
    panel.classList.toggle('hidden');
    if (resizer) resizer.classList.toggle('hidden');
    button.classList.toggle('active');
    
    if (state.editor) state.editor.resize();
    savePanelsState();
}
