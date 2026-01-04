/**
 * ============================================
 * UI Renderer Module
 * ============================================
 * Handles all UI updates, tables, and interactions
 */

import { CONFIG, getUtilizationStatus, STATUS } from '../config.js';
import { ModalManager } from './modal-manager.js';

export class UIRenderer {
    constructor() {
        this.currentTab = 'employees'; // Start with employees tab
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.requirementsData = []; // Store full requirements data for modal
        this.currentRequirementsFilter = 'all'; // Current filter status
        this.modalManager = new ModalManager();
    }

    /**
     * Show Toast Notification
     * @param {String} message - Message to display
     * @param {String} type - 'info', 'success', 'error'
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

        document.body.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        // Show
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Hide and remove after 3s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * Initialize UI handlers
     */
    init() {
        this.setupTabs();
        this.setupSearch();
        this.setupTableSorting();
        this.setupModal();
        this.setupRequirementsFilter();
    }

    /**
     * Setup tab switching
     */
    setupTabs() {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Restore active tab from storage or default to 'employees'
        const savedTab = localStorage.getItem('activeTab') || 'employees';
        this.switchTab(savedTab);
    }

    /**
     * Switch active tab
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        localStorage.setItem('activeTab', tabName);

        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        // Show/hide KPI cards based on tab
        const kpiEmployeesCard = document.getElementById('kpiEmployeesCard');
        const kpiTotalHoursCard = document.getElementById('kpiTotalHoursCard');

        if (kpiEmployeesCard && kpiTotalHoursCard) {
            if (tabName === 'requirements' || tabName === 'hours') {
                // Hide these cards in requirements and tasks (hours) tabs
                kpiEmployeesCard.style.display = 'none';
                kpiTotalHoursCard.style.display = 'none';
            } else {
                // Show only in employees tab
                kpiEmployeesCard.style.display = 'block';
                kpiTotalHoursCard.style.display = 'block';
            }
        }

        // If switching to requirements tab, ensure filter counts are updated
        if (tabName === 'requirements') {
            setTimeout(() => {
                this.updateRequirementsFilterCounts();
            }, 0);
        }
    }

    /**
     * Setup search handlers
     */
    setupSearch() {
        const hoursSearch = document.getElementById('hoursSearch');
        const requirementsSearch = document.getElementById('requirementsSearch');
        const employeesSearch = document.getElementById('employeesSearch');

        if (hoursSearch) {
            hoursSearch.addEventListener('input', this.debounce((e) => {
                if (window.app) window.app.searchHours(e.target.value);
            }, CONFIG.SEARCH_DEBOUNCE_MS));
        }

        if (requirementsSearch) {
            requirementsSearch.addEventListener('input', this.debounce((e) => {
                if (window.app) window.app.searchRequirements(e.target.value);
            }, CONFIG.SEARCH_DEBOUNCE_MS));
        }

        if (employeesSearch) {
            employeesSearch.addEventListener('input', this.debounce((e) => {
                if (window.app) window.app.searchEmployees(e.target.value);
            }, CONFIG.SEARCH_DEBOUNCE_MS));
        }
    }

    /**
     * Setup table column sorting
     */
    setupTableSorting() {
        document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                const table = th.closest('table').id;

                // Toggle direction
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }

                // Trigger sort
                if (window.app) {
                    if (table === 'hoursTable') {
                        window.app.sortHours(column, this.sortDirection);
                    } else if (table === 'requirementsTable') {
                        window.app.sortRequirements(column, this.sortDirection);
                    } else if (table === 'employeesTable') {
                        window.app.sortEmployees(column, this.sortDirection);
                    }
                }

