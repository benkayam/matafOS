/**
 * ============================================
 * Dashboard Management - Main Controller
 * ============================================
 * 
 * Clean, modular architecture
 * Entry point for the application
 * 
 * @version 2.0
 * @date December 2025
 */

import { FileHandler } from './modules/file-handler.js';
import { DataProcessor } from './modules/data-processor.js';
import { UIRenderer } from './modules/ui-renderer.js';
import { Exporter } from './modules/exporter.js';
import { GlobalSearch } from './modules/global-search.js';
import { TeamFilter } from './modules/team-filter.js';

class DashboardApp {
    constructor() {
        this.fileHandler = new FileHandler();
        this.dataProcessor = new DataProcessor();
        this.uiRenderer = new UIRenderer();
        this.exporter = new Exporter();
        this.globalSearch = new GlobalSearch(this.dataProcessor, this.uiRenderer);
        this.teamFilter = new TeamFilter();

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('🚀 Dashboard initializing...');

        // Initialize modules
        this.fileHandler.init(this.onDataLoaded.bind(this));
        this.uiRenderer.init();
        this.globalSearch.init();
        this.teamFilter.init(this.onTeamChange.bind(this));

        // Pass team filter to data processor
        this.dataProcessor.setTeamFilter(this.teamFilter);

        // Expose for global access (for onclick handlers)
        window.app = this;

        console.log('✅ Dashboard ready');
    }

    /**
     * Handle team change
     */
    onTeamChange(teamId) {
        console.log(`🔄 Team changed to: ${teamId}`);

        // Refresh all data displays
        if (this.dataProcessor.hoursData && this.dataProcessor.hoursData.length > 0) {
            this.refreshAllDisplays();
        }
    }

    /**
     * Refresh all displays with current team filter
     */
    refreshAllDisplays() {
        const currentTab = this.uiRenderer.currentTab;

        if (currentTab === 'employees') {
            // Refresh employees tab
            const employees = this.dataProcessor.getEmployeesArray();
            this.uiRenderer.renderEmployeesTable(employees);

            const employeeKPIs = this.dataProcessor.getEmployeeKPIs();
            this.uiRenderer.updateEmployeeKPIs(employeeKPIs);

            const hoursTotals = this.dataProcessor.getHoursTotals();
            this.uiRenderer.updateEmployeeHoursKPIs(hoursTotals);

            // Update general stats
            const stats = this.dataProcessor.getStats();
            this.uiRenderer.updateKPIs(stats);

        } else if (currentTab === 'hours') {
            // Refresh tasks tab
            const tasks = this.dataProcessor.getTasksGrouped();
            this.uiRenderer.renderTasksCards(tasks);

        } else if (currentTab === 'requirements') {
            // Requirements tab doesn't need team filtering
            // But we can still refresh it
            const requirements = this.dataProcessor.getRequirements();
            this.uiRenderer.renderRequirementsTable(requirements);
        }
    }

