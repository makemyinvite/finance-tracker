/**
 * FinanceFlow - Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Copy and paste this code
 * 4. Save the project
 * 5. Deploy > New deployment > Web app
 * 6. Execute as: Me, Who has access: Anyone
 * 7. Copy the Web App URL and paste it in FinanceFlow settings
 */

// Configuration
const CONFIG = {
  SHEET_NAMES: {
    ACCOUNTS: 'Accounts',
    TRANSACTIONS: 'Transactions',
    CATEGORIES: 'Categories',
    SETTINGS: 'Settings',
    USERS: 'Users',
    SESSIONS: 'Sessions',
    INVESTMENTS: 'Investments',
    EMIS: 'EMIs',
    NOTIFICATIONS: 'NotificationSettings',
    LOGS: 'Logs',
    PENDING_TRANSACTIONS: 'PendingTransactions'
  }
};

// Log Levels
const LOG_LEVEL = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

/**
 * Write log entry to Logs sheet
 * @param {string} level - ERROR, WARNING, or INFO
 * @param {string} source - Function or module name
 * @param {string} message - Log message
 * @param {string} details - Additional details (optional)
 * @param {string} user - User email who performed the action (optional)
 */
function writeLog(level, source, message, details = '', user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.LOGS);

    // Initialize headers if new sheet
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Level', 'Source', 'Message', 'Details', 'User']);
      sheet.getRange(1, 1, 1, 6).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setColumnWidths(1, 1, 180); // Timestamp
      sheet.setColumnWidths(2, 1, 80);  // Level
      sheet.setColumnWidths(3, 1, 150); // Source
      sheet.setColumnWidths(4, 1, 300); // Message
      sheet.setColumnWidths(5, 1, 300); // Details
      sheet.setColumnWidths(6, 1, 200); // User
    }

    const timestamp = new Date().toISOString();
    sheet.appendRow([timestamp, level, source, message, details, user]);

    // Color code the row based on level
    const lastRow = sheet.getLastRow();
    const levelCell = sheet.getRange(lastRow, 2);
    switch (level) {
      case LOG_LEVEL.ERROR:
        levelCell.setBackground('#fee2e2').setFontColor('#dc2626');
        break;
      case LOG_LEVEL.WARNING:
        levelCell.setBackground('#fef3c7').setFontColor('#d97706');
        break;
      case LOG_LEVEL.INFO:
        levelCell.setBackground('#dbeafe').setFontColor('#2563eb');
        break;
    }

    // Keep only last 1000 log entries to prevent sheet from growing too large
    if (sheet.getLastRow() > 1001) {
      sheet.deleteRows(2, sheet.getLastRow() - 1000);
    }
  } catch (error) {
    console.error('Error writing log:', error);
  }
}

/**
 * Log error
 */
function logError(source, message, details = '', user = 'System') {
  writeLog(LOG_LEVEL.ERROR, source, message, details, user);
  console.error(`[${source}] ${message}`, details);
}

/**
 * Log warning
 */
function logWarning(source, message, details = '', user = 'System') {
  writeLog(LOG_LEVEL.WARNING, source, message, details, user);
  console.warn(`[${source}] ${message}`, details);
}

/**
 * Log info
 */
function logInfo(source, message, details = '', user = 'System') {
  writeLog(LOG_LEVEL.INFO, source, message, details, user);
  console.log(`[${source}] ${message}`, details);
}

/**
 * Get logs for frontend display
 * @param {number} limit - Number of logs to return (default 100)
 * @param {number} offset - Offset for pagination (default 0)
 */
function getLogs(limit = 100, offset = 0) {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.LOGS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, logs: [], total: 0 };
    }

    // Reverse to show newest first (skip header)
    const logs = data.slice(1).reverse().map(row => ({
      timestamp: row[0],
      level: row[1],
      source: row[2],
      message: row[3],
      details: row[4],
      user: row[5] || 'System'
    }));

    const total = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);

    return { success: true, logs: paginatedLogs, total };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Manually trigger a report
 * @param {string} type - 'weekly' or 'monthly'
 * @param {string} token - User token for authentication
 */
function sendReportNow(type, token) {
  try {
    // Get user from token
    let userEmail = 'Manual Trigger';
    if (token) {
      const tokenResult = verifyToken(token);
      if (tokenResult.valid && tokenResult.user) {
        userEmail = tokenResult.user.email;
      }
    }

    // Get email from automation settings
    const autoSettings = getAutomationSettings();
    const settings = autoSettings.success ? autoSettings.settings : {};
    const email = settings.notifyemail || settings.notifyEmail;

    if (!email) {
      return { success: false, error: 'No email address configured. Please set your notification email in Settings.' };
    }

    logInfo('Reports', `Manual ${type} report triggered`, `Type: ${type}, Email: ${email}`, userEmail);

    if (type === 'weekly') {
      const result = sendWeeklySummary(email);
      return result || { success: true, message: 'Weekly summary sent successfully' };
    } else if (type === 'monthly') {
      const result = sendMonthlyReport(email);
      return result || { success: true, message: 'Monthly report sent successfully' };
    } else {
      return { success: false, error: 'Invalid report type' };
    }
  } catch (error) {
    logError('Reports', `Failed to send ${type} report`, error.message);
    return { success: false, error: error.message };
  }
}

// ================== CUSTOM MENU ==================

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('FinanceFlow')
    .addItem('Setup Sheets', 'setupAllSheets')
    .addItem('Setup Email Triggers', 'setupNotificationTriggers')
    .addSeparator()
    .addItem('Add New User', 'showAddUserDialog')
    .addItem('List All Users', 'showUsersList')
    .addItem('Delete User', 'showDeleteUserDialog')
    .addSeparator()
    .addItem('View Logs', 'goToLogsSheet')
    .addItem('Clear All Data', 'confirmClearAllData')
    .addToUi();
}

/**
 * Setup all required sheets
 */
function setupAllSheets() {
  const sheetNames = Object.values(CONFIG.SHEET_NAMES);
  sheetNames.forEach(name => {
    getOrCreateSheet(name);
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('All sheets have been set up!', 'FinanceFlow', 5);
  logInfo('Setup', 'All sheets initialized', sheetNames.join(', '));
}

/**
 * Show dialog to delete a user
 */
function showDeleteUserDialog() {
  const ui = SpreadsheetApp.getUi();

  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      ui.alert('No users found!');
      return;
    }

    // Show users list
    let userList = 'Enter the email of user to delete:\n\n';
    for (let i = 1; i < data.length; i++) {
      userList += `• ${data[i][3]} (${data[i][1]})\n`;
    }

    const emailResponse = ui.prompt('Delete User', userList, ui.ButtonSet.OK_CANCEL);

    if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
    const email = emailResponse.getResponseText().trim();

    if (!email) {
      ui.alert('No email entered!');
      return;
    }

    // Find and delete user
    let deleted = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        const confirmResponse = ui.alert(
          'Confirm Delete',
          `Are you sure you want to delete user "${data[i][3]}" (${email})?`,
          ui.ButtonSet.YES_NO
        );

        if (confirmResponse === ui.Button.YES) {
          sheet.deleteRow(i + 1);
          ui.alert('User deleted successfully!');
          logInfo('UserManagement', 'User deleted', `Email: ${email}`);
          deleted = true;
        }
        break;
      }
    }

    if (!deleted) {
      ui.alert('User not found with email: ' + email);
    }
  } catch (error) {
    ui.alert('Error: ' + error.message);
    logError('UserManagement', 'Failed to delete user', error.message);
  }
}

/**
 * Show dialog to add new user
 */
function showAddUserDialog() {
  const ui = SpreadsheetApp.getUi();

  // Get email
  const emailResponse = ui.prompt(
    'Add New User',
    'Enter email address:',
    ui.ButtonSet.OK_CANCEL
  );

  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResponse.getResponseText().trim();

  if (!email || !email.includes('@')) {
    ui.alert('Invalid email address!');
    return;
  }

  // Get name
  const nameResponse = ui.prompt(
    'Add New User',
    'Enter user name:',
    ui.ButtonSet.OK_CANCEL
  );

  if (nameResponse.getSelectedButton() !== ui.Button.OK) return;
  const name = nameResponse.getResponseText().trim() || 'User';

  // Get password
  const passwordResponse = ui.prompt(
    'Add New User',
    'Enter password (min 6 characters):',
    ui.ButtonSet.OK_CANCEL
  );

  if (passwordResponse.getSelectedButton() !== ui.Button.OK) return;
  const password = passwordResponse.getResponseText();

  if (!password || password.length < 6) {
    ui.alert('Password must be at least 6 characters!');
    return;
  }

  // Create user
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);

    // Check if user already exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        ui.alert('User with this email already exists!');
        return;
      }
    }

    const id = generateId();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    // Add headers if new sheet
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['id', 'email', 'password', 'name', 'createdAt', 'updatedAt']);
    }

    sheet.appendRow([id, email, passwordHash, name, now, now]);

    // Send welcome email
    sendWelcomeEmail(email, name, password);

    ui.alert('User Created!\n\nEmail: ' + email + '\nName: ' + name + '\nPassword: ' + password + '\n\nWelcome email has been sent!');
    logInfo('UserManagement', 'New user created', `Email: ${email}, Name: ${name}`);
  } catch (error) {
    ui.alert('Error creating user: ' + error.message);
    logError('UserManagement', 'Failed to create user', error.message);
  }
}

/**
 * Show list of all users
 */
function showUsersList() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      SpreadsheetApp.getUi().alert('No users found!');
      return;
    }

    let userList = 'Registered Users:\n\n';
    for (let i = 1; i < data.length; i++) {
      userList += `${i}. ${data[i][3]} (${data[i][1]})\n`;
    }
    userList += `\nTotal: ${data.length - 1} user(s)`;

    SpreadsheetApp.getUi().alert(userList);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Navigate to Logs sheet
 */
function goToLogsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOGS);

  if (!logsSheet) {
    logsSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.LOGS);
  }

  ss.setActiveSheet(logsSheet);
  SpreadsheetApp.getActiveSpreadsheet().toast('Viewing Logs sheet', 'FinanceFlow', 3);
}

/**
 * Confirm and clear all data
 */
function confirmClearAllData() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Clear All Data',
    'WARNING: This will delete ALL data from ALL sheets!\n\nAre you absolutely sure?',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    const confirmResponse = ui.alert(
      'Final Confirmation',
      'Type "DELETE" in the next prompt to confirm.',
      ui.ButtonSet.OK_CANCEL
    );

    if (confirmResponse === ui.Button.OK) {
      const typeResponse = ui.prompt('Type DELETE to confirm:');

      if (typeResponse.getResponseText().trim() === 'DELETE') {
        clearAllData();
        ui.alert('All data has been cleared!');
        logWarning('DataManagement', 'All data cleared by user', 'Manual clear from menu');
      } else {
        ui.alert('Deletion cancelled. Text did not match.');
      }
    }
  }
}

/**
 * Clear all data from all sheets
 */
function clearAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = Object.values(CONFIG.SHEET_NAMES);

  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  var output = ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'FinanceFlow API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    // Parse the request body
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return createJsonResponse({ success: false, error: 'No data received' });
    }

    const data = JSON.parse(contents);
    const action = data.action;

    // Extract user info from request for logging
    const userEmail = data.userEmail || null;
    const userName = data.userName || null;
    const user = userName || userEmail || 'System';

    // Token validation for protected actions
    const protectedActions = [
      'addTransaction', 'updateTransaction', 'deleteTransaction',
      'addAccount', 'updateAccount', 'deleteAccount',
      'addCategory', 'saveInvestment', 'deleteInvestment',
      'saveEmi', 'updateEmi', 'deleteEmi',
      'saveNotificationSettings', 'saveAutomationSettings',
      'getPendingTransactions', 'approvePendingTransaction', 'rejectPendingTransaction',
      'changePassword', 'logout'
    ];

    if (protectedActions.includes(action) && data.token) {
      const tokenResult = verifyToken(data.token);
      if (!tokenResult.success) {
        return createJsonResponse({ success: false, error: 'Invalid or expired token' });
      }
    }

    let result;

    switch (action) {
      case 'test':
        result = { success: true, message: 'Connection successful' };
        break;

      // Transactions
      case 'addTransaction':
        result = addTransaction(data.transaction, user);
        break;
      case 'updateTransaction':
        result = updateTransaction(data.id, data.transaction, user);
        break;
      case 'deleteTransaction':
        result = deleteTransaction(data.id, user);
        break;
      case 'getTransactionsByMonth':
        result = getTransactionsByMonth(data.year, data.month);
        break;
      case 'getAllTransactions':
        result = getAllTransactions();
        break;

      // Accounts
      case 'addAccount':
        result = addAccount(data.account, user);
        break;
      case 'updateAccount':
        result = updateAccount(data.id, data.account, user);
        break;
      case 'deleteAccount':
        result = deleteAccount(data.id, user);
        break;
      case 'getAccounts':
        result = getAccounts();
        break;

      // Categories
      case 'addCategory':
        result = addCategory(data.category, user);
        break;
      case 'getCategories':
        result = getCategories();
        break;

      // Sync
      case 'syncAll':
        result = syncAll();
        break;
      case 'pushAll':
        result = pushAll(data.data);
        break;

      // Authentication
      case 'register':
        result = registerUser(data.email, data.password, data.name);
        break;
      case 'login':
        result = loginUser(data.email, data.password);
        break;
      case 'logout':
        result = logoutUser(data.token, user);
        break;
      case 'verifyToken':
        result = verifyToken(data.token);
        break;
      case 'changePassword':
        result = changePassword(data.token, data.oldPassword, data.newPassword, user);
        break;
      case 'forgotPassword':
        result = forgotPassword(data.email);
        break;
      case 'resetPassword':
        result = resetPassword(data.email, data.code, data.newPassword);
        break;

      // Investments & EMIs
      case 'saveInvestment':
        result = saveInvestment(data.investment, user);
        break;
      case 'getInvestments':
        result = getInvestments();
        break;
      case 'deleteInvestment':
        result = deleteInvestmentById(data.id, user);
        break;
      case 'saveInvestmentNotifications':
        result = saveInvestmentNotifications(data.settings, user);
        break;
      case 'saveEmi':
        result = saveEmi(data.emi, user);
        break;
      case 'getEmis':
        result = getEmis();
        break;
      case 'updateEmi':
        result = updateEmi(data.id, data.emi, user);
        break;
      case 'deleteEmi':
        result = deleteEmiById(data.id, user);
        break;

      // Notifications
      case 'saveNotificationSettings':
        result = saveNotificationSettings(data.settings, user);
        break;
      case 'getNotificationSettings':
        result = getNotificationSettings();
        break;

      // Automation Settings
      case 'saveAutomationSettings':
        result = saveAutomationSettings(data.settings, user);
        break;
      case 'getAutomationSettings':
        result = getAutomationSettings();
        break;

      // General Settings
      case 'saveGeneralSettings':
        result = saveGeneralSettings(data.settings, user);
        break;
      case 'getGeneralSettings':
        result = getGeneralSettings();
        break;

      // File Upload
      case 'uploadFile':
        result = uploadFileToDrive(data.fileName, data.mimeType, data.data, user);
        break;

      // Manual Report Triggers
      case 'sendReportNow':
        result = sendReportNow(data.type, data.token);
        break;

      // Audit Logs
      case 'getLogs':
        result = getLogs(data.limit, data.offset);
        break;

      // Pending Transactions
      case 'getPendingTransactions':
        result = getPendingTransactions();
        break;
      case 'approvePendingTransaction':
        result = approvePendingTransaction(data.id, user);
        break;
      case 'rejectPendingTransaction':
        result = rejectPendingTransaction(data.id, user);
        break;

      // EMI Settings
      case 'saveEmiSettings':
        result = saveAutomationSettings(data.settings, user);
        break;

      // Write log from frontend
      case 'writeLog':
        const level = data.level || 'info';
        const module = data.module || 'Frontend';
        const action = data.action || 'Unknown';
        const details = data.details || '';
        if (level === 'error') {
          logError(module, action, details, user);
        } else if (level === 'warning') {
          logWarning(module, action, details, user);
        } else {
          logInfo(module, action, details, user);
        }
        result = { success: true };
        break;

      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return createJsonResponse(result);

  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

/**
 * Create JSON response with proper headers
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Upload file to Google Drive
 * @param {string} fileName - Name of the file
 * @param {string} mimeType - MIME type of the file
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} user - User who uploaded the file
 * @returns {Object} - Result with file URL
 */
function uploadFileToDrive(fileName, mimeType, base64Data, user = 'System') {
  try {
    // Decode base64 data
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);

    // Get or create FinanceFlow folder
    const folderName = 'FinanceFlow_Receipts';
    let folder;

    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      logInfo('FileUpload', 'Created receipts folder', folderName, user);
    }

    // Create file in the folder
    const file = folder.createFile(blob);

    // Set file to be viewable by anyone with the link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = file.getUrl();
    const fileId = file.getId();

    logInfo('FileUpload', 'File uploaded successfully', `Name: ${fileName}, ID: ${fileId}`, user);

    return {
      success: true,
      fileUrl: fileUrl,
      fileId: fileId,
      fileName: fileName
    };
  } catch (error) {
    logError('FileUpload', 'Failed to upload file', `Name: ${fileName}, Error: ${error.message}`, user);
    return {
      success: false,
      error: error.message
    };
  }
}

// ================== SHEET UTILITIES ==================

/**
 * Get or create a sheet
 */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    initializeSheet(sheet, name);
  }

  return sheet;
}

/**
 * Initialize sheet with headers
 */
