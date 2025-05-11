// Initialize voucher inventory in localStorage if it doesn't exist
if (!localStorage.getItem('voucherInventory')) {
    localStorage.setItem('voucherInventory', JSON.stringify({
        wassce: [],
        novdec: [],
        bece: []
    }));
}

// Initialize sold vouchers in localStorage if it doesn't exist
if (!localStorage.getItem('soldVouchers')) {
    localStorage.setItem('soldVouchers', JSON.stringify([]));
}

// Initialize admin password (in a real app, this would be server-side)
const ADMIN_PASSWORD = "@Zaroo_zaroo.me/4545"; // Change this to your preferred password

// DOM Elements
const voucherTypeSelect = document.getElementById('voucher-type');
const quantityInput = document.getElementById('quantity');
const unitPriceSpan = document.getElementById('unit-price');
const totalPriceSpan = document.getElementById('total-price');
const payButton = document.getElementById('pay-button');
const voucherDisplaySection = document.getElementById('voucher-display');
const voucherListDiv = document.getElementById('voucher-list');
const printButton = document.getElementById('print-button');
const newPurchaseButton = document.getElementById('new-purchase');
const voucherSelectionSection = document.getElementById('voucher-selection');
const adminPasswordInput = document.getElementById('admin-password');
const loginAdminButton = document.getElementById('login-admin');
const adminPanelDiv = document.getElementById('admin-panel');
const voucherTypeAdminSelect = document.getElementById('voucher-type-admin');
const voucherBatchTextarea = document.getElementById('voucher-batch');
const uploadVouchersButton = document.getElementById('upload-vouchers');
const inventoryDisplayDiv = document.getElementById('inventory-display');

// Prices for each voucher type (you can change these)
const PRICES = {
    wassce: 1.00,
    novdec: 1.00,
    bece: 1.00
};

// Update prices when voucher type changes
voucherTypeSelect.addEventListener('change', updatePrices);
quantityInput.addEventListener('input', updatePrices);

function updatePrices() {
    const type = voucherTypeSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    
    unitPriceSpan.textContent = `GHS ${PRICES[type].toFixed(2)}`;
    totalPriceSpan.textContent = `GHS ${(PRICES[type] * quantity).toFixed(2)}`;
}

// Initialize prices
updatePrices();

// Paystack payment handler
payButton.addEventListener('click', initiatePayment);

function initiatePayment() {
    const type = voucherTypeSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    const totalPrice = PRICES[type] * quantity * 100; // Paystack uses kobo (multiply by 100)
    
    // Check if we have enough vouchers in stock
    const inventory = JSON.parse(localStorage.getItem('voucherInventory'));
    if (inventory[type].length < quantity) {
        alert(`Sorry, we only have ${inventory[type].length} ${type.toUpperCase()} vouchers available.`);
        return;
    }
    
    const handler = PaystackPop.setup({
        key: 'pk_live_8c56d91cee6884d988dd8355981e0134ab72b94b',
        email: 'aazzinternethub@gmail.com',
        amount: totalPrice,
        currency: 'GHS',
        ref: 'AZZ' + Math.floor(Math.random() * 1000000000 + 1),
        onClose: function() {
            alert('Payment window closed.');
        },
        callback: function(response) {
            // Payment was successful
            processVoucherPurchase(type, quantity, response.reference);
        }
    });
    
    handler.openIframe();
}

function processVoucherPurchase(type, quantity, paymentRef) {
    const inventory = JSON.parse(localStorage.getItem('voucherInventory'));
    const soldVouchers = JSON.parse(localStorage.getItem('soldVouchers'));
    
    // Get the requested number of vouchers
    const purchasedVouchers = inventory[type].splice(0, quantity);
    
    // Mark vouchers as sold with payment reference
    const timestamp = new Date().toISOString();
    purchasedVouchers.forEach(voucher => {
        soldVouchers.push({
            ...voucher,
            paymentRef,
            dateSold: timestamp,
            type
        });
    });
    
    // Update localStorage
    localStorage.setItem('voucherInventory', JSON.stringify(inventory));
    localStorage.setItem('soldVouchers', JSON.stringify(soldVouchers));
    
    // Display the vouchers to the user
    displayPurchasedVouchers(purchasedVouchers, type);
    
    // Update admin view
    updateInventoryDisplay();
}

function displayPurchasedVouchers(vouchers, type) {
    voucherSelectionSection.style.display = 'none';
    voucherDisplaySection.style.display = 'block';
    
    voucherListDiv.innerHTML = '';
    
    vouchers.forEach(voucher => {
        const voucherDiv = document.createElement('div');
        voucherDiv.className = 'voucher-item';
        
        let displayText = '';
        if (type === 'wassce' || type === 'novdec') {
            displayText = `Your WEAC checkers are (SN: ${voucher.serial} , PIN: ${voucher.pin}) Please visit ghana.waecdirect.org to print your results.`;
        } else if (type === 'bece') {
            displayText = `Your BECE checkers are (SN: ${voucher.serial} , PIN: ${voucher.pin}) Please visit the appropriate portal to check your results.`;
        }
        
        voucherDiv.innerHTML = `<p>${displayText}</p>`;
        voucherListDiv.appendChild(voucherDiv);
    });
}

