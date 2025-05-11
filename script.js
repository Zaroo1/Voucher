// Configuration
const ADMIN_PASSWORD = "@Zaroo_zaroo.me/4545";
const PAYSTACK_KEY = "pk_live_8c56d91cee6884d988dd8355981e0134ab72b94b";
const SHEETDB_URL = "https://sheetdb.io/api/v1/bb2fc4ca1q4jg";
const SHEETDB_KEY = "bb2fc4ca1q4jg";

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
const clearSoldButton = document.getElementById('clear-sold');

// Prices
const PRICES = { wassce: 1.00, novdec: 1.00, bece: 1.00 };

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updatePrices();
    updateInventoryDisplay();
});

// Price calculation
function updatePrices() {
    const type = voucherTypeSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    unitPriceSpan.textContent = `GHS ${PRICES[type].toFixed(2)}`;
    totalPriceSpan.textContent = `GHS ${(PRICES[type] * quantity).toFixed(2)}`;
}

voucherTypeSelect.addEventListener('change', updatePrices);
quantityInput.addEventListener('input', updatePrices);

// Payment Processing - UPDATED VERSION
payButton.addEventListener('click', async function() {
    try {
        // Validate inputs
        const type = voucherTypeSelect.value;
        const quantity = parseInt(quantityInput.value) || 1;
        if (quantity < 1) {
            alert("Please enter a valid quantity");
            return;
        }

        const customerEmail = prompt("Enter your email for payment receipt:");
        if (!customerEmail || !customerEmail.includes("@")) {
            alert("Valid email required");
            return;
        }

        // Check availability
        const available = await getAvailableVouchers(type);
        if (available.length < quantity) {
            alert(`Only ${available.length} available!`);
            return;
        }

        // Prepare payment
        const totalPrice = PRICES[type] * quantity * 100; // in kobo
        const paymentRef = 'AZZ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

        console.log("Initiating payment for:", {
            type, quantity, email: customerEmail, amount: totalPrice, ref: paymentRef
        });

        // Configure Paystack
        const handler = PaystackPop.setup({
            key: PAYSTACK_KEY,
            email: customerEmail,
            amount: totalPrice,
            currency: 'GHS',
            ref: paymentRef,
            metadata: {
                custom_fields: [
                    {
                        display_name: "Voucher Type",
                        variable_name: "voucher_type",
                        value: type
                    },
                    {
                        display_name: "Quantity",
                        variable_name: "quantity",
                        value: quantity
                    }
                ]
            },
            callback: async function(response) {
                console.log("Payment response:", response);
                if (response.status === "success") {
                    try {
                        const soldVouchers = available.slice(0, quantity);
                        for (const voucher of soldVouchers) {
                            await markVoucherAsSold(voucher.Serial, type, response.reference);
                        }
                        displayPurchasedVouchers(soldVouchers, type);
                        alert("Payment successful! Your vouchers are ready.");
                    } catch (error) {
                        console.error("Voucher processing error:", error);
                        alert("Voucher processing failed. Please contact support with reference: " + response.reference);
                    }
                } else {
                    alert("Payment failed: " + (response.message || "Unknown error"));
                }
            },
            onClose: function() {
                console.log("Payment window closed");
                alert("Payment not completed - window closed");
            }
        });

        handler.openIframe();
    } catch (error) {
        console.error("Payment error:", error);
        alert("Payment failed: " + error.message);
    }
});

// Voucher management
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
            displayText = `Your WEAC checkers are (SN: ${voucher.Serial} , PIN: ${voucher.PIN})`;
        } else {
            displayText = `Your BECE checkers are (SN: ${voucher.Serial} , PIN: ${voucher.PIN})`;
        }
        
        voucherDiv.innerHTML = `
            <p>${displayText}</p>
            <p>Price: GHS ${PRICES[type].toFixed(2)}</p>
            <p>Visit ghana.waecdirect.org to check results</p>
        `;
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
            alert("No valid vouchers found");
        }
    } catch (error) {
        console.error("Upload error:", error);
        alert("Error uploading vouchers");
    }
});

clearSoldButton.addEventListener('click', async function() {
    if (confirm('⚠️ Clear ALL sold voucher records?')) {
        try {
            const response = await axios.get(
                `${SHEETDB_URL}?filter[Status]=Sold`,
                { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
            );
            
            for (const voucher of response.data) {
                await axios.patch(
                    `${SHEETDB_URL}/Serial/${voucher.Serial}`,
                    { data: { Status: "Expired" } },
                    { headers: { Authorization: `Bearer ${SHEETDB_KEY}` } }
                );
            }
            
            alert("Sold vouchers cleared!");
            updateInventoryDisplay();
        } catch (error) {
            console.error("Clear error:", error);
            alert("Error clearing vouchers");
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
        const counts = {
            WASSCE: { available: 0, sold: 0 },
            NONDEC: { available: 0, sold: 0 },
            BECE: { available: 0, sold: 0 }
        };
        
        allVouchers.forEach(voucher => {
            const type = voucher.Type.toUpperCase();
            if (counts[type]) {
                counts[type][voucher.Status === "Available" ? "available" : "sold"]++;
            }
        });
        
        inventoryDisplayDiv.innerHTML = '';
        for (const type in counts) {
            const typeDiv = document.createElement('div');
            typeDiv.className = 'inventory-item';
            typeDiv.innerHTML = `
                <div>
                    <strong>${type}</strong>
                    <p>Available: ${counts[type].available} | Sold: ${counts[type].sold}</p>
                </div>
            `;
            inventoryDisplayDiv.appendChild(typeDiv);
        }
    } catch (error) {
        console.error("Inventory error:", error);
        inventoryDisplayDiv.innerHTML = '<p>Error loading inventory</p>';
    }
}

// UI Functions
printButton.addEventListener('click', () => window.print());
newPurchaseButton.addEventListener('click', () => {
    voucherDisplaySection.style.display = 'none';
    voucherSelectionSection.style.display = 'block';
});