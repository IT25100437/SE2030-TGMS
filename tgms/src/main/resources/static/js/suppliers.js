/**
 * Supplier Management page.
 * API endpoints and request/response formats are unchanged — this file only
 * adds validation, loading / empty / error states, toast notifications and
 * the permanent-delete confirmation modal.
 */

let currentSupplierId = null;
let suppliersCache = [];
let contractsCache = [];
let supplierRequestSeq = 0;

// ============================================================
// INITIALIZATION
// ============================================================

(async function init() {

    // initLayout() (inline in the HTML) handles the topbar/sidebar.
    const user = await requireLogin();
    if (!user) return;

    // Press Enter inside a search box to search.
    ['f_name', 'f_category'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); loadSuppliers(); }
        });
    });

    await loadSuppliers();

})();


// ============================================================
// VALIDATION RULES (client-side only — the backend still validates too)
// ============================================================

function supplierRules(prefix) {
    const ids = prefix === 'edit'
        ? { name: 'editSupplierName', contact: 'editSupplierContact', category: 'editSupplierCategory' }
        : { name: 's_name', contact: 's_contact', category: 's_category' };

    return [
        { el: ids.name,     key: 'name',     label: 'Supplier name',     required: true, maxLength: 150 },
        { el: ids.contact,  key: 'contact',  label: 'Contact (Phone Number)', required: true, type: 'phone',
          message: 'Please enter a valid 10-digit phone number (e.g. 0771234567).',
          custom: value => /^0\d{9}$/.test(value) ? null : 'Phone number must contain exactly 10 digits and start with 0.' },
        { el: ids.category, key: 'materialCategory', label: 'Material category', required: true, maxLength: 100 }
    ];
}


// ============================================================
// PBI-01: REGISTER SUPPLIER
// ============================================================

document.getElementById('supplierForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        const result = UI.validate(supplierRules('new'));
        if (!result.valid) return;

        const payload = {
            name: result.values.name,
            contact: result.values.contact,
            materialCategory: result.values.materialCategory
        };

        const btn = document.getElementById('supplierSubmitBtn');

        await UI.guard(btn, 'Registering…', async () => {
            try {
                await api.post('/api/suppliers', payload);

                UI.success('Supplier registered successfully.');
                resetSupplierForm();
                await loadSuppliers();

            } catch (err) {
                UI.error(err.message);
            }
        });

    });

function resetSupplierForm() {
    document.getElementById('supplierForm').reset();
    UI.clearErrors('supplierForm');
}

function focusRegisterSupplier() {
    const card = document.getElementById('registerSupplierCard');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('s_name').focus({ preventScroll: true }), 350);
}


// ============================================================
// EDIT SUPPLIER DETAILS
// ============================================================

async function editSupplier(id, btn) {

    await UI.guard(btn, 'Loading…', async () => {

        try {

            const supplier =
                await api.get(`/api/suppliers/${id}`);

            UI.clearErrors('editSupplierForm');

            document.getElementById('editSupplierId').value = supplier.id;
            document.getElementById('editSupplierName').value = supplier.name;
            document.getElementById('editSupplierContact').value = supplier.contact;
            document.getElementById('editSupplierCategory').value = supplier.materialCategory;
            document.getElementById('editSupplierTitle').textContent = supplier.name;

            const panel = document.getElementById('editSupplierPanel');
            panel.classList.remove('hidden');
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            UI.error('Unable to load supplier details. ' + err.message);
        }

    });

}


// ============================================================
// UPDATE SUPPLIER DETAILS
// ============================================================

document.getElementById('editSupplierForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        const result = UI.validate(supplierRules('edit'));
        if (!result.valid) return;

        const id = document.getElementById('editSupplierId').value;

        const payload = {
            name: result.values.name,
            contact: result.values.contact,
            materialCategory: result.values.materialCategory
        };

        const btn = e.submitter || document.querySelector('#editSupplierForm [type="submit"]');

        await UI.guard(btn, 'Updating…', async () => {
            try {
                await api.put(`/api/suppliers/${id}`, payload);

                UI.success('Supplier updated successfully.');
                cancelEditSupplier();
                await loadSuppliers();

            } catch (err) {
                UI.error(err.message);
            }
        });

    });


// ============================================================
// CANCEL SUPPLIER EDIT
// ============================================================

function cancelEditSupplier() {

    document.getElementById('editSupplierPanel').classList.add('hidden');
    document.getElementById('editSupplierForm').reset();
    UI.clearErrors('editSupplierForm');
    document.getElementById('editSupplierId').value = '';
    document.getElementById('editSupplierTitle').textContent = '';

}


// ============================================================
// PBI-03: SEARCH & FILTER
// ============================================================

function currentSupplierFilters() {
    return {
        name: document.getElementById('f_name').value.trim(),
        category: document.getElementById('f_category').value.trim()
    };
}

