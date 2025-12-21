/**
 * FinanceFlow - Reports
 * Reports page functionality
 */

const Reports = {
    charts: {},
    currentDate: new Date(),
    currentPeriod: 'month',

    /**
     * Initialize reports page
     */
    async init() {
        // Show loader and sync from API for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            App.showLoader('Loading Reports', 'Syncing your data...');
            await this.syncFromAPI();
        }

        this.setupEventListeners();
        this.updateMonthDisplay();
        this.loadOverview();
        this.initAllCharts();
        this.loadCategoryBreakdown();
        this.loadTopExpenses();

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
     * Setup event listeners
     */
    setupEventListeners() {
        // Period selector
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                this.refreshData();
            });
        });

        // Month navigation
        document.getElementById('prevMonth')?.addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth')?.addEventListener('click', () => this.changeMonth(1));

        // Breakdown type filter
        document.getElementById('breakdownType')?.addEventListener('change', () => this.loadCategoryBreakdown());

        // Export
        document.getElementById('exportReport')?.addEventListener('click', () => this.exportReport());
    },

    /**
     * Update month display
     */
    updateMonthDisplay() {
        const monthEl = document.getElementById('currentMonth');
        if (monthEl) {
            monthEl.textContent = this.currentDate.toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric'
            });
        }
    },

    /**
     * Change month
     */
    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.updateMonthDisplay();
        this.refreshData();
    },

    /**
     * Refresh all data
     */
    refreshData() {
        this.loadOverview();
        this.initAllCharts();
        this.loadCategoryBreakdown();
        this.loadTopExpenses();
    },

    /**
     * Get transactions for current period
     */
    getTransactionsForPeriod() {
        const transactions = Storage.getTransactions();
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        let start, end;

        switch (this.currentPeriod) {
            case 'week':
                const today = new Date();
                const dayOfWeek = today.getDay();
                start = new Date(today);
                start.setDate(today.getDate() - dayOfWeek);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case 'quarter':
                const quarter = Math.floor(month / 3);
                start = new Date(year, quarter * 3, 1);
                end = new Date(year, quarter * 3 + 3, 0);
                break;
            case 'year':
                start = new Date(year, 0, 1);
                end = new Date(year, 11, 31);
                break;
            default: // month
                start = new Date(year, month, 1);
                end = new Date(year, month + 1, 0);
        }

        return transactions.filter(t => {
            const date = new Date(t.date);
            return date >= start && date <= end;
        });
    },

    /**
     * Load overview stats
     */
    loadOverview() {
        const transactions = this.getTransactionsForPeriod();
        const totals = App.calculateTotals(transactions);
        const savings = totals.income - totals.expense;
        const savingsRate = totals.income > 0 ? (savings / totals.income * 100) : 0;

        // Update UI
        document.getElementById('reportIncome').textContent = App.formatCurrency(totals.income);
        document.getElementById('reportExpense').textContent = App.formatCurrency(totals.expense);
        document.getElementById('reportSavings').textContent = App.formatCurrency(savings);
        document.getElementById('reportSavingsRate').textContent = `${savingsRate.toFixed(1)}%`;

        // Update savings color
        const savingsEl = document.getElementById('reportSavings');
        if (savingsEl) {
            savingsEl.style.color = savings >= 0 ? 'var(--success)' : 'var(--error)';
        }
    },

    /**
     * Initialize all charts
     */
    initAllCharts() {
        this.initIncomeExpenseChart();
        this.initCategoryPieChart();
        this.initPaymentMethodChart();
        this.initDailySpendingChart();
        this.initAccountBalanceChart();
        this.initMonthlyComparisonChart();
    },

    /**
     * Initialize income vs expense chart
     */
    initIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart');
        if (!ctx) return;

        if (this.charts.incomeExpense) {
            this.charts.incomeExpense.destroy();
        }

        const transactions = this.getTransactionsForPeriod();
        const days = this.getDaysInPeriod();

        const incomeData = [];
        const expenseData = [];

        days.forEach(day => {
            const dayTransactions = transactions.filter(t =>
                new Date(t.date).toDateString() === day.toDateString()
            );
            const totals = App.calculateTotals(dayTransactions);
            incomeData.push(totals.income);
            expenseData.push(totals.expense);
        });

        this.charts.incomeExpense = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days.map(d => d.getDate()),
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: CONFIG.CHART_COLORS.success,
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        borderColor: CONFIG.CHART_COLORS.error,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    /**
     * Get days in current period
     */
    getDaysInPeriod() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    },

    /**
     * Initialize category pie chart
     */
    initCategoryPieChart() {
        const ctx = document.getElementById('categoryPieChart');
        if (!ctx) return;

        if (this.charts.categoryPie) {
            this.charts.categoryPie.destroy();
        }

        const transactions = this.getTransactionsForPeriod().filter(t => t.type === 'expense');
        const categoryGroups = App.groupByCategory(transactions);

        const categories = Object.entries(categoryGroups)
            .map(([id, data]) => ({
                category: App.getCategory(id),
                total: data.total
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        if (categories.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <p>No expense data</p>
                </div>
            `;
            return;
        }

        this.charts.categoryPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => c.category.name),
                datasets: [{
                    data: categories.map(c => c.total),
                    backgroundColor: CONFIG.CHART_COLORS.palette,
                    borderWidth: 0,
                    cutout: '65%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 12,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    },

    /**
     * Initialize payment method chart
     */
    initPaymentMethodChart() {
        const ctx = document.getElementById('paymentMethodChart');
        if (!ctx) return;

        if (this.charts.paymentMethod) {
            this.charts.paymentMethod.destroy();
        }

        const transactions = this.getTransactionsForPeriod();
        const methods = {};

        transactions.forEach(t => {
            const method = t.paymentMethod || 'other';
            if (!methods[method]) methods[method] = 0;
            methods[method] += parseFloat(t.amount) || 0;
        });

        const methodData = Object.entries(methods)
            .map(([id, total]) => ({
                method: App.getPaymentMethod(id),
                total
            }))
            .sort((a, b) => b.total - a.total);

        if (methodData.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>No transaction data</p>
                </div>
            `;
            return;
        }

        this.charts.paymentMethod = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: methodData.map(m => m.method.name),
                datasets: [{
                    data: methodData.map(m => m.total),
                    backgroundColor: CONFIG.CHART_COLORS.palette,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: value => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    /**
     * Initialize daily spending chart
     */
    initDailySpendingChart() {
        const ctx = document.getElementById('dailySpendingChart');
        if (!ctx) return;

        if (this.charts.dailySpending) {
            this.charts.dailySpending.destroy();
        }

        const transactions = this.getTransactionsForPeriod().filter(t => t.type === 'expense');
        const days = this.getDaysInPeriod();
        const data = [];

        days.forEach(day => {
            const dayTotal = transactions
                .filter(t => new Date(t.date).toDateString() === day.toDateString())
                .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            data.push(dayTotal);
        });

        const average = data.reduce((a, b) => a + b, 0) / data.length;

        this.charts.dailySpending = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: days.map(d => d.getDate()),
                datasets: [{
                    data,
                    backgroundColor: data.map(d => d > average * 1.5 ? CONFIG.CHART_COLORS.error : CONFIG.CHART_COLORS.primary),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '₹' + value
                        }
                    }
                }
            }
        });
    },

    /**
     * Initialize account balance chart
     */
    initAccountBalanceChart() {
        const ctx = document.getElementById('accountBalanceChart');
        if (!ctx) return;

        if (this.charts.accountBalance) {
            this.charts.accountBalance.destroy();
        }

        const accounts = Storage.getAccounts()
            .filter(a => a.accountType !== 'credit')
            .slice(0, 6);

        if (accounts.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-university"></i>
                    <p>No accounts</p>
                </div>
            `;
            return;
        }

        this.charts.accountBalance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: accounts.map(a => a.name),
                datasets: [{
                    data: accounts.map(a => parseFloat(a.currentBalance) || 0),
                    backgroundColor: CONFIG.CHART_COLORS.palette,
                    borderWidth: 0
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
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    },

    /**
     * Initialize monthly comparison chart
     */
    initMonthlyComparisonChart() {
        const ctx = document.getElementById('monthlyComparisonChart');
        if (!ctx) return;

        if (this.charts.monthlyComparison) {
            this.charts.monthlyComparison.destroy();
        }

        const transactions = Storage.getTransactions();
        const months = [];
        const incomeData = [];
        const expenseData = [];
        const savingsData = [];

        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(this.currentDate);
            date.setMonth(date.getMonth() - i);
            months.push(date.toLocaleDateString('en-IN', { month: 'short' }));

            const monthTransactions = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
            });

            const totals = App.calculateTotals(monthTransactions);
            incomeData.push(totals.income);
            expenseData.push(totals.expense);
            savingsData.push(totals.income - totals.expense);
        }

        this.charts.monthlyComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: CONFIG.CHART_COLORS.success,
                        borderRadius: 4
                    },
                    {
                        label: 'Expenses',
                        data: expenseData,
                        backgroundColor: CONFIG.CHART_COLORS.error,
                        borderRadius: 4
                    },
                    {
                        label: 'Savings',
                        data: savingsData,
                        backgroundColor: CONFIG.CHART_COLORS.primary,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: value => '₹' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    /**
     * Load category breakdown
     */
    loadCategoryBreakdown() {
        const container = document.getElementById('categoryBreakdown');
        if (!container) return;

        const type = document.getElementById('breakdownType')?.value || 'expense';
        const transactions = this.getTransactionsForPeriod().filter(t => t.type === type);
        const categoryGroups = App.groupByCategory(transactions);
        const total = Object.values(categoryGroups).reduce((sum, g) => sum + g.total, 0);

        const categories = Object.entries(categoryGroups)
            .map(([id, data]) => ({
                category: App.getCategory(id),
                total: data.total,
                count: data.transactions.length,
                percent: total > 0 ? (data.total / total * 100) : 0
            }))
            .sort((a, b) => b.total - a.total);

        if (categories.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <p>No ${type} data for this period</p>
                </div>
            `;
            return;
        }

        container.innerHTML = categories.map(c => `
            <div class="category-item">
                <div class="category-info">
                    <span class="category-icon">${c.category.icon}</span>
                    <div>
                        <span class="category-name">${c.category.name}</span>
                        <span class="category-count">${c.count} transaction${c.count !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="category-amount">
                    <span class="amount">${App.formatCurrency(c.total)}</span>
                    <div class="category-progress">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${c.percent}%"></div>
                        </div>
                        <span class="percentage">${c.percent.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load top expenses
     */
    loadTopExpenses() {
        const container = document.getElementById('topExpenses');
        if (!container) return;

        const transactions = this.getTransactionsForPeriod()
            .filter(t => t.type === 'expense')
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 5);

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No expenses recorded</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map((t, i) => {
            const category = App.getCategory(t.category);
            let rankClass = '';
            if (i === 0) rankClass = 'gold';
            else if (i === 1) rankClass = 'silver';
            else if (i === 2) rankClass = 'bronze';

            return `
                <div class="top-transaction-item">
                    <div class="top-transaction-rank ${rankClass}">${i + 1}</div>
                    <div class="top-transaction-info">
                        <div class="top-transaction-name">${t.description}</div>
                        <div class="top-transaction-details">
                            ${category.icon} ${category.name} • ${App.formatDate(t.date)}
                        </div>
                    </div>
                    <div class="top-transaction-amount">${App.formatCurrency(t.amount)}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Export report
     */
    exportReport() {
        const transactions = this.getTransactionsForPeriod();
        const totals = App.calculateTotals(transactions);
        const categoryGroups = App.groupByCategory(transactions.filter(t => t.type === 'expense'));

        const report = `
FINANCEFLOW MONTHLY REPORT
${this.currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
${'='.repeat(50)}

SUMMARY
-------
Total Income:    ${App.formatCurrency(totals.income)}
Total Expenses:  ${App.formatCurrency(totals.expense)}
Net Savings:     ${App.formatCurrency(totals.income - totals.expense)}
Savings Rate:    ${totals.income > 0 ? ((totals.income - totals.expense) / totals.income * 100).toFixed(1) : 0}%

EXPENSE BREAKDOWN
-----------------
${Object.entries(categoryGroups)
    .map(([id, data]) => {
        const cat = App.getCategory(id);
        return `${cat.name}: ${App.formatCurrency(data.total)}`;
    })
    .join('\n')}

${'='.repeat(50)}
Generated by FinanceFlow
        `.trim();

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${this.currentDate.toISOString().slice(0, 7)}.txt`;
        a.click();

        URL.revokeObjectURL(url);
        App.showToast('Report exported', 'success');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('incomeExpenseChart')) {
        Reports.init();
    }
});

window.Reports = Reports;
