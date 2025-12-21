/**
 * FinanceFlow - Main Application
 * Core functionality and utilities
 */

const App = {
    /**
     * Initialize the application
     */
    init() {
        // Register service worker for PWA
        this.registerServiceWorker();

        // Apply saved theme immediately
        this.applyTheme();

        // Check authentication first
        if (!this.checkAuth()) {
            return;
        }

        this.setupEventListeners();
        this.updateCurrentDate();
        this.initializeSidebar();
        this.loadAccounts();
        this.setupLogout();
        this.showDemoModeBanner();
        console.log('FinanceFlow initialized');
    },

    /**
     * Register Service Worker for PWA functionality
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('[PWA] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWA] New service worker installing...');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content available, show refresh prompt
                            this.showUpdateAvailable(registration);
                        }
                    });
                });

                // Handle controller change (when SW activates)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[PWA] Controller changed');
                });

            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
    },

    /**
     * Show update available notification
     */
    showUpdateAvailable(registration) {
        const updateBanner = document.createElement('div');
        updateBanner.id = 'updateBanner';
        updateBanner.style.cssText = `
            position: fixed;
            bottom: 1rem;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 1rem;
            z-index: 9999;
            font-size: 0.875rem;
        `;
        updateBanner.innerHTML = `
            <span><i class="fas fa-sync-alt"></i> New version available!</span>
            <button onclick="App.applyUpdate()" style="background: white; color: #4f46e5; border: none; padding: 0.375rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;">
                Update Now
            </button>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.body.appendChild(updateBanner);
    },

    /**
     * Apply service worker update
     */
    applyUpdate() {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    },

    /**
     * Show demo mode banner if in demo mode
     */
    showDemoModeBanner() {
        if (localStorage.getItem('financeflow_demo_mode') !== 'true') {
            return;
        }

        // Check if banner already exists
        if (document.getElementById('demoBanner')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'demoBanner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 0.5rem 1rem;
            text-align: center;
            font-size: 0.875rem;
            font-weight: 500;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        `;
        banner.innerHTML = `
            <i class="fas fa-flask"></i>
            <span>Demo Mode - Data stored locally only, no backend sync</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 1rem; font-size: 1rem;">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.body.prepend(banner);

        // Adjust main content to account for banner
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.paddingTop = '3rem';
        }
    },

    /**
     * Apply saved theme from storage
     */
    applyTheme() {
        const settings = Storage.getSettings();
        const theme = settings.theme || 'light';
        document.body.dataset.theme = theme;
    },

    /**
     * Check if user is authenticated
     */
    checkAuth() {
        // Skip auth check on login page and docs page
        if (window.location.pathname.includes('login.html') ||
            window.location.pathname.includes('docs.html')) {
            return true;
        }

        const token = localStorage.getItem('financeflow_token');
        const user = localStorage.getItem('financeflow_user');

        if (!token || !user) {
            // Redirect to login
            window.location.href = 'login.html';
            return false;
        }

        // Update user display if element exists
        this.updateUserDisplay();
        return true;
    },

    /**
     * Update user display in sidebar
     */
    updateUserDisplay() {
        let user = {};
        try {
            const stored = localStorage.getItem('financeflow_user');
            if (stored && stored !== 'undefined') {
                user = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
        const userNameEl = document.getElementById('userName');
        const userEmailEl = document.getElementById('userEmail');

        if (userNameEl) userNameEl.textContent = user.name || 'User';
        if (userEmailEl) userEmailEl.textContent = user.email || '';
    },

    /**
     * Setup logout functionality
     */
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    },

    /**
     * Logout user
     */
    async logout() {
        const token = localStorage.getItem('financeflow_token');

        // Try to logout from server
        if (token && typeof SheetsAPI !== 'undefined') {
            try {
                await SheetsAPI.request('logout', { token });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        // Clear local storage
        localStorage.removeItem('financeflow_token');
        localStorage.removeItem('financeflow_user');

        // Redirect to login
        window.location.href = 'login.html';
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Sidebar toggle (desktop)
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileOverlay = document.getElementById('mobileOverlay');

        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => this.closeMobileMenu());
        }

        // Quick add button
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => this.openQuickAddModal());
        }

        // Modal close handlers
        document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close')) {
                    this.closeModal(e.target.closest('.modal'));
                }
            });
        });

        // Cancel buttons
        document.querySelectorAll('#cancelAdd, #cancelAccount, #cancelTransaction, #cancelCategory, #cancelDelete').forEach(el => {
            el.addEventListener('click', () => {
                const modal = el.closest('.modal');
                if (modal) this.closeModal(modal);
            });
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) this.closeModal(activeModal);
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });

        // Toggle buttons (expense/income)
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleToggle(e.target));
        });

        // Type buttons (expense/income/transfer)
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTypeToggle(e.target));
        });
    },

    /**
     * Initialize sidebar state
     */
    initializeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed && sidebar) {
            sidebar.classList.add('collapsed');
        }
    },

    /**
     * Toggle sidebar (desktop) or close mobile menu
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        // On mobile, close the mobile menu instead of collapsing
        if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
            this.closeMobileMenu();
            return;
        }

        // Desktop: toggle collapsed state
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    },

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggle = document.getElementById('mobileMenuToggle');

        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
        if (overlay) {
            overlay.classList.toggle('active');
        }
        if (toggle) {
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = sidebar?.classList.contains('mobile-open')
                    ? 'fas fa-times'
                    : 'fas fa-bars';
            }
        }
        document.body.style.overflow = sidebar?.classList.contains('mobile-open') ? 'hidden' : '';
    },

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggle = document.getElementById('mobileMenuToggle');

        if (sidebar) {
            sidebar.classList.remove('mobile-open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
        if (toggle) {
            const icon = toggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
        document.body.style.overflow = '';
    },

    /**
     * Update current date display
     */
    updateCurrentDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = new Date().toLocaleDateString('en-IN', options);
        }
    },

    /**
     * Load accounts into dropdowns
     */
    loadAccounts() {
        const accounts = Storage.getAccounts();
        const selects = document.querySelectorAll('#account, #txnAccount, #txnToAccount, #filterAccount');

        selects.forEach(select => {
            if (!select) return;

            // Keep first option (placeholder)
            const placeholder = select.querySelector('option:first-child');
            select.innerHTML = '';
            if (placeholder) select.appendChild(placeholder);

            // Add accounts
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.name} (${account.bankName})`;
                select.appendChild(option);
            });
        });
    },

    /**
     * Open quick add modal
     */
    openQuickAddModal() {
        const modal = document.getElementById('quickAddModal');
        if (modal) {
            this.openModal(modal);
            // Set today's date
            const dateInput = document.getElementById('date');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    },

    /**
     * Open modal
     */
    openModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Animate modal content
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(modal.querySelector('.modal-content'),
                { opacity: 0, y: -20, scale: 0.95 },
                { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
            );
        }
    },

    /**
     * Close modal
     */
    closeModal(modal) {
        if (!modal) return;

        if (typeof gsap !== 'undefined') {
            gsap.to(modal.querySelector('.modal-content'), {
                opacity: 0,
                y: -20,
                scale: 0.95,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: () => {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        } else {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    /**
     * Switch tabs
     */
    switchTab(clickedTab) {
        const tabsContainer = clickedTab.closest('.tabs-container, .tabs-header')?.parentElement || clickedTab.parentElement.parentElement;
        const tabId = clickedTab.dataset.tab;

        // Update tab buttons
        tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        // Update tab content
        tabsContainer.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        const activeContent = document.getElementById(tabId);
        if (activeContent) {
            activeContent.classList.add('active');
            activeContent.style.display = 'block';
        }
    },

    /**
     * Handle toggle buttons (expense/income)
     */
    handleToggle(clickedBtn) {
        const toggleGroup = clickedBtn.closest('.toggle-group');
        if (!toggleGroup) return;

        toggleGroup.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');
    },

    /**
     * Handle type toggle (expense/income/transfer)
     */
    handleTypeToggle(clickedBtn) {
        const typeToggle = clickedBtn.closest('.type-toggle');
        if (!typeToggle) return;

        typeToggle.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');

        // Show/hide transfer fields
        const type = clickedBtn.dataset.type;
        const transferFields = document.querySelectorAll('.transfer-field');
        transferFields.forEach(field => {
            field.style.display = type === 'transfer' ? 'block' : 'none';
        });
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;

        container.appendChild(toast);

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, CONFIG.TOAST_DURATION);
    },

    /**
     * Remove toast
     */
    removeToast(toast) {
        if (!toast) return;

        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    },

    /**
     * Show global loader
     */
    showLoader(text = 'Loading...', subtext = 'Please wait') {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            const textEl = loader.querySelector('.loader-text');
            const subtextEl = loader.querySelector('.loader-subtext');
            if (textEl) textEl.textContent = text;
            if (subtextEl) subtextEl.textContent = subtext;
            loader.classList.remove('hidden');
        }
    },

    /**
     * Hide global loader
     */
    hideLoader() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.add('hidden');
        }
    },

    /**
     * Format currency
     */
    formatCurrency(amount, showSymbol = true) {
        const num = parseFloat(amount) || 0;
        const formatted = num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return showSymbol ? `₹${formatted}` : formatted;
    },

    /**
     * Format date
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { day: '2-digit', month: 'short', year: 'numeric' },
            long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
            relative: null
        };

        if (format === 'relative') {
            return this.getRelativeDate(d);
        }

        return d.toLocaleDateString('en-IN', options[format] || options.short);
    },

    /**
     * Get relative date string
     */
    getRelativeDate(date) {
        const now = new Date();
        const diff = now.setHours(0,0,0,0) - new Date(date).setHours(0,0,0,0);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return this.formatDate(date, 'short');
    },

    /**
     * Get category by ID
     */
    getCategory(id) {
        const categories = Storage.getCategories();
        const allCategories = [...categories.expense, ...categories.income];
        return allCategories.find(c => c.id === id) || { name: 'Other', icon: '📦' };
    },

    /**
     * Get payment method info
     */
    getPaymentMethod(id) {
        return CONFIG.PAYMENT_METHODS.find(m => m.id === id) || { name: 'Unknown', icon: '💳' };
    },

    /**
     * Calculate totals
     */
    calculateTotals(transactions) {
        return transactions.reduce((acc, t) => {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'income') {
                acc.income += amount;
            } else {
                acc.expense += amount;
            }
            return acc;
        }, { income: 0, expense: 0 });
    },

    /**
     * Group transactions by date
     */
    groupByDate(transactions) {
        const groups = {};
        transactions.forEach(t => {
            const date = t.date.split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(t);
        });
        return groups;
    },

    /**
     * Group transactions by category
     */
    groupByCategory(transactions) {
        const groups = {};
        transactions.forEach(t => {
            const category = t.category || 'other';
            if (!groups[category]) {
                groups[category] = { transactions: [], total: 0 };
            }
            groups[category].transactions.push(t);
            groups[category].total += parseFloat(t.amount) || 0;
        });
        return groups;
    },

    /**
     * Get current quarter
     */
    getCurrentQuarter() {
        const now = new Date();
        const month = now.getMonth();
        const quarter = Math.floor(month / 3) + 1;
        return `Q${quarter} ${now.getFullYear()}`;
    },

    /**
     * Get quarter date range
     */
    getQuarterDateRange(quarter, year) {
        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 2;
        return {
            start: new Date(year, startMonth, 1),
            end: new Date(year, endMonth + 1, 0)
        };
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Generate skeleton loader
     */
    showSkeleton(container, count = 3) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-item';
            skeleton.innerHTML = `
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            `;
            container.appendChild(skeleton);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available
window.App = App;