function initializeSheet(sheet, name) {
  const headers = {
    [CONFIG.SHEET_NAMES.ACCOUNTS]: [
      'ID', 'Account Type', 'Name', 'Bank Name', 'Account Number',
      'Current Balance', 'Credit Limit', 'Billing Cycle', 'Min Quarterly Spend',
      'Annual Fee', 'Reward Type', 'Wallet Type', 'Color', 'Notes',
      'Has Debit Card', 'Debit Card Number', 'Created At', 'Updated At'
    ],
    [CONFIG.SHEET_NAMES.TRANSACTIONS]: [
      'ID', 'Type', 'Amount', 'Date', 'Time', 'Description',
      'Category', 'Payment Method', 'Account', 'To Account',
      'UPI ID', 'UPI Ref', 'Tags', 'Notes', 'Is Recurring',
      'Recurring Frequency', 'Recurring End', 'Created At', 'Updated At'
    ],
    [CONFIG.SHEET_NAMES.CATEGORIES]: [
      'ID', 'Type', 'Name', 'Icon', 'Description', 'Budget', 'Custom', 'Created At'
    ],
    [CONFIG.SHEET_NAMES.SETTINGS]: [
      'Key', 'Value'
    ],
    [CONFIG.SHEET_NAMES.USERS]: [
      'ID', 'Email', 'Password Hash', 'Name', 'Created At', 'Updated At'
    ],
    [CONFIG.SHEET_NAMES.SESSIONS]: [
      'Token', 'User ID', 'Email', 'Created At', 'Expires At'
    ],
    [CONFIG.SHEET_NAMES.INVESTMENTS]: [
      'ID', 'Type', 'Name', 'Principal', 'Interest Rate', 'Tenure Months', 'Tenure Years',
      'Monthly Deposit', 'Monthly Amount', 'Yearly Amount', 'Maturity Amount', 'Future Value',
      'Start Date', 'Maturity Date', 'Status', 'Account ID', 'Notes', 'Created At', 'Updated At'
    ],
    [CONFIG.SHEET_NAMES.EMIS]: [
      'ID', 'Name', 'Amount', 'Total EMIs', 'Remaining EMIs', 'Payment Day',
      'Start Date', 'Account ID', 'Loan Type', 'Principal', 'Interest Rate',
      'Paid EMIs Data', 'Status', 'Created At', 'Updated At'
    ],
    [CONFIG.SHEET_NAMES.NOTIFICATIONS]: [
      'ID', 'Email', 'EMI Reminders', 'Maturity Reminders', 'Weekly Summary',
      'Reminder Days Before', 'Created At', 'Updated At'
    ]
  };

  if (headers[name]) {
    sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]);
    sheet.getRange(1, 1, 1, headers[name].length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

/**
 * Get month sheet name
 */
function getMonthSheetName(year, month) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Transactions_${monthNames[month]}_${year}`;
}

/**
 * Generate unique ID
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Convert row to object
 */
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((header, index) => {
    const key = header.toLowerCase().replace(/\s+/g, '');
    obj[key] = row[index];
  });
  return obj;
}

/**
 * Convert object to row
 */
function objectToRow(headers, obj) {
  return headers.map(header => {
    const key = header.toLowerCase().replace(/\s+/g, '');
    return obj[key] || '';
  });
}

// ================== TRANSACTIONS ==================

/**
 * Add transaction
 */
function addTransaction(transaction, userEmail = 'System') {
  try {
    const date = new Date(transaction.date);
    const sheetName = getMonthSheetName(date.getFullYear(), date.getMonth());
    const sheet = getOrCreateSheet(sheetName);

    // Also add to main transactions sheet
    const mainSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.TRANSACTIONS);

    const id = transaction.id || generateId();
    const now = new Date().toISOString();

    const row = [
      id,
      transaction.type,
      transaction.amount,
      transaction.date,
      transaction.time || '',
      transaction.description,
      transaction.category,
      transaction.paymentMethod,
      transaction.account,
      transaction.toAccount || '',
      transaction.upiId || '',
      transaction.upiRef || '',
      (transaction.tags || []).join(','),
      transaction.notes || '',
      transaction.isRecurring || false,
      transaction.recurringFrequency || '',
      transaction.recurringEnd || '',
      transaction.attachmentUrl || '',
      transaction.attachmentName || '',
      now,
      now
    ];

    sheet.appendRow(row);
    mainSheet.appendRow(row);

    // Update account balance
    updateAccountBalance(transaction.account, transaction.amount, transaction.type, userEmail);

    // Handle transfer - also update destination account
    if (transaction.type === 'transfer' && transaction.toAccount) {
      updateAccountBalance(transaction.toAccount, transaction.amount, 'income', userEmail);
      logInfo('Transaction', 'Transfer completed', `From: ${transaction.account}, To: ${transaction.toAccount}, Amount: ${transaction.amount}`, userEmail);
    }

    logInfo('Transaction', 'Transaction added', `ID: ${id}, Type: ${transaction.type}, Amount: ${transaction.amount}, Category: ${transaction.category}, Description: ${transaction.description}`, userEmail);

    return { success: true, id: id };
  } catch (error) {
    logError('Transaction', 'Failed to add transaction', error.message, userEmail);
    return { success: false, error: error.message };
  }
}

/**
 * Update account balance in Accounts sheet
 */
function updateAccountBalance(accountId, amount, type, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
    const data = sheet.getDataRange().getValues();

    // Column indices (0-based):
    // 0: id, 1: accountType, 2: name, 3: bankName, 4: accountNumber, 5: currentBalance
    // 6: creditLimit, 7: billingCycle, 8-13: other fields, 14: createdAt, 15: updatedAt

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === accountId) {
        const currentBalance = parseFloat(data[i][5]) || 0; // Column 6 (index 5) is currentBalance
        const change = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
        const newBalance = currentBalance + change;

        sheet.getRange(i + 1, 6).setValue(newBalance); // Column 6 is currentBalance (1-based)
        sheet.getRange(i + 1, 16).setValue(new Date().toISOString()); // Column 16 is updatedAt

        logInfo('Account', 'Balance updated', `Account: ${accountId}, Old: ${currentBalance}, Change: ${change}, New: ${newBalance}`, user);
        return true;
      }
    }
    return false;
  } catch (error) {
    logError('Account', 'Failed to update balance', `Account: ${accountId}, Error: ${error.message}`, user);
    return false;
  }
}

/**
 * Update transaction
 */
function updateTransaction(id, transaction, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const row = [
          id,
          transaction.type,
          transaction.amount,
          transaction.date,
          transaction.time || '',
          transaction.description,
          transaction.category,
          transaction.paymentMethod,
          transaction.account,
          transaction.toAccount || '',
          transaction.upiId || '',
          transaction.upiRef || '',
          (transaction.tags || []).join(','),
          transaction.notes || '',
          transaction.isRecurring || false,
          transaction.recurringFrequency || '',
          transaction.recurringEnd || '',
          data[i][17], // Keep original created at
          new Date().toISOString()
        ];

        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        logInfo('Transaction', 'Transaction updated', `ID: ${id}, Type: ${transaction.type}, Amount: ${transaction.amount}`, user);
        return { success: true };
      }
    }

    logWarning('Transaction', 'Transaction not found for update', `ID: ${id}`, user);
    return { success: false, error: 'Transaction not found' };
  } catch (error) {
    logError('Transaction', 'Failed to update transaction', `ID: ${id}, Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Delete transaction
 */
function deleteTransaction(id, userEmail = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        // Get transaction details before deleting
        const type = data[i][1];
        const amount = parseFloat(data[i][2]);
        const accountId = data[i][8];
        const description = data[i][5];

        // Reverse the balance change
        const reverseType = type === 'income' ? 'expense' : 'income';
        updateAccountBalance(accountId, amount, reverseType);

        sheet.deleteRow(i + 1);

        logInfo('Transaction', 'Transaction deleted', `ID: ${id}, Type: ${type}, Amount: ${amount}, Description: ${description}`, userEmail);
        return { success: true };
      }
    }

    logWarning('Transaction', 'Transaction not found for deletion', `ID: ${id}`, userEmail);
    return { success: false, error: 'Transaction not found' };
  } catch (error) {
    logError('Transaction', 'Failed to delete transaction', `ID: ${id}, Error: ${error.message}`, userEmail);
    return { success: false, error: error.message };
  }
}

/**
 * Get transactions by month
 */
function getTransactionsByMonth(year, month) {
  try {
    const sheetName = getMonthSheetName(year, month);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { success: true, transactions: [] };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, transactions: [] };
    }

    const headers = data[0];
    const transactions = data.slice(1).map(row => {
      const obj = rowToObject(headers, row);
      obj.tags = obj.tags ? obj.tags.split(',') : [];
      return obj;
    });

    return { success: true, transactions: transactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all transactions
 */
function getAllTransactions() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, transactions: [] };
    }

    const headers = data[0];
    const transactions = data.slice(1).map(row => {
      const obj = rowToObject(headers, row);
      obj.tags = obj.tags ? obj.tags.split(',') : [];
      return obj;
    });

    return { success: true, transactions: transactions };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================== ACCOUNTS ==================

/**
 * Add account
 */
