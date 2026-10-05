const STAGE_SEQUENCE = ['PENDING', 'CUTTING', 'SEWING', 'QC', 'PACKING', 'COMPLETED'];

(async function init() {
    const user = await requireLogin();
    if (!user) return;

    document.getElementById('output_date').valueAsDate = new Date();

    await loadConfirmedOrdersIntoDropdown();
    await loadWorkOrders();
    await checkBottleneckBanner();
})();

// ---- PBI-16/17: create work order ----
async function loadConfirmedOrdersIntoDropdown() {
    try {
        const orders = await api.get('/api/orders?status=CONFIRMED');
        const select = document.getElementById('wo_order');
        select.innerHTML = orders.length
            ? orders.map(o => `<option value="${o.id}">Order #${o.id} - ${escapeHtml(o.customer.name)} (total: ${Number(o.totalAmount).toFixed(2)})</option>`).join('')
            : '<option value="">No confirmed orders available yet</option>';
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

document.getElementById('workOrderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('pageAlert');

    const orderId = document.getElementById('wo_order').value;
    if (!orderId) {
        showAlert('pageAlert', 'No confirmed order selected.', 'error');
        return;
    }

    const payload = {
        orderId: parseInt(orderId, 10),
        assignedLine: document.getElementById('wo_line').value.trim()
    };

    try {
        await api.post('/api/production/work-orders', payload);
        showAlert('pageAlert', 'Work order created.', 'success');
        document.getElementById('wo_line').value = '';
        await loadConfirmedOrdersIntoDropdown();
        await loadWorkOrders();
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
});

// ---- Work order list ----
async function loadWorkOrders() {
    try {
        const workOrders = await api.get('/api/production/work-orders');
        renderWorkOrders(workOrders);
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

function renderVisualStages(currentStatus) {
    if (currentStatus === 'CANCELLED') return '<span class="badge low">CANCELLED</span>';
    
    // Discard PENDING since they only asked for CUTTING, SEWING, QC, PACKING, COMPLETED
    const displayStages = ['CUTTING', 'SEWING', 'QC', 'PACKING', 'COMPLETED'];
    const curIdx = STAGE_SEQUENCE.indexOf(currentStatus);
    
    return displayStages.map(s => {
        const stageIdx = STAGE_SEQUENCE.indexOf(s);
        let icon = '○';
        let style = 'color: var(--muted);';
        
        if (stageIdx < curIdx || currentStatus === 'COMPLETED') {
            icon = '✓';
            style = 'color: var(--ok);';
        } else if (stageIdx === curIdx) {
            icon = '●';
            style = 'color: var(--primary);';
        }
        
        return `<span style="margin-right: 8px; font-weight: 500; font-size: 13px; ${style}">${s} ${icon}</span>`;
    }).join(' <span style="color:var(--border);">→</span> ');
}

function renderWorkOrders(workOrders) {
    const tbody = document.getElementById('workOrderTableBody');
    if (!workOrders.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="small-text">No work orders yet.</td></tr>';
        return;
    }
    tbody.innerHTML = workOrders.map(wo => `
        <tr>
            <td>${wo.id}</td>
            <td>${wo.order.id}</td>
            <td>${escapeHtml(wo.assignedLine)}</td>
            <td>${renderVisualStages(wo.status)}</td>
            <td>${new Date(wo.createdDate).toLocaleDateString()}</td>
            <td>${renderWorkOrderActions(wo)}</td>
        </tr>
    `).join('');
}

function renderWorkOrderActions(workOrder) {
    const buttons = [`<button class="secondary" onclick="viewStageHistory(${workOrder.id})">History</button>`];

    if (workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED') {
        const currentIndex = STAGE_SEQUENCE.indexOf(workOrder.status);
        const nextStage = STAGE_SEQUENCE[currentIndex + 1];
        if (nextStage) {
            buttons.push(`<button class="primary" onclick="advanceStage(${workOrder.id}, '${nextStage}')">Move to ${nextStage}</button>`);
        }
    }
    if (workOrder.status === 'PENDING') {
        buttons.push(`<button class="danger" onclick="cancelWorkOrder(${workOrder.id})">Cancel</button>`);
    }
    if (workOrder.status === 'CANCELLED') {
        buttons.push(`<button class="danger" onclick="permanentlyDeleteWorkOrder(${workOrder.id})">Permanent Delete</button>`);
    }

    return buttons.join(' ');
}

// ---- PBI-18: advance stage ----
async function advanceStage(id, nextStage) {
    hideAlert('pageAlert');
    try {
        await api.patch(`/api/production/work-orders/${id}/stage`, { stage: nextStage });
        showAlert('pageAlert', `Work order #${id} moved to ${nextStage}.`, 'success');
        await loadWorkOrders();
        await checkBottleneckBanner();
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

async function cancelWorkOrder(id) {
    if (!confirm('Cancel this work order? Only allowed while it has not started production.')) {
        return;
    }
    hideAlert('pageAlert');
    try {
        await api.patch(`/api/production/work-orders/${id}/cancel`);
        showAlert('pageAlert', `Work order #${id} cancelled.`, 'success');
        await loadWorkOrders();
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

// ---- Permanent delete (only CANCELLED work orders; the row is really removed) ----
async function permanentlyDeleteWorkOrder(id) {
    if (!confirm('Are you sure you want to permanently delete this work order? The work order and its stage history will be removed from the database. This action cannot be undone.')) {
        return;
    }
    hideAlert('pageAlert');
    try {
        await api.del(`/api/production/work-orders/${id}`);

        // Close the stage-history panel if it was showing the deleted work order.
        const detailId = document.getElementById('detailWorkOrderId');
        if (detailId && detailId.textContent === String(id)) {
            closeStageDetail();
        }

        showAlert('pageAlert', `Work order #${id} permanently deleted.`, 'success');
        await loadWorkOrders();
        await loadConfirmedOrdersIntoDropdown();
        await checkBottleneckBanner();
    } catch (err) {
        showAlert('pageAlert', 'Could not permanently delete work order: ' + err.message, 'error');
        await loadWorkOrders();
    }
}

// ---- PBI-19: bottleneck alert banner ----
async function checkBottleneckBanner() {
    try {
        const bottlenecks = await api.get('/api/production/bottlenecks');
        const banner = document.getElementById('bottleneckBanner');
        if (bottlenecks.length > 0) {
            banner.textContent = `Bottleneck alert: ${bottlenecks.length} work order(s) have been stuck in their current stage too long - Work Order #${bottlenecks.map(w => w.id).join(', #')}`;
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    } catch (err) {
        // non-fatal for the page
    }
}

// ---- PBI-20: daily output summary ----
async function loadOutputSummary() {
    const date = document.getElementById('output_date').value;
    const url = '/api/production/output-summary' + (date ? `?date=${date}` : '');

    try {
        const summary = await api.get(url);
        const lines = Object.keys(summary);
        const body = document.getElementById('outputSummaryBody');
        if (!lines.length) {
            body.innerHTML = '<p class="small-text">No work orders were completed on this date.</p>';
            return;
        }
        body.innerHTML = '<table><thead><tr><th>Line/Team</th><th>Completed</th></tr></thead><tbody>' +
            lines.map(line => `<tr><td>${escapeHtml(line)}</td><td>${summary[line]}</td></tr>`).join('') +
            '</tbody></table>';
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

// ---- Stage history ----
async function viewStageHistory(id) {
    hideAlert('pageAlert');
    try {
        const history = await api.get(`/api/production/work-orders/${id}/stages`);
        document.getElementById('detailWorkOrderId').textContent = id;
        document.getElementById('stageHistoryBody').innerHTML = history.map(s => `
            <tr>
                <td>${s.stageName}</td>
                <td>${new Date(s.startDate).toLocaleString()}</td>
                <td>${s.endDate ? new Date(s.endDate).toLocaleString() : '(current)'}</td>
            </tr>
        `).join('');
        document.getElementById('stageDetailPanel').classList.remove('hidden');
        document.getElementById('stageDetailPanel').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        showAlert('pageAlert', err.message, 'error');
    }
}

function closeStageDetail() {
    document.getElementById('stageDetailPanel').classList.add('hidden');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}