async function loadSuppliers() {

    const { name, category } = currentSupplierFilters();

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

    const tbody = document.getElementById('supplierTableBody');
    tbody.innerHTML = UI.loadingRow(6, 'Loading suppliers…');

    const requestId = ++supplierRequestSeq;

    try {

        const suppliers = await api.get(url);

        // Ignore out-of-date responses if the user searched again meanwhile.
        if (requestId !== supplierRequestSeq) return;

        suppliersCache = suppliers;
        renderSuppliers(suppliers);

    } catch (err) {

        if (requestId !== supplierRequestSeq) return;

        tbody.innerHTML = UI.errorRow(6, 'Unable to load suppliers.', 'loadSuppliers()', 'Try Again', err.message);

    }

}


function clearFilters() {

    document.getElementById('f_name').value = '';
    document.getElementById('f_category').value = '';

    loadSuppliers();

}


// ============================================================
// PBI-04: DEACTIVATE SUPPLIER
// ============================================================

async function deactivateSupplier(id) {

    const supplier = suppliersCache.find(s => s.id === id);

    await UI.confirm({
        title: 'Deactivate Supplier?',
        message: 'The supplier will be marked inactive and hidden from active operations. Its history is kept.',
        details: supplier ? [
            { text: supplier.name, main: true },
            { text: supplier.materialCategory },
            { text: supplier.contact, muted: true }
        ] : null,
        variant: 'warn',
        icon: 'fa-ban',
        confirmText: 'Deactivate',
        busyText: 'Deactivating…',
        onConfirm: async () => {

            await api.patch(`/api/suppliers/${id}/deactivate`);

            UI.success('Supplier deactivated successfully.');
            await loadSuppliers();

        }
    });

}


// ============================================================
// PERMANENT DELETE SUPPLIER
// (separate from PBI-04 deactivate - the row is really removed)
// ============================================================

async function permanentlyDeleteSupplier(id) {

    const supplier = suppliersCache.find(s => s.id === id);

    const details = supplier
        ? [
            { text: supplier.name, main: true },
            { text: supplier.materialCategory },
            { text: supplier.contact },
            { text: 'All contracts for this supplier will be removed as well.', muted: true }
        ]
        : [{ text: 'Supplier #' + id, main: true }];

    await UI.confirm({
        title: 'Permanently Delete Supplier?',
        message: 'You are about to permanently delete:',
        details,
        warning: 'This action cannot be undone. To keep the record, use Deactivate instead.',
        variant: 'danger',
        icon: 'fa-trash-alt',
        confirmText: 'Delete Permanently',
        busyText: 'Deleting…',
        onConfirm: async () => {

            try {

                await api.del(`/api/suppliers/${id}/permanent`);

            } catch (err) {

                // Show the reason and refresh, exactly like before.
                UI.error('Could not permanently delete supplier: ' + err.message);
                await loadSuppliers();
                return;
            }

            // Close any panel that was showing the deleted supplier.
            if (currentSupplierId === id) {
                closeContractPanel();
            }

            if (document.getElementById('editSupplierId').value === String(id)) {
                cancelEditSupplier();
            }

            UI.success('Supplier permanently deleted successfully.');
            await loadSuppliers();

        }
    });

}


// ============================================================
// PBI-05: EXPORT SUPPLIER LIST
// ============================================================

function exportSuppliers(btn) {

    // Browser handles the CSV download.
    UI.setBusy(btn, true, 'Preparing…');
    setTimeout(() => UI.setBusy(btn, false), 2000);

    window.location.href =
        '/api/suppliers/export';

}


// ============================================================
// RENDER SUPPLIER TABLE
// ============================================================