function addAccount(account, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
    const id = account.id || generateId();
    const now = new Date().toISOString();
    const initialBalance = parseFloat(account.currentBalance) || 0;

    const row = [
      id,
      account.accountType,
      account.name,
      account.bankName,
      account.accountNumber,
      initialBalance,
      account.creditLimit || 0,
      account.billingCycle || '',
      account.minSpendQuarterly || 0,
      account.annualFee || 0,
      account.rewardType || '',
      account.walletType || '',
      account.color || 'gradient-1',
      account.notes || '',
      account.hasDebitCard || false,
      account.debitCardNumber || '',
      now,
      now
    ];

    sheet.appendRow(row);
    logInfo('Account', 'Account added', `ID: ${id}, Type: ${account.accountType}, Name: ${account.name}, Bank: ${account.bankName}`, user);

    // Add initial balance as income transaction (except for credit cards where balance = debt)
    if (initialBalance > 0 && account.accountType !== 'credit') {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const incomeTransaction = {
        id: generateId(),
        type: 'income',
        amount: initialBalance,
        category: 'Opening Balance',
        description: `Initial balance - ${account.name}`,
        date: today.toISOString().split('T')[0],
        paymentMethod: account.accountType === 'cash' ? 'cash' : 'bank',
        accountId: id,
        notes: `Opening balance added when creating ${account.accountType} account: ${account.name}`,
        isOpeningBalance: true
      };

      addTransactionToMonth(year, month, incomeTransaction, user);
      logInfo('Account', 'Opening balance recorded as income', `Account: ${account.name}, Amount: ₹${initialBalance}`, user);
    }

    return { success: true, id: id };
  } catch (error) {
    logError('Account', 'Failed to add account', `Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Update account
 */
function updateAccount(id, account, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const oldName = data[i][2];
        const row = [
          id,
          account.accountType,
          account.name,
          account.bankName,
          account.accountNumber,
          account.currentBalance || 0,
          account.creditLimit || 0,
          account.billingCycle || '',
          account.minSpendQuarterly || 0,
          account.annualFee || 0,
          account.rewardType || '',
          account.walletType || '',
          account.color || 'gradient-1',
          account.notes || '',
          account.hasDebitCard || false,
          account.debitCardNumber || '',
          data[i][16], // Keep original created at (now at index 16)
          new Date().toISOString()
        ];

        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        logInfo('Account', 'Account updated', `ID: ${id}, Name: ${account.name}, Type: ${account.accountType}`, user);
        return { success: true };
      }
    }

    logWarning('Account', 'Account not found for update', `ID: ${id}`, user);
    return { success: false, error: 'Account not found' };
  } catch (error) {
    logError('Account', 'Failed to update account', `ID: ${id}, Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Delete account
 */
function deleteAccount(id, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const accountName = data[i][2];
        const accountType = data[i][1];
        sheet.deleteRow(i + 1);
        logInfo('Account', 'Account deleted', `ID: ${id}, Name: ${accountName}, Type: ${accountType}`, user);
        return { success: true };
      }
    }

    logWarning('Account', 'Account not found for deletion', `ID: ${id}`, user);
    return { success: false, error: 'Account not found' };
  } catch (error) {
    logError('Account', 'Failed to delete account', `ID: ${id}, Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get all accounts
 */
function getAccounts() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, accounts: [] };
    }

    const headers = data[0];
    const accounts = data.slice(1).map(row => rowToObject(headers, row));

    return { success: true, accounts: accounts };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================== CATEGORIES ==================

/**
 * Add category
 */
function addCategory(category, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.CATEGORIES);
    const id = category.id || generateId();
    const now = new Date().toISOString();

    const row = [
      id,
      category.type,
      category.name,
      category.icon,
      category.description || '',
      category.budget || 0,
      true, // Custom
      now
    ];

    sheet.appendRow(row);
    logInfo('Category', 'Category added', `ID: ${id}, Type: ${category.type}, Name: ${category.name}`, user);
    return { success: true, id: id };
  } catch (error) {
    logError('Category', 'Failed to add category', `Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get categories
 */
function getCategories() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.CATEGORIES);
    const data = sheet.getDataRange().getValues();

    const categories = {
      expense: [],
      income: []
    };

    if (data.length > 1) {
      const headers = data[0];
      data.slice(1).forEach(row => {
        const cat = rowToObject(headers, row);
        if (cat.type === 'expense') {
          categories.expense.push(cat);
        } else if (cat.type === 'income') {
          categories.income.push(cat);
        }
      });
    }

    return { success: true, categories: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================== SYNC ==================

/**
 * Sync all data (pull from sheets)
 */
function syncAll() {
  try {
    const accounts = getAccounts();
    const transactions = getAllTransactions();
    const categories = getCategories();

    return {
      success: true,
      accounts: accounts.success ? accounts.accounts : [],
      transactions: transactions.success ? transactions.transactions : [],
      categories: categories.success ? categories.categories : { expense: [], income: [] }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Push all data (from local to sheets)
 */
function pushAll(data) {
  try {
    // Clear and repopulate accounts
    if (data.accounts && data.accounts.length > 0) {
      const accountSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
      accountSheet.getRange(2, 1, accountSheet.getLastRow(), accountSheet.getLastColumn()).clearContent();

      data.accounts.forEach(account => {
        addAccount(account);
      });
    }

    // Clear and repopulate transactions
    if (data.transactions && data.transactions.length > 0) {
      const txnSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.TRANSACTIONS);
      txnSheet.getRange(2, 1, txnSheet.getLastRow(), txnSheet.getLastColumn()).clearContent();

      data.transactions.forEach(transaction => {
        addTransaction(transaction);
      });
    }

    // Clear and repopulate custom categories
    if (data.categories) {
      const catSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.CATEGORIES);
      catSheet.getRange(2, 1, catSheet.getLastRow(), catSheet.getLastColumn()).clearContent();

      ['expense', 'income'].forEach(type => {
        if (data.categories[type]) {
          data.categories[type].filter(c => c.custom).forEach(category => {
            category.type = type;
            addCategory(category);
          });
        }
      });
    }

    return { success: true, message: 'Data pushed successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================== UTILITY FUNCTIONS ==================

/**
 * Setup initial sheets (run once)
 */
function setupSheets() {
  getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
  getOrCreateSheet(CONFIG.SHEET_NAMES.TRANSACTIONS);
  getOrCreateSheet(CONFIG.SHEET_NAMES.CATEGORIES);
  getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);

  SpreadsheetApp.getActiveSpreadsheet().toast('Sheets setup complete!', 'FinanceFlow', 5);
}

/**
 * Migration: Add new columns to Accounts sheet
 * Run this once to add 'Has Debit Card' and 'Debit Card Number' columns
 */
function migrateAccountsSheet() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.ACCOUNTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Check if new columns already exist
    const hasDebitCardIndex = headers.indexOf('Has Debit Card');
    const debitCardNumberIndex = headers.indexOf('Debit Card Number');

    if (hasDebitCardIndex === -1 || debitCardNumberIndex === -1) {
      // Find the position of 'Created At' column
      const createdAtIndex = headers.indexOf('Created At');

      if (createdAtIndex === -1) {
        SpreadsheetApp.getActiveSpreadsheet().toast('Error: Created At column not found', 'Migration Error', 5);
        return { success: false, error: 'Created At column not found' };
      }

      // Insert 2 new columns before 'Created At'
      sheet.insertColumnsBefore(createdAtIndex + 1, 2);

      // Set new column headers
      sheet.getRange(1, createdAtIndex + 1).setValue('Has Debit Card');
      sheet.getRange(1, createdAtIndex + 2).setValue('Debit Card Number');

      // Set default values for existing rows (false and empty)
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // Set 'Has Debit Card' to FALSE for all existing accounts
        sheet.getRange(2, createdAtIndex + 1, lastRow - 1, 1).setValue(false);
        // Set 'Debit Card Number' to empty for all existing accounts
        sheet.getRange(2, createdAtIndex + 2, lastRow - 1, 1).setValue('');
      }

      SpreadsheetApp.getActiveSpreadsheet().toast('Migration complete! Added Has Debit Card and Debit Card Number columns.', 'Migration Success', 5);
      return { success: true, message: 'Migration completed successfully' };
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast('Columns already exist. No migration needed.', 'Migration', 5);
      return { success: true, message: 'Columns already exist' };
    }
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Migration failed: ' + error.message, 'Migration Error', 5);
    return { success: false, error: error.message };
  }
}


// ================== AUTHENTICATION ==================

/**
 * Simple hash function for passwords
 */
function hashPassword(password) {
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Generate session token
 */
function generateToken() {
  return Utilities.getUuid() + '-' + Date.now().toString(36);
}

/**
 * Register new user
 */
function registerUser(email, password, name) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    // Check if user already exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toLowerCase() === email.toLowerCase()) {
        return { success: false, error: 'User with this email already exists' };
      }
    }

    const id = generateId();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const row = [id, email.toLowerCase(), passwordHash, name || '', now, now];
    sheet.appendRow(row);

    // Create session
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days session

    const sessionSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SESSIONS);
    sessionSheet.appendRow([token, id, email.toLowerCase(), now, expiresAt.toISOString()]);

    return {
      success: true,
      token: token,
      user: { id: id, email: email.toLowerCase(), name: name || '' }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Login user
 */
function loginUser(email, password) {
  try {
    if (!email || !password) {
      logWarning('Auth', 'Login attempt with missing credentials', `Email provided: ${!!email}`);
      return { success: false, error: 'Email and password are required' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();
    const passwordHash = hashPassword(password);

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toLowerCase() === email.toLowerCase()) {
        if (data[i][2] === passwordHash) {
          // Password matches - create session
          const token = generateToken();
          const now = new Date().toISOString();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const sessionSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SESSIONS);
          sessionSheet.appendRow([token, data[i][0], email.toLowerCase(), now, expiresAt.toISOString()]);

          logInfo('Auth', 'User logged in successfully', `Email: ${email}`, email);

          return {
            success: true,
            token: token,
            user: { id: data[i][0], email: email.toLowerCase(), name: data[i][3] }
          };
        } else {
          logWarning('Auth', 'Failed login - invalid password', `Email: ${email}`, email);
          return { success: false, error: 'Invalid password' };
        }
      }
    }

    logWarning('Auth', 'Failed login - user not found', `Email: ${email}`);
    return { success: false, error: 'User not found' };
  } catch (error) {
    logError('Auth', 'Login error', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Logout user
 */
function logoutUser(token, user = 'System') {
  try {
    if (!token) {
      return { success: false, error: 'Token is required' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SESSIONS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        const userEmail = data[i][2];
        sheet.deleteRow(i + 1);
        logInfo('Auth', 'User logged out', `Email: ${userEmail}`, user || userEmail);
        return { success: true };
      }
    }

    return { success: true }; // Token not found is ok for logout
  } catch (error) {
    logError('Auth', 'Logout error', error.message, user);
    return { success: false, error: error.message };
  }
}

/**
 * Verify token
 */
function verifyToken(token) {
  try {
    if (!token) {
      return { success: false, error: 'Token is required' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SESSIONS);
    const data = sheet.getDataRange().getValues();
    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === token) {
        const expiresAt = new Date(data[i][4]);
        if (expiresAt > now) {
          // Get user info
          const userSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
          const userData = userSheet.getDataRange().getValues();

          for (let j = 1; j < userData.length; j++) {
            if (userData[j][0] === data[i][1]) {
              return {
                success: true,
                valid: true,
                user: { id: userData[j][0], email: userData[j][1], name: userData[j][3] }
              };
            }
          }
        } else {
          // Token expired - delete it
          sheet.deleteRow(i + 1);
          return { success: true, valid: false, error: 'Token expired' };
        }
      }
    }

    return { success: true, valid: false, error: 'Invalid token' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Forgot password - send reset code
 */
function forgotPassword(email) {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toLowerCase() === email.toLowerCase()) {
        // Generate 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes

        // Store reset code in settings sheet
        const settingsSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);
        settingsSheet.appendRow([`reset_${email.toLowerCase()}`, JSON.stringify({
          code: resetCode,
          expiresAt: expiresAt.toISOString(),
          userId: data[i][0]
        })]);

        // Send email
        const subject = 'FinanceFlow - Password Reset Code';
        const body = `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FinanceFlow</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Password Reset Request</p>
          </div>
          <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p>Hello ${data[i][3] || 'User'},</p>
            <p>You requested to reset your password. Use the code below to reset it:</p>
            <div style="background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0; letter-spacing: 8px; font-size: 32px;">${resetCode}</h2>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code expires in 15 minutes.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        </body></html>`;

        MailApp.sendEmail({
          to: email,
          subject: subject,
          htmlBody: body
        });

        return { success: true, message: 'Reset code sent to your email' };
      }
    }

    return { success: false, error: 'No account found with this email' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Reset password with code
 */
function resetPassword(email, code, newPassword) {
  try {
    if (!email || !code || !newPassword) {
      return { success: false, error: 'Email, code, and new password are required' };
    }

    const settingsSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);
    const settingsData = settingsSheet.getDataRange().getValues();
    const key = `reset_${email.toLowerCase()}`;

    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === key) {
        const resetData = JSON.parse(settingsData[i][1]);
        const expiresAt = new Date(resetData.expiresAt);
        const now = new Date();

        if (now > expiresAt) {
          settingsSheet.deleteRow(i + 1);
          return { success: false, error: 'Reset code has expired' };
        }

        if (resetData.code !== code) {
          return { success: false, error: 'Invalid reset code' };
        }

        // Code is valid - update password
        const userSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
        const userData = userSheet.getDataRange().getValues();
        const newHash = hashPassword(newPassword);

        for (let j = 1; j < userData.length; j++) {
          if (userData[j][0] === resetData.userId) {
            userSheet.getRange(j + 1, 3).setValue(newHash);
            userSheet.getRange(j + 1, 6).setValue(new Date().toISOString());

            // Delete reset code
            settingsSheet.deleteRow(i + 1);

            // Clear all sessions for this user
            const sessionSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SESSIONS);
            const sessionData = sessionSheet.getDataRange().getValues();
            for (let k = sessionData.length - 1; k >= 1; k--) {
              if (sessionData[k][1] === resetData.userId) {
                sessionSheet.deleteRow(k + 1);
              }
            }

            return { success: true, message: 'Password has been reset successfully' };
          }
        }

        return { success: false, error: 'User not found' };
      }
    }

    return { success: false, error: 'No reset request found for this email' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Change password
 */
function changePassword(token, oldPassword, newPassword, user = 'System') {
  try {
    const verification = verifyToken(token);
    if (!verification.success || !verification.valid) {
      logWarning('Auth', 'Password change attempt with invalid session', '', user);
      return { success: false, error: 'Invalid session' };
    }

    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();
    const oldHash = hashPassword(oldPassword);
    const newHash = hashPassword(newPassword);

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === verification.user.id) {
        if (data[i][2] === oldHash) {
          sheet.getRange(i + 1, 3).setValue(newHash);
          sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
          logInfo('Auth', 'Password changed successfully', `Email: ${verification.user.email}`, user);
          return { success: true };
        } else {
          logWarning('Auth', 'Password change failed - incorrect current password', `Email: ${verification.user.email}`, user);
          return { success: false, error: 'Current password is incorrect' };
        }
      }
    }

    logWarning('Auth', 'Password change failed - user not found', '', user);
    return { success: false, error: 'User not found' };
  } catch (error) {
    logError('Auth', 'Password change error', error.message, user);
    return { success: false, error: error.message };
  }
}

// ================== INVESTMENTS ==================

/**
 * Save investment
 */
function saveInvestment(investment, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.INVESTMENTS);
    const id = investment.id || generateId();
    const now = new Date().toISOString();

    const row = [
      id,
      investment.type || '',
      investment.name || '',
      investment.principal || 0,
      investment.interestRate || 0,
      investment.tenureMonths || 0,
      investment.tenureYears || 0,
      investment.monthlyDeposit || 0,
      investment.monthlyAmount || 0,
      investment.yearlyAmount || 0,
      investment.maturityAmount || 0,
      investment.futureValue || 0,
      investment.startDate || '',
      investment.maturityDate || '',
      investment.status || 'active',
      investment.accountId || '',
      investment.notes || '',
      now,
      now
    ];

    // Check if updating existing
    if (investment.id) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === investment.id) {
          row[17] = data[i][17]; // Keep original created at
          sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
          logInfo('Investment', 'Investment updated', `ID: ${id}, Type: ${investment.type}, Name: ${investment.name}`, user);
          return { success: true, id: id };
        }
      }
    }

    sheet.appendRow(row);
    logInfo('Investment', 'Investment added', `ID: ${id}, Type: ${investment.type}, Name: ${investment.name}`, user);
    return { success: true, id: id };
  } catch (error) {
    logError('Investment', 'Failed to save investment', `Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get all investments
 */
function getInvestments() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.INVESTMENTS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, investments: [] };
    }

    const headers = data[0];
    const investments = data.slice(1).map(row => rowToObject(headers, row));

    return { success: true, investments: investments };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete investment
 */
function deleteInvestmentById(id, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.INVESTMENTS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const invName = data[i][2];
        const invType = data[i][1];
        sheet.deleteRow(i + 1);
        logInfo('Investment', 'Investment deleted', `ID: ${id}, Type: ${invType}, Name: ${invName}`, user);
        return { success: true };
      }
    }

    logWarning('Investment', 'Investment not found for deletion', `ID: ${id}`, user);
    return { success: false, error: 'Investment not found' };
  } catch (error) {
    logError('Investment', 'Failed to delete investment', `ID: ${id}, Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Save investment notification settings
 */
function saveInvestmentNotifications(settings, user = 'System') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('InvestmentNotifications');

    if (!sheet) {
      sheet = ss.insertSheet('InvestmentNotifications');
      sheet.getRange(1, 1, 1, 5).setValues([['Email', 'Maturity Reminders', 'SIP Reminders', 'Investment Summary', 'Updated At']]);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    }

    const now = new Date().toISOString();
    const row = [
      settings.email || '',
      settings.maturityReminders !== false,
      settings.sipReminders !== false,
      settings.investmentSummary || false,
      now
    ];

    // Check if exists, update or add
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      sheet.getRange(2, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    logInfo('InvestmentNotifications', 'Settings saved', `Email: ${settings.email}`, user);
    return { success: true, message: 'Investment notification settings saved' };
  } catch (error) {
    logError('InvestmentNotifications', 'Failed to save settings', error.message, user);
    return { success: false, error: error.message };
  }
}

// ================== EMIs ==================

/**
 * Save EMI
 */
function saveEmi(emi, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.EMIS);
    const id = emi.id || generateId();
    const now = new Date().toISOString();

    const row = [
      id,
      emi.name || '',
      emi.amount || 0,
      emi.totalEmis || 0,
      emi.remainingEmis || emi.totalEmis || 0,
      emi.paymentDay || 5,
      emi.startDate || '',
      emi.accountId || '',
      emi.loanType || '',
      emi.principal || 0,
      emi.interestRate || 0,
      JSON.stringify(emi.paidEmis || []),
      emi.status || 'active',
      now,
      now
    ];

    sheet.appendRow(row);
    logInfo('EMI', 'EMI added', `ID: ${id}, Name: ${emi.name}, Amount: ${emi.amount}, Type: ${emi.loanType}`, user);
    return { success: true, id: id };
  } catch (error) {
    logError('EMI', 'Failed to add EMI', `Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get all EMIs
 */
function getEmis() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.EMIS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, emis: [] };
    }

    const headers = data[0];
    const emis = data.slice(1).map(row => {
      const obj = rowToObject(headers, row);
      try {
        obj.paidemisdata = JSON.parse(obj.paidemisdata || '[]');
      } catch (e) {
        obj.paidemisdata = [];
      }
      return obj;
    });

    return { success: true, emis: emis };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update EMI
 */
function updateEmi(id, emi, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.EMIS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const row = [
          id,
          emi.name || data[i][1],
          emi.amount || data[i][2],
          emi.totalEmis || data[i][3],
          emi.remainingEmis !== undefined ? emi.remainingEmis : data[i][4],
          emi.paymentDay || data[i][5],
          emi.startDate || data[i][6],
          emi.accountId || data[i][7],
          emi.loanType || data[i][8],
          emi.principal || data[i][9],
          emi.interestRate || data[i][10],
          emi.paidEmis ? JSON.stringify(emi.paidEmis) : data[i][11],
          emi.status || data[i][12],
          data[i][13], // Keep original created at
          new Date().toISOString()
        ];

        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        logInfo('EMI', 'EMI updated', `ID: ${id}, Name: ${emi.name || data[i][1]}, Remaining: ${row[4]}`, user);
        return { success: true };
      }
    }

    logWarning('EMI', 'EMI not found for update', `ID: ${id}`, user);
    return { success: false, error: 'EMI not found' };
  } catch (error) {
    logError('EMI', 'Failed to update EMI', `ID: ${id}, Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

/**
 * Delete EMI
 */
function deleteEmiById(id, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.EMIS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const emiName = data[i][1];
        const emiAmount = data[i][2];
        sheet.deleteRow(i + 1);
        logInfo('EMI', 'EMI deleted', `ID: ${id}, Name: ${emiName}, Amount: ${emiAmount}`, user);
        return { success: true };
      }
    }

    logWarning('EMI', 'EMI not found for deletion', `ID: ${id}`, user);
    return { success: false, error: 'EMI not found' };
  } catch (error) {
    logError('EMI', 'Failed to delete EMI', `ID: ${id}, Error: ${error.message}`, user);
    return { success: false, error: error.message };
  }
}

