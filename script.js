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

// Payment Processing - FIXED VERSION
payButton.addEventListener('click', async function() {
    // First check if Paystack is loaded
    if (typeof PaystackPop === 'undefined') {
        alert("Payment system not loaded. Please refresh the page.");
        console.error("PaystackPop is not defined");
        return;
    }

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

        console.log("Payment initialization:", {
            type, quantity, email: customerEmail, 
            amount: totalPrice, ref: paymentRef
        });

        // Define callback separately to ensure it's a proper function
        const paymentCallback = function(response) {
            console.log("Paystack callback received:", response);
            
            // Handle the response in a separate async function
            (async function() {
                try {
                    if (response.status === "success") {
                        const soldVouchers = available.slice(0, quantity);
                        for (const voucher of soldVouchers) {
                            await markVoucherAsSold(voucher.Serial, type, response.reference);
                        }
                        displayPurchasedVouchers(soldVouchers, type);
                        alert("Payment successful! Your vouchers are ready.");
                    } else {
                        alert("Payment failed: " + (response.message || "Unknown error"));
                    }
                } catch (error) {
                    console.error("Callback processing error:", error);
                    alert("Voucher processing failed. Please contact support.");
                }
            })();
        };

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
            callback: paymentCallback, // Using the properly defined function
            onClose: function() {
                console.log("Payment window closed");
                alert("Payment not completed - window closed");
            }
        });

        // Verify the callback is properly set
        if (typeof handler.callback !== 'function') {
            console.error("Callback is not a function:", handler.callback);
            alert("Payment system error - please contact support");
            return;
        }

        handler.openIframe();
    } catch (error) {
        console.error("Payment initialization error:", error);
        alert("Payment failed to start: " + error.message);
    }
});

// [REST OF YOUR ORIGINAL CODE REMAINS EXACTLY THE SAME]
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

// [ALL OTHER FUNCTIONS REMAIN UNCHANGED FROM YOUR ORIGINAL CODE]