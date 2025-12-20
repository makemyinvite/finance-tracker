/**
 * FinanceFlow - Categories Manager
 * Categories page functionality
 */

const Categories = {
    selectedType: 'expense',
    selectedEmoji: '📦',

    /**
     * Initialize categories page
     */
    init() {
        this.setupEventListeners();
        this.loadCategories();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add category button
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.openAddModal());

        // Add category placeholders
        document.getElementById('addExpenseCategory')?.addEventListener('click', () => {
            this.selectedType = 'expense';
            this.openAddModal();
        });
        document.getElementById('addIncomeCategory')?.addEventListener('click', () => {
            this.selectedType = 'income';
            this.openAddModal();
        });

        // Form submit
        document.getElementById('categoryForm')?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Close modal
        document.getElementById('closeModal')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('categoryModal'));
        });
        document.getElementById('cancelCategory')?.addEventListener('click', () => {
            App.closeModal(document.getElementById('categoryModal'));
        });

        // Type toggle
        document.querySelectorAll('#categoryModal .toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#categoryModal .toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedType = e.target.dataset.type;
            });
        });

        // Emoji picker
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedEmoji = e.target.dataset.emoji;
                document.getElementById('selectedEmoji').value = this.selectedEmoji;
            });
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.color = 'var(--text-secondary)';
                });
                e.target.classList.add('active');
                e.target.style.color = 'var(--primary)';

                document.querySelectorAll('.tab-content').forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none';
                });

                const tabId = e.target.dataset.tab;
                const activeContent = document.getElementById(tabId);
                if (activeContent) {
                    activeContent.classList.add('active');
                    activeContent.style.display = 'block';
                }
            });
        });
    },

    /**
     * Load categories
     */
    loadCategories() {
        const categories = Storage.getCategories();
        this.renderExpenseCategories(categories.expense);
        this.renderIncomeCategories(categories.income);
    },

    /**
     * Render expense categories
     */
    renderExpenseCategories(categories) {
        const container = document.querySelector('#expense-categories .categories-grid');
        if (!container) return;

        const placeholder = container.querySelector('.add-category-card');
        container.innerHTML = '';

        categories.forEach(cat => {
            container.appendChild(this.createCategoryCard(cat, 'expense'));
        });

        if (placeholder) container.appendChild(placeholder);
    },

    /**
     * Render income categories
     */
    renderIncomeCategories(categories) {
        const container = document.querySelector('#income-categories .categories-grid');
        if (!container) return;

        const placeholder = container.querySelector('.add-category-card');
        container.innerHTML = '';

        categories.forEach(cat => {
            container.appendChild(this.createCategoryCard(cat, 'income'));
        });

        if (placeholder) container.appendChild(placeholder);
    },

    /**
     * Create category card element
     */
    createCategoryCard(category, type) {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.cssText = 'background: var(--light-100); border-radius: var(--radius); padding: 1rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: var(--transition);';

        card.innerHTML = `
            <span style="font-size: 2rem;">${category.icon}</span>
            <div style="flex: 1;">
                <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${category.name}</h4>
                <p style="font-size: 0.8125rem; color: var(--text-muted);">${category.description || ''}</p>
            </div>
            <div class="category-actions" style="display: flex; gap: 0.5rem;">
                ${category.custom ? `
                    <button class="btn btn-icon edit-btn" style="width: 32px; height: 32px;" data-id="${category.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon delete-btn" style="width: 32px; height: 32px;" data-id="${category.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : `
                    <button class="btn btn-icon" style="width: 32px; height: 32px; opacity: 0.5;" disabled>
                        <i class="fas fa-lock"></i>
                    </button>
                `}
            </div>
        `;

        // Hover effect
        card.addEventListener('mouseenter', () => {
            card.style.background = 'var(--light-200)';
            card.style.transform = 'translateY(-2px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = 'var(--light-100)';
            card.style.transform = 'translateY(0)';
        });

        // Delete button
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCategory(type, category.id);
            });
        }

        return card;
    },

    /**
     * Open add modal
     */
    openAddModal() {
        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');

        if (form) form.reset();

        // Set type toggle
        document.querySelectorAll('#categoryModal .toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === this.selectedType);
        });

        // Reset emoji selection
        this.selectedEmoji = '📦';
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emoji === this.selectedEmoji);
        });
        document.getElementById('selectedEmoji').value = this.selectedEmoji;

        App.openModal(modal);
    },

    /**
     * Handle form submit
     */
    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const category = {
            name: formData.get('categoryName'),
            icon: this.selectedEmoji,
            description: formData.get('description'),
            budget: parseFloat(formData.get('budget')) || 0,
            type: this.selectedType
        };

        // Save to local storage
        Storage.addCategory(this.selectedType, category);

        // Sync to Google Sheets
        if (SheetsAPI.isConfigured()) {
            try {
                await SheetsAPI.addCategory(category);
            } catch (error) {
                console.error('Failed to sync category to Google Sheets:', error);
            }
        }

        App.closeModal(document.getElementById('categoryModal'));
        App.showToast('Category added successfully', 'success');
        this.loadCategories();
    },

    /**
     * Delete category
     */
    deleteCategory(type, id) {
        if (confirm('Are you sure you want to delete this category?')) {
            Storage.deleteCategory(type, id);
            App.showToast('Category deleted', 'success');
            this.loadCategories();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.categories-content')) {
        Categories.init();
    }
});

window.Categories = Categories;
