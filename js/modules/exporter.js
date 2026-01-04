import { assistantFontBase64 } from './fonts.js';

/**
 * ============================================
 * Export Module - Generic Excel & PDF Export
 * ============================================
 * Handles exporting data to Excel and PDF formats
 */

export class Exporter {
    constructor() {
        this.defaultFont = 'Assistant-Regular';
    }

    /**
     * Export data to Excel
     * @param {Array} data - Array of objects to export
     * @param {String} filename - Output filename (without extension)
     * @param {String} sheetName - Sheet name
     */
    exportToExcel(data, filename = 'export', sheetName = 'Sheet1') {
        if (!data || data.length === 0) {
            this._showToast('אין נתונים לייצוא', 'error');
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
            this._showToast('שגיאה בייצוא לאקסל', 'error');
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
            this._showToast('טבלה לא נמצאה', 'error');
            return;
        }

        try {
            const wb = XLSX.utils.table_to_book(table, { sheet: 'נתונים' });
            XLSX.writeFile(wb, `${filename}.xlsx`);
            console.log(`✅ Exported table ${tableId} to ${filename}.xlsx`);
        } catch (error) {
            console.error('❌ Table export error:', error);
            this._showToast('שגיאה בייצוא הטבלה', 'error');
        }
    }

    /**
     * Export data to PDF using jspdf-autotable
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
            this._showToast('אין נתונים לייצוא', 'error');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            this._showToast('ספריית PDF לא נטענה', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add Hebrew Font if not already added
            if (!doc.getFontList()['Assistant']) {
                doc.addFileToVFS('Assistant-Regular.ttf', assistantFontBase64);
                doc.addFont('Assistant-Regular.ttf', 'Assistant', 'normal');
            }
            doc.setFont('Assistant');

            // Add Title
            doc.setFontSize(18);
            doc.setTextColor(24, 40, 95); // #18285F

            // Center title (manually since isRightToLeft covers text direction)
            const pageWidth = doc.internal.pageSize.width;
            doc.text(this._reverseHebrew(title), pageWidth / 2, 15, { align: 'center', isRightToLeft: false });

            // Prepare columns and rows for autotable
            // Reverse columns for RTL layout (Rightmost column first)
            const tableColumns = [...columns].reverse().map(col => ({
                header: this._reverseHebrew(col.header),
                dataKey: col.dataKey
            }));

            // Prepare body data - ensure strings are handled
            const tableBody = data.map(row => {
                const newRow = {};
                columns.forEach(col => {
                    const val = row[col.dataKey] != null ? String(row[col.dataKey]) : '';
                    newRow[col.dataKey] = this._reverseHebrew(val);
                });
                return newRow;
            });

            // Make sure autoTable is available
            if (!doc.autoTable) {
                console.error('AutoTable plugin not found');
                this._showToast('רכיב טבלה לא נטען', 'error');
                return;
            }

            // Generate Table
            doc.autoTable({
                columns: tableColumns,
                body: tableBody,
                startY: 25,
                styles: {
                    font: 'Assistant',
                    fontStyle: 'normal',
                    halign: 'right', // Align text to right for Hebrew
                    fillColor: [255, 255, 255],
                    textColor: [20, 20, 20],
                    lineWidth: 0.1,
                    lineColor: [221, 221, 221]
                },
                headStyles: {
                    fillColor: [24, 40, 95], // #18285F
                    textColor: [255, 255, 255],
                    halign: 'right',
                    fontStyle: 'normal' // Using normal because we only have regular font
                },
                alternateRowStyles: {
                    fillColor: [249, 249, 249]
                },
                margin: { top: 25 },
                theme: 'grid'
            });

            // Add Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setTextColor(100);
            const dateStr = new Date().toLocaleDateString('he-IL');

            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(this._reverseHebrew(`עמוד ${i} מתוך ${pageCount} | הופק בתאריך: ${dateStr}`), pageWidth / 2, doc.internal.pageSize.height - 10, {
                    align: 'center',
                    isRightToLeft: false
                });
            }

            // Save PDF with compression
            doc.save(`${filename}.pdf`, { compress: true });
            console.log(`✅ Exported ${data.length} rows to ${filename}.pdf`);

        } catch (error) {
            console.error('❌ PDF export error:', error);
            this._showToast('שגיאה בייצוא ל-PDF', 'error');
        }
    }

    /**
     * Helper to reverse Hebrew strings for visual RTL
     * Handles mixed content and parentheses swapping
     */
    _reverseHebrew(str) {
        if (!str) return '';
        const s = String(str);

        // If no Hebrew characters, return as is
        if (!/[\u0590-\u05FF]/.test(s)) return s;

        // Helper to swap parens
        const swapParens = (term) => {
            return term.split('').map(c => {
                if (c === '(') return ')';
                if (c === ')') return '(';
                if (c === '[') return ']';
                if (c === ']') return '[';
                if (c === '{') return '}';
                if (c === '}') return '{';
                if (c === '<') return '>';
                if (c === '>') return '<';
                return c;
            }).join('');
        };

        // Split by spaces to handle mixed words
        return s.split(' ').reverse().map(word => {
            // If word contains Hebrew, reverse characters AND swap parens
            if (/[\u0590-\u05FF]/.test(word)) {
                return swapParens(word.split('').reverse().join(''));
            }

            // If word is pure Number/English but contains parens (e.g. "(123)"), we need to swap parens
            // but NOT reverse the text characters (to keep "123" reading as "123")
            if (word.match(/[(){}[\]<>]/)) {
                return swapParens(word);
            }

            return word;
        }).join(' ');
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
     * Export requirements list to Excel
     */
    exportRequirementsToExcel(requirements, filename = 'requirements') {
        const data = requirements.map(req => ({
            'מספר דרישה': req.id || '',
            'שם דרישה': req.name || '',
            'תקציב': req.budget || 0,
            'בפועל': req.actual || 0,
            'ניצול': (req.utilization || 0).toFixed(1) + '%',
            'סטטוס': req.status || '',
            'דורש': req.requester || ''
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

    /**
     * Export task details to Excel
     */
    exportTaskToExcel(task, filename = 'task-details') {
        const data = task.employees.map(emp => ({
            'עובד': emp.name || '',
            'שעות': emp.hours || 0
        }));

        // Add summary row
        data.push({
            'עובד': 'סה"כ',
            'שעות': task.totalHours || 0
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'משימה');
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }

    /**
     * Export task details to PDF
     */
    exportTaskToPDF(task, filename = 'task-details') {
        const title = `משימה: ${task.name}`;
        const columns = [
            { header: 'עובד', dataKey: 'employee' },
            { header: 'שעות', dataKey: 'hours' }
        ];

        const data = task.employees.map(emp => ({
            employee: emp.name || '',
            hours: (emp.hours || 0).toLocaleString('he-IL')
        }));

        // Add summary row
        data.push({
            employee: 'סה"כ',
            hours: (task.totalHours || 0).toLocaleString('he-IL')
        });

        this.exportToPDF({ data, columns, title, filename });
    }

    /**
     * Export single object details to PDF (Vertical Layout)
     * @param {Object} details - Key-Value pairs to print
     * @param {String} title - Document title
     * @param {String} filename - Output filename
     */
    async exportDetailsToPDF(details, title = 'פרטים', filename = 'details') {
        if (!details || Object.keys(details).length === 0) {
            this._showToast('אין נתונים לייצוא', 'error');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            this._showToast('ספריית PDF לא נטענה', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add Hebrew Font
            if (!doc.getFontList()['Assistant']) {
                doc.addFileToVFS('Assistant-Regular.ttf', assistantFontBase64);
                doc.addFont('Assistant-Regular.ttf', 'Assistant', 'normal');
            }
            doc.setFont('Assistant');

            // Title
            doc.setFontSize(18);
            doc.setTextColor(24, 40, 95);
            const pageWidth = doc.internal.pageSize.width;
            doc.text(this._reverseHebrew(title), pageWidth / 2, 20, { align: 'center', isRightToLeft: false });

            // Content
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);

            let yPos = 40;
            const rightMargin = 190;
            const lineHeight = 10;

            Object.entries(details).forEach(([key, value]) => {
                // Prepare Key (always assumes Hebrew context)
                const keyRev = this._reverseHebrew(key);
                const stringVal = String(value);

                // Prepare Value
                // If value contains Hebrew, reverse it. If it's a number/date, keep LTR.
                let valToDraw = stringVal;

                // FIX: Remove Shekel symbol (₪) and replace with text suffix or just remove to prevent BIDI issues
                if (valToDraw.includes('₪')) {
                    valToDraw = valToDraw.replace('₪', '').trim();
                    // Optional: Add 'NIS' or 'ש"ח' but ensure it doesn't break number flow. 
                    // For now, let's keep it clean as just the number to guarantee correctness.
                }

                if (/[\u0590-\u05FF]/.test(stringVal)) {
                    valToDraw = this._reverseHebrew(stringVal);
                }

                // Layout:
                // [Value] ................. [Key] |Margin

                // Draw Key aligned right at margin
                doc.text(keyRev + ' :', rightMargin, yPos, { align: 'right', isRightToLeft: false });

                // Calculate Key width to offset Value
                // We use a fixed offset or dynamic? 
                // Let's use a safe gap from the colon.
                const keyWidth = doc.getTextWidth(keyRev + ' :');
                const valueX = rightMargin - keyWidth - 2; // 2mm gap

                // FIX: Check if we need to reverse value again (Double Reverse Check)
                // If it's already mixed Hebrew, reverse it.
                // But wait, exportDetailsToPDF is standalone and implements its own logic.
                // It does NOT call exportToPDF.
                // So keeping _reverseHebrew here IS correct for this specific method.
                // I will NOT change this block, reverting content to original.
                doc.text(valToDraw, valueX, yPos, { align: 'right', isRightToLeft: false });

                // Check page break
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                yPos += lineHeight;
            });

            // Footer
            const dateStr = new Date().toLocaleDateString('he-IL');
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(this._reverseHebrew(`הופק בתאריך: ${dateStr}`), pageWidth / 2, 285, { align: 'center', isRightToLeft: false });

            // Save
            doc.save(`${filename}.pdf`, { compress: true });
            console.log(`✅ Exported details to ${filename}.pdf`);

        } catch (error) {
            console.error('❌ PDF export details error:', error);
            this._showToast('שגיאה בייצוא ל-PDF', 'error');
        }
    }

    /**
     * Export table to HTML Clipboard for Email
     * @param {String} tableId - ID of the table element to copy
     */
    async exportToHTMLClipboard(tableId) {
        const table = document.getElementById(tableId);
        if (!table) {
            alert('טבלה לא נמצאה');
            return;
        }

        try {
            // Visualize selection
            const originalBorder = table.style.border;
            table.style.border = '2px solid #18285F';

            // Create a clean clone for email formatting
            const clone = table.cloneNode(true);
            clone.style.width = '100%';
            clone.style.borderCollapse = 'collapse';
            clone.style.fontFamily = 'Arial, sans-serif';
            clone.style.direction = 'rtl';

            // Style cells for email (inline styles are safer)
            const cells = clone.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.border = '1px solid #dddddd';
                cell.style.padding = '8px';
                cell.style.textAlign = 'right';
                if (cell.tagName === 'TH') {
                    cell.style.backgroundColor = '#18285F';
                    cell.style.color = '#ffffff';
                }

                // Fix negative numbers in RTL
                const text = cell.innerText.trim();
                // Check if text starts with '-' or contains it for currency/percent (e.g. "-50%")
                // Simple check for negative value: starts with - and has digit
                if (text.startsWith('-') || (text.includes('-') && /[0-9]/.test(text) && !/[a-zA-Z]/.test(text))) {
                    cell.innerHTML = `<span style="direction: ltr; unicode-bidi: embed; display: inline-block;">${text}</span>`;
                }
            });

            // Get HTML string
            const htmlContent = clone.outerHTML;

            // Restore original style
            table.style.border = originalBorder;

            // Copy to clipboard
            // Use standard Clipboard API
            const type = 'text/html';
            const blob = new Blob([htmlContent], { type });
            const data = [new ClipboardItem({ [type]: blob })];

            await navigator.clipboard.write(data);

            // Visual feedback
            const btn = document.getElementById('modalExportHTML'); // Try to find the button
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅';
                setTimeout(() => btn.innerHTML = originalText, 1500);
            }

            this._showToast('הטבלה הועתקה ללוח! ניתן להדביק במייל (Ctrl+V)', 'success');

        } catch (err) {
            console.error('Failed to copy HTML: ', err);
            // Fallback for some browsers
            try {
                // Select the table
                const range = document.createRange();
                range.selectNode(table);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                document.execCommand('copy');
                window.getSelection().removeAllRanges();
                window.getSelection().removeAllRanges();
                this._showToast('הטבלה הועתקה ללוח!', 'success');
            } catch (fallbackErr) {
                this._showToast('שגיאה בהעתקה ללוח', 'error');
            }
        }
    }

    /**
     * Helper to show toast via main app
     */
    _showToast(message, type = 'info') {
        if (window.app && window.app.uiRenderer && window.app.uiRenderer.showToast) {
            window.app.uiRenderer.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Export DOM element to PDF (Screenshot)
     * @param {HTMLElement} element - Element to capture
     * @param {String} filename - Output filename
     */
    async exportElementToPDF(element, filename = 'export') {
        if (!element) {
            this._showToast('אלמנט לא נמצא', 'error');
            return;
        }

        if (!window.html2canvas) {
            this._showToast('ספריית html2canvas חסרה', 'error');
            return;
        }

        try {
            // Visualize that something is happening
            document.body.style.cursor = 'wait';

            const canvas = await window.html2canvas(element, {
                useCORS: true,
                scale: 2, // Better quality
                backgroundColor: '#ffffff', // Ensure white background
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Handle multi-page if element is very long (basic implementation)
            let heightLeft = imgHeight;
            let position = 0;

            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save(`${filename}.pdf`);
            document.body.style.cursor = 'default';

        } catch (error) {
            console.error('❌ PDF screenshot export error:', error);
            document.body.style.cursor = 'default';
            this._showToast('שגיאה בייצוא צילום מסך ל-PDF', 'error');
        }
    }
}
