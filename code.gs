/**
 * Media Tech Support - Marketplace Backend
 * Google Apps Script Backend connected to Google Sheets
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Copy this entire code into the Code.gs file
 * 3. Create a Google Sheet and note its ID from the URL
 * 4. Replace SPREADSHEET_ID below with your Sheet ID
 * 5. Run the setupSheets() function once to create all required sheets
 * 6. Deploy as Web App:
 *    - Click Deploy > New Deployment
 *    - Select "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 *    - Click Deploy and copy the Web App URL
 * 7. Paste the Web App URL into your marketplace's js/app.js CONFIG.API_URL
 */

const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID'; // Replace with your Google Sheet ID

// ===== Sheet Names =====
const SHEETS = {
  USERS: 'Users',
  PRODUCTS: 'Products',
  ORDERS: 'Orders',
  PAYMENTS: 'Payments',
  ADMIN: 'Admin'
};

// ===== Setup =====
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Users sheet
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    usersSheet.appendRow(['ID', 'Full Name', 'Username', 'Email', 'Phone', 'Address', 'Password', 'Role', 'Payment Method', 'Created At']);
    usersSheet.getRange('1:1').setFontWeight('bold');
  }

  // Products sheet
  let productsSheet = ss.getSheetByName(SHEETS.PRODUCTS);
  if (!productsSheet) {
    productsSheet = ss.insertSheet(SHEETS.PRODUCTS);
    productsSheet.appendRow(['ID', 'Seller ID', 'Seller Name', 'Category', 'Name', 'Company', 'Description', 'Price', 'Location', 'Images', 'Subscription Duration', 'Rent Duration', 'Status', 'Created At']);
    productsSheet.getRange('1:1').setFontWeight('bold');
  }

  // Orders sheet
  let ordersSheet = ss.getSheetByName(SHEETS.ORDERS);
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet(SHEETS.ORDERS);
    ordersSheet.appendRow(['ID', 'Buyer ID', 'Buyer Name', 'Product ID', 'Product Name', 'Product Price', 'Type', 'Shipping/Contact Info', 'Status', 'Created At']);
    ordersSheet.getRange('1:1').setFontWeight('bold');
  }

  // Payments sheet
  let paymentsSheet = ss.getSheetByName(SHEETS.PAYMENTS);
  if (!paymentsSheet) {
    paymentsSheet = ss.insertSheet(SHEETS.PAYMENTS);
    paymentsSheet.appendRow(['Order ID', 'Amount', 'Method', 'Transaction ID', 'Email', 'Screenshot URL', 'Submitted At']);
    paymentsSheet.getRange('1:1').setFontWeight('bold');
  }

  // Admin sheet
  let adminSheet = ss.getSheetByName(SHEETS.ADMIN);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(SHEETS.ADMIN);
    adminSheet.appendRow(['Key', 'Value']);
    adminSheet.appendRow(['admin_username', 'admin']);
    adminSheet.appendRow(['admin_password', 'admin123']);
    adminSheet.getRange('1:1').setFontWeight('bold');
  }

  Logger.log('All sheets created successfully!');
}

// ===== Web App Entry Points =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;
    switch (action) {
      // Auth
      case 'signup': result = handleSignup(data); break;
      case 'login': result = handleLogin(data); break;
      case 'updatePaymentMethod': result = handleUpdatePaymentMethod(data); break;

      // Products
      case 'addProduct': result = handleAddProduct(data); break;
      case 'getProducts': result = handleGetProducts(data); break;
      case 'getProduct': result = handleGetProduct(data); break;
      case 'deleteProduct': result = handleDeleteProduct(data); break;

      // Orders
      case 'createOrder': result = handleCreateOrder(data); break;
      case 'getOrders': result = handleGetOrders(data); break;
      case 'submitPaymentProof': result = handleSubmitPaymentProof(data); break;

      // Admin
      case 'adminLogin': result = handleAdminLogin(data); break;
      case 'getStats': result = handleGetStats(); break;
      case 'getAllUsers': result = handleGetAllUsers(); break;
      case 'getAllProducts': result = handleGetAllProducts(); break;
      case 'getAllOrders': result = handleGetAllOrders(); break;
      case 'deleteUser': result = handleDeleteUser(data); break;

      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: 'ok', 
    message: 'Media Tech Support Marketplace API is running' 
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== Auth Handlers =====
function handleSignup(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();

  // Check existing username/email
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2] === data.username) return { success: false, message: 'Username already exists' };
    if (rows[i][3] === data.email) return { success: false, message: 'Email already registered' };
  }

  const userId = 'user_' + new Date().getTime();
  sheet.appendRow([
    userId, data.fullName, data.username, data.email,
    data.phone, data.address, data.password, data.role,
    '', new Date().toISOString()
  ]);

  return { 
    success: true, 
    user: {
      id: userId, fullName: data.fullName, username: data.username,
      email: data.email, phone: data.phone, address: data.address,
      role: data.role, createdAt: new Date().toISOString()
    }
  };
}

function handleLogin(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][2] === data.usernameOrEmail || rows[i][3] === data.usernameOrEmail) && rows[i][6] === data.password) {
      return {
        success: true,
        user: {
          id: rows[i][0], fullName: rows[i][1], username: rows[i][2],
          email: rows[i][3], phone: rows[i][4], address: rows[i][5],
          role: rows[i][7], paymentMethod: rows[i][8] ? JSON.parse(rows[i][8]) : null,
          createdAt: rows[i][9]
        }
      };
    }
  }
  return { success: false, message: 'Invalid username/email or password' };
}

