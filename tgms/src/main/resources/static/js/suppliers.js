let currentSupplierId = null;


// ============================================================
// INITIALIZATION
// ============================================================

(async function init() {

    // initLayout() handles requireLogin + topbar/sidebar population.
    // It is called from the inline script block in the HTML before this file loads.
    // We still need to load the module data.
    const user = await requireLogin();
    if (!user) return;

    await loadSuppliers();

})();


// ============================================================
// PBI-01: REGISTER SUPPLIER
// ============================================================

document.getElementById('supplierForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        hideAlert('pageAlert');

        const payload = {

            name: document
                .getElementById('s_name')
                .value
                .trim(),

            contact: document
                .getElementById('s_contact')
                .value
                .trim(),

            materialCategory: document
                .getElementById('s_category')
                .value
                .trim()

        };

        try {

            await api.post('/api/suppliers', payload);

            showAlert(
                'pageAlert',
                'Supplier registered successfully.',
                'success'
            );

            document
                .getElementById('supplierForm')
                .reset();

            await loadSuppliers();

        } catch (err) {

            showAlert(
                'pageAlert',
                err.message,
                'error'
            );

        }

    });


// ============================================================
// NEW: EDIT SUPPLIER DETAILS
// ============================================================

async function editSupplier(id) {

    hideAlert('pageAlert');

    try {

        const supplier =
            await api.get(`/api/suppliers/${id}`);

        // Store supplier ID
        document
            .getElementById('editSupplierId')
            .value = supplier.id;

        // Fill existing supplier information
        document
            .getElementById('editSupplierName')
            .value = supplier.name;

        document
            .getElementById('editSupplierContact')
            .value = supplier.contact;

        document
            .getElementById('editSupplierCategory')
            .value = supplier.materialCategory;

        document
            .getElementById('editSupplierTitle')
            .textContent = supplier.name;

        // Show edit panel
        document
            .getElementById('editSupplierPanel')
            .classList.remove('hidden');

        // Scroll to edit form
        document
            .getElementById('editSupplierPanel')
            .scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );

    }

}


// ============================================================
// UPDATE SUPPLIER DETAILS
// ============================================================

document.getElementById('editSupplierForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        hideAlert('pageAlert');

        const id =
            document
                .getElementById('editSupplierId')
                .value;

        const payload = {

            name: document
                .getElementById('editSupplierName')
                .value
                .trim(),

            contact: document
                .getElementById('editSupplierContact')
                .value
                .trim(),

            materialCategory: document
                .getElementById('editSupplierCategory')
                .value
                .trim()

        };

        try {

            await api.put(
                `/api/suppliers/${id}`,
                payload
            );

            showAlert(
                'pageAlert',
                'Supplier details updated successfully.',
                'success'
            );

            cancelEditSupplier();

            await loadSuppliers();

        } catch (err) {

            showAlert(
                'pageAlert',
                err.message,
                'error'
            );

        }

    });


// ============================================================
// CANCEL SUPPLIER EDIT
// ============================================================

function cancelEditSupplier() {

    document
        .getElementById('editSupplierPanel')
        .classList.add('hidden');

    document
        .getElementById('editSupplierForm')
        .reset();

    document
        .getElementById('editSupplierId')
        .value = '';

    document
        .getElementById('editSupplierTitle')
        .textContent = '';

}


// ============================================================
// PBI-03: SEARCH & FILTER
// ============================================================

async function loadSuppliers() {

    const name =
        document
            .getElementById('f_name')
            .value
            .trim();

    const category =
        document
            .getElementById('f_category')
            .value
            .trim();

    const params = new URLSearchParams();

    if (name) {
        params.set('name', name);
    }

    if (category) {
        params.set('category', category);
    }

    const url =
        '/api/suppliers' +
        (params.toString()
            ? '?' + params.toString()
            : '');

    try {

        const suppliers =
            await api.get(url);

        renderSuppliers(suppliers);

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );

    }

}


