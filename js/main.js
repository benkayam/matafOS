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
            // Refresh hours tab
            const hours = this.dataProcessor.getHoursData();
            this.uiRenderer.renderHoursTable(hours);
            
            const taskMatrix = this.dataProcessor.getTaskMatrix();
            this.uiRenderer.renderTaskMatrix(taskMatrix);
            
            const taskKPIs = this.dataProcessor.getTaskKPIs();
            this.uiRenderer.updateTaskKPIs(taskKPIs);
            
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
            // Note: Hours table removed from UI (not needed)
            // this.uiRenderer.renderHoursTable(this.dataProcessor.getHours());
            
            // Render task matrix (heatmap)
            const taskMatrix = this.dataProcessor.getTaskMatrix();
            this.uiRenderer.renderTaskMatrix(taskMatrix);
            
            // Update task KPIs
            const taskKPIs = this.dataProcessor.getTaskKPIs();
            this.uiRenderer.updateTaskKPIs(taskKPIs);
            
            // Render employees table
            const employees = this.dataProcessor.getEmployeesArray();
            this.uiRenderer.renderEmployeesTable(employees);
            
            // Update employee KPIs
            const employeeKPIs = this.dataProcessor.getEmployeeKPIs();
            this.uiRenderer.updateEmployeeKPIs(employeeKPIs);

            // Update investment/expense hours KPIs
            const hoursTotals = this.dataProcessor.getHoursTotals();
            this.uiRenderer.updateEmployeeHoursKPIs(hoursTotals);
            
        } else if (type === 'requirements') {
            // Render table with all requirements
            const allRequirements = this.dataProcessor.getRequirements();
            this.uiRenderer.renderRequirementsTable(allRequirements);
            
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
        const data = this.dataProcessor.getRequirements();
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
        const requirements = this.dataProcessor.getRequirements();
        if (requirements.length === 0) {
            alert('אין נתוני דרישות לייצוא');
            return;
        }
        this.exporter.exportRequirementsToExcel(requirements, 'requirements-list');
    }

    /**
     * Export requirements to PDF
     */
    exportRequirementsPDF() {
        const requirements = this.dataProcessor.getRequirements();
        if (requirements.length === 0) {
            alert('אין נתוני דרישות לייצוא');
            return;
        }
        this.exporter.exportRequirementsToPDF(requirements, 'רשימת דרישות', 'requirements-list');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DashboardApp();
});

