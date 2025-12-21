/**
 * FinanceFlow - Local Storage Manager
 * Handles all local storage operations with fallback support
 */

const Storage = {
    /**
     * Check if localStorage is available
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get item from localStorage
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null || item === 'undefined') return defaultValue;
            return JSON.parse(item);
        } catch (e) {
            console.error(`Error reading from storage: ${key}`, e);
            return defaultValue;
        }
    },

    /**
     * Set item in localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Error writing to storage: ${key}`, e);
            return false;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error removing from storage: ${key}`, e);
            return false;
        }
    },

    /**
     * Clear all app data from localStorage
     */
    clearAll() {
        try {
            Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Error clearing storage', e);
            return false;
        }
    },

    // ================== ACCOUNTS ==================

    /**
     * Get all accounts
     */
    getAccounts() {
        return this.get(CONFIG.STORAGE_KEYS.ACCOUNTS, []);
    },

    /**
     * Save all accounts
     */
    saveAccounts(accounts) {
        return this.set(CONFIG.STORAGE_KEYS.ACCOUNTS, accounts);
    },

    /**
     * Add new account
     */
    addAccount(account) {
        const accounts = this.getAccounts();
        account.id = account.id || this.generateId();
        account.createdAt = new Date().toISOString();
        account.updatedAt = new Date().toISOString();
        accounts.push(account);
        this.saveAccounts(accounts);
        return account;
    },

    /**
     * Update account
     */
    updateAccount(id, updates) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === id);
        if (index !== -1) {
            accounts[index] = { ...accounts[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveAccounts(accounts);
            return accounts[index];
        }
        return null;
    },

    /**
     * Delete account
     */
    deleteAccount(id) {
        const accounts = this.getAccounts();
        const filtered = accounts.filter(a => a.id !== id);
        this.saveAccounts(filtered);
        return true;
    },

    /**
     * Get account by ID
     */
    getAccountById(id) {
        const accounts = this.getAccounts();
        return accounts.find(a => a.id === id) || null;
    },

    // ================== TRANSACTIONS ==================

    /**
     * Get all transactions
     */
    getTransactions() {
        return this.get(CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
    },

    /**
     * Save all transactions
     */
    saveTransactions(transactions) {
        return this.set(CONFIG.STORAGE_KEYS.TRANSACTIONS, transactions);
    },

    /**
     * Add new transaction
     */
    addTransaction(transaction) {
        const transactions = this.getTransactions();
        transaction.id = transaction.id || this.generateId();
        transaction.createdAt = new Date().toISOString();
        transaction.updatedAt = new Date().toISOString();
        transactions.unshift(transaction); // Add to beginning
        this.saveTransactions(transactions);

        // Update account balance
        this.updateAccountBalance(transaction.account, transaction.amount, transaction.type);

        return transaction;
    },

    /**
     * Update transaction
     */
    updateTransaction(id, updates) {
        const transactions = this.getTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            const oldTransaction = transactions[index];

            // Reverse old balance change
            this.updateAccountBalance(oldTransaction.account, -oldTransaction.amount, oldTransaction.type);

            // Apply updates
            transactions[index] = { ...oldTransaction, ...updates, updatedAt: new Date().toISOString() };
            this.saveTransactions(transactions);

            // Apply new balance change
            this.updateAccountBalance(transactions[index].account, transactions[index].amount, transactions[index].type);

            return transactions[index];
        }
        return null;
    },

    /**
     * Delete transaction
     */
    deleteTransaction(id) {
        const transactions = this.getTransactions();
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            // Reverse balance change
            this.updateAccountBalance(transaction.account, -transaction.amount, transaction.type);
        }
        const filtered = transactions.filter(t => t.id !== id);
        this.saveTransactions(filtered);
        return true;
    },

    /**
     * Get transaction by ID
     */
    getTransactionById(id) {
        const transactions = this.getTransactions();
        return transactions.find(t => t.id === id) || null;
    },

    /**
     * Get transactions by month
     */
    getTransactionsByMonth(year, month) {
        const transactions = this.getTransactions();
        return transactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });
    },

    /**
     * Get transactions by date range
     */
    getTransactionsByDateRange(startDate, endDate) {
        const transactions = this.getTransactions();
        const start = new Date(startDate);
        const end = new Date(endDate);
        return transactions.filter(t => {
            const date = new Date(t.date);
            return date >= start && date <= end;
        });
    },

    /**
     * Update account balance after transaction
     */
    updateAccountBalance(accountId, amount, type) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === accountId);
        if (index !== -1) {
            const change = type === 'income' ? amount : -amount;
            accounts[index].currentBalance = (parseFloat(accounts[index].currentBalance) || 0) + change;
            this.saveAccounts(accounts);
        }
    },

    // ================== CATEGORIES ==================

    /**
     * Get all categories
     */
    getCategories() {
        const saved = this.get(CONFIG.STORAGE_KEYS.CATEGORIES);
        if (saved) return saved;
        // Return default categories if none saved
        return CONFIG.DEFAULT_CATEGORIES;
    },

    /**
     * Save categories
     */
    saveCategories(categories) {
        return this.set(CONFIG.STORAGE_KEYS.CATEGORIES, categories);
    },

    /**
     * Add custom category
     */
    addCategory(type, category) {
        const categories = this.getCategories();
        category.id = category.id || this.generateId();
        category.custom = true;
        categories[type].push(category);
        this.saveCategories(categories);
        return category;
    },

    /**
     * Delete custom category
     */
    deleteCategory(type, id) {
        const categories = this.getCategories();
        categories[type] = categories[type].filter(c => c.id !== id);
        this.saveCategories(categories);
        return true;
    },

    // ================== SETTINGS ==================

    /**
     * Get settings
     */
    getSettings() {
        return this.get(CONFIG.STORAGE_KEYS.SETTINGS, {
            currency: 'INR',
            dateFormat: 'DD/MM/YYYY',
            fiscalYearStart: 4,
            weekStart: 1,
            theme: 'light',
            compactMode: false,
            animations: true
        });
    },

    /**
     * Save settings
     */
    saveSettings(settings) {
        return this.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
    },

    /**
     * Update specific setting
     */
    updateSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        return this.saveSettings(settings);
    },

    // ================== GOOGLE SHEETS CONFIG ==================

    /**
     * Get Sheet URL
     */
    getSheetUrl() {
        return this.get(CONFIG.STORAGE_KEYS.SHEET_URL, '');
    },

    /**
     * Save Sheet URL
     */
    saveSheetUrl(url) {
        return this.set(CONFIG.STORAGE_KEYS.SHEET_URL, url);
    },

    /**
     * Get Web App URL
     */
    getWebAppUrl() {
        return this.get(CONFIG.STORAGE_KEYS.WEB_APP_URL, CONFIG.DEFAULT_WEB_APP_URL || '');
    },

    /**
     * Save Web App URL
     */
    saveWebAppUrl(url) {
        return this.set(CONFIG.STORAGE_KEYS.WEB_APP_URL, url);
    },

    // ================== BUDGETS ==================

    /**
     * Get budgets
     */
    getBudgets() {
        return this.get(CONFIG.STORAGE_KEYS.BUDGETS, []);
    },

    /**
     * Save budgets
     */
    saveBudgets(budgets) {
        return this.set(CONFIG.STORAGE_KEYS.BUDGETS, budgets);
    },

    // ================== UTILITIES ==================

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Export all data as JSON
     */
    exportData() {
        return {
            accounts: this.getAccounts(),
            transactions: this.getTransactions(),
            categories: this.getCategories(),
            budgets: this.getBudgets(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString(),
            version: CONFIG.VERSION
        };
    },

    /**
     * Import data from JSON
     */
    importData(data) {
        try {
            if (data.accounts) this.saveAccounts(data.accounts);
            if (data.transactions) this.saveTransactions(data.transactions);
            if (data.categories) this.saveCategories(data.categories);
            if (data.budgets) this.saveBudgets(data.budgets);
            if (data.settings) this.saveSettings(data.settings);
            return true;
        } catch (e) {
            console.error('Error importing data', e);
            return false;
        }
    }
};

// Make Storage globally available
window.Storage = Storage;
