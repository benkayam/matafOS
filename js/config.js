/**
 * ============================================
 * Dashboard Configuration
 * ============================================
 * All constants and settings in one place
 */

export const CONFIG = {
    // Business Constants
    MONTHLY_RATE: 50000,              // ₪ per month per employee
    WORKING_DAYS_PER_MONTH: 20,       // Working days
    EXPECTED_DAILY_HOURS: 8,          // Expected hours per day
    
    // Thresholds
    BUDGET_WARNING_THRESHOLD: 90,     // % - yellow warning
    BUDGET_OVERRUN_THRESHOLD: 100,    // % - red danger
    MIN_INVESTMENT_PERCENT: 60,       // Minimum investment %
    
    // Hours Exceptions
    MAX_DAILY_HOURS: 10,              // Flag if more
    MIN_DAILY_HOURS: 6,               // Flag if less
    
    // UI Settings
    TABLE_PAGE_SIZE: 100,             // Rows per page
    SEARCH_DEBOUNCE_MS: 300,          // Search delay
    MAX_MATRIX_TASKS: 20,             // Max tasks in heatmap
    
    // Excluded Employees (by ID)
    EXCLUDED_EMPLOYEE_IDS: ['158429'],
    
    // File Types
    ACCEPTED_FILE_TYPES: ['.xlsx', '.xls', '.csv'],
    
    // Column Mappings - Snow (Hours) - מותאם לקובץ שעות Snow
    HOURS_COLUMNS: {
        EMPLOYEE_NAME: ['שם משפחה + פרטי', 'שם', 'Employee', 'עובד'],
        EMPLOYEE_ID: ['מספר עובד', 'מספר_עובד', 'EmployeeId'],
        EMPLOYEE_TYPE: ['סוג  עובד'],
        DATE: ['תאריך דיווח', 'תאריך', 'Date'],
        HOURS: ['סה"כ שעות מדווחות', 'שעות', 'Hours'],
        TASK: ['משימה', 'פעילות', 'Task'],
        SUBTASK: ['פעילות משנה', 'SubTask', 'Sub Task'],
        CLASSIFICATION: ['פעילות.סיווג חשבונאי', 'סיווג', 'Classification']
    },
    
    // Column Mappings - Atlas (Requirements)
    REQUIREMENTS_COLUMNS: {
        ID: ['מספר', 'מספר דרישה', 'ID', 'Requirement ID'],
        NAME: ['נושא', 'שם', 'שם דרישה', 'Name', 'Subject'],
        BUDGET: ['תקציב שנתי', 'תקציב', 'Budget', 'Allocated'],
        ACTUAL: ['ביצוע כולל בקשות רכש פתוחות', 'בפועל', 'עלות בפועל', 'Actual', 'Cost'],
        REQUESTER: ['דורש הדרישה', 'דורש', 'Requester'],
        STATUS: ['סטטוס', 'Status']
    },
    
    // Work Types (for classification)
    WORK_TYPES: {
        INVESTMENT: ['השקעה', 'השקעות', 'פיתוח', 'Investment', 'Investments', 'Development'],
        EXPENSE: ['הוצאה', 'הוצאות', 'תחזוקה', 'Expense', 'Expenses', 'Maintenance'],
        ABSENCE: ['היעדרות', 'העדרויות', 'חופש', 'מחלה', 'Absence', 'Absences', 'Leave', 'Sick']
    }
};

// Status helpers
export const STATUS = {
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger'
};

// Get utilization status
export function getUtilizationStatus(percent) {
    if (percent > CONFIG.BUDGET_OVERRUN_THRESHOLD) return STATUS.DANGER;
    if (percent > CONFIG.BUDGET_WARNING_THRESHOLD) return STATUS.WARNING;
    return STATUS.SUCCESS;
}

