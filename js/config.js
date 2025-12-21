/**
 * FinanceFlow - Configuration
 * Central configuration for the application
 */

const CONFIG = {
    // App Info
    APP_NAME: 'FinanceFlow',
    VERSION: '1.0.0',

    // Google Apps Script Web App URL
    DEFAULT_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbwnCpGo-eLYykIfh4-sLTsdKInibNcWfRRGqa-_ccqyFf083A5DItYRgezWpFM2BVhqMA/exec',

    // Storage Keys
    STORAGE_KEYS: {
        SETTINGS: 'financeflow_settings',
        ACCOUNTS: 'financeflow_accounts',
        TRANSACTIONS: 'financeflow_transactions',
        CATEGORIES: 'financeflow_categories',
        BUDGETS: 'financeflow_budgets',
        SHEET_URL: 'financeflow_sheet_url',
        WEB_APP_URL: 'financeflow_webapp_url'
    },

    // Default Categories
    DEFAULT_CATEGORIES: {
        expense: [
            { id: 'food', name: 'Food & Dining', icon: '🍔', description: 'Restaurants, cafes, food delivery' },
            { id: 'groceries', name: 'Groceries', icon: '🛒', description: 'Supermarket, vegetables, daily needs' },
            { id: 'transport', name: 'Transportation', icon: '🚗', description: 'Uber, auto, public transport' },
            { id: 'fuel', name: 'Fuel', icon: '⛽', description: 'Petrol, diesel, CNG' },
            { id: 'shopping', name: 'Shopping', icon: '🛍️', description: 'Clothes, electronics, gadgets' },
            { id: 'bills', name: 'Bills & Utilities', icon: '📱', description: 'Electricity, water, phone, internet' },
            { id: 'entertainment', name: 'Entertainment', icon: '🎬', description: 'Movies, games, events' },
            { id: 'health', name: 'Health & Medical', icon: '🏥', description: 'Doctor, medicines, hospital' },
            { id: 'education', name: 'Education', icon: '📚', description: 'Courses, books, tuition' },
            { id: 'travel', name: 'Travel', icon: '✈️', description: 'Flights, hotels, vacation' },
            { id: 'subscriptions', name: 'Subscriptions', icon: '📺', description: 'Netflix, Spotify, apps' },
            { id: 'personal', name: 'Personal Care', icon: '💅', description: 'Salon, grooming, cosmetics' },
            { id: 'gifts', name: 'Gifts & Donations', icon: '🎁', description: 'Presents, charity' },
            { id: 'insurance', name: 'Insurance', icon: '🛡️', description: 'Health, life, vehicle insurance' },
            { id: 'taxes', name: 'Taxes', icon: '🏛️', description: 'Income tax, GST' },
            { id: 'emi', name: 'EMI', icon: '💳', description: 'Loan payments, EMIs' },
            { id: 'other', name: 'Other', icon: '📦', description: 'Miscellaneous expenses' }
        ],
        income: [
            { id: 'salary', name: 'Salary', icon: '💰', description: 'Monthly salary, bonus' },
            { id: 'freelance', name: 'Freelance', icon: '💼', description: 'Contract work, gigs' },
            { id: 'business', name: 'Business', icon: '🏪', description: 'Business income' },
            { id: 'investment', name: 'Investment Returns', icon: '📈', description: 'Dividends, interest, capital gains' },
            { id: 'rental', name: 'Rental Income', icon: '🏠', description: 'Property rent' },
            { id: 'refund', name: 'Refund', icon: '↩️', description: 'Returns, reimbursements' },
            { id: 'cashback', name: 'Cashback', icon: '💸', description: 'Credit card rewards, cashback' },
            { id: 'other', name: 'Other', icon: '📦', description: 'Miscellaneous income' }
        ]
    },

    // Payment Methods
    PAYMENT_METHODS: [
        { id: 'cash', name: 'Cash', icon: '💵' },
        { id: 'upi', name: 'UPI', icon: '📱' },
        { id: 'credit', name: 'Credit Card', icon: '💳' },
        { id: 'debit', name: 'Debit Card', icon: '💳' },
        { id: 'netbanking', name: 'Net Banking', icon: '🏦' },
        { id: 'wallet', name: 'Digital Wallet', icon: '👛' },
        { id: 'cheque', name: 'Cheque', icon: '📝' }
    ],

    // Banks
    BANKS: [
        { id: 'HDFC', name: 'HDFC Bank' },
        { id: 'ICICI', name: 'ICICI Bank' },
        { id: 'SBI', name: 'State Bank of India' },
        { id: 'Axis', name: 'Axis Bank' },
        { id: 'Kotak', name: 'Kotak Mahindra Bank' },
        { id: 'Yes', name: 'Yes Bank' },
        { id: 'IndusInd', name: 'IndusInd Bank' },
        { id: 'IDFC', name: 'IDFC First Bank' },
        { id: 'RBL', name: 'RBL Bank' },
        { id: 'AU', name: 'AU Small Finance Bank' },
        { id: 'Paytm', name: 'Paytm Payments Bank' },
        { id: 'Other', name: 'Other' }
    ],

    // Chart Colors
    CHART_COLORS: {
        primary: '#6366f1',
        secondary: '#10b981',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        purple: '#8b5cf6',
        pink: '#ec4899',
        cyan: '#06b6d4',
        orange: '#f97316',
        palette: [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6'
        ]
    },

    // Currency Settings
    CURRENCY: {
        symbol: '₹',
        code: 'INR',
        locale: 'en-IN'
    },

    // Date Formats
    DATE_FORMAT: 'DD/MM/YYYY',

    // Fiscal Year (April to March for India)
    FISCAL_YEAR_START: 4,

    // Pagination
    ITEMS_PER_PAGE: 20,

    // Animation Duration
    ANIMATION_DURATION: 300,

    // Toast Duration
    TOAST_DURATION: 3000
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.DEFAULT_CATEGORIES);
Object.freeze(CONFIG.PAYMENT_METHODS);
Object.freeze(CONFIG.BANKS);
Object.freeze(CONFIG.CHART_COLORS);
Object.freeze(CONFIG.CURRENCY);
