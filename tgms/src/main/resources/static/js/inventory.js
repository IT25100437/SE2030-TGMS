let currentItemId = null;

(async function init() {
    const user = await requireLogin();
    if (!user) return;

    await loadItems();
    await checkLowStockBanner();
})();


// =====================================================
// ADD ITEM
// =====================================================

document.getElementById('itemForm').addEventListener('submit', async (e) => {

    e.preventDefault();
    hideAlert('pageAlert');

    const payload = {
        sku: document.getElementById('i_sku').value.trim(),
        itemName: document.getElementById('i_name').value.trim(),
        type: document.getElementById('i_type').value,
        location: document.getElementById('i_location').value.trim(),
        quantity: parseInt(
            document.getElementById('i_quantity').value,
            10
        ),
        threshold: parseInt(
            document.getElementById('i_threshold').value,
            10
        )
    };

    try {

        await api.post('/api/inventory', payload);

        showAlert(
            'pageAlert',
            'Inventory item added.',
            'success'
        );

        document.getElementById('itemForm').reset();

        document.getElementById('i_quantity').value = 0;
        document.getElementById('i_threshold').value = 10;

        await loadItems();
        await checkLowStockBanner();

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
});


// =====================================================
// EXTRA FEATURE: EDIT ITEM
// =====================================================

async function editItem(id) {

    hideAlert('pageAlert');

    try {

        const item = await api.get(
            `/api/inventory/${id}`
        );

        document.getElementById('editItemId').value =
            item.id;

        document.getElementById('editItemSku').value =
            item.sku;

        document.getElementById('editItemName').value =
            item.itemName;

        document.getElementById('editItemType').value =
            item.type;

        document.getElementById('editItemLocation').value =
            item.location;

        document.getElementById('editItemThreshold').value =
            item.threshold;

        document.getElementById('editItemTitle').textContent =
            item.sku;

        document.getElementById('editItemPanel')
            .classList.remove('hidden');

        document.getElementById('editItemPanel')
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


document.getElementById('editItemForm')
    .addEventListener('submit', async (e) => {

        e.preventDefault();
        hideAlert('pageAlert');

        const id =
            document.getElementById('editItemId').value;

        const payload = {

            itemName:
                document.getElementById('editItemName')
                    .value.trim(),

            type:
            document.getElementById('editItemType')
                .value,

            location:
                document.getElementById('editItemLocation')
                    .value.trim(),

            threshold:
                parseInt(
                    document.getElementById('editItemThreshold')
                        .value,
                    10
                )
        };

        try {

            await api.put(
                `/api/inventory/${id}`,
                payload
            );

            showAlert(
                'pageAlert',
                'Inventory item updated.',
                'success'
            );

            cancelEditItem();

            await loadItems();
            await checkLowStockBanner();

        } catch (err) {

            showAlert(
                'pageAlert',
                err.message,
                'error'
            );
        }
    });


function cancelEditItem() {

    document.getElementById('editItemPanel')
        .classList.add('hidden');

    document.getElementById('editItemForm')
        .reset();
}


// =====================================================
// PBI-08: SEARCH & FILTER
// =====================================================

async function loadItems() {

    const keyword =
        document.getElementById('f_keyword')
            .value.trim();

    const type =
        document.getElementById('f_type')
            .value;

    const params =
        new URLSearchParams();

    if (keyword) {
        params.set('keyword', keyword);
    }

    if (type) {
        params.set('type', type);
    }

    const url =
        '/api/inventory' +
        (params.toString()
            ? '?' + params.toString()
            : '');

    try {

        const items =
            await api.get(url);

        renderItems(items);

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


function clearFilters() {

    document.getElementById('f_keyword')
        .value = '';

    document.getElementById('f_type')
        .value = '';

    loadItems();
}


// =====================================================
// PBI-07: LOW-STOCK ALERT
// =====================================================

async function checkLowStockBanner() {

    try {

        const lowStock =
            await api.get(
                '/api/inventory/low-stock'
            );

        const banner =
            document.getElementById(
                'lowStockBanner'
            );

        if (lowStock.length > 0) {

            banner.textContent =
                `Low-stock alert: ${lowStock.length} item(s) ` +
                `at or below their reorder threshold - ` +
                `${lowStock.map(i => i.sku).join(', ')}`;

            banner.classList.remove('hidden');

        } else {

            banner.classList.add('hidden');
        }

    } catch (err) {

        // Low-stock banner is non-critical.
    }
}


async function loadLowStock() {

    try {

        const items =
            await api.get(
                '/api/inventory/low-stock'
            );

        renderItems(items);

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


// =====================================================
// PBI-10: EXPORT STOCK REPORT
// =====================================================

function exportStockReport() {

    // Browser handles the CSV download.
    window.location.href =
        '/api/inventory/export';
}


// =====================================================
// RENDER INVENTORY TABLE
// =====================================================

function renderItems(items) {

    const tbody =
        document.getElementById(
            'itemTableBody'
        );

    if (!items.length) {

        tbody.innerHTML =
            '<tr>' +
            '<td colspan="8" class="small-text">' +
            'No inventory items found.' +
            '</td>' +
            '</tr>';

        return;
    }

    tbody.innerHTML =
        items.map(i => `

        <tr>

            <td>
                ${escapeHtml(i.sku)}
            </td>

            <td>
                ${escapeHtml(i.itemName)}
            </td>

            <td>
                ${
            i.type === 'RAW_MATERIAL'
                ? 'Raw Material'
                : 'Finished Good'
        }
            </td>

            <td>
                ${i.quantity}
            </td>

            <td>
                ${i.threshold}
            </td>

            <td>
                ${escapeHtml(i.location)}
            </td>

            <td>

                <span class="badge ${
            i.quantity <= i.threshold
                ? 'low'
                : 'ok'
        }">

                    ${
            i.quantity <= i.threshold
                ? 'LOW'
                : 'OK'
        }

                </span>

            </td>

            <td>

                <button
                        class="secondary"
                        onclick="editItem(${i.id})">
                    Edit
                </button>

                <button
                        class="secondary"
                        onclick="openMovementPanel(
                            ${i.id},
                            '${escapeHtml(i.itemName)
            .replace(/'/g, "\\'")}'
                        )">
                    Stock In/Out
                </button>

                <button
                        class="danger"
                        onclick="removeItem(${i.id})">
                    Remove
                </button>

                <button
                        class="danger"
                        onclick="permanentlyDeleteItem(${i.id})">
                    Permanent Delete
                </button>

            </td>

        </tr>

    `).join('');
}


// =====================================================
// PBI-09: SOFT DELETE
// =====================================================

async function removeItem(id) {

    if (!confirm(
        'Remove this item? It will be hidden from active inventory but kept for audit history.'
    )) {
        return;
    }

    try {

        await api.del(
            `/api/inventory/${id}`
        );

        showAlert(
            'pageAlert',
            'Item removed.',
            'success'
        );

        await loadItems();
        await checkLowStockBanner();

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
}


// =====================================================
// PERMANENT DELETE (separate from the soft delete above)
// =====================================================

async function permanentlyDeleteItem(id) {

    if (!confirm(
        'Are you sure you want to permanently delete this inventory item? ' +
        'The item and its stock movement history will be removed from the ' +
        'database. This action cannot be undone.\n\n' +
        '(To keep the record, use Remove instead.)'
    )) {
        return;
    }

    hideAlert('pageAlert');

    try {

        await api.del(
            `/api/inventory/${id}/permanent`
        );

        // Close any panel that was showing the deleted item.
        if (currentItemId === id) {
            closeMovementPanel();
        }

        if (document.getElementById('editItemId').value === String(id)) {
            cancelEditItem();
        }

        showAlert(
            'pageAlert',
            'Inventory item permanently deleted.',
            'success'
        );

        await loadItems();
        await checkLowStockBanner();

    } catch (err) {

        showAlert(
            'pageAlert',
            'Could not permanently delete item: ' + err.message,
            'error'
        );

        await loadItems();
    }
}


// =====================================================
// PBI-06: STOCK MOVEMENTS
// =====================================================

async function openMovementPanel(
    itemId,
    itemName
) {

    currentItemId = itemId;

    document.getElementById(
        'm_itemId'
    ).value = itemId;

    document.getElementById(
        'movementItemName'
    ).textContent = itemName;

    document.getElementById(
        'movementPanel'
    ).classList.remove('hidden');

    await loadMovementHistory();

    document.getElementById(
        'movementPanel'
    ).scrollIntoView({
        behavior: 'smooth'
    });
}


function closeMovementPanel() {

    currentItemId = null;

    document.getElementById(
        'movementPanel'
    ).classList.add('hidden');
}


async function loadMovementHistory() {

    try {

        const movements =
            await api.get(
                `/api/inventory/${currentItemId}/movements`
            );

        const tbody =
            document.getElementById(
                'movementTableBody'
            );

        if (!movements.length) {

            tbody.innerHTML =
                '<tr>' +
                '<td colspan="4" class="small-text">' +
                'No movements recorded yet.' +
                '</td>' +
                '</tr>';

            return;
        }

        tbody.innerHTML =
            movements.map(m => `

            <tr>

                <td>
                    ${new Date(
                m.timestamp
            ).toLocaleString()}
                </td>

                <td>
                    ${
                m.direction === 'IN'
                    ? 'Stock In'
                    : 'Stock Out'
            }
                </td>

                <td>
                    ${m.quantity}
                </td>

                <td>
                    ${escapeHtml(m.note || '')}
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


document.getElementById(
    'movementForm'
).addEventListener('submit', async (e) => {

    e.preventDefault();
    hideAlert('pageAlert');

    const payload = {

        direction:
        document.getElementById(
            'm_direction'
        ).value,

        quantity:
            parseInt(
                document.getElementById(
                    'm_quantity'
                ).value,
                10
            ),

        note:
            document.getElementById(
                'm_note'
            ).value.trim()
    };

    try {

        await api.post(
            `/api/inventory/${currentItemId}/movements`,
            payload
        );

        showAlert(
            'pageAlert',
            'Stock movement recorded.',
            'success'
        );

        document.getElementById(
            'movementForm'
        ).reset();

        await loadMovementHistory();
        await loadItems();
        await checkLowStockBanner();

    } catch (err) {

        showAlert(
            'pageAlert',
            err.message,
            'error'
        );
    }
});


// =====================================================
// HTML ESCAPING
// =====================================================

function escapeHtml(str) {

    const div =
        document.createElement('div');

    div.textContent =
        str ?? '';

    return div.innerHTML;
}