// ================== NOTIFICATIONS ==================

/**
 * Save notification settings
 */
function saveNotificationSettings(settings, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.NOTIFICATIONS);
    const now = new Date().toISOString();

    // Check if settings exist for this email
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === settings.email) {
        const row = [
          data[i][0],
          settings.email,
          settings.emiReminders !== false,
          settings.maturityReminders !== false,
          settings.weeklySummary || false,
          settings.reminderDaysBefore || 3,
          data[i][6],
          now
        ];
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        logInfo('Settings', 'Notification settings updated', `Email: ${settings.email}`, user);
        return { success: true };
      }
    }

    // Create new settings
    const row = [
      generateId(),
      settings.email,
      settings.emiReminders !== false,
      settings.maturityReminders !== false,
      settings.weeklySummary || false,
      settings.reminderDaysBefore || 3,
      now,
      now
    ];

    sheet.appendRow(row);
    logInfo('Settings', 'Notification settings created', `Email: ${settings.email}`, user);
    return { success: true };
  } catch (error) {
    logError('Settings', 'Failed to save notification settings', error.message, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get notification settings
 */
function getNotificationSettings() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.NOTIFICATIONS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, settings: null };
    }

    const headers = data[0];
    // Return first settings (single user app)
    const settings = rowToObject(headers, data[1]);
    return { success: true, settings: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================== EMAIL NOTIFICATIONS ==================

/**
 * Send EMI reminder email
 * Call this function from a daily time-based trigger
 */
function sendEmiReminders() {
  logInfo('Automation', 'Starting EMI reminder check', 'Daily trigger executed');
  try {
    const notifSettings = getNotificationSettings();
    if (!notifSettings.success || !notifSettings.settings || !notifSettings.settings.email) {
      return;
    }

    const settings = notifSettings.settings;
    if (!settings.emireminders) {
      return;
    }

    const emisResult = getEmis();
    if (!emisResult.success || !emisResult.emis || emisResult.emis.length === 0) {
      return;
    }

    const today = new Date();
    const reminderDays = parseInt(settings.reminderdaysbefore) || 3;

    const upcomingEmis = [];

    emisResult.emis.forEach(emi => {
      if (parseInt(emi.remainingemis) <= 0) return;

      const paymentDay = parseInt(emi.paymentday) || 5;
      let nextPayment = new Date(today.getFullYear(), today.getMonth(), paymentDay);

      if (nextPayment <= today) {
        nextPayment.setMonth(nextPayment.getMonth() + 1);
      }

      const daysUntil = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

      if (daysUntil >= 0 && daysUntil <= reminderDays) {
        upcomingEmis.push({
          name: emi.name,
          amount: emi.amount,
          daysUntil: daysUntil,
          paymentDate: nextPayment.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        });
      }
    });

    if (upcomingEmis.length > 0) {
      const subject = `FinanceFlow: ${upcomingEmis.length} EMI Payment${upcomingEmis.length > 1 ? 's' : ''} Coming Up!`;

      let body = `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">FinanceFlow</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">EMI Payment Reminder</p>
        </div>
        <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p>Hello,</p>
          <p>You have upcoming EMI payments:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #6366f1; color: white;">
              <th style="padding: 12px; text-align: left;">EMI Name</th>
              <th style="padding: 12px; text-align: right;">Amount</th>
              <th style="padding: 12px; text-align: center;">Due Date</th>
            </tr>`;

      upcomingEmis.forEach((emi, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f1f5f9';
        body += `
            <tr style="background: ${bgColor};">
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${emi.name}</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">₹${parseFloat(emi.amount).toLocaleString('en-IN')}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                ${emi.paymentDate}
                <br><small style="color: ${emi.daysUntil <= 1 ? '#ef4444' : '#6366f1'};">${emi.daysUntil === 0 ? 'Due today!' : `In ${emi.daysUntil} day${emi.daysUntil > 1 ? 's' : ''}`}</small>
              </td>
            </tr>`;
      });

      body += `
          </table>
          <p style="color: #64748b; font-size: 14px;">This is an automated reminder from FinanceFlow.</p>
        </div>
      </body></html>`;

      sendNotificationEmail(settings.email, subject, body, `EMI reminder for ${upcomingEmis.length} EMI(s) due within ${settings.reminderdays || 3} days`);
    }
  } catch (error) {
    logError('sendEmiReminders', 'Error sending EMI reminders', error.message);
  }
}

/**
 * Send weekly financial summary
 * Call this function from a weekly time-based trigger (e.g., every Monday)
 */
function sendWeeklySummary(forceEmail = null) {
  try {
    const autoSettings = getAutomationSettings();
    const settings = autoSettings.success ? autoSettings.settings : {};

    // Get email - use forceEmail if provided, otherwise from settings
    const email = forceEmail || settings.notifyemail || settings.notifyEmail;

    if (!email) {
      logError('sendWeeklySummary', 'No email configured', 'Email address is required');
      return { success: false, error: 'No email address configured' };
    }

    // Only check if enabled when not forced (scheduled triggers)
    if (!forceEmail && !settings.weeklysummary && !settings.weeklySummary) {
      return { success: false, error: 'Weekly summary is not enabled' };
    }

    // Get transactions from last 7 days
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const transactionsResult = getAllTransactions();
    if (!transactionsResult.success) return;

    let weeklyIncome = 0;
    let weeklyExpenses = 0;
    const categoryTotals = {};

    transactionsResult.transactions.forEach(txn => {
      const txnDate = new Date(txn.date);
      if (txnDate >= lastWeek && txnDate <= today) {
        const amount = parseFloat(txn.amount) || 0;
        const txnType = (txn.type || '').toLowerCase();
        if (txnType === 'income') {
          weeklyIncome += amount;
        } else if (txnType === 'expense') {
          weeklyExpenses += amount;
          const cat = txn.category || 'Other';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
        }
        // Transfers are not counted in income or expenses
      }
    });

    // Sort categories by amount
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const subject = `FinanceFlow: Your Weekly Financial Summary`;

    let body = `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">FinanceFlow</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Weekly Summary (${lastWeek.toLocaleDateString('en-IN')} - ${today.toLocaleDateString('en-IN')})</p>
      </div>
      <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <div style="flex: 1; background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 14px;">Total Income</p>
            <p style="margin: 5px 0 0 0; color: #15803d; font-size: 24px; font-weight: bold;">₹${weeklyIncome.toLocaleString('en-IN')}</p>
          </div>
          <div style="flex: 1; background: #fee2e2; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">Total Expenses</p>
            <p style="margin: 5px 0 0 0; color: #dc2626; font-size: 24px; font-weight: bold;">₹${weeklyExpenses.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div style="background: ${weeklyIncome - weeklyExpenses >= 0 ? '#dcfce7' : '#fee2e2'}; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px;">Net Savings</p>
          <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: ${weeklyIncome - weeklyExpenses >= 0 ? '#15803d' : '#dc2626'};">
            ₹${Math.abs(weeklyIncome - weeklyExpenses).toLocaleString('en-IN')}
          </p>
        </div>`;

    if (sortedCategories.length > 0) {
      body += `
        <h3 style="margin: 20px 0 10px 0;">Top Spending Categories</h3>
        <table style="width: 100%; border-collapse: collapse;">`;

      sortedCategories.forEach((cat, index) => {
        const percentage = ((cat[1] / weeklyExpenses) * 100).toFixed(1);
        body += `
          <tr>
            <td style="padding: 8px 0;">${cat[0]}</td>
            <td style="padding: 8px 0; text-align: right;">₹${cat[1].toLocaleString('en-IN')}</td>
            <td style="padding: 8px 0; text-align: right; color: #64748b;">${percentage}%</td>
          </tr>`;
      });

      body += `</table>`;
    }

    body += `
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">This is an automated summary from FinanceFlow.</p>
      </div>
    </body></html>`;

    sendNotificationEmail(email, subject, body, `Weekly financial summary (${lastWeek.toDateString()} - ${today.toDateString()})`);
    logInfo('sendWeeklySummary', 'Weekly summary sent', `Email: ${email}`, email);
    return { success: true, message: 'Weekly summary sent successfully' };
  } catch (error) {
    logError('sendWeeklySummary', 'Error sending weekly summary', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-create EMI expenses when due
 * Call this function from a daily time-based trigger
 */
function autoCreateEmiExpenses() {
  try {
    const emisResult = getEmis();
    if (!emisResult.success || !emisResult.emis || emisResult.emis.length === 0) {
      return;
    }

    // Get automation settings to check recurring mode
    const autoSettings = getAutomationSettings();
    const recurringMode = autoSettings.success && autoSettings.settings ?
      (autoSettings.settings.recurringMode || 'confirm') : 'confirm';

    const today = new Date();
    const todayDay = today.getDate();
    const createdExpenses = [];
    const pendingExpenses = [];

    emisResult.emis.forEach(emi => {
      if (parseInt(emi.remainingemis) <= 0) return;

      const paymentDay = parseInt(emi.paymentday) || 5;

      // Check if today is the payment day
      if (todayDay === paymentDay) {
        // Check if we already created expense for this month
        const checkKey = `emi_expense_${emi.id}_${today.getFullYear()}_${today.getMonth()}`;
        const settingsSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);
        const settingsData = settingsSheet.getDataRange().getValues();

        let alreadyCreated = false;
        for (let i = 1; i < settingsData.length; i++) {
          if (settingsData[i][0] === checkKey) {
            alreadyCreated = true;
            break;
          }
        }

        if (!alreadyCreated) {
          // Create expense transaction data
          const transaction = {
            type: 'expense',
            amount: emi.amount,
            date: today.toISOString().split('T')[0],
            description: `EMI Payment - ${emi.name}`,
            category: 'emi',
            paymentMethod: 'netbanking',
            account: emi.accountid || '',
            tags: 'EMI,Loan,Auto-Generated',
            notes: `Auto-generated EMI payment for ${emi.name}. ${emi.remainingemis} EMIs remaining after this payment.`
          };

          if (recurringMode === 'auto') {
            // Auto mode: directly add transaction
            addTransaction(transaction);

            // Update remaining EMIs
            const newRemaining = parseInt(emi.remainingemis) - 1;
            updateEmi(emi.id, { remainingEmis: newRemaining });

            // Mark as created for this month
            settingsSheet.appendRow([checkKey, today.toISOString()]);

            createdExpenses.push({
              name: emi.name,
              amount: emi.amount
            });
          } else {
            // Confirm mode: add to pending transactions
            addPendingTransaction({
              ...transaction,
              emiId: emi.id,
              source: 'EMI',
              sourceName: emi.name
            });

            pendingExpenses.push({
              name: emi.name,
              amount: emi.amount
            });
          }
        }
      }
    });

    // Send notification if expenses were created (auto mode)
    if (createdExpenses.length > 0) {
      const notifSettings = getNotificationSettings();
      if (notifSettings.success && notifSettings.settings && notifSettings.settings.email) {
        const subject = `FinanceFlow: ${createdExpenses.length} EMI Payment${createdExpenses.length > 1 ? 's' : ''} Auto-Recorded`;

        let body = `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FinanceFlow</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Automatic EMI Recording</p>
          </div>
          <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p>The following EMI payments have been automatically recorded as expenses today:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">`;

        createdExpenses.forEach((exp, index) => {
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f1f5f9';
          body += `
              <tr style="background: ${bgColor};">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${exp.name}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">₹${parseFloat(exp.amount).toLocaleString('en-IN')}</td>
              </tr>`;
        });

        body += `
            </table>
            <p style="color: #64748b; font-size: 14px;">These transactions are auto-generated by FinanceFlow based on your EMI schedules.</p>
          </div>
        </body></html>`;

        sendNotificationEmail(notifSettings.settings.email, subject, body, `Auto-recorded ${createdExpenses.length} EMI payment(s) as expenses`);
      }
    }

    // Send notification for pending transactions (confirm mode)
    if (pendingExpenses.length > 0) {
      const notifSettings = getNotificationSettings();
      if (notifSettings.success && notifSettings.settings && notifSettings.settings.email) {
        const subject = `FinanceFlow: ${pendingExpenses.length} EMI Payment${pendingExpenses.length > 1 ? 's' : ''} Awaiting Confirmation`;

        let body = `<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FinanceFlow</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Pending EMI Confirmations</p>
          </div>
          <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p>The following EMI payments are due today and waiting for your confirmation:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">`;

        pendingExpenses.forEach((exp, index) => {
          const bgColor = index % 2 === 0 ? '#ffffff' : '#f1f5f9';
          body += `
              <tr style="background: ${bgColor};">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${exp.name}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">₹${parseFloat(exp.amount).toLocaleString('en-IN')}</td>
              </tr>`;
        });

        body += `
            </table>
            <p style="color: #64748b; font-size: 14px;">Please open FinanceFlow to confirm or cancel these transactions.</p>
          </div>
        </body></html>`;

        sendNotificationEmail(notifSettings.settings.email, subject, body, `${pendingExpenses.length} EMI payment(s) pending confirmation`);
      }
    }
  } catch (error) {
    logError('autoCreateEmiExpenses', 'Error auto-creating EMI expenses', error.message);
  }
}

/**
 * Add a pending transaction for user confirmation
 */
function addPendingTransaction(transaction) {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.PENDING_TRANSACTIONS);

    // Initialize headers if new sheet
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'ID', 'Type', 'Amount', 'Date', 'Description', 'Category', 'PaymentMethod',
        'Account', 'Tags', 'Notes', 'EmiId', 'Source', 'SourceName', 'CreatedAt', 'Status'
      ]);
      sheet.getRange(1, 1, 1, 15).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    sheet.appendRow([
      id,
      transaction.type || 'expense',
      transaction.amount || 0,
      transaction.date || new Date().toISOString().split('T')[0],
      transaction.description || '',
      transaction.category || '',
      transaction.paymentMethod || 'netbanking',
      transaction.account || '',
      transaction.tags || '',
      transaction.notes || '',
      transaction.emiId || '',
      transaction.source || 'Recurring',
      transaction.sourceName || '',
      createdAt,
      'pending'
    ]);

    logInfo('addPendingTransaction', 'Added pending transaction', `${transaction.description} - ₹${transaction.amount}`);
    return { success: true, id };
  } catch (error) {
    logError('addPendingTransaction', 'Error adding pending transaction', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all pending transactions
 */
function getPendingTransactions() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.PENDING_TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, pending: [] };
    }

    const headers = data[0].map(h => h.toString().toLowerCase().replace(/\s+/g, ''));
    const pending = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[14]; // Status column

      if (status === 'pending') {
        const transaction = {};
        headers.forEach((header, index) => {
          transaction[header] = row[index];
        });
        transaction.rowIndex = i + 1; // For updating later
        pending.push(transaction);
      }
    }

    return { success: true, pending };
  } catch (error) {
    logError('getPendingTransactions', 'Error getting pending transactions', error.message);
    return { success: false, error: error.message, pending: [] };
  }
}