function clearFilters() {

    document
        .getElementById('f_name')
        .value = '';

    document
        .getElementById('f_category')
        .value = '';

    loadSuppliers();

}


// ============================================================
// PBI-04: DEACTIVATE SUPPLIER
// ============================================================

async function deactivateSupplier(id) {

    if (!confirm(
        'Deactivate this supplier? ' +
        'It will be hidden from active operations ' +
        'but its history is kept.'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.patch(
            `/api/suppliers/${id}/deactivate`
        );

        showAlert(
            'pageAlert',
            'Supplier deactivated.',
            'success'
        );

        await loadSuppliers();

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );

    }

}


// ============================================================
// PERMANENT DELETE SUPPLIER
// (separate from PBI-04 deactivate - the row is really removed)
// ============================================================

async function permanentlyDeleteSupplier(id) {

    if (!confirm(
        'Are you sure you want to permanently delete this supplier? ' +
        'The supplier and all of its contracts will be removed from the ' +
        'database. This action cannot be undone.\n\n' +
        '(To keep the record, use Deactivate instead.)'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.del(
            `/api/suppliers/${id}/permanent`
        );

        // Close any panel that was showing the deleted supplier.
        if (currentSupplierId === id) {
            closeContractPanel();
        }

        if (document.getElementById('editSupplierId').value === String(id)) {
            cancelEditSupplier();
        }

        showAlert(
            'pageAlert',
            'Supplier permanently deleted.',
            'success'
        );

        await loadSuppliers();

    } catch (err) {

        showAlert(
            'pageAlert',
            'Could not permanently delete supplier: ' + err.message,
            'error'
        );

        await loadSuppliers();

    }

}


// ============================================================
// PBI-05: EXPORT SUPPLIER LIST
// ============================================================

function exportSuppliers() {

    // Browser handles the CSV download.
    window.location.href =
        '/api/suppliers/export';

}


// ============================================================
// RENDER SUPPLIER TABLE
// ============================================================

function renderSuppliers(suppliers) {

    const tbody =
        document.getElementById(
            'supplierTableBody'
        );

    if (!suppliers.length) {

        tbody.innerHTML =
            '<tr>' +
            '<td colspan="6" class="small-text">' +
            'No suppliers found.' +
            '</td>' +
            '</tr>';

        return;
    }

    tbody.innerHTML =
        suppliers.map(s => {

            const supplierName =
                escapeHtml(s.name);

            const supplierContact =
                escapeHtml(s.contact);

            const materialCategory =
                escapeHtml(s.materialCategory);

            const statusClass =
                s.status === 'ACTIVE'
                    ? 'ok'
                    : 'low';

            const deactivateButton =
                s.status === 'ACTIVE'
                    ? `
                        <button
                            class="danger"
                            onclick="deactivateSupplier(${s.id})">
                            Deactivate
                        </button>
                      `
                    : '';

            const permanentDeleteButton = `
                        <button
                            class="danger"
                            onclick="permanentlyDeleteSupplier(${s.id})">
                            Permanent Delete
                        </button>
                      `;

            return `
                <tr>

                    <td>${s.id}</td>

                    <td>${supplierName}</td>

                    <td>${supplierContact}</td>

                    <td>${materialCategory}</td>

                    <td>
                        <span class="badge ${statusClass}">
                            ${s.status}
                        </span>
                    </td>

                    <td>

                        <button
                            class="secondary"
                            onclick="editSupplier(${s.id})">
                            Edit
                        </button>

                        <button
                            class="secondary"
                            onclick="openContractPanel(
                                ${s.id},
                                '${supplierName.replace(
                /'/g,
                "\\'"
            )}'
                            )">
                            Manage Contracts
                        </button>

                        ${deactivateButton}

                        ${permanentDeleteButton}

                    </td>

                </tr>
            `;

        }).join('');

}


// ============================================================
// PBI-02: CONTRACT MANAGEMENT
// ============================================================

async function openContractPanel(
    supplierId,
    supplierName
) {

    currentSupplierId = supplierId;

    document
        .getElementById('contractSupplierName')
        .textContent = supplierName;

    document
        .getElementById('contractPanel')
        .classList.remove('hidden');

    resetContractForm();

    await loadContracts();

    document
        .getElementById('contractPanel')
        .scrollIntoView({
            behavior: 'smooth'
        });

}


function closeContractPanel() {

    currentSupplierId = null;

    document
        .getElementById('contractPanel')
        .classList.add('hidden');

}


// ============================================================
// LOAD CONTRACTS
// ============================================================

async function loadContracts() {

    try {

        const contracts =
            await api.get(
                `/api/suppliers/${currentSupplierId}/contracts`
            );

        const tbody =
            document.getElementById(
                'contractTableBody'
            );

        if (!contracts.length) {

            tbody.innerHTML =
                '<tr>' +
                '<td colspan="5" class="small-text">' +
                'No contracts yet.' +
                '</td>' +
                '</tr>';

            return;
        }

        tbody.innerHTML =
            contracts.map(c => `

                <tr>

                    <td>${c.id}</td>

                    <td>
                        ${escapeHtml(c.terms)}
                    </td>

                    <td>
                        ${c.startDate}
                    </td>

                    <td>
                        ${c.endDate}
                    </td>

                    <td>

                        <button
                            class="link-btn"
                            onclick='editContract(
                                ${JSON.stringify(c)}
                            )'>
                            Edit
                        </button>

                    </td>

                </tr>

            `).join('');

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );

    }

}


