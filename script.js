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
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        this.panScroll = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.tableIdCounter = 0;
        this.tableNameCounter = 1;
        this.spacePressed = false;

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
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, 2.5);
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
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, 2.5);
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
                this.zoomLevel = Math.max(0.25, Math.min(2.5, this.zoomLevel + delta));
                this.updateZoom();
            }
        }, { passive: false });

        // Panning functionality
        const canvasWrapper = this.canvas.parentElement;
        
        // Right-click or spacebar + drag to pan
        const handlePanStart = (e) => {
            if (e.button === 2 || (e.button === 0 && this.spacePressed)) { // Right-click or spacebar + left-click
                e.preventDefault();
                e.stopPropagation();
                this.isPanning = true;
                this.panStart.x = e.clientX + canvasWrapper.scrollLeft;
                this.panStart.y = e.clientY + canvasWrapper.scrollTop;
                canvasWrapper.style.cursor = 'grabbing';
                canvasWrapper.style.userSelect = 'none';
                canvasWrapper.classList.add('panning');
                return true;
            }
            return false;
        };

        const handlePanMove = (e) => {
            if (this.isPanning) {
                e.preventDefault();
                e.stopPropagation();
                const deltaX = this.panStart.x - e.clientX;
                const deltaY = this.panStart.y - e.clientY;
                canvasWrapper.scrollLeft = deltaX;
                canvasWrapper.scrollTop = deltaY;
            }
        };

        const handlePanEnd = () => {
            if (this.isPanning) {
                this.isPanning = false;
                canvasWrapper.style.cursor = this.spacePressed ? 'grab' : '';
                canvasWrapper.style.userSelect = '';
                canvasWrapper.classList.remove('panning');
            }
        };

        // Add listeners to both wrapper and document for better coverage
        canvasWrapper.addEventListener('mousedown', handlePanStart);
        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handlePanEnd);
        canvasWrapper.addEventListener('mouseleave', handlePanEnd);

        // Spacebar for panning
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.spacePressed = true;
                canvasWrapper.style.cursor = 'grab';
                canvasWrapper.classList.add('pan-ready');
                // Show instruction
                this.showPanInstruction();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.spacePressed = false;
                if (!this.isPanning) {
                    canvasWrapper.style.cursor = '';
                    canvasWrapper.classList.remove('pan-ready');
                }
            }
        });

        // Show pan hint on first zoom in
        this.panHintShown = false;
        
        // Method to show pan instruction
        this.showPanInstruction = () => {
            const panHint = document.getElementById('panHint');
            if (panHint) {
                panHint.classList.remove('fade-out');
                panHint.classList.add('show');
            }
        };

        // Prevent context menu on right-click (for panning)
        canvasWrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Canvas click to place tables
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging && !this.isPanning) {
                const rect = this.canvas.getBoundingClientRect();
                const scrollLeft = canvasWrapper.scrollLeft;
                const scrollTop = canvasWrapper.scrollTop;
                const x = (e.clientX - rect.left + scrollLeft) / this.scale;
                const y = (e.clientY - rect.top + scrollTop) / this.scale;
                // Check if clicking on a table
                const clickedTable = this.getTableAtPosition(x, y);
                if (clickedTable) {
                    this.selectTable(clickedTable);
                }
            }
        });

        // Keyboard shortcut for rotation (R key)
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r' && !e.target.matches('input, textarea')) {
                if (this.selectedTable) {
                    e.preventDefault();
                    this.rotateTable(this.selectedTable.id);
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
        
        // Improve rendering quality at high zoom
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

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
        // Show pan hint on first zoom in
        if (this.zoomLevel > 1.0 && !this.panHintShown) {
            const panHint = document.getElementById('panHint');
            if (panHint) {
                panHint.classList.add('show');
                this.panHintShown = true;
                setTimeout(() => {
                    panHint.classList.add('fade-out');
                    setTimeout(() => {
                        panHint.style.display = 'none';
                    }, 500);
                }, 3000);
            }
        }
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
            height: size * 0.6, // rectangular tables
            rotation: 0 // rotation in degrees (0, 90, 180, 270)
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

            // Calculate dimensions based on rotation
            const isRotated = (table.rotation === 90 || table.rotation === 270);
            const displayWidth = isRotated ? table.height : table.width;
            const displayHeight = isRotated ? table.width : table.height;
            
            const width = displayWidth * this.scale;
            const height = displayHeight * this.scale;
            const centerX = table.x * this.scale;
            const centerY = table.y * this.scale;
            const x = centerX - width / 2;
            const y = centerY - height / 2;

            tableElement.style.width = width + 'px';
            tableElement.style.height = height + 'px';
            tableElement.style.left = x + 'px';
            tableElement.style.top = y + 'px';
            tableElement.style.transform = `rotate(${table.rotation}deg)`;
            tableElement.style.transformOrigin = 'center center';

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
                <div class="rotate-btn" data-table-id="${table.id}" title="Rotate (or press R)">↻</div>
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

            // Rotate button
            const rotateBtn = tableElement.querySelector('.rotate-btn');
            rotateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.rotateTable(table.id);
            });

            this.tableContainer.appendChild(tableElement);
        });
    }

    rotateTable(id) {
        const table = this.tables.find(t => t.id === id);
        if (table) {
            table.rotation = (table.rotation + 90) % 360;
            this.renderTables();
        }
    }

    makeDraggable(element, table) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            if (this.spacePressed || e.button === 2) return; // Don't drag if panning
            
            isDragging = true;
            this.isDragging = true;
            element.classList.add('dragging');
            
            const rect = element.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialX = table.x;
            initialY = table.y;

            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = (e.clientX - startX) / this.scale;
            const deltaY = (e.clientY - startY) / this.scale;

            let newX = initialX + deltaX;
            let newY = initialY + deltaY;

            // Boundary checking (account for rotation)
            const isRotated = (table.rotation === 90 || table.rotation === 270);
            const checkWidth = isRotated ? table.height : table.width;
            const checkHeight = isRotated ? table.width : table.height;
            newX = Math.max(checkWidth / 2, Math.min(this.roomLength - checkWidth / 2, newX));
            newY = Math.max(checkHeight / 2, Math.min(this.roomWidth - checkHeight / 2, newY));

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
            // Account for rotation when checking bounds
            const isRotated = (table.rotation === 90 || table.rotation === 270);
            const checkWidth = isRotated ? table.height : table.width;
            const checkHeight = isRotated ? table.width : table.height;
            const halfWidth = checkWidth / 2;
            const halfHeight = checkHeight / 2;
            
            if (x >= table.x - halfWidth && x <= table.x + halfWidth &&
                y >= table.y - halfHeight && y <= table.y + halfHeight) {
                return table;
            }
        }
        return null;
    }

    selectTable(table) {
        this.selectedTable = table;
        // Add visual feedback
        const tableElement = document.querySelector(`[data-table-id="${table.id}"]`);
        if (tableElement) {
            tableElement.classList.add('selected');
            // Remove selection from other tables
            document.querySelectorAll('.table-item').forEach(el => {
                if (el.dataset.tableId !== table.id.toString()) {
                    el.classList.remove('selected');
                }
            });
        }
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
        
        // Draw dimensions if enabled (inside canvas like in main view)
        if (this.showDimensions) {
            exportCtx.fillStyle = '#333';
            const fontSize = Math.max(12, Math.min(18, this.scale * 0.5));
            exportCtx.font = `bold ${fontSize}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';

            const padding = 8;
            const bgPadding = 4;
            
            // Room length (bottom center)
            const lengthText = `${this.roomLength}ft`;
            const lengthMetrics = exportCtx.measureText(lengthText);
            const lengthWidth = lengthMetrics.width;
            const lengthX = this.canvas.width / 2 + offsetX;
            const lengthY = this.canvas.height + offsetY - padding;
            
            // Background for length
            exportCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            exportCtx.fillRect(
                lengthX - lengthWidth / 2 - bgPadding,
                lengthY - fontSize / 2 - bgPadding,
                lengthWidth + bgPadding * 2,
                fontSize + bgPadding * 2
            );
            
            exportCtx.fillStyle = '#333';
            exportCtx.fillText(lengthText, lengthX, lengthY);

            // Room width (left center)
            exportCtx.save();
            const widthText = `${this.roomWidth}ft`;
            const widthMetrics = exportCtx.measureText(widthText);
            const widthTextWidth = widthMetrics.width;
            const widthX = offsetX + padding;
            const widthY = this.canvas.height / 2 + offsetY;
            
            exportCtx.translate(widthX, widthY);
            exportCtx.rotate(-Math.PI / 2);
            
            // Background for width
            exportCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            exportCtx.fillRect(
                -widthTextWidth / 2 - bgPadding,
                -fontSize / 2 - bgPadding,
                widthTextWidth + bgPadding * 2,
                fontSize + bgPadding * 2
            );
            
            exportCtx.fillStyle = '#333';
            exportCtx.fillText(widthText, 0, 0);
            exportCtx.restore();
        }
        
        // Draw tables
        this.tables.forEach(table => {
            // Account for rotation
            const isRotated = (table.rotation === 90 || table.rotation === 270);
            const displayWidth = isRotated ? table.height : table.width;
            const displayHeight = isRotated ? table.width : table.height;
            
            const width = displayWidth * this.scale;
            const height = displayHeight * this.scale;
            const centerX = table.x * this.scale + offsetX;
            const centerY = table.y * this.scale + offsetY;
            const x = centerX - width / 2;
            const y = centerY - height / 2;
            
            // Save context for rotation
            exportCtx.save();
            exportCtx.translate(centerX, centerY);
            exportCtx.rotate((table.rotation * Math.PI) / 180);
            exportCtx.translate(-centerX, -centerY);
            
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
            
            const textCenterX = centerX;
            const textCenterY = centerY;
            
            // Draw name
            exportCtx.fillText(table.name, textCenterX, textCenterY - (this.showDimensions ? 8 : 0));
            
            // Draw size info
            if (this.showDimensions) {
                exportCtx.font = `${Math.max(10, this.scale * 0.4)}px Arial`;
                exportCtx.fillText(
                    `${table.size}ft (${table.width.toFixed(1)}×${table.height.toFixed(1)}ft)`,
                    textCenterX,
                    textCenterY + 8
                );
            } else {
                exportCtx.font = `${Math.max(10, this.scale * 0.4)}px Arial`;
                exportCtx.fillText(`${table.size}ft`, textCenterX, textCenterY + 8);
            }
            
            // Restore context
            exportCtx.restore();
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
        
        // Set high quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Draw room background
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }

        // Draw room border (scale line width with zoom for better appearance)
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = Math.max(2, Math.min(4, 3 / this.zoomLevel));
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw dimensions
        if (this.showDimensions) {
            this.drawDimensions();
        }
    }

    drawGrid() {
        // Adjust grid based on zoom level for better visual quality
        const gridSpacing = this.gridSize * this.scale;
        
        // At high zoom, show every 5th or 10th line to reduce clutter
        let gridMultiplier = 1;
        if (this.zoomLevel > 2.0) {
            gridMultiplier = 5; // Show every 5th line at 200%+ zoom
        } else if (this.zoomLevel > 1.5) {
            gridMultiplier = 2; // Show every 2nd line at 150%+ zoom
        }
        
        const actualSpacing = gridSpacing * gridMultiplier;
        
        // Use thinner, lighter lines at high zoom
        const lineWidth = Math.max(0.5, Math.min(1, 1 / this.zoomLevel));
        const lineOpacity = Math.max(0.3, Math.min(1, 1 / (this.zoomLevel * 0.5)));
        
        this.ctx.strokeStyle = `rgba(224, 224, 224, ${lineOpacity})`;
        this.ctx.lineWidth = lineWidth;

        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += actualSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += actualSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawDimensions() {
        if (!this.showDimensions) return;
        
        // Cap font size at high zoom to prevent pixelation
        const fontSize = Math.max(12, Math.min(20, this.scale * 0.4));
        this.ctx.fillStyle = '#333';
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw dimensions inside the canvas with background
        const padding = Math.max(6, Math.min(12, 8 * (1 / this.zoomLevel)));
        const bgPadding = Math.max(3, Math.min(6, 4 * (1 / this.zoomLevel)));
        
        // Room length (bottom center)
        const lengthText = `${this.roomLength}ft`;
        const lengthMetrics = this.ctx.measureText(lengthText);
        const lengthWidth = lengthMetrics.width;
        const lengthX = this.canvas.width / 2;
        const lengthY = this.canvas.height - padding;
        
        // Background for length
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(
            lengthX - lengthWidth / 2 - bgPadding,
            lengthY - fontSize / 2 - bgPadding,
            lengthWidth + bgPadding * 2,
            fontSize + bgPadding * 2
        );
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(lengthText, lengthX, lengthY);

        // Room width (left center)
        this.ctx.save();
        const widthText = `${this.roomWidth}ft`;
        const widthMetrics = this.ctx.measureText(widthText);
        const widthTextWidth = widthMetrics.width;
        const widthX = padding;
        const widthY = this.canvas.height / 2;
        
        this.ctx.translate(widthX, widthY);
        this.ctx.rotate(-Math.PI / 2);
        
        // Background for width
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(
            -widthTextWidth / 2 - bgPadding,
            -fontSize / 2 - bgPadding,
            widthTextWidth + bgPadding * 2,
            fontSize + bgPadding * 2
        );
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(widthText, 0, 0);
        this.ctx.restore();
    }
}

// Initialize the floor plan designer when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FloorPlanDesigner();
});

