/**
 * FinanceFlow - Google Sheets API
 * Handles communication with Google Apps Script backend
 */

const SheetsAPI = {
    /**
     * Get the web app URL
     */
    /**
     * THE CONSTANT, DIRECTLY. One backend, one address, declared in js/config.js.
     *
     * This used to go through Storage.getWebAppUrl(), which read localStorage — so a value
     * saved once outranked every later release, and an older deployment meant a different
     * SPREADSHEET. That is what made login answer "User not found" for an account sitting
     * visibly in the sheet. No lookup, no default parameter, no stored value in the path:
     * that failure cannot recur.
     */
    getWebAppUrl() {
        return (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_WEB_APP_URL) || '';
    },

    /**
     * Check if API is configured
     * Demo mode is always "configured" (uses localStorage)
     */
    isConfigured() {
        if (this.isDemoMode()) {
            return true; // Demo mode always works
        }
        return !!this.getWebAppUrl();
    },

    /**
     * Get auth token
     */
    getToken() {
        return localStorage.getItem('financeflow_token');
    },

    /**
     * Get current user info
     */
    getCurrentUser() {
        return Storage.get('financeflow_user', null);
    },

    /**
     * Check if in demo mode
     */
    isDemoMode() {
        return localStorage.getItem('financeflow_demo_mode') === 'true';
    },

    /**
     * Make API request (automatically includes auth token)
     * Skips backend calls in demo mode - data stays in localStorage only
     */
    async request(action, data = {}) {
        // Skip backend calls in demo mode - everything stays in localStorage
        if (this.isDemoMode()) {
            console.log(`[Demo Mode] Handling action locally: ${action}`);
            return this.handleDemoAction(action, data);
        }

        const url = this.getWebAppUrl();
        if (!url) {
            throw new Error('Google Sheets not configured. Please add your Web App URL in Settings.');
        }

        // Get auth token and user info
        const token = this.getToken();
        const user = this.getCurrentUser();

        try {
            // Google Apps Script requires special handling
            // Don't use Content-Type: application/json as it triggers CORS preflight
            const response = await fetch(url, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify({
                    action,
                    token, // Include auth token
                    userEmail: user?.email || null, // Include user email for logging
                    userName: user?.name || null, // Include user name for logging
                    ...data
                })
            });

            // Google Apps Script returns a redirect, need to handle it
            const text = await response.text();

            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse response:', text);
                throw new Error('Invalid response from server');
            }

            // A STRUCTURED REFUSAL IS DATA, NOT AN EXCEPTION. This used to throw whenever
            // the server returned { success:false, error:"..." } — so "Invalid email or
            // password", "Unauthorized" and "Ask an owner to add your email first" all
            // became exceptions, and every caller's catch block reported a network problem
            // while the network was fine. Worse than vague: it points the user at their
            // connection when the real answer was in the response.
            // Returned now, so callers can read result.error. Throwing is reserved for a
            // request that never completed.

            console.log(`API ${action} success:`, result);
            return result;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    /**
     * Handle actions locally in demo mode
     * All data stays in localStorage, no backend sync
     */
    handleDemoAction(action, data) {
        const LOGS_KEY = 'financeflow_demo_logs';

        // Handle log writing
        if (action === 'writeLog') {
            const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
            logs.unshift({
                id: 'log_' + Date.now(),
                timestamp: new Date().toISOString(),
                level: data.level || 'info',
                source: data.source || 'System',
                message: data.message || '',
                details: data.details || '',
                user: 'Demo User'
            });
            // Keep only last 500 logs
            if (logs.length > 500) logs.length = 500;
            localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
            return { success: true, demo: true };
        }

        // Handle log reading
        if (action === 'getLogs') {
            const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
            return { success: true, demo: true, logs: logs, total: logs.length };
        }

        // Handle test connection
        if (action === 'test') {
            return { success: true, demo: true, message: 'Demo mode active - data stored locally' };
        }

        // Handle send report - show demo message
        if (action === 'sendReportNow') {
            return { success: true, demo: true, message: 'Demo mode - email not sent (no backend)' };
        }

        // Handle pending transactions
        if (action === 'getPendingTransactions') {
            return { success: true, demo: true, pending: [] };
        }

        if (action === 'approvePendingTransaction' || action === 'rejectPendingTransaction') {
            return { success: true, demo: true };
        }

        // Handle automation/notification settings
        if (action === 'getAutomationSettings') {
            const settings = JSON.parse(localStorage.getItem('financeflow_automation_settings') || '{}');
            return { success: true, demo: true, settings: settings };
        }

        if (action === 'saveAutomationSettings') {
            localStorage.setItem('financeflow_automation_settings', JSON.stringify(data.settings || {}));
            return { success: true, demo: true };
        }

        if (action === 'saveGeneralSettings') {
            return { success: true, demo: true };
        }

        if (action === 'saveEmiSettings') {
            return { success: true, demo: true };
        }

        // For all write operations, just return success
        // (localStorage is handled by Storage module)
        const writeActions = ['addTransaction', 'updateTransaction', 'deleteTransaction',
            'addAccount', 'updateAccount', 'deleteAccount', 'saveInvestment',
            'saveEmi', 'updateEmi', 'deleteEmi', 'saveSettings', 'saveInvestmentNotifications',
            'logout', 'uploadFile'];
        if (writeActions.includes(action)) {
            return { success: true, demo: true };
        }

        // For read operations, return empty (localStorage handles data)
        return { success: true, demo: true, data: [], transactions: [], accounts: [], pending: [] };
    },

    /**
     * Test connection
     */
    async testConnection() {
        try {
            const result = await this.request('test');
            return result.success === true;
        } catch (error) {
            return false;
        }
    },

    // ================== TRANSACTIONS ==================

    /**
     * Add transaction
     */
    async addTransaction(transaction) {
        return this.request('addTransaction', { transaction });
    },

    /**
     * Update transaction
     */
    async updateTransaction(id, transaction) {
        return this.request('updateTransaction', { id, transaction });
    },

    /**
     * Delete transaction
     */
    async deleteTransaction(id) {
        return this.request('deleteTransaction', { id });
    },

    /**
     * Get transactions by month
     */
    async getTransactionsByMonth(year, month) {
        return this.request('getTransactionsByMonth', { year, month });
    },

    /**
     * Get all transactions
     */
    async getAllTransactions() {
        return this.request('getAllTransactions');
    },

    // ================== ACCOUNTS ==================

    /**
     * Add account
     */
    async addAccount(account) {
        return this.request('addAccount', { account });
    },

    /**
     * Update account
     */
    async updateAccount(id, account) {
        return this.request('updateAccount', { id, account });
    },

    /**
     * Delete account
     */
    async deleteAccount(id) {
        return this.request('deleteAccount', { id });
    },

    /**
     * Get all accounts
     */
    async getAccounts() {
        return this.request('getAccounts');
    },

    // ================== CATEGORIES ==================

    /**
     * Add category
     */
    async addCategory(category) {
        return this.request('addCategory', { category });
    },

    /**
     * Get categories
     */
    async getCategories() {
        return this.request('getCategories');
    },

    // ================== SYNC ==================

    /**
     * Normalize object keys from lowercase to camelCase
     */
    normalizeKeys(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.normalizeKeys(item));

        const keyMap = {
            'accounttype': 'accountType',
            'bankname': 'bankName',
            'accountnumber': 'accountNumber',
            'currentbalance': 'currentBalance',
            'creditlimit': 'creditLimit',
            'billingcycle': 'billingCycle',
            'annualfee': 'annualFee',
            'rewardtype': 'rewardType',
            'wallettype': 'walletType',
            'minquarterlyspend': 'minSpendQuarterly',
            'hasdebitcard': 'hasDebitCard',
            'debitcardnumber': 'debitCardNumber',
            'createdat': 'createdAt',
            'updatedat': 'updatedAt',
            'transactiontype': 'type',
            'paymentmethod': 'paymentMethod',
            'categoryid': 'category',
            'accountid': 'account',
            'toaccountid': 'toAccount'
        };

        const normalized = {};
        for (const [key, value] of Object.entries(obj)) {
            const newKey = keyMap[key.toLowerCase()] || key;
            normalized[newKey] = this.normalizeKeys(value);
        }
        return normalized;
    },

    /**
     * Full sync - pull data from sheets
     */
    async syncFromSheets() {
        try {
            const result = await this.request('syncAll');

            if (result.success) {
                // Normalize keys and update local storage with synced data
                if (result.accounts && result.accounts.length > 0) {
                    const normalizedAccounts = this.normalizeKeys(result.accounts);
                    console.log('Normalized accounts:', normalizedAccounts);
                    Storage.saveAccounts(normalizedAccounts);
                }
                if (result.transactions && result.transactions.length > 0) {
                    const normalizedTransactions = this.normalizeKeys(result.transactions);
                    Storage.saveTransactions(normalizedTransactions);
                }
                if (result.categories) {
                    const normalizedCategories = this.normalizeKeys(result.categories);
                    Storage.saveCategories(normalizedCategories);
                }

                return { success: true, message: 'Sync completed successfully' };
            }

            return { success: false, message: result.error || 'Sync failed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Push local data to sheets
     */
    async pushToSheets() {
        try {
            const data = {
                accounts: Storage.getAccounts(),
                transactions: Storage.getTransactions(),
                categories: Storage.getCategories()
            };

            const result = await this.request('pushAll', { data });
            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    /**
     * Update sync status UI
     */
    updateSyncStatus(status) {
        const syncEl = document.getElementById('syncStatus');
        if (!syncEl) return;

        const statuses = {
            synced: { icon: 'fa-cloud-upload-alt', text: 'Synced with Sheets', class: 'synced' },
            syncing: { icon: 'fa-sync fa-spin', text: 'Syncing...', class: 'syncing' },
            error: { icon: 'fa-exclamation-triangle', text: 'Sync error', class: 'error' },
            offline: { icon: 'fa-cloud-slash', text: 'Offline mode', class: 'offline' }
        };

        const s = statuses[status] || statuses.offline;
        syncEl.innerHTML = `<i class="fas ${s.icon}"></i><span>${s.text}</span>`;
        syncEl.className = `sync-status ${s.class}`;
    }
};

// Make SheetsAPI globally available
window.SheetsAPI = SheetsAPI;