// Print button handler
printButton.addEventListener('click', () => {
    window.print();
});

// New purchase button handler
newPurchaseButton.addEventListener('click', () => {
    voucherDisplaySection.style.display = 'none';
    voucherSelectionSection.style.display = 'block';
});

// Admin login handler
loginAdminButton.addEventListener('click', () => {
    if (adminPasswordInput.value === ADMIN_PASSWORD) {
        adminPanelDiv.style.display = 'block';
        adminPasswordInput.value = '';
        updateInventoryDisplay();
    } else {
        alert('Incorrect password');
    }
});

// Upload vouchers handler
uploadVouchersButton.addEventListener('click', () => {
    const type = voucherTypeAdminSelect.value;
    const batchText = voucherBatchTextarea.value.trim();
    
    if (!batchText) {
        alert('Please paste voucher details');
        return;
    }
    
    const lines = batchText.split('\n');
    const inventory = JSON.parse(localStorage.getItem('voucherInventory'));
    
    let addedCount = 0;
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // Extract serial and pin from the line
        const serialMatch = line.match(/SN:\s*(\w+)/);
        const pinMatch = line.match(/PIN:\s*(\d+)/);
        
        if (serialMatch && pinMatch) {
            const serial = serialMatch[1];
            const pin = pinMatch[1];
            
            // Check if this voucher already exists
            const exists = inventory[type].some(v => v.serial === serial && v.pin === pin);
            
            if (!exists) {
                inventory[type].push({ serial, pin });
                addedCount++;
            }
        }
    });
    
    localStorage.setItem('voucherInventory', JSON.stringify(inventory));
    voucherBatchTextarea.value = '';
    updateInventoryDisplay();
    
    alert(`Added ${addedCount} new ${type.toUpperCase()} vouchers.`);
});

function updateInventoryDisplay() {
    const inventory = JSON.parse(localStorage.getItem('voucherInventory'));
    const soldVouchers = JSON.parse(localStorage.getItem('soldVouchers'));
    
    inventoryDisplayDiv.innerHTML = '';
    
    for (const type in inventory) {
        const typeDiv = document.createElement('div');
        typeDiv.className = 'inventory-item';
        
        const typeName = type.toUpperCase();
        const count = inventory[type].length;
        
        // Count sold vouchers of this type
        const soldCount = soldVouchers.filter(v => v.type === type).length;
        
        typeDiv.innerHTML = `
            <div>
                <strong>${typeName}</strong>
                <p>Available: ${count} | Sold: ${soldCount}</p>
            </div>
            <span class="inventory-count">${count}</span>
        `;
        
        inventoryDisplayDiv.appendChild(typeDiv);
    }
}

// Initialize the page
updateInventoryDisplay();











// rough rough tough
// Admin login handler
loginAdminButton.addEventListener('click', function() {
  if (adminPasswordInput.value.trim() === ADMIN_PASSWORD) {
    adminPanelDiv.style.display = 'block';
    document.getElementById('clear-sold').style.display = 'block'; // Show button
    updateInventoryDisplay();
  } else {
    alert('Incorrect password');
  }
});

// Clear sold vouchers function
document.getElementById('clear-sold').addEventListener('click', function() {
  if (confirm('⚠️ DANGER! This will permanently delete ALL records of sold vouchers!\n\nAre you sure?')) {
    localStorage.setItem('soldVouchers', JSON.stringify([]));
    alert('All sold voucher records have been cleared!');
    updateInventoryDisplay();
  }
});

//API 

// PUT YOUR OWN API URL AND KEY HERE
const SHEETDB_URL = "https://sheetdb.io/api/v1/YOUR_SHEET_ID";
const SHEETDB_KEY = "YOUR_API_KEY";

// This gets all available WASSCE vouchers
async function getWASSCEVouchers() {
  try {
    const response = await axios.get(`${SHEETDB_URL}?filter[Type]=WASSCE&filter[Status]=Available`);
    return response.data;
  } catch (error) {
    console.error("Oops! Error:", error);
    return [];
  }
}

// This marks a voucher as sold
async function sellVoucher(serial) {
  try {
    await axios.patch(`${SHEETDB_URL}/Serial/${serial}`, {
      data: { Status: "Sold" }
    }, {
      headers: { Authorization: `Bearer ${SHEETDB_KEY}` }
    });
    return true;
  } catch (error) {
    console.error("Oops! Error:", error);
    return false;
  }
}