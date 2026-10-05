(async function init() {
    const user = await requireLogin();
    if (!user) return;

    // Populate user info in topbar
    const firstLetter = (user.fullName || user.username || 'U')[0].toUpperCase();
    document.getElementById('userAvatar').textContent  = firstLetter;
    document.getElementById('userLabel').textContent   = user.fullName || user.username;
    document.getElementById('userRoleLabel').textContent = formatRole(user.role);

    // Populate welcome card
    document.getElementById('welcomeName').textContent = user.fullName || user.username;
    document.getElementById('welcomeRole').textContent = formatRole(user.role);

    const sidebar     = document.getElementById('sidebar');
    const moduleLinks = document.getElementById('moduleLinks');
    const kpiGrid     = document.getElementById('kpiGrid');

    const canSeeSuppliers  = user.role === 'PROCUREMENT_OFFICER' || user.role === 'ADMIN';
    const canSeeInventory  = user.role === 'INVENTORY_MANAGER'   || user.role === 'ADMIN';
    const canSeeOrders     = user.role === 'SALES_OFFICER'       || user.role === 'ADMIN';
    const canSeeProduction = user.role === 'PRODUCTION_MANAGER'  || user.role === 'ADMIN';
    const canSeeEmployees  = user.role === 'HR_MANAGER'          || user.role === 'ADMIN';

    // Sidebar links
    if (canSeeSuppliers) {
        sidebar.insertAdjacentHTML('beforeend',
            `<a href="/suppliers.html">
                <i class="fas fa-truck"></i>
                Supplier Management
            </a>`);
    }
    if (canSeeInventory) {
        sidebar.insertAdjacentHTML('beforeend',
            `<a href="/inventory.html">
                <i class="fas fa-boxes"></i>
                Inventory Management
            </a>`);
    }
    if (canSeeOrders) {
        sidebar.insertAdjacentHTML('beforeend',
            `<a href="/orders.html">
                <i class="fas fa-file-invoice"></i>
                Order Management
            </a>`);
    }
    if (canSeeProduction) {
        sidebar.insertAdjacentHTML('beforeend',
            `<a href="/production.html">
                <i class="fas fa-industry"></i>
                Production Management
            </a>`);
    }
    if (canSeeEmployees) {
        sidebar.insertAdjacentHTML('beforeend',
            `<a href="/employees.html">
                <i class="fas fa-users"></i>
                Employee Management
            </a>`);
    }
    // Admin always has reports
    if (user.role === 'ADMIN') {
        sidebar.insertAdjacentHTML('beforeend',
            `<a href="/reports.html">
                <i class="fas fa-chart-bar"></i>
                Reports &amp; Analytics
            </a>`);
    }

    // KPI cards — attempt to load real data where accessible
    await loadKPIs(user, canSeeSuppliers, canSeeInventory, canSeeOrders, canSeeProduction, canSeeEmployees, kpiGrid);

    // Module link cards
    const modules = [
        canSeeSuppliers  && { href:'/suppliers.html',  icon:'fas fa-truck',        title:'Supplier Management',   desc:'Register suppliers, manage contracts and supplier information.' },
        canSeeInventory  && { href:'/inventory.html',  icon:'fas fa-boxes',        title:'Inventory Management',  desc:'Manage stock levels, movements and low-stock alerts.' },
        canSeeOrders     && { href:'/orders.html',     icon:'fas fa-file-invoice', title:'Order Management',      desc:'Manage customer orders, invoices and delivery status.' },
        canSeeProduction && { href:'/production.html', icon:'fas fa-industry',     title:'Production Management', desc:'Manage work orders, production stages and factory output.' },
        canSeeEmployees  && { href:'/employees.html',  icon:'fas fa-users',        title:'Employee Management',   desc:'Manage employees, attendance and workforce information.' },
        user.role === 'ADMIN' && { href:'/reports.html', icon:'fas fa-chart-bar',  title:'Reports & Analytics',   desc:'View management reports, KPIs and business analytics.' },
    ].filter(Boolean);

    if (modules.length === 0) {
        moduleLinks.innerHTML = '<p class="small-text">No modules are assigned to your role yet.</p>';
    } else {
        modules.forEach(m => {
            moduleLinks.insertAdjacentHTML('beforeend', `
                <a href="${m.href}" class="module-link-card">
                    <div class="mlc-icon"><i class="${m.icon}"></i></div>
                    <div class="mlc-text">
                        <strong>${m.title}</strong>
                        <span>${m.desc}</span>
                    </div>
                    <i class="fas fa-chevron-right" style="margin-left:auto; color:var(--muted); font-size:12px;"></i>
                </a>
            `);
        });
    }

    // Load Operation Status Blocks
    await loadOperationalPanels(canSeeInventory, canSeeProduction, canSeeOrders);

})();