function renderSuppliers(suppliers) {

    const tbody = document.getElementById('supplierTableBody');

    if (!suppliers.length) {

        const { name, category } = currentSupplierFilters();

        tbody.innerHTML = (name || category)
            ? UI.emptyRow(6, {
                icon: 'fa-search',
                title: 'No suppliers found',
                text: 'Try changing your search criteria.',
                actionLabel: 'Clear Search',
                actionIcon: 'fa-times',
                actionOnclick: 'clearFilters()'
            })
            : UI.emptyRow(6, {
                icon: 'fa-truck',
                title: 'No suppliers yet',
                text: 'Register your first supplier using the form above.',
                actionLabel: 'Register Supplier',
                actionIcon: 'fa-plus',
                actionOnclick: 'focusRegisterSupplier()'
            });

        return;
    }

    tbody.innerHTML = suppliers.map(s => {

        const deactivateButton =
            s.status === 'ACTIVE'
                ? `<button class="btn btn-warning" onclick="deactivateSupplier(${s.id})">
                        <i class="fas fa-ban" aria-hidden="true"></i> Deactivate
                   </button>`
                : '';

        return `
            <tr>
                <td class="col-id">${s.id}</td>
                <td class="col-strong">${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.contact)}</td>
                <td>${escapeHtml(s.materialCategory)}</td>
                <td>${UI.statusBadge(s.status)}</td>
                <td class="col-actions">
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="editSupplier(${s.id}, this)">
                            <i class="fas fa-edit" aria-hidden="true"></i> Edit
                        </button>
                        <button class="btn btn-secondary" onclick="openContractPanel(${s.id})">
                            <i class="fas fa-file-contract" aria-hidden="true"></i> Manage Contracts
                        </button>
                        ${deactivateButton}
                        <button class="btn btn-danger-solid" onclick="permanentlyDeleteSupplier(${s.id})">
                            <i class="fas fa-trash-alt" aria-hidden="true"></i> Permanent Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;

    }).join('');

}


// ============================================================
// PBI-02: CONTRACT MANAGEMENT
// ============================================================

async function openContractPanel(supplierId) {

    const supplier = suppliersCache.find(s => s.id === supplierId);

    currentSupplierId = supplierId;

    document.getElementById('contractSupplierName').textContent =
        supplier ? supplier.name : 'Supplier #' + supplierId;

    document.getElementById('contractPanel').classList.remove('hidden');

    resetContractForm();

    document.getElementById('contractPanel').scrollIntoView({ behavior: 'smooth' });

    await loadContracts();

}


function closeContractPanel() {

    currentSupplierId = null;

    document.getElementById('contractPanel').classList.add('hidden');

}


// ============================================================
// LOAD CONTRACTS
// ============================================================

async function loadContracts() {

    const tbody = document.getElementById('contractTableBody');
    const supplierId = currentSupplierId;

    tbody.innerHTML = UI.loadingRow(5, 'Loading contracts…');

    try {

        const contracts =
            await api.get(
                `/api/suppliers/${supplierId}/contracts`
            );

        if (supplierId !== currentSupplierId) return;

        contractsCache = contracts;

        if (!contracts.length) {

            tbody.innerHTML = UI.emptyRow(5, {
                icon: 'fa-file-contract',
                title: 'No contracts yet',
                text: 'Use the form below to add the first contract for this supplier.',
                compact: true
            });

            return;
        }

        tbody.innerHTML =
            contracts.map(c => `
                <tr>
                    <td class="col-id">${c.id}</td>
                    <td class="col-wrap">${escapeHtml(c.terms)}</td>
                    <td class="nowrap">${escapeHtml(c.startDate)}</td>
                    <td class="nowrap">${escapeHtml(c.endDate)}</td>
                    <td class="col-actions">
                        <div class="table-actions">
                            <button class="btn btn-secondary" onclick="editContract(${c.id})">
                                <i class="fas fa-edit" aria-hidden="true"></i> Edit
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

    } catch (err) {

        if (supplierId !== currentSupplierId) return;

        tbody.innerHTML = UI.errorRow(5, 'Unable to load contracts.', 'loadContracts()', 'Try Again', err.message);

    }

}


// ============================================================
// EDIT CONTRACT
// ============================================================

function editContract(contractId) {

    const contract = contractsCache.find(c => c.id === contractId);

    if (!contract) return;

    UI.clearErrors('contractForm');

    document.getElementById('c_contractId').value = contract.id;
    document.getElementById('c_terms').value = contract.terms;
    document.getElementById('c_start').value = contract.startDate;
    document.getElementById('c_end').value = contract.endDate;

    document.getElementById('contractFormTitle').textContent =
        'Update Contract #' + contract.id;

    document.getElementById('contractSubmitLabel').textContent =
        'Update Contract';

    document.getElementById('contractCancelEditBtn').classList.remove('hidden');

    document.getElementById('contractForm').scrollIntoView({ behavior: 'smooth', block: 'center' });

}


// ============================================================
// RESET CONTRACT FORM
// ============================================================

function resetContractForm() {

    document.getElementById('contractForm').reset();
    UI.clearErrors('contractForm');

    document.getElementById('c_contractId').value = '';

    document.getElementById('contractFormTitle').textContent =
        'Add Contract';

    document.getElementById('contractSubmitLabel').textContent =
        'Add Contract';

    document.getElementById('contractCancelEditBtn').classList.add('hidden');

}


// ============================================================
// ADD / UPDATE CONTRACT
// ============================================================

document.getElementById('contractForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();

        const result = UI.validate([
            { el: 'c_terms', key: 'terms', label: 'Contract terms', required: true, maxLength: 1000 },
            { el: 'c_start', key: 'startDate', label: 'Start date', required: true, type: 'date' },
            { el: 'c_end',   key: 'endDate',   label: 'End date',   required: true, type: 'date',
              notBefore: 'c_start', notBeforeMessage: 'End date cannot be before the start date.' }
        ]);

        if (!result.valid) return;

        const contractId = document.getElementById('c_contractId').value;

        const payload = {
            terms: result.values.terms,
            startDate: result.values.startDate,
            endDate: result.values.endDate
        };

        const btn = document.getElementById('contractSubmitBtn');

        let saved = false;

        await UI.guard(btn, contractId ? 'Updating…' : 'Adding…', async () => {
            try {

                if (contractId) {

                    await api.put(
                        `/api/contracts/${contractId}`,
                        payload
                    );

                    UI.success('Contract updated successfully.');

                } else {

                    await api.post(
                        `/api/suppliers/${currentSupplierId}/contracts`,
                        payload
                    );

                    UI.success('Contract added successfully.');

                }

                saved = true;

            } catch (err) {
                UI.error(err.message);
            }
        });

        // Reset after the button is back to normal so its label is restored correctly.
        if (saved) {
            resetContractForm();
            await loadContracts();
        }

    });
