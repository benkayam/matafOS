/**
 * ============================================
 * Data Processor Module
 * ============================================
 * Processes and analyzes hours and requirements data
 */

import { CONFIG, getUtilizationStatus } from '../config.js';

export class DataProcessor {
    constructor() {
        this.hoursData = [];
        this.requirementsData = [];
        this.processedHours = [];
        this.processedRequirements = [];
        this.employeeSummary = {};
        this.teamFilter = null;
    }

    /**
     * Set team filter instance
     */
    setTeamFilter(teamFilter) {
        this.teamFilter = teamFilter;
    }

    /**
     * Update data and reprocess
     */
    updateData(type, data) {
        if (type === 'hours') {
            this.hoursData = data;
            this.processHours();
        } else if (type === 'requirements') {
            this.requirementsData = data;
            this.processRequirements();
        }
        
        return this.getStats();
    }

    /**
     * Process hours data
     */
    processHours() {
        // Debug: log first row to see columns
        if (this.hoursData.length > 0) {
            console.log('📋 Hours columns:', Object.keys(this.hoursData[0]));
        }

        this.processedHours = this.hoursData.map(row => {
            const employeeId = String(this.findColumn(row, CONFIG.HOURS_COLUMNS.EMPLOYEE_ID) || '');
            const classificationValue = this.findColumn(row, CONFIG.HOURS_COLUMNS.CLASSIFICATION) || '';
            const workType = this.classifyWorkType(classificationValue);
            
            // Read employee type directly from Excel (with trim!)
            const employeeTypeRaw = this.findColumn(row, CONFIG.HOURS_COLUMNS.EMPLOYEE_TYPE) || '';
            const employeeType = this.normalizeEmployeeType(employeeTypeRaw);
            
            return {
                employee: this.findColumn(row, CONFIG.HOURS_COLUMNS.EMPLOYEE_NAME) || '',
                employeeId: employeeId,
                employeeType: employeeType, // Direct from Excel: "עובד מתף" or "עובד פרויקטלי"
                date: this.formatDate(this.findColumn(row, CONFIG.HOURS_COLUMNS.DATE)),
                hours: parseFloat(this.findColumn(row, CONFIG.HOURS_COLUMNS.HOURS)) || 0,
                task: this.findColumn(row, CONFIG.HOURS_COLUMNS.TASK) || '',
                subtask: this.findColumn(row, CONFIG.HOURS_COLUMNS.SUBTASK) || '',
                classification: classificationValue,
                type: workType,
                requirement: this.extractRequirement(this.findColumn(row, CONFIG.HOURS_COLUMNS.TASK)),
                raw: row
            };
        }).filter(row => row.employee && row.hours > 0);

        // Filter excluded employees
        this.processedHours = this.processedHours.filter(row => 
            !CONFIG.EXCLUDED_EMPLOYEE_IDS.includes(row.employeeId)
        );

        // Debug: show sample with types
        const sample = this.processedHours.slice(0, 3).map(h => ({
            employee: h.employee,
            employeeType: h.employeeType,
            employeeTypeLength: h.employeeType ? h.employeeType.length : 0,
            hours: h.hours,
            classification: h.classification,
            type: h.type
        }));
        console.log('✅ Sample processed hours:', sample);
        console.log('📋 Available columns:', this.hoursData.length > 0 ? Object.keys(this.hoursData[0]) : 'No data');

        // Build employee summary
        this.buildEmployeeSummary();
    }

