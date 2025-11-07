// Floor Plan Designer - Table Layout Tool

class FloorPlanDesigner {
    constructor() {
        this.canvas = document.getElementById('floorPlanCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tableContainer = document.getElementById('tableContainer');
        this.tables = [];
        this.roomLength = 20; // feet
        this.roomWidth = 15; // feet
        this.baseScale = 25; // pixels per foot
        this.scale = 25; // current scale (can be zoomed)
        this.zoomLevel = 1.0; // zoom multiplier
        this.gridSize = 1; // feet
        this.showGrid = true;
        this.showDimensions = true;
        this.showRulers = true;
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
            if (this.tables.length === 0) {
                alert('No tables to clear!');
                return;
            }
            if (confirm('Are you sure you want to clear all tables?')) {
                this.tables = [];
                this.tableNameCounter = 1;
                this.selectedTable = null;
                this.updateTableCount();
                this.draw();
            }
        });

        // Download as PNG
        document.getElementById('downloadPlan').addEventListener('click', () => {
            this.downloadAsPNG();
        });

        // Grid snap toggle
        document.getElementById('snapToGrid').addEventListener('click', (e) => {
            this.snapToGrid = !this.snapToGrid;
            e.target.textContent = this.snapToGrid ? 'Disable Grid Snap' : 'Enable Grid Snap';
            e.target.classList.toggle('active', this.snapToGrid);
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
            this.renderTables();
        });

