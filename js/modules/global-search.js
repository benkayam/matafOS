/**
 * ============================================
 * Global Search Module
 * ============================================
 * Handles global search across employees and requirements
 */

export class GlobalSearch {
    constructor(dataProcessor, uiRenderer) {
        this.dataProcessor = dataProcessor;
        this.uiRenderer = uiRenderer;
        this.searchInput = null;
        this.autocompleteContainer = null;
        this.resultsContainer = null;
        this.clearBtn = null;
        this.debounceTimer = null;
    }

    /**
     * Initialize search functionality
     */
    init() {
        this.searchInput = document.getElementById('globalSearchInput');
        this.autocompleteContainer = document.getElementById('searchAutocomplete');
        this.resultsContainer = document.getElementById('searchResults');
        this.clearBtn = document.getElementById('clearSearch');

        if (!this.searchInput) return;

        // Setup event listeners
        this.searchInput.addEventListener('input', (e) => this.handleInput(e));
        this.searchInput.addEventListener('focus', () => this.handleFocus());
        this.searchInput.addEventListener('blur', () => this.handleBlur());
        
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearSearch());
        }

        // Close autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.global-search-container')) {
                this.hideAutocomplete();
            }
        });
    }

    /**
     * Handle input with debounce
     */
    handleInput(e) {
        const query = e.target.value.trim();

        // Show/hide clear button
        if (this.clearBtn) {
            this.clearBtn.style.display = query ? 'flex' : 'none';
        }

        // Debounce search
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (query.length >= 2) {
                this.performSearch(query);
            } else {
                this.hideAutocomplete();
                this.hideResults();
            }
        }, 300);
    }

    /**
     * Handle focus
     */
    handleFocus() {
        const query = this.searchInput.value.trim();
        if (query.length >= 2) {
            this.showAutocomplete();
        }
    }

    /**
     * Handle blur (with delay to allow clicking autocomplete items)
     */
    handleBlur() {
        setTimeout(() => {
            if (!document.activeElement.closest('.search-autocomplete')) {
                // Don't hide if we're interacting with autocomplete
            }
        }, 200);
    }

    /**
     * Perform search
     */
    performSearch(query) {
        if (!this.dataProcessor) return;

        const results = this.searchGlobal(query);
        
        // Show autocomplete suggestions
        this.showAutocomplete();
        this.renderAutocomplete(results.slice(0, 5)); // Top 5 suggestions
        
        // Show full results
        this.renderResults(results);
    }

    /**
     * Search across all data
     */
    searchGlobal(query) {
        const results = [];
        const queryLower = query.toLowerCase();

        // Search employees
        const employees = this.dataProcessor.getEmployeesArray();
        employees.forEach(emp => {
            const searchText = `${emp.name} ${emp.id} ${emp.type || ''}`.toLowerCase();
            if (searchText.includes(queryLower)) {
                results.push({
                    type: 'employee',
                    data: emp,
                    name: emp.name,
                    id: emp.id,
                    meta: `${emp.type || ''} | ${emp.totalHours || 0} שעות`
                });
            }
        });

        // Search requirements
        const requirements = this.dataProcessor.getRequirements();
        requirements.forEach(req => {
            const searchText = `${req.id} ${req.name} ${req.requester || ''}`.toLowerCase();
            if (searchText.includes(queryLower)) {
                results.push({
                    type: 'requirement',
                    data: req,
                    name: req.name,
                    id: req.id,
                    meta: `${req.requester || ''} | ${req.budget || 0} ₪`
                });
            }
        });

        // Search in hours data (tasks/subtasks)
        const hoursData = this.dataProcessor.hoursData || [];
        const uniqueTasks = new Set();
        hoursData.forEach(row => {
            const task = row.task || row['משימה'];
            const subtask = row.subtask || row['תת משימה'];
            const taskText = `${task} ${subtask}`.toLowerCase();
            
            if (taskText.includes(queryLower) && task) {
                const key = `${task}|${subtask}`;
                if (!uniqueTasks.has(key)) {
                    uniqueTasks.add(key);
                    results.push({
                        type: 'task',
                        data: { task, subtask, employee: row.employee },
                        name: task,
                        id: subtask || '',
                        meta: `${row.employee || ''}`
                    });
                }
            }
        });

        return results;
    }

    /**
     * Render autocomplete suggestions
     */
    renderAutocomplete(results) {
        if (!this.autocompleteContainer) return;

        if (results.length === 0) {
            this.hideAutocomplete();
            return;
        }

        this.autocompleteContainer.innerHTML = results.map(result => `
            <div class="autocomplete-item" data-type="${result.type}" data-id="${this.escapeHtml(result.id || result.name)}">
                <span class="autocomplete-item-type ${result.type}">${this.getTypeLabel(result.type)}</span>
                <span class="autocomplete-item-name">${this.escapeHtml(result.name)}</span>
                <span class="autocomplete-item-meta">${this.escapeHtml(result.meta)}</span>
            </div>
        `).join('');

        // Add click handlers
        this.autocompleteContainer.querySelectorAll('.autocomplete-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectResult(results[index]);
            });
        });
    }

    /**
     * Render full results table
     */
    renderResults(results) {
        if (!this.resultsContainer) return;

        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <p>לא נמצאו תוצאות</p>
                </div>
            `;
            this.showResults();
            return;
        }

        this.resultsContainer.innerHTML = `
            <div class="search-results-header">
                נמצאו ${results.length} תוצאות
            </div>
            <table class="search-results-table">
                <thead>
                    <tr>
                        <th>סוג</th>
                        <th>שם</th>
                        <th>מזהה</th>
                        <th>פרטים</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map((result, index) => `
                        <tr data-index="${index}">
                            <td><span class="search-result-type-badge ${result.type}">${this.getTypeLabel(result.type)}</span></td>
                            <td style="font-weight: 500;">${this.escapeHtml(result.name)}</td>
                            <td>${this.escapeHtml(result.id || '-')}</td>
                            <td style="color: var(--fibi-gray-500); font-size: 13px;">${this.escapeHtml(result.meta)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add click handlers
        this.resultsContainer.querySelectorAll('tbody tr').forEach((row, index) => {
            row.addEventListener('click', () => {
                this.selectResult(results[index]);
            });
        });

        this.showResults();
    }

    /**
     * Select a result and open appropriate modal
     */
    selectResult(result) {
        this.hideAutocomplete();

        if (result.type === 'employee') {
            this.uiRenderer.showEmployeeModal(result.data.id || result.data.name);
        } else if (result.type === 'requirement') {
            this.uiRenderer.showRequirementModal(result.data);
        } else if (result.type === 'task') {
            // For tasks, show the employee who worked on it
            if (result.data.employee) {
                this.uiRenderer.showEmployeeModal(result.data.employee);
            }
        }
    }

    /**
     * Get type label in Hebrew
     */
    getTypeLabel(type) {
        const labels = {
            'employee': 'עובד',
            'requirement': 'דרישה',
            'task': 'משימה'
        };
        return labels[type] || type;
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchInput.focus();
        }
        if (this.clearBtn) {
            this.clearBtn.style.display = 'none';
        }
        this.hideAutocomplete();
        this.hideResults();
    }

    /**
     * Show/hide methods
     */
    showAutocomplete() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.style.display = 'block';
        }
    }

    hideAutocomplete() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.style.display = 'none';
        }
    }

    showResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'block';
        }
    }

    hideResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

