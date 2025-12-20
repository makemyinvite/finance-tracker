# FinanceFlow - Personal Finance Tracker

## Overview

FinanceFlow is a comprehensive personal finance management application built for GitHub Pages with Google Sheets as the backend database. It helps you track income, expenses, investments, EMIs, and provides financial calculators.

---

## Features

### 1. Authentication System
- **User Management**: Users are created via Google Sheets menu only (no public registration)
- **Login/Logout**: Secure session-based authentication
- **Forgot Password**: Reset password via email verification code
- **Session Management**: 30-day persistent sessions stored in Google Sheets

### 2. Dashboard
- Overview of total balance, income, and expenses
- Recent transactions list
- Quick add transaction feature
- Monthly spending charts

### 3. Accounts & Cards Management
- Bank accounts tracking
- Credit/Debit cards management
- Digital wallets (Paytm, PhonePe, etc.)
- UPI accounts

### 4. Transaction Management
- Income and expense tracking
- Transfer between accounts
- Category-based organization
- Multiple payment methods (UPI, Cash, Card, NetBanking)
- Search and filter capabilities
- Export to CSV

### 5. Investments & Savings
- **Fixed Deposits (FD)**: Track your FD investments with maturity calculation
- **Recurring Deposits (RD)**: Monthly deposit tracking
- **SIP/Mutual Funds**: Systematic Investment Plan tracking
- **PPF**: Public Provident Fund tracking

### 6. EMI Management
- Add and track loan EMIs
- Payment due date reminders
- Progress tracking (paid vs remaining EMIs)
- Mark EMI as paid (auto-creates expense transaction)
- Link to bank account

### 7. Financial Calculators
- **EMI Calculator**: Calculate monthly EMI for loans
- **Reverse EMI Calculator**: Find interest rate from known EMI amount (uses binary search algorithm)
- **FD Calculator**: Fixed deposit maturity calculation
- **RD Calculator**: Recurring deposit returns
- **SIP Calculator**: Mutual fund future value
- **PPF Calculator**: PPF maturity with tax benefits
- **Amortization Schedule**: Monthly/Yearly breakdown of loan payments

### 8. Reports & Analytics
- Monthly expense reports
- Category-wise spending analysis
- Income vs Expense comparison
- Visual charts and graphs

### 9. Email Notifications (Automated)
- EMI payment reminders (3 days before due date)
- Weekly financial summary
- Automatic EMI expense recording

---

## Architecture

```
FinanceFlow/
├── index.html              # Dashboard page
├── login.html              # Authentication page
├── accounts.html           # Accounts & Cards management
├── transactions.html       # Transaction tracking
├── investments.html        # Investments & EMI tracking
├── calculators.html        # Financial calculators
├── reports.html            # Reports & analytics
├── categories.html         # Category management
├── settings.html           # App settings
├── css/
│   ├── styles.css          # Main styles
│   ├── animations.css      # GSAP animations
│   ├── auth.css            # Login page styles
│   ├── calculators.css     # Calculator styles
│   └── investments.css     # Investment page styles
├── js/
│   ├── config.js           # Configuration & constants
│   ├── storage.js          # LocalStorage management
│   ├── sheets-api.js       # Google Sheets API wrapper
│   ├── app.js              # Main application logic
│   ├── auth.js             # Authentication module
│   ├── dashboard.js        # Dashboard functionality
│   ├── accounts.js         # Account management
│   ├── transactions.js     # Transaction logic
│   ├── investments.js      # Investment & EMI tracking
│   ├── calculators.js      # Calculator logic
│   ├── reports.js          # Reports generation
│   ├── categories.js       # Category management
│   └── animations.js       # GSAP animations
└── google-apps-script/
    └── Code.gs             # Google Apps Script backend
```

---

## Backend (Google Apps Script)

### How It Works

1. **Google Sheets as Database**: All data is stored in a Google Spreadsheet with separate sheets for:
   - `Accounts` - Bank accounts, cards, wallets
   - `Transactions` - Income/expense records
   - `Categories` - Custom categories
   - `Settings` - App configuration
   - `Users` - Registered users
   - `Sessions` - Active login sessions
   - `Investments` - FD, RD, SIP, PPF records
   - `EMIs` - EMI schedules
   - `NotificationSettings` - Email preferences
   - `Logs` - System logs (ERROR, WARNING, INFO)

2. **Web App Deployment**: The Google Apps Script is deployed as a Web App that accepts POST requests with JSON data.

3. **API Communication**:
   - Frontend sends POST requests to the Web App URL
   - Backend processes the request and interacts with Google Sheets
   - Response is sent back as JSON

