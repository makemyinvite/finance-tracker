/**
 * FinanceFlow - EMI & Loans Manager
 * Handles EMI/Loan tracking, payments, and automation
 */

const EMIs = {
    editingEmiId: null,

    /**
     * Initialize EMI page
     */
    async init() {
        // Sync from API first for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            await this.syncFromAPI();
        }

        this.loadStats();
        this.loadEMIs();
        this.loadUpcomingPayments();
        this.loadAccountsDropdown();
        this.loadAutomationSettings();
        this.setupEventListeners();
    },

    /**
     * Sync data from API
     */
    async syncFromAPI() {
        try {
            await SheetsAPI.syncFromSheets();
        } catch (error) {
            console.error('Sync error:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add EMI buttons
        document.getElementById('addEmiBtn')?.addEventListener('click', () => this.openEmiModal());
        document.getElementById('addEmiEmptyBtn')?.addEventListener('click', () => this.openEmiModal());

        // Close EMI modal
        document.getElementById('closeEmiModal')?.addEventListener('click', () => this.closeEmiModal());
        document.getElementById('cancelEmi')?.addEventListener('click', () => this.closeEmiModal());

        // EMI form submission
        document.getElementById('emiForm')?.addEventListener('submit', (e) => this.saveEmi(e));

        // Save automation settings
        document.getElementById('saveEmiSettings')?.addEventListener('click', () => this.saveAutomationSettings());

        // Close modal on outside click
        document.getElementById('emiModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'emiModal') {
                this.closeEmiModal();
            }
        });
    },

    /**
     * Open EMI modal for add/edit
     */
    openEmiModal(emiId = null) {
        const modal = document.getElementById('emiModal');
        const title = document.getElementById('emiModalTitle');
        const form = document.getElementById('emiForm');

        if (!modal) return;

        this.editingEmiId = emiId;

        if (emiId) {
            // Edit mode
            title.innerHTML = '<i class="fas fa-edit"></i> Edit EMI';
            const emis = Storage.get('financeflow_emi_schedules', []);
            const emi = emis.find(e => e.id === emiId);

            if (emi) {
                document.getElementById('emiName').value = emi.name || '';
                document.getElementById('emiBank').value = emi.bank || '';
                document.getElementById('emiAccount').value = emi.accountId || '';
                document.getElementById('loanAmount').value = emi.loanAmount || '';
                document.getElementById('emiAmount').value = emi.amount || '';
                document.getElementById('interestRate').value = emi.interestRate || '';
                document.getElementById('totalTenure').value = emi.totalEmis || '';
                document.getElementById('paidEmis').value = emi.totalEmis - emi.remainingEmis || 0;
                document.getElementById('emiDueDate').value = emi.paymentDay || '';
                document.getElementById('emiStartDate').value = emi.startDate?.split('T')[0] || '';
                document.getElementById('emiCategory').value = emi.loanType || 'other';
                document.getElementById('emiNotes').value = emi.notes || '';
            }
        } else {
            // Add mode
            title.innerHTML = '<i class="fas fa-credit-card"></i> Add EMI';
            form.reset();
            // Set default start date to today
            document.getElementById('emiStartDate').value = new Date().toISOString().split('T')[0];
        }

        modal.classList.add('active');
        this.loadAccountsDropdown();
    },

    /**
     * Close EMI modal
     */
    closeEmiModal() {
        const modal = document.getElementById('emiModal');
        if (modal) {
            modal.classList.remove('active');
            document.getElementById('emiForm')?.reset();
            this.editingEmiId = null;
        }
    },

    /**
     * Load accounts dropdown
     */
    loadAccountsDropdown() {
        const accounts = Storage.getAccounts();
        const select = document.getElementById('emiAccount');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Account</option>';
        accounts.forEach(acc => {
            select.innerHTML += `<option value="${acc.id}">${acc.name} (${acc.bankName || acc.accountType})</option>`;
        });
        select.value = currentValue;
    },

    /**
     * Save EMI (add or update)
     */
    saveEmi(e) {
        e.preventDefault();

        const totalEmis = parseInt(document.getElementById('totalTenure').value) || 0;
        const paidEmis = parseInt(document.getElementById('paidEmis').value) || 0;

        const emiData = {
            id: this.editingEmiId || Date.now().toString(),
            name: document.getElementById('emiName').value.trim(),
            bank: document.getElementById('emiBank').value.trim(),
            accountId: document.getElementById('emiAccount').value,
            loanAmount: parseFloat(document.getElementById('loanAmount').value) || 0,
            amount: parseFloat(document.getElementById('emiAmount').value) || 0,
            interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
            totalEmis: totalEmis,
            remainingEmis: totalEmis - paidEmis,
            paymentDay: parseInt(document.getElementById('emiDueDate').value) || 5,
            loanType: document.getElementById('emiCategory').value,
            startDate: document.getElementById('emiStartDate').value,
            notes: document.getElementById('emiNotes').value.trim(),
            paidEmis: [],
            createdAt: this.editingEmiId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let emis = Storage.get('financeflow_emi_schedules', []);

        if (this.editingEmiId) {
            // Update existing
            const index = emis.findIndex(e => e.id === this.editingEmiId);
            if (index !== -1) {
                emiData.paidEmis = emis[index].paidEmis || [];
                emiData.createdAt = emis[index].createdAt;
                emis[index] = emiData;
            }
            App.showToast('EMI updated successfully!', 'success');
        } else {
            // Add new
            emis.push(emiData);
            App.showToast('EMI added successfully!', 'success');
        }

        Storage.set('financeflow_emi_schedules', emis);

        // Log the action
        if (typeof SheetsAPI !== 'undefined' && SheetsAPI.isConfigured()) {
            const user = Storage.get('financeflow_user', {});
            SheetsAPI.request('writeLog', {
                level: 'INFO',
                source: 'EMI',
                message: this.editingEmiId ? 'EMI updated' : 'EMI added',
                details: `${emiData.name} - ${this.formatCurrency(emiData.amount)}/month`,
                user: user.name || user.email || 'Unknown'
            }).catch(() => {});
        }

        this.closeEmiModal();
        this.loadStats();
        this.loadEMIs();
        this.loadUpcomingPayments();
    },

    /**
     * Load statistics
     */
    loadStats() {
        const emis = Storage.get('financeflow_emi_schedules', []);
        const activeEmis = emis.filter(e => e.remainingEmis > 0);

        // Total Outstanding
        let totalOutstanding = 0;
        activeEmis.forEach(emi => {
            totalOutstanding += emi.amount * emi.remainingEmis;
        });

        // Monthly EMI
        let monthlyEmi = 0;
        activeEmis.forEach(emi => {
            monthlyEmi += emi.amount;
        });

        // Due this month
        const today = new Date();
        const currentMonth = today.getMonth();
        const dueThisMonth = activeEmis.filter(emi => {
            const nextPayment = this.getNextPaymentDate(emi);
            return nextPayment.getMonth() === currentMonth;
        }).length;

        // Update UI
        document.getElementById('totalOutstanding').textContent = this.formatCurrency(totalOutstanding);
        document.getElementById('monthlyEmi').textContent = this.formatCurrency(monthlyEmi);
        document.getElementById('activeLoans').textContent = activeEmis.length;
        document.getElementById('dueThisMonth').textContent = dueThisMonth;
    },

    /**
     * Load upcoming payments alerts
     */
    loadUpcomingPayments() {
        const emis = Storage.get('financeflow_emi_schedules', []);
        const container = document.getElementById('upcomingPayments');
        if (!container) return;

        const today = new Date();
        const upcomingEmis = emis
            .filter(e => e.remainingEmis > 0)
            .map(emi => ({
                ...emi,
                nextPayment: this.getNextPaymentDate(emi),
                daysUntil: this.getDaysUntilPayment(emi)
            }))
            .filter(emi => emi.daysUntil <= 7)
            .sort((a, b) => a.daysUntil - b.daysUntil);

        if (upcomingEmis.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = upcomingEmis.map(emi => {
            const isOverdue = emi.daysUntil < 0;
            const isDueToday = emi.daysUntil === 0;

            let statusText = '';
            if (isOverdue) {
                statusText = `Overdue by ${Math.abs(emi.daysUntil)} days`;
            } else if (isDueToday) {
                statusText = 'Due today';
            } else {
                statusText = `Due in ${emi.daysUntil} days`;
            }

            return `
                <div class="payment-alert ${isOverdue ? 'overdue' : ''}">
                    <i class="fas ${isOverdue ? 'fa-exclamation-circle' : 'fa-bell'}"></i>
                    <div class="payment-info">
                        <h4>${emi.name}</h4>
                        <p>${statusText} (${emi.nextPayment.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</p>
                    </div>
                    <div class="payment-amount">${this.formatCurrency(emi.amount)}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Load EMI list
     */
    loadEMIs() {
        const emis = Storage.get('financeflow_emi_schedules', []);
        const container = document.getElementById('emiList');
        const emptyState = document.getElementById('emiEmptyState');

        if (!container) return;

        const activeEmis = emis.filter(e => e.remainingEmis > 0);
        const completedEmis = emis.filter(e => e.remainingEmis <= 0);

        if (emis.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        let html = '';

        // Active EMIs
        activeEmis.forEach(emi => {
            html += this.renderEmiCard(emi, false);
        });

        // Completed EMIs
        if (completedEmis.length > 0) {
            html += `<h4 style="margin: 1.5rem 0 1rem; color: var(--text-muted);">Completed Loans</h4>`;
            completedEmis.forEach(emi => {
                html += this.renderEmiCard(emi, true);
            });
        }

        container.innerHTML = html;
    },

    /**
     * Render EMI card (compact version)
     */
    renderEmiCard(emi, isCompleted) {
        const progress = ((emi.totalEmis - emi.remainingEmis) / emi.totalEmis) * 100;
        const paidAmount = (emi.totalEmis - emi.remainingEmis) * emi.amount;
        const totalAmount = emi.totalEmis * emi.amount;

        const loanTypeLabels = {
            home_loan: 'Home Loan',
            car_loan: 'Car Loan',
            personal_loan: 'Personal Loan',
            education_loan: 'Education Loan',
            credit_card: 'Credit Card EMI',
            other: 'Loan'
        };

        const loanTypeIcons = {
            home_loan: 'fa-home',
            car_loan: 'fa-car',
            personal_loan: 'fa-user',
            education_loan: 'fa-graduation-cap',
            credit_card: 'fa-credit-card',
            other: 'fa-money-bill'
        };

        const nextPayment = isCompleted ? 'Done' : this.getNextPaymentDate(emi).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

        return `
            <div class="emi-card-compact ${isCompleted ? 'completed' : ''}" style="border-left-color: ${isCompleted ? 'var(--success)' : 'var(--primary)'};">
                <div class="emi-card-header-row">
                    <div class="emi-card-icon" style="background: ${isCompleted ? 'var(--success-bg, #dcfce7)' : 'var(--primary-bg)'};">
                        <i class="fas ${loanTypeIcons[emi.loanType] || 'fa-money-bill'}" style="color: ${isCompleted ? 'var(--success)' : 'var(--primary)'};"></i>
                    </div>
                    <div class="emi-card-title">
                        <h4>${emi.name}</h4>
                        <p>${emi.bank || ''} ${emi.bank ? '•' : ''} ${loanTypeLabels[emi.loanType] || 'Loan'}</p>
                    </div>
                    <div class="emi-card-actions">
                        ${!isCompleted ? `
                            <button class="emi-action-btn" onclick="EMIs.openEmiModal('${emi.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        <button class="emi-action-btn danger" onclick="EMIs.deleteEmi('${emi.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="emi-card-stats">
                    <div class="emi-stat">
                        <span class="emi-stat-value">${this.formatCurrency(emi.amount)}</span>
                        <span class="emi-stat-label">EMI/mo</span>
                    </div>
                    <div class="emi-stat">
                        <span class="emi-stat-value">${emi.remainingEmis}/${emi.totalEmis}</span>
                        <span class="emi-stat-label">Left</span>
                    </div>
                    <div class="emi-stat">
                        <span class="emi-stat-value" style="color: ${isCompleted ? 'var(--success)' : 'var(--text-primary)'}">${nextPayment}</span>
                        <span class="emi-stat-label">Next</span>
                    </div>
                </div>
                <div class="emi-card-progress">
                    <div class="emi-progress-info">
                        <span>${progress.toFixed(0)}% complete</span>
                        <span>${this.formatCurrency(paidAmount)} / ${this.formatCurrency(totalAmount)}</span>
                    </div>
                    <div class="emi-progress-bar">
                        <div class="emi-progress-fill" style="width: ${progress}%; background: ${isCompleted ? 'var(--success)' : 'var(--primary)'};"></div>
                    </div>
                </div>
                ${!isCompleted ? `
                    <button class="btn btn-success emi-mark-paid-btn" onclick="EMIs.markEmiPaid('${emi.id}')">
                        <i class="fas fa-check"></i> Mark Paid
                    </button>
                ` : ''}
            </div>
        `;
    },

    /**
     * Mark EMI as paid for this month
     */
    async markEmiPaid(emiId) {
        const emis = Storage.get('financeflow_emi_schedules', []);
        const emi = emis.find(e => e.id === emiId);

        if (!emi || emi.remainingEmis <= 0) {
            App.showToast('No pending EMI to mark as paid', 'error');
            return;
        }

        // Update EMI
        emi.remainingEmis--;
        emi.paidEmis = emi.paidEmis || [];
        emi.paidEmis.push({
            date: new Date().toISOString(),
            amount: emi.amount
        });
        emi.updatedAt = new Date().toISOString();

        Storage.set('financeflow_emi_schedules', emis);

        // Add as expense transaction
        const transaction = {
            id: Date.now().toString(),
            type: 'expense',
            amount: emi.amount,
            date: new Date().toISOString().split('T')[0],
            description: `EMI Payment - ${emi.name}`,
            category: 'emi',
            paymentMethod: 'netbanking',
            account: emi.accountId || '',
            tags: ['EMI', 'Loan', emi.loanType],
            createdAt: new Date().toISOString()
        };

        Storage.addTransaction(transaction);

        // Sync to Google Sheets if configured
        if (typeof SheetsAPI !== 'undefined' && SheetsAPI.isConfigured()) {
            try {
                const user = Storage.get('financeflow_user', {});
                await SheetsAPI.request('addTransaction', { transaction });
                await SheetsAPI.request('writeLog', {
                    level: 'INFO',
                    source: 'EMI',
                    message: 'EMI payment marked as paid',
                    details: `${emi.name} - ${this.formatCurrency(emi.amount)} - ${emi.remainingEmis} EMIs remaining`,
                    user: user.name || user.email || 'Unknown'
                });
            } catch (err) {
                console.error('Failed to sync EMI payment:', err);
            }
        }

        App.showToast(`EMI payment of ${this.formatCurrency(emi.amount)} marked as paid!`, 'success');

        this.loadStats();
        this.loadEMIs();
        this.loadUpcomingPayments();
    },

    /**
     * Delete EMI
     */
    deleteEmi(emiId) {
        if (!confirm('Are you sure you want to delete this EMI? This action cannot be undone.')) {
            return;
        }

        let emis = Storage.get('financeflow_emi_schedules', []);
        const emi = emis.find(e => e.id === emiId);
        emis = emis.filter(e => e.id !== emiId);
        Storage.set('financeflow_emi_schedules', emis);

        // Log the action
        if (typeof SheetsAPI !== 'undefined' && SheetsAPI.isConfigured() && emi) {
            const user = Storage.get('financeflow_user', {});
            SheetsAPI.request('writeLog', {
                level: 'WARNING',
                source: 'EMI',
                message: 'EMI deleted',
                details: `${emi.name} - ${this.formatCurrency(emi.amount)}/month`,
                user: user.name || user.email || 'Unknown'
            }).catch(() => {});
        }

        App.showToast('EMI deleted successfully', 'success');
        this.loadStats();
        this.loadEMIs();
        this.loadUpcomingPayments();
    },

    /**
     * Load automation settings
     */
    loadAutomationSettings() {
        const settings = Storage.get('financeflow_emi_settings', {
            autoRecord: true,
            reminders: true
        });

        const autoRecord = document.getElementById('autoRecordEmi');
        const reminders = document.getElementById('emiReminders');

        if (autoRecord) autoRecord.checked = settings.autoRecord !== false;
        if (reminders) reminders.checked = settings.reminders !== false;
    },

    /**
     * Save automation settings
     */
    async saveAutomationSettings() {
        const settings = {
            autoRecord: document.getElementById('autoRecordEmi')?.checked ?? true,
            reminders: document.getElementById('emiReminders')?.checked ?? true
        };

        Storage.set('financeflow_emi_settings', settings);

        // Sync to backend
        if (typeof SheetsAPI !== 'undefined' && SheetsAPI.isConfigured()) {
            try {
                await SheetsAPI.request('saveEmiSettings', { settings });
            } catch (err) {
                console.error('Failed to sync EMI settings:', err);
            }
        }

        App.showToast('EMI automation settings saved!', 'success');
    },

    /**
     * Get next payment date for an EMI
     */
    getNextPaymentDate(emi) {
        const today = new Date();
        const paymentDay = emi.paymentDay || 5;

        let nextPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);
        if (nextPayment <= today) {
            nextPayment.setMonth(nextPayment.getMonth() + 1);
        }

        return nextPayment;
    },

    /**
     * Get days until next payment
     */
    getDaysUntilPayment(emi) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextPayment = this.getNextPaymentDate(emi);
        nextPayment.setHours(0, 0, 0, 0);
        return Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    },

    /**
     * Get ordinal suffix for a number
     */
    getOrdinalSuffix(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (isNaN(amount)) return '₹0';
        return '₹' + Math.round(amount).toLocaleString('en-IN');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the EMI page
    if (document.getElementById('emiList')) {
        EMIs.init();
    }
});

// Expose globally
window.EMIs = EMIs;
