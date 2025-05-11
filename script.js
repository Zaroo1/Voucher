// Configuration with YOUR credentials
const ADMIN_PASSWORD = "@Zaroo_zaroo.me/4545";
const PAYSTACK_KEY = "pk_live_8c56d91cee6884d988dd8355981e0134ab72b94b";
const SHEETDB_URL = "https://sheetdb.io/api/v1/bb2fc4ca1q4jg";
const SHEETDB_KEY = "YOUR_API_KEY"; // Keep this secure!

// DOM Elements (same as before)
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
const clearSoldButton = document.getElementById('clear-sold');

// Prices for each voucher type
const PRICES = {
    wassce: 1.00,
    novdec: 1.00,
    bece: 1.00
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updatePrices();
    updateInventoryDisplay();
});

// Price calculation functions
function updatePrices() {
    const type = voucherTypeSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    unitPriceSpan.textContent = `GHS ${PRICES[type].toFixed(2)}`;
    totalPriceSpan.textContent = `GHS ${(PRICES[type] * quantity).toFixed(2)}`;
}

voucherTypeSelect.addEventListener('change', updatePrices);
quantityInput.addEventListener('input', updatePrices);

// Payment processing
payButton.addEventListener('click', async function() {
    const type = voucherTypeSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    const customerEmail = prompt("Please enter your email for payment receipt:");
    
    if (!customerEmail) {
        alert("Email is required for payment");
        return;
    }

    try {
        // Check available vouchers
        const available = await getAvailableVouchers(type);
        if (available.length < quantity) {
            alert(`Only ${available.length} ${type.toUpperCase()} vouchers available!`);
            return;
        }

        // Calculate total
        const totalPrice = PRICES[type] * quantity * 100;

        // Process Paystack payment
        const handler = PaystackPop.setup({
            key: PAYSTACK_KEY,
            email: customerEmail,
            amount: totalPrice,
            currency: 'GHS',
            ref: 'AZZ-' + Date.now(),
            callback: async function(response) {
                // Mark vouchers as sold
                const soldVouchers = available.slice(0, quantity);
                for (const voucher of soldVouchers) {
                    await markVoucherAsSold(voucher.Serial, type, response.reference);
                }
                
                // Display purchased vouchers
                displayPurchasedVouchers(soldVouchers, type);
            },
            onClose: function() {
                alert("Payment cancelled");
            }
        });
        handler.openIframe();
    } catch (error) {
        console.error("Payment error:", error);
        alert("Error processing payment. Please try again.");
    }
});

// Voucher management functions
async function getAvailableVouchers(type) {
    try {
        const response = await axios.get(
            `${SHEETDB_URL}?filter[Type]=${type.toUpperCase()}&filter[Status]=Available`,
            { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
        );
        return response.data || [];
    } catch (error) {
        console.error("Error fetching vouchers:", error);
        return [];
    }
}

async function markVoucherAsSold(serial, type, paymentRef) {
    try {
        await axios.patch(
            `${SHEETDB_URL}/Serial/${serial}`,
            {
                data: {
                    Status: "Sold",
                    PaymentRef: paymentRef,
                    DateSold: new Date().toISOString()
                }
            },
            { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
        );
        return true;
    } catch (error) {
        console.error("Error updating voucher:", error);
        return false;
    }
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
            displayText = `Your WEAC checkers are (SN: ${voucher.Serial} , PIN: ${voucher.PIN}) Please visit ghana.waecdirect.org`;
        } else {
            displayText = `Your BECE checkers are (SN: ${voucher.Serial} , PIN: ${voucher.PIN})`;
        }
        
        voucherDiv.innerHTML = `<p>${displayText}</p><p>Price: GHS ${PRICES[type]}.00</p>`;
        voucherListDiv.appendChild(voucherDiv);
    });
}