        // Show rulers toggle
        document.getElementById('showRulers').addEventListener('change', (e) => {
            this.showRulers = e.target.checked;
            this.draw();
        });

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.zoomLevel = Math.min(this.zoomLevel + 0.25, 2.5);
            this.updateZoom();
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.25);
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
            this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.25);
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

        // Mouse wheel zoom (with Ctrl/Cmd key)
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.zoomLevel = Math.max(0.25, Math.min(2.5, this.zoomLevel + delta));
                this.updateZoom();
            }
        }, { passive: false });

        // Panning functionality
        const canvasWrapper = this.canvas.parentElement;
        
        const handlePanStart = (e) => {
            if (e.button === 2 || (e.button === 0 && this.spacePressed)) {
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

        canvasWrapper.addEventListener('mousedown', handlePanStart);
        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handlePanEnd);
        canvasWrapper.addEventListener('mouseleave', handlePanEnd);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Spacebar for panning
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.spacePressed = true;
                canvasWrapper.style.cursor = 'grab';
                canvasWrapper.classList.add('pan-ready');
                this.showPanInstruction();
            }
            
            // R for rotation
            if (e.key.toLowerCase() === 'r' && !e.target.matches('input, textarea')) {
                if (this.selectedTable) {
                    e.preventDefault();
                    this.rotateTable(this.selectedTable.id);
                }
            }
            
            // Delete key
            if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.matches('input, textarea')) {
                if (this.selectedTable) {
                    e.preventDefault();
                    this.removeTable(this.selectedTable.id);
                }
            }
            
            // Escape to deselect
            if (e.key === 'Escape') {
                this.selectedTable = null;
                document.querySelectorAll('.table-item').forEach(el => {
                    el.classList.remove('selected');
                });
            }
            
            // Ctrl/Cmd + Z for undo (basic implementation)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                // Could implement undo functionality here
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

        // Show pan instruction
        this.panHintShown = false;
        this.showPanInstruction = () => {
            const panHint = document.getElementById('panHint');
            if (panHint) {
                panHint.classList.remove('fade-out');
                panHint.classList.add('show');
            }
        };

        // Prevent context menu
        canvasWrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Canvas click
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDragging && !this.isPanning) {
                const rect = this.canvas.getBoundingClientRect();
                const scrollLeft = canvasWrapper.scrollLeft;
                const scrollTop = canvasWrapper.scrollTop;
                const x = (e.clientX - rect.left + scrollLeft) / this.scale;
                const y = (e.clientY - rect.top + scrollTop) / this.scale;
                const clickedTable = this.getTableAtPosition(x, y);
                if (clickedTable) {
                    this.selectTable(clickedTable);
                } else {
                    // Deselect if clicking empty space
                    this.selectedTable = null;
                    document.querySelectorAll('.table-item').forEach(el => {
                        el.classList.remove('selected');
                    });
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
        this.scale = this.baseScale * this.zoomLevel;
        
        const canvasWidth = this.roomLength * this.scale;
        const canvasHeight = this.roomWidth * this.scale;

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.tableContainer.style.width = this.canvas.width + 'px';
        this.tableContainer.style.height = this.canvas.height + 'px';
        
        document.getElementById('scaleValue').textContent = this.scale.toFixed(1);
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100);
        
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.value = Math.round(this.zoomLevel * 100);
        }
        
        this.draw();
        this.renderTables();
    }

    updateZoom() {
        this.updateCanvasSize();
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
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;

        const scaleX = maxWidth / (this.roomLength * this.baseScale);
        const scaleY = maxHeight / (this.roomWidth * this.baseScale);
        const fitScale = Math.min(scaleX, scaleY, 1);
        
        this.zoomLevel = Math.max(0.25, Math.min(1.0, fitScale));
        this.updateZoom();
    }

    addTable(size) {
        const table = {
            id: this.tableIdCounter++,
            size: size,
            name: `Table ${this.tableNameCounter++}`,
            x: this.roomLength / 2,
            y: this.roomWidth / 2,
            width: size,
            height: size * 0.6,
            rotation: 0
        };

        this.tables.push(table);
        this.updateTableCount();
        this.renderTables();
        
        // Auto-select the newly added table
        this.selectTable(table);
    }

    renderTables() {
        this.tableContainer.innerHTML = '';

        this.tables.forEach(table => {
            const tableElement = document.createElement('div');
            tableElement.className = 'table-item';
            if (this.selectedTable && this.selectedTable.id === table.id) {
                tableElement.classList.add('selected');
            }
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
            tableElement.style.transform = `rotate(${table.rotation}deg)`;
            tableElement.style.transformOrigin = 'center center';

            const minFontSize = Math.max(8, this.scale * 0.3);
            const maxFontSize = Math.min(16, this.scale * 0.6);
            const fontSize = Math.max(minFontSize, Math.min(maxFontSize, width * 0.15));
            const smallFontSize = fontSize * 0.7;
            
            const displayWidth = table.width;
            const displayHeight = table.height;
            
            tableElement.innerHTML = `
                <div class="table-label" style="font-size: ${fontSize}px;">
                    <div class="table-name" style="font-size: ${fontSize}px;">${table.name}</div>
                    <div class="table-size-info" style="font-size: ${smallFontSize}px;">${table.size}ft</div>
                    ${this.showDimensions ? `<div class="table-size" style="font-size: ${smallFontSize * 0.85}px;">${displayWidth.toFixed(1)}×${displayHeight.toFixed(1)}ft</div>` : ''}
                </div>
                <div class="delete-btn" data-table-id="${table.id}" title="Delete (or press Delete)">×</div>
                <div class="rotate-btn" data-table-id="${table.id}" title="Rotate (or press R)">↻</div>
            `;

            tableElement.addEventListener('dblclick', (e) => {
                if (!e.target.classList.contains('delete-btn') && !e.target.classList.contains('rotate-btn')) {
                    this.editTableName(table, tableElement);
                }
            });

            this.makeDraggable(tableElement, table);

            const deleteBtn = tableElement.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTable(table.id);
            });

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
            const oldRotation = table.rotation;
            table.rotation = (table.rotation + 90) % 360;
            
            if ((oldRotation === 0 && table.rotation === 90) || 
                (oldRotation === 180 && table.rotation === 270) ||
                (oldRotation === 90 && table.rotation === 180) ||
                (oldRotation === 270 && table.rotation === 0)) {
                const temp = table.width;
                table.width = table.height;
                table.height = temp;
            }
            
            this.renderTables();
        }
    }

    makeDraggable(element, table) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('delete-btn') || e.target.classList.contains('rotate-btn')) return;
            if (this.spacePressed || e.button === 2) return;
            
            isDragging = true;
            this.isDragging = true;
            element.classList.add('dragging');
            this.selectTable(table);
            
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

            newX = Math.max(table.width / 2, Math.min(this.roomLength - table.width / 2, newX));
            newY = Math.max(table.height / 2, Math.min(this.roomWidth - table.height / 2, newY));

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
        document.querySelectorAll('.table-item').forEach(el => {
            el.classList.remove('selected');
        });
        const tableElement = document.querySelector(`[data-table-id="${table.id}"]`);
        if (tableElement) {
            tableElement.classList.add('selected');
        }
    }

    removeTable(id) {
        const index = this.tables.findIndex(t => t.id === id);
        if (index > -1) {
            this.tables.splice(index, 1);
            if (this.selectedTable && this.selectedTable.id === id) {
                this.selectedTable = null;
            }
            this.updateTableCount();
            this.renderTables();
        }
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
        const exportCanvas = document.createElement('canvas');
        const padding = 60;
        exportCanvas.width = this.canvas.width + padding * 2;
        exportCanvas.height = this.canvas.height + padding * 2;
        const exportCtx = exportCanvas.getContext('2d');
        
        // White background
        exportCtx.fillStyle = '#ffffff';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Room background
        exportCtx.fillStyle = '#f8f9fa';
        exportCtx.fillRect(padding, padding, this.canvas.width, this.canvas.height);
        
        // Grid
        if (this.showGrid) {
            exportCtx.strokeStyle = '#e0e0e0';
            exportCtx.lineWidth = 1;
            const gridSpacing = this.gridSize * this.scale;
            
            for (let x = 0; x <= this.canvas.width; x += gridSpacing) {
                exportCtx.beginPath();
                exportCtx.moveTo(x + padding, padding);
                exportCtx.lineTo(x + padding, this.canvas.height + padding);
                exportCtx.stroke();
            }
            
            for (let y = 0; y <= this.canvas.height; y += gridSpacing) {
                exportCtx.beginPath();
                exportCtx.moveTo(padding, y + padding);
                exportCtx.lineTo(this.canvas.width + padding, y + padding);
                exportCtx.stroke();
            }
        }
        
        // Room border
        exportCtx.strokeStyle = '#667eea';
        exportCtx.lineWidth = 3;
        exportCtx.strokeRect(padding, padding, this.canvas.width, this.canvas.height);
        
        // Dimensions
        if (this.showDimensions) {
            exportCtx.fillStyle = '#333';
            const fontSize = Math.max(14, Math.min(20, this.scale * 0.5));
            exportCtx.font = `bold ${fontSize}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';

            // Length (bottom)
            const lengthText = `${this.roomLength}ft`;
            const lengthX = this.canvas.width / 2 + padding;
            const lengthY = this.canvas.height + padding + 30;
            exportCtx.fillText(lengthText, lengthX, lengthY);

            // Width (left)
            exportCtx.save();
            const widthText = `${this.roomWidth}ft`;
            const widthX = padding - 30;
            const widthY = this.canvas.height / 2 + padding;
            exportCtx.translate(widthX, widthY);
            exportCtx.rotate(-Math.PI / 2);
            exportCtx.fillText(widthText, 0, 0);
            exportCtx.restore();
        }
        
        // Tables
        this.tables.forEach(table => {
            const width = table.width * this.scale;
            const height = table.height * this.scale;
            const centerX = table.x * this.scale + padding;
            const centerY = table.y * this.scale + padding;
            const x = centerX - width / 2;
            const y = centerY - height / 2;
            
            exportCtx.save();
            exportCtx.translate(centerX, centerY);
            exportCtx.rotate((table.rotation * Math.PI) / 180);
            exportCtx.translate(-centerX, -centerY);
            
            exportCtx.fillStyle = '#48bb78';
            exportCtx.fillRect(x, y, width, height);
            exportCtx.strokeStyle = '#2d7a4f';
            exportCtx.lineWidth = 3;
            exportCtx.strokeRect(x, y, width, height);
            
            exportCtx.fillStyle = 'white';
            exportCtx.font = `bold ${Math.max(12, this.scale * 0.5)}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            
            const textY = this.showDimensions ? -8 : 0;
            exportCtx.fillText(table.name, centerX, centerY + textY);
            
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
            
            exportCtx.restore();
        });
        
        // Add title
        exportCtx.fillStyle = '#333';
        exportCtx.font = 'bold 24px Arial';
        exportCtx.textAlign = 'center';
        exportCtx.fillText('Floor Plan', exportCanvas.width / 2, 30);
        
        // Convert and download
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.showGrid) {
            this.drawGrid();
        }

        if (this.showRulers) {
            this.drawRulers();
        }

        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = Math.max(2, Math.min(4, 3 / this.zoomLevel));
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.showDimensions) {
            this.drawDimensions();
        }
    }

    drawGrid() {
        const gridSpacing = this.gridSize * this.scale;
        let gridMultiplier = 1;
        
        if (this.zoomLevel > 2.0) {
            gridMultiplier = 5;
        } else if (this.zoomLevel > 1.5) {
            gridMultiplier = 2;
        }
        
        const actualSpacing = gridSpacing * gridMultiplier;
        const lineWidth = Math.max(0.5, Math.min(1, 1 / this.zoomLevel));
        const lineOpacity = Math.max(0.3, Math.min(1, 1 / (this.zoomLevel * 0.5)));
        
        this.ctx.strokeStyle = `rgba(224, 224, 224, ${lineOpacity})`;
        this.ctx.lineWidth = lineWidth;

        for (let x = 0; x <= this.canvas.width; x += actualSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += actualSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawRulers() {
        // Simple ruler marks every 5 feet
        this.ctx.strokeStyle = '#999';
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        
        const markerSpacing = 5 * this.scale;
        
        // Horizontal ruler
        for (let x = 0; x <= this.canvas.width; x += markerSpacing) {
            const feet = Math.round(x / this.scale);
            if (feet % 5 === 0 && feet > 0 && feet < this.roomLength) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, 10);
                this.ctx.stroke();
                this.ctx.fillText(feet + 'ft', x, 20);
            }
        }
        
        // Vertical ruler
        this.ctx.textAlign = 'right';
        for (let y = 0; y <= this.canvas.height; y += markerSpacing) {
            const feet = Math.round(y / this.scale);
            if (feet % 5 === 0 && feet > 0 && feet < this.roomWidth) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(10, y);
                this.ctx.stroke();
                this.ctx.save();
                this.ctx.translate(15, y);
                this.ctx.rotate(-Math.PI / 2);
                this.ctx.fillText(feet + 'ft', 0, 0);
                this.ctx.restore();
            }
        }
    }

    drawDimensions() {
        const fontSize = Math.max(12, Math.min(20, this.scale * 0.4));
        this.ctx.fillStyle = '#333';
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const padding = Math.max(6, Math.min(12, 8 * (1 / this.zoomLevel)));
        const bgPadding = Math.max(3, Math.min(6, 4 * (1 / this.zoomLevel)));
        
        // Length
        const lengthText = `${this.roomLength}ft`;
        const lengthMetrics = this.ctx.measureText(lengthText);
        const lengthWidth = lengthMetrics.width;
        const lengthX = this.canvas.width / 2;
        const lengthY = this.canvas.height - padding;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillRect(
            lengthX - lengthWidth / 2 - bgPadding,
            lengthY - fontSize / 2 - bgPadding,
            lengthWidth + bgPadding * 2,
            fontSize + bgPadding * 2
        );
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(lengthText, lengthX, lengthY);

        // Width
        this.ctx.save();
        const widthText = `${this.roomWidth}ft`;
        const widthMetrics = this.ctx.measureText(widthText);
        const widthTextWidth = widthMetrics.width;
        const widthX = padding;
        const widthY = this.canvas.height / 2;
        
        this.ctx.translate(widthX, widthY);
        this.ctx.rotate(-Math.PI / 2);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
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

document.addEventListener('DOMContentLoaded', () => {
    new FloorPlanDesigner();
});