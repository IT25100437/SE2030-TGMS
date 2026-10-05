/**
 * layout.js — shared topbar + sidebar initialisation for all module pages.
 *
 * USAGE: include this after api.js, before the module-specific script.
 * The calling page must set: window.ACTIVE_MODULE (string key, e.g. 'suppliers')
 *
 * This preserves FULL existing role-based access control — it only adds UI chrome.
 */

window.ACTIVE_MODULE = window.ACTIVE_MODULE || '';

const MODULE_NAV = [
    { key: 'suppliers',  href: '/suppliers.html',  icon: 'fas fa-truck',        label: 'Supplier Management',  roles: ['PROCUREMENT_OFFICER','ADMIN'] },
    { key: 'inventory',  href: '/inventory.html',  icon: 'fas fa-boxes',        label: 'Inventory Management', roles: ['INVENTORY_MANAGER','ADMIN'] },
    { key: 'orders',     href: '/orders.html',     icon: 'fas fa-file-invoice', label: 'Order Management',     roles: ['SALES_OFFICER','ADMIN'] },
    { key: 'production', href: '/production.html', icon: 'fas fa-industry',     label: 'Production Management',roles: ['PRODUCTION_MANAGER','ADMIN'] },
    { key: 'employees',  href: '/employees.html',  icon: 'fas fa-users',        label: 'Employee Management',  roles: ['HR_MANAGER','ADMIN'] },
    { key: 'reports',    href: '/reports.html',    icon: 'fas fa-chart-bar',    label: 'Reports & Analytics',  roles: ['ADMIN'] },
];

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

async function initLayout() {
    const user = await requireLogin();
    if (!user) return null;

    // ---- TOPBAR ----
    const avatarEl     = document.getElementById('userAvatar');
    const labelEl      = document.getElementById('userLabel');
    const roleEl       = document.getElementById('userRoleLabel');

    const userInfoEl   = document.querySelector('.topbar .user-info');
    if (userInfoEl && !document.getElementById('notifBell')) {
        const notifHtml = `<div id="notifBell" class="notif-btn" title="Notifications" aria-label="Notifications" style="position:relative; cursor:pointer; width:34px; height:34px; border-radius:50%; background:var(--primary-bg); color:var(--primary); display:flex; align-items:center; justify-content:center; margin-right:2px;">
            <i class="fas fa-bell" style="font-size:14px;"></i>
            <span style="position:absolute; top:7px; right:8px; width:6px; height:6px; background:var(--primary); border-radius:50%;"></span>
        </div>`;
        userInfoEl.insertAdjacentHTML('afterbegin', notifHtml);
    }

    const firstLetter = (user.fullName || user.username || 'U')[0].toUpperCase();
    if (avatarEl) avatarEl.textContent  = firstLetter;
    if (labelEl)  labelEl.textContent   = user.fullName || user.username;
    if (roleEl)   roleEl.textContent    = formatRole(user.role);

    // ---- SIDEBAR ----
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // Dashboard link always shown
        sidebar.insertAdjacentHTML('beforeend', `
            <a href="/dashboard.html" ${window.ACTIVE_MODULE === 'dashboard' ? 'class="active" aria-current="page"' : ''}>
                <i class="fas fa-th-large"></i>
                Dashboard
            </a>
        `);

        MODULE_NAV.forEach(mod => {
            if (mod.roles.includes(user.role)) {
                const isActive = window.ACTIVE_MODULE === mod.key;
                sidebar.insertAdjacentHTML('beforeend', `
                    <a href="${mod.href}" ${isActive ? 'class="active" aria-current="page"' : ''}>
                        <i class="${mod.icon}"></i>
                        ${mod.label}
                    </a>
                `);
            }
        });
    }

    return user;
}

// Sidebar mobile toggle (works once DOM is ready)
document.addEventListener('DOMContentLoaded', function() {
    const toggle  = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar()  { if (sidebar) sidebar.classList.add('open');    if (overlay) overlay.style.display='block'; }
    function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (overlay) overlay.style.display='none'; }

    if (toggle)  toggle.addEventListener('click',  () => sidebar && sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    if (overlay) overlay.addEventListener('click', closeSidebar);
});
