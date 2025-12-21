/**
 * FinanceFlow - Authentication Module
 * Handles user registration, login, and session management
 */

const Auth = {
    forgotEmail: '',

    /**
     * Initialize auth page
     */
    init() {
        // Check if already logged in
        const token = localStorage.getItem('financeflow_token');
        if (token) {
            this.verifySession(token);
        }

        this.setupEventListeners();
    },

    /**
     * Setup form event listeners
     */
    setupEventListeners() {
        // Login form
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Forgot password form
        document.getElementById('forgotFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.forgotPassword();
        });

        // Reset password form
        document.getElementById('resetFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.resetPassword();
        });
    },

    /**
     * Login user
     */
    async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            this.showToast('Please enter email and password', 'error');
            return;
        }

        const btn = document.querySelector('#loginFormElement button[type="submit"]');
        this.setLoading(btn, true);

        // Check for demo account - localStorage only, no backend sync
        if (email.toLowerCase() === 'demo@finance.com' && password === 'demo') {
            localStorage.setItem('financeflow_token', 'demo_token_' + Date.now());
            localStorage.setItem('financeflow_user', JSON.stringify({
                email: 'demo@finance.com',
                name: 'Demo User',
                isDemo: true
            }));
            localStorage.setItem('financeflow_demo_mode', 'true');

            if (rememberMe) {
                localStorage.setItem('financeflow_remember', 'true');
            }

            this.showToast('Demo login successful! Data stays local only.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            this.setLoading(btn, false);
            return;
        }

        try {
            const result = await SheetsAPI.request('login', { email, password });

            if (result.success) {
                // Save token
                localStorage.setItem('financeflow_token', result.token);
                if (result.user) {
                    localStorage.setItem('financeflow_user', JSON.stringify(result.user));
                }
                localStorage.removeItem('financeflow_demo_mode'); // Ensure demo mode is off

                if (rememberMe) {
                    localStorage.setItem('financeflow_remember', 'true');
                }

                this.showToast('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                this.showToast(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
            console.error('Login error:', error);
        }

        this.setLoading(btn, false);
    },

    /**
     * Send forgot password email
     */
    async forgotPassword() {
        const email = document.getElementById('forgotEmail').value.trim();

        if (!email) {
            this.showToast('Please enter your email', 'error');
            return;
        }

        const btn = document.querySelector('#forgotFormElement button[type="submit"]');
        this.setLoading(btn, true);

        try {
            const result = await SheetsAPI.request('forgotPassword', { email });

            if (result.success) {
                this.forgotEmail = email;
                this.showToast('Reset code sent to your email!', 'success');
                showForm('reset');
            } else {
                this.showToast(result.error || 'Failed to send reset code', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
            console.error('Forgot password error:', error);
        }

        this.setLoading(btn, false);
    },

    /**
     * Reset password with code
     */
    async resetPassword() {
        const code = document.getElementById('resetCode').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (!code || !newPassword) {
            this.showToast('Please fill all fields', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        const btn = document.querySelector('#resetFormElement button[type="submit"]');
        this.setLoading(btn, true);

        try {
            const result = await SheetsAPI.request('resetPassword', {
                email: this.forgotEmail,
                code,
                newPassword
            });

            if (result.success) {
                this.showToast('Password reset successfully!', 'success');
                setTimeout(() => {
                    showForm('login');
                }, 1500);
            } else {
                this.showToast(result.error || 'Failed to reset password', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
            console.error('Reset password error:', error);
        }

        this.setLoading(btn, false);
    },

    /**
     * Verify existing session
     */
    async verifySession(token) {
        try {
            const result = await SheetsAPI.request('verifyToken', { token });

            if (result.success && result.valid) {
                // Session is valid - redirect to dashboard
                window.location.href = 'index.html';
            } else {
                // Invalid token - clear storage
                localStorage.removeItem('financeflow_token');
                localStorage.removeItem('financeflow_user');
            }
        } catch (error) {
            console.error('Session verification error:', error);
        }
    },

    /**
     * Logout user
     */
    async logout() {
        const token = localStorage.getItem('financeflow_token');
        const isDemo = this.isDemoMode();

        // Only call backend logout for non-demo users
        if (token && !isDemo) {
            try {
                await SheetsAPI.request('logout', { token });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        localStorage.removeItem('financeflow_token');
        localStorage.removeItem('financeflow_user');
        localStorage.removeItem('financeflow_remember');
        localStorage.removeItem('financeflow_demo_mode');

        window.location.href = 'login.html';
    },

    /**
     * Check if in demo mode
     */
    isDemoMode() {
        return localStorage.getItem('financeflow_demo_mode') === 'true';
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!localStorage.getItem('financeflow_token');
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        const user = localStorage.getItem('financeflow_user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Set loading state on button
     */
    setLoading(btn, loading) {
        if (!btn) return;

        if (loading) {
            btn.classList.add('loading');
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner"></i> Please wait...';
        } else {
            btn.classList.remove('loading');
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

/**
 * Show specific form
 */
function showForm(form) {
    const forms = ['login', 'forgot', 'reset'];
    forms.forEach(f => {
        const el = document.getElementById(f + 'Form');
        if (el) {
            el.classList.toggle('hidden', f !== form);
        }
    });
}

/**
 * Toggle password visibility
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.parentElement.querySelector('.toggle-password i');

    if (input.type === 'password') {
        input.type = 'text';
        btn.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        btn.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Export for use in other modules
window.Auth = Auth;
