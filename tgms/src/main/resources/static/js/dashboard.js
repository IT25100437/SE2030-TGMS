/**
 * dashboard.js — role-based dashboard.
 *
 * Every number on this page is calculated from data returned by EXISTING endpoints
 * (the same ones the module pages use). Nothing is invented: if a value cannot be
 * loaded it is shown as "—" with a clear message instead of a made-up number.
 *
 * Sidebar / topbar are rendered by layout.js (initLayout()); this file only fills
 * the page content.
 */

let dashboardUser = null;

// ============================================================
// SMALL HELPERS
// ============================================================

/** Runs an async call and never throws: returns { ok, data | error }. */
async function safe(fn) {
    try {
        return { ok: true, data: await fn() };
    } catch (error) {
        return { ok: false, error };
    }
}

function asList(result) {
    return result && result.ok && Array.isArray(result.data) ? result.data : [];
}

function countWhere(list, predicate) {
    return list.filter(predicate).length;
}

function sumBy(list, getter) {
    return list.reduce((total, item) => total + (Number(getter(item)) || 0), 0);
}

function sortDesc(list, getter) {
    return list.slice().sort((a, b) => {
        const x = getter(a) || '';
        const y = getter(b) || '';
        return x < y ? 1 : x > y ? -1 : 0;
    });
}

