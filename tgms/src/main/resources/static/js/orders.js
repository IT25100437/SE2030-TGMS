let inventoryItemsCache = [];
let orderItemRowCount = 0;
let customersCache = [];

(async function init() {
    const user = await requireLogin();
    if (!user) return;

    await loadCustomersIntoDropdown();
    await loadInventoryCache();
    addOrderItemRow();
    await loadOrders();
})();

// ---- Customer registration ----
document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('pageAlert');

    const payload = {
        name: document.getElementById('cu_name').value.trim(),
        contact: document.getElementById('cu_contact').value.trim(),
        address: document.getElementById('cu_address').value.trim()
    };

    try {
        await api.post('/api/customers', payload);

        showAlert('pageAlert', 'Customer registered.', 'success');

        document.getElementById('customerForm').reset();

        await loadCustomersIntoDropdown();
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
});

async function loadCustomersIntoDropdown() {
    try {
        const customers = await api.get('/api/customers');

        customersCache = customers;

        renderCustomers(customers);

        const select = document.getElementById('o_customer');

        select.innerHTML = customers.length
            ? customers.map(c =>
                `<option value="${c.id}">
                    ${escapeHtml(c.name)} (${escapeHtml(c.contact)})
                </option>`
            ).join('')
            : '<option value="">No customers yet - register one above</option>';

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

// ---- Registered customers table (edit + permanent delete) ----
function renderCustomers(customers) {

    const tbody = document.getElementById('customerTableBody');

    if (!tbody) return;

    if (!customers.length) {
        tbody.innerHTML =
            '<tr><td colspan="5" class="small-text">No customers registered yet.</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.contact)}</td>
            <td>${escapeHtml(c.address)}</td>
            <td>
                <button
                    class="secondary"
                    onclick="editCustomer(${c.id})">
                    Edit
                </button>

                <button
                    class="danger"
                    onclick="permanentlyDeleteCustomer(${c.id})">
                    Permanent Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// ---- Edit customer (uses the existing PUT /api/customers/{id}) ----
function editCustomer(id) {

    hideAlert('pageAlert');

    const customer = customersCache.find(c => c.id === id);

    if (!customer) return;

    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name || '';
    document.getElementById('editCustomerContact').value = customer.contact || '';
    document.getElementById('editCustomerAddress').value = customer.address || '';
    document.getElementById('editCustomerTitle').textContent = customer.name;

    const panel = document.getElementById('editCustomerPanel');

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditCustomer() {

    document.getElementById('editCustomerPanel').classList.add('hidden');
    document.getElementById('editCustomerForm').reset();
    document.getElementById('editCustomerId').value = '';
    document.getElementById('editCustomerTitle').textContent = '';
}

document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('pageAlert');

    const id = document.getElementById('editCustomerId').value;

    const payload = {
        name: document.getElementById('editCustomerName').value.trim(),
        contact: document.getElementById('editCustomerContact').value.trim(),
        address: document.getElementById('editCustomerAddress').value.trim()
    };

    try {
        await api.put(`/api/customers/${id}`, payload);

        showAlert('pageAlert', 'Customer updated.', 'success');

        cancelEditCustomer();

        await loadCustomersIntoDropdown();
        await loadOrders();

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
});

// ---- Permanent delete customer (row is really removed from SQL Server) ----
async function permanentlyDeleteCustomer(id) {

    if (!confirm(
        'Are you sure you want to permanently delete this customer? ' +
        'The customer record will be removed from the database. ' +
        'This action cannot be undone.\n\n' +
        '(Customers who already have orders cannot be deleted.)'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.del(`/api/customers/${id}`);

        // Close the edit panel if it was showing the deleted customer.
        if (document.getElementById('editCustomerId').value === String(id)) {
            cancelEditCustomer();
        }

        showAlert('pageAlert', 'Customer permanently deleted.', 'success');

        await loadCustomersIntoDropdown();

    } catch (err) {

        showAlert(
            'pageAlert',
            'Could not permanently delete customer: ' + err.message,
            'error'
        );

        await loadCustomersIntoDropdown();
    }
}

// ---- Load inventory items ----
async function loadInventoryCache() {
    try {
        inventoryItemsCache = await api.get('/api/inventory');
    } catch (err) {
        // Sales Officer may not have direct inventory access.
        inventoryItemsCache = [];
    }
}

// ---- PBI-11: Create order ----
function addOrderItemRow() {
    orderItemRowCount++;

    const rowId = 'item_row_' + orderItemRowCount;

    const itemOptions = inventoryItemsCache.length
        ? inventoryItemsCache.map(i =>
            `<option value="${i.id}">
                ${escapeHtml(i.sku)} -
                ${escapeHtml(i.itemName)}
                (${i.quantity} in stock)
            </option>`
        ).join('')
        : '<option value="">No inventory items available</option>';

    const container = document.getElementById('orderItemsContainer');

    container.insertAdjacentHTML('beforeend', `
        <div class="form-grid"
             id="${rowId}"
             style="margin-bottom:8px; align-items:end;">

            <div>
                <label>Item</label>
                <select class="oi-item">
                    ${itemOptions}
                </select>
            </div>

            <div>
                <label>Quantity</label>
                <input
                    type="number"
                    class="oi-qty"
                    min="1"
                    value="1"
                    required
                >
            </div>

            <div>
                <label>Unit Price</label>
                <input
                    type="number"
                    class="oi-price"
                    min="0.01"
                    step="0.01"
                    required
                >
            </div>

            <div>
                <button
                    type="button"
                    class="danger"
                    onclick="document.getElementById('${rowId}').remove()">
                    Remove
                </button>
            </div>

        </div>
    `);
}

document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('pageAlert');

    const customerId = document.getElementById('o_customer').value;

    if (!customerId) {
        showAlert(
            'pageAlert',
            'Please register/select a customer first.',
            'error'
        );
        return;
    }

    const items = [];

    document
        .querySelectorAll('#orderItemsContainer > div')
        .forEach(row => {

            const inventoryItemId =
                row.querySelector('.oi-item').value;

            const quantity =
                parseInt(row.querySelector('.oi-qty').value, 10);

            const price =
                parseFloat(row.querySelector('.oi-price').value);

            if (inventoryItemId) {
                items.push({
                    inventoryItemId: parseInt(inventoryItemId, 10),
                    quantity,
                    price
                });
            }
        });

    if (items.length === 0) {
        showAlert(
            'pageAlert',
            'Add at least one order item.',
            'error'
        );
        return;
    }

    try {
        await api.post('/api/orders', {
            customerId: parseInt(customerId, 10),
            items
        });

        showAlert(
            'pageAlert',
            'Order created as DRAFT. Confirm it from the list below to generate an invoice.',
            'success'
        );

        document.getElementById('orderItemsContainer').innerHTML = '';

        addOrderItemRow();

        await loadOrders();

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
});

// ---- PBI-13: List / filter orders ----
async function loadOrders() {

    const status =
        document.getElementById('f_status').value;

    const url =
        '/api/orders' +
        (status ? `?status=${status}` : '');

    try {
        const orders = await api.get(url);

        renderOrders(orders);

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

function renderOrders(orders) {

    const tbody =
        document.getElementById('orderTableBody');

    if (!orders.length) {
        tbody.innerHTML =
            '<tr><td colspan="6" class="small-text">No orders found.</td></tr>';

        return;
    }

    tbody.innerHTML = orders.map(o => `
        <tr>

            <td>${o.id}</td>

            <td>
                ${escapeHtml(
        o.customer ? o.customer.name : ''
    )}
            </td>

            <td>
                ${new Date(o.orderDate).toLocaleDateString()}
            </td>

            <td>
                ${Number(o.totalAmount).toFixed(2)}
            </td>

            <td>
                <span class="badge ${o.status === 'DRAFT' ? 'low' : 'ok'}">
                    ${o.status}
                </span>
            </td>

            <td>
                ${renderOrderActions(o)}
            </td>

        </tr>
    `).join('');
}

function renderOrderActions(order) {

    const buttons = [
        `<button
            class="secondary"
            onclick="viewOrder(${order.id})">
            View
        </button>`
    ];

    if (order.status === 'DRAFT') {

        buttons.push(`
            <button
                class="primary"
                onclick="confirmOrder(${order.id})">
                Confirm
            </button>
        `);

        buttons.push(`
            <button
                class="danger"
                onclick="deleteOrder(${order.id})">
                Delete
            </button>
        `);

    } else if (order.status === 'CONFIRMED') {

        buttons.push(`
            <button
                class="secondary"
                onclick="updateStatus(${order.id}, 'SHIPPED')">
                Mark Shipped
            </button>
        `);

        buttons.push(`
            <button
                class="danger"
                onclick="updateStatus(${order.id}, 'CANCELLED')">
                Cancel
            </button>
        `);

    } else if (order.status === 'SHIPPED') {

        buttons.push(`
            <button
                class="secondary"
                onclick="updateStatus(${order.id}, 'DELIVERED')">
                Mark Delivered
            </button>
        `);
    }

    return buttons.join(' ');
}

// ---- PBI-12: Confirm order ----
async function confirmOrder(id) {

    if (!confirm(
        'Confirm this order? This will deduct stock and generate an invoice, and cannot be undone.'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.patch(`/api/orders/${id}/confirm`);

        showAlert(
            'pageAlert',
            'Order confirmed and invoice generated.',
            'success'
        );

        await loadOrders();

        // IMPORTANT:
        // Refresh the currently displayed order details too.
        await viewOrder(id);

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

// ---- PBI-14: Update order status lifecycle ----
async function updateStatus(id, status) {

    hideAlert('pageAlert');

    try {

        await api.patch(
            `/api/orders/${id}/status`,
            { status }
        );

        showAlert(
            'pageAlert',
            `Order status updated to ${status}.`,
            'success'
        );

        await loadOrders();

        // IMPORTANT FIX:
        // Reload the open order-detail panel so its status
        // matches the newly updated status.
        await viewOrder(id);

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

// ---- PBI-15: Delete draft order ----
async function deleteOrder(id) {

    if (!confirm(
        'Delete this draft order? This cannot be undone.'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.del(`/api/orders/${id}`);

        showAlert(
            'pageAlert',
            'Draft order deleted.',
            'success'
        );

        await loadOrders();

        // If the deleted order was currently being viewed,
        // close its detail panel.
        const detailId =
            document.getElementById('detailOrderId');

        if (detailId && detailId.textContent === String(id)) {
            closeOrderDetail();
        }

    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

// ---- Order detail + invoice view ----
async function viewOrder(id) {

    hideAlert('pageAlert');

    try {

        // Get the latest version of the order from backend.
        const order =
            await api.get(`/api/orders/${id}`);

        document.getElementById('detailOrderId').textContent =
            order.id;

        // ---- Order items ----
        let itemsHtml = order.items.map(i => `
            <tr>

                <td>
                    ${escapeHtml(i.inventoryItem.sku)}
                    -
                    ${escapeHtml(i.inventoryItem.itemName)}
                </td>

                <td>
                    ${i.quantity}
                </td>

                <td>
                    ${Number(i.price).toFixed(2)}
                </td>

                <td>
                    ${(i.quantity * i.price).toFixed(2)}
                </td>

            </tr>
        `).join('');

        // ---- Invoice ----
        let invoiceHtml =
            '<p class="small-text">' +
            'No invoice yet - confirm the order to generate one.' +
            '</p>';

        if (order.status !== 'DRAFT') {

            try {

                const invoice =
                    await api.get(
                        `/api/orders/${id}/invoice`
                    );

                invoiceHtml = `
                    <p>
                        <b>Invoice #${invoice.id}</b>
                        -
                        Amount:
                        ${Number(invoice.amount).toFixed(2)}
                        -
                        Date:
                        ${invoice.date}
                    </p>
                `;

            } catch (e) {

                invoiceHtml =
                    '<p class="small-text">' +
                    'Invoice not available.' +
                    '</p>';
            }
        }

        // ---- Order details ----
        document.getElementById('orderDetailBody').innerHTML = `

            <p>
                <b>Customer:</b>
                ${escapeHtml(order.customer.name)}
                (${escapeHtml(order.customer.contact)})
            </p>

            <p>
                <b>Address:</b>
                ${escapeHtml(order.customer.address)}
            </p>

            <p>
                <b>Status:</b>

                <span class="badge ${
            order.status === 'DRAFT'
                ? 'low'
                : 'ok'
        }">
                    ${order.status}
                </span>
            </p>

            <table>

                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>

                <tbody>
                    ${itemsHtml}
                </tbody>

            </table>

            <p style="text-align:right;">
                <b>
                    Total:
                    ${Number(order.totalAmount).toFixed(2)}
                </b>
            </p>

            <h4>Invoice</h4>

            ${invoiceHtml}
        `;

        document
            .getElementById('orderDetailPanel')
            .classList.remove('hidden');

        document
            .getElementById('orderDetailPanel')
            .scrollIntoView({
                behavior: 'smooth'
            });

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}

function closeOrderDetail() {

    document
        .getElementById('orderDetailPanel')
        .classList.add('hidden');
}

// ---- HTML escaping ----
function escapeHtml(str) {

    const div =
        document.createElement('div');

    div.textContent =
        str ?? '';

    return div.innerHTML;
}