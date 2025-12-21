/**
 * FinanceFlow - Investments Manager
 * Handles investments and savings tracking
 */

const Investments = {
    /**
     * Initialize investments page
     */
    async init() {
        // Sync from API first for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            await this.syncFromAPI();
        }

        this.loadStats();
        this.loadInvestments();
        this.loadEmailSettings();
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
        // Save email settings
        document.getElementById('saveEmailSettings')?.addEventListener('click', () => this.saveEmailSettings());

        // Add investment buttons
        document.getElementById('addFdBtn')?.addEventListener('click', () => this.openModal('addFdModal'));
        document.getElementById('addRdBtn')?.addEventListener('click', () => this.openModal('addRdModal'));
        document.getElementById('addSipBtn')?.addEventListener('click', () => this.openModal('addSipModal'));
        document.getElementById('addPpfBtn')?.addEventListener('click', () => this.openModal('addPpfModal'));

        // Close modal buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.closeModal;
                this.closeModal(modalId);
            });
        });

        // Modal overlays
        document.querySelectorAll('.modal .modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Form submissions
        document.getElementById('addFdForm')?.addEventListener('submit', (e) => this.handleFdSubmit(e));
        document.getElementById('addRdForm')?.addEventListener('submit', (e) => this.handleRdSubmit(e));
        document.getElementById('addSipForm')?.addEventListener('submit', (e) => this.handleSipSubmit(e));
        document.getElementById('addPpfForm')?.addEventListener('submit', (e) => this.handlePpfSubmit(e));
    },

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            // Reset form
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    },

    /**
     * Handle FD form submit
     */
    handleFdSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const principal = parseFloat(formData.get('principal'));
        const rate = parseFloat(formData.get('interestRate'));
        const tenureValue = parseInt(formData.get('tenureValue'));
        const tenureUnit = formData.get('tenureUnit');

        // Convert tenure to months for calculation
        let months;
        if (tenureUnit === 'days') {
            months = tenureValue / 30; // Approximate days to months
        } else if (tenureUnit === 'years') {
            months = tenureValue * 12;
        } else {
            months = tenureValue;
        }

        // Calculate maturity amount (quarterly compounding)
        const n = 4; // quarterly
        const t = months / 12;
        const maturityAmount = principal * Math.pow((1 + rate / (n * 100)), n * t);

        const investment = {
            id: 'fd_' + Date.now(),
            type: 'fd',
            name: formData.get('name'),
            principal: principal,
            interestRate: rate,
            tenureValue: tenureValue,
            tenureUnit: tenureUnit,
            tenureMonths: Math.round(months), // For backwards compatibility
            maturityAmount: Math.round(maturityAmount),
            startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
            bank: formData.get('bank'),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        this.saveInvestment(investment);
        this.closeModal('addFdModal');
        App.showToast('Fixed Deposit added successfully!', 'success');
    },

    /**
     * Handle RD form submit
     */
    handleRdSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const monthly = parseFloat(formData.get('monthlyDeposit'));
        const rate = parseFloat(formData.get('interestRate'));
        const months = parseInt(formData.get('tenureMonths'));

        // Calculate RD maturity (quarterly compounding)
        const n = 4;
        const r = rate / 100;
        let maturityAmount = 0;
        for (let i = 1; i <= months; i++) {
            maturityAmount += monthly * Math.pow((1 + r / n), n * (months - i + 1) / 12);
        }

        const investment = {
            id: 'rd_' + Date.now(),
            type: 'rd',
            name: formData.get('name'),
            monthlyDeposit: monthly,
            interestRate: rate,
            tenureMonths: months,
            maturityAmount: Math.round(maturityAmount),
            startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
            bank: formData.get('bank'),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        this.saveInvestment(investment);
        this.closeModal('addRdModal');
        App.showToast('Recurring Deposit added successfully!', 'success');
    },

    /**
     * Handle SIP form submit
     */
    handleSipSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const monthly = parseFloat(formData.get('monthlyAmount'));
        const rate = parseFloat(formData.get('expectedReturns'));
        const years = parseInt(formData.get('tenureYears'));

        // Calculate SIP future value
        const months = years * 12;
        const monthlyRate = rate / 12 / 100;
        const futureValue = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);

        const investment = {
            id: 'sip_' + Date.now(),
            type: 'sip',
            name: formData.get('name'),
            monthlyAmount: monthly,
            expectedReturns: rate,
            tenureYears: years,
            futureValue: Math.round(futureValue),
            startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
            fundHouse: formData.get('fundHouse'),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        this.saveInvestment(investment);
        this.closeModal('addSipModal');
        App.showToast('SIP added successfully!', 'success');
    },

    /**
     * Handle PPF form submit
     */
    handlePpfSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const yearly = parseFloat(formData.get('yearlyAmount'));
        const rate = 7.1; // Current PPF rate
        const years = parseInt(formData.get('tenureYears'));

        // Calculate PPF maturity (yearly compounding)
        let maturityAmount = 0;
        for (let i = 1; i <= years; i++) {
            maturityAmount += yearly * Math.pow((1 + rate / 100), years - i + 1);
        }

        const investment = {
            id: 'ppf_' + Date.now(),
            type: 'ppf',
            name: formData.get('name'),
            yearlyAmount: yearly,
            interestRate: rate,
            tenureYears: years,
            maturityAmount: Math.round(maturityAmount),
            startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
            bank: formData.get('bank'),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        this.saveInvestment(investment);
        this.closeModal('addPpfModal');
        App.showToast('PPF Account added successfully!', 'success');
    },

    /**
     * Save investment to storage
     */
    saveInvestment(investment) {
        let investments = Storage.get('financeflow_investments', []);
        investments.push(investment);
        Storage.set('financeflow_investments', investments);

        // Sync to Google Sheets
        if (typeof SheetsAPI !== 'undefined' && SheetsAPI.isConfigured()) {
            SheetsAPI.request('saveInvestment', { investment }).catch(err => {
                console.error('Failed to sync investment to Google Sheets:', err);
            });
        }

        this.loadStats();
        this.loadInvestments();
    },

    /**
     * Load statistics
     */
    loadStats() {
        const investments = Storage.get('financeflow_investments', []);

        // Calculate total investments
        let totalInvestments = 0;
        let expectedReturns = 0;
        let activePlans = 0;
        let totalRates = 0;
        let rateCount = 0;

        investments.forEach(inv => {
            if (inv.status === 'active') {
                activePlans++;
                switch (inv.type) {
                    case 'fd':
                        totalInvestments += inv.principal || 0;
                        expectedReturns += inv.maturityAmount || 0;
                        if (inv.interestRate) { totalRates += inv.interestRate; rateCount++; }
                        break;
                    case 'rd':
                        const rdMonths = inv.tenureMonths || 0;
                        totalInvestments += (inv.monthlyDeposit || 0) * rdMonths;
                        expectedReturns += inv.maturityAmount || 0;
                        if (inv.interestRate) { totalRates += inv.interestRate; rateCount++; }
                        break;
                    case 'sip':
                        const sipMonths = (inv.tenureYears || 0) * 12;
                        totalInvestments += (inv.monthlyAmount || 0) * sipMonths;
                        expectedReturns += inv.futureValue || 0;
                        if (inv.expectedReturns) { totalRates += inv.expectedReturns; rateCount++; }
                        break;
                    case 'ppf':
                        totalInvestments += (inv.yearlyAmount || 0) * (inv.tenureYears || 0);
                        expectedReturns += inv.maturityAmount || 0;
                        totalRates += 7.1; rateCount++; // PPF rate
                        break;
                }
            }
        });

        // Calculate average return rate
        const avgRate = rateCount > 0 ? (totalRates / rateCount).toFixed(1) : 0;

        // Update UI
        const totalInvEl = document.getElementById('totalInvestments');
        const expectedRetEl = document.getElementById('expectedReturns');
        const avgRateEl = document.getElementById('avgReturnRate');
        const activePlansEl = document.getElementById('activePlans');

        if (totalInvEl) totalInvEl.textContent = this.formatCurrency(totalInvestments);
        if (expectedRetEl) expectedRetEl.textContent = this.formatCurrency(expectedReturns);
        if (avgRateEl) avgRateEl.textContent = avgRate + '%';
        if (activePlansEl) activePlansEl.textContent = activePlans;
    },

    /**
     * Load investments
     */
    loadInvestments() {
        const investments = Storage.get('financeflow_investments', []);

        this.renderInvestmentList('fd', investments.filter(i => i.type === 'fd'), 'fdList');
        this.renderInvestmentList('rd', investments.filter(i => i.type === 'rd'), 'rdList');
        this.renderInvestmentList('sip', investments.filter(i => i.type === 'sip'), 'sipList');
        this.renderInvestmentList('ppf', investments.filter(i => i.type === 'ppf'), 'ppfList');
    },

    /**
     * Render investment list
     */
    renderInvestmentList(type, investments, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (investments.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <p>No ${type.toUpperCase()}s added yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        investments.forEach(inv => {
            let principal = 0;
            let maturity = 0;
            let details = '';
            let bankName = '';

            switch (type) {
                case 'fd':
                    principal = inv.principal;
                    maturity = inv.maturityAmount;
                    bankName = inv.bank || '';
                    // Show tenure with proper unit
                    let tenureDisplay;
                    if (inv.tenureValue && inv.tenureUnit) {
                        tenureDisplay = `${inv.tenureValue} ${inv.tenureUnit}`;
                    } else {
                        tenureDisplay = `${inv.tenureMonths} months`;
                    }
                    details = `${bankName ? bankName + ' • ' : ''}${inv.interestRate}% p.a. | ${tenureDisplay}`;
                    break;
                case 'rd':
                    principal = inv.monthlyDeposit * inv.tenureMonths;
                    maturity = inv.maturityAmount;
                    bankName = inv.bank || '';
                    details = `${bankName ? bankName + ' • ' : ''}₹${inv.monthlyDeposit.toLocaleString('en-IN')}/month | ${inv.tenureMonths} months`;
                    break;
                case 'sip':
                    principal = inv.monthlyAmount * inv.tenureYears * 12;
                    maturity = inv.futureValue;
                    bankName = inv.fundHouse || '';
                    details = `${bankName ? bankName + ' • ' : ''}₹${inv.monthlyAmount.toLocaleString('en-IN')}/month | ${inv.tenureYears} years`;
                    break;
                case 'ppf':
                    principal = inv.yearlyAmount * inv.tenureYears;
                    maturity = inv.maturityAmount;
                    bankName = inv.bank || '';
                    details = `${bankName ? bankName + ' • ' : ''}₹${inv.yearlyAmount.toLocaleString('en-IN')}/year | ${inv.tenureYears} years`;
                    break;
            }

            const returns = ((maturity - principal) / principal * 100).toFixed(1);

            const item = document.createElement('div');
            item.className = 'investment-item';
            item.innerHTML = `
                <div class="investment-item-info">
                    <h4>${inv.name || type.toUpperCase()}</h4>
                    <p>${details}</p>
                </div>
                <div class="investment-item-value">
                    <span class="amount">${this.formatCurrency(maturity)}</span>
                    <span class="returns">+${returns}% returns</span>
                </div>
                <div class="investment-item-actions">
                    <button class="emi-action-btn danger" onclick="Investments.deleteInvestment('${inv.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    },

    /**
     * Delete investment
     */
    deleteInvestment(invId) {
        if (confirm('Are you sure you want to delete this investment?')) {
            let investments = Storage.get('financeflow_investments', []);
            investments = investments.filter(i => i.id !== invId);
            Storage.set('financeflow_investments', investments);

            App.showToast('Investment deleted', 'success');
            this.loadStats();
            this.loadInvestments();
        }
    },

    /**
     * Load email settings
     */
    loadEmailSettings() {
        const settings = Storage.get('financeflow_investment_notifications', {});

        const emailInput = document.getElementById('notificationEmail');
        const maturityReminders = document.getElementById('enableMaturityReminders');
        const sipReminders = document.getElementById('enableSipReminders');
        const investmentSummary = document.getElementById('enableInvestmentSummary');

        if (emailInput) emailInput.value = settings.email || '';
        if (maturityReminders) maturityReminders.checked = settings.maturityReminders !== false;
        if (sipReminders) sipReminders.checked = settings.sipReminders !== false;
        if (investmentSummary) investmentSummary.checked = settings.investmentSummary || false;
    },

    /**
     * Save email settings
     */
    saveEmailSettings() {
        const settings = {
            email: document.getElementById('notificationEmail')?.value || '',
            maturityReminders: document.getElementById('enableMaturityReminders')?.checked,
            sipReminders: document.getElementById('enableSipReminders')?.checked,
            investmentSummary: document.getElementById('enableInvestmentSummary')?.checked
        };

        Storage.set('financeflow_investment_notifications', settings);

        // Also sync to Google Sheets for email sending
        if (SheetsAPI.isConfigured() && settings.email) {
            SheetsAPI.request('saveInvestmentNotifications', { settings }).catch(err => {
                console.error('Failed to sync investment notification settings:', err);
            });
        }

        App.showToast('Investment notification settings saved!', 'success');
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
    if (document.querySelector('.investments-content')) {
        Investments.init();
    }
});

window.Investments = Investments;
