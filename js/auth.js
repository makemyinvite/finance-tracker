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
        // Register service worker for PWA
        this.registerServiceWorker();

        // Check if already logged in
        const token = localStorage.getItem('financeflow_token');
        if (token) {
            this.verifySession(token);
        }

        this.setupEventListeners();
    },

    /**
     * Register Service Worker for PWA functionality
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js', {
                    scope: './'
                });
                console.log('[PWA] Service Worker registered:', registration.scope);
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
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

        // Passwordless: ask for a code, then exchange it
        document.getElementById('codeRequestElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.requestCode();
        });
        document.getElementById('codeVerifyElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.verifyCode();
        });

        // An emailed magic link lands here with ?login=<token> and signs in on arrival.
        this.tryMagicLink();
    },

    /**
     * Ask the server to email a sign-in code.
     *
     * The reply is deliberately the same whether or not the address can sign in, and this
     * shows it verbatim. Translating it into "no such user" in the client would rebuild the
     * membership oracle the server goes out of its way to avoid.
     */
    async requestCode() {
        const email = document.getElementById('codeEmail').value.trim();
        if (!email) return;
        const btn = document.querySelector('#codeRequestElement button[type="submit"]');
        this.setLoading(btn, true);
        try {
            const res = await SheetsAPI.request('requestLoginCode', {
                email,
                // Lets the emailed magic link point back at wherever this app is served from,
                // rather than relying on APP_URL being set in Script Properties.
                appUrl: window.location.origin + window.location.pathname.replace(/[^/]*$/, '')
            });
            if (res && res.success === false) {
                // A real refusal: the throttle. Worth showing, it is not about identity.
                this.showToast(res.error || 'Could not send a code.', 'error');
                return;
            }
            this._codeEmail = email;
            document.getElementById('codeRequestElement').classList.add('hidden');
            document.getElementById('codeVerifyElement').classList.remove('hidden');
            const sentTo = document.getElementById('codeSentTo');
            if (sentTo) sentTo.textContent = (res && res.message) || 'Check your email.';
            document.getElementById('codeDigits')?.focus();
        } catch (err) {
            this.showToast('Could not reach the server.', 'error');
        } finally {
            this.setLoading(btn, false);
        }
    },

    /** Exchange the six digits for a session. */
    async verifyCode() {
        const code = document.getElementById('codeDigits').value.trim();
        if (!code || !this._codeEmail) return;
        const btn = document.querySelector('#codeVerifyElement button[type="submit"]');
        this.setLoading(btn, true);
        try {
            const res = await SheetsAPI.request('verifyLoginCode', { email: this._codeEmail, code });
            if (res && res.success && res.token) {
                this.persistSession(res);
                return;
            }
            this.showToast((res && res.error) || 'That code is not valid.', 'error');
        } catch (err) {
            this.showToast('Could not reach the server.', 'error');
        } finally {
            this.setLoading(btn, false);
        }
    },

    /** Back to the email step, e.g. after a typo in the address. */
    resetCodeFlow() {
        this._codeEmail = null;
        document.getElementById('codeVerifyElement')?.classList.add('hidden');
        document.getElementById('codeRequestElement')?.classList.remove('hidden');
        const d = document.getElementById('codeDigits'); if (d) d.value = '';
    },

    /**
     * Redeem a magic link on arrival.
     *
     * The emailed link is this page plus ?login=<token>, so landing on it should sign you in
     * with no interaction. The token is stripped from the URL immediately afterwards: it is
     * single-use server-side, but leaving it in the address bar puts it in history and in any
     * screenshot of the tab.
     */
    async tryMagicLink() {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('login');
        if (!token) return false;
        history.replaceState({}, '', window.location.pathname);
        try {
            const res = await SheetsAPI.request('redeemMagicLink', { linkToken: token });
            if (res && res.success && res.token) {
                this.persistSession(res);
                return true;
            }
            this.showToast((res && res.error) || 'That sign-in link is no longer valid.', 'error');
        } catch (err) {
            this.showToast('Could not reach the server.', 'error');
        }
        return false;
    },

    /**
     * Store a session and go. Shared by both passwordless routes so there is one definition
     * of what "signed in" means, rather than three that can drift.
     */
    persistSession(res) {
        localStorage.setItem('financeflow_token', res.token);
        localStorage.setItem('financeflow_user', JSON.stringify(res.user || {}));
        this.showToast('Signed in.', 'success');
        window.location.href = './index.html';
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
            // Only a request that never completed reaches here now — a refusal from the
            // server arrives as result.success === false and is shown above. Still prefer
            // the real message over a guess about the cause.
            this.showToast(error && error.message ? error.message : 'Could not reach the server.', 'error');
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
    const forms = ['login', 'forgot', 'reset', 'code'];
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