    /**
     * Process requirements data
     */
    processRequirements() {
        // Debug: log first row to see structure
        if (this.requirementsData.length > 0) {
            console.log('📋 Requirements columns:', Object.keys(this.requirementsData[0]));
            console.log('📋 First requirement row:', this.requirementsData[0]);
        }

        this.processedRequirements = this.requirementsData.map(row => {
            const budgetRaw = this.findColumn(row, CONFIG.REQUIREMENTS_COLUMNS.BUDGET);
            const actualRaw = this.findColumn(row, CONFIG.REQUIREMENTS_COLUMNS.ACTUAL);
            
            // Clean and parse numbers (remove commas, spaces, etc.)
            const budget = this.parseNumber(budgetRaw) || 0;
            const actual = this.parseNumber(actualRaw) || 0;
            const utilization = budget > 0 ? (actual / budget) * 100 : 0;

            // Get status from file (Active, Backlog, Done, etc.)
            const fileStatus = String(this.findColumn(row, CONFIG.REQUIREMENTS_COLUMNS.STATUS) || '').trim();

            return {
                id: String(this.findColumn(row, CONFIG.REQUIREMENTS_COLUMNS.ID) || ''),
                name: String(this.findColumn(row, CONFIG.REQUIREMENTS_COLUMNS.NAME) || ''),
                budget: budget,
                actual: actual,
                utilization: utilization,
                status: fileStatus || getUtilizationStatus(utilization), // Use file status if available
                utilizationStatus: getUtilizationStatus(utilization), // Keep utilization status separate
                requester: String(this.findColumn(row, CONFIG.REQUIREMENTS_COLUMNS.REQUESTER) || ''),
                raw: row
            };
        }).filter(row => row.id || row.name);

        console.log('✅ Processed requirements:', this.processedRequirements.length);
        if (this.processedRequirements.length > 0) {
            console.log('📊 Sample processed row:', this.processedRequirements[0]);
        }

        // Link hours to requirements
        this.linkHoursToRequirements();
    }

    /**
     * Find column value by possible names
     */
    findColumn(row, possibleNames) {
        // Exact match with trim
        for (const name of possibleNames) {
            const trimmedName = String(name).trim();
            const exactKey = Object.keys(row).find(k => String(k).trim() === trimmedName);
            if (exactKey !== undefined) return row[exactKey];
        }
        
        // Case-insensitive match with trim
        const keys = Object.keys(row);
        for (const name of possibleNames) {
            const trimmedName = String(name).trim().toLowerCase();
            const found = keys.find(k => String(k).trim().toLowerCase().includes(trimmedName));
            if (found) return row[found];
        }
        
        return null;
    }

    /**
     * Parse number from string (remove commas, spaces, etc.)
     */
    parseNumber(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        
        // Convert to string and clean
        let str = String(value).trim();
        // Remove commas, spaces, and other non-numeric chars except decimal point and minus
        str = str.replace(/[^\d.-]/g, '');
        
        const num = parseFloat(str);
        return isNaN(num) ? null : num;
    }

    /**
     * Format date to DD/MM/YYYY
     */
    formatDate(dateValue) {
        if (!dateValue) return '';
        
        // Excel serial date
        if (typeof dateValue === 'number') {
            const date = new Date((dateValue - 25569) * 86400 * 1000);
            return date.toLocaleDateString('he-IL');
        }
        
        // String date
        if (typeof dateValue === 'string') {
            // Try parsing various formats
            const date = new Date(dateValue);
            if (!isNaN(date)) {
                return date.toLocaleDateString('he-IL');
            }
            return dateValue;
        }
        
        return String(dateValue);
    }

    /**
     * Classify work type (investment/expense/absence)
     */
    classifyWorkType(typeValue) {
        if (!typeValue) return 'אחר';
        
        const type = String(typeValue).toLowerCase();
        
        // Check investment
        for (const inv of CONFIG.WORK_TYPES.INVESTMENT) {
            if (type.includes(inv.toLowerCase())) {
                return 'השקעה';
            }
        }
        
        // Check expense
        for (const exp of CONFIG.WORK_TYPES.EXPENSE) {
            if (type.includes(exp.toLowerCase())) {
                return 'הוצאה';
            }
        }
        
        // Check absence
        for (const abs of CONFIG.WORK_TYPES.ABSENCE) {
            if (type.includes(abs.toLowerCase())) {
                return 'היעדרות';
            }
        }
        
        return 'אחר';
    }

