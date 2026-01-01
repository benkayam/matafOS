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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    אקסל
                </button>
                <button class="btn btn-export" id="${exportPDFId}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
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

