/**
 * ============================================
 * Team Filter Module
 * ============================================
 * Manages team-based filtering of data
 */

export class TeamFilter {
    constructor() {
        this.teamsData = null;
        this.currentTeam = 'all';
        this.onTeamChange = null;
    }

    /**
     * Load teams structure from JSON
     */
    async loadTeamsStructure() {
        try {
            const response = await fetch('teams-structure.json');
            this.teamsData = await response.json();
            console.log('✅ Teams structure loaded:', this.teamsData);
            return this.teamsData;
        } catch (error) {
            console.error('❌ Failed to load teams structure:', error);
            // Fallback to default structure
            this.teamsData = this.getDefaultTeamsStructure();
            return this.teamsData;
        }
    }

    /**
     * Get default teams structure (fallback)
     */
    getDefaultTeamsStructure() {
        return {
            teams: [
                {
                    id: 'all',
                    name: 'מנהל מדור',
                    manager: 'כל המדור',
                    employees: []
                },
                {
                    id: 'logashi',
                    name: 'צוות לוגאשי',
                    manager: 'קרן לוגאשי',
                    employees: ['395602', '218668', '218503']
                },
                {
                    id: 'spishvili',
                    name: 'צוות ספישווילי',
                    manager: 'יעקב ספישווילי',
                    employees: ['218452', '216461', '395701', '219137', '219302', '218654', '218652', '219311']
                },
                {
                    id: 'retail',
                    name: 'צוות ריטל',
                    manager: 'תומר ריטל',
                    employees: ['219253', '217620', '217623']
                },
                {
                    id: 'hoizman',
                    name: 'צוות הויזמן',
                    manager: 'אלקנה הויזמן',
                    employees: ['395678', '218891', '219193', '395745']
                }
            ]
        };
    }

    /**
     * Initialize team selector
     */
    init(onTeamChangeCallback) {
        this.onTeamChange = onTeamChangeCallback;
        
        const teamSelector = document.getElementById('teamSelector');
        if (!teamSelector) {
            console.warn('Team selector not found');
            return;
        }

        // Load teams structure
        this.loadTeamsStructure().then(() => {
            // Load saved team from localStorage
            const savedTeam = this.loadSavedTeam();
            if (savedTeam) {
                teamSelector.value = savedTeam;
                this.currentTeam = savedTeam;
                console.log(`💾 Loaded saved team: ${savedTeam}`);
                
                // Trigger callback with saved team
                if (this.onTeamChange) {
                    this.onTeamChange(savedTeam);
                }
            } else {
                this.currentTeam = teamSelector.value || 'all';
            }

            // Setup change listener
            teamSelector.addEventListener('change', (e) => {
                this.setCurrentTeam(e.target.value);
            });
        });
    }

    /**
     * Set current team and trigger callback
     */
    setCurrentTeam(teamId) {
        this.currentTeam = teamId;
        console.log(`📊 Team changed to: ${teamId}`);
        
        // Save to localStorage
        this.saveTeam(teamId);
        
        if (this.onTeamChange) {
            this.onTeamChange(teamId);
        }
    }

    /**
     * Save selected team to localStorage
     */
    saveTeam(teamId) {
        try {
            localStorage.setItem('matafOS_selectedTeam', teamId);
            console.log(`💾 Team saved: ${teamId}`);
        } catch (error) {
            console.error('Failed to save team to localStorage:', error);
        }
    }

    /**
     * Load saved team from localStorage
     */
    loadSavedTeam() {
        try {
            const savedTeam = localStorage.getItem('matafOS_selectedTeam');
            return savedTeam || null;
        } catch (error) {
            console.error('Failed to load team from localStorage:', error);
            return null;
        }
    }

    /**
     * Get current team
     */
    getCurrentTeam() {
        return this.currentTeam;
    }

    /**
     * Get team by ID
     */
    getTeam(teamId) {
        if (!this.teamsData) return null;
        return this.teamsData.teams.find(t => t.id === teamId);
    }

    /**
     * Get current team data
     */
    getCurrentTeamData() {
        return this.getTeam(this.currentTeam);
    }

    /**
     * Check if employee belongs to current team
     */
    isEmployeeInCurrentTeam(employeeId) {
        if (this.currentTeam === 'all') return true;
        
        const team = this.getCurrentTeamData();
        if (!team) return true;
        
        // Convert both to strings for comparison
        const empIdStr = String(employeeId).trim();
        return team.employees.some(id => String(id).trim() === empIdStr);
    }

    /**
     * Filter employees array by current team
     */
    filterEmployees(employees) {
        if (this.currentTeam === 'all') return employees;
        
        return employees.filter(emp => {
            const empId = emp.id || emp.employeeId || emp['מספר עובד'];
            return this.isEmployeeInCurrentTeam(empId);
        });
    }

    /**
     * Filter hours data by current team
     */
    filterHoursData(hoursData) {
        if (this.currentTeam === 'all') return hoursData;
        
        return hoursData.filter(row => {
            const empId = row.employeeId || row['מספר עובד'];
            return this.isEmployeeInCurrentTeam(empId);
        });
    }

    /**
     * Get team employees list
     */
    getTeamEmployees(teamId = null) {
        const team = this.getTeam(teamId || this.currentTeam);
        return team ? team.employees : [];
    }

    /**
     * Get all teams
     */
    getAllTeams() {
        return this.teamsData ? this.teamsData.teams : [];
    }
}

