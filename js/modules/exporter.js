/**
 * ============================================
 * Export Module - Generic Excel & PDF Export
 * ============================================
 * Handles exporting data to Excel and PDF formats
 */

export class Exporter {
    constructor() {
        this.defaultFont = 'helvetica';
    }

    /**
     * Create a temporary table element for PDF export
     * This uses html2canvas to convert HTML to image, preserving Hebrew text
     */
    async createTableElement(data, columns, title) {
        // Create a temporary container
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 1000px;
            background: white;
            padding: 40px;
            font-family: Arial, sans-serif;
            direction: rtl;
        `;
        
        // Add title
        const titleEl = document.createElement('h1');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            text-align: center;
            color: #18285F;
            margin-bottom: 30px;
            font-size: 28px;
        `;
        container.appendChild(titleEl);
        
        // Create table
        const table = document.createElement('table');
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
        `;
        
        // Add header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.header;
            th.style.cssText = `
                background: #18285F;
                color: white;
                padding: 12px;
                text-align: right;
                border: 1px solid #ddd;
                font-weight: bold;
            `;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Add body
        const tbody = document.createElement('tbody');
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.style.background = index % 2 === 0 ? '#f9f9f9' : 'white';
            
            columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col.dataKey] || '';
                td.style.cssText = `
                    padding: 10px 12px;
                    text-align: right;
                    border: 1px solid #ddd;
                `;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
        
        // Add date footer
        const footer = document.createElement('div');
        footer.textContent = `תאריך: ${new Date().toLocaleDateString('he-IL')}`;
        footer.style.cssText = `
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        `;
        container.appendChild(footer);
        
        document.body.appendChild(container);
        return container;
    }

    /**
     * Export data to Excel
     * @param {Array} data - Array of objects to export
     * @param {String} filename - Output filename (without extension)
     * @param {String} sheetName - Sheet name
     */
    exportToExcel(data, filename = 'export', sheetName = 'Sheet1') {
        if (!data || data.length === 0) {
            alert('אין נתונים לייצוא');
            return;
        }

        try {
            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Generate Excel file and download
            XLSX.writeFile(wb, `${filename}.xlsx`);
            
            console.log(`✅ Exported ${data.length} rows to ${filename}.xlsx`);
        } catch (error) {
            console.error('❌ Excel export error:', error);
            alert('שגיאה בייצוא לאקסל');
        }
    }

    /**
     * Export table to Excel directly from DOM
     * @param {String} tableId - ID of the table element
     * @param {String} filename - Output filename
     */
    exportTableToExcel(tableId, filename = 'table-export') {
        const table = document.getElementById(tableId);
        if (!table) {
            alert('טבלה לא נמצאה');
            return;
        }

        try {
            const wb = XLSX.utils.table_to_book(table, { sheet: 'נתונים' });
            XLSX.writeFile(wb, `${filename}.xlsx`);
            console.log(`✅ Exported table ${tableId} to ${filename}.xlsx`);
        } catch (error) {
            console.error('❌ Table export error:', error);
            alert('שגיאה בייצוא הטבלה');
        }
    }

    /**
     * Export data to PDF using html2canvas
     * This method converts HTML to image, preserving Hebrew text perfectly
     * @param {Object} options - Export options
     * @param {Array} options.data - Array of objects
     * @param {Array} options.columns - Column definitions [{header: 'כותרת', dataKey: 'key'}]
     * @param {String} options.title - Document title
     * @param {String} options.filename - Output filename
     */
    async exportToPDF(options) {
        const {
            data,
            columns,
            title = 'דוח',
            filename = 'export'
        } = options;

        if (!data || data.length === 0) {
            alert('אין נתונים לייצוא');
            return;
        }

        if (!window.html2canvas) {
            alert('ספריית html2canvas לא נטענה');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('ספריית PDF לא נטענה');
            return;
        }

        let container = null;

        try {
            // Create temporary table element
            container = await this.createTableElement(data, columns, title);
            
            // Wait for fonts to load
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Convert to canvas
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            
            // Create PDF
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            const doc = new jsPDF('p', 'mm', 'a4');
            let position = 0;
            
            // Add first page
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add additional pages if needed
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Save PDF
            doc.save(`${filename}.pdf`);
            console.log(`✅ Exported ${data.length} rows to ${filename}.pdf`);
        } catch (error) {
            console.error('❌ PDF export error:', error);
            alert('שגיאה בייצוא ל-PDF');
        } finally {
            // Clean up temporary element
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    }


    /**
     * Export employees list to Excel
     */
    exportEmployeesToExcel(employees, filename = 'employees') {
        const data = employees.map(emp => ({
            'שם עובד': emp.name || '',
            'מספר עובד': emp.id || '',
            'סוג עובד': emp.type || emp.employeeType || '',
            'סה"כ שעות': emp.totalHours || 0,
            'אחוז השקעה': (emp.investmentPercent || 0).toFixed(1) + '%',
            'אחוז הוצאה': (emp.expensePercent || 0).toFixed(1) + '%',
            'מספר דרישות': emp.requirementCount || 0,
            'ימי עבודה': emp.dayCount || 0
        }));

        this.exportToExcel(data, filename, 'עובדים');
    }

    /**
     * Export employees list to PDF
     */
    exportEmployeesToPDF(employees, title = 'רשימת עובדים', filename = 'employees') {
        const columns = [
            { header: 'שם עובד', dataKey: 'name' },
            { header: 'מספר עובד', dataKey: 'id' },
            { header: 'סוג עובד', dataKey: 'type' },
            { header: 'סה"כ שעות', dataKey: 'totalHours' },
            { header: 'השקעה %', dataKey: 'investmentPercent' },
            { header: 'הוצאה %', dataKey: 'expensePercent' },
            { header: 'דרישות', dataKey: 'requirementCount' },
            { header: 'ימי עבודה', dataKey: 'dayCount' }
        ];

        const data = employees.map(emp => ({
            name: emp.name || '',
            id: emp.id || '',
            type: emp.type || emp.employeeType || '',
            totalHours: emp.totalHours || 0,
            investmentPercent: (emp.investmentPercent || 0).toFixed(1) + '%',
            expensePercent: (emp.expensePercent || 0).toFixed(1) + '%',
            requirementCount: emp.requirementCount || 0,
            dayCount: emp.dayCount || 0
        }));

        this.exportToPDF({ data, columns, title, filename });
    }

    /**
     * Export requirements to Excel
     */
    exportRequirementsToExcel(requirements, filename = 'requirements') {
        const data = requirements.map(req => ({
            'מספר דרישה': req.id,
            'שם דרישה': req.name,
            'תקציב': req.budget,
            'בפועל': req.actual,
            'ניצול %': req.utilization.toFixed(1) + '%',
            'סטטוס': req.status,
            'דורש': req.requester
        }));

        this.exportToExcel(data, filename, 'דרישות');
    }

    /**
     * Export requirements to PDF
     */
    exportRequirementsToPDF(requirements, title = 'רשימת דרישות', filename = 'requirements') {
        const columns = [
            { header: 'מספר', dataKey: 'id' },
            { header: 'שם דרישה', dataKey: 'name' },
            { header: 'תקציב', dataKey: 'budget' },
            { header: 'בפועל', dataKey: 'actual' },
            { header: 'ניצול %', dataKey: 'utilization' },
            { header: 'סטטוס', dataKey: 'status' },
            { header: 'דורש', dataKey: 'requester' }
        ];

        const data = requirements.map(req => ({
            id: req.id || '',
            name: req.name || '',
            budget: (req.budget || 0).toLocaleString('he-IL'),
            actual: (req.actual || 0).toLocaleString('he-IL'),
            utilization: (req.utilization || 0).toFixed(1) + '%',
            status: req.status || '',
            requester: req.requester || ''
        }));

        this.exportToPDF({ data, columns, title, filename });
    }
}