/**
 * Approve a pending transaction (add to transactions and remove from pending)
 */
function approvePendingTransaction(pendingId, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.PENDING_TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === pendingId.toString()) {
        // Get transaction data
        const transaction = {
          type: data[i][1],
          amount: data[i][2],
          date: data[i][3],
          description: data[i][4],
          category: data[i][5],
          paymentMethod: data[i][6],
          account: data[i][7],
          tags: data[i][8],
          notes: data[i][9]
        };

        const emiId = data[i][10];
        const source = data[i][11];

        // Add as real transaction
        addTransaction(transaction, user);

        // If EMI, update remaining count
        if (emiId && source === 'EMI') {
          const emisResult = getEmis();
          if (emisResult.success) {
            const emi = emisResult.emis.find(e => e.id.toString() === emiId.toString());
            if (emi) {
              const newRemaining = parseInt(emi.remainingemis) - 1;
              updateEmi(emiId, { remainingEmis: newRemaining });

              // Mark as created for this month to prevent duplicates
              const today = new Date();
              const checkKey = `emi_expense_${emiId}_${today.getFullYear()}_${today.getMonth()}`;
              const settingsSheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);
              settingsSheet.appendRow([checkKey, today.toISOString()]);
            }
          }
        }

        // Mark as approved (or delete row)
        sheet.getRange(i + 1, 15).setValue('approved');
        // Or delete: sheet.deleteRow(i + 1);

        logInfo('PendingTransaction', 'Approved pending transaction', `ID: ${pendingId}`, user);
        return { success: true };
      }
    }

    return { success: false, error: 'Pending transaction not found' };
  } catch (error) {
    logError('PendingTransaction', 'Error approving transaction', error.message, user);
    return { success: false, error: error.message };
  }
}