// Admin functions
loginAdminButton.addEventListener('click', function() {
    if (adminPasswordInput.value.trim() === ADMIN_PASSWORD) {
        adminPanelDiv.style.display = 'block';
        clearSoldButton.style.display = 'block';
        adminPasswordInput.value = '';
        updateInventoryDisplay();
    } else {
        alert('Incorrect password');
    }
});

uploadVouchersButton.addEventListener('click', async function() {
    const type = voucherTypeAdminSelect.value;
    const batchText = voucherBatchTextarea.value.trim();
    
    if (!batchText) {
        alert('Please paste voucher details');
        return;
    }
    
    try {
        const lines = batchText.split('\n');
        const newVouchers = [];
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            const serialMatch = line.match(/SN:\s*(\w+)/);
            const pinMatch = line.match(/PIN:\s*(\d+)/);
            
            if (serialMatch && pinMatch) {
                newVouchers.push({
                    Type: type.toUpperCase(),
                    Serial: serialMatch[1],
                    PIN: pinMatch[1],
                    Status: "Available",
                    Price: PRICES[type],
                    PaymentRef: "",
                    DateSold: ""
                });
            }
        });
        
        if (newVouchers.length > 0) {
            await axios.post(
                SHEETDB_URL,
                { data: newVouchers },
                { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
            );
            alert(`Added ${newVouchers.length} new ${type.toUpperCase()} vouchers!`);
            voucherBatchTextarea.value = '';
            updateInventoryDisplay();
        } else {
            alert("No valid vouchers found in the text");
        }
    } catch (error) {
        console.error("Upload error:", error);
        alert("Error uploading vouchers. Please try again.");
    }
});

clearSoldButton.addEventListener('click', async function() {
    if (confirm('⚠️ WARNING! This will clear ALL sold voucher records.\n\nAre you sure?')) {
        try {
            // Get all sold vouchers
            const response = await axios.get(
                `${SHEETDB_URL}?filter[Status]=Sold`,
                { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
            );
            
            // Update them to "Expired" status
            for (const voucher of response.data) {
                await axios.patch(
                    `${SHEETDB_URL}/Serial/${voucher.Serial}`,
                    { data: { Status: "Expired" } },
                    { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
                );
            }
            
            alert("Sold vouchers have been cleared!");
            updateInventoryDisplay();
        } catch (error) {
            console.error("Error clearing vouchers:", error);
            alert("Error clearing vouchers. Please try again.");
        }
    }
});

async function updateInventoryDisplay() {
    try {
        const response = await axios.get(
            SHEETDB_URL,
            { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
        );
        
        const allVouchers = response.data || [];
        inventoryDisplayDiv.innerHTML = '';
        
        // Count by type
        const counts = {
            WASSCE: { available: 0, sold: 0 },
            NONDEC: { available: 0, sold: 0 },
            BECE: { available: 0, sold: 0 }
        };
        
        allVouchers.forEach(voucher => {
            const type = voucher.Type.toUpperCase();
            if (counts[type]) {
                if (voucher.Status === "Available") {
                    counts[type].available++;
                } else {
                    counts[type].sold++;
                }
            }
        });
        
        // Display counts
        for (const type in counts) {
            const typeDiv = document.createElement('div');
            typeDiv.className = 'inventory-item';
            
            typeDiv.innerHTML = `
                <div>
                    <strong>${type}</strong>
                    <p>Available: ${counts[type].available} | Sold: ${counts[type].sold}</p>
                </div>
                <span class="inventory-count">${counts[type].available}</span>
            `;
            
            inventoryDisplayDiv.appendChild(typeDiv);
        }
    } catch (error) {
        console.error("Error fetching inventory:", error);
        inventoryDisplayDiv.innerHTML = '<p>Error loading inventory. Please refresh.</p>';
    }
}

// UI Functions
printButton.addEventListener('click', () => window.print());
newPurchaseButton.addEventListener('click', () => {
    voucherDisplaySection.style.display = 'none';
    voucherSelectionSection.style.display = 'block';
});