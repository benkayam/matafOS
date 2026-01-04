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
        this.exceptionsData = []; // New: Store exceptions
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
                // Handle new format { rows, exceptions }
                if (data.rows) {
                    this.hoursData = data.rows;
                    this.exceptionsData = data.exceptions || [];
                } else {
                    this.hoursData = data;
                    this.exceptionsData = [];
                }
            } else if (type === 'requirements') {
                this.requirementsData = data;
            }

            // Update UI
            this.showFileInfo(file, type);

            // Save to storage
            this.saveToStorage();

            // Callback
            if (this.onDataLoaded) {
                // Pass both datasets for hours
                if (type === 'hours') {
                    this.onDataLoaded(type, { rows: this.hoursData, exceptions: this.exceptionsData });
                } else {
                    this.onDataLoaded(type, data);
                }
            }

            const count = Array.isArray(data) ? data.length : (data.rows ? data.rows.length : 0);
            console.log(`✅ ${type} loaded:`, count, 'rows');

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

                        // Parse Sheet 2 (Exceptions) if exists
                        const exceptions = [];
                        if (workbook.SheetNames.length > 1) {
                            try {
                                const sheet2Name = workbook.SheetNames[1];
                                const sheet2 = workbook.Sheets[sheet2Name];

                                // Convert raw sheet to array of arrays to find header
                                const jsonData = XLSX.utils.sheet_to_json(sheet2, { header: 1 });

                                // Find header row index
                                let headerRowIndex = -1;
                                for (let i = 0; i < jsonData.length; i++) {
                                    const row = jsonData[i];
                                    // Look for specific columns that surely exist in the header
                                    if (row.some(cell =>
                                        String(cell).includes('שם משפחה') ||
                                        String(cell).includes('מספר עובד') ||
                                        String(cell).includes('Employee')
                                    )) {
                                        headerRowIndex = i;
                                        break;
                                    }
                                }

                                if (headerRowIndex !== -1) {
                                    // Re-parse with correct range
                                    const range = XLSX.utils.decode_range(sheet2['!ref']);
                                    range.s.r = headerRowIndex; // Start from header row

                                    const rawExceptions = XLSX.utils.sheet_to_json(sheet2, { range: range });

                                    if (rawExceptions && rawExceptions.length > 0) {
                                        // Process exceptions: Filter out empty rows or non-data rows
                                        const processed = rawExceptions.filter(r => {
                                            // Ensure at least one key field exists (Name or ID)
                                            return Object.keys(r).some(k =>
                                                (k.includes('שם') || k.includes('Name') || k.includes('ID') || k.includes('מספר')) &&
                                                r[k]
                                            );
                                        });

                                        console.log('⚠️ Exceptions (Sheet 2):', processed.length);
                                        exceptions.push(...processed);
                                    }
                                } else {
                                    console.warn('Could not find header row in Sheet 2');
                                }
                            } catch (err) {
                                console.warn('Failed to parse Sheet 2:', err);
                            }
                        }

                        // Return object with both
                        resolve({ rows, exceptions });
                        return; // Done for hours

                    } else {
                        // קובץ דרישות - קריאה רגילה
                        rows = XLSX.utils.sheet_to_json(sheet);
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
            this.exceptionsData = [];
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
                const dataToSave = {
                    rows: this.hoursData,
                    exceptions: this.exceptionsData
                };
                localStorage.setItem('dashboardHours', JSON.stringify(dataToSave));
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
                const parsed = JSON.parse(hours);
                // Handle backward compatibility (array vs object)
                if (Array.isArray(parsed)) {
                    this.hoursData = parsed;
                    this.exceptionsData = [];
                } else {
                    this.hoursData = parsed.rows || [];
                    this.exceptionsData = parsed.exceptions || [];
                }

                this.showStoredFileInfo('hours', this.hoursData.length);
                if (this.onDataLoaded) {
                    this.onDataLoaded('hours', { rows: this.hoursData, exceptions: this.exceptionsData });
                }
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

