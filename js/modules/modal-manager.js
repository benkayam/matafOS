/**
 * ============================================
 * Modal Manager - Generic Modal Component
 * ============================================
 * Centralized modal management with export functionality
 */

export class ModalManager 
{
    constructor() {
        this.currentModal = null;
    }

    /**
     * Create export buttons HTML
     */
    createExportButtons(exportExcelId = 'modalExportExcel', exportPDFId = 'modalExportPDF') {
        return `

            <div class="filter-bar-left">
                <button class="btn btn-export" id="${exportExcelId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                        <line x1="9" y1="12" x2="15" y2="12"/>
                        <line x1="9" y1="18" x2="15" y2="18"/>
                    </svg>
                    אקסל
                </button>
                <button class="btn btn-export" id="${exportPDFId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <path d="M9 13h6"/>
                        <path d="M9 17h6"/>
                    </svg>
                    PDF
                </button>
            </div>
        `;
    }

    /**
     * Create generic table HTML
     */
    createTable(columns, rows, tableId = 'modalTable') {
        return `
            <div class="table-container">
                <table class="data-table" id="${tableId}">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Setup export handlers for modal
     */
    setupExportHandlers(options) {
        const {
            excelButtonId = 'modalExportExcel',
            pdfButtonId = 'modalExportPDF',
            data,
            columns,
            title,
            filename,
            exporter
        } = options;

        const exportExcelBtn = document.getElementById(excelButtonId);
        const exportPDFBtn = document.getElementById(pdfButtonId);

        if (exportExcelBtn && exporter) {
            exportExcelBtn.onclick = () => {
                if (Array.isArray(data)) {
                    exporter.exportEmployeesToExcel(data, filename);
                } else {
                    exporter.exportToExcel([data], filename, title);
                }
            };
        }

        if (exportPDFBtn && exporter) {
            exportPDFBtn.onclick = () => {
                if (Array.isArray(data)) {
                    exporter.exportEmployeesToPDF(data, title, filename);
                } else {
                    exporter.exportToPDF({
                        data: [data],
                        columns: columns,
                        title: title,
                        filename: filename
                    });
                }
            };
        }
    }

    /**
     * Show modal with content
     */
    showModal(modalId, content) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} not found`);
            return;
        }

        const modalBody = modal.querySelector('.modal-body') || 
                         document.getElementById(`${modalId.replace('Modal', '')}ModalBody`);
        
        if (modalBody) {
            modalBody.innerHTML = content;
        }

        modal.style.display = 'flex';
        this.currentModal = modal;

        // Setup click outside to close
        this.setupClickOutsideToClose(modalId);
    }

    /**
     * Setup click outside modal to close
     */
    setupClickOutsideToClose(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Remove existing listener if any
        if (modal._clickOutsideHandler) {
            modal.removeEventListener('click', modal._clickOutsideHandler);
        }

        // Create new handler
        const handler = (e) => {
            // Close only if clicking on the overlay itself, not on modal content
            if (e.target === modal) {
                this.hideModal(modalId);
            }
        };

        // Store handler reference for cleanup
        modal._clickOutsideHandler = handler;
        modal.addEventListener('click', handler);
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentModal = null;
    }

    /**
     * Hide current modal
     */
    hideCurrent() {
        if (this.currentModal) {
            this.currentModal.style.display = 'none';
            this.currentModal = null;
        }
    }
}