/**
 * Reject/cancel a pending transaction
 */
function rejectPendingTransaction(pendingId, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.PENDING_TRANSACTIONS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === pendingId.toString()) {
        const description = data[i][4];
        const amount = data[i][2];

        // Mark as rejected
        sheet.getRange(i + 1, 15).setValue('rejected');

        logWarning('PendingTransaction', 'Rejected pending transaction', `${description} - Amount: ${amount}`, user);
        return { success: true };
      }
    }

    return { success: false, error: 'Pending transaction not found' };
  } catch (error) {
    logError('PendingTransaction', 'Error rejecting transaction', error.message, user);
    return { success: false, error: error.message };
  }
}

/**
 * Setup triggers for notifications
 * Run this function once to setup daily/weekly triggers
 */
function setupNotificationTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendEmiReminders' ||
        trigger.getHandlerFunction() === 'sendWeeklySummary' ||
        trigger.getHandlerFunction() === 'autoCreateEmiExpenses') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Daily trigger for EMI reminders (9 AM)
  ScriptApp.newTrigger('sendEmiReminders')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  // Daily trigger for auto EMI expenses (10 AM)
  ScriptApp.newTrigger('autoCreateEmiExpenses')
    .timeBased()
    .atHour(10)
    .everyDays(1)
    .create();

  // Weekly trigger for summary (Monday 9 AM)
  ScriptApp.newTrigger('sendWeeklySummary')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast('Notification triggers have been set up!', 'FinanceFlow', 5);
}

// ================== AUTOMATION SETTINGS ==================

/**
 * Helper function to send notification email with CC support
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - Email HTML body
 * @param {string} reason - Why the email is being sent (for logging)
 */
function sendNotificationEmail(to, subject, htmlBody, reason = 'Notification') {
  try {
    const autoSettings = getAutomationSettings();
    const cc = autoSettings.success && autoSettings.settings.notifyCc ? autoSettings.settings.notifyCc : '';

    const emailOptions = {
      to: to,
      subject: subject,
      htmlBody: htmlBody
    };

    // Add CC if configured
    if (cc && cc.trim()) {
      emailOptions.cc = cc.trim();
    }

    MailApp.sendEmail(emailOptions);

    // Log successful email send
    const ccInfo = cc ? `, CC: ${cc}` : '';
    logInfo('EmailService', `Email sent successfully`, `To: ${to}${ccInfo}, Subject: ${subject}, Reason: ${reason}`);

    return true;
  } catch (error) {
    logError('EmailService', 'Failed to send email', `To: ${to}, Subject: ${subject}, Error: ${error.message}`);
    return false;
  }
}

/**
 * Send welcome email to new user
 * @param {string} email - User's email
 * @param {string} name - User's name
 * @param {string} password - User's password (plain text, for their reference)
 */