### API Endpoints (Actions)

#### Authentication
| Action | Parameters | Description |
|--------|------------|-------------|
| `login` | email, password | Authenticate user |
| `logout` | token | End user session |
| `verifyToken` | token | Validate session token |
| `forgotPassword` | email | Send password reset code |
| `resetPassword` | email, code, newPassword | Reset password |
| `changePassword` | token, oldPassword, newPassword | Change password |

> **Note:** User registration is only available via Google Sheets menu (FinanceFlow > Add New User). There is no public registration API.

#### Transactions
| Action | Parameters | Description |
|--------|------------|-------------|
| `addTransaction` | transaction object | Add new transaction |
| `updateTransaction` | id, transaction object | Update transaction |
| `deleteTransaction` | id | Delete transaction |
| `getAllTransactions` | - | Get all transactions |

#### Accounts
| Action | Parameters | Description |
|--------|------------|-------------|
| `addAccount` | account object | Add new account |
| `updateAccount` | id, account object | Update account |
| `deleteAccount` | id | Delete account |
| `getAllAccounts` | - | Get all accounts |

#### Investments & EMIs
| Action | Parameters | Description |
|--------|------------|-------------|
| `saveInvestment` | investment object | Add/update investment |
| `getInvestments` | - | Get all investments |
| `deleteInvestment` | id | Delete investment |
| `saveEmi` | emi object | Add EMI schedule |
| `getEmis` | - | Get all EMIs |
| `updateEmi` | id, emi object | Update EMI |
| `deleteEmi` | id | Delete EMI |

#### Notifications
| Action | Parameters | Description |
|--------|------------|-------------|
| `saveNotificationSettings` | settings object | Save email preferences |
| `getNotificationSettings` | - | Get notification settings |

### Automated Triggers

The backend uses **Google Apps Script time-based triggers** for automated tasks. These triggers run automatically on Google's servers - you don't need to keep any page open or manually run them.

#### How Automation Works

1. **Server-Side Execution**: All automation runs on Google's servers, not in your browser
2. **No User Action Required**: Once set up, triggers run automatically at scheduled times
3. **Background Processing**: The system checks conditions and performs actions automatically
4. **Email Notifications**: Uses Gmail to send notifications to configured email addresses

#### Default Trigger Schedule

| Trigger | Schedule | Function | Description |
|---------|----------|----------|-------------|
| EMI Reminders | Daily 9 AM | `sendEmiReminders()` | Sends email reminders for EMIs due within 3 days |
| Auto-Record EMI | Daily 10 AM | `autoCreateEmiExpenses()` | Automatically records EMI payments as expenses on due dates |
| Weekly Summary | Monday 9 AM | `sendWeeklySummary()` | Sends weekly financial summary email |
| Monthly Report | 1st of month 9 AM | `sendMonthlyReport()` | Detailed monthly financial report with income/expense breakdown |

#### Customizable Settings (via Settings Page)

Users can fully customize automation behavior through the **Settings > Automation & Scheduled Tasks** section:

| Setting | Options | Description |
|---------|---------|-------------|
| **Auto-Record EMI** | Toggle + Time | Automatically add EMI payments as expenses on due date |
| **EMI Reminders** | Toggle + Days + Time | Email reminders before EMI due (1-7 days before) |
| **Weekly Summary** | Toggle + Day + Time | Weekly financial summary email (Mon/Fri/Sun) |
| **Monthly Report** | Toggle + Day + Time | Detailed monthly report (1st, 5th, 15th, or last day) |
| **Recurring Expenses** | Toggle | Auto-add recurring bills and subscriptions |
| **Notification Email** | Email address | Where all notifications are sent |
| **CC Recipients** | Email addresses (comma-separated) | Additional recipients for all notifications |

**Available Time Slots:** 6 AM - 12 PM and 6 PM - 8 PM
**EMI Reminder Days:** 1, 2, 3, 5, or 7 days before due date

#### Setting Up Triggers

To activate automated triggers:

1. Open your Google Spreadsheet
2. Go to **Extensions > Apps Script**
3. Click on **Triggers** (clock icon) in the left sidebar
4. Click **+ Add Trigger** for each function:
   - `sendEmiReminders`: Daily, 9-10 AM
   - `autoCreateEmiExpenses`: Daily, 10-11 AM
   - `sendWeeklySummary`: Weekly, Monday 9-10 AM

Or run `setupNotificationTriggers()` from the Apps Script editor to set up all triggers automatically.

#### Important Notes