// ============================================================
// EDIT CONTRACT
// ============================================================

function editContract(contract) {

    document
        .getElementById('c_contractId')
        .value = contract.id;

    document
        .getElementById('c_terms')
        .value = contract.terms;

    document
        .getElementById('c_start')
        .value = contract.startDate;

    document
        .getElementById('c_end')
        .value = contract.endDate;

    document
        .getElementById('contractFormTitle')
        .textContent =
        'Update Contract #' +
        contract.id;

    document
        .getElementById('contractSubmitBtn')
        .textContent =
        'Update Contract';

    document
        .getElementById('contractCancelEditBtn')
        .classList.remove('hidden');

}


// ============================================================
// RESET CONTRACT FORM
// ============================================================

function resetContractForm() {

    document
        .getElementById('contractForm')
        .reset();

    document
        .getElementById('c_contractId')
        .value = '';

    document
        .getElementById('contractFormTitle')
        .textContent =
        'Add Contract';

    document
        .getElementById('contractSubmitBtn')
        .textContent =
        'Add Contract';

    document
        .getElementById('contractCancelEditBtn')
        .classList.add('hidden');

}


// ============================================================
// ADD / UPDATE CONTRACT
// ============================================================

document.getElementById('contractForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        hideAlert('pageAlert');

        const contractId =
            document
                .getElementById('c_contractId')
                .value;

        const payload = {

            terms:
                document
                    .getElementById('c_terms')
                    .value
                    .trim(),

            startDate:
            document
                .getElementById('c_start')
                .value,

            endDate:
            document
                .getElementById('c_end')
                .value

        };

        try {

            if (contractId) {

                await api.put(
                    `/api/contracts/${contractId}`,
                    payload
                );

                showAlert(
                    'pageAlert',
                    'Contract updated.',
                    'success'
                );

            } else {

                await api.post(
                    `/api/suppliers/${currentSupplierId}/contracts`,
                    payload
                );

                showAlert(
                    'pageAlert',
                    'Contract added.',
                    'success'
                );

            }

            resetContractForm();

            await loadContracts();

        } catch (err) {

            showAlert(
                'pageAlert',
                err.message,
                'error'
            );

        }

    });


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(str) {

    const div =
        document.createElement('div');

    div.textContent = str ?? '';

    return div.innerHTML;

}