    /**
     * Extract requirement number from task description
     * Pattern: "123456 - Task Name"
     */
    extractRequirement(task) {
        if (!task) return '';
        const match = String(task).match(/^(\d{4,6})\s*-/);
        return match ? match[1] : '';
    }

    /**
     * Build employee summary from hours
     */
    buildEmployeeSummary() {
        this.employeeSummary = {};
        
        this.processedHours.forEach(row => {
            const key = row.employeeId || row.employee;
            
            if (!this.employeeSummary[key]) {
                this.employeeSummary[key] = {
                    name: row.employee,
                    id: row.employeeId,
                    employeeType: row.employeeType, // Direct from Excel (already normalized)
                    type: row.employeeType,
                    totalHours: 0,
                    investmentHours: 0,
                    expenseHours: 0,
                    absenceHours: 0,
                    requirements: new Set(),
                    days: new Set(),
                    tasks: new Set()
                };
            }
            
            const emp = this.employeeSummary[key];
            emp.totalHours += row.hours;
            
            // Use the already classified type from processedHours
            if (row.type === 'השקעה') {
                emp.investmentHours += row.hours;
            } else if (row.type === 'הוצאה') {
                emp.expenseHours += row.hours;
            } else if (row.type === 'היעדרות') {
                emp.absenceHours += row.hours;
            }
            
            if (row.requirement) emp.requirements.add(row.requirement);
            if (row.date) emp.days.add(row.date);
            if (row.task) emp.tasks.add(row.task);
        });

        // Calculate percentages and normalize employee type
        Object.values(this.employeeSummary).forEach(emp => {
            emp.investmentPercent = emp.totalHours > 0 
                ? (emp.investmentHours / emp.totalHours) * 100 
                : 0;
            emp.expensePercent = emp.totalHours > 0 
                ? (emp.expenseHours / emp.totalHours) * 100 
                : 0;
            emp.requirementCount = emp.requirements.size;
            emp.dayCount = emp.days.size;
            emp.taskCount = emp.tasks.size;
            
            // Normalize employee type from Excel (remove "עובד" prefix if exists)
            // "עובד מתף" → "מתף", "עובד פרויקטלי" → "פרויקטלי"
            if (emp.employeeType && emp.employeeType.trim() !== '') {
                let normalized = emp.employeeType.trim();
                
                // Remove "עובד" prefix if exists
                normalized = normalized.replace(/^עובד\s+/i, '').trim();
                
                // Handle common variations
                if (normalized.includes('מתף') || normalized.includes('MATAF')) {
                    emp.type = 'מתף';
                } else if (normalized.includes('פרויקט') || normalized.includes('PROJECT')) {
                    emp.type = 'פרויקטלי';
                } else {
                    emp.type = normalized;
                }
            } else {
                emp.type = 'לא מוגדר';
            }
        });

        // Debug: show sample employees with their breakdown
        const sampleEmployees = Object.values(this.employeeSummary).slice(0, 2).map(emp => ({
            name: emp.name,
            employeeTypeRaw: emp.employeeType,
            type: emp.type,
            totalHours: emp.totalHours,
            investmentHours: emp.investmentHours,
            expenseHours: emp.expenseHours,
            investmentPercent: emp.investmentPercent.toFixed(1) + '%',
            expensePercent: emp.expensePercent.toFixed(1) + '%'
        }));
        console.log('✅ Employee summary:', sampleEmployees);

        // Build task matrix
        this.buildTaskMatrix();
    }