/* =============================================
   HELPER: Format role name
   ============================================= */
function formatRole(role) {
    const map = {
        ADMIN:               'Administrator',
        PROCUREMENT_OFFICER: 'Procurement Officer',
        INVENTORY_MANAGER:   'Inventory Manager',
        SALES_OFFICER:       'Sales Officer',
        PRODUCTION_MANAGER:  'Production Manager',
        HR_MANAGER:          'HR Manager',
    };
    return map[role] || role;
}


/* =============================================
   LOAD KPI CARDS FROM REAL APIs
   ============================================= */
async function loadKPIs(user, canSuppliers, canInventory, canOrders, canProduction, canEmployees, container) {
    const kpis = [];

    try {
        if (canSuppliers) {
            const data = await api.get('/api/suppliers').catch(() => null);
            if (data) {
                const count = Array.isArray(data) ? data.filter(s => s.active !== false).length
                            : (data.totalElements ?? '—');
                kpis.push({ icon: 'fas fa-truck',        label: 'Active Suppliers',     value: count });
            }
        }
    } catch(e) {}

    try {
        if (canInventory) {
            const data = await api.get('/api/inventory').catch(() => null);
            if (data) {
                const count = Array.isArray(data) ? data.length : (data.totalElements ?? '—');
                kpis.push({ icon: 'fas fa-boxes',        label: 'Inventory Items',       value: count });
            }
        }
    } catch(e) {}

    try {
        if (canOrders) {
            const data = await api.get('/api/orders').catch(() => null);
            if (data) {
                const count = Array.isArray(data)
                    ? data.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED').length
                    : (data.totalElements ?? '—');
                kpis.push({ icon: 'fas fa-file-invoice', label: 'Active Orders',         value: count });
            }
        }
    } catch(e) {}

    try {
        if (canProduction) {
            const data = await api.get('/api/work-orders').catch(() => null);
            if (data) {
                const count = Array.isArray(data)
                    ? data.filter(wo => wo.stage !== 'COMPLETED').length
                    : (data.totalElements ?? '—');
                kpis.push({ icon: 'fas fa-industry',     label: 'Active Work Orders',    value: count });
            }
        }
    } catch(e) {}

    try {
        if (canEmployees) {
            const data = await api.get('/api/employees').catch(() => null);
            if (data) {
                const count = Array.isArray(data) ? data.filter(e => e.active !== false).length
                            : (data.totalElements ?? '—');
                kpis.push({ icon: 'fas fa-users',        label: 'Active Employees',      value: count });
            }
        }
    } catch(e) {}

    if (kpis.length === 0) {
        container.style.display = 'none';
        return;
    }

    kpis.forEach(k => {
        container.insertAdjacentHTML('beforeend', `
            <div class="dashboard-kpi">
                <div class="dkpi-icon"><i class="${k.icon}"></i></div>
                <div class="dkpi-value">${k.value}</div>
                <div class="dkpi-label">${k.label}</div>
            </div>
        `);
    });
}


/* =============================================
   LOAD OPERATIONAL PANELS FROM REAL APIs
   ============================================= */