function addDays(dateString, days) {
    const d = UI.parseDate(dateString);
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** "09:41" for something that happened today, otherwise the date. */
function shortWhen(timestamp) {
    if (!timestamp) return '—';
    if (UI.datePart(timestamp) === UI.todayString()) {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return UI.formatDate(timestamp);
}

/** KPI definition. value === null/undefined means "could not be loaded". */
function kpi(label, icon, value, options) {
    const o = options || {};
    return { label, icon, value, sub: o.sub || '', tone: o.tone || '' };
}

function renderKpiCard(k) {
    const unavailable = k.value === null || k.value === undefined;
    const shown = unavailable ? '—' : (typeof k.value === 'number' ? k.value.toLocaleString() : escapeHtml(k.value));
    const sub = unavailable ? 'Could not be loaded' : k.sub;
    return `
        <div class="dashboard-kpi ${k.tone ? 'tone-' + k.tone : ''}">
            <div class="dkpi-icon"><i class="fas ${k.icon}" aria-hidden="true"></i></div>
            <div class="dkpi-value">${shown}</div>
            <div class="dkpi-label">${escapeHtml(k.label)}</div>
            ${sub ? `<div class="dkpi-sub">${escapeHtml(sub)}</div>` : ''}
        </div>`;
}

function renderKpiSkeleton(defs) {
    return defs.map(([label, icon]) => `
        <div class="dashboard-kpi" aria-busy="true">
            <div class="dkpi-icon"><i class="fas ${icon}" aria-hidden="true"></i></div>
            <div class="dkpi-value"><span class="skeleton"></span></div>
            <div class="dkpi-label">${escapeHtml(label)}</div>
        </div>`).join('');
}

function panelCard(options) {
    const link = options.href
        ? `<a class="btn btn-secondary btn-sm" href="${options.href}">${escapeHtml(options.hrefLabel || 'View all')}</a>`
        : '';
    return `
        <section class="card">
            <div class="section-header">
                <div>
                    <h3><i class="fas ${options.icon} section-icon" aria-hidden="true"></i>${escapeHtml(options.title)}</h3>
                    ${options.subtitle ? `<div class="section-desc">${escapeHtml(options.subtitle)}</div>` : ''}
                </div>
                ${link}
            </div>
            ${options.body}
        </section>`;
}

function failedPanel(title, icon, what) {
    return panelCard({
        title, icon,
        body: UI.errorBlock('Unable to load ' + what + '.', 'reloadDashboard()')
    });
}

function activityList(items) {
    return '<ul class="activity-list">' + items.map(i => `
        <li class="activity-item">
            <div class="activity-icon ${i.tone || ''}"><i class="fas ${i.icon}" aria-hidden="true"></i></div>
            <div class="activity-body">
                <div class="activity-title">${escapeHtml(i.title)}</div>
                <div class="activity-meta">${escapeHtml(i.meta || '')}</div>
            </div>
            <div class="activity-side">${i.side || ''}</div>
        </li>`).join('') + '</ul>';
}

function emptyPanelBody(icon, title, text) {
    return UI.emptyBlock({ icon, title, text, compact: true });
}

function ordersTable(list) {
    return `
        <div class="table-wrap">
            <table class="data-table compact">
                <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th class="col-num">Total</th><th>Status</th></tr></thead>
                <tbody>
                    ${list.map(o => `
                        <tr>
                            <td class="col-strong">#${o.id}</td>
                            <td>${escapeHtml(o.customer ? o.customer.name : '—')}</td>
                            <td class="nowrap">${UI.formatDate(o.orderDate)}</td>
                            <td class="col-num">${UI.formatMoney(o.totalAmount)}</td>
                            <td>${UI.statusBadge(o.status)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function workOrdersTable(list) {
    return `
        <div class="table-wrap">
            <table class="data-table compact">
                <thead><tr><th>WO #</th><th>Order</th><th>Line / Team</th><th>Stage</th></tr></thead>
                <tbody>
                    ${list.map(w => `
                        <tr>
                            <td class="col-strong">#${w.id}</td>
                            <td>${w.order ? '#' + w.order.id : '—'}</td>
                            <td>${escapeHtml(w.assignedLine)}</td>
                            <td>${UI.stageTracker(w.status)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function lowStockTable(list) {
    return `
        <div class="table-wrap">
            <table class="data-table compact">
                <thead><tr><th>SKU</th><th>Item</th><th class="col-num">Qty</th><th class="col-num">Threshold</th></tr></thead>
                <tbody>
                    ${list.map(i => `
                        <tr>
                            <td class="col-strong">${escapeHtml(i.sku)}</td>
                            <td>${escapeHtml(i.itemName)}</td>
                            <td class="col-num" style="color:var(--danger);font-weight:700;">${i.quantity}</td>
                            <td class="col-num">${i.threshold}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function quickAction(href, icon, label, desc, primary) {
    return { href, icon, label, desc, primary: !!primary };
}

// ============================================================
// ROLE LOADERS  (each returns { kpis: [...], panels: [html, ...] })
// ============================================================

async function loadProcurement() {
    const today = UI.todayString();
    const soon = addDays(today, 30);

    const suppliersRes = await safe(() => api.get('/api/suppliers'));
    const suppliers = asList(suppliersRes);

    // Contracts are only exposed per supplier, so collect them supplier by supplier.
    let contractsRes = { ok: false };
    if (suppliersRes.ok) {
        contractsRes = await safe(async () => {
            const lists = await Promise.all(suppliers.map(s =>
                api.get(`/api/suppliers/${s.id}/contracts`)
                    .then(cs => cs.map(c => Object.assign({}, c, { supplierName: s.name })))
            ));
            return lists.flat();
        });
    }
    const contracts = asList(contractsRes);
    const activeContracts = contracts.filter(c => c.startDate <= today && c.endDate >= today);
    const endingSoon = activeContracts.filter(c => c.endDate <= soon).sort((a, b) => a.endDate < b.endDate ? -1 : 1);

    const kpis = [
        kpi('Total Suppliers', 'fa-truck', suppliersRes.ok ? suppliers.length : null, { sub: 'Registered in the system' }),
        kpi('Active Suppliers', 'fa-check-circle', suppliersRes.ok ? countWhere(suppliers, s => s.status === 'ACTIVE') : null, { tone: 'ok', sub: 'Available for orders' }),
        kpi('Inactive Suppliers', 'fa-pause-circle', suppliersRes.ok ? countWhere(suppliers, s => s.status === 'INACTIVE') : null, { sub: 'Deactivated, history kept' }),
        kpi('Active Contracts', 'fa-file-contract', contractsRes.ok ? activeContracts.length : null, { tone: 'info', sub: 'Currently in force today' })
    ];

    const panels = [];

    if (!suppliersRes.ok) {
        panels.push(failedPanel('Recent Supplier Activity', 'fa-history', 'supplier activity'));
    } else {
        const recent = sortDesc(suppliers, s => s.createdAt || '').slice(0, 6);
        panels.push(panelCard({
            title: 'Recent Supplier Activity', icon: 'fa-history', subtitle: 'Most recently registered suppliers',
            href: '/suppliers.html', hrefLabel: 'View suppliers',
            body: recent.length
                ? activityList(recent.map(s => ({
                    icon: 'fa-truck',
                    title: s.name,
                    meta: s.materialCategory + ' · registered ' + UI.formatDate(s.createdAt),
                    side: UI.statusBadge(s.status)
                })))
                : emptyPanelBody('fa-truck', 'No suppliers yet', 'Registered suppliers will appear here.')
        }));
    }

    if (!contractsRes.ok) {
        panels.push(failedPanel('Contracts Ending Soon', 'fa-hourglass-half', 'contracts'));
    } else {
        panels.push(panelCard({
            title: 'Contracts Ending Soon', icon: 'fa-hourglass-half', subtitle: 'Active contracts ending within 30 days',
            href: '/suppliers.html', hrefLabel: 'Manage contracts',
            body: endingSoon.length
                ? activityList(endingSoon.slice(0, 6).map(c => ({
                    icon: 'fa-file-contract', tone: 'out',
                    title: c.supplierName,
                    meta: 'Contract #' + c.id,
                    side: 'Ends ' + escapeHtml(c.endDate)
                })))
                : emptyPanelBody('fa-file-contract', 'No contracts ending soon', 'No active contract ends in the next 30 days.')
        }));
    }
    return { kpis, panels };
}

async function loadInventory() {
    const today = UI.todayString();

    const [itemsRes, lowRes] = await Promise.all([
        safe(() => api.get('/api/inventory')),
        safe(() => api.get('/api/inventory/low-stock'))
    ]);
    const items = asList(itemsRes);
    const low = asList(lowRes);

    // Stock movements are only exposed per item.
    let movementsRes = { ok: false };
    if (itemsRes.ok) {
        movementsRes = await safe(async () => {
            const lists = await Promise.all(items.map(i =>
                api.get(`/api/inventory/${i.id}/movements`)
                    .then(ms => ms.map(m => Object.assign({}, m, { itemName: i.itemName, sku: i.sku })))
            ));
            return lists.flat();
        });
    }
    const movements = asList(movementsRes);
    const todays = movements.filter(m => UI.datePart(m.timestamp) === today);
    const inToday = todays.filter(m => m.direction === 'IN');
    const outToday = todays.filter(m => m.direction === 'OUT');

    const kpis = [
        kpi('Total Inventory Items', 'fa-boxes', itemsRes.ok ? items.length : null, { sub: 'Active items in stock records' }),
        kpi('Low Stock Items', 'fa-exclamation-triangle', lowRes.ok ? low.length : null,
            { tone: low.length ? 'danger' : 'ok', sub: lowRes.ok && !low.length ? 'All items above threshold' : 'At or below threshold' }),
        kpi('Stock In Today', 'fa-arrow-circle-down', movementsRes.ok ? sumBy(inToday, m => m.quantity) : null,
            { tone: 'ok', sub: movementsRes.ok ? inToday.length + ' movement(s) · units received' : '' }),
        kpi('Stock Out Today', 'fa-arrow-circle-up', movementsRes.ok ? sumBy(outToday, m => m.quantity) : null,
            { tone: 'warn', sub: movementsRes.ok ? outToday.length + ' movement(s) · units issued' : '' })
    ];

    const panels = [];

    if (!movementsRes.ok) {
        panels.push(failedPanel('Recent Inventory Activity', 'fa-exchange-alt', 'inventory activity'));
    } else {
        const recent = sortDesc(movements, m => m.timestamp).slice(0, 7);
        panels.push(panelCard({
            title: 'Recent Inventory Activity', icon: 'fa-exchange-alt', subtitle: 'Latest stock movements',
            href: '/inventory.html', hrefLabel: 'Open inventory',
            body: recent.length
                ? activityList(recent.map(m => ({
                    icon: m.direction === 'IN' ? 'fa-arrow-down' : 'fa-arrow-up',
                    tone: m.direction === 'IN' ? 'in' : 'out',
                    title: m.itemName,
                    meta: (m.direction === 'IN' ? 'Stock in' : 'Stock out') + ' · ' + m.quantity + ' unit(s)' + (m.note ? ' · ' + m.note : ''),
                    side: escapeHtml(shortWhen(m.timestamp))
                })))
                : emptyPanelBody('fa-exchange-alt', 'No stock movements yet', 'Recorded stock in / out movements will appear here.')
        }));
    }

    if (!lowRes.ok) {
        panels.push(failedPanel('Low Stock Alerts', 'fa-exclamation-triangle', 'low-stock alerts'));
    } else {
        panels.push(panelCard({
            title: 'Low Stock Alerts', icon: 'fa-exclamation-triangle', subtitle: 'Items at or below their reorder threshold',
            href: '/inventory.html#low-stock', hrefLabel: 'View low stock',
            body: low.length
                ? lowStockTable(low.slice(0, 6))
                : emptyPanelBody('fa-check-circle', 'No low-stock items', 'Every item is above its reorder threshold.')
        }));
    }
    return { kpis, panels };
}

async function loadSales() {
    const ordersRes = await safe(() => api.get('/api/orders'));
    const orders = asList(ordersRes);
    const byStatus = status => countWhere(orders, o => o.status === status);

    const kpis = [
        kpi('Total Orders', 'fa-file-invoice', ordersRes.ok ? orders.length : null, { sub: 'All customer orders' }),
        kpi('Pending Orders', 'fa-hourglass-half', ordersRes.ok ? byStatus('DRAFT') : null, { tone: 'warn', sub: 'Draft — awaiting confirmation' }),
        kpi('Confirmed Orders', 'fa-clipboard-check', ordersRes.ok ? byStatus('CONFIRMED') : null, { tone: 'info', sub: 'Invoiced, ready to ship' }),
        kpi('Shipped Orders', 'fa-shipping-fast', ordersRes.ok ? byStatus('SHIPPED') : null, { sub: 'On the way to customers' }),
        kpi('Delivered Orders', 'fa-box-open', ordersRes.ok ? byStatus('DELIVERED') : null, { tone: 'ok', sub: 'Completed deliveries' })
    ];

    const panels = [];
    if (!ordersRes.ok) {
        panels.push(failedPanel('Recent Order Activity', 'fa-history', 'orders'));
    } else {
        const recent = sortDesc(orders, o => o.orderDate).slice(0, 6);
        panels.push(panelCard({
            title: 'Recent Order Activity', icon: 'fa-history', subtitle: 'Latest customer orders',
            href: '/orders.html#orderListCard', hrefLabel: 'View orders',
            body: recent.length
                ? ordersTable(recent)
                : emptyPanelBody('fa-file-invoice', 'No orders yet', 'Create your first order to see it here.')
        }));

        const drafts = sortDesc(orders.filter(o => o.status === 'DRAFT'), o => o.orderDate).slice(0, 6);
        panels.push(panelCard({
            title: 'Awaiting Confirmation', icon: 'fa-hourglass-half', subtitle: 'Draft orders that still need to be confirmed',
            href: '/orders.html#orderListCard', hrefLabel: 'Review drafts',
            body: drafts.length
                ? activityList(drafts.map(o => ({
                    icon: 'fa-file-alt',
                    title: 'Order #' + o.id + ' · ' + (o.customer ? o.customer.name : 'Customer'),
                    meta: UI.formatDate(o.orderDate),
                    side: '<strong>' + UI.formatMoney(o.totalAmount) + '</strong>'
                })))
                : emptyPanelBody('fa-check-circle', 'Nothing waiting', 'There are no draft orders to confirm.')
        }));
    }
    return { kpis, panels };
}

async function loadProduction() {
    const [wosRes, bottleneckRes, outputRes] = await Promise.all([
        safe(() => api.get('/api/production/work-orders')),
        safe(() => api.get('/api/production/bottlenecks')),
        safe(() => api.get('/api/production/output-summary'))
    ]);
    const wos = asList(wosRes);
    const bottlenecks = asList(bottleneckRes);
    const isActive = w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED';
    const outputTotal = outputRes.ok && outputRes.data ? sumBy(Object.values(outputRes.data), v => v) : null;

    const kpis = [
        kpi('Active Work Orders', 'fa-industry', wosRes.ok ? countWhere(wos, isActive) : null, { tone: 'info', sub: 'Pending or in production' }),
        kpi('Completed Work Orders', 'fa-check-double', wosRes.ok ? countWhere(wos, w => w.status === 'COMPLETED') : null, { tone: 'ok', sub: 'Finished production' }),
        kpi('Bottleneck Alerts', 'fa-exclamation-triangle', bottleneckRes.ok ? bottlenecks.length : null,
            { tone: bottlenecks.length ? 'danger' : 'ok', sub: bottleneckRes.ok && !bottlenecks.length ? 'No delays detected' : 'Stuck in a stage for 48h+' }),
        kpi("Today's Output", 'fa-calendar-day', outputTotal, { sub: 'Work orders completed today' })
    ];

    const panels = [];
    if (!wosRes.ok) {
        panels.push(failedPanel('Recent Production Activity', 'fa-history', 'work orders'));
    } else {
        const recent = sortDesc(wos, w => w.createdDate).slice(0, 6);
        panels.push(panelCard({
            title: 'Recent Production Activity', icon: 'fa-history', subtitle: 'Latest work orders and their current stage',
            href: '/production.html#workOrderListCard', hrefLabel: 'Production tracking',
            body: recent.length
                ? workOrdersTable(recent)
                : emptyPanelBody('fa-industry', 'No work orders yet', 'Create a work order from a confirmed order to start tracking.')
        }));
    }

    if (!bottleneckRes.ok) {
        panels.push(failedPanel('Bottleneck Alerts', 'fa-exclamation-triangle', 'bottleneck alerts'));
    } else {
        panels.push(panelCard({
            title: 'Bottleneck Alerts', icon: 'fa-exclamation-triangle', subtitle: 'Work orders stuck in one stage for 48+ hours',
            href: '/production.html#workOrderListCard', hrefLabel: 'Open tracking',
            body: bottlenecks.length
                ? activityList(bottlenecks.slice(0, 6).map(w => ({
                    icon: 'fa-exclamation', tone: 'alert',
                    title: 'Work Order #' + w.id + ' · ' + w.assignedLine,
                    meta: 'Order ' + (w.order ? '#' + w.order.id : '—'),
                    side: UI.statusBadge(w.status)
                })))
                : emptyPanelBody('fa-check-circle', 'No bottlenecks', 'Every active work order is moving on schedule.')
        }));
    }
    return { kpis, panels };
}

async function loadHr() {
    const today = UI.todayString();
    const now = new Date();

    const employeesRes = await safe(() => api.get('/api/employees'));
    const employees = asList(employeesRes);

    // Attendance is only exposed per employee and month.
    let attendanceRes = { ok: false };
    if (employeesRes.ok) {
        attendanceRes = await safe(async () => {
            const lists = await Promise.all(employees.map(e =>
                api.get(`/api/employees/${e.id}/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
                    .then(rs => rs.map(r => Object.assign({}, r, { employeeId: e.id, employeeName: e.name, department: e.department })))
            ));
            return lists.flat();
        });
    }
    const records = asList(attendanceRes);
    const todays = records.filter(r => r.date === today);
    const present = countWhere(todays, r => r.status === 'PRESENT' || r.status === 'LATE');
    const absent = countWhere(todays, r => r.status === 'ABSENT');
    const markedIds = new Set(todays.map(r => r.employeeId));

    const kpis = [
        kpi('Active Employees', 'fa-users', employeesRes.ok ? employees.length : null, { tone: 'info', sub: 'Currently employed' }),
        kpi("Today's Attendance", 'fa-user-check', attendanceRes.ok ? present : null,
            { tone: 'ok', sub: attendanceRes.ok ? 'Present or late · ' + todays.length + ' of ' + employees.length + ' marked' : '' }),
        kpi('Absent Employees', 'fa-user-times', attendanceRes.ok ? absent : null, { tone: absent ? 'danger' : '', sub: 'Marked absent today' }),
        kpi('Not Yet Marked', 'fa-user-clock', attendanceRes.ok ? Math.max(employees.length - markedIds.size, 0) : null, { tone: 'warn', sub: 'No attendance recorded today' })
    ];

    const panels = [];
    if (!attendanceRes.ok) {
        panels.push(failedPanel('Recent Employee Activity', 'fa-history', 'attendance activity'));
    } else {
        const recent = records.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id || 0) - (a.id || 0))).slice(0, 7);
        panels.push(panelCard({
            title: 'Recent Employee Activity', icon: 'fa-history', subtitle: 'Latest attendance records this month',
            href: '/employees.html#employeeListCard', hrefLabel: 'Open attendance',
            body: recent.length
                ? activityList(recent.map(r => ({
                    icon: r.status === 'ABSENT' ? 'fa-user-times' : 'fa-user-check',
                    tone: r.status === 'ABSENT' ? 'alert' : (r.status === 'LATE' ? 'out' : 'in'),
                    title: r.employeeName,
                    meta: (r.department || '') + ' · ' + UI.formatDate(r.date),
                    side: UI.statusBadge(r.status)
                })))
                : emptyPanelBody('fa-calendar-check', 'No attendance recorded this month', 'Marked attendance will appear here.')
        }));
    }

    if (!employeesRes.ok) {
        panels.push(failedPanel('Employees by Department', 'fa-sitemap', 'employees'));
    } else {
        const counts = {};
        employees.forEach(e => { counts[e.department] = (counts[e.department] || 0) + 1; });
        const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        panels.push(panelCard({
            title: 'Employees by Department', icon: 'fa-sitemap', subtitle: 'Active employees per department',
            href: '/employees.html#employeeListCard', hrefLabel: 'View employees',
            body: rows.length
                ? activityList(rows.slice(0, 7).map(([dept, n]) => ({
                    icon: 'fa-building',
                    title: dept,
                    meta: n + (n === 1 ? ' employee' : ' employees'),
                    side: '<strong>' + n + '</strong>'
                })))
                : emptyPanelBody('fa-users', 'No employees yet', 'Register employees to see the department breakdown.')
        }));
    }
    return { kpis, panels };
}

async function loadAdmin() {
    const [kpiRes, ordersRes, lowRes, wosRes, bottleneckRes] = await Promise.all([
        safe(() => api.get('/api/reports/kpis')),
        safe(() => api.get('/api/orders')),
        safe(() => api.get('/api/inventory/low-stock')),
        safe(() => api.get('/api/production/work-orders')),
        safe(() => api.get('/api/production/bottlenecks'))
    ]);
    const k = kpiRes.ok && kpiRes.data ? kpiRes.data : null;
    const val = key => (k && k[key] !== undefined && k[key] !== null) ? Number(k[key]) : null;
    const low = asList(lowRes);

    const kpis = [
        kpi('Total Orders', 'fa-file-invoice', val('totalOrders'), { sub: val('deliveredOrders') !== null ? val('deliveredOrders') + ' delivered' : '' }),
        kpi('Total Sales', 'fa-coins', val('totalSales') !== null ? UI.formatMoney(val('totalSales')) : null, { tone: 'ok', sub: 'Across all orders' }),
        kpi('Active Suppliers', 'fa-truck', val('activeSuppliers'), { sub: 'Available for orders' }),
        kpi('Active Employees', 'fa-users', val('activeEmployees'), { tone: 'info', sub: 'Currently employed' }),
        kpi('Inventory Items', 'fa-boxes', val('totalInventoryItems'), { sub: 'Active stock records' }),
        kpi('Low Stock Items', 'fa-exclamation-triangle', val('lowStockItems'), { tone: (val('lowStockItems') || 0) > 0 ? 'danger' : 'ok', sub: 'At or below threshold' }),
        kpi('Active Work Orders', 'fa-industry', val('activeWorkOrders'), { tone: 'info', sub: 'Pending or in production' }),
        kpi('Completed Work Orders', 'fa-check-double', val('completedWorkOrders'), { tone: 'ok', sub: 'Finished production' })
    ];

    const panels = [];

    if (!ordersRes.ok) {
        panels.push(failedPanel('Recent Orders', 'fa-history', 'orders'));
    } else {
        const recent = sortDesc(asList(ordersRes), o => o.orderDate).slice(0, 5);
        panels.push(panelCard({
            title: 'Recent Orders', icon: 'fa-history', subtitle: 'Latest customer orders',
            href: '/orders.html#orderListCard', hrefLabel: 'View orders',
            body: recent.length ? ordersTable(recent) : emptyPanelBody('fa-file-invoice', 'No orders yet', 'Orders will appear here once created.')
        }));
    }

    if (!wosRes.ok) {
        panels.push(failedPanel('Active Production', 'fa-industry', 'work orders'));
    } else {
        const active = sortDesc(asList(wosRes).filter(w => w.status !== 'COMPLETED' && w.status !== 'CANCELLED'), w => w.createdDate).slice(0, 5);
        const delayed = bottleneckRes.ok ? asList(bottleneckRes).length : 0;
        panels.push(panelCard({
            title: 'Active Production',
            icon: 'fa-industry',
            subtitle: bottleneckRes.ok ? (delayed ? delayed + ' work order(s) delayed (bottleneck)' : 'No bottlenecks detected') : 'Work orders currently in production',
            href: '/production.html#workOrderListCard', hrefLabel: 'Production tracking',
            body: active.length ? workOrdersTable(active) : emptyPanelBody('fa-industry', 'No active work orders', 'Nothing is currently in production.')
        }));
    }

    if (!lowRes.ok) {
        panels.push(failedPanel('Low Stock Alerts', 'fa-exclamation-triangle', 'low-stock alerts'));
    } else {
        panels.push(panelCard({
            title: 'Low Stock Alerts', icon: 'fa-exclamation-triangle', subtitle: 'Items at or below their reorder threshold',
            href: '/inventory.html#low-stock', hrefLabel: 'View low stock',
            body: low.length ? lowStockTable(low.slice(0, 5)) : emptyPanelBody('fa-check-circle', 'No low-stock items', 'Every item is above its reorder threshold.')
        }));
    }

    panels.push(panelCard({
        title: 'Reports & Analytics', icon: 'fa-chart-bar', subtitle: 'Management reports, exports and schedules',
        href: '/reports.html', hrefLabel: 'Open reports',
        body: UI.emptyBlock({
            icon: 'fa-chart-bar', compact: true,
            title: 'Detailed analytics are in Reports',
            text: 'Generate Orders, Inventory, Production, Employee and Supplier reports and export them to Excel or PDF.'
        })
    }));

    return { kpis, panels };
}

// ============================================================
// ROLE CONFIGURATION
// ============================================================

const ROLE_CONFIG = {
    PROCUREMENT_OFFICER: {
        subtitle: 'Your supplier network and contract overview.',
        skeleton: [['Total Suppliers', 'fa-truck'], ['Active Suppliers', 'fa-check-circle'], ['Inactive Suppliers', 'fa-pause-circle'], ['Active Contracts', 'fa-file-contract']],
        actions: [
            quickAction('/suppliers.html#supplierForm', 'fa-plus', 'Register Supplier', 'Add a new supplier to your network', true),
            quickAction('/suppliers.html#supplierListCard', 'fa-file-contract', 'Manage Contracts', 'Open a supplier\'s contract terms')
        ],
        load: loadProcurement
    },
    INVENTORY_MANAGER: {
        subtitle: 'Stock levels, movements and low-stock alerts.',
        skeleton: [['Total Inventory Items', 'fa-boxes'], ['Low Stock Items', 'fa-exclamation-triangle'], ['Stock In Today', 'fa-arrow-circle-down'], ['Stock Out Today', 'fa-arrow-circle-up']],
        actions: [
            quickAction('/inventory.html#itemForm', 'fa-plus', 'Add Inventory Item', 'Create a new stock record', true),
            quickAction('/inventory.html#inventoryListCard', 'fa-exchange-alt', 'Stock In/Out', 'Pick an item to record a movement'),
            quickAction('/inventory.html#low-stock', 'fa-exclamation-triangle', 'View Low Stock', 'Items that need reordering')
        ],
        load: loadInventory
    },
    SALES_OFFICER: {
        subtitle: 'Customer orders and where they are in the lifecycle.',
        skeleton: [['Total Orders', 'fa-file-invoice'], ['Pending Orders', 'fa-hourglass-half'], ['Confirmed Orders', 'fa-clipboard-check'], ['Shipped Orders', 'fa-shipping-fast'], ['Delivered Orders', 'fa-box-open']],
        actions: [
            quickAction('/orders.html#orderForm', 'fa-plus', 'Create Order', 'Start a new customer order', true),
            quickAction('/orders.html#orderListCard', 'fa-list-alt', 'View Orders', 'Track status and invoices'),
            quickAction('/orders.html#customerForm', 'fa-user-plus', 'Register Customer', 'Add a customer to order against')
        ],
        load: loadSales
    },
    PRODUCTION_MANAGER: {
        subtitle: 'Work orders, production stages and daily output.',
        skeleton: [['Active Work Orders', 'fa-industry'], ['Completed Work Orders', 'fa-check-double'], ['Bottleneck Alerts', 'fa-exclamation-triangle'], ["Today's Output", 'fa-calendar-day']],
        actions: [
            quickAction('/production.html#workOrderForm', 'fa-plus', 'Create Work Order', 'Start production for a confirmed order', true),
            quickAction('/production.html#workOrderListCard', 'fa-tasks', 'Production Tracking', 'Move work orders through stages'),
            quickAction('/production.html#outputCard', 'fa-calendar-day', 'Daily Output', 'See what was completed per line')
        ],
        load: loadProduction
    },
    HR_MANAGER: {
        subtitle: 'Your workforce and today\'s attendance.',
        skeleton: [['Active Employees', 'fa-users'], ["Today's Attendance", 'fa-user-check'], ['Absent Employees', 'fa-user-times'], ['Not Yet Marked', 'fa-user-clock']],
        actions: [
            quickAction('/employees.html#employeeForm', 'fa-user-plus', 'Register Employee', 'Add a new team member', true),
            quickAction('/employees.html#employeeListCard', 'fa-calendar-check', 'Attendance', 'Choose an employee and mark attendance')
        ],
        load: loadHr
    },
    ADMIN: {
        subtitle: 'A system-wide view across every module.',
        skeleton: [['Total Orders', 'fa-file-invoice'], ['Total Sales', 'fa-coins'], ['Active Suppliers', 'fa-truck'], ['Active Employees', 'fa-users'], ['Inventory Items', 'fa-boxes'], ['Low Stock Items', 'fa-exclamation-triangle'], ['Active Work Orders', 'fa-industry'], ['Completed Work Orders', 'fa-check-double']],
        actions: [
            quickAction('/reports.html', 'fa-chart-bar', 'Reports & Analytics', 'Generate, export and schedule reports', true),
            quickAction('/suppliers.html#supplierForm', 'fa-truck', 'Register Supplier', 'Add a supplier'),
            quickAction('/inventory.html#itemForm', 'fa-boxes', 'Add Inventory Item', 'Create a stock record'),
            quickAction('/orders.html#orderForm', 'fa-file-invoice', 'Create Order', 'Start a customer order'),
            quickAction('/production.html#workOrderForm', 'fa-industry', 'Create Work Order', 'Start production'),
            quickAction('/employees.html#employeeForm', 'fa-user-plus', 'Register Employee', 'Add a team member')
        ],
        load: loadAdmin
    }
};

const MODULE_CARDS = [
    { href: '/suppliers.html',  icon: 'fa-truck',        title: 'Supplier Management',   desc: 'Register suppliers, manage contracts and supplier information.', roles: ['PROCUREMENT_OFFICER', 'ADMIN'] },
    { href: '/inventory.html',  icon: 'fa-boxes',        title: 'Inventory Management',  desc: 'Manage stock levels, movements and low-stock alerts.',          roles: ['INVENTORY_MANAGER', 'ADMIN'] },
    { href: '/orders.html',     icon: 'fa-file-invoice', title: 'Order Management',      desc: 'Manage customer orders, invoices and delivery status.',         roles: ['SALES_OFFICER', 'ADMIN'] },
    { href: '/production.html', icon: 'fa-industry',     title: 'Production Management', desc: 'Manage work orders, production stages and factory output.',     roles: ['PRODUCTION_MANAGER', 'ADMIN'] },
    { href: '/employees.html',  icon: 'fa-users',        title: 'Employee Management',   desc: 'Manage employees, attendance and workforce information.',       roles: ['HR_MANAGER', 'ADMIN'] },
    { href: '/reports.html',    icon: 'fa-chart-bar',    title: 'Reports & Analytics',   desc: 'View management reports, KPIs and business analytics.',         roles: ['ADMIN'] }
];

// ============================================================
// RENDERING
// ============================================================

function renderQuickActions(actions) {
    const box = document.getElementById('quickActions');
    const card = document.getElementById('quickActionsCard');
    if (!actions || !actions.length) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    box.innerHTML = actions.map(a => `
        <a class="quick-action ${a.primary ? 'primary' : ''}" href="${a.href}">
            <div class="qa-icon"><i class="fas ${a.icon}" aria-hidden="true"></i></div>
            <div class="qa-text"><strong>${escapeHtml(a.label)}</strong><span>${escapeHtml(a.desc)}</span></div>
        </a>`).join('');
}

function renderModuleCards(role) {
    const modules = MODULE_CARDS.filter(m => m.roles.includes(role));
    const box = document.getElementById('moduleLinks');
    if (!modules.length) {
        box.innerHTML = UI.emptyBlock({ icon: 'fa-th-large', compact: true, title: 'No modules assigned', text: 'No modules are assigned to your role yet.' });
        return;
    }
    box.innerHTML = modules.map(m => `
        <a href="${m.href}" class="module-link-card">
            <div class="mlc-icon"><i class="fas ${m.icon}" aria-hidden="true"></i></div>
            <div class="mlc-text"><strong>${escapeHtml(m.title)}</strong><span>${escapeHtml(m.desc)}</span></div>
            <i class="fas fa-chevron-right mlc-chevron" aria-hidden="true"></i>
        </a>`).join('');
}

function renderPanels(panels) {
    const box = document.getElementById('dashboardPanels');
    if (!panels.length) { box.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i < panels.length; i += 2) {
        html += '<div class="dashboard-split dashboard-section">' + panels[i] + (panels[i + 1] || '') + '</div>';
    }
    box.innerHTML = html;
}

function renderPanelsLoading() {
    document.getElementById('dashboardPanels').innerHTML =
        '<div class="card dashboard-section">' + UI.loadingBlock('Loading dashboard data…') + '</div>';
}

async function reloadDashboard() {
    if (!dashboardUser) return;
    const config = ROLE_CONFIG[dashboardUser.role];
    if (!config) return;

    document.getElementById('kpiGrid').innerHTML = renderKpiSkeleton(config.skeleton);
    renderPanelsLoading();

    try {
        const result = await config.load();
        document.getElementById('kpiGrid').innerHTML = result.kpis.map(renderKpiCard).join('');
        renderPanels(result.panels);
    } catch (error) {
        // loaders catch their own request errors; this is only a last-resort guard
        document.getElementById('kpiGrid').innerHTML = '';
        document.getElementById('dashboardPanels').innerHTML =
            '<div class="card dashboard-section">' + UI.errorBlock('Unable to load the dashboard.', 'reloadDashboard()') + '</div>';
    }
}

// ============================================================
// INIT
// ============================================================

(async function init() {
    const user = await requireLogin();
    if (!user) return;
    dashboardUser = user;

    document.getElementById('welcomeName').textContent = user.fullName || user.username;
    document.getElementById('welcomeRole').textContent = formatRole(user.role);

    const config = ROLE_CONFIG[user.role];
    renderModuleCards(user.role);

    if (!config) {
        document.getElementById('kpiGrid').classList.add('hidden');
        document.getElementById('quickActionsCard').classList.add('hidden');
        document.getElementById('dashboardPanels').innerHTML = '';
        return;
    }

    document.getElementById('welcomeSub').textContent = config.subtitle;
    renderQuickActions(config.actions);
    await reloadDashboard();
})();