    /**
     * Build task matrix data for heatmap
     */
    buildTaskMatrix() {
        const taskData = {};
        
        this.processedHours.forEach(row => {
            const task = row.task;
            if (!task) return;
            
            if (!taskData[task]) {
                taskData[task] = {
                    employees: new Set(),
                    totalHours: 0,
                    type: row.type || 'אחר' // Use already classified type
                };
            }
            
            taskData[task].employees.add(row.employee);
            taskData[task].totalHours += row.hours;
            
            // Update type if we have a better classification
            if (row.type && row.type !== 'אחר') {
                taskData[task].type = row.type;
            }
        });
        
        // Sort by employee count descending
        const sortedTasks = Object.entries(taskData)
            .sort((a, b) => b[1].employees.size - a[1].employees.size)
            .slice(0, CONFIG.MAX_MATRIX_TASKS || 20);
        
        this.taskMatrix = sortedTasks.map(([name, data]) => ({
            name,
            employeeCount: data.employees.size,
            totalHours: data.totalHours,
            type: data.type,
            employees: Array.from(data.employees)
        }));
        
        // Calculate KPIs
        this.taskKPIs = {
            total: Object.keys(taskData).length,
            overloaded: Object.values(taskData).filter(t => t.employees.size >= 4).length,
            investment: Object.values(taskData).filter(t => t.type === 'השקעה').length,
            expense: Object.values(taskData).filter(t => t.type === 'הוצאה').length
        };
        
        return this.taskMatrix;
    }

    /**
     * Normalize employee type to two allowed values only
     */
    normalizeEmployeeType(typeValue) {
        // Collapse multiple spaces and trim
        const val = String(typeValue || '').replace(/\s+/g, ' ').trim();
        const lower = val.toLowerCase();

        if (lower.includes('מתף') || lower.includes('mataf')) return 'עובד מתף';
        if (lower.includes('פרויקט') || lower.includes('project')) return 'עובד פרויקטלי';

        // Default fallback
        return 'עובד מתף';
    }

    /**
     * Get task matrix
     */
    getTaskMatrix() {
        return this.taskMatrix || [];
    }

    /**
     * Get task KPIs
     */
    getTaskKPIs() {
        return this.taskKPIs || { total: 0, overloaded: 0, investment: 0, expense: 0 };
    }

    /**
     * Get hours totals (investment/expense/total)
     */
    getHoursTotals() {
        const totals = {
            totalHours: 0,
            investmentHours: 0,
            expenseHours: 0
        };

        // Get filtered hours data (respects team filter)
        const hoursData = this.getHours();
        
        hoursData.forEach(row => {
            totals.totalHours += row.hours;
            if (row.type === 'השקעה') totals.investmentHours += row.hours;
            if (row.type === 'הוצאה') totals.expenseHours += row.hours;
        });

        return totals;
    }

    /**
     * Link hours data to requirements
     */
    linkHoursToRequirements() {
        // Calculate actual hours per requirement
        const hoursPerReq = {};
        
        this.processedHours.forEach(row => {
            if (row.requirement) {
                hoursPerReq[row.requirement] = (hoursPerReq[row.requirement] || 0) + row.hours;
            }
        });

        // Update requirements with actual hours
        this.processedRequirements.forEach(req => {
            const hours = hoursPerReq[req.id] || 0;
            req.actualHours = hours;
            req.actualCost = hours * (CONFIG.MONTHLY_RATE / (CONFIG.WORKING_DAYS_PER_MONTH * CONFIG.EXPECTED_DAILY_HOURS));
        });
    }

    /**
     * Get statistics for KPIs
     */
    getStats() {
        // Get filtered data (respects team filter)
        const employeesArray = this.getEmployeesArray();
        const hoursData = this.getHours();
        
        const employees = employeesArray.length;
        const totalHours = hoursData.reduce((sum, row) => sum + row.hours, 0);
        const requirements = this.processedRequirements.length;
        const overBudget = this.processedRequirements.filter(req => 
            req.utilization > CONFIG.BUDGET_OVERRUN_THRESHOLD
        ).length;

        return {
            employees,
            totalHours,
            requirements,
            overBudget
        };
    }

