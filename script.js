// Floor Plan Designer - Table Layout Tool

class FloorPlanDesigner {
    constructor() {
        this.canvas = document.getElementById('floorPlanCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tableContainer = document.getElementById('tableContainer');
        this.tables = [];
        this.roomLength = 20; // feet
        this.roomWidth = 15; // feet
        this.baseScale = 25; // pixels per foot (increased for better visibility)
        this.scale = 25; // current scale (can be zoomed)
        this.zoomLevel = 1.0; // zoom multiplier
        this.gridSize = 1; // feet
        this.showGrid = true;
        this.showDimensions = true;
        this.snapToGrid = false;
        this.selectedTable = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.tableIdCounter = 0;
        this.tableNameCounter = 1;

        this.initializeEventListeners();
        // Check if initial dimensions need auto-fit
        setTimeout(() => {
            const container = this.canvas.parentElement;
            const maxWidth = container.clientWidth - 40;
            const maxHeight = container.clientHeight - 40;
            const neededWidth = this.roomLength * this.baseScale;
            const neededHeight = this.roomWidth * this.baseScale;
            
            if (neededWidth > maxWidth || neededHeight > maxHeight) {
                this.fitToScreen();
            } else {
                this.updateCanvasSize();
                this.draw();
            }
        }, 100);
    }

    initializeEventListeners() {
        // Room dimensions
        document.getElementById('updateDimensions').addEventListener('click', () => {
            this.roomLength = parseFloat(document.getElementById('roomLength').value);
            this.roomWidth = parseFloat(document.getElementById('roomWidth').value);
            // Auto-fit to screen when dimensions change if they're too large
            const container = this.canvas.parentElement;
            const maxWidth = container.clientWidth - 40;
            const maxHeight = container.clientHeight - 40;
            const neededWidth = this.roomLength * this.baseScale;
            const neededHeight = this.roomWidth * this.baseScale;
            
            if (neededWidth > maxWidth || neededHeight > maxHeight) {
                // Auto-fit if too large
                this.fitToScreen();
            } else {
                this.updateCanvasSize();
                this.draw();
            }
        });

        // Add table buttons
        document.querySelectorAll('.btn-table').forEach(btn => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.dataset.size);
                this.addTable(size);
            });
        });

        // Clear all
        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all tables?')) {
                this.tables = [];
                this.tableNameCounter = 1;
                this.updateTableCount();
                this.draw();
            }
        });

        // Download as PNG
        document.getElementById('downloadPlan').addEventListener('click', () => {
            this.downloadAsPNG();
        });

        // Grid snap toggle
        document.getElementById('snapToGrid').addEventListener('click', () => {
            this.snapToGrid = !this.snapToGrid;
            document.getElementById('snapToGrid').textContent = 
                this.snapToGrid ? 'Disable Grid Snap' : 'Enable Grid Snap';
        });

        // Show grid toggle
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.draw();
        });

        // Show dimensions toggle
        document.getElementById('showDimensions').addEventListener('change', (e) => {
            this.showDimensions = e.target.checked;
            this.draw();
        });

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3.0);
            this.updateZoom();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.5);
            this.updateZoom();
        });

        document.getElementById('resetZoom').addEventListener('click', () => {
            this.zoomLevel = 1.0;
            this.updateZoom();
        });

        // Bottom zoom controls
        document.getElementById('zoomInBottom').addEventListener('click', () => {
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3.0);
            this.updateZoom();
        });

        document.getElementById('zoomOutBottom').addEventListener('click', () => {
            this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.5);
            this.updateZoom();
        });

        document.getElementById('fitToScreen').addEventListener('click', () => {
            this.fitToScreen();
        });

        // Zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        zoomSlider.addEventListener('input', (e) => {
            this.zoomLevel = parseFloat(e.target.value) / 100;
            this.updateZoom();
        });

        // Mouse wheel zoom (with Ctrl/Cmd key for precision)
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                this.zoomLevel = Math.max(0.25, Math.min(3.0, this.zoomLevel + delta));
                this.updateZoom();
            }
        }, { passive: false });

        // Canvas click to place tables
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / this.scale;
                const y = (e.clientY - rect.top) / this.scale;
                // Check if clicking on a table
                const clickedTable = this.getTableAtPosition(x, y);
                if (clickedTable) {
                    this.selectTable(clickedTable);
                }
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.updateCanvasSize();
            this.draw();
        });
    }

    updateCanvasSize() {
        // Use zoom level to determine scale
        this.scale = this.baseScale * this.zoomLevel;
        
        // Calculate canvas size
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;

        const canvasWidth = this.roomLength * this.scale;
        const canvasHeight = this.roomWidth * this.scale;

        // Always use actual calculated size to allow proper scrolling
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        this.tableContainer.style.width = this.canvas.width + 'px';
        this.tableContainer.style.height = this.canvas.height + 'px';
        
        document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100);
        
        // Update zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.value = Math.round(this.zoomLevel * 100);
        }
        
        this.draw();
        this.renderTables();
    }

    updateZoom() {
        this.updateCanvasSize();
    }

    fitToScreen() {
        // Calculate the zoom level needed to fit the room in the visible area
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;

        const scaleX = maxWidth / (this.roomLength * this.baseScale);
        const scaleY = maxHeight / (this.roomWidth * this.baseScale);
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
        
        this.zoomLevel = Math.max(0.25, Math.min(1.0, fitScale)); // Clamp between 25% and 100%
        this.updateZoom();
    }

    addTable(size) {
        const table = {
            id: this.tableIdCounter++,
            size: size, // feet
            name: `Table ${this.tableNameCounter++}`, // default name
            x: this.roomLength / 2, // center of room
            y: this.roomWidth / 2,
            width: size,
            height: size * 0.6 // rectangular tables
        };

        this.tables.push(table);
        this.updateTableCount();
        this.renderTables();
    }

    renderTables() {
        // Clear existing table elements
        this.tableContainer.innerHTML = '';

        this.tables.forEach(table => {
            const tableElement = document.createElement('div');
            tableElement.className = 'table-item';
            tableElement.dataset.tableId = table.id;

            const width = table.width * this.scale;
            const height = table.height * this.scale;
            const centerX = table.x * this.scale;
            const centerY = table.y * this.scale;
            const x = centerX - width / 2;
            const y = centerY - height / 2;

            tableElement.style.width = width + 'px';
            tableElement.style.height = height + 'px';
            tableElement.style.left = x + 'px';
            tableElement.style.top = y + 'px';

            // Calculate font size based on table size and scale
            const minFontSize = Math.max(8, this.scale * 0.3);
            const maxFontSize = Math.min(16, this.scale * 0.6);
            const fontSize = Math.max(minFontSize, Math.min(maxFontSize, width * 0.15));
            const smallFontSize = fontSize * 0.7;
            
            tableElement.innerHTML = `
                <div class="table-label" style="font-size: ${fontSize}px;">
                    <div class="table-name" style="font-size: ${fontSize}px;">${table.name}</div>
                    <div class="table-size-info" style="font-size: ${smallFontSize}px;">${table.size}ft</div>
                    ${this.showDimensions ? `<div class="table-size" style="font-size: ${smallFontSize * 0.85}px;">${table.width.toFixed(1)}×${table.height.toFixed(1)}ft</div>` : ''}
                </div>
                <div class="delete-btn" data-table-id="${table.id}">×</div>
            `;

            // Double-click to edit name
            tableElement.addEventListener('dblclick', (e) => {
                if (e.target.classList.contains('delete-btn')) return;
                this.editTableName(table, tableElement);
            });

            // Drag functionality
            this.makeDraggable(tableElement, table);

            // Delete button
            const deleteBtn = tableElement.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTable(table.id);
            });

            this.tableContainer.appendChild(tableElement);
        });
    }

    makeDraggable(element, table) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            
            isDragging = true;
            this.isDragging = true;
            element.classList.add('dragging');
            
            const rect = element.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialX = table.x;
            initialY = table.y;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = (e.clientX - startX) / this.scale;
            const deltaY = (e.clientY - startY) / this.scale;

            let newX = initialX + deltaX;
            let newY = initialY + deltaY;

            // Boundary checking
            newX = Math.max(table.width / 2, Math.min(this.roomLength - table.width / 2, newX));
            newY = Math.max(table.height / 2, Math.min(this.roomWidth - table.height / 2, newY));

            // Grid snapping
            if (this.snapToGrid) {
                newX = Math.round(newX / this.gridSize) * this.gridSize;
                newY = Math.round(newY / this.gridSize) * this.gridSize;
            }

            table.x = newX;
            table.y = newY;

            this.renderTables();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.isDragging = false;
                element.classList.remove('dragging');
            }
        });
    }

    getTableAtPosition(x, y) {
        for (let i = this.tables.length - 1; i >= 0; i--) {
            const table = this.tables[i];
            const halfWidth = table.width / 2;
            const halfHeight = table.height / 2;
            
            if (x >= table.x - halfWidth && x <= table.x + halfWidth &&
                y >= table.y - halfHeight && y <= table.y + halfHeight) {
                return table;
            }
        }
        return null;
    }

    selectTable(table) {
        this.selectedTable = table;
        // Visual feedback could be added here
    }

    removeTable(id) {
        this.tables = this.tables.filter(t => t.id !== id);
        this.updateTableCount();
        this.renderTables();
    }

    editTableName(table, tableElement) {
        const nameDiv = tableElement.querySelector('.table-name');
        const currentName = table.name;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'table-name-input';
        input.style.cssText = `
            width: 100%;
            padding: 4px;
            border: 2px solid #667eea;
            border-radius: 4px;
            font-size: 1em;
            font-weight: bold;
            text-align: center;
            background: white;
            color: #333;
        `;
        
        nameDiv.replaceWith(input);
        input.focus();
        input.select();
        
        const finishEdit = () => {
            const newName = input.value.trim() || `Table ${table.id + 1}`;
            table.name = newName;
            this.renderTables();
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            }
        });
    }

    downloadAsPNG() {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        const extraHeight = this.showDimensions ? 50 : 0;
        const extraWidth = this.showDimensions ? 50 : 0;
        exportCanvas.width = this.canvas.width + extraWidth;
        exportCanvas.height = this.canvas.height + extraHeight;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Draw the floor plan background
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.fillStyle = '#f8f9fa';
        exportCtx.fillRect(extraWidth / 2, extraHeight / 2, this.canvas.width, this.canvas.height);
        
        const offsetX = extraWidth / 2;
        const offsetY = extraHeight / 2;
        
        // Draw grid if enabled
        if (this.showGrid) {
            exportCtx.strokeStyle = '#e0e0e0';
            exportCtx.lineWidth = 1;
            const gridSpacing = this.gridSize * this.scale;
            
            for (let x = 0; x <= this.canvas.width; x += gridSpacing) {
                exportCtx.beginPath();
                exportCtx.moveTo(x + offsetX, offsetY);
                exportCtx.lineTo(x + offsetX, this.canvas.height + offsetY);
                exportCtx.stroke();
            }
            
            for (let y = 0; y <= this.canvas.height; y += gridSpacing) {
                exportCtx.beginPath();
                exportCtx.moveTo(offsetX, y + offsetY);
                exportCtx.lineTo(this.canvas.width + offsetX, y + offsetY);
                exportCtx.stroke();
            }
        }
        
        // Draw room border
        exportCtx.strokeStyle = '#667eea';
        exportCtx.lineWidth = 3;
        exportCtx.strokeRect(offsetX, offsetY, this.canvas.width, this.canvas.height);
        
        // Draw dimensions if enabled
        if (this.showDimensions) {
            exportCtx.fillStyle = '#333';
            const fontSize = Math.max(14, this.scale * 0.6);
            exportCtx.font = `bold ${fontSize}px Arial`;
            exportCtx.textAlign = 'center';
            
            exportCtx.fillText(
                `${this.roomLength}ft`,
                this.canvas.width / 2 + offsetX,
                this.canvas.height + offsetY + 25
            );
            
            exportCtx.save();
            exportCtx.translate(offsetX - 25, this.canvas.height / 2 + offsetY);
            exportCtx.rotate(-Math.PI / 2);
            exportCtx.fillText(`${this.roomWidth}ft`, 0, 0);
            exportCtx.restore();
        }
        
        // Draw tables
        this.tables.forEach(table => {
            const width = table.width * this.scale;
            const height = table.height * this.scale;
            const x = table.x * this.scale - width / 2 + offsetX;
            const y = table.y * this.scale - height / 2 + offsetY;
            
            // Draw table rectangle
            exportCtx.fillStyle = '#48bb78';
            exportCtx.fillRect(x, y, width, height);
            exportCtx.strokeStyle = '#2d7a4f';
            exportCtx.lineWidth = 3;
            exportCtx.strokeRect(x, y, width, height);
            
            // Draw table name and info
            exportCtx.fillStyle = 'white';
            exportCtx.font = `bold ${Math.max(12, this.scale * 0.5)}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            
            // Draw name
            exportCtx.fillText(table.name, centerX, centerY - (this.showDimensions ? 8 : 0));
            
            // Draw size info
            if (this.showDimensions) {
                exportCtx.font = `${Math.max(10, this.scale * 0.4)}px Arial`;
                exportCtx.fillText(
                    `${table.size}ft (${table.width.toFixed(1)}×${table.height.toFixed(1)}ft)`,
                    centerX,
                    centerY + 8
                );
            } else {
                exportCtx.font = `${Math.max(10, this.scale * 0.4)}px Arial`;
                exportCtx.fillText(`${table.size}ft`, centerX, centerY + 8);
            }
        });
        
        // Convert to blob and download
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `floor-plan-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    updateTableCount() {
        const count = this.tables.length;
        const countBySize = {};
        this.tables.forEach(t => {
            countBySize[t.size] = (countBySize[t.size] || 0) + 1;
        });

        let countText = `${count} table${count !== 1 ? 's' : ''} placed`;
        if (Object.keys(countBySize).length > 0) {
            const breakdown = Object.entries(countBySize)
                .map(([size, num]) => `${num}×${size}ft`)
                .join(', ');
            countText += ` (${breakdown})`;
        }

        document.getElementById('tableCount').textContent = countText;
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw room background
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }

        // Draw room border
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw dimensions
        if (this.showDimensions) {
            this.drawDimensions();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        const gridSpacing = this.gridSize * this.scale;

        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawDimensions() {
        this.ctx.fillStyle = '#333';
        const fontSize = Math.max(14, this.scale * 0.6);
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';

        // Room length
        this.ctx.fillText(
            `${this.roomLength}ft`,
            this.canvas.width / 2,
            this.canvas.height + 25
        );

        // Room width
        this.ctx.save();
        this.ctx.translate(-25, this.canvas.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText(`${this.roomWidth}ft`, 0, 0);
        this.ctx.restore();
    }
}

// Initialize the floor plan designer when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FloorPlanDesigner();
});

