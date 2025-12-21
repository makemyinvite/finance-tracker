/**
 * FinanceFlow - Transactions Manager
 * Transactions page functionality
 */

const Transactions = {
    currentTransactionId: null,
    deleteTransactionId: null,
    currentPage: 1,
    itemsPerPage: CONFIG.ITEMS_PER_PAGE,
    filters: {},
    tags: [],

    /**
     * Initialize transactions page
     */
    async init() {
        // Show loader and sync from API for non-demo users
        if (!SheetsAPI.isDemoMode()) {
            App.showLoader('Loading Transactions', 'Syncing your data...');
            await this.syncFromAPI();
        }

        this.setupEventListeners();
        this.loadCategories();
        this.loadAccounts();
        this.setDefaultDates();
        this.loadTransactions();
        this.loadPendingTransactions();

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
        // Add transaction button
        document.getElementById('addTransactionBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('emptyAddBtn')?.addEventListener('click', () => this.openAddModal());

        // Form submit
        document.getElementById('transactionForm')?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Close modal
        document.getElementById('closeModal')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('transactionModal'));
        });

        // Filters
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters')?.addEventListener('click', () => this.clearFilters());

        // Search
        document.getElementById('searchTransactions')?.addEventListener('input',
            App.debounce((e) => this.handleSearch(e.target.value), 300)
        );

        // Payment method change - show UPI fields
        document.getElementById('txnPaymentMethod')?.addEventListener('change', (e) => {
            const upiDetails = document.getElementById('upiDetails');
            if (upiDetails) {
                upiDetails.style.display = e.target.value === 'upi' ? 'block' : 'none';
            }
        });

        // Recurring toggle
        document.getElementById('isRecurring')?.addEventListener('change', (e) => {
            const recurringOptions = document.getElementById('recurringOptions');
            if (recurringOptions) {
                recurringOptions.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        // Tags input
        document.getElementById('txnTags')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(e.target.value);
                e.target.value = '';
            }
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage')?.addEventListener('click', () => this.changePage(1));

        // Export
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportTransactions());

        // Delete confirmation
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());
        document.getElementById('closeDeleteModal')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('deleteModal'));
        });

        // File upload
        this.setupFileUpload();

        // Pending transactions refresh
        document.getElementById('refreshPending')?.addEventListener('click', () => this.loadPendingTransactions());
    },

    /**
     * Load pending transactions
     */
    async loadPendingTransactions() {
        if (!SheetsAPI.isConfigured()) return;

        try {
            const result = await SheetsAPI.request('getPendingTransactions');
            if (result.success && result.pending && result.pending.length > 0) {
                this.renderPendingTransactions(result.pending);
            } else {
                document.getElementById('pendingSection').style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load pending transactions:', error);
        }
    },

    /**
     * Render pending transactions
     */
    renderPendingTransactions(pending) {
        const section = document.getElementById('pendingSection');
        const list = document.getElementById('pendingList');
        const count = document.getElementById('pendingCount');

        if (!section || !list) return;

        section.style.display = 'block';
        count.textContent = pending.length;

        list.innerHTML = pending.map(txn => `
            <div class="pending-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light-100); border-radius: var(--radius); margin-bottom: 0.75rem;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.5rem;">${this.getCategoryIcon(txn.category)}</span>
                        <div>
                            <h4 style="font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${txn.description}</h4>
                            <p style="font-size: 0.8125rem; color: var(--text-secondary);">
                                ${txn.category} • ${new Date(txn.date).toLocaleDateString('en-IN')}
                                ${txn.source ? `• From: ${txn.source}` : ''}
                            </p>
                        </div>
                    </div>
                </div>
                <div style="text-align: right; margin-right: 1rem;">
                    <span style="font-size: 1.125rem; font-weight: 700; color: ${txn.type === 'income' ? 'var(--success)' : 'var(--error)'};">
                        ${txn.type === 'income' ? '+' : '-'}₹${parseFloat(txn.amount).toLocaleString('en-IN')}
                    </span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm" style="background: var(--success); color: white;" onclick="Transactions.approvePending('${txn.id}')" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm" style="background: var(--error); color: white;" onclick="Transactions.rejectPending('${txn.id}')" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Approve pending transaction
     */
    async approvePending(id) {
        if (!confirm('Approve this transaction and add it to your records?')) return;

        try {
            const result = await SheetsAPI.request('approvePendingTransaction', { id: id });
            if (result.success) {
                App.showToast('Transaction approved and added!', 'success');
                this.loadPendingTransactions();
                this.loadTransactions();
            } else {
                App.showToast(result.error || 'Failed to approve transaction', 'error');
            }
        } catch (error) {
            App.showToast('Error approving transaction', 'error');
        }
    },

    /**
     * Reject pending transaction
     */
    async rejectPending(id) {
        if (!confirm('Reject and remove this pending transaction?')) return;

        try {
            const result = await SheetsAPI.request('rejectPendingTransaction', { id: id });
            if (result.success) {
                App.showToast('Transaction rejected', 'success');
                this.loadPendingTransactions();
            } else {
                App.showToast(result.error || 'Failed to reject transaction', 'error');
            }
        } catch (error) {
            App.showToast('Error rejecting transaction', 'error');
        }
    },

    /**
     * Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            'food': '🍔', 'dining': '🍔', 'groceries': '🛒',
            'transport': '🚗', 'fuel': '⛽', 'travel': '✈️',
            'shopping': '🛍️', 'clothing': '👕',
            'entertainment': '🎬', 'movies': '🎬',
            'utilities': '💡', 'bills': '📄',
            'health': '🏥', 'medical': '💊',
            'education': '📚',
            'salary': '💰', 'income': '💵',
            'emi': '🏦', 'loan': '🏦',
            'investment': '📈', 'savings': '🏦',
            'other': '📦'
        };
        const key = (category || 'other').toLowerCase();
        return icons[key] || '📦';
    },

    /**
     * Setup file upload handlers
     */
    setupFileUpload() {
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('txnAttachment');
        const removeBtn = document.getElementById('removeFile');

        if (!uploadArea || !fileInput) return;

        // Click to browse
        uploadArea.addEventListener('click', (e) => {
            if (e.target.closest('.remove-file')) return;
            fileInput.click();
        });

        // File selected
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Remove file
        removeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSelectedFile();
        });
    },

    /**
     * Handle file selection
     */
    handleFileSelect(file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            App.showToast('Invalid file type. Please upload an image or PDF.', 'error');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            App.showToast('File too large. Maximum size is 5MB.', 'error');
            return;
        }

        // Store file reference
        this.selectedFile = file;

        // Show preview
        const placeholder = document.getElementById('uploadPlaceholder');
        const preview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        const previewName = document.getElementById('previewName');
        const previewSize = document.getElementById('previewSize');

        if (placeholder) placeholder.style.display = 'none';
        if (preview) preview.style.display = 'flex';
        if (previewName) previewName.textContent = file.name;
        if (previewSize) previewSize.textContent = this.formatFileSize(file.size);

        // Show image preview or PDF icon
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImage) previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            // PDF icon
            if (previewImage) previewImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h4v2h-4v-2zm0 3h4v2h-4v-2z"/></svg>';
        }
    },

    /**
     * Remove selected file
     */
    removeSelectedFile() {
        this.selectedFile = null;
        const fileInput = document.getElementById('txnAttachment');
        const placeholder = document.getElementById('uploadPlaceholder');
        const preview = document.getElementById('uploadPreview');

        if (fileInput) fileInput.value = '';
        if (placeholder) placeholder.style.display = 'block';
        if (preview) preview.style.display = 'none';
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /**
     * Upload file to Google Drive
     */
    async uploadFileToDrive(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64Data = e.target.result.split(',')[1];
                    const result = await SheetsAPI.request('uploadFile', {
                        fileName: file.name,
                        mimeType: file.type,
                        data: base64Data
                    });

                    if (result.success) {
                        resolve(result.fileUrl);
                    } else {
                        reject(new Error(result.error || 'Upload failed'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Set default date filters
     */
    setDefaultDates() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        if (startDate) startDate.value = startOfMonth.toISOString().split('T')[0];
        if (endDate) endDate.value = now.toISOString().split('T')[0];
    },

    /**
     * Load categories into filter
     */
    loadCategories() {
        const select = document.getElementById('filterCategory');
        const txnSelect = document.getElementById('txnCategory');
        const categories = Storage.getCategories();

        if (select) {
            // Keep first option
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            // Add expense categories
            const expenseGroup = document.createElement('optgroup');
            expenseGroup.label = 'Expenses';
            categories.expense.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icon} ${cat.name}`;
                expenseGroup.appendChild(option);
            });
            select.appendChild(expenseGroup);

            // Add income categories
            const incomeGroup = document.createElement('optgroup');
            incomeGroup.label = 'Income';
            categories.income.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icon} ${cat.name}`;
                incomeGroup.appendChild(option);
            });
            select.appendChild(incomeGroup);
        }
    },

    /**
     * Load accounts into filter and form
     */
    loadAccounts() {
        const accounts = Storage.getAccounts();
        const selects = ['filterAccount', 'txnAccount', 'txnToAccount'];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;

            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.id;
                option.textContent = `${acc.name} (${acc.bankName})`;
                select.appendChild(option);
            });
        });
    },

    /**
     * Load transactions
     */
    loadTransactions() {
        let transactions = Storage.getTransactions();

        // Apply filters
        transactions = this.filterTransactions(transactions);

        // Calculate summary
        this.updateSummary(transactions);

        // Paginate
        const totalPages = Math.ceil(transactions.length / this.itemsPerPage);
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const paginatedTransactions = transactions.slice(start, start + this.itemsPerPage);

        // Render
        this.renderTransactions(paginatedTransactions);
        this.updatePagination(totalPages);
    },

    /**
     * Filter transactions
     */
    filterTransactions(transactions) {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const type = document.getElementById('filterType')?.value;
        const category = document.getElementById('filterCategory')?.value;
        const method = document.getElementById('filterMethod')?.value;
        const account = document.getElementById('filterAccount')?.value;
        const search = document.getElementById('searchTransactions')?.value?.toLowerCase();

        return transactions.filter(t => {
            // Date filter
            if (startDate && new Date(t.date) < new Date(startDate)) return false;
            if (endDate && new Date(t.date) > new Date(endDate + 'T23:59:59')) return false;

            // Type filter
            if (type && type !== 'all' && t.type !== type) return false;

            // Category filter
            if (category && category !== 'all' && t.category !== category) return false;

            // Payment method filter
            if (method && method !== 'all' && t.paymentMethod !== method) return false;

            // Account filter
            if (account && account !== 'all' && t.account !== account) return false;

            // Search filter
            if (search) {
                const searchFields = [
                    t.description,
                    t.notes,
                    t.category,
                    App.getCategory(t.category).name
                ].join(' ').toLowerCase();
                if (!searchFields.includes(search)) return false;
            }

            return true;
        });
    },

    /**
     * Update summary bar
     */
    updateSummary(transactions) {
        const totals = App.calculateTotals(transactions);
        const netBalance = totals.income - totals.expense;

        document.getElementById('totalIncome').textContent = App.formatCurrency(totals.income);
        document.getElementById('totalExpense').textContent = App.formatCurrency(totals.expense);
        document.getElementById('netBalance').textContent = App.formatCurrency(netBalance);
        document.getElementById('transactionCount').textContent = transactions.length;

        // Color for net balance
        const netEl = document.getElementById('netBalance');
        if (netEl) {
            netEl.style.color = netBalance >= 0 ? 'var(--success)' : 'var(--error)';
        }
    },

    /**
     * Render transactions
     */
    renderTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" id="emptyState">
                    <i class="fas fa-receipt"></i>
                    <h3>No Transactions Found</h3>
                    <p>Start by adding your first transaction</p>
                    <button class="btn btn-primary" id="emptyAddBtn">
                        <i class="fas fa-plus"></i>
                        Add Transaction
                    </button>
                </div>
            `;
            document.getElementById('emptyAddBtn')?.addEventListener('click', () => this.openAddModal());
            return;
        }

        // Group by date
        const grouped = App.groupByDate(transactions);
        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

        container.innerHTML = sortedDates.map(date => {
            const dayTransactions = grouped[date];
            const dayTotal = dayTransactions.reduce((sum, t) => {
                return sum + (t.type === 'expense' ? -parseFloat(t.amount) : parseFloat(t.amount));
            }, 0);

            return `
                <div class="date-group">
                    <div class="date-header">
                        <h3>${App.formatDate(date, 'relative')}</h3>
                        <span class="date-total" style="color: ${dayTotal >= 0 ? 'var(--success)' : 'var(--error)'}">
                            ${dayTotal >= 0 ? '+' : ''}${App.formatCurrency(dayTotal)}
                        </span>
                    </div>
                    <div class="transactions-group">
                        ${dayTransactions.map(t => this.renderTransactionItem(t)).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners
        container.querySelectorAll('.transaction-item').forEach(item => {
            const id = item.dataset.id;
            item.querySelector('.edit-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editTransaction(id);
            });
            item.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTransaction(id);
            });
            item.addEventListener('click', () => this.editTransaction(id));
        });
    },

    /**
     * Render single transaction item
     */
    renderTransactionItem(t) {
        const category = App.getCategory(t.category);
        const method = App.getPaymentMethod(t.paymentMethod);
        const account = Storage.getAccountById(t.account);
        const isExpense = t.type === 'expense';

        return `
            <div class="transaction-item stagger-item" data-id="${t.id}">
                <div class="transaction-icon ${t.category}">
                    ${category.icon}
                </div>
                <div class="transaction-details">
                    <h4>${t.description}</h4>
                    <div class="transaction-meta">
                        <span><i class="fas fa-tag"></i> ${category.name}</span>
                        <span><i class="fas fa-${method.id === 'upi' ? 'mobile-alt' : 'credit-card'}"></i> ${method.name}</span>
                        ${account ? `<span><i class="fas fa-university"></i> ${account.name}</span>` : ''}
                    </div>
                    ${t.tags && t.tags.length > 0 ? `
                        <div class="transaction-tags">
                            ${t.tags.map(tag => `<span class="transaction-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${t.attachmentUrl ? `
                        <a href="${t.attachmentUrl}" target="_blank" class="attachment-link" onclick="event.stopPropagation();">
                            <i class="fas fa-paperclip"></i> ${t.attachmentName || 'View Receipt'}
                        </a>
                    ` : ''}
                </div>
                <div class="transaction-amount-section">
                    <div class="transaction-amount ${t.type}">
                        ${isExpense ? '-' : '+'}${App.formatCurrency(t.amount)}
                    </div>
                    <div class="transaction-method">
                        ${t.time || ''}
                    </div>
                </div>
                <div class="transaction-actions">
                    <button class="txn-action-btn edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="txn-action-btn delete-btn delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Update pagination
     */
    updatePagination(totalPages) {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    },

    /**
     * Change page
     */
    changePage(direction) {
        this.currentPage += direction;
        this.loadTransactions();
    },

    /**
     * Apply filters
     */
    applyFilters() {
        this.currentPage = 1;
        this.loadTransactions();
    },

    /**
     * Clear filters
     */
    clearFilters() {
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterMethod').value = 'all';
        document.getElementById('filterAccount').value = 'all';
        document.getElementById('searchTransactions').value = '';
        this.setDefaultDates();
        this.currentPage = 1;
        this.loadTransactions();
    },

    /**
     * Handle search
     */
    handleSearch(query) {
        this.currentPage = 1;
        this.loadTransactions();
    },

    /**
     * Open add modal
     */
    openAddModal() {
        this.currentTransactionId = null;
        this.tags = [];
        this.removeSelectedFile(); // Clear any previously selected file

        const modal = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitBtnText');

        if (form) form.reset();
        if (title) title.textContent = 'Add Transaction';
        if (submitBtn) submitBtn.textContent = 'Save Transaction';

        // Set default date
        const dateInput = document.getElementById('txnDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        // Reset type toggle
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.type-btn.expense')?.classList.add('active');

        // Clear tags
        this.renderTags();

        // Hide optional fields
        document.getElementById('upiDetails').style.display = 'none';
        document.getElementById('recurringOptions').style.display = 'none';
        document.querySelectorAll('.transfer-field').forEach(f => f.style.display = 'none');

        App.openModal(modal);
    },

    /**
     * Edit transaction
     */
    editTransaction(id) {
        const transaction = Storage.getTransactionById(id);
        if (!transaction) return;

        this.currentTransactionId = id;
        this.tags = transaction.tags || [];

        const modal = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitBtnText');

        if (title) title.textContent = 'Edit Transaction';
        if (submitBtn) submitBtn.textContent = 'Update Transaction';

        // Fill form
        if (form) {
            form.elements['transactionId'].value = transaction.id;
            form.elements['amount'].value = transaction.amount;
            form.elements['date'].value = transaction.date;
            form.elements['time'].value = transaction.time || '';
            form.elements['description'].value = transaction.description;
            form.elements['category'].value = transaction.category;
            form.elements['paymentMethod'].value = transaction.paymentMethod;
            form.elements['account'].value = transaction.account;
            form.elements['notes'].value = transaction.notes || '';
        }

        // Set type toggle
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === transaction.type);
        });

        // Show UPI fields if needed
        if (transaction.paymentMethod === 'upi') {
            document.getElementById('upiDetails').style.display = 'block';
            if (form) {
                form.elements['upiId'].value = transaction.upiId || '';
                form.elements['upiRef'].value = transaction.upiRef || '';
            }
        }

        // Render tags
        this.renderTags();

        App.openModal(modal);
    },

    /**
     * Delete transaction
     */
    deleteTransaction(id) {
        this.deleteTransactionId = id;
        App.openModal(document.getElementById('deleteModal'));
    },

    /**
     * Confirm delete
     */
    async confirmDelete() {
        if (this.deleteTransactionId) {
            const transactionId = this.deleteTransactionId;
            App.closeModal(document.getElementById('deleteModal'));
            App.showLoader('Deleting Transaction', 'Please wait...');

            try {
                Storage.deleteTransaction(transactionId);

                // Sync with Google Sheets
                if (SheetsAPI.isConfigured()) {
                    await SheetsAPI.deleteTransaction(transactionId);
                }

                App.hideLoader();
                App.showToast('Transaction deleted', 'success');
                this.loadTransactions();
            } catch (error) {
                console.error('Failed to delete transaction:', error);
                App.hideLoader();
                App.showToast('Failed to delete transaction', 'error');
            }

            this.deleteTransactionId = null;
        }
    },

    /**
     * Add tag
     */
    addTag(tag) {
        tag = tag.trim();
        if (tag && !this.tags.includes(tag)) {
            this.tags.push(tag);
            this.renderTags();
        }
    },

    /**
     * Remove tag
     */
    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
        this.renderTags();
    },

    /**
     * Render tags
     */
    renderTags() {
        const container = document.getElementById('tagsList');
        if (!container) return;

        container.innerHTML = this.tags.map(tag => `
            <span class="tag-item">
                ${tag}
                <button class="tag-remove" data-tag="${tag}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');

        container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', () => this.removeTag(btn.dataset.tag));
        });
    },

    /**
     * Handle form submit
     */
    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const activeType = document.querySelector('.type-btn.active');
        const type = activeType ? activeType.dataset.type : 'expense';

        const transaction = {
            type,
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            time: formData.get('time'),
            description: formData.get('description'),
            category: formData.get('category'),
            paymentMethod: formData.get('paymentMethod'),
            account: formData.get('account'),
            notes: formData.get('notes'),
            tags: this.tags
        };

        // UPI details
        if (transaction.paymentMethod === 'upi') {
            transaction.upiId = formData.get('upiId');
            transaction.upiRef = formData.get('upiRef');
        }

        // Transfer
        if (type === 'transfer') {
            transaction.toAccount = formData.get('toAccount');
        }

        // Recurring
        if (formData.get('isRecurring')) {
            transaction.isRecurring = true;
            transaction.recurringFrequency = formData.get('recurringFrequency');
            transaction.recurringTime = formData.get('recurringTime');
            transaction.recurringEnd = formData.get('recurringEnd');
        }

        // Upload attachment if selected
        if (this.selectedFile) {
            try {
                const uploadProgress = document.getElementById('uploadProgress');
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');

                if (uploadProgress) uploadProgress.style.display = 'flex';
                if (progressFill) progressFill.style.width = '30%';
                if (progressText) progressText.textContent = 'Uploading...';

                const attachmentUrl = await this.uploadFileToDrive(this.selectedFile);
                transaction.attachmentUrl = attachmentUrl;
                transaction.attachmentName = this.selectedFile.name;

                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.textContent = 'Uploaded!';

                setTimeout(() => {
                    if (uploadProgress) uploadProgress.style.display = 'none';
                }, 500);
            } catch (error) {
                App.showToast('Failed to upload attachment: ' + error.message, 'error');
                console.error('Upload error:', error);
                // Continue without attachment
            }
        }

        // Close modal and show loader
        const isUpdate = !!this.currentTransactionId;
        App.closeModal(document.getElementById('transactionModal'));
        App.showLoader(isUpdate ? 'Updating Transaction' : 'Adding Transaction', 'Please wait...');

        try {
            // Save locally
            if (isUpdate) {
                Storage.updateTransaction(this.currentTransactionId, transaction);
            } else {
                Storage.addTransaction(transaction);
            }

            // Sync with Google Sheets
            if (SheetsAPI.isConfigured()) {
                if (isUpdate) {
                    await SheetsAPI.updateTransaction(this.currentTransactionId, transaction);
                } else {
                    await SheetsAPI.addTransaction(transaction);
                }
            }

            App.hideLoader();
            App.showToast(isUpdate ? 'Transaction updated' : 'Transaction added', 'success');
            this.loadTransactions();
        } catch (error) {
            console.error('Failed to save transaction:', error);
            App.hideLoader();
            App.showToast('Failed to save transaction', 'error');
        }

        this.currentTransactionId = null;
        this.tags = [];
    },

    /**
     * Export transactions
     */
    exportTransactions() {
        let transactions = Storage.getTransactions();
        transactions = this.filterTransactions(transactions);

        // Convert to CSV
        const headers = ['Date', 'Time', 'Type', 'Description', 'Category', 'Amount', 'Payment Method', 'Account', 'Notes'];
        const rows = transactions.map(t => {
            const category = App.getCategory(t.category);
            const method = App.getPaymentMethod(t.paymentMethod);
            const account = Storage.getAccountById(t.account);
            return [
                t.date,
                t.time || '',
                t.type,
                `"${t.description}"`,
                category.name,
                t.amount,
                method.name,
                account ? account.name : '',
                `"${t.notes || ''}"`
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        URL.revokeObjectURL(url);
        App.showToast('Transactions exported', 'success');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('transactionsList')) {
        Transactions.init();
    }
});

window.Transactions = Transactions;