async function loadOperationalPanels(canInventory, canProduction, canOrders) {
    const mainContent = document.getElementById('mainContent');
    const moduleLinksCard = document.getElementById('moduleLinks').parentElement;

    if (canInventory) {
        try {
            const data = await api.get('/api/inventory/low-stock').catch(() => null);
            if (data && data.length > 0) {
                const html = `
                <div class="card" style="margin-top: 24px;">
                    <div class="card-header"><h3 style="color:var(--primary);"><i class="fas fa-exclamation-triangle"></i> Inventory Alerts (Low Stock)</h3></div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>SKU</th><th>Item</th><th>Qty</th><th>Threshold</th></tr></thead>
                            <tbody>
                                ${data.slice(0, 5).map(i => `<tr><td>${i.sku}</td><td>${i.itemName}</td><td style="color:var(--primary); font-weight:600;">${i.quantity}</td><td>${i.threshold}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
                moduleLinksCard.insertAdjacentHTML('afterend', html);
            }
        } catch(e) {}
    }

    if (canProduction) {
        try {
            const data = await api.get('/api/production/work-orders').catch(() => null);
            if (data && data.length > 0) {
                // only recent 5 active work orders
                const active = data.filter(wo => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').slice(0, 5);
                if (active.length > 0) {
                    const html = `
                    <div class="card" style="margin-top: 24px;">
                        <div class="card-header"><h3>Active Production Status</h3></div>
                        <div class="table-responsive">
                            <table class="table" style="background:var(--white);">
                                <thead><tr><th>WO #</th><th>Line</th><th>Progress</th></tr></thead>
                                <tbody>
                                    ${active.map(wo => `<tr><td>${wo.id}</td><td>${wo.assignedLine}</td><td>${renderVisualStages(wo.status)}</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                    moduleLinksCard.insertAdjacentHTML('afterend', html);
                }
            }
        } catch(e) {}
    }

    if (canOrders) {
        try {
            const data = await api.get('/api/orders').catch(() => null);
            if (data && data.length > 0) {
                // top 5 recent orders
                const recent = data.slice(0, 5);
                const html = `
                <div class="card" style="margin-top: 24px;">
                    <div class="card-header"><h3>Recent Orders</h3></div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead><tr><th>ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                            <tbody>
                                ${recent.map(o => `<tr><td>${o.id}</td><td>${o.customer ? o.customer.name : ''}</td><td>${new Date(o.orderDate).toLocaleDateString()}</td><td>${Number(o.totalAmount).toFixed(2)}</td><td><span class="badge ${o.status==='DRAFT' ? 'low' : 'ok'}">${o.status}</span></td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
                moduleLinksCard.insertAdjacentHTML('afterend', html);
            }
        } catch(e) {}
    }
}

// Copy of visual stage renderer for the dashboard
function renderVisualStages(currentStatus) {
    if (currentStatus === 'CANCELLED') return '<span class="badge low">CANCELLED</span>';
    const STAGE_SEQUENCE = ['PENDING', 'CUTTING', 'SEWING', 'QC', 'PACKING', 'COMPLETED'];
    const displayStages = ['CUTTING', 'SEWING', 'QC', 'PACKING', 'COMPLETED'];
    const curIdx = STAGE_SEQUENCE.indexOf(currentStatus);
    return displayStages.map(s => {
        const stageIdx = STAGE_SEQUENCE.indexOf(s);
        let icon = '○';
        let style = 'color: var(--muted);';
        if (stageIdx < curIdx || currentStatus === 'COMPLETED') {
            icon = '✓'; style = 'color: var(--ok); font-weight:600;';
        } else if (stageIdx === curIdx) {
            icon = '●'; style = 'color: var(--primary); font-weight:600;';
        }
        return `<span style="margin-right: 6px; font-size: 12px; ${style}">${s} ${icon}</span>`;
    }).join(' <span style="color:var(--border); margin-right:6px;">→</span> ');
}
