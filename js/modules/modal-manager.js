/**
 * ============================================
 * Modal Manager - Generic Modal Component
 * ============================================
 * Centralized modal management with export functionality
 */

export class ModalManager {
    constructor() {
        this.currentModal = null;
    }

    /**
     * Create export buttons HTML
     */
    createExportButtons(exportExcelId = 'modalExportExcel', exportPDFId = 'modalExportPDF', exportHTMLId = 'modalExportHTML') {
        return `
            <div class="filter-bar" style="margin: 0; padding: 0; background: transparent; border: none; width: 100%;">
                <div class="filter-bar-right" style="gap: 5px; width: 100%; justify-content: flex-end;">
                    <button class="btn btn-icon-only btn-frameless" id="${exportExcelId}" title="ייצוא לאקסל">
                        <img src="icons/excel.png" alt="Excel">
                    </button>
                    <button class="btn btn-icon-only btn-frameless" id="${exportPDFId}" title="ייצוא ל-PDF">
                        <img src="icons/pdf.png" alt="PDF">
                    </button>
                    <button class="btn btn-icon-only btn-frameless" id="${exportHTMLId}" title="ייצוא למייל (HTML)">
                        <img src="icons/html.png" alt="HTML">
                    </button>
                </div>
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
            htmlButtonId = 'modalExportHTML',
            tableId, // ID of the specific table to copy
            data,
            columns,
            title,
            filename,
            exporter
        } = options;

        const exportExcelBtn = document.getElementById(excelButtonId);
        const exportPDFBtn = document.getElementById(pdfButtonId);
        const exportHTMLBtn = document.getElementById(htmlButtonId);

        if (exportExcelBtn && exporter) {
            exportExcelBtn.onclick = () => {
                if (Array.isArray(data) && !columns) {
                    exporter.exportEmployeesToExcel(data, filename);
                } else {
                    exporter.exportToExcel(Array.isArray(data) ? data : [data], filename, title);
                }
            };
        }

        if (exportPDFBtn && exporter) {
            exportPDFBtn.onclick = () => {
                // If columns are provided, use generic export even for arrays
                if (columns) {
                    exporter.exportToPDF({
                        data: Array.isArray(data) ? data : [data],
                        columns: columns,
                        title: title,
                        filename: filename
                    });
                } else if (Array.isArray(data)) {
                    // Fallback to employee defaults only if no columns specified
                    exporter.exportEmployeesToPDF(data, title, filename);
                } else {
                    // Single object details export logic (if supported via generic)
                    // Currently Exporter doesn't have a catch-all for single object without columns, 
                    // usually calls exportToPDF with data array.
                    // For safety, let's wrap in array.
                    exporter.exportToPDF({
                        data: [data],
                        columns: [], // Empty columns might fail, but it's better than nothing
                        title: title,
                        filename: filename
                    });
                }
            };
        }

        if (exportHTMLBtn && exporter) {
            exportHTMLBtn.onclick = () => {
                exporter.exportToHTMLClipboard(tableId || 'modalTable');
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