    /**
     * Get processed hours data
     */
    getHours() {
        let hours = this.processedHours;
        
        // Apply team filter if available
        if (this.teamFilter) {
            hours = this.teamFilter.filterHoursData(hours);
        }
        
        return hours;
    }

    /**
     * Get processed requirements data
     */
    getRequirements() {
        return this.processedRequirements;
    }

    /**
     * Get employee summary
     */
    getEmployees() {
        return this.employeeSummary;
    }

    /**
     * Get employee details by ID or name
     */
    getEmployeeDetails(employeeIdOrName) {
        if (!this.employeeSummary) return null;
        
        // Try to find by ID first, then by name
        let employee = this.employeeSummary[employeeIdOrName];
        
        if (!employee) {
            // Try to find by name
            employee = Object.values(this.employeeSummary).find(emp => 
                emp.name === employeeIdOrName || emp.id === employeeIdOrName
            );
        }
        
        if (!employee) return null;

        // Get all hours records for this employee
        const employeeHours = this.processedHours.filter(h => 
            (h.employeeId && h.employeeId === employee.id) || 
            (h.employee === employee.name)
        );

        // Group by task
        const tasks = {};
        employeeHours.forEach(h => {
            if (!tasks[h.task]) {
                tasks[h.task] = {
                    name: h.task,
                    totalHours: 0,
                    dates: new Set(),
                    requirements: new Set()
                };
            }
            tasks[h.task].totalHours += h.hours;
            if (h.date) tasks[h.task].dates.add(h.date);
            if (h.requirement) tasks[h.task].requirements.add(h.requirement);
        });

        // Convert sets to arrays and calculate stats
        const tasksArray = Object.values(tasks).map(task => ({
            name: task.name,
            totalHours: task.totalHours,
            dayCount: task.dates.size,
            requirementCount: task.requirements.size,
            requirements: Array.from(task.requirements)
        }));

        return {
            ...employee,
            tasks: tasksArray.sort((a, b) => b.totalHours - a.totalHours),
            totalRecords: employeeHours.length,
            firstDate: employeeHours.length > 0 ? 
                employeeHours.reduce((min, h) => !min || h.date < min ? h.date : min, null) : null,
            lastDate: employeeHours.length > 0 ? 
                employeeHours.reduce((max, h) => !max || h.date > max ? h.date : null, null) : null
        };
    }

    /**
     * Search in data
     */
    searchHours(query) {
        if (!query) return this.processedHours;
        
        const q = query.toLowerCase();
        return this.processedHours.filter(row => 
            row.employee.toLowerCase().includes(q) ||
            row.task.toLowerCase().includes(q) ||
            row.requirement.includes(q)
        );
    }

    /**
     * Search requirements
     */
    searchRequirements(query) {
        if (!query) return this.processedRequirements;
        
        const q = query.toLowerCase();
        return this.processedRequirements.filter(row => 
            row.id.toLowerCase().includes(q) ||
            row.name.toLowerCase().includes(q)
        );
    }

    /**
     * Filter requirements by status
     */
    filterRequirements(status) {
        if (status === 'all') {
            return this.processedRequirements;
        }
        
        if (status === 'overbudget') {
            return this.processedRequirements.filter(req => req.utilization > CONFIG.BUDGET_OVERRUN_THRESHOLD);
        }
        
        // Filter by status from file (Active, Backlog, Done, etc.)
        return this.processedRequirements.filter(req => 
            req.status && req.status.toLowerCase() === status.toLowerCase()
        );
    }

    /**
     * Get requirements filter counts
     */
    getRequirementsFilterCounts() {
        const all = this.processedRequirements.length;
        const active = this.processedRequirements.filter(req => 
            req.status && req.status.toLowerCase() === 'active'
        ).length;
        const backlog = this.processedRequirements.filter(req => 
            req.status && req.status.toLowerCase() === 'backlog'
        ).length;
        const done = this.processedRequirements.filter(req => 
            req.status && req.status.toLowerCase() === 'done'
        ).length;
        const overbudget = this.processedRequirements.filter(req => 
            req.utilization > CONFIG.BUDGET_OVERRUN_THRESHOLD
        ).length;

        return { all, active, backlog, done, overbudget };
    }