                // Update visual indicator
                this.updateSortIndicator(th);
            });
        });
    }

    /**
     * Update sort indicator on headers
     */
    updateSortIndicator(activeHeader) {
        const table = activeHeader.closest('table');
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        activeHeader.classList.add(`sort-${this.sortDirection}`);
    }

    /**
     * Update KPI cards
     */
    updateKPIs(stats) {
        this.setElementText('kpiEmployees', stats.employees || '-');
        this.setElementText('kpiTotalHours', this.formatNumber(stats.totalHours));
    }

    /**
     * Update task KPIs - Hours tab
     */
    updateTaskKPIs(kpis) {
        // Note: Task KPI cards removed from UI per user request
        // Keeping function for backwards compatibility
        // this.setElementText('totalTasks', kpis.total || '-');
        // this.setElementText('overloadedTasks', kpis.overloaded || '0');
        // this.setElementText('investmentTasks', kpis.investment || '0');
        // this.setElementText('expenseTasks', kpis.expense || '0');
    }

    /**
     * Update investment/expense hours KPIs (employees tab)
     */
    updateEmployeeHoursKPIs(totals) {
        if (!totals) return;
        const { totalHours, investmentHours, expenseHours } = totals;
        const invPercent = totalHours > 0 ? (investmentHours / totalHours) * 100 : 0;
        const expPercent = totalHours > 0 ? (expenseHours / totalHours) * 100 : 0;

        this.setElementText('investmentHoursKpi', this.formatNumber(investmentHours));
        this.setElementText('investmentHoursPercent', `${this.formatNumber(invPercent)}% `);

        this.setElementText('expenseHoursKpi', this.formatNumber(expenseHours));
        this.setElementText('expenseHoursPercent', `${this.formatNumber(expPercent)}% `);

        // Color investment percent: green only if >=65%
        const invPercentEl = document.getElementById('investmentHoursPercent');
        if (invPercentEl) {
            invPercentEl.className = `card-subvalue ${this.getPercentClass('investment', invPercent)}`;
        }

        // Color expense percent
        const expPercentEl = document.getElementById('expenseHoursPercent');
        if (expPercentEl) {
            expPercentEl.className = `card-subvalue ${this.getPercentClass('expense', expPercent)}`;
        }
    }

    /**
     * Update employee KPIs - Employees tab
     */
    updateEmployeeKPIs(kpis) {
        this.setElementText('totalEmployeesCount', kpis.total || '-');
        this.setElementText('matafEmployeesCount', kpis.mataf || '-');
        this.setElementText('projectEmployeesCount', kpis.project || '-');
        this.setElementText('lowInvestmentEmployeesCount', kpis.lowInvestment || '0');
    }

    /**
     * Get class for percent coloring based on thresholds
     * investment: >65 green, 60-65 orange, <60 red
     * expense: >40 red, 30-40 orange, <30 green
     */
    getPercentClass(type, value) {
        const v = Number(value) || 0;
        if (type === 'investment') {
            if (v > 65) return 'text-success';      // מעל 65 - ירוק
            if (v >= 60 && v <= 65) return 'text-warning';  // בין 60 ל-65 - כתום
            return 'text-danger';                    // מתחת ל-60 - אדום
        }
        if (type === 'expense') {
            if (v > 40) return 'text-danger';        // מעל 40 - אדום
            if (v >= 30 && v <= 40) return 'text-warning';  // בין 30 ל-40 - כתום
            return 'text-success';                   // מתחת ל-30 - ירוק
        }
        return '';
    }

    /**
     * Render task matrix (heatmap)
     */
    renderTaskMatrix(taskMatrix) {
        const container = document.getElementById('matrixView');
        if (!container) return;

        if (!taskMatrix || taskMatrix.length === 0) {
            container.innerHTML = `
                <div class="empty-message" style="padding: 60px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px; opacity: 0.5;"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    <div>אין נתוני משימות להצגה</div>
                </div>
            `;
            return;
        }

        container.innerHTML = taskMatrix.map((task, index) => {
            // Color by employee count
            const tileClass = task.employeeCount >= 4 ? 'tile-red' :
                task.employeeCount >= 2 ? 'tile-yellow' :
                    'tile-green';

            // Icon by type
            const typeIcon = task.type === 'השקעה' ? '💰' :
                task.type === 'הוצאה' ? '💸' : '';

            // Truncate name if too long
            const displayName = task.name.length > 40
                ? task.name.substring(0, 37) + '...'
                : task.name;

            return `
                <div class="matrix-tile ${tileClass}" data-task-index="${index}" title="${this.escapeHtml(task.name)}">
                    ${typeIcon ? `<span class="tile-badge">${typeIcon}</span>` : ''}
                    <div class="tile-name">${this.escapeHtml(displayName)}</div>
                    <div class="tile-stats">
                        <span class="tile-employees">${task.employeeCount}</span>
                        <span class="tile-hours">${this.formatNumber(task.totalHours)} ש'</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render hours table - מותאם לטבלה המקורית
     */
    renderHoursTable(data) {
        const tbody = document.getElementById('hoursTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-message">טען קובץ שעות להצגת נתונים</td></tr>';
            return;
        }

        // Limit to page size
        const displayData = data.slice(0, CONFIG.TABLE_PAGE_SIZE);

        tbody.innerHTML = displayData.map(row => `
            <tr class="employee-row" data-employee-id="${this.escapeHtml(row.employeeId || row.employee)}" data-employee-name="${this.escapeHtml(row.employee)}" style="cursor: pointer;">
                <td>${this.escapeHtml(row.employee)}</td>
                <td class="number-cell">${row.date}</td>
                <td>${this.escapeHtml(row.task)}</td>
                <td>${this.escapeHtml(row.subtask)}</td>
                <td class="number-cell">${this.formatNumber(row.hours)}</td>
            </tr>
        `).join('');

        // Add click handlers to employee name cells
        this.setupEmployeeRowClicks();
    }

    /**
     * Setup click handlers for employee rows
     */
    setupEmployeeRowClicks() {
        document.querySelectorAll('.employee-row').forEach(row => {
            const employeeCell = row.querySelector('td:first-child');
            if (employeeCell) {
                employeeCell.style.cursor = 'pointer';
                employeeCell.style.textDecoration = 'underline';
                employeeCell.style.color = 'var(--primary-blue-dark)';

                employeeCell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const employeeId = row.dataset.employeeId;
                    const employeeName = row.dataset.employeeName;
                    if (employeeId || employeeName) {
                        this.showEmployeeModal(employeeId || employeeName);
                    }
                });
            }
        });
    }

    /**
     * Render Requirements KPIs
     */
    renderRequirementsKPIs(kpis) {
        const container = document.getElementById('requirementsKpiContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="card summary-card">
                <div class="card-content">
                    <h3>Active</h3>
                    <div class="card-value">${this.formatNumber(kpis.activeCount)}</div>
                    <div class="card-subvalue">דרישות פעילות</div>
                </div>
            </div>
            <div class="card summary-card">
                <div class="card-content">
                    <h3>Done</h3>
                    <div class="card-value text-success">${this.formatNumber(kpis.doneCount)}</div>
                    <div class="card-subvalue">דרישות שהושלמו</div>
                </div>
            </div>
            <div class="card summary-card">
                <div class="card-content">
                    <h3>חריגה</h3>
                    <div class="card-value text-danger" style="color: var(--fibi-error);">${this.formatNumber(kpis.overbudgetCount)}</div>
                    <div class="card-subvalue">דרישות בחריגה</div>
                </div>
            </div>
            <div class="card summary-card">
                <div class="card-content">
                    <h3>יתרות Done</h3>
                    <div class="card-value">${this.formatNumber(kpis.doneWithBudgetCount)}</div>
                    <div class="card-subvalue text-success">${this.formatCurrency(kpis.totalDoneRemainder)}</div>
                </div>
            </div>
            <div class="card summary-card">
                <div class="card-content">
                    <h3>ניצול 90-100%</h3>
                    <div class="card-value text-warning">${this.formatNumber(kpis.highUtilizationCount)}</div>
                    <div class="card-subvalue">${this.formatCurrency(kpis.totalHighUtilizationRemainder)}</div>
                </div>
            </div>
            <div class="card summary-card">
                <div class="card-content">
                    <h3>שיאן הדרישות</h3>
                    <div class="card-value" style="font-size: 18px;">${this.escapeHtml(kpis.topRequester.name)}</div>
                    <div class="card-subvalue">${kpis.topRequester.count} דרישות</div>
                </div>
            </div>
        `;
    }

    /**
     * Update Exceptions KPI in Employees Tab
     */
    updateExceptionsKPI(count) {
        const container = document.getElementById('employeesKpiContainer');
        if (!container) return;

        // Check if exists, else create
        let kpi = document.getElementById('kpiExceptionsCard');
        if (!kpi) {
            kpi = document.createElement('div');
            kpi.id = 'kpiExceptionsCard';
            kpi.className = 'card summary-card clickable-kpi';
            kpi.style.border = '1px solid var(--fibi-error)'; // Red border hint
            kpi.onclick = () => window.app && window.app.showExceptions();

            // Insert at the end
            container.appendChild(kpi);
        }

        kpi.innerHTML = `
            <div class="card-content">
                <h3 style="color: var(--fibi-error);">חריגות דיווח</h3>
                <div class="card-value text-danger" style="color: var(--fibi-error);">${count}</div>
                <div class="card-subvalue">עובדים בחריגה</div>
            </div>
        `;

        // Show/Hide based on count
        if (count > 0) {
            kpi.style.display = 'flex';
        } else {
            kpi.style.display = 'none';
        }
    }

    /**
     * Show Exceptions Modal
     */
    showExceptionsModal(exceptions) {
        // Create export buttons (Now with HTML ID)
        const exportButtons = this.modalManager.createExportButtons('exportExceptionsExcel', 'exportExceptionsPDF', 'exportExceptionsHTML');

        const content = `
            ${exportButtons}
            <div class="table-container">
                <table class="data-table" id="exceptionsTable">
                    <thead>
                        <tr>
                            ${(() => {
                // 1. Collect all unique keys
                const allKeys = new Set();
                exceptions.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));

                // 2. Define priority columns (Hebrew & English)
                const priority = ['שם', 'עובד', 'Name', 'Employee', 'מספר', 'ID', 'תאריך', 'Date', 'חריגה', 'הודעה', 'Exception', 'Message'];

                // 3. Sort keys
                const sortedKeys = Array.from(allKeys).sort((a, b) => {
                    const aIndex = priority.findIndex(p => a.includes(p));
                    const bIndex = priority.findIndex(p => b.includes(p));

                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return a.localeCompare(b, 'he');
                });

                // Store for body rendering
                this._lastExceptionKeys = sortedKeys;

                return sortedKeys.map(key => `<th>${this.escapeHtml(key)}</th>`).join('');
            })()}
                        </tr>
                    </thead>
                    <tbody>
                        ${exceptions.map(row => `
                            <tr>
                                ${this._lastExceptionKeys.map(key => {
                let val = row[key];
                if (val && (key.includes('תאריך') || key.includes('Date'))) {
                    val = this.formatSheetDate(val);
                }
                return `<td>${this.escapeHtml(val || '')}</td>`;
            }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.modalManager.showModal('employeeListModal', content);

        // Hack to set title since using generic modal
        const titleEl = document.getElementById('employeeListModalTitle');
        if (titleEl) titleEl.textContent = `חריגות דיווח (${exceptions.length})`;

        // Setup export handlers
        // Prepare columns for PDF export (Fix for missing names)
        const pdfColumns = this._lastExceptionKeys ? this._lastExceptionKeys.map(key => ({
            header: key,
            dataKey: key
        })) : [];

        this.modalManager.setupExportHandlers({
            excelButtonId: 'exportExceptionsExcel',
            pdfButtonId: 'exportExceptionsPDF',
            htmlButtonId: 'exportExceptionsHTML',
            tableId: 'exceptionsTable',
            data: exceptions,
            columns: pdfColumns, // FORCE generic PDF export
            title: 'חריגות דיווח',
            filename: 'exceptions-report',
            exporter: window.app && window.app.exporter
        });
    }

    /**
     * Render requirements table - מותאם לטבלה המקורית
     */
    renderRequirementsTable(data) {
        const tbody = document.getElementById('requirementsTableBody');
        if (!tbody) return;

        // Store data for modal - use full data, not filtered
        if (window.app && window.app.dataProcessor) {
            this.requirementsData = window.app.dataProcessor.getRequirements();
        } else {
            this.requirementsData = data;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-message">טען קובץ דרישות להצגת נתונים</td></tr>';
            // Still update counts even if no data to show
            this.updateRequirementsFilterCounts();
            return;
        }

        tbody.innerHTML = data.map((row, index) => {
            // Find original index in full data for modal
            const originalIndex = this.requirementsData.findIndex(r => r.id === row.id);
            const dataIndex = originalIndex >= 0 ? originalIndex : index;

            const remaining = row.budget - row.actual;
            const utilizationClass = row.utilization > 100 ? 'text-danger' :
                row.utilization > 90 ? 'text-warning' :
                    'text-success';
            const remainingClass = remaining < 0 ? 'text-danger' : '';

            return `
                <tr class="requirement-row" data-index="${dataIndex}" style="cursor: pointer;">
                    <td class="number-cell req-id">${this.escapeHtml(row.id)}</td>
                    <td>${this.escapeHtml(row.name)}</td>
                    <td class="number-cell">${this.formatCurrency(row.budget)}</td>
                    <td class="number-cell">${this.formatCurrency(row.actual)}</td>
                    <td class="number-cell ${remainingClass}">${this.formatCurrency(remaining)}</td>
                    <td class="number-cell ${utilizationClass}">${this.formatNumber(row.utilization)}%</td>
                </tr>
            `;
        }).join('');

        // Add click handlers to rows
        this.setupRequirementRowClicks();

        // Update filter counts - always use full data
        this.updateRequirementsFilterCounts();
    }

    /**
     * Setup requirements filter buttons
     */
    setupRequirementsFilter() {
        const filterBar = document.getElementById('statusFilterBar');
        if (!filterBar) return;

        filterBar.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.filterRequirementsByStatus(status);
            });
        });
    }

    /**
     * Filter requirements by status
     */
    filterRequirementsByStatus(status) {
        // Store current filter
        this.currentRequirementsFilter = status;

        // Update active button
        document.querySelectorAll('#statusFilterBar .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === status);
        });

        // Get filtered data
        if (window.app && window.app.dataProcessor) {
            const filtered = window.app.dataProcessor.filterRequirements(status);
            this.renderRequirementsTable(filtered);
        }
    }

    /**
     * Update filter counts in buttons
     */
    updateRequirementsFilterCounts() {
        if (!window.app || !window.app.dataProcessor) {
            // Retry after a short delay if app not ready
            setTimeout(() => this.updateRequirementsFilterCounts(), 100);
            return;
        }

        // Ensure data is processed
        const requirements = window.app.dataProcessor.getRequirements();
        if (!requirements || requirements.length === 0) {
            // If no data, set all counts to 0
            this.setElementText('filterCountAll', 0);
            this.setElementText('filterCountActive', 0);
            this.setElementText('filterCountBacklog', 0);
            this.setElementText('filterCountDone', 0);
            this.setElementText('filterCountOverbudget', 0);
            return;
        }

        const counts = window.app.dataProcessor.getRequirementsFilterCounts();

        // Update all counts
        this.setElementText('filterCountAll', counts.all || 0);
        this.setElementText('filterCountActive', counts.active || 0);
        this.setElementText('filterCountBacklog', counts.backlog || 0);
        this.setElementText('filterCountDone', counts.done || 0);
        this.setElementText('filterCountOverbudget', counts.overbudget || 0);
    }

    /**
     * Setup click handlers for requirement rows
     */
    setupRequirementRowClicks() {
        document.querySelectorAll('.requirement-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const index = parseInt(row.dataset.index);
                if (!isNaN(index) && this.requirementsData[index]) {
                    this.showRequirementModal(this.requirementsData[index]);
                }
            });
        });
    }

    /**
     * Setup modal handlers
     */
    setupModal() {
        // Requirement modal
        const requirementModal = document.getElementById('requirementModal');
        const closeRequirementBtn = document.getElementById('closeRequirementModal');

        if (closeRequirementBtn) {
            closeRequirementBtn.addEventListener('click', () => {
                this.hideRequirementModal();
            });
        }

        if (requirementModal) {
            requirementModal.addEventListener('click', (e) => {
                if (e.target === requirementModal) {
                    this.hideRequirementModal();
                }
            });
        }

        // Employee modal
        const employeeModal = document.getElementById('employeeModal');
        const closeEmployeeBtn = document.getElementById('closeEmployeeModal');

        if (closeEmployeeBtn) {
            closeEmployeeBtn.addEventListener('click', () => {
                this.hideEmployeeModal();
            });
        }

        if (employeeModal) {
            employeeModal.addEventListener('click', (e) => {
                if (e.target === employeeModal) {
                    this.hideEmployeeModal();
                }
            });
        }

        // Employee List modal
        const employeeListModal = document.getElementById('employeeListModal');
        const closeEmployeeListBtn = document.getElementById('closeEmployeeListModal');

        if (closeEmployeeListBtn) {
            closeEmployeeListBtn.addEventListener('click', () => {
                this.hideEmployeeListModal();
            });
        }

        if (employeeListModal) {
            employeeListModal.addEventListener('click', (e) => {
                if (e.target === employeeListModal) {
                    this.hideEmployeeListModal();
                }
            });
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (requirementModal && requirementModal.style.display !== 'none') {
                    this.hideRequirementModal();
                }
                if (employeeModal && employeeModal.style.display !== 'none') {
                    this.hideEmployeeModal();
                }
                if (employeeListModal && employeeListModal.style.display !== 'none') {
                    this.hideEmployeeListModal();
                }
            }
        });
    }

    /**
     * Show requirement details modal
     */
    showRequirementModal(requirement) {
        const modal = document.getElementById('requirementModal');
        const modalBody = document.getElementById('requirementModalBody');

        if (!modal || !modalBody) return;

        const remaining = requirement.budget - requirement.actual;
        const utilizationClass = requirement.utilization > 100 ? 'text-danger' :
            requirement.utilization > 90 ? 'text-warning' :
                'text-success';
        const remainingClass = remaining < 0 ? 'text-danger' : '';

        // Get all raw data fields
        const rawData = requirement.raw || {};
        const allFields = Object.keys(rawData);

        const exportButtons = this.modalManager.createExportButtons('exportRequirementExcel', 'exportRequirementPDF', 'exportRequirementHTML');

        modalBody.innerHTML = `
            ${exportButtons}
            <div class="requirement-details" id="requirementDetailsContent">
                <div class="detail-section">
                    <h3>מידע בסיסי</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">מספר דרישה:</span>
                            <span class="detail-value">${this.escapeHtml(requirement.id)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">נושא:</span>
                            <span class="detail-value">${this.escapeHtml(requirement.name)}</span>
                        </div>
                        ${requirement.requester ? `
                        <div class="detail-item">
                            <span class="detail-label">דורש הדרישה:</span>
                            <span class="detail-value">${this.escapeHtml(requirement.requester)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="detail-section">
                    <h3>תקציב וניצול</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">תקציב שנתי:</span>
                            <span class="detail-value">${this.formatCurrency(requirement.budget)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">הוצאה בפועל:</span>
                            <span class="detail-value">${this.formatCurrency(requirement.actual)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">יתרה:</span>
                            <span class="detail-value ${remainingClass}">${this.formatCurrency(remaining)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ניצול תקציב:</span>
                            <span class="detail-value ${utilizationClass}">${this.formatNumber(requirement.utilization)}%</span>
                        </div>
                    </div>
                </div>

                ${allFields.length > 0 ? `
                <div class="detail-section">
                    <h3>פרטים נוספים</h3>
                    <div class="detail-grid">
                        ${allFields.map(key => {
            const value = rawData[key];
            if (value === null || value === undefined || value === '') return '';

            // Skip already displayed fields
            const displayedKeys = ['מספר דרישה', 'נושא', 'דורש הדרישה', 'תקציב שנתי', 'ביצוע כולל בקשות רכש פתוחות'];
            if (displayedKeys.some(k => key.includes(k))) return '';

            let displayValue = value;
            if (typeof value === 'number') {
                // Check if it's a currency value
                if (key.toLowerCase().includes('תקציב') || key.toLowerCase().includes('ביצוע') ||
                    key.toLowerCase().includes('יתרה') || key.toLowerCase().includes('עלות')) {
                    displayValue = this.formatCurrency(value);
                } else if (key.toLowerCase().includes('אחוז') || key.toLowerCase().includes('%')) {
                    displayValue = this.formatNumber(value) + '%';
                } else {
                    displayValue = this.formatNumber(value);
                }
            } else {
                displayValue = this.escapeHtml(String(value));
            }

            return `
                                <div class="detail-item">
                                    <span class="detail-label">${this.escapeHtml(key)}:</span>
                                    <span class="detail-value">${displayValue}</span>
                                </div>
                            `;
        }).filter(Boolean).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Setup export handlers using ModalManager (mostly manual for specific requirements data)
        const requirementData = {
            'מספר דרישה': requirement.id || '',
            'נושא': requirement.name || '',
            'דורש': requirement.requester || '',
            'תקציב שנתי': this.formatCurrency(requirement.budget),
            'הוצאה בפועל': this.formatCurrency(requirement.actual),
            'יתרה': this.formatCurrency(remaining),
            'ניצול תקציב': `${this.formatNumber(requirement.utilization)}%`,
            'סטטוס': requirement.status || ''
        };

        // Standard setup for HTML export - needs an ID for the container to copy
        // Since we want to copy the visual details, we can't easily use table copy. 
        // HTML export for detailed view might be tricky with current implementation that expects a table.
        // BUT user asked for unified logice. 
        // Let's defer HTML export for this specific modal to "Screenshot -> PDF" style or skip HTML copy if not tabular?
        // Actually the user said "anywhere you have export". 
        // The implementation in exporter.js `exportToHTMLClipboard` expects a table ID. 
        // This view is NOT a table. 
        // We will adapt `exportToHTMLClipboard` or creating a hidden table? 
        // Or we can just let PDF handle the visual export. 
        // Let's implement HTML export by creating a temporary table or trying to copy the DIV innerHTML if the tool allows?
        // The `exportToHTMLClipboard` specifically looks for a table and clones it. 
        // Let's update `setupExportHandlers` to handle manual click for HTML or pass a valid ID.

        // Manual override for specific logic
        const excelBtn = document.getElementById('exportRequirementExcel');
        const pdfBtn = document.getElementById('exportRequirementPDF');
        const htmlBtn = document.getElementById('exportRequirementHTML');

        if (excelBtn) {
            excelBtn.onclick = () => {
                if (window.app && window.app.exporter) {
                    window.app.exporter.exportToExcel([requirementData], `requirement-${requirement.id}`, `פרטי דרישה - ${requirement.id}`);
                }
            };
        }

        if (pdfBtn) {
            pdfBtn.onclick = () => {
                if (window.app && window.app.exporter) {
                    // Screenshot export (Print what is on screen)
                    const contentToCapture = modal.querySelector('.requirement-details') || modalBody;
                    window.app.exporter.exportElementToPDF(contentToCapture, `requirement-${requirement.id}`);
                }
            };
        }

        if (htmlBtn) {
            htmlBtn.onclick = () => {
                // Since this isn't a table, we can't use the standard table export. 
                // We'll notify the user or try to copy text. 
                // Actually, let's just copy the details as text/html
                if (window.app && window.app.uiRenderer) {
                    // Fallback/Custom implementation for non-table HTML copy could go here
                    // For now, let's show a toast that it's only for tables or implement a basic text copy
                    // Or better: construct a small HTML table string and put it in clipboard?
                    // Let's try to capture the DIV.
                    const detailsDiv = document.getElementById('requirementDetailsContent');
                    if (detailsDiv && window.app.exporter) {
                        // We can't use exportToHTMLClipboard because it expects a TABLE.
                        // Let's just create a temporary Toast saying it's supported for lists only?
                        // OR we implement a div-to-clipboard.
                        // Given the instruction "copy logic... everywhere", best effort is to copy the visual part.
                        // Let's rely on standard copy or a new exporter method? 
                        // I will stick to PDF/Excel for this non-tabular view for now, effectively hiding or disabling HTML btn if I can't support it?
                        // User requirement: "All tables...". This is a detail view, not a table.
                        // I will add the button but maybe it copies the parsed data as value-key pairs?

                        // Let's make a temporary table for the clipboard
                        const tempTable = document.createElement('table');
                        tempTable.id = 'tempReqTable';
                        tempTable.style.display = 'none';
                        tempTable.innerHTML = `
                            <thead><tr><th>שדה</th><th>ערך</th></tr></thead>
                            <tbody>
                                ${Object.keys(requirementData).map(k => `<tr><td>${k}</td><td>${requirementData[k]}</td></tr>`).join('')}
                            </tbody>
                        `;
                        document.body.appendChild(tempTable);
                        window.app.exporter.exportToHTMLClipboard(tempTable.id).then(() => {
                            document.body.removeChild(tempTable);
                        });
                    }
                }
            };
        }

        modal.style.display = 'flex';
    }

    /**
     * Hide requirement modal
     */
    hideRequirementModal() {
        const modal = document.getElementById('requirementModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show employee details modal
     */
    showEmployeeModal(employeeIdOrName) {
        const modal = document.getElementById('employeeModal');
        const modalBody = document.getElementById('employeeModalBody');

        if (!modal || !modalBody) return;

        if (!window.app || !window.app.dataProcessor) {
            console.warn('Cannot show employee modal: app or dataProcessor not available');
            return;
        }

        const employee = window.app.dataProcessor.getEmployeeDetails(employeeIdOrName);

        if (!employee) {
            console.warn('Employee not found:', employeeIdOrName);
            return;
        }

        // Use pre-calculated percentages
        const investmentPercent = employee.investmentPercent || 0;
        const expensePercent = employee.expensePercent || 0;
        const absencePercent = employee.totalHours > 0
            ? (employee.absenceHours / employee.totalHours) * 100
            : 0;

        const invClass = this.getPercentClass('investment', investmentPercent);
        const expClass = this.getPercentClass('expense', expensePercent);

        const exportButtons = this.modalManager.createExportButtons('exportEmployeeModalExcel', 'exportEmployeeModalPDF', 'exportEmployeeModalHTML');

        modalBody.innerHTML = `
            ${exportButtons}
            <div class="requirement-details" id="employeeDetailsContent">
                <div class="detail-section">
                    <h3>מידע בסיסי</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">שם עובד:</span>
                            <span class="detail-value">${this.escapeHtml(employee.name)}</span>
                        </div>
                        ${employee.id ? `
                        <div class="detail-item">
                            <span class="detail-label">מספר עובד:</span>
                            <span class="detail-value">${this.escapeHtml(employee.id)}</span>
                        </div>
                        ` : ''}
                        ${employee.firstDate ? `
                        <div class="detail-item">
                            <span class="detail-label">תאריך ראשון:</span>
                            <span class="detail-value">${employee.firstDate}</span>
                        </div>
                        ` : ''}
                        ${employee.lastDate ? `
                        <div class="detail-item">
                            <span class="detail-label">תאריך אחרון:</span>
                            <span class="detail-value">${employee.lastDate}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">מספר ימי עבודה:</span>
                            <span class="detail-value">${employee.dayCount || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">מספר רשומות:</span>
                            <span class="detail-value">${employee.totalRecords || 0}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>סיכום שעות</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">סה"כ שעות:</span>
                            <span class="detail-value">${this.formatNumber(employee.totalHours)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">שעות השקעה:</span>
                            <span class="detail-value ${invClass}">${this.formatNumber(employee.investmentHours)} (${this.formatNumber(investmentPercent)}%)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">שעות הוצאה:</span>
                            <span class="detail-value ${expClass}">${this.formatNumber(employee.expenseHours)} (${this.formatNumber(expensePercent)}%)</span>
                        </div>
                        ${employee.absenceHours > 0 ? `
                        <div class="detail-item">
                            <span class="detail-label">שעות היעדרות:</span>
                            <span class="detail-value">${this.formatNumber(employee.absenceHours)} (${this.formatNumber(absencePercent)}%)</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">מספר דרישות:</span>
                            <span class="detail-value">${employee.requirementCount || 0}</span>
                        </div>
                    </div>
                </div>

                ${employee.tasks && employee.tasks.length > 0 ? `
                <div class="detail-section">
                    <h3>משימות (${employee.tasks.length})</h3>
                    <div class="tasks-list">
                        ${employee.tasks.map(task => `
                            <div class="task-item">
                                <div class="task-header">
                                    <span class="task-name">${this.escapeHtml(task.name)}</span>
                                    <span class="task-hours">${this.formatNumber(task.totalHours)} ש'</span>
                                </div>
                                <div class="task-details">
                                    <span class="task-stat">${task.dayCount} ימים</span>
                                    ${task.requirementCount > 0 ? `
                                    <span class="task-stat">${task.requirementCount} דרישות</span>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Setup export handlers using ModalManager
        const employeeData = {
            'שם עובד': employee.name || '',
            'מספר עובד': employee.id || '',
            'סוג עובד': employee.employeeType || employee.type || '',
            'סה"כ שעות': this.formatNumber(employee.totalHours),
            'שעות השקעה': this.formatNumber(employee.investmentHours),
            'אחוז השקעה': `${this.formatNumber(investmentPercent)}%`,
            'שעות הוצאה': this.formatNumber(employee.expenseHours),
            'אחוז הוצאה': `${this.formatNumber(expensePercent)}%`,
            'שעות היעדרות': this.formatNumber(employee.absenceHours),
            'מספר דרישות': employee.requirementCount || 0,
            'ימי עבודה': employee.dayCount || 0,
            'תאריך ראשון': employee.firstDate || '',
            'תאריך אחרון': employee.lastDate || ''
        };

        // Setup export handlers manually to use vertical details export for PDF
        const excelBtn = document.getElementById('exportEmployeeModalExcel');
        const pdfBtn = document.getElementById('exportEmployeeModalPDF');
        const htmlBtn = document.getElementById('exportEmployeeModalHTML');

        if (excelBtn) {
            excelBtn.onclick = () => {
                if (window.app && window.app.exporter) {
                    window.app.exporter.exportEmployeesToExcel([employee], `employee-${employee.id || 'details'}`);
                }
            };
        }

        if (pdfBtn) {
            pdfBtn.onclick = () => {
                if (window.app && window.app.exporter) {
                    // Use vertical layout export
                    window.app.exporter.exportDetailsToPDF(employeeData, `פרטי עובד - ${employee.name || ''}`, `employee-${employee.id || 'details'}`);
                }
            };
        }

        if (htmlBtn) {
            htmlBtn.onclick = () => {
                if (window.app && window.app.exporter) {
                    // Create temp table for basic stats
                    const tempTable = document.createElement('table');
                    tempTable.id = 'tempEmpTable';
                    tempTable.style.display = 'none';
                    tempTable.innerHTML = `
                         <thead><tr><th>שדה</th><th>ערך</th></tr></thead>
                         <tbody>
                            <tr><td>שם</td><td>${employee.name}</td></tr>
                            <tr><td>סה"כ שעות</td><td>${this.formatNumber(employee.totalHours)}</td></tr>
                            <tr><td>% השקעה</td><td>${this.formatNumber(investmentPercent)}%</td></tr>
                             <tr><td>% הוצאה</td><td>${this.formatNumber(expensePercent)}%</td></tr>
                         </tbody>
                    `;
                    document.body.appendChild(tempTable);
                    window.app.exporter.exportToHTMLClipboard(tempTable.id).then(() => {
                        document.body.removeChild(tempTable);
                    });
                }
            };
        }

        modal.style.display = 'flex';
    }

    /**
     * Hide employee modal
     */
    hideEmployeeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show employee list modal (for KPI clicks)
     */
    showEmployeeListModal(employees, title) {
        const modal = document.getElementById('employeeListModal');
        const modalTitle = document.getElementById('employeeListModalTitle');
        const modalBody = document.getElementById('employeeListModalBody');

        if (!modal || !modalBody) return;

        // Set title
        if (modalTitle) {
            modalTitle.textContent = `${title} (${employees.length})`;
        }

        // Build content using ModalManager
        const exportButtons = this.modalManager.createExportButtons('exportEmployeeListExcel', 'exportEmployeeListPDF', 'exportEmployeeListHTML');
        const tableHTML = `
            <div class="table-container">
                <table class="data-table" id="employeeListTable">
                    <thead>
                        <tr>
                            <th>שם עובד</th>
                            <th>מספר עובד</th>
                            <th>סוג עובד</th>
                            <th>סה"כ שעות</th>
                            <th>השקעה %</th>
                            <th>הוצאה %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                            <tr>
                                <td>${this.escapeHtml(emp.name)}</td>
                                <td>${this.escapeHtml(emp.id)}</td>
                                <td>${this.escapeHtml(emp.type || emp.employeeType || '')}</td>
                                <td class="number-cell">${this.formatNumber(emp.totalHours)}</td>
                                <td class="number-cell ${this.getPercentClass('investment', emp.investmentPercent)}">${this.formatNumber(emp.investmentPercent)}%</td>
                                <td class="number-cell ${this.getPercentClass('expense', emp.expensePercent)}">${this.formatNumber(emp.expensePercent)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        modalBody.innerHTML = exportButtons + tableHTML;

        // Setup export handlers using ModalManager
        this.modalManager.setupExportHandlers({
            excelButtonId: 'exportEmployeeListExcel',
            pdfButtonId: 'exportEmployeeListPDF',
            htmlButtonId: 'exportEmployeeListHTML',
            tableId: 'employeeListTable',
            data: employees,
            title: title,
            filename: title.replace(/\s+/g, '-'),
            exporter: window.app && window.app.exporter
        });

        modal.style.display = 'flex';
    }

    /**
     * Hide employee list modal
     */
    hideEmployeeListModal() {
        const modal = document.getElementById('employeeListModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Render employees table
     */
    renderEmployeesTable(data) {
        const tbody = document.getElementById('employeesTableBody');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-message">טען קובץ שעות להצגת נתוני עובדים</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(emp => {
            const investmentPercent = emp.investmentPercent || 0;
            const expensePercent = emp.expensePercent || 0;

            return `
                <tr class="employee-row" data-employee-id="${this.escapeHtml(emp.id || emp.name)}" style="cursor: pointer;">
                    <td style="color: var(--primary-blue-dark); font-weight: var(--font-weight-medium);">${this.escapeHtml(emp.name)}</td>
                    <td class="number-cell">${this.formatNumber(emp.totalHours)}</td>
                    <td class="number-cell ${this.getPercentClass('investment', investmentPercent)}">${this.formatNumber(investmentPercent)}%</td>
                    <td class="number-cell ${this.getPercentClass('expense', expensePercent)}">${this.formatNumber(expensePercent)}%</td>
                    <td class="number-cell">${emp.requirementCount || 0}</td>
                    <td class="number-cell">${emp.dayCount || 0}</td>
                </tr>
            `;
        }).join('');

        // Add click handlers to rows
        this.setupEmployeeTableRowClicks();
    }

    /**
     * Setup click handlers for employee table rows
     */
    setupEmployeeTableRowClicks() {
        document.querySelectorAll('#employeesTable .employee-row').forEach(row => {
            row.addEventListener('click', (e) => {
                const employeeId = row.dataset.employeeId;
                if (employeeId) {
                    this.showEmployeeModal(employeeId);
                }
            });
        });
    }

    /**
     * Get status label
     */
    getStatusLabel(status) {
        switch (status) {
            case STATUS.SUCCESS: return 'תקין';
            case STATUS.WARNING: return 'אזהרה';
            case STATUS.DANGER: return 'חריגה';
            default: return status;
        }
    }

    /**
     * Format number with thousands separator
     */
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return new Intl.NumberFormat('he-IL', {
            maximumFractionDigits: 1
        }).format(num);
    }

    /**
     * Format currency
     */
    formatCurrency(num) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            maximumFractionDigits: 0
        }).format(num);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Set element text safely
     */
    setElementText(id, text) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
        } else {
            console.warn(`Element with id "${id}" not found`);
        }
    }

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Render tasks cards grid
     */
    renderTasksCards(tasks) {
        const container = document.getElementById('tasksCardsContainer');
        if (!container) return;

        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<div class="empty-message" style="padding: 60px;"><div>אין משימות להצגה</div></div>';
            return;
        }

        container.innerHTML = tasks.map((task, index) => {
            const typeClass = task.type === 'השקעה' ? 'investment' : 'expense';
            return `
        <div class="task-card ${typeClass}" data-task-index="${index}">
            <div class="task-card-header">
                <div class="task-card-title" title="${this.escapeHtml(task.name)}">${this.escapeHtml(task.name)}</div>
            </div>
            
            <div class="task-card-hours">${this.formatNumber(task.totalHours)}</div>
            
            <div class="task-card-meta">
                <div class="task-card-employees">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>${task.employees.length}</span>
                </div>
                <span class="task-card-type ${typeClass}">
                    ${task.type || 'אחר'}
                </span>
            </div>
        </div>
    `}).join('');

        // Add click event listeners to all task cards
        container.querySelectorAll('.task-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                const task = tasks[index];
                if (task && window.app) {
                    window.app.showTaskModal(task);
                }
            });
        });
    }

    /**
     * Show task modal with employee details
     * @param {string|Object} taskOrName - Task name or task object
     */
    showTaskModal(taskOrName) {
        let task;
        if (typeof taskOrName === 'string') {
            task = window.app.dataProcessor.getTaskByName(taskOrName);
        } else {
            task = taskOrName;
        }

        if (!task) {
            console.error('Task not found:', taskOrName);
            return;
        }

        // Prepare table data
        const headers = ['עובד', 'שעות'];
        const rows = task.employees.map(emp => [
            emp.name,
            this.formatNumber(emp.hours)
        ]);

        // Create table
        const tableHTML = this.modalManager.createTable(headers, rows, 'taskEmployeesTable');

        // Create export buttons (Standard with HTML)
        const exportButtons = this.modalManager.createExportButtons('exportTaskExcel', 'exportTaskPDF', 'exportTaskHTML');

        // Update modal title with full path
        const modalTitle = document.getElementById('taskModalTitle');
        if (modalTitle) {
            modalTitle.textContent = task.fullPath || task.name;
        }

        // Combine content
        const content = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; gap: 20px; align-items: center; font-size: 14px; color: var(--fibi-gray-600); padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span>סה"כ שעות: <strong style="color: var(--fibi-blue-primary);">${this.formatNumber(task.totalHours)}</strong></span>
                    <span>מספר עובדים: <strong style="color: var(--fibi-blue-primary);">${task.employees.length}</strong></span>
                    <span class="task-card-type ${task.type === 'השקעה' ? 'investment' : 'expense'}" style="font-size: 14px;">${task.type}</span>
                </div>
            </div>
            ${exportButtons}
            ${tableHTML}
        `;

        // Show modal
        this.modalManager.showModal('taskModal', content);

        // Define columns for generic PDF export
        const pdfColumns = [
            { header: 'עובד', dataKey: 'name' },
            { header: 'שעות', dataKey: 'hours' }
        ];

        // Format data for generic export
        const exportData = task.employees.map(emp => ({
            name: emp.name,
            hours: emp.hours // Exporter handles number formatting if needed, or we can pre-format
        }));

        // Setup export handlers using standard manager
        this.modalManager.setupExportHandlers({
            excelButtonId: 'exportTaskExcel',
            pdfButtonId: 'exportTaskPDF',
            htmlButtonId: 'exportTaskHTML',
            tableId: 'taskEmployeesTable',
            data: exportData,
            columns: pdfColumns,
            title: `פירוט משימה: ${task.name}`,
            filename: `task-${task.name.replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}`,
            exporter: window.app && window.app.exporter
        });

        // Setup close handler for X button
        document.getElementById('closeTaskModal').onclick = () => {
            this.modalManager.hideModal('taskModal');
        };
    }

    /**
     * Format Excel date
     */
    formatSheetDate(dateValue) {
        if (!dateValue) return '';
        if (typeof dateValue === 'number' && dateValue > 100) {
            // Excel serial date
            const date = new Date((dateValue - 25569) * 86400 * 1000);
            return date.toLocaleDateString('he-IL');
        }
        if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) return date.toLocaleDateString('he-IL');
        }
        return dateValue;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

