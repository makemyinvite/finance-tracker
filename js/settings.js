/**
 * FinanceFlow - Settings
 * Settings page functionality
 */

const Settings = {
    /**
     * Initialize settings page
     */
    async init() {
        // Show loader and sync from API for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            App.showLoader('Loading Settings', 'Syncing your data...');
            await this.syncFromAPI();
        }

        this.loadSettings();
        this.loadAutomationSettings();
        this.setupEventListeners();
        this.setupAutomationListeners();

        App.hideLoader();
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
     * Load current settings
     */
    loadSettings() {
        const settings = Storage.getSettings();

        // Load form values
        document.getElementById('sheetUrl').value = Storage.getSheetUrl();
        document.getElementById('webAppUrl').value = Storage.getWebAppUrl();
        document.getElementById('currency').value = settings.currency || 'INR';
        document.getElementById('dateFormat').value = settings.dateFormat || 'DD/MM/YYYY';
        document.getElementById('fiscalYearStart').value = settings.fiscalYearStart || 4;
        document.getElementById('weekStart').value = settings.weekStart || 1;

        // Theme
        const savedTheme = settings.theme || 'light';
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.checked = input.value === savedTheme;
        });
        // Apply theme to body
        document.body.dataset.theme = savedTheme;

        // Toggles
        const compactMode = document.getElementById('compactMode');
        const animations = document.getElementById('animations');
        if (compactMode) compactMode.checked = settings.compactMode || false;
        if (animations) animations.checked = settings.animations !== false;

        // Update toggle switch states
        this.updateToggleSwitch(compactMode);
        this.updateToggleSwitch(animations);

        // Check connection status
        this.checkConnection();
    },

    /**
     * Update toggle switch visual state
     */
    updateToggleSwitch(checkbox) {
        if (!checkbox) return;
        const toggle = checkbox.nextElementSibling;
        if (toggle && toggle.classList.contains('toggle-switch')) {
            toggle.style.background = checkbox.checked ? 'var(--primary)' : 'var(--light-200)';
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Test connection
        document.getElementById('testConnection')?.addEventListener('click', () => this.testConnection());

        // Save connection settings
        document.getElementById('saveConnection')?.addEventListener('click', () => this.saveConnectionSettings());

        // Export data
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());

        // Import data
        document.getElementById('importData')?.addEventListener('click', () => this.importData());

        // Sync now
        document.getElementById('syncNow')?.addEventListener('click', () => this.syncNow());

        // Clear local data
        document.getElementById('clearLocalData')?.addEventListener('click', () => this.clearLocalData());

        // Theme selection
        document.querySelectorAll('input[name="theme"]').forEach(input => {
            input.addEventListener('change', (e) => this.changeTheme(e.target.value));
        });

        // Toggle switches
        document.querySelectorAll('.toggle-label input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateToggleSwitch(e.target);
                this.savePreferences();
            });
        });

        // Other preference changes
        document.querySelectorAll('#currency, #dateFormat, #fiscalYearStart, #weekStart').forEach(select => {
            select.addEventListener('change', () => this.savePreferences());
        });

        // Theme option hover effects
        document.querySelectorAll('.theme-option').forEach(option => {
            const box = option.querySelector('div');
            option.addEventListener('mouseenter', () => {
                box.style.borderColor = 'var(--primary)';
            });
            option.addEventListener('mouseleave', () => {
                const input = option.querySelector('input');
                if (!input.checked) {
                    box.style.borderColor = 'var(--light-200)';
                }
            });
        });
    },

    /**
     * Check connection status
     */
    async checkConnection() {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;

        const webAppUrl = Storage.getWebAppUrl();
        if (!webAppUrl) {
            statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--light-300);"></i> Not connected';
            return;
        }

        try {
            const connected = await SheetsAPI.testConnection();
            if (connected) {
                statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--success);"></i> Connected';
            } else {
                statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--error);"></i> Connection failed';
            }
        } catch (error) {
            statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--error);"></i> Error';
        }
    },

    /**
     * Test connection
     */
    async testConnection() {
        const statusEl = document.getElementById('connectionStatus');
        const webAppUrl = document.getElementById('webAppUrl')?.value;

        if (!webAppUrl) {
            App.showToast('Please enter a Web App URL', 'warning');
            return;
        }

        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';

        // Temporarily save URL for testing
        const oldUrl = Storage.getWebAppUrl();
        Storage.saveWebAppUrl(webAppUrl);

        try {
            const connected = await SheetsAPI.testConnection();
            if (connected) {
                statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--success);"></i> Connected';
                App.showToast('Connection successful!', 'success');
            } else {
                statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--error);"></i> Connection failed';
                App.showToast('Connection failed. Check your Web App URL.', 'error');
                Storage.saveWebAppUrl(oldUrl);
            }
        } catch (error) {
            statusEl.innerHTML = '<i class="fas fa-circle" style="color: var(--error);"></i> Error';
            App.showToast('Connection error: ' + error.message, 'error');
            Storage.saveWebAppUrl(oldUrl);
        }
    },

    /**
     * Save connection settings
     */
    saveConnectionSettings() {
        const sheetUrl = document.getElementById('sheetUrl')?.value;
        const webAppUrl = document.getElementById('webAppUrl')?.value;

        Storage.saveSheetUrl(sheetUrl);
        Storage.saveWebAppUrl(webAppUrl);

        App.showToast('Connection settings saved', 'success');
        this.checkConnection();
    },

    /**
     * Save general preferences
     */
    async savePreferences() {
        const saveBtn = document.querySelector('.settings-section .btn-primary');
        const originalText = saveBtn ? saveBtn.innerHTML : '';

        // Show loading state
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }

        const settings = {
            currency: document.getElementById('currency')?.value || 'INR',
            dateFormat: document.getElementById('dateFormat')?.value || 'DD/MM/YYYY',
            fiscalYearStart: parseInt(document.getElementById('fiscalYearStart')?.value) || 4,
            weekStart: parseInt(document.getElementById('weekStart')?.value) || 1,
            theme: document.querySelector('input[name="theme"]:checked')?.value || 'light',
            compactMode: document.getElementById('compactMode')?.checked || false,
            animations: document.getElementById('animations')?.checked !== false
        };

        // Save locally
        Storage.saveSettings(settings);

        // Sync to Google Sheets
        if (SheetsAPI.isConfigured()) {
            try {
                const result = await SheetsAPI.request('saveGeneralSettings', { settings });
                if (result.success) {
                    App.showToast('Settings saved successfully', 'success');
                } else {
                    App.showToast('Settings saved locally. Server sync failed.', 'warning');
                }
            } catch (error) {
                console.error('Failed to sync settings:', error);
                App.showToast('Settings saved locally. Could not sync to server.', 'warning');
            }
        } else {
            App.showToast('Settings saved locally', 'success');
        }

        // Restore button
        if (saveBtn) {
            saveBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Save';
            saveBtn.disabled = false;
        }
    },

    /**
     * Change theme
     */
    changeTheme(theme) {
        document.body.dataset.theme = theme;
        // Update theme option borders
        document.querySelectorAll('.theme-option').forEach(option => {
            const input = option.querySelector('input');
            const box = option.querySelector('div');
            box.style.borderColor = input.checked ? 'var(--primary)' : 'var(--light-200)';
        });
        this.savePreferences();
    },

    /**
     * Export all data
     */
    exportData() {
        const data = Storage.exportData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `financeflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        App.showToast('Data exported successfully', 'success');
    },

    /**
     * Import data
     */
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (confirm('This will replace all your local data. Continue?')) {
                        Storage.importData(data);
                        App.showToast('Data imported successfully', 'success');
                        setTimeout(() => location.reload(), 1000);
                    }
                } catch (error) {
                    App.showToast('Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        });

        input.click();
    },

    /**
     * Sync with Google Sheets
     */
    async syncNow() {
        if (!SheetsAPI.isConfigured()) {
            App.showToast('Please configure Google Sheets first', 'warning');
            return;
        }

        SheetsAPI.updateSyncStatus('syncing');
        App.showToast('Syncing...', 'info');

        try {
            const result = await SheetsAPI.syncFromSheets();
            if (result.success) {
                SheetsAPI.updateSyncStatus('synced');
                App.showToast('Sync completed', 'success');
            } else {
                SheetsAPI.updateSyncStatus('error');
                App.showToast('Sync failed: ' + result.message, 'error');
            }
        } catch (error) {
            SheetsAPI.updateSyncStatus('error');
            App.showToast('Sync error: ' + error.message, 'error');
        }
    },

    /**
     * Clear local data
     */
    clearLocalData() {
        if (confirm('Are you sure you want to clear all local data? This cannot be undone!')) {
            if (confirm('This will delete all your accounts, transactions, and settings. Are you absolutely sure?')) {
                Storage.clearAll();
                App.showToast('Local data cleared', 'success');
                setTimeout(() => location.reload(), 1000);
            }
        }
    },

    /**
     * Load automation settings
     */
    async loadAutomationSettings() {
        // Load from local storage first
        const autoSettings = JSON.parse(localStorage.getItem('financeflow_automation') || '{}');

        // Set form values
        const autoRecordEmi = document.getElementById('autoRecordEmi');
        const emiReminders = document.getElementById('emiReminders');
        const weeklySummary = document.getElementById('weeklySummary');
        const monthlyReport = document.getElementById('monthlyReport');
        const autoRecurring = document.getElementById('autoRecurring');

        if (autoRecordEmi) {
            autoRecordEmi.checked = autoSettings.autoRecordEmi !== false;
            this.updateToggleSwitch(autoRecordEmi);
        }
        if (emiReminders) {
            emiReminders.checked = autoSettings.emiReminders !== false;
            this.updateToggleSwitch(emiReminders);
        }
        if (weeklySummary) {
            weeklySummary.checked = autoSettings.weeklySummary || false;
            this.updateToggleSwitch(weeklySummary);
        }
        if (monthlyReport) {
            monthlyReport.checked = autoSettings.monthlyReport || false;
            this.updateToggleSwitch(monthlyReport);
        }
        if (autoRecurring) {
            autoRecurring.checked = autoSettings.autoRecurring !== false;
            this.updateToggleSwitch(autoRecurring);
        }

        // Set time/day selectors
        const selectors = {
            'emiRecordTime': autoSettings.emiRecordTime || '10',
            'emiReminderDays': autoSettings.emiReminderDays || '3',
            'emiReminderTime': autoSettings.emiReminderTime || '9',
            'summaryDay': autoSettings.summaryDay || '1',
            'summaryTime': autoSettings.summaryTime || '9',
            'monthlyReportDay': autoSettings.monthlyReportDay || '1',
            'monthlyReportTime': autoSettings.monthlyReportTime || '9',
            'recurringMode': autoSettings.recurringMode || 'confirm',
            'notifyEmail': autoSettings.notifyEmail || '',
            'notifyCc': autoSettings.notifyCc || ''
        };

        for (const [id, value] of Object.entries(selectors)) {
            const el = document.getElementById(id);
            if (el) el.value = value;
        }

        // Try to load from server if configured
        if (SheetsAPI.isConfigured()) {
            try {
                const result = await SheetsAPI.request('getAutomationSettings', {});
                if (result.success && result.settings) {
                    // Update with server settings
                    Object.assign(autoSettings, result.settings);
                    localStorage.setItem('financeflow_automation', JSON.stringify(autoSettings));
                }
            } catch (error) {
                console.log('Could not load automation settings from server:', error);
            }
        }
    },

    /**
     * Save automation settings
     */
    async saveAutomationSettings() {
        const saveBtn = document.getElementById('saveAutomationSettings');
        const originalText = saveBtn ? saveBtn.innerHTML : '';

        // Show loading state
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
        }

        const autoSettings = {
            autoRecordEmi: document.getElementById('autoRecordEmi')?.checked,
            emiReminders: document.getElementById('emiReminders')?.checked,
            weeklySummary: document.getElementById('weeklySummary')?.checked,
            monthlyReport: document.getElementById('monthlyReport')?.checked,
            autoRecurring: document.getElementById('autoRecurring')?.checked,
            recurringMode: document.getElementById('recurringMode')?.value || 'confirm',
            emiRecordTime: document.getElementById('emiRecordTime')?.value,
            emiReminderDays: document.getElementById('emiReminderDays')?.value,
            emiReminderTime: document.getElementById('emiReminderTime')?.value,
            summaryDay: document.getElementById('summaryDay')?.value,
            summaryTime: document.getElementById('summaryTime')?.value,
            monthlyReportDay: document.getElementById('monthlyReportDay')?.value,
            monthlyReportTime: document.getElementById('monthlyReportTime')?.value,
            notifyEmail: document.getElementById('notifyEmail')?.value,
            notifyCc: document.getElementById('notifyCc')?.value
        };

        // Save locally
        localStorage.setItem('financeflow_automation', JSON.stringify(autoSettings));

        // Save to server if configured
        if (SheetsAPI.isConfigured()) {
            try {
                const result = await SheetsAPI.request('saveAutomationSettings', { settings: autoSettings });
                if (result.success) {
                    App.showToast('Automation settings saved successfully', 'success');
                } else {
                    App.showToast('Settings saved locally. Server sync failed.', 'warning');
                }
            } catch (error) {
                App.showToast('Settings saved locally. Could not sync to server.', 'warning');
            }
        } else {
            App.showToast('Settings saved locally', 'success');
        }

        // Restore button
        if (saveBtn) {
            saveBtn.innerHTML = originalText || '<i class="fas fa-save"></i> Save Settings';
            saveBtn.disabled = false;
        }
    },

    /**
     * Setup automation event listeners
     */
    setupAutomationListeners() {
        // Save automation settings button
        document.getElementById('saveAutomationSettings')?.addEventListener('click', () => {
            this.saveAutomationSettings();
        });

        // Toggle switch updates
        ['autoRecordEmi', 'emiReminders', 'weeklySummary', 'monthlyReport', 'autoRecurring'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    this.updateToggleSwitch(el);
                });
            }
        });

        // Manual send buttons
        document.getElementById('sendWeeklySummaryNow')?.addEventListener('click', () => {
            this.sendReportNow('weekly');
        });

        document.getElementById('sendMonthlyReportNow')?.addEventListener('click', () => {
            this.sendReportNow('monthly');
        });
    },

    /**
     * Manually trigger a report
     */
    async sendReportNow(type) {
        if (!SheetsAPI.isConfigured()) {
            App.showToast('Please configure Google Sheets first', 'warning');
            return;
        }

        const btn = document.getElementById(type === 'weekly' ? 'sendWeeklySummaryNow' : 'sendMonthlyReportNow');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        btn.disabled = true;

        try {
            const result = await SheetsAPI.request('sendReportNow', { type });
            if (result.success) {
                App.showToast(`${type === 'weekly' ? 'Weekly summary' : 'Monthly report'} sent successfully!`, 'success');
            } else {
                App.showToast(result.error || 'Failed to send report', 'error');
            }
        } catch (error) {
            App.showToast('Error sending report: ' + error.message, 'error');
        }

        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.settings-content')) {
        Settings.init();
    }
});

window.Settings = Settings;