function sendWelcomeEmail(email, name, password) {
  try {
    const subject = 'Welcome to FinanceFlow - Your Account is Ready!';
    const htmlBody = `
      <html><body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to FinanceFlow!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Your Personal Finance Companion</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #1e293b;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.6;">
              Your FinanceFlow account has been created successfully! You can now start tracking your expenses,
              managing investments, and taking control of your financial life.
            </p>

            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">Your Login Credentials</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Password:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${password}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Tip:</strong> Please change your password after your first login for better security.
              </p>
            </div>

            <h3 style="color: #1e293b; font-size: 16px; margin: 25px 0 15px;">What you can do with FinanceFlow:</h3>
            <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px;">
              <li>Track income and expenses across multiple accounts</li>
              <li>Manage credit cards, bank accounts, and digital wallets</li>
              <li>Monitor investments (FD, RD, SIP, PPF)</li>
              <li>Schedule and track EMI payments</li>
              <li>Use financial calculators</li>
              <li>Get weekly summaries and monthly reports</li>
            </ul>

            <p style="color: #64748b; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              If you have any questions, please contact your administrator.
            </p>
          </div>
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              This is an automated message from FinanceFlow.
            </p>
          </div>
        </div>
      </body></html>
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });

    logInfo('EmailService', 'Welcome email sent', `To: ${email}, Name: ${name}`);
    return true;
  } catch (error) {
    logError('EmailService', 'Failed to send welcome email', `To: ${email}, Error: ${error.message}`);
    return false;
  }
}

/**
 * Save automation settings to sheet
 */
function saveAutomationSettings(settings, user = 'System') {
  try {
    const sheet = getOrCreateSheet('AutomationSettings');

    // Initialize if new
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['key', 'value', 'updatedAt']);
    }

    const data = sheet.getDataRange().getValues();
    const keys = Object.keys(settings);

    keys.forEach(key => {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(settings[key]));
          sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, JSON.stringify(settings[key]), new Date().toISOString()]);
      }
    });

    // Update triggers based on new settings
    updateTriggersFromSettings(settings);

    logInfo('Settings', 'Automation settings saved', `Keys updated: ${keys.join(', ')}`, user);
    return { success: true, message: 'Automation settings saved' };
  } catch (error) {
    logError('Settings', 'Failed to save automation settings', error.message, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get automation settings from sheet
 */
function getAutomationSettings() {
  try {
    const sheet = getOrCreateSheet('AutomationSettings');

    if (sheet.getLastRow() <= 1) {
      return { success: true, settings: {} };
    }

    const data = sheet.getDataRange().getValues();
    const settings = {};

    for (let i = 1; i < data.length; i++) {
      try {
        settings[data[i][0]] = JSON.parse(data[i][1]);
      } catch (e) {
        settings[data[i][0]] = data[i][1];
      }
    }

    return { success: true, settings: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save general app settings to Settings sheet
 */
function saveGeneralSettings(settings, user = 'System') {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);

    // Initialize if new
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['key', 'value', 'updatedAt']);
    }

    const data = sheet.getDataRange().getValues();
    const keys = Object.keys(settings);

    keys.forEach(key => {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(settings[key]));
          sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, JSON.stringify(settings[key]), new Date().toISOString()]);
      }
    });

    logInfo('Settings', 'General settings saved', `Keys: ${keys.join(', ')}`, user);
    return { success: true, message: 'Settings saved' };
  } catch (error) {
    logError('Settings', 'Failed to save general settings', error.message, user);
    return { success: false, error: error.message };
  }
}

/**
 * Get general app settings from Settings sheet
 */
function getGeneralSettings() {
  try {
    const sheet = getOrCreateSheet(CONFIG.SHEET_NAMES.SETTINGS);

    if (sheet.getLastRow() <= 1) {
      return { success: true, settings: {} };
    }

    const data = sheet.getDataRange().getValues();
    const settings = {};

    for (let i = 1; i < data.length; i++) {
      // Skip reset codes and other non-settings keys
      if (data[i][0] && !data[i][0].startsWith('reset_')) {
        try {
          settings[data[i][0]] = JSON.parse(data[i][1]);
        } catch (e) {
          settings[data[i][0]] = data[i][1];
        }
      }
    }

    return { success: true, settings: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update triggers based on automation settings
 */
function updateTriggersFromSettings(settings) {
  try {
    // Delete existing notification triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      const fn = trigger.getHandlerFunction();
      if (fn === 'sendEmiReminders' || fn === 'sendWeeklySummary' ||
          fn === 'autoCreateEmiExpenses' || fn === 'sendMonthlyReport') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create EMI reminder trigger
    if (settings.emiReminders !== false) {
      const hour = parseInt(settings.emiReminderTime) || 9;
      ScriptApp.newTrigger('sendEmiReminders')
        .timeBased()
        .atHour(hour)
        .everyDays(1)
        .create();
    }

    // Create auto EMI expense trigger
    if (settings.autoRecordEmi !== false) {
      const hour = parseInt(settings.emiRecordTime) || 10;
      ScriptApp.newTrigger('autoCreateEmiExpenses')
        .timeBased()
        .atHour(hour)
        .everyDays(1)
        .create();
    }

    // Create weekly summary trigger
    if (settings.weeklySummary === true) {
      const day = parseInt(settings.summaryDay) || 1;
      const hour = parseInt(settings.summaryTime) || 9;
      const weekDays = [ScriptApp.WeekDay.SUNDAY, ScriptApp.WeekDay.MONDAY,
                        ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY,
                        ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY, ScriptApp.WeekDay.SATURDAY];
      ScriptApp.newTrigger('sendWeeklySummary')
        .timeBased()
        .onWeekDay(weekDays[day])
        .atHour(hour)
        .create();
    }

    // Create monthly report trigger
    if (settings.monthlyReport === true) {
      const day = settings.monthlyReportDay || '1';
      const hour = parseInt(settings.monthlyReportTime) || 9;

      if (day === 'last') {
        // For last day of month, run daily and check in function
        ScriptApp.newTrigger('sendMonthlyReport')
          .timeBased()
          .atHour(hour)
          .everyDays(1)
          .create();
      } else {
        // For specific day, run daily and check in function
        ScriptApp.newTrigger('sendMonthlyReport')
          .timeBased()
          .atHour(hour)
          .everyDays(1)
          .create();
      }
    }

  } catch (error) {
    console.error('Error updating triggers:', error);
  }
}

/**
 * Send monthly financial report
 * @param {string} forceEmail - If provided, sends immediately to this email (bypasses schedule check)
 */
function sendMonthlyReport(forceEmail = null) {
  try {
    // Get automation settings
    const autoSettings = getAutomationSettings();
    const settings = autoSettings.success ? autoSettings.settings : {};

    // Get email - use forceEmail if provided, otherwise from settings
    const email = forceEmail || settings.notifyemail || settings.notifyEmail;

    if (!email) {
      logError('sendMonthlyReport', 'No email configured', 'Email address is required');
      return { success: false, error: 'No email address configured' };
    }

    // Only check if enabled and correct day when not forced (scheduled triggers)
    if (!forceEmail) {
      if (!settings.monthlyreport && !settings.monthlyReport) {
        return { success: false, error: 'Monthly report is not enabled' };
      }

      const today = new Date();
      const dayOfMonth = today.getDate();
      const reportDay = settings.monthlyreportday || settings.monthlyReportDay || '1';

      // Check if today is the correct day
      if (reportDay === 'last') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (tomorrow.getMonth() === today.getMonth()) {
          return { success: false, error: 'Not the scheduled day' };
        }
      } else if (parseInt(reportDay) !== dayOfMonth) {
        return { success: false, error: 'Not the scheduled day' };
      }
    }

    const today = new Date();

    // Get last month's data
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    // Get transactions for last month
    const txnResult = getTransactionsByMonth(year, month);
    const transactions = txnResult.success ? txnResult.transactions : [];

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(txn => {
      const amount = parseFloat(txn.amount) || 0;
      const txnType = (txn.type || '').toLowerCase();
      if (txnType === 'income') {
        totalIncome += amount;
      } else if (txnType === 'expense') {
        totalExpense += amount;
        const cat = txn.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      }
      // Transfers are not counted in income or expenses
    });

    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

    // Sort categories by amount
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Format month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1];

    // Build email
    const subject = `FinanceFlow - ${monthName} ${year} Financial Report`;
    let body = `
      <html><body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Monthly Financial Report</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${monthName} ${year}</p>
          </div>
          <div style="padding: 30px;">

            <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 20px;">Summary</h2>

            <div style="display: flex; gap: 15px; margin-bottom: 30px;">
              <div style="flex: 1; background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center;">
                <p style="color: #10b981; font-weight: bold; font-size: 20px; margin: 0;">₹${totalIncome.toLocaleString('en-IN')}</p>
                <p style="color: #64748b; font-size: 12px; margin: 5px 0 0;">Total Income</p>
              </div>
              <div style="flex: 1; background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
                <p style="color: #ef4444; font-weight: bold; font-size: 20px; margin: 0;">₹${totalExpense.toLocaleString('en-IN')}</p>
                <p style="color: #64748b; font-size: 12px; margin: 5px 0 0;">Total Expenses</p>
              </div>
            </div>

            <div style="background: ${savings >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
              <p style="color: ${savings >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; font-size: 28px; margin: 0;">
                ${savings >= 0 ? '+' : ''}₹${Math.abs(savings).toLocaleString('en-IN')}
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 5px 0 0;">
                Net ${savings >= 0 ? 'Savings' : 'Overspending'} (${savingsRate}% savings rate)
              </p>
            </div>

            <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">Top Expense Categories</h2>
            <table style="width: 100%; border-collapse: collapse;">`;

    sortedCategories.forEach(([category, amount], index) => {
      const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
      body += `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 0; color: #475569;">${index + 1}. ${category.charAt(0).toUpperCase() + category.slice(1)}</td>
                <td style="padding: 12px 0; text-align: right; color: #1e293b; font-weight: 500;">₹${amount.toLocaleString('en-IN')}</td>
                <td style="padding: 12px 0; text-align: right; color: #64748b;">${percentage}%</td>
              </tr>`;
    });

    body += `
            </table>

            <div style="margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                <strong>Transactions:</strong> ${transactions.length} total
              </p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
              This report was automatically generated by FinanceFlow.
            </p>
          </div>
        </div>
      </body></html>`;

    sendNotificationEmail(email, subject, body, `Monthly financial report for ${monthName} ${year}`);
    logInfo('sendMonthlyReport', 'Monthly report sent', `Email: ${email}, Month: ${monthName} ${year}`, email);
    return { success: true, message: `Monthly report for ${monthName} ${year} sent successfully` };

  } catch (error) {
    logError('sendMonthlyReport', 'Error sending monthly report', error.message);
    return { success: false, error: error.message };
  }
}
