/**
 * FinanceFlow - Accounts Manager
 * Accounts page functionality
 */

const Accounts = {
    currentAccountId: null,
    deleteAccountId: null,

    /**
     * Initialize accounts page
     */
    async init() {
        // Show loader and sync from API for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            App.showLoader('Loading Accounts', 'Syncing your data...');
            await this.syncFromAPI();
        }

        this.loadStats();
        this.loadAccounts();
        this.loadRequirements();
        this.setupEventListeners();
        this.updateQuarter();

        App.hideLoader();
    },

    /**
     * Sync data from API
     */
    async syncFromAPI() {
        try {
            const result = await SheetsAPI.syncFromSheets();
            if (!result.success) {
                console.error('Sync failed:', result.message);
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add account button
        const addAccountBtn = document.getElementById('addAccountBtn');
        if (addAccountBtn) {
            addAccountBtn.addEventListener('click', () => this.openAddAccountModal());
        }

        // Add placeholders
        document.querySelectorAll('.add-card-placeholder').forEach(placeholder => {
            placeholder.addEventListener('click', (e) => {
                const type = this.getAccountTypeFromPlaceholder(e.target.closest('.add-card-placeholder').id);
                this.openAddAccountModal(type);
            });
        });

        // Account form
        const accountForm = document.getElementById('accountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', (e) => this.handleAccountSubmit(e));
        }

        // Account type change
        const accountTypeSelect = document.getElementById('accountType');
        if (accountTypeSelect) {
            accountTypeSelect.addEventListener('change', (e) => this.handleAccountTypeChange(e.target.value));
        }

        // Bank selection - show/hide credit card fields
        document.getElementById('bankName')?.addEventListener('change', () => {
            this.toggleCreditCardFields();
        });

        // Has Debit Card checkbox - show/hide debit card number field
        document.getElementById('hasDebitCard')?.addEventListener('change', (e) => {
            const debitCardNumberField = document.getElementById('debitCardNumberField');
            if (debitCardNumberField) {
                debitCardNumberField.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        // Close modal
        document.getElementById('closeModal')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('accountModal'));
        });
        document.getElementById('cancelAccount')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('accountModal'));
        });

        // Delete confirmation
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('deleteModal'));
        });
        document.getElementById('cancelDelete')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('deleteModal'));
        });
    },

    /**
     * Get account type from placeholder ID
     */
    getAccountTypeFromPlaceholder(id) {
        const types = {
            'addBankAccount': 'bank',
            'addCreditCard': 'credit',
            'addDebitCard': 'debit',
            'addWallet': 'wallet'
        };
        return types[id] || 'bank';
    },

    /**
     * Load account statistics
     */
    loadStats() {
        const accounts = Storage.getAccounts();

        // Bank balance
        const bankBalance = accounts
            .filter(a => a.accountType === 'bank' || a.accountType === 'debit')
            .reduce((sum, a) => sum + (parseFloat(a.currentBalance) || 0), 0);

        // Credit limit
        const creditLimit = accounts
            .filter(a => a.accountType === 'credit')
            .reduce((sum, a) => sum + (parseFloat(a.creditLimit) || 0), 0);

        // Credit used
        const creditUsed = accounts
            .filter(a => a.accountType === 'credit')
            .reduce((sum, a) => sum + (parseFloat(a.currentBalance) || 0), 0);

        // Cash/Wallet
        const cashBalance = accounts
            .filter(a => a.accountType === 'wallet')
            .reduce((sum, a) => sum + (parseFloat(a.currentBalance) || 0), 0);

        // Update UI
        document.getElementById('totalBankBalance').textContent = App.formatCurrency(bankBalance);
        document.getElementById('totalCreditLimit').textContent = App.formatCurrency(creditLimit);
        document.getElementById('totalCreditUsed').textContent = App.formatCurrency(creditUsed);
        document.getElementById('totalCash').textContent = App.formatCurrency(cashBalance);
    },

    /**
     * Load all accounts
     */
    loadAccounts() {
        const accounts = Storage.getAccounts();

        this.renderBankAccounts(accounts.filter(a => a.accountType === 'bank'));
        this.renderCreditCards(accounts.filter(a => a.accountType === 'credit'));
        this.renderWallets(accounts.filter(a => a.accountType === 'wallet'));
    },

    /**
     * Render bank accounts
     */
    renderBankAccounts(accounts) {
        const container = document.getElementById('bankAccountsList');
        if (!container) return;

        const placeholder = container.querySelector('.add-card-placeholder');
        container.innerHTML = '';

        accounts.forEach(acc => {
            const card = document.createElement('div');
            card.className = `bank-card ${acc.color || 'gradient-1'} stagger-item`;
            const debitCardNum = acc.debitCardNumber ? ` ****${acc.debitCardNumber}` : '';
            const debitCardBadge = acc.hasDebitCard ? `<span class="debit-card-badge"><i class="fas fa-credit-card"></i> Debit Card${debitCardNum}</span>` : '';
            card.innerHTML = `
                <div class="card-actions">
                    <button class="card-action-btn edit-btn" data-id="${acc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="card-action-btn delete-btn" data-id="${acc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="card-bank-logo">
                    <i class="fas fa-university"></i>
                </div>
                <div class="card-name">${acc.name}</div>
                <div class="card-number">****${acc.accountNumber || '0000'}</div>
                ${debitCardBadge}
                <div class="card-balance-section">
                    <div class="card-balance-label">Available Balance</div>
                    <div class="card-balance">${App.formatCurrency(acc.currentBalance)}</div>
                </div>
            `;
            container.appendChild(card);

            // Add event listeners
            card.querySelector('.edit-btn')?.addEventListener('click', () => this.editAccount(acc.id));
            card.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteAccount(acc.id));
        });

        if (placeholder) container.appendChild(placeholder);

        // Animate
        setTimeout(() => {
            container.querySelectorAll('.stagger-item').forEach((item, i) => {
                setTimeout(() => item.classList.add('animated'), i * 100);
            });
        }, 100);
    },

    /**
     * Render credit cards
     */
    renderCreditCards(accounts) {
        const container = document.getElementById('creditCardsList');
        if (!container) return;

        const placeholder = container.querySelector('.add-card-placeholder');
        container.innerHTML = '';

        accounts.forEach(acc => {
            const used = parseFloat(acc.currentBalance) || 0;
            const limit = parseFloat(acc.creditLimit) || 1;
            const usedPercent = Math.min((used / limit) * 100, 100);
            const available = limit - used;

            const card = document.createElement('div');
            card.className = `credit-card ${acc.color || 'gradient-3'} stagger-item`;
            card.innerHTML = `
                <div class="card-actions">
                    <button class="card-action-btn edit-btn" data-id="${acc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="card-action-btn delete-btn" data-id="${acc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="card-chip"></div>
                <div class="card-details">
                    <div class="card-name">${acc.name}</div>
                    <div class="card-number">****${acc.accountNumber || '0000'}</div>
                </div>
                <div class="card-limit-section">
                    <div class="limit-info">
                        <div class="limit-label">Credit Limit</div>
                        <div class="limit-value">${App.formatCurrency(limit)}</div>
                    </div>
                    <div class="limit-info right">
                        <div class="limit-label">Available</div>
                        <div class="limit-value">${App.formatCurrency(available)}</div>
                    </div>
                </div>
                <div class="credit-progress">
                    <div class="credit-progress-bar">
                        <div class="credit-progress-fill" style="width: ${usedPercent}%"></div>
                    </div>
                    <div class="credit-progress-text">
                        <span>Used: ${App.formatCurrency(used)}</span>
                        <span>${usedPercent.toFixed(0)}%</span>
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Add event listeners
            card.querySelector('.edit-btn')?.addEventListener('click', () => this.editAccount(acc.id));
            card.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteAccount(acc.id));
        });

        if (placeholder) container.appendChild(placeholder);

        // Animate
        setTimeout(() => {
            container.querySelectorAll('.stagger-item').forEach((item, i) => {
                setTimeout(() => item.classList.add('animated'), i * 100);
            });
        }, 100);
    },

    /**
     * Render wallets
     */
    renderWallets(accounts) {
        const container = document.getElementById('walletsList');
        if (!container) return;

        const placeholder = container.querySelector('.add-card-placeholder');
        container.innerHTML = '';

        accounts.forEach(acc => {
            const isCash = acc.walletType === 'cash';
            const card = document.createElement('div');
            card.className = 'wallet-card stagger-item';
            card.innerHTML = `
                <div class="wallet-icon ${isCash ? 'cash' : 'digital'}">
                    <i class="fas ${isCash ? 'fa-money-bill-wave' : 'fa-wallet'}"></i>
                </div>
                <div class="wallet-info">
                    <div class="wallet-name">${acc.name}</div>
                    <div class="wallet-type">${acc.walletType || 'Cash'}</div>
                </div>
                <div class="wallet-balance">${App.formatCurrency(acc.currentBalance)}</div>
                <div class="wallet-actions">
                    <button class="wallet-action-btn edit-btn" data-id="${acc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="wallet-action-btn delete-btn" data-id="${acc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);

            // Add event listeners
            card.querySelector('.edit-btn')?.addEventListener('click', () => this.editAccount(acc.id));
            card.querySelector('.delete-btn')?.addEventListener('click', () => this.deleteAccount(acc.id));
        });

        if (placeholder) container.appendChild(placeholder);
    },

    /**
     * Load credit card requirements
     */
    loadRequirements() {
        const accounts = Storage.getAccounts().filter(a => a.accountType === 'credit' && a.minSpendQuarterly > 0);
        const tbody = document.querySelector('#requirementsTable tbody');
        if (!tbody) return;

        if (accounts.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="fas fa-credit-card"></i>
                            <p>No credit cards with spending requirements</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Calculate quarter dates
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        const quarterStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), quarter * 3, 0);
        const daysLeft = Math.ceil((quarterEnd - now) / (1000 * 60 * 60 * 24));

        tbody.innerHTML = accounts.map(acc => {
            const transactions = Storage.getTransactions().filter(t => {
                const tDate = new Date(t.date);
                return t.account === acc.id && t.type === 'expense' && tDate >= quarterStart && tDate <= quarterEnd;
            });

            const currentSpend = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            const minSpend = parseFloat(acc.minSpendQuarterly) || 0;
            const progress = minSpend > 0 ? (currentSpend / minSpend) * 100 : 0;

            let status, statusClass;
            if (progress >= 100) {
                status = 'Completed';
                statusClass = 'completed';
            } else if (progress >= 70) {
                status = 'On Track';
                statusClass = 'on-track';
            } else if (progress >= 40) {
                status = 'At Risk';
                statusClass = 'at-risk';
            } else {
                status = 'Behind';
                statusClass = 'behind';
            }

            let progressClass = 'low';
            if (progress >= 70) progressClass = 'high';
            else if (progress >= 40) progressClass = 'medium';

            return `
                <tr>
                    <td><strong>${acc.name}</strong></td>
                    <td>${App.formatCurrency(minSpend)}</td>
                    <td>${App.formatCurrency(currentSpend)}</td>
                    <td>
                        <div class="requirement-progress">
                            <div class="requirement-progress-bar">
                                <div class="requirement-progress-fill ${progressClass}" style="width: ${Math.min(progress, 100)}%"></div>
                            </div>
                            <div class="requirement-progress-text">${progress.toFixed(0)}%</div>
                        </div>
                    </td>
                    <td>${daysLeft} days</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="fas fa-${statusClass === 'completed' ? 'check' : statusClass === 'on-track' ? 'thumbs-up' : 'exclamation'}"></i>
                            ${status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Update quarter display
     */
    updateQuarter() {
        const quarterBadge = document.getElementById('currentQuarter');
        if (quarterBadge) {
            quarterBadge.textContent = App.getCurrentQuarter();
        }
    },

    /**
     * Open add account modal
     */
    openAddAccountModal(type = 'bank') {
        this.currentAccountId = null;
        const modal = document.getElementById('accountModal');
        const form = document.getElementById('accountForm');
        const title = document.getElementById('modalTitle');

        if (form) form.reset();
        if (title) title.textContent = 'Add Account';

        // Set account type
        const typeInput = document.getElementById('accountType');
        if (typeInput) typeInput.value = type;

        this.handleAccountTypeChange(type);
        App.openModal(modal);
    },

    /**
     * Handle account type change
     */
    handleAccountTypeChange(type) {
        const creditFields = document.getElementById('creditCardFields');
        const walletFields = document.getElementById('walletFields');
        const hasDebitCardField = document.getElementById('hasDebitCardField');
        const balanceLabel = document.querySelector('label[for="currentBalance"]');
        const balanceInput = document.getElementById('currentBalance');

        if (creditFields) creditFields.style.display = type === 'credit' ? 'block' : 'none';
        if (walletFields) walletFields.style.display = type === 'wallet' ? 'block' : 'none';
        if (hasDebitCardField) hasDebitCardField.style.display = type === 'bank' ? 'block' : 'none';

        // Update balance label based on account type
        if (balanceLabel) {
            if (type === 'credit') {
                balanceLabel.innerHTML = 'Outstanding Balance (₹) <small style="color: var(--text-muted); font-weight: normal;">(Credit Used)</small>';
                if (balanceInput) balanceInput.placeholder = '0 for new card';
            } else {
                balanceLabel.textContent = 'Current Balance (₹)';
                if (balanceInput) balanceInput.placeholder = '0.00';
            }
        }
    },

    /**
     * Toggle credit card fields
     */
    toggleCreditCardFields() {
        const accountType = document.getElementById('accountType')?.value;
        const creditFields = document.getElementById('creditCardFields');
        if (creditFields && accountType === 'credit') {
            creditFields.style.display = 'block';
        }
    },

    /**
     * Edit account
     */
    editAccount(id) {
        const account = Storage.getAccountById(id);
        if (!account) return;

        this.currentAccountId = id;
        const modal = document.getElementById('accountModal');
        const form = document.getElementById('accountForm');
        const title = document.getElementById('modalTitle');

        if (title) title.textContent = 'Edit Account';

        // Fill form
        if (form) {
            form.elements['accountId'].value = account.id;
            form.elements['accountType'].value = account.accountType;
            form.elements['accountName'].value = account.name;
            form.elements['bankName'].value = account.bankName;
            form.elements['accountNumber'].value = account.accountNumber;
            form.elements['currentBalance'].value = account.currentBalance;

            // Bank account specific
            if (account.accountType === 'bank') {
                form.elements['hasDebitCard'].checked = account.hasDebitCard || false;
                form.elements['debitCardNumber'].value = account.debitCardNumber || '';
                // Show/hide debit card number field
                const debitCardNumberField = document.getElementById('debitCardNumberField');
                if (debitCardNumberField) {
                    debitCardNumberField.style.display = account.hasDebitCard ? 'block' : 'none';
                }
            }

            if (account.accountType === 'credit') {
                form.elements['creditLimit'].value = account.creditLimit;
                form.elements['billingCycle'].value = account.billingCycle;
                form.elements['minSpendQuarterly'].value = account.minSpendQuarterly;
                form.elements['annualFee'].value = account.annualFee;
                form.elements['rewardType'].value = account.rewardType;
            }

            if (account.accountType === 'wallet') {
                form.elements['walletType'].value = account.walletType;
            }

            form.elements['notes'].value = account.notes || '';

            // Set color
            const colorInput = form.querySelector(`input[name="accountColor"][value="${account.color}"]`);
            if (colorInput) colorInput.checked = true;
        }

        this.handleAccountTypeChange(account.accountType);
        App.openModal(modal);
    },

    /**
     * Delete account
     */
    deleteAccount(id) {
        this.deleteAccountId = id;
        App.openModal(document.getElementById('deleteModal'));
    },

    /**
     * Confirm delete
     */
    async confirmDelete() {
        if (this.deleteAccountId) {
            const accountId = this.deleteAccountId;
            Storage.deleteAccount(accountId);
            this.deleteAccountId = null;
            App.closeModal(document.getElementById('deleteModal'));
            App.showToast('Account deleted successfully', 'success');
            this.loadStats();
            this.loadAccounts();
            this.loadRequirements();
            App.loadAccounts(); // Refresh dropdowns

            // Sync deletion with Google Sheets
            if (SheetsAPI.isConfigured()) {
                try {
                    await SheetsAPI.deleteAccount(accountId);
                } catch (error) {
                    console.error('Failed to sync account deletion:', error);
                }
            }
        }
    },

    /**
     * Handle account form submit
     */
    async handleAccountSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const account = {
            accountType: formData.get('accountType'),
            name: formData.get('accountName'),
            bankName: formData.get('bankName'),
            accountNumber: formData.get('accountNumber'),
            currentBalance: parseFloat(formData.get('currentBalance')) || 0,
            color: formData.get('accountColor'),
            notes: formData.get('notes')
        };

        // Add bank account specific fields
        if (account.accountType === 'bank') {
            account.hasDebitCard = document.getElementById('hasDebitCard')?.checked || false;
            if (account.hasDebitCard) {
                account.debitCardNumber = formData.get('debitCardNumber') || '';
            }
        }

        // Add credit card specific fields
        if (account.accountType === 'credit') {
            account.creditLimit = parseFloat(formData.get('creditLimit')) || 0;
            account.billingCycle = parseInt(formData.get('billingCycle')) || 1;
            account.minSpendQuarterly = parseFloat(formData.get('minSpendQuarterly')) || 0;
            account.annualFee = parseFloat(formData.get('annualFee')) || 0;
            account.rewardType = formData.get('rewardType');
        }

        // Add wallet specific fields
        if (account.accountType === 'wallet') {
            account.walletType = formData.get('walletType');
        }

        // Save
        if (this.currentAccountId) {
            Storage.updateAccount(this.currentAccountId, account);
            App.showToast('Account updated successfully', 'success');
        } else {
            Storage.addAccount(account);
            App.showToast('Account added successfully', 'success');
        }

        // Sync with Google Sheets
        if (SheetsAPI.isConfigured()) {
            try {
                if (this.currentAccountId) {
                    await SheetsAPI.updateAccount(this.currentAccountId, account);
                } else {
                    await SheetsAPI.addAccount(account);
                }
            } catch (error) {
                console.error('Failed to sync account:', error);
            }
        }

        // Close and refresh
        App.closeModal(document.getElementById('accountModal'));
        this.currentAccountId = null;
        this.loadStats();
        this.loadAccounts();
        this.loadRequirements();
        App.loadAccounts(); // Refresh dropdowns
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('bankAccountsList')) {
        Accounts.init();
    }
});

// Make Accounts globally available
window.Accounts = Accounts;
