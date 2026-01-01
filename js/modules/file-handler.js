/**
 * ============================================
 * File Handler Module
 * ============================================
 * Handles file upload, drag & drop, and Excel parsing
 */

import { CONFIG } from '../config.js';

export class FileHandler {
    constructor() {
        this.hoursData = [];
        this.requirementsData = [];
        this.onDataLoaded = null;  // Callback when data is loaded
    }

    /**
     * Initialize drag & drop handlers
     */
    init(onDataLoaded) {
        this.onDataLoaded = onDataLoaded;
        this.setupDropZones();
        this.loadFromStorage();
    }

    /**
     * Setup drop zones for file upload
     */
    setupDropZones() {
        const zones = [
            { id: 'requirementsDropZone', inputId: 'requirementsInput', type: 'requirements' },
            { id: 'hoursDropZone', inputId: 'hoursInput', type: 'hours' }
        ];

        zones.forEach(({ id, inputId, type }) => {
            const zone = document.getElementById(id);
            const input = document.getElementById(inputId);
            
            if (!zone || !input) return;

            // Click to open file dialog
            zone.addEventListener('click', () => input.click());

            // File selected
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.handleFile(file, type);
            });

            // Drag events
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) this.handleFile(file, type);
            });
        });
    }

    /**
     * Handle uploaded file
     */
    async handleFile(file, type) {
        try {
            console.log(`📄 Processing ${type} file:`, file.name);
            
            // Validate file type
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!CONFIG.ACCEPTED_FILE_TYPES.includes(ext)) {
                throw new Error(`סוג קובץ לא נתמך: ${ext}`);
            }

            // Read file
            const data = await this.readExcel(file, type);
            
            // Store data
            if (type === 'hours') {
                this.hoursData = data;
            } else if (type === 'requirements') {
                this.requirementsData = data;
            }

            // Update UI
            this.showFileInfo(file, type);
            
            // Save to storage
            this.saveToStorage();

            // Callback
            if (this.onDataLoaded) {
                this.onDataLoaded(type, data);
            }

            console.log(`✅ ${type} loaded:`, data.length, 'rows');

        } catch (error) {
            console.error(`❌ Error processing ${type}:`, error);
            alert(`שגיאה בטעינת קובץ: ${error.message}`);
        }
    }

    /**
     * Read Excel file and parse to array
     */
    async readExcel(file, type) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first sheet
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    
                    let rows;
                    
                    if (type === 'hours') {
                        // קובץ שעות - כותרות בשורה 2 (אינדקס 1), נתונים מ-3
                        const range = XLSX.utils.decode_range(sheet['!ref']);
                        const headerRow = 1; // שורה 2
                        
                        // קריאת כותרות
                        const headers = [];
                        for (let col = range.s.c; col <= range.e.c; col++) {
                            const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
                            const cell = sheet[cellAddress];
                            const headerValue = cell ? String(cell.v).trim() : `col_${col}`;
                            headers[col] = headerValue;
                        }
                        
                        console.log('📋 Headers from row 2:', headers.filter(h => h));
                        
                        // קריאת נתונים מהשורה 3 ואילך
                        rows = [];
                        for (let row = headerRow + 1; row <= range.e.r; row++) {
                            const rowData = {};
                            let hasData = false;
                            
                            for (let col = range.s.c; col <= range.e.c; col++) {
                                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                                const cell = sheet[cellAddress];
                                const value = cell ? cell.v : '';
                                
                                if (headers[col]) {
                                    rowData[headers[col]] = value;
                                    if (value !== '' && value !== null && value !== undefined) {
                                        hasData = true;
                                    }
                                }
                            }
                            
                            if (hasData) {
                                rows.push(rowData);
                            }
                        }
                    } else {
                        // קובץ דרישות - קריאה רגילה
                        rows = XLSX.utils.sheet_to_json(sheet);
                    }
                    
                    // Debug: show first row structure
                    if (rows.length > 0) {
                        console.log('📋 Column names:', Object.keys(rows[0]));
                        console.log('📋 First row:', rows[0]);
                    }
                    
                    resolve(rows);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Show file info in UI
     */
    showFileInfo(file, type) {
        const zoneId = type === 'hours' ? 'hoursDropZone' : 'requirementsDropZone';
        const infoId = type === 'hours' ? 'hoursInfo' : 'requirementsInfo';
        
        const zone = document.getElementById(zoneId);
        const info = document.getElementById(infoId);
        
        if (zone && info) {
            zone.classList.add('has-file');
            info.classList.remove('hidden');
            info.innerHTML = `
                <span>✅ ${file.name}</span>
                <button class="btn-clear" onclick="window.app.clearFile('${type}')" title="נקה">×</button>
            `;
        }
    }

    /**
     * Clear file data
     */
    clearFile(type) {
        if (type === 'hours') {
            this.hoursData = [];
            localStorage.removeItem('dashboardHours');
        } else if (type === 'requirements') {
            this.requirementsData = [];
            localStorage.removeItem('dashboardRequirements');
        }

        // Reset UI
        const zoneId = type === 'hours' ? 'hoursDropZone' : 'requirementsDropZone';
        const infoId = type === 'hours' ? 'hoursInfo' : 'requirementsInfo';
        const inputId = type === 'hours' ? 'hoursInput' : 'requirementsInput';
        
        document.getElementById(zoneId)?.classList.remove('has-file');
        document.getElementById(infoId)?.classList.add('hidden');
        document.getElementById(inputId).value = '';

        // Callback
        if (this.onDataLoaded) {
            this.onDataLoaded(type, []);
        }
    }

    /**
     * Save data to localStorage
     */
    saveToStorage() {
        try {
            if (this.hoursData.length > 0) {
                localStorage.setItem('dashboardHours', JSON.stringify(this.hoursData));
            }
            if (this.requirementsData.length > 0) {
                localStorage.setItem('dashboardRequirements', JSON.stringify(this.requirementsData));
            }
        } catch (error) {
            console.warn('Storage full, clearing old data');
            localStorage.clear();
        }
    }

    /**
     * Load data from localStorage
     */
    loadFromStorage() {
        try {
            const hours = localStorage.getItem('dashboardHours');
            const requirements = localStorage.getItem('dashboardRequirements');
            
            if (hours) {
                this.hoursData = JSON.parse(hours);
                this.showStoredFileInfo('hours', this.hoursData.length);
                if (this.onDataLoaded) this.onDataLoaded('hours', this.hoursData);
            }
            
            if (requirements) {
                this.requirementsData = JSON.parse(requirements);
                this.showStoredFileInfo('requirements', this.requirementsData.length);
                if (this.onDataLoaded) this.onDataLoaded('requirements', this.requirementsData);
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    /**
     * Show stored file info
     */
    showStoredFileInfo(type, count) {
        const zoneId = type === 'hours' ? 'hoursDropZone' : 'requirementsDropZone';
        const infoId = type === 'hours' ? 'hoursInfo' : 'requirementsInfo';
        
        const zone = document.getElementById(zoneId);
        const info = document.getElementById(infoId);
        
        if (zone && info) {
            zone.classList.add('has-file');
            info.classList.remove('hidden');
            info.innerHTML = `
                <span>📦 ${count} שורות מהזיכרון</span>
                <button class="btn-clear" onclick="window.app.clearFile('${type}')" title="נקה">×</button>
            `;
        }
    }
}