- Triggers run in your Google account's timezone
- Gmail sending limits apply (100 emails/day for free accounts)
- Failed triggers will retry automatically
- You can view trigger execution logs in Apps Script > Executions

---

## Setup Instructions

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Note the spreadsheet ID from the URL

### Step 2: Setup Google Apps Script

1. Open the spreadsheet
2. Go to **Extensions > Apps Script**
3. Copy the contents of `google-apps-script/Code.gs` into the script editor
4. Save the project

### Step 3: Deploy as Web App

1. Click **Deploy > New deployment**
2. Select type: **Web app**
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy the Web App URL

### Step 4: Configure Frontend

1. Open `js/config.js`
2. Set `DEFAULT_WEB_APP_URL` to your Web App URL

### Step 5: Create Users

Users can only be created through Google Sheets menu. There is no public registration.

1. Go to your Google Spreadsheet
2. Refresh the page to load the custom menu
3. Click **FinanceFlow > Add New User** in the menu
4. Enter the user's name, email, and password
5. The user account will be created and can now login

### Step 6: Setup Email Notifications

1. In the spreadsheet, click **FinanceFlow > Setup Email Triggers**
2. Authorize the required permissions
3. This creates daily and weekly triggers for notifications

### Step 7: Host on GitHub Pages

1. Push your code to a GitHub repository
2. Go to **Settings > Pages**
3. Select the branch and folder
4. Your site will be live at `https://username.github.io/repository`

---

## Google Sheets Menu

The FinanceFlow menu appears in your Google Spreadsheet after setup. Access it by refreshing the spreadsheet page.

### Menu Options

| Menu Item | Description |
|-----------|-------------|
| **Setup Sheets** | Creates all required sheet tabs with headers |
| **Setup Email Triggers** | Configures automated triggers for notifications |
| **Add New User** | Create a new user account |
| **List All Users** | View all registered users |
| **Delete User** | Remove a user account |
| **View Logs** | Navigate to the Logs sheet |
| **Clear All Data** | Delete all data (with confirmation) |

### Logs Sheet

The Logs sheet automatically records system events:

| Level | Color | Description |
|-------|-------|-------------|
| ERROR | Red | Failed operations, exceptions |
| WARNING | Yellow | Potential issues, validation failures |
| INFO | Blue | Successful operations, email sends |

Logs include: Timestamp, Level, Source, Message, and Details. Auto-cleanup keeps the last 1000 entries.

---

## Password Reset Flow

1. User clicks "Forgot Password?" on login page
2. User enters email address
3. Backend generates 6-digit code and sends via email
4. User enters the code and new password
5. Backend verifies code (valid for 15 minutes)
6. Password is updated and all sessions are cleared
7. User can login with new password

---

## Security Considerations

- Passwords are hashed using SHA-256 before storage
- Session tokens are UUID-based with 30-day expiry
- Reset codes expire after 15 minutes
- All old sessions are cleared on password reset
- No sensitive data is stored in LocalStorage

---

## Technologies Used

### Frontend
- **HTML5/CSS3**: Structure and styling
- **JavaScript (ES6+)**: Application logic
- **Chart.js**: Data visualization
- **GSAP**: Animations
- **Font Awesome**: Icons
- **Google Fonts**: Typography (Inter, Poppins)

### Backend
- **Google Apps Script**: Serverless backend
- **Google Sheets**: Database
- **MailApp Service**: Email notifications

---

## LocalStorage Keys

| Key | Description |
|-----|-------------|
| `financeflow_token` | Session token |
| `financeflow_user` | User info (id, email, name) |
| `financeflow_accounts` | Cached accounts |
| `financeflow_transactions` | Cached transactions |
| `financeflow_categories` | Cached categories |
| `financeflow_investments` | Cached investments |
| `financeflow_emi_schedules` | Cached EMIs |
| `sidebar_collapsed` | Sidebar state |

---

## Troubleshooting

### CORS Errors
- Ensure you're hosting on a web server (not opening HTML files directly)
- Use GitHub Pages or a local server like `python -m http.server`

### Login Not Working
- Verify the Web App URL in config.js is correct
- Check that the Apps Script is deployed as a Web App
- Ensure "Anyone" has access to the Web App

### Emails Not Sending
- Run `setupNotificationTriggers()` from the Apps Script menu
- Check that you've authorized Gmail permissions
- Verify the email address in notification settings

### Data Not Syncing
- Check browser console for errors
- Verify Google Sheets API permissions
- Ensure the spreadsheet ID is correct

---

## License

MIT License - Feel free to use, modify, and distribute.

---

## Support

For issues and feature requests, please create an issue on GitHub.