    /**
     * Callback when file data is loaded
     */
    onDataLoaded(type, data) {
        console.log(`📊 Data loaded: ${type}`, data.length, 'rows');

        // Process data
        const stats = this.dataProcessor.updateData(type, data);

        // Update UI
        this.uiRenderer.updateKPIs(stats);

        if (type === 'hours') {
            // Render tasks cards
            const tasks = this.dataProcessor.getTasksGrouped();
            this.uiRenderer.renderTasksCards(tasks);

            // Render employees table
            const employees = this.dataProcessor.getEmployeesArray();
            this.uiRenderer.renderEmployeesTable(employees);

            // Update employee KPIs
            const employeeKPIs = this.dataProcessor.getEmployeeKPIs();
            this.uiRenderer.updateEmployeeKPIs(employeeKPIs);

            // Update investment/expense hours KPIs
            const hoursTotals = this.dataProcessor.getHoursTotals();
            this.uiRenderer.updateEmployeeHoursKPIs(hoursTotals);

            // Update Exceptions KPI (Sheet 2) & Render Modal if needed
            const exceptions = this.dataProcessor.getExceptions();

            // Count unique employees for KPI
            const uniqueExceptions = new Set();
            exceptions.forEach(ex => {
                // Try to find a unique identifier
                const id = Object.keys(ex).find(k => k.includes('מספר') || k.includes('ID') || k.includes('id'));
                const name = Object.keys(ex).find(k => k.includes('שם') || k.includes('Name') || k.includes('Employee'));

                const uniqueKey = id ? ex[id] : (name ? ex[name] : null);
                if (uniqueKey) uniqueExceptions.add(uniqueKey);
            });

            const exceptionsCount = uniqueExceptions.size;
            this.uiRenderer.updateExceptionsKPI(exceptionsCount);

        } else if (type === 'requirements') {
            // Render table with all requirements
            const allRequirements = this.dataProcessor.getRequirements();
            this.uiRenderer.renderRequirementsTable(allRequirements);

            // Update New Requirements KPIs
            const reqKPIs = this.dataProcessor.getRequirementsKPIs();
            this.uiRenderer.renderRequirementsKPIs(reqKPIs);

            // Ensure filter counts are updated (renderRequirementsTable also calls this, but we ensure it here too)
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                this.uiRenderer.updateRequirementsFilterCounts();
            }, 0);
        }
    }

    /**
     * Clear file (called from UI)
     */
    clearFile(type) {
        this.fileHandler.clearFile(type);
    }

    /**
     * Search hours
     */
    searchHours(query) {
        const results = this.dataProcessor.searchHours(query);
        this.uiRenderer.renderHoursTable(results);
    }

    /**
     * Search requirements
     */
    searchRequirements(query) {
        // First filter by status, then search
        const filtered = this.dataProcessor.filterRequirements(this.uiRenderer.currentRequirementsFilter);
        const results = query
            ? filtered.filter(req =>
                req.id.toLowerCase().includes(query.toLowerCase()) ||
                req.name.toLowerCase().includes(query.toLowerCase())
            )
            : filtered;
        this.uiRenderer.renderRequirementsTable(results);
    }

    /**
     * Sort hours table
     */
    sortHours(column, direction) {
        const data = this.dataProcessor.getHours();
        const sorted = this.sortData(data, column, direction);
        this.uiRenderer.renderHoursTable(sorted);
    }

    /**
     * Sort requirements table
     */
    sortRequirements(column, direction) {
        // Fix: Sort the currently filtered view, not the raw data
        const currentFilter = this.uiRenderer.currentRequirementsFilter || 'all';
        const data = this.dataProcessor.filterRequirements(currentFilter);
        const sorted = this.sortData(data, column, direction);
        this.uiRenderer.renderRequirementsTable(sorted);
    }

    /**
     * Sort employees table
     */
    sortEmployees(column, direction) {
        const data = this.dataProcessor.getEmployeesArray();
        const sorted = this.sortData(data, column, direction);
        this.uiRenderer.renderEmployeesTable(sorted);
    }

    /**
     * Generic sort function
     */
    sortData(data, column, direction) {
        return [...data].sort((a, b) => {
            let aVal = a[column] ?? '';
            let bVal = b[column] ?? '';

            // Handle numbers
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // Handle strings
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();

            if (direction === 'asc') {
                return aVal.localeCompare(bVal, 'he');
            } else {
                return bVal.localeCompare(aVal, 'he');
            }
        });
    }

    /**
     * Search employees
     */
    searchEmployees(query) {
        const results = this.dataProcessor.searchEmployees(query);
        this.uiRenderer.renderEmployeesTable(results);
    }

    /**
     * Show all employees (called from KPI card)
     */
    showAllEmployees() {
        const employees = this.dataProcessor.getEmployeesArray();
        this.uiRenderer.showEmployeeListModal(employees, 'כל העובדים');
    }

    /**
     * Show employees by type (called from KPI cards)
     */
    showEmployeesByType(type) {
        const employees = this.dataProcessor.getEmployeesByType(type);
        const title = type === 'מתף' ? 'עובדי מתף' : 'עובדים פרויקטליים';
        this.uiRenderer.showEmployeeListModal(employees, title);
    }

    /**
     * Show employees with low investment percent
     */
    showLowInvestmentEmployees() {
        const employees = this.dataProcessor.getLowInvestmentEmployees(65);
        this.uiRenderer.showEmployeeListModal(employees, 'השקעה נמוכה מ-65%');
    }

    /**
     * Show Exceptions Modal
     */
    showExceptions() {
        const exceptions = this.dataProcessor.getExceptions();
        if (!exceptions || exceptions.length === 0) {
            alert('אין חריגות להצגה');
            return;
        }
        this.uiRenderer.showExceptionsModal(exceptions);
    }

    /**
     * Export employees to Excel
     */
    exportEmployeesExcel() {
        const employees = this.dataProcessor.getEmployeesArray();
        if (employees.length === 0) {
            alert('אין נתוני עובדים לייצוא');
            return;
        }
        this.exporter.exportEmployeesToExcel(employees, 'employees-list');
    }

    /**
     * Export employees to PDF
     */
    exportEmployeesPDF() {
        const employees = this.dataProcessor.getEmployeesArray();
        if (employees.length === 0) {
            alert('אין נתוני עובדים לייצוא');
            return;
        }
        this.exporter.exportEmployeesToPDF(employees, 'רשימת עובדים', 'employees-list');
    }

    /**
     * Export requirements to Excel
     */
    exportRequirementsExcel() {
        const currentFilter = this.uiRenderer.currentRequirementsFilter || 'all';
        const requirements = this.dataProcessor.filterRequirements(currentFilter);

        if (requirements.length === 0) {
            alert('אין נתוני דרישות לייצוא');
            return;
        }

        const filename = currentFilter === 'all'
            ? 'requirements-list'
            : `requirements-list-${currentFilter}`;

        this.exporter.exportRequirementsToExcel(requirements, filename);
    }

    /**
     * Export requirements to PDF
     */
    exportRequirementsPDF() {
        const currentFilter = this.uiRenderer.currentRequirementsFilter || 'all';
        const requirements = this.dataProcessor.filterRequirements(currentFilter);

        if (requirements.length === 0) {
            alert('אין נתוני דרישות לייצוא');
            return;
        }

        const listTitle = currentFilter === 'all'
            ? 'רשימת דרישות'
            : `רשימת דרישות (${this.getFilterNameHebrew(currentFilter)})`;

        const filename = currentFilter === 'all'
            ? 'requirements-list'
            : `requirements-list-${currentFilter}`;

        this.exporter.exportRequirementsToPDF(requirements, listTitle, filename);
    }

    /**
     * Get Hebrew name for filter status
     */
    getFilterNameHebrew(filter) {
        const names = {
            'all': 'הכל',
            'active': 'פעיל',
            'backlog': 'Backlog',
            'done': 'בוצע',
            'overbudget': 'חריגה'
        };
        return names[filter] || filter;
    }

    /**
     * Show task modal
     */
    showTaskModal(taskOrName) {
        this.uiRenderer.showTaskModal(taskOrName);
    }

    /**
     * Export task to Excel
     */
    exportTaskToExcel(task) {
        if (!task || !task.employees || task.employees.length === 0) {
            alert('אין נתונים לייצוא');
            return;
        }
        const filename = `task-${task.name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}`;
        this.exporter.exportTaskToExcel(task, filename);
    }

    /**
     * Export task to PDF
     */
    exportTaskToPDF(task) {
        if (!task || !task.employees || task.employees.length === 0) {
            alert('אין נתונים לייצוא');
            return;
        }
        const filename = `task-${task.name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}`;
        this.exporter.exportTaskToPDF(task, filename);
    }

    /**
     * Export all tasks to Excel (Tasks Tab)
     */
    exportAllTasksExcel() {
        const tasks = this.dataProcessor.getTasksGrouped();
        if (!tasks || tasks.length === 0) {
            alert('אין נתוני משימות לייצוא');
            return;
        }

        // Prepare flat data for export
        const data = tasks.map(t => ({
            'משימה': t.name,
            'סוג': t.type || '',
            'מספר עובדים': t.employeeCount,
            'סה"כ שעות': t.totalHours
        }));

        this.exporter.exportToExcel(data, 'all-tasks-summary', 'משימות');
    }

    /**
     * Export all tasks to PDF (Tasks Tab)
     */
    exportAllTasksPDF() {
        const tasks = this.dataProcessor.getTasksGrouped();
        if (!tasks || tasks.length === 0) {
            alert('אין נתוני משימות לייצוא');
            return;
        }

        const columns = [
            { header: 'משימה', dataKey: 'name' },
            { header: 'סוג', dataKey: 'type' },
            { header: 'עובדים', dataKey: 'employeeCount' },
            { header: 'שעות', dataKey: 'totalHours' }
        ];

        const data = tasks.map(t => ({
            name: t.name,
            type: t.type || '',
            employeeCount: t.employeeCount,
            totalHours: t.totalHours.toLocaleString('he-IL')
        }));

        this.exporter.exportToPDF({
            data,
            columns,
            title: 'סיכום משימות',
            filename: 'all-tasks-summary'
        });
    }

    /**
     * Export employees to HTML Clipboard
     */
    exportEmployeesHTML() {
        const employees = this.dataProcessor.getEmployeesArray();
        if (employees.length === 0) {
            this.uiRenderer.showToast('אין נתוני עובדים לייצוא', 'error');
            return;
        }
        this.exporter.exportToHTMLClipboard('employeesTable');
    }

    /**
     * Export requirements to HTML Clipboard
     */
    exportRequirementsHTML() {
        const currentFilter = this.uiRenderer.currentRequirementsFilter || 'all';
        const requirements = this.dataProcessor.filterRequirements(currentFilter);
        if (requirements.length === 0) {
            this.uiRenderer.showToast('אין נתוני דרישות לייצוא', 'error');
            return;
        }
        this.exporter.exportToHTMLClipboard('requirementsTable');
    }

    /**
     * Export all tasks to HTML Clipboard (Tasks Tab)
     */
    exportAllTasksHTML() {
        const tasks = this.dataProcessor.getTasksGrouped();
        if (!tasks || tasks.length === 0) {
            this.uiRenderer.showToast('אין נתוני משימות לייצוא', 'error');
            return;
        }

        // Create a temporary table for the export
        const tempTable = document.createElement('table');
        tempTable.id = 'tempTasksTable';
        tempTable.style.display = 'none';

        const headerRow = `<tr>
            <th>משימה</th>
            <th>סוג</th>
            <th>מספר עובדים</th>
            <th>סה"כ שעות</th>
        </tr>`;

        const rows = tasks.map(t => `
            <tr>
                <td>${this.uiRenderer.escapeHtml(t.name)}</td>
                <td>${this.uiRenderer.escapeHtml(t.type || '')}</td>
                <td>${t.employeeCount}</td>
                <td style="direction: ltr;">${this.uiRenderer.formatNumber(t.totalHours)}</td>
            </tr>
        `).join('');

        tempTable.innerHTML = `<thead>${headerRow}</thead><tbody>${rows}</tbody>`;
        document.body.appendChild(tempTable);

        this.exporter.exportToHTMLClipboard('tempTasksTable').then(() => {
            document.body.removeChild(tempTable);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DashboardApp();
});