    /**
     * Get employees as array sorted by total hours
     */
    getEmployeesArray() {
        let employees = Object.values(this.employeeSummary)
            .sort((a, b) => b.totalHours - a.totalHours);
        
        // Apply team filter if available
        if (this.teamFilter) {
            employees = this.teamFilter.filterEmployees(employees);
        }
        
        return employees;
    }

    /**
     * Employees with low investment percent
     */
    getLowInvestmentEmployees(threshold = 65) {
        return this.getEmployeesArray()
            .filter(emp => (emp.investmentPercent || 0) < threshold);
    }

    /**
     * Get tasks grouped by task name with employee details
     */
    getTasksGrouped() {
        const hours = this.getHours(); // Already filtered by team
        const tasksMap = new Map();

        hours.forEach(record => {
            const taskName = record.task || 'ללא משימה';
            
            if (!tasksMap.has(taskName)) {
                tasksMap.set(taskName, {
                    name: taskName,
                    totalHours: 0,
                    employees: [],
                    type: record.type || 'השקעה',
                    employeeIds: new Set()
                });
            }

            const task = tasksMap.get(taskName);
            task.totalHours += record.hours || 0;

            // Add employee if not already added
            if (!task.employeeIds.has(record.employeeId)) {
                task.employeeIds.add(record.employeeId);
                task.employees.push({
                    id: record.employeeId,
                    name: record.employee,
                    hours: record.hours || 0
                });
            } else {
                // Update existing employee hours
                const emp = task.employees.find(e => e.id === record.employeeId);
                if (emp) {
                    emp.hours += record.hours || 0;
                }
            }
        });

        // Convert to array and sort by total hours
        const tasksArray = Array.from(tasksMap.values()).map(task => {
            // Sort employees by hours
            task.employees.sort((a, b) => b.hours - a.hours);
            delete task.employeeIds; // Remove the Set, not needed in output
            return task;
        });

        return tasksArray.sort((a, b) => b.totalHours - a.totalHours);
    }

    /**
     * Get task details by name
     */
    getTaskByName(taskName) {
        const tasks = this.getTasksGrouped();
        return tasks.find(t => t.name === taskName);
    }

    /**
     * Get employees by type (מתף/פרויקטלי)
     */
    getEmployeesByType(type) {
        return this.getEmployeesArray()
            .filter(emp => emp.type === type);
    }

    /**
     * Get employee KPIs
     */
    getEmployeeKPIs() {
        const employees = this.getEmployeesArray();
        const matafEmployees = employees.filter(emp => emp.type === 'מתף');
        const projectEmployees = employees.filter(emp => emp.type === 'פרויקטלי');
        const lowInvestmentEmployees = employees.filter(emp => (emp.investmentPercent || 0) < 65);

        return {
            total: employees.length,
            mataf: matafEmployees.length,
            project: projectEmployees.length,
            lowInvestment: lowInvestmentEmployees.length,
            allEmployees: employees,
            matafEmployees: matafEmployees,
            projectEmployees: projectEmployees,
            lowInvestmentEmployees
        };
    }

    /**
     * Get employees by type
     */
    getEmployeesByType(type) {
        if (type === 'all') return this.getEmployeesArray();
        return this.getEmployeesArray().filter(emp => emp.type === type);
    }

    /**
     * Search employees
     */
    searchEmployees(query) {
        if (!query) return this.getEmployeesArray();
        
        const q = query.toLowerCase();
        return this.getEmployeesArray().filter(emp => 
            emp.name.toLowerCase().includes(q) ||
            (emp.id && emp.id.toLowerCase().includes(q))
        );
    }
}