function handleUpdatePaymentMethod(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.userId) {
      sheet.getRange(i + 1, 9).setValue(JSON.stringify(data.paymentMethod));
      return { success: true };
    }
  }
  return { success: false, message: 'User not found' };
}

// ===== Product Handlers =====
function handleAddProduct(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  const productId = 'prod_' + new Date().getTime();

  sheet.appendRow([
    productId, data.sellerId, data.sellerName, data.category,
    data.name, data.company || '', data.description, data.price,
    data.location || '', JSON.stringify(data.images || []),
    data.subscriptionDuration || '', data.rentDuration || '',
    'active', new Date().toISOString()
  ]);

  return { success: true, productId };
}

function handleGetProducts(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  const rows = sheet.getDataRange().getValues();
  
  let products = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][12] !== 'active') continue;
    if (data.category && data.category !== 'all' && rows[i][3] !== data.category) continue;

    products.push({
      id: rows[i][0], sellerId: rows[i][1], sellerName: rows[i][2],
      category: rows[i][3], name: rows[i][4], company: rows[i][5],
      description: rows[i][6], price: rows[i][7], location: rows[i][8],
      images: rows[i][9] ? JSON.parse(rows[i][9]) : [],
      subscriptionDuration: rows[i][10], rentDuration: rows[i][11],
      status: rows[i][12], createdAt: rows[i][13]
    });
  }

  return { success: true, products };
}

function handleGetProduct(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.productId) {
      return {
        success: true,
        product: {
          id: rows[i][0], sellerId: rows[i][1], sellerName: rows[i][2],
          category: rows[i][3], name: rows[i][4], company: rows[i][5],
          description: rows[i][6], price: rows[i][7], location: rows[i][8],
          images: rows[i][9] ? JSON.parse(rows[i][9]) : [],
          subscriptionDuration: rows[i][10], rentDuration: rows[i][11],
          status: rows[i][12], createdAt: rows[i][13]
        }
      };
    }
  }
  return { success: false, message: 'Product not found' };
}

function handleDeleteProduct(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCTS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.productId) {
      sheet.getRange(i + 1, 13).setValue('deleted');
      return { success: true };
    }
  }
  return { success: false, message: 'Product not found' };
}

// ===== Order Handlers =====
function handleCreateOrder(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  const orderId = 'order_' + new Date().getTime();

  const contactInfo = {};
  if (data.shipping) contactInfo.shipping = data.shipping;
  if (data.email) contactInfo.email = data.email;
  if (data.phone) contactInfo.phone = data.phone;
  if (data.whatsapp) contactInfo.whatsapp = data.whatsapp;

  sheet.appendRow([
    orderId, data.buyerId, data.buyerName, data.productId,
    data.productName, data.productPrice, data.type,
    JSON.stringify(contactInfo), 'pending', new Date().toISOString()
  ]);

  return { success: true, orderId };
}

function handleGetOrders(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  const rows = sheet.getDataRange().getValues();

  let orders = [];
  for (let i = 1; i < rows.length; i++) {
    if (data.buyerId && rows[i][1] !== data.buyerId) continue;

    orders.push({
      id: rows[i][0], buyerId: rows[i][1], buyerName: rows[i][2],
      productId: rows[i][3], productName: rows[i][4],
      productPrice: rows[i][5], type: rows[i][6],
      contactInfo: rows[i][7] ? JSON.parse(rows[i][7]) : {},
      status: rows[i][8], createdAt: rows[i][9]
    });
  }

  return { success: true, orders };
}

function handleSubmitPaymentProof(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Update order status
  const ordersSheet = ss.getSheetByName(SHEETS.ORDERS);
  const orderRows = ordersSheet.getDataRange().getValues();
  for (let i = 1; i < orderRows.length; i++) {
    if (orderRows[i][0] === data.orderId) {
      ordersSheet.getRange(i + 1, 9).setValue('proof_submitted');
      break;
    }
  }

  // Add to payments sheet
  const paymentsSheet = ss.getSheetByName(SHEETS.PAYMENTS);
  paymentsSheet.appendRow([
    data.orderId, data.amount, data.method, data.transactionId,
    data.email, data.screenshotUrl || '', new Date().toISOString()
  ]);

  return { success: true };
}

// ===== Admin Handlers =====
function handleAdminLogin(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ADMIN);
  const rows = sheet.getDataRange().getValues();

  let username = 'admin', password = 'admin123';
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'admin_username') username = rows[i][1];
    if (rows[i][0] === 'admin_password') password = rows[i][1];
  }

  if (data.username === username && data.password === password) {
    return { success: true };
  }
  return { success: false, message: 'Invalid admin credentials' };
}

function handleGetStats() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const users = ss.getSheetByName(SHEETS.USERS).getDataRange().getValues().length - 1;
  const products = ss.getSheetByName(SHEETS.PRODUCTS).getDataRange().getValues().length - 1;
  const orders = ss.getSheetByName(SHEETS.ORDERS).getDataRange().getValues().length - 1;
  const payments = ss.getSheetByName(SHEETS.PAYMENTS).getDataRange().getValues().length - 1;

  return { success: true, stats: { users, products, orders, payments } };
}

function handleGetAllUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = ss.getSheetByName(SHEETS.USERS).getDataRange().getValues();
  
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    users.push({
      id: rows[i][0], fullName: rows[i][1], username: rows[i][2],
      email: rows[i][3], phone: rows[i][4], address: rows[i][5],
      role: rows[i][7], createdAt: rows[i][9]
    });
  }
  return { success: true, users };
}

function handleGetAllProducts() {
  return handleGetProducts({ category: 'all' });
}

function handleGetAllOrders() {
  return handleGetOrders({});
}

function handleDeleteUser(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.userId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'User not found' };
}
