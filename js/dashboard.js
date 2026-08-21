/**
 * FinanceFlow - Dashboard
 * Dashboard page functionality
 */

const Dashboard = {
    charts: {},

    /**
     * Initialize dashboard
     */
    async init() {
        // Show loader and sync from API for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            App.showLoader('Loading Dashboard', 'Syncing your data...');
            await this.syncFromAPI();
        }

        this.loadSummary();
        this.loadRecentTransactions();
        this.loadAccounts();
        this.initCharts();
        this.setupQuickAddForm();
        this.loadPendingTransactions();

        // Hide loader after everything is loaded
        App.hideLoader();
    },

    /**
     * Sync data from API
     */
    async syncFromAPI() {
        try {
            SheetsAPI.updateSyncStatus('syncing');
            const result = await SheetsAPI.syncFromSheets();
            if (result.success) {
                SheetsAPI.updateSyncStatus('synced');
            } else {
                SheetsAPI.updateSyncStatus('error');
            }
        } catch (error) {
            console.error('Sync error:', error);
            SheetsAPI.updateSyncStatus('error');
        }
    },

    /**
     * Load summary cards
     */
    loadSummary() {
        const now = new Date();
        const transactions = Storage.getTransactionsByMonth(now.getFullYear(), now.getMonth());
        const totals = App.calculateTotals(transactions);

        // Total Balance (all accounts)
        const accounts = Storage.getAccounts();
        const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.currentBalance) || 0), 0);

        // Update UI
        this.animateValue('totalBalance', totalBalance);
        this.animateValue('monthlyIncome', totals.income);
        this.animateValue('monthlyExpenses', totals.expense);

        // Credit used
        const creditCards = accounts.filter(a => a.accountType === 'credit');
        const creditUsed = creditCards.reduce((sum, c) => sum + (parseFloat(c.currentBalance) || 0), 0);
        const creditLimit = creditCards.reduce((sum, c) => sum + (parseFloat(c.creditLimit) || 0), 0);

        this.animateValue('creditUsed', creditUsed);

        // Update credit progress
        const creditProgress = document.getElementById('creditProgress');
        if (creditProgress && creditLimit > 0) {
            const percent = Math.min((creditUsed / creditLimit) * 100, 100);
            creditProgress.style.width = `${percent}%`;
        }
    },

    /**
     * Animate value change
     */
    animateValue(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const duration = 1000;
        const start = parseFloat(el.textContent.replace(/[₹,]/g, '')) || 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (targetValue - start) * easeOut;

            el.textContent = App.formatCurrency(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    /**
     * Load recent transactions
     */
    loadRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        if (!container) return;

        const transactions = Storage.getTransactions().slice(0, 5);

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(t => {
            const category = App.getCategory(t.category);
            const method = App.getPaymentMethod(t.paymentMethod);
            const isExpense = t.type === 'expense';

            return `
                <div class="transaction-item stagger-item">
                    <div class="transaction-icon ${t.category}">
                        ${category.icon}
                    </div>
                    <div class="transaction-details">
                        <h4>${t.description}</h4>
                        <p>${App.formatDate(t.date, 'relative')} • ${category.name}</p>
                    </div>
                    <div class="transaction-amount">
                        <span class="amount ${t.type}">${isExpense ? '-' : '+'}${App.formatCurrency(t.amount)}</span>
                        <span class="method">${method.icon} ${method.name}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Animate items
        setTimeout(() => {
            container.querySelectorAll('.stagger-item').forEach((item, i) => {
                setTimeout(() => item.classList.add('animated'), i * 50);
            });
        }, 100);
    },

    /**
     * Load accounts list
     */
    loadAccounts() {
        const container = document.getElementById('accountsList');
        if (!container) return;

        const accounts = Storage.getAccounts().slice(0, 4);

        if (accounts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-university"></i>
                    <p>No accounts added</p>
                </div>
            `;
            return;
        }

        container.innerHTML = accounts.map(acc => {
            const typeClass = acc.accountType === 'credit' ? 'credit' : acc.accountType === 'wallet' ? 'wallet' : 'bank';
            const initial = acc.bankName ? acc.bankName.charAt(0) : 'A';

            return `
                <div class="account-item stagger-item">
                    <div class="account-logo ${typeClass}">${initial}</div>
                    <div class="account-info">
                        <h4>${acc.name}</h4>
                        <p>${acc.bankName} • ****${acc.accountNumber || '0000'}</p>
                    </div>
                    <div class="account-balance">${App.formatCurrency(acc.currentBalance)}</div>
                </div>
            `;
        }).join('');

        // Animate items
        setTimeout(() => {
            container.querySelectorAll('.stagger-item').forEach((item, i) => {
                setTimeout(() => item.classList.add('animated'), i * 50);
            });
        }, 100);
    },

    /**
     * Initialize charts
     */
    initCharts() {
        this.initSpendingChart();
        this.initCategoryChart();
    },

    /**
     * Initialize spending chart
     */
    initSpendingChart() {
        const ctx = document.getElementById('spendingChart');
        if (!ctx) return;

        const now = new Date();
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));

            // Get transactions for this day
            const dayTransactions = Storage.getTransactions().filter(t => {
                const tDate = new Date(t.date);
                return tDate.toDateString() === date.toDateString();
            });

            const totals = App.calculateTotals(dayTransactions);
            incomeData.push(totals.income);
            expenseData.push(totals.expense);
        }

        this.charts.spending = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: CONFIG.CHART_COLORS.success,
                        borderRadius: 6
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: CONFIG.CHART_COLORS.error,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: value => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    /**
     * Initialize category chart
     */
    initCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const now = new Date();
        const transactions = Storage.getTransactionsByMonth(now.getFullYear(), now.getMonth())
            .filter(t => t.type === 'expense');

        const categoryGroups = App.groupByCategory(transactions);
        const categories = Object.entries(categoryGroups)
            .map(([id, data]) => ({
                category: App.getCategory(id),
                total: data.total
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);

        if (categories.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <p>No expense data</p>
                </div>
            `;
            return;
        }

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => c.category.name),
                datasets: [{
                    data: categories.map(c => c.total),
                    backgroundColor: CONFIG.CHART_COLORS.palette.slice(0, categories.length),
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                }
            }
        });
    },

    /**
     * Setup quick add form
     */
    /**
     * Re-encode an image to WebP in the browser before it is uploaded.
     *
     * A phone screenshot is 2-5 MB of PNG; base64 adds another third on the way to Apps
     * Script, and it lands in a Drive with a finite quota - for a picture whose only job is
     * to be legible. 1600px WebP takes the same screenshot to ~200 KB with no visible loss,
     * and turns an upload that looks broken on mobile data into one that feels instant.
     *
     * Falls back to the original bytes if anything here fails: a slightly large receipt
     * beats no receipt.
     */
    async compressImage(file, maxDim = 1600, quality = 0.82) {
        try {
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
            const w = Math.round(bitmap.width * scale);
            const h = Math.round(bitmap.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
            const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
            // Keep whichever is actually smaller - a small flat PNG can beat lossy WebP.
            if (!blob || blob.size >= file.size) return { blob: file, mime: file.type, name: file.name };
            const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
            return { blob, mime: 'image/webp', name };
        } catch (e) {
            console.warn('Receipt compression failed, sending the original', e);
            return { blob: file, mime: file.type, name: file.name };
        }
    },

    /** Blob -> bare base64 (no data: prefix, which Apps Script does not want). */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result).split(',')[1] || '');
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    },

    /**
     * Wire the receipt picker: preview, remove, and the pending file.
     * Held on the module rather than in the form, because a File cannot live in FormData
     * after the compression step replaces it.
     */
    setupReceiptPicker() {
        const input = document.getElementById('receipt');
        const btn = document.getElementById('receiptBtn');
        const preview = document.getElementById('receiptPreview');
        const thumb = document.getElementById('receiptThumb');
        const nameEl = document.getElementById('receiptName');
        const sizeEl = document.getElementById('receiptSize');
        const remove = document.getElementById('receiptRemove');
        if (!input || !btn) return;

        const clear = () => {
            this._pendingReceipt = null;
            input.value = '';
            if (preview) preview.hidden = true;
            btn.hidden = false;
            if (thumb && thumb.src.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
        };
        this._clearReceipt = clear;

        btn.addEventListener('click', () => input.click());
        if (remove) remove.addEventListener('click', clear);

        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return clear();
            if (!file.type.startsWith('image/')) {
                App.showToast('That is not an image file.', 'error');
                return clear();
            }
            this._pendingReceipt = file;
            if (thumb) {
                if (thumb.src.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
                thumb.src = URL.createObjectURL(file);
            }
            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) sizeEl.textContent = (file.size / 1024).toFixed(0) + ' KB';
            if (preview) preview.hidden = false;
            btn.hidden = true;
        });
    },

    setupQuickAddForm() {
        const form = document.getElementById('quickAddForm');
        if (!form) return;
        this.setupReceiptPicker();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const toggleActive = form.querySelector('.toggle-btn.active');
            const type = toggleActive ? toggleActive.dataset.type : 'expense';

            const transaction = {
                type,
                amount: parseFloat(formData.get('amount')),
                date: formData.get('date'),
                description: formData.get('description'),
                category: formData.get('category'),
                paymentMethod: formData.get('paymentMethod'),
                account: formData.get('account'),
                notes: formData.get('notes')
            };

            // THE RECEIPT GOES FIRST, because the transaction has to carry its file id -
            // but it must never be able to block the save. A failed upload warns and the
            // expense is recorded without an attachment; refusing the save would trade a
            // financial record for a screenshot, which is the wrong way round.
            if (this._pendingReceipt && SheetsAPI.isConfigured()) {
                const submitBtn = form.querySelector('button[type="submit"]');
                const restore = submitBtn ? submitBtn.innerHTML : null;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading receipt…';
                }
                try {
                    const { blob, mime, name } = await this.compressImage(this._pendingReceipt);
                    const base64 = await this.blobToBase64(blob);
                    const res = await SheetsAPI.request('uploadFile', {
                        fileName: name, mimeType: mime, data: base64
                    });
                    if (res && res.success && res.fileId) {
                        // The ID, not a URL: the file is private, so no URL would resolve.
                        transaction.attachmentFileId = res.fileId;
                        transaction.attachmentName = name;
                    } else {
                        App.showToast('Receipt could not be uploaded — saving the expense without it.', 'warning');
                    }
                } catch (err) {
                    console.error('Receipt upload failed:', err);
                    App.showToast('Receipt could not be uploaded — saving the expense without it.', 'warning');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = restore; }
                }
            }

            // Save to local storage
            Storage.addTransaction(transaction);

            // Try to sync with Google Sheets
            if (SheetsAPI.isConfigured()) {
                try {
                    await SheetsAPI.addTransaction(transaction);
                    SheetsAPI.updateSyncStatus('synced');
                } catch (error) {
                    console.error('Failed to sync transaction:', error);
                    SheetsAPI.updateSyncStatus('error');
                }
            }

            // Close modal and refresh
            App.closeModal(document.getElementById('quickAddModal'));
            form.reset();
            if (this._clearReceipt) this._clearReceipt();   // form.reset() cannot clear this
            App.showToast('Transaction added successfully!', 'success');

            // Refresh dashboard
            this.loadSummary();
            this.loadRecentTransactions();
            this.initCharts();
        });
    },

    /**
     * Load pending transactions from backend
     */
    async loadPendingTransactions() {
        if (!SheetsAPI.isConfigured()) return;

        try {
            const result = await SheetsAPI.request('getPendingTransactions', {});
            if (result.success && result.pending && result.pending.length > 0) {
                this.renderPendingTransactions(result.pending);
            }
        } catch (error) {
            console.error('Failed to load pending transactions:', error);
        }
    },

    /**
     * Render pending transactions
     */
    renderPendingTransactions(pending) {
        const section = document.getElementById('pendingTransactionsSection');
        const countEl = document.getElementById('pendingCount');
        const listEl = document.getElementById('pendingList');

        if (!section || !listEl) return;

        if (pending.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        if (countEl) countEl.textContent = pending.length;

        listEl.innerHTML = pending.map(item => `
            <div class="pending-item" data-id="${item.id}">
                <div class="pending-item-icon">
                    <i class="fas fa-credit-card"></i>
                </div>
                <div class="pending-item-info">
                    <h4>${item.description || 'Scheduled Transaction'}</h4>
                    <p>${item.sourcename || item.source || 'EMI'} | ${item.date}</p>
                </div>
                <div class="pending-item-amount">-${App.formatCurrency(item.amount)}</div>
                <div class="pending-item-actions">
                    <button class="btn-approve" onclick="Dashboard.approvePending('${item.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="Dashboard.rejectPending('${item.id}')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Approve pending transaction
     */
    async approvePending(id) {
        if (!SheetsAPI.isConfigured()) return;

        try {
            const result = await SheetsAPI.request('approvePendingTransaction', { id });
            if (result.success) {
                App.showToast('Transaction approved and added!', 'success');
                this.loadPendingTransactions();
                this.loadSummary();
                this.loadRecentTransactions();
            } else {
                App.showToast(result.error || 'Failed to approve', 'error');
            }
        } catch (error) {
            App.showToast('Error: ' + error.message, 'error');
        }
    },

    /**
     * Reject pending transaction
     */
    async rejectPending(id) {
        if (!confirm('Are you sure you want to cancel this scheduled transaction?')) return;

        if (!SheetsAPI.isConfigured()) return;

        try {
            const result = await SheetsAPI.request('rejectPendingTransaction', { id });
            if (result.success) {
                App.showToast('Transaction cancelled', 'success');
                this.loadPendingTransactions();
            } else {
                App.showToast(result.error || 'Failed to cancel', 'error');
            }
        } catch (error) {
            App.showToast('Error: ' + error.message, 'error');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('spendingChart')) {
        Dashboard.init();
    }
});

// Make Dashboard globally available
window.Dashboard = Dashboard;
